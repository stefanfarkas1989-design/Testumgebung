'use strict';
// Weitere Figuren (Höhle & Lavakluft) und Dekor-Objekte

function batBody(e, lunge, gl, F) {
  const flap = Math.sin(G.time * 26 + e.seed), bob = Math.sin(G.time * 8 + e.seed) * 2 - 5;
  const body = F ? '#fff' : '#3a2c4a', wing = F ? '#fff' : '#5a4572';
  poly(wing, -3, -2 + bob, -17, -10 + bob + flap * 6, -13, 1 + bob, -7, 3 + bob);
  poly(wing, 3, -2 + bob, 17, -10 + bob + flap * 6, 13, 1 + bob, 7, 3 + bob);
  ell(0, bob, 4, 5, body); ell(0, -5 + bob, 3.6, 3.4, body);
  poly(body, -3, -7 + bob, -4.5, -12 + bob, -1, -8 + bob); poly(body, 3, -7 + bob, 4.5, -12 + bob, 1, -8 + bob);
  gl(-1.4, -5 + bob, 6, '255,60,60', 1); gl(1.4, -5 + bob, 6, '255,60,60', 1);
}

function spiderBody(e, lunge, gl, F) {
  const mv = e.moving, wk = e.walk, body = F ? '#fff' : '#2c3a2c', dark = F ? '#fff' : '#18221a', bob = mv ? -Math.abs(Math.sin(wk)) * 1 : 0;
  ctx.strokeStyle = dark; ctx.lineWidth = 1.8; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = 0; i < 4; i++) {
    const ph = Math.sin(wk * 1.2 + i * 1.6) * (mv ? 3 : 0.6), bx = -3 + i * 3;
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(bx, bob);
      ctx.lineTo(bx + (i - 1.5) * 3, sd * 8 + bob - 2 + ph * sd * 0.5);
      ctx.lineTo(bx + (i - 1.5) * 5 + ph, sd * 12 + bob + 3); ctx.stroke();
    }
  }
  ell(-5, 1 + bob, 7.5, 6, body);
  if (!F) { ell(-5, 1 + bob, 3, 2, '#7ad84a'); }
  ell(5 + lunge * 3, -1 + bob, 4.8, 4, body);
  poly(F ? '#fff' : '#d8d0b8', 9 + lunge * 3, -2 + bob, 12 + lunge * 3, 1 + bob, 9 + lunge * 3, 0 + bob);
  for (const [x, y] of [[6, -3], [8, -2], [6.5, 0], [8.5, 0.5]]) gl(x + lunge * 3, y + bob, 4.5, '120,255,90', 0.9);
}

function golemBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 2.5 : 0.2), bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.2 : 0, up = e.wind > 0;
  const stone = F ? '#fff' : '#70707a', dark = F ? '#fff' : '#4a4a54';
  rrect(-10, 6, 8, 13 + w * 0.3, 2, dark); rrect(2, 6, 8, 13 - w * 0.3, 2, dark);
  rrect(-14, -14 + bob, 28, 24, 5, stone);
  if (!F) {
    ell(-6, 0 + bob, 5, 3.5, 'rgba(60,110,60,.5)');
    ctx.strokeStyle = '#8ff0ff'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-3, -12 + bob); ctx.lineTo(1, -5 + bob); ctx.lineTo(-2, 1 + bob); ctx.lineTo(3, 8 + bob); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(7, -9 + bob); ctx.lineTo(4, -3 + bob); ctx.stroke();
  }
  gl(0, -3 + bob, 18, '110,220,255', 1);
  rrect(-6.5, -25 + bob, 13, 11, 3, stone);
  gl(-2.5, -20 + bob, 8, '110,230,255', 1.4); gl(2.5, -20 + bob, 8, '110,230,255', 1.4);
  const lift = up ? -22 : 0, sw = up ? 0 : w;
  ln(-14, -9 + bob, -18, 4 + bob + lift + sw * 0.4, 6, dark); rrect(-23, (up ? -22 : 3) + bob, 11, 11, 3, stone);
  ln(14, -9 + bob, 18 + lunge * 6, 4 + bob + lift - sw * 0.4, 6, dark); rrect(13 + lunge * 6, (up ? -22 : 3) + bob + lunge * 4, 11, 11, 3, stone);
}

