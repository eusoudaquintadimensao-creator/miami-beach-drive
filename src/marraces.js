// Corridas no mar aberto (t391): 3 circuitos a ~1 km da praia, marcados no mapa/minimapa e visíveis da areia (farol dourado).
// Chegue de barco perto da largada e aceite: 5 pilotos com lanchas tunadas (papo de rádio leve e engraçado), anéis dourados
// gigantes como checkpoints, moedas no caminho, ~3 min, HUD com %, km restantes e posição; prêmios em dólar ($500/$250/$100).
import * as THREE from 'three';
import { clamp, angDiff, canvasTex } from './util.js';
import { WATER_Y, HOOKS, boatable } from './world.js';
import { Vehicle } from './vehicles.js';
import { tuneBoat } from './boatrace.js';
const $ = (id) => document.getElementById(id);

// ---- THEME (Neon Distrito troca este bloco)
const THEME = {
  gold: 0xffc93c, beam: 0xffe08a, neon: false,
  races: [
    { id: 'recife', name: 'Circuito Recife Dourado', cx: 1585, cz: -800, rx: 140, rz: 380, laps: 3, wig: 22 },
    { id: 'farol', name: 'Regata do Farol Solar', cx: 1600, cz: 0, rx: 125, rz: 360, laps: 3, wig: 18 },
    { id: 'mare', name: 'Copa Maré Alta', cx: 1585, cz: 800, rx: 140, rz: 390, laps: 3, wig: 18 },
  ],
  racers: [
    { name: 'Capitão Bolacha', col: 0xff4f6d, glow: 0xffd23f }, { name: 'Dona Maresia', col: 0x2ab3b8, glow: 0xffffff }, { name: 'Tico Turbo', col: 0xffd23f, glow: 0xff4fb8 },
    { name: 'Jana Jacaré', col: 0x46c08c, glow: 0x29f0ff }, { name: 'Beto Boia', col: 0x7d6cf0, glow: 0xff8a3c },
  ],
  chat: [
    '{a}: Bora, galera! Hoje o mar tá pra peixe… e pra lancha! 🚤', '{a}: Esqueci o protetor solar, mas o turbo eu trouxe 😎', '{a}: Ei {b}, essa onda aí era minha!',
    '{a}: Se eu cair, finge que foi mergulho planejado 🤿', '{a}: Olha o anel dourado! Brilha mais que meu futuro ✨', '{a}: Peguei moeda! O açaí hoje é por minha conta 🍧',
    '{a}: Calma, {b}, é só uma corridinha amistosa… que eu vou ganhar 😏', '{a}: Gaivota no retrovisor! Ah não, é o {b} 🐦', '{a}: Quem chegar por último paga a água de coco! 🥥',
    '{a}: Cabelo arrumado? Nunca mais. Vento bom demais! 💨', '{a}: {b}, sua lancha tem freio de mão? Porque tá parecendo 😂', '{a}: Respira, rema… opa, isso é lancha, só acelera!',
    '{a}: Golfinho me ultrapassou ali atrás, juro 🐬', '{a}: Hoje eu sou o rei da marola! 👑',
  ],
  last: '{a}: Última volta! Segura o chapéu! 🎩', prize: [500, 250, 100], part: 30, coin: 5,
};
// ---- fim THEME

export const MAR_RACES = THEME.races;
const SPD = 34; // velocidade média da IA (m/s) → ~3 min nas 3 voltas

