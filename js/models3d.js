'use strict';
// 3D-Figuren aus einfachen Formen (Low-Poly). Alle Modelle schauen lokal nach +X.
// Einheiten entsprechen den Spielkoordinaten (Pixel).

const M3 = { mats: {}, geos: {}, cur: null };

// Feine Körnung für alle Oberflächen: bricht das Plastik-Aussehen
function detailTex() {
  if (M3.detail) return M3.detail;
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), R = mulberry(4242);
  for (let y = 0; y < 64; y += 2) for (let x = 0; x < 64; x += 2) {
    const v = 190 + R() * 65 | 0;
    g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, y, 2, 2);
  }
  g.strokeStyle = 'rgba(0,0,0,.22)'; g.lineWidth = 1;
  for (let i = 0; i < 14; i++) { const x = R() * 64, y = R() * 64; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (R() - 0.5) * 22, y + (R() - 0.5) * 22); g.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace;
  return M3.detail = t;
}
function lam(color, emissive, ei) {
  const k = color + '|' + (emissive || 0) + '|' + (ei || 0);
  if (M3.mats[k]) return M3.mats[k];
  const d = detailTex();
  return M3.mats[k] = new THREE.MeshLambertMaterial({ color, emissive: emissive || 0, emissiveIntensity: ei || 1, map: d, bumpMap: d, bumpScale: 1.6 });
}
function bas(color) {
  const k = 'b' + color;
  return M3.mats[k] || (M3.mats[k] = new THREE.MeshBasicMaterial({ color }));
}
function geo(key, make) { return M3.geos[key] || (M3.geos[key] = make()); }
const UNIT_SPH = () => geo('sph', () => new THREE.SphereGeometry(1, 10, 8));

function addMesh(parent, g, m, x, y, z) {
  const me = new THREE.Mesh(g, m);
  me.position.set(x || 0, y || 0, z || 0);
  parent.add(me);
  if (M3.cur) M3.cur.meshes.push(me);
  return me;
}
function bx(p, w, h, d, m, x, y, z) { return addMesh(p, geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d)), m, x, y, z); }
function sp(p, r, m, x, y, z, sx, sy, sz) { const me = addMesh(p, UNIT_SPH(), m, x, y, z); me.scale.set(r * (sx || 1), r * (sy || 1), r * (sz || 1)); return me; }
function cy(p, rt, rb, h, m, x, y, z, seg) { return addMesh(p, geo(`c${rt},${rb},${h},${seg || 8}`, () => new THREE.CylinderGeometry(rt, rb, h, seg || 8)), m, x, y, z); }
function cn(p, r, h, m, x, y, z, seg) { return addMesh(p, geo(`k${r},${h},${seg || 6}`, () => new THREE.ConeGeometry(r, h, seg || 6)), m, x, y, z); }
function pv(p, x, y, z) { const g = new THREE.Group(); g.position.set(x || 0, y || 0, z || 0); p.add(g); return g; }
function glowAt(x, y, z, size, color, alpha) { M3.cur.glows.push({ x, y, z, size, color, a: alpha === undefined ? 1 : alpha }); }

function newRig() {
  const g = new THREE.Group();
  M3.cur = { group: g, meshes: [], glows: [], parts: {}, anim: null, state: 'norm' };
  // Schatten-Blob
  const sh = new THREE.Mesh(geo('shadowPlane', () => new THREE.PlaneGeometry(1, 1)), M3.shadowMat);
  sh.rotation.x = -Math.PI / 2; sh.position.y = 0.6; sh.renderOrder = 1;
  g.add(sh); M3.cur.shadow = sh;
  return M3.cur;
}
function finishRig(r) {
  for (const m of r.meshes) m.userData.m0 = m.material;
  M3.cur = null;
  return r;
}

// Bewegungs-Zustand für Animationen
function stOf(e) {
  const mv = e.moving || e.dashT > 0;
  const walk = e.walk * (e.dashT > 0 ? 1.8 : 1);
  return { mv, w: Math.sin(walk) * (mv ? 0.75 : 0.05), bob: mv ? Math.abs(Math.sin(walk)) * 1.6 : 0, lunge: e.lunge > 0 ? e.lunge / 0.15 : 0, wind: e.wind > 0, walk };
}

