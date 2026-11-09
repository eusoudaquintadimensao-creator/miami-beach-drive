const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 1000, height: 700 });
  page.on('pageerror', e => console.log('PAGE: ' + e.message));
  await page.goto('http://localhost:8765/', { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.click('#play'); await sleep(1000);
  await page.evaluate(() => { MBD.teleport(291.5, -168, Math.PI); window.__fr = 0; const f = () => { window.__fr++; requestAnimationFrame(f); }; f(); });
  await page.keyboard.down('KeyW');
  for (let i = 0; i < 6; i++) { await sleep(300); console.log(await page.evaluate(() => [__G.player.z.toFixed(2), [...MBD.keys].join(','), __fr, __G.paused, __G.t.toFixed(2)].join(' '))); }
  await page.keyboard.up('KeyW');
  await browser.close();
})();
