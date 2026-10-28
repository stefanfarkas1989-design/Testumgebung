'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  state: 'title',      // title | play | dead
  paused: false,
  floor: 1,
  map: null, rooms: [], startRoom: null, bossRoom: null,
  explored: new Uint8Array(MW * MH),
  flow: new Int16Array(MW * MH), flowT: 0, flowTile: -1,
  enemies: [], projs: [], fx: [], texts: [], drops: [], parts: [], glows: [], decals: [], torches: [],
  stairs: null, boss: null,
  cam: { x: 0, y: 0 }, zoom: 1, vw: 800, vh: 600, dpr: 1,
  shake: 0, hurtFlash: 0, time: 0, exploreT: 0,
};

const P = {
  x: 0, y: 0, r: 11, face: 0, hp: 100, mana: 60, lvl: 1, xp: 0, potions: 3, potCd: 0,
  cd: [0, 0, 0, 0], inv: [], eq: {}, gear: {}, castAnim: 0, walk: 0, fl: 1, moving: false,
};
const INV_MAX = 24;

const xpNeed = l => Math.round(30 * Math.pow(l, 1.55));

// ---------- Werte ----------
function recalc() {
  const s = sumStats(P.eq);
  P.gear = s;
  P.maxHp = Math.round(100 + 14 * (P.lvl - 1) + (s.life || 0));
  P.maxMana = Math.round(60 + 5 * (P.lvl - 1) + (s.mana || 0));
  P.dmgFlat = s.dmg || 0;
  P.dmgPct = s.dmgPct || 0;
  P.crit = Math.min(60, 5 + (s.crit || 0));
  P.critDmg = 150 + (s.critDmg || 0);
  P.cdr = Math.min(50, s.cdr || 0);
  P.armor = s.armor || 0;
  P.regen = 1 + P.lvl * 0.1 + (s.lifeRegen || 0);
  P.manaRegen = 9 + (s.manaRegen || 0);
  P.move = Math.min(60, s.move || 0);
  P.hp = Math.min(P.hp, P.maxHp);
  P.mana = Math.min(P.mana, P.maxMana);
}
const skillDmg = sk => (sk.base * (1 + 0.07 * (P.lvl - 1)) + P.dmgFlat * sk.coef) * (1 + P.dmgPct / 100);
const skillCd = sk => sk.cd * (1 - P.cdr / 100);

// ---------- Spielstart / Speichern ----------
function newGame() {
  P.lvl = 1; P.xp = 0; P.potions = 3; P.inv = []; P.eq = {};
  const staff = makeItem('weapon', 1, 'normal');
  staff.name = 'Lehrlingsstab';
  P.eq.weapon = staff;
  G.floor = 1;
  recalc(); P.hp = P.maxHp; P.mana = P.maxMana;
  startFloor();
  saveGame();
}
function saveGame() {
  try {
    localStorage.setItem('aschenfall-save', JSON.stringify({ lvl: P.lvl, xp: P.xp, potions: P.potions, inv: P.inv, eq: P.eq, floor: G.floor }));
  } catch (e) { /* Speicher evtl. gesperrt */ }
}
function hasSave() {
  try { return !!localStorage.getItem('aschenfall-save'); } catch (e) { return false; }
}
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem('aschenfall-save'));
    P.lvl = s.lvl; P.xp = s.xp; P.potions = s.potions; P.inv = s.inv; P.eq = s.eq; G.floor = s.floor;
    recalc(); P.hp = P.maxHp; P.mana = P.maxMana;
    startFloor();
    return true;
  } catch (e) { return false; }
}

// ---------- Ebenen ----------
function startFloor() {
  const d = genDungeon();
  G.map = d.map; G.rooms = d.rooms; G.startRoom = d.start; G.bossRoom = d.boss;
  G.explored.fill(0);
  G.enemies = []; G.projs = []; G.fx = []; G.texts = []; G.drops = []; G.parts = []; G.decals = [];
  placeTorches();
  G.stairs = null; G.boss = null; G.flowTile = -1; G.flowT = 0;
  P.x = (d.start.cx + 0.5) * TILE; P.y = (d.start.cy + 0.5) * TILE;
  P.potions = Math.max(P.potions, 3);
  P.cd = [0, 0, 0, 0]; P.potCd = 0;
  G.cam.x = P.x; G.cam.y = P.y;
  spawnEnemies();
  G.state = 'play';
  if (typeof UI !== 'undefined') UI.toast(`Ebene ${G.floor}`, '#e8b36a');
}

