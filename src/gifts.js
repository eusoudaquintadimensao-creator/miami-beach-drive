// Presentes brilhantes espalhados pelo mapa: cada caixa dá um poder temporário (não violento), com ícone e contagem no HUD.
// Reaparecem depois de um tempo. Contador salvo em localStorage 'mbd-presentes-v1'.
import * as THREE from 'three';
import { rng, clamp, lerp } from './util.js';
import { BOUNDS, walkable, collide, isRoad, surfaceY, inTrackZone, isWaterDeep, HOOKS } from './world.js';

export const GIFT_KEY = 'mbd-presentes-v1';
export const POWERS = {
  mochila: { emoji: '🎒', name: 'Mochila Turbo', col: 0x29f0ff, dur: 60, txt: 'voa mais rápido e mais alto' },
  prancha: { emoji: '🛹', name: 'Prancha Flutuante', col: 0x9cff3a, dur: 75, txt: 'flutua rapidinho pela cidade' },
  planador: { emoji: '🪂', name: 'Planador', col: 0xffd23f, dur: 75, txt: 'pule e plane pelo céu' },
  superpulo: { emoji: '🦘', name: 'Superpulo', col: 0xff7ae0, dur: 60, txt: 'pulos gigantes (até telhados)' },
  superforca: { emoji: '💪', name: 'Superforça', col: 0xff8a3c, dur: 60, txt: 'empurra carros do caminho com cuidado' },
  supercorrida: { emoji: '⚡', name: 'Supercorrida', col: 0x7d9bff, dur: 60, txt: 'corre muito rápido' },
};
const TYPES = Object.keys(POWERS);
const RESPAWN = 150; // segundos de jogo

