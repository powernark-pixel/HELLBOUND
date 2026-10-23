// Tiny procedural sound kit (WebAudio). No files: every sound is synthesised.
export class SFX {
  constructor() { this.ctx = null; this.muted = false; this.last = {}; }
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.55; this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 2, buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this.noise = buf;
      this.ambience();
    } catch (e) { this.ctx = null; }
  }
  toggle() { this.muted = !this.muted; if (this.master) this.master.gain.value = this.muted ? 0 : 0.55; return this.muted; }
  ambience() { // rain hiss + low city hum
    const c = this.ctx, n = c.createBufferSource(); n.buffer = this.noise; n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.4;
    const g = c.createGain(); g.gain.value = 0.05; n.connect(f).connect(g).connect(this.master); n.start();
    const o = c.createOscillator(); o.frequency.value = 55; const og = c.createGain(); og.gain.value = 0.018; o.connect(og).connect(this.master); o.start();
  }
  env(node, t, a, peak, d) { node.gain.setValueAtTime(0.0001, t); node.gain.exponentialRampToValueAtTime(peak, t + a); node.gain.exponentialRampToValueAtTime(0.0001, t + a + d); }
  noiseHit(t, freq, q, peak, dur, type = 'lowpass') {
    const c = this.ctx, s = c.createBufferSource(); s.buffer = this.noise; s.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    const g = c.createGain(); this.env(g, t, 0.004, peak, dur); s.connect(f).connect(g).connect(this.master); s.start(t, Math.random()); s.stop(t + dur + 0.05);
    return f;
  }
  tone(t, f0, f1, peak, dur, type = 'sine') {
    const c = this.ctx, o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    const g = c.createGain(); this.env(g, t, 0.005, peak, dur); o.connect(g).connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  }
  play(name, k = 1) {
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    if (this.last[name] && now - this.last[name] < 0.03) return; this.last[name] = now;
    const t = now + 0.005;
    switch (name) {
      case 'whoosh': { const f = this.noiseHit(t, 800, 2, 0.12 * k, 0.18, 'bandpass'); f.frequency.exponentialRampToValueAtTime(2600, t + 0.15); break; }
      case 'punch': this.noiseHit(t, 600, 1, 0.35, 0.08); this.tone(t, 140, 60, 0.25, 0.1); break;
      case 'clang': this.noiseHit(t, 3000, 3, 0.25, 0.12, 'bandpass'); this.tone(t, 820, 760, 0.12, 0.35, 'triangle'); this.tone(t, 1240, 1180, 0.07, 0.3, 'triangle'); this.tone(t, 90, 45, 0.4, 0.16); break;
      case 'hurt': this.noiseHit(t, 400, 1, 0.3, 0.12); this.tone(t, 180, 90, 0.2, 0.15, 'sawtooth'); break;
      case 'down': this.tone(t, 160, 40, 0.35, 0.5); this.noiseHit(t, 300, 1, 0.3, 0.35); break;
      case 'rummage': for (let i = 0; i < 3; i++) this.noiseHit(t + i * 0.09, 1500 + Math.random() * 1500, 2, 0.08, 0.06, 'bandpass'); break;
      case 'pickup': this.tone(t, 660, 880, 0.12, 0.08, 'triangle'); this.tone(t + 0.07, 990, 1320, 0.1, 0.1, 'triangle'); break;
      case 'cash': [1318, 1760, 2093].forEach((f, i) => this.tone(t + i * 0.05, f, f, 0.09, 0.25, 'triangle')); this.noiseHit(t, 6000, 1, 0.05, 0.1, 'highpass'); break;
      case 'click': this.tone(t, 1800, 1400, 0.06, 0.03, 'square'); break;
      case 'pour': { const f = this.noiseHit(t, 900, 4, 0.12, 0.9, 'bandpass'); f.frequency.linearRampToValueAtTime(500, t + 0.9); break; }
      case 'bubble': this.tone(t, 300 + Math.random() * 400, 900 + Math.random() * 500, 0.05, 0.06); break;
      case 'flare': this.noiseHit(t, 1200, 0.5, 0.5, 0.7); this.tone(t, 120, 40, 0.4, 0.6); break;
      case 'done': [523, 659, 784].forEach((f, i) => this.tone(t + i * 0.08, f, f, 0.1, 0.3, 'triangle')); break;
      case 'alert': this.tone(t, 520, 380, 0.12, 0.18, 'square'); break;
      case 'spray': this.noiseHit(t, 5000, 0.7, 0.06, 0.12, 'highpass'); break;
      case 'capture': [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(t + i * 0.09, f, f, 0.12, 0.5, 'triangle')); this.tone(t, 65, 65, 0.25, 1.2); break;
      case 'shutter': for (let i = 0; i < 10; i++) this.noiseHit(t + i * 0.06, 1200, 3, 0.07, 0.05, 'bandpass'); this.tone(t, 70, 50, 0.15, 0.7, 'sawtooth'); break;
      case 'dodge': this.noiseHit(t, 500, 1, 0.12, 0.15); break;
      case 'step': this.noiseHit(t, 300 + Math.random() * 200, 1, 0.025, 0.05); break;
    }
  }
}
