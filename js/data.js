'use strict';
// Definições do jogo: níveis, construções, zonas, leis, tecnologias, cenários e conquistas.

const LEVELS = [
  { name: 'Povoado', pop: 0 },
  { name: 'Vila', pop: 150 },
  { name: 'Distrito', pop: 600 },
  { name: 'Cidade pequena', pop: 2000 },
  { name: 'Cidade', pop: 6000 },
  { name: 'Cidade grande', pop: 18000 },
  { name: 'Metrópole', pop: 50000 },
  { name: 'Megalópole', pop: 120000 },
];

// Zonas: t = tipo, den = densidade
const ZONES = {
  R1: { t: 'R', den: 1, name: 'Residencial baixa', color: '#6fcf6a', lvl: 0 },
  R2: { t: 'R', den: 2, name: 'Residencial média', color: '#3fae4f', lvl: 2 },
  R3: { t: 'R', den: 3, name: 'Residencial alta', color: '#1f8a3a', lvl: 4 },
  C1: { t: 'C', den: 1, name: 'Comercial baixa', color: '#5aa9ef', lvl: 0 },
  C2: { t: 'C', den: 2, name: 'Comercial média', color: '#2f7fd6', lvl: 2 },
  C3: { t: 'C', den: 3, name: 'Comercial alta', color: '#1a5cb0', lvl: 4 },
  I1: { t: 'I', den: 1, name: 'Industrial', color: '#e9b949', lvl: 0 },
  I2: { t: 'I', den: 2, name: 'Industrial pesada', color: '#c98a1c', lvl: 3 },
};
const ZONE_KEYS = Object.keys(ZONES);
const ZONE_ID = {}; ZONE_KEYS.forEach((k, i) => ZONE_ID[k] = i + 1);

// Capacidade (moradores ou empregos) por densidade e nível
const CAP = {
  R: [null, [5, 9, 15], [32, 54, 84], [170, 280, 420]],
  C: [null, [4, 8, 12], [22, 36, 56], [120, 200, 320]],
  I: [null, [10, 16, 24], [40, 64, 96]],
};

const ROADS = {
  rua: { name: 'Rua', cost: 20, up: 1, cap: 60, desc: 'Rua de mão dupla com calçada.' },
  avenida: { name: 'Avenida', cost: 70, up: 3, cap: 180, desc: 'Mais faixas, aguenta muito mais trânsito.', lvl: 2 },
};
const ROAD_ID = { rua: 1, avenida: 2, rodovia: 3 };
const ROAD_CAP = [0, 60, 180, 260];

/* Construções.
 cov: cobertura por raio r; cap: capacidade (energia, água, lixo, esgoto);
 needs: water (encostado na água), coast (litoral), forest, rock. */
