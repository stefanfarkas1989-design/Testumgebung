'use strict';
const TILE = 48, MW = 64, MH = 64;

// Erzeugt: { map (Uint8Array, 1=Boden), rooms, start, boss }
function genDungeon() {
  const map = new Uint8Array(MW * MH);
  const rooms = [];
  const carve = (x, y, w, h) => {
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
      if (i > 1 && j > 1 && i < MW - 2 && j < MH - 2) map[j * MW + i] = 1;
    }
  };
  for (let t = 0; t < 300 && rooms.length < 11; t++) {
    const w = rint(7, 13), h = rint(7, 13), x = rint(3, MW - w - 4), y = rint(3, MH - h - 4);
    if (rooms.some(r => x < r.x + r.w + 3 && x + w + 3 > r.x && y < r.y + r.h + 3 && y + h + 3 > r.y)) continue;
    rooms.push({ x, y, w, h, cx: Math.floor(x + w / 2), cy: Math.floor(y + h / 2) });
    carve(x, y, w, h);
  }
  const corridor = (a, b) => {
    let x = a.cx, y = a.cy;
    while (x !== b.cx) { carve(x - 1, y - 1, 3, 3); x += Math.sign(b.cx - x); }
    while (y !== b.cy) { carve(x - 1, y - 1, 3, 3); y += Math.sign(b.cy - y); }
  };
  for (let i = 1; i < rooms.length; i++) corridor(rooms[i - 1], rooms[i]);
  if (rooms.length > 4) corridor(rooms[0], pick(rooms.slice(3))); // Schleife

  // Entfernung vom Start -> weitester Raum wird Bossraum
  const d = bfs(map, rooms[0].cx, rooms[0].cy, 9999);
  let boss = rooms[1], best = -1;
  for (const r of rooms.slice(1)) {
    const v = d[r.cy * MW + r.cx];
    if (v > best) { best = v; boss = r; }
  }
  return { map, rooms, start: rooms[0], boss };
}

// Breitensuche (4er-Nachbarschaft). Gibt Int16Array mit Schrittzahl zurück (-1 = unerreicht)
function bfs(map, sx, sy, maxD, out) {
  const d = out || new Int16Array(MW * MH);
  d.fill(-1);
  const q = new Int32Array(MW * MH);
  let h = 0, t = 0;
  q[t++] = sy * MW + sx; d[sy * MW + sx] = 0;
  while (h < t) {
    const c = q[h++], cx = c % MW, cy = (c / MW) | 0, cd = d[c];
    if (cd >= maxD) continue;
    for (let k = 0; k < 4; k++) {
      const nx = cx + (k === 0 ? 1 : k === 1 ? -1 : 0), ny = cy + (k === 2 ? 1 : k === 3 ? -1 : 0);
      if (nx < 0 || ny < 0 || nx >= MW || ny >= MH) continue;
      const n = ny * MW + nx;
      if (!map[n] || d[n] >= 0) continue;
      d[n] = cd + 1; q[t++] = n;
    }
  }
  return d;
}