function spawnEnemies() {
  const f = G.floor;
  const weights = { skeleton: 50, archer: 24 + f, imp: 14, brute: 6 + f * 2 };
  for (const r of G.rooms) {
    if (r === G.startRoom) continue;
    if (r === G.bossRoom) {
      const b = spawnEnemy('boss', (r.cx + 0.5) * TILE, (r.cy + 0.5) * TILE);
      G.boss = b;
      for (let i = 0; i < 2; i++) spawnEnemy('brute', (r.cx + (i ? 3 : -3) + 0.5) * TILE, (r.cy + 3.5) * TILE);
      continue;
    }
    const n = rint(3, 5) + Math.floor(f / 3);
    for (let i = 0; i < n; i++) {
      const type = weighted(weights);
      const x = (r.x + rint(1, r.w - 2) + 0.5) * TILE, y = (r.y + rint(1, r.h - 2) + 0.5) * TILE;
      if (type === 'imp') for (let k = 0; k < 3; k++) spawnEnemy('imp', x + rnd(-30, 30), y + rnd(-30, 30));
      else spawnEnemy(type, x, y, Math.random() < 0.07);
    }
  }
}

function spawnEnemy(type, x, y, elite) {
  const d = ENEMIES[type], f = G.floor;
  const hpMul = 1 + 0.3 * (f - 1), dmgMul = 1 + 0.18 * (f - 1);
  const e = {
    type, def: d, x, y, r: d.r * (elite ? 1.2 : 1), name: d.name,
    maxHp: d.hp * hpMul * (elite ? 3.2 : 1), dmg: d.dmg * dmgMul * (elite ? 1.4 : 1),
    spd: d.spd * (elite ? 1.1 : 1), xp: d.xp * (1 + 0.1 * (f - 1)) * (elite ? 3 : 1),
    color: d.color, state: 'idle', cd: rnd(0, 1), slow: 0, kx: 0, ky: 0, flash: 0, lunge: 0,
    elite: !!elite, boss: !!d.boss, aggro: 360, burstT: 4, summonT: 8, dead: false, ang: 0,
    seed: Math.random() * 100, fl: Math.random() < 0.5 ? 1 : -1, walk: 0, moving: false,
  };
  e.hp = e.maxHp;
  if (elite) e.name = 'Champion ' + e.name;
  G.enemies.push(e);
  return e;
}

// ---------- Kollision / Sicht ----------
const solid = (x, y) => {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  return tx < 0 || ty < 0 || tx >= MW || ty >= MH || !G.map[ty * MW + tx];
};
function blockedAt(x, y, r) {
  r *= 0.8;
  return solid(x - r, y - r) || solid(x + r, y - r) || solid(x - r, y + r) || solid(x + r, y + r);
}
function moveEnt(e, dx, dy) {
  if (dx && !blockedAt(e.x + dx, e.y, e.r)) e.x += dx;
  if (dy && !blockedAt(e.x, e.y + dy, e.r)) e.y += dy;
}
function hasLOS(ax, ay, bx, by) {
  const d = Math.hypot(bx - ax, by - ay), n = Math.ceil(d / 14);
  for (let i = 1; i < n; i++) {
    const t = i / n;
    if (solid(ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
  }
  return true;
}
function computeFlow() {
  const tx = Math.floor(P.x / TILE), ty = Math.floor(P.y / TILE);
  if (G.flowTile === ty * MW + tx && G.flowT > 0) return;
  G.flowTile = ty * MW + tx; G.flowT = 0.4;
  bfs(G.map, tx, ty, 70, G.flow);
}
// Richtung (Winkel) zum Ziel, mit Wegfindung um Ecken
function steerAngle(e, tx, ty) {
  if (hasLOS(e.x, e.y, tx, ty)) return Math.atan2(ty - e.y, tx - e.x);
  const cx = Math.floor(e.x / TILE), cy = Math.floor(e.y / TILE);
  let best = G.flow[cy * MW + cx], bx = -1, by = -1;
  if (best < 0) best = 9999;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const nx = cx + dx, ny = cy + dy;
    if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
    const v = G.flow[ny * MW + nx];
    if (v < 0 || v >= best) continue;
    if (dx && dy && (!G.map[cy * MW + nx] || !G.map[ny * MW + cx])) continue;
    best = v; bx = nx; by = ny;
  }
  if (bx < 0) return Math.atan2(ty - e.y, tx - e.x);
  return Math.atan2((by + 0.5) * TILE - e.y, (bx + 0.5) * TILE - e.x);
}

// ---------- Effekte ----------
function burst(x, y, color, n, spd, life, size, add) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283, s = rnd(0.3, 1) * spd;
    G.parts.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: rnd(0.5, 1) * life, max: life, color, size: size * rnd(0.6, 1.2), add: add !== false });
  }
}
function floatText(x, y, text, color, big) {
  G.texts.push({ x: x + rnd(-8, 8), y, text, color, big: !!big, t: 0 });
}

