// Klickt im Browser auf "Zuschnitt-Formular" und prüft den Download. Server auf Port 8123 nötig.
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ acceptDownloads: true });
  const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await pg.goto('http://localhost:8123/moebel/index.html'); await pg.waitForTimeout(800);
  await pg.click('#btnJaf'); console.log('ohne Material:', await pg.textContent('#jafMsg'));
  await pg.fill('#jMat', '08103/0013 EGGER EUROSPAN® P2 E1E05, 100 % PEFC');
  const [dl] = await Promise.all([pg.waitForEvent('download', { timeout: 15000 }), pg.click('#btnJaf')]);
  console.log('Download:', dl.suggestedFilename(), '|', await pg.textContent('#jafMsg'));
  if (errs.length) console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
