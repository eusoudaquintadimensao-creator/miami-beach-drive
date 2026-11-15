// t436: Solara na abertura (foto + texto + áudio PT/EN/ES sob demanda) e recado com foto que some sozinho; t435: efeitos por nível
const puppeteer = require('puppeteer-core');
const [,, W = 1280, H = 720, q = 'high', tag = 'd', lang = 'es'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const PORT = process.env.PORT || 8765; const BASE = process.env.BASE || `http://localhost:${PORT}/`; const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitJs = async (p, expr, ms, label) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { if (await p.evaluate(expr)) return; } catch (e) { } await sleep(500); } throw new Error('timeout ' + label); };
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  await p.evaluateOnNewDocument((l) => { Object.defineProperty(navigator, 'language', { get: () => l }); }, lang);
  const errs = [], mp3 = [], miss = []; p.on('response', r => { if (r.status() >= 400) miss.push(r.url()); }); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  p.on('request', r => { if (/intro-..\.mp3/.test(r.url())) mp3.push({ u: r.url().split('/').pop(), t: Date.now() }); });
  const R = { ok: true, fails: [] }; const chk = (c, m) => { if (!c) { R.ok = false; R.fails.push(m); } };
  await p.goto(BASE + `?q=${q}`, { waitUntil: 'domcontentloaded' }); await sleep(2500);
  const card = await p.evaluate(() => { const e = document.getElementById('ldSol'); if (!e) return null; const r = e.getBoundingClientRect(); return { vis: getComputedStyle(e).opacity > 0.5 && r.width > 100, msg: document.getElementById('lsMsg').textContent, on: (document.querySelector('#ldSol .lsLang .on') || {}).textContent, r: [r.x, r.y, r.width, r.height].map(Math.round) }; });
  R.card = card; chk(card && card.vis, 'cartão da Solara não visível no carregamento'); chk(card && card.on === lang.toUpperCase(), 'idioma do aparelho não escolhido');
  chk(mp3.length === 0, 'áudio baixado antes do toque (deveria ser sob demanda)');
  await p.screenshot({ path: `/workspace/t435/t436-${tag}-abertura.png` });
  await p.evaluate(() => document.getElementById('ldSol').click()); await sleep(1500);
  const res = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name.split('/').pop()).filter(n => /intro-..\.mp3/.test(n))); for (const u of res) if (!mp3.some(x => x.u === u)) mp3.push({ u });
  R.mp3 = mp3.map(x => x.u); chk(mp3.some(x => x.u === `intro-${lang}.mp3`), 'toque não tocou o áudio do idioma');
  await p.evaluate(() => document.querySelector('#ldSol .lsLang button[data-l="pt"]').click()); await sleep(800);
  { const r2 = await p.evaluate(() => performance.getEntriesByType('resource').map(e => e.name.split('/').pop())); for (const u of r2) if (/intro-..\.mp3/.test(u) && !mp3.some(x => x.u === u)) mp3.push({ u }); }
  chk(mp3.some(x => x.u === 'intro-pt.mp3'), 'troca para PT não tocou o áudio PT');
  R.intro = await p.evaluate(() => window.__solaraIntro);
  await waitJs(p, 'window.MBD_READY === true', 240000, 'window.MBD_READY === true');
  await p.evaluate(() => document.getElementById('play').click()); await waitJs(p, 'MBD.flags.started', 60000, 'MBD.flags.started');
  const tc = Date.now(); await sleep(1500); R.perf0 = await p.evaluate(() => MBD.perf());
  const hi = await p.evaluate(() => { const e = document.getElementById('solaraHi'); if (!e) return null; window.__n1 = e; e.getAnimations().forEach(a => a.finish()); /* swiftshader trava o compositor: conclui a entrada para medir o lugar final */ const r = e.getBoundingClientRect(); return { img: !!e.querySelector('.shAv img'), name: (e.querySelector('.shHd b') || {}).textContent, txt: e.textContent.slice(0, 160), top: Math.round(r.top), bottom: Math.round(r.bottom), h: innerHeight }; });
  R.hi = hi; chk(hi && /arrastar para cima/.test(hi.txt) && hi.name === 'Solara', 'recado da Solara (notificação) não apareceu');
  chk(hi && hi.top >= -2 && hi.bottom < hi.h * 0.3, 'notificação não está no alto da tela');
  await p.screenshot({ path: `/workspace/t435/t436-${tag}-recado.png` });
  const t2 = Date.now(); while (Date.now() - t2 < 40000) { const l = await p.evaluate(() => (__G.solLog || []).map(x => ({ t: x.t, ms: x.off ? Math.round(x.off - x.on) : null }))); R.notes = l; if (l.length >= 3 && l.every(x => x.ms)) break; await sleep(500); }
  chk(R.notes && R.notes.length >= 3, 'fila de recados (saída + boas-vindas + dica) não passou');
  chk(R.notes && R.notes.every(x => x.ms && x.ms < ((R.perf0 && R.perf0.fps < 5) ? 9000 : 4600)), 'recado não saiu sozinho em ~2–4 s');
  await sleep(4000); R.perf = await p.evaluate(() => MBD.perf());
  if (q === 'high' && !mobile) chk(R.perf.ao || R.perf.fps < 40, 'GTAO não ligou no PC (alto)');
  if (q !== 'low' && mobile) chk(R.perf.smaa, 'SMAA não ligou no celular médio/alto');
  if (q === 'low') chk(!R.perf.ao && !R.perf.smaa, 'modo leve não deve ter efeitos extras');
  chk(!R.perf.fxErr, 'erro carregando efeitos: ' + R.perf.fxErr);
  R.miss = [...new Set(miss.map(u => u.split('/').pop()))]; const onlyPhoto = miss.every(u => /solara\.webp$/.test(u)); R.errs = errs.filter(e => !(onlyPhoto && /Failed to load resource/.test(e))); chk(R.errs.length === 0, 'erros no console');
  console.log((R.ok ? 'PASS ' : 'FAIL ') + JSON.stringify(R)); await b.close(); process.exit(R.ok ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
