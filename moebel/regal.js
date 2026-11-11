/* Möbel-Generator: reine Logik (ohne DOM), läuft im Browser und in Node.
 * Alle Maße in Millimetern. Koordinaten: x = Breite (zentriert), y = Höhe (ab Boden),
 * z = Tiefe (Vorderseite = +z, Rückwand bei -z). */
(function (root) {
  'use strict';

  const MATERIALS = {
    spanplatte: { name: 'Spanplatte roh', color: '#d9bd8e', price: 11 },
    melamin:    { name: 'Melamin weiß', color: '#f1f1ec', price: 19 },
    melaminAnth:{ name: 'Melamin anthrazit', color: '#4b4e53', price: 21 },
    eiche:      { name: 'Eiche-Dekor', color: '#c29a63', price: 24 },
    mdf:        { name: 'MDF (zum Lackieren)', color: '#e4dfd4', price: 22 },
    multiplex:  { name: 'Birke-Multiplex', color: '#dcc08f', price: 68 }
  };

  const SHEETS = {
    '2800x2070': { l: 2800, w: 2070, name: '2800 × 2070 (Industriemaß)' },
    '2500x1250': { l: 2500, w: 1250, name: '2500 × 1250 (Fachhandel)' },
    '2440x1220': { l: 2440, w: 1220, name: '2440 × 1220 (Baumarkt)' }
  };

  const DEFAULTS = {
    W: 800, H: 2000, D: 300,
    t: 19,              // Plattenstärke
    shelves: 4,         // Fachböden (zusätzlich zu Boden und Deckel)
    dividers: 0,        // senkrechte Mittelteiler
    plinth: 0,          // Sockelhöhe
    back: true, bt: 3,  // Rückwand (aufgesetzt, HDF)
    material: 'melamin',
    sheet: '2800x2070',
    kerf: 4,            // Sägeblattbreite
    rotate: false,      // Teile dürfen gedreht werden (Dekor ohne Maserung)
    backPrice: 6        // €/m² HDF
  };

  const TRIM = 10; // Besäumschnitt je Seite der Rohplatte

  const round = (v) => Math.round(v);

  /* ---------- Modell ---------- */
  function buildRegal(input) {
    const p = Object.assign({}, DEFAULTS, input);
    const { W, H, D, t, shelves: n, dividers: m, plinth: s } = p;
    const bt = p.back ? p.bt : 0;
    const Db = D - bt;
    const Wi = W - 2 * t;
    const y0 = s + t, y1 = H - t, Hi = y1 - y0;
    const cw = (Wi - m * t) / (m + 1);
    const ch = (Hi - n * t) / (n + 1);

    const warnings = [], errors = [];
    if (cw < 100) errors.push('Fächer sind zu schmal (' + round(cw) + ' mm). Weniger Mittelteiler oder mehr Breite.');
    if (ch < 100) errors.push('Fächer sind zu niedrig (' + round(ch) + ' mm). Weniger Fachböden oder mehr Höhe.');
    if (Hi <= 0) errors.push('Höhe ist zu klein für Sockel, Boden und Deckel.');
    if (Wi <= 0) errors.push('Breite ist zu klein.');
    if (errors.length) return { p, parts: [], cutlist: [], errors, warnings, derived: {} };

    const spanTab = { 16: 600, 18: 700, 19: 750, 22: 850, 25: 900 };
    const nearT = Object.keys(spanTab).map(Number).reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a));
    const maxSpan = (t < 14 ? 450 : spanTab[nearT]) *
      (p.material === 'multiplex' ? 1.25 : p.material === 'spanplatte' ? 0.9 : 1);
    if (cw > maxSpan) warnings.push('Fachbreite ' + round(cw) + ' mm ist größer als ca. ' + round(maxSpan) +
      ' mm: Böden hängen mit Büchern durch. Mittelteiler einplanen oder dickere Platte wählen.');
    if (H / D > 5) warnings.push('Das Regal ist schlank (Höhe/Tiefe = ' + (H / D).toFixed(1) + '). Unbedingt an der Wand sichern (Kippschutz).');
    if (!p.back && H / D > 4) warnings.push('Ohne Rückwand ist das Regal wenig aussteifend. Rückwand oder Diagonalstreben erwägen.');
    if (D < 200) warnings.push('Sehr geringe Tiefe: Ordner passen erst ab ca. 320 mm Tiefe.');

    const parts = []; // einzelne Instanzen (für 3D)
    const add = (name, cut, size, pos) => parts.push({
      name, cut: [round(Math.max(cut[0], cut[1])), round(Math.min(cut[0], cut[1]))],
      thick: size.thick, back: !!size.back, size: size.dims, pos
    });

    // Seitenwände
    for (const sx of [-1, 1]) {
      add('Seitenwand', [H, Db], { thick: t, dims: [t, H, Db] },
        [sx * (W / 2 - t / 2), H / 2, bt / 2]);
    }
    // Boden und Deckel
    add('Boden', [Wi, Db], { thick: t, dims: [Wi, t, Db] }, [0, s + t / 2, bt / 2]);
    add('Deckel', [Wi, Db], { thick: t, dims: [Wi, t, Db] }, [0, H - t / 2, bt / 2]);
    // Sockelblende
    if (s > 0) add('Sockelblende', [Wi, s], { thick: t, dims: [Wi, s, t] }, [0, s / 2, D / 2 - 30 - t / 2]);
    // Mittelteiler
    for (let i = 0; i < m; i++) {
      const x = -Wi / 2 + (i + 1) * cw + i * t + t / 2;
      add('Mittelteiler', [Hi, Db], { thick: t, dims: [t, Hi, Db] }, [x, (y0 + y1) / 2, bt / 2]);
    }
    // Fachböden (je Spalte ein Stück)
    for (let j = 1; j <= n; j++) {
      const yc = y0 + j * ch + (j - 1) * t + t / 2;
      for (let c = 0; c <= m; c++) {
        const x = -Wi / 2 + c * (cw + t) + cw / 2;
        add('Fachboden', [cw, Db], { thick: t, dims: [cw, t, Db] }, [x, yc, bt / 2]);
      }
    }
    // Rückwand
    if (p.back) {
      const bw = W - 2, bh = H - s - 2;
      add('Rückwand (HDF)', [bh, bw], { thick: bt, back: true, dims: [bw, bh, bt] },
        [0, s + (H - s) / 2, -D / 2 + bt / 2]);
    }

    // Gruppierte Stückliste
    const map = new Map();
    parts.forEach((pt, idx) => {
      const key = pt.name + '|' + pt.cut.join('x') + '|' + pt.thick;
      if (!map.has(key)) map.set(key, { name: pt.name, l: pt.cut[0], w: pt.cut[1], thick: pt.thick, back: pt.back, qty: 0, ids: [] });
      const g = map.get(key); g.qty++; g.ids.push(idx);
    });
    const cutlist = [...map.values()].map((g, i) => { g.no = i + 1; g.ids.forEach((id) => (parts[id].group = g.no)); return g; });

    // Kantenband: Vorderkanten der sichtbaren Teile
    let edgeMm = 0;
    parts.forEach((pt) => {
      if (pt.back) return;
      if (pt.name === 'Seitenwand') edgeMm += pt.cut[0];
      else if (pt.name === 'Mittelteiler') edgeMm += pt.cut[0];
      else if (pt.name === 'Sockelblende') edgeMm += 0;
      else edgeMm += pt.cut[0];
    });
    edgeMm += 2 * 0; // Deckel/Boden bereits enthalten
    const edgeM = Math.ceil((edgeMm * 1.1) / 100) / 10; // +10 % Verschnitt

    // Beschläge
    const verticals = m + 2;
    const boardsPieces = 2 + n * (m + 1);               // Boden, Deckel, Fachböden
    const joints = 2 * boardsPieces + 0;                // jedes Brett hat zwei Enden
    const perJoint = Math.max(2, Math.round(Db / 150));
    const hardware = [
      { name: 'Konfirmatschrauben 7×50', qty: joints * perJoint },
      { name: 'Holzdübel 8×30 (Positionshilfe)', qty: joints * perJoint },
      { name: 'Abdeckkappen für Konfirmat', qty: joints * perJoint }
    ];
    if (p.back) {
      const perim = 2 * (W + H) / 1000;
      hardware.push({ name: 'Rückwandnägel / Stifte 1,6×20', qty: Math.ceil(perim * 1000 / 150 + (n + m + 2) * 4) });
    }
    hardware.push({ name: 'Wandwinkel Kippschutz (mit Dübel)', qty: H > 1200 ? 2 : 0 });
    if (s > 0) hardware.push({ name: 'Winkelverbinder für Sockelblende', qty: 4 });

    return {
      p, parts, cutlist, warnings, errors,
      derived: { Wi, Hi, cw, ch, Db, edgeM, hardware: hardware.filter((h) => h.qty > 0), verticals }
    };
  }

  /* ---------- Zuschnittoptimierung (Streifen-Packung, Guillotine-tauglich) ---------- */
  function packSheets(items, sheet, kerf, allowRotate) {
    // items: [{no, l, w}] einzeln expandiert
    const SL = sheet.l - 2 * TRIM, SW = sheet.w - 2 * TRIM;
    const sheets = [];
    const errors = [];
    const list = items.map((it) => Object.assign({}, it));
    // Orientierung festlegen: Länge längs zur Platte
    list.forEach((it) => { it.rot = false; });
    list.sort((a, b) => b.w - a.w || b.l - a.l);
    for (const it of list) {
      let l = it.l, w = it.w;
      const fits = (a, b) => a <= SL && b <= SW;
      if (!fits(l, w)) {
        if (allowRotate && fits(w, l)) { l = it.w; w = it.l; it.rot = true; }
        else { errors.push('Teil ' + it.no + ' (' + it.l + '×' + it.w + ') passt nicht auf die Platte ' + sheet.l + '×' + sheet.w + '.'); continue; }
      }
      let placed = false;
      for (const sh of sheets) {
        for (const st of sh.strips) {
          if (w <= st.h && st.x + l <= SL) {
            sh.items.push({ no: it.no, x: st.x, y: st.y, l, w, rot: it.rot });
            st.x += l + kerf; placed = true; break;
          }
        }
        if (placed) break;
        if (sh.nextY + w <= SW) {
          const st = { y: sh.nextY, h: w, x: 0 };
          sh.strips.push(st); sh.nextY += w + kerf;
          sh.items.push({ no: it.no, x: 0, y: st.y, l, w, rot: it.rot });
          st.x = l + kerf; placed = true;
        }
        if (placed) break;
      }
      if (!placed) {
        const sh = { strips: [], items: [], nextY: 0 };
        const st = { y: 0, h: w, x: l + kerf };
        sh.strips.push(st); sh.nextY = w + kerf;
        sh.items.push({ no: it.no, x: 0, y: 0, l, w, rot: it.rot });
        sheets.push(sh);
      }
    }
    const sheetArea = SL * SW;
    sheets.forEach((sh) => {
      const used = sh.items.reduce((a, b) => a + b.l * b.w, 0);
      sh.usage = used / sheetArea;
    });
    return { sheets, errors, trim: TRIM, SL, SW };
  }

  function plan(model) {
    const { p, cutlist } = model;
    const sheet = SHEETS[p.sheet];
    const mat = MATERIALS[p.material];
    const groups = {};
    cutlist.forEach((g) => {
      const key = g.back ? 'back' : 'plate';
      (groups[key] = groups[key] || []);
      for (let i = 0; i < g.qty; i++) groups[key].push({ no: g.no, l: g.l, w: g.w });
    });
    const result = { sheet, material: mat, groups: {}, errors: [], cost: {} };
    let total = 0;
    for (const key of Object.keys(groups)) {
      const sh = key === 'back' && p.backSheet ? p.backSheet : sheet;
      const r = packSheets(groups[key], sh, p.kerf, key === 'back' ? true : p.rotate);
      r.sheet = sh;
      result.groups[key] = r;
      result.errors.push(...r.errors);
      const area = (sh.l * sh.w) / 1e6;
      const price = key === 'back' ? p.backPrice : mat.price;
      const thick = key === 'back' ? p.bt : p.t;
      const cost = r.sheets.length * area * price;
      result.cost[key] = { sheets: r.sheets.length, area, price, thick, cost };
      total += cost;
    }
    result.cost.boards = total;
    const hwPrice = { 'Konfirmatschrauben 7×50': 0.09, 'Holzdübel 8×30 (Positionshilfe)': 0.04, 'Abdeckkappen für Konfirmat': 0.03,
      'Rückwandnägel / Stifte 1,6×20': 0.02, 'Wandwinkel Kippschutz (mit Dübel)': 3.5, 'Winkelverbinder für Sockelblende': 0.8 };
    let hw = 0;
    (model.derived.hardware || []).forEach((h) => { hw += (hwPrice[h.name] || 0.1) * h.qty; });
    result.cost.hardware = hw;
    result.cost.edge = (model.derived.edgeM || 0) * 0.45;
    result.cost.total = total + hw + result.cost.edge;
    return result;
  }

  function instructions(model) {
    const { p, derived } = model;
    const n = p.shelves, m = p.dividers;
    const steps = [
      'Alle Teile gemäß Stückliste zuschneiden (lassen) und die Vorderkanten mit Kantenband versehen (Bügeleisen oder Kantenfräse).',
      'Teile mit Bleistift nummerieren (Nr. aus der Stückliste), damit nichts verwechselt wird.',
      'Bohrungen anzeichnen: Konfirmat 5 mm in die Plattenfläche, 7 mm Vorbohrung in das Stirnholz, Dübel 8 mm als Positionshilfe. Alle Schraubreihen mit Abstand ≥ 50 mm zur Vorderkante und Rückseite beginnen.'
    ];
    if (p.plinth > 0) steps.push('Sockelblende (' + p.plinth + ' mm) mit Winkeln 30 mm hinter der Vorderkante zwischen die Seitenwände setzen.');
    steps.push('Eine Seitenwand flach auf den Boden legen, Boden und Deckel anschrauben' +
      (p.plinth > 0 ? ' (Boden auf Höhe ' + p.plinth + ' mm über Unterkante)' : '') + '.');
    if (m > 0) steps.push(m + ' Mittelteiler zwischen Boden und Deckel einsetzen, Abstand zwischen den Spalten je ' + round(derived.cw) + ' mm.');
    if (n > 0) steps.push(n + ' Fachböden je Spalte einsetzen. Fachhöhe je ' + round(derived.ch) + ' mm (Lichtmaß). Mit Abstandsklötzen aus Restholz arbeiten.');
    steps.push('Zweite Seitenwand aufsetzen, alles verschrauben, mit Winkel auf rechten Winkel prüfen und Diagonalen messen (gleich lang = rechtwinklig).');
    if (p.back) steps.push('Regal auf die Vorderseite legen, Rückwand (HDF) rechtwinklig auflegen und alle 15 cm annageln. Die Rückwand steift das Regal aus.');
    if (p.H > 1200) steps.push('Kippschutz: Regal mit zwei Wandwinkeln an der Wand sichern.');
    steps.push('Konfirmat-Köpfe mit Abdeckkappen verschließen. Fertig!');
    return steps;
  }

  const api = { MATERIALS, SHEETS, DEFAULTS, buildRegal, packSheets, plan, instructions };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Moebel = api;
})(typeof window !== 'undefined' ? window : globalThis);
