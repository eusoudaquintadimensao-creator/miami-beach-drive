// t437: só o trecho da ponte do t361 (layout Desistir × legenda do rádio), para conferir com o box carregado
const puppeteer = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const [,, W = 390, H = 844, tag = 'i'] = process.argv; const mobile = Math.min(+W, +H) < 600;
(async () => { const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  if (mobile) await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1');
  await page.goto('http://localhost:8765/?q=low'); const t0 = Date.now(); while (Date.now() - t0 < 400000 && !(await page.evaluate(() => window.MBD_READY === true).catch(() => false))) await sleep(1000);
  await page.evaluate(() => document.getElementById('play').click()); await sleep(1500);
  const ev = (f, ...a) => page.evaluate(f, ...a); const R = {};
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
      o.ov = [...new Set(ov)]; o.box = box.filter(b => ['ponteHud', 'radioSub', 'ponteQuit'].includes(b.id)); o.off = box.filter(b => ['ponteHud', 'radioSub', 'ponteQuit'].includes(b.id) && (b.r[0] < 0 || b.r[2] > innerWidth || b.r[3] > innerHeight)).map(b => b.id); return o; });
  await page.screenshot({ path: `/workspace/t435/t437-ponte-${tag}.png` });
  const ok = R.p1.quitVis && R.p1.box.length === 3 && R.p1.ov.length === 0 && R.p1.off.length === 0; console.log((ok ? 'PASS ' : 'FAIL ') + tag + ' ' + JSON.stringify({ ov: R.p1.ov, off: R.p1.off, quit: R.p1.quitVis, box: R.p1.box })); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
