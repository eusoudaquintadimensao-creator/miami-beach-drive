// Ilhas (t367): pela volta da Ponte do Mar aparece uma ilha de formato diferente a cada ~1 minuto (redonda, meia-lua,
// gêmeas, atol com lagoa, morro, comprida, estrela, mangue dos jacarés, farol…) com mansões, piscinas, palmeiras,
// guarda-sóis, píer e lancha atracada; fauna viva (gaivotas batendo asas, jacarés tomando sol e nadando, flamingos e
// golfinhos saltando). Em volta do mapa inteiro, um anel de ilhas e barcos navegando ~200 m mar adentro faz a cidade
// parecer bem maior. Tudo geometria própria (sem assets externos): 1 malha por ilha (construída sob demanda, recorte por
// distância), fauna e barcos instanciados; orçamento menor no modo leve.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, clamp } from './util.js';
import { isWaterDeep, WATER_Y, addBox, HOOKS } from './world.js';

// ---- tema (o Neon Distrito pode trocar só este bloco)
export const ILHAS = {
  kinds: [
    { k: 'round', name: 'Ilha Coral' }, { k: 'crescent', name: 'Ilha Meia-Lua' }, { k: 'twin', name: 'Ilhas Gêmeas' },
    { k: 'atoll', name: 'Atol Turquesa' }, { k: 'hill', name: 'Ilha do Morro' }, { k: 'long', name: 'Ilha Comprida' },
    { k: 'star', name: 'Ilha Estrela' }, { k: 'swamp', name: 'Ilha dos Jacarés' }, { k: 'light', name: 'Ilha do Farol' },
    { k: 'blob', name: 'Ilha das Palmeiras' },
  ],
  far: ['Ilha Sereia', 'Ilha Pelicano', 'Ilha Brisa', 'Ilha Concha', 'Ilha Arrecife', 'Ilha Gaivota', 'Ilha Marola', 'Ilha Sol Poente', 'Ilha Âncora', 'Ilha Tartaruga', 'Ilha Horizonte', 'Ilha Lagosta', 'Ilha Veleiro', 'Ilha Areia Branca', 'Ilha Golfinho', 'Ilha Mangue', 'Ilha Recanto', 'Ilha Maresia'],
  mansion: [0xfff6ea, 0xf7dccb, 0xd9f1ee, 0xfde3ef, 0xe8e3ff, 0xfff0c9], accent: [0x2ec4b6, 0xff6fa8, 0xffb703, 0x3a86ff, 0x8338ec],
  sand: 0xe8d6a8, grass: 0x6f9a4a, swamp: 0x4f6e3a, rock: 0x8b8378,
};
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function paint(g, col, jit = 0, r) { g = g.index ? g.toNonIndexed() : g; const c = new THREE.Color(col); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i += 3) { const k = jit ? 1 - jit / 2 + (r ? r() : Math.random()) * jit : 1; for (let j = i; j < Math.min(n, i + 3); j++) { a[j * 3] = c.r * k; a[j * 3 + 1] = c.g * k; a[j * 3 + 2] = c.b * k; } } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); return g; }
function box(sx, sy, sz, x, y, z, col, ry = 0, rx = 0, rz = 0) { const g = new THREE.BoxGeometry(sx, sy, sz); if (rz) g.rotateZ(rz); if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); g.translate(x, y, z); return paint(g, col); }
function merge(list) { list = list.filter(Boolean).map(g => { g = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); if (!g.attributes.normal) g.computeVertexNormals(); return g; }); return list.length ? mergeGeometries(list) : null; }
// gira/translada uma geometria (local da casa → local da ilha)
function place(g, x, y, z, ry) { if (ry) g.rotateY(ry); g.translate(x, y, z); return g; }
function inPoly(x, z, pts) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const [xi, zi] = pts[i], [xj, zj] = pts[j]; if ((zi > z) !== (zj > z) && x < (xj - xi) * (z - zi) / (zj - zi) + xi) c = !c; } return c; }
function inPolys(x, z, P) { for (const p of P) if (inPoly(x, z, p.pts) && !(p.holes || []).some(h => inPoly(x, z, h))) return true; return false; }

