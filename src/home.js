// Casa do jogador (Casa Solara): vila moderna à beira-mar no sul do Centro, garagem com os seus carros,
// ponto para trocar de visual, salvar o progresso e passar o tempo. Apresentação curta na 1ª visita.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { clamp, canvasTex } from './util.js';
import { surfaceY, addCircle, addBox, HOOKS } from './world.js';
import { Vehicle, SPECS, raceTune, RACE_CARS } from './vehicles.js';

export const HOME = { x: -470, z: 650, name: 'Casa Solara' };
export const HOME_ZONE = { x0: -522, x1: -418, z0: 612, z1: 718 };
export function inHomeZone(x, z, m = 0) { return x > HOME_ZONE.x0 - m && x < HOME_ZONE.x1 + m && z > HOME_ZONE.z0 - m && z < HOME_ZONE.z1 + m; }
const KEY = 'mbd-casa-v1';
const $ = (id) => document.getElementById(id);
const BAYS = [12.6, 17.2, 21.8, 28.6]; // 4ª vaga (fora, ao lado da garagem): carro presente da ponte // centros das vagas (x local); carros de frente para a rua (norte)

export class Home {
  constructor(G) {
    this.G = G; this.data = Object.assign({ intro: false, visits: 0 }, (() => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch (e) { return {}; } })());
    this.g = new THREE.Group(); this.g.position.set(HOME.x, 0, HOME.z); G.scene.add(this.g);
    this.y0 = surfaceY(HOME.x, HOME.z); this.g.position.y = this.y0;
    this.cars = []; this.state = 'idle'; this.t = 0; this.door = { x: HOME.x - 4, z: HOME.z - 10.4 };
    this.build(); this.collide();
    HOOKS.map.push((g, X, Z) => { g.fillStyle = '#ffffff'; g.fillRect(X(HOME.x - 14), Z(HOME.z - 10), 38 * 0.5, 18 * 0.5); g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText('🏠', X(HOME.x), Z(HOME.z) + 6); g.textAlign = 'left'; });
  }
  save() { try { localStorage.setItem(KEY, JSON.stringify(this.data)); } catch (e) { } }
  build() {
    const G = this.G, Q = G.Q; const B = {}; const box = (k, w, h, d, x, y, z) => { (B[k] = B[k] || []).push(new THREE.BoxGeometry(w, h, d).translate(x, y + h / 2, z).toNonIndexed()); };
    // terreno: gramado, entrada de carro, deck, calçada
    box('grass', 100, 0.06, 104, 2, 0, 15);
    box('pave', 15, 0.1, 30, 17.2, 0, -25); box('pave', 3, 0.1, 30, -4, 0, -25); box('pave', 40, 0.1, 3, 4, 0, -11.6);
    box('deck', 30, 0.18, 16, -3, 0, 17); box('stone', 18, 0.22, 7.4, -3, 0, 17);
    // casa: térreo, andar de cima em balanço, lajes finas, pilares
    box('white', 24, 3.3, 14, -2, 0, -1); box('slab', 25, 0.28, 15, -2, 3.3, -1);
    box('white', 22, 3.0, 13, -4, 3.58, 2.2); box('slab', 23.4, 0.3, 14.4, -4, 6.58, 2.2); box('wood', 6, 3.0, 0.2, -13, 3.58, -4.4); box('rail', 22, 1.0, 0.06, -4, 3.58, 9.5);
    box('wood', 8, 3.0, 0.3, 2.5, 3.58, -4.45); box('wood', 0.3, 3.3, 6, 9.8, 0, -4); 
    box('trim', 0.3, 3.3, 0.3, -14.6, 0, 8.4); box('trim', 0.3, 3.3, 0.3, 5.6, 0, 8.4);
    // vidros (acendem à noite)
    box('glass', 9, 2.4, 0.12, -8, 0.5, -8.06); box('glass', 3.2, 2.7, 0.12, -1.2, 0.2, -8.06);
    box('glass', 22, 2.3, 0.12, -4, 3.95, 8.76); box('glass', 14, 2.4, 0.12, -6, 0.5, 6.06); box('glass', 12, 2.2, 0.12, -10, 3.95, -4.36);
    box('door', 1.6, 2.5, 0.16, -4, 0.0, -8.1);
    // garagem aberta (3 vagas), parede dos fundos e lateral, teto
    box('white', 14.4, 3.6, 0.4, 17.2, 0, 4.2); box('white', 0.4, 3.6, 14.6, 24.2, 0, -2.9); box('slab', 15.2, 0.3, 15.2, 17.2, 3.6, -2.9); box('trim', 15.2, 0.5, 0.3, 17.2, 3.1, -10.4);
    box('floor', 14, 0.08, 14, 17.2, 0.02, -2.9);
    for (const x of [14.9, 19.5]) box('stripe', 0.12, 0.09, 6, x, 0.03, -4);
    // piscina com borda e muro baixo até o mar
    box('pool', 15.6, 0.16, 5.6, -3, 0.12, 17); 
    box('hedge', 100, 1.1, 1.2, 2, 0, -36.4); box('hedge', 1.2, 1.1, 104, -48.4, 0, 15); box('hedge', 1.2, 1.1, 104, 52.4, 0, 15);
    for (let i = 0; i < 6; i++) box('wood', 1.9, 0.42, 0.7, -12 + i * 3.2, 0.2, 23.6); // espreguiçadeiras
    const mats = {
      grass: new THREE.MeshStandardMaterial({ color: 0x5e9a46, roughness: 0.95 }), pave: new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.8 }),
      deck: new THREE.MeshStandardMaterial({ color: 0xa0704a, roughness: 0.7 }), stone: new THREE.MeshStandardMaterial({ color: 0xf0ebe0, roughness: 0.6 }),
      white: new THREE.MeshStandardMaterial({ color: 0xf6f3ee, roughness: 0.55 }), trim: new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.5, metalness: 0.3 }),
      wood: new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 0.6 }), door: new THREE.MeshStandardMaterial({ color: 0x3a2617, roughness: 0.5 }),
      glass: new THREE.MeshStandardMaterial({ color: 0x5f8297, roughness: 0.06, metalness: 0.35, emissive: 0xffc98a, emissiveIntensity: 0 }),
      slab: new THREE.MeshStandardMaterial({ color: 0xe9e4da, roughness: 0.6 }), rail: new THREE.MeshStandardMaterial({ color: 0xa8d8e8, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.35 }),
      floor: new THREE.MeshStandardMaterial({ color: 0x8c8f96, roughness: 0.4, metalness: 0.2 }), stripe: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      pool: new THREE.MeshStandardMaterial({ color: 0x2fd0e8, roughness: 0.05, metalness: 0.2, emissive: 0x0a7fa0, emissiveIntensity: 0.25 }),
      hedge: new THREE.MeshStandardMaterial({ color: 0x2f6b34, roughness: 0.9 }),
    };
    this.mats = mats;
    for (const k in B) { const m = new THREE.Mesh(mergeGeometries(B[k]), mats[k]); m.receiveShadow = true; m.castShadow = Q.shadows && ['white', 'slab', 'trim', 'wood', 'hedge'].includes(k); this.g.add(m); }
    // neon no beiral (rosa) e luz da garagem (ciano)
    const neon = new THREE.MeshBasicMaterial({ color: 0xff3fb4, toneMapped: false }); this.neon = neon;
    const ng = mergeGeometries([new THREE.BoxGeometry(23.4, 0.08, 0.08).translate(-4, 6.9, 9.42).toNonIndexed(), new THREE.BoxGeometry(25, 0.08, 0.08).translate(-2, 3.6, -8.55).toNonIndexed(), new THREE.BoxGeometry(15.2, 0.08, 0.08).translate(17.2, 3.9, -10.55).toNonIndexed()]);
    this.g.add(new THREE.Mesh(ng, neon));
    // placa com o nome
    const sign = canvasTex(512, 128, (g, w, h) => { g.fillStyle = '#16121f'; g.fillRect(0, 0, w, h); g.font = 'bold 64px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.shadowColor = '#ff3fb4'; g.shadowBlur = 18; g.fillStyle = '#ffd6f1'; g.fillText('CASA SOLARA', w / 2, h / 2 + 4); }, { clamp: true });
    const sm = new THREE.Mesh(new THREE.PlaneGeometry(5, 1.25), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sm.position.set(2.5, 5.1, -4.66); sm.rotation.y = Math.PI; this.g.add(sm);
    // palmeiras
    const trunkG = new THREE.CylinderGeometry(0.16, 0.26, 7, 7).translate(0, 3.5, 0); const leafG = new THREE.ConeGeometry(0.5, 3.4, 4, 1).rotateX(Math.PI / 2).scale(1, 0.18, 1).translate(0, 0, 1.6);
    const tm = new THREE.MeshStandardMaterial({ color: 0x8a6a48, roughness: 0.9 }), lm = new THREE.MeshStandardMaterial({ color: 0x3f8f3a, roughness: 0.8, side: THREE.DoubleSide });
    const palms = [[-16, 28], [10, 30], [-26, -20], [30, -30], [36, 20], [-40, 40]]; const pt = [], pl = [];
    for (const [x, z] of palms) { const s = 0.85 + ((x * 7 + z) % 5) * 0.05; pt.push(trunkG.clone().scale(s, s, s).translate(x, 0, z)); for (let i = 0; i < 7; i++) { const l = leafG.clone().rotateX(-0.45).rotateY(i / 7 * Math.PI * 2).scale(s, s, s).translate(x, 7 * s, z); pl.push(l); } addCircle(HOME.x + x, HOME.z + z, 0.5); }
    this.g.add(new THREE.Mesh(mergeGeometries(pt), tm), new THREE.Mesh(mergeGeometries(pl), lm));
    // marcador da porta (anel brilhante)
    const rm = new THREE.MeshBasicMaterial({ color: 0x7dfcff, transparent: true, opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.15, 40).rotateX(-Math.PI / 2), rm); this.ring.position.set(-4, 0.14, -10.4); this.g.add(this.ring);
    const ic = canvasTex(128, 128, (g) => { g.fillStyle = 'rgba(20,16,32,.85)'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill(); g.font = '72px "Noto Color Emoji","Apple Color Emoji",sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🏠', 64, 70); }, { clamp: true });
    this.icon = new THREE.Sprite(new THREE.SpriteMaterial({ map: ic, depthWrite: false, transparent: true })); this.icon.scale.setScalar(1.2); this.icon.position.set(-4, 2.9, -10.4); this.g.add(this.icon);
  }
  collide() {
    const X = HOME.x, Z = HOME.z;
    addBox(X - 14, Z - 8, X + 10, Z + 6, 6.9); addBox(X - 15, Z + 6, X + 7, Z + 8.7, 6.9);
    addBox(X + 10, Z + 4, X + 24.4, Z + 4.4, 3.9); addBox(X + 24, Z - 10.2, X + 24.4, Z + 4.4, 3.9);
  }
  // carros na garagem: o seu tunado, o carro de corrida escolhido e a moto (criados só quando você está perto)
  garageList() {
    const G = this.G; const T = G.save.tune; const rd = G.race && G.race.data || { car: 'rc_gt', liv: 0 };
    return [{ type: T && T.type || 'sport', tune: T ? { ...T } : { paint: 0x1f6bff, glow: 0x29f0ff, spoiler: 2, kit: true, rim: 0x1a1a1a, text: 'CASA SOLARA', style: 0, accent: 0xffffff } },
      { type: rd.car, tune: raceTune(rd.car, rd.liv || 0, 1) }, { type: 'moto', tune: undefined }].concat(G.save.giftCar ? [{ type: G.save.giftCar.type, tune: { ...G.save.giftCar.tune } }] : []);
  }
  spawnCars() {
    const G = this.G; const list = this.garageList();
    for (let i = 0; i < list.length; i++) {
      const c = this.cars[i]; const want = list[i];
      if (c && c.v && (c.v.driver || Math.hypot(c.v.x - (HOME.x + BAYS[i]), c.v.z - (HOME.z - 3)) > 30)) { if (!c.v.driver) { this.place(c.v, i); } continue; }
      if (c && c.v && c.type === want.type && JSON.stringify(c.tune) === JSON.stringify(want.tune)) continue;
      if (c && c.v && !c.v.driver) { G.vehicles.splice(G.vehicles.indexOf(c.v), 1); c.v.dispose(G.scene); }
      const v = new Vehicle(want.type, G.scene, G.Q, want.type === 'moto' ? 0x111111 : undefined, want.tune); v.home = true; v.mine = i === 0; v.parked = true; this.place(v, i); if (SPECS[want.type].race) { v.race = false; v.nitro = 1; }
      G.vehicles.push(v); this.cars[i] = { v, type: want.type, tune: want.tune };
    }
  }
  place(v, i) { v.place(HOME.x + BAYS[i], HOME.z - 3.2, Math.PI); v.y = this.y0 + 0.1; v.sync(0); }
  near() { const p = this.G.player; return !p.vehicle && Math.hypot(p.x - this.door.x, p.z - this.door.z) < 3.2; }
  update(dt, t, night, cam) {
    const d = Math.hypot(cam.position.x - HOME.x, cam.position.z - HOME.z); const vis = d < 700; this.g.visible = vis; if (!vis) return;
    this.mats.glass.emissiveIntensity = 0.05 + night * 1.6; this.mats.pool.emissiveIntensity = 0.25 + night * 1.4; this.neon.color.setHex(0xff3fb4).multiplyScalar(0.6 + night * 2);
    this.ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.25; this.icon.position.y = 2.9 + Math.sin(t * 2) * 0.12;
    const p = this.G.player; const dp = Math.hypot(p.x - HOME.x, p.z - HOME.z);
    if (dp < 240 && !this.carsT) { this.carsT = 1; this.spawnCars(); } else if (dp > 320) this.carsT = 0;
    // 1ª visita: apresentação
    if (!this.data.intro && dp < 45 && this.state === 'idle' && !this.G.paused && !this.G.race.active) this.intro();
  }
  // viagem rápida até a porta de casa
  go() {
    const G = this.G; if (G.race.active) return; if (G.talk.cur) G.talk.close(true); if (G.jet) G.jet.set(false, true);
    if (G.player.vehicle) G.leaveCar(true);
    G.placeOnFoot(this.door.x + 0.6, this.door.z - 2.6, 0); G.snapCam(); this.carsT = 0; G.ui.toast('🏠 <b>Casa Solara</b> · garagem com seus carros · entre pela porta para trocar de visual e salvar', 3600);
    this.data.visits++; this.save(); if (!this.data.intro) this.intro();
  }
  intro() {
    const G = this.G; this.state = 'intro'; this.t = 0; G.paused = true; G.homeIntro = true; document.body.classList.add('cine'); this.data.intro = true; this.save(); this.spawnCars(); this.carsT = 1;
    const el = $('homeIntro'); el.hidden = false; $('hiSkip').onclick = () => this.endIntro(); this.cap = -1;
  }
  endIntro() { const G = this.G; $('homeIntro').hidden = true; document.body.classList.remove('cine'); this.state = 'idle'; G.paused = false; G.homeIntro = false; G.snapCam(); G.ui.toast('🏠 Sua casa fica no mapa (ícone da casinha). Toque em 🏠 para voltar quando quiser.', 3800); }
  frame(dt, camera) { // câmera da apresentação
    this.t += dt; const T = this.t; const caps = ['Esta é a <b>Casa Solara</b>, a sua casa à beira-mar 🏠', 'Na <b>garagem</b> ficam os seus carros: o tunado da oficina, o de corrida e a moto 🚗', 'Entre pela <b>porta</b> para trocar de visual, passar o tempo e <b>salvar</b> 💾'];
    const ci = Math.min(2, Math.floor(T / 3)); if (ci !== this.cap) { this.cap = ci; $('hiTxt').innerHTML = caps[ci]; }
    const a = 0.55 + T * 0.2; const r = 34 - T * 0.8; const fx = ci === 1 ? 14 : -2, fz = ci === 1 ? -4 : 0;
    camera.position.set(HOME.x + fx + Math.sin(a) * r, this.y0 + 11 - T * 0.4, HOME.z + fz + Math.cos(a) * r * -1); camera.lookAt(HOME.x + fx, this.y0 + 2.5, HOME.z + fz);
    if (T > 9.2) this.endIntro();
  }
  // painel dentro de casa
  open() {
    const G = this.G; this.state = 'panel'; G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
    const h = G.env.hour; const night = h < 6 || h > 18.5;
    $('hsBody').innerHTML = `<h4>🧍 Visual</h4><div class="avPick inPhone">${G.avatarCards(G.save.avatar || 'ela')}</div>
      <h4>🚗 Garagem</h4><p class="rsInfo">Seus carros ficam nas vagas da garagem. Chegue perto e aperte ${G.touch ? '🚗' : '<b>E</b>'} para dirigir. O carro tunado muda na Oficina Neon e o de corrida no Autódromo.</p>
      <div class="gAct hsAct"><button id="hsSave" class="go">💾 Salvar progresso</button><button id="hsTime">${night ? '☀️ Dormir até de manhã' : '🌙 Descansar até a noite'}</button><button id="hsRace">🏁 Ir para o Autódromo</button><button id="hsSerp">🐍 Circuito Serpentina</button><button id="hsX">✕ Voltar ao jogo</button></div><div id="hsMsg"></div>`;
    $('homeSel').hidden = false;
    $('hsBody').querySelectorAll('.avCard').forEach(b => b.onclick = () => { G.setAvatar(b.dataset.av); $('hsBody').querySelectorAll('.avCard').forEach(c => c.classList.toggle('sel', c === b)); G.audio.chime('coin'); });
    $('hsSave').onclick = () => { G.persist(); this.data.saved = Date.now(); this.save(); $('hsMsg').textContent = '✅ Progresso salvo neste aparelho!'; G.audio.chime('win'); };
    $('hsTime').onclick = () => { G.env.setTime(night ? 7.5 : 20.2); G.persist(); this.close(); G.ui.big(night ? 'BOM DIA ☀️' : 'BOA NOITE 🌙'); };
    $('hsRace').onclick = () => { this.close(); G.race.openMenu(); };
    $('hsSerp').onclick = () => { this.close(); G.serp.go(); };
    $('hsX').onclick = () => this.close();
  }
  close() { $('homeSel').hidden = true; this.state = 'idle'; this.G.paused = false; }
}
