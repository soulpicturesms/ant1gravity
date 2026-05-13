const express = require('express');
const { db } = require('../database');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const router = express.Router();

// Público: ver log de transacciones de coins
router.get('/log', async (req, res) => {
  const txs = await db.transactions.findAsync({}).sort({ created_at: -1 }).limit(200);
  res.json(txs.map(t => ({ ...t, id: t._id })));
});

// User: solicitar canje de crédito
router.post('/request', requireAuth, async (req, res) => {
  const user = await db.users.findOneAsync({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  if ((user.coins || 0) <= 0) return res.status(400).json({ error: 'No tenés coins para canjear' });

  const pending = await db.credit_requests.findOneAsync({ user_id: req.user.id, status: 'pending' });
  if (pending) return res.status(400).json({ error: 'Ya tenés una solicitud pendiente' });

  const request = await db.credit_requests.insertAsync({
    user_id: req.user.id,
    username: user.username,
    coins: user.coins,
    status: 'pending',
    admin_notes: null,
    created_at: new Date().toISOString()
  });
  res.json({ id: request._id, coins: user.coins });
});

// User: ver mis solicitudes
router.get('/my-requests', requireAuth, async (req, res) => {
  const requests = await db.credit_requests.findAsync({ user_id: req.user.id }).sort({ created_at: -1 });
  res.json(requests.map(r => ({ ...r, id: r._id })));
});

// Admin: ver solicitudes pendientes
router.get('/requests', requireAdmin, async (req, res) => {
  const { status } = req.query;
  const query = status ? { status } : {};
  const requests = await db.credit_requests.findAsync(query).sort({ created_at: -1 });
  res.json(requests.map(r => ({ ...r, id: r._id })));
});

// Admin: contar pendientes (para badge)
router.get('/pending-count', requireAdmin, async (req, res) => {
  const count = await db.credit_requests.countAsync({ status: 'pending' });
  res.json({ count });
});

// Admin: aprobar y borrar crédito (entregó el silver en juego)
router.post('/requests/:id/complete', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  const request = await db.credit_requests.findOneAsync({ _id: req.params.id });
  if (!request) return res.status(404).json({ error: 'No encontrado' });
  if (request.status !== 'pending') return res.status(400).json({ error: 'No está pendiente' });

  const admin = await db.users.findOneAsync({ _id: req.user.id });
  const user = await db.users.findOneAsync({ _id: request.user_id });

  // Deducir coins del usuario
  await db.users.updateAsync({ _id: request.user_id }, { $set: { coins: Math.max(0, (user?.coins || 0) - request.coins) } });

  // Marcar como completado
  await db.credit_requests.updateAsync({ _id: req.params.id }, { $set: { status: 'completed', admin_notes: admin_notes || null, processed_at: new Date().toISOString(), processed_by: req.user.id } });

  // Log público
  await db.transactions.insertAsync({
    user_id: request.user_id, username: request.username,
    amount: -request.coins, type: 'redeem',
    reason: `Canje de crédito entregado en juego por ${admin?.username}`,
    admin_id: req.user.id, created_at: new Date().toISOString()
  });

  res.json({ ok: true });
});

// Admin: rechazar solicitud
router.post('/requests/:id/reject', requireAdmin, async (req, res) => {
  const { admin_notes } = req.body;
  const request = await db.credit_requests.findOneAsync({ _id: req.params.id });
  if (!request) return res.status(404).json({ error: 'No encontrado' });
  await db.credit_requests.updateAsync({ _id: req.params.id }, { $set: { status: 'rejected', admin_notes: admin_notes || null, processed_at: new Date().toISOString(), processed_by: req.user.id } });
  res.json({ ok: true });
});

module.exports = router;
