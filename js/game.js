'use strict';
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const G = {
  state: 'title',      // title | play | dead
  paused: false, pausedMenu: false, modal: false, gfx: '2d', quality: 'auto', dt: 0.016, camZoom: 1, camTilt: 0.95,
  floor: 1,
  map: null, rooms: [], startRoom: null, bossRoom: null,
  explored: new Uint8Array(MW * MH),
  flow: new Int16Array(MW * MH), flowT: 0, flowTile: -1,
  enemies: [], projs: [], fx: [], texts: [], drops: [], parts: [], glows: [], decals: [], torches: [], props: [], hazards: [], amb: [], deco: new Uint8Array(MW * MH), theme: THEMES[0], set: null,
  stairs: null, boss: null,
  cam: { x: 0, y: 0 }, zoom: 1, vw: 800, vh: 600, dpr: 1,
  shake: 0, hurtFlash: 0, time: 0, exploreT: 0, hitstop: 0, kx: 0, ky: 0, heartT: 0,
};

const P = {
  x: 0, y: 0, r: 11, face: 0, hp: 100, mana: 60, lvl: 1, xp: 0, potions: 3, potCd: 0,
  cd: [0, 0, 0, 0], inv: [], eq: {}, gear: {}, castAnim: 0, walk: 0, fl: 1, moving: false, kx: 0, ky: 0, ranks: {}, fx: {}, drT: 0, drV: 0, hasteT: 0, hasteV: 0, invulnT: 0, echoT: 0, fireCount: 0, pw: {}, slowT: 0, story: null,
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
  const rk = id => P.ranks[id] || 0;
  P.fx = {
    fireDmg: 1 + 0.1 * rk('fire_dmg'), fireSplash: 0.5 + 0.1 * rk('fire_splash'), fireRadius: 60 * (1 + 0.2 * rk('fire_splash')),
    firePierce: rk('fire_pierce') > 0, fireSplit: rk('fire_split') > 0, fireInferno: rk('fire_cap') > 0,
    novaDmg: 1 + 0.1 * rk('nova_dmg'), novaRadius: 1 + 0.15 * rk('nova_radius'), novaFreeze: rk('nova_freeze') > 0,
    novaBarrier: 0.15 * rk('nova_barrier'), novaEcho: rk('nova_cap') > 0,
    boltDmg: 1 + 0.1 * rk('bolt_dmg'), boltChains: 5 + rk('bolt_chain'), boltStun: rk('bolt_stun') > 0,
    boltMana: 2 * rk('bolt_mana'), boltThunder: rk('bolt_cap') > 0,
    blinkCdr: 0.12 * rk('blink_cdr'), blinkHaste: 0.15 * rk('blink_haste'), blinkShock: rk('blink_shock') > 0,
    blinkVoid: rk('blink_void') > 0, blinkEcho: rk('blink_cap') > 0,
    killHeal: 0.02 * rk('p_kill'),
  };
  P.pw = {};
  for (const k of EQ_KEYS) if (P.eq[k] && P.eq[k].power) P.pw[P.eq[k].power] = true;
  P.maxHp += 20 * rk('p_life');
  P.manaRegen += 1.5 * rk('p_mana');
  P.crit = Math.min(60, P.crit + 2 * rk('p_crit'));
  P.move = Math.min(60, P.move + 3 * rk('p_move'));
  P.dmgPct += 4 * rk('p_dmg');
  P.hp = Math.min(P.hp, P.maxHp);
  P.mana = Math.min(P.mana, P.maxMana);
}
const skillDmg = sk => (sk.base * (1 + 0.07 * (P.lvl - 1)) + P.dmgFlat * sk.coef) * (1 + P.dmgPct / 100);
const skillCd = sk => sk.cd * (1 - P.cdr / 100);

// ---------- Spielstart / Speichern ----------
function newGame() {
  P.lvl = 1; P.xp = 0; P.potions = 3; P.inv = []; P.eq = {}; P.ranks = {};
  P.story = Story.fresh(); P.story.name = UI.pendingName || '';
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
    localStorage.setItem('aschenfall-save', JSON.stringify({ lvl: P.lvl, xp: P.xp, potions: P.potions, inv: P.inv, eq: P.eq, ranks: P.ranks, story: P.story, floor: G.floor }));
  } catch (e) { /* Speicher evtl. gesperrt */ }
}
function hasSave() {
  try { return !!localStorage.getItem('aschenfall-save'); } catch (e) { return false; }
}
function loadGame() {
  try {
    const s = JSON.parse(localStorage.getItem('aschenfall-save'));
    P.lvl = s.lvl; P.xp = s.xp; P.potions = s.potions; P.inv = s.inv; P.eq = s.eq; P.ranks = s.ranks || {}; P.story = s.story || Story.fresh(); G.floor = s.floor;
    recalc(); P.hp = P.maxHp; P.mana = P.maxMana;
    startFloor();
    return true;
  } catch (e) { return false; }
}

