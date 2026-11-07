'use strict';
// Mundo: mapa em grade, relevo, água, árvores, ruas, zonas, lotes e construções.

const PS = 16; // tamanho de um lote (bairro) em tiles
const TREE_TYPES = ['round', 'pine', 'palm', 'ipe', 'mix'];
const TT = { WATER: 0, GRASS: 1, SAND: 2, ROCK: 3, DIRT: 4, DEEP: 5 };
const NB4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];

let W = null;

function allocWorld(N, seed) {
  const n = N * N, PN = N / PS;
  W = {
    N, seed, PN,
    h: new Int8Array(n), tt: new Uint8Array(n), tree: new Uint8Array(n), zone: new Uint8Array(n),
    road: new Uint8Array(n), bld: new Int32Array(n).fill(-1), rub: new Uint8Array(n),
    owned: new Uint8Array(PN * PN), plotNames: new Array(PN * PN).fill(''),
    comp: new Int32Array(n), extComp: -1, roadsDirty: true,
    blds: [], free: [],
  };
  return W;
}

const idx = (x, y) => y * W.N + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < W.N && y < W.N;
const isWater = i => W.h[i] <= 0;
const plotIdx = (x, y) => (y >> 4) * W.PN + (x >> 4);
const ownedAt = (x, y) => inb(x, y) && W.owned[plotIdx(x, y)] === 1;

function treeByte(type, count, variant) { return (TREE_TYPES.indexOf(type) + 1) << 5 | (count << 3) | (variant & 7); }
function treeInfo(b) { return { type: TREE_TYPES[(b >> 5) - 1], count: (b >> 3) & 3, v: b & 7 }; }

/* ---------- Geração ---------- */
function genWorld(N, seed, terrain) {
  allocWorld(N, seed);
  RNG = mulberry32(seed);
  const { h } = W;
  const side = ri(0, 3);
  let wl = 0.36;
  if (terrain === 'lagos') wl = 0.4;
  if (terrain === 'seco') wl = 0.22;
  if (terrain === 'serra') wl = 0.3;
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let e = fbm(x * 0.045, y * 0.045, seed, 5);
    e = (e - 0.5) * 1.6 + 0.55;
    if (terrain === 'costa') {
      const d = [x, y, N - 1 - x, N - 1 - y][side] / N;
      e = e * 0.55 + Math.min(1, d * 2.2) * 0.55 - 0.08;
    }
    if (terrain === 'serra') e += Math.max(0, fbm(x * 0.03, y * 0.03, seed + 77, 3) - 0.45) * 1.4;
    if (terrain === 'rio' || terrain === 'seco') e = e * 0.7 + 0.25;
    // bordas do mapa um pouco mais altas evitam ilhas cortadas
    h[idx(x, y)] = e < wl ? 0 : clamp(1 + Math.floor((e - wl) / (1 - wl) * 7), 1, 7);
  }
  if (terrain === 'rio' || terrain === 'seco' || (terrain === 'lagos' && chance(0.5))) carveRiver(terrain === 'seco' ? 1 : 2);
  // garante o centro em terra firme para começar
  for (let y = N / 2 - 6; y < N / 2 + 6; y++) for (let x = N / 2 - 6; x < N / 2 + 6; x++) if (h[idx(x, y)] === 0 && chance(0.85)) h[idx(x, y)] = 1;
  smoothHeights();
  // árvores
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = idx(x, y);
    if (isWater(i)) continue;
    const f = fbm(x * 0.08, y * 0.08, seed + 5, 3);
    const dry = terrain === 'seco' ? 0.12 : 0;
    const nearW = nearWater(x, y, 1);
    if (h[i] === 1 && nearW) { if (chance(0.18)) W.tree[i] = treeByte('palm', ri(1, 2), ri(0, 7)); continue; }
    if (f > 0.56 + dry) {
      const type = h[i] >= 5 ? 'pine' : (chance(0.08) ? 'ipe' : (chance(0.4) ? 'mix' : 'round'));
      W.tree[i] = treeByte(type, f > 0.66 ? 3 : f > 0.6 ? 2 : 1, ri(0, 7));
    } else if (chance(0.025 - dry * 0.1)) W.tree[i] = treeByte(chance(0.2) ? 'ipe' : 'round', 1, ri(0, 7));
  }
  recalcTT(0, 0, N - 1, N - 1);
  // rodovia vindo de uma borda até o centro
  const sides = [0, 1, 2, 3].sort(() => rnd() - 0.5);
  let hs = sides.find(s => s !== side) ?? 0;
  if (terrain !== 'costa') hs = sides[0];
  const c = N >> 1;
  for (let k = 0; k <= c; k++) {
    let x, y;
    if (hs === 0) { x = k; y = c; } else if (hs === 1) { x = c; y = k; } else if (hs === 2) { x = N - 1 - k; y = c; } else { x = c; y = N - 1 - k; }
    const i = idx(x, y);
    W.road[i] = 3; W.tree[i] = 0;
  }
  W.highwaySide = hs;
  // lotes iniciais: 2x2 no centro
  const pc = W.PN / 2;
  for (const [px, py] of [[pc - 1, pc - 1], [pc, pc - 1], [pc - 1, pc], [pc, pc]]) buyPlotRaw(px, py);
  W.roadsDirty = true;
  RNG = mulberry32((seed * 7 + 13) | 0);
}

