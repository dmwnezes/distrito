'use strict';
// Gerador de pixel art isométrica. Tudo é desenhado pixel a pixel em buffers,
// com uma versão de dia e uma de noite (janelas acesas).

const TW = 32, TH = 16, LH = 4; // largura/altura do losango e altura de um nível de relevo

const rgb = (r, g, b, a = 255) => ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
function hex(h, a = 255) { const n = parseInt(h.slice(1), 16); return rgb(n >> 16 & 255, n >> 8 & 255, n & 255, a); }
function shade(c, f) {
  const r = Math.min(255, (c & 255) * f), g = Math.min(255, (c >>> 8 & 255) * f), b = Math.min(255, (c >>> 16 & 255) * f);
  return rgb(r | 0, g | 0, b | 0, c >>> 24);
}
function mix(c1, c2, t) {
  const f = (s) => ((c1 >>> s & 255) * (1 - t) + (c2 >>> s & 255) * t) | 0;
  return rgb(f(0), f(8), f(16), c1 >>> 24);
}

let _lit = 0; // marcado pelos "shaders" quando o pixel é uma janela que acende à noite

class PB {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Uint32Array(w * h); this.L = new Uint8Array(w * h); }
  set(x, y, c, lit = 0) {
    x |= 0; y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h || !c) return;
    const i = y * this.w + x;
    if ((c >>> 24) < 255 && this.d[i]) { // pixel semitransparente sobre outro: mistura
      const a = (c >>> 24) / 255;
      this.d[i] = mix(this.d[i], c | 0xff000000, a) | 0xff000000;
      return;
    }
    this.d[i] = c; this.L[i] = lit;
  }
  get(x, y) { return (x < 0 || y < 0 || x >= this.w || y >= this.h) ? 0 : this.d[y * this.w + x]; }
  poly(pts, fn) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of pts) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0));
    x1 = Math.min(this.w - 1, Math.ceil(x1)); y1 = Math.min(this.h - 1, Math.ceil(y1));
    const n = pts.length;
    for (let y = y0; y <= y1; y++) {
      const py = y + 0.5;
      for (let x = x0; x <= x1; x++) {
        const px = x + 0.5;
        let ins = false;
        for (let i = 0, j = n - 1; i < n; j = i++) {
          const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
          if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) ins = !ins;
        }
        if (ins) { _lit = 0; const c = typeof fn === 'function' ? fn(x, y) : fn; if (c) this.set(x, y, c, _lit); }
      }
    }
  }
  rect(x, y, w, h, c, lit = 0) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j, c, lit); }
}

function toCanvas(pb, mode) {
  const cv = document.createElement('canvas');
  cv.width = pb.w; cv.height = pb.h;
  const ctx = cv.getContext('2d');
  const img = ctx.createImageData(pb.w, pb.h);
  const out = new Uint32Array(img.data.buffer);
  const d = pb.d, L = pb.L, w = pb.w;
  const warm = rgb(255, 214, 128), warmDim = rgb(120, 96, 70);
  for (let i = 0; i < d.length; i++) {
    const c = d[i];
    if (!c) continue;
    if (mode === 'day') { out[i] = c; continue; }
    const r = c & 255, g = c >>> 8 & 255, b = c >>> 16 & 255, a = c >>> 24;
    if (mode === 'dim') { const y = (r * 0.3 + g * 0.5 + b * 0.2) * 0.55; out[i] = rgb(y + 8, y + 6, y + 4, a); continue; }
    if (L[i] === 2) { out[i] = c; continue; } // luz sempre acesa (postes, faróis)
    if (L[i] === 1) {
      const x = i % w, y = (i / w) | 0;
      out[i] = hash2(x >> 1, y >> 2, pb.w * 7 + pb.h) < 0.62 ? warm : warmDim;
      continue;
    }
    out[i] = rgb(r * 0.27 + 6, g * 0.3 + 8, b * 0.45 + 20, a);
  }
  if (mode === 'night') { // brilho suave em volta das janelas acesas
    const add = new Uint32Array(out);
    for (let i = 0; i < d.length; i++) {
      if (!L[i] || out[i] === warmDim) continue;
      const x = i % w;
      for (const k of [-1, 1, -w, w]) {
        const j = i + k;
        if (j < 0 || j >= d.length || L[j] || !d[j]) continue;
        if ((k === -1 && x === 0) || (k === 1 && x === w - 1)) continue;
        add[j] = mix(out[j], warm, 0.22);
      }
    }
    out.set(add);
  }
  ctx.putImageData(img, 0, 0);
  return cv;
}

function finalize(pb, ox, oy, extra) {
  const s = { c: toCanvas(pb, 'day'), n: toCanvas(pb, 'night'), pb, w: pb.w, h: pb.h, ox, oy };
  return Object.assign(s, extra || {});
}
function dimOf(s) { if (!s.dm) s.dm = toCanvas(s.pb, 'dim'); return s.dm; }

/* ---------- Geometria isométrica ---------- */
// iso(ax, ay): converte coordenadas do tile (u, v, altura z) em pixels do buffer
const isoF = (ax, ay) => (u, v, z = 0) => [ax + (u - v) * 16, ay + (u + v) * 8 - z];

function face(pb, A, B, z0, H, fn) {
  const x0 = Math.round(A[0]), x1 = Math.round(B[0]), n = x1 - x0;
  if (n <= 0) return;
  const slope = (B[1] - A[1]) / (B[0] - A[0]);
  for (let x = x0; x < x1; x++) {
    const base = Math.floor(A[1] + (x + 0.5 - A[0]) * slope) - z0;
    for (let z = 0; z <= H; z++) {
      _lit = 0;
      const c = typeof fn === 'function' ? fn(x - x0, z, n, H) : fn;
      if (c) pb.set(x, base - z, c, _lit);
    }
  }
}

// Caixa isométrica com faces esquerda (L), direita (R) e topo (T). z0 = altura da base.
function box(pb, P, u0, v0, fu, fv, H, o) {
  const z0 = o.z0 || 0;
  const T = P(u0, v0, z0), R = P(u0 + fu, v0, z0), B = P(u0 + fu, v0 + fv, z0), L = P(u0, v0 + fv, z0);
  if (H > 0) {
    face(pb, L, B, 0, H, o.L);
    face(pb, B, R, 0, H, o.R);
  }
  const up = p => [p[0], p[1] - H];
  if (o.T) pb.poly([up(T), up(R), up(B), up(L)], o.T);
  return { T: up(T), R: up(R), B: up(B), L: up(L), z: z0 + H };
}

// Telhados
function roofHip(pb, P, u0, v0, fu, fv, z, rh, col) {
  const T = P(u0, v0, z), R = P(u0 + fu, v0, z), B = P(u0 + fu, v0 + fv, z), L = P(u0, v0 + fv, z);
  const A = P(u0 + fu / 2, v0 + fv / 2, z + rh);
  const tex = (f) => (x, y) => shade(col, f * (y % 3 === 0 ? 0.9 : 1));
  pb.poly([T, L, A], tex(0.85)); pb.poly([T, R, A], tex(0.95));
  pb.poly([L, B, A], tex(1.1)); pb.poly([B, R, A], tex(0.78));
}
function roofGable(pb, P, u0, v0, fu, fv, z, rh, col, wall, alongU) {
  const T = P(u0, v0, z), R = P(u0 + fu, v0, z), B = P(u0 + fu, v0 + fv, z), L = P(u0, v0 + fv, z);
  const tex = (f) => (x, y) => shade(col, f * ((y + x) % 4 === 0 ? 0.88 : 1));
  if (alongU) {
    const P1 = P(u0, v0 + fv / 2, z + rh), P2 = P(u0 + fu, v0 + fv / 2, z + rh);
    pb.poly([T, R, P2, P1], tex(0.92));
    pb.poly([L, B, P2, P1], tex(1.1));
    pb.poly([B, R, P2], shade(wall, 0.78));
  } else {
    const P1 = P(u0 + fu / 2, v0, z + rh), P2 = P(u0 + fu / 2, v0 + fv, z + rh);
    pb.poly([T, L, P2, P1], tex(0.92));
    pb.poly([P1, P2, B, R], tex(0.8));
    pb.poly([L, B, P2], shade(wall, 1.0));
  }
}

// Cilindro vertical (caixas d'água, silos, torres)
function cyl(pb, cx, cy, r, H, col, o = {}) {
  for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const dx = (x + 0.5 - cx) / r;
    if (Math.abs(dx) > 1) continue;
    const e = Math.sqrt(1 - dx * dx) * r / 2;
    const f = 1.12 - (dx + 1) * 0.22;
    for (let z = 0; z <= H; z++) {
      const k = o.taper ? 1 - o.taper * Math.sin(Math.PI * z / H) : 1;
      if (Math.abs(dx) > k) continue;
      let c = shade(col, f);
      if (o.stripe && Math.floor(z / o.stripe) % 2) c = shade(o.c2, f);
      if (o.win && z > 2 && z < H - 2 && z % 4 === 0 && x % 2 === 0) { c = hex('#2c3e50'); _lit = 1; } else _lit = 0;
      pb.set(x, Math.floor(cy + e - z), c, _lit);
    }
  }
  const top = o.top !== undefined ? o.top : shade(col, 1.2);
  if (top) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const dx = (x + 0.5 - cx) / r;
    if (Math.abs(dx) > 1) continue;
    const e = Math.sqrt(1 - dx * dx) * r / 2;
    for (let y = Math.floor(cy - e - H); y <= cy + e - H; y++) pb.set(x, y, top);
  }
}

// Shader de parede com janelas, porta e vitrine
function wallFn(o) {
  const glass = o.glass || hex('#3d5a73');
  return (i, z, n, H) => {
    if (o.cornice && z >= H - o.cornice + 1) return o.trim;
    let c = o.c;
    if (o.ground === 'shop' && z < o.gh) {
      if (z === o.gh - 1) return o.awning ? ((i >> 1) % 2 ? o.awning : hex('#f4efe6')) : o.trim;
      if (i >= 1 && i < n - 1 && z >= 1) { _lit = 1; return z === o.gh - 2 ? shade(glass, 1.4) : glass; }
      return shade(c, 0.8);
    }
    if (o.door !== undefined && z >= 1 && z <= 4 && i >= o.door && i < o.door + 2) return o.doorC || hex('#5b3a29');
    if (o.bands) { // faixas de vidro (prédios comerciais)
      const zz = z - (o.gz || 0);
      if (zz >= 0 && zz % o.bands < o.bands - 1 && i >= 1 && i < n - 1) { _lit = 1; return (i + zz) % 7 === 0 ? shade(glass, 1.5) : glass; }
    }
    if (o.win) {
      const zz = z - (o.gz || 2);
      if (zz >= 0 && z < H - (o.cornice || 1)) {
        const r = zz % o.fh, ci = i - (o.m || 1);
        if (ci >= 0 && i < n - (o.m || 1) && r >= o.wy && r < o.wy + o.wh && ci % (o.ww + o.wg) < o.ww) {
          _lit = 1;
          return r === o.wy ? shade(o.win, 1.25) : o.win;
        }
      }
    }
    if (o.tex && hash2(i, z, o.seed || 1) < o.tex) c = shade(c, 0.93);
    return c;
  };
}

/* ---------- Cache de sprites ---------- */
const SPR = {};
function spr(key, make) { return SPR[key] || (SPR[key] = make()); }

