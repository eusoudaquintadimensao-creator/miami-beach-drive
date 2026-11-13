// Teste: rotinas dos NPCs pelo relógio, bares/restaurantes, gaivotas, presentes com poderes, Liga da Madrugada, desempenho (low) e layout
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = []; const ck = (name, ok, info) => { if (!ok) fail.push(name + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.evaluate(() => { localStorage.removeItem('mbd-presentes-v1'); localStorage.removeItem('mbd-ruas-v1'); });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => localStorage.setItem('mbd-casa-v1', JSON.stringify({ intro: true, visits: 1 })));
  await page.click('#play'); await sleep(1500);
  if (process.env.DBG) await page.evaluate(() => { const o = MBD.sim; window.__nan = []; MBD.sim = (n, dt) => { try { o(n, dt); } catch (e) { window.__nan.push(e.stack + ' P=' + JSON.stringify(window.__G.player, (k, v) => k === 'vehicle' ? !!v : v)); } }; });
  // 1) rotinas: censo em horários diferentes (perto da orla, que tem café, bar e praia)
  R.census = {};
  for (const h of [8, 13, 18, 22, 3]) {
    await page.evaluate((h) => { MBD.setHour(h); MBD.teleport(312, -120, Math.PI); }, h);
    await page.evaluate(() => MBD.sim(700, 1 / 20)); // 35 s: troca de atividade, quem estava na rua vai embora, respawn
    R.census[h] = await page.evaluate(() => MBD.crowd().census());
  }
  const c = R.census; const vis = (h) => c[h].visiveis;
  ck('noite tem menos gente que de dia', vis(3) < vis(13), [vis(3), vis(13)]);
  ck('balada/bar de madrugada', (c[3].atividades.balada || 0) + (c[3].atividades.bar || 0) + (c[22].atividades.balada || 0) + (c[22].atividades.bar || 0) > 0, [c[3].atividades, c[22].atividades]);
  ck('café de manhã', (c[8].atividades.cafe || 0) > 0, c[8].atividades);
  ck('atividades mudam com o relógio', JSON.stringify(Object.keys(c[8].atividades).sort()) !== JSON.stringify(Object.keys(c[22].atividades).sort()));
  ck('gente sentada/conversando/correndo', ['sit', 'chat', 'walk'].every(m => Object.keys(c[13].modos).concat(Object.keys(c[8].modos)).includes(m)), [c[8].modos, c[13].modos]);
  R.venues = await page.evaluate(() => ({ n: MBD.life().venues.length, open13: MBD.life().venues.filter(v => v.open).length }));
  ck('bares e restaurantes >= 12', R.venues.n >= 12, R.venues);
  // foto: terraço da orla na hora do almoço e bar neon à noite
  await page.evaluate(() => { MBD.setHour(13); MBD.teleport(305, 99, Math.atan2(20, -14)); }); await page.evaluate(() => MBD.sim(160, 1 / 20)); await sleep(mobile ? 2600 : 1800);
  await page.screenshot({ path: `${SH}vida-${out}-orla-almoco.png` });
  await page.evaluate(() => { MBD.setHour(21.5); MBD.teleport(305, 539, Math.atan2(20, -14)); }); await page.evaluate(() => MBD.sim(160, 1 / 20)); await sleep(mobile ? 2600 : 1800);
  await page.screenshot({ path: `${SH}vida-${out}-bar-noite.png` });
  // 2) gaivotas: renderizam e se espalham quando chega perto
  await page.evaluate(() => { MBD.setHour(10); MBD.teleport(345, 40, Math.PI / 2); }); const bErr = await page.evaluate(() => { try { MBD.sim(60, 1 / 20); } catch (e) { return e.stack + ' ' + JSON.stringify({ e: window.__G.engine, s: window.__G.skid }); } }); if (bErr) console.log('BERR', bErr);
  R.birds = await page.evaluate(() => { const B = MBD.birds(); return { visible: B.visible, flocks: B.flocks.length }; });
  if (process.env.DBG) console.log('NAN', await page.evaluate(() => window.__nan.slice(0, 2)));
  ck('gaivotas visíveis', R.birds.visible > 0, R.birds);
  await page.evaluate(() => { const f = MBD.birds().flocks[2]; f.state = 'ground'; f.t = 30; }); await page.evaluate(() => MBD.sim(4, 1 / 20));
  const s0 = await page.evaluate(() => MBD.birds().scatters);
  await page.evaluate(() => { const f = MBD.birds().flocks[2]; MBD.teleport(f.x + 3, f.z, 0); }); await page.evaluate(() => MBD.sim(20, 1 / 20));
  R.birds.scatter = await page.evaluate((s0) => MBD.birds().scatters - s0, s0); ck('gaivotas voam ao se aproximar', R.birds.scatter > 0, R.birds);
  await page.evaluate(() => { const f = MBD.birds().flocks[2]; MBD.teleport(f.x - 18, f.z + 6, Math.PI / 2 + 0.3); }); await page.evaluate(() => MBD.sim(10, 1 / 20)); await sleep(mobile ? 2200 : 1500);
  await page.screenshot({ path: `${SH}vida-${out}-gaivotas.png` });
  // 3) presentes: pega cada tipo e confere o poder
  R.gifts = await page.evaluate(() => { const G = MBD.gifts(); return { spots: G.spots.length, types: [...new Set(G.spots.map(s => s.type))].length }; });
  ck('>= 24 presentes, 6 tipos', R.gifts.spots >= 24 && R.gifts.types === 6, R.gifts);
  R.powers = {};
  for (const type of ['superpulo', 'supercorrida', 'prancha', 'planador', 'superforca', 'mochila']) {
    const r = await page.evaluate(async (type) => {
      const G = MBD.gifts(); for (const k in G.active) G.active[k] = 0; if (MBD.jet().on) MBD.jet().set(false, true);
      const s = G.spots.find(o => o.type === type && window.__G.t >= o.next); MBD.teleport(s.x + 0.3, s.z, 0); MBD.sim(3, 1 / 30);
      const got = G.has(type); const out = { got, next: s.next > window.__G.t };
      if (type === 'superpulo') { MBD.sim(10, 1 / 30); MBD.input.jump = true; let maxY = 0; const y0 = MBD.state.y; for (let i = 0; i < 60; i++) { MBD.sim(1, 1 / 30); maxY = Math.max(maxY, MBD.state.y - y0); } out.jump = +maxY.toFixed(2); }
      if (type === 'supercorrida') { MBD.input.stick = [0, 1]; MBD.sim(60, 1 / 30); out.speed = +MBD.state.speed.toFixed(1); MBD.input.stick = null; MBD.sim(10, 1 / 30); }
      if (type === 'prancha') { MBD.sim(20, 1 / 30); const W = await import('/src/world.js'); out.hover = +(MBD.state.y - W.surfaceY(MBD.state.x, MBD.state.z)).toFixed(2); out.board = G.board.visible; }
      if (type === 'planador') { MBD.input.jump = true; MBD.sim(28, 1 / 30); const vys = []; for (let i = 0; i < 20; i++) { MBD.sim(1, 1 / 30); vys.push(window.__G.player.vy); } out.minVy = +Math.min(...vys).toFixed(2); out.glide = G.gliding || G.wing.visible; }
      if (type === 'superforca') { const v = MBD.vehicles().find(o => o.parked && !o.spec.boat && o.type !== 'heli'); const x0 = v.x, z0 = v.z; const s2 = Math.sin(v.h), c2 = Math.cos(v.h); const px = v.x + c2 * 3.2, pz = v.z - s2 * 3.2; MBD.teleport(px, pz, Math.atan2(v.x - px, v.z - pz)); MBD.input.stick = [0, 1]; MBD.sim(30, 1 / 30); MBD.input.stick = null; MBD.sim(30, 1 / 30); out.moved = +Math.hypot(v.x - x0, v.z - z0).toFixed(2); }
      if (type === 'mochila') { out.jet = MBD.jet().on; out.turbo = G.turbo; }
      return out;
    }, type);
    R.powers[type] = r; ck('presente ' + type, r.got && r.next, r);
  }
  ck('superpulo alto', R.powers.superpulo.jump > 3, R.powers.superpulo); ck("supercorrida rápida", R.powers.supercorrida.speed > 10, R.powers.supercorrida);
  ck('prancha flutua', R.powers.prancha.hover > 0.3 && R.powers.prancha.board, R.powers.prancha); ck('planador plana', R.powers.planador.minVy > -3 && R.powers.planador.glide, R.powers.planador);
  ck('superforça empurra carro', R.powers.superforca.moved > 0.5, R.powers.superforca); ck('mochila turbo', R.powers.mochila.jet && R.powers.mochila.turbo, R.powers.mochila);
  R.giftSave = await page.evaluate(() => JSON.parse(localStorage.getItem('mbd-presentes-v1')));
  ck('contador salvo em mbd-presentes-v1', R.giftSave && R.giftSave.total >= 6, R.giftSave);
  await page.evaluate(() => { const G = MBD.gifts(); G.active.prancha = 40; if (MBD.jet().on) MBD.jet().set(false, true); const s = G.spots.find(o => window.__G.t >= o.next); MBD.teleport(s.x - 6, s.z - 4, 0.9); MBD.setHour(19.2); MBD.sim(20, 1 / 30); }); await sleep(mobile ? 2200 : 1500);
  await page.screenshot({ path: `${SH}vida-${out}-presente.png` });
  R.giftHud = await page.evaluate(() => { const e = document.getElementById('giftHud'); const r = e.getBoundingClientRect(); return { hidden: e.hidden, html: e.textContent, r: [r.left, r.top, r.width, r.height].map(Math.round) }; });
  ck('HUD do poder visível', !R.giftHud.hidden && /s/.test(R.giftHud.html), R.giftHud);
  await page.evaluate(() => { const G = MBD.gifts(); for (const k in G.active) G.active[k] = 0; MBD.sim(2); });
  // 4) Liga da Madrugada: à noite, perto do rival, pisca o farol e completa o trajeto
  await page.evaluate(() => { MBD.setHour(22); const R = window.__G.street; const r0 = (window.ROUTES_ = null); MBD.teleport(300, 545, Math.PI); MBD.sim(5, 1 / 30); });
  R.meet = await page.evaluate(() => ({ cars: MBD.street().cars.length, tip: !document.getElementById('stTip').hidden }));
  ck('rival esperando à noite', R.meet.cars >= 1, R.meet);
  await page.evaluate(() => { const v = MBD.vehicles().find(o => o.type === 'sport' && !o.spec.boat) || MBD.vehicles().find(o => !o.spec.boat && o.type !== 'heli' && o.type !== 'moto'); MBD.enterCar(v); v.place(300 + 3.4, 535, Math.PI); MBD.sim(2, 1 / 30); });
  R.flash = await page.evaluate(() => MBD.street().flash());
  ck('desafio aceito ao piscar o farol', R.flash === true, R.flash);
  await page.evaluate(() => MBD.sim(20, 1 / 30)); await sleep(mobile ? 1800 : 1200);
  await page.screenshot({ path: `${SH}vida-${out}-racha-largada.png` });
  // dirige pelo trajeto: teleporta o carro do jogador pelos portões (a física completa já é testada em race.js)
  R.race = await page.evaluate(async () => {
    const S = MBD.street(); const st = S.race; if (!st) return { err: 'sem racha' }; MBD.sim(110, 1 / 30); const go = st.t > 0; const pv = window.__G.player.vehicle; const log = [];
    for (let i = 0; i < st.cps.length; i++) { const c = st.cps[i]; const prev = i ? st.cps[i - 1] : [st.sx, st.sz]; const steps = 8;
      for (let k = 1; k <= steps; k++) { const x = prev[0] + (c[0] - prev[0]) * k / steps, z = prev[1] + (c[1] - prev[1]) * k / steps; pv.place(x, z, Math.atan2(c[0] - prev[0], c[1] - prev[1])); MBD.sim(3, 1 / 30); if (!S.race) break; }
      log.push(S.race ? S.race.k : 'fim'); if (!S.race) break; }
    return { go, log, result: S.lastResult, save: JSON.parse(localStorage.getItem('mbd-ruas-v1') || 'null') };
  });
  ck('racha completo com resultado', R.race.result && R.race.result.win === true, R.race);
  ck('reputação salva em mbd-ruas-v1', R.race.save && R.race.save.rep > 0 && R.race.save.beaten.length === 1, R.race.save);
  await sleep(600); await page.screenshot({ path: `${SH}vida-${out}-racha-resultado.png` });
  R.apply = await page.evaluate(() => { const ok = MBD.street().applyLivery(); const v = window.__G.player.vehicle; return { ok, text: v.tune && v.tune.text }; });
  ck('pintura nova aplicada', R.apply.ok, R.apply);
  await page.evaluate(() => MBD.street().closeResult());
  // 5) desempenho: draw calls no nível baixo, na orla à noite (o lugar mais cheio)
  await page.evaluate(() => { MBD.setHour(21); MBD.teleport(310, -100, Math.PI); MBD.sim(60, 1 / 20); }); await sleep(2500);
  R.perf = await page.evaluate(() => { const r = window.__G.renderer.info.render; return { calls: r.calls, tris: r.triangles, q: window.__G.Q.level, peds: window.__G.crowd.peds.length, fps: MBD.fpsHist ? MBD.fpsHist.slice(-5) : null }; });
  ck('draw calls ok no low', q !== 'low' || R.perf.calls < 420, R.perf);
  R.perf.cpu = await page.evaluate(() => MBD.frameStats());
  // práticas das skills: histerese de rotina, coyote de pulo, física de taxa independente, tremor trauma²
  R.skills = await page.evaluate(() => {
    return (async () => {
      const L = await import('/src/life.js');
      const at = (h, prev) => L.activity('trabalhador', h, prev);
      const histerese = at(12.1, 'trabalho') === 'trabalho' && at(12.5, 'trabalho') === 'almoco';
      // coyote: sai do chão e ainda pula 80 ms depois
      if (window.__G.player.vehicle) window.__G.leaveCar(true);
      MBD.teleport(310, -80, 0);
      const p = window.__G.player; p.grounded = true; p.coyote = 0; p.jumpBuf = 0; p.vy = 0; p.y = 0;
      MBD.sim(1, 1 / 60); p.grounded = false; p.coyote = 0.12; p.y = 0.4; p.vy = -1; MBD.input.jump = true; MBD.sim(2, 1 / 30);
      const coyote = p.vy > 2 && !p.grounded;
      // tremor trauma²
      window.__G.shake(0.5); const mid = window.__G.shakeAmt(); window.__G.shake(0); const amt = mid;
      // taxa: 2 s a 30 e 60 Hz, mesma avenida reta, diferença pequena
      if (window.__G.player.vehicle) window.__G.leaveCar(true); const v = MBD.vehicles().find(o => o.type === 'sport' && !o.driver && !o.spec.boat) || MBD.sigCar; const go = (dt, n) => { if (!v) return null; MBD.enterCar(v); v.place(-860, -100, 0); v.vx = v.vz = v.vf = 0; v.nitro = 0; v._acc = 0; v.parked = false; MBD.input.stick = [0, 1]; MBD.nitro(false); MBD.sim(n, dt); const r = { x: +v.x.toFixed(2), z: +v.z.toFixed(2), vf: +v.vf.toFixed(2) }; window.__G.leaveCar(true); MBD.input.stick = null; return r; };
      const a30 = go(1 / 30, 60), a60 = go(1 / 60, 120);
      const rate = a30 && a60 ? Math.hypot(a30.x - a60.x, a30.z - a60.z) : 99;
      return { histerese, coyote, trauma: amt, mid, a30, a60, rate: +rate.toFixed(2), cpu: MBD.frameStats() };
    })();
  });
  ck('histerese da rotina (não pisca na fronteira)', R.skills.histerese, R.skills);
  ck('coyote time do pulo', R.skills.coyote, R.skills);
  ck('física quase igual a 30 e 60 Hz (< 4 m em 2 s)', R.skills.rate < 4, R.skills);
  R.errs = errs.filter(e => !/favicon|ERR_FILE_NOT_FOUND|net::/.test(e)); ck('0 erros no console', R.errs.length === 0, R.errs);
  R.fail = fail; R.ok = fail.length === 0;
  fs.writeFileSync(`${SH}vida-${out}.json`, JSON.stringify(R, null, 1));
  console.log(JSON.stringify({ ok: R.ok, fail, census: Object.fromEntries(Object.entries(R.census).map(([h, c]) => [h, c.visiveis + ' ' + JSON.stringify(c.atividades)])), perf: R.perf, powers: R.powers, race: R.race && R.race.log }, null, 0));
  await browser.close(); process.exit(R.ok ? 0 : 1);
})().catch(e => { console.error('FATAL', e); process.exit(2); });
