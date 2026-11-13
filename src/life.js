// Vida na cidade: bares, restaurantes, cafés, balada de praia e academia ao ar livre (geometria juntada = poucas chamadas de desenho)
// + agenda diária dos moradores (casa → trabalho → café/bar → praia/academia → casa), ligada ao relógio do jogo.
import * as THREE from 'three';
import { MeshBuilder, C, canvasTex, rng, clamp } from './util.js';
import { BLOCKS, collide, addBox, walkable, HOOKS } from './world.js';

export const KINDS = {
  cafe: { emoji: '☕', open: [6, 19] }, sorveteria: { emoji: '🍦', open: [10, 22] }, restaurante: { emoji: '🍽️', open: [11, 23] },
  bar: { emoji: '🍹', open: [17, 3] }, balada: { emoji: '🪩', open: [21, 4] }, academia: { emoji: '💪', open: [6, 20] },
};
export const VENUES = []; // { name, kind, x, z, seats:[{x,z,h,occ}], open, col }
export const SPOTS = { gym: [], dance: [], chat: [], shop: [], dog: [] };
export const isOpen = (v, h) => { const [a, b] = v.open; return a < b ? h >= a && h < b : h >= a || h < b; };

const DEFS = [
  { name: 'Café Brisa', kind: 'cafe', at: ['prom', -520], col: 0xff8a3c, neon: '#ffb35c' },
  { name: 'Sorveteria Coco Gelado', kind: 'sorveteria', at: ['prom', -385], col: 0x5fd3ff, neon: '#7dfcff' },
  { name: 'Bar Maré Alta', kind: 'bar', at: ['prom', -120], col: 0x18a0a6, neon: '#29f0ff' },
  { name: 'Restaurante Luar', kind: 'restaurante', at: ['prom', 85], col: 0x7d4dff, neon: '#c9a6ff' },
  { name: 'Açaí do Píer', kind: 'cafe', at: ['prom', 235], col: 0x8e24aa, neon: '#ff7ae0', open: [8, 21] },
  { name: 'Lanchonete Onda', kind: 'restaurante', at: ['prom', 385], col: 0xffc61a, neon: '#ffe27a', open: [7, 22] },
  { name: 'Bar Neon Coral', kind: 'bar', at: ['prom', 525], col: 0xff4f6d, neon: '#ff6b8b' },
  { name: 'Café Aurora', kind: 'cafe', at: ['tower', 1, 3], col: 0xf2a65a, neon: '#ffd08a' },
  { name: 'Bistrô Centro', kind: 'restaurante', at: ['tower', 0, 4], col: 0xc0392b, neon: '#ff8a7a' },
  { name: 'Padaria Sol Nascente', kind: 'cafe', at: ['tower', 1, 5], col: 0xe9c25a, neon: '#ffe27a', open: [6, 15] },
  { name: 'Bar Arranha-Céu', kind: 'bar', at: ['tower', 0, 2], col: 0x2e86de, neon: '#7ab8ff' },
  { name: 'Quiosque do Parque', kind: 'cafe', at: ['park'], col: 0x46c08c, neon: '#8affc1', open: [7, 20] },
  { name: 'Pulso Beach Club', kind: 'balada', at: ['club', 347, -262], col: 0x1c1c2e, neon: '#ff3fd8' },
  { name: 'Academia da Praia', kind: 'academia', at: ['gym', 342, 142], col: 0x2f4f86, neon: '#ffd23f' },
];

const tmp = new THREE.Vector3();
const free = (x, z, r) => { if (!walkable(x, z)) return false; tmp.set(x, 0, z); return !collide(tmp, r, false, 0.5); };