const BLD = {
  // Energia
  termo: { name: 'Termelétrica', cat: 'energia', w: 2, h: 2, cost: 9000, up: 180, cov: 'power', r: 18, cap: 1400, jobs: 20, pol: 45, noise: 15, desc: 'Muita energia, mas polui o ar.' },
  solar: { name: 'Usina solar', cat: 'energia', w: 2, h: 2, cost: 12000, up: 120, cov: 'power', r: 16, cap: 500, jobs: 4, tech: 'solar', desc: 'Energia limpa e silenciosa.' },
  eolica: { name: 'Turbina eólica', cat: 'energia', w: 1, h: 1, cost: 3500, up: 40, cov: 'power', r: 10, cap: 180, jobs: 1, noise: 12, desc: 'Gera mais em terrenos altos.' },
  subest: { name: 'Subestação', cat: 'energia', w: 1, h: 1, cost: 900, up: 20, cov: 'power', r: 15, cap: 0, desc: 'Leva a energia mais longe.' },
  nuclear: { name: 'Usina nuclear', cat: 'energia', w: 3, h: 3, cost: 90000, up: 1400, cov: 'power', r: 20, cap: 9000, jobs: 80, tech: 'nuclear', lvl: 5, desc: 'Energia enorme, sem fumaça.' },
  // Água e esgoto
  poco: { name: 'Poço artesiano', cat: 'agua', w: 1, h: 1, cost: 1200, up: 30, cov: 'water', r: 9, cap: 200, desc: 'Pouca água, mas cabe em qualquer lugar.' },
  bomba: { name: 'Bomba d\'água', cat: 'agua', w: 1, h: 1, cost: 4500, up: 110, cov: 'water', r: 14, cap: 1600, jobs: 4, needs: 'water', desc: 'Precisa ficar encostada em rio, lago ou mar.' },
  caixa: { name: 'Caixa d\'água', cat: 'agua', w: 1, h: 1, cost: 800, up: 15, cov: 'water', r: 15, cap: 0, desc: 'Leva a água mais longe.' },
  ete: { name: 'Estação de esgoto', cat: 'agua', w: 2, h: 2, cost: 8000, up: 180, cov: 'sewage', r: 16, cap: 3500, jobs: 10, lvl: 2, desc: 'Trata o esgoto e protege rios e praias.' },
  // Lixo
  lixao: { name: 'Aterro', cat: 'lixo', w: 2, h: 2, cost: 3000, up: 90, cov: 'garbage', r: 16, cap: 1600, jobs: 8, pol: 18, desc: 'Barato, mas cheira mal.' },
  recicla: { name: 'Reciclagem', cat: 'lixo', w: 2, h: 2, cost: 9000, up: 160, cov: 'garbage', r: 14, cap: 1600, jobs: 18, tech: 'recicla', desc: 'Lixo sem poluição e com empregos.' },
  incin: { name: 'Incinerador', cat: 'lixo', w: 2, h: 2, cost: 14000, up: 220, cov: 'garbage', r: 18, cap: 3200, jobs: 10, pol: 28, power: 300, lvl: 4, desc: 'Queima o lixo e gera um pouco de energia.' },
  // Segurança e saúde
  ppol: { name: 'Posto policial', cat: 'servicos', w: 1, h: 1, cost: 2500, up: 70, cov: 'police', r: 8, jobs: 6, desc: 'Policiamento de bairro.' },
  delegacia: { name: 'Delegacia', cat: 'servicos', w: 2, h: 2, cost: 9000, up: 240, cov: 'police', r: 15, jobs: 25, lvl: 3, desc: 'Cobre uma área grande.' },
  bombeiros: { name: 'Bombeiros', cat: 'servicos', w: 2, h: 2, cost: 6000, up: 160, cov: 'fire', r: 13, jobs: 14, desc: 'Previne e apaga incêndios.' },
  psaude: { name: 'Posto de saúde', cat: 'servicos', w: 1, h: 1, cost: 3000, up: 90, cov: 'health', r: 8, jobs: 8, desc: 'Atendimento básico.' },
  hospital: { name: 'Hospital', cat: 'servicos', w: 2, h: 2, cost: 16000, up: 420, cov: 'health', r: 16, jobs: 60, lvl: 3, desc: 'Atendimento completo.' },
  // Educação
  escola: { name: 'Escola', cat: 'educacao', w: 2, h: 2, cost: 5000, up: 150, cov: 'edu', r: 10, jobs: 18, research: 1, desc: 'Ensino fundamental.' },
  biblio: { name: 'Biblioteca', cat: 'educacao', w: 1, h: 1, cost: 2500, up: 50, cov: 'edu', r: 7, jobs: 3, research: 1, lvl: 1, desc: 'Leitura e pesquisa para o bairro.' },
  colegio: { name: 'Colégio', cat: 'educacao', w: 2, h: 2, cost: 9000, up: 230, cov: 'edu', r: 14, jobs: 26, research: 2, lvl: 3, desc: 'Ensino médio.' },
  univ: { name: 'Universidade', cat: 'educacao', w: 3, h: 3, cost: 32000, up: 700, cov: 'edu', r: 22, jobs: 90, research: 6, lvl: 4, desc: 'Gera muita pesquisa.' },
  // Lazer
  praca: { name: 'Praça', cat: 'lazer', w: 1, h: 1, cost: 600, up: 10, cov: 'leisure', r: 5, lv: 6, desc: 'Banco, árvore e encontro.' },
  parque: { name: 'Parque', cat: 'lazer', w: 2, h: 2, cost: 2500, up: 35, cov: 'leisure', r: 9, lv: 10, pol: -10, desc: 'Verde, lago e passeio.' },
  quadra: { name: 'Quadra', cat: 'lazer', w: 1, h: 1, cost: 1200, up: 15, cov: 'leisure', r: 6, desc: 'Futebol e vôlei no fim de tarde.' },
  fonte: { name: 'Chafariz', cat: 'lazer', w: 1, h: 1, cost: 1500, up: 15, cov: 'leisure', r: 4, lv: 8, lvl: 2, desc: 'Valoriza a vizinhança.' },
  estadio: { name: 'Estádio', cat: 'lazer', w: 3, h: 3, cost: 45000, up: 500, cov: 'leisure', r: 24, jobs: 40, tour: 60, noise: 20, lvl: 4, desc: 'Atrai turistas em dia de jogo.' },
  // Transporte
  onibus: { name: 'Ponto de ônibus', cat: 'transporte', w: 1, h: 1, cost: 500, up: 25, cov: 'transit', r: 6, desc: 'Tira carros da rua.' },
  vlt: { name: 'Estação de VLT', cat: 'transporte', w: 1, h: 1, cost: 6000, up: 120, cov: 'transit', r: 9, tech: 'vlt', desc: 'Transporte rápido de superfície.' },
  metro: { name: 'Estação de metrô', cat: 'transporte', w: 1, h: 1, cost: 15000, up: 250, cov: 'transit', r: 12, tech: 'metro', lvl: 5, desc: 'Leva muita gente por baixo da terra.' },
  trem: { name: 'Estação de trem', cat: 'transporte', w: 3, h: 2, cost: 22000, up: 300, cov: 'transit', r: 10, jobs: 20, trade: 1, tour: 15, lvl: 3, desc: 'Comércio com outras cidades e turistas.' },
  porto: { name: 'Porto', cat: 'transporte', w: 3, h: 3, cost: 38000, up: 450, jobs: 60, trade: 2, needs: 'water', pol: 10, lvl: 4, desc: 'Precisa ficar no litoral. Exporta muito.' },
  aero: { name: 'Aeroporto', cat: 'transporte', w: 4, h: 4, cost: 120000, up: 1200, jobs: 120, trade: 2, tour: 120, noise: 40, tech: 'aero', lvl: 6, desc: 'Turismo e comércio em grande escala.' },
  // Produção
  fazenda: { name: 'Fazenda', cat: 'producao', w: 3, h: 3, cost: 4000, up: 40, jobs: 14, prod: { comida: 60 }, desc: 'Produz comida.' },
  madeira: { name: 'Madeireira', cat: 'producao', w: 2, h: 2, cost: 5000, up: 50, jobs: 16, prod: { madeira: 50 }, needs: 'forest', pol: 6, desc: 'Precisa de mata por perto.' },
  mina: { name: 'Mineradora', cat: 'producao', w: 2, h: 2, cost: 7000, up: 70, jobs: 20, prod: { minerio: 50 }, needs: 'rock', pol: 16, noise: 10, lvl: 2, desc: 'Precisa de serra ou rocha por perto.' },
  // Marcos e turismo
  prefeitura: { name: 'Prefeitura', cat: 'marcos', w: 2, h: 2, cost: 5000, up: 100, jobs: 20, lv: 12, happy: 3, unique: 1, desc: 'Sede do governo. Aumenta a aprovação.' },
  igreja: { name: 'Igreja matriz', cat: 'marcos', w: 2, h: 2, cost: 8000, up: 40, lv: 10, tour: 12, happy: 2, unique: 1, lvl: 1, desc: 'Coração do centro antigo.' },
  relogio: { name: 'Torre do relógio', cat: 'marcos', w: 1, h: 1, cost: 6000, up: 20, lv: 12, tour: 8, unique: 1, lvl: 2, desc: 'Ponto de encontro e cartão-postal.' },
  teatro: { name: 'Teatro', cat: 'marcos', w: 2, h: 2, cost: 18000, up: 220, jobs: 15, lv: 14, tour: 30, happy: 2, lvl: 3, unique: 1, desc: 'Cultura e turismo.' },
  museu: { name: 'Museu', cat: 'marcos', w: 2, h: 2, cost: 22000, up: 240, jobs: 12, lv: 14, tour: 35, research: 2, lvl: 4, unique: 1, tech: 'turismo', desc: 'História da cidade.' },
  farol: { name: 'Farol', cat: 'marcos', w: 1, h: 1, cost: 9000, up: 30, lv: 10, tour: 20, needs: 'water', unique: 1, lvl: 2, desc: 'Precisa ficar na beira d\'água.' },
  hotel: { name: 'Hotel', cat: 'marcos', w: 2, h: 2, cost: 15000, up: 60, jobs: 30, tour: 25, hotel: 200, lvl: 3, desc: 'Hospeda turistas.' },
  resort: { name: 'Resort de praia', cat: 'marcos', w: 3, h: 3, cost: 40000, up: 120, jobs: 70, tour: 70, hotel: 400, needs: 'water', lvl: 5, tech: 'turismo', desc: 'Turismo de luxo à beira-mar.' },
  estatua: { name: 'Estátua', cat: 'marcos', w: 1, h: 1, cost: 2000, up: 5, lv: 6, lvl: 1, desc: 'Homenagem ao fundador.' },
};
for (const k in BLD) {
  const b = BLD[k];
  b.key = k; b.lvl = b.lvl || 0; b.up = b.up || 0;
  b.days = b.days || ({ 1: 6, 2: 12, 3: 20, 4: 30 })[Math.max(b.w, b.h)];
}

