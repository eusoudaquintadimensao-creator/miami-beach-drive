const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = '', out = 'smoke'] = process.argv;
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: +W < 600, hasTouch: +W < 600, deviceScaleFactor: +W < 600 ? 2 : 1 });
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const t0 = Date.now();
  await page.goto('http://localhost:8765/' + (q ? '?q=' + q : ''), { waitUntil: 'load', timeout: 60000 });
  try { await page.waitForFunction('window.MBD_READY === true', { timeout: 90000 }); } catch (e) { console.log('NOT READY', await page.evaluate(() => document.getElementById('play').textContent)); console.log(errs.join('\n')); await page.screenshot({ path: '/workspace/miami-mundo-aberto/test/fail.png' }); await browser.close(); process.exit(1); }
  console.log('ready in', Date.now() - t0, 'ms');
  await page.screenshot({ path: `/workspace/miami-mundo-aberto/test/${out}-menu.png` });
  await page.click('#play');
  await new Promise(r => setTimeout(r, 5000));
  console.log(JSON.stringify(await page.evaluate(() => MBD.state)));
  await page.screenshot({ path: `/workspace/miami-mundo-aberto/test/${out}-play.png` });
  console.log(errs.join('\n'));
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
