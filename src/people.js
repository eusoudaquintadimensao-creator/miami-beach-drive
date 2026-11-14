// Pessoas: pedestres instanciados com rotina diária (casa, trabalho, café, praia, academia, balada) e o personagem do jogador
import * as THREE from 'three';
import { rng, clamp, lerp, angDiff, pick } from './util.js';
import { BLOCKS, groundY, surfaceY, walkable, collide } from './world.js';
import { VENUES, SPOTS, isOpen, PERSONA_LIST, activity } from './life.js';
import { ROUTINE } from './phrases.js';

const SKIN = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b3e26, 0xd9a066];
const SHIRT = [0xff6fa6, 0x2ab3b8, 0xffd23f, 0xffffff, 0x7d6cf0, 0xff8a3c, 0x46c08c, 0x1e90ff, 0xf5f5f5, 0xe63946, 0x222222, 0xa8dadc, 0xffb4a2];
const PANTS = [0x2b3a55, 0xe9d8a6, 0x1d1d1d, 0x6c757d, 0xf1faee, 0x3d5a80, 0x8d6e63];
const HAIR = [0x1a1110, 0x3b2314, 0x6a4e2a, 0xd8b26e, 0x111111, 0x8a3b12, 0xcccccc];
const DOGC = [0x8a5a2b, 0x1d1d1d, 0xf2e6d0, 0xd8a24a, 0x6b6b6b];
export const LINES_PT = ['Bom dia! ☀️', 'Que calor hoje, né?', 'Já viu o pôr do sol no píer?', 'Bora pra praia!', 'Esse carro é lindo!', 'Cuidado aí, motorista! 😅', 'Ei! Quase!', 'Ufa, essa foi perto!', 'Solara Bay é demais 🌴', 'Vou postar essa vista!', 'Alguém viu meu chinelo?', 'Hoje tem festa na Ocean Drive!', 'Vai chover mais tarde…', 'Melhor açaí da cidade é aqui!'];

export function partGeos() {
  const leg = new THREE.CapsuleGeometry(0.085, 0.72, 2, 6); leg.translate(0, -0.44, 0);
  const arm = new THREE.CapsuleGeometry(0.058, 0.5, 2, 6); arm.translate(0, -0.3, 0);
  const torso = new THREE.CapsuleGeometry(0.19, 0.24, 3, 8); torso.scale(1.08, 1, 0.66); torso.translate(0, 1.22, 0);
  const head = new THREE.SphereGeometry(0.125, 10, 8); head.scale(1, 1.15, 1.05); head.translate(0, 1.67, 0);
  const hair = new THREE.SphereGeometry(0.135, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.5); hair.scale(1.05, 1.05, 1.1); hair.translate(0, 1.71, -0.03);
  return { leg, arm, torso, head, hair };
}
function dogGeo() { // cachorro low-poly numa malha só
  const parts = [[0.24, 0.22, 0.56, 0, 0.4, 0], [0.2, 0.2, 0.24, 0, 0.55, 0.34], [0.12, 0.1, 0.12, 0, 0.5, 0.5], [0.06, 0.1, 0.04, -0.07, 0.68, 0.3], [0.06, 0.1, 0.04, 0.07, 0.68, 0.3], [0.05, 0.05, 0.22, 0, 0.5, -0.36]];
  for (const [x, z] of [[-0.08, 0.2], [0.08, 0.2], [-0.08, -0.2], [0.08, -0.2]]) parts.push([0.07, 0.3, 0.07, x, 0.15, z]);
  const gs = parts.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed());
  const n = gs.reduce((a, g) => a + g.attributes.position.count, 0); const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
  for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
const _m = new THREE.Matrix4(), _b = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1), _z = new THREE.Matrix4().makeScale(0, 0, 0);

