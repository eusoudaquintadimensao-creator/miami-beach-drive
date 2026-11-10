// Moradores que conversam: personagens fixos (modelo 3D animado) + qualquer pedestre.
// Aperte E (ou 💬 Conversar) perto de alguém. Falas locais com contexto; alguns oferecem mini missões.
import * as THREE from 'three';
import { rng, pick, clamp, angDiff, canvasTex } from './util.js';
import { walkable, isRoad, collide, surfaceY, LANDMARKS, inTrackZone } from './world.js';
import { POIS } from './missions.js';
import { RACHAS } from './rivals.js';
import { PERS, GENERIC_PERS, REACT, FAVORS, OFFER_TXT, BYE, THANKS, buildScript, periodOf } from './phrases.js';
import { makeModel } from './avatar.js';
import { HELIPAD } from './heli.js';
import { SPECS, TUNABLE } from './vehicles.js';

const $ = (id) => document.getElementById(id);
// personagens fixos espalhados pela cidade (posição ajustada para um lugar livre na hora)
const CAST = [
  { per: 'piloto', name: 'Comandante Íris', at: [364, -206], model: 'ela', colors: { Shirt: 0xf2f2f2, Pants: 0x1b2a44, Hair: 0x111111 }, h: 1.7, favor: true },
  { per: 'surfista', name: 'Kai', at: [336, -168], model: 'ele', colors: { Shirt: 0xffb000, Pants: 0x1e88e5, Skin: 0x9c6b45, Hair: 0xd8b26e }, h: 1.8, favor: true },
  { per: 'acai', name: 'Tia Rosa', at: [319, -122], model: 'ela', colors: { Shirt: 0x8e24aa, Pants: 0xffffff, Skin: 0xc68642, Hair: 0x3b2314 }, h: 1.6, favor: true },
  { per: 'mecanico', name: 'Rafa Torque', at: [298, 52], model: 'ele', colors: { Shirt: 0x263238, Pants: 0x37474f, Skin: 0x8d5524, Hair: 0x111111 }, h: 1.76, favor: true },
  { per: 'vovo', name: 'Dona Cida', at: [296, 128], model: 'ela', colors: { Shirt: 0xf48fb1, Pants: 0x9e9e9e, Hair: 0xdddddd, HairBase: 0xdddddd, Skin: 0xe0ac69 }, h: 1.55, favor: true },
  { per: 'influencer', name: '@bia.vibez', at: [470, -299], model: 'ela', colors: { Shirt: 0x00e5ff, Pants: 0xff4081, Skin: 0xffdbac, Hair: 0xb5651d }, h: 1.66, favor: true },
  { per: 'pescador', name: 'Seu Jorge', at: [-280, -10], model: 'ele', colors: { Shirt: 0x6d8b3a, Pants: 0x5d4037, Skin: 0x6b3e26, Hair: 0xcccccc }, h: 1.7, favor: true },
  { per: 'turista', name: 'Hans', lm: 'torre', model: 'ele', colors: { Shirt: 0xff7043, Pants: 0xf5f5dc, Skin: 0xffe0bd, Hair: 0xe6c27a }, h: 1.86, favor: true },
  { per: 'dj', name: 'DJ Lua', lm: 'flamingo', model: 'ela', colors: { Shirt: 0x111111, Pants: 0x7c4dff, Skin: 0x8d5524, Hair: 0xff4fb8, HairBase: 0xff4fb8 }, h: 1.7, favor: true },
  { per: 'salva', name: 'Marina', at: [346, -284], model: 'ela', colors: { Shirt: 0xff1744, Pants: 0xff1744, Skin: 0xd9a066, Hair: 0x6a4e2a }, h: 1.7, favor: true },
];

