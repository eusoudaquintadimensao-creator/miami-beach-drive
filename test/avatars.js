// Teste: avatares (seletor, andar, correr, pular, dirigir), física do carro, conversa com NPC, helicóptero (noite), adaptação
const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = '', out = 'd'] = process.argv; const mobile = +W < 600;
const SH = '/workspace/miami-mundo-aberto/screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await p.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36');
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const t0 = Date.now();
  await p.goto('http://localhost:8765/' + (q ? '?q=' + q : ''), { waitUntil: 'load' });
  await p.waitForFunction('window.MBD_READY === true', { timeout: 150000 }); R.readyS = (Date.now() - t0) / 1000;
  const st = () => p.evaluate(() => MBD.state);
  const until = async (fn, ms = 30000, arg) => { try { await p.waitForFunction(fn, { timeout: ms, polling: 200 }, arg); return true; } catch (e) { return false; } };
  const key = async (k, ms) => { await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); };
  // ---- seletor na tela inicial
  R.device = (await st()).device; R.quality = (await st()).quality; R.prMax = (await st()).prMax; R.peds = (await st()).peds; R.detail = (await st()).detail;
  await p.click('.avCard[data-av="ele"]'); await sleep(300);
  R.pickSaved = await p.evaluate(() => JSON.parse(localStorage.getItem('mbd-solara-v1')).avatar);
  await p.screenshot({ path: SH + `av-${out}-seletor.png` });
  await p.click('#play'); await sleep(1500);
  R.avatar3d = await until('MBD.state.avatar3d === true', 40000); R.avatarId = (await st()).avatar;
  await until('MBD.state.fps > 0', 20000);
  // ---- andar / correr / pular (Davi)
  await p.evaluate(() => MBD.teleport(312, -140, Math.PI)); await sleep(800);
  let s0 = await st();
  if (mobile) { await p.evaluate(() => { MBD.input.stick = [0, 0.6]; }); await sleep(2500); R.walkAnim = (await st()).anim; await p.evaluate(() => { MBD.input.stick = [0, 1]; }); await sleep(2500); R.runAnim = (await st()).anim; R.runSpeed = (await st()).speed; await p.evaluate(() => { MBD.input.stick = null; }); }
  else { await p.keyboard.down('KeyW'); await sleep(2500); R.walkAnim = (await st()).anim; await p.keyboard.down('ShiftLeft'); await sleep(2500); R.runAnim = (await st()).anim; R.runSpeed = (await st()).speed; await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW'); }
  let s1 = await st(); R.walked = +Math.hypot(s1.x - s0.x, s1.z - s0.z).toFixed(1);
  await sleep(1200); R.stopAnim = (await st()).anim;
  // inércia: velocidade cai aos poucos (não para instantaneamente)
  await p.evaluate(() => { const pl = __G.player; pl.vx = 6; pl.vz = 0; }); await sleep(30); R.inertiaSpeed = +(await st()).speed.toFixed(2);
  await sleep(800);
  // pulo
  await p.evaluate(() => { MBD.input.jump = true; }); await sleep(250); const sj = await st(); R.jumpAnim = sj.anim; R.jumpY = +(sj.y).toFixed(2); R.jumpAir = !sj.grounded;
  await until('MBD.state.grounded === true', 8000); R.landed = (await st()).grounded;
  // parede: tenta atravessar um prédio
  await p.evaluate(() => MBD.teleport(283, -150, -Math.PI / 2)); await sleep(500);
  await p.evaluate(() => { __G.camYaw = -Math.PI / 2; MBD.input.stick = [0, 1]; }); await sleep(3000); await p.evaluate(() => { MBD.input.stick = null; });
  R.wallX = +(await st()).x.toFixed(1);
  await p.evaluate(() => { MBD.setHour(10.5); MBD.teleport(312, -150, Math.PI); __G.camYaw = 0.6; __G.camPitch = 0.12; }); await sleep(600);
  if (mobile) await p.evaluate(() => { MBD.input.stick = [0, 0.6]; }); else await p.keyboard.down('KeyW'); await sleep(1500);
  await p.screenshot({ path: SH + `av-${out}-ele-andando.png` });
  if (mobile) await p.evaluate(() => { MBD.input.stick = null; }); else await p.keyboard.up('KeyW');
  // ---- Luna
  await p.evaluate(() => MBD.avatar('ela')); R.ela3d = await until('MBD.state.avatar === "ela" && MBD.state.avatar3d', 20000);
  await p.evaluate(() => { MBD.teleport(312, -150, Math.PI); __G.camYaw = 0.6; }); await sleep(400);
  if (mobile) await p.evaluate(() => { MBD.input.stick = [0, 1]; }); else { await p.keyboard.down('KeyW'); await p.keyboard.down('ShiftLeft'); } await sleep(1500);
  await p.screenshot({ path: SH + `av-${out}-ela-correndo.png` });
  if (mobile) await p.evaluate(() => { MBD.input.stick = null; }); else { await p.keyboard.up('ShiftLeft'); await p.keyboard.up('KeyW'); }
  // ---- dirigir (Luna no carro, visível pelo vidro)
  R.preCar = await p.evaluate(() => { MBD.talk().close && MBD.talk().cur && MBD.talk().close(true); const v = __G.vehicles.filter(v => v.type === 'sport' && !v.driver).sort((a, b) => Math.hypot(a.x - 296, a.z + 172) - Math.hypot(b.x - 296, b.z + 172))[0]; const [fx, fz] = v.fwd(); MBD.teleport(v.x + fz * 1.6, v.z - fx * 1.6, v.h); return [v.x.toFixed(1), v.z.toFixed(1)]; }); await sleep(400);
  await p.evaluate(() => MBD.action()); await sleep(600); R.inCar = (await st()).vehicle; if (!R.inCar) R.whyNot = await p.evaluate(() => JSON.stringify({ nv: MBD.nearestVehicle(), talking: MBD.state.talking, p: [__G.player.x, __G.player.z] }));
  R.seated = await p.evaluate(() => [__G.hero.g.parent === __G.player.vehicle.body, __G.hero.cur && __G.hero.cur.getClip().name, __G.hero.g.visible]);
  // física: arrancada (agacha), freada (mergulha), drift com freio de mão
  await p.evaluate(() => { MBD.input.stick = null; }); await p.keyboard.down('KeyW'); await sleep(2500);
  R.accelPitch = +(await p.evaluate(() => __G.player.vehicle.pitch)).toFixed(3); R.carSpeed = +(await st()).speed.toFixed(1);
  await p.keyboard.up('KeyW'); await p.keyboard.down('KeyS'); await sleep(500); R.brakePitch = +(await p.evaluate(() => __G.player.vehicle.pitch)).toFixed(3); R.wt = +(await p.evaluate(() => __G.player.vehicle.wt)).toFixed(2); await p.keyboard.up('KeyS');
  // física determinística: chama drive() com passos fixos (independe do fps do SwiftShader)
  Object.assign(R, await p.evaluate(() => { const v = __G.player.vehicle; const sim = (n, inp) => { let md = 0, mr = 0, mp = 0; for (let i = 0; i < n; i++) { v.drive(1 / 30, inp, [], 0); v.sync && v.sync(1 / 30); md = Math.max(md, v.drift); mr = Math.max(mr, Math.abs(v.roll || 0)); mp = Math.max(mp, Math.abs(v.pitch || 0)); } return [md, mr, mp]; };
    v.place(300, -60, 0); v.vx = 0; v.vz = 24; v.vf = 24; v.yawV = 0;
    const [dHb, rHb] = sim(36, { x: 1, y: 1, hb: true });
    v.place(300, -60, 0); v.vx = 0; v.vz = 24; v.vf = 24; v.yawV = 0; v.steer = 0;
    const [dNo] = sim(36, { x: 0.3, y: 0.3, hb: false });
    v.place(300, -60, 0); v.vx = 0; v.vz = 24; v.vf = 24; v.yawV = 0; v.steer = 0;
    const [, , pBrake] = sim(15, { x: 0, y: -1, hb: false });
    const out = { driftHB: +dHb.toFixed(2), driftNormal: +dNo.toFixed(2), rollMax: +rHb.toFixed(3), brakePitchMax: +pBrake.toFixed(3) };
    v.place(300, -150, Math.PI); v.vx = v.vz = v.vf = 0; return out; }));
  await sleep(800);
  await p.evaluate(() => { const v = __G.player.vehicle; v.place(300, -150, Math.PI); v.vx = v.vz = 0; __G.snapCam(); __G.camYaw = Math.PI - 2.4; __G.camPitch = 0.05; __G.camMode = 2; MBD.setHour(10.5); }); await sleep(1200);
  await p.screenshot({ path: SH + `av-${out}-ela-dirigindo.png` });
  await p.evaluate(() => MBD.avatar('ele')); await until('MBD.state.avatar === "ele" && MBD.state.avatar3d', 15000); await sleep(900);
  R.seatedEle = await p.evaluate(() => [__G.hero.g.parent === __G.player.vehicle.body, __G.hero.cur && __G.hero.cur.getClip().name]);
  await p.screenshot({ path: SH + `av-${out}-ele-dirigindo.png` });
  await p.evaluate(() => { __G.camMode = 0; MBD.action(); }); await sleep(500); R.exitCar = !(await st()).inVehicle;
  // ---- conversa com NPC (personagem fixo, se carregou; senão um pedestre)
  R.talkers = await until('MBD.state.talkers > 0', 30000) ? (await st()).talkers : 0;
  const tk = await p.evaluate(() => { const T = MBD.talk().talkers.find(t => t.name === 'Kai') || MBD.talk().talkers[0]; if (T) { MBD.teleport(T.x - 1.8, T.z + 0.4, Math.PI / 2); return T.name; } const c = __G.crowd.peds.find(c => c.x < 1e4); MBD.teleport(c.x + 1.5, c.z, -Math.PI / 2); return 'pedestre'; });
  await sleep(800); R.talkWith = tk;
  await p.evaluate(() => { __G.camYaw = Math.PI / 2 + 0.9; __G.camPitch = 0.12; __G.camMode = 2; MBD.setHour(17.9); });
  if (mobile) await p.tap('#bAct'); else await p.keyboard.press('KeyE');
  await sleep(900); R.talkOpen = (await st()).talking; R.bubble = await p.evaluate(() => document.getElementById('say').hidden ? '' : document.getElementById('say').textContent);
  await sleep(600); await p.screenshot({ path: SH + `av-${out}-conversa.png` });
  const lines = [R.bubble];
  for (let i = 0; i < 5; i++) { const has = await p.evaluate(() => !document.getElementById('tkNext').hidden && !document.getElementById('talk').hidden); if (!has) break; if (mobile) await p.tap('#tkNext'); else await p.keyboard.press('KeyE'); await sleep(400); lines.push(await p.evaluate(() => document.getElementById('say').textContent)); }
  R.lines = lines; R.offer = await p.evaluate(() => !document.getElementById('tkYes').hidden);
  if (R.offer) { await p.click('#tkYes'); await sleep(600); R.favorMission = (await st()).mission; await p.evaluate(() => __G.missions.cancel()); }
  else await p.click('#tkBye');
  await sleep(500); R.talkClosed = !(await st()).talking;
  // segunda conversa (outra fala, sem repetir)
  await sleep(1200); await p.evaluate(() => { const t = MBD.talk(); t.cool = 0; const n = t.nearest(4); if (n) t.open(n); });
  await sleep(300); const l2 = await p.evaluate(() => document.getElementById('say').textContent); R.secondDiffers = l2 !== R.bubble; await p.evaluate(() => MBD.talk().close(true)); await p.evaluate(() => { __G.camMode = 0; });
  // ---- helicóptero à noite
  await p.evaluate(() => { MBD.setHour(21.6); const H = MBD.heli(); const [fx, fz] = H.fwd(); MBD.teleport(H.x + fz * 2.2, H.z - fx * 2.2, H.h); }); await sleep(600);
  await p.evaluate(() => MBD.action()); await sleep(500); R.inHeli = (await st()).vehicle; if (!R.inHeli) R.whyH = await p.evaluate(() => JSON.stringify({ nv: MBD.nearestVehicle(), t: MBD.state.talking, H: [MBD.heli().x, MBD.heli().z, MBD.heli().driver ? 1 : 0], p: [__G.player.x, __G.player.z] }));
  if (mobile) { await p.evaluate(() => { const b = document.getElementById('bJump'); b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); }); }
  else await p.keyboard.down('Space');
  R.tookOff = await until('MBD.state.heliAlt > 12', 60000);
  if (mobile) await p.evaluate(() => { document.getElementById('bJump').dispatchEvent(new PointerEvent('pointerup', { bubbles: true })); }); else await p.keyboard.up('Space');
  if (mobile) await p.evaluate(() => { MBD.input.stick = [0.25, 1]; }); else { await p.keyboard.down('KeyW'); }
  await sleep(3500); const hs = await st(); R.heliSpeed = +hs.speed.toFixed(1); R.heliAlt = +hs.heliAlt.toFixed(1); R.heliMoved = +Math.hypot(hs.x - 416, hs.z + 200).toFixed(0);
  if (mobile) await p.evaluate(() => { MBD.input.stick = null; }); else await p.keyboard.up('KeyW');
  R.helisFlying = (await st()).helisFlying; R.searchlight = await p.evaluate(() => MBD.heli().cone.visible);
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.5; __G.camPitch = 0.1; }); await sleep(900);
  await p.screenshot({ path: SH + `av-${out}-heli-noite.png` });
  // um helicóptero da cidade com holofote
  await p.evaluate(() => { const h = MBD.helis().list[0]; const H = MBD.heli(); H.place(h.x - 40, h.z - 30, 0); H.y = h.y + 15; H.air = true; __G.camYaw = Math.atan2(h.x - H.x, h.z - H.z); __G.camPitch = -0.05; }); await sleep(900);
  await p.screenshot({ path: SH + `av-${out}-heli-cidade-noite.png` });
  // pousa e desce
  await p.evaluate(() => { const H = MBD.heli(); H.place(300, -120, 0); H.y = 30; H.air = true; }); 
  if (mobile) await p.evaluate(() => { MBD.input.down = true; }); else await p.keyboard.down('ShiftLeft');
  R.landedHeli = await until('MBD.state.heliAir === false && MBD.state.speed < 3', 60000);
  if (mobile) await p.evaluate(() => { MBD.input.down = false; }); else await p.keyboard.up('ShiftLeft');
  await sleep(300); await p.evaluate(() => MBD.action()); await sleep(400); R.exitHeli = !(await st()).inVehicle;
  const fin = await st(); R.fps = +fin.fps.toFixed(1); R.draws = fin.draws; R.lodHidden = fin.lodHidden; R.loadMs = fin.loadMs;
  R.errors = errs;
  console.log(JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.log('FALHOU', e.message, JSON.stringify(R)); process.exit(1); });