// ---------- Humanoide: Skelett / Schütze ----------
function rigSkeleton(bow) {
  const r = newRig(), g = r.group;
  const bone = lam(bow ? 0xcbd6ad : 0xd9d1b6), bone2 = lam(0xa29a80), rib = lam(0x6e6650), dark = lam(0x140e10);
  r.legL = pv(g, 0, 14, -3.5); r.legR = pv(g, 0, 14, 3.5);
  cy(r.legL, 1.5, 1.3, 14, bone2, 0, -7, 0, 6); cy(r.legR, 1.5, 1.3, 14, bone, 0, -7, 0, 6);
  bx(g, 4, 3, 10, bone2, 0, 15, 0);
  r.torso = pv(g, 0, 16, 0);
  bx(r.torso, 7, 13, 11, bone, 0, 6.5, 0);
  for (let i = 0; i < 3; i++) bx(r.torso, 0.8, 1, 10, rib, 3.7, 3 + i * 3.5, 0);
  r.armL = pv(r.torso, 0, 12, -6.5); r.armR = pv(r.torso, 0, 12, 6.5);
  cy(r.armL, 1.3, 1.1, 12, bone2, 0, -6, 0, 6); cy(r.armR, 1.3, 1.1, 12, bone, 0, -6, 0, 6);
  r.head = pv(r.torso, 0, 17, 0);
  sp(r.head, 5.5, bone, 0, 2, 0); bx(r.head, 3.4, 2.2, 5, bone, 2.2, -2.4, 0);
  bx(r.head, 1, 2.2, 1.8, dark, 4.9, 2.6, -2.1); bx(r.head, 1, 2.2, 1.8, dark, 4.9, 2.6, 2.1);
  const ec = bow ? 0x78ff5a : 0xff5028;
  sp(r.head, 0.9, bas(ec), 5.2, 2.6, -2.1); sp(r.head, 0.9, bas(ec), 5.2, 2.6, 2.1);
  const col = bow ? '120,255,90' : '255,80,40';
  glowAt(5.5, 35.5, -2.1, 11, col); glowAt(5.5, 35.5, 2.1, 11, col);
  if (bow) {
    const hand = pv(r.armR, 0, -12, 0);
    const arc = addMesh(hand, geo('bowTorus', () => new THREE.TorusGeometry(9, 0.8, 4, 10, Math.PI)), lam(0x7a5530), 2, 0, 0);
    arc.rotation.z = -Math.PI / 2;
    bx(hand, 0.3, 18, 0.3, lam(0xdddddd), -6.8, 0, 0);
    bx(r.torso, 3.5, 10, 3.5, lam(0x5a3c22), -5, 7, -4).rotation.z = 0.3;
  } else {
    const hand = pv(r.armR, 0, -12, 0);
    bx(hand, 17, 2, 1.2, lam(0x9aa0a8), 8.5, 0, 0); bx(hand, 1.4, 1.4, 6, lam(0x5a4630), 0, 0, 0);
  }
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w; r.legR.rotation.z = -s.w;
    r.armL.rotation.z = -s.w * 0.8;
    r.armR.rotation.z = bow ? 1.4 : (s.w * 0.8 + (s.lunge ? 0.5 + 1.9 * s.lunge : 0.5));
    r.torso.position.y = 16 + s.bob;
  };
  return finishRig(r);
}

function rigImp() {
  const r = newRig(), g = r.group;
  const body = lam(0xc44a2a), belly = lam(0xe8905a), horn = lam(0xf0e0c0), wing = lam(0x7a2418);
  r.legL = pv(g, 0, 8, -2); r.legR = pv(g, 0, 8, 2);
  cy(r.legL, 1.1, 0.9, 8, body, 0, -4, 0, 5); cy(r.legR, 1.1, 0.9, 8, body, 0, -4, 0, 5);
  r.torso = pv(g, 0, 8, 0);
  sp(r.torso, 5, body, 0, 5, 0, 0.9, 1.15, 0.9); sp(r.torso, 3, belly, 1.5, 4.5, 0, 0.8, 1.1, 0.8);
  r.head = pv(r.torso, 0, 12, 0);
  sp(r.head, 4.4, body, 0, 0, 0);
  cn(r.head, 1.3, 6, horn, 0, 5, -2.8, 5).rotation.x = -0.4; cn(r.head, 1.3, 6, horn, 0, 5, 2.8, 5).rotation.x = 0.4;
  sp(r.head, 0.9, bas(0xffdc3c), 3.9, 0.8, -1.8); sp(r.head, 0.9, bas(0xffdc3c), 3.9, 0.8, 1.8);
  glowAt(4, 21, -1.8, 9, '255,220,60'); glowAt(4, 21, 1.8, 9, '255,220,60');
  r.armR = pv(r.torso, 0, 9, 4.5); cy(r.armR, 1, 0.9, 7, body, 0, -3.5, 0, 5); cn(r.armR, 1.4, 5, horn, 1.5, -8, 0, 4).rotation.z = -1.57;
  r.armL = pv(r.torso, 0, 9, -4.5); cy(r.armL, 1, 0.9, 7, body, 0, -3.5, 0, 5);
  r.wingL = pv(r.torso, -2, 9, -3); r.wingR = pv(r.torso, -2, 9, 3);
  bx(r.wingL, 9, 0.5, 14, wing, -2, 0, -7); bx(r.wingR, 9, 0.5, 14, wing, -2, 0, 7);
  r.tail = pv(r.torso, -4, 3, 0); cy(r.tail, 0.8, 0.5, 10, body, -4, 0, 0, 4).rotation.z = 1.4;
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w; r.legR.rotation.z = -s.w;
    const fl = Math.sin(G.time * 22 + e.seed) * 0.7;
    r.wingL.rotation.x = 0.25 + fl; r.wingR.rotation.x = -0.25 - fl;
    r.armR.rotation.z = s.lunge ? 0.6 + 1.7 * s.lunge : 0.4;
    r.torso.position.y = 8 + s.bob;
    r.tail.rotation.y = Math.sin(G.time * 8 + e.seed) * 0.5;
  };
  return finishRig(r);
}

