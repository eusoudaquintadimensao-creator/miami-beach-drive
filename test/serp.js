// Teste: Circuito Serpentina (pista, IA de drift, pontuação, Bar da Curva, espectadores, layout, 0 erros)
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = []; const ck = (name, ok, info) => { if (!ok) fail.push(name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.removeItem('mbd-serpentina-v1'); localStorage.setItem('mbd-casa-v1', JSON.stringify({ intro: true, visits: 1 })); });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  const layout = (tag) => page.evaluate((tag) => {
    const sel = ['#quick button', '#icons button', '#btns button', '#mapw', '#topR', '#nitroW', '#serpHud', '#prompt', '#area.on', '#spd'];
    const els = sel.flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.offsetWidth > 0 && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
    const rs = els.map(e => [e.id || e.tagName, e.getBoundingClientRect()]); const o = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) o.push(rs[i][0] + '×' + rs[j][0]); }
    const off = rs.filter(([, r]) => r.left < -1 || r.top < -1 || r.right > innerWidth + 2 || r.bottom > innerHeight + 2).map(([id]) => id);
    return { tag, n: rs.length, overlap: o, offscreen: off, qSerp: !!document.getElementById('qSerp') && document.getElementById('qSerp').offsetWidth > 0 };
  }, tag);
  R.layoutFoot = await layout('a pé');
  ck('botão 🐍 visível', R.layoutFoot.qSerp, R.layoutFoot);
  ck('layout sem sobreposição (a pé)', R.layoutFoot.overlap.length === 0, R.layoutFoot);
  ck('nada fora da tela (a pé)', R.layoutFoot.offscreen.length === 0, R.layoutFoot);

  // vai para a pista (K / 🐍)
  const went = await page.evaluate(() => { MBD.serp().go(); return { x: +MBD.state.x.toFixed(1), z: +MBD.state.z.toFixed(1) }; });
  R.go = went; ck('teleporte na entrada', Math.hypot(went.x - (-660), went.z - 608) < 20, went);
  await page.evaluate(() => MBD.sim(30, 1 / 30));
  await page.waitForFunction(() => MBD.state && MBD.state.draws > 15, { timeout: 15000 }).catch(() => {});
  await sleep(2200);
  await page.screenshot({ path: `${SH}serp-${out}-entrada.png` });

  R.track = await page.evaluate(() => {
    const S = MBD.serp(); const W = { inHome: false };
    const mid = S.at(S.L * 0.35, 0); const bar = S.venue;
    const cars = S.cars.map(c => ({ name: c.racer, type: c.type, drifting: !!c.drifting, spd: +c.spd.toFixed(1), on: Math.abs(S.locate(c.x, c.z).lat) < 14 }));
    const venues = MBD.life().venues.filter(v => v.name === 'Bar da Curva');
    return { L: +S.L.toFixed(0), N: S.N, cars, mid: { x: +mid.x.toFixed(1), z: +mid.z.toFixed(1) }, bar: bar && { name: bar.name, seats: bar.seats.length, x: bar.x, z: bar.z }, fans: S.fanData.length, venueCount: venues.length };
  });
  ck('pista longa (> 800 m)', R.track.L > 800, R.track.L);
  ck('4 rivais na pista', R.track.cars.length === 4 && R.track.cars.every(c => c.on), R.track.cars);
  ck('nomes originais dos rivais', R.track.cars.every(c => c.name && !/tokyo|nissan|mazda|toyota|bmw|ford|honda/i.test(c.name)), R.track.cars);
  ck('Bar da Curva com mesas', R.track.bar && R.track.bar.name === 'Bar da Curva' && R.track.bar.seats >= 6, R.track.bar);
  ck('pista não entra na casa', await page.evaluate(() => { const S = MBD.serp(), H = MBD.home(); for (let s = 0; s < S.L; s += 4) { const p = S.at(s, 0); if (Math.hypot(p.x - (-470), p.z - 650) < 28) return [p.x, p.z]; } return true; }) === true);

  // IA derrapa: simula uns 20 s
  await page.evaluate(() => MBD.sim(400, 1 / 20));
  R.ai = await page.evaluate(() => MBD.serp().cars.map(c => ({ name: c.racer, drift: +c.driftAng.toFixed(2), spd: +c.spd.toFixed(1), moved: c.total > 10 })));
  ck('rivais andam e derrapam', R.ai.every(c => c.moved) && R.ai.some(c => c.drift > 0.15), R.ai);

  // foto da curva com IA + bar
  await page.evaluate(() => {
    const S = MBD.serp(); const r = S.cars[0];
    const p = S.at(r.total - 22, 9);
    MBD.teleport(p.x, p.z, Math.atan2(r.x - p.x, r.z - p.z));
    MBD.setHour(19.2);
  });
  await page.evaluate(() => MBD.sim(20, 1 / 30)); await sleep(2000);
  await page.screenshot({ path: `${SH}serp-${out}-curva-ia.png` });

  // espectadores: de tarde tem gente, de madrugada menos
  R.fans = await page.evaluate(() => {
    const S = MBD.serp();
    const at = (h) => { window.__G.env.setTime(h); S.updateFans(0, h, 0); return S.fanVisible; };
    return { t15: at(15), t3: at(3), t20: at(20), n: S.fanData.length };
  });
  ck('espectadores de tarde/noite, poucos de madrugada', R.fans.t15 + R.fans.t20 > R.fans.t3 && R.fans.t20 > 0, R.fans);

  // foto do bar com espectadores à noite
  await page.evaluate(() => { MBD.setHour(20.5); const B = MBD.serp().venue; MBD.teleport(B.x, B.z - 16, 0); });
  await page.evaluate(() => MBD.sim(80, 1 / 20)); await sleep(2000);
  await page.screenshot({ path: `${SH}serp-${out}-bar.png` });
  R.barPeds = await page.evaluate(() => MBD.crowd().census());

  // sessão de pontuação: entra na pista de carro, HUD aparece, fecha com pontos
  R.session = await page.evaluate(() => {
    const S = MBD.serp();
    const v = MBD.vehicles().find(o => !o.npc && !o.spec.boat && o.type !== 'heli') || MBD.sigCar;
    if (!v) return { err: 'sem carro' };
    const p = S.at(20, 0);
    MBD.enterCar(v); v.place(p.x, p.z, p.h);
    v.vx = Math.sin(p.h) * 25; v.vz = Math.cos(p.h) * 25; v.vf = 25; v.drifting = true; v.driftAng = 0.5;
    MBD.sim(6, 1 / 30);
    const on = S.on; const hud = !document.getElementById('serpHud').hidden;
    const D = window.__G.drift;
    S.session = 0; D.total = 2400; D.chain = 80; D.combo = 2; D.on = true; S.on = true;
    S.endSession();
    const save = JSON.parse(localStorage.getItem('mbd-serpentina-v1') || 'null');
    return { on, hud, save, best: S.data.best, runs: S.data.runs, last: S.data.last };
  });
  ck('HUD da sessão aparece', R.session.hud === true || R.session.on === true, R.session);
  ck('recorde salvo em mbd-serpentina-v1', R.session.save && R.session.save.best > 0 && R.session.save.runs >= 1, R.session.save);
  await page.screenshot({ path: `${SH}serp-${out}-hud.png` });

  // desempenho no circuito
  await page.evaluate(() => { const S = MBD.serp(); const p = S.at(S.L * 0.4, 0); MBD.teleport(p.x, p.z + 12, 0); MBD.setHour(19); MBD.sim(40, 1 / 20); });
  await sleep(1800);
  R.perf = await page.evaluate(() => { const r = window.__G.renderer.info.render; return { calls: r.calls, tris: r.triangles, q: window.__G.Q.level, cpu: MBD.frameStats() }; });
  ck('draw calls ok no low', q !== 'low' || R.perf.calls < 480, R.perf);
  R.layoutTrack = await layout('na pista');
  ck('layout na pista sem sobreposição', R.layoutTrack.overlap.length === 0, R.layoutTrack);

  R.errs = errs.filter(e => !/favicon|ERR_FILE_NOT_FOUND|net::/.test(e));
  ck('0 erros no console', R.errs.length === 0, R.errs);
  R.fail = fail; R.ok = fail.length === 0;
  fs.writeFileSync(`${SH}serp-${out}.json`, JSON.stringify(R, null, 1));
  console.log(JSON.stringify({ ok: R.ok, fail, track: R.track && { L: R.track.L, cars: R.track.cars }, ai: R.ai, fans: R.fans, session: R.session, perf: R.perf, errs: R.errs }, null, 1));
  await browser.close(); process.exit(R.ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
