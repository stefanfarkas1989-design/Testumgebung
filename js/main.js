'use strict';
window.addEventListener('resize', resize);
resize();

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  if (G.state === 'play' && !G.paused) update(dt);
  render();
  if (G.map) UI.update(dt);
  requestAnimationFrame(frame);
}

UI.showTitle();
requestAnimationFrame(frame);
