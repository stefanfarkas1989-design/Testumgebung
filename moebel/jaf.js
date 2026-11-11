/* Füllt das JAF/Frischeis-Zuschnittformular (v4.3) mit der Stückliste.
 * Benötigt JSZip (global). Arbeitet direkt am XML des Blatts "allgemein",
 * damit Formeln, Schutz und Formularfelder der Vorlage unverändert bleiben. */
(function (root) {
  'use strict';
  const FIRST_ROW = 18, LAST_ROW = 237; // 220 Positionen im Formular

  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  function setCell(xml, ref, value) {
    const re = new RegExp('<c r="' + ref + '"([^>]*?)(?:/>|>[\\s\\S]*?</c>)');
    const m = xml.match(re);
    if (!m) throw new Error('Zelle ' + ref + ' fehlt in der Vorlage');
    const attrs = m[1].replace(/\s+t="[^"]*"/, '');
    const cell = typeof value === 'number'
      ? '<c r="' + ref + '"' + attrs + '><v>' + value + '</v></c>'
      : '<c r="' + ref + '"' + attrs + ' t="inlineStr"><is><t xml:space="preserve">' + esc(value) + '</t></is></c>';
    return xml.replace(re, () => cell);
  }

  /* Zeilen aus der gruppierten Stückliste.
   * Länge = Maserrichtung. */
  function rowsFromModel(model, opt) {
    const rows = [];
    model.cutlist.forEach((g) => {
      const mat = g.back ? opt.backMaterial : opt.material;
      const r = {
        pos: String(g.no), mat: mat || '', thick: g.thick, name: g.name, qty: g.qty, l: g.l, w: g.w,
        drehb: g.back || opt.rotate ? 1 : null, v: '', h: '', lk: '', rk: ''
      };
      // Kantenlage aus dem Modell. Zuordnung zu den Formularspalten ist eine Annahme (siehe README):
      // V/H = Kanten entlang der Länge (W0 = vorne, W1 = hinten), L/R = Kanten an den Enden (L0, L1)
      const edges = g.edges || [];
      if (edges.includes('W0')) r.v = 'A';
      if (edges.includes('W1')) r.h = 'A';
      if (edges.includes('L0')) r.lk = 'A';
      if (edges.includes('L1')) r.rk = 'A';
      rows.push(r);
    });
    return rows;
  }

  // Zwischenspeicher-Werte der Formelzellen A/B/C aktualisieren (für Programme, die nicht neu rechnen)
  function setCached(xml, ref, value) {
    const re = new RegExp('(<c r="' + ref + '"[^>]*>(?:<f>[\\s\\S]*?</f>)?)<v[^>]*>[\\s\\S]*?</v>');
    return xml.replace(re, (m, head) => head + '<v xml:space="preserve">' + esc(value) + '</v>');
  }

  async function fill(templateBuf, model, opt) {
    opt = opt || {};
    const rows = rowsFromModel(model, opt);
    if (rows.length > LAST_ROW - FIRST_ROW + 1) throw new Error('Mehr als 220 Positionen passen nicht ins Formular.');
    const zip = await root.JSZip.loadAsync(templateBuf);
    const sheetPath = 'xl/worksheets/sheet1.xml';
    let xml = await zip.file(sheetPath).async('string');
    if (xml.indexOf('r="A18"') < 0 || xml.indexOf('Plattenzuschnitt') < 0 && !(await zip.file('xl/sharedStrings.xml').async('string')).includes('Plattenzuschnitt'))
      throw new Error('Unbekannte Formularversion (erwartet: JAF Zuschnitt v4.3).');

    // Kopfdaten
    if (opt.firma) xml = setCell(xml, 'F5', opt.firma);
    if (opt.kundenNr) xml = setCell(xml, 'F8', opt.kundenNr);
    if (opt.objekt) xml = setCell(xml, 'I8', opt.objekt);
    if (opt.kante) xml = setCell(xml, 'F10', opt.kante); // Kantenart A

    rows.forEach((r, i) => {
      const n = FIRST_ROW + i;
      xml = setCell(xml, 'E' + n, r.pos);
      xml = setCell(xml, 'F' + n, r.mat);
      xml = setCell(xml, 'G' + n, r.thick);
      xml = setCell(xml, 'H' + n, r.name.slice(0, 50));
      xml = setCell(xml, 'I' + n, r.qty);
      xml = setCell(xml, 'J' + n, r.l);
      xml = setCell(xml, 'K' + n, r.w);
      if (r.drehb) xml = setCell(xml, 'L' + n, r.drehb);
      if (r.v) xml = setCell(xml, 'M' + n, r.v);
      if (r.h) xml = setCell(xml, 'N' + n, r.h);
      if (r.lk) xml = setCell(xml, 'O' + n, r.lk);
      if (r.rk) xml = setCell(xml, 'P' + n, r.rk);
      xml = setCached(xml, 'C' + n, r.mat + ' ' + r.thick);
      xml = setCached(xml, 'A' + n, r.drehb ? '1' : '0');
      xml = setCached(xml, 'B' + n, r.drehb ? '0' : '1');
    });
    zip.file(sheetPath, xml);

    // Versteckte Export-Tabelle: Material-Spalte ebenfalls im Zwischenspeicher aktualisieren
    const exp = zip.file('xl/worksheets/sheet2.xml');
    if (exp) {
      let ex = await exp.async('string');
      rows.forEach((r, i) => { ex = setCached(ex, 'C' + (i + 2), r.mat + ' ' + r.thick); });
      zip.file('xl/worksheets/sheet2.xml', ex);
    }

    // Formeln beim Öffnen neu berechnen lassen
    let wb = await zip.file('xl/workbook.xml').async('string');
    wb = wb.replace(/<calcPr([^>]*?)\/>/, (m, a) => (a.includes('fullCalcOnLoad') ? m : '<calcPr' + a + ' fullCalcOnLoad="1"/>'));
    zip.file('xl/workbook.xml', wb);

    return zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE' });
  }

  const api = { fill, rowsFromModel, FIRST_ROW, LAST_ROW };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.JAF = api;
})(typeof window !== 'undefined' ? window : globalThis);
