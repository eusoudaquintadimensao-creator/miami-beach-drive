// t437: layout determinístico Desistir × legenda do rádio × painel da ponte (sem depender da corrida andar com o box carregado)
const puppeteer = require('puppeteer-core'); const sleep = ms => new Promise(r => setTimeout(r, ms));
const [,, W = 390, H = 844, tag = 'i'] = process.argv; const mobile = Math.min(+W, +H) < 600;
(async () => { const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1 });
  await page.goto('http://localhost:8765/?q=low'); const t0 = Date.now(); while (Date.now() - t0 < 400000 && !(await page.evaluate(() => window.MBD_READY === true).catch(() => false))) await sleep(1000);
  await page.evaluate(() => document.getElementById('play').click()); await sleep(1500);
  const R = await page.evaluate(async () => {
    const $ = (i) => document.getElementById(i), P = MBD.ponte(), out = [];
    const variants = { estreito: '<b>🌉 PONTE DO MAR</b> volta 1/2 · 0:06.8 · 🏁 18% · 🛣️ 0,2 km · faltam 18,4 km · 3º/6<small>0 pts · volta 4,2/11,3 km · melhor -:-- · 4/5 em drift</small>',
      largo: '<b>🌉 PONTE DO MAR</b> volta 1/2 · 0:06.8 · 🏁 18% · 🛣️ 0,2 km · faltam 18,4 km · 3º/6 · recorde 3:12.4 · combo x4<small>0 pts · volta 4,2/11,3 km · melhor -:-- · 4/5 em drift · vento a favor</small>' };
    for (const [n, h] of Object.entries(variants)) {
      document.body.classList.add('ponteOn'); const hud = $('ponteHud'), qb = $('ponteQuit'), sub = $('radioSub');
      hud.hidden = false; hud.innerHTML = h; if (n === 'largo') hud.style.width = (innerWidth - 40) + 'px'; else hud.style.width = '';
      qb.hidden = false; qb.style.left = qb.style.top = ''; P.placeQuit();
      sub.hidden = false; sub.innerHTML = '<b>📻 Tchê Trovão</b><span>Bah, que top teu drift! Até as gaivotas aplaudiram!</span>'; P.radio.place();
      await new Promise(r => setTimeout(r, 50));
      const rc = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
      const A = { hud: rc(hud), quit: rc(qb), sub: rc(sub) }; const ov = (a, c) => Math.min(a[2], c[2]) - Math.max(a[0], c[0]) > 2 && Math.min(a[3], c[3]) - Math.max(a[1], c[1]) > 2;
      out.push({ n, ...A, subXquit: ov(A.sub, A.quit), subXhud: ov(A.sub, A.hud), quitXhud: ov(A.quit, A.hud), subLow: A.sub[3] > innerHeight * 0.5 });
    }
    return out; });
  const ok = R.every(x => !x.subXquit && !x.subXhud && !x.quitXhud && !x.subLow);
  console.log((ok ? 'PASS ' : 'FAIL ') + tag + ' ' + JSON.stringify(R)); await b.close(); process.exit(ok ? 0 : 1);
})().catch(e => { console.log('FATAL', e.message); process.exit(2); });
