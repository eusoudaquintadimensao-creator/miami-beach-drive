// Teste t396/t397: gaúchos da orla comentam o carro/cidade (devagar) ou pedem cuidado (rápido), com voz e intervalo. Uso: node test/t396.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}gaucho-${GAME}-${out}-${name}.png` }); };
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



  let r = await ev(async () => { const M = await import('/src/gauchos.js'); const V = await import('/src/voice.js'); const idx = await (await fetch('assets/voz/index.json')).json(); const miss = [];
    for (const t of M.GAUCHO_ALL) { const h = V.fnv(V.normLine(t)); for (const v of ['f', 'm', 's']) if (!idx.voices[v] || !idx.voices[v][h]) miss.push(v + ':' + t.slice(0, 20)); }
    return { n: M.GAUCHO_ALL.length, carro: M.GAUCHO.carro.length, cidade: M.GAUCHO.cidade.length, aviso: M.GAUCHO.aviso.length, miss: miss.slice(0, 5), nmiss: miss.length }; });
  ck('A 40+ falas gaúchas (carro, cidade, aviso), todas com voz gravada nas 3 vozes', r.n >= 40 && r.carro >= 10 && r.cidade >= 10 && r.aviso >= 10 && r.nmiss === 0, r);
  // dirige pela avenida da praia com um pedestre logo à frente, na calçada
  const drive = (spd, x0, n) => ev(({ spd, x0, n }) => { const G = window.__G, Gc = G.gauchos; const v = __car(); v.place(x0, -260, 0); MBD.sim(1, 1 / 30); MBD.drive && (MBD.drive().cruise = 0); Gc.cool = 0; const s0 = Gc.said, k0 = { ...Gc.byKind }; const lines = []; let firstT = -1, gap = 99;
    const peds = G.crowd.peds.filter(p => !p.hidden).slice(0, 3); 
    for (let i = 0; i < n; i++) { v.vx = 0; v.vz = spd; v.vf = spd; peds.forEach((p, j) => { if (Math.hypot(p.x - v.x, p.z - v.z) > 30 || p._fix !== spd) { p.x = v.x + 6 + j; p.z = v.z + 12 + j * 3; p.mode = 'idle'; p.t = 3; p._fix = spd; p._gT = -99; } }); const before = Gc.said; MBD.sim(1, 1 / 30);
      if (Gc.said > before) { lines.push([Gc.lastKind, document.getElementById('say').textContent]); if (firstT < 0) firstT = i; else if (gap === 99) gap = (i - firstT) / 30; } }
    return { said: Gc.said - s0, kinds: Object.fromEntries(Object.entries(Gc.byKind).map(([k, c]) => [k, c - k0[k]])), lines: lines.slice(0, 3), gap: +gap.toFixed ? gap : gap, say: !document.getElementById('say').hidden, voice: G.voice && G.voice.played }; }, { spd, x0, n });
  r = await drive(8, 318, 45);
  ck('B devagar na orla: elogia o carro ou a cidade', r.said >= 1 && r.kinds.aviso === 0 && (r.kinds.carro + r.kinds.cidade) >= 1, r);
  await shot('devagar', 1200);
  r = await drive(24, 318, 45);
  ck('C rápido na orla: pede cuidado com os pedestres', r.said >= 1 && r.kinds.aviso >= 1 && r.kinds.carro === 0, r);
  await shot('rapido', 1200);
  r = await drive(8, 318, 240);
  ck('D intervalo entre falas (>= 6 s, não vira falação)', r.said >= 1 && r.said <= 2 && (r.gap === 99 || r.gap >= 6), r);
  r = await drive(8, -100, 120);
  ck('E longe da orla: ninguém comenta', r.said === 0, r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
