const express = require('express');
const multer = require('multer');
const { supabase } = require('../supabase');
const { requireAdmin } = require('../middleware/auth');
const router = express.Router();

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
const VALID_TYPES = ['pvp_fame', 'kills', 'pve_fame'];
const clean = s => String(s).replace(/^\uFEFF/, '').replace(/["']/g, '').trim();

function parseTxt(content) {
  const lines = content.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    .split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 2) return { error: 'Archivo vacío o con solo una línea', players: [] };
  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) || []).length;
  const commaCount = (firstLine.match(/,/g) || []).length;
  const sep = tabCount >= commaCount ? '\t' : ',';
  const headers = firstLine.split(sep).map(clean).map(h => h.toLowerCase());
  let nameIdx = headers.findIndex(h => ['jugador','player','name','nick','nombre'].some(k => h === k || h.includes(k)));
  let valIdx = headers.findIndex(h => ['cantidad','amount','value','fame','kills','count','total'].some(k => h === k || h.includes(k)));
  if (nameIdx === -1) nameIdx = 1;
  if (valIdx === -1) valIdx = headers.length - 1;
  const players = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(sep).map(clean);
    if (cols.length <= nameIdx) continue;
    const name = cols[nameIdx];
    if (!name || name === '-' || name === '') continue;
    const rawStr = cols[valIdx] || cols[cols.length - 1] || '0';
    const digits = rawStr.replace(/\D/g, '');
    players.push({ name, value: digits ? parseInt(digits, 10) : 0 });
  }
  return { error: null, players, nameIdx, valIdx, headers, sep: sep === '\t' ? 'TAB' : 'COMMA' };
}

router.post('/upload', requireAdmin, upload.single('file'), async (req, res) => {
  const { type } = req.body;
  if (!type || !VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo inválido. Debe ser: pvp_fame, kills o pve_fame' });
  if (!req.file) return res.status(400).json({ error: 'No se subió archivo' });
  let content = req.file.buffer.toString('utf-8');
  if (content.includes('')) content = req.file.buffer.toString('latin1');
  const { error, players, nameIdx, valIdx, headers, sep } = parseTxt(content);
  if (error) return res.status(400).json({ error });
  if (players.length === 0) return res.status(400).json({ error: `No se encontraron jugadores. Headers: [${headers?.join(', ')}]` });
  const sorted = players.sort((a, b) => b.value - a.value).slice(0, 100);
  await supabase.from('rankings_cache').upsert({
    type, data: sorted, total: sorted.length, updated_at: new Date().toISOString(),
  }, { onConflict: 'type' });
  res.json({ ok: true, type, count: sorted.length, top3: sorted.slice(0, 3), debug: { headers, sep, nameIdx, valIdx } });
});

router.delete('/:type', requireAdmin, async (req, res) => {
  const { type } = req.params;
  if (!VALID_TYPES.includes(type)) return res.status(400).json({ error: 'Tipo inválido' });
  await supabase.from('rankings_cache').delete().eq('type', type);
  res.json({ ok: true });
});

router.get('/top', async (req, res) => {
  const { data: rows } = await supabase.from('rankings_cache').select('*');
  if (!rows || rows.length === 0) return res.json(null);
  const byType = {};
  let latestUpdated = null;
  let latestTotal = 0;
  for (const row of rows) {
    byType[row.type] = row;
    if (!latestUpdated || new Date(row.updated_at) > new Date(latestUpdated)) {
      latestUpdated = row.updated_at;
      latestTotal = row.total || (Array.isArray(row.data) ? row.data.length : 0);
    }
  }
  const top3 = type => (Array.isArray(byType[type]?.data) ? byType[type].data : []).slice(0, 3);
  res.json({
    byFame: top3('pvp_fame'),
    byKills: top3('kills'),
    byPveFame: top3('pve_fame'),
    uploaded_at: latestUpdated,
    total: latestTotal,
  });
});

module.exports = router;
