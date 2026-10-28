'use strict';
// Prozedurale PBR-Materialien: kachelbare Texturen für Albedo, Normalen, ORM (Verdeckung/Rauheit/Metall) und Leuchten.
// Jede Textur deckt 96×96 Spielpixel ab (2×2 Kacheln) und wird in der Welt wiederholt.

const PG = { N: 256, sets: {}, tab: null };

function pgTable() {
  if (PG.tab) return PG.tab;
  const R = mulberry(777), t = new Float32Array(65536);
  for (let i = 0; i < t.length; i++) t[i] = R();
  return PG.tab = t;
}
const pgH = (ix, iy, s) => PG.tab[(((iy + s * 31) & 255) << 8) | ((ix + s * 17) & 255)];
const pgSmooth = t => t * t * (3 - 2 * t);
const pgClamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const pgStep = (a, b, x) => pgSmooth(pgClamp((x - a) / (b - a), 0, 1));

// kachelbares Wertrauschen, Gitterperiode p
function vnoise(x, y, p, s) {
  const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
  const x0 = ((ix % p) + p) % p, y0 = ((iy % p) + p) % p, x1 = (x0 + 1) % p, y1 = (y0 + 1) % p;
  const a = pgH(x0, y0, s), b = pgH(x1, y0, s), c = pgH(x0, y1, s), d = pgH(x1, y1, s);
  const u = pgSmooth(fx), v = pgSmooth(fy);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(u, v, base, oct, s) {
  let sum = 0, amp = 0.5, f = base, norm = 0;
  for (let o = 0; o < oct; o++) { sum += amp * vnoise(u * f, v * f, f, s + o * 7); norm += amp; amp *= 0.5; f *= 2; }
  return sum / norm;
}
// kachelbares Voronoi: liefert F1, F2 (in Zelleneinheiten) und Zellen-ID
const WK = { f1: 0, f2: 0, id: 0 };
function worley(u, v, G, s) {
  const x = u * G, y = v * G, ix = Math.floor(x), iy = Math.floor(y);
  let f1 = 9, f2 = 9, id = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    const cx = ix + dx, cy = iy + dy, wx = ((cx % G) + G) % G, wy = ((cy % G) + G) % G;
    const px = cx + 0.15 + 0.7 * pgH(wx, wy, s), py = cy + 0.15 + 0.7 * pgH(wx, wy, s + 5);
    const d = Math.hypot(px - x, py - y);
    if (d < f1) { f2 = f1; f1 = d; id = pgH(wx, wy, s + 11); } else if (d < f2) f2 = d;
  }
  WK.f1 = f1; WK.f2 = f2; WK.id = id;
}

