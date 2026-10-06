// Sincroniza las cuentas del portal con los miembros reales del gremio en Albion.
const { supabase } = require('./supabase');

const ALBION_API = 'https://gameinfo.albiononline.com/api/gameinfo';
const GUILD_ID = process.env.ALBION_GUILD_ID || '_dZi8dpyRVy53Wyksk4oBA';
const UNCLAIMED = '!unclaimed';
// Si la API devuelve muchos menos miembros de lo normal, probablemente falló: pedir confirmación extra
const MAX_SAFE_REMOVAL_RATIO = 0.3;

async function fetchGuildMembers() {
  const res = await fetch(`${ALBION_API}/guilds/${GUILD_ID}/members`, { signal: AbortSignal.timeout(40000) });
  if (!res.ok) throw new Error(`La API de Albion respondió ${res.status}`);
  const members = await res.json();
  if (!Array.isArray(members) || members.length === 0) {
    throw new Error('La API de Albion devolvió 0 miembros; se cancela para no borrar a nadie por error');
  }
  return members;
}

async function computeGuildSync() {
  const members = await fetchGuildMembers();
  const { data: users, error } = await supabase.from('users')
    .select('id,username,role,password,coins,pvp_fame,albion_avatar,albion_ring');
  if (error) throw new Error(error.message);

  const byName = new Map(members.map(p => [p.Name.toLowerCase(), p]));
  const userNames = new Set(users.map(u => u.username.toLowerCase()));

  const toAdd = members.filter(p => !userNames.has(p.Name.toLowerCase()));
  // Solo se dan de baja miembros normales; admins, oficiales y pendientes nunca se borran
  const toRemove = users.filter(u => u.role === 'member' && !byName.has(u.username.toLowerCase()));
  const toApprove = users.filter(u => u.role === 'pending' && byName.has(u.username.toLowerCase()));
  const toUpdate = [];
  for (const u of users) {
    const p = byName.get(u.username.toLowerCase());
    if (!p) continue;
    const next = {
      pvp_fame: p.KillFame || 0, albion_character: p.Name,
      albion_avatar: p.Avatar || null, albion_ring: p.AvatarRing || null,
    };
    if (next.pvp_fame !== Number(u.pvp_fame) || next.albion_avatar !== u.albion_avatar || next.albion_ring !== u.albion_ring) {
      toUpdate.push({ id: u.id, ...next });
    }
  }

  const memberCount = users.filter(u => u.role === 'member').length;
  const suspicious = memberCount > 0 && toRemove.length / memberCount > MAX_SAFE_REMOVAL_RATIO;

  return { members, toAdd, toRemove, toApprove, toUpdate, suspicious };
}

function summarize(s) {
  return {
    guildCount: s.members.length,
    suspicious: s.suspicious,
    add: s.toAdd.map(p => p.Name),
    remove: s.toRemove.map(u => ({ username: u.username, activated: u.password !== UNCLAIMED, coins: u.coins || 0 })),
    approve: s.toApprove.map(u => u.username),
    updateCount: s.toUpdate.length,
  };
}

async function inBatches(items, size, fn) {
  for (let i = 0; i < items.length; i += size) {
    await Promise.all(items.slice(i, i + size).map(fn));
  }
}

async function applyGuildSync({ force = false } = {}) {
  const s = await computeGuildSync();
  if (s.suspicious && !force) {
    const err = new Error(`Se darían de baja ${s.toRemove.length} miembros, más del ${MAX_SAFE_REMOVAL_RATIO * 100}%. Revisa la vista previa y confirma.`);
    err.status = 409;
    throw err;
  }

  if (s.toRemove.length) {
    const { error } = await supabase.from('users').delete().in('id', s.toRemove.map(u => u.id));
    if (error) throw new Error(`Error al dar de baja: ${error.message}`);
  }
  if (s.toAdd.length) {
    const rows = s.toAdd.map(p => ({
      username: p.Name, password: UNCLAIMED, role: 'member',
      coins: 0, pvp_kills: 0, cta_attendance: 0, total_activities: 0,
      pvp_fame: p.KillFame || 0, albion_character: p.Name,
      albion_avatar: p.Avatar || null, albion_ring: p.AvatarRing || null,
    }));
    for (let i = 0; i < rows.length; i += 100) {
      const { error } = await supabase.from('users').insert(rows.slice(i, i + 100));
      if (error) throw new Error(`Error al dar de alta: ${error.message}`);
    }
  }
  if (s.toApprove.length) {
    const { error } = await supabase.from('users').update({ role: 'member' }).in('id', s.toApprove.map(u => u.id));
    if (error) throw new Error(`Error al aprobar: ${error.message}`);
  }
  await inBatches(s.toUpdate, 20, async ({ id, ...fields }) => {
    const { error } = await supabase.from('users').update(fields).eq('id', id);
    if (error) throw new Error(`Error al actualizar stats: ${error.message}`);
  });

  return summarize(s);
}

module.exports = { computeGuildSync, applyGuildSync, summarize, UNCLAIMED };
