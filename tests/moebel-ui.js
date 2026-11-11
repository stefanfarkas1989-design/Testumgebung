// Startet die Möbel-App im Browser und prüft Oberfläche + 3D. Aufruf (Server auf 8123): node tests/moebel-ui.js <ausgabeordner>
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const errs = [];
  pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  pg.on('console', (m) => { if (m.type() === 'error') errs.push('ERR ' + m.text()); });
  await pg.goto('http://localhost:8123/moebel/index.html');
  await pg.waitForTimeout(800);
  const parts = await pg.evaluate(() => window.__moebel.model.parts.length);
  console.log('Teile', parts);
  await pg.screenshot({ path: out + '/moebel-1.png' });
  await pg.selectOption('#preset', 'wuerfel'); await pg.waitForTimeout(300);
  await pg.fill('#explode', '40'); await pg.dispatchEvent('#explode', 'input');
  await pg.click('#tabs button[data-tab=cut]'); await pg.waitForTimeout(300);
  await pg.screenshot({ path: out + '/moebel-2.png', fullPage: true });
  await pg.click('#tabs button[data-tab=mat]');
  console.log('Material:', (await pg.textContent('#tab-mat')).replace(/\s+/g, ' ').slice(0, 160));
  await pg.click('#tabs button[data-tab=draw]'); await pg.waitForTimeout(200);
  console.log('Zeichnungen:', await pg.locator('#tab-draw figure svg').count());
  await pg.screenshot({ path: out + '/moebel-draw.png', fullPage: true });
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pg.click('#btnDraw')]);
  console.log('ZIP:', dl.suggestedFilename());
  if (errs.length) console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