const CATS = [
  { id: 'ver', name: 'Ver', icon: 'eye' },
  { id: 'estradas', name: 'Ruas', icon: 'road' },
  { id: 'zonas', name: 'Zonas', icon: 'zone' },
  { id: 'energia', name: 'Energia', icon: 'bolt' },
  { id: 'agua', name: 'Água', icon: 'drop' },
  { id: 'lixo', name: 'Lixo', icon: 'trash' },
  { id: 'servicos', name: 'Serviços', icon: 'shield' },
  { id: 'educacao', name: 'Educação', icon: 'book' },
  { id: 'lazer', name: 'Lazer', icon: 'tree' },
  { id: 'transporte', name: 'Transporte', icon: 'bus' },
  { id: 'producao', name: 'Produção', icon: 'factory' },
  { id: 'marcos', name: 'Marcos', icon: 'star' },
  { id: 'terreno', name: 'Terreno', icon: 'mountain' },
  { id: 'demolir', name: 'Demolir', icon: 'bulldozer' },
];

const TERRAIN_TOOLS = [
  { id: 'elevar', name: 'Elevar', cost: 60, desc: 'Sobe o terreno um nível. Aterra a água.' },
  { id: 'rebaixar', name: 'Rebaixar', cost: 60, desc: 'Desce um nível. No nível mais baixo vira água.' },
  { id: 'nivelar', name: 'Nivelar', cost: 40, desc: 'Deixa tudo na altura do primeiro toque.' },
  { id: 'arvore', name: 'Plantar árvores', cost: 15, desc: 'Árvores limpam o ar e valorizam.' },
  { id: 'lote', name: 'Comprar terreno', cost: 0, desc: 'Toque numa área escura para comprar.' },
];

