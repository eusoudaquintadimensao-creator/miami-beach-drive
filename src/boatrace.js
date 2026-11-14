// Raia das Lanchas (t367): corrida de lanchas tunadas na baía entre as duas pontes da cidade. Chegue de lancha a até
// 50 m da largada (boia neon 🚤) e aceite: 3 lanchas tunadas da IA (neon, motor forte) correm 2 voltas por boias,
// com elástico (sempre perto), GPS e seta. Colocação 1º–4º com prêmio em dinheiro do jogo. Duas lanchas tunadas ficam
// paradas na largada para quem chegar a pé. Sem violência: encostar só desacelera.
import * as THREE from 'three';
import { clamp, angDiff, canvasTex } from './util.js';
import { WATER_Y, HOOKS, boatable } from './world.js';
import { Vehicle } from './vehicles.js';
import { Radio } from './radio.js';
const $ = (id) => document.getElementById(id);
export const BOAT_RACE = { name: 'Raia das Lanchas', start: { x: -62, z: 330, h: Math.PI }, laps: 2,
  pts: [[-62, 300], [-40, 150], [-28, -60], [-40, -250], [-70, -345], [-105, -300], [-112, -120], [-110, 80], [-108, 250], [-90, 345]],
  racers: [{ name: 'Capitã Marola', col: 0xff4fb8, glow: 0x29f0ff, fem: true }, { name: 'Zeca Onda', col: 0xffd23f, glow: 0xff2bd6 }, { name: 'Lia Espuma', col: 0x29f0ff, glow: 0x45ff9a, fem: true }],
  parked: [{ x: -40, z: 372, h: Math.PI, col: 0x7d4dff, glow: 0xff4fb8, name: 'Lancha Tunada Maré Neon' }, { x: -86, z: 372, h: Math.PI, col: 0xff6f59, glow: 0x29f0ff, name: 'Lancha Tunada Coral' }],
  prize: [600, 350, 200, 100] };
