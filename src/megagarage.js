// Mega Garagem: galpão gigante (dá para entrar a pé) com 50 carros tunados originais à venda com o dinheiro do jogo.
// Comprou → é seu: entra, sai dirigindo, pinta e tuna (botão 🎨). Endereço + GPS no app 🏎️ do celular.
import * as THREE from 'three';
import { Vehicle, SPECS } from './vehicles.js';
import { addBox, HOOKS, roadAt, districtName, surfaceY } from './world.js';
import { canvasTex } from './util.js';
const $ = (id) => document.getElementById(id);

// ---- tema (o Neon Distrito troca só este bloco)
export const MEGA = {
  name: 'Mega Garagem Solara', short: 'MEGA GARAGEM', icon: '🏎️', handle: '@mega.garagem',
  x0: -642, x1: -558, z0: 322, z1: 428, H: 9, door: { z: 375, w: 18 },
  wall: 0xf4efe6, trim: 0xff4fb8, neon: '#ff4fb8', neon2: '#29f0ff', floor: '#8d8f97', line: '#f5f5f5',
};
const ROWS = [-630, -615, -600, -585, -570], COLS = 10, Z0 = 330, DZ = 10.2;
const TYPE_LABEL = { sport: 'esportivo', sedan: 'sedã', classic: 'clássico', suv: 'SUV', pickup: 'picape', rc_gt: 'GT de pista', rc_muscle: 'muscle V8', rc_jdm: 'drift japonês', rc_hyper: 'hiperesportivo' };
// 50 modelos originais: [nome, base, preço, ×vel. máx, ×aceleração, ×aderência]
export const CATALOG = [
  ['Brisa Coupé', 'sport', 1200, 0.92, 0.9, 1], ['Maré Sedã', 'sedan', 1300, 0.98, 1, 1], ['Besouro Retrô', 'classic', 1400, 1.05, 1.1, 1], ['Coqueiro SUV', 'suv', 1500, 0.98, 1, 1], ['Atol Picape', 'pickup', 1600, 0.96, 1, 1],
  ['Garça Urbana', 'sedan', 1800, 1.02, 1.05, 1.02], ['Pelicano XL', 'suv', 2000, 1.02, 1.05, 1], ['Siri Clássico', 'classic', 2200, 1.12, 1.18, 1.02], ['Cajú Sport', 'sport', 2500, 0.96, 0.95, 1.02], ['Areia Trail', 'pickup', 2700, 1.02, 1.06, 1.04],
  ['Lagosta GT', 'sport', 3000, 1.0, 1.0, 1.03], ['Concha Luxo', 'sedan', 3300, 1.06, 1.1, 1.04], ['Mangue 4x4', 'suv', 3600, 1.06, 1.1, 1.05], ['Veleiro Cabrio', 'classic', 3900, 1.18, 1.25, 1.05], ['Recife Turbo', 'sport', 4200, 1.03, 1.05, 1.04],
  ['Golfinho S', 'sedan', 4600, 1.1, 1.15, 1.06], ['Tartaruga Off', 'pickup', 5000, 1.08, 1.12, 1.06], ['Arara Coupé', 'sport', 5500, 1.05, 1.08, 1.05], ['Horizonte SUV', 'suv', 6000, 1.1, 1.16, 1.06], ['Pôr do Sol 88', 'classic', 6500, 1.24, 1.3, 1.06],
  ['Vento Leste', 'sport', 7000, 1.07, 1.1, 1.06], ['Tubarão R', 'sedan', 7600, 1.14, 1.2, 1.08], ['Coral Raptor', 'pickup', 8200, 1.12, 1.18, 1.08], ['Faísca GT', 'sport', 8800, 1.09, 1.13, 1.07], ['Lua Cheia', 'sport', 9500, 1.11, 1.15, 1.08],
  ['Kaze Nami', 'rc_jdm', 10000, 0.96, 0.95, 1], ['Trovão Areia', 'rc_muscle', 10800, 0.95, 0.95, 1], ['Solara GT Sol', 'rc_gt', 11600, 0.96, 0.96, 1], ['Kaze Tsuki', 'rc_jdm', 12500, 1.0, 1.0, 1.02], ['Trovão Noite', 'rc_muscle', 13400, 1.0, 1.0, 1],
  ['GT Maresia', 'rc_gt', 14300, 1.0, 1.0, 1.02], ['Kaze Hoshi', 'rc_jdm', 15200, 1.03, 1.04, 1.04], ['Trovão Coral', 'rc_muscle', 16200, 1.03, 1.04, 1.02], ['GT Farol', 'rc_gt', 17200, 1.03, 1.03, 1.03], ['Kaze Arashi', 'rc_jdm', 18300, 1.05, 1.06, 1.05],
  ['Trovão Tempestade', 'rc_muscle', 19400, 1.05, 1.07, 1.03], ['GT Ciclone', 'rc_gt', 20500, 1.05, 1.06, 1.04], ['Aurora Brisa', 'rc_hyper', 22000, 0.97, 0.97, 1], ['Aurora Neblina', 'rc_hyper', 24000, 1.0, 1.0, 1.01], ['Kaze Ryu', 'rc_jdm', 26000, 1.08, 1.1, 1.07],
  ['Trovão Vulcão', 'rc_muscle', 28000, 1.08, 1.1, 1.05], ['GT Relâmpago', 'rc_gt', 30000, 1.08, 1.09, 1.06], ['Aurora Cometa', 'rc_hyper', 32500, 1.03, 1.04, 1.03], ['Aurora Eclipse', 'rc_hyper', 35000, 1.05, 1.06, 1.04], ['Kaze Kaminari', 'rc_jdm', 37500, 1.11, 1.13, 1.09],
  ['Trovão Supernova', 'rc_muscle', 40000, 1.11, 1.13, 1.07], ['GT Aurora Boreal', 'rc_gt', 43000, 1.11, 1.12, 1.08], ['Aurora Galáxia', 'rc_hyper', 46000, 1.08, 1.09, 1.06], ['Aurora Nebulosa', 'rc_hyper', 50000, 1.1, 1.11, 1.07], ['Aurora Infinito', 'rc_hyper', 60000, 1.13, 1.14, 1.08],
];
const PAINTS = [0xff2d55, 0xff8a00, 0xffd60a, 0x30d158, 0x00c7be, 0x0a84ff, 0x7d4dff, 0xff4fb8, 0xf5f5f7, 0x1c1c1e, 0x8e8e93, 0x5ac8fa];
const GLOWS = [0xff2bd6, 0x29f0ff, 0x7d4dff, 0x39ff6a, 0xff6a00, 0xffffff], RIMS = [0xc8ccd0, 0x1a1a1a, 0xffd23f, 0xff2d55, 0x29f0ff, 0xff4fb8], ACC = [0xffffff, 0x111111, 0x29f0ff, 0xff4fb8, 0xffd23f];
function rng(seed) { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function megaTune(i) {
  const [name, type, , pmax, pacc, pgrip] = CATALOG[i]; const r = rng(7700 + i * 13); const pk = (a) => a[Math.floor(r() * a.length)];
  const text = name.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Z0-9 !\-.]/g, '').slice(0, 14).trim();
  const t = { paint: PAINTS[(i * 5 + 3) % PAINTS.length], glow: pk(GLOWS), spoiler: SPECS[type].race ? 0 : 1 + Math.floor(r() * 2), kit: r() < 0.75, rim: pk(RIMS), text, style: Math.floor(r() * 3), accent: pk(ACC), model: name, pmax, pacc, pgrip, mega: i };
  if (SPECS[type].race) t.num = 10 + i;
  return t;
}
export function slotPos(i) { return { x: ROWS[Math.floor(i / COLS)], z: Z0 + (i % COLS) * DZ, h: Math.PI / 2 }; }

