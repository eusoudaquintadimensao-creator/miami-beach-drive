// Solara Bay — geração da cidade (inspirada em Miami / costa neon), colisões e mapa
import * as THREE from 'three';
import { rng, MeshBuilder, canvasTex, C, clamp, pick } from './util.js';

export const WATER_Y = -0.6;
export const SHORE_X = 390;
export const BOUNDS = { x0: -1100, x1: 900, z0: -900, z1: 900 };
const ISL = { x0: 30, z0: -680, z1: 680 };
const MAIN = { x0: -1100, x1: -260, z0: -720, z1: 720 };
const RW = 7; // meia largura da via urbana
const SW = 4; // largura da calçada
const Z9 = [-600, -450, -300, -150, 0, 150, 300, 450, 600];

// ---------------------------------------------------------------- vias
export const LINES = [];
function L(axis, c, a, b, kind = 'city', w = RW) { LINES.push({ axis, c, a, b, kind, w, name: '' }); return LINES[LINES.length - 1]; }
L('z', 60, -600, 600).name = 'Av. Collins Solara';
L('z', 180, -600, 600).name = 'Rua Washington';
L('z', 300, -640, 640).name = 'Ocean Drive Solara';
for (const z of Z9) L('x', z, 60, 300).name = 'Rua ' + (Math.abs(z) / 150 + 1) + (z < 0 ? ' Norte' : z > 0 ? ' Sul' : ' Central');
L('x', -450, -300, 60).name = 'Ponte Norte (Causeway)';
L('x', 450, -300, 60).name = 'Ponte do Pôr do Sol';
for (const x of [-300, -420, -540, -660]) L('z', x, -600, 600).name = x === -300 ? 'Bulevar da Baía' : 'Av. ' + (-x / 120 | 0) + ' Centro';
for (const z of Z9) L('x', z, -660, -300).name = 'Rua ' + (Math.abs(z) / 150 + 1) + (z < 0 ? ' N' : z > 0 ? ' S' : '') + ' Centro';
L('x', 0, -1060, -660, 'rural', 5.5).name = 'Trilha dos Glades';
L('z', -860, -420, 420, 'rural', 5.5).name = 'Estrada do Pântano';

export const NODES = []; export const SEGS = [];
const nodeMap = new Map();
function nodeAt(x, z) {
  const k = Math.round(x) + ',' + Math.round(z);
  let n = nodeMap.get(k);
  if (!n) { n = { id: NODES.length, x, z, segs: [], light: false, phase: 0 }; NODES.push(n); nodeMap.set(k, n); }
  return n;
}
for (const l of LINES) {
  const ts = new Set([l.a, l.b]);
  for (const o of LINES) {
    if (o.axis === l.axis) continue;
    if (o.c >= l.a && o.c <= l.b && l.c >= o.a && l.c <= o.b) ts.add(o.c);
  }
  const arr = [...ts].sort((a, b) => a - b);
  l.nodes = arr.map(t => l.axis === 'z' ? nodeAt(l.c, t) : nodeAt(t, l.c));
  for (let i = 0; i < arr.length - 1; i++) {
    const A = l.nodes[i], B = l.nodes[i + 1];
    const s = { id: SEGS.length, a: A, b: B, line: l, axis: l.axis, len: Math.hypot(B.x - A.x, B.z - A.z), w: l.w, kind: l.kind };
    SEGS.push(s); A.segs.push(s); B.segs.push(s);
  }
}
for (const n of NODES) n.light = n.segs.length >= 3 && n.segs[0].kind === 'city';
NODES.forEach((n, i) => n.phase = (i * 7.3) % 22);

// semáforo: ciclo 22s — eixo z verde 0-9, amarelo 9-11, x verde 11-20, amarelo 20-22
export function lightState(n, t, axis) {
  if (!n.light) return 'g';
  const p = (t + n.phase) % 22;
  if (axis === 'z') return p < 9 ? 'g' : p < 11 ? 'y' : 'r';
  return p < 11 ? 'r' : p < 20 ? 'g' : p < 22 ? 'y' : 'r';
}

// ---------------------------------------------------------------- regiões
export const BLOCKS = [];
{
  const IX = [60, 180, 300];
  for (let i = 0; i < 2; i++) for (let j = 0; j < 8; j++)
    BLOCKS.push({ x0: IX[i], x1: IX[i + 1], z0: Z9[j], z1: Z9[j + 1], kind: i === 1 ? 'deco' : 'hotel' });
  const MX = [-660, -540, -420, -300];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 8; j++) {
    const b = { x0: MX[i], x1: MX[i + 1], z0: Z9[j], z1: Z9[j + 1], kind: 'tower' };
    if (i === 2 && j === 3) b.kind = 'park';
    BLOCKS.push(b);
  }
}
export const PIERS = [ // retângulos de píer (andáveis, bloqueiam barcos)
  { x0: -262, x1: -170, z0: -82, z1: -78 }, { x0: -262, x1: -170, z0: -22, z1: -18 }, { x0: -262, x1: -170, z0: 38, z1: 42 },
  { x0: -262, x1: -200, z0: 98, z1: 102 },
  { x0: 322, x1: 540, z0: -302, z1: -296, y: 0.9 }, // píer da praia
  { x0: -960, x1: -900, z0: -152, z1: -148, y: 0.4 }, // passarela dos glades
];
// Autódromo Neon (pista de corrida) no norte dos Glades: sem árvores nem poças nessa área
export const TRACK_ZONE = { x0: -1088, x1: -698, z0: -716, z1: -443 };
export const inTrackZone = (x, z, m = 0) => x > TRACK_ZONE.x0 - m && x < TRACK_ZONE.x1 + m && z > TRACK_ZONE.z0 - m && z < TRACK_ZONE.z1 + m;
export const SERP_ZONE = { x0: -1040, x1: -280, z0: 575, z1: 900 };
export const inSerpZone = (x, z, m = 0) => x > SERP_ZONE.x0 - m && x < SERP_ZONE.x1 + m && z > SERP_ZONE.z0 - m && z < SERP_ZONE.z1 + m;
export const HOOKS = { surfs: [], map: [] }; // pistas registram aderência e desenho no mapa
HOOKS.surf = (x, z) => { for (const f of HOOKS.surfs) { const r = f(x, z); if (r != null) return r; } return null; };
const POOLS = []; // poças do pântano (visual)
{
  const r = rng(77);
  for (let i = 0; i < 26; i++) { const p = { x: -1060 + r() * 360, z: -650 + r() * 1300, r: 10 + r() * 28 }; if (!inTrackZone(p.x, p.z, p.r + 4) && !inSerpZone(p.x, p.z, p.r + 4)) POOLS.push(p); }
}
export function onBridge(x, z) {
  for (const zz of [-450, 450]) if (Math.abs(z - zz) < RW + 2.2 && x > -262 && x < 32) return true;
  return false;
}
export function onPier(x, z) { for (const p of PIERS) if (x > p.x0 && x < p.x1 && z > p.z0 && z < p.z1) return p; return null; }
function landBase(x, z) {
  if (x >= ISL.x0 && x < SHORE_X + 200 && z >= ISL.z0 && z <= ISL.z1) return true;
  if (x >= MAIN.x0 && x <= MAIN.x1 && z >= MAIN.z0 && z <= MAIN.z1) return true;
  if (inSerpZone(x, z)) return true; // aterro do Circuito Serpentina, ao sul da Casa Solara
  return false;
}
export function groundY(x, z) {
  const p = onPier(x, z); if (p) return p.y !== undefined ? p.y : 0.3;
  if (onBridge(x, z)) return 0.2;
  if (landBase(x, z)) { if (x > 330 && x >= ISL.x0) return -(x - 330) * 0.011; return 0; }
  return -6;
}
export function isWaterDeep(x, z) { return groundY(x, z) < -1.2 && !onPier(x, z); }
export function walkable(x, z) { return x > BOUNDS.x0 + 5 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < BOUNDS.z1 && groundY(x, z) > -0.45; }
export function drivable(x, z) { return walkable(x, z) && groundY(x, z) > -0.3 && !onPier(x, z); }
export function boatable(x, z) { return x > BOUNDS.x0 && x < BOUNDS.x1 + 300 && z > BOUNDS.z0 - 200 && z < BOUNDS.z1 + 200 && isWaterDeep(x, z) && !onBridge(x, z); }
export function inSwamp(x, z) { if (inTrackZone(x, z)) return false; for (const p of POOLS) if ((x - p.x) ** 2 + (z - p.z) ** 2 < p.r * p.r) return true; return false; }
export function roadAt(x, z) { // via mais próxima (para o GPS e nomes de rua)
  let best = null, bd = 1e9;
  for (const s of SEGS) {
    let d;
    if (s.axis === 'z') { const zz = clamp(z, Math.min(s.a.z, s.b.z), Math.max(s.a.z, s.b.z)); d = Math.hypot(x - s.a.x, z - zz); }
    else { const xx = clamp(x, Math.min(s.a.x, s.b.x), Math.max(s.a.x, s.b.x)); d = Math.hypot(x - xx, z - s.a.z); }
    if (d < bd) { bd = d; best = s; }
  }
  return { seg: best, d: bd };
}
export function districtName(x, z) {
  if (inSerpZone(x, z) && z > 718) return 'Circuito Serpentina';
  if (x > 322) return 'Praia de Solara';
  if (x > 25) return z > 560 ? 'Ponta Sul' : 'Solara Beach';
  if (x > -262) return 'Baía de Solara';
  if (x > -680) return 'Centro (Downtown)';
  if (inTrackZone(x, z)) return 'Autódromo Neon';
  return 'Glades';
}

