// Gaivotas na praia: bandos instanciados (3 chamadas de desenho), voam em círculos, pousam na areia e se espalham quando você chega perto
import * as THREE from 'three';
import { rng, clamp, lerp } from './util.js';
import { surfaceY } from './world.js';

const FLOCKS = [[362, -470], [358, -210], [366, 40], [360, 300], [364, 530], [-262, 64]];
const PER = 8;
const _m = new THREE.Matrix4(), _w = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _z = new THREE.Matrix4().makeScale(0, 0, 0);

export class Birds {
  constructor(G) {
    this.G = G; const r = rng(99); this.r = r; const n = FLOCKS.length * PER; this.n = n;
    const body = new THREE.SphereGeometry(0.14, 6, 4).scale(0.8, 0.7, 2.2);
    const head = new THREE.SphereGeometry(0.08, 5, 4).translate(0, 0.07, 0.3); const beak = new THREE.ConeGeometry(0.025, 0.12, 4).rotateX(Math.PI / 2).translate(0, 0.06, 0.42);
    const bodyG = mergeAll([body, head, beak]);
    const wing = new THREE.BufferGeometry(); // asa: triângulo com a ponta escura
    wing.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.12, 0.62, 0, -0.05, 0, 0, -0.14, 0, 0, 0.12, 0, 0, -0.14, 0.62, 0, -0.05], 3)); wing.computeVertexNormals();
    const wingR = wing.clone(); wingR.scale(-1, 1, 1);
    const mb = new THREE.MeshStandardMaterial({ color: 0xf4f4f2, roughness: 0.8 }); const mw = new THREE.MeshStandardMaterial({ color: 0xc9ced4, roughness: 0.8, side: THREE.DoubleSide });
    const mk = (g, m) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); G.scene.add(im); return im; };
    this.body = mk(bodyG, mb); this.wl = mk(wing, mw); this.wr = mk(wingR, mw);
    this.flocks = FLOCKS.map(([x, z], k) => ({ x, z, state: k % 2 ? 'ground' : 'fly', t: 20 + r() * 40, birds: [], near: false }));
    this.flocks.forEach((f) => { for (let i = 0; i < PER; i++) f.birds.push({ a: r() * 6.28, rad: 10 + r() * 16, hgt: 5 + r() * 8, sp: 0.25 + r() * 0.2, ph: r() * 6, x: f.x + (r() - 0.5) * 16, y: 0, z: f.z + (r() - 0.5) * 16, h: r() * 6, gx: f.x + (r() - 0.5) * 18, gz: f.z + (r() - 0.5) * 22, vy: 0 }); });
    this.visible = 0; this.scatters = 0;
  }
  update(dt, t, cam) {
    const G = this.G, p = G.player, r = this.r; let vis = 0, i = 0;
    for (const f of this.flocks) {
      const camD = Math.hypot(cam.position.x - f.x, cam.position.z - f.z);
      if (camD > 320) { for (let k = 0; k < PER; k++, i++) { this.body.setMatrixAt(i, _z); this.wl.setMatrixAt(i, _z); this.wr.setMatrixAt(i, _z); } continue; }
      // estados do bando: voando em círculo → pousa na areia → espalha quando alguém chega perto
      f.t -= dt; const pd = Math.hypot(p.x - f.x, p.z - f.z);
      if (f.state === 'ground' && (pd < 14 || f.t <= 0)) { f.state = 'scatter'; f.t = 6; if (pd < 14) { this.scatters++; if (pd < 40 && G.audio.gull) G.audio.gull(); } for (const b of f.birds) { b.vy = 5 + r() * 3; b.dx = (b.x - p.x) || 1; b.dz = (b.z - p.z) || 1; const l = Math.hypot(b.dx, b.dz); b.dx /= l; b.dz /= l; } }
      else if (f.state === 'scatter' && f.t <= 0) { f.state = 'fly'; f.t = 25 + r() * 35; }
      else if (f.state === 'fly' && f.t <= 0) { if (pd > 30) { f.state = 'land'; f.t = 8; } else f.t = 10; }
      else if (f.state === 'land' && f.t <= 0) { f.state = 'ground'; f.t = 35 + r() * 40; }
      if (f.state === 'fly' && r() < dt * 0.05 && pd < 60 && G.audio.gull) G.audio.gull();
      for (const b of f.birds) {
        let flap = 0, gnd = false;
        if (f.state === 'fly' || f.state === 'land') {
          b.a += dt * b.sp; const tx = f.x + Math.cos(b.a) * b.rad, tz = f.z + Math.sin(b.a) * b.rad * 1.4;
          const ty = f.state === 'land' ? lerp(surfaceY(b.gx, b.gz) + 0.18, b.hgt, clamp(f.t / 8, 0, 1)) : b.hgt + Math.sin(t * 0.7 + b.ph) * 1.5;
          const kx = f.state === 'land' ? lerp(b.gx, tx, clamp(f.t / 8, 0, 1)) : tx, kz = f.state === 'land' ? lerp(b.gz, tz, clamp(f.t / 8, 0, 1)) : tz;
          const nh = Math.atan2(kx - b.x, kz - b.z); if (Math.hypot(kx - b.x, kz - b.z) > 0.02) b.h = nh;
          b.x = lerp(b.x, kx, Math.min(1, dt * 2)); b.z = lerp(b.z, kz, Math.min(1, dt * 2)); b.y = lerp(b.y, ty, Math.min(1, dt * 1.5));
          flap = Math.sin(t * 9 + b.ph) * (f.state === 'land' && f.t < 2 ? 0.9 : 0.55) + (Math.sin(t * 0.5 + b.ph) > 0.6 ? 0 : 0.1);
        } else if (f.state === 'scatter') {
          b.vy = Math.max(0.5, b.vy - dt * 1.2); b.x += b.dx * 9 * dt; b.z += b.dz * 9 * dt; b.y += b.vy * dt; b.h = Math.atan2(b.dx, b.dz); flap = Math.sin(t * 16 + b.ph) * 1.0;
          b.hgt = clamp(b.y, 5, 16);
        } else { // na areia: anda um pouquinho e bica
          gnd = true; b.x = lerp(b.x, b.gx, dt); b.z = lerp(b.z, b.gz, dt); b.y = surfaceY(b.x, b.z) + 0.18; if (r() < dt * 0.2) { b.gx += (r() - 0.5) * 2; b.gz += (r() - 0.5) * 2; } if (r() < dt * 0.3) b.h += (r() - 0.5) * 2;
        }
        const peck = gnd ? Math.max(0, Math.sin(t * 3 + b.ph * 3)) * 0.5 : 0;
        _e.set(gnd ? peck : -0.05, b.h, 0, 'YXZ'); _q.setFromEuler(_e); _p.set(b.x, b.y, b.z); _s.setScalar(gnd ? 1.25 : 1.6); _m.compose(_p, _q, _s); this.body.setMatrixAt(i, _m);
        const wa = gnd ? -0.2 : flap, ws = gnd ? 0.35 : 1; // no chão as asas ficam recolhidas junto ao corpo
        _w.makeRotationZ(wa).scale(_s.set(ws, 1, 1)).setPosition(0.07, 0.03, 0); this.wl.setMatrixAt(i, _w.premultiply(_m)); _w.makeRotationZ(-wa).scale(_s.set(ws, 1, 1)).setPosition(-0.07, 0.03, 0); this.wr.setMatrixAt(i, _w.premultiply(_m));
        i++; vis++;
      }
    }
    this.visible = vis;
    this.body.instanceMatrix.needsUpdate = this.wl.instanceMatrix.needsUpdate = this.wr.instanceMatrix.needsUpdate = true;
  }
}
function mergeAll(gs) {
  const arr = gs.map(g => g.index ? g.toNonIndexed() : g); const n = arr.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const g of arr) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
