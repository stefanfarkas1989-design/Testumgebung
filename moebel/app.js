/* Möbel-Generator: Oberfläche, 3D-Ansicht, Ergebnis-Tabs */
(function () {
  'use strict';
  const M = window.Moebel;
  const $ = (id) => document.getElementById(id);
  const eur = (v) => v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const esc = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

  const PRESETS = {
    buch:      { W: 800,  H: 2000, D: 300, shelves: 4, dividers: 0, plinth: 0 },
    wuerfel:   { W: 1500, H: 1500, D: 380, shelves: 3, dividers: 3, plinth: 0 },
    schuh:     { W: 900,  H: 600,  D: 300, shelves: 2, dividers: 0, plinth: 0 },
    sideboard: { W: 1800, H: 700,  D: 400, shelves: 1, dividers: 2, plinth: 60 },
    nische:    { W: 1200, H: 2400, D: 250, shelves: 7, dividers: 1, plinth: 0 }
  };

  let state = Object.assign({}, M.DEFAULTS, PRESETS.buch);
  let priceOverride = null;

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
  const pairs = ['W', 'H', 'D', 'plinth', 'shelves', 'dividers'];
  function initForm() {
    Object.entries(M.MATERIALS).forEach(([k, m]) => $('material').add(new Option(m.name, k)));
    Object.entries(M.SHEETS).forEach(([k, s]) => $('sheet').add(new Option(s.name, k)));
    pairs.forEach((k) => {
      const r = $(k), n = $(k + 'n');
      const set = (v) => { state[k] = Number(v); update(); };
      r.addEventListener('input', () => set(r.value));
      n.addEventListener('change', () => { r.value = n.value; set(n.value); });
    });
    $('back').addEventListener('change', () => { const v = Number($('back').value); state.back = v > 0; if (v > 0) state.bt = v; update(); });
    $('material').addEventListener('change', () => { state.material = $('material').value; priceOverride = null; update(); });
    $('t').addEventListener('change', () => { state.t = Number($('t').value); update(); });
    $('sheet').addEventListener('change', () => { state.sheet = $('sheet').value; update(); });
    $('rotate').addEventListener('change', () => { state.rotate = $('rotate').checked; update(); });
    $('price').addEventListener('change', () => { priceOverride = Number($('price').value); update(); });
    $('preset').addEventListener('change', () => { Object.assign(state, PRESETS[$('preset').value]); syncForm(); update(); });
    $('explode').addEventListener('input', () => applyExplode());
    $('person').addEventListener('change', () => { if (personMesh) personMesh.visible = $('person').checked; render(); });
  }
  function syncForm() {
    pairs.forEach((k) => { $(k).value = state[k]; $(k + 'n').value = state[k]; });
    $('back').value = state.back ? state.bt : 0;
    $('material').value = state.material;
    $('t').value = state.t;
    $('sheet').value = state.sheet;
    $('rotate').checked = !!state.rotate;
    $('price').value = priceOverride != null ? priceOverride : M.MATERIALS[state.material].price;
  }

  /* ---------- Berechnung ---------- */
  let model, plan;
  function update() {
    // Preis-Override in Material schreiben (nur lokal)
    M.MATERIALS[state.material].price = priceOverride != null ? priceOverride : defaultPrices[state.material];
    model = M.buildRegal(state);
    $('price').value = M.MATERIALS[state.material].price;
    $('warnings').innerHTML = model.errors.map((e) => '<div class="e">⚠ ' + esc(e) + '</div>').join('');
    if (model.errors.length) { $('tab-list').innerHTML = $('tab-cut').innerHTML = $('tab-cost').innerHTML = $('tab-how').innerHTML = ''; return; }
    plan = M.plan(model);
    $('warnings').innerHTML = model.warnings.map((w) => '<div class="w">💡 ' + esc(w) + '</div>').join('') +
      plan.errors.map((e) => '<div class="e">⚠ ' + esc(e) + '</div>').join('');
    $('dims').textContent = state.W + ' × ' + state.H + ' × ' + state.D + ' mm  ·  Fach ' +
      Math.round(model.derived.cw) + ' × ' + Math.round(model.derived.ch) + ' mm  ·  ' + model.parts.length + ' Teile';
    renderList(); renderCut(); renderCost(); renderHow();
    rebuild3D();
    saveState();
  }
  const defaultPrices = {}; Object.entries(M.MATERIALS).forEach(([k, m]) => (defaultPrices[k] = m.price));

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
    let html = '<p class="note">Rohplatte ' + plan.sheet.l + ' × ' + plan.sheet.w + ' mm, je ' + 10 + ' mm Besäumschnitt, ' +
      state.kerf + ' mm Sägeblatt. Zahlen = Nr aus der Stückliste.</p>';
    const names = { plate: M.MATERIALS[state.material].name + ' ' + state.t + ' mm', back: 'HDF-Rückwand ' + state.bt + ' mm' };
    for (const key of Object.keys(plan.groups)) {
      const g = plan.groups[key];
      g.sheets.forEach((sh, i) => {
        const S = plan.sheet;
        let svg = '<svg viewBox="0 0 ' + S.l + ' ' + S.w + '"><rect x="0" y="0" width="' + S.l + '" height="' + S.w + '" fill="none" stroke="#999" stroke-width="6"/>' +
          '<rect x="' + g.trim + '" y="' + g.trim + '" width="' + g.SL + '" height="' + g.SW + '" fill="none" stroke="#bbb" stroke-dasharray="20 14" stroke-width="3"/>';
        sh.items.forEach((it) => {
          const x = g.trim + it.x, y = g.trim + it.y;
          svg += '<rect x="' + x + '" y="' + y + '" width="' + it.l + '" height="' + it.w + '" fill="' +
            (key === 'back' ? '#c9b99a' : M.MATERIALS[state.material].color) + '" stroke="#555" stroke-width="4"/>' +
            '<text x="' + (x + it.l / 2) + '" y="' + (y + it.w / 2) + '" text-anchor="middle" dominant-baseline="middle" font-size="' +
            Math.max(40, Math.min(110, it.w * 0.45)) + '" fill="#222">' + it.no + (it.rot ? '↻' : '') + '</text>';
        });
        svg += '</svg>';
        html += '<div class="sheet"><h3>' + names[key] + ' – Platte ' + (i + 1) + ' von ' + g.sheets.length +
          ' (' + Math.round(sh.usage * 100) + ' % genutzt)</h3>' + svg + '</div>';
      });
    }
    $('tab-cut').innerHTML = html;
  }

  function renderCost() {
    const c = plan.cost;
    let rows = '';
    Object.entries({ plate: M.MATERIALS[state.material].name + ' ' + state.t + ' mm', back: 'HDF Rückwand ' + state.bt + ' mm' }).forEach(([k, n]) => {
      if (c[k]) rows += '<tr><td>' + esc(n) + '</td><td class="n">' + c[k].sheets + ' Platte(n)</td><td class="n">' + eur(c[k].price) + '/m²</td><td class="n">' + eur(c[k].cost) + '</td></tr>';
    });
    rows += '<tr><td>Kantenband (' + model.derived.edgeM.toFixed(1) + ' m)</td><td></td><td></td><td class="n">' + eur(c.edge) + '</td></tr>';
    const hw = model.derived.hardware.map((h) => '<tr><td>' + esc(h.name) + '</td><td class="n">' + h.qty + ' Stk</td><td></td><td></td></tr>').join('');
    $('tab-cost').innerHTML =
      '<table><thead><tr><th>Position</th><th class="n">Menge</th><th class="n">Preis</th><th class="n">Summe</th></tr></thead><tbody>' +
      rows + hw + '<tr><td>Beschläge gesamt</td><td></td><td></td><td class="n">' + eur(c.hardware) + '</td></tr></tbody></table>' +
      '<div class="total">Gesamt ca. ' + eur(c.total) + '</div>' +
      '<p class="note">Richtwerte, keine Angebote. Der Plattenpreis ist links anpassbar. Es werden ganze Platten gerechnet; beim Zuschnitt-Dienst zahlst du oft nur die genutzte Fläche plus Schnittkosten. Restplatten lassen sich für das nächste Möbel aufheben.</p>';
  }

  function renderHow() {
    $('tab-how').innerHTML = '<ol class="how">' + M.instructions(model).map((s) => '<li>' + esc(s) + '</li>').join('') + '</ol>' +
      '<p class="note">Werkzeug: Akkuschrauber, Bohrer 5/7/8 mm, Zollstock, Winkel, Bleistift, Zwingen, ggf. Kantenbügeleisen.</p>';
  }

  /* ---------- Frischeis-Dekorkatalog ---------- */
  const KAT_NAMES = {
    'beschichtete-platte': 'Beschichtete Platte', 'dekorative-platte-mdf-hdf-hartfaser': 'Dekor MDF/HDF/Hartfaser',
    'durchgefarbte-platte': 'Durchgefärbte Platte', 'grundierplatte': 'Grundierplatte', 'mobelfront': 'Möbelfront', 'prageplatte': 'Prägeplatte'
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
    M.MATERIALS.fe = { name: a.nr + ' ' + a.name, color: guessColor(a.name), price: M.MATERIALS.fe ? M.MATERIALS.fe.price : 20 };
    if (!('fe' in defaultPrices)) defaultPrices.fe = 20;
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
    state.fe = { nr: a.nr, name: a.name, l: a.l, w: a.w, t: a.t, kat: a.kat };
    state.t = a.t; state.sheet = 'fe'; state.material = 'fe';
    restoreFe();
    $('jMat').value = a.nr + ' ' + a.name;
    $('jMat').dispatchEvent(new Event('change'));
    syncForm(); update(); renderDekor();
  }

  function renderDekor() {
    const q = $('dSearch').value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const kat = $('dKat').value, onlyT = $('dThick').checked;
    const hits = [];
    for (const a of catalog) {
      if (kat && a.kat !== kat) continue;
      if (onlyT && Math.abs(a.t - state.t) > 0.5) continue;
      const hay = (a.nr + ' ' + a.name).toLowerCase();
      if (q.every((w) => hay.includes(w))) { hits.push(a); if (hits.length >= 60) break; }
    }
    const cur = state.fe && state.fe.nr;
    $('dList').innerHTML = (q.length || kat || onlyT) ? hits.map((a, i) =>
      '<button type="button" role="option" data-i="' + catalog.indexOf(a) + '"' + (a.nr === cur ? ' class="on" aria-selected="true"' : '') + '>' +
      '<span class="sw" style="background:' + guessColor(a.name) + '"></span><span>' + esc(a.name) + '</span>' +
      '<small>' + esc(a.nr) + ' · ' + fmtT(a.t) + ' mm · ' + a.l + '×' + a.w + '</small></button>').join('') : '';
    const total = catalog.length;
    $('dInfo').textContent = !total ? 'Katalog nicht verfügbar.' :
      (q.length || kat || onlyT ? (hits.length >= 60 ? 'Erste 60 Treffer, Suche verfeinern.' : hits.length + ' Treffer.') : total + ' dekorative Platten von frischeis.at (Stand ' + catalogDate + '). Ohne Preise, die siehst du in WebCut.') +
      (state.fe ? ' Gewählt: ' + state.fe.nr + '.' : '') + ' Farbe in 3D ist geschätzt.';
  }
  let catalogDate = '';
  async function initDekor() {
    try {
      let data = window.__FE_DEKOR;
      if (!data) { const r = await fetch('frischeis-dekor.json'); data = await r.json(); }
      catalogDate = data.abgerufen;
      catalog = data.artikel.map((r) => ({ nr: r[0], name: r[1], l: r[2], w: r[3], t: r[4], kat: data.kategorien[r[5]] }));
      const kats = [...new Set(catalog.map((a) => a.kat))].sort();
      kats.forEach((k) => $('dKat').add(new Option((KAT_NAMES[k] || k) + ' (' + catalog.filter((a) => a.kat === k).length + ')', k)));
    } catch (e) { catalog = []; }
    $('dSearch').addEventListener('input', renderDekor);
    $('dKat').addEventListener('change', renderDekor);
    $('dThick').addEventListener('change', renderDekor);
    $('dList').addEventListener('click', (e) => { const b = e.target.closest('button[data-i]'); if (b) applyDekor(catalog[Number(b.dataset.i)]); });
    renderDekor();
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
    while (group.children.length) { const c = group.children.pop(); c.geometry.dispose(); }
    const k = 0.001;
    const mat = M.MATERIALS[state.material];
    model.parts.forEach((pt) => {
      const color = pt.back ? 0xb8a98a : new THREE.Color(mat.color);
      const m = new THREE.MeshStandardMaterial({ color, roughness: 0.75 });
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(pt.size[0] * k, pt.size[1] * k, pt.size[2] * k), m);
      mesh.castShadow = mesh.receiveShadow = true;
      mesh.userData = { pt, base: pt.pos.map((v) => v * k) };
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: 0x5a5448 }));
      mesh.add(edges);
      group.add(mesh); meshes.push(mesh);
    });
    cam.target.set(0, state.H * k / 2, 0);
    cam.r = Math.max(2.2, Math.hypot(state.W, state.H) * k * 1.9);
    personMesh.position.set(state.W * k / 2 + 0.6, 0, state.D * k / 2 - 0.1);
    personMesh.visible = $('person').checked;
    applyExplode();
  }

  function applyExplode() {
    const f = Number($('explode').value) / 100;
    meshes.forEach((m) => {
      const b = m.userData.base, c = state.H * 0.001 / 2;
      m.position.set(b[0] * (1 + f * 0.8), c + (b[1] - c) * (1 + f * 0.8), b[2] + (m.userData.pt.back ? -f * 0.4 : 0));
    });
    render();
  }

  function highlight(no) {
    meshes.forEach((m) => {
      const on = no && m.userData.pt.group === no;
      m.material.emissive.setHex(on ? 0xb8662b : 0x000000);
      m.material.emissiveIntensity = on ? 0.6 : 0;
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
  initForm(); restoreFe(); initTabs(); initJaf(); init3D(); syncForm(); update(); initDekor();
  $('btnCsv').addEventListener('click', exportCsv);
  $('btnPrint').addEventListener('click', () => window.print());
  $('btnLink').addEventListener('click', () => {
    const h = btoa(encodeURIComponent(JSON.stringify(state)));
    const url = location.origin + location.pathname + '#' + h;
    (navigator.clipboard ? navigator.clipboard.writeText(url) : Promise.reject()).then(() => alert('Link kopiert.'), () => prompt('Link:', url));
  });
  window.__moebel = { get model() { return model; }, get plan() { return plan; }, state };
})();
