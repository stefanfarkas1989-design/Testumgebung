// Balance-Simulation (reines Node, kein Browser): misst pro Ebene Schadensdurchsatz des Spielers
// und Gegnerschaden. Aufruf: node tests/balance-sim.js [--table]
const fs = require('fs'), vm = require('vm'), path = require('path');
const root = path.join(__dirname, '..');
let seed = 12345;
const rng = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
const ctx = { Math: Object.create(Math), console };
ctx.Math.random = rng;
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(root, 'js/data.js'), 'utf8') +
  '\nthis.X = { BALANCE, ENEMIES, THEMES, SKILLS, SLOTS, EQ_KEYS, EQ_SLOT, makeItem, sumStats, weighted, rollDrops, DROP_TABLES, themeFor };', ctx);
const X = ctx.X;

// Formeln aus game.js (bei Änderungen dort hier nachziehen)
const xpNeed = l => Math.round(30 * Math.pow(l, 1.55));
const ilvlOf = (f, lvl) => Math.max(1, f * 2 + Math.floor(lvl / 2));
const B = X.BALANCE, UPTIME = 0.55; // Anteil der Zeit, in der der Spieler wirklich trifft (Ausweichen, Laufen)
const hpMul = (f, boss) => (1 + B.hpPerFloor * (f - 1)) * (boss ? B.bossHp : 1);
const dmgMul = (f, boss) => (1 + B.dmgPerFloor * (f - 1)) * (boss ? B.bossDmg : 1);