// ---------- Schaden ----------
function damageEnemy(e, amt, o) {
  if (e.dead) return;
  let crit = false;
  if (o.player && Math.random() * 100 < P.crit) { crit = true; amt *= P.critDmg / 100; }
  amt = Math.max(1, Math.round(amt));
  e.hp -= amt; e.flash = 0.1;
  if (e.state === 'idle') wake(e);
  floatText(e.x, e.y - e.r - 6, amt, crit ? '#ffe14a' : '#fff', crit);
  if (o.kb) {
    const a = Math.atan2(e.y - o.fy, e.x - o.fx), k = o.kb * (e.boss ? 0.1 : e.elite ? 0.5 : 1);
    e.kx += Math.cos(a) * k; e.ky += Math.sin(a) * k;
  }
  if (o.player) burst(e.x, e.y, crit ? '#ffe680' : '#ffb060', crit ? 9 : 5, 150, 0.3, 2.6);
  if (!e.def.boss && !(e.def.ranged || e.type === 'skeleton')) burst(e.x, e.y, '#8a1620', 3, 90, 0.5, 3, false);
  if (crit) G.shake = Math.max(G.shake, 2);
  if (e.hp <= 0) killEnemy(e);
}
function hurtPlayer(amt) {
  if (G.state !== 'play') return;
  const red = P.armor / (P.armor + 60 + 8 * G.floor);
  amt = Math.max(1, Math.round(amt * (1 - red)));
  P.hp -= amt;
  G.hurtFlash = 0.25; G.shake = Math.max(G.shake, 3);
  floatText(P.x, P.y - 20, '-' + amt, '#ff5a5a', false);
  if (P.hp <= 0) { P.hp = 0; G.state = 'dead'; UI.showDeath(); }
}
function wake(e) {
  e.state = 'chase';
  for (const o of G.enemies) if (o.state === 'idle' && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 170) o.state = 'chase';
}

function killEnemy(e) {
  e.dead = true;
  const bony = e.type === 'skeleton' || e.type === 'archer' || e.boss;
  burst(e.x, e.y, bony ? '#d9d1b6' : '#8a1620', e.boss ? 40 : 14, 170, 0.7, 3.5, false);
  if (e.boss) burst(e.x, e.y, '#c04bff', 30, 220, 0.8, 4);
  addDecals(e, bony);
  gainXp(e.xp);
  const src = e.boss ? 'boss' : e.elite ? 'elite' : 'normal';
  const ilvl = Math.max(1, G.floor * 2 + Math.floor(P.lvl / 2));
  for (const it of rollDrops(src, ilvl)) dropItem(e.x, e.y, it);
  if (Math.random() < (e.boss ? 1 : e.elite ? 0.4 : 0.07)) G.drops.push({ x: e.x + rnd(-16, 16), y: e.y + rnd(-16, 16), potion: true, t: 0 });
  if (e.boss) {
    G.stairs = { x: e.x, y: e.y };
    G.shake = 8;
    UI.toast('Der Knochenfürst ist gefallen! Eine Treppe erscheint.', '#e8b36a');
  }
}
function dropItem(x, y, item) {
  G.drops.push({ x: x + rnd(-22, 22), y: y + rnd(-22, 22), item, t: 0 });
}
function gainXp(n) {
  P.xp += n;
  let up = false;
  while (P.xp >= xpNeed(P.lvl)) {
    P.xp -= xpNeed(P.lvl); P.lvl++; up = true;
  }
  if (up) {
    recalc(); P.hp = P.maxHp; P.mana = P.maxMana;
    floatText(P.x, P.y - 30, 'LEVEL ' + P.lvl, '#ffd84a', true);
    burst(P.x, P.y, '#ffd84a', 30, 200, 0.8, 4);
    const ns = SKILLS.find(s => s.unlock === P.lvl);
    UI.toast(`Level ${P.lvl}!` + (ns ? ` Neuer Skill: ${ns.name}` : ''), '#ffd84a');
    saveGame();
  }
}

