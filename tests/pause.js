
async function startGame(p) {
  await p.click('#oButtons button');
  for (let i = 0; i < 60; i++) {
    const st = await p.evaluate(() => ({ ov: !document.getElementById('storyOverlay').classList.contains('hidden'), wait: !!window.G && G.state !== 'play' }));
    if (!st.ov) { await p.waitForTimeout(120); const again = await p.evaluate(() => !document.getElementById('storyOverlay').classList.contains('hidden')); if (!again && st.wait === false) break; if (!again) { if (await p.evaluate(() => G.state === 'play')) break; } continue; }
    await p.evaluate(() => document.getElementById('sNext').click()); await p.waitForTimeout(40);
  }
  await p.evaluate(() => { const S = Story.S(); S.letters = [1,2,3,4,5,6]; S.floorsSeen = { crypt:1, cave:1, lava:1, crypt_e:1, cave_e:1, lava_e:1, void:1 }; });
}
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await startGame(p);
  await p.waitForTimeout(500);
  const t0 = await p.evaluate(() => G.time);
  await p.click('#btnPause');
  await p.waitForTimeout(600);
  const r1 = await p.evaluate(() => ({ paused: G.paused, menu: G.pausedMenu, t: G.time, shown: !document.getElementById('pauseOverlay').classList.contains('hidden') }));
  await p.screenshot({ path: process.argv[2] + '/pause.png' });
  await p.click('#pResume');
  await p.waitForTimeout(500);
  const r2 = await p.evaluate(() => ({ paused: G.paused, t: G.time }));
  await p.keyboard.press('p'); await p.waitForTimeout(200);
  const r3 = await p.evaluate(() => G.pausedMenu);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  const r4 = await p.evaluate(() => G.pausedMenu);
  // Inventar + Esc
  await p.keyboard.press('i'); await p.waitForTimeout(100);
  const r5 = await p.evaluate(() => G.paused);
  await p.keyboard.press('Escape'); await p.waitForTimeout(100);
  const r6 = await p.evaluate(() => ({ paused: G.paused, menu: G.pausedMenu }));
  // Hauptmenü
  await p.click('#btnPause'); await p.click('#pMenu'); await p.waitForTimeout(200);
  const r7 = await p.evaluate(() => ({ state: G.state, overlay: !document.getElementById('overlay').classList.contains('hidden'), btns: document.querySelectorAll('#oButtons button').length }));
  console.log(JSON.stringify({ t0, r1, r2, r3, r4, r5, r6, r7 }));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
