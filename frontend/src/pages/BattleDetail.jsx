import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/api';

const RENDER = 'https://render.albiononline.com/v1/item';
const GUILD_ID = 'Azsds8YiRyi6aGL1rOZRLg';

function fmt(n) {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (Math.round(n / 100) / 10).toFixed(1) + 'K';
  return String(n);
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts)) / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function battleTime(start, end) {
  const s = new Date(start), e = new Date(end);
  const mins = Math.round((e - s) / 60000);
  return `${mins < 60 ? mins + 'min' : Math.floor(mins / 60) + 'h ' + (mins % 60) + 'min'}`;
}

function fmtTs(start, eventTs) {
  const diff = Math.round((new Date(eventTs) - new Date(start)) / 1000);
  const m = Math.floor(diff / 60).toString().padStart(2, '0');
  const s = (diff % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function StatCell({ value, color }) {
  return (
    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.9rem', color: color || '#c0c0d8' }}>
      {value}
    </td>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{
      fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1rem',
      color: '#00d4ff', letterSpacing: '0.1em', textTransform: 'uppercase',
      marginBottom: 10, paddingBottom: 6, borderBottom: '1px solid #1a1a28',
    }}>
      {children}
    </div>
  );
}

function TableWrap({ children }) {
  return (
    <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid #1a1a28', marginBottom: 28 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
        {children}
      </table>
    </div>
  );
}

const TH = ({ children, right }) => (
  <th style={{
    padding: '8px 12px', textAlign: right ? 'right' : 'left',
    fontSize: '0.65rem', fontFamily: 'Rajdhani', fontWeight: 700,
    letterSpacing: '0.1em', textTransform: 'uppercase',
    color: '#5a5a7a', borderBottom: '1px solid #1a1a28',
    background: '#0a0a14', whiteSpace: 'nowrap',
  }}>
    {children}
  </th>
);

const TR = ({ children, highlight, accent }) => (
  <tr style={{
    background: highlight ? 'rgba(0,212,255,0.05)' : accent ? `${accent}0d` : 'transparent',
    borderBottom: '1px solid #12121e',
    borderLeft: accent ? `3px solid ${accent}88` : '3px solid transparent',
  }}>
    {children}
  </tr>
);

function PlayerAvatar({ type }) {
  if (!type) return <div style={{ width: 28, height: 28, background: '#1a1a28', borderRadius: 4, flexShrink: 0 }} />;
  return (
    <div style={{ width: 28, height: 28, flexShrink: 0, borderRadius: 4, overflow: 'hidden', background: '#0a0a14' }}>
      <img src={`${RENDER}/${type}.png`} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} onError={e => { e.target.style.display = 'none'; }} />
    </div>
  );
}

// ─── Alliance table ────────────────────────────────────────────────────────────
function AllianceTable({ alliances, guildId }) {
  if (!alliances || !Object.keys(alliances).length) return null;
  const rows = Object.entries(alliances).sort(([, a], [, b]) => (b.kills || 0) - (a.kills || 0));
  return (
    <>
      <SectionTitle>Alianzas ({rows.length})</SectionTitle>
      <TableWrap>
        <thead>
          <tr>
            <TH>Alianza</TH>
            <TH right>Jugadores</TH>
            <TH right>Kills</TH>
            <TH right>Muertes</TH>
            <TH right>IP Prom.</TH>
            <TH right>Fame</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, a]) => (
            <TR key={id}>
              <td style={{ padding: '9px 12px', color: '#e0e0f0', fontFamily: 'Rajdhani', fontWeight: 700 }}>{a.name || id}</td>
              <StatCell value={a.numberOfMembers ?? '—'} color="#00d4ff" />
              <StatCell value={a.kills ?? 0} color="#00cc66" />
              <StatCell value={a.deaths ?? 0} color="#ff4466" />
              <StatCell value={a.averageItemPower ? Math.round(a.averageItemPower) : '—'} />
              <StatCell value={fmt(a.killFame)} color="#ffd700" />
            </TR>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}