const BUDGET_KEYS = [
  ['power', 'Energia'], ['water', 'Água'], ['sewage', 'Esgoto'], ['garbage', 'Lixo'],
  ['police', 'Polícia'], ['fire', 'Bombeiros'], ['health', 'Saúde'], ['edu', 'Educação'],
  ['leisure', 'Lazer'], ['transit', 'Transporte'], ['roads', 'Ruas'],
];
const COV_KEYS = ['power', 'water', 'sewage', 'garbage', 'police', 'fire', 'health', 'edu', 'leisure', 'transit'];

/* Leis: fx são modificadores aplicados pela simulação. custo por mês a cada 1.000 habitantes. */
const LAWS = [
  { id: 'rodizio', name: 'Rodízio de carros', desc: 'Menos trânsito, um pouco menos de alegria.', custo: 20, fx: { traffic: -0.18, happy: -2 } },
  { id: 'passe', name: 'Passe livre estudantil', desc: 'Mais gente no ônibus e na escola.', custo: 120, fx: { traffic: -0.08, edu: 0.1, happy: 2 } },
  { id: 'bolsa', name: 'Bolsa escola', desc: 'Educação melhor e mais pesquisa.', custo: 160, fx: { edu: 0.15, research: 0.25 } },
  { id: 'comunit', name: 'Policiamento comunitário', desc: 'Menos crime nos bairros.', custo: 140, fx: { crime: -0.15, happy: 1 } },
  { id: 'feira', name: 'Feira livre aos domingos', desc: 'Comércio mais forte.', custo: 30, fx: { C: 8, happy: 1 } },
  { id: 'fumaca', name: 'Controle de fumaça', desc: 'Indústria polui menos, mas cresce menos.', custo: 40, fx: { air: -0.3, I: -10 } },
  { id: 'silencio', name: 'Lei do silêncio', desc: 'Menos barulho à noite.', custo: 15, fx: { noise: -0.25, C: -3 } },
  { id: 'verde', name: 'IPTU verde', desc: 'Desconto para quem planta: mais verde e valor.', custo: 60, fx: { landValue: 4, air: -0.08 } },
  { id: 'mutirao', name: 'Mutirão de limpeza', desc: 'Menos lixo acumulado.', custo: 50, fx: { garbage: 0.15, happy: 1 } },
  { id: 'horario', name: 'Horário de verão', desc: 'Economiza energia.', custo: 0, fx: { power: -0.06, happy: -1 } },
  { id: 'carnaval', name: 'Carnaval da cidade', desc: 'Festa em fevereiro: turistas e alegria.', custo: 90, fx: { tourism: 0.2, happy: 2, crime: 0.04 } },
  { id: 'incentivo', name: 'Incentivo à indústria', desc: 'Atrai fábricas e empregos.', custo: 110, fx: { I: 14, air: 0.08 } },
  { id: 'saude', name: 'Saúde da família', desc: 'Agentes de saúde nas casas.', custo: 130, fx: { health: 0.15, happy: 1 } },
  { id: 'aluguel', name: 'Aluguel social', desc: 'Menos gente indo embora.', custo: 150, fx: { R: 10, happy: 1 } },
];
const LAW_BY_ID = {}; LAWS.forEach(l => LAW_BY_ID[l.id] = l);

