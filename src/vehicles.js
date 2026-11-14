// Veículos: modelos próprios (procedurais) e física arcade
import * as THREE from 'three';
import { clamp, lerp, angDiff, MeshBuilder, C, canvasTex } from './util.js';
import { groundY, surfaceY, drivable, boatable, collide, WATER_Y, inSwamp, roadAt, HOOKS } from './world.js';
import { waveH } from './env.js';
import { toCreasedNormals, mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const SPECS = {
  sport: { name: 'Esportivo Vento GT', len: 4.5, w: 1.95, max: 58, acc: 15, brake: 28, grip: 7.5, steer: 0.55, wb: 2.6, wr: 0.34, cam: 6.5, susp: 0.03, colors: [0xff2d55, 0xffd60a, 0x0a84ff, 0xffffff, 0x30d158, 0xff9f0a, 0x111111] },
  classic: { name: 'Besouro Clássico', len: 4.0, w: 1.6, max: 34, acc: 6.5, brake: 18, grip: 5.5, steer: 0.62, wb: 2.4, wr: 0.33, cam: 6, susp: 0.07, colors: [0x7fd6e8, 0xf4c2c2, 0xfff3b0, 0x9be89b, 0xe85d5d, 0xf5f0e6, 0x3a5fcd] },
  suv: { name: 'SUV Costa', len: 4.9, w: 2.0, max: 44, acc: 9.5, brake: 24, grip: 5.2, steer: 0.5, wb: 2.9, wr: 0.42, cam: 7.8, susp: 0.06, colors: [0x1c1c1e, 0xf2f2f7, 0x8e8e93, 0x2c4a6e, 0x6e2c2c, 0xd4c5a0] },
  sedan: { name: 'Sedã Urbano', len: 4.7, w: 1.85, max: 46, acc: 9.5, brake: 24, grip: 6.2, steer: 0.55, wb: 2.75, wr: 0.34, cam: 7, susp: 0.05, colors: [0xc7c7cc, 0x34495e, 0x8e2c3c, 0xf5f5f5, 0x22313f, 0x7a8a5a] },
  taxi: { name: 'Táxi Solara', len: 4.7, w: 1.85, max: 46, acc: 9.5, brake: 24, grip: 6.2, steer: 0.55, wb: 2.75, wr: 0.34, cam: 7, susp: 0.05, colors: [0xffc400] },
  pickup: { name: 'Caminhonete Atol', len: 5.3, w: 2.05, max: 50, acc: 11, brake: 25, grip: 5.8, steer: 0.5, wb: 3.2, wr: 0.45, cam: 8, susp: 0.07, seat: [0.44, 0.22, 0.25], colors: [0x2f9e44, 0xf2f2f7, 0x1c1c1e, 0xc0392b] },
  moto: { name: 'Moto Brisa 600', len: 2.1, w: 0.8, max: 56, acc: 17, brake: 26, grip: 8, steer: 0.7, wb: 1.4, wr: 0.32, cam: 5, susp: 0.04, colors: [0xff2d55, 0x0a84ff, 0x111111, 0xffffff, 0x30d158] },
  // carros de corrida (modelos originais, sem marcas): perfis com caixas de roda, kit aerodinâmico e física de drift
  rc_gt: { name: 'Solara GT-R', race: true, len: 4.62, w: 1.98, max: 64, acc: 17.5, brake: 32, grip: 8.6, steer: 0.58, wb: 2.72, wr: 0.36, cam: 6.6, susp: 0.022, drift: 0.8, seat: [0.4, -0.34, -0.42], colors: [0xff2d55],
    body: { nose: 2.32, tail: -2.3, ride: 0.13, belt: 0.82, hoodF: 0.6, deck: 0.86, cabF: 0.95, cabR: -1.45, roofF: 0.05, roofR: -0.85, roof: 1.22, wing: 'swan', vents: true, exh: 'quad' } },
  rc_muscle: { name: 'Trovão V8', race: true, len: 4.85, w: 2.0, max: 66, acc: 19, brake: 30, grip: 7.4, steer: 0.52, wb: 2.85, wr: 0.37, cam: 6.9, susp: 0.03, drift: 1.05, seat: [0.42, -0.26, -0.45], colors: [0x1c1c1e],
    body: { nose: 2.42, tail: -2.42, ride: 0.15, belt: 0.92, hoodF: 0.74, deck: 0.95, cabF: 0.7, cabR: -1.55, roofF: -0.25, roofR: -1.05, roof: 1.3, wing: 'duck', scoop: true, exh: 'side' } },
  rc_jdm: { name: 'Kaze RS', race: true, len: 4.4, w: 1.9, max: 59, acc: 16.5, brake: 33, grip: 9.4, steer: 0.64, wb: 2.6, wr: 0.34, cam: 6.3, susp: 0.026, drift: 0.95, seat: [0.4, -0.27, -0.35], colors: [0xf5f5f7],
    body: { nose: 2.2, tail: -2.2, ride: 0.12, belt: 0.86, hoodF: 0.64, deck: 0.92, cabF: 0.85, cabR: -1.5, roofF: 0.1, roofR: -1.0, roof: 1.3, wing: 'gt', vents: true, exh: 'single' } },
  rc_hyper: { name: 'Aurora X1', race: true, len: 4.75, w: 2.02, max: 72, acc: 18.5, brake: 34, grip: 8.0, steer: 0.52, wb: 2.75, wr: 0.36, cam: 6.8, susp: 0.018, drift: 0.6, seat: [0.4, -0.4, -0.2], colors: [0x0a84ff],
    body: { nose: 2.4, tail: -2.35, ride: 0.11, belt: 0.74, hoodF: 0.48, deck: 0.82, cabF: 1.25, cabR: -0.95, roofF: 0.35, roofR: -0.55, roof: 1.13, wing: 'active', vents: true, exh: 'center' } },
  boat: { name: 'Lancha Maré Alta', len: 6.2, w: 2.3, max: 30, acc: 7, brake: 6, grip: 1.3, steer: 0.9, wb: 3, wr: 0, cam: 10, susp: 0, colors: [0xffffff], boat: true },
};
const PROFILES = {
  sport: { lower: [[-2.25, 0.3], [2.2, 0.3], [2.32, 0.5], [2.26, 0.66], [1.0, 0.86], [-1.9, 0.93], [-2.3, 0.86]], glass: [[0.98, 0.86], [0.02, 1.2], [-0.95, 1.22], [-1.88, 0.93]], roof: [-0.92, 0.0, 1.22], gw: 0.3 },
  sedan: { lower: [[-2.3, 0.32], [2.25, 0.32], [2.36, 0.55], [2.27, 0.84], [1.1, 0.95], [-1.62, 0.98], [-2.32, 0.94], [-2.38, 0.6]], glass: [[1.08, 0.95], [0.25, 1.42], [-0.98, 1.43], [-1.6, 0.98]], roof: [-0.95, 0.22, 1.43], gw: 0.22 },
  suv: { lower: [[-2.42, 0.45], [2.36, 0.45], [2.46, 0.72], [2.4, 1.06], [1.5, 1.15], [-2.42, 1.2], [-2.46, 0.72]], glass: [[1.46, 1.15], [0.8, 1.76], [-2.3, 1.78], [-2.4, 1.2]], roof: [-2.32, 0.78, 1.78], gw: 0.16 },
  classic: { lower: [[-1.95, 0.33], [1.9, 0.33], [2.04, 0.55], [1.86, 0.78], [0.72, 0.95], [-1.3, 0.95], [-1.86, 0.84], [-2.0, 0.55]], glass: [[0.68, 0.95], [0.18, 1.36], [-0.42, 1.46], [-1.0, 1.36], [-1.32, 0.95]], roof: [-0.7, 0.1, 1.45], gw: 0.2 },
};
PROFILES.taxi = PROFILES.sedan;
PROFILES.pickup = { lower: [[-2.62, 0.5], [2.42, 0.5], [2.52, 0.8], [2.46, 1.12], [1.42, 1.2], [-2.64, 1.2], [-2.68, 0.8]], glass: [[1.38, 1.2], [0.78, 1.82], [-0.5, 1.84], [-0.62, 1.2]], roof: [-0.56, 0.74, 1.84], gw: 0.14 };

let SH = null; // materiais compartilhados
function shared(Q) {
  if (SH) return SH;
  const glass = new THREE.MeshPhysicalMaterial({ color: 0x0a1018, roughness: 0.05, metalness: 0.2, transparent: false, clearcoat: 1, envMapIntensity: 1.6 });
  SH = {
    glass: Q.level === 'low' ? new THREE.MeshStandardMaterial({ color: 0x111820, roughness: 0.1, metalness: 0.6 }) : glass,
    tire: new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.9 }),
    wheel: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0.4 }),
    trim: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.6, metalness: 0.3 }),
    chrome: new THREE.MeshStandardMaterial({ color: 0xe8e8e8, roughness: 0.12, metalness: 1 }),
    head: new THREE.MeshBasicMaterial({ color: 0xfff6e0, toneMapped: false }),
    tail: new THREE.MeshBasicMaterial({ color: 0xff1a1a, toneMapped: false }),
    seat: new THREE.MeshStandardMaterial({ color: 0x3a2a22, roughness: 0.8 }),
    plate: new THREE.MeshStandardMaterial({ color: 0xf2f0e6, roughness: 0.5 }),
    paints: new Map(),
  };
  SH.paint = (hex) => {
    let m = SH.paints.get(hex); if (m) return m;
    m = Q.level === 'high' ? new THREE.MeshPhysicalMaterial({ color: hex, metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06 }) : new THREE.MeshStandardMaterial({ color: hex, metalness: 0.5, roughness: 0.3 });
    SH.paints.set(hex, m); return m;
  };
  return SH;
}
export function setVehicleLights(night) { lastNight = night; const mats = [...GLOW_MATS]; for (let i = 0; i < mats.length; i += 2) setGlow(mats[i], mats[i + 1], night); if (!SH) return; SH.head.color.set(0xfff6e0).multiplyScalar(0.6 + night * 3); SH.tail.color.set(0xff1a1a).multiplyScalar(0.9 + night * 2.2); }

function extrude(pts, width, bevel) {
  const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: width - bevel * 2, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 4 });
  g.rotateY(-Math.PI / 2); g.translate((width - bevel * 2) / 2, 0, 0); g.computeVertexNormals(); return g;
}
const geoCache = new Map();
function cached(key, fn) { let g = geoCache.get(key); if (!g) geoCache.set(key, g = fn()); return g; }

function wheel(S, r, w) {
  const g = cached('w' + r + '_' + w, () => {
    const b = new MeshBuilder();
    b.addGeo(new THREE.CylinderGeometry(r, r, w, 18).rotateZ(Math.PI / 2), new THREE.Matrix4(), C(0x151515));
    b.addGeo(new THREE.CylinderGeometry(r * 0.62, r * 0.62, w + 0.02, 12).rotateZ(Math.PI / 2), new THREE.Matrix4(), C(0xc8ccd0));
    for (let i = 0; i < 5; i++) b.addGeo(new THREE.BoxGeometry(w + 0.03, r * 1.1, 0.06), new THREE.Matrix4().makeRotationX(i / 5 * Math.PI), C(0x8a8e92));
    return b.geometry();
  });
  return new THREE.Mesh(g, S.wheel);
}


