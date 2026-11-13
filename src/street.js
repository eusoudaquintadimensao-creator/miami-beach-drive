// Liga da Madrugada: rachas noturnos pelas ruas da cidade (19h–5h). Rivais esperam nos pontos de encontro;
// pisque o farol (L ou 💡) perto de um deles para desafiar. Portões neon + seta no HUD + GPS até o próximo ponto.
// Vitórias dão reputação, dinheiro, pinturas novas e níveis de nitro. Salvo em localStorage 'mbd-ruas-v1'. Sem violência.
import * as THREE from 'three';
import { clamp } from './util.js';
import { groundY, HOOKS } from './world.js';
import { Vehicle, randomTune, raceTune, NITRO } from './vehicles.js';
import { STREET } from './phrases.js';

export const STREET_KEY = 'mbd-ruas-v1';
export const ROUTES = [
  { name: 'Sprint da Orla', start: [300, 520, Math.PI], pts: [[300, -150], [300, -450], [180, -450], [180, -150], [60, -150], [60, 300]] },
  { name: 'Travessia das Pontes', start: [60, -330, Math.PI], pts: [[60, -450], [-300, -450], [-300, -150], [-420, -150], [-420, 150], [-300, 150], [-300, 450], [60, 450]] },
  { name: 'Volta do Centro', start: [-540, 560, Math.PI], pts: [[-540, -450], [-660, -450], [-660, 300], [-420, 300], [-420, 0], [-300, 0]] },
  { name: 'Coroa da Orla', start: [180, 560, Math.PI], pts: [[180, -600], [300, -600], [300, 450], [60, 450], [-300, 450], [-300, -450], [60, -450], [60, 0], [300, 0]] },
];
const LIV = (paint, accent, glow, text, style) => ({ paint, accent, glow, text, style, spoiler: 1, kit: true, rim: 0x1a1a1a, neon: glow });
export const LEAGUE = [
  { id: 'vini', name: '@vini.faisca', route: 0, type: 'sport', rep: 40, need: 0, top: 33, fem: false, liv: LIV(0xffd23f, 0x111111, 0xffd23f, 'FAÍSCA', 0) },
  { id: 'duda', name: '@duda.turbo', route: 1, type: 'sport', rep: 55, need: 0, top: 34, fem: true, liv: LIV(0xff4fb8, 0xffffff, 0xff2bd6, 'TURBO ROSA', 1), nitro: 1 },
  { id: 'leo', name: '@leo.relampago', route: 2, type: 'sedan', rep: 70, need: 20, top: 34.5, fem: false, liv: LIV(0x0a84ff, 0xffd23f, 0x29f0ff, 'RELÂMPAGO', 2) },
  { id: 'mari', name: '@mari.neon', route: 0, type: 'rc_jdm', rep: 95, need: 50, top: 36, fem: true, liv: LIV(0x1c1c1e, 0x45ff9a, 0x45ff9a, 'NEON VERDE', 1) },
  { id: 'caio', name: '@caio.vento', route: 1, type: 'rc_muscle', rep: 120, need: 80, top: 37, fem: false, liv: LIV(0xf5f5f7, 0x0a84ff, 0x29f0ff, 'VENTO NORTE', 0) },
  { id: 'rafa', name: '@rafa.cometa', route: 2, type: 'rc_gt', rep: 150, need: 110, top: 38, fem: false, liv: LIV(0xff8a00, 0x111111, 0xff6a00, 'COMETA', 2), nitro: 2 },
  { id: 'ju', name: '@ju.aurora', route: 3, type: 'rc_hyper', rep: 190, need: 150, top: 39.5, fem: true, liv: LIV(0x7d4dff, 0x29f0ff, 0xb45cff, 'AURORA BOREAL', 1) },
  { id: 'rei', name: '@rei.da.orla', route: 3, type: 'rc_hyper', rep: 260, need: 200, top: 41, fem: false, boss: true, liv: LIV(0x111111, 0xffd23f, 0xffd23f, 'REI DA ORLA', 2), nitro: 3 },
];
function segDist(x, z, a, b) { const dx = b[0] - a[0], dz = b[1] - a[1]; const L = dx * dx + dz * dz || 1; const t = clamp(((x - a[0]) * dx + (z - a[1]) * dz) / L, 0, 1); return Math.hypot(x - a[0] - dx * t, z - a[1] - dz * t); }
const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const isNight = (h) => h >= 19 || h < 5;

