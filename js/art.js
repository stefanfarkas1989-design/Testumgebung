'use strict';
// Prozedurale Grafik: Texturen, Licht-Sprites und gezeichnete Figuren (keine externen Dateien)

const ART = { floor: [], face: [], roof: [], ao: {}, shadow: null, glow: {}, ready: false };
if (!CanvasRenderingContext2D.prototype.roundRect) {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h) { this.rect(x, y, w, h); };
}

function mulberry(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

function noiseOver(g, R, amount, step) {
  for (let y = 0; y < TILE; y += step) for (let x = 0; x < TILE; x += step) {
    const v = (R() - 0.5) * amount;
    g.fillStyle = v > 0 ? `rgba(255,240,230,${v / 255 * 2})` : `rgba(0,0,0,${-v / 255 * 2.4})`;
    g.fillRect(x, y, step, step);
  }
}

function genFloor(seed) {
  const c = mkCanvas(TILE, TILE), g = c.getContext('2d'), R = mulberry(seed);
  const b = 88 + R() * 12;
  g.fillStyle = `rgb(${b + 8},${b + 2},${b + 12})`; g.fillRect(0, 0, TILE, TILE);
  noiseOver(g, R, 46, 3);
  for (let i = 0; i < 4; i++) {
    const x = R() * TILE, y = R() * TILE, r = 6 + R() * 12;
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, R() < 0.3 ? 'rgba(40,70,40,.22)' : 'rgba(0,0,0,.16)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, 2 * r, 2 * r);
  }
  if (R() < 0.6) {
    g.strokeStyle = 'rgba(0,0,0,.6)'; g.lineWidth = 1; g.beginPath();
    let x = R() * TILE, y = R() * TILE; g.moveTo(x, y);
    for (let i = 0; i < 5; i++) { x += (R() - 0.5) * 18; y += (R() - 0.5) * 18; g.lineTo(x, y); }
    g.stroke();
  }
  // Fugen: ganze Platte oder 2 kleinere
  g.fillStyle = 'rgba(0,0,0,.55)';
  if (R() < 0.5) { g.fillRect(24, 0, 1, TILE); g.fillRect(0, 12 + (R() * 24 | 0), TILE, 1); }
  g.fillRect(0, TILE - 1, TILE, 1); g.fillRect(TILE - 1, 0, 1, TILE);
  g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(0, 0, TILE, 1); g.fillRect(0, 0, 1, TILE);
  return c;
}

function genFace(seed) {
  const c = mkCanvas(TILE, TILE), g = c.getContext('2d'), R = mulberry(seed);
  g.fillStyle = '#1c1620'; g.fillRect(0, 0, TILE, TILE);
  for (let row = 0; row < 4; row++) {
    const off = (row % 2) * 12;
    for (let x = -off; x < TILE; x += 24) {
      const s = 78 + R() * 26;
      g.fillStyle = `rgb(${s + 14},${s - 4},${s - 6})`;
      g.fillRect(x + 1, row * 12 + 1, 22, 10);
      g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(x + 1, row * 12 + 1, 22, 1);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + 1, row * 12 + 10, 22, 1);
    }
  }
  noiseOver(g, R, 36, 3);
  // Oberkante und Fuß-Schatten
  let gr = g.createLinearGradient(0, 0, 0, 8);
  gr.addColorStop(0, 'rgba(210,195,230,.5)'); gr.addColorStop(1, 'rgba(210,195,230,0)');
  g.fillStyle = gr; g.fillRect(0, 0, TILE, 8);
  gr = g.createLinearGradient(0, TILE - 14, 0, TILE);
  gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.6)');
  g.fillStyle = gr; g.fillRect(0, TILE - 14, TILE, 14);
  return c;
}

function genRoof(seed) {
  const c = mkCanvas(TILE, TILE), g = c.getContext('2d'), R = mulberry(seed);
  g.fillStyle = 'rgb(46,40,54)'; g.fillRect(0, 0, TILE, TILE);
  noiseOver(g, R, 40, 4);
  g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, TILE, 1); g.fillRect(0, 0, 1, TILE);
  return c;
}

function genAO() {
  const mk = (w, h, x0, y0, x1, y1, a) => {
    const c = mkCanvas(w, h), g = c.getContext('2d');
    const gr = g.createLinearGradient(x0, y0, x1, y1);
    gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    return c;
  };
  ART.ao.N = mk(TILE, TILE, 0, 0, 0, 18, 0.6);
  ART.ao.W = mk(TILE, TILE, 0, 0, 10, 0, 0.5);
  ART.ao.E = mk(TILE, TILE, TILE, 0, TILE - 10, 0, 0.5);
}

