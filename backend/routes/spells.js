const express = require('express');
const router = express.Router();

const RAW_ITEMS_URL = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/items.json';
const SPELLS_URL    = 'https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/spells.json';
const CACHE_TTL     = 24 * 60 * 60 * 1000;

let spellMapCache   = { data: null, ts: 0 };
let itemSpellsCache = { data: null, ts: 0 };

// Build map: baseId → { q, w, e, passive } — each is an ARRAY of spell uniquenames
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

  // Resolve craftingspelllist, following @reference chains
  function resolveSpellList(item) {
    let spellList = item.craftingspelllist;
    let depth = 0;
    while (spellList?.['@reference'] && depth < 8) {
      spellList = byName[spellList['@reference']]?.craftingspelllist;
      depth++;
    }
    return spellList;
  }

  // Returns { q: string[], w: string[], e: string[], passive: string[] }
  // Rule: PASSIVE_* always → passive (armor uses @slots to group passives, not for Q/W/E)
  // Weapons: non-passive @slots="1"→Q, "2"→W, "3"→E
  // Armor: active spells have no @slots and no PASSIVE_ prefix → all go to q
  function parseSlots(item) {
    const result = { q: [], w: [], e: [], passive: [] };
    const spellList = resolveSpellList(item);
    if (!spellList?.craftspell) return result;

    const spells = Array.isArray(spellList.craftspell) ? spellList.craftspell : [spellList.craftspell];
    for (const spell of spells) {
      const id = spell['@uniquename'];
      if (!id) continue;

      if (id.startsWith('PASSIVE_')) { result.passive.push(id); continue; }

      const slotNum = spell['@slots'];
      if (slotNum === '1') result.q.push(id);
      else if (slotNum === '2') result.w.push(id);
      else if (slotNum === '3') result.e.push(id);
      else result.q.push(id);
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
      if (slots.q.length || slots.w.length || slots.e.length || slots.passive.length) {
        map[baseId] = slots;
      }
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

function enrichSpell(spellId, spellMap) {
  if (!spellId) return null;
  const info = spellMap[spellId] || {};
  return {
    uniquename: spellId,
    uisprite: info.uisprite || spellId,
    iconUrl: `https://render.albiononline.com/v1/spell/${spellId}.png`,
  };
}

// GET /api/spells/item?id=MAIN_SWORD
// Returns: { q, w, e, passive } each is an ARRAY of spell objects (all options for that slot)
router.get('/item', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.json({ q: [], w: [], e: [], passive: [] });

  try {
    const [itemMap, spellMap] = await Promise.all([getItemSpellMap(), getSpellInfoMap()]);

    const slots = itemMap[id];
    if (!slots) return res.json({ q: [], w: [], e: [], passive: [] });

    res.json({
      q:       slots.q.map(s => enrichSpell(s, spellMap)).filter(Boolean),
      w:       slots.w.map(s => enrichSpell(s, spellMap)).filter(Boolean),
      e:       slots.e.map(s => enrichSpell(s, spellMap)).filter(Boolean),
      passive: slots.passive.map(s => enrichSpell(s, spellMap)).filter(Boolean),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
