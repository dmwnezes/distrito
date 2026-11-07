'use strict';
// Simulação: zonas, serviços por raio, economia, trânsito, meio ambiente,
// moradores, política, eventos, missões, conquistas e cidades rivais.

const DAY_SEC = 2;           // segundos reais por dia na velocidade 1x
const SPEEDS = [0, 1, 2, 4];
let G = null;                // estado do jogo (salvo)
const S = { cov: {} };      // mapas calculados (não salvos)

function freshState(o) {
  return {
    v: 1, id: o.id || ('c' + Date.now().toString(36)), name: o.name || 'Distrito', mode: o.mode || 'desafio',
    scenario: o.scenario || null, seed: o.seed, N: o.N, terrain: o.terrain,
    day: 0, dayAcc: 0, tod: 0.42, month: 0, year: 2027, speed: 1,
    money: o.mode === 'criativo' ? 9e9 : (o.money || (o.mode === 'tranquilo' ? 120000 : 70000)),
    loans: [], taxes: { R: 9, C: 9, I: 9 },
    budget: Object.fromEntries(BUDGET_KEYS.map(k => [k[0], 100])),
    laws: {}, lawCooldown: {}, techs: {}, research: 0, researching: null,
    settings: { dayNight: true, weather: true, crises: true, disasters: true, music: 0.5, sfx: 0.6, labels: true },
    weather: 'sol', weatherDays: 4,
    pop: 0, jobs: 0, workforce: 0, unemployment: 0, approval: 60, level: 0,
    demand: { R: 60, C: 20, I: 20 },
    counts: {}, zoneCounts: { R: 0, C: 0, I: 0 },
    hist: { pop: [], money: [], income: [], expense: [], approval: [], unemp: [], air: [], crime: [], traffic: [] },
    feed: [], news: [], citizens: [], nextCitizen: 1,
    missions: [], missoesFeitas: 0, achievementsRun: {},
    bots: [], rank: 0,
    council: { gov: 9, opp: 6 }, nextElection: 360 * 4 - 60, reeleicoes: 0, promises: [], leisAprovadas: 0,
    events: { inflacao: 0, crise: 0, boom: 0, seca: o.seca ? 999999 : 0, epidemia: 0, enchente: 0 },
    terraforms: 0, bridges: 0, towers: 0, desastres: 0, roadCount: 0, treesPlanted: 0,
    tutorial: o.tutorial ? 0 : -1, debtMonths: 0, over: null,
    report: null, resources: null, tourists: 0, exportsMoney: 0,
    airAvg: 0, crimeAvg: 0, trafficAvg: 0, waterServed: 1, powerServed: 1, healthServed: 0, transitServed: 0, eduServed: 0,
    lowHapStreak: 0, marcos: 0, allPlots: false,
  };
}

/* ---------- Criação ---------- */
function newGame(o) {
  const seed = o.seed || ((Math.random() * 1e9) | 0);
  const terrain = o.terrain || pick(['rio', 'costa', 'lagos', 'serra', 'rio', 'costa']);
  genWorld(o.N, seed, terrain);
  G = freshState(Object.assign({}, o, { seed, terrain }));
  initMaps();
  G.bots = makeBots();
  for (let k = 0; k < 3; k++) G.missions.push(newMission());
  if (G.mode === 'criativo') { G.level = LEVELS.length - 1; TECHS.forEach(t => G.techs[t.id] = 1); }
  recomputeAll();
  addNews(`${G.name} ganha um novo prefeito`, 'O povo espera ruas, água e emprego. Mãos à obra!');
  addFeed(nomeGente(), 'Ouvi dizer que o novo prefeito vai asfaltar a minha rua. Será?', 'neutro');
  const c = W.N / 2;
  centerOn(c, c);
}

function initMaps() {
  const n = W.N * W.N;
  for (const k of COV_KEYS) S.cov[k] = new Uint8Array(n);
  S.air = new Float32Array(n); S.noise = new Float32Array(n); S.crime = new Float32Array(n);
  S.lv = new Float32Array(n); S.traffic = new Float32Array(n); S.wdist = new Uint8Array(n);
  S.capMul = 1; S.covDirty = true; S.zoneList = []; S.zoneListDay = -99;
  computeWaterDist();
}

function computeWaterDist() {
  const N = W.N, d = S.wdist;
  d.fill(255);
  const q = [];
  for (let i = 0; i < N * N; i++) if (W.h[i] <= 0) { d[i] = 0; q.push(i); }
  for (let qh = 0; qh < q.length; qh++) {
    const i = q[qh], x = i % N, y = (i / N) | 0;
    if (d[i] >= 8) continue;
    for (const [dx, dy] of NB4) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = idx(nx, ny);
      if (d[j] > d[i] + 1) { d[j] = d[i] + 1; q.push(j); }
    }
  }
}

const done = b => b && b.prog <= 0;
// construções que não precisam de rua encostada
const NO_ROAD = new Set(['subest', 'caixa', 'eolica', 'praca', 'parque', 'estatua', 'fonte', 'farol', 'quadra', 'poco', 'solar']);
const isGrow = b => b.k === 'R' || b.k === 'C' || b.k === 'I';
const capOf = b => CAP[b.k][b.den][b.lv - 1];
const lawFx = key => { let s = 0; for (const id in G.laws) { const f = LAW_BY_ID[id].fx[key]; if (f) s += f; } return s; };
const budgetF = k => (G.budget[k] || 100) / 100;

function unlocked(def) {
  if (G.mode === 'criativo') return true;
  if (G.level < (def.lvl || 0)) return false;
  if (def.tech && !G.techs[def.tech]) return false;
  return true;
}

/* ---------- Laço principal ---------- */
function simUpdate(dt) {
  if (!G || G.over) return;
  const sp = SPEEDS[G.speed];
  if (sp > 0) {
    G.dayAcc += dt * sp;
    let n = 0;
    while (G.dayAcc >= DAY_SEC && n++ < 8) { G.dayAcc -= DAY_SEC; dailyTick(); }
  }
  G.tod = (((G.day % 30) + G.dayAcc / DAY_SEC) / 30 + 0.3) % 1; // começa de manhã
}

function dailyTick() {
  G.day++;
  G.month = Math.floor(G.day / 30) % 12;
  G.year = 2027 + Math.floor(G.day / 360);
  if (W.roadsDirty) { recomputeRoads(); S.covDirty = true; }
  // obras
  for (const b of W.blds) {
    if (!b || b.prog <= 0) continue;
    const wait = !isGrow(b) && !NO_ROAD.has(b.k) && roadAccess(b.x, b.y, b.w, b.h, false) < 0;
    if (wait) { b.alert = 'road'; continue; }
    b.prog--;
    if (b.prog <= 0) {
      b.alert = null; S.covDirty = true;
      if (!isGrow(b)) { toast(`${BLD[b.k].name} pronto!`, 'ok'); sfx('done'); }
      if (isGrow(b) && b.k === 'R' && b.den === 3 && b.lv === 3) G.towers++;
    }
  }
  if (S.covDirty) computeCoverage();
  growZones();
  if (G.day % 3 === 0) upgradeSome();
  fires();
  for (let i = 0; i < W.rub.length; i++) if (W.rub[i] && W.bld[i] < 0 && --W.rub[i] === 0) { /* entulho some */ }
  weatherTick();
  if (G.day % 10 === 0) { computeTraffic(); computeEnv(); updateBuildings(); }
  if (G.day % 30 === 0) monthlyTick();
  checkTutorial();
}

/* ---------- Cobertura de serviços ---------- */
function computeCoverage() {
  const N = W.N;
  for (const k of COV_KEYS) S.cov[k].fill(0);
  const techMul = { police: G.techs.policia ? 1.2 : 1, health: G.techs.medicina ? 1.2 : 1, edu: 1 + lawFx('edu'), garbage: 1 + lawFx('garbage') };
  let pSup = 0, wSup = 0, gCap = 0, sCap = 0;
  for (const b of W.blds) {
    if (!done(b) || isGrow(b) || b.aband) continue;
    const d = BLD[b.k];
    if (d.power) pSup += d.power * budgetF('power');
    if (!d.cov) continue;
    const key = d.cov;
    const f = clamp((0.45 + 0.55 * budgetF(key)) * (techMul[key] || 1) * (1 + (key === 'health' ? lawFx('health') : 0)), 0.2, 1.6);
    if (key === 'power') pSup += (d.cap || 0) * budgetF('power') * (b.k === 'eolica' ? 1 + 0.12 * (W.h[idx(b.x, b.y)] - 1) : 1);
    if (key === 'water') wSup += (d.cap || 0) * budgetF('water') * (G.techs.saneamento ? 1.25 : 1) * (G.events.seca > 0 ? 0.55 : 1);
    if (key === 'garbage') gCap += (d.cap || 0) * budgetF('garbage');
    if (key === 'sewage') sCap += (d.cap || 0) * budgetF('sewage') * (G.techs.saneamento ? 1.25 : 1);
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = d.r * (key === 'power' || key === 'water' ? 1 : Math.min(1.25, f));
    const arr = S.cov[key];
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(N - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(N - 1, Math.ceil(cx + r)); x++) {
        const dd = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (dd > r) continue;
        const val = (key === 'power' || key === 'water') ? 255 : Math.min(255, 255 * f * (1 - 0.55 * dd / r));
        const i = y * N + x;
        if (val > arr[i]) arr[i] = val;
      }
    }
  }
  // demanda de energia, água, lixo e esgoto
  let pDem = 0, wDem = 0, gDem = 0, sDem = 0;
  for (const b of W.blds) {
    if (!done(b) || b.aband) continue;
    const use = consumption(b);
    const i = idx(b.x, b.y);
    if (S.cov.power[i] > 40) pDem += use.p;
    if (S.cov.water[i] > 40) wDem += use.w;
    gDem += use.g; if (S.cov.sewage[i] > 40) sDem += use.w;
  }
  pDem *= 1 + lawFx('power');
  G.power = { sup: Math.round(pSup), dem: Math.round(pDem) };
  G.water = { sup: Math.round(wSup), dem: Math.round(wDem) };
  G.garbage = { cap: Math.round(gCap), dem: Math.round(gDem) };
  G.sewage = { cap: Math.round(sCap), dem: Math.round(sDem) };
  const pr = pDem > 0 ? Math.min(1, pSup / pDem) : 1, wr = wDem > 0 ? Math.min(1, wSup / wDem) : 1;
  for (const b of W.blds) {
    if (!b) continue;
    const i = idx(b.x, b.y);
    const self = !isGrow(b) && (BLD[b.k].cov === 'power');
    b.pw = self || (S.cov.power[i] > 40 && hash2(b.id, G.month, 3) < pr + 0.001);
    b.wt = (!isGrow(b) && !BLD[b.k].jobs) || (S.cov.water[i] > 40 && hash2(b.id, G.month, 4) < wr + 0.001);
  }
  S.covDirty = false;
}

