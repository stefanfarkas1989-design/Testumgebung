'use strict';
const $ = id => document.getElementById(id);

const UI = {
  sel: null,        // { where: 'inv'|'eq', key }
  last: {},
  mmT: 0,

  set(id, prop, val) {   // nur schreiben, wenn sich etwas ändert
    const k = id + prop;
    if (UI.last[k] === val) return;
    UI.last[k] = val;
    const el = $(id);
    if (prop === 'text') el.textContent = val; else el.style[prop] = val;
  },

  setSpan(id, val) {
    if (UI.last[id] === val) return;
    UI.last[id] = val;
    $(id).querySelector('span').textContent = val;
  },

  toast(text, color) {
    const d = document.createElement('div');
    d.className = 'toast'; d.textContent = text; d.style.color = color || '#fff';
    const box = $('toasts');
    box.appendChild(d);
    while (box.children.length > 4) box.removeChild(box.firstChild);
    setTimeout(() => d.remove(), 2600);
  },

  update(dt) {
    UI.accT = (UI.accT || 0) + dt;
    if (UI.accT < 0.05) return;
    dt = UI.accT; UI.accT = 0;
    UI.setSpan('orbLife', `${Math.ceil(P.hp)}/${P.maxHp}`);
    $('orbLife').firstElementChild.style.height = (100 * P.hp / P.maxHp) + '%';
    UI.setSpan('orbMana', `${Math.floor(P.mana)}/${P.maxMana}`);
    $('orbMana').firstElementChild.style.height = (100 * P.mana / P.maxMana) + '%';
    $('xp').firstElementChild.style.width = (100 * P.xp / xpNeed(P.lvl)) + '%';
    const nn = Story.S().names.length;
    UI.set('floorLabel', 'text', `${G.theme.name} · Ebene ${G.floor}\nLevel ${P.lvl} · Namen ${nn >= NAMES_NEEDED ? nn + ' ✓' : nn + '/' + NAMES_NEEDED}`);
    const pa = pointsAvail();
    if (UI.last.pa !== pa) { UI.last.pa = pa; $('btnSkills').dataset.n = pa > 0 ? pa : ''; }

    for (let i = 0; i < 4; i++) {
      const sk = SKILLS[i], b = $('sk' + i);
      const locked = P.lvl < sk.unlock;
      b.classList.toggle('locked', locked);
      b.classList.toggle('nomana', !locked && P.mana < sk.mana);
      b.querySelector('.ic').textContent = locked ? '🔒' : sk.icon;
      const full = skillCd(sk);
      b.querySelector('.cdov').style.height = (locked ? 0 : clamp(P.cd[i] / full, 0, 1) * 100) + '%';
    }
    const pb = $('btnPot');
    pb.querySelector('.cdov').style.height = (clamp(P.potCd, 0, 1) * 100) + '%';
    pb.querySelector('.cnt').textContent = P.potions;

    const boss = G.boss && !G.boss.dead && G.boss.state !== 'idle' ? G.boss : null;
    $('bossbar').style.display = boss ? 'block' : 'none';
    if (boss) {
      $('bossbar').querySelector('.bn').textContent = boss.name;
      $('bossbar').querySelector('.bf > div').style.width = (100 * boss.hp / boss.maxHp) + '%';
    }

    UI.mmT -= dt;
    if (UI.mmT <= 0) { UI.mmT = 0.2; UI.drawMinimap(); }
  },

  // Statische Ebene der Minimap: neue Kacheln werden nur einmal eingezeichnet
  mmClear() {
    if (!UI.mmStatic) { UI.mmStatic = document.createElement('canvas'); UI.mmStatic.width = UI.mmStatic.height = 128; }
    UI.mmStatic.getContext('2d').clearRect(0, 0, 128, 128);
  },
  mmReveal(x, y) {
    if (!UI.mmStatic) UI.mmClear();
    const m = UI.mmStatic.getContext('2d');
    m.fillStyle = G.map[y * MW + x] || G.deco[y * MW + x] ? '#6a6480' : '#17141f';
    m.fillRect(x * 2, y * 2, 2, 2);
  },

  drawMinimap() {
    const c = $('minimap'), m = c.getContext('2d'), s = 2;
    m.clearRect(0, 0, c.width, c.height);
    if (UI.mmStatic) m.drawImage(UI.mmStatic, 0, 0);
    const dot = (wx, wy, col, r) => {
      m.fillStyle = col; m.beginPath(); m.arc(wx / TILE * s, wy / TILE * s, r, 0, 6.283); m.fill();
    };
    if (G.stairs) dot(G.stairs.x, G.stairs.y, '#ffd84a', 4);
    if (G.boss && !G.boss.dead && G.explored[Math.floor(G.boss.y / TILE) * MW + Math.floor(G.boss.x / TILE)]) dot(G.boss.x, G.boss.y, '#c04bff', 4);
    for (const e of G.enemies) {
      if (G.explored[Math.floor(e.y / TILE) * MW + Math.floor(e.x / TILE)] && Math.hypot(e.x - P.x, e.y - P.y) < 420) dot(e.x, e.y, '#d83a3a', 1.5);
    }
    dot(P.x, P.y, '#6fe08a', 3);
  },

  // ---------- Erzählung ----------
  sayQ: [], sayBusy: false,
  say(who, text, color, dur) {
    if (!text) return;
    UI.sayQ.push({ who, text, color: color || '#e6e0f5', dur: dur || 5500 });
    if (!UI.sayBusy) UI.sayNext();
  },
  sayNext() {
    const q = UI.sayQ.shift(), box = $('sayBox');
    if (!q) { UI.sayBusy = false; box.classList.add('hidden'); return; }
    UI.sayBusy = true;
    $('sayWho').textContent = q.who ? q.who : '';
    $('sayWho').style.color = q.color; $('sayWho').style.display = q.who ? 'block' : 'none';
    $('sayText').textContent = q.text;
    box.classList.remove('hidden');
    clearTimeout(UI.sayT);
    UI.sayT = setTimeout(UI.sayNext, q.dur);
  },

  // Textseiten im Vollbild (Prolog, Briefe, Ende). pages: [{who, color, text, big, small, input, letter}]
  sequence(pages, done) {
    const ov = $('storyOverlay');
    G.modal = true; G.paused = true; Input.releaseAll();
    ov.classList.remove('hidden'); ov.classList.remove('letter');
    $('sChoices').classList.add('hidden'); $('sNext').classList.remove('hidden');
    let i = 0, timer = null, full = '', typing = false;
    const finishTyping = () => { clearInterval(timer); typing = false; $('sText').textContent = full; };
    const show = () => {
      const p = pages[i];
      ov.classList.toggle('letter', !!p.letter);
      $('sWho').textContent = p.letter ? p.letter.title : (p.who || '');
      $('sWho').style.color = p.color || '#e8b36a';
      $('sText').className = (p.big ? 'big ' : '') + (p.small ? 'small ' : '');
      $('sInput').classList.toggle('hidden', !p.input);
      full = p.letter ? p.letter.text : p.text;
      $('sText').textContent = '';
      $('sNext').textContent = i === pages.length - 1 ? (p.letter ? 'Schließen' : p.input ? 'Los' : 'Weiter ▸') : 'Weiter ▸';
      typing = true; let n = 0;
      timer = setInterval(() => { n += 2; $('sText').textContent = full.slice(0, n); if (n >= full.length) finishTyping(); }, 26);
      if (p.input) setTimeout(() => $('sName').focus(), 50);
    };
    const next = () => {
      if (typing) { finishTyping(); return; }
      const p = pages[i];
      if (p.input) UI.pendingName = $('sName').value.trim();
      i++;
      if (i >= pages.length) {
        ov.classList.add('hidden'); G.modal = false; G.paused = false;
        Sfx.play('ui');
        if (done) done();
        return;
      }
      show();
    };
    $('sNext').onclick = next;
    ov.onclick = e => { if (e.target === ov || e.target.id === 'sText') next(); };
    show();
  },
  showLetter(l) { UI.sequence([{ letter: l }], null); Sfx.play('pickupMagic'); },

  // Entscheidung (Ende)
  choice(prompt, opts) {
    const ov = $('storyOverlay'), box = $('sChoices');
    G.modal = true; G.paused = true;
    ov.classList.remove('hidden', 'letter');
    $('sWho').textContent = ''; $('sText').className = ''; $('sText').textContent = prompt;
    $('sInput').classList.add('hidden'); $('sNext').classList.add('hidden');
    box.classList.remove('hidden'); box.innerHTML = '';
    for (const o of opts) {
      const b = document.createElement('button');
      b.innerHTML = `<b>${o.label}</b><small>${o.hint || ''}</small>`;
      if (o.enabled === false) b.disabled = true;
      b.onclick = () => { ov.classList.add('hidden'); box.classList.add('hidden'); G.modal = false; G.paused = false; o.go(); };
      box.appendChild(b);
    }
  },

  beginNewGame() {
    UI.enterFullscreen();
    $('overlay').classList.add('hidden');
    G.modal = true;
    const pages = PROLOG.map(t => ({ text: t })).concat([{ input: true, text: 'Du hast keinen Namen.\nWie willst du genannt werden?' }]);
    UI.sequence(pages, () => { newGame(); });
  },

  // ---------- Chronik ----------
  renderChronik(tab) {
    UI.cTab = tab;
    document.querySelectorAll('#cTabs button').forEach(b => b.classList.toggle('on', b.dataset.c === tab));
    const S = Story.S(), body = $('cBody');
    let h = '';
    if (tab === 'story') {
      h += `<p class="cp">${LORE_TEXT.geschichte}</p>`;
      const lines = Object.keys(BOSS_LINES).filter(k => S.bosses[k]);
      if (lines.length) h += '<h3>Letzte Worte</h3>' + lines.map(k => `<div class="cq"><b>${BOSS_LINES[k].death[0]}</b>„${BOSS_LINES[k].death[1]}“</div>`).join('');
      if (S.ending) h += `<h3>Dein Ende</h3><p class="cp">${['', 'Du wurdest das neue Schloss des Siegels.', 'Du gabst dem Schweigen den Funken. Valdrun steht wieder, und niemand lebt darin.', 'Du hast die Namen genannt. Es regnet über Valdrun.'][S.ending]}</p>`;
    } else if (tab === 'letters') {
      h += S.letters.length ? S.letters.slice().sort((a, b) => a - b).map(id => { const l = LETTERS.find(x => x.id === id); return `<div class="cletter"><b>${l.title}</b><p>${l.text.replace(/\n/g, '<br>')}</p></div>`; }).join('') : '<p class="muted">Noch keine Briefe gefunden.</p>';
    } else if (tab === 'names') {
      const n = S.names.length;
      h += `<div class="cbar"><div style="width:${Math.min(100, 100 * n / NAMES_NEEDED)}%"></div></div><p class="muted">${n} von ${NAMES_NEEDED} Namen. Zerbrich Urnen, Geoden und Fässer und besiege die Fürsten. Mit ${NAMES_NEEDED} Namen ist am Ende ein besonderer Weg offen.</p>`;
      h += S.names.length ? '<ul class="cnames">' + S.names.slice().reverse().map(x => `<li>${x}</li>`).join('') + '</ul>' : '';
    } else if (tab === 'bestiary') {
      h += Object.keys(BESTIARY).map(k => S.seen[k] ? `<div class="cbest"><b>${BESTIARY[k][0]}</b><p>${BESTIARY[k][1]}</p></div>` : '<div class="cbest dim"><b>???</b><p>Noch nicht begegnet.</p></div>').join('');
    } else if (tab === 'relics') {
      h += Object.keys(RELIC_LORE).map(k => S.relics[k] ? `<div class="cbest relic"><b>${k}</b><p>${RELIC_LORE[k]}</p></div>` : '<div class="cbest dim"><b>???</b><p>Ein Relikt der Glutwacht, noch nicht gefunden.</p></div>').join('');
    }
    body.innerHTML = h;
  },

  // ---------- Overlay ----------
  showTitle() {
    G.state = 'title';
    $('oText').textContent = 'Steige hinab. Besiege den Boss. Sammle Beute.';
    const box = $('oButtons');
    box.innerHTML = '';
    const add = (label, fn, cls) => {
      const b = document.createElement('button');
      b.textContent = label; if (cls) b.className = cls; b.onclick = fn; box.appendChild(b);
    };
    if (hasSave()) add('Weiter', () => { UI.enterFullscreen(); if (loadGame()) UI.hideOverlay(); });
    add(hasSave() ? 'Neues Spiel' : 'Spiel starten', () => { UI.beginNewGame(); }, hasSave() ? 'sec' : '');
    $('overlay').classList.remove('hidden');
  },
  showDeath() {
    $('oText').textContent = 'Du bist gefallen.\n' + Story.deathLine();
    const box = $('oButtons');
    box.innerHTML = '';
    const b = document.createElement('button');
    b.textContent = 'Wiederbeleben'; b.onclick = () => {
      P.hp = P.maxHp; P.mana = P.maxMana; startFloor(); UI.hideOverlay();
    };
    box.appendChild(b);
    $('overlay').classList.remove('hidden');
  },
  hideOverlay() { $('overlay').classList.add('hidden'); },
  enterFullscreen() {
    try {
      const el = document.documentElement;
      if (el.requestFullscreen && !document.fullscreenElement && 'ontouchstart' in window) {
        el.requestFullscreen().then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      }
    } catch (e) { /* ignorieren */ }
  },

  // ---------- Inventar ----------
  updateGfxButtons() {
    const q = { auto: 'Auto', high: 'Hoch', mid: 'Mittel', low: 'Niedrig' }[G.quality] || 'Auto';
    $('pGfx').textContent = `Grafik: ${G.gfx === '3d' ? '3D' : '2D'}`;
    $('pQual').textContent = `Qualität: ${q}`;
    $('pQual').style.display = G.gfx === '3d' ? '' : 'none';
    $('pCam').style.display = G.gfx === '3d' ? '' : 'none';
  },

  updateSndButton() {
    $('btnSnd').textContent = Sfx.muted ? '🔇' : '🔊';
    $('pSound').textContent = Sfx.muted ? '🔇 Ton: aus' : '🔊 Ton: an';
  },

  // ---------- Pause ----------
  setPause(on) {
    if (G.state !== 'play' || (on && G.modal)) return;
    if (on) {
      if (UI.camSync) UI.camSync();
      UI.showPanel(null);
      G.paused = true; G.pausedMenu = true;
      Input.releaseAll();
      $('pauseOverlay').classList.remove('hidden');
      if (Sfx.ctx) Sfx.ctx.suspend();
    } else {
      G.paused = false; G.pausedMenu = false;
      $('pauseOverlay').classList.add('hidden');
      if (Sfx.ctx) Sfx.ctx.resume();
    }
  },
  togglePause() {
    if (G.modal) return;
    if (G.pausedMenu) UI.setPause(false);
    else if (G.paused) UI.showPanel(null);
    else UI.setPause(true);
  },

  // which: 'inv' | 'skills' | null (alles schließen)
  showPanel(which) {
    if (G.state !== 'play' || G.pausedMenu || G.modal) return;
    const ids = { inv: 'panel', skills: 'skillPanel', chronik: 'chronikPanel' };
    let cur = null;
    for (const k in ids) if (!$(ids[k]).classList.contains('hidden')) cur = k;
    const next = which === cur ? null : which;
    for (const k in ids) $(ids[k]).classList.toggle('hidden', k !== next);
    G.paused = !!next;
    Sfx.play('ui');
    if (next) Input.releaseAll();
    if (next === 'inv') { UI.sel = null; UI.confirmDrop = false; UI.setTab('eq'); UI.renderPanel(); }
    if (next === 'skills') UI.renderSkills();
    if (next === 'chronik') UI.renderChronik(UI.cTab || 'story');
  },
  togglePanel() { UI.showPanel('inv'); },

  renderSkills() {
    $('skillPts').textContent = pointsAvail();
    const box = $('skillCols'); box.innerHTML = '';
    for (const g of TREE_GROUPS) {
      const col = document.createElement('div'); col.className = 'scol';
      const unl = groupUnlocked(g.id);
      let head = `<div class="sh"><span class="si">${g.icon}</span><div><b>${g.name}</b><small>${spentIn(g.id)} Punkte${unl ? '' : ' · ab Level ' + SKILLS[g.skill].unlock}</small></div></div>`;
      col.innerHTML = head;
      for (const n of TREE.filter(t => t.group === g.id)) {
        const r = P.ranks[n.id] || 0, can = canSpend(n.id), lockedBy = spentIn(g.id) < n.need;
        const d = document.createElement('div');
        d.className = 'node' + (r >= n.max ? ' maxed' : can ? ' avail' : '') + (r === 0 && !can ? ' dim' : '');
        let h = `<div class="nt"><b>${n.name}</b><span>${r}/${n.max}</span></div>`;
        h += `<div class="nd">${n.text(Math.max(1, r))}</div>`;
        if (r > 0 && r < n.max) h += `<div class="nn">Nächster Rang: ${n.text(r + 1)}</div>`;
        if (lockedBy) h += `<div class="nl">🔒 ${n.need} Punkte in ${g.name} nötig</div>`;
        else if (!unl) h += `<div class="nl">🔒 Skill noch nicht freigeschaltet</div>`;
        d.innerHTML = h;
        d.onclick = () => { if (spendPoint(n.id)) { Sfx.play('pickupMagic'); UI.renderSkills(); } };
        col.appendChild(d);
      }
      box.appendChild(col);
    }
  },

  // ---------- Inventar ----------
  slotNames: { weapon: 'Stab', helm: 'Kopf', chest: 'Brust', amulet: 'Amulett', ring1: 'Ring', ring2: 'Ring' },

  // Symbole als SVG, eingefärbt nach Seltenheit
  icon(slot, color, size) {
    const c = color, s = size || 28;
    const p = {
      weapon: `<line x1="8" y1="27" x2="21" y2="9" stroke="${c}" stroke-width="2.8" stroke-linecap="round"/><path d="M23 2 L27 7 L23 12 L19 7 Z" fill="${c}"/><path d="M23 4.5 L25 7 L23 9.5 L21 7 Z" fill="#fff" opacity=".85"/>`,
      helm: `<path d="M5 27 C4 13 10 4 16 4 C22 4 28 13 27 27 L21 27 C21 21 20 18 16 18 C12 18 11 21 11 27 Z" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><path d="M13 12 C14 10 18 10 19 12" fill="none" stroke="${c}" stroke-width="1.6" opacity=".8"/>`,
      chest: `<path d="M10 5 L22 5 L28 13 L23 16 L24 28 L8 28 L9 16 L4 13 Z" fill="${c}" fill-opacity=".28" stroke="${c}" stroke-width="2" stroke-linejoin="round"/><rect x="9" y="17" width="14" height="3" fill="${c}" opacity=".8"/>`,
      ring: `<circle cx="16" cy="19" r="8" fill="none" stroke="${c}" stroke-width="3.2"/><path d="M16 4 L21 9.5 L16 14 L11 9.5 Z" fill="${c}"/><path d="M16 6.5 L18.4 9.5 L16 11.5 L13.6 9.5 Z" fill="#fff" opacity=".8"/>`,
      amulet: `<path d="M6 4 Q16 24 26 4" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round"/><path d="M16 17 L22 23 L16 30 L10 23 Z" fill="${c}"/><path d="M16 20 L19 23 L16 26.5 L13 23 Z" fill="#fff" opacity=".75"/>`,
    }[slot];
    return `<svg width="${s}" height="${s}" viewBox="0 0 32 32" aria-hidden="true">${p}</svg>`;
  },

  // Grobe Bewertung für Upgrade-Pfeile
  score(it) {
    if (!it) return -1;
    const st = {}; if (it.implicit) st[it.implicit.id] = it.implicit.value;
    for (const a of it.affixes) st[a.id] = (st[a.id] || 0) + a.value;
    const w = { dmg: 1.2, dmgPct: 1.3, life: 0.18, mana: 0.18, crit: 3, critDmg: 0.5, cdr: 2.2, armor: 0.25, lifeRegen: 3, manaRegen: 3, move: 1.5 };
    let v = 0; for (const k in st) v += (w[k] || 0) * st[k];
    return v + (it.power ? 30 : 0);
  },
  // Welcher angelegte Platz würde ersetzt?
  cmpKey(it) {
    if (it.slot !== 'ring') return it.slot;
    if (!P.eq.ring1) return 'ring1';
    if (!P.eq.ring2) return 'ring2';
    return UI.score(P.eq.ring1) <= UI.score(P.eq.ring2) ? 'ring1' : 'ring2';
  },
  isUpgrade(it) {
    const k = UI.cmpKey(it);
    return !P.eq[k] || UI.score(it) > UI.score(P.eq[k]) + 0.5;
  },

  statNames: { dmg: 'Zauberschaden', dmgPct: 'Zauberschaden %', life: 'Leben', mana: 'Mana', crit: 'Krit-Chance %', critDmg: 'Krit-Schaden %', cdr: 'Abklingzeit %', armor: 'Rüstung', lifeRegen: 'Leben/s', manaRegen: 'Mana/s', move: 'Lauftempo %' },
  compareHtml(it) {
    const key = UI.cmpKey(it);
    const before = sumStats(P.eq), after = sumStats(Object.assign({}, P.eq, { [key]: it }));
    let rows = '';
    for (const k in UI.statNames) {
      let d = (after[k] || 0) - (before[k] || 0);
      d = Math.round(d * 10) / 10;
      if (!d) continue;
      rows += `<div class="cmp ${d > 0 ? 'up' : 'down'}"><span>${UI.statNames[k]}</span><b>${d > 0 ? '▲ +' : '▼ '}${d}</b></div>`;
    }
    const old = P.eq[key];
    if (it.power && (!old || old.power !== it.power)) rows += `<div class="cmp up"><span>Neue Kraft</span><b>★</b></div>`;
    if (old && old.power && old.power !== it.power) rows += `<div class="cmp down"><span>Kraft verloren</span><b>★</b></div>`;
    if (!rows) rows = '<div class="cmp"><span>Keine Änderung</span></div>';
    return `<div class="cmpBox"><div class="tag">Gegenüber ${old ? 'angelegt: ' + old.name : 'leerem Platz'}</div>${rows}</div>`;
  },

  itemCard(it, tag) {
    const R = RARITY[it.rarity];
    let h = `<div class="itm" style="border-color:${R.color}">`;
    if (tag) h += `<div class="tag">${tag}</div>`;
    h += `<div class="ihead"><div class="ibig" style="--rc:${R.color}">${UI.icon(it.slot, R.color, 40)}</div><div><div class="nm" style="color:${R.color}">${it.name}</div>`;
    h += `<div class="sub">${R.name} ${SLOTS[it.slot].label} · Itemstufe ${it.ilvl}</div></div></div>`;
    const imp = implicitLine(it);
    if (imp) h += `<div class="impl">${imp}</div>`;
    if (it.affixes.length) h += '<ul>' + it.affixes.map(a => `<li>${affixLine(a)}</li>`).join('') + '</ul>';
    if (it.power && POWER_BY_ID[it.power]) h += `<div class="pow">★ ${POWER_BY_ID[it.power].label}</div>`;
    if (it.rarity === 'legendary' && RELIC_LORE[it.name]) h += `<div class="lore">„${RELIC_LORE[it.name]}“</div>`;
    return h + '</div>';
  },

  cell(it, key, where, label) {
    const d = document.createElement('div');
    d.className = 'cell' + (it ? ' r-' + it.rarity : '');
    if (it) {
      const R = RARITY[it.rarity];
      d.style.setProperty('--rc', R.color);
      d.innerHTML = UI.icon(it.slot, R.color) + `<i class="lv">${it.ilvl}</i>` + (where === 'inv' && UI.isUpgrade(it) ? '<b class="up">▲</b>' : '');
    } else if (label) {
      d.innerHTML = `<span class="ph">${UI.icon(label, '#4a4360')}</span>`;
    }
    if (where === 'eq') d.innerHTML += `<small>${UI.slotNames[key]}</small>`;
    if (UI.sel && UI.sel.where === where && UI.sel.key === key) d.classList.add('sel');
    d.onclick = () => {
      const again = UI.sel && UI.sel.where === where && UI.sel.key === key;
      if (again && it) {            // zweites Antippen: anlegen / ablegen
        if (where === 'inv') { equipFromInv(key); Sfx.play('pickupMagic'); UI.sel = null; }
        else if (unequip(key)) UI.sel = null; else UI.toast('Rucksack voll!', '#ff6a6a');
      } else UI.sel = { where, key };
      UI.confirmDrop = false;
      UI.renderPanel();
    };
    return d;
  },

  setTab(t) {
    UI.tab = t;
    $('invBox').dataset.tab = t;
    document.querySelectorAll('#invBox .tabs button').forEach(b => b.classList.toggle('on', b.dataset.t === t));
  },

  renderPanel() {
    const eq = $('eqGrid'), inv = $('invGrid');
    eq.innerHTML = ''; inv.innerHTML = '';
    for (const k of EQ_KEYS) eq.appendChild(UI.cell(P.eq[k], k, 'eq', EQ_SLOT[k]));
    for (let i = 0; i < INV_MAX; i++) inv.appendChild(UI.cell(P.inv[i], i, 'inv'));
    const cnt = `(${P.inv.length}/${INV_MAX})`;
    $('invCount').textContent = cnt; $('invCount2').textContent = cnt;
    $('lvlInfo').textContent = `· Level ${P.lvl} · ${Math.floor(P.xp)}/${xpNeed(P.lvl)} EP`;

    const stats = [
      ['Leben', P.maxHp], ['Mana', P.maxMana],
      ['Zauberschaden', '+' + P.dmgFlat + ' / +' + P.dmgPct + '%'],
      ['Krit-Chance', P.crit.toFixed(0) + '%'], ['Krit-Schaden', P.critDmg + '%'],
      ['Abklingzeit', '-' + P.cdr + '%'], ['Rüstung', P.armor],
      ['Lauftempo', '+' + P.move + '%'],
      ['Regeneration', P.regen.toFixed(1) + ' Leben · ' + P.manaRegen.toFixed(1) + ' Mana /s'],
    ];
    $('statList').innerHTML = stats.map(s => `<div><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');

    // Details (Sheet)
    const det = $('detail'), sheet = $('sheet'), s = UI.sel;
    const it = s && (s.where === 'eq' ? P.eq[s.key] : P.inv[s.key]);
    sheet.classList.toggle('open', !!it);
    if (!it) { det.innerHTML = '<p class="muted">Tippe ein Item an. Tippe es nochmal, um es anzulegen.</p>'; return; }
    let h = UI.itemCard(it, s.where === 'eq' ? 'Angelegt' : null);
    if (s.where === 'inv') h += UI.compareHtml(it);
    h += '<div class="btnrow">';
    h += s.where === 'inv' ? '<button id="bEquip" class="primary">Anlegen</button>' : '<button id="bUnequip" class="primary">Ablegen</button>';
    if (s.where === 'inv') h += `<button id="bDrop" class="${UI.confirmDrop ? 'danger' : ''}">${UI.confirmDrop ? 'Wirklich?' : 'Wegwerfen'}</button>`;
    h += '</div>';
    det.innerHTML = h;
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('bEquip', () => { equipFromInv(s.key); Sfx.play('pickupMagic'); UI.sel = null; UI.renderPanel(); });
    on('bUnequip', () => { if (unequip(s.key)) UI.sel = null; else UI.toast('Rucksack voll!', '#ff6a6a'); UI.renderPanel(); });
    on('bDrop', () => {
      if ((it.rarity === 'rare' || it.rarity === 'legendary') && !UI.confirmDrop) { UI.confirmDrop = true; UI.renderPanel(); return; }
      P.inv.splice(s.key, 1); UI.sel = null; UI.confirmDrop = false; saveGame(); UI.renderPanel();
    });
  },

  sortInv() {
    const rank = { legendary: 3, rare: 2, magic: 1, normal: 0 }, so = Object.keys(SLOTS);
    P.inv.sort((a, b) => (rank[b.rarity] - rank[a.rarity]) || (b.ilvl - a.ilvl) || (so.indexOf(a.slot) - so.indexOf(b.slot)));
    UI.sel = null; saveGame(); UI.renderPanel(); Sfx.play('ui');
  },

  junk() {
    P.inv = P.inv.filter(it => it.rarity !== 'normal');
    UI.sel = null; saveGame(); UI.renderPanel();
  },
};
