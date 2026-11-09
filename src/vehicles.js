// Veículos: modelos próprios (procedurais) e física arcade
import * as THREE from 'three';
import { clamp, lerp, angDiff, MeshBuilder, C, canvasTex } from './util.js';
import { groundY, surfaceY, drivable, boatable, collide, WATER_Y, inSwamp, roadAt } from './world.js';
import { waveH } from './env.js';

export const SPECS = {
  sport: { name: 'Esportivo Vento GT', len: 4.5, w: 1.95, max: 58, acc: 15, brake: 28, grip: 7.5, steer: 0.55, wb: 2.6, wr: 0.34, cam: 6.5, susp: 0.03, colors: [0xff2d55, 0xffd60a, 0x0a84ff, 0xffffff, 0x30d158, 0xff9f0a, 0x111111] },
  classic: { name: 'Besouro Clássico', len: 4.0, w: 1.6, max: 34, acc: 6.5, brake: 18, grip: 5.5, steer: 0.62, wb: 2.4, wr: 0.33, cam: 6, susp: 0.07, colors: [0x7fd6e8, 0xf4c2c2, 0xfff3b0, 0x9be89b, 0xe85d5d, 0xf5f0e6, 0x3a5fcd] },
  suv: { name: 'SUV Costa', len: 4.9, w: 2.0, max: 44, acc: 9.5, brake: 24, grip: 5.2, steer: 0.5, wb: 2.9, wr: 0.42, cam: 7.8, susp: 0.06, colors: [0x1c1c1e, 0xf2f2f7, 0x8e8e93, 0x2c4a6e, 0x6e2c2c, 0xd4c5a0] },
  sedan: { name: 'Sedã Urbano', len: 4.7, w: 1.85, max: 46, acc: 9.5, brake: 24, grip: 6.2, steer: 0.55, wb: 2.75, wr: 0.34, cam: 7, susp: 0.05, colors: [0xc7c7cc, 0x34495e, 0x8e2c3c, 0xf5f5f5, 0x22313f, 0x7a8a5a] },
  taxi: { name: 'Táxi Solara', len: 4.7, w: 1.85, max: 46, acc: 9.5, brake: 24, grip: 6.2, steer: 0.55, wb: 2.75, wr: 0.34, cam: 7, susp: 0.05, colors: [0xffc400] },
  moto: { name: 'Moto Brisa 600', len: 2.1, w: 0.8, max: 56, acc: 17, brake: 26, grip: 8, steer: 0.7, wb: 1.4, wr: 0.32, cam: 5, susp: 0.04, colors: [0xff2d55, 0x0a84ff, 0x111111, 0xffffff, 0x30d158] },
  boat: { name: 'Lancha Maré Alta', len: 6.2, w: 2.3, max: 30, acc: 7, brake: 6, grip: 1.3, steer: 0.9, wb: 3, wr: 0, cam: 10, susp: 0, colors: [0xffffff], boat: true },
};
const PROFILES = {
  sport: { lower: [[-2.25, 0.3], [2.2, 0.3], [2.32, 0.5], [2.26, 0.66], [1.0, 0.86], [-1.9, 0.93], [-2.3, 0.86]], glass: [[0.98, 0.86], [0.02, 1.2], [-0.95, 1.22], [-1.88, 0.93]], roof: [-0.92, 0.0, 1.22], gw: 0.3 },
  sedan: { lower: [[-2.3, 0.32], [2.25, 0.32], [2.36, 0.55], [2.27, 0.84], [1.1, 0.95], [-1.62, 0.98], [-2.32, 0.94], [-2.38, 0.6]], glass: [[1.08, 0.95], [0.25, 1.42], [-0.98, 1.43], [-1.6, 0.98]], roof: [-0.95, 0.22, 1.43], gw: 0.22 },
  suv: { lower: [[-2.42, 0.45], [2.36, 0.45], [2.46, 0.72], [2.4, 1.06], [1.5, 1.15], [-2.42, 1.2], [-2.46, 0.72]], glass: [[1.46, 1.15], [0.8, 1.76], [-2.3, 1.78], [-2.4, 1.2]], roof: [-2.32, 0.78, 1.78], gw: 0.16 },
  classic: { lower: [[-1.95, 0.33], [1.9, 0.33], [2.04, 0.55], [1.86, 0.78], [0.72, 0.95], [-1.3, 0.95], [-1.86, 0.84], [-2.0, 0.55]], glass: [[0.68, 0.95], [0.18, 1.36], [-0.42, 1.46], [-1.0, 1.36], [-1.32, 0.95]], roof: [-0.7, 0.1, 1.45], gw: 0.2 },
};
PROFILES.taxi = PROFILES.sedan;

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
export const TUNE_NAMES = ['SOLARA RUSH', 'NEON KINGS', 'BRISA TURBO', 'ONDA 88', 'LUAR GT', 'FAROL RACING', 'PULSO NOTURNO', 'TUCANO TURBO', 'MARÉ ALTA', 'VENTO SUL'];
export const TUNABLE = ['sport', 'sedan', 'classic', 'suv', 'taxi'];
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
    const grd = g.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, h * 0.5);
    grd.addColorStop(0, 'rgba(255,255,255,1)'); grd.addColorStop(0.45, 'rgba(255,255,255,.75)'); grd.addColorStop(1, 'rgba(255,255,255,0)');
    g.save(); g.scale(1, 1); g.fillStyle = grd; g.fillRect(0, 0, w, h); g.restore();
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
function setGlow(gm, sm, night) { gm.opacity = 0.28 + night * 0.72; sm.color.set(sm.userData.base).multiplyScalar(0.8 + night * 2.2); }

