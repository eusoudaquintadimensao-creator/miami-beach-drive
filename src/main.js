// Miami Beach Drive — Solara Bay · mundo aberto sem violência (three.js)
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { clamp, lerp, angDiff, smooth } from './util.js';
import { buildWorld, SPAWNS, NODES, groundY, surfaceY, walkable, collide, rayBlock, LANDMARKS, onPier, WATER_Y, boatable } from './world.js';
import { createEnv } from './env.js';
import { Vehicle, SPECS, setVehicleLights } from './vehicles.js';
import { Crowd, Hero } from './people.js';
import { Traffic } from './traffic.js';
import { AudioSys, STATIONS } from './audio.js';
import { Missions } from './missions.js';
import { UI } from './ui.js';
import { Recorder } from './recorder.js';
import { initInstall, promptInstall } from './install.js';
import { Garage } from './garage.js';
import { Rivals } from './rivals.js';

const SAVE_KEY = 'mbd-solara-v1';
const $ = (id) => document.getElementById(id);
const touch = matchMedia('(pointer: coarse)').matches || ('ontouchstart' in window && navigator.maxTouchPoints > 0);
if (touch) document.body.classList.add('touch');
initInstall({ toast: (t) => G.ui ? G.ui.toast(t, 4000) : null });
const nextFrame = () => new Promise(r => requestAnimationFrame(() => setTimeout(r, 0)));

// ---------------- progresso salvo
const save = Object.assign({ money: 0, followers: 0, shells: [], photos: [], done: 0, best: {}, hour: 17.4, weather: 'limpo', station: 0, quality: 'auto', muted: false, sens: 1, pos: null }, (() => { try { return JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); } catch (e) { return {}; } })());

