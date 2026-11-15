// Guarda-roupa (t408/t410): roupas estilo Miami (seda, linho, resort) para todos os personagens, acessórios presos aos ossos
// e trajes de herói originais com poderes. Tudo procedural (sem marcas/nomes de terceiros). Salvo por personagem em save.ward.
import * as THREE from 'three';
import { attach, HEROES, heroMaterials } from './heroes.js';

// tecidos: brilho/aspereza (seda brilha, linho é fosco)
export const FAB = { seda: { r: 0.3, m: 0.12, n: 'seda' }, linho: { r: 0.95, m: 0, n: 'linho' }, algodao: { r: 0.82, m: 0, n: 'algodão' }, couro: { r: 0.45, m: 0.08, n: 'couro' }, palha: { r: 0.95, m: 0, n: 'palha' }, metal: { r: 0.3, m: 0.85, n: 'metal' }, acetato: { r: 0.25, m: 0.1, n: 'acetato' } };
export const SLOTS = [['top', '👚', 'Partes de cima e vestidos'], ['bottom', '👖', 'Calças e saias'], ['shoes', '👡', 'Sapatos'], ['hat', '👒', 'Chapéus'], ['glasses', '🕶️', 'Óculos'], ['bag', '👜', 'Bolsas']];
// [id, slot, sexo f/m/u, nome, preço, cor, tecido, tipo, extra]
const RAW = [
  ['f-blusa-seda-coral', 'top', 'f', 'Blusa de seda coral', 180, 0xff7f6e, 'seda', 'blusa'],
  ['f-blusa-seda-champanhe', 'top', 'f', 'Blusa de seda champanhe', 220, 0xf3dfc1, 'seda', 'blusa'],
  ['f-blusa-seda-esmeralda', 'top', 'f', 'Blusa de seda esmeralda', 240, 0x0f8a6a, 'seda', 'blusa'],
  ['f-cropped-linho', 'top', 'f', 'Cropped de linho branco', 150, 0xf7f3ea, 'linho', 'blusa'],
  ['f-top-hibisco', 'top', 'f', 'Top resort hibisco', 160, 0x1fb5a8, 'algodao', 'blusa', { print: 0xff5fa2 }],
  ['f-vest-envelope', 'top', 'f', 'Vestido envelope de seda esmeralda', 520, 0x0f8a6a, 'seda', 'vestido', { len: 0.6, belt: 0xd9b45a }],
  ['f-vest-longo-sol', 'top', 'f', 'Vestido longo resort pôr do sol', 680, 0xff8a5c, 'seda', 'vestido', { len: 0.86, print: 0xffd166 }],
  ['f-vest-slip-perola', 'top', 'f', 'Vestido slip de cetim pérola', 590, 0xf4efe6, 'seda', 'vestido', { len: 0.45 }],
  ['f-vest-chemise-ceu', 'top', 'f', 'Vestido chemise de linho azul-céu', 420, 0x8ecae6, 'linho', 'vestido', { len: 0.58, belt: 0xf7f3ea }],
  ['f-vest-tubinho-fucsia', 'top', 'f', 'Vestido de seda fúcsia', 560, 0xd6247f, 'seda', 'vestido', { len: 0.5 }],
  ['f-pantalona-off', 'bottom', 'f', 'Short de linho off-white', 240, 0xf1ece0, 'linho', 'calca'],
  ['f-saia-midi-rosa', 'bottom', 'f', 'Saia midi de seda rosa', 260, 0xf7a8c4, 'seda', 'saia', { len: 0.58 }],
  ['f-saia-longa-turquesa', 'bottom', 'f', 'Saia longa de linho turquesa', 280, 0x2ab3b8, 'linho', 'saia', { len: 0.84 }],
  ['f-cigarrete-areia', 'bottom', 'f', 'Short de alfaiataria areia', 230, 0xe3d2b0, 'algodao', 'calca'],
  ['f-pantalona-marfim', 'bottom', 'f', 'Pantalona de alfaiataria marfim', 360, 0xefe6d6, 'seda', 'pantalona'],
  ['f-pantalona-grafite', 'bottom', 'f', 'Pantalona de alfaiataria grafite', 380, 0x34373d, 'linho', 'pantalona'],
  ['f-calca-reta-petroleo', 'bottom', 'f', 'Calça reta de seda azul-petróleo', 340, 0x1d4e5a, 'seda', 'pantalona', { flare: 0.82 }],
  ['m-camisa-linho', 'top', 'm', 'Camisa de linho branca', 190, 0xf8f6f0, 'linho', 'camisa'],
  ['m-camisa-palmeiras', 'top', 'm', 'Camisa de seda estampa palmeiras', 340, 0x0e6b5c, 'seda', 'camisa', { print: 0xf6e7c8 }],
  ['m-guayabera', 'top', 'm', 'Guayabera de linho areia', 260, 0xe9dcc0, 'linho', 'guayabera'],
  ['m-polo-menta', 'top', 'm', 'Polo de piquet menta', 150, 0x9ee6c8, 'algodao', 'camisa'],
  ['m-blazer-marinho', 'top', 'm', 'Blazer de linho azul-marinho', 780, 0x23395b, 'linho', 'blazer'],
  ['m-cubana-coral', 'top', 'm', 'Camisa cubana de seda coral', 280, 0xff7f6e, 'seda', 'camisa'],
  ['m-blazer-creme', 'top', 'm', 'Blazer de seda creme', 860, 0xefe4cc, 'seda', 'blazer'],
  ['m-calca-linho-areia', 'bottom', 'm', 'Calça de linho areia', 220, 0xd9c7a3, 'linho', 'calca'],
  ['m-chino-branco', 'bottom', 'm', 'Chino branco', 200, 0xf5f2ea, 'algodao', 'calca'],
  ['m-calca-seda-noite', 'bottom', 'm', 'Calça de seda azul-noite', 380, 0x1c2541, 'seda', 'calca'],
  ['m-alfaiataria-perola', 'bottom', 'm', 'Calça de alfaiataria cinza-pérola', 300, 0xbfc3c9, 'linho', 'calca'],
  ['u-espadrille', 'shoes', 'u', 'Espadrille de lona areia', 120, 0xd8c39a, 'algodao', 'sapato'],
  ['m-mocassim', 'shoes', 'm', 'Mocassim de couro caramelo', 280, 0x9c5a2c, 'couro', 'sapato'],
  ['m-sapatenis', 'shoes', 'm', 'Sapatênis marinho', 210, 0x1f2f4f, 'couro', 'sapato'],
  ['f-sandalia-dourada', 'shoes', 'f', 'Sandália de tiras dourada', 260, 0xd9b45a, 'metal', 'sapato'],
  ['f-salto-nude', 'shoes', 'f', 'Salto bloco nude', 320, 0xe0b99a, 'couro', 'sapato'],
  ['u-tenis-branco', 'shoes', 'u', 'Tênis branco de couro', 240, 0xf7f7f7, 'couro', 'sapato'],
  ['u-panama', 'hat', 'u', 'Chapéu panamá', 190, 0xeadcb4, 'palha', 'panama', { band: 0x1b1b1b }],
  ['f-aba-larga', 'hat', 'f', 'Chapéu de palha aba larga', 210, 0xe6cf9a, 'palha', 'abalarga', { band: 0xff5fa2 }],
  ['u-bone-linho', 'hat', 'u', 'Boné de linho branco', 90, 0xf5f2ea, 'linho', 'bone'],
  ['m-fedora', 'hat', 'm', 'Fedora de palha', 230, 0xcdb27c, 'palha', 'panama', { band: 0x6b3e26, tall: 1 }],
  ['u-aviador', 'glasses', 'u', 'Óculos aviador dourado', 260, 0xd9b45a, 'metal', 'aviador', { lens: 0x3a2a1a }],
  ['f-gatinho', 'glasses', 'f', 'Óculos gatinho tartaruga', 240, 0x6b3e1e, 'acetato', 'gatinho', { lens: 0x24160e }],
  ['u-redondo', 'glasses', 'u', 'Óculos redondo preto', 180, 0x151515, 'acetato', 'redondo', { lens: 0x1d2a33 }],
  ['u-esportivo', 'glasses', 'u', 'Óculos esportivo neon', 200, 0xff4fb8, 'acetato', 'esportivo', { lens: 0x29f0ff }],
  ['f-tote-palha', 'bag', 'f', 'Bolsa de palha (tote)', 300, 0xd9c08a, 'palha', 'tote'],
  ['f-clutch-perola', 'bag', 'f', 'Clutch de seda pérola', 280, 0xf4efe6, 'seda', 'clutch'],
  ['u-pochete', 'bag', 'u', 'Pochete de couro caramelo', 220, 0x9c5a2c, 'couro', 'pochete'],
  ['u-mochila-linho', 'bag', 'u', 'Mochila de linho areia', 260, 0xd9c7a3, 'linho', 'mochila'],
];
export const ITEMS = {}; for (const [id, slot, sex, n, p, c, f, kind, x] of RAW) ITEMS[id] = Object.assign({ id, slot, sex, n, p, c, f, kind }, x || {});

