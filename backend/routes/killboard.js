const express = require('express');
const router = express.Router();
const { supabase } = require('../supabase');
const { requireAuth } = require('../middleware/auth');

const GUILD_ID   = process.env.ALBION_GUILD_ID || 'Azsds8YiRyi6aGL1rOZRLg';
const ALBION_API = 'https://gameinfo.albiononline.com/api/gameinfo';

const CACHE_TTL_EVENTS  = 2 * 60 * 1000;
const CACHE_TTL_MEMBERS = 10 * 60 * 1000;

const cache = {
  kills:   { data: null, ts: 0 },
  deaths:  { data: null, ts: 0 },
  members: { data: null, ts: 0 },
};

async function getMembers() {
  if (cache.members.data && Date.now() - cache.members.ts < CACHE_TTL_MEMBERS) {
    return cache.members.data;
  }
  const res = await fetch(`${ALBION_API}/guilds/${GUILD_ID}/members`);
  if (!res.ok) throw new Error(`Albion API ${res.status} al obtener miembros`);
  const data = await res.json();
  cache.members = { data, ts: Date.now() };
  return data;
}

async function fetchInBatches(items, fn, batchSize = 10) {
  const results = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const settled = await Promise.allSettled(batch.map(fn));
    results.push(...settled);
  }
  return results;
}

async function getGuildDeaths() {
  if (cache.deaths.data && Date.now() - cache.deaths.ts < CACHE_TTL_EVENTS) {
    return cache.deaths.data;
  }

  const members = await getMembers();

  const results = await fetchInBatches(members, m =>
    fetch(`${ALBION_API}/players/${m.Id}/deaths?limit=10&offset=0`)
      .then(r => r.ok ? r.json() : [])
      .catch(() => [])
  );

  const seen = new Set();
  const deaths = [];
  for (const r of results) {
    if (r.status !== 'fulfilled') continue;
    for (const e of r.value) {
      if (!seen.has(e.EventId)) {
        seen.add(e.EventId);
        deaths.push(e);
      }
    }
  }
  deaths.sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp));

  cache.deaths = { data: deaths, ts: Date.now() };
  return deaths;
}

router.get('/kills', async (req, res) => {
  try {
    if (cache.kills.data && Date.now() - cache.kills.ts < CACHE_TTL_EVENTS) {
      return res.json(cache.kills.data);
    }
    const r = await fetch(`${ALBION_API}/events?guildId=${GUILD_ID}&limit=51&offset=0`);
    if (!r.ok) throw new Error(`Albion API ${r.status}`);
    const data = await r.json();
    cache.kills = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/deaths', async (req, res) => {
  try {
    res.json(await getGuildDeaths());
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Per-character death cache: { [character]: { data, ts } }
const myDeathsCache = {};
const CACHE_TTL_MY = 2 * 60 * 1000;

router.get('/my-deaths', requireAuth, async (req, res) => {
  try {
    const { data: user } = await supabase.from('users').select('albion_character').eq('id', req.user.id).maybeSingle();
    if (!user?.albion_character) return res.json({ deaths: [], characterNotLinked: true });

    const charName = user.albion_character.trim();
    const cached = myDeathsCache[charName];
    if (cached && Date.now() - cached.ts < CACHE_TTL_MY) {
      return res.json({ deaths: cached.data, character: charName });
    }

    // Search for player ID by name
    const searchRes = await fetch(`${ALBION_API}/search?q=${encodeURIComponent(charName)}`);
    if (!searchRes.ok) throw new Error(`Albion API ${searchRes.status} al buscar jugador`);
    const searchData = await searchRes.json();
    const player = (searchData.players || []).find(p => p.Name.toLowerCase() === charName.toLowerCase());
    if (!player) return res.json({ deaths: [], playerNotFound: true, character: charName });

    const deathsRes = await fetch(`${ALBION_API}/players/${player.Id}/deaths?limit=20&offset=0`);
    const deaths = deathsRes.ok ? await deathsRes.json() : [];

    myDeathsCache[charName] = { data: Array.isArray(deaths) ? deaths : [], ts: Date.now() };
    res.json({ deaths: myDeathsCache[charName].data, character: charName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
