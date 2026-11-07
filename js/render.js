'use strict';
// Renderização isométrica: terreno, construções em faixas (para a ordem de profundidade
// ficar certa), carros, pedestres, partículas, dia/noite e clima.

const R = {
  cv: null, ctx: null, W: 0, H: 0, dpr: 1,
  cam: { x: 0, y: 0, s: 3 },
  t: 0, na: 0, overlay: null, preview: null, sel: null,
  cars: [], peds: [], parts: [], rain: [],
  buckets: new Map(), alerts: [], labels: true, hidden: false,
};
const ZOOMS = [1, 2, 3, 4, 5, 6, 8, 10, 12];

function initRender() {
  R.cv = $('#cv');
  R.ctx = R.cv.getContext('2d');
  resize();
  addEventListener('resize', resize);
}

function resize() {
  R.dpr = Math.min(3, window.devicePixelRatio || 1);
  R.W = Math.round(innerWidth * R.dpr); R.H = Math.round(innerHeight * R.dpr);
  R.cv.width = R.W; R.cv.height = R.H;
  R.cv.style.width = innerWidth + 'px'; R.cv.style.height = innerHeight + 'px';
  R.ctx.imageSmoothingEnabled = false;
}

const tileWX = (x, y) => (x - y) * 16;
const tileWY = (x, y, e) => (x + y) * 8 - e * LH;
const toSX = wx => (wx - R.cam.x) * R.cam.s + R.W / 2;
const toSY = wy => (wy - R.cam.y) * R.cam.s + R.H / 2;
const elevAt = i => Math.max(0, W.h[i]);

function centerOn(x, y) {
  const e = elevAt(idx(clamp(Math.round(x), 0, W.N - 1), clamp(Math.round(y), 0, W.N - 1)));
  R.cam.x = (x - y) * 16; R.cam.y = (x + y) * 8 - e * LH;
}
function clampCam() {
  const N = W.N;
  R.cam.x = clamp(R.cam.x, -N * 16, N * 16);
  R.cam.y = clamp(R.cam.y, -40, N * 16);
}

// Converte um ponto da tela no tile sob ele (considerando o relevo)
function screenToTile(sx, sy) {
  const wx = (sx - R.W / 2) / R.cam.s + R.cam.x, wy0 = (sy - R.H / 2) / R.cam.s + R.cam.y;
  for (let e = 8; e >= 0; e--) {
    const wy = wy0 + e * LH;
    const u = (wy / 8 + wx / 16) / 2, v = (wy / 8 - wx / 16) / 2;
    const x = Math.floor(u), y = Math.floor(v);
    if (!inb(x, y)) continue;
    const i = idx(x, y);
    const te = W.road[i] && W.h[i] <= 0 ? 1 : elevAt(i);
    if (te === e) return { x, y, fx: u - x, fy: v - y };
  }
  const u = (wy0 / 8 + wx / 16) / 2, v = (wy0 / 8 - wx / 16) / 2;
  return { x: Math.floor(u), y: Math.floor(v), fx: 0, fy: 0, out: !inb(Math.floor(u), Math.floor(v)) };
}

function drawSpr(sp, sx, sy, alpha = 1, mode) {
  const s = R.cam.s, ctx = R.ctx;
  const dx = sx - sp.ox * s, dy = sy - sp.oy * s;
  if (mode === 'dim') { ctx.drawImage(dimOf(sp), dx, dy, sp.w * s, sp.h * s); return; }
  const na = R.na;
  if (alpha < 1) ctx.globalAlpha = alpha;
  if (na < 1) ctx.drawImage(sp.c, dx, dy, sp.w * s, sp.h * s);
  if (na > 0) {
    ctx.globalAlpha = alpha * (na < 1 ? na : 1);
    ctx.drawImage(sp.n, dx, dy, sp.w * s, sp.h * s);
  }
  ctx.globalAlpha = 1;
}
function drawStrip(sp, sx, sy, k, mode) {
  const s = R.cam.s, ctx = R.ctx;
  const dx = sx - sp.ox * s + k * 16 * s, dy = sy - sp.oy * s;
  const src = mode === 'dim' ? dimOf(sp) : null;
  if (src) { ctx.drawImage(src, k * 16, 0, 16, sp.h, dx, dy, 16 * s, sp.h * s); return; }
  if (R.na < 1) ctx.drawImage(sp.c, k * 16, 0, 16, sp.h, dx, dy, 16 * s, sp.h * s);
  if (R.na > 0) {
    if (R.na < 1) ctx.globalAlpha = R.na;
    ctx.drawImage(sp.n, k * 16, 0, 16, sp.h, dx, dy, 16 * s, sp.h * s);
    ctx.globalAlpha = 1;
  }
}

