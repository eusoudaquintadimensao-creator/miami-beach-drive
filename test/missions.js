const puppeteer = require('puppeteer-core');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage(); await page.setViewport({ width: 800, height: 600 });
  const errs = []; page.on('pageerror', e => errs.push('PAGE: ' + e.message)); page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.text()); });
  await page.goto('http://localhost:8765/?q=low', { waitUntil: 'load' });
  await page.evaluate(() => localStorage.clear()); await page.reload({ waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.click('#play'); await sleep(800);
  const R = {};
  const st = () => page.evaluate(() => MBD.state);
  // foto: inicia pela Agência e vai até o ponto
  await page.evaluate(() => MBD.teleport(318, -95, 0)); await sleep(700);
  await page.keyboard.press('Enter'); await sleep(500);
  R.fotoMission = (await st()).mission;
  const lm = await page.evaluate(() => { const a = __G.missions.active; return a && [a.lm.x, a.lm.z, a.lm.name]; });
  R.fotoLm = lm;
  await page.evaluate((l) => MBD.teleport(l[0] + 6, l[1] + 6, 0), lm); await sleep(900);
  const m0 = (await st()).money;
  await page.keyboard.press('KeyF'); await sleep(1500);
  R.photoShown = await page.evaluate(() => !document.getElementById('photo').hidden && document.getElementById('phImg').src.startsWith('data:image/jpeg'));
  await page.screenshot({ path: '/workspace/miami-mundo-aberto/screenshots/missao-foto.png' });
  await page.click('#phOk'); await sleep(300);
  R.fotoDone = (await st()).money > m0 && !(await st()).mission;
  // corrida r1: entra no carro e passa pelos checkpoints
  await page.evaluate(() => { __G.missions.cool = 0; MBD.teleport(291.2, -172, Math.PI); }); await sleep(500); await page.keyboard.press('KeyE'); await sleep(300);
  await page.evaluate(() => { MBD.teleport(300, 165, 0); __G.missions.cool = 0; }); await sleep(900);
  await page.keyboard.press('Enter'); await sleep(300);
  R.race = (await st()).mission; R.raceDbg = await page.evaluate(() => [MBD.state.vehicle, __G.missions.cool, __G.missions.nearestStart(__G.player.x, __G.player.z).d]);
  if (!R.race) { console.log(JSON.stringify(R), errs); process.exit(1); }
  await page.evaluate(() => { __G.missions.active.t = 0.01; }); await sleep(600);
  const pts = await page.evaluate(() => __G.missions.active.race.pts);
  for (const p of pts) { await page.evaluate((p) => MBD.teleport(p[0], p[1], 0), p); await sleep(700); }
  R.raceDone = !(await st()).mission; R.best = await page.evaluate(() => __G.save.best);
  // táxi
  await page.keyboard.press('KeyE'); await sleep(400);
  await page.evaluate(() => { const v = __G.vehicles.find(v => v.type === 'taxi' && !v.npc); MBD.teleport(v.x + Math.cos(v.h) * 2.6, v.z - Math.sin(v.h) * 2.6, 0); }); await sleep(400);
  R.nearTaxi = await page.evaluate(() => MBD.nearestVehicle());
  await page.keyboard.press('KeyE'); await sleep(400);
  R.inTaxi = (await st()).vehicle;
  await page.evaluate(() => { __G.missions.cool = 0; }); await page.keyboard.press('Enter'); await sleep(500);
  R.taxi = (await st()).mission;
  if (!R.taxi) { console.log(JSON.stringify(R), errs); process.exit(1); }
  let t = await page.evaluate(() => MBD.missionTarget());
  await page.evaluate((t) => MBD.teleport(t[0] + 3, t[1], 0), t); for (let i = 0; i < 30; i++) { await sleep(500); if (await page.evaluate(() => __G.missions.active && __G.missions.active.stage === 'ride')) break; }
  R.taxiStage = await page.evaluate(() => __G.missions.active && __G.missions.active.stage);
  t = await page.evaluate(() => MBD.missionTarget());
  await page.evaluate((t) => MBD.teleport(t[0] + 3, t[1], 0), t); for (let i = 0; i < 20; i++) { await sleep(500); if (!(await st()).mission || (await st()).done >= 3) break; }
  R.taxiPaid = await page.evaluate(() => __G.save.done);
  // lancha
  await page.keyboard.press('KeyE'); await sleep(300);
  R.boatPos = await page.evaluate(() => { const v = __G.vehicles.find(v => v.type === 'boat'); MBD.teleport(v.x + 3, v.z, 0); return [v.x, v.z]; }); await sleep(500);
  R.nearBoat = await page.evaluate(() => MBD.nearestVehicle());
  await page.keyboard.press('KeyE'); await sleep(300);
  R.boat = (await st()).vehicle;
  await page.keyboard.down('KeyW'); await sleep(2500); await page.keyboard.up('KeyW');
  R.boatState = await st();
  await page.screenshot({ path: '/workspace/miami-mundo-aberto/screenshots/lancha.png' });
  R.money = (await st()).money; R.errors = errs;
  console.log(JSON.stringify(R));
  await browser.close();
})();
