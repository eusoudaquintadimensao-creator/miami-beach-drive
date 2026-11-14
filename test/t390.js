// Teste t390: pular do carro andando (rolamento sem ferimentos, carro para sozinho), paraquedas ao saltar da aeronave no ar, nado/resgate na água, pulo curto em baixa altura. Uso: node test/t390.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}pular-${GAME}-${out}-${name}.png` }); };
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


  const keyD = (code, down) => page.keyboard[down ? 'down' : 'up'](code === 'KeyD' ? 'd' : code === 'KeyW' ? 'w' : code);
  // A) pular do carro andando: rolamento, sem ferimentos; o carro segue na banguela e para sozinho
  R.r = await ev(() => { const G = window.__G, B = MBD.bail(); MBD.setHour(10); const v = window.__car(); if (!v) return { noCar: true };
    MBD.teleport(300, -150, Math.PI); v.place(300, -150, Math.PI); MBD.sim(2, 1 / 30); const [fx, fz] = v.fwd(); v.vx = fx * 22; v.vz = fz * 22; v.vf = 22;
    const p = G.player; const x0 = p.x, z0 = p.z; MBD.onActTap(1); const mode = B.mode, out = !p.vehicle, coast = !!v.coast; MBD.sim(8, 1 / 30); const rot = Math.abs(G.hero.g.rotation.x);
    window.__rv = v; return { mode, out, coast, rot, sp0: 22, x0, z0, mon: G.save.money }; });
  await shot('rolamento', 120);
  R.r2 = await ev(() => { const G = window.__G, B = MBD.bail(), p = G.player, v = window.__rv; let k = 0; for (; k < 150 && B.mode; k++) MBD.sim(1, 1 / 30);
    const moved = Math.hypot(p.x - v.x, p.z - v.z); const d = { ended: !B.mode, secs: +(k / 30).toFixed(2), grounded: p.grounded, ok: MBD.walkable ? MBD.walkable(p.x, p.z) : true, rotX: +G.hero.g.rotation.x.toFixed(3), carSp: +v.speed.toFixed(1) };
    for (let j = 0; j < 450 && !v.parked; j++) MBD.sim(1, 1 / 30); d.carStopped = v.parked && v.speed < 0.5; d.carDriver = !!v.driver; d.carFar = +Math.hypot(v.x - 300, v.z + 150).toFixed(1); return d; });
  ck('carro andando: Sair = pulo com rolamento (herói gira), sai do carro, carro segue sozinho', R.r.mode === 'roll' && R.r.out && R.r.coast && R.r.rot > 0.2, R.r);
  ck('rolamento termina em pé no chão em ~2 s; carro desacelera e para sozinho (sem motorista)', R.r2.ended && R.r2.secs < 2.6 && R.r2.grounded && Math.abs(R.r2.rotX) < 0.01 && R.r2.carStopped && !R.r2.carDriver && R.r2.carFar > 15, R.r2);
  // B) helicóptero no ar: salta, paraquedas abre, desce suave e dirigível; helicóptero paira e pousa sozinho
  R.h = await ev(() => { const G = window.__G, B = MBD.bail(), H = G.heli; window.__onFoot(300, -150); G.enterCar(H); H.place(300, -150, Math.PI); H.y += 120; H.air = true; H.spool = 1; MBD.sim(2, 1 / 30);
    const y0 = H.y; MBD.onActTap(1); const mode = B.mode, out = !G.player.vehicle, auto = H.auto; for (let k = 0; k < 45; k++) MBD.sim(1, 1 / 30);
    return { mode, out, auto, y0, mode2: B.mode, vis: B.chute.visible }; });
  await page.keyboard.down('d'); R.h.h0 = await ev(() => window.__G.player.h); await ev(() => MBD.sim(45, 1 / 30)); await page.keyboard.up('d');
  R.h2 = await ev((h0) => { const G = window.__G, B = MBD.bail(), H = G.heli, p = G.player; MBD.sim(60, 1 / 30); return { turn: +Math.abs(p.h - h0).toFixed(2), vy: +B.vy.toFixed(2), sp: +Math.hypot(B.vx, B.vz).toFixed(2), alt: +(p.y - B.floor(p.x, p.z, p.y)).toFixed(1), heliAlt: +(H.y - H.floor(H.x, H.z)).toFixed(1), heliAuto: +H.auto.toFixed(1) }; }, R.h.h0);
  await shot('paraquedas', 200);
  R.h3 = await ev(() => { const G = window.__G, B = MBD.bail(), H = G.heli, p = G.player; let k = 0; for (; k < 2400 && (B.mode === 'chute' || B.mode === 'fall'); k++) MBD.sim(1, 1 / 30); const land = { mode: B.mode, secs: +(k / 30).toFixed(1), y: +p.y.toFixed(2), fl: +B.floor(p.x, p.z, p.y).toFixed(2), vis: B.chute.visible };
    for (let j = 0; j < 2700 && H.air; j++) MBD.sim(1, 1 / 30); land.heliAir = H.air; land.heliY = +H.y.toFixed(1); land.auto = H.auto; if (B.mode) { B.cancel(); } return land; });
  ck('helicóptero no ar: Sair = salto; aeronave fica pairando (piloto automático)', R.h.mode === 'fall' && R.h.out && R.h.auto > 80 && R.h.mode2 === 'chute' && R.h.vis, R.h);
  ck('paraquedas: descida suave (~3 m/s), avanço e curva pelo controle; helicóptero ainda no alto', R.h2.vy < -2 && R.h2.vy > -4.5 && R.h2.sp > 3 && R.h2.turn > 0.6 && R.h2.alt > 20 && R.h2.heliAlt > 60, R.h2);
  ck('pouso suave no chão/telhado/água; velame recolhe; helicóptero desce e pousa sozinho', (R.h3.mode === null || R.h3.mode === 'swim') && !R.h3.vis && Math.abs(R.h3.y - R.h3.fl) < 1.2 && !R.h3.heliAir && R.h3.auto === 0, R.h3);
  // C) avião sobre a baía: paraquedas, cai na água e nada; resgate leva à margem; avião volta ao hidroporto
  R.p = await ev(() => { const G = window.__G, B = MBD.bail(), A = G.plane; window.__onFoot(300, -150); G.enterCar(A); A.place(-120, 40, 0); A.y = 70; A.air = true; A.thr = 0.6; A.vz = 38; A.vf = 38; MBD.sim(1, 1 / 30);
    MBD.onActTap(1); const mode = B.mode, out = !G.player.vehicle; let k = 0; for (; k < 2400 && B.mode && B.mode !== 'swim'; k++) MBD.sim(1, 1 / 30); return { mode, out, landed: B.mode, secs: +(k / 30).toFixed(1), y: +G.player.y.toFixed(2) }; });
  await shot('nadando', 200);
  R.p2 = await ev(() => { const G = window.__G, B = MBD.bail(), A = G.plane, p = G.player; const r0 = B.stats.rescues; for (let k = 0; k < 900 && B.mode === 'swim'; k++) MBD.sim(1, 1 / 30);
    for (let k = 0; k < 900 && A.abandon; k++) MBD.sim(1, 1 / 30); return { mode: B.mode, rescued: B.stats.rescues > r0 || !B.mode, walk: !!(MBD.walkable && MBD.walkable(p.x, p.z)), planeHome: !A.abandon && Math.hypot(A.x + 16.5, A.z - 300) < 3, onFoot: !p.vehicle }; });
  ck('avião no ar sobre a baía: salto, paraquedas, cai na água e nada (sem drama)', R.p.mode === 'fall' && R.p.out && R.p.landed === 'swim', R.p);
  ck('nado: chega à margem ou o barco de resgate leva; avião volta sozinho ao hidroporto', R.p2.mode === null && R.p2.rescued && R.p2.walk && R.p2.planeHome && R.p2.onFoot, R.p2);
  // D) baixa altitude: pulo curto, sem paraquedas
  R.d = await ev(() => { const G = window.__G, B = MBD.bail(), H = G.heli; window.__onFoot(300, -150); G.enterCar(H); H.place(300, -150, 0); H.y += 5; H.air = true; H.spool = 1; MBD.sim(1, 1 / 30);
    MBD.onActTap(1); const mode = B.mode; let k = 0, vis = false; for (; k < 120 && B.mode; k++) { MBD.sim(1, 1 / 30); vis = vis || B.chute.visible; } const p = G.player; return { mode, vis, secs: +(k / 30).toFixed(2), end: B.mode, grounded: p.grounded }; });
  ck('baixa altitude: pulo curto e pouso seguro (sem paraquedas)', R.d.mode === 'drop' && !R.d.vis && R.d.end === null && R.d.secs < 2 && R.d.grounded, R.d);
  // E) parado: Sair normal (sem pulo)
  R.e = await ev(() => { const G = window.__G, B = MBD.bail(); window.__onFoot(300, -150); const H = G.heli; H.place(416, -200, -Math.PI / 2); const v = window.__rv; window.__onFoot(v.x + 2, v.z); G.enterCar(v); v.vx = v.vz = v.vf = 0; MBD.sim(2, 1 / 30); MBD.onActTap(1); return { mode: B.mode, out: !G.player.vehicle }; });
  ck('veículo parado: Sair normal, sem pulo', R.e.mode === null && R.e.out, R.e);
  console.log('errors:', JSON.stringify(errs.slice(0, 5)));
  console.log(fail.length || errs.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length || errs.length ? 1 : 0);
})().catch(e => { console.error('Error', e); process.exit(2); });
