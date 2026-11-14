// Diversão na ponte: moedas, dinheiro e caixas-prêmio ao longo do tabuleiro (InstancedMesh, 1 draw call cada),
// mini-missões (zonas de drift, radares de velocidade, corrente de tandem, quase-batidas) que pagam em dinheiro do jogo
// (o mesmo da garagem), com aviso no HUD e reação do rádio; e cenário vivo no mar e no céu (navios de cruzeiro,
// lanchas com esteira, balões gigantes e aviões) — tudo instanciado e com orçamento menor no modo leve.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { canvasTex, clamp } from './util.js';
import { isWaterDeep, WATER_Y } from './world.js';
import { PONTE } from './seabridge.js';

const $ = (id) => document.getElementById(id);
const KEYF = PONTE.key + '-fun';
const wrapD = (d, L) => { if (d > L / 2) d -= L; if (d < -L / 2) d += L; return d; };
const money = (n) => '$' + Math.round(n).toLocaleString('pt-BR');
function loadF() { try { return JSON.parse(localStorage.getItem(KEYF) || 'null'); } catch (e) { return null; } }
function saveF(d) { try { localStorage.setItem(KEYF, JSON.stringify(d)); } catch (e) { } }
// caixa colorida (vértices) para mesclar
function cbox(sx, sy, sz, x, y, z, col, ry = 0) { const g = new THREE.BoxGeometry(sx, sy, sz); if (ry) g.rotateY(ry); g.translate(x, y, z); return paint(g, col); }
function paint(g, col) { const c = new THREE.Color(col); const n = g.attributes.position.count; const a = new Float32Array(n * 3); for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); if (g.index) g = g.toNonIndexed(); return g; }
function merge(list) { return mergeGeometries(list.map(g => (g.index ? g.toNonIndexed() : g)).map(g => { for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'color'].includes(k)) g.deleteAttribute(k); return g; })); }

