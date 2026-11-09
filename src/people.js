// Pessoas: pedestres instanciados (vida nas ruas e na praia) e o personagem do jogador
import * as THREE from 'three';
import { rng, clamp, lerp, angDiff, pick } from './util.js';
import { BLOCKS, groundY, surfaceY, walkable, collide } from './world.js';

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b3e26, 0xd9a066];
const SHIRT = [0xff6fa6, 0x2ab3b8, 0xffd23f, 0xffffff, 0x7d6cf0, 0xff8a3c, 0x46c08c, 0x1e90ff, 0xf5f5f5, 0xe63946, 0x222222, 0xa8dadc, 0xffb4a2];
const PANTS = [0x2b3a55, 0xe9d8a6, 0x1d1d1d, 0x6c757d, 0xf1faee, 0x3d5a80, 0x8d6e63];
const HAIR = [0x1a1110, 0x3b2314, 0x6a4e2a, 0xd8b26e, 0x111111, 0x8a3b12, 0xcccccc];
export const LINES_PT = ['Bom dia! ☀️', 'Que calor hoje, né?', 'Já viu o pôr do sol no píer?', 'Bora pra praia!', 'Esse carro é lindo!', 'Cuidado aí, motorista! 😅', 'Ei! Quase!', 'Ufa, essa foi perto!', 'Solara Bay é demais 🌴', 'Vou postar essa vista!', 'Alguém viu meu chinelo?', 'Hoje tem festa na Ocean Drive!', 'Vai chover mais tarde…', 'Melhor açaí da cidade é aqui!'];

function partGeos() {
  const leg = new THREE.CapsuleGeometry(0.085, 0.72, 2, 6); leg.translate(0, -0.44, 0);
  const arm = new THREE.CapsuleGeometry(0.058, 0.5, 2, 6); arm.translate(0, -0.3, 0);
  const torso = new THREE.CapsuleGeometry(0.19, 0.24, 3, 8); torso.scale(1.08, 1, 0.66); torso.translate(0, 1.22, 0);
  const head = new THREE.SphereGeometry(0.125, 10, 8); head.scale(1, 1.15, 1.05); head.translate(0, 1.67, 0);
  const hair = new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); hair.scale(1.05, 1.05, 1.1); hair.translate(0, 1.71, -0.03);
  return { leg, arm, torso, head, hair };
}
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

// pose: retorna ângulos {legL, legR, armL, armR, lean, yOff, lie}
export function poseFor(mode, ph, amt) {
  if (mode === 'lie') return { legL: 0, legR: 0, armL: 0.3, armR: -0.3, lean: 0, yOff: 0, lie: 1 };
  if (mode === 'sit') return { legL: -1.5, legR: -1.5, armL: -0.5, armR: -0.5, lean: 0, yOff: -0.45, lie: 0 };
  if (mode === 'dodge') return { legL: -0.8, legR: 0.5, armL: -2.6, armR: -2.4, lean: -0.3, yOff: 0.05, lie: 0 };
  if (mode === 'wave') return { legL: 0, legR: 0, armL: 0, armR: -2.7 + Math.sin(ph * 8) * 0.35, lean: 0, yOff: 0, lie: 0 };
  if (mode === 'jump') return { legL: -0.5, legR: 0.3, armL: -0.9, armR: -0.9, lean: 0, yOff: 0, lie: 0 };
  if (mode === 'drive') return { legL: -1.4, legR: -1.4, armL: -1.2, armR: -1.2, lean: 0, yOff: -0.45, lie: 0 };
  const s = Math.sin(ph) * amt;
  return { legL: s, legR: -s, armL: -s * 0.8, armR: s * 0.8, lean: amt * 0.12, yOff: Math.abs(Math.cos(ph)) * amt * 0.06, lie: 0 };
}

