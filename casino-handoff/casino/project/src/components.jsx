// shared components: logo, sidebar, header, chip, primitives, particles
// exports to window for use across other babel scripts

// ---------------- icons ----------------
const Icon = ({ d, size = 18, fill = "none", stroke = "currentColor", sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
    {typeof d === "string" ? <path d={d} /> : d}
  </svg>
);

const Icons = {
  lobby: <Icon d="M3 12 12 4l9 8M5 10v10h14V10" />,
  blackjack: <Icon d={<>
    <rect x="4" y="3" width="11" height="15" rx="2"/>
    <rect x="9" y="6" width="11" height="15" rx="2"/>
  </>}/>,
  roulette: <Icon d={<>
    <circle cx="12" cy="12" r="9"/>
    <circle cx="12" cy="12" r="3"/>
    <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1"/>
  </>}/>,
  slots: <Icon d={<>
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M9 5v14M15 5v14"/>
  </>}/>,
  plinko: <Icon d={<>
    <circle cx="6" cy="6" r="1"/><circle cx="12" cy="6" r="1"/><circle cx="18" cy="6" r="1"/>
    <circle cx="9" cy="11" r="1"/><circle cx="15" cy="11" r="1"/>
    <circle cx="6" cy="16" r="1"/><circle cx="12" cy="16" r="1"/><circle cx="18" cy="16" r="1"/>
    <circle cx="12" cy="3" r="1.2" fill="currentColor"/>
  </>}/>,
  poker: <Icon d={<>
    <path d="M12 3c2 3 5 5 5 8 0 2-1.6 3.5-3.5 3.5-.6 0-1-.1-1.5-.4V18l1.5 2.5h-3L11 18v-3.9c-.5.3-1 .4-1.5.4C7.6 14.5 6 13 6 11c0-3 3-5 5-8 .3.4.7.7 1 0z"/>
  </>}/>,
  stats: <Icon d="M4 19V9M10 19V5M16 19v-8M22 19H2"/>,
  wallet: <Icon d={<>
    <path d="M3 7h15a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z"/>
    <path d="M16 13h2M3 7V5a2 2 0 0 1 2-2h11l2 4"/>
  </>}/>,
  search: <Icon d={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  bell: <Icon d={<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>}/>,
  trophy: <Icon d={<><path d="M7 4h10v4a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v3a3 3 0 0 1-3 3M7 5H4v3a3 3 0 0 0 3 3"/><path d="M9 21h6M12 17v4"/></>}/>,
  promo: <Icon d={<><path d="M21 12V5l-5-2-4 2-4-2-5 2v7c0 5 5 9 9 9s9-4 9-9z"/><path d="m9 12 2 2 4-4"/></>}/>,
  history: <Icon d={<><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/></>}/>,
  zap: <Icon d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" fill="currentColor" stroke="currentColor"/>,
  plus: <Icon d="M12 5v14M5 12h14"/>,
  minus: <Icon d="M5 12h14"/>,
  dice: <Icon d={<><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8" cy="8" r="1" fill="currentColor"/><circle cx="16" cy="8" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8" cy="16" r="1" fill="currentColor"/><circle cx="16" cy="16" r="1" fill="currentColor"/></>}/>,
};

// ---------------- logo ----------------
const Logo = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <div className="logo-mark" aria-hidden>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 2 L13 14 H3 Z" fill="white"/>
        <circle cx="8" cy="11" r="1.5" fill="#ff2d7a"/>
      </svg>
    </div>
    <span className="wordmark">
      ant<span className="wordmark__one">1</span>gravity
    </span>
  </div>
);

// ---------------- chip ----------------
const Chip = ({ size = "md", value }) => (
  <span className={`chip ${size === "sm" ? "chip--sm" : size === "lg" ? "chip--lg" : ""}`}>
    {value || ""}
  </span>
);

// ---------------- sidebar ----------------
const NAV = [
  { id: "lobby", label: "Lobby", icon: Icons.lobby },
  { id: "blackjack", label: "Blackjack", icon: Icons.blackjack, badge: "2.4k" },
  { id: "roulette", label: "Ruleta", icon: Icons.roulette, badge: "1.1k" },
  { id: "slots", label: "Slots", icon: Icons.slots, badge: "8.2k" },
  { id: "plinko", label: "Plinko", icon: Icons.plinko },
  { id: "poker", label: "Poker", icon: Icons.poker, badge: "412" },
];
const NAV_2 = [
  { id: "stats", label: "Mis stats", icon: Icons.stats },
  { id: "history", label: "Historial", icon: Icons.history },
  { id: "promo", label: "Promociones", icon: Icons.promo },
];

const Sidebar = ({ route, onNavigate }) => (
  <aside className="sidebar">
    <div className="sidebar__logo"><Logo /></div>
    <nav className="sidebar__nav">
      <div className="sidebar__section-label">Juegos</div>
      {NAV.map(n => (
        <a key={n.id}
           className={`nav-item ${route === n.id ? "nav-item--active" : ""}`}
           onClick={(e) => { e.preventDefault(); onNavigate(n.id); }}
           href={`#${n.id}`}>
          <span className="nav-item__icon">{n.icon}</span>
          <span>{n.label}</span>
          {n.badge && <span className="nav-item__badge">{n.badge}</span>}
        </a>
      ))}
      <div className="sidebar__section-label">Personal</div>
      {NAV_2.map(n => (
        <a key={n.id}
           className={`nav-item ${route === n.id ? "nav-item--active" : ""}`}
           onClick={(e) => { e.preventDefault(); onNavigate(n.id); }}
           href={`#${n.id}`}>
          <span className="nav-item__icon">{n.icon}</span>
          <span>{n.label}</span>
        </a>
      ))}
    </nav>
    <div style={{ padding: "var(--pad-2)", display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ padding: 12, borderRadius: 10, background: "linear-gradient(135deg, rgba(255,45,122,0.15), rgba(111,255,125,0.08))", border: "1px solid var(--line-2)" }}>
        <div style={{ font: "600 10px/1 var(--f-display)", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent-2)", marginBottom: 6 }}>
          rakeback nivel 04
        </div>
        <div style={{ height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ width: "62%", height: "100%", background: "linear-gradient(90deg, var(--accent), var(--accent-2))" }}/>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--text-3)" }}>
          <span>62% al nivel 05</span>
          <span style={{ fontFamily: "var(--f-mono)" }}>12,400 / 20,000</span>
        </div>
      </div>
    </div>
  </aside>
);

// ---------------- header ----------------
const useAnimatedBalance = (initial = 158420.50) => {
  const [bal, setBal] = React.useState(initial);
  const [flash, setFlash] = React.useState(false);

  React.useEffect(() => {
    const t = setInterval(() => {
      const delta = (Math.random() - 0.3) * 240;
      setBal(b => Math.max(1000, b + delta));
      setFlash(true);
      setTimeout(() => setFlash(false), 450);
    }, 3200);
    return () => clearInterval(t);
  }, []);

  return [bal, setBal, flash];
};

const Header = ({ mode }) => {
  const [bal, , flash] = useAnimatedBalance();
  return (
    <header className="header">
      <div className="header__search">
        {Icons.search}
        <input placeholder="Buscar juegos, proveedores, torneos…" />
        <span className="header__kbd">⌘K</span>
      </div>
      <div style={{ flex: 1 }} />
      <div className="header__stat">
        <span className="header__stat-label">Apostado 24h</span>
        <span className="header__stat-val">42,180</span>
      </div>
      <div className="header__stat">
        <span className="header__stat-label">Ganado 24h</span>
        <span className="header__stat-val" style={{ color: "var(--accent-2)" }}>+6,420</span>
      </div>
      <div className="header__balance">
        <Chip size="sm"/>
        <span className={`balance-num ${flash ? "balance-num--changing" : ""}`}>
          {bal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
      </div>
      <button className="header__btn">
        {Icons.plus} Depositar
      </button>
      <button style={{ width: 38, height: 38, display: "grid", placeItems: "center", color: "var(--text-2)" }}>
        {Icons.bell}
      </button>
      <div className="header__avatar">A1</div>
    </header>
  );
};

// ---------------- particles ----------------
const Particles = ({ active, x, y, color = "var(--accent)" }) => {
  const [bursts, setBursts] = React.useState([]);
  React.useEffect(() => {
    if (!active) return;
    const id = Date.now();
    const ps = Array.from({ length: 28 }, (_, i) => ({
      id: id + i,
      x: (x ?? window.innerWidth/2) + (Math.random() - 0.5) * 40,
      y: (y ?? 200) + (Math.random() - 0.5) * 30,
      dx: (Math.random() - 0.5) * 600,
      dy: -200 - Math.random() * 300,
      color: [color, "var(--accent-2)", "#ffce4d"][i % 3],
      r: Math.random() * 360,
    }));
    setBursts(b => [...b, ...ps]);
    setTimeout(() => {
      setBursts(b => b.filter(p => !ps.find(np => np.id === p.id)));
    }, 1700);
  }, [active]);
  return (
    <div className="particles">
      {bursts.map(p => (
        <div key={p.id} className="particle" style={{
          left: p.x, top: p.y,
          width: 8 + Math.random()*4, height: 12 + Math.random()*4,
          background: p.color,
          "--dx": `${p.dx}px`,
          "--dy": `${p.dy}px`,
          transform: `rotate(${p.r}deg)`,
          animation: `particleBurst 1.6s cubic-bezier(0.1, 0.7, 0.2, 1) forwards`,
        }}/>
      ))}
    </div>
  );
};

// inject particle keyframes once
if (!document.getElementById("particle-burst-kf")) {
  const s = document.createElement("style");
  s.id = "particle-burst-kf";
  s.textContent = `
    @keyframes particleBurst {
      0%   { transform: translate(0,0) rotate(0); opacity: 1; }
      100% { transform: translate(var(--dx, 200px), calc(var(--dy, -100px) + 80vh)) rotate(720deg); opacity: 0; }
    }
  `;
  document.head.appendChild(s);
}

// ---------------- playing card ----------------
const SUITS = { "♠": "black", "♥": "red", "♦": "red", "♣": "black" };
const PlayingCard = ({ rank, suit, faceDown, style }) => {
  if (faceDown) return <div className="card-pc card-pc--back" style={style}/>;
  const isRed = SUITS[suit] === "red";
  return (
    <div className={`card-pc ${isRed ? "card-pc--red" : ""}`} style={style}>
      <div className="card-pc__corner">
        <span className="card-pc__rank">{rank}</span>
        <span className="card-pc__suit">{suit}</span>
      </div>
      <div className="card-pc__center">{suit}</div>
      <div className="card-pc__corner tr">
        <span className="card-pc__rank">{rank}</span>
        <span className="card-pc__suit">{suit}</span>
      </div>
    </div>
  );
};

// ---------------- mode pill ----------------
const ModePill = ({ mode }) => (
  <div className="mode-pill" data-mode={mode === "sweepstake" ? "sweep" : "casino"}>
    <span className="dot"/>
    <span>{mode === "sweepstake" ? "Modo Sweepstake" : "Modo Casino"}</span>
  </div>
);

// ---------------- export to window ----------------
Object.assign(window, {
  Icons, Icon, Logo, Chip, Sidebar, Header, Particles, PlayingCard, ModePill,
  useAnimatedBalance,
});
