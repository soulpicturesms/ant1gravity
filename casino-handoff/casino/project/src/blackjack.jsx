// Blackjack page
const BJ_SUITS = ["♠", "♥", "♦", "♣"];
const BJ_RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const bjValue = (r) => r === "A" ? 11 : (["J","Q","K"].includes(r) ? 10 : Number(r));
const handTotal = (cards) => {
  let total = cards.reduce((s, c) => s + bjValue(c.rank), 0);
  let aces = cards.filter(c => c.rank === "A").length;
  while (total > 21 && aces > 0) { total -= 10; aces--; }
  return total;
};

const randomCard = () => ({
  rank: BJ_RANKS[Math.floor(Math.random()*13)],
  suit: BJ_SUITS[Math.floor(Math.random()*4)],
});

const BlackjackPage = ({ triggerParticles, mode }) => {
  const [bet, setBet] = React.useState(100);
  const [phase, setPhase] = React.useState("idle"); // idle | playing | dealer | result
  const [player, setPlayer] = React.useState([]);
  const [dealer, setDealer] = React.useState([]);
  const [hideDealer, setHideDealer] = React.useState(true);
  const [result, setResult] = React.useState(null);

  const deal = () => {
    const p = [randomCard(), randomCard()];
    const d = [randomCard(), randomCard()];
    setPlayer(p); setDealer(d); setHideDealer(true); setResult(null); setPhase("playing");
  };

  const hit = () => {
    const next = [...player, randomCard()];
    setPlayer(next);
    if (handTotal(next) > 21) {
      setHideDealer(false);
      setResult("loss");
      setPhase("result");
    }
  };

  const stand = () => {
    setPhase("dealer");
    setHideDealer(false);
    let d = [...dealer];
    const step = () => {
      if (handTotal(d) < 17) {
        d = [...d, randomCard()];
        setDealer([...d]);
        setTimeout(step, 600);
      } else {
        const p = handTotal(player);
        const dT = handTotal(d);
        let r;
        if (dT > 21 || p > dT) r = "win";
        else if (p === dT) r = "push";
        else r = "loss";
        setResult(r);
        setPhase("result");
        if (r === "win") triggerParticles?.();
      }
    };
    setTimeout(step, 700);
  };

  const reset = () => { setPhase("idle"); setPlayer([]); setDealer([]); setResult(null); };

  const pTotal = handTotal(player);
  const dTotal = hideDealer && dealer.length ? bjValue(dealer[0].rank) : handTotal(dealer);

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <div className="page-head__crumbs">Juegos / <span>Blackjack Pro</span></div>
          <h1>Blackjack <span style={{ color: "var(--accent)" }}>Pro</span></h1>
          <div className="page-head__sub">RTP 99.41% · Provably fair · Hasta 1:1.5 en blackjack natural</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag--live">2,412 en mesa</span>
          <span className="tag">RTP 99.41%</span>
        </div>
      </div>

      <div className="gameview">
        <BetPanel
          bet={bet} setBet={setBet}
          onPrimary={phase === "idle" ? deal : null}
          primaryLabel="Repartir"
          disabled={phase === "playing" || phase === "dealer"}
          mode={mode}
          extra={
            phase === "playing" && (
              <div className="bet-actions" style={{ gridTemplateColumns: "1fr 1fr 1fr 1fr" }}>
                <button className="btn btn--lg btn--primary" style={{ gridColumn: "1 / 3" }} onClick={hit}>Pedir</button>
                <button className="btn btn--lg" style={{ gridColumn: "3 / 5" }} onClick={stand}>Plantar</button>
                <button className="btn" style={{ gridColumn: "1 / 3" }} disabled>Doblar</button>
                <button className="btn" style={{ gridColumn: "3 / 5" }} disabled>Dividir</button>
              </div>
            )
          }
          afterPrimary={
            phase === "result" && (
              <button className="btn btn--xl btn--primary" onClick={reset}>Nueva mano</button>
            )
          }
        />
        <div className="stage">
          <div className="stage__header">
            <div className="stage__title-row">
              <span className="stage__title">Mesa #4218</span>
              <span className="tag tag--green">{mode === "sweepstake" ? "Sweepstake" : "Casino"}</span>
            </div>
            <div style={{ display: "flex", gap: 18, fontSize: 11, color: "var(--text-3)" }}>
              <span>Mazos: 6</span>
              <span>Penetración: 75%</span>
              <span>Min: 10 · Max: 50,000</span>
            </div>
          </div>

          <div className="bj">
            {/* dealer */}
            <div className="bj__hand">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="bj__hand-label">Crupier</span>
                {dealer.length > 0 && <span className="bj__score">{dTotal}{hideDealer ? "+" : ""}</span>}
              </div>
              <div className="bj__cards">
                {dealer.length === 0
                  ? <div style={{ width: 90, height: 124, border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 8 }}/>
                  : dealer.map((c, i) => (
                      <PlayingCard key={i} {...c} faceDown={hideDealer && i === 1}/>
                    ))
                }
              </div>
            </div>

            {/* player */}
            <div className="bj__hand">
              <div className="bj__cards">
                {player.length === 0
                  ? <div style={{ width: 90, height: 124, border: "2px dashed rgba(255,255,255,0.08)", borderRadius: 8 }}/>
                  : player.map((c, i) => <PlayingCard key={i} {...c}/>)}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="bj__hand-label">Tú</span>
                {player.length > 0 && (
                  <span className="bj__score" style={{
                    color: pTotal > 21 ? "var(--loss)" : pTotal === 21 ? "var(--accent-2)" : undefined,
                  }}>{pTotal}{pTotal > 21 ? " · BUST" : pTotal === 21 ? " · 21" : ""}</span>
                )}
              </div>
            </div>

            {/* bet chip on table */}
            {phase !== "idle" && (
              <div style={{ position: "absolute", bottom: 30, left: "50%", transform: "translateX(-50%)", display: "flex", alignItems: "center", gap: 10, padding: "6px 14px", background: "rgba(0,0,0,0.6)", borderRadius: 999, border: "1px solid rgba(255,255,255,0.1)" }}>
                <Chip />
                <span style={{ font: "700 14px/1 var(--f-mono)" }}>{bet}</span>
              </div>
            )}

            {/* result banner */}
            {phase === "result" && (
              <div className="bj__result">
                <div className={`bj__result-banner bj__result--${result}`}>
                  {result === "win" ? `+${bet} GANASTE` : result === "loss" ? "PERDISTE" : "EMPATE"}
                </div>
              </div>
            )}
          </div>

          {/* recent rounds */}
          <div style={{ marginTop: 16, display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: 11, color: "var(--text-4)", textTransform: "uppercase", letterSpacing: "0.1em", marginRight: 10 }}>Tus últimas manos</span>
            {["W","L","W","W","P","L","W","W","W","L","W","P"].map((r, i) => (
              <span key={i} style={{
                width: 24, height: 24, borderRadius: 6, display: "grid", placeItems: "center",
                font: "700 10px/1 var(--f-mono)",
                background: r === "W" ? "var(--accent-2-soft)" : r === "L" ? "rgba(255,77,107,0.18)" : "rgba(255,206,77,0.18)",
                color: r === "W" ? "var(--accent-2)" : r === "L" ? "var(--loss)" : "var(--warn)",
              }}>{r}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// shared bet panel used across games
const BetPanel = ({ bet, setBet, onPrimary, primaryLabel, disabled, extra, afterPrimary, mode, mult = 2.0, showMult = false }) => {
  const tab = "manual";
  return (
    <aside className="bet-panel">
      <div className="bet-panel__tabs">
        <button className="bet-panel__tab bet-panel__tab--active">Manual</button>
        <button className="bet-panel__tab">Auto</button>
      </div>

      <div className="field">
        <div className="field__label">
          <span>Monto de apuesta</span>
          <span style={{ fontFamily: "var(--f-mono)", color: "var(--text-2)" }}>{bet.toLocaleString()}</span>
        </div>
        <div className="field__input">
          <Chip size="sm"/>
          <input type="number" value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||0))}/>
          <div className="field__step">
            <button onClick={() => setBet(b => Math.max(1, Math.floor(b/2)))}>½</button>
            <button onClick={() => setBet(b => b * 2)}>2×</button>
          </div>
        </div>
        <div className="amount-grid">
          {[10, 50, 100, 500, 1000, 5000, 10000, "MAX"].map((v, i) => (
            <button key={i} onClick={() => setBet(v === "MAX" ? 50000 : v)}>{v.toLocaleString ? v.toLocaleString() : v}</button>
          ))}
        </div>
      </div>

      {showMult && (
        <div className="field">
          <div className="field__label"><span>Multiplicador objetivo</span></div>
          <div className="field__input">
            <input value={mult.toFixed(2) + "×"} readOnly/>
          </div>
        </div>
      )}

      <div className="bet-stats">
        <div className="bet-stat">
          <span className="bet-stat__label">Ganancia potencial</span>
          <span className="bet-stat__val" style={{ color: "var(--accent-2)" }}>+{(bet * mult).toLocaleString()}</span>
        </div>
        <div className="bet-stat">
          <span className="bet-stat__label">Edge de la casa</span>
          <span className="bet-stat__val">0.59%</span>
        </div>
      </div>

      {extra}

      {onPrimary && (
        <button className="btn btn--xl btn--primary" onClick={onPrimary} disabled={disabled}
          style={{ width: "100%", justifyContent: "center" }}>
          {primaryLabel || "Apostar"}
        </button>
      )}
      {afterPrimary}

      <div style={{ paddingTop: var_pad_2(), borderTop: "1px dashed var(--line)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-4)" }}>
        <span>Provably fair</span>
        <span style={{ fontFamily: "var(--f-mono)" }}>seed: a3f9…</span>
      </div>
    </aside>
  );
};
function var_pad_2() { return "var(--pad-2)"; }

Object.assign(window, { BlackjackPage, BetPanel });
