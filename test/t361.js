// Teste t361: helicóptero livre (ponte por cima e por baixo, limites macios, pouso), avião anfíbio (decola/pousa na água),
// ponte (HUD % e km, Desistir, carro presente), rádio animado. Uso: node test/t361.js W H q tag   (ONLY=heli,plane,ponte,radio)
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
  const shot = async (name) => { await sleep(600); await page.screenshot({ path: `${SH}${GAME}-${out}-${name}.png` }); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => { window.__ad = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }; });

  if (want('heli')) {
    R.heli = await ev(async () => {
      const G = window.__G, H = G.heli, inp = MBD.input, P = MBD.ponte(); const o = {}; MBD.setHour(11);
      let meshes = 0; H.root.traverse(c => { if (c.isMesh || c.isPoints) meshes++; }); o.meshes = meshes;
      // começa sobre o mar a oeste da ponte, baixo (5 m), e voa reto para leste atravessando o laço inteiro
      const L = P.loop; const p0 = L.at(2000, 0); const step = (n) => MBD.sim(n, 1 / 30);
      H.place(p0.x - 160, p0.z, Math.PI / 2); H.spool = 1; G.enterCar(H); inp.hb = true; step(20); inp.hb = false;
      // ajusta altitude ~5 m acima da água (abaixo do tabuleiro)
      H.y = 4.5; H.vy = 0; step(2); const x0 = H.x; let deckSnaps = 0, minY = 99, maxY = -99, stuckF = 0; let under = 0, over = 0;
      inp.stick = [0, 1];
      for (let i = 0; i < 30 * 40; i++) { const py = H.y; step(1); if (H.y - py > 2) deckSnaps++; minY = Math.min(minY, H.y); maxY = Math.max(maxY, H.y); if (H.speed < 2 && i > 90) stuckF++; if (P.onDeck(H.x, H.z)) { if (H.y < P.groundAt(H.x, H.z) - 1) under++; else over++; } }
      inp.stick = [0, 0]; o.low = { dist: Math.round(H.x - x0), deckSnaps, minY: +minY.toFixed(1), maxY: +maxY.toFixed(1), stuckF, under, over };
      // por cima da ponte: sobe a 40 m e cruza de volta; depois pousa no tabuleiro
      inp.hb = true; for (let i = 0; i < 300 && H.y < 45; i++) step(1); inp.hb = false; H.h = -Math.PI / 2; H.vx = H.vz = 0; step(10);
      const x1 = H.x; inp.stick = [0, 1]; let stuck2 = 0; for (let i = 0; i < 30 * 30; i++) { step(1); if (H.speed < 2 && i > 90) stuck2++; } inp.stick = [0, 0];
      o.high = { dist: Math.round(x1 - H.x), stuck2, y: Math.round(H.y) };
      // pousar no tabuleiro
      const pd = L.at(3000, 0); H.x = pd.x; H.z = pd.z; H.y = pd.y + 25; H.vx = H.vz = H.vy = 0; step(5); inp.down = true; for (let i = 0; i < 400 && H.air; i++) step(1); inp.down = false; step(30);
      o.deckLand = { air: H.air, y: +H.y.toFixed(1), deck: +P.groundAt(H.x, H.z).toFixed(1), speed: +H.speed.toFixed(1) };
      // decola do tabuleiro e passa por BAIXO (desce até a água fora da ponte e entra por baixo)
      inp.hb = true; step(40); inp.hb = false;
      // limites macios: longe a leste
      H.x = 2150; H.z = 0; H.y = 80; H.vx = 40; H.vz = 0; H.h = Math.PI / 2; let maxX = H.x; for (let i = 0; i < 30 * 15; i++) { step(1); maxX = Math.max(maxX, H.x); } o.bounds = { maxX: Math.round(maxX), endX: Math.round(H.x), vx: +H.vx.toFixed(1), outside: !!H.outside };
      // teto
      H.x = 0; H.z = 0; H.y = 400; H.vy = 0; inp.hb = true; step(30 * 10); inp.hb = false; o.ceil = Math.round(H.y);
      // prédio: não atravessa
      return o; });
    const h = R.heli; console.log(JSON.stringify(h));
    ck('heli model mesh budget', h.meshes <= 34, h.meshes);
    ck('heli low over sea crosses bridge (passes under, no snap, no stop)', h.low.dist > 700 && h.low.deckSnaps === 0 && h.low.stuckF < 15, h.low);
    ck('heli high over bridge free', h.high.dist > 600 && h.high.stuck2 < 15, h.high);
    ck('heli lands on deck', !h.deckLand.air && Math.abs(h.deckLand.y - h.deckLand.deck) < 0.5, h.deckLand);
    ck('heli soft bounds (no wall, pushed back)', h.bounds.maxX <= 2360 && h.bounds.vx < 0 && h.bounds.endX < 2300, h.bounds);
    ck('heli ceiling', h.ceil <= 450, h.ceil);
  }
  if (want('plane')) {
    R.plane = await ev(async () => {
      const G = window.__G, A = G.plane, inp = MBD.input; const o = {}; MBD.setHour(16); const step = (n) => MBD.sim(n, 1 / 30);
      if (G.player.vehicle) G.leaveCar(true);
      let meshes = 0; A.root.traverse(c => { if (c.isMesh || c.isPoints || c.isSprite) meshes++; }); o.meshes = meshes;
      G.callPlane(); await new Promise(r => setTimeout(r, 1200)); step(10); o.nearAfterCall = MBD.nearestVehicle(); o.pp = [Math.round(G.player.x), Math.round(G.player.z), Math.round(A.x), Math.round(A.z)];
      MBD.action(); o.inPlane = G.player.vehicle === A; step(5);
      // corrida na água + puxar
      inp.hb = true; let t = 0, toT = null, maxSp = 0; for (let i = 0; i < 30 * 30; i++) { step(1); t += 1 / 30; maxSp = Math.max(maxSp, A.airspeed); if (A.airspeed > 27) inp.stick = [0, 0.6]; if (A.air && toT == null) toT = { t: +t.toFixed(1), v: Math.round(A.airspeed * 3.6), dist: Math.round(Math.hypot(A.x - (-18), A.z - 300)) }; if (A.y > 60) break; }
      inp.stick = [0, 0]; o.takeoff = { toT, y: Math.round(A.y), air: A.air };
      // cruzeiro solto: deve manter altitude aproximada
      const y0 = A.y; step(30 * 8); o.cruise = { dy: Math.round(A.y - y0), v: Math.round(A.airspeed * 3.6), pitch: +A.pitch.toFixed(2) };
      // curva à direita
      const h0 = A.h; inp.stick = [0.8, 0]; step(30 * 4); o.turn = { dh: +window.__ad(h0, A.h).toFixed(2), roll: +A.roll.toFixed(2) }; inp.stick = [0, 0]; step(30 * 4); o.turn.rollAfter = +A.roll.toFixed(2);
      // estol: manete zero e puxa até o fim — assistido não deixa cair como pedra
      inp.hb = false; inp.down = true; inp.stick = [0, 1]; let minVy = 0, stallSeen = false; for (let i = 0; i < 30 * 12; i++) { step(1); minVy = Math.min(minVy, A.vy); if (A.stall) stallSeen = true; } inp.down = false; inp.stick = [0, 0];
      o.stall = { minVy: +minVy.toFixed(1), stallSeen, v: Math.round(A.airspeed * 3.6), aoa: +A.aoa.toFixed(2) };
      // recupera e pousa na água: manete 30%, desce suave
      inp.hb = true; step(30 * 4); inp.hb = false; A.thr = 0.35; A.x = -60; A.z = -100; A.y = 40; A.h = Math.PI; const vv = 34; A.vx = Math.sin(A.h) * vv; A.vz = Math.cos(A.h) * vv; A.vy = 0; A.pitch = 0; A.roll = 0;
      let touch = null; for (let i = 0; i < 30 * 90; i++) { const alt = A.y - A.floorAt(A.x, A.z, A.y); if (!touch) { const tv = alt > 12 ? -4 : alt > 4 ? -2 : -0.8; inp.stick = [0, Math.max(-1, Math.min(1, (tv - A.vy) * 0.35))]; A.thr = alt > 4 ? 0.35 : 0.15; } else { inp.stick = [0, 0]; inp.down = true; } const vyb = A.vy; step(1); if (!touch && A.y - A.floorAt(A.x, A.z, A.y) < 0.05) touch = { vy: +vyb.toFixed(1), hard: A.hardT > 0, v: Math.round(A.airspeed * 3.6) }; if (touch && A.speed < 0.5) break; }
      inp.down = false; inp.stick = [0, 0]; o.land = { touch, speed: +A.speed.toFixed(1), onWater: A.onWater, air: A.air };
      // sair na água longe do píer: não deixa; volta ao hidroporto e sai
      MBD.action(); o.exitWater = G.player.vehicle === A;
      G.callPlane(); await new Promise(r => setTimeout(r, 1300)); MBD.sim(5, 1 / 30); MBD.action(); MBD.sim(5, 1 / 30); o.backExit = { onFoot: !G.player.vehicle, onPier: Math.abs(G.player.z - 300) < 4 && G.player.x > -10 };
      return o; });
    const p = R.plane; console.log(JSON.stringify(p));
    ck('plane call → near hidroporto', p.nearAfterCall === 'plane', p.nearAfterCall);
    ck('plane enter', p.inPlane);
    ck('plane takeoff from water', p.takeoff.toT && p.takeoff.toT.v > 70 && p.takeoff.toT.v < 140 && p.takeoff.y > 50, p.takeoff);
    ck('plane cruise hands-off holds', Math.abs(p.cruise.dy) < 40 && p.cruise.v > 120, p.cruise);
    ck('plane coordinated turn', p.turn.dh < -0.5 && p.turn.roll > 0.3 && Math.abs(p.turn.rollAfter) < 0.12, p.turn);
    ck('plane soft stall', p.stall.minVy > -16, p.stall);
    ck('plane exit blocked far on water, ✈️ returns to pier + exit', p.exitWater && p.backExit.onFoot && p.backExit.onPier, p.backExit);
    ck('plane water landing (soft)', p.land.touch && !p.land.touch.hard && p.land.touch.vy > -3.2 && !p.land.air && p.land.onWater && p.land.speed < 1, p.land);
  }
  if (want('ponte')) {
    await ev(async () => { const G = window.__G; if (G.player.vehicle && G.player.vehicle.spec.air) { G.player.vehicle.vx = G.player.vehicle.vz = 0; } if (G.player.vehicle) G.leaveCar(true); if (G.plane && !G.plane.driver) G.plane.place(-16.5, 300, Math.PI); G.heli.vx = G.heli.vz = G.heli.vy = 0; MBD.teleport(312, -150, Math.PI); MBD.sim(5, 1 / 30); MBD.setHour(20.5);
      const P = MBD.ponte(); MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30);
      P.go(); MBD.sim(5, 1 / 30); P.accept(); await new Promise(r => setTimeout(r, 1400)); MBD.sim(5, 1 / 30); });
    R.p1 = await ev(async () => { const G = window.__G, P = MBD.ponte(), inp = MBD.input, v = G.player.vehicle; const o = { on: P.on, type: v && v.type };
      inp.stick = [0, 0.8]; for (let i = 0; i < 30 * 8; i++) MBD.sim(1, 1 / 30); inp.stick = [0, 0]; MBD.sim(2, 1 / 30);
      P.lapStart = P.lapStart || G.t - 20; P.lap = P.lap || 1; P.prog = Math.max(P.prog, P.L * 0.37); P.hud(true);
      const hud = document.getElementById('ponteHud').textContent; o.hud = hud; o.pct = /\d+%/.test(hud); o.km = /\d+,\d km/.test(hud); o.odo = +(P.odo || 0).toFixed(0); o.progress = +P.progress().toFixed(2);
      const qb = document.getElementById('ponteQuit'); o.quitVis = !qb.hidden && getComputedStyle(qb).display !== 'none';
      const ids = ['ponteHud', 'radioSub', 'ponteQuit', 'topR', 'speedo', 'mapw', 'driftW', 'nitroW', 'bAct', 'bJump', 'bDown', 'bNitro', 'bBrake', 'bHand', 'drvL', 'drvR', 'quick', 'stick', 'compass', 'objective', 'hudTop', 'money', 'clock', 'serpHud'];
      const sub = document.getElementById('radioSub'); sub.hidden = false; sub.innerHTML = '<b>📻 Tchê Trovão</b><span>Bah, que top teu drift! Até as gaivotas aplaudiram!</span>'; P.radio.place();
      const box = []; for (const el of document.querySelectorAll('body *')) { if (!el.id || !ids.includes(el.id)) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; box.push({ id: el.id, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
      const ov = []; for (const a of box) if (['ponteHud', 'radioSub', 'ponteQuit'].includes(a.id)) for (const b of box) { if (a === b) continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(a.id + '×' + b.id); }
      o.ov = [...new Set(ov)]; o.off = box.filter(b => ['ponteHud', 'radioSub', 'ponteQuit'].includes(b.id) && (b.r[0] < 0 || b.r[2] > innerWidth || b.r[3] > innerHeight)).map(b => b.id); return o; });
    await shot('ponte-hud-desistir');
    // Desistir pelo botão (toque/clique de verdade)
    await page.click('#ponteQuit'); await sleep(1500);
    R.p2 = await ev(() => { const G = window.__G, P = MBD.ponte(); MBD.sim(30, 1 / 30); const v = G.player.vehicle; const l = P.loop.locate(v.x, v.z); return { on: P.on, quitHidden: document.getElementById('ponteQuit').hidden, hudHidden: document.getElementById('ponteHud').hidden || !P.on, onLoop: !!(l && l.d < 40 && Math.abs(l.lat) < 12), quits: P.quits, canAccept: P.canAccept() }; });
    // volta completa → presente
    await ev(async () => { const G = window.__G, P = MBD.ponte(); localStorage.removeItem('x'); G.save.giftCar = null; P.accept(); await new Promise(r => setTimeout(r, 1400)); MBD.sim(5, 1 / 30); P.lapStart = G.t - 410; P.lap = 1; P.prog = P.L * 0.96; P.onLine(G.t); });
    await sleep(500);
    R.p3 = await ev(() => { const G = window.__G; const el = document.getElementById('giftScreen'); return { giftVis: !el.hidden, paused: G.paused, txt: document.getElementById('giftInfo').textContent.slice(0, 80), saved: !!G.save.giftCar }; });
    await shot('ponte-presente-tela');
    await page.click('#giftDrive'); await sleep(400);
    R.p4 = await ev(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; G.persist(); let ls = null; try { ls = JSON.parse(localStorage.getItem(G.SAVE_KEY)).giftCar; } catch (e) { } const o = { type: v && v.type, gift: !!(v && v.gift), glow: !!(v && v.tune && v.tune.glow), paused: G.paused, ls: !!(ls && ls.type === 'rc_hyper'), homeList: G.home.garageList().length };
      v.vx = v.vz = v.vf = 0; G.camYaw = v.h + 2.4; G.camPitch = 0.12; MBD.sim(3, 1 / 30); G.camYaw = v.h + 2.4; return o; });
    await shot('ponte-carro-presente');
    await ev(() => { const P = MBD.ponte(); if (P.on) P.end(false); });
    ck('ponte session on', R.p1.on, R.p1);
    ck('ponte HUD % + km rodados', R.p1.pct && R.p1.km && R.p1.odo > 50 && R.p1.progress > 0.1, R.p1);
    ck('ponte Desistir visível sem sobrepor', R.p1.quitVis && R.p1.ov.length === 0 && R.p1.off.length === 0, { ov: R.p1.ov, off: R.p1.off });
    ck('ponte Desistir encerra e volta à rampa', !R.p2.on && R.p2.quitHidden && !R.p2.onLoop && R.p2.quits === 1, R.p2);
    ck('ponte presente: tela', R.p3.giftVis && R.p3.paused && R.p3.saved, R.p3);
    ck('ponte presente: dirigir + salvo', R.p4.type === 'rc_hyper' && R.p4.gift && R.p4.glow && !R.p4.paused && R.p4.ls && R.p4.homeList === 4, R.p4);
  }
  if (want('radio')) {
    R.radio = await ev(async () => { const G = window.__G, P = MBD.ponte(), Rd = P.radio; Rd.idx = null; Rd.loading = null; await Rd.load();
      const L = await import('/src/radiolines.js'); const V = await import('/src/voice.js'); const bank = L.radioBank(); const miss = [];
      for (const [d, t] of bank) { const h = V.fnv(V.normLine(t)); if (!Rd.idx[d] || !Rd.idx[d][h]) miss.push(d + ':' + t.slice(0, 20)); }
      const rates = Object.values(L.RADIO_VOICES).map(v => v.rate); const evs = ['nitro', 'crash', 'heli', 'gift', 'playerPass', 'aiPass', 'finish', 'playerDrift'].filter(e => !(L.RADIO[e] && L.RADIO[e].length >= 3));
      const bah = (L.RADIO.playerDrift || []).some(x => /Bah, que top teu drift/.test(x[1]));
      Rd.reset(); Rd.say('nitro', null, 0, true); let sub = ''; for (let i = 0; i < 200; i++) { MBD.sim(1, 1 / 30); await new Promise(z => setTimeout(z, 10)); const el = document.getElementById('radioSub'); if (!el.hidden) { sub = el.textContent; break; } }
      return { n: bank.length, missN: miss.length, miss: miss.slice(0, 5), minRate: Math.min(...rates), evs, bah, sub }; });
    ck('radio all lines have mp3', R.radio.missN === 0, R.radio);
    ck('radio voices energetic (rate>1, varied)', R.radio.minRate > 1, R.radio.minRate);
    ck('radio new events', R.radio.evs.length === 0 && R.radio.bah, R.radio);
    ck('radio subtitle shows', R.radio.sub.length > 5, R.radio.sub);
  }
  if (want('shots')) {
    // fotos: helicóptero de perto (heliponto), pairando sobre a água (lavagem do rotor), sobre a ponte, por baixo da ponte; avião no píer e voando
    await ev(async () => { const G = window.__G, H = G.heli; if (G.player.vehicle) G.leaveCar(true); MBD.setHour(10.5); const { HELIPAD } = await import('/src/heli.js'); H.place(HELIPAD.x, HELIPAD.z, -Math.PI / 2); H.spool = 0; G.enterCar(H); MBD.sim(3, 1 / 30); G.camYaw = H.h + 2.3; G.camPitch = 0.12; MBD.sim(1, 1 / 30); G.camYaw = H.h + 2.3; });
    await shot('heli-modelo');
    await ev(() => { const G = window.__G, H = G.heli, inp = MBD.input; H.spool = 1; inp.hb = true; MBD.sim(45, 1 / 30); inp.hb = false; H.vy = 0; MBD.sim(40, 1 / 30); G.camYaw = H.h + 2.6; G.camPitch = 0.15; MBD.sim(2, 1 / 30); G.camYaw = H.h + 2.6; });
    await shot('heli-lavagem-rotor');
    await ev(() => { const G = window.__G, H = G.heli, P = MBD.ponte(); MBD.setHour(17.6); const p = P.loop.at(2600, 0); H.x = p.x; H.z = p.z; H.y = p.y + 30; H.h = p.h; H.vx = Math.sin(p.h) * 20; H.vz = Math.cos(p.h) * 20; H.vy = 0; MBD.sim(20, 1 / 30); G.camYaw = H.h + 0.5; G.camPitch = 0.28; MBD.sim(2, 1 / 30); });
    await shot('heli-sobre-ponte');
    await ev(() => { const G = window.__G, H = G.heli, P = MBD.ponte(); const p = P.loop.at(2600, 0); H.x = p.x - Math.cos(p.h) * 60; H.z = p.z + Math.sin(p.h) * 60; H.y = 3.5; H.h = p.h + Math.PI / 2; H.vx = Math.sin(H.h) * 12; H.vz = Math.cos(H.h) * 12; H.vy = 0; for (let i = 0; i < 300; i++) { MBD.sim(1, 1 / 30); if (P.onDeck(H.x, H.z)) break; } G.camYaw = H.h; G.camPitch = 0.05; MBD.sim(3, 1 / 30); window.__under = { y: +H.y.toFixed(1), deck: +P.groundAt(H.x, H.z).toFixed(1) }; });
    await shot('heli-por-baixo-da-ponte'); console.log('under', JSON.stringify(await ev(() => window.__under)));
    await ev(async () => { const G = window.__G, H = G.heli; G.heli.vx = G.heli.vz = 0; G.leaveCar(true); MBD.setHour(9.5); G.callPlane(); await new Promise(r => setTimeout(r, 1200)); MBD.sim(5, 1 / 30); G.camYaw = -2.2; G.camPitch = 0.14; MBD.sim(2, 1 / 30); });
    await shot('aviao-hidroporto');
    await ev(() => { const G = window.__G, A = G.plane; MBD.action(); MBD.sim(3, 1 / 30); const inp = MBD.input; inp.hb = true; for (let i = 0; i < 30 * 5; i++) MBD.sim(1, 1 / 30); G.camYaw = A.h + 0.6; G.camPitch = 0.12; MBD.sim(2, 1 / 30); });
    await shot('aviao-decolando-agua');
    await ev(() => { const G = window.__G, A = G.plane, inp = MBD.input; for (let i = 0; i < 30 * 12; i++) { if (A.airspeed > 27) inp.stick = [0, 0.6]; MBD.sim(1, 1 / 30); if (A.y > 90) break; } inp.stick = [0.6, 0]; MBD.sim(40, 1 / 30); inp.stick = [0, 0]; G.camYaw = A.h + 0.35; MBD.sim(2, 1 / 30); });
    await shot('aviao-voando');
    await ev(() => { const G = window.__G, A = G.plane, inp = MBD.input; inp.hb = false; A.x = 600; A.z = 300; A.h = Math.PI / 2; A.y = 60; MBD.sim(30, 1 / 30); G.camYaw = A.h - 0.4; MBD.sim(2, 1 / 30); });
    await shot('aviao-cidade-ponte');
    await ev(() => { const G = window.__G, A = G.plane; A.x = -16.5; A.z = 300; A.place(-16.5, 300, Math.PI); MBD.sim(3, 1 / 30); G.leaveCar(true); });
  }
  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
