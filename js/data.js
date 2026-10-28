'use strict';
// ---------- Helfer ----------
const rnd = (a, b) => a + Math.random() * (b - a);
const rint = (a, b) => Math.floor(rnd(a, b + 1));
const pick = a => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function shuffle(a) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
function weighted(w) {
  let tot = 0;
  for (const k in w) tot += w[k];
  let r = Math.random() * tot;
  for (const k in w) if ((r -= w[k]) < 0) return k;
  return Object.keys(w)[0];
}

// ---------- Items ----------
const RARITY = {
  normal:    { name: 'Normal',    color: '#cfcfcf', n: [0, 0], mult: 1 },
  magic:     { name: 'Magisch',   color: '#6f95ff', n: [1, 2], mult: 1 },
  rare:      { name: 'Selten',    color: '#ffd84a', n: [3, 4], mult: 1.05 },
  legendary: { name: 'Legendär',  color: '#ff8a2a', n: [5, 5], mult: 1.3 },
};

const SLOTS = {
  weapon: { label: 'Stab',    icon: '🪄', bases: ['Eichenstab', 'Zauberstab', 'Kristallstab', 'Knochenstab'] },
  helm:   { label: 'Kopf',    icon: '🪖', bases: ['Kapuze', 'Zauberhut', 'Haube'] },
  chest:  { label: 'Brust',   icon: '🥋', bases: ['Robe', 'Gewand', 'Mantel'] },
  ring:   { label: 'Ring',    icon: '💍', bases: ['Ring', 'Reif', 'Siegelring'] },
  amulet: { label: 'Amulett', icon: '📿', bases: ['Amulett', 'Talisman', 'Anhänger'] },
};

// Ausrüstungs-Plätze (zwei Ringe)
const EQ_KEYS = ['weapon', 'helm', 'chest', 'amulet', 'ring1', 'ring2'];
const EQ_SLOT = { weapon: 'weapon', helm: 'helm', chest: 'chest', amulet: 'amulet', ring1: 'ring', ring2: 'ring' };

const AFFIXES = {
  dmg:       { label: '+# Zauberschaden',          min: 3,   max: 6 },
  dmgPct:    { label: '+#% Zauberschaden',         min: 6,   max: 12 },
  life:      { label: '+# Leben',                  min: 12,  max: 24 },
  mana:      { label: '+# Mana',                   min: 8,   max: 16 },
  crit:      { label: '+#% Krit-Chance',           min: 2,   max: 4 },
  critDmg:   { label: '+#% Krit-Schaden',          min: 10,  max: 20 },
  cdr:       { label: '+#% schnellere Abklingzeit', min: 3,  max: 6 },
  armor:     { label: '+# Rüstung',                min: 8,   max: 16 },
  lifeRegen: { label: '+# Leben pro Sek.',         min: 0.8, max: 1.6, dec: 1 },
  manaRegen: { label: '+# Mana pro Sek.',          min: 1,   max: 2.5, dec: 1 },
  move:      { label: '+#% Lauftempo',             min: 3,   max: 6 },
};

const SLOT_POOL = {
  weapon: ['dmg', 'dmgPct', 'crit', 'critDmg', 'cdr', 'mana'],
  helm:   ['life', 'armor', 'mana', 'cdr', 'manaRegen'],
  chest:  ['life', 'armor', 'lifeRegen', 'move', 'dmgPct'],
  ring:   ['dmgPct', 'crit', 'life', 'mana', 'manaRegen', 'lifeRegen'],
  amulet: ['dmgPct', 'critDmg', 'life', 'cdr', 'move', 'crit'],
};

const LEGENDARY_NAMES = {
  weapon: ['Aschenbringer', 'Sturmrufer', 'Flammenzunge'],
  helm:   ['Krone des Zwielichts', 'Aschenkrone'],
  chest:  ['Mantel der Nacht', 'Glutgewand'],
  ring:   ['Seelenband', 'Funkenring'],
  amulet: ['Herz des Sturms', 'Auge der Asche'],
};
const RARE_A = ['Schatten', 'Seelen', 'Blut', 'Frost', 'Grimm', 'Sturm', 'Asche', 'Nacht', 'Glut'];
const RARE_B = ['hauch', 'fluch', 'splitter', 'zorn', 'biss', 'ruf', 'herz', 'flüstern'];
const MAGIC_SUFFIX = ['Glut', 'Weisheit', 'Stärke', 'Eile', 'Nacht', 'Klarheit', 'Asche', 'Macht'];

