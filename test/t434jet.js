// t434: Copa Jet Maré — jet ski de aluguel, corrida com moedas, anéis (pontos/turbo), rampas (salto), cronômetro, prêmio.
const puppeteer = require('puppeteer-core');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const PORT = process.env.PORT || 8765, GAME = process.env.GAME || 'solara';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  const errs = []; p.on('pageerror', e => errs.push('PAGE: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const fail = []; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  const until = async (fn, ms = 60000) => { try { await p.waitForFunction(fn, { timeout: ms, polling: 250 }); return true; } catch (e) { return false; } };
  await p.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' }); await until('window.MBD_READY === true', 180000);
  await (mobile ? p.tap('#play') : p.click('#play')); await until('MBD.flags.started === true');
  const info = await p.evaluate(() => { const J = MBD.jetRace(); return { bad: J.bad, L: Math.round(J.L), cx: Math.round(J.cx), cz: Math.round(J.cz), parked: J.parked.length, items: J.items.length, coins: J.coinPos.length }; });
  ck('circuito de jet ski todo no mar, com píer de aluguel', info.bad === 0 && info.parked === 2 && info.L > 500, info);
  await p.evaluate(() => { MBD.setHour(15); const J = MBD.jetRace(), v = J.parked[0]; MBD.teleport(J.start.x, J.start.z, J.start.h); MBD.enterCar(v); v.place(J.start.x, J.start.z, J.start.h); });
  await sleep(1500);
  ck('aviso para aceitar a corrida aparece de jet ski', await until('!document.getElementById("jetTip").hidden', 15000));
  const money0 = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /solara-v1|nd-save-v1/.test(k))) || '{}').money || 0);
  await p.evaluate(() => document.querySelector('#jetTip [data-k=ok]').click());
  ck('corrida começou (HUD com tempo e pontos)', await until('MBD.jetRace().race && !document.getElementById("jetHud").hidden', 10000));
  await p.screenshot({ path: `/workspace/t361-prints/t434-${GAME}-${out}-jet-largada.png` });
  // piloto automático do teste: acelera e aponta para a rota
  await until('MBD.jetRace().race && MBD.jetRace().race.t > 0.2', 30000);
  await p.evaluate(() => { const G = __G; window.__ap = setInterval(() => { const v = G.player.vehicle, J = MBD.jetRace(), R = J.race; if (!v || !R) return; const nx = J.items[R.idx % J.items.length]; const tx = nx.x, tz = nx.z; const want = Math.atan2(tx - v.x, tz - v.z); let d = want - v.h; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; v.h += Math.max(-0.12, Math.min(0.12, d * 0.5)); MBD.input.stick = [0, 1]; }, 60); });
  if (!mobile) await p.keyboard.down('KeyW');
  let st = null; for (let i = 0; i < 100; i++) { await sleep(1000); st = await p.evaluate(() => { const R = MBD.jetRace().race; return R && { prog: Math.round(R.prog), pts: R.pts, coins: R.coins, rings: R.rings, boosts: R.boosts, jumps: R.jumps, t: +R.t.toFixed(1), place: R.place, jy: +((__G.player.vehicle.jy) || 0).toFixed(2) }; }); if (!st) break; if (st.boosts && st.rings && st.coins && st.jumps) break; if (st.jy > 0.3 && !globalThis.__shotJ) { globalThis.__shotJ = 1; await p.screenshot({ path: `/workspace/t361-prints/t434-${GAME}-${out}-jet-salto.png` }); } }
  await p.screenshot({ path: `/workspace/t361-prints/t434-${GAME}-${out}-jet-corrida.png` });
  ck('anda pelo circuito: moedas, anéis dourados, turbo e salto na rampa', st && st.prog > 100 && st.coins > 0 && st.rings > 0 && st.boosts > 0 && st.jumps > 0, st);
  ck('cronômetro corre', st && st.t > 3, st && st.t);
  // termina (pula para a reta final) e confere prêmio
  await p.evaluate(() => { const J = MBD.jetRace(); J.race.prog = J.total - 1; for (const a of J.race.ais) a.s = Math.min(a.s, J.total - 60); });
  await until('!MBD.jetRace().race', 20000); if (!mobile) await p.keyboard.up('KeyW');
  const last = await p.evaluate(() => MBD.jetRace().last); await p.evaluate(() => MBD.persist());
  const money1 = await p.evaluate(() => JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /solara-v1|nd-save-v1/.test(k))) || '{}').money || 0);
  ck('chegada com colocação, pontos e prêmio em dinheiro', last && last.place >= 1 && last.prize > 0 && money1 - money0 >= last.prize, { last, money0, money1 });
  ck('sem erros', !errs.length, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.length + ' ' + fail.join(' | ') : 'PASS t434jet ' + out); await b.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.log('FATAL', e); process.exit(2); });
