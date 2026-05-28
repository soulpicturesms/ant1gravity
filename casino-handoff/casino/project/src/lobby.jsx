// Lobby page — hero, stats, game cards
const LobbyPage = ({ onNavigate, mode }) => {
  const games = [
    { id: "blackjack", name: "Blackjack Pro", provider: "ant1gravity originals", live: 2412, emoji: "🂡", tag: "live", bg: "linear-gradient(135deg, #1a3024, #0a1810)" },
    { id: "roulette",  name: "Ruleta Europea", provider: "ant1gravity originals", live: 1186, emoji: "⊙", tag: "hot", bg: "linear-gradient(135deg, #3a1a1a, #1a0808)" },
    { id: "slots",     name: "Anti-Gravity Slots", provider: "ant1gravity originals", live: 8240, emoji: "★", tag: "new", bg: "linear-gradient(135deg, #2a1a3a, #14081f)" },
    { id: "plinko",    name: "Plinko Zero-G", provider: "ant1gravity originals", live: 1820, emoji: "●", tag: null, bg: "linear-gradient(135deg, #1a2a3a, #08141f)" },
    { id: "poker",     name: "Texas Hold'em", provider: "ant1gravity originals", live: 412, emoji: "♠", tag: "live", bg: "linear-gradient(135deg, #1a3024, #0a1810)" },
    { id: "slots",     name: "Neon Reels", provider: "ant1gravity originals", live: 920, emoji: "✦", tag: null, bg: "linear-gradient(135deg, #1a1a3a, #0a0a1f)" },
    { id: "slots",     name: "Diamond Drop", provider: "ant1gravity originals", live: 1432, emoji: "◆", tag: null, bg: "linear-gradient(135deg, #1a3a3a, #0a1f1f)" },
    { id: "slots",     name: "Pyramid Rush", provider: "ant1gravity originals", live: 832, emoji: "▲", tag: "hot", bg: "linear-gradient(135deg, #3a2a1a, #1f1408)" },
  ];

  return (
    <div className="main">
      {/* hero */}
      <div className="hero">
        <div className="hero__content">
          <div className="hero__eyebrow">
            <span style={{ width: 6, height: 6, borderRadius: 999, background: "var(--accent-2)", boxShadow: "0 0 8px var(--accent-2)" }}/>
            Bono de bienvenida activo
          </div>
          <h1 className="hero__title">
            Apuesta sin <span className="acc">gravedad</span>.
          </h1>
          <p className="hero__sub">
            5 juegos originales, animaciones fluidas, RTP transparente.
            Tu primer depósito se multiplica x3 hasta 50,000 fichas.
          </p>
          <div className="hero__actions">
            <button className="btn btn--xl" style={{ background: "var(--accent)", color: "#fff", borderColor: "transparent" }}
                    onClick={() => onNavigate("slots")}>
              Jugar ahora
            </button>
            <button className="btn btn--xl" style={{ background: "transparent", borderColor: "var(--line-2)" }}>
              Ver torneos
            </button>
          </div>
        </div>
        <div className="hero__chips">
          <div className="chip-big">100</div>
          <div className="chip-big">500</div>
          <div className="chip-big">1K</div>
        </div>
        <div className="hero__art"/>
      </div>

      {/* stat strip */}
      <div className="stat-strip">
        <div className="stat-strip__cell">
          <span className="stat-strip__label">Jugadores online</span>
          <span className="stat-strip__val">14,082</span>
          <span className="stat-strip__delta">+8.2% hoy</span>
        </div>
        <div className="stat-strip__cell">
          <span className="stat-strip__label">Pago total 24h</span>
          <span className="stat-strip__val">2.4M</span>
          <span className="stat-strip__delta">+12.4%</span>
        </div>
        <div className="stat-strip__cell">
          <span className="stat-strip__label">RTP promedio</span>
          <span className="stat-strip__val">96.8%</span>
          <span className="stat-strip__delta">verificado</span>
        </div>
        <div className="stat-strip__cell">
          <span className="stat-strip__label">Big win más alto</span>
          <span className="stat-strip__val" style={{ color: "var(--accent-2)" }}>184,200</span>
          <span className="stat-strip__delta">hace 12 min</span>
        </div>
      </div>

      {/* games — originales */}
      <div className="section-head">
        <h2>Originales <span className="acc">ant1gravity</span></h2>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="btn" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>Todos</button>
          <button className="btn btn--ghost" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>Más jugados</button>
          <button className="btn btn--ghost" style={{ height: 32, padding: "0 12px", fontSize: 12 }}>Nuevos</button>
        </div>
      </div>

      <div className="gcards">
        {games.map((g, i) => (
          <GameCard key={i} game={g} onClick={() => onNavigate(g.id)}/>
        ))}
      </div>

      {/* live wins ticker */}
      <div className="section-head">
        <h2>Ganadores recientes</h2>
        <span className="tag tag--live">LIVE</span>
      </div>
      <LiveWinsTicker />
    </div>
  );
};