// ---------------- qualidade
function detectQuality() {
  let gpu = '';
  try { const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); const ext = gl && gl.getExtension('WEBGL_debug_renderer_info'); gpu = gl ? (ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : ''; } catch (e) { }
  const weak = /swiftshader|llvmpipe|software|mali-[4t]|adreno \(tm\) [3-5]\d\d|powervr|intel\(r\) hd graphics [2-5]/i.test(gpu);
  const cores = navigator.hardwareConcurrency || 4, mem = navigator.deviceMemory || 4;
  if (weak || (touch && (cores <= 4 || mem <= 3))) return 'low';
  if (touch) return 'medium';
  if (/apple m\d|rtx|gtx|radeon|nvidia|geforce|arc /i.test(gpu)) return 'high';
  return 'medium';
}
const PRESETS = {
  low: { level: 'low', prMin: 0.55, prMax: 1, shadows: false, shadowSize: 512, bloom: false, clouds: false, env: true, peds: 18, traffic: 9, fog: 0.0019, aniso: 2, expo: 1.05, msaa: 0, viewHide: 170 },
  medium: { level: 'medium', prMin: 0.7, prMax: 1.5, shadows: true, shadowSize: 1024, bloom: true, clouds: true, env: true, peds: 40, traffic: 16, fog: 0.0013, aniso: 4, expo: 1, msaa: 2, viewHide: 220 },
  high: { level: 'high', prMin: 0.9, prMax: 2, shadows: true, shadowSize: 2048, bloom: true, clouds: true, env: true, peds: 64, traffic: 22, fog: 0.0011, aniso: 8, expo: 1, msaa: 4, viewHide: 280 },
};
const urlQ = new URLSearchParams(location.search).get('q');
const qName = (urlQ && PRESETS[urlQ]) ? urlQ : save.quality !== 'auto' && PRESETS[save.quality] ? save.quality : detectQuality();
const Q = PRESETS[qName];
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
const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.15, 6000);
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
    const p = G.player; save.pos = { x: +p.x.toFixed(1), z: +p.z.toFixed(1), h: +p.h.toFixed(2) };
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
  G.world = buildWorld(scene, Q);
  status('Acendendo o neon…'); await nextFrame();
  G.env = createEnv(scene, renderer, Q); G.env.setTime(save.hour); G.env.weather = save.weather; G.env.cloud = save.weather === 'chuva' ? 0.85 : 0.25; G.env.rain = save.weather === 'chuva' ? 1 : 0;
  setupComposer();
  status('Chamando os moradores…'); await nextFrame();
  G.hero = new Hero(scene, Q);
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
  G.audio = new AudioSys(); G.audio.muted = !!save.muted; G.audio.station = save.station || 0;
  G.ui = new UI(G);
  G.rivals = new Rivals(G);
  G.missions = new Missions(G);
  G.garage = new Garage(G);
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
  $('play').disabled = false; status('▶  JOGAR');
  G.ready = true; window.MBD_READY = true;
}
G.replaceVehicle = (v, tune, color) => {
  const nv = new Vehicle(v.type, scene, Q, tune ? undefined : (color ?? v.color), tune);
  nv.place(v.x, v.z, v.h); nv.nitro = v.nitro ?? 1; nv.mine = !!tune || v.mine;
  const i = G.vehicles.indexOf(v); if (i >= 0) G.vehicles[i] = nv; else G.vehicles.push(nv);
  if (G.player.vehicle === v) { G.player.vehicle = nv; nv.driver = G.player; nv.parked = false; }
  v.dispose(scene); return nv;
};
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
  if (e.code === 'KeyV' && !e.repeat && $('recPanel').hidden) { G.rec.toggle(); return; }
  if (e.code === 'Escape' && !$('recPanel').hidden) { $('recPanel').hidden = true; G.paused = false; return; }
  if (e.code === 'Escape') { if (!$('bigmap').hidden) G.ui.closeMap(); else if (!$('photo').hidden) { $('photo').hidden = true; G.paused = false; } else if (G.phoneOpen) G.ui.closePhone(); else if (!document.pointerLockElement) G.ui.openPhone(); }
  if (G.paused && !['KeyM', 'KeyP'].includes(e.code)) return;
  if (e.code === 'KeyE' || e.code === 'KeyF' && false) action();
  if (e.code === 'Enter') startNear();
  if (e.code === 'KeyF') photo();
  if (e.code === 'KeyH') horn();
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
$('stickZone').addEventListener('pointermove', (e) => { if (e.pointerId !== stickId) return; let dx = e.clientX - stickO[0], dy = e.clientY - stickO[1]; const d = Math.hypot(dx, dy), R = 55; if (d > R) { dx *= R / d; dy *= R / d; } knob.style.transform = `translate(${dx}px,${dy}px)`; input.stick = [dx / R, -dy / R]; });
const stickEnd = (e) => { if (e.pointerId !== stickId) return; stickId = null; input.stick = null; knob.style.transform = ''; stickEl.style.opacity = ''; stickEl.style.left = ''; stickEl.style.top = ''; };
$('stickZone').addEventListener('pointerup', stickEnd); $('stickZone').addEventListener('pointercancel', stickEnd);
canvas.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') return; looks.set(e.pointerId, [e.clientX, e.clientY]); });
canvas.addEventListener('pointermove', (e) => { const l = looks.get(e.pointerId); if (!l || G.paused) return; const dx = e.clientX - l[0], dy = e.clientY - l[1]; l[0] = e.clientX; l[1] = e.clientY; G.camYaw -= dx * 0.006 * save.sens; G.camPitch = clamp(G.camPitch + dy * 0.004 * save.sens, -0.35, 1.1); lookT = 1.6; });
const lookEnd = (e) => looks.delete(e.pointerId); canvas.addEventListener('pointerup', lookEnd); canvas.addEventListener('pointercancel', lookEnd);
const hold = (id, on, off) => { const b = $(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); G.audio && G.audio.init(); b.classList.add('on'); on && on(); }); const up = () => { b.classList.remove('on'); off && off(); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); b.addEventListener('pointerleave', up); };
hold('bAct', () => action()); hold('bJump', () => { input.jump = true; input.hb = true; }, () => { input.hb = false; });
hold('bPhoto', () => photo()); hold('bHorn', () => horn()); hold('bStart', () => startNear());
hold('bNitro', () => { input.nitro = true; }, () => { input.nitro = false; });
$('bRec').onclick = () => { G.audio.init(); G.rec.toggle(); };
$('rpClose').onclick = () => { $('recPanel').hidden = true; G.paused = false; };
$('bPhone').onclick = () => G.phoneOpen ? G.ui.closePhone() : G.ui.openPhone(); $('bMap').onclick = () => G.ui.openMap(); $('bRadio').onclick = () => { G.audio.init(); G.radioSet(G.audio.station + 1); }; $('bCam').onclick = () => cycleCam();
function cycleCam() { G.camMode = (G.camMode + 1) % 3; G.ui.toast(['Câmera normal', 'Câmera distante', 'Câmera próxima'][G.camMode], 1400); }
G.radioSet = (i) => { const st = G.audio.setStation(i); save.station = G.audio.station; G.ui.radio(st); persist(); };
function horn() { if (!G.player.vehicle) return; G.audio.horn(); const p = G.player; for (const c of G.crowd.peds) if (Math.hypot(c.x - p.x, c.z - p.z) < 14 && c.mode !== 'dodge' && c.mode !== 'lie') { c.mode = 'wave'; c.t = 1.5; c.h = Math.atan2(p.x - c.x, p.z - c.z); } }
let photoReq = false;
function photo() { if (!G.started || G.paused) return; photoReq = true; G.audio.chime('photo'); }