function rigBat() {
  const r = newRig(), g = r.group;
  const body = lam(0x3a2c4a), wing = lam(0x5a4572);
  r.torso = pv(g, 0, 12, 0);
  sp(r.torso, 4, body, 0, 0, 0, 1, 1.2, 1); sp(r.torso, 3.4, body, 3, 3, 0);
  cn(r.torso, 1.3, 4, body, 3, 7, -2, 4); cn(r.torso, 1.3, 4, body, 3, 7, 2, 4);
  sp(r.torso, 0.8, bas(0xff3c3c), 5.6, 3.6, -1.3); sp(r.torso, 0.8, bas(0xff3c3c), 5.6, 3.6, 1.3);
  glowAt(5.6, 15.6, -1.3, 8, '255,60,60'); glowAt(5.6, 15.6, 1.3, 8, '255,60,60');
  r.wingL = pv(r.torso, 0, 1, -3); r.wingR = pv(r.torso, 0, 1, 3);
  bx(r.wingL, 9, 0.5, 17, wing, -1, 0, -8.5); bx(r.wingR, 9, 0.5, 17, wing, -1, 0, 8.5);
  r.anim = (e, s) => {
    const fl = Math.sin(G.time * 26 + e.seed) * 0.9;
    r.wingL.rotation.x = fl; r.wingR.rotation.x = -fl;
    r.torso.position.y = 12 + Math.sin(G.time * 8 + e.seed) * 2;
  };
  return finishRig(r);
}

function rigSpider(scaleUp) {
  const r = newRig(), g = r.group;
  const body = lam(0x2c3a2c), dark = lam(0x18221a);
  r.torso = pv(g, 0, 7, 0);
  sp(r.torso, 7.5, body, -6, 1, 0, 1, 0.8, 0.9); sp(r.torso, 3, lam(0x7ad84a, 0x3a6a20, 1), -6, 5.5, 0, 1.3, 0.5, 1);
  sp(r.torso, 4.6, body, 5, 0, 0, 1, 0.85, 0.9);
  cn(r.torso, 0.9, 4, lam(0xd8d0b8), 9, -2, -1.8, 4).rotation.z = -1.57; cn(r.torso, 0.9, 4, lam(0xd8d0b8), 9, -2, 1.8, 4).rotation.z = -1.57;
  for (const [x, y, z] of [[7.5, 1.5, -1.4], [8.4, 1.5, 1.4], [7, 3, -0.6], [7.6, 3, 0.8]]) sp(r.torso, 0.8, bas(0x78ff5a), x, y, z);
  glowAt(8, 8.5, -1.2, 9, '120,255,90'); glowAt(8, 8.5, 1.2, 9, '120,255,90');
  r.legs = [];
  for (let i = 0; i < 4; i++) for (const sd of [-1, 1]) {
    const hip = pv(r.torso, -3 + i * 3, 0, sd * 3);
    hip.rotation.y = (i - 1.5) * 0.45 * sd;
    const up = pv(hip, 0, 0, 0); up.rotation.x = sd * -0.9;
    cy(up, 0.9, 0.8, 9, dark, 0, 4.5, 0, 4);
    const lo = pv(up, 0, 9, 0); lo.rotation.x = sd * 1.7;
    cy(lo, 0.8, 0.4, 11, dark, 0, 5.5, 0, 4);
    r.legs.push({ hip, base: hip.rotation.y, ph: i * 1.6 + (sd > 0 ? 0 : 1.2) });
  }
  r.anim = (e, s) => {
    for (const l of r.legs) l.hip.rotation.y = l.base + Math.sin(s.walk * 1.2 + l.ph) * (s.mv ? 0.4 : 0.05);
    r.torso.position.y = 7 + s.bob * 0.4;
    r.torso.position.x = s.lunge * 3;
  };
  return finishRig(r);
}

