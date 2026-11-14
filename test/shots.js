const puppeteer = require('puppeteer-core');
const SH = process.env.SHOTS || '/workspace/miami-mundo-aberto/screenshots/';
const PORT = process.env.PORT || 8765;
const prefix = process.env.PRE || 'drv-d';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720, deviceScaleFactor: 1 });
  await page.goto('http://localhost:' + PORT + '/?q=medium', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.setItem((location.port==='8766'?'nd-casa-v1':'mbd-casa-v1'), JSON.stringify({ intro: true, visits: 1 })));
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });

  // CONTROLES
  await page.evaluate(() => { MBD.drive().openSettings(); });
  await sleep(500);
  await page.screenshot({ path: `${SH}${prefix}-controles.png` });
  await page.evaluate(() => MBD.drive().closeSettings());

  await page.click('#play'); await sleep(1400);
  await page.waitForFunction(() => MBD.state && MBD.state.draws > 10, { timeout: 20000 }).catch(()=>{});

  // HUD de direção limpo, à tarde
  await page.evaluate(() => {
    document.body.classList.add('touch');
    MBD.setHour(17.4);
    const G = window.__G;
    const v = G.sigCar || G.vehicles.find(c => c && !c.npc && !c.spec.boat && c.type !== 'heli');
    MBD.teleport(300, 200, Math.PI); v.place(300, 200, Math.PI); MBD.enterCar(v);
    MBD.drive().setDriving(true, v); MBD.drive().setMode('tocar', false); MBD.drive().setCruise(0.6);
    G.camPitch = 0.12; G.snapCam && G.snapCam();
  });
  await page.evaluate(() => MBD.sim(10, 1/30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}${prefix}-hud.png` });

  // Setas + bloqueio: inicia racha e enquadra uma curva
  const placed = await page.evaluate(() => {
    const G = window.__G; const st = G.street;
    MBD.setHour(21.3); st.save.rep = 500;
    const starts = [[300, 520], [60, -330], [-540, 560], [180, 560]];
    for (const [x, z] of starts) { MBD.teleport(x, z, Math.PI); st.updateMeets(0.16); }
    const n = st.nearRival(50);
    if (!n) return { ok: false };
    const pv = G.player.vehicle || G.sigCar;
    if (!G.player.vehicle) { pv.place(n.v.x + 8, n.v.z + 8, 0); MBD.enterCar(pv); }
    st.flash();
    if (!st.arrows || !st.blocks || !st.arrows.children.length || !st.blocks.children.length) return { ok: false, a: st.arrows && st.arrows.children.length, b: st.blocks && st.blocks.children.length };
    // avança a largada e coloca o carro 45 m antes da 1ª curva, olhando a curva
    st.race.t = 0.5; st.race.beepK = 0;
    const S = st.race; const pts = [[S.sx, S.sz], ...S.cps];
    const a = pts[0], b = pts[1];
    const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
    const cx = b[0] - Math.sin(h) * 24, cz = b[1] - Math.cos(h) * 24;
    const v = G.player.vehicle;
    v.place(cx, cz, h); G.player.x = cx; G.player.z = cz; G.camYaw = h + 0.35; G.camPitch = 0.55; G.camMode = 1; G.snapCam && G.snapCam(); G.camYaw = h + 0.35;
    document.body.classList.add('touch', 'driving');
    MBD.drive().setDriving(true, v);
    const blk = st.blocks.children[0], chev = st.arrows.children[0];
    return { ok: true, bx: blk.position.x, bz: blk.position.z, ax: chev.position.x, az: chev.position.z, nA: st.arrows.children.length, nB: st.blocks.children.length };
  });
  console.log('arrows place', JSON.stringify(placed));
  await page.evaluate(() => MBD.sim(8, 1/30));
  await sleep(2200);
  await page.screenshot({ path: `${SH}${prefix}-arrows.png` });
  await page.evaluate(() => { window.__G.camMode = 0; });

  // Amassado: close-up de lado
  await page.evaluate(() => {
    const G = window.__G; const v = G.player.vehicle;
    if (G.street.race) G.street.end(false, 'foto');
    // aplica vários amassados visíveis
    for (let i = 0; i < 5; i++) {
      const a = i * 0.7;
      v.dent(12, Math.cos(a), Math.sin(a));
    }
    v.place(v.x, v.z, v.h);
    // câmera de 3/4
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
    const cx = v.x - fx * 6.5 + rx * 4.2, cz = v.z - fz * 6.5 + rz * 4.2;
    G.player.x = cx; G.player.z = cz; // leave visually? stay in car, move cam
    G.camYaw = Math.atan2(v.x - cx, v.z - cz);
    G.camPitch = 0.22;
    MBD.setHour(17.6);
  });
  // use raw camera? snapCam resets to vehicle heading. Need to set after snap or disable
  await page.evaluate(() => {
    const G = window.__G, v = G.player.vehicle;
    const fx = Math.sin(v.h), fz = Math.cos(v.h), rx = -fz, rz = fx;
    // sai do carro pra posicionar a câmera livre
    MBD.leaveCar(true);
    MBD.drive().setDriving(false);
    const cx = v.x - fx * 1.2 + rx * 3.2, cz = v.z - fz * 1.2 + rz * 3.2;
    MBD.teleport(cx, cz, Math.atan2(v.x - cx, v.z - cz));
    G.camPitch = 0.32; G.camMode = 2;
  });
  await page.evaluate(() => MBD.sim(6, 1/30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}${prefix}-dent.png` });
  await page.evaluate(() => { window.__G.camMode = 0; });

  // Farol alto: à noite numa rua escura, câmera atrás um pouco alta olhando a rua iluminada
  await page.evaluate(() => {
    const G = window.__G;
    MBD.setHour(22.0);
    const v = G.sigCar || G.vehicles.find(c => c && !c.npc && !c.spec.boat);
    v.place(60, 80, 0); MBD.enterCar(v);
    MBD.drive().highBeam = true;
    v.updateBeams(1, true, true);
    G.camYaw = 0; G.camPitch = 0.08;
    G.snapCam && G.snapCam();
    document.body.classList.add('touch', 'driving');
    MBD.drive().setDriving(true, v);
  });
  await page.evaluate(() => MBD.sim(8, 1/30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}${prefix}-beams.png` });

  // Pista: na reta, arquibancada ao lado (fora)
  await page.evaluate(() => {
    const G = window.__G, T = G.track;
    if (G.player.vehicle) MBD.leaveCar(true);
    MBD.drive().setDriving(false);
    document.body.classList.remove('driving');
    const p = T.at(70 * T.ds, 0);
    const q = T.at(70 * T.ds - 18, 0);
    MBD.teleport(q.x, q.z, p.h);
    G.camYaw = p.h; G.camPitch = 0.12;
    MBD.setHour(17.0);
    G.snapCam && G.snapCam();
  });
  await page.evaluate(() => MBD.sim(8, 1/30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}${prefix}-track.png` });

  // Circuito: bar da curva agora FORA do traçado, muro só na beira
  await page.evaluate(() => {
    const G = window.__G, S = G.serp, k = Math.round(1035 / S.ds);
    const i2 = Math.min(S.N - 1, k + 5);
    const h = Math.atan2(S.px[i2] - S.px[k], S.pz[i2] - S.pz[k]);
    MBD.teleport(S.px[k] - Math.sin(h) * 14, S.pz[k] - Math.cos(h) * 14, h);
    G.camYaw = h + 0.35; G.camPitch = 0.16; MBD.setHour(18.2);
    G.snapCam && G.snapCam();
  });
  await page.evaluate(() => MBD.sim(8, 1/30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}${prefix}-circuito.png` });

  console.log('shots done');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
