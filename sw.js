// Service worker do Solara Bay: deixa o jogo instalável e jogável offline.
const VERSION = 'solara-v9-2026-11-13-serpentina';
const CORE = [
  './', 'index.html', 'manifest.json', 'icon.svg', 'icon-192.png', 'icon-512.png', 'icon-maskable-192.png', 'icon-maskable-512.png', 'apple-touch-icon.png',
  'src/style.css', 'src/main.js', 'src/util.js', 'src/world.js', 'src/env.js', 'src/vehicles.js', 'src/people.js', 'src/traffic.js', 'src/audio.js',
  'src/missions.js', 'src/ui.js', 'src/recorder.js', 'src/install.js', 'src/garage.js', 'src/rivals.js',
  'src/avatar.js', 'src/device.js', 'src/heli.js', 'src/talk.js', 'src/phrases.js', 'src/heroes.js', 'src/powers.js', 'src/track.js', 'src/race.js', 'src/fx.js', 'src/home.js', 'src/jetpack.js', 'src/signature.js', 'src/life.js', 'src/birds.js', 'src/gifts.js', 'src/street.js', 'src/serpentina.js', 'src/voice.js', 'assets/voz/index.json',
  'assets/avatars/ela.glb', 'assets/avatars/ele.glb', 'assets/avatars/ela.webp', 'assets/avatars/ele.webp',
  'assets/avatars/teia.webp', 'assets/avatars/solar.webp', 'assets/avatars/colosso.webp', 'assets/avatars/sentinela.webp', 'assets/avatars/ferreo.webp', 'assets/avatars/tita.webp',
  'vendor/three/addons/loaders/GLTFLoader.js', 'vendor/three/addons/utils/SkeletonUtils.js',
  'vendor/three/three.module.min.js', 'vendor/three/addons/objects/Sky.js', 'vendor/three/addons/postprocessing/EffectComposer.js',
  'vendor/three/addons/postprocessing/MaskPass.js', 'vendor/three/addons/postprocessing/OutputPass.js', 'vendor/three/addons/postprocessing/Pass.js',
  'vendor/three/addons/postprocessing/RenderPass.js', 'vendor/three/addons/postprocessing/ShaderPass.js', 'vendor/three/addons/postprocessing/UnrealBloomPass.js',
  'vendor/three/addons/shaders/CopyShader.js', 'vendor/three/addons/shaders/LuminosityHighPassShader.js', 'vendor/three/addons/shaders/OutputShader.js',
  'vendor/three/addons/utils/BufferGeometryUtils.js',
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request; if (req.method !== 'GET') return;
  const url = new URL(req.url); if (url.origin !== location.origin) return;
  if (req.mode === 'navigate') { // página: rede primeiro (pega atualizações), cache se estiver offline
    e.respondWith(fetch(req).then((r) => { const cp = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', cp)); return r; }).catch(() => caches.match('index.html', { ignoreSearch: true })));
    return;
  }
  // arquivos: cache na hora, atualiza em segundo plano
  e.respondWith(caches.open(VERSION).then((c) => c.match(req, { ignoreSearch: true }).then((hit) => {
    const net = fetch(req).then((r) => { if (r && r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  })));
});
