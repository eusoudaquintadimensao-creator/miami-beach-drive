// Poderes (não violentos) dos heróis originais. Tecla X (ou botão ⚡ no celular).
import * as THREE from 'three';
import { clamp, lerp, angDiff } from './util.js';
import { BOXES, surfaceY, groundY, collide, WATER_Y } from './world.js';
import { AVATARS } from './avatar.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const HERO_REACT = ['Uau, um herói em Solara! 🤩', 'Que fantasia incrível!', 'Tira uma foto comigo? 📸', 'É gravação de filme? 🎬', 'Voa, voa! 😄', 'Meu filho vai pirar quando eu contar!', 'Que poder lindo! ✨'];

// telhado sob (x,z) que dá para pisar se você já está perto da altura dele
export function roofAt(x, z, y) {
  let f = -1e9;
  for (const b of BOXES) { if (b.boatOnly || b.h > 400 || b.h < 1.2) continue; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.h > f && y >= b.h - 0.7) f = b.h; }
  return f;
}
// altura do prédio que contém (x,z), ignorando a altura de quem pergunta
function boxTop(x, z) { let f = -1e9; for (const b of BOXES) { if (b.boatOnly || b.h > 400) continue; if (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1 && b.h > f) f = b.h; } return f; }
// topo do prédio mais próximo à frente (para o fio da Teia Neon)
function anchorAhead(x, z, fx, fz) {
  let best = null, bs = -1e9;
  for (const b of BOXES) {
    if (b.boatOnly || b.h > 400 || b.h < 8) continue;
    const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2; const dx = cx - x, dz = cz - z; const d = Math.hypot(dx, dz); if (d < 8 || d > 70) continue;
    const ahead = (dx * fx + dz * fz) / d; if (ahead < 0.35) continue; const sc = ahead * 40 - Math.abs(d - 28) + b.h * 0.2;
    if (sc > bs) { bs = sc; best = { x: clamp(x + fx * 22, b.x0, b.x1), z: clamp(z + fz * 22, b.z0, b.z1), y: b.h + 2 }; }
  }
  return best || { x: x + fx * 20, z: z + fz * 20, y: Math.max(surfaceY(x, z) + 18, 20), sky: true };
}

