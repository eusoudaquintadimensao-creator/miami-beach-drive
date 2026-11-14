// Autódromo Neon de Solara: circuito fechado no norte dos Glades (asfalto, zebras, muros com neon, arcos de checkpoint,
// pórtico de largada com luzes, arquibancada, torres de luz e cones que voam quando você encosta). Tudo procedural e original.
import * as THREE from 'three';
import { canvasTex, C, clamp, angDiff, rng } from './util.js';
import { addCircle, HOOKS, inTrackZone } from './world.js';

export const TRACK = {
  name: 'Autódromo Neon de Solara', halfW: 7.5, curb: 1.1, wall: 11.5, cps: 6,
  pts: [[-780, -470], [-900, -470], [-1010, -472], [-1050, -500], [-1055, -560], [-1030, -600], [-1050, -650], [-1010, -690], [-950, -680], [-930, -620], [-880, -600], [-850, -660], [-790, -690], [-735, -660], [-728, -590], [-725, -520], [-745, -478]],
  entrance: { x: -860, z: -428 }, gap: { x0: -871, x1: -849, z0: -476 },
};
const inGap = (x, z) => x > TRACK.gap.x0 && x < TRACK.gap.x1 && z > TRACK.gap.z0;

function ribbonGeo(T, o0, o1, y, vs, keep) { // faixa ao longo da pista entre os afastamentos o0..o1 (direita +)
  const pos = [], uv = [], idx = []; const N = T.N; let vtx = 0, run = false;
  for (let i = 0; i <= N; i++) {
    const j = i % N; const ok = !keep || keep(j);
    if (!ok) { run = false; continue; }
    const cx = T.px[j], cz = T.pz[j], rx = T.rx[j], rz = T.rz[j], v = i * T.ds / vs;
    pos.push(cx + rx * o0, y, cz + rz * o0, cx + rx * o1, y, cz + rz * o1); uv.push(0, v, 1, v);
    if (run) { const a = vtx - 2, b = vtx - 1, c = vtx, d = vtx + 1; idx.push(a, c, b, b, c, d); }
    vtx += 2; run = true;
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  g.computeVertexNormals(); // corrige a orientação para cima
  const n = g.attributes.normal; if (n.count && n.getY(0) < 0) { const ix = g.index.array; for (let k = 0; k < ix.length; k += 3) { const t = ix[k + 1]; ix[k + 1] = ix[k + 2]; ix[k + 2] = t; } g.computeVertexNormals(); }
  return g;
}

export class Track {
  constructor(scene, Q) {
    this.Q = Q; const D = TRACK;
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
    for (let i = 0; i < N; i++) raw[i] = -angDiff(this.h[(i - 2 + N) % N], this.h[(i + 2) % N]) / (4 * this.ds); // + = curva à direita
    for (let i = 0; i < N; i++) { let s = 0; for (let k = -6; k <= 6; k++) s += raw[(i + k + N) % N]; this.kap[i] = s / 13; }
    // grade espacial para achar o ponto mais próximo da pista
    this.cell = 24; this.grid = new Map();
    for (let i = 0; i < N; i++) { const k = Math.floor(this.px[i] / this.cell) + ',' + Math.floor(this.pz[i] / this.cell); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(i); }
    this.cpIdx = []; for (let k = 0; k < D.cps; k++) this.cpIdx.push(Math.round(k * N / D.cps) % N);
    this.group = new THREE.Group(); scene.add(this.group);
    this.build(Q);
    // física: asfalto da pista tem aderência total (zebras e área de escape um pouco menos)
    HOOKS.surfs.push((x, z) => { if (!inTrackZone(x, z, 4)) return null; const r = this.locate(x, z); if (!r) return null; const a = Math.abs(r.lat); return a <= D.halfW + D.curb ? 1 : a <= D.wall + 1 ? 0.9 : null; });
    HOOKS.map.push((g, X, Z) => {
      const k = X(1) - X(0); g.lineJoin = 'round';
      const path = () => { g.beginPath(); for (let i = 0; i <= N; i++) { const j = i % N; i ? g.lineTo(X(this.px[j]), Z(this.pz[j])) : g.moveTo(X(this.px[j]), Z(this.pz[j])); } g.closePath(); };
      g.strokeStyle = '#ff4fb8'; g.lineWidth = (D.halfW * 2 + 4) * k; path(); g.stroke();
      g.strokeStyle = '#2c2f37'; g.lineWidth = D.halfW * 2 * k; path(); g.stroke();
      g.strokeStyle = '#3b3f47'; g.lineWidth = 9 * k; g.beginPath(); g.moveTo(X(D.entrance.x), Z(D.entrance.z + 8)); g.lineTo(X(D.entrance.x), Z(-466)); g.stroke();
      const i0 = 0; g.strokeStyle = '#fff'; g.lineWidth = 3 * k; g.beginPath(); g.moveTo(X(this.px[i0] + this.rx[i0] * D.halfW), Z(this.pz[i0] + this.rz[i0] * D.halfW)); g.lineTo(X(this.px[i0] - this.rx[i0] * D.halfW), Z(this.pz[i0] - this.rz[i0] * D.halfW)); g.stroke();
    });
  }
  // ponto mais próximo: {i, lat (+ = direita), s (m desde a largada), d}
  locate(x, z, hint) {
    let best = -1, bd = 1e18; const N = this.N;
    if (hint != null && hint >= 0) { for (let k = -30; k <= 30; k++) { const i = (hint + k + N) % N; const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } if (bd > 60 * 60) best = -1; }
    if (best < 0) {
      bd = 1e18; const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = this.grid.get((cx + a) + ',' + (cz + b)); if (arr) for (const i of arr) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } }
      if (best < 0) return null;
    }
    const dx = x - this.px[best], dz = z - this.pz[best]; const fx = Math.sin(this.h[best]), fz = Math.cos(this.h[best]);
    const along = dx * fx + dz * fz; let s = best * this.ds + along; if (s < 0) s += this.L; if (s >= this.L) s -= this.L;
    return { i: best, lat: dx * this.rx[best] + dz * this.rz[best], s, d: Math.sqrt(bd) };
  }
  at(s, lat = 0) { // posição/direção numa distância s ao longo da pista
    const L = this.L; s = ((s % L) + L) % L; const f = s / this.ds; const i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f);
    const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    const h = this.h[i] + angDiff(this.h[i], this.h[j]) * t, rx = -Math.cos(h), rz = Math.sin(h);
    return { x: x + rx * lat, z: z + rz * lat, h, i, k: this.kap[i] + (this.kap[j] - this.kap[i]) * t };
  }
  build(Q) {
    const D = TRACK, G = this.group, N = this.N, aniso = Q.aniso;
    const R = rng(4242);
    // asfalto
    const asph = canvasTex(256, 512, (g, w, h) => {
      g.fillStyle = '#2f3138'; g.fillRect(0, 0, w, h); const r = rng(5);
      for (let i = 0; i < 9000; i++) { const v = (r() - 0.5) * 0.16; g.fillStyle = v > 0 ? `rgba(255,255,255,${v})` : `rgba(0,0,0,${-v})`; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
      const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0.25, 'rgba(0,0,0,0)'); gr.addColorStop(0.42, 'rgba(0,0,0,.18)'); gr.addColorStop(0.58, 'rgba(0,0,0,.18)'); gr.addColorStop(0.75, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); // linha de borracha
      g.fillStyle = '#f2f2f2'; g.fillRect(4, 0, 7, h); g.fillRect(w - 11, 0, 7, h);
    }, { aniso });
    const roadM = new THREE.MeshStandardMaterial({ map: asph, roughness: 0.82, metalness: 0.05 }); this.roadM = roadM;
    const road = new THREE.Mesh(ribbonGeo(this, -D.halfW, D.halfW, 0.04, 14), roadM); road.receiveShadow = true; G.add(road);
    const runM = new THREE.MeshStandardMaterial({ color: 0x3d4149, roughness: 0.95 });
    for (const sd of [-1, 1]) { const g = ribbonGeo(this, sd > 0 ? D.halfW - 0.2 : -(D.wall + 0.3), sd > 0 ? D.wall + 0.3 : -(D.halfW - 0.2), 0.032, 10); const m = new THREE.Mesh(g, runM); m.receiveShadow = true; G.add(m); }
    // zebras nas curvas (vermelho e branco)
    const curbT = canvasTex(32, 64, (g, w, h) => { g.fillStyle = '#e8202a'; g.fillRect(0, 0, w, h / 2); g.fillStyle = '#f5f5f5'; g.fillRect(0, h / 2, w, h / 2); }, { aniso });
    const curbM = new THREE.MeshStandardMaterial({ map: curbT, roughness: 0.6 });
    const corner = (i) => Math.abs(this.kap[i]) > 1 / 150;
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(ribbonGeo(this, sd > 0 ? D.halfW : -D.halfW - D.curb, sd > 0 ? D.halfW + D.curb : -D.halfW, 0.05, 3, corner), curbM); m.receiveShadow = true; G.add(m); }
    // muros de concreto com faixa neon em cima (colisão por círculos)
    const segs = []; const step = 2;
    for (const sd of [-1, 1]) for (let i = 0; i < N; i += step) {
      const j = (i + step) % N; const o = sd * D.wall;
      const ax = this.px[i] + this.rx[i] * o, az = this.pz[i] + this.rz[i] * o, bx = this.px[j] + this.rx[j] * o, bz = this.pz[j] + this.rz[j] * o;
      const mx = (ax + bx) / 2, mz = (az + bz) / 2; if (inGap(mx, mz)) continue;
      segs.push([mx, mz, Math.atan2(bx - ax, bz - az), Math.hypot(bx - ax, bz - az) + 0.08, sd, segs.length]);
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 1.0); for (let k = 0; k < n; k++) { const t = k / n; addCircle(ax + (bx - ax) * t, az + (bz - az) * t, 0.5); }
    }
    const wallM = new THREE.MeshStandardMaterial({ roughness: 0.7, vertexColors: false }); const neonM = new THREE.MeshBasicMaterial({ toneMapped: false }); this.neonM = neonM;
    const wallI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.6, 0.95, 1).translate(0, 0.475, 0), wallM, segs.length);
    const neonI = new THREE.InstancedMesh(new THREE.BoxGeometry(0.64, 0.07, 1).translate(0, 0.98, 0), neonM, segs.length);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), p3 = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
    const red = C(0xd8242c), white = C(0xf0f0f0), cyan = C(0x29f0ff), pink = C(0xff2bd6);
    for (const [x, z, a, len, sd, k] of segs) { q.setFromAxisAngle(up, a); sc.set(1, 1, len); p3.set(x, 0, z); m4.compose(p3, q, sc); wallI.setMatrixAt(k, m4); neonI.setMatrixAt(k, m4); wallI.setColorAt(k, (k >> 1) % 2 ? red : white); neonI.setColorAt(k, sd > 0 ? pink : cyan); }
    wallI.castShadow = Q.level !== 'low'; wallI.receiveShadow = true; G.add(wallI, neonI);
    // pórtico de largada/chegada com 5 luzes
    const i0 = 0, h0 = this.h[i0], gx = this.px[i0], gz = this.pz[i0];
    const gant = new THREE.Group(); gant.position.set(gx, 0, gz); gant.rotation.y = h0; G.add(gant);
    const steel = new THREE.MeshStandardMaterial({ color: 0x1d1f26, roughness: 0.4, metalness: 0.7 });
    for (const sd of [-1, 1]) { const pl = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8, 0.9), steel); pl.position.set(sd * (D.wall + 0.8), 4, 0); gant.add(pl); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(D.wall * 2 + 2.6, 1.6, 0.9), steel); beam.position.y = 7.4; gant.add(beam);
    const ban = canvasTex(1024, 128, (g, w, h) => { g.fillStyle = '#120a22'; g.fillRect(0, 0, w, h); for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#fff' : '#111'; g.fillRect(i * 16, j * 64, 16, 64); g.fillRect(w - 256 + i * 16, j * 64, 16, 64); } g.font = 'italic 900 64px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff2bd6'; g.shadowBlur = 18; g.fillStyle = '#fff'; g.fillText('AUTÓDROMO NEON', w / 2, h / 2 + 2); }, { clamp: true, aniso });
    const banM = new THREE.MeshBasicMaterial({ map: ban, toneMapped: false }); this.banM = banM;
    for (const sd of [-1, 1]) { const b = new THREE.Mesh(new THREE.PlaneGeometry(D.wall * 2 + 2.4, 1.4), banM); b.position.set(0, 7.4, sd * 0.47); if (sd < 0) b.rotation.y = Math.PI; gant.add(b); }
    this.lights = [];
    for (let k = 0; k < 5; k++) { const hs = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.9, 0.5), steel); hs.position.set((k - 2) * 1.4, 5.9, -0.55); gant.add(hs); const m = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 8), new THREE.MeshBasicMaterial({ color: 0x301010, toneMapped: false })); m.position.set((k - 2) * 1.4, 5.9, -0.85); gant.add(m); this.lights.push(m); }
    // linha quadriculada e caixas do grid
    const chk = canvasTex(256, 32, (g, w, h) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { g.fillStyle = (i + j) % 2 ? '#f4f4f4' : '#151515'; g.fillRect(i * 16, j * 16, 16, 16); } }, { clamp: true, aniso });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(D.halfW * 2, 2).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.7, polygonOffset: true, polygonOffsetFactor: -2 }));
    line.position.set(gx, 0.055, gz); line.rotation.y = h0; G.add(line);
    const gridM = new THREE.MeshBasicMaterial({ color: 0xe8e8e8, polygonOffset: true, polygonOffsetFactor: -2 });
    for (let k = 0; k < 4; k++) { const g = this.gridSlot(k); const b = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.25).rotateX(-Math.PI / 2), gridM); const p = this.at(g.s + 2.6, g.lat); b.position.set(p.x, 0.055, p.z); b.rotation.y = p.h; G.add(b); }
    // arcos neon dos checkpoints
    this.arches = [];
    const archG = new THREE.TorusGeometry(D.wall + 0.3, 0.32, 8, 40, Math.PI);
    for (let k = 1; k < D.cps; k++) { const i = this.cpIdx[k]; const m = new THREE.Mesh(archG, new THREE.MeshBasicMaterial({ color: k % 2 ? 0x29f0ff : 0xff2bd6, toneMapped: false, transparent: true, opacity: 0.9 })); m.position.set(this.px[i], 0, this.pz[i]); m.rotation.y = this.h[i]; m.userData.base = k % 2 ? 0x29f0ff : 0xff2bd6; G.add(m); this.arches.push(m); }
    // arquibancada com torcida — FORA da reta (eixo longo ao longo da pista, recuada da parede)
    {
      const st = new THREE.Group(); const sm = new THREE.MeshStandardMaterial({ color: 0xb8b2a8, roughness: 0.9 }); const ix = 70; // ~140 m depois da largada
      // origem a (wall+6) do centro: a primeira fileira fica ~4 m do lado de fora da parede (wall=11.5)
      const p = this.at(ix * this.ds, -(D.wall + 6)); st.position.set(p.x, 0, p.z); st.rotation.y = p.h; G.add(st);
      // BoxGeometry(profundidade em X / para fora, altura, comprimento em Z / ao longo da pista)
      for (let r = 0; r < 4; r++) { const hgt = 0.8 + r * 0.8; const b = new THREE.Mesh(new THREE.BoxGeometry(1.6, hgt, 56), sm); b.position.set(r * 1.6, hgt / 2, 0); st.add(b); }
      const roof = new THREE.Mesh(new THREE.BoxGeometry(8, 0.3, 58), steel); roof.position.set(2.6, 6.6, 0); st.add(roof);
      for (const sz of [-28, 0, 28]) { const c = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.6, 0.4), steel); c.position.set(6.2, 3.3, sz); st.add(c); }
      const edge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 58), neonM); edge.position.set(-0.85, 6.45, 0); st.add(edge);
      const n = Q.level === 'low' ? 120 : 260; const fans = new THREE.InstancedMesh(new THREE.BoxGeometry(0.35, 0.8, 0.45).translate(0, 0.4, 0), new THREE.MeshStandardMaterial({ roughness: 0.8 }), n);
      const cols = [0xff4fb8, 0x29f0ff, 0xffd23f, 0xffffff, 0xff8a3c, 0x7d6cf0, 0x46c08c, 0xe85d5d];
      for (let i = 0; i < n; i++) { const r = Math.floor(R() * 4); m4.makeTranslation(r * 1.6, 0.8 + r * 0.8, -27 + R() * 54); fans.setMatrixAt(i, m4); fans.setColorAt(i, C(cols[Math.floor(R() * cols.length)])); }
      st.add(fans); this.fans = fans; this.stand = st;
    }
    // torres de luz (brilho à noite)
    const glow = []; const pole = new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.5, metalness: 0.6 });
    const towerG = new THREE.CylinderGeometry(0.18, 0.26, 14, 6).translate(0, 7, 0), headG = new THREE.BoxGeometry(2.4, 0.5, 0.6);
    this.lampM = new THREE.MeshBasicMaterial({ color: 0xfff1d0, toneMapped: false });
    for (let k = 0; k < 10; k++) { const s = (k + 0.3) / 10 * this.L; const sd = k % 2 ? 1 : -1; const p = this.at(s, sd * (D.wall + 2.2)); if (inGap(p.x, p.z)) continue; const t = new THREE.Mesh(towerG, pole); t.position.set(p.x, 0, p.z); G.add(t); const hd = new THREE.Mesh(headG, this.lampM); hd.position.set(p.x, 14, p.z); hd.rotation.y = p.h; G.add(hd); glow.push(p.x, 14, p.z); }
    const gt = canvasTex(64, 64, (g) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,245,220,1)'); gr.addColorStop(0.3, 'rgba(255,220,160,.5)'); gr.addColorStop(1, 'rgba(255,200,120,0)'); g.fillStyle = gr; g.fillRect(0, 0, 64, 64); }, { clamp: true });
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.Float32BufferAttribute(glow, 3));
    this.glowM = new THREE.PointsMaterial({ size: 12, map: gt, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false }); const pts = new THREE.Points(gg, this.glowM); pts.frustumCulled = false; G.add(pts);
    // acesso pela Estrada do Pântano
    const acc = new THREE.Mesh(new THREE.PlaneGeometry(13, 50).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: asph.clone(), roughness: 0.85 }));
    acc.material.map.repeat.set(1, 3); acc.material.map.needsUpdate = true; acc.position.set(D.entrance.x, 0.028, -440); acc.receiveShadow = true; G.add(acc);
    // placa grande na entrada
    const sign = canvasTex(512, 128, (g, w, h) => { g.clearRect(0, 0, w, h); g.font = 'italic 900 56px "Arial Black",Impact,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#29f0ff'; g.shadowBlur = 20; g.lineWidth = 5; g.strokeStyle = '#7ff8ff'; g.strokeText('AUTÓDROMO', w / 2, h / 2); g.fillStyle = '#fff'; g.fillText('AUTÓDROMO', w / 2, h / 2); }, { clamp: true });
    const sg = new THREE.Sprite(new THREE.SpriteMaterial({ map: sign, transparent: true, toneMapped: false, fog: false })); sg.scale.set(16, 4, 1); sg.position.set(D.entrance.x, 10, D.entrance.z - 8); G.add(sg);
    // cones nas curvas fechadas (lado de dentro): voam quando o carro encosta
    const conePos = [];
    for (let i = 0; i < N; i++) { const k = Math.abs(this.kap[i]); if (k < 1 / 48) continue; if (k < Math.abs(this.kap[(i + 1) % N]) || k < Math.abs(this.kap[(i - 1 + N) % N])) continue; const sd = Math.sign(this.kap[i]); for (let c = -2; c <= 2; c++) { const p = this.at(i * this.ds + c * 2.4, sd * (D.halfW + D.curb + 0.9)); conePos.push([p.x, p.z]); } }
    const cg = new THREE.ConeGeometry(0.28, 0.75, 10).translate(0, 0.375, 0); const cb = new THREE.BoxGeometry(0.62, 0.05, 0.62).translate(0, 0.025, 0);
    const cone = mergeCone(cg, cb);
    this.cones = conePos.map(([x, z]) => ({ x, z, x0: x, z0: z, y: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, wx: 0, wz: 0, moving: false }));
    this.coneMesh = new THREE.InstancedMesh(cone, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), Math.max(1, this.cones.length)); this.coneMesh.castShadow = Q.level !== 'low';
    this.cones.forEach((c, i) => { m4.makeTranslation(c.x, 0, c.z); this.coneMesh.setMatrixAt(i, m4); }); G.add(this.coneMesh);
    this.center = { x: -890, z: -580 };
  }
  gridSlot(k) { return { s: this.L - 14 - k * 8, lat: k % 2 ? -3.4 : 3.4 }; }
  setLights(n, green) { this.lights.forEach((m, k) => m.material.color.set(green ? 0x22ff66 : k < n ? 0xff2020 : 0x301010).multiplyScalar(green || k < n ? 2.5 : 1)); }
  highlight(k) { this.hl = k; }
  resetCones() { const m4 = new THREE.Matrix4(); this.cones.forEach((c, i) => { Object.assign(c, { x: c.x0, z: c.z0, y: 0, vx: 0, vy: 0, vz: 0, rx: 0, rz: 0, wx: 0, wz: 0, moving: false }); m4.makeTranslation(c.x, 0, c.z); this.coneMesh.setMatrixAt(i, m4); }); this.coneMesh.instanceMatrix.needsUpdate = true; this.knocked = 0; }
  update(dt, t, night, cam, cars) {
    const near = Math.hypot(cam.x - this.center.x, cam.z - this.center.z) < 720; this.group.visible = near; if (!near) return;
    this.neonM.color.setScalar(0.6 + night * 2.2); this.banM.color.setScalar(0.7 + night * 1.6); this.lampM.color.set(0xfff1d0).multiplyScalar(0.3 + night * 3); this.glowM.opacity = night * 0.8;
    this.arches.forEach((a, k) => { const on = this.hl === k + 1; const pulse = on ? 1.6 + Math.sin(t * 8) * 0.6 : 0.7 + night * 1.4; a.material.color.set(a.userData.base).multiplyScalar(pulse); a.scale.setScalar(on ? 1 + Math.sin(t * 8) * 0.015 : 1); });
    // cones
    let dirty = false; const m4 = this._m4 || (this._m4 = new THREE.Matrix4()), e = this._e || (this._e = new THREE.Euler()), q = this._q || (this._q = new THREE.Quaternion()), p = this._p || (this._p = new THREE.Vector3()), one = this._one || (this._one = new THREE.Vector3(1, 1, 1));
    for (let i = 0; i < this.cones.length; i++) {
      const c = this.cones[i];
      if (!c.moving) { for (const v of cars) { if (!v) continue; const dx = c.x - v.x, dz = c.z - v.z; if (dx * dx + dz * dz < 2.6 * 2.6) { const sp = v.speed; if (sp < 2) continue; const d = Math.hypot(dx, dz) || 1; c.vx = v.vx * 0.7 + dx / d * 3; c.vz = v.vz * 0.7 + dz / d * 3; c.vy = 2.5 + sp * 0.12; c.wx = (Math.random() - 0.5) * 14; c.wz = (Math.random() - 0.5) * 14; c.moving = true; this.knocked = (this.knocked || 0) + 1; if (this.onKnock) this.onKnock(c); break; } } }
      if (!c.moving) continue;
      c.vy -= 18 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.wx * dt; c.rz += c.wz * dt;
      if (c.y <= 0) { c.y = 0; c.vy = -c.vy * 0.3; c.vx *= 0.6; c.vz *= 0.6; c.wx *= 0.6; c.wz *= 0.6; if (Math.abs(c.vy) < 0.6 && Math.hypot(c.vx, c.vz) < 0.4) { c.moving = false; c.vy = 0; c.rx = Math.PI / 2 * Math.sign(c.rx || 1); } }
      e.set(c.rx, 0, c.rz); q.setFromEuler(e); p.set(c.x, c.y + (c.moving ? 0.3 : 0.28 * Math.abs(Math.sin(c.rx))), c.z); m4.compose(p, q, one); this.coneMesh.setMatrixAt(i, m4); dirty = true;
    }
    if (dirty) this.coneMesh.instanceMatrix.needsUpdate = true;
  }
}
function mergeCone(cg, cb) {
  const parts = [[cg, null], [cb, 0x222222]]; const pos = [], nor = [], col = [];
  for (const [g0, hex] of parts) { const g = g0.toNonIndexed(); const P = g.attributes.position, Nn = g.attributes.normal; for (let i = 0; i < P.count; i++) { const y = P.getY(i); pos.push(P.getX(i), y, P.getZ(i)); nor.push(Nn.getX(i), Nn.getY(i), Nn.getZ(i)); const c = C(hex ?? (y > 0.28 && y < 0.46 ? 0xf5f5f5 : 0xff6a00)); col.push(c.r, c.g, c.b); } }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
}
