const express = require('express');
const router = express.Router();

const RAW_ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const SPELLS_URL    = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/spells.json';
const CACHE_TTL     = 24 * 60 * 60 * 1000;

let spellMapCache     = { data: null, ts: 0 };
let itemSpellsCache   = { data: null, ts: 0 };

// Safely get first spell ID from a spell slot entry
function firstSpellId(spellEntry) {
  if (!spellEntry) return null;
  const arr = Array.isArray(spellEntry) ? spellEntry : [spellEntry];
  return arr[0]?.['@id'] || null;
}

// Parse active + passive spell slots from a raw item object
function parseSlots(item) {
  const result = { q: null, w: null, e: null, passive: null };

  // Active slots → Q W E
  const activeSlots = item.activespellslots?.activespellslot;
  if (activeSlots) {
    const arr = Array.isArray(activeSlots) ? activeSlots : [activeSlots];
    arr.forEach((slot, i) => {
      const id = firstSpellId(slot.activespell);
      if (i === 0) result.q = id;
      else if (i === 1) result.w = id;
      else if (i === 2) result.e = id;
    });
  }

  // Passive slot
  const passiveSlot = item.passivespellslots?.passivespellslot;
  if (passiveSlot) {
    const arr = Array.isArray(passiveSlot) ? passiveSlot : [passiveSlot];
    result.passive = firstSpellId(arr[0]?.activespell);
  }

  return result;
}

// Build map: baseId → { q, w, e, passive } spell uniquenames
async function getItemSpellMap() {
  if (itemSpellsCache.data && Date.now() - itemSpellsCache.ts < CACHE_TTL) return itemSpellsCache.data;

  const res = await fetch(RAW_ITEMS_URL, { signal: AbortSignal.timeout(20000) });
  const raw = await res.json();
  const items = raw.items;

  const map = {};

  const processGroup = (group) => {
    if (!group) return;
    const arr = Array.isArray(group) ? group : [group];
    for (const item of arr) {
      const uname = item['@uniquename'];
      if (!uname) continue;
      const baseId = uname.replace(/^T\d+_/, '');
      if (baseId === uname || map[baseId]) continue; // no tier prefix, or already mapped
      const slots = parseSlots(item);
      if (slots.q || slots.w || slots.e || slots.passive) map[baseId] = slots;
    }
  };

  processGroup(items.weapon);
  processGroup(items.equipmentitem);

  itemSpellsCache = { data: map, ts: Date.now() };
  return map;
}

// Build map: spell uniquename → { uisprite, name }
async function getSpellInfoMap() {
  if (spellMapCache.data && Date.now() - spellMapCache.ts < CACHE_TTL) return spellMapCache.data;

  const res = await fetch(SPELLS_URL, { signal: AbortSignal.timeout(15000) });
  const raw = await res.json();
  const spells = raw.spells?.activespell || [];

  const map = {};
  (Array.isArray(spells) ? spells : [spells]).forEach(s => {
    const id = s['@uniquename'];
    if (!id) return;
    map[id] = {
      uniquename: id,
      uisprite:   s['@uisprite'] || id,
      category:   s['@category'] || '',
    };
  });

  spellMapCache = { data: map, ts: Date.now() };
  return map;
}

// GET /api/spells/item?id=2H_BOW
// Returns: { q, w, e, passive } each: { uniquename, uisprite, iconUrl } | null
router.get('/item', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ q: null, w: null, e: null, passive: null });

  try {
    const [itemMap, spellMap] = await Promise.all([getItemSpellMap(), getSpellInfoMap()]);

    const slots = itemMap[id];
    if (!slots) return res.json({ q: null, w: null, e: null, passive: null });

    const enrich = (spellId) => {
      if (!spellId) return null;
      const info = spellMap[spellId] || {};
      const uisprite = info.uisprite || spellId;
      return {
        uniquename: spellId,
        uisprite,
        iconUrl: `https://render.albiononline.com/v1/spell/${uisprite}.png`,
      };
    };

    res.json({
      q:       enrich(slots.q),
      w:       enrich(slots.w),
      e:       enrich(slots.e),
      passive: enrich(slots.passive),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