export class Crowd {
  constructor(scene, Q, n) {
    this.n = n; this.Q = Q; const G = partGeos();
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
    const mk = (g, c) => { const m = new THREE.InstancedMesh(g, mat, c); m.castShadow = Q.level !== 'low'; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); return m; };
    this.torso = mk(G.torso, n); this.head = mk(G.head, n); this.hair = mk(G.hair, n); this.legs = mk(G.leg, n * 2); this.arms = mk(G.arm, n * 2);
    this.peds = []; const r = rng(4242); this.r = r;
    for (let i = 0; i < n; i++) {
      const p = { i, x: 0, z: 0, h: 0, speed: 1.3, ph: r() * 6, mode: 'walk', t: 0, dodgeT: 0, bubble: 0 };
      const skin = new THREE.Color(pick(r, SKIN));
      this.torso.setColorAt(i, new THREE.Color(pick(r, SHIRT))); this.head.setColorAt(i, skin); this.hair.setColorAt(i, new THREE.Color(pick(r, HAIR)));
      const pc = new THREE.Color(pick(r, PANTS)); this.legs.setColorAt(i * 2, pc); this.legs.setColorAt(i * 2 + 1, pc); this.arms.setColorAt(i * 2, skin); this.arms.setColorAt(i * 2 + 1, skin);
      p.scale = 0.9 + r() * 0.18; this.peds.push(p);
    }
    this.zones = [];
    for (const b of BLOCKS) this.zones.push({ kind: 'block', b, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 });
    for (let z = -600; z <= 600; z += 100) { this.zones.push({ kind: 'beach', cx: 350, cz: z }); this.zones.push({ kind: 'prom', cx: 316, cz: z }); }
    this.zones.push({ kind: 'beach', cx: -275, cz: 0 }, { kind: 'beach', cx: -935, cz: -150 }, { kind: 'beach', cx: 200, cz: 630 }, { kind: 'beach', cx: -360, cz: -75 });
  }
  spawn(p, px, pz, minD, maxD) {
    const r = this.r; const cand = this.zones.filter(z => { const d = Math.hypot(z.cx - px, z.cz - pz); return d < maxD + 80; });
    const z = cand.length ? pick(r, cand) : pick(r, this.zones);
    p.zone = z; p.mode = 'walk'; p.t = 0; p.dodgeT = 0;
    if (z.kind === 'block') {
      const b = z.b; const o = 9 + (r() - 0.5) * 2.2;
      p.rect = [b.x0 + o, b.z0 + o, b.x1 - o, b.z1 - o]; const W = p.rect[2] - p.rect[0], H = p.rect[3] - p.rect[1]; p.per = 2 * (W + H);
      p.s = r() * p.per; p.dir = r() < 0.5 ? 1 : -1; p.speed = 1.1 + r() * 0.6; this.perPos(p);
      if (r() < 0.12) { p.mode = 'idle'; p.t = 3 + r() * 8; }
    } else if (z.kind === 'prom') {
      p.x = 314 + r() * 6; p.z = z.cz + (r() - 0.5) * 100; p.dir = r() < 0.5 ? 1 : -1; p.h = p.dir > 0 ? 0 : Math.PI; p.speed = r() < 0.35 ? 3 + r() : 1.2 + r() * 0.4; p.mode = 'line';
    } else {
      p.x = z.cx + (r() - 0.5) * (z.cx > 300 ? 40 : 30); p.z = z.cz + (r() - 0.5) * 90; if (z.cx > 300) p.x = clamp(p.x, 326, 382);
      const k = r(); if (z.cx > 300 && k < 0.3) { p.mode = 'lie'; p.h = r() * 6; } else if (k < 0.45) { p.mode = 'idle'; p.t = 2 + r() * 6; } else { p.mode = 'wander'; p.tx = p.x; p.tz = p.z; }
      p.speed = 1.1 + r() * 0.4;
    }
    if (!walkable(p.x, p.z)) { p.x = z.cx; p.z = z.cz; }
  }
  perPos(p) {
    const [x0, z0, x1, z1] = p.rect; const W = x1 - x0, H = z1 - z0; let s = ((p.s % p.per) + p.per) % p.per;
    let x, z, h;
    if (s < W) { x = x0 + s; z = z0; h = Math.PI / 2; } else if ((s -= W) < H) { x = x1; z = z0 + s; h = 0; } else if ((s -= H) < W) { x = x1 - s; z = z1; h = -Math.PI / 2; } else { s -= W; x = x0; z = z1 - s; h = Math.PI; }
    if (p.dir < 0) h += Math.PI;
    p.x = x; p.z = z; p.th = h;
  }
  update(dt, t, player, vehicles, cam, onBubble) {
    const px = player.x, pz = player.z; const r = this.r;
    const pv = player.vehicle;
    for (const p of this.peds) {
      if (!p.zone || Math.hypot(p.x - px, p.z - pz) > 280) { this.spawn(p, px, pz, 60, 220); if (Math.hypot(p.x - px, p.z - pz) > 280) { p.x = 1e5; } continue; }
      // reação a veículos (desvio — ninguém se machuca)
      for (const v of vehicles) {
        if (!v.driver && !v.npc) continue; if (v.air) continue; const sp = v.speed; if (sp < 1.5) continue;
        const dx = p.x - v.x, dz = p.z - v.z; if (dx * dx + dz * dz > 400) continue;
        const [fx, fz] = v.fwd(); const ahead = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
        if (ahead > -1 && ahead < sp * 1.1 + 5 && Math.abs(lat) < v.spec.w / 2 + 1.4 && p.dodgeT <= 0) {
          p.dodgeT = 0.9; const side = lat >= 0 ? 1 : -1; p.dvx = -fz * side * 6.5; p.dvz = fx * side * 6.5; p.prevMode = p.mode === 'dodge' ? p.prevMode : p.mode; p.mode = 'dodge';
          if (v === pv && r() < 0.5 && !this.quiet) onBubble(p, pick(r, ['Ei! Quase!', 'Cuidado aí, motorista! 😅', 'Ufa, essa foi perto!', 'Opa!']));
        }
        // garantia: nunca há atropelamento — empurra para fora
        for (const c of v.circles()) { const ex = p.x - c[0], ez = p.z - c[1], d = Math.hypot(ex, ez), rr = v.r + 0.45; if (d < rr) { const k = d > 1e-3 ? 1 / d : 1; p.x = c[0] + ex * k * rr; p.z = c[1] + ez * k * rr; } }
      }
      if (!pv) { const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz); if (d < 0.7 && d > 1e-3) { p.x = px + dx / d * 0.7; p.z = pz + dz / d * 0.7; } if (d < 4 && p.bubble <= 0 && !this.quiet && !p.talking && r() < dt * 0.25 && p.mode !== 'dodge') { p.bubble = 12; onBubble(p, pick(r, LINES_PT.slice(0, 6).concat(LINES_PT.slice(8)))); if (p.mode !== 'lie') { p.mode = 'wave'; p.t = 1.6; p.h = Math.atan2(px - p.x, pz - p.z); } } }
      p.bubble -= dt;
      let moving = 0;
      if (p.mode === 'dodge') {
        p.dodgeT -= dt; const nx = p.x + p.dvx * dt, nz = p.z + p.dvz * dt; if (walkable(nx, nz)) { p.x = nx; p.z = nz; } p.dvx *= 0.92; p.dvz *= 0.92;
        if (p.dodgeT <= 0) { p.mode = p.prevMode === 'walk' ? 'wander' : (p.prevMode || 'wander'); p.mode = 'idle'; p.t = 0.8 + r(); }
      } else if (p.mode === 'walk') {
        p.s += p.dir * p.speed * dt; const ox = p.x, oz = p.z; this.perPos(p); p.h += angDiff(p.h, p.th) * Math.min(1, dt * 8); moving = 1;
        if (r() < dt * 0.01) { p.mode = 'idle'; p.t = 2 + r() * 5; }
      } else if (p.mode === 'line') {
        p.z += p.dir * p.speed * dt; p.h = p.dir > 0 ? 0 : Math.PI; moving = p.speed > 2.5 ? 2 : 1; if (Math.abs(p.z) > 640) p.dir *= -1;
      } else if (p.mode === 'wander') {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.5) { if (p.back) { p.back = false; p.mode = 'walk'; } else { p.mode = 'idle'; p.t = 1 + r() * 5; } }
        else { const nx = p.x + dx / d * p.speed * dt, nz = p.z + dz / d * p.speed * dt; if (walkable(nx, nz)) { p.x = nx; p.z = nz; } else { p.tx = p.x; p.tz = p.z; } p.h += angDiff(p.h, Math.atan2(dx, dz)) * Math.min(1, dt * 6); moving = 1; }
      } else if (p.mode === 'idle' || p.mode === 'wave') {
        p.t -= dt; if (p.talking) p.t = Math.max(p.t, 1); if (p.t <= 0) { if (p.zone.kind === 'block' && p.rect) { this.nearestPer(p); const ox = p.x, oz = p.z; this.perPos(p); p.tx = p.x; p.tz = p.z; p.x = ox; p.z = oz; if (Math.hypot(p.tx - ox, p.tz - oz) > 0.6) { p.mode = 'wander'; p.back = true; } else p.mode = 'walk'; } else { p.mode = 'wander'; const z = p.zone; p.tx = clamp(p.x + (r() - 0.5) * 30, z.cx > 300 ? 326 : -1e9, z.cx > 300 ? 382 : 1e9); p.tz = p.z + (r() - 0.5) * 30; } }
      }
      p.ph += dt * (moving === 2 ? 11 : moving ? 6.5 : 0) * (p.speed > 0 ? 1 : 0);
      p.moving = moving;
    }
    this.write(cam);
  }
  nearestPer(p) { // volta para o perímetro do quarteirão mais próximo
    const [x0, z0, x1, z1] = p.rect; const cx = clamp(p.x, x0, x1), cz = clamp(p.z, z0, z1);
    const W = x1 - x0, H = z1 - z0; const d = [Math.abs(cz - z0), Math.abs(cx - x1), Math.abs(cz - z1), Math.abs(cx - x0)]; const k = d.indexOf(Math.min(...d));
    p.s = k === 0 ? cx - x0 : k === 1 ? W + cz - z0 : k === 2 ? W + H + (x1 - cx) : 2 * W + H + (z1 - cz);
  }
  write(cam) {
    const camX = cam.position.x, camZ = cam.position.z;
    for (const p of this.peds) {
      const far = Math.abs(p.x - camX) > 180 || Math.abs(p.z - camZ) > 180;
      const pose = poseFor(p.mode === 'line' ? 'walk' : p.mode === 'walk' || p.mode === 'wander' ? 'walk' : p.mode, p.ph, p.moving === 2 ? 0.9 : p.moving ? 0.55 : 0);
      const y = far ? 0 : surfaceY(p.x, p.z);
      _e.set(pose.lie ? -Math.PI / 2 : pose.lean, p.h, 0, 'YXZ'); _q.setFromEuler(_e);
      _p.set(p.x, y + (pose.lie ? 0.14 : pose.yOff), p.z); _s.setScalar(far ? 0 : p.scale);
      _b.compose(_p, _q, _s);
      if (pose.lie) _b.multiply(_m.makeTranslation(0, -0.9, 0));
      this.torso.setMatrixAt(p.i, _b); this.head.setMatrixAt(p.i, _b); this.hair.setMatrixAt(p.i, _b);
      for (const [k, sx, ang] of [[0, -0.1, pose.legL], [1, 0.1, pose.legR]]) { _m.makeRotationX(ang).setPosition(sx, 0.93, 0); this.legs.setMatrixAt(p.i * 2 + k, _m.premultiply(_b)); }
      for (const [k, sx, ang] of [[0, -0.27, pose.armL], [1, 0.27, pose.armR]]) { _m.makeRotationX(ang).setPosition(sx, 1.49, 0); this.arms.setMatrixAt(p.i * 2 + k, _m.premultiply(_b)); }
    }
    for (const m of [this.torso, this.head, this.hair, this.legs, this.arms]) m.instanceMatrix.needsUpdate = true;
  }
}

