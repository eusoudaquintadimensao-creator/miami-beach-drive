// Teste t394: outdoors e telões com anúncios dos apps; link ao chegar perto. Uso: node test/t394.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}outdoor-${GAME}-${out}-${name}.png` }); };
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



  let r = await ev(() => { const A = window.__G.ads; return { has: !!A, boards: A.items.filter(i => i.kind === 'board').length, screens: A.screens.length, tex: !!A.tex, ads: A.constructor && 1 }; });
  ck('A outdoors (>= 7) e telões no calçadão (>= 6) colocados', r.has && r.boards >= 7 && r.screens >= 6, r);
  r = await ev(async () => { const M = await import('/src/outdoor.js'); const bad = M.ADS.filter(a => /mercado ?pago|doa[cç][aã]o|doe |pix/i.test(a.name + a.tag + a.url)).map(a => a.id); return { n: M.ADS.length, bad, urls: M.ADS.every(a => /^https:\/\//.test(a.url)) }; });
  ck('A 9 apps, links https, sem Mercado Pago / doação', r.n === 9 && !r.bad.length && r.urls, r);
  // B) telões trocam de comercial (transição animada)
  r = await ev(() => { const G = window.__G, A = G.ads; __onFoot(326, 40); const k0 = A.screens.map(s => s.k); let mixSeen = 0; for (let i = 0; i < 260; i++) { MBD.sim(1, 1 / 30); for (const s of A.screens) if (s.mix > 0.2 && s.mix < 0.8) mixSeen++; } return { changed: A.screens.filter((s, i) => s.k !== k0[i]).length, mixSeen, vis: A.scr.visible }; });
  ck('B telões trocam de comercial com transição', r.changed >= 4 && r.mixSeen > 0 && r.vis, r);
  // C) chegar perto de um outdoor a pé mostra o cartão com o link; longe some
  const look = (kind) => ev((kind) => { const G = window.__G, A = G.ads; const it = kind === 'board' ? A.items.find(i => i.kind === 'board' && Math.abs(i.x) < 340 && i.z > -200 && i.z < 400) || A.items.find(i => i.kind === 'board') : A.items.find(i => i.kind === 'screen' && i.z > 0);
    const d = kind === 'board' ? 15.5 : 13; const nx = kind === 'board' ? Math.sin(it.h) : Math.sin(it.h), nz = Math.cos(it.h); __onFoot(it.x + nx * d, it.z + nz * d); const p = G.player; p.h = Math.atan2(it.x - p.x, it.z - p.z); G.camYaw = p.h; G.camPitch = 0.1; G.snapCam && G.snapCam(); MBD.sim(4, 1 / 30);
    const c = document.getElementById('adCard'); const a = c.querySelector('a'); return { it: [Math.round(it.x), Math.round(it.z)], shown: !c.hidden, href: a ? a.href : null, tgt: a ? a.target : null, txt: c.textContent.slice(0, 60) }; }, kind);
  r = await look('board');
  ck('C perto do outdoor: cartão com link do app (nova aba)', r.shown && /^https:/.test(r.href || '') && r.tgt === '_blank', r);
  await shot('outdoor', 1200);
  r = await look('screen');
  ck('C perto do telão: cartão com link', r.shown && /^https:/.test(r.href || ''), r);
  await shot('telao', 1200);
  r = await ev(() => { __onFoot(-100, -300); MBD.sim(3, 1 / 30); return { hidden: document.getElementById('adCard').hidden }; });
  ck('C longe: cartão some', r.hidden, r);
  // D) visão geral da orla com os telões
  await ev(() => { const G = window.__G; __onFoot(300, 120); G.player.h = Math.PI; G.camYaw = Math.PI * 0.82; G.snapCam && G.snapCam(); MBD.sim(3, 1 / 30); });
  await shot('orla', 1200);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
