// Teste t386: orla viva — academia (minijogo/recordes), futebol e tênis com figurantes, rotinas por hora, roda do pôr do sol, músicos e pedidos. Uso: node test/t386.js W H q tag
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
  const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${SH}praia-${GAME}-${out}-${name}.png` }); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });
  const ev = (f, ...a) => page.evaluate(f, ...a);
  await ev(() => {
    window.__ad = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
    window.__car = () => { const G = window.__G; const v0 = G.player.vehicle; if (v0 && !v0.spec.air && !v0.spec.boat) return v0; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); }
      if (v0 || G.player.swim || G.player.inWater) { MBD.teleport(300, -150, 0); MBD.sim(3, 1 / 30); }
      MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return G.player.vehicle; };
    window.__onFoot = (x, z) => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.teleport(x, z, 0); MBD.sim(3, 1 / 30); };
    window.__box = (ids, focus) => { const box = []; for (const id of ids) { const el = document.getElementById(id); if (!el || el.hidden) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; box.push({ id, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
      const ov = []; for (const a of box) if (focus.includes(a.id)) for (const b of box) { if (a === b) continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(a.id + '×' + b.id); }
      const off = box.filter(b => focus.includes(b.id) && (b.r[0] < -1 || b.r[2] > innerWidth + 1 || b.r[3] > innerHeight + 1 || b.r[1] < -1)).map(b => b.id); return { ov: [...new Set(ov)], off, vis: box.map(b => b.id) }; };
  });

  const UI = ['ponteHud', 'radioSub', 'ponteQuit', 'topR', 'speedo', 'mapw', 'driftW', 'nitroW', 'bAct', 'bNeutral', 'bReset', 'stTip', 'boatTip', 'boatHud', 'stHud', 'turnCue', 'quick', 'icons', 'drvGear', 'drvWheel', 'drvCruise', 'heliHud'];
  const CARD = ['orlaCard', 'gymGame', ...UI];
  // 1) zonas reservadas sem guarda-sóis; orla montada
  R.a = await ev(() => { const O = MBD.orla(), B = MBD.beach(); const keep = [[346, 95, 11, 10], [356, -210, 12, 23], [353, 464, 17, 18], [372, -60, 8, 8]]; const inK = ([x, z]) => keep.some(([a, b, w, l]) => Math.abs(x - a) < w && Math.abs(z - b) < l);
    return { figs: O.figs.length, spots: O.spots.length, umbIn: B.umb.filter(inK).length, kites: B.kites.filter(k => inK([k.f.x, k.f.z])).length, flags: O.flagZ.length }; });
  ck('orla: academia, arena, tênis, roda, músicos e pedidos montados (zonas livres de guarda-sóis)', R.a.figs >= 30 && R.a.spots >= 9 && R.a.umbIn === 0 && R.a.kites === 0 && R.a.flags === 9, R.a);
  // 2) academia: cartão perto do supino, minijogo pelo E/botão, recompensa e recorde
  R.g = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(10); G.save.money = 100; const m0 = G.save.money, f0 = G.save.followers; window.__onFoot(O.st_bench.x, O.st_bench.z + 1.2); MBD.sim(3, 1 / 30);
    const card = O.focus && O.focus.id; const cardVis = !document.getElementById('orlaCard').hidden; return { card, cardVis, m0, f0 }; });
  await shot('academia-cartao');
  R.g.box1 = await ev((C) => window.__box(C, ['orlaCard']), CARD);
  R.g2 = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.onActTap ? MBD.onActTap(1) : O.act(); const started = !!O.game && O.game.kind === 'supino'; const heroHidden = !G.hero.g.visible; const gameVis = !document.getElementById('gymGame').hidden;
    let hits = 0; for (let k = 0; k < 600 && O.game && hits < 6; k++) { MBD.sim(1, 1 / 30); const g = O.game; if (g && g.rep === 0 && Math.abs(g.u - 0.5) < 0.03) { document.getElementById('ggGo').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); hits++; } }
    for (let k = 0; k < 20; k++) MBD.sim(1, 1 / 30); return { started, heroHidden, gameVis, hits, reps: O.game && O.game.reps }; });
  await shot('academia-supino');
  R.g2.box = await ev((C) => window.__box(C, ['gymGame']), CARD);
  R.g3 = await ev(() => { const G = window.__G, O = MBD.orla(); const g = O.game; if (g) { g.u = 0.02; O.tap(); O.tap(); O.tap(); MBD.sim(2, 1 / 30); } return { over: !O.game, last: O.last, best: O.st.best.supino, money: G.save.money, fol: G.save.followers, heroBack: G.hero.g.visible, gameHidden: document.getElementById('gymGame').hidden }; });
  ck('academia: cartão “Supino” perto do banco, sem sobrepor a interface', R.g.card === 'supino' && R.g.cardVis && R.g.box1.ov.length === 0 && R.g.box1.off.length === 0, R.g);
  ck('academia: minijogo abre (herói deitado no banco), acertos no verde contam repetições', R.g2.started && R.g2.heroHidden && R.g2.gameVis && R.g2.reps >= 5 && R.g2.box.ov.length === 0 && R.g2.box.off.length === 0, R.g2);
  ck('academia: 3 erros encerram, recompensa em dinheiro/seguidores e recorde salvo', R.g3.over && R.g3.last.reps >= 5 && R.g3.best >= 5 && R.g3.money > R.g.m0 && R.g3.fol > R.g.f0 && R.g3.heroBack && R.g3.gameHidden, R.g3);
  // barra fixa e corrida (teclado: Espaço)
  R.b = await ev(() => { const O = MBD.orla(); window.__onFoot(O.st_pull.x, O.st_pull.z + 1); MBD.sim(2, 1 / 30); const card = O.focus && O.focus.id; O.act(); let n = 0; for (let k = 0; k < 600 && O.game && n < 4; k++) { MBD.sim(1, 1 / 30); const g = O.game; if (g && g.rep === 0 && Math.abs(g.u - 0.5) < 0.03) { O.tap(); n++; } } MBD.sim(8, 1 / 30); return { card, reps: O.game && O.game.reps }; });
  await shot('academia-barra');
  await ev(() => MBD.orla().finish(true));
  R.r = await ev(() => { const O = MBD.orla(), G = window.__G; window.__onFoot(O.st_run.x, O.st_run.z + 1); MBD.sim(2, 1 / 30); const card = O.focus && O.focus.id; O.act(); return { card, kind: O.game && O.game.kind }; });
  for (let i = 0; i < 40; i++) { await page.keyboard.press('Space'); await ev(() => MBD.sim(4, 1 / 30)); }
  await shot('academia-corrida');
  R.r2 = await ev(() => { const O = MBD.orla(), G = window.__G; let t = 0; while (O.game && t < 2400) { MBD.sim(1, 1 / 30); if (t % 3 === 0) O.tap(); t++; } return { last: O.last, best: O.st.best.corrida, folego: O.st.folego, p: [G.player.x, G.player.z], walk: !!(window.__G.player && true) }; });
  ck('academia: barra fixa com repetições', R.b.card === 'barra' && R.b.reps >= 3, R.b);
  ck('academia: corrida de 150 m na areia (toques/Espaço), tempo e recorde', R.r.card === 'corrida' && R.r.kind === 'corrida' && R.r2.last.dist >= 149.9 && R.r2.best > 5 && R.r2.best < 60 && R.r2.folego > 1, R.r2);
  // 3) futebol e tênis
  R.s = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(15); window.__onFoot(342, -222); G.camYaw = Math.PI / 2 + 0.3; G.camPitch = 0.25; const k0 = O.soc.kicks; const b0 = { ...O.soc.ball }; for (let i = 0; i < 300; i++) MBD.sim(1, 1 / 30); const b = O.soc.ball; return { kicks: O.soc.kicks - k0, moved: Math.hypot(b.x - b0.x, b.z - b0.z) > 0.5, inside: Math.abs(b.x - 356) < 11, open: O.soc.open, players: O.players.length, score: [O.soc.a, O.soc.b], goals: O.soc.goals }; });
  await shot('futebol');
  R.t = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(16); window.__onFoot(334, 452); G.camYaw = Math.PI / 2 + 0.3; G.camPitch = 0.2; const r0 = O.courts.map(c => c.rallies || 0); for (let i = 0; i < 300; i++) MBD.sim(1, 1 / 30); return { rallies: O.courts.map((c, i) => (c.rallies || 0) - r0[i]), open: O.tenOpen, ballY: O.tballs.map(m => +m.position.y.toFixed(2)) }; });
  await shot('tenis');
  R.t2 = await ev(() => { const O = MBD.orla(); MBD.setHour(20.5); MBD.sim(5, 1 / 30); const lit = O.lampM.emissiveIntensity > 0, open = O.tenOpen; MBD.setHour(3); MBD.sim(5, 1 / 30); return { lit, open, lateOpen: O.tenOpen, lateLit: O.lampM.emissiveIntensity > 0, soc: O.soc.open }; });
  ck('futebol: 10 figurantes (ou 8 no leve), bola rolando, chutes e gols no placar', R.s.open && R.s.players >= 8 && R.s.kicks >= 5 && R.s.moved && R.s.inside, R.s);
  ck('tênis: duas quadras com trocas de bola', R.t.open && R.t.rallies.every(n => n >= 3), R.t);
  ck('tênis/futebol: refletores acesos à noite; de madrugada tudo fecha', R.t2.lit && R.t2.open && !R.t2.lateOpen && !R.t2.lateLit && !R.t2.soc, R.t2);
  // 4) rotinas por hora
  R.h = await ev(() => { const B = MBD.beach(); window.__onFoot(330, 0); const at = (h) => { MBD.setHour(h); MBD.sim(2, 1 / 30); return B.counts(); }; return { dawn: at(6.2), morning: at(8), noon: at(12.5), dusk: at(19.2), night: at(23) }; });
  ck('rotinas: corredores cedo, banhistas ao meio-dia, praia vazia à noite', (R.h.dawn.jog || 0) > (R.h.dawn.lie || 0) && (R.h.noon.lie || 0) > (R.h.dawn.lie || 0) && (R.h.noon.swim || 0) > 0 && (R.h.night.lie || 0) === 0 && (R.h.night.swim || 0) === 0 && (R.h.dusk.jog || 0) > 0, R.h);
  // 5) roda do pôr do sol + músico + pedido
  R.e = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(12); MBD.sim(2, 1 / 30); const noon = O.rodaOn; MBD.setHour(18.4); window.__onFoot(366, -60); G.camYaw = Math.PI / 2; G.camPitch = 0.15; MBD.sim(20, 1 / 30); const f0 = G.save.followers; const card = O.focus && O.focus.id; O.act(); return { noon, on: O.rodaOn, card, gain: G.save.followers - f0, vis: O.rodaStatic.visible }; });
  await shot('roda-por-do-sol');
  R.m = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(11); const f = O.musos[0]; window.__onFoot(f.x - 1.6, f.z); G.camYaw = Math.PI / 2 + 0.6; MBD.sim(10, 1 / 30); G.save.money = 50; const card = O.focus && O.focus.id; O.act(); MBD.sim(10, 1 / 30); return { card, money: G.save.money, tips: f.tips }; });
  await shot('musico');
  R.q = await ev(() => { const G = window.__G, O = MBD.orla(); MBD.setHour(15); const q = O.quests.find(q => q.id === 'bola'); q.cd = 0; q.state = 'idle'; window.__onFoot(q.gx - 1.2, q.gz); MBD.sim(3, 1 / 30); const card = O.focus && O.focus.id; O.act(); MBD.sim(1, 1 / 30); const s1 = q.state; const star = q.star.visible;
    window.__onFoot(q.tx - 0.8, q.tz); MBD.sim(3, 1 / 30); const s2 = q.state; const m0 = G.save.money; window.__onFoot(q.gx - 1.2, q.gz); MBD.sim(3, 1 / 30); const card2 = O.focus && O.focus.id; O.act(); return { card, s1, star, s2, card2, s3: q.state, gain: G.save.money - m0, done: O.st.quests }; });
  R.q2 = await ev(() => { const G = window.__G, O = MBD.orla(); const q = O.quests.find(q => q.id === 'coco'); q.cd = 0; q.state = 'idle'; window.__onFoot(q.gx - 1.4, q.gz); MBD.sim(3, 1 / 30); const card = O.focus && O.focus.id; O.act(); window.__onFoot(q.tx - 2, q.tz); MBD.sim(3, 1 / 30); return { card, s: q.state, cd: q.cd > 0 }; });
  ck('roda do pôr do sol só no fim da tarde, entrar dá seguidores', !R.e.noon && R.e.on && R.e.vis && R.e.card === 'roda' && R.e.gain >= 25, R.e);
  ck('músico de rua: gorjeta de 5', R.m.card === 'muso0' && R.m.money === 45 && R.m.tips === 1, R.m);
  ck('pedidos: bola na beira do mar (aceitar → buscar → devolver → recompensa)', R.q.card === 'q-bola' && R.q.s1 === 'go' && R.q.star && R.q.s2 === 'back' && R.q.card2 === 'q-bola' && R.q.s3 === 'idle' && R.q.gain === 60, R.q);
  ck('pedidos: água de coco para o salva-vidas', R.q2.card === 'q-coco' && R.q2.s === 'idle' && R.q2.cd, R.q2);
  // 6) visão geral da orla + desempenho
  await ev(() => { const G = window.__G; MBD.setHour(16.5); window.__onFoot(318, 60); G.camYaw = Math.PI / 2 + 0.75; G.camPitch = 0.32; MBD.sim(20, 1 / 30); });
  await sleep(1500); await shot('orla-geral');
  R.p = await ev(() => { const G = window.__G; const t0 = performance.now(); for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); const ms = (performance.now() - t0) / 60; return { ms: +ms.toFixed(2), calls: G.renderer ? G.renderer.info.render.calls : null, fs: G.frameStats ? G.frameStats() : null }; });
  ck('desempenho: passo de simulação na orla dentro do limite', R.p.ms < (mobile ? 60 : 45), R.p);

  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
