
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
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  for (const [name, vw, vh] of [['land', 844, 390], ['port', 390, 760]]) {
    const p = await b.newPage({ viewport: { width: vw, height: vh }, hasTouch: true });
    const errs = [];
    p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
    await p.goto('http://localhost:8123/index.html');
    await p.evaluate(() => localStorage.clear()); await p.reload();
    await startGame(p);
    await p.waitForTimeout(300);
    await p.evaluate(() => {
      P.lvl = 9; recalc();
      P.inv.push(makeItem('helm', 12, 'legendary'), makeItem('ring', 5, 'normal'), makeItem('chest', 9, 'rare'), makeItem('weapon', 3, 'magic'));
      P.inv[1].affixes = []; P.inv[1].rarity = 'normal';
      UI.showPanel('inv');
    });
    const out = {};
    if (name === 'port') await p.click('#invBox .tabs button[data-t="bag"]');
    // erstes Item im Rucksack antippen
    await p.click('#invGrid .cell:nth-child(1)');
    out.sheetOpen = await p.evaluate(() => document.getElementById('sheet').classList.contains('open'));
    out.hasCompare = await p.evaluate(() => !!document.querySelector('.cmpBox'));
    out.sel1 = await p.evaluate(() => JSON.stringify(UI.sel));
    // nochmal antippen => anlegen
    const nameBefore = await p.evaluate(() => P.inv[0].name);
    await p.click('#invGrid .cell:nth-child(1)');
    out.equipped = await p.evaluate(n => P.eq.helm && P.eq.helm.name === n, nameBefore);
    out.invLen = await p.evaluate(() => P.inv.length);
    // Sortieren
    await p.click('#btnSort');
    out.sorted = await p.evaluate(() => P.inv.map(i => i.rarity[0] + i.ilvl).join(','));
    // Wegwerfen: seltenes Item braucht zwei Klicks
    await p.evaluate(() => { UI.sel = { where: 'inv', key: 0 }; UI.renderPanel(); });
    const before = await p.evaluate(() => P.inv.length);
    await p.click('#bDrop');
    out.afterFirst = await p.evaluate(() => P.inv.length);
    out.confirmText = await p.evaluate(() => document.getElementById('bDrop').textContent);
    await p.click('#bDrop');
    out.afterSecond = await p.evaluate(() => P.inv.length);
    out.before = before;
    // Ablegen über Ausrüstungsslot (zweimal tippen)
    await p.evaluate(() => { UI.sel = null; UI.renderPanel(); });
    if (name === 'port') await p.click('#invBox .tabs button[data-t="eq"]');
    await p.click('#eqGrid .cell:nth-child(2)');
    await p.click('#eqGrid .cell:nth-child(2)');
    out.unequipped = await p.evaluate(() => !P.eq.helm);
    await p.screenshot({ path: `${SC}/inv2_${name}.png` });
    console.log(name, JSON.stringify(out), 'ERR', JSON.stringify(errs));
    await p.close();
  }
  await b.close();
})();