// ---------------- entrar e sair
function nearestVehicle() {
  const p = G.player; let best = null, bd = 1e9;
  for (const v of G.vehicles) { if (v.driver) continue; let d = Math.hypot(v.x - p.x, v.z - p.z); if (d > 12) continue; for (const c of v.circles()) d = Math.min(d, Math.hypot(c[0] - p.x, c[1] - p.z)); const lim = v.spec.boat ? 5.5 : 3.2; if (d < lim && d < bd) { bd = d; best = v; } }
  return best;
}
function action() {
  if (!G.started || G.paused) return; G.audio.init();
  const p = G.player;
  if (p.vehicle) return exitVehicle();
  const v = nearestVehicle(); if (!v) { G.ui.toast('Nenhum veículo perto. Procure um carro estacionado 🚗', 2000); return; }
  p.vehicle = v; v.driver = p; v.parked = false; v.vx = v.vz = v.vf = 0;
  if (v.type === 'moto' || v.spec.boat) { v.body.add(G.hero.g); if (v.type === 'moto') G.hero.g.position.set(0, 0.5, -0.3); else G.hero.g.position.set(0, 0.82, -0.2); G.hero.g.rotation.set(0, 0, 0); }
  else G.hero.g.visible = false;
  G.ui.toast(`${SPECS[v.type].name}${v.type === 'taxi' ? ' · aperte <b>Iniciar</b> para pegar passageiros' : ''}`, 2400);
  if (STATIONS[G.audio.station].bpm) G.ui.radio(STATIONS[G.audio.station]);
  G.camYaw = v.h;
}
function exitVehicle() {
  const p = G.player, v = p.vehicle; if (!v) return;
  if (v.speed > 6 && !v.spec.boat) { G.ui.toast('Pare o veículo para descer', 1500); return; }
  const [fx, fz] = v.fwd(); let spot = null;
  const tries = v.spec.boat ? [] : [[-fz * -1.8, fx * -1.8], [fz * -1.8, -fx * -1.8], [fx * 3.2, fz * 3.2], [-fx * 3.4, -fz * 3.4]];
  for (const [ox, oz] of tries) { const x = v.x + ox, z = v.z + oz; if (walkable(x, z)) { spot = [x, z]; break; } }
  if (v.spec.boat) { for (let r = 3; r < 12 && !spot; r += 1) for (let a = 0; a < 16; a++) { const x = v.x + Math.cos(a / 16 * Math.PI * 2) * r, z = v.z + Math.sin(a / 16 * Math.PI * 2) * r; if (walkable(x, z)) { spot = [x, z]; break; } } }
  if (!spot) { G.ui.toast(v.spec.boat ? 'Encoste a lancha num píer ou na praia para descer ⚓' : 'Sem espaço para descer aqui', 2200); return; }
  if (G.missions.active && (G.missions.active.type === 'corrida' || G.missions.active.type === 'taxi')) G.missions.cancel(G.missions.active.type === 'taxi' ? 'Corrida de táxi encerrada' : 'Corrida cancelada');
  scene.add(G.hero.g); G.hero.g.visible = true; G.hero.g.rotation.set(0, 0, 0);
  p.x = spot[0]; p.z = spot[1]; p.y = surfaceY(p.x, p.z); p.h = v.h; v.driver = null; v.parked = true; p.vehicle = null; v.brakeOn = false; v.steer = 0;
  if (!v.spec.boat) { v.vx = v.vz = v.vf = 0; }
}
function startableNear() {
  const p = G.player; const ms = G.missions; if (ms.active || ms.cool > 0) return null;
  const v = p.vehicle; if (v && v.type === 'taxi') return { taxi: true, name: 'Corridas de táxi' };
  const { s, d } = ms.nearestStart(p.x, p.z); if (s && d < (v ? 9 : 5)) return s; return null;
}
function startNear() { if (!G.started || G.paused) return; const s = startableNear(); if (!s) return; G.audio.init(); if (s.taxi) G.missions.startTaxi(); else G.missions.start(s); }

