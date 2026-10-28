
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
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await startGame(p);
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const out = {};
    Input.mode = 'touch';
    P.lvl = 12; recalc(); P.hp = P.maxHp;
    out.pts = pointsAvail();
    // Punkte vergeben: Feuer komplett, Blitz-Basis, Passiv
    const want = ['fire_dmg','fire_dmg','fire_dmg','fire_splash','fire_pierce','fire_split','fire_cap','nova_freeze','bolt_chain','p_life','p_crit'];
    const spent = [];
    for (const id of ['fire_dmg','fire_dmg','fire_dmg','fire_splash','fire_splash','fire_pierce','fire_split','fire_cap','p_life']) spent.push(id + ':' + spendPoint(id));
    out.spent = spent;
    out.left = pointsAvail();
    out.cantLocked = canSpend('fire_cap') ;
    out.fx = { dmg: P.fx.fireDmg, split: P.fx.fireSplit, inf: P.fx.fireInferno, hp: P.maxHp };
    // Alle Skill-Varianten durchtesten: alles maximal setzen
    P.ranks = {}; for (const n of TREE) P.ranks[n.id] = n.max; recalc();
    P.hp = P.maxHp; P.mana = P.maxMana;
    for (let k = 0; k < 6; k++) { const e = spawnEnemy('skeleton', P.x + 80 + k * 25, P.y + (k % 2) * 30 - 15); e.state = 'chase'; e.maxHp = e.hp = 300; }
    const kills0 = G.enemies.length;
    for (let i = 0; i < 600; i++) {
      Input.held = [true, i % 30 === 0, i % 20 === 0, i % 90 === 0];
      P.hp = P.maxHp; P.mana = P.maxMana;
      for (let j = 0; j < 4; j++) P.cd[j] = Math.min(P.cd[j], 0.05);
      if (G.hitstop > 0) { G.hitstop = 0; }
      update(1 / 60);
    }
    out.enemiesLeft = G.enemies.length; out.kills0 = kills0;
    // UI
    P.ranks = {}; recalc(); P.lvl = 8; recalc();
    UI.showPanel('skills');
    out.panelOpen = !document.getElementById('skillPanel').classList.contains('hidden');
    out.cols = document.querySelectorAll('.scol').length; out.nodes = document.querySelectorAll('.node').length;
    out.paused = G.paused;
    return out;
  });
  console.log(JSON.stringify(r));
  await p.waitForTimeout(200);
  // Klick auf einen Knoten
  await p.click('.node.avail');
  await p.waitForTimeout(200);
  await p.screenshot({ path: process.argv[2] + '/skills.png' });
  console.log('after click pts', await p.evaluate(() => pointsAvail()), 'badge', await p.evaluate(() => document.getElementById('btnSkills').dataset.n));
  await p.keyboard.press('Escape');
  console.log('closed', await p.evaluate(() => !G.paused));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
