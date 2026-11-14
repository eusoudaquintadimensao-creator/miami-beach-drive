// Ponte do Mar: pista de drift de ~9,3 km sobre o mar (S, grampos, curvas longas e sobe-desce suave), com rampa
// saindo da Ocean Drive, mureta, postes, neon e vista do mar. Geometria em trechos (~180 m) construídos sob demanda,
// recorte por distância + LOD distante único (silhueta e neon), para ficar leve no celular.
// Em toda sessão, 5 pilotos da IA (carros tunados, carrocerias diferentes) fazem tandem perto do jogador
// (elástico, nunca bloqueiam), com fumaça, marcas de pneu e rádio falado. Placar, tempo de volta e recorde locais.
import * as THREE from 'three';
import { canvasTex, C, clamp, angDiff } from './util.js';
import { HOOKS } from './world.js';
import { Vehicle, raceTune, randomTune } from './vehicles.js';
import { respawnFade } from './driveui.js';
import { onPier } from './world.js';
import { Radio } from './radio.js';
const $ = (id) => document.getElementById(id);

// ---- tema (o Neon Distrito troca só este bloco)
export const PONTE = {
  key: 'mbd-ponte-v1', name: 'Ponte do Mar', title: 'PONTE DO MAR', icon: '🌉',
  neonL: 0xff4fb8, neonR: 0x29f0ff, lamp: 0xffd2a0, deck: 0x2d3038, concrete: 0xc9c2b6, barrier: 0xe2ddd3, gateCss: '#ff4fb8',
  drivers: [
    { id: 'bia', name: 'Bia Kaze', type: 'rc_jdm', liv: 0, style: 'JDM' },
    { id: 'tche', name: 'Tchê Trovão', type: 'rc_muscle', liv: 1, style: 'muscle' },
    { id: 'duda', name: 'Duda Faísca', type: 'rc_gt', liv: 2, style: 'GT' },
    { id: 'valdo', name: 'Seu Valdo', type: 'pickup', paint: 0x2f7d4a, glow: 0xffd23f, style: 'picape' },
    { id: 'lipe', name: 'Lipe Besouro', type: 'classic', paint: 0xffc61a, glow: 0xff4fb8, style: 'hatch' },
  ],
};
const LAPS = 2;
// ritmo de drift (de lado, sem tirar de grip): ~72 km/h nas retas em S e aceleração lateral menor que no grip
const DRIFT_PACE = { cruise: 20, lat: 6 };
const HALF_W = 9; // meia largura do asfalto (tabuleiro de 18 m)
const RAMP_W = 7;
const DS = 3;
// laço gerado em /workspace/ponte/design2.py: 4 passagens N–S em S (senoide 95 m / 440 m), 3 grampos e retorno em S suaves; ≈11,3 km
const LOOP_PTS = [
  [515, 700], [515, 650], [515, 600], [518, 550], [528.5, 500], [519.6, 450], [489.3, 400], [469.4, 350],
  [471.8, 300], [495.3, 250], [528.4, 200], [555, 150], [562, 100], [546.1, 50], [515, 0], [483.9, -50],
  [468, -100], [475, -150], [501.6, -200], [534.7, -250], [558.2, -300], [560.6, -350], [540.7, -400], [508.2, -450],
  [479.1, -500], [467.5, -550], [479.1, -600], [508.2, -650], [540.7, -700], [557.7, -750], [542, -800], [521.2, -850],
  [515, -900], [530, -960], [548, -1012], [590, -1022], [615, -985], [640, -900], [790, -820], [820, -769.4],
  [834.7, -718.8], [800.6, -668.2], [736, -617.6], [697.8, -567.1], [705.7, -516.5], [755.7, -465.9], [822.8, -415.3], [873.6, -364.7],
  [882.6, -314.1], [845.3, -263.5], [780.4, -212.9], [720.3, -162.4], [695, -111.8], [717.2, -61.2], [775.7, -10.6], [841.4, 40],
  [881.4, 90.6], [875.7, 141.2], [827.3, 191.8], [760.2, 242.4], [708, 292.9], [696.8, 343.5], [732.1, 394.1], [796.4, 444.7],
  [857.5, 495.3], [884.8, 545.9], [864.8, 596.5], [807.5, 647.1], [741.4, 697.6], [704.2, 748.2], [734.9, 798.8], [777.3, 849.4],
  [790, 900], [812, 940], [838, 975], [878, 985], [902, 945], [925, 880], [1060, 820], [1030.3, 770],
  [1015.1, 720], [1047.3, 670], [1111.4, 620], [1151.2, 570], [1146.4, 520], [1099.5, 470], [1033.2, 420], [980.1, 370],
  [966, 320], [997.8, 270], [1060, 220], [1122.2, 170], [1154, 120], [1139.9, 70], [1086.8, 20], [1020.5, -30],
  [973.6, -80], [968.8, -130], [1008.6, -180], [1073.5, -230], [1131.8, -280], [1155, -330], [1131.8, -380], [1073.5, -430],
  [1008.6, -480], [968.8, -530], [973.6, -580], [1020.5, -630], [1086.8, -680], [1134.9, -730], [1118.8, -780], [1079.4, -830],
  [1060, -880], [1092, -935], [1118, -1005], [1158, -1012], [1185, -975], [1210, -900], [1350, -820], [1380.2, -769.1],
  [1394.7, -718.3], [1359.6, -667.4], [1294.8, -616.6], [1257.4, -565.7], [1266.7, -514.9], [1318.1, -464], [1385.5, -413.1], [1435.1, -362.3],
  [1441.7, -311.4], [1402, -260.6], [1336.1, -209.7], [1277.2, -158.9], [1255, -108], [1280.8, -57.1], [1341.5, -6.3], [1406.5, 44.6],
  [1443, 95.4], [1432.5, 146.3], [1380.5, 197.1], [1313, 248], [1264.2, 298.9], [1258.7, 349.7], [1299.3, 400.6], [1365.4, 451.4],
  [1423.8, 502.3], [1444.9, 553.1], [1418.1, 604], [1357, 654.9], [1292.3, 705.7], [1256.7, 756.6], [1272, 807.4], [1331.6, 858.3],
  [1362.2, 909.1], [1350, 960], [1340, 1010], [1300, 1070], [1220, 1106.4], [1170, 1078.5], [1120, 1067.2], [1070, 1083.6],
  [1020, 1111.5], [970, 1122.8], [920, 1106.4], [870, 1078.5], [820, 1067.2], [770, 1083.6], [720, 1111.5], [670, 1122.8],
  [570, 1060], [535, 975], [518, 880]];
