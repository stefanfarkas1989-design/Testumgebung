const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.click('#oButtons button');
  for (let i = 0; i < 60; i++) {
    if (await p.evaluate(() => G.state === 'play')) break;
    await p.evaluate(() => document.getElementById('sNext').click()); await p.waitForTimeout(80);
  }
  await p.waitForTimeout(300);
  const r = await p.evaluate(() => {
    G.run.kills = 7; G.run.gold = 123; G.run.bosses = 1;
    P.hp = 1; P.invulnT = 0; hurtPlayer(9999, P.x + 10, P.y);
    const txt = document.getElementById('oText').textContent;
    const shown = !document.getElementById('overlay').classList.contains('hidden');
    const dead = G.state === 'dead';
    document.querySelector('#oButtons button').click();
    return { txt, shown, dead, kills: G.run.kills, state: G.state };
  });
  console.log(JSON.stringify(r));
  const ok = r.dead && r.shown && /Besiegt: 7 \(davon 1 Boss\)/.test(r.txt) && /Gold gesammelt: 123/.test(r.txt) && r.kills === 0;
  if (!ok) errs.push('PAGEERR Zusammenfassung falsch');
  if (errs.length) console.log(errs.join('\n')); else console.log('OK');
  await b.close();
})();
