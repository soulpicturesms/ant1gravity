const express = require('express');
const { supabase } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/check', async (req, res) => {
  const { username } = req.query;
  if (!username) return res.status(400).json({ error: 'Falta username' });
  const { data: entry } = await supabase.from('blacklist').select('*').ilike('username', username).maybeSingle();
  if (entry) return res.json({ blacklisted: true, reason: entry.reason, date: entry.created_at });
  const { data: member } = await supabase.from('users').select('id').ilike('username', username).maybeSingle();
  res.json({ blacklisted: false, isMember: !!member });
});

router.get('/', async (req, res) => {
  const { data } = await supabase.from('blacklist').select('*').order('created_at', { ascending: false });
  res.json(data || []);
});

router.post('/', requireAdmin, async (req, res) => {
  const { username, reason } = req.body;
  if (!username) return res.status(400).json({ error: 'Falta username' });
  const { data: exists } = await supabase.from('blacklist').select('id').ilike('username', username).maybeSingle();
  if (exists) return res.status(400).json({ error: 'Ya está en la blacklist' });
  const { data: admin } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  const { data, error } = await supabase.from('blacklist').insert({
    username, reason: reason || 'Sin motivo especificado',
    added_by: req.user.id, added_by_name: admin?.username,
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id });
});

router.delete('/:id', requireAdmin, async (req, res) => {
  await supabase.from('blacklist').delete().eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
