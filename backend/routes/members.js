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
  const users = (all || []).map(safe);
  res.json({
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

module.exports = router;
