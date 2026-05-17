import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api/api';
import { useAuth } from '../context/AuthContext';

const RENDER = 'https://render.albiononline.com/v1/item';

const ARMOR_SLOTS  = ['Head', 'Armor', 'Shoes'];
const WEAPON_SLOTS = ['MainHand', 'OffHand'];
const EXTRA_SLOTS  = ['Cape', 'Mount', 'Bag'];

function itemUrl(item) {
  if (!item?.Type) return null;
  return `${RENDER}/${item.Type}.png`;
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function formatFame(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(0) + 'K';
  return n.toLocaleString();
}

function ItemSlot({ item, size = 32 }) {
  const url = itemUrl(item);
  return (
    <div title={item?.Type || ''} style={{
      width: size, height: size,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${url ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'}`,
      borderRadius: 4, overflow: 'hidden', flexShrink: 0,
    }}>
      {url && <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />}
    </div>
  );
}

function Equipment({ eq, align = 'left' }) {
  if (!eq) return null;
  const isRight = align === 'right';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: isRight ? 'flex-end' : 'flex-start' }}>
      <div style={{ display: 'flex', gap: 3 }}>
        {ARMOR_SLOTS.map(s => <ItemSlot key={s} item={eq[s]} />)}
      </div>
      <div style={{ display: 'flex', gap: 3 }}>
        {WEAPON_SLOTS.map(s => <ItemSlot key={s} item={eq[s]} />)}
        {EXTRA_SLOTS.map(s => <ItemSlot key={s} item={eq[s]} />)}
      </div>
    </div>
  );
}

