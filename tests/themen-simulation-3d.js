
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
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text()); });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await startGame(p);
  await p.waitForTimeout(300);
  for (const [name, floor, types] of [['crypt', 1, ['skeleton','archer','imp','brute']], ['cave', 3, ['bat','spider','golem','skeleton']], ['lava', 5, ['hound','cultist','demon','imp']]]) {
    const info = await p.evaluate(({ floor, types }) => {
      Input.mode = 'touch';
      P.lvl = 8; recalc(); P.hp = P.maxHp;
      G.floor = floor; startFloor();
      const out = { theme: G.theme.id, props: G.props.length, pillars: G.props.filter(p => p.kind === 'pillar').length, enemies: G.enemies.length, torches: G.torches.length };
      // Raum mit Props wählen
      const r = G.rooms.filter(r => r !== G.startRoom && r !== G.bossRoom).sort((a, b) => (b.w * b.h) - (a.w * a.h))[0];
      P.x = (r.cx + 0.5) * TILE - 100; P.y = (r.cy + 0.5) * TILE; G.cam.x = P.x; G.cam.y = P.y;
      G.enemies.forEach(e => e.state = 'idle');
      G.enemies = G.enemies.filter(e => Math.hypot(e.x - P.x, e.y - P.y) > 900);
      types.forEach((t, i) => { const e = spawnEnemy(t, P.x + 90 + (i % 2) * 70, P.y - 70 + i * 45, i === 2); e.state = 'idle'; e.ang = Math.PI; e.fl = -1; });
      addStrike(P.x + 40, P.y + 90, 60, 5, 10, 'fire');
      addZone(P.x - 60, P.y + 70, 50, 20, 5, G.theme.id === 'cave' ? 'poison' : 'fire', 0);
      return out;
    }, { floor, types });
    console.log(name, JSON.stringify(info));
    await p.waitForTimeout(400);
    await p.screenshot({ path: `${SC}/theme_${name}.png` });
  }
  // Kampfsimulation je Thema: alles töten (Gottmodus), alle Bosse
  const sim = await p.evaluate(() => {
    const res = [];
    for (const floor of [1, 3, 5, 7]) {
      P.lvl = 14; for (const n of TREE) P.ranks[n.id] = n.max; recalc();
      G.floor = floor; startFloor();
      Input.mode = 'touch';
      const total = G.enemies.length, bossName = G.boss.name;
      let steps = 0, hurt = 0;
      for (let g = 0; g < 500 && G.enemies.length; g++) {
        const e = G.enemies[0];
        P.x = e.x - 90; P.y = e.y;
        if (blockedAt(P.x, P.y, P.r)) { P.x = e.x + 40; P.y = e.y; }
        if (blockedAt(P.x, P.y, P.r)) { P.x = e.x; P.y = e.y; }
        Input.held = [true, true, true, false];
        for (let i = 0; i < 40; i++) { P.hp = P.maxHp; P.mana = P.maxMana; for (let j = 0; j < 3; j++) P.cd[j] = Math.min(P.cd[j], 0.05); if (G.hitstop > 0) G.hitstop = 0; update(1 / 60); steps++; }
        if (G.floor !== floor) break;
      }
      res.push({ floor, theme: G.theme.id, total, left: G.enemies.length, boss: bossName, stairs: !!G.stairs, hazards: G.hazards.length, props: G.props.length });
    }
    return res;
  });
  console.log(JSON.stringify(sim));
  // Legendäre Kräfte
  const pw = await p.evaluate(() => {
    const out = {};
    for (const pw of POWERS) {
      const it = makeItem('weapon', 10, 'legendary'); it.power = pw.id; P.eq.weapon = it; recalc();
      G.floor = 2; startFloor(); Input.mode = 'touch';
      for (let k = 0; k < 6; k++) { const e = spawnEnemy('skeleton', P.x + 70 + k * 14, P.y + (k % 3) * 12 - 12); e.state = 'chase'; }
      for (let i = 0; i < 240; i++) { Input.held = [true, i % 25 === 0, false, false]; P.mana = P.maxMana; if (G.hitstop > 0) G.hitstop = 0; update(1 / 60); }
      out[pw.id] = 'ok';
    }
    return out;
  });
  console.log(JSON.stringify(pw));
  console.log('ERRORS', JSON.stringify(errs));
  await b.close();
})();
