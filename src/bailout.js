// t390: saltar do veículo em movimento — rolamento ao pular do carro (sem ferimentos), paraquedas automático ao saltar
// do helicóptero/avião no ar (desce suave e dirigível), nado ao cair na água; o veículo abandonado segue sozinho com segurança.
import * as THREE from 'three';
import { clamp, lerp, angDiff } from './util.js';
import { groundY, surfaceY, walkable, collide, WATER_Y, BOUNDS } from './world.js';
import { roofAt } from './powers.js';
import { HELIPAD } from './heli.js';
import { SEAPLANE_BASE } from './plane.js';

// ---- THEME (Neon Distrito troca este bloco)
const THEME = {
  canopy: [0xff4f6d, 0xffd23f, 0x2ab3b8, 0xffffff, 0xff8a3c, 0x7d6cf0], glow: 0, lines: 0xf4f1e8,
  rescue: '🛟 Barco de resgate da orla', heliHome: 'Heliponto da Praia', planeHome: 'Hidroporto da Baía',
};
// ---- fim THEME

const G0 = 16, SINK = 3.2, SINK_FAST = 6, FWD = 6, MIN_CHUTE = 8;
const tmp = new THREE.Vector3();
export function isWater(x, z) { return !walkable(x, z) && (x < BOUNDS.x0 + 5 || x > BOUNDS.x1 || z < BOUNDS.z0 || z > BOUNDS.z1 || groundY(x, z) <= -0.45); }