function buildingSprite(b) {
  if (b.prog > 0) {
    const total = b.days || 10;
    const stage = b.prog > total * 0.66 ? 0 : b.prog > total * 0.33 ? 1 : 2;
    return constructionSprite(b.w, b.h, stage);
  }
  if (b.k === 'R' || b.k === 'C' || b.k === 'I') return growSprite(b.k, b.den, b.lv, b.v);
  return bldSprite(b.k);
}

/* ---------- Agentes visuais ---------- */
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function spawnAgents(dt, view) {
  const pop = G.pop;
  const maxCars = Math.min(140, 6 + pop / 40) * (G.weather === 'chuva' ? 0.8 : 1);
  const maxPeds = Math.min(110, 4 + pop / 50) * (R.na > 0.6 ? 0.3 : 1) * (G.weather === 'chuva' ? 0.4 : 1);
  for (let k = 0; k < 6 && R.cars.length < maxCars; k++) {
    const x = ri(view.x0, view.x1), y = ri(view.y0, view.y1);
    if (!inb(x, y)) continue;
    const i = idx(x, y);
    if (!W.road[i]) continue;
    const load = S.traffic ? S.traffic[i] : 0;
    if (!chance(0.15 + Math.min(0.85, load / 60))) continue;
    const opts = DIRS.map((d, j) => j).filter(j => inb(x + DIRS[j][0], y + DIRS[j][1]) && W.road[idx(x + DIRS[j][0], y + DIRS[j][1])]);
    if (!opts.length) continue;
    const r = rnd();
    const kind = G.counts && G.counts.onibus > 0 && r < 0.08 ? 'bus' : r < 0.2 && G.counts && G.zoneCounts.I > 0 ? 'truck' : 'car';
    R.cars.push({ x, y, d: pick(opts), t: rnd(), sp: 0.9 + rnd() * 0.5, col: ri(0, CAR_COLORS.length - 1), kind, life: ri(20, 60) });
  }
  for (let k = 0; k < 4 && R.peds.length < maxPeds; k++) {
    const x = ri(view.x0, view.x1), y = ri(view.y0, view.y1);
    if (!inb(x, y) || !W.road[idx(x, y)] || W.road[idx(x, y)] === 3 || W.h[idx(x, y)] <= 0) continue;
    let near = false;
    for (const [dx, dy] of DIRS) if (inb(x + dx, y + dy) && W.bld[idx(x + dx, y + dy)] >= 0) near = true;
    if (!near) continue;
    const opts = DIRS.map((d, j) => j).filter(j => inb(x + DIRS[j][0], y + DIRS[j][1]) && W.road[idx(x + DIRS[j][0], y + DIRS[j][1])]);
    if (!opts.length) continue;
    R.peds.push({ x, y, d: pick(opts), t: rnd(), sp: 0.25 + rnd() * 0.15, col: ri(0, SHIRTS.length - 1), side: chance(0.5) ? 1 : -1, life: ri(6, 18) });
  }
}

function stepMover(a, dt, isCar) {
  let sp = a.sp;
  if (isCar) {
    const i = idx(a.x, a.y);
    const cong = S.traffic ? S.traffic[i] / (ROAD_CAP[W.road[i]] || 60) : 0;
    sp *= cong > 1 ? 0.35 : cong > 0.7 ? 0.65 : 1;
    if (W.road[i] === 3) sp *= 1.4;
  }
  a.t += sp * dt;
  while (a.t >= 1) {
    a.t -= 1;
    const nx = a.x + DIRS[a.d][0], ny = a.y + DIRS[a.d][1];
    if (!inb(nx, ny) || !W.road[idx(nx, ny)]) return false;
    a.x = nx; a.y = ny;
    if (--a.life <= 0) return false;
    const back = a.d ^ 1;
    const opts = [];
    for (let j = 0; j < 4; j++) {
      if (j === back) continue;
      const qx = a.x + DIRS[j][0], qy = a.y + DIRS[j][1];
      if (inb(qx, qy) && W.road[idx(qx, qy)]) opts.push(j);
    }
    if (!opts.length) a.d = back;
    else if (!opts.includes(a.d) || chance(0.25)) a.d = pick(opts);
  }
  return true;
}

