// App router + tweaks integration
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "accent": "#ff2d7a",
  "density": "regular",
  "mode": "casino",
  "particles": true
}/*EDITMODE-END*/;

const ACCENT_PALETTES = {
  "#ff2d7a": { name: "Hot pink", secondary: "#6fff7d", glow: "rgba(255,45,122,0.45)", soft: "rgba(255,45,122,0.18)" },
  "#6fff7d": { name: "Lime",     secondary: "#ff2d7a", glow: "rgba(111,255,125,0.45)", soft: "rgba(111,255,125,0.18)" },
  "#ffce4d": { name: "Gold",     secondary: "#ff2d7a", glow: "rgba(255,206,77,0.45)", soft: "rgba(255,206,77,0.18)" },
  "#4dc6ff": { name: "Cyan",     secondary: "#ff2d7a", glow: "rgba(77,198,255,0.45)", soft: "rgba(77,198,255,0.18)" },
  "#7d5fff": { name: "Purple",   secondary: "#6fff7d", glow: "rgba(125,95,255,0.45)", soft: "rgba(125,95,255,0.18)" },
};

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = React.useState("lobby");
  const [particleKey, setParticleKey] = React.useState(0);

  const triggerParticles = React.useCallback(() => {
    if (!t.particles) return;
    setParticleKey(k => k + 1);
  }, [t.particles]);

  // apply accent palette
  React.useEffect(() => {
    const p = ACCENT_PALETTES[t.accent] || ACCENT_PALETTES["#ff2d7a"];
    const root = document.documentElement;
    root.style.setProperty("--accent", t.accent);
    root.style.setProperty("--accent-2", p.secondary);
    root.style.setProperty("--accent-glow", p.glow);
    root.style.setProperty("--accent-soft", p.soft);
  }, [t.accent]);

  // density + mode
  React.useEffect(() => {
    document.documentElement.setAttribute("data-density", t.density);
  }, [t.density]);

  React.useEffect(() => {
    document.documentElement.setAttribute("data-mode", t.mode);
  }, [t.mode]);

  const onNavigate = (id) => setRoute(id);

  const page = (() => {
    switch (route) {
      case "lobby":     return <LobbyPage onNavigate={onNavigate} mode={t.mode}/>;
      case "blackjack": return <BlackjackPage triggerParticles={triggerParticles} mode={t.mode}/>;
      case "roulette":  return <RoulettePage triggerParticles={triggerParticles} mode={t.mode}/>;
      case "slots":     return <SlotsPage triggerParticles={triggerParticles} mode={t.mode}/>;
      case "plinko":    return <PlinkoPage triggerParticles={triggerParticles} mode={t.mode}/>;
      case "poker":     return <PokerPage triggerParticles={triggerParticles} mode={t.mode}/>;
      case "stats":     return <StatsPage onNavigate={onNavigate}/>;
      case "history":   return <HistoryPage/>;
      case "promo":     return <PromoPage/>;
      default:          return <LobbyPage onNavigate={onNavigate} mode={t.mode}/>;
    }
  })();

  return (
    <div className="app">
      <div className="app__sidebar"><Sidebar route={route} onNavigate={onNavigate}/></div>
      <div className="app__header"><Header mode={t.mode}/></div>
      <main className="app__main">{page}</main>
      <ModePill mode={t.mode}/>
      {t.particles && <Particles key={particleKey} active={particleKey > 0}/>}

      <TweaksPanel>
        <TweakSection label="Apariencia" />
        <TweakColor label="Color de acento" value={t.accent}
          options={Object.keys(ACCENT_PALETTES)}
          onChange={(v) => setTweak("accent", v)} />
        <TweakRadio label="Densidad" value={t.density}
          options={[
            { value: "compact", label: "Compacta" },
            { value: "regular", label: "Normal" },
            { value: "spacious", label: "Espaciosa" },
          ]}
          onChange={(v) => setTweak("density", v)} />
        <TweakSection label="Modo" />
        <TweakRadio label="Tipo de juego" value={t.mode}
          options={[
            { value: "casino", label: "Casino" },
            { value: "sweepstake", label: "Sweepstake" },
          ]}
          onChange={(v) => setTweak("mode", v)} />
        <TweakSection label="Efectos" />
        <TweakToggle label="Partículas al ganar" value={t.particles}
          onChange={(v) => setTweak("particles", v)} />
        <TweakButton label="Probar efecto" onClick={() => { setParticleKey(k => k + 1); }} />
      </TweaksPanel>
    </div>
  );
}

