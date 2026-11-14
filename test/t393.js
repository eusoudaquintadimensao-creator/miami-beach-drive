// Teste t393: palmeiras realistas que quebram no impacto do carro (tomba com física, folhas/lascas, carro perde pouca velocidade, volta depois). Uso: node test/t393.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}palmeira-${GAME}-${out}-${name}.png` }); };
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
  // pega uma palmeira da orla (x≈318) e prepara o carro 30 m antes, apontado para ela
  const setup = (spd) => ev((spd) => { const G = window.__G, P = G.palms; P.respawnAll(); const v = __car(); const p = P.P.list.filter(q => Math.abs(q.x - 318) < 2 && q.z > -300 && q.z < 300)[3]; window.__pp = p;
    v.place(p.x, p.z - 12, 0); MBD.sim(1, 1 / 30); v.vx = 0; v.vz = spd; v.vf = spd; MBD.drive && (MBD.drive().cruise = 0); return { palm: [p.x, p.z], car: [v.x, v.z], tri: P.P.cgeo.index ? P.P.cgeo.index.count / 3 : P.P.cgeo.attributes.position.count / 3, n: P.P.list.length }; }, spd);
  let s0 = await setup(24);
  ck('modelo: copa com folíolos (>= 300 triângulos) e muitas palmeiras instanciadas', s0.tri >= 300 && s0.n > 50, s0);
  await ev(() => { const G = window.__G; G.camYaw = 0; G.snapCam && G.snapCam(); });
  // A) bate rápido: quebra, tomba, solta pedaços; o carro perde só um pouco de velocidade e segue
  let r = await ev(() => { const G = window.__G, P = G.palms, v = G.player.vehicle, p = window.__pp; let hitF = -1, v0 = 0, v1 = 0, bits = 0; const c0 = P.count;
    for (let i = 0; i < 90; i++) { if (!p.down) { v.vx = 0; v.vz = 20; v.vf = 20; } const sp = Math.hypot(v.vx, v.vz); MBD.sim(1, 1 / 30); if (hitF < 0 && p.down) { hitF = i; v0 = sp; v1 = Math.hypot(v.vx, v.vz); } bits = Math.max(bits, P.bits.length); if (hitF >= 0 && i === hitF + 8) break; }
    return { broke: p.down, count: P.count - c0, hitF, v0: +v0.toFixed(1), v1: +v1.toFixed(1), bits, fall: P.fall.length, circOff: !!p.circ.off, carZ: +(v.z - p.z).toFixed(1) }; });
  ck('A bateu rápido: a palmeira quebra', r.broke && r.count >= 1 && r.circOff, r);
  ck('A o carro perde só um pouco de velocidade (sem parar)', r.v1 > r.v0 * 0.6 && r.v1 > 8, r);
  ck('A soltou folhas e lascas', r.bits >= 10, r);
  await shot('quebrando', 100);
  r = await ev(() => { const G = window.__G, P = G.palms; MBD.sim(75, 1 / 30); const f = P.fall[0]; return { th: f ? +f.th.toFixed(2) : null, rest: f ? f.rest : null, bitsLeft: P.bits.length }; });
  ck('A tomba até deitar e para', r.th >= 1.4 && r.rest, r);
  await ev(() => { const G = window.__G; const v = G.player.vehicle; v.vx = v.vz = v.vf = 0; const p = window.__pp; v.place(p.x - 8, p.z - 6, 0.6); G.camYaw = 0.6; G.snapCam && G.snapCam(); MBD.sim(3, 1 / 30); });
  await shot('caida', 300);
  // B) volta depois de ~60 s (ou antes, longe da câmera)
  r = await ev(() => { const G = window.__G, P = G.palms, v = G.player.vehicle, p = window.__pp; v.place(p.x, p.z - 200, 0); MBD.sim(3, 1 / 30); MBD.sim(60 * 9, 1 / 60); return { back: !p.down, fall: P.fall.length, circ: !p.circ.off }; });
  ck('B a palmeira volta (fora de vista)', r.back && r.fall === 0 && r.circ, r);
  // C) encostar devagar não quebra (a palmeira segura o carro como antes)
  s0 = await setup(3);
  r = await ev(() => { const G = window.__G, v = G.player.vehicle, p = window.__pp; v.place(p.x, p.z - 3, 0); v.vz = 3; v.vf = 3; for (let i = 0; i < 40; i++) { v.vz = Math.max(v.vz, 0); MBD.sim(1, 1 / 30); } return { down: !!p.down }; });
  ck('C devagar não quebra', !r.down, r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