// ─── Guild table ───────────────────────────────────────────────────────────────
function GuildTable({ guilds, guildId }) {
  if (!guilds || !Object.keys(guilds).length) return null;
  const rows = Object.entries(guilds).sort(([, a], [, b]) => (b.kills || 0) - (a.kills || 0));
  return (
    <>
      <SectionTitle>Gremios ({rows.length})</SectionTitle>
      <TableWrap>
        <thead>
          <tr>
            <TH>Gremio</TH>
            <TH right>Jugadores</TH>
            <TH right>Kills</TH>
            <TH right>Muertes</TH>
            <TH right>IP Prom.</TH>
            <TH right>Fame</TH>
          </tr>
        </thead>
        <tbody>
          {rows.map(([id, g]) => (
            <TR key={id} highlight={id === guildId}>
              <td style={{ padding: '9px 12px', fontFamily: 'Rajdhani', fontWeight: 700, color: id === guildId ? '#00d4ff' : '#e0e0f0' }}>
                {id === guildId && <span style={{ marginRight: 6, color: '#00d4ff' }}>★</span>}
                {g.name || id}
              </td>
              <StatCell value={g.numberOfMembers ?? '—'} color="#a78bfa" />
              <StatCell value={g.kills ?? 0} color="#00cc66" />
              <StatCell value={g.deaths ?? 0} color="#ff4466" />
              <StatCell value={g.averageItemPower ? Math.round(g.averageItemPower) : '—'} />
              <StatCell value={fmt(g.killFame)} color="#ffd700" />
            </TR>
          ))}
        </tbody>
      </TableWrap>
    </>
  );
}

// ─── Players table ─────────────────────────────────────────────────────────────
function PlayersTable({ members, guildId, guilds }) {
  const [sortKey, setSortKey] = useState('killFame');
  const [search, setSearch]   = useState('');

  if (!members?.length) return null;

  const guildName = (guildId_) => guilds?.[guildId_]?.name || guildId_ || '—';

  const sorted = [...members]
    .filter(m => !search || m.Name?.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (b[sortKey] ?? 0) - (a[sortKey] ?? 0));

  const col = (key, label) => (
    <TH right>
      <span onClick={() => setSortKey(key)} style={{ cursor: 'pointer', color: sortKey === key ? '#00d4ff' : undefined }}>
        {label}{sortKey === key ? ' ▼' : ''}
      </span>
    </TH>
  );

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionTitle>Jugadores ({sorted.length})</SectionTitle>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar jugador..."
          style={{ background: '#0a0a14', border: '1px solid #1e1e30', borderRadius: 6, padding: '5px 10px', color: '#e0e0f0', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>
      <TableWrap>
        <thead>
          <tr>
            <TH>Jugador</TH>
            <TH>Gremio</TH>
            <TH right>IP</TH>
            {col('damageDealt',  'DMG')}
            {col('healingDone',  'HEAL')}
            {col('kills',        'Kills')}
            {col('deaths',       'Muertes')}
            {col('killFame',     'Fame')}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m, i) => {
            const isOurs = m.GuildId === guildId;
            const weapon = m.Equipment?.MainHand?.Type;
            return (
              <TR key={i} highlight={isOurs}>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <PlayerAvatar type={weapon} />
                    <span style={{ fontFamily: 'Rajdhani', fontWeight: 700, color: isOurs ? '#00d4ff' : '#e0e0f0', whiteSpace: 'nowrap' }}>{m.Name}</span>
                  </div>
                </td>
                <td style={{ padding: '8px 12px', color: '#7a7a9a', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
                  {guildName(m.GuildId)}
                </td>
                <StatCell value={m.AverageItemPower ? Math.round(m.AverageItemPower) : '—'} />
                <StatCell value={fmt(m.DamageDone)} color="#a78bfa" />
                <StatCell value={fmt(m.SupportHealingDone)} color="#00e8c0" />
                <StatCell value={m.Kills ?? 0} color="#00cc66" />
                <StatCell value={m.Deaths ?? 0} color="#ff4466" />
                <StatCell value={fmt(m.FameContribution ?? m.KillFame)} color="#ffd700" />
              </TR>
            );
          })}
        </tbody>
      </TableWrap>
    </>
  );
}