function rollAffix(id, ilvl, rarity) {
  const a = AFFIXES[id];
  let v = rnd(a.min, a.max) * (1 + 0.09 * (ilvl - 1)) * (rarity === 'legendary' ? 1.35 : 1);
  v = a.dec ? Math.round(v * 10) / 10 : Math.max(1, Math.round(v));
  return { id, value: v };
}

function makeItem(slot, ilvl, rarity) {
  const R = RARITY[rarity];
  const it = { slot, ilvl, rarity, base: pick(SLOTS[slot].bases), affixes: [], implicit: null, name: '' };
  if (slot === 'weapon') it.implicit = { id: 'dmg', value: Math.round((3 + ilvl * 1.6) * R.mult) };
  else if (slot === 'helm') it.implicit = { id: 'armor', value: Math.round((5 + ilvl * 2.2) * R.mult) };
  else if (slot === 'chest') it.implicit = { id: 'armor', value: Math.round((8 + ilvl * 3.5) * R.mult) };

  const n = rint(R.n[0], R.n[1]);
  for (const id of shuffle(SLOT_POOL[slot]).slice(0, n)) it.affixes.push(rollAffix(id, ilvl, rarity));

  if (rarity === 'normal') it.name = it.base;
  else if (rarity === 'magic') it.name = `${it.base} der ${pick(MAGIC_SUFFIX)}`;
  else if (rarity === 'rare') it.name = pick(RARE_A) + pick(RARE_B);
  else { it.name = pick(LEGENDARY_NAMES[slot]); it.power = pick(POWERS).id; }
  return it;
}

const DROP_TABLES = {
  normal: { normal: 68, magic: 26, rare: 5.5, legendary: 0.5 },
  elite:  { normal: 8,  magic: 42, rare: 44,  legendary: 6 },
  boss:   { magic: 10,  rare: 65,  legendary: 25 },
};
function rollDrops(src, ilvl) {
  let count = 0;
  if (src === 'normal') count = Math.random() < 0.14 ? 1 : 0;
  else if (src === 'elite') count = rint(1, 2);
  else count = rint(4, 5);
  const out = [];
  for (let i = 0; i < count; i++) out.push(makeItem(pick(Object.keys(SLOTS)), ilvl, weighted(DROP_TABLES[src])));
  return out;
}

function affixLine(a) {
  return AFFIXES[a.id].label.replace('#', a.value);
}
const IMPLICIT_LABEL = { dmg: '+# Zauberschaden (Basis)', armor: '+# Rüstung (Basis)' };
function implicitLine(it) {
  return it.implicit ? IMPLICIT_LABEL[it.implicit.id].replace('#', it.implicit.value) : null;
}

function sumStats(eq) {
  const s = {};
  for (const k of EQ_KEYS) {
    const it = eq[k];
    if (!it) continue;
    if (it.implicit) s[it.implicit.id] = (s[it.implicit.id] || 0) + it.implicit.value;
    for (const a of it.affixes) s[a.id] = (s[a.id] || 0) + a.value;
  }
  return s;
}

// ---------- Skills ----------
const SKILLS = [
  { id: 'fire',  name: 'Feuerball',   icon: '🔥', unlock: 1, mana: 5,  cd: 0.4, coef: 1.0, base: 14 },
  { id: 'nova',  name: 'Frostnova',   icon: '❄️', unlock: 2, mana: 22, cd: 3.5, coef: 0.8, base: 18 },
  { id: 'bolt',  name: 'Kettenblitz', icon: '⚡', unlock: 3, mana: 14, cd: 1.3, coef: 0.9, base: 20 },
  { id: 'blink', name: 'Teleport',    icon: '🌀', unlock: 5, mana: 15, cd: 4,   coef: 0,   base: 0 },
];