// Posição em coordenadas de tile (u, v) dentro da faixa da mão direita
function moverPos(a, lane) {
  const [dx, dy] = DIRS[a.d];
  let u = a.x + 0.5 + dx * (a.t - 0.5), v = a.y + 0.5 + dy * (a.t - 0.5);
  // mão direita: perpendicular à direção
  u += -dy * lane; v += dx * lane;
  return [u, v];
}

function updateAgents(dt) {
  R.cars = R.cars.filter(c => stepMover(c, dt * 1.2, true));
  R.peds = R.peds.filter(p => stepMover(p, dt, false));
  for (const p of R.parts) { p.life -= dt; p.wy -= p.vy * dt; p.wx += p.vx * dt; p.r += dt * 1.6; }
  R.parts = R.parts.filter(p => p.life > 0);
}

/* ---------- Desenho ---------- */
function viewRange(margin) {
  const s = R.cam.s;
  const wx0 = R.cam.x - R.W / 2 / s - 32, wx1 = R.cam.x + R.W / 2 / s + 32;
  const wy0 = R.cam.y - R.H / 2 / s - 16, wy1 = R.cam.y + R.H / 2 / s + margin;
  return { wx0, wx1, wy0, wy1, d0: Math.max(0, Math.floor(wy0 / 8) - 1), d1: Math.min(2 * W.N - 2, Math.ceil((wy1 + 8 * LH) / 8) + 1) };
}

function nightAmount() {
  if (!G.settings.dayNight) return 0;
  const t = G.tod; // 0..1, 0 = meia-noite
  if (t < 0.2 || t > 0.85) return 1;
  if (t < 0.3) return 1 - (t - 0.2) / 0.1;
  if (t > 0.75) return (t - 0.75) / 0.1;
  return 0;
}

