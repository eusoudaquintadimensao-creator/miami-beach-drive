// t433: o jogo não pode "sair sozinho" para a tela inicial.
// 1) deixar gráficos leves não recarrega; 2) recarregar a página retoma o jogo na mesma posição; 3) "voltar" do Android abre a pausa;
// 4) perda do contexto WebGL é recuperada sem voltar ao menu; 5) nenhum erro.
const puppeteer = require('puppeteer-core');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const PORT = process.env.PORT || 8765;
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource|context/i.test(m.text())) errs.push(m.text()); });
  let navs = 0; p.on('framenavigated', f => { if (f === p.mainFrame()) navs++; });
  const fail = []; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  const until = async (fn, ms = 60000) => { try { await p.waitForFunction(fn, { timeout: ms, polling: 250 }); return true; } catch (e) { return false; } };
  const url = `http://localhost:${PORT}/?q=${q}&resume=1`;
  await p.goto(url, { waitUntil: 'load' }); await until('window.MBD_READY === true', 180000);
  ck('primeira abertura mostra o menu (sem jogo salvo)', await p.evaluate(() => !MBD.flags.started && !document.getElementById('start').hidden));
  await (mobile ? p.tap('#play') : p.click('#play')); await until('MBD.flags.started === true');
  await p.evaluate(() => { MBD.teleport(312, -120, 1.1); }); await sleep(1500);
  const pos0 = await p.evaluate(() => ({ x: MBD.state.x, z: MBD.state.z }));
  // 1) ficar leve não recarrega
  const n0 = navs; await p.evaluate(() => { window.__marca = 1; MBD.lighten(); }); await sleep(3000);
  ck('modo leve ao vivo sem recarregar a página', navs === n0 && await p.evaluate(() => window.__marca === 1 && MBD.flags.started && MBD.flags.lightened && !MBD.perf().shadows), { navs: navs - n0 });
  ck('próxima abertura lembra o modo leve', await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /solara-v1|nd-save-v1/.test(k)))).autoQ === 'low'));
  // 3) voltar do Android
  await p.goBack().catch(() => { }); await sleep(1200);
  ck('botão voltar abre a pausa em vez de sair', await p.evaluate(() => window.__marca === 1 && MBD.flags.started && MBD.flags.pauseOpen), await p.evaluate(() => MBD.flags));
  await p.evaluate(() => { const b = document.querySelector('#pauseMenu [data-k=resume], #pause [data-k=resume]'); if (b) b.click(); else if (window.__G && __G.closePause) __G.closePause(); }); await sleep(500);
  // 4) contexto WebGL perdido e recuperado
  const lost = await p.evaluate(async () => { const gl = __G.renderer.getContext(); const ext = gl.getExtension('WEBGL_lose_context'); if (!ext) return 'sem-ext'; ext.loseContext(); await new Promise(r => setTimeout(r, 1500)); ext.restoreContext(); await new Promise(r => setTimeout(r, 4000)); return 'ok'; });
  const t1 = await p.evaluate(() => __G.t); await sleep(2500); const t2 = await p.evaluate(() => __G.t);
  ck('contexto WebGL perdido/recuperado: continua jogando (sem menu)', lost !== 'ok' || (await p.evaluate(() => MBD.flags.started && document.getElementById('start').hidden && MBD.flags.ctxLost >= 1) && t2 > t1), { lost, t1, t2 });
  await p.screenshot({ path: `/workspace/t361-prints/t433-${process.env.GAME || 'solara'}-${out}-contexto.png` });
  // 2) recarregar retoma o jogo
  await p.evaluate(() => MBD.persist()); await p.reload({ waitUntil: 'load' }); await until('window.MBD_READY === true', 180000);
  const okR = await until('MBD.flags.started === true && MBD.flags.resumed === true', 15000);
  const pos1 = await p.evaluate(() => ({ x: MBD.state.x, z: MBD.state.z, menu: !document.getElementById('start').hidden }));
  ck('recarregar a página volta direto para o jogo, na mesma posição', okR && !pos1.menu && Math.hypot(pos1.x - pos0.x, pos1.z - pos0.z) < 6, { pos0, pos1 });
  await sleep(1500); await p.screenshot({ path: `/workspace/t361-prints/t433-${process.env.GAME || 'solara'}-${out}-retomou.png` });
  // ?menu força a tela inicial
  await p.goto(`http://localhost:${PORT}/?q=${q}&resume=1&menu`, { waitUntil: 'load' }); await until('window.MBD_READY === true', 180000); await sleep(800);
  ck('?menu mostra a tela inicial', await p.evaluate(() => !MBD.flags.started));
  ck('sem erros', !errs.length, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.length + ' ' + fail.join(' | ') : 'PASS t433 ' + out); await b.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.log('FATAL', e); process.exit(2); });