// ---------------------------------------------------------------- colisões
const CELL = 40; const grid = new Map();
export const BOXES = [];
export function addBox(x0, z0, x1, z1, h = 100, boatOnly = false) {
  const b = { x0, z0, x1, z1, h, boatOnly }; BOXES.push(b);
  for (let i = Math.floor(x0 / CELL); i <= Math.floor(x1 / CELL); i++)
    for (let j = Math.floor(z0 / CELL); j <= Math.floor(z1 / CELL); j++) {
      const k = i + ',' + j; let a = grid.get(k); if (!a) grid.set(k, a = []); a.push(b);
    }
}
const circles = new Map();
export function addCircle(x, z, r) { const k = Math.floor(x / CELL) + ',' + Math.floor(z / CELL); let a = circles.get(k); if (!a) circles.set(k, a = []); a.push({ x, z, r }); }
// resolve círculo contra caixas; retorna normal do impacto (ou null)
export function collide(pos, r, boat = false, y = 0) {
  let hit = null;
  const i0 = Math.floor((pos.x - r) / CELL), i1 = Math.floor((pos.x + r) / CELL), j0 = Math.floor((pos.z - r) / CELL), j1 = Math.floor((pos.z + r) / CELL);
  for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
    const a = grid.get(i + ',' + j);
    if (a) for (const b of a) {
      if (b.boatOnly && !boat) continue;
      if (y > b.h) continue;
      const cx = clamp(pos.x, b.x0, b.x1), cz = clamp(pos.z, b.z0, b.z1);
      let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
      if (d2 < r * r) {
        if (d2 < 1e-6) { // centro dentro
          const px = Math.min(pos.x - b.x0, b.x1 - pos.x), pz = Math.min(pos.z - b.z0, b.z1 - pos.z);
          if (px < pz) { dx = pos.x - b.x0 < b.x1 - pos.x ? -1 : 1; dz = 0; pos.x = dx < 0 ? b.x0 - r : b.x1 + r; }
          else { dz = pos.z - b.z0 < b.z1 - pos.z ? -1 : 1; dx = 0; pos.z = dz < 0 ? b.z0 - r : b.z1 + r; }
          hit = { x: dx, z: dz };
        } else {
          const d = Math.sqrt(d2); dx /= d; dz /= d; pos.x = cx + dx * r; pos.z = cz + dz * r; hit = { x: dx, z: dz };
        }
      }
    }
    const c = circles.get(i + ',' + j);
    if (c && !boat) for (const o of c) {
      const dx = pos.x - o.x, dz = pos.z - o.z, d2 = dx * dx + dz * dz, rr = r + o.r;
      if (d2 < rr * rr && d2 > 1e-6) { const d = Math.sqrt(d2); pos.x = o.x + dx / d * rr; pos.z = o.z + dz / d * rr; hit = { x: dx / d, z: dz / d }; }
    }
  }
  return hit;
}
// raio 2D (câmera) contra caixas acima de y
export function rayBlock(ax, az, ay, bx, bz, by) {
  let tmin = 1;
  const minx = Math.min(ax, bx), maxx = Math.max(ax, bx), minz = Math.min(az, bz), maxz = Math.max(az, bz);
  const seen = new Set();
  for (let i = Math.floor(minx / CELL); i <= Math.floor(maxx / CELL); i++) for (let j = Math.floor(minz / CELL); j <= Math.floor(maxz / CELL); j++) {
    const a = grid.get(i + ',' + j); if (!a) continue;
    for (const b of a) {
      if (seen.has(b) || b.boatOnly) continue; seen.add(b);
      const dx = bx - ax, dz = bz - az; let t0 = 0, t1 = 1;
      for (const [p, d, lo, hi] of [[ax, dx, b.x0, b.x1], [az, dz, b.z0, b.z1]]) {
        if (Math.abs(d) < 1e-9) { if (p < lo || p > hi) { t0 = 2; break; } }
        else { let u0 = (lo - p) / d, u1 = (hi - p) / d; if (u0 > u1) [u0, u1] = [u1, u0]; t0 = Math.max(t0, u0); t1 = Math.min(t1, u1); }
      }
      if (t0 <= t1 && t0 < tmin) { const yy = ay + (by - ay) * t0; if (yy < b.h) tmin = t0; }
    }
  }
  return tmin;
}

