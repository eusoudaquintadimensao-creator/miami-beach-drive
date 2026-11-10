// Teste: veículo assinatura por personagem + "Chamar veículo" (rua, sem água/prédio) + nitro de 5 camadas + traje nano-metal + layout
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const [,, W = 1280, H = 720, q = 'low', out = 'd', only = ''] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const R = { checks: [] };
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => localStorage.setItem('mbd-casa-v1', JSON.stringify({ intro: true, visits: 1 })));
  await page.click('#play'); await sleep(1500); await page.evaluate(() => MBD.setHour(17.4));
  const layout = (tag) => page.evaluate((tag) => { const sel = ['#quick button', '#icons button', '#btns button', '#mapw', '#topR', '#nitroW', '#raceHud', '#mis', '#prompt', '#recBar'];
    const els = sel.flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.offsetWidth > 0 && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
    const rs = els.map(e => [e.id || e.tagName, e.getBoundingClientRect()]); const o = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 1 && iy > 1) o.push(rs[i][0] + '×' + rs[j][0]); }
    const off = rs.filter(([, r]) => r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).map(([id]) => id);
    const box = (id) => { const e = document.getElementById(id); if (!e || !e.offsetWidth) return null; const r = e.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)]; };
    return { tag, n: rs.length, overlap: o, offscreen: off, qCar: box('qCar'), bNitro: box('bNitro'), nitroW: box('nitroW') }; }, tag);
  R.layoutFoot = await layout('a pé');
  const ids = only ? only.split(',') : ['ela', 'ele', 'teia', 'solar', 'colosso', 'sentinela', 'ferreo', 'tita'];
  // pontos de teste: centro (prédios), orla (água perto), centro-oeste, glades
  const spots = [[120, 80], [372, 40], [-480, -150], [180, -300], [-700, 30], [60, 400], [300, 200], [-420, 300]];
  for (let k = 0; k < ids.length; k++) {
    const id = ids[k];
    await page.evaluate((id) => { if (MBD.state.inVehicle) MBD.keys && 0; MBD.avatar(id); }, id); await sleep(mobile ? 2500 : 2000);
    const [sx, sz] = spots[k % spots.length];
    await page.evaluate((x, z) => MBD.teleport(x, z, 0), sx, sz); await page.evaluate(() => MBD.sim(2));
    const ok = await page.evaluate(() => MBD.callCar()); await page.evaluate(() => MBD.sim(100, 1 / 30));
    const c = await page.evaluate(async () => { const W = await import('/src/world.js'); const v = MBD.sigCar; const p = MBD.state; const T = new (await import('three')).Vector3(v.x, 0, v.z);
      return { type: v.type, name: v.sigName, text: v.tune && v.tune.text, x: +v.x.toFixed(1), z: +v.z.toFixed(1), d: +Math.hypot(v.x - p.x, v.z - p.z).toFixed(1), road: W.isRoad(v.x, v.z), drivable: W.drivable(v.x, v.z), water: W.isWaterDeep(v.x, v.z), wall: !!W.collide(T, 1.6, false, 1), arrived: !MBD.carCall, flames: !!(v.flames && v.flames.length) }; });
    c.id = id; c.called = ok; R.checks.push(c);
    // foto: personagem com traje nano-metal ao lado do seu veículo
    await page.evaluate(() => { const v = MBD.sigCar; const s = Math.sin(v.h), co = Math.cos(v.h); const px = v.x + co * 5.2 - s * 2.5, pz = v.z - s * 5.2 - co * 2.5; const h = Math.atan2(v.x - px, v.z - pz) + 0.35; MBD.teleport(px, pz, h); });
    await sleep(mobile ? 2200 : 1500); await page.screenshot({ path: `${SH}sig-${out}-${id}.png` });
  }
  // entra no veículo (o último), nitro até o estágio 5 numa avenida reta
  await page.evaluate(() => { const v = MBD.sigCar; MBD.teleport(v.x + 1.5, v.z, 0); }); await page.evaluate(() => MBD.action()); await sleep(600);
  R.inCar = await page.evaluate(() => MBD.state.vehicle);
  R.layoutCar = await layout('no carro');
  await page.evaluate(() => { MBD.teleport(62, -420, 0); const v = MBD.sigCar; v.nitro = 1; MBD.input.stick = [0, 1]; MBD.nitro(true); MBD.sim(80, 1 / 30); });
  for (let i = 0; i < 4; i++) { await page.evaluate(() => { MBD.input.stick = [0, 1]; MBD.nitro(true); }); await sleep(250); }
  R.nitro = await page.evaluate(() => { const v = MBD.sigCar; return { stage: v.nStage, boosting: v.boosting, nitro: +v.nitro.toFixed(2), speed: +v.speed.toFixed(1), hot: document.querySelectorAll('#nitroW .nSegs i.hot').length, label: document.getElementById('nitroL').textContent }; });
  await page.evaluate(() => { MBD.sigCar.nitro = 0.72; }); await sleep(300);
  await page.screenshot({ path: `${SH}sig-${out}-nitro5.png` });
  R.layoutBoost = await layout('nitro');
  await page.evaluate(() => { MBD.nitro(false); MBD.input.stick = null; });
  // chamar com B no teclado (desktop) ou toque no 🚘 (celular), estando a pé
  await page.evaluate(() => { const v = MBD.sigCar; v.vx = v.vz = v.vf = 0; MBD.action(); }); await sleep(400); R.onFoot = await page.evaluate(() => !MBD.state.inVehicle);
  await page.evaluate(() => { const p = MBD.state; MBD.teleport(p.x + 40, p.z, 0); });
  if (mobile) await page.tap('#qCar'); else await page.keyboard.press('KeyB');
  await sleep(300); R.callByInput = await page.evaluate(() => !!MBD.carCall); await page.screenshot({ path: `${SH}sig-${out}-chamar.png` });
  R.errs = errs; console.log(JSON.stringify(R, null, 1)); await browser.close();
})().catch(e => { console.log('FAIL', e); process.exit(1); });
