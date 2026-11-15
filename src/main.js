// Miami Beach Drive — Solara Bay · mundo aberto sem violência (three.js)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { clamp, lerp, angDiff, smooth } from './util.js';
import { buildWorld, SPAWNS, NODES, groundY, surfaceY, walkable, collide, rayBlock, LANDMARKS, onPier, WATER_Y, boatable, roadAt, BOUNDS } from './world.js';
import { createEnv } from './env.js';
import { Fleet } from './frota.js';
import { PalmBreak } from './palmbreak.js';
import { Breakables } from './breakables.js';
import { SeaRaces } from './marraces.js';
import { Outdoor } from './outdoor.js';
import { Gauchos } from './gauchos.js';
import { Vehicle, SPECS, setVehicleLights, MOTOR, NITRO_STAGES, DRIFT_MAX } from './vehicles.js';
import { Crowd, Hero } from './people.js';
import { Avatar, AVATARS, AVATAR_IDS, preloadAvatars, setLookSource } from './avatar.js';
import { Wardrobe } from './wardrobe.js';
import { DEVICE } from './device.js';
import { Traffic } from './traffic.js';
import { AudioSys, STATIONS } from './audio.js';
import { Missions } from './missions.js';
import { UI } from './ui.js';
import { Recorder } from './recorder.js';
import { initInstall, promptInstall } from './install.js';
import { Garage } from './garage.js';
import { Rivals } from './rivals.js';
import { Heli, HeliFleet, buildHelipad, HELIPAD } from './heli.js';
import { Plane, buildSeaplaneBase, SEAPLANE_BASE } from './plane.js';
import { Talk } from './talk.js';
import { Powers, roofAt } from './powers.js';
import { Track } from './track.js';
import { Race } from './race.js';
import { DriftFX, DriftScore } from './fx.js';
import { Home, HOME } from './home.js';
import { Bailout } from './bailout.js';
import { Jetpack } from './jetpack.js';
import { Voices } from './voice.js';
import { callCar, updateCarCall, finishCarCall, SIGNATURE } from './signature.js';
import { Serpentina } from './serpentina.js';
import { SeaBridge } from './seabridge.js';
import { BridgeFun } from './bridgefun.js';
import { Islands } from './islands.js';
import { BoatRace } from './boatrace.js';
import { MegaGarage } from './megagarage.js';
import { Boutique } from './boutique.js';
import { PaintShop } from './paintshop.js';
import { OsmGps } from './gpsosm.js';
import { BeachLife } from './beachlife.js';
import { Orla } from './orla.js';
import { setupVersions } from './versions.js';
import { buildLife } from './life.js';
import { Birds } from './birds.js';
import { Gifts } from './gifts.js';
import { Street } from './street.js';
import { DriveUI, respawnFade } from './driveui.js';
import { setupTopBar } from './topbar.js';
import { setupMsgGuard } from './msgguard.js';

const SAVE_KEY = 'mbd-solara-v1';
const $ = (id) => document.getElementById(id);
const touch = DEVICE.touch;
if (touch) document.body.classList.add('touch');
initInstall({ toast: (t) => G.ui ? G.ui.toast(t, 4000) : null });
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------- progresso salvo
const save = Object.assign({ money: 0, followers: 0, shells: [], photos: [], done: 0, best: {}, hour: 17.4, weather: 'limpo', station: 0, quality: 'auto', muted: false, sens: 1, shake: 1, pos: null, avatar: null }, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; } })());

// ---------------- qualidade
function detectQuality() {
  let gpu = '';
  try { const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : ''; } catch (e) { }
  const weak = /swiftshader|llvmpipe|software|mali-[4t]|adreno \(tm\) [3-5]\d\d|powervr|intel\(r\) hd graphics [2-5]/i.test(gpu);
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (weak || (DEVICE.mobile && (cores <= 4 || mem <= 3))) return 'low';
  if (DEVICE.mobile) return 'medium';
  if (/apple m\d|rtx|gtx|radeon|nvidia|geforce|arc /i.test(gpu)) return 'high';
  return 'medium';
}
const PRESETS = {
  low: { level: 'low', prMin: 0.55, prMax: 1, shadows: false, shadowSize: 512, bloom: false, clouds: false, env: true, peds: 40, traffic: 10, fog: 0.0019, aniso: 2, expo: 1.05, msaa: 0, viewHide: 170, detail: 360, helis: 1, talkers: 4, animDist: 45 },
  medium: { level: 'medium', prMin: 0.7, prMax: 1.5, shadows: true, shadowSize: 1024, bloom: true, clouds: true, env: true, peds: 84, traffic: 17, fog: 0.0013, aniso: 4, expo: 1, msaa: 2, viewHide: 220, detail: 620, helis: 2, talkers: 7, animDist: 70 },
  high: { level: 'high', prMin: 0.9, prMax: 2, shadows: true, shadowSize: 2048, bloom: true, clouds: true, env: true, peds: 124, traffic: 24, fog: 0.0011, aniso: 8, expo: 1, msaa: 4, viewHide: 280, detail: 1e9, helis: 3, talkers: 9, animDist: 110 },
};
// celular/tablet: menos pixels, sombras menores, menos gente e carros, menos distância de desenho
function forDevice(P) {
  const q = Object.assign({}, P, { device: DEVICE.label });
  if (DEVICE.mobile) {
    q.prMax = Math.min(q.prMax, q.level === 'low' ? 1 : DEVICE.ios ? 1.4 : 1.3); q.shadowSize = Math.min(q.shadowSize, 1024); q.msaa = 0;
    q.peds = Math.round(q.peds * 0.75); q.traffic = Math.round(q.traffic * 0.8); q.viewHide = Math.min(q.viewHide, 200);
    q.detail = Math.min(q.detail, q.level === 'low' ? 320 : 480); q.helis = Math.min(q.helis, 2); q.talkers = Math.min(q.talkers, 6); q.animDist = Math.min(q.animDist, 55);
  }
  return q;
}
const urlQ = new URLSearchParams(location.search).get('q');
const qName = (urlQ && PRESETS[urlQ]) ? urlQ : save.quality !== 'auto' && PRESETS[save.quality] ? save.quality : detectQuality();
const Q = forDevice(PRESETS[qName]);
$('qsel').value = save.quality || 'auto';
$('qsel').onchange = (e) => { save.quality = e.target.value; persist(); location.reload(); };

// ---------------- renderizador
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
let pr = Math.min(devicePixelRatio || 1, Q.prMax); renderer.setPixelRatio(pr);
renderer.setSize(innerWidth, innerHeight, false);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 0.6;
renderer.info.autoReset = false; renderer.shadowMap.enabled = Q.shadows; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.32, 6000); // t391: near maior = profundidade precisa (sem z-fighting/pisca no chão e na água) G.camera = camera;
let composer = null, bloom = null, grade = null, zoomBlur = null;
function setupComposer() {
  if (!Q.bloom) return;
  const rt = new THREE.WebGLRenderTarget(innerWidth * pr, innerHeight * pr, { type: THREE.HalfFloatType, samples: Q.msaa });
  composer = new EffectComposer(renderer, rt); composer.setPixelRatio(pr); composer.setSize(innerWidth, innerHeight);
  composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth / 2, innerHeight / 2), 0.5, 0.55, 0.86); composer.addPass(bloom);
  grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uSat: { value: 1.18 }, uCon: { value: 1.08 }, uVig: { value: 0.35 }, uWarm: { value: 0.5 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uSat, uCon, uVig, uWarm; varying vec2 vUv;
      void main(){ vec4 c = texture2D(tDiffuse, vUv); vec3 col = max(c.rgb, 0.);
        float l = dot(col, vec3(0.2126,0.7152,0.0722));
        col = mix(col*vec3(0.9,1.0,1.08), col*vec3(1.0+0.08*uWarm,1.0,1.0-0.08*uWarm), smoothstep(0.02,0.5,l));
        col = mix(vec3(l), col, uSat);
        col = 0.18*pow(col/0.18, vec3(uCon));
        float d = distance(vUv, vec2(0.5)); col *= 1. - uVig*smoothstep(0.35, 0.9, d);
        gl_FragColor = vec4(col, c.a); }`,
  }); composer.addPass(grade);
  // desfoque radial do nitro
  zoomBlur = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, uAmt: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float uAmt; varying vec2 vUv;
      void main(){ vec2 d = vUv - vec2(0.5, 0.55); float r = length(d); vec4 acc = vec4(0.); float w = 0.;
        for (int i = 0; i < 8; i++) { float k = float(i) / 7.; float s = 1. - uAmt * k * 0.09 * smoothstep(0.08, 0.6, r); acc += texture2D(tDiffuse, vec2(0.5, 0.55) + d * s); w += 1.; }
        gl_FragColor = acc / w; }`,
  }); zoomBlur.enabled = false; composer.addPass(zoomBlur);
  composer.addPass(new OutputPass());
}