function consumption(b) {
  if (isGrow(b)) {
    const o = b.occ || 0;
    if (b.k === 'R') return { p: o * 0.4, w: o * 0.5, g: o * 0.3 };
    if (b.k === 'C') return { p: o * 0.8, w: o * 0.4, g: o * 0.4 };
    return { p: o * 1.6, w: o * 1.0, g: o * 0.8 };
  }
  const j = BLD[b.k].jobs || 0;
  return { p: j * 0.8, w: j * 0.3, g: j * 0.2 };
}

/* ---------- Crescimento das zonas ---------- */
function rebuildZoneList() {
  S.zoneList = [];
  for (let i = 0; i < W.zone.length; i++) if (W.zone[i] && W.bld[i] < 0) S.zoneList.push(i);
  S.zoneListDay = G.day;
}

function growZones() {
  if (G.day - S.zoneListDay >= 4) rebuildZoneList();
  const L = S.zoneList;
  if (!L.length) return;
  const K = 2 + Math.floor(L.length / 50);
  for (let k = 0; k < K; k++) {
    const i = L[Math.floor(rnd() * L.length)];
    if (W.bld[i] >= 0 || !W.zone[i]) continue;
    const zk = ZONE_KEYS[W.zone[i] - 1], z = ZONES[zk];
    const t = z.t;
    let D = G.demand[t];
    if (t === 'R' && G.pop < 40) D = Math.max(D, 40);
    if (D <= 0 || !chance(clamp(D / 100, 0.05, 1) * 0.7)) continue;
    const x = i % W.N, y = (i / W.N) | 0;
    const big = (t === 'I' && z.den === 2) || z.den === 3;
    const w = big ? 2 : 1;
    let ax = x, ay = y;
    if (big) { // procura um bloco 2x2 livre com a mesma zona
      let found = false;
      for (const [ox, oy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
        const bx = x + ox, by = y + oy;
        if (blockFree(bx, by, 2, W.zone[i])) { ax = bx; ay = by; found = true; break; }
      }
      if (!found) continue;
    }
    if (roadAccess(ax, ay, w, w) < 0) continue;
    const ci = idx(ax, ay);
    if (S.cov.power[ci] < 40 || S.cov.water[ci] < 40) continue;
    const b = { k: t, den: z.den, lv: 1, v: ri(0, 5), x: ax, y: ay, w, h: w, prog: z.den * 3, days: z.den * 3, occ: 0, hap: 60, wealth: 0, bad: 0 };
    b.cap = capOf(b);
    addBuilding(b);
  }
}

function blockFree(x, y, s, zid) {
  if (!inb(x, y) || !inb(x + s - 1, y + s - 1)) return false;
  const h0 = W.h[idx(x, y)];
  for (let yy = y; yy < y + s; yy++) for (let xx = x; xx < x + s; xx++) {
    const j = idx(xx, yy);
    if (W.zone[j] !== zid || W.bld[j] >= 0 || W.h[j] !== h0) return false;
  }
  return true;
}

function upgradeSome() {
  const B = W.blds;
  if (!B.length) return;
  for (let k = 0; k < 4 + B.length / 80; k++) {
    const b = B[Math.floor(rnd() * B.length)];
    if (!b || !isGrow(b) || b.prog > 0 || b.aband || b.lv >= 3) continue;
    if (b.den === 3 && b.lv === 2 && !G.techs.arranha) continue;
    const lvv = S.lv[idx(b.x, b.y)];
    const need = [0, 32, 55][b.lv];
    if (lvv < need || !b.pw || !b.wt || G.demand[b.k] < -10) continue;
    if (b.k === 'R' && b.hap < 55) continue;
    if (!chance(0.35)) continue;
    b.lv++; b.cap = capOf(b); b.prog = 4; b.days = 4;
    if (b.k === 'R' && b.den === 3 && b.lv === 3) G.towers++;
  }
}

/* ---------- Incêndios ---------- */
function fires() {
  const dry = G.events.seca > 0 ? 1.6 : 1;
  for (const b of W.blds) {
    if (!done(b)) continue;
    const i = idx(b.x + (b.w >> 1), b.y + (b.h >> 1));
    const fc = S.cov.fire[i] / 255;
    if (b.fire > 0) {
      b.fire++;
      if (chance(0.12 + fc * 0.55)) { b.fire = 0; continue; }
      if (chance(0.07 * (1 - fc))) igniteNear(b);
      if (b.fire > 9) destroyBuilding(b, 'incêndio');
      continue;
    }
    if (G.day < 360 || G.pop < 300) continue;
    if (!G.settings.disasters && !chance(0.3)) continue;
    const base = b.k === 'I' ? 0.00016 : isGrow(b) ? 0.00006 : 0.00002;
    if (chance(base * dry * (1 - fc * 0.92))) { b.fire = 1; if (fc < 0.2) addFeed(nomeGente(), `Fogo perto de casa e nada de bombeiro no ${plotName(b.x, b.y)}!`, 'ruim'); }
  }
}
function igniteNear(b) {
  for (let yy = b.y - 1; yy <= b.y + b.h; yy++) for (let xx = b.x - 1; xx <= b.x + b.w; xx++) {
    if (!inb(xx, yy)) continue;
    const o = W.blds[W.bld[idx(xx, yy)]];
    if (o && o !== b && done(o) && !o.fire && chance(0.4)) o.fire = 1;
  }
}
function destroyBuilding(b, why) {
  for (const c of G.citizens) if (c.casa === b.id) { diary(c, `Perdemos a casa num ${why}. Fomos para a casa de parentes.`); c.casa = -1; }
  removeBuilding(b.id, true);
  S.covDirty = true;
}

/* ---------- Clima ---------- */
function weatherTick() {
  if (--G.weatherDays > 0) return;
  const m = G.month, rainy = m >= 1 && m <= 4;
  let w;
  const r = rnd();
  if (G.events.seca > 0) w = r < 0.85 ? 'sol' : 'nublado';
  else if (rainy) w = r < 0.28 ? 'sol' : r < 0.52 ? 'nublado' : r < 0.94 ? 'chuva' : 'tempestade';
  else w = r < 0.7 ? 'sol' : r < 0.93 ? 'nublado' : 'chuva';
  if (G.events.enchente > 0) w = 'tempestade';
  G.weather = w; G.weatherDays = ri(3, 8);
}

/* ---------- Trânsito ---------- */
function computeTraffic() {
  const N = W.N, n = N * N;
  if (W.roadsDirty) recomputeRoads();
  const tr = S.traffic; tr.fill(0);
  const dist = new Uint16Array(n).fill(65535), q = new Int32Array(n);
  let qh = 0, qt = 0;
  // fontes: ruas encostadas em lugares de trabalho
  for (const b of W.blds) {
    if (!done(b) || b.aband) continue;
    const jobs = isGrow(b) ? (b.k !== 'R' ? b.cap : 0) : (BLD[b.k].jobs || 0);
    if (!jobs) continue;
    const j = roadAccess(b.x, b.y, b.w, b.h, false);
    if (j >= 0 && dist[j] !== 0) { dist[j] = 0; q[qt++] = j; }
  }
  while (qh < qt) {
    const i = q[qh++], x = i % N, y = (i / N) | 0;
    for (const [dx, dy] of NB4) {
      const nx = x + dx, ny = y + dy;
      if (!inb(nx, ny)) continue;
      const j = ny * N + nx;
      if (W.road[j] && dist[j] === 65535) { dist[j] = dist[i] + 1; q[qt++] = j; }
    }
  }
  S.capMul = 1 + (G.techs.asfalto ? 0.2 : 0) + (G.techs.semaforo ? 0.15 : 0);
  const lawT = 1 + lawFx('traffic');
  let ts = 0, tc = 0;
  for (const b of W.blds) {
    if (!done(b) || b.k !== 'R' || !b.occ) continue;
    const ci = idx(b.x, b.y);
    const share = Math.min(0.75, S.cov.transit[ci] / 255 * 0.6 * budgetF('transit') + (G.laws.passe ? 0.06 : 0));
    const trips = b.occ * 0.45 * (1 - share) * lawT;
    let j = roadAccess(b.x, b.y, b.w, b.h, false);
    if (j < 0 || dist[j] === 65535) { b.noJobs = j >= 0; b.commute = 0; continue; }
    b.noJobs = false;
    const path = [];
    let steps = 0;
    while (dist[j] > 0 && steps++ < 120) {
      tr[j] += trips; path.push(j);
      const x = j % N, y = (j / N) | 0;
      let best = j;
      for (const [dx, dy] of NB4) {
        const nx = x + dx, ny = y + dy;
        if (!inb(nx, ny)) continue;
        const k = ny * N + nx;
        if (W.road[k] && dist[k] < dist[best]) best = k;
      }
      if (best === j) break;
      j = best;
    }
    tr[j] += trips;
    b.path = path.length;
    b._path = path;
  }
  // trânsito de passagem na rodovia (comércio com outras cidades)
  const trade = G.resources ? (G.resources.trade || 0) : 0;
  for (let i = 0; i < n; i++) if (W.road[i] === 3) tr[i] += 8 + trade * 0.05;
  // congestionamento do trajeto de cada casa
  for (const b of W.blds) {
    if (!b || !b._path) continue;
    let c = 0;
    for (const j of b._path) c += Math.min(2.5, tr[j] / (ROAD_CAP[W.road[j]] * S.capMul));
    b.commute = b._path.length ? c / b._path.length : 0;
    b._path = null;
  }
  for (let i = 0; i < n; i++) if (W.road[i]) { ts += Math.min(2, tr[i] / (ROAD_CAP[W.road[i]] * S.capMul)); tc++; }
  G.trafficAvg = tc ? ts / tc : 0;
}

/* ---------- Meio ambiente, crime e valor do terreno ---------- */
function blur(a, passes) {
  const N = W.N, t = new Float32Array(a.length);
  for (let p = 0; p < passes; p++) {
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, c = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= N || ny >= N) continue;
        s += a[ny * N + nx]; c++;
      }
      t[y * N + x] = s / c;
    }
    a.set(t);
  }
}

