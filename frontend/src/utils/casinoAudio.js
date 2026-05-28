class CasinoAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this._buffers = {};
    this._loading = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    if (!this._loading) {
      this._loading = true;
      this._preload();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  async _preload() {
    const files = {
      chipLay:      [1, 2, 3].map(i => `/sounds/chip-lay-${i}.ogg`),
      cardSlide:    [1, 2, 3, 4].map(i => `/sounds/card-slide-${i}.ogg`),
      chipsCollide: [1, 2, 3, 4].map(i => `/sounds/chips-collide-${i}.ogg`),
      dieThrow:     [1, 2, 3, 4].map(i => `/sounds/die-throw-${i}.ogg`),
      cardShuffle:  ['/sounds/card-shuffle.ogg'],
    };
    for (const [key, urls] of Object.entries(files)) {
      this._buffers[key] = [];
      for (const url of urls) {
        try {
          const res = await fetch(url);
          const ab = await res.arrayBuffer();
          const buf = await this.ctx.decodeAudioData(ab);
          this._buffers[key].push(buf);
        } catch (e) { /* file not ready yet — will use synth fallback */ }
      }
    }
  }

  // Play a preloaded buffer; returns false if not ready (caller can fallback)
  _play(key, vol = 0.7, pitch = 1.0) {
    const bufs = this._buffers[key];
    if (!bufs || !bufs.length) return false;
    try {
      const src = this.ctx.createBufferSource();
      src.buffer = bufs[Math.floor(Math.random() * bufs.length)];
      src.playbackRate.value = pitch;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(g);
      g.connect(this.ctx.destination);
      src.start();
      return true;
    } catch (e) { return false; }
  }

  // ── Noise buffer helper (synthesis fallback) ──────────────────────
  _noiseBuffer(duration) {
    const n = Math.floor(this.ctx.sampleRate * duration);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  // ── CHIP ─────────────────────────────────────────────────────────
  playChip() {
    if (this.muted) return;
    this.init();
    if (this._play('chipLay', 0.75)) return;
    // Synthesis fallback
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(600, now + 0.04);
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.07);
    } catch (e) {}
  }

  // ── CARD SLIDE ───────────────────────────────────────────────────
  playCardSlide() {
    if (this.muted) return;
    this.init();
    if (this._play('cardSlide', 0.7, 0.9 + Math.random() * 0.2)) return;
    // Synthesis fallback
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.15);
      const f = this.ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(1400, now);
      f.frequency.exponentialRampToValueAtTime(350, now + 0.15);
      f.Q.value = 1.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.07, now);
      g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      noise.connect(f); f.connect(g); g.connect(this.ctx.destination);
      noise.start(now); noise.stop(now + 0.16);
    } catch (e) {}
  }

  // ── ROULETTE TICK ────────────────────────────────────────────────
  playRouletteTick() {
    if (this.muted) return;
    this.init();
    // Pure synthesis: metallic ball-on-fret click. No chip buffers — they sound wrong.
    try {
      const ac    = this.ctx;
      const now   = ac.currentTime;
      const pitch = 0.8 + Math.random() * 0.4;

      // Noise transient — the sharp "clack" of the ball hitting a metal pocket divider
      const nLen  = Math.floor(ac.sampleRate * 0.03);
      const nBuf  = ac.createBuffer(1, nLen, ac.sampleRate);
      const nd    = nBuf.getChannelData(0);
      for (let i = 0; i < nLen; i++) nd[i] = (Math.random() * 2 - 1) * Math.exp(-i / (nLen * 0.07));
      const nSrc  = ac.createBufferSource();
      nSrc.buffer = nBuf;
      const hpf   = ac.createBiquadFilter();
      hpf.type    = 'highpass';
      hpf.frequency.value = 3500 * pitch;
      const nGain = ac.createGain();
      nGain.gain.setValueAtTime(0.18, now);
      nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.028);
      nSrc.connect(hpf); hpf.connect(nGain); nGain.connect(ac.destination);
      nSrc.start(now); nSrc.stop(now + 0.032);

      // Metallic ring — brief tone of the metal fret
      const osc   = ac.createOscillator();
      const oGain = ac.createGain();
      osc.type    = 'sine';
      osc.frequency.setValueAtTime(1600 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(800 * pitch, now + 0.04);
      oGain.gain.setValueAtTime(0.06, now);
      oGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);
      osc.connect(oGain); oGain.connect(ac.destination);
      osc.start(now); osc.stop(now + 0.05);
    } catch (e) {}
  }

  // ── ROULETTE ROLL (loop with speed control) ──────────────────────
  playRouletteRoll() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(2);
      noise.loop = true;

      const lowBP = this.ctx.createBiquadFilter();
      lowBP.type = 'bandpass'; lowBP.frequency.setValueAtTime(220, now); lowBP.Q.value = 1.8;
      const midBP = this.ctx.createBiquadFilter();
      midBP.type = 'bandpass'; midBP.frequency.setValueAtTime(800, now); midBP.Q.value = 1.2;
      const hiBP = this.ctx.createBiquadFilter();
      hiBP.type = 'bandpass'; hiBP.frequency.setValueAtTime(2200, now); hiBP.Q.value = 2.5;

      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.setValueAtTime(4.0, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);
      lfo.connect(lfoGain);
      lfoGain.connect(hiBP.frequency);
      lfoGain.connect(midBP.frequency);

      const lowG = this.ctx.createGain(); lowG.gain.setValueAtTime(0.018, now);
      const midG = this.ctx.createGain(); midG.gain.setValueAtTime(0.008, now);
      const hiG  = this.ctx.createGain(); hiG.gain.setValueAtTime(0.006, now);

      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0, now);
      master.gain.linearRampToValueAtTime(0.75, now + 0.3);

      noise.connect(lowBP); lowBP.connect(lowG); lowG.connect(master);
      noise.connect(midBP); midBP.connect(midG); midG.connect(master);
      noise.connect(hiBP);  hiBP.connect(hiG);   hiG.connect(master);
      master.connect(this.ctx.destination);

      lfo.start(now); noise.start(now);

      return {
        setSpeed: (pct) => {
          try {
            const t = this.ctx.currentTime;
            const sp = Math.max(0.01, pct);
            master.gain.setValueAtTime(0.75 * sp, t);
            lowBP.frequency.setValueAtTime(100 + 120 * sp, t);
            midBP.frequency.setValueAtTime(400 + 400 * sp, t);
            hiBP.frequency.setValueAtTime(1200 + 1000 * sp, t);
            lfo.frequency.setValueAtTime(1.5 + 2.5 * sp, t);
          } catch (e) {}
        },
        stop: () => {
          try {
            const t = this.ctx.currentTime;
            master.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
            noise.stop(t + 0.3); lfo.stop(t + 0.3);
          } catch (e) {}
        },
      };
    } catch (e) { return null; }
  }

  // ── ROULETTE SETTLE ──────────────────────────────────────────────
  playRouletteSettle() {
    if (this.muted) return;
    this.init();
    // Pure synthesis: ball dropping and settling into pocket — 3 decaying impacts.
    try {
      const ac  = this.ctx;
      const now = ac.currentTime;
      [
        { t: 0,    vol: 0.38, freq: 720 },
        { t: 0.09, vol: 0.20, freq: 560 },
        { t: 0.16, vol: 0.10, freq: 420 },
      ].forEach(({ t, vol, freq }) => {
        const at  = now + t;
        const len = Math.floor(ac.sampleRate * 0.06);
        const buf = ac.createBuffer(1, len, ac.sampleRate);
        const d   = buf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (len * 0.09));
        const src = ac.createBufferSource();
        src.buffer = buf;
        const bpf = ac.createBiquadFilter();
        bpf.type  = 'bandpass';
        bpf.frequency.value = freq;
        bpf.Q.value = 1.4;
        const g   = ac.createGain();
        g.gain.setValueAtTime(vol, at);
        g.gain.exponentialRampToValueAtTime(0.001, at + 0.07);
        src.connect(bpf); bpf.connect(g); g.connect(ac.destination);
        src.start(at); src.stop(at + 0.08);
      });
    } catch (e) {}
  }

  // ── WIN ──────────────────────────────────────────────────────────
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      [523.25, 659.25, 783.99, 1046.50, 1318.51].forEach((freq, i) => {
        const t = now + i * 0.07;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now); g.gain.setValueAtTime(0.1, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(g); g.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.45);
      });
    } catch (e) {}
  }

  // ── LOSE ─────────────────────────────────────────────────────────
  playLose() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.5);
      g.gain.setValueAtTime(0.06, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.55);
    } catch (e) {}
  }

  // ── TURN ALERT ───────────────────────────────────────────────────
  playTurnAlert() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      [987.77, 1318.51].forEach(freq => {
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0.08, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc.connect(g); g.connect(this.ctx.destination);
        osc.start(now); osc.stop(now + 0.5);
      });
    } catch (e) {}
  }

  // ── SLOT SPIN (loop) ─────────────────────────────────────────────
  playSlotSpin() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(95, now);
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square'; osc2.frequency.setValueAtTime(190, now);
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine'; lfo.frequency.setValueAtTime(10, now);
      const lfoG = this.ctx.createGain(); lfoG.gain.setValueAtTime(25, now);
      lfo.connect(lfoG); lfoG.connect(osc1.frequency); lfoG.connect(osc2.frequency);

      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(2); noise.loop = true;
      const nBP = this.ctx.createBiquadFilter();
      nBP.type = 'bandpass'; nBP.frequency.value = 600; nBP.Q.value = 0.8;
      const nG = this.ctx.createGain(); nG.gain.setValueAtTime(0.012, now);
      noise.connect(nBP); nBP.connect(nG);

      const g1 = this.ctx.createGain(); g1.gain.setValueAtTime(0.03, now);
      const g2 = this.ctx.createGain(); g2.gain.setValueAtTime(0.01, now);
      const master = this.ctx.createGain();
      master.gain.setValueAtTime(0.0, now); master.gain.linearRampToValueAtTime(1.0, now + 0.15);

      osc1.connect(g1); osc2.connect(g2);
      g1.connect(master); g2.connect(master); nG.connect(master);
      master.connect(this.ctx.destination);

      lfo.start(now); osc1.start(now); osc2.start(now); noise.start(now);

      return {
        stop: () => {
          try {
            const t = this.ctx.currentTime;
            master.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
            osc1.stop(t + 0.25); osc2.stop(t + 0.25); lfo.stop(t + 0.25); noise.stop(t + 0.25);
          } catch (e) {}
        },
      };
    } catch (e) { return null; }
  }

  // ── SLOT STOP ────────────────────────────────────────────────────
  playSlotStop(reelIndex = 0) {
    if (this.muted) return;
    this.init();
    const pitch = 1.0 + reelIndex * 0.08;
    if (this._play('dieThrow', 0.65, pitch)) return;
    // Synthesis fallback
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120 * pitch, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      g.gain.setValueAtTime(0.2, now); g.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(g); g.connect(this.ctx.destination);
      osc.start(now); osc.stop(now + 0.16);
    } catch (e) {}
  }

  // ── SLOT WIN LINE ────────────────────────────────────────────────
  playSlotWinLine() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      [659.25, 783.99, 880, 1046.5, 1174.66, 1318.51, 1567.98].forEach((freq, i) => {
        const t = now + i * 0.06;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine'; osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now); g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g); g.connect(this.ctx.destination);
        osc.start(t); osc.stop(t + 0.22);
      });
    } catch (e) {}
  }

  // ── JACKPOT SIREN ────────────────────────────────────────────────
  playJackpotSiren() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const dur = 4.0;
      const osc1 = this.ctx.createOscillator(); osc1.type = 'sawtooth'; osc1.frequency.setValueAtTime(440, now);
      const osc2 = this.ctx.createOscillator(); osc2.type = 'square';   osc2.frequency.setValueAtTime(444, now);
      const lfo = this.ctx.createOscillator(); lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.5, now); lfo.frequency.linearRampToValueAtTime(6, now + dur);
      const lfoG = this.ctx.createGain(); lfoG.gain.setValueAtTime(250, now);
      lfo.connect(lfoG); lfoG.connect(osc1.frequency); lfoG.connect(osc2.frequency);
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.07, now + 0.2);
      g.gain.setValueAtTime(0.07, now + dur - 0.8); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
      osc1.connect(g); osc2.connect(g); g.connect(this.ctx.destination);
      lfo.start(now); osc1.start(now); osc2.start(now);
      lfo.stop(now + dur); osc1.stop(now + dur); osc2.stop(now + dur);
      // Bell chimes
      for (let i = 0; i < 16; i++) {
        const bt = now + i * 0.25;
        if (bt > now + dur - 0.2) break;
        const bell = this.ctx.createOscillator(); const bg = this.ctx.createGain();
        bell.type = 'sine'; bell.frequency.value = i % 2 === 0 ? 1200 : 1500;
        bg.gain.setValueAtTime(0, now); bg.gain.setValueAtTime(0.05, bt);
        bg.gain.exponentialRampToValueAtTime(0.001, bt + 0.18);
        bell.connect(bg); bg.connect(this.ctx.destination);
        bell.start(bt); bell.stop(bt + 0.2);
      }
    } catch (e) {}
  }
}

export const casinoAudio = new CasinoAudio();