// ---------- Skills ----------
function nearestEnemy(ox, oy, range, needLOS) {
  let best = null, bd = range;
  for (const e of G.enemies) {
    if (e.dead) continue;
    const d = Math.hypot(e.x - ox, e.y - oy);
    if (d < bd && (!needLOS || hasLOS(P.x, P.y, e.x, e.y))) { best = e; bd = d; }
  }
  return best;
}
function aimAngle() {
  if (Input.mode === 'mouse') {
    const w = screenToWorld(Input.mx, Input.my);
    return Math.atan2(w.y - P.y, w.x - P.x);
  }
  const t = nearestEnemy(P.x, P.y, 480, true);
  return t ? Math.atan2(t.y - P.y, t.x - P.x) : P.face;
}
function screenToWorld(mx, my) {
  return { x: (mx - G.vw / 2) / G.zoom + G.cam.x, y: (my - G.vh / 2) / G.zoom + G.cam.y };
}

function castSkill(i) {
  const sk = SKILLS[i];
  if (G.state !== 'play' || G.paused || P.lvl < sk.unlock || P.cd[i] > 0 || P.mana < sk.mana) return false;
  const a = aimAngle();
  const dmg = skillDmg(sk);
  let ok = true;
  if (sk.id === 'fire') {
    const sp = 520;
    G.projs.push({ x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 8, dmg, friend: true, life: 1.1, color: '#ff8a2a', fire: true });
  } else if (sk.id === 'nova') {
    const R = 170;
    G.fx.push({ type: 'ring', x: P.x, y: P.y, t: 0, max: 0.45, r: R, color: '#8fd8ff' });
    burst(P.x, P.y, '#bfeaff', 24, 220, 0.5, 3);
    for (const e of G.enemies) {
      if (!e.dead && Math.hypot(e.x - P.x, e.y - P.y) < R + e.r) {
        damageEnemy(e, dmg, { player: true, kb: 260, fx: P.x, fy: P.y });
        e.slow = 2.5;
      }
    }
  } else if (sk.id === 'bolt') {
    let t;
    if (Input.mode === 'mouse') {
      const w = screenToWorld(Input.mx, Input.my);
      t = null; let bd = 220;
      for (const e of G.enemies) {
        const d = Math.hypot(e.x - w.x, e.y - w.y);
        if (!e.dead && d < bd && Math.hypot(e.x - P.x, e.y - P.y) < 430 && hasLOS(P.x, P.y, e.x, e.y)) { t = e; bd = d; }
      }
    } else t = nearestEnemy(P.x, P.y, 430, true);
    if (!t) ok = false;
    else {
      const hit = new Set(), pts = [{ x: P.x, y: P.y }];
      let cur = t;
      for (let j = 0; j < 5 && cur; j++) {
        hit.add(cur); pts.push({ x: cur.x, y: cur.y });
        damageEnemy(cur, dmg, { player: true, kb: 60, fx: pts[pts.length - 2].x, fy: pts[pts.length - 2].y });
        let nx = null, nd = 210;
        for (const e of G.enemies) {
          if (e.dead || hit.has(e)) continue;
          const d = Math.hypot(e.x - cur.x, e.y - cur.y);
          if (d < nd && hasLOS(cur.x, cur.y, e.x, e.y)) { nx = e; nd = d; }
        }
        cur = nx;
      }
      G.fx.push({ type: 'bolt', pts, t: 0, max: 0.18 });
    }
  } else if (sk.id === 'blink') {
    const mv = Input.moveVec();
    const ang = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : a;
    burst(P.x, P.y, '#b58cff', 18, 160, 0.5, 3);
    for (let d = 8; d <= 220; d += 8) {
      const nx = P.x + Math.cos(ang) * 8, ny = P.y + Math.sin(ang) * 8;
      if (blockedAt(nx, ny, P.r)) break;
      P.x = nx; P.y = ny;
    }
    burst(P.x, P.y, '#b58cff', 18, 160, 0.5, 3);
  }
  if (!ok) return false;
  P.mana -= sk.mana;
  P.cd[i] = skillCd(sk);
  P.face = a; P.castAnim = 0.15;
  return true;
}
function usePotion() {
  if (G.state !== 'play' || G.paused || P.potions <= 0 || P.potCd > 0 || P.hp >= P.maxHp) return;
  P.potions--; P.potCd = 1.0;
  const heal = Math.round(P.maxHp * 0.6);
  P.hp = Math.min(P.maxHp, P.hp + heal);
  floatText(P.x, P.y - 24, '+' + heal, '#6fe08a', false);
  burst(P.x, P.y, '#e0343c', 14, 100, 0.6, 3);
}