function render(dt) {
  const ctx = R.ctx, s = R.cam.s, N = W.N;
  R.t += dt;
  R.na = nightAmount();
  const na = R.na;
  // céu de fundo
  const day = G.weather === 'chuva' || G.weather === 'tempestade' ? [92, 112, 128] : [126, 186, 214];
  const night = [10, 16, 32];
  const mixc = day.map((c, i) => Math.round(c * (1 - na) + night[i] * na));
  ctx.fillStyle = `rgb(${mixc[0]},${mixc[1]},${mixc[2]})`;
  ctx.fillRect(0, 0, R.W, R.H);

  const v = viewRange(140);
  const season = G.settings.weather && (G.month >= 6 && G.month <= 11) ? 1 : 0;
  const wf = Math.floor(R.t * 2.5) % 4;
  const ovl = R.overlay;
  R.alerts.length = 0;
  let vx0 = N, vx1 = 0, vy0 = N, vy1 = 0;

  // 1) chão: terreno, água, penhascos, ruas e sobreposições
  for (let d = v.d0; d <= v.d1; d++) {
    const xa = Math.max(0, d - N + 1, Math.floor((v.wx0 / 16 + d) / 2)), xb = Math.min(d, N - 1, Math.ceil((v.wx1 / 16 + d) / 2));
    for (let x = xa; x <= xb; x++) {
      const y = d - x, i = y * N + x;
      const h = W.h[i], e = h > 0 ? h : 0;
      const wx = (x - y) * 16, wy = (x + y) * 8 - e * LH;
      if (wy > v.wy1 || wy < v.wy0 - 40) continue;
      if (x < vx0) vx0 = x; if (x > vx1) vx1 = x; if (y < vy0) vy0 = y; if (y > vy1) vy1 = y;
      const sx = (wx - R.cam.x) * s + R.W / 2, sy = (wy - R.cam.y) * s + R.H / 2;
      const tt = W.tt[i];
      if (h <= 0) {
        drawSpr(waterSprite((wf + ((x * 3 + y) & 3)) & 3, (x ^ y) & 1, tt === TT.DEEP), sx, sy);
        let m = 0;
        if (x > 0 && W.h[i - 1] > 0) m |= 1; if (y > 0 && W.h[i - N] > 0) m |= 2;
        if (x < N - 1 && W.h[i + 1] > 0) m |= 4; if (y < N - 1 && W.h[i + N] > 0) m |= 8;
        if (m) drawSpr(foamSprite(m), sx, sy);
        if (W.road[i]) drawSpr(roadSprite(W.road[i], roadMask(x, y), true), sx, sy - LH * s);
      } else {
        const gt = tt === TT.SAND ? 'sand' : tt === TT.ROCK ? 'rock' : 'grass';
        const busy = W.bld[i] >= 0 || W.zone[i];
        drawSpr(groundSprite(busy && gt === 'grass' ? 'grass' : gt, (x * 7 + y * 13) & 3, Math.min(e, 7), gt === 'grass' ? season : 0), sx, sy);
        // penhascos (faces verticais do relevo)
        const ctype = gt === 'sand' ? 'sand' : gt === 'rock' ? 'rock' : 'grass';
        const nl = y < N - 1 ? Math.max(0, W.h[i + N]) : -1, nr = x < N - 1 ? Math.max(0, W.h[i + 1]) : -1;
        for (let k = 0; k < e - nl; k++) drawSpr(cliffSprite('L', k === 0 ? ctype : 'dirt'), sx - 16 * s, sy + 8 * s + k * LH * s);
        for (let k = 0; k < e - nr; k++) drawSpr(cliffSprite('R', k === 0 ? ctype : 'dirt'), sx, sy + 8 * s + k * LH * s);
        if (W.road[i]) drawSpr(roadSprite(W.road[i], roadMask(x, y), false), sx, sy);
        else if (W.zone[i] && W.bld[i] < 0) {
          drawSpr(overlayDiamond('z' + W.zone[i], ZONES[ZONE_KEYS[W.zone[i] - 1]].color, 70, 230), sx, sy);
          // aviso de zona que não cresce por falta de luz ou água
          if ((x + y) % 3 === 0 && S.cov.power && (S.cov.power[i] < 40 || S.cov.water[i] < 40)) R.alerts.push({ k: S.cov.power[i] < 40 ? 'power' : 'water', sx, sy: sy + 4 * s });
        }
      }
      if (!W.owned[(y >> 4) * W.PN + (x >> 4)]) drawSpr(overlayDiamond('unowned', '#0b1626', 115, 0), sx, sy);
      if (ovl) {
        const val = overlayValue(ovl, i);
        if (val !== null) drawSpr(rampSprite(clamp(Math.floor(val * 6.99), 0, 6), OVERLAYS[ovl].inv), sx, sy);
      }
    }
  }

  // agentes por tile
  R.buckets.clear();
  for (const c of R.cars) { const k = idx(c.x, c.y); (R.buckets.get(k) || R.buckets.set(k, []).get(k)).push(c); }
  for (const p of R.peds) { const k = idx(p.x, p.y); (R.buckets.get(k) || R.buckets.set(k, []).get(k)).push(p); }

  // 2) objetos em ordem de profundidade
  for (let d = v.d0; d <= v.d1 + 14; d++) {
    if (d > 2 * N - 2) break;
    const xa = Math.max(0, d - N + 1, Math.floor((v.wx0 / 16 + d) / 2) - 2), xb = Math.min(d, N - 1, Math.ceil((v.wx1 / 16 + d) / 2) + 2);
    for (let x = xa; x <= xb; x++) {
      const y = d - x, i = y * N + x;
      const e = elevAt(i);
      const wx = (x - y) * 16, wy = (x + y) * 8 - e * LH;
      if (wy < v.wy0 - 10 || wy > v.wy1 + 400) continue;
      const sx = (wx - R.cam.x) * s + R.W / 2, sy = (wy - R.cam.y) * s + R.H / 2;
      if (sy - 140 * s > R.H) continue;
      const bid = W.bld[i];
      if (bid >= 0) {
        const b = W.blds[bid];
        const fy = b.y + b.h - 1, fx = b.x + b.w - 1;
        if (y !== fy && x !== fx) continue;
        const sp = buildingSprite(b);
        const be = elevAt(idx(b.x, b.y));
        const bsx = (tileWX(b.x, b.y) - R.cam.x) * s + R.W / 2, bsy = (tileWY(b.x, b.y, be) - R.cam.y) * s + R.H / 2;
        const mode = (b.aband && b.prog <= 0) ? 'dim' : null;
        if (y === fy) drawStrip(sp, bsx, bsy, x - b.x, mode);
        if (x === fx) drawStrip(sp, bsx, bsy, b.w + (fy - y), mode);
        if (x === fx && y === fy) drawBuildingExtras(b, sp, bsx, bsy);
      } else {
        if (W.tree[i]) { const t = treeInfo(W.tree[i]); drawSpr(treeSprite(t.type, t.v, t.count), sx, sy); }
        if (W.rub[i]) drawSpr(rubbleSprite((x + y) & 3), sx, sy);
      }
      const ag = R.buckets.get(i);
      if (ag) for (const a of ag) drawAgent(a, e);
    }
  }

  // 3) partículas (fumaça)
  for (const p of R.parts) {
    const sx = (p.wx - R.cam.x) * s + R.W / 2, sy = (p.wy - R.cam.y) * s + R.H / 2;
    const a = Math.max(0, Math.min(1, p.life / p.max)) * (p.steam ? 0.6 : 0.45);
    const g = p.steam ? 235 : Math.round(150 + 60 * (1 - p.life / p.max));
    ctx.fillStyle = `rgba(${g},${g},${g + 4},${a * (1 - na * 0.5)})`;
    const r = Math.max(1, Math.round(p.r)) * s;
    ctx.fillRect(Math.round(sx - r / 2), Math.round(sy - r / 2), r, r);
  }

  // 4) prévia de construção e seleção
  if (R.preview) drawPreview(R.preview);
  if (R.sel) drawSelection(R.sel);

  // ícones de alerta (sempre por cima)
  if (!R.hidden) for (const a of R.alerts) drawSpr(alertSprite(a.k), a.sx, a.sy - Math.sin(R.t * 3) * 2 * s);

  // nomes dos bairros (zoom afastado)
  if (R.labels && s <= 3 && !R.hidden) drawPlotLabels();

  // 5) clima
  drawWeather(dt);
  R.view = { x0: Math.max(0, vx0), x1: Math.min(N - 1, vx1), y0: Math.max(0, vy0), y1: Math.min(N - 1, vy1) };
}

