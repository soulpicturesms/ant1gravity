// Roulette page
const ROUL_NUMBERS = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5,
  24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
]; // European wheel order
const ROUL_RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
const colorOf = (n) => n === 0 ? "green" : ROUL_RED.has(n) ? "red" : "black";

const RoulettePage = ({ triggerParticles, mode }) => {
  const [bet, setBet] = React.useState(100);
  const [rotation, setRotation] = React.useState(0);
  const [ballAngle, setBallAngle] = React.useState(0);
  const [spinning, setSpinning] = React.useState(false);
  const [result, setResult] = React.useState(null);
  const [history, setHistory] = React.useState([14, 0, 22, 7, 31, 18, 5, 11, 26, 3, 17, 32]);
  const [selectedBets, setSelectedBets] = React.useState({}); // { cellKey: chipCount }

  const totalBet = Object.values(selectedBets).reduce((s, v) => s + v * 100, 0);

  const placeBet = (key) => {
    if (spinning) return;
    setSelectedBets(s => ({ ...s, [key]: (s[key] || 0) + 1 }));
  };

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);
    const winningIdx = Math.floor(Math.random() * 37);
    const winningNum = ROUL_NUMBERS[winningIdx];
    const segAngle = 360 / 37;
    // wheel spins clockwise multiple turns + lands so winningIdx is at top
    const targetWheelRot = 360 * 6 + (360 - winningIdx * segAngle);
    const targetBallRot = -(360 * 9);
    setRotation(targetWheelRot);
    setBallAngle(targetBallRot);
    setTimeout(() => {
      setSpinning(false);
      setResult(winningNum);
      setHistory(h => [winningNum, ...h].slice(0, 14));
      if (totalBet > 0) triggerParticles?.();
    }, 5100);
  };

  const clearBets = () => setSelectedBets({});

  // build board cells: 0, then 36 numbers in 3x12 grid (3 rows of 12 cols)
  const cells = [];
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 12; col++) {
      const n = col * 3 + (3 - row);
      cells.push({ n, col, row });
    }
  }

  return (
    <div className="main">
      <div className="page-head">
        <div>
          <div className="page-head__crumbs">Juegos / <span>Ruleta Europea</span></div>
          <h1>Ruleta <span style={{ color: "var(--accent)" }}>Europea</span></h1>
          <div className="page-head__sub">Single zero · RTP 97.30% · Min 10, Max 100,000 por apuesta</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <span className="tag tag--live">1,186 jugando</span>
          <span className="tag">RTP 97.30%</span>
        </div>
      </div>

      <div className="gameview">
        <BetPanel
          bet={bet} setBet={setBet}
          onPrimary={spin}
          primaryLabel={`Girar ruleta · ${totalBet || bet}`}
          disabled={spinning}
          mode={mode}
          mult={2}
          extra={
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-3)" }}>Apuestas en mesa</span>
                <span style={{ fontFamily: "var(--f-mono)", fontWeight: 700 }}>{Object.keys(selectedBets).length}</span>
              </div>
              <button className="btn" onClick={clearBets} disabled={spinning} style={{ width: "100%" }}>Limpiar mesa</button>
            </div>
          }
        />

        <div className="stage">
          <div className="stage__header">
            <div className="stage__title-row">
              <span className="stage__title">Mesa #2104</span>
              <span className="tag tag--green">{mode === "sweepstake" ? "Sweepstake" : "Casino"}</span>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {history.slice(0, 10).map((n, i) => (
                <span key={i} className={`roul-history__cell roul-history__cell--${colorOf(n)}`}>{n}</span>
              ))}
            </div>
          </div>

          <div className="roul">
            <div className="roul-wheel-wrap">
              <div className="roul-pointer"/>
              <div className="roul-wheel" style={{ transform: `rotate(${rotation}deg)` }}>
                <RouletteWheelSVG />
                <div className="roul-wheel__center">ant1gravity</div>
              </div>
              <div className="roul-ball" style={{
                transform: `translateX(-50%) rotate(${ballAngle}deg) translateY(0)`,
                transformOrigin: "center 168px",
              }}/>
            </div>

            {result !== null && !spinning && (
              <div style={{
                padding: "8px 18px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.6)",
                border: `2px solid ${colorOf(result) === "red" ? "#c53d3d" : colorOf(result) === "black" ? "#fff" : "#1f7a4d"}`,
                font: "700 18px/1 var(--f-mono)",
                animation: "bannerPop .5s",
              }}>
                Salió <span style={{ color: colorOf(result) === "red" ? "#ff6b6b" : colorOf(result) === "green" ? "#6fff7d" : "#fff" }}>
                  {result} · {colorOf(result).toUpperCase()}
                </span>
              </div>
            )}

            <div className="roul-board" style={{ marginTop: 12 }}>
              {/* zero */}
              <div className={`roul-cell roul-cell--green roul-cell--zero ${result === 0 && !spinning ? "roul-cell--highlight" : ""}`}
                   onClick={() => placeBet("0")}>
                0
                {selectedBets["0"] && <span className="roul-cell__chip"><Chip size="sm" value={selectedBets["0"]}/></span>}
              </div>
              {cells.map(({ n, col, row }) => (
                <div key={n}
                  className={`roul-cell roul-cell--${colorOf(n)} ${result === n && !spinning ? "roul-cell--highlight" : ""}`}
                  style={{ gridColumn: col + 2, gridRow: row + 1 }}
                  onClick={() => placeBet(String(n))}
                >
                  {n}
                  {selectedBets[String(n)] && <span className="roul-cell__chip"><Chip size="sm" value={selectedBets[String(n)]}/></span>}
                </div>
              ))}
              {/* column 2:1 */}
              <div className="roul-cell roul-cell--outside roul-cell--col" style={{ gridRow: 1 }} onClick={() => placeBet("col-top")}>2:1</div>
              <div className="roul-cell roul-cell--outside roul-cell--col" style={{ gridRow: 2 }} onClick={() => placeBet("col-mid")}>2:1</div>
              <div className="roul-cell roul-cell--outside roul-cell--col" style={{ gridRow: 3 }} onClick={() => placeBet("col-bot")}>2:1</div>
            </div>

            {/* outside bets */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 4, width: "100%", maxWidth: 720, marginTop: 4 }}>
              {[
                { k: "1-18", l: "1-18" },
                { k: "even", l: "PAR" },
                { k: "red", l: "ROJO", color: "red" },
                { k: "black", l: "NEGRO", color: "black" },
                { k: "odd", l: "IMPAR" },
                { k: "19-36", l: "19-36" },
              ].map(b => (
                <div key={b.k}
                  className={`roul-cell ${b.color ? "roul-cell--" + b.color : "roul-cell--outside"}`}
                  onClick={() => placeBet(b.k)}
                  style={{ fontSize: 11 }}
                >
                  {b.l}
                  {selectedBets[b.k] && <span className="roul-cell__chip"><Chip size="sm" value={selectedBets[b.k]}/></span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const RouletteWheelSVG = () => {
  const r = 170;
  const cx = r, cy = r;
  return (
    <svg viewBox={`0 0 ${r*2} ${r*2}`} style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <radialGradient id="wood" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#3a2418"/>
          <stop offset="0.85" stopColor="#1a0e08"/>
          <stop offset="1" stopColor="#0a0604"/>
        </radialGradient>
      </defs>
      <circle cx={cx} cy={cy} r={r} fill="url(#wood)"/>
      {ROUL_NUMBERS.map((n, i) => {
        const a1 = (i / 37) * Math.PI * 2 - Math.PI/2;
        const a2 = ((i + 1) / 37) * Math.PI * 2 - Math.PI/2;
        const ri = r * 0.55;
        const ro = r * 0.92;
        const x1 = cx + Math.cos(a1) * ri, y1 = cy + Math.sin(a1) * ri;
        const x2 = cx + Math.cos(a1) * ro, y2 = cy + Math.sin(a1) * ro;
        const x3 = cx + Math.cos(a2) * ro, y3 = cy + Math.sin(a2) * ro;
        const x4 = cx + Math.cos(a2) * ri, y4 = cy + Math.sin(a2) * ri;
        const fill = colorOf(n) === "red" ? "#c53d3d" : colorOf(n) === "black" ? "#0e0e16" : "#1f7a4d";
        const aMid = (a1 + a2) / 2;
        const tr = r * 0.74;
        const tx = cx + Math.cos(aMid) * tr;
        const ty = cy + Math.sin(aMid) * tr;
        return (
          <g key={i}>
            <path d={`M${x1},${y1} L${x2},${y2} A${ro},${ro} 0 0 1 ${x3},${y3} L${x4},${y4} A${ri},${ri} 0 0 0 ${x1},${y1} Z`}
                  fill={fill} stroke="#000" strokeWidth="0.6"/>
            <text x={tx} y={ty} fill="#fff"
                  fontSize="11" fontWeight="700"
                  textAnchor="middle" dominantBaseline="middle"
                  transform={`rotate(${(aMid * 180 / Math.PI) + 90}, ${tx}, ${ty})`}
                  style={{ fontFamily: "var(--f-mono)" }}
            >{n}</text>
          </g>
        );
      })}
      {/* center decorative */}
      <circle cx={cx} cy={cy} r={r*0.4} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1"/>
    </svg>
  );
};

Object.assign(window, { RoulettePage });
