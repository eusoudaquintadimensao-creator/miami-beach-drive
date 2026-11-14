// Teste t331: drift longo + pêndulo, nitro 8 estágios, motor (velocidade final), faróis/lanternas à noite,
// botão chamar→entrar (carro 5 m à frente), LED nas palmeiras, lojas no térreo, layout sem sobreposição, 0 erros.
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const PORT = process.env.PORT || 8765;
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600;
const SH = process.env.SHOTS || '/workspace/miami-mundo-aberto/screenshots/';
const KEY = process.env.KEYP || 'mbd';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SH, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = []; const R = {}; const ck = (n, ok, info) => { if (!ok) fail.push(n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  // no celular a direção vem do DriveUI (toque/inclinar/volante); o teste injeta o "dedo" pelo mesmo caminho
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });

  // 1) botão: 1º toque chama (para ~5 m à frente), o próximo toque entra; toque de novo sai
  R.btn = await page.evaluate(async () => {
    const G = window.__G, p = G.player; MBD.setHour(18.8);
    if (p.vehicle) MBD.leaveCar(true);
    // rua longa da cidade: personagem no meio da via, olhando ao longo dela
    const W = await import('/src/world.js'); const segs = W.SEGS.filter(s => s.kind === 'city' && s.len > 140 && Math.abs((s.a.x + s.b.x) / 2) < 260 && Math.abs((s.a.z + s.b.z) / 2) < 500);
    const sg = segs[Math.floor(segs.length / 2)] || W.SEGS[0]; const mx = (sg.a.x + sg.b.x) / 2, mz = (sg.a.z + sg.b.z) / 2; const hh = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z);
    window.__T = { X: mx, Z: mz, H: hh };
    MBD.teleport(mx, mz, hh); MBD.sim(5, 1 / 30);
    const o = { p: [p.x, p.z, p.h] };
    o.lbl0 = document.getElementById('bAct').textContent;
    MBD.onActTap(1); o.call = !!G.carCall; o.lbl1 = (MBD.sim(2, 1 / 30), document.getElementById('bAct').textContent);
    // espera chegar
    for (let i = 0; i < 90 && G.carCall; i++) MBD.sim(1, 1 / 30);
    const v = G.sigCar; o.arrived = !G.carCall && !!v;
    if (v) { const dx = v.x - p.x, dz = v.z - p.z; o.dist = +Math.hypot(dx, dz).toFixed(2); o.front = +((dx * Math.sin(p.h) + dz * Math.cos(p.h)) / Math.max(0.01, o.dist)).toFixed(2); }
    o.lbl2 = document.getElementById('bAct').textContent;
    return o;
  });
  await page.evaluate(() => { const G = window.__G; G.camYaw = G.player.h; G.camPitch = 0.22; G.snapCam && G.snapCam(); MBD.sim(2, 1 / 30); });
  await sleep(1200); await page.screenshot({ path: `${SH}mech-${out}-chegou.png` });
  R.btn2 = await page.evaluate(() => { const G = window.__G, p = G.player; MBD.onActTap(1); const inCar = p.vehicle === G.sigCar && !!p.vehicle; MBD.sim(3, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return { inCar, outAfter: !p.vehicle }; });
  ck('chamou o carro no 1º toque', R.btn.call, R.btn);
  ck('carro chegou', R.btn.arrived, R.btn);
  ck('carro ~5 m à frente', R.btn.dist >= 3.8 && R.btn.dist <= 7.2 && R.btn.front > 0.5, R.btn);
  ck('2º toque entra (sem toque duplo)', R.btn2.inCar, R.btn2);
  ck('toque no carro sai', R.btn2.outAfter, R.btn2);
  if (mobile) ck('rótulo Entrar depois de chamar', /Entrar/.test(R.btn.lbl2), R.btn);

  // 2) drift longo pelo deslize/tecla, segurando o acelerador; depois vira para o outro lado = pêndulo
  R.drift = await page.evaluate(async (mobile) => {
    const G = window.__G, p = G.player; MBD.setHour(16.5);
    const v = G.sigCar; if (!p.vehicle) MBD.enterCar(v);
    const { X, Z, H } = window.__T; const hold = () => { v.x = X; v.z = Z; };
    v.place(X, Z, H); v.vx = Math.sin(v.h) * 24; v.vz = Math.cos(v.h) * 24; v.vf = 24;
    const inp = MBD.input; inp.stick = [0.55, 1];
    if (mobile) MBD.drive().fireDrift(); else inp.kick = true;
    let tOn = 0, maxAng = 0, chained = false, tAfterFlip = 0, flipped = false;
    for (let i = 0; i < 60 * 9; i++) {
      if (i === 60 * 3) { inp.stick = [-0.85, 1]; }
      if (i === 60 * 3 + 30) { inp.stick = [-0.5, 1]; }
      MBD.sim(1, 1 / 60); hold();
      if (v.drifting && v.swD) { tOn += 1 / 60; maxAng = Math.max(maxAng, v.driftAng || 0); if (flipped) tAfterFlip += 1 / 60; }
      if (v.dChain > 0 && !flipped) { flipped = true; chained = true; }
      if (!v.drifting && i > 30) break;
    }
    inp.stick = null; const o = { tOn: +tOn.toFixed(2), maxAngDeg: Math.round(maxAng * 57.3), chained, tAfterFlip: +tAfterFlip.toFixed(2), dLast: v.dLast, speed: +v.speed.toFixed(1) };
    return o;
  }, mobile);
  ck('drift longo (> 3 s segurando acelerador)', R.drift.tOn > 3, R.drift);
  ck('pêndulo encadeia para o outro lado', R.drift.chained && R.drift.tAfterFlip > 1, R.drift);
  ck('ângulo de drift sustentado', R.drift.maxAngDeg > 18, R.drift);
  // comparação: drift antigo (só freio de mão 0,7 s) — guardamos para o relatório
  // foto: drift com fumaça e medidor
  await page.evaluate((mobile) => {
    const G = window.__G, v = G.sigCar; MBD.setHour(17.2); v.drifting = false; v.swD = false;
    v.place(__T.X, __T.Z, __T.H); v.vx = Math.sin(v.h) * 22; v.vz = Math.cos(v.h) * 22; v.vf = 22;
    const inp = MBD.input; inp.stick = [0.6, 1]; if (mobile) MBD.drive().fireDrift(); else inp.kick = true;
    for (let i = 0; i < 80; i++) { MBD.sim(1, 1 / 60); v.x = __T.X; v.z = __T.Z; }
    G.camYaw = v.h + 2.4; G.camPitch = 0.2; G.snapCam && G.snapCam();
    const d = document.getElementById('driftW'); const r = d.getBoundingClientRect(); window.__dh = { shown: !d.hidden && r.width > 0, txt: d.textContent, drifting: v.drifting };
  }, mobile);
  await page.screenshot({ path: `${SH}mech-${out}-drift.png` });
  R.driftHud = await page.evaluate(() => window.__dh);
  await page.evaluate(() => { MBD.input.stick = null; for (let i = 0; i < 200 && window.__G.sigCar.drifting; i++) { MBD.sim(1, 1 / 60); window.__G.sigCar.x = __T.X; window.__G.sigCar.z = __T.Z; } });
  ck('medidor de drift aparece', R.driftHud.shown, R.driftHud);

  // 3) nitro de 8 estágios + motor preparado (velocidade final)
  R.nitro = await page.evaluate(() => {
    const G = window.__G, v = G.sigCar, inp = MBD.input; const o = { segs: document.querySelectorAll('#nitroW .nSegs i').length, tuned: !!v.tune };
    const run = (lvl, nitro, secs) => { MBD.MOTOR.lvl = lvl; v.place(__T.X, __T.Z, __T.H); v.nitro = 1; inp.stick = [0, 1]; inp.nitro = nitro; let st = 0, top = 0;
      for (let i = 0; i < 60 * secs; i++) { MBD.sim(1, 1 / 60); v.x = __T.X; v.z = __T.Z; st = Math.max(st, v.nStage || 0); top = Math.max(top, v.speed); if (nitro) v.nitro = Math.max(v.nitro, 0.5); }
      inp.nitro = false; inp.stick = null; return { st, top: +top.toFixed(1) }; };
    o.base = run(0, false, 22); o.motor3 = run(3, false, 22); o.n = run(0, true, 6); MBD.MOTOR.lvl = 0;
    o.spec = v.spec.max; return o;
  });
  ck('HUD de nitro com 8 segmentos', R.nitro.segs === 8, R.nitro);
  ck('nitro chega ao estágio 8', R.nitro.n.st === 8, R.nitro);
  ck('motor +3 aumenta velocidade final (>15%)', R.nitro.motor3.top > R.nitro.base.top * 1.15, R.nitro);
  // foto do HUD de nitro
  await page.evaluate(() => { const G = window.__G, v = G.sigCar, inp = MBD.input; MBD.setHour(20.5); v.place(__T.X, __T.Z, __T.H); v.nitro = 1; inp.stick = [0, 1]; inp.nitro = true; for (let i = 0; i < 60 * 3.4; i++) { MBD.sim(1, 1 / 60); v.x = __T.X; v.z = __T.Z; } G.camYaw = v.h; G.camPitch = 0.1; G.snapCam && G.snapCam(); });
  await sleep(150); await page.screenshot({ path: `${SH}mech-${out}-nitro.png` });
  await page.evaluate(() => { MBD.input.nitro = false; MBD.input.stick = null; const v = window.__G.sigCar; v.vx = v.vz = v.vf = 0; MBD.sim(10, 1 / 60); });

  // 4) noite: farol potente (baixo/alto) e lanternas acesas (jogador e IA)
  R.lights = await page.evaluate(() => {
    const G = window.__G, v = G.sigCar; MBD.setHour(22.5);
    // um carro do trânsito parado logo à frente (para medir a lanterna da IA)
    const ai0 = G.traffic.cars.find(c => c.active && c.type !== 'moto');
    MBD.sim(4, 1 / 30); if (ai0) { v.place(ai0.x - Math.sin(ai0.h) * 22, ai0.z - Math.cos(ai0.h) * 22, ai0.h); MBD.sim(3, 1 / 30); } const d = MBD.drive();
    const o = {}; d.highBeam = false; MBD.sim(2, 1 / 30); o.low = v.spot ? { i: Math.round(v.spot.intensity), dist: v.spot.distance } : null;
    d.highBeam = true; MBD.sim(2, 1 / 30); o.high = v.spot ? { i: Math.round(v.spot.intensity), dist: v.spot.distance } : null;
    o.tail = v.tailGlow ? { vis: v.tailGlow.visible, op: +v._tgM.opacity.toFixed(2) } : null;
    const ai = G.traffic.cars.filter(c => c.active && c.tailGlow && c.tailGlow.visible); o.aiTail = ai.length; o.aiOp = ai.length ? +ai[0]._tgM.opacity.toFixed(2) : 0;
    return o;
  });
  ck('farol baixo forte', R.lights.low && R.lights.low.i >= 120 && R.lights.low.dist >= 100, R.lights);
  ck('farol alto alcança longe', R.lights.high && R.lights.high.i >= 450 && R.lights.high.dist >= 200, R.lights);
  ck('lanterna do jogador acesa à noite', R.lights.tail && R.lights.tail.vis && R.lights.tail.op >= 0.5, R.lights);
  ck('lanternas da IA acesas à noite', R.lights.aiTail >= 1, R.lights);
  await page.evaluate(() => { const G = window.__G, v = G.sigCar; v.place(__T.X, __T.Z, __T.H); G.camYaw = v.h; G.camPitch = 0.12; G.snapCam && G.snapCam(); MBD.sim(4, 1 / 30); });
  await sleep(1200); await page.screenshot({ path: `${SH}mech-${out}-farol.png` });
  // lanternas: câmera à frente olhando para trás do carro, IA perto
  await page.evaluate(() => { const G = window.__G, v = G.sigCar; G.camYaw = v.h + Math.PI; G.camPitch = 0.12; G.snapCam && G.snapCam(); v.brakeOn = true; MBD.sim(2, 1 / 30); });
  await sleep(1200); await page.screenshot({ path: `${SH}mech-${out}-lanternas.png` });

  // 5) palmeiras com LED e lojas no térreo
  R.city = await page.evaluate(() => {
    const G = window.__G, S = G.world; let shopMeshes = 0, shopTris = 0; G.scene.traverse(o => { if (o.isMesh && o.material === S.M.shop) { shopMeshes++; shopTris += o.geometry.index ? o.geometry.index.count / 3 : o.geometry.attributes.position.count / 3; } });
    return { led: S.palmLed ? S.palmLed.count : 0, shopMeshes, shopTris: Math.round(shopTris), signMeshes: (() => { let n = 0; G.scene.traverse(o => { if (o.isMesh && o.material === S.M.shopSign) n++; }); return n; })() };
  });
  ck('palmeiras com LED', R.city.led > 60, R.city);
  ck('lojas/portas no térreo', R.city.shopMeshes > 3 && R.city.shopTris > 400, R.city);
  ck('letreiros de loja', R.city.signMeshes > 1, R.city);
  await page.evaluate(() => { const G = window.__G; if (G.player.vehicle) MBD.leaveCar(true); MBD.setHour(21.4); MBD.teleport(312, -40, Math.PI * 0.18); G.camYaw = Math.PI * 0.18 + 0.5; G.camPitch = 0.05; G.snapCam && G.snapCam(); MBD.sim(6, 1 / 30); });
  await sleep(1500); await page.screenshot({ path: `${SH}mech-${out}-palmeiras.png` });
  await page.evaluate(() => { const G = window.__G; MBD.setHour(20.6); MBD.teleport(318, 30, -Math.PI / 2 - 0.35); G.camYaw = -Math.PI / 2 - 0.35; G.camPitch = 0.02; G.snapCam && G.snapCam(); MBD.sim(6, 1 / 30); });
  await sleep(1500); await page.screenshot({ path: `${SH}mech-${out}-lojas.png` });

  // 6) layout no carro (celular): nitro e drift sem cobrir nada
  if (mobile) {
    R.layout = await page.evaluate(async () => {
      const G = window.__G, v = G.sigCar; MBD.enterCar(v); document.body.classList.add('driving', 'touch'); MBD.drive().setDriving(true, v); MBD.sim(3, 1 / 30);
      await new Promise(r => setTimeout(r, 700)); // o HUD real decide se o nitro aparece (sem forçar)
      document.getElementById('driftW').hidden = false;
      const r = id => { const e = document.getElementById(id); if (!e || e.hidden) return null; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') return null; const b = e.getBoundingClientRect(); return b.width ? b : null; };
      const mine = ['nitroW', 'driftW'].map(id => [id, r(id)]); const others = ['drvRight', 'drvCruise', 'drvGear', 'bAct', 'mapw', 'topR', 'icons', 'drvBrake', 'drvRev', 'drvBeam', 'drvWheel'].map(id => [id, r(id)]).filter(x => x[1]);
      const hit = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2;
      const hits = []; for (const [a, ra] of mine) { if (!ra) { hits.push(a + ' invisível'); continue; } for (const [b, rb] of others) if (hit(ra, rb)) hits.push(a + '×' + b); if (ra.left < 0 || ra.right > innerWidth || ra.bottom > innerHeight) hits.push(a + ' fora da tela'); }
      if (hit(mine[0][1], mine[1][1])) hits.push('nitro×drift');
      return { hits, n: mine.map(([id, b]) => [id, b && [b.left | 0, b.top | 0, b.right | 0, b.bottom | 0]]) };
    });
    ck('HUD nitro/drift sem sobreposição', R.layout.hits.length === 0, R.layout);
    await page.evaluate(() => { document.getElementById('driftW').hidden = true; });
  }
  R.errs = errs.filter(e => !/favicon/.test(e));
  ck('0 erros de console', R.errs.length === 0, R.errs);
  fs.writeFileSync(`${SH}mech-${out}.json`, JSON.stringify({ fail, R }, null, 1));
  console.log(JSON.stringify({ fail, R }, null, 1)); console.log(fail.length ? 'FAIL ' + out : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
