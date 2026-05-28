// Web Audio API Sound Generator for Antigravity Casino
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

  // Sonido al colocar fichas/apostar
  playChip() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1500, this.ctx.currentTime + 0.05);
      
      gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.08);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de deslizamiento de carta
  playCardSlide() {
    if (this.muted) return;
    this.init();
    try {
      const bufferSize = this.ctx.sampleRate * 0.12; // 120ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      
      // Ruido blanco filtrado
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.12);
      
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.06, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.12);
      
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);
      
      noise.start();
      noise.stop(this.ctx.currentTime + 0.12);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Tic-tic de la ruleta girando (contacto de la bola con los separadores de madera/plástico)
  playRouletteTick() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      
      // Cuerpo del impacto: onda senoidal corta que cae rápidamente en frecuencia
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(650, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.03);
      
      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      
      // Chasquido de impacto: ruido de alta frecuencia filtrado muy corto (12ms)
      const bufferSize = this.ctx.sampleRate * 0.015; // 15ms
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.setValueAtTime(2000, now);
      
      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.06, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.012);
      
      osc.connect(oscGain);
      oscGain.connect(this.ctx.destination);
      
      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.ctx.destination);
      
      osc.start(now);
      noise.start(now);
      
      osc.stop(now + 0.05);
      noise.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido continuo de la bola rodando sobre la pista de madera/metal
  playRouletteRoll() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;
      
      // Crear buffer de ruido blanco de 2 segundos para loop
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      
      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;
      
      // Filtro paso-banda 1 (ruido sordo/gravedad de rodamiento)
      const lowFilter = this.ctx.createBiquadFilter();
      lowFilter.type = 'bandpass';
      lowFilter.frequency.setValueAtTime(250, now);
      lowFilter.Q.setValueAtTime(1.5, now);
      
      // Filtro paso-banda 2 (fricción de la bola de marfil/plástico contra el borde)
      const highFilter = this.ctx.createBiquadFilter();
      highFilter.type = 'bandpass';
      highFilter.frequency.setValueAtTime(1800, now);
      highFilter.Q.setValueAtTime(2.0, now);
      
      // LFO para modular la frecuencia del siseo alto simulando el movimiento de rotación
      const lfo = this.ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(3.5, now); // 3.5 Hz
      
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.setValueAtTime(300, now);
      
      lfo.connect(lfoGain);
      lfoGain.connect(highFilter.frequency);
      
      const gainLow = this.ctx.createGain();
      gainLow.gain.setValueAtTime(0.015, now);
      
      const gainHigh = this.ctx.createGain();
      gainHigh.gain.setValueAtTime(0.008, now);
      
      const mainGain = this.ctx.createGain();
      mainGain.gain.setValueAtTime(0.0, now);
      // Fade in de entrada
      mainGain.gain.linearRampToValueAtTime(0.7, now + 0.3);
      
      noise.connect(lowFilter);
      lowFilter.connect(gainLow);
      
      noise.connect(highFilter);
      highFilter.connect(gainHigh);
      
      gainLow.connect(mainGain);
      gainHigh.connect(mainGain);
      mainGain.connect(this.ctx.destination);
      
      lfo.start(now);
      noise.start(now);
      
      return {
        setSpeed: (speedPercent) => {
          try {
            // Modula volumen y frecuencias dinámicamente según la velocidad
            const t = this.ctx.currentTime;
            mainGain.gain.setValueAtTime(0.7 * speedPercent, t);
            lowFilter.frequency.setValueAtTime(120 + 130 * speedPercent, t);
            highFilter.frequency.setValueAtTime(1000 + 800 * speedPercent, t);
            lfo.frequency.setValueAtTime(1.5 + 2 * speedPercent, t);
          } catch(e) {}
        },
        stop: () => {
          try {
            const stopTime = this.ctx.currentTime;
            mainGain.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.2);
            noise.stop(stopTime + 0.25);
            lfo.stop(stopTime + 0.25);
          } catch(err) {}
        }
      };
    } catch(e) {
      console.warn('Audio play error:', e);
      return null;
    }
  }

  // Sonido cuando la bola cae en un casillero y hace el rebote final (clack-clack)
  playRouletteSettle() {
    if (this.muted) return;
    this.init();
    try {
      // Primer impacto
      this.playRouletteTick();
      
      // Segundo impacto más suave (amortiguación) 100ms después
      setTimeout(() => {
        if (this.muted) return;
        try {
          const osc = this.ctx.createOscillator();
          const oscGain = this.ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(500, this.ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(250, this.ctx.currentTime + 0.02);
          
          oscGain.gain.setValueAtTime(0.04, this.ctx.currentTime);
          oscGain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);
          
          osc.connect(oscGain);
          oscGain.connect(this.ctx.destination);
          
          osc.start();
          osc.stop(this.ctx.currentTime + 0.04);
        } catch(e) {}
      }, 100);
    } catch(e) {}
  }


  // Sonido triunfal al ganar
  playWin() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // Acorde C mayor (C5, E5, G5, C6)
      
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.value = freq;
        
        const startTime = now + index * 0.08;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.12, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.4);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de derrota (descendente)
  playLose() {
    if (this.muted) return;
    this.init();
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(110, this.ctx.currentTime + 0.4);
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.45);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start();
      osc.stop(this.ctx.currentTime + 0.45);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Notificación de turno o llamada importante (Ding)
  playTurnAlert() {
    if (this.muted) return;
    this.init();
    try {
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(987.77, this.ctx.currentTime); // B5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1318.51, this.ctx.currentTime); // E6
      
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc1.start();
      osc2.start();
      osc1.stop(this.ctx.currentTime + 0.5);
      osc2.stop(this.ctx.currentTime + 0.5);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de carretes girando (retorna una referencia para poder pararlo)
  playSlotSpin() {
    if (this.muted) return null;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(110, now);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(8, now);
      
      lfoGain.gain.setValueAtTime(40, now);
      
      gain.gain.setValueAtTime(0.04, now);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      lfo.start(now);
      osc.start(now);
      
      return {
        stop: () => {
          try {
            const stopTime = this.ctx.currentTime;
            gain.gain.exponentialRampToValueAtTime(0.001, stopTime + 0.15);
            osc.stop(stopTime + 0.2);
            lfo.stop(stopTime + 0.2);
          } catch(err) {}
        }
      };
    } catch (e) {
      console.warn('Audio play error:', e);
      return null;
    }
  }

  // Sonido de parada de carrete (thump) con tono ascendente por carrete
  playSlotStop(reelIndex) {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      
      const baseFreq = 150 + reelIndex * 40;
      
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.12);
      
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      
      osc.start(now);
      osc.stop(now + 0.15);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sonido de línea ganadora
  playSlotWinLine() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const notes = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50];
      notes.forEach((freq, index) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + index * 0.05);
        
        const startTime = now + index * 0.05;
        gain.gain.setValueAtTime(0, now);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.25);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Sirena épica del Jackpot Global
  playJackpotSiren() {
    if (this.muted) return;
    this.init();
    try {
      const now = this.ctx.currentTime;
      const duration = 3.5;
      
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();
      
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(440, now);
      
      osc2.type = 'square';
      osc2.frequency.setValueAtTime(444, now);
      
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime(4, now);
      lfoGain.gain.setValueAtTime(200, now);
      
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.linearRampToValueAtTime(0.08, now + duration - 0.5);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
      
      lfo.connect(lfoGain);
      lfoGain.connect(osc1.frequency);
      lfoGain.connect(osc2.frequency);
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);
      
      lfo.start(now);
      osc1.start(now);
      osc2.start(now);
      
      lfo.stop(now + duration);
      osc1.stop(now + duration);
      osc2.stop(now + duration);
      
      for (let i = 0; i < 14; i++) {
        const bellTime = now + i * 0.25;
        const bellOsc = this.ctx.createOscillator();
        const bellGain = this.ctx.createGain();
        
        bellOsc.type = 'sine';
        bellOsc.frequency.setValueAtTime(1200, bellTime);
        
        bellGain.gain.setValueAtTime(0, now);
        bellGain.gain.setValueAtTime(0.05, bellTime);
        bellGain.gain.exponentialRampToValueAtTime(0.001, bellTime + 0.2);
        
        bellOsc.connect(bellGain);
        bellGain.connect(this.ctx.destination);
        
        bellOsc.start(bellTime);
        bellOsc.stop(bellTime + 0.2);
      }
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

export const casinoAudio = new CasinoAudio();