const WALLS = ['#eadfc8', '#f3e3b3', '#ecc9b5', '#cfe0e8', '#f6f2ea', '#d5e7c6', '#f0d39e', '#d9c9e6', '#f2c6a2', '#c7d7e2', '#f5d0d0', '#e3e8b5'];
const ROOFS = ['#b5532f', '#a04a2c', '#c86a3c', '#6b5a4e', '#55697b', '#8b3b2d', '#5f7c4b', '#9a6b3c'];
const APT = ['#d8cfc0', '#c9b9a5', '#b8aa98', '#e2d6c4', '#a7b3ba', '#d9b8a0', '#c4c9b2', '#e8e1d3'];
const GLASSES = ['#3d5a73', '#2f5f6e', '#41607f', '#355a5a', '#4a5f80'];

/* ---------- Terreno ---------- */
function tileUV(px, py) { // pixel do losango 32x16 -> coordenadas locais (u, v) em 0..1
  const dx = (px + 0.5 - 16) / 16, dy = (py + 0.5) / 8;
  return [(dx + dy) / 2, (dy - dx) / 2];
}
function inDiamond(px, py) { const [u, v] = tileUV(px, py); return u >= 0 && v >= 0 && u <= 1 && v <= 1; }

const GROUND_COLORS = {
  grass: [['#6db24f', '#5ea444', '#7fc15d'], ['#b5ae5c', '#a89f50', '#c4bb6c']], // [chuva, seca]
  sand: [['#e9d8a6', '#dcc68e', '#f3e5bb']],
  rock: [['#8f8a83', '#7b766f', '#a39e96']],
  dirt: [['#9b7a52', '#8a6a45', '#ab8a60']],
  pave: [['#b9b4a8', '#aaa598', '#c8c3b7']],
};

function groundSprite(type, variant, elev, season) {
  return spr(`g:${type}:${variant}:${elev}:${season}`, () => {
    const pb = new PB(32, 16);
    const set = GROUND_COLORS[type][type === 'grass' ? season : 0];
    const bright = 1 + (elev - 1) * 0.035;
    const base = shade(hex(set[0]), bright), dk = shade(hex(set[1]), bright), lt = shade(hex(set[2]), bright);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      const h = hash2(x, y, variant * 31 + elev * 7 + (type.length * 13));
      let c = base;
      if (h < 0.16) c = dk; else if (h > 0.9) c = lt;
      if (type === 'grass' && season === 0 && h > 0.985) c = hex(h > 0.993 ? '#f5e36b' : '#f4f4f4');
      if (type === 'rock' && hash2(x >> 1, y, variant) < 0.2) c = shade(base, 0.85);
      if (type === 'sand' && (x + y * 3 + variant) % 11 === 0) c = lt;
      pb.set(x, y, c);
    }
    return finalize(pb, 16, 0);
  });
}

function waterSprite(frame, variant, deep) {
  return spr(`w:${frame}:${variant}:${deep}`, () => {
    const pb = new PB(32, 16);
    const base = hex(deep ? '#2f6fa6' : '#3f8cc4'), dk = hex(deep ? '#2a6296' : '#377db0'), lt = hex('#7cc0e8'), wh = hex('#d6f0fb');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      let c = (hash2(x, y, variant) < 0.25) ? dk : base;
      const wave = Math.sin((x * 0.6 + y * 1.4 + frame * 1.6 + variant * 2.1));
      if (wave > 0.93 && (x + y + frame) % 3 === 0) c = lt;
      if (hash2(x + frame * 3, y, variant + 9) > 0.992) c = wh;
      pb.set(x, y, c);
    }
    return finalize(pb, 16, 0);
  });
}

function foamSprite(mask) { // espuma na borda da água: bits -x, -y, +x, +y
  return spr(`foam:${mask}`, () => {
    const pb = new PB(32, 16);
    const fc = hex('#e8f6fb'), fc2 = hex('#a9d9ee');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      const [u, v] = tileUV(x, y);
      const d = Math.min(mask & 1 ? u : 9, mask & 2 ? v : 9, mask & 4 ? 1 - u : 9, mask & 8 ? 1 - v : 9);
      if (d < 0.09) pb.set(x, y, fc); else if (d < 0.17 && (x + y) % 2) pb.set(x, y, fc2);
    }
    return finalize(pb, 16, 0);
  });
}

function cliffSprite(side, type) { // face vertical de 1 nível de relevo
  return spr(`cl:${side}:${type}`, () => {
    const pb = new PB(16, 8 + LH);
    const base = hex(type === 'rock' ? '#7a756e' : type === 'sand' ? '#cdb27c' : '#8a6b47');
    const f = side === 'L' ? 1 : 0.78;
    for (let x = 0; x < 16; x++) {
      const top = side === 'L' ? Math.floor((x + 0.5) / 2) : Math.floor((16 - x - 0.5) / 2);
      for (let z = 0; z < LH; z++) {
        let c = shade(base, f * (z === 0 ? 0.92 : 1));
        if (hash2(x, z, side === 'L' ? 3 : 4) < 0.2) c = shade(c, 0.88);
        if (z === LH - 1 && type === 'grass') c = shade(hex('#4e8f3a'), f);
        pb.set(x, top + (LH - 1 - z), c);
      }
    }
    return finalize(pb, 0, 0);
  });
}

/* Ruas: máscara de conexões (bits: +x=1, -x=2, +y=4, -y=8) */
function roadSprite(type, mask, bridge) {
  return spr(`r:${type}:${mask}:${bridge}`, () => {
    const pb = new PB(32, 16 + (bridge ? 8 : 0));
    const a = type === 1 ? 0.3 : 0.4, sw = type === 3 ? 0.04 : 0.09;
    const asph = hex(type === 3 ? '#4a4c52' : '#56585e'), asph2 = hex(type === 3 ? '#44464b' : '#4e5055');
    const side = hex('#c9c3b5'), side2 = hex('#b3ad9f'), line = hex('#f1d26a'), white = hex('#eeeeee');
    const conn = [mask & 1, mask & 2, mask & 4, mask & 8];
    const straightX = (mask & 3) === 3 && !(mask & 12), straightY = (mask & 12) === 12 && !(mask & 3);
    const inside = (u, v, w) => {
      if (Math.abs(u - 0.5) < w && Math.abs(v - 0.5) < w) return true;
      if (conn[0] && u >= 0.5 && Math.abs(v - 0.5) < w) return true;
      if (conn[1] && u <= 0.5 && Math.abs(v - 0.5) < w) return true;
      if (conn[2] && v >= 0.5 && Math.abs(u - 0.5) < w) return true;
      if (conn[3] && v <= 0.5 && Math.abs(u - 0.5) < w) return true;
      return false;
    };
    if (bridge) { // tabuleiro e pilares sobre a água
      for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
        if (!inDiamond(x, y)) continue;
        const [u, v] = tileUV(x, y);
        if (inside(u, v, a + 0.08)) {
          for (let k = 1; k <= 3; k++) pb.set(x, y + k, hex('#6d6a64'));
        }
      }
      for (const [u, v] of [[0.5, 0.5]]) {
        const px = 16 + (u - v) * 16, py = (u + v) * 8;
        pb.rect(px - 1, py, 3, 8, hex('#7d7a72'));
      }
    }
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      const [u, v] = tileUV(x, y);
      if (inside(u, v, a)) {
        let c = hash2(x, y, type) < 0.2 ? asph2 : asph;
        if (straightX && Math.abs(v - 0.5) < 0.035 && (type !== 1 || Math.floor(u * 4) % 2 === 0)) c = type === 2 ? hex('#6aa84f') : line;
        if (straightY && Math.abs(u - 0.5) < 0.035 && (type !== 1 || Math.floor(v * 4) % 2 === 0)) c = type === 2 ? hex('#6aa84f') : line;
        if (type === 3 && ((straightX && Math.abs(Math.abs(v - 0.5) - a + 0.04) < 0.02) || (straightY && Math.abs(Math.abs(u - 0.5) - a + 0.04) < 0.02))) c = white;
        // faixa de pedestre perto de cruzamentos
        const cross = (mask === 15 || [7, 11, 13, 14].includes(mask));
        if (cross && type !== 3) {
          const du = Math.abs(u - 0.5), dv = Math.abs(v - 0.5);
          if ((du > a && du < a + 0.08 && dv < a && Math.floor(v * 16) % 2 === 0) || (dv > a && dv < a + 0.08 && du < a && Math.floor(u * 16) % 2 === 0)) c = white;
        }
        pb.set(x, y, c);
      } else if (inside(u, v, a + sw) || bridge) {
        if (bridge && !inside(u, v, a + sw)) continue;
        pb.set(x, y, hash2(x, y, 5) < 0.3 ? side2 : side);
      }
    }
    if (bridge) { // grade lateral
      for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
        const [u, v] = tileUV(x, y);
        if (!inDiamond(x, y) || !inside(u, v, a + 0.1) || inside(u, v, a + 0.06)) continue;
        pb.set(x, y - 1, hex('#e0dcd2')); pb.set(x, y - 2, hex('#a7a296'));
      }
    }
    // poste com luz (só aparece aceso à noite)
    if (type !== 3 && !bridge && (mask === 3 || mask === 12 || mask === 15)) {
      const u = 0.5 + a + 0.05, v = 0.5 - a - 0.05;
      const px = Math.round(16 + (u - v) * 16), py = Math.round((u + v) * 8);
      for (let k = 0; k < 5; k++) pb.set(px, py - k, hex('#5a5d63'));
      pb.set(px, py - 5, hex('#fff3c4'), 2);
    }
    return finalize(pb, 16, 0);
  });
}

function railSprite(mask) {
  return spr(`rail:${mask}`, () => {
    const pb = new PB(32, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      const [u, v] = tileUV(x, y);
      const alongX = !(mask & 12);
      const t = alongX ? v : u, s = alongX ? u : v;
      if (Math.abs(t - 0.5) < 0.22) {
        let c = hex('#8b7d6b');
        if (Math.floor(s * 8) % 2 === 0) c = hex('#6b4e33');
        if (Math.abs(Math.abs(t - 0.5) - 0.12) < 0.03) c = hex('#b8bcc4');
        pb.set(x, y, c);
      }
    }
    return finalize(pb, 16, 0);
  });
}

/* Sobreposições (zonas, seleção, mapas de dados, lotes não comprados) */
function overlayDiamond(key, col, alpha, borderAlpha, pattern) {
  return spr(`ov:${key}`, () => {
    const pb = new PB(32, 16);
    const c = hex(col);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
      if (!inDiamond(x, y)) continue;
      const [u, v] = tileUV(x, y);
      const edge = Math.min(u, v, 1 - u, 1 - v) < 0.07;
      if (edge && borderAlpha) { if ((x + y) % 2 === 0 || borderAlpha > 200) pb.set(x, y, (c & 0xffffff) | (borderAlpha << 24)); continue; }
      if (pattern && (x % pattern !== 0 || y % 2 !== 0)) continue;
      if (alpha) pb.set(x, y, ((c & 0xffffff) | (alpha << 24)) >>> 0);
    }
    const cv = toCanvas(pb, 'day');
    return { c: cv, n: cv, w: 32, h: 16, ox: 16, oy: 0 };
  });
}
const RAMP = ['#2fbf71', '#7dcf4a', '#c9d63c', '#f2c037', '#f39237', '#e85d3a', '#c9302c'];
function rampSprite(i, inv) { const k = inv ? 6 - i : i; return overlayDiamond('ramp' + k, RAMP[k], 120, 0); }

