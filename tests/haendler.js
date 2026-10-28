const { chromium } = require('playwright');
const SC = process.argv[2];
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(300);
  await p.click('#oButtons button');
  for (let i = 0; i < 40; i++) { const ov = await p.evaluate(() => !document.getElementById('storyOverlay').classList.contains('hidden')); if (!ov) { await p.waitForTimeout(150); if (!(await p.evaluate(() => !document.getElementById('storyOverlay').classList.contains('hidden')))) break; } await p.evaluate(() => document.getElementById('sNext').click()); await p.waitForTimeout(40); }
  await p.waitForTimeout(500);
  const out = {};
  out.chest = await p.evaluate(() => !!G.chest);
  // Gold sammeln
  await p.evaluate(() => { Input.mode = 'touch'; P.lvl = 8; recalc(); dropGold(P.x + 10, P.y, 250); dropGold(P.x - 10, P.y, 150); });
  await p.waitForTimeout(600);
  out.gold = await p.evaluate(() => P.gold);
  // Zur Truhe gehen
  await p.evaluate(() => { P.x = G.chest.x - 40; P.y = G.chest.y + 20; G.cam.x = P.x; G.cam.y = P.y; for (let i = 0; i < 5; i++) update(0.02); });
  await p.waitForTimeout(400);
  out.btnVisible = await p.evaluate(() => !document.getElementById('interactBtn').classList.contains('hidden'));
  await p.screenshot({ path: SC + '/shop_chest.png' });
  await p.keyboard.press('e'); await p.waitForTimeout(300);
  out.open = await p.evaluate(() => ({ shop: UI.shopMode, title: document.getElementById('invTitle').textContent, hasBuy: !!document.getElementById('bPotion') }));
  // Kaufen
  await p.evaluate(() => { P.potions = 1; for (let i = 0; i < 3; i++) P.inv.push(makeItem(['weapon','ring','helm'][i], 8, ['rare','magic','legendary'][i])); UI.renderPanel(); UI.sel = { where: 'inv', key: 0 }; UI.renderPanel(); });
  const g0 = await p.evaluate(() => P.gold);
  await p.click('#bPotion');
  out.potion = await p.evaluate(() => P.potions);
  await p.click('#bItem');
  out.invAfterBuy = await p.evaluate(() => P.inv.length);
  // Verzaubern
  await p.evaluate(() => { UI.sel = { where: 'inv', key: 0 }; UI.renderPanel(); });
  const before = await p.evaluate(() => JSON.stringify(P.inv[0].affixes));
  await p.click('#bReroll');
  out.rerolled = await p.evaluate(b => JSON.stringify(P.inv[0].affixes) !== b, before);
  await p.screenshot({ path: SC + '/shop_open.png' });
  // Verkaufen (Seltenes braucht 2 Klicks)
  const n0 = await p.evaluate(() => P.inv.length), gold0 = await p.evaluate(() => P.gold);
  await p.click('#bSell'); await p.click('#bSell');
  out.sold = await p.evaluate(({ n0, gold0 }) => ({ lenDiff: n0 - P.inv.length, goldGain: P.gold - gold0 }), { n0, gold0 });
  out.goldSpent = g0 - await p.evaluate(() => P.gold);
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  out.closed = await p.evaluate(() => !G.paused);
  console.log(JSON.stringify(out));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
