
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
  const b = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 844, height: 390 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERR ' + e.stack));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)); });
  await p.goto('http://localhost:8123/index.html');
  await p.evaluate(() => localStorage.clear()); await p.reload();
  await startGame(p);
  await p.waitForTimeout(500);
  // Bosse
  for (const [name, floor] of [['boss_bone', 1], ['boss_queen', 3], ['boss_lava', 5]]) {
    await p.evaluate(({ floor }) => {
      Input.mode = 'touch'; P.lvl = 10; recalc(); P.hp = P.maxHp;
      G.floor = floor; startFloor();
      const r = G.bossRoom;
      P.x = (r.cx + 0.5) * TILE - 150; P.y = (r.cy + 0.5) * TILE; G.cam.x = P.x + 70; G.cam.y = P.y;
      G.enemies = G.enemies.filter(e => e.boss); G.boss.state = 'idle'; G.boss.ang = Math.PI;
      window.__lock = setInterval(() => { G.boss.state = 'idle'; G.boss.ang = Math.PI; G.boss.x = (r.cx + 0.5) * TILE; G.boss.y = (r.cy + 0.5) * TILE; }, 30);
    }, { floor });
    await p.waitForTimeout(900);
    await p.screenshot({ path: `${SC}/g3d_${name}.png` });
    await p.evaluate(() => clearInterval(window.__lock));
  }
  // Draw-Calls & Zielgenauigkeit
  const info = await p.evaluate(() => {
    const ri = R3.renderer.info;
    const sx = 600, sy = 200;
    const w = screenToWorld(sx, sy);
    // zurückprojizieren
    const pr = project(w.x, 0, w.y);
    return { calls: ri.render.calls, tris: ri.render.triangles, geos: ri.memory.geometries, pr, target: [sx, sy], lights: R3.slots.filter(s => s.cur > 0.05).length };
  });
  console.log(JSON.stringify(info));
  // Kampf in 3D mit allen Skills und Gegnern
  const res = await p.evaluate(async () => {
    G.floor = 3; startFloor(); Input.mode = 'touch';
    P.lvl = 14; for (const n of TREE) P.ranks[n.id] = n.max; recalc(); P.hp = P.maxHp;
    const r = G.rooms.find(r => r !== G.startRoom && r !== G.bossRoom);
    P.x = (r.cx + 0.5) * TILE; P.y = (r.cy + 0.5) * TILE; G.cam.x = P.x; G.cam.y = P.y;
    for (let k = 0; k < 8; k++) { const e = spawnEnemy(['skeleton','spider','golem','hound','bat'][k % 5], P.x + 100 + k * 18, P.y + (k % 4) * 30 - 45); e.state = 'chase'; }
    return 'ok';
  });
  for (let i = 0; i < 12; i++) {
    await p.evaluate((i) => { Input.held = [true, i % 3 === 0, i % 2 === 0, i % 5 === 0]; P.hp = P.maxHp; P.mana = P.maxMana; }, i);
    await p.waitForTimeout(250);
    if (i === 6) await p.screenshot({ path: `${SC}/g3d_fight.png` });
  }
  const st = await p.evaluate(() => ({ enemies: G.enemies.length, rigs: R3.maps.rigs.size, parts: G.parts.length, calls: R3.renderer.info.render.calls }));
  console.log(JSON.stringify(st));
  // 2D/3D-Umschalten und Qualität
  const sw = await p.evaluate(() => { setGfx('2d'); const a = G.gfx; return a; });
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${SC}/g2d_after.png` });
  await p.evaluate(() => { setGfx('3d'); cycleQuality(); cycleQuality(); });
  await p.waitForTimeout(600);
  console.log('quality', await p.evaluate(() => [G.quality, R3.level_q, G.gfx]));
  console.log('ERRORS', JSON.stringify(errs.slice(0, 6)));
  await b.close();
})();
