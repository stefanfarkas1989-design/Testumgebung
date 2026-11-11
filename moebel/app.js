/* Möbel-Generator: Oberfläche, 3D-Ansicht, Ergebnis-Tabs */
(function () {
  'use strict';
  const M = window.Moebel;
  const $ = (id) => document.getElementById(id);
  const eur = (v) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const PRESETS = {
    buch:      { W: 800,  H: 2000, D: 300, shelves: 4, dividers: 0, plinth: 100, typ: 'regal', korpusse: 1, doors: [], wand: false },
    wuerfel:   { W: 1500, H: 1500, D: 380, shelves: 3, dividers: 3, plinth: 100, typ: 'regal', korpusse: 1, doors: [], wand: false },
    schuh:     { W: 900,  H: 600,  D: 300, shelves: 2, dividers: 0, plinth: 100, typ: 'regal', korpusse: 1, doors: [], wand: false },
    sideboard: { W: 1800, H: 700,  D: 400, shelves: 1, dividers: 2, plinth: 100, typ: 'sideboard', korpusse: 1, doors: [], wand: false },
    hochschrank: { W: 800, H: 2200, D: 600, shelves: 5, dividers: 0, plinth: 100, typ: 'schrank', korpusse: 1, doors: [], wand: false },
    // Vorschlag Fensterwand (Wand 3540 von Wand zu Wand, Passblenden 50, Fenster-UK 800): 2 Korpusse W1000, Fronten Wildeiche H1318, Arbeitsplatte Granito anthrazit 38 mm
    fensterwand: {"W": 3540, "H": 760, "D": 400, "plinth": 100, "shelves": 1, "dividers": 2, "korpusse": 2, "typ": "sideboard", "sockel": "fuesse", "fussTyp": "hettich", "apUeb": 20, "back": true, "bt": 8, "backMode": "nut", "doors": ["dt-l", "dt-l", "dt-r", "dt-l", "dt-r", "dt-r"], "fe": {"nr": "14148/1000", "name": "EGGER Dekorative Platte Premiumweiss W1000 ST19, 100 % PEFC", "l": 2800, "w": 2070, "t": 19, "kat": "beschichtete-platte", "url": "https://www.frischeis.at/shop/platte/dekorative-platte/beschichtete-platte/egger-dekorative-platte-premiumweiss-w1000-st19--100--pefc~p18284642"}, "t": 19, "material": "fe", "sheet": "fe", "kanteFe": {"nr": "24747/0004", "name": "EGGER ABS Kante Premiumweiss W1000 ST19", "w": 23, "t": 0.8, "url": "https://www.frischeis.at/shop/platte/kante/kunststoffkante/egger-abs-kante-premiumweiss-w1000-st19~p6789937"}, "frontFe": {"nr": "14158/1318", "name": "EGGER Dekorative Platte Wildeiche natur H1318 ST10, 100 % PEFC", "l": 2800, "w": 2070, "t": 19, "kat": "beschichtete-platte", "url": "https://www.frischeis.at/shop/platte/dekorative-platte/beschichtete-platte/egger-dekorative-platte-wildeiche-natur-h1318-st10--100--pefc~p18290159"}, "frontT": 19, "frontSheet": {"l": 2800, "w": 2070, "name": "2800 × 2070"}, "frontKanteFe": {"nr": "24565/1318", "name": "EGGER ABS Kante Wildeiche natur H1318 ST10", "w": 23, "t": 0.8, "url": "https://www.frischeis.at/shop/platte/kante/kunststoffkante/egger-abs-kante-wildeiche-natur-h1318-st10~p6792474"}, "apFe": {"nr": "50235/4288", "name": "Kaindl Postforming Arbeitsplatte G03/03 Granito anthrazit 4288 PE", "l": 4100, "w": 900, "t": 38, "kat": "laminat-arbeitsplatte", "url": "https://www.frischeis.at/shop/platte/arbeitsplatte/laminat-arbeitsplatte/kaindl-postforming-arbeitsplatte-g0303-granito-anthrazit-4288-pe~p63789"}, "apT": 38, "apSheet": {"l": 4100, "w": 900, "name": "4100 × 900"}, "apKanteFe": {"nr": "50382/4288", "name": "Kaindl ABS Kante Granito anthrazit 4288 PE", "w": 45, "t": 1, "url": "https://www.frischeis.at/shop/platte/kante/kunststoffkante/kaindl-abs-kante-granito-anthrazit-4288-pe~p14616243"}, "backFe": {"nr": "14147/1000", "name": "EGGER Dekorative Platte Premiumweiss W1000 ST19, 100 % PEFC", "l": 2800, "w": 2070, "t": 8, "kat": "beschichtete-platte", "url": "https://www.frischeis.at/shop/platte/dekorative-platte/beschichtete-platte/egger-dekorative-platte-premiumweiss-w1000-st19--100--pefc~p18284638"}, "backSheet": {"l": 2800, "w": 2070, "name": "2800 × 2070"}, "wand": true, "passB": 50},
    nische:    { W: 1200, H: 2400, D: 250, shelves: 7, dividers: 1, plinth: 100, typ: 'regal', korpusse: 1, doors: [], wand: false }
  };

  let state = Object.assign({}, M.DEFAULTS, PRESETS.buch);

  /* ---------- Zustand speichern / laden ---------- */
  function loadState() {
    try {
      const h = location.hash.slice(1);
      if (h) { Object.assign(state, JSON.parse(decodeURIComponent(atob(h)))); return; }
    } catch (e) { /* ignorieren */ }
    try { const s = localStorage.getItem('moebel-state'); if (s) Object.assign(state, JSON.parse(s)); } catch (e) { /* ignorieren */ }
  }
  function saveState() {
    try { localStorage.setItem('moebel-state', JSON.stringify(state)); } catch (e) { /* ignorieren */ }
  }

  /* ---------- Formular ---------- */
  const pairs = ['W', 'H', 'D', 'plinth', 'shelves', 'dividers', 'korpusse', 'nutA', 'nutT', 'nutLuft', 'nutPlus'];
  function initForm() {
    Object.entries(M.MATERIALS).forEach(([k, m]) => $('material').add(new Option(m.name, k)));
    Object.entries(M.SHEETS).forEach(([k, s]) => $('sheet').add(new Option(s.name, k)));
    pairs.forEach((k) => {
      const r = $(k), n = $(k + 'n');
      const set = (v) => { state[k] = Number(v); if (k === 'dividers' || k === 'korpusse') syncForm(); update(); };
      r.addEventListener('input', () => set(r.value));
      n.addEventListener('change', () => { r.value = n.value; set(n.value); });
    });
    $('back').addEventListener('change', () => {
      const v = Number($('back').value); state.back = v > 0; if (v > 0) state.bt = v;
      if (!state.backFe || state.backFe.t !== v) { delete state.backFe; delete state.backSheet; }
      syncForm(); update();
    });
    $('material').addEventListener('change', () => { state.material = $('material').value; update(); });
    $('backMode').addEventListener('change', () => { state.backMode = $('backMode').value; syncForm(); update(); });
    $('t').addEventListener('change', () => { state.t = Number($('t').value); update(); if (typeof kanten !== 'undefined') kanten.render(); });
    $('sheet').addEventListener('change', () => { state.sheet = $('sheet').value; update(); });
    $('rotate').addEventListener('change', () => { state.rotate = $('rotate').checked; update(); });
    $('preset').addEventListener('change', () => {
      const pr = JSON.parse(JSON.stringify(PRESETS[$('preset').value]));
      Object.assign(state, pr);
      restoreFe();
      if (state.backFe) ensureBackOption(state.backFe.t);
      // Bestellfelder aus den gewählten Frischeis-Artikeln
      if (pr.fe) $('jMat').value = pr.fe.nr + ' ' + pr.fe.name;
      if (pr.kanteFe) $('jKante').value = pr.kanteFe.nr + ' ' + pr.kanteFe.name;
      if (pr.backFe) $('jBack').value = pr.backFe.nr + ' ' + pr.backFe.name;
      if (pr.fe || pr.kanteFe || pr.backFe) $('jMat').dispatchEvent(new Event('change'));
      syncForm(); update();
      if (typeof renderDekor === 'function') { renderDekor(); kanten.render(); rueck.render(); apPick.render(); apKante.render(); frontPick.render(); frontKante.render(); }
    });
    $('explode').addEventListener('input', () => applyExplode());
    $('person').addEventListener('change', () => { if (personMesh) personMesh.visible = $('person').checked; render(); });
    $('typ').addEventListener('change', () => { state.typ = $('typ').value; syncForm(); update(); });
    $('sockel').addEventListener('change', () => { state.sockel = $('sockel').value; syncForm(); update(); });
    $('fussTyp').addEventListener('change', () => { state.fussTyp = $('fussTyp').value; syncForm(); update(); });
    document.querySelectorAll('#typBox input[data-k]').forEach((el) => el.addEventListener('change', () => {
      const v = Number(el.value); if (Number.isFinite(v) && v >= 0) state[el.dataset.k] = v; syncForm(); update();
    }));
    $('verbinder').addEventListener('change', () => { state.verbinder = $('verbinder').checked; syncForm(); update(); });
    document.querySelectorAll('#vBox input[data-k]').forEach((el) => el.addEventListener('change', () => {
      const v = Number(el.value); if (Number.isFinite(v) && v > 0) state[el.dataset.k] = v; syncForm(); update();
    }));
    $('showDoors').addEventListener('change', () => { meshes.forEach((m) => { if (m.userData.pt.mat === 'front') m.visible = $('showDoors').checked; }); render(); });
    $('openDoors').addEventListener('input', applyExplode);
    $('wand').addEventListener('change', () => { state.wand = $('wand').checked; syncForm(); update(); });
    $('passB').addEventListener('change', () => { const v = Number($('passB').value); if (v > 0) state.passB = v; syncForm(); update(); });
    $('feat').addEventListener('change', () => { meshes.forEach((m) => { if (m.userData.feat) m.userData.feat.visible = $('feat').checked; }); render(); });
  }
  function syncForm() {
    pairs.forEach((k) => { $(k).value = state[k]; $(k + 'n').value = state[k]; });
    $('back').value = state.back ? state.bt : 0;
    $('backMode').value = state.backMode || 'nut';
    renderDoorUI();
    $('wand').checked = !!state.wand;
    $('passRow').hidden = !state.wand;
    $('passB').value = state.passB != null ? state.passB : M.DEFAULTS.passB;
    $('typ').value = state.typ || 'regal';
    $('apBox').hidden = state.typ !== 'sideboard';
    $('sockel').value = state.sockel || 'fuesse';
    $('fussTyp').value = state.fussTyp || 'hettich';
    $('fussRow').hidden = state.sockel !== 'fuesse';
    $('fussInfo').textContent = state.sockel === 'fuesse' ? (M.FEET[state.fussTyp] || M.FEET.hettich).quelle + '.' : '';
    document.querySelectorAll('#typBox label').forEach((lb) => {
      const f = lb.dataset.for;
      lb.hidden = !(f === 'sockel' || f === state.sockel || f === state.typ);
    });
    document.querySelectorAll('#typBox input[data-k]').forEach((el) => { el.value = state[el.dataset.k] != null ? state[el.dataset.k] : M.DEFAULTS[el.dataset.k]; });
    $('verbinder').checked = state.verbinder !== false;
    $('vBox').hidden = state.verbinder === false;
    document.querySelectorAll('#vBox input[data-k]').forEach((el) => { el.value = state[el.dataset.k] != null ? state[el.dataset.k] : M.DEFAULTS[el.dataset.k]; });
    $('nutBox').hidden = !state.back || state.backMode !== 'nut';
    $('backMode').disabled = !state.back;
    $('material').value = state.material;
    $('t').value = state.t;
    $('sheet').value = state.sheet;
    $('rotate').checked = !!state.rotate;
  }

  /* ---------- Türen je Spalte ---------- */
  const DOOR_OPTS = [['offen', 'offen'], ['dt-l', 'Drehtür, Band links'], ['dt-r', 'Drehtür, Band rechts'], ['dt-2', '2 Drehtüren'], ['st', 'Schiebetüren']];
  function renderDoorUI() {
    const per = (state.dividers || 0) + 1, nk = Math.max(1, state.korpusse || 1), n = per * nk;
    state.doors = (state.doors || []).slice(0, n);
    const box = $('doorsBox');
    if (box.children.length !== n || box.dataset.per !== String(per)) {
      box.dataset.per = per;
      box.innerHTML = '';
      for (let c = 0; c < n; c++) {
        const lb = document.createElement('label'); lb.className = 'row';
        lb.textContent = (nk > 1 ? 'K' + (Math.floor(c / per) + 1) + ' Spalte ' + (c % per + 1) : 'Spalte ' + (c + 1)) + ' ';
        const sel = document.createElement('select'); sel.id = 'door' + c;
        DOOR_OPTS.forEach(([v, t]) => sel.add(new Option(t, v)));
        sel.addEventListener('change', () => { state.doors[c] = sel.value; syncForm(); update(); });
        lb.appendChild(sel); box.appendChild(lb);
      }
    }
    for (let c = 0; c < n; c++) $('door' + c).value = state.doors[c] || 'offen';
    const any = state.doors.some((d) => d && d !== 'offen');
    $('frontBox').hidden = !any;
  }

  /* ---------- Berechnung ---------- */
  let model, plan;
  function update() {
    model = M.buildRegal(state);
    $('warnings').innerHTML = model.errors.map((e) => '<div class="e">⚠ ' + esc(e) + '</div>').join('');
    if (model.errors.length) { $('tab-list').innerHTML = $('tab-cut').innerHTML = $('tab-mat').innerHTML = $('tab-draw').innerHTML = ''; return; }
    plan = M.plan(model);
    $('warnings').innerHTML = model.warnings.map((w) => '<div class="w">💡 ' + esc(w) + '</div>').join('') +
      plan.errors.map((e) => '<div class="e">⚠ ' + esc(e) + '</div>').join('');
    $('dims').textContent = state.W + ' × ' + state.H + ' × ' + state.D + ' mm  ·  Fach ' +
      Math.round(model.derived.cw) + ' × ' + Math.round(model.derived.ch) + ' mm  ·  ' + model.parts.length + ' Teile';
    renderList(); renderCut(); renderMaterial(); renderDrawings();
    rebuild3D();
    saveState();
  }

  /* ---------- Tabs ---------- */
  function renderList() {
    const rows = model.cutlist.map((g) =>
      '<tr class="part" data-no="' + g.no + '"><td>' + g.no + '</td><td>' + esc(g.name) + '</td><td class="n">' + g.qty +
      '</td><td class="n">' + g.l + '</td><td class="n">' + g.w + '</td><td class="n">' + g.thick + '</td></tr>').join('');
    const m = M.MATERIALS[state.material];
    $('tab-list').innerHTML =
      '<table><thead><tr><th>Nr</th><th>Teil</th><th class="n">Stk</th><th class="n">Länge mm</th><th class="n">Breite mm</th><th class="n">Dicke mm</th></tr></thead><tbody>' +
      rows + '</tbody></table>' +
      '<p class="note">Material: ' + esc(m.name) + ' ' + state.t + ' mm' + (state.back ? ', Rückwand HDF ' + state.bt + ' mm' : '') +
      '. Länge = Maserungsrichtung. Zeile anklicken, um das Teil im 3D-Modell zu markieren.</p>';
    $('tab-list').querySelectorAll('tr.part').forEach((tr) => {
      tr.addEventListener('mouseenter', () => highlight(Number(tr.dataset.no)));
      tr.addEventListener('click', () => highlight(Number(tr.dataset.no)));
      tr.addEventListener('mouseleave', () => highlight(0));
    });
  }

  function renderCut() {
    let html = '<p class="note">Je 10 mm Besäumschnitt, ' +
      state.kerf + ' mm Sägeblatt. Zahlen = Nr aus der Stückliste.</p>';
    const nm = names();
    const names_ = { plate: nm.plate + ' ' + fmtT(state.t) + ' mm', back: nm.back, ap: 'Arbeitsplatte: ' + nm.ap, front: 'Fronten: ' + nm.front };
    const fills = { plate: M.MATERIALS[state.material].color, back: '#c9b99a', ap: apColor(), front: frontColor() };
    for (const key of Object.keys(plan.groups)) {
      const g = plan.groups[key];
      g.sheets.forEach((sh, i) => {
        const S = g.sheet;
        let svg = '<svg viewBox="0 0 ' + S.l + ' ' + S.w + '"><rect x="0" y="0" width="' + S.l + '" height="' + S.w + '" fill="none" stroke="#999" stroke-width="6"/>' +
          '<rect x="' + g.trim + '" y="' + g.trim + '" width="' + g.SL + '" height="' + g.SW + '" fill="none" stroke="#bbb" stroke-dasharray="20 14" stroke-width="3"/>';
        sh.items.forEach((it) => {
          const x = g.trim + it.x, y = g.trim + it.y;
          svg += '<rect x="' + x + '" y="' + y + '" width="' + it.l + '" height="' + it.w + '" fill="' +
            fills[key] + '" stroke="#555" stroke-width="4"/>' +
            '<text x="' + (x + it.l / 2) + '" y="' + (y + it.w / 2) + '" text-anchor="middle" dominant-baseline="middle" font-size="' +
            Math.max(40, Math.min(110, it.w * 0.45)) + '" fill="#222">' + it.no + (it.rot ? '↻' : '') + '</text>';
        });
        svg += '</svg>';
        html += '<div class="sheet"><h3>' + esc(names_[key]) + ' – Platte ' + (i + 1) + ' von ' + g.sheets.length + ', ' + S.l + ' × ' + S.w + ' mm' +
          ' (' + Math.round(sh.usage * 100) + ' % genutzt)</h3>' + svg + '</div>';
      });
    }
    $('tab-cut').innerHTML = html;
  }

  // Bezeichnungen für Material, Rückwand und Kante (für Tabellen und Zeichnungen)
  function names() {
    const plate = state.fe ? state.fe.nr + ' ' + state.fe.name : M.MATERIALS[state.material].name + ' (kein Frischeis-Artikel gewählt)';
    const back = state.backFe ? state.backFe.nr + ' ' + state.backFe.name : 'Rückwand ' + fmtT(state.bt) + ' mm (kein Frischeis-Artikel gewählt)';
    const kante = state.kanteFe ? state.kanteFe.nr + ' ' + state.kanteFe.name : ($('jKante').value.trim() || 'Kantenart A (noch nicht gewählt)');
    const ap = state.apFe ? state.apFe.nr + ' ' + state.apFe.name : plate + ' (wie Korpus)';
    const kanteB = state.apKanteFe ? state.apKanteFe.nr + ' ' + state.apKanteFe.name : (state.apFe ? 'Kantenart B (noch nicht gewählt)' : kante);
    const front = state.frontFe ? state.frontFe.nr + ' ' + state.frontFe.name : plate + ' (wie Korpus)';
    const kanteC = state.frontKanteFe ? state.frontKanteFe.nr + ' ' + state.frontKanteFe.name : (state.frontFe ? 'Kantenart C (noch nicht gewählt)' : kante);
    return { plate, back, kante, ap, kanteB, front, kanteC };
  }

  function renderMaterial() {
    const n = names();
    let rows = '';
    for (const [key, g] of Object.entries(plan.groups)) {
      const parts = model.cutlist.filter((c) => c.mat === key);
      const area = parts.reduce((s, c) => s + c.l * c.w * c.qty, 0) / 1e6;
      const label = { plate: n.plate, back: n.back, ap: 'Arbeitsplatte: ' + n.ap, front: 'Fronten: ' + n.front }[key];
      const obj = { plate: state.fe, back: state.backFe, ap: state.apFe || state.fe, front: state.frontFe || state.fe }[key];
      rows += '<tr><td>' + esc(label) + ' ' + shopLink(obj) + '</td><td class="n">' + fmtT(g.thick) + ' mm</td><td class="n">' + g.sheet.l + ' × ' + g.sheet.w +
        '</td><td class="n">' + g.sheets.length + '</td><td class="n">' + area.toFixed(2).replace('.', ',') + ' m²</td></tr>';
    }
    $('tab-mat').innerHTML =
      '<table><thead><tr><th>Platte</th><th class="n">Stärke</th><th class="n">Rohformat</th><th class="n">Platten lt. Zuschnittplan</th><th class="n">Fläche der Teile</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      edgeTable(n) +
      hardwareTable() +
      '<p class="note">Bekantete Länge = Summe der Kanten laut Zeichnungen, ohne Zuschlag. Stückzahlen der Beschläge = Anzahl der Verbindungen laut Bohrbild, ohne Reserve. Preise siehst du in WebCut bzw. beim Beschlaghändler.</p>';
  }

  // Kantenlänge je Kantenart aus den Teilen (gleiche Regel wie Zeichnung)
  function edgeTable(n) {
    const len = {};
    model.parts.forEach((pt) => pt.edges.forEach((e) => { len[pt.edgeKind] = (len[pt.edgeKind] || 0) + (e[0] === 'W' ? pt.cut[0] : pt.cut[1]); }));
    const kn = { A: n.kante, B: n.kanteB, C: n.kanteC }, ko = { A: state.kanteFe, B: state.apKanteFe, C: state.frontKanteFe };
    const rows = Object.entries(len).sort().map(([k, mm]) => '<tr><td>Kantenart ' + k + ': ' + esc(kn[k]) + ' ' +
      shopLink(ko[k]) + '</td><td class="n">' + (mm / 1000).toFixed(2).replace('.', ',') + ' m</td></tr>').join('');
    return '<table style="margin-top:12px"><thead><tr><th>Kante</th><th class="n">Bekantete Länge</th></tr></thead><tbody>' + rows + '</tbody></table>';
  }

  function hardwareTable() {
    const holes = model.holes || [];
    const konf = holes.filter((h) => h.kind === 'face' && h.type === 'Konfirmat').length;
    const dueb = holes.filter((h) => h.kind === 'face' && h.type === 'Dübel').length;
    const feet = (model.feet || []).length, FT = M.FEET[state.fussTyp] || M.FEET.hettich, set = FT.set;
    const spax = holes.filter((h) => h.type === 'Spax-Durchgang').length;
    const hv = (model.hinges || []).filter((x) => x.art === 'vorliegend').length, hm = (model.hinges || []).length - hv;
    const st = model.parts.filter((pt) => pt.name === 'Schiebetür');
    const stCols = (model.profiles || []).length / 2;
    const stStops = (model.profiles || []).filter((_, i) => i % 2 === 0).reduce((s, pr) => {
      const door = st.find((d) => Math.abs(d.pos[0] - d.size[0] / 2 - pr.x0 - state.stSeite) < 1); return s + (door && door.size[1] > 1000 ? 2 : 1);
    }, 0);
    const profLen = (model.profiles || []).filter((_, i) => i % 2 === 0).map((pr) => pr.len);
    if (!konf && !dueb && !feet && !spax && !hv && !hm && !st.length) return '';
    return '<table style="margin-top:12px"><thead><tr><th>Beschlag</th><th>Bezugsquelle</th><th class="n">Stück</th></tr></thead><tbody>' +
      (konf ? '<tr><td>Konfirmat 7 × 50</td><td>frei, z. B. Amazon – Kernloch/Senkung laut Hersteller mit Bohrbild abgleichen</td><td class="n">' + konf + '</td></tr>' : '') +
      (dueb ? '<tr><td>Rillendübel Buche 8 × 30</td><td>Frischeis 69010/0008 oder gleichwertig, z. B. Amazon</td><td class="n">' + dueb + '</td></tr>' : '') +
      (hv ? '<tr><td>Hettich Sensys Topfscharnier Ø35, vorliegend</td><td>Hettich</td><td class="n">' + hv + '</td></tr>' : '') +
      (hm ? '<tr><td>Hettich Sensys Topfscharnier Ø35, Mittelwandanschlag</td><td>Hettich (z. B. DIY-Shop 9246679)</td><td class="n">' + hm + '</td></tr>' : '') +
      (hv + hm ? '<tr><td>Hettich Kreuzmontageplatte 37 × 32, Euroschrauben Ø5 × 12, Distanz 0</td><td>Hettich</td><td class="n">' + (hv + hm) + '</td></tr>' : '') +
      (st.length ? '<tr><td>Hettich SlideLine M einliegend, Beschlagset je Tür</td><td>Hettich</td><td class="n">' + st.length + '</td></tr>' +
        '<tr><td>SlideLine M 2-bahniges Laufprofil (oben + unten), Zuschnitt ' + profLen.join(', ') + ' mm</td><td>Hettich, z. B. 9 227 183 (2500 mm)</td><td class="n">' + stCols * 2 + '</td></tr>' +
        '<tr><td>SlideLine M Türanschlag/Abstandhalter (1 bis 1000 mm Türhöhe, sonst 2)</td><td>Hettich 9 115 216</td><td class="n">' + stStops + '</td></tr>' : '') +
      (spax ? '<tr><td>Spax ' + state.spaxD + ' × ' + state.spaxL + ' (Arbeitsplatte von innen)</td><td>frei</td><td class="n">' + spax + '</td></tr>' : '') +
      (feet ? '<tr><td>' + esc(FT.name) + '</td><td>' + esc(FT.bezug) + '</td><td class="n">' + Math.ceil(feet / set) + ' Pack (' + feet + ' Füße)</td></tr>' : '') +
      '</tbody></table>';
  }

  /* ---------- Zeichnungen ---------- */
  let drawings = [];
  function drawingInfo() {
    const n = names();
    return { material: n.plate, kante: n.kante, projekt: ($('jObjekt') && $('jObjekt').value.trim()) || ('Regal ' + state.W + ' × ' + state.H + ' × ' + state.D) };
  }
  const drawInfo = (d, info, n) => Object.assign({}, info, {
    material: d.mat === 'back' ? n.back : d.mat === 'ap' ? n.ap : d.mat === 'front' ? n.front : n.plate,
    kante: d.edgeKind === 'B' ? n.kanteB : d.edgeKind === 'C' ? n.kanteC : n.kante
  });
  function renderDrawings() {
    drawings = window.Zeichnung.analyze(model);
    const info = drawingInfo(), n = names();
    $('tab-draw').innerHTML = '<div class="drawbar"><button type="button" id="btnDraw">Alle Zeichnungen als ZIP (SVG)</button><span class="note" id="drawMsg">' +
      drawings.length + ' Zeichnungen. Rote Linie = Kante, blau = anschließendes Teil.</span></div>' +
      drawings.map((d) => '<figure class="drawing">' + window.Zeichnung.svg(d, drawInfo(d, info, n)) + '</figure>').join('');
    $('btnDraw').addEventListener('click', exportDrawings);
  }
  async function exportDrawings() {
    const msg = $('drawMsg');
    if (!window.JSZip) { msg.textContent = 'JSZip konnte nicht geladen werden (Internetverbindung?).'; return; }
    const info = drawingInfo(), n = names();
    const zip = new window.JSZip();
    const safe = (s) => s.replace(/[^A-Za-z0-9ÄÖÜäöüß_-]+/g, '-');
    const csv = ['Pos;Teil;Seite;Typ;x;y;Durchmesser;Tiefe;Hinweis'];
    drawings.forEach((d) => {
      zip.file('Pos' + String(d.no).padStart(2, '0') + d.sub + '-' + safe(d.name) + '.svg', window.Zeichnung.svg(d, drawInfo(d, info, n)));
      window.Zeichnung.holeRows(d).forEach((r) => csv.push([d.no + d.sub, d.name].concat(r).join(';')));
    });
    zip.file('Bohrliste.csv', '\ufeff' + csv.join('\r\n'));
    const data = await zip.generateAsync({ type: 'uint8array' });
    const filename = 'Zeichnungen-Regal-' + state.W + 'x' + state.H + 'x' + state.D + '.zip';
    try {
      let dl = null;
      try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) await dl.save({ filename, data });
      else {
        const el = document.createElement('a');
        el.href = URL.createObjectURL(new Blob([data], { type: 'application/zip' })); el.download = filename; el.click();
      }
      msg.textContent = 'Gespeichert: ' + filename;
    } catch (e) { msg.textContent = e && e.code === 'declined' ? 'Speichern abgebrochen.' : 'Fehler: ' + (e && e.message || e); }
  }

  /* ---------- Frischeis-Dekorkatalog ---------- */
  const shopLink = (a, txt) => (a && a.url && /^https:\/\/www\.frischeis\.at\//.test(a.url)
    ? '<a class="shop" href="' + esc(a.url) + '" target="_blank" rel="noopener">' + (txt || 'im Shop ansehen') + ' ↗</a>' : '');
  const KAT_NAMES = {
    'beschichtete-platte': 'Beschichtete Platte', 'dekorative-platte-mdf-hdf-hartfaser': 'Dekor MDF/HDF/Hartfaser',
    'durchgefarbte-platte': 'Durchgefärbte Platte', 'grundierplatte': 'Grundierplatte', 'mobelfront': 'Möbelfront', 'prageplatte': 'Prägeplatte', 'sonstige': 'Sonstige', 'vollkernplatte': 'Vollkernplatte', 'werkstoffverbundplatte': 'Werkstoffverbundplatte'
  };
  const COLOR_HINTS = [
    [/weiß|weiss|white|w ?1000|w ?980|w ?1100|w ?1200|polar|alpinweiß/i, '#f1f1ec'], [/schwarz|black|u ?999|nero/i, '#2a2a2a'],
    [/anthrazit|u ?961|u ?963|graphit|graphite/i, '#4b4e53'], [/grau|grey|gray|u ?7\d\d|silber|aluminium/i, '#9b9a96'],
    [/nuss|walnut|noce/i, '#6e4a32'], [/eiche|oak|rovere|h ?3\d\d\d|h ?1\d\d\d/i, '#c29a63'], [/buche|beech/i, '#d4a77a'],
    [/ahorn|maple/i, '#e5cfa5'], [/esche|ash/i, '#d9c4a0'], [/kirsch|cherry/i, '#a0583a'], [/beton|stein|marmor|stone|concrete|schiefer/i, '#b7b4ad'],
    [/beige|sand|kaschmir|cashmere|creme|cream/i, '#d8ccb6'], [/blau|blue/i, '#4a6a8f'], [/grün|green|olive|salbei/i, '#6f8a64'],
    [/rot|red|bordeaux/i, '#a33a32'], [/gelb|yellow|ocker/i, '#d1a84a'], [/roh|grundier|mdf/i, '#e4dfd4']
  ];
  const guessColor = (name) => { for (const [re, c] of COLOR_HINTS) if (re.test(name)) return c; return '#d9c9a8'; };
  let catalog = [];
  const fmtT = (t) => String(t).replace('.', ',');

  function restoreFe() {
    if (!state.fe) { if (state.sheet === 'fe' || state.material === 'fe') { state.sheet = '2800x2070'; state.material = 'melamin'; } return; }
    const a = state.fe;
    M.SHEETS.fe = { l: a.l, w: a.w, name: a.l + ' × ' + a.w + ' (Frischeis)' };
    M.MATERIALS.fe = { name: a.nr + ' ' + a.name, color: guessColor(a.name) };
    if (!$('material').querySelector('option[value="fe"]')) $('material').add(new Option('Frischeis-Dekor', 'fe'));
    $('material').querySelector('option[value="fe"]').textContent = a.nr + ' ' + a.name;
    if (!$('sheet').querySelector('option[value="fe"]')) $('sheet').add(new Option('', 'fe'));
    $('sheet').querySelector('option[value="fe"]').textContent = M.SHEETS.fe.name;
    ensureThick(state.t);
  }
  function ensureThick(t) {
    const sel = $('t');
    if (![...sel.options].some((o) => Number(o.value) === Number(t))) {
      const o = new Option(fmtT(t), t); sel.add(o);
      [...sel.options].sort((x, y) => x.value - y.value).forEach((x) => sel.appendChild(x));
    }
  }

  function applyDekor(a) {
    state.fe = { nr: a.nr, name: a.name, l: a.l, w: a.w, t: a.t, kat: a.kat, url: a.url };
    state.t = a.t; state.sheet = 'fe'; state.material = 'fe';
    restoreFe();
    $('jMat').value = a.nr + ' ' + a.name;
    $('jMat').dispatchEvent(new Event('change'));
    syncForm(); update(); renderDekor();
    const code = decorCode(a.name);
    if (code && kanten.items.length) { $('kSearch').value = code; kanten.render(); }
  }

  function renderDekor() {
    const q = $('dSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const kat = $('dKat').value, onlyT = $('dThick').checked;
    const hits = [];
    for (const a of catalog) {
      if (kat && a.kat !== kat) continue;
      if (onlyT && Math.abs(a.t - state.t) > 0.5) continue;
      const hay = (a.nr + ' ' + a.name).toLowerCase();
      if (q.every((w) => hay.includes(w))) hits.push(a);
    }
    // passende Stärke zuerst
    hits.sort((x, y) => Math.abs(x.t - state.t) - Math.abs(y.t - state.t) || x.name.localeCompare(y.name, 'de'));
    const more = hits.length > 60; hits.length = Math.min(hits.length, 60);
    const cur = state.fe && state.fe.nr;
    $('dList').innerHTML = (q.length || kat || onlyT) ? hits.map((a, i) =>
      '<div class="hit"><button type="button" role="option" data-i="' + catalog.indexOf(a) + '"' + (a.nr === cur ? ' class="on" aria-selected="true"' : '') + '>' +
      '<span class="sw" style="background:' + guessColor(a.name) + '"></span><span>' + esc(a.name) + '</span>' +
      '<small>' + esc(a.nr) + ' · ' + fmtT(a.t) + ' mm · ' + a.l + '×' + a.w + '</small></button>' + shopLink(a, 'Shop') + '</div>').join('') : '';
    const total = catalog.length;
    $('dInfo').textContent = !total ? 'Katalog nicht verfügbar.' :
      (q.length || kat || onlyT ? (more ? '60 von mehr Treffern, Suche verfeinern.' : hits.length + ' Treffer.') : total + ' dekorative Platten von frischeis.at (Stand ' + catalogDate + '). Ohne Preise, die siehst du in WebCut.') +
      (state.fe ? ' Gewählt: ' + state.fe.nr + '.' : '') + ' Farbe in 3D ist geschätzt.';
    if (state.fe && state.fe.url) $('dInfo').insertAdjacentHTML('beforeend', ' ' + shopLink(state.fe));
  }
  let catalogDate = '';
  async function initDekor() {
    try {
      let data = window.__FE_DEKOR;
      if (!data) { const r = await fetch('frischeis-dekor.json'); data = await r.json(); }
      catalogDate = data.abgerufen;
      catalog = data.artikel.map((r) => ({ nr: r[0], name: r[1], l: r[2], w: r[3], t: r[4], kat: data.kategorien[r[5]], url: r[6] ? data.url_basis + r[6] : '' }));
      const kats = [...new Set(catalog.map((a) => a.kat))].sort();
      kats.forEach((k) => $('dKat').add(new Option((KAT_NAMES[k] || k) + ' (' + catalog.filter((a) => a.kat === k).length + ')', k)));
    } catch (e) { catalog = []; }
    $('dSearch').addEventListener('input', renderDekor);
    $('dKat').addEventListener('change', renderDekor);
    $('dThick').addEventListener('change', renderDekor);
    $('dList').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) applyDekor(catalog[Number(b.dataset.i)]); });
    renderDekor();
  }

  /* ---------- Kanten und Rückwände aus dem Frischeis-Katalog ---------- */
  const decorCode = (name) => { const m = /\b([A-Z]{1,2}\d{3,5})\b/.exec(name || ''); return m ? m[1] : ''; };
  const unpack = (data) => data.artikel.map((r) => ({ nr: r[0], name: r[1], l: r[2], w: r[3], t: r[4], kat: data.kategorien[r[5]], url: r[6] ? data.url_basis + r[6] : '' }));
  async function loadJson(globalName, file) {
    if (window[globalName]) return window[globalName];
    const r = await fetch(file); if (!r.ok) throw new Error(file); return r.json();
  }

  // Kleine Such-Liste: tippen, filtern, sortieren, anklicken
  function makePicker(o) {
    const p = { items: [] };
    p.render = () => {
      const q = $(o.search).value.trim().toLowerCase().split(/\s+/).filter(Boolean);
      if (!p.items.length) { $(o.info).textContent = o.missing; $(o.list).innerHTML = ''; return; }
      const hits = p.items.filter((a) => o.accept(a) && q.every((w) => (a.nr + ' ' + a.name).toLowerCase().includes(w)));
      hits.sort((x, y) => o.rank(x) - o.rank(y) || x.name.localeCompare(y.name, 'de'));
      const shown = q.length ? hits.slice(0, 40) : [];
      const cur = o.current();
      $(o.list).innerHTML = shown.map((a) => '<div class="hit"><button type="button" role="option" data-nr="' + esc(a.nr) + '"' + (a.nr === cur ? ' class="on" aria-selected="true"' : '') + '>' +
        '<span class="sw" style="background:' + guessColor(a.name) + '"></span><span>' + esc(a.name) + '</span><small>' + esc(a.nr) + ' · ' + o.detail(a) + '</small></button>' + shopLink(a, 'Shop') + '</div>').join('');
      $(o.info).textContent = (q.length ? (hits.length > 40 ? '40 von ' + hits.length + ' Treffern.' : hits.length + ' Treffer.') : o.hint(p.items.length)) +
        (cur ? ' Gewählt: ' + cur + '.' : '');
      const sel = o.currentObj && o.currentObj();
      if (sel && sel.url) $(o.info).insertAdjacentHTML('beforeend', ' ' + shopLink(sel));
    };
    $(o.search).addEventListener('input', p.render);
    $(o.list).addEventListener('click', (e) => {
      const b = e.target.closest('button[data-nr]'); if (!b) return;
      const a = p.items.find((x) => x.nr === b.dataset.nr); if (a) { o.pick(a); p.render(); }
    });
    return p;
  }

  const kanten = makePicker({
    search: 'kSearch', list: 'kList', info: 'kInfo', missing: 'Kantenkatalog nicht verfügbar.',
    accept: (a) => a.w >= state.t + 1,               // Kante muss höher als die Platte sein
    rank: (a) => Math.abs(a.w - (state.t + 4)) * 10 + a.t, // Standard: ca. 4 mm Überstand, dünne Kante zuerst
    detail: (a) => fmtT(a.w) + ' × ' + fmtT(a.t) + ' mm, Rolle ' + Math.round(a.l / 1000) + ' m',
    hint: (n) => n + ' Kanten von frischeis.at. Nach Dekor-Code oder Name suchen; nur Kanten, die höher als die Platte sind.',
    current: () => state.kanteFe && state.kanteFe.nr, currentObj: () => state.kanteFe,
    pick: (a) => {
      state.kanteFe = { nr: a.nr, name: a.name, w: a.w, t: a.t, url: a.url };
      $('jKante').value = a.nr + ' ' + a.name; $('jKante').dispatchEvent(new Event('change')); saveState();
    }
  });

  const rueck = makePicker({
    search: 'bSearch', list: 'bList', info: 'bInfo', missing: 'Rückwandkatalog nicht verfügbar.',
    accept: () => true,
    rank: (a) => Math.abs(a.t - 3) * 10,
    detail: (a) => fmtT(a.t) + ' mm · ' + a.l + '×' + a.w,
    hint: (n) => n + ' dünne Platten bis 8 mm (MDF/HDF roh und dekorativ).',
    current: () => state.backFe && state.backFe.nr, currentObj: () => state.backFe,
    pick: (a) => {
      state.backFe = { nr: a.nr, name: a.name, l: a.l, w: a.w, t: a.t, url: a.url };
      state.backSheet = { l: a.l, w: a.w, name: a.l + ' × ' + a.w };
      state.back = true; state.bt = a.t; ensureBackOption(a.t);
      $('jBack').value = a.nr + ' ' + a.name; $('jBack').dispatchEvent(new Event('change'));
      syncForm(); update();
    }
  });
  const apPick = makePicker({
    search: 'aSearch', list: 'aList', info: 'aInfo', missing: 'Dekorkatalog nicht verfügbar.',
    accept: () => true,
    rank: (a) => (a.ap ? 0 : 100000) + Math.abs(a.t - 38) * 10,  // Frischeis-Arbeitsplatten zuerst
    detail: (a) => (a.ap ? 'Arbeitsplatte · ' : 'Dekorplatte · ') + fmtT(a.t) + ' mm · ' + a.l + '×' + a.w,
    hint: (n) => n + ' Platten: Frischeis-Arbeitsplatten (38/20 mm) zuerst, dann Dekorplatten. Ohne Auswahl wie der Korpus.',
    current: () => state.apFe && state.apFe.nr, currentObj: () => state.apFe,
    pick: (a) => {
      state.apFe = { nr: a.nr, name: a.name, l: a.l, w: a.w, t: a.t, url: a.url };
      state.apT = a.t; state.apSheet = { l: a.l, w: a.w, name: a.l + ' × ' + a.w };
      const code = decorCode(a.name);
      if (code) { $('akSearch').value = code; }
      syncForm(); update(); apKante.render();
    }
  });
  const apKante = makePicker({
    search: 'akSearch', list: 'akList', info: 'akInfo', missing: 'Kantenkatalog nicht verfügbar.',
    accept: (a) => a.w >= (state.apT || state.t) + 1,
    rank: (a) => Math.abs(a.w - ((state.apT || state.t) + 4)) * 10 + a.t,
    detail: (a) => fmtT(a.w) + ' × ' + fmtT(a.t) + ' mm, Rolle ' + Math.round(a.l / 1000) + ' m',
    hint: () => 'Kante für die Arbeitsplatte (Kantenart B im JAF-Formular).',
    current: () => state.apKanteFe && state.apKanteFe.nr, currentObj: () => state.apKanteFe,
    pick: (a) => { state.apKanteFe = { nr: a.nr, name: a.name, w: a.w, t: a.t, url: a.url }; update(); }
  });
  const frontPick = makePicker({
    search: 'frSearch', list: 'frList', info: 'frInfo', missing: 'Dekorkatalog nicht verfügbar.',
    accept: () => true,
    rank: (a) => Math.abs(a.t - (state.frontT || state.t)) * 10,
    detail: (a) => fmtT(a.t) + ' mm · ' + a.l + '×' + a.w,
    hint: () => 'Eigenes Dekor für die Fronten; ohne Auswahl wie der Korpus.',
    current: () => state.frontFe && state.frontFe.nr, currentObj: () => state.frontFe,
    pick: (a) => {
      state.frontFe = { nr: a.nr, name: a.name, l: a.l, w: a.w, t: a.t, url: a.url };
      state.frontT = a.t; state.frontSheet = { l: a.l, w: a.w, name: a.l + ' × ' + a.w };
      const code = decorCode(a.name);
      if (code) $('frkSearch').value = code;
      syncForm(); update(); frontKante.render();
    }
  });
  const frontKante = makePicker({
    search: 'frkSearch', list: 'frkList', info: 'frkInfo', missing: 'Kantenkatalog nicht verfügbar.',
    accept: (a) => a.w >= (state.frontT || state.t) + 1,
    rank: (a) => Math.abs(a.w - ((state.frontT || state.t) + 4)) * 10 + a.t,
    detail: (a) => fmtT(a.w) + ' × ' + fmtT(a.t) + ' mm, Rolle ' + Math.round(a.l / 1000) + ' m',
    hint: () => 'Kante für die Fronten (Kantenart C im JAF-Formular).',
    current: () => state.frontKanteFe && state.frontKanteFe.nr, currentObj: () => state.frontKanteFe,
    pick: (a) => { state.frontKanteFe = { nr: a.nr, name: a.name, w: a.w, t: a.t, url: a.url }; update(); }
  });
  function ensureBackOption(t) {
    const sel = $('back');
    if (![...sel.options].some((o) => Number(o.value) === Number(t))) sel.add(new Option('Frischeis ' + fmtT(t) + ' mm', t), sel.options[sel.options.length - 1]);
  }

  async function initKantenRueck() {
    if (state.backFe) ensureBackOption(state.backFe.t);
    syncForm();
    try { kanten.items = unpack(await loadJson('__FE_KANTEN', 'frischeis-kanten.json')); } catch (e) { kanten.items = []; }
    try {
      const thin = catalog.filter((a) => a.t <= 8.1);
      const roh = unpack(await loadJson('__FE_RUECK', 'frischeis-rueckwand.json'));
      const have = new Set(roh.map((x) => x.nr));
      rueck.items = roh.concat(thin.filter((x) => !have.has(x.nr)));
    } catch (e) { rueck.items = catalog.filter((a) => a.t <= 8.1); }
    try { apPick.items = unpack(await loadJson('__FE_AP', 'frischeis-arbeitsplatte.json')).map((x) => Object.assign(x, { ap: true })).concat(catalog); }
    catch (e) { apPick.items = catalog; }
    apKante.items = kanten.items; frontPick.items = catalog; frontKante.items = kanten.items;
    kanten.render(); rueck.render(); apPick.render(); apKante.render(); frontPick.render(); frontKante.render();
  }

  /* ---------- JAF/Frischeis-Formular ---------- */
  const JAF_FIELDS = ['jMat', 'jBack', 'jKante', 'jObjekt', 'jFirma', 'jKunde'];
  function initJaf() {
    (window.FrischeisArtikel || []).forEach((a) => {
      const o = document.createElement('option');
      o.value = a.nr + ' ' + a.name; o.label = a.l + '×' + a.w + ', ' + a.dicken;
      $('jArt').appendChild(o);
    });
    try { const s = JSON.parse(localStorage.getItem('moebel-jaf') || '{}'); JAF_FIELDS.forEach((k) => { if (s[k]) $(k).value = s[k]; }); } catch (e) { /* ignorieren */ }
    JAF_FIELDS.forEach((k) => $(k).addEventListener('change', () => {
      try { const s = {}; JAF_FIELDS.forEach((f) => (s[f] = $(f).value)); localStorage.setItem('moebel-jaf', JSON.stringify(s)); } catch (e) { /* ignorieren */ }
    }));
    $('btnJaf').addEventListener('click', exportJaf);
  }
  async function loadTemplate() {
    if (window.__JAF_TEMPLATE_B64) {
      const bin = atob(window.__JAF_TEMPLATE_B64); const u = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
      return u.buffer;
    }
    const r = await fetch('vorlagen/JAF_AT_Zuschnitt_Formular_v43.xlsx');
    if (!r.ok) throw new Error('Vorlage nicht gefunden');
    return r.arrayBuffer();
  }
  async function exportJaf() {
    const msg = $('jafMsg');
    const set = (t) => { msg.textContent = t; };
    if (!model || model.errors.length) { set('Bitte zuerst die Maße korrigieren.'); return; }
    if (!window.JSZip) { set('JSZip konnte nicht geladen werden (Internetverbindung?).'); return; }
    if (!$('jMat').value.trim()) { set('Bitte Art.-Nr./Bezeichnung der Platte eintragen.'); $('jMat').focus(); return; }
    try {
      const data = await window.JAF.fill(await loadTemplate(), model, {
        material: $('jMat').value.trim(), backMaterial: $('jBack').value.trim(), kante: $('jKante').value.trim(),
        apMaterial: state.apFe ? state.apFe.nr + ' ' + state.apFe.name : $('jMat').value.trim(),
        kanteB: state.apKanteFe ? state.apKanteFe.nr + ' ' + state.apKanteFe.name : (state.apFe ? '' : $('jKante').value.trim()),
        frontMaterial: state.frontFe ? state.frontFe.nr + ' ' + state.frontFe.name : $('jMat').value.trim(),
        kanteC: state.frontKanteFe ? state.frontKanteFe.nr + ' ' + state.frontKanteFe.name : (state.frontFe ? '' : $('jKante').value.trim()),
        objekt: $('jObjekt').value.trim() || ('Regal ' + state.W + 'x' + state.H + 'x' + state.D), firma: $('jFirma').value.trim(),
        kundenNr: $('jKunde').value.trim(), rotate: state.rotate
      });
      const filename = 'JAF-Zuschnitt-Regal-' + state.W + 'x' + state.H + 'x' + state.D + '.xlsx';
      let dl = null;
      try { dl = window.claude && window.claude.use ? await window.claude.use('downloads') : null; } catch (e) { dl = null; }
      if (dl) { await dl.save({ filename, data }); }
      else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
        a.download = filename; a.click();
      }
      set('Formular erstellt: ' + filename + '. Bitte vor dem Senden in Excel prüfen (Material, Kanten).');
    } catch (e) {
      set(e && e.code === 'declined' ? 'Speichern abgebrochen.' : 'Fehler: ' + (e && e.message || e));
    }
  }

  /* ---------- Export ---------- */
  function exportCsv() {
    const lines = ['Nr;Teil;Stück;Länge mm;Breite mm;Dicke mm'];
    model.cutlist.forEach((g) => lines.push([g.no, g.name, g.qty, g.l, g.w, g.thick].join(';')));
    const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'regal-stueckliste.csv'; a.click();
  }

  /* ---------- 3D ---------- */
  let renderer, scene, camera, group, personMesh, floor;
  const meshes = [];
  const cam = { theta: 0.7, phi: 1.2, r: 3.5, target: new THREE.Vector3(0, 1, 0) };

  function init3D() {
    const host = $('view');
    try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false }); }
    catch (e) { host.innerHTML = '<p style="padding:16px">3D-Ansicht benötigt WebGL.</p>'; return; }
    renderer.shadowMap.enabled = true;
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    host.appendChild(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(35, 1, 0.05, 50);
    scene.add(new THREE.HemisphereLight(0xffffff, 0x8a8478, 0.85));
    const sun = new THREE.DirectionalLight(0xffffff, 0.9);
    sun.position.set(2.5, 4, 3); sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 0.5, far: 15 });
    scene.add(sun);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), new THREE.MeshStandardMaterial({ color: 0xcfc8b8, roughness: 1 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    const grid = new THREE.GridHelper(12, 24, 0xaaa392, 0xbdb6a5); grid.position.y = 0.001; scene.add(grid);
    group = new THREE.Group(); scene.add(group);
    personMesh = buildPerson(); scene.add(personMesh);

    // Steuerung: Ziehen = drehen, Rad/Pinch = zoomen
    const el = renderer.domElement;
    const ptrs = new Map(); let pinch = 0;
    el.addEventListener('pointerdown', (e) => { el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY }); });
    el.addEventListener('pointerup', (e) => ptrs.delete(e.pointerId));
    el.addEventListener('pointercancel', (e) => ptrs.delete(e.pointerId));
    el.addEventListener('pointermove', (e) => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 1) {
        cam.theta -= (e.clientX - p.x) * 0.008;
        cam.phi = Math.max(0.15, Math.min(1.5, cam.phi - (e.clientY - p.y) * 0.008));
      }
      p.x = e.clientX; p.y = e.clientY;
      if (ptrs.size === 2) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (pinch) cam.r = Math.max(0.8, Math.min(12, cam.r * (pinch / d)));
        pinch = d;
      } else pinch = 0;
      render();
    });
    el.addEventListener('wheel', (e) => { e.preventDefault(); cam.r = Math.max(0.8, Math.min(12, cam.r * (1 + e.deltaY * 0.001))); render(); }, { passive: false });
    new ResizeObserver(resize).observe(host);
    resize();
  }

  function buildPerson() {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0x6d7f93, roughness: 0.8, transparent: true, opacity: 0.55 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.17, 1.4, 16), mat); body.position.y = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), mat); head.position.y = 1.62;
    g.add(body, head); return g;
  }

  function resize() {
    const host = $('view'); if (!renderer) return;
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); render();
  }

  function render() {
    if (!renderer) return;
    const { theta, phi, r, target } = cam;
    camera.position.set(target.x + r * Math.sin(phi) * Math.sin(theta), target.y + r * Math.cos(phi), target.z + r * Math.sin(phi) * Math.cos(theta));
    camera.lookAt(target);
    renderer.setClearColor(getComputedStyle(document.body).backgroundColor || '#f4f1ea');
    renderer.render(scene, camera);
  }

  function rebuild3D() {
    if (!renderer) return;
    meshes.length = 0;
    while (group.children.length) {
      const c = group.children.pop();
      c.traverse((o) => {
        if (o.geometry) o.geometry.dispose();
        if (o.material && o !== c.userData.feat) (Array.isArray(o.material) ? o.material : [o.material]).forEach((mt) => { if (mt.map) mt.map.dispose(); if (!Object.values(FEAT_MAT).includes(mt)) mt.dispose(); });
      });
    }
    const k = 0.001;
    const mat = M.MATERIALS[state.material];
    const wood = isWood();
    const apWood = state.apFe ? WOOD_RE.test(state.apFe.name) : wood;
    model.parts.forEach((pt) => {
      const isAp = pt.mat === 'ap', isFront = pt.mat === 'front';
      const color = pt.back ? '#b8a98a' : isAp ? apColor() : isFront ? frontColor() : mat.color;
      const w = isAp ? apWood : isFront ? (state.frontFe ? WOOD_RE.test(state.frontFe.name) : wood) : wood;
      const m = (w && !pt.back) ? woodMaterials(pt, color) : new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.75 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(pt.size[0] * k, pt.size[1] * k, pt.size[2] * k), m);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { pt, base: pt.pos.map((v) => v * k) };
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x5a5448 }));
      mesh.add(edges);
      const feat = buildFeatures(pt, k);
      feat.visible = $('feat').checked; mesh.add(feat); mesh.userData.feat = feat;
      if (isFront) mesh.visible = $('showDoors').checked;
      group.add(mesh); meshes.push(mesh);
    });
    // Schiebetür-Laufprofile (Aluminium)
    const profMat = new THREE.MeshStandardMaterial({ color: 0xb9bcc0, roughness: 0.4, metalness: 0.6 });
    (model.profiles || []).forEach((pr) => {
      const b = new THREE.Mesh(new THREE.BoxGeometry((pr.x1 - pr.x0) * k, (pr.y1 - pr.y0) * k, (pr.z1 - pr.z0) * k), profMat);
      b.position.set((pr.x0 + pr.x1) / 2 * k, (pr.y0 + pr.y1) / 2 * k, (pr.z0 + pr.z1) / 2 * k); group.add(b);
    });
    // Füße (stehen am Fußboden, bewegen sich beim Explodieren nicht)
    const footMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 });
    (model.feet || []).forEach((f) => {
      const c = new THREE.Mesh(new THREE.CylinderGeometry(f.d / 2 * k, f.d / 2 * k, f.h * k, 20), footMat);
      c.position.set(f.x * k, f.h * k / 2, f.z * k); c.castShadow = true;
      group.add(c);
      // Grundplatte und Kopf nur, wenn das Produkt Maße dafür nennt (Höhe der Scheiben nur zur Darstellung)
      [[f.platte, 3], [f.kopf, f.h - 6]].forEach(([dd, y]) => {
        if (!dd) return;
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(dd / 2 * k, dd / 2 * k, 6 * k, 24), footMat);
        disc.position.set(f.x * k, y * k, f.z * k); group.add(disc);
      });
    });
    const topY = Math.max(...model.parts.map((pt) => pt.pos[1] + pt.size[1] / 2));
    cam.target.set(0, topY * k / 2, 0);
    cam.r = Math.max(2.2, Math.hypot(state.W, state.H) * k * 1.9);
    personMesh.position.set(state.W * k / 2 + 0.6, 0, state.D * k / 2 - 0.1);
    personMesh.visible = $('person').checked;
    applyExplode();
  }

  /* ---------- Holzmaserung (erzeugt, nicht fotografisch) ---------- */
  const WOOD_RE = /eiche|nuss|buche|ahorn|esche|kirsch|holz|oak|walnut|wood|teak|lärche|kiefer|fichte|ulme|akazie|zeder|birke|pinie|olive|cherry|beech|maple|chestnut|kastanie|\bH ?\d{4}\b/i;
  function frontColor() { return state.frontFe ? guessColor(state.frontFe.name) : M.MATERIALS[state.material].color; }
  function apColor() { return state.apFe ? guessColor(state.apFe.name) : M.MATERIALS[state.material].color; }
  function isWood() {
    if (state.material === 'fe' && state.fe) return WOOD_RE.test(state.fe.name);
    return state.material === 'eiche' || state.material === 'multiplex';
  }
  const woodCache = {};
  function woodCanvas(color) {
    if (woodCache[color]) return woodCache[color];
    const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
    const g = c.getContext('2d'), base = new THREE.Color(color);
    g.fillStyle = color; g.fillRect(0, 0, S, S);
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    // Jahresringe: lange, leicht gewellte Linien entlang der Maserrichtung (u = waagrecht)
    for (let i = 0; i < 90; i++) {
      const y = rnd() * S, amp = 1 + rnd() * 3, freq = 0.5 + rnd() * 1.5, phase = rnd() * 6.28;
      const dark = rnd() < 0.65, f = dark ? 0.78 + rnd() * 0.12 : 1.06 + rnd() * 0.08;
      const col = base.clone().multiplyScalar(f);
      g.strokeStyle = 'rgba(' + Math.round(Math.min(1, col.r) * 255) + ',' + Math.round(Math.min(1, col.g) * 255) + ',' + Math.round(Math.min(1, col.b) * 255) + ',' + (0.15 + rnd() * 0.35) + ')';
      g.lineWidth = 0.6 + rnd() * 2.2;
      g.beginPath();
      for (let x = 0; x <= S; x += 8) { const yy = y + Math.sin((x / S) * 6.28 * freq + phase) * amp; x ? g.lineTo(x, yy) : g.moveTo(x, yy); }
      g.stroke();
    }
    woodCache[color] = c; return c;
  }
  // BoxGeometry-Flächen: +x, -x, +y, -y, +z, -z mit (u-Achse, v-Achse)
  const FACE_UV = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
  function woodMaterials(pt, color) {
    const cv = woodCanvas(color), tile = 700; // eine Texturkachel = 700 mm
    return FACE_UV.map(([ua, va]) => {
      const tex = new THREE.CanvasTexture(cv);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      if (va === pt.grain) { tex.center.set(0.5, 0.5); tex.rotation = Math.PI / 2; tex.repeat.set(pt.size[va] / tile, pt.size[ua] / tile); }
      else tex.repeat.set(pt.size[ua] / tile, pt.size[va] / tile);
      if (renderer) tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7 });
    });
  }

  // Nuten und Bohrungen als dunkle Körper; an der offenen Seite 0,4 mm über die Fläche gezogen, damit sie sichtbar sind
  const FEAT_MAT = { nut: new THREE.MeshBasicMaterial({ color: 0x3a2f26 }), Dübel: new THREE.MeshBasicMaterial({ color: 0x1b5e20 }),
    Konfirmat: new THREE.MeshBasicMaterial({ color: 0x4a148c }), 'Konfirmat-Kernloch': new THREE.MeshBasicMaterial({ color: 0x4a148c }) };
  function buildFeatures(pt, k) {
    const g = new THREE.Group(), out = 0.4;
    const ta = [0, 1, 2].reduce((x, i) => (Math.abs(pt.size[i] - pt.thick) < Math.abs(pt.size[x] - pt.thick) ? i : x), 0);
    const pmin = pt.pos[ta] - pt.size[ta] / 2;
    (pt.grooves || []).forEach((gr) => {
      const b = gr.box.map((v) => v.slice());
      if (Math.abs(b[ta][0] - pmin) < 0.6) b[ta][0] -= out; else b[ta][1] += out;
      const m = new THREE.Mesh(new THREE.BoxGeometry(...b.map((v) => (v[1] - v[0]) * k)), FEAT_MAT.nut);
      m.position.set(...b.map((v, i) => ((v[0] + v[1]) / 2 - pt.pos[i]) * k));
      g.add(m);
    });
    (pt.holes || []).forEach((h) => {
      const start = h.at[h.axis] - h.dir * out, end = h.at[h.axis] + h.dir * (h.depth + (h.through ? out : 0));
      const len = Math.abs(end - start);
      const m = new THREE.Mesh(new THREE.CylinderGeometry(h.dia / 2 * k, h.dia / 2 * k, len * k, 12), FEAT_MAT[h.type] || FEAT_MAT.nut);
      const c = h.at.slice(); c[h.axis] = (start + end) / 2;
      m.position.set(...c.map((v, i) => (v - pt.pos[i]) * k));
      if (h.axis === 0) m.rotation.z = Math.PI / 2; else if (h.axis === 2) m.rotation.x = Math.PI / 2;
      g.add(m);
    });
    return g;
  }

  function applyExplode() {
    const f = Number($('explode').value) / 100;
    meshes.forEach((m) => {
      const b = m.userData.base, c = state.H * 0.001 / 2;
      m.position.set(b[0] * (1 + f * 0.8), c + (b[1] - c) * (1 + f * 0.8), b[2] + (m.userData.pt.back ? -f * 0.4 : 0));
      m.rotation.set(0, 0, 0);
      // Türen öffnen: Drehtüren um die Bandkante (Rückseite der Tür), Schiebetür vorne schiebt über die hintere
      const pt = m.userData.pt, o = Number($('openDoors').value) / 100;
      if (o > 0 && pt.hinge) {
        const k = 0.001, hx = (pt.pos[0] + pt.hinge * pt.size[0] / 2) * k, hz = (pt.pos[2] - pt.size[2] / 2) * k;
        const th = pt.hinge * o * (100 / 180) * Math.PI;       // bis 100° (Sensys öffnet 110°), Tür schwenkt nach vorne
        const dx = m.position.x - hx * (1 + f * 0.8), dz = m.position.z - hz;
        m.position.x = hx * (1 + f * 0.8) + dx * Math.cos(th) + dz * Math.sin(th);
        m.position.z = hz - dx * Math.sin(th) + dz * Math.cos(th);
        m.rotation.y = th;
      } else if (o > 0 && pt.slide) {
        m.position.x += pt.slide * 0.001 * o;
      }
    });
    render();
  }

  function highlight(no) {
    meshes.forEach((m) => {
      const on = no && m.userData.pt.group === no;
      (Array.isArray(m.material) ? m.material : [m.material]).forEach((mt) => { mt.emissive.setHex(on ? 0xb8662b : 0x000000); mt.emissiveIntensity = on ? 0.6 : 0; });
    });
    render();
  }

  /* ---------- Start ---------- */
  function initTabs() {
    document.querySelectorAll('#tabs button').forEach((b) => b.addEventListener('click', () => {
      document.querySelectorAll('#tabs button').forEach((x) => x.classList.toggle('on', x === b));
      document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('on', t.id === 'tab-' + b.dataset.tab));
    }));
  }

  loadState();
  initForm(); restoreFe(); initTabs(); initJaf(); init3D(); syncForm(); update();
  initDekor().then(initKantenRueck);
  $('btnCsv').addEventListener('click', exportCsv);
  $('btnPrint').addEventListener('click', () => window.print());
  $('btnLink').addEventListener('click', () => {
    const h = btoa(encodeURIComponent(JSON.stringify(state)));
    const url = location.origin + location.pathname + '#' + h;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => alert('Link kopiert.'), () => prompt('Link:', url));
  });
  window.__moebel = { get model() { return model; }, get plan() { return plan; }, state };
})();