// ---------- Inventar-Aktionen ----------
function eqKeyFor(slot) {
  if (slot !== 'ring') return slot;
  return !P.eq.ring1 ? 'ring1' : !P.eq.ring2 ? 'ring2' : 'ring1';
}
function equipFromInv(idx, key) {
  const it = P.inv[idx];
  if (!it) return;
  key = key || eqKeyFor(it.slot);
  const old = P.eq[key] || null;
  P.eq[key] = it;
  if (old) P.inv[idx] = old; else P.inv.splice(idx, 1);
  recalc(); saveGame();
}
function unequip(key) {
  if (!P.eq[key] || P.inv.length >= INV_MAX) return false;
  P.inv.push(P.eq[key]); P.eq[key] = null;
  recalc(); saveGame();
  return true;
}

// ---------- Update ----------
function update(dt) {
  G.time += dt;
  const mv = Input.moveVec();

  // Spieler
  const spd = 170 * (1 + P.move / 100);
  P.moving = !!(mv.x || mv.y);
  if (P.moving) {
    P.walk += spd * dt * 0.09;
    moveEnt(P, mv.x * spd * dt, mv.y * spd * dt);
    if (Input.mode !== 'mouse') P.face = Math.atan2(mv.y, mv.x);
  }
  if (Input.mode === 'mouse') P.face = aimAngle();
  P.mana = Math.min(P.maxMana, P.mana + P.manaRegen * dt);
  P.hp = Math.min(P.maxHp, P.hp + P.regen * dt);
  for (let i = 0; i < 4; i++) {
    if (P.cd[i] > 0) P.cd[i] -= dt;
    if (Input.held[i]) castSkill(i);
  }
  if (P.potCd > 0) P.potCd -= dt;
  if (P.castAnim > 0) P.castAnim -= dt;

  G.flowT -= dt;
  computeFlow();

  // Erkundung (Minimap)
  G.exploreT -= dt;
  if (G.exploreT <= 0) {
    G.exploreT = 0.15;
    const px = Math.floor(P.x / TILE), py = Math.floor(P.y / TILE);
    for (let j = -7; j <= 7; j++) for (let i = -7; i <= 7; i++) {
      const x = px + i, y = py + j;
      if (i * i + j * j <= 49 && x >= 0 && y >= 0 && x < MW && y < MH) G.explored[y * MW + x] = 1;
    }
  }

  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  G.enemies = G.enemies.filter(e => !e.dead);

  updateProjs(dt);

  // Beute
  for (const d of G.drops) {
    d.t += dt;
    if (Math.hypot(d.x - P.x, d.y - P.y) < 38) {
      if (d.potion) {
        if (P.potions < 6) { P.potions++; d.got = true; floatText(P.x, P.y - 24, '+Trank', '#e0343c', false); }
      } else if (P.inv.length < INV_MAX) {
        P.inv.push(d.item); d.got = true;
        const R = RARITY[d.item.rarity];
        UI.toast(`${d.item.name}`, R.color);
        saveGame();
      } else if (!d.warned) { d.warned = true; UI.toast('Rucksack voll!', '#ff6a6a'); }
    }
  }
  G.drops = G.drops.filter(d => !d.got);

  if (G.stairs && Math.hypot(G.stairs.x - P.x, G.stairs.y - P.y) < 34) {
    G.floor++; saveGame(); startFloor();
    return;
  }

  // Partikel / Texte / Effekte
  for (const p of G.parts) { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.94; p.vy *= 0.94; p.life -= dt; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const t of G.texts) t.t += dt;
  G.texts = G.texts.filter(t => t.t < 0.9);
  for (const f of G.fx) f.t += dt;
  G.fx = G.fx.filter(f => f.t < f.max);
  G.shake = Math.max(0, G.shake - dt * 14);
  G.hurtFlash = Math.max(0, G.hurtFlash - dt);

  // Kamera
  const k = 1 - Math.exp(-10 * dt);
  G.cam.x += (P.x - G.cam.x) * k; G.cam.y += (P.y - G.cam.y) * k;
}