// ---------------- jogo
const G = window.__G = {
  touch, scene, camera, renderer, Q, save, SAVE_KEY, paused: false, phoneOpen: false, started: false, t: 0, camYaw: Math.PI, camPitch: 0.22, camMode: 0, route: null, routeDest: null,
  tmpV: new THREE.Vector3(), showFps: false, feed: [],
  player: { x: 312, z: -150, y: 0, h: Math.PI, vy: 0, vehicle: null, grounded: true },
};
function persist() {
  try {
    const p = G.race && G.race.active && G.race.prev ? G.race.prev : G.player; save.pos = { x: +p.x.toFixed(1), z: +p.z.toFixed(1), h: +p.h.toFixed(2) };
    if (G.env) { save.hour = +G.env.hour.toFixed(2); save.weather = G.env.weather; }
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
  } catch (e) { }
}
G.persist = persist;
G.saveNow = () => { persist(); let ok = false; try { ok = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}').money === save.money; } catch (e) { } const d = new Date(); G.savedAt = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; return ok; };
G.promptInstall = () => promptInstall();
G.addMoney = (n) => { save.money += n; G.ui.stats(save.money, save.followers); };
G.addFollowers = (n) => { save.followers += n; G.ui.stats(save.money, save.followers); };

async function boot() {
  const status = (t) => { $('play').textContent = t; };
  status('Construindo a cidade…'); await nextFrame();
  G.renderer = renderer; G.world = buildWorld(scene, Q); G.palms = new PalmBreak(G, scene, G.world); G.helipad = buildHelipad(scene, Q); G.breaks = new Breakables(G, scene, G.world); G.track = new Track(scene, Q); G.Q = G.Q || Q; G.home = new Home(G);
  G.life = buildLife(G); G.birds = new Birds(G); G.gifts = new Gifts(G);
  status('Acendendo o neon…'); await nextFrame();
  G.env = createEnv(scene, renderer, Q); G.env.setTime(save.hour); G.env.weather = save.weather; G.env.cloud = save.weather === 'chuva' ? 0.85 : 0.25; G.env.rain = save.weather === 'chuva' ? 1 : 0;
  setupComposer();
  status('Chamando os moradores…'); await nextFrame();
  G.wardrobe = new Wardrobe(G); setLookSource((id) => G.wardrobe.look(id)); // roupas e trajes salvos por personagem (t408/t410)
  G.hero = new Avatar(scene, Q, save.avatar || 'ela');
  G.crowd = new Crowd(scene, Q, Q.peds);
  G.traffic = new Traffic(scene, Q, Q.traffic);
  for (const c of G.traffic.cars) if (c.type === 'moto') addRider(c);
  G.vehicles = [];
  SPAWNS.parked.forEach((s, k) => {
    const mine = k === 0 && save.tune && SPECS[save.tune.type];
    const v = new Vehicle(mine ? save.tune.type : s.type, scene, Q, k === 0 ? 0xff2d55 : undefined, mine ? save.tune : null); v.place(s.x, s.z, s.h); v.parked = true; if (mine) v.mine = true; G.vehicles.push(v);
  });
  for (const s of SPAWNS.taxiStands) { const v = new Vehicle('taxi', scene, Q); v.place(s.x, s.z, s.h); v.parked = true; G.vehicles.push(v); }
  for (const s of SPAWNS.boats) { const v = new Vehicle('boat', scene, Q); v.place(s.x, s.z, s.h); v.parked = true; G.vehicles.push(v); }
  G.fleet = new Fleet(G, SPECS); // t391: 3 lanchas de luxo, 1 iate e 3 jet skis
  G.heli = new Heli(scene, Q, { color: 0xff2d55, stripe: 0xffffff }); G.heli.place(HELIPAD.x, HELIPAD.z, -Math.PI / 2); G.vehicles.push(G.heli);
  G.seabase = buildSeaplaneBase(scene, Q); G.plane = new Plane(scene, Q); G.plane.place(SEAPLANE_BASE.x, SEAPLANE_BASE.z, SEAPLANE_BASE.h); G.vehicles.push(G.plane);
  G.helis = new HeliFleet(G, Q.helis);
  G.audio = new AudioSys(); G.audio.muted = !!save.muted; G.audio.station = save.station || 0;
  G.ui = new UI(G);
  G.rivals = new Rivals(G);
  G.missions = new Missions(G);
  G.garage = new Garage(G);
  G.talk = new Talk(G); G.powers = new Powers(G);
  G.fx = new DriftFX(scene, Q, renderer); G.drift = new DriftScore(G); G.race = new Race(G, G.track);
  G.jet = new Jetpack(G); G.voice = new Voices(G); G.street = new Street(G); G.serp = new Serpentina(G); G.ponte = new SeaBridge(G); G.ponte.fun = new BridgeFun(G, G.ponte); G.ilhas = new Islands(G, G.ponte); G.boatRace = new BoatRace(G); G.mar = new SeaRaces(G); G.ads = new Outdoor(G, scene, Q); G.gauchos = new Gauchos(G); G.mega = new MegaGarage(G); G.boutique = new Boutique(G); G.paint = new PaintShop(G); G.beach = new BeachLife(G, scene, Q); G.bail = new Bailout(G, scene); G.orla = new Orla(G, scene, Q); G.gps = new OsmGps(G, { theme: 'day', inspired: { 'Praia de Solara': 'South Beach', 'Solara Beach': 'Miami Beach', 'Ponta Sul': 'South Beach', 'Baía de Solara': 'Venetian Islands', 'Centro (Downtown)': 'Downtown Miami', 'Glades': 'Little Havana', 'Autódromo Neon': 'Hialeah', 'Circuito Serpentina': 'Coconut Grove' } }); G.ui.refreshMap(); G.drive = DriveUI.setup(G);
  G.rec = new Recorder(G, canvas, { touch, onState: (on) => { G.recording = on; setPR(on ? Math.max(pr, 0.9) : pr); } });
  G.makeNPCModel = () => Hero.random(scene, Q);
  G.feed = [['@solara.oficial', 'Bem-vindo(a) a Solara Bay! Explore, trabalhe e poste as melhores vistas 🌴', 'agora'], ...[
    ['@sol.da.manha', 'O pôr do sol do Píer da Praia hoje 🌅🔥', '2 min'], ['@neon.lover', 'Ocean Drive de noite é outro planeta 💜💙', '8 min'],
    ['@praia_e_paz', 'Alguém viu o golfinho perto da marina?? 🐬', '15 min'], ['@ana.viaja', 'Roda-gigante da Baía: vale cada minuto 🎡', '34 min'],
    ['@mari.fotos', 'Dica: a Torre Aurora fica linda refletida na baía 📸', '1 h'], ['@rafa_rolê', 'Fui nos Glades e vi garças lindas 🪶', '2 h']]];
  // posição salva
  if (save.pos && walkable(save.pos.x, save.pos.z)) { G.player.x = save.pos.x; G.player.z = save.pos.z; G.player.h = save.pos.h; }
  G.player.y = surfaceY(G.player.x, G.player.z); G.camYaw = G.player.h;
  G.ui.stats(save.money, save.followers);
  // pré-aquecimento
  G.env.update(0.016, 0, camera.position); G.env.updateEnv();
  updateCamera(0.016, true);
  renderer.compile(scene, camera);
  $('play').disabled = false; status('▶  JOGAR'); $('raceBtn').disabled = false;
  G.ready = true; window.MBD_READY = true; G.loadMs = Math.round(performance.now());
  // depois de pronto: personagens que conversam (modelo 3D carregado sob demanda)
  const idle = window.requestIdleCallback || ((f) => setTimeout(f, 200));
  idle(() => { preloadAvatars(); G.talk.spawnCast(Q.talkers).then(n => { G.castReady = n; }); });
}
G.setAvatar = (id) => { if (!AVATARS[id]) return; save.avatar = id; persist(); if (G.powers) G.powers.reset(); G.hero.setAvatar(id); updatePowBtn(); if (G.player.vehicle) seatHero(G.player.vehicle); markAvatar(); };
function markAvatar() { const cur = save.avatar || 'ela'; document.querySelectorAll('#avPick .avCard').forEach(b => { const on = b.dataset.av === cur; b.classList.toggle('sel', on); b.setAttribute('aria-checked', on); }); }
// cartões do seletor (Ela, Ele e os heróis originais)
export function avatarCards(cur) { return AVATAR_IDS.map(id => { const A = AVATARS[id]; return `<button class="avCard${A.hero ? ' hero' : ''}${cur === id ? ' sel' : ''}" data-av="${id}" data-a="av" data-v="${id}" role="radio" aria-checked="${cur === id}" title="${A.hero ? A.label + ': ' + A.powerTxt : A.label}"><img src="assets/avatars/${id}.webp" alt="${A.label}" width="96" height="128" loading="lazy"><b>${A.hero ? A.emoji + ' ' : ''}${A.label}</b><small>${A.name}</small></button>`; }).join(''); }
G.avatarCards = avatarCards; G.touch = touch;
$('avPick').innerHTML = avatarCards(save.avatar || 'ela');
function updatePowBtn() { const A = AVATARS[save.avatar || 'ela']; const b = $('bPow'); const k = G.powers && G.powers.kind; if (b) { b.hidden = !k || !touch; b.textContent = A.hero ? A.emoji : k === 'voo' ? '🚀' : k === 'escudo' ? '🛡️' : '⚡'; } }
G.updatePowBtn = updatePowBtn;
document.querySelectorAll('#avPick .avCard').forEach(b => b.onclick = () => { if (G.hero) G.setAvatar(b.dataset.av); else { save.avatar = b.dataset.av; persist(); markAvatar(); } });
markAvatar();
$('devInfo').textContent = `${DEVICE.label} · gráficos ${qName === 'low' ? 'leves' : qName === 'medium' ? 'médios' : 'altos'} (ajuste automático)`;
G.replaceVehicle = (v, tune, color) => {
  const nv = new Vehicle(v.type, scene, Q, tune ? undefined : (color ?? v.color), tune);
  nv.place(v.x, v.z, v.h); nv.nitro = v.nitro ?? 1; nv.mine = !!tune || v.mine; if (v.megaId != null && G.mega) G.mega.replaced(v, nv);
  const i = G.vehicles.indexOf(v); if (i >= 0) G.vehicles[i] = nv; else G.vehicles.push(nv);
  if (G.player.vehicle === v) { G.player.vehicle = nv; nv.driver = G.player; nv.parked = false; }
  v.dispose(scene); return nv;
};
// troca o veículo por outro TIPO no mesmo lugar (carro presente da ponte)
G.swapVehicle = (v, type, tune) => {
  const nv = new Vehicle(type, scene, Q, undefined, tune); nv.place(v.x, v.z, v.h); nv.y = v.y; nv.vx = v.vx; nv.vz = v.vz; nv.vf = v.vf || 0; nv.nitro = 1; nv.mine = true; nv.gift = true; if (SPECS[type].race) nv.race = false;
  const i = G.vehicles.indexOf(v); if (i >= 0) G.vehicles[i] = nv; else G.vehicles.push(nv);
  if (G.player.vehicle === v) { G.player.vehicle = nv; nv.driver = G.player; nv.parked = false; seatHero(nv); }
  if (G.vehicles.indexOf(v) < 0 && !v.home) v.dispose(scene); return nv;
};
// tela de prêmio: carro presente por completar uma volta inteira na ponte
G.showGift = (gifts, lt) => {
  const el = $('giftScreen'); if (!el) return; const css = (h) => '#' + h.toString(16).padStart(6, '0'); if (!Array.isArray(gifts)) gifts = [gifts]; const gift = gifts[0];
  $('giftInfo').innerHTML = `<div class="gList">${gifts.map(g => `<div><i style="background:${css(g.tune.paint)};box-shadow:0 0 8px ${css(g.tune.glow)}"></i><b>${g.name}</b><br><small>${g.desc || ''} · nitro · adesivo "${g.tune.text}"</small></div>`).join('')}</div><small>Volta em ${Math.floor(lt / 60)}:${String(Math.floor(lt % 60)).padStart(2, '0')} · os 3 ficam na <b style="display:inline;font-size:12px">garagem de prêmios</b> da sua casa 🏠 (porta aberta, salvo no seu progresso).</small>`;
  el.hidden = false; G.paused = true; G.giftOpen = true; if (document.pointerLockElement) document.exitPointerLock(); G.audio.chime && G.audio.chime('win'); G.ui.big('PRESENTE!');
  const close = (drive) => { el.hidden = true; G.paused = false; G.giftOpen = false; const v = G.player.vehicle; if (drive && v && !v.spec.boat && !v.spec.air) { G.swapVehicle(v, gift.type, { ...gift.tune }); G.ui.toast(`🎁 Você está no <b>${gift.name}</b>! Aperte <b>${touch ? '🔥' : 'Shift'}</b> para o nitro`, 3200); } };
  $('giftDrive').onclick = () => close(true); $('giftLater').onclick = () => close(false);
};
G.enterCar = (v) => { const p = G.player; p.vehicle = v; v.driver = p; v.parked = false; v.vx = v.vz = v.vf = 0; p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h; seatHero(v); G.camYaw = v.h; };
G.leaveCar = (silent) => { const p = G.player, v = p.vehicle; if (!v) return; if (v.type === 'heli' || v.type === 'plane') v.abandon = false; scene.add(G.hero.g); G.hero.g.visible = true; G.hero.g.rotation.set(0, 0, 0); G.hero.g.scale.setScalar(1); v.driver = null; v.parked = true; v.vx = v.vz = v.vf = 0; v.brakeOn = false; v.steer = 0; v.boosting = false; p.vehicle = null; p.vx = p.vz = 0; if (!silent) v.sync(0); };
G.callHeli = () => {
  const p = G.player, H = G.heli; if (G.race.active) { G.ui.toast('🏁 Termine a corrida antes de chamar o helicóptero', 2200); return false; }
  if (p.vehicle === H) { G.ui.toast('🚁 Você já está pilotando', 1600); return false; }
  if (p.vehicle) G.leaveCar(); if (G.jet.on) G.jet.set(false, true);
  // procura um lugar aberto perto (sem prédio, sem água, longe dos carros)
  let best = null; for (const r of [14, 20, 28, 36]) { for (let k = 0; k < 16 && !best; k++) { const a = p.h + k / 16 * Math.PI * 2; const x = p.x + Math.sin(a) * r, z = p.z + Math.cos(a) * r;
    if (!walkable(x, z) || groundY(x, z) < -0.2) continue; tmp.set(x, 0, z); if (collide(tmp, 6.5, false, 1)) continue;
    let clear = true; for (const o of G.vehicles.concat(G.traffic.cars)) if (o !== H && Math.hypot(o.x - x, o.z - z) < 8) { clear = false; break; } if (clear) best = [x, z]; } if (best) break; }
  if (!best) { G.ui.toast('🚁 Sem espaço para pousar aqui. Vá para um lugar mais aberto (praia, praça, estacionamento)', 3000); return false; }
  const h = Math.atan2(p.x - best[0], p.z - best[1]); const from = Math.hypot(H.x - best[0], H.z - best[1]) > 400 || H.air ? [best[0] - Math.sin(h) * 160, best[1] - Math.cos(h) * 160] : [H.x, H.z];
  G.heliCall = { x: best[0], z: best[1], h, sx: from[0], sz: from[1], t: 0, dur: 6 }; H.spool = 1;
  G.ui.toast('🚁 Helicóptero a caminho! Fique longe do ponto de pouso', 2600); G.audio.chime && G.audio.chime('start'); return true;
};
G.callCar = () => callCar(G, save.avatar || 'ela');
// ✈️ vai até o Hidroporto da Baía (a pé, ao lado do avião anfíbio); o avião volta para o píer se estiver parado longe
G.callPlane = () => {
  const p = G.player, A = G.plane; if (G.race.active) { G.ui.toast('🏁 Termine a corrida antes de ir ao hidroporto', 2200); return false; }
  if (p.vehicle === A) { // pilotando: se estiver na água/chão, taxia "instantâneo" de volta ao píer do hidroporto
    if (A.air) { G.ui.toast('✈️ Pouse primeiro (na água ou em terra plana)', 1800); return false; }
    respawnFade(() => { A.place(SEAPLANE_BASE.x, SEAPLANE_BASE.z, SEAPLANE_BASE.h); p.x = A.x; p.z = A.z; p.y = A.y; p.h = A.h; G.camYaw = A.h; G.snapCam(); G.ui.toast(`✈️ De volta ao <b>${SEAPLANE_BASE.name}</b> · ${touch ? 'toque 🚶 Sair' : 'aperte <kbd>E</kbd> para sair'}`, 2600); });
    return true; }
  if (p.vehicle && p.vehicle.spec.air && p.vehicle.air) { G.ui.toast('Pouse primeiro 🚁', 1600); return false; }
  respawnFade(() => {
    if (G.player.vehicle) G.leaveCar(true); if (G.jet.on) G.jet.set(false, true);
    if (!A.driver && (A.air || Math.hypot(A.x - SEAPLANE_BASE.x, A.z - SEAPLANE_BASE.z) > 30)) A.place(SEAPLANE_BASE.x, SEAPLANE_BASE.z, SEAPLANE_BASE.h);
    G.placeOnFoot(SEAPLANE_BASE.pier.x0 + 1.5, (SEAPLANE_BASE.pier.z0 + SEAPLANE_BASE.pier.z1) / 2, -Math.PI / 2); G.snapCam();
    G.ui.toast(`✈️ <b>${SEAPLANE_BASE.name}</b> · ${touch ? 'toque 🚗 Entrar' : 'aperte <kbd>E</kbd>'} no <b>${A.spec.name}</b> · decola e pousa na água!`, 3600);
  });
  return true;
};
MOTOR.lvl = save.motor || 0;
G.sigName = (id) => (SIGNATURE[id] || SIGNATURE.ela).name;
G.placeOnFoot = (x, z, h) => { const p = G.player; p.x = x; p.z = z; p.h = h || 0; p.y = surfaceY(x, z); p.vx = p.vz = p.vy = 0; G.hero.g.position.set(p.x, p.y, p.z); G.camYaw = p.h; };
function addRider(v) {
  const g = new THREE.Group(); const m = new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.7 });
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.26), m); t.position.set(0, 1.3, -0.25); t.rotation.x = 0.35;
  const h = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), new THREE.MeshStandardMaterial({ color: [0xff2d55, 0xffffff, 0x0a84ff, 0x111111][Math.floor(Math.random() * 4)], roughness: 0.2, metalness: 0.3 })); h.position.set(0, 1.72, -0.12);
  g.add(t, h); v.body.add(g);
}

// ---------------- rota GPS (Dijkstra nas vias)
function nearestNode(x, z) { let b = null, bd = 1e9; for (const n of NODES) { const d = (n.x - x) ** 2 + (n.z - z) ** 2; if (d < bd) { bd = d; b = n; } } return b; }
function pathNodes(a, b) {
  const dist = new Map([[a, 0]]), prev = new Map(), open = [a], done = new Set();
  while (open.length) {
    let bi = 0; for (let i = 1; i < open.length; i++) if (dist.get(open[i]) < dist.get(open[bi])) bi = i;
    const n = open.splice(bi, 1)[0]; if (n === b) break; if (done.has(n)) continue; done.add(n);
    for (const s of n.segs) { const o = s.a === n ? s.b : s.a; const d = dist.get(n) + s.len; if (d < (dist.get(o) ?? 1e12)) { dist.set(o, d); prev.set(o, n); open.push(o); } }
  }
  const out = []; let c = b; while (c) { out.unshift(c); c = prev.get(c); } return out[0] === a ? out : [a, b];
}
G.setRoute = (dest) => { G.routeDest = dest; G._rt = 0; if (!dest) G.route = null; else computeRoute(); };
function computeRoute() {
  const d = G.routeDest; if (!d) return; const p = G.player; const v = p.vehicle;
  if ((v && v.spec.boat) || Math.hypot(d[0] - p.x, d[1] - p.z) < 70) { G.route = [[p.x, p.z], d]; return; }
  const a = nearestNode(p.x, p.z), b = nearestNode(d[0], d[1]);
  G.route = [[p.x, p.z], ...pathNodes(a, b).map(n => [n.x, n.z]), d];
}