// ─── Kills table ───────────────────────────────────────────────────────────────
function KillsTable({ events, startTime, guildId }) {
  const [search, setSearch] = useState('');
  if (!events?.length) return null;

  const filtered = search
    ? events.filter(e =>
        e.Killer?.Name?.toLowerCase().includes(search.toLowerCase()) ||
        e.Victim?.Name?.toLowerCase().includes(search.toLowerCase())
      )
    : events;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <SectionTitle>Kills ({events.length})</SectionTitle>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nombre..."
          style={{ background: '#0a0a14', border: '1px solid #1e1e30', borderRadius: 6, padding: '5px 10px', color: '#e0e0f0', fontSize: '0.8rem', outline: 'none' }}
        />
      </div>
      <TableWrap>
        <thead>
          <tr>
            <TH>Tiempo</TH>
            <TH>Killer</TH>
            <TH>Víctima</TH>
            <TH right>IP Killer</TH>
            <TH right>IP Víctima</TH>
            <TH right>Fame</TH>
          </tr>
        </thead>
        <tbody>
          {filtered.map(ev => {
            const killerOurs = ev.Killer?.GuildId === guildId;
            const victimOurs = ev.Victim?.GuildId === guildId;
            const accent = killerOurs ? '#00cc66' : victimOurs ? '#ff4466' : null;
            const ts = startTime ? fmtTs(startTime, ev.TimeStamp) : timeAgo(ev.TimeStamp);
            return (
              <TR key={ev.EventId} accent={accent}>
                <td style={{ padding: '8px 12px', color: '#5a5a7a', fontFamily: 'monospace', fontSize: '0.82rem', whiteSpace: 'nowrap' }}>{ts}</td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <PlayerAvatar type={ev.Killer?.Equipment?.MainHand?.Type} />
                    <div>
                      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.88rem', color: killerOurs ? '#00d4ff' : '#e0e0f0', whiteSpace: 'nowrap' }}>{ev.Killer?.Name || '—'}</div>
                      {ev.Killer?.GuildName && <div style={{ fontSize: '0.68rem', color: '#5a5a7a' }}>{ev.Killer.GuildName}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ padding: '8px 12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <PlayerAvatar type={ev.Victim?.Equipment?.MainHand?.Type} />
                    <div>
                      <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '0.88rem', color: victimOurs ? '#ff4466' : '#9090b0', whiteSpace: 'nowrap' }}>{ev.Victim?.Name || '—'}</div>
                      {ev.Victim?.GuildName && <div style={{ fontSize: '0.68rem', color: '#5a5a7a' }}>{ev.Victim.GuildName}</div>}
                    </div>
                  </div>
                </td>
                <StatCell value={ev.Killer?.AverageItemPower ? Math.round(ev.Killer.AverageItemPower) : '—'} color="#00d4ff" />
                <StatCell value={ev.Victim?.AverageItemPower ? Math.round(ev.Victim.AverageItemPower) : '—'} />
                <StatCell value={fmt(ev.TotalVictimKillFame)} color="#ffd700" />
              </TR>
            );
          })}
        </tbody>
      </TableWrap>
    </>
  );
}

