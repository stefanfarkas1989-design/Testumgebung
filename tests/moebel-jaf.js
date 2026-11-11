// Füllt das JAF-Formular mit einem Beispielregal. Aufruf: NODE_PATH=<pfad mit jszip> node tests/moebel-jaf.js <ausgabe.xlsx>
const fs = require('fs');
globalThis.JSZip = require('jszip');
const M = require('../moebel/regal.js');
const JAF = require('../moebel/jaf.js');
const assert = require('assert');
(async () => {
  const model = M.buildRegal({ W: 800, H: 2000, D: 300, shelves: 4, dividers: 0, plinth: 0, sockel: 'seiten' });
  const tpl = fs.readFileSync(__dirname + '/../moebel/vorlagen/JAF_AT_Zuschnitt_Formular_v43.xlsx');
  const out = await JAF.fill(tpl, model, { material: '08103/0013 EGGER EUROSPAN P2', backMaterial: '12345/0001 HDF', kante: 'ABS 1 mm Test', objekt: 'Testregal', rotate: false });
  const file = process.argv[2] || '/tmp/jaf-test.xlsx';
  fs.writeFileSync(file, out);
  assert(out.length > 10000);
  const sbm = M.buildRegal({ typ: 'sideboard', W: 1800, H: 700, D: 400, dividers: 2, shelves: 1 });
  const rows = JAF.rowsFromModel(sbm, { material: 'K', apMaterial: 'AP', backMaterial: 'R' });
  const apRow = rows.find((r) => r.name === 'Arbeitsplatte');
  assert(apRow.mat === 'AP' && apRow.v === 'B' && apRow.lk === 'B' && apRow.rk === 'B', 'Arbeitsplatte: Material und Kantenart B');
  assert(rows.find((r) => r.name === 'Boden').v === 'A', 'Korpus Kantenart A');
  let bad = 0; try { JAF.rowsFromModel(model, {}); } catch (e) { bad++; }
  assert(!bad);
  console.log('JAF ok', model.cutlist.length, 'Positionen ->', file);
})().catch((e) => { console.error('Error:', e.message); process.exit(1); });