// ---------------- entrada
const keys = new Set(); const input = { mx: 0, my: 0, lookX: 0, lookY: 0, stick: null, jump: false, hb: false };
let lookT = 0;
addEventListener('keydown', (e) => {
  if (!G.started) return; const tg = e.target; if (tg && (tg.tagName === 'INPUT' || tg.tagName === 'TEXTAREA' || tg.isContentEditable)) return;
  if (G.garageOpen) { if (e.code === 'Escape') G.garage.close(false); return; } if (e.repeat && !['KeyW', 'KeyA', 'KeyS', 'KeyD'].includes(e.code)) { keys.add(e.code); return; }
  keys.add(e.code);
  if (G.orla && G.orla.busy() && !G.paused && (e.code === 'Space' || e.code === 'Enter')) { G.orla.tap(); e.preventDefault(); return; }
  if (e.code === 'KeyV' && !e.repeat && $('recPanel').hidden) { G.rec.toggle(); return; }
  if (e.code === 'Escape' && !$('recPanel').hidden) { $('recPanel').hidden = true; G.paused = false; return; }
  if (e.code === 'Escape' && G.pauseOpen) { G.closePause(); return; }
  if (e.code === 'Escape') { if (!$('bigmap').hidden) G.ui.closeMap(); else if (!$('photo').hidden) { $('photo').hidden = true; G.paused = false; } else if (G.phoneOpen) G.ui.closePhone(); else if (!document.pointerLockElement) G.openPause(); } // t400: Esc = pausa (celular continua no P)
  if (G.paused && !['KeyM', 'KeyP'].includes(e.code)) return;
  if (e.code === 'KeyE' || e.code === 'KeyF' && false) action();
  if (e.code === 'KeyT') { if (G.race.active) G.race.resetCar(); else G.respawnOnRoad(); }
  if (e.code === 'KeyC' && !e.repeat) input.kick = true;
  if (e.code === 'KeyJ' && G.started && !G.paused) G.jet.toggle();
  if (e.code === 'KeyG' && G.started && !G.paused) G.callHeli();
  if (e.code === 'KeyY' && G.started && !G.paused) G.callPlane();
  if (e.code === 'KeyB' && G.started && !G.paused) G.callCar();
  if (e.code === 'Enter') startNear();
  if (e.code === 'KeyF') photo();
  if (e.code === 'KeyX' && G.started && !G.paused) G.powers.trigger();
  if (e.code === 'KeyH') horn();
  if (e.code === 'KeyL' && G.started && !G.paused) G.street.flash();
  if (e.code === 'KeyK' && G.started && !G.paused) G.serp.go();
  if (e.code === 'KeyO' && G.started && !G.paused) G.ponte.go();
  if (e.code === 'KeyZ' && G.started && !G.paused && G.player.vehicle && !G.player.vehicle.spec.air && !G.player.vehicle.spec.boat) G.setNeutral();
  if (e.code === 'KeyR') G.radioSet(G.audio.station + 1);
  if (e.code === 'KeyM') { $('bigmap').hidden ? G.ui.openMap() : G.ui.closeMap(); }
  if (e.code === 'KeyP') { G.phoneOpen ? G.ui.closePhone() : G.ui.openPhone(); }
  if (e.code === 'KeyC') cycleCam();
  if (e.code === 'Space' || e.code.startsWith('Arrow')) e.preventDefault();
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());
canvas.addEventListener('click', () => { if (G.started && !touch && !G.paused && !document.pointerLockElement && canvas.requestPointerLock) { try { const r = canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { } } });
let dragging = false, lastMX = 0, lastMY = 0;
canvas.addEventListener('mousedown', (e) => { dragging = true; lastMX = e.clientX; lastMY = e.clientY; });
addEventListener('mouseup', () => dragging = false);
addEventListener('mousemove', (e) => {
  if (!G.started || G.paused) return;
  let dx = 0, dy = 0; if (document.pointerLockElement === canvas) { dx = e.movementX; dy = e.movementY; } else if (dragging && !touch) { dx = e.clientX - lastMX; dy = e.clientY - lastMY; lastMX = e.clientX; lastMY = e.clientY; }
  if (dx || dy) { G.camYaw -= dx * 0.0028 * save.sens; G.camPitch = clamp(G.camPitch + dy * 0.0024 * save.sens, -0.35, 1.1); lookT = 1.6; }
});
// toque: joystick e olhar
const stickEl = $('stick'), knob = $('knob'); let stickId = null, stickO = null; const looks = new Map();
$('stickZone').addEventListener('pointerdown', (e) => { if (stickId !== null) return; stickId = e.pointerId; stickO = [e.clientX, e.clientY]; const zr = $('stickZone').getBoundingClientRect(); stickEl.style.left = (e.clientX - zr.left) + 'px'; stickEl.style.top = (e.clientY - zr.top) + 'px'; stickEl.style.opacity = 1; $('stickZone').setPointerCapture(e.pointerId); e.preventDefault(); });
$('stickZone').addEventListener('pointermove', (e) => { if (e.pointerId !== stickId) return; let dx = e.clientX - stickO[0], dy = e.clientY - stickO[1]; const d = Math.hypot(dx, dy), R = 55, DEAD = 0.14;
  // zona morta RADIAL (input-systems): abaixo de 14% zera; depois reescala o círculo todo, para diagonal não ficar mais rápida
  if (d < 1e-6 || d / R < DEAD) { input.stick = [0, 0]; knob.style.transform = ''; return; }
  const t = (Math.min(d, R) / R - DEAD) / (1 - DEAD), nx = dx / d, ny = dy / d;
  knob.style.transform = `translate(${nx * t * R}px,${ny * t * R}px)`; input.stick = [nx * t, -ny * t]; });
const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; input.stick = null; knob.style.transform = ''; stickEl.style.opacity = ''; stickEl.style.left = ''; stickEl.style.top = ''; };
$('stickZone').addEventListener('pointerup', stickEnd); $('stickZone').addEventListener('pointercancel', stickEnd);
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; looks.set(e.pointerId, [e.clientX, e.clientY]); });
canvas.addEventListener('pointermove', (e) => { const l = looks.get(e.pointerId); if (!l || G.paused) return; const dx = e.clientX - l[0], dy = e.clientY - l[1]; l[0] = e.clientX; l[1] = e.clientY; G.camYaw -= dx * 0.006 * save.sens; G.camPitch = clamp(G.camPitch + dy * 0.004 * save.sens, -0.35, 1.1); lookT = 1.6; });
const lookEnd = (e) => looks.delete(e.pointerId); canvas.addEventListener('pointerup', lookEnd); canvas.addEventListener('pointercancel', lookEnd);
const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.audio && G.audio.init(); b.classList.add('on'); on && on(); }); const up = () => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
// Entrar: 1º toque chama o veículo (para ~5 m à frente); o próximo toque entra. No carro, toque aceita racha (50 m) ou desce.
{
  const b = $('bAct'); let actN = 0, actT = 0;
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.audio && G.audio.init(); b.classList.add('on'); });
  const actUp = () => { b.classList.remove('on'); };
  b.addEventListener('pointercancel', actUp); b.addEventListener('pointerleave', actUp);
  b.addEventListener('pointerup', (e) => {
    actUp(); e.preventDefault(); e.stopPropagation();
    if (!G.started || G.paused) return;
    const instant = !!(G.player.vehicle || G.talk.cur || G.race.active);
    actN++;
    if (actN === 1) {
      actN = 0; void instant; void actT; onActTap(1); // 1º toque chama, o próximo entra (sem toque duplo)
    }
  });
}
hold('bJump', () => { input.jump = true; input.hb = true; }, () => { input.hb = false; });
hold('bPhoto', () => photo()); hold('bHorn', () => horn()); hold('bStart', () => startNear());
hold('bNitro', () => { input.nitro = true; }, () => { input.nitro = false; });
// t367: Neutro (ponto morto) — liga/desliga; na largada do racha, acelere em ponto morto e solte no VAI para a largada perfeita
G.setNeutral = (on) => { input.neutral = on == null ? !input.neutral : !!on; const b = $('bNeutral'); if (b) b.classList.toggle('on', input.neutral); if (G.started) G.ui.toast(input.neutral ? '⚙️ <b>Neutro</b> · motor solto: acelere para subir o giro' : '⚙️ Engatado', 1300); };
$('bNeutral').onclick = (e) => { e.stopPropagation(); G.setNeutral(); }; $('bNeutral').addEventListener('pointerdown', (e) => e.stopPropagation());
hold('bDown', () => { input.down = true; }, () => { input.down = false; });
hold('bPow', () => G.powers.trigger());
hold('bReset', () => G.race.resetCar());
$('bRec').onclick = () => { G.audio.init(); G.rec.toggle(); };
$('rpClose').onclick = () => { $('recPanel').hidden = true; G.paused = false; };
// t401: carro batido/parado/preso + toque no Freio = volta para a pista na posição e direção certas (racha: último portão; fora: faixa da rua mais próxima)
let stopT = 0, lastHitT = -99, brTapSeen = 0, brTapPrevT = -99;
function onRoadNow(x, z) { const rd = roadAt(x, z); return rd && rd.seg && rd.d <= (rd.seg.w || 7) + 1; }
function roadRespawnPose(v) {
  const S = G.street && G.street.race;
  if (S) { const P = [[S.sx, S.sz], ...S.cps]; const k = Math.min(S.k, P.length - 1); const a = P[k], b = P[Math.min(k + 1, P.length - 1)]; let h = Math.atan2(b[0] - a[0], b[1] - a[1]); if (a === b) h = v.h; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const d = Math.min(6, L * 0.3); return { x: a[0] + Math.sin(h) * d, z: a[1] + Math.cos(h) * d, h, why: 'race' }; }
  const rd = roadAt(v.x, v.z); if (!rd || !rd.seg) return null; const sg = rd.seg, zA = sg.axis === 'z';
  const lo = zA ? Math.min(sg.a.z, sg.b.z) : Math.min(sg.a.x, sg.b.x), hi = zA ? Math.max(sg.a.z, sg.b.z) : Math.max(sg.a.x, sg.b.x);
  const t = clamp(zA ? v.z : v.x, lo + 3, hi - 3);
  const fwd = zA ? (Math.cos(v.h) >= 0 ? 1 : -1) : (Math.sin(v.h) >= 0 ? 1 : -1); const h = zA ? (fwd > 0 ? 0 : Math.PI) : (fwd > 0 ? Math.PI / 2 : -Math.PI / 2);
  const fx = Math.sin(h), fz = Math.cos(h), lane = Math.min(3.2, (sg.w || 7) * 0.3); // faixa da direita de quem segue
  const cx = zA ? sg.a.x : t, cz = zA ? t : sg.a.z;
  return { x: cx - fz * lane, z: cz + fx * lane, h, why: 'road' };
}
function respawnOnRoad(v) {
  if (G.race && G.race.active) { G.race.resetCar(); return true; }
  const P = roadRespawnPose(v); if (!P) return false; const p = G.player;
  respawnFade(() => { v.place(P.x, P.z, P.h); v.vx = v.vz = v.vf = 0; v.drifting = false; v.swD = false; v.recover = 1; v.yawV = 0; v.hitT = 0; p.x = v.x; p.z = v.z; p.h = v.h; G.camYaw = v.h; G.snapCam(); stopT = 0; lastHitT = -99; G.ui.toast(P.why === 'race' ? '↺ De volta ao racha, no último portão' : '↺ De volta à rua', 1500); });
  G.lastRespawn = P; return true;
}
function stuckCheck(dt) {
  const v = G.player.vehicle; if (!v || v.spec.boat || v.spec.air || v.type === 'heli' || v.type === 'plane') { stopT = 0; brTapSeen = DriveUI.brakeTaps || 0; return; }
  if (v.hitT > 0) lastHitT = G.t;
  stopT = Math.abs(v.speed || 0) < 0.8 ? stopT + dt : 0;
  const n = DriveUI.brakeTaps || 0; if (n === brTapSeen) return; brTapSeen = n;
  const dbl = G.t - brTapPrevT < 0.8; brTapPrevT = G.t;
  if (stopT > 1 && (G.t - lastHitT < 8 || !onRoadNow(v.x, v.z) || dbl || (G.street && G.street.race))) respawnOnRoad(v);
}
G.respawnOnRoad = () => G.player.vehicle && respawnOnRoad(G.player.vehicle);
// t400: ⏸ Pausa (menu Continuar / Voltar ao modo anterior / Configurações / Controles) e ↩ Voltar direto
function backInfo() {
  const p = G.player, v = p.vehicle;
  if (G.race && G.race.active) return { label: '🏳️ Sair da corrida', go: () => G.race.askQuit() };
  if (G.street && G.street.race) return { label: '🏳️ Sair do racha', go: () => G.street.end(false, '🏳️ Você saiu do racha') };
  if (G.ponte && G.ponte.on) return { label: '🏳️ Sair da Ponte do Mar', go: () => G.ponte.quit() };
  if (G.boatRace && G.boatRace.race) return { label: '🏳️ Sair da regata', go: () => G.boatRace.end(false, '🏳️ Você saiu da regata') };
  if (G.mar && G.mar.race) return { label: '🏳️ Sair da corrida no mar', go: () => G.mar.end(false, '🏳️ Você saiu da corrida no mar') };
  if (G.missions && G.missions.active) return { label: '↩ Cancelar missão', go: () => G.missions.cancel() };
  if (v) return { label: v.spec.boat ? '↩ Sair do barco' : v.type === 'heli' || v.type === 'plane' ? '↩ Sair da aeronave' : '↩ Sair do veículo', go: () => exitVehicle(), veh: true };
  return null;
}
G.backInfo = backInfo;
{
  const ic = $('icons');
  const mk = (id, txt, title) => { const b = document.createElement('button'); b.id = id; b.textContent = txt; b.title = title; b.setAttribute('aria-label', title); return b; };
  const bP = mk('bPause', '⏸', 'Pausar (Esc)'), bB = mk('bBack', '↩', 'Voltar ao modo anterior'); bB.hidden = true; ic.prepend(bP, bB);
  const pm = document.createElement('div'); pm.id = 'pauseMenu'; pm.hidden = true;
  pm.innerHTML = '<div class="pmBox"><b>⏸ Pausado</b><button data-k="go">▶ Continuar</button><button data-k="back" hidden></button><button data-k="cfg">⚙️ Configurações</button><button data-k="ctl">🎮 Controles</button></div>';
  document.body.appendChild(pm);
  G.openPause = () => { if (!G.started || G.phoneOpen || G.garageOpen) return; const bi = backInfo(); const bb = pm.querySelector('[data-k=back]'); bb.hidden = !bi; if (bi) bb.textContent = bi.label; pm.hidden = false; G.paused = true; G.pauseOpen = true; G.audio.setHold(true); if (document.pointerLockElement) document.exitPointerLock(); };
  G.closePause = () => { if (pm.hidden) return; pm.hidden = true; G.pauseOpen = false; G.paused = false; G.audio.setHold(document.hidden); };
  document.addEventListener('visibilitychange', () => G.audio.setHold(document.hidden || G.pauseOpen)); // aba escondida também fica em silêncio
  pm.addEventListener('pointerdown', e => e.stopPropagation());
  pm.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) { if (e.target === pm) G.closePause(); return; } e.stopPropagation(); const k = b.dataset.k; G.closePause();
    if (k === 'back') { const bi = backInfo(); if (bi) bi.go(); } else if (k === 'cfg') G.ui.openPhone('ajustes'); else if (k === 'ctl') G.drive && G.drive.openSettings(); });
  bP.addEventListener('pointerdown', e => e.stopPropagation()); bB.addEventListener('pointerdown', e => e.stopPropagation());
  bP.onclick = (e) => { e.stopPropagation(); G.audio.init(); G.pauseOpen ? G.closePause() : G.openPause(); };
  bB.onclick = (e) => { e.stopPropagation(); G.audio.init(); const bi = backInfo(); if (bi) bi.go(); };
  setInterval(() => { const bi = G.started && !G.paused ? backInfo() : null; const want = !!bi; /* t414: ↩ também no carro (sai do veículo) */ if (bB.hidden === want) bB.hidden = !want; if (bi) bB.title = bi.label.replace(/^\S+\s/, ''); }, 400);
}
{ // t399: atalhos recolhíveis (paisagem começa recolhido para não cobrir a cidade); lembra a escolha
  const qk = 'quickMin-v1', qb = $('qMore'), qd = $('quick');
  const apply = (m) => { qd.classList.toggle('min', m); qb.textContent = m ? '▦' : '✕'; qb.title = m ? 'Mostrar atalhos' : 'Ocultar atalhos'; };
  const pref = () => { const v = localStorage.getItem(qk); return v === null ? innerWidth > innerHeight : v === '1'; };
  apply(pref()); addEventListener('resize', () => { if (!G.topBar && localStorage.getItem(qk) === null) apply(innerWidth > innerHeight); });
  qb.onclick = (e) => { e.stopPropagation(); const m = !qd.classList.contains('min'); localStorage.setItem(qk, m ? '1' : '0'); apply(m); };
}
setupTopBar(G); setupMsgGuard(G); // t413/t416: textos nunca sobre o carro/estrada · t405: todos os atalhos numa fita de vidro no topo (substitui o recolher do t399)
$('bPhone').onclick = () => G.phoneOpen ? G.ui.closePhone() : G.ui.openPhone(); $('bMap').onclick = () => G.ui.openMap(); $('bRadio').onclick = () => { G.audio.init(); G.radioSet(G.audio.station + 1); }; $('bCam').onclick = () => cycleCam();
function cycleCam() { G.camMode = (G.camMode + 1) % 3; G.ui.toast(['Câmera normal', 'Câmera distante', 'Câmera próxima'][G.camMode], 1400); }
G.radioSet = (i) => { const st = G.audio.setStation(i); save.station = G.audio.station; G.ui.radio(st); persist(); };
function horn() { if (!G.player.vehicle) return; G.audio.horn(); const p = G.player; for (const c of G.crowd.peds) if (Math.hypot(c.x - p.x, c.z - p.z) < 14 && c.mode !== 'dodge' && c.mode !== 'lie') { c.mode = 'wave'; c.t = 1.5; c.h = Math.atan2(p.x - c.x, p.z - c.z); } }
let photoReq = false;
function photo() { if (!G.started || G.paused) return; photoReq = true; G.audio.chime('photo'); }