// personagem do jogador (malha própria com mais detalhe)
export class Hero {
  constructor(scene, Q, cols) {
    const G = partGeos(); const g = new THREE.Group();
    cols = cols || { skin: 0xc68642, shirt: 0xff5fa2, pants: 0x1d3557, hair: 0x1a1110, stripe: 0xffd23f };
    const skin = new THREE.MeshStandardMaterial({ color: cols.skin, roughness: 0.6 });
    const shirt = new THREE.MeshStandardMaterial({ color: cols.shirt, roughness: 0.7 });
    const shorts = new THREE.MeshStandardMaterial({ color: cols.pants, roughness: 0.8 });
    const hairM = new THREE.MeshStandardMaterial({ color: cols.hair, roughness: 0.6 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.3, metalness: 0.4 });
    this.torso = new THREE.Mesh(G.torso, shirt); this.head = new THREE.Mesh(G.head, skin); this.hair = new THREE.Mesh(G.hair, hairM);
    const glasses = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.055, 0.03).translate(0, 1.665, 0.14), dark);
    const pattern = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.12, 0.245).translate(0, 1.38, 0), new THREE.MeshStandardMaterial({ color: cols.stripe, roughness: 0.7 }));
    this.legL = new THREE.Group(); this.legR = new THREE.Group(); this.armL = new THREE.Group(); this.armR = new THREE.Group();
    this.legL.add(new THREE.Mesh(G.leg, shorts)); this.legR.add(new THREE.Mesh(G.leg, shorts));
    const shoe = new THREE.BoxGeometry(0.17, 0.08, 0.28).translate(0, -0.86, 0.05); const shoeM = new THREE.MeshStandardMaterial({ color: 0xffffff });
    this.legL.add(new THREE.Mesh(shoe, shoeM)); this.legR.add(new THREE.Mesh(shoe, shoeM));
    this.armL.add(new THREE.Mesh(G.arm, skin)); this.armR.add(new THREE.Mesh(G.arm, skin));
    this.legL.position.set(-0.1, 0.93, 0); this.legR.position.set(0.1, 0.93, 0); this.armL.position.set(-0.27, 1.49, 0); this.armR.position.set(0.27, 1.49, 0);
    this.inner = new THREE.Group(); this.inner.add(this.torso, this.head, this.hair, glasses, this.legL, this.legR, this.armL, this.armR); g.add(this.inner);
    g.traverse(o => { if (o.isMesh) o.castShadow = true; });
    scene.add(g); this.g = g; this.ph = 0; this.walking = false;
  }
  anim(dt) { this.ph += dt * 6.5; this.pose(this.walking ? 'walk' : 'idle', this.walking ? 0.55 : 0, dt); this.walking = false; }
  static random(scene, Q) { const r = Math.random; return new Hero(scene, Q, { skin: pick(r, SKIN), shirt: pick(r, SHIRT), pants: pick(r, PANTS), hair: pick(r, HAIR), stripe: pick(r, SHIRT) }); }
  pose(mode, amt, dt) {
    const P = poseFor(mode, this.ph, amt); const k = Math.min(1, dt * 14);
    this.legL.rotation.x = lerp(this.legL.rotation.x, P.legL, k); this.legR.rotation.x = lerp(this.legR.rotation.x, P.legR, k);
    this.armL.rotation.x = lerp(this.armL.rotation.x, P.armL, k); this.armR.rotation.x = lerp(this.armR.rotation.x, P.armR, k);
    this.inner.rotation.x = lerp(this.inner.rotation.x, P.lean, k); this.inner.position.y = lerp(this.inner.position.y, P.yOff, k);
  }
}