// ---- personagens: sexo, roupa padrão (de graça) e pele/cabelo "civis" dos heróis (fora do traje)
export const CIVIL = {
  ela: { sex: 'f', eq: { top: 'f-blusa-seda-coral', bottom: 'f-pantalona-off', shoes: 'u-espadrille', glasses: 'f-gatinho' } },
  ele: { sex: 'm', eq: { top: 'm-camisa-linho', bottom: 'm-calca-linho-areia', shoes: 'm-mocassim', hat: 'u-panama' } },
  marisol: { sex: 'f', eq: { top: 'f-blusa-seda-esmeralda', bottom: 'f-pantalona-marfim', shoes: 'f-sandalia-dourada', bag: 'f-clutch-perola' } }, // t426: calça elegante (pantalona) no lugar do vestido
  teia: { sex: 'f', skin: 0xc68642, hair: 0x10141c, eq: { top: 'f-top-hibisco', bottom: 'f-saia-longa-turquesa', shoes: 'u-tenis-branco', glasses: 'u-esportivo' } },
  solar: { sex: 'm', skin: 0xe0ac69, hair: 0x3b2314, eq: { top: 'm-blazer-creme', bottom: 'm-chino-branco', shoes: 'm-mocassim', glasses: 'u-aviador' } },
  colosso: { sex: 'm', hair: 0x14110e, eq: { top: 'm-guayabera', bottom: 'm-calca-linho-areia', shoes: 'u-espadrille' } },
  sentinela: { sex: 'm', eq: { top: 'm-polo-menta', bottom: 'm-alfaiataria-perola', shoes: 'm-sapatenis', hat: 'u-bone-linho' } },
  ferreo: { sex: 'm', skin: 0xd9a066, hair: 0x2c2c2c, eq: { top: 'm-camisa-palmeiras', bottom: 'm-calca-seda-noite', shoes: 'm-mocassim', hat: 'm-fedora' } },
  atlas: { sex: 'm', skin: 0x3f5fa8, hair: 0x141826, eq: { top: 'm-camisa-linho', bottom: 'm-calca-seda-noite', shoes: 'm-mocassim', glasses: 'u-aviador' } },
  tita: { sex: 'm', eq: { top: 'm-cubana-coral', bottom: 'm-chino-branco', shoes: 'u-espadrille', glasses: 'u-redondo' } },
};
export const sexOf = (id) => (CIVIL[id] && CIVIL[id].sex) || 'f';
export function itemsFor(id) { const s = sexOf(id); return Object.values(ITEMS).filter(it => it.sex === 'u' || it.sex === s); }

