const express = require('express');
const router = express.Router();

const ITEMS_URL = 'https://raw.githubusercontent.com/broderickhyman/ao-bin-dumps/master/formatted/items.json';
const CACHE_TTL = 24 * 60 * 60 * 1000;

// Patterns applied to the base ID (UniqueName without T\d+_ prefix and @enchant suffix)
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

const TIER_PREFIXES = ["Beginner's","Novice's","Journeyman's","Adept's","Expert's","Master's","Grandmaster's","Elder's"];

function cleanName(name) {
  for (const p of TIER_PREFIXES) {
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

  // Deduplicate: keep one entry per base item (strip tier prefix + enchant suffix)
  const seen = new Map();
  for (const item of raw) {
    if (!item) continue;
    const name = item.LocalizedNames?.['EN-US'];
    if (!name) continue;
    const uname = item.UniqueName || '';
    if (uname.includes('@')) continue; // skip enchanted duplicates

    // Remove tier prefix (T4_, T5_, etc.)
    const baseId = uname.replace(/^T\d+_/, '');
    if (baseId === uname) continue; // no tier = not gear

    const tierNum = parseInt(uname.match(/^T(\d+)_/)?.[1] || '0');
    const existing = seen.get(baseId);
    if (!existing || tierNum > existing.tier) {
      seen.set(baseId, { id: baseId, name: cleanName(name), tier: tierNum });
    }
  }

  cache = { data: [...seen.values()].map(({ id, name }) => ({ id, name })), ts: Date.now() };
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