// ---------------- entrar e sair
// t398: só o veículo MAIS PERTO, medido até a lateral/porta (borda da carroceria), até ~3,5 m; sem prioridade por tipo, sem buscar longe
const ENTER_R = 3.5, ENTER_R_BOAT = 4.5;
function doorDist(v, x, z) {
  const cs = v.circles(); if (!cs.length) return 1e9; // no ar
  const r = v.type === 'plane' ? Math.max(1.5, (v.spec.w || 3) * 0.5 - 1) : v.type === 'heli' ? 1.4 : Math.min(v.spec.w || 1.8, 3.2) * 0.5;
  let d = 1e9; for (const c of cs) d = Math.min(d, Math.hypot(c[0] - x, c[1] - z));
  return Math.max(0, d - r);
}
function enterRange(v) { return v.type === 'plane' ? 5 : v.spec.boat ? ENTER_R_BOAT : ENTER_R; } // hidroavião na água: embarca do píer pela asa
function nearestVehicle() {
  if (G.bail && G.bail.mode && G.bail.mode !== 'roll') return null; // no ar ou nadando: nada para entrar
  const p = G.player, C = G.carCall; let best = null, bd = 1e9;
  for (const v of G.vehicles) {
    if (v.driver || v.noEnter || v.air) continue;
    if (Math.hypot(v.x - p.x, v.z - p.z) > 16) continue;
    if (C && C.v === v && C.t < C.dur) continue; // chamado ainda chegando: só depois de parar
    const d = doorDist(v, p.x, p.z); if (d <= enterRange(v) && d < bd) { bd = d; best = v; }
  }
  // o seu veículo chamado para ~5-7 m à frente: alcance um pouco maior, mas SÓ se não houver outro ao alcance
  const sc = G.sigCar; if (!best && sc && !sc.driver && !(C && C.v === sc) && G.vehicles.indexOf(sc) >= 0 && doorDist(sc, p.x, p.z) <= 6) best = sc;
  return best;
}
G.nearestVehicleObj = nearestVehicle; G.doorDist = doorDist;
function onActTap(n) {
  if (!G.started || G.paused) return; G.audio.init();
  if (G.race.active && n === 1) { G.race.askQuit(); return; }
  const p = G.player;
  if (G.talk.cur) { G.talk.next(); return; }
  if (p.vehicle) {
    if (G.ponte && G.ponte.canAccept()) { G.ponte.accept(); return; } // aceitar a sessão da ponte (até 50 m do pórtico)
    if (G.boatRace && G.boatRace.canAccept() && !G.boatRace.declined) { G.boatRace.accept(); return; }
    if (G.mar && G.mar.canAccept() && !G.mar.declined) { G.mar.accept(); return; } // t391: corrida no mar aberto
    const near = G.street && !G.street.race && G.street.nearRival(50);
    if (near) { G.street.flash(); return; }
    if (n === 1) exitVehicle();
    return;
  }
  // a pé: se há carro para entrar (o chamado, chegando ou parado perto, ou outro ao lado) entra; senão chama
  if (G.orla && G.orla.act()) return; // academia, eventos e pedidos da orla
  if (G.mega && G.mega.act()) return; // perto de um carro à venda na Mega Garagem = comprar
  if (G.boutique && G.boutique.act()) return; // dentro das lojas da orla = catálogo
  if (nearestVehicle()) { enterNearest(); return; } // t398: sempre o mais perto (o chamado não passa na frente)
  const C = G.carCall; // chamado chegando e nada ao alcance: termina a chegada e entra só se ele parar ao alcance
  if (C && C.v && !C.v.driver) { finishCarCall(G); const v = nearestVehicle(); if (v) enterVehicle(v); else G.ui.toast(`🚘 ${C.v.sigName || C.v.spec.name} parou ali · chegue perto da porta para entrar`, 2200); return; }
  if (G.home.near()) { G.home.open(); return; }
  const npc = G.talk.cool > 0 ? null : G.talk.nearest(); if (npc) { G.talk.open(npc); return; }
  if (G.callCar()) {
    const near = G.street && G.street.nearRival(50);
    G.ui.toast(near ? '🚘 Veículo a caminho · toque de novo para entrar, depois 🏁 para aceitar o racha (até 50 m)' : '🚘 Seu veículo vem parar à sua frente · toque de novo para entrar', 2600);
  }
}
function enterNearest() {
  const p = G.player;
  if (p.vehicle) return;
  const v = nearestVehicle(); const npc = G.talk.cool > 0 ? null : G.talk.nearest();
  if (npc && (!v || Math.hypot(npc.x - p.x, npc.z - p.z) < Math.hypot(v.x - p.x, v.z - p.z) - 1)) { G.talk.open(npc); return; }
  if (!v) { G.ui.toast('Nenhum veículo por perto para entrar. Toque uma vez para chamar o seu 🚘', 2200); return; }
  enterVehicle(v);
}
function airToast(v) {
  if (v.type === 'heli') { G.ui.toast(`🚁 <b>${v.spec.name}</b> · ` + (touch ? 'joystick anda e gira · ⤒ sobe · ⤓ desce · soltou, ele paira' : 'W/S frente e ré · A/D gira · Espaço sobe · Shift desce'), 5000); return true; }
  if (v.type === 'plane') { G.ui.toast(`✈️ <b>${v.spec.name}</b> · ` + (touch ? '⤒ acelera · joystick ↑ sobe, ↓ desce, lados = curva · ⤓ reduz' : 'Espaço acelera · Shift reduz · W sobe o nariz · S desce · A/D curva'), 6000); return true; }
  return false;
}
function enterVehicle(v) {
  const p = G.player; if (p.vehicle || !v || v.driver) return; if (G.bail && G.bail.mode) { if (G.bail.mode !== 'roll') return; G.bail.cancel(); }
  p.vehicle = v; v.driver = p; v.parked = false; v.vx = v.vz = v.vf = 0;
  seatHero(v);
  if (airToast(v)) { } else
  G.ui.toast(`${v.spec.name}${v.type === 'taxi' ? ' · aperte <b>Iniciar</b> para buscar passageiros' : (touch ? ' · deslize para cima: nitro · para baixo: drift' : '')}`, 2400);
  if (STATIONS[G.audio.station].bpm) G.ui.radio(STATIONS[G.audio.station]);
  G.camYaw = v.h;
}
function action() {
  if (!G.started || G.paused) return; G.audio.init();
  const p = G.player;
  if (G.race.active) { G.race.askQuit(); return; }
  if (p.vehicle && G.ponte && G.ponte.canAccept()) { G.ponte.accept(); return; } // E perto do pórtico = aceitar a sessão da ponte
  if (p.vehicle && G.boatRace && G.boatRace.canAccept() && !G.boatRace.declined) { G.boatRace.accept(); return; }
  if (p.vehicle && G.mar && G.mar.canAccept() && !G.mar.declined) { G.mar.accept(); return; }
  if (p.vehicle && G.street && !G.street.race && G.street.nearRival(50)) { G.street.flash(); return; } // E perto de um rival = iniciar corrida de rua
  if (p.vehicle) return exitVehicle();
  if (G.orla && G.orla.act()) return; // E na orla: treinar, gorjeta, roda, pedidos
  if (G.mega && G.mega.act()) return; // E perto de um carro da Mega Garagem = comprar
  if (G.boutique && G.boutique.act()) return;
  if (G.talk.cur) { G.talk.next(); return; }
  if (G.home.near()) { G.home.open(); return; }
  const v = nearestVehicle(); const npc = G.talk.cool > 0 ? null : G.talk.nearest();
  if (npc && (!v || Math.hypot(npc.x - p.x, npc.z - p.z) < Math.hypot(v.x - p.x, v.z - p.z) - 1)) { G.talk.open(npc); return; }
  if (!v) { G.ui.toast('Ninguém nem nenhum veículo por perto. Procure um carro 🚗 ou alguém com 💬', 2000); return; }
  p.vehicle = v; v.driver = p; v.parked = false; v.vx = v.vz = v.vf = 0;
  seatHero(v);
  if (airToast(v)) { } else
  G.ui.toast(`${v.spec.name}${v.type === 'taxi' ? ' · aperte <b>Iniciar</b> para buscar passageiros' : ''}`, 2400);
  if (STATIONS[G.audio.station].bpm) G.ui.radio(STATIONS[G.audio.station]);
  G.camYaw = v.h;
}
// avatar sentado no banco do motorista (visível pelos vidros), em pé na lancha
const SEAT = { sport: [0.4, -0.3, -0.45], sedan: [0.4, -0.12, -0.35], taxi: [0.4, -0.12, -0.35], classic: [0.36, -0.12, -0.3], suv: [0.42, 0.15, -0.2], moto: [0, 0.42, -0.32], heli: [-0.42, 0.72, 1.0], plane: [0.3, 1.55, 0.75] };
function seatHero(v) {
  const g = G.hero.g; v.body.add(g); g.rotation.set(0, 0, 0); g.visible = true; G.powers.reset(); g.scale.setScalar(Math.min(1, 1.8 / ((G.hero.def && G.hero.def.height) || 1.75)));
  if (v.spec.boat && v.spec.seat) { const s = v.spec.seat; g.position.set(s[0], s[1], s[2]); } else if (v.spec.boat) g.position.set(0, 0.82, -0.2); else { const s = v.spec.seat || SEAT[v.type] || SEAT.sedan; g.position.set(s[0], s[1], s[2]); }
  G.hero.pose(v.spec.boat && !v.spec.sit ? 'idle' : 'drive', 0, 0.3);
}
function exitVehicle() {
  const p = G.player, v = p.vehicle; if (!v) return;
  if (G.bail && G.bail.tryStart(v)) return; // t390: pular do carro andando (rolamento) ou saltar de paraquedas da aeronave no ar
  if (v.type === 'plane') { if (v.air || v.speed > 3) { G.ui.toast('Pouse e pare primeiro: ⤓ reduz a manete ✈️', 1800); return; } }
  else if (v.type === 'heli') { if (v.air || v.speed > 3) { G.ui.toast('Pouse primeiro: segure ' + (touch ? '⤓' : 'Shift') + ' para descer 🚁', 1800); return; } }
  else if (v.speed > 6 && !v.spec.boat) { G.ui.toast('Pare o veículo para descer', 1500); return; }
  const [fx, fz] = v.fwd(); let spot = null;
  const sd = v.type === 'heli' ? 2.6 : 1.8; const tries = v.spec.boat ? [] : [[-fz * -sd, fx * -sd], [fz * -sd, -fx * -sd], [fx * 3.2, fz * 3.2], [-fx * 3.4, -fz * 3.4], [-fx * 7.5, -fz * 7.5]];
  for (const [ox, oz] of tries) { const x = v.x + ox, z = v.z + oz; if (walkable(x, z)) { spot = [x, z]; break; } }
  if (v.spec.boat || (v.type === 'plane' && !spot)) { for (let r = 3; r < (v.type === 'plane' ? 18 : 12) && !spot; r += 1) for (let a = 0; a < 16; a++) { const x = v.x + Math.cos(a / 16 * Math.PI * 2) * r, z = v.z + Math.sin(a / 16 * Math.PI * 2) * r; if (walkable(x, z)) { spot = [x, z]; break; } } }
  if (!spot) { G.ui.toast(v.spec.boat ? 'Encoste a lancha num píer ou na praia para descer ⚓' : v.type === 'plane' ? 'Taxie até um píer ou a praia para descer ✈️ (ou toque ✈️ para voltar ao hidroporto)' : 'Sem espaço para descer aqui', 2600); return; }
  if (G.missions.active && (G.missions.active.type === 'corrida' || G.missions.active.type === 'taxi')) G.missions.cancel(G.missions.active.type === 'taxi' ? 'Corrida de táxi encerrada' : 'Corrida cancelada');
  scene.add(G.hero.g); G.hero.g.visible = true; G.hero.g.rotation.set(0, 0, 0); G.hero.g.scale.setScalar(1);
  p.x = spot[0]; p.z = spot[1]; p.y = surfaceY(p.x, p.z); p.h = v.h; v.driver = null; v.parked = true; p.vehicle = null; v.brakeOn = false; v.steer = 0; p.vx = p.vz = 0;
  if (!v.spec.boat) { v.vx = v.vz = v.vf = 0; }
}
function startableNear() {
  const p = G.player; const ms = G.missions; if (ms.active || ms.cool > 0 || G.race.active) return null;
  const v = p.vehicle; if (v && v.type === 'taxi') return { taxi: true, name: 'Corridas de táxi' };
  const { s, d } = ms.nearestStart(p.x, p.z); if (s && d < (v ? 9 : 5)) return s; return null;
}
function startNear() { if (!G.started || G.paused) return; const s = startableNear(); if (!s) return; G.audio.init(); if (s.taxi) G.missions.startTaxi(); else G.missions.start(s); }

