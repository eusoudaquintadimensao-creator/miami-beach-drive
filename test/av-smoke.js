const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = 'low'] = process.argv; const mobile = +W < 600;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGE: ' + e.message + e.stack));
  await p.goto('http://localhost:8765/?q=' + q); await p.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await p.screenshot({ path: '/tmp/s-menu.png' });
  await p.click('#play'); await sleep(12000);
  console.log(JSON.stringify(await p.evaluate(() => MBD.state)));
  console.log(JSON.stringify(await p.evaluate(() => ({ cam: __G.camera.position.toArray(), yaw: __G.camYaw, pit: __G.camPitch, hero: __G.hero.g.position.toArray(), pv: [__G.player.vx, __G.player.vz, __G.player.h], fov: __G.camera.fov, lost: __G.renderer.getContext().isContextLost(), paused: __G.paused, t: __G.t }))));
  await p.screenshot({ path: '/tmp/s-play.png' });
  console.log(errs.join('\n')); await b.close();
})();
