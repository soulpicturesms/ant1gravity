const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');

const GUILD_ID   = process.env.ALBION_GUILD_ID || 'Azsds8YiRyi6aGL1rOZRLg';
const ALBION_API = 'https://gameinfo.albiononline.com/api/gameinfo';

const CACHE_TTL_EVENTS  = 2 * 60 * 1000;
const CACHE_TTL_MEMBERS = 10 * 60 * 1000;

const CACHE_TTL_BATTLES = 60 * 1000;

const cache = {
  kills:   { data: null, ts: 0 },
  deaths:  { data: null, ts: 0 },
  members: { data: null, ts: 0 },
  battles: { data: null, ts: 0 },
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
    const charName = req.user.username;
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

router.get('/battles', async (req, res) => {
  try {
    if (cache.battles.data && Date.now() - cache.battles.ts < CACHE_TTL_BATTLES) {
      return res.json(cache.battles.data);
    }
    const r = await fetch(`${ALBION_API}/battles?guildId=${GUILD_ID}&offset=0&limit=20&range=week&sort=recent`);
    if (!r.ok) throw new Error(`Albion API ${r.status}`);
    const data = await r.json();
    cache.battles = { data, ts: Date.now() };
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Detail cache: battleId → { data, ts }
const battleDetailCache = {};
const CACHE_TTL_DETAIL = 10 * 60 * 1000;

router.get('/battles/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const cached = battleDetailCache[id];
    if (cached && Date.now() - cached.ts < (cached.ttl ?? CACHE_TTL_DETAIL)) {
      return res.json(cached.data);
    }

    // Fetch battle detail first
    const battleRes = await fetch(`${ALBION_API}/battles/${id}`, { signal: AbortSignal.timeout(15000) });
    if (!battleRes.ok) throw new Error(`Albion API ${battleRes.status} al obtener batalla`);
    const battle = await battleRes.json();

    const startTime = new Date(battle.startTime).getTime();
    const endTime   = new Date(battle.endTime || battle.timeout).getTime();
    const guildIds  = Object.keys(battle.guilds || {});

    // Fetch events per guild involved in the battle (max 10 guilds to avoid hammering the API)
    const guildsToFetch = guildIds.slice(0, 10);
    const eventSets = await Promise.allSettled(
      guildsToFetch.map(gid =>
        fetch(`${ALBION_API}/events?guildId=${gid}&offset=0&limit=51&sort=recent`, { signal: AbortSignal.timeout(12000) })
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      )
    );

    // Merge, deduplicate, and filter to the battle time window
    const seen = new Set();
    const events = [];
    for (const result of eventSets) {
      if (result.status !== 'fulfilled') continue;
      for (const ev of (Array.isArray(result.value) ? result.value : [])) {
        if (!ev?.EventId || seen.has(ev.EventId)) continue;
        const ts = new Date(ev.TimeStamp).getTime();
        if (ts >= startTime && ts <= endTime) {
          seen.add(ev.EventId);
          events.push(ev);
        }
      }
    }
    events.sort((a, b) => new Date(b.TimeStamp) - new Date(a.TimeStamp));

    const isLive = battle.timeout && new Date(battle.timeout) > new Date();
    const payload = { battle, events, isLive: !!isLive };
    // Cache live battles for only 30s so fresh kills appear quickly
    const ttl = isLive ? 30 * 1000 : CACHE_TTL_DETAIL;
    battleDetailCache[id] = { data: payload, ts: Date.now(), ttl };
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