// ---------------------------------------------------------------- texturas
function noiseFill(g, w, h, base, amp, n = 4000, seed = 1) {
  g.fillStyle = base; g.fillRect(0, 0, w, h); const r = rng(seed);
  for (let i = 0; i < n; i++) { const v = (r() - 0.5) * amp; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
}
function normalFrom(n, draw, k) { // mapa de normais a partir de um mapa de altura desenhado
  const c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d'); draw(g);
  const src = g.getImageData(0, 0, n, n).data; const out = g.createImageData(n, n); const H = (x, y) => src[(((y + n) % n) * n + ((x + n) % n)) * 4] / 255;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * k, dy = (H(x, y + 1) - H(x, y - 1)) * k; const l = Math.hypot(dx, dy, 1);
    const i = (y * n + x) * 4; out.data[i] = (-dx / l * 0.5 + 0.5) * 255; out.data[i + 1] = (dy / l * 0.5 + 0.5) * 255; out.data[i + 2] = (1 / l * 0.5 + 0.5) * 255; out.data[i + 3] = 255;
  }
  g.putImageData(out, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; return t;
}
function makeTextures(aniso) {
  const T = {};
  T.road = canvasTex(256, 512, (g, w, h) => {
    noiseFill(g, w, h, '#56585e', 0.12, 9000, 3);
    const r = rng(9); for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(0,0,0,${0.08 + r() * 0.1})`; g.beginPath(); g.ellipse(r() * w, r() * h, 6 + r() * 30, 4 + r() * 14, r() * 3, 0, 7); g.fill(); }
    g.fillStyle = '#e9c43a'; g.fillRect(w * 0.5 - 7, 0, 4, h); g.fillRect(w * 0.5 + 3, 0, 4, h);
    g.fillStyle = '#e8e8e8'; g.fillRect(10, 0, 5, h); g.fillRect(w - 15, 0, 5, h);
    g.fillStyle = 'rgba(255,255,255,.85)'; for (let y = 0; y < h; y += 128) { g.fillRect(w * 0.27 - 2, y, 4, 60); g.fillRect(w * 0.73 - 2, y, 4, 60); }
  }, { aniso });
  T.walk = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#aaa49a', 0.1, 5000, 5); g.strokeStyle = 'rgba(80,70,60,.35)'; g.lineWidth = 2;
    for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(0, i * 64); g.lineTo(w, i * 64); g.stroke(); g.beginPath(); g.moveTo(i * 64, 0); g.lineTo(i * 64, h); g.stroke(); }
  }, { aniso });
  T.sand = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, '#dcc596', 0.16, 30000, 7);
    const r = rng(8); g.strokeStyle = 'rgba(160,130,80,.12)'; g.lineWidth = 3;
    for (let i = 0; i < 40; i++) { g.beginPath(); const y = r() * h; g.moveTo(0, y); g.bezierCurveTo(w / 3, y + 10, w * 2 / 3, y - 10, w, y); g.stroke(); }
  }, { aniso });
  T.grass = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#5f8f3e', 0.22, 16000, 11);
    const r = rng(12); for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(${40 + r() * 60},${90 + r() * 70},${30 + r() * 30},.6)`; g.fillRect(r() * w, r() * h, 1, 3 + r() * 4); }
  }, { aniso });
  T.swamp = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#6d7c45', 0.25, 16000, 13);
    const r = rng(14); for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,70,40,${0.2 + r() * 0.2})`; g.beginPath(); g.ellipse(r() * w, r() * h, 10 + r() * 30, 6 + r() * 16, r() * 3, 0, 7); g.fill(); }
  }, { aniso });
  T.plaza = canvasTex(256, 256, (g, w, h) => {
    noiseFill(g, w, h, '#b8ad98', 0.08, 4000, 15); g.strokeStyle = 'rgba(120,100,80,.25)'; g.lineWidth = 1.5;
    for (let i = 0; i <= 8; i++) { g.beginPath(); g.moveTo(0, i * 32); g.lineTo(w, i * 32); g.stroke(); g.beginPath(); g.moveTo(i * 32, 0); g.lineTo(i * 32, h); g.stroke(); }
  }, { aniso });
  // fachada art déco: 4x4 janelas por repetição (16m x 14m)
  const decoWin = []; { const r = rng(21); for (let i = 0; i < 16; i++) decoWin.push(r()); }
  T.deco = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) {
      const x = i * 64 + 14, y = j * 64 + 16;
      g.fillStyle = '#e4ded2'; g.fillRect(x - 6, y + 34, 48, 6);
      const gr = g.createLinearGradient(0, y, 0, y + 30); gr.addColorStop(0, '#5d7b93'); gr.addColorStop(1, '#2a3c4f');
      g.fillStyle = gr; g.fillRect(x, y, 36, 32); g.fillStyle = 'rgba(255,255,255,.75)'; g.fillRect(x + 17, y, 2, 32); g.fillRect(x, y + 13, 36, 2);
    }
  }, { aniso });
  T.decoE = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) if (decoWin[i * 4 + j] < 0.45) {
      g.fillStyle = decoWin[i * 4 + j] < 0.12 ? '#9fd8ff' : '#ffc77a'; g.fillRect(i * 64 + 14, j * 64 + 16, 36, 32);
    }
  }, { aniso });
  const towWin = []; { const r = rng(31); for (let i = 0; i < 64; i++) towWin.push(r()); }
  T.tower = canvasTex(256, 256, (g, w, h) => {
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#9fc3dc'); gr.addColorStop(0.5, '#4d7593'); gr.addColorStop(1, '#8fb6cf');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { g.fillStyle = `rgba(20,40,60,${towWin[i * 8 + j] * 0.35})`; g.fillRect(i * 32 + 2, j * 32 + 3, 28, 26); }
    g.fillStyle = '#d9e2ea'; for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 2, h); g.fillRect(0, i * 32, w, 3); }
    g.fillStyle = '#e9eef2'; g.fillRect(0, 0, 4, 4);
  }, { aniso });
  T.towerE = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) if (towWin[(i * 13 + j * 7) % 64] < 0.26) {
      const k = towWin[i * 8 + j]; g.fillStyle = k < 0.45 ? '#ffd8a0' : k < 0.8 ? '#bcd8f5' : '#ff9ad0'; g.globalAlpha = 0.55 + k * 0.45; g.fillRect(i * 32 + 2, j * 32 + 3, 28, 26); g.globalAlpha = 1;
    }
  }, { aniso });
  T.decoN = normalFrom(256, (g) => { g.fillStyle = '#fff'; g.fillRect(0, 0, 256, 256); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = i * 64 + 14, y = j * 64 + 16; g.fillStyle = '#000'; g.fillRect(x, y, 36, 32); g.fillStyle = '#888'; g.fillRect(x + 17, y, 2, 32); g.fillRect(x, y + 13, 36, 2); g.fillStyle = '#fff'; g.fillRect(x - 6, y + 34, 48, 6); } }, 3);
  T.towerN = normalFrom(256, (g) => { g.fillStyle = '#777'; g.fillRect(0, 0, 256, 256); g.fillStyle = '#fff'; for (let i = 0; i < 8; i++) { g.fillRect(i * 32, 0, 2, 256); g.fillRect(0, i * 32, 256, 3); } }, 2);
  // letreiros neon (atlas 8 linhas)
  T.signs = ['HOTEL FLAMINGO', 'CAFÉ BRISA', 'CORAL MOTEL', 'SOLARA', 'PARAÍSO', 'NEON CLUB', 'SORVETERIA', 'MAR AZUL'];
  const cols = ['#ff4fb8', '#3ff4ff', '#ffb347', '#c86bff', '#ff5a5a', '#59ff9c', '#ff8ad8', '#4fb3ff'];
  T.sign = canvasTex(512, 512, (g, w, h) => {
    g.fillStyle = '#000'; g.fillRect(0, 0, w, h); g.textAlign = 'center'; g.textBaseline = 'middle';
    T.signs.forEach((s, i) => {
      g.font = 'italic 700 44px "Brush Script MT", "Segoe Script", cursive, sans-serif'; g.shadowColor = cols[i]; g.shadowBlur = 16;
      g.fillStyle = cols[i]; g.fillText(s, w / 2, i * 64 + 32); g.shadowBlur = 0; g.fillStyle = 'rgba(255,255,255,.9)'; g.font = 'italic 700 42px "Brush Script MT", "Segoe Script", cursive, sans-serif'; g.fillText(s, w / 2, i * 64 + 32);
    });
  }, { aniso, clamp: true });
  return T;
}

// ---------------------------------------------------------------- construção
export const NEON_COLS = [0xff3fa8, 0x29f0ff, 0xb45cff, 0xff9a3c, 0x45ff9a, 0xff4a5a];
export const LANDMARKS = [];
export const SPAWNS = { parked: [], boats: [], taxiStands: [] };

export function buildWorld(scene, Q) {
  const T = makeTextures(Q.aniso);
  const M = {};
  M.deco = new THREE.MeshStandardMaterial({ map: T.deco, normalMap: Q.level === 'low' ? null : T.decoN, emissiveMap: T.decoE, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.78, metalness: 0 });
  M.tower = new THREE.MeshStandardMaterial({ map: T.tower, normalMap: Q.level === 'low' ? null : T.towerN, emissiveMap: T.towerE, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, roughness: 0.12, metalness: 0.75 });
  M.misc = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8 });
  M.metal = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.7 });
  M.road = new THREE.MeshStandardMaterial({ map: T.road, roughness: 0.92 });
  M.walk = new THREE.MeshStandardMaterial({ map: T.walk, vertexColors: true, roughness: 0.85 });
  M.grass = new THREE.MeshStandardMaterial({ map: T.grass, roughness: 0.95 });
  M.swamp = new THREE.MeshStandardMaterial({ map: T.swamp, roughness: 0.95 });
  M.plaza = new THREE.MeshStandardMaterial({ map: T.plaza, roughness: 0.85 });
  M.sand = new THREE.MeshStandardMaterial({ map: T.sand, roughness: 1 });
  M.pool = new THREE.MeshStandardMaterial({ color: 0x38d4e8, roughness: 0.05, metalness: 0.2, emissive: 0x0a6f88, emissiveIntensity: 0.2 });
  M.neon = NEON_COLS.map(c => new THREE.MeshBasicMaterial({ color: c, toneMapped: false }));
  M.sign = new THREE.MeshBasicMaterial({ map: T.sign, toneMapped: false, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  M.lampHead = new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false });
  T.road.repeat.set(1, 1);

  const chunks = new Map();
  const CH = 250;
  const chunk = (x, z) => {
    const k = Math.floor(x / CH) + ',' + Math.floor(z / CH); let c = chunks.get(k);
    if (!c) { c = { cx: (Math.floor(x / CH) + 0.5) * CH, cz: (Math.floor(z / CH) + 0.5) * CH, deco: new MeshBuilder(), tower: new MeshBuilder(), misc: new MeshBuilder(), metal: new MeshBuilder(), pool: new MeshBuilder(), sign: new MeshBuilder(), lampHead: new MeshBuilder(), neon: NEON_COLS.map(() => new MeshBuilder()) }; chunks.set(k, c); }
    return c;
  };
  const roads = new MeshBuilder(), walks = new MeshBuilder();
  const W = C(0xffffff);
  const R = rng(2026);
  const lampPos = [], palmPos = [], treePos = [], umbrellas = [], towels = [];

  // ---- chão
  const groundMesh = (x0, z0, x1, z1, mat, rep, y = 0) => {
    const b = new MeshBuilder(); b.hrect(x0, z0, x1, z1, y, W, rep);
    const m = new THREE.Mesh(b.geometry(), mat); m.receiveShadow = true; scene.add(m); return m;
  };
  groundMesh(ISL.x0, ISL.z0, 332, ISL.z1, M.plaza, 24, -0.01);
  groundMesh(-680, MAIN.z0, MAIN.x1, MAIN.z1, M.plaza, 24, -0.01);
  groundMesh(MAIN.x0, MAIN.z0, -680, MAIN.z1, M.swamp, 30, -0.01);
  // aterro visual do Circuito Serpentina (ao sul de MAIN.z1; a altura já vem de landBase)
  groundMesh(SERP_ZONE.x0, MAIN.z1 - 4, -680, SERP_ZONE.z1, M.swamp, 30, -0.01);
  groundMesh(-680, MAIN.z1 - 4, SERP_ZONE.x1, SERP_ZONE.z1, M.plaza, 24, -0.01);
  // praia inclinada
  {
    const b = new MeshBuilder(); const xs = [322, 330, 360, 390, 420, 480];
    for (let i = 0; i < xs.length - 1; i++) {
      const xa = xs[i], xb = xs[i + 1], ya = xa > 330 ? -(xa - 330) * 0.011 : 0, yb = xb > 330 ? -(xb - 330) * 0.011 : 0;
      const n = new THREE.Vector3(yb - ya, xb - xa, 0).normalize();
      b.quad([xa, ya, ISL.z1], [xb, yb, ISL.z1], [xb, yb, ISL.z0], [xa, ya, ISL.z0], [-n.x * 0 + n.x, n.y, 0], [[xa / 20, ISL.z1 / 20], [xb / 20, ISL.z1 / 20], [xb / 20, ISL.z0 / 20], [xa / 20, ISL.z0 / 20]], W);
    }
    const m = new THREE.Mesh(b.geometry(), M.sand); m.receiveShadow = true; scene.add(m);
  }
  // muretas (seawall)
  const sea = new MeshBuilder(); const wallC = C(0xb9b2a4);
  sea.box(ISL.x0 - 1, -1.5, 0, 2, 3, ISL.z1 - ISL.z0, wallC);
  sea.box((ISL.x0 + 330) / 2, -1.5, ISL.z0 - 1, 330 - ISL.x0, 3, 2, wallC); sea.box((ISL.x0 + 330) / 2, -1.5, ISL.z1 + 1, 330 - ISL.x0, 3, 2, wallC);
  sea.box(MAIN.x1 + 1, -1.5, 0, 2, 3, MAIN.z1 - MAIN.z0, wallC);
  sea.box((MAIN.x0 + MAIN.x1) / 2, -1.5, MAIN.z0 - 1, MAIN.x1 - MAIN.x0, 3, 2, wallC); sea.box((MAIN.x0 + MAIN.x1) / 2, -1.5, MAIN.z1 + 1, MAIN.x1 - MAIN.x0, 3, 2, wallC);
  sea.box(MAIN.x0 - 1, -1.5, 0, 2, 3, MAIN.z1 - MAIN.z0, wallC);
  // mureta do aterro da Serpentina
  sea.box((SERP_ZONE.x0 + SERP_ZONE.x1) / 2, -1.5, SERP_ZONE.z1 + 1, SERP_ZONE.x1 - SERP_ZONE.x0, 3, 2, wallC);
  sea.box(SERP_ZONE.x1 + 1, -1.5, (MAIN.z1 + SERP_ZONE.z1) / 2, 2, 3, SERP_ZONE.z1 - MAIN.z1 + 4, wallC);
  sea.box(SERP_ZONE.x0 - 1, -1.5, (MAIN.z1 + SERP_ZONE.z1) / 2, 2, 3, SERP_ZONE.z1 - MAIN.z1 + 4, wallC);
  // grade da mureta na baía
  for (let z = -700; z < 700; z += 3) { sea.box(-259, 0.5, z, 0.12, 1, 0.12, C(0xeeeeee)); sea.box(29, 0.5, z, 0.12, 1, 0.12, C(0xeeeeee)); }
  sea.box(-259, 1.0, 0, 0.18, 0.08, 1420, C(0xffffff)); sea.box(29, 1.0, 0, 0.18, 0.08, 1360, C(0xffffff));
  { const m = new THREE.Mesh(sea.geometry(), M.misc); m.receiveShadow = true; scene.add(m); }

  // ---- vias e calçadas
  const walkC = C(0xffffff), curbC = C(0xe8e2d6);
  for (const s of SEGS) {
    const w = s.w, along = s.axis === 'z';
    const lo = along ? Math.min(s.a.z, s.b.z) : Math.min(s.a.x, s.b.x), hi = along ? Math.max(s.a.z, s.b.z) : Math.max(s.a.x, s.b.x);
    const c = along ? s.a.x : s.a.z;
    const trimA = s.a.segs.length > 1 ? w : 0, trimB = s.b.segs.length > 1 ? w : 0;
    const [ta, tb] = (along ? s.a.z < s.b.z : s.a.x < s.b.x) ? [trimA, trimB] : [trimB, trimA];
    const l0 = lo + ta, l1 = hi - tb; const y = s.kind === 'rural' ? 0.03 : 0.02;
    const yb = onBridge(along ? c : (l0 + l1) / 2, along ? (l0 + l1) / 2 : c) ? 0.2 : y;
    if (l1 > l0) {
      const vr = 1 / 20;
      if (along) roads.quad([c - w, yb, l1], [c + w, yb, l1], [c + w, yb, l0], [c - w, yb, l0], [0, 1, 0], [[0, l1 * vr], [1, l1 * vr], [1, l0 * vr], [0, l0 * vr]], W);
      else roads.quad([l0, yb, c + w], [l1, yb, c + w], [l1, yb, c - w], [l0, yb, c - w], [0, 1, 0], [[0, l0 * vr], [0, l1 * vr], [1, l1 * vr], [1, l0 * vr]].map(([u, v], i) => [[1, 1, 0, 0][i], v]), W);
    }
    // calçadas
    if (s.kind === 'city') {
      for (const sd of [-1, 1]) {
        const off = c + sd * (w + SW / 2);
        const cx = along ? off : (lo + hi) / 2, cz = along ? (lo + hi) / 2 : off;
        if (onBridge(cx, cz)) { walks.box(cx, 0.35, cz, along ? SW - 1 : hi - lo, 0.3, along ? hi - lo : SW - 1, walkC, { u: 8, v: 8, roof: 0, topUV: null }); continue; }
        const len = hi - lo + (s.a.segs.length > 1 ? 0 : 0);
        walks.box(cx, 0.08, cz, along ? SW : len, 0.16, along ? len : SW, curbC, { noTop: true });
        walks.hrect(along ? off - SW / 2 : lo, along ? lo : off - SW / 2, along ? off + SW / 2 : hi, along ? hi : off + SW / 2, 0.16, walkC, 4);
      }
      // faixas de pedestre e postes de luz
      for (const [n, dir] of [[s.a, 1], [s.b, -1]]) {
        if (n.segs.length < 3) continue;
        const t0 = (along ? n.z : n.x) + dir * (w + 1.5);
        for (let k = -w + 1; k < w - 0.5; k += 1.6) {
          if (along) roads.quad([c + k, 0.035, t0 + 1.3], [c + k + 0.8, 0.035, t0 + 1.3], [c + k + 0.8, 0.035, t0 - 1.3], [c + k, 0.035, t0 - 1.3], [0, 1, 0], [[0.03, 0.5], [0.04, 0.5], [0.04, 0.51], [0.03, 0.51]], W);
          else roads.quad([t0 - 1.3, 0.035, c + k + 0.8], [t0 + 1.3, 0.035, c + k + 0.8], [t0 + 1.3, 0.035, c + k], [t0 - 1.3, 0.035, c + k], [0, 1, 0], [[0.03, 0.5], [0.04, 0.5], [0.04, 0.51], [0.03, 0.51]], W);
        }
      }
      for (let t = lo + 15; t < hi - 10; t += 32) for (const sd of [-1, 1]) {
        const off = c + sd * (w + 0.7);
        lampPos.push(along ? [off, t, sd > 0 ? -Math.PI / 2 : Math.PI / 2] : [t, off, sd > 0 ? Math.PI : 0]);
      }
    } else {
      for (let t = lo + 20; t < hi; t += 45) treePos.push(along ? [c + (R() < 0.5 ? -1 : 1) * (w + 4 + R() * 10), t] : [t, c + (R() < 0.5 ? -1 : 1) * (w + 4 + R() * 10)]);
    }
  }
  for (const n of NODES) { // cruzamentos
    if (n.segs.length < 2) continue;
    const w = n.segs[0].w, y = onBridge(n.x, n.z) ? 0.2 : 0.02;
    roads.quad([n.x - w, y, n.z + w], [n.x + w, y, n.z + w], [n.x + w, y, n.z - w], [n.x - w, y, n.z - w], [0, 1, 0], [[0.3, 0.1], [0.36, 0.1], [0.36, 0.16], [0.3, 0.16]], W);
    if (n.segs[0].kind === 'city') for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const cx = n.x + sx * (w + SW / 2), cz = n.z + sz * (w + SW / 2);
      walks.box(cx, 0.08, cz, SW, 0.16, SW, curbC, { noTop: true }); walks.hrect(cx - 2, cz - 2, cx + 2, cz + 2, 0.16, walkC, 4);
    }
  }
  // promenade da Ocean Drive (lado da praia)
  walks.hrect(307 + 4, -660, 324, 660, 0.16, C(0xf2e9de), 4); walks.box(324, 0.08, 0, 0.4, 0.16, 1320, curbC, { noTop: true });
  for (let z = -640; z <= 640; z += 16) palmPos.push([318 + (R() - 0.5) * 2, z + (R() - 0.5) * 4, 0.9 + R() * 0.35]);
  // ilha: calçadas de bloco (interior)
  for (const b of BLOCKS) {
    const x0 = b.x0 + RW + SW, x1 = b.x1 - RW - SW, z0 = b.z0 + RW + SW, z1 = b.z1 - RW - SW;
    b.ix0 = x0; b.ix1 = x1; b.iz0 = z0; b.iz1 = z1;
  }
  const roadMesh = new THREE.Mesh(roads.geometry(), M.road); roadMesh.receiveShadow = true; roadMesh.renderOrder = 0; scene.add(roadMesh);
  const walkMesh = new THREE.Mesh(walks.geometry(), M.walk); walkMesh.receiveShadow = true; scene.add(walkMesh);
  // ponte: pilares, guarda-corpo
  for (const zz of [-450, 450]) {
    const b = chunk(-120, zz).misc;
    b.box(-115, -0.3, zz, 290, 1.0, 2 * (RW + 4.4), C(0xd7d2c8), { noTop: true, bottom: true });
    for (let x = -250; x < 30; x += 24) { b.box(x, -3, zz - 7, 1.6, 6, 1.6, C(0xc6c0b4)); b.box(x, -3, zz + 7, 1.6, 6, 1.6, C(0xc6c0b4)); }
    for (const sd of [-1, 1]) b.box(-115, 0.9, zz + sd * (RW + 4.2), 290, 0.9, 0.35, C(0xf4f1ec));
    for (let x = -250; x < 30; x += 36) for (const sd of [-1, 1]) lampPos.push([x, zz + sd * (RW + 4), sd > 0 ? Math.PI : 0]);
    addBox(-262, zz - RW - 4.8, 32, zz - RW - 4.1, 2.2); addBox(-262, zz + RW + 4.1, 32, zz + RW + 4.8, 2.2);
    addBox(-262, zz - RW - 6, 32, zz + RW + 6, 100, true);
  }

  // ---- prédios
  const pastel = [0xf7c6d9, 0xa8e6e1, 0xfff1b8, 0xc9b8f2, 0xffd0a8, 0xbfe8c0, 0xf9e0f0, 0xffffff, 0xd6f0ff, 0xffe0c4];
  const decoAccent = [0x2ab3b8, 0xff6fa6, 0xffb347, 0x7d6cf0, 0x46c08c, 0x3a8fd8];
  const neonBox = (ch, ci, x, y, z, sx, sy, sz) => ch.neon[ci].box(x, y, z, sx, sy, sz, W);
  function decoBuilding(cx, cz, w, d, h, ry, front) {
    const ch = chunk(cx, cz); const col = C(pick(R, pastel)), acc = C(pick(R, decoAccent)); const ni = Math.floor(R() * NEON_COLS.length);
    ch.deco.box(cx, h / 2, cz, w, h, d, col, { u: 16, v: 14, ry, v0: 0.02, ao: 0.62 });
    const fx = Math.sin(ry), fz = Math.cos(ry); // frente local +z
    const px = (a, b) => [cx + a * Math.cos(ry) + b * fx, cz - a * Math.sin(ry) + b * fz];
    // faixas horizontais (eyebrows) e platibanda
    for (let y = 3.6; y < h - 1; y += 3.5) { const [x, z] = px(0, d / 2 + 0.35); ch.misc.box(x, y, z, w * 0.98, 0.18, 0.7, C(0xffffff), { ry }); }
    { const [x, z] = px(0, 0); ch.misc.box(x, h + 0.6, z, w + 0.4, 1.2, d + 0.4, acc, { ry }); }
    // torre central escalonada (art déco)
    if (R() < 0.75) {
      const tw = Math.min(5, w * 0.25), th = 4 + R() * 6; const [x, z] = px(0, d / 2 - 1.5);
      ch.misc.box(x, h + th / 2, z, tw, th, 3, col, { ry }); ch.misc.box(x, h + th + 0.6, z, tw * 0.6, 1.2, 2.4, acc, { ry });
      const [nx, nz] = px(0, d / 2 + 0.05);
      neonBox(ch, ni, nx, h * 0.5 + th / 2, nz, 0.25, h + th - 2, 0.2); // tubo vertical
      ch.neon[ni].box(nx, h + 0.1, nz, w, 0.16, 0.16, W, { ry });
    } else {
      const [nx, nz] = px(0, d / 2 + 0.7); ch.neon[ni].box(nx, h + 1.25, nz, w + 0.4, 0.18, 0.18, W, { ry });
    }
    // marquise térrea + toldo
    { const [x, z] = px(0, d / 2 + 1.6); ch.misc.box(x, 3.2, z, w * 0.9, 0.25, 3.2, acc, { ry }); const [nx, nz] = px(0, d / 2 + 3.2); ch.neon[(ni + 2) % NEON_COLS.length].box(nx, 3.05, nz, w * 0.9, 0.12, 0.12, W, { ry }); }
    // letreiro
    if (R() < 0.7) {
      const si = Math.floor(R() * 8); const [x, z] = px(0, d / 2 + 0.5); const sw = Math.min(w * 0.85, 12), sh = sw / 8 * 1.1, yy = 3.9 + sh / 2;
      const cs = Math.cos(ry), sn = Math.sin(ry); const v0 = 1 - (si + 1) / 8, v1 = 1 - si / 8;
      const P = (a, b) => [x + a * cs, b, z - a * sn];
      ch.sign.quad(P(-sw / 2, yy - sh / 2), P(sw / 2, yy - sh / 2), P(sw / 2, yy + sh / 2), P(-sw / 2, yy + sh / 2), [fx, 0, fz], [[0, v0], [1, v0], [1, v1], [0, v1]], W);
    }
    addBox(cx - (Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d) / 2, cz - (Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d) / 2,
      cx + (Math.abs(Math.cos(ry)) * w + Math.abs(Math.sin(ry)) * d) / 2, cz + (Math.abs(Math.sin(ry)) * w + Math.abs(Math.cos(ry)) * d) / 2, h + 1);
    return { h };
  }
  function tower(cx, cz, w, d, h) {
    const ch = chunk(cx, cz); const tint = C(pick(R, [0xffffff, 0xdff2ff, 0xe8fff4, 0xfff1e0, 0xe6e0ff]));
    const pod = 8 + Math.floor(R() * 3) * 4;
    ch.misc.box(cx, pod / 2, cz, w + 6, pod, d + 6, C(pick(R, [0xd9d4cc, 0xcfc8bd, 0xe6e1d8])), { ao: 0.55 });
    ch.tower.box(cx, pod + (h - pod) / 2, cz, w, h - pod, d, tint, { u: 32, v: 32, roof: 0.004 });
    const style = R();
    if (style < 0.35) { ch.tower.box(cx, h + 6, cz, w * 0.7, 12, d * 0.7, tint, { u: 32, v: 32 }); ch.neon[Math.floor(R() * 6)].box(cx, h + 12.3, cz, w * 0.72, 0.4, d * 0.72, W); }
    else if (style < 0.6) { ch.misc.box(cx, h + 1, cz, w * 0.9, 2, d * 0.9, C(0x9aa3ab)); ch.metal.box(cx, h + 10, cz, 0.6, 18, 0.6, C(0xc8c8c8)); }
    else { const ni = Math.floor(R() * 6); for (const sx of [-1, 1]) { ch.neon[ni].box(cx + sx * (w / 2 + 0.06), pod + (h - pod) / 2, cz + d / 2 + 0.06, 0.25, h - pod, 0.25, W); } ch.neon[ni].box(cx, h + 0.2, cz + d / 2 + 0.06, w, 0.3, 0.3, W); }
    addBox(cx - w / 2 - 3, cz - d / 2 - 3, cx + w / 2 + 3, cz + d / 2 + 3, h + 12);
    return h;
  }
  const flamingoAt = { x: 0, z: 0 };
  for (const b of BLOCKS) {
    const x0 = b.ix0, x1 = b.ix1, z0 = b.iz0, z1 = b.iz1;
    const ch = chunk((x0 + x1) / 2, (z0 + z1) / 2);
    if (b.kind === 'deco' || b.kind === 'hotel') {
      // pátio central com piscina e grama
      ch.misc.hrect(x0, z0, x1, z1, 0.17, C(0x8fbf6a));
      const pw = (x1 - x0) * 0.3, pd = (z1 - z0) * 0.25, pcx = (x0 + x1) / 2, pcz = (z0 + z1) / 2;
      ch.misc.box(pcx, 0.2, pcz, pw + 3, 0.06, pd + 3, C(0xf1ece2));
      ch.pool.hrect(pcx - pw / 2, pcz - pd / 2, pcx + pw / 2, pcz + pd / 2, 0.25, W);
      palmPos.push([pcx - pw / 2 - 3, pcz - pd / 2 - 3, 0.8], [pcx + pw / 2 + 3, pcz + pd / 2 + 3, 0.9]);
      const deep = b.kind === 'deco' ? 24 : 26;
      const hmin = b.kind === 'deco' ? 10 : 18, hmax = b.kind === 'deco' ? 22 : 52;
      // lados: leste (frente Ocean Drive se deco), oeste, norte, sul
      const sides = [
        { a0: z0, a1: z1, fixed: x1 - deep / 2, ry: Math.PI / 2, alongZ: true },
        { a0: z0, a1: z1, fixed: x0 + deep / 2, ry: -Math.PI / 2, alongZ: true },
      ];
      for (const sd of sides) {
        let a = sd.a0 + 1;
        while (a < sd.a1 - 10) {
          const w = Math.min(14 + R() * 16, sd.a1 - 1 - a); if (w < 10) break;
          const h = hmin + R() * (hmax - hmin);
          const cz = a + w / 2;
          const r = decoBuilding(sd.fixed, cz, w - 0.6, deep - 2, Math.round(h / 3.5) * 3.5 + 0.5, sd.ry);
          if (b.kind === 'deco' && sd.ry > 0 && !flamingoAt.set && Math.abs(cz + 220) < 25) { flamingoAt.x = sd.fixed + deep / 2; flamingoAt.z = cz; flamingoAt.set = 1; }
          a += w;
        }
      }
      for (const [zf, ry] of [[z0 + 10, Math.PI], [z1 - 10, 0]]) {
        let a = x0 + deep + 1;
        while (a < x1 - deep - 8) { const w = Math.min(12 + R() * 10, x1 - deep - 1 - a); if (w < 8) break; decoBuilding(a + w / 2, zf, w - 0.6, 18, Math.round((hmin + R() * (hmax - hmin) * 0.6) / 3.5) * 3.5 + 0.5, ry); a += w; }
      }
    } else if (b.kind === 'tower') {
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const dist = Math.hypot(cx + 480, cz) / 600; const hpeak = 60 + (1 - clamp(dist, 0, 1)) * 170;
      ch.misc.hrect(x0, z0, x1, z1, 0.17, C(0xcfc7b6));
      const n = R() < 0.4 ? 1 : 2;
      if (n === 1) tower(cx, cz, 36 + R() * 16, 40 + R() * 20, hpeak * (0.7 + R() * 0.45));
      else { tower(cx, z0 + 34, 30 + R() * 14, 30 + R() * 14, hpeak * (0.5 + R() * 0.5)); tower(cx, z1 - 34, 30 + R() * 14, 30 + R() * 14, hpeak * (0.45 + R() * 0.55)); }
      for (let i = 0; i < 4; i++) palmPos.push([x0 + 3 + (i % 2) * (x1 - x0 - 6), z0 + 3 + (i >> 1) * (z1 - z0 - 6), 0.85]);
    } else if (b.kind === 'park') {
      ch.misc.hrect(x0, z0, x1, z1, 0.17, C(0x6faa4c));
      for (let i = 0; i < 26; i++) palmPos.push([x0 + 4 + R() * (x1 - x0 - 8), z0 + 4 + R() * (z1 - z0 - 8), 0.8 + R() * 0.4]);
      b.wheel = { x: (x0 + x1) / 2 + 18, z: (z0 + z1) / 2 };
    }
  }
  // Torre Aurora — mais alta
  {
    const cx = -480, cz = 75; tower(cx, cz, 40, 40, 250);
    const ch = chunk(cx, cz); ch.neon[1].box(cx, 262.5, cz, 22, 0.6, 22, W); ch.metal.box(cx, 285, cz, 1, 40, 1, C(0xdddddd));
    LANDMARKS.push({ id: 'torre', name: 'Torre Aurora', x: cx + 60, z: cz + 60, r: 40, look: [cx, 120, cz] });
  }
  // ---- marina
  {
    const ch = chunk(-220, 0); const wood = C(0x9a7652);
    for (const p of PIERS.slice(0, 4)) { ch.misc.box((p.x0 + p.x1) / 2, 0.15, (p.z0 + p.z1) / 2, p.x1 - p.x0, 0.3, p.z1 - p.z0, wood); for (let x = p.x0 + 4; x < p.x1; x += 8) { ch.misc.box(x, -1, p.z0, 0.35, 2.4, 0.35, C(0x6b513a)); ch.misc.box(x, -1, p.z1, 0.35, 2.4, 0.35, C(0x6b513a)); } addBox(p.x0, p.z0, p.x1, p.z1, 100, true); }
    ch.misc.box(-282, 4, -130, 22, 8, 14, C(0xffffff)); ch.neon[1].box(-282, 8.2, -122.9, 22, 0.25, 0.25, W);
    addBox(-293, -137, -271, -123, 9);
    LANDMARKS.push({ id: 'marina', name: 'Marina Solara', x: -264, z: 10, r: 26, look: [-200, 2, 10] });
    SPAWNS.boats.push({ x: -215, z: -50, h: Math.PI / 2 }, { x: -215, z: 70, h: Math.PI / 2 });
  }
  // iates decorativos (colisão só para barcos)
  const yachts = [];
  for (const [x, z] of [[-200, -95], [-190, -8], [-230, 25], [-180, 55], [-235, -62], [-150, 120]]) { yachts.push([x, z]); addBox(x - 9, z - 3, x + 9, z + 3, 100, true); }
  // ---- píer da praia
  {
    const ch = chunk(420, -300); const p = PIERS[4];
    ch.misc.box((p.x0 + p.x1) / 2, 0.75, -299, p.x1 - p.x0, 0.3, 6, C(0xa88560));
    for (let x = p.x0; x < p.x1; x += 9) for (const sd of [-1, 1]) ch.misc.box(x, -1.5, -299 + sd * 2.6, 0.45, 4.5, 0.45, C(0x6b513a));
    for (const sd of [-1, 1]) ch.misc.box((p.x0 + p.x1) / 2, 1.45, -299 + sd * 2.9, p.x1 - p.x0, 0.1, 0.1, C(0xeeeeee));
    ch.misc.box(535, 2.5, -299, 10, 3.5, 8, C(0x3fa8c8)); ch.misc.box(535, 4.5, -299, 11, 0.5, 9, C(0xffffff));
    addBox(p.x0, -302.6, p.x1, -302.2, 1.8); addBox(p.x0, -295.8, p.x1, -295.4, 1.8); addBox(p.x0, -303, p.x1 + 2, -295, 100, true);
    LANDMARKS.push({ id: 'pier', name: 'Píer da Praia', x: 500, z: -299, r: 16, look: [540, 3, -299] });
  }
  // ---- farol na ponta sul
  {
    const ch = chunk(200, 655); const x = 210, z = 655;
    for (let i = 0; i < 7; i++) ch.misc.box(x, i * 4 + 2, z, 5 - i * 0.3, 4, 5 - i * 0.3, C(i % 2 ? 0xd8342c : 0xffffff));
    ch.misc.box(x, 29.5, z, 3.6, 3, 3.6, C(0x222222)); ch.neon[3].box(x, 29.5, z, 2.6, 2.2, 2.6, W); ch.misc.box(x, 31.6, z, 4.2, 1.2, 4.2, C(0xd8342c));
    addBox(x - 3, z - 3, x + 3, z + 3, 34);
    ch.misc.hrect(ISL.x0, 615, 322, ISL.z1, 0.05, C(0x7db35a));
    for (let i = 0; i < 20; i++) palmPos.push([60 + R() * 250, 625 + R() * 50, 0.8 + R() * 0.4]);
    LANDMARKS.push({ id: 'farol', name: 'Farol de Solara', x: 190, z: 630, r: 22, look: [x, 20, z] });
    ch.misc.hrect(ISL.x0, ISL.z0, 322, -615, 0.05, C(0x7db35a));
    for (let i = 0; i < 16; i++) palmPos.push([60 + R() * 250, -675 + R() * 55, 0.8 + R() * 0.4]);
  }
  // ---- praia: postos salva-vidas, guarda-sóis, toalhas
  {
    const hutCols = [0xff6fa6, 0x2ab3b8, 0xffd23f, 0x7d6cf0, 0xff8a3c, 0x46c08c];
    let k = 0;
    for (let z = -560; z <= 560; z += 140) {
      const ch = chunk(352, z); const c = C(hutCols[k++ % hutCols.length]); const x = 352, y = groundY(x, z);
      for (const [a, b] of [[-1.4, -1.4], [1.4, -1.4], [-1.4, 1.4], [1.4, 1.4]]) ch.misc.box(x + a, y + 1.4, z + b, 0.25, 2.8, 0.25, C(0xffffff));
      ch.misc.box(x, y + 3.0, z, 3.6, 0.3, 3.6, C(0xffffff)); ch.misc.box(x, y + 4.4, z, 3.2, 2.6, 3.2, c); ch.misc.box(x, y + 5.9, z, 3.8, 0.4, 3.8, C(0xffffff));
      ch.misc.box(x + 1.7, y + 4.6, z, 0.06, 1.2, 2.4, C(0x335577));
      addBox(x - 1.7, z - 1.7, x + 1.7, z + 1.7, 6.2);
      if (k === 5) LANDMARKS.push({ id: 'salva', name: 'Posto Salva-vidas', x: x - 12, z, r: 14, look: [x, 4, z] });
    }
    for (let i = 0; i < 140; i++) { const x = 334 + R() * 44, z = -620 + R() * 1240; umbrellas.push([x, z, R()]); towels.push([x + 1.5, z + (R() - 0.5) * 2, R()]); }
  }
  // ---- glades: mirante, cabana
  {
    const ch = chunk(-950, -150); const wood = C(0x8a6a48);
    const p = PIERS[5]; ch.misc.box((p.x0 + p.x1) / 2, 0.25, -150, p.x1 - p.x0, 0.3, 4, wood);
    for (const [a, b] of [[-3, -3], [3, -3], [-3, 3], [3, 3]]) ch.misc.box(-965 + a, 5, -150 + b, 0.5, 10, 0.5, wood);
    ch.misc.box(-965, 9.6, -150, 7.5, 0.4, 7.5, wood); ch.misc.box(-965, 12.6, -150, 8.5, 0.5, 8.5, C(0x5b4632));
    addBox(-969, -154, -961, -146, 13);
    ch.misc.box(-700, 2, 30, 10, 4, 8, C(0x8a6a48)); ch.misc.box(-700, 4.4, 30, 11.5, 0.6, 9.5, C(0x4a6a3a)); addBox(-705, 26, -695, 34, 5);
    LANDMARKS.push({ id: 'glades', name: 'Mirante dos Glades', x: -935, z: -150, r: 20, look: [-1000, 3, -150] });
    for (let i = 0; i < 260; i++) { const x = -1080 + R() * 400, z = -700 + R() * 1400; if (Math.abs(z) < 12 || Math.abs(x + 860) < 10 || inTrackZone(x, z, 3) || inSerpZone(x, z, 6)) continue; treePos.push([x, z]); }
    for (let i = 0; i < 50; i++) { const pp = [-1080 + R() * 400, -700 + R() * 1400, 0.6 + R() * 0.4]; if (!inTrackZone(pp[0], pp[1], 3) && !inSerpZone(pp[0], pp[1], 6)) palmPos.push(pp); }
  }
  // poças e canais do pântano (água escura que reflete o céu)
  {
    const pm = new THREE.MeshStandardMaterial({ color: 0x2a3a2a, roughness: 0.06, metalness: 0.1 });
    const pb = new MeshBuilder();
    for (const p of POOLS) pb.addGeo(new THREE.CircleGeometry(p.r, 20).rotateX(-Math.PI / 2), new THREE.Matrix4().makeTranslation(p.x, 0.04, p.z), C(0xffffff));
    const m = new THREE.Mesh(pb.geometry(), pm); m.receiveShadow = true; scene.add(m);
    const lily = new THREE.InstancedMesh(new THREE.CircleGeometry(0.6, 6).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x4f8a3a, roughness: 0.8 }), 160);
    const mt = new THREE.Matrix4(); for (let i = 0; i < 160; i++) { const p = POOLS[i % POOLS.length]; const a = R() * 6.28, rr = R() * p.r * 0.85; mt.makeScale(0.6 + R(), 1, 0.6 + R()).setPosition(p.x + Math.cos(a) * rr, 0.06, p.z + Math.sin(a) * rr); lily.setMatrixAt(i, mt); }
    scene.add(lily);
  }
  // pontes para foto e roda-gigante
  LANDMARKS.push({ id: 'ponte', name: 'Ponte do Pôr do Sol', x: -120, z: 445, r: 22, look: [-500, 40, 450] });
  LANDMARKS.push({ id: 'flamingo', name: 'Hotel Flamingo (Ocean Drive)', x: flamingoAt.x + 22, z: flamingoAt.z, r: 16, look: [flamingoAt.x - 8, 8, flamingoAt.z] });

  // ---- malhas finais dos chunks
  const dyn = { wheel: null, lighthouse: null, neonMeshes: [] }; const lodList = [];
  for (const c of chunks.values()) {
    const add = (b, mat, shadow = true) => { if (!b.count) return; const m = new THREE.Mesh(b.geometry(), mat); m.castShadow = shadow; m.receiveShadow = true; scene.add(m); return m; };
    add(c.deco, M.deco); add(c.tower, M.tower);
    // detalhes (térreo, letreiros, neon, metais) somem de longe em aparelhos fracos — fachadas e torres ficam (horizonte)
    const det = [add(c.misc, M.misc), add(c.metal, M.metal), add(c.pool, M.pool, false), ...c.neon.map((b, i) => add(b, M.neon[i], false))];
    const s = add(c.sign, M.sign, false); if (s) s.renderOrder = 2; det.push(s);
    for (const m of det) if (m) lodList.push({ m, x: c.cx, z: c.cz });
  }
  // ---- roda-gigante
  {
    const pb = BLOCKS.find(b => b.kind === 'park'); const { x, z } = pb.wheel;
    const g = new THREE.Group(); g.position.set(x, 26, z); g.rotation.y = Math.PI / 2;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(22, 0.35, 6, 64), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.3 }));
    const lights = new THREE.Mesh(new THREE.TorusGeometry(22.6, 0.18, 4, 96), M.neon[0]);
    const spokes = new MeshBuilder();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; spokes.addGeo(new THREE.BoxGeometry(0.18, 22, 0.18), new THREE.Matrix4().makeRotationZ(a).multiply(new THREE.Matrix4().makeTranslation(0, 11, 0)), C(0xffffff)); }
    const sp = new THREE.Mesh(spokes.geometry(), M.metal);
    const wheel = new THREE.Group(); wheel.add(rim, lights, sp); g.add(wheel);
    const cabins = []; const cg = new THREE.BoxGeometry(2.2, 2.4, 2.2);
    for (let i = 0; i < 16; i++) { const m = new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: NEON_COLS[i % 6], roughness: 0.5 })); g.add(m); cabins.push(m); }
    const leg = new MeshBuilder(); for (const sd of [-1, 1]) for (const sx of [-1, 1]) leg.addGeo(new THREE.BoxGeometry(0.6, 30, 0.6), new THREE.Matrix4().makeTranslation(sx * 7, -12, sd * 1.8).multiply(new THREE.Matrix4().makeRotationZ(-sx * 0.25)), C(0xeeeeee));
    g.add(new THREE.Mesh(leg.geometry(), M.metal)); scene.add(g);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    addBox(x - 9, z - 4, x + 9, z + 4, 50);
    dyn.wheel = { wheel, cabins };
    LANDMARKS.push({ id: 'roda', name: 'Roda-gigante da Baía', x: x - 40, z: z + 10, r: 20, look: [x, 26, z] });
  }

  // ---- palmeiras (instanciadas, com vento)
  const palmTime = { value: 0 };
  {
    const trunk = new MeshBuilder(), crown = new MeshBuilder();
    const H = 9, segs = 5;
    for (let i = 0; i < segs; i++) {
      const t0 = i / segs, t1 = (i + 1) / segs; const bend = t => t * t * 1.6;
      const r0 = 0.32 - t0 * 0.12, r1 = 0.32 - t1 * 0.12;
      const g = new THREE.CylinderGeometry(r1, r0 * 1.06, H / segs, 6, 1, true);
      trunk.addGeo(g, new THREE.Matrix4().makeTranslation(bend((t0 + t1) / 2), H * (t0 + t1) / 2, 0), C(i % 2 ? 0x8b6d4e : 0x9c7d5c));
    }
    const top = [1.6, H, 0];
    const frond = (ang, droop, len) => {
      const pts = 4; const dir = [Math.cos(ang), Math.sin(ang)];
      for (let i = 0; i < pts; i++) {
        const a = i / pts, b = (i + 1) / pts;
        const P = (t, side) => { const w = Math.sin(t * Math.PI) * 0.75 * side; const x = dir[0] * t * len - dir[1] * w, z = dir[1] * t * len + dir[0] * w; const y = Math.sin(t * 1.3) * 1.2 - t * t * droop; return [top[0] + x, top[1] + y, top[2] + z]; };
        const n = [0, 1, 0]; const gc = C(0x3f8a2e).lerp(C(0x7fbf3f), a * 0.6);
        crown.quad(P(a, -1), P(b, -1), P(b, 1), P(a, 1), n, [[0, a], [0, b], [1, b], [1, a]], gc);
      }
    };
    for (let i = 0; i < 9; i++) frond(i / 9 * Math.PI * 2 + (i % 2) * 0.2, 2.2 + (i % 3) * 0.6, 4.4 + (i % 2) * 0.8);
    crown.addGeo(new THREE.SphereGeometry(0.45, 5, 4), new THREE.Matrix4().makeTranslation(top[0], top[1] - 0.3, 0), C(0x6b5a2e));
    const tm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 });
    const cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
    cm.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = palmTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        float hgt = max(position.y - 8.5, 0.0); float ph = instanceMatrix[3].x * 0.07 + instanceMatrix[3].z * 0.05;
        transformed.x += sin(uTime * 1.7 + ph) * 0.18 * hgt + sin(uTime*3.1+ph*2.)*0.05*hgt; transformed.z += cos(uTime * 1.3 + ph) * 0.12 * hgt;`);
    };
    const n = palmPos.length;
    const tmesh = new THREE.InstancedMesh(trunk.geometry(), tm, n), cmesh = new THREE.InstancedMesh(crown.geometry(), cm, n);
    const mtx = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3();
    palmPos.forEach(([x, z, sc], i) => {
      e.set(0, R() * Math.PI * 2, 0); q.setFromEuler(e); s.setScalar(sc || 1);
      mtx.compose(new THREE.Vector3(x, groundY(x, z) + (x < 322 && x > 25 && Math.abs(z) < 610 ? 0.16 : 0), z), q, s);
      tmesh.setMatrixAt(i, mtx); cmesh.setMatrixAt(i, mtx); addCircle(x, z, 0.4);
    });
    tmesh.castShadow = cmesh.castShadow = true; tmesh.receiveShadow = cmesh.receiveShadow = true;
    scene.add(tmesh, cmesh);
  }
  // ---- árvores dos glades (cipreste) e capim
  {
    const tb = new MeshBuilder();
    tb.addGeo(new THREE.CylinderGeometry(0.25, 0.6, 7, 6), new THREE.Matrix4().makeTranslation(0, 3.5, 0), C(0x6e5a44));
    tb.addGeo(new THREE.ConeGeometry(2.8, 6, 7), new THREE.Matrix4().makeTranslation(0, 8, 0), C(0x4d6e34));
    tb.addGeo(new THREE.ConeGeometry(2.2, 4, 7), new THREE.Matrix4().makeTranslation(0.4, 10.2, 0.2), C(0x5c7f3c));
    tb.addGeo(new THREE.IcosahedronGeometry(2.4, 0), new THREE.Matrix4().makeTranslation(-1, 6.2, 0.5).multiply(new THREE.Matrix4().makeScale(1.3, 0.6, 1.1)), C(0x617a3a));
    const m = new THREE.InstancedMesh(tb.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, flatShading: true }), treePos.length);
    const mtx = new THREE.Matrix4();
    treePos.forEach(([x, z], i) => { const sc = 0.7 + R() * 0.7; mtx.makeRotationY(R() * 6).premultiply(new THREE.Matrix4().makeScale(sc, sc * (0.8 + R() * 0.5), sc)).setPosition(x, 0, z); m.setMatrixAt(i, mtx); addCircle(x, z, 0.6); });
    m.castShadow = m.receiveShadow = true; scene.add(m);
    // capim alto
    const gb = new MeshBuilder();
    for (let k = 0; k < 5; k++) { const a = k / 5 * Math.PI; gb.quad([Math.cos(a) * -0.8, 0, Math.sin(a) * -0.8], [Math.cos(a) * 0.8, 0, Math.sin(a) * 0.8], [Math.cos(a) * 0.6, 1.3, Math.sin(a) * 0.6], [Math.cos(a) * -0.6, 1.3, Math.sin(a) * -0.6], [0, 1, 0], [[0, 0], [1, 0], [1, 1], [0, 1]], C(0x8a9a4a)); }
    const gt = canvasTex(128, 128, (g, w, h) => { g.clearRect(0, 0, w, h); const r = rng(3); for (let i = 0; i < 46; i++) { const x = r() * w, hh = h * (0.45 + r() * 0.55); g.strokeStyle = `rgb(${90 + r() * 60},${110 + r() * 60},${40 + r() * 30})`; g.lineWidth = 2 + r() * 2; g.beginPath(); g.moveTo(x, h); g.quadraticCurveTo(x + (r() - 0.5) * 20, h - hh * 0.6, x + (r() - 0.5) * 30, h - hh); g.stroke(); } }, { clamp: true });
    const gm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide, map: gt, alphaTest: 0.5 });
    const cnt = Q.level === 'low' ? 500 : 1600; const gmesh = new THREE.InstancedMesh(gb.geometry(), gm, cnt);
    for (let i = 0; i < cnt; i++) { const x = -1080 + R() * 400, z = -700 + R() * 1400; mtx.makeRotationY(R() * 6).premultiply(new THREE.Matrix4().makeScale(1 + R(), 0.6 + R() * 0.9, 1 + R())).setPosition(x, (inTrackZone(x, z, 2) || inSerpZone(x, z, 6)) ? -60 : 0, z); gmesh.setMatrixAt(i, mtx); }
    scene.add(gmesh);
  }
  // ---- postes de luz
  const lampGlow = [];
  {
    const pb = new MeshBuilder();
    pb.addGeo(new THREE.CylinderGeometry(0.09, 0.13, 7, 6), new THREE.Matrix4().makeTranslation(0, 3.5, 0), C(0x3a4048));
    pb.addGeo(new THREE.BoxGeometry(0.1, 0.1, 2.2), new THREE.Matrix4().makeTranslation(0, 6.9, 1.0), C(0x3a4048));
    pb.addGeo(new THREE.BoxGeometry(0.5, 0.18, 0.8), new THREE.Matrix4().makeTranslation(0, 6.8, 2.0), C(0x22262c));
    const m = new THREE.InstancedMesh(pb.geometry(), M.metal, lampPos.length);
    const mtx = new THREE.Matrix4();
    lampPos.forEach(([x, z, ry], i) => { mtx.makeRotationY(ry).setPosition(x, onBridge(x, z) ? 0.5 : 0.16, z); m.setMatrixAt(i, mtx); lampGlow.push(x + Math.sin(ry) * 2, (onBridge(x, z) ? 0.5 : 0.16) + 6.65, z + Math.cos(ry) * 2); });
    m.castShadow = true; scene.add(m);
  }
  // ---- guarda-sóis e toalhas
  {
    const ub = new MeshBuilder();
    ub.addGeo(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5), new THREE.Matrix4().makeTranslation(0, 1.2, 0), C(0xffffff));
    ub.addGeo(new THREE.ConeGeometry(1.4, 0.5, 8, 1, true), new THREE.Matrix4().makeTranslation(0, 2.35, 0), C(0xffffff));
    const um = new THREE.InstancedMesh(ub.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, side: THREE.DoubleSide }), umbrellas.length);
    const tw = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.03, 1.8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), towels.length);
    const mtx = new THREE.Matrix4(); const uc = [0xff4f6f, 0x2ab3b8, 0xffd23f, 0xff8a3c, 0x7d6cf0, 0xffffff, 0x46c08c];
    umbrellas.forEach(([x, z, r], i) => { mtx.makeRotationZ((r - 0.5) * 0.2).setPosition(x, groundY(x, z), z); um.setMatrixAt(i, mtx); um.setColorAt(i, C(uc[Math.floor(r * 7)])); });
    towels.forEach(([x, z, r], i) => { mtx.makeRotationY(r * 0.6).setPosition(x, groundY(x, z) + 0.02, z); tw.setMatrixAt(i, mtx); tw.setColorAt(i, C(uc[Math.floor(r * 13) % 7])); });
    um.castShadow = true; tw.receiveShadow = true; scene.add(um, tw);
  }
  // iates
  {
    const yb = new MeshBuilder();
    const hull = new THREE.Shape(); hull.moveTo(-9, -2.6); hull.lineTo(5, -2.6); hull.quadraticCurveTo(9.5, -1.2, 10, 0); hull.quadraticCurveTo(9.5, 1.2, 5, 2.6); hull.lineTo(-9, 2.6); hull.lineTo(-9, -2.6);
    const hg = new THREE.ExtrudeGeometry(hull, { depth: 2.2, bevelEnabled: false }); hg.rotateX(-Math.PI / 2);
    yb.addGeo(hg, new THREE.Matrix4().makeTranslation(0, -0.8, 0), C(0xffffff));
    yb.addGeo(new THREE.BoxGeometry(9, 1.8, 4), new THREE.Matrix4().makeTranslation(-2, 2.3, 0), C(0xf4f4f4));
    yb.addGeo(new THREE.BoxGeometry(9.2, 0.7, 4.1), new THREE.Matrix4().makeTranslation(-2, 2.2, 0), C(0x1b2a3a));
    yb.addGeo(new THREE.BoxGeometry(5, 1.2, 3.2), new THREE.Matrix4().makeTranslation(-3, 3.8, 0), C(0xf4f4f4));
    const ym = new THREE.InstancedMesh(yb.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.1 }), yachts.length);
    yachts.forEach(([x, z], i) => ym.setMatrixAt(i, new THREE.Matrix4().makeTranslation(x, WATER_Y, z)));
    ym.castShadow = true; scene.add(ym); dyn.yachts = ym; dyn.yachtPos = yachts;
  }
  // ---- semáforos
  const tl = { nodes: NODES.filter(n => n.light) };
  {
    const pb = new MeshBuilder();
    pb.addGeo(new THREE.CylinderGeometry(0.1, 0.12, 6, 6), new THREE.Matrix4().makeTranslation(0, 3, 0), C(0x2c3036));
    pb.addGeo(new THREE.BoxGeometry(0.12, 0.12, 5), new THREE.Matrix4().makeTranslation(0, 5.8, 2.5), C(0x2c3036));
    pb.addGeo(new THREE.BoxGeometry(0.4, 1.4, 0.5), new THREE.Matrix4().makeTranslation(0, 5.1, 4.6), C(0x1a1c20));
    pb.addGeo(new THREE.BoxGeometry(0.5, 1.4, 0.4), new THREE.Matrix4().makeTranslation(0, 3.4, 0.1), C(0x1a1c20));
    const poles = []; // [x,z,ry, node]
    for (const n of tl.nodes) { const w = n.segs[0].w + 1; poles.push([n.x + w, n.z + w, Math.PI, n], [n.x - w, n.z - w, 0, n]); }
    const m = new THREE.InstancedMesh(pb.geometry(), M.metal, poles.length);
    const lamps = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 6, 4), new THREE.MeshBasicMaterial({ toneMapped: false }), poles.length * 12);
    const mtx = new THREE.Matrix4(); const lampInfo = [];
    poles.forEach(([x, z, ry, n], i) => {
      mtx.makeRotationY(ry).setPosition(x, 0.16, z); m.setMatrixAt(i, mtx);
      const s = Math.sin(ry), c = Math.cos(ry);
      const W2 = (lx, ly, lz) => new THREE.Matrix4().makeTranslation(x + lx * c + lz * s, 0.16 + ly, z - lx * s + lz * c);
      for (const f of [-1, 1]) for (let k = 0; k < 3; k++) { lampInfo.push({ n, axis: 'x', k }); lamps.setMatrixAt(lampInfo.length - 1, W2(f * 0.27, 5.55 - k * 0.45, 4.6)); }
      for (const f of [-1, 1]) for (let k = 0; k < 3; k++) { lampInfo.push({ n, axis: 'z', k }); lamps.setMatrixAt(lampInfo.length - 1, W2(0, 3.85 - k * 0.45, 0.1 + f * 0.27)); }
    });
    m.castShadow = true; scene.add(m, lamps);
    for (let i = 0; i < lampInfo.length; i++) lamps.setColorAt(i, C(0x222222));
    tl.lamps = lamps; tl.info = lampInfo;
    const cols = { r: [C(0xff2a2a).multiplyScalar(3), C(0x331a00), C(0x002a10)], y: [C(0x330808), C(0xffb000).multiplyScalar(3), C(0x002a10)], g: [C(0x330808), C(0x331a00), C(0x1aff6a).multiplyScalar(2.5)] };
    tl.update = (t) => { lampInfo.forEach((L, i) => lamps.setColorAt(i, cols[lightState(L.n, t, L.axis)][L.k])); lamps.instanceColor.needsUpdate = true; };
  }
  // ---- brilho dos postes (sprites aditivos)
  const glowTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,240,200,1)'); gr.addColorStop(0.25, 'rgba(255,200,120,.55)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  const glowGeo = new THREE.BufferGeometry(); glowGeo.setAttribute('position', new THREE.Float32BufferAttribute(lampGlow, 3));
  const glowMat = new THREE.PointsMaterial({ size: 4.2, map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, sizeAttenuation: true, toneMapped: false });
  const glow = new THREE.Points(glowGeo, glowMat); glow.frustumCulled = false; scene.add(glow);
  // cabeças dos postes (emissivas)
  const lampHeads = new THREE.InstancedMesh(new THREE.BoxGeometry(0.4, 0.05, 0.6), M.lampHead, lampGlow.length / 3);
  for (let i = 0; i < lampGlow.length / 3; i++) lampHeads.setMatrixAt(i, new THREE.Matrix4().makeTranslation(lampGlow[i * 3], lampGlow[i * 3 + 1] + 0.04, lampGlow[i * 3 + 2]));
  scene.add(lampHeads);

  // vagas de carros estacionados
  {
    const types = ['sport', 'classic', 'suv', 'moto', 'sport', 'sedan', 'classic', 'suv', 'moto', 'sport', 'sedan', 'classic', 'suv', 'sport', 'moto', 'classic', 'suv', 'sport', 'sedan', 'moto'];
    let i = 0;
    const cands = SEGS.filter(s => s.kind === 'city' && s.len > 60 && !onBridge((s.a.x + s.b.x) / 2, (s.a.z + s.b.z) / 2));
    const r2 = rng(55);
    for (let k = 0; k < 34; k++) {
      const s = cands[Math.floor(r2() * cands.length)]; const t = 0.3 + r2() * 0.4;
      const along = s.axis === 'z'; const x = s.a.x + (s.b.x - s.a.x) * t, z = s.a.z + (s.b.z - s.a.z) * t;
      const sd = r2() < 0.5 ? -1 : 1; const off = s.w - 1.3;
      SPAWNS.parked.push({ x: along ? x + sd * off : x, z: along ? z : z + sd * off, h: along ? (sd > 0 ? 0 : Math.PI) : (sd > 0 ? Math.PI / 2 : -Math.PI / 2), type: types[i++ % types.length] });
    }
    // perto do início (Ocean Drive)
    SPAWNS.parked.unshift({ x: 293.7, z: -175, h: Math.PI, type: 'sport' }, { x: 293.7, z: -195, h: Math.PI, type: 'classic' }, { x: 293.7, z: -135, h: Math.PI, type: 'moto' }, { x: 306.3, z: -120, h: 0, type: 'suv' });
    SPAWNS.taxiStands.push({ x: 293.7, z: -60, h: Math.PI }, { x: -306.3, z: -230, h: 0 }, { x: 173.7, z: 220, h: Math.PI });
  }

  const S = { M, T, dyn, tl, glowMat, palmTime, flamingoAt, lampGlow };
  S.setNight = (night, wet) => {
    M.deco.emissiveIntensity = night * 0.9; M.tower.emissiveIntensity = night * 0.85;
    const k = 0.55 + night * 2.4;
    M.neon.forEach((m, i) => m.color.set(NEON_COLS[i]).multiplyScalar(k));
    M.sign.color.setScalar(0.5 + night * 2.2);
    M.lampHead.color.set(0xfff1d0).multiplyScalar(0.3 + night * 3);
    glowMat.opacity = night * 0.7; glow.visible = night > 0.02;
    M.road.roughness = 0.92 - wet * 0.62; M.road.color.setScalar(1 - wet * 0.35);
    M.walk.roughness = 0.85 - wet * 0.5; M.walk.color.setScalar(1 - wet * 0.2);
    M.pool.emissiveIntensity = 0.2 + night * 1.2;
  };
  S.lod = (cx, cz, dist) => { let hidden = 0; for (const o of lodList) { const v = Math.hypot(o.x - cx, o.z - cz) < dist + 180; o.m.visible = v; if (!v) hidden++; } return hidden; };
  S.lodCount = () => lodList.length;
  S.update = (t, dt) => {
    palmTime.value = t;
    if (dyn.wheel) { const a = t * 0.05; dyn.wheel.wheel.rotation.z = a; dyn.wheel.cabins.forEach((c, i) => { const b = a + i / 16 * Math.PI * 2; c.position.set(Math.cos(b) * 22, Math.sin(b) * 22 - 1.4, 0); }); }
    if (Math.floor(t * 4) !== S._tlq) { S._tlq = Math.floor(t * 4); tl.update(t); }
    if (dyn.yachts) { const m4 = new THREE.Matrix4(); dyn.yachtPos.forEach(([x, z], i) => { m4.makeRotationZ(Math.sin(t * 0.8 + i) * 0.02).setPosition(x, WATER_Y + Math.sin(t * 1.1 + i * 2) * 0.12, z); dyn.yachts.setMatrixAt(i, m4); }); dyn.yachts.instanceMatrix.needsUpdate = true; }
  };
  return S;
}