export function buildLife(G) {
  const scene = G.scene, Q = G.Q, R = rng(777);
  const groups = new Map(); // por região (deixa o frustum culling trabalhar)
  const grp = (x, z) => { const k = x > 200 ? (z < 0 ? 'ps' : 'pn') : 'dt'; let g = groups.get(k); if (!g) groups.set(k, g = { solid: new MeshBuilder(), lights: new MeshBuilder(), signs: new MeshBuilder() }); return g; };
  const W = C(0xffffff), WOOD = C(0x9a7652), MET = C(0x50565e), DARK = C(0x23242b);
  // placas neon: um atlas só
  const rows = DEFS.length; const atlas = canvasTex(512, 64 * rows, (g) => {
    g.clearRect(0, 0, 512, 64 * rows); g.textAlign = 'center'; g.textBaseline = 'middle';
    DEFS.forEach((d, i) => { const y = i * 64 + 32; g.font = `bold ${d.name.length > 18 ? 34 : 40}px "Trebuchet MS", sans-serif`; g.fillStyle = d.neon; g.shadowColor = d.neon; g.shadowBlur = 14; g.fillText(d.name, 256, y); g.shadowBlur = 4; g.fillStyle = '#ffffff'; g.globalAlpha = 0.55; g.fillText(d.name, 256, y); g.globalAlpha = 1; });
  }, { clamp: true });
  const sign = (B, i, x, y, z, w, ry) => { // plano com a linha i do atlas, visível dos dois lados
    const h = w / 8, v0 = 1 - (i + 1) / rows, v1 = 1 - i / rows; const cs = Math.cos(ry), sn = Math.sin(ry);
    const T = (a, b) => [x + a * cs, y + b, z - a * sn]; const n = [sn, 0, cs];
    B.quad(T(-w / 2, -h / 2), T(w / 2, -h / 2), T(w / 2, h / 2), T(-w / 2, h / 2), n, [[0, v0], [1, v0], [1, v1], [0, v1]], W);
    const nb = [-sn, 0, -cs]; B.quad(T(w / 2, -h / 2), T(-w / 2, -h / 2), T(-w / 2, h / 2), T(w / 2, h / 2), nb, [[1, v0], [0, v0], [0, v1], [1, v1]], W);
  };
  const cyl = (B, r0, r1, h, x, y, z, col, seg = 8) => { const g = new THREE.CylinderGeometry(r0, r1, h, seg); B.addGeo(g, new THREE.Matrix4().makeTranslation(x, y + h / 2, z), col); g.dispose(); };
  const table = (B, x, z, col, umbrella, high) => {
    const ty = high ? 1.05 : 0.74; cyl(B, 0.05, 0.07, ty, x, 0.16, z, MET); cyl(B, 0.46, 0.46, 0.05, x, 0.16 + ty, z, high ? DARK : W, 12);
    cyl(B, 0.04, 0.04, 0.11, x - 0.15, 0.21 + ty, z + 0.1, C(0xffffff)); cyl(B, 0.035, 0.035, 0.14, x + 0.16, 0.21 + ty, z - 0.08, C(R() < 0.5 ? 0xff9a3c : 0x9cff3a)); // copos (sucos)
    if (umbrella) { cyl(B, 0.03, 0.03, 2.2, x, 0.16, z, W); const g = new THREE.ConeGeometry(1.35, 0.5, 8, 1, true); B.addGeo(g, new THREE.Matrix4().makeTranslation(x, 2.55, z), C(col)); g.dispose(); }
  };
  const chair = (B, x, z, h, high) => { // h = direção para onde a pessoa olha
    const sy = high ? 0.78 : 0.45; const bx = x - Math.sin(h) * 0.2, bz = z - Math.cos(h) * 0.2;
    B.box(x, 0.16 + sy / 2, z, 0.06, sy, 0.06, MET); B.box(x, 0.16 + sy, z, 0.42, 0.05, 0.42, WOOD, { ry: h });
    if (!high) B.box(bx, 0.16 + sy + 0.24, bz, 0.42, 0.45, 0.05, WOOD, { ry: h });
  };
  const bulbs = (B, pts, col) => { for (let i = 0; i < pts.length - 1; i++) { const [a, b] = [pts[i], pts[i + 1]]; for (let k = 0; k <= 6; k++) { const t = k / 6; const sag = Math.sin(t * Math.PI) * 0.35; B.box(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t - sag, a[2] + (b[2] - a[2]) * t, 0.12, 0.12, 0.12, C(col)); } } };

  DEFS.forEach((d, i) => {
    const v = { name: d.name, kind: d.kind, col: d.col, open: d.open || KINDS[d.kind].open, seats: [], emoji: KINDS[d.kind].emoji, x: 0, z: 0 };
    const at = d.at; const umb = d.kind !== 'bar' && d.kind !== 'balada' && d.kind !== 'academia';
    if (at[0] === 'prom') {
      const zc = at[1]; const B = grp(320, zc); v.x = 316; v.z = zc;
      // quiosque na areia, balcão virado para o calçadão
      B.solid.box(328.6, 1.45, zc, 3.4, 2.6, 5, C(d.col), { ao: 0.8 }); B.solid.box(328.6, 2.85, zc, 3.8, 0.2, 5.6, W);
      B.solid.box(326.6, 1.1, zc, 0.5, 1.1, 4.6, WOOD); B.solid.box(325.9, 2.45, zc, 1.5, 0.08, 5.6, C(d.col)); // balcão e toldo
      sign(B.signs, i, 326.45, 3.7, zc, 7.6, -Math.PI / 2);
      addBox(326.2, zc - 2.6, 330.4, zc + 2.6, 3.2);
      for (const sz of [-1.5, 0, 1.5]) { const sx = 325.4; v.seats.push({ x: sx, z: zc + sz, h: Math.PI / 2, stand: true, occ: null }); }
      const high = d.kind === 'bar';
      for (const tx of [309.7, 312.9]) for (const tz of [-4.6, 0, 4.6]) {
        const x = tx, z = zc + tz; if (!free(x, z, 1.0)) continue;
        table(B.solid, x, z, R() < 0.5 ? d.col : 0xffffff, umb, high);
        for (const s of [-1, 1]) { const cz = z + s * 0.78, h = s > 0 ? Math.PI : 0; chair(B.solid, x, cz, h, high); v.seats.push({ x, z: cz, h, occ: null, table: [x, z], y: high ? 0.33 : 0 }); }
      }
      if (high || d.kind === 'restaurante') { bulbs(B.lights, [[308.6, 2.9, zc - 7], [308.6, 2.9, zc + 7]], 0xffe2a0); bulbs(B.lights, [[314, 2.9, zc - 7], [314, 2.9, zc + 7]], 0xffe2a0); for (const [x, z] of [[308.6, zc - 7], [308.6, zc + 7], [314, zc - 7], [314, zc + 7]]) B.solid.box(x, 1.6, z, 0.08, 2.9, 0.08, MET); }
      SPOTS.chat.push({ x: 321.2, z: zc + 9, h: 0, n: 0 }, { x: 321.2, z: zc - 9, h: 0, n: 0 });
    } else if (at[0] === 'tower' || at[0] === 'park') {
      const b = at[0] === 'park' ? BLOCKS.find(b => b.kind === 'park') : BLOCKS.find(b => b.kind === 'tower' && b.x0 === [-660, -540, -420][at[1]] && b.z0 === -600 + at[2] * 150);
      if (!b) return; const cx = at[0] === 'park' ? b.ix0 + 12 : b.ix0 + 10, cz = at[0] === 'park' ? b.iz1 - 12 : b.iz0 + 10; const B = grp(cx, cz); v.x = cx; v.z = cz;
      if (!free(cx - 4, cz, 1.6)) return; // sem espaço: pula
      B.solid.box(cx - 4.6, 1.2, cz, 1.6, 2.1, 3, C(d.col), { ao: 0.8 }); B.solid.box(cx - 3.6, 2.35, cz, 1.2, 0.08, 3.4, W); B.solid.box(cx - 3.85, 1.0, cz, 0.3, 0.9, 2.8, WOOD);
      sign(B.signs, i, cx - 4.6, 2.85, cz, 4.6, Math.PI / 2); addBox(cx - 5.5, cz - 1.6, cx - 3.6, cz + 1.6, 3);
      v.seats.push({ x: cx - 3.1, z: cz - 0.8, h: -Math.PI / 2, stand: true, occ: null }, { x: cx - 3.1, z: cz + 0.8, h: -Math.PI / 2, stand: true, occ: null });
      const high = d.kind === 'bar';
      for (const tx of [0, 3.4]) for (const tz of [-3.2, 0.4, 4]) {
        const x = cx + tx, z = cz + tz; if (!free(x, z, 1.0)) continue;
        table(B.solid, x, z, d.col, umb, high);
        for (const s of [-1, 1]) { const zz = z + s * 0.78, h = s > 0 ? Math.PI : 0; chair(B.solid, x, zz, h, high); v.seats.push({ x, z: zz, h, occ: null, table: [x, z], y: high ? 0.33 : 0 }); }
      }
      if (high) bulbs(B.lights, [[cx - 1.5, 2.8, cz - 5], [cx + 5, 2.8, cz - 5], [cx + 5, 2.8, cz + 6]], 0xffe2a0);
      SPOTS.chat.push({ x: cx + 7, z: cz + 8, h: 0, n: 0 });
      if (at[0] === 'park') for (let k = 0; k < 5; k++) SPOTS.dog.push({ x: b.ix0 + 15 + k * 18, z: b.iz0 + 20 + (k % 2) * 40 });
    } else if (at[0] === 'club') {
      const [cx, cz] = [at[1], at[2]]; const B = grp(cx, cz); v.x = cx; v.z = cz;
      // pista de dança iluminada, cabine do DJ, caixas de som e arco neon
      const floor = new MeshBuilder(); const cols = [0xff3fd8, 0x29f0ff, 0x7d4dff, 0xffd23f];
      for (let ix = 0; ix < 8; ix++) for (let iz = 0; iz < 6; iz++) floor.box(cx - 7 + ix * 2 + 1, 0.12, cz - 6 + iz * 2 + 1, 1.9, 0.08, 1.9, C(cols[(ix + iz) % 4]));
      const fm = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); const fmesh = new THREE.Mesh(floor.geometry(), fm); scene.add(fmesh); v.floorMat = fm;
      B.solid.box(cx + 9, 0.7, cz, 2.2, 1.2, 4.5, DARK); B.solid.box(cx + 9.6, 1.9, cz, 0.6, 2.4, 6, C(0x2a2a3a));
      for (const s of [-1, 1]) B.solid.box(cx + 9, 1.4, cz + s * 3.8, 1.1, 2.6, 1.1, DARK);
      sign(B.signs, i, cx + 9.95, 3.9, cz, 8.5, -Math.PI / 2); addBox(cx + 7.9, cz - 4.4, cx + 10.2, cz + 4.4, 3.2);
      bulbs(B.lights, [[cx - 8, 3.2, cz - 7], [cx + 8, 3.2, cz - 7], [cx + 8, 3.2, cz + 7], [cx - 8, 3.2, cz + 7], [cx - 8, 3.2, cz - 7]], 0xff7ae0);
      for (const [x, z] of [[cx - 8, cz - 7], [cx + 8, cz - 7], [cx + 8, cz + 7], [cx - 8, cz + 7]]) B.solid.box(x, 1.7, z, 0.12, 3.2, 0.12, MET);
      for (let k = 0; k < 18; k++) SPOTS.dance.push({ x: cx - 6 + (k % 6) * 2.3 + (R() - 0.5), z: cz - 4.5 + Math.floor(k / 6) * 3.6 + (R() - 0.5), h: Math.PI / 2 + (R() - 0.5) * 1.2, occ: null });
      v.seats.push({ x: cx + 7.2, z: cz, h: Math.PI / 2, stand: true, occ: null, dj: true });
    } else if (at[0] === 'gym') {
      const [cx, cz] = [at[1], at[2]]; const B = grp(cx, cz); v.x = cx; v.z = cz;
      B.solid.hrect(cx - 7, cz - 6, cx + 7, cz + 6, 0.05, C(0x3d5a80));
      for (const k of [-1, 1]) { B.solid.box(cx + k * 5, 1.25, cz - 4, 0.1, 2.5, 0.1, MET); B.solid.box(cx + k * 5, 1.25, cz - 1.5, 0.1, 2.5, 0.1, MET); B.solid.box(cx + k * 5, 2.45, cz - 2.75, 0.06, 0.06, 2.5, C(0xc8ccd0)); }
      for (const z of [2, 4]) B.solid.box(cx, 0.3, cz + z, 3, 0.25, 0.6, C(0x1c1c1e));
      sign(B.signs, i, cx, 3.2, cz - 6.2, 5, 0); B.solid.box(cx - 2.6, 1.6, cz - 6.2, 0.1, 3.2, 0.1, MET); B.solid.box(cx + 2.6, 1.6, cz - 6.2, 0.1, 3.2, 0.1, MET);
      for (let k = 0; k < 8; k++) SPOTS.gym.push({ x: cx - 4.5 + (k % 4) * 3, z: cz - 0.5 + Math.floor(k / 4) * 3.5, h: (R() - 0.5) * 2, occ: null, ex: k % 3 });
    }
    if (v.seats.length || v.kind === 'balada' || v.kind === 'academia') VENUES.push(v);
  });
  // conversa em dupla: calçadão, praia e praças
  for (let z = -600; z <= 600; z += 55) SPOTS.chat.push({ x: 321, z: z + 7, h: 0, n: 0 }, { x: 345 + (z % 3) * 6, z: z + 20, h: 0, n: 0 });
  for (let z = -560; z <= 560; z += 70) SPOTS.dog.push({ x: 316, z }, { x: 352, z: z + 30 });
  // vitrines: calçada em frente às lojas dos quarteirões art déco e hotéis
  for (const b of BLOCKS) if (b.kind === 'deco' || b.kind === 'hotel') for (let z = b.iz0 + 8; z < b.iz1 - 8; z += 22) { SPOTS.shop.push({ x: b.ix1 + 0.9, z, h: -Math.PI / 2, occ: null }); SPOTS.shop.push({ x: b.ix0 - 0.9, z, h: Math.PI / 2, occ: null }); }
  // malhas
  const solidM = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.05 });
  const lightM = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const signM = new THREE.MeshBasicMaterial({ map: atlas, transparent: true, depthWrite: false, toneMapped: false, side: THREE.FrontSide });
  for (const g of groups.values()) {
    const s = new THREE.Mesh(g.solid.geometry(), solidM); s.castShadow = Q.level !== 'low'; s.receiveShadow = true; scene.add(s);
    if (g.lights.count) scene.add(new THREE.Mesh(g.lights.geometry(), lightM));
    if (g.signs.count) { const m = new THREE.Mesh(g.signs.geometry(), signM); m.renderOrder = 3; scene.add(m); }
  }
  const club = VENUES.find(v => v.kind === 'balada');
  HOOKS.map.push((g, X, Z) => { g.font = '13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const v of VENUES) { g.fillStyle = '#000a'; g.beginPath(); g.arc(X(v.x), Z(v.z), 8, 0, 7); g.fill(); g.fillText(v.emoji, X(v.x), Z(v.z) + 1); } });
  return {
    venues: VENUES,
    update(dt, t, night, hour) {
      lightM.color.setScalar(0.35 + night * 1.6); signM.color.setScalar(0.75 + night * 1.0);
      if (club && club.floorMat) { const on = isOpen(club, hour); club.floorMat.color.setHSL((t * 0.08) % 1, on ? 0.7 : 0, on ? 0.35 + 0.25 * (Math.sin(t * 7.5) > 0 ? 1 : 0.4) : 0.18); }
    },
    nearest(x, z, hour, maxD = 30) { let best = null, bd = maxD; for (const v of VENUES) { if (!isOpen(v, hour)) continue; const d = Math.hypot(v.x - x, v.z - z); if (d < bd) { bd = d; best = v; } } return best ? { v: best, d: bd } : null; },
  };
}

// ---------------- agenda diária por persona (horas do jogo; a última faixa pode atravessar a meia-noite)
export const PERSONAS = {
  trabalhador: [[6, 8, 'cafe'], [8, 12, 'trabalho'], [12, 13.5, 'almoco'], [13.5, 18, 'trabalho'], [18, 20.5, 'bar'], [20.5, 22.5, 'passeio'], [22.5, 6, 'casa']],
  aposentado: [[5.5, 8, 'caminhada'], [8, 10, 'cafe'], [10, 12, 'compras'], [12, 15, 'casa'], [15, 18, 'praia'], [18, 20, 'passeio'], [20, 5.5, 'casa']],
  atleta: [[5, 7.5, 'corrida'], [7.5, 10, 'academia'], [10, 16, 'trabalho'], [16, 18, 'academia'], [18, 19.5, 'corrida'], [19.5, 22, 'jantar'], [22, 5, 'casa']],
  surfista: [[6, 11, 'praia'], [11, 13, 'almoco'], [13, 18, 'praia'], [18, 21, 'bar'], [21, 23.5, 'balada'], [23.5, 6, 'casa']],
  turista: [[8, 10, 'cafe'], [10, 13, 'passeio'], [13, 15, 'almoco'], [15, 18, 'praia'], [18, 22, 'jantar'], [22, 23.5, 'passeio'], [23.5, 8, 'casa']],
  festeiro: [[0, 4, 'balada'], [4, 12, 'casa'], [12, 14, 'almoco'], [14, 18, 'praia'], [18, 21, 'bar'], [21, 24, 'balada']],
  tutor: [[6, 8, 'cachorro'], [8, 12, 'compras'], [12, 13.5, 'almoco'], [13.5, 17, 'trabalho'], [17, 19.5, 'cachorro'], [19.5, 22, 'passeio'], [22, 6, 'casa']],
};
export const PERSONA_LIST = ['trabalhador', 'trabalhador', 'aposentado', 'atleta', 'surfista', 'turista', 'turista', 'festeiro', 'tutor', 'trabalhador'];
export function activity(persona, h, prev) {
  const S = PERSONAS[persona] || PERSONAS.trabalhador;
  let cur = 'passeio', start = 0;
  for (const [a, b, act] of S) if (a < b ? h >= a && h < b : h >= a || h < b) { cur = act; start = a; break; }
  // histerese de ~21 min do relógio (game-ai): na fronteira o NPC não “pisca” de uma atividade para outra
  if (prev && prev !== cur) { const elapsed = h >= start ? h - start : h + 24 - start; if (elapsed < 0.35) return prev; }
  return cur;
}
export const ACT_LABEL = { casa: 'indo para casa', trabalho: 'indo trabalhar', cafe: 'no café', almoco: 'almoçando', jantar: 'jantando', bar: 'no bar', compras: 'fazendo compras', praia: 'na praia', corrida: 'correndo na orla', cachorro: 'passeando com o cachorro', academia: 'na academia', balada: 'na balada', passeio: 'passeando', caminhada: 'caminhando' };