// ---------- Ebenen ----------
function startFloor() {
  G.theme = themeFor(G.floor); G.set = getSet(G.theme);
  const d = genDungeon();
  G.map = d.map; G.rooms = d.rooms; G.startRoom = d.start; G.bossRoom = d.boss;
  G.explored.fill(0);
  UI.mmClear();
  if (typeof R3 !== 'undefined') R3.dirty = true;
  G.enemies = []; G.projs = []; G.fx = []; G.texts = []; G.drops = []; G.parts = []; G.decals = [];
  placeTorches();
  G.stairs = null; G.boss = null; G.flowTile = -1; G.flowT = 0;
  G.hazards = []; G.props = []; G.deco.fill(0);
  P.x = (d.start.cx + 0.5) * TILE; P.y = (d.start.cy + 0.5) * TILE;
  P.potions = Math.max(P.potions, 3);
  P.cd = [0, 0, 0, 0]; P.potCd = 0;
  G.cam.x = P.x; G.cam.y = P.y;
  placeProps();
  initAmbient();
  spawnEnemies();
  G.state = 'play';
  if (typeof UI !== 'undefined') UI.toast(`${G.theme.name} · Ebene ${G.floor}`, '#e8b36a');
  Story.onFloor(G.floor);
}

function spawnEnemies() {
  const f = G.floor, th = G.theme;
  const weights = Object.assign({}, th.roster);
  weights[th.heavy] = (weights[th.heavy] || 0) + f * 2;
  for (const r of G.rooms) {
    if (r === G.startRoom) continue;
    if (r === G.bossRoom) {
      const b = spawnEnemy(th.boss, (r.cx + 0.5) * TILE, (r.cy + 0.5) * TILE);
      G.boss = b;
      for (let i = 0; i < 2; i++) spawnEnemy(th.heavy, (r.cx + (i ? 3 : -3) + 0.5) * TILE, (r.cy + 3.5) * TILE);
      continue;
    }
    const n = rint(3, 5) + Math.floor(f / 3);
    for (let i = 0; i < n; i++) {
      const type = weighted(weights);
      const x = (r.x + rint(1, r.w - 2) + 0.5) * TILE, y = (r.y + rint(1, r.h - 2) + 0.5) * TILE;
      if (G.deco[Math.floor(y / TILE) * MW + Math.floor(x / TILE)] || !G.map[Math.floor(y / TILE) * MW + Math.floor(x / TILE)]) continue;
      if (type === 'imp' || type === 'bat') for (let k = 0; k < 3; k++) spawnEnemy(type, x + rnd(-30, 30), y + rnd(-30, 30));
      else spawnEnemy(type, x, y, Math.random() < 0.07 + f * 0.005);
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
    stun: 0, wind: 0, dashT: 0, dashCd: rnd(0, 2), dashHit: false, burnT: 0, burnTick: 0, burnDps: 0, trailT: 0, t1: 3, t2: 5, t3: 9, aff: null, seed: Math.random() * 100, fl: Math.random() < 0.5 ? 1 : -1, walk: 0, moving: false,
  };
  e.hp = e.maxHp;
  if (G.theme.echo && !d.boss) { e.name = 'Echo: ' + d.name; e.maxHp *= 1.25; e.hp = e.maxHp; }
  if (G.theme.echo && d.boss && ECHO_BOSS_NAME[type]) e.name = ECHO_BOSS_NAME[type];
  if (elite) {
    e.aff = pick(ELITE_AFFIXES);
    e.name = `Champion ${d.name} · ${e.aff.label}`;
    if (e.aff.id === 'fast') e.spd *= 1.4;
  }
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
  if (o.player) {
    if (P.pw.lifesteal) P.hp = Math.min(P.maxHp, P.hp + amt * 0.04);
    if (P.pw.burn && !e.dead && Math.random() < 0.2) { e.burnT = 3; e.burnDps = Math.max(e.burnDps, amt * 0.5); }
  }
  if (!e.boss) e.stun = e.elite ? 0.07 : 0.14;
  G.fx.push({ type: 'flash', x: e.x, y: e.y, t: 0, max: 0.12, r: crit ? 64 : 40 });
  Sfx.play(crit ? 'crit' : 'hit', e);
  if (crit) hitstop(0.05);
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
function hitstop(s) { G.hitstop = Math.max(G.hitstop, s); }
function hurtPlayer(amt, fx, fy) {
  if (G.state !== 'play') return;
  if (P.invulnT > 0) return;
  const red = P.armor / (P.armor + 60 + 8 * G.floor);
  amt = Math.max(1, Math.round(amt * (1 - red) * (P.drT > 0 ? 1 - P.drV : 1)));
  P.hp -= amt;
  G.hurtFlash = 0.25; G.shake = Math.max(G.shake, clamp(2 + 14 * amt / P.maxHp, 2, 9));
  if (amt > P.maxHp * 0.12) hitstop(0.06);
  if (fx !== undefined) {
    const a = Math.atan2(P.y - fy, P.x - fx);
    P.kx += Math.cos(a) * 170; P.ky += Math.sin(a) * 170;
  }
  floatText(P.x, P.y - 20, '-' + amt, '#ff5a5a', false);
  Sfx.play('hurt');
  if (P.hp <= 0) { P.hp = 0; G.state = 'dead'; Sfx.play('playerDie'); UI.showDeath(); }
}
function wake(e) {
  e.state = 'chase';
  Story.seen(e.type);
  if (e.boss && !e.introDone) { e.introDone = true; if (!G.theme.echo || e.type === 'schweigen') Story.bossIntro(e); }
  for (const o of G.enemies) if (o.state === 'idle' && !o.dead && Math.hypot(o.x - e.x, o.y - e.y) < 170) o.state = 'chase';
}

function killEnemy(e) {
  e.dead = true;
  Story.seen(e.type);
  const bony = e.type === 'skeleton' || e.type === 'archer' || e.boss;
  burst(e.x, e.y, bony ? '#d9d1b6' : '#8a1620', e.boss ? 40 : 14, 170, 0.7, 3.5, false);
  if (e.boss) burst(e.x, e.y, '#c04bff', 30, 220, 0.8, 4);
  addDecals(e, bony);
  if (e.aff && e.aff.id === 'boom') addStrike(e.x, e.y, 78, 0.8, e.dmg * 1.4);
  if (P.pw.killmana) P.mana = Math.min(P.maxMana, P.mana + 8);
  if (P.pw.killhaste) { P.hasteT = 2; P.hasteV = Math.max(P.hasteV, 0.25); }
  if (P.pw.explode) {
    G.fx.push({ type: 'flash', x: e.x, y: e.y, t: 0, max: 0.2, r: 80 });
    burst(e.x, e.y, '#ff9a3a', 12, 200, 0.4, 3);
    breakPropsAt(e.x, e.y, 80);
    for (const o of G.enemies) if (!o.dead && o !== e && Math.hypot(o.x - e.x, o.y - e.y) < 80 + o.r) damageEnemy(o, e.maxHp * 0.3, { kb: 120, fx: e.x, fy: e.y });
  }
  Sfx.play(e.boss ? 'bossDie' : 'death', e);
  hitstop(e.boss ? 0.3 : e.elite ? 0.09 : 0.03);
  gainXp(e.xp);
  if (P.fx.killHeal) {
    const h = Math.max(1, Math.round(P.maxHp * P.fx.killHeal));
    P.hp = Math.min(P.maxHp, P.hp + h); floatText(P.x, P.y - 24, '+' + h, '#6fe08a', false);
  }
  const src = e.boss ? 'boss' : e.elite ? 'elite' : 'normal';
  const ilvl = Math.max(1, G.floor * 2 + Math.floor(P.lvl / 2));
  for (const it of rollDrops(src, ilvl)) dropItem(e.x, e.y, it);
  if (Math.random() < (e.boss ? 1 : e.elite ? 0.4 : 0.07)) G.drops.push({ x: e.x + rnd(-16, 16), y: e.y + rnd(-16, 16), potion: true, t: 0 });
  if (e.boss) {
    G.shake = 8;
    if (e.def.bossKind === 'silence') {
      Story.finale();
    } else {
      G.stairs = { x: e.x, y: e.y };
      UI.toast(`${e.name} ist gefallen! Eine Treppe erscheint.`, '#e8b36a');
      Sfx.play('stairs');
      if (!G.theme.echo) Story.bossDeath(e);
    }
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
    Sfx.play('levelup');
    const ns = SKILLS.find(s => s.unlock === P.lvl);
    UI.toast(`Level ${P.lvl}! +1 Fertigkeitspunkt` + (ns ? ` · Neuer Skill: ${ns.name}` : ''), '#ffd84a');
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
  if (G.gfx === '3d' && R3.ready) return R3.screenToWorld(mx, my);
  return { x: (mx - G.vw / 2) / G.zoom + G.cam.x, y: (my - G.vh / 2) / G.zoom + G.cam.y };
}

function doNova(dmg, R) {
  G.fx.push({ type: 'ring', x: P.x, y: P.y, t: 0, max: 0.45, r: R, color: '#8fd8ff' });
  burst(P.x, P.y, '#bfeaff', 24, 220, 0.5, 3);
  breakPropsAt(P.x, P.y, R);
  for (const e of G.enemies) {
    if (e.dead || Math.hypot(e.x - P.x, e.y - P.y) >= R + e.r) continue;
    damageEnemy(e, dmg, { player: true, kb: 260, fx: P.x, fy: P.y });
    if (e.dead) continue;
    e.slow = 2.5;
    if (P.fx.novaFreeze && !e.boss && Math.random() < 0.35) {
      e.stun = 1.6; floatText(e.x, e.y - e.r - 18, 'Eingefroren', '#8fd8ff', false);
    }
  }
}

function castSkill(i) {
  const sk = SKILLS[i];
  if (G.state !== 'play' || G.paused || P.lvl < sk.unlock || P.cd[i] > 0 || P.mana < sk.mana) return false;
  const a = aimAngle(), F = P.fx;
  const dmg = skillDmg(sk);
  let ok = true;
  if (sk.id === 'fire') {
    const sp = 520;
    P.fireCount = (P.fireCount || 0) + 1;
    const inferno = F.fireInferno && P.fireCount % 5 === 0;
    G.projs.push({
      x: P.x + Math.cos(a) * 14, y: P.y + Math.sin(a) * 14, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: inferno ? 14 : 8, dmg: dmg * F.fireDmg * (inferno ? 3 : 1), friend: true, life: 1.1, color: '#ff8a2a', fire: true,
      radius: F.fireRadius * (inferno ? 1.7 : 1), splash: F.fireSplash, pierce: F.firePierce ? 1 : 0, split: F.fireSplit, hit: new Set(),
    });
  } else if (sk.id === 'nova') {
    const R = 170 * F.novaRadius, d = dmg * F.novaDmg;
    doNova(d, R);
    if (F.novaBarrier) { P.drT = 4; P.drV = F.novaBarrier; }
    if (F.novaEcho) { P.echoT = 0.45; P.echoDmg = d * 0.6; P.echoR = R * 1.25; }
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
      const d = dmg * F.boltDmg, hit = new Set(), pts = [{ x: P.x, y: P.y }];
      let cur = t;
      for (let j = 0; j < F.boltChains && cur; j++) {
        hit.add(cur); pts.push({ x: cur.x, y: cur.y });
        const cx = cur.x, cy = cur.y;
        breakPropsAt(cx, cy, 36);
        damageEnemy(cur, d, { player: true, kb: 60, fx: pts[pts.length - 2].x, fy: pts[pts.length - 2].y });
        if (!cur.dead && F.boltStun && !cur.boss && Math.random() < 0.25) cur.stun = Math.max(cur.stun, 0.5);
        if (F.boltMana) P.mana = Math.min(P.maxMana, P.mana + F.boltMana);
        if (F.boltThunder) {
          for (const e of G.enemies) {
            if (!e.dead && !hit.has(e) && Math.hypot(e.x - cx, e.y - cy) < 90 + e.r) damageEnemy(e, d * 0.5, { player: true, kb: 100, fx: cx, fy: cy });
          }
          G.fx.push({ type: 'flash', x: cx, y: cy, t: 0, max: 0.2, r: 70 });
        }
        let nx = null, nd = 210;
        for (const e of G.enemies) {
          if (e.dead || hit.has(e)) continue;
          const dd = Math.hypot(e.x - cx, e.y - cy);
          if (dd < nd && hasLOS(cx, cy, e.x, e.y)) { nx = e; nd = dd; }
        }
        cur = nx;
      }
      G.fx.push({ type: 'bolt', pts, t: 0, max: 0.18 });
    }
  } else if (sk.id === 'blink') {
    const mv = Input.moveVec();
    const ang = (mv.x || mv.y) ? Math.atan2(mv.y, mv.x) : a;
    const ox = P.x, oy = P.y;
    burst(P.x, P.y, '#b58cff', 18, 160, 0.5, 3);
    for (let d = 8; d <= 220; d += 8) {
      const nx = P.x + Math.cos(ang) * 8, ny = P.y + Math.sin(ang) * 8;
      if (blockedAt(nx, ny, P.r)) break;
      P.x = nx; P.y = ny;
    }
    burst(P.x, P.y, '#b58cff', 18, 160, 0.5, 3);
    if (F.blinkShock) {
      const sd = (16 * (1 + 0.07 * (P.lvl - 1)) + P.dmgFlat * 0.8) * (1 + P.dmgPct / 100);
      for (const [bx, by] of [[ox, oy], [P.x, P.y]]) {
        G.fx.push({ type: 'ring', x: bx, y: by, t: 0, max: 0.35, r: 90, color: '#c04bff' });
        for (const e of G.enemies) if (!e.dead && Math.hypot(e.x - bx, e.y - by) < 90 + e.r) damageEnemy(e, sd, { player: true, kb: 200, fx: bx, fy: by });
      }
    }
    if (F.blinkHaste) { P.hasteT = 3; P.hasteV = F.blinkHaste; }
    if (F.blinkVoid) P.invulnT = 0.6;
    if (F.blinkEcho) for (let j = 0; j < 4; j++) if (j !== i) P.cd[j] = Math.max(0, P.cd[j] - 1);
  }
  if (!ok) return false;
  P.mana -= sk.mana;
  Sfx.play(sk.id);
  G.kx -= Math.cos(a) * (sk.id === 'fire' ? 2.5 : 4); G.ky -= Math.sin(a) * (sk.id === 'fire' ? 2.5 : 4);
  P.cd[i] = skillCd(sk) * (sk.id === 'blink' ? 1 - F.blinkCdr : 1);
  P.face = a; P.castAnim = 0.15;
  return true;
}
function usePotion() {
  if (G.state !== 'play' || G.paused || P.potions <= 0 || P.potCd > 0 || P.hp >= P.maxHp) return;
  P.potions--; P.potCd = 1.0;
  Sfx.play('potion');
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
  G.time += dt; G.dt = dt;
  const mv = Input.moveVec();

  // Spieler
  if (P.drT > 0) P.drT -= dt;
  if (P.invulnT > 0) P.invulnT -= dt;
  if (P.hasteT > 0) P.hasteT -= dt;
  if (P.echoT > 0) {
    P.echoT -= dt;
    if (P.echoT <= 0) { doNova(P.echoDmg, P.echoR); Sfx.play('nova'); }
  }
  if (P.slowT > 0) P.slowT -= dt;
  const spd = 170 * (1 + P.move / 100 + (P.hasteT > 0 ? P.hasteV : 0)) * (P.slowT > 0 ? 0.6 : 1);
  if (P.kx || P.ky) {
    moveEnt(P, P.kx * dt, P.ky * dt);
    const f = Math.pow(0.003, dt);
    P.kx *= f; P.ky *= f;
    if (Math.abs(P.kx) < 4) P.kx = 0;
    if (Math.abs(P.ky) < 4) P.ky = 0;
  }
  if (P.hp < P.maxHp * 0.3) {
    G.heartT -= dt;
    if (G.heartT <= 0) { G.heartT = 0.85; Sfx.play('heart'); }
  }
  const kd = Math.exp(-14 * dt); G.kx *= kd; G.ky *= kd;
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
      if (i * i + j * j <= 49 && x >= 0 && y >= 0 && x < MW && y < MH && !G.explored[y * MW + x]) { G.explored[y * MW + x] = 1; UI.mmReveal(x, y); }
    }
  }

  for (const e of G.enemies) if (!e.dead) updateEnemy(e, dt);
  G.enemies = G.enemies.filter(e => !e.dead);

  updateProjs(dt);
  updateHazards(dt);
  updateAmbient(dt);

  // Beute
  for (const d of G.drops) {
    d.t += dt;
    if (Math.hypot(d.x - P.x, d.y - P.y) < 38) {
      if (d.potion) {
        if (P.potions < 6) { P.potions++; d.got = true; Sfx.play('pickup'); floatText(P.x, P.y - 24, '+Trank', '#e0343c', false); }
      } else if (P.inv.length < INV_MAX) {
        P.inv.push(d.item); d.got = true;
        const R = RARITY[d.item.rarity];
        if (d.item.rarity === 'legendary') Story.relic(d.item.name);
        Sfx.play({ normal: 'pickup', magic: 'pickupMagic', rare: 'pickupRare', legendary: 'pickupLegend' }[d.item.rarity]);
        UI.toast(`${d.item.name}`, R.color);
        saveGame();
      } else if (!d.warned) { d.warned = true; UI.toast('Rucksack voll!', '#ff6a6a'); }
    }
  }
  G.drops = G.drops.filter(d => !d.got);

  if (G.stairs && Math.hypot(G.stairs.x - P.x, G.stairs.y - P.y) < 34) {
    G.floor++; saveGame(); startFloor();
    Sfx.play('descend');
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
function fireShot(e, a, kind) {
  const def = e.def;
  if (kind === 'spit') {
    Sfx.play('spit', e);
    G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * def.projSpd, vy: Math.sin(a) * def.projSpd, r: 7, dmg: e.dmg, friend: false, life: 2.2, color: '#7ad84a', glow: '120,255,90', slow: true });
  } else if (kind === 'fan') {
    Sfx.play('fanfire', e);
    for (const da of [-0.3, 0, 0.3]) G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a + da) * def.projSpd, vy: Math.sin(a + da) * def.projSpd, r: 8, dmg: e.dmg, friend: false, life: 2.2, color: '#ff8a2a', glow: '255,140,50' });
  } else {
    Sfx.play('arrow', e);
    G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * def.projSpd, vy: Math.sin(a) * def.projSpd, r: 6, dmg: e.dmg, friend: false, life: 2, color: '#d8d0a0' });
  }
}

