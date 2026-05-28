// Plinko page — physics with falling ball
const PLINKO_ROWS = 12;
const PLINKO_W = 560;
const PLINKO_H = 460;
const PLINKO_BUCKETS = [110, 41, 10, 5, 3, 1.5, 0.5, 0.5, 1.5, 3, 5, 10, 41, 110];
const PLINKO_BUCKET_COLORS = (i, n) => {
  const center = (n - 1) / 2;
  const dist = Math.abs(i - center);
  const t = dist / center;
  // outer = pink/red, inner = dark
  if (t > 0.85) return "#ff2d7a";
  if (t > 0.65) return "#ff7d2d";
  if (t > 0.45) return "#ffce4d";
  if (t > 0.25) return "#6fff7d";
  return "#1a1a26";
};

const PlinkoPage = ({ triggerParticles, mode }) => {
  const [bet, setBet] = React.useState(100);
  const [risk, setRisk] = React.useState("medium");
  const [balls, setBalls] = React.useState([]); // active balls
  const [history, setHistory] = React.useState([2, 5, 1.5, 26, 3, 5, 1.5, 0.5, 9, 3]);
  const [winAnim, setWinAnim] = React.useState(null);

  // peg layout — 12 rows, row i has (i + 3) pegs
  const pegs = React.useMemo(() => {
    const ps = [];
    const yStep = 28;
    const yStart = 40;
    const xStep = 36;
    for (let r = 0; r < PLINKO_ROWS; r++) {
      const count = r + 3;
      const totalW = (count - 1) * xStep;
      const xStart = (PLINKO_W - totalW) / 2;
      for (let c = 0; c < count; c++) {
        ps.push({ x: xStart + c * xStep, y: yStart + r * yStep, r, c });
      }
    }
    return ps;
  }, []);

  const buckets = React.useMemo(() => {
    const n = PLINKO_BUCKETS.length;
    const xStep = 36;
    const totalW = (n - 1) * xStep;
    const xStart = (PLINKO_W - totalW) / 2;
    return PLINKO_BUCKETS.map((m, i) => ({
      x: xStart + i * xStep - xStep/2,
      y: PLINKO_H - 50,
      w: xStep,
      h: 32,
      mult: m,
      color: PLINKO_BUCKET_COLORS(i, n),
    }));
  }, []);

  const drop = () => {
    // simulate path: at each row, ball goes left or right (50/50)
    const path = [];
    let pos = 0;
    for (let r = 0; r < PLINKO_ROWS; r++) {
      const go = Math.random() < 0.5 ? -1 : 1;
      pos += go;
      path.push(pos);
    }
    // final bucket index — pos goes from -PLINKO_ROWS to +PLINKO_ROWS in steps of 2
    // map to bucket idx (0..n-1) where center maps to center bucket
    const bucketIdx = Math.max(0, Math.min(PLINKO_BUCKETS.length - 1,
      Math.round((path[path.length-1] + PLINKO_ROWS) / 2)
    ));
    const finalMult = PLINKO_BUCKETS[bucketIdx];

    const ball = {
      id: Date.now() + Math.random(),
      path,
      bucketIdx,
      finalMult,
      startTime: Date.now(),
    };

    setBalls(b => [...b, ball]);

    // remove ball after animation + record win
    setTimeout(() => {
      setBalls(b => b.filter(x => x.id !== ball.id));
      setHistory(h => [finalMult, ...h].slice(0, 12));
      const win = bet * finalMult;
      setWinAnim({ mult: finalMult, amount: win, id: ball.id });
      setTimeout(() => setWinAnim(null), 1800);
      if (finalMult >= 9) triggerParticles?.();
    }, PLINKO_ROWS * 180 + 400);
  };

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <div className="page-head__crumbs">Juegos / <span>Plinko Zero-G</span></div>
          <h1>Plinko <span style={{ color: "var(--accent)" }}>Zero-G</span></h1>
          <div className="page-head__sub">12 filas · Multiplicador hasta 110× · RTP 99%</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag--live">1,820 jugando</span>
          <span className="tag">RTP 99.0%</span>
        </div>
      </div>

      <div className="gameview">
        <BetPanel
          bet={bet} setBet={setBet}
          onPrimary={drop}
          primaryLabel="Soltar pelota"
          mode={mode}
          mult={110}
          extra={
            <div className="field">
              <div className="field__label"><span>Riesgo</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, background: "var(--bg-1)", borderRadius: 8, padding: 4 }}>
                {["low", "medium", "high"].map(r => (
                  <button key={r}
                    className={`bet-panel__tab ${risk === r ? "bet-panel__tab--active" : ""}`}
                    onClick={() => setRisk(r)}>
                    {r === "low" ? "Bajo" : r === "medium" ? "Medio" : "Alto"}
                  </button>
                ))}
              </div>
              <div className="field__label"><span>Filas</span></div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 4, background: "var(--bg-1)", borderRadius: 8, padding: 4 }}>
                {["8", "12", "16"].map(r => (
                  <button key={r}
                    className={`bet-panel__tab ${r === "12" ? "bet-panel__tab--active" : ""}`}>
                    {r}
                  </button>
                ))}
              </div>
            </div>
          }
        />

        <div className="stage">
          <div className="stage__header">
            <div className="stage__title-row">
              <span className="stage__title">Plinko Zero-G</span>
              <span className="tag tag--green">{mode === "sweepstake" ? "Sweepstake" : "Casino"}</span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {history.slice(0, 8).map((m, i) => (
                <span key={i} style={{
                  fontSize: 11, padding: "3px 8px", borderRadius: 6,
                  background: m >= 9 ? "var(--accent-soft)" : "rgba(255,255,255,0.04)",
                  color: m >= 9 ? "var(--accent)" : "var(--text-3)",
                  fontFamily: "var(--f-mono)", fontWeight: 600,
                }}>{m}×</span>
              ))}
            </div>
          </div>

          <div className="plinko-stage" style={{ position: "relative" }}>
            <svg className="plinko-svg" viewBox={`0 0 ${PLINKO_W} ${PLINKO_H}`}>
              {/* pegs */}
              {pegs.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} className="plinko-peg"/>
              ))}
              {/* buckets */}
              {buckets.map((b, i) => (
                <g key={i}>
                  <rect x={b.x} y={b.y} width={b.w - 2} height={b.h}
                        rx="4" ry="4"
                        fill={b.color}
                        fillOpacity={b.mult < 1 ? 0.3 : 1}
                        stroke="rgba(0,0,0,0.5)" strokeWidth="1"/>
                  <text x={b.x + b.w/2 - 1} y={b.y + b.h/2 + 4}
                        className="plinko-bucket-label"
                        style={{ fontSize: b.mult >= 100 ? 9 : 10 }}>
                    {b.mult}×
                  </text>
                </g>
              ))}
              {/* falling balls */}
              {balls.map(ball => (
                <PlinkoBall key={ball.id} ball={ball} pegs={pegs} buckets={buckets}/>
              ))}
            </svg>

            {winAnim && (
              <div style={{
                position: "absolute",
                top: "50%", left: "50%",
                transform: "translate(-50%, -50%)",
                padding: "12px 22px",
                borderRadius: 14,
                background: "rgba(0,0,0,0.85)",
                border: `2px solid ${winAnim.mult >= 9 ? "var(--accent)" : "var(--line-2)"}`,
                font: "800 24px/1 var(--f-display)",
                color: winAnim.mult >= 9 ? "var(--accent)" : "var(--text)",
                animation: "bannerPop 0.5s",
                pointerEvents: "none",
              }}>
                {winAnim.mult}× · +{winAnim.amount.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const PlinkoBall = ({ ball, pegs, buckets }) => {
  const [t, setT] = React.useState(0);
  React.useEffect(() => {
    const start = Date.now();
    const duration = PLINKO_ROWS * 180;
    const id = setInterval(() => {
      const e = (Date.now() - start) / duration;
      setT(Math.min(1, e));
      if (e >= 1) clearInterval(id);
    }, 16);
    return () => clearInterval(id);
  }, []);

  // compute current x/y from path
  const yStart = 20;
  const yEnd = PLINKO_H - 50;
  const rowH = (yEnd - yStart) / PLINKO_ROWS;
  const rowProgress = t * PLINKO_ROWS;
  const currentRow = Math.floor(rowProgress);
  const localT = rowProgress - currentRow;

  // x position: ball starts at center, drifts by path[r] * xStep/2 per row
  const xStep = 36;
  const startX = PLINKO_W / 2;
  let prevPos = currentRow === 0 ? 0 : ball.path[currentRow - 1];
  let nextPos = ball.path[currentRow] ?? ball.path[ball.path.length - 1];
  if (currentRow >= ball.path.length) { prevPos = nextPos = ball.path[ball.path.length - 1]; }

  // ease with slight bounce arc between pegs
  const ease = localT * localT * (3 - 2 * localT);
  const x = startX + (prevPos + (nextPos - prevPos) * ease) * (xStep / 2);
  const y = yStart + rowProgress * rowH;

  // mini horizontal bounce wobble
  const wobble = Math.sin(localT * Math.PI) * 2 * (nextPos > prevPos ? 1 : -1);

  return <circle cx={x + wobble} cy={y} r={6} className="plinko-ball"/>;
};

Object.assign(window, { PlinkoPage });