// ---------- Gegner ----------
const ENEMIES = {
  skeleton: { name: 'Skelett',            r: 14, hp: 36,  spd: 95,  dmg: 7,  xp: 8,  color: '#cfc7a8', melee: true, range: 12, atkCd: 1.0 },
  imp:      { name: 'Wicht',              r: 10, hp: 18,  spd: 150, dmg: 4,  xp: 5,  color: '#d6603a', melee: true, range: 8,  atkCd: 0.8 },
  archer:   { name: 'Skelett-Schütze',    r: 13, hp: 26,  spd: 80,  dmg: 7,  xp: 10, color: '#a7b58a', ranged: true, keep: 230, atkCd: 1.9, projSpd: 290 },
  brute:    { name: 'Schlächter',         r: 20, hp: 120, spd: 70,  dmg: 17, xp: 26, color: '#a05a4a', melee: true, range: 16, atkCd: 1.5 },
  boss:     { name: 'Der Knochenfürst',   r: 34, hp: 1400, spd: 85, dmg: 28, xp: 220, color: '#7a3fb0', melee: true, range: 20, atkCd: 1.4, boss: true, bossKind: 'bone' },
  // Höhle
  bat:      { name: 'Höhlenfledermaus',   r: 9,  hp: 16,  spd: 175, dmg: 4,  xp: 5,  color: '#54406a', melee: true, range: 6, atkCd: 0.7, erratic: true },
  spider:   { name: 'Giftspinne',         r: 12, hp: 34,  spd: 95,  dmg: 6,  xp: 11, color: '#2c3a2c', ranged: true, keep: 170, atkCd: 2.2, projSpd: 250, shot: 'spit' },
  golem:    { name: 'Kristallgolem',      r: 22, hp: 260, spd: 52,  dmg: 24, xp: 38, color: '#6e6e78', melee: true, range: 22, atkCd: 2.4, slam: true, slamR: 85 },
  queen:    { name: 'Die Spinnenkönigin', r: 36, hp: 1700, spd: 80, dmg: 24, xp: 260, color: '#2e2a38', melee: true, range: 22, atkCd: 1.3, boss: true, bossKind: 'queen' },
  // Lavakluft
  hound:    { name: 'Höllenhund',         r: 12, hp: 40,  spd: 140, dmg: 9,  xp: 12, color: '#8a3a22', melee: true, range: 10, atkCd: 0.9, dash: true },
  cultist:  { name: 'Feuerkultist',       r: 13, hp: 38,  spd: 80,  dmg: 10, xp: 14, color: '#8a2a4a', ranged: true, keep: 240, atkCd: 2.4, projSpd: 240, shot: 'fan' },
  demon:    { name: 'Lavadämon',          r: 22, hp: 190, spd: 62,  dmg: 22, xp: 36, color: '#a8301a', melee: true, range: 22, atkCd: 2.2, slam: true, slamR: 80, leave: 'fire' },
  lavalord: { name: 'Der Aschenfürst',    r: 36, hp: 1800, spd: 70, dmg: 30, xp: 280, color: '#4a2a2c', melee: true, range: 22, atkCd: 1.5, boss: true, bossKind: 'lava' },
};

// Champion-Eigenschaften
const ELITE_AFFIXES = [
  { id: 'fast', label: 'Flink' },
  { id: 'boom', label: 'Explosiv' },
  { id: 'fire', label: 'Brennend' },
];

