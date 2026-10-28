const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await p.waitForTimeout(300);
  await p.evaluate(() => { Story.S().letters = [1,2,3,4,5,6]; Story.S().floorsSeen = { crypt:1,cave:1,lava:1,crypt_e:1,cave_e:1,lava_e:1,void:1 }; });
  // Boss-Muster in allen Bossräumen: Spieler passiv (Gottmodus), Muster zählen
  const res = await p.evaluate(() => {
    Input.mode = 'touch'; const out = {};
    for (const floor of [1, 3, 5, 7, 8, 9, 10, 12]) {
      P.lvl = 12; P.ranks = {}; recalc(); G.floor = floor; startFloor();
      const r = G.bossRoom; P.x = (r.cx + 0.5) * TILE - 200; P.y = (r.cy + 0.5) * TILE; G.cam.x = P.x; G.cam.y = P.y;
      G.enemies = G.enemies.filter(e => e.boss); wake(G.boss);
      let strikes = 0, enemyProj = 0, maxEn = 0, zones = 0;
      for (let i = 0; i < 60 * 22; i++) {
        P.hp = P.maxHp; Input.held = [false, false, false, false];
        update(1 / 60);
        strikes = Math.max(strikes, G.hazards.filter(h => h.kind === 'strike').length);
        zones = Math.max(zones, G.hazards.filter(h => h.kind === 'zone').length);
        enemyProj = Math.max(enemyProj, G.projs.filter(p => !p.friend).length);
        maxEn = Math.max(maxEn, G.enemies.length);
      }
      out['f' + floor] = { boss: G.boss.name, strikes, zones, enemyProj, maxEn, theme: G.theme.id };
    }
    return out;
  });
  console.log(JSON.stringify(res, null, 1));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
