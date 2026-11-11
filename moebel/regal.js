/* Möbel-Generator: reine Logik (ohne DOM), läuft im Browser und in Node.
 * Alle Maße in Millimetern. Koordinaten: x = Breite (zentriert), y = Höhe (ab Boden),
 * z = Tiefe (Vorderseite = +z, Rückwand bei -z). */
(function (root) {
  'use strict';

  const MATERIALS = {
    spanplatte: { name: 'Spanplatte roh', color: '#d9bd8e' },
    melamin:    { name: 'Melamin weiß', color: '#f1f1ec' },
    melaminAnth:{ name: 'Melamin anthrazit', color: '#4b4e53' },
    eiche:      { name: 'Eiche-Dekor', color: '#c29a63' },
    mdf:        { name: 'MDF (zum Lackieren)', color: '#e4dfd4' },
    multiplex:  { name: 'Birke-Multiplex', color: '#dcc08f' }
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
    back: true, bt: 3,  // Rückwand
    backMode: 'nut',    // 'nut' = in Nut (Seiten, Boden, Deckel), 'auf' = hinten aufgesetzt
    nutA: 10,           // Abstand Hinterkante bis Nut
    nutT: 8,            // Nuttiefe
    nutLuft: 1,         // Luft der Rückwand am Nutgrund (je Seite)
    nutPlus: 0,         // Nutbreite = Rückwandstärke + nutPlus
    material: 'melamin',
    sheet: '2800x2070',
    kerf: 4,            // Sägeblattbreite
    rotate: false       // Teile dürfen gedreht werden (Dekor ohne Maserung)
  };

  const TRIM = 10; // Besäumschnitt je Seite der Rohplatte

  const round = (v) => Math.round(v);

  /* ---------- Modell ---------- */
  function buildRegal(input) {
    const p = Object.assign({}, DEFAULTS, input);
    const { W, H, D, t, shelves: n, dividers: m, plinth: s } = p;
    const bt = p.back ? p.bt : 0;
    const nut = p.back && p.backMode === 'nut';
    // Tiefen: Korpus (Seiten, Boden, Deckel) und Innenteile (Fachböden, Mittelteiler)
    const Dk = nut ? D : D - bt;
    const Di = nut ? D - p.nutA - bt : D - bt;
    const zK = D / 2 - Dk / 2, zI = D / 2 - Di / 2; // Mitte in z (Vorderkante bündig bei +D/2)
    const Db = Dk;
    const Wi = W - 2 * t;
    const y0 = s + t, y1 = H - t, Hi = y1 - y0;
    const cw = (Wi - m * t) / (m + 1);
    const ch = (Hi - n * t) / (n + 1);

    const warnings = [], errors = [];
    if (cw < 100) errors.push('Fächer sind zu schmal (' + round(cw) + ' mm). Weniger Mittelteiler oder mehr Breite.');
    if (ch < 100) errors.push('Fächer sind zu niedrig (' + round(ch) + ' mm). Weniger Fachböden oder mehr Höhe.');
    if (Hi <= 0) errors.push('Höhe ist zu klein für Sockel, Boden und Deckel.');
    if (Wi <= 0) errors.push('Breite ist zu klein.');
    if (nut && p.nutT >= t) errors.push('Nuttiefe (' + p.nutT + ' mm) muss kleiner als die Plattenstärke (' + t + ' mm) sein.');
    if (nut && p.nutLuft >= p.nutT) errors.push('Luft am Nutgrund muss kleiner als die Nuttiefe sein.');
    if (nut && p.nutA + bt + p.nutPlus >= D) errors.push('Nutabstand und Rückwand sind tiefer als das Regal.');
    if (errors.length) return { p, parts: [], cutlist: [], errors, warnings, derived: {} };

    if (H > 4 * D) warnings.push('Schlankes Regal: an der Wand gegen Kippen sichern.');

    const parts = []; // einzelne Instanzen (für 3D)
    // Geometrie = bestellte Teile: Länge und Breite auf ganze mm ABgerundet (Teil wird nie länger als die Lücke),
    // Position bleibt mittig, ein Rest bis < 1 mm verteilt sich als Fuge.
    const mm = (v) => Math.floor(v + 1e-6);
    // cut = [Maß in Maserrichtung (= Länge im Formular), Maß quer]; grain = Weltachse der Maserung (0 = x, 1 = y)
    const EDGE_NAMES = { Seitenwand: { W0: 'Vorderkante', L1: 'Oberkante' } };
    const add = (name, cut, size, pos, edges, grain) => parts.push({
      name, cut: [mm(cut[0]), mm(cut[1])], grain, edgeNames: Object.assign({ W0: 'Vorderkante' }, EDGE_NAMES[name]),
      thick: size.thick, back: !!size.back, size: size.dims.map((v) => (v === size.thick ? v : mm(v))), pos, edges: edges || []
    });

    // Seitenwände
    for (const sx of [-1, 1]) {
      add('Seitenwand', [H, Dk], { thick: t, dims: [t, H, Dk] },
        [sx * (W / 2 - t / 2), H / 2, zK], ['W0', 'L1'], 1); // Vorderkante, Oberkante
    }
    // Boden und Deckel
    add('Boden', [Wi, Dk], { thick: t, dims: [Wi, t, Dk] }, [0, s + t / 2, zK], ['W0'], 0);
    add('Deckel', [Wi, Dk], { thick: t, dims: [Wi, t, Dk] }, [0, H - t / 2, zK], ['W0'], 0);
    // Sockelblende
    if (s > 0) add('Sockelblende', [Wi, s], { thick: t, dims: [Wi, s, t] }, [0, s / 2, D / 2 - 30 - t / 2], [], 0);
    // Mittelteiler
    for (let i = 0; i < m; i++) {
      const x = -Wi / 2 + (i + 1) * cw + i * t + t / 2;
      add('Mittelteiler', [Hi, Di], { thick: t, dims: [t, Hi, Di] }, [x, (y0 + y1) / 2, zI], ['W0'], 1);
    }
    // Fachböden (je Spalte ein Stück)
    for (let j = 1; j <= n; j++) {
      const yc = y0 + j * ch + (j - 1) * t + t / 2;
      for (let c = 0; c <= m; c++) {
        const x = -Wi / 2 + c * (cw + t) + cw / 2;
        add('Fachboden', [cw, Di], { thick: t, dims: [cw, t, Di] }, [x, yc, zI], ['W0'], 0);
      }
    }
    // Rückwand und Nuten
    const grooves = []; // Fräsbearbeitungen als Welt-Quader: { part, box: [[x0,x1],[y0,y1],[z0,z1]], name }
    if (p.back && !nut) {
      const bw = W - 2, bh = H - s - 2;
      add('Rückwand', [bh, bw], { thick: bt, back: true, dims: [bw, bh, bt] },
        [0, s + (H - s) / 2, -D / 2 + bt / 2], [], 1);
    }
    if (nut) {
      const e = p.nutT - p.nutLuft;               // Eingriff der Rückwand je Seite
      const nb = bt + p.nutPlus;                  // Nutbreite
      const zb0 = -D / 2 + p.nutA;                // Nut / Rückwand beginnt hier (von hinten gemessen)
      const bw = Wi + 2 * e, bh = Hi + 2 * e;
      add('Rückwand', [bh, bw], { thick: bt, back: true, dims: [bw, bh, bt] }, [0, (y0 + y1) / 2, zb0 + bt / 2], [], 1);
      const gz = [zb0, zb0 + nb];
      const iL = parts.findIndex((q) => q.name === 'Seitenwand' && q.pos[0] < 0);
      const iR = parts.findIndex((q) => q.name === 'Seitenwand' && q.pos[0] > 0);
      const iB = parts.findIndex((q) => q.name === 'Boden'), iT = parts.findIndex((q) => q.name === 'Deckel');
      const gy = [y0 - p.nutT, y1 + p.nutT];      // Seitennut gestoppt: endet auf Höhe der Nutgründe in Boden/Deckel
      grooves.push({ part: iL, box: [[-W / 2 + t - p.nutT, -W / 2 + t], gy, gz] });
      grooves.push({ part: iR, box: [[W / 2 - t, W / 2 - t + p.nutT], gy, gz] });
      grooves.push({ part: iB, box: [[-Wi / 2, Wi / 2], [y0 - p.nutT, y0], gz] });
      grooves.push({ part: iT, box: [[-Wi / 2, Wi / 2], [y1, y1 + p.nutT], gz] });
      grooves.forEach((g) => { g.name = 'Nut ' + nb + ' × ' + p.nutT + ' tief'; g.width = nb; g.depth = p.nutT; });
    }

    (typeof grooves !== 'undefined' ? grooves : []).forEach((g) => { (parts[g.part].grooves = parts[g.part].grooves || []).push(g); });

    // Gruppierte Stückliste
    const map = new Map();
    parts.forEach((pt, idx) => {
      const key = pt.name + '|' + pt.cut.join('x') + '|' + pt.thick;
      if (!map.has(key)) map.set(key, { name: pt.name, l: pt.cut[0], w: pt.cut[1], thick: pt.thick, back: pt.back, edges: pt.edges, edgeNames: pt.edgeNames, qty: 0, ids: [] });
      const g = map.get(key); g.qty++; g.ids.push(idx);
    });
    const cutlist = [...map.values()].map((g, i) => { g.no = i + 1; g.ids.forEach((id) => (parts[id].group = g.no)); return g; });

    // Kantenband: Summe der bekanteten Kanten (ohne Zuschlag)
    let edgeMm = 0;
    parts.forEach((pt) => pt.edges.forEach((e) => { edgeMm += e[0] === 'W' ? pt.cut[0] : pt.cut[1]; }));
    const edgeM = edgeMm / 1000;

    return {
      p, parts, cutlist, warnings, errors,
      derived: { Wi, Hi, cw, ch, Db, Dk, Di, edgeM, nut }
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
    const result = { sheet, material: mat, groups: {}, errors: [] };
    for (const key of Object.keys(groups)) {
      const sh = key === 'back' && p.backSheet ? p.backSheet : sheet;
      const r = packSheets(groups[key], sh, p.kerf, key === 'back' ? true : p.rotate);
      r.sheet = sh;
      r.thick = key === 'back' ? p.bt : p.t;
      result.groups[key] = r;
      result.errors.push(...r.errors);
    }
    return result;
  }

  const api = { MATERIALS, SHEETS, DEFAULTS, buildRegal, packSheets, plan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Moebel = api;
})(typeof window !== 'undefined' ? window : globalThis);
