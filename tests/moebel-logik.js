// Prüft die Möbel-Logik (Stückliste, Zuschnitt, Fehlerfälle). Aufruf: node tests/moebel-logik.js
const M = require('../moebel/regal.js');
const assert = require('assert');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const m = M.buildRegal({ W: 800, H: 2000, D: 300, shelves: 4, dividers: 0 });
ok(!m.errors.length, 'Standardregal ohne Fehler');
// 2 Seiten + Boden + Deckel + 4 Böden + Rückwand = 9 Teile
ok(m.parts.length === 9, 'Teilezahl ' + m.parts.length);
// Fachhöhe: (2000-2*19 - 4*19)/5 ... Hi=1962, ch=(1962-76)/5
ok(Math.abs(m.derived.ch - (1962 - 76) / 5) < 1e-6, 'Fachhöhe');
// Gesamtvolumen Platten plausibel: Fläche aller Teile > 0 und Rückwand dünn
const plan = M.plan(m);
ok(plan.errors.length === 0, 'Plan ohne Fehler');
ok(plan.groups.plate.sheets.length > 0, 'mindestens eine Platte');

// Alle Teile werden platziert und überlappen nicht
function overlap(a, b) { return a.x < b.x + b.l && b.x < a.x + a.l && a.y < b.y + b.w && b.y < a.y + a.w; }
for (const g of Object.values(plan.groups)) {
  const placed = g.sheets.reduce((s, sh) => s + sh.items.length, 0);
  ok(placed > 0, 'Teile platziert');
  g.sheets.forEach((sh) => {
    sh.items.forEach((a, i) => {
      ok(a.x + a.l <= g.SL && a.y + a.w <= g.SW, 'Teil innerhalb der Platte');
      sh.items.slice(i + 1).forEach((b) => ok(!overlap(a, b), 'keine Überlappung'));
    });
  });
}
// Teile passen in ihre Lücke: Summe der Fachböden + Mittelteiler <= Innenbreite
for (const W of [800, 1001, 1200, 1499]) for (const t of [19, 18.9]) for (const d of [0, 1, 2, 3]) {
  const r = M.buildRegal({ W, H: 2000, D: 300, shelves: 3, dividers: d, t });
  const shelf = r.cutlist.find((g) => g.name === 'Fachboden');
  ok(shelf.l * (d + 1) + d * t <= W - 2 * t + 1e-6, 'Fachböden passen bei W=' + W + ' t=' + t + ' d=' + d);
  ok(r.parts.every((p) => p.size.every((v) => v === p.thick || Number.isInteger(v))), 'ganze mm');
}
const total = m.cutlist.reduce((s, g) => s + g.qty, 0);
const placedAll = Object.values(plan.groups).reduce((s, g) => s + g.sheets.reduce((a, sh) => a + sh.items.length, 0), 0);
ok(total === placedAll, 'alle ' + total + ' Teile platziert (' + placedAll + ')');

// Würfelregal: viele gleiche Teile, 3 Mittelteiler => 4 Spalten
const w = M.buildRegal({ W: 1500, H: 1500, D: 380, shelves: 3, dividers: 3 });
ok(w.parts.filter((p) => p.name === 'Fachboden').length === 12, 'Würfelregal 12 Fachböden');
ok(w.parts.filter((p) => p.name === 'Mittelteiler').length === 3, '3 Mittelteiler');

// Fehlerfälle
ok(M.buildRegal({ W: 300, H: 2000, D: 300, dividers: 6 }).errors.length > 0, 'zu schmale Fächer melden');
ok(M.buildRegal({ W: 800, H: 400, D: 300, shelves: 12 }).errors.length > 0, 'zu niedrige Fächer melden');
ok(M.buildRegal({ W: 600, H: 2300, D: 250 }).warnings.some((x) => /Kippen/.test(x)), 'Kipp-Hinweis');

// Teil zu groß für Baumarktplatte (Höhe 2600 > 2440-20)
const big = M.plan(M.buildRegal({ W: 800, H: 2600, D: 300, sheet: '2440x1220' }));
ok(big.errors.length > 0, 'zu großes Teil wird gemeldet');
console.log('moebel-logik: ' + n + ' Prüfungen ok');