function rigGolem() {
  const r = newRig(), g = r.group;
  const st = lam(0x70707a), dk = lam(0x4a4a54), cr = lam(0x8ff0ff, 0x3ab8d8, 1);
  r.legL = pv(g, 0, 15, -5.5); r.legR = pv(g, 0, 15, 5.5);
  bx(r.legL, 8, 15, 8, dk, 0, -7.5, 0); bx(r.legR, 8, 15, 8, dk, 0, -7.5, 0);
  r.torso = pv(g, 0, 15, 0);
  bx(r.torso, 18, 24, 28, st, 0, 12, 0); bx(r.torso, 1, 20, 1.5, cr, 9.2, 12, 3); bx(r.torso, 1, 12, 1.5, cr, 9.2, 8, -6);
  glowAt(10, 27, 0, 22, '110,220,255', 0.9);
  r.head = pv(r.torso, 0, 24, 0);
  bx(r.head, 11, 11, 13, st, 0, 5, 0); bx(r.head, 1, 2, 3, bas(0x8ff0ff), 5.6, 6, -3); bx(r.head, 1, 2, 3, bas(0x8ff0ff), 5.6, 6, 3);
  glowAt(6, 45, -3, 10, '110,230,255'); glowAt(6, 45, 3, 10, '110,230,255');
  for (const z of [-12, 12]) cn(r.torso, 3, 11, cr, 0, 28, z, 5);
  r.armL = pv(r.torso, 0, 22, -16); r.armR = pv(r.torso, 0, 22, 16);
  for (const a of [r.armL, r.armR]) { bx(a, 7, 17, 7, dk, 0, -8.5, 0); bx(a, 11, 11, 11, st, 0, -20, 0); }
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w * 0.7; r.legR.rotation.z = -s.w * 0.7;
    const up = e.wind > 0;
    r.armL.rotation.z = up ? 2.9 : -s.w * 0.5; r.armR.rotation.z = up ? 2.9 : s.w * 0.5 + (s.lunge ? 1.2 * s.lunge : 0);
    r.torso.position.y = 15 + s.bob * 0.6;
  };
  return finishRig(r);
}

function rigHound() {
  const r = newRig(), g = r.group;
  const body = lam(0x7a3420), dk = lam(0x4a1e12), lt = lam(0xa05a3a);
  r.torso = pv(g, 0, 11, 0);
  sp(r.torso, 1, body, 0, 0, 0, 11, 6, 6.5); sp(r.torso, 1, lt, 1, -2.5, 0, 7, 3, 4.5);
  r.head = pv(r.torso, 10, 3, 0);
  sp(r.head, 5.2, body, 0, 0, 0, 1, 0.9, 0.9); sp(r.head, 1, dk, 5, -1.2, 0, 4, 2.4, 3);
  cn(r.head, 1.6, 5, dk, -1, 5, -2.6, 4); cn(r.head, 1.6, 5, dk, -1, 5, 2.6, 4);
  sp(r.head, 0.9, bas(0xff3c1e), 3.5, 1.4, -2.2); sp(r.head, 0.9, bas(0xff3c1e), 3.5, 1.4, 2.2);
  glowAt(13.5, 15.4, -2.2, 10, '255,60,30'); glowAt(13.5, 15.4, 2.2, 10, '255,60,30');
  glowAt(-2, 18, 0, 26, '255,100,30', 0.55);
  r.tail = pv(r.torso, -10, 1, 0); cy(r.tail, 1.2, 0.6, 10, body, -4, 3, 0, 4).rotation.z = 1.0;
  r.legs = [];
  for (const [x, z, ph] of [[-7, -3.5, 0], [-7, 3.5, 3.1], [7, -3.5, 1.6], [7, 3.5, 4.7]]) {
    const l = pv(g, x, 9, z); cy(l, 1.5, 1.1, 10, dk, 0, -5, 0, 5); r.legs.push({ p: l, ph });
  }
  r.anim = (e, s) => {
    const amp = s.mv ? 1.0 : 0.05, w = s.walk * 1.4;
    for (const l of r.legs) l.p.rotation.z = Math.sin(w + l.ph) * amp;
    r.torso.position.y = 11 + s.bob * 0.8;
    r.tail.rotation.y = Math.sin(G.time * 9 + e.seed) * 0.5;
    r.head.rotation.z = s.lunge ? -0.4 * s.lunge : 0;
  };
  return finishRig(r);
}