/* Tecnologias: pesquisa vem de escolas, bibliotecas, colégios e universidades. */
const TECHS = [
  { id: 'solar', name: 'Energia solar', cost: 20, desc: 'Libera a usina solar.' },
  { id: 'recicla', name: 'Reciclagem', cost: 25, desc: 'Libera a reciclagem.' },
  { id: 'asfalto', name: 'Asfalto inteligente', cost: 30, desc: 'Ruas aguentam 20% mais trânsito.' },
  { id: 'vlt', name: 'VLT', cost: 40, req: 'asfalto', desc: 'Libera estações de VLT.' },
  { id: 'agro', name: 'Agricultura moderna', cost: 30, desc: 'Fazendas produzem 50% mais.' },
  { id: 'saneamento', name: 'Saneamento avançado', cost: 45, desc: 'Esgoto e água rendem 25% mais.' },
  { id: 'drenagem', name: 'Drenagem urbana', cost: 50, req: 'saneamento', desc: 'Protege contra enchentes.' },
  { id: 'turismo', name: 'Turismo', cost: 50, desc: 'Libera museu e resort; +15% turistas.' },
  { id: 'arranha', name: 'Arranha-céus', cost: 70, desc: 'Prédios de alta densidade chegam ao nível 3.' },
  { id: 'metro', name: 'Metrô', cost: 90, req: 'vlt', desc: 'Libera estações de metrô.' },
  { id: 'semaforo', name: 'Semáforos inteligentes', cost: 60, req: 'asfalto', desc: '15% menos congestionamento.' },
  { id: 'policia', name: 'Câmeras de segurança', cost: 60, desc: 'Polícia 20% mais eficiente.' },
  { id: 'medicina', name: 'Medicina moderna', cost: 70, desc: 'Saúde 20% mais eficiente.' },
  { id: 'nuclear', name: 'Energia nuclear', cost: 120, req: 'solar', desc: 'Libera a usina nuclear.' },
  { id: 'aero', name: 'Aviação', cost: 140, req: 'turismo', desc: 'Libera o aeroporto.' },
  { id: 'verde', name: 'Cidade verde', cost: 110, req: 'recicla', desc: 'Toda poluição 20% menor.' },
];
const TECH_BY_ID = {}; TECHS.forEach(t => TECH_BY_ID[t.id] = t);