// ---- trajes de herói (t410): ligas e poderes inventados
export const ALLOYS = {
  nano: { n: 'nano-metal com linhas de luz', c: 0x1a1f2a, m: 0.85, r: 0.24 },
  aurilio: { n: 'liga Aurílio (ouro-rosado raro)', c: 0xd9a07a, m: 0.92, r: 0.2 },
  cobalto: { n: 'Cobalto Estelar', c: 0x2346a8, m: 0.9, r: 0.24 },
  obsidiana: { n: 'Obsidiana Viva', c: 0x17131c, m: 0.7, r: 0.12 },
  coral: { n: 'Titânio Coral', c: 0xff7f6e, m: 0.85, r: 0.28 },
  boreal: { n: 'Cristal Boreal', c: 0x8fe9ff, m: 0.6, r: 0.1 },
  lunar: { n: 'Ferro-Lunar', c: 0xc9ced6, m: 0.95, r: 0.18 },
};
export const PERKS = {
  voo: { e: '🚀', n: 'Voo', d: 'pule duas vezes para voar (propulsores nos pés)' },
  escudo: { e: '🛡️', n: 'Escudo', d: 'bolha de energia que quica nas batidas' },
  velocidade: { e: '⚡', n: 'Velocidade', d: 'corre 45% mais rápido e solta rastro de luz' },
};
// [id, dono ('*' = Luna/Davi/Marisol), nome, liga, poder, cor do brilho, preço]
const SRAW = [
  ['teia-boreal', 'teia', 'Vértice Cristal Boreal', 'boreal', 'velocidade', 0x9cff3a, 4200], ['teia-obsidiana', 'teia', 'Vértice Obsidiana Viva', 'obsidiana', 'escudo', 0xff4fd8, 5200],
  ['solar-aurilio', 'solar', 'Solar Aurílio Mk II', 'aurilio', 'voo', 0xfff1b8, 6400], ['solar-cobalto', 'solar', 'Solar Cobalto Estelar', 'cobalto', 'escudo', 0x7fd8ff, 5600],
  ['colosso-coral', 'colosso', 'Colosso Titânio Coral', 'coral', 'escudo', 0xffd27a, 5000], ['colosso-lunar', 'colosso', 'Colosso Ferro-Lunar', 'lunar', 'velocidade', 0x7dff6a, 4600],
  ['sentinela-cobalto', 'sentinela', 'Sentinela Cobalto Alado', 'cobalto', 'voo', 0x4fb3ff, 6000], ['sentinela-nano', 'sentinela', 'Sentinela Nano-Relâmpago', 'nano', 'velocidade', 0x4ff7e0, 4400],
  ['ferreo-obsidiana', 'ferreo', 'Férreo Obsidiana Voadora', 'obsidiana', 'voo', 0x7dff9a, 6200], ['ferreo-aurilio', 'ferreo', 'Férreo Aurílio Blindado', 'aurilio', 'escudo', 0xffb14a, 5400],
  ['atlas-cobalto', 'atlas', 'Atlas Cobalto Estelar', 'cobalto', 'escudo', 0xffc44d, 5800], ['atlas-lunar', 'atlas', 'Atlas Ferro-Lunar Alado', 'lunar', 'voo', 0xffd27a, 6800],
  ['tita-boreal', 'tita', 'Titã Cristal Boreal', 'boreal', 'velocidade', 0xb36bff, 4800], ['tita-nano', 'tita', 'Titã Nano-Cometa', 'nano', 'voo', 0xff5fd2, 6600],
  ['nano-solara', '*', 'Nano-Metal Solara', 'nano', 'escudo', 0x29f0ff, 2500], ['aurilio-asa', '*', 'Asa-Sol de Aurílio', 'aurilio', 'voo', 0xffd27a, 6000], ['lunar-corrida', '*', 'Ferro-Lunar Corrida', 'lunar', 'velocidade', 0xff4f8b, 3800],
];
export const SUITS = { classico: { id: 'classico', n: 'Traje Clássico', p: 0, perk: null } };
for (const [id, who, n, alloy, perk, glow, p] of SRAW) SUITS[id] = { id, who, n, alloy, perk, glow, p };
export const isHero = (id) => !!HEROES[id];
export function suitsFor(id) { const L = Object.values(SUITS).filter(s => s.id !== 'classico' && (isHero(id) ? s.who === id : s.who === '*')); return isHero(id) ? [SUITS.classico, ...L] : L; }