const TUNED = { max: 37, acc: 9.5, steer: 1.0 };
// deixa uma lancha "tunada": cor própria, faixas neon na linha d'água, aerofólio e mais motor
export function tuneBoat(v, col, glow, name) {
  v.spec = Object.assign({}, v.spec, TUNED, { name: name || 'Lancha Tunada' }); v.tunedBoat = true;
  const neon = new THREE.MeshBasicMaterial({ color: glow, toneMapped: false });
  for (const sx of [-1, 1]) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 5.4), neon); m.position.set(sx * 1.2, 0.05, -0.2); v.body.add(m); }
  const fin = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.5), new THREE.MeshStandardMaterial({ color: col, metalness: 0.6, roughness: 0.25 })); fin.position.set(0, 1.55, -2.6); v.body.add(fin);
  for (const sx of [-0.8, 0.8]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.6, 0.06), neon); p.position.set(sx, 1.25, -2.6); v.body.add(p); }
  v.body.traverse(o => { if (o.isMesh && o.material && o.material.color && o.material !== neon && o.geometry && o.geometry.type === 'ExtrudeGeometry') { o.material = o.material.clone(); o.material.color.setHex(col); o.material.metalness = 0.5; o.material.roughness = 0.25; } });
  return v;
}
export class BoatRace {
  constructor(G) {
    this.G = G; this.race = null; this.declined = false; this.radio = new Radio(G, {}); this.promptT = 0;
    const curve = new THREE.CatmullRomCurve3(BOAT_RACE.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), true, 'centripetal'); this.L = curve.getLength();
    const N = Math.round(this.L / 4); const P = curve.getSpacedPoints(N); this.N = N; this.px = P.map(p => p.x); this.pz = P.map(p => p.z); this.ds = this.L / N;
    this.bad = 0; for (let i = 0; i < N; i++) if (!boatable(this.px[i], this.pz[i])) this.bad++;
    this.build();
    HOOKS.map.push((g, X, Z) => { g.strokeStyle = 'rgba(41,240,255,.8)'; g.setLineDash([6, 5]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= N; i++) { const k = i % N; (i ? g.lineTo : g.moveTo).call(g, X(this.px[k]), Z(this.pz[k])); } g.stroke(); g.setLineDash([]); g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000b'; g.beginPath(); g.arc(X(BOAT_RACE.start.x), Z(BOAT_RACE.start.z), 10, 0, 7); g.fill(); g.fillText('🚤', X(BOAT_RACE.start.x), Z(BOAT_RACE.start.z) + 1); });
    this.parked = BOAT_RACE.parked.map(p => { const v = tuneBoat(new Vehicle('boat', G.scene, G.Q, p.col), p.col, p.glow, p.name); v.place(p.x, p.z, p.h); v.parked = true; G.vehicles.push(v); return v; });
    const tip = $('boatTip'); if (tip) { tip.addEventListener('pointerdown', e => e.stopPropagation()); tip.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.k === 'ok') this.accept(); else { this.declined = true; tip.hidden = true; tip._h = ''; } }); }
  }
  build() {
    const G = this.G; this.group = new THREE.Group(); this.group.name = 'raiaLanchas'; G.scene.add(this.group);
    // boias a cada ~35 m dos dois lados do traçado + boia grande de largada com arco neon
    const bm = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, emissive: 0xff5a00, emissiveIntensity: 0.25 }); const bg = new THREE.CylinderGeometry(0.45, 0.6, 1.2, 8);
    const pos = []; for (let i = 0; i < this.N; i += 9) { const a = this.px[i], b = this.pz[i], j = (i + 1) % this.N; const tx = this.px[j] - a, tz = this.pz[j] - b, l = Math.hypot(tx, tz) || 1; for (const s of [-1, 1]) pos.push([a - tz / l * 11 * s, b + tx / l * 11 * s]); }
    this.buoys = new THREE.InstancedMesh(bg, bm, pos.length); const d = new THREE.Object3D(); pos.forEach(([x, z], k) => { d.position.set(x, WATER_Y + 0.3, z); d.updateMatrix(); this.buoys.setMatrixAt(k, d.matrix); }); this.buoys.name = 'raiaBoias'; this.group.add(this.buoys); this.buoyPos = pos;
    const S = BOAT_RACE.start; const neon = new THREE.MeshBasicMaterial({ color: 0x29f0ff, toneMapped: false }); const arch = new THREE.Group();
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.6, 8, 0.6), neon); p.position.set(s * 13, 4, 0); arch.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(26.6, 0.8, 0.6), neon); top.position.y = 8; arch.add(top);
    const sign = canvasTex(512, 96, (g, w, h) => { g.fillStyle = '#0b1424'; g.fillRect(0, 0, w, h); g.font = 'bold 50px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#29f0ff'; g.shadowBlur = 14; g.fillStyle = '#e6fdff'; g.fillText('🚤 ' + BOAT_RACE.name.toUpperCase(), w / 2, h / 2 + 3); }, { clamp: true });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(16, 3), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, side: THREE.DoubleSide })); sm.position.y = 10; arch.add(sm);
    arch.position.set(S.x, WATER_Y, S.z); arch.rotation.y = S.h; this.arch = arch; this.group.add(arch);
    // portão do próximo checkpoint (anel flutuante)
    const rm = new THREE.MeshBasicMaterial({ color: 0xff4fb8, toneMapped: false, transparent: true, opacity: 0.8, depthWrite: false });
    this.ring = new THREE.Mesh(new THREE.TorusGeometry(7, 0.35, 6, 28), rm); this.ring.visible = false; this.group.add(this.ring);
  }
  // índice/progresso do ponto mais perto do traçado
  locate(x, z, hint) { let best = 0, bd = 1e18; const a = hint == null ? 0 : hint - 20, b = hint == null ? this.N : hint + 20; for (let k = a; k < b; k++) { const i = ((k % this.N) + this.N) % this.N; const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return { i: best, s: best * this.ds, d: Math.sqrt(bd) }; }
  at(s, lat = 0) { const L = this.L; s = ((s % L) + L) % L; const f = s / this.ds, i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f); const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t; const h = Math.atan2(this.px[j] - this.px[i], this.pz[j] - this.pz[i]); return { x: x - Math.cos(h) * lat, z: z + Math.sin(h) * lat, h }; }
  near() { const p = this.G.player, S = BOAT_RACE.start; return Math.hypot(p.x - S.x, p.z - S.z); }
  canAccept() { const v = this.G.player.vehicle; return !!(v && v.spec.boat && !this.race && this.near() < 50); }
  accept() {
    const G = this.G; if (!this.canAccept()) { G.ui.toast('🚤 Chegue de lancha perto da boia de largada (até 50 m)', 2200); return false; }
    const v = G.player.vehicle, S = BOAT_RACE.start;
    const s0 = this.locate(S.x, S.z).s; const st = this.at(s0, 0); v.place(st.x, st.z, st.h); v.vf = v.vx = v.vz = 0; G.player.x = v.x; G.player.z = v.z; G.camYaw = st.h; G.snapCam && G.snapCam();
    const ais = BOAT_RACE.racers.map((r, k) => { const b = tuneBoat(new Vehicle('boat', G.scene, G.Q, r.col), r.col, r.glow, r.name); const lat = [-7, 7, 0][k], back = [0, 0, -12][k]; const p = this.at(s0 + back, lat); b.place(p.x, p.z, p.h); Object.assign(b, { npc: true, noEnter: true, ghost: true, racer: r.name, s: s0 + back, lat, spd: 0, lap: 0 }); G.vehicles.push(b); return b; });
    this.race = { t: -3.5, beep: 4, s0, ais, lap: 0, prog: 0, last: null, hint: null, done: false, k: 0 };
    const nm = {}; BOAT_RACE.racers.forEach((r, k) => { nm[r.fem ? (k ? 'duda' : 'bia') : 'tche'] = r.name; }); this.radio.names = Object.assign({ lipe: 'Lipe (rádio)', valdo: 'Valdo (rádio)' }, nm); this.radio.load(); this.radio.reset();
    setTimeout(() => this.race && this.radio.say('boatStart', null, 0, true), 700);
    G.ui.toast(`🚤 <b>${BOAT_RACE.name}</b> · ${BOAT_RACE.laps} voltas pelas boias · 4 lanchas tunadas · siga o anel rosa`, 3200); this.hud(true); return true;
  }
  position() { const R = this.race; if (!R) return 1; const me = R.prog; let k = 1; for (const a of R.ais) if (a.s - R.s0 > me) k++; return k; }
  end(fin, why) {
    const G = this.G, R = this.race; if (!R) return; this.race = null; this.ring.visible = false; G.route = null;
    for (const a of R.ais) { const i = G.vehicles.indexOf(a); if (i >= 0) G.vehicles.splice(i, 1); a.dispose(G.scene); }
    if (fin) { const pl = R.place; const prize = BOAT_RACE.prize[pl - 1] || 100; G.addMoney && G.addMoney(prize); this.last = { place: pl, prize, t: R.t }; this.wins = (this.wins || 0) + (pl === 1 ? 1 : 0); G.ui.big(pl === 1 ? 'VITÓRIA NA ÁGUA!' : pl + 'º LUGAR'); G.ui.toast(`🚤 <b>${BOAT_RACE.name}</b> · ${pl}º lugar · prêmio <b>$${prize}</b> · tempo ${Math.floor(R.t / 60)}:${String(Math.floor(R.t % 60)).padStart(2, '0')}`, 4000); if (pl === 1) this.radio.say('boatWin', null, 0, true); }
    else if (why) G.ui.toast(why, 2600);
    this.hud(true);
  }
  update(dt, t) {
    const G = this.G; this.radio.update(dt);
    if (this.arch) { const n = G.env ? G.env.night : 0; this.arch.children[0].material.color.setHex(0x29f0ff).multiplyScalar(0.6 + n * 1.4); }
    for (const v of this.parked) if (!v.driver && v.parked) v.sync(dt);
    this.promptT -= dt; if (this.promptT <= 0) { this.promptT = 0.4; const tip = $('boatTip'); if (this.near() > 90) this.declined = false; const show = this.canAccept() && !this.declined;
      if (tip) { if (show) { const h = `🚤 <b>${BOAT_RACE.name}</b> · ${BOAT_RACE.laps} voltas · 4 lanchas tunadas<br><small>prêmio até $${BOAT_RACE.prize[0]} · siga as boias e o anel rosa</small><div class="stAsk"><button data-k="ok">🏁 Aceitar</button><button data-k="no">✖ Recusar</button></div>`; if (tip._h !== h) { tip.innerHTML = h; tip._h = h; } tip.hidden = false; } else if (!tip.hidden) { tip.hidden = true; tip._h = ''; } } }
    const R = this.race; if (!R) return; const v = G.player.vehicle;
    if (!v || !v.spec.boat) { this.end(false, '🚤 Você saiu da lancha — corrida cancelada'); return; }
    R.t += dt;
    if (R.t < 0) { const k = Math.ceil(-R.t); if (k < R.beep && k <= 3) { R.beep = k; G.ui.big(String(k)); G.audio.chime && G.audio.chime('ok'); } const st = this.at(R.s0, 0); v.x = st.x; v.z = st.z; v.h = st.h; v.vx = v.vz = v.vf = 0; v.sync(0); for (const a of R.ais) a.sync(dt); this.hud(); return; }
    if (R.beep > 0) { R.beep = 0; G.ui.big('VAI!'); G.audio.chime && G.audio.chime('win'); }
    // progresso do jogador (só para a frente, perto do traçado)
    const loc = this.locate(v.x, v.z, R.hint); R.hint = loc.i; const s = loc.s;
    if (R.last != null && loc.d < 60) { let d = s - R.last; if (d > this.L / 2) d -= this.L; if (d < -this.L / 2) d += this.L; if (Math.abs(d) < 40) R.prog += d; }
    R.last = s; R.off = loc.d > 60 ? (R.off || 0) + dt : 0; if (R.off > 10) { this.end(false, '🚤 Muito longe das boias — corrida cancelada'); return; }
    // IA: segue o traçado com elástico, desvia do jogador
    const me = R.prog; const pv = Math.max(0, v.vf || Math.hypot(v.vx, v.vz));
    R.ais.forEach((a, k) => { const gap = (a.s - R.s0) - me; let want = (TUNED.max - 3 + k * 0.8) * (gap > 120 ? 0.6 : gap > 50 ? 0.85 : gap > 15 ? 0.96 : gap < -120 ? 1.35 : gap < -40 ? 1.15 : 1.02);
      if (gap > 150) want = Math.min(want, Math.max(3, pv * 0.8)); else if (gap > 60) want = Math.min(want, Math.max(12, pv * 0.92)); if (a.s - R.s0 >= BOAT_RACE.laps * this.L) want = 6;
      a.spd += clamp(want - a.spd, -10 * dt, 7 * dt); a.s += a.spd * dt;
      let lat = [-6, 6, 0][k]; const pl = this.locate(v.x, v.z, null); const rel = (a.s % this.L) - pl.s; if (Math.abs(rel) < 14 && Math.hypot(a.x - v.x, a.z - v.z) < 9) lat += a.lat > 0 ? 4 : -4; a.lat += (lat - a.lat) * Math.min(1, dt * 1.5);
      const p = this.at(a.s, a.lat); const dh = angDiff(a.h, p.h); a.x = p.x; a.z = p.z; a.h += dh * Math.min(1, dt * 5); a.vx = Math.sin(a.h) * a.spd; a.vz = Math.cos(a.h) * a.spd; a.vf = a.spd; a.steer = clamp(dh * 3, -1, 1); a.sync(dt); });
    // anel do próximo checkpoint (a ~70 m à frente) e GPS
    { const nx = this.at(R.s0 + me + 70, 0); this.ring.visible = true; this.ring.position.set(nx.x, WATER_Y + 4, nx.z); this.ring.rotation.y = nx.h; G.route = [[v.x, v.z], ...[60, 160, 260, 360].map(o => { const q = this.at(R.s0 + me + o, 0); return [q.x, q.z]; })]; }
    const pos = this.position(); R.place = pos; R.lap = Math.min(BOAT_RACE.laps, 1 + Math.floor(Math.max(0, me) / this.L));
    if (me >= BOAT_RACE.laps * this.L - 4) { this.end(true); return; }
    this.hud();
  }
  hud(force) {
    const el = $('boatHud'); if (!el) return; const R = this.race; if (!R) { if (!el.hidden) el.hidden = true; return; }
    const pc = Math.floor(clamp(R.prog / (BOAT_RACE.laps * this.L), 0, 1) * 100); const h = `<b>🚤 ${BOAT_RACE.name}</b> volta ${Math.max(1, R.lap)}/${BOAT_RACE.laps} · <span class="pos">${R.place || 4}º/4</span> · 🏁 ${pc}%<i class="pbar"><i style="width:${pc}%"></i></i>`;
    if (force || h !== el._h) { el.innerHTML = h; el._h = h; } el.hidden = false;
  }
}
