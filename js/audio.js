'use strict';
// Synthetisierter Sound (WebAudio) – keine Audiodateien nötig

const Sfx = {
  ctx: null, master: null, bus: null, nbuf: null,
  muted: false, last: {}, vm: 1, pn: 0, pr: 1,
  MIN: { hit: 0.04, crit: 0.07, death: 0.06, fireHit: 0.05, swing: 0.12, arrow: 0.1, heart: 0.3, ui: 0.05 },

  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
    } catch (e) { return; }
    const c = this.ctx;
    try { this.muted = localStorage.getItem('aschenfall-mute') === '1'; } catch (e) { /* egal */ }
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : 0.6; this.master.connect(c.destination);
    this.bus = c.createGain(); this.bus.connect(this.master);
    // Dungeon-Hall
    const len = Math.floor(c.sampleRate * 1.4), ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    const conv = c.createConvolver(); conv.buffer = ir;
    const wet = c.createGain(); wet.gain.value = 0.22;
    this.bus.connect(conv); conv.connect(wet); wet.connect(this.master);
    // Rauschen
    this.nbuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
    const nd = this.nbuf.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.startAmbient();
    UI.updateSndButton();
  },

  setMuted(m) {
    this.muted = m;
    try { localStorage.setItem('aschenfall-mute', m ? '1' : '0'); } catch (e) { /* egal */ }
    if (this.master) this.master.gain.value = m ? 0 : 0.6;
    UI.updateSndButton();
  },

  out(node) {
    if (this.pn && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner(); p.pan.value = this.pn;
      node.connect(p); p.connect(this.bus);
    } else node.connect(this.bus);
  },

  tone(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0), vol = o.vol * this.vm;
    if (vol < 0.002) return;
    const osc = c.createOscillator(), g = c.createGain();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0 * this.pr, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 * this.pr), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    osc.connect(g); this.out(g);
    osc.start(t); osc.stop(t + o.dur + 0.03);
  },

  noise(o) {
    const c = this.ctx, t = c.currentTime + (o.delay || 0), vol = o.vol * this.vm;
    if (vol < 0.002) return;
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = this.nbuf;
    f.type = o.type || 'bandpass'; f.Q.value = o.q || 0.8;
    f.frequency.setValueAtTime(o.f0, t);
    if (o.f1) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + (o.atk || 0.005));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    src.connect(f); f.connect(g); this.out(g);
    src.start(t, Math.random() * 1.5); src.stop(t + o.dur + 0.03);
  },

  // pos: { x, y } in Weltkoordinaten -> Lautstärke und Stereo-Position
  play(name, pos) {
    if (!this.ctx || this.muted || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    if (now - (this.last[name] || 0) < (this.MIN[name] || 0.03)) return;
    this.last[name] = now;
    this.vm = 1; this.pn = 0;
    if (pos) {
      const d = Math.hypot(pos.x - P.x, pos.y - P.y);
      this.vm = Math.pow(clamp(1 - d / 750, 0, 1), 1.5);
      this.pn = clamp((pos.x - P.x) / 450, -0.8, 0.8);
      if (this.vm < 0.03) return;
    }
    this.pr = 0.93 + Math.random() * 0.14;
    const r = this.R[name];
    if (r) r.call(this);
  },

  startAmbient() {
    const c = this.ctx;
    const g = c.createGain(); g.gain.value = 0.05;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 170;
    const o1 = c.createOscillator(), o2 = c.createOscillator();
    o1.type = o2.type = 'sawtooth'; o1.frequency.value = 55; o2.frequency.value = 55.45;
    const lfo = c.createOscillator(), lg = c.createGain();
    lfo.frequency.value = 0.07; lg.gain.value = 70; lfo.connect(lg); lg.connect(f.frequency);
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(this.bus);
    o1.start(); o2.start(); lfo.start();
    setInterval(() => {
      if (G.state !== 'play' || G.paused) return;
      const r = Math.random();
      if (r < 0.45) { this.pn = 0; this.play('drip'); }
      else if (r < 0.6) this.play('rumble');
    }, 6500);
  },
};

