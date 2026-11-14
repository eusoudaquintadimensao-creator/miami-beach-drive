// Teste t367: ilhas (1 por minuto na ponte, anel de ilhas e barcos, fauna, pouso de helicóptero, lancha não atravessa),
// corrida da ponte (posições 1º–3º pelo desempenho, prêmio, sair guiado ou mais voltas), 3 carros na garagem de prêmios,
// racha de rua (convite Aceitar/Recusar a 50 m, Neutro e largada perfeita, rádio dos corredores), Raia das Lanchas,
// rádio novo (todas as falas com mp3). Uso: node test/t367.js W H q tag  (ONLY=ilhas,ponte,garagem,rua,neutro,lancha,radio,shots)
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
  const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${SH}${GAME}-${out}-${name}.png` }); };
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
  const UI = ['ponteHud', 'radioSub', 'ponteQuit', 'topR', 'speedo', 'mapw', 'driftW', 'nitroW', 'bAct', 'bNeutral', 'bReset', 'stTip', 'boatTip', 'boatHud', 'stHud', 'turnCue', 'quick', 'icons', 'drvGear', 'drvWheel', 'drvCruise', 'heliHud'];

  if (want('ilhas')) {
    R.isl = await ev(async () => {
      const G = window.__G, I = MBD.ilhas(), P = MBD.ponte(); const L = I.list; const br = L.filter(i => i.bridge && i.s != null).sort((a, b) => a.s - b.s); const o = {};
      o.n = L.length; o.bridge = br.length; o.kinds = new Set(L.filter(i => i.bridge).map(i => i.kind)).size; o.far = L.filter(i => !i.bridge).length;
      const gaps = br.map((b, k) => ((br[(k + 1) % br.length].s - b.s + P.L) % P.L)); o.gapMin = Math.round(Math.min(...gaps)); o.gapMax = Math.round(Math.max(...gaps)); o.secPer = Math.round(P.estimate.t / br.length);
      o.west = L.some(i => i.x < -1150); o.cityNS = L.some(i => !i.bridge && i.x < 400);
      let minClr = 1e9; for (const i of L) { for (let k = 0; k < P.loop.M; k += 2) minClr = Math.min(minClr, Math.hypot(P.loop.px[k] - i.x, P.loop.pz[k] - i.z) - i.R * 1.2); } o.minClear = Math.round(minClr);
      o.fauna = { birds: I.birds.length, crocs: I.crocs.length, flam: I.flams.length, dol: I.dols.length, boats: I.boatsP.length };
      const v = __car(); P.noAuto = true; const b0 = br[2]; const p = P.loop.at(b0.s - 60, 0); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; G.player.x = p.x; G.player.z = p.z; I._lastAny = -1e9; I.seen = []; const c0 = I.callN || 0; I.calloutT = 0;
      for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); o.callout = (I.callN || 0) - c0; o.toast = (document.getElementById('toast') || {}).textContent || '';
      o.built = L.filter(i => i.mesh).length; o.tris = Math.max(...L.filter(i => i.mesh).map(i => i.tris));
      const Hc = G.heli; const ir = L.find(i => i.bridge && i.core > 4); v.vx = v.vz = v.vf = 0; G.leaveCar(true); Hc.place(ir.x, ir.z, 0); G.enterCar(Hc); Hc.y = 25; Hc.air = true; Hc.spool = 1; Hc.vx = Hc.vz = Hc.vy = 0; MBD.input.down = true; for (let i = 0; i < 600 && Hc.air; i++) MBD.sim(1, 1 / 30); MBD.input.down = false; MBD.sim(20, 1 / 30);
      o.heliLand = { air: Hc.air, y: +Hc.y.toFixed(2), top: ir.top };
      Hc.vx = Hc.vz = 0; G.leaveCar(true); Hc.place(416, -200, -Math.PI / 2); const boats = G.vehicles.filter(x => x.spec.boat && !x.npc && !x.driver); const bt = boats[0]; bt.place(ir.x - ir.R * 1.4 - 10, ir.z, Math.PI / 2); G.enterCar(bt); MBD.input.stick = [0, 1]; let inside = 0; for (let i = 0; i < 30 * 10; i++) { MBD.sim(1, 1 / 30); if (Math.abs(bt.x - ir.x) < ir.core - 0.5 && Math.abs(bt.z - ir.z) < ir.core - 0.5) inside++; } MBD.input.stick = [0, 0];
      o.boat = { inside, x: Math.round(bt.x - ir.x), core: Math.round(ir.core) }; bt.vx = bt.vz = bt.vf = 0; G.leaveCar(true); bt.place(-215, -50, Math.PI / 2);
      return o; });
    const r = R.isl; console.log(JSON.stringify(r));
    ck('ilhas: 8 na volta da ponte, formatos diferentes', r.bridge >= 8 && r.kinds >= 8, r);
    ck('ilhas: ~1 por minuto de volta', r.secPer >= 35 && r.secPer <= 90 && r.gapMin > 600, { secPer: r.secPer, gapMin: r.gapMin, gapMax: r.gapMax });
    ck('ilhas: anel em volta do mapa (oeste e perto da cidade)', r.far >= 6 && r.west && r.cityNS, r);
    ck('ilhas: longe do tabuleiro', r.minClear > 15, r.minClear);
    ck('ilhas: fauna e barcos', r.fauna.birds > 10 && r.fauna.crocs >= 4 && r.fauna.dol >= 3 && r.fauna.boats >= 6, r.fauna);
    ck('ilhas: aviso "Olha a ilha" na ponte', r.callout >= 1 && /Olha a/.test(r.toast), { c: r.callout, t: r.toast });
    ck('ilhas: helicóptero pousa na ilha', !r.heliLand.air && r.heliLand.y > 0.3, r.heliLand);
    ck('ilhas: lancha não atravessa', r.boat.inside === 0, r.boat);
  }

  if (want('ponte')) {
    await ev(async () => { const G = window.__G, P = MBD.ponte(); MBD.setHour(16.5); let v = __car(); if (!v) { P.go(); for (let i = 0; i < 300 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); v = G.player.vehicle; } P.go(); MBD.sim(5, 1 / 30); const ok = P.accept(); for (let i = 0; i < 40 && !(P.on && P._loc); i++) { await new Promise(r => setTimeout(r, 250)); MBD.sim(2, 1 / 30); } if (!(P.on && P._loc)) throw new Error('ponte não iniciou ' + JSON.stringify({ ok, on: P.on, loc: !!P._loc, veh: v && v.spec.name })); });
    R.p = await ev(async () => { const G = window.__G, P = MBD.ponte(); const o = { on: P.on, pos0: P.position() };
      const loc0 = P._loc, cam = { position: { x: 0, z: 0 } }; let sP = loc0.s; const drive = (sh) => { P.shift = sh; for (let i = 0; i < 30 * 15; i++) { sP = (sP + 25 / 30) % P.L; P._loc = { s: sP, lat: 0 }; P.ai(1 / 30, sP, 25, cam); } return P.position(); }; o.posBest = drive(-46); o.posWorst = drive(0); P._loc = loc0; P.shift = 0; MBD.sim(10, 1 / 30);
      P.shift = 0; P._perf(1, { drifting: true, boosting: true, hitT: 0 }, 30); o.good = +P.shift.toFixed(2); P._perf(5, { drifting: false, boosting: false, hitT: 1 }, 3); o.badClamp = P.shift;
      const near = P.cars.filter(r => r.active).map(r => Math.round(Math.abs(r.total - P._loc.s) % P.L)); o.maxGap = Math.max(...near.map(g => Math.min(g, P.L - g)));
      P.lapStart = P.lapStart || G.t - 20; P.lap = P.lap || 1; P.prog = Math.max(P.prog, P.L * 0.4); P.hud(true); o.hud = document.getElementById('ponteHud').textContent; return o; });
    await ev(() => { const P = MBD.ponte(); const sub = document.getElementById('radioSub'); sub.hidden = false; sub.innerHTML = '<b>📻 Bia Kaze</b><span>Olha aquela ilha! Que lugar bonito, gente!</span>'; P.radio.place(); });
    R.pov = await ev((ids) => __box(ids, ['ponteHud', 'radioSub', 'ponteQuit']), UI);
    await shot('ponte-posicao-hud');
    R.pe1 = await ev(async () => { const G = window.__G, P = MBD.ponte(); const m0 = MBD.state.money; P.shift = -46; P._perf = () => {}; for (let i = 0; i < 30 * 12; i++) MBD.sim(1, 1 / 30); window.__posB = [P.position(), P.on, !!P._loc, Math.round(P.shift)]; P.lap = 2; P.lapStart = G.t - 400; P.prog = P.L * 0.96; P.onLine(G.t); const el = document.getElementById('ponteEnd');
      return { gift: !document.getElementById('giftScreen').hidden, posBefore: window.__posB, vis: !el.hidden, paused: G.paused, place: P.lastFinish && P.lastFinish.place, prize: P.lastFinish && P.lastFinish.prize, dm: MBD.state.money - m0, txt: el.textContent.slice(0, 90) }; });
    console.log('p', JSON.stringify(R.p)); console.log('pe1', JSON.stringify(R.pe1));
    if (R.pe1.gift) { await page.click('#giftLater'); await sleep(300); R.pe1 = Object.assign(R.pe1, await ev(() => { const el = document.getElementById('ponteEnd'); MBD.sim(2, 1 / 30); return { vis: !el.hidden, paused: window.__G.paused, txt: el.textContent.slice(0, 90) }; })); console.log('pe1b', JSON.stringify(R.pe1)); }
    await shot('ponte-fim-podio');
    await page.click('#peMore'); await sleep(300);
    R.pe2 = await ev(() => { const G = window.__G, P = MBD.ponte(); MBD.sim(10, 1 / 30); return { on: P.on, paused: G.paused, hidden: document.getElementById('ponteEnd').hidden }; });
    await ev(() => { const G = window.__G, P = MBD.ponte(); P.lapStart = G.t - 20; P.lap = 2; P.prog = P.L * 0.96; P.onLine(G.t); });
    await page.click('#peExit'); await sleep(1600);
    R.pe3 = await ev(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; MBD.sim(5, 1 / 30); const q = P.ramp.locate(v.x, v.z); const want = P.ramp.at(P.ramp.L - 40).h + Math.PI; delete P._perf;
      return { on: P.on, onRamp: !!(q && q.d < 10), dh: +Math.abs(__ad(v.h, want)).toFixed(2), route: !!G.routeDest, paused: G.paused }; });
    R.pe4 = await ev(() => { const G = window.__G, P = MBD.ponte(); MBD.input.stick = [0, 0.5]; for (let i = 0; i < 30 * 4; i++) MBD.sim(1, 1 / 30); MBD.input.stick = [0, 0]; return { on: P.on }; });
    const p = R.p; console.log(JSON.stringify(p));
    ck('ponte: começa em 3º', p.on && p.pos0 === 3, p.pos0);
    ck('ponte: pilotar bem → 1º, mal → 3º (nunca pior)', p.posBest === 1 && p.posWorst === 3 && p.good < 0 && p.badClamp === 0, p);
    ck('ponte: rivais sempre perto (elástico)', p.maxGap < 120, p.maxGap);
    ck('ponte: HUD com posição, % e km que faltam', /º\/6/.test(p.hud) && /faltam \d+,\d km/.test(p.hud) && /\d+%/.test(p.hud), p.hud);
    ck('ponte: HUD sem sobrepor', R.pov.ov.length === 0 && R.pov.off.length === 0, R.pov);
    ck('ponte: pódio + prêmio na bandeirada', R.pe1.vis && R.pe1.paused && R.pe1.place <= 3 && R.pe1.dm >= R.pe1.prize && R.pe1.dm < R.pe1.prize + 100 && R.pe1.prize === [1500, 900, 500][R.pe1.place - 1] && /LUGAR/.test(R.pe1.txt), R.pe1);
    ck('ponte: "Mais voltas" continua', R.pe2.on && !R.pe2.paused && R.pe2.hidden, R.pe2);
    ck('ponte: "Sair" leva à rampa de saída guiado', !R.pe3.on && R.pe3.onRamp && R.pe3.dh < 0.3 && R.pe3.route && !R.pe3.paused, R.pe3);
    ck('ponte: descendo a rampa não recomeça', !R.pe4.on, R.pe4);
  }

  if (want('garagem')) {
    R.g0 = await ev(async () => { const G = window.__G, Hm = MBD.home(); const { HOME } = await import('/src/home.js'); G.save.giftCar = null; G.save.giftCars = null; Hm.carsT = 0; __onFoot(HOME.x + 36, HOME.z - 30); for (let i = 0; i < 90; i++) MBD.sim(1, 1 / 30);
      return { door: +Hm.doorY.toFixed(2), box: !!Hm.doorBox, list: Hm.garageList().length }; });
    await ev(() => { const G = window.__G; G.camYaw = 0; MBD.setHour(11); MBD.sim(3, 1 / 30); });
    await shot('garagem-premios-trancada');
    R.g1 = await ev(async () => { const G = window.__G, P = MBD.ponte(); const v = __car(); P.go(); MBD.sim(5, 1 / 30); P.accept(); await new Promise(r => setTimeout(r, 1400)); MBD.sim(5, 1 / 30); P.lapStart = G.t - 410; P.lap = 1; P.prog = P.L * 0.96; P.onLine(G.t);
      return { vis: !document.getElementById('giftScreen').hidden, cars: document.querySelectorAll('#giftInfo .gList > div').length, saved: (G.save.giftCars || []).length }; });
    await shot('ponte-3-carros-presente');
    await page.click('#giftLater'); await sleep(300);
    R.g2 = await ev(async () => { const G = window.__G, Hm = MBD.home(), P = MBD.ponte(); if (P.on) P.end(false); const { HOME } = await import('/src/home.js'); P.noAuto = true; __onFoot(HOME.x + 36.6, HOME.z - 22); Hm.carsT = 0; for (let i = 0; i < 30 * 4; i++) MBD.sim(1, 1 / 30);
      const prize = Hm.cars.slice(3).map(c => c && c.v && { t: c.v.type, x: Math.round(c.v.x - HOME.x), z: Math.round(c.v.z - HOME.z) });
      return { door: +Hm.doorY.toFixed(2), box: !!Hm.doorBox, list: Hm.garageList().length, prize, toastNew: G.save.giftDoorNew === false }; });
    await ev(() => { const G = window.__G; G.camYaw = 0; G.camPitch = 0.1; MBD.sim(3, 1 / 30); });
    await shot('garagem-premios-aberta');
    R.g3 = await ev(() => { const G = window.__G, Hm = MBD.home(); const c = Hm.cars[4].v; const x0 = c.x, z0 = c.z; G.enterCar(c); MBD.input.stick = [0, 0.6]; for (let i = 0; i < 30 * 3; i++) MBD.sim(1, 1 / 30); MBD.input.stick = [0, 0]; const d = Math.hypot(c.x - x0, c.z - z0); c.vx = c.vz = c.vf = 0; MBD.sim(5, 1 / 30); return { type: c.type, moved: Math.round(d) }; });
    ck('garagem: trancada antes (porta fechada)', R.g0.door < 0.1 && R.g0.box && R.g0.list === 3, R.g0);
    ck('garagem: volta completa → 3 carros na tela', R.g1.vis && R.g1.cars === 3 && R.g1.saved === 3, R.g1);
    ck('garagem: porta abre e os 3 estão nas vagas', R.g2.door > 3 && !R.g2.box && R.g2.list === 6 && R.g2.prize.filter(Boolean).length === 3 && R.g2.prize.every(p => p && p.x > 28 && p.x < 45), R.g2);
    ck('garagem: dá para sair dirigindo', R.g3.moved > 8, R.g3);
  }

  if (want('rua')) {
    R.r1 = await ev(async () => { const G = window.__G, St = G.street; const Sm = await import('/src/street.js'); MBD.setHour(21.5); const v = __car(); const Rt = Sm.ROUTES[0];
      v.place(Rt.start[0] + 14, Rt.start[1] + 14, 0); v.vf = v.vx = v.vz = 0; for (let i = 0; i < 40; i++) MBD.sim(1, 1 / 30); St.promptT = 0; MBD.sim(2, 1 / 30);
      const tip = document.getElementById('stTip'); return { near: !!St.nearRival(50), vis: !tip.hidden, btns: tip.querySelectorAll('button').length, txt: tip.textContent.slice(0, 80) }; });
    R.rov = await ev((ids) => __box(ids, ['stTip', 'bNeutral']), UI);
    await shot('racha-convite');
    await page.click('#stTip button[data-k=no]'); await sleep(200);
    R.r2 = await ev(() => { const G = window.__G, St = G.street; St.promptT = 0; MBD.sim(3, 1 / 30); const h1 = document.getElementById('stTip').hidden; const v = G.player.vehicle; const x = v.x, z = v.z; v.place(x + 120, z, 0); St.promptT = 0; MBD.sim(3, 1 / 30); v.place(x, z, 0); St.promptT = 0; MBD.sim(3, 1 / 30); return { hiddenAfterNo: h1, back: !document.getElementById('stTip').hidden, race: !!St.race }; });
    await page.click('#stTip button[data-k=ok]'); await sleep(200);
    R.r3 = await ev(() => { const G = window.__G, St = G.street, S = St.race; if (!S) return { race: false }; const o = { race: true, racers: S.ais.length + 1 };
      MBD.neutral(true); o.neutralOn = MBD.isNeutral; for (let g = 0; g < 900 && S.t < -0.55; g++) MBD.sim(1, 1 / 30); o.tA = +S.t.toFixed(2); o.pausedA = G.paused; MBD.input.stick = [0, 1]; let rpmMax = 0; for (let g = 0; g < 300 && S.t < 0; g++) { MBD.sim(1, 1 / 30); rpmMax = Math.max(rpmMax, G.player.vehicle.rpm); } MBD.sim(1, 1 / 30);
      o.launch = S.launch; o.spd = +G.player.vehicle.speed.toFixed(1); o.neutralAfter = MBD.isNeutral; o.rpmMax = +rpmMax.toFixed(2);
      MBD.input.stick = [0, 0]; for (let i = 0; i < 30 * 30 && St.race; i++) MBD.sim(1, 1 / 30); o.chat = St.radio.log.length; o.chatEv = [...new Set(St.radio.log.map(l => l.evt))];
      if (St.race) St.end(false, 'teste'); return o; });
    await ev(() => { const el = document.getElementById('stRes'); if (el) el.hidden = true; });
    ck('racha: convite a 50 m com Aceitar/Recusar', R.r1.near && R.r1.vis && R.r1.btns === 2, R.r1);
    ck('racha: convite sem sobrepor', R.rov.ov.length === 0 && R.rov.off.length === 0, R.rov);
    ck('racha: Recusar some e volta ao reaproximar', R.r2.hiddenAfterNo && R.r2.back && !R.r2.race, R.r2);
    ck('racha: Aceitar começa com 5 corredores', R.r3.race && R.r3.racers === 5, R.r3);
    ck('racha: Neutro + largada perfeita', R.r3.neutralOn && R.r3.launch === 'perfect' && R.r3.spd > 9 && !R.r3.neutralAfter && R.r3.rpmMax > 0.6, R.r3);
    ck('racha: corredores conversam pelo rádio', R.r3.chat >= 2 && (R.r3.chatEv || []).some(e => /^st/.test(e)), { n: R.r3.chat, ev: R.r3.chatEv });
  }

  if (want('neutro')) {
    R.n = await ev(() => { const G = window.__G; const v = __car(); v.place(300, -150, Math.PI); v.vx = v.vz = v.vf = 0; MBD.sim(5, 1 / 30); const b = document.getElementById('bNeutral'); const touch = document.body.classList.contains('touch'); const o = { touch, vis: touch ? (!b.hidden && getComputedStyle(b).display !== 'none') : true };
      if (touch) b.click(); else window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' })); o.on = MBD.isNeutral && b.classList.contains('on'); MBD.input.stick = [0, 1]; for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); o.spdN = +v.speed.toFixed(2); o.rpmN = +v.rpm.toFixed(2);
      if (touch) b.click(); else { window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyZ', key: 'z' })); window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyZ', key: 'z' })); } o.off = !MBD.isNeutral; for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); o.spdD = +v.speed.toFixed(1); MBD.input.stick = [0, 0]; v.vx = v.vz = v.vf = 0; MBD.sim(3, 1 / 30);
      const Hc = G.heli; G.leaveCar(true); Hc.place(v.x + 20, v.z, 0); G.enterCar(Hc); MBD.sim(3, 1 / 30); o.heliHidden = touch ? b.hidden : !MBD.isNeutral; G.leaveCar(true); Hc.place(416, -200, -Math.PI / 2); return o; });
    ck('neutro: botão no carro, motor solto não anda', R.n.vis && R.n.on && R.n.spdN < 1 && R.n.rpmN > 0.6, R.n);
    ck('neutro: engatar volta a andar; some no helicóptero', R.n.off && R.n.spdD > 5 && R.n.heliHidden, R.n);
  }

  if (want('lancha')) {
    R.b1 = await ev(() => { const G = window.__G, B = MBD.boatRace(); MBD.setHour(15); const v0 = G.player.vehicle; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); } const v = B.parked[0]; v.place(-40, 372, Math.PI); MBD.teleport(-40, 365); G.enterCar(v); B.promptT = 0; B.declined = false; MBD.sim(3, 1 / 30);
      const tip = document.getElementById('boatTip'); return { bad: B.bad, tuned: v.tunedBoat && v.spec.max > 30, parked: B.parked.length, vis: !tip.hidden, btns: tip.querySelectorAll('button').length, lbl: document.body.classList.contains('touch') ? document.getElementById('bAct').textContent : 'Aceitar(desktop)' }; });
    R.bov = await ev((ids) => __box(ids, ['boatTip']), UI);
    await shot('lancha-convite');
    await page.click('#boatTip button[data-k=ok]'); await sleep(200);
    R.b2 = await ev(() => { const G = window.__G, B = MBD.boatRace(), R0 = B.race; if (!R0) return { race: false }; const o = { race: true, ais: R0.ais.length };
      for (let g = 0; g < 900 && R0.t < 0; g++) MBD.sim(1, 1 / 30); for (let i = 0; i < 30 * 20; i++) MBD.sim(1, 1 / 30); o.gaps = R0.ais.map(a => Math.round(a.s - R0.s0 - R0.prog)); o.hud = document.getElementById('boatHud').textContent;
      const m0 = MBD.state.money; R0.prog = 2 * B.L - 2; for (const a of R0.ais) a.s = R0.s0 + R0.prog - 50; MBD.sim(2, 1 / 30); o.ended = !B.race; o.last = B.last; o.dm = MBD.state.money - m0; o.hudHidden = document.getElementById('boatHud').hidden; return o; });
    await ev(() => { const G = window.__G, v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.teleport(300, -150, 0); MBD.sim(3, 1 / 30); });
    ck('lancha: traçado todo na água', R.b1.bad === 0, R.b1.bad);
    ck('lancha: lanchas tunadas paradas na largada', R.b1.tuned && R.b1.parked === 2, R.b1);
    ck('lancha: convite Aceitar/Recusar', R.b1.vis && R.b1.btns === 2 && /Aceitar/.test(R.b1.lbl), R.b1);
    ck('lancha: convite sem sobrepor', R.bov.ov.length === 0 && R.bov.off.length === 0, R.bov);
    ck('lancha: corrida com 3 rivais perto (elástico)', R.b2.race && R.b2.ais === 3 && R.b2.gaps.every(g => Math.abs(g) < 260), R.b2);
    ck('lancha: chegada → colocação e prêmio', R.b2.ended && R.b2.last && R.b2.last.place === 1 && R.b2.dm === 600 && R.b2.hudHidden, R.b2);
  }

  if (want('radio')) {
    R.rad = await ev(async () => { const P = MBD.ponte(), Rd = P.radio; Rd.idx = null; Rd.loading = null; await Rd.load();
      const L = await import('/src/radiolines.js'); const V = await import('/src/voice.js'); const bank = L.radioBank(); const miss = [];
      for (const [d, t] of bank) { const h = V.fnv(V.normLine(t)); if (!Rd.idx[d] || !Rd.idx[d][h]) miss.push(d + ':' + t.slice(0, 20)); }
      const cats = ['island', 'wildlife', 'pretty', 'carNice', 'posUp', 'win1', 'podium', 'stStart', 'stLead', 'stChase', 'stNitro', 'stTurn', 'stFinal', 'boatStart'].filter(e => !(L.RADIO[e] && L.RADIO[e].length >= 2));
      const city = bank.filter(([d, t]) => /Solara|Miami|Neon Distrito/i.test(t)).length;
      return { n: bank.length, missN: miss.length, miss: miss.slice(0, 5), cats, city }; });
    ck('rádio: todas as falas com mp3 (' + R.rad.n + ')', R.rad.missN === 0 && R.rad.n >= 140, R.rad);
    ck('rádio: categorias novas (ilha, posição, racha, lancha)', R.rad.cats.length === 0, R.rad.cats);
    ck('rádio: sem nome de cidade (serve aos dois jogos)', R.rad.city === 0, R.rad.city);
  }

  if (want('shots')) {
    await ev(() => { const G = window.__G, P = MBD.ponte(), I = MBD.ilhas(); MBD.setHour(17.8); const v = __car(); P.noAuto = true; const b = I.list.find(i => i.kind === 'atoll'); const p = P.loop.at(b.s - 120, 0); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vx = v.vz = v.vf = 0; G.player.x = p.x; G.player.z = p.z; G.camYaw = p.h + 0.5; G.camPitch = 0.1; MBD.sim(40, 1 / 30); G.camYaw = p.h + 0.5; });
    await shot('ilha-vista-da-ponte');
    await ev(() => { const G = window.__G, I = MBD.ilhas(); const b = I.list.find(i => i.kind === 'swamp'); const Hc = G.heli; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.setHour(10); Hc.place(b.x - b.R - 30, b.z + 10, Math.PI / 2); G.enterCar(Hc); Hc.y = 14; Hc.air = true; Hc.spool = 1; Hc.vx = Hc.vz = Hc.vy = 0; MBD.sim(40, 1 / 30); G.camYaw = Hc.h; G.camPitch = 0.25; MBD.sim(2, 1 / 30); });
    await shot('ilha-jacares-heli');
    await ev(() => { const G = window.__G, I = MBD.ilhas(); const b = I.list.find(i => !i.bridge && i.x < 0); const Hc = G.heli; Hc.x = b.x + b.R + 140; Hc.z = b.z + 40; Hc.y = 45; Hc.h = -Math.PI / 2; Hc.vx = Hc.vz = Hc.vy = 0; MBD.sim(30, 1 / 30); G.camYaw = Hc.h; G.camPitch = 0.2; MBD.sim(2, 1 / 30); });
    await shot('ilhas-distantes-barcos');
    await ev(() => { const G = window.__G, Hc = G.heli; Hc.vx = Hc.vz = Hc.vy = 0; Hc.y = 0.3; Hc.air = false; G.leaveCar(true); Hc.place(416, -200, -Math.PI / 2); MBD.sim(3, 1 / 30); });
  }

  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