// Weiche Lichtkugel in beliebiger Farbe ('r,g,b')
function glowSprite(color) {
  let c = ART.glow[color];
  if (c) return c;
  c = ART.glow[color] = mkCanvas(128, 128);
  const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, `rgba(${color},1)`); gr.addColorStop(0.25, `rgba(${color},.55)`);
  gr.addColorStop(0.55, `rgba(${color},.18)`); gr.addColorStop(1, `rgba(${color},0)`);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  return c;
}

function initArt() {
  for (let i = 0; i < 8; i++) ART.floor.push(genFloor(101 + i * 17));
  for (let i = 0; i < 4; i++) ART.face.push(genFace(555 + i * 31));
  for (let i = 0; i < 3; i++) ART.roof.push(genRoof(999 + i * 7));
  genAO();
  ART.shadow = mkCanvas(64, 32);
  const g = ART.shadow.getContext('2d');
  g.translate(32, 16); g.scale(1, 0.5);
  const gr = g.createRadialGradient(0, 0, 0, 0, 0, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.7)'); gr.addColorStop(0.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(-32, -32, 64, 64);
  ['255,150,60', '255,226,190', '255,140,50', '190,90,255', '140,200,255', '255,80,40', '255,255,200'].forEach(glowSprite);
  ART.ready = true;
}

// ---------- Zeichen-Helfer (arbeiten auf dem globalen ctx) ----------
function ell(x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, 6.2832); ctx.fill(); }
function ln(x1, y1, x2, y2, w, c) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
function poly(c, ...p) { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.closePath(); ctx.fill(); }
function rrect(x, y, w, h, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fill(); }

// ---------- Gegner ----------
function skeletonBody(e, lunge, gl, F, bow) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 3 : 0.4), bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.6 : 0;
  const bone = F ? '#fff' : bow ? '#cbd6ad' : '#d9d1b6', bone2 = F ? '#fff' : '#a29a80', skull = F ? '#fff' : bow ? '#dfe8c6' : '#efe8d2';
  if (bow) rrect(-10, -8 + bob, 3.5, 10, 1, F ? '#fff' : '#5a3c22');
  ln(-3, 6, -3 + w, 13, 2.2, bone2); ln(3, 6, 3 - w, 13, 2.2, bone);
  ell(0, 5 + bob, 5.5, 2.4, bone2);
  rrect(-6, -5 + bob, 12, 11, 3.5, bone);
  if (!F) for (let i = 0; i < 3; i++) ln(-4.5, -2.5 + i * 3 + bob, 4.5, -2.5 + i * 3 + bob, 1.1, '#6e6650');
  ln(-6, -3 + bob, -9.5, 3 + bob + w * 0.3, 2, bone2);
  const hx = 10 + lunge * 5, hy = 2 + bob - lunge * 7;
  ln(6, -3 + bob, hx, hy, 2.2, bone);
  if (bow) {
    ctx.strokeStyle = F ? '#fff' : '#7a5530'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(hx + 1, hy, 9, -1.2, 1.2); ctx.stroke();
    ln(hx + 1 + 9 * Math.cos(1.2), hy + 9 * Math.sin(1.2), hx + 1 + 9 * Math.cos(-1.2), hy + 9 * Math.sin(-1.2), 0.8, '#ddd');
  } else {
    ctx.save(); ctx.translate(hx, hy); ctx.rotate(-1.0 + lunge * 1.7);
    rrect(0, -1.3, 14, 2.6, 1, F ? '#fff' : '#9aa0a8'); rrect(-1, -3, 2.6, 6, 1, F ? '#fff' : '#5a4630');
    ctx.restore();
  }
  ell(0, -11 + bob, 6.4, 6, skull); rrect(-3.4, -7.5 + bob, 6.8, 3.2, 1.2, bone);
  if (!F) { ell(-2.5, -11.5 + bob, 1.9, 2.3, '#140e10'); ell(2.5, -11.5 + bob, 1.9, 2.3, '#140e10'); }
  const ec = bow ? '120,255,90' : '255,80,40';
  gl(-2.5, -11.5 + bob, 8, ec, 1.2); gl(2.5, -11.5 + bob, 8, ec, 1.2);
}

