const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../database');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const avatarDir = path.join(__dirname, '../uploads/avatars');
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: avatarDir,
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
  }),
  limits: { fileSize: 5 * 1024 * 1024 }
});

router.post('/register', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Faltan campos' });
  if (password.length < 6) return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  try {
    const hash = bcrypt.hashSync(password, 10);
    const user = await db.users.insertAsync({ username, password: hash, role: 'member', avatar: null, coins: 0, pvp_fame: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0, created_at: new Date().toISOString() });
    const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...safe } = user;
    res.json({ token, user: { ...safe, id: safe._id } });
  } catch (e) {
    if (e.errorType === 'uniqueViolated') return res.status(400).json({ error: 'Usuario ya existe' });
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await db.users.findOneAsync({ username });
  if (!user || !bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Credenciales incorrectas' });
  const token = jwt.sign({ id: user._id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...safe } = user;
  res.json({ token, user: { ...safe, id: safe._id } });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await db.users.findOneAsync({ _id: req.user.id });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  const { password, ...safe } = user;
  res.json({ ...safe, id: safe._id });
});

router.post('/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se subió imagen' });
  const url = `/uploads/avatars/${req.file.filename}`;
  await db.users.updateAsync({ _id: req.user.id }, { $set: { avatar: url } });
  res.json({ avatar: url });
});

module.exports = router;
