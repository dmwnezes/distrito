'use strict';
// Interface: menu inicial, barra superior, ferramentas, painéis, cartões e entrada por toque/mouse.

const ICONS = {
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  road: '<path d="M8 3 5 21M16 3l3 18M12 4v3M12 10v3M12 16v3"/>',
  zone: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  bolt: '<path d="M13 2 4 14h7l-1 8 9-12h-7z"/>',
  drop: '<path d="M12 2.7S5 10 5 14.5A7 7 0 0 0 19 14.5C19 10 12 2.7 12 2.7z"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  shield: '<path d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5z"/>',
  book: '<path d="M4 4h6a2 2 0 0 1 2 2v14a2 2 0 0 0-2-2H4zM20 4h-6a2 2 0 0 0-2 2v14a2 2 0 0 1 2-2h6z"/>',
  tree: '<path d="M12 2 6 11h3l-4 6h14l-4-6h3zM12 17v5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M7 21v-3M17 21v-3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  factory: '<path d="M3 21V10l6 4V10l6 4V4h3l1 17z"/>',
  star: '<path d="m12 2 3 6.5 7 .8-5.2 4.8 1.4 7L12 17.6 5.8 21.1l1.4-7L2 9.3l7-.8z"/>',
  mountain: '<path d="m2 20 7-12 4 6 3-4 6 10z"/>',
  bulldozer: '<path d="M3 17h12v-5l-3-4H6l-3 4zM15 12h4l2 5M2 20h14"/><circle cx="6" cy="17" r="2"/><circle cx="12" cy="17" r="2"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18M16 15h2"/>',
  gavel: '<path d="m14 4 6 6M11 7l6 6M8.5 9.5 3 15l3 3 5.5-5.5M12 21h9"/>',
  chat: '<path d="M4 4h16v12H8l-4 4z"/>',
  people: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><circle cx="17" cy="7" r="2.5"/><path d="M16 14c3 0 6 1.5 6 5"/>',
  bulb: '<path d="M9 18h6M10 22h4M12 2a6 6 0 0 0-4 10.5c1 1 1.5 2 1.5 3.5h5c0-1.5.5-2.5 1.5-3.5A6 6 0 0 0 12 2z"/>',
  flag: '<path d="M5 22V3M5 4h12l-2 4 2 4H5"/>',
  trophy: '<path d="M7 4h10v5a5 5 0 0 1-10 0zM7 6H3c0 3 2 5 4 5M17 6h4c0 3-2 5-4 5M12 14v4M8 21h8"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3z M9 3v15M15 6v15"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5zM3 13l9 5 9-5"/>',
  camera: '<path d="M4 7h4l2-3h4l2 3h4v13H4z"/><circle cx="12" cy="13" r="4"/>',
  more: '<circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4v16l13-8z"/>', pause: '<path d="M7 4v16M17 4v16"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  cloud: '<path d="M7 18a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 10 4 4 0 0 1 18 18z"/>',
  rain: '<path d="M7 15a5 5 0 1 1 1-9.9A6 6 0 0 1 19.5 7 4 4 0 0 1 18 15zM8 18l-1 3M12 18l-1 3M16 18l-1 3"/>',
  coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5c0-1 1-1.8 2.5-1.8s2.5.8 2.5 1.8-1 1.6-2.5 2S9.5 13 9.5 14s1 2 2.5 2 2.5-.8 2.5-1.8"/>',
  person: '<circle cx="12" cy="7" r="4"/><path d="M4 21c0-4.5 3.5-7 8-7s8 2.5 8 7"/>',
  heart: '<path d="M12 21s-8-5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 6-8 11-8 11z"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
  save: '<path d="M5 3h11l4 4v14H4V3zM8 3v5h8M8 21v-7h8v7"/>',
  home: '<path d="M3 11 12 3l9 8M5 9.5V21h14V9.5"/>',
  lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
};
const ico = (k, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ''}</svg>`;

function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'html') e.innerHTML = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (k === 'cls') e.className = attrs[k];
    else e.setAttribute(k, attrs[k]);
  }
  for (const c of kids.flat()) if (c != null) e.append(c.nodeType ? c : document.createTextNode(c));
  return e;
}

const UI = { tool: { type: 'ver' }, cat: 'ver', modalStack: [], inMenu: true, hudT: 0, drag: null, pointers: new Map() };

/* ---------- Toasts ---------- */
function toast(msg, kind = '') {
  const t = el('div', { cls: 'toast ' + kind }, msg);
  $('#toasts').append(t);
  setTimeout(() => t.classList.add('out'), 3200);
  setTimeout(() => t.remove(), 3700);
  while ($('#toasts').children.length > 4) $('#toasts').firstChild.remove();
}

/* ---------- Modais ---------- */
function openModal(title, body, opts = {}) {
  const m = el('div', { cls: 'modal' + (opts.wide ? ' wide' : '') + (opts.cls ? ' ' + opts.cls : '') });
  const head = el('div', { cls: 'mhead' }, el('h2', {}, title));
  if (!opts.noClose) head.append(el('button', { cls: 'iconbtn', 'aria-label': 'Fechar', onclick: () => closeModal(m) , html: ico('close') }));
  m.append(head, el('div', { cls: 'mbody' }, body));
  const back = el('div', { cls: 'backdrop', onclick: (e) => { if (e.target === back && !opts.noClose) closeModal(m); } }, m);
  $('#modals').append(back);
  UI.modalStack.push(m);
  if (opts.onClose) m._onClose = opts.onClose;
  sfx('click');
  return m;
}
function closeModal(m) {
  m = m || UI.modalStack[UI.modalStack.length - 1];
  if (!m) return false;
  UI.modalStack = UI.modalStack.filter(x => x !== m);
  if (m._onClose) m._onClose();
  m.parentElement.remove();
  return true;
}
function closeAllModals() { while (UI.modalStack.length) closeModal(); }

// Botão "voltar" do Android
window.voltar = function () {
  if (UI.modalStack.length) { closeModal(); return true; }
  if (R.hidden) { exitPhoto(); return true; }
  if (UI.tool.type !== 'ver') { setTool({ type: 'ver' }); selectCat('ver'); return true; }
  if (!UI.inMenu) { openGameMenu(); return true; }
  return false;
};

/* ---------- Menu inicial ---------- */
function showMainMenu() {
  UI.inMenu = true;
  closeAllModals();
  $('#hud').classList.add('hidden');
  const slots = listSlots();
  const box = $('#menu');
  box.innerHTML = '';
  box.classList.remove('hidden');
  const btns = el('div', { cls: 'menubtns' });
  if (slots.length && !slots[0].over) btns.append(el('button', { cls: 'btn primary big', onclick: () => startLoaded(slots[0].id) }, 'Continuar ', el('small', {}, slots[0].name)));
  btns.append(el('button', { cls: 'btn big' + (slots.length ? '' : ' primary'), onclick: openNewCity }, 'Nova cidade'));
  btns.append(el('button', { cls: 'btn big', onclick: openCampaign }, 'Campanha'));
  const row = el('div', { cls: 'menurow' },
    el('button', { cls: 'btn', onclick: openSlots }, 'Cidades salvas'),
    el('button', { cls: 'btn', onclick: openAchievements }, 'Conquistas'),
  );
  btns.append(row);
  box.append(el('div', { cls: 'menucard' },
    el('div', { cls: 'logo' }, el('span', { cls: 'logo-mark' }), 'Distrito'),
    el('p', { cls: 'tag' }, 'Funde, governe e veja sua cidade ganhar vida.'),
    btns,
  ));
}

function openNewCity() {
  const st = { name: pick(['Nova Esperança', 'Vila Serena', 'Porto Alegria', 'Monte Verde', 'Lagoa Bonita', 'Cajueiro Grande', 'Águas Mansas', 'Brisa Nova']), N: 96, terrain: 'aleatorio', mode: 'desafio', tutorial: !listSlots().length };
  const seg = (key, opts) => {
    const wrap = el('div', { cls: 'seg' });
    for (const [v, label, sub] of opts) {
      const b = el('button', { cls: 'segbtn' + (st[key] === v ? ' on' : ''), onclick: () => { st[key] = v; wrap.querySelectorAll('.segbtn').forEach(x => x.classList.remove('on')); b.classList.add('on'); } }, label, sub ? el('small', {}, sub) : null);
      wrap.append(b);
    }
    return wrap;
  };
  const name = el('input', { cls: 'inp', value: st.name, maxlength: 24 });
  const tut = el('input', { type: 'checkbox' }); tut.checked = st.tutorial;
  const body = el('div', { cls: 'form' },
    el('label', {}, 'Nome da cidade'), name,
    el('label', {}, 'Tamanho do mapa'), seg('N', [[64, 'Pequeno'], [96, 'Médio'], [128, 'Grande']]),
    el('label', {}, 'Terreno'), seg('terrain', [['aleatorio', 'Surpresa'], ['rio', 'Rio'], ['costa', 'Litoral'], ['lagos', 'Lagos'], ['serra', 'Serra'], ['seco', 'Sertão']]),
    el('label', {}, 'Modo'), seg('mode', [['desafio', 'Desafio', 'pode falir e perder eleição'], ['tranquilo', 'Tranquilo', 'sem derrota'], ['criativo', 'Criativo', 'dinheiro infinito, tudo liberado']]),
    el('label', { cls: 'chk' }, tut, ' Mostrar tutorial'),
    el('button', { cls: 'btn primary big', onclick: () => {
      closeAllModals();
      startNew({ name: name.value.trim() || 'Distrito', N: st.N, terrain: st.terrain === 'aleatorio' ? null : st.terrain, mode: st.mode, tutorial: tut.checked });
    } }, 'Fundar a cidade'),
  );
  openModal('Nova cidade', body);
}

function openCampaign() {
  const won = (() => { try { return JSON.parse(localStorage.getItem('distrito:campanha') || '{}'); } catch (e) { return {}; } })();
  const list = el('div', { cls: 'list' });
  SCENARIOS.forEach((sc, k) => {
    const prevOk = k === 0 || won[SCENARIOS[k - 1].id];
    list.append(el('div', { cls: 'card scen' + (prevOk ? '' : ' locked') },
      el('div', { cls: 'scen-n' }, won[sc.id] ? ico('check') : String(k + 1)),
      el('div', { cls: 'grow' }, el('b', {}, sc.name), el('p', {}, sc.desc), el('p', { cls: 'muted' }, sc.goals.map(g => g.txt).join(' · ') + ` · prazo: ${sc.anos} anos`)),
      prevOk ? el('button', { cls: 'btn primary', onclick: () => { closeAllModals(); startNew({ name: sc.name, N: sc.size, terrain: sc.terrain, mode: 'desafio', money: sc.money, scenario: sc.id, seca: sc.seca, tutorial: k === 0 && !listSlots().length, seed: 1000 + k * 77 }); } }, 'Jogar') : el('span', { cls: 'muted', html: ico('lock') }),
    ));
  });
  openModal('Campanha', list, { wide: true });
}

function openSlots() {
  const list = el('div', { cls: 'list' });
  const slots = listSlots();
  if (!slots.length) list.append(el('p', { cls: 'muted' }, 'Nenhuma cidade salva ainda.'));
  for (const s of slots) {
    const d = new Date(s.ts);
    list.append(el('div', { cls: 'card row' },
      el('div', { cls: 'grow' }, el('b', {}, s.name), el('p', { cls: 'muted' }, `${fmt(s.pop)} hab · ${moneyShort(s.money)} · ${{ desafio: 'Desafio', tranquilo: 'Tranquilo', criativo: 'Criativo' }[s.mode]}${s.scenario ? ' · campanha' : ''}${s.over ? ' · encerrada' : ''} · ${d.toLocaleDateString('pt-BR')}`)),
      el('button', { cls: 'btn primary', onclick: () => { closeAllModals(); startLoaded(s.id); } }, 'Abrir'),
      el('button', { cls: 'btn ghost', onclick: (e) => { if (e.currentTarget.dataset.ok) { deleteGame(s.id); closeModal(); openSlots(); } else { e.currentTarget.dataset.ok = 1; e.currentTarget.textContent = 'Confirmar'; } } }, 'Apagar'),
    ));
  }
  openModal('Cidades salvas', list, { wide: true });
}

function openAchievements() {
  const got = loadGlobalAch();
  const n = ACHIEVEMENTS.filter(a => got[a.id]).length;
  const grid = el('div', { cls: 'achgrid' });
  for (const a of ACHIEVEMENTS) grid.append(el('div', { cls: 'ach' + (got[a.id] ? ' on' : '') }, el('span', { html: ico(got[a.id] ? 'trophy' : 'lock') }), el('div', {}, el('b', {}, a.name), el('p', {}, a.desc))));
  openModal(`Conquistas · ${n}/${ACHIEVEMENTS.length}`, grid, { wide: true });
}

function startNew(o) {
  newGame(o);
  enterGame();
  saveGame(true);
  if (G.tutorial >= 0) renderTutorial();
}
function startLoaded(id) {
  if (!loadGame(id)) { toast('Não encontrei essa cidade', 'bad'); return; }
  enterGame();
  if (G.over) showGameOver(G.over);
}
function enterGame() {
  UI.inMenu = false;
  $('#menu').classList.add('hidden');
  $('#hud').classList.remove('hidden');
  R.cars = []; R.peds = []; R.parts = [];
  R.overlay = null; R.sel = null; R.preview = null; R.labels = G.settings.labels;
  R.cam.s = clamp(Math.round(3 * R.dpr / 1.5), 2, 6);
  const c = W.N / 2; centerOn(c, c);
  setTool({ type: 'ver' }); selectCat('ver');
  renderTutorial();
  applyVolumes();
  hudTick(1);
}

/* ---------- HUD ---------- */
function buildHUD() {
  const top = $('#top');
  top.innerHTML = '';
  top.append(
    el('button', { cls: 'iconbtn', id: 'bmenu', 'aria-label': 'Menu', onclick: openGameMenu, html: ico('menu') }),
    el('div', { cls: 'city' }, el('b', { id: 'hname' }), el('span', { id: 'hdate' })),
    el('div', { cls: 'stat', id: 'smoney', onclick: () => openPanel('orcamento') }, el('span', { html: ico('coin') }), el('b', { id: 'hmoney' }), el('small', { id: 'hdelta' })),
    el('div', { cls: 'stat', onclick: () => openPanel('cidade') }, el('span', { html: ico('person') }), el('b', { id: 'hpop' })),
    el('div', { cls: 'stat', onclick: () => openPanel('conselho') }, el('span', { html: ico('heart') }), el('b', { id: 'happ' })),
    el('div', { cls: 'rci', onclick: () => openPanel('cidade'), title: 'Demanda' }, ...['R', 'C', 'I'].map(k => el('div', { cls: 'bar b' + k }, el('i', { id: 'd' + k }), el('span', {}, k)))),
    el('div', { cls: 'wx', id: 'hwx' }),
    el('div', { cls: 'speeds' }, ...[0, 1, 2, 3].map(s => el('button', { cls: 'spd', 'data-s': s, onclick: () => { G.speed = s; audioStart(); hudTick(1); }, html: s === 0 ? ico('pause') : `${ico('play')}<small>${['', '1×', '2×', '4×'][s]}</small>` }))),
  );
  const side = $('#side');
  side.innerHTML = '';
  const sideBtns = [['cidade', 'chart', 'Cidade'], ['orcamento', 'wallet', 'Orçamento'], ['leis', 'gavel', 'Leis'], ['mural', 'chat', 'Mural'], ['missoes', 'flag', 'Missões'], ['mapas', 'layers', 'Mapas'], ['mais', 'more', 'Mais']];
  for (const [id, ic, label] of sideBtns) side.append(el('button', { cls: 'sidebtn', 'data-p': id, title: label, onclick: () => openPanel(id), html: ico(ic) + `<span>${label}</span>` }));
  const cats = $('#cats');
  cats.innerHTML = '';
  for (const c of CATS) cats.append(el('button', { cls: 'cat', 'data-c': c.id, onclick: () => selectCat(c.id), html: ico(c.icon) + `<span>${c.name}</span>` }));
}

function hudTick(dt) {
  UI.hudT -= dt;
  if (UI.hudT > 0 || !G || UI.inMenu) return;
  UI.hudT = 0.25;
  $('#hname').textContent = G.name;
  $('#hdate').textContent = `${(G.day % 30) + 1} ${MESES[G.month]} ${G.year} · ${LEVELS[G.level].name}`;
  $('#hmoney').textContent = G.mode === 'criativo' ? '∞' : moneyShort(G.money);
  $('#smoney').classList.toggle('neg', G.money < 0);
  const r = G.report || { income: 0, expense: 0 };
  const dlt = r.income - r.expense;
  $('#hdelta').textContent = G.mode === 'criativo' || !G.report ? '' : (dlt >= 0 ? '+' : '−') + moneyShort(Math.abs(dlt)).replace('R$ ', '') + '/mês';
  $('#hdelta').className = dlt >= 0 ? 'pos' : 'neg';
  $('#hpop').textContent = fmt(G.pop);
  $('#happ').textContent = pct(G.approval);
  for (const k of ['R', 'C', 'I']) {
    const v = G.demand[k], bar = $('#d' + k);
    bar.style.height = Math.abs(v) / 2 + '%';
    bar.style.bottom = v >= 0 ? '50%' : (50 - Math.abs(v) / 2) + '%';
    bar.classList.toggle('neg', v < 0);
  }
  const w = G.settings.weather ? G.weather : 'sol';
  const wi = R.na > 0.5 && (w === 'sol') ? 'moon' : w === 'sol' ? 'sun' : w === 'nublado' ? 'cloud' : 'rain';
  $('#hwx').innerHTML = ico(wi);
  $('#hwx').title = { sol: 'Sol', nublado: 'Nublado', chuva: 'Chuva', tempestade: 'Tempestade' }[w];
  $$('.spd').forEach(b => b.classList.toggle('on', +b.dataset.s === G.speed));
  if (UI.infoB && W.blds[UI.infoB.id] === UI.infoB) renderInfo();
}

/* ---------- Ferramentas ---------- */
function selectCat(id) {
  UI.cat = id;
  $$('.cat').forEach(b => b.classList.toggle('on', b.dataset.c === id));
  const tray = $('#tray');
  tray.innerHTML = '';
  tray.classList.remove('mini');
  if (id === 'ver') { setTool({ type: 'ver' }); tray.classList.add('hidden'); return; }
  if (id === 'demolir') { setTool({ type: 'demolir' }); tray.classList.add('hidden'); hint('Arraste para demolir uma área. Toque para demolir um só.'); return; }
  tray.classList.remove('hidden');
  const items = [];
  if (id === 'estradas') {
    items.push({ name: 'Rua', price: ROADS.rua.cost, tool: { type: 'road', road: 1 }, sprite: roadSprite(1, 3, false), ok: true });
    items.push({ name: 'Avenida', price: ROADS.avenida.cost, tool: { type: 'road', road: 2 }, sprite: roadSprite(2, 3, false), ok: G.mode === 'criativo' || G.level >= 2, lock: 'Nível: ' + LEVELS[2].name });
  } else if (id === 'zonas') {
    for (const k of ZONE_KEYS) {
      const z = ZONES[k];
      items.push({ name: z.name, price: 5, tool: { type: 'zone', zid: ZONE_ID[k] }, color: z.color, ok: G.mode === 'criativo' || G.level >= z.lvl, lock: 'Nível: ' + LEVELS[z.lvl].name, sprite: growSprite(z.t, z.den, 1, 0) });
    }
    items.push({ name: 'Remover zona', price: 0, tool: { type: 'zone', zid: 0 }, ok: true, color: '#555' });
  } else if (id === 'terreno') {
    for (const t of TERRAIN_TOOLS) items.push({ name: t.name, price: t.id === 'lote' ? plotPrice() : t.cost, tool: { type: t.id === 'lote' ? 'lote' : t.id === 'arvore' ? 'arvore' : 'terra', op: t.id }, ok: true, icon: { elevar: 'plus', rebaixar: 'mountain', nivelar: 'map', arvore: 'tree', lote: 'map' }[t.id], desc: t.desc });
  } else {
    for (const k in BLD) {
      const d = BLD[k];
      if (d.cat !== id) continue;
      const ok = unlocked(d);
      items.push({ name: d.name, price: d.cost, tool: { type: 'bld', key: k }, ok, lock: d.tech && !G.techs[d.tech] ? 'Pesquisa: ' + TECH_BY_ID[d.tech].name : 'Nível: ' + LEVELS[d.lvl].name, sprite: bldSprite(k), desc: d.desc, built: d.unique && W.blds.some(b => b && b.k === k) });
    }
  }
  for (const it of items) {
    const card = el('button', { cls: 'item' + (it.ok && !it.built ? '' : ' locked') });
    const pv = el('canvas', { width: 64, height: 52, cls: 'pv' });
    const cx = pv.getContext('2d'); cx.imageSmoothingEnabled = false;
    if (it.sprite) {
      const sp = it.sprite, sc = Math.max(1, Math.min(2, Math.floor(Math.min(60 / sp.w, 50 / sp.h)))) || 1;
      const scale = Math.min(60 / sp.w, 50 / sp.h, sc);
      cx.drawImage(sp.c, (64 - sp.w * scale) / 2, (52 - sp.h * scale) / 2, sp.w * scale, sp.h * scale);
    } else if (it.icon) {
      pv.replaceWith(el('div', { cls: 'pvi', html: ico(it.icon) }));
    }
    if (it.color && !it.sprite) { cx.fillStyle = it.color; cx.beginPath(); cx.moveTo(32, 10); cx.lineTo(56, 26); cx.lineTo(32, 42); cx.lineTo(8, 26); cx.fill(); }
    card.append(card.querySelector('.pvi') || (it.sprite || it.color ? pv : el('div', { cls: 'pvi', html: ico(it.icon || 'star') })));
    card.append(el('b', {}, it.name));
    card.append(el('small', {}, !it.ok ? it.lock : it.built ? 'Já construído' : it.price ? moneyShort(it.price * (G.events.inflacao > 0 ? 1.15 : 1)) : 'Grátis'));
    if (!it.ok) card.append(el('span', { cls: 'lockic', html: ico('lock') }));
    card.onclick = () => {
      if (!it.ok) { toast('Bloqueado — ' + it.lock, 'bad'); sfx('error'); return; }
      if (it.built) { toast('Você já tem um desses', 'bad'); return; }
      // bandeja recolhe para liberar o mapa; tocar no item escolhido abre de novo
      if (tray.classList.contains('mini') && card.classList.contains('on')) { tray.classList.remove('mini'); return; }
      $$('#tray .item').forEach(x => x.classList.remove('on')); card.classList.add('on');
      tray.classList.add('mini');
      setTool(it.tool);
      const tips = { road: 'Arraste a partir de uma rua para desenhar.', zone: it.tool.zid ? 'Arraste para pintar a zona. Ela precisa encostar numa rua.' : 'Arraste para remover zonas.', bld: (it.desc ? it.desc + ' ' : '') + 'Toque no mapa para posicionar e toque de novo para construir.', terra: it.desc, arvore: it.desc + ' Arraste para plantar.', lote: it.desc };
      hint(tips[it.tool.type] || '');
    };
    tray.append(card);
  }
  hint('');
}

function setTool(t) {
  UI.tool = t;
  R.preview = null; UI.ghost = null;
  if (t.type !== 'ver') { R.sel = null; hideInfo(); }
  if (t.type === 'zone' || t.type === 'road' || t.type === 'bld' || t.type === 'demolir') { if (!R.overlay && t.type === 'bld' && BLD[t.key].cov === 'power') setOverlayTemp('energia'); else if (!R.overlay && t.type === 'bld' && BLD[t.key].cov === 'water') setOverlayTemp('agua'); else if (UI.tempOverlay) { R.overlay = null; UI.tempOverlay = false; } }
  else if (UI.tempOverlay) { R.overlay = null; UI.tempOverlay = false; }
}
function setOverlayTemp(k) { R.overlay = k; UI.tempOverlay = true; }

function hint(t) {
  const h = $('#hint');
  h.textContent = t || '';
  h.classList.toggle('hidden', !t);
}

/* ---------- Entrada ---------- */
function initInput() {
  const cv = R.cv;
  cv.addEventListener('contextmenu', e => e.preventDefault());
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  cv.addEventListener('pointerup', onUp);
  cv.addEventListener('pointercancel', onUp);
  cv.addEventListener('wheel', e => {
    e.preventDefault();
    zoomAt(e.clientX * R.dpr, e.clientY * R.dpr, e.deltaY < 0 ? 1 : -1);
  }, { passive: false });
  addEventListener('keydown', e => {
    if (UI.inMenu || e.target.tagName === 'INPUT') return;
    if (e.key === ' ') { G.speed = G.speed ? 0 : 1; hudTick(1); }
    if (e.key === 'Escape') window.voltar();
    const k = { ArrowLeft: [-40, 0], ArrowRight: [40, 0], ArrowUp: [0, -40], ArrowDown: [0, 40] }[e.key];
    if (k) { R.cam.x += k[0] / R.cam.s * R.dpr; R.cam.y += k[1] / R.cam.s * R.dpr; clampCam(); }
  });
}

function zoomAt(sx, sy, dir) {
  const i = ZOOMS.indexOf(R.cam.s);
  const ni = clamp((i < 0 ? 2 : i) + dir, 0, ZOOMS.length - 1);
  setZoom(ZOOMS[ni], sx, sy);
}
function setZoom(s, sx, sy) {
  const wx = (sx - R.W / 2) / R.cam.s + R.cam.x, wy = (sy - R.H / 2) / R.cam.s + R.cam.y;
  R.cam.s = s;
  R.cam.x = wx - (sx - R.W / 2) / s; R.cam.y = wy - (sy - R.H / 2) / s;
  clampCam();
}

function onDown(e) {
  audioStart();
  R.cv.setPointerCapture(e.pointerId);
  UI.pointers.set(e.pointerId, { x: e.clientX * R.dpr, y: e.clientY * R.dpr });
  if (UI.pointers.size === 2) { // pinça: cancela o arrasto da ferramenta
    const [a, b] = [...UI.pointers.values()];
    UI.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), s: R.cam.s, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    UI.drag = null; R.preview = UI.ghost ? R.preview : null;
    return;
  }
  if (UI.pointers.size > 2) return;
  const sx = e.clientX * R.dpr, sy = e.clientY * R.dpr;
  const pan = e.button === 1 || e.button === 2 || UI.tool.type === 'ver' || UI.inMenu;
  const t = screenToTile(sx, sy);
  UI.drag = { sx, sy, lx: sx, ly: sy, pan, moved: false, start: t, last: t, visited: new Set(), h0: inb(t.x, t.y) ? W.h[idx(t.x, t.y)] : 0 };
  if (!pan) toolPreview(t, t);
}

function onMove(e) {
  const p = UI.pointers.get(e.pointerId);
  const sx = e.clientX * R.dpr, sy = e.clientY * R.dpr;
  if (p) { p.x = sx; p.y = sy; }
  if (UI.pinch && UI.pointers.size === 2) {
    const [a, b] = [...UI.pointers.values()];
    const d = Math.hypot(a.x - b.x, a.y - b.y), mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
    R.cam.x -= (mx - UI.pinch.mx) / R.cam.s; R.cam.y -= (my - UI.pinch.my) / R.cam.s;
    UI.pinch.mx = mx; UI.pinch.my = my;
    const target = UI.pinch.s * d / UI.pinch.d;
    let best = ZOOMS[0];
    for (const z of ZOOMS) if (Math.abs(Math.log(z / target)) < Math.abs(Math.log(best / target))) best = z;
    if (best !== R.cam.s) setZoom(best, mx, my);
    clampCam();
    return;
  }
  const dr = UI.drag;
  if (!dr) {
    if (e.pointerType === 'mouse' && UI.tool.type !== 'ver' && !UI.inMenu) { const t = screenToTile(sx, sy); if (UI.tool.type === 'bld' || UI.tool.type === 'lote') toolPreview(t, t); }
    return;
  }
  if (Math.hypot(sx - dr.sx, sy - dr.sy) > 8 * R.dpr) dr.moved = true;
  if (dr.pan) {
    R.cam.x -= (sx - dr.lx) / R.cam.s; R.cam.y -= (sy - dr.ly) / R.cam.s;
    dr.lx = sx; dr.ly = sy; clampCam();
    return;
  }
  const t = screenToTile(sx, sy);
  dr.last = t;
  if (UI.tool.type === 'terra' || UI.tool.type === 'arvore') applyBrush(t, dr);
  toolPreview(dr.start, t);
}

function onUp(e) {
  UI.pointers.delete(e.pointerId);
  if (UI.pinch) { if (UI.pointers.size < 2) UI.pinch = null; UI.drag = null; return; }
  const dr = UI.drag;
  UI.drag = null;
  if (!dr) return;
  if (dr.pan) {
    if (!dr.moved && !UI.inMenu) tapView(dr.sx, dr.sy);
    return;
  }
  applyTool(dr);
}

function rectTiles(a, b) {
  const out = [];
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y });
  return out;
}
function lineTiles(a, b) {
  const out = [];
  const dx = b.x - a.x, dy = b.y - a.y;
  const xFirst = Math.abs(dx) >= Math.abs(dy);
  let x = a.x, y = a.y;
  out.push({ x, y });
  if (xFirst) { while (x !== b.x) { x += Math.sign(dx); out.push({ x, y }); } while (y !== b.y) { y += Math.sign(dy); out.push({ x, y }); } }
  else { while (y !== b.y) { y += Math.sign(dy); out.push({ x, y }); } while (x !== b.x) { x += Math.sign(dx); out.push({ x, y }); } }
  return out;
}

function toolPreview(a, b) {
  const t = UI.tool;
  if (t.type === 'road') {
    const tiles = lineTiles(a, b).map(p => ({ ...p, ok: canRoad(p.x, p.y, t.road) }));
    const cost = tiles.filter(p => p.ok).reduce((s, p) => s + roadCost(idx(p.x, p.y), t.road), 0);
    R.preview = { kind: 'road', tiles };
    hint(`${tiles.filter(p => p.ok).length} trechos · ${money(cost)}`);
  } else if (t.type === 'zone' || t.type === 'demolir') {
    const tiles = rectTiles(a, b).map(p => {
      const ok = inb(p.x, p.y) && ownedAt(p.x, p.y) && (t.type === 'demolir' || (W.h[idx(p.x, p.y)] > 0 && !W.road[idx(p.x, p.y)] && W.bld[idx(p.x, p.y)] < 0));
      return { ...p, ok };
    });
    R.preview = { kind: t.type, tiles };
  } else if (t.type === 'bld') {
    const d = BLD[t.key];
    const x = b.x - Math.floor((d.w - 1) / 2), y = b.y - Math.floor((d.h - 1) / 2);
    const err = footprintOK(x, y, d.w, d.h) || needsOK(d, x, y);
    const tiles = [];
    for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) tiles.push({ x: xx, y: yy, ok: !err });
    tiles.sort((p, q) => (p.x === x && p.y === y) ? -1 : (q.x === x && q.y === y) ? 1 : 0);
    R.preview = { kind: 'bld', def: d, tiles, sprite: bldSprite(t.key), err, x, y };
    hint(err ? err : `${d.name} · ${money(d.cost)} · toque de novo para construir`);
  } else if (t.type === 'lote') {
    if (!inb(b.x, b.y)) return;
    const px = b.x >> 4, py = b.y >> 4;
    const ok = plotBuyable(px, py);
    const tiles = [];
    for (let yy = py * PS; yy < py * PS + PS; yy++) for (let xx = px * PS; xx < px * PS + PS; xx++) if ((xx % 2 === 0 && yy % 2 === 0) || xx === px * PS || yy === py * PS) tiles.push({ x: xx, y: yy, ok });
    R.preview = { kind: 'lote', tiles };
    hint(ok ? `Comprar esta área por ${money(plotPrice())}? Toque de novo para confirmar.` : (W.owned[py * W.PN + px] ? 'Esta área já é sua' : 'Só dá para comprar áreas vizinhas às suas'));
  } else if (t.type === 'terra' || t.type === 'arvore') {
    R.preview = { kind: 'terra', tiles: [{ x: b.x, y: b.y, ok: inb(b.x, b.y) && ownedAt(b.x, b.y) }] };
  }
}

function applyBrush(t, dr) {
  if (!inb(t.x, t.y)) return;
  const k = idx(t.x, t.y);
  if (dr.visited.has(k)) return;
  dr.visited.add(k);
  if (UI.tool.type === 'arvore') { if (plantTree(t.x, t.y)) sfx('zone'); return; }
  const err = doTerraform(t.x, t.y, UI.tool.op, dr.h0);
  if (err) { if (dr.visited.size === 1) { toast(err, 'bad'); sfx('error'); } }
  else sfx('road');
}

function applyTool(dr) {
  const t = UI.tool, a = dr.start, b = dr.last;
  if (t.type === 'road') {
    const n = placeRoads(lineTiles(a, b), t.road);
    if (n) sfx('road'); else if (dr.moved) sfx('error');
    R.preview = null; hint('');
  } else if (t.type === 'zone') {
    const n = zoneTiles(rectTiles(a, b), t.zid);
    if (n) sfx('zone');
    R.preview = null;
  } else if (t.type === 'demolir') {
    const n = bulldoze(rectTiles(a, b));
    if (n) { sfx('demolish'); R.sel = null; hideInfo(); }
    R.preview = null;
  } else if (t.type === 'bld') {
    const p = R.preview;
    if (!p) return;
    // primeiro toque posiciona; segundo toque no mesmo lugar constrói
    const same = UI.ghost && UI.ghost.x === p.x && UI.ghost.y === p.y;
    if (!same && !dr.moved) { UI.ghost = { x: p.x, y: p.y }; return; }
    if (!same && dr.moved) { UI.ghost = { x: p.x, y: p.y }; return; }
    const err = placeBuilding(t.key, p.x, p.y);
    if (err) { toast(err, 'bad'); sfx('error'); }
    else { sfx('place'); UI.ghost = null; R.preview = null; hint(''); if (BLD[t.key].unique) selectCat(UI.cat); }
  } else if (t.type === 'lote') {
    const px = b.x >> 4, py = b.y >> 4;
    if (UI.ghost && UI.ghost.px === px && UI.ghost.py === py) {
      const err = buyPlot(px, py);
      if (err) { toast(err, 'bad'); sfx('error'); } else { sfx('coin'); toast(`Área comprada: ${W.plotNames[py * W.PN + px]}`, 'ok'); selectCat('terreno'); }
      UI.ghost = null; R.preview = null; hint('');
    } else UI.ghost = { px, py };
  } else if (t.type === 'terra' || t.type === 'arvore') {
    if (!dr.moved) applyBrush(b, dr);
    R.preview = null;
  }
  checkTutorial();
}

function tapView(sx, sy) {
  // pedestre?
  for (const p of R.peds) {
    const [u, v] = moverPos(p, 0.4 * p.side);
    const e = elevAt(idx(p.x, p.y));
    const px = toSX(tileWX(u, v)), py = toSY(tileWY(u, v, e)) - 3 * R.cam.s;
    if (Math.hypot(px - sx, py - sy) < Math.max(14 * R.dpr, 5 * R.cam.s)) {
      const c = citizenNear(p.x, p.y);
      if (c) { openCitizen(c); return; }
    }
  }
  const t = screenToTile(sx, sy);
  if (!inb(t.x, t.y)) { R.sel = null; hideInfo(); return; }
  const i = idx(t.x, t.y);
  if (W.bld[i] >= 0) { const b = W.blds[W.bld[i]]; R.sel = { b }; UI.infoB = b; UI.infoT = null; renderInfo(); sfx('click'); }
  else { R.sel = null; UI.infoB = null; UI.infoT = t; renderInfo(); }
}

/* ---------- Cartão de informações ---------- */
function hideInfo() { $('#info').classList.add('hidden'); UI.infoB = null; UI.infoT = null; }
function bar(v, inv) { const c = inv ? (v > 0.66 ? 'bad' : v > 0.33 ? 'mid' : 'good') : (v > 0.66 ? 'good' : v > 0.33 ? 'mid' : 'bad'); return el('div', { cls: 'pbar ' + c }, el('i', { style: `width:${Math.round(clamp(v, 0, 1) * 100)}%` })); }
function kv(k, v, extra) { return el('div', { cls: 'kv' }, el('span', {}, k), el('b', {}, v), extra || null); }

function renderInfo() {
  const box = $('#info');
  box.innerHTML = '';
  box.classList.remove('hidden');
  const close = el('button', { cls: 'iconbtn sm', onclick: () => { R.sel = null; hideInfo(); }, html: ico('close') });
  const b = UI.infoB;
  if (b) {
    const i = idx(b.x, b.y);
    const grow = isGrow(b);
    const title = grow ? ({ R: ['Casa', 'Prédio residencial', 'Torre residencial'], C: ['Loja', 'Centro comercial', 'Torre de escritórios'], I: ['Oficina', 'Fábrica'] }[b.k][b.den - 1]) : BLD[b.k].name;
    box.append(el('div', { cls: 'ihead' }, el('div', {}, el('b', {}, title), el('small', {}, `${plotName(b.x, b.y)}${grow ? ' · nível ' + b.lv : ''}`)), close));
    if (b.prog > 0) {
      box.append(kv('Em obras', `${Math.ceil(b.prog)} dias`), bar(1 - b.prog / (b.days || 1)));
      if (b.alert === 'road') box.append(el('p', { cls: 'warn' }, 'Obra parada: precisa de uma rua encostada.'));
    } else if (grow) {
      if (b.k === 'R') {
        box.append(kv('Moradores', `${b.occ} de ${b.cap}`), kv('Renda', ['Baixa', 'Média', 'Alta'][b.wealth]), kv('Felicidade', pct(b.hap)), bar(b.hap / 100));
      } else box.append(kv('Empregados', `${b.occ} de ${b.cap}`), kv('Movimento', pct((b.prosp || 1) * 100)), bar(b.prosp || 1));
      const probs = [];
      if (!b.pw) probs.push('sem energia'); if (!b.wt) probs.push('sem água'); if (b.gb > 50) probs.push('lixo acumulado');
      if (S.air[i] > 45) probs.push('ar poluído'); if (S.crime[i] > 45) probs.push('crime'); if (S.noise[i] > 50) probs.push('barulho');
      if ((b.commute || 0) > 1) probs.push('trânsito no caminho do trabalho'); if (b.noJobs) probs.push('sem acesso a empregos');
      if (b.k === 'R' && S.cov.health[i] < 40) probs.push('longe da saúde'); if (b.k === 'R' && S.cov.edu[i] < 40) probs.push('longe da escola');
      if (b.aband) probs.unshift('abandonado');
      box.append(el('p', { cls: probs.length ? 'warn' : 'okmsg' }, probs.length ? 'Problemas: ' + probs.join(', ') + '.' : 'Tudo certo por aqui.'));
      box.append(kv('Valor do terreno', Math.round(S.lv[i]) + '/100'));
    } else {
      const d = BLD[b.k];
      if (d.cap) box.append(kv({ power: 'Gera energia', water: 'Fornece água', garbage: 'Recolhe lixo', sewage: 'Trata esgoto' }[d.cov] || 'Capacidade', fmt(d.cap)));
      if (d.r) box.append(kv('Alcance', d.r + ' quadras'));
      if (d.jobs) box.append(kv('Empregos', d.jobs));
      if (d.prod) box.append(kv('Produz', Object.entries(d.prod).map(([k, v]) => `${v} de ${k}`).join(', ') + '/mês'));
      if (d.tour) box.append(kv('Atrai turistas', '+' + d.tour));
      box.append(kv('Manutenção', money(d.up) + '/mês'));
      if (!b.pw && d.cov !== 'power' && d.jobs) box.append(el('p', { cls: 'warn' }, 'Sem energia.'));
      if (b.fire) box.append(el('p', { cls: 'warn' }, 'Pegando fogo!'));
    }
    box.append(el('div', { cls: 'irow' },
      el('button', { cls: 'btn ghost sm', onclick: (e) => { if (e.currentTarget.dataset.ok) { bulldoze([{ x: b.x, y: b.y }]); sfx('demolish'); R.sel = null; hideInfo(); } else { e.currentTarget.dataset.ok = 1; e.currentTarget.textContent = 'Confirmar demolição'; } } }, 'Demolir'),
      b.k === 'R' && b.occ > 0 ? el('button', { cls: 'btn sm', onclick: () => { const c = citizenNear(b.x, b.y); if (c) openCitizen(c); } }, 'Conhecer um morador') : null,
    ));
  } else if (UI.infoT) {
    const t = UI.infoT, i = idx(t.x, t.y);
    const tt = W.h[i] <= 0 ? 'Água' : W.road[i] ? ({ 1: 'Rua', 2: 'Avenida', 3: 'Rodovia' }[W.road[i]]) : W.zone[i] ? ZONES[ZONE_KEYS[W.zone[i] - 1]].name : W.tree[i] ? 'Mata' : ({ 1: 'Campo', 2: 'Areia', 3: 'Rocha' }[W.tt[i]] || 'Terreno');
    box.append(el('div', { cls: 'ihead' }, el('div', {}, el('b', {}, tt), el('small', {}, ownedAt(t.x, t.y) ? plotName(t.x, t.y) : 'Área não comprada')), close));
    if (W.road[i]) box.append(kv('Trânsito', pct(Math.min(200, S.traffic[i] / (ROAD_CAP[W.road[i]] * S.capMul) * 100))), bar(S.traffic[i] / (ROAD_CAP[W.road[i]] * S.capMul), true));
    if (W.h[i] > 0) box.append(kv('Altitude', W.h[i]), kv('Valor do terreno', Math.round(S.lv[i]) + '/100'), kv('Poluição', Math.round(S.air[i])), kv('Crime', Math.round(S.crime[i])));
    if (W.zone[i] && W.bld[i] < 0) {
      const why = [];
      if (roadAccess(t.x, t.y, 1, 1) < 0) why.push('falta rua ligada à rodovia');
      if (S.cov.power[i] < 40) why.push('falta energia');
      if (S.cov.water[i] < 40) why.push('falta água');
      const z = ZONES[ZONE_KEYS[W.zone[i] - 1]];
      if (G.demand[z.t] <= 0) why.push('pouca procura');
      box.append(el('p', { cls: why.length ? 'warn' : 'okmsg' }, why.length ? 'Não cresce porque: ' + why.join(', ') + '.' : 'Pronto para crescer.'));
    }
  }
}

/* ---------- Painéis ---------- */
function openPanel(id) {
  audioStart();
  const P = {
    cidade: panelCity, orcamento: panelBudget, leis: panelLaws, mural: panelFeed, missoes: panelMissions, mapas: panelMaps, mais: panelMore,
    moradores: panelCitizens, conselho: panelAdvisors, pesquisa: panelResearch, ranking: panelRanking, bairros: panelPlots,
  };
  if (id === 'foto') return enterPhoto();
  P[id]();
}

function sparkline(data, color, h = 54) {
  const c = el('canvas', { width: 280, height: h, cls: 'spark' });
  const x = c.getContext('2d');
  if (data.length < 2) { x.fillStyle = '#8a93a3'; x.font = '12px system-ui'; x.fillText('Aguardando dados do próximo mês', 6, h / 2); return c; }
  const mn = Math.min(...data), mx = Math.max(...data), rg = mx - mn || 1;
  x.strokeStyle = color; x.lineWidth = 2; x.beginPath();
  data.forEach((v, i) => { const px = i / (data.length - 1) * 276 + 2, py = h - 4 - (v - mn) / rg * (h - 10); i ? x.lineTo(px, py) : x.moveTo(px, py); });
  x.stroke();
  x.lineTo(278, h); x.lineTo(2, h); x.closePath(); x.globalAlpha = 0.12; x.fillStyle = color; x.fill();
  return c;
}

function panelCity() {
  const g = G, p = g.power || { sup: 0, dem: 0 }, w = g.water || { sup: 0, dem: 0 }, gb = g.garbage || { cap: 0, dem: 0 }, sw = g.sewage || { cap: 0, dem: 0 };
  const grid = el('div', { cls: 'grid2' },
    kv('Habitantes', fmt(g.pop)), kv('Nível', LEVELS[g.level].name),
    kv('Empregos', fmt(g.jobs)), kv('Desemprego', pct(g.unemployment * 100)),
    kv('Aprovação', pct(g.approval)), kv('Turistas/mês', fmt(g.tourists)),
    kv('Energia', `${fmt(p.sup)} / ${fmt(p.dem)}`, p.sup < p.dem ? el('em', { cls: 'neg' }, 'falta') : null),
    kv('Água', `${fmt(w.sup)} / ${fmt(w.dem)}`, w.sup < w.dem ? el('em', { cls: 'neg' }, 'falta') : null),
    kv('Lixo', `${fmt(gb.cap)} / ${fmt(gb.dem)}`, gb.cap < gb.dem ? el('em', { cls: 'neg' }, 'falta') : null),
    kv('Esgoto', `${fmt(sw.cap)} / ${fmt(sw.dem)}`),
    kv('Poluição do ar', Math.round(g.airAvg)), kv('Crime', Math.round(g.crimeAvg)),
    kv('Trânsito', pct(g.trafficAvg * 100)), kv('Pesquisa', (g.researchRate || 0) + '/mês'),
  );
  const dem = el('div', { cls: 'grid3' }, ...['R', 'C', 'I'].map(k => el('div', { cls: 'demcard d' + k }, el('b', {}, { R: 'Moradia', C: 'Comércio', I: 'Indústria' }[k]), el('span', {}, (g.demand[k] > 0 ? '+' : '') + g.demand[k]))));
  const res = g.resources ? el('table', { cls: 'tbl' }, el('tr', {}, el('th', {}, 'Recurso'), el('th', {}, 'Produz'), el('th', {}, 'Consome'), el('th', {}, 'Saldo')),
    ...Object.entries(g.resources.table).map(([k, v]) => el('tr', {}, el('td', {}, k), el('td', {}, fmt(v.prod)), el('td', {}, fmt(v.cons)), el('td', { cls: v.net < 0 ? 'neg' : 'pos' }, (v.net > 0 ? '+' : '') + fmt(v.net))))) : null;
  const charts = el('div', { cls: 'charts' },
    el('div', {}, el('small', {}, 'População'), sparkline(g.hist.pop, '#5fd18b')),
    el('div', {}, el('small', {}, 'Dinheiro'), sparkline(g.hist.money, '#f2c14e')),
    el('div', {}, el('small', {}, 'Aprovação'), sparkline(g.hist.approval, '#6fb7ff')),
    el('div', {}, el('small', {}, 'Poluição do ar'), sparkline(g.hist.air, '#e9785d')),
  );
  openModal(G.name, el('div', {}, el('h3', {}, 'Procura'), dem, el('h3', {}, 'Números'), grid, el('h3', {}, 'Histórico'), charts,
    res ? el('h3', {}, 'Produção e comércio' + (g.linked ? '' : ' (sem ligação com a rodovia!)')) : null, res,
    el('p', { cls: 'muted' }, g.linked ? `Comércio exterior: ${g.resources ? fmt(g.resources.trade) : 0} unidades/mês. Porto, trem e aeroporto aumentam o volume.` : 'Ligue suas ruas à rodovia para comerciar com outras cidades.')), { wide: true });
}

function slider(label, val, min, max, step, fmtv, onchange) {
  const out = el('b', {}, fmtv(val));
  const inp = el('input', { type: 'range', min, max, step, value: val });
  inp.oninput = () => { out.textContent = fmtv(+inp.value); onchange(+inp.value); };
  return el('div', { cls: 'slider' }, el('span', {}, label), inp, out);
}

function panelBudget() {
  const r = G.report || {};
  const body = el('div', {});
  const rows = (pairs) => el('div', { cls: 'grid2' }, ...pairs.map(([k, v]) => kv(k, money(v || 0))));
  body.append(el('h3', {}, 'Último mês'),
    el('div', { cls: 'bal ' + ((r.income || 0) >= (r.expense || 0) ? 'pos' : 'neg') }, `Receita ${money(r.income || 0)} · Despesa ${money(r.expense || 0)} · Saldo ${money((r.income || 0) - (r.expense || 0))}`),
    rows([['Imposto moradia', r.incR], ['Imposto comércio', r.incC], ['Imposto indústria', r.incI], ['Exportações', r.exp], ['Turismo', r.tour], ['Serviços', -(r.services || 0)], ['Ruas', -(r.roads || 0)], ['Leis', -(r.laws || 0)], ['Empréstimos', -(r.loans || 0)], ['Importações', -(r.imp || 0)]]),
    el('h3', {}, 'Impostos'),
    slider('Moradia', G.taxes.R, 0, 20, 1, v => v + '%', v => G.taxes.R = v),
    slider('Comércio', G.taxes.C, 0, 20, 1, v => v + '%', v => G.taxes.C = v),
    slider('Indústria', G.taxes.I, 0, 20, 1, v => v + '%', v => G.taxes.I = v),
    el('p', { cls: 'muted' }, 'Acima de 9% o povo reclama e a procura cai. Abaixo, a cidade cresce mais, mas arrecada menos.'),
    el('h3', {}, 'Orçamento dos serviços'),
    ...BUDGET_KEYS.map(([k, n]) => slider(n, G.budget[k], 0, 150, 10, v => v + '%', v => { G.budget[k] = v; S.covDirty = true; })),
    el('p', { cls: 'muted' }, 'Menos verba economiza dinheiro, mas o serviço alcança menos e funciona pior.'),
  );
  if (G.mode !== 'criativo') {
    body.append(el('h3', {}, 'Empréstimos'));
    G.loans.forEach((l, k) => body.append(el('div', { cls: 'card row' }, el('div', { cls: 'grow' }, `${money(l.v)} · ${money(l.pay)}/mês · faltam ${l.left} meses`), el('button', { cls: 'btn sm', onclick: () => { const e = payLoan(k); if (e) toast(e, 'bad'); else { closeModal(); panelBudget(); } } }, 'Quitar'))));
    body.append(el('div', { cls: 'irow' }, ...[25000, 100000, 250000].map(v => el('button', { cls: 'btn', onclick: () => { const e = takeLoan(v); if (e) toast(e, 'bad'); else { toast(`Empréstimo de ${money(v)} recebido`, 'ok'); sfx('coin'); closeModal(); panelBudget(); } } }, '+ ' + moneyShort(v)))));
    body.append(el('p', { cls: 'muted' }, 'Juros de 1,2% ao mês, pagos em 12, 24 ou 36 parcelas.'));
  }
  openModal('Orçamento', body, { wide: true });
}

function panelLaws() {
  const body = el('div', {});
  const c = G.council;
  body.append(el('div', { cls: 'council' }, ...Array.from({ length: 15 }, (_, k) => el('i', { cls: k < c.gov ? 'gov' : 'opp' }))),
    el('p', { cls: 'muted' }, `Câmara: ${c.gov} aliados, ${c.opp} na oposição. Leis precisam de 8 votos. Com aprovação alta, a oposição ajuda mais.`));
  const list = el('div', { cls: 'list' });
  for (const l of LAWS) {
    const on = !!G.laws[l.id], wait = G.lawCooldown[l.id];
    const fx = Object.entries(l.fx).map(([k, v]) => ({ traffic: 'trânsito', happy: 'felicidade', edu: 'educação', research: 'pesquisa', crime: 'crime', C: 'comércio', I: 'indústria', R: 'moradia', air: 'poluição', noise: 'barulho', landValue: 'valor', garbage: 'coleta', power: 'consumo de energia', tourism: 'turismo', health: 'saúde' }[k] + ' ' + (v > 0 ? '+' : '−'))).join(' · ');
    list.append(el('div', { cls: 'card row' + (on ? ' active' : '') },
      el('div', { cls: 'grow' }, el('b', {}, l.name), el('p', {}, l.desc), el('p', { cls: 'muted' }, fx + ` · ${money(l.custo)}/mês a cada mil hab.`)),
      el('button', { cls: 'btn ' + (on ? 'ghost' : 'primary'), disabled: wait ? 'true' : null, onclick: () => {
        const r = proposeLaw(l.id);
        if (r.revoked) toast(`Lei revogada: ${l.name}`, '');
        else if (r.ok) { toast(`Aprovada por ${r.yes} a ${r.no}!`, 'ok'); sfx('level'); }
        else if (r.wait) toast(`Aguarde ${r.wait} meses para votar de novo`, 'bad');
        else { toast(`Rejeitada: ${r.yes} a ${r.no}. Tente de novo em 2 meses.`, 'bad'); sfx('error'); }
        closeModal(); panelLaws();
      } }, on ? 'Revogar' : wait ? `Em ${wait} meses` : 'Votar'),
    ));
  }
  body.append(list);
  openModal('Leis e Câmara', body, { wide: true });
}

function panelFeed() {
  const body = el('div', {});
  const tabs = el('div', { cls: 'tabs' });
  const content = el('div', {});
  const show = (k) => {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.k === k));
    content.innerHTML = '';
    if (k === 'mural') {
      if (!G.feed.length) content.append(el('p', { cls: 'muted' }, 'Ninguém postou nada ainda.'));
      for (const f of G.feed.slice(0, 30)) content.append(el('div', { cls: 'post ' + f.tipo }, el('div', { cls: 'av' }, f.autor.split(' ').map(s => s[0]).join('')), el('div', {}, el('b', {}, f.autor), el('small', {}, dateStr(f.d)), el('p', {}, f.txt))));
    } else {
      for (const n of G.news) content.append(el('div', { cls: 'news' }, el('small', {}, dateStr(n.d)), el('h4', {}, n.t), n.sub ? el('p', {}, n.sub) : null));
    }
  };
  tabs.append(el('button', { 'data-k': 'mural', onclick: () => show('mural') }, 'Fala, cidade'), el('button', { 'data-k': 'jornal', onclick: () => show('jornal') }, 'Jornal do ' + G.name));
  body.append(tabs, content);
  show('mural');
  openModal('Mural', body, { wide: true });
}
const dateStr = d => `${(d % 30) + 1} ${MESES[Math.floor(d / 30) % 12]} ${2027 + Math.floor(d / 360)}`;

function panelMissions() {
  const body = el('div', {});
  if (G.scenario) {
    const sc = SCENARIOS.find(s => s.id === G.scenario);
    body.append(el('h3', {}, 'Objetivos da campanha'));
    for (const g of sc.goals) { const [a, b] = g.f(G); body.append(el('div', { cls: 'mission' }, el('span', {}, g.txt), bar(a / b), el('small', {}, `${fmt(g.inv ? 100 - a : a)} / ${fmt(g.inv ? 100 - b : b)}`))); }
    body.append(el('p', { cls: 'muted' }, `Prazo: ${sc.anos} anos (faltam ${Math.max(0, Math.ceil((sc.anos * 360 - G.day) / 30))} meses).`));
  }
  body.append(el('h3', {}, 'Missões'));
  for (const m of G.missions) { const cur = missionProgress(m); body.append(el('div', { cls: 'mission' }, el('span', {}, m.txt), bar(cur / m.t), el('small', {}, `Recompensa: ${money(m.reward)}`))); }
  body.append(el('h3', {}, 'Promessas de campanha'));
  if (!G.promises.length) body.append(el('p', { cls: 'muted' }, 'Ao vencer uma eleição você escolhe promessas para o próximo mandato.'));
  for (const p of G.promises) body.append(el('div', { cls: 'mission' }, el('span', {}, p.txt), el('b', { cls: p.done ? 'pos' : '' }, p.done ? 'Cumprida' : 'Pendente')));
  const months = Math.max(0, Math.ceil((G.nextElection - G.day) / 30));
  body.append(el('p', { cls: 'muted' }, `Próxima eleição em ${months} meses (${MESES_LONGOS[Math.floor(G.nextElection / 30) % 12]} de ${2027 + Math.floor(G.nextElection / 360)}).`));
  openModal('Missões', body);
}

function panelMaps() {
  const grid = el('div', { cls: 'mapgrid' });
  const add = (k, name) => grid.append(el('button', { cls: 'btn' + (R.overlay === k ? ' primary' : ''), onclick: () => { R.overlay = R.overlay === k ? null : k; UI.tempOverlay = false; closeModal(); } }, name));
  add(null, 'Sem mapa');
  for (const k in OVERLAYS) add(k, OVERLAYS[k].name);
  const lab = el('input', { type: 'checkbox' }); lab.checked = R.labels;
  lab.onchange = () => { R.labels = G.settings.labels = lab.checked; };
  openModal('Mapas da cidade', el('div', {}, grid, el('label', { cls: 'chk' }, lab, ' Mostrar nomes dos bairros'), el('p', { cls: 'muted' }, 'Verde é bom, vermelho é ruim.')));
}

function panelMore() {
  const items = [['moradores', 'people', 'Moradores'], ['conselho', 'bulb', 'Conselheiros'], ['pesquisa', 'book', 'Pesquisa'], ['ranking', 'trophy', 'Ranking'], ['bairros', 'map', 'Bairros'], ['foto', 'camera', 'Modo foto']];
  const grid = el('div', { cls: 'moregrid' });
  for (const [id, ic, name] of items) grid.append(el('button', { cls: 'morebtn', onclick: () => { closeModal(); openPanel(id); }, html: ico(ic) + `<span>${name}</span>` }));
  openModal('Mais', grid);
}

function panelCitizens() {
  const body = el('div', {}, el('p', { cls: 'muted' }, 'Toque num pedestre na rua ou numa casa para conhecer quem mora na cidade. Siga quem você quiser acompanhar.'));
  const list = el('div', { cls: 'list' });
  const sorted = G.citizens.slice().sort((a, b) => (b.seguir - a.seguir) || (b.diario[0]?.d || 0) - (a.diario[0]?.d || 0));
  for (const c of sorted) list.append(el('div', { cls: 'card row', onclick: () => openCitizen(c) },
    el('div', { cls: 'av' }, c.nome.split(' ').map(s => s[0]).join('')),
    el('div', { cls: 'grow' }, el('b', {}, (c.seguir ? '★ ' : '') + c.nome), el('p', { cls: 'muted' }, c.diario[0] ? c.diario[0].t : '')),
    el('span', { cls: 'mood', html: moodFace(c.humor) })));
  body.append(list);
  openModal('Moradores', body, { wide: true });
}
const moodFace = h => `<b class="${h > 65 ? 'pos' : h < 40 ? 'neg' : ''}">${h > 65 ? 'Feliz' : h < 40 ? 'Triste' : 'Ok'}</b>`;

function openCitizen(c) {
  const home = W.blds[c.casa], job = W.blds[c.trabalho];
  const jobName = job ? (isGrow(job) ? ({ C: 'no comércio', I: 'na indústria' }[job.k] || '') : 'em ' + BLD[job.k].name.toLowerCase()) : 'procurando emprego';
  const body = el('div', {},
    el('div', { cls: 'citizen' }, el('div', { cls: 'av big' }, c.nome.split(' ').map(s => s[0]).join('')),
      el('div', {}, el('h3', {}, c.nome), el('p', {}, `${c.idade} anos · ${home ? 'mora no ' + plotName(home.x, home.y) : 'sem casa na cidade'} · ${jobName}`), el('p', { cls: 'muted' }, `Gosta de ${c.gosto}. Humor: `, el('span', { html: moodFace(c.humor) })))),
    el('h3', {}, 'Diário'),
    ...c.diario.map(d => el('div', { cls: 'news' }, el('small', {}, dateStr(d.d)), el('p', {}, d.t))),
    el('div', { cls: 'irow' },
      el('button', { cls: 'btn ' + (c.seguir ? 'ghost' : 'primary'), onclick: () => { c.seguir = !c.seguir; closeModal(); openCitizen(c); } }, c.seguir ? 'Deixar de seguir' : 'Seguir'),
      home ? el('button', { cls: 'btn', onclick: () => { closeAllModals(); centerOn(home.x, home.y); R.sel = { b: home }; UI.infoB = home; renderInfo(); } }, 'Ver a casa') : null),
  );
  openModal('Morador', body);
}

function panelAdvisors() {
  const list = el('div', { cls: 'list' });
  for (const a of advisors()) list.append(el('div', { cls: 'card advisor ' + (a.ok ? 'ok' : 'bad') }, el('div', { cls: 'av' }, a.pessoa.split(' ').pop()[0]), el('div', { cls: 'grow' }, el('b', {}, `${a.nome} · ${a.pessoa}`), el('p', {}, a.txt))));
  openModal('Conselheiros', list, { wide: true });
}

function panelResearch() {
  const body = el('div', {});
  const rate = G.researchRate || 0;
  body.append(el('p', { cls: 'muted' }, rate ? `A cidade produz ${rate} pontos de pesquisa por mês (escolas, bibliotecas, colégios e universidades).` : 'Construa escolas e bibliotecas para gerar pesquisa.'));
  if (G.researching) { const t = TECH_BY_ID[G.researching]; body.append(el('div', { cls: 'mission' }, el('span', {}, 'Pesquisando: ' + t.name), bar(G.research / t.cost), el('small', {}, `${Math.floor(G.research)} / ${t.cost}`))); }
  const list = el('div', { cls: 'list' });
  for (const t of TECHS) {
    const has = !!G.techs[t.id], reqOk = !t.req || G.techs[t.req];
    list.append(el('div', { cls: 'card row' + (has ? ' active' : '') },
      el('div', { cls: 'grow' }, el('b', {}, t.name), el('p', {}, t.desc), el('p', { cls: 'muted' }, `${t.cost} pontos${t.req ? ' · requer ' + TECH_BY_ID[t.req].name : ''}`)),
      has ? el('span', { cls: 'pos', html: ico('check') }) : el('button', { cls: 'btn' + (G.researching === t.id ? ' primary' : ''), disabled: reqOk ? null : 'true', onclick: () => { if (G.researching !== t.id) { G.researching = t.id; G.research = 0; } closeModal(); panelResearch(); } }, G.researching === t.id ? 'Em andamento' : 'Pesquisar')));
  }
  body.append(list);
  openModal('Pesquisa', body, { wide: true });
}

function panelRanking() {
  const score = c => c.pop * (0.5 + c.approval / 200);
  const rows = G.bots.map(b => ({ ...b, me: false })).concat([{ name: G.name, mayor: 'Você', pop: G.pop, approval: G.approval, style: LEVELS[G.level].name, me: true }]).sort((a, b) => score(b) - score(a));
  const tbl = el('table', { cls: 'tbl' }, el('tr', {}, el('th', {}, '#'), el('th', {}, 'Cidade'), el('th', {}, 'Prefeito'), el('th', {}, 'Habitantes'), el('th', {}, 'Aprovação')),
    ...rows.map((r, k) => el('tr', { cls: r.me ? 'me' : '' }, el('td', {}, k + 1), el('td', {}, r.name, el('small', {}, ' · ' + r.style)), el('td', {}, r.mayor), el('td', {}, fmt(r.pop)), el('td', {}, pct(r.approval)))));
  openModal('Ranking da região', el('div', {}, el('p', { cls: 'muted' }, 'Cidades vizinhas governadas por outros prefeitos. A pontuação junta população e aprovação.'), tbl), { wide: true });
}

function panelPlots() {
  const stats = {};
  for (const b of W.blds) {
    if (!done(b) || b.k !== 'R') continue;
    const p = plotIdx(b.x, b.y);
    const s = stats[p] || (stats[p] = { pop: 0, hap: 0, n: 0, lv: 0, cr: 0 });
    s.pop += b.occ; s.hap += b.hap; s.n++; s.lv += S.lv[idx(b.x, b.y)]; s.cr += S.crime[idx(b.x, b.y)];
  }
  const list = el('div', { cls: 'list' });
  W.plotNames.forEach((n, p) => {
    if (!W.owned[p]) return;
    const s = stats[p];
    const px = p % W.PN, py = Math.floor(p / W.PN);
    list.append(el('div', { cls: 'card row', onclick: () => { closeAllModals(); centerOn(px * PS + 8, py * PS + 8); } },
      el('div', { cls: 'grow' }, el('b', {}, n), el('p', { cls: 'muted' }, s ? `${fmt(s.pop)} moradores · felicidade ${pct(s.hap / s.n)} · valor ${Math.round(s.lv / s.n)} · crime ${Math.round(s.cr / s.n)}` : 'Ainda sem moradores')),
      el('span', { html: ico('map') })));
  });
  openModal('Bairros', list, { wide: true });
}

/* ---------- Menu do jogo, configurações ---------- */
function openGameMenu() {
  const body = el('div', { cls: 'menubtns' },
    el('button', { cls: 'btn big', onclick: () => { closeModal(); } }, 'Voltar ao jogo'),
    el('button', { cls: 'btn big', onclick: () => { saveGame(); closeModal(); } }, 'Salvar'),
    el('button', { cls: 'btn big', onclick: () => { closeModal(); openSettings(); } }, 'Configurações'),
    el('button', { cls: 'btn big', onclick: () => { closeModal(); openAchievements(); } }, 'Conquistas'),
    el('button', { cls: 'btn big ghost', onclick: () => { saveGame(true); closeModal(); goMenu(); } }, 'Salvar e sair para o menu'),
  );
  openModal('Menu', body);
}

function openSettings() {
  const s = G.settings;
  const tog = (k, label, sub) => { const c = el('input', { type: 'checkbox' }); c.checked = s[k]; c.onchange = () => { s[k] = c.checked; if (k === 'labels') R.labels = c.checked; }; return el('label', { cls: 'chk' }, c, ' ' + label, sub ? el('small', {}, ' — ' + sub) : null); };
  const body = el('div', { cls: 'form' },
    tog('dayNight', 'Ciclo de dia e noite'),
    tog('weather', 'Clima e estações', 'chuva, seca, céu nublado'),
    tog('crises', 'Crises econômicas', 'inflação, crise e boom'),
    tog('disasters', 'Desastres', 'enchentes, incêndios, seca, terremoto'),
    tog('labels', 'Nomes dos bairros no mapa'),
    slider('Música', s.music, 0, 1, 0.05, v => Math.round(v * 100) + '%', v => { s.music = v; applyVolumes(); }),
    slider('Efeitos e ambiente', s.sfx, 0, 1, 0.05, v => Math.round(v * 100) + '%', v => { s.sfx = v; applyVolumes(); }),
  );
  openModal('Configurações', body);
}

function goMenu() {
  setupDemo();
  showMainMenu();
}

/* ---------- Telas especiais ---------- */
function showLevelUp(lv, unlockedList, bonus) {
  sfx('level');
  openModal('Nova fase!', el('div', { cls: 'center' },
    el('div', { cls: 'bigicon', html: ico('star') }),
    el('h3', {}, `${G.name} agora é ${LEVELS[lv].name}`),
    unlockedList.length ? el('p', {}, 'Liberado: ' + unlockedList.join(', ') + '.') : null,
    G.mode !== 'criativo' ? el('p', { cls: 'pos' }, `Bônus do governo: ${money(bonus)}`) : null,
    el('button', { cls: 'btn primary', onclick: () => { closeModal(); if (!UI.inMenu) selectCat(UI.cat); } }, 'Continuar')));
}

function showElection(r) {
  const prev = G.speed; G.speed = 0;
  const body = el('div', { cls: 'center' },
    el('div', { cls: 'bigicon ' + (r.win ? 'pos' : 'neg'), html: ico(r.win ? 'trophy' : 'flag') }),
    el('h3', {}, r.win ? 'Você foi reeleito!' : `${r.rival} venceu a eleição`),
    el('div', { cls: 'vote' }, el('i', { style: `width:${r.share}%` }), el('span', {}, `Você ${r.share}%`), el('span', {}, `${r.rival} ${100 - r.share}%`)),
    r.total ? el('p', { cls: 'muted' }, `Promessas não cumpridas: ${r.failed} de ${r.total}.`) : null,
    el('p', {}, `Nova Câmara: ${G.council.gov} aliados e ${G.council.opp} na oposição.`),
  );
  if (r.win || G.mode !== 'desafio') {
    if (!r.win) body.append(el('p', { cls: 'muted' }, 'No modo tranquilo você continua governando mesmo assim.'));
    body.append(el('h3', {}, 'Escolha até 3 promessas para o novo mandato'));
    const chosen = new Set();
    const opts = el('div', { cls: 'list' });
    for (const p of promiseOptions()) {
      const card = el('button', { cls: 'card promise', onclick: () => { if (chosen.has(p.id)) chosen.delete(p.id); else if (chosen.size < 3) chosen.add(p.id); card.classList.toggle('on', chosen.has(p.id)); } }, p.txt);
      opts.append(card);
    }
    body.append(opts, el('p', { cls: 'muted' }, 'Promessa cumprida rende aprovação. Promessa esquecida custa votos na próxima eleição.'),
      el('button', { cls: 'btn primary', onclick: () => { setPromises([...chosen]); closeModal(); G.speed = prev || 1; } }, 'Assumir o mandato'));
    openModal('Eleição municipal', body, { noClose: true });
  }
}

function showGameOver(why, info) {
  G.speed = 0;
  const T = {
    falencia: ['Intervenção estadual', 'A prefeitura ficou 6 meses no vermelho e o governo do estado assumiu a cidade.'],
    eleicao: ['Fim de mandato', 'Você perdeu a eleição. A cidade agora tem outro prefeito.'],
    vitoria: ['Missão cumprida!', 'Você alcançou todos os objetivos da campanha.'],
    prazo: ['O prazo acabou', 'Os objetivos não foram alcançados a tempo.'],
  }[why];
  const sc = G.scenario ? SCENARIOS.findIndex(s => s.id === G.scenario) : -1;
  const body = el('div', { cls: 'center' },
    el('div', { cls: 'bigicon ' + (why === 'vitoria' ? 'pos' : 'neg'), html: ico(why === 'vitoria' ? 'trophy' : 'flag') }),
    el('p', {}, T[1]),
    el('p', { cls: 'muted' }, `${fmt(G.pop)} habitantes · ${Math.floor(G.day / 360)} anos de governo · aprovação ${pct(G.approval)}`),
    el('div', { cls: 'irow' },
      why === 'vitoria' && sc >= 0 && sc < SCENARIOS.length - 1 ? el('button', { cls: 'btn primary', onclick: () => { saveGame(true); closeAllModals(); const n = SCENARIOS[sc + 1]; startNew({ name: n.name, N: n.size, terrain: n.terrain, mode: 'desafio', money: n.money, scenario: n.id, seca: n.seca, seed: 1000 + (sc + 1) * 77 }); } }, 'Próximo cenário') : null,
      why === 'vitoria' ? el('button', { cls: 'btn', onclick: () => { G.over = null; G.scenario = null; closeAllModals(); G.speed = 1; } }, 'Continuar jogando') : null,
      why === 'prazo' && sc >= 0 ? el('button', { cls: 'btn primary', onclick: () => { closeAllModals(); const n = SCENARIOS[sc]; startNew({ name: n.name, N: n.size, terrain: n.terrain, mode: 'desafio', money: n.money, scenario: n.id, seca: n.seca, seed: 1000 + sc * 77 }); } }, 'Tentar de novo') : null,
      el('button', { cls: 'btn ghost', onclick: () => { saveGame(true); closeAllModals(); goMenu(); } }, 'Menu inicial')));
  saveGame(true);
  openModal(T[0], body, { noClose: true });
}

function renderTutorial() {
  const box = $('#tut');
  if (!G || G.tutorial < 0 || G.tutorial >= TUTORIAL.length || UI.inMenu) { box.classList.add('hidden'); return; }
  box.classList.remove('hidden');
  box.innerHTML = '';
  box.append(el('small', {}, `Tutorial ${G.tutorial + 1}/${TUTORIAL.length}`), el('p', {}, TUTORIAL[G.tutorial].txt),
    el('button', { cls: 'link', onclick: () => { G.tutorial = -1; renderTutorial(); } }, 'Pular tutorial'));
}

/* ---------- Modo foto ---------- */
function enterPhoto() {
  R.hidden = true;
  document.body.classList.add('photo');
  const prev = R.overlay; R.overlay = null; R.sel = null; R.preview = null;
  const bar = el('div', { id: 'photobar' },
    el('button', { cls: 'btn', onclick: exitPhoto }, 'Sair'),
    el('button', { cls: 'shutter', 'aria-label': 'Tirar foto', onclick: takePhoto }),
    el('button', { cls: 'btn', onclick: () => { G.settings.dayNight = true; G.dayAcc = 0; G.day = Math.floor(G.day / 30) * 30 + (R.na > 0.5 ? 15 : 27); } }, R.na > 0.5 ? 'Dia' : 'Noite'));
  document.body.append(bar);
  UI.photoPrev = prev;
}
function exitPhoto() {
  R.hidden = false;
  document.body.classList.remove('photo');
  const b = $('#photobar'); if (b) b.remove();
}
function takePhoto() {
  sfx('click');
  const flash = el('div', { cls: 'flash' }); document.body.append(flash); setTimeout(() => flash.remove(), 400);
  const url = R.cv.toDataURL('image/png');
  const name = `${G.name.replace(/\s+/g, '_')}_${G.year}.png`;
  if (window.DistritoAndroid && DistritoAndroid.salvarFoto) { DistritoAndroid.salvarFoto(url, name); return; }
  const a = el('a', { href: url, download: name }); document.body.append(a); a.click(); a.remove();
  toast('Foto salva', 'ok');
}
