const express = require('express');
const { db } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

const safe = u => { const { password, ...r } = u; return { ...r, id: r._id }; };

router.get('/', async (req, res) => {
  const members = await db.users.findAsync({}).sort({ pvp_fame: -1 });
  res.json(members.map(safe));
});

router.get('/rankings', async (req, res) => {
  const all = (await db.users.findAsync({})).map(safe);
  res.json({
    byFame:       [...all].sort((a,b) => b.pvp_fame - a.pvp_fame).slice(0,10),
    byKills:      [...all].sort((a,b) => b.pvp_kills - a.pvp_kills).slice(0,10),
    byCta:        [...all].sort((a,b) => b.cta_attendance - a.cta_attendance).slice(0,10),
    byAttendance: [...all].sort((a,b) => b.total_activities - a.total_activities).slice(0,10),
  });
});

router.get('/activities', requireAuth, async (req, res) => {
  const acts = await db.activities.findAsync({}).sort({ date: -1 }).limit(30);
  const result = await Promise.all(acts.map(async a => ({
    ...a, id: a._id,
    attendee_count: await db.attendance.countAsync({ activity_id: a._id, present: true })
  })));
  res.json(result);
});

router.post('/activities', requireAdmin, async (req, res) => {
  const { name, type, date, description } = req.body;
  const creator = await db.users.findOneAsync({ _id: req.user.id });
  const a = await db.activities.insertAsync({ name, type, date, description: description || null, created_by: req.user.id, creator_name: creator?.username, created_at: new Date().toISOString() });
  res.json({ id: a._id });
});

router.post('/activities/:id/attend', requireAdmin, async (req, res) => {
  const { user_ids } = req.body;
  const activity = await db.activities.findOneAsync({ _id: req.params.id });
  for (const uid of user_ids) {
    const key = `${uid}_${req.params.id}`;
    if (!await db.attendance.findOneAsync({ userActivity: key })) {
      await db.attendance.insertAsync({ user_id: uid, activity_id: req.params.id, present: true, userActivity: key });
      const u = await db.users.findOneAsync({ _id: uid });
      const upd = { total_activities: (u.total_activities || 0) + 1 };
      if (activity?.type === 'CTA') upd.cta_attendance = (u.cta_attendance || 0) + 1;
      await db.users.updateAsync({ _id: uid }, { $set: upd });
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
  await db.users.updateAsync({ _id: req.params.id }, { $set: upd });
  res.json({ ok: true });
});

router.put('/:id/role', requireAdmin, async (req, res) => {
  const { role } = req.body;
  if (!['member','officer','admin'].includes(role)) return res.status(400).json({ error: 'Rol inválido' });
  await db.users.updateAsync({ _id: req.params.id }, { $set: { role } });
  res.json({ ok: true });
});

module.exports = router;