function carveRiver(width) {
  const N = W.N, horiz = chance(0.5);
  let p = N * (0.25 + rnd() * 0.5);
  for (let t = -2; t < N + 2; t++) {
    p += (fbm(t * 0.05, 3, W.seed + 31, 2) - 0.5) * 2.2;
    p = clamp(p, 6, N - 7);
    const r = width + (fbm(t * 0.1, 9, W.seed, 2) > 0.6 ? 1 : 0);
    for (let k = -r - 2; k <= r + 2; k++) {
      const x = horiz ? t : Math.round(p + k), y = horiz ? Math.round(p + k) : t;
      if (!inb(x, y)) continue;
      const i = idx(x, y);
      if (Math.abs(k) <= r) W.h[i] = 0; else if (W.h[i] > 2) W.h[i] = 2;
    }
  }
}

function smoothHeights() {
  const { N, h } = W;
  for (let pass = 0; pass < 12; pass++) {
    let changed = false;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const i = idx(x, y);
      if (h[i] === 0) continue;
      let m = 99;
      for (const [dx, dy] of NB4) if (inb(x + dx, y + dy)) m = Math.min(m, Math.max(0, h[idx(x + dx, y + dy)]));
      if (h[i] > m + 1) { h[i] = m + 1; changed = true; }
    }
    if (!changed) break;
  }
}

function nearWater(x, y, r) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (inb(x + dx, y + dy) && W.h[idx(x + dx, y + dy)] <= 0) return true;
  }
  return false;
}

function recalcTT(x0, y0, x1, y1) {
  for (let y = Math.max(0, y0); y <= Math.min(W.N - 1, y1); y++) for (let x = Math.max(0, x0); x <= Math.min(W.N - 1, x1); x++) {
    const i = idx(x, y), h = W.h[i];
    let t;
    if (h <= 0) {
      let deep = true;
      for (let dy = -2; dy <= 2 && deep; dy++) for (let dx = -2; dx <= 2; dx++) if (inb(x + dx, y + dy) && W.h[idx(x + dx, y + dy)] > 0) { deep = false; break; }
      t = deep ? TT.DEEP : TT.WATER;
    } else if (h === 1 && nearWater(x, y, 1)) t = TT.SAND;
    else if (h >= 6 || (h === 5 && hash2(x, y, W.seed) < 0.5)) t = TT.ROCK;
    else t = TT.GRASS;
    W.tt[i] = t;
  }
}

/* ---------- Lotes ---------- */
function buyPlotRaw(px, py) {
  const p = py * W.PN + px;
  if (W.owned[p]) return;
  W.owned[p] = 1;
  const used = new Set(W.plotNames.filter(Boolean));
  const opts = BAIRROS.filter(n => !used.has(n));
  W.plotNames[p] = used.size === 0 ? 'Centro' : (opts.length ? pick(opts) : 'Bairro ' + (used.size + 1));
}
function plotPrice() {
  const k = W.owned.reduce((a, b) => a + b, 0);
  return Math.round(4000 * Math.pow(1.35, k - 4) / 500) * 500;
}
function plotBuyable(px, py) {
  if (px < 0 || py < 0 || px >= W.PN || py >= W.PN || W.owned[py * W.PN + px]) return false;
  return [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => {
    const qx = px + dx, qy = py + dy;
    return qx >= 0 && qy >= 0 && qx < W.PN && qy < W.PN && W.owned[qy * W.PN + qx];
  });
}

/* ---------- Ruas e conectividade ---------- */
function roadMask(x, y) {
  let m = 0;
  const r = (dx, dy) => inb(x + dx, y + dy) && W.road[idx(x + dx, y + dy)] > 0;
  if (r(1, 0)) m |= 1; if (r(-1, 0)) m |= 2; if (r(0, 1)) m |= 4; if (r(0, -1)) m |= 8;
  // rodovia nas bordas continua para fora do mapa
  if (W.road[idx(x, y)] === 3) {
    if (x === 0) m |= 2; if (y === 0) m |= 8; if (x === W.N - 1) m |= 1; if (y === W.N - 1) m |= 4;
  }
  return m;
}