function computeEnv() {
  const N = W.N, n = N * N;
  const air = S.air, noise = S.noise, crime = S.crime, lv = S.lv;
  air.fill(0); noise.fill(0); crime.fill(0);
  const airMul = (1 + lawFx('air')) * (G.techs.verde ? 0.8 : 1), noiseMul = 1 + lawFx('noise');
  const stamp = (arr, b, v) => { for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) arr[idx(xx, yy)] += v; };
  const marcos = [];
  for (const b of W.blds) {
    if (!done(b) || b.aband) continue;
    if (isGrow(b)) {
      if (b.k === 'I') { stamp(air, b, (b.den === 2 ? 70 : 34) * (0.7 + b.lv * 0.3) * airMul); stamp(noise, b, 30 * noiseMul); }
      if (b.k === 'C') stamp(noise, b, 10 * b.den * noiseMul);
      const dens = b.occ / (b.w * b.h);
      const poor = b.k === 'R' ? [1.4, 1, 0.7][b.wealth] : 1;
      stamp(crime, b, Math.min(60, dens * 0.35) * poor * (1 + G.unemployment * 2.5));
    } else {
      const d = BLD[b.k];
      if (d.pol) stamp(air, b, d.pol * 3 * (d.pol > 0 ? airMul : 1));
      if (d.noise) stamp(noise, b, d.noise * 2 * noiseMul);
      if (d.lv) marcos.push([b, d.lv]);
    }
  }
  for (let i = 0; i < n; i++) {
    if (W.road[i]) { air[i] += S.traffic[i] * 0.25 * airMul; noise[i] += S.traffic[i] * 0.35 * noiseMul; }
    if (W.tree[i]) air[i] -= 6;
  }
  blur(air, 3); blur(noise, 2); blur(crime, 2);
  const polF = G.techs.policia ? 1.2 : 1;
  const crimeMul = (1 + lawFx('crime')) * (G.events.crise > 0 ? 1.2 : 1);
  for (let i = 0; i < n; i++) {
    air[i] = clamp(air[i] * 1.6, 0, 100);
    noise[i] = clamp(noise[i] * 1.4, 0, 100);
    crime[i] = clamp(crime[i] * 3 * crimeMul - S.cov.police[i] / 255 * 70 * polF * budgetF('police'), 0, 100);
  }
  // valor do terreno
  const bonus = new Float32Array(n);
  for (const [b, v] of marcos) {
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, r = 7;
    for (let y = Math.max(0, Math.floor(cy - r)); y < Math.min(N, cy + r); y++) for (let x = Math.max(0, Math.floor(cx - r)); x < Math.min(N, cx + r); x++) {
      const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
      if (d < r) bonus[y * N + x] = Math.max(bonus[y * N + x], v * (1 - d / r));
    }
  }
  const lawLV = lawFx('landValue');
  for (let i = 0; i < n; i++) {
    if (W.h[i] <= 0) { lv[i] = 0; continue; }
    const wd = S.wdist[i];
    let v = 24 + (wd <= 4 ? (5 - wd) * (W.tt[i] === TT.SAND ? 5 : 3.5) : 0) + Math.max(0, W.h[i] - 1) * 1.6 + bonus[i];
    v += S.cov.leisure[i] / 255 * 16 + S.cov.edu[i] / 255 * 7 + S.cov.health[i] / 255 * 6 + S.cov.police[i] / 255 * 4 + S.cov.transit[i] / 255 * 6;
    v -= air[i] * 0.42 + noise[i] * 0.22 + crime[i] * 0.3;
    lv[i] = clamp(v + lawLV, 0, 100);
  }
  let as = 0, cs = 0, c = 0;
  for (const b of W.blds) if (done(b) && b.k === 'R') { const i = idx(b.x, b.y); as += air[i]; cs += crime[i]; c++; }
  G.airAvg = c ? as / c : 0; G.crimeAvg = c ? cs / c : 0;
}

/* ---------- Moradores e empresas ---------- */
function updateBuildings() {
  const sc = G.events;
  let pop = 0, jobs = 0, rOcc = 0, servedW = 0, servedP = 0, servedH = 0, servedT = 0, servedE = 0, hapSum = 0;
  const zc = { R: 0, C: 0, I: 0 };
  const happyLaw = lawFx('happy') + (sc.epidemia > 0 ? -10 : 0) + (sc.crise > 0 ? -4 : 0) + (sc.boom > 0 ? 3 : 0);
  let marcoHappy = 0;
  for (const b of W.blds) if (done(b) && !isGrow(b) && BLD[b.k].happy) marcoHappy += BLD[b.k].happy;
  const gRatio = G.garbage && G.garbage.dem > 0 ? Math.min(1.2, G.garbage.cap / G.garbage.dem) : 1;
  for (const b of W.blds) {
    if (!done(b)) continue;
    const i = idx(b.x, b.y);
    if (!isGrow(b)) { if (!b.aband) jobs += BLD[b.k].jobs || 0; continue; }
    zc[b.k]++;
    // lixo: acumula sem coleta
    const gcov = S.cov.garbage[i] / 255;
    b.gb = clamp((b.gb || 0) + (gcov > 0.2 && gRatio >= 0.95 ? -25 : G.pop > 400 ? 12 : -5), 0, 100);
    const lvv = S.lv[i];
    if (b.k === 'R') {
      b.wealth = lvv < 35 ? 0 : lvv < 65 ? 1 : 2;
      let h = 46;
      h += (S.cov.police[i] + S.cov.fire[i] + S.cov.health[i] + S.cov.edu[i] + S.cov.leisure[i]) / (255 * 5) * 30;
      h += lvv * 0.14 + S.cov.transit[i] / 255 * 4;
      h -= S.air[i] * 0.25 + S.noise[i] * 0.12 + S.crime[i] * 0.25;
      if (!b.pw) h -= 25; if (!b.wt) h -= 25;
      if (b.gb > 50) h -= 10;
      if (S.cov.sewage[i] < 40 && G.pop > 800) h -= 4;
      h -= (G.taxes.R - 9) * 2.4;
      h -= G.unemployment * 35;
      h -= clamp((b.commute || 0) - 0.6, 0, 1.5) * 10;
      if (b.noJobs) h -= 6;
      h += happyLaw + Math.min(8, marcoHappy);
      b.hap = Math.round(clamp(h, 0, 100));
      if (b.hap < 22 || !b.pw || !b.wt) b.bad = (b.bad || 0) + 1; else b.bad = Math.max(0, (b.bad || 0) - 1);
      if (b.aband) { if (b.hap > 45 && b.pw && b.wt) { b.aband = false; b.bad = 0; } }
      else if (b.bad > 9 && chance(0.25)) { b.aband = true; b.occ = 0; addFeed(nomeGente(), `Mais uma família foi embora do ${plotName(b.x, b.y)}. Não dá para viver assim.`, 'ruim'); }
      const target = b.aband ? 0 : b.cap * clamp((b.hap - 15) / 45, 0.15, 1) * (G.demand.R < -30 ? 0.85 : 1);
      b.occ = Math.round(b.occ + (target - b.occ) * 0.45 + (target > b.occ ? 0.6 : 0));
      b.occ = clamp(b.occ, 0, b.cap);
      pop += b.occ; rOcc += b.occ; hapSum += b.hap * b.occ;
      if (b.wt) servedW += b.occ; if (b.pw) servedP += b.occ;
      if (S.cov.health[i] > 60) servedH += b.occ; if (S.cov.transit[i] > 50) servedT += b.occ; if (S.cov.edu[i] > 60) servedE += b.occ;
      b.alert = !b.pw ? 'power' : !b.wt ? 'water' : b.gb > 80 ? 'trash' : b.aband ? 'sad' : null;
    } else {
      let p = 1;
      if (!b.pw) p -= 0.5; if (!b.wt) p -= 0.3;
      if (b.gb > 60) p -= 0.15;
      if (b.k === 'C' && G.resources && G.resources.short) p -= 0.25;
      p -= Math.max(0, (G.taxes[b.k] - 9) * 0.03);
      b.prosp = clamp(p, 0.1, 1);
      b.hap = Math.round(b.prosp * 100);
      if (!b.pw || !b.wt || G.demand[b.k] < -60) b.bad = (b.bad || 0) + 1; else b.bad = 0;
      if (b.aband) { if (b.pw && b.wt && G.demand[b.k] > 0) { b.aband = false; b.bad = 0; } }
      else if (b.bad > 9 && chance(0.25)) { b.aband = true; b.occ = 0; }
      jobs += b.aband ? 0 : Math.round(b.cap * b.prosp);
      b.alert = !b.pw ? 'power' : !b.wt ? 'water' : b.gb > 80 ? 'trash' : b.aband ? 'sad' : null;
    }
  }
  // empregados: distribui trabalhadores entre os empregos
  const workforce = pop * 0.55;
  const fill = jobs > 0 ? Math.min(1, workforce / jobs) : 0;
  for (const b of W.blds) if (done(b) && isGrow(b) && b.k !== 'R') b.occ = b.aband ? 0 : Math.round(b.cap * (b.prosp || 1) * fill);
  const employed = Math.min(workforce, jobs);
  G.pop = pop; G.jobs = jobs; G.workforce = workforce;
  G.unemployment = workforce > 0 ? clamp(1 - employed / workforce, 0, 1) : 0;
  G.vacancies = Math.max(0, jobs - workforce);
  G.avgHap = rOcc ? hapSum / rOcc : 60;
  G.waterServed = rOcc ? servedW / rOcc : 1; G.powerServed = rOcc ? servedP / rOcc : 1;
  G.healthServed = rOcc ? servedH / rOcc : 0; G.transitServed = rOcc ? servedT / rOcc : 0; G.eduServed = rOcc ? servedE / rOcc : 0;
  G.zoneCounts = zc;
  computeDemand();
}

