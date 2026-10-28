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
    UI.set('floorLabel', 'text', `Ebene ${G.floor} · Level ${P.lvl}`);

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
  updateSndButton() { $('btnSnd').textContent = Sfx.muted ? '🔇' : '🔊'; },

  togglePanel() {
    if (G.state !== 'play') return;
    Sfx.play('ui');
    const open = $('panel').classList.contains('hidden');
    $('panel').classList.toggle('hidden', !open);
    G.paused = open;
    if (open) { Input.releaseAll(); UI.sel = null; UI.renderPanel(); }
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
