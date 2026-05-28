// Slots page
const SLOT_SYMBOLS = ["💎","⭐","♠","♣","♥","♦","▲","◆","✦"];
const SLOT_SYMBOLS_COLORS = {
  "💎": "#4dc6ff", "⭐": "#ffce4d", "♠": "#ecedf4",
  "♣": "#6fff7d", "♥": "#ff4d6b", "♦": "#ff2d7a",
  "▲": "#7d5fff", "◆": "#4dffd9", "✦": "#ff8a4d",
};

const SlotsPage = ({ triggerParticles, mode }) => {
  const [bet, setBet] = React.useState(100);
  const [spinning, setSpinning] = React.useState(false);
  const [reels, setReels] = React.useState([
    ["💎","⭐","♠"],
    ["♣","♥","♦"],
    ["▲","◆","✦"],
    ["💎","♦","▲"],
    ["⭐","♥","◆"],
  ]);
  const [reelOffsets, setReelOffsets] = React.useState([0,0,0,0,0]);
  const [winRow, setWinRow] = React.useState(null); // 0,1,2 or null
  const [winAmount, setWinAmount] = React.useState(null);
  const [lastWins, setLastWins] = React.useState([0, 240, 0, 1800, 0, 0, 480, 0]);

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setWinRow(null);
    setWinAmount(null);

    // generate new reels & offsets
    const newReels = Array.from({ length: 5 }, () =>
      Array.from({ length: 3 }, () => SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)])
    );
    // each reel scrolls by a different amount of "fake symbols"
    const offsets = [40, 50, 60, 70, 80].map(n => n * 90); // px

    setReelOffsets(offsets);

    setTimeout(() => {
      setReels(newReels);
      setReelOffsets([0,0,0,0,0]);

      // check middle row for win — if 3+ same symbols starting from left
      const mid = newReels.map(r => r[1]);
      let count = 1;
      for (let i = 1; i < 5; i++) {
        if (mid[i] === mid[0]) count++;
        else break;
      }
      if (count >= 3) {
        const mult = count === 5 ? 50 : count === 4 ? 12 : 3;
        const amt = bet * mult;
        setWinRow(1);
        setWinAmount(amt);
        setLastWins(w => [amt, ...w].slice(0, 8));
        triggerParticles?.();
      } else {
        setLastWins(w => [0, ...w].slice(0, 8));
      }
      setSpinning(false);
    }, 1600);
  };

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <div className="page-head__crumbs">Juegos / <span>Anti-Gravity Slots</span></div>
          <h1>Anti-Gravity <span style={{ color: "var(--accent)" }}>Slots</span></h1>
          <div className="page-head__sub">5×3 reels · 1 payline · Max 5,000× · RTP 96.6%</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag--live">8,240 girando</span>
          <span className="tag">Max 5,000×</span>
        </div>
      </div>

      <div className="gameview">
        <BetPanel
          bet={bet} setBet={setBet}
          onPrimary={spin}
          primaryLabel={spinning ? "Girando..." : "Girar"}
          disabled={spinning}
          mode={mode}
          mult={50}
        />

        <div className="stage">
          <div className="stage__header">
            <div className="stage__title-row">
              <span className="stage__title">Anti-Gravity Slots</span>
              <span className="tag tag--green">{mode === "sweepstake" ? "Sweepstake" : "Casino"}</span>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--text-3)" }}>
              <span>Volatilidad: alta</span>
              <span>Hit rate: 26.2%</span>
            </div>
          </div>

          <div className="slots">
            <div className="slots-machine">
              {reels.map((reel, ri) => (
                <Reel key={ri} symbols={reel} offset={reelOffsets[ri]} winRow={winRow} delay={ri * 0.15}/>
              ))}
            </div>

            <div className="slots-stat-bar">
              <div className="slots-stat-bar__win">
                <span>Apuesta total</span>
                <span style={{ fontFamily: "var(--f-mono)" }}>{bet}</span>
              </div>
              <div className="slots-stat-bar__win">
                <span>Línea de pago</span>
                <span style={{ fontFamily: "var(--f-mono)" }}>1 · centro</span>
              </div>
              <div className={`slots-stat-bar__win ${winAmount ? "slots-stat-bar__win--win" : ""}`}>
                <span>Última ganancia</span>
                <span style={{ fontFamily: "var(--f-mono)" }}>{winAmount ? `+${winAmount.toLocaleString()}` : "—"}</span>
              </div>
            </div>

            {/* recent spins strip */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 11, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 10 }}>Últimos giros</span>
              {lastWins.map((w, i) => (
                <span key={i} style={{
                  height: 24,
                  padding: "0 8px",
                  borderRadius: 6,
                  display: "grid", placeItems: "center",
                  font: "700 10px/1 var(--f-mono)",
                  background: w > 0 ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                  color: w > 0 ? "var(--accent)" : "var(--text-4)",
                }}>{w > 0 ? `+${w}` : "—"}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Reel = ({ symbols, offset, winRow, delay }) => {
  // Build a long strip: 30 random symbols + the 3 final symbols at end
  const filler = React.useMemo(() => {
    return Array.from({ length: 30 }, () => SLOT_SYMBOLS[Math.floor(Math.random()*SLOT_SYMBOLS.length)]);
  }, [offset]); // regenerate filler each spin

  const strip = offset > 0 ? [...filler, ...symbols] : symbols;
  const finalOffset = offset > 0 ? -(filler.length) * 90 : 0;

  return (
    <div className="slots-reel">
      <div className="slots-payline"/>
      <div className="slots-reel__strip" style={{
        transform: `translateY(${finalOffset}px)`,
        transition: offset > 0 ? `transform 1.5s cubic-bezier(0.35, 0, 0.25, 1) ${delay}s` : "none",
      }}>
        {strip.map((s, i) => {
          const isFinal = i >= filler.length;
          const isMiddleFinal = isFinal && (i - filler.length) === 1;
          return (
            <div key={i} className={`slots-reel__symbol ${winRow === 1 && isMiddleFinal ? "slots-reel__symbol--win" : ""}`}
                 style={{ color: SLOT_SYMBOLS_COLORS[s] || "#fff" }}>
              {s}
            </div>
          );
        })}
      </div>
    </div>
  );
};

Object.assign(window, { SlotsPage });
