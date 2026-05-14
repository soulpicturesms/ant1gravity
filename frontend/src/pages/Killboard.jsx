import React, { useState, useEffect, useCallback } from 'react';
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

export default function Killboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState('kills');
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
    { key: 'kills',  label: `Kills (${kills.length})`,     color: '#00cc66' },
    { key: 'deaths', label: `Muertes (${deaths.length})`,  color: '#ff4466' },
    ...(user ? [{ key: 'mine', label: '⚙️ Mis Muertes', color: '#00d4ff' }] : []),
  ];

  return (
    <div className="page">
      <div className="section-header">
        <h2>⚔️ Killboard</h2>
        <div className="accent-line" />
      </div>

      {!loading && !error && tab !== 'mine' && <StatsBar kills={kills} deaths={deaths} />}

      {tab !== 'mine' && (
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
        {tab !== 'mine' && (
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