function houndBody(e, lunge, gl, F) {
  const mv = e.moving || e.dashT > 0, wk = e.walk * (e.dashT > 0 ? 1.8 : 1), bob = mv ? -Math.abs(Math.sin(wk)) * 1.6 : 0;
  const body = F ? '#fff' : '#7a3420', dark = F ? '#fff' : '#4a1e12';
  for (const [x, ph] of [[-8, 0], [-5, Math.PI], [5, Math.PI * 0.5], [8, Math.PI * 1.5]]) {
    const sw = Math.sin(wk * 1.3 + ph) * (mv ? 5 : 0.5);
    ln(x, 3 + bob, x + sw, 11, 2.6, dark);
  }
  ctx.strokeStyle = body; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-10, -1 + bob); ctx.quadraticCurveTo(-17, -5, -15, -10 + Math.sin(G.time * 9 + e.seed) * 2); ctx.stroke();
  ell(0, -1 + bob, 11, 6.5, body); ell(0, 0 + bob, 7, 3, F ? '#fff' : '#a05a3a');
  ell(10 + lunge * 3, -4 + bob, 5.5, 4.5, body); ell(15 + lunge * 3, -2.5 + bob, 3.6, 2.4, dark);
  poly(dark, 6 + lunge * 3, -7 + bob, 7, -12 + bob, 10, -8 + bob); poly(dark, 9 + lunge * 3, -8 + bob, 11.5, -12 + bob, 13, -7 + bob);
  gl(11 + lunge * 3, -5 + bob, 6, '255,60,30', 1); gl(16 + lunge * 3, -2 + bob, 6, '255,130,40', 0.8);
  gl(-4, -6 + bob, 14, '255,100,30', 0, 0.6);
}

function cultistBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 2 : 0), bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.2 : Math.sin(G.time * 3 + e.seed) * 0.8;
  const cast = e.cd > e.def.atkCd - 0.35;
  const robe = F ? '#fff' : '#6a1a2c', trim = F ? '#fff' : '#d8a040';
  ctx.fillStyle = robe; ctx.beginPath(); ctx.moveTo(-5, -6 + bob); ctx.lineTo(5, -6 + bob); ctx.lineTo(9 + w * 0.4, 12); ctx.lineTo(-9 + w * 0.4, 12); ctx.closePath(); ctx.fill();
  ln(-9 + w * 0.4, 11.5, 9 + w * 0.4, 11.5, 1.4, trim);
  ell(0, -10 + bob, 6.4, 6.2, F ? '#fff' : '#3a0e1c'); ell(1.5, -9.5 + bob, 4, 3.8, '#0b0508');
  gl(0.5, -10 + bob, 7, '255,160,40', 1); gl(3.5, -10 + bob, 7, '255,160,40', 1);
  const hx = 8, hy = (cast ? -12 : -1) + bob;
  ln(5, -4 + bob, hx, hy, 2.4, robe);
  ln(hx, hy + 12, hx, hy - 14, 2, F ? '#fff' : '#4a3020');
  G.glows.push({ x: e.x + e.fl * hx * (e.r / e.def.r), y: e.y + (hy - 16) * (e.r / e.def.r), r: (cast ? 34 : 22) * (e.r / e.def.r), c: '255,130,40', a: 0.9, core: 3 });
  ln(-5, -4 + bob, -8, 3 + bob, 2.4, robe);
}

function demonBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 3 : 0.3), bob = mv ? -Math.abs(Math.sin(e.walk)) * 1.6 : 0, up = e.wind > 0;
  const skin = F ? '#fff' : '#a8301a', dark = F ? '#fff' : '#5a1810', wing = F ? '#fff' : '#3a0e0a';
  poly(wing, -6, -12 + bob, -22, -26 + bob, -20, -6 + bob, -12, 2 + bob);
  poly(wing, 6, -12 + bob, 22, -26 + bob, 20, -6 + bob, 12, 2 + bob);
  rrect(-9, 5, 7, 11 + w * 0.4, 2, dark); rrect(2, 5, 7, 11 - w * 0.4, 2, dark);
  ell(0, -2 + bob, 12, 11, skin);
  if (!F) {
    ctx.strokeStyle = '#ffb040'; ctx.lineWidth = 1.5; ctx.beginPath();
    ctx.moveTo(-5, -8 + bob); ctx.lineTo(-1, -2 + bob); ctx.lineTo(-6, 4 + bob); ctx.moveTo(5, -7 + bob); ctx.lineTo(2, 0 + bob); ctx.stroke();
  }
  gl(0, -2 + bob, 20, '255,100,30', 0, 0.8);
  const lift = up ? -20 : 0;
  ln(-11, -5 + bob, -16, 6 + bob + lift, 5, skin); ell(-17, 8 + bob + lift, 5, 4.5, dark);
  ln(11, -5 + bob, 16 + lunge * 6, 6 + bob + lift, 5, skin); ell(17 + lunge * 6, 8 + bob + lift + lunge * 3, 5, 4.5, dark);
  ell(0, -15 + bob, 6.8, 6.4, skin);
  poly(F ? '#fff' : '#e8d8b0', -5.5, -19 + bob, -10, -29 + bob, -2.5, -21 + bob);
  poly(F ? '#fff' : '#e8d8b0', 5.5, -19 + bob, 10, -29 + bob, 2.5, -21 + bob);
  gl(-2.6, -15.5 + bob, 7, '255,230,60', 1.2); gl(2.6, -15.5 + bob, 7, '255,230,60', 1.2);
}

function queenBody(e, lunge, gl, F) {
  const g3 = (lx, ly, r, c, core) => gl(lx * 3, ly * 3, r * 3, c, core ? core * 3 : 0);
  ctx.save(); ctx.scale(3, 3);
  spiderBody(e, lunge, g3, F);
  ctx.restore();
  if (!F) {
    ell(-15, 3, 8, 5, 'rgba(190,90,255,.75)');
    ell(-15, 3, 3, 2, '#e8d0ff');
  }
  gl(-15, 3, 26, '190,90,255', 0, 0.7);
  poly(F ? '#fff' : '#d8d0b8', 20, -4, 27, 1, 22, 5); poly(F ? '#fff' : '#d8d0b8', 20, 6, 28, 8, 22, 2);
  poly(F ? '#fff' : '#cdbbe8', 14, -10, 12, -22, 19, -12); poly(F ? '#fff' : '#cdbbe8', 22, -9, 26, -20, 26, -8);
  const drip = (G.time * 20 + e.seed * 7) % 14;
  ctx.globalAlpha = 0.8; ell(24, 4 + drip, 1.6, 2.4, '#8ff050'); ctx.globalAlpha = 1;
}

function lavaBody(e, lunge, gl, F) {
  const mv = e.moving, w = Math.sin(e.walk) * (mv ? 4 : 0.6), bob = mv ? -Math.abs(Math.sin(e.walk)) * 2 : Math.sin(G.time * 2);
  const dark = F ? '#fff' : '#2e1a1c', plate = F ? '#fff' : '#4e2a2c';
  rrect(-13, 10, 10, 23 + w * 0.3, 3, dark); rrect(3, 10, 10, 23 - w * 0.3, 3, dark);
  rrect(-18, -18 + bob, 36, 32, 8, plate);
  if (!F) {
    ctx.strokeStyle = '#ff9a3a'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-8, -14 + bob); ctx.lineTo(-2, -5 + bob); ctx.lineTo(-9, 3 + bob); ctx.lineTo(-4, 12 + bob);
    ctx.moveTo(8, -15 + bob); ctx.lineTo(3, -7 + bob); ctx.lineTo(10, 2 + bob); ctx.stroke();
  }
  gl(0, -2 + bob, 28, '255,110,40', 0, 1.1);
  ell(-20, -17 + bob, 10, 7, plate); ell(20, -17 + bob, 10, 7, plate);
  poly(dark, -26, -20 + bob, -30, -32 + bob, -19, -23 + bob); poly(dark, 26, -20 + bob, 30, -32 + bob, 19, -23 + bob);
  ln(-20, -12 + bob, -26, 6 + bob + w * 0.3, 6.5, dark);
  const hx = 26 + lunge * 8, hy = 6 + bob - lunge * 16, ang = -1.1 + lunge * 2.2;
  ln(20, -12 + bob, hx, hy, 6.5, dark);
  ctx.save(); ctx.translate(hx, hy); ctx.rotate(ang);
  rrect(-3, -2.5, 9, 5, 1, F ? '#fff' : '#2a2a2a'); poly(F ? '#fff' : '#e8a060', 5, -5, 58, -1.5, 63, 0, 58, 1.5, 5, 5);
  ctx.restore();
  gl(hx + Math.cos(ang) * 32, hy + Math.sin(ang) * 32, 26, '255,120,40', 0, 0.9);
  ell(0, -29 + bob, 11, 10, F ? '#fff' : '#3a2224');
  poly(F ? '#fff' : '#1c1012', -8, -34 + bob, -16, -48 + bob, -4, -37 + bob);
  poly(F ? '#fff' : '#1c1012', 8, -34 + bob, 16, -48 + bob, 4, -37 + bob);
  for (let i = -2; i <= 2; i++) {
    const fl = Math.sin(G.time * 12 + i * 1.7 + e.seed) * 3, h = 9 + (2 - Math.abs(i)) * 3 + fl;
    poly(F ? '#fff' : '#ff8a2a', i * 4 - 3, -37 + bob, i * 4 + fl * 0.4, -37 - h + bob, i * 4 + 3, -37 + bob);
  }
  gl(0, -42 + bob, 28, '255,130,40', 0, 0.8);
  gl(-4.5, -29.5 + bob, 12, '255,240,90', 2); gl(4.5, -29.5 + bob, 12, '255,240,90', 2);
}