// ---------------- atualização do jogador
const tmp = new THREE.Vector3();
let shake = 0;
function updatePlayer(dt) {
  const p = G.player, v = p.vehicle, hero = G.hero;
  let mx = 0, my = 0;
  if (keys.has('KeyW') || keys.has('ArrowUp')) my += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) my -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) mx += 1; if (keys.has('KeyA') || keys.has('ArrowLeft')) mx -= 1;
  let mag = Math.min(1, Math.hypot(mx, my)); let fromStick = false;
  if (input.stick) { mx = input.stick[0]; my = input.stick[1]; mag = Math.min(1, Math.hypot(mx, my)); fromStick = true; }
  if (v) {
    let steer = mx, thr = my;
    if (fromStick) { steer = Math.sign(mx) * Math.min(1, Math.abs(mx) * 1.25) ** 1.4; thr = Math.abs(my) < 0.18 ? 0 : my; }
    const hb = keys.has('Space') || input.hb; const nitro = keys.has('ShiftLeft') || keys.has('ShiftRight') || input.nitro;
    const n = Math.ceil(dt / (1 / 60)); let impact = 0;
    const others = G.vehicles.concat(G.traffic.cars.filter(c => c.active), G.rivals.cars);
    for (let i = 0; i < n; i++) impact = Math.max(impact, v.drive(dt / n, { x: steer, y: thr, hb, nitro }, others, G.t));
    if (v.boosting && !G._wasBoost) { G.audio.nitro(); } G._wasBoost = v.boosting;
    if (impact > 2.5) { G.audio.thud(impact); shake = Math.min(0.6, impact * 0.03); }
    p.x = v.x; p.z = v.z; p.y = v.y; p.h = v.h;
    if (v.type === 'moto' || v.spec.boat) { hero.pose(v.type === 'moto' ? 'drive' : 'idle', 0, dt); }
    G.engine = { type: v.type, rpm: v.rpm, thr: Math.max(0, thr) };
    G.skid = !v.spec.boat && v.drift > 3.5 ? v.drift : 0;
    return;
  }
  G.engine = null; G.skid = 0;
  const run = fromStick ? mag > 0.85 : keys.has('ShiftLeft') || keys.has('ShiftRight');
  const fx = Math.sin(G.camYaw), fz = Math.cos(G.camYaw), rx = -fz, rz = fx;
  let dx = fx * my + rx * mx, dz = fz * my + rz * mx; const dl = Math.hypot(dx, dz);
  const speed = (fromStick ? mag * (run ? 7 : 4.4) : (mag > 0 ? (run ? 7 : 4.2) : 0));
  if (dl > 0.05) { dx /= dl; dz /= dl; p.h += angDiff(p.h, Math.atan2(dx, dz)) * Math.min(1, dt * 12); }
  const nx = p.x + dx * speed * dt, nz = p.z + dz * speed * dt;
  if (walkable(nx, p.z)) p.x = nx; if (walkable(p.x, nz)) p.z = nz;
  tmp.set(p.x, 0, p.z); collide(tmp, 0.35, false, p.y + 0.2); p.x = tmp.x; p.z = tmp.z;
  for (const o of G.vehicles.concat(G.traffic.cars, G.rivals.cars)) { if (o.npc && !o.active) continue; for (const c of o.circles()) { const ex = p.x - c[0], ez = p.z - c[1], d = Math.hypot(ex, ez), rr = o.r + 0.35; if (d < rr && d > 1e-4) { p.x = c[0] + ex / d * rr; p.z = c[1] + ez / d * rr; } } }
  const gy = surfaceY(p.x, p.z);
  if ((keys.has('Space') || input.jump) && p.grounded) { p.vy = 5.2; p.grounded = false; }
  input.jump = false;
  p.vy -= 16 * dt; p.y += p.vy * dt; if (p.y <= gy) { p.y = gy; p.vy = 0; p.grounded = true; } else if (p.y - gy > 0.05) p.grounded = false;
  if (p.grounded && Math.abs(p.y - gy) < 0.3) p.y = lerp(p.y, gy, Math.min(1, dt * 20));
  hero.g.position.set(p.x, p.y, p.z); hero.g.rotation.y = p.h;
  hero.ph += dt * (run ? 11 : 7.5) * (speed > 0.1 ? 1 : 0);
  hero.pose(!p.grounded ? 'jump' : speed > 0.1 ? 'walk' : 'idle', run ? 0.95 : 0.6 * Math.min(1, speed / 3), dt);
}

