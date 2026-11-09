// Trânsito: carros seguem as faixas, param no semáforo, respeitam quem está na frente
import * as THREE from 'three';
import { rng, clamp, pick } from './util.js';
import { SEGS, NODES, lightState, groundY, onBridge } from './world.js';
import { Vehicle, randomTune } from './vehicles.js';

const LANE = 3.5;
const TYPES = ['sedan', 'sedan', 'suv', 'sport', 'classic', 'taxi', 'suv', 'sedan', 'moto'];
export class Traffic {
  constructor(scene, Q, n) {
    this.cars = []; this.r = rng(99); this.scene = scene;
    for (let i = 0; i < n; i++) { const v = new Vehicle(TYPES[i % TYPES.length], scene, Q); v.npc = true; v.root.visible = false; v.active = false; this.cars.push(v); }
    // carros tunados passeando (neon, aerofólio, adesivos)
    const nt = Q.level === 'low' ? 2 : 4; const tr = rng(7);
    for (let i = 0; i < nt; i++) { const v = new Vehicle(i % 2 ? 'sedan' : 'sport', scene, Q, undefined, randomTune(tr)); v.npc = true; v.tuned = true; v.root.visible = false; v.active = false; this.cars.push(v); }
    this.honk = null;
  }
  dirOf(seg, from) { const to = seg.a === from ? seg.b : seg.a; const dx = (to.x - from.x) / seg.len, dz = (to.z - from.z) / seg.len; return { to, dx, dz, rx: -dz, rz: dx }; }
  spawn(v, px, pz) {
    const r = this.r;
    for (let tries = 0; tries < 30; tries++) {
      const s = SEGS[Math.floor(r() * SEGS.length)];
      const mx = (s.a.x + s.b.x) / 2, mz = (s.a.z + s.b.z) / 2; const d = Math.hypot(mx - px, mz - pz);
      if (d < 90 || d > 300) continue;
      const from = r() < 0.5 ? s.a : s.b; const D = this.dirOf(s, from);
      const t = 0.25 + r() * 0.5; const x = from.x + D.dx * s.len * t + D.rx * LANE, z = from.z + D.dz * s.len * t + D.rz * LANE;
      if (this.cars.some(o => o.active && o !== v && Math.hypot(o.x - x, o.z - z) < 18)) continue;
      v.seg = s; v.from = from; v.D = D; v.pts = [[x, z]]; v.pi = 0; v.x = x; v.z = z; v.h = Math.atan2(D.dx, D.dz);
      v.cruise = (s.kind === 'rural' ? 17 : 11.5) + r() * 3 + (v.tuned ? 2.5 : 0); v.vf = v.cruise * 0.6; v.active = true; v.root.visible = true; v.bumped = 0; v.wait = 0;
      this.extend(v, true); return true;
    }
    v.active = false; v.root.visible = false; return false;
  }
  // acrescenta: reta até o fim do segmento + curva para o próximo
  extend(v, first) {
    const s = v.seg, D = v.D, B = D.to, w = s.w + 2;
    const end = [B.x - D.dx * w + D.rx * LANE, B.z - D.dz * w + D.rz * LANE];
    v.pts.push(end); v.stop = { x: B.x - D.dx * (w + 1.5) + D.rx * LANE, z: B.z - D.dz * (w + 1.5) + D.rz * LANE, node: B, axis: s.axis, idx: v.pts.length - 1 };
    let opts = B.segs.filter(o => o !== s); if (!opts.length) opts = [s];
    const r = this.r; let next = pick(r, opts);
    const straight = opts.find(o => o.axis === s.axis); if (straight && r() < 0.55) next = straight;
    const N = this.dirOf(next, B);
    const entry = [B.x + N.dx * (next.w + 2) + N.rx * LANE, B.z + N.dz * (next.w + 2) + N.rz * LANE];
    let ctrl;
    if (next === s) ctrl = [B.x + D.dx * 4, B.z + D.dz * 4];
    else if (next.axis === s.axis) ctrl = [(end[0] + entry[0]) / 2, (end[1] + entry[1]) / 2];
    else { const t = (entry[0] - end[0]) * D.dx + (entry[1] - end[1]) * D.dz; ctrl = [end[0] + D.dx * t, end[1] + D.dz * t]; }
    for (let i = 1; i <= 8; i++) { const t = i / 8, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; v.pts.push([a * end[0] + b * ctrl[0] + c * entry[0], a * end[1] + b * ctrl[1] + c * entry[1]]); }
    v.nextSeg = next; v.nextFrom = B; v.nextD = N;
  }
  update(dt, t, player, crowd, Q) {
    const px = player.x, pz = player.z; const pv = player.vehicle;
    let honk = null;
    for (const v of this.cars) {
      if (!v.active || Math.hypot(v.x - px, v.z - pz) > 340) { if (Math.random() < 0.2) this.spawn(v, px, pz); continue; }
      // alvo de velocidade
      let target = v.cruise; const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
      if (v.stop && v.pi < v.stop.idx) {
        const st = lightState(v.stop.node, t, v.stop.axis); const d = (v.stop.x - v.x) * fx + (v.stop.z - v.z) * fz;
        if (st !== 'g' && d > -0.5 && d < 34 && !(st === 'y' && d < 7)) target = Math.min(target, Math.max(0, (d - 0.5) * 0.9));
      }
      const look = (ox, oz, rad) => { const dx = ox - v.x, dz = oz - v.z; const a = dx * fx + dz * fz, l = Math.abs(dx * rx + dz * rz); if (a > 0 && a < 26 && l < rad) target = Math.min(target, Math.max(0, (a - 6.5) * 0.8)); return a > 0 && a < 9 && l < rad; };
      for (const o of this.cars) if (o !== v && o.active && Math.abs(o.x - v.x) < 28 && Math.abs(o.z - v.z) < 28) look(o.x, o.z, 2.3);
      let blockedByPlayer = false;
      if (pv) blockedByPlayer = look(pv.x, pv.z, 2.6); else blockedByPlayer = look(px, pz, 2.0);
      for (const p of crowd.peds) if (Math.abs(p.x - v.x) < 14 && Math.abs(p.z - v.z) < 14) look(p.x, p.z, 1.8);
      if (v.bumped > 0) { v.bumped -= dt; target = 0; }
      if (blockedByPlayer && v.vf < 0.5) { v.wait += dt; if (v.wait > 2.5) { v.wait = -3; honk = v; } } else if (v.wait > 0) v.wait = 0; else v.wait = Math.min(0, v.wait + dt);
      const acc = target > v.vf ? 3.2 : 9; v.vf += clamp(target - v.vf, -acc * dt, acc * dt); v.brakeOn = target < v.vf - 0.5 || v.vf < 0.2;
      // anda pela trilha
      let move = v.vf * dt;
      while (move > 0) {
        if (v.pi >= v.pts.length - 1) {
          v.seg = v.nextSeg; v.from = v.nextFrom; v.D = v.nextD; v.pts = [v.pts[v.pts.length - 1]]; v.pi = 0; this.extend(v);
        }
        const a = [v.x, v.z], b = v.pts[v.pi + 1]; const dx = b[0] - a[0], dz = b[1] - a[1], d = Math.hypot(dx, dz);
        if (d < 1e-4) { v.pi++; continue; }
        if (move >= d) { v.x = b[0]; v.z = b[1]; v.pi++; move -= d; } else { v.x += dx / d * move; v.z += dz / d * move; move = 0; }
        const th = Math.atan2(dx, dz); let dh = th - v.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; v.h += dh * Math.min(1, dt * 8);
        v.steer = clamp(dh * 2, -1, 1);
      }
      v.y = groundY(v.x, v.z); v.spin += v.vf * dt / v.spec.wr; v.vx = fx * v.vf; v.vz = fz * v.vf;
      v.pitch *= 0.9; v.roll = v.type === 'moto' ? -v.steer * 0.25 * Math.min(1, v.vf / 10) : 0; v.sync(dt);
      if (v.taxiSign) v.taxiSign.visible = true;
    }
    return honk;
  }
}
