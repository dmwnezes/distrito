'use strict';
// Início do jogo, cidade de demonstração do menu e laço principal.

function setupDemo() {
  newGame({ N: 64, mode: 'criativo', name: 'Demo', terrain: pick(['rio', 'costa', 'lagos']), seed: (Math.random() * 1e9) | 0 });
  autoCity();
  G.settings.music = 0.4;
  G.speed = 1;
  R.labels = false;
  R.cam.s = clamp(Math.round(3 * R.dpr / 1.3), 2, 8);
  const c = W.N / 2; centerOn(c, c);
}

// Monta uma cidade pronta para o fundo do menu
function autoCity() {
  const N = W.N, c = N >> 1, r = 13;
  const ok = (x, y) => inb(x, y) && ownedAt(x, y) && W.h[idx(x, y)] > 0;
  for (let k = -r; k <= r; k += 4) for (let t = -r; t <= r; t++) {
    for (const [x, y] of [[c + t, c + k], [c + k, c + t]]) if (ok(x, y)) { W.road[idx(x, y)] = Math.abs(k) <= 1 ? 2 : 1; W.tree[idx(x, y)] = 0; }
  }
  recomputeRoads();
  const put = (k, x, y) => { const d = BLD[k]; if (!footprintOK(x, y, d.w, d.h) && !needsOK(d, x, y)) addBuilding({ k, x, y, w: d.w, h: d.h, prog: 0, days: 1, occ: 0, hap: 80 }); };
  put('prefeitura', c + 1, c + 1); put('parque', c - 3, c + 1); put('escola', c + 1, c - 3); put('igreja', c - 3, c - 3);
  put('hospital', c + 5, c + 1); put('praca', c + 1, c + 5); put('termo', c + 9, c - 11); put('bombeiros', c - 7, c + 5);
  for (let y = c - r; y <= c + r; y++) for (let x = c - r; x <= c + r; x++) {
    const i = idx(x, y);
    if (!ok(x, y) || W.road[i] || W.bld[i] >= 0) continue;
    const d = Math.max(Math.abs(x - c), Math.abs(y - c));
    let t = d < 5 ? 'C' : (x > c + 6 && y < c - 4) ? 'I' : 'R';
    let den = t === 'I' ? 1 : d < 5 ? (chance(0.5) ? 3 : 2) : d < 9 ? (chance(0.4) ? 2 : 1) : 1;
    if (t === 'R' && d < 7 && chance(0.25)) den = 3;
    let w = den === 3 ? 2 : 1;
    if (w === 2 && !blockFreeAny(x, y)) { w = 1; den = 2; }
    if (roadAccess(x, y, w, w) < 0) continue;
    const b = addBuilding({ k: t, den, lv: chance(0.4) ? 3 : chance(0.5) ? 2 : 1, v: ri(0, 5), x, y, w, h: w, prog: 0, days: 1, occ: 0, hap: 75, wealth: 1 });
    b.cap = capOf(b); b.occ = Math.round(b.cap * 0.8);
    W.zone[i] = ZONE_ID[t + (t === 'I' ? 1 : den)];
  }
  recomputeAll();
  for (const b of W.blds) if (b && isGrow(b)) { b.occ = Math.round(b.cap * 0.8); b.alert = null; b.aband = false; b.pw = true; b.wt = true; }
  G.pop = 5000; G.approval = 70;
}
function blockFreeAny(x, y) {
  for (let yy = y; yy < y + 2; yy++) for (let xx = x; xx < x + 2; xx++) {
    if (!inb(xx, yy) || W.road[idx(xx, yy)] || W.bld[idx(xx, yy)] >= 0 || !ownedAt(xx, yy) || W.h[idx(xx, yy)] !== W.h[idx(x, y)]) return false;
  }
  return true;
}

function onMonth() {
  if (!UI.inMenu && !$('#tray').classList.contains('hidden') && !UI.drag) selectCatKeep();
}
function selectCatKeep() {
  const on = document.querySelector('#tray .item.on');
  const mini = $('#tray').classList.contains('mini');
  const idxOn = on ? [...on.parentElement.children].indexOf(on) : -1;
  const tool = UI.tool;
  selectCat(UI.cat);
  if (idxOn >= 0) { const it = $('#tray').children[idxOn]; if (it) it.classList.add('on'); UI.tool = tool; if (mini) $('#tray').classList.add('mini'); }
}

let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (G && W) {
    if (UI.inMenu) {
      G.tod = (now / 1000 / 70 + 0.35) % 1;
      R.cam.x += dt * 6;
      if (R.cam.x > W.N * 6) R.cam.x = -W.N * 6;
    } else simUpdate(dt);
    const sp = UI.inMenu ? 1 : SPEEDS[G.speed];
    if (sp > 0) { if (R.view) spawnAgents(dt, R.view); updateAgents(dt * Math.min(2, sp)); }
    render(dt);
    audioTick();
    hudTick(dt);
  }
  requestAnimationFrame(frame);
}

function boot() {
  initRender();
  buildHUD();
  initInput();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (G && !UI.inMenu) saveGame(true); if (A.ctx) A.ctx.suspend(); }
    else if (A.ctx && A.started) A.ctx.resume();
  });
  addEventListener('pointerdown', () => audioStart(), { once: true });
  setupDemo();
  showMainMenu();
  $('#loading').remove();
  requestAnimationFrame(frame);
}
addEventListener('load', boot);