// ---------------------------------------------------------------- imagem do mapa
export const MAPSCALE = 0.5; // px por metro
export function drawMap() {
  const w = (BOUNDS.x1 - BOUNDS.x0) * MAPSCALE, h = (BOUNDS.z1 - BOUNDS.z0) * MAPSCALE;
  const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d');
  const X = x => (x - BOUNDS.x0) * MAPSCALE, Z = z => (z - BOUNDS.z0) * MAPSCALE;
  g.fillStyle = '#2b7fb8'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#d6cdb9'; g.fillRect(X(ISL.x0), Z(ISL.z0), X(330) - X(ISL.x0), Z(ISL.z1) - Z(ISL.z0));
  g.fillStyle = '#ecd9a6'; g.fillRect(X(322), Z(ISL.z0), X(SHORE_X) - X(322), Z(ISL.z1) - Z(ISL.z0));
  g.fillStyle = '#cfc6b3'; g.fillRect(X(-680), Z(MAIN.z0), X(MAIN.x1) - X(-680), Z(MAIN.z1) - Z(MAIN.z0));
  g.fillStyle = '#7d9150'; g.fillRect(X(MAIN.x0), Z(MAIN.z0), X(-680) - X(MAIN.x0), Z(MAIN.z1) - Z(MAIN.z0));
  g.fillStyle = '#4f7f6a'; for (const p of POOLS) { g.beginPath(); g.arc(X(p.x), Z(p.z), p.r * MAPSCALE, 0, 7); g.fill(); }
  g.fillStyle = '#9a8f7c'; for (const b of BOXES) if (!b.boatOnly && b.h > 3) g.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * MAPSCALE, (b.z1 - b.z0) * MAPSCALE);
  for (const s of SEGS) { g.strokeStyle = s.kind === 'rural' ? '#b8a27a' : '#f4f4f4'; g.lineWidth = s.w * 2 * MAPSCALE + 1; g.lineCap = 'square'; g.beginPath(); g.moveTo(X(s.a.x), Z(s.a.z)); g.lineTo(X(s.b.x), Z(s.b.z)); g.stroke(); }
  g.fillStyle = '#7a5a3a'; for (const p of PIERS) g.fillRect(X(p.x0), Z(p.z0), (p.x1 - p.x0) * MAPSCALE, Math.max(2, (p.z1 - p.z0) * MAPSCALE));
  for (const f of HOOKS.map) f(g, X, Z);
  return { canvas: c, X, Z };
}

