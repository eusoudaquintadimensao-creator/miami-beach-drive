// Teste FASE 7 (t408/t410/t412): Boutique Brisa + Arsenal Aurora (entrar, comprar, vestir, espelho/poses, salvar por personagem, GPS), Marisol, trajes com poderes, entrar no mar andando/nadando e voltar, dirigir na areia por baixo do píer. Uso: node test/t408.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}fase7-${GAME}-${out}-${name}.png` }); };
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



  let r;
  // 1) Boutique: porta grande, entrar andando, card da loja
  await ev(() => { MBD.setHour(12); __onFoot(298, 192); window.__G.camYaw = -Math.PI / 2; MBD.sim(20, 1 / 30); });
  await shot('loja-fora', 500);
  r = await ev(() => { const G = window.__G; const I = MBD.input; for (let i = 0; i < 90; i++) { I.stick = [0, 1]; G.camYaw = -Math.PI / 2; MBD.sim(1, 1 / 30); } I.stick = null; MBD.sim(10, 1 / 30); const B = G.boutique; return { x: +G.player.x.toFixed(1), here: B.here && B.here.id, card: !document.getElementById('lojaCard').hidden }; });
  ck('1 entra andando pela porta da Boutique e vê o card', r.here === 'roupas' && r.card && r.x < 289, r);
  await shot('loja-dentro', 500);
  // 2) espelho, comprar com dinheiro das corridas, vestir na hora, reação, poses
  r = await ev(() => { const G = window.__G; G.save.money = 5000; G.boutique.open(true); MBD.sim(10, 1 / 30); return { open: document.body.classList.contains('lojaOpen'), lock: !!G.mirrorLock, panel: !document.getElementById('lojaPanel').hidden }; });
  ck('2 espelho abre o catálogo e trava o andar', r.open && r.lock && r.panel, r);
  await shot('loja-espelho', 500);
  r = await ev(() => { const G = window.__G; const id = G.hero.id; document.querySelector('[data-tab="hat"]').click(); const btn = document.querySelector('[data-buy]'); const item = btn && btn.dataset.buy; const m0 = G.save.money; btn.click(); MBD.sim(20, 1 / 30); const w = G.save.ward[id]; return { id, item, paid: m0 - G.save.money, own: w && w.own.includes(item), eq: w && Object.values(w.eq).includes(item), react: !document.getElementById('lojaReact').hidden }; });
  ck('2 compra com o dinheiro e veste na hora (com reação)', r.item && r.paid > 0 && r.own && r.eq && r.react, r);
  await sleep(900); await ev(() => MBD.sim(10, 1 / 30)); await shot('loja-comprou', 300);
  r = await ev(() => { const G = window.__G; const bs = [...document.querySelectorAll('#lojaPanel [data-pose]')]; const out = []; for (const b of bs) { document.getElementById('lojaReact').hidden = true; b.click(); MBD.sim(5, 1 / 30); out.push(G.boutique.poseK === b.dataset.pose && !document.getElementById('lojaReact').hidden); } return { n: bs.length, out }; });
  ck('2 poses no espelho', r.n >= 4 && r.out.every(Boolean), r);
  r = await ev(() => { const G = window.__G; G.boutique.close(); MBD.sim(5, 1 / 30); return { open: document.body.classList.contains('lojaOpen'), lock: !!G.mirrorLock }; });
  ck('2 fechar libera o jogador', !r.open && !r.lock, r);
  // 3) Marisol (personagem original) com roupa própria
  r = await ev(async () => { const G = window.__G; G.setAvatar('marisol'); MBD.sim(10, 1 / 30); const m = await import('/src/wardrobe.js'); const L = G.wardrobe.look('marisol'); const eq = Object.assign({}, m.CIVIL.marisol.eq, L.eq); return { id: G.hero.id, mode: L.mode, sex: m.sexOf('marisol'), top: eq.top, kind: eq.top && m.ITEMS[eq.top].kind }; });
  await sleep(1800); await ev(() => { window.__G.boutique.open(true); MBD.sim(15, 1 / 30); });
  ck('3 Marisol existe e veste roupa feminina', r.id === 'marisol' && r.sex === 'f' && r.kind === 'vestido', r);
  await shot('marisol-espelho', 400);
  // 4) Arsenal Aurora: traje com poder (voo), outro com escudo e velocidade
  r = await ev(() => { const G = window.__G; G.boutique.close(); G.setAvatar('solar'); __onFoot(280, 258); MBD.sim(20, 1 / 30); return { here: G.boutique.here && G.boutique.here.id }; });
  await sleep(1800); await ev(() => MBD.sim(10, 1 / 30)); await shot('trajes-arsenal', 300);
  ck('4 Arsenal Aurora ao lado, entra andando', r.here === 'trajes', r);
  r = await ev(() => { const G = window.__G; G.save.money = 20000; G.boutique.open(); MBD.sim(5, 1 / 30); const b = document.querySelectorAll('[data-buy]')[0]; const id = b && b.dataset.buy; b.click(); MBD.sim(15, 1 / 30); return { id, perk: G.wardrobe.perk(), kind: G.powers.kind, suit: G.save.ward[G.hero.id].suit }; });
  ck('4 compra traje e ganha o poder', r.id && r.suit === r.id && ['voo', 'escudo', 'velocidade'].includes(r.perk), r);
  await sleep(1500); await ev(() => MBD.sim(5, 1 / 30)); await shot('trajes-traje', 300);
  r = await ev(() => { const G = window.__G; G.boutique.close(); G.setAvatar('marisol'); const W = G.wardrobe; G.save.money = 20000; G.boutique.open(); document.querySelector('[data-mode="suit"]') && document.querySelector('[data-mode="suit"]').click(); const bs = [...document.querySelectorAll('[data-buy]')]; const res = []; for (const b of bs) { const id = b.dataset.buy; const bb = document.querySelector(`[data-buy="${id}"]`); if (bb) bb.click(); MBD.sim(3, 1 / 30); res.push([id, W.perk(), +W.speedK().toFixed(2)]); } G.boutique.close(); return { res }; });
  ck('4 trajes genéricos: escudo, voo e velocidade (×1.45)', r.res.length >= 3 && r.res.some(x => x[1] === 'escudo') && r.res.some(x => x[1] === 'voo') && r.res.some(x => x[1] === 'velocidade' && x[2] > 1.4), r);
  // 5) salvo por personagem após recarregar
  const before = await ev(() => { const G = window.__G; G.persist && G.persist(); return JSON.stringify(G.save.ward); });
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 }); await ev(() => { MBD.home().data.intro = true; }); await page.click('#play'); await sleep(1500);
  r = await ev(() => JSON.stringify(window.__G.save.ward)); ck('5 roupas e trajes salvos por personagem após recarregar', r === before && r.includes('marisol') && r.includes('solar'), { before: before.slice(0, 200), after: r.slice(0, 200) });
  // 6) GPS do celular lista as lojas
  r = await ev(() => { const G = window.__G; const l = G.boutique.gpsLinks(); return { n: (l.match(/Brisa|Aurora/g) || []).length }; });
  ck('6 GPS do celular lista Boutique Brisa e Arsenal Aurora', r.n >= 2, r);
  // 7) mar: entrar andando da areia, água nas pernas/cintura (mais lento), nadar no fundo e voltar
  await ev(() => { window.__car = () => { const G = window.__G; const v0 = G.player.vehicle; if (v0 && !v0.spec.air && !v0.spec.boat) return v0; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); } MBD.teleport(300, -150, 0); MBD.sim(3, 1 / 30); MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return G.player.vehicle; }; window.__onFoot = (x, z) => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.teleport(x, z, 0); MBD.sim(3, 1 / 30); }; });
  r = await ev(() => { const G = window.__G; __onFoot(350, 20); const I = MBD.input; const P = G.player; let wade = 0, swim = 0, maxX = 0, stuckT = 0, lx = P.x;
    for (let i = 0; i < 1500; i++) { I.stick = [0, i < 750 ? 1 : -1]; G.camYaw = Math.PI / 2; MBD.sim(1, 1 / 30); if (P.inWater && !P.swim) wade++; if (P.swim) swim++; maxX = Math.max(maxX, P.x); if (i > 760 && Math.abs(P.x - lx) < 0.005) stuckT++; lx = P.x; }
    I.stick = null; return { maxX: +maxX.toFixed(0), wade, swim, endX: +P.x.toFixed(1), endY: +P.y.toFixed(2), inWater: !!P.inWater, stuckT }; });
  ck('7 entra no mar andando (vadeia), nada no fundo e volta para a areia', r.wade > 50 && r.swim > 20 && r.maxX > 495 && r.endX < 400 && !r.inWater && r.stuckT < 30, r);
  await ev(() => { const G = window.__G; __onFoot(420, 20); const I = MBD.input; for (let i = 0; i < 20; i++) { I.stick = [0, 1]; G.camYaw = Math.PI / 2 + 2.6; MBD.sim(1, 1 / 30); } I.stick = null; G.snapCam && G.snapCam(); });
  await shot('mar-vadeando', 400);
  await ev(() => { const G = window.__G; __onFoot(500, 20); const I = MBD.input; for (let i = 0; i < 40; i++) { I.stick = [0, 1]; G.camYaw = Math.PI / 2 + 0.9; MBD.sim(1, 1 / 30); } I.stick = null; });
  await shot('mar-nadando', 400);
  // 8) t419: carro atravessa as passarelas de madeira na areia (tábuas quebram), segue sem travar; a pé anda no píer baixo
  r = await ev(() => { const G = window.__G; __onFoot(300, -150); const v = __car(); MBD.drive && (MBD.drive().cruise = 0); const out = []; const t0 = G.breaks.count.tabua;
    for (const x of [330, 342, 352]) { v.place(x, -360, 0); v.vf = v.vx = v.vz = 0; MBD.sim(3, 1 / 30); let lowT = 0, last = v.z, stuck = 0;
      for (let i = 0; i < 600 && v.z < -240; i++) { v.h = 0; v.vf = 16; v.vz = 16; v.vx = 0; MBD.sim(1, 1 / 30); if (v.z - last < 0.1) { if (++lowT === 10) stuck++; } else lowT = 0; last = v.z; }
      out.push([x, +v.z.toFixed(0), stuck]); }
    return { out, tabuas: G.breaks.count.tabua - t0 }; });
  ck('8 carro atravessa a passarela na areia em x 330/342/352 quebrando as tábuas', r.out.every(o => o[1] >= -241 && o[2] === 0) && r.tabuas >= 3, r);
  await ev(() => { const v = window.__G.player.vehicle; v.place(340, -312, 0); v.vf = v.vz = 0; MBD.sim(5, 1 / 30); window.__G.snapCam(); MBD.sim(5, 1 / 30); });
  await shot('passarela-quebrada', 400);
  r = await ev(() => { const G = window.__G; G.breaks.respawnAll(); __onFoot(300, -299); const I = MBD.input; const P = G.player; let maxY = 0; for (let i = 0; i < 400; i++) { I.stick = [0, 1]; G.camYaw = Math.PI / 2; MBD.sim(1, 1 / 30); maxY = Math.max(maxY, P.y); } I.stick = null; return { x: +P.x.toFixed(0), maxY: +maxY.toFixed(2) }; });
  ck('8 a pé anda no píer baixo (passarelas restauradas)', r.maxY > 0.6 && r.x > 330, r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