function rigCultist() {
  const r = newRig(), g = r.group;
  const robe = lam(0x6a1a2c), trim = lam(0xd8a040), dark = lam(0x0b0508);
  r.torso = pv(g, 0, 0, 0);
  cy(r.torso, 3.6, 9, 24, robe, 0, 12, 0, 10); cy(r.torso, 9.2, 9.2, 1.4, trim, 0, 1, 0, 10);
  r.head = pv(r.torso, 0, 26, 0);
  sp(r.head, 6.3, lam(0x3a0e1c), 0, 0, 0); sp(r.head, 4, dark, 2.4, -0.4, 0, 1, 1, 1);
  sp(r.head, 0.9, bas(0xffa028), 5.4, 0, -1.8); sp(r.head, 0.9, bas(0xffa028), 5.4, 0, 1.8);
  glowAt(5.5, 26, -1.8, 10, '255,160,40'); glowAt(5.5, 26, 1.8, 10, '255,160,40');
  r.armL = pv(r.torso, 0, 21, -5.5); cy(r.armL, 1.6, 1.3, 10, robe, 0, -5, 0, 5);
  r.armR = pv(r.torso, 0, 21, 5.5); cy(r.armR, 1.6, 1.3, 10, robe, 0, -5, 0, 5);
  const staff = pv(r.armR, 0, -10, 0);
  cy(staff, 0.8, 0.8, 30, lam(0x4a3020), 0, 8, 0, 5);
  sp(staff, 3, bas(0xff8228), 0, 24, 0);
  r.orb = { x: 0, y: 0, z: 0, ref: staff };
  r.anim = (e, s) => {
    const cast = e.cd > e.def.atkCd - 0.35;
    r.armR.rotation.z = cast ? 1.9 : 0.25; r.armL.rotation.z = -0.25;
    r.torso.position.y = s.bob * 0.5 + Math.sin(G.time * 3 + e.seed) * 0.6;
    r.torso.rotation.z = s.mv ? Math.sin(s.walk) * 0.05 : 0;
    r.glowExtra = cast ? 1.5 : 1;
  };
  r.extraGlows = (e, out) => { out.push({ x: 4, y: 34, z: 5.5, size: (e.cd > e.def.atkCd - 0.35) ? 40 : 26, color: '255,130,40', a: 0.9 }); };
  return finishRig(r);
}

