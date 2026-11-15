// t435: capturas antes/depois do gráfico (praia e rua no fim de tarde). Uso: node t435shots.js W H q tag fase(antes|depois)
const puppeteer = require('puppeteer-core');
const [,, W = 1280, H = 720, q = 'high', tag = 'd', fase = 'antes'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const PORT = process.env.PORT || 8765; const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitJs = async (p, expr, ms, label) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await p.evaluate(expr)) return; } catch (e) { } await sleep(500); } throw new Error('timeout ' + label); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load/.test(m.text())) errs.push(m.text()); });
  await p.goto(`http://localhost:${PORT}/?q=${q}&fxlock`, { waitUntil: 'load' }); await waitJs(p, 'window.MBD_READY === true', 240000, 'window.MBD_READY === true');
  await p.evaluate(() => document.getElementById('play').click()); await waitJs(p, 'MBD.flags.started', 60000, 'MBD.flags.started');
  await p.evaluate(() => { document.querySelectorAll('#solaraHi,.solaraHi,#note,#toast').forEach(e => e.style.display = 'none'); });
  const spots = [['praia', 384, -60, -Math.PI / 2, 17.6, 0.32], ['rua', 312, -120, 0, 17.2, 0.12], ['meio-dia', 384, -40, -Math.PI * 0.62, 12.5, 0.3]];
  for (const [n, x, z, h, hr, pitch] of spots) {
    await p.evaluate((x, z, h, hr, pitch) => { MBD.setHour(hr); MBD.teleport(x, z, h); __G.camYaw = h + Math.PI; __G.camPitch = pitch; __G.env && __G.env.updateEnv && __G.env.updateEnv(); }, x, z, h, hr, pitch);
    await sleep(6000); await p.evaluate((h, pitch) => { __G.camYaw = h + Math.PI; __G.camPitch = pitch; }, h, pitch); await sleep(1500);
    await p.screenshot({ path: `/workspace/t435/${fase}-${tag}-${n}.png` });
  }
  const perf = await p.evaluate(() => MBD.perf()); console.log(JSON.stringify({ perf, errs })); await b.close();
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
