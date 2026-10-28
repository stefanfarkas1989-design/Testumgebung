'use strict';
// Rendering: Kacheln -> Figuren -> dynamisches Licht (multiply) -> leuchtende Effekte (additiv)

const LM = document.createElement('canvas'), lctx = LM.getContext('2d');
const LS = 0.5; // Auflösung der Lichtkarte relativ zum Bildschirm
function resizeLight() {
  LM.width = Math.ceil(canvas.width * LS); LM.height = Math.ceil(canvas.height * LS);
}


function render() {
  const { dpr, zoom, vw, vh } = G;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  ctx.fillStyle = '#050408';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!G.map || !ART.ready) return;

  G.glows.length = 0;
  const sx = (G.shake ? rnd(-G.shake, G.shake) : 0) + G.kx, sy = (G.shake ? rnd(-G.shake, G.shake) : 0) + G.ky;
  const sc = zoom * dpr, tx0 = (vw / 2 - G.cam.x * zoom + sx) * dpr, ty0 = (vh / 2 - G.cam.y * zoom + sy) * dpr;
  ctx.setTransform(sc, 0, 0, sc, tx0, ty0);

  const hw = vw / zoom / 2 + TILE, hh = vh / zoom / 2 + TILE;
  const vx0 = G.cam.x - hw, vx1 = G.cam.x + hw, vy0 = G.cam.y - hh, vy1 = G.cam.y + hh;
  const x0 = Math.max(0, Math.floor(vx0 / TILE)), x1 = Math.min(MW - 1, Math.floor(vx1 / TILE));
  const y0 = Math.max(0, Math.floor(vy0 / TILE)), y1 = Math.min(MH - 1, Math.floor(vy1 / TILE));
  const inView = (x, y, m) => x > vx0 - m && x < vx1 + m && y > vy0 - m && y < vy1 + m;
  const isF = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && G.map[y * MW + x] === 1;
  const T1 = TILE + 1;

  const S = G.set, th = G.theme;
  // ---- Kacheln ----
  for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
    const i = ty * MW + tx, px = tx * TILE, py = ty * TILE, h = (tx * 73856093 ^ ty * 19349663) >>> 0;
    if (G.map[i] || G.deco[i]) {
      ctx.drawImage(S.floor[h % S.floor.length], px, py, T1, T1);
      if (!isF(tx, ty - 1)) ctx.drawImage(ART.ao.N, px, py, T1, T1);
      if (!isF(tx - 1, ty)) ctx.drawImage(ART.ao.W, px, py, T1, T1);
      if (!isF(tx + 1, ty)) ctx.drawImage(ART.ao.E, px, py, T1, T1);
    } else if (isF(tx, ty + 1)) {
      ctx.drawImage(S.face[h % S.face.length], px, py, T1, T1);
    } else {
      ctx.drawImage(S.roof[h % S.roof.length], px, py, T1, T1);
      if (isF(tx, ty - 1)) { ctx.fillStyle = th.pal.rim; ctx.fillRect(px, py, T1, 3); }
    }
  }

  // Wand-Lichtquellen (Halterungen)
  for (const t of G.torches) {
    if (!inView(t.x, t.y, 40)) continue;
    if (th.wall === 'crystal') {
      poly('#3a8aa8', t.x - 9, t.y + 8, t.x - 6, t.y - 10, t.x - 1, t.y + 8);
      poly('#6ad0ec', t.x - 2, t.y + 10, t.x + 2, t.y - 18, t.x + 8, t.y + 10);
      poly('#9a70d8', t.x + 6, t.y + 9, t.x + 10, t.y - 6, t.x + 13, t.y + 9);
      poly('rgba(255,255,255,.35)', t.x + 2, t.y - 18, t.x + 4, t.y - 6, t.x + 2, t.y + 6);
    } else if (th.wall === 'brazier') {
      rrect(t.x - 1.5, t.y + 2, 3, 14, 1, '#1c1418');
      ell(t.x, t.y + 1, 11, 4.5, '#1c1418'); ell(t.x, t.y - 1, 9, 3, '#3a2a2a');
      ctx.fillStyle = '#ff6a1e'; ctx.beginPath(); ctx.ellipse(t.x, t.y - 1, 7, 2.2, 0, 0, 6.283); ctx.fill();
    } else {
      rrect(t.x - 2, t.y - 2, 4, 16, 1, '#2a2018');
      rrect(t.x - 5, t.y - 4, 10, 4, 1, '#4a3a28');
      rrect(t.x - 3, t.y - 8, 6, 6, 2, '#3a2c1c');
    }
  }

  // Spuren am Boden
  for (const d of G.decals) {
    if (!inView(d.x, d.y, 60)) continue;
    if (d.bony) {
      ctx.lineCap = 'round';
      for (const b of d.bits) {
        ctx.strokeStyle = '#cfc7aa'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(d.x + b.dx, d.y + b.dy);
        ctx.lineTo(d.x + b.dx + Math.cos(b.a) * b.l * 0.7, d.y + b.dy + Math.sin(b.a) * b.l * 0.7); ctx.stroke();
      }
      ctx.globalAlpha = 0.35; ell(d.x, d.y + 3, 12, 5, '#3a0a10'); ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = 0.5;
      for (const b of d.bits) ell(d.x + b.dx, d.y + b.dy, b.l * 0.5, b.l * 0.32, d.boss ? '#3a1050' : '#4a0a12');
      ctx.globalAlpha = 1;
    }
  }

  // ---- Figuren (nach y sortiert) ----
  const ents = [];
  for (const e of G.enemies) if (inView(e.x, e.y, 80)) ents.push(e);
  for (const p of G.props) if (inView(p.x, p.y, 70)) ents.push(p);
  ents.push(P);
  ents.sort((a, b) => a.y - b.y);
  for (const e of ents) { if (e === P) drawPlayer(); else if (e.kind) drawProp(e); else drawEnemy(e); }

  // ---- Lichtkarte ----
  lctx.setTransform(1, 0, 0, 1, 0, 0);
  lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;
  lctx.fillStyle = th.ambient; lctx.fillRect(0, 0, LM.width, LM.height);
  lctx.setTransform(sc * LS, 0, 0, sc * LS, tx0 * LS, ty0 * LS);
  lctx.globalCompositeOperation = 'lighter';
  const light = (x, y, r, color, a) => {
    if (!inView(x, y, r)) return;
    lctx.globalAlpha = a; lctx.drawImage(glowSprite(color), x - r, y - r, 2 * r, 2 * r);
  };
  const flick = (ph, f) => 0.85 + 0.15 * Math.sin(G.time * 11 + ph) + 0.07 * Math.sin(G.time * 27 + ph * 2.3) * f;
  light(P.x, P.y, 420, '255,226,190', 1);
  for (const t of G.torches) {
    if (th.wall === 'crystal') light(t.x, t.y + 10, 230, th.lightCol, 0.8 + 0.12 * Math.sin(G.time * 2 + t.ph));
    else light(t.x, t.y + 14, th.wall === 'brazier' ? 270 : 250, th.lightCol, 0.95 * flick(t.ph, 1));
  }
  for (const p of G.props) {
    const L = PROP_LIGHT[p.kind];
    if (L) light(p.x, p.y - 8, L.r, L.c, L.a * (L.flick ? flick(p.seed, 1) : 1));
  }
  for (const h of G.hazards) {
    const pois = h.type === 'poison';
    if (h.warn > 0) light(h.x, h.y, h.r * 1.5, pois ? '120,255,90' : '255,80,40', 0.4 * (1 - h.warn / h.max));
    else if (h.kind === 'zone') light(h.x, h.y, h.r * 2.4, pois ? '120,255,90' : '255,110,40', 0.7);
  }
  for (const p of G.projs) {
    if (p.fire) light(p.x, p.y, 170 * (p.r / 8), '255,140,50', 0.95);
    else if (p.glow) light(p.x, p.y, 100, p.glow, 0.8);
  }
  for (const e of G.enemies) {
    if (e.boss) light(e.x, e.y, 170, '190,90,255', 0.55);
    else if (e.elite) light(e.x, e.y, 90, '255,200,60', 0.45);
    else if (e.type === 'imp') light(e.x, e.y, 60, '255,120,40', 0.35);
  }
  for (const d of G.drops) {
    if (d.potion) light(d.x, d.y, 50, '255,80,40', 0.6);
    else if (d.item.rarity === 'legendary') light(d.x, d.y, 110, '255,140,50', 0.9);
    else if (d.item.rarity === 'rare') light(d.x, d.y, 70, '255,216,74', 0.6);
    else if (d.item.rarity === 'magic') light(d.x, d.y, 50, '120,150,255', 0.5);
  }
  if (G.stairs) light(G.stairs.x, G.stairs.y, 190, '255,200,100', 0.7 + 0.2 * Math.sin(G.time * 4));
  for (const f of G.fx) {
    const k = 1 - f.t / f.max;
    if (f.type === 'ring') light(f.x, f.y, f.r * 1.3, f.color === '#c04bff' ? '190,90,255' : f.color === '#ff8a2a' ? '255,150,60' : '140,200,255', 0.8 * k);
    else if (f.type === 'bolt') for (const q of f.pts.slice(1)) light(q.x, q.y, 120, '140,200,255', 0.9 * k);
    else if (f.type === 'flash') light(f.x, f.y, f.r * 2.2, '255,220,160', 0.6 * k);
  }
  if (P.castAnim > 0) light(P.x, P.y, 220, '255,170,80', 0.5);
  lctx.globalCompositeOperation = 'source-over'; lctx.globalAlpha = 1;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(LM, 0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = 'source-over';

  // ---- Leuchtende Dinge (additiv) ----
  ctx.setTransform(sc, 0, 0, sc, tx0, ty0);
  ctx.globalCompositeOperation = 'lighter';
  const glow = (x, y, r, color, a) => { ctx.globalAlpha = a; ctx.drawImage(glowSprite(color), x - r, y - r, 2 * r, 2 * r); };
  for (const g of G.glows) if (inView(g.x, g.y, g.r)) glow(g.x, g.y, g.r, g.c, g.a === undefined ? 1 : g.a);
  if (th.pal.glow) {
    for (let ty = y0; ty <= y1; ty++) for (let tx = x0; tx <= x1; tx++) {
      const i = ty * MW + tx, h = (tx * 73856093 ^ ty * 19349663) >>> 0;
      const tex = (G.map[i] || G.deco[i]) ? S.floor[h % S.floor.length].glowTex : isF(tx, ty + 1) ? S.face[h % S.face.length].glowTex : null;
      if (!tex) continue;
      ctx.globalAlpha = 0.5 + 0.3 * Math.sin(G.time * 1.7 + tx * 0.7 + ty * 0.4);
      ctx.drawImage(tex, tx * TILE, ty * TILE, T1, T1);
    }
  }
  for (const t of G.torches) {
    if (!inView(t.x, t.y, 60)) continue;
    if (th.wall === 'crystal') glow(t.x + 2, t.y - 4, 50, th.lightCol, 0.6 + 0.2 * Math.sin(G.time * 2 + t.ph));
    else glow(t.x, t.y - 6, th.wall === 'brazier' ? 60 : 46, th.lightCol, 0.7 * flick(t.ph, 1));
  }
  for (const h of G.hazards) {
    if (!inView(h.x, h.y, h.r + 30)) continue;
    const pois = h.type === 'poison', col = pois ? '120,255,90' : '255,110,40';
    if (h.warn > 0) {
      const k = 1 - h.warn / h.max, pulse = 0.65 + 0.35 * Math.sin(G.time * 16);
      ctx.globalAlpha = 0.9 * pulse; ctx.strokeStyle = `rgb(${col})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, 6.283); ctx.stroke();
      ctx.globalAlpha = 0.18 + 0.3 * k; ctx.fillStyle = `rgb(${col})`;
      ctx.beginPath(); ctx.arc(h.x, h.y, Math.max(2, h.r * k), 0, 6.283); ctx.fill();
    } else if (h.kind === 'zone') {
      glow(h.x, h.y, h.r * 1.7, col, (0.5 + 0.15 * Math.sin(G.time * 6 + h.x)) * Math.min(1, h.life));
    }
  }
  const am = th.amb;
  for (const p of G.amb) {
    if (!inView(p.x, p.y, 10)) continue;
    glow(p.x, p.y, 5 * am.size * p.s, am.col, am.a * (0.5 + 0.5 * Math.sin(G.time * 2 + p.ph)));
  }
  for (const p of G.projs) {
    if (p.fire) { const k = p.r / 8; glow(p.x, p.y, 30 * k, '255,140,50', 0.95); glow(p.x, p.y, 14 * k, '255,255,200', 0.9); }
    else if (p.glow) { glow(p.x, p.y, 24, p.glow, 0.95); glow(p.x, p.y, 10, '255,255,200', 0.8); }
    else glow(p.x, p.y, 12, '255,255,200', 0.5);
  }
  if (G.stairs) glow(G.stairs.x, G.stairs.y, 48 + 6 * Math.sin(G.time * 4), '255,200,100', 0.8);
  for (const d of G.drops) {
    if (d.potion) { glow(d.x, d.y, 22, '255,80,40', 0.9); continue; }
    const c = d.item.rarity === 'legendary' ? '255,140,50' : d.item.rarity === 'rare' ? '255,216,74' : d.item.rarity === 'magic' ? '120,150,255' : '255,255,255';
    glow(d.x, d.y, d.item.rarity === 'normal' ? 14 : 28, c, d.item.rarity === 'normal' ? 0.5 : 0.85);
    if (d.item.rarity !== 'normal') {
      ctx.globalAlpha = 0.45 + 0.15 * Math.sin(d.t * 5);
      const gr = ctx.createLinearGradient(0, d.y - 90, 0, d.y);
      gr.addColorStop(0, `rgba(${c},0)`); gr.addColorStop(1, `rgba(${c},.8)`);
      ctx.fillStyle = gr; ctx.fillRect(d.x - 4, d.y - 90, 8, 90);
    }
  }
  for (const p of G.parts) {
    if (!p.add) continue;
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.6, 0, 6.283); ctx.fill();
  }
  for (const f of G.fx) {
    const k = f.t / f.max;
    if (f.type === 'ring') {
      const r = f.r * (0.2 + 0.8 * k);
      ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.color; ctx.lineWidth = 8 * (1 - k) + 2;
      ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.stroke();
      const gr = ctx.createRadialGradient(f.x, f.y, r * 0.3, f.x, f.y, r);
      const rc = f.color === '#ff8a2a' ? '255,140,50' : f.color === '#c04bff' ? '190,90,255' : '140,200,255';
      gr.addColorStop(0, `rgba(${rc},0)`); gr.addColorStop(1, `rgba(${rc},.35)`);
      ctx.globalAlpha = 1 - k; ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(f.x, f.y, r, 0, 6.283); ctx.fill();
    } else if (f.type === 'flash') {
      glow(f.x, f.y, f.r, '255,255,200', 1 - k);
    } else if (f.type === 'bolt') {
      ctx.globalAlpha = 1 - k; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
      for (const pass of [[9, 'rgba(90,150,255,.5)'], [3.5, '#e8f4ff']]) {
        ctx.strokeStyle = pass[1]; ctx.lineWidth = pass[0];
        ctx.beginPath();
        let seed = f.seed || (f.seed = Math.random() * 1000);
        for (let i = 0; i < f.pts.length; i++) {
          const q = f.pts[i];
          if (i === 0) ctx.moveTo(q.x, q.y);
          else {
            const a = f.pts[i - 1], n = 5;
            for (let j = 1; j <= n; j++) {
              const t = j / n, jig = j < n ? Math.sin(seed + j * 91.7 + i * 13.1 + G.time * 40) * 9 : 0;
              ctx.lineTo(a.x + (q.x - a.x) * t + jig, a.y + (q.y - a.y) * t - jig * 0.7);
            }
          }
        }
        ctx.stroke();
      }
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  // Nicht-additive Partikel (Blut, Knochensplitter)
  for (const p of G.parts) {
    if (p.add) continue;
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;

  // Fackel-Flammen, Projektil-Kerne, Beute-Symbole (selbstleuchtend)
  for (const t of G.torches) {
    if (!inView(t.x, t.y, 40) || th.wall === 'crystal') continue;
    const fl = Math.sin(G.time * 14 + t.ph), h = (th.wall === 'brazier' ? 17 : 11) + fl * 2.5 + Math.sin(G.time * 31 + t.ph) * 1.5;
    ctx.fillStyle = '#ff8a1e';
    ctx.beginPath(); ctx.moveTo(t.x - 4.5, t.y - 7); ctx.quadraticCurveTo(t.x - 5 + fl, t.y - 7 - h * 0.6, t.x + fl * 1.5, t.y - 7 - h);
    ctx.quadraticCurveTo(t.x + 5 + fl, t.y - 7 - h * 0.6, t.x + 4.5, t.y - 7); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd060';
    ctx.beginPath(); ctx.moveTo(t.x - 2.5, t.y - 7); ctx.quadraticCurveTo(t.x - 2.5, t.y - 7 - h * 0.45, t.x + fl * 0.8, t.y - 7 - h * 0.7);
    ctx.quadraticCurveTo(t.x + 2.5, t.y - 7 - h * 0.45, t.x + 2.5, t.y - 7); ctx.closePath(); ctx.fill();
  }
  for (const p of G.projs) {
    if (p.fire) { ctx.fillStyle = '#fff0b0'; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 0.56, 0, 6.283); ctx.fill(); }
    else if (p.glow) { ctx.fillStyle = '#f4ffe8'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 6.283); ctx.fill(); }
    else {
      const l = Math.hypot(p.vx, p.vy);
      ln(p.x - p.vx / l * 14, p.y - p.vy / l * 14, p.x, p.y, 2, '#e8e0c0');
    }
  }
  if (G.stairs) {
    ctx.fillStyle = '#06040a'; ctx.beginPath(); ctx.ellipse(G.stairs.x, G.stairs.y, 24, 17, 0, 0, 6.283); ctx.fill();
    ctx.strokeStyle = '#e8b36a'; ctx.lineWidth = 3; ctx.stroke();
  }
  ctx.textAlign = 'center';
  for (const d of G.drops) {
    const bob = Math.sin(d.t * 4) * 2;
    if (d.potion) {
      ctx.font = '16px system-ui'; ctx.fillText('🧪', d.x, d.y + 5 + bob);
      continue;
    }
    const R = RARITY[d.item.rarity];
    ctx.font = '17px system-ui'; ctx.fillText(SLOTS[d.item.slot].icon, d.x, d.y + 6 + bob);
    ctx.font = '12px system-ui'; ctx.lineWidth = 3; ctx.strokeStyle = '#000';
    ctx.strokeText(d.item.name, d.x, d.y - 14); ctx.fillStyle = R.color; ctx.fillText(d.item.name, d.x, d.y - 14);
  }

  // Schadenszahlen
  for (const t of G.texts) {
    ctx.globalAlpha = 1 - t.t / 0.9;
    ctx.font = (t.big ? 'bold 22px' : 'bold 15px') + ' system-ui';
    ctx.lineWidth = 3; ctx.strokeStyle = '#000'; ctx.strokeText(t.text, t.x, t.y - t.t * 40);
    ctx.fillStyle = t.color; ctx.fillText(t.text, t.x, t.y - t.t * 40);
  }
  ctx.globalAlpha = 1;

  // Vignette + Treffer-Blitz
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const W = canvas.width, H = canvas.height, rad = Math.hypot(W, H) / 2;
  const vg = ctx.createRadialGradient(W / 2, H / 2, rad * 0.45, W / 2, H / 2, rad);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  if (P.hp < P.maxHp * 0.3 && G.state === 'play') {
    const pr = 0.12 + 0.1 * Math.sin(G.time * 7);
    const lg = ctx.createRadialGradient(W / 2, H / 2, rad * 0.3, W / 2, H / 2, rad);
    lg.addColorStop(0, 'rgba(160,0,0,0)'); lg.addColorStop(1, `rgba(160,0,0,${pr * 3})`);
    ctx.fillStyle = lg; ctx.fillRect(0, 0, W, H);
  }
  if (G.hurtFlash > 0) { ctx.fillStyle = `rgba(200,0,0,${G.hurtFlash * 0.6})`; ctx.fillRect(0, 0, W, H); }
}
