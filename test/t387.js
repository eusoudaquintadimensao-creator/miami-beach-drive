// Teste t387: controles do celular em vidro, mais altos (retrato e paisagem), sem sobreposição. Uso: node test/t387.js W H q tag
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const PORT = process.env.PORT || 8765;
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600;
const SH = process.env.SHOTS || '/workspace/t361-prints/'; const GAME = process.env.GAME || 'solara';
const KEY = process.env.KEYP || 'mbd';
const ONLY = process.env.ONLY || '';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SH, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = []; const R = {}; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  const want = (k) => !ONLY || ONLY.split(',').includes(k);
  const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${SH}botoes-${GAME}-${out}-${name}.png` }); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => {
    window.__ad = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
    window.__car = () => { const G = window.__G; const v0 = G.player.vehicle; if (v0 && !v0.spec.air && !v0.spec.boat) return v0; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); }
      if (v0 || G.player.swim || G.player.inWater) { MBD.teleport(300, -150, 0); MBD.sim(3, 1 / 30); }
      MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return G.player.vehicle; };
    window.__onFoot = (x, z) => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.teleport(x, z, 0); MBD.sim(3, 1 / 30); };
    window.__box = (ids, focus) => { const box = []; for (const id of ids) { const el = document.getElementById(id); if (!el || el.hidden) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; box.push({ id, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
      const ov = []; for (const a of box) if (focus.includes(a.id)) for (const b of box) { if (a === b) continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(a.id + '×' + b.id); }
      const off = box.filter(b => focus.includes(b.id) && (b.r[0] < -1 || b.r[2] > innerWidth + 1 || b.r[3] > innerHeight + 1 || b.r[1] < -1)).map(b => b.id); return { ov: [...new Set(ov)], off, vis: box.map(b => b.id) }; };
  });

  const SEL = ['#stick', '#btns button', '#icons', '#quick', '#mapw', '#topR', '#drvCruise', '.drvRight', '#drvGear', '#drvWheel', '#area', '#mis', '#nitroW', '#radio', '#prompt', '#orlaCard', '#toast > div'];
  const CTRL = ['#stick', '#btns button', '#drvCruise', '.drvRight', '#drvGear', '#drvWheel'];
  const scan = () => ev((SEL, CTRL) => { const vis = (el) => { if (!el || el.hidden) return false; let e = el; while (e) { const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; e = e.parentElement; } const r = el.getBoundingClientRect(); return r.width > 2 && r.height > 2; };
    const box = []; for (const s of SEL) document.querySelectorAll(s).forEach((el, i) => { if (!vis(el)) return; const r = el.getBoundingClientRect(); box.push({ s, id: el.id || s + i, r: [r.left, r.top, r.right, r.bottom], ctrl: CTRL.includes(s) }); });
    const ov = []; for (const a of box) if (a.ctrl) for (const b of box) { if (a === b || (a.s === b.s && a.s === '#btns button')) continue; if (b.s === '#btns button' && a.s === '#btns button') continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(a.id + '×' + b.id); }
    const H = innerHeight, W = innerWidth; const ctrls = box.filter(b => b.ctrl); const off = ctrls.filter(b => b.r[0] < 0 || b.r[1] < 0 || b.r[2] > W || b.r[3] > H).map(b => b.id);
    const low = ctrls.length ? Math.max(...ctrls.map(b => b.r[3])) : 0; // botão mais baixo
    const btn = document.querySelector('#bAct'); const cs = btn ? getComputedStyle(btn) : null;
    return { ov: [...new Set(ov)], off, gapBottom: Math.round(H - low), n: ctrls.length, glass: cs ? { bg: cs.backgroundImage !== 'none' || cs.backgroundColor, blur: (cs.backdropFilter || cs.webkitBackdropFilter || '').includes('blur'), border: cs.borderTopColor } : null, ids: ctrls.map(b => b.id) }; }, SEL, CTRL);
  // a pé
  R.f = await ev(() => { const G = window.__G; MBD.setHour(11); window.__onFoot(300, -150); G.camYaw = 0.6; G.camPitch = 0.1; MBD.sim(10, 1 / 30); });
  await sleep(1200); await shot('a-pe'); R.f = await scan();
  // dirigindo
  await ev(() => { window.__car(); MBD.sim(20, 1 / 30); });
  await sleep(1200); await shot('dirigindo'); R.d = await scan();
  // botão pressionado fica mais brilhante
  R.p = await ev(() => { const b = document.querySelector('#drvBrake') || document.querySelector('#bAct'); const c0 = getComputedStyle(b).backgroundColor + getComputedStyle(b).backgroundImage; b.classList.add('on'); const c1 = getComputedStyle(b).backgroundColor + getComputedStyle(b).backgroundImage; b.classList.remove('on'); return { changed: c0 !== c1 }; });
  console.log(JSON.stringify({ f: R.f, d: R.d }));
  const minGap = mobile ? (+W > +H ? 40 : 60) : 0;
  if (mobile) {
    ck('botões a pé: sem sobreposição, dentro da tela e afastados da borda de baixo', R.f.ov.length === 0 && R.f.off.length === 0 && R.f.gapBottom >= minGap, R.f);
    ck('botões dirigindo: sem sobreposição, dentro da tela e afastados da borda de baixo', R.d.ov.length === 0 && R.d.off.length === 0 && R.d.gapBottom >= minGap, R.d);
    ck('estilo vidro: fundo translúcido com desfoque e borda neon; pressionado muda', R.f.glass && R.f.glass.blur && R.p.changed, { g: R.f.glass, p: R.p });
  } else ck('desktop: sem controles de toque', R.f.n === 0, R.f);

  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