class SeaRace {
  constructor(G, cfg, root) {
    this.G = G; this.cfg = cfg;
    const pts = []; for (let k = 0; k < 24; k++) { const a = Math.PI + k / 24 * Math.PI * 2; pts.push(new THREE.Vector3(cfg.cx + Math.cos(a) * cfg.rx + Math.sin(a * 3) * cfg.wig, 0, cfg.cz + Math.sin(a) * cfg.rz)); }
    const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal'); this.L = curve.getLength();
    const N = Math.round(this.L / 4), P = curve.getSpacedPoints(N); this.N = N; this.px = P.map(p => p.x); this.pz = P.map(p => p.z); this.ds = this.L / N;
    this.bad = 0; for (let i = 0; i < N; i++) if (!boatable(this.px[i], this.pz[i])) this.bad++;
    const st = this.at(0, 0); this.start = { x: st.x, z: st.z, h: st.h };
    this.total = cfg.laps * this.L; this.ringS = []; const nr = 10; for (let k = 0; k < nr; k++) this.ringS.push((k + 0.5) / nr * this.L);
    this.build(root);
  }
  at(s, lat = 0) { const L = this.L; s = ((s % L) + L) % L; const f = s / this.ds, i = Math.floor(f) % this.N, j = (i + 1) % this.N, t = f - Math.floor(f); const x = this.px[i] + (this.px[j] - this.px[i]) * t, z = this.pz[i] + (this.pz[j] - this.pz[i]) * t; const h = Math.atan2(this.px[j] - this.px[i], this.pz[j] - this.pz[i]); return { x: x - Math.cos(h) * lat, z: z + Math.sin(h) * lat, h }; }
  locate(x, z, hint) { let best = 0, bd = 1e18; const a = hint == null ? 0 : hint - 20, b = hint == null ? this.N : hint + 20; for (let k = a; k < b; k++) { const i = ((k % this.N) + this.N) % this.N; const d = (this.px[i] - x) ** 2 + (this.pz[i] - z) ** 2; if (d < bd) { bd = d; best = i; } } return { i: best, s: best * this.ds, d: Math.sqrt(bd) }; }
  build(root) {
    const g = new THREE.Group(); g.name = 'mar-' + this.cfg.id; root.add(g); this.group = g;
    const gold = new THREE.MeshStandardMaterial({ color: THEME.gold, metalness: 0.85, roughness: 0.25, emissive: THEME.gold, emissiveIntensity: THEME.neon ? 0.9 : 0.35 });
    // anéis dourados gigantes (um InstancedMesh por circuito)
    this.rings = new THREE.InstancedMesh(new THREE.TorusGeometry(9, 0.7, 8, 32), gold, this.ringS.length); this.rings.name = 'marAneis';
    const d = new THREE.Object3D(); this.ringPos = this.ringS.map((s, k) => { const p = this.at(s, 0); d.position.set(p.x, WATER_Y + 6.5, p.z); d.rotation.set(0, p.h, 0); d.updateMatrix(); this.rings.setMatrixAt(k, d.matrix); return p; });
    g.add(this.rings);
    // anel do próximo checkpoint (pulsa)
    this.hot = new THREE.Mesh(new THREE.TorusGeometry(9.6, 0.35, 6, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false, transparent: true, opacity: 0.85, depthWrite: false })); this.hot.visible = false; g.add(this.hot);
    // moedas (só durante a corrida): 3 entre cada par de anéis
    this.coinPos = []; for (let k = 0; k < this.ringS.length; k++) { const s0 = this.ringS[k], s1 = this.ringS[(k + 1) % this.ringS.length] + (k === this.ringS.length - 1 ? this.L : 0); for (let j = 1; j <= 3; j++) { const s = s0 + (s1 - s0) * j / 4, p = this.at(s, [-4.5, 0, 4.5][(k + j) % 3]); this.coinPos.push({ x: p.x, z: p.z, s }); } }
    this.coins = new THREE.InstancedMesh(new THREE.CylinderGeometry(1.1, 1.1, 0.22, 16).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xffd23f, metalness: 0.9, roughness: 0.2, emissive: 0xffb000, emissiveIntensity: 0.5 }), this.coinPos.length);
    this.coins.name = 'marMoedas'; this.coins.visible = false; this.coins.frustumCulled = false; g.add(this.coins);
    // largada: pórtico dourado com placa + farol de luz alto (visível da praia, ignora a névoa)
    const S = this.start, arch = new THREE.Group();
    for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.6, 12, 10), gold); p.position.set(s * 15, 6, 0); arch.add(p); }
    const top = new THREE.Mesh(new THREE.BoxGeometry(31, 1, 0.8), gold); top.position.y = 12; arch.add(top);
    const sign = canvasTex(640, 110, (c, w, h) => { c.fillStyle = THEME.neon ? '#140a2a' : '#0d2238'; c.fillRect(0, 0, w, h); c.font = 'bold 54px sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ffc93c'; c.shadowBlur = 16; c.fillStyle = '#fff6d8'; c.fillText('🏆 ' + this.cfg.name.toUpperCase(), w / 2, h / 2 + 3); }, { clamp: true });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(22, 3.8), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false, side: THREE.DoubleSide })); sm.position.y = 14.6; arch.add(sm);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 2.4, 90, 10, 1, true), new THREE.MeshBasicMaterial({ color: THEME.beam, transparent: true, opacity: 0.38, fog: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    beam.position.set(0, 45 + 12, 0); arch.add(beam); this.beam = beam;
    const buoy = new THREE.Mesh(new THREE.SphereGeometry(2.2, 12, 8), new THREE.MeshBasicMaterial({ color: THEME.gold, fog: false, toneMapped: false })); buoy.position.set(0, 104, 0); arch.add(buoy);
    arch.position.set(S.x, WATER_Y, S.z); arch.rotation.y = S.h; g.add(arch); this.arch = arch;
  }
  near() { const p = this.G.player; return Math.hypot(p.x - this.start.x, p.z - this.start.z); }
}

