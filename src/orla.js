// Orla viva (t386): calçadão em ondas, postos salva-vidas variados, academia ao ar livre que o jogador usa (supino, barra e corrida
// com minijogo, recordes e recompensa), arena de futebol de areia e clube de tênis com figurantes jogando, roda do pôr do sol,
// músicos de rua e pedidos dos frequentadores. Tudo original, sem marcas; instanciado e só animado com a câmera perto da praia.
import * as THREE from 'three';
import { rng, C, canvasTex } from './util.js';
import { WATER_Y, groundY, addBox, HOOKS } from './world.js';
import { partGeos, poseFor } from './people.js';

// ---- tema (a versão Neon troca só este bloco)
const THEME = {
  neon: false,
  N: { walk: 'Calçadão Onda', gym: 'Academia Muscle Solara', soccer: 'Arena de Futebol de Areia', tennis: 'Clube de Tênis Brisa', sunset: 'Roda do Pôr do Sol', music: 'Músico de rua', teamA: 'CORAL', teamB: 'TURQUESA', instr: '🎸', money: '$' },
  walk: [0xf6ead5, 0xf0a6b8], dune: 0x5f8f4a, mat: 0x2f6b4f, steel: 0xd8dde3, accent: 0xff6fa6, plate: 0x222222,
  teamA: 0xff4f6d, teamB: 0x2ab3b8, ball: 0xffffff, court: 0x2f6fb5, courtOut: 0x3f8f5a, line: 0xffffff, tball: 0xd8ff3c, fence: 0x2a4a3a,
  roofs: [0xff6fa6, 0x2ab3b8, 0xffd23f, 0x7d6cf0, 0xff8a3c, 0x46c08c], lamp: 0xfff1c4, lantern: 0xffb347,
  signFg: '#ff4f8b', signBg: '#fff6e8', glow: 0, // brilho emissivo extra das linhas (Neon)
  open: [7, 20.5], tennisOpen: [6.5, 22], lights: [18, 23], sunset: [17.3, 19.8], music: [9, 22],
};
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b3e26, 0xd9a066];
const HAIR = [0x1a1110, 0x3b2314, 0x6a4e2a, 0xd8b26e, 0x111111, 0x8a3b12];
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _v = new THREE.Vector3(), _z = new THREE.Matrix4().makeScale(0, 0, 0);
const inH = (h, [a, b]) => a < b ? h >= a && h < b : h >= a || h < b;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const GYM = { x: 346, z: 95 }, SOC = { x: 356, z: -210, hw: 10, hl: 19 }, TEN = { x: 353, z: 464 }, SUN = { x: 372, z: -60 };
const RUN = { x: 368, z0: 105, len: 150 }; // corrida na areia firme, rumo ao sul (sem cruzar a quadra de vôlei)