function radialBurst(e, n, spd, color, glow, dmgMul) {
  const off = Math.random() * 6.28;
  for (let i = 0; i < n; i++) {
    const a = off + (i / n) * 6.283;
    G.projs.push({ x: e.x, y: e.y, vx: Math.cos(a) * spd, vy: Math.sin(a) * spd, r: 8, dmg: e.dmg * dmgMul, friend: false, life: 3, color, glow });
  }
}

function updateEnemyAI(e, dt) {
  e.flash = Math.max(0, e.flash - dt); e.slow = Math.max(0, e.slow - dt);
  e.cd -= dt; e.lunge = Math.max(0, e.lunge - dt); e.dashCd -= dt;
  if (e.burnT > 0) {
    e.burnT -= dt; e.burnTick -= dt;
    if (Math.random() < 0.4) G.parts.push({ x: e.x + rnd(-e.r, e.r) * 0.6, y: e.y - e.r * 0.4, vx: rnd(-10, 10), vy: rnd(-50, -20), life: 0.4, max: 0.4, color: '#ff9a3a', size: 3, add: true });
    if (e.burnTick <= 0) { e.burnTick = 0.5; damageEnemy(e, e.burnDps * 0.5, {}); if (e.dead) return; }
  }
  if (e.kx || e.ky) {
    moveEnt(e, e.kx * dt, e.ky * dt);
    const f = Math.pow(0.002, dt);
    e.kx *= f; e.ky *= f;
    if (Math.abs(e.kx) < 4) e.kx = 0;
    if (Math.abs(e.ky) < 4) e.ky = 0;
  }
  if (e.stun > 0) { e.stun -= dt; return; }
  const d = Math.hypot(P.x - e.x, P.y - e.y);
  if (e.state === 'idle') {
    if (d < e.aggro && (d < 170 || hasLOS(e.x, e.y, P.x, P.y))) wake(e);
    else return;
  } else if (d > 1000 && !e.boss) { e.state = 'idle'; return; }

  const spd = e.spd * (e.slow > 0 ? 0.5 : 1) * (P.pw.chill && d < 150 ? 0.75 : 1) * dt;
  const def = e.def;
  const toP = Math.atan2(P.y - e.y, P.x - e.x);
  e.ang = toP;

  // Brennende Champions hinterlassen Feuer
  if (e.aff && e.aff.id === 'fire') {
    e.trailT -= dt;
    if (e.trailT <= 0 && e.moving) { e.trailT = 0.7; addZone(e.x, e.y, 26, 3, e.dmg * 0.3, 'fire', 0); }
  }

  if (e.wind > 0) { e.wind -= dt; return; }
  if (e.dashT > 0) {
    e.dashT -= dt;
    moveEnt(e, Math.cos(e.dashAng) * 420 * dt, Math.sin(e.dashAng) * 420 * dt);
    if (!e.dashHit && d < e.r + P.r + 6) { e.dashHit = true; hurtPlayer(e.dmg * 1.3, e.x, e.y); }
    return;
  }
  if (def.dash && e.dashCd <= 0 && d > 110 && d < 300 && hasLOS(e.x, e.y, P.x, P.y)) {
    e.dashT = 0.35; e.dashAng = toP; e.dashCd = 3.5; e.dashHit = false; Sfx.play('swing', e);
    return;
  }

  if (def.ranged) {
    if (d > def.keep + 25) {
      const a = steerAngle(e, P.x, P.y);
      moveEnt(e, Math.cos(a) * spd, Math.sin(a) * spd);
    } else if (d < def.keep - 70) {
      moveEnt(e, -Math.cos(toP) * spd, -Math.sin(toP) * spd);
    }
    if (d < 460 && e.cd <= 0 && hasLOS(e.x, e.y, P.x, P.y)) {
      e.cd = def.atkCd * (e.slow > 0 ? 1.5 : 1);
      fireShot(e, toP, def.shot || 'arrow');
    }
  } else {
    const reach = e.r + P.r + def.range + (def.slam ? 18 : 0);
    if (d > reach) {
      let a = steerAngle(e, P.x, P.y);
      if (def.erratic) a += Math.sin(G.time * 7 + e.seed) * 0.9;
      moveEnt(e, Math.cos(a) * spd, Math.sin(a) * spd);
    } else if (e.cd <= 0) {
      e.cd = def.atkCd * (e.slow > 0 ? 1.5 : 1);
      if (def.slam) {
        e.wind = 0.6;
        addStrike(e.x, e.y, def.slamR * (e.r / def.r), 0.6, e.dmg, def.leave);
        Sfx.play('swing', e);
      } else {
        e.lunge = 0.15;
        Sfx.play('swing', e);
        hurtPlayer(e.dmg, e.x, e.y);
        if (e.boss) G.shake = Math.max(G.shake, 6);
        if (P.pw.thorns && !e.dead) damageEnemy(e, e.dmg * 0.4, {});
      }
    }
  }

  if (e.boss) bossAI(e, dt);

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

function summon(e, type, n) {
  for (let i = 0; i < n; i++) {
    const m = spawnEnemy(type, e.x + rnd(-60, 60), e.y + rnd(-60, 60));
    m.state = 'chase';
    if (blockedAt(m.x, m.y, m.r)) { m.x = e.x; m.y = e.y; }
  }
}

function bossAI(e, dt) {
  const enraged = e.hp < e.maxHp * 0.5, k = enraged ? 0.7 : 1, kind = e.def.bossKind;
  e.t1 -= dt; e.t2 -= dt; e.t3 -= dt;
  const toP = Math.atan2(P.y - e.y, P.x - e.x);
  if (kind === 'bone') {
    if (e.t1 <= 0) {
      e.t1 = 4.5 * k;
      Sfx.play('bossBurst', e); G.shake = Math.max(G.shake, 5);
      radialBurst(e, enraged ? 20 : 14, 230, '#c04bff', '190,90,255', 0.5);
      G.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, max: 0.4, r: 80, color: '#c04bff' });
    }
    if (e.t3 <= 0) { e.t3 = 12; summon(e, 'imp', 3); UI.toast('Der Knochenfürst ruft Wichte!', '#e6c6ff'); }
  } else if (kind === 'queen') {
    if (e.t1 <= 0) {
      e.t1 = 4 * k; Sfx.play('spit', e);
      for (let i = -2; i <= 2; i++) G.projs.push({ x: e.x, y: e.y, vx: Math.cos(toP + i * 0.22) * 250, vy: Math.sin(toP + i * 0.22) * 250, r: 8, dmg: e.dmg * 0.5, friend: false, life: 2.4, color: '#7ad84a', glow: '120,255,90', slow: true });
    }
    if (e.t2 <= 0) {
      e.t2 = 6 * k; Sfx.play('bossBurst', e);
      addZone(P.x, P.y, 70, 6, e.dmg * 0.3, 'poison', 0.9);
      for (let i = 0; i < 2; i++) addZone(P.x + rnd(-150, 150), P.y + rnd(-150, 150), 60, 6, e.dmg * 0.3, 'poison', 1.1);
      UI.toast('Giftwolken!', '#9ae860');
    }
    if (e.t3 <= 0) { e.t3 = 12; summon(e, 'bat', 4); UI.toast('Die Königin ruft ihre Brut!', '#e6c6ff'); }
  } else if (kind === 'silence') {
    if (e.t1 <= 0) {
      e.t1 = 5 * k; Sfx.play('bossBurst', e); G.shake = Math.max(G.shake, 4);
      const n = enraged ? 10 : 7, off = Math.random() * 6.28;
      for (let i = 0; i < n; i++) {
        const a = off + (i / n) * 6.283;
        addStrike(P.x + Math.cos(a) * 150, P.y + Math.sin(a) * 150, 55, 1.0 + i * 0.07, e.dmg * 0.55, null);
      }
      addStrike(P.x, P.y, 60, 1.2, e.dmg * 0.6, null);
      UI.toast('Die Stille schlägt zu!', '#e8ecf8');
    }
    if (e.t2 <= 0) {
      e.t2 = 6.5 * k; Sfx.play('fanfire', e);
      for (let i = -3; i <= 3; i++) G.projs.push({ x: e.x, y: e.y, vx: Math.cos(toP + i * 0.2) * 260, vy: Math.sin(toP + i * 0.2) * 260, r: 8, dmg: e.dmg * 0.5, friend: false, life: 2.6, color: '#e8ecf8', glow: '220,230,255' });
    }
    if (e.t3 <= 0) { e.t3 = 13; summon(e, pick(['skeleton', 'spider', 'hound', 'cultist', 'bat']), 3); UI.toast('Echos erheben sich.', '#cfc8e6'); }
  } else if (kind === 'lava') {
    if (e.t1 <= 0) {
      e.t1 = 5 * k; Sfx.play('bossBurst', e); G.shake = Math.max(G.shake, 5);
      radialBurst(e, enraged ? 18 : 12, 220, '#ff8a2a', '255,140,50', 0.5);
      G.fx.push({ type: 'ring', x: e.x, y: e.y, t: 0, max: 0.4, r: 80, color: '#c04bff' });
    }
    if (e.t2 <= 0) {
      e.t2 = 6.5 * k;
      addStrike(P.x, P.y, 62, 0.9, e.dmg * 0.7, 'fire');
      for (let i = 0; i < 4; i++) addStrike(P.x + rnd(-240, 240), P.y + rnd(-240, 240), 62, 1.0 + i * 0.15, e.dmg * 0.7, 'fire');
      UI.toast('Meteore!', '#ff9a3a');
    }
    if (e.t3 <= 0) { e.t3 = 14; summon(e, 'hound', 2); UI.toast('Der Aschenfürst ruft Höllenhunde!', '#ffb070'); }
  }
}

