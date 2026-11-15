// t428: abertura cinematográfica — sobrevoo de drone da baía enquanto o jogo carrega, com barra de progresso REAL
// (bytes dos módulos baixados + etapas do boot). Cena mínima e barata (céu, mar, areia, prédios instanciados, palmeiras)
// desenhada já no primeiro segundo; a cidade de verdade assume a mesma câmera quando fica pronta (sem tela preta).
import * as THREE from 'three';
import { LOADMAN } from './loadman.js';

const CFG = { title: 'SOLARA BAY', key: 'mbd-solara-v1', skipKey: 'mbd-fly-skip', neon: false, defHour: 17.4 };
// trilha da câmera (coordenadas reais do mapa: mar a leste de x=390, orla em x≈320–390, ilha x 30–320)
const PATH = [
  [560, 30, 380, 330, 16, 180], [468, 13, 190, 335, 10, 30], [428, 8, 10, 330, 12, -120], [452, 26, -210, 300, 24, -330],
  [560, 62, -420, 320, 22, -190], [640, 48, -120, 300, 28, 60], [610, 38, 200, 320, 20, 260],
];
export const FLY_PERIOD = 56; // segundos por volta
const posC = new THREE.CatmullRomCurve3(PATH.map(p => new THREE.Vector3(p[0], p[1], p[2])), true, 'centripetal');
const lookC = new THREE.CatmullRomCurve3(PATH.map(p => new THREE.Vector3(p[3], p[4], p[5])), true, 'centripetal');
const _p = new THREE.Vector3(), _l = new THREE.Vector3();
export function flyCam(t, cam) { const u = ((t / FLY_PERIOD) % 1 + 1) % 1; posC.getPointAt(u, _p); lookC.getPointAt(u, _l); cam.position.copy(_p); cam.lookAt(_l); }

const $ = (id) => document.getElementById(id);
const B = window.__boot = { t: 0, p: 0, dl: 0, st: 0, label: 'carregando a cidade', ready: false, renderer: null, skipped: false, firstFrame: 0 };
let shown = 0, raf = 0, last = performance.now(), scene = null, camera = null;
const hour = (() => { try { const s = JSON.parse(localStorage.getItem(CFG.key) || '{}'); return typeof s.hour === 'number' ? s.hour : CFG.defHour; } catch (e) { return CFG.defHour; } })();
try { B.skipped = localStorage.getItem(CFG.skipKey) === '1'; } catch (e) { }