function drawBuildingExtras(b, sp, bsx, bsy) {
  const s = R.cam.s, ctx = R.ctx;
  if (b.prog > 0) return;
  const at = (p) => [bsx + (p[0] - sp.ox) * s, bsy + (p[1] - sp.oy) * s];
  if (sp.rotor && !b.aband) {
    const f = Math.floor(R.t * 10) % 6;
    const [x, y] = at(sp.rotor);
    drawSpr(rotorSprite(f), x, y);
  }
  if ((sp.smoke || sp.steam) && !b.aband && b.pw !== false && chance(0.25)) {
    for (const p of (sp.smoke || sp.steam)) {
      if (!chance(0.5)) continue;
      const wx = (bsx - R.W / 2) / s + R.cam.x + p[0] - sp.ox, wy = (bsy - R.H / 2) / s + R.cam.y + p[1] - sp.oy;
      if (R.parts.length < 400) R.parts.push({ wx, wy, vx: 3 + rnd() * 3, vy: 6 + rnd() * 4, r: sp.steam ? 3 : 1.5, life: sp.steam ? 2.5 : 3, max: sp.steam ? 2.5 : 3, steam: !!sp.steam });
    }
  }
  if (sp.beam && R.na > 0.3) {
    const [x, y] = at(sp.beam);
    const ang = R.t * 1.4;
    ctx.save();
    ctx.globalAlpha = 0.25 * R.na;
    ctx.fillStyle = '#fff3b0';
    ctx.beginPath(); ctx.moveTo(x, y);
    ctx.arc(x, y, 90 * s, ang, ang + 0.25);
    ctx.fill(); ctx.restore();
  }
  if (b.fire > 0) {
    const f = Math.floor(R.t * 8) % 3;
    for (let k = 0; k < Math.min(4, b.w * b.h); k++) {
      const u = b.x + 0.3 + (k % 2) * (b.w - 0.6), vv = b.y + 0.3 + (k >> 1) * (b.h - 0.6);
      const e = elevAt(idx(b.x, b.y));
      drawSpr(fireSprite((f + k) % 3), toSX(tileWX(u, vv) + 0), toSY(tileWY(u, vv, e) + 8) - 10 * s);
    }
    if (chance(0.5) && R.parts.length < 400) {
      const wx = tileWX(b.x + b.w / 2, b.y + b.h / 2), wy = tileWY(b.x + b.w / 2, b.y + b.h / 2, elevAt(idx(b.x, b.y))) - 14;
      R.parts.push({ wx, wy, vx: 4, vy: 10, r: 2, life: 2.5, max: 2.5 });
    }
  }
  const al = b.alert;
  if (al) R.alerts.push({ k: al, sx: bsx + (sp.w / 2 - sp.ox) * s + 0, sy: bsy - (sp.oy - 8) * s + 2 * s });
}