export class Street {
  constructor(G) {
    this.G = G; this.cars = []; this.waiting = {}; this.race = null; this.flashT = 0; this.promptT = 0;
    try { this.save = Object.assign({ rep: 0, wins: 0, races: 0, beaten: [], liveries: [], nitroLvl: 0, best: {} }, JSON.parse(localStorage.getItem(STREET_KEY) || '{}')); } catch (e) { this.save = { rep: 0, wins: 0, races: 0, beaten: [], liveries: [], nitroLvl: 0, best: {} }; }
    NITRO.lvl = this.save.nitroLvl || 0;
    // portões neon (o próximo e o seguinte) e seta flutuante
    const mk = (col, op) => { const g = new THREE.Group(); const m = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: op, toneMapped: false, depthWrite: false, fog: false });
      for (const s of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 7, 0.5), m); p.position.set(s * 8, 3.5, 0); g.add(p); }
      const top = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.6, 0.5), m); top.position.y = 7; g.add(top);
      const ar = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 4).rotateX(Math.PI), m); ar.position.y = 10.5; g.add(ar); g.userData.ar = ar; g.userData.m = m;
      g.visible = false; G.scene.add(g); return g; };
    this.gate = mk(0x29f0ff, 0.85); this.gate2 = mk(0xff2bd6, 0.35);
    HOOKS.map.push((g, X, Z) => { g.font = '15px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; for (const r of ROUTES) { g.fillStyle = '#000b'; g.beginPath(); g.arc(X(r.start[0]) + 14, Z(r.start[1]), 10, 0, 7); g.fill(); g.fillText('🏎️', X(r.start[0]) + 14, Z(r.start[1]) + 1); } });
    this.wire();
  }
  persist() { try { localStorage.setItem(STREET_KEY, JSON.stringify(this.save)); } catch (e) { } }
  wire() {
    const c = document.getElementById('stClose'); if (c) c.onclick = () => this.closeResult();
    const a = document.getElementById('stApply'); if (a) a.onclick = () => this.applyLivery();
  }
  // próximo rival de cada rota (o primeiro ainda não vencido, liberado pela reputação). Vencidos aceitam revanche.
  rivalFor(ri) {
    const list = LEAGUE.filter(r => r.route === ri); const s = this.save;
    for (const r of list) { if (r.boss && LEAGUE.some(o => !o.boss && !s.beaten.includes(o.id))) continue; if (!s.beaten.includes(r.id)) return r; }
    return list[list.length - 1].boss && !s.beaten.includes('rei') ? list[0] : list[list.length - 1];
  }
  rank() { const rows = LEAGUE.map(r => ({ name: r.name, rep: r.rep, beat: this.save.beaten.includes(r.id) })).concat([{ name: 'Você', rep: this.save.rep, me: true }]); rows.sort((a, b) => b.rep - a.rep); return { rows, pos: rows.findIndex(r => r.me) + 1 }; }
  spawnCar(r, x, z, h) {
    const G = this.G; const tune = r.type.startsWith('rc_') ? Object.assign(raceTune(r.type, LEAGUE.indexOf(r), LEAGUE.indexOf(r) + 2), { text: r.liv.text }) : Object.assign(randomTune(), r.liv);
    const v = new Vehicle(r.type, G.scene, G.Q, undefined, tune); v.npc = true; v.rival = true; v.street = r; v.racer = r.name; v.vf = 0; v.place(x, z, h); v.active = true; v.y = groundY(x, z); v.sync(0); this.cars.push(v); return v;
  }
  removeCar(v) { v.dispose(this.G.scene); this.cars = this.cars.filter(c => c !== v); }
  // rivais aparecem à noite nos pontos de encontro quando você está a menos de 380 m
  updateMeets(dt) {
    const G = this.G, p = G.player, night = isNight(G.env.hour);
    ROUTES.forEach((R, i) => {
      const w = this.waiting[i]; const d = Math.hypot(R.start[0] - p.x, R.start[1] - p.z);
      const want = night && d < 380 && !(this.race && this.race.ri === i);
      if (want && !w) { const r = this.rivalFor(i); const h = R.start[2]; const fx = Math.sin(h), fz = Math.cos(h); this.waiting[i] = { r, v: this.spawnCar(r, R.start[0] - fz * 3.4, R.start[1] + fx * 3.4, h) }; }
      else if (!want && w) { this.removeCar(w.v); delete this.waiting[i]; }
      else if (w) { w.v.brakeOn = true; w.v.vf = 0; w.v.sync(dt); }
    });
  }
  nearRival(maxD = 22) { const p = this.G.player; let best = null, bd = maxD; for (const i in this.waiting) { const w = this.waiting[i]; const d = Math.hypot(w.v.x - p.x, w.v.z - p.z); if (d < bd) { bd = d; best = { ...w, ri: +i, d }; } } return best; }
  // piscar o farol: desafia o rival mais próximo
  flash() {
    const G = this.G, p = G.player; this.flashT = 0.5; if (this.race) return false; const v = p.vehicle;
    G.audio.chime && G.audio.chime('ok');
    const n = this.nearRival(v ? 30 : 12);
    if (!n) { if (!isNight(G.env.hour)) G.ui.toast('🌙 A <b>Liga da Madrugada</b> só corre à noite (19h–5h). Procure 🏎️ no mapa.', 2600); else { const k = this.rank(); G.ui.toast(`💡 Nenhum rival por perto · Liga: <b>${k.pos}º</b> lugar · reputação <b>${this.save.rep}</b> · procure 🏎️ no mapa`, 2800); } return false; }
    const r = n.r; if (this.save.rep < r.need) { this.say(r, pick(STREET.locked)); G.ui.toast(`🔒 ${r.name} pede reputação ${r.need} (você tem ${this.save.rep})`, 2600); return false; }
    if (!v || v.spec.boat || v.type === 'heli') { this.say(r, pick(STREET.idle)); G.ui.toast('🚗 Pegue um carro e pisque o farol (L / 💡) para correr', 2400); return false; }
    if (G.race.active || G.missions.active) { G.ui.toast('Termine a missão/corrida atual antes do racha', 2200); return false; }
    this.start(n.ri, n); return true;
  }
  say(r, text) { const G = this.G; G.ui.bubbleText(r.name, text); if (G.voice) G.voice.say(text, { _voice: { v: r.fem ? 'f' : 'm', rate: 1.05 } }, { vol: 0.9 }); }
  start(ri, w) {
    const G = this.G, R = ROUTES[ri], pv = G.player.vehicle; delete this.waiting[ri];
    const path = G.rivals.buildPath({ start: R.start, pts: R.pts }); const h = R.start[2], fx = Math.sin(h), fz = Math.cos(h);
    const v = w.v; v.s = 0; v.lat = -3.4; v.vf = 0; v.done = false;
    const sx = R.start[0] + fz * 3.4, sz = R.start[1] - fx * 3.4; // jogador do outro lado
    this.race = { ri, r: w.r, v, path, k: 0, t: -3.5, sx, sz, h, cps: R.pts, beepK: 4, oldMusic: null };
    this.say(w.r, pick(STREET.challenge)); G.ui.toast(`🏁 <b>${R.name}</b> contra ${w.r.name} · siga os portões neon`, 3000);
    this.hold(pv); this.setGates(); G.setRoute(R.pts[0]); this.hud(true);
  }
  hold(pv) { const S = this.race; pv.x = S.sx; pv.z = S.sz; pv.h = S.h; pv.vx = pv.vz = pv.vf = 0; pv.y = groundY(pv.x, pv.z); const p = this.G.player; p.x = pv.x; p.z = pv.z; pv.sync(0); }
  setGates() {
    const S = this.race, cps = S.cps, put = (g, i) => { const c = cps[i]; if (!c) { g.visible = false; return; } const prev = i ? cps[i - 1] : [S.sx, S.sz]; g.position.set(c[0], groundY(c[0], c[1]), c[1]); g.rotation.y = Math.atan2(c[0] - prev[0], c[1] - prev[1]); g.visible = true; g.userData.m.color.set(i === cps.length - 1 ? 0xffd23f : g === this.gate ? 0x29f0ff : 0xff2bd6); };
    put(this.gate, S.k); put(this.gate2, S.k + 1);
  }
  playerProg() { const S = this.race, p = this.G.player; const pts = [[S.sx, S.sz], ...S.cps]; let base = 0; for (let i = 1; i <= S.k; i++) base += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); const a = pts[S.k], b = pts[S.k + 1] || a; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); return base + Math.max(0, L - Math.hypot(b[0] - p.x, b[1] - p.z)); }
  update(dt, t, cam) {
    const G = this.G; this.updateMeets(dt);
    if (this.flashT > 0) this.flashT -= dt;
    // dica quando está perto de um rival
    this.promptT -= dt; if (this.race) { const el = document.getElementById('stTip'); if (el && !el.hidden) el.hidden = true; } else if (this.promptT <= 0) { this.promptT = 0.4; const n = this.nearRival(30); const el = document.getElementById('stTip'); if (el) { if (n) { el.innerHTML = `${n.r.boss ? '👑' : '🏎️'} <b>${n.r.name}</b> · ${ROUTES[n.ri].name}<br>${G.touch ? 'toque 💡' : 'aperte <b>L</b>'} para piscar o farol${this.save.rep < n.r.need ? ` · 🔒 rep ${n.r.need}` : ''}`; el.hidden = false; } else el.hidden = true; } }
    for (const g of [this.gate, this.gate2]) if (g.visible) { g.userData.ar.position.y = 10.5 + Math.sin(t * 4) * 0.5; g.userData.ar.rotation.y = t * 2; }
    const S = this.race; if (!S) return;
    const pv = G.player.vehicle; const v = S.v;
    if (!pv) { this.end(false, 'Você saiu do carro — racha cancelado'); return; }
    S.t += dt;
    if (S.t < 0) { this.hold(pv); const k = Math.ceil(-S.t); if (k < S.beepK && k <= 3) { S.beepK = k; G.ui.big(String(k)); G.audio.chime && G.audio.chime('ok'); } v.sync(dt); this.hud(); return; }
    if (S.beepK > 0) { S.beepK = 0; G.ui.big('VAI!'); G.audio.chime && G.audio.chime('win'); }
    // checkpoints do jogador
    const c = S.cps[S.k]; const p = G.player; if (c && Math.hypot(c[0] - p.x, c[1] - p.z) < 18) { S.k++; G.audio.chime && G.audio.chime('ok'); if (S.k >= S.cps.length) { this.end(!v.done); return; } this.setGates(); G.setRoute(S.cps[S.k]); }
    if (c && segDist(p.x, p.z, S.k ? S.cps[S.k - 1] : [S.sx, S.sz], c) > 130) { this.end(false, 'Você se perdeu do trajeto — racha cancelado'); return; }
    // rival: cinemático pelo traçado suavizado, com elástico e desvio do trânsito
    if (!v.done) {
      const R = G.rivals, path = S.path, cur = R.at(path, v.s); let target = S.r.top;
      for (let j = cur.i; j < path.pts.length && path.cum[j] - v.s < 90; j++) { const vm = path.vmaxAt[j]; if (vm < 99) { const d = Math.max(0, path.cum[j] - v.s - 4); target = Math.min(target, Math.sqrt(vm * vm + 2 * 13 * d)); } }
      const gap = v.s - this.playerProg(); target *= gap > 70 ? 0.84 : gap > 30 ? 0.94 : gap < -90 ? 1.14 : gap < -30 ? 1.06 : 1;
      const fx = Math.sin(cur.h), fz = Math.cos(cur.h), rx = -fz, rz = fx; let blocked = false;
      for (const o of G.traffic.cars) { if (!o.active) continue; const dx = o.x - v.x, dz = o.z - v.z; const a = dx * fx + dz * fz, l = dx * rx + dz * rz; if (a > 0 && a < 18 && Math.abs(l - v.lat) < 2.4) { blocked = true; break; } }
      { const dx = pv.x - v.x, dz = pv.z - v.z; const a = dx * fx + dz * fz, l = dx * rx + dz * rz; if (a > 0 && a < 12 && Math.abs(l - v.lat) < 2.2) blocked = true; }
      if (blocked) { v.latT = v.lat > 0 ? -3.4 : 3.4; target = Math.min(target, 20); } v.lat += ((v.latT ?? -3.4) - v.lat) * Math.min(1, dt * 2); v.lat = clamp(v.lat, -5, 5);
      const acc = target > v.vf ? 9 : 16; v.vf += clamp(target - v.vf, -acc * dt, acc * dt); v.s += v.vf * dt;
      if (v.s >= path.len - 1) { v.done = true; S.rivalT = S.t; }
    } else v.vf = Math.max(0, v.vf - 10 * dt);
    { const c2 = G.rivals.at(S.path, v.s); const fx = Math.sin(c2.h), fz = Math.cos(c2.h); let dh = c2.h - v.h; while (dh > Math.PI) dh -= 2 * Math.PI; while (dh < -Math.PI) dh += 2 * Math.PI; v.h += dh * Math.min(1, dt * 7); v.steer = clamp(dh * 2.5, -1, 1); v.x = c2.x - fz * v.lat; v.z = c2.z + fx * v.lat; v.y = groundY(v.x, v.z); v.spin += v.vf * dt / v.spec.wr; v.vx = fx * v.vf; v.vz = fz * v.vf; v.boosting = v.vf > 30 && (Math.floor(v.s / 50) % 3 === 0); v.brakeOn = v.vf < 1; v.sync(dt); }
    if (v.done && !S.lateT) { S.lateT = S.t; G.ui.toast(`${S.r.name} cruzou a chegada! Termine o trajeto 🏁`, 2200); }
    if (S.lateT && S.t - S.lateT > 45) { this.end(false); return; }
    this.hud();
  }
  hud(force) {
    const G = this.G, S = this.race, el = document.getElementById('stHud'), ar = document.getElementById('stArrow'); if (!el) return;
    if (!S) { el.hidden = true; if (ar) ar.hidden = true; return; }
    const pos = S.v.done || S.v.s > this.playerProg() ? 2 : 1; const tt = Math.max(0, S.t);
    el.hidden = false; el.innerHTML = `<b>🌙 ${ROUTES[S.ri].name}</b><span>vs ${S.r.name}</span><span>Portão ${Math.min(S.k + 1, S.cps.length)}/${S.cps.length}</span><span class="pos">${pos}º</span><span>${Math.floor(tt / 60)}:${String(Math.floor(tt % 60)).padStart(2, '0')}</span>`;
    const c = S.cps[S.k]; if (ar && c) { const p = G.player, dx = c[0] - p.x, dz = c[1] - p.z; const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw); const f = dx * fx + dz * fz, r = dx * -fz + dz * fx; ar.hidden = false; ar.style.transform = `translateX(-50%) rotate(${Math.atan2(r, f)}rad)`; ar.dataset.d = Math.round(Math.hypot(dx, dz)); ar.querySelector('i').textContent = Math.round(Math.hypot(dx, dz)) + ' m'; }
  }
  end(win, msg) {
    const G = this.G, S = this.race; if (!S) return; this.race = null; this.gate.visible = this.gate2.visible = false; G.setRoute(null); this.hud();
    const r = S.r, s = this.save; s.races++;
    this.removeCar(S.v);
    if (msg) { G.ui.toast(msg, 2600); this.persist(); return { win: false, cancel: true }; }
    let rep = 3, cash = 50, rewards = [];
    if (win) {
      rep = 15 + Math.floor(r.rep * 0.25); cash = 300 + r.rep * 4; s.wins++;
      const first = !s.beaten.includes(r.id); if (first) { s.beaten.push(r.id); if (!s.liveries.includes(r.id)) { s.liveries.push(r.id); rewards.push(`🎨 Pintura <b>${r.liv.text}</b>`); } if (r.nitro && s.nitroLvl < r.nitro) { s.nitroLvl = r.nitro; NITRO.lvl = r.nitro; rewards.push(`🔥 Nitro nível <b>${r.nitro}</b> (enche mais rápido e dura mais)`); } }
      const T = Math.round(S.t * 10) / 10; const key = ROUTES[S.ri].name; if (!s.best[key] || T < s.best[key]) { s.best[key] = T; rewards.push(`⏱️ Recorde: ${T}s`); }
      this.say(r, pick(STREET.win)); G.ui.big('VITÓRIA!');
    } else { this.say(r, pick(STREET.lose)); }
    s.rep += rep; this.persist(); G.addMoney(cash); G.addFollowers && G.addFollowers(win ? 120 : 15);
    this.lastResult = { win, rep, cash, rewards, rival: r.id, t: S.t, liv: win ? r.id : null };
    this.showResult(); return this.lastResult;
  }
  showResult() {
    const el = document.getElementById('stRes'); if (!el) return; const R = this.lastResult, k = this.rank();
    el.querySelector('h3').textContent = R.win ? '🏆 Vitória na Liga da Madrugada!' : '🌙 Foi por pouco!';
    el.querySelector('.stBody').innerHTML = `<p>+${R.rep} reputação · +$${R.cash}</p>${R.rewards.map(x => `<p>${x}</p>`).join('')}<ol>${k.rows.map(r => `<li class="${r.me ? 'me' : ''}">${r.name}${r.beat ? ' ✓' : ''}<span>${r.rep}</span></li>`).join('')}</ol>`;
    const ap = document.getElementById('stApply'); const pv = this.G.player.vehicle; if (ap) ap.hidden = !(R.liv && pv && !pv.spec.boat && pv.type !== 'heli');
    el.hidden = false;
  }
  closeResult() { const el = document.getElementById('stRes'); if (el) el.hidden = true; }
  applyLivery(id) {
    const G = this.G, r = LEAGUE.find(o => o.id === (id || (this.lastResult && this.lastResult.liv))); const pv = G.player.vehicle; if (!r || !pv || pv.spec.boat || pv.type === 'heli' || !this.save.liveries.includes(r.id)) return false;
    const nv = G.replaceVehicle(pv, Object.assign({}, pv.tune || {}, r.liv)); G.ui.toast(`🎨 Pintura <b>${r.liv.text}</b> aplicada!`, 2000); this.closeResult(); return !!nv;
  }
}