/* ---------- Árvores ---------- */
function drawTree(pb, cx, cy, type, seed) {
  const r = (k) => hash2(seed, k, 77);
  pb.set(cx - 1, cy, rgb(0, 0, 0, 60)); pb.set(cx, cy, rgb(0, 0, 0, 60)); pb.set(cx + 1, cy, rgb(0, 0, 0, 60));
  pb.set(cx - 2, cy, rgb(0, 0, 0, 40)); pb.set(cx + 2, cy, rgb(0, 0, 0, 40));
  if (type === 'palm') {
    const h = 9 + Math.floor(r(1) * 4), lean = r(2) < 0.5 ? -1 : 1;
    let x = cx;
    for (let z = 0; z < h; z++) { if (z > h * 0.5 && z % 3 === 0) x += lean; pb.set(x, cy - z, hex(z % 2 ? '#8a6a46' : '#a07b52')); }
    const tx = x, ty = cy - h;
    const fr = [[-4, 1], [-3, -1], [4, 1], [3, -1], [-1, -2], [1, -2], [0, 2]];
    for (const [dx, dy] of fr) {
      const steps = Math.max(Math.abs(dx), Math.abs(dy));
      for (let s = 1; s <= steps; s++) pb.set(tx + Math.round(dx * s / steps), ty + Math.round(dy * s / steps) + (s > 2 ? 1 : 0), hex(s % 2 ? '#3f8f3a' : '#57a944'));
    }
    pb.set(tx, ty + 1, hex('#6b4b2a'));
    return;
  }
  if (type === 'pine') {
    const h = 10 + Math.floor(r(1) * 5);
    pb.set(cx, cy - 1, hex('#6b4b2a')); pb.set(cx, cy - 2, hex('#6b4b2a'));
    for (let z = 2; z < h; z++) {
      const w = Math.floor((h - z) / 2.4) + ((h - z) % 3 === 0 ? 1 : 0);
      for (let dx = -w; dx <= w; dx++) {
        let c = hex(dx < 0 ? '#3b7a3f' : '#2d6234');
        if (z % 3 === 0 && Math.abs(dx) === w) c = hex('#24502a');
        pb.set(cx + dx, cy - z, c);
      }
    }
    return;
  }
  // árvores redondas (comum, ipê, arbusto)
  const big = type === 'bush' ? 2 : 3 + Math.floor(r(1) * 2);
  const trunk = type === 'bush' ? 0 : 3;
  for (let z = 0; z < trunk; z++) pb.set(cx, cy - z, hex('#6b4b2a'));
  const cy2 = cy - trunk - big;
  const pal = type === 'ipe' ? ['#e8b923', '#f4d03f', '#c99a17'] : type === 'bush' ? ['#4f9a3c', '#67b24d', '#3d7f30'] : (r(3) < 0.5 ? ['#3f8f3c', '#5aae48', '#2f7330'] : ['#4c9a2e', '#6fbf45', '#3a7a24']);
  for (let y = -big; y <= big; y++) for (let x = -big - 1; x <= big + 1; x++) {
    const d = (x * x) / ((big + 1) * (big + 1)) + (y * y) / (big * big);
    if (d > 1 + (hash2(x, y, seed) - 0.5) * 0.3) continue;
    let c = hex(pal[0]);
    if (x + y < -big * 0.6) c = hex(pal[1]);
    if (x + y > big * 0.7) c = hex(pal[2]);
    if (hash2(x + 9, y, seed) < 0.12) c = hex(pal[2]);
    pb.set(cx + x, cy2 + y, c);
  }
}

function treeSprite(type, variant, count) {
  return spr(`t:${type}:${variant}:${count}`, () => {
    const pb = new PB(32, 44);
    const oy = 28, P = isoF(16, oy);
    const pts = [];
    for (let i = 0; i < count; i++) {
      const u = 0.25 + hash2(variant, i, 3) * 0.5, v = 0.25 + hash2(variant, i, 5) * 0.5;
      pts.push([u, v, i]);
    }
    if (count === 1) { pts[0][0] = 0.5; pts[0][1] = 0.5; }
    pts.sort((a, b) => (a[0] + a[1]) - (b[0] + b[1]));
    for (const [u, v, i] of pts) {
      const p = P(u, v);
      const t = type === 'mix' ? ['round', 'round', 'pine', 'bush'][Math.floor(hash2(variant, i, 9) * 4)] : type;
      drawTree(pb, Math.round(p[0]), Math.round(p[1]), t, variant * 13 + i);
    }
    return finalize(pb, 16, oy);
  });
}

/* ---------- Construções que crescem nas zonas ---------- */
function bldCanvas(w, h, Hmax) {
  const oy = Hmax + 6;
  const pb = new PB((w + h) * 16, (w + h) * 8 + oy + 1);
  return { pb, P: isoF(h * 16, oy), ox: h * 16, oy };
}

function lot(pb, P, w, h, col, m = 0) {
  pb.poly([P(m, m), P(w - m, m), P(w - m, h - m), P(m, h - m)], (x, y) => hash2(x, y, 11) < 0.15 ? shade(col, 0.93) : col);
}

function genHouse(seed, lv) {
  const rr = k => hash2(seed, k, 101);
  const { pb, P, ox, oy } = bldCanvas(1, 1, 30);
  const wall = hex(WALLS[Math.floor(rr(1) * WALLS.length)]), roof = hex(ROOFS[Math.floor(rr(2) * ROOFS.length)]);
  // quintal: grama mais escura e cerca baixa
  pb.poly([P(0.08, 0.08), P(0.92, 0.08), P(0.92, 0.92), P(0.08, 0.92)], (x, y) => hash2(x, y, seed) < 0.2 ? hex('#4f9a3c') : hex('#5ea946'));
  const fence = hex(rr(9) < 0.5 ? '#f2efe8' : '#8a6a46');
  face(pb, P(0.08, 0.92), P(0.92, 0.92), 0, 1, fence);
  face(pb, P(0.92, 0.92), P(0.92, 0.08), 0, 1, shade(fence, 0.85));
  const fu = lv === 3 ? 0.56 : 0.6, fv = 0.5, u0 = 0.16, v0 = 0.2;
  const H = lv === 1 ? 7 : 12;
  const win = hex('#3d5a73');
  const sh = (f) => wallFn({ c: shade(wall, f), win: shade(win, f), fh: lv === 1 ? 7 : 5, wy: 1, wh: 2, ww: 2, wg: 3, gz: 1, m: 2, door: f > 0.9 ? 3 : undefined, tex: 0.08, seed });
  const b = box(pb, P, u0, v0, fu, fv, H, { L: sh(1.0), R: sh(0.8) });
  if (rr(3) < 0.5) roofHip(pb, P, u0 - 0.04, v0 - 0.04, fu + 0.08, fv + 0.08, H, 6, roof);
  else roofGable(pb, P, u0 - 0.04, v0 - 0.04, fu + 0.08, fv + 0.08, H, 6, roof, wall, rr(4) < 0.5);
  if (lv === 3) { // piscina ou garagem
    if (rr(5) < 0.5) pb.poly([P(0.62, 0.74), P(0.88, 0.74), P(0.88, 0.88), P(0.62, 0.88)], (x, y) => (x + y) % 5 === 0 ? hex('#a8e4f0') : hex('#4fb8d8'));
    else box(pb, P, 0.74, 0.56, 0.16, 0.3, 5, { L: shade(wall, 0.95), R: shade(wall, 0.75), T: shade(roof, 0.9) });
  } else if (rr(6) < 0.6) {
    drawTree(pb, Math.round(P(0.84, 0.82)[0]), Math.round(P(0.84, 0.82)[1]), rr(7) < 0.3 ? 'ipe' : 'bush', seed);
  }
  return finalize(pb, ox, oy);
}

function genApartment(seed, lv) {
  const rr = k => hash2(seed, k, 202);
  const H = [20, 28, 38][lv - 1];
  const { pb, P, ox, oy } = bldCanvas(1, 1, H + 10);
  lot(pb, P, 1, 1, hex('#b9b4a8'), 0.04);
  const wall = hex(APT[Math.floor(rr(1) * APT.length)]);
  const accent = hex(ROOFS[Math.floor(rr(2) * ROOFS.length)]);
  const win = hex('#33506a');
  const sh = (f) => wallFn({ c: shade(wall, f), win: shade(win, f), fh: 5, wy: 1, wh: 3, ww: 2, wg: rr(3) < 0.5 ? 1 : 2, gz: 3, m: 1, cornice: 2, trim: shade(accent, f), door: f > 0.9 ? 4 : undefined, doorC: hex('#2a3b4c'), tex: 0.06, seed });
  const b = box(pb, P, 0.12, 0.12, 0.76, 0.76, H, { L: sh(1), R: sh(0.78), T: shade(wall, 1.12) });
  const top = (x, y) => hash2(x, y, seed) < 0.15 ? shade(wall, 0.95) : shade(wall, 1.05);
  box(pb, P, 0.2, 0.2, 0.6, 0.6, 0, { z0: H + 1, T: top });
  box(pb, P, 0.28, 0.24, 0.22, 0.2, 5, { z0: H, L: hex('#9fb4c4'), R: hex('#7f94a4'), T: hex('#c6d6e2') }); // caixa d'água
  if (lv === 3) for (let z = 0; z < 6; z++) pb.set(Math.round(P(0.7, 0.6)[0]), Math.round(P(0.7, 0.6)[1]) - H - z, hex('#666'));
  return finalize(pb, ox, oy);
}

function genTower(seed, lv, office) {
  const rr = k => hash2(seed, k, 303);
  const H = office ? [50, 74, 104][lv - 1] : [44, 66, 90][lv - 1];
  const { pb, P, ox, oy } = bldCanvas(2, 2, H + 18);
  lot(pb, P, 2, 2, hex('#bdb8ab'), 0.04);
  // canteiros e árvores no térreo
  drawTree(pb, Math.round(P(0.25, 1.8)[0]), Math.round(P(0.25, 1.8)[1]), 'round', seed);
  const glass = hex(GLASSES[Math.floor(rr(1) * GLASSES.length)]);
  const wall = office ? shade(glass, 1.6) : hex(APT[Math.floor(rr(2) * APT.length)]);
  const pod = (f) => wallFn({ c: shade(hex('#d8d2c4'), f), ground: 'shop', gh: 6, glass, trim: shade(hex('#8c8579'), f) });
  box(pb, P, 0.15, 0.15, 1.7, 1.7, 6, { L: pod(1), R: pod(0.8), T: hex('#cfc9bc') });
  const sh = office
    ? (f) => wallFn({ c: shade(wall, f), bands: 4, gz: 1, glass: shade(glass, f), cornice: 2, trim: shade(wall, f * 0.9) })
    : (f) => wallFn({ c: shade(wall, f), win: shade(hex('#33506a'), f), fh: 4, wy: 1, wh: 2, ww: 2, wg: 1, gz: 1, m: 2, cornice: 2, trim: shade(wall, f * 0.85), tex: 0.05, seed });
  const u0 = 0.35 + rr(3) * 0.1, fu = 1.25, fv = 1.2;
  box(pb, P, u0, 0.35, fu, fv, H, { z0: 6, L: sh(1), R: sh(0.76), T: shade(wall, 1.15) });
  const z = H + 6;
  if (office || rr(4) < 0.5) {
    box(pb, P, u0 + 0.25, 0.6, fu - 0.5, fv - 0.5, 6, { z0: z, L: shade(wall, 0.95), R: shade(wall, 0.75), T: shade(wall, 1.2) });
    const ap = P(u0 + fu / 2, 0.35 + fv / 2, z + 6);
    for (let k = 0; k < 8; k++) pb.set(Math.round(ap[0]), Math.round(ap[1]) - k, hex('#777'));
    pb.set(Math.round(ap[0]), Math.round(ap[1]) - 8, hex('#ff4040'), 2);
  } else {
    const c = P(u0 + fu / 2, 0.35 + fv / 2, z);
    pb.poly([P(u0 + 0.3, 0.6, z), P(u0 + fu - 0.3, 0.6, z), P(u0 + fu - 0.3, 0.35 + fv - 0.25, z), P(u0 + 0.3, 0.35 + fv - 0.25, z)], hex('#5d6670'));
    pb.set(Math.round(c[0]), Math.round(c[1]), hex('#f1d26a'));
  }
  return finalize(pb, ox, oy);
}