// Gemeinsamer Abschluss: Höhenfeld -> Normalen, AO; Felder -> Canvas
function pgFinish(F, o) {
  const N = PG.N, h = F.h;
  const nrm = new Uint8ClampedArray(N * N * 4), orm = new Uint8ClampedArray(N * N * 4), alb = new Uint8ClampedArray(N * N * 4);
  const emi = F.emi ? new Uint8ClampedArray(N * N * 4) : null;
  // weichgezeichnete Höhe für AO (5×5 Mittelwert, kachelnd)
  const blur = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let s = 0;
    for (let dy = -2; dy <= 2; dy += 2) for (let dx = -2; dx <= 2; dx += 2) s += h[((y + dy + N) % N) * N + ((x + dx + N) % N)];
    blur[y * N + x] = s / 9;
  }
  const k = o.normal || 3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = y * N + x, xl = (x + N - 1) % N, xr = (x + 1) % N, yu = (y + N - 1) % N, yd = (y + 1) % N;
    let nx = -(h[y * N + xr] - h[y * N + xl]) * k, ny = (h[yd * N + x] - h[yu * N + x]) * k, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const j = i * 4;
    nrm[j] = (nx * 0.5 + 0.5) * 255; nrm[j + 1] = (ny * 0.5 + 0.5) * 255; nrm[j + 2] = (nz * 0.5 + 0.5) * 255; nrm[j + 3] = 255;
    const ao = pgClamp(1 - (blur[i] - h[i]) * (o.ao || 2.2) - (F.aoX ? F.aoX[i] : 0), 0.25, 1);
    orm[j] = ao * 255; orm[j + 1] = pgClamp(F.r[i], 0.05, 1) * 255; orm[j + 2] = F.m ? F.m[i] * 255 : 0; orm[j + 3] = 255;
    alb[j] = pgClamp(F.c[i * 3], 0, 1) * 255; alb[j + 1] = pgClamp(F.c[i * 3 + 1], 0, 1) * 255; alb[j + 2] = pgClamp(F.c[i * 3 + 2], 0, 1) * 255; alb[j + 3] = 255;
    if (emi) { const e = F.emi[i], ec = F.emiCol || [1, 0.47, 0.12]; emi[j] = e * ec[0] * 255; emi[j + 1] = e * ec[1] * 255; emi[j + 2] = e * ec[2] * 255; emi[j + 3] = 255; }
  }
  const cv = d => { const c = document.createElement('canvas'); c.width = c.height = N; c.getContext('2d').putImageData(new ImageData(d, N, N), 0, 0); return c; };
  return { albedo: cv(alb), normal: cv(nrm), orm: cv(orm), emissive: emi ? cv(emi) : null };
}
function pgFields() {
  const n = PG.N * PG.N;
  return { h: new Float32Array(n), c: new Float32Array(n * 3), r: new Float32Array(n), m: null, emi: null, aoX: null };
}

// --- Flaggensteine (Gruft-Boden): unregelmäßige Platten, Fugen, Moos, Risse, nasse Stellen ---
function pgFlagstone(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base, G = o.cells || 4;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    worley(u, v, G, seed); const edge = WK.f2 - WK.f1, id = WK.id;
    const bevel = pgStep(0.0, 0.3, edge), top = pgStep(0.02, 0.1, edge);
    const g1 = fbm(u, v, 6, 4, seed + 1), g2 = fbm(u, v, 24, 3, seed + 2), mott = fbm(u, v, 3, 4, seed + 3);
    F.h[i] = 0.4 * bevel + (id - 0.5) * 0.12 + g1 * 0.22 + g2 * 0.12 - (1 - top) * 0.2;
    let tone = (0.8 + 0.4 * mott) * (1 + (id - 0.5) * (o.var || 0.35)) * (0.9 + 0.2 * g2);
    let r = b[0] / 255 * tone, g = b[1] / 255 * tone, bl = b[2] / 255 * tone;
    // feine Risse
    worley(u, v, 7, seed + 40); const cr = 1 - pgStep(0.0, 0.035, WK.f2 - WK.f1), cmask = pgStep(0.55, 0.7, fbm(u, v, 3, 3, seed + 8));
    const crack = cr * cmask; F.h[i] -= crack * 0.35;
    // Moos in Fugen und Ecken
    const moss = pgStep(o.moss ? 0.52 : 2, 0.7, fbm(u, v, 5, 5, seed + 4)) * (1 - bevel * 0.7);
    r = r * (1 - moss) + 0.22 * moss * tone; g = g * (1 - moss) + 0.32 * moss * tone; bl = bl * (1 - moss) + 0.14 * moss * tone;
    // Fugenschmutz
    const dirt = 1 - top; r *= 1 - dirt * 0.42; g *= 1 - dirt * 0.42; bl *= 1 - dirt * 0.38;
    // Flecken
    const stain = pgStep(0.6, 0.75, fbm(u, v, 4, 4, seed + 6)) * 0.35; r *= 1 - stain; g *= 1 - stain; bl *= 1 - stain * 0.9;
    // nasse Stellen: dunkler, glatter
    const wet = pgStep(o.wetThr || 0.64, 0.74, fbm(u, v, 3, 4, seed + 9)) * (o.wet === undefined ? 1 : o.wet);
    r *= 1 - wet * 0.35; g *= 1 - wet * 0.35; bl *= 1 - wet * 0.3;
    F.c[i * 3] = r; F.c[i * 3 + 1] = g; F.c[i * 3 + 2] = bl;
    F.r[i] = (0.84 - 0.12 * top + g2 * 0.1) * (1 - wet) + 0.32 * wet - moss * 0.05;
  }
  return pgFinish(F, { normal: o.normal || 3.2, ao: 2.2 });
}