// ---------- Dungeon-Themen (wechseln alle 2 Ebenen) ----------
const THEMES = [
  { id: 'crypt', name: 'Die Gruft', ambient: '#403b5c', lightCol: '255,150,60', wall: 'torch', pillar: 'column', heavy: 'brute', boss: 'boss',
    roster: { skeleton: 50, archer: 24, imp: 14, brute: 8 },
    pal: { floor: [96, 90, 104], moss: 'rgba(40,70,40,.22)', brick: [94, 78, 76], bricks: true, roof: [46, 40, 54], rim: 'rgba(190,175,215,.28)' },
    amb: { col: '255,230,200', vy: -4, n: 36, size: 1.4, a: 0.35 }, decor: { breakable: ['urn', 'barrel'], deco: ['bones', 'rubble', 'candle'] } },
  { id: 'cave', name: 'Die Kristallhöhle', ambient: '#3a5a6e', lightCol: '110,220,255', wall: 'crystal', pillar: 'rock', heavy: 'golem', boss: 'queen',
    roster: { bat: 34, spider: 30, golem: 12, skeleton: 10 },
    pal: { floor: [86, 94, 102], moss: 'rgba(40,110,120,.28)', brick: [78, 84, 92], bricks: false, slabs: false, roof: [38, 36, 34], rim: 'rgba(150,210,220,.25)' },
    amb: { col: '120,255,220', vy: -12, n: 44, size: 1.8, a: 0.5 }, decor: { breakable: ['geode', 'barrel'], deco: ['crystal', 'mushroom', 'rubble', 'bones'] } },
  { id: 'lava', name: 'Die Lavakluft', ambient: '#4d2c28', lightCol: '255,110,40', wall: 'brazier', pillar: 'obsidian', heavy: 'demon', boss: 'lavalord',
    roster: { hound: 30, cultist: 28, demon: 12, imp: 22 },
    pal: { floor: [64, 54, 58], moss: 'rgba(120,30,10,.2)', brick: [68, 50, 52], bricks: true, roof: [34, 26, 30], rim: 'rgba(255,140,90,.28)', glow: true },
    amb: { col: '255,150,60', vy: -50, n: 50, size: 1.6, a: 0.7 }, decor: { breakable: ['barrel', 'urn'], deco: ['vent', 'spike', 'bones', 'rubble'] } },
];
const themeFor = f => THEMES[Math.floor((f - 1) / 2) % THEMES.length];

// ---------- Legendäre Kräfte ----------
const POWERS = [
  { id: 'lifesteal', label: 'Lebensraub: Du heilst 4% des verursachten Schadens' },
  { id: 'burn',      label: 'Treffer entzünden Gegner mit 20% Chance (Brandschaden über 3 s)' },
  { id: 'explode',   label: 'Getötete Gegner explodieren und verletzen Umstehende' },
  { id: 'thorns',    label: 'Dornen: Nahkämpfer erleiden 40% ihres Schadens zurück' },
  { id: 'killmana',  label: '+8 Mana pro getötetem Gegner' },
  { id: 'killhaste', label: 'Getötete Gegner geben +25% Lauftempo für 2 s' },
  { id: 'chill',     label: 'Gegner im Umkreis von 150 sind 25% langsamer' },
];
const POWER_BY_ID = {}; for (const p of POWERS) POWER_BY_ID[p.id] = p;

