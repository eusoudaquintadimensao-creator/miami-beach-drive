// Teste t335: borda da ponte (desliza, não gruda, nunca em pé), batidas só com amassados sutis, HUD volta a pé,
// botão "Iniciar corrida" (dia/noite, até 50 m, passando), corrida de rua com 5 corredores, GPS, setas de curva e bloqueios.
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const PORT = process.env.PORT || 8765;
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600;
const SH = process.env.SHOTS || '/workspace/miami-mundo-aberto/screenshots/';
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
  const fail = []; const R = {}; const ck = (n, ok, info) => { if (!ok) fail.push(n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); };
  const want = (k) => !ONLY || ONLY.split(',').includes(k);
  await page.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' });
  await page.evaluate((K) => { localStorage.setItem(K + '-casa-v1', JSON.stringify({ intro: true, visits: 1 })); }, KEY);
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => { MBD.home().data.intro = true; });
  await page.click('#play'); await sleep(1500);
  if (mobile) await page.evaluate(() => { const d = MBD.drive(); const orig = d.input.bind(d); d.input = () => { const o = orig(); const st = MBD.input.stick; if (st) { o.x = st[0]; o.y = st[1]; } return o; }; });
  await page.evaluate(() => { window.__ad = (a, b) => { let d = (b - a) % (2 * Math.PI); if (d > Math.PI) d -= 2 * Math.PI; if (d < -Math.PI) d += 2 * Math.PI; return d; };
    window.__car = () => { const G = window.__G; if (G.player.vehicle) return (window.__lastV = G.player.vehicle); if (window.__lastV) { G.enterCar(window.__lastV); return window.__lastV; } MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return (window.__lastV = G.player.vehicle); };
    window.__near = async () => { const G = window.__G, St = G.street; const Sm = await import('/src/street.js'); const v = __car(); for (let k = 0; k < Sm.ROUTES.length; k++) { const Rt = Sm.ROUTES[k]; v.place(Rt.start[0] + 12, Rt.start[1] + 12, 0); v.vf = v.vx = v.vz = 0; MBD.sim(20, 1 / 30); const w = St.nearRival(50); if (w) return w; } return null; }; });

  // 1) borda da ponte: raspa a 30° e a 90°, carro além da borda → desliza / empurra, nunca gruda, nunca em pé
  if (want('edge')) {
    R.edge = await page.evaluate(() => {
      const G = window.__G, P = MBD.ponte(); MBD.setHour(21); const v = __car(); const inp = MBD.input; const o = {};
      const run = (lat, dAng, spd, secs) => { const L = P.loop; const s0 = 2000; const p = L.at(s0, lat); v.place(p.x, p.z, p.h + dAng); v.y = p.y + 0.2; v.vf = spd; v.vx = Math.sin(p.h + dAng) * spd; v.vz = Math.cos(p.h + dAng) * spd; v.edgeHits = 0;
        let maxTilt = 0, minSpd = 1e9, stuckF = 0, offF = 0; const x0 = v.x, z0 = v.z; inp.stick = [0, 0.7];
        for (let i = 0; i < secs * 60; i++) { MBD.sim(1, 1 / 60); maxTilt = Math.max(maxTilt, Math.abs(v.pitch), Math.abs(v.roll)); if (i > 30) minSpd = Math.min(minSpd, v.speed); if (v.speed < 1) stuckF++; if (!P.onDeck(v.x, v.z)) offF++; }
        inp.stick = [0, 0]; const l = L.locate(v.x, v.z); return { hits: v.edgeHits, maxTilt: +maxTilt.toFixed(2), minSpd: +minSpd.toFixed(1), endSpd: +v.speed.toFixed(1), stuckF, offF, moved: Math.round(Math.hypot(v.x - x0, v.z - z0)), lat: l && +l.lat.toFixed(1), y: +v.y.toFixed(1) }; };
      o.graze = run(6.5, -0.5, 25, 3);   // 30° contra a borda (lado direito: lat −? testa os dois)
      o.graze2 = run(-6.5, 0.5, 25, 3);
      o.head = run(5, -1.45, 20, 3);     // quase de frente para a borda
      // centro do carro além da borda, parado → empurra para dentro
      { const p = P.loop.at(2600, 9.9); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; MBD.sim(20, 1 / 60); const l = P.loop.locate(v.x, v.z); o.push = { onDeck: P.onDeck(v.x, v.z), lat: +l.lat.toFixed(2) }; }
      // traseira no tabuleiro e frente sobre o mar (o caso do vídeo): nunca fica em pé
      { const p = P.loop.at(3000, 8.6); v.place(p.x, p.z, p.h - 1.4); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; let mt = 0; for (let i = 0; i < 120; i++) { MBD.sim(1, 1 / 60); mt = Math.max(mt, Math.abs(v.pitch), Math.abs(v.roll)); } o.overSea = { maxTilt: +mt.toFixed(2) }; }
      return o;
    });
    for (const k of ['graze', 'graze2']) { const e = R.edge[k]; ck('edge slide ' + k, e.maxTilt < 0.5 && e.endSpd > 8 && e.moved > 40 && e.offF === 0, e); }
    { const e = R.edge.head; ck('edge head-on not stuck', e.maxTilt < 0.5 && e.moved > 8 && e.offF === 0 && e.stuckF < 60, e); }
    ck('edge push-out', R.edge.push.onDeck && Math.abs(R.edge.push.lat) < 9.6, R.edge.push);
    ck('never vertical over sea', R.edge.overSea.maxTilt < 0.5, R.edge.overSea);
    await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), v = G.player.vehicle; const p = P.loop.at(2000, 7.5); v.place(p.x, p.z, p.h - 0.35); v.y = p.y + 0.2; v.vf = 20; v.vx = Math.sin(p.h - 0.35) * 20; v.vz = Math.cos(p.h - 0.35) * 20; MBD.input.stick = [0, 0.7]; MBD.sim(40, 1 / 60); MBD.input.stick = [0, 0]; G.camYaw = v.h + 0.9; G.camPitch = 0.2; MBD.sim(2, 1 / 30); });
    await sleep(600); await page.screenshot({ path: `${SH}t335-${out}-borda.png` });
  }

  // 2) batidas: 12 pancadas fortes em parede → amassados sutis (≤12 peças), sem encolher/esticar, rodas no lugar, continua andando
  if (want('crash')) {
    R.crash = await page.evaluate(async () => {
      const G = window.__G, v = __car(); MBD.setHour(20.5); const W = await import('/src/world.js'); const inp = MBD.input;
      const sg = W.SEGS.find(s => s.kind === 'city' && s.len > 120); const mx = (sg.a.x + sg.b.x) / 2, mz = (sg.a.z + sg.b.z) / 2; const hh = Math.atan2(sg.b.x - sg.a.x, sg.b.z - sg.a.z);
      const wheels0 = v.wheels.map(w => w.parent && w.parent.uuid); let maxTilt = 0, hits = 0;
      for (let k = 0; k < 12; k++) { v.place(mx, mz, hh + Math.PI / 2 * (k % 2 ? 1 : -1)); v.vf = 30; const a = v.h; v.vx = Math.sin(a) * 30; v.vz = Math.cos(a) * 30; inp.stick = [0, 1]; for (let i = 0; i < 90; i++) { MBD.sim(1, 1 / 60); maxTilt = Math.max(maxTilt, Math.abs(v.pitch), Math.abs(v.roll)); if (v.hitT > 0.27) hits++; } }
      inp.stick = [0, 0];
      const bodyScale = [v.body.scale.x, v.body.scale.y, v.body.scale.z].map(x => +x.toFixed(3)); const dents = (v.dents || []).length;
      const maxDentSize = Math.max(0, ...(v.dents || []).map(d => { d.geometry.computeBoundingSphere(); return d.geometry.boundingSphere.radius * Math.max(d.scale.x, d.scale.y, d.scale.z); }));
      const wheelsSame = v.wheels.every((w, i) => (w.parent && w.parent.uuid) === wheels0[i]);
      // ainda anda normal
      v.place(mx, mz, hh); v.vf = v.vx = v.vz = 0; inp.stick = [0, 1]; MBD.sim(120, 1 / 60); inp.stick = [0, 0]; const drives = +v.speed.toFixed(1);
      return { hits, dents, bodyScale, maxDentSize: +maxDentSize.toFixed(2), wheelsSame, maxTilt: +maxTilt.toFixed(2), drives };
    });
    ck('crash subtle dents', R.crash.dents <= 12 && R.crash.maxDentSize <= 0.46 && R.crash.bodyScale.every(x => x === 1), R.crash);
    ck('crash wheels attached + upright', R.crash.wheelsSame && R.crash.maxTilt < 0.6, R.crash);
    ck('crash keeps driving', R.crash.drives > 10, R.crash);
    await page.evaluate(() => { const G = window.__G, v = G.player.vehicle; G.camYaw = v.h + 2.4; G.camPitch = 0.15; MBD.sim(3, 1 / 30); });
    await sleep(600); await page.screenshot({ path: `${SH}t335-${out}-amassados.png` });
    // 2b) sair do carro batido → HUD a pé completo; também gravando e após 'ghide' esquecido
    R.hud = await page.evaluate(async () => {
      const G = window.__G; const vis = (id) => { const e = document.getElementById(id); if (!e) return null; const cs = getComputedStyle(e); let n = e; while (n) { if (n.hidden || getComputedStyle(n).display === 'none') return false; n = n.parentElement; } const r = e.getBoundingClientRect(); return r.width > 2 && r.height > 2 && cs.visibility !== 'hidden'; };
      const v = G.player.vehicle; v.vf = v.vx = v.vz = 0; MBD.sim(10, 1 / 30); const o = {};
      const rb = document.getElementById('bRec'); G.rec.start(); await new Promise(r => setTimeout(r, 300)); o.rec = G.rec.recording;
      G.leaveCar(); MBD.sim(10, 1 / 30); await new Promise(r => setTimeout(r, 300));
      o.onFoot = !G.player.vehicle; o.hud = vis('hud'); o.map = vis('mapw'); o.act = G.touch ? vis('bAct') : true;
      G.rec.stop(); await new Promise(r => setTimeout(r, 900)); const panel = !document.getElementById('recPanel').hidden; o.panel = panel;
      if (panel) { document.getElementById('rpDiscard').click(); document.getElementById('recPanel').hidden = true; G.paused = false; }
      MBD.sim(20, 1 / 30); await new Promise(r => setTimeout(r, 100)); o.hudAfterRec = vis('hud') && vis('mapw');
      document.getElementById('hud').classList.add('ghide'); for (let i = 0; i < 40; i++) MBD.sim(1, 1 / 30); await new Promise(r => setTimeout(r, 100)); o.watchdog = vis('hud'); o.fixes = G.hudFixes || 0;
      return o;
    });
    ck('HUD back on foot after crash', R.hud.onFoot && R.hud.hud && R.hud.map && R.hud.act, R.hud);
    ck('HUD after recording', R.hud.rec && R.hud.hudAfterRec, R.hud);
    ck('HUD watchdog', R.hud.watchdog && R.hud.fixes >= 1, R.hud);
    await page.screenshot({ path: `${SH}t335-${out}-hud-a-pe.png` });
  }

  // 3) botão "Iniciar corrida": de dia e de noite, a 45 m e passando a 60 km/h
  if (want('btn')) {
    R.btn = await page.evaluate(async () => {
      const G = window.__G; const S = await import('/src/street.js'); const Rt = S.ROUTES[1]; const out = {};
      for (const hour of [14, 22]) { MBD.setHour(hour); const v = __car(); const seen = new Set(); let near = 0;
        v.place(Rt.start[0] + 30, Rt.start[1] + 70, Math.PI); v.vf = 0; MBD.sim(30, 1 / 30);
        v.place(Rt.start[0] + 6, Rt.start[1] + 70, Math.PI); v.vf = 17; v.vx = 0; v.vz = -17; MBD.input.stick = [0, 0.55];
        for (let i = 0; i < 100; i++) { MBD.sim(1, 1 / 30); if (G.street.nearRival(50)) { near++; seen.add(G.touch ? document.getElementById('bAct').textContent : (document.getElementById('stTip').hidden ? '' : 'tip')); } }
        MBD.input.stick = [0, 0]; out[hour] = { near, seen: [...seen] }; }
      // inicia passando: toque com o carro a ~40 m andando
      const v = G.player.vehicle; v.place(Rt.start[0] + 6, Rt.start[1] + 40, Math.PI); v.vf = 15; v.vx = 0; v.vz = -15; MBD.sim(12, 1 / 30);
      out.d = Math.round(G.street.nearRival(60)?.d ?? -1); if (G.touch) MBD.onActTap(1);
      return out;
    });
    if (!mobile) { await page.keyboard.press('e'); await sleep(150); }
    Object.assign(R.btn, await page.evaluate(() => { const G = window.__G; MBD.sim(2, 1 / 30); const S2 = G.street.race; return { started: !!S2, racers: S2 ? S2.ais.length + 1 : 0, lbl: document.getElementById('bAct').textContent }; }));
    for (const h of ['14', '22']) ck('race prompt ' + h + 'h', R.btn[h].near > 5 && R.btn[h].seen.some(x => /Iniciar corrida|tip/.test(x)), R.btn[h]);
    ck('race starts from button', R.btn.started && R.btn.racers === 5, R.btn);
  }

  // 4) corrida: 5 corredores, contagem, GPS (minimapa + chão), seta CURVA À ESQUERDA/DIREITA, bloqueios só durante, posições, chegada
  if (want('race')) {
    R.race = await page.evaluate(async () => {
      const G = window.__G, St = G.street; MBD.setHour(22); let S = St.race;
      if (!S) { await __near(); St.flash(); S = St.race; }
      const o = { racers: S.ais.length + 1, types: S.ais.map(c => c.type), vis: S.ais.filter(c => c.root.visible).length };
      o.blocks = St.blocks ? St.blocks.children.length : 0; o.boxes = (St.blockBoxes || []).length; o.gpsRoad = St.arrows ? St.arrows.children.filter(a => a.userData.gps).length : 0;
      for (let i = 0; i < 60 && S.t < 0; i++) MBD.sim(1, 1 / 30); for (let i = 0; i < 150 && S.t < 0; i++) MBD.sim(1, 1 / 30); o.countdownDone = S.t >= 0;
      o.route = G.route ? G.route.length : 0; o.routeEnd = G.route ? G.route[G.route.length - 1] : null; o.lastCp = S.cps[S.cps.length - 1];
      // jogador percorre o trajeto (teleporte suave a ~26 m/s) e anota as setas de curva
      const P = [[S.sx, S.sz], ...S.cps]; const cues = []; let maxGap = 0; const places = new Set(); const v = G.player.vehicle; const tc = document.getElementById('turnCue');
      for (let i = 0; i < P.length - 1 && St.race; i++) { const a = P[i], b = P[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
        for (let d = 0; d < L && St.race; d += 0.9) { const x = a[0] + Math.sin(h) * d, z = a[1] + Math.cos(h) * d; v.place(x, z, h); v.vf = 26; v.vx = Math.sin(h) * 26; v.vz = Math.cos(h) * 26; MBD.sim(1, 1 / 30);
          if (!St.race) break; if (!tc.hidden) cues.push([i, tc.textContent.includes('ESQUERDA') ? 'L' : 'R', Math.round(L - d)]); places.add(St.place()); for (const c of St.race.ais) { const g = c.s - St.playerProg(); if (Math.abs(g) > Math.abs(maxGap)) maxGap = g; } } }
      // curvas esperadas (sinal do ângulo: + = esquerda)
      const exp = []; for (let i = 1; i < P.length - 1; i++) { const a = P[i - 1], b = P[i], c = P[i + 1]; const d = __ad(Math.atan2(b[0] - a[0], b[1] - a[1]), Math.atan2(c[0] - b[0], c[1] - b[1])); if (Math.abs(d) > 0.35) exp.push([i - 1, d > 0 ? 'L' : 'R']); }
      const got = {}; for (const [i, s] of cues) got[i] = got[i] || s; o.cueOk = exp.every(([i, s]) => got[i] === s); o.exp = exp; o.got = got;
      o.places = [...places]; o.maxGap = Math.round(maxGap); o.ended = !St.race; o.result = St.lastResult && { win: St.lastResult.win, place: St.lastResult.place, cash: St.lastResult.cash };
      o.blocksAfter = St.blocks ? St.blocks.children.length : 0; o.boxesAfter = (St.blockBoxes || []).length; o.routeAfter = G.route; o.cueHidden = tc.hidden;
      return o;
    });
    const r = R.race;
    ck('race 5 racers', r.racers === 5 && r.vis === 4 && new Set(r.types).size >= 2, r);
    ck('race countdown', r.countdownDone, r);
    ck('race GPS minimap+road', r.route >= 2 && r.gpsRoad >= 3 && JSON.stringify(r.routeEnd) === JSON.stringify(r.lastCp), r);
    ck('race turn cues L/R', r.cueOk && r.exp.length >= 2, { exp: r.exp, got: r.got });
    ck('race side blocks during', r.blocks >= 2 && r.boxes >= 2, r);
    ck('race blocks removed after', r.ended && r.blocksAfter === 0 && r.boxesAfter === 0 && !r.routeAfter && r.cueHidden, r);
    ck('race positions + result', r.places.length >= 1 && r.places.every(p => p >= 1 && p <= 5) && r.result && r.result.place >= 1, r);
    ck('race rubber band', Math.abs(r.maxGap) < 260, r.maxGap);
  }
  // fotos da corrida (nova, parada no grid e em curva)
  if (want('raceshot')) {
    await page.evaluate(async () => { const G = window.__G, St = G.street; if (St.lastResult) St.closeResult(); MBD.setHour(22.5); await __near(); St.flash(); MBD.sim(20, 1 / 30); G.camYaw = Math.PI + 0.3; G.camPitch = 0.3; });
    await sleep(800); await page.screenshot({ path: `${SH}t335-${out}-grid.png` });
    await page.evaluate(() => { const G = window.__G, St = G.street, S = St.race; for (let i = 0; i < 120 && S.t < 0; i++) MBD.sim(1, 1 / 30); const v = G.player.vehicle; const tc = document.getElementById('turnCue'); const P = [[S.sx, S.sz], ...S.cps]; let done = false;
      for (let i = 0; i < P.length - 1 && !done; i++) { const a = P[i], b = P[i + 1]; const L = Math.hypot(b[0] - a[0], b[1] - a[1]); const h = Math.atan2(b[0] - a[0], b[1] - a[1]);
        for (let d = 0; d < L; d += 0.9) { v.place(a[0] + Math.sin(h) * d, a[1] + Math.cos(h) * d, h); v.vf = 26; v.vx = Math.sin(h) * 26; v.vz = Math.cos(h) * 26; MBD.sim(1, 1 / 30); if (!tc.hidden && L - d < 70) { done = true; break; } } }
      v.vf = 18; MBD.sim(2, 1 / 30); });
    await sleep(800); await page.screenshot({ path: `${SH}t335-${out}-curva.png` });
    R.layout = await page.evaluate(() => { const ids = ['turnCue', 'stHud', 'stArrow', 'topR', 'mapw', 'speedo', 'bAct', 'bBrake', 'bNitro', 'quick', 'nitroW', 'driftW', 'ponteHud', 'radioSub']; const box = []; for (const id of ids) { const el = document.getElementById(id); if (!el || el.hidden) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const r = el.getBoundingClientRect(); if (r.width < 2) continue; box.push({ id, r: [r.left, r.top, r.right, r.bottom] }); }
      const ov = []; for (const a of box) if (a.id === 'turnCue') for (const b of box) { if (a === b) continue; const ix = Math.min(a.r[2], b.r[2]) - Math.max(a.r[0], b.r[0]), iy = Math.min(a.r[3], b.r[3]) - Math.max(a.r[1], b.r[1]); if (ix > 2 && iy > 2) ov.push(b.id); } return { ov, cue: !!box.find(b => b.id === 'turnCue'), boxes: box.filter(b => /turn|stHud|stArrow/.test(b.id)) }; });
    ck('turn cue layout', R.layout.cue && R.layout.ov.length === 0, R.layout);
    await page.evaluate(() => { const St = window.__G.street; if (St.race) St.end(false, 'teste'); });
  }

  // 5) ponte: moedas/dinheiro/prêmios, missões (zona de drift, radar, corrente de tandem, quase-batida), cenário
  if (want('fun')) {
    R.fun = await page.evaluate(() => {
      const G = window.__G, P = MBD.ponte(), F = P.fun; MBD.setHour(17); const v = __car(); const o = {}; let got = 0; const am = G.addMoney; G.addMoney = (n) => { got += n; am(n); };
      o.counts = { coins: F.coins.list.length, cash: F.cash.list.length, prizes: F.prizes.list.length, ships: F.ships.count, boats: F.boats.count, balloons: F.balloons.count, planes: F.planes.count, meshes: F.group.children.length };
      const go = (s, lat, spd, h0) => { const p = P.loop.at(s, lat); v.place(p.x, p.z, p.h + (h0 || 0)); v.y = p.y + 0.2; v.vf = spd; v.vx = Math.sin(p.h) * spd; v.vz = Math.cos(p.h) * spd; };
      // moeda e prêmio: dirige por cima
      const c = F.coins.list[3]; go(c.s - 8, c.lat, 12); for (let i = 0; i < 50; i++) { const p = P.loop.at(c.s - 8 + i * 0.4, c.lat); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = 12; MBD.sim(1, 1 / 30); }
      o.coin = { n: F.stats.coins, got, gone: !c.on };
      const pz = F.prizes.list[1]; const g0 = got; for (let i = 0; i < 40; i++) { const p = P.loop.at(pz.s - 8 + i * 0.4, pz.lat); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = 12; MBD.sim(1, 1 / 30); }
      o.prize = { n: F.stats.prizes, got: got - g0, pop: F.lastPop };
      // zona de drift (drift simulado: o teste não "pilota" o drift)
      F.test.drift = true; const z = F.zones[0]; const g1 = got; let maxLive = 0, zoneHud = false;
      for (let s = z.s0 - 20; s < z.s1 + 15; s += 0.85) { const p = P.loop.at(s, 0); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = 25; v.vx = Math.sin(p.h) * 25; v.vz = Math.cos(p.h) * 25; MBD.sim(1, 1 / 30); maxLive = Math.max(maxLive, F.zoneLive || 0); if (!document.getElementById('bfZone').hidden) zoneHud = true; }
      F.test.drift = false; o.zone = { ok: F.stats.zonesOk, maxLive: Math.round(maxLive), got: got - g1, zoneHud };
      // radar
      const t = F.traps[1]; const g2 = got; go(t.s - 40, 0, 46); MBD.input.stick = [0, 1]; for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); MBD.input.stick = [0, 0];
      o.trap = { n: F.stats.traps, kmh: F.lastTrap, got: got - g2, best: F.data.bestTrap };
      // sessão com os 5 pilotos: corrente de tandem e quase-batida
      go(F.zones[1].s0 + 400, 0, 20); MBD.sim(30, 1 / 30); const cars = P.cars.filter(r => r.active); o.session = { on: P.on, cars: cars.length };
      if (cars.length) { const r = cars[0]; F.test.drift = true; F.test.tandem = true; const g3 = got;
        for (let i = 0; i < 300; i++) { const rx = Math.cos(r.h), rz = -Math.sin(r.h); v.place(r.x + rx * 5, r.z + rz * 5, r.h); v.y = r.y; v.vf = r.vf || 15; v.vx = r.vx; v.vz = r.vz; MBD.sim(1, 1 / 30); }
        F.test.drift = false; F.test.tandem = false; o.chain = { links: F.chain.links, got: got - g3 };
        MBD.sim(60, 1 / 30); const g4 = got; const n0 = F.stats.near; const r2 = P.cars.filter(c => c.active)[1] || r;
        for (let i = 0; i < 20 && F.stats.near === n0; i++) { const rx = Math.cos(r2.h), rz = -Math.sin(r2.h); v.place(r2.x + rx * 2.6, r2.z + rz * 2.6, r2.h); v.y = r2.y; v.vf = (r2.vf || 15) + 10; v.vx = Math.sin(r2.h) * v.vf; v.vz = Math.cos(r2.h) * v.vf; v.hitT = 0; MBD.sim(1, 1 / 30); }
        o.near = { n: F.stats.near - n0, got: got - g4 }; }
      G.addMoney = am; o.earned = F.stats.earned; o.saved = JSON.parse(localStorage.getItem(MBD.ponte().constructor.name ? Object.keys(localStorage).find(k => k.endsWith('-ponte-v1-fun')) || '' : '') || 'null');
      return o;
    });
    const f = R.fun, c = f.counts;
    ck('fun pickups counts', c.coins >= 150 && c.cash >= 12 && c.prizes === 6, c);
    ck('fun scenery counts', c.ships >= 1 && c.boats >= 3 && c.balloons >= 3 && c.planes >= 1 && c.meshes <= 16, c);
    ck('fun coin pickup', f.coin.n >= 1 && f.coin.got >= 5 && f.coin.gone, f.coin);
    ck('fun prize pickup', f.prize.n >= 1 && f.prize.got >= 60, f.prize);
    ck('fun drift zone', f.zone.ok >= 1 && f.zone.got >= 90 && f.zone.zoneHud, f.zone);
    ck('fun speed trap', f.trap.n >= 1 && f.trap.kmh >= 120 && f.trap.got > 0, f.trap);
    ck('fun session', f.session.on && f.session.cars >= 4, f.session);
    ck('fun tandem chain', f.chain && f.chain.links >= 2 && f.chain.got >= 60, f.chain);
    ck('fun near miss', f.near && f.near.n >= 1 && f.near.got >= 15, f.near);
    // fotos: moedas + portal de drift, e o cenário (navio, lanchas, balões, avião)
    await sleep(1600); await page.evaluate(() => { MBD.sim(30, 1 / 30); const P = MBD.ponte(); P.stuckT = 0; P.edgeT = 0; });
    await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), F = P.fun, v = G.player.vehicle; MBD.setHour(18.2); P.stuckT = 0; const z = F.zones[2]; let best = null; for (const it of F.coins.list) { if (it.on && (!best || Math.abs(it.s - (z.s0 - 30)) < Math.abs(best.s - (z.s0 - 30)))) best = it; } const s = best.s - 34; const p = P.loop.at(s, best.lat > 0 ? best.lat - 3.5 : best.lat + 3.5); v.place(p.x, p.z, p.h); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; G.camYaw = p.h; G.camPitch = 0.12; MBD.sim(6, 1 / 30); G.camYaw = p.h; });
    await page.evaluate(() => { for (const id of ['toast', 'toasts', 'bfPop']) { const e = document.getElementById(id); if (e) e.innerHTML = ''; } });
    await sleep(700); await page.screenshot({ path: `${SH}t335-${out}-ponte-moedas.png` });
    await page.evaluate(() => { const G = window.__G, P = MBD.ponte(), F = P.fun, v = G.player.vehicle; MBD.setHour(16.5); const sp = F.shipP[0]; const sx = sp.cx + Math.cos(sp.a) * sp.rx, sz = sp.cz + Math.sin(sp.a) * sp.rz; let bs = 0, bd = 1e9; for (let s = 0; s < P.L; s += 20) { const q = P.loop.at(s, 0); const d = Math.hypot(q.x - sx, q.z - sz); if (d < bd) { bd = d; bs = s; } } const p = P.loop.at(bs, 0); const h = Math.atan2(sx - p.x, sz - p.z); v.place(p.x, p.z, h); v.y = p.y + 0.2; v.vf = v.vx = v.vz = 0; P.stuckT = 0; MBD.sim(4, 1 / 30); G.camYaw = h; G.camPitch = 0.02; MBD.sim(2, 1 / 30); G.camYaw = h; window.__shipD = Math.round(bd); });
    await sleep(700); await page.screenshot({ path: `${SH}t335-${out}-ponte-cenario.png` });
  }

  // 6) helicóptero: modelo leve genérico, rotores girando, inércia, auto-nivelar, coletivo, guinada, painel e controles
  if (want('heli')) {
    R.heli = await page.evaluate(async () => {
      const G = window.__G, H = G.heli, inp = MBD.input; const o = {}; MBD.setHour(10);
      if (G.player.vehicle && G.player.vehicle !== H) { const v = G.player.vehicle; v.vf = v.vx = v.vz = 0; G.leaveCar(true); }
      if (G.street.race) G.street.end(false, 'teste'); if (MBD.ponte().on) MBD.ponte().end(false);
      const { HELIPAD } = await import('/src/heli.js'); H.place(HELIPAD.x, HELIPAD.z, -Math.PI / 2); let meshes = 0; H.root.traverse(c => { if (c.isMesh) meshes++; }); o.meshes = meshes; G.enterCar(H); MBD.sim(5, 1 / 30);
      const r0 = H.rotor.rotation.y, t0 = H.tail.rotation.x; MBD.sim(10, 1 / 30); o.spin = { main: +(H.rotor.rotation.y - r0).toFixed(2), tail: +(H.tail.rotation.x - t0).toFixed(2) };
      inp.hb = true; for (let i = 0; i < 150; i++) MBD.sim(1, 1 / 30); inp.hb = false; const alt = () => H.y - H.floor(H.x, H.z);
      o.takeoff = { air: H.air, alt: +alt().toFixed(1), spool: +H.spool.toFixed(2) };
      MBD.sim(60, 1 / 30); const a1 = alt(); MBD.sim(90, 1 / 30); o.hold = { d: +(alt() - a1).toFixed(2), vy: +H.vy.toFixed(2) };
      o.hudFly = !document.getElementById('heliHud').hidden && /ALT/.test(document.getElementById('heliHud').textContent);
      // cíclico à frente: bico abaixa e acelera aos poucos
      inp.stick = [0, 1]; let minP = 0; const sp = []; for (let i = 0; i < 240; i++) { MBD.sim(1, 1 / 30); minP = Math.min(minP, H.pitch); if (i % 30 === 29) sp.push(+H.speed.toFixed(1)); }
      o.fwd = { sp, minP: +minP.toFixed(2) };
      // solta: auto-nivela (flare suave), mantém inércia e para pairando
      inp.stick = [0, 0]; const v0 = H.speed; MBD.sim(30, 1 / 30); const v1 = H.speed; MBD.sim(15, 1 / 30); const p15 = H.pitch; for (let i = 0; i < 450; i++) MBD.sim(1, 1 / 30);
      o.level = { v0: +v0.toFixed(1), v1s: +v1.toFixed(1), pitch15: +p15.toFixed(2), vEnd: +H.speed.toFixed(1), pitchEnd: +H.pitch.toFixed(2) };
      // guinada + curva coordenada em velocidade
      inp.stick = [0, 0.8]; MBD.sim(120, 1 / 30); const h0 = H.h; inp.stick = [1, 0.8]; let maxR = 0; for (let i = 0; i < 90; i++) { MBD.sim(1, 1 / 30); maxR = Math.max(maxR, Math.abs(H.roll)); } inp.stick = [0, 0];
      o.yaw = { dh: +Math.abs(H.h - h0).toFixed(2), maxRoll: +maxR.toFixed(2), rollNow: +H.roll.toFixed(2) }; MBD.sim(60, 1 / 30); o.yaw.rollAfter = +H.roll.toFixed(2);
      window.__heliShot = true; return o;
    });
    await page.evaluate(() => { const G = window.__G, H = G.heli; G.camYaw = H.h + 2.5; G.camPitch = 0.1; MBD.sim(2, 1 / 30); G.camYaw = H.h + 2.5; });
    await sleep(700); await page.screenshot({ path: `${SH}t335-${out}-heli-voo.png` });
    Object.assign(R.heli, await page.evaluate(async () => {
      const G = window.__G, H = G.heli, inp = MBD.input; const o = {};
      o.touchUi = !G.touch || (document.body.classList.contains('heli') && getComputedStyle(document.getElementById('bJump')).display !== 'none' && getComputedStyle(document.getElementById('bDown')).display !== 'none' && /Subir/.test(document.getElementById('bJump').textContent));
      inp.down = true; let i = 0; for (; i < 900 && H.air; i++) MBD.sim(1, 1 / 30); inp.down = false; MBD.sim(30, 1 / 30); o.landed = { air: H.air, frames: i, maxP: +Math.abs(H.pitch).toFixed(2) };
      G.leaveCar(); MBD.sim(5, 1 / 30); o.hudAfter = document.getElementById('heliHud').hidden; o.onFoot = !G.player.vehicle; return o; }));
    // close no heliponto
    await page.evaluate(async () => { const G = window.__G, H = G.heli; const { HELIPAD } = await import('/src/heli.js'); H.place(HELIPAD.x, HELIPAD.z, -Math.PI / 2); H.spool = 0.9; G.enterCar(H); MBD.sim(10, 1 / 30); G.camYaw = H.h + 2.2; G.camPitch = 0.18; MBD.sim(2, 1 / 30); G.camYaw = H.h + 2.2; });
    await sleep(700); await page.screenshot({ path: `${SH}t335-${out}-heli-pad.png` });
    await page.evaluate(() => { const G = window.__G; G.heli.spool = 0; G.leaveCar(true); MBD.sim(3, 1 / 30); });
    const h = R.heli;
    ck('heli model light', h.meshes <= 24, h.meshes);
    ck('heli rotors spin', Math.abs(h.spin.main) > 0.5 && Math.abs(h.spin.tail) > 0.5, h.spin);
    ck('heli takeoff (collective)', h.takeoff.air && h.takeoff.alt > 12, h.takeoff);
    ck('heli altitude hold', Math.abs(h.hold.d) < 2 && Math.abs(h.hold.vy) < 0.6, h.hold);
    ck('heli flight HUD', h.hudFly && h.hudAfter, h);
    ck('heli cyclic inertia', h.fwd.sp[0] < h.fwd.sp[3] && h.fwd.sp[7] > 25 && h.fwd.minP < -0.15 && h.fwd.minP > -0.4, h.fwd);
    ck('heli auto-level + glide', h.level.v1s > h.level.v0 * 0.6 && h.level.pitch15 > -0.06 && h.level.vEnd < 4 && Math.abs(h.level.pitchEnd) < 0.08, h.level);
    ck('heli yaw + bank limits', h.yaw.dh > 0.8 && h.yaw.maxRoll > 0.08 && h.yaw.maxRoll <= 0.5 && Math.abs(h.yaw.rollAfter) < 0.1, h.yaw);
    ck('heli lands + exit', !h.landed.air && h.onFoot, h.landed);
    ck('heli touch controls', h.touchUi, h);
  }
  R.errs = errs; ck('0 console errors', errs.length === 0, errs.slice(0, 4));
  console.log(JSON.stringify(R)); console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error('ERR', e); process.exit(2); });
