const express = require('express');
const multer = require('multer');
const { db } = require('../database');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

const VALID_TYPES = ['pvp_fame', 'kills', 'pve_fame'];

// Strip all quotes, trim whitespace, remove BOM
const clean = s => String(s).replace(/^\uFEFF/, '').replace(/["']/g, '').trim();

function parseTxt(content) {
  // Normalize line endings, strip BOM
  const lines = content
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);

  if (lines.length < 2) return { error: 'Archivo vacío o con solo una línea', players: [] };

  // Detect separator: prefer tab
  const firstLine = lines[0];
  const tabCount   = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const sep = tabCount >= commaCount ? '\t' : ',';

  const headers = firstLine.split(sep).map(clean).map(h => h.toLowerCase());

  // Find name column: jugador / player / name / nick
  let nameIdx = headers.findIndex(h => ['jugador','player','name','nick','nombre'].some(k => h === k || h.includes(k)));

  // Find value column: cantidad / amount / value / fame / kills / count
  let valIdx = headers.findIndex(h => ['cantidad','amount','value','fame','kills','count','total'].some(k => h === k || h.includes(k)));

  // Fallback: if not found by name, use col 1 for name, last col for value
  if (nameIdx === -1) nameIdx = 1;
  if (valIdx  === -1) valIdx  = headers.length - 1;

  const players = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(clean);
    if (cols.length <= nameIdx) continue;

    const name = cols[nameIdx];
    if (!name || name === '-' || name === '') continue;

    // Get raw value string — try valIdx, then last col
    const rawStr = cols[valIdx] || cols[cols.length - 1] || '0';

    // Remove everything that is NOT a digit
    const digits = rawStr.replace(/\D/g, '');
    const num = digits ? parseInt(digits, 10) : 0;

    players.push({ name, value: num });
  }

  return { error: null, players, nameIdx, valIdx, headers, sep: sep === '\t' ? 'TAB' : 'COMMA' };
}

// Admin: upload TXT for a specific ranking type
router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  const { type } = req.body;
  if (!type || !VALID_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Tipo inválido. Debe ser: pvp_fame, kills o pve_fame' });
  }
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });

  // Try UTF-8, fall back to latin1 if needed
  let content = req.file.buffer.toString('utf-8');
  if (content.includes('�')) content = req.file.buffer.toString('latin1');

  const { error, players, nameIdx, valIdx, headers, sep } = parseTxt(content);

  if (error) return res.status(400).json({ error });
  if (players.length === 0) {
    return res.status(400).json({ error: `No se encontraron jugadores. Headers detectados: [${headers?.join(', ')}]. Separador: ${sep}. Columna nombre: ${nameIdx}, Columna valor: ${valIdx}` });
  }

  // Sort descending by value, keep top 100
  const sorted = players.sort((a, b) => b.value - a.value).slice(0, 100);

  // Upsert
  const existing = await db.rankings_cache.findOneAsync({});
  if (existing) {
    await db.rankings_cache.updateAsync({}, { $set: { [type]: sorted, [`${type}_updated`]: new Date().toISOString() } });
  } else {
    await db.rankings_cache.insertAsync({ [type]: sorted, [`${type}_updated`]: new Date().toISOString() });
  }

  res.json({ ok: true, type, count: sorted.length, top3: sorted.slice(0, 3), debug: { headers, sep, nameIdx, valIdx } });
});

// Admin: clear a specific type
router.delete('/:type', requireAdmin, async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
  await db.rankings_cache.updateAsync({}, { $set: { [type]: null, [`${type}_updated`]: null } });
  res.json({ ok: true });
});

// Public: get top 3 of each type
router.get('/top', async (req, res) => {
  const cache = await db.rankings_cache.findOneAsync({});
  if (!cache) return res.json(null);
  const top3 = arr => (Array.isArray(arr) ? arr : []).slice(0, 3);
  res.json({
    byFame:    top3(cache.pvp_fame),
    byKills:   top3(cache.kills),
    byPveFame: top3(cache.pve_fame),
    updated: {
      pvp_fame: cache.pvp_fame_updated,
      kills:    cache.kills_updated,
      pve_fame: cache.pve_fame_updated,
    },
  });
});

module.exports = router;