function computeDemand() {
  const ev = G.events;
  const pop = G.pop;
  const unemployed = G.workforce - Math.min(G.workforce, G.jobs);
  let Ccap = 0, Icap = 0;
  for (const b of W.blds) if (done(b) && !b.aband) { if (b.k === 'C') Ccap += b.cap; if (b.k === 'I') Icap += b.cap; }
  const evC = (ev.crise > 0 ? -25 : 0) + (ev.boom > 0 ? 15 : 0);
  let R = 28 + (G.vacancies - unemployed) / Math.max(15, pop * 0.04) * 22 + (G.approval - 55) * 0.6 - (G.taxes.R - 9) * 4 + lawFx('R') + (ev.boom > 0 ? 10 : 0);
  if (G.waterServed < 0.8 || G.powerServed < 0.8) R -= 25;
  const tC = pop * 0.15 + G.tourists * 0.02 + 8;
  let Cd = (tC - Ccap) / Math.max(8, tC * 0.35) * 50 + G.unemployment * 50 - (G.taxes.C - 9) * 4 + lawFx('C') + evC;
  const tI = pop * 0.12 + 12 + (G.linked ? 10 + G.level * 6 : 0);
  let Id = (tI - Icap) / Math.max(8, tI * 0.35) * 50 + G.unemployment * 40 - (G.taxes.I - 9) * 4 + lawFx('I') + evC;
  if (G.resources && G.resources.short) Id += 15;
  G.demand = { R: Math.round(clamp(R, -100, 100)), C: Math.round(clamp(Cd, -100, 100)), I: Math.round(clamp(Id, -100, 100)) };
}

/* ---------- Mês ---------- */
function monthlyTick() {
  computeCoverage(); computeTraffic(); computeEnv(); updateBuildings();
  countThings();
  economy();
  research();
  tourism();
  approvalUpdate();
  events();
  if (G.day >= G.nextElection) election();
  checkPromises();
  citizensMonthly();
  feedMonthly();
  botsMonthly();
  checkLevel();
  checkMissions();
  checkAchievements();
  checkScenario();
  for (const k in G.events) if (G.events[k] > 0) G.events[k]--;
  for (const k in G.lawCooldown) if (G.lawCooldown[k] > 0) G.lawCooldown[k]--;
  const H = G.hist;
  const push = (k, v) => { H[k].push(v); if (H[k].length > 120) H[k].shift(); };
  push('pop', G.pop); push('money', Math.round(G.money)); push('income', G.report.income); push('expense', G.report.expense);
  push('approval', Math.round(G.approval)); push('unemp', Math.round(G.unemployment * 100)); push('air', Math.round(G.airAvg)); push('crime', Math.round(G.crimeAvg)); push('traffic', Math.round(G.trafficAvg * 100));
  if (G.mode === 'desafio' && G.money < 0) {
    G.debtMonths++;
    if (G.debtMonths === 1) toast('O caixa está negativo! Em 6 meses o estado intervém.', 'bad');
    if (G.debtMonths >= 6) gameOver('falencia');
  } else G.debtMonths = 0;
  autosave();
  if (typeof onMonth === 'function') onMonth();
}

function countThings() {
  const c = {};
  let roads = 0, bridges = 0;
  for (const k in BLD) c[k] = 0;
  CATS.forEach(k => c[k.id] = 0);
  for (const b of W.blds) {
    if (!done(b) || isGrow(b)) continue;
    c[b.k]++; c[BLD[b.k].cat]++;
  }
  for (let i = 0; i < W.road.length; i++) if (W.road[i] && W.road[i] !== 3) { roads++; if (W.h[i] <= 0) bridges++; }
  G.counts = c; G.roadCount = roads; G.bridges = bridges;
  G.marcos = ['igreja', 'relogio', 'teatro', 'museu', 'farol', 'estadio', 'prefeitura'].filter(k => c[k] > 0).length;
  G.allPlots = W.owned.every(v => v === 1);
  G.linked = W.extComp >= 0 && W.blds.some(b => done(b) && isGrow(b) && roadAccess(b.x, b.y, b.w, b.h, true) >= 0);
}

function economy() {
  const tx = G.taxes;
  const ev = G.events;
  let incR = 0, incC = 0, incI = 0;
  for (const b of W.blds) {
    if (!done(b) || !isGrow(b) || b.aband) continue;
    if (b.k === 'R') incR += b.occ * [30, 42, 60][b.wealth] * tx.R / 100;
    if (b.k === 'C') incC += b.occ * 40 * (b.prosp || 1) * tx.C / 100;
    if (b.k === 'I') incI += b.occ * 44 * (b.prosp || 1) * tx.I / 100;
  }
  const incMul = (ev.crise > 0 ? 0.85 : 1) * (ev.boom > 0 ? 1.1 : 1);
  incR *= incMul; incC *= incMul; incI *= incMul;
  // despesas
  const infl = ev.inflacao > 0 ? 1.15 : 1;
  const byCat = {};
  let services = 0;
  for (const b of W.blds) {
    if (!done(b) || isGrow(b)) continue;
    const d = BLD[b.k];
    const bk = d.cov || (d.cat === 'transporte' ? 'transit' : d.cat === 'lazer' ? 'leisure' : null);
    const c = d.up * (bk ? budgetF(bk) : 1) * infl;
    services += c;
    byCat[d.cat] = (byCat[d.cat] || 0) + c;
  }
  let roads = 0;
  for (let i = 0; i < W.road.length; i++) if (W.road[i] === 1) roads += 1; else if (W.road[i] === 2) roads += 3;
  roads *= budgetF('roads') * infl;
  let laws = 0;
  for (const id in G.laws) laws += LAW_BY_ID[id].custo * Math.max(1, G.pop / 1000);
  let loans = 0;
  for (const l of G.loans) { loans += l.pay; l.left--; }
  G.loans = G.loans.filter(l => l.left > 0);
  // produção e comércio
  const res = production();
  const tourInc = G.tourists * 3;
  const income = incR + incC + incI + res.exportMoney + tourInc;
  const expense = services + roads + laws + loans + res.importMoney;
  if (G.mode !== 'criativo') G.money += income - expense;
  G.report = {
    income: Math.round(income), expense: Math.round(expense),
    incR: Math.round(incR), incC: Math.round(incC), incI: Math.round(incI), exp: Math.round(res.exportMoney), tour: Math.round(tourInc),
    services: Math.round(services), roads: Math.round(roads), laws: Math.round(laws), loans: Math.round(loans), imp: Math.round(res.importMoney), byCat,
  };
  G.exportsMoney = Math.round(res.exportMoney);
}