function rigBrute(variant) {
  const r = newRig(), g = r.group;
  const demon = variant === 'demon';
  const skin = lam(demon ? 0xa8301a : 0x8a5a48), dk = lam(demon ? 0x5a1810 : 0x3a2820), arm = lam(0x4d4d58);
  r.legL = pv(g, 0, 14, -5); r.legR = pv(g, 0, 14, 5);
  bx(r.legL, 7, 14, 7, dk, 0, -7, 0); bx(r.legR, 7, 14, 7, dk, 0, -7, 0);
  r.torso = pv(g, 0, 14, 0);
  sp(r.torso, 1, skin, 0, 11, 0, 9, 11, 12.5);
  if (demon) {
    bx(r.torso, 1, 14, 1.4, lam(0xffb040, 0xffa020, 1), 8.6, 11, -3); bx(r.torso, 1, 9, 1.4, lam(0xffb040, 0xffa020, 1), 8.6, 9, 4);
    glowAt(9, 25, 0, 30, '255,100,30', 0.6);
    const w1 = bx(r.torso, 1, 22, 20, lam(0x3a0e0a), -8, 18, -9); w1.rotation.x = 0.5; w1.rotation.z = 0.3;
    const w2 = bx(r.torso, 1, 22, 20, lam(0x3a0e0a), -8, 18, 9); w2.rotation.x = -0.5; w2.rotation.z = 0.3;
  } else {
    bx(r.torso, 1, 3, 26, lam(0x3a2820), 8, 14, 0).rotation.z = 0.2;
    for (const z of [-12.5, 12.5]) sp(r.torso, 6, arm, 0, 19, z, 1, 0.85, 1);
  }
  r.head = pv(r.torso, 0, 24, 0);
  sp(r.head, 6.4, skin, 0, 3, 0);
  if (!demon) sp(r.head, 7, arm, 0, 4.5, 0, 1, 0.75, 1);
  const hc = lam(demon ? 0xe8d8b0 : 0xd8d0b8);
  cn(r.head, 2.2, 10, hc, 0, 8, -6, 5).rotation.x = -0.6; cn(r.head, 2.2, 10, hc, 0, 8, 6, 5).rotation.x = 0.6;
  const ec = demon ? 0xffe63c : 0xff3c28;
  sp(r.head, 1, bas(ec), 5.8, 3.4, -2.5); sp(r.head, 1, bas(ec), 5.8, 3.4, 2.5);
  const gc = demon ? '255,230,60' : '255,60,40';
  glowAt(6, 41, -2.5, 12, gc); glowAt(6, 41, 2.5, 12, gc);
  r.armL = pv(r.torso, 0, 20, -13); r.armR = pv(r.torso, 0, 20, 13);
  for (const a of [r.armL, r.armR]) { cy(a, 3, 2.6, 14, skin, 0, -7, 0, 6); sp(a, 4.5, dk, 0, -15, 0); }
  if (!demon) {
    const club = pv(r.armR, 0, -15, 0);
    cy(club, 2, 2.6, 24, lam(0x5a3c22), 12, 0, 0, 6).rotation.z = Math.PI / 2;
    bx(club, 8, 9, 9, lam(0x6a4a2a), 25, 0, 0);
    cn(club, 1.8, 4, lam(0x9aa0a8), 25, 6, 0, 4); cn(club, 1.8, 4, lam(0x9aa0a8), 25, -6, 0, 4).rotation.z = Math.PI;
  }
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w * 0.9; r.legR.rotation.z = -s.w * 0.9;
    const up = e.wind > 0;
    r.armL.rotation.z = up ? 2.9 : -s.w * 0.8;
    r.armR.rotation.z = up ? 2.9 : s.w * 0.8 + (s.lunge ? 0.4 + 1.9 * s.lunge : 0.4);
    r.torso.position.y = 14 + s.bob;
  };
  return finishRig(r);
}

function rigBoneLord() {
  const r = newRig(), g = r.group;
  const bone = lam(0xd8cfe0), bone2 = lam(0x9d90ab), cape = lam(0x3a1a52), pur = lam(0xbe5aff, 0x9a3adf, 1), gold = lam(0xffd84a, 0x886600, 0.6);
  r.legL = pv(g, 0, 26, -7); r.legR = pv(g, 0, 26, 7);
  cy(r.legL, 3.4, 2.6, 26, bone2, 0, -13, 0, 6); cy(r.legR, 3.4, 2.6, 26, bone, 0, -13, 0, 6);
  r.torso = pv(g, 0, 26, 0);
  bx(r.torso, 14, 28, 26, bone, 0, 14, 0);
  for (let i = 0; i < 4; i++) bx(r.torso, 1.2, 1.8, 22, lam(0x4b4058), 7.2, 5 + i * 6, 0);
  sp(r.torso, 4, bas(0xc060ff), 7.5, 14, 0, 0.8, 1.2, 1.2);
  glowAt(8, 40, 0, 46, '190,90,255', 1);
  const cp = bx(r.torso, 1.5, 38, 30, cape, -8, 12, 0); cp.rotation.z = 0.12;
  for (const z of [-15, 15]) { sp(r.torso, 8, lam(0x5a3a78), 0, 28, z, 1, 0.75, 1); cn(r.torso, 2.6, 12, bone, 0, 38, z, 5); }
  r.head = pv(r.torso, 0, 31, 0);
  sp(r.head, 10.5, lam(0xefe8f4), 0, 4, 0); bx(r.head, 6, 5, 12, bone, 4, -5, 0);
  bx(r.head, 1.2, 6, 4, lam(0x150a1c), 10, 5, -4.5); bx(r.head, 1.2, 6, 4, lam(0x150a1c), 10, 5, 4.5);
  sp(r.head, 1.8, bas(0xd26eff), 10.2, 5, -4.5); sp(r.head, 1.8, bas(0xd26eff), 10.2, 5, 4.5);
  glowAt(10.5, 66, -4.5, 22, '210,110,255'); glowAt(10.5, 66, 4.5, 22, '210,110,255');
  for (let i = 0; i < 5; i++) cn(r.head, 2.2, 8 + (i % 2) * 3, gold, 0, 14, -8 + i * 4, 4);
  r.armL = pv(r.torso, 0, 26, -16); r.armR = pv(r.torso, 0, 26, 16);
  cy(r.armL, 2.6, 2.2, 22, bone2, 0, -11, 0, 6); cy(r.armR, 2.6, 2.2, 22, bone, 0, -11, 0, 6);
  const hand = pv(r.armR, 0, -22, 0);
  bx(hand, 46, 4, 1.6, lam(0xb8b0d8, 0x6a50c0, 0.6), 26, 0, 0); bx(hand, 3, 3, 12, lam(0xc8a040), 3, 0, 0);
  glowAt(30, 4, 0, 40, '190,90,255', 0.8);
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w * 0.7; r.legR.rotation.z = -s.w * 0.7;
    r.armL.rotation.z = -s.w * 0.6;
    r.armR.rotation.z = s.w * 0.6 + (s.lunge ? 0.5 + 2.0 * s.lunge : 0.5);
    r.torso.position.y = 26 + s.bob + Math.sin(G.time * 2) * 0.8;
  };
  return finishRig(r);
}