// ---- barra de progresso: 0–62% = bytes dos módulos (lista gerada em loadman.js), 62–100% = etapas do boot
const known = new Map(LOADMAN.files.map(([f, b]) => [f, b])); let got = 0; const seen = new Set();
function onRes(list) {
  for (const e of list.getEntries()) {
    const m = e.name.match(/\/((?:src|vendor)\/[^?#]+)/); if (!m || seen.has(m[1]) || !known.has(m[1])) continue;
    seen.add(m[1]); got += known.get(m[1]);
  }
  B.dl = Math.min(1, got / LOADMAN.total);
}
try { const po = new PerformanceObserver(onRes); po.observe({ type: 'resource', buffered: true }); } catch (e) { B.dl = 0.5; }
B.stage = (pct, label) => { B.st = Math.max(B.st, pct); if (label) B.label = label; };
const target = () => B.ready ? 100 : Math.min(99, B.dl * 62 + B.st * 0.38);
function ui(dt) {
  const tg = target(); shown = Math.min(tg, shown + Math.max(0.6, (tg - shown) * Math.min(1, dt * 4)) * (tg > shown ? 1 : 0)); if (shown > tg) shown = tg;
  const pc = Math.floor(shown); window.__loadPct = pc; B.p = pc;
  const f = $('ldFill'); if (f) f.style.transform = `scaleX(${(shown / 100).toFixed(4)})`;
  const l = $('ldPct'); if (l) l.textContent = pc + '%'; const s = $('ldStage'); if (s && s.textContent !== B.label) s.textContent = B.label;
  const pl = $('play'); if (pl && pl.disabled) pl.textContent = `Carregando · ${pc}%`;
}

// ---- cena mínima
function pal() {
  const h = hour, night = h < 5.8 || h > 19.6, gold = (h > 17.6 && h <= 19.6) || (h >= 5.8 && h < 7.2);
  if (night) return { top: 0x070b16, mid: 0x111c33, hor: CFG.neon ? 0x3a1f55 : 0x24365a, sun: 0x6a86c8, sea: 0x0a2230, sea2: 0x10414a, sand: 0x6b6250, ground: 0x1b1f24, fac: [0x2a2f38, 0x323843, 0x1f242c], win: CFG.neon ? 0xff4fb8 : 0xffd38a, win2: CFG.neon ? 0x29f0ff : 0xffe2a8, winOn: 0.9, fog: 0x14203a, sunDir: [0.3, 0.25, -0.9] };
  if (gold) return { top: 0x24344f, mid: 0xc98a6a, hor: 0xffc27a, sun: 0xffd08a, sea: 0x125e6c, sea2: 0x3fb3ad, sand: 0xe0c48e, ground: 0x6f7a62, fac: [0xe9dcc6, 0xd9cdb8, 0xb8c4cc, 0xf2ece0], win: 0xffcf8a, win2: 0xffe2a8, winOn: 0.25, fog: 0xe0a970, sunDir: [-0.85, 0.12, 0.2] };
  return { top: 0x2f6fb4, mid: 0x7fb0d8, hor: 0xd6ecf6, sun: 0xfff6dc, sea: 0x0b5d74, sea2: 0x37c2c0, sand: 0xeedcb0, ground: 0x7d9a62, fac: [0xf4efe6, 0xe6e0d4, 0xbcd0dc, 0xffffff], win: 0xffe9b0, win2: 0xffe9b0, winOn: 0.0, fog: 0xbfd8e8, sunDir: [-0.5, 0.6, 0.3] };
}
const LC = (h) => new THREE.Color(h); // cores em espaço linear; os shaders convertem para a tela no fim (colorspace_fragment)
function rng(s) { return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function build() {
  const P = pal(); scene = new THREE.Scene(); scene.fog = new THREE.Fog(P.fog, 260, 2600);
  camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 1, 6000);
  const sd = new THREE.Vector3(...P.sunDir).normalize();
  // céu
  const sky = new THREE.Mesh(new THREE.SphereGeometry(5000, 24, 12), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { top: { value: LC(P.top) }, mid: { value: LC(P.mid) }, hor: { value: LC(P.hor) }, sun: { value: LC(P.sun) }, sd: { value: sd } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'uniform vec3 top,mid,hor,sun,sd; varying vec3 vD; void main(){ float y = max(vD.y,0.); vec3 c = mix(hor, mid, smoothstep(0.,.12,y)); c = mix(c, top, smoothstep(.1,.6,y)); float s = max(dot(normalize(vD), sd),0.); c += sun*(pow(s,600.)*2.+pow(s,12.)*0.35); if (vD.y<0.) c = hor*0.8; gl_FragColor = vec4(c,1.); \n#include <colorspace_fragment>\n}' }));
  scene.add(sky);
  // mar: raso perto da areia, fundo longe; ondulação e brilho do sol baratos
  const seaM = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { t: { value: 0 }, hz: { value: LC(P.hor) }, a: { value: LC(P.sea) }, b: { value: LC(P.sea2) }, sun: { value: LC(P.sun) }, sd: { value: sd } }]),
    vertexShader: 'varying vec3 vW;\n#include <fog_pars_vertex>\nvoid main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xyz; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition; \n#include <fog_vertex>\n}',
    fragmentShader: 'uniform float t; uniform vec3 a,b,sun,sd,hz; varying vec3 vW; \n#include <fog_pars_fragment>\nvoid main(){ float sh = clamp(1.-(vW.x-390.)/160.,0.,1.); vec3 c = mix(a,b,sh*sh); float w = sin(vW.x*.09+t*1.3)*sin(vW.z*.07-t*.9)+sin((vW.x+vW.z)*.21+t*2.1)*.5; vec3 V = normalize(cameraPosition-vW); vec3 N = normalize(vec3(w*.06,1.,w*.05)); vec3 R = reflect(-V,N); float s = pow(max(dot(R,sd),0.),180.); float fr = pow(1.-max(V.y,0.),4.); c = mix(c*(0.9+w*.06), hz, fr*.55)+sun*s*1.6; float foam = smoothstep(.0,4.,6.-abs(vW.x-391.-sin(vW.z*.05+t)*1.5)); c = mix(c, vec3(.95), foam*.55); gl_FragColor = vec4(c,1.); \n#include <fog_fragment>\n#include <colorspace_fragment>\n}' });
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), seaM); sea.rotation.x = -Math.PI / 2; sea.position.set(1800, -0.6, 0); scene.add(sea); B._sea = seaM;
  const flat = (c) => new THREE.MeshBasicMaterial({ color: c, toneMapped: false });
  const sand = new THREE.Mesh(new THREE.PlaneGeometry(76, 1500), flat(P.sand)); sand.rotation.x = -Math.PI / 2; sand.position.set(355, 0, 0); scene.add(sand);
  const isl = new THREE.Mesh(new THREE.PlaneGeometry(300, 1500), flat(P.ground)); isl.rotation.x = -Math.PI / 2; isl.position.set(168, -0.05, 0); scene.add(isl);
  const road = new THREE.Mesh(new THREE.PlaneGeometry(16, 1500), flat(0x3a3c40)); road.rotation.x = -Math.PI / 2; road.position.set(306, 0.05, 0); scene.add(road);
  // prédios instanciados com janelas procedurais (sem texturas)
  const N = 170, geo = new THREE.BoxGeometry(1, 1, 1); geo.translate(0, 0.5, 0);
  const bm = new THREE.ShaderMaterial({ fog: true, uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { win: { value: LC(P.win) }, win2: { value: LC(P.win2) }, on: { value: P.winOn }, sd: { value: sd } }]),
    vertexShader: 'attribute vec3 col; varying vec3 vC, vN, vL;\n#include <fog_pars_vertex>\nvoid main(){ vC = col; vec4 w = modelMatrix*instanceMatrix*vec4(position,1.); vL = (instanceMatrix*vec4(position,1.)).xyz; vN = normalize(mat3(instanceMatrix)*normal); vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition; \n#include <fog_vertex>\n}',
    fragmentShader: 'uniform vec3 win, win2, sd; uniform float on; varying vec3 vC, vN, vL; \n#include <fog_pars_fragment>\nvoid main(){ float l = .55+.45*max(dot(normalize(vN),sd),0.); vec3 c = vC*l; if (abs(vN.y)<.5){ vec2 q = vec2(abs(vN.x)>.5?vL.z:vL.x, vL.y); vec2 g = fract(q/vec2(3.2,3.4)); float wnd = step(.18,g.x)*step(g.x,.82)*step(.25,g.y)*step(g.y,.8); float h = fract(sin(dot(floor(q/vec2(3.2,3.4)),vec2(12.9898,78.233)))*43758.5); c = mix(c, c*.55+vec3(.08,.12,.16), wnd*.6); c += mix(win, win2, step(.81,h))*wnd*step(.62,h)*on; } gl_FragColor = vec4(c,1.); \n#include <fog_fragment>\n#include <colorspace_fragment>\n}' });
  const im = new THREE.InstancedMesh(geo, bm, N); const col = new Float32Array(N * 3); const r = rng(42); const m4 = new THREE.Matrix4(); const cc = new THREE.Color();
  for (let i = 0; i < N; i++) {
    const front = i < 70; const z = -660 + (front ? (i / 70) * 1320 : r() * 1320) + (r() - 0.5) * 8;
    const x = front ? 282 - r() * 14 : 60 + r() * 200; const w = 14 + r() * 16, d = 14 + r() * 18;
    const h = front ? 34 + r() * 80 : 12 + r() * 40 * (x / 260);
    m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion(), new THREE.Vector3(w, h, d)); im.setMatrixAt(i, m4);
    cc.setHex(P.fac[(r() * P.fac.length) | 0]); col.set([cc.r, cc.g, cc.b], i * 3);
  }
  geo.setAttribute('col', new THREE.InstancedBufferAttribute(col, 3)); scene.add(im);
  // palmeiras (tronco + copa achatada), píer de madeira
  const pt = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.25, 0.4, 9, 5).translate(0, 4.5, 0), flat(0x5a4632), 110);
  const pc = new THREE.InstancedMesh(new THREE.ConeGeometry(4.2, 2.6, 7).translate(0, 9.6, 0), flat(CFG.neon ? 0x173a2c : 0x2f6b34), 110);
  for (let i = 0; i < 110; i++) { const z = -650 + i * 12 + (r() - 0.5) * 4, x = 318 + (i % 2) * 6 + (r() - 0.5) * 3; m4.compose(new THREE.Vector3(x, 0, z), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), (r() - 0.5) * 0.15), new THREE.Vector3(1, 0.85 + r() * 0.3, 1)); pt.setMatrixAt(i, m4); pc.setMatrixAt(i, m4); }
  scene.add(pt, pc);
  const pier = new THREE.Mesh(new THREE.BoxGeometry(122, 0.6, 4).translate(383, 0.9, -150), flat(0x8a6a48)); scene.add(pier);
  for (let x = 330; x < 444; x += 8) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.5, 3, 0.5).translate(x, -0.5, -150), flat(0x5a4632)); scene.add(p); }
}
function resize() { if (!B.renderer || !camera) return; B.renderer.setSize(innerWidth, innerHeight, false); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
function frame(now) {
  if (B.handed) return; raf = requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now; B.t += dt; ui(dt);
  if (!scene || !B.renderer) return;
  flyCam(B.t, camera); if (B._sea) B._sea.uniforms.t.value = B.t;
  try { B.renderer.render(scene, camera); if (!B.firstFrame) { B.firstFrame = Math.round(performance.now()); window.__firstFrame = B.firstFrame; document.body.classList.add('flyOn'); } } catch (e) { }
}
// a cidade de verdade assume: para o laço daqui, libera a cena mínima e mostra o menu
B.handoff = () => {
  B.ready = true; ui(1); B.handed = true; cancelAnimationFrame(raf); removeEventListener('resize', resize);
  if (scene) scene.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); }); scene = null;
  const pl = $('play'); document.body.classList.add('ldDone'); setTimeout(() => document.body.classList.add('menuIn'), B.skipped ? 0 : 450);
};
function skip() { B.skipped = true; try { localStorage.setItem(CFG.skipKey, '1'); } catch (e) { } document.body.classList.add('menuIn'); }
// ---- início
try {
  const canvas = $('c'); B.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', stencil: false });
  B.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25)); B.renderer.setSize(innerWidth, innerHeight, false); build(); addEventListener('resize', resize);
} catch (e) { console.info('sobrevoo indisponível:', e && e.message); B.renderer = null; }
const sk = $('ldSkip'); if (sk) sk.onclick = skip;
if (B.skipped) document.body.classList.add('menuIn');
raf = requestAnimationFrame(frame);
import('./main.js').catch((e) => { console.error(e); const s = $('ldStage'); if (s) s.textContent = 'erro ao carregar — toque para tentar de novo'; document.body.onclick = () => location.reload(); });