const PRICES = { comida: 2, madeira: 4, minerio: 5, mercadorias: 4 };
function production() {
  const p = { comida: 0, madeira: 0, minerio: 0, mercadorias: 0 };
  const fill = G.jobs > 0 ? Math.min(1, G.workforce / G.jobs) : 0;
  let Iocc = 0, Cocc = 0;
  for (const b of W.blds) {
    if (!done(b) || b.aband) continue;
    if (b.k === 'I') Iocc += b.occ;
    else if (b.k === 'C') Cocc += b.occ;
    else if (!isGrow(b) && BLD[b.k].prod) {
      const d = BLD[b.k];
      let f = fill * (b.pw ? 1 : 0.4);
      if (b.k === 'madeira') { // consome árvores da mata
        let n = 0;
        for (let yy = b.y - 4; yy < b.y + b.h + 4; yy++) for (let xx = b.x - 4; xx < b.x + b.w + 4; xx++) if (inb(xx, yy) && W.tree[idx(xx, yy)]) n++;
        f *= Math.min(1, n / 8);
        if (n > 0 && chance(0.3)) for (let t = 0; t < 30; t++) { const xx = b.x + ri(-4, b.w + 3), yy = b.y + ri(-4, b.h + 3); if (inb(xx, yy) && W.tree[idx(xx, yy)]) { W.tree[idx(xx, yy)] = 0; break; } }
      }
      for (const k in d.prod) p[k] += d.prod[k] * f * (k === 'comida' && G.techs.agro ? 1.5 : 1);
    }
  }
  const inputs = p.madeira + p.minerio, need = Iocc * 0.6;
  const inF = need > 0 ? Math.min(1, inputs / need) : 0;
  p.mercadorias = Iocc * (1 + 0.5 * inF);
  const usedIn = Math.min(inputs, need);
  const cons = { comida: G.pop * 0.08, madeira: usedIn * (p.madeira / Math.max(1, inputs)), minerio: usedIn * (p.minerio / Math.max(1, inputs)), mercadorias: Cocc * 0.5 + G.pop * 0.03 };
  let tradeMul = G.linked ? 1 : 0;
  if (G.linked) tradeMul += (G.counts.trem || 0) * 0.5 + (G.counts.porto || 0) * 1.0 + (G.counts.aero || 0) * 0.6;
  let exportMoney = 0, importMoney = 0, short = false, tradeVol = 0;
  const table = {};
  for (const k in p) {
    const net = p[k] - cons[k];
    table[k] = { prod: Math.round(p[k]), cons: Math.round(cons[k]), net: Math.round(net) };
    if (net > 0 && tradeMul > 0) {
      const units = Math.min(net, 300 * tradeMul);
      exportMoney += units * PRICES[k] * (0.8 + Math.min(0.6, tradeMul * 0.1));
      tradeVol += units;
    } else if (net < 0 && (k === 'comida' || k === 'mercadorias')) {
      if (tradeMul > 0) { importMoney += -net * PRICES[k] * 1.1; tradeVol += -net; }
      else short = true;
    }
  }
  G.resources = { table, short, trade: tradeVol, tradeMul };
  return { exportMoney, importMoney };
}

function research() {
  let pts = 0;
  for (const b of W.blds) if (done(b) && !isGrow(b) && BLD[b.k].research) pts += BLD[b.k].research;
  pts *= budgetF('edu') * (1 + lawFx('research'));
  G.researchRate = Math.round(pts * 10) / 10;
  if (!G.researching) return;
  G.research += pts;
  const t = TECH_BY_ID[G.researching];
  if (G.research >= t.cost) {
    G.techs[t.id] = 1; G.research = 0; G.researching = null;
    toast(`Pesquisa concluída: ${t.name}`, 'ok'); sfx('level');
    addNews(`Cientistas da cidade concluem: ${t.name}`, t.desc);
    S.covDirty = true;
  }
}

function tourism() {
  let attr = 0, hotel = 0;
  for (const b of W.blds) {
    if (!done(b) || isGrow(b)) continue;
    const d = BLD[b.k];
    attr += d.tour || 0; hotel += d.hotel || 0;
    if (b.k === 'parque') attr += 3;
  }
  let beach = 0;
  for (const b of W.blds) if (done(b) && b.k === 'C' && S.wdist[idx(b.x, b.y)] <= 3) beach++;
  attr += Math.min(60, beach * 1.5);
  let mul = 1 + lawFx('tourism') + (G.techs.turismo ? 0.15 : 0);
  if (G.laws.carnaval && G.month === 1) mul += 1;
  const appeal = clamp((G.approval / 60) * (1 - G.crimeAvg / 150) * (1 - G.airAvg / 200), 0.2, 1.5);
  const access = (G.linked ? 1 : 0.3) + (G.counts.aero || 0) + (G.counts.trem || 0) * 0.3 + (G.counts.porto || 0) * 0.2;
  let t = attr * 9 * mul * appeal * access;
  const capT = hotel * 4 + 150 + G.pop * 0.05;
  if (t > capT) t = capT + (t - capT) * 0.4;
  G.tourists = Math.round(t);
}

function approvalUpdate() {
  let target = G.avgHap * 0.82 + 12;
  if (G.money < 0) target -= 6;
  if (G.report && G.report.income > G.report.expense) target += 3;
  target += G.promises.filter(p => p.done).length * 1.5;
  if (G.pop < 50) target = Math.max(target, 58);
  G.approval = clamp(G.approval * 0.55 + target * 0.45, 0, 100);
}

/* ---------- Eventos, crises e desastres ---------- */
function events() {
  const ev = G.events, m = G.month;
  if (G.settings.crises && G.day > 360) {
    if (!ev.inflacao && chance(0.02)) { ev.inflacao = 6; addNews('Inflação dispara no país', 'Obras e serviços ficam 15% mais caros por 6 meses.'); toast('Crise: inflação alta', 'bad'); }
    else if (!ev.crise && !ev.boom && chance(0.015)) { ev.crise = 8; addNews('Crise econômica chega à cidade', 'Comércio e indústria desaceleram por 8 meses.'); toast('Crise econômica!', 'bad'); }
    else if (!ev.boom && !ev.crise && chance(0.015)) { ev.boom = 6; addNews('Economia aquecida!', 'Mais empregos e arrecadação nos próximos meses.'); toast('Boom econômico!', 'ok'); }
  }
  if (G.settings.disasters && G.day > 300 && G.pop > 150) {
    const r = rnd();
    if (m >= 1 && m <= 4 && r < 0.05) flood();
    else if (m >= 7 && m <= 11 && !ev.seca && r < 0.04) { ev.seca = ri(3, 6); addNews('Seca castiga a região', 'A água vai render bem menos nos próximos meses.'); toast('Desastre: seca', 'bad'); G.desastres++; S.covDirty = true; }
    else if (r > 0.995) quake();
    else if (r > 0.985) bigFire();
    if (!ev.epidemia && G.healthServed < 0.3 && G.pop > 2000 && chance(0.03)) { ev.epidemia = 3; addNews('Surto de doença na cidade', 'Postos lotados. Falta atendimento de saúde.'); toast('Epidemia!', 'bad'); G.desastres++; }
  }
}
function flood() {
  G.events.enchente = 1; G.weather = 'tempestade'; G.weatherDays = 6;
  let hit = 0;
  for (const b of W.blds) {
    if (!done(b)) continue;
    const i = idx(b.x, b.y);
    if (W.h[i] === 1 && S.wdist[i] <= 2 && chance(G.techs.drenagem ? 0.05 : 0.3)) { destroyBuilding(b, 'enchente'); hit++; }
  }
  addNews('Enchente atinge a beira d\'água', hit ? `${hit} construções foram destruídas.` : 'Por sorte, ninguém perdeu a casa.');
  toast('Desastre: enchente', 'bad'); G.desastres++;
}
function quake() {
  const list = W.blds.filter(done);
  const n = Math.min(list.length, ri(3, 9));
  for (let k = 0; k < n; k++) { const b = pick(list); if (W.blds[b.id] === b) destroyBuilding(b, 'terremoto'); }
  addNews('Terremoto raro assusta a cidade', `${n} construções desabaram.`); toast('Desastre: terremoto', 'bad'); G.desastres++;
}
function bigFire() {
  const list = W.blds.filter(b => done(b) && isGrow(b));
  if (!list.length) return;
  const b0 = pick(list);
  for (const b of list) if (Math.hypot(b.x - b0.x, b.y - b0.y) < 4) b.fire = 1;
  addNews('Grande incêndio!', `Fogo se espalha pelo ${plotName(b0.x, b0.y)}.`); toast('Desastre: grande incêndio', 'bad'); G.desastres++;
}

/* ---------- Política ---------- */
function election() {
  const failed = G.promises.filter(p => !p.done).length;
  const share = clamp(G.approval + 4 - failed * 4 + (rnd() - 0.5) * 10, 3, 97); // +4: vantagem de quem já governa
  const win = share >= 50;
  const rival = nomeGente();
  G.nextElection += 360 * 4;
  G.council.gov = clamp(Math.round(15 * share / 100 + (rnd() - 0.5) * 3), 2, 13);
  G.council.opp = 15 - G.council.gov;
  const result = { win, share: Math.round(share), rival, failed, total: G.promises.length };
  if (win) {
    G.reeleicoes++;
    addNews(`Prefeito reeleito com ${result.share}% dos votos`, `${rival} reconhece a derrota.`);
  } else {
    addNews(`${rival} vence a eleição`, `Prefeito tem só ${result.share}% dos votos.`);
  }
  G.promises = [];
  showElection(result);
  if (!win && G.mode === 'desafio') gameOver('eleicao', result);
  else if (!win) G.approval = 50;
}

