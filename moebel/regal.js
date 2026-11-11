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

  // Fußtypen mit ihren Quellen. null = unbekannt (keine Annahme).
  const FEET = {
    hettich: {
      name: 'Hettich Sockelverstellfuß-Set 100–120 × Ø25 mm, inkl. Klips', bezug: 'Hettich DIY Art.-Nr. 9149109, EAN 4008057011990',
      rohr: 25, min: 100, max: 120, set: 4, platte: null, kopf: null,
      quelle: 'Produktbeschreibung (Screenshot) und Hettich-DIY-Shop; Schraubbild fehlt'
    },
    qwork: {
      name: 'QWORK Möbelfüße verstellbar, 20 Stück, mit Sockelclips und Verbindungsplatten', bezug: 'Amazon (QWORK)',
      rohr: 25, min: 100, max: 120, set: 20, platte: 70, kopf: 46,
      quelle: 'Amazon-Angebot (Screenshot): 100–120 mm laut Titel – die Zeichnung zeigt 100–140 mm, ungeprüft; Grundplatte 70 mm, Kopf Ø46, Clip für Ø25; Schraubbild fehlt'
    }
  };

  const DEFAULTS = {
    W: 800, H: 2000, D: 300,
    t: 19,              // Plattenstärke
    shelves: 4,         // Fachböden (zusätzlich zu Boden und Deckel)
    dividers: 0,        // senkrechte Mittelteiler
    plinth: 100,        // Sockelhöhe (bei Füßen: Fußhöhe = Abstand Boden-Unterkante zum Fußboden)
    typ: 'regal',       // 'regal' | 'schrank' (Deckenblende) | 'sideboard' (Arbeitsplatte)
    sockel: 'fuesse',   // 'fuesse' = Korpus auf verstellbaren Füßen, 'seiten' = Seiten bis zum Boden
    fussTyp: 'hettich', // siehe FEET
    fussRand: 50,       // VORGABE PRÜFEN: Abstand Fußmitte von Vorder-, Hinter- und Seitenkante des Korpus
    sockelRueck: 30,    // VORGABE PRÜFEN: Sockelblende hinter der Vorderkante
    sockelLuft: 0,      // VORGABE PRÜFEN: Luft Sockelblende zum Fußboden
    raumH: 2500,        // VORGABE PRÜFEN: Raumhöhe (für Deckenblende)
    blendeLuft: 5,      // VORGABE PRÜFEN: Luft Deckenblende zur Decke
    blendeRueck: 5,     // VORGABE PRÜFEN: Deckenblende hinter der Vorderkante (zurückversetzt)
    apT: 0,             // Stärke Arbeitsplatte (0 = wie Plattenstärke)
    apUeb: 20,          // VORGABE PRÜFEN: Überstand Arbeitsplatte vorne
    // Arbeitsplatte von innen mit Spax durch den Deckel (Vorgaben vom Nutzer): 4 × 35, Durchgang Ø5, keine Vorbohrung
    spaxD: 4, spaxL: 35, spaxDurch: 5,
    korpusse: 1,        // Anzahl gleich breiter Korpusse nebeneinander (Sideboard: eine durchgehende Arbeitsplatte)
    spaxRand: 50,       // VORGABE PRÜFEN: Abstand der Spax von Vorder-/Hinterkante und von den Senkrechten (pro Fach 4 Stück)
    // Türen je Spalte: 'offen' | 'dt-l' | 'dt-r' | 'dt-2' | 'st' (Vorgaben vom Nutzer)
    doors: [],
    fuge: 3,            // Fuge zwischen Fronten bzw. zum Rand
    frontT: 0,          // Frontstärke (0 = wie Korpus)
    // Hettich Sensys (Datenblatt/Shop): Topf Ø35, Mindestbohrtiefe 12,9; Topfabstand K = 5 (Nutzer, Bereich 3–7)
    topfD: 35, topfT: 12.9, topfK: 5,
    bandRand: 100,      // Abstand Topfband von Ober-/Unterkante der Tür (Nutzer)
    // Kreuzmontageplatte Lochreihe 37 × 32, Euroschrauben Ø5 × 12 (Hettich-Shop)
    mpVorne: 37, mpRaster: 32, mpD: 5, mpT: 12,
    // Hettich SlideLine M einliegend, 2-bahniges Profil (aus der Katalogzeichnung abgelesen)
    stProfilH: 12, stLuftOben: 3, stVorne: 1, stSpur: 32, stHinten: 7, stSeite: 1, stMaxT: 20,
    stUeberlapp: 30,    // Überlappung der beiden Schiebetüren (Nutzer)
    stRand: 11.5, stObenStart: 27, stUntenStart: 11.5, stRaster: 32,
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
  // Mehrere Korpusse nebeneinander: jeder Korpus wird einzeln gebaut und verschoben, die Arbeitsplatte geht durch
  function buildRegal(input) {
    const p = Object.assign({}, DEFAULTS, input);
    const nk = Math.max(1, Math.round(p.korpusse || 1));
    if (nk === 1) return buildOne(p);
    const Wk = p.W / nk, colsPer = (p.dividers || 0) + 1;
    const all = { parts: [], holes: [], feet: [], profiles: [], hinges: [], warnings: [], errors: [] };
    let first = null;
    for (let i = 0; i < nk; i++) {
      const sub = buildOne(Object.assign({}, p, { W: Wk, korpusse: 1, noAp: true, doors: (p.doors || []).slice(i * colsPer, (i + 1) * colsPer) }));
      first = first || sub;
      sub.errors.forEach((e) => all.errors.includes(e) || all.errors.push(e));
      sub.warnings.forEach((w) => all.warnings.includes(w) || all.warnings.push(w));
      if (sub.errors.length) continue;
      const dx = -p.W / 2 + Wk * (i + 0.5), off = all.parts.length;
      sub.parts.forEach((pt) => {
        pt.pos = pt.pos.slice(); pt.pos[0] += dx; pt.korpus = i + 1;
        (pt.holes || []).forEach((h) => { h.at = h.at.slice(); h.at[0] += dx; h.part += off; if (h.mate != null) h.mate += off; });
        (pt.grooves || []).forEach((g) => { g.box = g.box.map((v, k) => (k === 0 ? [v[0] + dx, v[1] + dx] : v)); g.part += off; });
        (pt.marks || []).forEach((mk) => { mk.at = mk.at.slice(); mk.at[0] += dx; });
        if (pt.col != null) pt.col += i * colsPer;
      });
      all.parts.push(...sub.parts);
      all.holes.push(...sub.holes);
      all.feet.push(...sub.feet.map((f) => Object.assign({}, f, { x: f.x + dx })));
      all.profiles.push(...sub.profiles.map((pr) => Object.assign({}, pr, { x0: pr.x0 + dx, x1: pr.x1 + dx })));
      all.hinges.push(...sub.hinges.map((h) => Object.assign({}, h, { vert: h.vert + off })));
    }
    if (all.errors.length) return { p, parts: [], cutlist: [], errors: all.errors, warnings: all.warnings, derived: {}, holes: [], feet: [], profiles: [], hinges: [] };
    if (p.typ === 'sideboard') {
      const at = p.apT || p.t;
      all.parts.push({ name: 'Arbeitsplatte', cut: [Math.floor(p.W), Math.floor(p.D + p.apUeb)], grain: 0, mat: 'ap', edgeKind: 'B', edgeNames: { W0: 'Vorderkante' },
        thick: at, back: false, size: [Math.floor(p.W), at, Math.floor(p.D + p.apUeb)], pos: [0, p.H + at / 2, p.apUeb / 2], edges: ['W0', 'L0', 'L1'], noJoint: true });
      if (p.W > 4100) all.warnings.push('Arbeitsplatte ' + p.W + ' mm ist länger als die Frischeis-Arbeitsplatten (4100 mm).');
    }
    all.warnings.push(nk + ' Korpusse à ' + Math.round(Wk) + ' mm nebeneinander: Seitenwände untereinander verschrauben (Verbindung noch nicht festgelegt).');
    const res = finish(p, all.parts, all.warnings, all.errors, all.holes, all.feet, all.profiles, all.hinges);
    res.derived = Object.assign({}, first.derived, { edgeM: res.derived.edgeM, korpusse: nk, Wk });
    return res;
  }

  function finish(p, parts, warnings, errors, holes, feet, profiles, hinges) {
    const map = new Map();
    parts.forEach((pt, idx) => {
      const key = pt.name + '|' + pt.cut.join('x') + '|' + pt.thick + '|' + pt.mat;
      if (!map.has(key)) map.set(key, { name: pt.name, l: pt.cut[0], w: pt.cut[1], thick: pt.thick, back: pt.back, mat: pt.back ? 'back' : pt.mat, edgeKind: pt.edgeKind, edges: pt.edges, edgeNames: pt.edgeNames, qty: 0, ids: [] });
      const g = map.get(key); g.qty++; g.ids.push(idx);
    });
    const cutlist = [...map.values()].map((g, i) => { g.no = i + 1; g.ids.forEach((id) => (parts[id].group = g.no)); return g; });
    let edgeMm = 0;
    parts.forEach((pt) => pt.edges.forEach((e) => { edgeMm += e[0] === 'W' ? pt.cut[0] : pt.cut[1]; }));
    return { p, parts, cutlist, warnings, errors, holes, feet, profiles, hinges, derived: { edgeM: edgeMm / 1000 } };
  }

  function buildOne(p) {
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
    const FT = FEET[p.fussTyp] || FEET.hettich;
    if (p.sockel === 'fuesse' && s > 0 && (s < FT.min || s > FT.max))
      warnings.push('Sockelhöhe ' + s + ' mm liegt außerhalb des Verstellbereichs der Füße (' + FT.min + '–' + FT.max + ' mm).');
    if (p.sockel === 'fuesse' && FT.platte && p.fussRand < FT.platte / 2)
      warnings.push('Fuß-Randabstand ' + p.fussRand + ' mm: die Grundplatte (' + FT.platte + ' mm) steht über den Korpus hinaus.');
    if (errors.length) return { p, parts: [], cutlist: [], errors, warnings, derived: {} };

    if (H > 4 * D) warnings.push('Schlankes Regal: an der Wand gegen Kippen sichern.');

    const parts = []; // einzelne Instanzen (für 3D)
    // Geometrie = bestellte Teile: Länge und Breite auf ganze mm ABgerundet (Teil wird nie länger als die Lücke),
    // Position bleibt mittig, ein Rest bis < 1 mm verteilt sich als Fuge.
    const mm = (v) => Math.floor(v + 1e-6);
    // cut = [Maß in Maserrichtung (= Länge im Formular), Maß quer]; grain = Weltachse der Maserung (0 = x, 1 = y)
    const EDGE_NAMES = { Seitenwand: { W0: 'Vorderkante', L1: 'Oberkante' } };
    const add = (name, cut, size, pos, edges, grain, extra) => parts.push(Object.assign({
      name, cut: [mm(cut[0]), mm(cut[1])], grain, mat: 'plate', edgeKind: 'A', edgeNames: Object.assign({ W0: 'Vorderkante' }, EDGE_NAMES[name]),
      thick: size.thick, back: !!size.back, size: size.dims.map((v) => (v === size.thick ? v : mm(v))), pos, edges: edges || []
    }, extra || {}));

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
        add('Fachboden', [cw, Di], { thick: t, dims: [cw, t, Di] }, [x, yc, zI], ['W0'], 0, { col: c });
      }
    }
    // Schrank: Deckenblende auf dem Deckel, zurückversetzt
    if (p.typ === 'schrank') {
      const bh = p.raumH - H - p.blendeLuft;
      if (bh >= 20) add('Deckenblende', [W, bh], { thick: t, dims: [W, bh, t] }, [0, H + bh / 2, D / 2 - p.blendeRueck - t / 2], [], 0);
      else warnings.push('Deckenblende: nur ' + Math.round(bh) + ' mm bis zur Decke – keine Blende eingeplant.');
    }
    // Sideboard: Arbeitsplatte oben drauf, vorne Überstand, seitlich und hinten bündig (von unten verschraubt)
    if (p.typ === 'sideboard' && !p.noAp) {
      const at = p.apT || t;
      add('Arbeitsplatte', [W, D + p.apUeb], { thick: at, dims: [W, at, D + p.apUeb] }, [0, H + at / 2, p.apUeb / 2], ['W0', 'L0', 'L1'], 0,
        { mat: 'ap', edgeKind: 'B' });
      parts[parts.length - 1].noJoint = true;   // keine Konfirmat von oben; Verschraubung von unten noch offen
      if (p.spaxL - t >= at) errors.push('Spax ' + p.spaxD + ' × ' + p.spaxL + ' ist zu lang: kommt durch die Arbeitsplatte (Deckel ' + t + ' + Platte ' + at + ' mm).');
    }
    // Füße: unter dem Boden, je Senkrechte (Seiten mit Randabstand, Mittelteiler mittig), vorne und hinten
    const feet = [];
    if (feetMode && s > 0) {
      const xs = [-W / 2 + p.fussRand, W / 2 - p.fussRand];
      for (let i = 0; i < m; i++) xs.push(-Wi / 2 + (i + 1) * cw + i * t + t / 2);
      xs.sort((a, b) => a - b).forEach((x) => [D / 2 - p.fussRand, -D / 2 + p.fussRand].forEach((z) => feet.push({ x, z, d: FT.rohr, h: s, platte: FT.platte, kopf: FT.kopf })));
      const iBoden = parts.findIndex((q) => q.name === 'Boden');
      parts[iBoden].marks = feet.map((f) => ({ at: [f.x, s, f.z], dia: f.kopf || f.d, label: 'Fuß' + (f.kopf ? ' (Kopf)' : '') }));
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

    /* ---------- Türen ---------- */
    const ft = p.frontT || t;
    const doorInfo = [];   // { part, typ, hingeSide: -1|1, vertIdx } für Bohrungen nach den Verbindern
    const profiles = [];   // Schiebetür-Laufprofile (nur Darstellung / Stückliste)
    const verts = parts.map((q, i) => ({ q, i })).filter((o) => o.q.name === 'Seitenwand' || o.q.name === 'Mittelteiler')
      .map((o) => ({ i: o.i, name: o.q.name, x0: o.q.pos[0] - o.q.size[0] / 2, x1: o.q.pos[0] + o.q.size[0] / 2 })).sort((a, b) => a.x0 - b.x0);
    const yb = feetMode ? s : 0, yt = H, zf = D / 2;
    const doorTypes = p.doors || [];
    for (let c = 0; c + 1 < verts.length; c++) {
      const typ = doorTypes[c] || 'offen';
      if (typ === 'offen') continue;
      const L = verts[c], R = verts[c + 1];
      if (typ === 'st') {
        if (ft > p.stMaxT) { errors.push('Schiebetür Spalte ' + (c + 1) + ': Frontstärke ' + ft + ' mm, SlideLine M 2-bahnig laut Zeichnung max. ' + p.stMaxT + ' mm.'); continue; }
        const x0 = L.x1, x1 = R.x0, LW = x1 - x0, LH = (yt - t) - (yb + t);
        const TH = LH - 2 * p.stProfilH - p.stLuftOben;
        const TB = (LW - 2 * p.stSeite + p.stUeberlapp) / 2;
        if (TB < 300) warnings.push('Schiebetür Spalte ' + (c + 1) + ': Türbreite ' + Math.round(TB) + ' mm, SlideLine M erst ab 300 mm.');
        if (TH > 2 * TB) warnings.push('Schiebetür Spalte ' + (c + 1) + ': Höhe ' + Math.round(TH) + ' mm > 2 × Breite – laut Hettich nicht zulässig.');
        if (TH > 2000) warnings.push('Schiebetür Spalte ' + (c + 1) + ': Türhöhe über 2000 mm – laut Hettich nicht zulässig.');
        const yd = yb + t + p.stProfilH + TH / 2;
        const zFront = zf - p.stVorne - ft / 2, zBack = zf - p.stVorne - p.stSpur - ft / 2;
        add('Schiebetür', [TH, TB], { thick: ft, dims: [TB, TH, ft] }, [x0 + p.stSeite + TB / 2, yd, zFront], ['W0', 'W1', 'L0', 'L1'], 1, { mat: 'front', edgeKind: 'C', noJoint: true, edgeNames: { L0: 'Unterkante', L1: 'Oberkante', W0: 'links (von vorne)', W1: 'rechts (von vorne)' } });
        doorInfo.push({ part: parts.length - 1, typ: 'st' });
        add('Schiebetür', [TH, TB], { thick: ft, dims: [TB, TH, ft] }, [x1 - p.stSeite - TB / 2, yd, zBack], ['W0', 'W1', 'L0', 'L1'], 1, { mat: 'front', edgeKind: 'C', noJoint: true, edgeNames: { L0: 'Unterkante', L1: 'Oberkante', W0: 'links (von vorne)', W1: 'rechts (von vorne)' } });
        doorInfo.push({ part: parts.length - 1, typ: 'st' });
        // Fachböden dieser Spalte hinter die hintere Tür zurücksetzen
        const rueck = p.stVorne + p.stSpur + ft + p.stHinten;
        parts.forEach((q) => {
          if (q.name !== 'Fachboden' || q.col !== c) return;
          const back = q.pos[2] - q.size[2] / 2, nd = mm(q.size[2] - rueck);
          q.size[2] = nd; q.cut[1] = nd; q.pos[2] = back + nd / 2; q.name = 'Fachboden';
          q.recessed = rueck;
        });
        [yb + t, yt - t].forEach((y, k) => profiles.push({ x0, x1, y0: k ? y - p.stProfilH : y, y1: k ? y : y + p.stProfilH, z0: zf - p.stVorne - 65, z1: zf - p.stVorne, len: Math.floor(LW) }));
        continue;
      }
      // Drehtüren aufliegend: außen an der Seitenwand bündig, am Mittelteiler bis zur Mitte; Fuge halbiert
      const xl = (L.name === 'Seitenwand' ? L.x0 : (L.x0 + L.x1) / 2) + p.fuge / 2;
      const xr = (R.name === 'Seitenwand' ? R.x1 : (R.x0 + R.x1) / 2) - p.fuge / 2;
      const y0d = yb + p.fuge / 2, y1d = yt - p.fuge / 2, hD = y1d - y0d;
      const zc = zf + ft / 2;
      const mk = (a, b, side, vert) => {
        add('Drehtür', [hD, b - a], { thick: ft, dims: [b - a, hD, ft] }, [(a + b) / 2, (y0d + y1d) / 2, zc], ['W0', 'W1', 'L0', 'L1'], 1, { mat: 'front', edgeKind: 'C', noJoint: true, edgeNames: { L0: 'Unterkante', L1: 'Oberkante', W0: 'links (von vorne)', W1: 'rechts (von vorne)' } });
        doorInfo.push({ part: parts.length - 1, typ: 'dt', side, vert });
      };
      if (typ === 'dt-2') { const m = (xl + xr) / 2; mk(xl, m - p.fuge / 2, -1, L); mk(m + p.fuge / 2, xr, 1, R); }
      else if (typ === 'dt-l') mk(xl, xr, -1, L);
      else if (typ === 'dt-r') mk(xl, xr, 1, R);
      if (ft < 15 || ft > 24) warnings.push('Drehtür Spalte ' + (c + 1) + ': Frontstärke ' + ft + ' mm, Sensys laut Datenblatt 15–24 mm.');
    }

    (typeof grooves !== 'undefined' ? grooves : []).forEach((g) => { (parts[g.part].grooves = parts[g.part].grooves || []).push(g); });
    const holes = p.verbinder ? joints(parts, p, warnings) : [];
    // Spax: pro Fach (zwischen den Senkrechten) 2 vorne + 2 hinten, Durchgang im Deckel von innen (unten)
    const iDeckel = parts.findIndex((q) => q.name === 'Deckel');
    if (p.typ === 'sideboard' && iDeckel >= 0) {
      const dk = parts[iDeckel], db = boxOf(dk);
      const verts = parts.filter((q) => q.name === 'Seitenwand' || q.name === 'Mittelteiler').map(boxOf).sort((a, b) => a[0][0] - b[0][0]);
      for (let i = 0; i + 1 < verts.length; i++) {
        const x0 = verts[i][0][1], x1 = verts[i + 1][0][0];
        if (x1 - x0 < 2 * p.spaxRand) { warnings.push('Spax: Fach ' + (i + 1) + ' ist schmaler als 2 × Randabstand – bitte Lage selbst festlegen.'); continue; }
        [x0 + p.spaxRand, x1 - p.spaxRand].forEach((x) => [db[2][1] - p.spaxRand, db[2][0] + p.spaxRand].forEach((z) => {
          holes.push({ part: iDeckel, kind: 'face', type: 'Spax-Durchgang', dia: p.spaxDurch, depth: dk.thick, through: true, axis: 1, dir: 1, at: [x, db[1][0], z] });
        }));
      }
    }

    // Topfbänder und Montageplatten (Drehtüren), Beschlagpositionen (Schiebetüren)
    const hingeList = [];
    doorInfo.forEach((di) => {
      const d = parts[di.part], bx = boxOf(d);
      if (di.typ === 'dt') {
        const h = bx[1][1] - bx[1][0];
        const n = h <= 1000 ? 2 : h <= 1800 ? 3 : 4;   // Regel vom Nutzer
        const ys = [];
        for (let k = 0; k < n; k++) ys.push(bx[1][0] + p.bandRand + k * (h - 2 * p.bandRand) / (n - 1));
        const edgeX = di.side < 0 ? bx[0][0] : bx[0][1];
        const cupX = edgeX - di.side * (p.topfK + p.topfD / 2);
        const vert = parts[di.vert.i], vb = boxOf(vert);
        const faceX = di.side < 0 ? vb[0][1] : vb[0][0];               // Innenfläche der Senkrechten zur Tür hin
        const into = di.side < 0 ? -1 : 1;                              // Bohrrichtung in die Senkrechte
        const front = vb[2][1];
        ys.forEach((y) => {
          holes.push({ part: di.part, kind: 'face', type: 'Topf', dia: p.topfD, depth: p.topfT, axis: 2, dir: 1, at: [cupX, y, bx[2][0]] });
          [-p.mpRaster / 2, p.mpRaster / 2].forEach((dy) => holes.push({ part: di.vert.i, kind: 'face', type: 'Montageplatte', dia: p.mpD, depth: p.mpT, axis: 0, dir: into, at: [faceX, y + dy, front - p.mpVorne] }));
          hingeList.push({ art: di.vert.name === 'Mittelteiler' ? 'Mittelwandanschlag' : 'vorliegend', vert: di.vert.i, y });
        });
      } else {
        // SlideLine M: Schraubpositionen an beiden Türenden (Durchmesser je nach Schraube – nur markiert)
        const marks = [];
        [bx[0][0] + p.stRand, bx[0][1] - p.stRand].forEach((x) => {
          [0, 1, 2].forEach((k) => {
            marks.push({ at: [x, bx[1][1] - p.stObenStart - k * p.stRaster, bx[2][0]], dia: 4, label: k ? '' : 'Führungsteil' });
            marks.push({ at: [x, bx[1][0] + p.stUntenStart + k * p.stRaster, bx[2][0]], dia: 4, label: k ? '' : 'Laufteil' });
          });
        });
        d.marks = (d.marks || []).concat(marks);
      }
    });
    // Montageplatte trifft Boden/Fachboden/Deckel an derselben Fläche?
    holes.filter((h) => h.type === 'Montageplatte').forEach((h) => {
      parts.forEach((q) => {
        if (!['Fachboden', 'Boden', 'Deckel'].includes(q.name)) return;
        const qb = boxOf(q);
        if (Math.abs(h.at[0] - qb[0][0]) > 1 && Math.abs(h.at[0] - qb[0][1]) > 1) return;
        if (h.at[1] + h.dia / 2 > qb[1][0] && h.at[1] - h.dia / 2 < qb[1][1] && h.at[2] > qb[2][0] && h.at[2] < qb[2][1])
          warnings.push('Topfband-Montageplatte trifft ' + q.name + ' (Höhe ' + Math.round(h.at[1]) + ' mm). Bandposition oder Fachhöhe anpassen.');
      });
    });
    collisions(parts, holes, warnings);
    holes.forEach((h) => { (parts[h.part].holes = parts[h.part].holes || []).push(h); });

    // Gruppierte Stückliste
    const map = new Map();
    parts.forEach((pt, idx) => {
      const key = pt.name + '|' + pt.cut.join('x') + '|' + pt.thick + '|' + pt.mat;
      if (!map.has(key)) map.set(key, { name: pt.name, l: pt.cut[0], w: pt.cut[1], thick: pt.thick, back: pt.back, mat: pt.back ? 'back' : pt.mat, edgeKind: pt.edgeKind, edges: pt.edges, edgeNames: pt.edgeNames, qty: 0, ids: [] });
      const g = map.get(key); g.qty++; g.ids.push(idx);
    });
    const cutlist = [...map.values()].map((g, i) => { g.no = i + 1; g.ids.forEach((id) => (parts[id].group = g.no)); return g; });

    // Kantenband: Summe der bekanteten Kanten (ohne Zuschlag)
    let edgeMm = 0;
    parts.forEach((pt) => pt.edges.forEach((e) => { edgeMm += e[0] === 'W' ? pt.cut[0] : pt.cut[1]; }));
    const edgeM = edgeMm / 1000;

    return {
      p, parts, cutlist, warnings, errors, holes, feet, profiles, hinges: hingeList,
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
    return holes;
  }

  function collisions(parts, holes, warnings) {
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
      const key = g.back ? 'back' : (g.mat === 'ap' || g.mat === 'front' ? g.mat : 'plate');
      (groups[key] = groups[key] || []);
      for (let i = 0; i < g.qty; i++) groups[key].push({ no: g.no, l: g.l, w: g.w });
    });
    const result = { sheet, material: mat, groups: {}, errors: [] };
    for (const key of Object.keys(groups)) {
      const sh = key === 'back' && p.backSheet ? p.backSheet : key === 'ap' && p.apSheet ? p.apSheet : key === 'front' && p.frontSheet ? p.frontSheet : sheet;
      const r = packSheets(groups[key], sh, p.kerf, key === 'back' ? true : p.rotate);
      r.sheet = sh;
      r.thick = key === 'back' ? p.bt : key === 'ap' ? (p.apT || p.t) : key === 'front' ? (p.frontT || p.t) : p.t;
      result.groups[key] = r;
      result.errors.push(...r.errors);
    }
    return result;
  }

  const api = { MATERIALS, SHEETS, DEFAULTS, FEET, buildRegal, packSheets, plan };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Moebel = api;
})(typeof window !== 'undefined' ? window : globalThis);