// contorno da ilha (lista de polígonos com furos) recuado `ins` metros para dentro (areia = 0, grama ≈ 7)
export function outline(kind, R, P, ins = 0) {
  const N = 44, out = [];
  const radial = (cx, cz, rf, ins2, sx = 1, sz = 1) => { const pts = []; for (let i = 0; i < N; i++) { const t = i / N * Math.PI * 2; const r = Math.max(1.5, rf(t) - ins2); pts.push([cx + Math.cos(t) * r * sx, cz + Math.sin(t) * r * sz]); } return pts; };
  const wob = (t) => 1 + P.a1 * Math.sin(3 * t + P.ph) + P.a2 * Math.sin(7 * t + P.ph * 2);
  switch (kind) {
    case 'crescent': {
      const T = 2.35, M = 26, w = (t) => R * (0.07 + 0.5 * Math.cos(t / T * Math.PI / 2)); const tl = [];
      for (let i = 0; i <= M; i++) { const t = -T + 2 * T * i / M; if (w(t) > 2 * ins + 2) tl.push(t); }
      if (tl.length < 3) return out; const pts = [];
      for (const t of tl) pts.push([Math.cos(t + P.ph) * (R - ins), Math.sin(t + P.ph) * (R - ins)]);
      for (let i = tl.length - 1; i >= 0; i--) { const t = tl[i], r = R - w(t) + ins; pts.push([Math.cos(t + P.ph) * r, Math.sin(t + P.ph) * r]); }
      out.push({ pts }); break; }
    case 'atoll': out.push({ pts: radial(0, 0, t => R * wob(t), ins), holes: [radial(0, 0, t => R * 0.55 * (1 + 0.06 * Math.sin(4 * t + P.ph)), -ins)] }); break;
    case 'twin': { const c = Math.cos(P.ph), s = Math.sin(P.ph); for (const k of [-1, 1]) out.push({ pts: radial(k * 0.72 * R * c, k * 0.72 * R * s, t => R * 0.58 * wob(t + k), ins) }); break; }
    case 'long': { const pts = radial(0, 0, t => R * (1 + P.a2 * Math.sin(5 * t + P.ph)), ins, 1.85, 0.6); const c = Math.cos(P.ph), s = Math.sin(P.ph); out.push({ pts: pts.map(([x, z]) => [x * c - z * s, x * s + z * c]) }); break; }
    case 'star': out.push({ pts: radial(0, 0, t => R * (0.74 + 0.26 * Math.cos(5 * t + P.ph)), ins) }); break;
    case 'blob': out.push({ pts: radial(0, 0, t => R * (1 + 0.17 * Math.sin(2 * t + P.ph) + 0.1 * Math.sin(5 * t + P.ph * 3)), ins) }); break;
    default: out.push({ pts: radial(0, 0, t => R * wob(t), ins) });
  }
  return out;
}
function extrude(polys, depth, bevel, col, y0, r) {
  const geos = [];
  for (const p of polys) {
    const sh = new THREE.Shape(p.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
    for (const h of (p.holes || [])) sh.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
    const g = new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel * 0.35, bevelSize: bevel, bevelSegments: 1, curveSegments: 4 });
    g.rotateX(-Math.PI / 2); g.translate(0, y0, 0); geos.push(paint(g, col, 0.08, r));
  }
  return geos;
}
// mansão moderna de praia (2 andares, vidro, terraço, piscina) em coordenadas locais (frente para +z)
function mansion(r, col, acc, glow) {
  const s = [], w = 12 + r() * 6, d = 9 + r() * 4, two = r() < 0.75;
  s.push(box(w, 3.4, d, 0, 1.7, 0, col), box(w + 1.2, 0.35, d + 1.4, 0, 3.55, 0.3, 0xf4f4f2));
  if (two) { const w2 = w * (0.55 + r() * 0.2); const ox = (r() - 0.5) * (w - w2); s.push(box(w2, 3, d * 0.8, ox, 5.2, -d * 0.08, col), box(w2 + 1.4, 0.35, d * 0.8 + 1.6, ox, 6.85, 0.2, 0xf4f4f2)); glow.push(box(w2 * 0.8, 1.9, 0.12, ox, 5.2, d * 0.32 + 0.02, 0xffd9a0)); }
  glow.push(box(w * 0.82, 2.2, 0.12, 0, 1.6, d / 2 + 0.03, 0xffe2b0));
  s.push(box(0.25, 3.4, 0.25, w / 2 + 0.4, 1.7, d / 2 + 0.7, acc), box(0.25, 3.4, 0.25, -w / 2 - 0.4, 1.7, d / 2 + 0.7, acc));
  s.push(box(w * 0.7, 0.18, 4.2, 0, 0.12, d / 2 + 3.4, 0xd9d2c4), box(w * 0.5, 0.12, 2.8, 0, 0.2, d / 2 + 3.4, 0x2ad1e8)); // deque + piscina
  s.push(box(1.6, 0.25, 0.7, w * 0.3, 0.35, d / 2 + 5.9, 0xffffff), box(1.6, 0.25, 0.7, w * 0.3 - 2.2, 0.35, d / 2 + 5.9, 0xffffff)); // espreguiçadeiras
  return { s, w, d };
}
// palmeira: tronco curvado em 3 gomos + 7 folhas caídas + cocos
function palm(r, x, y, z, s, out) {
  const h = 7 + r() * 5, lean = (r() - 0.5) * 0.5, dir = r() * 6.28; let px = x, pz = z, py = y;
  for (let k = 0; k < 3; k++) { const g = new THREE.CylinderGeometry(0.22 - k * 0.04, 0.3 - k * 0.04, h / 3 + 0.2, 5); const a = lean * (k + 1) / 3; g.rotateZ(a); g.rotateY(dir); const dx = Math.sin(a) * h / 6, dy = Math.cos(a) * h / 6; g.translate(px - Math.cos(dir) * dx, py + dy, pz + Math.sin(dir) * dx); out.push(paint(g, 0x8a6a45, 0.15, r)); px -= Math.cos(dir) * dx * 2; py += dy * 2; pz += Math.sin(dir) * dx * 2; }
  for (let k = 0; k < 7; k++) { const a = k / 7 * 6.28 + r(); const g = new THREE.BoxGeometry(0.9 * s, 0.08, 3.6 * s); g.translate(0, 0, 1.7 * s); g.rotateX(0.5 + r() * 0.3); g.rotateY(a); g.translate(px, py, pz); out.push(paint(g, k % 2 ? 0x3f8f3a : 0x2f7a32, 0.18, r)); }
  out.push(box(0.5, 0.5, 0.5, px + 0.3, py - 0.4, pz, 0x5b3d1e));
}