const GameCard = ({ game, onClick }) => (
  <div className="gcard" onClick={onClick}>
    <div className="gcard__bg" style={{ background: game.bg }}/>
    {game.live && (
      <div className="gcard__live-count">{game.live.toLocaleString()}</div>
    )}
    {game.tag === "hot" && <span className="tag tag--accent gcard__tag">HOT</span>}
    {game.tag === "new" && <span className="tag tag--green gcard__tag">NEW</span>}
    {game.tag === "live" && <span className="tag gcard__tag" style={{ color: "var(--accent-2)" }}>● LIVE</span>}
    <div className="gcard__art">{game.emoji}</div>
    <div className="gcard__label">
      <span className="gcard__name">{game.name}</span>
      <span className="gcard__provider">{game.provider}</span>
    </div>
  </div>
);

const LiveWinsTicker = () => {
  const wins = [
    { user: "neoplayer_2024", game: "Anti-Gravity Slots", bet: 200, win: 24800, mult: "124x" },
    { user: "x_kira_99",      game: "Plinko Zero-G",     bet: 1000, win: 18400, mult: "18.4x" },
    { user: "mr_pixel",       game: "Ruleta Europea",    bet: 500, win: 17500, mult: "35x" },
    { user: "lunarsh",        game: "Blackjack Pro",     bet: 2400, win: 4800, mult: "2x" },
    { user: "vortex_22",      game: "Neon Reels",        bet: 100, win: 12000, mult: "120x" },
    { user: "anonymous",      game: "Anti-Gravity Slots", bet: 300, win: 9200, mult: "30.6x" },
  ];
  return (
    <div className="card" style={{ overflow: "hidden" }}>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--surface-2)" }}>
            {["Jugador", "Juego", "Apuesta", "Multi", "Ganancia"].map((h, i) => (
              <th key={i} style={{
                padding: "10px 14px",
                font: "600 10px/1 var(--f-display)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--text-4)",
                textAlign: i >= 2 ? "right" : "left"
              }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {wins.map((w, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--line)" }}>
              <td style={{ padding: "12px 14px", fontWeight: 600, fontSize: 13 }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 22, height: 22, borderRadius: 999, background: "var(--surface-3)", display: "grid", placeItems: "center", fontSize: 10, color: "var(--text-3)" }}>
                    {w.user[0].toUpperCase()}
                  </span>
                  {w.user}
                </span>
              </td>
              <td style={{ padding: "12px 14px", color: "var(--text-2)", fontSize: 13 }}>{w.game}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--f-mono)", color: "var(--text-3)" }}>{w.bet.toLocaleString()}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--accent)" }}>{w.mult}</td>
              <td style={{ padding: "12px 14px", textAlign: "right", fontFamily: "var(--f-mono)", fontWeight: 700, color: "var(--accent-2)" }}>+{w.win.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

Object.assign(window, { LobbyPage });