export class Vehicle {
  constructor(type, scene, Q, color, tune) {
    const S = shared(Q); this.type = type; this.spec = SPECS[type]; const sp = this.spec;
    if (tune && !PROFILES[type]) tune = null; this.tune = tune || null; if (tune) color = tune.paint;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    this.color = color ?? sp.colors[Math.floor(Math.random() * sp.colors.length)];
    const paint = S.paint(this.color); this.wheels = []; this.front = [];
    const shadow = Q.level !== 'low';
    if (PROFILES[type]) {
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
      if (type === 'suv') this.body.add(new THREE.Mesh(cached('rr', () => { const a = new THREE.BoxGeometry(0.06, 0.06, 2.6).translate(-0.7, 1.86, -0.7); const b = new THREE.BoxGeometry(0.06, 0.06, 2.6).translate(0.7, 1.86, -0.7); return mergeTwo(a, b); }), S.chrome));
      const ww = type === 'suv' ? 0.3 : 0.24;
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
      for (const sz of [1, -1]) { const pivot = new THREE.Group(); pivot.position.set(0, sp.wr, sz * sp.wb / 2 * 0.95); const wh = wheel(S, sp.wr, 0.16); pivot.add(wh); g.add(pivot); this.wheels.push(wh); if (sz > 0) this.front.push(pivot); }
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
    const thr = inp.y;
    let surf = 1, offroad = false;
    if (!sp.boat) {
      const gy = groundY(this.x, this.z); const rd = roadAt(this.x, this.z);
      offroad = rd.d > rd.seg.w + 4.5;
      if (this.x > 324 && this.x < 400) surf = 0.55; else if (inSwamp(this.x, this.z)) surf = 0.6; else if (offroad) surf = 0.85;
      if (gy < -6) surf = 0.3;
    }
    // nitro (só carros tunados)
    this.boosting = !!(this.tune && inp.nitro && this.nitro > 0.02 && thr > 0.05 && vf > 1);
    if (this.tune) { if (this.boosting) this.nitro = Math.max(0, this.nitro - dt / 3); else this.nitro = Math.min(1, this.nitro + dt * (this.drift > 3.5 ? 1 / 5 : 1 / 16)); }
    const boost = this.boosting ? 1 : 0; const max = sp.max * surf * (1 + boost * 0.32); const acc = sp.acc * (1 + boost * 1.4);
    if (thr > 0.05) { if (vf < -0.5) vf = Math.min(0, vf + sp.brake * dt); else vf += acc * thr * Math.max(0, 1 - (vf / max) ** 2) * dt + boost * 4 * dt; }
    else if (thr < -0.05) { if (vf > 0.5) vf = Math.max(0, vf - sp.brake * -thr * dt); else vf = Math.max(-max * 0.3, vf - sp.acc * 0.6 * -thr * dt); }
    else { const c = (sp.boat ? 2.5 : 2.2) * dt; vf = Math.abs(vf) < c ? 0 : vf - Math.sign(vf) * c; }
    if (inp.hb) vf -= Math.sign(vf) * Math.min(Math.abs(vf), (sp.boat ? 4 : 9) * dt);
    if (vf > max) vf = lerp(vf, max, dt * 2);
    this.brakeOn = thr < -0.05 && vf > 0.5 || inp.hb;
    this.steer += (inp.x - this.steer) * Math.min(1, dt * (sp.boat ? 3 : 7));
    let yaw;
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
      if (inp.hb) { gripK = Math.min(gripK, 1.2 / sp.grip); yaw *= 1.35; yawK = 3; } // freio de mão: drift
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
    const grip = (sp.boat ? sp.grip : sp.grip * gripK * 2.5) * (sp.boat ? 1 : surf > 0.6 ? 1 : 0.7);
    const vl0 = vl; vl *= Math.exp(-grip * dt);
    if (!sp.boat) vf -= Math.sign(vf) * Math.min(Math.abs(vf), Math.abs(vl0 - vl) * 0.12); // escorregar de lado custa um pouco de velocidade
    this.drift = Math.abs(vl);
    const [nfx, nfz] = this.fwd(); const nrx = -nfz, nrz = nfx;
    this.vx = nfx * vf + nrx * vl; this.vz = nfz * vf + nrz * vl; this.vf = vf;
    const px = this.x, pz = this.z;
    this.x += this.vx * dt; this.z += this.vz * dt;
    // limites de terreno
    const ok = sp.boat ? (x, z) => boatable(x, z) : (x, z) => drivable(x, z);
    let impact = 0;
    const cs = this.circles();
    if (!ok(this.x, this.z) || !ok(cs[0][0], cs[0][1]) || !ok(cs[1][0], cs[1][1])) {
      impact = this.speed; this.x = px; this.z = pz; this.vx *= -0.25; this.vz *= -0.25; this.vf *= -0.25;
    }
    // colisões com prédios/objetos (2 círculos)
    for (let k = 0; k < 2; k++) {
      const c = this.circles()[k]; const pos = { x: c[0], z: c[1] };
      const hit = collide(pos, this.r, sp.boat, this.y + 0.3);
      if (hit) { const dx = pos.x - c[0], dz = pos.z - c[1]; this.x += dx; this.z += dz; impact = Math.max(impact, this.bounce(hit.x, hit.z)); }
    }
    // outros veículos
    for (const o of others) {
      if (o === this || o.spec.boat !== sp.boat) continue;
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
      const pitchT = Math.atan2(yr - yf, sp2.wb) * 1 + clamp(acc, -24, 20) * sp2.susp * 0.024;
      const latA = yaw * vf; const rollT = this.type === 'moto' ? 0 : clamp(latA, -25, 25) * sp2.susp * 0.014;
      const yN = Math.max(yc, -0.4); if (this._py !== undefined && Math.abs(yN - this._py) > 0.08 && Math.abs(vf) > 3) { this.pv = (this.pv || 0) + (yN - this._py) * Math.sign(vf) * -4; this.bv = (this.bv || 0) + Math.abs(yN - this._py) * 1.5; } this._py = yN;
      const Kp = 140, Cp = 13; this.pv = (this.pv || 0) + ((pitchT - this.pitch) * Kp - (this.pv || 0) * Cp) * dt; this.pitch += this.pv * dt;
      if (this.type !== 'moto') { this.rv = (this.rv || 0) + ((rollT - this.roll) * Kp - (this.rv || 0) * Cp) * dt; this.roll += this.rv * dt; }
      if (this.type === 'moto') this.roll = lerp(this.roll, clamp(-yaw * Math.abs(vf) * 0.03, -0.6, 0.6), Math.min(1, dt * 5));
      this.bv = (this.bv || 0) + (-(this.bobS || 0) * 180 - (this.bv || 0) * 12) * dt; this.bobS = (this.bobS || 0) + this.bv * dt;
      if (offroad && Math.abs(vf) > 3) this.bob = this.bobS + Math.sin(t * 22) * 0.012 * Math.min(1, Math.abs(vf) / 15) * (this.type === 'suv' ? 0.5 : 1);
      else this.bob = this.bobS + (this.bob - this.bobS) * 0.9;
    }
    this.spin += vf * dt / (sp.wr || 1);
    this.rpm = clamp(Math.abs(vf) / sp.max, 0, 1);
    this.sync(dt);
    return impact;
  }
  bounce(nx, nz) {
    const vn = this.vx * nx + this.vz * nz; if (vn >= 0) return 0;
    this.vx -= 1.35 * vn * nx; this.vz -= 1.35 * vn * nz; this.vx *= 0.75; this.vz *= 0.75;
    const [fx, fz] = this.fwd(); this.vf = this.vx * fx + this.vz * fz; this.hitT = 0.3; return -vn;
  }
  sync(dt) {
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(this.pitch, 0, this.roll); this.body.position.y = this.bob;
    for (const w of this.wheels) w.rotation.x = this.spin;
    for (const f of this.front) f.rotation.y = -this.steer * this.spec.steer * 0.9;
    if (this.tailMesh) this.tailMesh.scale.setScalar(this.brakeOn ? 1.25 : 1);
    if (this.flames) { const on = this.boosting; for (const f of this.flames) { f.visible = on; if (on) { const k = 0.75 + Math.random() * 0.6; f.scale.set(1 + Math.random() * 0.3, 1 + Math.random() * 0.3, k); } } }
  }
  dispose(scene) {
    scene.remove(this.root);
    if (this.glowMats) for (const m of this.glowMats) GLOW_MATS.delete(m);
    if (this.decalMat) { this.decalMat.map.dispose(); this.decalMat.dispose(); }
    if (this.glowPlane) this.glowPlane.geometry.dispose();
  }
}
function mergeTwo(a, b) {
  const g = new THREE.BufferGeometry(); const A = a.index ? a.toNonIndexed() : a, B = b.index ? b.toNonIndexed() : b;
  for (const k of ['position', 'normal', 'uv']) { const x = A.attributes[k], y = B.attributes[k]; const arr = new Float32Array(x.array.length + y.array.length); arr.set(x.array); arr.set(y.array, x.array.length); g.setAttribute(k, new THREE.BufferAttribute(arr, x.itemSize)); }
  return g;
}
