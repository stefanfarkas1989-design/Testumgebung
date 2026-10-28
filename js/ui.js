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
    UI.setSpan('orbLife', `${Math.ceil(P.hp)}/${P.maxHp}`);
    $('orbLife').firstElementChild.style.height = (100 * P.hp / P.maxHp) + '%';
    UI.setSpan('orbMana', `${Math.floor(P.mana)}/${P.maxMana}`);
    $('orbMana').firstElementChild.style.height = (100 * P.mana / P.maxMana) + '%';
    $('xp').firstElementChild.style.width = (100 * P.xp / xpNeed(P.lvl)) + '%';
    UI.set('floorLabel', 'text', `${G.theme.name} · Ebene ${G.floor} · Level ${P.lvl}`);
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

  drawMinimap() {
    const c = $('minimap'), m = c.getContext('2d'), s = 2;
    m.clearRect(0, 0, c.width, c.height);
    // Ausschnitt um den Spieler (128px = 64 Kacheln)
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
      const i = y * MW + x;
      if (!G.explored[i]) continue;
      m.fillStyle = G.map[i] ? '#6a6480' : '#17141f';
      m.fillRect(x * s, y * s, s, s);
    }
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
    add(hasSave() ? 'Neues Spiel' : 'Spiel starten', () => { UI.enterFullscreen(); newGame(); UI.hideOverlay(); }, hasSave() ? 'sec' : '');
    $('overlay').classList.remove('hidden');
  },
  showDeath() {
    $('oText').textContent = 'Du bist gefallen.';
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
  updateSndButton() {
    $('btnSnd').textContent = Sfx.muted ? '🔇' : '🔊';
    $('pSound').textContent = Sfx.muted ? '🔇 Ton: aus' : '🔊 Ton: an';
  },

  // ---------- Pause ----------
  setPause(on) {
    if (G.state !== 'play') return;
    if (on) {
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
    if (G.pausedMenu) UI.setPause(false);
    else if (G.paused) UI.showPanel(null);
    else UI.setPause(true);
  },

  // which: 'inv' | 'skills' | null (alles schließen)
  showPanel(which) {
    if (G.state !== 'play' || G.pausedMenu) return;
    const cur = !$('panel').classList.contains('hidden') ? 'inv' : !$('skillPanel').classList.contains('hidden') ? 'skills' : null;
    const next = which === cur ? null : which;
    $('panel').classList.toggle('hidden', next !== 'inv');
    $('skillPanel').classList.toggle('hidden', next !== 'skills');
    G.paused = !!next;
    Sfx.play('ui');
    if (next) Input.releaseAll();
    if (next === 'inv') { UI.sel = null; UI.renderPanel(); }
    if (next === 'skills') UI.renderSkills();
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

  itemCard(it, tag) {
    const R = RARITY[it.rarity];
    let h = `<div class="itm" style="border-color:${R.color}">`;
    if (tag) h += `<div class="tag">${tag}</div>`;
    h += `<div class="nm" style="color:${R.color}">${it.name}</div>`;
    h += `<div class="sub">${R.name} ${SLOTS[it.slot].label} · Itemstufe ${it.ilvl}</div>`;
    const imp = implicitLine(it);
    if (imp) h += `<div class="impl">${imp}</div>`;
    if (it.affixes.length) h += '<ul>' + it.affixes.map(a => `<li>${affixLine(a)}</li>`).join('') + '</ul>';
    if (it.power && POWER_BY_ID[it.power]) h += `<div class="pow">★ ${POWER_BY_ID[it.power].label}</div>`;
    return h + '</div>';
  },

  cell(it, key, where, label) {
    const d = document.createElement('div');
    d.className = 'cell';
    if (it) {
      d.style.borderColor = RARITY[it.rarity].color;
      d.textContent = SLOTS[it.slot].icon;
    } else if (label) {
      d.style.opacity = .5; d.textContent = label;
    }
    if (UI.sel && UI.sel.where === where && UI.sel.key === key) d.classList.add('sel');
    d.onclick = () => { UI.sel = { where, key }; UI.renderPanel(); };
    return d;
  },

  renderPanel() {
    const eq = $('eqGrid'), inv = $('invGrid');
    eq.innerHTML = ''; inv.innerHTML = '';
    for (const k of EQ_KEYS) {
      const c = UI.cell(P.eq[k], k, 'eq', SLOTS[EQ_SLOT[k]].icon);
      eq.appendChild(c);
    }
    for (let i = 0; i < INV_MAX; i++) inv.appendChild(UI.cell(P.inv[i], i, 'inv'));
    $('invCount').textContent = `(${P.inv.length}/${INV_MAX})`;

    const stats = [
      ['Level', P.lvl], ['Leben', P.maxHp], ['Mana', P.maxMana],
      ['Zauberschaden', '+' + P.dmgFlat + ' / +' + P.dmgPct + '%'],
      ['Krit-Chance', P.crit.toFixed(0) + '%'], ['Krit-Schaden', P.critDmg + '%'],
      ['Abklingzeit', '-' + P.cdr + '%'], ['Rüstung', P.armor],
      ['Lauftempo', '+' + P.move + '%'],
      ['Regeneration', P.regen.toFixed(1) + ' Leben · ' + P.manaRegen.toFixed(1) + ' Mana /s'],
    ];
    $('statList').innerHTML = stats.map(s => `<div><span>${s[0]}</span><b>${s[1]}</b></div>`).join('');

    // Details
    const det = $('detail');
    const s = UI.sel;
    const it = s && (s.where === 'eq' ? P.eq[s.key] : P.inv[s.key]);
    if (!it) { det.innerHTML = '<p class="muted">Tippe ein Item an.</p>'; return; }
    let h = UI.itemCard(it, s.where === 'eq' ? 'Angelegt' : null);
    if (s.where === 'inv') {
      const cmpKey = eqKeyFor(it.slot);
      if (P.eq[cmpKey]) h += UI.itemCard(P.eq[cmpKey], 'Aktuell angelegt');
    }
    h += '<div class="btnrow">';
    h += s.where === 'inv' ? '<button id="bEquip">Anlegen</button>' : '<button id="bUnequip">Ablegen</button>';
    if (s.where === 'inv') h += '<button id="bDrop">Wegwerfen</button>';
    h += '</div>';
    det.innerHTML = h;
    const on = (id, fn) => { const b = $(id); if (b) b.onclick = fn; };
    on('bEquip', () => { equipFromInv(s.key); UI.sel = null; UI.renderPanel(); });
    on('bUnequip', () => { if (unequip(s.key)) UI.sel = null; else UI.toast('Rucksack voll!', '#ff6a6a'); UI.renderPanel(); });
    on('bDrop', () => { P.inv.splice(s.key, 1); UI.sel = null; saveGame(); UI.renderPanel(); });
  },

  junk() {
    P.inv = P.inv.filter(it => it.rarity !== 'normal');
    UI.sel = null; saveGame(); UI.renderPanel();
  },
};