// ---- placeholder pages for stats/history/promo ----
const StatsPage = ({ onNavigate }) => (
  <div className="main">
    <div className="page-head">
      <div>
        <div className="page-head__crumbs">Personal / <span>Stats</span></div>
        <h1>Tus <span style={{ color: "var(--accent)" }}>stats</span></h1>
        <div className="page-head__sub">Resumen de actividad y rentabilidad por juego.</div>
      </div>
    </div>
    <div className="stat-strip">
      <div className="stat-strip__cell">
        <span className="stat-strip__label">Total apostado</span>
        <span className="stat-strip__val">2,481,520</span>
        <span className="stat-strip__delta">+18% mes</span>
      </div>
      <div className="stat-strip__cell">
        <span className="stat-strip__label">Total ganado</span>
        <span className="stat-strip__val" style={{ color: "var(--accent-2)" }}>+184,200</span>
        <span className="stat-strip__delta">RTP personal 97.4%</span>
      </div>
      <div className="stat-strip__cell">
        <span className="stat-strip__label">Manos jugadas</span>
        <span className="stat-strip__val">8,412</span>
        <span className="stat-strip__delta">Win rate 52.1%</span>
      </div>
      <div className="stat-strip__cell">
        <span className="stat-strip__label">Mejor multi</span>
        <span className="stat-strip__val" style={{ color: "var(--accent)" }}>820×</span>
        <span className="stat-strip__delta">Anti-Gravity Slots</span>
      </div>
    </div>
    <div className="section-head"><h2>Por juego</h2></div>
    <div className="card" style={{ padding: 0 }}>
      {[
        { name: "Anti-Gravity Slots", plays: 4218, profit: 18420, rtp: 102.3 },
        { name: "Ruleta Europea",     plays: 1820, profit: -3240, rtp: 94.8 },
        { name: "Blackjack Pro",      plays: 1480, profit: 12800, rtp: 101.2 },
        { name: "Plinko Zero-G",      plays: 612,  profit: 4200,  rtp: 99.8 },
        { name: "Texas Hold'em",      plays: 282,  profit: 6420,  rtp: 108.4 },
      ].map((g, i) => (
        <div key={i} style={{
          display: "grid", gridTemplateColumns: "1fr 100px 120px 100px",
          padding: "14px 18px",
          borderTop: i ? "1px solid var(--line)" : "none",
          alignItems: "center", gap: 12,
        }}>
          <span style={{ fontWeight: 600 }}>{g.name}</span>
          <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-3)", textAlign: "right" }}>{g.plays.toLocaleString()} plays</span>
          <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700, textAlign: "right", color: g.profit >= 0 ? "var(--accent-2)" : "var(--loss)" }}>
            {g.profit >= 0 ? "+" : ""}{g.profit.toLocaleString()}
          </span>
          <span style={{ fontFamily: "var(--f-mono)", textAlign: "right" }}>{g.rtp}%</span>
        </div>
      ))}
    </div>
  </div>
);

const HistoryPage = () => (
  <div className="main">
    <div className="page-head">
      <div>
        <div className="page-head__crumbs">Personal / <span>Historial</span></div>
        <h1>Historial</h1>
      </div>
    </div>
    <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-3)" }}>
      Tu historial completo se cargará aquí. Filtros por juego, fecha y monto.
    </div>
  </div>
);

const PromoPage = () => (
  <div className="main">
    <div className="page-head">
      <div>
        <div className="page-head__crumbs">Personal / <span>Promociones</span></div>
        <h1>Promociones</h1>
      </div>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
      {[
        { t: "Bono de bienvenida", d: "x3 hasta 50,000 fichas en tu primer depósito", c: "var(--accent)" },
        { t: "Rakeback semanal",   d: "5% del rake devuelto cada lunes", c: "var(--accent-2)" },
        { t: "Reto Plinko",        d: "Cae en 110× para ganar 25,000 fichas extra", c: "var(--info)" },
      ].map((p, i) => (
        <div key={i} className="card" style={{ padding: 20, position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at top right, ${p.c}22, transparent 60%)`, pointerEvents: "none" }}/>
          <div style={{ position: "relative" }}>
            <span className="tag" style={{ color: p.c, borderColor: `${p.c}33`, background: `${p.c}11` }}>activo</span>
            <h3 style={{ font: "700 20px/1.2 var(--f-display)", marginTop: 12, marginBottom: 6 }}>{p.t}</h3>
            <p style={{ color: "var(--text-3)", fontSize: 13, marginBottom: 16 }}>{p.d}</p>
            <button className="btn btn--primary">Reclamar</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

Object.assign(window, { App });
