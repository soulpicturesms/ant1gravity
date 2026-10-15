const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const safe = u => {
  if (!u) return null;
  const { password, avatar_url, ...r } = u;
  return { ...r, avatar: avatar_url || null };
};

router.get('/', async (req, res) => {
  const { data } = await supabase.from('users').select('*').order('pvp_fame', { ascending: false });
  res.json((data || []).map(safe));
});

router.get('/rankings', async (req, res) => {
  const { data: all } = await supabase.from('users').select('*');
  const users = (all || []).map(safe).filter(u => u.role !== 'pending');
  res.json({
    total:        users.length,
    byFame:       [...users].sort((a,b) => b.pvp_fame - a.pvp_fame).slice(0,10),
    byKills:      [...users].sort((a,b) => b.pvp_kills - a.pvp_kills).slice(0,10),
    byCta:        [...users].sort((a,b) => b.cta_attendance - a.cta_attendance).slice(0,10),
    byAttendance: [...users].sort((a,b) => b.total_activities - a.total_activities).slice(0,10),
  });
});

router.get('/activities', requireAuth, async (req, res) => {
  const { data: acts } = await supabase.from('activities').select('*').order('date', { ascending: false }).limit(30);
  const result = await Promise.all((acts || []).map(async a => {
    const { count } = await supabase.from('attendance').select('*', { count: 'exact', head: true }).eq('activity_id', a.id).eq('present', true);
    return { ...a, attendee_count: count || 0 };
  }));
  res.json(result);
});

router.post('/activities', requireAdmin, async (req, res) => {
  const { name, type, date, description } = req.body;
  const { data: creator } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  const { data, error } = await supabase.from('activities').insert({
    name, type, date, description: description || null,
    created_by: req.user.id, creator_name: creator?.username,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.post('/activities/:id/attend', requireAdmin, async (req, res) => {
  const { user_ids } = req.body;
  const { data: activity } = await supabase.from('activities').select('*').eq('id', req.params.id).maybeSingle();
  for (const uid of user_ids) {
    const { data: existing } = await supabase.from('attendance').select('id').eq('user_id', uid).eq('activity_id', req.params.id).maybeSingle();
    if (!existing) {
      await supabase.from('attendance').insert({ user_id: uid, activity_id: req.params.id, present: true });
      const { data: u } = await supabase.from('users').select('total_activities,cta_attendance').eq('id', uid).maybeSingle();
      const upd = { total_activities: (u?.total_activities || 0) + 1 };
      if (activity?.type === 'CTA') upd.cta_attendance = (u?.cta_attendance || 0) + 1;
      await supabase.from('users').update(upd).eq('id', uid);
    }
  }
  res.json({ ok: true });
});

router.put('/:id/stats', requireAdmin, async (req, res) => {
  const { pvp_fame, pvp_kills, cta_attendance, total_activities } = req.body;
  const upd = {};
  if (pvp_fame !== '' && pvp_fame !== undefined) upd.pvp_fame = parseInt(pvp_fame);
  if (pvp_kills !== '' && pvp_kills !== undefined) upd.pvp_kills = parseInt(pvp_kills);
  if (cta_attendance !== '' && cta_attendance !== undefined) upd.cta_attendance = parseInt(cta_attendance);
  if (total_activities !== '' && total_activities !== undefined) upd.total_activities = parseInt(total_activities);
  await supabase.from('users').update(upd).eq('id', req.params.id);
  res.json({ ok: true });
});

router.put('/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['member','officer','admin'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  await supabase.from('users').update({ role }).eq('id', req.params.id);
  res.json({ ok: true });
});

// ─── Albion live stats ────────────────────────────────────────────────────────
const ALBION_API  = 'https://gameinfo.albiononline.com/api/gameinfo';
const GUILD_ID    = process.env.ALBION_GUILD_ID || 'Azsds8YiRyi6aGL1rOZRLg';
const CACHE_TTL_ALBION = 30 * 60 * 1000;
let albionStatsCache = { data: null, ts: 0 };

async function fetchInBatches(items, fn, size = 5) {
  const results = [];
  for (let i = 0; i < items.length; i += size) {
    const settled = await Promise.allSettled(items.slice(i, i + size).map(fn));
    results.push(...settled);
  }
  return results;
}

router.get('/albion-stats', async (req, res) => {
  try {
    if (albionStatsCache.data && Date.now() - albionStatsCache.ts < CACHE_TTL_ALBION) {
      return res.json(albionStatsCache.data);
    }

    const membersRes = await fetch(`${ALBION_API}/guilds/${GUILD_ID}/members`, { signal: AbortSignal.timeout(15000) });
    if (!membersRes.ok) throw new Error(`Albion API ${membersRes.status}`);
    const members = await membersRes.json();

    const settled = await fetchInBatches(members, m =>
      fetch(`${ALBION_API}/players/${m.Id}`, { signal: AbortSignal.timeout(10000) })
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );

    const stats = [];
    for (const r of settled) {
      if (r.status !== 'fulfilled' || !r.value) continue;
      const p = r.value;
      const ls = p.LifetimeStatistics || {};
      stats.push({
        id:          p.Id,
        name:        p.Name,
        killFame:    p.KillFame    || 0,
        deathFame:   p.DeathFame   || 0,
        pve:         ls.PvE?.Total         || 0,
        gathering:   ls.Gathering?.All?.Total || 0,
        crafting:    ls.Crafting?.Total    || 0,
        fishing:     ls.FishingFame        || 0,
        farming:     ls.FarmingFame        || 0,
        gatheringByType: {
          fiber: ls.Gathering?.Fiber?.Total || 0,
          hide:  ls.Gathering?.Hide?.Total  || 0,
          ore:   ls.Gathering?.Ore?.Total   || 0,
          rock:  ls.Gathering?.Rock?.Total  || 0,
          wood:  ls.Gathering?.Wood?.Total  || 0,
        },
      });
    }

    const sort = key => [...stats].sort((a, b) => b[key] - a[key]);
    const data = {
      byKillFame:  sort('killFame'),
      byPve:       sort('pve'),
      byGathering: sort('gathering'),
      byCrafting:  sort('crafting'),
      raw:         stats,
      fetchedAt:   new Date().toISOString(),
    };

    albionStatsCache = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
