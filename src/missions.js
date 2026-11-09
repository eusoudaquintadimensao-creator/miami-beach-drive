// Missões sem violência: entregas, táxi, corridas, fotos para a rede social e conchas neon
import * as THREE from 'three';
import { canvasTex, rng, pick, clamp } from './util.js';
import { groundY, LANDMARKS, SPAWNS } from './world.js';

export const POIS = [
  { name: 'Café Brisa (Ocean Drive)', x: 291, z: 120 }, { name: 'Hotel Coral', x: 189, z: -375 }, { name: 'Sorveteria Paraíso', x: 69, z: 75 },
  { name: 'Lavanderia Maré', x: 171, z: 520 }, { name: 'Galeria Neon', x: 51, z: -230 }, { name: 'Portaria da Torre Aurora', x: -429, z: 40 },
  { name: 'Balcão da Marina', x: -291, z: -20 }, { name: 'Mercado do Centro', x: -531, z: -380 }, { name: 'Loja de Surf Onda', x: 309, z: -520 },
  { name: 'Cabana dos Glades', x: -700, z: 12 }, { name: 'Portão do Farol', x: 200, z: 609 }, { name: 'Escola de Vela', x: -291, z: 330 },
  { name: 'Floricultura Hibisco', x: -651, z: 230 }, { name: 'Academia da Praia', x: 309, z: 380 }, { name: 'Estúdio de Dança Salsa', x: 69, z: -500 },
];
export const RACES = [
  { id: 'r1', name: 'Circuito Ocean Drive', start: [300, 165, 0], pts: [[300, 300], [300, 450], [300, 600], [180, 600], [60, 600], [60, 450], [60, 300], [180, 300], [180, 150], [300, 150], [300, 175]], medals: [62, 75, 92] },
  { id: 'r2', name: 'Travessia das Pontes', start: [60, 410, 0], pts: [[60, 450], [-120, 450], [-300, 450], [-300, 300], [-300, 150], [-300, 0], [-300, -150], [-300, -300], [-300, -450], [-120, -450], [60, -450], [60, -300]], medals: [88, 105, 125] },
  { id: 'r3', name: 'Rali dos Glades', start: [-680, 0, -Math.PI / 2], pts: [[-860, 0], [-860, -380], [-860, 0], [-1040, 0], [-860, 0], [-860, 380], [-860, 0], [-700, 0]], medals: [80, 95, 115] },
  { id: 'b1', name: 'Regata da Baía', boat: true, start: [-205, -50, Math.PI / 2], pts: [[-120, -150], [-60, -380], [-20, 0], [-60, 380], [-150, 250], [-140, 60], [-150, -30]], medals: [70, 85, 100] },
];
const SHELLS = [[340, -580], [360, -300], [372, 40], [345, 300], [366, 560], [100, -640], [250, 650], [-120, 446], [-120, -446], [-275, -100], [-230, 100], [-350, -60],
  [-560, -660], [-640, 660], [-700, 35], [-940, -150], [-860, 300], [-1040, -10], [535, -299], [450, -299], [120, -10], [240, 240], [-480, -300], [-600, 520]];
const PASS_LINES = ['Pode ir com calma, tô curtindo a vista! 🌴', 'Essa cidade fica linda com esse neon!', 'Toca uma música boa aí no rádio?', 'Vou postar que o motorista é top ⭐', 'Já foi no píer da praia no fim da tarde?', 'Hoje o mar tá lindo, né?', 'Adoro esses prédios coloridos da Ocean Drive!'];
const FANS = ['@sol.da.manha', '@vibe_tropical', '@neon.lover', '@praia_e_paz', '@ana.viaja', '@lucas.surf', '@mari.fotos', '@rafa_rolê'];