function drawAgent(a, e) {
  const isCar = a.kind !== undefined;
  const [u, vv] = moverPos(a, isCar ? 0.16 : 0.4 * a.side);
  const i = idx(a.x, a.y);
  const ee = W.h[i] <= 0 ? 1 : e;
  const sx = toSX(tileWX(u, vv)), sy = toSY(tileWY(u, vv, ee));
  if (isCar) drawSpr(carSprite(a.d < 2 ? 'x' : 'y', a.col, a.kind), sx, sy);
  else drawSpr(personSprite(a.col, Math.floor(R.t * 4 + a.col) & 1), sx, sy);
}

function drawPreview(p) {
  const s = R.cam.s, ctx = R.ctx;
  for (const t of p.tiles) {
    if (!inb(t.x, t.y)) continue;
    const i = idx(t.x, t.y);
    const e = W.h[i] <= 0 && p.kind === 'road' ? 1 : elevAt(i);
    drawSpr(overlayDiamond(t.ok ? 'pv-ok' : 'pv-bad', t.ok ? '#53e07a' : '#ff5252', 110, 255), toSX(tileWX(t.x, t.y)), toSY(tileWY(t.x, t.y, e)));
  }
  if (p.def && p.tiles.length) {
    const t0 = p.tiles[0];
    if (inb(t0.x, t0.y)) {
      const e = elevAt(idx(t0.x, t0.y));
      const sp = p.sprite;
      if (sp) drawSpr(sp, toSX(tileWX(t0.x, t0.y)), toSY(tileWY(t0.x, t0.y, e)), 0.7);
      if (p.def.r) {
        const cx = t0.x + p.def.w / 2, cy = t0.y + p.def.h / 2;
        ctx.save();
        ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1, s / 1.5);
        ctx.setLineDash([4 * s, 3 * s]);
        ctx.fillStyle = 'rgba(120,220,255,0.10)';
        ctx.beginPath();
        ctx.ellipse(toSX(tileWX(cx, cy)), toSY(tileWY(cx, cy, e)), p.def.r * 16 * 1.414 * s, p.def.r * 8 * 1.414 * s, 0, 0, Math.PI * 2);
        ctx.fill(); ctx.stroke(); ctx.restore();
      }
    }
  }
}

function drawSelection(sel) {
  const b = sel.b;
  if (!b || !W.blds[b.id]) { R.sel = null; return; }
  for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) {
    const e = elevAt(idx(x, y));
    drawSpr(overlayDiamond('sel', '#ffe066', 60, 255), toSX(tileWX(x, y)), toSY(tileWY(x, y, e)));
  }
  const def = BLD[b.k];
  if (def && def.r) {
    const ctx = R.ctx, s = R.cam.s, cx = b.x + b.w / 2, cy = b.y + b.h / 2, e = elevAt(idx(b.x, b.y));
    ctx.save(); ctx.strokeStyle = 'rgba(255,224,102,0.9)'; ctx.lineWidth = Math.max(1, s / 1.5); ctx.setLineDash([4 * s, 3 * s]);
    ctx.beginPath(); ctx.ellipse(toSX(tileWX(cx, cy)), toSY(tileWY(cx, cy, e)), def.r * 22.6 * s, def.r * 11.3 * s, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }
}

