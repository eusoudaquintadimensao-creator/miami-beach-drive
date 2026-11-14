// Vida na praia e na orla (fase F): banhistas tomando sol, gente sentada nos guarda-sóis, vôlei de praia, crianças com castelos de areia,
// corredores na areia firme, surfistas e nadadores no mar, carrinhos de picolé e pipas. Tudo instanciado (poucas chamadas de desenho)
// e só animado quando a câmera está perto da praia. Ninguém se machuca: são só figurantes.
import * as THREE from 'three';
import { rng, C } from './util.js';
import { BEACH, WATER_Y, groundY, addBox, HOOKS, inKeep } from './world.js';
import { partGeos, poseFor } from './people.js';

const THEME = { dayStart: 6.5, dayEnd: 19.5, swim: [0xff4f6d, 0x2ab3b8, 0xffd23f, 0x7d6cf0, 0xff8a3c, 0x46c08c, 0x1e90ff, 0xffffff, 0x111111, 0xff6fa6], boards: [0xffd23f, 0xff4fb8, 0x29f0ff, 0xffffff, 0xff8a3c, 0x46c08c], net: 0xffffff, cart: [0xffffff, 0xff6fa6, 0x2ab3b8], kites: [0xff2d55, 0xffd23f, 0x29f0ff, 0x7d6cf0, 0x46c08c] };
// rotinas por hora (t386): cada tipo de frequentador tem sua janela do dia, com uma folga individual (uns chegam antes, outros saem depois)
const SCHED = THEME.sched || { lie: [[8.5, 17.5]], sit: [[7.5, 19.8]], volley: [[7, 19.3]], kid: [[9, 17.5]], jog: [[5.3, 9.8], [16.3, 21]], surf: [[6, 18.5]], swim: [[8.5, 18]], vendor: [[8.5, 20]], kiter: [[10, 18]] };
export function scheduled(f, h) {
  const j = ((f.i * 0.6180339) % 1 - 0.5) * 1.4; const w = SCHED[f.kind]; if (!w) return true;
  for (const [a, b] of w) if (h >= a + j && h < b + j) return true;
  return f.kind === 'jog' && f.i % 3 === 0 && h > 6 && h < 22; // alguns corredores treinam o dia todo
}
const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b3e26, 0xd9a066];
const HAIR = [0x1a1110, 0x3b2314, 0x6a4e2a, 0xd8b26e, 0x111111, 0x8a3b12];
const SHORE = 384; // onde a areia encontra o mar (y = WATER_Y)
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _z = new THREE.Matrix4().makeScale(0, 0, 0);
const sandY = (x, z) => Math.max(groundY(x, z), WATER_Y);

