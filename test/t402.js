// Teste t402: câmera mantém o carro inteiro na tela e a estrada à frente visível no drift; parede atrás não esconde o carro; placar de drift à direita. Uso: node test/t402.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}camera-${GAME}-${out}-${name}.png` }); };
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
  await ev(() => { window.__vis = () => { const G = window.__G, cam = G.camera, v = G.player.vehicle; cam.updateMatrixWorld(); const L = (v.spec.len || 4.4) / 2, Wd = (v.spec.w || 1.8) / 2; const [fx, fz] = v.fwd(); const rx = fz, rz = -fx; const pts = [];
      for (const a of [-L, L]) for (const b of [-Wd, Wd]) for (const y of [0.2, 1.3]) pts.push([v.x + fx * a + rx * b, v.y + y, v.z + fz * a + rz * b]);
      let out = 0, worst = 0; for (const p of pts) { const q = new (cam.position.constructor)(p[0], p[1], p[2]).project(cam); const m = Math.max(Math.abs(q.x), Math.abs(q.y)); worst = Math.max(worst, m); if (m > 0.98 || q.z > 1) out++; }
      const va = Math.hypot(v.vx, v.vz) > 2 ? Math.atan2(v.vx, v.vz) : v.h; const ah = new (cam.position.constructor)(v.x + Math.sin(va) * 15, v.y + 0.5, v.z + Math.cos(va) * 15).project(cam);
      return { out, worst: +worst.toFixed(2), ahead: Math.abs(ah.x) < 0.95 && Math.abs(ah.y) < 0.95 && ah.z < 1, dcam: +Math.hypot(cam.position.x - v.x, cam.position.z - v.z).toFixed(1), cy: +(cam.position.y - v.y).toFixed(1) }; }; });
  // A) drift longo em pêndulo: carro inteiro na tela e estrada à frente visível o tempo todo
  let r = await ev(() => { const G = window.__G; const v = __car(); MBD.drive && (MBD.drive().cruise = 0); v.place(300, -400, 0); MBD.sim(2, 1 / 30); G.snapCam(); MBD.sim(2, 1 / 30);
    v.vz = 24; v.vx = 0; v.vf = 24; v.drifting = true; v.swD = true; v.driftDir = 1; v.driftT = 0.3; v.dExt = 9; v.dSpd = 24; v.vAng = 0; v.h = 0.7; v.dChain = 0; v.dTime = 0;
    let bad = 0, noAhead = 0, worst = 0, n = 0; for (let i = 0; i < 75; i++) { if (i === 25) { v.driftDir = -1; v.h = -0.6; } MBD.sim(1, 1 / 30); if (i % 3 === 0) { const o = __vis(); n++; if (o.out) bad++; if (!o.ahead) noAhead++; worst = Math.max(worst, o.worst); } }
    return { n, bad, noAhead, worst, drifting: v.drifting }; });
  ck('A drift: carro inteiro na tela', r.bad === 0, r);
  ck('A drift: estrada à frente visível', r.noAhead <= 1, r);
  await shot('drift', 100);
  // B) parede/prédio logo atrás: a câmera chega perto mas sobe, sem entrar no carro
  r = await ev(async () => { const G = window.__G, W = await import('/src/world.js'); const v = G.player.vehicle; v.drifting = false; v.swD = false; let found = null;
    for (let k = 0; k < 400 && !found; k++) { const x = 200 + (k % 20) * 9, z = -300 + Math.floor(k / 20) * 9; if (!W.walkable(x, z)) continue; for (const h of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) { const tb = W.rayBlock(x, z, 1.5, x - Math.sin(h) * 7, z - Math.cos(h) * 7, 3); if (tb < 0.45 && tb > 0.12) { found = [x, z, h, tb]; break; } } }
    if (!found) return { err: 'sem parede' }; v.place(found[0], found[1], found[2]); v.vx = v.vz = v.vf = 0; G.snapCam(); MBD.sim(30, 1 / 30); const o = __vis(); o.found = found; return o; });
  ck('B parede atrás: carro visível e câmera fora da carroceria', !r.err && r.out === 0 && (r.dcam >= 2.0 || r.cy >= 1.8), r);
  await shot('parede', 300);
  // C) placar de drift à direita da tela
  r = await ev(() => { const el = document.getElementById('drift'); const hid = el.hidden; el.hidden = false; const old = el.innerHTML; el.innerHTML = '<b>DRIFT</b><span>1.461</span><i>×2</i>'; const b = el.getBoundingClientRect(); el.innerHTML = old; el.hidden = hid; return { cx: Math.round((b.left + b.right) / 2), W: innerWidth }; });
  ck('C placar de drift à direita', r.cx > r.W * 0.6, r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