// chão que acompanha o declive da areia
function drape(w, d, cx, cz, lift, mat, seg = 6) {
  const g = new THREE.PlaneGeometry(w, d, seg, seg).rotateX(-Math.PI / 2); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setY(i, groundY(cx + p.getX(i), cz + p.getZ(i)) + lift);
  g.computeVertexNormals(); const m = new THREE.Mesh(g, mat); m.position.set(cx, 0, cz); return m;
}
function label(text, opts = {}) {
  const w = opts.w || 512, h = opts.h || 128;
  const t = canvasTex(w, h, (g) => { g.fillStyle = opts.bg || THEME.signBg; g.fillRect(0, 0, w, h); g.strokeStyle = opts.fg || THEME.signFg; g.lineWidth = 10; g.strokeRect(5, 5, w - 10, h - 10); g.fillStyle = opts.fg || THEME.signFg; g.font = `900 ${opts.size || 54}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, w / 2, h / 2 + 2); }, { clamp: true });
  return t;
}
// placa de dois lados (texto legível dos dois lados, sem espelhar)
function sign(tex, w, h) { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ map: tex }); const a = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m), b = a.clone(); b.rotation.y = Math.PI; b.position.z = -0.01; g.add(a, b); return g; }
function emojiSprite(ch, s = 1.2) {
  const t = canvasTex(128, 128, (g) => { g.font = '96px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ch, 64, 70); }, { clamp: true });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: true, transparent: true })); sp.scale.set(s, s, s); return sp;
}

// figurantes instanciados (mesmas peças do povo da cidade)
class Crew {
  constructor(parent, n) {
    const P = partGeos(); const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 }); this.n = n;
    const mk = (g, c) => { const im = new THREE.InstancedMesh(g, mat, c); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); parent.add(im); for (let i = 0; i < c; i++) im.setMatrixAt(i, _z); return im; };
    this.torso = mk(P.torso, n); this.head = mk(P.head, n); this.hair = mk(P.hair, n); this.legs = mk(P.leg, n * 2); this.arms = mk(P.arm, n * 2);
    this.parts = [this.torso, this.head, this.hair, this.legs, this.arms];
  }
  color(i, shirt, skin, hair, legs) { const s = C(skin); this.torso.setColorAt(i, C(shirt)); this.head.setColorAt(i, s); this.hair.setColorAt(i, C(hair)); this.legs.setColorAt(i * 2, C(legs)); this.legs.setColorAt(i * 2 + 1, C(legs)); this.arms.setColorAt(i * 2, s); this.arms.setColorAt(i * 2 + 1, s); }
  hide(i) { this.torso.setMatrixAt(i, _z); this.head.setMatrixAt(i, _z); this.hair.setMatrixAt(i, _z); for (const k of [0, 1]) { this.legs.setMatrixAt(i * 2 + k, _z); this.arms.setMatrixAt(i * 2 + k, _z); } }
  // escreve a pose; devolve a matriz do corpo (para prender bola, raquete, barra…)
  set(i, x, y, z, h, pose, scale = 1) {
    _e.set(pose.lie ? -Math.PI / 2 : pose.lean || 0, h, 0, 'YXZ'); _q.setFromEuler(_e); _p.set(x, y + (pose.lie ? 0.14 : pose.yOff || 0), z); _s.setScalar(scale); _b.compose(_p, _q, _s); if (pose.lie) _b.multiply(_m.makeTranslation(0, -0.9, 0));
    this.torso.setMatrixAt(i, _b); this.head.setMatrixAt(i, _b); this.hair.setMatrixAt(i, _b);
    for (const [k, sx, ang] of [[0, -0.1, pose.legL], [1, 0.1, pose.legR]]) { _m.makeRotationX(ang).setPosition(sx, 0.93, 0); this.legs.setMatrixAt(i * 2 + k, _m.premultiply(_b)); }
    for (const [k, sx, ang] of [[0, -0.27, pose.armL], [1, 0.27, pose.armR]]) { _m.makeRotationX(ang).setPosition(sx, 1.49, 0); this.arms.setMatrixAt(i * 2 + k, _m.premultiply(_b)); }
    return _b;
  }
  flush() { for (const m of this.parts) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; } }
}
const handPos = (B, a, side = 1) => _v.set(0.27 * side, 1.49 - 0.6 * Math.cos(a), -0.6 * Math.sin(a)).applyMatrix4(B);

export class Orla {
  constructor(G, scene, Q) {
    this.G = G; this.Q = Q; const lvl = Q.level; this.k = lvl === 'low' ? 0 : lvl === 'medium' ? 1 : 2; const N = (a) => a[this.k];
    this.r = rng(3866); this.t = 0; this.visible = true; this.root = new THREE.Group(); scene.add(this.root); this.scene = scene;
    const S = G.save; S.orla = Object.assign({ forca: 1, folego: 1, best: { supino: 0, barra: 0, corrida: 0 }, treinos: 0, quests: 0, roda: -1, gorjetas: 0 }, S.orla || {});
    this.st = S.orla; this.st.best = Object.assign({ supino: 0, barra: 0, corrida: 0 }, this.st.best);
    this.spots = []; this.focus = null; this.game = null; this.day = 0; this._lastH = null;
    this.buildWalk(N); this.buildTowers(); this.buildGym(N); this.buildSoccer(N); this.buildTennis(); this.buildSunset(N); this.buildMusic(); this.buildQuests();
    this.crew = new Crew(this.root, this.figs.length); this.figs.forEach((f, i) => { f.i = i; this.crew.color(i, f.shirt, f.skin, f.hair, f.legs); }); this.crew.flush();
    this.ui(); this.mapHook();
  }
  get figs() { return this._figs || (this._figs = []); }
  fig(o) { const r = this.r; const f = Object.assign({ x: 0, z: 0, h: 0, ph: r() * 6, scale: 0.92 + r() * 0.14, skin: SKIN[Math.floor(r() * SKIN.length)], hair: HAIR[Math.floor(r() * HAIR.length)], shirt: 0xffffff, legs: 0x2b3a55, mode: 'idle', amt: 0 }, o); f.legs = o.legs != null ? o.legs : f.skin; this.figs.push(f); return f; }

  // ---------- calçadão em ondas + vegetação de duna
  buildWalk(N) {
    const xs = (z) => 329 + Math.sin(z / 37) * 1.3 + Math.sin(z / 11) * 0.35;
    const L = 1280, segs = 320, W = 3.4; const pos = [], uv = [], idx = [];
    for (let i = 0; i <= segs; i++) { const z = -640 + L * i / segs, c = xs(z); for (const s of [-1, 1]) { const x = c + s * W / 2; pos.push(x, groundY(x, z) + 0.04, z); uv.push(s < 0 ? 0 : 1, z / 6); } if (i < segs) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const [c0, c1] = THEME.walk; const hex = (c) => '#' + c.toString(16).padStart(6, '0');
    const tex = canvasTex(128, 256, (x, w, h) => { x.fillStyle = hex(c0); x.fillRect(0, 0, w, h); x.strokeStyle = hex(c1); x.lineWidth = 14; for (let k = -1; k < 4; k++) { x.beginPath(); for (let y = 0; y <= w; y += 4) { const yy = k * 64 + 32 + Math.sin(y / w * Math.PI * 2) * 18; y === 0 ? x.moveTo(y, yy) : x.lineTo(y, yy); } x.stroke(); } });
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, emissive: THEME.glow ? C(c1) : C(0), emissiveIntensity: THEME.glow ? 0.25 : 0 });
    const walk = new THREE.Mesh(g, mat); walk.receiveShadow = true; this.root.add(walk); this.walkX = xs;
    // tufos de vegetação de duna (uvas-da-praia e capim) entre o calçadão e a areia
    const n = N([90, 160, 240]); const bush = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.7, 0), new THREE.MeshStandardMaterial({ color: THEME.dune, roughness: 0.95, flatShading: true }), n); const r = this.r;
    let k = 0; for (let i = 0; i < n * 2 && k < n; i++) { const z = -630 + r() * 1260, x = xs(z) + 2.4 + r() * 1.6; if (this.blocked(x, z)) continue; const s = 0.5 + r() * 0.8; _m.makeScale(s * (1 + r() * 0.6), s * 0.55, s).setPosition(x, groundY(x, z) + 0.12, z); bush.setMatrixAt(k, _m); bush.setColorAt(k, C(THEME.dune).offsetHSL((r() - 0.5) * 0.06, 0, (r() - 0.5) * 0.12)); k++; }
    bush.count = k; this.root.add(bush);
    // sinalização do calçadão
    const st = label(THEME.N.walk);
    for (const z of [-400, 0, 380]) { const x = xs(z) - 2.3; const pl = sign(st, 2.6, 0.65); pl.position.set(x, groundY(x, z) + 2.1, z); pl.rotation.y = Math.PI / 2; this.root.add(pl); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.1, 6), new THREE.MeshStandardMaterial({ color: THEME.steel })); p.position.set(x, groundY(x, z) + 1.05, z); this.root.add(p); }
  }
  blocked(x, z) { // zonas da orla + carrinhos/postos
    const K = [[GYM.x, GYM.z, 11, 10], [SOC.x, SOC.z, 12, 23], [TEN.x, TEN.z, 17, 18], [SUN.x, SUN.z, 8, 8]];
    return K.some(([a, b, w, l]) => Math.abs(x - a) < w && Math.abs(z - b) < l) || [[336, -205], [336, 65], [336, 335]].some(([a, b]) => Math.abs(x - a) < 2 && Math.abs(z - b) < 2.5);
  }
  // ---------- postos salva-vidas: telhados arredondados coloridos, rampa e bandeira (cada um diferente)
  buildTowers() {
    const zs = []; for (let z = -560; z <= 560; z += 140) zs.push(z); const n = zs.length;
    const roof = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.95, 1.95, 3.9, 14, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2).rotateX(0), new THREE.MeshStandardMaterial({ roughness: 0.5, emissive: THEME.glow ? 0xffffff : 0, emissiveIntensity: THEME.glow ? 0.12 : 0 }), n);
    const ramp = new THREE.InstancedMesh(new THREE.BoxGeometry(4.2, 0.12, 1.1), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8 }), n);
    const band = new THREE.InstancedMesh(new THREE.BoxGeometry(0.08, 0.32, 3.24), new THREE.MeshStandardMaterial({ roughness: 0.6 }), n * 3);
    const pole = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.04, 0.04, 2.4, 5), new THREE.MeshStandardMaterial({ color: 0xffffff }), n);
    const flag = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.9, 0.55).translate(0.45, 0, 0), new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.7 }), n); this.flags = flag; this.flagZ = zs;
    zs.forEach((z, i) => { const x = 352, y = groundY(x, z); const R = THEME.roofs, c = R[(i * 5 + 2) % R.length], c2 = R[(i * 5 + 4) % R.length];
      _m.makeScale(1, 0.55 + (i % 3) * 0.12, 1).setPosition(x, y + 6.1, z); roof.setMatrixAt(i, _m); roof.setColorAt(i, C(c));
      _m.makeRotationZ(0.62).setPosition(x - 3.4, y + 1.5, z + (i % 2 ? 0.9 : -0.9)); ramp.setMatrixAt(i, _m);
      for (let k = 0; k < 3; k++) { _m.makeTranslation(x - 1.62, y + 3.7 + k * 0.55, z); band.setMatrixAt(i * 3 + k, _m); band.setColorAt(i * 3 + k, C(k % 2 ? 0xffffff : c2)); }
      _m.makeTranslation(x + 1.5, y + 7.6, z + 1.5); pole.setMatrixAt(i, _m); _m.makeTranslation(x + 1.5, y + 8.5, z + 1.5); flag.setMatrixAt(i, _m); flag.setColorAt(i, C([0xffd23f, 0xff4f6d, 0x46c08c][i % 3])); });
    this.root.add(roof, ramp, band, pole, flag);
  }
  // ---------- academia ao ar livre
  buildGym(N) {
    const x0 = GYM.x, z0 = GYM.z, y0 = groundY(x0, z0), r = this.r; const R = this.root;
    const steel = new THREE.MeshStandardMaterial({ color: THEME.steel, metalness: 0.6, roughness: 0.35 }); const acc = new THREE.MeshStandardMaterial({ color: THEME.accent, roughness: 0.5, emissive: THEME.glow ? C(THEME.accent) : C(0), emissiveIntensity: THEME.glow ? 0.6 : 0 });
    const plate = new THREE.MeshStandardMaterial({ color: THEME.plate, roughness: 0.6 });
    R.add(drape(20, 16, x0, z0, 0.05, new THREE.MeshStandardMaterial({ color: THEME.mat, roughness: 0.95 })));
    const gy = (x, z) => groundY(x, z) + 0.05;
    const bar = (x, z, h, rad = 0.06, m = steel) => { const c = new THREE.Mesh(new THREE.CylinderGeometry(rad, rad, h, 8), m); c.position.set(x, gy(x, z) + h / 2, z); R.add(c); return c; };
    const beam = (x, y, z, len, axis, rad = 0.05, m = steel) => { const g = new THREE.CylinderGeometry(rad, rad, len, 8); if (axis === 'x') g.rotateZ(Math.PI / 2); else g.rotateX(Math.PI / 2); const c = new THREE.Mesh(g, m); c.position.set(x, y, z); R.add(c); return c; };
    // estações: supino (banco + suportes + barra), barra fixa, largada da corrida
    this.st_bench = { x: x0 - 6, z: z0 + 4 }; this.st_pull = { x: x0, z: z0 + 4 }; this.st_run = { x: x0 + 7, z: z0 + 4 };
    { const { x, z } = this.st_bench; const y = gy(x, z); const b = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.12, 0.38), new THREE.MeshStandardMaterial({ color: 0x1d1d22, roughness: 0.6 })); b.position.set(x, y + 0.45, z); R.add(b); bar(x - 0.45, z, 0.42, 0.04); bar(x + 0.45, z, 0.42, 0.04);
      for (const s of [-0.55, 0.55]) bar(x - 0.62, z + s, 1.1, 0.04); addBox(x - 0.8, z - 0.7, x + 0.7, z + 0.7, 1.2);
      const bb = new THREE.Group(); bb.add(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8).rotateX(Math.PI / 2), steel)); for (const s of [-0.75, 0.75]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.07, 14).rotateX(Math.PI / 2), plate); p.position.z = s; bb.add(p); }
      bb.position.set(x - 0.62, y + 1.12, z); R.add(bb); this.barbell = bb; this.barbellRest = bb.position.clone(); }
    { const { x, z } = this.st_pull; const top = gy(x, z) + 2.45; for (const s of [-0.75, 0.75]) bar(x, z + s, 2.5, 0.06); beam(x, top, z, 1.7, 'z', 0.035); for (const s of [-0.75, 0.75]) addBox(x - 0.15, z + s - 0.15, x + 0.15, z + s + 0.15, 2.6); this.pullTop = top; }
    { const { x, z } = this.st_run; for (const s of [-1.3, 1.3]) bar(x, z + s, 2.6, 0.06, acc); const ban = sign(label('CORRIDA 150 m', { size: 46 }), 2.8, 0.6); ban.position.set(x, gy(x, z) + 2.4, z); ban.rotation.y = Math.PI / 2; R.add(ban); }
    // decoração: paralelas, argolas, pórtico com placa, anilhas no chão, segunda barra (figurantes)
    for (const s of [-0.35, 0.35]) { beam(x0 - 3, gy(x0 - 3, z0 - 4) + 1.25, z0 - 4 + s, 2.6, 'x', 0.035); for (const e of [-1.1, 1.1]) bar(x0 - 3 + e, z0 - 4 + s, 1.25, 0.035); }
    { const x = x0 + 3, z = z0 - 4, top = gy(x, z) + 3.2; for (const s of [-1.2, 1.2]) bar(x, z + s, 3.2, 0.07); beam(x, top, z, 2.5, 'z', 0.05); for (const s of [-0.3, 0.3]) { const rp = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.0, 4), steel); rp.position.set(x, top - 0.5, z + s); R.add(rp); const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.02, 6, 14), acc); ring.position.set(x, top - 1.05, z + s); R.add(ring); } }
    { const x = x0 - 9.6, z = z0; for (const s of [-3, 3]) bar(x, z + s, 3.6, 0.09, acc); const sg = sign(label(THEME.N.gym.toUpperCase(), { size: 42, w: 768 }), 6.4, 1.0); sg.position.set(x, gy(x, z) + 3.3, z); sg.rotation.y = -Math.PI / 2; R.add(sg); }
    { const x = x0 + 6, z = z0 - 4; for (const s of [-0.9, 0.9]) bar(x, z + s, 2.3, 0.05); beam(x, gy(x, z) + 2.3, z, 1.9, 'z', 0.035); this.npcPull = { x, z, top: gy(x, z) + 2.3 }; }
    for (let i = 0; i < 6; i++) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.2 + (i % 3) * 0.04, 0.2 + (i % 3) * 0.04, 0.06, 14), plate); const x = x0 + 8.5, z = z0 - 6 + i * 0.12; p.position.set(x, gy(x, z) + 0.03 + i * 0.065, z - i * 0.12); R.add(p); }
    // figurantes da academia: barra, agachamento, polichinelo, abdominal
    const kinds = [{ ex: 2, x: this.npcPull.x, z: this.npcPull.z, pull: true }, { ex: 0, x: x0 - 1, z: z0 - 1.5 }, { ex: 1, x: x0 + 2, z: z0 + 1 }, { ex: 0, x: x0 - 5, z: z0 - 5 }].slice(0, N([3, 4, 4]));
    this.gymNpc = kinds.map((k, i) => this.fig({ kind: 'gym', ex: k.ex, pull: k.pull, x: k.x, z: k.z, h: -Math.PI / 2 + (r() - 0.5) * 0.8, shirt: [0x111111, 0xff4fb8, 0x29f0ff, 0xffd23f][i % 4], legs: 0x222233 }));
    // corpo do jogador durante o treino (aparece no lugar do herói)
    this.me = this.fig({ kind: 'me', shirt: 0x1b1b1f, legs: 0x2a3550, skin: 0xe0ac69, hair: 0x1a1110, scale: 1 });
    this.spots.push(
      { id: 'supino', x: this.st_bench.x, z: this.st_bench.z, r: 2.4, on: () => true, html: () => `🏋️ <b>Supino</b> · Força ${this.lvl('forca')} · recorde ${this.st.best.supino} reps`, btn: '💪 Treinar', go: () => this.start('supino') },
      { id: 'barra', x: this.st_pull.x, z: this.st_pull.z, r: 2.2, on: () => true, html: () => `🤸 <b>Barra fixa</b> · Força ${this.lvl('forca')} · recorde ${this.st.best.barra} reps`, btn: '💪 Treinar', go: () => this.start('barra') },
      { id: 'corrida', x: this.st_run.x, z: this.st_run.z, r: 2.6, on: () => true, html: () => `🏃 <b>Corrida 150 m</b> na beira-mar · Fôlego ${this.lvl('folego')} · recorde ${this.st.best.corrida ? this.st.best.corrida.toFixed(1) + ' s' : '—'}`, btn: '🏁 Correr', go: () => this.start('corrida') });
  }
  lvl(k) { return Math.floor(this.st[k]); }
  // ---------- futebol de areia
  buildSoccer(N) {
    const { x: cx, z: cz, hw, hl } = SOC; const R = this.root; const lineM = new THREE.MeshStandardMaterial({ color: THEME.line, roughness: 0.6, emissive: THEME.glow ? C(THEME.line) : C(0), emissiveIntensity: THEME.glow ? 0.8 : 0 });
    const ln = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), lineM); m.position.set(x, groundY(x, z) + 0.03, z); R.add(m); };
    ln(hw * 2, 0.12, cx, cz - hl); ln(hw * 2, 0.12, cx, cz + hl); ln(0.12, hl * 2, cx - hw, cz); ln(0.12, hl * 2, cx + hw, cz); ln(hw * 2, 0.1, cx, cz);
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.8, 2.95, 32).rotateX(-Math.PI / 2), lineM); ring.position.set(cx, groundY(cx, cz) + 0.035, cz); R.add(ring);
    const white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 }); const netM = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
    for (const s of [-1, 1]) { const z = cz + s * hl, y = groundY(cx, z);
      for (const e of [-2.5, 2.5]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.1, 8), white); p.position.set(cx + e, y + 1.05, z); R.add(p); addBox(cx + e - 0.1, z - 0.1, cx + e + 0.1, z + 0.1, 2.1); }
      const tb = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5.1, 8).rotateZ(Math.PI / 2), white); tb.position.set(cx, y + 2.1, z); R.add(tb);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(5, 2.1), netM); back.position.set(cx, y + 1.05, z + s * 1.2); R.add(back); }
    // placar
    this.scoreCv = document.createElement('canvas'); this.scoreCv.width = 512; this.scoreCv.height = 128; this.scoreTex = new THREE.CanvasTexture(this.scoreCv); this.scoreTex.colorSpace = THREE.SRGBColorSpace;
    const sb = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: this.scoreTex, side: THREE.DoubleSide })); const sx = cx - hw - 1.6; sb.position.set(sx, groundY(sx, cz) + 3, cz); sb.rotation.y = -Math.PI / 2; R.add(sb);
    for (const s of [-1.6, 1.6]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6), white); p.position.set(sx, groundY(sx, cz) + 1.25, cz + s); R.add(p); }
    this.soc = { a: 0, b: 0, ball: { x: cx, z: cz, y: 0.11, vx: 0, vz: 0, vy: 0 }, cd: [0, 0], cel: 0, kicks: 0, goals: 0 }; this.drawScore();
    const bm = new THREE.Mesh(new THREE.IcosahedronGeometry(0.11, 1), new THREE.MeshStandardMaterial({ color: THEME.ball, roughness: 0.4, flatShading: true })); R.add(bm); this.socBall = bm;
    const per = N([4, 5, 5]); const home = [[0, -0.95], [-0.5, -0.5], [0.5, -0.5], [-0.35, 0.05], [0.35, 0.1]];
    this.players = [];
    for (const [team, col] of [[0, THEME.teamA], [1, THEME.teamB]]) for (let i = 0; i < per; i++) { const hm = home[i]; const sgn = team ? -1 : 1; this.players.push(this.fig({ kind: 'soc', team, gk: i === 0, hx: cx + hm[0] * hw * 0.8, hz: cz + sgn * hm[1] * hl, x: cx + hm[0] * hw * 0.8, z: cz + sgn * hm[1] * hl, shirt: col, legs: 0x222222 })); }
    // torcida sentada na lateral
    for (let i = 0; i < N([3, 5, 7]); i++) this.fig({ kind: 'fan', x: cx - hw - 3.2, z: cz - 12 + i * 4 + this.r() * 1.5, h: Math.PI / 2, shirt: [THEME.teamA, THEME.teamB][i % 2] });
  }
  drawScore() {
    const g = this.scoreCv.getContext('2d'), s = this.soc; g.fillStyle = '#111'; g.fillRect(0, 0, 512, 128); g.font = '900 34px system-ui, sans-serif'; g.textBaseline = 'middle';
    const hx = (c) => '#' + c.toString(16).padStart(6, '0'); g.textAlign = 'left'; g.fillStyle = hx(THEME.teamA); g.fillText(THEME.N.teamA, 16, 64); g.textAlign = 'right'; g.fillStyle = hx(THEME.teamB); g.fillText(THEME.N.teamB, 496, 64);
    g.textAlign = 'center'; g.fillStyle = '#ffe14d'; g.font = '900 60px system-ui, sans-serif'; g.fillText(`${s.a} x ${s.b}`, 256, 66); this.scoreTex.needsUpdate = true;
  }
  // ---------- clube de tênis (2 quadras, iluminadas à noite)
  buildTennis() {
    const R = this.root, { x: cx, z: cz } = TEN; this.courtMats = [new THREE.MeshStandardMaterial({ color: THEME.courtOut, roughness: 0.9, emissive: C(THEME.courtOut), emissiveIntensity: 0 }), new THREE.MeshStandardMaterial({ color: THEME.court, roughness: 0.8, emissive: C(THEME.court), emissiveIntensity: 0 })];
    R.add(drape(34, 36, cx, cz, 0.05, this.courtMats[0], 8));
    const lineM = new THREE.MeshStandardMaterial({ color: THEME.line, emissive: THEME.glow ? C(THEME.line) : C(0), emissiveIntensity: THEME.glow ? 0.8 : 0 }); const white = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const netM = new THREE.MeshStandardMaterial({ color: 0x111111, transparent: true, opacity: 0.6, side: THREE.DoubleSide });
    this.courts = [];
    for (const dz of [-8.5, 8.5]) { const z = cz + dz;
      R.add(drape(23.8, 10.97, cx, z, 0.07, this.courtMats[1], 4));
      const ln = (w, d, x, zz) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), lineM); m.position.set(x, groundY(x, zz) + 0.085, zz); R.add(m); };
      ln(0.08, 10.97, cx - 11.9, z); ln(0.08, 10.97, cx + 11.9, z); ln(23.8, 0.06, cx, z - 5.48); ln(23.8, 0.06, cx, z + 5.48); ln(23.8, 0.05, cx, z - 4.11); ln(23.8, 0.05, cx, z + 4.11); ln(0.05, 8.22, cx - 6.4, z); ln(0.05, 8.22, cx + 6.4, z); ln(12.8, 0.05, cx, z);
      const y = groundY(cx, z); const net = new THREE.Mesh(new THREE.PlaneGeometry(12.6, 0.95), netM); net.position.set(cx, y + 0.55, z); net.rotation.y = Math.PI / 2; R.add(net);
      const tape = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 12.6), white); tape.position.set(cx, y + 1.03, z); R.add(tape);
      for (const s of [-6.4, 6.4]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.07, 6), white); p.position.set(cx, y + 0.55, z + s); R.add(p); }
      this.courts.push({ z, pl: [], ball: { from: 0, u: 0, dur: 1.2, tz: z, fz: z, hits: 0, len: 6, pause: 0 }, pts: [0, 0], games: [0, 0] }); }
    // cerca baixa e torres de luz
    const fence = new THREE.MeshStandardMaterial({ color: THEME.fence, transparent: true, opacity: 0.28, side: THREE.DoubleSide, roughness: 0.9, depthWrite: false });
    for (const [w, x, z, ry] of [[34, cx, cz - 18, 0], [34, cx, cz + 18, 0], [36, cx - 17, cz, Math.PI / 2], [36, cx + 17, cz, Math.PI / 2]]) { const f = new THREE.Mesh(new THREE.PlaneGeometry(w, 1.4), fence); f.position.set(x, groundY(x, z) + 0.7, z); f.rotation.y = ry; R.add(f); }
    addBox(cx - 17.2, cz - 18.2, cx + 17.2, cz - 17.8, 1.4); addBox(cx - 17.2, cz + 17.8, cx + 17.2, cz + 18.2, 1.4); addBox(cx + 16.8, cz - 18, cx + 17.2, cz + 18, 1.4);
    this.lampM = new THREE.MeshStandardMaterial({ color: THEME.lamp, emissive: C(THEME.lamp), emissiveIntensity: 0 });
    for (const [x, z] of [[cx - 16.5, cz - 17.5], [cx + 16.5, cz - 17.5], [cx - 16.5, cz + 17.5], [cx + 16.5, cz + 17.5], [SOC.x - SOC.hw - 1, SOC.z - 17], [SOC.x - SOC.hw - 1, SOC.z + 17]]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 8, 6), white); p.position.set(x, groundY(x, z) + 4, z); R.add(p); const hd = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.3, 1.2), this.lampM); hd.position.set(x, groundY(x, z) + 8.1, z); R.add(hd); }
    const sg = sign(label(THEME.N.tennis.toUpperCase(), { size: 44, w: 640 }), 5.2, 0.85); sg.position.set(cx - 17.1, groundY(cx - 17, cz) + 2.0, cz); sg.rotation.y = -Math.PI / 2; R.add(sg);
    const tg = new THREE.SphereGeometry(0.06, 8, 6), tm = new THREE.MeshStandardMaterial({ color: THEME.tball, emissive: C(THEME.tball), emissiveIntensity: 0.25 });
    this.tballs = this.courts.map(c => { const m = new THREE.Mesh(tg, tm); R.add(m); return m; });
    const cols = [0xffffff, 0xffd23f, 0xff6fa6, 0x29f0ff];
    this.courts.forEach((c, ci) => { for (const s of [-1, 1]) c.pl.push(this.fig({ kind: 'ten', c, side: s, x: cx + s * 12.3, z: c.z, h: s > 0 ? -Math.PI / 2 : Math.PI / 2, shirt: cols[(ci * 2 + (s > 0 ? 1 : 0)) % 4], legs: 0xffffff })); });
    this.rackets = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.62, 0.24).translate(0, -0.85, 0.05), new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.5 }), 4); this.rackets.frustumCulled = false; R.add(this.rackets);
  }
  // ---------- roda do pôr do sol
  buildSunset(N) {
    const n = N([8, 12, 14]); this.roda = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2; this.roda.push(this.fig({ kind: 'roda', a, x: SUN.x + Math.cos(a) * 4.4, z: SUN.z + Math.sin(a) * 4.4, h: Math.atan2(-Math.cos(a), -Math.sin(a)), shirt: [0xffffff, 0xff8a3c, 0xffd23f, 0x2ab3b8, 0xff4f6d][i % 5], legs: null })); }
    this.drummers = [0, 1].map(k => this.fig({ kind: 'drum', x: SUN.x + (k ? 1.1 : -1.1), z: SUN.z, h: k ? -Math.PI / 2 : Math.PI / 2, shirt: k ? 0x46c08c : 0x7d6cf0 }));
    const dg = new THREE.Group(); this.root.add(dg); this.rodaStatic = dg;
    for (const d of this.drummers) { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.62, 12), new THREE.MeshStandardMaterial({ color: 0x8a5a32, roughness: 0.6 })); const x = d.x + Math.sin(d.h) * 0.5, z = d.z + Math.cos(d.h) * 0.5; m.position.set(x, groundY(x, z) + 0.31, z); dg.add(m); }
    const lm = new THREE.MeshStandardMaterial({ color: THEME.lantern, emissive: C(THEME.lantern), emissiveIntensity: 1.4 }); const lg = new THREE.SphereGeometry(0.13, 8, 6);
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2, x = SUN.x + Math.cos(a) * 6.3, z = SUN.z + Math.sin(a) * 6.3; const l = new THREE.Mesh(lg, lm); l.position.set(x, groundY(x, z) + 0.15, z); dg.add(l); }
    this.spots.push({ id: 'roda', x: SUN.x, z: SUN.z, r: 9, on: () => this.rodaOn, html: () => `🌅 <b>${THEME.N.sunset}</b> · tambores e dança na areia`, btn: '💃 Dançar', go: () => this.joinRoda() });
  }
  // ---------- músicos de rua
  buildMusic() {
    this.musos = [[321.5, -440], [321.5, 250]].map(([x, z], i) => this.fig({ kind: 'muso', x, z, h: -Math.PI / 2 + 0.3, shirt: i ? 0xffd23f : 0x2ab3b8, legs: 0x3a2f55, cd: 0, tips: 0 }));
    const R = this.root; this.guitars = [];
    for (const f of this.musos) { const g = new THREE.Group(); const body = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.09, 14).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: THEME.neon ? 0x29f0ff : 0xb5651d, roughness: 0.5, emissive: THEME.neon ? 0x29f0ff : 0, emissiveIntensity: THEME.neon ? 0.5 : 0 })); g.add(body);
      const neck = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.05, 0.03), new THREE.MeshStandardMaterial({ color: 0x3b2314 })); neck.position.x = 0.4; g.add(neck); R.add(g); this.guitars.push(g);
      const cx = f.x + Math.sin(f.h) * 1.0, cz = f.z + Math.cos(f.h) * 1.0; const cs = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.1, 1.0), new THREE.MeshStandardMaterial({ color: 0x222222 })); cs.position.set(cx, groundY(cx, cz) + 0.05, cz); cs.rotation.y = f.h; R.add(cs);
      const note = emojiSprite('🎵', 0.6); R.add(note); f.note = note; }
    this.musos.forEach((f, i) => this.spots.push({ id: 'muso' + i, x: f.x, z: f.z, r: 3.2, on: () => this.musicOn, html: () => `${THEME.N.instr} <b>${THEME.N.music}</b> · tocando na orla${f.cd > 0 ? ' · obrigado! 🙏' : ''}`, btn: `🪙 Gorjeta ${THEME.N.money}5`, go: () => this.tip(f) }));
  }
  // ---------- pedidos dos frequentadores
  buildQuests() {
    const R = this.root;
    const Qs = [
      { id: 'bola', gx: SOC.x - SOC.hw - 2.2, gz: SOC.z + 9, tx: 370.5, tz: -204, back: true, txt: 'A bola rolou lá pra beira do mar! Você busca pra gente?', got: 'Bola resgatada! Leve de volta para a arena.', end: 'Valeu! O jogo continua! ⚽', $: 60, f: 20, obj: () => new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 1), new THREE.MeshStandardMaterial({ color: THEME.ball, flatShading: true })), pick: 2.6 },
      { id: 'chinelo', gx: 362, gz: 30, sit: true, tx: 365, tz: 121, back: true, txt: 'Perdi um chinelo amarelo na areia… acha pra mim?', got: 'Achou o chinelo! Devolva para a dona.', end: 'Obrigada! Agora dá pra andar na areia quente. 🩴', $: 40, f: 12, obj: () => new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.3), new THREE.MeshStandardMaterial({ color: 0xffd23f })), pick: 2.4 },
      { id: 'coco', gx: 337.3, gz: 66.4, tx: 349.2, tz: 280, back: false, txt: 'Leva esta água de coco para o salva-vidas do posto ali adiante?', got: '', end: 'O salva-vidas agradece a água de coco! 🥥', $: 45, f: 15, obj: null, pick: 4.5 },
    ];
    this.quests = Qs.map((q, i) => { q.state = 'idle'; q.cd = 0;
      if (q.id !== 'coco') q.giver = this.fig({ kind: q.sit ? 'qsit' : 'qgiver', x: q.gx, z: q.gz, h: q.sit ? Math.PI / 2 : Math.PI / 2, shirt: [0xff8a3c, 0xff6fa6][i % 2], scale: q.sit ? 0.95 : 0.7, legs: null });
      q.mark = emojiSprite('❗', 1.0); q.mark.position.set(q.gx, groundY(q.gx, q.gz) + (q.sit ? 1.7 : 2.0) + (q.id === 'coco' ? 1.2 : 0), q.gz); R.add(q.mark);
      q.star = emojiSprite('⭐', 1.3); q.star.visible = false; R.add(q.star);
      if (q.obj) { q.o = q.obj(); q.o.visible = false; R.add(q.o); }
      this.spots.push({ id: 'q-' + q.id, x: q.gx, z: q.gz, r: 3.0, on: () => q.state === 'idle' && q.cd <= 0 || q.state === 'back', html: () => q.state === 'back' ? `🙌 Entregar para quem pediu` : `💬 “${q.txt}”`, btn: q.state === 'back' ? '🤝 Entregar' : '👍 Ajudar', go: () => this.questAct(q) });
      return q; });
  }
  // ---------- interface (cartão de ação + minijogo), estilos injetados para o módulo ficar autocontido
  ui() {
    if (!document.getElementById('orlaCss')) { const st = document.createElement('style'); st.id = 'orlaCss'; st.textContent = `
#orlaCard,#gymGame{position:absolute;left:50%;bottom:calc(var(--sab,0px) + 120px);transform:translateX(-50%);background:rgba(8,24,30,.84);border:1px solid ${THEME.neon ? '#29f0ff' : '#ffd23f'};box-shadow:0 0 14px ${THEME.neon ? 'rgba(41,240,255,.45)' : 'rgba(255,210,63,.35)'};padding:8px 14px;border-radius:12px;font-size:14px;text-align:center;max-width:min(460px,86vw);z-index:11;color:#fff}
#orlaCard[hidden],#gymGame[hidden]{display:none}#orlaCard .oBtns,#gymGame .oBtns{display:flex;gap:8px;justify-content:center;margin-top:6px}
#orlaCard button,#gymGame button{min-height:38px;min-width:120px;border-radius:10px;border:0;font-weight:800;font-size:14px;color:#fff;background:#2f3f55}
#orlaCard button.hot,#gymGame button.hot{background:linear-gradient(90deg,${THEME.neon ? '#29f0ff,#b14dff' : '#ff8a3c,#ff4f8b'})}
#gymGame{min-width:min(360px,86vw)}#ggBar{position:relative;height:22px;border-radius:11px;background:#1d2a33;margin:8px 0;overflow:hidden;border:1px solid #fff3}
#ggZone{position:absolute;top:0;bottom:0;background:${THEME.neon ? '#29f0ff88' : '#46c08c'}}#ggMk{position:absolute;top:-2px;bottom:-2px;width:6px;margin-left:-3px;background:#fff;border-radius:3px;box-shadow:0 0 6px #fff}
#ggInfo{font-size:13px;opacity:.9}#gymGame kbd,#orlaCard kbd{background:#fff2;border-radius:4px;padding:0 4px}
body.touch #orlaCard,body.touch #gymGame{bottom:auto;top:calc(var(--sat,0px) + 322px);max-width:calc(100vw - 150px);padding:8px 10px}
body.touch #orlaCard button,body.touch #gymGame button{min-width:0;flex:1}
body.touch.land #orlaCard,body.touch.land #gymGame{top:auto;bottom:calc(var(--sab,0px) + 56px);max-width:min(440px,50vw)}
body.touch #gymGame #ggGo{min-height:52px;font-size:17px}`; document.head.appendChild(st); }
    const host = document.getElementById('hud') || document.body;
    const card = document.createElement('div'); card.id = 'orlaCard'; card.hidden = true; host.appendChild(card); this.cardEl = card;
    const gg = document.createElement('div'); gg.id = 'gymGame'; gg.hidden = true; gg.innerHTML = `<b id="ggT"></b><div id="ggInfo"></div><div id="ggBar"><i id="ggZone"></i><i id="ggMk"></i></div><div class="oBtns"><button id="ggGo" class="hot"></button><button id="ggX">Sair</button></div>`; host.appendChild(gg); this.ggEl = gg;
    for (const el of [card, gg]) { el.addEventListener('pointerdown', e => e.stopPropagation()); el.addEventListener('touchstart', e => e.stopPropagation(), { passive: true }); }
    card.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && this.focus) { this.G.audio.init && this.G.audio.init(); this.focus.go(); this._ck = null; } });
    gg.querySelector('#ggGo').addEventListener('pointerdown', (e) => { e.preventDefault(); this.tap(); });
    gg.querySelector('#ggX').addEventListener('click', () => this.finish(true));
  }
  mapHook() {
    HOOKS.map.push((c, X, Z) => { c.strokeStyle = THEME.neon ? '#29f0ffaa' : '#ffffffaa'; c.lineWidth = 1;
      c.strokeRect(X(SOC.x - SOC.hw), Z(SOC.z - SOC.hl), X(SOC.x + SOC.hw) - X(SOC.x - SOC.hw), Z(SOC.z + SOC.hl) - Z(SOC.z - SOC.hl));
      c.strokeRect(X(TEN.x - 12), Z(TEN.z - 14), X(TEN.x + 12) - X(TEN.x - 12), Z(TEN.z + 14) - Z(TEN.z - 14));
      c.fillStyle = THEME.neon ? '#ff4fb8' : '#ff8a3c'; c.fillRect(X(GYM.x) - 2, Z(GYM.z) - 2, 4, 4); });
  }
  // ---------- interação
  busy() { return !!this.game; }
  act() { if (this.game) { this.tap(); return true; } if (this.focus && !this.G.player.vehicle) { this.focus.go(); this._ck = null; return true; } return false; }
  nearest() {
    const p = this.G.player; if (p.vehicle || this.game || !this.visible) return null; let best = null, bd = 1e9;
    for (const s of this.spots) { const d = Math.hypot(p.x - s.x, p.z - s.z); if (d < s.r && d < bd && s.on()) { bd = d; best = s; } }
    return best;
  }
  card() {
    const el = this.cardEl, s = this.focus; if (!s) { if (!el.hidden) el.hidden = true; this._ck = null; return; }
    const html = s.html(), key = s.id + html; if (this._ck === key && !el.hidden) return; this._ck = key;
    el.innerHTML = `<div>${html}</div><div class="oBtns"><button class="hot">${s.btn}</button></div><small>${this.G.touch || document.body.classList.contains('touch') ? '' : '<kbd>E</kbd> para '}${s.btn.replace(/^\S+\s/, '').toLowerCase()}</small>`; el.hidden = false;
  }
  toast(h, ms) { this.G.ui && this.G.ui.toast(h, ms); }
  // ---------- minijogo de treino
  start(kind) {
    const G = this.G, p = G.player; if (p.vehicle || this.game) return;
    this.game = { kind, reps: 0, miss: 0, u: 0, dir: 1, rep: 0, dist: 0, time: 0, v: 0, cnt: 3, done: false, px: p.x, pz: p.z, ph: p.h };
    if (kind === 'corrida') { p.x = RUN.x; p.z = RUN.z0; p.h = Math.PI; p.y = groundY(p.x, p.z); }
    else { G.hero.g.visible = false; }
    G.camYaw = kind === 'supino' ? Math.PI * 0.9 : kind === 'barra' ? Math.PI / 2 + 0.35 : Math.PI; G.camPitch = 0.18; // câmera de lado para ver o exercício
    this.focus = null; this.card(); this.ggEl.hidden = false; this.drawGame(); G.audio.chime && G.audio.chime('coin');
    return true;
  }
  zoneW() { const g = this.game; return clamp(0.3 - g.reps * 0.012 + (this.st.forca - 1) * 0.012, 0.1, 0.36); }
  tap() {
    const g = this.game; if (!g || g.done) return;
    if (g.kind === 'corrida') { if (g.cnt > 0) return; g.v = Math.min(g.v + 1.05, 8 + this.st.folego * 0.25); return; }
    if (g.rep > 0) return; const w = this.zoneW(); if (Math.abs(g.u - 0.5) < w / 2) { g.reps++; g.rep = 0.55; this.G.audio.chime && this.G.audio.chime('coin'); } else { g.miss++; }
    if (g.reps >= 15 || g.miss >= 3) this.finish(false); else this.drawGame();
  }
  drawGame() {
    const g = this.game; if (!g) return; const $ = (id) => this.ggEl.querySelector('#' + id);
    const touch = document.body.classList.contains('touch');
    if (g.kind === 'corrida') { $('ggT').textContent = '🏃 Corrida 150 m'; $('ggInfo').textContent = g.cnt > 0 ? `Prepare-se… ${Math.ceil(g.cnt)}` : `${g.dist.toFixed(0)} m · ${g.time.toFixed(1)} s · ${(g.v * 3.6).toFixed(0)} km/h`; $('ggGo').textContent = touch ? '👟 Toque rápido!' : '👟 Toque rápido (E / Espaço)'; $('ggZone').style.cssText = 'left:0;width:' + (g.dist / RUN.len * 100).toFixed(1) + '%'; $('ggMk').style.left = (g.dist / RUN.len * 100).toFixed(1) + '%'; }
    else { const w = this.zoneW(); $('ggT').textContent = g.kind === 'supino' ? '🏋️ Supino' : '🤸 Barra fixa'; $('ggInfo').textContent = `Repetições ${g.reps} · erros ${g.miss}/3 · recorde ${this.st.best[g.kind]}`; $('ggGo').textContent = touch ? '💪 No verde!' : '💪 No verde! (E / Espaço)'; $('ggZone').style.cssText = `left:${((0.5 - w / 2) * 100).toFixed(1)}%;width:${(w * 100).toFixed(1)}%`; $('ggMk').style.left = (g.u * 100).toFixed(1) + '%'; }
  }
  finish(quit) {
    const g = this.game; if (!g) return; const G = this.G, st = this.st; this.game = null; this.ggEl.hidden = true; G.hero.g.visible = true; this.crew.hide(this.me.i);
    if (this.barbell) this.barbell.position.copy(this.barbellRest);
    if (g.kind !== 'corrida') { G.player.x = g.px; G.player.z = g.pz; }
    let money = 0, fol = 0, rec = false, msg = '';
    if (g.kind === 'corrida') { if (g.dist >= RUN.len - 0.01) { rec = !st.best.corrida || g.time < st.best.corrida; if (rec) st.best.corrida = +g.time.toFixed(2); money = Math.round(clamp(140 - g.time * 4, 25, 110)); fol = 10 + (rec ? 15 : 0); st.folego = Math.min(20, st.folego + 0.5); msg = `🏁 150 m em <b>${g.time.toFixed(1)} s</b>`; } else msg = 'Corrida interrompida'; }
    else if (g.reps > 0) { rec = g.reps > st.best[g.kind]; if (rec) st.best[g.kind] = g.reps; money = g.reps * 10 + (rec ? 50 : 0); fol = g.reps * 2 + (rec ? 15 : 0); st.forca = Math.min(20, st.forca + g.reps / 8); msg = `${g.kind === 'supino' ? '🏋️' : '🤸'} <b>${g.reps}</b> repetições`; }
    else msg = quit ? 'Treino encerrado' : 'Sem repetições desta vez';
    if (money || fol) { st.treinos++; G.addMoney(money); G.addFollowers(fol); msg += ` · +${THEME.N.money}${money} · +${fol} seguidores`; if (rec) G.ui.big && G.ui.big('RECORDE!'); }
    this.toast(msg + (rec ? ' · <b>novo recorde!</b>' : ''), 4200); this.last = { kind: g.kind, reps: g.reps, time: g.time, dist: g.dist, money, fol, rec }; G.persist && G.persist();
  }
  // controla o jogador durante o treino (chamado no começo de updatePlayer)
  drive(dt) {
    const g = this.game; if (!g) return false; const G = this.G, p = G.player, hero = G.hero;
    if (p.vehicle) { this.finish(true); return false; }
    if (g.kind === 'corrida') {
      if (g.cnt > 0) { g.cnt -= dt; hero.pose('idle', 0, dt); }
      else { g.time += dt; g.v *= Math.exp(-1.1 * dt); g.dist = Math.min(RUN.len, g.dist + g.v * dt); p.z = RUN.z0 - g.dist; hero.pose(g.v > 0.4 ? 'walk' : 'idle', g.v > 5 ? 0.95 : 0.6 * Math.min(1, g.v / 4.2), dt); if (g.dist >= RUN.len || g.time > 60) this.finish(false); }
      p.x = RUN.x; p.h = Math.PI; p.y = groundY(p.x, p.z); hero.g.position.set(p.x, p.y, p.z); hero.g.rotation.y = Math.PI; hero.g.rotation.x = 0;
    } else {
      const sp = g.kind === 'supino' ? 0.85 + g.reps * 0.07 : 1.0 + g.reps * 0.08; g.u += g.dir * dt * sp; if (g.u > 1) { g.u = 2 - g.u; g.dir = -1; } if (g.u < 0) { g.u = -g.u; g.dir = 1; }
      if (g.rep > 0) g.rep = Math.max(0, g.rep - dt);
      const s = g.kind === 'supino' ? this.st_bench : this.st_pull; p.x = s.x - (g.kind === 'supino' ? 0 : 0.6); p.z = s.z; hero.g.position.set(p.x, groundY(p.x, p.z), p.z);
    }
    this._gT = (this._gT || 0) + dt; if (this._gT > 0.05) { this._gT = 0; this.drawGame(); }
    return true;
  }
  // ---------- eventos e pedidos
  joinRoda() { const st = this.st; if (st.roda === this.day) { this.toast('🌅 Você já está na roda — aproveite o pôr do sol!'); return; } st.roda = this.day; this.G.addFollowers(25); this.toast(`🌅 Você entrou na <b>${THEME.N.sunset}</b>! +25 seguidores`); this.danceT = 6; this.G.persist && this.G.persist(); }
  tip(f) { const G = this.G; if (f.cd > 0) return; if (G.save.money < 5) { this.toast('Sem dinheiro para a gorjeta agora.'); return; } G.addMoney(-5); G.addFollowers(6); f.cd = 20; f.tips++; this.st.gorjetas++; this.toast(`${THEME.N.instr} O músico tocou uma especial pra você! +6 seguidores`); this.arpeggio(); }
  questAct(q) {
    if (q.state === 'idle') { q.state = 'go'; this.toast(`💬 “${q.txt}” <br>⭐ Siga a estrela.`, 4500); }
    else if (q.state === 'back') this.questDone(q);
  }
  questDone(q) { q.state = 'idle'; q.cd = 90; this.st.quests++; this.G.addMoney(q.$); this.G.addFollowers(q.f); this.toast(`${q.end} +${THEME.N.money}${q.$} · +${q.f} seguidores`, 4200); this.G.audio.chime && this.G.audio.chime('win'); this.G.persist && this.G.persist(); }
  get rodaOn() { return inH(this.hour || 12, THEME.sunset); }
  get musicOn() { return inH(this.hour || 12, THEME.music); }
  // sons curtinhos (tambor da roda, arpejo do músico) pelo mixer do jogo
  tone(f0, f1, dur, type = 'sine', vol = 0.18, when = 0) {
    const A = this.G.audio; if (!A || !A.ok || A.muted) return; const c = A.ctx, t = c.currentTime + when; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur); o.connect(g); g.connect(A.master || c.destination); o.start(t); o.stop(t + dur + 0.02);
  }
  arpeggio() { [262, 330, 392, 523, 392, 659].forEach((f, i) => this.tone(f, f * 0.995, 0.5, 'triangle', 0.12, i * 0.14)); }
  // ---------- quadro a quadro
  update(dt, t, cam, hour) {
    const near = cam.position.x > 230 && Math.abs(cam.position.z) < 760; this.hour = hour;
    if (this._lastH != null && hour < this._lastH - 12) this.day++; this._lastH = hour;
    if (near !== this.visible) { this.visible = near; this.root.visible = near; if (!near) { this.focus = null; this.card(); } }
    for (const q of this.quests) if (q.cd > 0) q.cd -= dt; for (const f of this.musos) if (f.cd > 0) f.cd -= dt;
    if (!near) { if (this.game) this.finish(true); return; }
    this.t += dt; const T = this.t, P = this.G.player;
    this.focus = this.nearest(); this.card();
    const lights = inH(hour, THEME.lights); this.lampM.emissiveIntensity = lights ? 2.2 : 0; const ce = lights && (this.env ? this.env.night : (hour > 18.3 || hour < 6)) ? 0.55 : 0; for (const m of this.courtMats) m.emissiveIntensity = ce;
    const maxD = this.Q.level === 'low' ? 140 : 200, cx = cam.position.x, cz = cam.position.z; const far = (x, z) => Math.abs(x - cx) > maxD || Math.abs(z - cz) > maxD;
    this.updSoccer(dt, hour, far(SOC.x, SOC.z)); this.updTennis(dt, hour, far(TEN.x, TEN.z), lights);
    // roda do pôr do sol
    const roda = this.rodaOn; this.rodaStatic.visible = roda;
    if (roda && Math.hypot(P.x - SUN.x, P.z - SUN.z) < 26) { this.beatT = (this.beatT || 0) - dt; if (this.beatT <= 0) { this.beatT = 0.42; this.beat = ((this.beat || 0) + 1) % 8; const d = Math.hypot(P.x - SUN.x, P.z - SUN.z); this.tone(this.beat % 4 === 0 ? 110 : 160, 50, 0.22, 'sine', 0.22 * (1 - d / 26)); } }
    if (this.danceT > 0) this.danceT -= dt;
    // pedidos: marcadores e objetivos
    for (const q of this.quests) {
      const avail = q.state === 'idle' && q.cd <= 0; q.mark.visible = avail || q.state === 'back'; if (q.mark.visible) { q.mark.material.rotation = 0; q.mark.position.y = groundY(q.gx, q.gz) + (q.sit ? 1.6 : 1.9) + (q.id === 'coco' ? 1.2 : 0) + Math.sin(T * 3) * 0.12; }
      const going = q.state === 'go'; q.star.visible = going; if (q.o) q.o.visible = going;
      if (going) { const ty = q.float ? WATER_Y + 0.12 + Math.sin(T * 1.7) * 0.06 : groundY(q.tx, q.tz) + 0.03; q.star.position.set(q.tx, ty + 2.2 + Math.sin(T * 2.5) * 0.15, q.tz); if (q.o) { q.o.position.set(q.tx, ty + (q.float ? 0.1 : 0), q.tz); q.o.rotation.y = T; }
        if (!P.vehicle && Math.hypot(P.x - q.tx, P.z - q.tz) < q.pick) { if (q.back) { q.state = 'back'; this.toast('✅ ' + q.got); this.G.audio.chime && this.G.audio.chime('coin'); } else this.questDone(q); } }
    }
    // músicos: notas flutuando
    const mOn = this.musicOn; this.musos.forEach((f, i) => { const g = this.guitars[i]; g.visible = mOn; f.note.visible = mOn && !far(f.x, f.z); if (f.note.visible) { const u = (T * 0.5 + i * 0.5) % 1; f.note.position.set(f.x + 0.3, groundY(f.x, f.z) + 2.0 + u * 1.4, f.z + Math.sin(T * 2 + i) * 0.3); f.note.material.opacity = 1 - u; } });
    this.write(dt, T, hour, far, roda, mOn);
  }
  updSoccer(dt, hour, far) {
    const S = this.soc, B = S.ball, open = inH(hour, THEME.open) || inH(hour, THEME.lights) && hour < 22; S.open = open; const { x: cx, z: cz, hw, hl } = SOC;
    if (!open || far) { this.socBall.position.set(B.x, groundY(B.x, B.z) + 0.11 + B.y - 0.11, B.z); return; }
    if (S.cel > 0) { S.cel -= dt; if (S.cel <= 0) { B.x = cx; B.z = cz; B.vx = B.vz = B.vy = 0; B.y = 0.11; } }
    // bola
    B.vy -= 9.8 * dt; B.y += B.vy * dt; if (B.y < 0.11) { B.y = 0.11; B.vy = Math.abs(B.vy) > 1.2 ? -B.vy * 0.45 : 0; }
    const fr = Math.exp(-(B.y > 0.15 ? 0.15 : 1.3) * dt); B.vx *= fr; B.vz *= fr; B.x += B.vx * dt; B.z += B.vz * dt;
    if (Math.abs(B.x - cx) > hw - 0.2) { B.x = cx + Math.sign(B.x - cx) * (hw - 0.2); B.vx = -B.vx * 0.6; }
    if (Math.abs(B.z - cz) > hl && S.cel <= 0) { const side = Math.sign(B.z - cz); if (Math.abs(B.x - cx) < 2.4 && B.y < 2.0) { if (side > 0) S.a++; else S.b++; S.goals++; S.cel = 2.6; S.lastTeam = side > 0 ? 0 : 1; this.drawScore(); if (Math.hypot(this.G.player.x - cx, this.G.player.z - cz) < 45) this.toast(`⚽ GOL do time ${side > 0 ? THEME.N.teamA : THEME.N.teamB}! ${S.a} x ${S.b}`, 2400); if (S.a + S.b >= 12) { S.a = S.b = 0; } B.vx *= 0.2; B.vz = 0; } else { B.z = cz + side * (hl - 0.3); B.vz = -B.vz * 0.5; B.vx *= 0.6; } }
    if (S.cel > 0 && Math.abs(B.z - cz) > hl) { B.z = clamp(B.z, cz - hl - 1, cz + hl + 1); }
    this.socBall.position.set(B.x, groundY(B.x, B.z) + B.y, B.z); this.socBall.rotation.x += B.vz * dt * 4; this.socBall.rotation.z -= B.vx * dt * 4;
    // jogadores: o mais perto de cada time vai na bola, os outros guardam posição acompanhando o lance
    S.cd[0] -= dt; S.cd[1] -= dt;
    for (const team of [0, 1]) {
      const pl = this.players.filter(f => f.team === team); let ch = null, bd = 1e9; for (const f of pl) { if (f.gk) continue; const d = Math.hypot(f.x - B.x, f.z - B.z); if (d < bd) { bd = d; ch = f; } }
      const gk = pl.find(f => f.gk); const own = team ? cz + hl : cz - hl; if (gk && Math.abs(B.z - own) < 6) { const d = Math.hypot(gk.x - B.x, gk.z - B.z); if (d < bd) ch = gk; }
      const dir = team ? -1 : 1;
      for (const f of pl) {
        let tx, tz, sp = 3.2; if (f === ch && S.cel <= 0) { tx = B.x - dir * 0.3; tz = B.z - dir * 0.35; sp = 5 + (f.i % 3) * 0.4; }
        else if (f.gk) { tx = clamp(B.x, cx - 2, cx + 2); tz = own + dir * 0.8; }
        else { tx = clamp(f.hx + (B.x - cx) * 0.35, cx - hw + 1, cx + hw - 1); tz = clamp(f.hz + (B.z - cz) * 0.5, cz - hl + 1, cz + hl - 1); }
        if (S.cel > 0) { f.mode = (S.lastTeam === team) ? 'dance' : 'idle'; f.amt = 0; continue; }
        const dx = tx - f.x, dz = tz - f.z, d = Math.hypot(dx, dz); const v = d > 0.25 ? Math.min(sp, d * 3) : 0; if (v > 0) { f.x += dx / d * v * dt; f.z += dz / d * v * dt; f.h = Math.atan2(dx, dz); } f.mode = v > 0.3 ? 'walk' : 'idle'; f.amt = v > 4 ? 0.95 : 0.55 * Math.min(1, v / 3); f.ph += dt * (2 + v * 2.2);
        if (f === ch && S.cd[team] <= 0 && Math.hypot(f.x - B.x, f.z - B.z) < 0.75 && B.y < 0.6) {
          const r = this.r; const gx = cx + (r() - 0.5) * 7, gz = team ? cz - hl - 1 : cz + hl + 1; const toGoal = Math.abs(gz - f.z) < 16; const ang = Math.atan2(gx - f.x, gz - f.z) + (toGoal ? 0 : (r() - 0.5) * 0.9);
          const pw = toGoal ? 11 + r() * 5 : 6 + r() * 5; B.vx = Math.sin(ang) * pw; B.vz = Math.cos(ang) * pw; B.vy = r() < 0.3 ? 3 + r() * 3 : 0.6; S.cd[team] = 0.7; S.cd[1 - team] = 0.25; S.kicks++; f.kick = 0.3; f.h = ang;
        }
        if (f.kick > 0) f.kick -= dt;
      }
    }
  }
  updTennis(dt, hour, far, lights) {
    const open = inH(hour, THEME.tennisOpen); this.tenOpen = open; const cx = TEN.x; const r = this.r;
    this.courts.forEach((c, ci) => { const m = this.tballs[ci]; m.visible = open && !far; if (!open || far) return; const B = c.ball;
      if (B.pause > 0) { B.pause -= dt; if (B.pause <= 0) { B.hits = 0; B.len = 3 + Math.floor(r() * 10); B.u = 0; B.fz = c.pl[B.from].z; B.tz = c.z + (r() - 0.5) * 8; } }
      else { B.u += dt / B.dur; if (B.u >= 1) { B.hits++; c.rallies = (c.rallies || 0) + 1; B.from = 1 - B.from; B.u = 0; B.fz = B.tz; B.dur = 1.0 + r() * 0.45; B.tz = c.z + (r() - 0.5) * 8.5; c.pl[B.from].swing = 0.35;
          if (B.hits >= B.len) { const w = r() < 0.5 ? 0 : 1; c.pts[w]++; if (c.pts[w] >= 4 && c.pts[w] - c.pts[1 - w] >= 2) { c.games[w]++; c.pts = [0, 0]; if (c.games[w] >= 6) c.games = [0, 0]; } B.pause = 1.6; B.from = r() < 0.5 ? 0 : 1; } } }
      const a = c.pl[B.from], b = c.pl[1 - B.from]; const ax = cx + a.side * 11.6, bx = cx + b.side * 11.6; const u = B.u;
      const x = ax + (bx - ax) * u, z = B.fz + (B.tz - B.fz) * u; let y; if (B.pause > 0) { y = 0.1 + Math.abs(Math.sin(B.pause * 6)) * 0.4 * B.pause; } else if (u < 0.72) { const k = u / 0.72; y = 1.0 + (0.05 - 1.0) * k + Math.sin(k * Math.PI) * 1.4; } else { const k = (u - 0.72) / 0.28; y = 0.05 + (1.0 - 0.05) * k + Math.sin(k * Math.PI) * 0.7; }
      m.position.set(B.pause > 0 ? ax : x, groundY(x, z) + 0.07 + y, B.pause > 0 ? a.z : z);
      for (const p of c.pl) { const tz = p === b && B.pause <= 0 ? B.tz : p === a ? p.z : c.z; const d = tz - p.z; const v = clamp(d * 3, -4.5, 4.5); p.z += v * dt; p.x = cx + p.side * (12.3 + Math.sin(this.t * 0.7 + p.i) * 0.4); p.mode = Math.abs(v) > 0.4 ? 'walk' : 'idle'; p.amt = Math.min(0.9, Math.abs(v) / 4); p.ph += dt * (2 + Math.abs(v) * 2); if (p.swing > 0) p.swing -= dt; }
    });
  }
  write(dt, T, hour, far, roda, mOn) {
    const cr = this.crew, g = this.game; let ri = 0;
    for (const f of this.figs) {
      if (far(f.x, f.z) && f.kind !== 'me') { cr.hide(f.i); continue; }
      let pose, x = f.x, z = f.z, y = groundY(f.x, f.z) + 0.05, h = f.h, B;
      switch (f.kind) {
        case 'gym': { if (!inH(hour, THEME.open)) { cr.hide(f.i); continue; } f.ph += dt * 1.6; if (f.pull) { const up = (Math.sin(f.ph * 1.2) + 1) / 2; pose = { legL: 0.15, legR: 0.1, armL: Math.PI - 0.15 - up * 0.6, armR: Math.PI - 0.15 - up * 0.6, lean: 0, yOff: 0, lie: 0 }; pose.armL = -pose.armL; pose.armR = -pose.armR; y = f.top0 || (f.top0 = this.npcPull.top - 2.1); y += up * 0.45; h = Math.PI / 2; } else pose = poseFor('exercise', f.ph, 1, f.ex); break; }
        case 'me': { if (!g || g.kind === 'corrida') { cr.hide(f.i); continue; }
          if (g.kind === 'supino') { const s = this.st_bench; const up = g.rep > 0 ? Math.sin((1 - g.rep / 0.55) * Math.PI) : 0; const a = -(1.15 + up * 0.42); pose = { lie: 1, legL: 0.55, legR: 0.45, armL: a, armR: a, lean: 0, yOff: 0 }; x = s.x + 0.1; z = s.z; y = groundY(x, z) + 0.05 + 0.45; h = Math.PI / 2;
            B = cr.set(f.i, x, y, z, h, pose, 1); const hp = handPos(B, a, 1); this.barbell.position.set(hp.x, hp.y + 0.03, s.z); continue; }
          const s = this.st_pull; const up = g.rep > 0 ? Math.sin((1 - g.rep / 0.55) * Math.PI) : 0.05 * Math.sin(T * 3); const a = -(Math.PI - 0.12 - up * 0.55); pose = { legL: 0.2, legR: 0.12, armL: a, armR: a, lean: 0, yOff: 0, lie: 0 }; x = s.x; z = s.z; h = Math.PI / 2; y = this.pullTop - 2.08 + up * 0.5; break; }
        case 'soc': pose = poseFor(f.mode, f.ph, f.amt); if (f.kick > 0) { pose.legR = -1.0; } if (!this.soc.open) { cr.hide(f.i); continue; } break;
        case 'fan': { if (!this.soc.open) { cr.hide(f.i); continue; } f.ph += dt; pose = poseFor(this.soc.cel > 0 ? 'wave' : 'sit', f.ph, 0); if (this.soc.cel <= 0) y -= 0.36 * f.scale; else pose = poseFor('wave', f.ph * 3, 0); break; }
        case 'ten': { if (!this.tenOpen) { cr.hide(f.i); continue; } pose = poseFor(f.mode, f.ph, f.amt); h = f.side > 0 ? -Math.PI / 2 : Math.PI / 2; if (f.swing > 0) pose.armR = -1.6 - Math.sin(f.swing / 0.35 * Math.PI) * 0.9; else pose.armR = -0.5;
          B = cr.set(f.i, x, y, z, h, pose, f.scale); _m.makeRotationX(pose.armR).setPosition(0.27, 1.49, 0); this.rackets.setMatrixAt(ri++, _m.premultiply(B)); continue; }
        case 'roda': { if (!roda) { cr.hide(f.i); continue; } f.ph += dt * 2.2; const sp = T * 0.25; x = SUN.x + Math.cos(f.a + sp) * 4.4; z = SUN.z + Math.sin(f.a + sp) * 4.4; h = Math.atan2(SUN.x - x, SUN.z - z); pose = poseFor(f.i % 3 ? 'dance' : 'wave', f.ph, 0); break; }
        case 'drum': { if (!roda) { cr.hide(f.i); continue; } f.ph += dt * 8; pose = poseFor('sit', 0, 0); y -= 0.36 * f.scale; const hit = Math.sin(f.ph) * 0.35; pose.armL = -0.9 + hit; pose.armR = -0.9 - hit; break; }
        case 'muso': { if (!mOn) { cr.hide(f.i); continue; } f.ph += dt * 6; pose = poseFor(f.cd > 17 ? 'wave' : 'idle', f.ph, 0); if (f.cd <= 17) { pose.armL = -1.25; pose.armR = -0.75 + Math.sin(f.ph) * 0.18; }
          B = cr.set(f.i, x, y, z, h, pose, f.scale); const gt = this.guitars[this.musos.indexOf(f)]; _v.set(0.02, 1.12, 0.17).applyMatrix4(B); gt.position.copy(_v); gt.rotation.set(0, h, 0.45); gt.rotateY(0); continue; }
        case 'qgiver': case 'qsit': { f.ph += dt; const q = this.quests.find(q => q.giver === f); const wave = q && q.state === 'idle' && q.cd <= 0 && Math.sin(f.ph * 1.5) > 0.6; pose = poseFor(f.kind === 'qsit' ? (wave ? 'wave' : 'sit') : wave ? 'wave' : 'idle', f.ph * 3, 0); if (f.kind === 'qsit') { y -= 0.36 * f.scale; if (wave) { const p2 = poseFor('sit', 0, 0); pose.legL = p2.legL; pose.legR = p2.legR; pose.yOff = p2.yOff; } } break; }
        default: pose = poseFor('idle', f.ph, 0);
      }
      cr.set(f.i, x, y, z, h, pose, f.scale);
    }
    for (; ri < 4; ri++) this.rackets.setMatrixAt(ri, _z); this.rackets.instanceMatrix.needsUpdate = true; cr.flush();
  }
  stats() { return { soc: { a: this.soc.a, b: this.soc.b, kicks: this.soc.kicks, goals: this.soc.goals, open: this.soc.open }, ten: this.courts.map(c => ({ rallies: c.rallies || 0, pts: c.pts.slice(), games: c.games.slice() })), st: JSON.parse(JSON.stringify(this.st)), figs: this.figs.length, spots: this.spots.length, quests: this.quests.map(q => q.state), roda: this.rodaOn, music: this.musicOn, focus: this.focus && this.focus.id, game: this.game && { ...this.game } }; }
}
