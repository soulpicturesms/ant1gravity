// Poker page — Texas Hold'em table + hand history
const PK_SUITS = ["♠", "♥", "♦", "♣"];
const PK_RANKS = ["A","K","Q","J","10","9","8","7","6","5","4","3","2"];
const pkCard = () => ({
  rank: PK_RANKS[Math.floor(Math.random()*PK_RANKS.length)],
  suit: PK_SUITS[Math.floor(Math.random()*4)],
});

const SEATS = [
  { i: 0, pos: { left: "50%",  top: "-6%",   tx: "-50%", ty: "0" } },
  { i: 1, pos: { left: "85%",  top: "12%",   tx: "-50%", ty: "0" } },
  { i: 2, pos: { left: "92%",  top: "60%",   tx: "-50%", ty: "0" } },
  { i: 3, pos: { left: "50%",  top: "82%",   tx: "-50%", ty: "0" } },
  { i: 4, pos: { left: "8%",   top: "60%",   tx: "-50%", ty: "0" } },
  { i: 5, pos: { left: "15%",  top: "12%",   tx: "-50%", ty: "0" } },
];

const PLAYERS = [
  { name: "n3xus_oo", stack: 14820, action: null, cards: [pkCard(), pkCard()], folded: false },
  { name: "kira_99",  stack: 8410,  action: "raise 200", cards: [pkCard(), pkCard()], folded: false },
  { name: "mr_pixel", stack: 21300, action: "call",   cards: [pkCard(), pkCard()], folded: false },
  { name: "tú",       stack: 12500, action: null,     cards: [{rank: "A", suit: "♠"}, {rank: "K", suit: "♠"}], folded: false, isYou: true },
  { name: "lunarsh",  stack: 6280,  action: "fold",   cards: [pkCard(), pkCard()], folded: true },
  { name: "vortex_22",stack: 18900, action: null,     cards: [pkCard(), pkCard()], folded: false },
];

