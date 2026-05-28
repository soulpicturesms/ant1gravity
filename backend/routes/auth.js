const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { supabase, uploadFile } = require('../supabase');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

const safe = u => {
  if (!u) return null;
  const { password, avatar_url, ...r } = u;
  return { ...r, avatar: avatar_url || null };
};

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const { data: user, error } = await supabase.from('users').insert({
      username, password: hash, role: 'pending',
      coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0,
    }).select().single();
    if (error) {
      if (error.code === '23505') return res.status(400).json({ error: 'Usuario ya existe' });
      return res.status(500).json({ error: error.message });
    }
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: safe(user) });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const { data: user } = await supabase.from('users').select('*').ilike('username', username?.trim()).maybeSingle();
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: safe(user) });
});

router.get('/me', requireAuth, async (req, res) => {
  const { data: user } = await supabase.from('users').select('*').eq('id', req.user.id).maybeSingle();
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  
  // Si tiene personaje vinculado pero no tiene avatar guardado, buscarlo en background
  if (user.albion_character && !user.albion_avatar) {
    (async () => {
      try {
        const ALBION_API = 'https://gameinfo.albiononline.com/api/gameinfo';
        const searchRes = await fetch(`${ALBION_API}/search?q=${encodeURIComponent(user.albion_character)}`);
        if (searchRes.ok) {
          const searchData = await searchRes.json();
          const player = (searchData.players || []).find(p => p.Name.toLowerCase() === user.albion_character.toLowerCase());
          if (player && (player.Avatar || player.AvatarRing)) {
            await supabase.from('users').update({
              albion_avatar: player.Avatar || null,
              albion_ring: player.AvatarRing || null
            }).eq('id', user.id);
          }
        }
      } catch (err) {
        console.error('Error en fetch background de avatar Albion:', err.message);
      }
    })();
  }

  res.json(safe(user));
});

router.put('/profile', requireAuth, async (req, res) => {
  const { albion_character } = req.body;
  const value = albion_character?.trim() || null;
  
  let updateData = { albion_character: value };
  
  if (value) {
    try {
      const ALBION_API = 'https://gameinfo.albiononline.com/api/gameinfo';
      const searchRes = await fetch(`${ALBION_API}/search?q=${encodeURIComponent(value)}`);
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        const player = (searchData.players || []).find(p => p.Name.toLowerCase() === value.toLowerCase());
        if (player) {
          updateData.albion_avatar = player.Avatar || null;
          updateData.albion_ring = player.AvatarRing || null;
        }
      }
    } catch (err) {
      console.error('Error al obtener detalles del jugador en Albion:', err.message);
    }
  } else {
    updateData.albion_avatar = null;
    updateData.albion_ring = null;
  }
  
  try {
    const { error } = await supabase.from('users').update(updateData).eq('id', req.user.id);
    if (error) {
      console.warn('No se pudo guardar avatar/ring (probablemente faltan las columnas), reintentando solo con personaje:', error.message);
      await supabase.from('users').update({ albion_character: value }).eq('id', req.user.id);
    }
  } catch (dbErr) {
    console.error('Error en base de datos al actualizar perfil:', dbErr.message);
    return res.status(500).json({ error: 'Error al actualizar el perfil' });
  }

  res.json({ 
    ok: true, 
    albion_character: value,
    albion_avatar: updateData.albion_avatar,
    albion_ring: updateData.albion_ring
  });
});

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  try {
    const filename = `${req.user.id}-${Date.now()}`;
    const url = await uploadFile('avatars', filename, req.file.buffer, req.file.mimetype);
    await supabase.from('users').update({ avatar_url: url }).eq('id', req.user.id);
    res.json({ avatar: url });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
