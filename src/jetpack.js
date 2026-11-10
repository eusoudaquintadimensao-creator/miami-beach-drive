// Mochila a jato: liga/desliga (J ou 🎒). Segure Espaço/⤒ para subir, Ctrl/Q/⤓ para descer, o joystick/WASD voa para os lados.
// Sem combustível para gerenciar (é diversão), chama azul-laranja e fumaça; pousa sozinha ao tocar o chão.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, lerp } from './util.js';

export class Jetpack {
  constructor(G) {
    this.G = G; this.on = false; this.recent = 0; this.thrust = 0; this.airPose = null; this.whoosh = 0;
    const g = new THREE.Group(); g.visible = false; this.g = g;
    const body = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, roughness: 0.3, metalness: 0.5 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x23232a, roughness: 0.5, metalness: 0.6 });
    const neon = new THREE.MeshBasicMaterial({ color: 0x29f0ff, toneMapped: false });
    const tanks = [], parts = [], glow = [];
    for (const sx of [-0.13, 0.13]) {
      tanks.push(new THREE.CylinderGeometry(0.1, 0.1, 0.5, 12).translate(sx, 0, 0).toNonIndexed(), new THREE.SphereGeometry(0.1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2).translate(sx, 0.25, 0).toNonIndexed());
      parts.push(new THREE.CylinderGeometry(0.07, 0.095, 0.14, 10).translate(sx, -0.32, 0).toNonIndexed());
      glow.push(new THREE.BoxGeometry(0.02, 0.36, 0.02).translate(sx + Math.sign(sx) * 0.1, 0, 0.04).toNonIndexed());
    }
    parts.push(new THREE.BoxGeometry(0.34, 0.42, 0.06).translate(0, 0.02, 0.1).toNonIndexed());
    g.add(new THREE.Mesh(mergeGeometries(tanks), body), new THREE.Mesh(mergeGeometries(parts), dark), new THREE.Mesh(mergeGeometries(glow), neon));
    // chamas: dois cones aditivos (núcleo azul + cauda laranja)
    const fm = (c, o) => new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.flames = [];
    for (const sx of [-0.13, 0.13]) {
      const outer = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.7, 10, 1, true).translate(0, -0.35, 0).rotateX(Math.PI), fm(0xff8a2a, 0.75)); outer.position.set(sx, -0.38, 0);
      const inner = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.4, 10, 1, true).translate(0, -0.2, 0).rotateX(Math.PI), fm(0x7fd4ff, 0.95)); inner.position.set(sx, -0.38, 0);
      g.add(outer, inner); this.flames.push(outer, inner);
    }
    g.position.set(0, 1.18, -0.2);
  }
  attach() { const hg = this.G.hero.g; if (this.g.parent !== hg) hg.add(this.g); const k = this.G.hero.heightK || 1; this.g.position.set(0, 1.18 * clamp(k, 0.9, 1.5), -0.2 * clamp(k, 0.9, 1.3)); }
  // liga/desliga (silent: sem aviso)
  set(on, silent) {
    const G = this.G, p = G.player; if (on && (p.vehicle || G.race.active)) { if (!silent) G.ui.toast('🎒 Saia do veículo para usar a mochila a jato', 2200); return; }
    this.on = on; if (on) { if (G.powers) { G.powers.fly = G.powers.lev = false; G.powers.jets(false); } this.attach(); this.g.visible = true; if (!silent) { G.ui.toast(G.touch ? '🎒 <b>Mochila a jato!</b> segure ⤒ para subir · ⤓ desce · joystick voa' : '🎒 <b>Mochila a jato!</b> segure <kbd>Espaço</kbd> para subir · <kbd>Q</kbd>/<kbd>Ctrl</kbd> desce · <kbd>J</kbd> guarda', 3600); } if (p.grounded) { p.vy = 7; p.grounded = false; } G.audio.nitro && G.audio.nitro(); }
    else { this.g.visible = false; this.airPose = null; this.thrust = 0; }
    const b = document.getElementById('qJet'); if (b) b.classList.toggle('on', this.on);
  }
  toggle() { this.set(!this.on); }
  // física (chamada na física a pé). Retorna true quando a mochila controla a altura
  foot(dt, p, c) {
    this.recent = Math.max(0, this.recent - dt);
    if (!this.on) return false;
    const up = c.keys.has('Space') || c.input.hb || c.input.jump, down = c.keys.has('ControlLeft') || c.keys.has('KeyQ') || c.input.down;
    const gy = c.gy; const alt = p.y - gy;
    if (p.grounded && !up) { this.airPose = null; this.thrust = lerp(this.thrust, 0, Math.min(1, dt * 6)); return false; }
    // horizontal: voo com inércia
    const fast = c.run ? 22 : 14; const kk = 1 - Math.exp(-dt * 1.8);
    p.vx += (c.dx * (c.dl > 0.05 ? fast : 0) - p.vx) * kk; p.vz += (c.dz * (c.dl > 0.05 ? fast : 0) - p.vz) * kk;
    // vertical: empuxo contra a gravidade; sem apertar nada desce devagar (planando)
    const tvy = up ? (alt > 150 ? 0 : 8.5) : down ? -8 : -1.6; p.vy += (tvy - p.vy) * (1 - Math.exp(-dt * (up ? 2.6 : 1.8))); p.y += p.vy * dt;
    if (p.y < gy) { p.y = gy; p.vy = 0; p.grounded = true; } else p.grounded = p.y - gy < 0.05;
    this.thrust = lerp(this.thrust, up ? 1 : down ? 0.15 : 0.45, Math.min(1, dt * 8)); this.airPose = p.grounded ? null : 'fly'; this.recent = 20;
    if (up) { this.whoosh -= dt; if (this.whoosh <= 0) { this.whoosh = 1.4; this.G.audio.nitro && this.G.audio.nitro(); } } else this.whoosh = 0;
    return true;
  }
  update(dt, t) {
    if (!this.on) return; const G = this.G, p = G.player; if (p.vehicle) { this.set(false, true); return; }
    if (this.g.parent !== G.hero.g) this.attach();
    const th = p.grounded ? 0 : this.thrust; const fl = 0.85 + Math.sin(t * 47) * 0.12 + Math.sin(t * 31) * 0.08;
    for (let i = 0; i < this.flames.length; i++) { const f = this.flames[i]; f.visible = th > 0.05; f.scale.set(1, (0.35 + th * 1.1) * fl * (i % 2 ? 0.9 : 1), 1); f.material.opacity = (i % 2 ? 0.95 : 0.75) * clamp(th * 1.6, 0, 1); }
    // fumaça descendo dos bocais (usa o sistema de fumaça dos pneus)
    if (th > 0.2 && G.fx) { this.acc = (this.acc || 0) + dt * 30 * th; const [s, c] = [Math.sin(p.h), Math.cos(p.h)];
      while (this.acc >= 1) { this.acc -= 1; const sx = Math.random() < 0.5 ? -0.13 : 0.13; G.fx.emit(p.x - s * 0.25 + c * sx, p.y + 0.45, p.z - c * 0.25 - s * sx, p.vx, p.vz, 0.6, G.env.night, -2.8 - th * 3); } }
  }
}