/* Cenários da campanha. goals: funções que recebem G e retornam [atual, alvo]. */
const SCENARIOS = [
  {
    id: 'c1', name: 'Primeiros passos', size: 64, terrain: 'rio', money: 40000, anos: 3,
    desc: 'Uma vila pequena às margens de um rio. Faça ela crescer.',
    goals: [{ txt: 'Chegar a 800 habitantes', f: g => [g.pop, 800] }, { txt: 'Aprovação de pelo menos 60%', f: g => [g.approval, 60] }],
  },
  {
    id: 'c2', name: 'Cidade litorânea', size: 96, terrain: 'costa', money: 60000, anos: 6,
    desc: 'Praia bonita e pouca gente. Transforme o lugar em destino turístico.',
    goals: [{ txt: 'Receber 1.500 turistas por mês', f: g => [g.tourists, 1500] }, { txt: 'Chegar a 4.000 habitantes', f: g => [g.pop, 4000] }],
  },
  {
    id: 'c3', name: 'Polo industrial', size: 96, terrain: 'serra', money: 70000, anos: 6,
    desc: 'Serra rica em minério e mata. Exporte sem sufocar a cidade.',
    goals: [{ txt: 'Exportar R$ 6.000 por mês', f: g => [g.exportsMoney, 6000] }, { txt: 'Poluição do ar abaixo de 40', f: g => [100 - g.airAvg, 60], inv: 1 }],
  },
  {
    id: 'c4', name: 'Crise hídrica', size: 96, terrain: 'seco', money: 60000, anos: 7, seca: 1,
    desc: 'O sertão está seco o ano inteiro. Garanta água para todos.',
    goals: [{ txt: 'Chegar a 6.000 habitantes', f: g => [g.pop, 6000] }, { txt: '95% das casas com água', f: g => [g.waterServed * 100, 95] }],
  },
  {
    id: 'c5', name: 'Metrópole verde', size: 128, terrain: 'lagos', money: 120000, anos: 15,
    desc: 'O grande desafio: crescer muito sem perder o ar puro.',
    goals: [{ txt: 'Chegar a 40.000 habitantes', f: g => [g.pop, 40000] }, { txt: 'Aprovação de pelo menos 70%', f: g => [g.approval, 70] }, { txt: 'Poluição do ar abaixo de 25', f: g => [100 - g.airAvg, 75], inv: 1 }],
  },
];