function freeSpot(x, z) {
  const ok = (a, b) => { if (!walkable(a, b) || isRoad(a, b)) return false; const p = { x: a, z: b }; return !collide(p, 0.6, false, 0.5); };
  if (ok(x, z)) return [x, z];
  for (let r = 1.5; r < 30; r += 1.5) for (let k = 0; k < 16; k++) { const a = x + Math.cos(k / 16 * 6.283) * r, b = z + Math.sin(k / 16 * 6.283) * r; if (ok(a, b)) return [a, b]; }
  return [x, z];
}
let bubbleTex = null;
function talkIcon() { if (!bubbleTex) bubbleTex = canvasTex(96, 96, (g) => { g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.arc(48, 42, 34, 0, 7); g.fill(); g.beginPath(); g.moveTo(30, 66); g.lineTo(22, 90); g.lineTo(52, 72); g.fill(); g.font = '40px "Noto Color Emoji","Apple Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('💬', 48, 44); }, { clamp: true }); return bubbleTex; }

export class Talk {
  constructor(G) {
    this.G = G; this.r = rng(Date.now() % 9973); this.recent = []; this.cur = null; this.cool = 0; this.reactCool = 0; this.nitroT = 0; this.lastCar = null; this.lastCarT = 99;
    this.talkers = []; this.offerMade = new Map();
    this.ui();
  }
  ui() {
    $('tkNext').onclick = () => this.next(); $('tkYes').onclick = () => this.accept(); $('tkBye').onclick = () => this.close(true);
  }
  // cria os personagens fixos (assíncrono: precisa do modelo 3D; sem ele, os pedestres comuns continuam conversando)
  async spawnCast(n) {
    const G = this.G;
    for (const C of CAST.slice(0, n)) {
      let [x, z] = C.at || (() => { const L = LANDMARKS.find(l => l.id === C.lm); return L ? [L.x, L.z] : [300, 0]; })();
      [x, z] = freeSpot(x, z);
      const T = { kind: 'talker', model: C.model, per: C.per, name: C.name, emoji: PERS[C.per].emoji, x, z, h: Math.random() * 6, h0: 0, favor: C.favor, mode: 'idle', t: 0 };
      try {
        const R = await makeModel(C.model, C.colors, C.h); T.rig = R; R.model.position.set(x, surfaceY(x, z), z); G.scene.add(R.model);
        R.acts.Idle.play(); R.acts.Idle.time = Math.random() * 3; R.mixer.update(0.01);
        const ic = new THREE.Sprite(new THREE.SpriteMaterial({ map: talkIcon(), depthWrite: false, transparent: true, fog: false })); ic.scale.setScalar(0.7); ic.position.set(x, surfaceY(x, z) + C.h + 0.55, z); G.scene.add(ic); T.icon = ic;
      } catch (e) { continue; }
      T.h0 = T.h; this.talkers.push(T);
    }
    return this.talkers.length;
  }
  ctx() {
    const G = this.G; const p = G.player; const v = p.vehicle || (this.lastCarT < 25 ? this.lastCar : null); const E = G.env;
    const A = G.hero && G.hero.def; const ela = G.hero && (G.hero.id === 'ela' || A && A.base === 'ela');
    return {
      period: periodOf(E.hour), weather: E.weather, night: E.night, g: ela ? 'a' : 'o', am: ela ? 'amiga' : 'amigo', qa: ela ? 'querida' : 'querido',
      jet: (G.jet && G.jet.recent > 0) || false, nearTrack: inTrackZone(p.x, p.z, 160),
      car: v ? { type: v.type, race: !!v.spec.race, name: v.spec.name, tuned: !!v.tune, text: v.tune && v.tune.text, nitro: this.nitroT > 0, tunable: TUNABLE.includes(v.type) } : null,
      hero: A && A.hero ? { id: A.id, label: A.label, power: A.powerTxt } : null,
      mission: G.missions.active && G.missions.active.type, done: G.save.done, money: G.save.money, followers: G.save.followers,
    };
  }
  // alguém para conversar por perto (personagem fixo tem prioridade)
  nearest(maxD = 2.8) {
    const p = this.G.player; if (p.vehicle) return null; let best = null, bd = maxD;
    for (const T of this.talkers) { const d = Math.hypot(T.x - p.x, T.z - p.z); if (d < bd + 0.6) { bd = d - 0.6; best = T; } }
    if (best) return best;
    for (const c of this.G.crowd.peds) { if (c.mode === 'dodge' || c.x > 1e4) continue; const d = Math.hypot(c.x - p.x, c.z - p.z); if (d < bd) { bd = d; best = c; } }
    return best;
  }
  whoOf(o) {
    if (o.kind === 'talker') return o;
    // (o.per dos pedestres é o perímetro do quarteirão; a personalidade fica em o.pers)
    if (!PERS[o.pers]) { o.pers = GENERIC_PERS[(o.i | 0) % GENERIC_PERS.length]; o.name = pick(this.r, PERS[o.pers].names); }
    return { kind: 'ped', ref: o, per: o.pers, name: o.name, emoji: PERS[o.pers].emoji, get x() { return o.x; }, get z() { return o.z; }, favor: this.r() < 0.35 };
  }
  open(o) {
    const G = this.G; const W = this.whoOf(o); const c = this.ctx();
    const lines = buildScript(W.per, c, this.r, this.recent);
    for (const l of lines) { this.recent.push(l); if (this.recent.length > 40) this.recent.shift(); }
    // mini missão (uma por personagem a cada tanto)
    let offer = null; const key = W.kind === 'talker' ? W.name : 'ped' + o.i; const lastOffer = this.offerMade.get(key) || -1e9;
    if (W.favor && !G.missions.active && G.t - lastOffer > 90 && FAVORS[W.per]) {
      const opts = FAVORS[W.per].filter(f => f.kind !== 'racha' || (G.player.vehicle || this.lastCar) && (this.lastCar && this.lastCar.tune));
      const f = opts.length ? pick(this.r, opts) : null;
      if (f) offer = this.makeOffer(f, W);
      if (offer) { lines.push(offer.text); this.offerMade.set(key, G.t); }
    }
    this.cur = { W, lines, i: 0, offer, t: 0 };
    if (W.kind === 'ped') { const ped = W.ref; if (ped.mode !== 'lie') { ped.mode = 'idle'; ped.t = 30; } ped.h = Math.atan2(G.player.x - ped.x, G.player.z - ped.z); ped.talking = true; }
    else { W.mode = 'talk'; }
    G.player.h = Math.atan2(W.x - G.player.x, W.z - G.player.z);
    $('talk').hidden = false; $('tkName').innerHTML = `${W.emoji} <b>${W.name}</b><small>${PERS[W.per].tag}</small>`;
    this.show(); G.audio.chime('coin');
  }
  makeOffer(f, W) {
    const G = this.G; const p = G.player;
    if (f.kind === 'entrega') { const cands = POIS.filter(q => { const d = Math.hypot(q.x - p.x, q.z - p.z); return d > 140 && d < 650; }); const d = cands.length ? pick(this.r, cands) : pick(this.r, POIS); return { f, dest: d, text: OFFER_TXT.entrega(f, d.name) }; }
    if (f.kind === 'foto') { const left = LANDMARKS.filter(l => !G.save.photos.includes(l.id)); const L = pick(this.r, left.length ? left : LANDMARKS); return { f, L, text: OFFER_TXT.foto(f, L.name) }; }
    if (f.kind === 'racha') { let b = null, bd = 1e9; for (const r of RACHAS) { const d = Math.hypot(r.start[0] - p.x, r.start[1] - p.z); if (d < bd) { bd = d; b = r; } } return b ? { f, race: b, text: OFFER_TXT.racha() } : null; }
    if (f.kind === 'concha') { const s = G.missions.shells.filter(s => !s.got).sort((a, b) => Math.hypot(a.x - p.x, a.z - p.z) - Math.hypot(b.x - p.x, b.z - p.z))[0]; return s ? { f, shell: s, text: OFFER_TXT.concha() } : null; }
    if (f.kind === 'heli') return Math.hypot(HELIPAD.x - p.x, HELIPAD.z - p.z) > 30 ? { f, text: OFFER_TXT.heli() } : null;
    return null;
  }
  show() {
    const C = this.cur; if (!C) return; const line = C.lines[C.i]; const last = C.i >= C.lines.length - 1;
    const isOffer = !!(C.offer && last);
    this.G.ui.talkBubble(C.W, line);
    $('tkNext').hidden = last; $('tkYes').hidden = !isOffer; $('tkBye').textContent = isOffer ? '🙅 Agora não' : '👋 Tchau';
    $('tkStep').textContent = `${C.i + 1}/${C.lines.length}`;
    C.t = 0;
  }
  next() { const C = this.cur; if (!C) return; if (C.i < C.lines.length - 1) { C.i++; this.show(); } else this.close(true); }
  accept() {
    const C = this.cur; if (!C || !C.offer) return; const G = this.G; const o = C.offer; const W = C.W;
    if (o.f.kind === 'entrega') G.missions.startFavor({ title: `💛 Favor para ${W.name}`, giver: W.name, item: o.f.item, to: o.f.to, dest: o.dest, money: o.f.money, fol: o.f.fol });
    else if (o.f.kind === 'foto') { G.missions.startPhoto(o.L, W.name, o.f.money); }
    else if (o.f.kind === 'racha') { G.ui.waypoint = [o.race.start[0], o.race.start[1]]; G.setRoute(G.ui.waypoint); G.ui.toast(`🔥 GPS marcado: <b>${o.race.name}</b>`); }
    else if (o.f.kind === 'concha') { G.ui.waypoint = [o.shell.x, o.shell.z]; G.setRoute(G.ui.waypoint); G.ui.toast('🐚 Concha neon marcada no GPS'); }
    else if (o.f.kind === 'heli') { G.ui.waypoint = [HELIPAD.x, HELIPAD.z]; G.setRoute(G.ui.waypoint); G.ui.toast('🚁 GPS para o <b>Heliponto da Praia</b>'); }
    G.ui.talkBubble(W, pick(this.r, THANKS).replace('Obrigado(a)', G.hero && G.hero.id === 'ela' ? 'Obrigada' : 'Obrigado'));
    this.close(false, 1800); G.audio.chime('start');
  }
  close(now, delay = 0) {
    const C = this.cur; if (!C) return; $('talk').hidden = true; this.cur = null; this.cool = 0.6;
    if (C.W.kind === 'ped') { const p = C.W.ref; p.talking = false; if (p.mode === 'idle') p.t = 1.5; } else C.W.mode = 'idle';
    if (!now && delay) setTimeout(() => this.G.ui.hideBubble(C.W), delay); else if (now) { this.G.ui.talkBubble(C.W, pick(this.r, BYE)); setTimeout(() => this.G.ui.hideBubble(C.W), 1400); }
  }
  get open_() { return !!this.cur; }
  update(dt, t, cam) {
    const G = this.G; const p = G.player; const v = p.vehicle; const Q = G.Q;
    this.cool = Math.max(0, this.cool - dt); this.reactCool -= dt;
    if (v) { this.lastCar = v; this.lastCarT = 0; } else this.lastCarT += dt;
    if (v && v.boosting) this.nitroT = 10; else this.nitroT = Math.max(0, this.nitroT - dt);
    // fecha se o jogador se afastar
    if (this.cur) { const W = this.cur.W; this.cur.t += dt; if (Math.hypot(W.x - p.x, W.z - p.z) > 6 || p.vehicle) this.close(false, 10); }
    // personagens fixos: animação perto, vira para o jogador, palmas para nitro/tunado
    for (const T of this.talkers) {
      const dc = Math.hypot(T.x - cam.position.x, T.z - cam.position.z); const vis = dc < 160; T.rig.model.visible = vis; T.icon.visible = vis && dc < 45 && !this.cur;
      if (!vis) continue;
      const dp = Math.hypot(T.x - p.x, T.z - p.z);
      // passeia um pouco perto do seu ponto (para quando você chega perto ou está conversando)
      if (!T.home) { T.home = [T.x, T.z]; T.wt = 3 + Math.random() * 8; }
      const busy = dp < 7 || (this.cur && this.cur.W === T) || T.clap > 0; let walking = false;
      if (!busy) {
        if (T.walkTo) { const ex = T.walkTo[0] - T.x, ez = T.walkTo[1] - T.z, dd = Math.hypot(ex, ez); if (dd < 0.3) { T.walkTo = null; T.wt = 4 + Math.random() * 9; T.h0 = T.h; } else { const st = Math.min(dd, 1.15 * dt); T.x += ex / dd * st; T.z += ez / dd * st; T.h0 = Math.atan2(ex, ez); walking = true; const y = surfaceY(T.x, T.z); T.rig.model.position.set(T.x, y, T.z); T.icon.position.x = T.x; T.icon.position.z = T.z; } }
        else if ((T.wt -= dt) <= 0) { T.wt = 2; const a = Math.random() * 6.283, rr = 1.5 + Math.random() * 4; const nx = T.home[0] + Math.cos(a) * rr, nz = T.home[1] + Math.sin(a) * rr; if (walkable(nx, nz) && !isRoad(nx, nz) && !collide({ x: nx, z: nz }, 0.6, false, 0.5)) T.walkTo = [nx, nz]; }
      } else if (T.walkTo && dp < 7) { T.walkTo = null; T.wt = 6; }
      if (!p.vehicle && dp < 3.6 && !this.cur && !T.greeted && G.started) { T.greeted = true; const v0 = pick(this.r, PERS[T.per].vibe); G.ui.pedBubble(T, v0.replace(/,$/, '!') + ' ' + (G.touch ? 'Toque em 💬 pra conversar' : 'Aperta E pra conversar')); } else if (dp > 16) T.greeted = false;
      const want = dp < 7 ? Math.atan2(p.x - T.x, p.z - T.z) : T.h0; T.h += angDiff(T.h, want) * Math.min(1, dt * 4); T.rig.model.rotation.y = T.h;
      T.icon.position.y = surfaceY(T.x, T.z) + 2.25 + Math.sin(t * 2.5 + T.x) * 0.06;
      const A = T.rig.acts; let clip = walking && A.Walk ? 'Walk' : 'Idle'; if (T.clap > 0) { T.clap -= dt; clip = 'Clapping'; }
      if (T.clip !== clip) { const a = A[clip] || A.Idle; a.reset().play(); if (T.clipA) T.clipA.crossFadeTo(a, 0.25, false); T.clipA = a; T.clip = clip; }
      if (dc < Q.animDist) T.rig.mixer.update(dt);
    }
    // reações ao nitro, ao carro tunado e ao helicóptero
    const jetOn = !v && G.jet && G.jet.on && !p.grounded && p.y - surfaceY(p.x, p.z) < 25;
    if ((v || jetOn) && this.reactCool <= 0) {
      const kind = jetOn ? 'jet' : v.boosting ? 'nitro' : v.type === 'heli' && v.air && v.y - surfaceY(v.x, v.z) < 30 ? 'heli' : v.spec.race && v.speed < 16 ? 'race' : v.tune && v.speed < 14 ? 'tuned' : null;
      if (kind) {
        const rad = kind === 'nitro' ? 30 : kind === 'heli' || kind === 'jet' ? 35 : 13; let who = null, bd = rad; const sx = v ? v.x : p.x, sz = v ? v.z : p.z;
        for (const T of this.talkers) { const d = Math.hypot(T.x - sx, T.z - sz); if (d < bd) { bd = d; who = T; } }
        if (!who) for (const c of G.crowd.peds) { if (c.mode === 'dodge' || c.mode === 'lie') continue; const d = Math.hypot(c.x - sx, c.z - sz); if (d < bd && d > 3) { bd = d; who = c; } }
        if (who) {
          this.reactCool = kind === 'tuned' ? 7 : 5; G.ui.pedBubble(who, pick(this.r, REACT[kind]));
          if (who.kind === 'talker') who.clap = 2.5; else { who.mode = 'wave'; who.t = 1.8; who.h = Math.atan2(sx - who.x, sz - who.z); }
        } else this.reactCool = 1;
      }
    }
  }
}