export class SeaRaces {
  constructor(G) {
    this.G = G; this.race = null; this.declined = false; this.promptT = 0; this.chatT = 0; this.wins = 0; this.last = null;
    this.root = new THREE.Group(); this.root.name = 'corridasMar'; G.scene.add(this.root);
    this.list = THEME.races.map(c => new SeaRace(G, c, this.root));
    HOOKS.map.push((g, X, Z) => { for (const r of this.list) { g.strokeStyle = 'rgba(255,201,60,.9)'; g.setLineDash([7, 5]); g.lineWidth = 2.5; g.beginPath(); for (let i = 0; i <= r.N; i += 2) { const k = i % r.N; (i ? g.lineTo : g.moveTo).call(g, X(r.px[k]), Z(r.pz[k])); } g.closePath(); g.stroke(); g.setLineDash([]);
      g.font = '16px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000c'; g.beginPath(); g.arc(X(r.start.x), Z(r.start.z), 11, 0, 7); g.fill(); g.fillText('🏆', X(r.start.x), Z(r.start.z) + 1); } });
    for (const [id, cls] of [['marTip', 'boatTipLike'], ['marHud', 'boatHudLike']]) { if (!$(id)) { const el = document.createElement('div'); el.id = id; el.hidden = true; ($('hud') || document.body).appendChild(el); } }
    const tip = $('marTip'); tip.addEventListener('pointerdown', e => e.stopPropagation()); tip.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.k === 'ok') this.accept(); else { this.declined = true; tip.hidden = true; tip._h = ''; } });
  }
  nearest() { let best = null, bd = 1e9; for (const r of this.list) { const d = r.near(); if (d < bd) { bd = d; best = r; } } return { r: best, d: bd }; }
  busy() { const G = this.G; return !!((G.boatRace && G.boatRace.race) || (G.race && G.race.active) || (G.street && G.street.race)); }
  canAccept() { const v = this.G.player.vehicle; return !!(v && v.spec.boat && !this.race && !this.busy() && this.nearest().d < 60); }
  accept() {
    const G = this.G; if (!this.canAccept()) { G.ui.toast('🏆 Chegue de barco perto do pórtico dourado da largada (até 60 m)', 2200); return false; }
    const C = this.nearest().r, v = G.player.vehicle; const st = C.at(0, 0); v.place(st.x, st.z, st.h); v.vf = v.vx = v.vz = 0; G.player.x = v.x; G.player.z = v.z; G.camYaw = st.h; G.snapCam && G.snapCam();
    const lats = [-8, 8, -4, 4, 0], backs = [0, 0, -12, -12, -24];
    const ais = THEME.racers.map((r, k) => { const b = tuneBoat(new Vehicle('boat', G.scene, G.Q, r.col), r.col, r.glow, r.name); const p = C.at(backs[k], lats[k]); b.place(p.x, p.z, p.h); Object.assign(b, { npc: true, noEnter: true, ghost: true, racer: r.name, s: backs[k], lat: lats[k], lat0: lats[k], spd: 0 }); G.vehicles.push(b); return b; });
    this.race = { C, t: -3.5, beep: 4, ais, prog: 0, last: null, hint: null, lap: 1, place: 6, ring: 0, rings: 0, coins: 0, got: new Set(), chat: '', lastLap: false };
    C.coins.visible = true; C.hot.visible = true; this.coinsShow(C, this.race.got);
    this.say(0); G.ui.toast(`🏆 <b>${C.cfg.name}</b> · ${C.cfg.laps} voltas · 6 barcos · passe pelos anéis dourados e pegue as moedas!`, 3200); this.hud(true); return true;
  }
  coinsShow(C, got) { const d = new THREE.Object3D(); C.coinPos.forEach((c, k) => { d.position.set(c.x, WATER_Y + 1.6, c.z); d.rotation.set(0, (this.G.t || 0) * 3 + k, 0); d.scale.setScalar(got.has(k) ? 0 : 1); d.updateMatrix(); C.coins.setMatrixAt(k, d.matrix); }); C.coins.instanceMatrix.needsUpdate = true; }
  say(force) { const R = this.race; if (!R) return; const n = THEME.racers.map(r => r.name); const i = Math.floor(Math.random() * n.length); let j = (i + 1 + Math.floor(Math.random() * (n.length - 1))) % n.length;
    const line = (force === 'last' ? THEME.last : THEME.chat[Math.floor(Math.random() * THEME.chat.length)]).replace('{a}', n[i]).replace('{b}', n[j]); R.chat = line; this.chatT = 8 + Math.random() * 4; this.hud(true); }
  position() { const R = this.race; if (!R) return 1; let k = 1; for (const a of R.ais) if (a.s > R.prog) k++; return k; }
  end(fin, why) {
    const G = this.G, R = this.race; if (!R) return; this.race = null; G.route = null; R.C.coins.visible = false; R.C.hot.visible = false;
    for (const a of R.ais) { const i = G.vehicles.indexOf(a); if (i >= 0) G.vehicles.splice(i, 1); a.dispose(G.scene); }
    if (fin) { const pl = R.place; const prize = THEME.prize[pl - 1] || THEME.part; G.addMoney && G.addMoney(prize); this.last = { place: pl, prize, t: R.t, coins: R.coins, rings: R.rings, name: R.C.cfg.name }; if (pl === 1) this.wins++;
      G.ui.big(pl === 1 ? 'CAMPEÃO DO MAR!' : pl + 'º LUGAR'); G.ui.toast(`🏆 <b>${R.C.cfg.name}</b> · ${pl}º lugar · prêmio <b>$${prize}</b>${R.coins ? ` + 🪙 $${R.coins * THEME.coin}` : ''} · tempo ${Math.floor(R.t / 60)}:${String(Math.floor(R.t % 60)).padStart(2, '0')}<br><small>Use o dinheiro na Mega Garagem 🏎️</small>`, 5000); }
    else if (why) G.ui.toast(why, 2600);
    this.hud(true);
  }
  update(dt, t) {
    const G = this.G; const night = G.env ? G.env.night : 0;
    for (const r of this.list) { r.beam.material.opacity = 0.28 + night * 0.4 + Math.sin(t * 2) * 0.04; }
    this.promptT -= dt; if (this.promptT <= 0) { this.promptT = 0.4; const tip = $('marTip'); const nr = this.nearest(); if (nr.d > 120) this.declined = false; const show = this.canAccept() && !this.declined;
      if (show) { const c = nr.r.cfg; const h = `🏆 <b>${c.name}</b> · ${c.laps} voltas · 5 pilotos tunados<br><small>prêmios $${THEME.prize[0]} · $${THEME.prize[1]} · $${THEME.prize[2]} · anéis dourados e moedas · ~3 min</small><div class="stAsk"><button data-k="ok">🏁 Aceitar</button><button data-k="no">✖ Recusar</button></div>`; if (tip._h !== h) { tip.innerHTML = h; tip._h = h; } if (tip.hidden) tip.hidden = false; } else if (!tip.hidden) { tip.hidden = true; tip._h = ''; } }
    const R = this.race; if (!R) return; const v = G.player.vehicle, C = R.C;
    if (!v || !v.spec.boat) { this.end(false, '🏆 Você saiu do barco — corrida cancelada'); return; }
    R.t += dt;
    if (R.t < 0) { const k = Math.ceil(-R.t); if (k < R.beep && k <= 3) { R.beep = k; G.ui.big(String(k)); G.audio.chime && G.audio.chime('ok'); } const st = C.at(0, 0); v.x = st.x; v.z = st.z; v.h = st.h; v.vx = v.vz = v.vf = 0; v.sync(0); for (const a of R.ais) a.sync(dt); this.hud(); return; }
    if (R.beep > 0) { R.beep = 0; G.ui.big('VAI!'); G.audio.chime && G.audio.chime('win'); }
    const loc = C.locate(v.x, v.z, R.hint); R.hint = loc.i; const s = loc.s;
    if (R.last != null && loc.d < 70) { let d = s - R.last; if (d > C.L / 2) d -= C.L; if (d < -C.L / 2) d += C.L; if (Math.abs(d) < 45) R.prog += d; }
    R.last = s; R.off = loc.d > 70 ? (R.off || 0) + dt : 0; if (R.off > 12) { this.end(false, '🏆 Muito longe do circuito — corrida cancelada'); return; }
    // anéis: o próximo anel conta quando o progresso passa por ele (perto do centro ganha bônus)
    const nextS = Math.floor(R.ring / C.ringS.length) * C.L + C.ringS[R.ring % C.ringS.length];
    if (R.prog >= nextS) { const rp = C.ringPos[R.ring % C.ringS.length]; if (Math.hypot(v.x - rp.x, v.z - rp.z) < 13) { R.rings++; G.audio.chime && G.audio.chime('coin'); } R.ring++; }
    { const rp = C.ringPos[R.ring % C.ringS.length]; C.hot.position.set(rp.x, WATER_Y + 6.5, rp.z); C.hot.rotation.set(0, rp.h, 0); C.hot.scale.setScalar(1 + Math.sin(t * 6) * 0.05); }
    // moedas
    const lapK = Math.floor(R.prog / C.L); if (lapK !== R.coinLap) { R.coinLap = lapK; R.got = new Set(); }
    C.coinPos.forEach((c, k) => { if (!R.got.has(k) && Math.hypot(v.x - c.x, v.z - c.z) < 4.8) { R.got.add(k); R.coins++; G.addMoney && G.addMoney(THEME.coin); G.audio.chime && G.audio.chime('coin'); } });
    this.coinsShow(C, R.got);
    // IA com elástico (sempre por perto), desvia do jogador
    const me = R.prog, pv = Math.max(0, v.vf || Math.hypot(v.vx, v.vz));
    R.ais.forEach((a, k) => { const gap = a.s - me; let want = (SPD + k * 0.7) * (gap > 140 ? 0.62 : gap > 60 ? 0.86 : gap > 18 ? 0.97 : gap < -140 ? 1.35 : gap < -45 ? 1.14 : 1.03);
      if (gap > 160) want = Math.min(want, Math.max(4, pv * 0.8)); if (a.s >= C.total) want = 6;
      a.spd += clamp(want - a.spd, -10 * dt, 7 * dt); a.s += a.spd * dt;
      let lat = a.lat0; if (Math.abs((a.s % C.L) - (me % C.L)) < 14 && Math.hypot(a.x - v.x, a.z - v.z) < 10) lat += a.lat > 0 ? 4 : -4; a.lat += (lat - a.lat) * Math.min(1, dt * 1.5);
      const p = C.at(a.s, a.lat); const dh = angDiff(a.h, p.h); a.x = p.x; a.z = p.z; a.h += dh * Math.min(1, dt * 5); a.vx = Math.sin(a.h) * a.spd; a.vz = Math.cos(a.h) * a.spd; a.vf = a.spd; a.steer = clamp(dh * 3, -1, 1); a.sync(dt); });
    G.route = [[v.x, v.z], ...[60, 160, 260, 360].map(o => { const q = C.at(me + o, 0); return [q.x, q.z]; })];
    R.place = this.position(); const lap = Math.min(C.cfg.laps, 1 + Math.floor(Math.max(0, me) / C.L)); if (lap !== R.lap) { R.lap = lap; if (lap === C.cfg.laps) this.say('last'); }
    this.chatT -= dt; if (this.chatT <= 0) this.say();
    if (me >= C.total - 4) { this.end(true); return; }
    this.hud();
  }
  hud(force) {
    const el = $('marHud'); if (!el) return; const R = this.race; if (!R) { if (!el.hidden) el.hidden = true; return; }
    const C = R.C, pc = Math.floor(clamp(R.prog / C.total, 0, 1) * 100), km = (Math.max(0, C.total - R.prog) / 1000).toFixed(2).replace('.', ',');
    const h = `<b>🏆 ${C.cfg.name}</b> volta ${Math.max(1, R.lap)}/${C.cfg.laps} · <span class="pos">${R.place}º/6</span> · 🏁 ${pc}% · ${km} km · 🪙 ${R.coins}<i class="pbar"><i style="width:${pc}%"></i></i>${R.chat ? `<small class="chat">📻 ${R.chat}</small>` : ''}`;
    if (force || h !== el._h) { el.innerHTML = h; el._h = h; } if (el.hidden) el.hidden = false;
  }
}