// ─── Top cards ─────────────────────────────────────────────────────────────────
function TopCards({ events }) {
  if (!events?.length) return null;

  const byKiller = {};
  for (const ev of events) {
    const name = ev.Killer?.Name;
    if (!name) continue;
    byKiller[name] = (byKiller[name] || 0) + 1;
  }
  const topKiller = Object.entries(byKiller).sort(([, a], [, b]) => b - a)[0];
  const topFame = [...events].sort((a, b) => (b.TotalVictimKillFame || 0) - (a.TotalVictimKillFame || 0))[0];

  const cards = [
    topKiller && { label: 'Top Kills', name: topKiller[0], value: topKiller[1], color: '#ff4466', guild: events.find(e => e.Killer?.Name === topKiller[0])?.Killer?.GuildName },
    topFame && { label: 'Top Fame', name: topFame.Killer?.Name, value: fmt(topFame.TotalVictimKillFame), color: '#ffd700', guild: topFame.Killer?.GuildName },
  ].filter(Boolean);

  if (!cards.length) return null;

  return (
    <div style={{ display: 'flex', gap: 12, marginBottom: 28, flexWrap: 'wrap' }}>
      {cards.map(c => (
        <div key={c.label} style={{
          flex: '1 1 180px',
          background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)',
          border: `1px solid ${c.color}33`,
          borderLeft: `3px solid ${c.color}`,
          borderRadius: 8, padding: '12px 18px',
        }}>
          <div style={{ fontSize: '0.6rem', color: '#5a5a7a', fontFamily: 'Rajdhani', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.1rem', color: '#e0e0f0' }}>{c.name}</div>
          {c.guild && <div style={{ fontSize: '0.72rem', color: '#5a5a7a', marginBottom: 4 }}>{c.guild}</div>}
          <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: c.color, lineHeight: 1 }}>{c.value}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function BattleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);

  useEffect(() => {
    setLoading(true);
    api.getBattle(id)
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="page"><div className="loading"><div className="spinner" /> Cargando batalla...</div></div>;
  if (error)   return <div className="page"><div className="alert alert-error">{error}</div></div>;
  if (!data)   return null;

  const { battle, events } = data;
  const guilds = battle.guilds || {};
  const alliances = battle.alliances || {};

  const ourGuild = guilds[GUILD_ID];
  const enemies  = Object.values(guilds).filter((_, i) => Object.keys(guilds)[i] !== GUILD_ID);
  const enemyNames = enemies.slice(0, 3).map(g => g.name).filter(Boolean).join(', ');
  const titleVs = ourGuild
    ? `${ourGuild.name || 'ANT1GRAVITY'} vs ${enemyNames || 'Enemigos'}`
    : Object.values(guilds).map(g => g.name).join(' vs ');

  const location = battle.clusterName || battle.cluster || null;
  const date = battle.startTime
    ? new Date(battle.startTime).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : '—';

  const ourKills  = ourGuild?.kills  ?? 0;
  const ourDeaths = ourGuild?.deaths ?? 0;
  const kd = ourDeaths > 0 ? (ourKills / ourDeaths).toFixed(2) : ourKills > 0 ? '∞' : '—';
  const kdColor = ourKills > ourDeaths ? '#00cc66' : ourKills < ourDeaths ? '#ff4466' : '#ffd700';

  // Normalize members: battle.members is array of player objects
  const members = battle.members || [];

  return (
    <div className="page">
      {/* Back button */}
      <button
        onClick={() => navigate('/killboard?tab=battles')}
        style={{ background: 'none', border: 'none', color: '#5a5a7a', cursor: 'pointer', fontFamily: 'Rajdhani', fontWeight: 600, fontSize: '0.85rem', padding: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 6 }}
      >
        ← Volver al Killboard
      </button>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.5rem', color: '#e0e0f0', lineHeight: 1.2 }}>
              ⚔️ {titleVs}
            </div>
            <div style={{ fontSize: '0.78rem', color: '#5a5a7a', marginTop: 6, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {location && <span>📍 {location}</span>}
              <span>🕐 {date}</span>
              {battle.startTime && battle.endTime && <span>⏱ {battleTime(battle.startTime, battle.endTime)}</span>}
              {battle.numberOfPlayers && <span>👥 {battle.numberOfPlayers} jugadores</span>}
            </div>
          </div>
          {/* Our K/D summary */}
          {ourGuild && (
            <div style={{ display: 'flex', gap: 12 }}>
              {[
                { label: 'Kills',   value: ourKills,  color: '#00cc66' },
                { label: 'Muertes', value: ourDeaths, color: '#ff4466' },
                { label: 'K/D',     value: kd,        color: kdColor   },
                { label: 'Fame',    value: fmt(ourGuild.killFame), color: '#ffd700' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center', background: 'linear-gradient(135deg, #0a0a16, #0d0d1e)', border: '1px solid #1e1e30', borderRadius: 8, padding: '10px 16px', minWidth: 60 }}>
                  <div style={{ fontFamily: 'Rajdhani', fontWeight: 700, fontSize: '1.4rem', color: s.color, lineHeight: 1 }}>{s.value}</div>
                  <div style={{ fontSize: '0.6rem', color: '#5a5a7a', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 3 }}>{s.label}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="accent-line" style={{ marginTop: 16 }} />
      </div>

      {/* Top cards */}
      <TopCards events={events} />

      {/* Alliance + Guild tables side by side on wide screens */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 4 }}>
        <div>
          <AllianceTable alliances={alliances} guildId={GUILD_ID} />
        </div>
        <div>
          <GuildTable guilds={guilds} guildId={GUILD_ID} />
        </div>
      </div>

      {/* Players */}
      <PlayersTable members={members} guildId={GUILD_ID} guilds={guilds} />

      {/* Kills */}
      <KillsTable events={events} startTime={battle.startTime} guildId={GUILD_ID} />
    </div>
  );
}
