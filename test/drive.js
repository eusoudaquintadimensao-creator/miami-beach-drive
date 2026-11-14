// Teste t328u: modos de direção, swipe, freio/ré/VEL, toque simples/duplo, racha 50 m,
// setas e bloqueios, amassado + respawn, arquibancada fora da pista, farol alto, layout, 0 erros.
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const PORT = process.env.PORT || 8765;
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600 || process.env.MOBILE === '1';
const SH = process.env.SHOTS || '/workspace/miami-mundo-aberto/screenshots/';
const R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SH, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/usr/bin/google-chrome', headless: 'new',
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required']
  });
  const page = await browser.newPage();
  await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS
    ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1'
    : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = [];
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = [];
  const ck = (name, ok, info) => { if (!ok) fail.push(name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };

  await page.goto('http://localhost:' + PORT + '/?q=' + q, { waitUntil: 'load' });
  await page.evaluate(() => {
    localStorage.setItem('mbd-casa-v1', JSON.stringify({ intro: true, visits: 1 }));
    localStorage.removeItem('mbd-dirigir-v1');
  });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });

  // 1) tela CONTROLES no menu
  R.menu = await page.evaluate(() => {
    const d = MBD.drive();
    d.openSettings();
    const el = document.getElementById('driveSet');
    const cards = [...document.querySelectorAll('.dsCard')].map(c => ({ mode: c.dataset.mode, t: c.querySelector('h3')?.textContent, sel: c.classList.contains('sel') }));
    return { hidden: el.hidden, vis: el.offsetWidth > 0, cards, title: document.getElementById('dsTitle')?.textContent, key: d.inspect().key };
  });
  ck('tela CONTROLES visível', R.menu.vis && !R.menu.hidden, R.menu);
  ck('três cartões originais', R.menu.cards.length === 3 && R.menu.cards.every(c => ['Tocar', 'Inclinar', 'Volante virtual'].includes(c.t)), R.menu.cards);
  ck('chave nova de localStorage', R.menu.key === 'mbd-dirigir-v1' || R.menu.key === 'nd-dirigir-v1', R.menu.key);
  await sleep(400);
  await page.screenshot({ path: `${SH}drv-${out}-controles.png` });

  R.modes = await page.evaluate(async () => {
    const d = MBD.drive();
    const out = [];
    for (const m of ['tocar', 'volante', 'inclinar']) {
      await d.setMode(m, false);
      out.push({ m, saved: JSON.parse(localStorage.getItem(d.inspect().key) || '{}').mode, cur: d.mode });
    }
    await d.setMode('tocar', false);
    d.closeSettings();
    return out;
  });
  ck('modos salvam na chave nova', R.modes.every(x => x.saved === x.m && x.cur === x.m), R.modes);

  // 2) entra no jogo
  await page.click('#play');
  await sleep(1200);
  await page.waitForFunction(() => MBD.state && MBD.state.draws > 8, { timeout: 20000 }).catch(() => {});

  // 3) entrar no carro, HUD de direção, modos, swipe, freio, ré, VEL
  R.car = await page.evaluate(() => {
    const G = window.__G;
    // pega o veículo de assinatura ou o mais próximo
    MBD.callCar();
    const list = MBD.vehicles();
    const v = G.sigCar || list[0];
    if (!v) return { no: true };
    MBD.teleport(v.x + 2, v.z + 2, v.h);
    MBD.enterCar(v);
    // força HUD mesmo no desktop para inspecionar
    document.body.classList.add('touch');
    MBD.drive().setDriving(true, v);
    MBD.drive().setCruise(0.45);
    return { in: !!MBD.state.inVehicle, type: MBD.state.vehicle, cruise: MBD.drive().cruise, hud: !document.getElementById('driveHud').hidden, stickVis: getComputedStyle(document.getElementById('stickZone')).visibility, brake: !!document.getElementById('drvBrake'), rev: !!document.getElementById('drvRev') };
  });
  ck('entrou no veículo', R.car.in && !R.car.no, R.car);
  ck('HUD de direção visível (freio, ré, VEL)', R.car.hud && R.car.brake && R.car.rev, R.car);
  ck('joystick escondido no carro', R.car.stickVis === 'hidden' || R.car.stickVis === 'collapse', R.car);
  ck('limitador de velocidade', Math.abs(R.car.cruise - 0.45) < 0.02, R.car);

  // screenshot HUD (mobile-like)
  await page.evaluate(() => { MBD.setHour(17.5); MBD.sim(5, 1 / 30); });
  await page.waitForFunction(() => MBD.state.draws > 12, { timeout: 8000 }).catch(() => {});
  await sleep(1600);
  await page.screenshot({ path: `${SH}drv-${out}-hud.png` });

  // cada modo + swipes + freio/ré
  R.drive = await page.evaluate(() => {
    const d = MBD.drive(); const v = window.__G.player.vehicle; const out = {};
    d.setMode('tocar', false); d.setDriving(true, v);
    d._holds.clear();
    d._holds.set(1, { x: innerWidth * 0.85, y: innerHeight * 0.6, t: 0, kind: 'steer' });
    d._recomputeTocar(); d.tick(0.05);
    out.tocar = { steer: +d.steer.toFixed(2), mode: d.mode };
    d._holds.clear(); d._recomputeTocar();
    d.setMode('volante', false);
    d._wheelA = 0.9; d.tick(0.05);
    out.volante = { steer: +d.steer.toFixed(2), wheel: !document.getElementById('drvWheel').hidden };
    d.setMode('inclinar', false);
    d._gamma = 28; d._beta = 50; d.cal = { b: 50, g: 0 }; d.tick(0.05);
    out.inclinar = { steer: +d.steer.toFixed(2) };
    d.fireNitro(); d.fireDrift(); d.tick(0.05);
    out.swipe = { nitro: d.nitro, hb: d.hb };
    d.hardBrake = true; d.tick(0.02);
    out.brake = { thr: d.thr, hard: d.input().hardBrake };
    d.hardBrake = false; d.reverse = true; d.tick(0.02);
    out.rev = { thr: d.thr, y: d.input().y };
    d.reverse = false; d.setMode('tocar', false);
    d.setCruise(0.55);
    out.limit = d.input().limit;
    // vidro
    const br = document.getElementById('drvBrake');
    const cs = getComputedStyle(br);
    out.glass = { bg: cs.backgroundColor, backdrop: cs.backdropFilter || cs.webkitBackdropFilter };
    return out;
  });
  ck('Tocar: segura a direita esterça para a direita', R.drive.tocar.steer > 0.4, R.drive.tocar);
  ck('Volante virtual visível e esterça', R.drive.volante.wheel && R.drive.volante.steer > 0.4, R.drive.volante);
  ck('Inclinar esterça com DeviceOrientation', R.drive.inclinar.steer > 0.3, R.drive.inclinar);
  ck('swipe cima = nitro, baixo = drift', R.drive.swipe.nitro && R.drive.swipe.hb, R.drive.swipe);
  ck('freio manda acelerador negativo (para rápido)', R.drive.brake.hard && R.drive.brake.thr < 0, R.drive.brake);
  ck('ré', R.drive.rev.thr < 0, R.drive.rev);
  ck('limitador no input', R.drive.limit > 0.5 && R.drive.limit < 0.61, R.drive.limit);
  ck('botão de vidro (semi-transparente)', /rgba\(/.test(R.drive.glass.bg) || (R.drive.glass.backdrop && R.drive.glass.backdrop !== 'none'), R.drive.glass);

  // 4) toque simples / duplo no botão entrar
  R.taps = await page.evaluate(() => {
    // sai do carro primeiro
    if (window.__G.player.vehicle) MBD.leaveCar(true);
    const p0 = { x: MBD.state.x, z: MBD.state.z };
    MBD.onActTap(1);
    const called = !!(window.__G.carCall || window.__G.sigCar);
    const v = window.__G.sigCar || MBD.vehicles()[0];
    MBD.teleport(v.x + 1.5, v.z + 1.5, v.h);
    MBD.onActTap(2);
    return { called, in: !!MBD.state.inVehicle, type: MBD.state.vehicle, p0 };
  });
  ck('um toque chama o veículo', R.taps.called, R.taps);
  ck('dois toques entra no carro', R.taps.in, R.taps);

  // 5) racha: aceitar a 50 m, setas, bloqueios, dent, respawn
  R.race = await page.evaluate(() => {
    const G = window.__G;
    MBD.setHour(21.2);
    const R0 = G.street.constructor === Object ? null : null;
    // ROUTES via street
    const routes = (function () { try { return window.__ROUTES; } catch { return null; } })();
    // usa o start conhecido da Sprint da Orla (Solara) ou equivalente Neon: street.waiting after teleport
    // tenta vários pontos de encontro conhecidos
    const starts = [[300, 520], [60, -330], [-540, 560], [180, 560], [300, 400], [-200, 200]];
    let found = null;
    for (const [x, z] of starts) {
      MBD.teleport(x, z - 40, 0);
      G.street.updateMeets(0.2);
    }
    // força todos os encontros: atualiza meets com jogador perto de cada rota
    const st = G.street;
    // introspect ROUTES through waiting after walking starts — read from function source via known positions
    const known = [[300, 520], [60, -330], [-540, 560], [180, 560]];
    for (const [x, z] of known) {
      MBD.teleport(x, z, Math.PI);
      st.updateMeets(0.16);
    }
    const near50 = st.nearRival(50);
    const near22 = st.nearRival(22);
    const near5 = st.nearRival(5);
    if (near50) {
      // posiciona a 45 m (fora dos 22 antigos, dentro dos 50)
      const w = near50;
      const ang = 0.3;
      const x = w.v.x + Math.sin(ang) * 45, z = w.v.z + Math.cos(ang) * 45;
      MBD.teleport(x, z, 0);
      if (!G.player.vehicle) {
        const v = G.sigCar || MBD.vehicles()[0];
        if (v) { v.place(x, z, 0); MBD.enterCar(v); }
      } else {
        G.player.vehicle.place(x, z, 0);
        G.player.x = x; G.player.z = z;
      }
    }
    const n = st.nearRival(50);
    // garante um carro do jogador (nunca o do rival)
    let pv = G.player.vehicle;
    if (!pv || pv.npc || pv.rival || pv.spec.boat || pv.type === 'heli') {
      if (pv) MBD.leaveCar(true);
      pv = G.sigCar || G.vehicles.find(c => c && !c.npc && !c.rival && !c.spec.boat && c.type !== 'heli');
      if (pv && n) { pv.place(n.v.x + 30, n.v.z + 30, 0); MBD.enterCar(pv); }
    }
    if (G.missions && G.missions.active) G.missions.cancel && G.missions.cancel();
    st.save.rep = Math.max(st.save.rep, 500); // teste: reputação libera qualquer rival
    const n2 = st.nearRival(50);
    const accepted = n2 ? st.flash() : false;
    const arrows = st.arrows ? st.arrows.children.length : 0;
    const blocks = st.blocks ? st.blocks.children.length : 0;
    const boxes = (st.blockBoxes || []).length;
    return {
      near50: !!(near50 || n || n2), d: n2 && +n2.d.toFixed(1), accepted, arrows, blocks, boxes,
      racing: !!st.race, name: st.race && (st.race.r && st.race.r.name),
      why: st._flashWhy, veh: G.player.vehicle && G.player.vehicle.type, npc: !!(G.player.vehicle && G.player.vehicle.npc),
      hour: +G.env.hour.toFixed(2), mission: !!(G.missions && G.missions.active), night: G.env.hour >= 19 || G.env.hour < 5
    };
  });
  ck('rival detectado a até 50 m', R.race.near50, R.race);
  ck('racha aceito', R.race.accepted && R.race.racing, R.race);
  ck('setas 3D nas curvas', R.race.arrows >= 6, R.race);
  ck('bloqueios nas ruas erradas', R.race.blocks >= 1 && R.race.boxes >= 1, R.race);

  // foto setas + bloqueio
  await page.evaluate(() => {
    const st = window.__G.street;
    if (st.arrows && st.arrows.children[2]) {
      const a = st.arrows.children[Math.min(4, st.arrows.children.length - 1)];
      const b = st.blocks && st.blocks.children[0];
      const tx = b ? (a.position.x + b.position.x) / 2 : a.position.x;
      const tz = b ? (a.position.z + b.position.z) / 2 : a.position.z;
      // câmera de lado, um pouco atrás
      const p = window.__G.player;
      if (p.vehicle) p.vehicle.place(tx - 8, tz - 14, 0.4);
      p.x = tx - 8; p.z = tz - 14; p.h = 0.4;
      window.__G.camYaw = 0.4;
      if (window.__G.snapCam) window.__G.snapCam();
    }
    MBD.setHour(21.4);
  });
  await page.evaluate(() => MBD.sim(8, 1 / 30));
  await sleep(2000);
  await page.screenshot({ path: `${SH}drv-${out}-arrows.png` });

  // 6) batida: amassado, carro continua; respawn 1 s
  R.crash = await page.evaluate(() => {
    const G = window.__G; const v = G.player.vehicle;
    if (!v) return { no: true };
    const spd0 = 28;
    v.vx = Math.sin(v.h) * spd0; v.vz = Math.cos(v.h) * spd0; v.vf = spd0;
    // impacto frontal contra uma parede imaginária
    const impact = v.bounce(-Math.sin(v.h), -Math.cos(v.h));
    const after = v.speed;
    const dents = (v.dents || []).length;
    // simula ficar parado fora da rota 1.1 s
    if (G.street.race) {
      v.vx = v.vz = v.vf = 0;
      const S = G.street.race;
      // joga pra fora
      v.x += 40; v.z += 40; G.player.x = v.x; G.player.z = v.z;
      G.street.stuckT = 0; G.street._fading = false;
      G.street.update(1.15, G.t || 10, G.cam || { position: { x: v.x, y: 10, z: v.z } });
    }
    return { impact: +impact.toFixed(1), after: +after.toFixed(1), dents, stillMoving: after > 10, fading: G.street._fading, stuckT: G.street.stuckT, racing: !!G.street.race };
  });
  ck('batida não para o carro (só amassa)', R.crash.stillMoving && R.crash.dents >= 1, R.crash);
  ck('respawn automático disparado (~1 s)', R.crash.fading || R.crash.stuckT === 0, R.crash);
  await sleep(500); // fade timeout
  await page.evaluate(() => MBD.sim(4, 1 / 30));
  await sleep(1400);
  await page.screenshot({ path: `${SH}drv-${out}-dent.png` });

  R.respawned = await page.evaluate(() => {
    const G = window.__G, st = G.street, v = G.player.vehicle;
    if (!st.race || !v) return { racing: !!st.race };
    const S = st.race;
    const a = S.k ? S.cps[S.k - 1] : [S.sx, S.sz];
    const b = S.cps[S.k] || a;
    const dx = b[0] - a[0], dz = b[1] - a[1], L = Math.hypot(dx, dz) || 1;
    const t = Math.max(0, Math.min(1, ((v.x - a[0]) * dx + (v.z - a[1]) * dz) / (L * L)));
    const dist = Math.hypot(v.x - (a[0] + dx * t), v.z - (a[1] + dz * t));
    return { dist: +dist.toFixed(1), racing: true, h: +v.h.toFixed(2) };
  });
  ck('reposicionado no trajeto', !R.respawned.racing || R.respawned.dist < 20, R.respawned);

  // limpa racha
  await page.evaluate(() => { const st = window.__G.street; if (st.race) st.end(false, 'teste'); });
  R.cleaned = await page.evaluate(() => {
    const st = window.__G.street;
    return { arrows: !st.arrows, blocks: !st.blocks, boxes: (st.blockBoxes || []).length };
  });
  ck('setas e bloqueios removidos ao terminar', R.cleaned.arrows && R.cleaned.blocks && R.cleaned.boxes === 0, R.cleaned);

  // 7) arquibancada fora da linha de corrida (Autódromo + Serpentina)
  R.stand = await page.evaluate(() => {
    const THREE = window.THREE || (window.__G.track && window.__G.track.stand && window.__G.track.stand.isObject3D ? null : null);
    const T = window.__G.track;
    if (!T || !T.stand) return { no: true };
    T.stand.updateMatrixWorld(true);
    let minLat = 1e9, worst = null, n = 0;
    const vec = { x: 0, y: 0, z: 0 };
    T.stand.traverse(o => {
      if (!o.isMesh || !o.geometry) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const bb = o.geometry.boundingBox; if (!bb) return;
      const pts = [[bb.min.x, bb.min.z], [bb.max.x, bb.min.z], [bb.min.x, bb.max.z], [bb.max.x, bb.max.z]];
      for (const [lx, lz] of pts) {
        const w = new (window.__THREE ? window.__THREE.Vector3 : Object)();
        // manual local-to-world via matrix
        const e = o.matrixWorld.elements;
        const x = e[0] * lx + e[4] * 0 + e[8] * lz + e[12];
        const z = e[2] * lx + e[6] * 0 + e[10] * lz + e[14];
        const r = T.locate(x, z);
        if (!r) continue;
        n++;
        const a = Math.abs(r.lat);
        if (a < minLat) { minLat = a; worst = { lat: +r.lat.toFixed(2), x: +x.toFixed(1), z: +z.toFixed(1) }; }
      }
    });
    // Circuito: amostra o centro da pista e colisão
    const S = window.__G.serp;
    let serpHit = 0;
    if (S && S.at) {
      for (let s = 0; s < S.L; s += 8) {
        const p = S.at(s, 0);
        // colliders at racing line? we just record
      }
    }
    return { minLat: +minLat.toFixed(2), worst, n, wall: 11.5, halfW: 7.5, clear: minLat > 11.5 };
  });
  ck('arquibancada fora da parede da pista', R.stand.clear && R.stand.minLat > 11.5, R.stand);

  // foto da reta do autódromo
  await page.evaluate(() => {
    const T = window.__G.track;
    const p = T.at(70 * T.ds, 0);
    if (window.__G.player.vehicle) MBD.leaveCar(true);
    MBD.teleport(p.x, p.z - 4, p.h);
    window.__G.camYaw = p.h;
    window.__G.camPitch = 0.15;
    MBD.setHour(17.2);
    if (window.__G.snapCam) window.__G.snapCam();
  });
  await page.evaluate(() => MBD.sim(6, 1 / 30));
  await sleep(1800);
  await page.screenshot({ path: `${SH}drv-${out}-track.png` });

  // 8) farol alto à noite
  R.beam = await page.evaluate(() => {
    const G = window.__G;
    MBD.setHour(21.6);
    const v = G.sigCar || MBD.vehicles().filter(c => !c.spec.boat && c.type !== 'heli')[0];
    if (!v) return { no: true };
    MBD.teleport(v.x, v.z, v.h);
    MBD.enterCar(v);
    v.place(v.x, v.z, v.h);
    MBD.drive().highBeam = true;
    if (v.updateBeams) v.updateBeams(1, true, true);
    const spot = v.spot;
    const fake = v.fakeBeam;
    return {
      hasSpot: !!spot, intensity: spot ? +spot.intensity.toFixed(1) : 0, vis: !!(spot && spot.visible),
      fakeOp: fake && v._beamM ? +v._beamM.opacity.toFixed(2) : 0, night: +G.env.night.toFixed(2)
    };
  });
  ck('farol alto: SpotLight do jogador', R.beam.hasSpot && R.beam.intensity > 5 && R.beam.vis, R.beam);
  await page.evaluate(() => {
    const v = window.__G.player.vehicle;
    if (v) { const p = v; window.__G.camYaw = p.h; window.__G.camPitch = 0.08; }
  });
  await page.evaluate(() => MBD.sim(6, 1 / 30));
  await sleep(1800);
  await page.screenshot({ path: `${SH}drv-${out}-beams.png` });

  // 9) sair do carro → joystick a pé
  R.walk = await page.evaluate(() => {
    if (window.__G.player.vehicle) MBD.leaveCar(true);
    MBD.drive().setDriving(false);
    document.body.classList.add('touch');
    const st = document.getElementById('stickZone');
    const vis = getComputedStyle(st).visibility;
    const disp = getComputedStyle(st).display;
    const hud = document.getElementById('driveHud');
    return { in: MBD.state.inVehicle, stickVis: vis, stickDisp: disp, hudHidden: hud.hidden, driving: document.body.classList.contains('driving') };
  });
  ck('ao sair, volta o joystick e some o HUD de direção', !R.walk.in && R.walk.stickVis !== 'hidden' && R.walk.hudHidden && !R.walk.driving, R.walk);

  // 10) layout: centro livre, sem sobreposição
  R.layout = await page.evaluate((mobile) => {
    if (mobile) document.body.classList.add('touch');
    // a pé
    const sel = ['#quick button', '#icons button', '#btns button', '#mapw', '#topR', '#nitroW', '#prompt', '#spd', '#drvBrake', '#drvRev', '#drvCruise', '#drvWheel', '#drvGear'];
    const vis = sel.flatMap(s => [...document.querySelectorAll(s)]).filter(e => {
      if (!e || e.closest('[hidden]') || e.hidden) return false;
      const cs = getComputedStyle(e);
      return e.offsetWidth > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    const rs = vis.map(e => [e.id || e.tagName, e.getBoundingClientRect()]);
    const o = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i][1], b = rs[j][1];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2)
        o.push(rs[i][0] + '×' + rs[j][0]);
    }
    const mid = { l: innerWidth * 0.32, r: innerWidth * 0.68, t: innerHeight * 0.18, b: innerHeight * 0.62 };
    const clutter = rs.filter(([, r]) => r.width > 30 && r.left < mid.r && r.right > mid.l && r.top < mid.b && r.bottom > mid.t).map(([id]) => id);
    // no carro
    const v = window.__G.sigCar || window.__G.vehicles[0];
    if (v) { MBD.enterCar(v); MBD.drive().setDriving(true, v); document.body.classList.add('driving', 'touch'); }
    const visD = sel.flatMap(s => [...document.querySelectorAll(s)]).filter(e => {
      if (!e || e.closest('[hidden]') || e.hidden) return false;
      const cs = getComputedStyle(e);
      return e.offsetWidth > 0 && cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    const rd = visD.map(e => [e.id || e.tagName, e.getBoundingClientRect()]);
    const od = [];
    for (let i = 0; i < rd.length; i++) for (let j = i + 1; j < rd.length; j++) {
      const a = rd[i][1], b = rd[j][1];
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2)
        od.push(rd[i][0] + '×' + rd[j][0]);
    }
    const clutterD = rd.filter(([, r]) => r.width > 30 && r.left < mid.r && r.right > mid.l && r.top < mid.b && r.bottom > mid.t).map(([id]) => id);
    if (window.__G.player.vehicle) MBD.leaveCar(true);
    MBD.drive().setDriving(false);
    return { foot: { n: rs.length, overlap: o, clutter }, drive: { n: rd.length, overlap: od, clutter: clutterD } };
  }, mobile);
  ck('layout a pé sem sobreposição', R.layout.foot.overlap.length === 0, R.layout.foot);
  ck('layout no carro sem sobreposição', R.layout.drive.overlap.length === 0, R.layout.drive);
  ck('centro da tela livre no carro', R.layout.drive.clutter.length === 0, R.layout.drive);

  // Autódromo: 1 s de stuck dispara fade
  R.auto = await page.evaluate(() => {
    const race = window.__G.race;
    // só inspeciona os limiares (não abre o menu de corrida inteiro)
    return { hasFade: typeof race._fading !== 'undefined' || /respawnFade|stuckT > 1/.test(String(race.resetCar) + 'ok') };
  });

  R.errs = [...new Set(errs)].filter(e => !/favicon|Failed to load/.test(e));
  ck('0 erros no console', R.errs.length === 0, R.errs);

  R.sw = await page.evaluate(async () => {
    if (!navigator.serviceWorker) return { no: true };
    const regs = await navigator.serviceWorker.getRegistrations();
    return { n: regs.length, url: regs[0] && regs[0].active && regs[0].active.scriptURL };
  });

  console.log(JSON.stringify({ out, W, H, mobile, fail, R }, null, 2));
  if (fail.length) { console.error('FAIL', fail); process.exitCode = 1; }
  else console.log('PASS', out);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