function KillCard({ event, tab }) {
  const { Killer, Victim, TotalVictimKillFame, TimeStamp, numberOfParticipants } = event;
  const isKill = tab === 'kills';
  const accent = isKill ? '#00cc66' : '#ff4466';

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)',
      border: `1px solid ${accent}22`, borderLeft: `3px solid ${accent}`,
      borderRadius: 10, padding: '14px 18px',
      display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', color: isKill ? '#00cc66' : '#9090b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          ⚔️ {Killer?.Name || '—'}
        </div>
        {Killer?.GuildName && <div style={{ fontSize: '0.75rem', color: '#5a5a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{Killer.GuildName}</div>}
        <Equipment eq={Killer?.Equipment} align="left" />
        {Killer?.AverageItemPower > 0 && <div style={{ fontSize: '0.7rem', color: '#4a4a6a', marginTop: 4 }}>IP {Math.round(Killer.AverageItemPower)}</div>}
      </div>

      <div style={{ textAlign: 'center', minWidth: 60 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#ffd700', lineHeight: 1 }}>{formatFame(TotalVictimKillFame)}</div>
        <div style={{ fontSize: '0.6rem', color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>fame</div>
        <div style={{ fontSize: '0.8rem', fontFamily: 'Rajdhani', fontWeight: 700, color: accent, letterSpacing: '0.05em' }}>VS</div>
        <div style={{ fontSize: '0.7rem', color: '#5a5a7a', marginTop: 8 }}>{timeAgo(TimeStamp)}</div>
        {numberOfParticipants > 1 && <div style={{ fontSize: '0.65rem', color: '#4a4a6a', marginTop: 3 }}>👥 {numberOfParticipants}</div>}
      </div>

      <div style={{ textAlign: 'right', minWidth: 0 }}>
        <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.05rem', color: isKill ? '#9090b0' : '#ff4466', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {Victim?.Name || '—'} 💀
        </div>
        {Victim?.GuildName && <div style={{ fontSize: '0.75rem', color: '#5a5a7a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>{Victim.GuildName}</div>}
        <Equipment eq={Victim?.Equipment} align="right" />
        {Victim?.AverageItemPower > 0 && <div style={{ fontSize: '0.7rem', color: '#4a4a6a', marginTop: 4 }}>IP {Math.round(Victim.AverageItemPower)}</div>}
      </div>
    </div>
  );
}

function MyDeathCard({ event, alreadyRequested, requesting, onRequest }) {
  const { Killer, Victim, TotalVictimKillFame, TimeStamp, numberOfParticipants } = event;
  const [done, setDone] = useState(alreadyRequested);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  const handleClick = async () => {
    setLoading(true);
    setErr('');
    try {
      await onRequest(event);
      setDone(true);
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)',
      border: '1px solid #ff446622', borderLeft: '3px solid #ff4466',
      borderRadius: 10, padding: '14px 18px',
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 16, alignItems: 'center' }}>
        {/* Killer */}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#9090b0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ⚔️ {Killer?.Name || '—'}
          </div>
          {Killer?.GuildName && <div style={{ fontSize: '0.75rem', color: '#5a5a7a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Killer.GuildName}</div>}
          <Equipment eq={Killer?.Equipment} align="left" />
          {Killer?.AverageItemPower > 0 && <div style={{ fontSize: '0.7rem', color: '#4a4a6a', marginTop: 4 }}>IP {Math.round(Killer.AverageItemPower)}</div>}
        </div>

        {/* Center */}
        <div style={{ textAlign: 'center', minWidth: 60 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.2rem', color: '#ffd700', lineHeight: 1 }}>{formatFame(TotalVictimKillFame)}</div>
          <div style={{ fontSize: '0.6rem', color: '#4a4a6a', textTransform: 'uppercase', marginBottom: 8 }}>fame</div>
          <div style={{ fontSize: '0.8rem', fontFamily: 'Rajdhani', fontWeight: 700, color: '#ff4466' }}>VS</div>
          <div style={{ fontSize: '0.7rem', color: '#5a5a7a', marginTop: 8 }}>{timeAgo(TimeStamp)}</div>
          {numberOfParticipants > 1 && <div style={{ fontSize: '0.65rem', color: '#4a4a6a', marginTop: 3 }}>👥 {numberOfParticipants}</div>}
        </div>

        {/* Victim (user) */}
        <div style={{ textAlign: 'right', minWidth: 0 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem', color: '#ff4466', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {Victim?.Name || '—'} 💀
          </div>
          {Victim?.GuildName && <div style={{ fontSize: '0.75rem', color: '#5a5a7a', marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{Victim.GuildName}</div>}
          <Equipment eq={Victim?.Equipment} align="right" />
          {Victim?.AverageItemPower > 0 && <div style={{ fontSize: '0.7rem', color: '#4a4a6a', marginTop: 4 }}>IP {Math.round(Victim.AverageItemPower)}</div>}
        </div>
      </div>

      {/* Reequip button */}
      <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10 }}>
        {err && <span style={{ fontSize: '0.78rem', color: '#ff6688' }}>{err}</span>}
        <button
          onClick={handleClick}
          disabled={loading || done}
          style={{
            padding: '7px 18px', borderRadius: 6,
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem',
            cursor: (loading || done) ? 'default' : 'pointer',
            border: `1px solid ${done ? '#00cc6644' : '#00d4ff44'}`,
            background: done ? 'rgba(0,204,102,0.1)' : 'rgba(0,212,255,0.1)',
            color: done ? '#00cc66' : '#00d4ff',
            transition: 'all 0.2s',
          }}
        >
          {done ? '✓ Solicitud enviada' : loading ? '...' : '⚙️ Solicitar Reequip'}
        </button>
      </div>
    </div>
  );
}

// ─── Battles ──────────────────────────────────────────────────────────────────

const GUILD_NAME = 'ANT1GRAVITY';

function formatFameShort(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return Math.round(n / 1_000) + 'K';
  return String(n);
}

function battleDuration(start, end) {
  const mins = Math.round((new Date(end) - new Date(start)) / 60000);
  if (mins < 60) return `${mins}min`;
  return `${Math.floor(mins / 60)}h ${mins % 60}min`;
}

function BattleCard({ battle, guildId }) {
  const navigate = useNavigate();

  const guilds = battle.guilds || {};
  const ours = guilds[guildId] || null;
  const enemies = Object.entries(guilds)
    .filter(([id]) => id !== guildId)
    .sort(([, a], [, b]) => (b.kills || 0) - (a.kills || 0));

  const ourKills  = ours?.kills  ?? 0;
  const ourDeaths = ours?.deaths ?? 0;
  const kd = ourDeaths > 0 ? (ourKills / ourDeaths).toFixed(2) : ourKills > 0 ? '∞' : '—';
  const kdColor = ourKills > ourDeaths ? '#00cc66' : ourKills < ourDeaths ? '#ff4466' : '#ffd700';

  const totalPlayers = battle.numberOfPlayers ?? '?';
  const duration = battle.startTime && battle.endTime ? battleDuration(battle.startTime, battle.endTime) : null;

  // Build title: "OurGuild vs Enemy1, Enemy2"
  const ourName   = ours?.name || GUILD_NAME;
  const enemyNames = enemies.slice(0, 2).map(([, g]) => g.name).filter(Boolean).join(', ');
  const extraCount = enemies.length > 2 ? ` y ${enemies.length - 2} más` : '';
  const titleVs = enemyNames
    ? `${ourName} vs ${enemyNames}${extraCount}`
    : ourName;

  const location = battle.clusterName || battle.cluster || null;

  return (
    <div
      onClick={() => navigate(`/killboard/battles/${battle.id}`)}
      style={{
        background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)',
        border: `1px solid ${kdColor}22`,
        borderLeft: `3px solid ${kdColor}`,
        borderRadius: 10,
        padding: '14px 18px',
        cursor: 'pointer',
        transition: 'background 0.15s',
        userSelect: 'none',
      }}
      onMouseEnter={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0c0c1a, #0f0f22)'}
      onMouseLeave={e => e.currentTarget.style.background = 'linear-gradient(135deg, #0a0a16, #0d0d1e)'}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        {/* Title + meta */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.95rem', color: '#e0e0f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            ⚔️ {titleVs}
          </div>
          <div style={{ fontSize: '0.7rem', color: '#5a5a7a', marginTop: 2 }}>
            {timeAgo(battle.startTime)}
            {duration && <span style={{ marginLeft: 8, color: '#4a4a6a' }}>• {duration}</span>}
            {location && <span style={{ marginLeft: 8, color: '#4a4a6a' }}>• {location}</span>}
            {totalPlayers && <span style={{ marginLeft: 8, color: '#4a4a6a' }}>• 👥 {totalPlayers} jugadores</span>}
          </div>
        </div>

        {/* K/D stats */}
        <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexShrink: 0 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: '#00cc66', lineHeight: 1 }}>{ourKills}</div>
            <div style={{ fontSize: '0.58rem', color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Kills</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: '#ff4466', lineHeight: 1 }}>{ourDeaths}</div>
            <div style={{ fontSize: '0.58rem', color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Muertes</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: kdColor, lineHeight: 1 }}>{kd}</div>
            <div style={{ fontSize: '0.58rem', color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>K/D</div>
          </div>
          {ours?.killFame > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#ffd700', lineHeight: 1 }}>{formatFameShort(ours.killFame)}</div>
              <div style={{ fontSize: '0.58rem', color: '#4a4a6a', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Fame</div>
            </div>
          )}
          <div style={{ color: '#4a4a6a', fontSize: '0.8rem', marginLeft: 4 }}>→</div>
        </div>
      </div>
    </div>
  );
}


function BattleStatsBar({ battles, guildId }) {
  const withOurs = battles.filter(b => b.guilds?.[guildId]);
  const totalK = withOurs.reduce((s, b) => s + (b.guilds[guildId]?.kills ?? 0), 0);
  const totalD = withOurs.reduce((s, b) => s + (b.guilds[guildId]?.deaths ?? 0), 0);
  const kd = totalD > 0 ? (totalK / totalD).toFixed(2) : totalK > 0 ? '∞' : '—';
  const wins = withOurs.filter(b => {
    const o = b.guilds[guildId];
    return o && (o.kills ?? 0) > (o.deaths ?? 0);
  }).length;

  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      {[
        { label: 'Batallas',  value: battles.length, color: '#00d4ff' },
        { label: 'Victorias', value: wins,            color: '#00cc66' },
        { label: 'K/D total', value: kd,              color: '#ffd700' },
        { label: 'Kills tot.', value: totalK,         color: '#00cc66' },
        { label: 'Muertes',   value: totalD,          color: '#ff4466' },
      ].map(s => (
        <div key={s.label} style={{ flex: '1 1 90px', background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)', border: '1px solid #1e1e30', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: '0.65rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

function BattlesTab({ guildId }) {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getBattles();
      setBattles(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="loading"><div className="spinner" /> Cargando batallas...</div>;
  if (error)   return <div className="alert alert-error">{error} <button onClick={load} style={{ background: 'none', border: 'none', color: '#ff8899', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600 }}>Reintentar</button></div>;
  if (!battles.length) return <div className="empty"><div className="empty-icon">⚔️</div><p>Sin batallas recientes</p></div>;

  return (
    <>
      <BattleStatsBar battles={battles} guildId={guildId} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {battles.map(b => <BattleCard key={b.id} battle={b} guildId={guildId} />)}
      </div>
    </>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────
function StatsBar({ kills, deaths }) {
  const totalFame = kills.reduce((s, e) => s + (e.TotalVictimKillFame || 0), 0);
  const kd = deaths.length > 0 ? (kills.length / deaths.length).toFixed(2) : kills.length > 0 ? '∞' : '—';
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
      {[
        { label: 'Kills',   value: kills.length,          color: '#00cc66' },
        { label: 'Muertes', value: deaths.length,         color: '#ff4466' },
        { label: 'K/D',     value: kd,                    color: '#00d4ff' },
        { label: 'Fame',    value: formatFame(totalFame), color: '#ffd700' },
      ].map(s => (
        <div key={s.label} style={{ flex: '1 1 90px', background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)', border: '1px solid #1e1e30', borderRadius: 8, padding: '12px 16px', textAlign: 'center' }}>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
          <div style={{ fontSize: '0.68rem', color: '#6a6a8a', textTransform: 'uppercase', letterSpacing: '0.1em', marginTop: 4 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

const ALBION_GUILD_ID = 'Azsds8YiRyi6aGL1rOZRLg';

export default function Killboard() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(searchParams.get('tab') || 'kills');
  const [kills, setKills]   = useState([]);
  const [deaths, setDeaths] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [search, setSearch]       = useState('');

  // Mis Muertes state
  const [myDeaths, setMyDeaths]       = useState([]);
  const [myDeathsLoading, setMyDeathsLoading] = useState(false);
  const [myDeathsError, setMyDeathsError]   = useState(null);
  const [myCharacter, setMyCharacter]     = useState(null);
  const [submittedEvents, setSubmittedEvents] = useState(new Set());

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [k, d] = await Promise.all([api.getKills(), api.getDeaths()]);
      setKills(Array.isArray(k) ? k : []);
      setDeaths(Array.isArray(d) ? d : []);
      setLastUpdate(new Date());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMyDeaths = useCallback(async () => {
    if (!user) return;
    setMyDeathsLoading(true);
    setMyDeathsError(null);
    try {
      const [deathsRes, requestsRes] = await Promise.all([
        api.getMyDeaths(),
        api.getMyDeathRequests(),
      ]);
      if (deathsRes.playerNotFound) { setMyDeathsError(`No se encontró el personaje "${deathsRes.character || ''}" en Albion Online. Avisale a un admin para verificar que tu usuario coincida con tu nombre de personaje.`); return; }
      setMyDeaths(deathsRes.deaths || []);
      setMyCharacter(deathsRes.character);
      const submitted = new Set((requestsRes || []).map(r => r.event_id));
      setSubmittedEvents(submitted);
    } catch (e) {
      setMyDeathsError(e.message);
    } finally {
      setMyDeathsLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (tab === 'mine') loadMyDeaths();
  }, [tab, loadMyDeaths]);

  const handleRequestReequip = async (event) => {
    await api.submitDeathRequest({ event_id: event.EventId, death_event: event });
    setSubmittedEvents(prev => new Set([...prev, event.EventId]));
  };

  const q = search.trim().toLowerCase();
  const base = tab === 'kills' ? kills : deaths;
  const events = q
    ? base.filter(e => e.Killer?.Name?.toLowerCase().includes(q) || e.Victim?.Name?.toLowerCase().includes(q))
    : base;

  const TABS = [
    { key: 'kills',    label: `Kills (${kills.length})`,    color: '#00cc66' },
    { key: 'deaths',   label: `Muertes (${deaths.length})`, color: '#ff4466' },
    { key: 'battles',  label: '⚔️ Batallas',                color: '#a78bfa' },
    ...(user ? [{ key: 'mine', label: '⚙️ Mis Muertes',    color: '#00d4ff' }] : []),
  ];

  return (
    <div className="page">
      <div className="section-header">
        <h2>⚔️ Killboard</h2>
        <div className="accent-line" />
      </div>

      {!loading && !error && (tab === 'kills' || tab === 'deaths') && <StatsBar kills={kills} deaths={deaths} />}

      {(tab === 'kills' || tab === 'deaths') && (
        <div style={{ marginBottom: 16 }}>
          <input
            className="input"
            placeholder="Buscar personaje..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ maxWidth: 320, fontSize: '0.9rem' }}
          />
          {q && <span style={{ marginLeft: 10, fontSize: '0.78rem', color: '#6a6a8a' }}>{events.length} resultado{events.length !== 1 ? 's' : ''} para "{q}"</span>}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '7px 20px', borderRadius: 6,
            fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', letterSpacing: '0.05em',
            cursor: 'pointer',
            border: `1px solid ${tab === t.key ? t.color + '55' : '#1e1e30'}`,
            background: tab === t.key ? t.color + '18' : 'transparent',
            color: tab === t.key ? t.color : '#6a6a8a',
            transition: 'all 0.2s',
          }}>
            {t.label}
          </button>
        ))}
        {(tab === 'kills' || tab === 'deaths') && (
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            {lastUpdate && <span style={{ fontSize: '0.72rem', color: '#4a4a6a' }}>{lastUpdate.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>}
            <button onClick={load} disabled={loading} style={{ padding: '7px 14px', borderRadius: 6, fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.85rem', cursor: loading ? 'default' : 'pointer', border: '1px solid #1e1e30', background: 'transparent', color: '#6a6a8a' }}>
              ↻ Actualizar
            </button>
          </div>
        )}
      </div>

      {/* Guild kills / deaths */}
      {(tab === 'kills' || tab === 'deaths') && (
        <>
          {loading && <div className="loading"><div className="spinner" /> Cargando killboard...</div>}
          {error && (
            <div className="alert alert-error" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <span>{error}</span>
              <button onClick={load} style={{ background: 'none', border: 'none', color: '#ff8899', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600 }}>Reintentar</button>
            </div>
          )}
          {!loading && !error && events.length === 0 && (
            <div className="empty">
              <div className="empty-icon">{tab === 'kills' ? '⚔️' : '💀'}</div>
              <p>Sin {tab === 'kills' ? 'kills' : 'muertes'} recientes</p>
            </div>
          )}
          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {events.map(event => <KillCard key={event.EventId} event={event} tab={tab} />)}
            </div>
          )}
        </>
      )}

      {/* Batallas */}
      {tab === 'battles' && <BattlesTab guildId={ALBION_GUILD_ID} />}

      {/* Mis Muertes */}
      {tab === 'mine' && (
        <div>
          {myCharacter && (
            <div style={{ marginBottom: 16, fontSize: '0.82rem', color: '#6a6a8a' }}>
              Mostrando muertes de <strong style={{ color: '#00d4ff' }}>{myCharacter}</strong>
              <button onClick={loadMyDeaths} style={{ marginLeft: 10, background: 'none', border: 'none', color: '#6a6a8a', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600 }}>↻</button>
            </div>
          )}
          {myDeathsLoading && <div className="loading"><div className="spinner" /> Cargando muertes...</div>}
          {myDeathsError && <div className="alert alert-error">{myDeathsError}</div>}
          {!myDeathsLoading && !myDeathsError && myDeaths.length === 0 && (
            <div className="empty"><div className="empty-icon">💀</div><p>No hay muertes recientes</p></div>
          )}
          {!myDeathsLoading && !myDeathsError && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {myDeaths.map(event => (
                <MyDeathCard
                  key={event.EventId}
                  event={event}
                  alreadyRequested={submittedEvents.has(event.EventId)}
                  onRequest={handleRequestReequip}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