// ---------------- atualização do jogador
const tmp = new THREE.Vector3();
let trauma = 0; G.shake = (v) => { trauma = Math.min(1, Math.max(trauma, v)); };
G.shakeAmt = () => trauma; // testes
function updatePlayer(dt) {
  const p = G.player, v = p.vehicle, hero = G.hero;
  if (G.orla && G.orla.drive(dt)) return; // treinando na academia da orla
  let mx = 0, my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  let mag = Math.min(1, Math.hypot(mx, my)); let fromStick = false;
  if (input.stick) { mx = input.stick[0]; my = input.stick[1]; mag = Math.min(1, Math.hypot(mx, my)); fromStick = true; }
  if (G.bail && G.bail.mode) { if (v) G.bail.cancel(); else if (G.bail.drive(dt, mx, my, input)) { DriveUI.setDriving(false); G.engine = null; G.skid = 0; return; } }
  if (v) {
    const mobileDrive = touch && !v.spec.air;
    if (mobileDrive) DriveUI.setDriving(true, v); else if (!v || v.spec.air) DriveUI.setDriving(false, v);
    if (mobileDrive) DriveUI.tick(dt);
    let steer = mx, thr = my;
    if (fromStick && !mobileDrive) { steer = Math.sign(mx) * Math.min(1, Math.abs(mx) * 1.25) ** 1.4; thr = Math.abs(my) < 0.18 ? 0 : my; }
    let hb = keys.has('Space') || input.hb; let nitro = keys.has('ShiftLeft') || keys.has('ShiftRight') || keys.has('KeyN') || input.nitro;
    let hardBrake = false, limit = 1, kick = !!input.kick; input.kick = false;
    if (mobileDrive) {
      const d = DriveUI.input();
      steer = d.x; thr = d.y; hb = hb || d.hb; nitro = nitro || d.nitro; hardBrake = d.hardBrake; limit = d.limit; kick = kick || d.kick;
    }
    if (G.race.frozen && v.race) { // largada: carro parado, motor acelerando
      v.vx = v.vz = v.vf = 0; v.steer += (steer - v.steer) * Math.min(1, dt * 7); v.rpm = lerp(v.rpm || 0, Math.max(0.12, thr) * 0.85, Math.min(1, dt * 6)); v.boosting = false; v.sync(dt);
      p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h; hero.pose('drive', 0, dt); G.engine = { type: v.type, rpm: v.rpm, thr: Math.max(0, thr) }; G.skid = 0; return;
    }
    v._thr = thr; v.wheelspin = !!(v.spec.race && thr > 0.9 && v.vf >= 0 && v.vf < 9);
    if (v.type === 'plane') {
      const down = nitro || keys.has('ControlLeft') || input.down; const up = hb;
      const impact = v.drive(dt, { x: steer, y: fromStick ? (Math.abs(my) < 0.12 ? 0 : my) : thr, up, down });
      if (impact > 3) { G.audio.thud(impact); G.shake(Math.min(0.5, impact * 0.04)); if (v.hardT > 1.4) G.ui.toast('Pouso duro! Desça mais devagar: nariz um pouco para cima ✈️', 1800); }
      p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h; hero.pose('drive', 0, dt);
      G.engine = { type: 'plane', rpm: v.rpm, thr: v.thr }; G.skid = 0; return;
    }
    if (v.type === 'heli') {
      const down = nitro || keys.has('ControlLeft') || keys.has('KeyQ') || input.down; const up = hb || keys.has('KeyE') && false;
      const impact = v.drive(dt, { x: steer, y: fromStick ? (Math.abs(my) < 0.15 ? 0 : my) : thr, up, down });
      if (impact > 3) { G.audio.thud(impact); G.shake(Math.min(0.6, impact * 0.05)); }
      p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h; hero.pose('drive', 0, dt);
      G.engine = { type: 'heli', rpm: v.spool, thr: Math.abs(thr) }; G.skid = 0; return;
    }
    // passo fixo 1/60, no máximo 3 por quadro; depois de um hitch o resto é descartado (physics-tuning)
    const F = 1 / 60; v._acc = (v._acc || 0) + dt; let impact = 0, n = 0;
    const others = G.vehicles.concat(G.traffic.cars.filter(c => c.active), G.rivals.cars, G.race.cars, G.street.cars);
    if (G.palms) G.palms.check(v, dt); // t393: palmeira quebra antes da batida
    if (!v.spec.boat && !v.spec.air) { // t420: carro no mar raso — mais lento, borrifos, rastro e som de água; perto do limite freia com suavidade
      const gy0 = groundY(v.x, v.z), dep = WATER_Y - gy0, spd0 = Math.hypot(v.vx, v.vz);
      if (dep > 0.02 && v.y < WATER_Y + 0.2) { const deep = clamp((dep - 0.45) / 0.27, 0, 1); const k = Math.max(0, 1 - dt * (0.25 + dep * 0.9 + deep * 2.5));
        const [fx0, fz0] = [Math.sin(v.h), Math.cos(v.h)]; const out = Math.sign(fx0 * v.vx + fz0 * v.vz) * (WATER_Y - groundY(v.x + fx0 * 3, v.z + fz0 * 3) - dep);
        const kk = out > 0 ? k : Math.max(k, 1 - dt * 0.6); v.vx *= kk; v.vz *= kk; if (v.vf !== undefined) v.vf *= kk;
        if (!v._inSea) { v._inSea = true; if (spd0 > 2) { G.audio.splash && G.audio.splash(spd0); if (G.breaks) G.breaks.splash(v.x, WATER_Y, v.z, v.vx, v.vz, 26); } if (!G._carSeaTip) { G._carSeaTip = true; G.ui.toast('🌊 Mar raso! O carro anda devagar na água — mais fundo ele para. É só voltar para a areia.', 4200); } }
        v._spl = (v._spl || 0) - dt; if (spd0 > 1.5 && v._spl <= 0) { v._spl = 0.12; if (G.breaks) G.breaks.splash(v.x + fx0 * 1.9, WATER_Y, v.z + fz0 * 1.9, v.vx, v.vz, Math.min(10, 2 + spd0 * 0.5)); if (G.powers) G.powers.ring(v.x - fx0 * 2.2, WATER_Y + 0.03, v.z - fz0 * 2.2, 0xe8fbff, 2.2 + spd0 * 0.12, 0.9); G.audio.water && Math.random() < 0.4 && G.audio.water(Math.min(0.16, 0.04 + spd0 * 0.006)); }
        if (deep > 0.4 && out > -0.2) { G._deepT = (G._deepT || 0) - dt; if (G._deepT <= 0) { G._deepT = 6; G.ui.toast('🛑 Fundo demais para o carro — dê ré ou vire para a areia.', 3000); } }
      } else v._inSea = false;
    }
    if (G.breaks) G.breaks.check(v, dt); // t418/t419: postes, sinaleiras, guarda-sóis e passarelas de madeira quebram
    while (v._acc >= F && n < 3) { impact = Math.max(impact, v.drive(F, { x: steer, y: thr, hb, nitro, hardBrake, limit, kick: kick && n === 0, neutral: !!input.neutral }, others, G.t)); v._acc -= F; n++; }
    if (n >= 3) v._acc = 0;
    if (v.boosting && !G._wasBoost) { G.audio.nitro(); } G._wasBoost = v.boosting;
    if (impact > 2.5) { G.audio.thud(impact); G.shake(Math.min(0.7, impact * 0.05)); }
    p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h;
    hero.pose(v.spec.boat ? 'idle' : 'drive', 0, dt);
    G.engine = { type: v.type, rpm: v.rpm, thr: Math.max(0, thr) };
    G.skid = !v.spec.boat && v.drift > 3.5 ? v.drift : v.wheelspin && v.vf < 6 ? 4 : 0;
    return;
  }
  DriveUI.setDriving(false);
  G.engine = null; G.skid = 0;
  // física a pé: aceleração e inércia, giro suave, degraus, rampas, pulo com gravidade e sem atravessar paredes
  if (G.talk.cur || G.mirrorLock) { mx = my = 0; mag = 0; }
  const run = fromStick ? mag > 0.85 : keys.has('ShiftLeft') || keys.has('ShiftRight');
  const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw), rx = -fz, rz = fx;
  let dx = fx * my + rx * mx, dz = fz * my + rz * mx; const dl = Math.hypot(dx, dz);
  // t412: entrar no mar andando — água rasa freia (até a cintura), funda = nadar (cabeça para fora)
  const hkW = clamp(G.hero.heightK || 1, 0.8, 1.5), swimD = 1.25 * hkW;
  const waterAt = (x, z) => x > BOUNDS.x0 + 5 && x < BOUNDS.x1 && z > BOUNDS.z0 && z < BOUNDS.z1 && surfaceY(x, z) < -0.45 && !onPier(x, z);
  const wDepth = waterAt(p.x, p.z) ? WATER_Y - surfaceY(p.x, p.z) : 0; const inSea = waterAt(p.x, p.z) && p.y < WATER_Y + 0.4;
  p.inWater = inSea; p.swim = inSea && wDepth >= swimD - 0.05; p.wade = inSea && !p.swim ? clamp(wDepth / swimD, 0, 1) : 0;
  const waterK = p.swim ? 0.5 : inSea ? clamp(1 - p.wade * 0.5, 0.5, 1) : 1;
  const maxS = (fromStick ? mag * (run ? 7 : 4.4) : (mag > 0 ? (run ? 7 : 4.2) : 0)) * G.gifts.speedK() * (G.wardrobe ? G.wardrobe.speedK() : 1) * waterK;
  p.vx = p.vx || 0; p.vz = p.vz || 0;
  let tvx = 0, tvz = 0; if (dl > 0.05) { dx /= dl; dz /= dl; tvx = dx * maxS; tvz = dz * maxS; }
  // virada brusca correndo: freia um pouco antes de mudar de direção (inércia)
  const cs = Math.hypot(p.vx, p.vz); if (cs > 4 && dl > 0.05 && (p.vx * dx + p.vz * dz) / cs < -0.2) { tvx *= 0.3; tvz *= 0.3; }
  const accel = p.grounded ? (dl > 0.05 ? 20 : 26) : 4; const ax = tvx - p.vx, az = tvz - p.vz, al = Math.hypot(ax, az), md = accel * dt;
  if (al > md) { p.vx += ax / al * md; p.vz += az / al * md; } else { p.vx = tvx; p.vz = tvz; }
  const speed = Math.hypot(p.vx, p.vz);
  if (speed > 0.25) p.h += angDiff(p.h, Math.atan2(p.vx, p.vz)) * Math.min(1, dt * (p.grounded ? 10 : 3));
  // rampas: subir cansa um pouco, descer embala
  const ahead = surfaceY(p.x + p.vx * 0.15, p.z + p.vz * 0.15) - surfaceY(p.x, p.z); const slope = speed > 0.1 ? clamp(1 - ahead / (speed * 0.15) * 0.6, 0.65, 1.15) : 1;
  const stepMax = p.swim ? 2.3 : p.grounded ? 1.0 : 0.6; // nadando dá para subir na beira (escada/mureta) // degraus e bordas de píer até ~1 m (sobe com uma "escalada" suave)
  const seaY = (x, z, sy) => waterAt(x, z) ? [Math.max(sy, WATER_Y - swimD), true] : [sy, walkable(x, z)]; // no mar o "chão" é o fundo ou a altura de nado
  const supY = (x, z) => { const sy = surfaceY(x, z); if (p.y - sy < 1) return seaY(x, z, sy); const r = roofAt(x, z, p.y); return r > sy ? [r, true] : seaY(x, z, sy); }; // telhados também são chão
  const tryMove = (x, z) => { const [sy, ok] = supY(x, z); return ok && sy - p.y <= stepMax; };
  const nx = p.x + p.vx * slope * dt, nz = p.z + p.vz * slope * dt;
  let blocked = null;
  if (tryMove(nx, p.z)) p.x = nx; else { if (Math.abs(p.vx) > 0.3) blocked = { x: -Math.sign(p.vx), z: 0 }; p.vx = 0; }
  if (tryMove(p.x, nz)) p.z = nz; else { if (Math.abs(p.vz) > 0.3) blocked = { x: 0, z: -Math.sign(p.vz) }; p.vz = 0; }
  tmp.set(p.x, 0, p.z); const wall = collide(tmp, 0.35, false, p.y + 0.2); p.x = tmp.x; p.z = tmp.z;
  if (wall) { const vn = p.vx * wall.x + p.vz * wall.z; if (vn < 0) { p.vx -= vn * wall.x; p.vz -= vn * wall.z; } } // desliza rente à parede, sem atravessar
  for (const o of G.vehicles.concat(G.traffic.cars, G.rivals.cars, G.race.cars, G.street.cars)) { if (o.npc && !o.active) continue; for (const c of o.circles()) { const ex = p.x - c[0], ez = p.z - c[1], d = Math.hypot(ex, ez), rr = o.r + 0.35; if (d < rr && d > 1e-4) { if (G.gifts.push(o, ex / d, ez / d)) break; p.x = c[0] + ex / d * rr; p.z = c[1] + ez / d * rr; } } }
  const gy = supY(p.x, p.z)[0]; let jumped = false;
  // coyote time + buffer de pulo (~120 ms): um pulo um pouco atrasado ou antecipado ainda vale (input-systems)
  if (p.grounded) p.coyote = 0.12; else p.coyote = Math.max(0, (p.coyote || 0) - dt);
  if (keys.has('Space') || input.jump) p.jumpBuf = 0.12; else p.jumpBuf = Math.max(0, (p.jumpBuf || 0) - dt);
  if (p.jumpBuf > 0 && (p.grounded || p.coyote > 0) && !p.swim && !(p.wade > 0.6) && !G.talk.cur && !G.powers.fly && !G.powers.lev && !G.jet.on) { p.vy = G.gifts.jumpV(); p.grounded = false; p.coyote = 0; p.jumpBuf = 0; p.jumpT = 0; jumped = true; }
  const fc = { keys, input, gy, dx, dz, dl, run, wall: wall || blocked, jumped }; const powered = G.gifts.foot(dt, p, fc) || G.jet.foot(dt, p, fc) || G.powers.foot(dt, p, fc);
  input.jump = false;
  if (powered) { /* o poder controla a altura */ }
  else if (p.grounded && gy > p.y + 0.02) { p.y = lerp(p.y, gy, Math.min(1, dt * 14)); if (gy - p.y < 0.02) p.y = gy; p.vy = 0; } // subindo degrau
  else {
    p.vy -= 16 * dt; p.y += p.vy * dt;
    if (p.y <= gy) { p.y = gy; p.vy = 0; p.grounded = true; } else if (p.y - gy > 0.25) p.grounded = false; else if (p.vy <= 0) { p.y = lerp(p.y, gy, Math.min(1, dt * 20)); p.grounded = true; } // desce degraus sem "voar"
  }
  p.jumpT = (p.jumpT || 0) + dt;
  // respingos: ao cair na água e andando/nadando (anéis brancos na superfície)
  { const nowIn = waterAt(p.x, p.z) && p.y < WATER_Y + 0.4; if (nowIn && !p._wasIn && G.powers) { G.powers.ring(p.x, WATER_Y + 0.03, p.z, 0xffffff, 2.6, 0.6); G.audio.splash ? G.audio.splash() : G.audio.thud && G.audio.thud(3); if (!G._wadeTip) { G._wadeTip = 1; G.ui.toast('🌊 Água do mar! Na parte rasa você anda devagar; no fundo, nada. É só voltar andando para a areia.', 3000); } }
    p._wasIn = nowIn; if (nowIn && speed > 0.6 && G.powers) { p._spl = (p._spl || 0) - dt; if (p._spl <= 0) { p._spl = p.swim ? 0.35 : 0.28; G.powers.ring(p.x + Math.sin(p.h) * 0.3, WATER_Y + 0.03, p.z + Math.cos(p.h) * 0.3, 0xe8fbff, p.swim ? 1.4 : 1.0, 0.55); } } }
  p._sl = lerp(p._sl || 0, p.swim && speed > 0.4 ? 1 : 0, Math.min(1, dt * 4)); // nadando deitado: corpo sobe até a superfície
  hero.g.position.set(p.x - Math.sin(p.h) * p._sl * 0.8, p.y + p._sl * 0.7 * hkW, p.z - Math.cos(p.h) * p._sl * 0.8); hero.g.rotation.y = p.h;
  hero.ph += dt * (speed > 5 ? 11 : 7.5) * (speed > 0.1 ? 1 : 0);
  const ap = G.gifts.airPose || G.jet.airPose || G.powers.airPose; const sp2 = Math.hypot(p.vx, p.vz);
  hero.g.rotation.x = lerp(hero.g.rotation.x, p.swim && !ap ? (speed > 0.4 ? 1.15 : 0.35) : ap === 'fly' || ap === 'glide' ? Math.min(1.1, sp2 * 0.045) : ap === 'board' ? Math.min(0.18, sp2 * 0.012) : ap === 'dash' ? 0.25 : 0, Math.min(1, dt * 5));
  if (ap === 'climb') hero.pose('walk', 0.6, dt);
  else if (ap === 'fly' || ap === 'lev' || ap === 'board' || ap === 'glide') hero.pose('idle', 0, dt);
  else if (ap === 'dash') hero.pose('walk', 0.95, dt);
  else if (G.posing && p.grounded) hero.pose(G.posing, 0, dt); // poses no espelho das lojas
  else hero.pose(!p.grounded && p.jumpT < 1 ? 'jump' : speed > 0.3 ? 'walk' : 'idle', speed > 5.2 ? 0.95 : 0.6 * Math.min(1, speed / 4.2), dt);
}