/* Conquistas (globais, valem entre cidades). */
const ACHIEVEMENTS = [
  { id: 'rua', name: 'Primeiro asfalto', desc: 'Construa sua primeira rua.', f: g => g.roadCount > 0 },
  { id: 'p100', name: 'Vizinhança', desc: 'Chegue a 100 habitantes.', f: g => g.pop >= 100 },
  { id: 'p1k', name: 'Vila crescida', desc: 'Chegue a 1.000 habitantes.', f: g => g.pop >= 1000 },
  { id: 'p10k', name: 'Cidade de verdade', desc: 'Chegue a 10.000 habitantes.', f: g => g.pop >= 10000 },
  { id: 'p50k', name: 'Metrópole', desc: 'Chegue a 50.000 habitantes.', f: g => g.pop >= 50000 },
  { id: 'p100k', name: 'Gigante', desc: 'Chegue a 100.000 habitantes.', f: g => g.pop >= 100000 },
  { id: 'arranha', name: 'Linha do horizonte', desc: 'Tenha um prédio alto no nível 3.', f: g => g.towers > 0 },
  { id: 'ponte', name: 'Construtor de pontes', desc: 'Construa uma ponte.', f: g => g.bridges > 0 },
  { id: 'aprov90', name: 'Prefeito do povo', desc: 'Chegue a 90% de aprovação.', f: g => g.approval >= 90 },
  { id: 'reeleito', name: 'Mais quatro anos', desc: 'Vença uma reeleição.', f: g => g.reeleicoes > 0 },
  { id: 'tri', name: 'Dinastia', desc: 'Vença três eleições.', f: g => g.reeleicoes >= 3 },
  { id: 'milhao', name: 'Cofre cheio', desc: 'Tenha R$ 1 milhão em caixa.', f: g => g.money >= 1e6 },
  { id: 'lei', name: 'Canetada', desc: 'Aprove uma lei na Câmara.', f: g => g.leisAprovadas > 0 },
  { id: 'tech5', name: 'Cidade que pesquisa', desc: 'Conclua 5 tecnologias.', f: g => Object.keys(g.techs).length >= 5 },
  { id: 'turismo', name: 'Cartão-postal', desc: 'Receba 2.000 turistas num mês.', f: g => g.tourists >= 2000 },
  { id: 'verde', name: 'Ar puro', desc: 'Tenha 5.000 habitantes e poluição do ar abaixo de 15.', f: g => g.pop >= 5000 && g.airAvg < 15 },
  { id: 'emprego', name: 'Pleno emprego', desc: 'Desemprego abaixo de 3% com 2.000 habitantes.', f: g => g.pop >= 2000 && g.unemployment < 0.03 },
  { id: 'terra', name: 'Mestre de obras', desc: 'Modifique o terreno 50 vezes.', f: g => g.terraforms >= 50 },
  { id: 'lotes', name: 'Latifúndio', desc: 'Compre todos os terrenos do mapa.', f: g => g.allPlots },
  { id: 'monumento', name: 'Marco histórico', desc: 'Construa 3 marcos diferentes.', f: g => g.marcos >= 3 },
  { id: 'desastre', name: 'Resiliente', desc: 'Sobreviva a um desastre.', f: g => g.desastres > 0 },
  { id: 'dez', name: 'Década', desc: 'Governe por 10 anos.', f: g => g.day >= 360 * 10 },
  { id: 'rank1', name: 'Número um', desc: 'Lidere o ranking de cidades.', f: g => g.rank === 1 },
  { id: 'missao10', name: 'Tarefeiro', desc: 'Cumpra 10 missões.', f: g => g.missoesFeitas >= 10 },
];

/* Promessas de campanha (ideia original): escolhidas após vencer uma eleição. */
const PROMISES = [
  { id: 'parques', txt: 'Construir 3 parques ou praças', check: (g, p) => g.counts.lazer - p.base >= 3, base: g => g.counts.lazer },
  { id: 'crime', txt: 'Derrubar o crime pela metade', check: (g, p) => g.crimeAvg <= p.base / 2 + 2, base: g => g.crimeAvg },
  { id: 'emprego', txt: 'Desemprego abaixo de 5%', check: g => g.unemployment < 0.05 },
  { id: 'escolas', txt: 'Abrir 2 escolas novas', check: (g, p) => g.counts.educacao - p.base >= 2, base: g => g.counts.educacao },
  { id: 'saude', txt: 'Saúde em 80% da cidade', check: g => g.healthServed >= 0.8 },
  { id: 'pop', txt: 'Crescer 50% a população', check: (g, p) => g.pop >= p.base * 1.5, base: g => Math.max(100, g.pop) },
  { id: 'imposto', txt: 'Não subir nenhum imposto', check: (g, p) => g.taxes.R <= p.base[0] && g.taxes.C <= p.base[1] && g.taxes.I <= p.base[2], base: g => [g.taxes.R, g.taxes.C, g.taxes.I], keep: 1 },
  { id: 'onibus', txt: 'Transporte público em 60% da cidade', check: g => g.transitServed >= 0.6 },
  { id: 'ar', txt: 'Poluição do ar abaixo de 20', check: g => g.airAvg < 20 },
];