function rigQueen() {
  const r = rigSpider();
  // Königin: größer + Totenkopf-Zeichen und Hörner
  const g = r.group;
  M3.cur = r;
  const sc = new THREE.Group(); sc.scale.set(2.9, 2.9, 2.9);
  for (const c of g.children.filter(c => c !== r.shadow)) { g.remove(c); sc.add(c); }
  g.add(sc);
  const pur = lam(0xbe5aff, 0xa040ff, 1);
  sp(r.torso, 3.4, pur, -6, 6.8, 0, 1.3, 0.4, 1.1);
  cn(r.torso, 2, 9, lam(0xcdbbe8), 5, 5, -2.5, 5).rotation.x = -0.5; cn(r.torso, 2, 9, lam(0xcdbbe8), 5, 5, 2.5, 5).rotation.x = 0.5;
  glowAt(-6, 8.3, 0, 6.2, '190,90,255', 0.8);
  for (const m of r.meshes) if (!m.userData.m0) m.userData.m0 = m.material;
  M3.cur = null;
  r.glowScale = 2.9;
  return r;
}

function rigLavaLord() {
  const r = newRig(), g = r.group;
  const dk = lam(0x2e1a1c), pl = lam(0x4e2a2c), mg = lam(0xff9a3a, 0xff7a20, 1);
  r.legL = pv(g, 0, 28, -8); r.legR = pv(g, 0, 28, 8);
  bx(r.legL, 10, 28, 10, dk, 0, -14, 0); bx(r.legR, 10, 28, 10, dk, 0, -14, 0);
  r.torso = pv(g, 0, 28, 0);
  bx(r.torso, 20, 32, 36, pl, 0, 16, 0);
  bx(r.torso, 1.2, 22, 2, mg, 10.4, 16, -6); bx(r.torso, 1.2, 15, 2, mg, 10.4, 14, 7);
  glowAt(11, 44, 0, 56, '255,110,40', 1);
  for (const z of [-20, 20]) { sp(r.torso, 10, pl, 0, 32, z, 1, 0.7, 1); cn(r.torso, 3, 14, dk, 0, 42, z, 5); }
  r.head = pv(r.torso, 0, 34, 0);
  sp(r.head, 11, lam(0x3a2224), 0, 4, 0);
  cn(r.head, 3, 18, lam(0x1c1012), 0, 12, -9, 5).rotation.x = -0.5; cn(r.head, 3, 18, lam(0x1c1012), 0, 12, 9, 5).rotation.x = 0.5;
  sp(r.head, 2, bas(0xfff05a), 10, 5, -4.5); sp(r.head, 2, bas(0xfff05a), 10, 5, 4.5);
  glowAt(10.5, 71, -4.5, 24, '255,240,90'); glowAt(10.5, 71, 4.5, 24, '255,240,90');
  r.flames = [];
  for (let i = -2; i <= 2; i++) { const f = cn(r.head, 3.4, 12, mg, 0, 16, i * 4, 5); r.flames.push(f); }
  glowAt(0, 86, 0, 56, '255,130,40', 0.8);
  r.armL = pv(r.torso, 0, 30, -22); r.armR = pv(r.torso, 0, 30, 22);
  cy(r.armL, 3.4, 3, 24, dk, 0, -12, 0, 6); cy(r.armR, 3.4, 3, 24, dk, 0, -12, 0, 6);
  const hand = pv(r.armR, 0, -24, 0);
  bx(hand, 58, 5, 2, lam(0xe8a060, 0xff7a20, 0.9), 32, 0, 0); bx(hand, 3, 3, 14, lam(0x2a2a2a), 4, 0, 0);
  glowAt(36, 4, 0, 48, '255,120,40', 0.9);
  r.anim = (e, s) => {
    r.legL.rotation.z = s.w * 0.7; r.legR.rotation.z = -s.w * 0.7;
    r.armL.rotation.z = -s.w * 0.6;
    r.armR.rotation.z = s.w * 0.6 + (s.lunge ? 0.5 + 2.0 * s.lunge : 0.5);
    r.torso.position.y = 28 + s.bob;
    for (let i = 0; i < r.flames.length; i++) r.flames[i].scale.y = 0.8 + 0.5 * Math.sin(G.time * 12 + i * 1.7 + e.seed);
  };
  return finishRig(r);
}