export class BridgeFun {
  constructor(G, ponte) {
    this.G = G; this.P = ponte; const lv = G.Q.level; this.low = lv === 'low'; this.high = lv === 'high';
    this.group = new THREE.Group(); this.group.name = 'ponteFun'; G.scene.add(this.group);
    this.data = Object.assign({ coins: 0, cash: 0, prizes: 0, earned: 0, bestTrap: 0, zones: 0, chainBest: 0, near: 0 }, loadF() || {});
    this.stats = { coins: 0, cash: 0, prizes: 0, zonesOk: 0, traps: 0, chains: 0, near: 0, earned: 0 };
    this.test = { drift: false, tandem: false };
    this.t = 0; this._d = new THREE.Object3D();
    this.buildPickups(); this.buildMissions(); this.buildScenery();
    this.zone = null; this.chain = { t: 0, links: 0, gap: 0, paid: 0 }; this.nearCd = new Map(); this.lastS = null;
  }
  // ---------------- coletáveis ----------------
  buildPickups() {
    const L = this.P.loop, LL = this.P.L; const items = []; const step = this.low ? 210 : 150;
    for (let s = 140; s < LL - 60; s += step) { const lat0 = Math.round(5 * Math.sin(s / 310)); for (let k = 0; k < 5; k++) items.push({ kind: 0, s: s + k * 6, lat: clamp(lat0 + Math.sin((s + k * 6) / 40) * 1.2, -7, 7), val: 5 }); }
    for (let s = 420, i = 0; s < LL - 60; s += 560, i++) items.push({ kind: 1, s, lat: i % 2 ? 6.2 : -6.2, val: 50 });
    for (let i = 0; i < 6; i++) items.push({ kind: 2, s: LL * (0.09 + i * 0.16), lat: (i % 3 - 1) * 4, val: 0 });
    for (const it of items) { const p = L.at(it.s, it.lat); it.x = p.x; it.z = p.z; it.y = p.y + 1.25; it.h = p.h; it.on = true; it.back = 0; }
    this.items = items;
    const mk = (geo, mat, kind) => { const list = items.filter(i => i.kind === kind); const m = new THREE.InstancedMesh(geo, mat, list.length); list.forEach((it, j) => { it.j = j; it.mesh = m; }); m.frustumCulled = false; m.name = 'fun' + kind; this.group.add(m); return { m, list }; };
    const coinG = new THREE.CylinderGeometry(0.55, 0.55, 0.14, this.low ? 10 : 16); coinG.rotateX(Math.PI / 2);
    const cashG = merge([cbox(0.95, 0.34, 0.5, 0, 0, 0, 0x2fbf5a), cbox(0.97, 0.36, 0.14, 0, 0, 0, 0xf2f0d0)]);
    const prizeG = merge([cbox(1.25, 1.25, 1.25, 0, 0, 0, 0xff4fb8), cbox(1.3, 0.26, 1.3, 0, 0, 0, 0xffd23f), cbox(0.26, 1.3, 1.3, 0, 0, 0, 0xffd23f), cbox(0.7, 0.3, 0.3, 0, 0.75, 0, 0xffd23f)]);
    this.coins = mk(coinG, new THREE.MeshStandardMaterial({ color: 0xffc928, emissive: 0x8a5a00, metalness: 0.6, roughness: 0.3 }), 0);
    this.cash = mk(cashG, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x0b3a14, roughness: 0.6 }), 1);
    this.prizes = mk(prizeG, new THREE.MeshStandardMaterial({ vertexColors: true, emissive: 0x551133, roughness: 0.45 }), 2);
    for (const it of items) this.setItem(it, 0);
    this.popEl = $('bfPop');
  }
  setItem(it, t) {
    const d = this._d; if (!it.on) { d.position.set(it.x, -500, it.z); d.scale.setScalar(0.001); }
    else { d.position.set(it.x, it.y + Math.sin(t * 3 + it.s) * 0.18, it.z); d.rotation.set(0, it.h + t * (it.kind === 0 ? 3 : 1.2), 0); d.scale.setScalar(it.kind === 2 ? 1 + Math.sin(t * 5) * 0.05 : 1); }
    d.updateMatrix(); it.mesh.setMatrixAt(it.j, d.matrix); it.mesh.instanceMatrix.needsUpdate = true;
  }
  collect(it, v) {
    const G = this.G; it.on = false; it.back = this.t + (it.kind === 0 ? 120 : it.kind === 1 ? 240 : 420); this.setItem(it, this.t);
    let val = it.val, txt;
    if (it.kind === 0) { this.stats.coins++; this.data.coins++; txt = `🪙 +${money(val)}`; G.audio.chime && G.audio.chime('coin'); }
    else if (it.kind === 1) { this.stats.cash++; this.data.cash++; txt = `💵 +${money(val)}`; G.audio.chime && G.audio.chime('ok'); }
    else { this.stats.prizes++; this.data.prizes++; const r = Math.random(); if (r < 0.35 && v) { v.nitro = 1; val = 60; txt = `🎁 Prêmio: nitro cheio + ${money(val)}`; } else { val = 150 + Math.round(Math.random() * 5) * 50; txt = `🎁 Prêmio: <b>${money(val)}</b>`; } G.audio.chime && G.audio.chime('start'); this.P.radio && this.P.radio.say('record', null, 30); }
    this.pay(val, txt, it.kind === 2);
  }
  pay(val, txt, big) { const G = this.G; if (val > 0) { G.addMoney && G.addMoney(val); this.stats.earned += val; this.data.earned += val; } this.pop(txt, big); this._dirty = true; }
  pop(html, big) { const el = this.popEl || (this.popEl = $('bfPop')); if (!el) return; const d = document.createElement('div'); d.className = 'bfp' + (big ? ' big' : ''); d.innerHTML = html; el.appendChild(d); while (el.children.length > 3) el.firstChild.remove(); setTimeout(() => d.remove(), big ? 2600 : 1500); this.lastPop = html; }
  // ---------------- missões ----------------
  buildMissions() {
    const LL = this.P.L, L = this.P.loop, W = this.P.halfW;
    this.zones = [0.14, 0.4, 0.66, 0.9].map((f, i) => ({ i, s0: LL * f, s1: LL * f + 300, target: 1200, best: 0 }));
    this.traps = [0.06, 0.29, 0.53, 0.78].map((f, i) => ({ i, s: LL * f }));
    const glow = []; const labels = { drift: [], radar: [] }; const cL = PONTE.neonL, cR = PONTE.neonR;
    const arch = (s, col, kind) => { const p = L.at(s, 0); const rx = Math.cos(p.h), rz = -Math.sin(p.h); for (const sd of [-1, 1]) glow.push(cbox(0.5, 6.2, 0.5, p.x + rx * sd * (W + 0.4), p.y + 3.1, p.z + rz * sd * (W + 0.4), col, p.h)); glow.push(cbox(2 * W + 1.3, 0.5, 0.5, p.x, p.y + 6.2, p.z, col, p.h)); labels[kind].push(p); };
    for (const z of this.zones) { arch(z.s0, cL, 'drift'); arch(z.s1, cL, 'drift'); }
    for (const t of this.traps) { arch(t.s, cR, 'radar'); const p = L.at(t.s, W + 1.6); glow.push(cbox(0.7, 0.5, 0.5, p.x, p.y + 4.2, p.z, 0xff3030, p.h)); }
    this.gates = new THREE.Mesh(merge(glow), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })); this.gates.name = 'funGates'; this.group.add(this.gates);
    const lab = (text, col) => canvasTex(256, 48, (g) => { g.fillStyle = 'rgba(8,8,20,.85)'; g.fillRect(0, 0, 256, 48); g.strokeStyle = col; g.lineWidth = 4; g.strokeRect(2, 2, 252, 44); g.fillStyle = '#fff'; g.font = 'bold 28px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 26); });
    const hex = (c) => '#' + new THREE.Color(c).getHexString();
    for (const [kind, text, col] of [['drift', 'ZONA DE DRIFT', cL], ['radar', 'RADAR 📸', cR]]) {
      const ps = labels[kind]; const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(8, 1.5), new THREE.MeshBasicMaterial({ map: lab(text, hex(col)), side: THREE.DoubleSide, toneMapped: false }), ps.length);
      ps.forEach((p, j) => { const d = this._d; d.position.set(p.x, p.y + 7.4, p.z); d.rotation.set(0, p.h, 0); d.scale.setScalar(1); d.updateMatrix(); m.setMatrixAt(j, d.matrix); }); m.frustumCulled = false; m.name = 'funLabel_' + kind; this.group.add(m);
    }
  }
  inZone(s) { for (const z of this.zones) if (s >= z.s0 && s <= z.s1) return z; return null; }
  missions(dt, v, loc) {
    const G = this.G, s = loc.s; const drifting = v.drifting || this.test.drift;
    // zonas de drift
    const z = this.inZone(s);
    if (z && (!this.zone || this.zone.z !== z)) { this.zone = { z, score: 0, enterS: s }; this.pop(`🌀 <b>ZONA DE DRIFT</b> · faça ${z.target} pts`); }
    if (this.zone) {
      const Z = this.zone; if (z === Z.z) { if (drifting && v.speed > 6) Z.score += v.speed * dt * 9 * (1 + Math.min(1.5, (G.drift.combo || 1) * 0.15)); this.zoneLive = Math.round(Z.score); }
      else { // saiu da zona
        const fwd = wrapD(s - Z.z.s1, this.P.L) > -2; const sc = Math.round(Z.score); this.zone = null; this.zoneLive = 0;
        if (fwd && sc >= Z.z.target) { const val = Math.round(sc / 15); Z.z.best = Math.max(Z.z.best, sc); this.stats.zonesOk++; this.data.zones++; this.pay(val, `🌀 Zona de drift: <b>${sc.toLocaleString('pt-BR')} pts</b> · +${money(val)}`, true); this.P.radio && this.P.radio.say('playerDrift', null, 8); }
        else if (fwd && sc > 0) this.pop(`🌀 Zona de drift: ${sc} / ${Z.z.target} pts — quase!`);
      }
    }
    // radares
    if (this.lastS != null) { const ds = wrapD(s - this.lastS, this.P.L); if (ds > 0 && ds < 60) for (const t of this.traps) { const a = wrapD(this.lastS - t.s, this.P.L), b = wrapD(s - t.s, this.P.L); if (a < 0 && b >= 0) this.trap(t, v); } }
    this.lastS = s;
    // corrente de tandem
    let tand = null; for (const r of this.P.cars) if (r.active && Math.hypot(r.x - v.x, r.z - v.z) < 7.5 && (r.drifting || this.test.tandem) && drifting) { tand = r; break; }
    const C = this.chain; if (tand) { C.gap = 0; C.t += dt; if (C.t >= 2.5) { C.t = 0; C.links++; const val = Math.min(100, 20 * C.links); C.paid += val; this.pay(val, `🔗 Corrente de tandem <b>x${C.links}</b> · +${money(val)}`, C.links >= 3); if (C.links === 3) this.P.radio && this.P.radio.say('tandemClose', tand.drvId, 12); } }
    else if (C.links || C.t) { C.gap += dt; if (C.gap > 1.5) { if (C.links >= 2) { this.stats.chains++; this.pop(`🔗 Corrente x${C.links} encerrada · total ${money(C.paid)}`); } this.data.chainBest = Math.max(this.data.chainBest, C.links); C.t = 0; C.links = 0; C.gap = 0; C.paid = 0; } }
    // quase-batida (passar raspando por um piloto da IA sem encostar)
    if (v.speed > 16 && !(v.hitT > 0)) for (const r of this.P.cars) { if (!r.active) continue; const d = Math.hypot(r.x - v.x, r.z - v.z); const rel = Math.hypot(r.vx - v.vx, r.vz - v.vz); const cd = this.nearCd.get(r) || 0;
      if (d > 1.9 && d < 3.4 && rel > 3 && this.t > cd) { this.nearCd.set(r, this.t + 4); this.stats.near++; this.data.near++; this.pay(15, '😮 <b>QUASE!</b> +' + money(15)); } }
  }
  trap(t, v) {
    const kmh = Math.round(v.speed * 3.6); this.stats.traps++; this.lastTrap = kmh;
    if (kmh >= 120) { const rec = kmh > this.data.bestTrap; if (rec) this.data.bestTrap = kmh; const val = Math.round((kmh - 100) * 1.5); this.pay(val, `📸 Radar: <b>${kmh} km/h</b> · +${money(val)}${rec ? ' · 🏆 recorde!' : ''}`, true); if (rec) this.P.radio && this.P.radio.say('record', null, 20); }
    else this.pop(`📸 Radar: ${kmh} km/h · passe a 120+ para ganhar`);
  }
  // ---------------- cenário (mar e céu) ----------------
  buildScenery() {
    const G = this.G; const lo = this.low; const N = { ships: lo ? 1 : this.high ? 3 : 2, boats: lo ? 3 : this.high ? 8 : 5, balloons: lo ? 3 : this.high ? 7 : 5, planes: lo ? 1 : 2 };
    this.N = N; const sol = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.1 }); this.glowMat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
    // navio de cruzeiro (casco, 5 conveses, chaminé, janelas iluminadas)
    { const s = [], g = []; s.push(cbox(24, 9, 150, 0, 3, 0, 0xf4f4f0), cbox(24.4, 2.2, 150.4, 0, -0.4, 0, 0x1d3f7a), cbox(10, 8, 18, 0, 3, 80, 0xf4f4f0));
      for (let k = 0; k < 5; k++) s.push(cbox(21 - k * 1.6, 3, 118 - k * 14, 0, 9 + k * 3, -6 - k * 2, 0xffffff));
      s.push(cbox(6, 9, 10, 0, 27, -30, 0xd8332e), cbox(6.2, 1.4, 10.2, 0, 31, -30, 0x111111));
      for (let k = 0; k < 6; k++) for (const sd of [-1, 1]) g.push(cbox(0.3, 0.7, 112 - k * 12, sd * (12.1 - (k > 0 ? (k - 1) * 0.8 + 1.5 : 0)), 5.5 + k * 3, -6 - k * 2, k % 2 ? 0xfff2b0 : 0xbfe8ff));
      this.ships = this.inst(merge(s), sol, N.ships, 'funShips'); this.shipsG = this.inst(merge(g), this.glowMat, N.ships, 'funShipsGlow');
      this.shipP = Array.from({ length: N.ships }, (_, i) => ({ cx: 1700 + i * 90, cz: i * 260 - 200, rx: 110 + i * 40, rz: 900 - i * 150, a: i * 2.1, w: (5 / 900) * (i % 2 ? -1 : 1) })); }
    // lanchas com esteira
    { const hull = merge([cbox(2.2, 0.9, 6.5, 0, 0.45, 0, 0xffffff), cbox(1.4, 0.8, 1.6, 0, 1.25, -0.2, 0x223344), cbox(1.6, 0.7, 1.6, 0, 0.5, 3.6, 0xffffff)]);
      this.boats = this.inst(hull, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 }), N.boats, 'funBoats');
      const wt = canvasTex(32, 128, (g) => { const r = g.createLinearGradient(0, 0, 0, 128); r.addColorStop(0, 'rgba(255,255,255,0.95)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.beginPath(); g.moveTo(16, 0); g.lineTo(32, 128); g.lineTo(26, 128); g.lineTo(16, 18); g.lineTo(6, 128); g.lineTo(0, 128); g.closePath(); g.fill(); });
      const wg = new THREE.PlaneGeometry(9, 34); wg.rotateX(-Math.PI / 2); wg.translate(0, 0, -17 - 2.5);
      this.wakes = new THREE.InstancedMesh(wg, new THREE.MeshBasicMaterial({ map: wt, transparent: true, depthWrite: false, opacity: 0.8 }), N.boats); this.wakes.frustumCulled = false; this.wakes.name = 'funWakes'; this.group.add(this.wakes);
      const cols = [0xff4fb8, 0x29f0ff, 0xffd23f, 0x45ff9a, 0xff7a2f, 0xb45cff, 0xffffff, 0x3a7bff]; this.boatP = [];
      const L = this.P.loop; let tries = 0;
      while (this.boatP.length < N.boats && tries++ < 400) { const q = L.at(Math.random() * this.P.L, (Math.random() < 0.5 ? -1 : 1) * (45 + Math.random() * 70)); const cx = q.x, cz = q.z, r = 28 + Math.random() * 30; let ok = true; for (let a = 0; a < 6.28 && ok; a += 0.5) if (!isWaterDeep(cx + Math.cos(a) * r, cz + Math.sin(a) * r)) ok = false; if (!ok) continue; this.boatP.push({ cx, cz, r, a: Math.random() * 6.28, w: (14 + Math.random() * 8) / r * (Math.random() < 0.5 ? -1 : 1) }); this.boats.setColorAt(this.boatP.length - 1, new THREE.Color(cols[this.boatP.length % cols.length])); }
      this.boats.count = this.wakes.count = this.boatP.length; if (this.boats.instanceColor) this.boats.instanceColor.needsUpdate = true; }
    // balões gigantes (envelope em gomos + cesto)
    { const pts = []; for (let i = 0; i <= 14; i++) { const u = i / 14; const y = -10 + u * 22; const r = u < 0.18 ? 1.6 + u / 0.18 * 4 : 9 * Math.sin(Math.min(1, (u - 0.05) / 0.95) * Math.PI * 0.62 + 0.55) * (u > 0.92 ? (1 - u) / 0.08 * 0.6 + 0.4 : 1); pts.push(new THREE.Vector2(Math.max(0.01, r), y)); }
      let env = new THREE.LatheGeometry(pts, lo ? 12 : 16); env = env.toNonIndexed(); const n = env.attributes.position.count; const ca = new Float32Array(n * 3); const P = env.attributes.position;
      for (let i = 0; i < n; i++) { const a = Math.atan2(P.getZ(i), P.getX(i)); const k = Math.floor(((a + Math.PI) / (Math.PI * 2)) * (lo ? 12 : 16) + 0.5) % 2 ? 1 : 0.62; ca[i * 3] = ca[i * 3 + 1] = ca[i * 3 + 2] = k; } env.setAttribute('color', new THREE.BufferAttribute(ca, 3)); env.deleteAttribute('uv');
      const bask = merge([cbox(2.2, 1.6, 2.2, 0, -14, 0, 0x7a4a22), ...[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([a, b]) => cbox(0.08, 4.4, 0.08, a * 1.2, -11.4, b * 1.2, 0x333333))]);
      this.balloons = this.inst(env, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide }), N.balloons, 'funBalloons'); this.baskets = this.inst(bask, sol, N.balloons, 'funBaskets');
      const bc = [0xff4fb8, 0xffd23f, 0x29f0ff, 0xff6a3d, 0x45ff9a, 0xb45cff, 0xff3b3b];
      this.balP = Array.from({ length: N.balloons }, (_, i) => { const q = this.P.loop.at(this.P.L * (i + 0.3) / N.balloons, (i % 2 ? 1 : -1) * (70 + (i % 3) * 35)); this.balloons.setColorAt(i, new THREE.Color(bc[i % bc.length])); return { x: q.x, z: q.z, y: 48 + (i * 23) % 45, ph: i * 1.7, vx: 0.4 + (i % 3) * 0.15 }; });
      if (this.balloons.instanceColor) this.balloons.instanceColor.needsUpdate = true; }
    // aviões (genéricos, sem marca) com luzes de navegação piscando
    { const s = [], g = []; const fus = new THREE.CylinderGeometry(2, 2, 38, 10); fus.rotateX(Math.PI / 2); s.push(paint(fus, 0xf2f4f8)); const nose = new THREE.ConeGeometry(2, 5, 10); nose.rotateX(Math.PI / 2); nose.translate(0, 0, 21.5); s.push(paint(nose, 0xf2f4f8));
      s.push(cbox(36, 0.5, 6, 0, -0.6, 2, 0xdfe3ea), cbox(12, 0.4, 3.4, 0, 1, -17, 0xdfe3ea), cbox(0.5, 7, 4.4, 0, 4.4, -17, 0x2c6fd6), cbox(1.6, 1.6, 4.5, -7, -1.8, 4, 0x9aa3b0), cbox(1.6, 1.6, 4.5, 7, -1.8, 4, 0x9aa3b0));
      g.push(cbox(0.7, 0.7, 0.7, -18.2, -0.6, 2, 0xff2020), cbox(0.7, 0.7, 0.7, 18.2, -0.6, 2, 0x20ff40), cbox(0.6, 0.6, 0.6, 0, 8, -18.5, 0xffffff), cbox(0.6, 0.4, 0.6, 0, -2.2, 0, 0xff3030));
      this.planes = this.inst(merge(s), sol, N.planes, 'funPlanes'); this.planesG = this.inst(merge(g), new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false, transparent: true }), N.planes, 'funPlanesGlow');
      this.planeP = Array.from({ length: N.planes }, (_, i) => ({ cx: 700 - i * 500, cz: 0, r: 1900 + i * 500, y: 300 + i * 110, a: i * 3, w: (72 / (1900 + i * 500)) * (i % 2 ? -1 : 1) })); }
    this.updateScenery(0, 0);
  }
  inst(geo, mat, n, name) { const m = new THREE.InstancedMesh(geo, mat, Math.max(1, n)); m.count = n; m.frustumCulled = false; m.name = name; this.group.add(m); return m; }
  setM(mesh, j, x, y, z, ry, rz = 0, rx = 0, sc = 1) { const d = this._d; d.position.set(x, y, z); d.rotation.set(rx, ry, rz, 'YXZ'); d.scale.setScalar(sc); d.updateMatrix(); mesh.setMatrixAt(j, d.matrix); }
  updateScenery(dt, t) {
    this.shipP.forEach((p, i) => { p.a += p.w * dt; const x = p.cx + Math.cos(p.a) * p.rx, z = p.cz + Math.sin(p.a) * p.rz; const h = Math.atan2(-Math.sin(p.a) * p.rx * Math.sign(p.w), Math.cos(p.a) * p.rz * Math.sign(p.w)); for (const m of [this.ships, this.shipsG]) this.setM(m, i, x, WATER_Y + Math.sin(t * 0.4 + i) * 0.15, z, h); });
    this.boatP.forEach((p, i) => { p.a += p.w * dt; const x = p.cx + Math.cos(p.a) * p.r, z = p.cz + Math.sin(p.a) * p.r; const h = Math.atan2(-Math.sin(p.a) * Math.sign(p.w), Math.cos(p.a) * Math.sign(p.w)); this.setM(this.boats, i, x, WATER_Y + 0.1 + Math.sin(t * 6 + i) * 0.08, z, h, -Math.sign(p.w) * 0.12, -0.06); this.setM(this.wakes, i, x, WATER_Y + 0.12, z, h); });
    this.balP.forEach((p, i) => { const x = p.x + Math.sin(t * 0.05 + p.ph) * 60 * p.vx, z = p.z + Math.cos(t * 0.04 + p.ph) * 40, y = p.y + Math.sin(t * 0.3 + p.ph) * 4; for (const m of [this.balloons, this.baskets]) this.setM(m, i, x, y, z, t * 0.02 + p.ph, 0, 0, 1.5); });
    this.planeP.forEach((p, i) => { p.a += p.w * dt; const x = p.cx + Math.cos(p.a) * p.r, z = p.cz + Math.sin(p.a) * p.r; const h = Math.atan2(-Math.sin(p.a) * Math.sign(p.w), Math.cos(p.a) * Math.sign(p.w)); for (const m of [this.planes, this.planesG]) this.setM(m, i, x, p.y, z, h, Math.sign(p.w) * 0.18); });
    for (const m of [this.ships, this.shipsG, this.boats, this.wakes, this.balloons, this.baskets, this.planes, this.planesG]) m.instanceMatrix.needsUpdate = true;
    this.planesG.material.opacity = Math.sin(t * 7) > 0.6 ? 1 : 0.35;
    const n = this.G.env ? this.G.env.night : 0; this.shipsG.visible = n > 0.15;
  }
  // ---------------- quadro ----------------
  update(dt, t, camera, loc) {
    this.t = t; const G = this.G; const cx = camera.position.x, cz = camera.position.z;
    this.group.visible = Math.hypot(cx - 960, cz) < 3600; if (!this.group.visible) return;
    this.updateScenery(dt, t);
    // reaparecer e animar coletáveis perto da câmera
    const v = G.player.vehicle; const ok = v && !v.spec.boat && v.type !== 'heli';
    for (const it of this.items) { if (!it.on && it.back && t > it.back) { it.on = true; it.back = 0; this.setItem(it, t); } if (it.on && Math.abs(it.x - cx) < 160 && Math.abs(it.z - cz) < 160) this.setItem(it, t); }
    if (ok && loc && loc.d < 40 && Math.abs(loc.lat) < this.P.halfW + 2 && Math.abs(v.y - loc.y) < 3) {
      for (const it of this.items) { if (!it.on) continue; const ds = wrapD(it.s - loc.s, this.P.L); if (ds < -6 || ds > 6) continue; if (Math.hypot(it.x - v.x, it.z - v.z) < 2.7) this.collect(it, v); }
      this.missions(dt, v, loc);
    } else { this.lastS = null; if (this.zone) { this.zone = null; this.zoneLive = 0; } }
    if (this._dirty && (this._saveT = (this._saveT || 0) - dt) <= 0) { this._saveT = 3; this._dirty = false; saveF(this.data); }
    this.hud();
  }
  hud() {
    const el = $('bfZone'); if (!el) return; const Z = this.zone;
    if (!Z) { if (!el.hidden) el.hidden = true; return; }
    const sc = Math.round(Z.score), k = Math.min(1, sc / Z.z.target); const h = `🌀 <b>${sc.toLocaleString('pt-BR')}</b> / ${Z.z.target}<i style="width:${Math.round(k * 100)}%"></i>`;
    if (el._h !== h) { el.innerHTML = h; el._h = h; } el.hidden = false; el.classList.toggle('ok', sc >= Z.z.target);
  }
}
