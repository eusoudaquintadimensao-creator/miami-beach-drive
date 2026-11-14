// Teste t401: seta de curva some em ~1,6 s; um toque no Freio sai do drift na hora; carro batido/parado + Freio volta para a pista (racha: último portão; fora: faixa da rua) na direção certa. Uso: node test/t401.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}t401-${GAME}-${out}-${name}.png` }); };
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
  const tapBrake = () => ev(() => { const b = document.getElementById('drvBrake'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })); MBD.sim(2, 1 / 30); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); });
  // A) seta de curva: aparece e some em ~1,6 s
  let r = await ev(async () => { const G = window.__G, St = G.street; MBD.setHour(21); await __near(); St.flash(); const S = St.race; if (!S) return { err: 'sem racha' };
    for (let i = 0; i < 200 && S.t < 0; i++) MBD.sim(1, 1 / 30);
    const tc = document.getElementById('turnCue'); const v = G.player.vehicle; const P = [[S.sx, S.sz], ...S.cps]; let got = null;
    for (let i = 0; i < P.length - 1 && St.race && !got; i++) { const a = P[i], b = P[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
      for (let d = 0; d < L && St.race; d += 1.5) { v.place(a[0] + Math.sin(h) * d, a[1] + Math.cos(h) * d, h); v.vf = 0; MBD.sim(1, 1 / 30); if (!tc.hidden) { const nt = St.nextTurn(); if (nt && nt.dist > 80) { got = { i, d }; break; } } } }
    if (!got) return { err: 'sem aviso' };
    MBD.sim(15, 1 / 30); const a05 = tc.classList.contains('dim'); MBD.sim(42, 1 / 30); const a19 = tc.classList.contains('dim'); return { a05, a19 }; });
  ck('A seta visível no começo e some até ~1,9 s', r && !r.err && !r.a05 && r.a19, r);
  // B) racha: bate e para fora do caminho → Freio volta ao último portão, virado para o próximo
  if (mobile) {
    await ev(() => { MBD.drive().cruise = 0; });
    r = await ev(() => { const G = window.__G, S = G.street.race, v = G.player.vehicle; if (!S) return { err: 'sem racha' }; const P = [[S.sx, S.sz], ...S.cps]; const k = S.k; const a = P[k], b = P[k + 1];
      v.place(a[0] + 30, a[1] + 30, v.h + 2); v.vx = v.vz = v.vf = 0; v.hitT = 0.3; MBD.sim(75, 1 / 30); return { k, exp: [a, b], spd: v.speed }; });
    await tapBrake(); await sleep(700);
    const r2 = await ev(() => { const G = window.__G, v = G.player.vehicle, L = G.lastRespawn; return { x: Math.round(v.x), z: Math.round(v.z), h: +v.h.toFixed(2), L: L || null, race: !!G.street.race }; });
    const [a, b] = r.exp || [[0, 0], [0, 1]]; const he = Math.atan2(b[0] - a[0], b[1] - a[1]); const dh = Math.abs(Math.atan2(Math.sin(r2.h - he), Math.cos(r2.h - he)));
    ck('B racha: Freio leva ao último portão', !r.err && Math.hypot(r2.x - a[0], r2.z - a[1]) < 10 && r2.race, { r, r2 });
    ck('B racha: virado para o próximo portão', dh < 0.2, { dh, he, h: r2.h });
    await shot('racha-volta', 300);
    await ev(() => { const G = window.__G; G.street.end(false, 'fim do teste'); MBD.sim(5, 1 / 30); });
    // C) drift travado: um toque no Freio sai do drift na hora e devolve a aderência
    r = await ev(() => { const G = window.__G; const vv = G.player.vehicle || __car(); vv.place(300, -150, 0); MBD.sim(2, 1 / 30);
      vv.vf = 24; vv.vz = 24; vv.vx = 0; vv.drifting = true; vv.swD = true; vv.driftDir = 1; vv.driftT = 0.3; vv.dExt = 9; vv.dSpd = 24; vv.vAng = 0.4; vv.dChain = 0; vv.dTime = 0; vv.recover = 0.2; vv.recSlow = true;
      const before = vv.drifting; const b = document.getElementById('drvBrake'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerId: 7 })); MBD.sim(1, 1 / 30); b.dispatchEvent(new PointerEvent('pointerup', { bubbles: true, pointerId: 7 })); return { before }; });
    const r3 = await ev(() => { const v = window.__G.player.vehicle; const o = { drifting: v.drifting, recover: v.recover }; MBD.sim(20, 1 / 30); o.after = v.drifting; const [fx, fz] = v.fwd(); o.lat = +Math.abs(v.vx * -fz + v.vz * fx).toFixed(2); return o; });
    ck('C Freio sai do drift na hora', r.before && !r3.drifting && r3.recover === 1, { r, r3 });
    ck('C não volta a derrapar sozinho', !r3.after && r3.lat < 1.5, r3);
    // D) fora de corrida: batido e parado fora da rua → Freio volta para a faixa da rua mais próxima
    r = await ev(() => { const G = window.__G, v = G.player.vehicle; v.place(v.x + 9, v.z + 3, 1.0); v.vx = v.vz = v.vf = 0; v.hitT = 0.3; MBD.sim(45, 1 / 30); return { x: v.x, z: v.z }; });
    await tapBrake(); await sleep(700);
    r = await ev(async () => { const G = window.__G, v = G.player.vehicle; const W = await import('/src/world.js'); const rd = W.roadAt(v.x, v.z); const ax = rd.seg.axis === 'z'; const hOk = ax ? Math.abs(Math.sin(v.h)) < 0.05 : Math.abs(Math.cos(v.h)) < 0.05; return { on: rd.d <= (rd.seg.w || 7), d: +rd.d.toFixed(1), w: rd.seg.w, hOk, L: G.lastRespawn }; });
    ck('D fora de corrida: volta para a faixa, alinhado com a rua', r.on && r.hOk && r.L && r.L.why === 'road', r);
    // E) parado num farol sem batida, em cima da rua: um toque no Freio NÃO reposiciona
    r = await ev(() => { const G = window.__G, v = G.player.vehicle; const x0 = v.x, z0 = v.z; G.lastRespawn = null; MBD.sim(60, 1 / 30); return { x0, z0 }; });
    await tapBrake(); await sleep(500);
    const r4 = await ev(() => { const G = window.__G, v = G.player.vehicle; return { L: G.lastRespawn }; });
    ck('E parado na rua sem batida: Freio só freia', !r4.L, r4);
  }
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
