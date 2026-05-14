const express = require('express');
const router = express.Router();

const ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json';
const CACHE_TTL = 24 * 60 * 60 * 1000;

const SLOT_PATTERNS = {
  head:     /^HEAD_/,
  armor:    /^ARMOR_/,
  shoes:    /^SHOES_/,
  mainhand: /^(MAIN_|2H_|HALLOWFALL|LOSTBOW|MISTPIERCER|WILDSTAFF|SPIRITHUNTER)/,
  offhand:  /^OFF_/,
  cape:     /^CAPE/,
  mount:    /^MOUNT_/,
  bag:      /^BAG/,
  food:     /^(MEAL_|BREAD_|BEEF_|PORK_|GOAT_|FISH_SALAD|RATIONS)/,
  potion:   /^POTION_/,
};

// English tier prefixes to strip from display names
const EN_TIER_PREFIXES = [
  "Beginner's", "Novice's", "Journeyman's", "Adept's",
  "Expert's", "Master's", "Grandmaster's", "Elder's",
];

// Spanish tier suffixes/prefixes to strip
const ES_TIER_PATTERNS = [
  /^(del?\s+)?(anciano|gran maestro|maestro|experto|oficial|aprendiz|novato)['s]?\s+/i,
  /\s+(del?\s+)?(anciano|gran maestro|maestro|experto|oficial|aprendiz|novato)$/i,
];

function cleanName(name, isSpanish = false) {
  if (!name) return '';
  if (isSpanish) {
    for (const p of ES_TIER_PATTERNS) {
      const cleaned = name.replace(p, '').trim();
      if (cleaned && cleaned !== name) return cleaned;
    }
    return name;
  }
  for (const p of EN_TIER_PREFIXES) {
    if (name.startsWith(p + ' ')) return name.slice(p.length + 1);
  }
  return name;
}

let cache = { data: null, ts: 0 };

async function getItems() {
  if (cache.data && Date.now() - cache.ts < CACHE_TTL) return cache.data;

  const res = await fetch(ITEMS_URL);
  if (!res.ok) throw new Error('No se pudo cargar la base de datos de items');
  const raw = await res.json();

  const seen = new Map();

  for (const item of raw) {
    if (!item) continue;
    const uname = item.UniqueName || '';

    // Strip enchant suffix to get base unique name
    const hasEnchant = uname.includes('@');
    const enchantNum = hasEnchant ? parseInt(uname.split('@')[1]) : 0;
    const baseUnique = uname.replace(/@\d+$/, '');

    // Strip tier prefix
    const baseId = baseUnique.replace(/^T\d+_/, '');
    if (baseId === baseUnique) continue; // no tier prefix = not gear

    const tierNum = parseInt(uname.match(/^T(\d+)_/)?.[1] || '0');
    if (tierNum < 2) continue;

    if (!seen.has(baseId)) {
      seen.set(baseId, { id: baseId, name: '', nameTier: 0, tiers: new Set(), enchants: new Set() });
    }
    const entry = seen.get(baseId);

    if (!hasEnchant) {
      entry.tiers.add(tierNum);
      // Update display name from highest non-enchanted tier
      if (tierNum > entry.nameTier) {
        const esName = item.LocalizedNames?.['ES'] || item.LocalizedNames?.['ES-ES'];
        const enName = item.LocalizedNames?.['EN-US'];
        if (esName) {
          entry.name = cleanName(esName, true);
          entry.lang = 'es';
        } else if (enName) {
          entry.name = cleanName(enName, false);
          entry.lang = 'en';
        }
        entry.nameTier = tierNum;
      }
    } else {
      entry.enchants.add(enchantNum);
    }
  }

  cache = {
    data: [...seen.values()]
      .filter(e => e.tiers.size > 0 && e.name)
      .map(({ id, name, tiers, enchants }) => ({
        id,
        name,
        tiers:   [...tiers].filter(t => t >= 4).sort((a, b) => a - b),
        enchants: [...enchants].sort((a, b) => a - b),
      }))
      .filter(e => e.tiers.length > 0),
    ts: Date.now(),
  };

  return cache.data;
}

router.get('/search', async (req, res) => {
  try {
    const { slot, q = '' } = req.query;
    const items = await getItems();
    const pattern = slot ? SLOT_PATTERNS[slot] : null;
    const query = q.toLowerCase().trim();

    const results = items
      .filter(i => !pattern || pattern.test(i.id))
      .filter(i => !query || i.name.toLowerCase().includes(query))
      .slice(0, 60);

    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