export class Bailout {
  constructor(G, scene) {
    this.G = G; this.scene = scene; this.mode = null; this.t = 0; this.stats = { rolls: 0, chutes: 0, swims: 0, rescues: 0 };
    this.vx = this.vy = this.vz = 0; this.coast = null;
    // paraquedas: velame retangular arqueado em faixas coloridas + linhas até o arnês
    const g = new THREE.Group(); const cols = THEME.canopy;
    const geo = new THREE.SphereGeometry(1, 24, 6, 0, Math.PI * 2, 0, 0.62); const pos = geo.attributes.position; const c = new THREE.Color(); const arr = [];
    for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), z = pos.getZ(i); const a = Math.atan2(z, x) + Math.PI; c.setHex(cols[Math.floor(a / (Math.PI * 2) * 12) % cols.length]); arr.push(c.r, c.g, c.b); }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(arr, 3)); geo.translate(0, -Math.cos(0.62), 0); geo.scale(4.6, 2.6, 2.0);
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.7, emissive: THEME.glow ? 0xffffff : 0x000000, emissiveIntensity: THEME.glow ? 0.25 : 0 });
    if (THEME.glow) mat.onBeforeCompile = (s) => { s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance = diffuseColor.rgb * 0.55;'); };
    const canopy = new THREE.Mesh(geo, mat); canopy.position.y = 4.4; g.add(canopy);
    const lp = []; const rim = 0.62; for (let k = 0; k < 10; k++) { const a = k / 10 * Math.PI * 2; const rx = Math.cos(a) * Math.sin(rim) * 4.6, rz = Math.sin(a) * Math.sin(rim) * 2.0; lp.push(rx, 4.4, rz, Math.sign(rx) * 0.22, 1.45, 0); }
    const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
    g.add(new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: THEME.lines, transparent: true, opacity: 0.8 })));
    g.visible = false; scene.add(g); this.chute = g; this.canopy = canopy; this.open = 0;
  }
  active() { return !!this.mode; }
  // chamado ao apertar Sair: devolve true se assumiu a saída (veículo em movimento ou no ar)
  tryStart(v) {
    const G = this.G; if (!v || this.mode) return false;
    const air = v.type === 'heli' || v.type === 'plane';
    if (air && (v.air || v.speed > 3)) return this.startAir(v);
    if (!air && !v.spec.boat && v.speed > 6) return this.startRoll(v);
    return false;
  }
  _release(v) {
    const G = this.G, p = G.player;
    if (G.missions.active && (G.missions.active.type === 'corrida' || G.missions.active.type === 'taxi')) G.missions.cancel(G.missions.active.type === 'taxi' ? 'Corrida de táxi encerrada' : 'Corrida cancelada');
    this.scene.add(G.hero.g); G.hero.g.visible = true; G.hero.g.rotation.set(0, 0, 0); G.hero.g.rotation.order = 'YXZ'; G.hero.g.scale.setScalar(1);
    v.driver = null; p.vehicle = null; v.brakeOn = false; v.steer = 0; v.boosting = false; p.grounded = false;
  }
  startRoll(v) {
    const G = this.G, p = G.player; const [fx, fz] = v.fwd(); const sides = [[fz, -fx], [-fz, fx]]; let s = null;
    for (const [sx, sz] of sides) { const x = v.x + sx * 1.9, z = v.z + sz * 1.9; if (walkable(x, z) && !collide(tmp.set(x, 0, z), 0.3, false, v.y + 0.3)) { s = [sx, sz, x, z]; break; } }
    if (!s) { G.ui.toast('Sem espaço ao lado para pular — reduza a velocidade', 1600); return true; }
    this._release(v);
    const sp = v.speed, k = Math.min(9, sp * 0.5) / Math.max(sp, 1e-3);
    p.x = s[2]; p.z = s[3]; p.y = Math.max(v.y, surfaceY(p.x, p.z)) + 0.2;
    this.vx = v.vx * k + s[0] * 3; this.vz = v.vz * k + s[1] * 3; this.vy = 3.2; p.h = Math.atan2(this.vx, this.vz);
    this.mode = 'roll'; this.t = 0; this.turns = sp > 24 ? 2 : 1; this.stats.rolls++;
    v.coast = true; v.parked = false; this.coast = v; // o carro segue na banguela e para sozinho
    G.audio && G.audio.thud && G.audio.thud(3); G.ui.toast('🤸 Pulou e rolou no chão — tudo bem! O carro segue devagar e para sozinho', 2200);
    return true;
  }
  startAir(v) {
    const G = this.G, p = G.player; const [fx, fz] = v.fwd();
    this._release(v);
    p.x = v.x - fz * 2.2; p.z = v.z + fx * 2.2; p.y = v.y + 0.2; p.h = v.h;
    this.vx = v.vx * 0.7; this.vz = v.vz * 0.7; this.vy = (v.vy || 0) * 0.5 + 2;
    const alt = p.y - this.floor(p.x, p.z, p.y);
    this.mode = alt < MIN_CHUTE ? 'drop' : 'fall'; this.t = 0; this.open = 0;
    if (this.mode === 'fall') this.stats.chutes++;
    v.abandon = true; v.abT = 0; v.abAir = 0;
    if (v.type === 'heli') v.auto = 90; // paira alguns segundos e desce sozinho com calma
    G.ui.toast(this.mode === 'fall' ? '🪂 Saltou! O paraquedas abre sozinho · ' + (G.touch ? 'joystick vira e acelera · ⤓ desce mais rápido' : 'A/D vira · W acelera · S freia · Shift desce mais rápido') : '🦘 Pulo curto — aterrissagem segura', 2600);
    return true;
  }
  floor(x, z, y) { if (isWater(x, z)) return WATER_Y; return Math.max(surfaceY(x, z), roofAt(x, z, y)); }
  // movimento horizontal com paredes (mesmas regras do andar)
  _move(dt, stepMax) {
    const p = this.G.player; const nx = p.x + this.vx * dt, nz = p.z + this.vz * dt;
    const ok = (x, z) => this.mode === 'fall' || this.mode === 'chute' || this.mode === 'drop' || this.mode === 'swim' ? true : (walkable(x, z) && this.floor(x, z, p.y) - p.y <= stepMax);
    if (ok(nx, p.z)) p.x = nx; else this.vx *= -0.2; if (ok(p.x, nz)) p.z = nz; else this.vz *= -0.2;
    tmp.set(p.x, 0, p.z); const w = collide(tmp, 0.35, false, p.y + 0.2); p.x = tmp.x; p.z = tmp.z;
    if (w) { const vn = this.vx * w.x + this.vz * w.z; if (vn < 0) { this.vx -= vn * w.x; this.vz -= vn * w.z; } }
  }
  // controla o jogador enquanto rola, cai, plana ou nada (true = assumiu o quadro)
  drive(dt, mx, my, input) {
    if (!this.mode) return false;
    const G = this.G, p = G.player, hero = G.hero, g = hero.g; this.t += dt;
    const fx = Math.sin(p.h), fz = Math.cos(p.h);
    if (this.mode === 'roll') {
      this.vy -= G0 * dt; const fric = p.grounded ? 2.2 : 0.3; this.vx *= Math.exp(-dt * fric); this.vz *= Math.exp(-dt * fric);
      this._move(dt, 1.0); p.y += this.vy * dt; const gy = this.floor(p.x, p.z, p.y);
      if (p.y <= gy) { p.y = gy; this.vy = 0; p.grounded = true; }
      const T0 = 0.3, T1 = 0.3 + 0.55 * this.turns, T2 = T1 + 0.35; let a = 0;
      if (this.t < T0) a = this.t / T0 * 0.7; else if (this.t < T1) a = 0.7 + (this.t - T0) / (T1 - T0) * (Math.PI * 2 * this.turns - 0.7); else a = 0;
      const c = 0.85; g.scale.set(1, this.t < T1 ? 0.75 : 1, 1); g.rotation.order = 'YXZ'; g.rotation.set(a % (Math.PI * 2), p.h, 0);
      const s = Math.sin(a), o = c * (1 - Math.cos(a));
      g.position.set(p.x - c * s * fx, p.y + (this.t < T1 ? o : 0), p.z - c * s * fz);
      hero.pose(this.t < T1 ? 'jump' : 'idle', 0, dt);
      if (this.t >= T2 && p.grounded) this.end(Math.min(2.5, Math.hypot(this.vx, this.vz)));
      return true;
    }
    if (this.mode === 'drop' || this.mode === 'fall') {
      this.vy = Math.max(this.vy - G0 * dt, this.mode === 'drop' ? -9 : -26); this.vx *= Math.exp(-dt * 0.9); this.vz *= Math.exp(-dt * 0.9);
      this._move(dt); p.y += this.vy * dt;
      const gy = this.floor(p.x, p.z, p.y); g.rotation.order = 'YXZ'; g.rotation.set(this.mode === 'fall' ? Math.min(1.2, this.t * 2) : 0.2, p.h, 0); g.position.set(p.x, p.y, p.z); hero.pose('jump', 0, dt);
      if (this.mode === 'fall' && (this.t > 0.9 || p.y - gy < 40)) { this.mode = 'chute'; this.t = 0; G.audio && G.audio.thud && G.audio.thud(2); }
      else if (p.y <= gy) this.land(gy);
      return true;
    }
    if (this.mode === 'chute') {
      this.open = Math.min(1, this.open + dt / 0.7);
      p.h += clamp(mx, -1, 1) * 1.15 * dt; const fx2 = Math.sin(p.h), fz2 = Math.cos(p.h);
      const fwd = my > 0.15 ? FWD + 3 * my : my < -0.15 ? FWD + 2.6 * my : FWD;
      const gy = this.floor(p.x, p.z, p.y), alt = p.y - gy;
      let sink = input && input.down ? SINK_FAST : SINK; if (alt < 3) sink = Math.min(sink, 1.4 + alt * 0.4); // arredondamento perto do chão
      const k = Math.min(1, dt * 1.6 * (0.3 + this.open));
      this.vx += (fx2 * fwd - this.vx) * k; this.vz += (fz2 * fwd - this.vz) * k; this.vy += (-sink - this.vy) * Math.min(1, dt * 2.2 * (0.3 + this.open));
      this._move(dt); p.y += this.vy * dt;
      const sway = Math.sin(this.t * 1.7) * 0.06 - clamp(mx, -1, 1) * 0.28;
      g.rotation.order = 'YXZ'; g.rotation.set(0.05, p.h, sway * 0.5); g.position.set(p.x, p.y, p.z); hero.pose('idle', 0, dt);
      const C = this.chute; C.visible = true; C.position.set(p.x, p.y, p.z); C.rotation.set(0, p.h, sway, 'YXZ'); const sc = 0.15 + 0.85 * (1 - (1 - this.open) ** 3); C.scale.set(sc, 0.4 + 0.6 * sc, sc);
      G.camYaw += angDiff(G.camYaw, p.h) * Math.min(1, dt * 1.5);
      const gy2 = this.floor(p.x, p.z, p.y); if (p.y <= gy2) this.land(gy2);
      return true;
    }
    if (this.mode === 'swim') {
      const cf = Math.sin(G.camYaw), cz = Math.cos(G.camYaw); let dx = cf * my - cz * mx, dz = cz * my + cf * mx; const dl = Math.hypot(dx, dz);
      const tv = dl > 0.08 ? 2.6 : 0; if (dl > 0.08) { dx /= dl; dz /= dl; p.h += angDiff(p.h, Math.atan2(dx, dz)) * Math.min(1, dt * 4); }
      this.vx += (dx * tv - this.vx) * Math.min(1, dt * 3); this.vz += (dz * tv - this.vz) * Math.min(1, dt * 3);
      const nx = p.x + this.vx * dt, nz = p.z + this.vz * dt;
      if (walkable(nx, nz) && surfaceY(nx, nz) - WATER_Y < 1.6) { p.x = nx; p.z = nz; p.y = surfaceY(nx, nz); this.end(0); G.ui.toast('🏖️ Chegou à margem!', 1400); return true; }
      if (!walkable(nx, nz)) { p.x = nx; p.z = nz; } else { this.vx = this.vz = 0; }
      p.y = WATER_Y - 0.95 + Math.sin(this.t * 2.2) * 0.05;
      g.rotation.order = 'YXZ'; g.rotation.set(tv ? 1.2 : 0.25, p.h, 0); g.position.set(p.x, p.y + (tv ? 0.55 : 0), p.z); hero.pose(tv ? 'walk' : 'idle', 0.5, dt);
      if (this.t > 20) this.rescue();
      return true;
    }
    return false;
  }
  land(gy) {
    const G = this.G, p = G.player; p.y = gy; this.chute.visible = false;
    if (gy <= WATER_Y + 0.01 && isWater(p.x, p.z)) { this.mode = 'swim'; this.t = 0; this.stats.swims++; this.vx *= 0.3; this.vz *= 0.3; G.ui.toast('🏊 Splash! Nade até a margem · ' + THEME.rescue + ' busca você em 20 s', 2800); return; }
    this.end(Math.min(2, Math.hypot(this.vx, this.vz))); G.ui.toast('🪂 Pouso suave!', 1200);
  }
  rescue() {
    const G = this.G, p = G.player; let best = null;
    for (let r = 4; r < 900 && !best; r += 6) for (let a = 0; a < 24; a++) { const x = p.x + Math.cos(a / 24 * Math.PI * 2) * r, z = p.z + Math.sin(a / 24 * Math.PI * 2) * r; if (walkable(x, z)) { best = [x, z]; break; } }
    if (!best) best = [300, -150]; p.x = best[0]; p.z = best[1]; p.y = surfaceY(p.x, p.z); this.stats.rescues++; this.end(0);
    G.snapCam && G.snapCam(); G.ui.toast(THEME.rescue + ' deixou você na margem 🛟', 2400);
  }
  cancel() { if (!this.mode) return; this.mode = null; this.chute.visible = false; this.vx = this.vy = this.vz = 0; this.G.hero.g.rotation.order = 'XYZ'; if (!this.G.player.vehicle) this.G.hero.g.scale.setScalar(1); }
  end(keep) {
    const G = this.G, p = G.player, g = G.hero.g; this.mode = null; this.t = 0; this.chute.visible = false;
    g.scale.setScalar(1); g.rotation.order = 'XYZ'; g.rotation.set(0, p.h, 0); g.position.set(p.x, p.y, p.z);
    const s = Math.hypot(this.vx, this.vz) || 1; p.vx = this.vx / s * keep; p.vz = this.vz / s * keep; p.vy = 0; p.grounded = true; this.vx = this.vy = this.vz = 0;
  }
  // veículos largados: carro na banguela até parar; helicóptero paira e pousa; avião plana e volta ao hidroporto
  update(dt, camera) {
    const G = this.G, p = G.player, c = this.coast;
    if (c) {
      if (c.driver) { c.coast = false; this.coast = null; }
      else {
        const others = G.vehicles.concat(G.traffic.cars.filter(o => o.active), G.rivals.cars, G.street.cars).filter(o => o !== c);
        c.drive(dt, { x: 0, y: 0, hb: false, nitro: false, hardBrake: false, limit: 1, neutral: true }, others, G.t);
        const k = Math.exp(-dt * (c.speed > 12 ? 0.55 : 0.9)); c.vx *= k; c.vz *= k; c.vf *= k;
        if (c.speed < 0.4) { c.vx = c.vz = c.vf = 0; c.coast = false; c.parked = true; c.sync && c.sync(0); this.coast = null; }
      }
    }
    for (const v of [G.heli, G.plane]) {
      if (!v || !v.abandon) continue; if (v.driver) { v.abandon = false; v.auto = 0; continue; }
      const far = camera ? Math.hypot(v.x - camera.position.x, v.z - camera.position.z) : 0, dp = Math.hypot(v.x - p.x, v.z - p.z);
      if (v.air) v.abAir += dt; else if (v.speed < 0.6) v.abT += dt;
      const home = v.type === 'heli' ? [HELIPAD.x, HELIPAD.z, -Math.PI / 2, THEME.heliHome] : [SEAPLANE_BASE.x, SEAPLANE_BASE.z, SEAPLANE_BASE.h, THEME.planeHome];
      const back = v.type === 'plane' ? (v.abAir > 6 && far > 160) || v.abAir > 40 || (v.abT > 6 && dp > 25) : (v.abT > 12 && dp > 30) || (v.abT > 1 && isWater(v.x, v.z) && dp > 30) || v.abAir > 120;
      if (back) { v.place(home[0], home[1], home[2]); v.abandon = false; v.auto = 0; if (v.type === 'heli') v.spool = 0; G.ui.toast((v.type === 'heli' ? '🚁 O helicóptero pousou sozinho e voltou ao ' : '✈️ O hidroavião planou até a água e voltou ao ') + '<b>' + home[3] + '</b>', 2600); }
    }
  }
}