// ---------------- câmera
let camInit = false;
const camPos = new THREE.Vector3(), camLook = new THREE.Vector3();
G.snapCam = () => { camInit = false; if (G.player.vehicle) G.camYaw = G.player.vehicle.h; };
function updateCamera(dt, snap) {
  const p = G.player, v = p.vehicle; lookT -= dt;
  const mult = [1, 1.45, 0.7][G.camMode];
  let D, H, focusY;
  if (v) {
    D = v.spec.cam * mult + Math.min(v.speed, 40) * 0.05; H = 0; focusY = v.spec.boat ? 2.2 : v.type === 'suv' ? 1.9 : 1.5;
    if (lookT <= 0 && v.speed > 2) { const target = v.vf < -1 ? v.h : v.h; G.camYaw += angDiff(G.camYaw, target) * Math.min(1, dt * 2.6); G.camPitch = lerp(G.camPitch, 0.16, dt * 1.5); }
  } else { D = 4.3 * mult; focusY = 1.55; }
  const yaw = G.camYaw, pit = G.camPitch;
  const fx = p.x, fz = p.z, fy = p.y + focusY;
  let cx = fx - Math.sin(yaw) * Math.cos(pit) * D, cz = fz - Math.cos(yaw) * Math.cos(pit) * D, cy = fy + Math.sin(pit) * D + (v ? 0.6 : 0.15);
  const tb = rayBlock(fx, fz, fy, cx, cz, cy); if (tb < 1) { const k = Math.max(0.12, tb - 0.06); cx = fx + (cx - fx) * k; cz = fz + (cz - fz) * k; cy = fy + (cy - fy) * k; }
  const floor = Math.max(surfaceY(cx, cz), WATER_Y) + 0.35; if (cy < floor) cy = floor;
  if (snap || !camInit) { camPos.set(cx, cy, cz); camInit = true; } else { const k = Math.min(1, dt * (v ? 10 : 14)); camPos.x = lerp(camPos.x, cx, k); camPos.y = lerp(camPos.y, cy, k); camPos.z = lerp(camPos.z, cz, k); }
  camera.position.copy(camPos);
  if (v && v.boosting) shake = Math.max(shake, 0.06);
  if (shake > 0) { camera.position.x += (Math.random() - 0.5) * shake; camera.position.y += (Math.random() - 0.5) * shake; shake = Math.max(0, shake - dt * 2); }
  camLook.set(fx + (v ? Math.sin(v.h) * 2 : 0), fy, fz + (v ? Math.cos(v.h) * 2 : 0)); camera.lookAt(camLook);
  const portrait = innerHeight > innerWidth; const baseF = portrait ? 72 : 60; const f = baseF + (v ? Math.min(14, v.speed * 0.28) + (v.boosting ? 9 : 0) : 0);
  if (Math.abs(camera.fov - f) > 0.05) { camera.fov = lerp(camera.fov, f, Math.min(1, dt * 3)); camera.updateProjectionMatrix(); }
}

