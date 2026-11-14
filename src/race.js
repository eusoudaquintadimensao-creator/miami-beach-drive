// Modo Corrida (estilo jogos de racha de rua): escolha do carro, largada com luzes, voltas e checkpoints, rivais com IA,
// nitro, drift com pontuação, recorde de volta salvo no aparelho e tela de chegada. Sem violência: encostou, cada um segue.
import { Vehicle, SPECS, RACE_CARS, LIVERIES, raceTune } from './vehicles.js';
import { TRACK } from './track.js';
import { clamp, angDiff } from './util.js';
import { respawnFade } from './driveui.js';
const $ = (id) => document.getElementById(id);
export const RACE_KEY = 'mbd-corrida-v1';
const RIVALS = [{ name: '@luna.turbo', skill: 0.95 }, { name: '@kaique.neon', skill: 0.91 }, { name: '@bia.drift', skill: 0.87 }];
const PRIZE = [1200, 700, 400, 200], FOLS = [250, 120, 60, 30];
const fmt = (t) => { if (t == null || !isFinite(t)) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(2)}`; };
export const fmtTime = fmt;
function stats(type) { const s = SPECS[type]; return { vel: clamp((s.max - 50) / 24, 0.1, 1), ace: clamp((s.acc - 14) / 6.5, 0.1, 1), con: clamp((s.grip * s.steer - 3.6) / 2.6, 0.1, 1), dri: clamp((s.drift - 0.4) / 0.7, 0.1, 1) }; }

export class Race {
  constructor(G, track) {
    this.G = G; this.T = track; this.state = 'idle'; this.cars = []; this.car = null; this.prev = null;
    this.data = Object.assign({ car: 'rc_gt', liv: 0, laps: 3, bestLap: {}, bestRace: {}, driftBest: 0, wins: 0, races: 0 }, (() => { try { return JSON.parse(localStorage.getItem(RACE_KEY) || '{}'); } catch (e) { return {}; } })());
    if (!RACE_CARS.includes(this.data.car)) this.data.car = 'rc_gt';
    this.ang = 0; this.hint = -1;
    track.onKnock = () => { if (this.active) G.audio.thud(3); };
  }
  saveData() { try { localStorage.setItem(RACE_KEY, JSON.stringify(this.data)); } catch (e) { } }
  get active() { return this.state !== 'idle'; }
  get frozen() { return this.state === 'count' || this.state === 'menu'; }
  get racing() { return this.state === 'count' || this.state === 'run'; }
  // ------------------------------------------------ menu de escolha
  openMenu() {
    const G = this.G; if (this.state === 'run' || this.state === 'count') return;
    if (G.missions.active) G.missions.cancel('Missão encerrada: indo para o autódromo 🏁');
    if (G.phoneOpen) G.ui.closePhone();
    if (!this.prev) { const p = G.player; const v = p.vehicle && !p.vehicle.spec.race ? p.vehicle : null; this.prev = { x: p.x, z: p.z, h: p.h, veh: v }; if (v) { G.leaveCar(); } }
    this.clearRivals(); this.T.setLights(0, false); this.T.highlight(-1);
    this.state = 'menu'; G.paused = true; G.raceMenu = true; if (document.pointerLockElement) document.exitPointerLock();
    this.spawnPlayer(this.data.car, this.data.liv, 2);
    $('raceSel').hidden = false; $('raceEnd').hidden = true; $('raceHud').hidden = true; $('hud').classList.add('ghide');
    this.panel(); G.audio.chime('start');
  }
  spawnPlayer(type, liv, slot) {
    const G = this.G; if (this.car) { if (G.player.vehicle === this.car) G.leaveCar(true); this.car.dispose(G.scene); }
    const v = new Vehicle(type, G.scene, G.Q, undefined, raceTune(type, liv, [7, 11, 23, 88][RACE_CARS.indexOf(type)]));
    const g = this.T.gridSlot(slot); const p = this.T.at(g.s, g.lat); v.place(p.x, p.z, p.h); v.nitro = 1; v.race = true;
    this.car = v; G.player.x = p.x; G.player.z = p.z; G.enterCar(v); G.snapCam();
    return v;
  }
  panel() {
    const d = this.data, G = this.G;
    const bar = (k, v) => `<div class="st"><span>${k}</span><i><b style="width:${Math.round(v * 100)}%"></b></i></div>`;
    const cards = RACE_CARS.map(id => { const s = stats(id), sp = SPECS[id]; const best = d.bestLap[id]; return `<button class="rcCard${d.car === id ? ' sel' : ''}" data-car="${id}"><b>${sp.name}</b>${bar('Velocidade', s.vel)}${bar('Aceleração', s.ace)}${bar('Controle', s.con)}${bar('Drift', s.dri)}<small>${Math.round(sp.max * 3.6)} km/h${best ? ' · 🏆 ' + fmt(best) : ''}</small></button>`; }).join('');
    const css = (h) => '#' + h.toString(16).padStart(6, '0');
    const liv = LIVERIES[d.car].map((L, i) => `<button class="${d.liv === i ? 'sel' : ''}" data-liv="${i}" title="${L.text}" style="background:linear-gradient(135deg,${css(L.paint)} 55%,${css(L.accent)} 56%)"></button>`).join('');
    const laps = [1, 3, 5].map(n => `<button class="${d.laps === n ? 'sel' : ''}" data-laps="${n}">${n} ${n > 1 ? 'voltas' : 'volta'}</button>`).join('');
    $('rsBody').innerHTML = `<div class="rcCards">${cards}</div>
      <h4>Pintura</h4><div class="sw">${liv}</div>
      <h4>Corrida</h4><div class="seg">${laps}</div>
      <p class="rsInfo">${TRACK.name} · ${(this.T.L / 1000).toFixed(2)} km · 3 rivais · recorde geral ${fmt(this.bestAny())}</p>
      <div class="gAct"><button id="rsBack">✕ Voltar</button><button id="rsFree">🛞 Treino livre</button><button id="rsGo" class="go">🏁 CORRER</button></div>
      <p class="rsHelp">${G.touch ? '🔥 nitro · 🌀 drift (ou puxe o joystick para trás numa curva) · ↺ volta para a pista' : '<b>Shift</b> ou <b>N</b> nitro · <b>S</b>/<b>Espaço</b> numa curva rápida = drift · <b>T</b> volta para a pista'}</p>`;
    $('rsBody').querySelectorAll('[data-car]').forEach(b => b.onclick = () => { d.car = b.dataset.car; d.liv = 0; this.saveData(); this.spawnPlayer(d.car, d.liv, 2); this.panel(); G.audio.chime('coin'); });
    $('rsBody').querySelectorAll('[data-liv]').forEach(b => b.onclick = () => { d.liv = +b.dataset.liv; this.saveData(); this.spawnPlayer(d.car, d.liv, 2); this.panel(); G.audio.chime('coin'); });
    $('rsBody').querySelectorAll('[data-laps]').forEach(b => b.onclick = () => { d.laps = +b.dataset.laps; this.saveData(); this.panel(); });
    $('rsGo').onclick = () => this.start('race'); $('rsFree').onclick = () => this.start('treino'); $('rsBack').onclick = () => this.leave();
  }
  bestAny() { const v = Object.values(this.data.bestLap); return v.length ? Math.min(...v) : null; }
  frame(dt, camera) { // câmera girando em volta do carro escolhido
    const v = this.car; if (!v) return; this.ang += dt * 0.32;
    const portrait = innerHeight > innerWidth; const r = portrait ? 9.5 : 8.6, y = v.y + (portrait ? 3.4 : 1.9), a = v.h + this.ang;
    camera.position.set(v.x + Math.sin(a) * r, y, v.z + Math.cos(a) * r);
    // o painel fica à direita (computador) ou embaixo (celular): desloca o carro para a área livre da tela
    const side = portrait ? 0 : Math.min(3.2, 2.4 * (560 / Math.max(700, innerWidth)) * 1.6);
    camera.lookAt(v.x + Math.cos(a) * side, v.y + (portrait ? -1.4 : 0.55), v.z - Math.sin(a) * side);
    const f = portrait ? 70 : 48; if (Math.abs(camera.fov - f) > 0.1) { camera.fov = f; camera.updateProjectionMatrix(); }
    v.sync(0);
  }
  // ------------------------------------------------ largada
  start(mode) {
    const G = this.G; this.mode = mode; $('raceSel').hidden = true; $('raceEnd').hidden = true; $('hud').classList.remove('ghide');
    G.paused = false; G.raceMenu = false; this.clearRivals();
    const slot = mode === 'race' ? 2 : 0; const g = this.T.gridSlot(slot); const p = this.T.at(g.s, g.lat);
    const v = this.car; v.place(p.x, p.z, p.h); v.nitro = 1; v.drifting = false; v.yawV = 0; v.steer = 0;
    G.player.x = p.x; G.player.z = p.z; G.snapCam(); G.camYaw = p.h; G.camPitch = 0.16;
    if (mode === 'race') {
      const others = RACE_CARS.filter(t => t !== this.data.car); const nums = [3, 21, 46];
      [0, 1, 3].forEach((sl, k) => {
        const type = others[k % others.length]; const r = new Vehicle(type, G.scene, G.Q, undefined, raceTune(type, (k + 1 + this.data.liv) % 4, nums[k]));
        const gs = this.T.gridSlot(sl); const q = this.T.at(gs.s, gs.lat); r.place(q.x, q.z, q.h);
        Object.assign(r, { npc: true, rival: true, active: true, racer: RIVALS[k].name, skill: RIVALS[k].skill * (0.985 + Math.random() * 0.03), lat: gs.lat, total: gs.s - this.T.L, spd: 0, bumped: 0, fin: null, nit: 1, dy: 0 });
        this.cars.push(r);
      });
    }
    this.laps = mode === 'race' ? this.data.laps : 99;
    this.total = g.s - this.T.L; this.lastS = g.s; this.hint = -1; this.lap = 0; this.lapStart = 0; this.lapTimes = []; this.t = 0; this.cpNext = 1; this.wrongT = 0; this.offT = 0; this.stuckT = 0; this._fading = false; this.finT = null;
    this.G.drift.reset(); this.G.fx.clearMarks(); this.T.resetCones(); this.T.highlight(1);
    $('raceHud').hidden = false;
    if (mode === 'race') { this.state = 'count'; this.countT = 0; this.cd = -1; this.T.setLights(0, false); G.ui.big('PREPARE-SE'); }
    else { this.state = 'treino'; this.T.setLights(0, true); G.ui.big('TREINO LIVRE'); G.ui.toast('Volta rápida: o tempo começa ao cruzar a linha 🏁', 3200); this.lap = -1; }
    G.audio.chime('start');
  }
  clearRivals() { for (const r of this.cars) r.dispose(this.G.scene); this.cars = []; }
  // ------------------------------------------------ por quadro
  update(dt, t) {
    if (this.state === 'idle' || this.state === 'menu') return;
    const G = this.G, v = this.car;
    if (this.state === 'count') {
      this.countT += dt; const c = this.countT;
      const n = c < 0.6 ? 0 : Math.min(5, 1 + Math.floor((c - 0.6) / 0.5)); if (n !== this._ln) { this._ln = n; if (c < 3.6) this.T.setLights(n, false); }
      const cd = c < 0.9 ? 0 : c < 1.8 ? 3 : c < 2.7 ? 2 : c < 3.6 ? 1 : -1;
      if (cd !== this.cd) { this.cd = cd; if (cd > 0) { G.ui.big(String(cd)); G.audio.chime('coin'); } }
      if (c >= 3.6) { this.state = 'run'; this.t = 0; this.lapStart = 0; this.T.setLights(0, true); G.ui.big('VAI!'); G.audio.chime('start'); setTimeout(() => this.state === 'run' && this.T.setLights(0, false), 2500); }
      this.hud(); this.ai(0); return;
    }
    if (!v || G.player.vehicle !== v) return;
    this.t += dt;
    // progresso do jogador ao longo da pista (sem atalhos: os muros fecham tudo)
    const r = this.T.locate(v.x, v.z, this.hint);
    if (r) {
      this.hint = r.i; let ds = r.s - this.lastS; if (ds < -this.T.L / 2) ds += this.T.L; if (ds > this.T.L / 2) ds -= this.T.L; if (Math.abs(ds) < 40) this.total += ds; this.lastS = r.s;
      const tf = [Math.sin(this.T.h[r.i]), Math.cos(this.T.h[r.i])]; const [fx, fz] = v.fwd(); const dot = fx * tf[0] + fz * tf[1];
      this.wrongT = dot < -0.35 && v.speed > 4 ? this.wrongT + dt : Math.max(0, this.wrongT - dt * 2);
      this.offT = Math.abs(r.lat) > TRACK.wall + 2 ? this.offT + dt : 0;
    } else this.offT += dt;
    this.stuckT = v.speed < 1.5 && this.state !== 'done' ? this.stuckT + dt : 0;
    if ((this.offT > 1 || this.stuckT > 1) && !this._fading) {
      this._fading = true;
      respawnFade(() => { this.resetCar(true); this._fading = false; });
    }
    // checkpoints e voltas
    const L = this.T.L, cps = TRACK.cps;
    if (this.state === 'treino') {
      if (this.lap < 0 && this.total >= 0) { this.lap = 0; this.lapStart = this.t; this.cpNext = 1; G.ui.big('VALENDO!'); }
      if (this.lap >= 0) this.checkCP(L, cps);
    } else if (this.state === 'run') this.checkCP(L, cps);
    this.ai(dt);
    this.hud();
    if (this.state === 'done' && this.finT != null && t - this.finT > 1.6 && $('raceEnd').hidden) this.showEnd();
  }
  checkCP(L, cps) {
    const G = this.G; const base = Math.max(0, this.lap) * L;
    if (this.cpNext < cps && this.total >= base + this.cpNext * L / cps) { this.cpNext++; G.audio.chime('coin'); this.T.highlight(this.cpNext < cps ? this.cpNext : 0); this.cpFlash = 1.2; }
    if (this.cpNext >= cps && this.total >= base + L) {
      const lt = this.t - this.lapStart; this.lapTimes.push(lt); this.lap++; this.lapStart = this.t; this.cpNext = 1; this.T.highlight(1);
      const car = this.data.car; const old = this.data.bestLap[car]; const rec = !old || lt < old; if (rec) { this.data.bestLap[car] = Math.round(lt * 1000) / 1000; this.saveData(); }
      if (this.state === 'run' && this.lap >= this.laps) return this.finish();
      G.ui.big(rec ? 'RECORDE!' : this.state === 'run' ? `VOLTA ${this.lap + 1}/${this.laps}` : 'VOLTA!'); G.audio.chime(rec ? 'win' : 'start');
      G.ui.toast(`Volta ${this.lap}: <b>${fmt(lt)}</b>${rec ? ' · 🏆 novo recorde!' : ''}`, 3000);
    }
  }
  position() {
    const me = { me: true, total: this.total, fin: this.finTime ?? null };
    const all = [me, ...this.cars.map(r => ({ r, total: r.total, fin: r.fin }))];
    all.sort((a, b) => (a.fin != null && b.fin != null) ? a.fin - b.fin : a.fin != null ? -1 : b.fin != null ? 1 : b.total - a.total);
    return { pos: all.findIndex(o => o.me) + 1, all };
  }
  finish() {
    const G = this.G; this.state = 'done'; this.finTime = this.t; this.finT = G.t; this.T.highlight(-1);
    const { pos } = this.position(); this.place = pos;
    const key = this.data.car + '_' + this.laps; const old = this.data.bestRace[key]; this.newRace = !old || this.t < old; if (this.newRace) this.data.bestRace[key] = Math.round(this.t * 1000) / 1000;
    this.data.races++; if (pos === 1) this.data.wins++;
    G.drift.bank(); // fecha o combo em andamento
    this.driftPts = G.drift.total; if (this.driftPts > this.data.driftBest) { this.data.driftBest = this.driftPts; this.newDrift = true; } else this.newDrift = false;
    this.saveData();
    const prize = PRIZE[pos - 1] + Math.round(this.driftPts / 100); this.prize = prize; G.addMoney(prize); G.addFollowers(FOLS[pos - 1]); G.save.done++; G.persist();
    G.ui.big(pos === 1 ? '1º LUGAR!' : `${pos}º LUGAR`); G.audio.chime('win');
    G.ui.phoneNote(this.cars[0] ? this.cars[0].racer : '@luna.turbo', pos === 1 ? 'Você voou no Autódromo! Revanche? 🔥' : 'Boa corrida! Bora mais uma? 😎');
  }
  showEnd() {
    const G = this.G; const { all } = this.position(); const L = this.T.L;
    const rows = all.map((o, i) => { let tm; if (o.me) tm = this.finTime; else if (o.fin != null) tm = o.fin; else { const left = this.laps * L - o.total; tm = this.t + left / Math.max(20, o.r.spd || 25); } return `<tr class="${o.me ? 'me' : ''}"><td>${i + 1}º</td><td>${o.me ? 'Você' : o.r.racer}</td><td>${o.me ? SPECS[this.data.car].name : o.r.spec.name}</td><td>${fmt(tm)}${!o.me && o.fin == null ? '*' : ''}</td></tr>`; }).join('');
    const bl = Math.min(...this.lapTimes); const rec = this.data.bestLap[this.data.car];
    $('reBody').innerHTML = `<div class="rePlace p${this.place}">${this.place}º<small>lugar</small></div>
      <table class="reTab">${rows}</table>
      <div class="reStats"><div><span>Tempo total</span><b>${fmt(this.finTime)}</b>${this.newRace ? '<em>novo recorde</em>' : ''}</div><div><span>Melhor volta</span><b>${fmt(bl)}</b>${rec && Math.abs(rec - bl) < 0.002 ? '<em>recorde</em>' : `<small>recorde ${fmt(rec)}</small>`}</div><div><span>Drift</span><b>${G.drift.total.toLocaleString('pt-BR')}</b>${this.newDrift ? '<em>melhor</em>' : ''}</div><div><span>Prêmio</span><b>+$${this.prize}</b></div></div>
      <div class="gAct"><button id="reAgain" class="go">🔁 Correr de novo</button><button id="reCar">🚗 Trocar carro</button><button id="reShare">📤 Compartilhar</button><button id="reCity">🏙️ Voltar à cidade</button></div><div id="reMsg"></div>`;
    $('raceEnd').hidden = false; G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
    $('reAgain').onclick = () => this.start('race'); $('reCar').onclick = () => this.openMenu(); $('reCity').onclick = () => this.leave();
    $('reShare').onclick = async () => {
      const txt = `Cheguei em ${this.place}º no ${TRACK.name} (Solara Bay) com o ${SPECS[this.data.car].name}: ${fmt(this.finTime)}, melhor volta ${fmt(bl)} 🏁🔥`; const url = location.origin + location.pathname;
      try { if (navigator.share) { await navigator.share({ title: 'Miami Beach Drive: Solara Bay', text: txt, url }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      try { await navigator.clipboard.writeText(txt + ' ' + url); $('reMsg').textContent = '✅ Resultado copiado! Cole onde quiser.'; } catch (e) { $('reMsg').textContent = txt + ' ' + url; }
    };
  }
  askQuit() {
    const G = this.G; if (this.state === 'menu' || this.state === 'idle') return;
    G.paused = true; $('raceQuit').hidden = false; if (document.pointerLockElement) document.exitPointerLock();
    $('rqTxt').textContent = this.state === 'treino' ? 'Sair do treino livre?' : this.state === 'done' ? 'Voltar para a cidade?' : 'Abandonar a corrida?';
    $('rqNo').onclick = () => { $('raceQuit').hidden = true; G.paused = !$('raceEnd').hidden; };
    $('rqMenu').onclick = () => { $('raceQuit').hidden = true; this.openMenu(); };
    $('rqYes').onclick = () => { $('raceQuit').hidden = true; this.leave(); };
  }
  resetCar(auto) {
    if (!this.car || !(this.state === 'run' || this.state === 'treino' || this.state === 'done')) return;
    const r = this.T.locate(this.car.x, this.car.z, this.hint); const s = r ? r.s : this.lastS; const p = this.T.at(s, 0);
    this.car.place(p.x, p.z, p.h); this.car.drifting = false; this.car.yawV = 0; this.G.player.x = p.x; this.G.player.z = p.z; this.G.snapCam(); this.offT = 0; this.stuckT = 0; this.wrongT = 0; this.lastS = s; this.hint = p.i;
    this.G.ui.toast(auto ? '↺ De volta à pista' : '↺ Carro reposicionado', 1400);
  }
  leave() {
    const G = this.G; this.clearRivals(); $('raceSel').hidden = $('raceEnd').hidden = $('raceQuit').hidden = $('raceHud').hidden = true; $('hud').classList.remove('ghide');
    if (G.player.vehicle === this.car) G.leaveCar(true); if (this.car) { this.car.dispose(G.scene); this.car = null; }
    this.state = 'idle'; G.paused = false; G.raceMenu = false; this.T.setLights(0, false); this.T.highlight(-1);
    const pv = this.prev; this.prev = null;
    if (pv && pv.veh && G.vehicles.includes(pv.veh)) { G.player.x = pv.veh.x; G.player.z = pv.veh.z; G.enterCar(pv.veh); }
    else if (pv) G.placeOnFoot(pv.x, pv.z, pv.h);
    G.snapCam(); G.drift.reset();
  }
  // ------------------------------------------------ rivais (IA no traçado, com linha de corrida, frenagem nas curvas e ultrapassagem)
  ai(dt) {
    if (!this.cars.length) return; const T = this.T, L = T.L, G = this.G; const me = this.car;
    const meLoc = me ? T.locate(me.x, me.z, this.hint) : null; const meLat = meLoc ? meLoc.lat : 0;
    for (const r of this.cars) {
      const sp = r.spec;
      if (dt > 0) {
        const fin = r.fin != null; const top = sp.max * 0.8 * r.skill; const aLat = 12 * r.skill;
        let target = top;
        for (let d = 0; d <= 110; d += 5) { const k = Math.abs(T.at(r.total + d).k); if (k < 1e-4) continue; const vm = Math.sqrt(aLat / k); target = Math.min(target, Math.sqrt(vm * vm + 2 * 13 * d)); }
        if (!fin && this.state === 'run') { const gap = r.total - this.total; target *= gap > 70 ? 0.92 : gap > 30 ? 0.97 : gap < -120 ? 1.08 : gap < -50 ? 1.03 : 1; }
        if (fin || this.state === 'done' && r.total > this.laps * L) target = Math.min(target, 18);
        if (r.bumped > 0) { r.bumped = Math.min(r.bumped, 0.7) - dt; target *= 0.78; }
        // tráfego: outros rivais e o jogador
        let latT = clamp(T.at(r.total + 14).k * 150, -4.2, 4.2);
        const others = this.cars.filter(o => o !== r).map(o => ({ total: o.total, lat: o.lat, spd: o.spd }));
        if (me && meLoc) others.push({ total: this.total, lat: meLat, spd: me.speed });
        for (const o of others) { let a = o.total - r.total; if (a < -L / 2) a += L; if (a > 0 && a < 16 && Math.abs(o.lat - r.lat) < 2.6) { latT = o.lat > 0.5 ? o.lat - 3.6 : o.lat < -0.5 ? o.lat + 3.6 : (r.lat >= o.lat ? o.lat + 3.6 : o.lat - 3.6); if (a < 7) target = Math.min(target, o.spd + 1); } }
        latT = clamp(latT, -5.6, 5.6); r.lat += (latT - r.lat) * Math.min(1, dt * 1.6);
        const acc = sp.acc * 0.9 * Math.max(0.15, 1 - (r.spd / (sp.max * 1.02)) ** 2);
        const nitroOK = !fin && r.nit > 0.2 && Math.abs(T.at(r.total + 40).k) < 1 / 300 && r.spd > 20 && this.state === 'run';
        r.boosting = nitroOK && r.spd < top * 1.12; if (r.boosting) { target = Math.max(target, top * 1.12); r.nit -= dt / 3; } else r.nit = Math.min(1, r.nit + dt / 14);
        r.spd += clamp(target - r.spd, -16 * dt, (acc + (r.boosting ? 6 : 0)) * dt); r.spd = Math.max(0, r.spd);
        r.total += r.spd * dt; r.brakeOn = target < r.spd - 1.5;
        if (r.fin == null && r.total >= this.laps * L && this.state !== 'count') { r.fin = this.t; }
      }
      const p = T.at(r.total, r.lat); const k = p.k;
      const dyT = Math.abs(k) > 1 / 70 && r.spd > 14 ? -Math.sign(k) * clamp(Math.abs(k) * 12, 0.12, 0.38) : 0; r.dy += (dyT - r.dy) * Math.min(1, dt * 3);
      r.x = p.x; r.z = p.z; r.y = 0; r.h = p.h + r.dy; r.vx = Math.sin(p.h) * r.spd; r.vz = Math.cos(p.h) * r.spd; r.vf = r.spd; r.steer = clamp(k * 25, -1, 1);
      r.spin += r.spd * dt / sp.wr; r.drifting = Math.abs(r.dy) > 0.15; r.driftAng = Math.abs(r.dy);
      r.sync(dt);
    }
  }
  // ------------------------------------------------ HUD
  hud() {
    const el = $('raceHud'); if (!el) return; let h = '';
    if (this.state === 'treino') {
      const cur = this.lap >= 0 ? this.t - this.lapStart : 0; const best = this.data.bestLap[this.data.car];
      h = `<div class="rhRow"><div class="rhPos"><small>TREINO</small></div><div class="rhLap">VOLTA <b>${Math.max(1, this.lap + 1)}</b></div></div><div class="rhTime">${this.lap >= 0 ? fmt(cur) : 'cruze a linha 🏁'}</div><div class="rhBest">Recorde ${fmt(best)}${this.lapTimes.length ? ' · última ' + fmt(this.lapTimes[this.lapTimes.length - 1]) : ''}</div>`;
    } else {
      const { pos } = this.position(); const n = this.cars.length + 1; const lap = Math.min(this.laps, this.lap + 1);
      const cur = this.state === 'count' ? 0 : this.state === 'done' ? this.finTime : this.t;
      const best = this.lapTimes.length ? Math.min(...this.lapTimes) : null;
      h = `<div class="rhRow"><div class="rhPos"><b>${pos}</b>º<small>/${n}</small></div><div class="rhLap">VOLTA <b>${lap}</b>/${this.laps}</div></div><div class="rhTime">${fmt(cur)}</div><div class="rhBest">CP ${Math.min(this.cpNext, TRACK.cps)}/${TRACK.cps} · melhor volta ${fmt(best ?? this.data.bestLap[this.data.car])}</div>`;
    }
    if (this.wrongT > 1.2) h += '<div class="rhWarn">⚠️ CONTRAMÃO</div>'; else if (this.offT > 0.6) h += '<div class="rhWarn">Volte para a pista</div>';
    if (h !== this._h) { el.innerHTML = h; this._h = h; }
  }
}
