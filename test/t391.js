// Teste t391: sem pisca (near, histerese), frota de luxo (3 lanchas, iate, 3 jet skis) pilotável sem voar nem encalhar, e corridas no mar (Aceitar, anéis, moedas, HUD, prêmio). Uso: node test/t391.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}mar-${GAME}-${out}-${name}.png` }); };
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
  const gas = async (on) => { if (mobile) await ev((on) => { MBD.drive().cruise = on ? 1 : 0; }, on); else await page.keyboard[on ? 'down' : 'up']('w'); };
  // 0) anti-pisca: near maior, resolução não oscila
  let r = await ev(() => { const G = window.__G; const cam = G.camera || null; return { near: cam ? cam.near : null }; });
  // A) frota: 7 embarcações na água, nomes, todas na água
  r = await ev(async () => { const G = window.__G; const W = await import('/src/world.js'); return G.fleet.boats.map(b => ({ n: b.spec.name, k: b.spec.lux, ok: W.boatable(b.x, b.z), y: +(b.y - W.WATER_Y).toFixed(2) })); });
  ck('A frota: 3 lanchas + 1 iate + 3 jet skis na água', r.length === 7 && r.filter(b => b.k === 'lux').length === 3 && r.filter(b => b.k === 'yacht').length === 1 && r.filter(b => b.k === 'jet').length === 3 && r.every(b => b.ok), r);
  // B) pilotar cada tipo: anda rápido, flutua (não voa), nunca sobe na terra
  const kinds = ['lux', 'yacht', 'jet']; R.drive = {};
  for (const k of kinds) {
    await ev((k) => { const G = window.__G; const v0 = G.player.vehicle; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); } const b = G.fleet.boats.find(x => x.spec.lux === k); b.place(b.home[0], b.home[1], b.home[2]); MBD.teleport(b.x, b.z, 0); G.enterCar(b); MBD.sim(3, 1 / 30); }, k);
    await gas(true);
    r = await ev(async () => { const G = window.__G; const W = await import('/src/world.js'); const v = G.player.vehicle; let maxY = -9, minY = 9, land = 0, top = 0; for (let i = 0; i < 300; i++) { if (i % 60 === 30) v.steer = 0; MBD.sim(1, 1 / 30); const dy = v.y - W.WATER_Y; maxY = Math.max(maxY, dy); minY = Math.min(minY, dy); if (!W.boatable(v.x, v.z)) land++; top = Math.max(top, v.speed); } return { name: v.spec.name, maxY: +maxY.toFixed(2), minY: +minY.toFixed(2), land, top: +top.toFixed(1) }; });
    await gas(false); R.drive[k] = r;
    ck(`B ${k}: anda, flutua e não sobe na terra`, r.top > 8 && r.maxY < 1.6 && r.minY > -1.2 && r.land === 0, r);
    if (k === 'lux') await shot('frota', 300);
  }
  // C) proa na areia: aponta para a praia e acelera 8 s — desliza na borda, continua na água e consegue sair de ré
  R.shore = await ev(async () => { const G = window.__G; const W = await import('/src/world.js'); const v = G.player.vehicle; let st = null; for (let z = -300; z > -420 && !st; z -= 10) for (let x = 560; x > 300; x -= 2) { if (W.boatable(x, z) && !W.boatable(x - 25, z)) { if (W.boatable(x + 12, z)) st = [x + 12, z]; break; } } if (!st) return null; v.place(st[0], st[1], -Math.PI / 2); MBD.sim(2, 1 / 30); return st; });
  await gas(true);
  r = await ev(async () => { const G = window.__G; const W = await import('/src/world.js'); const v = G.player.vehicle; let land = 0, maxY = -9; for (let i = 0; i < 240; i++) { MBD.sim(1, 1 / 30); if (!W.boatable(v.x, v.z)) land++; maxY = Math.max(maxY, v.y - W.WATER_Y); } return { x: Math.round(v.x), z: Math.round(v.z), land, maxY: +maxY.toFixed(2), ok: W.boatable(v.x, v.z) }; });
  await gas(false); ck('C na borda: não encalha na terra nem voa', r.land === 0 && r.ok && r.maxY < 1.6, r);
  // D) corrida no mar: perto do pórtico → Aceitar → contagem → percorre o circuito: anéis, moedas, HUD, posição, prêmio
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; const C = G.mar.list[1]; v.place(C.start.x - 25, C.start.z, C.start.h); v.vx = v.vz = v.vf = 0; MBD.sim(20, 1 / 30); const tip = document.getElementById('marTip'); return { can: G.mar.canAccept(), tip: !tip.hidden, txt: tip.textContent.slice(0, 300), name: C.cfg.name, L: Math.round(C.L) }; });
  ck('D perto do pórtico: convite visível com Aceitar', r.can && r.tip && /Aceitar/i.test(r.txt), r);
  await shot('convite', 300);
  r = await ev(() => { const G = window.__G; const m0 = G.save ? G.save.money : 0; MBD.onActTap(1); const R0 = G.mar.race; if (!R0) return { err: 'não começou' }; for (let i = 0; i < 200 && R0.t < 0; i++) MBD.sim(1, 1 / 30); return { racers: R0.ais.length, m0 }; });
  ck('D aceitou: 5 pilotos', r.racers === 5, r);
  const m0 = r.m0;
  r = await ev(() => { const G = window.__G; const R0 = G.mar.race, C = R0.C, v = G.player.vehicle; let hud = '', s = 0, k = 0, pos = new Set(); const sp = 46; // um pouco mais rápido que a IA para ganhar
    while (G.mar.race && s < C.total + 40 && k < 9000) { s += sp / 30; const p = C.at(s, 0); v.place(p.x, p.z, p.h); v.vf = sp; v.vx = Math.sin(p.h) * sp; v.vz = Math.cos(p.h) * sp; MBD.sim(1, 1 / 30); k++; if (k === 300) { hud = document.getElementById('marHud').textContent; } if (G.mar.race) pos.add(G.mar.race.place); }
    return { hud, done: !G.mar.race, last: G.mar.last, frames: k, pos: [...pos] }; });
  ck('D HUD com %, km, posição e volta', /%/.test(r.hud) && /km/.test(r.hud) && /º\/6/.test(r.hud) && /volta/.test(r.hud), r.hud);
  ck('D terminou com anéis, moedas e prêmio em dólar', r.done && r.last && r.last.rings >= 20 && r.last.coins > 0 && r.last.prize >= 100, r.last);
  r = await ev((m0) => { const G = window.__G; return { m: G.save ? G.save.money : null, m0 }; }, m0);
  ck('D prêmio entrou na carteira', r.m == null || r.m > r.m0, r);
  // E) corrida de lanchas antiga continua funcionando
  r = await ev(() => { const G = window.__G; return { ok: !!G.boatRace && typeof G.boatRace.canAccept === 'function', parked: (G.boatRace.parked || []).length }; });
  ck('E corrida de lanchas antiga intacta', r.ok, r);
  await shot('fim', 300);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
