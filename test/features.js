// Teste das novidades: instalar (PWA), oficina/tunagem, nitro, NPC tunado, racha, gravação + download + compartilhar, salvar progresso
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const [,, W = 1440, H = 900, q = 'low', out = 'd'] = process.argv;
const mobile = +W < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const DL = `/tmp/mbd-dl-${out}`;
let R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const ctx = browser.defaultBrowserContext(); await ctx.overridePermissions('http://localhost:8765', ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const cdp = await page.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL, eventsEnabled: true }).catch(async () => { await cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }); });
  R = {};
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  // ---- instalar
  R.sw = await page.evaluate(() => Promise.race([navigator.serviceWorker.ready.then(r => !!r.active), new Promise(r => setTimeout(() => r(false), 15000))]));
  const inst = await cdp.send('Page.getInstallabilityErrors').catch(e => ({ err: e.message }));
  R.installErrors = inst.installabilityErrors ? inst.installabilityErrors.map(e => e.errorId) : inst;
  const man = await cdp.send('Page.getAppManifest').catch(e => ({ err: e.message }));
  R.manifestErrors = man.errors ? man.errors.map(e => e.message) : man;
  R.installBtnVisible = await page.evaluate(() => { const b = document.getElementById('installBtn'); return !b.hidden && b.offsetWidth > 0; });
  await page.screenshot({ path: SH + `feat-${out}-instalar-botao.png` });
  await sleep(1500);
  R.nativePrompt = await page.evaluate(async () => (await import('./src/install.js')).installState.prompt);
  // o prompt nativo é modal no headless; testamos a folha de instruções (usada no iPhone e quando não há prompt)
  if (R.nativePrompt) await page.evaluate(async () => (await import('./src/install.js')).showSheet()); else await page.click('#installBtn');
  await sleep(600);
  R.installSheet = await page.evaluate(() => !document.getElementById('installSheet').hidden ? document.getElementById('isBody').innerText.slice(0, 80) : 'prompt nativo');
  await page.screenshot({ path: SH + `feat-${out}-instalar-instrucoes.png` });
  await page.evaluate(() => { document.getElementById('installSheet').hidden = true; });
  // ---- jogar
  await page.click('#play'); await sleep(1200);
  R.started = await page.evaluate(() => [__G.started, __G.paused, document.getElementById('start').hidden, document.activeElement && document.activeElement.id]);
  await page.evaluate(() => { MBD.teleport(296, -172, Math.PI); }); await sleep(400);
  await page.evaluate(() => MBD.action()); await sleep(400);
  R.inCar = await page.evaluate(() => MBD.state.vehicle);
  // oficina
  await page.evaluate(() => { MBD.teleport(296, 60, 0); MBD.setHour(21); }); await sleep(900);
  await page.evaluate(() => MBD.startNear()); await sleep(1200);
  R.garageOpen = await page.evaluate(() => __G.garageOpen === true && !document.getElementById('garage').hidden);
  const sw = await page.$$('#gPanel .sw button[data-k="paint"]'); if (sw[6]) await sw[6].click(); await sleep(500);
  const gl = await page.$$('#gPanel .sw button[data-k="glow"]'); if (gl[2]) await gl[2].click(); await sleep(500);
  await page.evaluate(() => { const i = document.getElementById('gText'); i.focus(); i.select(); }); await page.keyboard.type('Teste 123'); await sleep(1200);
  R.pageNotOpenedByTyping = await page.evaluate(() => !__G.phoneOpen && document.getElementById('bigmap').hidden);
  await sleep(1500);
  await page.screenshot({ path: SH + `feat-${out}-oficina.png` });
  await page.click('#gApply'); await sleep(800);
  R.tune = await page.evaluate(() => { const v = __G.player.vehicle; return v.tune && { text: v.tune.text, glow: v.tune.glow, saved: JSON.parse(localStorage.getItem('mbd-solara-v1')).tune?.text }; });
  // carro tunado à noite e nitro
  await page.evaluate(() => { MBD.teleport(300, 0, 0); }); await sleep(800);
  await page.keyboard.down('KeyW'); await sleep(1500); await page.evaluate(() => MBD.nitro(true));
  let boosted = false; for (let i = 0; i < 12; i++) { await sleep(250); if (await page.evaluate(() => __G.player.vehicle.boosting)) { boosted = true; if (i > 3) break; } }
  R.nitro = { boosted, tank: await page.evaluate(() => __G.player.vehicle.nitro.toFixed(2)), flames: await page.evaluate(() => __G.player.vehicle.flames[0].visible) };
  await page.screenshot({ path: SH + `feat-${out}-nitro.png` });
  await page.evaluate(() => MBD.nitro(false)); await page.keyboard.up('KeyW'); await sleep(1500);
  // carro tunado parado, vista lateral (noite)
  await page.evaluate(() => { const v = __G.player.vehicle; v.vx = v.vz = v.vf = 0; MBD.teleport(300, 40, 0); __G.camYaw = Math.PI / 2 + 0.5; __G.camPitch = 0.18; }); await sleep(2500);
  await page.screenshot({ path: SH + `feat-${out}-carro-tunado-noite.png` });
  // NPC tunado
  R.tunedNpc = await page.evaluate(() => __G.traffic.cars.filter(c => c.tuned).length);
  // racha
  await page.evaluate(() => { MBD.setHour(20.5); __G.missions.cool = 0; MBD.teleport(60, -125, 0); }); await sleep(800);
  await page.evaluate(() => { __G.missions.cool = 0; MBD.startNear(); }); await sleep(500);
  R.racha = await page.evaluate(() => __G.missions.active && __G.missions.active.title);
  R.rivals = await page.evaluate(() => __G.rivals.cars.length);
  await page.evaluate(() => { __G.missions.active.t = -2.5; __G.camYaw = Math.PI - 0.7; __G.camPitch = 0.3; __G.camMode = 1; }); await sleep(1800);
  await page.screenshot({ path: SH + `feat-${out}-racha-largada.png` });
  await page.evaluate(() => { __G.camMode = 0; });
  await page.evaluate(() => { __G.missions.active.t = -0.05; }); await sleep(500);
  await page.keyboard.down('KeyW'); await sleep(3500);
  R.rivalMoved = await page.evaluate(() => __G.rivals.cars.map(c => Math.round(c.s)));
  await page.evaluate(() => { __G.camYaw = __G.player.vehicle.h + 0.6; }); await sleep(600);
  await page.screenshot({ path: SH + `feat-${out}-racha.png` });
  await page.keyboard.up('KeyW');
  const pts = await page.evaluate(() => __G.missions.active.race.pts);
  for (let j = 0; j < pts.length; j++) { const p = pts[j]; await page.evaluate((p) => MBD.teleport(p[0], p[1], 0), p); for (let w = 0; w < 20; w++) { await sleep(250); if (await page.evaluate((j) => !__G.missions.active || __G.missions.active.k > j, j)) break; } }
  R.rachaPlace = await page.evaluate(() => document.getElementById('toast').innerText.match(/\d+º lugar/)?.[0]);
  R.rachaDone = await page.evaluate(() => !__G.missions.active);
  R.money = await page.evaluate(() => MBD.state.money);
  // ---- gravação
  await page.evaluate(() => MBD.teleport(300, -60, Math.PI)); await sleep(500);
  R.mime = await page.evaluate(async () => (await import('./src/recorder.js')).pickType());
  await page.click('#bRec'); await sleep(300);
  R.recording = await page.evaluate(() => __G.rec.recording && !document.getElementById('recBar').hidden);
  await page.keyboard.down('KeyW'); await sleep(2000); await page.keyboard.up('KeyW');
  await sleep(3200);
  await page.screenshot({ path: SH + `feat-${out}-gravando.png` });
  await page.click('#recStop');
  await page.waitForFunction('!document.getElementById("recPanel").hidden', { timeout: 15000 });
  await sleep(1200);
  R.blob = await page.evaluate(() => ({ size: __G.rec.blob.size, type: __G.rec.blob.type, name: __G.rec.name, secs: __G.rec.secs }));
  await page.screenshot({ path: SH + `feat-${out}-painel-gravacao.png` });
  // salvar
  await page.click('#rpSave');
  let file = null; for (let i = 0; i < 40 && !file; i++) { await sleep(250); const f = fs.readdirSync(DL).filter(x => !x.endsWith('.crdownload')); if (f.length) file = path.join(DL, f[0]); }
  R.download = file;
  if (file) {
    R.fileSize = fs.statSync(file).size;
    try { R.ffprobe = JSON.parse(execSync(`ffprobe -v error -show_entries stream=codec_type,codec_name,width,height -show_entries format=format_name,duration -of json "${file}"`).toString()); } catch (e) { R.ffprobe = 'ERRO: ' + e.message; }
    try { execSync(`ffmpeg -v error -i "${file}" -f null - 2>&1`); R.decodeOk = true; } catch (e) { R.decodeOk = 'ERRO ' + e.message.slice(0, 200); }
  }
  R.saveMsg = await page.evaluate(() => document.getElementById('rpMsg').innerText);
  // compartilhar sem navigator.share -> fallback (copia link + salva)
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true }); });
  R.shareFallback = await page.evaluate(() => __G.rec.share());
  R.shareMsg = await page.evaluate(() => document.getElementById('rpMsg').innerText);
  R.clip = await page.evaluate(() => navigator.clipboard.readText().catch(e => 'sem acesso: ' + e.message));
  // compartilhar com arquivos (simulando Android)
  await page.evaluate(() => { window.__shared = null; Object.defineProperty(navigator, 'canShare', { value: (d) => !!(d && d.files), configurable: true }); Object.defineProperty(navigator, 'share', { value: async (d) => { window.__shared = { files: (d.files || []).map(f => [f.name, f.type, f.size]), url: d.url || null, text: d.text }; }, configurable: true }); });
  R.shareFiles = await page.evaluate(() => __G.rec.share());
  R.shared = await page.evaluate(() => window.__shared);
  // mandar link sem share -> copia
  await page.evaluate(() => { Object.defineProperty(navigator, 'share', { value: undefined, configurable: true }); });
  R.sendLink = await page.evaluate(() => __G.rec.sendLink());
  R.linkMsg = await page.evaluate(() => document.getElementById('rpMsg').innerText);
  // descartar
  await page.click('#rpDiscard'); await sleep(300);
  R.discarded = await page.evaluate(() => document.getElementById('recPanel').hidden && !__G.rec.blob && !__G.paused);
  // ---- salvar progresso pelo celular do jogo
  await page.evaluate(() => __G.ui.openPhone()); await sleep(400);
  await page.click('#phSaveG'); await sleep(500);
  R.saveBtn = await page.evaluate(() => document.getElementById('phSaveG').innerText);
  await page.screenshot({ path: SH + `feat-${out}-celular-salvar.png` });
  await page.evaluate(() => __G.ui.closePhone());
  R.downloads = fs.readdirSync(DL);
  R.errors = errs;
  console.log(JSON.stringify(R, null, 1));
  await browser.close();
})().catch(e => { console.error("FAIL", e.message, JSON.stringify(R)); process.exit(1); });