export class Gifts {
  constructor(G) {
    this.G = G; this.active = {}; this.pushed = []; this.got = 0;
    try { this.save = Object.assign({ total: 0, tipos: {}, turbo: false }, JSON.parse(localStorage.getItem(GIFT_KEY) || '{}')); } catch (e) { this.save = { total: 0, tipos: {}, turbo: false }; }
    // pontos: calçadas, praia, parques e píer — longe da pista, fora d'água, sem prédio
    const r = rng(2468), spots = []; const tmp = new THREE.Vector3(); const want = 34;
    const pre = [[330, -60], [345, 200], [355, -330], [316, 470], [-280, 20], [-360, -60], [190, 600], [-480, 140], [-470, 640], [-940, -150], [-60, -450]];
    const ok = (x, z) => { if (!walkable(x, z) || isWaterDeep(x, z) || inTrackZone(x, z, 30)) return false; tmp.set(x, 0, z); if (collide(tmp, 1.4, false, 0.5)) return false; if (isRoad(x, z)) return false; return spots.every(s => Math.hypot(s.x - x, s.z - z) > 55); };
    for (const [x, z] of pre) if (ok(x, z)) spots.push({ x, z });
    for (let k = 0; k < 4000 && spots.length < want; k++) { const x = BOUNDS.x0 + 30 + r() * (BOUNDS.x1 - BOUNDS.x0 - 60), z = BOUNDS.z0 + 30 + r() * (BOUNDS.z1 - BOUNDS.z0 - 60); if (ok(x, z)) spots.push({ x, z }); }
    spots.forEach((s, i) => { s.type = TYPES[i % TYPES.length]; s.next = 0; s.y = surfaceY(s.x, s.z); s.ph = r() * 6; });
    this.spots = spots; const n = spots.length;
    const boxM = new THREE.MeshStandardMaterial({ roughness: 0.35, metalness: 0.1, emissive: 0x222222 });
    const ribM = new THREE.MeshBasicMaterial({ color: 0xfff1b0, toneMapped: false });
    const beamM = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide, fog: false });
    const rib = mergeBoxes([[0.84, 0.12, 0.12, 0, 0, 0], [0.12, 0.12, 0.84, 0, 0, 0], [0.86, 0.86, 0.1, 0, 0, 0], [0.1, 0.86, 0.86, 0, 0, 0], [0.22, 0.16, 0.08, 0.12, 0.5, 0], [0.22, 0.16, 0.08, -0.12, 0.5, 0]]);
    const mk = (g, m) => { const im = new THREE.InstancedMesh(g, m, n); im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); G.scene.add(im); return im; };
    this.box = mk(new THREE.BoxGeometry(0.8, 0.8, 0.8), boxM); this.rib = mk(rib, ribM); this.beam = mk(new THREE.CylinderGeometry(0.42, 0.7, 7, 10, 1, true).translate(0, 3.5, 0), beamM); this.beam.renderOrder = 4;
    spots.forEach((s, i) => { const c = new THREE.Color(POWERS[s.type].col); this.box.setColorAt(i, c); this.beam.setColorAt(i, c); });
    // acessórios visuais no personagem: prancha e asa do planador
    this.board = new THREE.Group(); const bm = new THREE.MeshStandardMaterial({ color: 0xeef2f6, metalness: 0.3, roughness: 0.35, emissive: 0x9cff3a, emissiveIntensity: 0.15 }); const gm = new THREE.MeshBasicMaterial({ color: 0x9cff3a, toneMapped: false });
    this.board.add(new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 1.35), bm)); const gl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 1.25), gm); gl.position.y = -0.045; this.board.add(gl);
    const glowP = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x9cff3a, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); glowP.position.y = -0.4; this.board.add(glowP); this.boardGlow = glowP;
    this.board.visible = false; this.wing = new THREE.Group(); const wm = new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.5, side: THREE.DoubleSide });
    const wg = new THREE.BufferGeometry(); wg.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.35, -1.6, 0, -0.35, 1.6, 0, -0.35, 0, 0, 0.35, 1.6, 0, -0.35, 0, 0.05, -0.15, 0, 0, 0.35, 0, 0.05, -0.15, -1.6, 0, -0.35], 3)); wg.computeVertexNormals();
    this.wing.add(new THREE.Mesh(wg, wm)); const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.02, 0.05), new THREE.MeshBasicMaterial({ color: 0xff7ae0, toneMapped: false })); stripe.position.set(0, 0.01, -0.33); this.wing.add(stripe); this.wing.visible = false;
    HOOKS.map.push((g, X, Z) => { g.font = '12px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const s of this.spots) g.fillText('🎁', X(s.x), Z(s.z)); });
    this.hudT = 0; this.renderHud(true);
  }
  persist() { try { localStorage.setItem(GIFT_KEY, JSON.stringify(this.save)); } catch (e) { } }
  has(k) { return (this.active[k] || 0) > 0; }
  speedK() { return this.has('prancha') ? 2.5 : this.has('supercorrida') ? 2.3 : 1; }
  jumpV() { return this.has('superpulo') ? 13.5 : this.has('planador') ? 11 : 5.4; }
  get turbo() { return this.has('mochila') || this.save.turbo; }
  // pegar um presente
  collect(s) {
    const G = this.G, P = POWERS[s.type]; s.next = G.t + RESPAWN; this.got++;
    this.save.total++; this.save.tipos[s.type] = (this.save.tipos[s.type] || 0) + 1;
    let extra = ''; if (s.type === 'mochila' && !this.save.turbo && this.save.tipos.mochila >= 3) { this.save.turbo = true; extra = '<br>🔓 <b>Mochila Turbo liberada para sempre!</b>'; }
    this.persist(); this.active[s.type] = P.dur;
    if (s.type === 'mochila') { G.jet.set(true, true); }
    if (s.type === 'prancha') { this.active.planador = 0; } if (s.type === 'planador') { this.active.prancha = 0; }
    G.ui.toast(`🎁 <b>${P.emoji} ${P.name}</b> · ${P.txt} (${P.dur}s)${extra}`, 3200); G.audio.chime && G.audio.chime('win');
    G.shake && G.shake(0.42); // feedback médio (game-feel): som já tocou, partículas abaixo, tremor trauma²
    if (G.fx) for (let k = 0; k < 14; k++) G.fx.emit(s.x + (Math.random() - 0.5), s.y + 0.6, s.z + (Math.random() - 0.5), (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 0.6, G.env.night, 2 + Math.random() * 2);
    this.renderHud(true);
  }
  // física a pé (antes dos outros poderes): prancha controla a altura; planador plana quando cai
  foot(dt, p, c) {
    const G = this.G; this.boardOn = false; this.gliding = false; this.airPose = null;
    if (this.has('prancha') && !G.jet.on) {
      const tgt = c.gy + 0.45 + Math.sin(G.t * 3) * 0.05; p.y = lerp(p.y, tgt, Math.min(1, dt * 10)); p.vy = 0; p.grounded = true; this.boardOn = true;
      if (c.jumped) { p.y += 0.6; } this.airPose = 'board'; return true;
    }
    if (this.has('planador') && !G.jet.on && !p.grounded && p.vy < -1 && p.y - c.gy > 1.5) {
      this.gliding = true; const fx = Math.sin(p.h), fz = Math.cos(p.h); const want = c.dl > 0.05 ? 1 : 0.7; const k = 1 - Math.exp(-dt * 1.5);
      const dx = c.dl > 0.05 ? c.dx : fx, dz = c.dl > 0.05 ? c.dz : fz; p.vx += (dx * 15 * want - p.vx) * k; p.vz += (dz * 15 * want - p.vz) * k;
      p.vy = Math.max(p.vy - 16 * dt, -2.3); p.y += p.vy * dt; if (p.y <= c.gy) { p.y = c.gy; p.vy = 0; p.grounded = true; } this.airPose = 'glide'; return true;
    }
    if (this.has('superpulo') && !p.grounded && p.vy < 0 && p.y - c.gy < 1.2) p.vy = Math.max(p.vy, -6); // pouso macio
    return false;
  }
  // superforça: empurra o veículo em vez de parar (sem dano, devagar)
  push(o, ex, ez) {
    const G = this.G; if (!this.has('superforca') || o.driver === G.player || o === G.player.vehicle) return false;
    if (o.npc) { o.bumped = Math.max(o.bumped || 0, 2.5); o.shake = 0.6; return false; }
    if ((o.spec && o.spec.air) || (o.spec && o.spec.boat)) return false;
    const e = this.pushed.find(q => q.v === o) || (this.pushed.push({ v: o, vx: 0, vz: 0, w: 0 }), this.pushed[this.pushed.length - 1]);
    e.vx = -ex * 7; e.vz = -ez * 7; e.w = (Math.random() - 0.5) * 1.5; if (!this.pushedOnce) { this.pushedOnce = true; G.ui.toast('💪 Empurrou o carro com cuidado!', 1600); } G.audio.thud && G.audio.thud(4); return true;
  }
  update(dt, t, cam) {
    const G = this.G, p = G.player; const camX = cam.position.x, camZ = cam.position.z;
    for (const k in this.active) if (this.active[k] > 0) { this.active[k] -= dt; if (this.active[k] <= 0) { this.active[k] = 0; G.ui.toast(`${POWERS[k].emoji} ${POWERS[k].name} acabou`, 1500); if (k === 'mochila' && !this.save.turbo && G.jet.on && p.grounded) G.jet.set(false, true); } }
    // presentes: giram e flutuam; pega a pé passando por cima
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new THREE.Vector3(), v3 = new THREE.Vector3(), Z = new THREE.Matrix4().makeScale(0, 0, 0);
    this.spots.forEach((s, i) => {
      const on = G.t >= s.next; const far = Math.abs(s.x - camX) > 260 || Math.abs(s.z - camZ) > 260;
      if (!on || far) { this.box.setMatrixAt(i, Z); this.rib.setMatrixAt(i, Z); this.beam.setMatrixAt(i, Z); return; }
      if (!p.vehicle && Math.hypot(p.x - s.x, p.z - s.z) < 1.7 && Math.abs(p.y - s.y) < 3) { this.collect(s); return; }
      const y = s.y + 0.75 + Math.sin(t * 2 + s.ph) * 0.15; q.setFromAxisAngle(v3.set(0, 1, 0), t * 1.2 + s.ph); m.compose(v3.set(s.x, y, s.z), q, s3.setScalar(1)); this.box.setMatrixAt(i, m); this.rib.setMatrixAt(i, m);
      m.compose(v3.set(s.x, s.y, s.z), q, s3.set(1, 0.85 + Math.sin(t * 3 + s.ph) * 0.15, 1)); this.beam.setMatrixAt(i, m);
    });
    this.box.instanceMatrix.needsUpdate = this.rib.instanceMatrix.needsUpdate = this.beam.instanceMatrix.needsUpdate = true;
    this.beam.material.opacity = 0.22 + G.env.night * 0.25;
    // carros empurrados deslizam e param
    for (const e of this.pushed) { const v = e.v; if (v.driver) { e.vx = e.vz = 0; continue; } const sp = Math.hypot(e.vx, e.vz); if (sp < 0.05) continue; v.x += e.vx * dt; v.z += e.vz * dt; v.h += e.w * dt * Math.min(1, sp / 4); const k = Math.exp(-dt * 2.2); e.vx *= k; e.vz *= k; e.w *= k; const tp = new THREE.Vector3(v.x, 0, v.z); if (collide(tp, v.r || 1.2, false, 1)) { v.x = tp.x; v.z = tp.z; e.vx *= -0.3; e.vz *= -0.3; } v.y = surfaceY(v.x, v.z); v.sync(dt); }
    this.pushed = this.pushed.filter(e => Math.hypot(e.vx, e.vz) > 0.05 && !e.v.driver);
    for (const c of G.traffic.cars) if (c.shake > 0) { c.shake -= dt; c.roll = Math.sin(t * 40) * 0.05 * c.shake; }
    // acessórios no personagem
    const hg = G.hero.g; if (this.board.parent !== hg) hg.add(this.board); if (this.wing.parent !== hg) hg.add(this.wing);
    this.board.visible = !!this.boardOn && !p.vehicle; this.board.position.set(0, -0.08, 0); this.boardGlow.material.opacity = 0.25 + Math.sin(t * 6) * 0.08;
    this.wing.visible = this.has('planador') && !p.vehicle && !p.grounded; const hk = G.hero.heightK || 1; this.wing.position.set(0, 1.45 * hk, -0.15);
    // rastro da supercorrida
    if (this.has('supercorrida') && !p.vehicle && Math.hypot(p.vx, p.vz) > 9 && G.fx) { this.acc = (this.acc || 0) + dt * 18; while (this.acc >= 1) { this.acc -= 1; G.fx.emit(p.x, p.y + 0.15, p.z, -p.vx * 0.1, -p.vz * 0.1, 0.35, G.env.night, 0.5); } }
    this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.5; this.renderHud(); }
  }
  renderHud(force) {
    const el = document.getElementById('giftHud'); if (!el) return;
    const chips = Object.keys(this.active).filter(k => this.active[k] > 0).map(k => `<span class="gChip" style="--c:#${POWERS[k].col.toString(16).padStart(6, '0')}">${POWERS[k].emoji}<b>${Math.ceil(this.active[k])}s</b></span>`);
    const html = chips.join('') + (chips.length || this.got ? `<span class="gChip gCount">🎁<b>${this.save.total}</b></span>` : '');
    if (force || html !== this._h) { el.innerHTML = html; this._h = html; el.hidden = !html; }
  }
  nearest(x, z) { let best = null, bd = 1e9; for (const s of this.spots) { if (this.G.t < s.next) continue; const d = Math.hypot(s.x - x, s.z - z); if (d < bd) { bd = d; best = s; } } return best && { s: best, d: bd }; }
}
function mergeBoxes(list) {
  const gs = list.map(([w, h, d, x, y, z]) => new THREE.BoxGeometry(w, h, d).translate(x, y, z).toNonIndexed()); const n = gs.reduce((a, g) => a + g.attributes.position.count, 0);
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0; for (const g of gs) { pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3); o += g.attributes.position.count; g.dispose(); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); return g;
}
