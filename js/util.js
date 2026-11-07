'use strict';
// Utilidades gerais: aleatoriedade com semente, ruído, formatação e nomes.

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

let RNG = mulberry32(Date.now() & 0xffffffff);
const rnd = () => RNG();
const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = arr => arr[Math.floor(rnd() * arr.length)];
const chance = p => rnd() < p;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;

function hash2(x, y, s) {
  let h = (x * 374761393 + y * 668265263 + (s | 0) * 982451653) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function vnoise(x, y, seed) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed), b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed), d = hash2(xi + 1, yi + 1, seed);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

function fbm(x, y, seed, oct = 4) {
  let s = 0, amp = 1, f = 1, tot = 0;
  for (let i = 0; i < oct; i++) {
    s += vnoise(x * f, y * f, seed + i * 101) * amp;
    tot += amp; amp *= 0.5; f *= 2;
  }
  return s / tot;
}

const fmt = n => Math.round(n).toLocaleString('pt-BR');
const money = n => (n < 0 ? '−' : '') + 'R$ ' + fmt(Math.abs(n));
const moneyShort = n => {
  const a = Math.abs(n), sg = n < 0 ? '−' : '';
  if (a >= 1e6) return sg + 'R$ ' + (a / 1e6).toFixed(a >= 1e7 ? 0 : 1).replace('.', ',') + ' mi';
  if (a >= 1e4) return sg + 'R$ ' + Math.round(a / 1e3) + ' mil';
  return sg + 'R$ ' + fmt(a);
};
const pct = n => Math.round(n) + '%';

const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const MESES_LONGOS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

const NOMES = ['Ana', 'Maria', 'José', 'João', 'Antônio', 'Francisca', 'Francisco', 'Raimunda', 'Pedro', 'Luzia', 'Paulo', 'Lucas', 'Gabriel', 'Rafaela', 'Juliana', 'Marcos', 'Carla', 'Daniela', 'Bruno', 'Larissa', 'Thiago', 'Beatriz', 'Felipe', 'Camila', 'Rodrigo', 'Letícia', 'Mateus', 'Sofia', 'Helena', 'Davi', 'Alice', 'Miguel', 'Valentina', 'Heitor', 'Laura', 'Arthur', 'Cecília', 'Bernardo', 'Isadora', 'Samuel', 'Cícero', 'Socorro', 'Expedito', 'Fátima', 'Edson', 'Rosângela', 'Wellington', 'Jéssica', 'Igor', 'Natália', 'Otávio', 'Priscila', 'Vitória', 'Renato', 'Tereza', 'Severino', 'Iracema', 'Joaquim', 'Clara', 'Benedito'];
const SOBRENOMES = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Lima', 'Pereira', 'Costa', 'Ferreira', 'Rodrigues', 'Almeida', 'Nascimento', 'Carvalho', 'Araújo', 'Ribeiro', 'Barbosa', 'Gomes', 'Martins', 'Rocha', 'Moura', 'Cavalcante', 'Bezerra', 'Holanda', 'Teixeira', 'Freitas', 'Monteiro', 'Menezes', 'Brito', 'Campos', 'Moreira', 'Pinheiro', 'Sampaio', 'Queiroz', 'Lacerda', 'Viana', 'Andrade'];
const CIDADES = ['Nova Aurora', 'Porto Brisa', 'Serra Clara', 'Vale do Sol', 'Rio Manso', 'Pedra Alta', 'Campo Verde', 'Lagoa Azul', 'Santa Fé do Norte', 'Bela Vista', 'Monte Sereno', 'Boa Ventura', 'Águas Claras', 'São Bento da Mata', 'Três Coqueiros', 'Ventania', 'Pau Ferro', 'Riacho Fundo'];
const BAIRROS = ['Centro', 'Jardim das Flores', 'Vila Nova', 'Alto da Serra', 'Beira-Rio', 'Parque das Árvores', 'Boa Vista', 'São José', 'Santa Luzia', 'Morada do Sol', 'Planalto', 'Recanto Verde', 'Lagoa Seca', 'Porto Velho', 'Cidade Nova', 'Bela Vista', 'Jardim América', 'Vila Esperança', 'Monte Alegre', 'Pedra Branca', 'Cajueiro', 'Mangueiral', 'Ipê Amarelo', 'Brisa do Mar', 'Vila União', 'Alvorada', 'Três Marias', 'Sítio Novo', 'Campo Belo', 'Pôr do Sol', 'Jardim Primavera', 'Vale Verde', 'Santo Antônio', 'Nossa Senhora', 'Areal', 'Coqueiral', 'Rosário', 'Guarani', 'Mirante', 'Bom Jardim', 'Carnaúbas', 'Sabiá', 'Juazeiro', 'Palmeiras', 'Aldeota Nova', 'Cruzeiro', 'Vila Feliz', 'Paraíso', 'Canaã', 'Estrela'];

const nomeGente = () => pick(NOMES) + ' ' + pick(SOBRENOMES);

function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 8192) s += String.fromCharCode.apply(null, u8.subarray(i, i + 8192));
  return btoa(s);
}
function unb64(str, Ctor) {
  const s = atob(str), u8 = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i);
  return Ctor === Uint8Array ? u8 : new Ctor(u8.buffer);
}
