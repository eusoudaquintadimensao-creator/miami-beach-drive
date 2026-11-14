// Circuito Serpentina: pista de drift à beira da Casa Solara (curvas fechadas, neon, rivais que derrapam,
// pontuação, Bar da Curva e espectadores com rotina). Nomes e visual originais; geometria fundida + instancing.
import * as THREE from 'three';
import { canvasTex, C, clamp, angDiff, rng, MeshBuilder } from './util.js';
import { addCircle, addBox, HOOKS, inSerpZone, surfaceY } from './world.js';
import { Vehicle, raceTune, SPECS } from './vehicles.js';
import { VENUES, SPOTS, isOpen } from './life.js';
import { HOME, inHomeZone } from './home.js';
import { respawnFade } from './driveui.js';
const $ = (id) => document.getElementById(id);

export const SERP_KEY = 'mbd-serpentina-v1';
export const SERP = {
  name: 'Circuito Serpentina', halfW: 8.2, curb: 1.15, wall: 12.2,
  // pontos de controle (Catmull-Rom): serpenteia a oeste e ao sul da casa, sem entrar no quintal
  pts: [
    [-660, 618], [-720, 650], [-800, 690], [-900, 710], [-980, 760],
    [-990, 840], [-910, 875], [-810, 860], [-730, 810], [-650, 850],
    [-560, 875], [-490, 840], [-520, 770], [-610, 740], [-730, 710],
    [-800, 650], [-740, 615], [-680, 600],
  ],
  entrance: { x: -660, z: 600 }, // liga na Av. do Centro (z = 600)
  gap: { x0: -672, x1: -648, z1: 632 },
  bar: { x: -530, z: 810 }, // terraço olhando a curva leste, FORA da pista (antes ficava em cima do traçado)
};
const inGap = (x, z) => x > SERP.gap.x0 && x < SERP.gap.x1 && z < SERP.gap.z1;
const DRIVERS = [
  { name: 'Lila Curva', skill: 0.96, type: 'rc_jdm', liv: 0 },
  { name: 'Leo Fumaça', skill: 0.92, type: 'rc_muscle', liv: 1 },
  { name: 'Nina Lateral', skill: 0.9, type: 'rc_gt', liv: 2 },
  { name: 'Rafa Serpente', skill: 0.88, type: 'rc_hyper', liv: 3 },
];