// pose: retorna ângulos {legL, legR, armL, armR, lean, yOff, lie}
export function poseFor(mode, ph, amt, ex) {
  if (mode === 'lie') return { legL: 0, legR: 0, armL: 0.3, armR: -0.3, lean: 0, yOff: 0, lie: 1 };
  if (mode === 'sit') { const sip = Math.max(0, Math.sin(ph * 0.55) - 0.55) * 4; return { legL: -1.5, legR: -1.5, armL: -0.5, armR: -0.5 - sip, lean: 0, yOff: -0.45, lie: 0 }; } // bebe o suco de vez em quando
  if (mode === 'dodge') return { legL: -0.8, legR: 0.5, armL: -2.6, armR: -2.4, lean: -0.3, yOff: 0.05, lie: 0 };
  if (mode === 'wave') return { legL: 0, legR: 0, armL: 0, armR: -2.7 + Math.sin(ph * 8) * 0.35, lean: 0, yOff: 0, lie: 0 };
  if (mode === 'phone') return { legL: 0.04, legR: -0.04, armL: 0.06, armR: -2.05, lean: 0.1, yOff: 0, lie: 0 }; // olhando o celular
  if (mode === 'chat') { const g = Math.max(0, Math.sin(ph * 1.7)); return { legL: 0.03, legR: -0.03, armL: -0.15, armR: -0.35 - g * 0.6, lean: 0.02, yOff: 0, lie: 0 }; }
  if (mode === 'dance') { const s = Math.sin(ph * 5.5); return { legL: -0.25 * Math.max(0, s), legR: -0.25 * Math.max(0, -s), armL: -2.5 + s * 0.45, armR: -2.5 - s * 0.45, lean: 0.05 * s, yOff: Math.abs(s) * 0.07, lie: 0 }; }
  if (mode === 'exercise') {
    const s = Math.sin(ph * 2.6), k = (s + 1) / 2;
    if (ex === 1) return { legL: -0.15 * k, legR: 0.15 * k, armL: -2.9 * k, armR: -2.9 * k, lean: 0, yOff: k * 0.12, lie: 0 }; // polichinelo
    if (ex === 2) return { legL: -0.3, legR: -0.3, armL: -3.05, armR: -3.05, lean: 0, yOff: 0.15 + k * 0.4, lie: 0 }; // barra
    return { legL: -0.9 * k, legR: -0.9 * k, armL: -1.5 * k, armR: -1.5 * k, lean: 0.25 * k, yOff: -0.32 * k, lie: 0 }; // agachamento
  }
  if (mode === 'jump') return { legL: -0.5, legR: 0.3, armL: -0.9, armR: -0.9, lean: 0, yOff: 0, lie: 0 };
  if (mode === 'drive') return { legL: -1.4, legR: -1.4, armL: -1.2, armR: -1.2, lean: 0, yOff: -0.45, lie: 0 };
  const s = Math.sin(ph) * amt;
  return { legL: s, legR: -s, armL: -s * 0.8, armR: s * 0.8, lean: amt * 0.12, yOff: Math.abs(Math.cos(ph)) * amt * 0.06, lie: 0 };
}
const STAY = new Set(['sit', 'dance', 'exercise', 'chat', 'shop']); // atividades paradas (voltam depois de acenar/desviar)
const SEAT_KINDS = { cafe: ['cafe', 'sorveteria'], almoco: ['restaurante', 'cafe', 'sorveteria'], jantar: ['restaurante', 'bar'], bar: ['bar', 'restaurante'], balada: ['balada'] };