// --- Ziegel (Wände): Läuferverband, Mörtel, abgeplatzte Kanten, Ruß ---
function pgBricks(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base, BW = 64, BH = 32, M = 3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x, row = Math.floor(y / BH), off = (row & 1) * (BW / 2);
    const xx = (x + off) % N, bx = xx % BW, by = y % BH, col = Math.floor(xx / BW);
    const rnd = pgH(col + row * 4, row, seed), rnd2 = pgH(col, row + 9, seed + 3);
    // Abstand zur Ziegelkante mit unregelmäßigem Rand (Abplatzungen)
    const chip = (fbm(u, v, 24, 3, seed + 2) - 0.5) * 4;
    const dx = Math.min(bx, BW - 1 - bx) + chip, dy = Math.min(by, BH - 1 - by) + chip;
    const d = Math.min(dx, dy), brick = pgStep(M - 0.5, M + 2.5, d), mortar = 1 - pgStep(M - 1.5, M + 0.5, d);
    const g1 = fbm(u, v, 12, 4, seed + 1), g2 = fbm(u, v, 40, 2, seed + 5);
    F.h[i] = 0.6 * brick + g1 * 0.25 + g2 * 0.12 - 0.3 * mortar;
    const tone = (0.78 + 0.45 * rnd) * (0.85 + 0.3 * g1) * (0.92 + 0.16 * g2);
    let r = b[0] / 255 * tone, g = b[1] / 255 * tone * (0.94 + 0.1 * rnd2), bl = b[2] / 255 * tone * (0.9 + 0.2 * rnd2);
    // Ruß (senkrechte Schlieren)
    const soot = pgStep(0.45, 0.8, fbm(u, v * 0.15 + 0.02, 14, 4, seed + 7)) * 0.45; r *= 1 - soot; g *= 1 - soot; bl *= 1 - soot;
    const mc = (o.mortar || [150, 144, 128]), mt = (0.7 + 0.5 * g2) * (1 - soot * 0.5);
    r = r * (1 - mortar) + mc[0] / 255 * mt * mortar; g = g * (1 - mortar) + mc[1] / 255 * mt * mortar; bl = bl * (1 - mortar) + mc[2] / 255 * mt * mortar;
    F.c[i * 3] = r; F.c[i * 3 + 1] = g; F.c[i * 3 + 2] = bl;
    F.r[i] = 0.88 - 0.08 * brick + g2 * 0.08;
  }
  return pgFinish(F, { normal: 3.4, ao: 3 });
}

