// Teste t398: Entrar escolhe só o veículo MAIS PERTO (até ~3,5 m da porta); nada de prioridade por tipo, nem chamado passando na frente, nem ir até um veículo longe. Uso: node test/t398.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}entrar-${GAME}-${out}-${name}.png` }); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });
  const ev = (f, ...a) => page.evaluate(f, ...a);
  const setup = (carD, heliD) => ev((carD, heliD) => {
    const G = window.__G; const p = G.player; if (p.vehicle) { const v = p.vehicle; v.vx = v.vz = v.vf = 0; G.leaveCar(true); }
    G.carCall = null; if (G.sigCar) { const i = G.vehicles.indexOf(G.sigCar); if (i >= 0) { G.vehicles.splice(i, 1); G.sigCar.dispose(G.scene); } G.sigCar = null; }
    const heli = G.heli; const car = G.vehicles.find(v => !v.driver && !v.spec.air && !v.spec.boat && v.type !== 'heli' && v.type !== 'plane' && !v.sig);
    // personagem em P; heli parado a leste, carro a oeste; distâncias até a porta = borda da carroceria
    const P = { x: heli.x - 30, z: heli.z }; heli.place(heli.x, heli.z, 0);
    for (const v of G.vehicles) if (v !== heli && v !== car && !v.driver && Math.hypot(v.x - P.x, v.z - P.z) < 25) v.place(v.x + 200, v.z + 200, v.h);
    MBD.teleport(P.x, P.z, 0); MBD.sim(2, 1 / 30);
    const px = p.x, pz = p.z;
    // heli: lado (eixo x) a heliD da borda; carro: lado oposto a carD da borda (orientados em z, lateral voltada ao personagem)
    heli.place(px + heliD + 1.4, pz + 0.7, 0);
    const rc = Math.min(car.spec.w || 1.8, 3.2) * 0.5; car.place(px - carD - rc, pz, 0); car.parked = true;
    MBD.sim(2, 1 / 30); p.x = px; p.z = pz;
    return { car: car.spec.name, carDoor: +G.doorDist(car, p.x, p.z).toFixed(2), heliDoor: +G.doorDist(heli, p.x, p.z).toFixed(2), near: (G.nearestVehicleObj() || {}).type || null, prompt: (document.getElementById('prompt').hidden ? '' : document.getElementById('prompt').textContent) };
  }, carD, heliD);
  const tap = () => ev(() => { const G = window.__G; const p = G.player, x0 = p.x, z0 = p.z; G.talk.cool = 99; MBD.onActTap(1); MBD.sim(2, 1 / 30); const v = p.vehicle; return { in: v ? v.type : null, name: v ? (v.sigName || v.spec.name) : null, called: !!G.carCall || !!G.sigCar, sig: !!(v && v.sig) }; });
  // A) carro a 1,5 m, heli a 3 m: entra no CARRO (o mais perto, não o "melhor")
  let s = await setup(1.5, 3); let r = await tap(); ck('A carro mais perto que o heli → carro', r.in && r.in !== 'heli', { s, r });
  // B) heli a 1,2 m, carro a 3 m: entra no HELI
  s = await setup(3, 1.2); r = await tap(); ck('B heli mais perto → heli', r.in === 'heli', { s, r });
  // C) os dois fora do alcance (carro 6 m, heli 5 m): não entra em nenhum, sem rótulo de entrar, só chama o seu
  s = await setup(6, 5); ck('C fora do alcance: sem alvo', s.near === null && !/entrar:/.test(s.prompt), s);
  r = await tap(); ck('C toque não entra em veículo longe (chama o seu)', r.in === null && r.called, r);
  // D) seu veículo chamado chegando + carro estacionado a 1,5 m: entra no estacionado, não no chamado
  r = await ev(() => { const G = window.__G; const p = G.player; MBD.sim(1, 1 / 30); const sc = G.sigCar; return { arriving: !!G.carCall, sig: !!sc }; });
  s = await ev(() => { const G = window.__G; const p = G.player; const car = G.vehicles.find(v => !v.driver && !v.spec.air && !v.spec.boat && v.type !== 'heli' && v.type !== 'plane' && !v.sig); const rc = Math.min(car.spec.w || 1.8, 3.2) * 0.5; car.place(p.x - 1.5 - rc, p.z, 0); MBD.sim(1, 1 / 30); return { near: (G.nearestVehicleObj() || {}).sig ? 'sig' : 'outro', carDoor: +G.doorDist(car, p.x, p.z).toFixed(2), prompt: (document.getElementById('prompt').hidden ? '' : document.getElementById('prompt').textContent) }; });
  r = await tap(); ck('D chamado não passa na frente do mais perto', r.in && !r.sig, { s, r });
  // E) só o chamado parado à frente (~5-7 m) e nada mais: entra nele (alcance do seu veículo)
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); v.place(v.x + 200, v.z + 200, v.h); } MBD.sim(1, 1 / 30); G.talk.cool = 99;
    const sc = G.sigCar; if (sc) { const i = G.vehicles.indexOf(sc); if (i >= 0) { G.vehicles.splice(i, 1); sc.dispose(G.scene); } G.sigCar = null; } G.carCall = null;
    MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.sim(2, 1 / 30); const s2 = G.sigCar; const n = G.nearestVehicleObj();
    return { door: s2 ? +G.doorDist(s2, G.player.x, G.player.z).toFixed(2) : null, near: n ? (n.sig ? 'sig' : n.type) : null, pv: !!G.player.vehicle, prompt: (document.getElementById('prompt').hidden ? '' : document.getElementById('prompt').textContent) }; });
  const r2 = await tap(); ck('E seu veículo parado à frente → entra nele', r2.sig === true, { r, r2 });
  // F) heli a 2 m mas seu veículo também chamado e parado: entra no heli (o mais perto)
  s = await setup(9, 8); await ev(() => { const G = window.__G; G.talk.cool = 99; MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); });
  r = await ev(() => { const G = window.__G; const p = G.player; const sc = G.sigCar; const h = G.heli; const [fx, fz] = [Math.sin(p.h), Math.cos(p.h)]; h.place(p.x - fx * 3.4 + fz * 0, p.z - fz * 3.4, 0); MBD.sim(1, 1 / 30); return { sigDoor: sc ? +G.doorDist(sc, p.x, p.z).toFixed(2) : null, heliDoor: +G.doorDist(h, p.x, p.z).toFixed(2), near: (G.nearestVehicleObj() || {}).type }; });
  const r3 = await tap(); ck('F heli ao alcance vence o seu veículo chamado', r3.in === 'heli', { r, r3 });
  await setup(1.5, 3); await shot('carro-perto', 300);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
