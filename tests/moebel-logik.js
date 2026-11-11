// Prüft die Möbel-Logik (Stückliste, Zuschnitt, Fehlerfälle). Aufruf: node tests/moebel-logik.js
const M = require('../moebel/regal.js');
const assert = require('assert');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };

const m = M.buildRegal({ W: 800, H: 2000, D: 300, shelves: 4, dividers: 0, sockel: 'seiten', plinth: 0 });
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
// Rückwand in Nut: Maße aus Nutparametern
{
  const r = M.buildRegal({ W: 800, H: 2000, D: 300, t: 19, shelves: 4, back: true, bt: 3, backMode: 'nut', nutA: 10, nutT: 8, nutLuft: 1, sockel: 'seiten', plinth: 0 });
  const g = (n) => r.cutlist.find((c) => c.name === n);
  ok(g('Seitenwand').w === 300 && g('Boden').w === 300, 'Korpus volle Tiefe');
  ok(g('Fachboden').w === 287, 'Fachboden endet an der Rückwand (300-10-3)');
  ok(g('Rückwand').l === 1962 + 14 && g('Rückwand').w === 762 + 14, 'Rückwand = Innenmaß + 2 x 7');
  const side = r.parts.find((p) => p.name === 'Seitenwand');
  ok(side.grooves && side.grooves[0].box[1][0] === 19 - 8 && side.grooves[0].box[1][1] === 2000 - 19 + 8, 'Seitennut gestoppt auf Höhe der Nutgründe');
  ok(M.buildRegal({ backMode: 'nut', nutT: 19, t: 19 }).errors.length > 0, 'zu tiefe Nut wird gemeldet');
  const a = M.buildRegal({ W: 800, H: 2000, D: 300, backMode: 'auf', sockel: 'seiten', plinth: 0 });
  ok(a.cutlist.find((c) => c.name === 'Seitenwand').w === 297 && !a.parts.some((p) => p.grooves), 'aufgesetzte Rückwand ohne Nut');
}
// Verbinder: Boden an Seitenwand, 300 tief: K 50, D 114, K 178, D 242 (von vorne)
{
  const r = M.buildRegal({ W: 1200, H: 2000, D: 300, shelves: 3, dividers: 1, plinth: 60, sockel: 'seiten' });
  const iB = r.parts.findIndex((p) => p.name === 'Boden');
  const left = r.parts.findIndex((p) => p.name === 'Seitenwand' && p.pos[0] < 0);
  const hs = r.holes.filter((h) => h.part === left && h.mate === iB).sort((a, b) => b.at[2] - a.at[2]);
  ok(hs.map((h) => h.type).join() === 'Konfirmat,Dübel,Konfirmat,Dübel', 'Abfolge K/D/K/D: ' + hs.map((h) => h.type).join());
  ok(hs.map((h) => 150 - h.at[2]).join() === '50,114,178,242', 'Positionen ab Vorderkante: ' + hs.map((h) => 150 - h.at[2]).join());
  ok(hs.every((h) => h.dia === (h.type === 'Dübel' ? 8 : 7)), 'Durchmesser in der Fläche');
  const edge = r.holes.filter((h) => h.part === iB && h.kind === 'edge');
  ok(edge.filter((h) => h.type === 'Konfirmat-Kernloch').every((h) => h.dia === 5 && h.depth === 36), 'Kernloch Ø5 × 36');
  ok(edge.filter((h) => h.type === 'Dübel').every((h) => h.depth === 19), 'Dübel Stirn 19');
  ok(r.holes.filter((h) => h.kind === 'face' && h.type === 'Dübel').every((h) => h.depth === 13), 'Dübel Fläche 13');
  ok(!r.warnings.some((w) => /kollidieren/.test(w)), 'keine Kollision am Mittelteiler');
  ok(r.warnings.some((w) => /Sockelblende an Seitenwand/.test(w)), 'zu kurze Verbindung wird gemeldet');
  const mt = r.parts.findIndex((p) => p.name === 'Mittelteiler');
  ok(r.holes.filter((h) => h.part === mt && h.kind === 'face').every((h) => h.type === 'Dübel'), 'am Mittelteiler nur Dübel');
  ok(M.buildRegal({ verbinder: false }).holes.length === 0, 'Verbinder abschaltbar');
}
// Füße, Deckenblende, Arbeitsplatte
{
  const f = M.buildRegal({ W: 800, H: 2000, D: 300, plinth: 100, sockel: 'fuesse' });
  const g = (r, n) => r.cutlist.find((c) => c.name === n);
  ok(g(f, 'Seitenwand').l === 1900, 'Seiten ab Fußhöhe');
  ok(f.feet.length === 4 && f.feet.every((x) => x.d === 25 && x.h === 100), '4 Füße Ø25 × 100');
  ok(M.buildRegal({ plinth: 80, sockel: 'fuesse' }).warnings.some((w) => /Verstellbereich/.test(w)), 'Sockelhöhe außerhalb 100–120 wird gemeldet');
  ok(!f.warnings.some((w) => /Verstellbereich/.test(w)), '100 mm liegt im Verstellbereich');
  const q = M.buildRegal({ fussTyp: 'qwork', plinth: 120 });
  ok(q.feet.every((x) => x.d === 25 && x.platte === 70 && x.kopf === 46) && !q.warnings.some((w) => /Verstellbereich/.test(w)), 'QWORK: Ø25, Platte 70, 100–120');
  ok(M.buildRegal({ fussTyp: 'qwork', plinth: 130 }).warnings.some((w) => /Verstellbereich/.test(w)), 'QWORK 130 mm außerhalb (Titelangabe 100–120)');
  ok(M.buildRegal({ fussTyp: 'qwork', fussRand: 30 }).warnings.some((w) => /Grundplatte/.test(w)), 'Grundplatte steht über');
  ok(g(f, 'Sockelblende').l === 800 && !f.holes.some((h) => f.parts[h.part].name === 'Sockelblende'), 'Sockelblende volle Breite, geklipst, ohne Verbinder');
  const s = M.buildRegal({ typ: 'schrank', W: 800, H: 2200, D: 600, raumH: 2500, blendeLuft: 5 });
  ok(g(s, 'Deckenblende').w === 295 && g(s, 'Deckenblende').l === 800, 'Deckenblende = Raumhöhe − Höhe − Luft');
  ok(s.holes.some((h) => s.parts[h.part].name === 'Deckenblende' && h.kind === 'edge'), 'Deckenblende von innen durch den Deckel verbunden');
  const sb = M.buildRegal({ typ: 'sideboard', W: 1800, H: 700, D: 400, apUeb: 20, dividers: 2, shelves: 1 });
  ok(g(sb, 'Arbeitsplatte').l === 1800 && g(sb, 'Arbeitsplatte').w === 420, 'Arbeitsplatte: seitlich bündig, vorne Überstand');
  ok(!sb.holes.some((h) => sb.parts[h.part].name === 'Arbeitsplatte'), 'keine Bohrungen von oben in der Arbeitsplatte');
  ok(sb.feet.length === 8, 'Füße auch unter den Mittelteilern');
  // Arbeitsplatte: eigene Materialgruppe, Kantenart B; Spax pro Fach 4 Stück im Deckel
  const ap = sb.cutlist.find((c) => c.name === 'Arbeitsplatte');
  ok(ap.mat === 'ap' && ap.edgeKind === 'B', 'Arbeitsplatte eigene Gruppe, Kantenart B');
  const iD = sb.parts.findIndex((q) => q.name === 'Deckel');
  const spax = sb.holes.filter((h) => h.part === iD && h.type === 'Spax-Durchgang');
  ok(spax.length === 12 && spax.every((h) => h.dia === 5 && h.through), '3 Fächer × 4 Spax, Ø5 durch');
  ok(Object.keys(M.plan(sb).groups).includes('ap'), 'Arbeitsplatte im Zuschnitt als eigene Gruppe');
  ok(M.buildRegal({ typ: 'sideboard', apT: 16 }).errors.some((e) => /zu lang/.test(e)), 'zu lange Spax wird gemeldet');
}
// Türen: Drehtüren aufliegend (Sensys), Schiebetüren SlideLine M einliegend
{
  const r = M.buildRegal({ typ: 'sideboard', W: 1800, H: 700, D: 400, shelves: 1, dividers: 2, doors: ['dt-l', 'st', 'dt-2'] });
  const g = (n) => r.cutlist.filter((c) => c.name === n);
  ok(!r.errors.length, 'Türen ohne Fehler');
  ok(g('Drehtür').some((c) => c.l === 597 && c.w === 600), 'Drehtür: Höhe = Korpus − Fuge, Breite bis Mitte Mittelteiler');
  ok(g('Drehtür').some((c) => c.qty === 2 && c.w === 298), 'Doppeltür: (600 − 3) / 2');
  ok(g('Schiebetür')[0].l === 562 - 27 && g('Schiebetür')[0].w === 301 && g('Schiebetür')[0].qty === 2, 'Schiebetür: LH − 27, (LW − 2 + 30) / 2');
  ok(g('Fachboden').some((c) => c.w === 387 - 59), 'Fachboden hinter den Schiebetüren 59 mm zurück');
  ok(r.cutlist.filter((c) => c.mat === 'front').every((c) => c.edgeKind === 'C' && c.edges.length === 4), 'Fronten: Kantenart C, rundum');
  ok(r.hinges.length === 6 && r.hinges.filter((h) => h.art === 'Mittelwandanschlag').length === 2, '6 Bänder, 2 am Mittelteiler');
  const topf = r.holes.filter((h) => h.type === 'Topf');
  ok(topf.length === 6 && topf.every((h) => h.dia === 35 && h.depth === 12.9), 'Topfbohrung Ø35 × 12,9');
  const door = r.parts.find((q) => q.name === 'Drehtür');
  const t0 = topf.find((h) => h.part === r.parts.indexOf(door));
  ok(Math.abs((t0.at[0] - (door.pos[0] - door.size[0] / 2)) - 22.5) < 0.01, 'Topfmitte = K 5 + 17,5 vom Türrand');
  const mp = r.holes.filter((h) => h.type === 'Montageplatte');
  ok(mp.length === 12 && mp.every((h) => h.dia === 5 && h.depth === 12 && Math.abs(h.at[2] - (200 - 37)) < 0.01), 'Montageplatte 2 × Ø5 × 12, 37 mm von vorne');
  ok(r.holes.filter((h) => h.type === 'Topf' && h.part === r.parts.indexOf(door)).length === 2, 'Tür bis 1000 mm: 2 Bänder');
  const tall = M.buildRegal({ typ: 'schrank', W: 800, H: 2200, D: 600, shelves: 5, doors: ['dt-2'] });
  ok(tall.holes.filter((h) => h.type === 'Topf').length === 8, 'Tür über 1800 mm: 4 Bänder je Tür');
  ok(M.buildRegal({ W: 800, H: 700, D: 400, doors: ['st'], frontT: 22 }).errors.length > 0, 'Schiebetür über 20 mm wird gemeldet');
}
// Mehrere Korpusse unter einer Arbeitsplatte
{
  const r = M.buildRegal({ typ: 'sideboard', W: 3530, H: 760, D: 400, korpusse: 2, dividers: 2, shelves: 1, apT: 38,
    doors: ['dt-l', 'dt-l', 'dt-r', 'dt-l', 'dt-r', 'dt-r'] });
  const g = (n) => r.cutlist.find((c) => c.name === n);
  ok(!r.errors.length, '2 Korpusse ohne Fehler');
  ok(g('Seitenwand').qty === 4 && g('Boden').qty === 2 && g('Boden').l === 1765 - 38, 'je Korpus eigene Seiten/Böden (1765 breit)');
  ok(g('Arbeitsplatte').qty === 1 && g('Arbeitsplatte').l === 3530, 'eine durchgehende Arbeitsplatte');
  ok(r.feet.length === 16, 'Füße je Korpus');
  ok(r.cutlist.filter((c) => c.name === 'Drehtür').reduce((s, c) => s + c.qty, 0) === 6, '6 Türen');
  ok(!r.warnings.some((w) => /kollid/.test(w)), 'Anschläge ohne Kollision am Mittelteiler');
  ok(r.holes.every((h) => h.part < r.parts.length), 'Bohrungen zeigen auf gültige Teile');
  const xs = r.parts.filter((q) => q.name === 'Seitenwand').map((q) => q.pos[0]).sort((a, b) => a - b);
  ok(Math.abs(xs[0] + 3530 / 2 - 9.5) < 0.01 && Math.abs(xs[3] - 3530 / 2 + 9.5) < 0.01, 'Seiten außen bündig mit Gesamtbreite');
}
// Wand zu Wand mit Passblenden
{
  const r = M.buildRegal({ typ: 'sideboard', W: 3540, H: 760, D: 400, korpusse: 2, dividers: 2, shelves: 1, apT: 38, wand: true, passB: 50,
    doors: ['dt-l', 'dt-l', 'dt-r', 'dt-l', 'dt-r', 'dt-r'], apFe: { name: 'Kaindl Postforming Arbeitsplatte' } });
  const g = (n) => r.cutlist.find((c) => c.name === n);
  ok(!r.errors.length, 'Wand zu Wand ohne Fehler');
  ok(g('Arbeitsplatte').l === 3540 && g('Arbeitsplatte').edges.length === 0, 'Arbeitsplatte wandbündig, keine Seitenkanten, Postforming vorne ohne Kante');
  ok(g('Boden').l === 1720 - 38, 'Korpus = (3540 − 2 × 50) / 2');
  ok(g('Passblende').qty === 2 && g('Passblende').w === 48, 'Passblenden 50 − halbe Fuge');
  const pl = r.parts.filter((q) => q.name === 'Sockelblende');
  ok(Math.abs(Math.min(...pl.map((q) => q.pos[0] - q.size[0] / 2)) + 1770) < 0.01 && Math.abs(Math.max(...pl.map((q) => q.pos[0] + q.size[0] / 2)) - 1770) < 0.01, 'Sockelblenden bis zur Wand');
  ok(r.parts.filter((q) => q.name === 'Drehtür').every((q) => q.hinge === -1 || q.hinge === 1), 'Drehtüren kennen ihre Bandseite');
  const nopf = M.buildRegal({ typ: 'sideboard', W: 2000, H: 760, D: 400, wand: true, apT: 38 });
  ok(nopf.cutlist.find((c) => c.name === 'Arbeitsplatte').edges.join() === 'W0', 'ohne Postforming: nur Vorderkante');
  const ue = M.buildRegal({ typ: 'sideboard', W: 3540, H: 760, D: 400, korpusse: 2, apT: 38, wand: true, passB: 50, uebermass: 20 });
  const apu = ue.cutlist.find((c) => c.name === 'Arbeitsplatte'), pbu = ue.cutlist.find((c) => c.name === 'Passblende');
  ok(apu.l === 3540 && apu.ol === 3580 && apu.ow === 420, 'Arbeitsplatte: fertig 3540, bestellt 3580');
  ok(pbu.w === 48 && pbu.ow === 68 && pbu.ol === pbu.l, 'Passblende: fertig 48, bestellt 68');
  ok(ue.cutlist.filter((c) => !['Arbeitsplatte', 'Passblende'].includes(c.name)).every((c) => c.ol === c.l && c.ow === c.w), 'übrige Teile ohne Übermaß');
}
const total = m.cutlist.reduce((s, g) => s + g.qty, 0);
const placedAll = Object.values(plan.groups).reduce((s, g) => s + g.sheets.reduce((a, sh) => a + sh.items.length, 0), 0);
ok(total === placedAll, 'alle ' + total + ' Teile platziert (' + placedAll + ')');

// Würfelregal: viele gleiche Teile, 3 Mittelteiler => 4 Spalten
const w = M.buildRegal({ W: 1500, H: 1500, D: 380, shelves: 3, dividers: 3, sockel: 'seiten', plinth: 0 });
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