// ---------- Gefahrenzonen ----------
function addStrike(x, y, r, warn, dmg, leave) {
  G.hazards.push({ x, y, r, kind: 'strike', warn, max: warn, dmg, leave: leave || null });
}
function addZone(x, y, r, life, dmg, type, warn) {
  G.hazards.push({ x, y, r, kind: 'zone', type, warn: warn || 0, max: warn || 0.001, life, dmg, tick: 0.3 });
}
function resolveStrike(h) {
  G.fx.push({ type: 'ring', x: h.x, y: h.y, t: 0, max: 0.4, r: h.r * 1.2, color: '#ff8a2a' });
  G.fx.push({ type: 'flash', x: h.x, y: h.y, t: 0, max: 0.2, r: h.r });
  burst(h.x, h.y, '#ffb347', 14, 200, 0.5, 3);
  G.shake = Math.max(G.shake, 4);
  Sfx.play('slam', h);
  breakPropsAt(h.x, h.y, h.r);
  if (G.state === 'play' && Math.hypot(P.x - h.x, P.y - h.y) < h.r + 4) hurtPlayer(h.dmg, h.x, h.y);
  if (h.leave) addZone(h.x, h.y, h.r * 0.8, 4, h.dmg * 0.25, h.leave, 0);
}
function updateHazards(dt) {
  for (const h of G.hazards) {
    if (h.warn > 0) {
      h.warn -= dt;
      if (h.warn <= 0 && h.kind === 'strike') resolveStrike(h);
      continue;
    }
    if (h.kind !== 'zone') continue;
    h.life -= dt; h.tick -= dt;
    if (Math.random() < dt * 14) {
      const a = Math.random() * 6.283, rr = Math.sqrt(Math.random()) * h.r;
      G.parts.push({ x: h.x + Math.cos(a) * rr, y: h.y + Math.sin(a) * rr * 0.8, vx: 0, vy: h.type === 'fire' ? -40 : -14, life: 0.6, max: 0.6, color: h.type === 'fire' ? '#ff9a3a' : '#8ff050', size: h.type === 'fire' ? 3 : 2.4, add: true });
    }
    if (h.tick <= 0) {
      h.tick = 0.5;
      if (G.state === 'play' && Math.hypot(P.x - h.x, P.y - h.y) < h.r) {
        hurtPlayer(h.dmg);
        if (h.type === 'poison') P.slowT = 0.8;
      }
    }
  }
  G.hazards = G.hazards.filter(h => h.kind === 'strike' ? h.warn > 0 : h.life > 0);
}