function promiseOptions() {
  return PROMISES.slice().sort(() => rnd() - 0.5).slice(0, 4);
}
function setPromises(ids) {
  G.promises = ids.map(id => {
    const p = PROMISES.find(q => q.id === id);
    return { id, txt: p.txt, base: p.base ? p.base(G) : null, done: false };
  });
}
function checkPromises() {
  for (const p of G.promises) {
    if (p.done) continue;
    const def = PROMISES.find(q => q.id === p.id);
    if (!def.keep && def.check(G, p)) { p.done = true; toast(`Promessa cumprida: ${p.txt}`, 'ok'); G.approval = Math.min(100, G.approval + 3); addFeed(nomeGente(), `O prefeito cumpriu: "${p.txt}". Ganhou meu voto.`, 'bom'); }
    if (def.keep && !def.check(G, p)) { p.broken = true; }
  }
  for (const p of G.promises) { const def = PROMISES.find(q => q.id === p.id); if (def.keep) p.done = !p.broken; }
}

function proposeLaw(id) {
  const law = LAW_BY_ID[id];
  if (G.laws[id]) { delete G.laws[id]; addFeed(nomeGente(), `Revogaram "${law.name}". Era bom enquanto durou.`, 'neutro'); return { revoked: true }; }
  if (G.lawCooldown[id]) return { wait: G.lawCooldown[id] };
  const pop = (law.fx.happy || 0) * 0.04 + (law.fx.crime < 0 ? 0.08 : 0) + (law.fx.health ? 0.08 : 0);
  const pOpp = clamp((G.approval - 35) / 100 + pop, 0.02, 0.9);
  let yes = 0;
  for (let k = 0; k < G.council.gov; k++) if (chance(0.92)) yes++;
  for (let k = 0; k < G.council.opp; k++) if (chance(pOpp)) yes++;
  const ok = yes >= 8;
  if (ok) {
    G.laws[id] = G.day; G.leisAprovadas++;
    addNews(`Câmara aprova: ${law.name}`, `Placar: ${yes} a ${15 - yes}.`);
    addFeed(nomeGente(), `Aprovaram "${law.name}". ${law.fx.happy > 0 ? 'Gostei!' : 'Vamos ver no que dá.'}`, law.fx.happy >= 0 ? 'bom' : 'neutro');
  } else G.lawCooldown[id] = 2;
  return { ok, yes, no: 15 - yes };
}

/* ---------- Moradores em destaque ---------- */
function makeCitizen(home) {
  const jobs = W.blds.filter(b => done(b) && (b.k === 'C' || b.k === 'I' || (!isGrow(b) && BLD[b.k].jobs)));
  const c = {
    id: G.nextCitizen++, nome: nomeGente(), idade: ri(18, 78), casa: home ? home.id : -1,
    trabalho: jobs.length && chance(1 - G.unemployment) ? pick(jobs).id : -1, humor: home ? home.hap : 60, diario: [], seguir: false,
    gosto: pick(['futebol', 'forró', 'pescar', 'ler', 'cozinhar', 'jardinagem', 'novela', 'pedalar', 'videogame', 'praia']),
  };
  diary(c, home ? `Mudei para o ${plotName(home.x, home.y)}. ${home.hap > 60 ? 'O bairro parece bom.' : 'Vamos ver como é.'}` : 'Cheguei na cidade.');
  G.citizens.push(c);
  if (G.citizens.length > 40) { const i = G.citizens.findIndex(q => !q.seguir); if (i >= 0) G.citizens.splice(i, 1); }
  return c;
}
function diary(c, t) { c.diario.unshift({ d: G.day, t }); if (c.diario.length > 12) c.diario.pop(); }
function citizenNear(x, y) {
  let best = null, bd = 1e9;
  for (const c of G.citizens) {
    const b = W.blds[c.casa];
    if (!b) continue;
    const d = Math.hypot(b.x - x, b.y - y);
    if (d < bd) { bd = d; best = c; }
  }
  if (best && bd < 6) return best;
  let home = null; bd = 1e9;
  for (const b of W.blds) if (done(b) && b.k === 'R' && b.occ > 0) { const d = Math.hypot(b.x - x, b.y - y); if (d < bd) { bd = d; home = b; } }
  return home ? makeCitizen(home) : null;
}
function citizensMonthly() {
  if (G.citizens.length < 12) {
    const homes = W.blds.filter(b => done(b) && b.k === 'R' && b.occ > 0);
    if (homes.length) makeCitizen(pick(homes));
  }
  for (const c of G.citizens) {
    const home = W.blds[c.casa];
    if (!home) continue;
    c.humor = Math.round(c.humor * 0.5 + home.hap * 0.5);
    if (G.day % 360 === 0) c.idade++;
    const r = rnd();
    if (r > 0.45) continue;
    let t = null;
    const i = idx(home.x, home.y);
    if (!home.pw) t = 'Ficamos sem luz de novo. Comida estragou na geladeira.';
    else if (!home.wt) t = 'Torneira seca hoje. Tive que buscar água com balde.';
    else if (home.gb > 60) t = 'O lixo está acumulando na calçada. Ninguém recolhe.';
    else if (home.commute > 1.1) t = 'Passei mais de uma hora no trânsito para chegar ao trabalho.';
    else if (S.crime[i] > 55) t = 'Assaltaram um vizinho. Estou com medo de sair à noite.';
    else if (c.trabalho < 0 && G.vacancies > 5) { const jobs = W.blds.filter(b => done(b) && (b.k === 'C' || b.k === 'I')); if (jobs.length) { c.trabalho = pick(jobs).id; t = 'Consegui um emprego novo! Começo segunda.'; } }
    else if (c.trabalho >= 0 && G.unemployment > 0.15 && chance(0.3)) { c.trabalho = -1; t = 'Fui demitido. A cidade está sem emprego.'; }
    else if (S.cov.leisure[i] > 120) t = `Fim de semana no parque. Deu até para ${c.gosto}.`;
    else if (home.hap > 75) t = 'Gosto muito de morar aqui. Bairro tranquilo.';
    else if (S.air[i] > 50) t = 'O ar está pesado. As crianças vivem tossindo.';
    else t = `Dia comum. Tempo de ${G.weather === 'chuva' ? 'chuva' : 'sol'} e ${c.gosto} à noite.`;
    if (t) diary(c, t);
  }
}

/* ---------- Mural, jornal e conselheiros ---------- */
function addFeed(autor, txt, tipo) { G.feed.unshift({ d: G.day, autor, txt, tipo }); if (G.feed.length > 60) G.feed.pop(); }
function addNews(t, sub) { G.news.unshift({ d: G.day, t, sub }); if (G.news.length > 30) G.news.pop(); }
function plotName(x, y) { return W.plotNames[plotIdx(clamp(x, 0, W.N - 1), clamp(y, 0, W.N - 1))] || 'bairro'; }

function feedMonthly() {
  if (G.pop < 10) return;
  const posts = [];
  const worst = W.blds.filter(b => done(b) && b.k === 'R').sort((a, b) => a.hap - b.hap)[0];
  if (G.taxes.R >= 13) posts.push(['IPTU está um absurdo. Quem aguenta?', 'ruim']);
  if (G.trafficAvg > 0.8) posts.push(['Esse engarrafamento não tem fim. Precisamos de ônibus!', 'ruim']);
  if (G.unemployment > 0.12) posts.push(['Procuro emprego há meses. Cadê as vagas?', 'ruim']);
  if (G.waterServed < 0.9) posts.push(['Falta água na minha rua toda semana.', 'ruim']);
  if (G.powerServed < 0.9) posts.push(['Apagão de novo! Perdi a novela.', 'ruim']);
  if (G.crimeAvg > 40) posts.push(['Não dá mais para andar tranquilo à noite.', 'ruim']);
  if (G.airAvg > 45) posts.push(['A fumaça das fábricas está deixando todo mundo doente.', 'ruim']);
  if (G.healthServed < 0.5 && G.pop > 400) posts.push(['Precisei de médico e o posto mais perto fica longe demais.', 'ruim']);
  if (G.eduServed < 0.5 && G.pop > 400) posts.push(['Meu filho anda meia hora até a escola.', 'ruim']);
  if (worst && worst.hap < 35) posts.push([`O ${plotName(worst.x, worst.y)} está abandonado pela prefeitura.`, 'ruim']);
  if (G.approval > 75) posts.push(['Melhor prefeito que essa cidade já teve!', 'bom']);
  if (G.demand.R > 50) posts.push(['Todo mundo quer morar aqui. Faltam casas!', 'neutro']);
  if (G.counts.lazer > 2) posts.push(['Domingo no parque com a família. Que delícia.', 'bom']);
  if (G.tourists > 300) posts.push(['A cidade está cheia de turistas. Bom para o meu comércio!', 'bom']);
  if (G.weather === 'chuva') posts.push(['Chuva boa para o sertão, graças a Deus.', 'bom']);
  if (G.demand.C > 50) posts.push(['Tenho que ir até a cidade vizinha para fazer compras.', 'ruim']);
  if (!posts.length) posts.push(['Mais um dia tranquilo na cidade.', 'neutro']);
  posts.sort(() => rnd() - 0.5).slice(0, ri(1, 3)).forEach(([t, k]) => addFeed(nomeGente(), t, k));
}