function genShop(seed, lv) {
  const rr = k => hash2(seed, k, 404);
  const H = [9, 13, 16][lv - 1];
  const { pb, P, ox, oy } = bldCanvas(1, 1, H + 10);
  lot(pb, P, 1, 1, hex('#c4beb1'), 0.04);
  const wall = hex(WALLS[Math.floor(rr(1) * WALLS.length)]);
  const aw = hex(['#d64545', '#2e86c1', '#28a745', '#f39c12', '#8e44ad', '#16a085'][Math.floor(rr(2) * 6)]);
  const sh = (f) => wallFn({ c: shade(wall, f), ground: 'shop', gh: 6, awning: shade(aw, f), win: shade(hex('#3d5a73'), f), fh: 5, wy: 1, wh: 2, ww: 2, wg: 2, gz: 7, m: 2, cornice: 2, trim: shade(wall, f * 0.8), tex: 0.06, seed });
  box(pb, P, 0.14, 0.18, 0.72, 0.64, H, { L: sh(1), R: sh(0.8), T: shade(wall, 1.1) });
  // letreiro no topo
  box(pb, P, 0.3, 0.3, 0.42, 0.06, 4, { z0: H, L: aw, R: shade(aw, 0.8), T: shade(aw, 1.2) });
  return finalize(pb, ox, oy);
}

function genCommercial(seed, lv) {
  const rr = k => hash2(seed, k, 505);
  const H = [18, 27, 37][lv - 1];
  const { pb, P, ox, oy } = bldCanvas(1, 1, H + 10);
  lot(pb, P, 1, 1, hex('#c4beb1'), 0.04);
  const glass = hex(GLASSES[Math.floor(rr(1) * GLASSES.length)]);
  const wall = hex(['#e6e1d6', '#c9ced3', '#d8c7b0', '#b7c4cc', '#efe6d2'][Math.floor(rr(2) * 5)]);
  const sh = (f) => wallFn({ c: shade(wall, f), ground: 'shop', gh: 6, glass: shade(glass, f), bands: 3, gz: 7, cornice: 2, trim: shade(wall, f * 0.85) });
  box(pb, P, 0.12, 0.12, 0.76, 0.76, H, { L: sh(1), R: sh(0.78), T: shade(wall, 1.1) });
  box(pb, P, 0.3, 0.3, 0.3, 0.25, 4, { z0: H, L: hex('#9aa5ad'), R: hex('#7c8790'), T: hex('#b8c3cb') });
  return finalize(pb, ox, oy);
}

function genFactory(seed, lv, big) {
  const rr = k => hash2(seed, k, 606);
  const W = big ? 2 : 1;
  const { pb, P, ox, oy } = bldCanvas(W, W, big ? 44 : 30);
  lot(pb, P, W, W, hex('#a9a395'), 0.03);
  const wall = hex(['#b8b1a3', '#a3aab0', '#c2a98a', '#9fa892'][Math.floor(rr(1) * 4)]);
  const roof = hex(['#7d8790', '#8a5a44', '#6f7a6a'][Math.floor(rr(2) * 3)]);
  const fu = big ? 1.5 : 0.7, fv = big ? 1.1 : 0.55, H = big ? 12 + lv * 2 : 7 + lv;
  const sh = (f) => wallFn({ c: shade(wall, f), win: shade(hex('#4a5c66'), f), fh: 6, wy: 2, wh: 2, ww: 3, wg: 2, gz: 1, m: 2, tex: 0.1, seed, door: f > 0.9 ? 2 : undefined, doorC: hex('#5a646b') });
  box(pb, P, 0.1, 0.1, fu, fv, H, { L: sh(1), R: sh(0.78), T: shade(roof, 1.05) });
  // telhado em dente de serra
  const n = big ? 4 : 2;
  for (let i = 0; i < n; i++) roofGable(pb, P, 0.1 + fu * i / n, 0.1, fu / n, fv, H, 4, roof, wall, false);
  const smoke = [];
  const chim = (u, v, ch) => {
    const p = P(u, v);
    cyl(pb, p[0], p[1], 2, ch, hex('#9a8f84'), { stripe: 4, c2: hex('#c0392b') });
    smoke.push([p[0], p[1] - ch - 2]);
  };
  if (big) {
    chim(1.75, 0.35, 30 + lv * 4); if (lv >= 2) chim(1.75, 0.8, 24 + lv * 3);
    const t = P(0.6, 1.6); cyl(pb, t[0], t[1], 5, 10, hex('#d9d4c7'));
    if (lv >= 2) { const t2 = P(1.2, 1.7); cyl(pb, t2[0], t2[1], 4, 14, hex('#c7c2b6')); }
  } else {
    chim(0.88, 0.75, 16 + lv * 3);
    if (lv >= 2) box(pb, P, 0.2, 0.72, 0.3, 0.2, 4, { L: hex('#b07a3c'), R: hex('#8c5f2c'), T: hex('#c79554') });
  }
  return finalize(pb, ox, oy, { smoke });
}

function growSprite(t, den, lv, v) {
  return spr(`gw:${t}:${den}:${lv}:${v}`, () => {
    const seed = v * 977 + lv * 31 + den * 7 + t.charCodeAt(0);
    if (t === 'R') return den === 1 ? genHouse(seed, lv) : den === 2 ? genApartment(seed, lv) : genTower(seed, lv, false);
    if (t === 'C') return den === 1 ? genShop(seed, lv) : den === 2 ? genCommercial(seed, lv) : genTower(seed, lv, true);
    return genFactory(seed, lv, den === 2);
  });
}

/* ---------- Construções especiais ---------- */
function civic(w, h, Hm, draw) {
  const c = bldCanvas(w, h, Hm);
  const extra = draw(c.pb, c.P) || {};
  return finalize(c.pb, c.ox, c.oy, extra);
}
const C = hex;
const plainWall = (c, f, o = {}) => wallFn(Object.assign({ c: shade(c, f), win: shade(C('#3d5a73'), f), fh: 5, wy: 1, wh: 2, ww: 2, wg: 2, gz: 2, m: 2, tex: 0.05, cornice: 2, trim: shade(c, f * 0.82) }, o));
function emblem(pb, x, y, kind) {
  const M = {
    cross: ['.rrr.', 'rrrrr', 'rrrrr', 'rrrrr', '.rrr.'],
    crossw: ['.www.', 'wwrww', 'wrrrw', 'wwrww', '.www.'],
    H: ['wwwww', 'wrwrw', 'wrrrw', 'wrwrw', 'wwwww'],
    M: ['bbbbb', 'bwbwb', 'bwwwb', 'bwbwb', 'bbbbb'],
    star: ['..y..', '.yyy.', 'yyyyy', '.yyy.', 'y...y'],
  }[kind];
  const col = { r: C('#d63031'), w: C('#ffffff'), b: C('#2d5aa0'), y: C('#f1c40f') };
  M.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') pb.set(x + i - 2, y + j - 2, col[ch]); }));
}
function flag(pb, x, y, h, c1, c2) {
  for (let k = 0; k < h; k++) pb.set(x, y - k, C('#cfcfcf'));
  pb.rect(x + 1, y - h, 4, 3, c1); pb.set(x + 2, y - h + 1, c2); pb.set(x + 3, y - h + 1, c2);
}
function personPx(pb, x, y, c) { pb.set(x, y, C('#2c3e50')); pb.set(x, y - 1, c); pb.set(x, y - 2, C('#f0c8a0')); }

