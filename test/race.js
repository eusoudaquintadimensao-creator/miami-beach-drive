// Teste do Autódromo Neon: seleção, largada, checkpoints/voltas, drift, nitro, gravação, layout mobile
const puppeteer = require('puppeteer-core'); const fs = require('fs'); const path = require('path'); const { execSync } = require('child_process');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const DL = `/tmp/mbd-rdl-${out}`;
const sleep = ms => new Promise(r => setTimeout(r, ms)); const R = {};
(async () => {
  fs.rmSync(DL, { recursive: true, force: true }); fs.mkdirSync(DL, { recursive: true });
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const cdp = await page.createCDPSession(); await cdp.send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }).catch(() => cdp.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: DL }));
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { localStorage.removeItem('mbd-corrida-v1'); MBD.setHour(19.6); });
  await page.click('#raceBtn'); await sleep(1500);
  R.menu = await page.evaluate(() => [MBD.race().state, !document.getElementById('raceSel').hidden]);
  // seleção de carro e pintura
  await page.click('[data-car="rc_jdm"]'); await sleep(400); await page.click('[data-liv="1"]'); await sleep(400);
  R.sel = await page.evaluate(() => [MBD.race().data.car, MBD.race().data.liv, MBD.state.vehicle, JSON.parse(localStorage.getItem('mbd-corrida-v1')).car]);
  await page.click('[data-car="rc_gt"]'); await sleep(300); await page.click('[data-laps="1"]'); await sleep(900);
  await page.screenshot({ path: SH + `race-${out}-selecao.png` });
  // largada
  await page.click('#rsGo'); await sleep(2600);
  R.count = await page.evaluate(() => [MBD.race().state, MBD.race().cars.length, MBD.state.speed]);
  await page.screenshot({ path: SH + `race-${out}-largada.png` });
  await page.waitForFunction('MBD.race().state === "run"', { timeout: 20000 });
  // piloto automático (lógica sem desenhar) para completar a volta
  await page.evaluate(() => {
    const ad = (a, b) => { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
    window.__ap = (n, o = {}) => { const T = MBD.track(), Rc = MBD.race(); let hint = -1, maxSp = 0, nitroT = 0, cpLog = [];
      for (let i = 0; i < n && Rc.state === 'run'; i++) { const v = Rc.car; const r = T.locate(v.x, v.z, hint); hint = r.i; const sp = Math.hypot(v.vx, v.vz); maxSp = Math.max(maxSp, sp);
        const tg = T.at(r.s + 7 + sp * 0.45, 0); const err = ad(v.h, Math.atan2(tg.x - v.x, tg.z - v.z)); const steer = Math.max(-1, Math.min(1, -err * 2.6));
        let km = 0; for (let d = 5; d < 10 + sp * 2.2; d += 4) km = Math.max(km, Math.abs(T.at(r.s + d).k)); const vt = Math.min(80, Math.sqrt(12.5 / Math.max(km, 1e-4)));
        const thr = sp < vt ? 1 : sp > vt + 2.5 ? -1 : 0.2; MBD.input.stick = [steer, thr]; MBD.nitro(o.nitro && km < 1 / 260); if (v.boosting) nitroT++;
        const c0 = Rc.cpNext; MBD.sim(1, 1 / 30); if (Rc.cpNext !== c0) cpLog.push(Rc.cpNext); }
      MBD.input.stick = null; MBD.nitro(false); return { maxSp, nitroT, cpLog }; };
  });
  R.lap = await page.evaluate(() => { const o = __ap(3600, { nitro: true }); const Rc = MBD.race(); return Object.assign(o, { state: Rc.state, lapTimes: Rc.lapTimes, place: Rc.place, t: Rc.t, rivals: Rc.cars.map(c => [c.racer, c.skill, c.fin != null ? +c.fin.toFixed(1) : null, Math.round(c.total)]), drift: MBD.drift().total }); });
  R.store = await page.evaluate(() => JSON.parse(localStorage.getItem('mbd-corrida-v1')));
  await page.waitForFunction('!document.getElementById("raceEnd").hidden', { timeout: 30000 }).catch(() => {}); await sleep(500);
  R.endShown = await page.evaluate(() => !document.getElementById('raceEnd').hidden);
  await page.screenshot({ path: SH + `race-${out}-chegada.png` });
  // treino livre: drift e nitro
  await page.click('#reCar'); await sleep(800); await page.click('#rsFree'); await sleep(800);
  R.treino = await page.evaluate(() => MBD.race().state);
  // reta até velocidade, depois freio de mão + volante
  R.drift = await page.evaluate(() => { const v = MBD.race().car, T = MBD.track(); const g = T.at(T.L - 120, 0); v.place(g.x, g.z, g.h); v.vx = Math.sin(g.h) * 30; v.vz = Math.cos(g.h) * 30; v.dSpd = null;
    MBD.input.stick = [0.9, 1]; MBD.input.hb = true; MBD.sim(4, 1 / 30); MBD.input.hb = false; let mx = 0; for (let i = 0; i < 30; i++) { MBD.sim(1, 1 / 30); mx = Math.max(mx, v.driftAng || 0); }
    return { drifting: v.drifting, driftAngMax: +mx.toFixed(2), speed: +Math.hypot(v.vx, v.vz).toFixed(1), smoke: MBD.fx().emitted, marks: MBD.fx().mN, chain: Math.round(MBD.drift().chain), combo: MBD.drift().combo }; });
  await sleep(250); await page.screenshot({ path: SH + `race-${out}-drift-fumaca.png` });
  R.driftExit = await page.evaluate(() => { const v = MBD.race().car; MBD.input.stick = [-0.9, 0.4]; MBD.sim(25, 1 / 30); MBD.input.stick = null; return { drifting: v.drifting }; });
  R.nitro = await page.evaluate(() => { const v = MBD.race().car, T = MBD.track(); const g = T.at(T.L - 160, 0); v.place(g.x, g.z, g.h); v.vx = Math.sin(g.h) * 25; v.vz = Math.cos(g.h) * 25; v.nitro = 1;
    MBD.input.stick = [0, 1]; MBD.nitro(true); MBD.sim(30, 1 / 30); return { boosting: v.boosting, nitro: +v.nitro.toFixed(2), speed: +Math.hypot(v.vx, v.vz).toFixed(1) }; });
  await sleep(400); R.nitro.fov = await page.evaluate(() => MBD.cam().fov); R.nitro.lines = await page.evaluate(() => getComputedStyle(document.getElementById('speedFx')).opacity);
  await page.screenshot({ path: SH + `race-${out}-nitro.png` });
  await page.evaluate(() => { MBD.nitro(false); MBD.input.stick = null; });
  // gravação durante o treino
  if (await page.evaluate(() => !document.getElementById('bRec').hidden && document.getElementById('bRec').offsetWidth > 0)) {
    await page.click('#bRec'); await sleep(300); R.recording = await page.evaluate(() => __G.rec.recording);
    await page.evaluate(() => { MBD.input.stick = [0.2, 1]; }); await sleep(3500); await page.evaluate(() => { MBD.input.stick = null; });
    await page.click('#recStop'); await page.waitForFunction('!document.getElementById("recPanel").hidden', { timeout: 15000 }); await sleep(800);
    R.blob = await page.evaluate(() => ({ size: __G.rec.blob.size, type: __G.rec.blob.type }));
    await page.click('#rpSave'); let file = null; for (let i = 0; i < 40 && !file; i++) { await sleep(250); const f = fs.readdirSync(DL).filter(x => !x.endsWith('.crdownload')); if (f.length) file = path.join(DL, f[0]); }
    R.download = file; if (file) { try { R.ffprobe = execSync(`ffprobe -v error -show_entries format=format_name,duration -of csv=p=0 "${file}"`).toString().trim(); } catch (e) { R.ffprobe = 'ERR'; } }
    await page.evaluate(() => document.getElementById('rpDiscard') && document.getElementById('rpDiscard').click()); await sleep(400);
  } else R.recBtn = 'hidden';
  // layout mobile: botões visíveis não podem se sobrepor
  R.overlap = await page.evaluate(() => { const els = [...document.querySelectorAll('#touch button, #touch .btn, #stickZone, #raceHud, #minimap, #drift, #hud .topbar, #bRec, #menuBtn')].filter(e => e.offsetWidth > 0 && getComputedStyle(e).visibility !== 'hidden' && !e.hidden);
    const rs = els.map(e => [e.id || e.className, e.getBoundingClientRect()]); const o = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; if (rs[i][0] === 'stickZone' || rs[j][0] === 'stickZone') continue; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 2 && iy > 2) o.push(rs[i][0] + '×' + rs[j][0]); }
    return { n: rs.length, ids: rs.map(r => r[0]).join(','), o }; });
  R.fps = await page.evaluate(() => [MBD.state.fps, MBD.state.draws, MBD.state.quality]);
  await page.evaluate(() => MBD.race().leave()); await sleep(800);
  R.left = await page.evaluate(() => [MBD.race().state, __G.paused, MBD.state.vehicle]);
  R.errs = errs;
  console.log(JSON.stringify(R, null, 1)); await browser.close();
})().catch(e => { console.log('FAIL', e.message, JSON.stringify(R)); process.exit(1); });