// ---------------- interface por quadro
let headlight = null;
function updatePrompts() {
  const p = G.player, v = p.vehicle; const ui = G.ui;
  const s = startableNear(); const near = !v && nearestVehicle();
  const lm = LANDMARKS.find(l => Math.hypot(l.x - p.x, l.z - p.z) < l.r);
  let html = '';
  if (s) html = touch ? `Toque em ▶ para iniciar: <b>${s.name}</b>` : `<kbd>Enter</kbd> iniciar: <b>${s.name}</b>`;
  else if (near && near.mine) html = `<kbd>E</kbd> ${touch ? 'Toque em 🚗 para ' : ''}entrar: <b>seu carro tunado</b>`;
  else if (near) html = `<kbd>E</kbd> ${touch ? 'Toque em 🚗 para ' : ''}entrar: <b>${SPECS[near.type].name}</b>`;
  else if (lm && !G.save.photos.includes(lm.id)) html = `<kbd>F</kbd> 📷 Ponto de foto: <b>${lm.name}</b>`;
  ui.prompt(html);
  const nw = $('nitroW'); const hasN = !!(v && v.tune); if (nw.hidden === hasN) nw.hidden = !hasN;
  if (hasN) { $('nitroF').style.transform = `scaleX(${v.nitro.toFixed(3)})`; nw.classList.toggle('on', v.boosting); }
  if (touch) {
    const act = $('bAct'); const lbl = v ? '🚶<small>Sair</small>' : '🚗<small>Entrar</small>'; if (act._l !== lbl) { act.innerHTML = lbl; act._l = lbl; }
    act.style.opacity = v || near ? 1 : 0.45;
    $('bStart').hidden = !s; $('bHorn').hidden = !v; $('bNitro').hidden = !(v && v.tune); if (!v || !v.tune) input.nitro = false; $('bJump').innerHTML = v ? '⛔<small>Freio</small>' : '⤒<small>Pular</small>';
  }
}