function impBody(e, lunge, gl, F) {
  const mv = e.moving, bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.4 : 0, flap = Math.sin(G.time * 22 + e.seed);
  const body = F ? '#fff' : '#c44a2a', head = F ? '#fff' : '#d85a30', wing = F ? '#fff' : '#7a2418';
  poly(wing, -3, -4 + bob, -12, -10 + bob + flap * 4, -9, 1 + bob);
  poly(wing, 3, -4 + bob, 12, -10 + bob + flap * 4, 9, 1 + bob);
  ctx.strokeStyle = body; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, 5 + bob); ctx.quadraticCurveTo(-11, 9, -9, 2 + Math.sin(G.time * 8 + e.seed) * 3); ctx.stroke();
  ln(-2, 5, -2 + Math.sin(e.walk) * 2, 10, 2, body); ln(2, 5, 2 - Math.sin(e.walk) * 2, 10, 2, body);
  ell(0, 0 + bob, 5, 6, body); ell(0, 1.5 + bob, 3, 3.8, F ? '#fff' : '#e8905a');
  const ax = 5 + lunge * 6; ln(4, -1 + bob, ax, 2 + bob - lunge * 4, 1.8, body);
  poly(F ? '#fff' : '#f0e0c0', ax, 2 + bob - lunge * 4 - 2, ax + 5, 2 + bob - lunge * 4, ax, 2 + bob - lunge * 4 + 2);
  ell(0, -8 + bob, 4.6, 4.4, head);
  poly(F ? '#fff' : '#f0e0c0', -3, -11 + bob, -5, -17 + bob, -0.8, -11.5 + bob);
  poly(F ? '#fff' : '#f0e0c0', 3, -11 + bob, 5, -17 + bob, 0.8, -11.5 + bob);
  gl(-1.8, -8.5 + bob, 6, '255,220,60', 1); gl(1.8, -8.5 + bob, 6, '255,220,60', 1);
}

function bruteBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 3 : 0.3), bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.6 : 0;
  const skin = F ? '#fff' : '#8a5a48', armor = F ? '#fff' : '#4d4d58', dark = F ? '#fff' : '#3a2820';
  rrect(-9, 5, 7, 10 + w * 0.4, 2, dark); rrect(2, 5, 7, 10 - w * 0.4, 2, dark);
  ell(0, -2 + bob, 12.5, 11, skin);
  if (!F) { ln(-10, -4 + bob, 10, 4 + bob, 3, '#3a2820'); ell(0, 3 + bob, 8, 4, 'rgba(0,0,0,.18)'); }
  ln(-11, -4 + bob, -15, 5 + bob, 5, skin);
  const hx = 14 + lunge * 6, hy = 4 + bob - lunge * 12;
  ln(10, -5 + bob, hx, hy, 5.5, skin);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-1.15 + lunge * 2.0);
  rrect(-2, -2.6, 24, 5.2, 2, F ? '#fff' : '#5a3c22'); rrect(14, -5.5, 10, 11, 3, F ? '#fff' : '#6a4a2a');
  if (!F) { poly('#9aa0a8', 16, -5.5, 18, -9, 20, -5.5); poly('#9aa0a8', 20, 5.5, 22, 9, 24, 5.5); }
  ctx.restore();
  ell(-12.5, -9 + bob, 6, 5, armor); ell(12.5, -9 + bob, 6, 5, armor);
  ell(0, -15 + bob, 6.6, 6.2, skin);
  ctx.fillStyle = armor; ctx.beginPath(); ctx.arc(0, -16 + bob, 7, Math.PI, 0); ctx.fill();
  poly(F ? '#fff' : '#d8d0b8', -6.5, -17 + bob, -11, -25 + bob, -3.5, -20 + bob);
  poly(F ? '#fff' : '#d8d0b8', 6.5, -17 + bob, 11, -25 + bob, 3.5, -20 + bob);
  gl(-2.6, -14.5 + bob, 7, '255,60,40', 1.2); gl(2.6, -14.5 + bob, 7, '255,60,40', 1.2);
}

function bossBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 4 : 0.6), bob = mv ? -Math.abs(Math.sin(e.walk)) * 2 : Math.sin(G.time * 2) * 1;
  const bone = F ? '#fff' : '#d8cfe0', bone2 = F ? '#fff' : '#9d90ab', cape = F ? '#fff' : '#3a1a52';
  const sway = Math.sin(G.time * 3 + e.seed) * 3;
  poly(cape, -14, -16 + bob, 14, -16 + bob, 24 + sway, 22, 10, 26, 0 + sway, 20, -12, 27, -24 + sway, 22);
  if (!F) poly('rgba(160,70,230,.35)', -14, -16 + bob, 14, -16 + bob, 8, 20, -8, 20);
  ln(-6, 12, -6 + w, 28, 4, bone2); ln(6, 12, 6 - w, 28, 4, bone);
  ell(0, 12 + bob, 11, 4.5, bone2);
  rrect(-13, -14 + bob, 26, 26, 6, bone);
  if (!F) {
    for (let i = 0; i < 4; i++) ln(-10, -9 + i * 5.5 + bob, 10, -9 + i * 5.5 + bob, 1.8, '#4b4058');
    ell(0, -2 + bob, 5, 6, 'rgba(190,90,255,.9)');
  }
  gl(0, -2 + bob, 22, '190,90,255', 1.6);
  ell(-14, -14 + bob, 8, 6, F ? '#fff' : '#5a3a78'); ell(14, -14 + bob, 8, 6, F ? '#fff' : '#5a3a78');
  poly(F ? '#fff' : '#c8b8e0', -18, -17 + bob, -22, -29 + bob, -11, -18 + bob);
  poly(F ? '#fff' : '#c8b8e0', 18, -17 + bob, 22, -29 + bob, 11, -18 + bob);
  ln(-14, -10 + bob, -20, 6 + bob + w * 0.3, 4.5, bone2);
  const hx = 21 + lunge * 8, hy = 6 + bob - lunge * 16;
  ln(14, -10 + bob, hx, hy, 4.5, bone);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(-1.15 + lunge * 2.2);
  rrect(-3, -2, 7, 4, 1, F ? '#fff' : '#5a4630'); rrect(-1, -6, 4, 12, 1.5, F ? '#fff' : '#c8a040');
  poly(F ? '#fff' : '#b8b0d8', 3, -3, 46, -1, 50, 0, 46, 1, 3, 3);
  ctx.restore();
  gl(hx + Math.cos(-1.15 + lunge * 2.2) * 26, hy + Math.sin(-1.15 + lunge * 2.2) * 26, 20, '190,90,255', 0.7);
  ell(0, -26 + bob, 11, 10, F ? '#fff' : '#efe8f4');
  rrect(-6, -19 + bob, 12, 5, 2, bone);
  if (!F) { ell(-4.5, -27 + bob, 3, 3.6, '#150a1c'); ell(4.5, -27 + bob, 3, 3.6, '#150a1c'); }
  gl(-4.5, -27 + bob, 12, '210,110,255', 1.8); gl(4.5, -27 + bob, 12, '210,110,255', 1.8);
  poly(F ? '#fff' : '#ffd84a', -10, -33 + bob, -10, -43 + bob, -5, -37 + bob, 0, -45 + bob, 5, -37 + bob, 10, -43 + bob, 10, -33 + bob);
}

function drawEnemy(e) {
  const d = e.def, s = e.r / d.r;
  if (Math.abs(Math.cos(e.ang)) > 0.25) e.fl = Math.cos(e.ang) >= 0 ? 1 : -1;
  const F = e.flash > 0, lunge = e.lunge > 0 ? e.lunge / 0.15 : 0;
  const gl = (lx, ly, r, c, core) => G.glows.push({ x: e.x + e.fl * lx * s, y: e.y + ly * s, r: r * s, c, core: core ? core * s : 0 });
  ctx.drawImage(ART.shadow, e.x - e.r * 1.25, e.y + e.r * 0.25, e.r * 2.5, e.r * 1.25);
  if (e.elite) G.glows.push({ x: e.x, y: e.y + e.r * 0.5, r: e.r * 2.6, c: '255,200,60', a: 0.45 });
  ctx.save();
  ctx.translate(e.x, e.y); ctx.scale(e.fl * s, s);
  switch (e.type) {
    case 'skeleton': skeletonBody(e, lunge, gl, F, false); break;
    case 'archer': skeletonBody(e, lunge, gl, F, true); break;
    case 'imp': impBody(e, lunge, gl, F); break;
    case 'brute': bruteBody(e, lunge, gl, F); break;
    case 'boss': bossBody(e, lunge, gl, F); break;
  }
  if (e.slow > 0) { ctx.globalAlpha = 0.35; ell(0, -2, d.r * 0.75, d.r * 1.1, '#8fd8ff'); ctx.globalAlpha = 1; }
  ctx.restore();

  if (e.state !== 'idle' || e.hp < e.maxHp) {
    const w = Math.max(28, e.r * 2), by = e.y - e.r * (e.boss ? 1.6 : 1.5) - 6;
    ctx.fillStyle = 'rgba(0,0,0,.75)'; ctx.fillRect(e.x - w / 2 - 1, by - 1, w + 2, 6);
    ctx.fillStyle = e.elite ? '#ffd84a' : e.boss ? '#c04bff' : '#c8323a';
    ctx.fillRect(e.x - w / 2, by, w * clamp(e.hp / e.maxHp, 0, 1), 4);
  }
  if (e.elite) {
    ctx.font = '11px system-ui'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd84a';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; const ty = e.y - e.r * 1.5 - 10;
    ctx.strokeText(e.name, e.x, ty); ctx.fillText(e.name, e.x, ty);
  }
}

