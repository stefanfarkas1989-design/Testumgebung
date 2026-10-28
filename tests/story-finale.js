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
  await p.waitForTimeout(300);
  const clickThrough = async () => {
    for (let i = 0; i < 40; i++) {
      const st = await p.evaluate(() => ({ ov: !document.getElementById('storyOverlay').classList.contains('hidden'), ch: !document.getElementById('sChoices').classList.contains('hidden') }));
      if (!st.ov || st.ch) return st;
      await p.evaluate(() => document.getElementById('sNext').click()); await p.waitForTimeout(40);
    }
  };
  // Neues Spiel durchklicken
  await p.click('#oButtons button'); await clickThrough(); await p.waitForTimeout(300); await clickThrough();
  // Thron vorbereiten
  for (const [name, floor] of [['f7', 7], ['f9', 9]]) {
    await p.evaluate(({ floor }) => {
      Input.mode = 'touch'; P.lvl = 16; for (const n of TREE) P.ranks[n.id] = n.max; recalc(); P.hp = P.maxHp;
      for (let i = 0; i < 45; i++) Story.S().names.push('Testname ' + i);
      G.floor = floor; startFloor();
    }, { floor });
    await clickThrough(); await p.waitForTimeout(300);
    await p.evaluate(() => {
      const r = G.bossRoom; P.x = (r.cx + 0.5) * TILE - 170; P.y = (r.cy + 0.5) * TILE; G.cam.x = P.x + 60; G.cam.y = P.y;
      G.enemies = G.enemies.filter(e => e.boss); G.boss.state = 'idle'; G.boss.ang = Math.PI;
      window.__lock = setInterval(() => { if (G.boss.state === 'idle') { G.boss.ang = Math.PI; G.boss.x = (r.cx + 0.5) * TILE; G.boss.y = (r.cy + 0.5) * TILE; } }, 30);
    });
    await p.waitForTimeout(1100);
    await p.screenshot({ path: `${SC}/s_${name}.png` });
    await p.evaluate(() => clearInterval(window.__lock));
  }
  // Boss-Kampf simulieren (Gottmodus): Schweigen
  const sim = await p.evaluate(() => {
    const out = { name: G.boss.name, theme: G.theme.id };
    wake(G.boss);
    let strikes = 0, projs = 0, summons = 0;
    for (let i = 0; i < 60 * 25; i++) {
      P.hp = P.maxHp; P.mana = P.maxMana;
      Input.held = [true, true, true, false]; P.cd = [0, 0, 0, 0];
      if (G.hitstop > 0) G.hitstop = 0;
      update(1 / 60);
      strikes = Math.max(strikes, G.hazards.filter(h => h.kind === 'strike').length);
      projs = Math.max(projs, G.projs.filter(p => !p.friend).length);
      summons = Math.max(summons, G.enemies.length);
      if (G.modal) break;
    }
    out.strikes = strikes; out.projs = projs; out.enemies = summons; out.bossHp = Math.round(G.boss.hp); out.modal = G.modal;
    return out;
  });
  console.log('sim', JSON.stringify(sim));
  // Finale auslösen
  await p.evaluate(() => { if (!G.modal) killEnemy(G.boss); });
  await p.waitForTimeout(300);
  await p.screenshot({ path: SC + '/s_finale1.png' });
  const st = await clickThrough();
  console.log('choice visible', JSON.stringify(st));
  await p.waitForTimeout(300);
  await p.screenshot({ path: SC + '/s_choice.png' });
  const btns = await p.evaluate(() => [...document.querySelectorAll('#sChoices button')].map(b => ({ t: b.querySelector('b').textContent, dis: b.disabled })));
  console.log('buttons', JSON.stringify(btns));
  // Ende 3 wählen
  await p.evaluate(() => document.querySelectorAll('#sChoices button')[2].click());
  await p.waitForTimeout(300);
  await clickThrough();
  await p.waitForTimeout(300);
  await p.screenshot({ path: SC + '/s_end3.png' });
  await clickThrough();
  await p.waitForTimeout(500);
  console.log('after ending', JSON.stringify(await p.evaluate(() => ({ ending: Story.S().ending, floor: G.floor, theme: G.theme.id, modal: G.modal, enemy: G.enemies[0] && G.enemies[0].name }))));
  await p.screenshot({ path: SC + '/s_echo10.png' });
  // Enden 1 & 2 durchspielen (Smoke)
  for (const n of [1, 2]) {
    await p.evaluate(n => { Story.ending(n); }, n);
    await clickThrough(); await p.waitForTimeout(200); await clickThrough(); await p.waitForTimeout(300);
    console.log('ending', n, JSON.stringify(await p.evaluate(() => ({ ending: Story.S().ending, floor: G.floor, modal: G.modal }))));
  }
  console.log('ERRORS', JSON.stringify(errs.slice(0, 5)));
  await b.close();
})();
