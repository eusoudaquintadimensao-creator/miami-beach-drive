const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 900, height: 560 });
  const errs = []; page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  await page.goto('http://localhost:8765/?q=' + (process.argv[2] || 'medium'), { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => document.getElementById('raceBtn').click()); await sleep(1500);
  await page.evaluate(() => { document.getElementById('raceSel').style.display = 'none'; if (window.MBD.setHour) MBD.setHour(13); });
  const cars = ['rc_gt', 'rc_muscle', 'rc_jdm', 'rc_hyper'];
  for (const [i, c] of cars.entries()) {
    await page.evaluate((c) => { __G.race.data.car = c; __G.race.spawnPlayer(c, 0, 2); }, c);
    for (const [k, a] of [[0, 0.9], [1, 2.6]]) { await page.evaluate((a) => { __G.race.ang = a; }, a); await sleep(900); await page.screenshot({ path: `/tmp/car-${c}-${k}.png` }); }
  }
  console.log(errs); await browser.close();
})();