export class MegaGarage {
  constructor(G) {
    this.G = G; const S = G.save; S.mega = S.mega || { owned: [], tunes: {} }; S.mega.tunes = S.mega.tunes || {}; S.mega.owned = S.mega.owned || [];
    this.slots = CATALOG.map((c, i) => ({ i, v: null, out: false })); this.t = 0; this.focus = null; const lv = G.Q.level; this.N = lv === 'low' ? 8 : lv === 'high' ? 20 : 14; this.R = lv === 'low' ? 26 : lv === 'high' ? 46 : 36; this.inside = false; this.visits = 0;
    const M = MEGA; this.cx = (M.x0 + M.x1) / 2; this.cz = (M.z0 + M.z1) / 2; this.doorOut = { x: M.x1 + 10, z: M.door.z };
    this.build(); this.colliders(); this.ui();
    HOOKS.map.push((g, X, Z) => { const k = X(1) - X(0); g.fillStyle = '#3a3346'; g.fillRect(X(M.x0), Z(M.z0), (M.x1 - M.x0) * k, (M.z1 - M.z0) * k); g.strokeStyle = M.neon; g.lineWidth = 2; g.strokeRect(X(M.x0), Z(M.z0), (M.x1 - M.x0) * k, (M.z1 - M.z0) * k);
      g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(M.icon, X(this.cx), Z(this.cz) - 6); g.font = 'bold 9px sans-serif'; g.fillText('MEGA', X(this.cx), Z(this.cz) + 9); });
  }
  get owned() { return this.G.save.mega.owned; }
  isOwned(i) { return this.owned.includes(i); }
  price(i) { return CATALOG[i][2]; }
  tuneOf(i) { return Object.assign(megaTune(i), this.G.save.mega.tunes[i] || {}, { model: CATALOG[i][0], pmax: CATALOG[i][3], pacc: CATALOG[i][4], pgrip: CATALOG[i][5], mega: i }); }
  address() { const r = roadAt(MEGA.x1 + 12, MEGA.door.z); const st = r.seg && r.seg.line && r.seg.line.name || 'Avenida'; return `${st}, nº ${Math.round(Math.abs(MEGA.door.z) * 4)} · ${districtName(this.cx, this.cz)}`; }
  // ---------------- prédio
  build() {
    const G = this.G, M = MEGA, g = new THREE.Group(); this.g = g; G.scene.add(g); const y0 = surfaceY(this.cx, this.cz) - 0.02; this.y0 = y0;
    const W = M.x1 - M.x0, D = M.z1 - M.z0, H = M.H;
    const wallM = new THREE.MeshStandardMaterial({ color: M.wall, roughness: 0.85 }); const trimM = new THREE.MeshStandardMaterial({ color: 0x22222a, roughness: 0.5, metalness: 0.4 });
    const glowM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(M.trim), emissiveIntensity: 1.2 }); this.glowM = glowM;
    // piso com vagas pintadas
    const fl = canvasTex(1024, 1024, (c, w, h) => { c.fillStyle = M.floor; c.fillRect(0, 0, w, h); const sx = w / W, sz = h / D; c.strokeStyle = M.line; c.lineWidth = 3;
      for (let r = 0; r < ROWS.length; r++) for (let k = 0; k <= COLS; k++) { const x = (ROWS[r] - M.x0 - 2.8) * sx, z = (Z0 + (k - 0.5) * DZ - M.z0) * sz; c.beginPath(); c.moveTo(x, z); c.lineTo(x + 5.6 * sx, z); c.stroke(); }
      c.fillStyle = 'rgba(255,210,63,.85)'; for (let r = 0; r < ROWS.length; r++) for (let k = 0; k < COLS; k++) { c.font = 'bold 18px sans-serif'; c.textAlign = 'center'; c.fillText(String(r * COLS + k + 1), (ROWS[r] - M.x0 - 3.6) * sx, (Z0 + k * DZ - M.z0) * sz + 6); }
      c.strokeStyle = 'rgba(255,210,63,.7)'; c.lineWidth = 6; c.setLineDash([24, 18]); c.beginPath(); c.moveTo((M.x1 - M.x0 - 5) * sx, 30); c.lineTo((M.x1 - M.x0 - 5) * sx, h - 30); c.stroke(); });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: fl, roughness: 0.6, metalness: 0.1 })); floor.position.set(this.cx, y0 + 0.04, this.cz); floor.receiveShadow = true; g.add(floor);
    const box = (x0, z0, x1, z1, ya, yb, m) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, yb - ya, z1 - z0), m); b.position.set((x0 + x1) / 2, y0 + (ya + yb) / 2, (z0 + z1) / 2); g.add(b); return b; };
    const t = 0.6, dz0 = M.door.z - M.door.w / 2, dz1 = M.door.z + M.door.w / 2;
    box(M.x0, M.z0, M.x1, M.z0 + t, 0, H, wallM); box(M.x0, M.z1 - t, M.x1, M.z1, 0, H, wallM); box(M.x0, M.z0, M.x0 + t, M.z1, 0, H, wallM);
    box(M.x1 - t, M.z0, M.x1, dz0, 0, H, wallM); box(M.x1 - t, dz1, M.x1, M.z1, 0, H, wallM); box(M.x1 - t, dz0, M.x1, dz1, 6.2, H, wallM);
    // faixas neon nas paredes (por dentro e por fora) e moldura da porta
    for (const [x0, z0, x1, z1] of [[M.x0 + t, M.z0 + t, M.x1 - t, M.z0 + t + 0.08], [M.x0 + t, M.z1 - t - 0.08, M.x1 - t, M.z1 - t], [M.x0 + t, M.z0 + t, M.x0 + t + 0.08, M.z1 - t]]) box(x0, z0, x1, z1, 6.6, 6.85, glowM);
    for (const [x0, z0, x1, z1] of [[M.x0 - 0.05, M.z0 - 0.08, M.x1 + 0.05, M.z0], [M.x0 - 0.05, M.z1, M.x1 + 0.05, M.z1 + 0.08], [M.x0 - 0.08, M.z0, M.x0, M.z1], [M.x1, M.z0, M.x1 + 0.08, dz0], [M.x1, dz1, M.x1 + 0.08, M.z1]]) box(x0, z0, x1, z1, H - 0.5, H - 0.25, glowM);
    box(M.x1, dz0 - 0.3, M.x1 + 0.12, dz0, 0, 6.2, glowM); box(M.x1, dz1, M.x1 + 0.12, dz1 + 0.3, 0, 6.2, glowM); box(M.x1, dz0 - 0.3, M.x1 + 0.12, dz1 + 0.3, 6.2, 6.5, glowM);
    // letreiro
    const sign = canvasTex(1024, 192, (c, w, h) => { c.fillStyle = '#120c1c'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 24; c.shadowColor = M.neon; c.fillStyle = '#fff'; c.font = 'bold 92px sans-serif'; c.fillText(`${M.icon} ${M.short}`, w / 2, h * 0.42, w - 40); c.shadowColor = M.neon2; c.fillStyle = M.neon2; c.font = 'bold 34px sans-serif'; c.fillText('50 CARROS TUNADOS · ENTRE A PÉ', w / 2, h * 0.82, w - 40); }, { clamp: true });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(26, 4.9), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sg.position.set(M.x1 + 0.35, y0 + H + 1.9, M.door.z); sg.rotation.y = Math.PI / 2; g.add(sg); this.signMesh = sg;
    box(M.x1 + 0.05, M.door.z - 13.2, M.x1 + 0.3, M.door.z + 13.2, H - 0.6, H + 4.5, trimM);
    // teto (some quando você está dentro, para a câmera enxergar)
    const roof = new THREE.Group(); g.add(roof); this.roof = roof;
    const rf = new THREE.Mesh(new THREE.BoxGeometry(W + 0.6, 0.4, D + 0.6), new THREE.MeshStandardMaterial({ color: 0x5d6270, roughness: 0.8 })); rf.position.set(this.cx, y0 + H + 0.2, this.cz); roof.add(rf);
    for (let k = 0; k < 6; k++) { const s = new THREE.Mesh(new THREE.BoxGeometry(W - 8, 0.12, 2.2), new THREE.MeshStandardMaterial({ color: 0xbfe9ff, emissive: 0x6fb8ff, emissiveIntensity: 0.4, roughness: 0.2 })); s.position.set(this.cx, y0 + H + 0.45, M.z0 + 10 + k * (D - 20) / 5); roof.add(s); }
    // luminárias internas (penduradas, ficam visíveis com o teto escondido)
    const lampM = new THREE.MeshBasicMaterial({ color: 0xfff4dc, toneMapped: false }); const lampG = new THREE.BoxGeometry(0.5, 0.12, 6);
    const lamps = new THREE.InstancedMesh(lampG, lampM, ROWS.length * 4); let n = 0; const m4 = new THREE.Matrix4();
    for (const x of ROWS) for (let k = 0; k < 4; k++) { m4.makeTranslation(x - 7.5, y0 + H - 1.1, M.z0 + 16 + k * (D - 32) / 3); lamps.setMatrixAt(n++, m4); } g.add(lamps); this.lamps = lamps;
    // carros "de vitrine" baratos (instanciados) — os de perto viram carros de verdade
    const bodyG = new THREE.BoxGeometry(1.9, 0.75, 4.4), cabG = new THREE.BoxGeometry(1.6, 0.5, 2.1);
    this.pBody = new THREE.InstancedMesh(bodyG, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.35, metalness: 0.5 }), 50);
    this.pCab = new THREE.InstancedMesh(cabG, new THREE.MeshStandardMaterial({ color: 0x0c1018, roughness: 0.1, metalness: 0.6 }), 50);
    const col = new THREE.Color(); for (let i = 0; i < 50; i++) { col.setHex(this.tuneOf(i).paint); this.pBody.setColorAt(i, col); }
    g.add(this.pBody, this.pCab); this.proxyDirty = true; this.updateProxies();
  }
  colliders() { const M = MEGA, t = 0.6, dz0 = M.door.z - M.door.w / 2, dz1 = M.door.z + M.door.w / 2, H = M.H + 0.4;
    addBox(M.x0, M.z0, M.x1, M.z0 + t, H); addBox(M.x0, M.z1 - t, M.x1, M.z1, H); addBox(M.x0, M.z0, M.x0 + t, M.z1, H); addBox(M.x1 - t, M.z0, M.x1, dz0, H); addBox(M.x1 - t, dz1, M.x1, M.z1, H); }
  updateProxies() {
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2), sc = new THREE.Vector3(1, 1, 1), z0 = new THREE.Vector3(0, 0, 0), p = new THREE.Vector3();
    for (const s of this.slots) { const P = slotPos(s.i); const hide = !!s.v || s.out;
      if (hide) { m4.compose(p.set(P.x, -50, P.z), q, z0); this.pBody.setMatrixAt(s.i, m4); this.pCab.setMatrixAt(s.i, m4); continue; }
      m4.compose(p.set(P.x, this.y0 + 0.62, P.z), q, sc); this.pBody.setMatrixAt(s.i, m4); m4.compose(p.set(P.x - 0.3, this.y0 + 1.25, P.z), q, sc); this.pCab.setMatrixAt(s.i, m4); }
    this.pBody.instanceMatrix.needsUpdate = true; this.pCab.instanceMatrix.needsUpdate = true; if (this.pBody.instanceColor) this.pBody.instanceColor.needsUpdate = true; this.proxyDirty = false;
  }
  // ---------------- carros de verdade (os mais perto de você)
  spawn(s) { const G = this.G, P = slotPos(s.i), c = CATALOG[s.i]; const v = new Vehicle(c[1], G.scene, G.Q, undefined, this.tuneOf(s.i)); v.place(P.x, P.z, P.h); v.parked = true; v.megaId = s.i; v.nitro = 1; if (SPECS[c[1]].race) v.race = false;
    this.flags(v); G.vehicles.push(v); s.v = v; s.out = false; this.proxyDirty = true; return v; }
  flags(v) { const own = this.isOwned(v.megaId); v.noEnter = !own; v.mine = own; }
  drop(s) { const G = this.G, v = s.v; if (!v) return; const k = G.vehicles.indexOf(v); if (k >= 0) G.vehicles.splice(k, 1); v.dispose(G.scene); s.v = null; s.out = false; this.proxyDirty = true; }
  replaced(oldV, nv) { const s = this.slots[oldV.megaId]; if (s && s.v === oldV) s.v = nv; nv.megaId = oldV.megaId; if (oldV.race === false) nv.race = false; this.flags(nv); }
  inHall(x, z, m = 0) { const M = MEGA; return x > M.x0 - m && x < M.x1 + m && z > M.z0 - m && z < M.z1 + m; }
  manage() {
    const G = this.G, p = G.player, pv = p.vehicle, px = pv ? pv.x : p.x, pz = pv ? pv.z : p.z; const dHall = Math.hypot(px - this.cx, pz - this.cz);
    const want = new Set(); if (dHall < 160) { const list = this.slots.map(s => { const P = slotPos(s.i); return [Math.hypot(P.x - px, P.z - pz), s]; }).filter(a => a[0] < this.R).sort((a, b) => a[0] - b[0]).slice(0, this.N); for (const [, s] of list) want.add(s); }
    let spawned = 0;
    for (const s of this.slots) {
      const v = s.v;
      if (v) { const P = slotPos(s.i); const moved = Math.hypot(v.x - P.x, v.z - P.z) > 3 || v.driver; if (moved) s.out = true;
        if (v.driver) continue;
        if (s.out) { if (Math.hypot(v.x - px, v.z - pz) > 220) this.drop(s); else continue; } // deixou na rua e foi embora: volta para a vaga
        else if (!want.has(s)) this.drop(s);
      } else if (want.has(s) && spawned < 1) { this.spawn(s); spawned++; }
    }
    if (this.proxyDirty) this.updateProxies();
  }
  // ---------------- interação
  ui() {
    const card = $('megaCard'); if (!card) return; card.addEventListener('pointerdown', e => e.stopPropagation());
    card.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const i = this.focus; if (i == null) return;
      if (b.dataset.k === 'buy') this.buy(i); else if (b.dataset.k === 'tune') this.tune(i); else if (b.dataset.k === 'in') this.enter(i); });
  }
  nearest() { const p = this.G.player; if (p.vehicle || !this.inHall(p.x, p.z)) return null; let best = null, bd = 2.4; for (const s of this.slots) { if (s.out) continue; const P = slotPos(s.i); const d = Math.hypot(Math.max(0, Math.abs(P.x - p.x) - 2.3), Math.max(0, Math.abs(P.z - p.z) - 1.0)); if (d < bd) { bd = d; best = s.i; } } return best; }
  canBuy(i) { return i != null && !this.isOwned(i) && this.G.save.money >= this.price(i); }
  act() { const i = this.focus; if (i == null || this.isOwned(i)) return false; this.buy(i); return true; }
  buy(i) {
    const G = this.G, c = CATALOG[i]; if (this.isOwned(i)) return true; const pr = c[2];
    if (G.save.money < pr) { G.ui.toast(`💸 Faltam <b>$${(pr - G.save.money).toLocaleString('pt-BR')}</b> para o <b>${c[0]}</b> · ganhe com corridas, ponte, entregas e táxi`, 2600); G.audio.chime && G.audio.chime('fail'); return false; }
    G.addMoney(-pr); this.owned.push(i); G.persist && G.persist(); const s = this.slots[i]; if (s.v) this.flags(s.v);
    G.ui.big('É SEU!'); G.ui.toast(`🔑 <b>${c[0]}</b> comprado por $${pr.toLocaleString('pt-BR')}! Entre (${G.touch ? '🚗' : 'E'}) e saia dirigindo · 🎨 pinte e tune aqui mesmo`, 3600); G.audio.chime && G.audio.chime('win');
    G.feed && G.feed.unshift([MEGA.handle, `Mais um cliente feliz levando o ${c[0]} 🔑✨ (${this.owned.length}/50 na coleção)`, 'agora']); this.cardT = 0; return true;
  }
  enter(i) { const s = this.slots[i]; if (!s.v || !this.isOwned(i)) return; this.G.enterCar(s.v); this.focus = null; }
  tune(i) { const G = this.G, s = this.slots[i]; if (!s.v || !this.isOwned(i)) return; G.enterCar(s.v); this.focus = null; G.garage.open(); }
  saveTune(v, draft) { const i = v.megaId; const keep = {}; for (const k of ['paint', 'glow', 'spoiler', 'kit', 'rim', 'text', 'style', 'accent']) keep[k] = draft[k]; this.G.save.mega.tunes[i] = keep; this.G.persist && this.G.persist(); }
  stars(x, a, b) { const n = Math.max(1, Math.min(5, Math.round(1 + (x - a) / (b - a) * 4))); return '★'.repeat(n) + '☆'.repeat(5 - n); }
  card() {
    const el = $('megaCard'); if (!el) return; const i = this.focus; const G = this.G;
    if (i == null || G.paused) { if (!el.hidden) el.hidden = true; return; }
    const c = CATALOG[i], sp = SPECS[c[1]], own = this.isOwned(i); const key = i + ':' + own + ':' + (G.save.money >= c[2]);
    if (this._ck !== key || el.hidden) { this._ck = key;
      const kmh = Math.round(sp.max * c[3] * 3.6); const btn = own ? `<button data-k="in">🔑 Entrar</button><button data-k="tune" class="hot">🎨 Pintar e tunar</button>` : `<button data-k="buy" class="${G.save.money >= c[2] ? 'hot' : 'off'}">💳 Comprar $${c[2].toLocaleString('pt-BR')}</button>`;
      el.innerHTML = `<b>${c[0]}</b> <small>vaga ${i + 1} · ${TYPE_LABEL[c[1]]}${own ? ' · <span class="own">É SEU ✔</span>' : ''}</small><div class="mgStats">🏁 ${kmh} km/h · ⚡ ${this.stars(sp.acc * c[4], 6, 21)} · 🛞 ${this.stars(sp.grip * c[5], 5, 10)}</div><div class="stAsk">${btn}</div>`; el.hidden = false; }
  }
  phoneHtml() {
    const own = this.owned.slice().sort((a, b) => a - b); const S = this.G.save; const cheap = CATALOG.map((c, i) => [c, i]).filter(([, i]) => !this.isOwned(i)).slice(0, 6);
    return `<h3>${MEGA.icon} ${MEGA.name}</h3><div class="post"><b>📍 Endereço</b><br>${this.address()}<br><small>50 carros tunados originais · entre a pé, chegue perto do carro e compre</small></div>
      <div class="list"><button data-a="go" data-x="${this.doorOut.x}" data-z="${this.doorOut.z}">🧭 Traçar rota no GPS<span>GPS ›</span></button>
      <div class="row">Sua coleção<b>${own.length}/50</b></div><div class="row">Seu dinheiro<b>$${S.money.toLocaleString('pt-BR')}</b></div>
      ${own.slice(0, 8).map(i => `<div class="row">🔑 ${CATALOG[i][0]}<b>vaga ${i + 1}</b></div>`).join('')}
      ${cheap.map(([c, i]) => `<div class="row">${c[0]} <small>(${TYPE_LABEL[c[1]]})</small><b>$${c[2].toLocaleString('pt-BR')}</b></div>`).join('')}</div>`;
  }
  // ---------------- quadro a quadro
  update(dt, t, camera, night = 0) {
    const G = this.G; const dc = Math.hypot(camera.position.x - this.cx, camera.position.z - this.cz); this.g.visible = dc < 900; if (!this.g.visible && !this.slots.some(s => s.v)) return;
    this.glowM.emissiveIntensity = 0.5 + night * 1.6;
    const p = G.player, pv = p.vehicle, px = pv ? pv.x : p.x, pz = pv ? pv.z : p.z;
    const inside = this.inHall(px, pz, 0.5) || this.inHall(camera.position.x, camera.position.z, 0.5) || !!(G.garageOpen && pv && pv.megaId != null);
    this.roof.visible = !inside; this.lamps.visible = inside || dc < 200;
    if (inside && !this.inside) { this.visits++; if (this.visits === 1 || !this._welcT || t - this._welcT > 120) { this._welcT = t; G.ui.toast(`${MEGA.icon} <b>${MEGA.name}</b> · 50 carros tunados · chegue perto de um carro para ver preço e comprar · você tem <b>$${G.save.money.toLocaleString('pt-BR')}</b>`, 2400); } }
    this.inside = inside;
    this.t -= dt; if (this.t <= 0) { this.t = 0.25; this.manage(); }
    this.focus = this.nearest(); this.card();
  }
}