const SPECIAL = {
  termo: () => civic(2, 2, 52, (pb, P) => {
    lot(pb, P, 2, 2, C('#9e9a90'), 0.03);
    box(pb, P, 0.15, 0.7, 1.1, 1.1, 14, { L: plainWall(C('#b3aca0'), 1), R: plainWall(C('#b3aca0'), 0.78), T: C('#8b8f94') });
    const smoke = [];
    for (const [u, v, h] of [[1.45, 0.35, 44], [1.7, 0.85, 38]]) { const p = P(u, v); cyl(pb, p[0], p[1], 3, h, C('#e6e1d8'), { stripe: 5, c2: C('#c0392b') }); smoke.push([p[0], p[1] - h - 2]); }
    const t = P(0.5, 0.35); cyl(pb, t[0], t[1], 4, 8, C('#7b8a8b'));
    return { smoke };
  }),
  solar: () => civic(2, 2, 12, (pb, P) => {
    lot(pb, P, 2, 2, C('#7fb85e'), 0.02);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) {
      const u = 0.15 + i * 0.44, v = 0.18 + j * 0.58;
      box(pb, P, u, v, 0.36, 0.38, 2, { L: C('#3b4f63'), R: C('#2b3c4d'), T: (x, y) => (x + y) % 3 === 0 ? C('#6fa8dc') : C('#2e5a88') });
    }
  }),
  eolica: () => civic(1, 1, 46, (pb, P) => {
    lot(pb, P, 1, 1, C('#7fb85e'), 0.25);
    const p = P(0.5, 0.5); cyl(pb, p[0], p[1], 1.4, 34, C('#f2f2f2'), { top: C('#f2f2f2') });
    box(pb, P, 0.42, 0.42, 0.22, 0.14, 3, { z0: 33, L: C('#e6e6e6'), R: C('#cfcfcf'), T: C('#fafafa') });
    return { rotor: [p[0] + 1, p[1] - 35] };
  }),
  subest: () => civic(1, 1, 18, (pb, P) => {
    lot(pb, P, 1, 1, C('#a7a49c'), 0.05);
    for (const [u, v] of [[0.2, 0.2], [0.55, 0.25], [0.25, 0.55]]) box(pb, P, u, v, 0.22, 0.22, 6, { L: C('#8e959b'), R: C('#6f767c'), T: C('#b2b9bf') });
    const p = P(0.8, 0.8); for (let k = 0; k < 14; k++) pb.set(p[0], p[1] - k, C('#6b6b6b'));
    pb.rect(p[0] - 3, p[1] - 13, 7, 1, C('#6b6b6b'));
    face(pb, P(0.05, 0.95), P(0.95, 0.95), 0, 2, (i, z) => (i + z) % 2 ? C('#9a9a9a') : 0);
  }),
  nuclear: () => civic(3, 3, 54, (pb, P) => {
    lot(pb, P, 3, 3, C('#a7a49c'), 0.03);
    for (const [u, v] of [[0.8, 0.8], [2.1, 0.75]]) { const p = P(u, v); cyl(pb, p[0], p[1], 9, 40, C('#d9d6cf'), { taper: 0.25, top: C('#8e8b84') }); }
    const d = P(1.2, 2.2); cyl(pb, d[0], d[1], 7, 12, C('#e9e5dc'));
    for (let y = -6; y <= 0; y++) for (let x = -7; x <= 7; x++) if (x * x / 49 + y * y / 36 <= 1) pb.set(d[0] + x, d[1] - 12 + y - 3, shade(C('#e9e5dc'), 1.05 - x * 0.02));
    box(pb, P, 2.0, 1.8, 0.8, 1.0, 12, { L: plainWall(C('#c8c3b8'), 1), R: plainWall(C('#c8c3b8'), 0.78), T: C('#9da3a8') });
    return { steam: [P(0.8, 0.8, 42), P(2.1, 0.75, 42)] };
  }),
  poco: () => civic(1, 1, 14, (pb, P) => {
    lot(pb, P, 1, 1, C('#b9b4a8'), 0.15);
    const p = P(0.6, 0.45); cyl(pb, p[0], p[1], 4, 8, C('#5b8fc7'));
    box(pb, P, 0.2, 0.55, 0.25, 0.25, 5, { L: C('#d9d2c2'), R: C('#b8b1a1'), T: C('#8a5a44') });
  }),
  bomba: () => civic(1, 1, 18, (pb, P) => {
    lot(pb, P, 1, 1, C('#b9b4a8'), 0.05);
    box(pb, P, 0.15, 0.2, 0.6, 0.55, 9, { L: plainWall(C('#5b8fc7'), 1), R: plainWall(C('#5b8fc7'), 0.78), T: C('#d7e5f2') });
    emblem(pb, Math.round(P(0.45, 0.45, 10)[0]), Math.round(P(0.45, 0.45, 10)[1]), 'M');
    face(pb, P(0.75, 0.8), P(0.95, 0.7), 0, 2, C('#6b7b8a'));
  }),
  caixa: () => civic(1, 1, 36, (pb, P) => {
    lot(pb, P, 1, 1, C('#b9b4a8'), 0.2);
    const p = P(0.5, 0.5);
    for (const [dx, dy] of [[-5, -1], [5, -1], [-3, 2], [3, 2]]) for (let k = 0; k < 20; k++) pb.set(p[0] + dx - Math.sign(dx) * Math.floor(k / 8), p[1] + dy - k, C('#7a7f84'));
    cyl(pb, p[0], p[1] - 20, 7, 10, C('#4a90c8'), { top: C('#7fb6e0') });
  }),
  ete: () => civic(2, 2, 16, (pb, P) => {
    lot(pb, P, 2, 2, C('#a9a395'), 0.03);
    for (const [u, v] of [[0.6, 0.6], [1.4, 0.6], [0.6, 1.4]]) { const p = P(u, v); cyl(pb, p[0], p[1], 9, 4, C('#9da3a8'), { top: C('#4f8a6e') }); }
    box(pb, P, 1.15, 1.15, 0.7, 0.7, 8, { L: plainWall(C('#d8d2c4'), 1), R: plainWall(C('#d8d2c4'), 0.78), T: C('#5f8aa6') });
  }),
  lixao: () => civic(2, 2, 14, (pb, P) => {
    lot(pb, P, 2, 2, C('#8a7656'), 0.02);
    const cols = ['#7a6a4a', '#a39368', '#5d6b4c', '#9b8a6a', '#6d7f8a', '#c2a26a', '#b55b4b'];
    for (let i = 0; i < 260; i++) {
      const u = 0.2 + hash2(i, 1, 9) * 1.6, v = 0.2 + hash2(i, 2, 9) * 1.6;
      const d = Math.hypot(u - 1, v - 1);
      const p = P(u, v, Math.max(0, (0.9 - d) * 12));
      pb.set(p[0], p[1], C(cols[i % cols.length]));
      pb.set(p[0], p[1] + 1, C(cols[(i + 3) % cols.length]));
    }
    box(pb, P, 1.55, 0.2, 0.3, 0.18, 4, { L: C('#e67e22'), R: C('#c56a1b'), T: C('#f39c12') });
  }),
  recicla: () => civic(2, 2, 20, (pb, P) => {
    lot(pb, P, 2, 2, C('#b9b4a8'), 0.03);
    box(pb, P, 0.15, 0.15, 1.2, 1.1, 12, { L: plainWall(C('#3f9b5b'), 1), R: plainWall(C('#3f9b5b'), 0.78), T: C('#d9e7dd') });
    ['#2e86c1', '#e74c3c', '#f1c40f', '#27ae60'].forEach((c, i) => box(pb, P, 0.3 + i * 0.32, 1.55, 0.22, 0.22, 4, { L: C(c), R: shade(C(c), 0.78), T: shade(C(c), 1.2) }));
  }),
  incin: () => civic(2, 2, 52, (pb, P) => {
    lot(pb, P, 2, 2, C('#a9a395'), 0.03);
    box(pb, P, 0.2, 0.4, 1.3, 1.3, 16, { L: plainWall(C('#8c8a85'), 1), R: plainWall(C('#8c8a85'), 0.78), T: C('#5d5f62') });
    const p = P(1.7, 0.35); cyl(pb, p[0], p[1], 3, 42, C('#6d6f73'), { stripe: 6, c2: C('#9a9ca0') });
    return { smoke: [[p[0], p[1] - 44]] };
  }),
  ppol: () => civic(1, 1, 22, (pb, P) => {
    lot(pb, P, 1, 1, C('#b9b4a8'), 0.04);
    box(pb, P, 0.15, 0.2, 0.7, 0.6, 10, { L: plainWall(C('#e8edf3'), 1, { door: 3 }), R: plainWall(C('#e8edf3'), 0.78), T: C('#2d5aa0') });
    const p = P(0.5, 0.5, 11); pb.set(p[0] - 1, p[1] - 1, C('#e74c3c'), 2); pb.set(p[0] + 1, p[1] - 1, C('#3498db'), 2);
    box(pb, P, 0.15, 0.82, 0.3, 0.14, 2, { L: C('#2d5aa0'), R: C('#244a85'), T: C('#f5f5f5') });
  }),
  delegacia: () => civic(2, 2, 30, (pb, P) => {
    lot(pb, P, 2, 2, C('#b9b4a8'), 0.03);
    box(pb, P, 0.15, 0.2, 1.5, 1.1, 18, { L: plainWall(C('#e8edf3'), 1, { door: 10 }), R: plainWall(C('#e8edf3'), 0.78), T: C('#2d5aa0') });
    for (let i = 0; i < 3; i++) box(pb, P, 0.2 + i * 0.45, 1.5, 0.32, 0.16, 2, { L: C('#f5f5f5'), R: C('#d5d5d5'), T: C('#2d5aa0') });
    flag(pb, Math.round(P(1.6, 0.3, 18)[0]), Math.round(P(1.6, 0.3, 18)[1]), 10, C('#2d5aa0'), C('#f1c40f'));
  }),
  bombeiros: () => civic(2, 2, 34, (pb, P) => {
    lot(pb, P, 2, 2, C('#b9b4a8'), 0.03);
    const garage = (f) => (i, z, n) => z < 8 && i % 7 > 0 && i % 7 < 6 && i > 1 ? shade(C('#f0f0f0'), f * (z % 2 ? 1 : 0.92)) : z >= 13 ? shade(C('#8e1f1f'), f) : shade(C('#c0392b'), f);
    box(pb, P, 0.15, 0.3, 1.2, 1.2, 14, { L: garage(1), R: plainWall(C('#c0392b'), 0.78), T: C('#7f8c8d') });
    box(pb, P, 1.4, 0.3, 0.4, 0.4, 26, { L: plainWall(C('#c0392b'), 1), R: plainWall(C('#c0392b'), 0.78), T: C('#7f8c8d') });
  }),
  psaude: () => civic(1, 1, 18, (pb, P) => {
    lot(pb, P, 1, 1, C('#b9b4a8'), 0.04);
    box(pb, P, 0.12, 0.15, 0.76, 0.7, 9, { L: plainWall(C('#f6f6f6'), 1, { door: 4 }), R: plainWall(C('#f6f6f6'), 0.78), T: C('#dfe6e9') });
    const p = P(0.5, 0.5, 10); emblem(pb, Math.round(p[0]), Math.round(p[1]), 'cross');
  }),
  hospital: () => civic(2, 2, 46, (pb, P) => {
    lot(pb, P, 2, 2, C('#b9b4a8'), 0.03);
    box(pb, P, 0.1, 0.1, 1.8, 1.0, 12, { L: plainWall(C('#f2f4f5'), 1, { door: 14 }), R: plainWall(C('#f2f4f5'), 0.78), T: C('#dfe6e9') });
    box(pb, P, 0.3, 0.15, 1.0, 0.8, 34, { L: plainWall(C('#f6f7f8'), 1), R: plainWall(C('#f6f7f8'), 0.78), T: C('#cfd8dc') });
    const p = P(0.8, 0.55, 35); emblem(pb, Math.round(p[0]), Math.round(p[1]), 'H');
    box(pb, P, 0.2, 1.3, 0.5, 0.5, 1, { L: C('#7f8c8d'), R: C('#6c7a7b'), T: (x, y) => C('#95a5a6') });
    emblem(pb, Math.round(P(1.6, 0.55, 13)[0]), Math.round(P(1.6, 0.55, 13)[1]), 'crossw');
  }),
  escola: () => civic(2, 2, 26, (pb, P) => {
    lot(pb, P, 2, 2, C('#c2b79e'), 0.03);
    box(pb, P, 0.15, 0.15, 1.2, 0.8, 11, { L: plainWall(C('#f2c14e'), 1, { door: 9 }), R: plainWall(C('#f2c14e'), 0.78), T: C('#c0392b') });
    roofGable(pb, P, 0.1, 0.1, 1.3, 0.9, 11, 5, C('#b5532f'), C('#f2c14e'), true);
    pb.poly([P(0.2, 1.15), P(1.0, 1.15), P(1.0, 1.85), P(0.2, 1.85)], (x, y) => C('#4a8fc1'));
    face(pb, P(0.6, 1.15), P(0.6, 1.85), 0, 0, C('#fff'));
    flag(pb, Math.round(P(1.6, 0.5)[0]), Math.round(P(1.6, 0.5)[1]), 16, C('#27ae60'), C('#f1c40f'));
    drawTree(pb, Math.round(P(1.6, 1.5)[0]), Math.round(P(1.6, 1.5)[1]), 'round', 41);
  }),
  biblio: () => civic(1, 1, 20, (pb, P) => {
    lot(pb, P, 1, 1, C('#cfc6b0'), 0.04);
    const col = (f) => (i, z, n, H) => z >= H - 2 ? shade(C('#e8dfc8'), f) : (i % 3 === 0 ? shade(C('#f4efe2'), f) : z < H - 2 && z > 1 ? (_lit = 1, shade(C('#4d4033'), f)) : shade(C('#d9cfb6'), f));
    box(pb, P, 0.12, 0.15, 0.76, 0.7, 11, { L: col(1), R: col(0.78) });
    roofGable(pb, P, 0.08, 0.1, 0.84, 0.8, 11, 5, C('#7f6a55'), C('#e8dfc8'), false);
  }),
  colegio: () => civic(2, 2, 30, (pb, P) => {
    lot(pb, P, 2, 2, C('#c2b79e'), 0.03);
    box(pb, P, 0.15, 0.15, 1.7, 0.75, 17, { L: plainWall(C('#e9a04a'), 1, { door: 12 }), R: plainWall(C('#e9a04a'), 0.78), T: C('#7f8c8d') });
    pb.poly([P(0.25, 1.1), P(1.75, 1.1), P(1.75, 1.85), P(0.25, 1.85)], C('#3c8d5a'));
    flag(pb, Math.round(P(1.8, 1.0)[0]), Math.round(P(1.8, 1.0)[1]), 16, C('#2980b9'), C('#ecf0f1'));
  }),
  univ: () => civic(3, 3, 44, (pb, P) => {
    lot(pb, P, 3, 3, C('#6fb253'), 0.02);
    pb.poly([P(1.3, 2.0), P(1.7, 2.0), P(1.7, 3.0), P(1.3, 3.0)], C('#d9cfb6'));
    const col = (f) => (i, z, n, H) => z >= H - 3 ? shade(C('#efe7d2'), f) : (i % 4 < 2 && z > 1 ? shade(C('#fbf7ec'), f) : (_lit = z > 3 && z < H - 4 && i % 4 === 3 ? 1 : 0, shade(C('#cbbf9f'), f)));
    box(pb, P, 0.3, 0.4, 2.4, 1.4, 16, { L: col(1), R: col(0.78), T: C('#a0907a') });
    const d = P(1.5, 1.1, 16);
    for (let y = -9; y <= 0; y++) for (let x = -10; x <= 10; x++) if (x * x / 100 + y * y / 81 <= 1) pb.set(d[0] + x, d[1] + y - 2, shade(C('#6f9fb8'), 1.15 - (x + 10) * 0.025));
    pb.set(d[0], d[1] - 12, C('#f1c40f'));
    for (const [u, v] of [[0.4, 2.4], [2.6, 2.3], [0.5, 2.8], [2.5, 2.8]]) drawTree(pb, Math.round(P(u, v)[0]), Math.round(P(u, v)[1]), 'round', u * 10 + v);
  }),
  praca: () => civic(1, 1, 16, (pb, P) => {
    pb.poly([P(0.04, 0.04), P(0.96, 0.04), P(0.96, 0.96), P(0.04, 0.96)], (x, y) => (x + 2 * y) % 6 === 0 ? C('#c9b896') : C('#ddd0b4'));
    pb.poly([P(0.3, 0.3), P(0.7, 0.3), P(0.7, 0.7), P(0.3, 0.7)], C('#5ea946'));
    drawTree(pb, Math.round(P(0.5, 0.5)[0]), Math.round(P(0.5, 0.5)[1]), 'ipe', 7);
    box(pb, P, 0.12, 0.75, 0.25, 0.08, 1, { L: C('#8a6a46'), R: C('#6b4b2a'), T: C('#a07b52') });
    const l = P(0.85, 0.15); for (let k = 0; k < 7; k++) pb.set(l[0], l[1] - k, C('#4a4d52')); pb.set(l[0], l[1] - 7, C('#fff3c4'), 2);
    personPx(pb, Math.round(P(0.25, 0.4)[0]), Math.round(P(0.25, 0.4)[1]), C('#e74c3c'));
  }),
  parque: () => civic(2, 2, 22, (pb, P) => {
    lot(pb, P, 2, 2, C('#63ad4a'), 0.02);
    pb.poly([P(0.9, 0.0), P(1.1, 0.0), P(1.1, 2.0), P(0.9, 2.0)], C('#d9cba8'));
    pb.poly([P(0, 0.9), P(2, 0.9), P(2, 1.1), P(0, 1.1)], C('#d9cba8'));
    const lc = P(1.5, 1.5);
    for (let y = -5; y <= 5; y++) for (let x = -9; x <= 9; x++) if (x * x / 81 + y * y / 25 <= 1) pb.set(lc[0] + x, lc[1] + y, (x + y) % 4 === 0 ? C('#9fd3ef') : C('#4aa3d8'));
    for (const [u, v] of [[0.3, 0.3], [0.6, 0.35], [0.35, 0.65], [1.5, 0.4], [1.75, 0.6], [0.4, 1.55], [0.7, 1.75]]) drawTree(pb, Math.round(P(u, v)[0]), Math.round(P(u, v)[1]), hash2(u * 9, v * 9, 1) < 0.3 ? 'ipe' : 'round', u * 31 + v * 7);
    personPx(pb, Math.round(P(1.0, 0.5)[0]), Math.round(P(1.0, 0.5)[1]), C('#3498db'));
    personPx(pb, Math.round(P(0.6, 1.0)[0]), Math.round(P(0.6, 1.0)[1]), C('#f39c12'));
  }),
  quadra: () => civic(1, 1, 10, (pb, P) => {
    pb.poly([P(0.04, 0.04), P(0.96, 0.04), P(0.96, 0.96), P(0.04, 0.96)], C('#b9b4a8'));
    pb.poly([P(0.12, 0.12), P(0.88, 0.12), P(0.88, 0.88), P(0.12, 0.88)], C('#3a8f5c'));
    pb.poly([P(0.16, 0.16), P(0.84, 0.16), P(0.84, 0.84), P(0.16, 0.84)], (x, y) => C('#2f7d4f'));
    face(pb, P(0.12, 0.5), P(0.88, 0.5), 0, 0, C('#fff'));
    for (const u of [0.16, 0.84]) { const p = P(u, 0.5); for (let k = 0; k < 4; k++) pb.set(p[0], p[1] - k, C('#eee')); }
    personPx(pb, Math.round(P(0.4, 0.4)[0]), Math.round(P(0.4, 0.4)[1]), C('#e74c3c'));
    personPx(pb, Math.round(P(0.65, 0.6)[0]), Math.round(P(0.65, 0.6)[1]), C('#3498db'));
  }),
  fonte: () => civic(1, 1, 14, (pb, P) => {
    pb.poly([P(0.04, 0.04), P(0.96, 0.04), P(0.96, 0.96), P(0.04, 0.96)], (x, y) => (x + y) % 4 === 0 ? C('#cfc6b0') : C('#e3dbc6'));
    const p = P(0.5, 0.5); cyl(pb, p[0], p[1], 9, 2, C('#d8d0bc'), { top: C('#55a8dc') });
    cyl(pb, p[0], p[1] - 2, 2, 5, C('#e0d8c4'), { top: C('#9fd3ef') });
    for (let k = 0; k < 3; k++) pb.set(p[0], p[1] - 9 - k, C('#d6f0fb'));
    return { fountain: [p[0], p[1] - 9] };
  }),
  estadio: () => civic(3, 3, 30, (pb, P) => {
    lot(pb, P, 3, 3, C('#b9b4a8'), 0.02);
    const c = P(1.5, 1.5);
    for (let ring = 0; ring < 9; ring++) {
      const rx = 40 - ring * 1.6, ry = 20 - ring * 0.8, z = 3 + ring * 2;
      for (let a = 0; a < 360; a += 1) {
        const x = c[0] + Math.cos(a * Math.PI / 180) * rx, y = c[1] + Math.sin(a * Math.PI / 180) * ry - z;
        const col = ring === 8 ? C('#d9d4c7') : (ring % 2 ? C('#c0392b') : C('#e6e1d8'));
        pb.set(x, y, col); pb.set(x, y + 1, shade(col, 0.85)); pb.set(x, y + 2, shade(col, 0.75));
      }
    }
    for (let y = -10; y <= 10; y++) for (let x = -26; x <= 26; x++) {
      if (x * x / 676 + y * y / 100 > 1) continue;
      let col = (Math.floor((x + 26) / 4) % 2) ? C('#3f9b3f') : C('#4aa84a');
      if (x === 0 || (Math.abs(x) === 22 && Math.abs(y) < 5)) col = C('#fff');
      pb.set(c[0] + x, c[1] + y - 2, col);
    }
    for (const [dx, dy] of [[-38, -2], [38, -2], [0, -22], [0, 16]]) for (let k = 0; k < 22; k++) pb.set(c[0] + dx, c[1] + dy - k, C('#777'));
    for (const [dx, dy] of [[-38, -2], [38, -2], [0, -22], [0, 16]]) pb.rect(c[0] + dx - 1, c[1] + dy - 24, 3, 2, C('#fffbe0'), 2);
  }),
  onibus: () => civic(1, 1, 14, (pb, P) => {
    pb.poly([P(0.1, 0.1), P(0.9, 0.1), P(0.9, 0.9), P(0.1, 0.9)], C('#c9c3b5'));
    box(pb, P, 0.25, 0.4, 0.5, 0.2, 7, { L: (i, z) => z > 5 ? C('#2e86c1') : i % 5 === 0 ? C('#555') : (z < 2 ? C('#8a6a46') : 0), R: C('#555'), T: C('#2e86c1') });
    const p = P(0.8, 0.3); for (let k = 0; k < 9; k++) pb.set(p[0], p[1] - k, C('#666'));
    pb.rect(p[0] - 1, p[1] - 11, 3, 3, C('#2e86c1'));
    personPx(pb, Math.round(P(0.45, 0.72)[0]), Math.round(P(0.45, 0.72)[1]), C('#9b59b6'));
  }),
  vlt: () => civic(1, 1, 18, (pb, P) => {
    pb.poly([P(0.05, 0.05), P(0.95, 0.05), P(0.95, 0.95), P(0.05, 0.95)], C('#c9c3b5'));
    box(pb, P, 0.1, 0.55, 0.8, 0.3, 2, { L: C('#a39e93'), R: C('#8a857a'), T: C('#d9d4c7') });
    box(pb, P, 0.1, 0.15, 0.8, 0.28, 6, { L: (i, z) => z > 2 && z < 5 && i % 3 ? (_lit = 1, C('#2c3e50')) : C('#27ae60'), R: C('#1e8449'), T: C('#ecf0f1') });
    box(pb, P, 0.1, 0.55, 0.8, 0.3, 1, { z0: 9, L: C('#7f8c8d'), R: C('#6c7a7b'), T: C('#bdc3c7') });
  }),
  metro: () => civic(1, 1, 18, (pb, P) => {
    pb.poly([P(0.05, 0.05), P(0.95, 0.05), P(0.95, 0.95), P(0.05, 0.95)], C('#c9c3b5'));
    box(pb, P, 0.2, 0.25, 0.6, 0.5, 8, { L: (i, z) => z < 6 && i > 2 && i < 10 ? C('#2c3e50') : C('#bdc3c7'), R: C('#95a5a6'), T: C('#5d6d7e') });
    const p = P(0.85, 0.2); for (let k = 0; k < 10; k++) pb.set(p[0], p[1] - k, C('#555'));
    emblem(pb, p[0], p[1] - 13, 'M');
  }),
  trem: () => civic(3, 2, 24, (pb, P) => {
    lot(pb, P, 3, 2, C('#b9b4a8'), 0.02);
    for (let t = 0; t < 3; t += 0.06) { const a = P(t, 1.35), b = P(t, 1.65); pb.set(a[0], a[1], C('#8b8e94')); pb.set(b[0], b[1], C('#8b8e94')); }
    for (let t = 0; t < 3; t += 0.18) face(pb, P(t, 1.3), P(t, 1.7), 0, 0, C('#6b4e33'));
    box(pb, P, 0.3, 0.15, 2.4, 0.8, 12, { L: plainWall(C('#d35400'), 1, { door: 20 }), R: plainWall(C('#d35400'), 0.78), T: C('#7f8c8d') });
    roofGable(pb, P, 0.25, 0.1, 2.5, 0.9, 12, 5, C('#6e4b3a'), C('#d35400'), true);
    box(pb, P, 0.2, 1.38, 1.6, 0.24, 6, { z0: 1, L: (i, z) => z > 2 && z < 5 && i % 4 ? (_lit = 1, C('#2c3e50')) : C('#2980b9'), R: C('#1f6391'), T: C('#bdc3c7') });
  }),
  porto: () => civic(3, 3, 40, (pb, P) => {
    lot(pb, P, 3, 3, C('#9e9a90'), 0.02);
    const cols = ['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085'];
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) for (let k = 0; k < (i + j) % 3 + 1; k++) {
      const c = C(cols[(i * 3 + j + k) % 6]);
      box(pb, P, 0.2 + i * 0.4, 0.3 + j * 0.3, 0.34, 0.22, 4, { z0: k * 4, L: c, R: shade(c, 0.78), T: shade(c, 1.15) });
    }
    const b = P(2.4, 1.2); for (let k = 0; k < 32; k++) { pb.set(b[0] - 2, b[1] - k, C('#e67e22')); pb.set(b[0] + 2, b[1] - k, C('#d35400')); }
    for (let k = -16; k < 6; k++) pb.set(b[0] + k, b[1] - 32 + Math.floor(k / 4), C('#e67e22'));
    for (let k = 0; k < 8; k++) pb.set(b[0] - 12, b[1] - 34 + k, C('#555'));
    box(pb, P, 0.3, 2.0, 1.4, 0.7, 10, { L: plainWall(C('#7f8c8d'), 1), R: plainWall(C('#7f8c8d'), 0.78), T: C('#566573') });
  }),
  aero: () => civic(4, 4, 30, (pb, P) => {
    lot(pb, P, 4, 4, C('#7fb85e'), 0);
    pb.poly([P(0.2, 2.8), P(3.9, 2.8), P(3.9, 3.6), P(0.2, 3.6)], (x, y) => C('#5d6066'));
    for (let t = 0.4; t < 3.8; t += 0.3) pb.poly([P(t, 3.18), P(t + 0.15, 3.18), P(t + 0.15, 3.22), P(t, 3.22)], C('#fff'));
    pb.poly([P(0.2, 0.2), P(3.8, 0.2), P(3.8, 2.6), P(0.2, 2.6)], C('#9e9a90'));
    box(pb, P, 0.4, 0.3, 2.6, 1.0, 10, { L: wallFn({ c: C('#ecf0f1'), bands: 3, gz: 2, glass: C('#5d8aa8') }), R: plainWall(C('#ecf0f1'), 0.78), T: C('#bdc3c7') });
    const t = P(3.4, 0.6); cyl(pb, t[0], t[1], 2, 22, C('#ecf0f1'));
    cyl(pb, t[0], t[1] - 22, 4, 4, C('#5d8aa8'), { win: 1 });
    // avião
    const a = P(2.0, 1.9);
    for (let k = -10; k <= 10; k++) pb.set(a[0] + k, a[1] + Math.round(k / 2), C('#f8f9f9'));
    for (let k = -8; k <= 8; k++) pb.set(a[0] + Math.round(k / 2), a[1] - Math.round(k / 4) + 1, C('#d5d8dc'));
  }),
  fazenda: () => civic(3, 3, 22, (pb, P) => {
    const rows = ['#7a5a3a', '#8bc34a', '#9ccc65', '#7cb342'];
    pb.poly([P(0.05, 0.05), P(2.95, 0.05), P(2.95, 2.95), P(0.05, 2.95)], (x, y) => {
      const k = Math.floor((x + 2 * y) / 3) % 4; return C(rows[k]);
    });
    box(pb, P, 0.2, 0.2, 0.8, 0.65, 9, { L: plainWall(C('#b03a2e'), 1, { win: 0, door: 5, doorC: C('#f5f5f5') }), R: plainWall(C('#b03a2e'), 0.78, { win: 0 }) });
    roofGable(pb, P, 0.15, 0.15, 0.9, 0.75, 9, 6, C('#5d6d7e'), C('#b03a2e'), true);
    const s = P(1.25, 0.4); cyl(pb, s[0], s[1], 4, 18, C('#bdc3c7'), { top: C('#95a5a6') });
    box(pb, P, 1.6, 0.25, 0.3, 0.18, 3, { L: C('#c0392b'), R: C('#922b21'), T: C('#e74c3c') });
  }),
  madeira: () => civic(2, 2, 20, (pb, P) => {
    lot(pb, P, 2, 2, C('#8a7656'), 0.02);
    box(pb, P, 0.15, 0.15, 1.0, 0.8, 9, { L: plainWall(C('#8e6e4e'), 1, { win: 0 }), R: plainWall(C('#8e6e4e'), 0.78, { win: 0 }) });
    roofGable(pb, P, 0.1, 0.1, 1.1, 0.9, 9, 5, C('#6d7b6a'), C('#8e6e4e'), true);
    for (let i = 0; i < 3; i++) for (let j = 0; j < 4 - i; j++) {
      const p = P(1.2 + j * 0.15, 1.2 + i * 0.05, i * 3);
      for (let k = -6; k <= 6; k++) pb.set(p[0] + k, p[1] + Math.round(k / 2), (k + 6) % 4 ? C('#a0703c') : C('#d6b07a'));
    }
  }),
  mina: () => civic(2, 2, 34, (pb, P) => {
    lot(pb, P, 2, 2, C('#8f8a83'), 0.02);
    for (let i = 0; i < 160; i++) { const u = 1.0 + hash2(i, 1, 4) * 0.9, v = 1.0 + hash2(i, 2, 4) * 0.9; const d = Math.hypot(u - 1.45, v - 1.45); const p = P(u, v, Math.max(0, (0.45 - d) * 18)); pb.set(p[0], p[1], C(i % 3 ? '#6e6a64' : '#a39e96')); }
    const b = P(0.6, 0.6);
    for (let k = 0; k < 26; k++) { pb.set(b[0] - 5 + Math.floor(k / 6), b[1] - k, C('#5d6d7e')); pb.set(b[0] + 5 - Math.floor(k / 6), b[1] - k, C('#5d6d7e')); }
    cyl(pb, b[0], b[1] - 26, 3, 2, C('#c0392b'));
    box(pb, P, 0.15, 1.2, 0.6, 0.6, 7, { L: plainWall(C('#a0886a'), 1), R: plainWall(C('#a0886a'), 0.78), T: C('#6d7b6a') });
  }),
  prefeitura: () => civic(2, 2, 40, (pb, P) => {
    lot(pb, P, 2, 2, C('#d9cfb6'), 0.02);
    const col = (f) => (i, z, n, H) => z >= H - 3 ? shade(C('#f6f1e4'), f) : (i % 4 === 0 ? shade(C('#ffffff'), f) : (z > 2 && z < H - 4 && i % 4 === 2 ? (_lit = 1, shade(C('#3d5a73'), f)) : shade(C('#efe2c4'), f)));
    box(pb, P, 0.15, 0.25, 1.7, 1.2, 18, { L: col(1), R: col(0.8), T: C('#d5c9ab') });
    roofHip(pb, P, 0.1, 0.2, 1.8, 1.3, 18, 6, C('#b5532f'));
    const d = P(1.0, 0.85, 22); cyl(pb, d[0], d[1] + 4, 5, 6, C('#f6f1e4'), { top: 0 });
    for (let y = -5; y <= 0; y++) for (let x = -5; x <= 5; x++) if (x * x / 25 + y * y / 25 <= 1) pb.set(d[0] + x, d[1] - 2 + y, shade(C('#6fa3c0'), 1.1 - (x + 5) * 0.03));
    flag(pb, d[0], d[1] - 7, 9, C('#27ae60'), C('#f1c40f'));
    drawTree(pb, Math.round(P(0.3, 1.75)[0]), Math.round(P(0.3, 1.75)[1]), 'palm', 3);
    drawTree(pb, Math.round(P(1.7, 1.75)[0]), Math.round(P(1.7, 1.75)[1]), 'palm', 4);
  }),
  igreja: () => civic(2, 2, 46, (pb, P) => {
    lot(pb, P, 2, 2, C('#d9cfb6'), 0.02);
    const wall = (f) => plainWall(C('#f7f3ea'), f, { win: shade(C('#4a6fa5'), f), wh: 4, fh: 9, wg: 4, cornice: 2, trim: shade(C('#e6c36a'), f) });
    box(pb, P, 0.35, 0.3, 1.4, 0.9, 16, { L: wall(1), R: wall(0.8) });
    roofGable(pb, P, 0.3, 0.25, 1.5, 1.0, 16, 8, C('#b5532f'), C('#f7f3ea'), true);
    for (const v of [1.2]) for (const u of [0.15, 0.7]) {
      box(pb, P, u, v - 0.2, 0.35, 0.35, 30, { L: wall(1), R: wall(0.8), T: C('#f7f3ea') });
      roofHip(pb, P, u, v - 0.2, 0.35, 0.35, 30, 6, C('#5d8aa8'));
      const t = P(u + 0.175, v - 0.025, 36); pb.set(t[0], t[1] - 1, C('#f1c40f')); pb.set(t[0], t[1] - 2, C('#f1c40f')); pb.set(t[0] - 1, t[1] - 2, C('#f1c40f')); pb.set(t[0] + 1, t[1] - 2, C('#f1c40f'));
    }
  }),
  relogio: () => civic(1, 1, 48, (pb, P) => {
    lot(pb, P, 1, 1, C('#d9cfb6'), 0.05);
    const w = (f) => (i, z, n, H) => (z > H - 9 && z < H - 3 && i > 1 && i < n - 2) ? (z === H - 6 && i === (n >> 1) ? C('#333') : (_lit = 2, C('#fdf6e3'))) : shade(C(z % 6 === 0 ? '#c9a46a' : '#d9b77e'), f);
    box(pb, P, 0.3, 0.3, 0.4, 0.4, 36, { L: w(1), R: w(0.8) });
    roofHip(pb, P, 0.26, 0.26, 0.48, 0.48, 36, 8, C('#6d4c3d'));
  }),
  teatro: () => civic(2, 2, 36, (pb, P) => {
    lot(pb, P, 2, 2, C('#d9cfb6'), 0.02);
    const wall = (f) => (i, z, n, H) => z >= H - 3 ? shade(C('#f5e6c8'), f) : (i % 5 === 0 ? shade(C('#fff8ea'), f) : (z > 3 && z < H - 4 && i % 5 === 2 ? (_lit = 1, shade(C('#7b3f3f'), f)) : shade(C('#e8a0a0'), f)));
    box(pb, P, 0.2, 0.25, 1.6, 1.3, 20, { L: wall(1), R: wall(0.8), T: C('#c9ad7a') });
    const d = P(1.0, 0.9, 20);
    for (let y = -9; y <= 0; y++) for (let x = -11; x <= 11; x++) if (x * x / 121 + y * y / 81 <= 1) pb.set(d[0] + x, d[1] + y, shade(C('#3f8f7a'), 1.15 - (x + 11) * 0.02));
    pb.set(d[0], d[1] - 10, C('#f1c40f')); pb.set(d[0], d[1] - 11, C('#f1c40f'));
  }),
  museu: () => civic(2, 2, 28, (pb, P) => {
    lot(pb, P, 2, 2, C('#d9cfb6'), 0.02);
    const col = (f) => (i, z, n, H) => z >= H - 3 ? shade(C('#ece6d6'), f) : (i % 3 === 0 && z > 1 ? shade(C('#ffffff'), f) : shade(C('#bfb59c'), f * 0.9));
    box(pb, P, 0.15, 0.2, 1.7, 1.3, 14, { L: col(1), R: col(0.8), T: C('#d5cdb8') });
    roofGable(pb, P, 0.1, 0.15, 1.8, 1.4, 14, 7, C('#9a9284'), C('#ece6d6'), false);
  }),
  farol: () => civic(1, 1, 50, (pb, P) => {
    lot(pb, P, 1, 1, C('#a39e96'), 0.15);
    const p = P(0.5, 0.5); cyl(pb, p[0], p[1], 4, 34, C('#f5f5f5'), { stripe: 6, c2: C('#c0392b'), taper: 0.2 });
    cyl(pb, p[0], p[1] - 34, 3, 5, C('#2c3e50'));
    for (let y = -1; y <= 1; y++) for (let x = -2; x <= 2; x++) pb.set(p[0] + x, p[1] - 37 + y, C('#fff6b0'), 2);
    roofHip(pb, P, 0.38, 0.38, 0.24, 0.24, 40, 4, C('#c0392b'));
    return { beam: [p[0], p[1] - 37] };
  }),
  hotel: () => civic(2, 2, 60, (pb, P) => {
    lot(pb, P, 2, 2, C('#cfc6b0'), 0.02);
    pb.poly([P(1.3, 1.3), P(1.85, 1.3), P(1.85, 1.85), P(1.3, 1.85)], (x, y) => (x + y) % 5 ? C('#4fb8d8') : C('#a8e4f0'));
    box(pb, P, 0.2, 0.2, 1.0, 1.4, 50, { L: plainWall(C('#f4e1c1'), 1, { fh: 4, wh: 2, ww: 3, wg: 1 }), R: plainWall(C('#f4e1c1'), 0.78, { fh: 4, wh: 2, ww: 3, wg: 1 }), T: C('#e7d3b0') });
    box(pb, P, 0.4, 0.5, 0.6, 0.1, 5, { z0: 50, L: C('#c0392b'), R: C('#922b21'), T: C('#e74c3c') });
    drawTree(pb, Math.round(P(1.8, 0.4)[0]), Math.round(P(1.8, 0.4)[1]), 'palm', 9);
  }),
  resort: () => civic(3, 3, 30, (pb, P) => {
    lot(pb, P, 3, 3, C('#ead9a8'), 0.02);
    pb.poly([P(1.2, 1.4), P(2.4, 1.4), P(2.4, 2.4), P(1.2, 2.4)], (x, y) => (x + y) % 5 ? C('#3fb6d8') : C('#a8e4f0'));
    box(pb, P, 0.2, 0.2, 2.5, 0.8, 18, { L: plainWall(C('#fbf3e4'), 1, { fh: 5, ww: 3, wg: 1 }), R: plainWall(C('#fbf3e4'), 0.78), T: C('#e2d2b4') });
    box(pb, P, 0.2, 1.2, 0.7, 1.6, 10, { L: plainWall(C('#fbf3e4'), 1), R: plainWall(C('#fbf3e4'), 0.78), T: C('#c86a3c') });
    for (const [u, v] of [[1.1, 2.7], [2.7, 1.2], [2.7, 2.7], [1.6, 2.75]]) drawTree(pb, Math.round(P(u, v)[0]), Math.round(P(u, v)[1]), 'palm', u * 7 + v);
  }),
  estatua: () => civic(1, 1, 26, (pb, P) => {
    pb.poly([P(0.1, 0.1), P(0.9, 0.1), P(0.9, 0.9), P(0.1, 0.9)], (x, y) => (x + y) % 4 ? C('#d9d0bc') : C('#c6bca6'));
    box(pb, P, 0.35, 0.35, 0.3, 0.3, 8, { L: C('#a6a09a'), R: C('#8a847e'), T: C('#bdb7b0') });
    const p = P(0.5, 0.5, 8);
    const s = C('#5f8f74'), s2 = C('#4b7560');
    for (let k = 0; k < 4; k++) { pb.set(p[0] - 1, p[1] - k, s2); pb.set(p[0] + 1, p[1] - k, s2); }
    for (let k = 4; k < 10; k++) { pb.set(p[0] - 1, p[1] - k, s); pb.set(p[0], p[1] - k, s); pb.set(p[0] + 1, p[1] - k, s2); }
    for (let k = 0; k < 5; k++) pb.set(p[0] + 2 + Math.floor(k / 2), p[1] - 8 - k, s);
    pb.rect(p[0] - 1, p[1] - 12, 3, 2, s);
  }),
};