function updateEnemy(e, dt) {
  const ox = e.x, oy = e.y;
  updateEnemyAI(e, dt);
  const mvd = Math.hypot(e.x - ox, e.y - oy);
  e.moving = mvd > 0.05; e.walk += mvd * 0.17;
}
function updateEnemyAI(e, dt) {
  e.flash = Math.max(0, e.flash - dt); e.slow = Math.max(0, e.slow - dt);
  e.cd -= dt; e.lunge = Math.max(0, e.lunge - dt);
  if (e.kx || e.ky) {
    moveEnt(e, e.kx * dt, e.ky * dt);
    const f = Math.pow(0.002, dt);
    e.kx *= f; e.ky *= f;
    if (Math.abs(e.kx) < 4) e.kx = 0;
    if (Math.abs(e.ky) < 4) e.ky = 0;
  }
  const d = Math.hypot(P.x - e.x, P.y - e.y);
  if (e.state === 'idle') {
    if (d < e.aggro && (d < 170 || hasLOS(e.x, e.y, P.x, P.y))) wake(e);
    else return;
  } else if (d > 1000 && !e.boss) { e.state = 'idle'; return; }

  const spd = e.spd * (e.slow > 0 ? 0.5 : 1) * dt;
  const def = e.def;
  const toP = Math.atan2(P.y - e.y, P.x - e.x);
  e.ang = toP;

  if (def.ranged) {
    if (d > def.keep + 25) {
      const a = steerAngle(e, P.x, P.y);
      moveEnt(e, Math.cos(a) * spd, Math.sin(a) * spd);
    } else if (d < def.keep - 70) {
      moveEnt(e, -Math.cos(toP) * spd, -Math.sin(toP) * spd);
    }
    if (d < 460 && e.cd <= 0 && hasLOS(e.x, e.y, P.x, P.y)) {
      e.cd = def.atkCd * (e.slow > 0 ? 1.5 : 1);
      G.projs.push({ x: e.x, y: e.y, vx: Math.cos(toP) * def.projSpd, vy: Math.sin(toP) * def.projSpd, r: 6, dmg: e.dmg, friend: false, life: 2, color: '#d8d0a0' });
    }
  } else {
    if (d > e.r + P.r + def.range) {
      const a = steerAngle(e, P.x, P.y);
      moveEnt(e, Math.cos(a) * spd, Math.sin(a) * spd);
    } else if (e.cd <= 0) {
      e.cd = def.atkCd * (e.slow > 0 ? 1.5 : 1);
      e.lunge = 0.15;
      hurtPlayer(e.dmg);
    }
  }

  if (e.boss) {
    e.burstT -= dt; e.summonT -= dt;
    const enraged = e.hp < e.maxHp * 0.5;
    if (e.burstT <= 0) {
      e.burstT = enraged ? 3 : 4.5;
      const n = enraged ? 20 : 14, off = Math.random() * 6.28;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * 6.283;
        G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * 230, vy: Math.sin(a) * 230, r: 8, dmg: e.dmg * 0.5, friend: false, life: 3, color: '#c04bff' });
      }
      G.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, max: 0.4, r: 80, color: '#c04bff' });
    }
    if (e.summonT <= 0) {
      e.summonT = 12;
      for (let i = 0; i < 3; i++) { const m = spawnEnemy('imp', e.x + rnd(-60, 60), e.y + rnd(-60, 60)); m.state = 'chase'; }
      UI.toast('Der Knochenfürst ruft Wichte!', '#e6c6ff');
    }
  }

  // Abstand zu anderen Gegnern halten
  for (const o of G.enemies) {
    if (o === e || o.dead) continue;
    const dx = e.x - o.x, dy = e.y - o.y, m = e.r + o.r;
    if (Math.abs(dx) < m && Math.abs(dy) < m) {
      const dd = Math.hypot(dx, dy) || 1;
      if (dd < m) moveEnt(e, (dx / dd) * (m - dd) * 0.5, (dy / dd) * (m - dd) * 0.5);
    }
  }
}