// rampa: continua a Ocean Drive (x = 300) no extremo sul e sobe por cima da água até a ponte
const RAMP_PTS = [[300, 626], [301, 668], [316, 730], [360, 778], [425, 806], [488, 814], [521, 812]];
export const GATE = { x: 300, z: 632 };
const loopH = (s) => 9.5 + 2.2 * Math.sin(s / 1550 * Math.PI * 2) + 1.1 * Math.sin(s / 610 * Math.PI * 2 + 1);

class Path {
  constructor(pts, closed, hFn) {
    const curve = new THREE.CatmullRomCurve3(pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
    curve.arcLengthDivisions = 6000;
    const L = curve.getLength(), N = Math.max(4, Math.round(L / DS)); this.closed = closed; this.L = L; this.N = N; this.ds = L / N;
    const P = curve.getSpacedPoints(N); const M = this.M = closed ? N : N + 1;
    this.px = new Float32Array(M); this.pz = new Float32Array(M); this.py = new Float32Array(M); this.h = new Float32Array(M); this.rx = new Float32Array(M); this.rz = new Float32Array(M); this.kap = new Float32Array(M);
    for (let i = 0; i < M; i++) { this.px[i] = P[i].x; this.pz[i] = P[i].z; }
    for (let i = 0; i < M; i++) {
      const a = this.id(i - 1), b = this.id(i + 1); const tx = this.px[b] - this.px[a], tz = this.pz[b] - this.pz[a], l = Math.hypot(tx, tz) || 1;
      this.h[i] = Math.atan2(tx, tz); this.rx[i] = -tz / l; this.rz[i] = tx / l;
    }
    const raw = new Float32Array(M);
    for (let i = 0; i < M; i++) raw[i] = -angDiff(this.h[this.id(i - 2)], this.h[this.id(i + 2)]) / (4 * this.ds);
    for (let i = 0; i < M; i++) { let s = 0; for (let k = -5; k <= 5; k++) s += raw[this.id(i + k)]; this.kap[i] = s / 11; }
    for (let i = 0; i < M; i++) this.py[i] = hFn(i * this.ds, this);
    this.cell = 24; this.grid = new Map();
    for (let i = 0; i < M; i++) { const k = Math.floor(this.px[i] / this.cell) + ',' + Math.floor(this.pz[i] / this.cell); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(i); }
  }
  id(i) { return this.closed ? ((i % this.N) + this.N) % this.N : clamp(i, 0, this.M - 1); }
  locate(x, z, hint) {
    let best = -1, bd = 1e18;
    if (hint != null && hint >= 0) { for (let k = -24; k <= 24; k++) { const i = this.id(hint + k); const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } if (bd > 40 * 40) best = -1; }
    if (best < 0) {
      bd = 1e18; const cx = Math.floor(x / this.cell), cz = Math.floor(z / this.cell);
      for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const arr = this.grid.get((cx + a) + ',' + (cz + b)); if (arr) for (const i of arr) { const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } }
      if (best < 0) return null;
    }
    const dx = x - this.px[best], dz = z - this.pz[best]; const fx = Math.sin(this.h[best]), fz = Math.cos(this.h[best]);
    const along = dx * fx + dz * fz; let s = best * this.ds + along;
    if (this.closed) { if (s < 0) s += this.L; if (s >= this.L) s -= this.L; }
    const j = along >= 0 ? this.id(best + 1) : this.id(best - 1); const f = clamp(Math.abs(along) / this.ds, 0, 1);
    return { i: best, lat: dx * this.rx[best] + dz * this.rz[best], s, d: Math.sqrt(bd), y: this.py[best] + (this.py[j] - this.py[best]) * f, along };
  }
  at(s, lat = 0) {
    const L = this.L; if (this.closed) s = ((s % L) + L) % L; else s = clamp(s, 0, L);
    const f = s / this.ds; const i = this.id(Math.floor(f)), j = this.id(Math.floor(f) + 1), t = f - Math.floor(f);
    const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t;
    const h = this.h[i] + angDiff(this.h[i], this.h[j]) * t, rx = -Math.cos(h), rz = Math.sin(h);
    return { x: x + rx * lat, z: z + rz * lat, y: this.py[i] + (this.py[j] - this.py[i]) * t, h, i, k: this.kap[i] + (this.kap[j] - this.kap[i]) * t };
  }
}
function loadData() { try { return JSON.parse(localStorage.getItem(PONTE.key) || 'null'); } catch (e) { return null; } }
function saveData(d) { try { localStorage.setItem(PONTE.key, JSON.stringify(d)); } catch (e) { } }
const fmtT = (t) => { if (!(t > 0)) return '--:--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(1); };
const wrapD = (d, L) => { if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; };

export class SeaBridge {
  constructor(G) {
    this.G = G; this.Q = G.Q; const low = G.Q.level === 'low';
    this.loop = new Path(LOOP_PTS, true, loopH); this.L = this.loop.L;
    const endLoc = this.loop.locate(RAMP_PTS[RAMP_PTS.length - 1][0], RAMP_PTS[RAMP_PTS.length - 1][1]);
    this.junctionS = endLoc.s; const hEnd = endLoc.y;
    this.ramp = new Path(RAMP_PTS, false, (s, P) => { const u = clamp((s / P.L - 0.1) / 0.78, 0, 1); return hEnd * u * u * (3 - 2 * u); });
    this.halfW = HALF_W; this.rampW = RAMP_W;
    this.group = new THREE.Group(); this.group.name = 'ponte'; G.scene.add(this.group);
    this.nearD = low ? 340 : G.Q.level === 'high' ? 820 : 560;
    this.data = Object.assign({ bestLap: 0, bestScore: 0, runs: 0, laps: 0 }, loadData() || {});
    this.cars = []; this.on = false; this.hint = -1; this.lap = 0; this.lapStart = 0; this.prog = 0; this.lastS = null; this.leftT = 0; this.stuckT = 0;
    this.names = {}; for (const d of PONTE.drivers) this.names[d.id] = d.name;
    this.radio = new Radio(G, this.names); this.banterT = 30; this.stats = { aiSmoke: 0, aiDriftFrames: 0, frames: 0 };
    this.build(G.Q);
    HOOKS.grounds.push((x, z) => this.groundAt(x, z));
    HOOKS.surfs.push((x, z) => (this.onDeck(x, z) ? 1.05 : null));
    HOOKS.map.push((g, X, Z) => this.drawMap(g, X, Z));
    this.estimate = this.lapEstimate();
  }
  // ---------------- tabuleiro (física) ----------------
  _deck(x, z) {
    if (x < 286 || x > 1470 || z < -1060 || z > 1150) return null;
    if (onPier(x, z)) return null; // o píer da praia fica embaixo/ao lado: quem anda nele não sobe para o tabuleiro
    const r = this.loop.locate(x, z, this._gh); if (r && r.d < 40 && Math.abs(r.lat) <= HALF_W + 0.55) { this._gh = r.i; return r; }
    if (x < 540 && z > 610 && z < 840) { const q = this.ramp.locate(x, z); if (q && q.d < 30 && Math.abs(q.lat) <= RAMP_W + 0.5 && q.s > -1 && q.s < this.ramp.L + 1) return q; }
    return null;
  }
  groundAt(x, z) { const r = this._deck(x, z); return r ? r.y + 0.2 : null; }
  onDeck(x, z) { return !!this._deck(x, z); }
  // tempo estimado de volta no ritmo de drift "normal" (mesmo modelo de velocidade da IA quando lidera)
  lapEstimate() {
    const P = this.loop; let t = 0; const v = new Float32Array(P.N);
    for (let i = 0; i < P.N; i++) { let vm = DRIFT_PACE.cruise; for (let d = 0; d <= 60; d += 6) { const k = Math.abs(P.kap[P.id(i + d / DS)]); if (k > 1e-4) vm = Math.min(vm, Math.sqrt(DRIFT_PACE.lat / k + 2 * 7 * d)); } v[i] = Math.max(9, vm); }
    for (let i = 0; i < P.N; i++) t += P.ds / v[i];
    return { L: P.L, t, avg: P.L / t };
  }
  get cruise() { return 24; } // m/s de cruzeiro em drift (≈86 km/h) nas retas
  // ---------------- visual ----------------
  build(Q) {
    const low = Q.level === 'low';
    this.mSolid = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.06, side: THREE.DoubleSide });
    this.mGlow = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, side: THREE.DoubleSide });
    const poolTex = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(255,220,170,0.9)'); r.addColorStop(0.5, 'rgba(255,200,140,0.35)'); r.addColorStop(1, 'rgba(255,190,120,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
    this.mPool = new THREE.MeshBasicMaterial({ map: poolTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, toneMapped: false, polygonOffset: true, polygonOffsetFactor: -2 });
    // trechos próximos (construídos sob demanda)
    const CH = 60; this.chunks = [];
    for (const [P, kind] of [[this.loop, 'loop'], [this.ramp, 'ramp']]) {
      const n = P.closed ? P.N : P.M - 1;
      for (let a = 0; a < n; a += CH) { const b = Math.min(n, a + CH); let cx = 0, cz = 0, cy = 0; for (let i = a; i <= b; i++) { const j = P.id(i); cx += P.px[j]; cz += P.pz[j]; cy += P.py[j]; } const m = b - a + 1; cx /= m; cz /= m; cy /= m; let r = 0; for (let i = a; i <= b; i++) { const j = P.id(i); r = Math.max(r, Math.hypot(P.px[j] - cx, P.pz[j] - cz)); } this.chunks.push({ P, kind, a, b, cx, cy, cz, r: r + 20, g: null }); }
    }
    this.buildFar(low); this.buildGate();
    this.maxBuilt = 0;
  }
  _other(P) { return P === this.loop ? this.ramp : this.loop; }
  _inOther(P, x, z) { const O = this._other(P); const r = O.locate(x, z); if (!r) return false; const w = O === this.loop ? HALF_W : RAMP_W; return r.d < 40 && Math.abs(r.lat) < w + 1.2 && (O.closed || (r.s > 0 && r.s < O.L)); }
  buildChunk(ch) {
    const P = ch.P, W = P === this.loop ? HALF_W : RAMP_W, S = new MB(), E = new MB(), PL = new MB();
    const cDeck = C(PONTE.deck), cDeck2 = C(PONTE.deck).multiplyScalar(0.9), cLine = C(0xf2efe6), cEdge = C(0xffd23f), cCon = C(PONTE.concrete), cBar = C(PONTE.barrier), cPole = C(0x3a3d44);
    const nL = C(PONTE.neonL), nR = C(PONTE.neonR), cLamp = C(PONTE.lamp);
    const pt = (i, lat, dy = 0) => { const j = P.id(i); return [P.px[j] + P.rx[j] * lat, P.py[j] + dy, P.pz[j] + P.rz[j] * lat]; };
    const strip = (i, l0, l1, dy0, dy1, col, B = S) => { B.quad(pt(i, l0, dy0), pt(i, l1, dy1), pt(i + 1, l1, dy1), pt(i + 1, l0, dy0), col); };
    const wall = (i, lat, y0, y1, col, B = S) => { B.quad(pt(i, lat, y0), pt(i + 1, lat, y0), pt(i + 1, lat, y1), pt(i, lat, y1), col); };
    const E2 = W + 1.3;
    for (let i = ch.a; i < ch.b; i++) {
      const j = P.id(i);
      strip(i, -W - 0.3, W + 0.3, 0, 0, (Math.floor(i / 7) % 2) ? cDeck : cDeck2);
      strip(i, -E2, -W - 0.3, 0, 0, cCon); strip(i, W + 0.3, E2, 0, 0, cCon);
      // faixas: bordas contínuas, divisórias tracejadas (3 faixas)
      strip(i, -W + 0.15, -W + 0.4, 0.02, 0.02, cEdge); strip(i, W - 0.4, W - 0.15, 0.02, 0.02, cLine);
      if (P === this.loop && i % 4 < 2) { strip(i, -W / 3 - 0.08, -W / 3 + 0.08, 0.02, 0.02, cLine); strip(i, W / 3 - 0.08, W / 3 + 0.08, 0.02, 0.02, cLine); }
      // laterais e fundo da laje
      wall(i, -E2, -1.4, 0, cCon); wall(i, E2, -1.4, 0, cCon); strip(i, -E2, E2, -1.4, -1.4, cCon);
      // muretas (pulam o trecho da junção)
      for (const sd of [-1, 1]) {
        const p0 = pt(i, sd * (W + 0.75)); if (this._inOther(P, p0[0], p0[2])) continue;
        const a = sd * (W + 0.47), b = sd * (W + 1.03);
        wall(i, a, 0, 0.95, cBar); wall(i, b, 0, 0.95, cBar); strip(i, a, b, 0.95, 0.95, cBar);
        strip(i, a + sd * 0.2, b - sd * 0.2, 0.97, 0.97, sd < 0 ? nL : nR, E);
      }
      // postes a cada 36 m, lados alternados
      if (i % 12 === 0) {
        const sd = (i / 12) % 2 ? 1 : -1; const base = pt(i, sd * (W + 1.0)); const h = P.h[j]; const yb = base[1];
        S.box(base[0], yb + 4.6, base[2], 0.22, 9.2, 0.22, cPole, h);
        const arm = pt(i, sd * (W - 1.2)); S.box((base[0] + arm[0]) / 2, yb + 9.1, (base[2] + arm[2]) / 2, 0.14, 0.14, 2.3, cPole, h + Math.PI / 2);
        E.box(arm[0], yb + 8.95, arm[2], 0.5, 0.18, 0.9, cLamp, h);
        const pc = pt(i, sd * (W - 2.2), 0.03); PL.quadXZ(pc[0], pc[1], pc[2], 13, h);
      }
      // pilares a cada 48 m
      if (i % 16 === 8) { const y = P.py[j]; for (const sd of [-1, 1]) { const q = pt(i, sd * 5.5); S.box(q[0], (y - 1.4 - 4) / 2, q[2], 1.6, y - 1.4 + 4, 1.6, cCon, P.h[j]); } const m = pt(i, 0); S.box(m[0], y - 1.9, m[2], 15, 1.0, 1.4, cCon, P.h[j] + Math.PI / 2); }
    }
    const g = new THREE.Group();
    const ms = new THREE.Mesh(S.geometry(), this.mSolid); ms.receiveShadow = this.Q.level === 'high'; g.add(ms);
    if (E.count) g.add(new THREE.Mesh(E.geometry(), this.mGlow));
    if (PL.count) { const mp = new THREE.Mesh(PL.geometry(), this.mPool); mp.renderOrder = 2; g.add(mp); }
    g.matrixAutoUpdate = false; g.updateMatrix(); for (const c of g.children) { c.matrixAutoUpdate = false; c.updateMatrix(); }
    this.group.add(g); ch.g = g; this.built = (this.built || 0) + 1;
  }
  dropChunk(ch) { if (!ch.g) return; this.group.remove(ch.g); for (const c of ch.g.children) c.geometry.dispose(); ch.g = null; }
  // LOD distante: laje mais fina por dentro da laje próxima, neon por dentro da mureta, luzes dos postes, pilares finos
  buildFar(low) {
    const S = new MB(), E = new MB(); const cCon = C(PONTE.concrete).multiplyScalar(0.85), cDeck = C(PONTE.deck), nL = C(PONTE.neonL), nR = C(PONTE.neonR), cLamp = C(PONTE.lamp);
    for (const P of [this.loop, this.ramp]) {
      const W = (P === this.loop ? HALF_W : RAMP_W) - 0.8; const n = P.closed ? P.N : P.M - 1;
      const idx = [0]; let acc = 0, ang = 0;
      for (let i = 1; i <= n; i++) { acc += P.ds; ang += Math.abs(angDiff(P.h[P.id(i - 1)], P.h[P.id(i)])); if (acc >= 18 || ang > 0.07 || i === n) { idx.push(i); acc = 0; ang = 0; } }
      const pt = (i, lat, dy) => { const j = P.id(i); return [P.px[j] + P.rx[j] * lat, P.py[j] + dy, P.pz[j] + P.rz[j] * lat]; };
      for (let k = 0; k < idx.length - 1; k++) {
        const a = idx[k], b = idx[k + 1];
        S.quad(pt(a, -W, -0.3), pt(a, W, -0.3), pt(b, W, -0.3), pt(b, -W, -0.3), cDeck);
        S.quad(pt(a, -W, -1.15), pt(b, -W, -1.15), pt(b, -W, -0.3), pt(a, -W, -0.3), cCon);
        S.quad(pt(a, W, -1.15), pt(b, W, -1.15), pt(b, W, -0.3), pt(a, W, -0.3), cCon);
        S.quad(pt(a, -W, -1.15), pt(a, W, -1.15), pt(b, W, -1.15), pt(b, -W, -1.15), cCon);
        for (const sd of [-1, 1]) { const l0 = sd * (HALF_W + 0.7) * (P === this.loop ? 1 : RAMP_W / HALF_W), l1 = l0 + sd * 0.1; const pa = pt(a, l0, 0); if (this._inOther(P, pa[0], pa[2])) continue; E.quad(pt(a, l0, 0.55), pt(a, l1, 0.55), pt(b, l1, 0.55), pt(b, l0, 0.55), sd < 0 ? nL : nR); }
      }
      for (let i = 0; i < n; i += 12) { const j = P.id(i); const sd = (i / 12) % 2 ? 1 : -1; const W2 = P === this.loop ? HALF_W : RAMP_W; const arm = pt(i, sd * (W2 - 1.2), 0); E.box(arm[0], arm[1] + 8.95, arm[2], 0.3, 0.1, 0.6, cLamp, P.h[j]); }
      if (!low) for (let i = 8; i < n; i += 32) { const j = P.id(i); const y = P.py[j]; for (const sd of [-1, 1]) { const q = pt(i, sd * 5.5, 0); S.box(q[0], (y - 1.5 - 4) / 2, q[2], 1.3, y - 1.5 + 4, 1.3, cCon, P.h[j]); } }
    }
    this.far = new THREE.Mesh(S.geometry(), this.mSolid); this.farGlow = new THREE.Mesh(E.geometry(), this.mGlow);
    for (const m of [this.far, this.farGlow]) { m.matrixAutoUpdate = false; this.group.add(m); }
  }
  buildGate() {
    // pórtico de neon na rampa + farol vertical visível de longe
    const g = new THREE.Group(); const P = this.ramp; const p = P.at(10, 0); g.position.set(p.x, p.y, p.z); g.rotation.y = p.h; this.group.add(g); this.gate = g;
    const sign = canvasTex(1024, 160, (c) => { c.fillStyle = '#0d0f14'; c.fillRect(0, 0, 1024, 160); c.fillStyle = PONTE.gateCss; c.shadowColor = PONTE.gateCss; c.shadowBlur = 22; c.font = 'bold 84px Trebuchet MS, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(PONTE.icon + ' ' + PONTE.title, 512, 84); });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(17, 2.6), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, side: THREE.DoubleSide })); sm.position.set(0, 7.2, 0); g.add(sm);
    const postM = new THREE.MeshStandardMaterial({ color: 0x1b1d23, metalness: 0.5, roughness: 0.4 });
    for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.5, 8.6, 0.5), postM); post.position.set(sd * 8.6, 4.3, 0); g.add(post); const n = new THREE.Mesh(new THREE.BoxGeometry(0.12, 8.2, 0.6), new THREE.MeshBasicMaterial({ color: sd < 0 ? PONTE.neonL : PONTE.neonR, toneMapped: false })); n.position.set(sd * 8.32, 4.2, 0); g.add(n); }
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 120, 12, 1, true), new THREE.MeshBasicMaterial({ color: PONTE.neonL, transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide }));
    const sf = this.loop.at(0, 0); beam.position.set(sf.x, sf.y + 60, sf.z); this.group.add(beam); this.beam = beam;
    // linha de largada/chegada (quadriculada) no S = 0
    const chk = canvasTex(128, 16, (c) => { for (let i = 0; i < 16; i++) for (let j = 0; j < 2; j++) { c.fillStyle = (i + j) % 2 ? '#111' : '#f4f4f4'; c.fillRect(i * 8, j * 8, 8, 8); } });
    const line = new THREE.Mesh(new THREE.PlaneGeometry(HALF_W * 2, 1.6), new THREE.MeshStandardMaterial({ map: chk, roughness: 0.6, polygonOffset: true, polygonOffsetFactor: -3 }));
    line.rotation.x = -Math.PI / 2; line.rotation.z = -sf.h; line.position.set(sf.x, sf.y + 0.04, sf.z); this.group.add(line);
    const arch = new THREE.Group(); arch.position.set(sf.x, sf.y, sf.z); arch.rotation.y = sf.h; this.group.add(arch);
    const top = new THREE.Mesh(new THREE.BoxGeometry(HALF_W * 2 + 3, 0.5, 0.5), new THREE.MeshBasicMaterial({ color: PONTE.neonR, toneMapped: false })); top.position.y = 6.4; arch.add(top);
    for (const sd of [-1, 1]) { const post = new THREE.Mesh(new THREE.BoxGeometry(0.45, 6.4, 0.45), postM); post.position.set(sd * (HALF_W + 1.4), 3.2, 0); arch.add(post); }
  }
  drawMap(g, X, Z) {
    const k = X(1) - X(0); g.lineJoin = 'round'; g.lineCap = 'round';
    const path = (P) => { g.beginPath(); const n = P.closed ? P.N : P.M - 1; for (let i = 0; i <= n; i += 2) { const j = P.id(i); i ? g.lineTo(X(P.px[j]), Z(P.pz[j])) : g.moveTo(X(P.px[j]), Z(P.pz[j])); } if (P.closed) g.closePath(); };
    for (const P of [this.loop, this.ramp]) { g.strokeStyle = PONTE.gateCss; g.lineWidth = (HALF_W * 2 + 6) * k; path(P); g.stroke(); g.strokeStyle = '#30333b'; g.lineWidth = HALF_W * 2 * k; path(P); g.stroke(); }
    g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(PONTE.icon, X(GATE.x + 26), Z(GATE.z + 30)); g.fillText(PONTE.icon, X(960), Z(0));
  }
  // ---------------- carros da IA ----------------
  makeCars() {
    if (this.cars.length) return; const G = this.G;
    PONTE.drivers.forEach((d, k) => {
      const tune = d.type.startsWith('rc_') ? raceTune(d.type, d.liv, [7, 21, 33, 44, 9][k]) : Object.assign(randomTune(() => 0.37 + k * 0.11), { paint: d.paint, glow: d.glow, text: d.name.split(' ')[1].toUpperCase().slice(0, 10), kit: true, spoiler: 1 });
      const v = new Vehicle(d.type, G.scene, G.Q, undefined, tune);
      Object.assign(v, { npc: true, active: false, ghost: true, noEnter: true, racer: d.name, drvId: d.id, total: 0, lat: 0, spd: 0, dy: 0, slot: 0, laneBase: 0 });
      v.root.visible = false; this.cars.push(v);
    });
  }
  placeCars(sP) {
    const slots = [-30, -15, 14, 28, 44], lanes = [-4.2, 3.6, -3.0, 4.4, -1.2];
    this.cars.forEach((r, k) => { r.slot = slots[k]; r.laneBase = lanes[k]; r.total = (sP + r.slot + this.L) % this.L; r.lat = r.laneBase; r.spd = 0; r.dy = 0; r._rel = r.slot; const p = this.loop.at(r.total, r.lat); r.place(p.x, p.z, p.h); r.y = p.y + 0.2; r.active = true; r.root.visible = true; r._lw = null; if (this.G.vehicles.indexOf(r) < 0) this.G.vehicles.push(r); });
    this.slotT = 40;
  }
  hideCars() { for (const r of this.cars) { r.active = false; r.root.visible = false; const i = this.G.vehicles.indexOf(r); if (i >= 0) this.G.vehicles.splice(i, 1); } }
  ai(dt, sP, pv, camera) {
    const G = this.G, P = this.loop, L = this.L, low = this.Q.level === 'low'; this.stats.frames++;
    // a cada ~40 s dois vizinhos trocam de posição (ultrapassagens de verdade, sem bloquear)
    this.slotT -= dt; if (this.slotT <= 0) { this.slotT = 34 + Math.random() * 14; const a = Math.floor(Math.random() * 4); const A = this.cars[a], B = this.cars[a + 1]; const s = A.slot; A.slot = B.slot; B.slot = s; }
    const me = G.player.vehicle; const meLoc = this._loc;
    let driftN = 0;
    for (const r of this.cars) {
      if (!r.active) continue;
      const target = sP + r.slot; const err = wrapD(target - r.total, L);
      if (Math.abs(err) > 360) { r.total = (target + L) % L; r.spd = pv; }
      const k8 = Math.abs(P.at(r.total + 8).k); let top = this.cruise * 1.25;
      for (let d = 0; d <= 60; d += 6) { const kk = Math.abs(P.at(r.total + d).k); if (kk > 1e-4) top = Math.min(top, Math.sqrt(8.5 / kk + 2 * 9 * d)); }
      const want = clamp(pv + err * 0.55, 0, Math.max(top, pv * 0.9 + 2));
      r.spd += clamp(want - r.spd, -16 * dt, 11 * dt); r.spd = Math.max(0, r.spd);
      r.total = (r.total + r.spd * dt + L) % L;
      // faixa: base do slot, foge do jogador e dos outros
      let latT = r.laneBase;
      if (me && meLoc) { const a = wrapD(r.total - meLoc.s, L); if (Math.abs(a) < 12 && Math.abs(meLoc.lat - r.lat) < 3.4) latT = meLoc.lat >= 0 ? meLoc.lat - 4.2 : meLoc.lat + 4.2; }
      for (const o of this.cars) { if (o === r || !o.active) continue; const a = wrapD(o.total - r.total, L); if (a > 0 && a < 10 && Math.abs(o.lat - r.lat) < 2.6) latT += r.lat >= o.lat ? 2.2 : -2.2; }
      r.lat += (clamp(latT, -HALF_W + 1.7, HALF_W - 1.7) - r.lat) * Math.min(1, dt * 1.3);
      const p = P.at(r.total, r.lat), k = p.k;
      // ângulo: nas curvas sai de lado pelo raio; nas retas faz pêndulo no mesmo ponto da pista (tandem)
      const swing = 0.46 * Math.sin(r.total / 150 * Math.PI * 2);
      const dyT = r.spd < 8 ? 0 : Math.abs(k) > 1 / 140 ? -Math.sign(k) * clamp(Math.abs(k) * 22, 0.3, 0.72) : swing;
      r.dy += (dyT - r.dy) * Math.min(1, dt * 2.2);
      r.x = p.x; r.z = p.z; r.y = p.y + 0.2; r.h = p.h + r.dy; r.vx = Math.sin(p.h) * r.spd; r.vz = Math.cos(p.h) * r.spd; r.vf = r.spd;
      r.steer = clamp(-r.dy * 1.6 + k * 20, -1, 1); r.spin = (r.spin || 0) + r.spd * dt / r.spec.wr; r.drifting = Math.abs(r.dy) > 0.18 && r.spd > 8; r.driftAng = Math.abs(r.dy); r.brakeOn = r.spd < want - 3;
      r.sync(dt);
      const dc = Math.hypot(r.x - camera.position.x, r.z - camera.position.z); r.root.visible = dc < (this.Q.viewHide || 280) * 1.6;
      if (r.drifting) { driftN++; if (dc < 170 && G.fx && G.fx.aiTrail) { G.fx.aiTrail(r, G.env.night, low ? 0.3 : 1); this.stats.aiSmoke++; } }
      r._d = Math.hypot(r.x - (me ? me.x : 0), r.z - (me ? me.z : 0));
    }
    if (driftN) this.stats.aiDriftFrames++; this.driftN = driftN;
  }
  // ---------------- sessão ----------------
  nearGate() { const v = this.G.player.vehicle; const p = v || this.G.player; return Math.hypot(p.x - GATE.x, p.z - GATE.z); }
  canAccept() { const v = this.G.player.vehicle; return !!(v && !v.spec.boat && v.type !== 'heli' && !this.on && this.nearGate() < 50); }
  accept() {
    const G = this.G, v = G.player.vehicle; if (!v) return false;
    respawnFade(() => {
      const p = this.loop.at(this.L - 14, -3); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; v.drifting = false; v.yawV = 0;
      G.player.x = p.x; G.player.z = p.z; G.player.h = p.h; G.camYaw = p.h; if (G.snapCam) G.snapCam(); v.sync(0);
      this.start(true);
    });
    return true;
  }
  start(accepted) {
    const G = this.G; this.makeCars(); this.on = true; this.leftT = 0; this.stuckT = 0; this.lap = 0; this.lapStart = 0; this.prog = 0; this.lastS = null; this.session = G.drift.total; this.best = 0; this.halfSaid = false; this.lastLap = 0;
    this.radio.load(); this.radio.reset(); this.banterT = 26 + Math.random() * 10;
    const v = G.player.vehicle; const loc = v ? this.loop.locate(v.x, v.z) : null; const sP = loc ? loc.s : 0; this.placeCars(sP);
    G.ui.toast(`${PONTE.icon} <b>${PONTE.name}</b> · ${(this.L / 1000).toFixed(1).replace('.', ',')} km · volta ~${fmtT(this.estimate.t).replace(/\.\d$/, '')} no ritmo de drift · ${LAPS} voltas · 5 pilotos no tandem!`, 3600);
    this.radio.say('start', null, 0, true); setTimeout(() => this.on && this.radio.say('start', null), 600);
    G.audio.chime && G.audio.chime('start');
    this.hud(true);
  }
  end(finished) {
    if (!this.on) return; const G = this.G; G.drift.bank && G.drift.bank(); const pts = Math.max(0, Math.round(G.drift.total - this.session));
    this.on = false; this.hideCars(); this.data.runs++;
    if (pts > this.data.bestScore) this.data.bestScore = pts; saveData(this.data);
    if (finished) { this.radio.say('finish', null, 0, true); G.ui.toast(`🏁 <b>${PONTE.name}</b> · ${pts.toLocaleString('pt-BR')} pts · melhor volta ${fmtT(this.best || 0)} · recorde ${fmtT(this.data.bestLap)}`, 4200); G.addFollowers && G.addFollowers(Math.min(10, 2 + Math.floor(pts / 1500))); }
    else if (pts > 20) G.ui.toast(`${PONTE.icon} Sessão encerrada · ${pts.toLocaleString('pt-BR')} pts · recorde de pontos ${this.data.bestScore.toLocaleString('pt-BR')}`, 3000);
    this.hud(true);
  }
  onLine(t) {
    const G = this.G;
    if (!this.lapStart) { this.lapStart = t; this.lap = 1; this.prog = 0; this.halfSaid = false; this.radio.say('lapsLeft2', null, 0); return; }
    if (this.prog < this.L * 0.9) return;
    const lt = t - this.lapStart; this.lastLap = lt; this.data.laps++;
    const rec = !this.data.bestLap || lt < this.data.bestLap; if (rec) this.data.bestLap = lt; if (!this.best || lt < this.best) this.best = lt; saveData(this.data);
    G.ui.toast(`${PONTE.icon} Volta ${this.lap}: <b>${fmtT(lt)}</b>${rec ? ' · 🏆 recorde!' : ' · recorde ' + fmtT(this.data.bestLap)}`, 3000);
    if (rec) this.radio.say('record', null, 0, true);
    this.lap++; this.lapStart = t; this.prog = 0; this.halfSaid = false;
    if (this.lap > LAPS) { this.end(true); return; }
    if (this.lap === LAPS) this.radio.say('lastLap', null, 0, true);
  }
  update(dt, t, camera) {
    const G = this.G; this.t = t;
    // recorte por distância: constrói no máximo 1 trecho por quadro, descarta os longe
    const cx = camera.position.x, cz = camera.position.z; let builds = 0; let vis = 0;
    for (const ch of this.chunks) {
      const d = Math.hypot(ch.cx - cx, ch.cz - cz) - ch.r;
      if (d < this.nearD) { if (!ch.g && builds < 1) { this.buildChunk(ch); builds++; } if (ch.g) { ch.g.visible = true; vis++; } }
      else if (ch.g) { if (d > this.nearD + 450) this.dropChunk(ch); else ch.g.visible = false; }
    }
    this.visChunks = vis; this.liveChunks = this.chunks.filter(c => c.g).length;
    const dB = Math.hypot(960 - cx, cz) ; this.group.visible = dB < 4200;
    this.mPool.opacity = clamp((G.env.night - 0.25) * 1.3, 0, 0.75);
    this.beam.visible = G.env.night > 0.2 || !this.on; this.beam.material.opacity = 0.08 + G.env.night * 0.14;
    // sessão
    const v = G.player.vehicle; const ok = v && !v.spec.boat && v.type !== 'heli';
    const loc = ok ? this.loop.locate(v.x, v.z, this.hint) : null; this._loc = loc;
    const onLoop = !!(loc && loc.d < 40 && Math.abs(loc.lat) < HALF_W + 3);
    if (onLoop) { this.hint = loc.i; this.leftT = 0; if (!this.on) this.start(false); }
    else if (this.on) { this.leftT += dt; if (this.leftT > 6) this.end(false); }
    if (this.on && onLoop) {
      if (this.lastS != null) { const d = wrapD(loc.s - this.lastS, this.L); if (Math.abs(d) < 60) { this.prog += d; if (this.lastS > this.L - 80 && loc.s < 80 && d > 0) this.onLine(t); } }
      this.lastS = loc.s;
      if (this.lap && !this.halfSaid && this.prog > this.L / 2) { this.halfSaid = true; this.radio.say('half', null, 0); }
      const fx = Math.sin(this.loop.at(loc.s).h), fz = Math.cos(this.loop.at(loc.s).h); const pv = Math.max(0, v.vx * fx + v.vz * fz);
      this.ai(dt, loc.s, pv, camera); this._chatter(dt, v, loc);
      this._maybeRespawn(dt, v, loc);
    }
    this.radio.update(dt);
    this.hud();
  }
  _chatter(dt, v, loc) {
    const R = this.radio; const L = this.L;
    if (v.drifting && (v.dTime > 2.4 || (this.G.drift.combo || 1) >= 3)) R.say('playerDrift', null, 22);
    let tand = null; for (const r of this.cars) if (r.active && r._d < 7.5 && r.drifting && v.drifting) tand = r;
    this.tandT = tand ? (this.tandT || 0) + dt : 0; if (this.tandT > 1.2) { if (R.say('tandemClose', tand.drvId, 26) || R.say('tandemClose', null, 26)) this.tandemSaid = (this.tandemSaid || 0) + 1; }
    if ((Math.abs(loc.lat) > HALF_W - 0.9 && v.speed > 12) || (v.hitT > 0 && v.speed > 6)) R.say('wall', null, 18);
    for (const r of this.cars) { if (!r.active) continue; const rel = wrapD(r.total - loc.s, L); if (r._rel != null) { if (r._rel > 2 && rel < -2 && Math.abs(rel) < 40) R.say('playerPass', r.drvId, 24); else if (r._rel < -2 && rel > 2 && Math.abs(rel) < 40) R.say('aiPass', r.drvId, 24); } r._rel = rel; }
    this.banterT -= dt; if (this.banterT <= 0) { this.banterT = 38 + Math.random() * 20; R.banter(); }
  }
  _maybeRespawn(dt, v, loc) {
    const G = this.G; const h = this.loop.at(loc.s).h;
    const wrong = Math.abs(angDiff(v.h, h)) > 2.1 && v.speed < 5; const crash = v.hitT > 0 && v.speed < 3; const off = Math.abs(loc.lat) > HALF_W + 1.5 || !this.onDeck(v.x, v.z); // centro fora do tabuleiro = preso na borda/caindo
    const edge = v.speed < 1.5 && Math.abs(loc.lat) > HALF_W - 1.6; this.edgeT = edge ? (this.edgeT || 0) + dt : 0; // parado encostado na borda
    if (wrong || crash || off || this.edgeT > 3) this.stuckT += dt; else this.stuckT = Math.max(0, this.stuckT - dt * 2);
    if (this.stuckT > 1.1 && !this._fading) {
      this._fading = true; this.stuckT = 0; this.edgeT = 0;
      respawnFade(() => {
        this._fading = false; if (!G.player.vehicle) return;
        const p = this.loop.at(loc.s + 6, clamp(loc.lat, -HALF_W + 2, HALF_W - 2)); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.drifting = false; v.yawV = 0;
        v.vf = 10; v.vx = Math.sin(p.h) * 10; v.vz = Math.cos(p.h) * 10; G.player.x = p.x; G.player.z = p.z; G.player.h = p.h; G.camYaw = p.h; if (G.snapCam) G.snapCam(); v.sync(0);
        this.lastS = null; this.respawns = (this.respawns || 0) + 1; this.radio.say('respawn', null, 8, true); G.ui.toast('↺ De volta à ponte', 1100);
      });
    }
  }
  go() {
    const G = this.G; const v = G.player.vehicle;
    if (v && !v.spec.boat && v.type !== 'heli') { const p = this.ramp.at(2, 0); v.place(p.x, p.z, p.h); v.vf = v.vx = v.vz = 0; G.player.x = p.x; G.player.z = p.z; G.camYaw = p.h; G.snapCam && G.snapCam(); v.sync(0); G.ui.toast(`${PONTE.icon} <b>${PONTE.name}</b> · toque <b>${PONTE.icon} Aceitar</b> (até 50 m) e os 5 pilotos entram no tandem!`, 3200); return; }
    if (v) G.leaveCar(true);
    G.placeOnFoot(GATE.x - 4, GATE.z - 22, 0); G.snapCam();
    G.callCar && G.callCar();
    G.ui.toast(`${PONTE.icon} <b>${PONTE.name}</b> · seu carro vem parar à sua frente: toque para entrar e depois <b>${PONTE.icon} Aceitar</b>.`, 3600);
  }
  hud(force) {
    const el = $('ponteHud'); if (!el) return;
    document.body.classList.toggle('ponteOn', !!this.on);
    if (!this.on) {
      if (this.canAccept()) { const h = `<b>${PONTE.icon} ${PONTE.title}</b> ${this.G.touch ? `toque <span>${PONTE.icon} Aceitar</span>` : 'aperte <span>E</span> para aceitar'}<small>5 pilotos · ${LAPS} voltas · ${(this.L / 1000).toFixed(1).replace('.', ',')} km · recorde ${fmtT(this.data.bestLap)}</small>`; if (el.hidden) el.hidden = false; if (h !== this._h) { el.innerHTML = h; this._h = h; } return; }
      if (!el.hidden) el.hidden = true; return;
    }
    el.hidden = false; const G = this.G;
    const pts = Math.max(0, Math.round(G.drift.total - this.session)); const km = ((this.prog > 0 ? this.prog : 0) / 1000).toFixed(1).replace('.', ',');
    const lt = this.lapStart ? fmtT(this.t - this.lapStart) : 'largada →';
    const h = `<b>${PONTE.icon} ${PONTE.title}</b> volta ${Math.min(this.lap || 1, LAPS)}/${LAPS} · <span>${lt}</span> · ${km}/${(this.L / 1000).toFixed(1).replace('.', ',')} km<small>${pts.toLocaleString('pt-BR')} pts · melhor volta ${fmtT(this.data.bestLap)} · ${this.driftN || 0}/5 em drift</small>`;
    if (force || h !== this._h) { el.innerHTML = h; this._h = h; if (this.radio && !$('radioSub').hidden) this.radio.place(); }
  }
}

