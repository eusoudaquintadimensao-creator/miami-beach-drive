// Teste t400: HUD limpo — aviso de curva só seta (no alto, some sozinho), drift/bônus nos cantos, ⏸ Pausa com menu e ↩ Voltar. Uso: node test/t400.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}hud-${GAME}-${out}-${name}.png` }); };
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


  await ev(() => { window.__near = async () => { const G = window.__G, St = G.street; const Sm = await import('/src/street.js'); const v = __car(); for (let k = 0; k < Sm.ROUTES.length; k++) { const Rt = Sm.ROUTES[k]; v.place(Rt.start[0] + 12, Rt.start[1] + 12, 0); v.vf = v.vx = v.vz = 0; MBD.sim(20, 1 / 30); const w = St.nearRival(50); if (w) return w; } return null; }; });
  // A) racha: aviso de curva só seta + distância, no alto, some sozinho
  let r = await ev(async () => { const G = window.__G, St = G.street; MBD.setHour(21); await __near(); St.flash(); const S = St.race; if (!S) return { err: 'sem racha' };
    for (let i = 0; i < 200 && S.t < 0; i++) MBD.sim(1, 1 / 30);
    const tc = document.getElementById('turnCue'); const v = G.player.vehicle; const P = [[S.sx, S.sz], ...S.cps]; let got = null;
    for (let i = 0; i < P.length - 1 && St.race && !got; i++) { const a = P[i], b = P[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let d = 0; d < L && St.race; d += 1.5) { v.place(a[0] + Math.sin(h) * d, a[1] + Math.cos(h) * d, h); v.vf = 0; MBD.sim(1, 1 / 30); if (!tc.hidden) { const nt = St.nextTurn(); if (nt && nt.dist > 80) { got = { i, d }; break; } } } }
    if (!got) return { err: 'sem aviso' };
    const r0 = tc.getBoundingClientRect(); const o = { txt: tc.textContent, dir: tc.dataset.dir, top: Math.round(r0.top), h: innerHeight, w: Math.round(r0.width), dim0: tc.classList.contains('dim') };
    MBD.sim(110, 1 / 30); o.dim1 = tc.classList.contains('dim'); o.op = getComputedStyle(tc).opacity; return o; });
  ck('A aviso só seta + distância (sem frase)', r && !r.err && !/CURVA|ESQUERDA|DIREITA|fechada/i.test(r.txt) && /\d+ m/.test(r.txt) && /[LR]/.test(r.dir) && r.w <= 70, r);
  ck('A aviso no alto da tela', r && r.top < r.h * 0.36, r);
  ck('A aviso some sozinho', r && !r.dim0 && r.dim1, r);
  await shot('racha', 200);
  // B) ↩ Voltar aparece no racha e sai dele (continua no carro)
  r = await ev(() => { const G = window.__G; MBD.sim(15, 1 / 30); return new Promise(res => setTimeout(() => { const b = document.getElementById('bBack'); const vis = !b.hidden && b.offsetWidth > 0; b.click(); MBD.sim(2, 1 / 30); res({ vis, title: b.title, race: !!G.street.race, inCar: !!G.player.vehicle }); }, 600)); });
  ck('B ↩ Voltar visível no racha e sai dele', r.vis && !r.race && r.inCar, r);
  // C) ⏸ Pausa: menu, jogo parado, Continuar volta; Voltar sai do veículo
  r = await ev(() => new Promise(res => { const G = window.__G; document.getElementById('bPause').click(); setTimeout(() => { const pm = document.getElementById('pauseMenu'); const t0 = G.t; const o = { open: !pm.hidden, paused: G.paused, back: pm.querySelector('[data-k=back]').textContent, btns: [...pm.querySelectorAll('button')].filter(b => !b.hidden).map(b => b.textContent) };
    setTimeout(() => { o.frozen = G.t === t0; pm.querySelector('[data-k=go]').click(); o.after = { open: !pm.hidden, paused: G.paused }; res(o); }, 500); }, 300); }));
  ck('C ⏸ abre menu e pausa', r.open && r.paused && r.frozen && r.btns.length === 4 && /Continuar/.test(r.btns[0]) && /Configura/.test(r.btns.join()), r);
  ck('C Continuar volta ao jogo', !r.after.open && !r.after.paused, r);
  await ev(() => document.getElementById('bPause').click()); await shot('pausa', 300);
  r = await ev(() => new Promise(res => { const G = window.__G; document.querySelector('#pauseMenu [data-k=back]').click(); setTimeout(() => res({ inCar: !!G.player.vehicle, paused: G.paused }), 300); }));
  ck('C Voltar no menu sai do veículo', !r.inCar && !r.paused, r);
  // D) placar de drift e pop-ups de bônus fora do meio da pista
  r = await ev(() => { const out = {}; for (const id of ['drift', 'bfPop']) { const el = document.getElementById(id); const hid = el.hidden; el.hidden = false; const old = el.innerHTML; if (!el.textContent.trim()) el.innerHTML = id === 'drift' ? '<b>DRIFT</b><span>1.234</span><i>×3</i>' : '<div class="bfp">+$50 <b>bônus</b></div>'; const b = el.getBoundingClientRect(); out[id] = { cx: Math.round((b.left + b.right) / 2), cy: Math.round((b.top + b.bottom) / 2), W: innerWidth, H: innerHeight }; el.innerHTML = old; el.hidden = hid; } return out; });
  const mid = (o) => o.cx > o.W * 0.3 && o.cx < o.W * 0.7 && o.cy > o.H * 0.25 && o.cy < o.H * 0.75;
  ck('D drift fora do centro', !mid(r.drift), r.drift); ck('D bônus fora do centro', !mid(r.bfPop), r.bfPop);
  // E) mesmo vidro em todos os botões de direção (mesma cor de borda)
  if (mobile) { r = await ev(() => { __car(); return new Promise(res => setTimeout(() => { const ids = ['drvBrake', 'drvRev', 'drvBeam', 'bNeutral', 'bAct']; res(ids.map(id => { const e = document.getElementById(id); return e && e.offsetWidth ? getComputedStyle(e).borderTopColor : null; }).filter(Boolean)); }, 500)); });
    ck('E botões com a mesma borda de vidro', r.length >= 4 && new Set(r).size === 1, r); await shot('botoes', 300); }
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
