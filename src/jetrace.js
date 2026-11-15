// Copa Jet Maré (t434): corrida de jet ski perto da praia. Alugue um jet ski no píer (ou chegue de jet ski), aceite e corra
// 2 voltas contra 3 pilotos: anéis dourados = pontos, anéis turquesa = turbo, moedas no caminho, rampas de onda = saltos com
// borrifo. Cronômetro, posição e pontos no HUD; prêmio em dinheiro do jogo pela colocação + pontos. Sem violência: encostar só desacelera.
import * as THREE from 'three';
import { clamp, angDiff, canvasTex } from './util.js';
import { WATER_Y, HOOKS, boatable } from './world.js';
import { Vehicle } from './vehicles.js';
const $ = (id) => document.getElementById(id);

// ---- THEME (Neon Distrito troca este bloco)
const THEME = {
  name: 'Copa Jet Maré', gold: 0xffc93c, boost: 0x2ee6d6, neon: false, sign: '#0d2238',
  track: { cx: 0, cz: 0, rx: 60, rz: 170, wig: 10 }, // posição ajustada em JET.place() a partir da orla
  racers: [{ name: 'Lia Marola', col: 0xff5a7a }, { name: 'Davi Espuma', col: 0x2ab3b8 }, { name: 'Nina Vento', col: 0xffd23f }],
  wGold: 'dourados', wBoost: 'turquesa',
  laps: 2, prize: [400, 200, 120], part: 50, coin: 5, ringPts: 50, coinPts: 10, jumpPts: 30,
  chat: ['{a}: Segura o boné que a marola vem aí! 🧢', '{a}: Pulei a onda e quase virei gaivota 🐦', '{a}: Argola turquesa = turbo. Anotado! ⚡', '{a}: Ei {b}, essa espuma é minha!', '{a}: Moedinha brilhando ali, olha! 🪙', '{a}: Quem chegar por último lava os coletes 😂'],
};
// ---- fim THEME
export const JET = THEME;