// ---------- Spieler (Magier) ----------
function drawPlayer() {
  if (Math.abs(Math.cos(P.face)) > 0.2) P.fl = Math.cos(P.face) >= 0 ? 1 : -1;
  const mv = P.moving, w = Math.sin(P.walk) * (mv ? 3 : 0), bob = mv ? -Math.abs(Math.sin(P.walk)) * 1.5 : Math.sin(G.time * 2) * 0.4;
  const sway = mv ? Math.sin(P.walk) * 2 : Math.sin(G.time * 2) * 0.6;
  const gl = (lx, ly, r, c, core, a) => G.glows.push({ x: P.x + P.fl * lx, y: P.y + ly, r, c, core: core || 0, a: a || 1 });
  ctx.drawImage(ART.shadow, P.x - 17, P.y + 2, 34, 17);
  ctx.save();
  ctx.translate(P.x, P.y); ctx.scale(P.fl, 1);
  // Stiefel
  ell(-3 + w, 11, 3.2, 1.9, '#2a1a10'); ell(3 - w, 11, 3.2, 1.9, '#2a1a10');
  // Robe
  const gr = ctx.createLinearGradient(0, -8, 0, 12);
  gr.addColorStop(0, '#4a62d0'); gr.addColorStop(1, '#222c74');
  ctx.fillStyle = gr; ctx.beginPath();
  ctx.moveTo(-6, -6 + bob); ctx.lineTo(6, -6 + bob); ctx.lineTo(10 + sway, 11); ctx.lineTo(-10 + sway, 11); ctx.closePath(); ctx.fill();
  ln(-10 + sway, 10.5, 10 + sway, 10.5, 1.6, '#e8c060');
  rrect(-6.5, 1 + bob, 13, 2.2, 1, '#c9a14a');
  // Rücken-Arm
  ln(-5, -3 + bob, -8, 3 + bob, 2.6, '#2d3a8c');
  // Kapuze + Gesicht
  ell(0, -10 + bob, 7.6, 7.2, '#2d3a8c');
  ell(1.8, -9.5 + bob, 4.6, 4.4, '#0b0a14');
  gl(0.3, -10 + bob, 7, '120,220,255', 0, 1);
  ell(0.3, -10 + bob, 1, 1.2, '#bff4ff'); ell(3.6, -10 + bob, 1, 1.2, '#bff4ff');
  // Stab: Winkel in lokalen Koordinaten
  const la = P.fl > 0 ? P.face : Math.PI - P.face, hx = 6, hy = -1 + bob, len = P.castAnim > 0 ? 25 : 21;
  const tx = hx + Math.cos(la) * len, ty = hy + Math.sin(la) * len;
  ln(hx - Math.cos(la) * 5, hy - Math.sin(la) * 5, tx, ty, 2.6, '#7a4e26');
  ln(hx - Math.cos(la) * 5, hy - Math.sin(la) * 5, tx, ty, 1, '#b07a3c');
  ln(5, -3 + bob, hx, hy, 2.6, '#3b4cb0');
  ctx.restore();
  const wx = P.x + P.fl * tx, wy = P.y + ty;
  G.glows.push({ x: wx, y: wy, r: P.castAnim > 0 ? 44 : 28, c: '255,150,60', a: P.castAnim > 0 ? 1 : 0.8, core: P.castAnim > 0 ? 4.5 : 3 });
}
