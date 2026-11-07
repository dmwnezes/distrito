'use strict';
// Salvamento no próprio aparelho (localStorage), com várias cidades.

const SAVE_PREFIX = 'distrito:s:';
const BF = ['k', 'x', 'y', 'w', 'h', 'lv', 'den', 'v', 'prog', 'days', 'occ', 'hap', 'wealth', 'bad', 'aband', 'fire', 'gb'];

function listSlots() {
  try { return JSON.parse(localStorage.getItem('distrito:slots') || '[]'); } catch (e) { return []; }
}
function writeSlots(s) { localStorage.setItem('distrito:slots', JSON.stringify(s)); }

function serialize() {
  const w = {
    N: W.N, seed: W.seed, highwaySide: W.highwaySide,
    h: b64(new Uint8Array(W.h.buffer)), tree: b64(W.tree), zone: b64(W.zone), road: b64(W.road), rub: b64(W.rub),
    owned: b64(W.owned), plotNames: W.plotNames,
    blds: W.blds.map(b => b ? BF.map(f => f === 'aband' ? (b.aband ? 1 : 0) : (b[f] ?? 0)) : null),
  };
  return JSON.stringify({ v: 1, G, W: w });
}

function deserialize(str) {
  const o = JSON.parse(str);
  const w = o.W;
  allocWorld(w.N, w.seed);
  W.h.set(new Int8Array(unb64(w.h, Uint8Array).buffer));
  W.tree.set(unb64(w.tree, Uint8Array)); W.zone.set(unb64(w.zone, Uint8Array)); W.road.set(unb64(w.road, Uint8Array));
  W.rub.set(unb64(w.rub, Uint8Array)); W.owned.set(unb64(w.owned, Uint8Array));
  W.plotNames = w.plotNames; W.highwaySide = w.highwaySide;
  recalcTT(0, 0, W.N - 1, W.N - 1);
  w.blds.forEach((arr, id) => {
    if (!arr) { W.blds[id] = null; W.free.push(id); return; }
    const b = {};
    BF.forEach((f, k) => b[f] = arr[k]);
    b.aband = !!b.aband;
    if (b.k === 'R' || b.k === 'C' || b.k === 'I') b.cap = CAP[b.k][b.den][b.lv - 1];
    b.id = id;
    W.blds[id] = b;
    for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) W.bld[idx(xx, yy)] = id;
  });
  G = Object.assign(freshState({ N: w.N, seed: w.seed }), o.G);
  G.settings = Object.assign(freshState({}).settings, o.G.settings);
  RNG = mulberry32((G.seed + G.day * 31) | 0);
  initMaps();
  recomputeAll();
}

function saveGame(silent) {
  if (!G || !W) return;
  try {
    localStorage.setItem(SAVE_PREFIX + G.id, serialize());
    const slots = listSlots().filter(s => s.id !== G.id);
    slots.unshift({ id: G.id, name: G.name, pop: G.pop, money: Math.round(G.money), mode: G.mode, day: G.day, ts: Date.now(), scenario: G.scenario, over: G.over });
    writeSlots(slots);
    if (!silent) toast('Cidade salva', 'ok');
  } catch (e) {
    toast('Não foi possível salvar: memória do aparelho cheia. Apague uma cidade antiga.', 'bad');
  }
}
function autosave() { saveGame(true); }

function loadGame(id) {
  const s = localStorage.getItem(SAVE_PREFIX + id);
  if (!s) return false;
  deserialize(s);
  return true;
}
function deleteGame(id) {
  localStorage.removeItem(SAVE_PREFIX + id);
  writeSlots(listSlots().filter(s => s.id !== id));
}