// ---------------- câmera
let camInit = false;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
G.snapCam = () => { camInit = false; if (G.player.vehicle) G.camYaw = G.player.vehicle.h; };
function updateCamera(dt, snap) {
  if (G.boutique && G.boutique.cam(camera, dt)) return; // espelho das lojas da orla
  if (G.paint && G.paint.cam(camera, dt)) return; // t418: cabine de pintura
  const p = G.player, v = p.vehicle; lookT -= dt;
  const mult = [1, 1.45, 0.7][G.camMode];
  let D, H, focusY;
  if (v) {
    D = (v.spec.cam * mult + Math.min(v.speed, 40) * 0.05) * (innerHeight > innerWidth && !v.spec.air ? 1.1 : 1); H = 0; focusY = v.type === 'plane' ? 2.8 : v.type === 'heli' ? 2.6 : v.spec.boat ? 2.2 : v.type === 'suv' ? 1.9 : 1.5;
    if (lookT <= 0 && v.speed > 2) { const sliding = v.drifting || (v.spec.race && v.driftAng > 0.15); const velA = Math.atan2(v.vx, v.vz);
      // t402: no drift a câmera segue a direção do movimento (estrada à frente) e nunca fica mais de ~0,5 rad atrás do carro (carro sempre inteiro na tela)
      const target = sliding ? v.h + angDiff(v.h, velA) * 0.7 : v.h; G.camYaw += angDiff(G.camYaw, target) * Math.min(1, dt * (v.spec.air ? 1.6 : sliding ? 4 : 2.6));
      if (!v.spec.air) { const lm = innerHeight > innerWidth ? 0.32 : 0.5; const lag = angDiff(target, G.camYaw); if (Math.abs(lag) > lm) G.camYaw = target + Math.sign(lag) * lm; } /* retrato: tela estreita, segura mais perto */ G.camPitch = lerp(G.camPitch, v.spec.air && v.air ? (v.type === 'plane' ? 0.2 - clamp(v.pitch, -0.3, 0.3) * 0.5 : 0.3) : 0.16, dt * 1.5); }
  } else { const hk = clamp(G.hero.heightK || 1, 0.9, 1.5); D = 4.3 * mult * (0.6 + hk * 0.4) * (G.powers.fly || G.jet.airPose ? 1.5 : 1); focusY = 1.55 * hk; if (G.bail && G.bail.mode === 'chute') { D = 11 * mult; focusY = 3.4; if (lookT <= 0) G.camPitch = lerp(G.camPitch, 0.04, Math.min(1, dt * 1.5)); } else if (G.bail && G.bail.mode === 'swim') focusY = 0.9; }
  const yaw = G.camYaw, pit = G.camPitch;
  const fx = p.x, fz = p.z, fy = p.y + focusY;
  let cx = fx - Math.sin(yaw) * Math.cos(pit) * D, cz = fz - Math.cos(yaw) * Math.cos(pit) * D, cy = fy + Math.sin(pit) * D + (v ? 0.6 : 0.15);
  let pullK = 1; const tb = rayBlock(fx, fz, fy, cx, cz, cy); if (tb < 1) { // t402: parede atrás: chega perto mas SOBE (fica por cima do carro), nunca entra na carroceria
    const minK = v ? Math.min(1, (v.spec.len || 4.4) * 0.55 / Math.max(D, 0.1)) : 0.12; const k = Math.max(minK, tb - 0.06); pullK = k; cx = fx + (cx - fx) * k; cz = fz + (cz - fz) * k; cy = fy + (cy - fy) * k + (v ? (1 - k) * 6.5 : 0); }
  const floor = (v && v.spec.air && v.y < surfaceY(cx, cz) - 1.2 ? WATER_Y : Math.max(surfaceY(cx, cz), WATER_Y)) + 0.35; if (cy < floor) cy = floor; // por baixo da ponte a câmera fica embaixo também
  if (snap || !camInit) { camPos.set(cx, cy, cz); camInit = true; } else { const k = Math.min(1, dt * (v ? 10 : 14)); camPos.x = lerp(camPos.x, cx, k); camPos.y = lerp(camPos.y, cy, k); camPos.z = lerp(camPos.z, cz, k); }
  camera.position.copy(camPos);
  // tremor com trauma² (game-feel): pancadas leves quase não mexem, as fortes empurram; intensidade 0–1 em save.shake (acessibilidade)
  if (v && v.boosting) trauma = Math.max(trauma, 0.22);
  const sh = trauma * trauma * (save.shake == null ? 1 : save.shake);
  if (sh > 0.0008) { const tt = G.t * 62; camera.position.x += Math.sin(tt * 1.71) * sh * 0.38; camera.position.y += Math.sin(tt * 2.27 + 1.1) * sh * 0.28; }
  trauma = Math.max(0, trauma - dt * 2.4);
  { let la = v ? v.h : 0, ld = 2; if (v && !v.spec.air && v.speed > 3) { const velA = Math.atan2(v.vx, v.vz); la = v.h + angDiff(v.h, velA) * 0.7; ld = Math.min(4.5, 2 + v.speed * 0.06); if (innerHeight > innerWidth) ld *= 0.55; } // t402: olha um pouco à frente no sentido do movimento
    if (v && pullK < 1) ld *= pullK; // câmera puxada pela parede: mira no carro (inteiro na tela)
    camLook.set(fx + (v ? Math.sin(la) * ld : 0), fy - (v ? (1 - pullK) * 1.6 : 0), fz + (v ? Math.cos(la) * ld : 0)); camera.lookAt(camLook); }
  if (G.camOverride) { const o = G.camOverride; camera.position.set(o[0], o[1], o[2]); camera.lookAt(o[3], o[4], o[5]); } // vista aérea (fotos/testes)
  const portrait = innerHeight > innerWidth; const baseF = portrait ? 72 : 60; const f = baseF + (v ? Math.min(14, v.speed * 0.28) + (v.boosting ? 9 : 0) : 0);
  if (Math.abs(camera.fov - f) > 0.05) { camera.fov = lerp(camera.fov, f, Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
}

// ---------------- interface por quadro
let headlight = null;
function updatePrompts() {
  const p = G.player, v = p.vehicle; const ui = G.ui;
  const s = startableNear(); const near = !v && nearestVehicle(); let talkNear = null;
  const lm = LANDMARKS.find(l => Math.hypot(l.x - p.x, l.z - p.z) < l.r);
  let html = '';
  if (s) html = touch ? `Toque em ▶ para iniciar: <b>${s.name}</b>` : `<kbd>Enter</kbd> iniciar: <b>${s.name}</b>`;
  else if (near && near.mine) html = `<kbd>E</kbd> ${touch ? 'Toque em 🚗 para ' : ''}entrar: <b>seu carro tunado</b>`;
  else if (near) html = `<kbd>E</kbd> ${touch ? 'Toque em 🚗 para ' : ''}entrar: <b>${near.sigName || near.spec.name}</b>`;
  if (!v && !G.talk.cur) { const npc = G.talk.cool > 0 ? null : G.talk.nearest(); if (npc && (!near || Math.hypot(npc.x - p.x, npc.z - p.z) < Math.hypot(near.x - p.x, near.z - p.z) - 1)) { const W = G.talk.whoOf(npc); talkNear = W; if (!s) html = `<kbd>E</kbd> ${touch ? 'Toque em 💬 para ' : ''}conversar com <b>${W.emoji} ${W.name}</b>`; } else talkNear = null; } else talkNear = null;
  if (!html && G.home.near()) html = `<kbd>E</kbd> ${touch ? 'Toque em 🚗 para ' : ''}entrar em casa: <b>visual, salvar, descansar</b>`;
  if (!html && v && v.type === 'plane') html = v.air ? '' : v.speed < 2 && v.thr < 0.1 ? (touch ? 'Segure ⤒ para acelerar e puxe o joystick para cima para decolar ✈️' : 'Segure <kbd>Espaço</kbd> (manete) e <kbd>W</kbd> para decolar ✈️') : '';
  if (!html && v && v.type === 'heli') html = v.air ? '' : (touch ? 'Segure ⤒ para decolar 🚁' : 'Segure <kbd>Espaço</kbd> para decolar · <kbd>Shift</kbd> desce');
  if (!html && lm && !G.save.photos.includes(lm.id)) html = `<kbd>F</kbd> 📷 Ponto de foto: <b>${lm.name}</b>`;
  ui.prompt(html);
  const nw = $('nitroW'); const hasN = !!(v && v.tune); if (nw.hidden === hasN) nw.hidden = !hasN;
  if (hasN) { // nitro de cinco camadas
    if (!G._nsegs) G._nsegs = [...nw.querySelectorAll('.nSegs i')]; const n5 = v.nitro * NITRO_STAGES, st = v.boosting ? v.nStage || 1 : 0;
    G._nsegs.forEach((el, i) => { const f = clamp(n5 - i, 0, 1); const b = el.firstChild; const t = `scaleX(${f.toFixed(2)})`; if (b._t !== t) { b.style.transform = t; b._t = t; } const hot = st > i; if (el._h !== hot) { el.classList.toggle('hot', hot); el._h = hot; } });
    const lb = st ? `NITRO ×${st}` : touch ? 'NITRO 🔥' : 'NITRO · Shift'; if (G._nl !== lb) { $('nitroL').textContent = lb; G._nl = lb; } nw.classList.toggle('on', v.boosting); }
  { // drift longo: janela de extensão (barra) + tempo + pêndulos encadeados
    const dw = $('driftW'); const dOn = !!(v && v.swD && v.drifting); if (dw.hidden === dOn) dw.hidden = !dOn;
    if (dOn) { const f = clamp(v.dExt / DRIFT_MAX, 0, 1); const b = $('driftB'); const t = `scaleX(${f.toFixed(2)})`; if (b._t !== t) { b.style.transform = t; b._t = t; }
      const lb = `DRIFT ${v.dTime.toFixed(1)}s` + (v.dChain ? ` · PÊNDULO ×${v.dChain}` : ''); if (G._dl !== lb) { $('driftL').textContent = lb; G._dl = lb; } dw.classList.toggle('low', f < 0.28); }
  }
  if (input.neutral && !(v && !v.spec.air && !v.spec.boat)) { input.neutral = false; $('bNeutral').classList.remove('on'); }
  if (!touch) { const nOk = !!(v && !v.spec.air && !v.spec.boat); const nb = $('bNeutral'); if (nb.hidden === nOk) nb.hidden = !nOk; } // t417: N também no computador
  const rc = G.race.active && v && v.race; if (document.body.classList.contains('racing') !== !!rc) document.body.classList.toggle('racing', !!rc);
  if (touch) {
    const act = $('bAct');
    const raceNear = !!(v && G.street && !G.street.race && G.street.nearRival(50)); const ponteNear = !!(G.ponte && G.ponte.canAccept()); const boatNear = !!(G.boatRace && G.boatRace.canAccept() && !G.boatRace.declined);
    const megaBuy = !v && G.mega && G.mega.focus != null && !G.mega.isOwned(G.mega.focus); const shopIn = !v && G.boutique && G.boutique.here && !G.boutique.isOpen; const lbl = rc ? '🏳️<small>Sair</small>' : megaBuy ? '💳<small>Comprar</small>' : shopIn ? '🛍️<small>Loja</small>' : ponteNear ? '🌉<small>Aceitar</small>' : boatNear ? '🚤<small>Aceitar</small>' : raceNear ? '🏁<small>Iniciar corrida</small>' : v ? '🚶<small>Sair</small>' : G.talk.cur ? '💬<small>Mais</small>' : (G.carCall || near || (G.sigCar && !G.sigCar.driver && G.vehicles.indexOf(G.sigCar) >= 0 && Math.hypot(G.sigCar.x - p.x, G.sigCar.z - p.z) < 30)) ? '🚗<small>Entrar</small>' : talkNear ? '💬<small>Conversar</small>' : '🚘<small>Chamar</small>';
    if (act._l !== lbl) { act.innerHTML = lbl; act._l = lbl; act.title = v ? (ponteNear ? 'Aceitar a sessão de drift na ponte (até 50 m)' : raceNear ? 'Iniciar a corrida de rua (até 50 m do rival, mesmo passando)' : 'Descer do veículo') : 'Um toque chama seu veículo (para à sua frente); o próximo toque entra.'; }
    act.style.opacity = 1;
    const heli = v && v.spec.air, plane = v && v.type === 'plane';
    document.body.classList.toggle('heli', !!heli); document.body.classList.toggle('plane', !!plane);
    $('bReset').hidden = !rc; $('bPhoto').hidden = !!rc;
    $('bStart').hidden = !s; $('bHorn').hidden = !v || heli || !!rc; $('bNitro').hidden = !(v && v.tune); { const nOk = !!(v && !v.spec.air && !v.spec.boat); $('bNeutral').hidden = !nOk; if (!nOk && input.neutral) { input.neutral = false; $('bNeutral').classList.remove('on'); } } if (!v || !v.tune) input.nitro = false; const flyP = !v && (G.powers.fly || G.powers.lev || G.jet.on && !G.player.grounded); $('bDown').hidden = !heli && !flyP; if (!heli && !flyP) input.down = false; $('bPow').hidden = !!v || !(G.hero.def && G.hero.def.hero);
    const jl = plane ? '⤒<small>Acelerar</small>' : heli || flyP ? '⤒<small>Subir</small>' : v && v.spec.race ? '🌀<small>Drift</small>' : v ? '⛔<small>Freio</small>' : '⤒<small>Pular</small>'; const bj = $('bJump'); if (bj._l !== jl) { bj.innerHTML = jl; bj._l = jl; }
    { const bd = $('bDown'); const dl = plane ? '⤓<small>Reduzir</small>' : '⤓<small>Descer</small>'; if (bd._l !== dl) { bd.innerHTML = dl; bd._l = dl; } }
    if (v && !v.spec.air) { $('bPhoto').hidden = true; $('bHorn').hidden = true; $('bStart').hidden = true; const q = $('quick'); if (q) q.hidden = true; }
    else { const q = $('quick'); if (q) q.hidden = false; }
  }
}

// ---------------- laço principal

function updateAllLights() {
  const night = G.env.night;
  setVehicleLights(night);
  const pv = G.player && G.player.vehicle;
  const high = !!(DriveUI.highBeam && pv);
  const cam = camera.position;
  const list = [];
  if (G.vehicles) list.push(...G.vehicles);
  if (G.traffic) for (const c of G.traffic.cars) if (c && c.active) list.push(c);
  if (G.street && G.street.cars) list.push(...G.street.cars);
  if (G.race && G.race.cars) list.push(...G.race.cars);
  if (G.rivals && G.rivals.cars) list.push(...G.rivals.cars);
  let budget = Q.level === 'low' ? 8 : 16;
  // mais perto primeiro: o orçamento de luzes vai para o que está na tela
  for (const v of list) if (v) v._ld = Math.hypot(v.x - cam.x, v.z - cam.z);
  list.sort((a, b) => (a ? a._ld : 1e9) - (b ? b._ld : 1e9));
  for (const v of list) {
    if (!v || !v.updateBeams) continue;
    const isP = v === pv;
    if (!isP) {
      if (night < 0.32 || budget <= 0) { if (v.fakeBeam) v.fakeBeam.visible = false; if (v.spot) v.spot.visible = false; if (v.tailGlow) v.tailGlow.visible = !!(v.brakeOn && v.tailGlow.visible); continue; }
      const d = Math.hypot(v.x - cam.x, v.z - cam.z);
      if (d > 95) { if (v.fakeBeam) v.fakeBeam.visible = false; if (v.tailGlow) v.tailGlow.visible = false; continue; }
      budget--;
    }
    v.updateBeams(night, isP, isP && high);
  }
}

let last = performance.now(), realLast = performance.now(), fpsAcc = 0, fpsN = 0, fpsT = 0, fps = 60, saveT = 0, slowT = 0;
const fpsHist = [];
function resize() {
  const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
  if (composer) { composer.setPixelRatio(pr); composer.setSize(w, h); }
  document.body.classList.toggle('land', w > h); G.ui && G.ui.resize();
}
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 200));
function recCap() { if (!G.recording) return 99; const maxSide = touch ? 1280 : 1920; return maxSide / Math.max(innerWidth, innerHeight); }
function setPR(v) { const lo = G.recording ? Math.min(Math.max(Q.prMin, 0.9), recCap(), devicePixelRatio || 1) : Q.prMin; pr = clamp(v, lo, Math.max(lo, Math.min(Q.prMax, devicePixelRatio || 1, recCap()))); renderer.setPixelRatio(pr); if (composer) composer.setPixelRatio(pr); resize(); }
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.max(0, Math.min(0.05, (now - last) / 1000)) || 0; last = now;
  if (!G.ready) return;
  if (G.started && !G.paused) { const t0 = performance.now(); step(dt); recordStep(performance.now() - t0); }
  else if (G.started && G.raceMenu) { G.t += dt; G.race.frame(dt, camera); G.env.update(dt * 0.3, G.t, camera.position); G.world.setNight(G.env.night, G.env.wet); updateAllLights(); G.world.update(G.t, dt); G.track.update(dt, G.t, G.env.night, camera.position, []); }
  else if (G.started && G.homeIntro) { G.t += dt; G.home.frame(dt, camera); G.env.update(dt * 0.3, G.t, camera.position); G.world.setNight(G.env.night, G.env.wet); updateAllLights(); G.world.update(G.t, dt); G.home.update(dt, G.t, G.env.night, camera); for (const c of G.home.cars) if (c && c.v) c.v.sync(0); }
  else if (G.started && G.garageOpen) { G.t += dt; G.garage.frame(dt, camera); G.env.update(dt * 0.3, G.t, camera.position); G.world.setNight(G.env.night, G.env.wet); updateAllLights(); G.world.update(G.t, dt); const gv = G.player.vehicle; if (gv) gv.sync(0); }
  else if (G.started && G.paused) { /* pausado: redesenha devagar */ if ((G._pz = (G._pz || 0) + dt) < 0.25) { realLast = now; fpsN = 0; fpsAcc = 0; return; } G._pz = 0; }
  else { G.t += dt; G.env.update(dt * 0.2, G.t, camera.position); const a = G.t * 0.05; camera.position.set(320 + Math.cos(a) * 40, 22, -150 + Math.sin(a) * 60); camera.lookAt(260, 10, -150); G.world.setNight(G.env.night, G.env.wet); G.world.update(G.t, dt); }
  render();
  fpsAcc += (now - realLast) / 1000; realLast = now; fpsN++; if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsHist.push(fps); if (fpsHist.length > 30) fpsHist.shift(); if (G.showFps) $('fps').textContent = `${fps.toFixed(0)} fps · ${Q.level} · ${pr.toFixed(2)}x · ${renderer.info.render.calls} draws`; else $('fps').textContent = ''; if (G.started && !G.paused) adapt(); }
}
let adLo = 0, adHi = 0, adCool = 0, adDropT = -1e9; // t391: histerese + espera; não fica subindo/descendo a resolução (cada troca recriava os buffers = pisca)
function adapt() { // resolução dinâmica para manter fluido
  const nowS = performance.now() / 1000; adCool = Math.max(0, adCool - 1);
  if (G.recording) { adLo = adHi = 0; return; } // gravando: resolução fixa (trocar o tamanho do canvas quebra o vídeo mp4)
  adLo = fps < 40 ? adLo + 1 : 0; adHi = fps > 57 ? adHi + 1 : 0;
  if (adCool > 0) { } else if (adLo >= 2 && pr > (G.recording ? 0.9 : Q.prMin) + 0.01) { setPR(pr - 0.1); adCool = 3; adLo = 0; adDropT = nowS; }
  else if (adHi >= 6 && nowS - adDropT > 25 && pr < Math.min(Q.prMax, devicePixelRatio || 1, recCap()) - 0.01) { setPR(pr + 0.05); adCool = 5; adHi = 0; }
  if (save.quality === 'auto' && !urlQ && fps < 22 && pr <= Q.prMin + 0.01 && Q.level !== 'low') { slowT++; if (slowT >= 6 && !sessionStorage.getItem('mbd-down')) { sessionStorage.setItem('mbd-down', '1'); G.ui.toast('Deixando os gráficos mais leves para ficar fluido…'); persist(); const nq = Q.level === 'high' ? 'medium' : 'low'; setTimeout(() => { location.search = '?q=' + nq; }, 900); } } else slowT = 0;
}
const stepMs = [];
function recordStep(ms) { stepMs.push(ms); if (stepMs.length > 600) stepMs.shift(); }
G.frameStats = () => { if (!stepMs.length) return { n: 0, avg: 0, p95: 0, p99: 0, max: 0 }; const a = stepMs.slice().sort((x, y) => x - y), n = a.length, sum = a.reduce((s, v) => s + v, 0); return { n, avg: +(sum / n).toFixed(2), p95: +a[Math.min(n - 1, Math.floor(n * 0.95))].toFixed(2), p99: +a[Math.min(n - 1, Math.floor(n * 0.99))].toFixed(2), max: +a[n - 1].toFixed(2) }; };
function step(dt) {
  G.t += dt; const t = G.t;
  updatePlayer(dt); stuckCheck(dt);
  const honk = G.traffic.update(dt, t, G.player, G.crowd, Q);
  if (honk) G.audio.far_horn(clamp(1 - Math.hypot(honk.x - G.player.x, honk.z - G.player.z) / 60, 0.2, 1));
  const movers = [G.player.vehicle, G.bail && G.bail.coast, ...G.traffic.cars.filter(c => c.active), ...G.rivals.cars, ...G.street.cars].filter(Boolean);
  G.crowd.update(dt, t, G.player, movers, camera, (p, txt) => G.ui.pedBubble(p, txt), G.env.hour);
  G.life.update(dt, t, G.env.night, G.env.hour); G.birds.update(dt, t, camera); G.gifts.update(dt, t, camera); G.street.update(dt, t, camera); G.serp.update(dt, t, camera); G.ponte.update(dt, t, camera); G.ilhas.update(dt, t, camera); G.boatRace.update(dt, t); G.mar.update(dt, t); G.fleet.update(dt); G.palms.update(dt, camera.position); if (G.breaks) G.breaks.update(dt, camera.position); G.ads.update(dt, t, camera); G.gauchos.update(dt); G.mega.update(dt, t, camera, G.env.night); G.boutique.update(dt, t, camera, G.env.night); if (G.paint) G.paint.update(dt, t, camera, G.env.night); G.beach.update(dt, t, camera, G.env.hour); G.orla.update(dt, t, camera, G.env.hour); G.bail.update(dt, camera);
  G._hudT = (G._hudT || 0) - dt; if (G._hudT <= 0) { G._hudT = 0.5; const h = $('hud'); if (G.started && !G.paused && !G.garageOpen && !G.raceMenu && !G.homeIntro && h) { let fixed = 0; if (h.classList.contains('ghide')) { h.classList.remove('ghide'); fixed++; } if (h.hidden) { h.hidden = false; fixed++; } if (document.body.classList.contains('cine')) { document.body.classList.remove('cine'); fixed++; } if (fixed) G.hudFixes = (G.hudFixes || 0) + fixed; } }
  G.rivals.update(dt, t, G.missions.active && G.missions.active.race && G.missions.active.race.rivals ? G.missions.active : null);
  G.crowd.quiet = !!G.talk.cur; G.talk.update(dt, t, camera); G.powers.update(dt, t); G.jet.update(dt, t); G.home.update(dt, t, G.env.night, camera);
  G.missions.update(dt, t);
  G.race.update(dt, t);
  updateCamera(dt);
  const K = G.env.update(dt, t, camera.position);
  G.world.setNight(G.env.night, G.env.wet); updateAllLights(); G.world.update(t, dt);
  updateHelis(dt, t); updateCarCall(G, dt);
  { const pv = G.player.vehicle; G.track.update(dt, t, G.env.night, camera.position, pv ? [pv, ...G.race.cars] : G.race.cars); G.fx.update(dt, pv, G.env.night, camera); G.drift.update(dt, pv && !pv.spec.air && !pv.spec.boat ? pv : null); }
  G._lodT = (G._lodT || 0) - dt; if (G._lodT <= 0) { G._lodT = 0.5; G.lodHidden = G.world.lod(camera.position.x, camera.position.z, Q.detail); }
  if (grade) { grade.uniforms.uWarm.value = 0.4 + (1 - G.env.night) * 0.4; grade.uniforms.uSat.value = 1.15 + G.env.night * 0.1 - G.env.rain * 0.15; }
  if (zoomBlur) { const bv = G.player.vehicle; const want = bv && bv.boosting ? Math.min(1, bv.speed / 40) : 0; zoomBlur.uniforms.uAmt.value += (want - zoomBlur.uniforms.uAmt.value) * Math.min(1, dt * 6); zoomBlur.enabled = zoomBlur.uniforms.uAmt.value > 0.02; }
  if (bloom) { const hb = G.player.vehicle && DriveUI.highBeam ? 1 : 0; bloom.strength = 0.26 + G.env.night * (0.2 - hb * 0.06) + G.env.wet * 0.05; bloom.threshold = 2.32 - G.env.night * (0.62 - hb * 0.22); } // t399: farol alto não estoura o bloom
  // farol do jogador à noite
  const v = G.player.vehicle;
  if (Q.level !== 'low' && v && !v.spec.boat && !v.spec.air && G.env.night > 0.3) {
    if (!headlight) { headlight = new THREE.SpotLight(0xfff2d8, 0, 60, 0.75, 0.9, 1.2); scene.add(headlight, headlight.target); }
    const [fx, fz] = v.fwd(); headlight.position.set(v.x + fx * 2.2, v.y + 0.8, v.z + fz * 2.2); headlight.target.position.set(v.x + fx * 20, v.y - 0.5, v.z + fz * 20); headlight.intensity = 18 * G.env.night + (G.street && G.street.flashT > 0 ? 150 * Math.min(1, G.street.flashT * 4) : 0);
  } else if (headlight) headlight.intensity = 0;
  // esconde carros estacionados distantes
  for (const c of G.vehicles) c.root.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < Q.viewHide;
  for (const c of G.traffic.cars) if (c.active) c.root.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < Q.viewHide + 40;
  // rota
  G._rt = (G._rt || 0) - dt; if (G.routeDest && G._rt <= 0) { G._rt = 1.2; computeRoute(); }
  // áudio
  const p = G.player; const sea = Math.max(smooth(140, 10, Math.abs(p.x - 390)), p.x > -300 && p.x < 70 ? smooth(80, 0, Math.min(Math.abs(p.x + 260), Math.abs(p.x - 30))) * 0.6 : 0);
  const city = p.x > -680 && p.x < 330 ? 1 : 0.3;
  const vn = !v && G.life ? G.life.nearest(p.x, p.z, G.env.hour, 40) : null; G._venue = vn;
  G.audio.update(dt, { venue: vn && { kind: vn.v.kind, d: vn.d }, chatter: vn ? Math.max(0, 1 - vn.d / 30) * (G.crowd.nearSit || 0.6) : 0, inVehicle: !!v, engine: G.engine, skid: G.skid, sea, city, rain: G.env.rain, boost: !!(v && v.boosting), heliFar: G.heliFar || 0 });
  if (G.env.flash > 0.95) G.audio.thunder();
  G.ui.frame(dt, camera); updatePrompts();
  saveT += dt; if (saveT > 8) { saveT = 0; persist(); }
}
// helicópteros: o seu (holofote real à noite) e os que fazem rota pela cidade
let heliSpot = null;
function updateHelis(dt, t) {
  const H = G.heli, night = G.env.night;
  { const el = $('heliHud'); const A = G.plane; const pv = G.player.vehicle; const on = pv === H || pv === A; if (el) { if (on !== !el.hidden) el.hidden = !on; if (on) {
    let h;
    if (pv === A) { const alt = Math.max(0, A.y - A.floorAt(A.x, A.z, A.y)); const vs = A.vy;
      h = `<span class="att"><i style="transform:translateY(${(A.pitch * 40).toFixed(1)}px) rotate(${(-A.roll * 57.3).toFixed(0)}deg)"></i></span><span>✈️ <b>${Math.round(A.thr * 100)}</b>%</span><span><b>${Math.round(A.airspeed * 3.6)}</b> km/h</span><span>ALT <b>${Math.round(alt)}</b> m</span><span>${vs > 0.6 ? '▲' : vs < -0.6 ? '▼' : '◆'} ${Math.abs(vs).toFixed(1)}</span>${A.stall && A.air ? '<span class="stall">⚠ ESTOL · acelere</span>' : ''}`; }
    else { const alt = Math.max(0, H.y - H.floor(H.x, H.z)); const vs = H.vy; h = `<span class="att"><i style="transform:translateY(${(H.pitch * 40).toFixed(1)}px) rotate(${(-H.roll * 57.3).toFixed(0)}deg)"></i></span><span>ALT <b>${Math.round(alt)}</b> m</span><span><b>${Math.round(H.speed * 3.6)}</b> km/h</span><span>${vs > 0.6 ? '▲' : vs < -0.6 ? '▼' : '◆'} ${Math.abs(vs).toFixed(1)} m/s</span>`; }
    if (el._h !== h) { el.innerHTML = h; el._h = h; } } }
    const out = pv && pv.spec.air && pv.outside; if (out && !G._outT) { G._outT = 6; G.ui.toast('🧭 Limite do espaço aéreo · o vento te leva de volta para a cidade', 2600); } G._outT = Math.max(0, (G._outT || 0) - dt);
    if (!A.driver && (A.speed > 0.05 || A.air || A.thr > 0 || A._pr > 0)) A.drive(dt, {}); A.lights(night, t); G.seabase.update(night, t); }
  if (G.heliCall && !H.driver) { // o helicóptero chamado chega voando e pousa perto de você
    const C = G.heliCall; C.t += dt; const k = clamp(C.t / C.dur, 0, 1), e = 1 - (1 - k) ** 3; const fl = groundY(C.x, C.z);
    H.x = lerp(C.sx, C.x, e); H.z = lerp(C.sz, C.z, e); H.y = fl + 0.3 + (1 - smooth(0.35, 1, k)) * 38; H.h = C.h; H.spool = 1; H.air = k < 1; H.vx = H.vz = H.vy = 0; H.sync(dt);
    if (k >= 1) { G.heliCall = null; H.place(C.x, C.z, C.h); H.spool = 0.9; G.ui.toast(touch ? '🚁 Seu helicóptero chegou! Chegue perto e toque em 🚗' : '🚁 Seu helicóptero chegou! Chegue perto e aperte <kbd>E</kbd>', 3200); }
  } else if (!H.driver && (H.spool > 0 || H.air)) H.drive(dt, { x: 0, y: 0 });
  if (H.driver) { const [fx, fz] = H.fwd(); const alt = Math.max(4, H.y - groundY(H.x, H.z)); const ahead = clamp(alt / 0.7, 10, 120); H.searchT.set(H.x + fx * ahead, 0, H.z + fz * ahead); }
  else H.searchT.set(H.x + Math.sin(H.h) * 12, 0, H.z + Math.cos(H.h) * 12);
  H.lights(night, t, H.driver ? true : false);
  G.helis.update(dt, t, night, camera); G.helipad.update(night, t);
  // luz de verdade só para o helicóptero mais relevante (custa caro em celular)
  if (Q.level !== 'low') {
    const near = G.helis.nearest(camera.position.x, camera.position.z); const src = H.lightOn > 0.1 ? H : near.h && near.d < 260 && near.h.lightOn > 0.1 ? near.h : null;
    if (src) { if (!heliSpot) { heliSpot = new THREE.SpotLight(0xfff4dc, 0, 320, 0.2, 0.6, 1.1); scene.add(heliSpot, heliSpot.target); }
      heliSpot.position.set(src.x + Math.sin(src.h) * 2, src.y + 0.6, src.z + Math.cos(src.h) * 2); heliSpot.target.position.copy(src.searchT); heliSpot.intensity = 900 * src.lightOn; }
    else if (heliSpot) heliSpot.intensity = 0;
  }
  // som de rotor de um helicóptero passando perto
  const nn = G.helis.nearest(G.player.x, G.player.z); G.heliFar = nn.h ? clamp(1 - Math.hypot(nn.d, nn.h.y) / 260, 0, 1) : 0;
  if (!H.driver && H.spool > 0.05) G.heliFar = Math.max(G.heliFar, H.spool * clamp(1 - Math.hypot(H.x - G.player.x, H.z - G.player.z) / 80, 0, 1));
}
function render() {
  renderer.info.reset();
  // modo selfie: perto de um ponto turístico, enquadra o personagem com o ponto ao fundo
  let saved = null;
  if (photoReq) {
    const p = G.player; const L = LANDMARKS.find(l => l.look && Math.hypot(l.x - p.x, l.z - p.z) < l.r);
    if (L) {
      const [lx, ly, lz] = L.look; let dx = p.x - lx, dz = p.z - lz; let d = Math.hypot(dx, dz);
      if (d < 4) { dx = Math.sin(G.camYaw); dz = Math.cos(G.camYaw); d = 1; }
      dx /= d; dz /= d; const back = p.vehicle ? 9 : 4.2;
      const cx = p.x + dx * back, cz = p.z + dz * back, cy = Math.max(p.y + (p.vehicle ? 2.6 : 1.7), groundY(cx, cz) + 1.2);
      if (rayBlock(p.x, p.z, p.y + 1.6, cx, cz, cy) > 0.97) {
        saved = [camera.position.clone(), camera.quaternion.clone(), G.hero.g.rotation.y];
        if (!p.vehicle) G.hero.g.rotation.y = Math.atan2(dx, dz);
        saved.push(G.missions.target.visible); G.missions.target.visible = false;
        camera.position.set(cx, cy, cz); camera.lookAt((p.x * 2 + lx) / 3, Math.min(ly, p.y + 9) * 0.55 + (p.y + 1.4) * 0.45, (p.z * 2 + lz) / 3);
      }
    }
  }
  if (composer) composer.render(); else renderer.render(scene, camera);
  if (photoReq) {
    photoReq = false;
    let url = ''; try { url = renderer.domElement.toDataURL('image/jpeg', 0.85); } catch (e) { }
    if (saved) { camera.position.copy(saved[0]); camera.quaternion.copy(saved[1]); G.hero.g.rotation.y = saved[2]; G.missions.target.visible = saved[3]; }
    const res = G.missions.takePhoto(); G.ui.showPhoto(url, res);
  }
}