// ---------------------------------------------------------------- geometria das peças
const STD = (c, f = 'algodao', o = {}) => { const F = FAB[f] || FAB.algodao; return new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: F.r, metalness: F.m }, o)); };
const GLW = (c, i = 2) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: i, roughness: 0.4, toneMapped: false });
const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };
const grp = (...m) => { const g = new THREE.Group(); for (const x of m) g.add(x); return g; };
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
// junta várias geometrias simples numa só (cachos, estampas): poucas chamadas de desenho
function merge(list) {
  const gs = list.map(g => g.index ? g.toNonIndexed() : g); const n = gs.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
function lcg(seed) { let s = seed >>> 0 || 7; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
// saia/vestido: perfil girado (cintura → barra rodada) com leve ondulação
function skirtGeo(len, flare) {
  const pts = []; const N = 7; for (let i = 0; i <= N; i++) { const t = i / N; pts.push(new THREE.Vector2(0.165 + (flare - 0.165) * Math.pow(t, 1.3), -t * len)); }
  const g = new THREE.LatheGeometry(pts, 22); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i); const a = Math.atan2(z, x); const w = 1 + Math.sin(a * 7) * 0.035 * (-y / len); p.setX(i, x * w); p.setZ(i, z * w * 0.9); }
  g.computeVertexNormals(); return g;
}
function printGeo(seed, back) { // estampa resort: florzinhas chapadas na frente/costas do tronco
  const r = lcg(seed); const L = [];
  for (let i = 0; i < 9; i++) { const c = new THREE.CircleGeometry(0.018 + r() * 0.014, 6); c.translate((r() - 0.5) * 0.24, (r() - 0.5) * 0.28, 0); L.push(c); }
  const g = merge(L); if (back) g.rotateY(Math.PI); return g;
}
export function curlsGeo(seed = 5) { // cabelo cacheado volumoso (cachos = pequenos icosaedros)
  const r = lcg(seed); const L = [];
  for (let i = 0; i < 90; i++) {
    const th = r() * Math.PI * 2, ph = r() * Math.PI * 0.62; let x = Math.sin(ph) * Math.cos(th), y = Math.cos(ph), z = Math.sin(ph) * Math.sin(th);
    if (z > 0.55 && y < 0.55) continue; // rosto livre
    const R = 0.15 + r() * 0.03; const g = new THREE.IcosahedronGeometry(0.038 + r() * 0.02, 0); g.translate(x * R, y * R * 1.02, z * R - 0.01); L.push(g);
  }
  for (let i = 0; i < 46; i++) { const a = (r() - 0.5) * Math.PI * 1.25; const y = -0.02 - r() * 0.2; const R = 0.14 + r() * 0.04; const g = new THREE.IcosahedronGeometry(0.04 + r() * 0.02, 0); g.translate(Math.sin(a) * R, y, -Math.cos(a) * R * 0.9 - 0.02); L.push(g); }
  return merge(L);
}
function hatObj(it) {
  const m = STD(it.c, it.f), band = STD(it.band || 0x222222, 'algodao');
  if (it.kind === 'bone') return grp(mesh(new THREE.SphereGeometry(0.135, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), m, 0, 0.0, 0), mesh(box(0.2, 0.012, 0.12), m, 0, 0.005, 0.15));
  if (it.kind === 'abalarga') { const brim = new THREE.CylinderGeometry(0.33, 0.35, 0.012, 28); const p = brim.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); const d = Math.hypot(x, z); p.setY(i, p.getY(i) - Math.max(0, d - 0.15) * 0.22 + Math.sin(Math.atan2(z, x) * 5) * 0.012 * d); } brim.computeVertexNormals();
    return grp(mesh(brim, STD(it.c, it.f, { side: THREE.DoubleSide })), mesh(new THREE.CylinderGeometry(0.115, 0.13, 0.11, 20), m, 0, 0.055, 0), mesh(new THREE.CylinderGeometry(0.131, 0.131, 0.03, 20), band, 0, 0.018, 0)); }
  const h = it.tall ? 0.13 : 0.1;
  return grp(mesh(new THREE.CylinderGeometry(0.21, 0.22, 0.012, 24), STD(it.c, it.f, { side: THREE.DoubleSide })), mesh(new THREE.CylinderGeometry(0.105, 0.125, h, 20), m, 0, h / 2, 0), mesh(new THREE.CylinderGeometry(0.127, 0.127, 0.03, 20), band, 0, 0.02, 0));
}
function glassesObj(it) {
  const fr = STD(it.c, it.f), lens = new THREE.MeshStandardMaterial({ color: it.lens || 0x222222, roughness: 0.05, metalness: 0.6, emissive: it.kind === 'esportivo' ? new THREE.Color(it.lens).multiplyScalar(0.25) : 0x000000 });
  const g = new THREE.Group();
  if (it.kind === 'esportivo') { g.add(mesh(box(0.2, 0.045, 0.012), lens, 0, 0, 0)); g.add(mesh(box(0.21, 0.012, 0.016), fr, 0, 0.026, 0)); }
  else for (const s of [-1, 1]) {
    const lg = it.kind === 'redondo' ? new THREE.CylinderGeometry(0.03, 0.03, 0.008, 16) : it.kind === 'aviador' ? new THREE.CylinderGeometry(0.034, 0.03, 0.008, 16) : box(0.068, 0.04, 0.008);
    const L = mesh(lg, lens, s * 0.045, 0, 0, it.kind === 'redondo' || it.kind === 'aviador' ? Math.PI / 2 : 0, 0, it.kind === 'gatinho' ? s * -0.18 : 0); if (it.kind === 'aviador') L.scale.set(1, 1, 1.15); g.add(L);
    g.add(mesh(box(it.kind === 'gatinho' ? 0.08 : 0.072, 0.01, 0.012), fr, s * 0.046, it.kind === 'gatinho' ? 0.024 : 0.022, 0.002, 0, 0, it.kind === 'gatinho' ? s * -0.25 : 0));
  }
  g.add(mesh(box(0.024, 0.008, 0.01), fr, 0, 0.01, 0));
  for (const s of [-1, 1]) g.add(mesh(box(0.006, 0.008, 0.12), fr, s * 0.08, 0.012, -0.06));
  return g;
}
function bagObj(it) {
  const m = STD(it.c, it.f), strap = STD(it.kind === 'tote' ? 0x9c6a3a : it.c, 'couro');
  if (it.kind === 'tote') return grp(mesh(new THREE.CylinderGeometry(0.16, 0.13, 0.26, 4, 1), m, 0, -0.13, 0, 0, Math.PI / 4), mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 12, Math.PI), strap, 0, 0.0, 0));
  if (it.kind === 'clutch') return grp(mesh(box(0.2, 0.11, 0.04), m), mesh(box(0.2, 0.05, 0.045), STD(0xd9b45a, 'metal'), 0, 0.035, 0));
  if (it.kind === 'pochete') return grp(mesh(new THREE.CapsuleGeometry(0.05, 0.12, 2, 8), m, 0, 0, 0, 0, 0, Math.PI / 2), mesh(box(0.42, 0.02, 0.02), strap, 0, 0.02, -0.08));
  return grp(mesh(box(0.26, 0.32, 0.12), m), mesh(box(0.22, 0.12, 0.05), m, 0, -0.07, 0.07)); // mochila
}

