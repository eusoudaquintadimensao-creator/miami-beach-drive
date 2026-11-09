// Teste de jogabilidade: entrar/sair do carro, dirigir, completar uma missão, medir FPS, fotos dia/pôr do sol/noite
const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = '', out = 'desk'] = process.argv;
const mobile = +W < 600;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const DIR = '/workspace/miami-mundo-aberto/screenshots/';
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const R = {};
  await page.goto('http://localhost:8765/' + (q ? '?q=' + q : ''), { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.screenshot({ path: DIR + out + '-0-menu.png' });
  if (mobile) await page.tap('#play'); else await page.click('#play');
  await sleep(1200);
  const st = () => page.evaluate(() => MBD.state);
  const press = async (code, sel) => { if (mobile && sel) { await page.tap(sel); } else { await page.keyboard.down(code); await sleep(80); await page.keyboard.up(code); } await sleep(300); };
  // 1) andar
  await page.evaluate(() => MBD.teleport(291.5, -168, Math.PI));
  if (!mobile) { await page.keyboard.down('KeyW'); await sleep(1200); await page.keyboard.up('KeyW'); }
  R.walk = await st();
  await page.evaluate(() => MBD.teleport(291.2, -172, Math.PI));
  await sleep(400);
  R.near = await page.evaluate(() => MBD.nearestVehicle());
  await press('KeyE', '#bAct');
  R.entered = (await st()).inVehicle;
  // 2) dirigir
  if (mobile) { // joystick: arrasta para cima
    const box = await page.$eval('#stickZone', e => { const r = e.getBoundingClientRect(); return [r.left + 110, r.bottom - 120]; });
    await page.touchscreen.touchStart(box[0], box[1]); await page.touchscreen.touchMove(box[0], box[1] - 50); await sleep(3500); await page.touchscreen.touchEnd();
  } else { await page.keyboard.down('KeyW'); await sleep(3500); await page.keyboard.up('KeyW'); }
  R.driving = await st();
  await page.screenshot({ path: DIR + out + '-1-dirigindo.png' });
  await sleep(4000);
  await press('KeyE', '#bAct');
  R.exited = !(await st()).inVehicle;
  await page.screenshot({ path: DIR + out + '-2-saiu.png' });
  // 3) missão de entrega
  await press('KeyE', '#bAct');
  await page.evaluate(() => { MBD.teleport(296, -40, 0); });
  await sleep(800);
  await press('Enter', '#bStart');
  R.mission = (await st()).mission;
  const tgt = await page.evaluate(() => MBD.missionTarget());
  R.target = tgt;
  await page.screenshot({ path: DIR + out + '-3-missao.png' });
  const money0 = (await st()).money;
  if (tgt) { await page.evaluate((t) => MBD.teleport(t[0] + 2, t[1] + 2, 0), tgt); await sleep(1500); }
  const s3 = await st(); R.missionDone = s3.done >= 1 && s3.money > money0; R.money = s3.money;
  await page.screenshot({ path: DIR + out + '-4-concluida.png' });
  // 4) FPS e horários (dentro do carro na Ocean Drive)
  await page.evaluate(() => { MBD.teleport(300 - 3.5, 60, Math.PI); __G.camPitch = 0.12; });
  for (const [n, h] of [['dia', 11.5], ['por-do-sol', 18.45], ['noite', 21.5]]) {
    await page.evaluate((h) => MBD.setHour(h), h); await sleep(3000);
    await page.screenshot({ path: DIR + out + '-5-' + n + '.png' });
  }
  await page.evaluate(() => MBD.weather('chuva')); await sleep(2500); await page.screenshot({ path: DIR + out + '-6-chuva-noite.png' }); await page.evaluate(() => MBD.weather('limpo'));
  await page.evaluate(() => { MBD.setHour(17.9); }); await sleep(6000);
  R.fps = await page.evaluate(() => MBD.fpsHist.slice(-5).map(f => +f.toFixed(1)));
  R.final = await st();
  R.errors = errs;
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