function advisors() {
  const A = [];
  const r = G.report || { income: 0, expense: 0 };
  const bal = r.income - r.expense;
  A.push({ id: 'eco', nome: 'Economia', pessoa: 'Dona Lúcia', ok: bal >= 0 && G.money > 0,
    txt: G.money < 0 ? 'Estamos no vermelho! Corte gastos, suba um pouco os impostos ou pegue um empréstimo.' : bal < 0 ? `Gastamos ${money(-bal)} a mais do que arrecadamos por mês. Cuidado.` : G.taxes.R > 12 ? 'O caixa vai bem, mas os impostos altos estão espantando moradores.' : `Saldo positivo de ${money(bal)} por mês. Dá para investir.` });
  const p = G.power || { sup: 0, dem: 0 }, w = G.water || { sup: 0, dem: 0 };
  A.push({ id: 'infra', nome: 'Infraestrutura', pessoa: 'Seu Raimundo', ok: G.powerServed > 0.95 && G.waterServed > 0.95,
    txt: p.sup < p.dem ? `Falta energia: geramos ${fmt(p.sup)} e a cidade pede ${fmt(p.dem)}.` : w.sup < w.dem ? `Falta água: temos ${fmt(w.sup)} para ${fmt(w.dem)}.` : G.powerServed < 0.95 ? 'Tem bairro fora do alcance da energia. Uma subestação resolve.' : G.waterServed < 0.95 ? 'Tem casa sem água. Coloque uma caixa d\'água perto.' : (G.garbage && G.garbage.dem > G.garbage.cap) ? 'O aterro não dá conta do lixo. Precisamos de outro.' : 'Luz, água e lixo funcionando. Bom trabalho.' });
  A.push({ id: 'seg', nome: 'Segurança', pessoa: 'Delegada Íris', ok: G.crimeAvg < 25,
    txt: G.crimeAvg > 40 ? 'O crime está alto. Mais postos policiais e emprego ajudam.' : G.crimeAvg > 25 ? 'Alguns bairros precisam de policiamento.' : 'A cidade está segura.' });
  A.push({ id: 'social', nome: 'Saúde e educação', pessoa: 'Dr. Ícaro', ok: G.healthServed > 0.7 && G.eduServed > 0.7,
    txt: G.healthServed < 0.5 ? 'Metade da cidade está longe de um posto de saúde.' : G.eduServed < 0.5 ? 'Faltam escolas: muitas crianças sem vaga perto de casa.' : 'Saúde e escolas atendendo bem.' });
  A.push({ id: 'urb', nome: 'Urbanismo', pessoa: 'Arquiteta Bia', ok: G.trafficAvg < 0.7 && G.airAvg < 30,
    txt: G.trafficAvg > 0.8 ? 'Trânsito pesado. Avenidas, ônibus e ruas alternativas ajudam.' : G.airAvg > 35 ? 'O ar está poluído perto das fábricas. Afaste casas da indústria e plante árvores.' : G.demand.R > 40 ? 'Há procura por moradia. Crie mais zona residencial.' : G.demand.C > 40 ? 'O povo quer comércio. Crie zona comercial.' : G.demand.I > 40 ? 'Empresas querem se instalar. Crie zona industrial.' : 'A cidade está equilibrada.' });
  A.push({ id: 'pol', nome: 'Política', pessoa: 'Assessor Davi', ok: G.approval > 55,
    txt: G.approval < 45 ? `Aprovação de ${pct(G.approval)}. Se a eleição fosse hoje, perderíamos.` : `Aprovação de ${pct(G.approval)}. A Câmara tem ${G.council.gov} aliados e ${G.council.opp} na oposição.` });
  return A;
}

/* ---------- Cidades rivais ---------- */
function makeBots() {
  const names = CIDADES.slice().sort(() => rnd() - 0.5).slice(0, 6);
  const styles = ['cresce rápido', 'cuida do povo', 'aposta na indústria', 'vive do turismo', 'econômica', 'imprevisível'];
  return names.map((n, i) => ({ name: n, mayor: nomeGente(), style: styles[i], pop: ri(80, 900), approval: ri(45, 70), money: ri(20000, 90000), g: 0.03 + rnd() * 0.06, cap: ri(30000, 160000) }));
}
function botsMonthly() {
  for (const b of G.bots) {
    const shock = rnd() < 0.05 ? (rnd() - 0.6) * 0.3 : 0;
    b.pop = Math.max(50, Math.round(b.pop * (1 + (b.g * (0.4 + rnd()) * (1 - b.pop / b.cap)) + shock)));
    b.approval = clamp(b.approval + (rnd() - 0.5) * 6, 15, 95);
    b.money += (b.pop * 0.6 - 300) * (0.5 + rnd());
  }
  const score = c => c.pop * (0.5 + c.approval / 200);
  const all = G.bots.map(b => ({ s: score(b), me: false })).concat([{ s: score({ pop: G.pop, approval: G.approval }), me: true }]).sort((a, b) => b.s - a.s);
  const prev = G.rank;
  G.rank = all.findIndex(a => a.me) + 1;
  if (prev && G.rank < prev) toast(`Você subiu para o ${G.rank}º lugar no ranking!`, 'ok');
}

/* ---------- Progressão ---------- */
function checkLevel() {
  let lv = G.level;
  while (lv + 1 < LEVELS.length && G.pop >= LEVELS[lv + 1].pop) lv++;
  if (lv > G.level) {
    G.level = lv;
    const un = Object.values(BLD).filter(d => d.lvl === lv).map(d => d.name).concat(ZONE_KEYS.filter(k => ZONES[k].lvl === lv).map(k => ZONES[k].name));
    const bonus = 3000 * lv;
    if (G.mode !== 'criativo') G.money += bonus;
    addNews(`${G.name} agora é ${LEVELS[lv].name}!`, un.length ? 'Liberado: ' + un.join(', ') + '.' : '');
    showLevelUp(lv, un, bonus);
  }
}

const MISSION_T = [
  { id: 'pop', f: g => { const t = Math.max(g.pop + 150, Math.round(g.pop * 1.4 / 50) * 50); return { txt: `Chegue a ${fmt(t)} habitantes`, t, get: g => g.pop }; } },
  { id: 'lazer', f: g => { const t = (g.counts.lazer || 0) + 2; return { txt: 'Construa 2 áreas de lazer', t, get: g => g.counts.lazer || 0 }; } },
  { id: 'aprov', f: g => { const t = Math.min(92, Math.round(g.approval + 8)); return { txt: `Aprovação de ${t}%`, t, get: g => Math.round(g.approval) }; } },
  { id: 'agua', f: () => ({ txt: 'Água em 95% das casas', t: 95, get: g => Math.round(g.waterServed * 100) }) },
  { id: 'energia', f: () => ({ txt: 'Energia em 95% das casas', t: 95, get: g => Math.round(g.powerServed * 100) }) },
  { id: 'caixa', f: g => { const t = Math.round((Math.max(0, g.money) + 25000) / 5000) * 5000; return { txt: `Junte ${money(t)} em caixa`, t, get: g => Math.round(g.money) }; } },
  { id: 'edu', f: g => { const t = (g.counts.educacao || 0) + 1; return { txt: 'Construa uma escola ou biblioteca', t, get: g => g.counts.educacao || 0 }; } },
  { id: 'lei', f: g => ({ txt: 'Aprove uma lei na Câmara', t: g.leisAprovadas + 1, get: g => g.leisAprovadas }) },
  { id: 'arvores', f: g => ({ txt: 'Plante 15 árvores', t: g.treesPlanted + 15, get: g => g.treesPlanted }) },
  { id: 'onibus', f: () => ({ txt: 'Transporte público para 40% da cidade', t: 40, get: g => Math.round(g.transitServed * 100) }), lvl: 1 },
  { id: 'turistas', f: g => { const t = Math.max(150, Math.round(g.tourists * 1.5 / 50) * 50); return { txt: `Receba ${fmt(t)} turistas num mês`, t, get: g => g.tourists }; }, lvl: 2 },
  { id: 'saude', f: () => ({ txt: 'Saúde perto de 70% das casas', t: 70, get: g => Math.round(g.healthServed * 100) }), lvl: 1 },
];
function newMission() {
  const active = new Set(G.missions.map(m => m.id));
  const opts = MISSION_T.filter(m => !active.has(m.id) && (m.lvl || 0) <= G.level);
  const m = pick(opts);
  const o = m.f(G);
  return { id: m.id, txt: o.txt, t: o.t, reward: 1500 + 1500 * G.level, cur: 0 };
}
function missionProgress(m) { const t = MISSION_T.find(q => q.id === m.id); return t.f(G).get(G); }
function checkMissions() {
  G.missions.forEach((m, k) => {
    m.cur = missionProgress(m);
    if (m.cur >= m.t) {
      if (G.mode !== 'criativo') G.money += m.reward;
      G.research += 3;
      G.missoesFeitas++;
      toast(`Missão cumprida: ${m.txt} (+${money(m.reward)})`, 'ok'); sfx('coin');
      G.missions[k] = newMission();
    }
  });
}

