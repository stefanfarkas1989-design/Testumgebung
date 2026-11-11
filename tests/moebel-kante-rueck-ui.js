// Dekor wählen -> passende Kante wird vorgeschlagen; Rückwand wählen. Server auf Port 8123 nötig.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 1400 } });
  const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await pg.goto('http://localhost:8123/moebel/index.html'); await pg.waitForTimeout(1500);
  console.log('Kanten:', await pg.textContent('#kInfo')); console.log('Rückwand:', await pg.textContent('#bInfo'));
  await pg.fill('#dSearch', 'H1145'); await pg.waitForTimeout(200);
  await pg.locator('#dList button').first().click(); await pg.waitForTimeout(300);
  console.log('Kante-Suche:', await pg.inputValue('#kSearch'), '|', await pg.textContent('#kInfo'));
  const k = await pg.locator('#kList button').first().textContent(); console.log('1. Kante:', k.replace(/\s+/g, ' ').trim());
  await pg.locator('#kList button').first().click(); await pg.waitForTimeout(200);
  console.log('Kante A:', await pg.inputValue('#jKante'));
  await pg.fill('#bSearch', 'hdf'); await pg.waitForTimeout(200);
  const r = await pg.locator('#bList button').first().textContent(); console.log('1. Rückwand:', r.replace(/\s+/g, ' ').trim());
  await pg.locator('#bList button').first().click(); await pg.waitForTimeout(300);
  console.log('Rückwand:', await pg.inputValue('#jBack'), '| bt', await pg.evaluate(() => window.__moebel.state.bt), '| Liste:', await pg.evaluate(() => window.__moebel.model.cutlist.filter((g) => g.back).map((g) => g.l + 'x' + g.w + 'x' + g.thick).join()));
  await pg.click('#tabs button[data-tab=cut]'); await pg.waitForTimeout(200);
  console.log('Zuschnitt:', (await pg.locator('.sheet h3').allTextContents()).join(' | '));
  await pg.reload(); await pg.waitForTimeout(1500);
  console.log('nach Reload:', await pg.evaluate(() => [window.__moebel.state.kanteFe && window.__moebel.state.kanteFe.nr, window.__moebel.state.backFe && window.__moebel.state.backFe.nr, document.getElementById('back').value]));
  await pg.screenshot({ path: out + '/moebel-kante.png', clip: { x: 0, y: 600, width: 330, height: 800 } });
  if (errs.length) console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