// construtor de malha simples (vértices + normais + cores); quads em qualquer orientação
class MB {
  constructor() { this.p = []; this.c = []; }
  get count() { return this.p.length / 3; }
  quad(a, b, c, d, col) { this.p.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) this.c.push(col.r, col.g, col.b); }
  quadXZ(x, y, z, s, h) { const cs = Math.cos(h), sn = Math.sin(h), q = s / 2; const P = (u, v) => [x + u * cs + v * sn, y, z - u * sn + v * cs]; this.p.push(...P(-q, -q), ...P(q, -q), ...P(q, q), ...P(-q, -q), ...P(q, q), ...P(-q, q)); this.uv = this.uv || []; this.uv.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1); for (let i = 0; i < 6; i++) this.c.push(1, 1, 1); }
  box(cx, cy, cz, sx, sy, sz, col, ry = 0) {
    const cs = Math.cos(ry), sn = Math.sin(ry), hx = sx / 2, hy = sy / 2, hz = sz / 2;
    const T = (x, y, z) => [cx + x * cs + z * sn, cy + y, cz - x * sn + z * cs];
    const v = [T(-hx, -hy, -hz), T(hx, -hy, -hz), T(hx, hy, -hz), T(-hx, hy, -hz), T(-hx, -hy, hz), T(hx, -hy, hz), T(hx, hy, hz), T(-hx, hy, hz)];
    for (const [a, b, c, d] of [[0, 1, 2, 3], [5, 4, 7, 6], [4, 0, 3, 7], [1, 5, 6, 2], [3, 2, 6, 7], [4, 5, 1, 0]]) this.quad(v[a], v[b], v[c], v[d], col);
  }
  geometry() {
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    if (this.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.computeVertexNormals(); g.computeBoundingSphere(); return g;
  }
}
