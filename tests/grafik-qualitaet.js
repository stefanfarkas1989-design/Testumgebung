// Prüft die drei Grafikstufen: Nachbearbeitung/PBR-Schalter, Schatten, keine Fehler, Material-Cache.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const errs = [];
  for (const q of ['high', 'mid', 'low']) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } });
    p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
    await p.goto('http://localhost:8123/index.html');
    await p.evaluate(q => { localStorage.clear(); localStorage.setItem('aschenfall-q', q); }, q);
    await p.reload();
    await p.waitForTimeout(300);
    await p.click('#oButtons button');
    for (let i = 0; i < 40; i++) {
      const ov = await p.evaluate(() => !document.getElementById('storyOverlay').classList.contains('hidden'));
      if (!ov) { await p.waitForTimeout(150); if (!(await p.evaluate(() => !document.getElementById('storyOverlay').classList.contains('hidden')))) break; }
      await p.evaluate(() => document.getElementById('sNext').click()); await p.waitForTimeout(40);
    }
    const out = await p.evaluate(async q => {
      const S = Story.S(); S.letters = [1, 2, 3, 4, 5, 6]; S.floorsSeen = { crypt: 1, cave: 1, lava: 1, crypt_e: 1, cave_e: 1, lava_e: 1, void: 1 };
      Input.mode = 'touch';
      const res = { q: R3.level_q, post: R3.postOn, pbr: M3.pbr, shadow: R3.slots[0].light.castShadow };
      for (const floor of [1, 3, 5, 9]) {
        G.floor = floor; startFloor();
        for (let i = 0; i < 20; i++) { update(1 / 30); }
        await new Promise(r => setTimeout(r, 250));
      }
      res.theme = G.theme.id; res.textures = R3.renderer.info.memory.textures;
      return res;
    }, q);
    const expect = { high: [true, true, true], mid: [true, false, false], low: [false, false, false] }[q];
    if (out.post !== expect[0] || out.pbr !== expect[1] || out.shadow !== expect[2]) errs.push(`Falsche Schalter bei ${q}: ${JSON.stringify(out)}`);
    console.log(q, JSON.stringify(out));
    await p.close();
  }
  console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
