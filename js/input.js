'use strict';
const Input = {
  keys: {},
  held: [false, false, false, false],
  mx: 0, my: 0,
  mode: 'mouse',            // 'mouse' = Zielen mit Maus, 'touch' = Auto-Zielen
  joy: { id: null, ox: 0, oy: 0, dx: 0, dy: 0 },

  moveVec() {
    let x = 0, y = 0;
    const k = Input.keys;
    if (k.a || k.arrowleft) x -= 1;
    if (k.d || k.arrowright) x += 1;
    if (k.w || k.arrowup) y -= 1;
    if (k.s || k.arrowdown) y += 1;
    if (x || y) { const l = Math.hypot(x, y); return { x: x / l, y: y / l }; }
    return { x: Input.joy.dx, y: Input.joy.dy };
  },

  releaseAll() {
    Input.keys = {};
    Input.held = [false, false, false, false];
    Input.endJoy();
    document.querySelectorAll('.sk.active').forEach(b => b.classList.remove('active'));
  },

  endJoy() {
    Input.joy.id = null; Input.joy.dx = Input.joy.dy = 0;
    $('joy').style.display = 'none';
  },
};

(function initInput() {
  const layer = $('input');
  const R = 55;

  layer.addEventListener('contextmenu', e => e.preventDefault());
  layer.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse') {
      Input.mode = 'mouse';
      Input.mx = e.clientX; Input.my = e.clientY;
      if (e.button === 0) Input.held[0] = true;
      if (e.button === 2) Input.held[1] = true;
    } else {
      Input.mode = 'touch';
      if (Input.joy.id === null && e.clientX < window.innerWidth * 0.55) {
        Input.joy.id = e.pointerId; Input.joy.ox = e.clientX; Input.joy.oy = e.clientY;
        const j = $('joy');
        j.style.display = 'block'; j.style.left = e.clientX + 'px'; j.style.top = e.clientY + 'px';
        $('joyKnob').style.transform = 'translate(0,0)';
        layer.setPointerCapture(e.pointerId);
      }
    }
  });
  layer.addEventListener('pointermove', e => {
    if (e.pointerType === 'mouse') { Input.mx = e.clientX; Input.my = e.clientY; return; }
    if (e.pointerId !== Input.joy.id) return;
    let dx = e.clientX - Input.joy.ox, dy = e.clientY - Input.joy.oy;
    const l = Math.hypot(dx, dy);
    if (l > R) { dx = dx / l * R; dy = dy / l * R; }
    $('joyKnob').style.transform = `translate(${dx}px,${dy}px)`;
    Input.joy.dx = Math.abs(dx) / R < 0.12 && Math.abs(dy) / R < 0.12 ? 0 : dx / R;
    Input.joy.dy = Math.abs(dx) / R < 0.12 && Math.abs(dy) / R < 0.12 ? 0 : dy / R;
  });
  const up = e => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) Input.held[0] = false;
      if (e.button === 2) Input.held[1] = false;
    } else if (e.pointerId === Input.joy.id) Input.endJoy();
  };
  layer.addEventListener('pointerup', up);
  layer.addEventListener('pointercancel', up);

  // Skill-Buttons
  document.querySelectorAll('.sk[data-i]').forEach(b => {
    const i = +b.dataset.i;
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      if (e.pointerType !== 'mouse') Input.mode = 'touch';
      Input.held[i] = true; b.classList.add('active');
      b.setPointerCapture(e.pointerId);
    });
    const off = () => { Input.held[i] = false; b.classList.remove('active'); };
    b.addEventListener('pointerup', off);
    b.addEventListener('pointercancel', off);
  });
  $('btnPot').addEventListener('pointerdown', e => { e.preventDefault(); usePotion(); });
  $('btnInv').addEventListener('pointerdown', e => { e.preventDefault(); UI.togglePanel(); });
  $('pClose').onclick = () => UI.showPanel(null);
  $('btnPause').addEventListener('pointerdown', e => { e.preventDefault(); UI.setPause(true); });
  $('pResume').onclick = () => UI.setPause(false);
  $('pSound').onclick = () => { Sfx.init(); Sfx.setMuted(!Sfx.muted); };
  // Kamera
  const camSave = () => { try { localStorage.setItem('aschenfall-cam', JSON.stringify({ z: G.camZoom, t: G.camTilt })); } catch (e) { /* egal */ } };
  const camSync = () => { $('camZoom').value = Math.round(G.camZoom * 100); $('camTilt').value = Math.round(G.camTilt * 100); };
  $('camZoom').oninput = e => { G.camZoom = e.target.value / 100; camSave(); };
  $('camTilt').oninput = e => { G.camTilt = e.target.value / 100; camSave(); };
  $('camReset').onclick = () => { G.camZoom = 1; G.camTilt = 0.95; camSync(); camSave(); };
  UI.camSync = camSync;
  window.addEventListener('wheel', e => {
    if (G.state !== 'play' || G.paused) return;
    G.camZoom = clamp(G.camZoom * (e.deltaY < 0 ? 1.08 : 0.926), 0.6, 1.7); camSave(); camSync();
  }, { passive: true });
  $('cClose').onclick = () => UI.showPanel(null);
  document.querySelectorAll('#cTabs button').forEach(b => { b.onclick = () => UI.renderChronik(b.dataset.c); });
  $('pChron').onclick = () => { UI.setPause(false); UI.showPanel('chronik'); };
  $('interactBtn').addEventListener('pointerdown', e => { e.preventDefault(); UI.openShop(); });
  $('pVib').onclick = () => { Haptic.on = !Haptic.on; try { localStorage.setItem('aschenfall-vib', Haptic.on ? '1' : '0'); } catch (err) { /* egal */ } UI.updateSndButton(); Haptic.buzz(30); };
  $('pGfx').onclick = () => { setGfx(G.gfx === '3d' ? '2d' : '3d'); };
  $('pQual').onclick = () => cycleQuality();
  $('pMenu').onclick = () => { saveGame(); UI.setPause(false); UI.showTitle(); };
  // Beim Wegwischen der App / Tab-Wechsel automatisch pausieren
  document.addEventListener('visibilitychange', () => { if (document.hidden && G.state === 'play' && !G.pausedMenu) UI.setPause(true); });
  $('sClose').onclick = () => UI.showPanel(null);
  $('sReset').onclick = () => { respec(); UI.renderSkills(); };
  $('btnSkills').addEventListener('pointerdown', e => { e.preventDefault(); UI.showPanel('skills'); });
  $('btnJunk').onclick = () => UI.junk();
  $('btnSort').onclick = () => UI.sortInv();
  $('sheetClose').onclick = () => { UI.sel = null; UI.renderPanel(); };
  document.querySelectorAll('#invBox .tabs button').forEach(b => { b.onclick = () => UI.setTab(b.dataset.t); });
  $('btnSnd').addEventListener('pointerdown', e => { e.preventDefault(); Sfx.init(); Sfx.setMuted(!Sfx.muted); });
  // Browser erlauben Audio erst nach der ersten Eingabe
  const unlock = () => Sfx.init();
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  // Tastatur
  window.addEventListener('keydown', e => {
    const k = e.key.toLowerCase();
    if (k === 'tab') e.preventDefault();
    if (e.repeat) return;
    if (k === 'i' || k === 'tab') { UI.showPanel('inv'); return; }
    if (k === 'k') { UI.showPanel('skills'); return; }
    if (k === 'c') { UI.showPanel('chronik'); return; }
    if (k === 'e') { UI.openShop(); return; }
    if (k === 'escape') { UI.togglePause(); return; }
    if (k === 'p') { UI.togglePause(); return; }
    Input.keys[k] = true;
    if (k >= '1' && k <= '4') { Input.held[+k - 1] = true; }
    if (k === 'q') usePotion();
  });
  window.addEventListener('keyup', e => {
    const k = e.key.toLowerCase();
    Input.keys[k] = false;
    if (k >= '1' && k <= '4') Input.held[+k - 1] = false;
  });
  window.addEventListener('blur', () => Input.releaseAll());
})();
