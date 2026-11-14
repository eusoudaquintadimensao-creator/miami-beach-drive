// Teste t332: ponte de drift sobre o mar (Ponte do Mar) — volta 8–12 km (~10 min), aceitar a até 50 m do pórtico,
// 5 IAs em tandem (fumaça + marcas), rádio pt-BR (legenda + mp3 com filtro), voltas/recorde (localStorage), respawn, desempenho em baixa, layout.
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const PORT = process.env.PORT || 8765;
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600;
const SH = process.env.SHOTS || '/workspace/miami-mundo-aberto/screenshots/';
const KEY = process.env.KEYP || 'mbd';
const PK = process.env.PKEY || 'mbd-ponte-v1';
const sleep = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SH, { recursive: true });
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage();
  await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const fail = []; const R = {}; const ck = (n, ok, info) => { if (!ok) fail.push(n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K, P) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); localStorage.removeItem(P); }, KEY, PK);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });
  await page.evaluate(() => { const G = window.__G; G.audio.init && G.audio.init(); window.__ad = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; }; });

  // 1) traçado: comprimento, estimativa, raio mínimo, rampa ligada à cidade
  R.track = await page.evaluate(() => { const P = MBD.ponte(); const e = P.estimate || P.lapEstimate(); return { L: Math.round(P.L), rampL: Math.round(P.ramp.L), estT: Math.round(e.t), estKmh: +(P.L / e.t * 3.6).toFixed(1), chunks: P.chunks.length, gate: [P.ramp.at(0).x, P.ramp.at(0).z].map(Math.round) }; });
  ck('lap length 8-12 km', R.track.L >= 8000 && R.track.L <= 12000, R.track.L);
  ck('estimate 8-12 min', R.track.estT >= 480 && R.track.estT <= 720, R.track.estT);

  // 2) fluxo: botão 🌉 a pé perto do pórtico → carro vem → entrar → "Aceitar" (até 50 m) → sessão
  R.flow = await page.evaluate(async () => {
    const G = window.__G, P = MBD.ponte(); MBD.setHour(20.8); if (G.player.vehicle) MBD.leaveCar(true);
    document.getElementById('qPonte').click(); const o = { call: !!G.carCall };
    for (let i = 0; i < 120 && G.carCall; i++) MBD.sim(1, 1 / 30);
    o.arrived = !G.carCall && !!G.sigCar; MBD.onActTap(1); MBD.sim(3, 1 / 30); o.inCar = !!G.player.vehicle;
    o.gateD = Math.round(P.nearGate()); MBD.sim(2, 1 / 30); o.lbl = document.getElementById('bAct').textContent; o.can = P.canAccept();
    // a 49 m ainda aceita; a 60 m não
    const v = G.player.vehicle; const p0 = P.ramp.at(0); const h = p0.h;
    v.place(p0.x - Math.sin(h) * 49, p0.z - Math.cos(h) * 49, h); MBD.sim(1, 1 / 30); o.d49 = Math.round(P.nearGate()); o.can49 = P.canAccept() || P.nearGate() > 50;
    v.place(p0.x - Math.sin(h) * 75, p0.z - Math.cos(h) * 75, h); MBD.sim(1, 1 / 30); o.d75 = Math.round(P.nearGate()); o.can75 = P.canAccept();
    v.place(p0.x, p0.z, h); MBD.sim(2, 1 / 30); o.lblNear = document.getElementById('bAct').textContent; o.hudNear = document.getElementById('ponteHud').hidden ? '' : document.getElementById('ponteHud').textContent;
    MBD.onActTap(1); return o;
  });
  await page.waitForFunction('MBD.ponte().on === true', { timeout: 15000 }).catch(() => {}); await sleep(300);
  R.flow2 = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(); MBD.sim(4, 1 / 30); const v = G.player.vehicle; const l = P.loop.locate(v.x, v.z); return { on: P.on, d: l && +l.d.toFixed(1), lat: l && +l.lat.toFixed(1), y: +v.y.toFixed(2), deckY: +P.groundAt(v.x, v.z).toFixed(2), ai: P.cars.filter(r => r.active).length, types: P.cars.map(r => r.type), hud: !document.getElementById('ponteHud').hidden }; });
  ck('call car', R.flow.call && R.flow.arrived && R.flow.inCar, R.flow);
  ck('accept label', mobile ? /Aceitar/.test(R.flow.lblNear) && /Aceitar/.test(R.flow.hudNear) : /aceitar/.test(R.flow.hudNear), [R.flow.lblNear, R.flow.hudNear]);
  ck('accept <=50m', R.flow.can49 && !R.flow.can75, R.flow);
  ck('session on', R.flow2.on && R.flow2.ai === 5 && R.flow2.hud, R.flow2);
  ck('car on deck', Math.abs(R.flow2.y - R.flow2.deckY) < 0.6 && R.flow2.deckY > 5, R.flow2);
  ck('5 types', new Set(R.flow2.types).size === 5, R.flow2.types);

  // 3) rampa: dirigir de verdade da cidade até a ponte (colisão com a ilha / altura)
  R.ramp = await page.evaluate(() => {
    const G = window.__G, P = MBD.ponte(), v = G.player.vehicle, inp = MBD.input; P.end(false);
    const p = P.ramp.at(1); v.place(p.x, p.z, p.h); v.vf = 0; MBD.sim(1, 1 / 30);
    // sinal da direção
    inp.stick = [0.7, 0.6]; const h0 = v.h; MBD.sim(20, 1 / 60); const sg = Math.sign(__ad(h0, v.h)) || 1; inp.stick = [0, 0]; v.place(p.x, p.z, p.h); v.vf = v.vx = v.vz = 0; MBD.sim(5, 1 / 60);
    window.__SG = sg; let maxS = 0, minY = 99, hits = 0; const hp = [];
    for (let i = 0; i < 60 * 30; i++) {
      const l = P.ramp.locate(v.x, v.z); const s = l ? l.s : 0; maxS = Math.max(maxS, s); if (P.on) break;
      const t = P.ramp.at(Math.min(P.ramp.L + 30, s + 14)); const e = __ad(v.h, Math.atan2(t.x - v.x, t.z - v.z));
      inp.stick = [Math.max(-1, Math.min(1, sg * e * 2.4)), v.speed > 17 ? 0.2 : 0.8]; MBD.sim(1, 1 / 60); if (v.hitT > 0) { hits++; if (hp.length < 6 && (!hp.length || Math.hypot(hp[hp.length - 1][0] - v.x, hp[hp.length - 1][1] - v.z) > 4)) hp.push([Math.round(v.x), Math.round(v.z), Math.round(s), +(l ? l.lat : 0).toFixed(1)]); }
      if (s > 20) minY = Math.min(minY, v.y);
    }
    inp.stick = [0, 0]; return { maxS: Math.round(maxS), rampL: Math.round(P.ramp.L), reached: P.on, hits, hp, sg };
  });
  ck('ramp drivable to loop', R.ramp.reached, R.ramp);

  // 4) dirigir no loop com física real (piloto automático), IAs em tandem com fumaça e marcas
  R.drive = await page.evaluate(() => {
    const G = window.__G, P = MBD.ponte(), v = G.player.vehicle, inp = MBD.input, sg = __SG; MBD.setHour(21.2);
    if (!P.on) P.start(true);
    const m0 = G.fx.aiMarks || 0; const st0 = { ...P.stats }; let dist = 0, tt = 0, maxGap = 0, minGap = 1e9, blocks = 0, falls = 0, offT = 0; let lx = v.x, lz = v.z; const dr = new Set(); let jerk = 0;
    for (let i = 0; i < 60 * 70; i++) {
      const l = P.loop.locate(v.x, v.z, P.hint); if (!l) { falls++; break; }
      const k = Math.abs(P.loop.at(l.s + 30).h - P.loop.at(l.s).h);
      const tgt = P.loop.at(l.s + 13 + v.speed * 0.25, 0); const e = __ad(v.h, Math.atan2(tgt.x - v.x, tgt.z - v.z));
      const vmax = 18 + 16 / (1 + k * 6);
      inp.stick = [Math.max(-1, Math.min(1, sg * e * 2.6)), v.speed > vmax ? -0.3 : 0.85]; inp.hand = (k > 0.5 && v.speed > 16 && (i % 90) < 25);
      MBD.sim(1, 1 / 60); tt += 1 / 60; dist += Math.hypot(v.x - lx, v.z - lz); lx = v.x; lz = v.z;
      if (Math.abs(l.lat) > 9) offT += 1 / 60;
      for (const r of P.cars) if (r.active) { if (r.drifting) dr.add(r.drvId); const d = Math.hypot(r.x - v.x, r.z - v.z); maxGap = Math.max(maxGap, d); minGap = Math.min(minGap, d); }
    }
    inp.stick = [0, 0]; inp.hand = false;
    const vis = P.cars.filter(r => r.active && r.root.visible).length;
    return { tt: Math.round(tt), dist: Math.round(dist), avgKmh: +(dist / tt * 3.6).toFixed(1), lapEstMin: +(P.L / (dist / tt) / 60).toFixed(1), aiActive: P.cars.filter(r => r.active).length, vis, drifting: [...dr], aiMarks: (G.fx.aiMarks || 0) - m0, aiSmoke: P.stats.aiSmoke - st0.aiSmoke, aiDriftFrames: P.stats.aiDriftFrames - st0.aiDriftFrames, maxGap: Math.round(maxGap), minGap: +minGap.toFixed(1), respawns: P.respawns || 0, offT: +offT.toFixed(1), on: P.on, prog: Math.round(P.prog), playerDriftT: +(G.drift.total).toFixed(0) };
  });
  ck('5 AIs present', R.drive.aiActive === 5 && R.drive.vis >= 4, R.drive);
  ck('AIs drifting', R.drive.drifting.length >= 4 && R.drive.aiDriftFrames > 200, R.drive);
  ck('AI smoke+marks', R.drive.aiSmoke > 50 && R.drive.aiMarks > 50, R.drive);
  ck('AIs keep near (rubber band)', R.drive.maxGap < 160, R.drive.maxGap);
  ck('player stays on bridge', R.drive.on && R.drive.dist > 900, R.drive);

  // 5) tandem: foto com IA ao lado, fumaça
  await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; let best = null; for (const r of P.cars) if (r.active && (!best || r._d < best._d)) best = r; G.camYaw = v.h + 0.5; G.camPitch = 0.18; G.snapCam && G.snapCam(); MBD.sim(3, 1 / 30); });
  await sleep(700); await page.screenshot({ path: `${SH}ponte-${out}-tandem.png` });

  // 6) rádio: arquivos, legenda, áudio tocado
  R.radio = await page.evaluate(async () => {
    const G = window.__G, P = MBD.ponte(), Rd = P.radio; await Rd.load();
    const L = await import('/src/radiolines.js'); const V = await import('/src/voice.js'); const bank = L.radioBank(); let miss = [];
    for (const [d, t] of bank) if (!(Rd.idx[d] && Rd.idx[d][V.fnv(V.normLine(t))])) miss.push(d + ':' + t);
    const r = await fetch('assets/voz/radio/bia/' + Object.keys(Rd.idx.bia)[0] + '.mp3'); const ab = await r.arrayBuffer();
    Rd.say('playerDrift', 'tche', 0, true); let sub = ''; for (let i = 0; i < 300; i++) { MBD.sim(1, 1 / 30); await new Promise(z => setTimeout(z, 15)); const el = document.getElementById('radioSub'); if (Rd.log.some(x => x.evt === 'playerDrift') && !el.hidden) { sub = el.textContent; break; } }
    return { lines: bank.length, miss: miss.slice(0, 5), missN: miss.length, mp3: r.status, bytes: ab.byteLength, ctype: r.headers.get('content-type'), shown: Rd.shown, played: Rd.played, last: Rd.lastPlayed, audio: !!(G.audio.ok), sub, events: [...new Set(Rd.log.map(x => x.evt))] };
  });
  await sleep(300); await page.screenshot({ path: `${SH}ponte-${out}-radio.png` });
  ck('radio all lines have mp3', R.radio.missN === 0, R.radio.miss);
  ck('radio mp3 fetch', R.radio.mp3 === 200 && R.radio.bytes > 3000, R.radio);
  ck('radio shown+played', R.radio.shown >= 2 && R.radio.played >= 1 && R.radio.sub.length > 4 && R.radio.events.includes('playerDrift'), R.radio);

  // 7) layout (legenda + HUD da ponte visíveis) sem sobreposição
  R.layout = await page.evaluate(() => {
    const ids = ['ponteHud', 'radioSub', 'topR', 'speedo', 'mapw', 'driftW', 'nitroW', 'bAct', 'bJump', 'bDown', 'bNitro', 'bBrake', 'bHand', 'drvL', 'drvR', 'quick', 'stick', 'compass', 'objective', 'hudTop', 'money', 'clock', 'serpHud', 'toast'];
    const sub = document.getElementById('radioSub'); sub.hidden = false; sub.innerHTML = '<b>📻 Tchê Trovão</b><span>Bah, que top teu drift, guri! Segue assim!</span>'; MBD.ponte().radio.place();
    const box = []; for (const el of document.querySelectorAll('body *')) { if (!el.id || !ids.includes(el.id)) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || el.hidden || +cs.opacity === 0) continue; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue; box.push({ id: el.id, r: [r.left, r.top, r.right, r.bottom].map(Math.round) }); }
    const ov = []; for (const a of box) if (a.id === 'ponteHud' || a.id === 'radioSub') for (const b of box) { if (a === b) continue; if (b.id === 'toast') continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(a.id + '×' + b.id); }
    const off = box.filter(b => (b.id === 'ponteHud' || b.id === 'radioSub') && (b.r[0] < 0 || b.r[2] > innerWidth || b.r[3] > innerHeight)).map(b => b.id);
    return { ov: [...new Set(ov)], off, boxes: box.filter(b => /ponte|radio/.test(b.id)) };
  });
  await page.screenshot({ path: `${SH}ponte-${out}-hud.png` });
  ck('layout overlap', R.layout.ov.length === 0 && R.layout.off.length === 0, R.layout);

  // 8) desempenho (baixa): chamadas de desenho e triângulos na ponte, fps real
  R.perf = await page.evaluate(async () => {
    const G = window.__G, P = MBD.ponte(); const ri = G.renderer.info; let n = 0; const t0 = performance.now(); let calls = 0, tris = 0;
    await new Promise(res => { const f = () => { n++; calls = Math.max(calls, ri.render.calls); tris = Math.max(tris, ri.render.triangles); if (performance.now() - t0 < 2500) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
    return { fps: +(n / 2.5).toFixed(1), calls, tris, visChunks: P.visChunks, liveChunks: P.liveChunks, chunks: P.chunks.length, nearD: P.nearD };
  });
  if (q === 'low') ck('low draw calls', R.perf.calls < 420, R.perf);

  // 9) respawn: batida parada de ré → volta para a pista no sentido certo
  R.resp = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; const l = P.loop.locate(v.x, v.z, P.hint); const p = P.loop.at(l.s, 4); v.place(p.x, p.z, p.h + Math.PI); v.vf = v.vx = v.vz = 0; window.__R0 = P.respawns || 0; MBD.sim(60, 1 / 30); return { r0: __R0 }; });
  await page.waitForFunction('(MBD.ponte().respawns || 0) > __R0 && !MBD.ponte()._fading', { timeout: 15000 }).catch(() => {}); await sleep(300);
  R.resp2 = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; MBD.sim(4, 1 / 30); const l = P.loop.locate(v.x, v.z, P.hint); return { respawns: P.respawns || 0, dir: +Math.abs(__ad(v.h, P.loop.at(l.s).h)).toFixed(2), lat: +l.lat.toFixed(1), on: P.on }; });
  ck('respawn', R.resp2.respawns > R.resp.r0 && R.resp2.dir < 0.6 && R.resp2.on, R.resp2);
  // preso na borda (centro do carro além do tabuleiro, parado) → também volta
  R.edge = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; const l = P.loop.locate(v.x, v.z, P.hint); const p = P.loop.at(l.s + 40, 9.9); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; window.__R1 = P.respawns || 0; MBD.input.stick = [0, 0.8]; MBD.sim(90, 1 / 30); MBD.input.stick = [0, 0]; return { r1: __R1 }; });
  await page.waitForFunction('(MBD.ponte().respawns || 0) > __R1 && !MBD.ponte()._fading', { timeout: 15000 }).catch(() => {}); await sleep(300);
  R.edge2 = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; MBD.sim(3, 1 / 30); const l = P.loop.locate(v.x, v.z, P.hint); return { respawns: P.respawns || 0, lat: +l.lat.toFixed(1), onDeck: P.onDeck(v.x, v.z), spd: +v.speed.toFixed(1), stuck: +(P.stuckT || 0).toFixed(2), on: P.on }; });
  R.edge3 = await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; const x0 = v.x, z0 = v.z; MBD.input.stick = [0, 0.8]; MBD.sim(75, 1 / 30); MBD.input.stick = [0, 0]; return { moved: Math.round(Math.hypot(v.x - x0, v.z - z0)), onDeck: P.onDeck(v.x, v.z), tilt: +Math.max(Math.abs(v.pitch), Math.abs(v.roll)).toFixed(2) }; });
  // t335: a borda agora empurra o carro de volta e ele segue andando (desliza); o respawn continua como reserva
  ck('edge respawn/free', R.edge2.onDeck && ((R.edge2.respawns > R.edge.r1 && Math.abs(R.edge2.lat) < 8) || (R.edge3.moved > 8 && R.edge3.onDeck && R.edge3.tilt < 0.5)), { ...R.edge2, free: R.edge3 });

  // 10) voltas: pulo rápido pelo traçado (8 m/quadro) → 2 voltas, recorde salvo, fim de sessão
  R.laps = await page.evaluate(async () => {
    const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; const lapsSeen = new Set();
    let l = P.loop.locate(v.x, v.z, P.hint); let s = l.s; let guard = 0;
    while (P.on && guard++ < 6000) { s = (s + 8) % P.L; const p = P.loop.at(s, -2); v.place(p.x, p.z, p.h); v.vf = 20; v.vx = Math.sin(p.h) * 20; v.vz = Math.cos(p.h) * 20; v.y = p.y + 0.2; MBD.sim(1, 1 / 30); lapsSeen.add(P.lap); }
    const st = JSON.parse(localStorage.getItem(P.data && P.data.key || '') || 'null');
    return { lapsSeen: [...lapsSeen], on: P.on, best: +(P.best || 0).toFixed(1), stored: Object.keys(localStorage).filter(k => /ponte/.test(k)), data: P.data, guard };
  });
  ck('2 laps + finish', !R.laps.on && R.laps.lapsSeen.includes(2) && R.laps.data.laps >= 2, R.laps);
  ck('record stored', R.laps.stored.length >= 1 && R.laps.data.bestLap > 0, R.laps);
  R.stored = await page.evaluate((P) => localStorage.getItem(P), PK); ck('storage key', !!R.stored && /bestLap/.test(R.stored), R.stored);

  // 11) visão geral (câmera aérea)
  await page.evaluate(() => { const G = window.__G, P = MBD.ponte(); MBD.setHour(19.7); const v = G.player.vehicle; const p = P.loop.at(P.L * 0.43); v.place(p.x, p.z, p.h); window.__nd = P.nearD; P.nearD = 3000; G.camOverride = [470, 250, 1330, 990, 0, 240]; MBD.sim(90, 1 / 30); });
  for (let i = 0; i < 30; i++) { await page.evaluate(() => MBD.sim(1, 1 / 30)); }
  await sleep(1500); await page.screenshot({ path: `${SH}ponte-${out}-overview.png` });
  await page.evaluate(() => { window.__G.camOverride = null; MBD.ponte().nearD = __nd; });

  R.errs = errs; ck('0 console errors', errs.length === 0, errs.slice(0, 4));
  console.log(JSON.stringify(R)); console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
