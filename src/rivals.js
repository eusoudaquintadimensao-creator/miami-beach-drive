// Rachas de rua contra carros tunados (sem violência: encostou, cada um segue seu caminho)
import { clamp } from './util.js';
import { groundY } from './world.js';
import { Vehicle, randomTune, TUNE_NAMES } from './vehicles.js';

export const RACHAS = [
  { id: 's1', name: 'Racha Neon da Collins', rivals: true, start: [60, -130, 0], pts: [[60, 150], [60, 450], [180, 450], [180, 150], [180, -150], [180, -450], [60, -450], [60, -150]] },
  { id: 's2', name: 'Racha do Centro', rivals: true, start: [-420, -130, 0], pts: [[-420, 150], [-420, 450], [-540, 450], [-540, 150], [-540, -150], [-540, -450], [-420, -450], [-420, -150]] },
];
const RIVAL_NAMES = ['@luna.turbo', '@kaique.neon', '@bia.drift'];
const SLOTS = [[-3.6, 0], [3.6, -9], [-3.6, -9]]; // lateral, atrás

export class Rivals {
  constructor(G) { this.G = G; this.cars = []; this.pool = []; }
  // caminho suavizado (cantos arredondados) a partir da largada
  buildPath(race) {
    const raw = [[race.start[0], race.start[1]], ...race.pts];
    const out = [raw[0]];
    for (let i = 1; i < raw.length; i++) {
      const a = raw[i - 1], b = raw[i], c = raw[i + 1];
      if (!c) { out.push(b); break; }
      const d1 = Math.hypot(b[0] - a[0], b[1] - a[1]), d2 = Math.hypot(c[0] - b[0], c[1] - b[1]); const r = Math.min(14, d1 / 2, d2 / 2);
      const p0 = [b[0] - (b[0] - a[0]) / d1 * r, b[1] - (b[1] - a[1]) / d1 * r], p2 = [b[0] + (c[0] - b[0]) / d2 * r, b[1] + (c[1] - b[1]) / d2 * r];
      out.push(p0); for (let k = 1; k <= 6; k++) { const t = k / 6, u = 1 - t; out.push([u * u * p0[0] + 2 * u * t * b[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * b[1] + t * t * p2[1]]); }
    }
    const cum = [0]; for (let i = 1; i < out.length; i++) cum.push(cum[i - 1] + Math.hypot(out[i][0] - out[i - 1][0], out[i][1] - out[i - 1][1]));
    // velocidade máxima de curva em cada ponto
    const vmaxAt = out.map((p, i) => { const a = out[i - 1], c = out[i + 1]; if (!a || !c) return 99; const h1 = Math.atan2(p[0] - a[0], p[1] - a[1]), h2 = Math.atan2(c[0] - p[0], c[1] - p[1]); let d = Math.abs(h2 - h1); if (d > Math.PI) d = 2 * Math.PI - d; return d > 0.12 ? 15 : 99; });
    return { pts: out, cum, len: cum[cum.length - 1], vmaxAt };
  }
  at(path, s) { // posição e direção na distância s
    const { pts, cum } = path; s = clamp(s, 0, path.len - 0.01);
    let i = 1; while (i < cum.length - 1 && cum[i] < s) i++;
    const a = pts[i - 1], b = pts[i]; const seg = cum[i] - cum[i - 1] || 1; const t = (s - cum[i - 1]) / seg;
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, h: Math.atan2(b[0] - a[0], b[1] - a[1]), i };
  }
  spawn(race) {
    this.clear(); const G = this.G; this.race = race; this.path = this.buildPath(race);
    const h = race.start[2], fx = Math.sin(h), fz = Math.cos(h), rx = -fz, rz = fx;
    SLOTS.forEach(([lat, back], k) => {
      const v = new Vehicle(k === 1 ? 'sedan' : 'sport', G.scene, G.Q, undefined, Object.assign(randomTune(), { text: TUNE_NAMES[(k * 3 + 1) % TUNE_NAMES.length] }));
      v.npc = true; v.rival = true; v.racer = RIVAL_NAMES[k]; v.lat = lat; v.baseLat = lat; v.s = back; v.vf = 0; v.bumped = 0; v.done = false; v.top = 41 + k * 1.5 + Math.random() * 2;
      v.place(race.start[0] + rx * lat + fx * back, race.start[1] + rz * lat + fz * back, h); v.active = true;
      this.cars.push(v);
    });
    this.finished = 0;
  }
  clear() { for (const v of this.cars) v.dispose(this.G.scene); this.cars = []; this.race = null; }
  playerProgress(A) { // distância aproximada percorrida pelo jogador no traçado
    const p = this.G.player; const pts = [[this.race.start[0], this.race.start[1]], ...this.race.pts];
    let base = 0; for (let i = 1; i <= A.k; i++) base += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    const nxt = pts[A.k + 1] || pts[pts.length - 1], prev = pts[A.k];
    const segL = Math.hypot(nxt[0] - prev[0], nxt[1] - prev[1]); const left = Math.hypot(nxt[0] - p.x, nxt[1] - p.z);
    return base + Math.max(0, segL - left);
  }
  update(dt, t, A) {
    if (!this.race) return; const G = this.G, path = this.path; const go = A && A.t >= 0;
    const pp = A ? this.playerProgress(A) : 0;
    const traffic = G.traffic.cars.filter(c => c.active);
    for (const v of this.cars) {
      if (!go) { v.vf = 0; v.sync(dt); continue; }
      if (v.done) { v.vf = Math.max(0, v.vf - 8 * dt); }
      else {
        // velocidade alvo: reta / curva à frente / elástico em relação ao jogador
        const cur = this.at(path, v.s); let target = v.top;
        for (let j = cur.i; j < path.pts.length && path.cum[j] - v.s < 90; j++) { const vm = path.vmaxAt[j]; if (vm < 99) { const d = Math.max(0, path.cum[j] - v.s - 4); target = Math.min(target, Math.sqrt(vm * vm + 2 * 13 * d)); } }
        const gap = v.s - pp; target *= gap > 60 ? 0.86 : gap < -80 ? 1.12 : 1;
        if (v.bumped > 0) { v.bumped -= dt; target = Math.min(target, 8); }
        // trânsito à frente: troca de faixa ou segue atrás
        const fx = Math.sin(cur.h), fz = Math.cos(cur.h), rx = -fz, rz = fx; let blocked = false;
        const others = traffic.concat(this.cars.filter(o => o !== v));
        const pv = G.player.vehicle; if (pv) others.push(pv);
        for (const o of others) { const dx = o.x - v.x, dz = o.z - v.z; const a = dx * fx + dz * fz, l = dx * rx + dz * rz; if (a > 0 && a < 16 && Math.abs(l - 0) < 2.4) { blocked = true; break; } }
        if (blocked && (v.blockT || 0) < 3) { if (!v.switching) { v.latT = v.lat > 0 ? -3.6 : 3.6; v.switching = true; } v.blockT = (v.blockT || 0) + dt; if (v.blockT > 0.7) target = Math.min(target, 12); }
        else { v.blockT = blocked ? v.blockT + dt : 0; if (!blocked) v.switching = false; if (v.blockT > 5) v.blockT = 0; }
        v.lat += ((v.latT ?? v.baseLat) - v.lat) * Math.min(1, dt * 2);
        v.lat = clamp(v.lat, -5.2, 5.2);
        const acc = target > v.vf ? 10 : 16; v.vf += clamp(target - v.vf, -acc * dt, acc * dt);
        v.s += v.vf * dt;
        if (v.s >= path.len - 1) { v.done = true; this.finished++; v.place_ = this.finished; G.ui.phoneNote(v.racer, ['Cheguei! 🏁 Boa corrida!', 'Essa foi por pouco 😎', 'GG! Bora outra?'][this.finished % 3]); }
      }
      const c = this.at(path, v.s); const fx = Math.sin(c.h), fz = Math.cos(c.h);
      const nx = c.x + -fz * v.lat, nz = c.z + fx * v.lat;
      let dh = c.h - v.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI;
      v.h += dh * Math.min(1, dt * 7); v.steer = clamp(dh * 2.5, -1, 1);
      v.x = nx; v.z = nz; v.y = groundY(v.x, v.z); v.spin += v.vf * dt / v.spec.wr; v.vx = fx * v.vf; v.vz = fz * v.vf;
      v.boosting = !v.done && target_boost(v, c, path); v.brakeOn = v.vf < 1; v.sync(dt);
    }
  }
  place(A) { const pp = this.playerProgress(A); return 1 + this.cars.filter(v => v.done || v.s > pp).length; }
}
function target_boost(v, c, path) { // chama de nitro nas retas longas (efeito visual)
  return v.vf > 25 && path.vmaxAt.slice(c.i, c.i + 6).every(m => m === 99) && (Math.floor(v.s / 40) % 3 === 0);
}