// ---------------- laço principal
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
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (!G.ready) return;
  if (G.started && !G.paused) step(dt);
  else if (G.started && G.garageOpen) { G.t += dt; G.garage.frame(dt, camera); G.env.update(dt * 0.3, G.t, camera.position); G.world.setNight(G.env.night, G.env.wet); setVehicleLights(G.env.night); G.world.update(G.t, dt); const gv = G.player.vehicle; if (gv) gv.sync(0); }
  else if (G.started && G.paused) { /* pausado: redesenha devagar */ if ((G._pz = (G._pz || 0) + dt) < 0.25) { realLast = now; fpsN = 0; fpsAcc = 0; return; } G._pz = 0; }
  else { G.t += dt; G.env.update(dt * 0.2, G.t, camera.position); const a = G.t * 0.05; camera.position.set(320 + Math.cos(a) * 40, 22, -150 + Math.sin(a) * 60); camera.lookAt(260, 10, -150); G.world.setNight(G.env.night, G.env.wet); G.world.update(G.t, dt); }
  render();
  fpsAcc += (now - realLast) / 1000; realLast = now; fpsN++; if (fpsAcc >= 1) { fps = fpsN / fpsAcc; fpsAcc = 0; fpsN = 0; fpsHist.push(fps); if (fpsHist.length > 30) fpsHist.shift(); if (G.showFps) $('fps').textContent = `${fps.toFixed(0)} fps · ${Q.level} · ${pr.toFixed(2)}x · ${renderer.info.render.calls} draws`; else $('fps').textContent = ''; if (G.started && !G.paused) adapt(); }
}
function adapt() { // resolução dinâmica para manter fluido
  if (fps < 40 && pr > (G.recording ? 0.9 : Q.prMin) + 0.01) setPR(pr - 0.1);
  else if (fps > 57 && pr < Math.min(Q.prMax, devicePixelRatio || 1, recCap()) - 0.01) setPR(pr + 0.05);
  if (save.quality === 'auto' && !urlQ && fps < 22 && pr <= Q.prMin + 0.01 && Q.level !== 'low') { slowT++; if (slowT >= 6 && !sessionStorage.getItem('mbd-down')) { sessionStorage.setItem('mbd-down', '1'); G.ui.toast('Deixando os gráficos mais leves para ficar fluido…'); persist(); const nq = Q.level === 'high' ? 'medium' : 'low'; setTimeout(() => { location.search = '?q=' + nq; }, 900); } } else slowT = 0;
}
function step(dt) {
  G.t += dt; const t = G.t;
  updatePlayer(dt);
  const honk = G.traffic.update(dt, t, G.player, G.crowd, Q);
  if (honk) G.audio.far_horn(clamp(1 - Math.hypot(honk.x - G.player.x, honk.z - G.player.z) / 60, 0.2, 1));
  const movers = [G.player.vehicle, ...G.traffic.cars.filter(c => c.active), ...G.rivals.cars].filter(Boolean);
  G.crowd.update(dt, t, G.player, movers, camera, (p, txt) => G.ui.pedBubble(p, txt));
  G.rivals.update(dt, t, G.missions.active && G.missions.active.race && G.missions.active.race.rivals ? G.missions.active : null);
  G.missions.update(dt, t);
  updateCamera(dt);
  const K = G.env.update(dt, t, camera.position);
  G.world.setNight(G.env.night, G.env.wet); setVehicleLights(G.env.night); G.world.update(t, dt);
  if (grade) { grade.uniforms.uWarm.value = 0.4 + (1 - G.env.night) * 0.4; grade.uniforms.uSat.value = 1.15 + G.env.night * 0.1 - G.env.rain * 0.15; }
  if (zoomBlur) { const bv = G.player.vehicle; const want = bv && bv.boosting ? Math.min(1, bv.speed / 40) : 0; zoomBlur.uniforms.uAmt.value += (want - zoomBlur.uniforms.uAmt.value) * Math.min(1, dt * 6); zoomBlur.enabled = zoomBlur.uniforms.uAmt.value > 0.02; }
  if (bloom) { bloom.strength = 0.32 + G.env.night * 0.55 + G.env.wet * 0.1; bloom.threshold = 2.4 - G.env.night * 1.4; }
  // farol do jogador à noite
  const v = G.player.vehicle;
  if (Q.level !== 'low' && v && !v.spec.boat && G.env.night > 0.3) {
    if (!headlight) { headlight = new THREE.SpotLight(0xfff2d8, 0, 70, 0.55, 0.5, 1.2); scene.add(headlight, headlight.target); }
    const [fx, fz] = v.fwd(); headlight.position.set(v.x + fx * 2.2, v.y + 0.8, v.z + fz * 2.2); headlight.target.position.set(v.x + fx * 20, v.y - 0.5, v.z + fz * 20); headlight.intensity = 60 * G.env.night;
  } else if (headlight) headlight.intensity = 0;
  // esconde carros estacionados distantes
  for (const c of G.vehicles) c.root.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < Q.viewHide;
  for (const c of G.traffic.cars) if (c.active) c.root.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) < Q.viewHide + 40;
  // rota
  G._rt = (G._rt || 0) - dt; if (G.routeDest && G._rt <= 0) { G._rt = 1.2; computeRoute(); }
  // áudio
  const p = G.player; const sea = Math.max(smooth(140, 10, Math.abs(p.x - 390)), p.x > -300 && p.x < 70 ? smooth(80, 0, Math.min(Math.abs(p.x + 260), Math.abs(p.x - 30))) * 0.6 : 0);
  const city = p.x > -680 && p.x < 330 ? 1 : 0.3;
  G.audio.update(dt, { inVehicle: !!v, engine: G.engine, skid: G.skid, sea, city, rain: G.env.rain, boost: !!(v && v.boosting) });
  if (G.env.flash > 0.95) G.audio.thunder();
  G.ui.frame(dt, camera); updatePrompts();
  saveT += dt; if (saveT > 8) { saveT = 0; persist(); }
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