// ---------- Objekte (Dekor, Fässer, Säulen) ----------
function reachCount() {
  const d = bfs(G.map, G.startRoom.cx, G.startRoom.cy, 9999);
  let n = 0; for (let i = 0; i < d.length; i++) if (d[i] >= 0) n++;
  return n;
}
function placeProps() {
  G.props = []; G.deco.fill(0);
  const th = G.theme;
  let expect = reachCount();
  for (const r of G.rooms) {
    if (r.w >= 9 && r.h >= 9 && Math.random() < 0.8) {
      for (const [tx, ty] of [[r.x + 1, r.y + 1], [r.x + r.w - 2, r.y + 1], [r.x + 1, r.y + r.h - 2], [r.x + r.w - 2, r.y + r.h - 2]]) {
        if (Math.random() > 0.75 || !G.map[ty * MW + tx]) continue;
        const idx = ty * MW + tx;
        G.map[idx] = 0;
        if (reachCount() !== expect - 1) { G.map[idx] = 1; continue; }
        expect--; G.deco[idx] = 1;
        G.props.push({ kind: 'pillar', x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE + 6, hp: 0, seed: Math.random() * 10 });
      }
    }
    const n = rint(4, 8);
    for (let i = 0; i < n; i++) {
      const tx = r.x + rint(1, r.w - 2), ty = r.y + rint(1, r.h - 2);
      if (!G.map[ty * MW + tx]) continue;
      if (r === G.startRoom && Math.hypot(tx - r.cx, ty - r.cy) < 3) continue;
      const kind = Math.random() < 0.4 ? pick(th.decor.breakable) : pick(th.decor.deco);
      const p = { kind, x: (tx + 0.5 + rnd(-0.25, 0.25)) * TILE, y: (ty + 0.5 + rnd(-0.25, 0.25)) * TILE, hp: PROP_BREAKABLE[kind] ? 1 : 0, seed: Math.random() * 10 };
      if (kind === 'bones' || kind === 'rubble') {
        p.bits = []; for (let k = 0; k < 4; k++) p.bits.push([rnd(-9, 9), rnd(-3, 5), rnd(0, 6.28)]);
      }
      G.props.push(p);
    }
  }
}
function breakProp(p) {
  const i = G.props.indexOf(p);
  if (i < 0) return;
  G.props.splice(i, 1);
  const col = p.kind === 'geode' ? '#b89cff' : p.kind === 'urn' ? '#8a5a3a' : '#7a5a34';
  burst(p.x, p.y - 4, col, 12, 160, 0.6, 3.5, false);
  Sfx.play('break', p);
  Story.maybeName(p.kind);
  const ilvl = Math.max(1, G.floor * 2 + Math.floor(P.lvl / 2));
  if (Math.random() < 0.3) dropItem(p.x, p.y, makeItem(pick(Object.keys(SLOTS)), ilvl, weighted(DROP_TABLES.normal)));
  if (Math.random() < 0.15) G.drops.push({ x: p.x, y: p.y, potion: true, t: 0 });
}
function breakPropsAt(x, y, r) {
  for (const p of G.props.slice()) if (p.hp > 0 && Math.hypot(p.x - x, p.y - y) < r + 10) breakProp(p);
}