function updateProjs(dt) {
  for (const p of G.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (solid(p.x, p.y)) { p.life = 0; if (p.fire) explode(p, null); continue; }
    if (p.friend) {
      for (const e of G.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
          damageEnemy(e, p.dmg, { player: true, kb: 120, fx: p.x - p.vx, fy: p.y - p.vy });
          explode(p, e); p.life = 0;
          break;
        }
      }
    } else if (G.state === 'play' && Math.hypot(P.x - p.x, P.y - p.y) < P.r + p.r) {
      hurtPlayer(p.dmg); p.life = 0;
    }
    if (Math.random() < 0.6) G.parts.push({ x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.25, max: 0.25, color: p.color, size: 3 });
  }
  G.projs = G.projs.filter(p => p.life > 0);
}
function explode(p, direct) {
  burst(p.x, p.y, '#ffb347', 10, 140, 0.4, 3);
  if (!p.fire) return;
  for (const e of G.enemies) {
    if (e.dead || e === direct) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < 60 + e.r) damageEnemy(e, p.dmg * 0.5, { player: true, kb: 80, fx: p.x, fy: p.y });
  }
}

// ---------- Rendering ----------
function resize() {
  G.dpr = Math.min(window.devicePixelRatio || 1, 2);
  G.vw = window.innerWidth; G.vh = window.innerHeight;
  canvas.width = Math.round(G.vw * G.dpr); canvas.height = Math.round(G.vh * G.dpr);
  G.zoom = clamp(Math.min(G.vw, G.vh) / 380, 1, 2);
  resizeLight();
}

// ---------- Fackeln & Bodenspuren ----------
function placeTorches() {
  G.torches = [];
  const add = (x, y) => {
    if (x < 1 || x >= MW - 1 || y < 1 || G.map[y * MW + x] || !G.map[(y + 1) * MW + x]) return;
    G.torches.push({ x: (x + 0.5) * TILE, y: (y + 0.5) * TILE, ph: Math.random() * 10 });
  };
  for (const r of G.rooms) {
    const n = r === G.startRoom ? 3 : r === G.bossRoom ? 4 : 3;
    for (let i = 0; i < n; i++) add(r.x + 1 + Math.floor((i + 0.5) * (r.w - 2) / n), r.y - 1);
  }
}

function addDecals(e, bony) {
  const bits = [];
  const n = e.boss ? 14 : bony ? 5 : 6;
  for (let i = 0; i < n; i++) bits.push({ dx: rnd(-1, 1) * e.r * 1.2, dy: rnd(-0.5, 0.8) * e.r, a: rnd(0, 3.14), l: rnd(0.4, 1) * e.r * (bony ? 0.8 : 1) });
  G.decals.push({ x: e.x, y: e.y, bony, bits, boss: e.boss });
  if (G.decals.length > 90) G.decals.shift();
}