function bldSprite(key) { return spr('b:' + key, () => SPECIAL[key] ? SPECIAL[key]() : genHouse(1, 1)); }

/* Obras: alicerce, andaimes e guindaste */
function constructionSprite(w, h, stage) {
  return spr(`cons:${w}:${h}:${stage}`, () => civic(w, h, 50, (pb, P) => {
    lot(pb, P, w, h, C('#9b7a52'), 0.04);
    if (stage === 0) {
      box(pb, P, 0.15, 0.15, w - 0.3, h - 0.3, 1, { L: C('#a0a0a0'), R: C('#8a8a8a'), T: C('#b8b8b8') });
      return;
    }
    const H = Math.min(40, (w + h) * 6) * (stage === 1 ? 0.5 : 1);
    box(pb, P, 0.2, 0.2, w - 0.4, h - 0.4, H, {
      L: (i, z) => (i % 4 === 0 || z % 4 === 0) ? C('#e08e2b') : (z < H * 0.6 ? C('#bdb7ab') : 0),
      R: (i, z) => (i % 4 === 0 || z % 4 === 0) ? C('#b8701f') : (z < H * 0.6 ? C('#9e988c') : 0),
      T: (x, y) => (x + y) % 3 === 0 ? C('#9a9a9a') : 0,
    });
    if (w > 1 || stage === 2) {
      const p = P(w - 0.25, 0.25);
      for (let k = 0; k < H + 12; k++) pb.set(p[0], p[1] - k, k % 3 ? C('#f1c40f') : C('#d4ac0d'));
      for (let k = -10; k < 5; k++) pb.set(p[0] + k, p[1] - H - 12, C('#f1c40f'));
      for (let k = 0; k < 6; k++) pb.set(p[0] - 8, p[1] - H - 12 + k, C('#555'));
    }
  }));
}