// ---------- Schwebeteilchen ----------
function initAmbient() {
  const a = G.theme.amb;
  G.amb = [];
  for (let i = 0; i < a.n; i++) G.amb.push({ x: P.x + rnd(-520, 520), y: P.y + rnd(-340, 340), ph: Math.random() * 6.28, s: rnd(0.6, 1.2) });
}
function updateAmbient(dt) {
  const a = G.theme.amb;
  for (const p of G.amb) {
    p.x += Math.sin(G.time * 0.7 + p.ph) * 8 * dt; p.y += a.vy * p.s * dt;
    if (p.x < P.x - 540) p.x += 1080; else if (p.x > P.x + 540) p.x -= 1080;
    if (p.y < P.y - 360) p.y += 720; else if (p.y > P.y + 360) p.y -= 720;
  }
}

function updateProjs(dt) {
  for (const p of G.projs) {
    p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
    if (solid(p.x, p.y)) { p.life = 0; if (p.fire) explode(p, null); continue; }
    if (p.friend) {
      if (p.fire) breakPropsAt(p.x, p.y, p.r + 6);
      for (const e of G.enemies) {
        if (e.dead || (p.hit && p.hit.has(e))) continue;
        if (Math.hypot(e.x - p.x, e.y - p.y) < e.r + p.r) {
          if (p.hit) p.hit.add(e);
          damageEnemy(e, p.dmg, { player: true, kb: 210, fx: p.x - p.vx, fy: p.y - p.vy });
          explode(p, e);
          if (p.split) {
            p.split = false;
            const ba = Math.atan2(p.vy, p.vx), sp = Math.hypot(p.vx, p.vy);
            for (const da of [-0.55, 0.55]) {
              G.projs.push({ x: p.x, y: p.y, vx: Math.cos(ba + da) * sp, vy: Math.sin(ba + da) * sp, r: 6, dmg: p.dmg * 0.5, friend: true, life: 0.6, color: '#ff8a2a', fire: true, radius: p.radius * 0.7, splash: p.splash, pierce: 0, split: false, hit: new Set(p.hit) });
            }
          }
          if (p.pierce > 0) p.pierce--; else p.life = 0;
          break;
        }
      }
    } else if (G.state === 'play' && Math.hypot(P.x - p.x, P.y - p.y) < P.r + p.r) {
      hurtPlayer(p.dmg, p.x - p.vx * 0.05, p.y - p.vy * 0.05); p.life = 0;
      if (p.slow) P.slowT = 2;
    }
    if (Math.random() < 0.6) G.parts.push({ x: p.x, y: p.y, vx: rnd(-20, 20), vy: rnd(-20, 20), life: 0.25, max: 0.25, color: p.color, size: 3 });
  }
  G.projs = G.projs.filter(p => p.life > 0);
}
function explode(p, direct) {
  burst(p.x, p.y, '#ffb347', 10, 140, 0.4, 3);
  if (!p.fire) return;
  Sfx.play('fireHit', p);
  G.fx.push({ type: 'flash', x: p.x, y: p.y, t: 0, max: 0.18, r: 70 * ((p.radius || 60) / 60) });
  if (p.big) G.shake = Math.max(G.shake, 5);
  for (const e of G.enemies) {
    if (e.dead || e === direct) continue;
    if (Math.hypot(e.x - p.x, e.y - p.y) < (p.radius || 60) + e.r) damageEnemy(e, p.dmg * (p.splash === undefined ? 0.5 : p.splash), { player: true, kb: 80, fx: p.x, fy: p.y });
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

// ---------- Skillpunkte ----------
const nodeById = id => TREE.find(n => n.id === id);
function spentIn(group) { let n = 0; for (const t of TREE) if (t.group === group) n += P.ranks[t.id] || 0; return n; }
function pointsAvail() { let n = 0; for (const t of TREE) n += P.ranks[t.id] || 0; return Math.max(0, P.lvl - 1 - n); }
function groupUnlocked(group) {
  const g = TREE_GROUPS.find(x => x.id === group);
  return g.skill < 0 || P.lvl >= SKILLS[g.skill].unlock;
}
function canSpend(id) {
  const n = nodeById(id);
  return !!n && (P.ranks[id] || 0) < n.max && pointsAvail() > 0 && groupUnlocked(n.group) && spentIn(n.group) >= n.need;
}
function spendPoint(id) {
  if (!canSpend(id)) return false;
  P.ranks[id] = (P.ranks[id] || 0) + 1;
  recalc(); saveGame();
  return true;
}
function respec() { P.ranks = {}; recalc(); saveGame(); }