// ---------------------------------------------------------------- tunagem (estilo rachas de rua, tudo original)
export const TUNE_OPTS = {
  paints: [0xff2d55, 0xff8a00, 0xffd60a, 0x30d158, 0x00c7be, 0x0a84ff, 0x7d4dff, 0xff4fb8, 0xf5f5f7, 0x1c1c1e, 0x8e8e93, 0x5ac8fa],
  glows: [null, 0xff2bd6, 0x29f0ff, 0x7d4dff, 0x39ff6a, 0xff6a00, 0xffffff],
  spoilers: ['Nenhum', 'Discreto', 'Asa GT'],
  rims: [0xc8ccd0, 0x1a1a1a, 0xffd23f, 0xff2d55, 0x29f0ff, 0xff4fb8],
  styles: ['Faixas', 'Raio', 'Ondas'],
};
export const NITRO = { lvl: 0 }; export const MOTOR = { lvl: 0 }; // motor preparado (oficina): velocidade final e aceleração do carro do jogador
export const NITRO_STAGES = 8, DRIFT_WIN = 2.6, DRIFT_MAX = 3.4; // nitro de 8 estágios; janela do drift longo (s) // nível de nitro ganho na Liga da Madrugada (só o carro do jogador)
export const TUNE_NAMES = ['SOLARA RUSH', 'NEON KINGS', 'BRISA TURBO', 'ONDA 88', 'LUAR GT', 'FAROL RACING', 'PULSO NOTURNO', 'TUCANO TURBO', 'MARÉ ALTA', 'VENTO SUL'];
export const TUNABLE = ['sport', 'sedan', 'classic', 'suv', 'taxi', 'pickup'];
export const RACE_CARS = ['rc_gt', 'rc_muscle', 'rc_jdm', 'rc_hyper'];
// pinturas de corrida (originais): cor, cor do adesivo, neon, texto e número
export const LIVERIES = {
  rc_gt: [{ paint: 0xff2d55, accent: 0xffffff, glow: 0x29f0ff, text: 'SOLARA RUSH', style: 0, rim: 0x1a1a1a }, { paint: 0xf5f5f7, accent: 0xff2d55, glow: 0xff2bd6, text: 'FAROL RACING', style: 1, rim: 0xff2d55 }, { paint: 0x1c1c1e, accent: 0xffd23f, glow: 0xff6a00, text: 'LUAR GT', style: 2, rim: 0xffd23f }, { paint: 0x30d158, accent: 0x111111, glow: 0x39ff6a, text: 'TUCANO TURBO', style: 0, rim: 0x1a1a1a }],
  rc_muscle: [{ paint: 0x1c1c1e, accent: 0xff8a00, glow: 0xff6a00, text: 'TROVÃO', style: 1, rim: 0x1a1a1a }, { paint: 0xffd60a, accent: 0x111111, glow: 0xffffff, text: 'VENTO SUL', style: 0, rim: 0x1a1a1a }, { paint: 0x7d4dff, accent: 0x29f0ff, glow: 0x7d4dff, text: 'PULSO NOTURNO', style: 2, rim: 0xc8ccd0 }, { paint: 0xff2d55, accent: 0xffffff, glow: 0xff2bd6, text: 'ONDA 88', style: 0, rim: 0xc8ccd0 }],
  rc_jdm: [{ paint: 0xf5f5f7, accent: 0xff4fb8, glow: 0xff2bd6, text: 'KAZE', style: 2, rim: 0xff4fb8 }, { paint: 0x0a84ff, accent: 0xffd23f, glow: 0x29f0ff, text: 'MARÉ ALTA', style: 0, rim: 0xffd23f }, { paint: 0xff8a00, accent: 0x111111, glow: 0xff6a00, text: 'BRISA TURBO', style: 1, rim: 0x1a1a1a }, { paint: 0x00c7be, accent: 0xffffff, glow: 0x39ff6a, text: 'NEON KINGS', style: 2, rim: 0xc8ccd0 }],
  rc_hyper: [{ paint: 0x0a84ff, accent: 0x29f0ff, glow: 0x29f0ff, text: 'AURORA', style: 1, rim: 0x1a1a1a }, { paint: 0xff4fb8, accent: 0xffffff, glow: 0xff2bd6, text: 'SOLARA X', style: 2, rim: 0xc8ccd0 }, { paint: 0x8e8e93, accent: 0xff2d55, glow: 0xff2d55, text: 'PULSO', style: 0, rim: 0xff2d55 }, { paint: 0xffd60a, accent: 0x111111, glow: 0xffffff, text: 'RAIO DE SOL', style: 1, rim: 0x1a1a1a }],
};
export function raceTune(type, k = 0, num = 7) { const L = LIVERIES[type][((k % 4) + 4) % 4]; return { paint: L.paint, glow: L.glow, spoiler: 0, kit: true, rim: L.rim, text: L.text, style: L.style, accent: L.accent, num, livery: k }; }
export function randomTune(r = Math.random) {
  const pk = (a) => a[Math.floor(r() * a.length)];
  return { paint: pk(TUNE_OPTS.paints), glow: pk(TUNE_OPTS.glows.slice(1)), spoiler: 1 + Math.floor(r() * 2), kit: r() < 0.7, rim: pk(TUNE_OPTS.rims), text: pk(TUNE_NAMES), style: Math.floor(r() * 3), accent: pk([0xffffff, 0x111111, 0x29f0ff, 0xff4fb8, 0xffd23f]) };
}
export function cleanText(t) { return String(t || '').toUpperCase().replace(/[^A-Z0-9ÁÉÍÓÚÂÊÔÃÕÇ !\-.]/g, '').slice(0, 14).trim(); }
const GLOW_MATS = new Set();
let glowTex = null;
function glowTexture() {
  if (glowTex) return glowTex;
  glowTex = canvasTex(128, 256, (g, w, h) => {
    // gradiente elíptico (sem bordas retas nas laterais)
    const grd = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w * 0.5);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.5, 'rgba(255,255,255,.6)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.scale(1, h / w); g.fillStyle = grd; g.fillRect(0, 0, w, w); g.restore();
  }, { clamp: true, srgb: false });
  return glowTex;
}
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
function decalTexture(text, style, accent, paint) {
  return canvasTex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const ac = hexCss(accent); const dark = (paint & 0xff) + ((paint >> 8) & 0xff) + (paint >> 16) < 200;
    const ink = accent === paint ? (dark ? '#ffffff' : '#111111') : ac;
    g.fillStyle = ink; g.strokeStyle = ink;
    if (style === 0) { // faixas diagonais
      for (let i = 0; i < 4; i++) { g.globalAlpha = 1 - i * 0.2; g.beginPath(); const x = 30 + i * 40; g.moveTo(x, h); g.lineTo(x + 50, 0); g.lineTo(x + 72, 0); g.lineTo(x + 22, h); g.fill(); }
      g.globalAlpha = 1; g.fillRect(220, h - 14, w - 240, 7);
    } else if (style === 1) { // raio
      g.lineWidth = 14; g.lineJoin = 'miter'; g.beginPath(); g.moveTo(10, h * 0.75); g.lineTo(220, h * 0.62); g.lineTo(190, h * 0.9); g.lineTo(w - 20, h * 0.55); g.stroke();
    } else { // ondas
      g.lineWidth = 9; for (let k = 0; k < 3; k++) { g.globalAlpha = 1 - k * 0.25; g.beginPath(); for (let x = 0; x <= w; x += 8) { const y = h * 0.8 - k * 16 + Math.sin(x / 55 + k) * 10; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
      g.globalAlpha = 1;
    }
    if (text) {
      g.font = 'italic 900 84px "Arial Black","Impact","Segoe UI",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      const tw = g.measureText(text).width; const sc = Math.min(1, (w - 280) / tw);
      g.save(); g.translate(w * 0.58, h * 0.46); g.scale(sc, 1); g.transform(1, 0, -0.18, 1, 0, 0);
      g.lineWidth = 10; g.strokeStyle = dark ? 'rgba(0,0,0,.65)' : 'rgba(255,255,255,.7)'; g.strokeText(text, 0, 0);
      g.fillStyle = ink; g.fillText(text, 0, 0); g.restore();
    }
  }, { clamp: true, aniso: 8 });
}
function tunedWheel(S, r, w, rim) {
  const g = cached('tw' + r + '_' + w + '_' + rim, () => {
    const b = new MeshBuilder();
    b.addGeo(new THREE.CylinderGeometry(r, r, w, 20).rotateZ(Math.PI / 2), new THREE.Matrix4(), C(0x121212));
    b.addGeo(new THREE.CylinderGeometry(r * 0.78, r * 0.78, w + 0.015, 20).rotateZ(Math.PI / 2), new THREE.Matrix4(), C(0x0c0c0c));
    for (let i = 0; i < 10; i++) b.addGeo(new THREE.BoxGeometry(w + 0.04, r * 1.5, 0.045), new THREE.Matrix4().makeRotationX(i / 10 * Math.PI), C(rim));
    b.addGeo(new THREE.CylinderGeometry(r * 0.2, r * 0.2, w + 0.06, 10).rotateZ(Math.PI / 2), new THREE.Matrix4(), C(rim));
    b.addGeo(new THREE.TorusGeometry(r * 0.76, 0.025, 6, 24).rotateY(Math.PI / 2).translate(w / 2 + 0.02, 0, 0), new THREE.Matrix4(), C(rim));
    b.addGeo(new THREE.TorusGeometry(r * 0.76, 0.025, 6, 24).rotateY(Math.PI / 2).translate(-w / 2 - 0.02, 0, 0), new THREE.Matrix4(), C(rim));
    return b.geometry();
  });
  return new THREE.Mesh(g, S.wheel);
}
function applyTune(v, S, P, sp, T) {
  const w = sp.w, body = v.body, paint = S.paint(T.paint);
  const fz = P.lower[2][0], rz = P.lower[0][0]; const top = Math.max(...P.lower.map(p => p[1]));
  const add = (g, m) => { const o = new THREE.Mesh(g, m); body.add(o); return o; };
  const trim = S.trim;
  // kit: para-lamas largos, saias, splitter e difusor
  if (T.kit) {
    for (const sz of [1, -1]) for (const sx of [-1, 1]) {
      const g = new THREE.BoxGeometry(0.16, 0.2, sp.wr * 2.9); g.translate(sx * (w / 2 + 0.05), sp.wr + 0.16, sz * sp.wb / 2);
      add(g, paint);
    }
    add(new THREE.BoxGeometry(0.12, 0.12, sp.wb - sp.wr * 2.6).translate(-(w / 2 + 0.03), 0.3, 0), trim);
    add(new THREE.BoxGeometry(0.12, 0.12, sp.wb - sp.wr * 2.6).translate(w / 2 + 0.03, 0.3, 0), trim);
    add(new THREE.BoxGeometry(w * 1.02, 0.05, 0.3).translate(0, 0.26, fz + 0.1), trim);
    add(new THREE.BoxGeometry(w * 0.8, 0.12, 0.25).translate(0, 0.3, rz - 0.06), trim);
  }
  // aerofólio
  const rearTop = P.lower[P.lower.length - 1];
  if (T.spoiler === 1) add(new THREE.BoxGeometry(w * 0.9, 0.06, 0.26).rotateX(-0.25).translate(0, rearTop[1] + 0.05, rearTop[0] + 0.2), paint);
  if (T.spoiler === 2) {
    const yy = rearTop[1] + 0.42, zz = rearTop[0] + 0.25;
    add(new THREE.BoxGeometry(w * 1.0, 0.05, 0.42).rotateX(-0.12).translate(0, yy, zz), T.accent === T.paint ? trim : S.paint(T.accent));
    for (const sx of [-1, 1]) { add(new THREE.BoxGeometry(0.05, 0.42, 0.18).translate(sx * w * 0.32, yy - 0.2, zz + 0.04), trim); add(new THREE.BoxGeometry(0.03, 0.18, 0.5).translate(sx * w * 0.5, yy + 0.02, zz), trim); }
  }
  // escapamentos e chamas do nitro
  const ez = rz - 0.12;
  for (const sx of [-0.42, 0.42]) add(new THREE.CylinderGeometry(0.06, 0.07, 0.25, 10).rotateX(Math.PI / 2).translate(sx, 0.34, ez), S.chrome);
  const flameG = cached('flame', () => new THREE.ConeGeometry(0.11, 1, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  const coreG = cached('flamec', () => new THREE.ConeGeometry(0.06, 0.6, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.3));
  const fm = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const cm = new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  v.flames = [];
  for (const sx of [-0.42, 0.42]) { const f = new THREE.Group(); f.position.set(sx, 0.34, ez - 0.12); f.add(new THREE.Mesh(flameG, fm), new THREE.Mesh(coreG, cm)); f.visible = false; body.add(f); v.flames.push(f); }
  // adesivos laterais com letras
  const dt = decalTexture(cleanText(T.text), T.style | 0, T.accent ?? 0xffffff, T.paint);
  const dm = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, toneMapped: true });
  dm.onBeforeCompile = () => { }; v.decalMat = dm;
  const lenD = Math.min(sp.len * 0.8, (fz - rz) * 0.82), hD = lenD / 8, yD = Math.max(0.5, Math.min(top - hD / 2 - 0.06, 0.66));
  const cz = (fz + rz) / 2 - 0.05;
  const right = new THREE.PlaneGeometry(lenD, hD).rotateY(Math.PI / 2).translate(w / 2 + 0.012, yD, cz);
  const left = new THREE.PlaneGeometry(lenD, hD).rotateY(-Math.PI / 2).translate(-w / 2 - 0.012, yD, cz);
  add(right, dm); add(left, dm);
  // faixa no capô
  if (T.style === 0) { const hm = S.paint(T.accent ?? 0xffffff); const [z0, y0] = P.lower[3], [z1, y1] = P.glass[0]; const L = Math.hypot(z0 - z1, y0 - y1); const th = Math.asin((y1 - y0) / L);
    for (const sx of [-0.13, 0.13]) add(new THREE.BoxGeometry(0.14, 0.02, L * 0.92).rotateX(th).translate(sx, (y0 + y1) / 2 + 0.035, (z0 + z1) / 2), hm); }
  // neon embaixo do carro
  if (T.glow != null) {
    const gm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: T.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true });
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w + 2.2, sp.len + 2.4).rotateX(-Math.PI / 2), gm); pl.position.y = 0.05; pl.renderOrder = 2; v.root.add(pl); v.glowPlane = pl;
    const sm = new THREE.MeshBasicMaterial({ color: T.glow, toneMapped: false });
    add(new THREE.BoxGeometry(0.04, 0.04, sp.wb * 0.75).translate(-(w / 2 - 0.1), 0.22, 0), sm); add(new THREE.BoxGeometry(0.04, 0.04, sp.wb * 0.75).translate(w / 2 - 0.1, 0.22, 0), sm);
    gm.userData.base = T.glow; sm.userData.base = T.glow; sm.userData.strip = true;
    GLOW_MATS.add(gm); GLOW_MATS.add(sm); v.glowMats = [gm, sm]; setGlow(gm, sm, lastNight);
  }
}
let lastNight = 0;
// moto personalizada: carenagem com faixa, nome na lateral, neon embaixo e chama do nitro
function tuneMoto(v, S, sp, T) {
  const body = v.body, acc = S.paint(T.accent ?? 0xffffff); const add = (g, m) => { const o = new THREE.Mesh(g, m); body.add(o); return o; };
  add(new THREE.BoxGeometry(0.36, 0.05, 1.1).translate(0, 1.0, 0.25), acc);
  add(new THREE.BoxGeometry(0.42, 0.3, 0.06).rotateX(-0.5).translate(0, 1.17, 0.98), S.glass);
  add(new THREE.BoxGeometry(0.3, 0.14, 0.42).translate(0, 0.78, -0.55), S.trim);
  add(new THREE.CylinderGeometry(0.05, 0.06, 0.4, 10).rotateX(Math.PI / 2).translate(0.2, 0.6, -0.85), S.chrome);
  const dt = decalTexture(cleanText(T.text), T.style | 0, T.accent ?? 0xffffff, T.paint);
  const dm = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); v.decalMat = dm;
  add(new THREE.PlaneGeometry(0.66, 0.0825).rotateY(Math.PI / 2).translate(0.176, 0.86, 0.2), dm); add(new THREE.PlaneGeometry(0.66, 0.0825).rotateY(-Math.PI / 2).translate(-0.176, 0.86, 0.2), dm);
  const flameG = cached('flame', () => new THREE.ConeGeometry(0.11, 1, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  const coreG = cached('flamec', () => new THREE.ConeGeometry(0.06, 0.6, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.3));
  const fm = new THREE.MeshBasicMaterial({ color: 0xff7a1a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const cm = new THREE.MeshBasicMaterial({ color: 0x6fb8ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const f = new THREE.Group(); f.position.set(0.2, 0.6, -1.05); f.scale.setScalar(0.7); f.add(new THREE.Mesh(flameG, fm), new THREE.Mesh(coreG, cm)); f.visible = false; body.add(f); v.flames = [f]; v.flameMats = [fm, cm];
  if (T.glow != null) {
    const gm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: T.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true });
    const pl = new THREE.Mesh(cached('glowPmoto', () => new THREE.PlaneGeometry(1.8, 3.2).rotateX(-Math.PI / 2)), gm); pl.position.y = 0.05; pl.renderOrder = 2; v.root.add(pl);
    const sm = new THREE.MeshBasicMaterial({ color: T.glow, toneMapped: false }); add(new THREE.BoxGeometry(0.03, 0.03, 0.9).translate(0, 0.42, 0), sm);
    gm.userData.base = T.glow; sm.userData.base = T.glow; GLOW_MATS.add(gm); GLOW_MATS.add(sm); v.glowMats = [gm, sm]; setGlow(gm, sm, lastNight);
  }
}
function setGlow(gm, sm, night) { gm.opacity = 0.16 + night * 0.84; sm.color.set(sm.userData.base).multiplyScalar(0.8 + night * 2.2); }

// ---------------------------------------------------------------- carros de corrida (perfil lateral com caixas de roda + afinamento em planta)
const arcPts = (cx, cy, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); } return o; };
function hoodY(B, z) { const z0 = B.nose - 0.08; const t = clamp((z0 - z) / (z0 - B.cabF), 0, 1); return B.hoodF + (B.belt - B.hoodF) * Math.sin(t * Math.PI / 2); }
function raceProfile(sp) {
  const B = sp.body, rA = sp.wr + 0.075, ride = B.ride, zr = B.tail, zf = B.nose, rz = -sp.wb / 2, fz = sp.wb / 2;
  const p = [[zr + 0.06, ride + 0.1], [rz - rA, ride], ...arcPts(rz, sp.wr, rA, Math.PI, 0, 12), [rz + rA, ride], [fz - rA, ride], ...arcPts(fz, sp.wr, rA, Math.PI, 0, 12), [fz + rA, ride],
    [zf - 0.14, ride + 0.02], [zf - 0.01, ride + 0.16], [zf + 0.02, B.hoodF - 0.14], [zf - 0.04, B.hoodF - 0.03]];
  for (let i = 0; i <= 6; i++) { const z = (zf - 0.08) + (B.cabF - (zf - 0.08)) * i / 6; p.push([z, hoodY(B, z)]); }
  const mid = B.belt + (B.deck - B.belt) * 0.6;
  p.push([B.cabR, mid], [zr + 0.32, B.deck], [zr + 0.08, B.deck - 0.03], [zr - 0.01, B.deck - 0.2], [zr - 0.02, ride + 0.34]);
  return p;
}
function glassProfile(sp) {
  const B = sp.body, y0 = B.belt - 0.03, mid = B.belt + (B.deck - B.belt) * 0.6 - 0.03; const p = [];
  const q = (a, c, b, n) => { for (let i = 1; i <= n; i++) { const t = i / n, u = 1 - t; p.push([u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]]); } };
  p.push([B.cabF + 0.02, y0]);
  q([B.cabF + 0.02, y0], [B.roofF + (B.cabF - B.roofF) * 0.25, B.roof - 0.02], [B.roofF, B.roof], 4);
  q([B.roofF, B.roof], [(B.roofF + B.roofR) / 2, B.roof + 0.04], [B.roofR, B.roof], 3);
  q([B.roofR, B.roof], [B.roofR - (B.roofR - B.cabR) * 0.35, B.roof - 0.03], [B.cabR - 0.02, mid], 4);
  return p;
}
function taper(g, sp, glass) {
  const B = sp.body, P = g.attributes.position;
  for (let i = 0; i < P.count; i++) {
    const y = P.getY(i), z = P.getZ(i); let k = 1;
    const fn = clamp((z - (B.nose - 0.75)) / 0.75, 0, 1), rn = clamp(((B.tail + 0.55) - z) / 0.55, 0, 1);
    if (glass) k *= (1 - clamp((y - B.belt) / (B.roof - B.belt), 0, 1) * 0.2) * (1 - 0.08 * fn);
    else {
      k *= 1 - 0.045 * clamp((y - (B.belt - 0.22)) / 0.25, 0, 1); // tumblehome (laterais fecham para cima)
      k *= (1 - 0.14 * fn * fn) * (1 - 0.08 * rn * rn); // bico e traseira arredondados vistos de cima
      const near = Math.max(0, 1 - Math.abs(Math.abs(z) - sp.wb / 2) / 0.6), low = clamp((B.belt - 0.05 - y) / 0.3, 0, 1);
      k *= 1 - 0.065 * (1 - near * low); // para-lamas largos sobre as rodas
    }
    P.setX(i, P.getX(i) * k);
  }
  return toCreasedNormals(g, 0.62);
}
function numberTexture(num, ink, bg) {
  return canvasTex(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.fillStyle = bg; g.beginPath(); g.arc(128, 128, 118, 0, 7); g.fill();
    g.lineWidth = 12; g.strokeStyle = ink; g.beginPath(); g.arc(128, 128, 104, 0, 7); g.stroke();
    g.fillStyle = ink; g.font = 'italic 900 150px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(num), 128, 138);
  }, { clamp: true, aniso: 4 });
}
function buildRaceCar(v, S, sp, T) {
  const B = sp.body, w = sp.w, type = v.type, body = v.body, ride = B.ride, rA = sp.wr + 0.075;
  const paint = S.paint(T.paint), accHex = T.accent === T.paint ? 0x111111 : T.accent, acc = S.paint(accHex), trim = S.trim;
  const add = (g, m, par = body) => { const o = new THREE.Mesh(g, m); par.add(o); return o; };
  const C1 = (k, f) => cached(type + k, f);
  add(C1('body', () => taper(extrude(raceProfile(sp), w, 0.06), sp, false)), paint);
  add(C1('glass', () => taper(extrude(glassProfile(sp), w - 0.24, 0.035), sp, true)), S.glass);
  add(C1('roof', () => new THREE.BoxGeometry((w - 0.3) * 0.8, 0.03, Math.abs(B.roofF - B.roofR) * 0.92).translate(0, B.roof + 0.03, (B.roofF + B.roofR) / 2)), paint);
  for (const z of [sp.wb / 2, -sp.wb / 2]) add(C1('well' + z, () => new THREE.BoxGeometry(w - 0.56, rA * 0.95, rA * 1.9).translate(0, sp.wr + rA * 0.32, z)), S.tire);
  // aerodinâmica: splitter, canards, saias, difusor
  add(C1('aero', () => { const gs = [new THREE.BoxGeometry(w * 0.9, 0.035, 0.34).translate(0, ride + 0.02, B.nose - 0.1)];
    for (const sx of [-1, 1]) { gs.push(new THREE.BoxGeometry(0.22, 0.02, 0.16).rotateZ(sx * 0.25).translate(sx * (w / 2 * 0.86 - 0.12), ride + 0.24, B.nose - 0.22)); gs.push(new THREE.BoxGeometry(0.07, 0.08, sp.wb - rA * 2 - 0.06).translate(sx * (w / 2 * 0.935 + 0.015), ride + 0.05, 0)); }
    gs.push(new THREE.BoxGeometry(w * 0.78, 0.04, 0.5).translate(0, ride + 0.03, B.tail + 0.24));
    for (let i = 0; i < 5; i++) gs.push(new THREE.BoxGeometry(0.025, 0.17, 0.46).translate((i - 2) * w * 0.17, ride + 0.11, B.tail + 0.24));
    gs.push(new THREE.BoxGeometry(w * 0.48, 0.13, 0.04).translate(0, ride + 0.24, B.nose + 0.0)); // grade
    gs.push(new THREE.BoxGeometry(w * 0.66, 0.16, 0.03).translate(0, ride + 0.36, B.tail - 0.015)); // painel traseiro
    if (B.vents) for (const sx of [-1, 1]) { const z = B.nose - 0.62, y = hoodY(B, z); gs.push(new THREE.BoxGeometry(0.32, 0.02, 0.24).rotateX(-0.12).translate(sx * 0.33, y + 0.012, z)); }
    return mergeGeometries(gs.map(g => g.toNonIndexed()));
  }), trim);
  if (B.scoop) { const z = (B.nose + B.cabF) / 2 - 0.1, y = hoodY(B, z); add(C1('scoop', () => new THREE.BoxGeometry(0.62, 0.13, 0.95).translate(0, y + 0.05, z)), paint); add(C1('scoopH', () => new THREE.BoxGeometry(0.52, 0.08, 0.02).translate(0, y + 0.06, z + 0.48)), trim); }
  // retrovisores
  add(C1('mirr', () => mergeGeometries([-1, 1].map(sx => new THREE.BoxGeometry(0.09, 0.08, 0.15).translate(sx * (w / 2 * 0.9 + 0.06), B.belt + 0.1, B.cabF - 0.18).toNonIndexed()))), paint);
  // faróis de LED, DRL e lanternas em barra
  const hl = add(C1('head', () => { const gs = []; for (const sx of [-1, 1]) { gs.push(new THREE.BoxGeometry(0.46, 0.045, 0.13).rotateY(sx * 0.22).translate(sx * (w / 2 * 0.86 - 0.32), B.hoodF - 0.06, B.nose - 0.1)); gs.push(new THREE.BoxGeometry(0.26, 0.025, 0.03).translate(sx * (w / 2 * 0.8 - 0.3), ride + 0.27, B.nose - 0.005)); } return mergeGeometries(gs.map(g => g.toNonIndexed())); }), S.head);
  const tl = add(C1('tail', () => { const gs = [new THREE.BoxGeometry(w * 0.8, 0.04, 0.04).translate(0, B.deck - 0.11, B.tail - 0.015)]; for (const sx of [-1, 1]) gs.push(new THREE.BoxGeometry(0.34, 0.08, 0.05).translate(sx * (w / 2 * 0.9 - 0.24), B.deck - 0.13, B.tail - 0.005)); return mergeGeometries(gs.map(g => g.toNonIndexed())); }), S.tail);
  v.tailMesh = tl; void hl;
  // aerofólios diferentes por modelo
  const wing = B.wing, wy = B.deck, wz = B.tail;
  if (wing === 'swan' || wing === 'gt') { const big = wing === 'gt'; const yy = wy + (big ? 0.5 : 0.36), zz = wz + (big ? 0.3 : 0.34);
    add(C1('wing', () => new THREE.BoxGeometry(w * (big ? 1.0 : 0.9), 0.045, big ? 0.42 : 0.34).rotateX(-0.1).translate(0, yy, zz)), accHex === 0x111111 || big ? trim : acc);
    add(C1('wingS', () => { const gs = []; for (const sx of [-1, 1]) { gs.push(new THREE.BoxGeometry(0.03, big ? 0.26 : 0.2, big ? 0.5 : 0.42).translate(sx * w * (big ? 0.5 : 0.45), yy + 0.02, zz)); gs.push(new THREE.BoxGeometry(0.04, yy - wy + 0.05, 0.12).translate(sx * 0.36, (yy + wy) / 2 - 0.02, zz + (big ? 0.06 : -0.04))); } return mergeGeometries(gs.map(g => g.toNonIndexed())); }), trim);
  } else if (wing === 'duck') add(C1('wing', () => new THREE.BoxGeometry(w * 0.84, 0.05, 0.24).rotateX(-0.38).translate(0, wy + 0.03, wz + 0.16)), paint);
  else { add(C1('wing', () => new THREE.BoxGeometry(w * 0.78, 0.035, 0.3).rotateX(-0.08).translate(0, wy + 0.13, wz + 0.32)), trim); add(C1('wingS', () => mergeGeometries([-1, 1].map(sx => new THREE.BoxGeometry(0.03, 0.13, 0.12).translate(sx * 0.5, wy + 0.06, wz + 0.32).toNonIndexed()))), trim); }
  // faixa de corrida no teto
  if (T.style !== 1) add(C1('stripe', () => new THREE.BoxGeometry(0.2, 0.012, Math.abs(B.roofF - B.roofR) * 0.9).translate(0, B.roof + 0.05, (B.roofF + B.roofR) / 2)), acc);
  // escapamentos + chamas azuis do nitro
  const ex = B.exh === 'quad' ? [-0.52, -0.4, 0.4, 0.52] : B.exh === 'single' ? [0.48] : B.exh === 'center' ? [-0.09, 0.09] : [-0.5, 0.5];
  const ey = B.exh === 'center' ? ride + 0.38 : ride + 0.2, ez = B.tail - 0.05;
  add(C1('exh', () => mergeGeometries(ex.map(sx => new THREE.CylinderGeometry(0.055, 0.06, 0.22, 10).rotateX(Math.PI / 2).translate(sx, ey, ez).toNonIndexed()))), S.chrome);
  const flameG = cached('flame', () => new THREE.ConeGeometry(0.11, 1, 10, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.5));
  const coreG = cached('flamec', () => new THREE.ConeGeometry(0.06, 0.6, 8, 1, true).rotateX(-Math.PI / 2).translate(0, 0, -0.3));
  const fm = new THREE.MeshBasicMaterial({ color: 0x2f6bff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const cm = new THREE.MeshBasicMaterial({ color: 0xd8f2ff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  v.flames = []; v.flameMats = [fm, cm];
  for (const sx of ex) { const f = new THREE.Group(); f.position.set(sx, ey, ez - 0.1); f.add(new THREE.Mesh(flameG, fm), new THREE.Mesh(coreG, cm)); f.visible = false; body.add(f); v.flames.push(f); }
  // adesivos laterais com letras + número no capô e no teto
  const dt = decalTexture(cleanText(T.text), T.style | 0, T.accent ?? 0xffffff, T.paint);
  const dm = new THREE.MeshBasicMaterial({ map: dt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }); v.decalMat = dm;
  const lenD = Math.min(1.5, sp.wb - rA * 2 - 0.3), hD = lenD / 8 * 1.3, yD = ride + 0.28 + hD / 2, xD = w / 2 * 0.935 + 0.012;
  add(C1('decR', () => new THREE.PlaneGeometry(lenD, hD).rotateY(Math.PI / 2).translate(xD, yD, 0)), dm); add(C1('decL', () => new THREE.PlaneGeometry(lenD, hD).rotateY(-Math.PI / 2).translate(-xD, yD, 0)), dm);
  const dark = (T.paint & 0xff) + ((T.paint >> 8) & 0xff) + (T.paint >> 16) < 200;
  const nt = numberTexture(T.num ?? 7, dark ? '#ffffff' : '#111111', dark ? 'rgba(20,20,24,.92)' : 'rgba(255,255,255,.95)');
  const nm = new THREE.MeshBasicMaterial({ map: nt, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }); v.numMat = nm;
  add(C1('numRoof', () => new THREE.PlaneGeometry(0.5, 0.5).rotateX(-Math.PI / 2).translate(T.style !== 1 ? 0.26 : 0, B.roof + 0.052, (B.roofF + B.roofR) / 2)), nm);
  { const z = B.nose - 0.5 - (B.nose - B.cabF) * 0.25, y = hoodY(B, z), sl = Math.atan2(hoodY(B, z - 0.1) - hoodY(B, z + 0.1), 0.2); add(C1('numHood', () => new THREE.PlaneGeometry(0.46, 0.46).rotateX(-Math.PI / 2).rotateX(-sl).translate(B.scoop ? -0.6 : -0.34, y + 0.07, z - 0.1)), nm); }
  // neon embaixo do carro
  if (T.glow != null) {
    const gm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: T.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: true });
    const pl = new THREE.Mesh(cached('glowP' + type, () => new THREE.PlaneGeometry(w + 2.4, sp.len + 2.4).rotateX(-Math.PI / 2)), gm); pl.position.y = 0.05; pl.renderOrder = 2; v.root.add(pl);
    const sm = new THREE.MeshBasicMaterial({ color: T.glow, toneMapped: false });
    add(C1('glowS', () => mergeGeometries([-1, 1].map(sx => new THREE.BoxGeometry(0.04, 0.04, sp.wb * 0.7).translate(sx * (w / 2 - 0.2), ride + 0.02, 0).toNonIndexed()))), sm);
    gm.userData.base = T.glow; sm.userData.base = T.glow; GLOW_MATS.add(gm); GLOW_MATS.add(sm); v.glowMats = [gm, sm]; setGlow(gm, sm, lastNight);
  }
  // rodas grandes de perfil baixo
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const pivot = new THREE.Group(); pivot.position.set(sx * (w / 2 - 0.19), sp.wr, sz * sp.wb / 2); const wh = tunedWheel(S, sp.wr, 0.3, T.rim); pivot.add(wh); v.root.add(pivot);
    v.wheels.push(wh); if (sz > 0) v.front.push(pivot);
  }
}

let DENT_M = null, SCRATCH_M = null;
let TAIL_TEX = null; let BEAM_TEX = null;
export class Vehicle {
  constructor(type, scene, Q, color, tune) {
    const S = shared(Q); this.type = type; this.spec = SPECS[type]; const sp = this.spec;
    if (sp.race && !tune) tune = raceTune(type); if (tune && !PROFILES[type] && !sp.race && type !== 'moto') tune = null; this.tune = tune || null; if (tune) color = tune.paint;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    this.color = color ?? sp.colors[Math.floor(Math.random() * sp.colors.length)];
    const paint = S.paint(this.color); this.wheels = []; this.front = [];
    const shadow = Q.level !== 'low';
    if (sp.race) buildRaceCar(this, S, sp, this.tune);
    else if (PROFILES[type]) {
      const P = PROFILES[type]; const w = sp.w;
      const lower = new THREE.Mesh(cached('l' + type, () => extrude(P.lower, w, 0.08)), paint);
      const glass = new THREE.Mesh(cached('g' + type, () => extrude(P.glass, w - P.gw, 0.04)), S.glass);
      const roof = new THREE.Mesh(cached('rf' + type, () => new THREE.BoxGeometry(w - P.gw + 0.04, 0.07, P.roof[1] - P.roof[0] + 0.1).translate(0, P.roof[2], (P.roof[0] + P.roof[1]) / 2)), paint);
      this.body.add(lower, glass, roof);
      const L = sp.len;
      // para-choques, faróis, lanternas, grade
      const fz = P.lower[2][0], rz = P.lower[0][0];
      this.body.add(new THREE.Mesh(cached('bf' + type, () => new THREE.BoxGeometry(w * 0.96, 0.18, 0.18).translate(0, 0.38, fz + 0.06)), S.trim));
      this.body.add(new THREE.Mesh(cached('br' + type, () => new THREE.BoxGeometry(w * 0.96, 0.18, 0.18).translate(0, 0.38, rz - 0.04)), S.trim));
      const hl = new THREE.Mesh(cached('hl' + type, () => { const g = new THREE.BoxGeometry(0.42, 0.11, 0.06); const a = g.clone().translate(-w / 2 + 0.32, P.lower[3][1] - 0.04, P.lower[3][0] - 0.02); const b = g.translate(w / 2 - 0.32, P.lower[3][1] - 0.04, P.lower[3][0] - 0.02); return mergeTwo(a, b); }), S.head);
      const ty = P.lower[P.lower.length - 1][1] - 0.1, tz = Math.min(rz, P.lower[P.lower.length - 1][0]) - 0.04;
      const tl = new THREE.Mesh(cached('tl' + type, () => { const g = new THREE.BoxGeometry(0.46, 0.13, 0.06); const a = g.clone().translate(-w / 2 + 0.33, ty, tz); const b = g.translate(w / 2 - 0.33, ty, tz); const bar = new THREE.BoxGeometry(w * 0.5, 0.035, 0.05).translate(0, ty + 0.03, tz); return mergeTwo(mergeTwo(a, b), bar); }), S.tail);
      this.body.add(new THREE.Mesh(cached('pl' + type, () => new THREE.BoxGeometry(0.5, 0.13, 0.03).translate(0, 0.52, rz - 0.15)), S.plate));
      this.body.add(hl, tl); this.tailMesh = tl;
      if (type === 'classic') { // para-lamas arredondados e cromados
        for (const z of [sp.wb / 2, -sp.wb / 2]) for (const sx of [-1, 1]) { const f = new THREE.Mesh(cached('fd', () => new THREE.SphereGeometry(0.5, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(0.55, 0.75, 1.15)), paint); f.position.set(sx * (w / 2 - 0.08), 0.4, z * 0.98); this.body.add(f); }
        this.body.add(new THREE.Mesh(cached('cb', () => new THREE.BoxGeometry(w * 0.9, 0.12, 0.12).translate(0, 0.36, fz + 0.12)), S.chrome));
      }
      if (type === 'taxi') {
        const sign = new THREE.Mesh(cached('tx', () => new THREE.BoxGeometry(0.7, 0.22, 0.28).translate(0, P.roof[2] + 0.14, -0.3)), new THREE.MeshBasicMaterial({ color: 0xfff3a0, toneMapped: false }));
        this.body.add(sign); this.taxiSign = sign;
        const st = new THREE.Mesh(cached('txs', () => new THREE.BoxGeometry(w + 0.01, 0.12, 2.4).translate(0, 0.75, 0)), new THREE.MeshStandardMaterial({ color: 0x111111 })); this.body.add(st);
      }
      if (type === 'sport') this.body.add(new THREE.Mesh(cached('sp', () => new THREE.BoxGeometry(w * 0.85, 0.05, 0.3).translate(0, 1.02, -2.05)), S.trim));
      if (type === 'pickup') { // caçamba (fundo escuro), santantônio e farol de teto
        this.body.add(new THREE.Mesh(cached('pkbed', () => new THREE.BoxGeometry(w - 0.24, 0.04, 1.86).translate(0, 1.205, -1.66)), S.trim));
        this.body.add(new THREE.Mesh(cached('pkbar', () => { const a = new THREE.BoxGeometry(0.07, 0.62, 0.07).translate(-w / 2 + 0.2, 1.5, -0.78); const b = new THREE.BoxGeometry(0.07, 0.62, 0.07).translate(w / 2 - 0.2, 1.5, -0.78); const c = new THREE.BoxGeometry(w - 0.33, 0.07, 0.07).translate(0, 1.8, -0.78); return mergeTwo(mergeTwo(a, b), c); }), S.chrome));
        this.body.add(new THREE.Mesh(cached('pkled', () => new THREE.BoxGeometry(1.1, 0.07, 0.1).translate(0, 1.88, 0.6)), S.head));
      }
      if (type === 'suv') this.body.add(new THREE.Mesh(cached('rr', () => { const a = new THREE.BoxGeometry(0.06, 0.06, 2.6).translate(-0.7, 1.86, -0.7); const b = new THREE.BoxGeometry(0.06, 0.06, 2.6).translate(0.7, 1.86, -0.7); return mergeTwo(a, b); }), S.chrome));
      const ww = type === 'suv' || type === 'pickup' ? 0.32 : 0.24;
      for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
        const T = this.tune; const pivot = new THREE.Group(); pivot.position.set(sx * (w / 2 - 0.16 + (T && T.kit ? 0.09 : 0)), sp.wr, sz * sp.wb / 2); const wh = T ? tunedWheel(S, sp.wr, ww + (T.kit ? 0.06 : 0), T.rim) : wheel(S, sp.wr, ww); pivot.add(wh); this.root.add(pivot);
        this.wheels.push(wh); if (sz > 0) this.front.push(pivot);
      }
      if (this.tune) applyTune(this, S, P, sp, this.tune);
    } else if (type === 'moto') {
      const g = this.body;
      g.add(new THREE.Mesh(cached('mt', () => new THREE.BoxGeometry(0.34, 0.3, 0.7).translate(0, 0.82, 0.2)), paint));
      g.add(new THREE.Mesh(cached('mf', () => { const s = new THREE.BoxGeometry(0.4, 0.35, 0.5); s.translate(0, 0.95, 0.75); return s; }), paint));
      g.add(new THREE.Mesh(cached('ms', () => new THREE.BoxGeometry(0.3, 0.1, 0.7).translate(0, 0.93, -0.35)), S.seat));
      g.add(new THREE.Mesh(cached('mtail', () => new THREE.BoxGeometry(0.26, 0.2, 0.5).translate(0, 0.92, -0.75)), paint));
      g.add(new THREE.Mesh(cached('mfr', () => new THREE.BoxGeometry(0.16, 0.25, 1.3).translate(0, 0.55, -0.05)), S.trim));
      g.add(new THREE.Mesh(cached('mfork', () => new THREE.BoxGeometry(0.08, 0.75, 0.08).rotateX(-0.35).translate(0, 0.68, 0.82)), S.chrome));
      g.add(new THREE.Mesh(cached('mbar', () => new THREE.BoxGeometry(0.7, 0.04, 0.04).translate(0, 1.08, 0.62)), S.trim));
      g.add(new THREE.Mesh(cached('mhl', () => new THREE.BoxGeometry(0.16, 0.1, 0.05).translate(0, 0.98, 1.01)), S.head));
      const tl = new THREE.Mesh(cached('mtl', () => new THREE.BoxGeometry(0.16, 0.06, 0.04).translate(0, 0.95, -1.01)), S.tail); g.add(tl); this.tailMesh = tl;
      if (this.tune) tuneMoto(this, S, sp, this.tune);
      for (const sz of [1, -1]) { const pivot = new THREE.Group(); pivot.position.set(0, sp.wr, sz * sp.wb / 2 * 0.95); const wh = this.tune ? tunedWheel(S, sp.wr, 0.18, this.tune.rim) : wheel(S, sp.wr, 0.16); pivot.add(wh); g.add(pivot); this.wheels.push(wh); if (sz > 0) this.front.push(pivot); }
    } else if (type === 'boat') {
      const hull = new THREE.Shape(); hull.moveTo(-3, -1.15); hull.lineTo(1.2, -1.15); hull.quadraticCurveTo(3, -0.7, 3.2, 0); hull.quadraticCurveTo(3, 0.7, 1.2, 1.15); hull.lineTo(-3, 1.15); hull.closePath();
      const hg = cached('hull', () => { const g = new THREE.ExtrudeGeometry(hull, { depth: 1.1, bevelEnabled: true, bevelSize: 0.08, bevelThickness: 0.08, bevelSegments: 2 }); g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); g.translate(0, -0.35, 0); return g; });
      this.body.add(new THREE.Mesh(hg, paint));
      this.body.add(new THREE.Mesh(cached('bstripe', () => new THREE.BoxGeometry(2.36, 0.12, 4.6).translate(0, 0.35, -0.4)), S.paint(0x0a84ff)));
      this.body.add(new THREE.Mesh(cached('bdeck', () => new THREE.BoxGeometry(2.0, 0.08, 4.4).translate(0, 0.78, -0.6)), new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.7 })));
      this.body.add(new THREE.Mesh(cached('bws', () => new THREE.BoxGeometry(1.8, 0.5, 0.06).rotateX(-0.6).translate(0, 1.1, 0.6)), S.glass));
      this.body.add(new THREE.Mesh(cached('bseat', () => new THREE.BoxGeometry(1.6, 0.45, 0.6).translate(0, 1.0, -1.9)), S.seat));
      this.body.add(new THREE.Mesh(cached('bmotor', () => new THREE.BoxGeometry(0.5, 0.8, 0.5).translate(0, 0.6, -3.2)), S.trim));
      const tl = new THREE.Mesh(cached('btl', () => new THREE.BoxGeometry(0.1, 0.1, 0.1).translate(0, 1.3, -2.9)), S.tail); this.body.add(tl); this.tailMesh = tl;
      this.body.add(new THREE.Mesh(cached('bhl', () => new THREE.BoxGeometry(0.2, 0.1, 0.05).translate(0, 0.85, 2.6)), S.head));
    }
    this.root.traverse(o => { if (o.isMesh) { o.castShadow = shadow; o.receiveShadow = false; } });
    // estado
    this.x = 0; this.z = 0; this.y = 0; this.h = 0; this.vx = 0; this.vz = 0; this.vf = 0; this.steer = 0; this.spin = 0;
    this.pitch = 0; this.roll = 0; this.bob = 0; this.rpm = 0; this.driver = null; this.npc = false; this.hitT = 0; this.brakeOn = false;
    this.r = sp.w * 0.5 + 0.05;
    this.nitro = 1; this.boosting = false;
  }
  place(x, z, h) { this.x = x; this.z = z; this.h = h; this.vx = this.vz = this.vf = 0; this.y = this.spec.boat ? WATER_Y : surfaceY(x, z); this.sync(0); }
  get speed() { return Math.hypot(this.vx, this.vz); }
  fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }
  circles() { const [fx, fz] = this.fwd(); const o = this.spec.len * 0.27; return [[this.x + fx * o, this.z + fz * o], [this.x - fx * o, this.z - fz * o]]; }
  // física do jogador. inp: {x: direção (-1..1, + = direita), y: acelerar (+) / frear (-), hb: freio de mão}
  drive(dt, inp, others, t) {
    const sp = this.spec; const [fx, fz] = this.fwd(); const rx = -fz, rz = fx;
    let vf = this.vx * fx + this.vz * fz, vl = this.vx * rx + this.vz * rz;
    const vx0 = this.vx, vz0 = this.vz;
    const thr = inp.y;
    let surf = 1, offroad = false;
    if (!sp.boat) {
      const gy = groundY(this.x, this.z); const rd = roadAt(this.x, this.z);
      offroad = rd.d > rd.seg.w + 4.5;
      const ts = HOOKS.surf && HOOKS.surf(this.x, this.z);
      if (ts) { surf = ts; offroad = ts < 1; } else
      if (this.x > 324 && this.x < 400) surf = 0.55; else if (inSwamp(this.x, this.z)) surf = 0.6; else if (offroad) surf = 0.85;
      if (gy < -6) surf = 0.3;
    }
    // nitro (só carros tunados)
    this.boosting = !!(this.tune && inp.nitro && this.nitro > 0.02 && thr > 0.05 && vf > 1);
    if (this.tune) { const fill = sp.race ? (this.drifting || this.driftAng > 0.2 ? 1 / 4 : 1 / 14) : (this.drift > 3.5 ? 1 / 5 : 1 / 16); const nl = this.npc ? 0 : NITRO.lvl; if (this.boosting) this.nitro = Math.max(0, this.nitro - dt / ((sp.race ? 4.4 : 3.8) * (1 + nl * 0.15))); else this.nitro = Math.min(1, this.nitro + dt * fill * (1 + nl * 0.25)); }
    // nitro de oito camadas: segurando, sobe de estágio a cada 0,45 s (1 a 8), cada um mais forte
    if (this.boosting) { this.nStageT = (this.nStageT || 0) + dt; this.nStage = Math.min(NITRO_STAGES, 1 + Math.floor(this.nStageT / 0.45)); } else { this.nStageT = 0; this.nStage = 0; }
    const boost = this.boosting ? 0.6 + this.nStage * 0.1 + (this.npc ? 0 : NITRO.lvl * 0.05) : 0; const limit = inp.limit != null ? clamp(inp.limit, 0.15, 1) : 1; const mk = this.npc ? 0 : MOTOR.lvl; const max = sp.max * (1 + mk * 0.09) * surf * (1 + boost * 0.32) * limit; const acc = sp.acc * (1 + mk * 0.08) * (1 + boost * 1.4);
    if (thr > 0.05) { if (vf < -0.5) vf = Math.min(0, vf + sp.brake * dt); else vf += acc * thr * Math.max(0, 1 - (vf / max) ** 2) * dt + boost * 4 * dt; }
    else if (thr < -0.05) { if (vf > 0.5) vf = Math.max(0, vf - sp.brake * -thr * dt); else vf = Math.max(-max * 0.3, vf - sp.acc * 0.6 * -thr * dt); }
    else { const c = (sp.boat ? 2.5 : 2.2) * dt; vf = Math.abs(vf) < c ? 0 : vf - Math.sign(vf) * c; }
    if (inp.hardBrake) { const b = (sp.brake || 18) * 2.5 * dt; vf = Math.abs(vf) <= b ? 0 : vf - Math.sign(vf) * b; }
    if (inp.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), (sp.boat ? 4 : 9) * dt);
    if (vf > max) vf = lerp(vf, max, dt * 2);
    this.brakeOn = thr < -0.05 && vf > 0.5 || inp.hb;
    this.steer += (inp.x - this.steer) * Math.min(1, dt * (sp.boat ? 3 : 7));
    let yaw;
    // drift estilo arcade dos carros de corrida: freio (ou freio de mão) numa curva rápida solta a traseira;
    // acelerador segura o drift, o volante controla o ângulo (para dentro = mais ângulo, contra-esterço = endireita)
    if (sp.race && !this.drifting) {
      const braking = thr < -0.05 || inp.hb; const s0 = Math.hypot(vx0, vz0);
      if (braking && Math.abs(this.steer) > 0.28 && s0 > (inp.hb ? 10 : 13) && vf > 0 && surf > 0.6) {
        this.drifting = true; this.driftDir = Math.sign(this.steer); this.driftT = 0; this.cntT = 0; this.relT = 0; this.vAng = Math.atan2(vx0, vz0); this.dSpd = s0;
      }
    }
    // drift do deslize (↓): qualquer carro; longo, segura a traseira e encadeia para o outro lado (pêndulo)
    if (inp.kick && !sp.boat && this.type !== 'moto' && !this.drifting) {
      const s0 = Math.hypot(vx0, vz0);
      if (s0 > 7 && vf > 0 && surf > 0.5) {
        const sd = Math.abs(this.steer) > 0.08 ? Math.sign(this.steer) : (this._lastSteerDir || 1);
        this.drifting = true; this.swD = true; this.driftDir = sd; this.driftT = 0; this.cntT = 0; this.relT = 0;
        this.vAng = Math.atan2(vx0, vz0); this.dSpd = s0 * 1.04; this.dExt = DRIFT_WIN; this.dChain = 0; this.dTime = 0;
      }
    }
    if (Math.abs(this.steer) > 0.2) this._lastSteerDir = Math.sign(this.steer);
    if ((sp.race || this.swD) && this.drifting) {
      const dir = this.driftDir, u = clamp(this.steer * dir, -1, 1), dk = sp.drift || 0.8; this.driftT += dt;
      let s0 = this.dSpd ?? Math.hypot(vx0, vz0);
      const maxD = max * 0.95;
      if (thr > 0.05) s0 += (acc * 0.55 * thr * Math.max(0, 1 - (s0 / maxD) ** 2) + boost * 5) * dt; else s0 -= ((this.swD ? 1.1 : 2.6) + (thr < -0.05 ? 8 * -thr : 0)) * dt;
      if (inp.hb) s0 -= 3.5 * dt;
      const beta = Math.abs(angDiff(this.vAng, this.h)); s0 -= beta * (7.5 - 2 * dk) * dt * clamp(s0 / 20, 0.4, 1.6) * (this.swD ? 0.42 : 1); s0 = Math.max(0, s0);
      const omega = clamp(0.44 + 0.46 * u, 0.06, 0.92) * (sp.steer / 0.56) * clamp(s0 / 12, 0, 1) * (1 + 0.35 * clamp((s0 - 20) / 20, 0, 1)) * (inp.hb ? 1.12 : 1);
      this.vAng -= dir * omega * dt;
      const bt = (0.4 + 0.2 * u + (thr > 0.05 ? 0.08 : 0) + (inp.hb ? 0.1 : 0)) * (0.72 + 0.35 * dk) * (this.swD ? 1.15 : 1);
      const hT = this.vAng - dir * bt; const h0 = this.h;
      this.h += angDiff(this.h, hT) * Math.min(1, dt * (this.driftT < 0.35 ? 6.5 : 4.5));
      yaw = (h0 - this.h) / Math.max(dt, 1e-4); this.yawV = yaw;
      this.dSpd = s0; this.vx = Math.sin(this.vAng) * s0; this.vz = Math.cos(this.vAng) * s0;
      const [hfx, hfz] = this.fwd(); vf = this.vx * hfx + this.vz * hfz; vl = this.vx * -hfz + this.vz * hfx; this.vf = vf; this.drift = Math.abs(vl);
      // saída do drift: contra-esterço segurado, soltou tudo, velocidade baixa
      this.cntT = u < -0.45 ? this.cntT + dt : 0; this.relT = Math.abs(this.steer) < 0.15 && thr <= 0.05 && !inp.hb ? this.relT + dt : 0;
      if (this.swD) {
        this.dTime += dt;
        // janela de extensão: acelerador + volante para dentro seguram o drift; sem isso, ela esvazia
        const hold = thr > 0.05 && u > -0.2;
        this.dExt = Math.min(DRIFT_MAX, this.dExt - dt + (hold ? dt * 0.62 : 0));
        // virou para o outro lado: pêndulo e o drift continua para o outro lado, ganhando tempo
        if (this.cntT > 0.14 && s0 > 9) { this.driftDir = -dir; this.cntT = 0; this.driftT = 0.12; this.dChain++; this.dExt = Math.min(DRIFT_MAX, Math.max(this.dExt, 1.6) + 0.5); }
        if (s0 < 6 || this.dExt <= 0 || this.relT > 1.1) { this.drifting = false; this.swD = false; this.recover = 0; this.recSlow = true; this.dLast = { t: this.dTime, chain: this.dChain }; }
      } else if (s0 < 8.5 || this.cntT > 0.42 || this.relT > 0.45 || beta < 0.06 && this.driftT > 0.5) { this.drifting = false; this.recover = 0; }
      this.brakeOn = thr < -0.05 || inp.hb;
    } else {
    // transferência de peso: freando o peso vai pra frente (traseira leve), acelerando vai pra trás
    const wt = this.wt || 0; let gripK = 1, yawK = 8;
    if (sp.boat) yaw = this.steer * sp.steer * (Math.min(1, Math.abs(vf) / 6) * Math.sign(vf || 1) * 0.9 + 0.15);
    else {
      const ang = this.steer * sp.steer / (1 + Math.abs(vf) * 0.035); yaw = vf * Math.tan(ang) / sp.wb;
      const st = Math.abs(this.steer); const fast = clamp((Math.abs(vf) - 8) / 14, 0, 1);
      // freada em curva: traseira solta (entrada de curva de lado)
      if (wt > 0) gripK *= 1 - wt * 0.45 * st * fast;
      // muita potência em curva (esportivo, moto, nitro): traseira escorrega
      if (thr > 0.6 && st > 0.35 && this.type !== 'moto') gripK *= 1 - clamp((sp.acc - 8) / 18, 0, 0.4) * fast * (this.boosting ? 1.4 : 1);
      if (inp.hb && !sp.race) { gripK = Math.min(gripK, 1.2 / sp.grip); yaw *= 1.35; yawK = 3; } // freio de mão: drift
      else if (inp.hb) gripK *= 0.7;
      else if (gripK < 0.8) yawK = 4.5;
      // contra-esterço ajuda a segurar o drift: o volante "conversa" com o deslize
      const slip = vl / Math.max(5, Math.abs(vf)); if (Math.abs(slip) > 0.12) yaw += slip * Math.sign(vf) * (inp.hb ? 1.2 : 0.7) * fast * (1 - st * 0.5);
    }
    // inércia de rotação: o carro não vira instantâneo (mais solto quando a traseira escorrega)
    this.yawV = (this.yawV ?? yaw) + (yaw - (this.yawV ?? yaw)) * Math.min(1, dt * (sp.boat ? 4 : yawK));
    // física de verdade: a velocidade não gira junto com o carro; o pneu é que puxa a lateral de volta (aderência).
    // Com freio de mão / traseira leve a aderência cai e o carro escorrega de lado (drift).
    const wx = fx * vf + rx * vl, wz = fz * vf + rz * vl;
    this.h -= this.yawV * dt; yaw = this.yawV;
    if (!sp.boat) { const [hfx, hfz] = this.fwd(); vf = wx * hfx + wz * hfz; vl = wx * -hfz + wz * hfx; }
    if ((sp.race || this.recSlow) && this.recover !== undefined && this.recover < 1) { this.recover = Math.min(1, this.recover + dt / (this.recSlow ? 1.25 : 0.6)); gripK *= 0.22 + 0.78 * this.recover * this.recover; if (this.recover >= 1) this.recSlow = false; }
    const grip = (sp.boat ? sp.grip : sp.grip * gripK * 2.5) * (sp.boat ? 1 : surf > 0.6 ? 1 : 0.7);
    const vl0 = vl; vl *= Math.exp(-grip * dt);
    if (!sp.boat) vf -= Math.sign(vf) * Math.min(Math.abs(vf), Math.abs(vl0 - vl) * 0.12); // escorregar de lado custa um pouco de velocidade
    this.drift = Math.abs(vl);
    const [nfx, nfz] = this.fwd(); const nrx = -nfz, nrz = nfx;
    this.vx = nfx * vf + nrx * vl; this.vz = nfz * vf + nrz * vl; this.vf = vf;
    }
    { const sp0 = Math.hypot(this.vx, this.vz); this.driftAng = sp0 > 6 && !sp.boat ? Math.abs(angDiff(Math.atan2(this.vx, this.vz), this.h + (vf < 0 ? Math.PI : 0))) : 0; }
    const px = this.x, pz = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    // limites de terreno
    const ok = sp.boat ? (x, z) => boatable(x, z) : (x, z) => drivable(x, z);
    let impact = 0;
    const cs = this.circles();
    if (!ok(this.x, this.z) || !ok(cs[0][0], cs[0][1]) || !ok(cs[1][0], cs[1][1])) {
      impact = this._edgeSlide(ok, px, pz, dt);
    }
    // colisões com prédios/objetos (2 círculos)
    for (let k = 0; k < 2; k++) {
      const c = this.circles()[k]; const pos = { x: c[0], z: c[1] };
      const hit = collide(pos, this.r, sp.boat, this.y + 0.3);
      if (hit) { const dx = pos.x - c[0], dz = pos.z - c[1]; this.x += dx; this.z += dz; impact = Math.max(impact, this.bounce(hit.x, hit.z)); }
    }
    // outros veículos
    for (const o of others) {
      if (o === this || o.spec.boat !== sp.boat || o.ghost || this.ghost) continue; // IA de tandem nunca bloqueia
      const dx0 = o.x - this.x, dz0 = o.z - this.z; if (dx0 * dx0 + dz0 * dz0 > 64) continue;
      for (const a of this.circles()) for (const b of o.circles()) {
        const dx = a[0] - b[0], dz = a[1] - b[1], d = Math.hypot(dx, dz), rr = this.r + o.r;
        if (d < rr && d > 1e-4) {
          const nx = dx / d, nz = dz / d, pen = rr - d;
          if (o.npc || o.parked) { this.x += nx * pen; this.z += nz * pen; if (o.npc) o.bumped = 2.5; else { o.x -= nx * pen * 0.3; o.z -= nz * pen * 0.3; o.sync(0); } }
          impact = Math.max(impact, this.bounce(nx, nz));
        }
      }
    }
    if (impact > 4 && this.drifting) { this.drifting = false; this.recover = 0.3; if (this.swD) { this.swD = false; this.recSlow = true; this.dLast = { t: this.dTime, chain: this.dChain }; } }
    if (this.drifting && impact > 0) this.dSpd = Math.hypot(this.vx, this.vz), this.vAng = Math.atan2(this.vx, this.vz);
    this.hitT = Math.max(0, this.hitT - dt);
    // altura, inclinação, balanço
    const [ffx, ffz] = this.fwd(); const sp2 = this.spec;
    if (sp.boat) {
      const y0 = waveH(this.x, this.z, t), yF = waveH(this.x + ffx * 2.5, this.z + ffz * 2.5, t), yS = waveH(this.x - ffz * 1.1, this.z + ffx * 1.1, t);
      this.y = WATER_Y + y0 + 0.15; this.pitch = lerp(this.pitch, -(yF - y0) / 2.5 - Math.min(Math.abs(vf), 20) * 0.006, dt * 4); this.roll = lerp(this.roll, (yS - y0) / 1.1 + this.steer * Math.min(Math.abs(vf), 15) * 0.012, dt * 4);
    } else {
      const yc = surfaceY(this.x, this.z), yf = surfaceY(this.x + ffx * sp2.wb / 2, this.z + ffz * sp2.wb / 2), yr = surfaceY(this.x - ffx * sp2.wb / 2, this.z - ffz * sp2.wb / 2);
      this.y = lerp(this.y, Math.max(yc, -0.4), Math.min(1, dt * 12));
      const acc = (vf - (this._pvf ?? vf)) / Math.max(dt, 1e-3); this._pvf = vf;
      this.wt = lerp(this.wt || 0, clamp(-acc / sp.brake, -1, 1), Math.min(1, dt * 5));
      // suspensão com mola e amortecedor: mergulha na freada, agacha na arrancada, inclina nas curvas e balança nas guias
      const yfS = Math.abs(yf - yc) > 1.2 ? yc : yf, yrS = Math.abs(yr - yc) > 1.2 ? yc : yr; // borda da ponte/mar: ignora a amostra
      const pitchT = clamp(Math.atan2(yrS - yfS, sp2.wb) + clamp(acc, -24, 20) * sp2.susp * 0.024, -0.32, 0.32);
      const latA = yaw * vf; const rollT = this.type === 'moto' ? 0 : clamp(latA, -25, 25) * sp2.susp * 0.014;
      const yN = Math.max(yc, -0.4); if (this._py !== undefined && Math.abs(yN - this._py) > 0.08 && Math.abs(yN - this._py) < 0.6 && Math.abs(vf) > 3) { const dy = clamp(yN - this._py, -0.3, 0.3); this.pv = (this.pv || 0) + dy * Math.sign(vf) * -4; this.bv = (this.bv || 0) + Math.abs(dy) * 1.5; } this._py = yN;
      const Kp = 140, Cp = 13; this.pv = (this.pv || 0) + ((pitchT - this.pitch) * Kp - (this.pv || 0) * Cp) * dt; this.pitch += this.pv * dt;
      if (this.type !== 'moto') { this.rv = (this.rv || 0) + ((rollT - this.roll) * Kp - (this.rv || 0) * Cp) * dt; this.roll += this.rv * dt; }
      if (this.type === 'moto') this.roll = lerp(this.roll, clamp(-yaw * Math.abs(vf) * 0.03, -0.6, 0.6), Math.min(1, dt * 5));
      // nunca de pé/capotado: limita e, se algo empurrar além (ex.: teleporte), endireita em 1 s
      if (Math.abs(this.pitch) > 0.6 || Math.abs(this.roll) > (this.type === 'moto' ? 0.8 : 0.6)) { this.tiltT = (this.tiltT || 0) + dt; if (this.tiltT > 1) { this.pitch = this.roll = this.pv = this.rv = 0; this.tiltT = 0; this.uprights = (this.uprights || 0) + 1; } } else this.tiltT = 0;
      this.pitch = clamp(this.pitch, -1.0, 1.0); if (this.type !== 'moto') this.roll = clamp(this.roll, -0.9, 0.9);
      this.bv = (this.bv || 0) + (-(this.bobS || 0) * 180 - (this.bv || 0) * 12) * dt; this.bobS = (this.bobS || 0) + this.bv * dt;
      if (offroad && Math.abs(vf) > 3) this.bob = this.bobS + Math.sin(t * 22) * 0.012 * Math.min(1, Math.abs(vf) / 15) * (this.type === 'suv' ? 0.5 : 1);
      else this.bob = this.bobS + (this.bob - this.bobS) * 0.9;
    }
    this.spin += vf * dt / (sp.wr || 1);
    this.rpm = clamp(Math.abs(vf) / sp.max, 0, 1);
    this.sync(dt);
    return impact;
  }
  // pose válida? (centro + 2 círculos dentro da área dirigível)
  _okPose(ok, x, z) { const ox = this.x, oz = this.z; this.x = x; this.z = z; const c = this.circles(); this.x = ox; this.z = oz; return ok(x, z) && ok(c[0][0], c[0][1]) && ok(c[1][0], c[1][1]); }
  // borda/guarda-corpo/mar: procura a direção livre mais próxima (desliza junto à borda), tira só o componente contra a parede,
  // e se o carro já estiver "dentro" da borda empurra para o ponto válido mais perto. Nunca fica parado grudado.
  _edgeSlide(ok, px, pz, dt) {
    const spd0 = Math.hypot(this.vx, this.vz); const a0 = Math.atan2(this.vx, this.vz); const step = Math.max(0.05, spd0 * dt);
    if (!this._okPose(ok, px, pz)) { // preso dentro da borda: empurra para fora
      let done = false;
      for (const r of [0.6, 1.2, 2, 3, 4.5, 6]) { for (let k = 0; k < 16 && !done; k++) { const a = k / 16 * Math.PI * 2; const x = px + Math.sin(a) * r, z = pz + Math.cos(a) * r; if (this._okPose(ok, x, z)) { this.x = x; this.z = z; done = true; } } if (done) break; }
      if (!done) { this.x = px; this.z = pz; }
      this.vx *= 0.5; this.vz *= 0.5; this.hitT = 0.28; this.edgeHits = (this.edgeHits || 0) + 1; return spd0 * 0.3;
    }
    let best = null;
    for (const ang of [0.2, 0.4, 0.65, 0.9, 1.15, 1.4, 1.57]) { for (const sg of [1, -1]) { const a = a0 + sg * ang; const L = step * Math.max(0.25, Math.cos(ang)); const x = px + Math.sin(a) * L, z = pz + Math.cos(a) * L; if (this._okPose(ok, x, z)) { best = { a, ang, x, z }; break; } } if (best) break; }
    this.hitT = 0.28; this.edgeHits = (this.edgeHits || 0) + 1;
    if (best) {
      this.x = best.x; this.z = best.z; const keep = spd0 * Math.max(0.45, Math.cos(best.ang)) * 0.96; this.vx = Math.sin(best.a) * keep; this.vz = Math.cos(best.a) * keep;
      if (!this.drifting) this.h += angDiff(this.h, best.a + (Math.cos(angDiff(this.h, best.a)) < 0 ? Math.PI : 0)) * Math.min(1, 0.12 + best.ang * 0.1); // o carro alinha com a borda
      const hitN = spd0 * Math.sin(best.ang); const wn = angDiff(a0, best.a) > 0 ? -1 : 1; const nx = Math.sin(a0 + wn * Math.PI / 2), nz = Math.cos(a0 + wn * Math.PI / 2);
      this.dent(hitN, -nx, -nz); return hitN;
    }
    // sem saída para a frente: recua levemente (ricochete curto) — nunca trava
    this.x = px; this.z = pz; this.vx = -this.vx * 0.25; this.vz = -this.vz * 0.25; this.dent(spd0, Math.sin(a0), Math.cos(a0)); return spd0;
  }
  bounce(nx, nz) {
    const vn = this.vx * nx + this.vz * nz; if (vn >= 0) return 0;
    const spd0 = Math.hypot(this.vx, this.vz);
    this._glance(nx, nz, spd0);
    this.dent(-vn, nx, nz);
    this.hitT = 0.28; return -vn;
  }
  // bate e continua: tira só o componente contra o obstáculo, mantém ~80–90% da velocidade no desvio
  _glance(nx, nz, spd0) {
    const vn = this.vx * nx + this.vz * nz;
    if (vn < 0) { this.vx -= vn * nx; this.vz -= vn * nz; }
    let spd = Math.hypot(this.vx, this.vz);
    const keep = Math.max(spd0 * 0.82, 4);
    const [fx, fz] = this.fwd();
    if (spd < 0.6) { // de frente: desvia um pouco e segue
      const tx = fx - nx * 0.55, tz = fz - nz * 0.55, tl = Math.hypot(tx, tz) || 1;
      this.vx = tx / tl * keep; this.vz = tz / tl * keep;
    } else {
      this.vx *= keep / spd; this.vz *= keep / spd;
    }
    this.vf = this.vx * fx + this.vz * fz;
    this.hitT = 0.28;
  }
  dent(impact, nx, nz) {
    if (this.npc || impact < 3.2) return;
    if (!this.dents) this.dents = [];
    if (this.dents.length >= 12) return; // no máximo 6 amassados + 6 riscos
    const [fx, fz] = this.fwd();
    const lx = nx * fz - nz * fx, lz = nx * fx + nz * fz;
    if (!this._dentM) { const c = new THREE.Color(this.color ?? 0x888888).multiplyScalar(0.78); this._dentM = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.4, flatShading: true }); }
    const DM = this._dentM;
    if (!SCRATCH_M) SCRATCH_M = new THREE.MeshBasicMaterial({ color: 0xd8d8d8, transparent: true, opacity: 0.7 });
    const r0 = 0.16 + Math.min(0.1, impact * 0.006);
    const d = new THREE.Mesh(new THREE.IcosahedronGeometry(r0, 0), DM);
    const w = (this.spec.w || 1.8) * 0.5, L = (this.spec.len || 4.2) * 0.44;
    const side = Math.abs(lx) > Math.abs(lz) ? Math.sign(lx) : 0;
    const x = side ? side * w : (Math.random() - 0.5) * w * 1.2;
    const z = side ? (Math.random() - 0.5) * L * 1.4 : Math.sign(lz || 1) * L;
    d.position.set(x, 0.5 + Math.random() * 0.2, z);
    d.scale.set(side ? 0.12 : 1.2, 0.45, side ? 1.2 : 0.12); // achatado contra a lataria (amassado raso, não peça solta)
    d.rotation.set(0, (Math.random() - 0.5) * 0.4, 0); d.userData.dent = true;
    this.body.add(d); this.dents.push(d);
    // risco claro ao lado do amassado
    const sc = new THREE.Mesh(new THREE.BoxGeometry(side ? 0.02 : 0.9, 0.035, side ? 0.9 : 0.02), SCRATCH_M);
    sc.position.set(x + (side ? side * 0.02 : 0), 0.62 + Math.random() * 0.1, z + (side ? 0 : Math.sign(lz || 1) * 0.02));
    sc.rotation.set(0, 0, (Math.random() - 0.5) * 0.4);
    this.body.add(sc); this.dents.push(sc);
    // leve amassado no corpo (escala irregular, só visual)
    // (sem deformar/encolher a carroceria: o carro continua inteiro e andando normal)
  }
  setupBeams() {
    if (this.fakeBeam || this.spec.boat || this.type === 'heli') return;
    // feixe falso barato: cone aberto com ponta no farol, gradiente que some à frente, sem neblina
    if (!BEAM_TEX) {
      const c = document.createElement('canvas'); c.width = 4; c.height = 64; const g = c.getContext('2d');
      const gr = g.createLinearGradient(0, 0, 0, 64); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 4, 64); BEAM_TEX = new THREE.CanvasTexture(c);
    }
    const L = 16;
    const geom = new THREE.ConeGeometry(2.2, L, 10, 1, true).translate(0, -L / 2, 0); // ponta em y=0, base em y=-L
    const mat = new THREE.MeshBasicMaterial({ color: 0xfff1d0, map: BEAM_TEX, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false });
    const cone = new THREE.Mesh(geom, mat);
    cone.rotation.x = -Math.PI / 2; // -Y vira +Z: a base aberta vai para a frente do carro
    cone.position.set(0, 0.62, (this.spec.len || 4) * 0.5);
    cone.visible = false; cone.renderOrder = 2; this.root.add(cone);
    this.fakeBeam = cone; this._beamM = mat;
  }
  setupTailGlow() {
    if (this.tailGlow !== undefined) return;
    this.tailGlow = null; const tm = this.tailMesh; if (!tm || !tm.parent || !tm.geometry) return;
    if (!TAIL_TEX) {
      const c = document.createElement('canvas'); c.width = 64; c.height = 32; const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 16, 0, 32, 16, 30); gr.addColorStop(0, 'rgba(255,60,50,1)'); gr.addColorStop(0.35, 'rgba(255,20,20,.55)'); gr.addColorStop(1, 'rgba(255,0,0,0)');
      g.fillStyle = gr; g.fillRect(0, 0, 64, 32); TAIL_TEX = new THREE.CanvasTexture(c);
    }
    tm.geometry.computeBoundingBox(); const b = tm.geometry.boundingBox;
    const w = Math.max(0.5, b.max.x - b.min.x) + 1.3, h = Math.max(0.42, (b.max.y - b.min.y) * 4 + 0.5);
    const m = new THREE.MeshBasicMaterial({ color: 0xff2a1a, map: TAIL_TEX, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
    const q = new THREE.Mesh(new THREE.PlaneGeometry(w, h).rotateY(Math.PI), m);
    q.position.set((b.max.x + b.min.x) / 2, (b.max.y + b.min.y) / 2, b.min.z - 0.07); q.renderOrder = 2; q.visible = false;
    tm.parent.add(q); this.tailGlow = q; this._tgM = m;
  }
  ensureSpot() {
    if (this.spot) return this.spot;
    if (this.spec.boat || this.type === 'heli') return null;
    const s = new THREE.SpotLight(0xfff4dc, 0, 70, Math.PI / 9, 0.42, 0.55);
    s.position.set(0, 0.85, (this.spec.len || 4) * 0.48);
    const t = new THREE.Object3D(); t.position.set(0, 0.15, 48);
    this.root.add(s, t); s.target = t;
    this.spot = s; this.spotTgt = t; return s;
  }
  updateBeams(night, isPlayer, high) {
    if (this.spec.boat || this.type === 'heli') return;
    this.setupBeams();
    const on = night > 0.32;
    if (this.fakeBeam) {
      const op = !on ? 0 : isPlayer ? (high ? 0.17 : 0.11) : 0.06;
      this._beamM.opacity = op;
      this.fakeBeam.visible = op > 0.03;
      const sL = isPlayer ? (high ? 3.0 : 1.7) : 1, sW = isPlayer ? (high ? 1.35 : 1.1) : 1;
      this.fakeBeam.scale.set(sW, sL, sW);
    }
    this.setupTailGlow();
    if (this.tailGlow) {
      const op = on ? (this.brakeOn ? 0.95 : 0.55) : (this.brakeOn ? 0.3 : 0);
      this._tgM.opacity = op; this.tailGlow.visible = op > 0.02;
      const k = this.brakeOn ? 1.25 : 1; this.tailGlow.scale.set(k, k, 1);
    }
    if (isPlayer && on) {
      const s = this.ensureSpot();
      if (s) {
        // farol potente: baixo já ilumina a rua; alto alcança longe
        s.intensity = (high ? 520 : 150) * Math.min(1, night * 1.3);
        s.angle = high ? Math.PI / 7 : Math.PI / 8.5;
        s.distance = high ? 240 : 115;
        if (this.spotTgt) this.spotTgt.position.z = high ? 110 : 60;
        s.visible = true;
      }
    } else if (this.spot) { this.spot.intensity = 0; this.spot.visible = false; }
  }
  sync(dt) {
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(this.pitch, 0, this.roll); this.body.position.y = this.bob;
    for (const w of this.wheels) w.rotation.x = this.spin;
    for (const f of this.front) f.rotation.y = -this.steer * this.spec.steer * 0.9;
    if (this.tailMesh) this.tailMesh.scale.setScalar(this.brakeOn ? 1.25 : 1);
    if (this.flames) { const on = this.boosting; const L = (this.spec.race ? 1.5 : 1) * (0.7 + (this.nStage || 1) * 0.15); for (const f of this.flames) { f.visible = on; if (on) { const k = (0.75 + Math.random() * 0.6) * L; f.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.3, k); } } }
  }
  dispose(scene) {
    scene.remove(this.root);
    if (this.glowMats) for (const m of this.glowMats) GLOW_MATS.delete(m);
    if (this.decalMat) { this.decalMat.map.dispose(); this.decalMat.dispose(); }
    if (this.numMat) { this.numMat.map.dispose(); this.numMat.dispose(); }
    if (this.flameMats) for (const m of this.flameMats) m.dispose();
    if (this.glowPlane && !this.spec.race) this.glowPlane.geometry.dispose();
  }
}
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry(); const A = a.index ? a.toNonIndexed() : a, B = b.index ? b.toNonIndexed() : b;
  for (const k of ['position', 'normal', 'uv']) { const x = A.attributes[k], y = B.attributes[k]; const arr = new Float32Array(x.array.length + y.array.length); arr.set(x.array); arr.set(y.array, x.array.length); g.setAttribute(k, new THREE.BufferAttribute(arr, x.itemSize)); }
  return g;
}