// t423: recado de boas-vindas da Solara — some com toque ou deslizando em qualquer direção; tela cheia só se o jogador pedir
function solaraHi() { G.solaraHiShow = solaraHi;
  if (document.getElementById('solaraHi')) return; const el = document.createElement('div'); el.id = 'solaraHi';
  const fs = touch && document.documentElement.requestFullscreen && !(window.matchMedia && (matchMedia('(display-mode: fullscreen)').matches || matchMedia('(display-mode: standalone)').matches));
  el.innerHTML = `<div class="shAv">☀️</div><div class="shTx"><b>Solara</b><span>Oi, eu sou a Solara! Se precisar sair do jogo, é só arrastar para cima.</span>${fs ? '<button id="shFs">⛶ Tela cheia</button>' : ''}<small>toque ou deslize para fechar</small></div>`;
  document.body.appendChild(el); G.solaraHi = el; let x0 = 0, y0 = 0, down = false;
  const close = () => { if (!el.isConnected) return; el.classList.add('out'); setTimeout(() => el.remove(), 260); G.solaraHi = null; };
  el.addEventListener('pointerdown', (e) => { e.stopPropagation(); down = true; x0 = e.clientX; y0 = e.clientY; });
  el.addEventListener('pointermove', (e) => { if (down && Math.hypot(e.clientX - x0, e.clientY - y0) > 24) { down = false; close(); } });
  el.addEventListener('pointerup', (e) => { e.stopPropagation(); if (!down) return; down = false; if (e.target.id === 'shFs') { document.documentElement.requestFullscreen().catch(() => { }); } close(); });
  el.addEventListener('touchmove', (e) => { e.preventDefault(); }, { passive: false });
  setTimeout(close, 9000);
}
G.solaraHiShow = solaraHi;
setupVersions('solara'); // tela inicial: Versões do jogo
$('play').onclick = () => {
  G.audio.init(); $('start').hidden = true; $('hud').hidden = false; G.started = true; G.ui.resize(); resize();
  solaraHi(); // t423: recado da Solara (substitui o aviso de tela cheia do navegador, que mostrava o endereço do site)
  G.ui.toast('Bem-vindo(a) a <b>Solara Bay</b>! 🌴<br>Ande até um carro e aperte <b>' + (touch ? '🚗' : 'E') + '</b>', 5000);
  if (!save.done) setTimeout(() => G.ui.phoneNote('@solara.oficial', 'Dica: siga os ícones no mapa — 📦 entregas, 🏁 corridas, 📸 fotos e 🚕 táxi. Ninguém se machuca aqui!'), 2500);
  last = performance.now();
};
$('raceBtn').onclick = () => { $('play').onclick(); G.race.openMenu(); };
// atalhos rápidos
$('qRace').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); if (G.race.active) G.race.askQuit(); else G.race.openMenu(); };
$('qJet').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.jet.toggle(); };
$('qHeli').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.callHeli(); };
$('qPlane').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.callPlane(); };
$('qCar').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.callCar(); };
$('qHome').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.home.go(); };
$('qFlash').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.street.flash(); };
$('qSerp').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.serp.go(); };
$('ponteQuit').onclick = (e) => { e.stopPropagation(); if (G.ponte) G.ponte.quit(); };
$('ponteQuit').addEventListener('pointerdown', (e) => e.stopPropagation());
$('qPonte').onclick = () => { if (!G.started || G.paused) return; G.audio.init(); G.ponte.go(); };
for (const id of ['qRace', 'qJet', 'qHeli', 'qPlane', 'qCar', 'qHome', 'qFlash', 'qSerp', 'qPonte']) $(id).addEventListener('pointerdown', (e) => e.stopPropagation());
addEventListener('visibilitychange', () => { if (document.hidden) { persist(); if (G.rec && G.rec.recording) G.rec.stop(); } });
addEventListener('pagehide', persist);