// Durchschnitts-Ausrüstung: pro Platz bestes von 3 Drops gleicher Ebene (Spieler wählt aus)
function gearFor(f, lvl, quality) {
  const eq = {};
  for (const k of X.EQ_KEYS) {
    let best = null, bv = -1;
    for (let i = 0; i < 3; i++) {
      const it = X.makeItem(X.EQ_SLOT[k], ilvlOf(f, lvl), X.weighted(quality));
      const v = (it.implicit ? it.implicit.value : 0) + it.affixes.reduce((a, x) => a + x.value, 0);
      if (v > bv) { bv = v; best = it; }
    }
    eq[k] = best;
  }
  return eq;
}
function playerAt(f, lvl) {
  const s = X.sumStats(gearFor(f, lvl, { normal: 40, magic: 40, rare: 18, legendary: 2 }));
  const maxHp = Math.round(100 + 14 * (lvl - 1) + (s.life || 0));
  const armor = s.armor || 0;
  const dmgPct = s.dmgPct || 0, flat = s.dmg || 0;
  const crit = Math.min(60, 5 + (s.crit || 0)), critDmg = 150 + (s.critDmg || 0);
  const fire = X.SKILLS[0];
  const hit = (fire.base * (1 + 0.07 * (lvl - 1)) + flat * fire.coef) * (1 + dmgPct / 100);
  const avg = hit * (1 + crit / 100 * (critDmg / 100 - 1));
  const cd = fire.cd * (1 - Math.min(50, s.cdr || 0) / 100);
  const manaRegen = 9 + (s.manaRegen || 0), maxMana = 60 + 5 * (lvl - 1) + (s.mana || 0);
  // Mana-begrenzt: Dauer-Feuerrate = min(1/cd, manaRegen/Kosten)
  const rate = Math.min(1 / cd, manaRegen / fire.mana);
  return { lvl, maxHp, armor, dps: avg * rate, burst: avg / cd, maxMana };
}
// Erwartetes Level beim Betreten der Ebene f: XP aus allen vorigen Ebenen (≈ 9 Räume à 4–6 Gegner)
function levelAt(f) {
  let xp = 0, lvl = 1;
  for (let g = 1; g < f; g++) {
    const th = X.themeFor(g), roster = Object.assign({}, th.roster); roster[th.heavy] = (roster[th.heavy] || 0) + g * 2;
    const tot = Object.values(roster).reduce((a, b) => a + b, 0);
    let per = 0; for (const t in roster) per += roster[t] / tot * X.ENEMIES[t].xp * (1 + 0.1 * (g - 1));
    const kills = 8 * (4 + Math.floor(g / 3)) * 1.3; // inkl. Wicht-/Fledermausrudel
    xp += per * kills + X.ENEMIES[th.boss].xp * (1 + 0.1 * (g - 1)) * 1.0;
    while (xp >= xpNeed(lvl)) { xp -= xpNeed(lvl); lvl++; }
  }
  return lvl;
}
const rows = [];
for (let f = 1; f <= 9; f++) {
  const lvl = levelAt(f) + 1; // Mitte der Ebene
  const N = 200, P = { lvl, maxHp: 0, armor: 0, dps: 0 };
  for (let i = 0; i < N; i++) { const q = playerAt(f, lvl); P.maxHp += q.maxHp / N; P.armor += q.armor / N; P.dps += q.dps * UPTIME / N; }
  const th = X.themeFor(f), bd = X.ENEMIES[th.boss];
  const bossHp = bd.hp * hpMul(f, true), bossDmg = bd.dmg * dmgMul(f, true);
  const red = P.armor / (P.armor + 60 + 8 * f);
  const heavy = X.ENEMIES[th.heavy];
  const roster = th.roster, tot = Object.values(roster).reduce((a, b) => a + b, 0);
  let avgHp = 0, avgDps = 0;
  for (const t in roster) { const d = X.ENEMIES[t]; avgHp += roster[t] / tot * d.hp * hpMul(f) * (th.echo ? 1.25 : 1); avgDps += roster[t] / tot * d.dmg * dmgMul(f) / d.atkCd; }
  const bossHit = bossDmg * (1 - red);
  rows.push({ f, lvl, hp: Math.round(P.maxHp), dps: P.dps, ttkBoss: bossHp / P.dps, ttkMob: avgHp / P.dps,
    bossHitPct: bossHit / P.maxHp * 100, mobDps: avgDps * (1 - red), heavyTtk: heavy.hp * hpMul(f) / P.dps });
}
if (process.argv.includes('--table')) {
  console.log('Ebene Lvl   HP   DPS  Boss-TTK  Mob-TTK  BossTreffer%  Mob-DPS');
  for (const r of rows) console.log([r.f, r.lvl, r.hp, r.dps.toFixed(0), r.ttkBoss.toFixed(0) + 's', r.ttkMob.toFixed(1) + 's', r.bossHitPct.toFixed(1), r.mobDps.toFixed(1)].map(v => String(v).padStart(8)).join(''));
}
// Grenzwerte: Bosskämpfe 25–120 s, Boss-Treffer unter 40 % der Lebenspunkte, normale Gegner < 6 s
let bad = 0;
for (const r of rows) {
  const why = [];
  if (r.ttkBoss < 25 || r.ttkBoss > 120) why.push(`Boss-TTK ${r.ttkBoss.toFixed(0)}s`);
  if (r.bossHitPct > 40) why.push(`Boss-Treffer ${r.bossHitPct.toFixed(0)}%`);
  if (r.ttkMob > 6) why.push(`Mob-TTK ${r.ttkMob.toFixed(1)}s`);
  if (why.length) { bad++; console.log(`Ebene ${r.f}: ` + why.join(', ')); }
}
// Gesamtspielzeit grob: Kampfzeit + Laufen (~9 min/Ebene (Laufen, Erkunden, Lesen) Grundlast)
let tot = 0; for (const r of rows) tot += r.ttkMob * 8 * 5 + r.ttkBoss + 540;
console.log(`Geschätzte Spielzeit Ebene 1–9: ${(tot / 3600).toFixed(1)} h`);
if (tot / 3600 < 1.5 || tot / 3600 > 2.5) { console.log('Spielzeit außerhalb 1,5–2,5 h'); bad++; }
console.log(bad ? 'BALANCE-ABWEICHUNGEN: ' + bad : 'Balance im Zielbereich.');
process.exit(0);