export class BeachLife {
  constructor(G, scene, Q) {
    this.G = G; this.Q = Q; const lvl = Q.level; const k = lvl === 'low' ? 0 : lvl === 'medium' ? 1 : 2; const N = (a) => a[k];
    const r = rng(8088); this.r = r; this.figs = []; this.t = 0; this.visible = true;
    const add = (o) => { o.i = this.figs.length; o.ph = r() * 6; o.scale = o.scale || (0.9 + r() * 0.15); this.figs.push(o); return o; };
    const huts = (z) => Math.abs(((z + 560) % 140 + 140) % 140 - 0) < 5 || Math.abs(((z + 560) % 140 + 140) % 140 - 140) < 5;
    const inCourt = (x, z, m = 2) => BEACH.courts.some(c => Math.abs(x - c.x) < c.hw + m && Math.abs(z - c.z) < c.hl + m) || inKeep(x, z, m);
    // banhistas deitados nas toalhas e sentados sob os guarda-sóis
    // trechos mais cheios (guarda-sóis e toalhas próprios, além dos espalhados da praia)
    this.umb = []; this.tow = [];
    for (const cz0 of [-470, -130, 60, 330, 500]) for (let i = 0; i < N([6, 12, 18]); i++) { const x = 338 + r() * 38, z = cz0 + (r() - 0.5) * 120; if (huts(z) || inCourt(x, z)) continue; const rr = r(); this.umb.push([x, z, rr]); this.tow.push([x + 1.5, z + (r() - 0.5) * 2, r()]); if (r() < 0.6) this.tow.push([x - 1.4, z + (r() - 0.5) * 2, r()]); }
    const tw = BEACH.towels.filter(([x, z]) => !inKeep(x, z, 1)).concat(this.tow); const um = BEACH.umbrellas.filter(([x, z]) => !inKeep(x, z, 1)).concat(this.umb);
    for (let i = 0; i < N([26, 48, 70]) && tw.length; i++) { const [x, z, rr] = tw.splice(Math.floor(r() * tw.length), 1)[0]; add({ kind: 'lie', x, z, h: rr * 0.6 + (r() < 0.5 ? 0 : Math.PI), day: true }); }
    for (let i = 0; i < N([14, 26, 38]) && um.length; i++) { const [x, z] = um.splice(Math.floor(r() * um.length), 1)[0]; add({ kind: 'sit', x: x + 0.9, z: z - 0.8, h: Math.PI / 2 + (r() - 0.5) * 0.6, day: true, late: true }); }
    // vôlei de praia
    this.courts = BEACH.courts.map((c, ci) => { const pl = []; for (const side of [-1, 1]) for (const lane of [-1, 1]) pl.push(add({ kind: 'volley', x: c.x + lane * 2, z: c.z + side * 4.5, h: side > 0 ? Math.PI : 0, side, lane, c, day: true })); return { c, pl, ball: { t: r() * 2, from: 0, to: 2 } }; });
    // crianças com castelos de areia (areia molhada, perto do mar)
    this.castles = [];
    for (let i = 0; i < N([5, 9, 13]); i++) { let z = -600 + r() * 1200; if (huts(z) || inCourt(374, z, 4)) z += 9; const x = SHORE - 5 - r() * 4; add({ kind: 'kid', x, z, h: r() * 6, scale: 0.55 + r() * 0.1, day: true }); this.castles.push([x + 0.8, z + 0.3, r()]); }
    // corredores na areia firme
    for (let i = 0; i < N([4, 7, 10]); i++) add({ kind: 'jog', x: SHORE - 1.5 - r() * 2.5, z: -600 + r() * 1200, dir: r() < 0.5 ? 1 : -1, v: 2.6 + r() * 1.2, h: 0, day: false });
    // surfistas e nadadores
    for (let i = 0; i < N([4, 7, 10]); i++) add({ kind: 'surf', x: 400 + r() * 30, z: -560 + r() * 1120, st: r() < 0.5 ? 'wait' : 'paddle', tt: 2 + r() * 6, h: 0, day: true, board: Math.floor(r() * THEME.boards.length) });
    for (let i = 0; i < N([6, 10, 14]); i++) add({ kind: 'swim', x: SHORE + 3 + r() * 9, z: -580 + r() * 1160, h: r() * 6, day: true });
    // carrinhos de picolé com vendedor (na calçada da orla)
    this.carts = [[336, -205], [336, 65], [336, 335]].filter(([x, z]) => !huts(z));
    for (const [x, z] of this.carts) add({ kind: 'vendor', x: x + 1.3, z, h: -Math.PI / 2, day: true, late: true });
    // pipas
    this.kites = []; for (let i = 0; i < N([2, 3, 5]); i++) { const z0 = -500 + r() * 1000, x = 352 + r() * 18, z = inCourt(x, z0, 3) ? z0 + 50 : z0; const f = add({ kind: 'kiter', x, z, h: Math.PI / 2, day: true }); this.kites.push({ f, ph: r() * 6, col: THEME.kites[i % THEME.kites.length] }); }
    this.build(scene);
  }
  build(scene) {
    const n = this.figs.length, P = partGeos(); const r = this.r;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.7 });
    const mk = (g, c, m = mat) => { const im = new THREE.InstancedMesh(g, m, c); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
    this.torso = mk(P.torso, n); this.head = mk(P.head, n); this.hair = mk(P.hair, n); this.legs = mk(P.leg, n * 2); this.arms = mk(P.arm, n * 2);
    for (const f of this.figs) {
      const skin = new THREE.Color(SKIN[Math.floor(r() * SKIN.length)]); const sw = new THREE.Color(THEME.swim[Math.floor(r() * THEME.swim.length)]);
      const shirt = f.kind === 'vendor' ? new THREE.Color(0xffffff) : f.kind === 'jog' ? new THREE.Color([0xff4fb8, 0x29f0ff, 0xffd23f, 0x111111][f.i % 4]) : sw;
      this.torso.setColorAt(f.i, shirt); this.head.setColorAt(f.i, skin); this.hair.setColorAt(f.i, new THREE.Color(HAIR[Math.floor(r() * HAIR.length)]));
      const leg = f.kind === 'vendor' ? new THREE.Color(0x2b3a55) : skin; this.legs.setColorAt(f.i * 2, leg); this.legs.setColorAt(f.i * 2 + 1, leg); this.arms.setColorAt(f.i * 2, skin); this.arms.setColorAt(f.i * 2 + 1, skin);
    }
    // pranchas de surfe
    const surfers = this.figs.filter(f => f.kind === 'surf');
    this.boards = mk(new THREE.BoxGeometry(0.55, 0.08, 2.1), surfers.length, new THREE.MeshStandardMaterial({ roughness: 0.4 })); surfers.forEach((f, j) => { f.bi = j; this.boards.setColorAt(j, C(THEME.boards[f.board])); });
    // estático: redes e linhas das quadras, castelos, carrinhos
    const st = new THREE.Group(); scene.add(st); this.static = st;
    const white = new THREE.MeshStandardMaterial({ color: THEME.net, roughness: 0.6 }); const netM = new THREE.MeshStandardMaterial({ color: THEME.net, transparent: true, opacity: 0.55, side: THREE.DoubleSide, roughness: 0.8 });
    for (const c of BEACH.courts) {
      const y = groundY(c.x, c.z);
      for (const sx of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.6, 6), white); p.position.set(c.x + sx * (c.hw - 0.2), y + 1.3, c.z); st.add(p); addBox(c.x + sx * (c.hw - 0.2) - 0.15, c.z - 0.15, c.x + sx * (c.hw - 0.2) + 0.15, c.z + 0.15, 2.6); }
      const net = new THREE.Mesh(new THREE.PlaneGeometry(c.hw * 2 - 0.4, 0.9), netM); net.position.set(c.x, y + 2.0, c.z); st.add(net);
      const band = new THREE.Mesh(new THREE.BoxGeometry(c.hw * 2 - 0.4, 0.06, 0.03), white); band.position.set(c.x, y + 2.45, c.z); st.add(band);
      const ln = (w, d, x, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, 0.02, d), white); m.position.set(x, groundY(x, z) + 0.02, z); st.add(m); };
      ln(c.hw * 2, 0.07, c.x, c.z - c.hl); ln(c.hw * 2, 0.07, c.x, c.z + c.hl); ln(0.07, c.hl * 2, c.x - c.hw, c.z); ln(0.07, c.hl * 2, c.x + c.hw, c.z);
    }
    const bg = new THREE.SphereGeometry(0.11, 10, 8), bm = new THREE.MeshStandardMaterial({ color: 0xffe14d, roughness: 0.5 }); this.ball = new THREE.Group(); scene.add(this.ball);
    for (const C2 of this.courts) { C2.mesh = new THREE.Mesh(bg, bm); this.ball.add(C2.mesh); }
    { const g = new THREE.CylinderGeometry(0.32, 0.4, 0.34, 8).translate(0, 0.17, 0); const t = new THREE.ConeGeometry(0.14, 0.32, 6).translate(0, 0.5, 0);
      const cm = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ color: 0xd9b77a, roughness: 1 }), this.castles.length); const tm = new THREE.InstancedMesh(t, new THREE.MeshStandardMaterial({ color: 0xcfa96a, roughness: 1 }), this.castles.length);
      this.castles.forEach(([x, z, s], i) => { _m.makeScale(0.8 + s * 0.6, 0.8 + s * 0.6, 0.8 + s * 0.6).setPosition(x, groundY(x, z) - 0.02, z); cm.setMatrixAt(i, _m); tm.setMatrixAt(i, _m); }); st.add(cm, tm); }
    for (const [x, z] of this.carts) {
      const y = groundY(x, z) + 0.16; const g = new THREE.Group(); g.position.set(x, y, z);
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.8, 1.6), new THREE.MeshStandardMaterial({ color: THEME.cart[0], roughness: 0.5 })); body.position.y = 0.75; g.add(body);
      const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.18, 1.62), new THREE.MeshStandardMaterial({ color: THEME.cart[1] })); stripe.position.y = 0.95; g.add(stripe);
      for (const sz of [-0.55, 0.55]) { const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 12).rotateZ(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0x222222 })); w.position.set(0.48, 0.22, sz); g.add(w); }
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.5, 6), white); pole.position.y = 1.9; g.add(pole);
      const um = new THREE.Mesh(new THREE.ConeGeometry(1.1, 0.4, 8, 1, true), new THREE.MeshStandardMaterial({ color: THEME.cart[2], side: THREE.DoubleSide })); um.position.y = 2.6; g.add(um);
      st.add(g); addBox(x - 0.5, z - 0.85, x + 0.5, z + 0.85, 1.4);
    }
    { const ug = new THREE.ConeGeometry(1.25, 0.45, 10, 1, true).translate(0, 2.25, 0); const pg = new THREE.CylinderGeometry(0.03, 0.03, 2.3, 5).translate(0, 1.15, 0);
      const um = new THREE.InstancedMesh(ug, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.8 }), Math.max(1, this.umb.length)); const pm = new THREE.InstancedMesh(pg, white, Math.max(1, this.umb.length));
      const tm = new THREE.InstancedMesh(new THREE.BoxGeometry(0.9, 0.03, 1.8), new THREE.MeshStandardMaterial({ roughness: 0.9 }), Math.max(1, this.tow.length));
      const uc = [0xff4f6d, 0x2ab3b8, 0xffd23f, 0x7d6cf0, 0xff8a3c, 0x46c08c, 0xffffff];
      this.umb.forEach(([x, z, q], i) => { _m.makeRotationZ((q - 0.5) * 0.2).setPosition(x, groundY(x, z), z); um.setMatrixAt(i, _m); pm.setMatrixAt(i, _m); um.setColorAt(i, C(uc[Math.floor(q * 7)])); });
      this.tow.forEach(([x, z, q], i) => { _m.makeRotationY(q * 0.6).setPosition(x, groundY(x, z) + 0.02, z); tm.setMatrixAt(i, _m); tm.setColorAt(i, C(uc[Math.floor(q * 13) % 7])); });
      st.add(um, pm, tm); }
    // pipas: losango + linha
    const kg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0.45, 0, 0), new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, -0.7, 0), new THREE.Vector3(-0.45, 0, 0)]); kg.computeVertexNormals();
    this.kiteM = new THREE.InstancedMesh(kg, new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.6 }), Math.max(1, this.kites.length));
    this.kites.forEach((k, i) => this.kiteM.setColorAt(i, C(k.col))); this.kiteM.frustumCulled = false; scene.add(this.kiteM);
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.kites.length * 6), 3)); this.lines = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); this.lines.frustumCulled = false; scene.add(this.lines);
    HOOKS.map.push((c, X, Z) => { c.strokeStyle = '#ffffffaa'; c.lineWidth = 1; for (const k of BEACH.courts) c.strokeRect(X(k.x - k.hw), Z(k.z - k.hl), X(k.x + k.hw) - X(k.x - k.hw), Z(k.z + k.hl) - Z(k.z - k.hl)); });
  }
  counts() { const o = {}; for (const f of this.figs) if (!f.hidden) o[f.kind] = (o[f.kind] || 0) + 1; return o; }
  update(dt, t, cam, hour) {
    const near = cam.position.x > 230 && Math.abs(cam.position.z) < 760;
    const on = near; if (on !== this.visible) { this.visible = on; for (const m of [this.torso, this.head, this.hair, this.legs, this.arms, this.boards, this.ball, this.static, this.kiteM, this.lines]) m.visible = on; }
    if (!on) return;
    this.t += dt;     const cx = cam.position.x, cz = cam.position.z; const r = this.r;
    for (const f of this.figs) {
      f.hidden = !scheduled(f, hour); // rotina diária de cada tipo de banhista (t386)
      if (f.hidden) continue;
      if (f.kind === 'jog') { f.z += f.dir * f.v * dt; if (f.z > 610) f.dir = -1; if (f.z < -610) f.dir = 1; f.h = f.dir > 0 ? 0 : Math.PI; f.ph += dt * 10; }
      else if (f.kind === 'surf') {
        f.tt -= dt;
        if (f.st === 'paddle') { f.x += dt * 1.1; f.ph += dt * 3; f.h = Math.PI / 2; if (f.x > 428 || f.tt < 0) { f.st = 'wait'; f.tt = 3 + r() * 6; } }
        else if (f.st === 'wait') { f.h = -Math.PI / 2; if (f.tt < 0) { f.st = 'ride'; f.tt = 6; } }
        else { f.x -= dt * 4.2; f.z += dt * 0.8 * Math.sin(f.i); f.h = -Math.PI / 2 + 0.3 * Math.sin(f.i); if (f.x < 394 || f.tt < 0) { f.st = 'paddle'; f.tt = 10 + r() * 8; } }
      } else if (f.kind === 'swim') { f.x += Math.sin(this.t * 0.3 + f.i) * dt * 0.2; f.ph += dt; }
      else f.ph += dt;
    }
    // vôlei: bola vai de um lado ao outro; jogador do lado que recebe pula
    for (const C2 of this.courts) {
      const B = C2.ball; B.t += dt / 1.6; if (B.t >= 1) { B.t = 0; B.from = B.to; B.to = (B.from < 2 ? 2 : 0) + Math.floor(r() * 2); }
      const a = C2.pl[B.from], b = C2.pl[B.to]; C2.mesh.visible = !a.hidden; if (a.hidden) continue;
      const x = a.x + (b.x - a.x) * B.t, z = a.z + (b.z - a.z) * B.t, y = groundY(x, z) + 2.2 + Math.sin(B.t * Math.PI) * 4.5; C2.mesh.position.set(x, y, z);
      for (const p of C2.pl) { const tgt = p === b ? b : null; p.jump = tgt && B.t > 0.82 ? Math.sin((B.t - 0.82) / 0.18 * Math.PI) : 0; p.x = C2.c.x + p.lane * 2 + Math.sin(this.t * 1.3 + p.i) * 0.8; }
    }
    this.write(cx, cz);
    // pipas
    const pos = this.lines.geometry.attributes.position;
    this.kites.forEach((k, i) => { const f = k.f; if (f.hidden) { this.kiteM.setMatrixAt(i, _z); pos.setXYZ(i * 2, 0, -100, 0); pos.setXYZ(i * 2 + 1, 0, -100, 0); return; }
      const kx = f.x + 14 + Math.sin(this.t * 0.7 + k.ph) * 3, ky = groundY(f.x, f.z) + 22 + Math.sin(this.t * 1.1 + k.ph) * 2.5, kz = f.z + Math.cos(this.t * 0.5 + k.ph) * 4;
      _e.set(0, Math.PI / 2, Math.sin(this.t * 1.7 + k.ph) * 0.4); _q.setFromEuler(_e); _p.set(kx, ky, kz); _s.setScalar(1.6); this.kiteM.setMatrixAt(i, _m.compose(_p, _q, _s));
      pos.setXYZ(i * 2, f.x + 0.3, groundY(f.x, f.z) + 1.9, f.z); pos.setXYZ(i * 2 + 1, kx, ky - 1, kz); });
    pos.needsUpdate = true; this.kiteM.instanceMatrix.needsUpdate = true;
  }
  write(cx, cz) {
    const zero = (f) => { this.torso.setMatrixAt(f.i, _z); this.head.setMatrixAt(f.i, _z); this.hair.setMatrixAt(f.i, _z); for (const k of [0, 1]) { this.legs.setMatrixAt(f.i * 2 + k, _z); this.arms.setMatrixAt(f.i * 2 + k, _z); } if (f.bi != null) this.boards.setMatrixAt(f.bi, _z); };
    const maxD = this.Q.level === 'low' ? 130 : 190;
    for (const f of this.figs) {
      if (f.hidden || Math.abs(f.x - cx) > maxD || Math.abs(f.z - cz) > maxD) { zero(f); continue; }
      let mode = 'idle', amt = 0, y = sandY(f.x, f.z), lean = 0, ex;
      if (f.kind === 'lie') mode = 'lie';
      else if (f.kind === 'sit' || f.kind === 'kid') { mode = 'sit'; y -= 0.36 * f.scale; }
      else if (f.kind === 'jog') { mode = 'walk'; amt = 0.9; }
      else if (f.kind === 'volley') { mode = f.jump > 0 ? 'jump' : 'idle'; y += (f.jump || 0) * 0.7; }
      else if (f.kind === 'vendor') { mode = Math.sin(f.ph * 0.4) > 0.85 ? 'wave' : 'idle'; y = groundY(f.x, f.z) + 0.16; }
      else if (f.kind === 'kiter') { mode = 'phone'; }
      else if (f.kind === 'swim') { mode = Math.sin(f.ph * 0.5 + f.i) > 0.93 ? 'wave' : 'idle'; y = WATER_Y - 1.15 + Math.sin(this.t * 1.6 + f.i) * 0.06; }
      else if (f.kind === 'surf') {
        const bob = Math.sin(this.t * 1.4 + f.i) * 0.08; const by = WATER_Y + 0.05 + bob;
        _e.set(0, f.h, f.st === 'ride' ? Math.sin(this.t * 2 + f.i) * 0.08 : 0, 'YXZ'); _q.setFromEuler(_e); _p.set(f.x, by, f.z); _s.setScalar(1); this.boards.setMatrixAt(f.bi, _m.compose(_p, _q, _s));
        if (f.st === 'paddle') { mode = 'lie'; y = by + 0.04; amt = 0; } else if (f.st === 'wait') { mode = 'sit'; y = by - 0.35; } else { mode = 'surfride'; y = by + 0.04; }
      }
      const pose = mode === 'surfride' ? { legL: -0.35, legR: 0.35, armL: -1.4, armR: 1.0, lean: 0.25, yOff: -0.08, lie: 0 } : poseFor(mode, f.ph, amt, ex);
      if (f.kind === 'lie' || (f.kind === 'surf' && f.st === 'paddle')) { const s = f.kind === 'surf' ? Math.sin(f.ph * 2) : 0; pose.armL = -2.6 + s * 0.6; pose.armR = -2.6 - s * 0.6; if (f.kind === 'lie') { pose.armL = 0.25; pose.armR = -0.25; } }
      if (f.kind === 'kiter') { pose.armR = -2.3; pose.armL = -2.0; }
      _e.set(pose.lie ? -Math.PI / 2 : pose.lean + lean, f.h + (f.kind === 'surf' && f.st === 'ride' ? Math.PI / 2 : 0), 0, 'YXZ'); _q.setFromEuler(_e);
      _p.set(f.x, y + (pose.lie ? 0.14 : pose.yOff), f.z); _s.setScalar(f.scale); _b.compose(_p, _q, _s); if (pose.lie) _b.multiply(_m.makeTranslation(0, -0.9, 0));
      this.torso.setMatrixAt(f.i, _b); this.head.setMatrixAt(f.i, _b); this.hair.setMatrixAt(f.i, _b);
      for (const [k, sx, ang] of [[0, -0.1, pose.legL], [1, 0.1, pose.legR]]) { _m.makeRotationX(ang).setPosition(sx, 0.93, 0); this.legs.setMatrixAt(f.i * 2 + k, _m.premultiply(_b)); }
      for (const [k, sx, ang] of [[0, -0.27, pose.armL], [1, 0.27, pose.armR]]) { _m.makeRotationX(ang).setPosition(sx, 1.49, 0); this.arms.setMatrixAt(f.i * 2 + k, _m.premultiply(_b)); }
    }
    for (const m of [this.torso, this.head, this.hair, this.legs, this.arms, this.boards]) m.instanceMatrix.needsUpdate = true;
  }
}