// ---------------- API de teste (somente leitura/ações do próprio jogo)
window.MBD = {
  bail() { return G.bail; }, walkable(x, z) { return walkable(x, z); },
  callCar: () => G.callCar(), SIGNATURE, hero: () => G.hero, get sigCar() { return G.sigCar; }, get carCall() { return G.carCall; },
  get state() { const p = G.player; return { x: p.x, z: p.z, y: p.y, inVehicle: !!p.vehicle, vehicle: p.vehicle && p.vehicle.type, speed: p.vehicle ? p.vehicle.speed : Math.hypot(p.vx || 0, p.vz || 0), hour: G.env.hour, money: save.money, mission: G.missions.active && G.missions.active.type, fps, pr, quality: Q.level, draws: renderer.info.render.calls, tris: renderer.info.render.triangles, done: save.done, avatar: G.hero.id, avatar3d: !!G.hero.rig, anim: G.hero.cur ? G.hero.cur.getClip().name : G.hero.mode, grounded: p.grounded, device: Q.device, prMax: Q.prMax, peds: Q.peds, detail: Q.detail, lodHidden: G.lodHidden || 0, talkers: G.talk.talkers.length, talking: !!G.talk.cur, heliAlt: G.heli.y - groundY(G.heli.x, G.heli.z), heliAir: G.heli.air, helisFlying: G.helis.list.filter(h => h.root.visible).length, loadMs: G.loadMs }; },
  teleport(x, z, h = 0) { const p = G.player; if (G.bail) G.bail.cancel(); if (p.vehicle) { p.vehicle.place(x, z, h); } p.vx = p.vz = p.vy = 0; p.x = x; p.z = z; p.h = h; p.y = surfaceY(x, z); G.camYaw = h; camInit = false; },
  setHour(h) { G.env.setTime(h); G.env.update(0.001, G.t, camera.position); G.env.updateEnv(); },
  weather(w) { G.env.setWeather(w); G.env.rain = w === 'chuva' ? 1 : 0; G.env.cloud = w === 'chuva' ? 0.85 : 0.25; G.env.wet = w === 'chuva' ? 1 : 0; },
  action, startNear, keys, nearestVehicle: () => { const v = nearestVehicle(); return v && v.type; },
  missionTarget: () => G.missions.active && [G.missions.active.tx, G.missions.active.tz],
  fpsHist,
  neutral: (on) => G.setNeutral(on), get isNeutral() { return !!input.neutral; }, rec: () => G.rec, garage: () => G.garage, rivals: () => G.rivals, nitro: (on) => { input.nitro = !!on; },
  tuneCar: (t) => { const v = G.player.vehicle; if (v) G.replaceVehicle(v, t); },
  sim(n, dt = 1 / 30) { const t0 = performance.now(); for (let i = 0; i < n; i++) step(dt); recordStep((performance.now() - t0) / Math.max(1, n)); }, // testes: avança a lógica sem desenhar
  frameStats: () => G.frameStats(),
  cam: () => camera, jet: () => G.jet, home: () => G.home, voice: () => G.voice, callHeli: () => G.callHeli(), callPlane: () => G.callPlane(), plane: () => G.plane, race: () => G.race, track: () => G.track, fx: () => G.fx, drift: () => G.drift,
  life: () => G.life, crowd: () => G.crowd, birds: () => G.birds, gifts: () => G.gifts, street: () => G.street, serp: () => G.serp, ponte: () => G.ponte, ilhas: () => G.ilhas, boatRace: () => G.boatRace, mega: () => G.mega, gps: () => G.gps, beach: () => G.beach, orla: () => G.orla, enterCar: (v) => G.enterCar(v), vehicles: () => G.vehicles,
  leaveCar: (s) => G.leaveCar(s), drive: () => DriveUI, respawnFade, onActTap, enterNearest, MOTOR, input,
  avatar: (id) => G.setAvatar(id), power: () => G.powers.trigger(), powers: () => G.powers, talk: () => G.talk, heli: () => G.heli, helis: () => G.helis, input,
};

boot().catch(e => { console.error(e); $('play').textContent = 'Erro ao carregar: ' + e.message; });
requestAnimationFrame(loop);
