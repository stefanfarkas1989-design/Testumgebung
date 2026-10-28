'use strict';
// 3D-Renderer (Three.js). Spielkoordinaten: x -> X, y -> Z, Höhe -> Y.
// Statische Welt = ein zusammengeführtes Mesh. Licht = kleiner Pool aus Punktlichtern.

const R3 = {
  ready: false, renderer: null, scene: null, cam: null, level: null, dyn: null,
  slots: [], atlas: {}, frame: 0, dt: 0.016, ft: 0.016, ftT: 0, level_q: 'high',
  maps: { rigs: new Map(), props: new Map(), drops: new Map(), projs: new Map(), haz: new Map(), fx: new Map(), decals: new Map() },
  flames: [], torchGlows: [], dirty: true, stairsMesh: null,
};
const Q_LEVELS = {
  high: { pr: 1.75, lights: 8, parts: 1.0 },
  mid:  { pr: 1.25, lights: 6, parts: 0.7 },
  low:  { pr: 1.0,  lights: 4, parts: 0.4 },
};
const MAX_GLOW = 900, MAX_SOLID = 400;
const v3 = new THREE.Vector3(), v3b = new THREE.Vector3();
const colCache = {};
function rgbOf(str) {
  let c = colCache[str];
  if (c) return c;
  if (str[0] === '#') { const n = parseInt(str.slice(1), 16); c = [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
  else { const p = str.split(','); c = [p[0] / 255, p[1] / 255, p[2] / 255]; }
  return colCache[str] = c;
}
const hexOf = str => { const c = rgbOf(str); return (Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255); };

// ---------- Initialisierung ----------
function initR3() {
  if (typeof THREE === 'undefined') return false;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game3d'), antialias: !('ontouchstart' in window), powerPreference: 'high-performance' });
  } catch (e) { return false; }
  if (!renderer.capabilities.isWebGL2 && !renderer.getContext()) return false;
  renderer.useLegacyLights = true;
  renderer.setClearColor(0x050408, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  R3.renderer = renderer;
  // Auf Handys kann der GPU-Kontext beim App-Wechsel verloren gehen: Wiederherstellung erlauben
  renderer.domElement.addEventListener('webglcontextlost', e => e.preventDefault());
  renderer.domElement.addEventListener('webglcontextrestored', () => { R3.dirty = true; });
  R3.scene = new THREE.Scene();
  R3.cam = new THREE.PerspectiveCamera(40, 1.6, 10, 3000);
  R3.level = new THREE.Group(); R3.dyn = new THREE.Group();
  R3.scene.add(R3.level, R3.dyn);
  R3.amb = new THREE.AmbientLight(0x404060, 1.2); R3.scene.add(R3.amb);
  // „Mond“-Licht: wirft weiche Schatten (nur Qualität Hoch)
  R3.sun = new THREE.DirectionalLight(0x9aa8e0, 0.55);
  R3.sun.castShadow = false;
  R3.sun.shadow.mapSize.set(1024, 1024);
  const shc = R3.sun.shadow.camera; shc.left = -520; shc.right = 520; shc.top = 520; shc.bottom = -520; shc.near = 50; shc.far = 1900;
  R3.sun.shadow.bias = -0.0007; R3.sun.shadow.normalBias = 0.9;
  R3.scene.add(R3.sun, R3.sun.target);
  R3.scene.fog = new THREE.Fog(0x050408, 380, 1050);

  // Licht-Pool
  for (let i = 0; i < 8; i++) {
    const l = new THREE.PointLight(0xffffff, 0, 300, 1.6);
    R3.scene.add(l);
    R3.slots.push({ light: l, id: null, cur: 0, keep: false, c: null });
  }

  // Schatten-Blob-Textur (rund)
  const sc = document.createElement('canvas'); sc.width = sc.height = 64;
  const sg = sc.getContext('2d'), gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(0,0,0,.75)'); gr.addColorStop(0.6, 'rgba(0,0,0,.35)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
  M3.shadowMat = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false });
  M3.flashMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  M3.iceMat = new THREE.MeshLambertMaterial({ color: 0x9fd8ff, emissive: 0x3a6a9a, emissiveIntensity: 0.8 });

  // Punkt-Systeme (additiv für Glühen, normal für Splitter)
  const gl = renderer.getContext();
  const rng = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
  R3.maxPt = Math.min(rng ? rng[1] : 64, 512);
  const mkPts = (n, additive) => {
    const geom = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3), col = new Float32Array(n * 4), size = new Float32Array(n);
    geom.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('col', new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage));
    geom.setAttribute('size', new THREE.BufferAttribute(size, 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 800 }, uMax: { value: R3.maxPt }, uHard: { value: additive ? 0 : 1 } },
      vertexShader: `attribute float size; attribute vec4 col; varying vec4 vCol; uniform float uScale; uniform float uMax;
        void main(){ vCol = col; vec4 mv = modelViewMatrix * vec4(position, 1.0); float d = -mv.z;
          vCol.a *= clamp((1500.0 - d) / 500.0, 0.0, 1.0);
          gl_PointSize = min(size * uScale / d, uMax); gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `precision mediump float; varying vec4 vCol; uniform float uHard;
        void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; if (r > 1.0) discard;
          float a = mix(pow(1.0 - r, 2.0), 1.0 - smoothstep(0.7, 1.0, r), uHard);
          gl_FragColor = vec4(vCol.rgb, vCol.a * a); }`,
      transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    const pts = new THREE.Points(geom, mat); pts.frustumCulled = false; pts.renderOrder = additive ? 5 : 4;
    R3.scene.add(pts);
    return { pts, pos, col, size, n: 0, max: n, geom, mat };
  };
  R3.glow = mkPts(MAX_GLOW, true);
  R3.solid = mkPts(MAX_SOLID, false);

  // 2D-Overlay (Zahlen, Lebensbalken, Beschriftungen)
  R3.ov = document.getElementById('hud2d'); R3.octx = R3.ov.getContext('2d');
  R3.vig = document.getElementById('vig'); R3.hurt = document.getElementById('hurtfx');

  let q = 'auto';
  try { q = localStorage.getItem('aschenfall-q') || 'auto'; } catch (e) { /* egal */ }
  G.quality = q;
  R3.level_q = q === 'auto' ? (('ontouchstart' in window) ? 'mid' : 'high') : q;
  R3.ready = true;
  applyQuality();
  resize3d();
  window.addEventListener('resize', resize3d);
  return true;
}

function applyQuality() {
  const Q = Q_LEVELS[R3.level_q];
  R3.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, Q.pr));
  R3.sun.castShadow = R3.level_q === 'high';
  if (R3.levelMesh && R3.atlasCur) { const old = R3.levelMesh.material; R3.levelMesh.material = levelMaterial(R3.atlasCur); old.dispose(); }
  for (let i = 0; i < R3.slots.length; i++) {
    const vis = i < Q.lights;
    if (R3.slots[i].light.visible !== vis) R3.slots[i].light.visible = vis;
  }
  resize3d();
}
function resize3d() {
  if (!R3.ready) return;
  const w = window.innerWidth, h = window.innerHeight;
  R3.renderer.setSize(w, h, false);
  R3.cam.aspect = w / h; R3.cam.updateProjectionMatrix();
  const buf = R3.renderer.getDrawingBufferSize(new THREE.Vector2());
  const sc = buf.y / (2 * Math.tan(R3.cam.fov * Math.PI / 360));
  R3.glow.mat.uniforms.uScale.value = sc; R3.solid.mat.uniforms.uScale.value = sc;
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  R3.ov.width = Math.round(w * dpr); R3.ov.height = Math.round(h * dpr);
  R3.odpr = dpr;
}

function setGfx(mode) {
  G.gfx = (mode === '3d' && R3.ready) ? '3d' : '2d';
  document.getElementById('game').style.display = G.gfx === '3d' ? 'none' : 'block';
  document.getElementById('game3d').style.display = G.gfx === '3d' ? 'block' : 'none';
  document.getElementById('hud2d').style.display = G.gfx === '3d' ? 'block' : 'none';
  document.getElementById('vig').style.display = G.gfx === '3d' ? 'block' : 'none';
  document.getElementById('hurtfx').style.display = G.gfx === '3d' ? 'block' : 'none';
  try { localStorage.setItem('aschenfall-gfx', G.gfx); } catch (e) { /* egal */ }
  if (typeof UI !== 'undefined' && UI.updateGfxButtons) UI.updateGfxButtons();
}
function cycleQuality() {
  const order = ['auto', 'high', 'mid', 'low'];
  G.quality = order[(order.indexOf(G.quality) + 1) % order.length];
  try { localStorage.setItem('aschenfall-q', G.quality); } catch (e) { /* egal */ }
  R3.level_q = G.quality === 'auto' ? (('ontouchstart' in window) ? 'mid' : 'high') : G.quality;
  R3.ftAvg = 0.016; R3.ftN = 0;
  if (R3.ready) applyQuality();
  if (UI.updateGfxButtons) UI.updateGfxButtons();
}

// ---------- Texturen-Atlas pro Thema ----------
function buildAtlas(theme) {
  if (R3.atlas[theme.id]) return R3.atlas[theme.id];
  const S = getSet(theme), pal = theme.pal, k = theme.seedK !== undefined ? theme.seedK : THEMES.indexOf(theme) * 1000;
  const C = 96, W = C * 8, H = C * 3;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const gcv = pal.glow ? document.createElement('canvas') : null;
  if (gcv) { gcv.width = W; gcv.height = H; }
  const gg = gcv ? gcv.getContext('2d') : null;
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const put = (img, col, row) => {
    g.drawImage(img, col * C, row * C, C, C);
    if (gg && img.glowTex) gg.drawImage(img.glowTex, col * C, row * C, C, C);
  };
  for (let i = 0; i < 8; i++) put(S.floor[i], i, 0);
  for (let i = 0; i < 4; i++) { put(genFace(555 + k + i * 31, pal, 1), i, 1); put(genFace(555 + k + i * 31, pal, 2), 4 + i, 1); }
  for (let i = 0; i < 3; i++) put(S.roof[i], i, 2);
  // feines Korn über allem: macht die Oberflächen weniger glatt
  const gid = g.getImageData(0, 0, W, H), gp = gid.data;
  for (let i = 0; i < gp.length; i += 4) { const n = (Math.random() - 0.5) * 20; gp[i] += n; gp[i + 1] += n; gp[i + 2] += n; }
  g.putImageData(gid, 0, 0);
  const mk = c => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false; t.minFilter = THREE.LinearFilter; t.magFilter = THREE.LinearFilter; return t; };
  const nt = new THREE.CanvasTexture(makeNormalMap(cv, C, 2.2)); nt.generateMipmaps = false; nt.minFilter = THREE.LinearFilter; nt.magFilter = THREE.LinearFilter;
  return R3.atlas[theme.id] = { tex: mk(cv), nrm: nt, glow: gcv ? mk(gcv) : null, W, H, C };
}

// Relief aus der Helligkeit der Textur (innerhalb jeder Zelle, damit nichts in die Nachbarzelle blutet)
function makeNormalMap(cv, C, strength) {
  const W = cv.width, H = cv.height, src = cv.getContext('2d').getImageData(0, 0, W, H).data;
  const h = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) h[i] = (0.299 * src[i * 4] + 0.587 * src[i * 4 + 1] + 0.114 * src[i * 4 + 2]) / 255;
  const out = document.createElement('canvas'); out.width = W; out.height = H;
  const og = out.getContext('2d'), img = og.createImageData(W, H), d = img.data;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const cx0 = Math.floor(x / C) * C, cy0 = Math.floor(y / C) * C;
    const xl = Math.max(cx0, x - 1), xr = Math.min(cx0 + C - 1, x + 1), yu = Math.max(cy0, y - 1), yd = Math.min(cy0 + C - 1, y + 1);
    const dx = h[y * W + xr] - h[y * W + xl], dy = h[yd * W + x] - h[yu * W + x];
    let nx = -dx * strength, ny = dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const o = (y * W + x) * 4;
    d[o] = (nx * 0.5 + 0.5) * 255; d[o + 1] = (ny * 0.5 + 0.5) * 255; d[o + 2] = (nz * 0.5 + 0.5) * 255; d[o + 3] = 255;
  }
  og.putImageData(img, 0, 0);
  return out;
}

function levelMaterial(A) {
  if (R3.level_q === 'high') {
    return new THREE.MeshStandardMaterial({ map: A.tex, normalMap: A.nrm, normalScale: new THREE.Vector2(1, 1), roughness: 0.8, metalness: 0.0, vertexColors: true });
  }
  return new THREE.MeshLambertMaterial({ map: A.tex, normalMap: A.nrm, normalScale: new THREE.Vector2(0.9, 0.9), vertexColors: true });
}

// ---------- Statisches Level ----------
function disposeGroup(grp) {
  while (grp.children.length) {
    const c = grp.children[0]; grp.remove(c);
    if (c.geometry && c.userData.own) c.geometry.dispose();
  }
}

function buildLevel() {
  R3.dirty = false;
  disposeGroup(R3.level);
  for (const m of Object.values(R3.maps)) {
    for (const o of m.values()) { if (o.group) R3.dyn.remove(o.group); else if (o.parent) o.parent.remove(o); }
    m.clear();
  }
  R3.flames = []; R3.stairsMesh = null;
  const th = G.theme, A = buildAtlas(th);
  const T = TILE, WALL = 96, LOW = 24;
  const isF = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && (G.map[y * MW + x] === 1 || G.deco[y * MW + x] === 1);
  const near = (x, y) => { for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) if (isF(x + i, y + j)) return true; return false; };
  const hOf = (x, y) => isF(x, y) ? 0 : (isF(x, y + 1) ? WALL : (near(x, y) ? LOW : -1));
  const pos = [], nor = [], uv = [], col = [], idx = [], gpos = [], guv = [], gidx = [];
  const half = 0.5;
  const rect = (c, r) => ({ u0: (c * A.C + half) / A.W, u1: ((c + 1) * A.C - half) / A.W, v0: 1 - ((r + 1) * A.C - half) / A.H, v1: 1 - (r * A.C + half) / A.H });
  const pushQuad = (P, N, UV, Cs, arrP, arrN, arrU, arrC, arrI) => {
    const b = arrP.length / 3;
    for (let i = 0; i < 4; i++) {
      arrP.push(P[i][0], P[i][1], P[i][2]);
      if (arrN) arrN.push(N[0], N[1], N[2]);
      arrU.push(UV[i][0], UV[i][1]);
      if (arrC) arrC.push(Cs[i], Cs[i], Cs[i]);
    }
    arrI.push(b, b + 1, b + 2, b, b + 2, b + 3);
  };
  const wallsAround = (tx, ty, i, j) => {
    const sx = i ? 1 : -1, sy = j ? 1 : -1;
    let w = 0;
    if (!isF(tx + sx, ty)) w++; if (!isF(tx, ty + sy)) w++; if (!isF(tx + sx, ty + sy)) w++;
    return w;
  };
  for (let ty = 0; ty < MH; ty++) for (let tx = 0; tx < MW; tx++) {
    const px = tx * T, pz = ty * T, h = (tx * 73856093 ^ ty * 19349663) >>> 0;
    if (isF(tx, ty)) {
      const r = rect(h % 8, 0);
      const ao = (i, j) => Math.max(0.5, 1 - 0.17 * wallsAround(tx, ty, i, j));
      pushQuad([[px, 0, pz], [px, 0, pz + T], [px + T, 0, pz + T], [px + T, 0, pz]], [0, 1, 0],
        [[r.u0, r.v1], [r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1]], [ao(0, 0), ao(0, 1), ao(1, 1), ao(1, 0)], pos, nor, uv, col, idx);
      if (A.glow && G.set.floor[h % 8].glowTex) {
        pushQuad([[px, 0.6, pz], [px, 0.6, pz + T], [px + T, 0.6, pz + T], [px + T, 0.6, pz]], null,
          [[r.u0, r.v1], [r.u0, r.v0], [r.u1, r.v0], [r.u1, r.v1]], null, gpos, null, guv, null, gidx);
      }
      continue;
    }
    const hh = hOf(tx, ty);
    if (hh < 0) continue;
    // Oberseite
    const rr = rect(h % 3, 2);
    pushQuad([[px, hh, pz], [px, hh, pz + T], [px + T, hh, pz + T], [px + T, hh, pz]], [0, 1, 0],
      [[rr.u0, rr.v1], [rr.u0, rr.v0], [rr.u1, rr.v0], [rr.u1, rr.v1]], [0.9, 0.9, 0.9, 0.9], pos, nor, uv, col, idx);
    // Seitenflächen: Süd (Kamera), Ost, West
    const faces = [
      { n: [0, 0, 1], nb: [tx, ty + 1], q: (y0, y1) => [[px, y0, pz + T], [px + T, y0, pz + T], [px + T, y1, pz + T], [px, y1, pz + T]] },
      { n: [1, 0, 0], nb: [tx + 1, ty], q: (y0, y1) => [[px + T, y0, pz + T], [px + T, y0, pz], [px + T, y1, pz], [px + T, y1, pz + T]] },
      { n: [-1, 0, 0], nb: [tx - 1, ty], q: (y0, y1) => [[px, y0, pz], [px, y0, pz + T], [px, y1, pz + T], [px, y1, pz]] },
    ];
    for (const f of faces) {
      const nh = Math.max(0, hOf(f.nb[0], f.nb[1]));
      if (nh >= hh) continue;
      for (let k = 0; k * 48 < hh; k++) {
        const a = Math.max(nh, k * 48), b = Math.min(hh, (k + 1) * 48);
        if (b <= a) continue;
        const cr = rect(k === 0 ? h % 4 : 4 + h % 4, 1);
        const t0 = (a - k * 48) / 48, t1 = (b - k * 48) / 48;
        const va = cr.v0 + t0 * (cr.v1 - cr.v0), vb = cr.v0 + t1 * (cr.v1 - cr.v0);
        const sh = y => 0.55 + 0.45 * Math.min(1, y / WALL);
        pushQuad(f.q(a, b), f.n, [[cr.u0, va], [cr.u1, va], [cr.u1, vb], [cr.u0, vb]], [sh(a), sh(a), sh(b), sh(b)], pos, nor, uv, col, idx);
        if (f.n[2] === 1 && nh === 0 && hh === WALL && k === 0) {
          // Sockel und Gesims geben den Wänden Tiefe
          const z1 = pz + T, rc = rect(h % 3, 2), U = [[rc.u0, rc.v1], [rc.u0, rc.v0], [rc.u1, rc.v0], [rc.u1, rc.v1]];
          const wq = (y0, y1, z) => [[px, y0, z], [px + T, y0, z], [px + T, y1, z], [px, y1, z]];
          const uq = [[rc.u0, rc.v0], [rc.u1, rc.v0], [rc.u1, rc.v1], [rc.u0, rc.v1]];
          pushQuad(wq(0, 9, z1 + 3), [0, 0, 1], uq, [0.7, 0.7, 0.9, 0.9], pos, nor, uv, col, idx);
          pushQuad([[px, 9, z1], [px, 9, z1 + 3], [px + T, 9, z1 + 3], [px + T, 9, z1]], [0, 1, 0], U, [0.9, 0.9, 0.9, 0.9], pos, nor, uv, col, idx);
          pushQuad(wq(WALL - 13, WALL, z1 + 5), [0, 0, 1], uq, [0.75, 0.75, 1, 1], pos, nor, uv, col, idx);
          pushQuad([[px, WALL, z1], [px, WALL, z1 + 5], [px + T, WALL, z1 + 5], [px + T, WALL, z1]], [0, 1, 0], U, [0.95, 0.95, 0.95, 0.95], pos, nor, uv, col, idx);
        }
        if (A.glow && f.n[2] === 1 && G.set.face[h % 4].glowTex) {
          pushQuad(f.q(a, b).map(p => [p[0], p[1], p[2] + 0.6]), null, [[cr.u0, va], [cr.u1, va], [cr.u1, vb], [cr.u0, vb]], null, gpos, null, guv, null, gidx);
        }
      }
    }
  }
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geom.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geom.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geom.setIndex(idx);
  const mesh = new THREE.Mesh(geom, levelMaterial(A));
  mesh.userData.own = true; mesh.castShadow = true; mesh.receiveShadow = true;
  R3.levelMesh = mesh; R3.atlasCur = A;
  R3.level.add(mesh);
  if (A.glow && gpos.length) {
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gpos, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(guv, 2));
    gg.setIndex(gidx);
    R3.glowMat = new THREE.MeshBasicMaterial({ map: A.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.7 });
    const gm = new THREE.Mesh(gg, R3.glowMat); gm.userData.own = true; gm.renderOrder = 2;
    R3.level.add(gm);
  } else R3.glowMat = null;

  // Umgebung
  const amb = hexOf(th.ambient);
  R3.amb.color.setHex(amb); R3.amb.intensity = 1.0;
  const fogc = th.fog !== undefined ? th.fog : ({ crypt: 0x0c0916, cave: 0x07141d, lava: 0x1e0b07 }[th.id] || 0x050408);
  R3.scene.fog.color.setHex(fogc); R3.renderer.setClearColor(fogc, 1);

  // Wand-Lichtquellen
  for (const t of G.torches) buildWallLight(t, th);
  // Dekor
  for (const p of G.props) R3.maps.props.set(p, { group: buildProp(p) });
  for (const o of R3.maps.props.values()) R3.dyn.add(o.group);
  // Funkenkiste (Händler)
  if (G.chest) {
    const g = new THREE.Group(); g.position.set(G.chest.x, 0, G.chest.y);
    M3.cur = { meshes: [], glows: [] };
    bx(g, 30, 16, 20, lam(0x6a4a2a), 0, 8, 0); bx(g, 31, 6, 21, lam(0x8a6438), 0, 19, 0);
    bx(g, 4, 20, 22, lam(0xe8b36a, 0xa07020, 0.7), -9, 11, 0); bx(g, 4, 20, 22, lam(0xe8b36a, 0xa07020, 0.7), 9, 11, 0);
    bx(g, 5, 6, 3, lam(0xffe8a0, 0xffc040, 1), 0, 14, 11);
    M3.cur = null;
    R3.dyn.add(g); R3.chestMesh = g;
  } else R3.chestMesh = null;
}

function buildWallLight(t, th) {
  const g = new THREE.Group(), z0 = t.y + TILE / 2;
  g.position.set(t.x, 0, z0);
  if (th.wall === 'crystal') {
    const m1 = lam(0x4ab0d0, 0x2a8ab0, 1), m2 = lam(0x8a60d8, 0x6a40b8, 1);
    cn(g, 6, 34, m1, -5, 40, 6, 5).rotation.z = 0.25; cn(g, 7, 48, lam(0x7ad8f0, 0x3aa8d0, 1), 3, 50, 6, 5).rotation.z = -0.1; cn(g, 5, 28, m2, 11, 36, 6, 5).rotation.z = -0.3;
  } else if (th.wall === 'brazier') {
    cy(g, 1.6, 1.6, 40, lam(0x1c1418), 0, 22, 8, 5); cy(g, 12, 6, 8, lam(0x2a1c1c), 0, 46, 8, 8);
    const f = cn(g, 8, 24, lam(0xff7a20, 0xff5a10, 1), 0, 62, 8, 6); R3.flames.push({ m: f, ph: t.ph, base: 1.2 });
  } else {
    bx(g, 3, 16, 3, lam(0x2a2018), 0, 44, 4); cy(g, 5, 3, 7, lam(0x4a3a28), 0, 54, 4, 6);
    const f = cn(g, 4, 14, lam(0xff8a1e, 0xff6a10, 1), 0, 64, 4, 6); R3.flames.push({ m: f, ph: t.ph, base: 1 });
  }
  R3.dyn.add(g);
  R3.maps.props.set({ torchGroup: true, g }, { group: g });
}

// ---------- Dekor (Props) ----------
const PROP_GLOW = {
  crystal:  { y: 14, s: 46, c: '110,220,255', a: 0.55 }, mushroom: { y: 10, s: 32, c: '90,255,200', a: 0.6 },
  candle:   { y: 18, s: 26, c: '255,170,70', a: 0.8, flick: true }, vent: { y: 4, s: 44, c: '255,100,30', a: 0.7, flick: true },
  geode:    { y: 6, s: 30, c: '170,120,255', a: 0.5 },
};
function buildProp(p) {
  const g = new THREE.Group(); g.position.set(p.x, 0, p.y);
  M3.cur = { meshes: [], glows: [] };
  const k = p.kind;
  if (k === 'pillar') {
    const st = G.theme.pillar;
    if (st === 'column') {
      cy(g, 15, 16, 8, lam(0x4a4452), 0, 4, 0, 10); cy(g, 11, 12, 62, lam(0x5e586c), 0, 39, 0, 10); cy(g, 15, 13, 9, lam(0x6a6478), 0, 74, 0, 10);
    } else if (st === 'rock') {
      cn(g, 15, 80, lam(0x5a5448), 0, 40, 0, 6); cn(g, 8, 50, lam(0x766e60), 7, 25, 3, 5);
    } else {
      cn(g, 14, 96, lam(0x1c1418), 0, 48, 0, 5); cn(g, 5, 30, lam(0xff7a2a, 0xff5a10, 1), 0, 22, 8, 4);
    }
    p.gl = st === 'obsidian' ? { y: 24, s: 46, c: '255,100,30', a: 0.5 } : null;
  } else if (k === 'barrel') {
    cy(g, 9, 9, 22, lam(0x6a4a2a), 0, 11, 0, 10); cy(g, 9.6, 9.6, 2.4, lam(0x2a2a30), 0, 6, 0, 10); cy(g, 9.6, 9.6, 2.4, lam(0x2a2a30), 0, 17, 0, 10);
  } else if (k === 'urn') {
    sp(g, 1, lam(0x8a5a3a), 0, 10, 0, 9, 10, 9); cy(g, 4, 5, 6, lam(0x7a4e30), 0, 21, 0, 8); cy(g, 5.5, 4, 2, lam(0x5a3a22), 0, 25, 0, 8);
  } else if (k === 'geode') {
    addMesh(g, geo('dodeca', () => new THREE.DodecahedronGeometry(1)), lam(0x5a5a62), 0, 8, 0).scale.set(11, 9, 11);
    cn(g, 2.4, 10, lam(0xb89cff, 0x7a50d8, 1), -2, 18, 0, 4); cn(g, 2, 8, lam(0x8ff0ff, 0x30a8c8, 1), 3, 17, 2, 4);
  } else if (k === 'bones') {
    sp(g, 4, lam(0xe4dcc4), p.bits[0][0], 4, p.bits[0][1]);
    for (const b of p.bits.slice(1)) cy(g, 0.9, 0.9, 10, lam(0xcfc7aa), b[0], 1.5, b[1], 4).rotation.z = Math.PI / 2 + b[2];
  } else if (k === 'rubble') {
    for (const b of p.bits) addMesh(g, geo('dodeca', () => new THREE.DodecahedronGeometry(1)), lam(0x6a6470), b[0], 2.5, b[1]).scale.set(3.5, 2.6, 3.5);
  } else if (k === 'candle') {
    cy(g, 2.4, 2.4, 9, lam(0xe8dcc0), 0, 4.5, 0, 6); sp(g, 1, bas(0xffb040), 0, 11, 0, 1.6, 2.6, 1.6);
  } else if (k === 'crystal') {
    cn(g, 5, 22, lam(0x4aa8c8, 0x2a88a8, 1), -6, 11, 0, 5); cn(g, 6, 40, lam(0x7ad8f0, 0x3aa8d0, 1), 2, 20, 0, 5); cn(g, 4, 26, lam(0xa878e8, 0x7048b8, 1), 10, 13, 2, 5);
  } else if (k === 'mushroom') {
    cy(g, 1.6, 1.8, 10, lam(0xc8e8d8), 0, 5, 0, 6); sp(g, 6, lam(0x3ad8b0, 0x2ab890, 1), 0, 11, 0, 1.3, 0.7, 1.3);
    cy(g, 1.3, 1.4, 7, lam(0xc8e8d8), 10, 3.5, 2, 6); sp(g, 4.2, lam(0x4ac8e8, 0x2aa8c8, 1), 10, 8, 2, 1.2, 0.7, 1.2);
  } else if (k === 'spike') {
    cn(g, 7, 30, lam(0x1c1418), 0, 15, 0, 5);
  } else if (k === 'vent') {
    cy(g, 11, 12, 3, lam(0x1c1418), 0, 1.5, 0, 10); cy(g, 7, 7, 3.4, lam(0xff6a1e, 0xff4a10, 1), 0, 1.8, 0, 10);
  }
  M3.cur = null;
  const pg = PROP_GLOW[k]; if (pg) p.gl = pg;
  g.userData.seed = p.seed;
  return g;
}

// ---------- Beleuchtung ----------
function updateLights(dt) {
  const cands = [];
  const px = P.x, pz = P.y;
  cands.push({ id: 'p', x: px, y: 120, z: pz, col: 0xffe2be, inten: 1.9, dist: 470, score: -1e6 });
  const near = (x, y, r) => Math.abs(x - px) < r && Math.abs(y - pz) < r;
  const th = G.theme, tc = hexOf(th.lightCol);
  for (const t of G.torches) {
    if (!near(t.x, t.y, 650)) continue;
    const fl = 0.85 + 0.15 * Math.sin(G.time * 11 + t.ph) + 0.07 * Math.sin(G.time * 27 + t.ph * 2.3);
    const crystal = th.wall === 'crystal';
    cands.push({ id: t, x: t.x, y: 62, z: t.y + TILE / 2 + 18, col: tc, inten: crystal ? 1.3 : 1.6 * fl, dist: crystal ? 340 : 360, score: Math.hypot(t.x - px, t.y - pz) });
  }
  for (const pr of G.projs) {
    if (!near(pr.x, pr.y, 700)) continue;
    if (pr.fire) cands.push({ id: pr, x: pr.x, y: 26, z: pr.y, col: 0xff8c32, inten: 1.7, dist: 280 * (pr.r / 8), score: -2000 });
    else if (pr.glow) cands.push({ id: pr, x: pr.x, y: 24, z: pr.y, col: hexOf(pr.glow), inten: 1.1, dist: 190, score: -500 });
  }
  for (const f of G.fx) {
    if (f.type === 'flash') cands.push({ id: f, x: f.x, y: 40, z: f.y, col: 0xffdca0, inten: 2.2 * (1 - f.t / f.max), dist: f.r * 3.2, score: -3000 });
    else if (f.type === 'ring') cands.push({ id: f, x: f.x, y: 40, z: f.y, col: f.color === '#ff8a2a' ? 0xff9a3c : f.color === '#c04bff' ? 0xbe5aff : 0x8cc8ff, inten: 1.6 * (1 - f.t / f.max), dist: f.r * 1.8, score: -2500 });
  }
  for (const h of G.hazards) {
    if (!near(h.x, h.y, 600)) continue;
    const pois = h.type === 'poison';
    if (h.warn > 0) cands.push({ id: h, x: h.x, y: 20, z: h.y, col: pois ? 0x78ff5a : 0xff5028, inten: 1.2 * (1 - h.warn / h.max), dist: h.r * 2.5, score: -800 });
    else if (h.kind === 'zone') cands.push({ id: h, x: h.x, y: 20, z: h.y, col: pois ? 0x78ff5a : 0xff6e28, inten: 1.3, dist: h.r * 3, score: -600 });
  }
  for (const p of G.props) {
    const L = PROP_LIGHT[p.kind];
    if (L && near(p.x, p.y, 500)) cands.push({ id: p, x: p.x, y: 24, z: p.y, col: hexOf(L.c), inten: L.a * 1.4, dist: L.r * 1.7, score: Math.hypot(p.x - px, p.y - pz) + 80 });
  }
  for (const e of G.enemies) {
    if ((e.boss || e.elite) && near(e.x, e.y, 500)) cands.push({ id: e, x: e.x, y: 40, z: e.y, col: e.boss ? 0xbe5aff : 0xffc83c, inten: 0.9, dist: e.boss ? 260 : 150, score: Math.hypot(e.x - px, e.y - pz) + 40 });
  }
  for (const d of G.drops) {
    if (d.potion || d.coin || !near(d.x, d.y, 400)) continue;
    const r = d.item.rarity;
    if (r === 'legendary' || r === 'rare') cands.push({ id: d, x: d.x, y: 30, z: d.y, col: r === 'legendary' ? 0xff8c32 : 0xffd84a, inten: 1.0, dist: 150, score: Math.hypot(d.x - px, d.y - pz) + 100 });
  }
  if (G.chest && near(G.chest.x, G.chest.y, 500)) cands.push({ id: 'chest', x: G.chest.x, y: 40, z: G.chest.y + 16, col: 0xffd078, inten: 1.0, dist: 200, score: Math.hypot(G.chest.x - px, G.chest.y - pz) + 60 });
  if (G.stairs) cands.push({ id: 'stairs', x: G.stairs.x, y: 40, z: G.stairs.y, col: 0xffc864, inten: 1.5, dist: 320, score: -100 });
  cands.sort((a, b) => a.score - b.score);
  const Q = Q_LEVELS[R3.level_q], n = Q.lights;
  const want = cands.slice(0, n);
  const slots = R3.slots;
  for (const s of slots) s.keep = false;
  for (const c of want) {
    const s = slots.find(s => s.id === c.id && s.light.visible);
    if (s) { s.c = c; s.keep = true; }
  }
  for (const c of want) {
    if (slots.some(s => s.keep && s.c === c)) continue;
    const s = slots.find(s => s.light.visible && !s.keep && (s.id === null || s.cur < 0.03));
    if (s) { s.id = c.id; s.c = c; s.keep = true; s.cur = 0; }
  }
  const k = Math.min(1, dt * 12);
  for (const s of slots) {
    if (!s.light.visible) continue;
    const target = s.keep ? s.c.inten : 0;
    s.cur += (target - s.cur) * k;
    if (s.keep) { s.light.position.set(s.c.x, s.c.y, s.c.z); s.light.color.setHex(s.c.col); s.light.distance = s.c.dist; }
    s.light.intensity = s.cur;
    if (!s.keep && s.cur < 0.03) { s.id = null; s.light.intensity = 0; }
  }
}

// ---------- Glühen & Partikel ----------
function pushGlow(x, y, z, size, color, a) {
  const B = R3.glow;
  if (B.n >= B.max) return;
  const i = B.n++, c = rgbOf(color);
  B.pos[i * 3] = x; B.pos[i * 3 + 1] = y; B.pos[i * 3 + 2] = z;
  B.col[i * 4] = c[0]; B.col[i * 4 + 1] = c[1]; B.col[i * 4 + 2] = c[2]; B.col[i * 4 + 3] = a;
  B.size[i] = size;
}
function pushSolid(x, y, z, size, color, a) {
  const B = R3.solid;
  if (B.n >= B.max) return;
  const i = B.n++, c = rgbOf(color);
  B.pos[i * 3] = x; B.pos[i * 3 + 1] = y; B.pos[i * 3 + 2] = z;
  B.col[i * 4] = c[0]; B.col[i * 4 + 1] = c[1]; B.col[i * 4 + 2] = c[2]; B.col[i * 4 + 3] = a;
  B.size[i] = size;
}

// ---------- Entitäten ----------
function placeRig(owner, rig, x, z, faceAng, scale, dt) {
  const g = rig.group;
  g.position.set(x, 0, z);
  g.scale.setScalar(scale);
  if (owner.fa === undefined) owner.fa = faceAng;
  let d = faceAng - owner.fa; d = Math.atan2(Math.sin(d), Math.cos(d));
  owner.fa += d * Math.min(1, dt * 14);
  g.rotation.y = -owner.fa;
  rig.shadow.scale.set(rig.baseR * 2.8, rig.baseR * 2.8, 1);
  rig.shadow.visible = true;
}
function rigGlows(owner, rig, scale, extraAlpha) {
  const c = Math.cos(owner.fa), s = Math.sin(owner.fa), gs = rig.glowScale || 1, g = rig.group;
  const emit = (gl) => {
    const lx = gl.x * gs * scale, lz = gl.z * gs * scale;
    // lokal +X -> Welt (cos, sin); lokal +Z -> Welt (-sin, cos)
    pushGlow(g.position.x + lx * c - lz * s, gl.y * gs * scale, g.position.z + lx * s + lz * c, gl.size * gs * scale, gl.color, (gl.a === undefined ? 1 : gl.a) * extraAlpha);
  };
  for (const gl of rig.glows) emit(gl);
  if (rig.extraGlows) { const out = []; rig.extraGlows(owner, out); for (const gl of out) emit(gl); }
}
function setRigShadow(rig, on) {
  if (rig.shOn === on) return;
  rig.shOn = on;
  for (const m of rig.meshes) m.castShadow = on;
}
function setRigState(rig, state) {
  if (rig.state === state) return;
  rig.state = state;
  for (const m of rig.meshes) m.material = state === 'flash' ? M3.flashMat : state === 'ice' ? M3.iceMat : m.userData.m0;
}
const HEIGHT_K = { schweigen: 1.6, spider: 1.9, queen: 1.6, hound: 2.0, bat: 3.4, cultist: 3.0 };

function syncEnemies(dt, view) {
  const maps = R3.maps.rigs;
  for (const e of G.enemies) {
    if (!view(e.x, e.y, 90)) continue;
    let o = maps.get(e);
    if (!o) {
      const rig = buildRig(e.type); rig.baseR = e.def.r;
      o = { group: rig.group, rig };
      R3.dyn.add(rig.group); maps.set(e, o);
    }
    o.seen = R3.frame;
    const rig = o.rig, s = e.r / e.def.r, st = stOf(e);
    setRigShadow(rig, R3.level_q === 'high' && Math.abs(e.x - P.x) < 480 && Math.abs(e.y - P.y) < 400);
    if (rig.anim) rig.anim(e, st);
    placeRig(e, rig, e.x, e.y, e.ang || 0, s, dt);
    setRigState(rig, e.flash > 0 ? 'flash' : (e.slow > 0 && e.stun > 0.3) ? 'ice' : 'norm');
    rigGlows(e, rig, s, 1);
    if (e.elite) pushGlow(e.x, 3, e.y, e.r * 3.2, '255,200,60', 0.5);
    if (e.burnT > 0) pushGlow(e.x, e.r * 1.1, e.y, e.r * 2.4, '255,120,30', 0.7);
    if (G.theme.echo && !e.boss) pushGlow(e.x, e.r * 1.3, e.y, e.r * 3.2, '200,215,255', 0.28);
  }
  for (const [e, o] of maps) {
    if (o.seen !== R3.frame) { R3.dyn.remove(o.group); maps.delete(e); }
  }
}

function syncPlayer(dt) {
  let o = R3.player;
  if (!o) { const rig = buildRig('player'); rig.baseR = 11; o = R3.player = { group: rig.group, rig }; R3.dyn.add(rig.group); }
  const rig = o.rig;
  setRigShadow(rig, R3.level_q === 'high');
  if (rig.anim) rig.anim(P, { mv: P.moving, w: Math.sin(P.walk) * (P.moving ? 0.75 : 0.05), bob: P.moving ? Math.abs(Math.sin(P.walk)) * 1.6 : 0, lunge: 0, walk: P.walk });
  placeRig(P, rig, P.x, P.y, P.face, 1, dt);
  rigGlows(P, rig, 1, 1);
  if (P.drT > 0) pushGlow(P.x, 14, P.y, 90, '140,200,255', 0.55);
  if (P.invulnT > 0) pushGlow(P.x, 14, P.y, 100, '190,90,255', 0.8);
}

// Projektile
const arrowGeo = () => geo('arrow', () => new THREE.BoxGeometry(16, 1.6, 1.6));
function syncProjs() {
  const maps = R3.maps.projs;
  for (const p of G.projs) {
    let o = maps.get(p);
    if (!o) {
      let m;
      if (p.fire || p.glow) m = new THREE.Mesh(UNIT_SPH(), bas(p.fire ? 0xfff0b0 : 0xf4ffe8));
      else m = new THREE.Mesh(arrowGeo(), bas(0xe8e0c0));
      R3.dyn.add(m); o = { group: m }; maps.set(p, o);
      if (!p.fire && !p.glow) m.rotation.y = -Math.atan2(p.vy, p.vx);
    }
    o.seen = R3.frame;
    const m = o.group, h = 24;
    m.position.set(p.x, h, p.y);
    if (p.fire) {
      m.scale.setScalar(p.r * 0.62);
      pushGlow(p.x, h, p.y, 70 * (p.r / 8), '255,140,50', 0.95); pushGlow(p.x, h, p.y, 30 * (p.r / 8), '255,255,200', 0.9);
    } else if (p.glow) {
      m.scale.setScalar(4);
      pushGlow(p.x, h, p.y, 56, p.glow, 0.95); pushGlow(p.x, h, p.y, 22, '255,255,200', 0.8);
    } else pushGlow(p.x, h, p.y, 22, '255,255,200', 0.4);
  }
  for (const [p, o] of maps) if (o.seen !== R3.frame) { R3.dyn.remove(o.group); maps.delete(p); }
}

// Beute
const RAR_COL = { normal: 0xcfcfcf, magic: 0x6f95ff, rare: 0xffd84a, legendary: 0xff8a2a };
const RAR_RGB = { normal: '255,255,255', magic: '120,150,255', rare: '255,216,74', legendary: '255,140,50' };
function syncDrops() {
  const maps = R3.maps.drops;
  for (const d of G.drops) {
    let o = maps.get(d);
    if (!o) {
      const g = new THREE.Group();
      if (d.coin) {
        const c = new THREE.Mesh(geo('coin', () => new THREE.CylinderGeometry(5, 5, 1.6, 14)), lam(0xffd84a, 0xc89a10, 0.8));
        c.rotation.x = Math.PI / 2.6; g.add(c);
      } else if (d.potion) {
        g.add(new THREE.Mesh(UNIT_SPH(), lam(0xe0343c, 0x901020, 1))); g.children[0].scale.setScalar(6);
      } else {
        const c = RAR_COL[d.item.rarity];
        const gem = new THREE.Mesh(geo('octa', () => new THREE.OctahedronGeometry(1)), lam(c, c, 0.55)); gem.scale.set(6, 8, 6); g.add(gem);
        if (d.item.rarity !== 'normal') {
          const beam = new THREE.Mesh(geo('beam', () => new THREE.CylinderGeometry(3, 3, 90, 8, 1, true)),
            new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
          beam.position.y = 45; beam.userData.beam = true; g.add(beam);
        }
      }
      R3.dyn.add(g); o = { group: g }; maps.set(d, o);
    }
    o.seen = R3.frame;
    const g = o.group;
    g.position.set(d.x, 12 + Math.sin(d.t * 4) * 2, d.y);
    g.children[0].rotation.y = d.t * 2.4;
    if (g.children[1]) { g.children[1].position.y = 45 - g.position.y + 12; g.children[1].material.opacity = 0.3 + 0.12 * Math.sin(d.t * 5); }
    if (d.coin) pushGlow(d.x, 12, d.y, 26, '255,210,90', 0.8);
    else if (d.potion) pushGlow(d.x, 14, d.y, 34, '255,80,40', 0.8);
    else pushGlow(d.x, 14, d.y, d.item.rarity === 'normal' ? 20 : 44, RAR_RGB[d.item.rarity], d.item.rarity === 'normal' ? 0.4 : 0.8);
  }
  for (const [d, o] of maps) if (o.seen !== R3.frame) { R3.dyn.remove(o.group); maps.delete(d); }
}

// Dekor: Glühen & Entfernen zerstörter Objekte
function syncProps(view) {
  const maps = R3.maps.props;
  for (const p of G.props) {
    const o = maps.get(p);
    if (!o) { const g = buildProp(p); R3.dyn.add(g); maps.set(p, { group: g }); }
    else o.seen = R3.frame;
    if (p.gl && view(p.x, p.y, 120)) {
      const fl = p.gl.flick ? 0.8 + 0.2 * Math.sin(G.time * 12 + p.seed) : 0.8 + 0.2 * Math.sin(G.time * 2.4 + p.seed);
      pushGlow(p.x, p.gl.y, p.y, p.gl.s, p.gl.c, p.gl.a * fl);
    }
  }
  for (const [p, o] of maps) {
    if (p.torchGroup) continue;
    if (o.seen !== R3.frame && G.props.indexOf(p) < 0) { R3.dyn.remove(o.group); maps.delete(p); }
  }
}

// Gefahrenzonen
const hazDisc = () => geo('hdisc', () => { const g = new THREE.CircleGeometry(1, 36); g.rotateX(-Math.PI / 2); return g; });
const hazRing = () => geo('hring', () => { const g = new THREE.RingGeometry(0.93, 1, 48); g.rotateX(-Math.PI / 2); return g; });
function syncHazards() {
  const maps = R3.maps.haz;
  for (const h of G.hazards) {
    let o = maps.get(h);
    const pois = h.type === 'poison', col = pois ? 0x78ff5a : 0xff6e28;
    if (!o) {
      const g = new THREE.Group();
      const mk = (geom, op) => new THREE.Mesh(geom, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false }));
      const ring = mk(hazRing(), 0.9), disc = mk(hazDisc(), 0.3);
      ring.position.y = 1; disc.position.y = 0.8; ring.renderOrder = 3; disc.renderOrder = 3;
      g.add(ring, disc); g.position.set(h.x, 0, h.y);
      R3.dyn.add(g); o = { group: g, ring, disc }; maps.set(h, o);
    }
    o.seen = R3.frame;
    if (h.warn > 0) {
      const k = 1 - h.warn / h.max, pulse = 0.65 + 0.35 * Math.sin(G.time * 16);
      o.ring.visible = true; o.ring.scale.set(h.r, 1, h.r); o.ring.material.opacity = 0.9 * pulse;
      o.disc.scale.set(Math.max(2, h.r * k), 1, Math.max(2, h.r * k)); o.disc.material.opacity = 0.18 + 0.3 * k;
    } else {
      o.ring.visible = false;
      o.disc.scale.set(h.r, 1, h.r); o.disc.material.opacity = 0.22 * Math.min(1, h.life);
      pushGlow(h.x, 8, h.y, h.r * 3.4, pois ? '120,255,90' : '255,110,40', (0.5 + 0.15 * Math.sin(G.time * 6 + h.x)) * Math.min(1, h.life));
    }
  }
  for (const [h, o] of maps) if (o.seen !== R3.frame) { R3.dyn.remove(o.group); maps.delete(h); }
}

// Effekte (Ringe, Blitze)
function syncFx() {
  const maps = R3.maps.fx;
  for (const f of G.fx) {
    const k = f.t / f.max;
    if (f.type === 'flash') { pushGlow(f.x, 30, f.y, f.r * 2.4, '255,255,200', 1 - k); continue; }
    let o = maps.get(f);
    if (f.type === 'ring') {
      const rc = f.color === '#ff8a2a' ? 0xff8a2a : f.color === '#c04bff' ? 0xbe5aff : 0x8fd8ff;
      if (!o) {
        const m = new THREE.Mesh(geo('fring', () => { const g = new THREE.RingGeometry(0.82, 1, 56); g.rotateX(-Math.PI / 2); return g; }),
          new THREE.MeshBasicMaterial({ color: rc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const d = new THREE.Mesh(hazDisc(), new THREE.MeshBasicMaterial({ color: rc, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        const g = new THREE.Group(); g.add(m, d); m.position.y = 3; d.position.y = 2; g.position.set(f.x, 0, f.y);
        R3.dyn.add(g); o = { group: g, m, d }; maps.set(f, o);
      }
      o.seen = R3.frame;
      const r = f.r * (0.2 + 0.8 * k);
      o.m.scale.set(r, 1, r); o.d.scale.set(r, 1, r);
      o.m.material.opacity = 1 - k; o.d.material.opacity = 0.25 * (1 - k);
      pushGlow(f.x, 12, f.y, r * 2.2, f.color === '#ff8a2a' ? '255,140,50' : f.color === '#c04bff' ? '190,90,255' : '140,200,255', 0.35 * (1 - k));
    } else if (f.type === 'bolt') {
      if (!o) {
        const n = (f.pts.length - 1) * 6 + 1;
        const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
        const line = new THREE.Line(geom, new THREE.LineBasicMaterial({ color: 0xdff1ff, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        line.frustumCulled = false;
        R3.dyn.add(line); o = { group: line, n }; maps.set(f, o);
      }
      o.seen = R3.frame;
      const arr = o.group.geometry.attributes.position.array; let w = 0;
      const seed = f.seed || (f.seed = Math.random() * 1000);
      for (let i = 0; i < f.pts.length; i++) {
        const q = f.pts[i];
        if (i === 0) { arr[w++] = q.x; arr[w++] = 26; arr[w++] = q.y; continue; }
        const a = f.pts[i - 1];
        for (let j = 1; j <= 6; j++) {
          const t = j / 6, jig = j < 6 ? Math.sin(seed + j * 91.7 + i * 13.1 + G.time * 40) * 9 : 0;
          arr[w++] = a.x + (q.x - a.x) * t + jig; arr[w++] = 26 + Math.sin(seed + j * 7.3 + G.time * 30) * 4; arr[w++] = a.y + (q.y - a.y) * t - jig * 0.7;
          if (j < 6 || true) pushGlow(arr[w - 3], arr[w - 2], arr[w - 1], 26 * (1 - k * 0.5), '160,210,255', 0.55 * (1 - k));
        }
      }
      o.group.geometry.attributes.position.needsUpdate = true;
      o.group.material.opacity = 1 - k;
    }
  }
  for (const [f, o] of maps) if (o.seen !== R3.frame) { R3.dyn.remove(o.group); maps.delete(f); }
}

// Bodenspuren
const decalTex = {};
function decalTexture(kind) {
  if (decalTex[kind]) return decalTex[kind];
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), R = mulberry(kind.length * 977);
  if (kind === 'bone') {
    g.lineCap = 'round'; g.strokeStyle = '#cfc7aa'; g.lineWidth = 3;
    for (let i = 0; i < 6; i++) { const x = 10 + R() * 44, y = 10 + R() * 44, a = R() * 6.28; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 9, y + Math.sin(a) * 9); g.stroke(); }
    g.fillStyle = 'rgba(58,10,16,.35)'; g.beginPath(); g.ellipse(32, 36, 22, 10, 0, 0, 6.28); g.fill();
  } else {
    g.fillStyle = kind === 'boss' ? 'rgba(58,16,80,.85)' : 'rgba(74,10,18,.85)';
    for (let i = 0; i < 9; i++) { const x = 14 + R() * 36, y = 14 + R() * 36, r = 3 + R() * 9; g.beginPath(); g.ellipse(x, y, r, r * 0.65, R() * 3, 0, 6.28); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return decalTex[kind] = t;
}
function syncDecals() {
  const maps = R3.maps.decals;
  for (const d of G.decals) {
    if (maps.has(d)) continue;
    const kind = d.bony ? 'bone' : d.boss ? 'boss' : 'blood';
    const m = new THREE.Mesh(geo('dplane', () => { const g = new THREE.PlaneGeometry(1, 1); g.rotateX(-Math.PI / 2); return g; }),
      new THREE.MeshBasicMaterial({ map: decalTexture(kind), transparent: true, depthWrite: false }));
    m.position.set(d.x, 0.9, d.y); m.rotation.y = Math.random() * 6.28; m.scale.setScalar(d.boss ? 96 : 52); m.renderOrder = 1;
    R3.dyn.add(m); maps.set(d, { group: m });
  }
  if (maps.size > G.decals.length + 5) {
    for (const [d, o] of maps) if (G.decals.indexOf(d) < 0) { R3.dyn.remove(o.group); maps.delete(d); }
  }
}

// Treppe
function syncStairs() {
  if (G.stairs && !R3.stairsMesh) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(hazDisc(), new THREE.MeshBasicMaterial({ color: 0x06040a })));
    g.children[0].scale.set(26, 1, 26); g.children[0].position.y = 1.2;
    const ring = new THREE.Mesh(geo('stairRing', () => new THREE.TorusGeometry(26, 2.2, 6, 28)), new THREE.MeshBasicMaterial({ color: 0xe8b36a }));
    ring.rotation.x = Math.PI / 2; ring.position.y = 2; g.add(ring);
    g.position.set(G.stairs.x, 0, G.stairs.y);
    R3.dyn.add(g); R3.stairsMesh = g;
  }
  if (G.stairs) pushGlow(G.stairs.x, 14, G.stairs.y, 110 + 10 * Math.sin(G.time * 4), '255,200,100', 0.8);
}

// ---------- Overlay (Zahlen, Balken, Namen) ----------
function project(x, y, z) {
  v3.set(x, y, z).project(R3.cam);
  if (v3.z > 1 || v3.z < -1) return null;
  return [(v3.x * 0.5 + 0.5) * G.vw, (-v3.y * 0.5 + 0.5) * G.vh];
}
function drawOverlay() {
  const c = R3.octx, d = R3.odpr;
  c.setTransform(d, 0, 0, d, 0, 0);
  c.clearRect(0, 0, G.vw, G.vh);
  c.textAlign = 'center'; c.lineJoin = 'round';
  // Lebensbalken
  for (const e of G.enemies) {
    if (!(e.state !== 'idle' || e.hp < e.maxHp)) continue;
    const top = (e.boss ? 3.4 : e.r * (HEIGHT_K[e.type] || 3.2)) * (e.boss ? e.r / 3 : 1) + 8;
    const sp = project(e.x, e.boss ? e.r * 2.6 + 12 : top, e.y);
    if (!sp || sp[0] < -50 || sp[0] > G.vw + 50 || sp[1] < -50 || sp[1] > G.vh + 50) continue;
    const w = Math.max(30, e.r * 2) * G.zoom * 0.95;
    c.fillStyle = 'rgba(0,0,0,.75)'; c.fillRect(sp[0] - w / 2 - 1, sp[1] - 1, w + 2, 6);
    c.fillStyle = e.elite ? '#ffd84a' : e.boss ? '#c04bff' : '#c8323a';
    c.fillRect(sp[0] - w / 2, sp[1], w * clamp(e.hp / e.maxHp, 0, 1), 4);
    if (e.elite) {
      c.font = '11px system-ui'; c.lineWidth = 3; c.strokeStyle = '#000'; c.fillStyle = '#ffd84a';
      c.strokeText(e.name, sp[0], sp[1] - 6); c.fillText(e.name, sp[0], sp[1] - 6);
    }
  }
  // Beute-Namen
  for (const dr of G.drops) {
    if (dr.potion || dr.coin) continue;
    const sp = project(dr.x, 26, dr.y);
    if (!sp || sp[0] < -80 || sp[0] > G.vw + 80 || sp[1] < -30 || sp[1] > G.vh + 30) continue;
    c.font = '12px system-ui'; c.lineWidth = 3; c.strokeStyle = '#000'; c.fillStyle = RARITY[dr.item.rarity].color;
    c.strokeText(dr.item.name, sp[0], sp[1]); c.fillText(dr.item.name, sp[0], sp[1]);
  }
  // Schadenszahlen
  for (const t of G.texts) {
    const sp = project(t.x, 44, t.y);
    if (!sp) continue;
    c.globalAlpha = 1 - t.t / 0.9;
    c.font = (t.big ? 'bold 24px' : 'bold 16px') + ' system-ui';
    c.lineWidth = 3; c.strokeStyle = '#000';
    const yy = sp[1] - t.t * 46;
    c.strokeText(t.text, sp[0], yy); c.fillStyle = t.color; c.fillText(t.text, sp[0], yy);
  }
  c.globalAlpha = 1;
}

// ---------- Hauptschleife ----------
function render3d() {
  const dtReal = Math.min(0.1, R3.dtReal || 0.016);
  R3.frame++;
  if (!G.map) { R3.renderer.clear(); return; }
  if (R3.dirty) buildLevel();
  const Q = Q_LEVELS[R3.level_q];
  const dts = (G.state === 'play' && !G.paused && G.hitstop <= 0) ? (G.dt || 0.016) : 0;
  R3.glow.n = 0; R3.solid.n = 0;

  // Kamera
  const dist = 360 / (G.zoom * (G.camZoom || 1)), pitch = G.camTilt || 0.95;
  // leichter Vorlauf in Laufrichtung
  const mv = G.state === 'play' && !G.paused ? Input.moveVec() : { x: 0, y: 0 };
  R3.lx = (R3.lx || 0) + (mv.x * 50 - (R3.lx || 0)) * Math.min(1, dtReal * 2.5);
  R3.lz = (R3.lz || 0) + (mv.y * 40 - (R3.lz || 0)) * Math.min(1, dtReal * 2.5);
  const cx = G.cam.x + R3.lx, cz = G.cam.y + R3.lz;
  const sx = (G.shake ? rnd(-G.shake, G.shake) : 0) + G.kx, sz = (G.shake ? rnd(-G.shake, G.shake) : 0) + G.ky;
  R3.cam.position.set(cx + sx, dist * Math.sin(pitch) + 6, cz + dist * Math.cos(pitch) + sz);
  R3.cam.lookAt(cx + sx, 14, cz + sz);
  // Mond-Licht folgt dem Spieler (auf Texel gerastert, damit Schatten nicht flimmern)
  R3.sun.target.position.set(Math.round(P.x), 0, Math.round(P.y));
  R3.sun.position.set(Math.round(P.x) - 330, 760, Math.round(P.y) + 420);
  R3.cam.updateMatrixWorld();

  const hw = G.vw / G.zoom / 2 + 260, hh = G.vh / G.zoom / 2 + 360;
  const view = (x, y, m) => Math.abs(x - G.cam.x) < hw + m && Math.abs(y - G.cam.y) < hh + m;

  // Dekor-Glühen, Fackeln
  const th = G.theme;
  for (const f of R3.flames) {
    const fl = 0.8 + 0.5 * Math.abs(Math.sin(G.time * 14 + f.ph)) + 0.15 * Math.sin(G.time * 31 + f.ph);
    f.m.scale.set(1, fl * f.base, 1);
  }
  for (const t of G.torches) {
    if (!view(t.x, t.y, 60)) continue;
    const z0 = t.y + TILE / 2;
    if (th.wall === 'crystal') pushGlow(t.x, 44, z0 + 8, 100, th.lightCol, 0.6 + 0.2 * Math.sin(G.time * 2 + t.ph));
    else {
      const fl = 0.8 + 0.2 * Math.sin(G.time * 12 + t.ph) + 0.08 * Math.sin(G.time * 27 + t.ph);
      pushGlow(t.x, th.wall === 'brazier' ? 66 : 68, z0 + 5, th.wall === 'brazier' ? 120 : 90, th.lightCol, 0.85 * fl);
    }
  }
  if (R3.glowMat) R3.glowMat.opacity = 0.55 + 0.25 * Math.sin(G.time * 1.7);
  if (th.wall !== 'crystal') for (const t of G.torches) {
    if (!view(t.x, t.y, 40)) continue;
    for (let k = 0; k < 4; k++) {
      const u = (G.time * 0.7 + k * 0.25 + t.ph) % 1, z0 = t.y + TILE / 2;
      pushGlow(t.x + Math.sin(k * 7 + t.ph + G.time * 2) * 7 * u, 72 + u * 55, z0 + 6 + Math.cos(k * 5 + t.ph) * 4 * u, 7 * (1 - u), th.lightCol, 0.9 * (1 - u));
    }
  }
  // Schwebeteilchen
  const am = th.amb;
  for (const p of G.amb) {
    if (!view(p.x, p.y, 20)) continue;
    pushGlow(p.x, 14 + ((p.ph * 17) % 60) + Math.sin(G.time + p.ph) * 4, p.y, 9 * am.size * p.s, am.col, am.a * (0.5 + 0.5 * Math.sin(G.time * 2 + p.ph)));
  }

  if (G.chest && view(G.chest.x, G.chest.y, 60)) pushGlow(G.chest.x, 22, G.chest.y, 70 + 8 * Math.sin(G.time * 3), '255,210,120', G.nearChest ? 0.95 : 0.6);
  syncDecals();
  syncProps(view);
  syncEnemies(dtReal, view);
  syncPlayer(dtReal);
  syncProjs();
  syncDrops();
  syncHazards();
  syncFx();
  syncStairs();

  // Partikel
  let used = 0;
  for (const p of G.parts) {
    if (p.h === undefined) { p.h = 6 + Math.random() * 12; p.vh = (p.vx === 0 && p.vy < 0) ? -p.vy : (Math.random() - 0.25) * 140; }
    if (dts > 0) { p.h += p.vh * dts; if (!p.add) { p.vh -= 260 * dts; if (p.h < 1) { p.h = 1; p.vh = 0; } } }
    if (!view(p.x, p.y, 20)) continue;
    const a = clamp(p.life / p.max, 0, 1);
    if (p.add) { if (used++ < 500 * Q.parts) pushGlow(p.x, p.h, p.y, p.size * 3.4, p.color, a); }
    else pushSolid(p.x, p.h, p.y, p.size * 2.4, p.color, a);
  }

  updateLights(dtReal);

  for (const B of [R3.glow, R3.solid]) {
    B.geom.attributes.position.needsUpdate = true; B.geom.attributes.col.needsUpdate = true; B.geom.attributes.size.needsUpdate = true;
    B.geom.setDrawRange(0, B.n);
  }
  R3.renderer.render(R3.scene, R3.cam);
  drawOverlay();

  // DOM-Effekte
  R3.hurt.style.opacity = G.hurtFlash > 0 ? (G.hurtFlash * 2.2).toFixed(2) : '0';
  const low = P.hp < P.maxHp * 0.3 && G.state === 'play';
  if (R3.lowFlag !== low) { R3.lowFlag = low; R3.vig.classList.toggle('low', low); }

  adaptQuality(dtReal);
}

// Automatische Qualitätsanpassung
function adaptQuality(dt) {
  if (G.quality !== 'auto' || G.paused || G.state !== 'play') return;
  R3.ftAvg = R3.ftAvg === undefined ? dt : R3.ftAvg * 0.97 + dt * 0.03;
  R3.ftN = (R3.ftN || 0) + 1;
  if (R3.ftN < 150) return;
  if (R3.ftAvg > 0.026 && R3.level_q !== 'low') {
    R3.level_q = R3.level_q === 'high' ? 'mid' : 'low'; R3.ftN = 0; R3.ftAvg = 0.016; applyQuality();
    if (UI.updateGfxButtons) UI.updateGfxButtons();
  } else if (R3.ftAvg < 0.012 && R3.ftN > 900 && R3.level_q === 'low') {
    R3.level_q = 'mid'; R3.ftN = 0; applyQuality();
  }
}

R3.screenToWorld = function (mx, my) {
  const ndcX = mx / G.vw * 2 - 1, ndcY = -(my / G.vh * 2 - 1);
  v3.set(ndcX, ndcY, -1).unproject(R3.cam);
  v3b.set(ndcX, ndcY, 1).unproject(R3.cam);
  v3b.sub(v3);
  const t = -v3.y / v3b.y;
  return { x: v3.x + v3b.x * t, y: v3.z + v3b.z * t };
};

// Verteiler: 3D oder 2D
function render() {
  if (G.gfx === '3d' && R3.ready) render3d(); else render2d();
}
