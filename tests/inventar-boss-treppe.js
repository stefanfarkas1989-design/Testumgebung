
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
const SC = process.argv[2];
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 900, height: 420 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8123/index.html');
  await startGame(p);
  const res = await p.evaluate(async () => {
    const log = [];
    Input.mode = 'touch';
    P.maxHp = P.hp = 99999; // Gott-Modus für den Test
    const step = n => { for (let i = 0; i < n; i++) { P.hp = 99999; P.mana = P.maxMana; update(1 / 60); } };
    let shotsDone = 0;
    // alle Gegner einzeln "besuchen": Spieler neben Gegner setzen und schießen
    for (let guard = 0; guard < 400 && G.enemies.length; guard++) {
      const e = G.enemies[0];
      P.x = e.x - 80; P.y = e.y;
      if (blockedAt(P.x, P.y, P.r)) { P.x = e.x + 40; P.y = e.y; }
      if (blockedAt(P.x, P.y, P.r)) { P.x = e.x; P.y = e.y; }
      Input.held = [true, P.lvl >= 2, P.lvl >= 3, false];
      step(30);
      if (G.floor !== 1) break;
    }
    log.push({ afterClear: { enemies: G.enemies.length, lvl: P.lvl, drops: G.drops.length, inv: P.inv.length, stairs: !!G.stairs, state: G.state } });
    // Beute einsammeln
    for (const d of G.drops.slice()) { P.x = d.x; P.y = d.y; step(2); }
    log.push({ inv: P.inv.length, rarities: P.inv.map(i => i.rarity + ':' + i.name) });
    // Ausrüsten
    if (P.inv.length) { equipFromInv(0); }
    log.push({ eq: Object.keys(P.eq).filter(k => P.eq[k]), stats: { dmg: P.dmgFlat, armor: P.armor, hp: P.maxHp } });
    // Treppe
    if (G.stairs) { P.x = G.stairs.x; P.y = G.stairs.y; step(2); }
    log.push({ floor: G.floor, enemies: G.enemies.length, save: !!localStorage.getItem('aschenfall-save') });
    return log;
  });
  console.log(JSON.stringify(res, null, 1));
  await p.waitForTimeout(300);
  await p.screenshot({ path: SC + '/floor2.png' });
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
