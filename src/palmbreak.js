// t393: palmeiras que quebram (estilo arcade): o carro bate rápido → a palmeira estala na base e tomba com física simples,
// solta folhas e lascas; o carro perde um pouco de velocidade (sem dano); ela volta depois de ~60 s ou quando sai de vista.
import * as THREE from 'three';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);

export class PalmBreak {
  constructor(G, scene, world) {
    this.G = G; this.scene = scene; const P = world && world.palms; this.P = P; this.broken = []; this.fall = []; this.count = 0;
    if (!P) return;
    this.led = world.palmLed || null;
    // grade espacial para achar palmeiras perto do carro
    this.cell = 24; this.grid = new Map();
    for (const p of P.list) { const k = this.key(p.x, p.z); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(p); }
    // materiais da palmeira caindo (sem o vento da copa, que depende de instância)
    this.tm = P.tm; this.cm = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7, side: THREE.DoubleSide });
    // pedaços: folhas (verde) e lascas (madeira) — um InstancedMesh para cada, reaproveitados
    this.NB = 64; this.bits = [];
    const leafG = new THREE.PlaneGeometry(0.55, 0.16), chipG = new THREE.BoxGeometry(0.16, 0.08, 0.1);
    this.leafM = new THREE.InstancedMesh(leafG, new THREE.MeshStandardMaterial({ color: 0x4f9a30, roughness: 0.8, side: THREE.DoubleSide }), this.NB);
    this.chipM = new THREE.InstancedMesh(chipG, new THREE.MeshStandardMaterial({ color: 0x8b6d4e, roughness: 0.9 }), this.NB);
    for (const m of [this.leafM, this.chipM]) { m.frustumCulled = false; m.count = 0; for (let i = 0; i < this.NB; i++) m.setMatrixAt(i, ZERO); scene.add(m); }
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler();
  }
  key(x, z) { return Math.floor(x / this.cell) + ',' + Math.floor(z / this.cell); }
  near(x, z, r) { const out = []; const i0 = Math.floor((x - r) / this.cell), i1 = Math.floor((x + r) / this.cell), j0 = Math.floor((z - r) / this.cell), j1 = Math.floor((z + r) / this.cell);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = this.grid.get(i + ',' + j); if (a) for (const p of a) if (!p.down && Math.hypot(p.x - x, p.z - z) < r) out.push(p); } return out; }
  setInst(p, m) { const P = this.P; P.tmesh.setMatrixAt(p.i, m); P.cmesh.setMatrixAt(p.i, m); P.tmesh.instanceMatrix.needsUpdate = P.cmesh.instanceMatrix.needsUpdate = true; if (this.led && p.led >= 0) { this.led.setMatrixAt(p.led, m); this.led.instanceMatrix.needsUpdate = true; } }
  // carro do jogador (ou qualquer veículo) bate numa palmeira: chamado ANTES da física do carro
  check(v, dt) {
    if (!this.P || !v || v.spec.boat || v.spec.air || v.type === 'heli' || v.type === 'plane') return null;
    const spd = Math.hypot(v.vx || 0, v.vz || 0); if (spd < 5.5) return null; // devagar: a palmeira segura (bate e para, como antes)
    const r = (v.r || (v.spec.w || 1.8) * 0.5) + 0.45, look = spd * dt * 2.5 + 0.3;
    for (const c of v.circles()) {
      const ax = c[0] + v.vx * dt * 1.5, az = c[1] + v.vz * dt * 1.5;
      for (const p of this.near(ax, az, r + look + 1)) { const d = Math.hypot(p.x - ax, p.z - az); if (d < r + look * 0.5) { this.breakPalm(p, v, spd); return p; } }
    }
    return null;
  }
  breakPalm(p, v, spd) {
    const G = this.G; p.down = true; p.t = 0; if (p.circ) p.circ.off = true; this.count++;
    this.setInst(p, ZERO);
    // palmeira que tomba: grupo com o mesmo modelo, gira em volta da base na direção do carro
    const g = new THREE.Group(); const tr = new THREE.Mesh(this.P.tgeo, this.tm), cr = new THREE.Mesh(this.P.cgeo, this.cm); g.add(tr, cr);
    if (this.led && p.led >= 0) { const lg = this.led.geometry, lm = this.led.material; const l = new THREE.Mesh(lg, lm); g.add(l); }
    tr.castShadow = cr.castShadow = true; g.position.set(p.x, p.y, p.z); this.scene.add(g);
    const fx = v.vx / spd, fz = v.vz / spd; const lx = -fz, lz = fx; // lateral do carro
    let side = Math.sign((p.x - v.x) * lx + (p.z - v.z) * lz) || (Math.random() < 0.5 ? -1 : 1);
    let dx = fx * 0.55 + lx * side, dz = fz * 0.55 + lz * side; const dl = Math.hypot(dx, dz); dx /= dl; dz /= dl; // tomba para frente e para o lado (longe da câmera)
    const axis = new THREE.Vector3(dz, 0, -dx).normalize();
    const f = { p, g, axis, th: 0.05, w: 0.6 + spd * 0.04, rest: false, t: 0, bounce: 0 };
    this.fall.push(f); this.applyFall(f);
    // o carro perde um pouco de velocidade (sem dano)
    v.vx *= 0.82; v.vz *= 0.82; if (v.vf !== undefined) v.vf *= 0.82; v.dSpd && (v.dSpd *= 0.82);
    // folhas e lascas
    for (let k = 0; k < 18; k++) this.spawnBit(true, p.x + (Math.random() - 0.5) * 2, p.y + 6 + Math.random() * 3 * p.sc, p.z + (Math.random() - 0.5) * 2, dx * 4 + (Math.random() - 0.5) * 5, 2 + Math.random() * 4, dz * 4 + (Math.random() - 0.5) * 5);
    for (let k = 0; k < 10; k++) this.spawnBit(false, p.x, p.y + 0.4 + Math.random() * 0.6, p.z, dx * 6 + (Math.random() - 0.5) * 6, 2 + Math.random() * 3, dz * 6 + (Math.random() - 0.5) * 6);
    G.audio && G.audio.thud && G.audio.thud(Math.min(14, spd)); G.shake && G.shake(0.25);
    G.onPalmBreak && G.onPalmBreak(p);
  }
  spawnBit(leaf, x, y, z, vx, vy, vz) { this.bits.push({ leaf, x, y, z, vx, vy, vz, t: 0, life: leaf ? 2.4 : 1.6, rx: Math.random() * 6, ry: Math.random() * 6, sp: (Math.random() - 0.5) * 12 }); if (this.bits.length > this.NB * 2) this.bits.shift(); }
  applyFall(f) { const p = f.p; this._q.setFromAxisAngle(f.axis, f.th); const base = new THREE.Quaternion().setFromAxisAngle(UP, p.rot); f.g.quaternion.copy(this._q).multiply(base); f.g.scale.setScalar(p.sc); }
  update(dt, camPos) {
    if (!this.P) return;
    // queda: aceleração "de gravidade" no ângulo, quica de leve ao bater no chão e para deitada
    for (const f of this.fall) { f.t += dt; if (!f.rest) { f.w += (2.2 * Math.sin(f.th) + 0.4) * dt * 1.6; f.th += f.w * dt; if (f.th >= 1.5) { f.th = 1.5; if (f.bounce < 2 && f.w > 0.8) { f.w = -f.w * 0.25; f.bounce++; } else { f.w = 0; f.rest = true; } } this.applyFall(f); } }
    // volta: depois de ~60 s, ou antes (≥ 8 s) se estiver longe da câmera (fora de vista)
    for (let k = this.fall.length - 1; k >= 0; k--) { const f = this.fall[k], p = f.p; const far = camPos ? Math.hypot(camPos.x - p.x, camPos.z - p.z) > 90 : false;
      if (f.t > 60 || (f.t > 8 && far)) { if (this.blocked(p)) continue; this.scene.remove(f.g); this.fall.splice(k, 1); p.down = false; if (p.circ) p.circ.off = false; this.setInst(p, p.m); } }
    // pedaços
    const m = this._m; let nl = 0, nc = 0;
    for (let k = this.bits.length - 1; k >= 0; k--) { const b = this.bits[k]; b.t += dt; if (b.t > b.life) { this.bits.splice(k, 1); continue; }
      b.vy -= (b.leaf ? 4 : 14) * dt; if (b.leaf) { b.vx *= 1 - dt * 1.2; b.vz *= 1 - dt * 1.2; b.vy = Math.max(b.vy, -2.2); } b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; if (b.y < (this.P.list[0] ? 0.05 : 0)) { b.y = 0.05; b.vx *= 0.5; b.vz *= 0.5; b.vy = 0; }
      b.rx += b.sp * dt; b.ry += b.sp * 0.7 * dt; const sc = Math.min(1, (b.life - b.t) * 2);
      this._e.set(b.rx, b.ry, 0); this._q.setFromEuler(this._e); this._v.set(b.x, b.y, b.z); this._s.setScalar(sc); m.compose(this._v, this._q, this._s);
      if (b.leaf) { if (nl < this.NB) this.leafM.setMatrixAt(nl++, m); } else if (nc < this.NB) this.chipM.setMatrixAt(nc++, m); }
    this.leafM.count = nl; this.chipM.count = nc; if (nl) this.leafM.instanceMatrix.needsUpdate = true; if (nc) this.chipM.instanceMatrix.needsUpdate = true;
  }
  blocked(p) { const G = this.G; for (const v of G.vehicles) if (Math.hypot(v.x - p.x, v.z - p.z) < 3) return true; const pl = G.player; return Math.hypot(pl.x - p.x, pl.z - p.z) < 2; }
  respawnAll() { for (const f of this.fall) { this.scene.remove(f.g); f.p.down = false; if (f.p.circ) f.p.circ.off = false; this.setInst(f.p, f.p.m); } this.fall = []; }
}