// ---------- Skill-Baum ----------
// need = Punkte, die in dieser Gruppe schon ausgegeben sein müssen
const TREE_GROUPS = [
  { id: 'fire',  name: 'Feuerball',   icon: '🔥', skill: 0 },
  { id: 'nova',  name: 'Frostnova',   icon: '❄️', skill: 1 },
  { id: 'bolt',  name: 'Kettenblitz', icon: '⚡', skill: 2 },
  { id: 'blink', name: 'Teleport',    icon: '🌀', skill: 3 },
  { id: 'pass',  name: 'Passiv',      icon: '✨', skill: -1 },
];
const TREE = [
  { id: 'fire_dmg',    group: 'fire', need: 0, max: 5, name: 'Glühende Hitze',    text: r => `+${10 * r}% Feuerball-Schaden` },
  { id: 'fire_splash', group: 'fire', need: 0, max: 3, name: 'Explosive Glut',    text: r => `Explosionsradius +${20 * r}%, Flächenschaden ${50 + 10 * r}%` },
  { id: 'fire_pierce', group: 'fire', need: 3, max: 1, name: 'Durchschlag',       text: () => 'Feuerbälle durchschlagen einen Gegner' },
  { id: 'fire_split',  group: 'fire', need: 5, max: 1, name: 'Teilung',           text: () => 'Beim Treffer teilt sich der Feuerball in 2 kleinere (50% Schaden)' },
  { id: 'fire_cap',    group: 'fire', need: 8, max: 1, name: 'Inferno',           text: () => 'Jeder 5. Feuerball ist ein Inferno: 300% Schaden, riesige Explosion' },

  { id: 'nova_dmg',     group: 'nova', need: 0, max: 5, name: 'Eisiger Hauch',     text: r => `+${10 * r}% Frostnova-Schaden` },
  { id: 'nova_radius',  group: 'nova', need: 0, max: 3, name: 'Weite Kälte',       text: r => `+${15 * r}% Radius` },
  { id: 'nova_freeze',  group: 'nova', need: 3, max: 1, name: 'Tiefenfrost',       text: () => '35% Chance, Gegner 1,6 s einzufrieren (nicht Bosse)' },
  { id: 'nova_barrier', group: 'nova', need: 5, max: 3, name: 'Frostbarriere',     text: r => `Nach der Nova: ${15 * r}% weniger Schaden für 4 s` },
  { id: 'nova_cap',     group: 'nova', need: 8, max: 1, name: 'Absoluter Nullpunkt', text: () => 'Die Nova wiederholt sich nach 0,45 s (60% Schaden, größerer Radius)' },

  { id: 'bolt_dmg',   group: 'bolt', need: 0, max: 5, name: 'Statische Ladung',  text: r => `+${10 * r}% Blitz-Schaden` },
  { id: 'bolt_chain', group: 'bolt', need: 0, max: 3, name: 'Kettenreaktion',    text: r => `+${r} Ziele (insgesamt ${5 + r})` },
  { id: 'bolt_stun',  group: 'bolt', need: 3, max: 1, name: 'Schockwelle',       text: () => '25% Chance, getroffene Gegner 0,5 s zu betäuben' },
  { id: 'bolt_mana',  group: 'bolt', need: 5, max: 3, name: 'Mana-Leitung',      text: r => `+${2 * r} Mana pro getroffenem Gegner` },
  { id: 'bolt_cap',   group: 'bolt', need: 8, max: 1, name: 'Donnerschlag',      text: () => 'Jeder Treffer entlädt sich im Umkreis (50% Schaden)' },

  { id: 'blink_cdr',   group: 'blink', need: 0, max: 3, name: 'Gewandtheit',      text: r => `Abklingzeit -${12 * r}%` },
  { id: 'blink_haste', group: 'blink', need: 0, max: 3, name: 'Schattenschritt',  text: r => `+${15 * r}% Lauftempo für 3 s nach dem Teleport` },
  { id: 'blink_shock', group: 'blink', need: 3, max: 1, name: 'Phasenschock',     text: () => 'Schaden an Gegnern am Start- und Zielpunkt' },
  { id: 'blink_void',  group: 'blink', need: 5, max: 1, name: 'Leerenhülle',      text: () => '0,6 s unverwundbar nach dem Teleport' },
  { id: 'blink_cap',   group: 'blink', need: 8, max: 1, name: 'Arkanes Echo',     text: () => 'Teleport verkürzt alle anderen Abklingzeiten um 1 s' },

  { id: 'p_dmg',   group: 'pass', need: 0, max: 5, name: 'Arkane Macht',     text: r => `+${4 * r}% Zauberschaden` },
  { id: 'p_life',  group: 'pass', need: 0, max: 5, name: 'Zähigkeit',        text: r => `+${20 * r} Leben` },
  { id: 'p_mana',  group: 'pass', need: 0, max: 5, name: 'Manafluss',        text: r => `+${(1.5 * r).toFixed(1)} Mana pro Sek.` },
  { id: 'p_crit',  group: 'pass', need: 0, max: 5, name: 'Kritisches Wissen', text: r => `+${2 * r}% Krit-Chance` },
  { id: 'p_move',  group: 'pass', need: 0, max: 3, name: 'Eile',             text: r => `+${3 * r}% Lauftempo` },
  { id: 'p_kill',  group: 'pass', need: 5, max: 3, name: 'Seelenernte',      text: r => `Getötete Gegner heilen ${2 * r}% des max. Lebens` },
];