// ---------- Klangrezepte ----------
const T = o => Sfx.tone(o), N = o => Sfx.noise(o);
Sfx.R = {
  fire()    { N({ dur: .22, vol: .22, f0: 500, f1: 2200, q: 1.2 }); T({ f0: 320, f1: 110, dur: .16, type: 'sawtooth', vol: .07 }); },
  fireHit() { N({ dur: .28, vol: .3, type: 'lowpass', f0: 2400, f1: 250 }); T({ f0: 150, f1: 45, dur: .22, vol: .4 }); },
  nova()    { N({ dur: .55, vol: .22, f0: 3200, f1: 700, q: 0.9 }); T({ f0: 880, f1: 1760, dur: .6, vol: .1, atk: .05 }); T({ f0: 1320, f1: 2640, dur: .5, vol: .06, atk: .05 }); T({ f0: 90, f1: 38, dur: .45, vol: .35 }); },
  bolt()    { for (let i = 0; i < 6; i++) N({ dur: .05, vol: .2, f0: 1800 + Math.random() * 2500, q: 3, delay: i * 0.035 }); T({ f0: 1400, f1: 180, dur: .2, type: 'square', vol: .07 }); T({ f0: 70, f1: 40, dur: .25, vol: .3 }); },
  blink()   { N({ dur: .22, vol: .2, f0: 500, f1: 3200, q: 1.1 }); T({ f0: 300, f1: 900, dur: .2, vol: .1 }); },
  hit()     { T({ f0: 190, f1: 65, dur: .1, vol: .32 }); N({ dur: .07, vol: .14, type: 'lowpass', f0: 1800 }); },
  crit()    { T({ f0: 150, f1: 50, dur: .14, vol: .4 }); T({ f0: 900, f1: 1500, dur: .13, type: 'triangle', vol: .12 }); N({ dur: .1, vol: .22, type: 'highpass', f0: 2500 }); },
  death()   { N({ dur: .4, vol: .3, type: 'lowpass', f0: 900, f1: 90 }); T({ f0: 120, f1: 38, dur: .35, vol: .35 }); for (let i = 0; i < 4; i++) N({ dur: .03, vol: .15, type: 'highpass', f0: 3500, delay: .04 + i * .05 + Math.random() * .03 }); },
  swing()   { N({ dur: .12, vol: .1, f0: 600, f1: 1500, q: 1 }); },
  arrow()   { N({ dur: .1, vol: .1, f0: 1600, f1: 900, q: 1 }); T({ f0: 420, f1: 190, dur: .12, vol: .08, type: 'triangle' }); },
  hurt()    { T({ f0: 150, f1: 55, dur: .2, vol: .45 }); N({ dur: .13, vol: .25, f0: 450, q: 0.7 }); },
  playerDie() { T({ f0: 220, f1: 35, dur: 1.2, vol: .45, type: 'sawtooth', atk: .02 }); N({ dur: 1.0, vol: .25, type: 'lowpass', f0: 1200, f1: 60 }); },
  heart()   { T({ f0: 62, f1: 42, dur: .16, vol: .5 }); T({ f0: 58, f1: 40, dur: .15, vol: .4, delay: .17 }); },
  potion()  { for (let i = 0; i < 3; i++) T({ f0: 300 + i * 90, f1: 560 + i * 90, dur: .09, vol: .13, delay: i * .08 }); N({ dur: .25, vol: .08, f0: 900, f1: 400, q: 2 }); },
  pickup()  { T({ f0: 660, f1: 880, dur: .09, vol: .12, type: 'triangle' }); },
  pickupMagic() { T({ f0: 784, dur: .12, vol: .14, type: 'triangle' }); T({ f0: 1175, dur: .2, vol: .14, type: 'triangle', delay: .08 }); },
  pickupRare()  { [523, 659, 784, 1047].forEach((f, i) => T({ f0: f, dur: .22, vol: .15, type: 'triangle', delay: i * .07 })); },
  pickupLegend() {
    [392, 494, 587, 784, 988].forEach((f, i) => T({ f0: f, dur: .6, vol: .16, type: 'triangle', delay: i * .09, atk: .02 }));
    T({ f0: 98, f1: 70, dur: .9, vol: .4 }); N({ dur: .7, vol: .08, type: 'highpass', f0: 4500, delay: .2, atk: .2 });
  },
  levelup() { [523, 659, 784, 1047, 1319].forEach((f, i) => { T({ f0: f, dur: .5, vol: .17, type: 'triangle', delay: i * .09 }); T({ f0: f * 2, dur: .4, vol: .05, delay: i * .09 }); }); },
  bossBurst() { T({ f0: 75, f1: 32, dur: .55, vol: .55 }); N({ dur: .45, vol: .3, type: 'lowpass', f0: 1500, f1: 80 }); T({ f0: 220, f1: 110, dur: .4, type: 'sawtooth', vol: .1 }); },
  bossDie() { T({ f0: 90, f1: 28, dur: 1.5, vol: .6 }); N({ dur: 1.6, vol: .35, type: 'lowpass', f0: 1800, f1: 50 }); [262, 330, 392, 523].forEach((f, i) => T({ f0: f, dur: 1.4, vol: .12, type: 'triangle', delay: .5 + i * .12, atk: .1 })); },
  stairs()  { [220, 277, 330].forEach((f, i) => T({ f0: f, dur: 1.6, vol: .12, atk: .5, delay: i * .12 })); },
  descend() { N({ dur: 1.0, vol: .2, type: 'lowpass', f0: 600, f1: 80, atk: .05 }); T({ f0: 110, f1: 45, dur: 1.0, vol: .3 }); },
  ui()      { T({ f0: 520, f1: 700, dur: .05, vol: .1, type: 'triangle' }); },
  drip()    { T({ f0: 1500, f1: 800, dur: .09, vol: .06 }); T({ f0: 1500, f1: 800, dur: .12, vol: .03, delay: .12 }); },
  rumble()  { N({ dur: 2.2, vol: .12, type: 'lowpass', f0: 140, q: 0.5, atk: .6 }); },
};
