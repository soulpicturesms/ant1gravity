// Web Audio API Sound Generator for Antigravity Casino
// Premium multi-layered sound design inspired by Rust gambling mechanics
class CasinoAudio {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    return this.muted;
  }

  // Helper: create noise buffer
  _noiseBuffer(duration) {
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  // Sonido al colocar fichas/apostar — ceramic chip click
  playChip() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Primary click — sharp ceramic tap
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(1200, now);
      osc1.frequency.exponentialRampToValueAtTime(600, now + 0.04);
      g1.gain.setValueAtTime(0.12, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc1.connect(g1);
      g1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.07);

      // Secondary harmonic — subtle ring
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(2400, now);
      osc2.frequency.exponentialRampToValueAtTime(1800, now + 0.03);
      g2.gain.setValueAtTime(0.04, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc2.connect(g2);
      g2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.06);

      // Impact noise — brief transient
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.02);
      const nf = this.ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 3500;
      nf.Q.value = 1.5;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.05, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.03);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de deslizamiento de carta
  playCardSlide() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.15);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 0.15);
      filter.Q.value = 1.2;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.07, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.16);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Tic de la ruleta — bola impactando separadores metálicos/madera
  // Rich metallic click with body resonance and fret vibration
  playRouletteTick() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Layer 1: Metal fret impact — sharp sine drop
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(800, now);
      osc1.frequency.exponentialRampToValueAtTime(280, now + 0.025);
      g1.gain.setValueAtTime(0.1, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc1.connect(g1);
      g1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.05);

      // Layer 2: Metallic harmonic ring
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1600, now);
      osc2.frequency.exponentialRampToValueAtTime(1100, now + 0.06);
      g2.gain.setValueAtTime(0.035, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
      osc2.connect(g2);
      g2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.07);

      // Layer 3: High-frequency impact transient (noise burst)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.012);
      const hpf = this.ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 2500;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.07, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
      noise.connect(hpf);
      hpf.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.02);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido continuo de la bola rodando — dual-layer rumble with high shimmer
  playRouletteRoll() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Noise source (looping)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(2);
      noise.loop = true;

      // Layer 1: Low rumble — wooden track resonance
      const lowBP = this.ctx.createBiquadFilter();
      lowBP.type = 'bandpass';
      lowBP.frequency.setValueAtTime(220, now);
      lowBP.Q.value = 1.8;
      const lowGain = this.ctx.createGain();
      lowGain.gain.setValueAtTime(0.018, now);

      // Layer 2: Mid body — ball rolling friction
      const midBP = this.ctx.createBiquadFilter();
      midBP.type = 'bandpass';
      midBP.frequency.setValueAtTime(800, now);
      midBP.Q.value = 1.2;
      const midGain = this.ctx.createGain();
      midGain.gain.setValueAtTime(0.008, now);

      // Layer 3: High shimmer — metallic surface contact
      const hiBP = this.ctx.createBiquadFilter();
      hiBP.type = 'bandpass';
      hiBP.frequency.setValueAtTime(2200, now);
      hiBP.Q.value = 2.5;
      const hiGain = this.ctx.createGain();
      hiGain.gain.setValueAtTime(0.006, now);

      // LFO for rhythmic modulation (simulates ball passing segments)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4.0, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);
      lfo.connect(lfoGain);
      lfoGain.connect(hiBP.frequency);
      lfoGain.connect(midBP.frequency);

      // Master gain with fade-in
      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.0, now);
      masterGain.gain.linearRampToValueAtTime(0.75, now + 0.3);

      // Connect noise → filters → gains → master
      noise.connect(lowBP);
      lowBP.connect(lowGain);
      noise.connect(midBP);
      midBP.connect(midGain);
      noise.connect(hiBP);
      hiBP.connect(hiGain);

      lowGain.connect(masterGain);
      midGain.connect(masterGain);
      hiGain.connect(masterGain);
      masterGain.connect(this.ctx.destination);

      lfo.start(now);
      noise.start(now);

      return {
        setSpeed: (speedPercent) => {
          try {
            const t = this.ctx.currentTime;
            const sp = Math.max(0.01, speedPercent);
            masterGain.gain.setValueAtTime(0.75 * sp, t);
            lowBP.frequency.setValueAtTime(100 + 120 * sp, t);
            midBP.frequency.setValueAtTime(400 + 400 * sp, t);
            hiBP.frequency.setValueAtTime(1200 + 1000 * sp, t);
            lfo.frequency.setValueAtTime(1.5 + 2.5 * sp, t);
          } catch(e) {}
        },
        stop: () => {
          try {
            const stopTime = this.ctx.currentTime;
            masterGain.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.25);
            noise.stop(stopTime + 0.3);
            lfo.stop(stopTime + 0.3);
          } catch(err) {}
        }
      };
    } catch(e) {
      console.warn('Audio play error:', e);
      return null;
    }
  }

  // Bola asentándose en el casillero — triple bounce pattern (clack-clack-click)
  playRouletteSettle() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const bounces = [
        { delay: 0, freqStart: 900, freqEnd: 300, vol: 0.14, dur: 0.05 },
        { delay: 0.09, freqStart: 750, freqEnd: 280, vol: 0.09, dur: 0.04 },
        { delay: 0.16, freqStart: 600, freqEnd: 250, vol: 0.05, dur: 0.035 },
      ];

      bounces.forEach(b => {
        // Tonal body
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        const t = now + b.delay;
        osc.frequency.setValueAtTime(b.freqStart, t);
        osc.frequency.exponentialRampToValueAtTime(b.freqEnd, t + b.dur);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(b.vol, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + b.dur + 0.02);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + b.dur + 0.03);

        // Impact noise transient
        const noise = this.ctx.createBufferSource();
        noise.buffer = this._noiseBuffer(0.015);
        const hpf = this.ctx.createBiquadFilter();
        hpf.type = 'highpass';
        hpf.frequency.value = 2200;
        const ng = this.ctx.createGain();
        ng.gain.setValueAtTime(0, now);
        ng.gain.setValueAtTime(b.vol * 0.5, t);
        ng.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
        noise.connect(hpf);
        hpf.connect(ng);
        ng.connect(this.ctx.destination);
        noise.start(t);
        noise.stop(t + 0.025);
      });

      // Final resonant ring (ball resting in pocket)
      const ring = this.ctx.createOscillator();
      const rg = this.ctx.createGain();
      ring.type = 'sine';
      ring.frequency.setValueAtTime(420, now + 0.22);
      rg.gain.setValueAtTime(0, now);
      rg.gain.setValueAtTime(0.03, now + 0.22);
      rg.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      ring.connect(rg);
      rg.connect(this.ctx.destination);
      ring.start(now + 0.22);
      ring.stop(now + 0.5);
    } catch(e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido triunfal al ganar — cascading celebration fanfare
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      // Ascending major arpeggio with harmonics
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];

      notes.forEach((freq, index) => {
        const startTime = now + index * 0.07;

        // Primary tone
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.1, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(startTime);
        osc.stop(startTime + 0.45);

        // Shimmer harmonic (octave up, quieter)
        const osc2 = this.ctx.createOscillator();
        const g2 = this.ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2;
        g2.gain.setValueAtTime(0, now);
        g2.gain.setValueAtTime(0.025, startTime);
        g2.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);
        osc2.connect(g2);
        g2.connect(this.ctx.destination);
        osc2.start(startTime);
        osc2.stop(startTime + 0.35);
      });

      // Celebration chime at the end
      const chime = this.ctx.createOscillator();
      const cg = this.ctx.createGain();
      chime.type = 'sine';
      chime.frequency.setValueAtTime(2093, now + 0.4);
      cg.gain.setValueAtTime(0, now);
      cg.gain.setValueAtTime(0.06, now + 0.4);
      cg.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
      chime.connect(cg);
      cg.connect(this.ctx.destination);
      chime.start(now + 0.4);
      chime.stop(now + 0.75);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de derrota — descending somber tone
  playLose() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Low descending tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(100, now + 0.5);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.55);

      // Muted thud
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(80, now);
      osc2.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      g2.gain.setValueAtTime(0.08, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc2.connect(g2);
      g2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.2);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Notificación de turno (Ding)
  playTurnAlert() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, now);
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, now);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.5);
      osc2.stop(now + 0.5);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Slot spin — layered mechanical reel whirring
  playSlotSpin() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Layer 1: Base mechanical hum
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(95, now);

      // Layer 2: High frequency rattle
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(190, now);

      // LFO wobble (simulates mechanical vibration)
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(10, now);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(25, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      // Noise layer for reel friction
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(2);
      noise.loop = true;
      const noiseBP = this.ctx.createBiquadFilter();
      noiseBP.type = 'bandpass';
      noiseBP.frequency.value = 600;
      noiseBP.Q.value = 0.8;
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.012, now);

      noise.connect(noiseBP);
      noiseBP.connect(noiseGain);

      const g1 = this.ctx.createGain();
      g1.gain.setValueAtTime(0.03, now);
      const g2 = this.ctx.createGain();
      g2.gain.setValueAtTime(0.01, now);

      const masterGain = this.ctx.createGain();
      masterGain.gain.setValueAtTime(0.0, now);
      masterGain.gain.linearRampToValueAtTime(1.0, now + 0.15);

      osc1.connect(g1);
      osc2.connect(g2);
      g1.connect(masterGain);
      g2.connect(masterGain);
      noiseGain.connect(masterGain);
      masterGain.connect(this.ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      noise.start(now);

      return {
        stop: () => {
          try {
            const stopTime = this.ctx.currentTime;
            masterGain.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.2);
            osc1.stop(stopTime + 0.25);
            osc2.stop(stopTime + 0.25);
            lfo.stop(stopTime + 0.25);
            noise.stop(stopTime + 0.25);
          } catch(err) {}
        }
      };
    } catch (e) {
      console.warn('Audio play error:', e);
      return null;
    }
  }

  // Slot reel stop — satisfying metallic thud with mechanical click
  playSlotStop(reelIndex) {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const pitch = 1.0 + reelIndex * 0.12; // Each reel slightly higher pitched

      // Heavy body thump
      const osc1 = this.ctx.createOscillator();
      const g1 = this.ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(120 * pitch, now);
      osc1.frequency.exponentialRampToValueAtTime(40, now + 0.12);
      g1.gain.setValueAtTime(0.2, now);
      g1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc1.connect(g1);
      g1.connect(this.ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.16);

      // Metallic click
      const osc2 = this.ctx.createOscillator();
      const g2 = this.ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(800 * pitch, now);
      osc2.frequency.exponentialRampToValueAtTime(400, now + 0.03);
      g2.gain.setValueAtTime(0.1, now);
      g2.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc2.connect(g2);
      g2.connect(this.ctx.destination);
      osc2.start(now);
      osc2.stop(now + 0.06);

      // Impact noise burst
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.02);
      const nf = this.ctx.createBiquadFilter();
      nf.type = 'bandpass';
      nf.frequency.value = 1500;
      nf.Q.value = 0.8;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.08, now);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      noise.connect(nf);
      nf.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + 0.03);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Slot win line — casino coin cascade jingle
  playSlotWinLine() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;

      // Ascending coin cascade melody
      const melody = [659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51, 1567.98];
      melody.forEach((freq, i) => {
        const t = now + i * 0.06;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(0.08, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });

      // Metallic coin clink sounds
      for (let i = 0; i < 5; i++) {
        const t = now + i * 0.08 + 0.02;
        const osc = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(3000 + i * 200, t);
        osc.frequency.exponentialRampToValueAtTime(2000 + i * 100, t + 0.04);
        g.gain.setValueAtTime(0, now);
        g.gain.setValueAtTime(0.03, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.06);
        osc.connect(g);
        g.connect(this.ctx.destination);
        osc.start(t);
        osc.stop(t + 0.07);
      }

      // Shimmer noise (coin shower)
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(0.5);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 5000;
      bp.Q.value = 2;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0.02, now + 0.1);
      ng.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(now + 0.1);
      noise.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sirena épica del Jackpot Global — multi-layered alarm + celebration
  playJackpotSiren() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const duration = 4.0;

      // Siren sweep oscillator 1
      const osc1 = this.ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now);

      // Detuned oscillator 2 for thickness
      const osc2 = this.ctx.createOscillator();
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(444, now);

      // LFO for siren sweep
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.5, now);
      lfo.frequency.linearRampToValueAtTime(6, now + duration);
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(250, now);
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.0, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.2);
      gain.gain.setValueAtTime(0.07, now + duration - 0.8);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      lfo.stop(now + duration);
      osc1.stop(now + duration);
      osc2.stop(now + duration);

      // Bell chimes
      for (let i = 0; i < 16; i++) {
        const bellTime = now + i * 0.25;
        if (bellTime > now + duration - 0.2) break;
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        bellOsc.type = 'sine';
        const bellFreq = i % 2 === 0 ? 1200 : 1500;
        bellOsc.frequency.setValueAtTime(bellFreq, bellTime);
        bellGain.gain.setValueAtTime(0, now);
        bellGain.gain.setValueAtTime(0.05, bellTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.18);
        bellOsc.connect(bellGain);
        bellGain.connect(this.ctx.destination);
        bellOsc.start(bellTime);
        bellOsc.stop(bellTime + 0.2);
      }

      // Coin shower noise layer
      const noise = this.ctx.createBufferSource();
      noise.buffer = this._noiseBuffer(duration);
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 6000;
      bp.Q.value = 3;
      const ng = this.ctx.createGain();
      ng.gain.setValueAtTime(0, now);
      ng.gain.linearRampToValueAtTime(0.02, now + 0.5);
      ng.gain.setValueAtTime(0.02, now + duration - 1);
      ng.gain.exponentialRampToValueAtTime(0.001, now + duration);
      noise.connect(bp);
      bp.connect(ng);
      ng.connect(this.ctx.destination);
      noise.start(now);
      noise.stop(now + duration + 0.1);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

export const casinoAudio = new CasinoAudio();