function rigPlayer() {
  const r = newRig(), g = r.group;
  const robe = lam(0x3a50c0), hood = lam(0x2d3a8c), trim = lam(0xe8c060), dark = lam(0x0b0a14), skin = lam(0x2a1a10);
  r.torso = pv(g, 0, 0, 0);
  cy(r.torso, 4.4, 9, 24, robe, 0, 12, 0, 10); cy(r.torso, 9.2, 9.2, 1.3, trim, 0, 1.2, 0, 10);
  cy(r.torso, 7.4, 7.4, 2, lam(0xc9a14a), 0, 13, 0, 10);
  const cape = bx(r.torso, 1.2, 24, 14, hood, -5, 13, 0); cape.rotation.z = 0.12;
  r.head = pv(r.torso, 0, 26, 0);
  sp(r.head, 7.4, hood, 0, 0, 0); cn(r.head, 5, 9, hood, -2, 7, 0, 7).rotation.z = 0.5;
  sp(r.head, 4.8, dark, 3, -0.3, 0);
  sp(r.head, 0.9, bas(0xbff4ff), 6.8, 0, -1.9); sp(r.head, 0.9, bas(0xbff4ff), 6.8, 0, 1.9);
  glowAt(7, 26, -1.9, 10, '120,220,255'); glowAt(7, 26, 1.9, 10, '120,220,255');
  r.armL = pv(r.torso, 0, 21, -6); cy(r.armL, 2, 1.7, 11, robe, 0, -5.5, 0, 6);
  r.armR = pv(r.torso, 0, 21, 6); cy(r.armR, 2, 1.7, 11, robe, 0, -5.5, 0, 6);
  r.staff = pv(r.armR, 0, -11, 0);
  cy(r.staff, 0.9, 1.0, 34, lam(0x7a4e26), 0, 8, 0, 5);
  sp(r.staff, 2.8, bas(0xff9a3a), 0, 26, 0);
  r.anim = (e, s) => {
    r.torso.position.y = s.bob * 0.7 + (s.mv ? 0 : Math.sin(G.time * 2) * 0.4);
    r.torso.rotation.z = s.mv ? Math.sin(s.walk) * 0.05 : 0;
    const cast = P.castAnim > 0;
    r.armR.rotation.z = cast ? 1.7 : 1.1; r.armL.rotation.z = -s.w * 0.4;
    r.staff.rotation.z = cast ? 0.2 : -0.9;
  };
  r.extraGlows = (e, out) => {
    const cast = P.castAnim > 0;
    out.push({ x: 6 + Math.cos(r.staff.rotation.z + Math.PI / 2 + r.armR.rotation.z) * 0, y: cast ? 36 : 28, z: 7, size: cast ? 44 : 28, color: '255,150,60', a: cast ? 1 : 0.8 });
  };
  return finishRig(r);
}

function buildRig(type) {
  switch (type) {
    case 'skeleton': return rigSkeleton(false);
    case 'archer': return rigSkeleton(true);
    case 'imp': return rigImp();
    case 'brute': return rigBrute('brute');
    case 'demon': return rigBrute('demon');
    case 'bat': return rigBat();
    case 'spider': return rigSpider();
    case 'golem': return rigGolem();
    case 'hound': return rigHound();
    case 'cultist': return rigCultist();
    case 'boss': return rigBoneLord();
    case 'queen': return rigQueen();
    case 'lavalord': return rigLavaLord();
    case 'player': return rigPlayer();
  }
  return rigSkeleton(false);
}