// t426: calça comprida de alfaiataria (pantalona): tubos cônicos presos à coxa e à canela, alinhados aos ossos do modelo
function legSeg(model, k, bone, next, r0, r1, m, extra, up = 0) {
  model.updateMatrixWorld(true); const a = model.getObjectByName(bone), b = model.getObjectByName(next); if (!a || !b) return;
  const pa = new THREE.Vector3().setFromMatrixPosition(a.matrixWorld), pb = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
  const ms = model.getWorldScale(new THREE.Vector3()).y || 1; const L = pa.distanceTo(pb) / (k || 1) * (1 + (extra || 0)) + up;
  const dir = pb.clone().sub(pa).normalize().applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()).invert());
  const g = new THREE.CylinderGeometry(r0, r1, L, 14, 2, true); g.translate(0, -L / 2 + up, 0);
  const o = new THREE.Mesh(g, m); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); o.userData.ms = ms;
  attach(model, bone, o, [0, 0, 0], k);
}
function trousers(model, k, it) {
  const m = STD(it.c, it.f, { side: THREE.DoubleSide }); const fl = it.flare || 1;
  for (const s of ['L', 'R']) { legSeg(model, k, 'UpperLeg' + s, 'LowerLeg' + s, 0.088, 0.068, m, 0.1); legSeg(model, k, 'LowerLeg' + s, 'Foot' + s, 0.07, 0.066 + 0.03 * fl, m, 0.02, 0.05); }
  attach(model, 'Hips', mesh(new THREE.CylinderGeometry(0.16, 0.172, 0.16, 18, 1, true), m), [0, 0.04, 0], k); // cós/quadril
  attach(model, 'Hips', mesh(new THREE.TorusGeometry(0.161, 0.008, 5, 22), STD(0xd9b45a, 'metal'), 0, 0, 0, Math.PI / 2), [0, 0.115, 0], k); // cinto fino dourado
}