function ribbonGeo(T, o0, o1, y) {
  const pos = [], uv = [], idx = []; const N = T.N;
  for (let i = 0; i <= N; i++) {
    const j = i % N, cx = T.px[j], cz = T.pz[j], rx = T.rx[j], rz = T.rz[j], v = i * T.ds / 8;
    pos.push(cx + rx * o0, y, cz + rz * o0, cx + rx * o1, y, cz + rz * o1); uv.push(0, v, 1, v);
    if (i) { const a = (i - 1) * 2, b = a + 1, c = a + 2, d = a + 3; idx.push(a, c, b, b, c, d); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals();
  const n = g.attributes.normal; if (n.count && n.getY(0) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); }
  return g;
}

function loadData() { try { return JSON.parse(localStorage.getItem(SERP_KEY) || 'null'); } catch (e) { return null; } }
function saveData(d) { try { localStorage.setItem(SERP_KEY, JSON.stringify(d)); } catch (e) { } }

export class Serpentina {
  constructor(G) {
    this.G = G; this.Q = G.Q; const D = SERP;
    const curve = new THREE.CatmullRomCurve3(D.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal');
    const L = curve.getLength(), N = Math.round(L / 2); this.L = L; this.N = N; this.ds = L / N;
    const P = curve.getSpacedPoints(N);
    this.px = new Float32Array(N); this.pz = new Float32Array(N); this.h = new Float32Array(N); this.rx = new Float32Array(N); this.rz = new Float32Array(N); this.kap = new Float32Array(N);
    for (let i = 0; i < N; i++) { this.px[i] = P[i].x; this.pz[i] = P[i].z; }
    for (let i = 0; i < N; i++) {
      const a = (i - 1 + N) % N, b = (i + 1) % N; const tx = this.px[b] - this.px[a], tz = this.pz[b] - this.pz[a], l = Math.hypot(tx, tz) || 1;
      this.h[i] = Math.atan2(tx, tz); this.rx[i] = -tz / l; this.rz[i] = tx / l;
    }
    const raw = new Float32Array(N);
    for (let i = 0; i < N; i++) raw[i] = -angDiff(this.h[(i - 2 + N) % N], this.h[(i + 2) % N]) / (4 * this.ds);
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += raw[(i + k + N) % N]; this.kap[i] = s / 13; }
    this.cell = 24; this.grid = new Map();
    for (let i = 0; i < N; i++) { const k = Math.floor(this.px[i] / this.cell) + ',' + Math.floor(this.pz[i] / this.cell); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(i); }

    this.group = new THREE.Group(); G.scene.add(this.group);
    this.cars = []; this.fans = []; this.on = false; this.session = 0; this.leftT = 0; this.hint = -1;
    this.data = Object.assign({ best: 0, runs: 0, last: 0 }, loadData() || {});
    this.build(G.Q);
    HOOKS.surfs.push((x, z) => { if (!inSerpZone(x, z, 4)) return null; const r = this.locate(x, z); if (!r) return null; const a = Math.abs(r.lat); return a <= D.halfW + D.curb ? 1.05 : a <= D.wall + 1 ? 0.88 : null; });
    HOOKS.map.push((g, X, Z) => {
      const k = X(1) - X(0); g.lineJoin = 'round';
      const path = () => { g.beginPath(); for (let i = 0; i <= N; i++) { const j = i % N; i ? g.lineTo(X(this.px[j]), Z(this.pz[j])) : g.moveTo(X(this.px[j]), Z(this.pz[j])); } g.closePath(); };
      g.strokeStyle = '#ff9a3c'; g.lineWidth = (D.halfW * 2 + 4) * k; path(); g.stroke();
      g.strokeStyle = '#2a2c32'; g.lineWidth = D.halfW * 2 * k; path(); g.stroke();
      g.strokeStyle = '#fff6'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(X(D.entrance.x), Z(D.entrance.z)); g.lineTo(X(D.entrance.x), Z(D.gap.z1)); g.stroke();
      g.font = '13px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#ffd23f'; g.fillText('🐍', X(-750), Z(740));
    });
    this.spawnAI(); this.buildBar(); this.spawnFans();
  }
  locate(x, z, hint) {
    let best = -1, bd = 1e18; const N = this.N;
    if (hint != null && hint >= 0) { for (let k = -36; k <= 36; k++) { const i = (hint + k + N) % N; const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } if (bd > 70 * 70) best = -1; }
    if (best < 0) {
      bd = 1e18; const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = this.grid.get((cx + a) + ',' + (cz + b)); if (arr) for (const i of arr) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } }
      if (best < 0) return null;
    }
    const dx = x - this.px[best], dz = z - this.pz[best]; const fx = Math.sin(this.h[best]), fz = Math.cos(this.h[best]);
    const along = dx * fx + dz * fz; let s = best * this.ds + along; if (s < 0) s += this.L; if (s >= this.L) s -= this.L;
    return { i: best, lat: dx * this.rx[best] + dz * this.rz[best], s, d: Math.sqrt(bd) };
  }
  at(s, lat = 0) {
    const L = this.L; s = ((s % L) + L) % L; const f = s / this.ds; const i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f);
    const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    const h = this.h[i] + angDiff(this.h[i], this.h[j]) * t, rx = -Math.cos(h), rz = Math.sin(h);
    return { x: x + rx * lat, z: z + rz * lat, h, i, k: this.kap[i] + (this.kap[j] - this.kap[i]) * t };
  }
  build(Q) {
    const D = SERP, G = this.group, N = this.N, low = Q.level === 'low';
    const asph = canvasTex(64, 64, (g) => { g.fillStyle = '#2b2e35'; g.fillRect(0, 0, 64, 64); g.fillStyle = '#33363e'; for (let i = 0; i < 80; i++) g.fillRect((i * 17) % 64, (i * 29) % 64, 2, 2); }, { aniso: Q.aniso, wrap: true });
    const asphM = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.92, metalness: 0.05 });
    const asphalt = new THREE.Mesh(ribbonGeo(this, -D.halfW, D.halfW, 0.04), asphM); asphalt.receiveShadow = true; G.add(asphalt);
    const curbTex = canvasTex(32, 64, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f2f2f2' : '#e85d2a'; g.fillRect(0, i * 8, 32, 8); } }, { wrap: true });
    const curbM = new THREE.MeshStandardMaterial({ map: curbTex, roughness: 0.7 });
    G.add(new THREE.Mesh(ribbonGeo(this, D.halfW, D.halfW + D.curb, 0.07), curbM));
    G.add(new THREE.Mesh(ribbonGeo(this, -D.halfW - D.curb, -D.halfW, 0.07), curbM));
    // faixa central pontilhada
    const dash = new THREE.Mesh(ribbonGeo(this, -0.08, 0.08, 0.05), new THREE.MeshBasicMaterial({ color: 0xfff3c0 })); G.add(dash);

    // muros neon instanciados (performance-optimization: um draw call por lado)
    const segs = [];
    for (let i = 0; i < N; i++) {
      const j = (i + 1) % N; const ax = this.px[i], az = this.pz[i], bx = this.px[j], bz = this.pz[j];
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (inGap(mx, mz) || inHomeZone(mx, mz, 8)) continue;
      const sd = Math.hypot(bx - ax, bz - az) + 0.08;
      segs.push([mx, mz, Math.atan2(bx - ax, bz - az), sd, i]);
      for (const side of [-1, 1]) { const wx = mx + this.rx[i] * side * D.wall, wz = mz + this.rz[i] * side * D.wall; if (!inGap(wx, wz) && !inHomeZone(wx, wz, 6) && !this._nearOther(wx, wz, i, D.wall - 0.6)) addCircle(wx, wz, 0.55); }
    }
    const wallM = new THREE.MeshStandardMaterial({ color: 0x1a1c22, roughness: 0.6, metalness: 0.2 });
    const neonM = new THREE.MeshBasicMaterial({ color: 0xff6a2a, toneMapped: false });
    const wallI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.55, 0.9, 1).translate(0, 0.45, 0), wallM, segs.length * 2);
    const neonI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.07, 1).translate(0, 0.94, 0), neonM, segs.length * 2);
    wallI.castShadow = !low; const m4 = new THREE.Matrix4(); let w = 0;
    for (const [mx, mz, h, sd, si] of segs) {
      for (const side of [-1, 1]) {
        // find nearest sample for normal
        const loc = this.locate(mx, mz); const rx = loc ? this.rx[loc.i] : -Math.cos(h), rz = loc ? this.rz[loc.i] : Math.sin(h);
        const wx = mx + rx * side * D.wall, wz = mz + rz * side * D.wall;
        if (inGap(wx, wz) || inHomeZone(wx, wz, 6) || this._nearOther(wx, wz, si, D.wall - 0.6)) continue;
        m4.makeRotationY(h); m4.setPosition(wx, 0, wz); m4.multiply(new THREE.Matrix4().makeScale(1, 1, sd));
        wallI.setMatrixAt(w, m4); neonI.setMatrixAt(w, m4); w++;
      }
    }
    wallI.count = neonI.count = Math.max(1, w); G.add(wallI, neonI); this.wallI = wallI;

    // arcos neon em algumas curvas
    const archM = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.4, roughness: 0.4 });
    const glowM = new THREE.MeshBasicMaterial({ color: 0xff4fb8, toneMapped: false });
    for (let k = 0; k < 6; k++) {
      const s = (k + 0.4) / 6 * this.L; const p = this.at(s, 0);
      if (Math.abs(p.k) < 1 / 80 && k % 2) continue;
      const g = new THREE.Group(); g.position.set(p.x, 0, p.z); g.rotation.y = p.h;
      const col = new THREE.Mesh(new THREE.BoxGeometry(D.halfW * 2 + 3, 0.25, 0.25), glowM); col.position.set(0, 5.2, 0);
      const a = new THREE.Mesh(new THREE.BoxGeometry(0.28, 5.2, 0.28), archM); a.position.set(-D.halfW - 1.2, 2.6, 0);
      const b = a.clone(); b.position.x *= -1; g.add(col, a, b); G.add(g);
    }
    // pórtico de entrada
    { const p = this.at(2, 0); const g = new THREE.Group(); g.position.set(SERP.entrance.x, 0, SERP.gap.z1 - 2); g.rotation.y = 0;
      const sign = canvasTex(512, 128, (c) => { c.fillStyle = '#111'; c.fillRect(0, 0, 512, 128); c.fillStyle = '#ff9a3c'; c.shadowColor = '#ff6a00'; c.shadowBlur = 16; c.font = 'bold 44px Trebuchet MS, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('CIRCUITO SERPENTINA', 256, 64); });
      const sm = new THREE.Mesh(new THREE.PlaneGeometry(18, 4), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, side: THREE.DoubleSide })); sm.position.set(0, 5.6, 0); sm.rotation.y = Math.PI;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6, 0.4), archM); const p2 = post.clone(); post.position.set(-9, 3, 0); p2.position.set(9, 3, 0); g.add(sm, post, p2); this.group.add(g);
    }
    // chão de terra ao redor (faixa única, leve)
    if (!low) {
      const dirt = new THREE.Mesh(ribbonGeo(this, D.wall + 0.4, D.wall + 9, 0.01), new THREE.MeshStandardMaterial({ color: 0x5a4a32, roughness: 1 })); G.add(dirt);
      G.add(new THREE.Mesh(ribbonGeo(this, -D.wall - 9, -D.wall - 0.4, 0.01), dirt.material));
    }
    this.len = this.L;
  }
  // muro de um trecho não pode cair em cima de outro trecho que passa perto (linha de corrida livre)
  _nearOther(x, z, i, r) {
    const N = this.N, win = Math.ceil(30 / (this.L / N));
    for (let k = 0; k < N; k += 1) {
      let d = Math.abs(k - i); d = Math.min(d, N - d); if (d <= win) continue;
      if (Math.hypot(this.px[k] - x, this.pz[k] - z) < r) return true;
    }
    return false;
  }
  buildBar() {
    const B = SERP.bar, G = this.G, Q = G.Q, y = 0;
    const g = new THREE.Group(); g.position.set(B.x, y, B.z); this.group.add(g); this.barG = g;
    const solid = new MeshBuilder(), lights = new MeshBuilder();
    const WALL = C(0x2a1c1a), WOOD = C(0x8a6238), NEON = C(0xff6a2a), PINK = C(0xff4fb8);
    // prédio baixo + terraço
    solid.box(0, 1.5, 0, 11, 3, 8, WALL); solid.box(0, 3.15, 0, 11.4, 0.2, 8.4, WOOD);
    solid.box(-4.2, 1.6, 2.6, 0.1, 1.8, 2.2, C(0x88c8e8)); solid.box(4.2, 1.6, 2.6, 0.1, 1.8, 2.2, C(0x88c8e8));
    // balcão e mesas do terraço (olhando a pista, para o sul-oeste)
    for (const [x, z] of [[-3, -6.5], [0, -6.5], [3, -6.5], [-3, -9], [3, -9]]) {
      solid.box(x, 0.55, z, 1.5, 0.12, 1.5, WOOD); solid.box(x, 0.25, z, 0.12, 0.5, 0.12, WOOD);
    }
    lights.box(0, 3.4, 0, 8, 0.1, 0.12, NEON); lights.box(0, 3.4, 0, 0.12, 0.1, 6, PINK);
    const sign = canvasTex(512, 128, (c) => { c.clearRect(0, 0, 512, 128); c.fillStyle = '#ff6a2a'; c.shadowColor = '#ff4a00'; c.shadowBlur = 18; c.font = 'bold 56px Trebuchet MS, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('BAR DA CURVA', 256, 64); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(8, 2), new THREE.MeshBasicMaterial({ map: sign, transparent: true, toneMapped: false, side: THREE.DoubleSide })); sm.position.set(0, 4.6, -4.2); sm.rotation.y = Math.PI; g.add(sm);
    const mesh = new THREE.Mesh(solid.geometry(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, metalness: 0.15 })); mesh.castShadow = Q.level !== 'low'; g.add(mesh);
    const lm = new THREE.Mesh(lights.geometry(), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); g.add(lm); this.barNeon = lm;
    addBox(B.x - 5.6, B.z - 4.2, B.x + 5.6, B.z + 4.2, 3.4);
    // assentos e conversas — entram na rotina dos moradores (life.js)
    const venue = { name: 'Bar da Curva', kind: 'bar', col: 0xff6a2a, open: [16, 2], seats: [], emoji: '🍹', x: B.x, z: B.z };
    const seats = [[-3, -6.5], [0, -6.5], [3, -6.5], [-3, -9], [3, -9], [-5, -7.5], [5, -7.5], [0, -9.2]];
    for (const [lx, lz] of seats) { const sx = B.x + lx, sz = B.z + lz; venue.seats.push({ x: sx, z: sz, h: Math.PI, stand: false, occ: null }); }
    SPOTS.chat.push({ x: B.x - 7, z: B.z - 8, h: 0.4, n: 0 }, { x: B.x + 7, z: B.z - 8, h: -0.4, n: 0 }, { x: B.x, z: B.z - 12, h: 0, n: 0 });
    VENUES.push(venue); this.venue = venue;
  }
  spawnFans() {
    // espectadores com rotina própria: de manhã uns poucos alongam; à tarde/noite assistem; de madrugada a maioria vai embora
    const R = rng(91); const n = this.Q.level === 'low' ? 10 : this.Q.level === 'high' ? 22 : 16;
    const geo = new THREE.CapsuleGeometry(0.22, 0.7, 3, 6); const mat = new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: true });
    const mesh = new THREE.InstancedMesh(geo, mat, n); mesh.castShadow = this.Q.level === 'high'; mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3);
    const cols = [0xff4f8b, 0x19c3e6, 0xffc61a, 0x2f9e44, 0x5b2a9e, 0xf2f2f2, 0x1c1c1e];
    const m4 = new THREE.Matrix4(), c = new THREE.Color(); this.fanData = [];
    const B = SERP.bar;
    for (let i = 0; i < n; i++) {
      const a = R() * 5 - 2.5, d = 7 + R() * 9; const x = B.x + Math.sin(a) * d * 0.4 - 1, z = B.z - 8 - R() * 8;
      const per = ['festeiro', 'turista', 'surfista', 'atleta'][i % 4];
      this.fanData.push({ x, z, h: Math.PI + (R() - 0.5) * 0.6, per, phase: R() * 24, col: cols[i % cols.length], sit: R() < 0.7 });
    }
    this.fanMesh = mesh; this.group.add(mesh);
  }
  fanPresent(f, hour) {
    // rotina simples e com histerese: cada um tem um “turno” no terraço
    const start = 11 + (f.phase % 5), end = 23 + (f.phase % 3) * 0.4;
    const h = hour, mid = (start + end) / 2;
    if (h >= start + 0.3 && h < end - 0.3) return true;
    if (f._on && h >= start && h < end) return true; // histerese: quem já está fica até o fim
    return false;
  }
  spawnAI() {
    const G = this.G;
    DRIVERS.forEach((d, k) => {
      const v = new Vehicle(d.type, G.scene, G.Q, undefined, raceTune(d.type, d.liv, [2, 6, 17, 28][k]));
      const s0 = (k + 0.2) / DRIVERS.length * this.L; const p = this.at(s0, (k % 2 ? 1 : -1) * 2.4);
      v.place(p.x, p.z, p.h); Object.assign(v, { npc: true, active: true, racer: d.name, skill: d.skill, total: s0, lat: (k % 2 ? 1 : -1) * 2.4, spd: 18, dy: 0, nit: 1 });
      this.cars.push(v); G.vehicles.push(v);
    });
  }
  go() {
    const G = this.G; if (G.player.vehicle) G.leaveCar(true);
    const p = this.at(8, 0); const entry = { x: SERP.entrance.x, z: SERP.entrance.z + 8, h: 0 };
    G.placeOnFoot(entry.x, entry.z, 0); G.snapCam(); G.ui.toast('🐍 <b>Circuito Serpentina</b> · entre no seu carro (🚘) e derrape nas curvas! Os rivais já estão na pista.', 3600);
    G.audio.chime && G.audio.chime('start');
  }
  update(dt, t, camera) {
    const G = this.G, D = SERP;
    const far = Math.hypot(camera.position.x + 750, camera.position.z - 740) > 520;
    this.group.visible = !far;
    if (far) {
      for (const c of this.cars) c.root.visible = false;
      const v = G.player.vehicle;
      const loc = v && !v.spec.boat && !v.spec.air ? this.locate(v.x, v.z, this.hint) : null;
      const on = !!(loc && Math.abs(loc.lat) < D.wall + 4);
      if (on) { this.hint = loc.i; this.leftT = 0; }
      else if (this.on) { this.leftT += dt; if (this.leftT > 6) this.endSession(); }
      this.hud();
      return;
    }
    this.ai(dt); this.updateFans(dt, G.env.hour, t);
    // sessão de pontuação: começa ao entrar na pista de carro, fecha ao sair
    const v = G.player.vehicle; const loc = v && !v.spec.boat && !v.spec.air ? this.locate(v.x, v.z, this.hint) : null;
    const on = !!(loc && Math.abs(loc.lat) < D.wall + 4);
    if (on) { this.hint = loc.i; this.leftT = 0; if (!this.on) { this.on = true; this.session = G.drift.total; this.stuckT = 0; G.ui.toast('🐍 Sessão de drift na Serpentina! Pontos valem o recorde da pista.', 2600); } }
    else if (this.on) { this.leftT += dt; if (this.leftT > 6) this.endSession(); }
    if (this.on && v) this._maybeRespawn(dt, v, loc, on, D);
    this.hud();
  }
  _maybeRespawn(dt, v, loc, on, D) {
    const G = this.G;
    const off = !on || (loc && Math.abs(loc.lat) > D.halfW + 2);
    const stuck = v.speed < 2.2 && (v.hitT > 0 || off || v.speed < 0.5);
    if (off || stuck) this.stuckT = (this.stuckT || 0) + dt; else this.stuckT = Math.max(0, (this.stuckT || 0) - dt * 2);
    if (this.stuckT > 1 && !this._fading) {
      this._fading = true; this.stuckT = 0;
      respawnFade(() => {
        if (!G.player.vehicle) { this._fading = false; return; }
        const L = this.locate(v.x, v.z, this.hint) || loc;
        const p = this.at(L ? L.s : 8, 0);
        v.place(p.x, p.z, p.h); v.drifting = false; v.yawV = 0;
        v.vf = 8; v.vx = Math.sin(p.h) * 8; v.vz = Math.cos(p.h) * 8;
        G.player.x = p.x; G.player.z = p.z; G.player.h = p.h; G.camYaw = p.h;
        if (G.snapCam) G.snapCam(); v.sync(0);
        this.leftT = 0; this._fading = false;
        G.ui.toast('↺ De volta à pista', 1200);
      });
    }
  }
  endSession() {
    if (!this.on) return; const G = this.G; G.drift.bank(); const pts = Math.max(0, G.drift.total - this.session);
    this.on = false; this.leftT = 0;
    if (pts > 20) {
      this.data.runs++; this.data.last = pts; const rec = pts > this.data.best; if (rec) this.data.best = pts; saveData(this.data);
      G.ui.toast(rec ? `🏆 Novo recorde na Serpentina: <b>${pts.toLocaleString('pt-BR')}</b>!` : `🐍 Sessão: <b>${pts.toLocaleString('pt-BR')}</b> · recorde ${this.data.best.toLocaleString('pt-BR')}`, 3400);
      if (rec) G.audio.chime('win'); G.addFollowers && G.addFollowers(Math.min(8, 1 + Math.floor(pts / 800)));
    }
    this.hud(true);
  }
  ai(dt) {
    const T = this, L = this.L, G = this.G, me = G.player.vehicle;
    const meLoc = me ? T.locate(me.x, me.z, this.hint) : null;
    for (const r of this.cars) {
      if (dt > 0) {
        const top = r.spec.max * 0.62 * r.skill; const aLat = 9 * r.skill;
        let target = top;
        for (let d = 0; d <= 90; d += 6) { const k = Math.abs(T.at(r.total + d).k); if (k < 1e-4) continue; const vm = Math.sqrt(aLat / k); target = Math.min(target, Math.sqrt(vm * vm + 2 * 11 * d)); }
        // na Serpentina a IA “procura” o drift: em curva fecha um pouco e entra de lado
        const kNow = Math.abs(T.at(r.total + 8).k);
        if (kNow > 1 / 70) target = Math.min(target, top * 0.78);
        let latT = clamp(T.at(r.total + 10).k * 180, -4.6, 4.6);
        for (const o of this.cars) { if (o === r) continue; let a = o.total - r.total; if (a < -L / 2) a += L; if (a > 0 && a < 14 && Math.abs(o.lat - r.lat) < 2.8) latT = o.lat >= 0 ? -3.2 : 3.2; }
        if (me && meLoc) { let a = (meLoc.s - r.total); if (a < -L / 2) a += L; if (a > 0 && a < 12 && Math.abs(meLoc.lat - r.lat) < 3) latT = meLoc.lat >= 0 ? -3.4 : 3.4; }
        r.lat += (clamp(latT, -5.4, 5.4) - r.lat) * Math.min(1, dt * 1.4);
        const acc = r.spec.acc * 0.75 * Math.max(0.15, 1 - (r.spd / (r.spec.max * 0.9)) ** 2);
        r.spd += clamp(target - r.spd, -14 * dt, acc * dt); r.spd = Math.max(8, r.spd);
        r.total += r.spd * dt; if (r.total >= L) r.total -= L;
      }
      const p = T.at(r.total, r.lat); const k = p.k;
      // ângulo de drift maior nas curvas (estilo pista de montanha)
      const dyT = Math.abs(k) > 1 / 90 && r.spd > 10 ? -Math.sign(k) * clamp(Math.abs(k) * 16, 0.22, 0.72) : 0;
      r.dy += (dyT - r.dy) * Math.min(1, dt * 2.4);
      r.x = p.x; r.z = p.z; r.y = surfaceY(p.x, p.z); r.h = p.h + r.dy; r.vx = Math.sin(p.h) * r.spd; r.vz = Math.cos(p.h) * r.spd; r.vf = r.spd;
      r.steer = clamp(k * 28, -1, 1); r.spin += r.spd * dt / r.spec.wr; r.drifting = Math.abs(r.dy) > 0.18; r.driftAng = Math.abs(r.dy); r.brakeOn = Math.abs(r.dy) > 0.35;
      r.sync(dt); r.root.visible = Math.hypot(r.x - this.G.player.x, r.z - this.G.player.z) < (this.Q.viewHide || 280);
      if (r.drifting && this.G.fx && Math.random() < 0.35) this.G.fx.emit(r.x, r.y + 0.12, r.z, -r.vx * 0.1, -r.vz * 0.1, 0.5, this.G.env.night);
    }
  }
  updateFans(dt, hour, t) {
    if (!this.fanMesh) return; const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3(), c = new THREE.Color();
    let vis = 0;
    for (let i = 0; i < this.fanData.length; i++) {
      const f = this.fanData[i]; const on = this.fanPresent(f, hour); f._on = on;
      if (!on) { m4.compose(p.set(0, -20, 0), q, s); this.fanMesh.setMatrixAt(i, m4); continue; }
      const bounce = f.sit ? 0 : Math.abs(Math.sin(t * 3 + f.phase)) * 0.08;
      const lean = f.sit ? 0.15 : 0.05 * Math.sin(t * 2 + i);
      e.set(lean, f.h, 0); q.setFromEuler(e); p.set(f.x, (f.sit ? 0.45 : 0.85) + bounce, f.z);
      m4.compose(p, q, s); this.fanMesh.setMatrixAt(i, m4);
      c.setHex(f.col); this.fanMesh.setColorAt(i, c); vis++;
    }
    this.fanMesh.instanceMatrix.needsUpdate = true; if (this.fanMesh.instanceColor) this.fanMesh.instanceColor.needsUpdate = true; this.fanVisible = vis;
  }
  hud(force) {
    const el = $('serpHud'); if (!el) return;
    document.body.classList.toggle('serpOn', !!this.on);
    if (!this.on) { if (!el.hidden) el.hidden = true; return; }
    el.hidden = false;
    const cur = Math.max(0, Math.round(this.G.drift.total - this.session));
    const chain = Math.round(this.G.drift.chain || 0); const comb = this.G.drift.combo || 1;
    const h = `<b>🐍 SERPENTINA</b> <span>${cur.toLocaleString('pt-BR')}</span> · combo ×${comb}${chain > 5 ? ' · ' + chain + ' m' : ''}<small>recorde ${this.data.best.toLocaleString('pt-BR')}</small>`;
    if (force || h !== this._h) { el.innerHTML = h; this._h = h; }
  }
}