function iconTex(emoji, ring) {
  return canvasTex(128, 128, (g) => { g.fillStyle = ring; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(64, 64, 48, 0, 7); g.fill(); g.font = '64px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(emoji, 64, 70); }, { clamp: true });
}

export class Missions {
  constructor(G) {
    this.G = G; const scene = G.scene; this.active = null; this.cool = 0;
    this.beamGeo = new THREE.CylinderGeometry(2.2, 2.2, 36, 20, 1, true); this.beamGeo.translate(0, 18, 0);
    this.ringGeo = new THREE.TorusGeometry(6, 0.35, 8, 40);
    this.starts = [
      { type: 'entrega', name: 'Entregas Correio Solara', x: 291, z: -40, icon: '📦', col: '#ffb347' },
      { type: 'entrega', name: 'Entregas Centro', x: -291, z: 160, icon: '📦', col: '#ffb347' },
      { type: 'foto', name: 'Agência Vibez (fotos)', x: 318, z: -95, icon: '📸', col: '#ff4fb8' },
      ...RACES.map(r => ({ type: 'corrida', race: r, name: r.name, x: r.start[0], z: r.start[1], icon: r.boat ? '🚤' : '🏁', col: '#29f0ff' })),
    ];
    for (const s of SPAWNS.taxiStands) this.starts.push({ type: 'taxiPonto', name: 'Ponto de Táxi', x: s.x, z: s.z, icon: '🚕', col: '#ffd60a', passive: true });
    for (const s of this.starts) {
      const m = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: s.col, transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }));
      m.position.set(s.x, groundY(s.x, s.z), s.z); m.scale.set(0.6, 1, 0.6); scene.add(m); s.beam = m;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: iconTex(s.icon, s.col), depthTest: true, fog: false, toneMapped: false })); sp.scale.setScalar(3); sp.position.set(s.x, groundY(s.x, s.z) + 4.5, s.z); scene.add(sp); s.sprite = sp;
      if (s.passive) { m.visible = false; sp.scale.setScalar(2.2); }
    }
    // alvo atual
    this.target = new THREE.Mesh(this.beamGeo, new THREE.MeshBasicMaterial({ color: 0xffd23f, transparent: true, opacity: 0.35, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    this.target.visible = false; scene.add(this.target);
    this.ring = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0x29f0ff, toneMapped: false, transparent: true, opacity: 0.85 })); this.ring.visible = false; scene.add(this.ring);
    this.ring2 = new THREE.Mesh(this.ringGeo, new THREE.MeshBasicMaterial({ color: 0xff4fb8, toneMapped: false, transparent: true, opacity: 0.35 })); this.ring2.visible = false; this.ring2.scale.setScalar(0.7); scene.add(this.ring2);
    // conchas
    this.shells = SHELLS.map(([x, z], i) => ({ i, x, z, got: G.save.shells.includes(i) }));
    const sg = new THREE.OctahedronGeometry(0.55, 0); const smat = new THREE.MeshBasicMaterial({ color: 0x5ff6ff, toneMapped: false });
    this.shellMesh = new THREE.InstancedMesh(sg, smat, this.shells.length); this.shellMesh.frustumCulled = false; scene.add(this.shellMesh);
    this.passenger = null;
    this.r = rng(Date.now() % 100000);
  }
  get busy() { return !!this.active; }
  nearestStart(px, pz) { let b = null, bd = 1e9; for (const s of this.starts) { if (s.passive) continue; const d = Math.hypot(s.x - px, s.z - pz); if (d < bd) { bd = d; b = s; } } return { s: b, d: bd }; }
  canStart(s) {
    const v = this.G.player.vehicle;
    if (s.type === 'corrida') { if (s.race.boat) return v && v.spec.boat ? null : 'Precisa estar numa lancha (tem na marina)'; return v && !v.spec.boat ? null : 'Entre num veículo para correr'; }
    return null;
  }
  start(s) {
    const G = this.G; const why = this.canStart(s); if (why) { G.ui.toast(why); return; }
    G.audio.chime('start');
    if (s.type === 'entrega') {
      const p = this.pickPOI(250);
      this.active = { type: 'entrega', title: '📦 Entrega', dest: p, time: Math.round(Math.hypot(p.x - G.player.x, p.z - G.player.z) / 9 + 35), t: 0 };
      G.ui.toast(`Pacote coletado! Leve até <b>${p.name}</b>`);
    } else if (s.type === 'foto') this.startPhoto();
    else if (s.type === 'corrida') {
      const r = s.race; const v = G.player.vehicle; v.place(r.start[0], r.start[1], r.start[2]); G.snapCam();
      this.active = { type: 'corrida', title: (r.boat ? '🚤 ' : '🏁 ') + r.name, race: r, k: 0, t: -3, count: 3 };
      G.ui.toast('Prepare-se… 3'); G.ui.big('3');
    }
    this.setTarget();
  }
  startTaxi() {
    const G = this.G; const p = this.pickPOI(120, 450);
    this.active = { type: 'taxi', title: '🚕 Táxi', stage: 'pickup', pick: p, dest: null, hits: 0, t: 0, time: 999 };
    G.ui.toast(`Passageiro esperando em <b>${p.name}</b>`); G.audio.chime('start');
    this.spawnPassenger(p); this.setTarget();
  }
  startPhoto() {
    const G = this.G; const left = LANDMARKS.filter(l => !G.save.photos.includes(l.id)); const L = left.length ? pick(this.r, left) : pick(this.r, LANDMARKS);
    const fan = pick(this.r, FANS);
    this.active = { type: 'foto', title: '📸 Pedido da galera', dest: { name: L.name, x: L.x, z: L.z }, lm: L, fan, t: 0, time: 9999 };
    G.ui.phoneNote(fan, `Manda uma foto do(a) ${L.name}! Quero ver essa vista 😍`);
    G.ui.toast(`Vá até <b>${L.name}</b> e toque em 📷 para fotografar`);
    this.setTarget();
  }
  pickPOI(minD, maxD = 1e9) { const G = this.G; const c = POIS.filter(p => { const d = Math.hypot(p.x - G.player.x, p.z - G.player.z); return d > minD && d < maxD; }); return c.length ? pick(this.r, c) : pick(this.r, POIS); }
  spawnPassenger(p) {
    const G = this.G; if (!this.passenger) { this.passenger = G.makeNPCModel(); }
    const m = this.passenger; m.g.visible = true; m.g.position.set(p.x, groundY(p.x, p.z) + 0.16, p.z); m.g.rotation.y = Math.random() * 6;
  }
  cancel(msg) { if (!this.active) return; this.G.ui.toast(msg || 'Missão cancelada'); this.end(); }
  end() { this.active = null; this.target.visible = this.ring.visible = this.ring2.visible = false; if (this.passenger) this.passenger.g.visible = false; this.G.ui.setMission(null); this.G.setRoute(null); this.cool = 2; }
  setTarget() {
    const A = this.active; if (!A) return; let x, z;
    if (A.type === 'corrida') { const p = A.race.pts[A.k]; x = p[0]; z = p[1]; const n = A.race.pts[A.k + 1];
      this.ring.visible = true; this.ring.position.set(x, groundY(x, z) + 4 + (A.race.boat ? 0 : 0), z); const prev = A.k ? A.race.pts[A.k - 1] : A.race.start; this.ring.rotation.set(0, Math.atan2(x - prev[0], z - prev[1]), 0);
      if (A.race.boat) this.ring.position.y = 3;
      this.ring2.visible = !!n; if (n) { this.ring2.position.set(n[0], Math.max(3, groundY(n[0], n[1]) + 4), n[1]); this.ring2.rotation.set(0, Math.atan2(n[0] - x, n[1] - z), 0); }
      this.target.visible = false;
    } else { const d = A.type === 'taxi' && A.stage === 'pickup' ? A.pick : A.dest; x = d.x; z = d.z; this.target.visible = true; this.target.position.set(x, groundY(x, z), z); this.ring.visible = this.ring2.visible = false; }
    A.tx = x; A.tz = z; this.G.setRoute(A.race && A.race.boat ? null : [x, z]);
  }
  reward(money, fol, text) { const G = this.G; G.addMoney(money); G.addFollowers(fol); G.audio.chime('win'); G.ui.big('MISSÃO CONCLUÍDA'); G.ui.toast(`${text}<br><b>+$${money}</b>${fol ? ` · <b>+${fol}</b> seguidores` : ''}`); G.save.done++; G.persist(); }
  takePhoto() { // chamado quando o jogador tira foto
    const G = this.G; const px = G.player.x, pz = G.player.z;
    const L = LANDMARKS.find(l => Math.hypot(l.x - px, l.z - pz) < l.r);
    let likes = 20 + Math.floor(Math.random() * 60), fol = 0, money = 0, caption = 'Rolê por Solara Bay 🌴';
    if (L) {
      caption = `${L.name} ✨`; likes = 300 + Math.floor(Math.random() * 900);
      const nightBonus = G.env.night > 0.5 ? 1.5 : G.env.hour > 17.5 && G.env.hour < 19.5 ? 1.8 : 1; likes = Math.round(likes * nightBonus);
      if (!G.save.photos.includes(L.id)) { G.save.photos.push(L.id); fol = 120 + Math.round(likes / 8); money = 100; }
      if (this.active && this.active.type === 'foto' && this.active.lm.id === L.id) { money += 350; fol += 150; G.ui.phoneNote(this.active.fan, 'Que foto incrível!! Já compartilhei 🔥'); this.reward(money, fol, `Foto enviada: ${L.name}`); this.end(); return { likes, caption, L }; }
    }
    if (fol || money) { G.addMoney(money); G.addFollowers(fol); G.ui.toast(`Novo ponto fotografado! <b>+${fol}</b> seguidores${money ? ` · +$${money}` : ''}`); G.persist(); }
    else G.addFollowers(Math.round(likes / 40));
    return { likes, caption, L };
  }
  update(dt, t) {
    const G = this.G; const pl = G.player; const v = pl.vehicle; const A = this.active;
    this.cool = Math.max(0, this.cool - dt);
    // conchas
    const m4 = new THREE.Matrix4();
    for (const s of this.shells) {
      if (!s.got && Math.hypot(s.x - pl.x, s.z - pl.z) < (v ? 3.2 : 1.6)) { s.got = true; G.save.shells.push(s.i); G.addMoney(100); G.audio.chime('coin'); G.ui.toast(`🐚 Concha neon ${G.save.shells.length}/${this.shells.length} · +$100`); G.persist(); if (G.save.shells.length === this.shells.length) this.reward(2000, 1000, 'Você achou todas as conchas!'); }
      const y = groundY(s.x, s.z) + 1.2 + Math.sin(t * 2 + s.i) * 0.2; m4.makeRotationY(t * 1.5 + s.i).setPosition(s.x, s.got ? -999 : y, s.z); this.shellMesh.setMatrixAt(s.i, m4);
    }
    this.shellMesh.instanceMatrix.needsUpdate = true;
    for (const s of this.starts) { const dd = Math.hypot(s.x - pl.x, s.z - pl.z); s.beam.material.opacity = 0.16 * Math.min(1, Math.max(0.15, (dd - 4) / 26)); s.beam.visible = !A && !s.passive; s.sprite.visible = !A || s.passive; s.sprite.position.y = groundY(s.x, s.z) + 4.5 + Math.sin(t * 2) * 0.2; }
    if (this.passenger && this.passenger.g.visible) this.passenger.anim(dt, t);
    if (!A) { G.ui.setMission(null); return; }
    A.t += dt; this.target.material.opacity = (0.28 + Math.sin(t * 4) * 0.08) * Math.min(1, Math.max(0.2, (Math.hypot(this.target.position.x - pl.x, this.target.position.z - pl.z) - 3) / 20));
    const d = Math.hypot(A.tx - pl.x, A.tz - pl.z); const slow = !v || v.speed < 6;
    if (A.type === 'entrega') {
      const left = A.time - A.t; G.ui.setMission(A.title, `Leve o pacote até <b>${A.dest.name}</b> · ${Math.round(d)} m`, left);
      if (d < 7 && slow) { this.reward(150 + Math.round(Math.max(0, left) * 4), 15, `Entrega feita em ${A.dest.name}!`); this.end(); }
      else if (left <= 0) { G.audio.chime('fail'); this.cancel('⏱️ Tempo esgotado — o cliente vai esperar a próxima. Tente de novo!'); }
    } else if (A.type === 'taxi') {
      if (!v || v.type !== 'taxi') { this.cancel('Corrida de táxi encerrada (você saiu do táxi)'); return; }
      if (A.stage === 'pickup') {
        G.ui.setMission(A.title, `Busque o passageiro em <b>${A.pick.name}</b> · ${Math.round(d)} m`, null);
        if (d < 9 && v.speed < 1.5) { A.stage = 'board'; A.bt = 0; }
      } else if (A.stage === 'board') {
        A.bt += dt; const pg = this.passenger.g; const tx = v.x - Math.cos(v.h) * 1.4, tz = v.z + Math.sin(v.h) * 1.4;
        pg.position.x += (tx - pg.position.x) * Math.min(1, dt * 2.5); pg.position.z += (tz - pg.position.z) * Math.min(1, dt * 2.5); this.passenger.walking = true;
        G.ui.setMission(A.title, 'Passageiro embarcando…', null);
        if (A.bt > 1.6) { pg.visible = false; A.stage = 'ride'; A.dest = this.pickPOI(220, 900); A.t = 0; A.dist = Math.hypot(A.dest.x - v.x, A.dest.z - v.z); A.time = Math.round(A.dist / 8 + 40); A.hits = 0; A.chat = 6; this.setTarget(); G.ui.bubbleText('Passageiro', `Oi! Pode me levar até ${A.dest.name}?`); }
      } else if (A.stage === 'ride') {
        const left = A.time - A.t; G.ui.setMission(A.title, `Leve até <b>${A.dest.name}</b> · ${Math.round(d)} m · dirija com cuidado`, left);
        A.chat -= dt; if (A.chat <= 0) { A.chat = 14 + Math.random() * 10; G.ui.bubbleText('Passageiro', pick(this.r, PASS_LINES)); }
        if (v.hitT > 0.29) A.hits++;
        if (d < 9 && v.speed < 1.5) {
          const fare = Math.round(40 + A.dist * 0.35); const tip = Math.max(0, Math.round((left > 0 ? 60 : 0) - A.hits * 15));
          this.reward(fare + tip, 10, `Corrida concluída! Tarifa $${fare}${tip ? ` + gorjeta $${tip}` : ''}`);
          this.passenger.g.visible = true; this.passenger.g.position.set(A.dest.x, groundY(A.dest.x, A.dest.z) + 0.16, A.dest.z);
          this.active = null; setTimeout(() => { if (this.passenger) this.passenger.g.visible = false; if (!this.active && G.player.vehicle && G.player.vehicle.type === 'taxi') this.startTaxi(); }, 4500);
          this.target.visible = false; G.setRoute(null); G.ui.setMission(null);
        }
      }
    } else if (A.type === 'foto') {
      const near = d < A.lm.r;
      G.ui.setMission(A.title, near ? 'Você chegou! Toque em <b>📷</b> (ou F) para tirar a foto' : `Vá até <b>${A.dest.name}</b> · ${Math.round(d)} m`, null);
    } else if (A.type === 'corrida') {
      if (A.t < 0) { const c = Math.ceil(-A.t); if (c !== A.count) { A.count = c; G.ui.big(String(c)); G.audio.chime('coin'); } v.vx = v.vz = v.vf = 0; G.ui.setMission(A.title, 'Prepare-se…', null); return; }
      if (A.count > 0) { A.count = 0; G.ui.big('VAI!'); G.audio.chime('start'); }
      if (!v) { this.cancel('Corrida cancelada (você saiu do veículo)'); return; }
      G.ui.setMission(A.title, `Checkpoint ${A.k + 1}/${A.race.pts.length} · ${Math.round(d)} m`, null, A.t);
      this.ring.rotation.z = t * 0.5;
      if (d < (A.race.boat ? 12 : 10)) {
        A.k++; G.audio.chime('coin');
        if (A.k >= A.race.pts.length) {
          const T = A.t, [g, s, b] = A.race.medals; const medal = T <= g ? '🥇 Ouro' : T <= s ? '🥈 Prata' : T <= b ? '🥉 Bronze' : 'Concluída';
          const money = T <= g ? 600 : T <= s ? 400 : T <= b ? 250 : 150;
          const best = G.save.best[A.race.id]; if (!best || T < best) G.save.best[A.race.id] = Math.round(T * 10) / 10;
          this.reward(money, T <= g ? 80 : 30, `${A.race.name}: ${T.toFixed(1)}s · ${medal}${best && T < best ? ' · novo recorde!' : ''}`); this.end();
        } else this.setTarget();
      }
    }
  }
}