export class Powers {
  constructor(G) {
    this.G = G; this.t = 0; this.cool = 0; this.fly = false; this.lev = false; this.dash = 0; this.swing = 0; this.climb = false; this.slam = 0; this.carried = null; this.tossed = []; this.used = {};
    this.fx = new THREE.Group(); G.scene.add(this.fx); this.rings = [];
    // fio neon: cilindro fino esticado da mão até o ponto de ancoragem
    const wm = new THREE.MeshBasicMaterial({ color: 0x9ffff0, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.web = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 5, 1, true).translate(0, 0.5, 0).rotateX(Math.PI / 2), wm); this.web.frustumCulled = false; this.web.visible = false; this.fx.add(this.web);
    this.ringGeo = new THREE.RingGeometry(0.85, 1, 48).rotateX(-Math.PI / 2);
  }
  get kind() { const A = AVATARS[this.G.hero.id]; return A && A.power || null; }
  get def() { return AVATARS[this.G.hero.id]; }
  reset() { this.fly = this.lev = this.climb = false; this.dash = this.swing = this.slam = 0; this.web.visible = false; if (this.carried) this.drop(); this.jets(false); }
  ring(x, y, z, color, max, dur) {
    const m = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
    m.position.set(x, y + 0.08, z); this.fx.add(m); this.rings.push({ m, t: 0, max, dur });
  }
  jets(on) { const R = this.G.hero.rig; const j = R && R.model.userData.jets; if (j) for (const o of j) o.visible = on; }
  cheer(x, z, r = 22) { // moradores por perto acenam e comentam (ninguém se machuca)
    const G = this.G; let who = null, bd = r;
    for (const c of G.crowd.peds) { if (c.mode === 'lie' || c.mode === 'dodge') continue; const d = Math.hypot(c.x - x, c.z - z); if (d < r && d > 2) { if (d < bd) { bd = d; who = c; } if (Math.random() < 0.6) { c.mode = 'wave'; c.t = 1.8; c.h = Math.atan2(x - c.x, z - c.z); } } }
    if (who && (this.cheerCool || 0) <= 0) { G.ui.pedBubble(who, pick(HERO_REACT)); this.cheerCool = 6; }
  }
  hint(k, txt) { if (this.used[k]) return; this.used[k] = 1; if (this.G.touch) txt = txt.replace('Espaço sobe · Ctrl/Q desce', '⤒ sobe · ⤓ desce').replace('segure Espaço', 'toque ⤒').replace(/\bX\b/g, 'o botão ⚡'); this.G.ui.toast(txt, 3200); }
  // tecla de poder (X / ⚡)
  trigger() {
    const G = this.G, p = G.player; const k = this.kind; if (!k || p.vehicle || G.talk.cur || this.cool > 0) return false;
    const [fx, fz] = [Math.sin(p.h), Math.cos(p.h)]; G.audio.init && G.audio.init();
    if (k === 'voo') { this.fly = !this.fly; if (this.fly) { p.vy = 4; p.grounded = false; this.hint('voo', '☀️ <b>Voando!</b> Espaço sobe · Ctrl/Q desce · X pousa'); } this.jets(this.fly); this.cool = 0.3; }
    else if (k === 'levitar') { this.lev = !this.lev; if (this.lev) { p.grounded = false; this.hint('lev', '🧙 <b>Levitando</b> · Espaço sobe · Ctrl/Q desce · X desce ao chão'); this.ring(p.x, p.y, p.z, 0x7dff9a, 3, 0.8); } this.cool = 0.3; }
    else if (k === 'teia') { const a = anchorAhead(p.x, p.z, fx, fz); this.anchor = a; this.swing = 1.15; p.vy = 7.5; p.vx = fx * 15; p.vz = fz * 15; p.grounded = false; this.cool = 0.6; this.hint('teia', '🕸️ <b>Fio neon!</b> Ande contra um prédio para escalar'); }
    else if (k === 'escudo') { this.dash = 0.45; p.vx = fx * 19; p.vz = fz * 19; this.cool = 0.8; this.hint('esc', '🛡️ <b>Arrancada!</b> Bata numa parede para o escudo quicar'); }
    else if (k === 'impacto') { if (p.grounded) { p.vy = 6.5; p.grounded = false; } this.slam = 1; this.cool = 1.2; this.hint('imp', '🟣 <b>Pisão de onda</b> · só luz e vento, ninguém se machuca'); }
    else if (k === 'forca') {
      if (this.carried) return this.toss(fx, fz), true;
      let best = null, bd = 4.2; for (const v of G.vehicles) { if (v.driver || v.type === 'heli' || v.spec.boat || v.lifted) continue; const d = Math.hypot(v.x - p.x, v.z - p.z); if (d < bd) { bd = d; best = v; } }
      if (best) { this.carried = best; best.lifted = true; best.parked = true; this.hint('forca', '💪 <b>Levantou o carro!</b> X joga com cuidado (nada quebra)'); G.audio.thud && G.audio.thud(8); }
      else { this.hint('forca0', '💪 Chegue perto de um carro parado e aperte X · segure Espaço para o super pulo'); return false; }
      this.cool = 0.4;
    }
    return true;
  }
  toss(fx, fz) { const v = this.carried; if (!v) return; this.carried = null; v.tvx = fx * 11; v.tvz = fz * 11; v.tvy = 5; this.tossed.push(v); this.cool = 0.5; }
  drop() { const v = this.carried; if (!v) return; this.carried = null; v.tvx = v.tvz = 0; v.tvy = 0; this.tossed.push(v); }
  // chamado na física a pé. Retorna true quando o poder controla a altura (sem gravidade normal)
  foot(dt, p, c) {
    const k = this.kind; this.cool -= dt; this.cheerCool = (this.cheerCool || 0) - dt;
    if (!k) return false;
    const G = this.G, keys = c.keys, input = c.input; const up = keys.has('Space') || input.jump || input.hb, down = keys.has('ControlLeft') || keys.has('KeyQ') || input.down;
    const gy = c.gy;
    // super pulo do Colosso
    if (k === 'forca' && c.jumped) { p.vy = 13.5; this.bigJump = true; }
    if (k === 'forca' && this.bigJump && p.grounded) { this.bigJump = false; this.ring(p.x, gy, p.z, 0xc8ffb0, 6, 0.6); G.shake && G.shake(0.25); this.cheer(p.x, p.z); }
    if (this.fly || this.lev) {
      const fast = this.fly ? (c.run ? 30 : 17) : 6; const tvx = c.dx * fast, tvz = c.dz * fast; const kk = 1 - Math.exp(-dt * (this.fly ? 2.2 : 3));
      p.vx += (tvx - p.vx) * kk; p.vz += (tvz - p.vz) * kk;
      const vt = (up ? 1 : 0) - (down ? 1 : 0); const vmax = this.fly ? 9 : 3;
      let tvy = vt * vmax; if (this.lev) { const hov = gy + 2.2 + Math.sin(this.t * 2) * 0.15; if (!vt) tvy = (hov - p.y) * 2; if (p.y > gy + 14) tvy = Math.min(tvy, 0); }
      if (this.fly && !vt) tvy = Math.sin(this.t * 2.2) * 0.25;
      p.vy += (tvy - p.vy) * (1 - Math.exp(-dt * 3)); p.y += p.vy * dt;
      if (p.y > 260) { p.y = 260; p.vy = 0; }
      if (p.y < gy) { p.y = gy; p.vy = Math.max(0, p.vy); if (down && this.fly) { this.fly = false; this.jets(false); } }
      p.grounded = p.y - gy < 0.05; this.airPose = this.fly ? 'fly' : 'lev';
      if (this.lev && Math.random() < dt * 3) this.ring(p.x, p.y, p.z, 0x7dff9a, 1.6, 0.7);
      if (Math.random() < dt) this.cheer(p.x, p.z, 30);
      return true;
    }
    this.airPose = null;
    // escalada da Teia Neon: andar contra a parede sobe
    if (k === 'teia') {
      if (c.wall && c.dl > 0.05 && (c.dx * c.wall.x + c.dz * c.wall.z) < -0.4) { this.climb = true; this.wallN = c.wall; }
      else if (this.climb && !(c.dl > 0.05)) this.climb = false;
      if (this.climb) {
        const top = boxTop(p.x - this.wallN.x * 0.9, p.z - this.wallN.z * 0.9);
        if (top < p.y + 0.1) { this.climb = false; p.vy = 5; p.vx = -this.wallN.x * 3; p.vz = -this.wallN.z * 3; return false; } // chegou no topo: pula pro telhado
        p.vy = c.run ? 6 : 4; p.y += p.vy * dt; p.grounded = false; this.airPose = 'climb'; this.hint('climb', '🕸️ Escalando! Solte para descer'); return true;
      }
      if (this.swing > 0) {
        this.swing -= dt; const a = this.anchor; const h = this.G.hero.g;
        const w = this.web; w.position.set(p.x, p.y + 1.5 * (this.def.height / 1.7), p.z); tmpA.set(a.x, a.y, a.z); w.scale.set(1, 1, w.position.distanceTo(tmpA)); w.lookAt(tmpA); w.visible = true;
        // pêndulo: puxa para o ponto de ancoragem e embala para frente
        const dx = a.x - p.x, dy = a.y - p.y, dz = a.z - p.z, d = Math.hypot(dx, dy, dz) || 1; p.vx += dx / d * 14 * dt; p.vz += dz / d * 14 * dt; p.vy += (dy / d * 14 - 6) * dt;
        if (this.swing <= 0) this.web.visible = false;
      } else this.web.visible = false;
    }
    if (k === 'escudo' && this.dash > 0) {
      this.dash -= dt; this.airPose = 'dash';
      if (c.wall) { const vn = p.vx * c.wall.x + p.vz * c.wall.z; if (vn < -2) { p.vx -= 1.7 * vn * c.wall.x; p.vz -= 1.7 * vn * c.wall.z; p.vy = 4.5; p.grounded = false; this.ring(p.x, p.y + 0.8, p.z, 0xffb14a, 2.5, 0.4); G.audio.thud && G.audio.thud(10); this.dash = 0.25; this.hint('bounce', '🛡️ O escudo quicou!'); } }
      else if (p.grounded) { const sp = Math.hypot(p.vx, p.vz); if (sp < 15) { const s = 19 / Math.max(1, sp); p.vx *= s; p.vz *= s; } }
      if (this.dash <= 0) { p.vx *= 0.5; p.vz *= 0.5; }
    }
    if (k === 'impacto' && this.slam) {
      if (!p.grounded && p.vy < 2) p.vy = Math.min(p.vy, -16);
      if (p.grounded && p.jumpT > 0.15) { this.slam = 0; this.ring(p.x, gy, p.z, 0xc58cff, 16, 0.9); this.ring(p.x, gy, p.z, 0xffd27a, 9, 0.6); G.shake && G.shake(0.5); G.audio.thud && G.audio.thud(20);
        for (const v of G.vehicles) { const d = Math.hypot(v.x - p.x, v.z - p.z); if (d < 12 && !v.driver && !v.lifted && v.type !== 'heli') v.hop = Math.max(v.hop || 0, (12 - d) / 12 * 0.5); }
        this.cheer(p.x, p.z, 26); }
    }
    return false;
  }
  // efeitos visuais e carros carregados/jogados (também quando dirigindo)
  update(dt, t) {
    const G = this.G, p = G.player; this.t = t;
    for (let i = this.rings.length - 1; i >= 0; i--) { const r = this.rings[i]; r.t += dt; const f = r.t / r.dur; const s = 0.5 + f * r.max; r.m.scale.set(s, 1, s); r.m.material.opacity = 0.9 * (1 - f); if (f >= 1) { this.fx.remove(r.m); r.m.material.dispose(); this.rings.splice(i, 1); } }
    if (this.carried) { const v = this.carried; const H = this.def ? this.def.height : 2.3; v.x = p.x; v.z = p.z; v.y = p.y + H + 0.3; v.h = p.h + Math.PI / 2; v.vx = v.vz = 0; v.sync(0); if (p.vehicle || !this.kind || this.kind !== 'forca') this.drop(); }
    for (let i = this.tossed.length - 1; i >= 0; i--) {
      const v = this.tossed[i]; v.tvy -= 16 * dt; const nx = v.x + v.tvx * dt, nz = v.z + v.tvz * dt; tmpV.set(nx, 0, nz);
      if (!collide(tmpV, 1.2, false, v.y + 0.3)) { v.x = nx; v.z = nz; } else { v.tvx *= -0.3; v.tvz *= -0.3; }
      v.y += v.tvy * dt; const gy = Math.max(groundY(v.x, v.z), WATER_Y + 0.2);
      if (v.y <= gy) { v.y = gy; if (Math.abs(v.tvy) > 3) { v.tvy = -v.tvy * 0.25; v.tvx *= 0.5; v.tvz *= 0.5; this.ring(v.x, gy, v.z, 0xffffff, 4, 0.5); } else { v.lifted = false; v.tvy = 0; v.vx = v.vz = 0; this.tossed.splice(i, 1); if (v.y < -0.5) { v.y = 0; } } }
      v.sync(0);
    }
    for (const v of G.vehicles) if (v.hop > 0) { v.hopT = (v.hopT || 0) + dt * 9; v.hop = Math.max(0, v.hop - dt * 0.6); v.root.position.y = v.y + (v.hop > 0 ? Math.abs(Math.sin(v.hopT)) * v.hop : 0); if (v.hop <= 0) v.hopT = 0; }
    // capa do Lorde Férreo balança com o movimento
    const R = G.hero.rig; if (R && R.model.userData.cape) { const sp = Math.hypot(p.vx || 0, p.vz || 0); R.model.userData.cape.rotation.x = lerp(R.model.userData.cape.rotation.x, -Math.min(0.9, sp * 0.06) - (this.lev ? 0.25 : 0) + Math.sin(t * 3) * 0.04, Math.min(1, dt * 4)); }
  }
}
const tmpV = new THREE.Vector3(), tmpA = new THREE.Vector3();
