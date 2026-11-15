// t426: mede carregamento inicial em perfil de celular limitado (Slow 4G 1,6 Mbps / 150 ms + CPU 4x), sem cache.
// Uso: PORT=8765 node test/t426load.js [tag] [runs]
const puppeteer = require('puppeteer-core');
const PORT = process.env.PORT || 8765, BASE = process.env.BASE || `http://localhost:${PORT}/`;
const [,, tag = 'x', runs = 2] = process.argv;
(async () => {
  const out = [];
  for (let r = 0; r < +runs; r++) {
    const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
    const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
    const c = await page.target().createCDPSession(); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1638400 / 8, uploadThroughput: 750000 / 8 });
    await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const reqs = new Map(); let ready = false; const before = [];
    c.on('Network.loadingFinished', e => { const q = reqs.get(e.requestId); if (q) { q.b = e.encodedDataLength; if (!ready) before.push(q); } });
    c.on('Network.responseReceived', e => { reqs.set(e.requestId, { u: e.response.url.replace(BASE, ''), t: e.type }); });
    const errs = []; page.on('pageerror', e => errs.push(e.message));
    const t0 = Date.now();
    await page.goto(BASE + '?q=low', { waitUntil: 'domcontentloaded', timeout: 300000 });
    const dcl = Date.now() - t0;
    // primeira barra/menu visível e primeiro quadro 3D (sobrevoo)
    let firstFrame = null, prog = [];
    const poll = setInterval(async () => { try { const s = await page.evaluate(() => ({ f: window.__firstFrame || 0, p: window.__loadPct ?? null })); if (s.f && !firstFrame) firstFrame = Date.now() - t0; if (s.p !== null) prog.push([Date.now() - t0, s.p]); } catch (e) { } }, 250);
    await page.waitForFunction('window.MBD_READY === true', { timeout: 600000, polling: 200 });
    const readyMs = Date.now() - t0; ready = true; clearInterval(poll);
    const perf = await page.evaluate(() => { const p = performance.getEntriesByType('paint').map(e => [e.name, Math.round(e.startTime)]); return { paint: p, loadMs: window.__G && window.__G.loadMs }; });
    const kb = Math.round(before.reduce((a, q) => a + (q.b || 0), 0) / 1024);
    const top = before.sort((a, b) => (b.b || 0) - (a.b || 0)).slice(0, 8).map(q => `${q.u.slice(0, 60)} ${Math.round((q.b || 0) / 1024)}KB`);
    const res = { run: r, dcl, firstFrame, readyMs, loadMs: perf.loadMs, paint: perf.paint, reqs: before.length, kb, top, prog: prog.filter((_, i) => i % 8 === 0).slice(0, 12), errs };
    console.log(JSON.stringify(res)); out.push(res);
    await browser.close();
  }
  const avg = k => Math.round(out.reduce((a, o) => a + (o[k] || 0), 0) / out.length);
  console.log(`RESULT ${tag} readyMs=${avg('readyMs')} dcl=${avg('dcl')} firstFrame=${avg('firstFrame')} kb=${avg('kb')} reqs=${avg('reqs')}`);
})().catch(e => { console.error(e); process.exit(1); });
