const express = require('express');
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');
const router = express.Router();

// Transfer tokens to another member
router.post('/transfer', requireAuth, async (req, res) => {
  const { to_username, amount, note } = req.body;
  const amt = parseInt(amount);
  if (!to_username || !amt || amt <= 0)
    return res.status(400).json({ error: 'Datos inválidos' });

  const { data: sender } = await supabase.from('users').select('id,username,coins').eq('id', req.user.id).maybeSingle();
  if (!sender) return res.status(404).json({ error: 'Usuario no encontrado' });
  if (sender.coins < amt) return res.status(400).json({ error: 'Tokens insuficientes' });

  const { data: recipient } = await supabase.from('users').select('id,username,coins').ilike('username', to_username).maybeSingle();
  if (!recipient) return res.status(404).json({ error: 'Destinatario no encontrado' });
  if (recipient.id === sender.id) return res.status(400).json({ error: 'No podés enviarte tokens a vos mismo' });

  await supabase.from('users').update({ coins: sender.coins - amt }).eq('id', sender.id);
  await supabase.from('users').update({ coins: (recipient.coins || 0) + amt }).eq('id', recipient.id);

  const noteStr = note ? ` — ${note}` : '';
  await supabase.from('coin_transactions').insert([
    { user_id: sender.id,    username: sender.username,    amount: -amt, type: 'transfer', reason: `→ ${recipient.username}${noteStr}` },
    { user_id: recipient.id, username: recipient.username, amount:  amt, type: 'transfer', reason: `← ${sender.username}${noteStr}` },
  ]);

  res.json({ ok: true, new_balance: sender.coins - amt });
});

// Transfer history for logged-in user
router.get('/history', requireAuth, async (req, res) => {
  const { data } = await supabase.from('coin_transactions')
    .select('*').eq('user_id', req.user.id).eq('type', 'transfer')
    .order('created_at', { ascending: false }).limit(50);
  res.json(data || []);
});

module.exports = router;
