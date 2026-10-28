'use strict';
initArt();
window.addEventListener('resize', resize);
resize();
initR3();
let savedGfx = null;
try { savedGfx = localStorage.getItem('aschenfall-gfx'); } catch (e) { /* egal */ }
setGfx(savedGfx || '3d');
try {
  const cs = JSON.parse(localStorage.getItem('aschenfall-cam') || 'null');
  if (cs) { G.camZoom = clamp(cs.z || 1, 0.6, 1.7); G.camTilt = clamp(cs.t || 0.95, 0.55, 1.25); }
} catch (e) { /* egal */ }
if (UI.camSync) UI.camSync();

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.hitstop > 0) G.hitstop -= dt;
  else if (G.state === 'play' && !G.paused) update(dt);
  R3.dtReal = dt;
  render();
  if (G.map) UI.update(dt);
  requestAnimationFrame(frame);
}

UI.showTitle();
requestAnimationFrame(frame);