const PokerPage = ({ triggerParticles, mode }) => {
  const [bet, setBet] = React.useState(200);
  const [activeSeat, setActiveSeat] = React.useState(3);
  const [phase, setPhase] = React.useState("flop"); // pre, flop, turn, river
  const [pot, setPot] = React.useState(1840);

  const community = [
    { rank: "Q", suit: "♠" },
    { rank: "K", suit: "♥" },
    { rank: "10",suit: "♠" },
    { rank: "5", suit: "♦" },
    { rank: "?", suit: "?", placeholder: true },
  ];

  const handHistory = [
    { id: "#A4892", win: 2240, mine: true,  hand: "Color de picas", final: 4480, ts: "hace 1 min" },
    { id: "#A4891", win: 0,    mine: false, hand: "Fold pre-flop", final: 200, ts: "hace 3 min" },
    { id: "#A4890", win: -800, mine: true,  hand: "Par de jacks", final: 1600, ts: "hace 5 min" },
    { id: "#A4889", win: 320,  mine: true,  hand: "Dos pares",    final: 640, ts: "hace 9 min" },
    { id: "#A4888", win: 0,    mine: false, hand: "Fold turn",    final: 1200,ts: "hace 12 min" },
    { id: "#A4887", win: 1820, mine: true,  hand: "Trío de reyes",final: 3640,ts: "hace 18 min" },
  ];

  const onAction = (act) => {
    if (act === "raise") triggerParticles?.();
  };

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <div className="page-head__crumbs">Juegos / <span>Texas Hold'em</span></div>
          <h1>Texas <span style={{ color: "var(--accent)" }}>Hold'em</span></h1>
          <div className="page-head__sub">No Limit · Blinds 50/100 · 6 seat · Min stack 5,000</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag--live">412 mesas</span>
          <span className="tag tag--accent">tu turno</span>
        </div>
      </div>

      <div className="gameview">
        <BetPanel
          bet={bet} setBet={setBet}
          mode={mode}
          mult={2}
          extra={
            <div className="field">
              <div className="field__label"><span>Acción</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <button className="btn btn--lg" onClick={() => onAction("fold")}>Fold</button>
                <button className="btn btn--lg" onClick={() => onAction("call")}>Call · 200</button>
                <button className="btn btn--lg btn--primary" style={{ gridColumn: "1 / 3" }} onClick={() => onAction("raise")}>
                  Raise · {bet}
                </button>
                <button className="btn" onClick={() => setBet(b => Math.max(100, b - 100))}>− 100</button>
                <button className="btn" onClick={() => setBet(b => b + 100)}>+ 100</button>
                <button className="btn" style={{ gridColumn: "1 / 3" }} onClick={() => setBet(12500)}>All-in · 12,500</button>
              </div>
            </div>
          }
        />

        <div className="stage">
          <div className="stage__header">
            <div className="stage__title-row">
              <span className="stage__title">Mesa #PK-218 · NL Hold'em</span>
              <span className="tag tag--green">{mode === "sweepstake" ? "Sweepstake" : "Casino"}</span>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--text-3)" }}>
              <span>Blinds 50/100</span>
              <span>Fase: <span style={{ color: "var(--text-2)", textTransform: "uppercase", letterSpacing: "0.1em" }}>{phase}</span></span>
              <span>Tiempo: 0:18</span>
            </div>
          </div>

          <div className="poker-table">
            <div className="poker-pot">
              <Chip size="sm"/>
              <span>{pot.toLocaleString()}</span>
            </div>

            <div className="poker-community">
              {community.map((c, i) => (
                c.placeholder
                  ? <div key={i} style={{ width: 50, height: 70, border: "2px dashed rgba(255,255,255,0.18)", borderRadius: 6 }}/>
                  : <PlayingCard key={i} {...c} style={{ width: 50, height: 70, padding: 4 }}/>
              ))}
            </div>

            {SEATS.map((seat, i) => {
              const p = PLAYERS[i];
              if (!p) return null;
              return (
                <div key={i} className={`poker-seat ${activeSeat === i ? "poker-seat--active" : ""} ${p.folded ? "poker-seat--folded" : ""}`}
                  style={{ left: seat.pos.left, top: seat.pos.top, transform: `translate(${seat.pos.tx}, ${seat.pos.ty})` }}
                >
                  <div className="poker-seat__inner">
                    <div className="poker-seat__avatar">{p.name[0].toUpperCase()}</div>
                    <div className="poker-seat__cards">
                      {p.cards.map((c, j) => (
                        <PlayingCard key={j} {...c} faceDown={!p.isYou && !p.folded}/>
                      ))}
                    </div>
                    <div className="poker-seat__name">{p.name}{p.isYou && <span style={{ color: "var(--accent)" }}> (tú)</span>}</div>
                    <div className="poker-seat__stack">{p.stack.toLocaleString()}</div>
                    {p.action && (
                      <div className="poker-seat__action" style={{
                        background: p.action === "fold" ? "var(--surface-3)" : "var(--accent)",
                        color: p.action === "fold" ? "var(--text-3)" : "#fff",
                      }}>{p.action}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* hand history */}
          <div className="poker-hand-history">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: "1px solid var(--line)" }}>
              <span style={{ font: "700 12px/1 var(--f-display)", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-3)" }}>Historial reciente</span>
              <button className="btn btn--ghost" style={{ height: 28, fontSize: 11 }}>Ver todo</button>
            </div>
            {handHistory.map((h, i) => (
              <div key={i} className="poker-hand-row">
                <span className="poker-hand-row__id">{h.id}</span>
                <span style={{ color: "var(--text-2)" }}>
                  {h.hand}
                  <span style={{ color: "var(--text-4)", marginLeft: 10, fontSize: 11 }}>· {h.ts}</span>
                </span>
                <span style={{ textAlign: "right", fontFamily: "var(--f-mono)", fontSize: 12, color: "var(--text-3)" }}>{h.final.toLocaleString()}</span>
                <span className={`poker-hand-row__win ${h.win < 0 ? "poker-hand-row__loss" : ""}`}>
                  {h.win === 0 ? "—" : h.win > 0 ? `+${h.win}` : h.win}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

Object.assign(window, { PokerPage });