export class JetRace {
  constructor(G) {
    this.G = G; this.race = null; this.declined = false; this.promptT = 0; this.chatT = 0; this.splT = 0; this.wins = 0; this.last = null; this.best = null;
    this.root = new THREE.Group(); this.root.name = 'copaJet'; G.scene.add(this.root);
    this.place(); this.build();
    // jet skis de aluguel no píer
    this.parked = [0, 1].map(k => { const v = new Vehicle('jetski', G.scene, G.Q, k ? 0x2ee6d6 : 0xff5a7a); const p = this.at(-14 - k * 7, k ? 7 : -7); v.place(p.x, p.z, p.h); v.parked = true; G.vehicles.push(v); return v; });
    HOOKS.map.push((g, X, Z) => { g.strokeStyle = 'rgba(46,230,214,.9)'; g.setLineDash([5, 4]); g.lineWidth = 2; g.beginPath(); for (let i = 0; i <= this.N; i += 2) { const k = i % this.N; (i ? g.lineTo : g.moveTo).call(g, X(this.px[k]), Z(this.pz[k])); } g.closePath(); g.stroke(); g.setLineDash([]);
      g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000c'; g.beginPath(); g.arc(X(this.start.x), Z(this.start.z), 11, 0, 7); g.fill(); g.fillText('🌊', X(this.start.x), Z(this.start.z) + 1); });
    for (const id of ['jetTip', 'jetHud']) if (!$(id)) { const el = document.createElement('div'); el.id = id; el.hidden = true; ($('hud') || document.body).appendChild(el); }
    const tip = $('jetTip'); tip.addEventListener('pointerdown', e => e.stopPropagation()); tip.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.k === 'ok') this.accept(); else { this.declined = true; tip.hidden = true; tip._h = ''; } });
  }
  // acha um trecho de mar livre perto da orla (mar a leste): circuito elíptico todo navegável
  place() {
    const T = THEME.track; let best = null;
    for (let cz = -900; cz <= 900; cz += 60) { let x0 = null; for (let x = 300; x < 900; x += 6) if (boatable(x, cz) && boatable(x + 4, cz)) { x0 = x; break; } if (x0 == null) continue;
      const cx = x0 + T.rx + 40; this.mk(cx, cz); let bad = 0; for (let i = 0; i < this.N; i += 2) if (!boatable(this.px[i], this.pz[i]) || !boatable(this.px[i] + 9, this.pz[i]) || !boatable(this.px[i] - 9, this.pz[i])) bad++;
      const sc = bad * 1000 + Math.abs(cz - (T.prefZ ?? -200)) * 0.2 + (cx - x0); if (!best || sc < best.sc) best = { sc, cx, cz, bad }; }
    if (!best) best = { cx: 520, cz: -200, bad: -1 }; this.mk(best.cx, best.cz); this.bad = best.bad;
    const st = this.at(0, 0); this.start = { x: st.x, z: st.z, h: st.h }; this.total = THEME.laps * this.L;
  }
  mk(cx, cz) { const T = THEME.track; const pts = []; for (let k = 0; k < 20; k++) { const a = Math.PI + k / 20 * Math.PI * 2; pts.push(new THREE.Vector3(cx + Math.cos(a) * T.rx + Math.sin(a * 3) * T.wig, 0, cz + Math.sin(a) * T.rz)); }
    const c = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); this.L = c.getLength(); const N = Math.round(this.L / 3), P = c.getSpacedPoints(N); this.N = N; this.px = P.map(p => p.x); this.pz = P.map(p => p.z); this.ds = this.L / N; this.cx = cx; this.cz = cz; }
  at(s, lat = 0) { const L = this.L; s = ((s % L) + L) % L; const f = s / this.ds, i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f); const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t; const h = Math.atan2(this.px[j] - this.px[i], this.pz[j] - this.pz[i]); return { x: x - Math.cos(h) * lat, z: z + Math.sin(h) * lat, h }; }
  locate(x, z, hint) { let best = 0, bd = 1e18; const a = hint == null ? 0 : hint - 25, b = hint == null ? this.N : hint + 25; for (let k = a; k < b; k++) { const i = ((k % this.N) + this.N) % this.N; const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return { i: best, s: best * this.ds, d: Math.sqrt(bd) }; }
  build() {
    const g = this.root, L = this.L, E = THEME.neon ? 1.1 : 0.45;
    const gold = new THREE.MeshStandardMaterial({ color: THEME.gold, metalness: 0.8, roughness: 0.25, emissive: THEME.gold, emissiveIntensity: E });
    const teal = new THREE.MeshStandardMaterial({ color: THEME.boost, metalness: 0.5, roughness: 0.3, emissive: THEME.boost, emissiveIntensity: E + 0.4 });
    // ordem ao longo da volta: anel ouro, moedas, turbo, rampa...
    this.items = []; const n = 14; for (let k = 0; k < n; k++) { const s = (k + 0.6) / n * L; const kind = k % 7 === 3 ? 'ramp' : k % 2 ? 'boost' : 'gold'; const lat = kind === 'ramp' ? 0 : [-3, 3, 0][k % 3]; const p = this.at(s, lat); this.items.push({ kind, s, x: p.x, z: p.z, h: p.h }); }
    const d = new THREE.Object3D(); const mkRings = (kind, mat, R) => { const list = this.items.filter(i => i.kind === kind); const m = new THREE.InstancedMesh(new THREE.TorusGeometry(R, 0.32, 8, 28), mat, list.length); list.forEach((it, k) => { d.position.set(it.x, WATER_Y + R - 0.3, it.z); d.rotation.set(0, it.h, 0); d.scale.setScalar(1); d.updateMatrix(); m.setMatrixAt(k, d.matrix); }); m.name = 'jet-' + kind; g.add(m); return m; };
    this.goldM = mkRings('gold', gold, 3.6); this.boostM = mkRings('boost', teal, 3.2);
    // rampas de onda: cunha branca com listras (flutua)
    const ramps = this.items.filter(i => i.kind === 'ramp'); const rg = new THREE.BoxGeometry(5.5, 0.5, 4).translate(0, 0.25, 0); rg.rotateX(-0.22);
    this.rampM = new THREE.InstancedMesh(rg, new THREE.MeshStandardMaterial({ color: 0xf4fbff, roughness: 0.5, emissive: THEME.boost, emissiveIntensity: THEME.neon ? 0.5 : 0.08 }), ramps.length);
    ramps.forEach((it, k) => { d.position.set(it.x, WATER_Y - 0.1, it.z); d.rotation.set(0, it.h, 0); d.updateMatrix(); this.rampM.setMatrixAt(k, d.matrix); }); g.add(this.rampM);
    // moedas: 2 entre itens, aparecem só na corrida
    this.coinPos = []; for (let k = 0; k < this.items.length; k++) { const s0 = this.items[k].s, s1 = (this.items[(k + 1) % n].s) + (k === n - 1 ? L : 0); for (let j = 1; j <= 2; j++) { const p = this.at(s0 + (s1 - s0) * j / 3, [-2.5, 2.5][(k + j) % 2]); this.coinPos.push({ x: p.x, z: p.z }); } }
    this.coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.75, 0.75, 0.16, 14).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.9, roughness: 0.2, emissive: 0xffb000, emissiveIntensity: 0.5 }), this.coinPos.length);
    this.coins.visible = false; this.coins.frustumCulled = false; g.add(this.coins);
    this.hot = new THREE.Mesh(new THREE.TorusGeometry(4.0, 0.16, 6, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85, depthWrite: false })); this.hot.visible = false; g.add(this.hot);
    // largada: boia-portal turquesa com placa + píer de aluguel
    const S = this.start, arch = new THREE.Group();
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 7, 10), teal); p.position.set(s * 9, 3.5, 0); arch.add(p); const b = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 8), gold); b.position.set(s * 9, 0.2, 0); arch.add(b); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(19, 0.6, 0.5), teal); top.position.y = 7; arch.add(top);
    const sign = canvasTex(512, 96, (c, w, h) => { c.fillStyle = THEME.sign; c.fillRect(0, 0, w, h); c.font = 'bold 46px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#2ee6d6'; c.shadowBlur = 14; c.fillStyle = '#f4fffd'; c.fillText('🌊 ' + THEME.name.toUpperCase(), w / 2, h / 2 + 3); }, { clamp: true });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(13, 2.4), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, side: THREE.DoubleSide })); sm.position.y = 8.6; arch.add(sm);
    arch.position.set(S.x, WATER_Y, S.z); arch.rotation.y = S.h; g.add(arch); this.arch = arch;
    const pier = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 22), new THREE.MeshStandardMaterial({ color: 0xb08a5a, roughness: 0.8 })); const pp = this.at(-18, 0); pier.position.set(pp.x - Math.cos(pp.h) * 12, WATER_Y + 0.35, pp.z + Math.sin(pp.h) * 12); pier.rotation.y = pp.h; g.add(pier);
  }
  near() { const p = this.G.player; return Math.hypot(p.x - this.start.x, p.z - this.start.z); }
  busy() { const G = this.G; return !!((G.boatRace && G.boatRace.race) || (G.mar && G.mar.race) || (G.race && G.race.active) || (G.street && G.street.race)); }
  canAccept() { const v = this.G.player.vehicle; return !!(v && v.type === 'jetski' && !this.race && !this.busy() && this.near() < 70); }
  accept() {
    const G = this.G; if (!this.canAccept()) { G.ui.toast('🌊 Suba num jet ski (píer de aluguel ao lado do portal turquesa) e chegue perto da largada', 2600); return false; }
    const v = G.player.vehicle, st = this.at(0, 0); v.place(st.x, st.z, st.h); v.vf = v.vx = v.vz = 0; v.jy = v.jvy = 0; G.player.x = v.x; G.player.z = v.z; G.camYaw = st.h; G.snapCam && G.snapCam();
    const lats = [-5, 5, 0], backs = [0, -8, -14];
    const ais = THEME.racers.map((r, k) => { const b = new Vehicle('jetski', G.scene, G.Q, r.col); const p = this.at(backs[k], lats[k]); b.place(p.x, p.z, p.h); Object.assign(b, { npc: true, noEnter: true, ghost: true, racer: r.name, s: backs[k], lat: lats[k], lat0: lats[k], spd: 0 }); G.vehicles.push(b); return b; });
    this.race = { t: -3.5, beep: 4, ais, prog: 0, last: null, hint: null, lap: 1, place: 4, idx: 0, pts: 0, coins: 0, rings: 0, boosts: 0, jumps: 0, got: new Set(), chat: '', boostT: 0 };
    this.coins.visible = true; this.hot.visible = true; this.coinsShow();
    G.ui.toast(`🌊 <b>${THEME.name}</b> · ${THEME.laps} voltas · argolas ${THEME.wGold} = pontos · ${THEME.wBoost} = turbo · rampas = salto!`, 3400); this.hud(true); return true;
  }
  coinsShow() { const R = this.race, d = new THREE.Object3D(), t = this.G.t || 0; this.coinPos.forEach((c, k) => { d.position.set(c.x, WATER_Y + 1.1, c.z); d.rotation.set(0, t * 3 + k, 0); d.scale.setScalar(R && R.got.has(k) ? 0 : 1); d.updateMatrix(); this.coins.setMatrixAt(k, d.matrix); }); this.coins.instanceMatrix.needsUpdate = true; }
  say(force) { const R = this.race; if (!R) return; const n = THEME.racers.map(r => r.name); const i = Math.floor(Math.random() * n.length), j = (i + 1) % n.length; R.chat = THEME.chat[Math.floor(Math.random() * THEME.chat.length)].replace('{a}', n[i]).replace('{b}', n[j]); this.chatT = 7 + Math.random() * 4; this.hud(true); }
  position() { const R = this.race; let k = 1; for (const a of R.ais) if (a.s > R.prog) k++; return k; }
  splash(v, n, up) { const B = this.G.breaks; if (B && B.splash) B.splash(v.x, WATER_Y, v.z, v.vx * (up ? 0.2 : -0.15), v.vz * (up ? 0.2 : -0.15), n); }
  end(fin, why) {
    const G = this.G, R = this.race; if (!R) return; this.race = null; G.route = null; this.coins.visible = false; this.hot.visible = false;
    for (const a of R.ais) { const i = G.vehicles.indexOf(a); if (i >= 0) G.vehicles.splice(i, 1); a.dispose(G.scene); }
    if (fin) { const pl = R.place, prize = (THEME.prize[pl - 1] || THEME.part) + Math.round(R.pts / 5); G.addMoney && G.addMoney(prize); if (pl === 1) this.wins++;
      this.last = { place: pl, prize, t: R.t, pts: R.pts, coins: R.coins, rings: R.rings, boosts: R.boosts, jumps: R.jumps }; if (!this.best || R.t < this.best) this.best = R.t;
      const tm = `${Math.floor(R.t / 60)}:${String(Math.floor(R.t % 60)).padStart(2, '0')}`;
      G.ui.big(pl === 1 ? 'REI DA MAROLA!' : pl + 'º LUGAR'); G.ui.toast(`🌊 <b>${THEME.name}</b> · ${pl}º lugar · ${R.pts} pontos · tempo ${tm}<br>prêmio <b>$${prize}</b> (colocação + pontos)${R.coins ? ` · 🪙 +$${R.coins * THEME.coin}` : ''}`, 5200); G.audio.chime && G.audio.chime('win'); }
    else if (why) G.ui.toast(why, 2600);
    this.hud(true);
  }
  update(dt, t) {
    const G = this.G; const pv0 = G.player.vehicle;
    // borrifo atrás de qualquer jet ski andando (o do jogador)
    if (pv0 && pv0.type === 'jetski') { const sp = Math.hypot(pv0.vx, pv0.vz); this.splT -= dt; if (sp > 5 && this.splT <= 0 && !(pv0.jy > 0.2)) { this.splT = 0.09; this.splash(pv0, Math.min(6, 1 + sp * 0.18)); } if (pv0._landed) { pv0._landed = false; this.splash(pv0, 14, true); G.audio.splash && G.audio.splash(10); } }
    this.promptT -= dt; if (this.promptT <= 0) { this.promptT = 0.4; const tip = $('jetTip'); if (this.near() > 140) this.declined = false; const show = this.canAccept() && !this.declined;
      if (show) { const h = `🌊 <b>${THEME.name}</b> · ${THEME.laps} voltas · 3 pilotos de jet ski<br><small>prêmios $${THEME.prize[0]} · $${THEME.prize[1]} · $${THEME.prize[2]} + pontos · argolas, turbo, moedas e saltos · ~2 min</small><div class="stAsk"><button data-k="ok">🏁 Aceitar</button><button data-k="no">✖ Recusar</button></div>`; if (tip._h !== h) { tip.innerHTML = h; tip._h = h; } if (tip.hidden) tip.hidden = false; } else if (!tip.hidden) { tip.hidden = true; tip._h = ''; } }
    const R = this.race; if (!R) return; const v = G.player.vehicle;
    if (!v || v.type !== 'jetski') { this.end(false, '🌊 Você saiu do jet ski — corrida cancelada'); return; }
    R.t += dt;
    if (R.t < 0) { const k = Math.ceil(-R.t); if (k < R.beep && k <= 3) { R.beep = k; G.ui.big(String(k)); G.audio.chime && G.audio.chime('ok'); } const st = this.at(0, 0); v.x = st.x; v.z = st.z; v.h = st.h; v.vx = v.vz = v.vf = 0; v.sync(0); for (const a of R.ais) a.sync(dt); this.hud(); return; }
    if (R.beep > 0) { R.beep = 0; G.ui.big('VAI!'); G.audio.chime && G.audio.chime('win'); this.say(); }
    const loc = this.locate(v.x, v.z, R.hint); R.hint = loc.i; const s = loc.s;
    if (R.last != null && loc.d < 60) { let d = s - R.last; if (d > this.L / 2) d -= this.L; if (d < -this.L / 2) d += this.L; if (Math.abs(d) < 40) R.prog += d; }
    R.last = s; R.off = loc.d > 60 ? (R.off || 0) + dt : 0; if (R.off > 12) { this.end(false, '🌊 Muito longe do circuito — corrida cancelada'); return; }
    // itens na ordem da volta
    const n = this.items.length, it = this.items[R.idx % n], itS = Math.floor(R.idx / n) * this.L + it.s;
    if (R.prog >= itS - 8 && !R.itDone) { const dd = Math.hypot(v.x - it.x, v.z - it.z); let hit = false; // t434: janela de aproximação (vale com FPS baixo)
      if (it.kind === 'gold' && dd < 4.6) { hit = true; R.rings++; R.pts += THEME.ringPts; G.audio.chime && G.audio.chime('coin'); G.powers && G.powers.ring && G.powers.ring(it.x, WATER_Y + 0.05, it.z, THEME.gold, 5, 0.5); }
      if (it.kind === 'boost' && dd < 4.2) { hit = true; R.boosts++; R.boostT = 1.6; G.audio.chime && G.audio.chime('ok'); this.splash(v, 12, true); G.powers && G.powers.ring && G.powers.ring(it.x, WATER_Y + 0.05, it.z, THEME.boost, 6, 0.5); }
      if (it.kind === 'ramp' && dd < 4.5 && Math.abs(v.vf) > 8) { hit = true; R.jumps++; R.pts += THEME.jumpPts; v.jvy = 4 + Math.min(6, Math.abs(v.vf) * 0.2); v.jy = 0.05; this.splash(v, 16, true); }
      if (hit) R.itDone = true; }
    if (R.prog >= itS + 3) { R.idx++; R.itDone = false; }
    if (R.boostT > 0) { R.boostT -= dt; const mx = v.spec.max * 1.4; if (v.vf < mx) { v.vf = Math.min(mx, v.vf + 22 * dt); const [fx, fz] = v.fwd(); const sp = Math.hypot(v.vx, v.vz); if (sp < mx) { v.vx += fx * 22 * dt; v.vz += fz * 22 * dt; } } }
    { const nx = this.items[R.idx % n]; this.hot.visible = nx.kind !== 'ramp'; this.hot.position.set(nx.x, WATER_Y + (nx.kind === 'gold' ? 3.3 : 2.9), nx.z); this.hot.rotation.set(0, nx.h, 0); this.hot.scale.setScalar(1 + Math.sin(t * 6) * 0.06); }
    // moedas (renovam a cada volta)
    const lapK = Math.floor(R.prog / this.L); if (lapK !== R.coinLap) { R.coinLap = lapK; R.got = new Set(); }
    this.coinPos.forEach((c, k) => { if (!R.got.has(k) && Math.hypot(v.x - c.x, v.z - c.z) < 3.2) { R.got.add(k); R.coins++; R.pts += THEME.coinPts; G.addMoney && G.addMoney(THEME.coin); G.audio.chime && G.audio.chime('coin'); } });
    this.coinsShow();
    // IA com elástico; salta nas rampas
    const me = R.prog, pv = Math.max(0, v.vf || Math.hypot(v.vx, v.vz)), SPD = v.spec.max * 0.82;
    R.ais.forEach((a, k) => { const gap = a.s - me; let want = (SPD + k * 0.5) * (gap > 90 ? 0.6 : gap > 35 ? 0.85 : gap > 10 ? 0.97 : gap < -90 ? 1.35 : gap < -30 ? 1.12 : 1.02);
      if (gap > 110) want = Math.min(want, Math.max(4, pv * 0.8)); if (a.s >= this.total) want = 5;
      a.spd += clamp(want - a.spd, -9 * dt, 8 * dt); a.s += a.spd * dt;
      let lat = a.lat0; if (Math.abs((a.s % this.L) - (me % this.L)) < 10 && Math.hypot(a.x - v.x, a.z - v.z) < 7) lat += a.lat > 0 ? 3 : -3; a.lat += (lat - a.lat) * Math.min(1, dt * 1.5);
      for (const r of this.items) if (r.kind === 'ramp' && Math.abs(((a.s - r.s) % this.L + this.L) % this.L) < a.spd * dt + 0.01 && !(a.jy > 0)) { a.jvy = 6; a.jy = 0.05; }
      const p = this.at(a.s, a.lat); const dh = angDiff(a.h, p.h); a.x = p.x; a.z = p.z; a.h += dh * Math.min(1, dt * 5); a.vx = Math.sin(a.h) * a.spd; a.vz = Math.cos(a.h) * a.spd; a.vf = a.spd; a.steer = clamp(dh * 3, -1, 1); a.sync(dt); });
    G.route = [[v.x, v.z], ...[40, 100, 160, 220].map(o => { const q = this.at(me + o, 0); return [q.x, q.z]; })];
    R.place = this.position(); const lap = Math.min(THEME.laps, 1 + Math.floor(Math.max(0, me) / this.L)); if (lap !== R.lap) { R.lap = lap; G.ui.big('ÚLTIMA VOLTA'); }
    this.chatT -= dt; if (this.chatT <= 0) this.say();
    if (me >= this.total - 3) { this.end(true); return; }
    this.hud();
  }
  hud(force) {
    const el = $('jetHud'); if (!el) return; const R = this.race; if (!R) { if (!el.hidden) el.hidden = true; return; }
    const pc = Math.floor(clamp(R.prog / this.total, 0, 1) * 100), tt = Math.max(0, R.t), tm = `${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}`;
    const h = `<b>🌊 ${THEME.name}</b> volta ${Math.max(1, R.lap)}/${THEME.laps} · <span class="pos">${R.place}º/4</span> · ⏱ ${tm} · ⭐ ${R.pts}${R.boostT > 0 ? ' · <span class="turbo">⚡ TURBO</span>' : ''}<i class="pbar"><i style="width:${pc}%"></i></i>${R.chat ? `<small class="chat">📻 ${R.chat}</small>` : ''}`;
    if (force || h !== el._h) { el.innerHTML = h; el._h = h; } if (el.hidden) el.hidden = false;
  }
}
