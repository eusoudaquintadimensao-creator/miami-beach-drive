// t432: orçamento de desempenho para celular fraco — Slow 4G (1,6 Mbps / 150 ms) + CPU 4x, sem cache, 390x844.
// Mede: download inicial (KB até o jogo pronto), tempo do 1º quadro 3D, tempo até pronto, FPS jogando por 12 s; checa modo leve automático.
// Uso: PORT=8765 node test/t432.js [tag]   (BASE=url para medir o site publicado)
const puppeteer = require('puppeteer-core');
const PORT = process.env.PORT || 8765, BASE = process.env.BASE || `http://localhost:${PORT}/`;
const [,, tag = 'x'] = process.argv;
const BUDGET = { kb: 2600, firstFrameMs: 7000, readyMs: 22000, fpsMin: 2, heapMB: 400, textures: 400 }; // fpsMin baixo: aqui a GPU é emulada (swiftshader) e a CPU está 4x mais lenta
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  await page.setUserAgent('Mozilla/5.0 (Linux; Android 11; SM-A125M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36');
  await page.evaluateOnNewDocument(() => { Object.defineProperty(navigator, 'deviceMemory', { get: () => 2 }); Object.defineProperty(navigator, 'hardwareConcurrency', { get: () => 4 }); });
  const c = await page.target().createCDPSession(); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
  await c.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 1638400 / 8, uploadThroughput: 750000 / 8 });
  await c.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  let ready = false, kbB = 0, kbAfter = 0; const reqs = new Map();
  c.on('Network.responseReceived', e => reqs.set(e.requestId, e.response.url));
  c.on('Network.loadingFinished', e => { if (!ready) kbB += e.encodedDataLength; else kbAfter += e.encodedDataLength; });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  const t0 = Date.now(); await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 300000 });
  let firstFrame = null; const poll = setInterval(async () => { try { if (!firstFrame && await page.evaluate(() => !!window.__firstFrame)) firstFrame = Date.now() - t0; } catch (e) { } }, 150);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 600000, polling: 200 }); const readyMs = Date.now() - t0; ready = true; clearInterval(poll);
  const kb = Math.round(kbB / 1024);
  const perf0 = await page.evaluate(() => MBD.perf());
  await page.evaluate(() => { const s = document.getElementById('introSkip') || null; }); await page.tap('#play').catch(() => page.click('#play'));
  await page.waitForFunction('MBD.state.avatar3d === true', { timeout: 120000, polling: 300 }).catch(() => { });
  await sleep(4000); const fs = []; for (let i = 0; i < 12; i++) { await sleep(1000); fs.push((await page.evaluate(() => MBD.perf().fps))); }
  const fpsAvg = +(fs.reduce((a, b) => a + b, 0) / fs.length).toFixed(1);
  const perf1 = await page.evaluate(() => MBD.perf());
  const mem = await page.evaluate(() => ({ heapMB: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null, geometries: __G.renderer.info.memory.geometries, textures: __G.renderer.info.memory.textures }));
  const R = { tag, kb, firstFrameMs: firstFrame, readyMs, fpsAvg, fpsMin: Math.min(...fs), kbAfterPlay: Math.round(kbAfter / 1024), mem, perf0, perf1, errs };
  const ok = kb <= BUDGET.kb && firstFrame && firstFrame <= BUDGET.firstFrameMs && readyMs <= BUDGET.readyMs && fpsAvg >= BUDGET.fpsMin && (!mem.heapMB || mem.heapMB <= BUDGET.heapMB) && mem.textures <= BUDGET.textures && perf0.q === 'low' && perf0.pr <= 1 && !errs.length;
  console.log(JSON.stringify(R)); console.log(`BUDGET ${JSON.stringify(BUDGET)}`); console.log((ok ? 'PASS' : 'FAIL') + ' t432 ' + tag);
  await browser.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FAIL t432', e.message); process.exit(1); });
