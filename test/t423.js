// t423: pausa = silêncio total; recado da Solara some com toque ou deslize em qualquer direção; sem tela cheia automática (aviso do navegador com o endereço). Uso: node test/t423.js W H q tag
const puppeteer = require('puppeteer-core');
const PORT = process.env.PORT || 8765, KEY = process.env.KEYP || 'mbd', GAME = process.env.GAME || 'solara';
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const errs = []; page.on('pageerror', e => errs.push('PAGE: ' + e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  const fail = []; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  await page.evaluateOnNewDocument(() => { window.__fs = 0; const o = Element.prototype.requestFullscreen; Element.prototype.requestFullscreen = function () { window.__fs++; return o ? o.call(this).catch(() => { }) : Promise.resolve(); }; });
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  if (mobile) await page.tap('#play'); else await page.click('#play'); await sleep(1500);
  const ev = (f, ...a) => page.evaluate(f, ...a);
  // recado da Solara
  let r = await ev(() => { const el = document.getElementById('solaraHi'); return { on: !!el, txt: el ? el.textContent : '', fs: window.__fs }; });
  ck('recado da Solara aparece ao jogar, com nome e texto novos', r.on && /Solara/.test(r.txt) && /Oi, eu sou a Solara! Se precisar sair do jogo, é só arrastar para cima\./.test(r.txt), r);
  ck('sem tela cheia automática (o aviso do navegador mostrava o endereço do site)', r.fs === 0, r);
  await page.screenshot({ path: `/workspace/t361-prints/t423-${GAME}-${out}-solara.png` });
  const swipe = async (dx, dy) => { const b = await page.$eval('#solaraHi', e => { const q = e.getBoundingClientRect(); return [q.left + q.width * 0.3, q.top + q.height / 2]; }); await page.mouse.move(b[0], b[1]); await page.mouse.down(); for (let k = 1; k <= 6; k++) await page.mouse.move(b[0] + dx * k / 6, b[1] + dy * k / 6); await page.mouse.up(); await sleep(450); return ev(() => !document.getElementById('solaraHi')); };
  const res = {};
  for (const [n, dx, dy] of [['cima', 0, -80], ['baixo', 0, 80], ['esquerda', -90, 0], ['direita', 90, 0], ['toque', 0, 0]]) { await ev(() => { const o = document.getElementById('solaraHi'); if (o) o.remove(); window.__G.solaraHiShow(); }); await sleep(300); res[n] = await swipe(dx, dy); }
  ck('recado some ao deslizar para cima/baixo/esquerda/direita e com toque', Object.values(res).every(Boolean), res);
  // pausa em silêncio
  r = await ev(async () => { const G = window.__G; G.audio.init(); const st0 = G.audio.ctx && G.audio.ctx.state; MBD.teleport(300, -150, 0); MBD.sim(5, 1 / 30); MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(10, 1 / 30);
    G.openPause(); await new Promise(r => setTimeout(r, 400)); const st1 = G.audio.ctx.state; G.audio.init(); document.body.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); await new Promise(r => setTimeout(r, 300)); const st2 = G.audio.ctx.state; const t1 = G.audio.ctx.currentTime; await new Promise(r => setTimeout(r, 500)); const adv = G.audio.ctx.currentTime - t1;
    G.closePause(); await new Promise(r => setTimeout(r, 400)); const st3 = G.audio.ctx.state; return { st0, st1, st2, adv, st3, paused: G.paused }; });
  ck('pausado: AudioContext suspenso (nada toca: motor, rádio, vozes, ambiente), mesmo com toques', r.st1 === 'suspended' && r.st2 === 'suspended' && r.adv < 0.05, r);
  ck('Continuar volta o som', r.st3 === 'running' && !r.paused, r);
  r = await ev(async () => { const G = window.__G; const b = document.getElementById('bPause'); b.click(); await new Promise(r => setTimeout(r, 300)); const a = G.audio.ctx.state; b.click(); await new Promise(r => setTimeout(r, 300)); return { a, b: G.audio.ctx.state }; });
  ck('botão ⏸ também silencia e volta', r.a === 'suspended' && r.b === 'running', r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