$('play').onclick = () => {
  G.audio.init(); $('start').hidden = true; $('hud').hidden = false; G.started = true; G.ui.resize(); resize();
  if (touch && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => { });
  G.ui.toast('Bem-vindo(a) a <b>Solara Bay</b>! 🌴<br>Ande até um carro e aperte <b>' + (touch ? '🚗' : 'E') + '</b>', 5000);
  if (!save.done) setTimeout(() => G.ui.phoneNote('@solara.oficial', 'Dica: siga os ícones no mapa — 📦 entregas, 🏁 corridas, 📸 fotos e 🚕 táxi. Ninguém se machuca aqui!'), 2500);
  last = performance.now();
};
addEventListener('visibilitychange', () => { if (document.hidden) { persist(); if (G.rec && G.rec.recording) G.rec.stop(); } });
addEventListener('pagehide', persist);

// ---------------- API de teste (somente leitura/ações do próprio jogo)
window.MBD = {
  get state() { const p = G.player; return { x: p.x, z: p.z, inVehicle: !!p.vehicle, vehicle: p.vehicle && p.vehicle.type, speed: p.vehicle ? p.vehicle.speed : 0, hour: G.env.hour, money: save.money, mission: G.missions.active && G.missions.active.type, fps, pr, quality: Q.level, draws: renderer.info.render.calls, tris: renderer.info.render.triangles, done: save.done }; },
  teleport(x, z, h = 0) { const p = G.player; if (p.vehicle) { p.vehicle.place(x, z, h); } p.x = x; p.z = z; p.h = h; p.y = surfaceY(x, z); G.camYaw = h; camInit = false; },
  setHour(h) { G.env.setTime(h); G.env.update(0.001, G.t, camera.position); G.env.updateEnv(); },
  weather(w) { G.env.setWeather(w); G.env.rain = w === 'chuva' ? 1 : 0; G.env.cloud = w === 'chuva' ? 0.85 : 0.25; G.env.wet = w === 'chuva' ? 1 : 0; },
  action, startNear, keys, nearestVehicle: () => { const v = nearestVehicle(); return v && v.type; },
  missionTarget: () => G.missions.active && [G.missions.active.tx, G.missions.active.tz],
  fpsHist,
  rec: () => G.rec, garage: () => G.garage, rivals: () => G.rivals, nitro: (on) => { input.nitro = !!on; },
  tuneCar: (t) => { const v = G.player.vehicle; if (v) G.replaceVehicle(v, t); },
};

boot().catch(e => { console.error(e); $('play').textContent = 'Erro ao carregar: ' + e.message; });
requestAnimationFrame(loop);