// --- Fels (Höhle): gestreift, rissig, mit Mineraladern ---
function pgRock(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base; F.emi = o.glints ? new Float32Array(N * N) : null; F.emiCol = [0.15, 0.75, 1];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const w = fbm(u, v, 3, 3, seed + 1);
    const rid = 1 - Math.abs(2 * fbm(u, v, 5, 5, seed + 2) - 1), fine = fbm(u, v, 30, 3, seed + 3);
    const strata = Math.sin((v * 6 + w * 2.2) * 6.283) * 0.5 + 0.5;
    worley(u, v, 5, seed + 4); const cr = 1 - pgStep(0.0, 0.05, WK.f2 - WK.f1);
    F.h[i] = rid * 0.55 + fine * 0.18 + strata * 0.12 - cr * 0.3;
    const tone = (0.7 + 0.5 * rid) * (0.85 + 0.3 * fine) * (0.9 + 0.2 * strata * (o.strata || 0.5));
    let r = b[0] / 255 * tone, g = b[1] / 255 * tone, bl = b[2] / 255 * tone;
    const vein = pgStep(0.72, 0.78, fbm(u + w * 0.1, v, 6, 4, seed + 6)) * 0.5; // helle Adern
    r += vein * 0.25; g += vein * 0.3; bl += vein * 0.35;
    const moss = pgStep(0.6, 0.78, fbm(u, v, 4, 4, seed + 8)) * 0.6; r = r * (1 - moss) + 0.13 * moss; g = g * (1 - moss) + 0.28 * moss; bl = bl * (1 - moss) + 0.2 * moss;
    F.c[i * 3] = r; F.c[i * 3 + 1] = g; F.c[i * 3 + 2] = bl;
    F.r[i] = 0.82 - vein * 0.4 - moss * 0.1 + fine * 0.1;
    if (F.emi) F.emi[i] = pgStep(0.9, 0.97, fine) * 0.5 * pgStep(0.5, 0.7, w);
  }
  return pgFinish(F, { normal: 5, ao: 2.4 });
}

// --- Basalt mit Lavarissen (Lavakluft): leuchtende Fugen ---
function pgBasalt(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base; F.emi = new Float32Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    worley(u, v, o.cells || 4, seed); const edge = WK.f2 - WK.f1, id = WK.id;
    const plate = pgStep(0.0, 0.16, edge), crack = 1 - pgStep(0.0, 0.07, edge);
    const g1 = fbm(u, v, 8, 4, seed + 1), g2 = fbm(u, v, 34, 3, seed + 2);
    F.h[i] = plate * 0.6 + g1 * 0.25 + g2 * 0.12 - crack * 0.4;
    const tone = (0.7 + 0.5 * g1) * (0.85 + 0.3 * g2) * (0.9 + 0.2 * id);
    let r = b[0] / 255 * tone, g = b[1] / 255 * tone, bl = b[2] / 255 * tone;
    const heat = pgStep(0.0, 0.6, crack) * (0.55 + 0.45 * fbm(u, v, 6, 3, seed + 5)) * pgStep(0.12, 0.4, fbm(u, v, 3, 3, seed + 6) + 0.25);
    F.emi[i] = pgClamp(heat, 0, 1);
    r *= 1 - crack * 0.7; g *= 1 - crack * 0.7; bl *= 1 - crack * 0.7;
    F.c[i * 3] = r; F.c[i * 3 + 1] = g; F.c[i * 3 + 2] = bl;
    F.r[i] = 0.7 - plate * 0.12 + g2 * 0.1;
  }
  return pgFinish(F, { normal: 4.5, ao: 2.8 });
}

// --- Marmor (Stiller Thron): Adern, poliert, spiegelnd ---
function pgMarble(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base, S = o.slabs || 2;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const su = (u * S) % 1, sv = (v * S) % 1, ed = Math.min(su, 1 - su, sv, 1 - sv) * N / S;
    const slab = pgStep(0.5, 2.5, ed), cell = pgH(Math.floor(u * S), Math.floor(v * S), seed + 3);
    const warp = fbm(u, v, 3, 5, seed + 1), vein = Math.abs(Math.sin((u * 2 + v * 3 + warp * 2.4 + cell) * 3.1416));
    const v1 = Math.pow(1 - vein, 7), v2 = Math.pow(1 - Math.abs(Math.sin((u * 5 - v * 2 + warp * 3.1 + cell * 3) * 3.1416)), 14) * 0.6;
    const cloud = fbm(u, v, 4, 5, seed + 2), fine = fbm(u, v, 40, 3, seed + 4);
    F.h[i] = slab * 0.5 + fine * 0.03;
    const tone = (0.82 + 0.28 * cloud) * (1 - v1 * 0.38 - v2 * 0.25) * (0.97 + 0.06 * fine);
    F.c[i * 3] = b[0] / 255 * tone * (1 - (1 - slab) * 0.5); F.c[i * 3 + 1] = b[1] / 255 * tone * (1 - (1 - slab) * 0.5); F.c[i * 3 + 2] = b[2] / 255 * tone * (1 - (1 - slab) * 0.45);
    F.r[i] = (o.rough === undefined ? 0.2 : o.rough) + fine * 0.18 + v1 * 0.08 + (1 - slab) * 0.5;
  }
  return pgFinish(F, { normal: 1.2, ao: 1.8 });
}