function recomputeRoads() {
  const { N, road, comp } = W;
  comp.fill(-1);
  let id = 0;
  W.extComp = -1;
  const q = new Int32Array(N * N);
  for (let s = 0; s < N * N; s++) {
    if (!road[s] || comp[s] >= 0) continue;
    let qh = 0, qt = 0;
    q[qt++] = s; comp[s] = id;
    let ext = false;
    while (qh < qt) {
      const i = q[qh++], x = i % N, y = (i / N) | 0;
      if (road[i] === 3 && (x === 0 || y === 0 || x === N - 1 || y === N - 1)) ext = true;
      for (const [dx, dy] of NB4) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const j = idx(nx, ny);
        if (road[j] && comp[j] < 0) { comp[j] = id; q[qt++] = j; }
      }
    }
    if (ext) W.extComp = id;
    id++;
  }
  W.roadsDirty = false;
}

// A construção encosta numa rua ligada à rodovia?
function roadAccess(x, y, w, h, needConnected = true) {
  for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) {
    const edge = (xx === x - 1 || xx === x + w) !== (yy === y - 1 || yy === y + h);
    if (!edge || !inb(xx, yy)) continue;
    const j = idx(xx, yy);
    if (W.road[j] && (!needConnected || W.comp[j] === W.extComp)) return j;
  }
  return -1;
}

/* ---------- Construções ---------- */
function footprintOK(x, y, w, h, opts = {}) {
  if (!inb(x, y) || !inb(x + w - 1, y + h - 1)) return 'Fora do mapa';
  const h0 = W.h[idx(x, y)];
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) {
    const i = idx(xx, yy);
    if (!ownedAt(xx, yy)) return 'Terreno não comprado';
    if (W.h[i] <= 0) return 'Não dá para construir na água';
    if (W.h[i] !== h0) return 'O terreno precisa ser plano';
    if (W.bld[i] >= 0) return 'Já tem construção aqui';
    if (W.road[i]) return 'Tem rua aqui';
    if (!opts.allowZone && W.zone[i]) return 'Zona ocupada';
  }
  return null;
}

function needsOK(def, x, y) {
  const { w, h } = def;
  if (def.needs === 'water') {
    for (let yy = y - 1; yy <= y + h; yy++) for (let xx = x - 1; xx <= x + w; xx++) if (inb(xx, yy) && W.h[idx(xx, yy)] <= 0) return null;
    return 'Precisa ficar encostado na água';
  }
  if (def.needs === 'forest') {
    let n = 0;
    for (let yy = y - 4; yy < y + h + 4; yy++) for (let xx = x - 4; xx < x + w + 4; xx++) if (inb(xx, yy) && W.tree[idx(xx, yy)]) n++;
    return n >= 8 ? null : 'Precisa de mata por perto (8 árvores)';
  }
  if (def.needs === 'rock') {
    let n = 0;
    for (let yy = y - 3; yy < y + h + 3; yy++) for (let xx = x - 3; xx < x + w + 3; xx++) if (inb(xx, yy) && W.h[idx(xx, yy)] >= 4) n++;
    return n >= 5 ? null : 'Precisa de serra por perto (terreno alto)';
  }
  return null;
}

function addBuilding(b) {
  const id = W.free.length ? W.free.pop() : W.blds.length;
  b.id = id;
  W.blds[id] = b;
  for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) {
    const i = idx(xx, yy);
    W.bld[i] = id; W.tree[i] = 0; W.rub[i] = 0;
  }
  return b;
}

function removeBuilding(id, rubble) {
  const b = W.blds[id];
  if (!b) return;
  for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) {
    const i = idx(xx, yy);
    W.bld[i] = -1;
    if (rubble) W.rub[i] = 20;
  }
  W.blds[id] = null;
  W.free.push(id);
}

/* ---------- Terraplanagem ---------- */
// Altera a altura de um tile e ajusta os vizinhos para não haver degraus maiores que 1.
// Retorna a lista de tiles alterados, ou null se esbarrar em ruas/construções.
function terraform(x, y, target) {
  const changes = new Map();
  const get = (i) => changes.has(i) ? changes.get(i) : W.h[i];
  const q = [[x, y, target]];
  while (q.length) {
    const [cx, cy, th] = q.pop();
    const i = idx(cx, cy);
    const cur = get(i);
    if (cur === th) continue;
    if (W.bld[i] >= 0 || W.road[i] || !ownedAt(cx, cy)) return null;
    changes.set(i, th);
    if (changes.size > 60) return null;
    for (const [dx, dy] of NB4) {
      const nx = cx + dx, ny = cy + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny), hj = Math.max(0, get(j)), hh = Math.max(0, th);
      if (hj > hh + 1) q.push([nx, ny, hh + 1]);
      else if (hj < hh - 1) q.push([nx, ny, hh - 1]);
    }
  }
  for (const [i, v] of changes) {
    W.h[i] = v;
    if (v <= 0) { W.tree[i] = 0; W.zone[i] = 0; }
  }
  recalcTT(x - 4, y - 4, x + 4, y + 4);
  for (const i of changes.keys()) { const cx = i % W.N, cy = (i / W.N) | 0; recalcTT(cx - 3, cy - 3, cx + 3, cy + 3); }
  return [...changes.keys()];
}
