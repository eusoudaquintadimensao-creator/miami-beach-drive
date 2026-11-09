const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = 'medium', out = 'v'] = process.argv;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: +W < 600, hasTouch: +W < 600, deviceScaleFactor: +W < 600 ? 2 : 1 });
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.click('#play'); await sleep(1500);
  const views = JSON.parse(process.env.VIEWS || '[]');
  for (const v of views) {
    await page.evaluate((v) => { MBD.teleport(v.x, v.z, v.h); MBD.setHour(v.hr); if (v.w) MBD.weather(v.w); if (v.car) { MBD.action(); } if (v.pitch !== undefined) { __G.camPitch = v.pitch; } __G.paused = false; }, v);
    await sleep(v.wait || 2500);
    await page.screenshot({ path: `/workspace/miami-mundo-aberto/test/${out}-${v.n}.png` });
    console.log(v.n, JSON.stringify(await page.evaluate(() => MBD.state)));
  }
  console.log(errs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
