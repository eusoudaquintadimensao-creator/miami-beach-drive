// Gera as miniaturas do seletor de personagem (assets/avatars/<id>.webp, 192x256, fundo transparente) com o visual padrão (t408: roupa Miami; heróis no traje clássico)
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const OUT = process.env.OUT || '/workspace/miami-mundo-aberto/assets/avatars/'; const PORT = process.env.PORT || 8765;
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 800, height: 600 });
  const errs = []; page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:' + PORT + '/?q=low', { waitUntil: 'load' }); await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  const res = await page.evaluate(async () => {
    const THREE = await import('three'); const AV = await import('/src/avatar.js');
    const W = 384, H = 512; const r = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true }); r.setSize(W, H); r.setClearColor(0x000000, 0); r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    // ambiente simples (céu claro em cima, chão escuro, faixas de luz) para o metal refletir
    const ec = document.createElement('canvas'); ec.width = 256; ec.height = 128; const g = ec.getContext('2d'); const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#dfe9ff'); gr.addColorStop(0.48, '#9fb6d8'); gr.addColorStop(0.52, '#3a3f4a'); gr.addColorStop(1, '#16181d'); g.fillStyle = gr; g.fillRect(0, 0, 256, 128);
    g.fillStyle = '#ffffff'; g.fillRect(40, 20, 30, 40); g.fillRect(170, 26, 24, 34); g.fillStyle = '#ff9ad6'; g.fillRect(110, 40, 16, 20);
    const env = new THREE.CanvasTexture(ec); env.mapping = THREE.EquirectangularReflectionMapping; env.colorSpace = THREE.SRGBColorSpace;
    const pm = new THREE.PMREMGenerator(r); const envRT = pm.fromEquirectangular(env);
    const out = {};
    for (const id of AV.AVATAR_IDS) {
      const scene = new THREE.Scene(); scene.environment = envRT.texture;
      // t426: luz de cinema: chave quente lateral, recorte azul-petróleo forte por trás, preenchimento baixo
      scene.add(new THREE.HemisphereLight(0x9fb4c8, 0x1a1c20, 0.55)); const key = new THREE.DirectionalLight(0xffd9a8, 3.4); key.position.set(3.2, 3.6, 3.4); scene.add(key); const rim = new THREE.DirectionalLight(0x4ff7e0, 3.6); rim.position.set(-3.5, 2.6, -3.2); scene.add(rim); const rim2 = new THREE.DirectionalLight(0xffc46b, 1.6); rim2.position.set(3.5, 1.5, -3); scene.add(rim2);
      const W8 = await import('/src/wardrobe.js'); const m = await AV.makeModel(id, null, null, false, W8.isHero(id) ? { mode: 'suit', suit: 'classico' } : { mode: 'civil', eq: {} }); scene.add(m.model); const idle = m.acts.Idle; if (idle) { idle.play(); m.mixer.update(0.6); }
      m.model.updateMatrixWorld(true); const box = new THREE.Box3().setFromObject(m.model); const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
      const cam = new THREE.PerspectiveCamera(24, W / H, 0.1, 100); const hgt = size.y * 1.1; const dist = (hgt / 2) / Math.tan(THREE.MathUtils.degToRad(12));
      cam.position.set(c.x + dist * 0.3, c.y - size.y * 0.06, c.z + dist * 0.95); cam.lookAt(c.x, c.y, c.z);
      r.render(scene, cam);
      const small = document.createElement('canvas'); small.width = 192; small.height = 256; const sg = small.getContext('2d'); sg.imageSmoothingQuality = 'high'; sg.drawImage(r.domElement, 0, 0, 192, 256);
      out[id] = small.toDataURL('image/webp', 0.86);
    }
    return out;
  });
  for (const [id, url] of Object.entries(res)) { const b = Buffer.from(url.split(',')[1], 'base64'); fs.writeFileSync(OUT + id + '.webp', b); console.log(id, b.length); }
  console.log('errs', errs); await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(2); });