function rubbleSprite(v) {
  return spr(`rub:${v}`, () => civic(1, 1, 8, (pb, P) => {
    for (let i = 0; i < 90; i++) {
      const u = 0.15 + hash2(i, v, 1) * 0.7, w = 0.15 + hash2(i, v, 2) * 0.7;
      const d = Math.hypot(u - 0.5, w - 0.5);
      const p = P(u, w, Math.max(0, (0.4 - d) * 10));
      pb.set(p[0], p[1], C(['#8a8378', '#a39c90', '#6b655c', '#b05a3c'][i % 4]));
    }
  }));
}

function fireSprite(f) {
  return spr(`fire:${f}`, () => {
    const pb = new PB(12, 16);
    for (let y = 0; y < 16; y++) for (let x = 0; x < 12; x++) {
      const dx = (x - 6) / 6, t = y / 16;
      const w = (1 - Math.abs(1 - t * 1.3)) * (0.8 + 0.3 * Math.sin(f * 2 + y));
      if (Math.abs(dx) > w || hash2(x, y, f) < 0.1) continue;
      const c = t > 0.75 ? '#fff3b0' : t > 0.45 ? '#f9c74f' : t > 0.2 ? '#f3722c' : '#d62828';
      pb.set(x, y, C(c), 2);
    }
    return finalize(pb, 6, 15);
  });
}

