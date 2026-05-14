const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

router.get('/log', async (req, res) => {
  const { data } = await supabase.from('coin_transactions').select('*').order('created_at', { ascending: false }).limit(200);
  res.json(data || []);
});

router.post('/request', requireAuth, async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).maybeSingle();
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  if ((user.coins || 0) <= 0) return res.status(400).json({ error: 'No tenés coins para canjear' });
  const { data: pending } = await supabase.from('credit_requests').select('id').eq('user_id', req.user.id).eq('status', 'pending').maybeSingle();
  if (pending) return res.status(400).json({ error: 'Ya tenés una solicitud pendiente' });
  const { data, error } = await supabase.from('credit_requests').insert({
    user_id: req.user.id, username: user.username, coins: user.coins, status: 'pending',
  }).select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.json({ id: data.id, coins: user.coins });
});

router.get('/my-requests', requireAuth, async (req, res) => {
  const { data } = await supabase.from('credit_requests').select('*').eq('user_id', req.user.id).order('created_at', { ascending: false });
  res.json(data || []);
});

router.get('/requests', requireAdmin, async (req, res) => {
  const { status } = req.query;
  let query = supabase.from('credit_requests').select('*').order('created_at', { ascending: false });
  if (status) query = query.eq('status', status);
  const { data } = await query;
  res.json(data || []);
});

router.get('/pending-count', requireAdmin, async (req, res) => {
  const { count } = await supabase.from('credit_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending');
  res.json({ count: count || 0 });
});

router.post('/requests/:id/complete', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  const { data: request } = await supabase.from('credit_requests').select('*').eq('id', req.params.id).maybeSingle();
  if (!request) return res.status(404).json({ error: 'No encontrado' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'No está pendiente' });
  const { data: admin } = await supabase.from('users').select('username').eq('id', req.user.id).maybeSingle();
  const { data: user } = await supabase.from('users').select('coins').eq('id', request.user_id).maybeSingle();
  await supabase.from('users').update({ coins: Math.max(0, (user?.coins || 0) - request.coins) }).eq('id', request.user_id);
  await supabase.from('credit_requests').update({
    status: 'completed', admin_notes: admin_notes || null,
    processed_at: new Date().toISOString(), processed_by: req.user.id,
  }).eq('id', req.params.id);
  await supabase.from('coin_transactions').insert({
    user_id: request.user_id, username: request.username,
    amount: -request.coins, type: 'redeem',
    reason: `Canje de crédito entregado en juego por ${admin?.username}`,
    admin_id: req.user.id,
  });
  res.json({ ok: true });
});

router.post('/requests/:id/reject', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  await supabase.from('credit_requests').update({
    status: 'rejected', admin_notes: admin_notes || null,
    processed_at: new Date().toISOString(), processed_by: req.user.id,
  }).eq('id', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
