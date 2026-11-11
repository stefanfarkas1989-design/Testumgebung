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
    plinth: 100,        // Sockelhöhe (bei Füßen: Fußhöhe = Abstand Boden-Unterkante zum Fußboden)
    typ: 'regal',       // 'regal' | 'schrank' (Deckenblende) | 'sideboard' (Arbeitsplatte)
    sockel: 'fuesse',   // 'fuesse' = Korpus auf verstellbaren Füßen, 'seiten' = Seiten bis zum Boden
    fussD: 25,          // Fuß-Ø laut Produktname (Hettich Sockel-Verstellfuß-Set Ø25 × 100) – Datenblatt offen
    fussRand: 50,       // VORGABE PRÜFEN: Abstand Fußmitte von Vorder-, Hinter- und Seitenkante des Korpus
    sockelRueck: 30,    // VORGABE PRÜFEN: Sockelblende hinter der Vorderkante
    sockelLuft: 0,      // VORGABE PRÜFEN: Luft Sockelblende zum Fußboden
    raumH: 2500,        // VORGABE PRÜFEN: Raumhöhe (für Deckenblende)
    blendeLuft: 5,      // VORGABE PRÜFEN: Luft Deckenblende zur Decke
    blendeRueck: 5,     // VORGABE PRÜFEN: Deckenblende hinter der Vorderkante (zurückversetzt)
    apT: 0,             // Stärke Arbeitsplatte (0 = wie Plattenstärke)
    apUeb: 20,          // VORGABE PRÜFEN: Überstand Arbeitsplatte vorne
    back: true, bt: 3,  // Rückwand
    backMode: 'nut',    // 'nut' = in Nut (Seiten, Boden, Deckel), 'auf' = hinten aufgesetzt
    nutA: 10,           // Abstand Hinterkante bis Nut
    nutT: 8,            // Nuttiefe
    nutLuft: 1,         // Luft der Rückwand am Nutgrund (je Seite)
    nutPlus: 0,         // Nutbreite = Rückwandstärke + nutPlus
    // Verbinder (Vorgaben vom Nutzer): abwechselnd Konfirmat/Dübel im Raster, Start am Randabstand
    verbinder: true,
    vRand: 50,          // Abstand äußerer Verbinder von Vorder-/Hinterkante des anschließenden Teils
    vRaster: 64,        // Raster
    duebelD: 8, duebelFl: 13, duebelSt: 19,   // Dübel Ø8×30: Bohrtiefe Fläche / Stirnseite
    konfD: 7, konfKernD: 5, konfKern: 36,     // Konfirmat 7×50: Durchgang Ø7, Kernloch Ø5 × 36 in der Stirnseite
    konfSenk: 10,       // Senkung Ø (Angabe aus Händler-/Fachquellen, kein Häfele-Datenblatt geprüft)
    mtVersatz: 32,      // Fachböden rechts am Mittelteiler: Positionen um diesen Wert versetzt (Kollision)
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
    if (p.sockel === 'fuesse' && s <= 0) errors.push('Bei Füßen bitte eine Sockelhöhe (Fußhöhe) angeben.');
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

    // Seitenwände (bei Füßen: ab Sockelhöhe, Boden bündig mit Unterkante)
    const feetMode = p.sockel === 'fuesse';
    const sy0 = feetMode ? s : 0;
    for (const sx of [-1, 1]) {
      add('Seitenwand', [H - sy0, Dk], { thick: t, dims: [t, H - sy0, Dk] },
        [sx * (W / 2 - t / 2), (sy0 + H) / 2, zK], ['W0', 'L1'], 1); // Vorderkante, Oberkante
    }
    // Boden und Deckel
    add('Boden', [Wi, Dk], { thick: t, dims: [Wi, t, Dk] }, [0, s + t / 2, zK], ['W0'], 0);
    add('Deckel', [Wi, Dk], { thick: t, dims: [Wi, t, Dk] }, [0, H - t / 2, zK], ['W0'], 0);
    // Sockelblende: bei Füßen volle Breite, an die Füße geklipst (keine Verbinder); sonst zwischen den Seiten
    if (s > 0) {
      if (feetMode) {
        const sh = s - p.sockelLuft;
        if (sh > 0) add('Sockelblende', [W, sh], { thick: t, dims: [W, sh, t] }, [0, p.sockelLuft + sh / 2, D / 2 - p.sockelRueck - t / 2], [], 0);
        parts[parts.length - 1].noJoint = true;
      } else add('Sockelblende', [Wi, s], { thick: t, dims: [Wi, s, t] }, [0, s / 2, D / 2 - p.sockelRueck - t / 2], [], 0);
    }
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
    // Schrank: Deckenblende auf dem Deckel, zurückversetzt
    if (p.typ === 'schrank') {
      const bh = p.raumH - H - p.blendeLuft;
      if (bh >= 20) add('Deckenblende', [W, bh], { thick: t, dims: [W, bh, t] }, [0, H + bh / 2, D / 2 - p.blendeRueck - t / 2], [], 0);
      else warnings.push('Deckenblende: nur ' + Math.round(bh) + ' mm bis zur Decke – keine Blende eingeplant.');
    }
    // Sideboard: Arbeitsplatte oben drauf, vorne Überstand, seitlich und hinten bündig (von unten verschraubt)
    if (p.typ === 'sideboard') {
      const at = p.apT || t;
      add('Arbeitsplatte', [W, D + p.apUeb], { thick: at, dims: [W, at, D + p.apUeb] }, [0, H + at / 2, p.apUeb / 2], ['W0', 'L0', 'L1'], 0);
      parts[parts.length - 1].noJoint = true;   // keine Konfirmat von oben; Verschraubung von unten noch offen
    }
    // Füße: unter dem Boden, je Senkrechte (Seiten mit Randabstand, Mittelteiler mittig), vorne und hinten
    const feet = [];
    if (feetMode && s > 0) {
      const xs = [-W / 2 + p.fussRand, W / 2 - p.fussRand];
      for (let i = 0; i < m; i++) xs.push(-Wi / 2 + (i + 1) * cw + i * t + t / 2);
      xs.sort((a, b) => a - b).forEach((x) => [D / 2 - p.fussRand, -D / 2 + p.fussRand].forEach((z) => feet.push({ x, z, d: p.fussD, h: s })));
      const iBoden = parts.findIndex((q) => q.name === 'Boden');
      parts[iBoden].marks = feet.map((f) => ({ at: [f.x, s, f.z], dia: f.d, label: 'Fuß' }));
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
    const holes = p.verbinder ? joints(parts, p, warnings) : [];
    holes.forEach((h) => { (parts[h.part].holes = parts[h.part].holes || []).push(h); });

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
      p, parts, cutlist, warnings, errors, holes, feet,
      derived: { Wi, Hi, cw, ch, Db, Dk, Di, edgeM, nut }
    };
  }

  /* ---------- Verbinder: Konfirmat + Dübel ----------
   * Jede Stelle, an der ein Teil P mit seiner Kante (Stirn- oder Längskante) an der Fläche eines Teils Q anliegt,
   * bekommt Verbinder entlang der Anschlusslinie: ab vRand vom Linienanfang (vorne bzw. links/unten) im Raster vRaster,
   * solange der Abstand zum Linienende >= vRand ist. Abwechselnd Konfirmat, Dübel, Konfirmat …
   * Fachböden am Mittelteiler: nur Dübel; auf der rechten Seite um mtVersatz versetzt.
   * Bohrungen: { part, kind: 'face'|'edge', type, dia, depth, through, axis, dir, at:[x,y,z] (Eintrittspunkt) } */
  function boxOf(pt) { return [0, 1, 2].map((i) => [pt.pos[i] - pt.size[i] / 2, pt.pos[i] + pt.size[i] / 2]); }
  function thickAxis(pt) { return [0, 1, 2].reduce((a, i) => (Math.abs(pt.size[i] - pt.thick) < Math.abs(pt.size[a] - pt.thick) ? i : a), 0); }

  function joints(parts, p, warnings) {
    const TOL = 0.6, holes = [];
    const boxes = parts.map(boxOf), tax = parts.map(thickAxis);
    parts.forEach((P, ip) => {
      if (P.back) return;
      parts.forEach((Q, iq) => {
        if (iq === ip || Q.back || P.noJoint || Q.noJoint) return;
        const bP = boxes[ip], bQ = boxes[iq];
        for (let a = 0; a < 3; a++) {
          if (tax[iq] !== a || tax[ip] === a) continue;          // Q liegt mit Fläche, P mit Kante an
          const pAtMin = Math.abs(bP[a][0] - bQ[a][1]) < TOL, pAtMax = Math.abs(bP[a][1] - bQ[a][0]) < TOL;
          if (!pAtMin && !pAtMax) continue;
          const others = [0, 1, 2].filter((i) => i !== a);
          const ov = others.map((i) => [Math.max(bP[i][0], bQ[i][0]), Math.min(bP[i][1], bQ[i][1])]);
          if (ov.some((o) => o[1] - o[0] < 1)) continue;
          // Linie läuft entlang der Achse, die nicht P's Dicke ist
          const k = others.findIndex((i) => i !== tax[ip]);
          const lineAx = others[k], line = ov[k];
          const thAx = tax[ip], thMid = (bP[thAx][0] + bP[thAx][1]) / 2;
          const len = line[1] - line[0];
          const fromMax = lineAx === 2;                            // Tiefe: von vorne (+z) zählen
          const divider = Q.name === 'Mittelteiler' && P.name === 'Fachboden';
          const rightSide = divider && pAtMin;                     // P liegt rechts (+x) vom Mittelteiler
          const pos = [];
          for (let d = p.vRand + (rightSide ? p.mtVersatz : 0); d <= len - p.vRand + 1e-6; d += p.vRaster) pos.push(d);
          if (!pos.length) {
            warnings.push(P.name + ' an ' + Q.name + ': Anschluss nur ' + Math.round(len) + ' mm lang, Randabstand ' + p.vRand +
              ' mm passt nicht – Verbinder hier bitte selbst festlegen.');
            continue;
          }
          const plane = pAtMin ? bP[a][0] : bP[a][1];             // Berührebene
          const intoP = pAtMin ? 1 : -1;                           // Richtung von der Ebene ins Teil P
          const qOuter = pAtMin ? bQ[a][0] : bQ[a][1];             // Außenfläche von Q (Konfirmat-Kopf)
          pos.forEach((d, i) => {
            const konf = !divider && i % 2 === 0;
            const at = [0, 0, 0];
            at[lineAx] = fromMax ? line[1] - d : line[0] + d;
            at[thAx] = thMid;
            const jid = ip + '-' + iq + '-' + i;
            if (konf) {
              const atQ = at.slice(); atQ[a] = qOuter;
              holes.push({ part: iq, kind: 'face', type: 'Konfirmat', dia: p.konfD, depth: Q.thick, through: true, senk: p.konfSenk, axis: a, dir: intoP, at: atQ, joint: jid, mate: ip });
              const atP = at.slice(); atP[a] = plane;
              holes.push({ part: ip, kind: 'edge', type: 'Konfirmat-Kernloch', dia: p.konfKernD, depth: p.konfKern, axis: a, dir: intoP, at: atP, joint: jid, mate: iq });
            } else {
              const atQ = at.slice(); atQ[a] = plane;
              holes.push({ part: iq, kind: 'face', type: 'Dübel', dia: p.duebelD, depth: p.duebelFl, axis: a, dir: -intoP, at: atQ, joint: jid, mate: ip });
              const atP = at.slice(); atP[a] = plane;
              holes.push({ part: ip, kind: 'edge', type: 'Dübel', dia: p.duebelD, depth: p.duebelSt, axis: a, dir: intoP, at: atP, joint: jid, mate: iq });
            }
          });
        }
      });
    });
    // Kollision: Flächenbohrungen von beiden Seiten an derselben Stelle, zusammen tiefer als die Platte
    const byPart = {};
    holes.filter((h) => h.kind === 'face').forEach((h) => (byPart[h.part] = byPart[h.part] || []).push(h));
    Object.entries(byPart).forEach(([ip, list]) => {
      const T = parts[ip].thick;
      for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        if (A.dir === B.dir && !A.through && !B.through) continue;
        const dist = Math.hypot(...[0, 1, 2].filter((x) => x !== A.axis).map((x) => A.at[x] - B.at[x]));
        if (dist < (A.dia + B.dia) / 2 && (A.through || B.through || A.depth + B.depth > T)) {
          warnings.push('Bohrungen kollidieren in ' + parts[ip].name + ' (' + A.type + ' / ' + B.type + '). Bitte Anordnung prüfen.');
          return;
        }
      }
    });
    return holes;
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