function rotorSprite(f) {
  return spr(`rotor:${f}`, () => {
    const pb = new PB(25, 25);
    for (let b = 0; b < 3; b++) {
      const a = f * (Math.PI * 2 / 3 / 6) + b * Math.PI * 2 / 3;
      for (let r = 0; r < 12; r++) pb.set(12 + Math.round(Math.cos(a) * r), 12 + Math.round(Math.sin(a) * r * 0.9), C(r < 2 ? '#bbb' : '#f4f4f4'));
    }
    return finalize(pb, 12, 12);
  });
}

/* Carros, ônibus e pessoas */
const CAR_COLORS = ['#c0392b', '#2980b9', '#f1c40f', '#ecf0f1', '#2c3e50', '#27ae60', '#e67e22', '#8e44ad', '#95a5a6'];
function carSprite(axis, color, kind) {
  return spr(`car:${axis}:${color}:${kind}`, () => {
    const pb = new PB(20, 14);
    const len = kind === 'bus' ? 0.62 : kind === 'truck' ? 0.5 : 0.34, wid = kind === 'bus' ? 0.2 : 0.18;
    const fu = axis === 'x' ? len : wid, fv = axis === 'x' ? wid : len;
    const P = isoF(10 - (fu - fv) * 8, 10 - (fu + fv) * 4);
    const col = kind === 'bus' ? C('#e9b949') : kind === 'truck' ? C('#ecf0f1') : C(CAR_COLORS[color]);
    const H = kind === 'car' ? 2 : 4;
    box(pb, P, 0, 0, fu, fv, H, { L: shade(col, 0.95), R: shade(col, 0.75), T: shade(col, 1.1) });
    if (kind === 'car') {
      const cu = axis === 'x' ? 0.08 : 0.02, cv = axis === 'x' ? 0.02 : 0.08;
      box(pb, P, cu, cv, fu - cu * 2.2, fv - cv * 2.2, 2, { z0: H, L: (i, z) => { _lit = 0; return C('#34495e'); }, R: C('#2c3e50'), T: shade(col, 1.15) });
    }
    if (kind === 'bus') face(pb, P(0, fv), P(fu, fv), 2, 0, (i) => i % 3 ? C('#34495e') : 0);
    if (kind === 'truck') box(pb, P, axis === 'x' ? fu - 0.14 : 0, axis === 'x' ? 0 : fv - 0.14, axis === 'x' ? 0.14 : fu, axis === 'x' ? fv : 0.14, 3, { L: C('#2980b9'), R: C('#1f6391'), T: C('#5dade2') });
    // farol aceso à noite
    const fp = axis === 'x' ? P(fu, fv / 2, 1) : P(fu / 2, fv, 1);
    pb.set(fp[0], fp[1], C('#fff6c8'), 2);
    return finalize(pb, 10, 10);
  });
}
const SHIRTS = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6', '#ecf0f1', '#e67e22', '#1abc9c', '#e84393'];
function personSprite(color, frame) {
  return spr(`p:${color}:${frame}`, () => {
    const pb = new PB(4, 8);
    pb.set(1, 7, C('#2c3e50')); pb.set(2, 7 - frame, C('#2c3e50'));
    pb.set(1, 6, C('#34495e')); pb.set(2, 6, C('#34495e'));
    pb.set(1, 5, C(SHIRTS[color])); pb.set(2, 5, C(SHIRTS[color])); pb.set(1, 4, C(SHIRTS[color])); pb.set(2, 4, shade(C(SHIRTS[color]), 0.8));
    pb.set(1, 3, C('#f0c8a0')); pb.set(2, 3, C('#d9a77f')); pb.set(1, 2, C('#3b2a1e')); pb.set(2, 2, C('#3b2a1e'));
    return finalize(pb, 2, 7);
  });
}

/* Ícones de problema sobre as construções */
function alertSprite(kind) {
  return spr(`al:${kind}`, () => {
    const pb = new PB(11, 13);
    for (let y = 0; y < 11; y++) for (let x = 0; x < 11; x++) if ((x - 5) ** 2 + (y - 5) ** 2 <= 26) pb.set(x, y, C('#ffffff'), 2);
    pb.set(5, 11, C('#ffffff'), 2); pb.set(4, 10, C('#ffffff'), 2); pb.set(6, 10, C('#ffffff'), 2);
    const M = {
      power: ['..yy', '.yy.', 'yyyy', '.yy.', 'yy..'],
      water: ['..b..', '.bbb.', 'bbbbb', 'bbbbb', '.bbb.'],
      road: ['g...g', 'g.y.g', 'g...g', 'g.y.g', 'g...g'],
      trash: ['.ttt.', 'ttttt', '.t.t.', '.t.t.', '.ttt.'],
      sad: ['r...r', '.....', '.rrr.', 'r...r', '.....'],
      jobs: ['.kk..', 'kkkkk', 'k...k', 'kkkkk', 'kkkkk'],
    }[kind];
    const col = { y: C('#f1c40f'), b: C('#3498db'), g: C('#7f8c8d'), t: C('#8b5a2b'), r: C('#e74c3c'), k: C('#6c5ce7') };
    M.forEach((row, j) => [...row].forEach((ch, i) => { if (ch !== '.') pb.set(3 + i, 3 + j, col[ch], 2); }));
    return finalize(pb, 5, 12);
  });
}
