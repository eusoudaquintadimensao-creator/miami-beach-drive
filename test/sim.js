const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 900, height: 600 });
  const errs = []; page.on('pageerror', e => errs.push('PAGE: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await page.goto('http://localhost:8765/?q=low', { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.click('#play'); await sleep(500);
  await page.evaluate(() => { MBD.teleport(186, -10, 0); __G.camMode = 1; __G.camPitch = 1.0; });
  // simula em passos fixos sem render para ver a lógica
  const r = await page.evaluate(() => {
    const G = __G; const out = { samples: [], minPedCar: 99, stuck: 0 };
    const tr = G.traffic.cars; let last = tr.map(c => [c.x, c.z]); let still = tr.map(() => 0);
    for (let i = 0; i < 1800; i++) { // 60 s a 30 Hz
      const dt = 1 / 30; G.t += dt;
      G.traffic.update(dt, G.t, G.player, G.crowd, G.Q);
      const movers = tr.filter(c => c.active);
      G.crowd.update(dt, G.t, G.player, movers, G.camera, () => { });
      for (const p of G.crowd.peds) for (const c of movers) for (const k of c.circles()) { const d = Math.hypot(p.x - k[0], p.z - k[1]) - c.r; if (d < out.minPedCar && p.x < 1e4) out.minPedCar = d; }
      if (i % 300 === 0) out.samples.push({ t: +G.t.toFixed(1), active: movers.length, avgSpd: +(movers.reduce((a, c) => a + c.vf, 0) / Math.max(1, movers.length)).toFixed(2), stopped: movers.filter(c => c.vf < 0.3).length });
      tr.forEach((c, j) => { if (!c.active) return; const m = Math.hypot(c.x - last[j][0], c.z - last[j][1]); still[j] = m < 0.01 ? still[j] + dt : 0; last[j] = [c.x, c.z]; });
    }
    out.stuck = still.filter(s => s > 25).length; out.peds = G.crowd.peds.filter(p => p.x < 1e4).length;
    out.modes = G.crowd.peds.reduce((a, p) => (a[p.mode] = (a[p.mode] || 0) + 1, a), {});
    return out;
  });
  await sleep(2500);
  await page.screenshot({ path: '/workspace/miami-mundo-aberto/test/sim.png' });
  console.log(JSON.stringify(r, null, 1), errs);
  await browser.close();
})();