// ---------------------------------------------------------------- aplicar um visual ao modelo
// look = { mode: 'civil'|'suit', eq: {slot:id}, suit: id } ; mats: materiais já clonados do modelo
export function applyLook(A, model, mats, k, look) {
  const by = {}; for (const m of mats) by[m.name] = m;
  const isH = !!A.hero; const civ = CIVIL[A.id] || CIVIL[A.base] || { sex: 'f', eq: {} };
  // realismo geral: pele com aspereza de pele, cabelo com leve brilho
  if (by.Skin) by.Skin.roughness = 0.58; if (by.Hair) { by.Hair.roughness = 0.42; by.Hair.metalness = 0.05; } if (by.HairBase) by.HairBase.roughness = 0.5;
  if (A.curls) { const hm = STD(by.Hair ? by.Hair.color.getHex() : 0x1a0f0a, 'algodao', { roughness: 0.7 }); attach(model, 'Head', mesh(curlsGeo(11), hm), [0, 0.11, -0.005], k); }
  if (A.hoops) for (const s of [-1, 1]) attach(model, 'Head', mesh(new THREE.TorusGeometry(0.022, 0.004, 6, 16), STD(0xe0b84f, 'metal'), 0, 0, 0, 0, Math.PI / 2, 0), [s * 0.118, 0.04, 0.0], k);
  if (look && look.mode === 'suit') return applySuit(A, model, mats, by, k, SUITS[look.suit] || SUITS.classico);
  // fora do traje: herói vira "civil" (pele/cabelo próprios)
  if (isH) { if (by.Skin) { by.Skin.color.setHex(civ.skin ?? A.colors.Skin); by.Skin.metalness = 0; } for (const n of ['Hair', 'HairBase']) if (by[n]) by[n].color.setHex(civ.hair ?? A.colors.Hair); if (by.Eyes) by.Eyes.color.setHex(0x1a1a1a); }
  const eq = Object.assign({}, civ.eq, (look && look.eq) || {}); const skin = by.Skin ? by.Skin.color.getHex() : 0x8a5a3c;
  const fab = (m, it) => { if (!m || !it) return; m.color.setHex(it.c); const F = FAB[it.f] || FAB.algodao; m.roughness = F.r; m.metalness = F.m; };
  const top = ITEMS[eq.top], bot = ITEMS[eq.bottom], sh = ITEMS[eq.shoes];
  fab(by.Shirt, top);
  const dress = top && top.kind === 'vestido';
  if (dress || (bot && bot.kind === 'saia')) { if (by.Pants) { by.Pants.color.setHex(skin); by.Pants.roughness = 0.58; by.Pants.metalness = 0; } }
  else fab(by.Pants, bot);
  fab(by.Shoes || by.Socks, sh);
  try {
    const sk = dress ? top : (bot && bot.kind === 'saia' ? bot : null);
    if (sk) { const len = sk.len || 0.55; const sm = STD(sk.c, sk.f, { side: THREE.DoubleSide }); attach(model, 'Hips', mesh(skirtGeo(len, 0.2 + len * 0.17), sm), [0, 0.13, 0.0], k);
      if (sk.print) attach(model, 'Hips', mesh(printGeo(3), STD(sk.print, 'seda'), 0, 0, 0), [0, -0.05, 0.2], k);
      if (sk.belt) attach(model, 'Hips', mesh(new THREE.TorusGeometry(0.168, 0.012, 6, 22), STD(sk.belt, 'couro'), 0, 0, 0, Math.PI / 2), [0, 0.13, 0], k); }
    if (!dress && bot && bot.kind === 'pantalona') trousers(model, k, bot);
    if (top) {
      if (top.print) { const pm = STD(top.print, top.f); attach(model, 'Torso', mesh(printGeo(7), pm), [0, 0.06, 0.148], k); attach(model, 'Torso', mesh(printGeo(9, true), pm), [0, 0.06, -0.14], k); }
      if (top.kind === 'camisa' || top.kind === 'guayabera' || top.kind === 'blazer') { // gola em V
        const cm = STD(top.kind === 'blazer' ? 0xf8f6f0 : top.c, top.f);
        attach(model, 'Torso', grp(mesh(box(0.1, 0.03, 0.03), cm, 0.045, 0, 0, 0, 0, -0.5), mesh(box(0.1, 0.03, 0.03), cm, -0.045, 0, 0, 0, 0, 0.5)), [0, 0.27, 0.11], k);
      }
      if (top.kind === 'guayabera') for (const s of [-1, 1]) attach(model, 'Torso', mesh(box(0.012, 0.3, 0.01), STD(0xffffff, 'linho')), [s * 0.07, 0.02, 0.15], k);
      if (top.kind === 'blazer') { const lap = STD(top.c, top.f); attach(model, 'Torso', mesh(box(0.07, 0.36, 0.012), STD(0xf8f6f0, 'linho')), [0, 0.05, 0.149], k);
        for (const s of [-1, 1]) attach(model, 'Torso', mesh(box(0.05, 0.22, 0.015), lap, 0, 0, 0, 0, 0, s * 0.25), [s * 0.06, 0.13, 0.156], k);
        attach(model, 'Torso', mesh(box(0.06, 0.02, 0.012), STD(0xff7f6e, 'seda')), [0.1, 0.17, 0.152], k); } // lenço no bolso
    }
    const hat = ITEMS[eq.hat]; if (hat) attach(model, 'Head', hatObj(hat), [0, A.curls ? 0.24 : 0.19, -0.005], k, [-0.08, 0, 0]);
    const gl = ITEMS[eq.glasses]; if (gl) attach(model, 'Head', glassesObj(gl), [0, 0.105, 0.128], k);
    const bag = ITEMS[eq.bag];
    if (bag) { const o = bagObj(bag); if (bag.kind === 'tote') attach(model, 'Torso', o, [0.21, -0.05, 0.0], k); else if (bag.kind === 'clutch') attach(model, 'PalmL', o, [0, -0.04, 0.05], k); else if (bag.kind === 'pochete') attach(model, 'Hips', o, [0, 0.09, 0.15], k); else attach(model, 'Torso', o, [0, 0.05, -0.19], k); }
  } catch (e) { console.info('roupa parcial:', e && e.message); }
}

