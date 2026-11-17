// Synthesized sound: every effect and the music bed are built from WebAudio
// oscillators and noise, so the game ships no audio files. The context is
// created lazily on the first user gesture and every call is guarded, so
// headless or screenshot runs never throw.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.muted = false;
  }

  // Call from a user gesture (click / key). Safe to call repeatedly.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        try { this.ctx.resume(); } catch (err) { /* audio unavailable */ }
      }
      return;
    }
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.16;
      this.musicGain.connect(this.master);
    } catch (err) {
      this.ctx = null;
    }
  }

  _tone(freq, dur, type, vol, slideTo, delay) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime + (delay || 0);
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      osc.connect(gain);
      gain.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.02);
    } catch (err) { /* ignore audio errors */ }
  }

  _noise(dur, vol, lowpass) {
    if (!this.ctx || this.muted) return;
    try {
      const t0 = this.ctx.currentTime;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = lowpass || 1200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(vol, t0);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start(t0);
    } catch (err) { /* ignore audio errors */ }
  }

  shoot() { this._tone(720, 0.07, 'square', 0.10, 240); }
  enemyHit() { this._tone(190, 0.05, 'triangle', 0.12, 120); }
  enemyDeath() { this._noise(0.22, 0.22, 900); this._tone(160, 0.18, 'sawtooth', 0.10, 40); }
  gemPickup() { this._tone(880, 0.09, 'sine', 0.12, 1320); }
  levelUp() {
    this._tone(523, 0.12, 'sine', 0.16);
    this._tone(659, 0.12, 'sine', 0.16, null, 0.09);
    this._tone(784, 0.22, 'sine', 0.18, null, 0.18);
  }
  playerHurt() { this._tone(110, 0.25, 'sawtooth', 0.22, 55); this._noise(0.15, 0.18, 600); }
  bossRoar() {
    this._tone(70, 0.7, 'sawtooth', 0.25, 38);
    this._tone(105, 0.7, 'sawtooth', 0.18, 52, 0.05);
    this._noise(0.6, 0.15, 400);
  }
  bossDeath() { this._noise(0.9, 0.3, 500); this._tone(90, 0.8, 'sawtooth', 0.2, 30); }
  victory() {
    [523, 659, 784, 1047].forEach((f, i) => this._tone(f, 0.28, 'sine', 0.18, null, i * 0.13));
  }
  defeat() {
    [392, 330, 262, 196].forEach((f, i) => this._tone(f, 0.3, 'triangle', 0.16, null, i * 0.15));
  }
  click() { this._tone(660, 0.05, 'sine', 0.10, 880); }

  // Looping bed: a low bass pulse on the beat plus a rising arpeggio.
  // Scheduled in small steps so it keeps time without a worker.
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const bass = [55, 55, 65.41, 49];
    const arp = [220, 261.63, 329.63, 392, 329.63, 261.63];
    this.musicStep = 0;
    try {
      this.musicTimer = setInterval(() => {
        if (!this.ctx || this.muted) return;
        const step = this.musicStep;
        this.musicStep += 1;
        const t0 = this.ctx.currentTime + 0.05;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = bass[step % bass.length];
        gain.gain.setValueAtTime(0.5, t0);
        gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.42);
        osc.connect(gain);
        gain.connect(this.musicGain);
        osc.start(t0);
        osc.stop(t0 + 0.45);
        if (step % 2 === 0) {
          const a = this.ctx.createOscillator();
          const ag = this.ctx.createGain();
          a.type = 'triangle';
          a.frequency.value = arp[(step / 2) % arp.length];
          ag.gain.setValueAtTime(0.22, t0);
          ag.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
          a.connect(ag);
          ag.connect(this.musicGain);
          a.start(t0);
          a.stop(t0 + 0.32);
        }
      }, 220);
    } catch (err) { /* ignore audio errors */ }
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}