function loadGlobalAch() { try { return JSON.parse(localStorage.getItem('distrito:ach') || '{}'); } catch (e) { return {}; } }
function checkAchievements() {
  const got = loadGlobalAch();
  let changed = false;
  for (const a of ACHIEVEMENTS) {
    if (got[a.id]) continue;
    let ok = false;
    try { ok = a.f(G); } catch (e) { ok = false; }
    if (ok) { got[a.id] = Date.now(); changed = true; toast(`Conquista: ${a.name}`, 'ach'); sfx('level'); }
  }
  if (changed) try { localStorage.setItem('distrito:ach', JSON.stringify(got)); } catch (e) { }
}

function checkScenario() {
  if (!G.scenario) return;
  const sc = SCENARIOS.find(s => s.id === G.scenario);
  const ok = sc.goals.every(g => { const [a, b] = g.f(G); return a >= b; });
  if (ok) { gameOver('vitoria'); return; }
  if (G.day >= sc.anos * 360) gameOver('prazo');
}

function gameOver(why, info) {
  G.over = why;
  if (why === 'vitoria' && G.scenario) {
    try { const w = JSON.parse(localStorage.getItem('distrito:campanha') || '{}'); w[G.scenario] = 1; localStorage.setItem('distrito:campanha', JSON.stringify(w)); } catch (e) { }
  }
  showGameOver(why, info);
}

/* ---------- Ações do jogador ---------- */
function spend(v) {
  if (G.mode === 'criativo') return true;
  if (G.money < v && G.mode === 'desafio') return false;
  if (G.money - v < -50000) return false;
  G.money -= v; return true;
}

function placeBuilding(key, x, y) {
  const d = BLD[key];
  if (!unlocked(d)) return 'Ainda bloqueado';
  if (d.unique && W.blds.some(b => b && b.k === key)) return 'Só pode existir um';
  const err = footprintOK(x, y, d.w, d.h) || needsOK(d, x, y);
  if (err) return err;
  const cost = d.cost * (G.events.inflacao > 0 ? 1.15 : 1);
  if (!spend(cost)) return 'Dinheiro insuficiente';
  const b = addBuilding({ k: key, x, y, w: d.w, h: d.h, prog: G.mode === 'criativo' ? 1 : d.days, days: d.days, occ: 0, hap: 100 });
  if (roadAccess(x, y, d.w, d.h, false) < 0 && !NO_ROAD.has(key)) b.alert = 'road';
  S.covDirty = true;
  return null;
}

function roadCost(i, type) { return ROADS[type === 2 ? 'avenida' : 'rua'].cost * (W.h[i] <= 0 ? 6 : 1) * (G.events.inflacao > 0 ? 1.15 : 1); }
function canRoad(x, y, type) {
  if (!inb(x, y)) return false;
  const i = idx(x, y);
  if (!ownedAt(x, y) || W.bld[i] >= 0) return false;
  if (W.road[i] === 3) return false;
  if (W.road[i] >= type) return false;
  return true;
}
function placeRoads(tiles, type) {
  let built = 0;
  for (const t of tiles) {
    if (!canRoad(t.x, t.y, type)) continue;
    const i = idx(t.x, t.y);
    if (!spend(roadCost(i, type))) { toast('Dinheiro insuficiente', 'bad'); break; }
    W.road[i] = type; W.tree[i] = 0; W.zone[i] = 0; W.rub[i] = 0;
    built++;
  }
  if (built) { W.roadsDirty = true; recomputeRoads(); G.roadCount += built; }
  return built;
}

function zoneTiles(tiles, zid) {
  let n = 0;
  for (const t of tiles) {
    if (!inb(t.x, t.y) || !ownedAt(t.x, t.y)) continue;
    const i = idx(t.x, t.y);
    if (W.h[i] <= 0 || W.road[i] || W.bld[i] >= 0) continue;
    if (W.zone[i] === zid) continue;
    if (zid && !spend(5)) break;
    W.zone[i] = zid;
    if (zid && W.tree[i] && chance(0.7)) W.tree[i] = 0;
    n++;
  }
  S.zoneListDay = -99;
  return n;
}

function bulldoze(tiles) {
  let n = 0;
  const seen = new Set();
  for (const t of tiles) {
    if (!inb(t.x, t.y) || !ownedAt(t.x, t.y)) continue;
    const i = idx(t.x, t.y);
    if (W.bld[i] >= 0) {
      const id = W.bld[i];
      if (seen.has(id)) continue;
      seen.add(id);
      const b = W.blds[id];
      for (const c of G.citizens) if (c.casa === id) { diary(c, 'A prefeitura derrubou nossa casa. Tivemos que mudar.'); c.casa = -1; }
      removeBuilding(id, false);
      if (!isGrow(b)) spend(BLD[b.k].cost * 0.05);
      n++; S.covDirty = true;
    } else if (W.road[i] && W.road[i] !== 3) { W.road[i] = 0; W.roadsDirty = true; n++; }
    else if (W.tree[i]) { if (!spend(10)) break; W.tree[i] = 0; n++; }
    else if (W.rub[i]) { W.rub[i] = 0; n++; }
    else if (W.zone[i]) { W.zone[i] = 0; n++; }
  }
  if (W.roadsDirty) recomputeRoads();
  S.zoneListDay = -99;
  return n;
}

function plantTree(x, y) {
  if (!inb(x, y) || !ownedAt(x, y)) return false;
  const i = idx(x, y);
  if (W.h[i] <= 0 || W.road[i] || W.bld[i] >= 0 || W.zone[i]) return false;
  if (W.tree[i]) { const t = treeInfo(W.tree[i]); if (t.count >= 3) return false; W.tree[i] = treeByte(t.type, t.count + 1, t.v); }
  else W.tree[i] = treeByte(W.tt[i] === TT.SAND ? 'palm' : pick(['round', 'round', 'ipe', 'mix']), 1, ri(0, 7));
  if (!spend(15)) return false;
  G.treesPlanted++;
  return true;
}

function doTerraform(x, y, op, target) {
  if (!inb(x, y)) return 'Fora do mapa';
  const i = idx(x, y);
  const cur = W.h[i];
  let t = op === 'elevar' ? cur + 1 : op === 'rebaixar' ? cur - 1 : target;
  t = clamp(t, 0, 8);
  if (t === cur) return null;
  const ch = terraform(x, y, t);
  if (!ch) return 'Não dá: tem rua, construção ou terreno não comprado no caminho';
  const cost = ch.length * 60;
  if (!spend(cost)) return 'Dinheiro insuficiente';
  G.terraforms++;
  computeWaterDist();
  S.zoneListDay = -99;
  return null;
}

function buyPlot(px, py) {
  if (!plotBuyable(px, py)) return 'Só dá para comprar áreas vizinhas às suas';
  const p = plotPrice();
  if (!spend(p)) return 'Dinheiro insuficiente';
  buyPlotRaw(px, py);
  addNews(`Prefeitura compra o ${W.plotNames[py * W.PN + px]}`, 'Mais espaço para a cidade crescer.');
  return null;
}

function takeLoan(v) {
  if (G.loans.length >= 3) return 'Já tem 3 empréstimos';
  const months = v <= 25000 ? 12 : v <= 100000 ? 24 : 36;
  const total = v * (1 + 0.012 * months);
  G.loans.push({ v, left: months, pay: Math.round(total / months) });
  G.money += v;
  return null;
}
function payLoan(i) {
  const l = G.loans[i];
  const rest = l.pay * l.left * 0.95;
  if (G.money < rest) return 'Dinheiro insuficiente';
  G.money -= rest; G.loans.splice(i, 1); return null;
}

function recomputeAll() {
  recomputeRoads(); computeCoverage(); computeTraffic(); computeEnv(); updateBuildings(); countThings();
  if (!G.report) G.report = { income: 0, expense: 0, incR: 0, incC: 0, incI: 0, exp: 0, tour: 0, services: 0, roads: 0, laws: 0, loans: 0, imp: 0, byCat: {} };
  G.missions.forEach(m => m.cur = missionProgress(m));
}

/* ---------- Tutorial ---------- */
const TUTORIAL = [
  { txt: 'Bem-vindo, prefeito! Abra "Ruas" e arraste o dedo a partir da rodovia para abrir as primeiras ruas.', ok: g => g.roadCount >= 6 },
  { txt: 'Agora, em "Zonas", pinte uma área residencial (verde) dos dois lados da rua.', ok: () => W.zone.some(z => z === ZONE_ID.R1) },
  { txt: 'Casas precisam de luz. Em "Energia", construa uma termelétrica perto das casas.', ok: g => W.blds.some(b => b && (b.k === 'termo' || b.k === 'eolica' || b.k === 'solar')) },
  { txt: 'E de água! Em "Água", coloque uma bomba na beira d\'água ou um poço.', ok: () => W.blds.some(b => b && (b.k === 'bomba' || b.k === 'poco')) },
  { txt: 'O povo precisa trabalhar: pinte também zonas comercial (azul) e industrial (amarela), longe das casas.', ok: () => W.zone.some(z => z === ZONE_ID.C1) && W.zone.some(z => z === ZONE_ID.I1) },
  { txt: 'Pronto! Acelere o tempo no topo e veja a cidade crescer. Toque nas casas para ver o que falta.', ok: g => g.pop >= 30 },
];
function checkTutorial() {
  if (G.tutorial < 0 || G.tutorial >= TUTORIAL.length) return;
  if (TUTORIAL[G.tutorial].ok(G)) { G.tutorial++; sfx('coin'); if (typeof renderTutorial === 'function') renderTutorial(); }
}
