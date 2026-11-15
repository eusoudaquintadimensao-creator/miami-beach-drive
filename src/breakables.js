// t418/t419: coisas da rua e da praia que quebram quando o carro passa (estilo arcade, sem dano):
// postes de luz e sinaleiras tombam soltando faíscas/vidro; guarda-sóis voam e tombam; passarelas de madeira sobre a areia
// estilhaçam em tábuas e lascas (som de madeira estalando) e o carro segue quase sem perder velocidade. Tudo volta depois
// (~45 s, ou antes quando sai de vista).
import * as THREE from 'three';
import { SAND_DECKS, groundY } from './world.js';

const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
class Pool { // pedacinhos (InstancedMesh reaproveitado)
  constructor(scene, geo, mat, n) { this.m = new THREE.InstancedMesh(geo, mat, n); this.n = n; this.m.frustumCulled = false; this.m.count = 0; scene.add(this.m); this.k = 0; }
}
export class Breakables {
  constructor(G, scene, world) {
    this.G = G; this.scene = scene; this.fall = []; this.bits = []; this.planks = []; this.count = { poste: 0, sinal: 0, 'guarda-sol': 0, tabua: 0, mesa: 0, cadeira: 0 }; this.cafe = [];
    this.cell = 16; this.grid = new Map(); this.secs = [];
    const m4 = () => new THREE.Matrix4();
    const L = world && world.lampPoles, T = world && world.tlPoles, U = world && world.umb;
    if (L) for (const p of L.list) { p.src = L; p.m = m4(); L.mesh.getMatrixAt(p.i, p.m); p.r = 0.3; p.mass = 0.9; this.reg(p); if (L.heads) { p.hm = m4(); L.heads.getMatrixAt(p.i, p.hm); } }
    if (T) for (const p of T.list) { p.src = T; p.m = m4(); T.mesh.getMatrixAt(p.i, p.m); p.r = 0.35; p.mass = 0.88; p.bm = p.bulbs.map(b => { const q = m4(); T.bulbs.getMatrixAt(b, q); return q; }); this.reg(p); }
    if (U) for (const p of U.list) { p.src = U; p.m = m4(); U.mesh.getMatrixAt(p.i, p.m); p.r = 0.45; p.mass = 0.985; p.col = new THREE.Color(); if (U.mesh.instanceColor) U.mesh.getColorAt(p.i, p.col); else p.col.set(0xff4f6f); this.reg(p); }
    // t439: mesas e cadeiras de café (voam, capotam e caem com barulho de metal/madeira)
    const CF = world && world.cafe;
    if (CF) for (const S of [CF.tables, CF.chairs]) for (const p of S.list) { p.src = S; p.m = m4(); S.mesh.getMatrixAt(p.i, p.m); p.r = p.kind === 'mesa' ? 0.45 : 0.3; p.mass = p.kind === 'mesa' ? 0.975 : 0.99; p.col = new THREE.Color(1, 1, 1); if (S.mesh.instanceColor) S.mesh.getColorAt(p.i, p.col); this.reg(p); this.cafe.push(p); }
    // passarelas de madeira sobre a areia: um grupo por trecho de ~3 m (tábuas, pernas, guarda-corpo)
    this.wood = new THREE.MeshStandardMaterial({ color: 0xa88560, roughness: 0.85 }); this.post = new THREE.MeshStandardMaterial({ color: 0x6b513a, roughness: 0.9 }); this.railM = new THREE.MeshStandardMaterial({ color: 0xeeeeee, roughness: 0.5 });
    for (const d of SAND_DECKS) {
      d.pier.holes = d.pier.holes || []; const n = Math.max(1, Math.round((d.x1 - d.x0) / 3)), w = (d.x1 - d.x0) / n, zl = d.z1 - d.z0, zc = (d.z0 + d.z1) / 2;
      for (let k = 0; k < n; k++) {
        const x0 = d.x0 + k * w, x1 = x0 + w; const g = new THREE.Group(); const np = Math.max(3, Math.round(w / 0.6)), pw = w / np;
        const sec = { kind: 'tabua', x0, x1, z0: d.z0, z1: d.z1, x: (x0 + x1) / 2, z: zc, y: d.y, deck: d, g, planks: [] };
        for (let j = 0; j < np; j++) { const pl = new THREE.Mesh(new THREE.BoxGeometry(pw * 0.9, 0.14, zl), this.wood); pl.position.set(x0 + (j + 0.5) * pw, d.y - 0.07, zc); pl.castShadow = pl.receiveShadow = true; g.add(pl); sec.planks.push(pl); }
        for (const sd of [-1, 1]) { const gy = groundY(x0 + 0.3, zc + sd * (zl / 2 - 0.3)); const ph = d.y - Math.min(gy, d.y - 0.2) + 0.3; const po = new THREE.Mesh(new THREE.BoxGeometry(0.3, ph, 0.3), this.post); po.position.set(x0 + 0.3, d.y - ph / 2, zc + sd * (zl / 2 - 0.3)); g.add(po); sec.planks.push(po);
          if (d.rails) { const rp = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.0, 0.08), this.railM); rp.position.set(x0 + 0.3, d.y + 0.5, zc + sd * (zl / 2 + 0.1 - 0.2)); g.add(rp); const rb = new THREE.Mesh(new THREE.BoxGeometry(w, 0.1, 0.1), this.railM); rb.position.set(x0 + w / 2, d.y + 1.0, zc + sd * (zl / 2 - 0.1)); g.add(rb); sec.planks.push(rp, rb); } }
        scene.add(g); this.secs.push(sec); this.reg(sec);
      }
    }
    // pedaços
    const S = (w, h, d) => new THREE.BoxGeometry(w, h, d);
    this.pools = { lasca: new Pool(scene, S(0.22, 0.05, 0.08), new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.9 }), 90), metal: new Pool(scene, S(0.12, 0.05, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.4, metalness: 0.8 }), 50),
      vidro: new Pool(scene, S(0.1, 0.02, 0.1), new THREE.MeshBasicMaterial({ color: 0xdff6ff, transparent: true, opacity: 0.85, toneMapped: false }), 50), faisca: new Pool(scene, S(0.05, 0.05, 0.05), new THREE.MeshBasicMaterial({ color: 0xffd27a, toneMapped: false }), 50),
      agua: new Pool(scene, new THREE.IcosahedronGeometry(0.09, 0), new THREE.MeshBasicMaterial({ color: 0xeafcff, transparent: true, opacity: 0.8, toneMapped: false }), 140),
      pano: new Pool(scene, new THREE.PlaneGeometry(0.35, 0.25), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.8, side: THREE.DoubleSide }), 40) };
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._e = new THREE.Euler(); this._q2 = new THREE.Quaternion();
  }
  key(i, j) { return i + ',' + j; }
  reg(o) { const c = this.cell; const x0 = o.x0 !== undefined ? o.x0 : o.x, x1 = o.x1 !== undefined ? o.x1 : o.x, z0 = o.z0 !== undefined ? o.z0 : o.z, z1 = o.z1 !== undefined ? o.z1 : o.z;
    for (let i = Math.floor(x0 / c); i <= Math.floor(x1 / c); i++) for (let j = Math.floor(z0 / c); j <= Math.floor(z1 / c); j++) { const k = this.key(i, j); let a = this.grid.get(k); if (!a) this.grid.set(k, a = []); a.push(o); } }
  near(x, z, r) { const out = new Set(), c = this.cell; for (let i = Math.floor((x - r) / c); i <= Math.floor((x + r) / c); i++) for (let j = Math.floor((z - r) / c); j <= Math.floor((z + r) / c); j++) { const a = this.grid.get(this.key(i, j)); if (a) for (const o of a) if (!o.down) out.add(o); } return out; }
  // chamado ANTES da física do carro (como as palmeiras): o que estiver no caminho quebra e não segura o carro
  check(v, dt) {
    if (!v || v.spec.boat || v.spec.air || v.type === 'heli' || v.type === 'plane') return 0;
    const spd = Math.hypot(v.vx || 0, v.vz || 0); if (spd < 1.2) return 0;
    const r = (v.spec.w || 1.8) * 0.5 + 0.2; let n = 0; const circ = v.circles ? v.circles() : [[v.x, v.z]];
    for (const look of [0.15, 1, 2.2]) for (const c of circ) {
      const ax = c[0] + v.vx * dt * look * 2, az = c[1] + v.vz * dt * look * 2;
      for (const o of this.near(ax, az, r + 4)) {
        if (o.kind === 'tabua') { if (ax > o.x0 - r - 0.6 && ax < o.x1 + r + 0.6 && az > o.z0 - r && az < o.z1 + r && (v.y || 0) < o.y + 0.8) { this.breakDeck(o, v, spd); n++; } }
        else if (Math.hypot(o.x - ax, o.z - az) < r + o.r) { if (o.kind === 'guarda-sol') this.breakUmb(o, v, spd); else if (o.kind === 'mesa' || o.kind === 'cadeira') this.breakCafe(o, v, spd); else this.breakPole(o, v, spd); n++; }
      }
    }
    return n;
  }
  slow(v, k) { v.vx *= k; v.vz *= k; if (v.vf !== undefined) v.vf *= k; }
  dir(v, spd) { return [v.vx / spd, v.vz / spd]; }
  bit(type, x, y, z, vx, vy, vz, life = 1.8) { this.bits.push({ type, x, y, z, vx, vy, vz, t: 0, life, rx: Math.random() * 6, ry: Math.random() * 6, sp: (Math.random() - 0.5) * 14 }); if (this.bits.length > 260) this.bits.shift(); }
  topple(o, v, spd, mesh, base) { // grupo que gira em volta da base, para frente e para o lado do carro
    const [fx, fz] = this.dir(v, spd); const lx = -fz, lz = fx; const side = Math.sign((o.x - v.x) * lx + (o.z - v.z) * lz) || 1;
    let dx = fx * 0.7 + lx * side * 0.7, dz = fz * 0.7 + lz * side * 0.7; const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const g = new THREE.Group(); g.add(mesh); g.position.copy(base); this.scene.add(g);
    const f = { o, g, axis: new THREE.Vector3(dz, 0, -dx).normalize(), th: 0.05, w: 0.8 + spd * 0.05, rest: false, t: 0, bounce: 0, lift: 0, vy: 0, dx, dz, slide: o.kind === 'guarda-sol' ? spd * 0.35 : 0 };
    if (o.kind === 'guarda-sol') { f.vy = 2.5 + spd * 0.12; f.w = 3 + spd * 0.2; }
    this.fall.push(f); this.applyFall(f); return f;
  }
  applyFall(f) { this._q.setFromAxisAngle(f.axis, f.th); f.g.quaternion.copy(this._q); }
  breakPole(o, v, spd) {
    const G = this.G, S = o.src; o.down = true; o.t = 0; this.count[o.kind]++;
    S.mesh.setMatrixAt(o.i, ZERO); S.mesh.instanceMatrix.needsUpdate = true;
    if (o.kind === 'poste' && S.heads) { S.heads.setMatrixAt(o.i, ZERO); S.heads.instanceMatrix.needsUpdate = true; if (S.glowGeo) { const a = S.glowGeo.attributes.position; o.gy = a.getY(o.i); a.setY(o.i, -999); a.needsUpdate = true; } }
    if (o.kind === 'sinal') { for (const b of o.bulbs) S.bulbs.setMatrixAt(b, ZERO); S.bulbs.instanceMatrix.needsUpdate = true; }
    const mesh = new THREE.Mesh(S.geo, S.mesh.material); mesh.castShadow = true; const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); o.m.decompose(pos, q, sc); mesh.quaternion.copy(q);
    this.topple(o, v, spd, mesh, pos);
    this.slow(v, o.mass);
    const [fx, fz] = this.dir(v, spd);
    for (let k = 0; k < 10; k++) this.bit('faisca', o.x, 0.6 + Math.random(), o.z, fx * 4 + (Math.random() - 0.5) * 6, 2 + Math.random() * 4, fz * 4 + (Math.random() - 0.5) * 6, 0.7);
    for (let k = 0; k < 8; k++) this.bit('metal', o.x, 0.3 + Math.random() * 0.4, o.z, fx * 5 + (Math.random() - 0.5) * 5, 1.5 + Math.random() * 3, fz * 5 + (Math.random() - 0.5) * 5);
    for (let k = 0; k < 10; k++) this.bit('vidro', o.x + fx * 2, 5 + Math.random(), o.z + fz * 2, fx * 3 + (Math.random() - 0.5) * 4, Math.random() * 2, fz * 3 + (Math.random() - 0.5) * 4, 2.2);
    G.audio && G.audio.clang && G.audio.clang(Math.min(16, spd)); G.shake && G.shake(0.2);
    G.onBreak && G.onBreak(o);
  }
  breakUmb(o, v, spd) {
    const G = this.G, S = o.src; o.down = true; o.t = 0; this.count[o.kind]++;
    S.mesh.setMatrixAt(o.i, ZERO); S.mesh.instanceMatrix.needsUpdate = true;
    const mat = S.mesh.material.clone(); mat.vertexColors = true; mat.color = o.col.clone(); const mesh = new THREE.Mesh(S.mesh.geometry, mat); const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); o.m.decompose(pos, q, sc); mesh.quaternion.copy(q);
    const f = this.topple(o, v, spd, mesh, pos); f.mat = mat;
    this.slow(v, o.mass); const [fx, fz] = this.dir(v, spd);
    for (let k = 0; k < 6; k++) this.bit('pano', o.x, 2 + Math.random() * 0.5, o.z, fx * 3 + (Math.random() - 0.5) * 4, 1 + Math.random() * 3, fz * 3 + (Math.random() - 0.5) * 4, 2.4);
    for (let k = 0; k < 5; k++) this.bit('lasca', o.x, 0.4, o.z, fx * 4 + (Math.random() - 0.5) * 3, 1 + Math.random() * 2, fz * 4 + (Math.random() - 0.5) * 3, 1.4);
    G.audio && G.audio.crack && G.audio.crack(Math.min(8, spd * 0.5));
    G.onBreak && G.onBreak(o);
  }
  breakCafe(o, v, spd) { // t439
    const G = this.G, S = o.src; o.down = true; o.t = 0; this.count[o.kind]++;
    S.mesh.setMatrixAt(o.i, ZERO); S.mesh.instanceMatrix.needsUpdate = true;
    const mat = S.mesh.material.clone(); mat.color = o.col.clone(); const mesh = new THREE.Mesh(S.mesh.geometry, mat); mesh.castShadow = true; const pos = new THREE.Vector3(), q = new THREE.Quaternion(), sc = new THREE.Vector3(); o.m.decompose(pos, q, sc); mesh.quaternion.copy(q);
    const f = this.topple(o, v, spd, mesh, pos); f.mat = mat; const light = o.kind === 'cadeira';
    f.vy = (light ? 3.2 : 2.2) + spd * (light ? 0.16 : 0.1); f.w = (light ? 4 : 2.6) + spd * 0.2; f.slide = spd * (light ? 0.5 : 0.35);
    this.slow(v, o.mass); const [fx, fz] = this.dir(v, spd);
    for (let k = 0; k < (light ? 4 : 6); k++) this.bit('metal', o.x, 0.4 + Math.random() * 0.4, o.z, fx * 4 + (Math.random() - 0.5) * 4, 1.5 + Math.random() * 2.5, fz * 4 + (Math.random() - 0.5) * 4, 1.2);
    G.audio && G.audio.clatter && G.audio.clatter(Math.min(16, spd), o.kind); G.shake && G.shake(light ? 0.05 : 0.08);
    G.onBreak && G.onBreak(o);
  }
  breakDeck(s, v, spd) {
    const G = this.G; s.down = true; s.t = 0; this.count.tabua++; s.deck.pier.holes.push(s); s.g.visible = false;
    const [fx, fz] = this.dir(v, spd);
    for (const p of s.planks) { // cada tábua vira um pedaço que voa e fica caída na areia até voltar
      const m = new THREE.Mesh(p.geometry, p.material); m.position.copy(p.position); m.castShadow = true; this.scene.add(m);
      this.planks.push({ s, m, vx: fx * (spd * 0.45 + Math.random() * 3) + (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4 + spd * 0.12, vz: fz * (spd * 0.45 + Math.random() * 3) + (Math.random() - 0.5) * 4, wx: (Math.random() - 0.5) * 9, wy: (Math.random() - 0.5) * 6, wz: (Math.random() - 0.5) * 9, rest: false });
    }
    for (let k = 0; k < 22; k++) this.bit('lasca', s.x + (Math.random() - 0.5) * (s.x1 - s.x0), s.y, s.z + (Math.random() - 0.5) * (s.z1 - s.z0), fx * (3 + Math.random() * 5) + (Math.random() - 0.5) * 5, 2 + Math.random() * 4, fz * (3 + Math.random() * 5) + (Math.random() - 0.5) * 5, 1.6);
    this.slow(v, 0.985); if ((v.y || 0) > 0.4) v.y = Math.max(groundY(v.x, v.z), 0);
    G.audio && G.audio.crack && G.audio.crack(Math.min(16, spd)); G.shake && G.shake(0.12);
    G.onBreak && G.onBreak(s);
  }
  blocked(o) { const G = this.G; const x0 = (o.x0 ?? o.x) - 3, x1 = (o.x1 ?? o.x) + 3, z0 = (o.z0 ?? o.z) - 3, z1 = (o.z1 ?? o.z) + 3; for (const v of G.vehicles) if (v.x > x0 && v.x < x1 && v.z > z0 && v.z < z1) return true; const p = G.player; return p.x > x0 && p.x < x1 && p.z > z0 && p.z < z1; }
  restore(o) {
    o.down = false; const S = o.src;
    if (o.kind === 'tabua') { o.g.visible = true; const H = o.deck.pier.holes; const i = H.indexOf(o); if (i >= 0) H.splice(i, 1); for (let k = this.planks.length - 1; k >= 0; k--) if (this.planks[k].s === o) { this.scene.remove(this.planks[k].m); this.planks.splice(k, 1); } return; }
    S.mesh.setMatrixAt(o.i, o.m); S.mesh.instanceMatrix.needsUpdate = true;
    if (o.kind === 'poste' && S.heads) { S.heads.setMatrixAt(o.i, o.hm); S.heads.instanceMatrix.needsUpdate = true; if (S.glowGeo && o.gy !== undefined) { const a = S.glowGeo.attributes.position; a.setY(o.i, o.gy); a.needsUpdate = true; } }
    if (o.kind === 'sinal') { o.bulbs.forEach((b, k) => S.bulbs.setMatrixAt(b, o.bm[k])); S.bulbs.instanceMatrix.needsUpdate = true; }
    for (let k = this.fall.length - 1; k >= 0; k--) if (this.fall[k].o === o) { const f = this.fall[k]; this.scene.remove(f.g); if (f.mat) f.mat.dispose(); this.fall.splice(k, 1); }
  }
  update(dt, camPos) {
    // tombando
    for (const f of this.fall) { f.t += dt; if (f.rest) continue;
      if (f.vy || f.lift > 0) { f.vy -= 12 * dt; f.lift = Math.max(0, f.lift + f.vy * dt); if (f.lift === 0 && f.vy < 0) f.vy = 0; f.g.position.y = groundY(f.g.position.x, f.g.position.z) + f.lift; }
      if (f.slide > 0) { f.g.position.x += f.dx * f.slide * dt; f.g.position.z += f.dz * f.slide * dt; f.slide = Math.max(0, f.slide - 6 * dt); }
      f.w += (2.4 * Math.sin(f.th) + 0.5) * dt * 1.6; f.th += f.w * dt;
      if (f.th >= 1.5) { f.th = 1.5; if (f.bounce < 2 && f.w > 0.9) { f.w = -f.w * 0.25; f.bounce++; } else if (f.lift === 0) { f.w = 0; f.rest = true; } }
      this.applyFall(f); }
    // tábuas voando
    for (const p of this.planks) { if (p.rest) continue; p.vy -= 14 * dt; const m = p.m; m.position.x += p.vx * dt; m.position.y += p.vy * dt; m.position.z += p.vz * dt; m.rotation.x += p.wx * dt; m.rotation.y += p.wy * dt; m.rotation.z += p.wz * dt;
      const gy = groundY(m.position.x, m.position.z) + 0.07; if (m.position.y < gy) { m.position.y = gy; if (Math.abs(p.vy) > 2.5) { p.vy = -p.vy * 0.3; p.vx *= 0.5; p.vz *= 0.5; p.wx *= 0.5; p.wz *= 0.5; } else { p.rest = true; m.rotation.x = Math.round(m.rotation.x / Math.PI) * Math.PI; m.rotation.z = Math.round(m.rotation.z / Math.PI) * Math.PI; } } }
    // volta: ~45 s, ou ≥ 8 s se longe da câmera
    const all = this.secs.filter(s => s.down).concat(this.fall.map(f => f.o));
    for (const o of all) { o.t = (o.t || 0) + dt / (o.kind === 'tabua' ? 1 : 1); const far = camPos ? Math.hypot(camPos.x - (o.x), camPos.z - (o.z)) > 90 : false; if ((o.t > 45 || (o.t > 8 && far)) && !this.blocked(o)) this.restore(o); }
    // pedacinhos
    for (const P of Object.values(this.pools)) P.k = 0;
    const m = this._m;
    for (let k = this.bits.length - 1; k >= 0; k--) { const b = this.bits[k]; b.t += dt; if (b.t > b.life) { this.bits.splice(k, 1); continue; }
      const light = b.type === 'pano' || b.type === 'vidro'; b.vy -= (light ? 5 : 13) * dt; if (light) { b.vx *= 1 - dt; b.vz *= 1 - dt; b.vy = Math.max(b.vy, -3); }
      b.x += b.vx * dt; b.y += b.vy * dt; b.z += b.vz * dt; const gy = b.type === 'agua' ? Math.max(groundY(b.x, b.z), -0.6) : groundY(b.x, b.z) + 0.03; if (b.type === 'agua' && b.y < gy && b.vy < 0) { b.t = b.life; continue; } if (b.y < gy) { b.y = gy; b.vx *= 0.4; b.vz *= 0.4; b.vy = 0; b.sp *= 0.5; }
      b.rx += b.sp * dt; b.ry += b.sp * 0.7 * dt; const sc = Math.min(1, (b.life - b.t) * 2.5);
      this._e.set(b.rx, b.ry, 0); this._q.setFromEuler(this._e); this._v.set(b.x, b.y, b.z); this._s.setScalar(sc); m.compose(this._v, this._q, this._s);
      const P = this.pools[b.type]; if (P && P.k < P.n) P.m.setMatrixAt(P.k++, m); }
    for (const P of Object.values(this.pools)) { P.m.count = P.k; if (P.k) P.m.instanceMatrix.needsUpdate = true; }
  }
  // t420: borrifo de água (carro no mar raso)
  splash(x, y, z, vx, vz, n = 8) { for (let k = 0; k < n; k++) { const a = Math.random() * Math.PI * 2, r = 0.3 + Math.random() * 0.8; this.bit('agua', x + Math.cos(a) * r, y + 0.1, z + Math.sin(a) * r, vx * 0.3 + Math.cos(a) * (1.5 + Math.random() * 2.5), 2 + Math.random() * 3.5, vz * 0.3 + Math.sin(a) * (1.5 + Math.random() * 2.5), 0.8); } }
  respawnAll() { for (const o of this.secs.filter(s => s.down).concat(this.fall.map(f => f.o))) this.restore(o); this.bits = []; }
}
