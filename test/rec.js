// Teste da gravação: vídeo + áudio do jogo, limite de 2:00 com contagem regressiva e parada automática, salvar (download), compartilhar (arquivo / fallback) e copiar link
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const [,, W = 1280, H = 720, q = 'low', out = 'd', maxS = '12'] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const DL = `/tmp/mbd-rec-${out}`; const R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  await browser.defaultBrowserContext().overridePermissions('http://localhost:8765', ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const cdp = await page.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true }).catch(() => cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }));
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => localStorage.setItem('mbd-casa-v1', JSON.stringify({ intro: true, visits: 1 })));
  await page.click('#play'); await sleep(1200);
  // no veículo assinatura, rádio ligado, nitro: tudo isso tem que sair no áudio do vídeo
  await page.evaluate(() => { MBD.setHour(18); MBD.teleport(66, -300, 0); MBD.callCar(); MBD.sim(100); const v = MBD.sigCar; MBD.teleport(v.x + 1.5, v.z, 0); MBD.action(); });
  await sleep(500); R.inCar = await page.evaluate(() => MBD.state.vehicle);
  R.maxSecDefault = await page.evaluate(() => __G.rec.maxSec);
  R.mime = await page.evaluate(async () => (await import('/src/recorder.js')).pickType());
  await page.evaluate((m) => { __G.rec.maxSec = +m; __G.radioSet && __G.radioSet(1); }, maxS);
  if (mobile) await page.tap('#bRec'); else await page.click('#bRec');
  await sleep(300); R.recording = await page.evaluate(() => __G.rec.recording && !document.getElementById('recBar').hidden);
  await page.evaluate(() => { MBD.input.stick = [0, 1]; MBD.nitro(true); }); await sleep(2500); await page.evaluate(() => MBD.nitro(false));
  R.timer1 = await page.evaluate(() => document.getElementById('recTime').textContent);
  await page.screenshot({ path: `${SH}rec-${out}-gravando.png` });
  // contagem regressiva nos últimos 10 s
  await page.waitForFunction(() => document.getElementById('recBar').classList.contains('ending'), { timeout: 60000 });
  R.countdown = await page.evaluate(() => ({ text: document.getElementById('recTime').textContent, ending: document.getElementById('recBar').classList.contains('ending') }));
  await page.screenshot({ path: `${SH}rec-${out}-acabando.png` });
  R.recLayout = await page.evaluate(() => { const els = ['#recBar', '#mapw', '#topR', '#quick button', '#icons button', '#btns button', '#nitroW', '#mis'].flatMap(q => [...document.querySelectorAll(q)]).filter(e => e.offsetWidth > 0 && !e.closest('[hidden]') && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none');
    const rs = els.map(e => [e.id || e.tagName, e.getBoundingClientRect()]); const o = []; const rb = rs.find(r => r[0] === 'recBar');
    for (const r of rs) { if (r === rb) continue; const a = rb[1], b = r[1]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) o.push(r[0]); }
    return { overlap: o, recBar: [rb[1].left, rb[1].top, rb[1].width, rb[1].height].map(Math.round), offscreen: rb[1].left < 0 || rb[1].right > innerWidth }; });
  // parada automática (sem tocar em Parar)
  const t0 = Date.now(); await page.waitForFunction('!document.getElementById("recPanel").hidden', { timeout: 60000 }); R.autoStopAfterMs = Date.now() - t0;
  await page.evaluate(() => { MBD.input.stick = null; }); await sleep(800);
  R.blob = await page.evaluate(() => ({ size: __G.rec.blob.size, type: __G.rec.blob.type, name: __G.rec.name, secs: +__G.rec.secs.toFixed(2), info: document.getElementById('rpInfo').textContent }));
  await page.screenshot({ path: `${SH}rec-${out}-painel.png` });
  // salvar → download
  if (mobile) await page.tap('#rpSave'); else await page.click('#rpSave');
  let file = null; for (let i = 0; i < 60 && !file; i++) { await sleep(250); const f = fs.readdirSync(DL).filter(x => !x.endsWith('.crdownload')); if (f.length) file = path.join(DL, f[0]); }
  R.download = file;
  if (file) {
    R.fileSize = fs.statSync(file).size;
    try { const j = JSON.parse(execSync(`ffprobe -v error -show_entries stream=codec_type,codec_name,width,height,bit_rate,sample_rate,channels -show_entries format=format_name,duration,bit_rate -of json "${file}"`).toString()); R.ffprobe = { format: j.format.format_name, duration: +(+j.format.duration).toFixed(2), kbps: Math.round(j.format.bit_rate / 1000), streams: j.streams.map(s => [s.codec_type, s.codec_name, s.width ? s.width + 'x' + s.height : s.sample_rate + 'Hz/' + s.channels + 'ch']) }; } catch (e) { R.ffprobe = 'ERRO: ' + e.message; }
    try { const o = execSync(`ffmpeg -hide_banner -i "${file}" -vn -af volumedetect -f null - 2>&1`).toString(); R.audioLevel = { mean: (o.match(/mean_volume: (\S+ dB)/) || [])[1], max: (o.match(/max_volume: (\S+ dB)/) || [])[1] }; } catch (e) { R.audioLevel = 'ERRO ' + e.message.slice(0, 160); }
    try { execSync(`ffmpeg -v error -i "${file}" -f null - 2>&1`); R.decodeOk = true; } catch (e) { R.decodeOk = 'ERRO ' + e.message.slice(0, 160); }
    try { execSync(`ffmpeg -v error -y -ss 2 -i "${file}" -frames:v 1 "${SH}rec-${out}-quadro.png"`); R.frame = `${SH}rec-${out}-quadro.png`; } catch (e) { }
  }
  // compartilhar com arquivo (Web Share Level 2 simulado, como no Android/iPhone)
  await page.evaluate(() => { window.__shared = null; Object.defineProperty(navigator, 'canShare', { value: (d) => !!(d && d.files), configurable: true }); Object.defineProperty(navigator, 'share', { value: async (d) => { window.__shared = { files: (d.files || []).map(f => [f.name, f.type, f.size]), text: d.text }; }, configurable: true }); });
  R.shareFile = await page.evaluate(() => __G.rec.share()); R.shared = await page.evaluate(() => window.__shared);
  // sem Web Share → fallback (baixa + copia link)
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); });
  // (o Chrome headless bloqueia um 2º download automático; conferimos que o fallback dispara o download do blob)
  await page.evaluate(() => { window.__dl = []; const c = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push([this.download, this.href.slice(0, 5)]); return c.call(this); }; });
  const before = fs.readdirSync(DL).length; await page.evaluate(() => { const r = __G.rec; const o = r.share.bind(r); r.share = async () => (window.__sf = await o()); }); if (mobile) await page.tap('#rpShare'); else await page.click('#rpShare'); await sleep(600); R.shareFallback = await page.evaluate(() => window.__sf); R.shareMsg = await page.evaluate(() => document.getElementById('rpMsg').innerText);
  for (let i = 0; i < 20; i++) { await sleep(250); if (fs.readdirSync(DL).filter(x => !x.endsWith('.crdownload')).length > before) break; } R.fallbackDownloaded = fs.readdirSync(DL).filter(x => !x.endsWith('.crdownload')).length > before; R.files = fs.readdirSync(DL); R.fallbackSaveCalls = await page.evaluate(() => window.__dl);
  R.sendLink = await page.evaluate(() => __G.rec.sendLink()); R.linkMsg = await page.evaluate(() => document.getElementById('rpMsg').innerText);
  R.clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'sem acesso: ' + e.message));
  await page.screenshot({ path: `${SH}rec-${out}-compartilhar.png` });
  if (mobile) await page.tap('#rpDiscard'); else await page.click('#rpDiscard'); await sleep(300);
  R.discarded = await page.evaluate(() => document.getElementById('recPanel').hidden && !__G.rec.blob);
  R.errs = errs; console.log(JSON.stringify(R, null, 1)); await browser.close();
})().catch(e => { console.log('FAIL', e); process.exit(1); });
