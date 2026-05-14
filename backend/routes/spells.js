const express = require('express');
const router = express.Router();

const RAW_ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const SPELLS_URL    = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/spells.json';
const CACHE_TTL     = 24 * 60 * 60 * 1000;

let spellMapCache   = { data: null, ts: 0 };
let itemSpellsCache = { data: null, ts: 0 };

// Build map: baseId → { q, w, e, passive } spell uniquenames
async function getItemSpellMap() {
  if (itemSpellsCache.data && Date.now() - itemSpellsCache.ts < CACHE_TTL) return itemSpellsCache.data;

  const res = await fetch(RAW_ITEMS_URL, { signal: AbortSignal.timeout(20000) });
  const raw = await res.json();
  const items = raw.items;

  // Full lookup by uniquename for @reference resolution
  const byName = {};
  const addToLookup = (group) => {
    if (!group) return;
    const arr = Array.isArray(group) ? group : [group];
    for (const item of arr) {
      const uname = item['@uniquename'];
      if (uname) byName[uname] = item;
    }
  };
  addToLookup(items.weapon);
  addToLookup(items.equipmentitem);

  // Resolve craftingspelllist, following @reference chains (armor items point to lower tiers)
  function resolveSpellList(item) {
    let spellList = item.craftingspelllist;
    let depth = 0;
    while (spellList?.['@reference'] && depth < 8) {
      spellList = byName[spellList['@reference']]?.craftingspelllist;
      depth++;
    }
    return spellList;
  }

  // Parse spell slots from craftingspelllist:
  // - Weapons:   @slots="1"→Q, "2"→W, "3"→E, no @slots→passive
  // - Armor:     no @slots on any entry; non-PASSIVE_* → Q (one active slot), PASSIVE_* → passive
  function parseSlots(item) {
    const result = { q: null, w: null, e: null, passive: null };
    const spellList = resolveSpellList(item);
    if (!spellList?.craftspell) return result;

    const spells = Array.isArray(spellList.craftspell) ? spellList.craftspell : [spellList.craftspell];
    for (const spell of spells) {
      const id = spell['@uniquename'];
      if (!id) continue;
      const slotNum = spell['@slots'];

      if (slotNum === '1') { if (!result.q) result.q = id; }
      else if (slotNum === '2') { if (!result.w) result.w = id; }
      else if (slotNum === '3') { if (!result.e) result.e = id; }
      else {
        // No @slots: passive or armor active ability
        if (id.startsWith('PASSIVE_')) { if (!result.passive) result.passive = id; }
        else { if (!result.q) result.q = id; }
      }
    }
    return result;
  }

  const map = {};
  const processGroup = (group) => {
    if (!group) return;
    const arr = Array.isArray(group) ? group : [group];
    for (const item of arr) {
      const uname = item['@uniquename'];
      if (!uname) continue;
      const baseId = uname.replace(/^T\d+_/, '');
      if (baseId === uname || map[baseId]) continue;
      const slots = parseSlots(item);
      if (slots.q || slots.w || slots.e || slots.passive) map[baseId] = slots;
    }
  };

  processGroup(items.weapon);
  processGroup(items.equipmentitem);

  itemSpellsCache = { data: map, ts: Date.now() };
  return map;
}

// Build map: spell uniquename → { uisprite }
async function getSpellInfoMap() {
  if (spellMapCache.data && Date.now() - spellMapCache.ts < CACHE_TTL) return spellMapCache.data;

  const res = await fetch(SPELLS_URL, { signal: AbortSignal.timeout(15000) });
  const raw = await res.json();
  const spells = raw.spells?.activespell || [];

  const map = {};
  (Array.isArray(spells) ? spells : [spells]).forEach(s => {
    const id = s['@uniquename'];
    if (!id) return;
    map[id] = { uniquename: id, uisprite: s['@uisprite'] || id };
  });

  spellMapCache = { data: map, ts: Date.now() };
  return map;
}

// GET /api/spells/item?id=MAIN_SWORD
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