// ---------- Dekor-Objekte ----------
const PROP_LIGHT = {
  crystal:  { r: 150, c: '110,220,255', a: 0.8 },
  mushroom: { r: 90,  c: '90,255,200',  a: 0.7 },
  candle:   { r: 100, c: '255,170,70',  a: 0.8, flick: true },
  vent:     { r: 120, c: '255,90,30',   a: 0.85, flick: true },
  geode:    { r: 70,  c: '170,120,255', a: 0.45 },
};
const PROP_BREAKABLE = { barrel: 1, urn: 1, geode: 1 };

function drawProp(p) {
  const x = p.x, y = p.y, k = p.kind, t = G.time;
  ctx.drawImage(ART.shadow, x - 17, y - 2, 34, 17);
  ctx.save(); ctx.translate(x, y);
  switch (k) {
    case 'pillar': {
      const st = G.theme.pillar;
      if (st === 'column') {
        rrect(-15, 6, 30, 10, 3, '#4a4452'); rrect(-11, -34, 22, 42, 2, '#5e586c');
        rrect(-11, -34, 5, 42, 2, '#6f6984'); rrect(6, -34, 5, 42, 2, '#48425a');
        rrect(-15, -42, 30, 10, 3, '#6a6478'); rrect(-15, -42, 30, 3, 2, '#7d7794');
        for (let i = 0; i < 3; i++) ln(-8 + i * 8, -30, -8 + i * 8, 4, 0.8, 'rgba(0,0,0,.25)');
      } else if (st === 'rock') {
        poly('#5a5448', -15, 12, -10, -10, -5, -30, 0, -46, 6, -26, 11, -8, 16, 12);
        poly('#766e60', -5, -30, 0, -46, 3, -20, -2, 6);
        poly('#3e3a32', 6, -26, 11, -8, 16, 12, 5, 12);
        ell(-2, -38, 2.5, 3, 'rgba(120,230,255,.6)');
      } else {
        poly('#1c1418', -14, 12, -9, -14, -5, -34, 0, -52, 5, -30, 10, -12, 15, 12);
        poly('#32222a', -5, -34, 0, -52, 3, -22, -3, 10);
        ctx.strokeStyle = '#ff7a2a'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(1, -40); ctx.lineTo(-3, -22); ctx.lineTo(2, -8); ctx.stroke();
        G.glows.push({ x, y: y - 20, r: 40, c: '255,100,30', a: 0.5 });
      }
      break;
    }
    case 'barrel':
      ell(0, 7, 10, 4, '#3a2412'); rrect(-9, -12, 18, 19, 5, '#6a4a2a'); rrect(-9, -12, 5, 19, 3, '#7e5a34');
      rrect(-9.5, -7, 19, 2.4, 1, '#2a2a30'); rrect(-9.5, 1, 19, 2.4, 1, '#2a2a30'); ell(0, -12, 9, 3.5, '#8a6438'); break;
    case 'urn':
      ell(0, 7, 8, 3.5, '#3a2412'); ell(0, -1, 9, 9, '#8a5a3a'); ell(-3, -3, 3, 5, 'rgba(255,220,180,.25)');
      rrect(-4, -14, 8, 7, 2, '#7a4e30'); ell(0, -14, 5.5, 2, '#5a3a22'); ln(-9, -2, -12, 1, 2, '#7a4e30'); ln(9, -2, 12, 1, 2, '#7a4e30'); break;
    case 'geode':
      poly('#5a5a62', -11, 7, -9, -6, -2, -12, 7, -9, 11, 0, 9, 7); poly('#7a7a84', -2, -12, 7, -9, 3, -2);
      poly('#b89cff', -4, 0, -2, -8, 0, 0); poly('#8ff0ff', 1, 2, 3, -6, 6, 2); G.glows.push({ x, y: y - 2, r: 26, c: '170,120,255', a: 0.5 }); break;
    case 'bones':
      for (const b of p.bits) ln(b[0], b[1], b[0] + Math.cos(b[2]) * 6, b[1] + Math.sin(b[2]) * 3, 1.8, '#cfc7aa');
      ell(p.bits[0][0], p.bits[0][1] - 2, 4, 3.4, '#e4dcc4'); ell(p.bits[0][0] - 1.2, p.bits[0][1] - 2.4, 0.9, 1.1, '#201814'); ell(p.bits[0][0] + 1.2, p.bits[0][1] - 2.4, 0.9, 1.1, '#201814'); break;
    case 'rubble':
      for (const b of p.bits) poly('#6a6470', b[0] - 4, b[1] + 2, b[0] - 2, b[1] - 3, b[0] + 3, b[1] - 2, b[0] + 4, b[1] + 2); break;
    case 'candle': {
      const fl = Math.sin(t * 13 + p.seed);
      rrect(-2.5, -6, 5, 9, 1, '#e8dcc0'); ell(0, 3, 6, 2.4, '#3a2c1c');
      ctx.fillStyle = '#ffb040'; ctx.beginPath(); ctx.ellipse(fl * 0.5, -10, 2, 3.4 + fl * 0.5, 0, 0, 6.283); ctx.fill();
      G.glows.push({ x, y: y - 10, r: 22, c: '255,170,70', a: 0.7 }); break;
    }
    case 'crystal': {
      const pu = 0.8 + 0.2 * Math.sin(t * 2 + p.seed);
      poly('#4aa8c8', -9, 6, -6, -14, -2, 6); poly('#7ad8f0', -2, 6, 1, -26, 6, 6); poly('#a878e8', 5, 6, 8, -12, 11, 6);
      poly('rgba(255,255,255,.35)', 1, -26, 3, -14, 1, 4);
      G.glows.push({ x, y: y - 10, r: 38, c: '110,220,255', a: 0.55 * pu }); break;
    }
    case 'mushroom': {
      const pu = 0.75 + 0.25 * Math.sin(t * 2.4 + p.seed);
      rrect(-1.6, -6, 3.2, 10, 1, '#c8e8d8'); ell(0, -8, 8, 5, '#3ad8b0'); ell(-2, -9.5, 2, 1.2, 'rgba(255,255,255,.5)');
      rrect(8, -2, 2.4, 7, 1, '#c8e8d8'); ell(9.2, -3, 4.5, 3, '#4ac8e8');
      G.glows.push({ x, y: y - 6, r: 30, c: '90,255,200', a: 0.6 * pu }); break;
    }
    case 'spike':
      poly('#1c1418', -8, 6, -4, -8, 0, -18, 3, -6, 7, 6); poly('#32222a', 0, -18, 3, -6, 0, 6, -2, 0); break;
    case 'vent': {
      const pu = 0.7 + 0.3 * Math.sin(t * 3 + p.seed);
      ell(0, 2, 11, 5, '#1c1418'); ell(0, 2, 8, 3.2, '#ff5a1e'); ell(0, 2, 4, 1.6, '#ffd060');
      G.glows.push({ x, y, r: 34, c: '255,100,30', a: 0.7 * pu }); break;
    }
  }
  ctx.restore();
}