// --- grober Stein (Wandoberseiten, Rückwände) ---
function pgRough(seed, o) {
  const N = PG.N, F = pgFields(), b = o.base;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const u = x / N, v = y / N, i = y * N + x;
    const g1 = fbm(u, v, 5, 5, seed + 1), g2 = fbm(u, v, 28, 3, seed + 2);
    F.h[i] = g1 * 0.6 + g2 * 0.25;
    const tone = (0.7 + 0.5 * g1) * (0.85 + 0.3 * g2);
    F.c[i * 3] = b[0] / 255 * tone; F.c[i * 3 + 1] = b[1] / 255 * tone; F.c[i * 3 + 2] = b[2] / 255 * tone;
    F.r[i] = 0.88 + g2 * 0.1;
  }
  return pgFinish(F, { normal: 4, ao: 2.4 });
}

const PG_KINDS = {
  flag:      { make: pgFlagstone, o: { base: [122, 116, 124], moss: true, wet: 1, var: 0.28 } },
  brick:     { make: pgBricks,    o: { base: [132, 98, 88], mortar: [150, 142, 126] } },
  rough:     { make: pgRough,     o: { base: [96, 90, 100] } },
  rock:      { make: pgRock,      o: { base: [104, 110, 116], strata: 0.7, glints: true } },
  rockwall:  { make: pgRock,      o: { base: [88, 92, 98], strata: 1, glints: false } },
  rockrough: { make: pgRough,     o: { base: [80, 84, 90] } },
  basalt:    { make: pgBasalt,    o: { base: [74, 62, 66], cells: 4 } },
  obsbrick:  { make: pgBricks,    o: { base: [92, 62, 62], mortar: [80, 56, 52] } },
  lavarough: { make: pgRough,     o: { base: [66, 52, 54] } },
  marble:    { make: pgMarble,    o: { base: [214, 216, 226], slabs: 2, rough: 0.16 } },
  marblewall:{ make: pgMarble,    o: { base: [178, 180, 194], slabs: 1, rough: 0.28 } },
  marbletop: { make: pgRough,     o: { base: [150, 152, 164] } },
};
// Material-Zuordnung pro Welt
const PG_THEME = {
  crypt: { floor: 'flag', wall: 'brick', top: 'rough' },
  cave:  { floor: 'rock', wall: 'rockwall', top: 'rockrough' },
  lava:  { floor: 'basalt', wall: 'obsbrick', top: 'lavarough' },
  void:  { floor: 'marble', wall: 'marblewall', top: 'marbletop' },
};

// Liefert { map, normalMap, orm, emissive } als THREE-Texturen (zwischengespeichert)
function pgTextures(kind, renderer) {
  if (PG.sets[kind]) return PG.sets[kind];
  pgTable();
  const K = PG_KINDS[kind], seed = 1 + Object.keys(PG_KINDS).indexOf(kind) * 13;
  const out = K.make(seed, K.o);
  const aniso = renderer ? Math.min(4, renderer.capabilities.getMaxAnisotropy()) : 1;
  const mk = (c, srgb) => {
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = aniso;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter;
    return t;
  };
  return PG.sets[kind] = { map: mk(out.albedo, true), normal: mk(out.normal, false), orm: mk(out.orm, false), emissive: out.emissive ? mk(out.emissive, true) : null };
}
