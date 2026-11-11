/* Teilezeichnungen: Anschlusslage aus dem 3D-Modell ableiten und als SVG zeichnen.
 * Teil-Koordinaten (mm): x entlang der Länge (= Maserrichtung), y entlang der Breite.
 * Kanten: W0 = Kante bei y = 0, W1 = bei y = Breite, L0 = Ende bei x = 0, L1 = Ende bei x = Länge.
 * Läuft im Browser und in Node. */
(function (root) {
  'use strict';
  const EPS = 0.6;   // Berührung: Spalt bis 0,6 mm (Rundung auf ganze mm)
  const MIN_OV = 1;  // Mindestüberdeckung für einen Anschluss
  const AX = ['x', 'y', 'z'];
  const r1 = (v) => Math.round(v * 10) / 10;

  function box(pt) {
    return [0, 1, 2].map((i) => [pt.pos[i] - pt.size[i] / 2, pt.pos[i] + pt.size[i] / 2]);
  }

  // Achsen eines Teils: Dicke, Länge, Breite und wie y gemessen wird
  function frame(pt) {
    const s = pt.size;
    const ta = [0, 1, 2].reduce((a, i) => (Math.abs(s[i] - pt.thick) < Math.abs(s[a] - pt.thick) ? i : a), 0);
    const rest = [0, 1, 2].filter((i) => i !== ta);
    let la = pt.grain !== undefined && pt.grain !== ta ? pt.grain : rest.find((i) => Math.abs(s[i] - pt.cut[0]) < 0.6);
    if (la === undefined) la = rest[0];
    const wa = rest.find((i) => i !== la);
    const yFromMax = wa === 2; // Tiefe: y = 0 an der Vorderseite (+z)
    return { ta, la, wa, yFromMax };
  }

  function toLocal(f, b, cb) {
    // Rechteck cb (Welt) in Teilkoordinaten von b (Welt) umrechnen
    const x0 = cb[f.la][0] - b[f.la][0], x1 = cb[f.la][1] - b[f.la][0];
    let y0, y1;
    if (f.yFromMax) { y0 = b[f.wa][1] - cb[f.wa][1]; y1 = b[f.wa][1] - cb[f.wa][0]; }
    else { y0 = cb[f.wa][0] - b[f.wa][0]; y1 = cb[f.wa][1] - b[f.wa][0]; }
    return { x0: r1(x0), x1: r1(x1), y0: r1(y0), y1: r1(y1) };
  }

  const overlap = (a, b) => Math.min(a[1], b[1]) - Math.max(a[0], b[0]);

  function contactsOf(model, idx) {
    const P = model.parts[idx], b = box(P), f = frame(P);
    const face = { min: [], max: [] }, edge = [];
    model.parts.forEach((Q, j) => {
      if (j === idx) return;
      const q = box(Q);
      const inter = [0, 1, 2].map((i) => [Math.max(b[i][0], q[i][0]), Math.min(b[i][1], q[i][1])]);
      // Berührung an einer Fläche (Dickenachse)
      for (const side of ['min', 'max']) {
        const touch = side === 'min' ? Math.abs(q[f.ta][1] - b[f.ta][0]) < EPS : Math.abs(q[f.ta][0] - b[f.ta][1]) < EPS;
        if (touch && overlap(b[f.la], q[f.la]) > MIN_OV && overlap(b[f.wa], q[f.wa]) > MIN_OV) {
          face[side].push(Object.assign({ no: Q.group, name: Q.name }, toLocal(f, b, inter)));
        }
      }
      // Berührung an einer Kante (Längs- oder Breitenachse)
      for (const [ax, lo, hi] of [[f.la, 'L0', 'L1'], [f.wa, f.yFromMax ? 'W1' : 'W0', f.yFromMax ? 'W0' : 'W1']]) {
        const other = ax === f.la ? f.wa : f.la;
        const atMin = Math.abs(q[ax][1] - b[ax][0]) < EPS, atMax = Math.abs(q[ax][0] - b[ax][1]) < EPS;
        if ((atMin || atMax) && overlap(b[f.ta], q[f.ta]) > MIN_OV && overlap(b[other], q[other]) > MIN_OV) {
          const loc = toLocal(f, b, inter.map((v, i) => (i === ax ? [b[ax][atMin ? 0 : 1], b[ax][atMin ? 0 : 1]] : v)));
          edge.push(Object.assign({ no: Q.group, name: Q.name, edge: atMin ? lo : hi }, loc));
        }
      }
    });
    // Fräsbearbeitungen (Nuten) des Teils
    const feat = { min: [], max: [] };
    (P.grooves || []).forEach((g) => {
      const side = Math.abs(g.box[f.ta][0] - b[f.ta][0]) < EPS ? 'min' : 'max';
      feat[side].push(Object.assign({ name: g.name, width: g.width, depth: g.depth }, toLocal(f, b, g.box)));
    });
    // Bohrungen
    const hFace = { min: [], max: [] }, hEdge = [];
    (P.holes || []).forEach((h) => {
      const pt = [0, 1, 2].map((i) => [h.at[i], h.at[i]]);
      const loc = toLocal(f, b, pt);
      const base = { type: h.type, dia: h.dia, depth: h.depth, through: !!h.through, senk: h.senk, x: loc.x0, y: loc.y0 };
      if (h.kind === 'face') {
        hFace[Math.abs(h.at[f.ta] - b[f.ta][0]) < EPS ? 'min' : 'max'].push(base);
      } else {
        let edge;
        if (h.axis === f.la) edge = Math.abs(h.at[f.la] - b[f.la][0]) < EPS ? 'L0' : 'L1';
        else { const atMin = Math.abs(h.at[f.wa] - b[f.wa][0]) < EPS; edge = (atMin !== f.yFromMax) ? 'W0' : 'W1'; if (!f.yFromMax) edge = atMin ? 'W0' : 'W1'; }
        hEdge.push(Object.assign(base, { edge }));
      }
    });
    // Ansichtsseite: Seite mit den meisten Anschlüssen und Bearbeitungen
    const score = (s) => face[s].length + feat[s].length * 10 + hFace[s].filter((h) => !h.through).length * 2;
    const view = score('max') >= score('min') ? 'max' : 'min';
    const other = view === 'max' ? 'min' : 'max';
    // Händigkeit: Rechtssystem aus x-Richtung, y-Richtung und Blickrichtung (Normale der Ansichtsseite)
    const ex = [0, 0, 0]; ex[f.la] = 1;
    const ey = [0, 0, 0]; ey[f.wa] = f.yFromMax ? -1 : 1;
    const n = [0, 0, 0]; n[f.ta] = view === 'max' ? 1 : -1;
    const det = ex[0] * (ey[1] * n[2] - ey[2] * n[1]) - ex[1] * (ey[0] * n[2] - ey[2] * n[0]) + ex[2] * (ey[0] * n[1] - ey[1] * n[0]);
    const sortC = (a, b2) => a.x0 - b2.x0 || a.y0 - b2.y0;
    return {
      frame: f, viewAxis: AX[f.ta], hand: det > 0 ? 1 : -1,
      faceView: face[view].sort(sortC), faceOther: face[other].sort(sortC), edge: edge.sort(sortC),
      featView: feat[view].sort(sortC), featOther: feat[other].sort(sortC),
      holesView: hFace[view].sort((a, b2) => a.x - b2.x || a.y - b2.y), holesOther: hFace[other].sort((a, b2) => a.x - b2.x || a.y - b2.y),
      holesEdge: hEdge.sort((a, b2) => a.edge.localeCompare(b2.edge) || a.x - b2.x || a.y - b2.y)
    };
  }

  // Zeichnungen je Stücklistenposition; abweichende Anschlusslagen werden eigene Varianten
  function analyze(model) {
    const out = [];
    model.cutlist.forEach((g) => {
      const variants = new Map();
      g.ids.forEach((id) => {
        const c = contactsOf(model, id);
        const sig = JSON.stringify([c.faceView, c.faceOther, c.edge, c.featView, c.featOther].map((l) => l.map((k) => [k.x0, k.x1, k.y0, k.y1, k.edge || ''])).concat(
          [c.holesView, c.holesOther, c.holesEdge].map((l) => l.map((k) => [k.type, r1(k.x), r1(k.y), k.edge || '']))));
        if (!variants.has(sig)) variants.set(sig, { c, hands: [] });
        variants.get(sig).hands.push(c.hand);
      });
      let k = 0;
      variants.forEach((v) => {
        const plus = v.hands.filter((h) => h > 0).length, minus = v.hands.length - plus;
        out.push({
          no: g.no, sub: variants.size > 1 ? String.fromCharCode(97 + k++) : '', name: g.name, qty: v.hands.length,
          l: g.l, w: g.w, thick: g.thick, edges: g.edges || [], edgeNames: g.edgeNames || {}, back: g.back,
          faceView: v.c.faceView, faceOther: v.c.faceOther, edge: v.c.edge, featView: v.c.featView, featOther: v.c.featOther,
          holesView: v.c.holesView, holesOther: v.c.holesOther, holesEdge: v.c.holesEdge,
          mirror: plus && minus ? { asDrawn: Math.max(plus, minus), mirrored: Math.min(plus, minus) } : null
        });
      });
    });
    return out;
  }

  const EDGE_TXT = { W0: 'unten', W1: 'oben', L0: 'links', L1: 'rechts' }; // Lage in der Zeichnung
  const escX = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const fmt = (v) => String(r1(v)).replace('.', ',');

  // Kurzfassung der Bohrungen für das Schriftfeld
  function holeSummary(d) {
    const cnt = (list, f) => { const m = {}; list.forEach((h) => { const k = f(h); m[k] = (m[k] || 0) + 1; }); return Object.entries(m).map(([k, n]) => n + '× ' + k).join(', '); };
    const fl = (d.holesView || []).concat(d.holesOther || []);
    const ed = d.holesEdge || [];
    if (!fl.length && !ed.length) return 'Bohrungen: keine.';
    const s = [];
    if (fl.length) s.push('Flächenbohrungen (CNC): ' + cnt(fl, (h) => h.type + ' Ø' + fmt(h.dia) + (h.through ? ' durch' + (h.senk ? ', Senkung Ø' + fmt(h.senk) : '') : ' × ' + fmt(h.depth))));
    if (ed.length) s.push('Kantenbohrungen (von Hand): ' + cnt(ed, (h) => h.type + ' Ø' + fmt(h.dia) + ' × ' + fmt(h.depth) + ' Kante ' + EDGE_TXT[h.edge]));
    return s.join('.   ') + '.';
  }

  // Bohrliste einer Zeichnung als CSV-Zeilen (x/y ab Nullpunkt der Zeichnung)
  function holeRows(d) {
    const rows = [];
    const side = (h, v) => (h.edge ? 'Kante ' + EDGE_TXT[h.edge] : v);
    (d.holesView || []).forEach((h) => rows.push([side(h, 'Ansichtsseite'), h.type, fmt(h.x), fmt(h.y), fmt(h.dia), h.through ? 'durch' : fmt(h.depth), h.senk && h.through ? 'Senkung Ø' + fmt(h.senk) + ' Gegenseite' : '']));
    (d.holesOther || []).forEach((h) => rows.push([side(h, 'Gegenseite'), h.type, fmt(h.x), fmt(h.y), fmt(h.dia), h.through ? 'durch' : fmt(h.depth), h.senk && h.through ? 'Senkung Ø' + fmt(h.senk) + ' Gegenseite' : '']));
    (d.holesEdge || []).forEach((h) => rows.push([side(h), h.type, fmt(h.x), fmt(h.y), fmt(h.dia), fmt(h.depth), 'Mitte Plattenstärke']));
    return rows;
  }

  // SVG einer Zeichnung. info: { material, kante, projekt }
  function svg(d, info) {
    info = info || {};
    const L = d.l, W = d.w;
    const u = Math.max(L, W) / 60;                // Grundeinheit für Text und Abstände
    const fs = Math.max(u * 0.9, 8);
    const mL = fs * 7, mR = fs * 7, mT = fs * 9, mB = fs * 7;
    const head = fs * 10;                           // Schriftfeld unten
    const VW = mL + L + mR, VH = mT + W + mB + head;
    const X = (x) => mL + x, Y = (y) => mT + (W - y); // y nach oben, vorne (y = 0) unten
    const o = [];
    // Beschriftung: im Rechteck, wenn Platz ist (gedreht bei schmal-hohen), sonst rechts daneben
    const label = (c, txt, col, size) => {
      const w = c.x1 - c.x0, h = c.y1 - c.y0, need = txt.length * size * 0.55;
      const cx = X((c.x0 + c.x1) / 2), cy = Y((c.y0 + c.y1) / 2);
      if (w >= need && h >= size * 1.2) o.push('<text x="' + r1(cx) + '" y="' + r1(cy) + '" text-anchor="middle" dominant-baseline="middle" fill="' + col + '" font-size="' + r1(size) + '">' + txt + '</text>');
      else if (h >= need && w >= size * 1.1) o.push('<text x="' + r1(cx) + '" y="' + r1(cy) + '" text-anchor="middle" dominant-baseline="middle" fill="' + col + '" font-size="' + r1(size) + '" transform="rotate(-90 ' + r1(cx) + ' ' + r1(cy) + ')">' + txt + '</text>');
      else if (w >= need) { // flach und lang: Text knapp unter (bzw. über) dem Rechteck, innerhalb des Teils
        const below = c.y0 > size * 1.6;
        o.push('<text x="' + r1(cx) + '" y="' + r1(below ? Y(c.y0) + size * 1.1 : Y(c.y1) - size * 0.4) + '" text-anchor="middle" fill="' + col + '" font-size="' + r1(size) + '">' + txt + '</text>');
      } else o.push('<text x="' + r1(X(c.x1) + size * 0.4) + '" y="' + r1(cy) + '" dominant-baseline="middle" fill="' + col + '" font-size="' + r1(size) + '">' + txt + '</text>');
    };
    o.push('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + r1(VW) + ' ' + r1(VH) + '" font-family="Arial, Helvetica, sans-serif" font-size="' + r1(fs) + '">');
    o.push('<rect x="0" y="0" width="' + r1(VW) + '" height="' + r1(VH) + '" fill="#ffffff"/>');
    // Teil, Nuten, dann Anschlüsse der Ansichtsseite (gefüllt) und der Gegenseite (gestrichelt)
    const hid = 'h' + d.no + d.sub;
    o.push('<defs><pattern id="' + hid + '" width="' + r1(u * 0.8) + '" height="' + r1(u * 0.8) + '" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="' + r1(u * 0.8) + '" stroke="#b03a2e" stroke-width="' + r1(u * 0.15) + '"/></pattern></defs>');
    o.push('<rect x="' + r1(X(0)) + '" y="' + r1(Y(W)) + '" width="' + L + '" height="' + W + '" fill="#f6f3ec" stroke="#000" stroke-width="' + r1(u * 0.15) + '"/>');
    const fv = d.featView || [], fo = d.featOther || [];
    fv.concat(fo).forEach((g) => {
      const other = fo.includes(g);
      o.push('<rect x="' + r1(X(g.x0)) + '" y="' + r1(Y(g.y1)) + '" width="' + r1(g.x1 - g.x0) + '" height="' + r1(g.y1 - g.y0) + '" fill="' + (other ? 'none' : 'url(#' + hid + ')') +
        '" stroke="#b03a2e" stroke-width="' + r1(u * 0.12) + '"' + (other ? ' stroke-dasharray="' + r1(u * 0.6) + ' ' + r1(u * 0.4) + '"' : '') + '/>');
      label(g, g.name + (other ? ' (Gegenseite)' : ''), '#b03a2e', fs * 0.8);
    });
    d.faceView.forEach((c) => {
      o.push('<rect x="' + r1(X(c.x0)) + '" y="' + r1(Y(c.y1)) + '" width="' + r1(c.x1 - c.x0) + '" height="' + r1(c.y1 - c.y0) +
        '" fill="#d7e3f0" stroke="#2f5d8a" stroke-width="' + r1(u * 0.12) + '"/>');
      label(c, 'Pos ' + c.no, '#2f5d8a', fs);
    });
    d.faceOther.forEach((c) => {
      o.push('<rect x="' + r1(X(c.x0)) + '" y="' + r1(Y(c.y1)) + '" width="' + r1(c.x1 - c.x0) + '" height="' + r1(c.y1 - c.y0) +
        '" fill="none" stroke="#555" stroke-width="' + r1(u * 0.12) + '" stroke-dasharray="' + r1(u * 0.6) + ' ' + r1(u * 0.4) + '"/>');
      label(c, 'Pos ' + c.no + ' Gegenseite', '#555', fs * 0.8);
    });
    // Bohrungen: Fläche = Kreis (durchgehend: mit Kreuz), Gegenseite gestrichelt, Kante = verdeckte Bohrung gestrichelt
    const HCOL = { 'Konfirmat': '#6a1b9a', 'Konfirmat-Kernloch': '#6a1b9a', 'Dübel': '#1b5e20' };
    const hv = d.holesView || [], ho = d.holesOther || [], he = d.holesEdge || [];
    hv.concat(ho).forEach((h) => {
      const other = ho.includes(h) && !h.through, col = HCOL[h.type] || '#000', cx = X(h.x), cy = Y(h.y), rr = h.dia / 2;
      o.push('<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(rr) + '" fill="' + (other ? 'none' : '#fff') + '" stroke="' + col + '" stroke-width="' + r1(u * 0.12) + '"' +
        (other ? ' stroke-dasharray="' + r1(u * 0.25) + ' ' + r1(u * 0.2) + '"' : '') + '/>');
      if (h.through) o.push('<path d="M' + r1(cx - rr) + ' ' + r1(cy) + 'H' + r1(cx + rr) + 'M' + r1(cx) + ' ' + r1(cy - rr) + 'V' + r1(cy + rr) + '" stroke="' + col + '" stroke-width="' + r1(u * 0.08) + '"/>');
      if (h.through && h.senk) o.push('<circle cx="' + r1(cx) + '" cy="' + r1(cy) + '" r="' + r1(h.senk / 2) + '" fill="none" stroke="' + col + '" stroke-width="' + r1(u * 0.06) + '"/>');
    });
    he.forEach((h) => {
      const col = HCOL[h.type] || '#000', rr = h.dia / 2, dash = ' stroke-dasharray="' + r1(u * 0.25) + ' ' + r1(u * 0.2) + '"';
      let x0, y0, w, hh;
      if (h.edge === 'L0') { x0 = X(0); y0 = Y(h.y + rr); w = h.depth; hh = h.dia; }
      else if (h.edge === 'L1') { x0 = X(L - h.depth); y0 = Y(h.y + rr); w = h.depth; hh = h.dia; }
      else if (h.edge === 'W0') { x0 = X(h.x - rr); y0 = Y(h.depth); w = h.dia; hh = h.depth; }
      else { x0 = X(h.x - rr); y0 = Y(W); w = h.dia; hh = h.depth; }
      o.push('<rect x="' + r1(x0) + '" y="' + r1(y0) + '" width="' + r1(w) + '" height="' + r1(hh) + '" fill="none" stroke="' + col + '" stroke-width="' + r1(u * 0.1) + '"' + dash + '/>');
    });

    // Kanten (Bekantung)
    const ew = u * 0.6;
    const edgeLine = (e) => ({
      W0: [X(0), Y(0) + ew / 2, X(L), Y(0) + ew / 2], W1: [X(0), Y(W) - ew / 2, X(L), Y(W) - ew / 2],
      L0: [X(0) - ew / 2, Y(0), X(0) - ew / 2, Y(W)], L1: [X(L) + ew / 2, Y(0), X(L) + ew / 2, Y(W)]
    }[e]);
    d.edges.forEach((e) => {
      const p = edgeLine(e);
      o.push('<line x1="' + r1(p[0]) + '" y1="' + r1(p[1]) + '" x2="' + r1(p[2]) + '" y2="' + r1(p[3]) + '" stroke="#c0392b" stroke-width="' + r1(ew) + '"/>');
    });
    // Anschlüsse an Kanten: Markierung außen
    d.edge.forEach((c) => {
      const m = u * 1.2;
      let p;
      if (c.edge === 'L0') p = [X(0) - m * 1.6, Y(c.y1), m, c.y1 - c.y0];
      else if (c.edge === 'L1') p = [X(L) + m * 0.6, Y(c.y1), m, c.y1 - c.y0];
      else if (c.edge === 'W0') p = [X(c.x0), Y(0) + m * 0.6, c.x1 - c.x0, m];
      else p = [X(c.x0), Y(W) - m * 1.6, c.x1 - c.x0, m];
      o.push('<rect x="' + r1(p[0]) + '" y="' + r1(p[1]) + '" width="' + r1(p[2]) + '" height="' + r1(p[3]) + '" fill="none" stroke="#2f5d8a" stroke-width="' + r1(u * 0.1) + '" stroke-dasharray="' + r1(u * 0.3) + ' ' + r1(u * 0.2) + '"/>');
      const t = 'Pos ' + c.no, fz = fs * 0.75;
      if (c.edge === 'L0' || c.edge === 'L1') {
        const tx = p[0] + p[2] / 2, ty = p[1] + p[3] / 2;
        o.push('<text x="' + r1(tx) + '" y="' + r1(ty) + '" text-anchor="middle" dominant-baseline="middle" fill="#2f5d8a" font-size="' + r1(fz) + '" transform="rotate(-90 ' + r1(tx) + ' ' + r1(ty) + ')">' + t + '</text>');
      } else {
        o.push('<text x="' + r1(p[0] + fz * 0.4) + '" y="' + r1(c.edge === 'W0' ? p[1] + p[3] + fz * 1.1 : p[1] - fz * 0.3) + '" fill="#2f5d8a" font-size="' + r1(fz) + '">' + t + '</text>');
      }
    });
    // Bemaßung: Gesamtmaße
    const dimY = Y(0) + fs * 4.5, dimX = X(0) - fs * 4.5, sw = r1(u * 0.08);
    o.push('<line x1="' + X(0) + '" y1="' + r1(dimY) + '" x2="' + X(L) + '" y2="' + r1(dimY) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<line x1="' + X(0) + '" y1="' + r1(Y(0)) + '" x2="' + X(0) + '" y2="' + r1(dimY + fs * 0.5) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<line x1="' + X(L) + '" y1="' + r1(Y(0)) + '" x2="' + X(L) + '" y2="' + r1(dimY + fs * 0.5) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<text x="' + r1(X(L / 2)) + '" y="' + r1(dimY - fs * 0.4) + '" text-anchor="middle" font-weight="bold">' + fmt(L) + '</text>');
    o.push('<line x1="' + r1(dimX) + '" y1="' + r1(Y(0)) + '" x2="' + r1(dimX) + '" y2="' + r1(Y(W)) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<line x1="' + r1(dimX - fs * 0.5) + '" y1="' + r1(Y(0)) + '" x2="' + X(0) + '" y2="' + r1(Y(0)) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<line x1="' + r1(dimX - fs * 0.5) + '" y1="' + r1(Y(W)) + '" x2="' + X(0) + '" y2="' + r1(Y(W)) + '" stroke="#000" stroke-width="' + sw + '"/>');
    o.push('<text x="' + r1(dimX - fs * 0.4) + '" y="' + r1(Y(W / 2)) + '" text-anchor="middle" font-weight="bold" transform="rotate(-90 ' + r1(dimX - fs * 0.4) + ' ' + r1(Y(W / 2)) + ')">' + fmt(W) + '</text>');
    // Koordinaten-Bemaßung der Anschlüsse (ab Nullpunkt links vorne)
    const all = d.faceView.concat(d.faceOther, d.featView || [], d.featOther || []);
    const hAll = (d.holesView || []).concat(d.holesOther || [], d.holesEdge || []);
    const xs = [...new Set(all.flatMap((c) => [c.x0, c.x1]).concat(hAll.filter((h) => h.edge !== 'L0' && h.edge !== 'L1').map((h) => r1(h.x))).filter((v) => v > 0.05 && v < L - 0.05))].sort((a, b) => a - b);
    const ys = [...new Set(all.flatMap((c) => [c.y0, c.y1]).concat(hAll.filter((h) => h.edge !== 'W0' && h.edge !== 'W1').map((h) => r1(h.y))).filter((v) => v > 0.05 && v < W - 0.05))].sort((a, b) => a - b);
    // Maßzahlen nicht überlappen lassen: Textposition mindestens eine Schrifthöhe auseinander
    const spread = (vals, toScreen, dir) => { let last = -Infinity; return vals.map((v) => { let p = toScreen(v) * dir; if (p < last + fs * 0.95) p = last + fs * 0.95; last = p; return p * dir; }); };
    const xText = spread(xs, X, 1), yText = spread(ys, Y, -1);
    const tickY = Y(W) - fs * 2.6;
    xs.forEach((x, i) => {
      o.push('<line x1="' + r1(X(x)) + '" y1="' + r1(Y(W)) + '" x2="' + r1(X(x)) + '" y2="' + r1(tickY) + '" stroke="#000" stroke-width="' + sw + '" stroke-dasharray="' + r1(u * 0.2) + ' ' + r1(u * 0.2) + '"/>');
      const tx = xText[i] + fs * 0.3;
      if (Math.abs(xText[i] - X(x)) > 0.5) o.push('<line x1="' + r1(X(x)) + '" y1="' + r1(tickY) + '" x2="' + r1(xText[i]) + '" y2="' + r1(tickY - fs * 0.25) + '" stroke="#000" stroke-width="' + sw + '"/>');
      o.push('<text x="' + r1(tx) + '" y="' + r1(tickY - fs * 0.3) + '" font-size="' + r1(fs * 0.85) + '" transform="rotate(-90 ' + r1(tx) + ' ' + r1(tickY - fs * 0.3) + ')">' + fmt(x) + '</text>');
    });
    const tickX = X(L) + fs * 2.6;
    ys.forEach((y, i) => {
      o.push('<line x1="' + r1(X(L)) + '" y1="' + r1(Y(y)) + '" x2="' + r1(tickX) + '" y2="' + r1(Y(y)) + '" stroke="#000" stroke-width="' + sw + '" stroke-dasharray="' + r1(u * 0.2) + ' ' + r1(u * 0.2) + '"/>');
      if (Math.abs(yText[i] - Y(y)) > 0.5) o.push('<line x1="' + r1(tickX) + '" y1="' + r1(Y(y)) + '" x2="' + r1(tickX + fs * 0.25) + '" y2="' + r1(yText[i]) + '" stroke="#000" stroke-width="' + sw + '"/>');
      o.push('<text x="' + r1(tickX + fs * 0.3) + '" y="' + r1(yText[i] + fs * 0.35) + '" font-size="' + r1(fs * 0.85) + '">' + fmt(y) + '</text>');
    });
    // Nullpunkt und Maserung
    o.push('<circle cx="' + X(0) + '" cy="' + r1(Y(0)) + '" r="' + r1(u * 0.5) + '" fill="#000"/>');
    o.push('<text x="' + r1(X(0) + fs * 0.6) + '" y="' + r1(Y(0) - fs * 0.6) + '" font-size="' + r1(fs * 0.8) + '">0/0</text>');
    const gy = Y(W / 2), gx0 = X(L * 0.35), gx1 = X(L * 0.65);
    if (!d.faceView.some((c) => c.y0 < W / 2 + fs && c.y1 > W / 2 - fs && c.x0 < L * 0.65 && c.x1 > L * 0.35)) {
      o.push('<line x1="' + r1(gx0) + '" y1="' + r1(gy) + '" x2="' + r1(gx1) + '" y2="' + r1(gy) + '" stroke="#8a7a5a" stroke-width="' + sw + '"/>');
      o.push('<path d="M' + r1(gx1) + ' ' + r1(gy) + ' l' + r1(-fs) + ' ' + r1(-fs * 0.4) + ' v' + r1(fs * 0.8) + ' z" fill="#8a7a5a"/>');
      o.push('<text x="' + r1((gx0 + gx1) / 2) + '" y="' + r1(gy - fs * 0.5) + '" text-anchor="middle" fill="#8a7a5a" font-size="' + r1(fs * 0.8) + '">Maserrichtung</text>');
    }
    // Schriftfeld
    const ty = mT + W + mB, lh = fs * 1.35;
    o.push('<line x1="' + r1(fs) + '" y1="' + r1(ty) + '" x2="' + r1(VW - fs) + '" y2="' + r1(ty) + '" stroke="#000" stroke-width="' + sw + '"/>');
    const lines = [
      '<tspan font-weight="bold" font-size="' + r1(fs * 1.25) + '">Pos ' + d.no + d.sub + ' – ' + escX(d.name) + '</tspan>',
      'Stück: ' + d.qty + (d.mirror ? ' (davon ' + d.mirror.mirrored + '× spiegelbildlich)' : '') + '   Fertigmaß: ' + fmt(L) + ' × ' + fmt(W) + ' × ' + fmt(d.thick) + ' mm (inkl. Kante)',
      'Material: ' + escX(info.material || '–'),
      'Kante (rot): ' + (d.edges.length ? d.edges.map((e) => EDGE_TXT[e] + (d.edgeNames[e] ? ' = ' + d.edgeNames[e] : '')).join(', ') + ' – ' + escX(info.kante || 'Kantenart A') : 'keine'),
      'Maße in mm ab 0/0 (links unten). Ansicht auf die Seite mit den Anschlüssen; blau = anschließendes Teil, gestrichelt = Gegenseite bzw. Anschluss an der Kante.',
      ((d.featView || []).length + (d.featOther || []).length ? 'Fräsen (schraffiert): ' + (d.featView || []).concat(d.featOther || []).map((g) => g.name + ', ' + fmt(g.x1 - g.x0) + ' lang').join('; ') + '.   ' : '') +
        holeSummary(d)
    ];
    lines.forEach((t, i) => o.push('<text x="' + r1(fs) + '" y="' + r1(ty + lh * (i + 1.1)) + '">' + t + '</text>'));
    if (info.projekt) o.push('<text x="' + r1(VW - fs) + '" y="' + r1(ty + lh * 1.1) + '" text-anchor="end">' + escX(info.projekt) + '</text>');
    o.push('</svg>');
    return o.join('\n');
  }

  const api = { analyze, svg, contactsOf, frame, holeRows, holeSummary };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Zeichnung = api;
})(typeof window !== 'undefined' ? window : globalThis);
