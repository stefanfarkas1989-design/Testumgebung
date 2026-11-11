// Dekorsuche: "eiche 19" suchen, ersten Treffer wählen, Übernahme prüfen. Server auf Port 8123 nötig.
const { chromium } = require('playwright');
(async () => {
  const out = process.argv[2] || '/tmp';
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'] });
  const pg = await b.newPage({ viewport: { width: 1280, height: 1000 } });
  const errs = []; pg.on('pageerror', (e) => errs.push('PAGEERR ' + e.message));
  await pg.goto('http://localhost:8123/moebel/index.html'); await pg.waitForTimeout(1200);
  console.log('Info:', await pg.textContent('#dInfo'));
  await pg.fill('#dSearch', 'egger eiche'); await pg.waitForTimeout(200);
  console.log('Treffer:', await pg.locator('#dList button').count(), '|', await pg.textContent('#dInfo'));
  const first = await pg.locator('#dList button').first().textContent();
  await pg.locator('#dList button').first().click(); await pg.waitForTimeout(300);
  const s = await pg.evaluate(() => ({ t: window.__moebel.state.t, sheet: window.__moebel.state.sheet, fe: window.__moebel.state.fe, mat: document.getElementById('jMat').value, tSel: document.getElementById('t').value, sheetTxt: document.querySelector('#sheet option:checked').textContent }));
  console.log('Gewählt:', first.trim().slice(0, 80)); console.log(JSON.stringify(s));
  await pg.screenshot({ path: out + '/moebel-dekor.png' });
  await pg.reload(); await pg.waitForTimeout(1000);
  console.log('nach Reload:', await pg.evaluate(() => window.__moebel.state.fe && window.__moebel.state.fe.nr), await pg.evaluate(() => document.querySelector('#material option:checked').textContent));
  if (errs.length) console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