function drawPlotLabels() {
  const ctx = R.ctx, s = R.cam.s;
  ctx.save();
  ctx.font = `600 ${Math.round(11 * R.dpr)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  for (let py = 0; py < W.PN; py++) for (let px = 0; px < W.PN; px++) {
    const p = py * W.PN + px;
    if (!W.owned[p] || !W.plotNames[p]) continue;
    const cx = px * PS + PS / 2, cy = py * PS + PS / 2;
    const e = elevAt(idx(cx, cy));
    const sx = toSX(tileWX(cx, cy)), sy = toSY(tileWY(cx, cy, e)) - 30 * s;
    if (sx < -100 || sx > R.W + 100 || sy < -40 || sy > R.H + 40) continue;
    const t = W.plotNames[p];
    const w = ctx.measureText(t).width + 14 * R.dpr;
    ctx.fillStyle = 'rgba(15,20,28,0.55)';
    roundRect(ctx, sx - w / 2, sy - 12 * R.dpr, w, 18 * R.dpr, 9 * R.dpr); ctx.fill();
    ctx.fillStyle = '#f5ecd7'; ctx.fillText(t, sx, sy + 1 * R.dpr);
  }
  ctx.restore();
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}

function drawWeather(dt) {
  const ctx = R.ctx;
  const w = G.settings.weather ? G.weather : 'sol';
  if (w === 'nublado' || w === 'chuva' || w === 'tempestade') {
    ctx.fillStyle = w === 'nublado' ? 'rgba(60,70,90,0.12)' : 'rgba(40,50,70,0.22)';
    ctx.fillRect(0, 0, R.W, R.H);
  }
  if (w === 'chuva' || w === 'tempestade') {
    const n = w === 'tempestade' ? 260 : 150;
    while (R.rain.length < n) R.rain.push({ x: rnd() * R.W, y: rnd() * R.H, l: 8 + rnd() * 10, v: 900 + rnd() * 500 });
    ctx.strokeStyle = 'rgba(190,210,235,0.45)'; ctx.lineWidth = Math.max(1, R.dpr);
    ctx.beginPath();
    for (const d of R.rain) {
      d.y += d.v * dt * R.dpr; d.x -= d.v * 0.18 * dt * R.dpr;
      if (d.y > R.H) { d.y = -20; d.x = rnd() * R.W * 1.2; }
      ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.l * 0.18 * R.dpr, d.y + d.l * R.dpr);
    }
    ctx.stroke();
    if (w === 'tempestade' && chance(0.004)) { ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(0, 0, R.W, R.H); }
  } else R.rain.length = 0;
}

/* ---------- Mapas de dados ---------- */
const OVERLAYS = {
  pol: { name: 'Poluição do ar', inv: false },
  ruido: { name: 'Barulho', inv: false },
  crime: { name: 'Criminalidade', inv: false },
  valor: { name: 'Valor do terreno', inv: true },
  transito: { name: 'Trânsito', inv: false },
  energia: { name: 'Energia', inv: true },
  agua: { name: 'Água', inv: true },
  saude: { name: 'Saúde', inv: true },
  educ: { name: 'Educação', inv: true },
  policia: { name: 'Polícia', inv: true },
  lazer: { name: 'Lazer', inv: true },
  feliz: { name: 'Felicidade', inv: true },
};
function overlayValue(k, i) {
  if (!S.air) return null;
  switch (k) {
    case 'pol': return W.h[i] > 0 ? S.air[i] / 100 : null;
    case 'ruido': return W.h[i] > 0 ? S.noise[i] / 100 : null;
    case 'crime': return W.h[i] > 0 ? S.crime[i] / 100 : null;
    case 'valor': return W.h[i] > 0 ? S.lv[i] / 100 : null;
    case 'transito': return W.road[i] ? Math.min(1, S.traffic[i] / (ROAD_CAP[W.road[i]] * S.capMul)) : null;
    case 'energia': return W.h[i] > 0 && S.cov.power[i] ? 1 : null;
    case 'agua': return W.h[i] > 0 && S.cov.water[i] ? 1 : null;
    case 'saude': return W.h[i] > 0 ? S.cov.health[i] / 255 : null;
    case 'educ': return W.h[i] > 0 ? S.cov.edu[i] / 255 : null;
    case 'policia': return W.h[i] > 0 ? S.cov.police[i] / 255 : null;
    case 'lazer': return W.h[i] > 0 ? S.cov.leisure[i] / 255 : null;
    case 'feliz': { const b = W.bld[i] >= 0 ? W.blds[W.bld[i]] : null; return b && b.k === 'R' && b.prog <= 0 ? b.hap / 100 : null; }
  }
  return null;
}