export class Islands {
  constructor(G, ponte) {
    this.G = G; this.P = ponte; const lv = G.Q.level; this.low = lv === 'low'; this.high = lv === 'high';
    this.group = new THREE.Group(); this.group.name = 'ilhas'; G.scene.add(this.group);
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0.02 });
    this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, color: 0x444444 });
    this.visD = this.low ? 1150 : this.high ? 2300 : 1700;
    this.list = []; this.seen = []; this.calloutT = 8; this._d = new THREE.Object3D(); this.t = 0;
    this.placeBridge(); this.placeFar();
    for (const I of this.list) if (I.bridge && I.core > 4) addBox(I.x - I.core, I.z - I.core, I.x + I.core, I.z + I.core, I.top, false); // lanchas não atravessam; helicóptero pousa em cima
    HOOKS.map.push((g, X, Z) => this.drawMap(g, X, Z));
    this.buildFauna(); this.buildBoats();
  }
  // ---- posições: 1 ilha a cada ~1/8 da volta (≈1 min no ritmo de drift), alternando os lados, longe do tabuleiro
  _clear(x, z, rad) {
    const L = this.P.loop, R2 = this.P.ramp; for (const P of [L, R2]) for (let i = 0; i < P.M; i += 2) { const dx = P.px[i] - x, dz = P.pz[i] - z; if (dx * dx + dz * dz < rad * rad) return false; }
    return true;
  }
  _water(x, z, R, minX = -1e9) { if (!isWaterDeep(x, z) || x < minX) return false; for (let a = 0; a < 6.28; a += 0.4) if (!isWaterDeep(x + Math.cos(a) * (R + 14), z + Math.sin(a) * (R + 14))) return false; return true; }
  _free(x, z, R) { for (const o of this.list) if (Math.hypot(o.x - x, o.z - z) < o.R * 1.9 + R * 1.9 + 30) return false; return true; }
  placeBridge() {
    const L = this.P.loop, LL = this.P.L, K = 8, r = rng(361); const kinds = ILHAS.kinds;
    for (let k = 0; k < K; k++) {
      let got = null;
      for (let tryS = 0; tryS < 7 && !got; tryS++) {
        const s = (k + 0.5 + (tryS ? (tryS % 2 ? 1 : -1) * Math.ceil(tryS / 2) * 0.12 : 0)) / K * LL;
        for (const side of (k % 2 ? [1, -1] : [-1, 1])) { if (got) break;
          for (const R of [52, 44, 37, 30]) { if (got) break;
            for (let off = 22; off < 230 && !got; off += 12) { const q = L.at(s, side * (9 + off + R * 1.2)); if (this._water(q.x, q.z, R * 1.25, 400) && this._clear(q.x, q.z, R * 1.3 + 22) && this._free(q.x, q.z, R)) got = { x: q.x, z: q.z, R, s }; } } }
      }
      if (!got) continue;
      const kd = kinds[k % kinds.length]; this.list.push(this.mk(got.x, got.z, got.R, kd.k, kd.name, r, true, got.s));
    }
    // as que sobraram do catálogo entram como ilhas extras mais longe da ponte (leste/sul)
    for (let k = K; k < kinds.length; k++) { for (let t = 0; t < 60; t++) { const x = 1560 + r() * 380, z = -900 + r() * 1900, R = 40 + r() * 20; if (this._water(x, z, R * 1.25) && this._clear(x, z, R * 1.3 + 30) && this._free(x, z, R)) { const s = this.P.loop.locate(x, z); this.list.push(this.mk(x, z, R, kinds[k].k, kinds[k].name, r, true, null)); break; } } }
  }
  placeFar() {
    const r = rng(2088), cap = this.low ? 8 : this.high ? 18 : 13; const cand = [];
    for (let x = -1350; x <= 1750; x += 260) { cand.push([x + r() * 120, -960 - r() * 260], [x + r() * 120, 960 + r() * 330]); }
    for (let z = -900; z <= 900; z += 300) { cand.push([-1330 - r() * 200, z + r() * 100], [1660 + r() * 260, z + r() * 100]); }
    cand.sort(() => r() - 0.5); let n = 0; const fk = ['round', 'blob', 'long', 'hill', 'star', 'twin', 'crescent', 'atoll'];
    for (const [x, z] of cand) { if (n >= cap) break; const R = 38 + r() * 40; if (!this._water(x, z, R * 1.2) || !this._clear(x, z, R * 1.4 + 40) || !this._free(x, z, R)) continue; this.list.push(this.mk(x, z, R, fk[n % fk.length], ILHAS.far[n % ILHAS.far.length], r, false, null)); n++; }
  }
  mk(x, z, R, kind, name, r, bridge, s) {
    const P = { ph: r() * 6.28, a1: 0.05 + r() * 0.08, a2: 0.03 + r() * 0.05 };
    const top = kind === 'hill' ? 6 : 1.2; const core = kind === 'atoll' || kind === 'crescent' ? 0 : kind === 'twin' || kind === 'long' ? R * 0.35 : R * 0.55;
    return { x, z, R, kind, name, P, seed: Math.floor(r() * 1e9), bridge, s, mesh: null, glow: null, top, core, life: [] };
  }
  // ---- malha de uma ilha (sob demanda)
  build(I) {
    const r = rng(I.seed), s = [], glow = [], sw = I.kind === 'swamp', far = !I.bridge, lo = this.low;
    const sand = outline(I.kind, I.R, I.P, 0), grass = outline(I.kind, I.R, I.P, sw ? 4 : 7.5);
    s.push(...extrude(sand, 2.3, 2.2, ILHAS.sand, WATER_Y - 2.0, r));
    s.push(...extrude(grass, 0.9, 1.2, sw ? ILHAS.swamp : ILHAS.grass, WATER_Y + 0.35, r));
    if (I.kind === 'atoll') { const lag = new THREE.CircleGeometry(I.R * 0.55 + 1, 24); lag.rotateX(-Math.PI / 2); lag.translate(0, WATER_Y + 0.08, 0); s.push(paint(lag, 0x37d6d0)); }
    if (I.kind === 'hill') { const c = new THREE.ConeGeometry(I.R * 0.5, I.R * 0.36, 10, 2); c.translate(0, WATER_Y + 1 + I.R * 0.18, 0); s.push(paint(c, 0x5f8a42, 0.2, r)); const c2 = new THREE.ConeGeometry(I.R * 0.2, I.R * 0.14, 7); c2.translate(I.R * 0.1, WATER_Y + 1 + I.R * 0.36, 0); s.push(paint(c2, ILHAS.rock, 0.2, r)); }
    const gy = WATER_Y + 1.25; const inner = outline(I.kind, I.R, I.P, sw ? 10 : 16);
    const spot = (minR = 0) => { for (let t = 0; t < 90; t++) { const a = r() * 6.28, d = Math.sqrt(r()) * I.R * 1.9; const x = Math.cos(a) * d, z = Math.sin(a) * d; if (inPolys(x, z, inner) && Math.hypot(x, z) >= minR) return [x, z]; } return null; };
    const taken = [];
    // mansões (menos no mangue e nas distantes)
    const nM = sw ? 0 : I.kind === 'light' ? 1 : far ? (lo ? 1 : 2) : (lo ? 2 : 3 + Math.floor(r() * 2));
    for (let m = 0; m < nM; m++) {
      const p = spot(I.kind === 'hill' ? I.R * 0.5 : 0); if (!p || taken.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 22)) continue; taken.push(p);
      const ry = Math.atan2(p[0], p[1]); const M = mansion(r, ILHAS.mansion[Math.floor(r() * ILHAS.mansion.length)], ILHAS.accent[Math.floor(r() * ILHAS.accent.length)], []);
      for (const g of M.s) s.push(place(g, p[0], gy, p[1], ry));
      glow.push(place(box(M.w * 0.8, 2.1, 0.12, 0, 1.6, M.d / 2 + 0.05, 0xffe2b0), p[0], gy, p[1], ry));
    }
    if (I.kind === 'light') { for (let k = 0; k < 6; k++) { const g = new THREE.CylinderGeometry(2.2 - k * 0.15, 2.4 - k * 0.15, 3, 10); g.translate(0, gy + 1.5 + k * 3, 0); s.push(paint(g, k % 2 ? 0xd8332e : 0xffffff)); } glow.push(box(2.2, 2, 2.2, 0, gy + 19.5, 0, 0xfff4c0)); s.push(box(3.4, 0.4, 3.4, 0, gy + 18.3, 0, 0x222222), box(3, 0.6, 3, 0, gy + 21, 0, 0xd8332e)); I.lamp = true; }
    // palmeiras e mangue
    const nP = Math.round((sw ? 8 : far ? 9 : 22) * (lo ? 0.6 : this.high ? 1.4 : 1) * (I.R / 45));
    for (let k = 0; k < nP; k++) { const p = spot(); if (!p || taken.some(q => Math.hypot(q[0] - p[0], q[1] - p[1]) < 10)) continue; palm(r, p[0], gy - 0.2, p[1], 0.9 + r() * 0.35, s); }
    if (sw) for (let k = 0; k < (lo ? 10 : 22); k++) { const p = spot(); if (!p) continue; const g = new THREE.IcosahedronGeometry(1.6 + r() * 1.6, 0); g.scale(1, 0.6, 1); g.translate(p[0], gy + 0.6, p[1]); s.push(paint(g, 0x2f5a2a, 0.25, r)); }
    // guarda-sóis na areia (anel entre a areia e a grama) e píer com lancha atracada
    if (!sw && !far) for (let k = 0; k < (lo ? 3 : 7); k++) { const a = r() * 6.28; for (let d = I.R * 1.2; d > 3; d -= 1.5) { const x = Math.cos(a) * d, z = Math.sin(a) * d; if (inPolys(x, z, sand) && !inPolys(x, z, grass)) { const c = new THREE.ConeGeometry(1.6, 0.7, 8); c.translate(x, WATER_Y + 2.9, z); s.push(paint(c, ILHAS.accent[k % 5]), box(0.08, 2.4, 0.08, x, WATER_Y + 1.6, z, 0xeeeeee), box(0.7, 0.15, 1.8, x + 1.1, WATER_Y + 0.75, z, 0xffffff)); break; } } }
    if (!sw) { const a = I.P.ph + 1.3; let d0 = 0; for (let d = I.R * 1.3; d > 2; d -= 1) if (inPolys(Math.cos(a) * d, Math.sin(a) * d, sand)) { d0 = d; break; } if (d0) { const L = 16; const cx = Math.cos(a) * (d0 + L / 2 - 2), cz = Math.sin(a) * (d0 + L / 2 - 2); const ry = Math.atan2(Math.cos(a), Math.sin(a)); s.push(box(2.6, 0.35, L, cx, WATER_Y + 1.1, cz, 0x8a6542, ry)); for (let k = -1; k <= 1; k += 2) for (let j = 0; j < 4; j++) { const t = d0 + 1 + j * 4.5; s.push(box(0.3, 2.2, 0.3, Math.cos(a) * t + Math.cos(ry) * k * 1.2, WATER_Y, Math.sin(a) * t - Math.sin(ry) * k * 1.2, 0x5a4030)); }
      const bx = Math.cos(a) * (d0 + L - 4) + Math.cos(ry) * 3.2, bz = Math.sin(a) * (d0 + L - 4) - Math.sin(ry) * 3.2; s.push(box(2.1, 0.8, 6, bx, WATER_Y + 0.3, bz, 0xffffff, ry), box(1.3, 0.7, 1.5, bx, WATER_Y + 1, bz, 0x1d3550, ry), box(2.15, 0.2, 6.05, bx, WATER_Y + 0.55, bz, ILHAS.accent[I.seed % 5], ry)); } }
    const g = merge(s); const mesh = new THREE.Mesh(g, this.mat); mesh.position.set(I.x, 0, I.z); mesh.name = 'ilha:' + I.name; mesh.receiveShadow = !lo; mesh.matrixAutoUpdate = false; mesh.updateMatrix();
    this.group.add(mesh); I.mesh = mesh; I.tris = g.attributes.position.count / 3;
    if (glow.length) { const gm = new THREE.Mesh(merge(glow), this.glowMat); gm.position.copy(mesh.position); gm.matrixAutoUpdate = false; gm.updateMatrix(); this.group.add(gm); I.glow = gm; }
    // pontos de fauna (areia perto da água): jacarés e flamingos usam isto
    I.shore = []; for (let a = 0; a < 6.28; a += 0.35) { for (let d = I.R * 1.3; d > 2; d -= 1) { const x = Math.cos(a) * d, z = Math.sin(a) * d; if (inPolys(x, z, sand)) { I.shore.push([I.x + Math.cos(a) * (d - 1.5), I.z + Math.sin(a) * (d - 1.5), a]); break; } } }
  }
  // ---- fauna instanciada (gaivotas, jacarés, flamingos, golfinhos)
  buildFauna() {
    const lo = this.low; const near = this.list.filter(I => I.bridge);
    const wing = new THREE.BufferGeometry(); wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, 0, 0, -0.25, 1.1, 0.05, -0.1, 0, 0, -0.25, 0, 0, 0.25, 1.1, 0.05, -0.1], 3)); wing.computeVertexNormals();
    const gullMat = new THREE.MeshStandardMaterial({ color: 0xf4f4f4, roughness: 0.8, side: THREE.DoubleSide });
    const perI = lo ? 4 : this.high ? 9 : 6; this.birds = [];
    for (const I of this.list) { const n = I.bridge ? perI : (lo ? 0 : 3); for (let k = 0; k < n; k++) this.birds.push({ I, r: I.R * (0.5 + Math.random() * 0.7), y: 14 + Math.random() * 18, a: Math.random() * 6.28, w: (0.25 + Math.random() * 0.2) * (k % 2 ? 1 : -1), ph: Math.random() * 6 }); }
    const nb = Math.max(1, this.birds.length);
    this.wingL = new THREE.InstancedMesh(wing, gullMat, nb); this.wingR = new THREE.InstancedMesh(wing.clone().scale(-1, 1, 1), gullMat, nb);
    const body = new THREE.CapsuleGeometry(0.13, 0.5, 2, 5); body.rotateX(Math.PI / 2); this.gullB = new THREE.InstancedMesh(body, gullMat, nb);
    for (const m of [this.wingL, this.wingR, this.gullB]) { m.count = this.birds.length; m.frustumCulled = false; m.name = 'ilhaGaivotas'; this.group.add(m); }
    // jacaré: corpo, cabeça com focinho, cauda e patas (verde-oliva) — metade toma sol na areia, metade nada devagar
    const cro = merge([box(0.85, 0.42, 2.6, 0, 0.21, 0, 0x4a5a2a), box(0.55, 0.3, 1.3, 0, 0.18, 1.85, 0x55662f), box(0.4, 0.2, 0.7, 0, 0.13, 2.7, 0x55662f), box(0.45, 0.28, 1.6, 0, 0.14, -1.9, 0x4a5a2a), box(0.25, 0.18, 1.1, 0, 0.1, -3.1, 0x4a5a2a), ...[[-1, 0.8], [1, 0.8], [-1, -0.7], [1, -0.7]].map(([a, b]) => box(0.3, 0.22, 0.4, a * 0.55, 0.08, b, 0x3d4a22)), box(0.1, 0.1, 0.1, 0.18, 0.36, 2.15, 0xe6d24a), box(0.1, 0.1, 0.1, -0.18, 0.36, 2.15, 0xe6d24a)]);
    this.crocs = []; for (const I of near) { const n = I.kind === 'swamp' ? (lo ? 4 : 8) : (I.kind === 'atoll' || I.kind === 'blob' ? 1 : 0); for (let k = 0; k < n; k++) this.crocs.push({ I, k, swim: k % 2 === 1, a: Math.random() * 6.28, w: 0.04 + Math.random() * 0.03 }); }
    this.croc = new THREE.InstancedMesh(cro, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.75 }), Math.max(1, this.crocs.length)); this.croc.count = this.crocs.length; this.croc.frustumCulled = false; this.croc.name = 'ilhaJacares'; this.group.add(this.croc);
    // flamingo: corpo, pescoço em S simplificado, cabeça, 2 pernas
    const fl = merge([(() => { const g = new THREE.SphereGeometry(0.35, 6, 4); g.scale(0.8, 0.7, 1.3); g.translate(0, 1.2, 0); return paint(g, 0xff8fb1); })(), box(0.09, 0.8, 0.09, 0, 1.75, 0.35, 0xff8fb1, 0, -0.3), box(0.14, 0.14, 0.3, 0, 2.15, 0.55, 0xff7aa2), box(0.05, 0.05, 0.14, 0, 2.1, 0.75, 0x222222), box(0.04, 1, 0.04, 0.08, 0.5, 0, 0xe86a8a), box(0.04, 1, 0.04, -0.08, 0.5, 0, 0xe86a8a)]);
    this.flams = []; for (const I of near) if ((I.kind === 'atoll' || I.kind === 'crescent' || I.kind === 'swamp') && !lo) for (let k = 0; k < 6; k++) this.flams.push({ I, k });
    this.flam = new THREE.InstancedMesh(fl, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), Math.max(1, this.flams.length)); this.flam.count = this.flams.length; this.flam.frustumCulled = false; this.flam.name = 'ilhaFlamingos'; this.group.add(this.flam);
    // golfinhos saltando perto das ilhas da ponte
    const dol = (() => { const g = new THREE.SphereGeometry(0.5, 8, 5); g.scale(0.7, 0.6, 2.6); const f = paint(g, 0x6f8796); return merge([f, box(0.06, 0.6, 0.5, 0, 0.45, -0.1, 0x5e7584, 0, -0.5), box(1.1, 0.06, 0.4, 0, 0, -1.25, 0x5e7584)]); })();
    this.dols = near.slice(0, lo ? 3 : 8).map((I, k) => ({ I, t: k * 2.3, per: 7 + (k % 3) * 2 }));
    this.dol = new THREE.InstancedMesh(dol, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35 }), Math.max(1, this.dols.length * 2)); this.dol.count = this.dols.length * 2; this.dol.frustumCulled = false; this.dol.name = 'ilhaGolfinhos'; this.group.add(this.dol);
  }
  // ---- barcos navegando ao redor das ilhas distantes e pelo mar aberto
  buildBoats() {
    const n = this.low ? 6 : this.high ? 18 : 12; const fars = this.list.filter(I => !I.bridge); const near = this.list.filter(I => I.bridge);
    const hull = merge([box(2.3, 0.9, 6.4, 0, 0.45, 0, 0xffffff), (() => { const g = new THREE.ConeGeometry(1.15, 2.2, 4); g.rotateX(Math.PI / 2); g.rotateZ(Math.PI / 4); g.scale(1, 0.55, 1); g.translate(0, 0.62, 4.2); return paint(g, 0xffffff); })(), box(1.5, 0.8, 1.8, 0, 1.3, -0.4, 0x1e3348), box(2.35, 0.18, 6.45, 0, 0.62, 0, 0xdddddd)]);
    const sail = merge([box(1.8, 0.8, 7.5, 0, 0.4, 0, 0xffffff), box(0.15, 9, 0.15, 0, 5, 0.6, 0xcccccc), (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.2, 0.7, 0, 9.4, 0.7, 0, 1.2, -3.2, 0, 1.2, 0.7, 0, 1.2, -3.2, 0, 9.4, 0.7, 0, 1.4, 1.1, 0, 7.6, 0.9, 0, 1.4, 3.6, 0, 1.4, 1.1, 0, 1.4, 3.6, 0, 7.6, 0.9], 3)); g.computeVertexNormals(); return paint(g, 0xfafafa); })()]);
    const wt = canvasTex(32, 128, (g) => { const r = g.createLinearGradient(0, 0, 0, 128); r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(16, 0); g.lineTo(32, 128); g.lineTo(26, 128); g.lineTo(16, 18); g.lineTo(6, 128); g.lineTo(0, 128); g.closePath(); g.fill(); });
    const wg = new THREE.PlaneGeometry(8, 30); wg.rotateX(-Math.PI / 2); wg.translate(0, 0, -17);
    const mk = (geo, cnt, name) => { const m = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide }), Math.max(1, cnt)); m.count = cnt; m.frustumCulled = false; m.name = name; this.group.add(m); return m; };
    this.boatsP = []; const cols = [0xffffff, 0xff9ec8, 0x9ef0ff, 0xfff09e, 0xb6ffcb, 0xd9c2ff];
    const hosts = [...fars, ...near]; for (let i = 0; i < n && hosts.length; i++) { const I = hosts[i % hosts.length]; const sailK = i % 3 === 2; this.boatsP.push({ I, sail: sailK, r: I.R * 1.6 + 30 + (i % 4) * 14, a: i * 1.7, w: (sailK ? 5 : 12) / (I.R * 1.6 + 30) * (i % 2 ? 1 : -1), col: cols[i % cols.length] }); }
    const nS = this.boatsP.filter(b => b.sail).length, nH = this.boatsP.length - nS;
    this.hullM = mk(hull, nH, 'ilhaLanchas'); this.sailM = mk(sail, nS, 'ilhaVeleiros');
    this.wakeM = new THREE.InstancedMesh(wg, new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false, opacity: 0.75 }), Math.max(1, nH)); this.wakeM.count = nH; this.wakeM.frustumCulled = false; this.group.add(this.wakeM);
    let a = 0, b = 0; for (const p of this.boatsP) { if (p.sail) p.j = b++; else { p.j = a++; this.hullM.setColorAt(p.j, new THREE.Color(p.col)); } }
    if (this.hullM.instanceColor) this.hullM.instanceColor.needsUpdate = true;
  }
  setM(m, j, x, y, z, ry, rz = 0, rx = 0, sc = 1) { const d = this._d; d.position.set(x, y, z); d.rotation.set(rx, ry, rz, 'YXZ'); d.scale.setScalar(sc); d.updateMatrix(); m.setMatrixAt(j, d.matrix); }
  drawMap(g, X, Z) {
    for (const I of this.list) { const sand = outline(I.kind, I.R, I.P, 0), grass = outline(I.kind, I.R, I.P, 7.5);
      for (const [pp, col] of [[sand, '#ecd9a6'], [grass, '#7d9a55']]) for (const p of pp) { g.fillStyle = col; g.beginPath(); p.pts.forEach(([x, z], i) => (i ? g.lineTo : g.moveTo).call(g, X(I.x + x), Z(I.z + z))); g.closePath(); for (const h of (p.holes || [])) { h.forEach(([x, z], i) => (i ? g.lineTo : g.moveTo).call(g, X(I.x + x), Z(I.z + z))); g.closePath(); } g.fill('evenodd'); }
      if (I.bridge) { g.font = 'bold 11px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#073b4c'; g.fillText(I.name, X(I.x), Z(I.z + I.R + 12)); } }
  }
  // ilha mais próxima do jogador (para o rádio e o aviso "olha aquela ilha")
  nearest(x, z) { let b = null, bd = 1e9; for (const I of this.list) { const d = Math.hypot(I.x - x, I.z - z) - I.R; if (d < bd) { bd = d; b = I; } } return b && { I: b, d: bd }; }
  update(dt, t, camera) {
    this.t = t; const G = this.G; const cx = camera.position.x, cz = camera.position.z; let built = 0;
    for (const I of this.list) { const d = Math.hypot(I.x - cx, I.z - cz) - I.R; const want = d < this.visD; if (want && !I.mesh && built < 1) { this.build(I); built++; } if (I.mesh) { I.mesh.visible = want; if (I.glow) I.glow.visible = want; } }
    const night = G.env ? G.env.night : 0; this.glowMat.color.setScalar(0.18 + night * 0.95);
    // gaivotas
    this.birds.forEach((b, i) => { b.a += b.w * dt; const x = b.I.x + Math.cos(b.a) * b.r, z = b.I.z + Math.sin(b.a) * b.r, y = b.y + Math.sin(t * 0.7 + b.ph) * 2; const h = Math.atan2(-Math.sin(b.a) * Math.sign(b.w), Math.cos(b.a) * Math.sign(b.w)); const f = Math.sin(t * 9 + b.ph) * 0.6; const bank = -Math.sign(b.w) * 0.25;
      this.setM(this.gullB, i, x, y, z, h, bank); this.setM(this.wingL, i, x, y, z, h, bank + f); this.setM(this.wingR, i, x, y, z, h, bank - f); });
    for (const m of [this.wingL, this.wingR, this.gullB]) m.instanceMatrix.needsUpdate = true;
    // jacarés: tomando sol (na areia, mexendo a cabeça) ou nadando devagar em volta da ilha
    this.crocs.forEach((c, i) => { const I = c.I; if (!I.shore || !I.shore.length) { this.setM(this.croc, i, I.x, -50, I.z, 0); return; }
      if (c.swim) { c.a += c.w * dt; const r = I.R * 1.25 + 4; const x = I.x + Math.cos(c.a) * r, z = I.z + Math.sin(c.a) * r; this.setM(this.croc, i, x, WATER_Y - 0.28, z, Math.atan2(-Math.sin(c.a), Math.cos(c.a)) + Math.sin(t * 1.5 + i) * 0.12); }
      else { const sp = I.shore[(c.k * 5 + 3) % I.shore.length]; this.setM(this.croc, i, sp[0], WATER_Y + 0.62, sp[1], -sp[2] + Math.PI / 2 + Math.sin(t * 0.4 + i) * 0.15); } });
    this.croc.instanceMatrix.needsUpdate = true;
    this.flams.forEach((f, i) => { const I = f.I; if (!I.shore || !I.shore.length) { this.setM(this.flam, i, I.x, -50, I.z, 0); return; } const sp = I.shore[(f.k * 3 + 1) % I.shore.length]; this.setM(this.flam, i, sp[0] + Math.cos(sp[2]) * 2.5, WATER_Y - 0.1 + Math.sin(t * 2 + i) * 0.02, sp[1] + Math.sin(sp[2]) * 2.5, f.k * 1.1 + Math.sin(t * 0.3 + i) * 0.4); });
    this.flam.instanceMatrix.needsUpdate = true;
    // golfinhos: arco de salto a cada poucos segundos (dois por ilha, um atrás do outro)
    this.dols.forEach((D, i) => { const ph = ((t + D.t) % D.per) / 1.4; for (let k = 0; k < 2; k++) { const u = ph - k * 0.25; const a = (D.t * 0.7 + Math.floor((t + D.t) / D.per)) % 6.28, r = D.I.R * 1.3 + 22; const bx = D.I.x + Math.cos(a) * r, bz = D.I.z + Math.sin(a) * r; const fx = -Math.sin(a), fz = Math.cos(a);
      if (u < 0 || u > 1) { this.setM(this.dol, i * 2 + k, bx, -30, bz, 0); continue; } const y = WATER_Y - 0.6 + Math.sin(u * Math.PI) * 2.6, s = (u - 0.5) * 9; this.setM(this.dol, i * 2 + k, bx + fx * s, y, bz + fz * s, Math.atan2(fx, fz), 0, -Math.cos(u * Math.PI) * 0.9); } });
    this.dol.instanceMatrix.needsUpdate = true;
    // barcos
    for (const p of this.boatsP) { p.a += p.w * dt; const x = p.I.x + Math.cos(p.a) * p.r, z = p.I.z + Math.sin(p.a) * p.r; const h = Math.atan2(-Math.sin(p.a) * Math.sign(p.w), Math.cos(p.a) * Math.sign(p.w)); const bob = Math.sin(t * (p.sail ? 1.2 : 5) + p.j) * (p.sail ? 0.15 : 0.08);
      if (p.sail) this.setM(this.sailM, p.j, x, WATER_Y + bob, z, h, -Math.sign(p.w) * 0.12); else { this.setM(this.hullM, p.j, x, WATER_Y + 0.05 + bob, z, h, -Math.sign(p.w) * 0.1, -0.07); this.setM(this.wakeM, p.j, x, WATER_Y + 0.1, z, h); } }
    for (const m of [this.hullM, this.sailM, this.wakeM]) m.instanceMatrix.needsUpdate = true;
    this.callouts(dt);
  }
  // aviso + rádio quando uma ilha nova aparece perto do jogador na ponte (~1 por minuto)
  callouts(dt) {
    const G = this.G, P = this.P; this.calloutT -= dt; if (this.calloutT > 0) return; this.calloutT = 1;
    const v = G.player.vehicle; const p = v || G.player; const n = this.nearest(p.x, p.z); if (!n || n.d > 230) return;
    const I = n.I; const last = this.seen.find(s => s.I === I); if (last && G.t - last.t < 70) return;
    if (this._lastAny && G.t - this._lastAny < 35) return;
    this._lastAny = G.t; this.seen = this.seen.filter(s => s.I !== I); this.seen.push({ I, t: G.t }); this.callN = (this.callN || 0) + 1;
    let side = ''; if (v) { const fx = Math.sin(v.h), fz = Math.cos(v.h); const dx = I.x - v.x, dz = I.z - v.z; side = (dx * -fz + dz * fx) > 0 ? ' à direita' : ' à esquerda'; }
    const extra = I.kind === 'swamp' ? ' · cuidado com os jacarés tomando sol 🐊' : I.kind === 'light' ? ' · o farol pisca à noite' : I.kind === 'atoll' ? ' · lagoa azul com flamingos 🦩' : ' · mansões e palmeiras 🌴';
    G.ui.toast(`🏝️ Olha a <b>${I.name}</b>${side}!${extra}`, 2600);
    if (P && P.radio && P.on) P.radio.say(I.kind === 'swamp' ? 'wildlife' : 'island', null, 30);
  }
}
