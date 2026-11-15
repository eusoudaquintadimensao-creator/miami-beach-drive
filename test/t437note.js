// t437: lógica do recado-notificação com relógio FALSO (independe da carga do box): rAF trocado por quadros simulados de 16,7 ms.
const puppeteer = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const [,, W = 1280, H = 720, tag = 'd'] = process.argv; const mobile = Math.min(+W, +H) < 600; const PORT = process.env.PORT || 8765;
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile }); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto(`http://localhost:${PORT}/?q=low`); const t0 = Date.now(); while (Date.now() - t0 < 300000 && !(await p.evaluate(() => window.MBD_READY === true).catch(() => false))) await sleep(1000);
  await p.evaluate(() => document.getElementById('play').click()); await sleep(1000);
  // jogo PAUSADO: o laço só redesenha a cada 0,25 s, então o requestAnimationFrame roda solto (~60 Hz) mesmo com o box carregado
  await p.evaluate(() => window.__G.openPause());
  const t1 = Date.now(); while (Date.now() - t1 < 240000) { const d = await p.evaluate(() => { const l = window.__G.solLog || []; return l.length >= 3 && l.every(x => x.off) && !document.querySelector('.solNote'); }); if (d) break; await sleep(500); }
  await sleep(1200);
  const R = await p.evaluate(async () => {
    const G = window.__G, out = {}; out.drained = G.solLog.map(x => x.vis);
    const L0 = G.solLog.length; const s0 = performance.now(); G.solaraNote('teste A'); await new Promise(r => setTimeout(r, 60));
    const a = document.querySelector('.solNote'); out.aOn = !!a && /teste A/.test(a.textContent); out.pe = a && getComputedStyle(a).pointerEvents; out.img = !!(a && a.querySelector('.shAv img'));
    while (performance.now() - s0 < 20000 && !G.solLog[L0].off) await new Promise(r => setTimeout(r, 50));
    out.aVis = G.solLog[L0].vis; out.aSec = +((G.solLog[L0].off - G.solLog[L0].on) / 1000).toFixed(2);
    await new Promise(r => setTimeout(r, 1200));
    const L1 = G.solLog.length; G.solaraNote('teste B'); await new Promise(r => setTimeout(r, 300)); const v0 = G.solLog[L1].vis || 0;
    const f0 = performance.now(); while (performance.now() - f0 < 3000) { } // travada de 3 s (compilação de shader, aparelho engasgado)
    await new Promise(r => setTimeout(r, 80)); out.bJump = +((G.solLog[L1].vis || 0) - v0).toFixed(2); out.bOpenAfterFreeze = !G.solLog[L1].off;
    const s1 = performance.now(); while (performance.now() - s1 < 20000 && !G.solLog[L1].off) await new Promise(r => setTimeout(r, 50)); out.bVis = G.solLog[L1].vis;
    return out; });
  await p.evaluate(() => window.__G.closePause());
  const ok = R.aOn && R.pe === 'none' && R.img && R.aVis >= 2.3 && R.aVis <= 2.6 && R.aSec >= 2.2 && R.aSec <= 4.5 && R.bOpenAfterFreeze && R.bJump <= 0.25 && R.bVis >= 2.3 && R.bVis <= 2.6 && !errs.length;
  console.log((ok ? 'PASS ' : 'FAIL ') + tag + ' ' + JSON.stringify({ R, errs })); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