// está sobre o asfalto?
export function isRoad(x, z) {
  for (const l of LINES) {
    if (l.axis === 'z') { if (Math.abs(x - l.c) <= l.w && z >= l.a - l.w && z <= l.b + l.w) return true; }
    else if (Math.abs(z - l.c) <= l.w && x >= l.a - l.w && x <= l.b + l.w) return true;
  }
  return false;
}
// altura da superfície (calçadas e quarteirões ficam 16 cm acima do asfalto)
export function surfaceY(x, z) {
  const g = groundY(x, z);
  if (onPier(x, z) || onBridge(x, z) || g < -0.01) return g;
  if (x > 330 || x < -680 || isRoad(x, z)) return g;
  if (x >= 307 && x <= 324 && Math.abs(z) <= 660) return g + 0.16;
  for (const b of BLOCKS) if (x >= b.x0 && x <= b.x1 && z >= b.z0 && z <= b.z1) return g + 0.16;
  for (const l of LINES) {
    if (l.kind !== 'city') continue;
    if (l.axis === 'z') { if (Math.abs(x - l.c) <= l.w + SW && z >= l.a - l.w - SW && z <= l.b + l.w + SW) return g + 0.16; }
    else if (Math.abs(z - l.c) <= l.w + SW && x >= l.a - l.w - SW && x <= l.b + l.w + SW) return g + 0.16;
  }
  return g;
}