export class Crowd {
  constructor(scene, Q, n) {
    this.n = n; this.Q = Q; const G = partGeos(); this.hour = 12; this.frame = 0;
    const mat = new THREE.MeshStandardMaterial({ roughness: 0.75 });
    const mk = (g, c, m = mat) => { const im = new THREE.InstancedMesh(g, m, c); im.castShadow = Q.level !== 'low'; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
    this.torso = mk(G.torso, n); this.head = mk(G.head, n); this.hair = mk(G.hair, n); this.legs = mk(G.leg, n * 2); this.arms = mk(G.arm, n * 2);
    this.dogs = mk(dogGeo(), n, new THREE.MeshStandardMaterial({ roughness: 0.85 })); this.bags = mk(new THREE.BoxGeometry(0.26, 0.3, 0.1).translate(0, -0.15, 0), n, new THREE.MeshStandardMaterial({ roughness: 0.6 }));
    this.peds = []; const r = rng(4242); this.r = r;
    for (let i = 0; i < n; i++) {
      const p = { i, x: 1e5, z: 0, h: 0, speed: 1.3, ph: r() * 6, mode: 'walk', t: 0, dodgeT: 0, bubble: 0, persona: PERSONA_LIST[(i * 7 + 3) % PERSONA_LIST.length], chk: r() * 2 };
      p.dog = p.persona === 'tutor' || (p.persona === 'aposentado' && r() < 0.5);
      const skin = new THREE.Color(pick(r, SKIN));
      this.torso.setColorAt(i, new THREE.Color(pick(r, SHIRT))); this.head.setColorAt(i, skin); this.hair.setColorAt(i, new THREE.Color(pick(r, HAIR)));
      const pc = new THREE.Color(pick(r, PANTS)); this.legs.setColorAt(i * 2, pc); this.legs.setColorAt(i * 2 + 1, pc); this.arms.setColorAt(i * 2, skin); this.arms.setColorAt(i * 2 + 1, skin);
      this.dogs.setColorAt(i, new THREE.Color(pick(r, DOGC))); this.bags.setColorAt(i, new THREE.Color(pick(r, [0xff4fb8, 0xffd23f, 0x29f0ff, 0xf5f5f5, 0x8e24aa])));
      p.scale = 0.9 + r() * 0.18; this.peds.push(p);
    }
    this.zones = [];
    for (const b of BLOCKS) this.zones.push({ kind: 'block', b, cx: (b.x0 + b.x1) / 2, cz: (b.z0 + b.z1) / 2 });
    for (let z = -600; z <= 600; z += 100) { this.zones.push({ kind: 'beach', cx: 350, cz: z }); this.zones.push({ kind: 'prom', cx: 316, cz: z }); }
    this.zones.push({ kind: 'beach', cx: -275, cz: 0 }, { kind: 'beach', cx: -935, cz: -150 }, { kind: 'beach', cx: 200, cz: 630 }, { kind: 'beach', cx: -360, cz: -75 });
  }
  release(p) { if (p.slot) { if (p.slot.occ === p) p.slot.occ = null; if (p.slot.n) p.slot.n = Math.max(0, p.slot.n - 1); p.slot = null; } p.base = null; p.bag = false; p.withDog = false; p.leaving = 0; }
  near(list, px, pz, maxD, ok) { const r = this.r; const c = list.filter(s => (!ok || ok(s)) && Math.abs(s.x - px) < maxD && Math.abs(s.z - pz) < maxD); return c.length ? c[Math.floor(r() * c.length)] : null; }
  seat(p, s, mode) { s.occ = p; p.slot = s; p.x = s.x; p.z = s.z; p.h = s.h; p.mode = mode; p.base = mode; p.t = 1e9; }
  // escolhe onde a pessoa aparece de acordo com a hora e a rotina dela
  spawn(p, px, pz) {
    const r = this.r, h = this.hour; this.release(p); const act = activity(p.persona, h, p.act); p.act = act; p.hidden = false; p.dodgeT = 0; p.act2 = null;
    p.actPhone = r() < 0.3;
    const D = 210;
    if (act === 'casa') { if ((p.i * 37 + 11) % 100 >= 16) { p.hidden = true; p.x = 1e5; return; } } // a maioria está em casa (uns poucos ainda voltando)
    if (SEAT_KINDS[act]) {
      if (act === 'balada') { const s = this.near(SPOTS.dance, px, pz, D, s => !s.occ && VENUES.some(v => v.kind === 'balada' && isOpen(v, h))); if (s) { this.seat(p, s, 'dance'); p.ph = r() * 6; return; } }
      const kinds = SEAT_KINDS[act]; const vs = VENUES.filter(v => kinds.includes(v.kind) && isOpen(v, h) && Math.abs(v.x - px) < D && Math.abs(v.z - pz) < D);
      for (let k = 0; k < 3 && vs.length; k++) { const v = vs[Math.floor(r() * vs.length)]; const free = v.seats.filter(s => !s.occ); if (free.length) { const s = free[Math.floor(r() * free.length)]; this.seat(p, s, s.stand ? 'chat' : 'sit'); return; } }
    }
    if (act === 'academia') { const s = this.near(SPOTS.gym, px, pz, D, s => !s.occ && h >= 6 && h < 20); if (s) { this.seat(p, s, 'exercise'); p.ex = s.ex; return; } }
    if (act === 'compras' && r() < 0.6) { const s = this.near(SPOTS.shop, px, pz, D, s => !s.occ); if (s) { this.seat(p, s, 'shop'); p.t = 6 + r() * 14; p.bag = true; return; } }
    if ((act === 'passeio' || act === 'praia' || act === 'bar') && r() < 0.35) { const s = this.near(SPOTS.chat, px, pz, D, s => (s.n || 0) < 2); if (s) { const k = s.n || 0; s.n = k + 1; p.slot = s; p.x = s.x + (k ? 1.15 : 0); p.z = s.z + (k ? 0.25 : 0); p.h = k ? -Math.PI / 2 + 0.2 : Math.PI / 2 + 0.2; p.mode = 'chat'; p.base = 'chat'; p.t = 1e9; return; } }
    if (act === 'cachorro') { p.withDog = p.dog; const s = this.near(SPOTS.dog, px, pz, D); if (s) { p.zone = { kind: 'dogspot', cx: s.x, cz: s.z }; p.x = s.x + (r() - 0.5) * 8; p.z = s.z + (r() - 0.5) * 8; p.mode = 'wander'; p.tx = p.x; p.tz = p.z; p.speed = 1.0 + r() * 0.3; if (!walkable(p.x, p.z)) { p.x = s.x; p.z = s.z; } return; } }
    // na rua / calçadão / praia
    const want = act === 'praia' ? ['beach'] : act === 'corrida' || act === 'caminhada' ? ['prom'] : act === 'cachorro' ? ['prom', 'block'] : act === 'passeio' ? ['prom', 'block', 'beach'] : ['block'];
    let cand = this.zones.filter(z => want.includes(z.kind) && Math.hypot(z.cx - px, z.cz - pz) < D + 60); if (!cand.length) cand = this.zones.filter(z => Math.hypot(z.cx - px, z.cz - pz) < D + 60);
    const z = cand.length ? pick(r, cand) : pick(r, this.zones);
    p.zone = z; p.mode = 'walk'; p.t = 0; p.act2 = p.actPhone ? 'phone' : null; p.withDog = p.dog && (act === 'cachorro' || r() < 0.25);
    if (z.kind === 'block') {
      const b = z.b; const o = 9 + (r() - 0.5) * 2.2;
      p.rect = [b.x0 + o, b.z0 + o, b.x1 - o, b.z1 - o]; const W = p.rect[2] - p.rect[0], H = p.rect[3] - p.rect[1]; p.per = 2 * (W + H);
      p.s = r() * p.per; p.dir = r() < 0.5 ? 1 : -1; p.speed = act === 'trabalho' ? 1.5 + r() * 0.4 : 1.05 + r() * 0.5; this.perPos(p); p.h = p.th;
      if (r() < 0.1) { p.mode = 'idle'; p.t = 3 + r() * 6; }
      p.bag = act === 'compras' && r() < 0.8;
    } else if (z.kind === 'prom') {
      p.x = 314 + r() * 6; p.z = z.cz + (r() - 0.5) * 100; p.dir = r() < 0.5 ? 1 : -1; p.h = p.dir > 0 ? 0 : Math.PI; p.mode = 'line';
      p.speed = act === 'corrida' ? 3 + r() * 0.9 : act === 'caminhada' ? 1.4 + r() * 0.3 : 1.15 + r() * 0.35;
    } else {
      p.x = z.cx + (r() - 0.5) * (z.cx > 300 ? 40 : 30); p.z = z.cz + (r() - 0.5) * 90; if (z.cx > 300) p.x = clamp(p.x, 326, 382);
      const k = r(); if (z.cx > 300 && k < 0.3 && act === 'praia') { p.mode = 'lie'; p.h = r() * 6; p.base = 'lie'; } else if (k < 0.45) { p.mode = 'idle'; p.t = 2 + r() * 6; } else { p.mode = 'wander'; p.tx = p.x; p.tz = p.z; }
      p.speed = 1.05 + r() * 0.35;
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
  // contagem por atividade (testes e celular do jogo)
  census() { const c = { visiveis: 0, casa: 0, modos: {}, atividades: {} }; for (const p of this.peds) { if (p.hidden || p.x > 1e4) { c.casa++; continue; } c.visiveis++; c.modos[p.mode] = (c.modos[p.mode] || 0) + 1; c.atividades[p.act] = (c.atividades[p.act] || 0) + 1; } return c; }
  update(dt, t, player, vehicles, cam, onBubble, hour) {
    if (hour != null) this.hour = hour;
    const px = player.x, pz = player.z; const r = this.r; this.frame++;
    const pv = player.vehicle; const camX = cam.position.x, camZ = cam.position.z;
    for (const p of this.peds) {
      const dist = Math.hypot(p.x - px, p.z - pz);
      if (p.x > 1e4 || dist > 280) { // fora do raio: reaparece perto de você seguindo a rotina (em casa = invisível)
        p.chk -= dt; if (p.x > 1e4 && p.chk > 0) continue; p.chk = 1.5 + r() * 1.5;
        this.spawn(p, px, pz); if (!p.hidden && Math.hypot(p.x - px, p.z - pz) > 280) { this.release(p); p.x = 1e5; } continue;
      }
      // a rotina mudou com o relógio? quem está longe troca na hora; quem está perto termina o que faz e vai embora andando
      p.chk -= dt;
      if (p.chk <= 0) {
        p.chk = 2 + r() * 2; const act = activity(p.persona, this.hour, p.act);
        if (act !== p.act && !p.leaving) { if (Math.hypot(p.x - camX, p.z - camZ) > 90) { this.spawn(p, px, pz); continue; } this.release(p); p.act = act; p.leaving = 14 + r() * 10; p.mode = 'wander'; p.tx = p.x + (r() - 0.5) * 40; p.tz = p.z + (r() - 0.5) * 40; p.speed = 1.3; }
        if (p.leaving && (p.leaving -= 3) <= 0) { this.spawn(p, px, pz); continue; }
      }
      // longe da câmera: atualiza 1 a cada 3 quadros (passo maior)
      let ddt = dt; if (Math.abs(p.x - camX) + Math.abs(p.z - camZ) > 150) { p.acc = (p.acc || 0) + dt; if ((this.frame + p.i) % 3) continue; ddt = p.acc; p.acc = 0; }
      // reação a veículos (desvio — ninguém se machuca)
      for (const v of vehicles) {
        if (!v.driver && !v.npc) continue; if (v.air) continue; const sp = v.speed; if (sp < 1.5) continue;
        const dx = p.x - v.x, dz = p.z - v.z; if (dx * dx + dz * dz > 400) continue;
        const [fx, fz] = v.fwd(); const ahead = dx * fx + dz * fz, lat = dx * -fz + dz * fx;
        if (ahead > -1 && ahead < sp * 1.1 + 5 && Math.abs(lat) < v.spec.w / 2 + 1.4 && p.dodgeT <= 0 && p.mode !== 'sit') {
          p.dodgeT = 0.9; const side = lat >= 0 ? 1 : -1; p.dvx = -fz * side * 6.5; p.dvz = fx * side * 6.5; p.prevMode = p.mode === 'dodge' ? p.prevMode : p.mode; p.mode = 'dodge';
          if (v === pv && r() < 0.5 && !this.quiet) onBubble(p, pick(r, ['Ei! Quase!', 'Cuidado aí, motorista! 😅', 'Ufa, essa foi perto!', 'Opa!']));
        }
        // garantia: nunca há atropelamento — empurra para fora
        for (const c of v.circles()) { const ex = p.x - c[0], ez = p.z - c[1], d = Math.hypot(ex, ez), rr = v.r + 0.45; if (d < rr) { const k = d > 1e-3 ? 1 / d : 1; p.x = c[0] + ex * k * rr; p.z = c[1] + ez * k * rr; } }
      }
      if (!pv) { const dx = p.x - px, dz = p.z - pz, d = Math.hypot(dx, dz); if (d < 0.7 && d > 1e-3 && p.mode !== 'sit') { p.x = px + dx / d * 0.7; p.z = pz + dz / d * 0.7; } if (d < 4 && p.bubble <= 0 && !this.quiet && !p.talking && r() < ddt * 0.25 && p.mode !== 'dodge') { p.bubble = 12; const rl = ROUTINE[p.act]; onBubble(p, rl && r() < 0.6 ? pick(r, rl) : pick(r, LINES_PT.slice(0, 6).concat(LINES_PT.slice(8)))); if (!STAY.has(p.mode) && p.mode !== 'lie') { p.mode = 'wave'; p.t = 1.6; p.h = Math.atan2(px - p.x, pz - p.z); } } }
      p.bubble -= ddt;
      let moving = 0;
      if (p.mode === 'dodge') {
        p.dodgeT -= ddt; const nx = p.x + p.dvx * ddt, nz = p.z + p.dvz * ddt; if (walkable(nx, nz)) { p.x = nx; p.z = nz; } p.dvx *= 0.92; p.dvz *= 0.92;
        if (p.dodgeT <= 0) { if (p.base && p.slot) { p.x = p.slot.x + (p.slot.n != null && p.mode === 'chat' ? 0 : 0); p.z = p.slot.z; p.mode = p.base; p.h = p.slot.h ?? p.h; } else { p.mode = 'idle'; p.t = 0.8 + r(); } }
      } else if (p.mode === 'walk') {
        p.s += p.dir * p.speed * ddt; this.perPos(p); p.h += angDiff(p.h, p.th) * Math.min(1, ddt * 8); moving = 1;
        if (r() < ddt * 0.01) { p.mode = 'idle'; p.t = 2 + r() * 5; }
      } else if (p.mode === 'line') {
        p.z += p.dir * p.speed * ddt; p.h = p.dir > 0 ? 0 : Math.PI; moving = p.speed > 2.5 ? 2 : 1; if (Math.abs(p.z) > 640) p.dir *= -1;
      } else if (p.mode === 'wander') {
        const dx = p.tx - p.x, dz = p.tz - p.z, d = Math.hypot(dx, dz);
        if (d < 0.5) { if (p.back) { p.back = false; p.mode = 'walk'; } else if (p.leaving) { p.tx = p.x + (r() - 0.5) * 40; p.tz = p.z + (r() - 0.5) * 40; } else { p.mode = 'idle'; p.t = 1 + r() * 5; } }
        else { const nx = p.x + dx / d * p.speed * ddt, nz = p.z + dz / d * p.speed * ddt; if (walkable(nx, nz)) { p.x = nx; p.z = nz; } else { p.tx = p.x; p.tz = p.z; } p.h += angDiff(p.h, Math.atan2(dx, dz)) * Math.min(1, ddt * 6); moving = 1; }
      } else if (STAY.has(p.mode)) {
        if (p.mode === 'shop') { p.t -= ddt; if (p.t <= 0) { this.release(p); p.bag = true; const s = p.slot; p.mode = 'wander'; p.tx = p.x + Math.sin(p.h + Math.PI) * 4; p.tz = p.z + Math.cos(p.h + Math.PI) * 4; p.leaving = 12; } }
        if (p.mode === 'chat' && p.slot && p.slot.n != null) { const o = this.peds.find(q => q !== p && q.slot === p.slot && q.mode === 'chat'); if (o) p.h += angDiff(p.h, Math.atan2(o.x - p.x, o.z - p.z)) * Math.min(1, ddt * 3); }
        if (p.mode === 'chat' && p.slot && p.slot.stand) { /* no balcão */ }
      } else if (p.mode === 'idle' || p.mode === 'wave') {
        // repara em você: vira para olhar quando você passa a pé por perto (e às vezes acena)
        p.looking = false; if (!pv && p.mode === 'idle') { const ex = px - p.x, ez = pz - p.z, dd = ex * ex + ez * ez; if (dd < 36) { p.looking = true; p.h += angDiff(p.h, Math.atan2(ex, ez)) * Math.min(1, ddt * 3); if (!p.waved && dd < 16 && r() < ddt * 0.4) { p.waved = true; p.mode = 'wave'; p.t = 1.6; } } else if (dd > 400) p.waved = false; }
        p.t -= ddt; if (p.talking) p.t = Math.max(p.t, 1);
        if (p.t <= 0) {
          if (p.base && p.slot) { p.mode = p.base; p.h = p.slot.h ?? p.h; }
          else if (p.base === 'lie') p.mode = 'lie';
          else if (p.zone && p.zone.kind === 'block' && p.rect) { this.nearestPer(p); const ox = p.x, oz = p.z; this.perPos(p); p.tx = p.x; p.tz = p.z; p.x = ox; p.z = oz; if (Math.hypot(p.tx - ox, p.tz - oz) > 0.6) { p.mode = 'wander'; p.back = true; } else p.mode = 'walk'; }
          else { p.mode = 'wander'; const z = p.zone || { cx: p.x, cz: p.z }; const rad = z.kind === 'dogspot' ? 14 : 30; p.tx = clamp(p.x + (r() - 0.5) * rad, z.cx > 300 && z.kind === 'beach' ? 326 : -1e9, z.cx > 300 && z.kind === 'beach' ? 382 : 1e9); p.tz = p.z + (r() - 0.5) * rad; if (z.kind === 'dogspot') { p.tx = clamp(p.tx, z.cx - 14, z.cx + 14); p.tz = clamp(p.tz, z.cz - 14, z.cz + 14); } }
        }
      }
      const rate = p.mode === 'dance' ? 1 : p.mode === 'exercise' ? 1 : p.mode === 'sit' || p.mode === 'chat' ? 1 : 0;
      p.ph += ddt * (moving === 2 ? 11 : moving ? 6.5 : rate);
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
      const far = p.hidden || Math.abs(p.x - camX) > 180 || Math.abs(p.z - camZ) > 180;
      if (far) { this.torso.setMatrixAt(p.i, _z); this.head.setMatrixAt(p.i, _z); this.hair.setMatrixAt(p.i, _z); for (const k of [0, 1]) { this.legs.setMatrixAt(p.i * 2 + k, _z); this.arms.setMatrixAt(p.i * 2 + k, _z); } this.dogs.setMatrixAt(p.i, _z); this.bags.setMatrixAt(p.i, _z); continue; }
      const m = p.mode === 'line' || p.mode === 'walk' || p.mode === 'wander' ? 'walk' : p.mode === 'idle' && p.act2 === 'phone' && !p.looking ? 'phone' : p.mode === 'shop' ? 'idle' : p.mode;
      const pose = poseFor(m, p.ph, p.moving === 2 ? 0.9 : p.moving ? 0.55 : 0, p.ex);
      const y = surfaceY(p.x, p.z) + (p.mode === 'sit' && p.slot && p.slot.table && p.slot.y ? p.slot.y : 0);
      _e.set(pose.lie ? -Math.PI / 2 : pose.lean, p.h, 0, 'YXZ'); _q.setFromEuler(_e);
      _p.set(p.x, y + (pose.lie ? 0.14 : pose.yOff), p.z); _s.setScalar(p.scale);
      _b.compose(_p, _q, _s);
      if (pose.lie) _b.multiply(_m.makeTranslation(0, -0.9, 0));
      this.torso.setMatrixAt(p.i, _b); this.head.setMatrixAt(p.i, _b); this.hair.setMatrixAt(p.i, _b);
      for (const [k, sx, ang] of [[0, -0.1, pose.legL], [1, 0.1, pose.legR]]) { _m.makeRotationX(ang).setPosition(sx, 0.93, 0); this.legs.setMatrixAt(p.i * 2 + k, _m.premultiply(_b)); }
      for (const [k, sx, ang] of [[0, -0.27, pose.armL], [1, 0.27, pose.armR]]) { _m.makeRotationX(ang).setPosition(sx, 1.49, 0); this.arms.setMatrixAt(p.i * 2 + k, _m.premultiply(_b)); }
      // sacola na mão direita
      if (p.bag && !pose.lie && p.mode !== 'sit') { _m.makeRotationX(pose.armR * 0.3).setPosition(0.3, 0.92, 0.04); this.bags.setMatrixAt(p.i, _m.premultiply(_b)); } else this.bags.setMatrixAt(p.i, _z);
      // cachorro ao lado (anda junto, abana o rabo parado)
      if (p.withDog && !pose.lie && p.mode !== 'sit' && p.mode !== 'dance') {
        const sd = 0.75, fw = p.moving ? 0.9 : 0.5; const dx = p.x + Math.cos(p.h) * sd + Math.sin(p.h) * fw, dz = p.z - Math.sin(p.h) * sd + Math.cos(p.h) * fw;
        _e.set(0, p.h + (p.moving ? 0 : Math.sin(p.ph * 0.5) * 0.4), 0, 'YXZ'); _q.setFromEuler(_e); _p.set(dx, surfaceY(dx, dz) + (p.moving ? Math.abs(Math.sin(p.ph * 1.6)) * 0.06 : 0), dz); _s.setScalar(1);
        this.dogs.setMatrixAt(p.i, _m.compose(_p, _q, _s));
      } else this.dogs.setMatrixAt(p.i, _z);
    }
    for (const m of [this.torso, this.head, this.hair, this.legs, this.arms, this.dogs, this.bags]) m.instanceMatrix.needsUpdate = true;
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