// trajes de herói: liga metálica + linhas de luz + equipamento do poder
const SUIT_CLOTH = ['Shirt', 'Pants', 'Socks', 'Shoes']; const SKIN_SUIT = new Set(['teia', 'solar']);
function applySuit(A, model, mats, by, k, S) {
  if (S.id === 'classico') { if (A.hero) { heroMaterials(A, mats); try { A.gear(model, k); } catch (e) { } } return; }
  const L = ALLOYS[S.alloy] || ALLOYS.nano; const glow = S.glow;
  for (const m of mats) {
    const cloth = SUIT_CLOTH.includes(m.name) || (m.name === 'Skin' && A.hero && SKIN_SUIT.has(A.id));
    if (!cloth) continue; m.color.setHex(L.c); m.metalness = L.m; m.roughness = L.r; m.envMapIntensity = 1.5; m.emissive = new THREE.Color(glow).multiplyScalar(S.alloy === 'boreal' ? 0.12 : 0.05);
  }
  if (A.hero) { try { A.gear(model, k); } catch (e) { } }
  const gm = GLW(glow, 2); const line = (w, h, d) => mesh(box(w, h, d), gm);
  try {
    attach(model, 'Torso', grp(line(0.24, 0.026, 0.02).rotateZ(0.55).translateX(0.08), line(0.24, 0.026, 0.02).rotateZ(-0.55).translateX(-0.08)), [0, 0.06, 0.135], k);
    attach(model, 'Torso', line(0.024, 0.3, 0.02), [0, 0.0, -0.13], k); attach(model, 'Hips', line(0.34, 0.03, 0.26), [0, 0.06, 0], k);
    const dot = (r) => mesh(new THREE.SphereGeometry(r, 10, 8), gm);
    for (const s of ['L', 'R']) { attach(model, 'UpperArm' + s, dot(0.04), [0, 0, 0], k); attach(model, 'LowerLeg' + s, dot(0.04), [0, 0, 0.05], k); }
    // ombreiras de liga (placas facetadas)
    const plate = new THREE.MeshStandardMaterial({ color: L.c, metalness: L.m, roughness: L.r * 0.8 });
    for (const s of [1, -1]) attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', mesh(new THREE.DodecahedronGeometry(0.075, 0), plate), [s * 0.02, 0.04, 0], k);
    if (!A.hero) attach(model, 'Head', mesh(box(0.17, 0.028, 0.03), gm), [0, 0.11, 0.125], k); // viseira
    const flame = new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    if (S.perk === 'voo') {
      const jets = model.userData.jets || [];
      for (const s of ['L', 'R']) { const j = mesh(new THREE.ConeGeometry(0.07, 0.45, 8), flame, 0, -0.25, 0, Math.PI); j.visible = false; jets.push(j); attach(model, 'Foot' + s, j, [0, -0.05, 0], k); }
      model.userData.jets = jets;
      for (const s of [1, -1]) attach(model, 'Torso', mesh(box(0.03, 0.42, 0.11), gm, 0, 0, 0, 0, 0, s * 0.5), [s * 0.14, 0.05, -0.17], k); // asas de luz nas costas
    } else if (S.perk === 'escudo') {
      for (const s of ['L', 'R']) attach(model, 'LowerArm' + s, mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.02, 16), gm, 0, 0, 0, 0, 0, Math.PI / 2), [0, -0.12, 0], k);
      const bub = new THREE.Mesh(new THREE.SphereGeometry(1.1, 24, 16), new THREE.MeshBasicMaterial({ color: glow, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      bub.visible = false; attach(model, 'Hips', bub, [0, 0, 0], k); model.userData.bubble = bub;
    } else if (S.perk === 'velocidade') {
      for (const s of ['L', 'R']) for (const sx of [-1, 1]) attach(model, 'LowerLeg' + s, mesh(box(0.012, 0.22, 0.06), gm), [sx * 0.065, -0.12, -0.02], k);
      model.userData.speedFx = true;
    }
  } catch (e) { console.info('traje parcial:', e && e.message); }
}

// ---------------------------------------------------------------- estado salvo por personagem
export class Wardrobe {
  constructor(G) { this.G = G; const S = G.save; S.ward = S.ward || {}; }
  rec(id) { const W = this.G.save.ward; if (!W[id]) W[id] = { own: [], eq: {}, suit: isHero(id) ? 'classico' : null, mode: isHero(id) ? 'suit' : 'civil' }; const r = W[id]; r.own = r.own || []; r.eq = r.eq || {}; return r; }
  look(id) { const r = this.rec(id); return { mode: r.mode === 'suit' && (r.suit || isHero(id)) ? 'suit' : 'civil', eq: r.eq, suit: r.suit || 'classico' }; }
  owns(id, itemId) { const c = CIVIL[id]; if (c && Object.values(c.eq).includes(itemId)) return true; if (itemId === 'classico' && isHero(id)) return true; return this.rec(id).own.includes(itemId); }
  equipped(id, it) { const r = this.rec(id); const eq = Object.assign({}, (CIVIL[id] || {}).eq || {}, r.eq); return it.slot ? eq[it.slot] === it.id && r.mode === 'civil' : r.suit === it.id && r.mode === 'suit'; }
  price(itemId) { return (ITEMS[itemId] || SUITS[itemId] || {}).p || 0; }
  buy(id, itemId) {
    const G = this.G, it = ITEMS[itemId] || SUITS[itemId]; if (!it) return false; if (this.owns(id, itemId)) return this.equip(id, itemId);
    if (G.save.money < it.p) { G.ui.toast(`💸 Faltam <b>$${(it.p - G.save.money).toLocaleString('pt-BR')}</b> para <b>${it.n}</b> · ganhe com corridas, ponte, entregas e táxi`, 2600); G.audio.chime && G.audio.chime('fail'); return false; }
    G.addMoney(-it.p); this.rec(id).own.push(itemId); G.audio.chime && G.audio.chime('coin'); this.equip(id, itemId, true);
    G.ui.toast(`🛍️ <b>${it.n}</b> comprado por $${it.p.toLocaleString('pt-BR')} e já vestido!`, 2600); return true;
  }
  equip(id, itemId, quiet) {
    const r = this.rec(id), it = ITEMS[itemId] || SUITS[itemId]; if (!it || !this.owns(id, itemId)) return false;
    if (ITEMS[itemId]) { const cur = Object.assign({}, (CIVIL[id] || {}).eq || {}, r.eq); if (cur[it.slot] === itemId && r.mode === 'civil' && ['hat', 'glasses', 'bag'].includes(it.slot)) r.eq[it.slot] = ''; else r.eq[it.slot] = itemId; if (it.kind === 'saia' || it.kind === 'calca') { const t = ITEMS[cur.top]; if (t && t.kind === 'vestido') r.eq.top = sexOf(id) === 'f' ? 'f-blusa-seda-champanhe' : r.eq.top; if (!this.owns(id, r.eq.top)) r.eq.top = cur.top; } r.mode = 'civil'; }
    else { r.suit = itemId; r.mode = 'suit'; }
    this.G.persist && this.G.persist(); this.refresh(id); if (!quiet) this.G.audio.chime && this.G.audio.chime('coin'); return true;
  }
  setMode(id, mode) { const r = this.rec(id); if (mode === 'suit' && !r.suit && !isHero(id)) return false; r.mode = mode; this.G.persist && this.G.persist(); this.refresh(id); return true; }
  refresh(id) { const G = this.G; if (G.hero && G.hero.id === id) { G.hero.setAvatar(id); if (G.updatePowBtn) G.updatePowBtn(); } }
  // poder extra do traje vestido (null = nenhum)
  perk(id) { id = id || (this.G.hero && this.G.hero.id); const L = this.look(id); if (L.mode !== 'suit') return null; const S = SUITS[L.suit]; return S && S.perk || null; }
  speedK() { return this.perk() === 'velocidade' ? 1.45 : 1; }
}
// moradores que conversam: um visual Miami sorteado (sempre o mesmo para a mesma pessoa)
export function npcLook(base, seed) {
  const r = lcg((seed * 2654435761) >>> 0); const sex = base === 'ele' ? 'm' : 'f'; const eq = {};
  const pickS = (slot, f) => { const L = Object.values(ITEMS).filter(it => it.slot === slot && (it.sex === 'u' || it.sex === sex) && (!f || f(it))); return L.length ? L[Math.floor(r() * L.length)].id : undefined; };
  eq.top = pickS('top'); eq.bottom = pickS('bottom'); eq.shoes = pickS('shoes');
  eq.hat = r() < 0.35 ? pickS('hat') : ''; eq.glasses = r() < 0.45 ? pickS('glasses') : ''; eq.bag = sex === 'f' && r() < 0.5 ? pickS('bag') : '';
  return { mode: 'civil', eq };
}
