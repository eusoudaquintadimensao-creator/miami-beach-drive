// t426/t428: abertura com sobrevoo + barra de progresso real, Pular, menu maduro sobre a cidade viva, Controles recolhidos,
// Marisol de calça, heróis com nomes próprios. Uso: node test/t426.js W H q tag
const puppeteer = require('puppeteer-core');
const PORT = process.env.PORT || 8765, KEY = process.env.KEYP || 'mbd', GAME = process.env.GAME || 'solara';
const [,, W = 390, H = 844, q = 'low', out = 'i'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const fail = []; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  const open = async (skipPre) => {
    const ctx = await browser.createBrowserContext(); const page = await ctx.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
    const errs = []; page.on('pageerror', e => errs.push('PAGE: ' + e.message)); page.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
    const c = await page.target().createCDPSession(); await c.send('Network.enable'); await c.send('Network.setCacheDisabled', { cacheDisabled: true });
    await c.send('Network.emulateNetworkConditions', { offline: false, latency: 120, downloadThroughput: 3e6 / 8, uploadThroughput: 1e6 / 8 });
    if (skipPre) await page.evaluateOnNewDocument(() => { try { localStorage.setItem('mbd-fly-skip', '1'); localStorage.setItem('nd-fly-skip', '1'); } catch (e) { } });
    const t0 = Date.now(); await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 300000 });
    return { ctx, page, errs, c, t0 };
  };
  // ---------- 1) primeira visita: sobrevoo + barra real
  let { ctx, page, errs, c, t0 } = await open(false);
  const ev = (f, ...a) => page.evaluate(f, ...a);
  const samples = []; let shot = false; let ffT = 0;
  while (true) {
    const s = await ev(() => ({ p: window.__loadPct ?? -1, ff: window.__firstFrame || 0, ready: window.MBD_READY === true, ld: !!document.getElementById('loader') && getComputedStyle(document.getElementById('loader')).display !== 'none', bar: document.getElementById('ldFill') ? document.getElementById('ldFill').style.transform : '', st: (document.getElementById('ldStage') || {}).textContent, pct: (document.getElementById('ldPct') || {}).textContent }));
    samples.push(s); if (s.ff && !ffT) ffT = Date.now() - t0;
    if (!shot && s.ff && s.p >= 20 && !s.ready) { shot = true; await sleep(300); await page.screenshot({ path: `/workspace/t361-prints/t428-${GAME}-${out}-sobrevoo.png` }); }
    if (s.ready || Date.now() - t0 > 240000) break; await sleep(150);
  }
  const readyT = Date.now() - t0; await c.send('Network.emulateNetworkConditions', { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
  const ps = samples.filter(s => s.p >= 0).map(s => s.p);
  ck('barra de progresso aparece já no início (antes do jogo pronto)', samples.some(s => !s.ready && s.ld && s.p >= 0), { n: samples.length });
  ck('primeiro quadro do sobrevoo bem antes do jogo pronto', ffT > 0 && ffT < readyT - 1500, { ffT, readyT });
  let mono = true; for (let i = 1; i < ps.length; i++) if (ps[i] < ps[i - 1]) mono = false;
  ck('porcentagem só sobe (real, nunca volta)', mono && ps.length > 5, ps.filter((_, i) => i % Math.ceil(ps.length / 15) === 0));
  ck('porcentagem passa por valores intermediários (não salta de 0 a 100)', new Set(ps.map(p => Math.floor(p / 10))).size >= 5, [...new Set(ps.map(p => Math.floor(p / 10)))]);
  ck('etapas reais do carregamento aparecem sob a barra', new Set(samples.map(s => s.st)).size >= 3, [...new Set(samples.map(s => s.st))]);
  await page.waitForFunction(() => document.body.classList.contains('menuIn') && +getComputedStyle(document.getElementById('start')).opacity > 0.9, { timeout: 15000 }).catch(() => { });
  let r = await ev(() => { const st = document.getElementById('start'), pl = document.getElementById('play'), ld = document.getElementById('loader'); const cs = getComputedStyle(st); return { pct: window.__loadPct, menuIn: document.body.classList.contains('menuIn'), op: +cs.opacity, ld: getComputedStyle(ld).display, play: pl.textContent, dis: pl.disabled, bg: getComputedStyle(pl).backgroundImage, stBg: cs.backgroundImage, sun: !!document.querySelector('#start .sun') }; });
  ck('100% ao ficar pronto, menu entra sozinho sobre a cidade (sem tela preta)', r.pct === 100 && r.menuIn && r.op > 0.9 && r.ld === 'none' && !r.dis && /JOGAR/.test(r.play), r);
  ck('tema maduro: botão dourado (sem rosa), sem o sol listrado', /226, 193, 120|184, 137, 58/.test(r.bg) && !/255, 79, 184/.test(r.bg) && !r.sun, { bg: r.bg.slice(0, 90) });
  // câmera do menu continua o sobrevoo
  const c1 = await ev(() => { const p = window.__G.camera ? window.__G.camera.position : null; return p ? [p.x, p.y, p.z] : null; }); await sleep(1000);
  const c2 = await ev(() => { const p = window.__G.camera ? window.__G.camera.position : null; return p ? [p.x, p.y, p.z] : null; });
  ck('sobrevoo continua atrás do menu (câmera em movimento)', c1 && c2 && Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]) > 0.5, { c1, c2 });
  await page.screenshot({ path: `/workspace/t361-prints/t426-${GAME}-${out}-menu.png` });
  // Controles recolhidos
  r = await ev(() => { const h = document.getElementById('ctlHelp'), b = document.getElementById('ctlBtn'); const a = { hid0: h.hidden, vis0: h.offsetParent !== null }; b.click(); a.hid1 = h.hidden; a.vis1 = h.offsetParent !== null; a.exp = b.getAttribute('aria-expanded'); b.click(); a.hid2 = h.hidden; return a; });
  ck('comandos recolhidos no botão Controles (abre e fecha)', r.hid0 && !r.vis0 && !r.hid1 && r.vis1 && r.exp === 'true' && r.hid2, r);
  // botões do menu sem sobreposição e dentro da tela
  r = await ev(() => { const ids = ['play', 'raceBtn', 'verBtn', 'ctlBtn']; const R = ids.map(i => { const e = document.getElementById(i); const b = e.getBoundingClientRect(); return { i, l: b.left, t: b.top, r: b.right, b: b.bottom, vis: e.offsetParent !== null }; }).filter(x => x.vis); const bad = []; for (let a = 0; a < R.length; a++) for (let b = a + 1; b < R.length; b++) { const A = R[a], B = R[b]; if (A.l < B.r - 1 && B.l < A.r - 1 && A.t < B.b - 1 && B.t < A.b - 1) bad.push(A.i + 'x' + B.i); } return { bad, R }; });
  ck('botões do menu sem sobreposição', r.bad.length === 0, r.bad);
  // Marisol de calça; heróis sem nomes parecidos com os de terceiros
  r = await ev(async () => { const W8 = await import('/src/wardrobe.js'); const H = await import('/src/heroes.js'); const m = W8.CIVIL.marisol.eq; return { top: W8.ITEMS[m.top] && W8.ITEMS[m.top].kind, bot: m.bottom, botKind: W8.ITEMS[m.bottom] && W8.ITEMS[m.bottom].kind, labels: Object.values(H.HEROES).map(h => h.label) }; });
  ck('Marisol: roupa padrão com calça elegante (pantalona), sem vestido', r.botKind === 'pantalona' && r.top !== 'vestido', r);
  ck('heróis com nomes próprios (sem Teia Neon/Colosso Verde/Titã Violeta/Lorde)', !r.labels.some(l => /Teia|Colosso Verde|Violeta|Lorde/.test(l)), r.labels);
  r = await ev(() => { const c = [...document.querySelectorAll('#avPick .avCard')].find(b => b.dataset.av === 'marisol'); const img = c && c.querySelector('img'); return { ok: !!img, src: img && img.getAttribute('src') }; });
  ck('card da Marisol presente no seletor', r.ok, r);
  // jogar funciona
  await ev(() => { localStorage.setItem(arguments[0] || 'x', '1'); }).catch(() => { });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); try { window.MBD.home().data.intro = true; } catch (e) { } }, KEY);
  if (mobile) await page.tap('#play'); else await page.click('#play'); await sleep(1500);
  r = await ev(() => ({ st: window.__G.started, hud: !document.getElementById('hud').hidden, start: document.getElementById('start').hidden }));
  ck('JOGAR entra no jogo depois do sobrevoo', r.st && r.hud && r.start, r);
  ck('sem erros na primeira visita', errs.length === 0, errs.slice(0, 5));
  await ctx.close();
  // ---------- 2) Pular: menu aparece na hora, ainda carregando (botão mostra %)
  ({ ctx, page, errs, c, t0 } = await open(false));
  await page.waitForFunction('window.__firstFrame > 0 || window.MBD_READY === true', { timeout: 120000 });
  const pre = await page.evaluate(() => window.MBD_READY === true);
  if (!pre) { if (mobile) await page.tap('#ldSkip'); else await page.click('#ldSkip'); }
  await sleep(900);
  r = await page.evaluate(() => { const st = document.getElementById('start'), pl = document.getElementById('play'); return { ready: window.MBD_READY === true, menuIn: document.body.classList.contains('menuIn'), op: +getComputedStyle(st).opacity, play: pl.textContent, dis: pl.disabled, skipKey: localStorage.getItem('mbd-fly-skip') || localStorage.getItem('nd-fly-skip') }; });
  ck('Pular mostra o menu já (com a % no botão enquanto carrega)', pre || (r.menuIn && r.op > 0.9 && (r.ready || (r.dis && /Carregando · \d+%/.test(r.play)))), r);
  ck('Pular fica lembrado para a próxima visita', pre || r.skipKey === '1', r);
  await page.screenshot({ path: `/workspace/t361-prints/t428-${GAME}-${out}-pular.png` });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 240000 }); await sleep(600);
  r = await page.evaluate(() => ({ dis: document.getElementById('play').disabled, play: document.getElementById('play').textContent, ld: getComputedStyle(document.getElementById('loader')).display }));
  ck('depois de Pular, o jogo termina de carregar e libera JOGAR', !r.dis && /JOGAR/.test(r.play) && r.ld === 'none', r);
  ck('sem erros ao Pular', errs.length === 0, errs.slice(0, 5));
  await ctx.close();
  // ---------- 3) visita seguinte (pulou antes): menu direto sobre o sobrevoo
  ({ ctx, page, errs, c, t0 } = await open(true));
  await sleep(400);
  r = await page.evaluate(() => ({ menuIn: document.body.classList.contains('menuIn') }));
  ck('quem já pulou entra direto no menu (sobrevoo ao fundo)', r.menuIn, r);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 240000 });
  ck('sem erros na visita seguinte', errs.length === 0, errs.slice(0, 5));
  await ctx.close();
  console.log(fail.length ? 'FAIL ' + fail.length + ' ' + fail.join(' | ') : 'PASS t426 ' + GAME + ' ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
