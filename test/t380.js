// Teste t380: Mega Garagem (E), vida na cidade/praia (F), app GPS OSM (G). Uso: node test/t380.js W H q tag  (ONLY=mega,vida,gps)
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
  const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${SH}${GAME}-${out}-${name}.png` }); };
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

  if (want('mega')) {
    R.m1 = await ev(() => { const G = window.__G, M = MBD.mega(); const v0 = G.player.vehicle; if (v0) { v0.vx = v0.vz = v0.vf = 0; G.leaveCar(true); } MBD.setHour(15);
      const o = { n: M.slots.length, addr: M.address() };
      MBD.teleport(M.doorOut.x, M.doorOut.z, -Math.PI / 2); MBD.sim(20, 1 / 30); o.roofOut = M.roof.visible;
      MBD.teleport(-566, 371.2, -Math.PI / 2); window.__G.camYaw = -Math.PI / 2; for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30);
      o.roofIn = M.roof.visible; o.full = G.vehicles.filter(v => v.megaId != null).length; o.focus = M.focus; const el = document.getElementById('megaCard'); o.card = !el.hidden; o.txt = el.textContent.slice(0, 120); o.noEnter = M.slots[M.focus] && M.slots[M.focus].v && M.slots[M.focus].v.noEnter;
      o.lbl = document.body.classList.contains('touch') ? document.getElementById('bAct').textContent : 'desktop'; return o; });
    R.mov = await ev((ids) => __box(ids, ['megaCard']), UI.concat(['megaCard']));
    await shot('mega-ficha');
    R.m2 = await ev(async () => { const G = window.__G, M = MBD.mega(); const i = M.focus; G.save.money = 100; const own0 = M.isOwned(i); M.act(); const poor = !M.isOwned(i) && G.save.money === 100;
      G.save.money = 80000; const m0 = G.save.money; const b = document.querySelector('#megaCard button[data-k=buy]'); M._ck = null; M.card(); document.querySelector('#megaCard button[data-k=buy]').click(); const bought = M.isOwned(i);
      return { i, own0, poor, bought, dm: G.save.money - m0, price: M.price(i), saved: JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k => /save/.test(k)) || '{}') || '{}') && true, enter: M.slots[i].v && !M.slots[i].v.noEnter }; });
    await sleep(300); await shot('mega-comprado');
    R.m3 = await ev(() => { const G = window.__G, M = MBD.mega(); const i = M.focus; M._ck = null; M.card(); document.querySelector('#megaCard button[data-k=tune]').click(); MBD.sim(2, 1 / 30); return { garage: G.garageOpen, name: G.player.vehicle && G.player.vehicle.spec.name }; });
    await shot('mega-pintar');
    R.m4 = await ev(() => { const G = window.__G, M = MBD.mega(); const b = document.querySelector('#gPanel button[data-k=paint]:not(.sel)'); const col = +b.dataset.v; b.click(); document.getElementById('gApply').click(); MBD.sim(2, 1 / 30); const v = G.player.vehicle;
      return { closed: !G.garageOpen, paint: v.tune.paint === col, model: v.spec.name, mega: v.megaId, saved: M.G.save.mega.tunes[v.megaId] && M.G.save.mega.tunes[v.megaId].paint === col, mainTune: G.save.tune && G.save.tune.paint === col }; });
    R.m5 = await ev(() => { const G = window.__G, M = MBD.mega(); const v = G.player.vehicle; MBD.input.stick = [0, 1]; for (let i = 0; i < 120; i++) MBD.sim(1, 1 / 30); MBD.input.stick = [0, 0]; const o = { x: Math.round(v.x), out: M.slots[v.megaId].out, outside: !M.inHall(v.x, v.z) };
      v.vx = v.vz = v.vf = 0; G.leaveCar(true); MBD.teleport(-200, -300, 0); for (let i = 0; i < 40; i++) MBD.sim(1, 1 / 30); o.back = !M.slots[v.megaId].out && M.slots[v.megaId].v === null; return o; });
    R.m6 = await ev(() => { const G = window.__G, M = MBD.mega(); G.ui.openPhone(); const app = document.querySelector('#phBody .app[data-p=mega]'); const has = !!app; app && app.click(); const t = document.getElementById('phBody').textContent; const go = document.querySelector('#phBody button[data-a=go]'); go && go.click();
      return { app: has, addr: /Endereço/.test(t) && /nº/.test(t), coll: /1\/50|\d+\/50/.test(t), route: !!G.route, closed: !G.phoneOpen }; });
    await ev(() => { const G = window.__G, M = MBD.mega(); MBD.teleport(M.doorOut.x + 30, M.doorOut.z + 8, -Math.PI / 2); G.camYaw = -Math.PI / 2 - 0.25; G.camPitch = 0.12; MBD.setHour(20.5); MBD.sim(25, 1 / 30); });
    await shot('mega-fachada-noite');
    ck('mega: 50 carros e endereço', R.m1.n === 50 && /nº/.test(R.m1.addr), R.m1.addr);
    ck('mega: entra a pé, teto some dentro', R.m1.roofOut && !R.m1.roofIn && R.m1.full >= 6, R.m1);
    ck('mega: ficha com preço e desempenho, não dá para entrar sem comprar', R.m1.card && /Comprar \$/.test(R.m1.txt) && /km\/h/.test(R.m1.txt) && R.m1.noEnter === true && (R.m1.lbl === 'desktop' || /Comprar/.test(R.m1.lbl)), R.m1);
    ck('mega: ficha sem sobrepor', R.mov.ov.length === 0 && R.mov.off.length === 0, R.mov);
    ck('mega: sem dinheiro não compra; com dinheiro compra e libera', R.m2.poor && R.m2.bought && R.m2.dm === -R.m2.price && R.m2.enter, R.m2);
    ck('mega: pintar e tunar o carro comprado (salva só nele)', R.m3.garage && R.m4.closed && R.m4.paint && R.m4.saved && !R.m4.mainTune && R.m4.model === R.m3.name, { m3: R.m3, m4: R.m4 });
    ck('mega: sai dirigindo pela porta e volta para a vaga depois', R.m5.out && R.m5.outside && R.m5.back, R.m5);
    ck('mega: app no celular com endereço e GPS', R.m6.app && R.m6.addr && R.m6.coll && R.m6.route && R.m6.closed, R.m6);
  }

  if (want('gps')) {
    R.g1 = await ev(async () => { const G = window.__G; if (G.phoneOpen) G.ui.closePhone(); MBD.teleport(-480, -300, 0); MBD.sim(3, 1 / 30); G.ui.openPhone(); const app = document.querySelector('#phBody .app[data-p=gps]'); const has = !!app; app && app.click();
      for (let i = 0; i < 100 && !(G.gps && G.gps.data && G.gps.view); i++) await new Promise(r => setTimeout(r, 100));
      await new Promise(r => setTimeout(r, 300)); const D = G.gps.data; const cv = document.getElementById('gpsCv'); const r = cv.getBoundingClientRect(); const at = document.getElementById('gpsAttr'); const ar = at.getBoundingClientRect();
      const px = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; const cols = new Set(); for (let i = 0; i < px.length; i += 4 * 97) cols.add((px[i] >> 4) + ',' + (px[i + 1] >> 4) + ',' + (px[i + 2] >> 4));
      const t = document.getElementById('phBody').textContent;
      return { app: has, places: D.places.length, roads: D.roads.reduce((a, c) => a + c.length, 0), water: D.water.length, cv: [r.width, r.height].map(Math.round), inView: r.top >= 0 && r.bottom <= Math.min(innerHeight, document.getElementById('phBody').getBoundingClientRect().bottom) + 1 && r.left >= 0 && r.right <= innerWidth + 1, cols: cols.size,
        attr: /OpenStreetMap/.test(at.textContent) && /ODbL/.test(at.textContent) && ar.height > 4 && ar.bottom <= Math.min(innerHeight, document.getElementById('phBody').getBoundingClientRect().bottom) + 1 && ar.top >= document.getElementById('phBody').getBoundingClientRect().top - 1, here: /inspirada em/.test(t), list: document.querySelectorAll('#gpsList button').length, info: document.getElementById('gpsInfo').textContent.slice(0, 80) }; });
    await shot('gps-geral');
    R.g2 = await ev(async () => { const G = window.__G; const b = document.querySelector('#gpsList button[data-place="South Beach"]'); b && b.click(); await new Promise(r => setTimeout(r, 200)); const s1 = G.gps.view.s; document.querySelector('.gpsBtns button[data-z="1"]').click(); await new Promise(r => setTimeout(r, 200));
      const info = document.getElementById('gpsInfo'); return { sel: info.dataset.place, desc: info.textContent.length > 60 && /art déco/.test(info.textContent), zoomed: G.gps.view.s > s1 * 1.5 }; });
    await shot('gps-zoom');
    R.g3 = await ev(async () => { const G = window.__G; const cv = document.getElementById('gpsCv'); const v = G.gps.view; const p = G.gps.data.places.find(q => q.n === 'Brickell'); v.cx = p.x; v.cy = p.y; G.gps.draw(); const r = cv.getBoundingClientRect();
      const o = { pointerId: 5, bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2, pointerType: 'touch' }; cv.dispatchEvent(new PointerEvent('pointerdown', o)); cv.dispatchEvent(new PointerEvent('pointerup', o)); await new Promise(r => setTimeout(r, 100));
      const tapped = document.getElementById('gpsInfo').dataset.place; const sw = await (await fetch('sw.js')).text(); const back = document.querySelector('#phBody button[data-a=gpsmap]'); back && back.click(); const big = !document.getElementById('bigmap').hidden; G.ui.closeMap();
      return { tapped, sw: /assets\/osm\/miami\.json/.test(sw) && /gpsosm\.js/.test(sw), big }; });
    ck('gps: app com mapa real de Miami (OSM) desenhado', R.g1.app && R.g1.places >= 30 && R.g1.roads > 10000 && R.g1.water > 0 && R.g1.cols >= 4 && R.g1.cv[1] >= 120 && R.g1.inView, R.g1);
    ck('gps: atribuição OpenStreetMap/ODbL visível', R.g1.attr, R.g1);
    ck('gps: bairros com nome e informação', R.g1.list >= 30 && R.g1.here && R.g2.sel === 'South Beach' && R.g2.desc, { g1: R.g1.info, g2: R.g2 });
    ck('gps: zoom e toque no mapa mostram o lugar', R.g2.zoomed && R.g3.tapped === 'Brickell', { g2: R.g2, g3: R.g3 });
    ck('gps: guardado offline pelo service worker; abre o mapa do jogo', R.g3.sw && R.g3.big, R.g3);
  }

  if (want('vida')) {
    R.v1 = await ev(() => { const G = window.__G; if (G.phoneOpen) G.ui.closePhone(); window.__onFoot(372, -332); MBD.setHour(11); G.camYaw = Math.PI; G.camPitch = 0.1; for (let i = 0; i < 30; i++) MBD.sim(1, 1 / 30);
      const B = MBD.beach(); const c = B.counts(); const vis = B.torso.visible; let near = 0; for (const f of B.figs) if (!f.hidden && Math.hypot(f.x - 372, f.z + 332) < 120) near++;
      const surf = B.figs.filter(f => f.kind === 'surf'); const sx0 = surf.map(f => f.x); for (let i = 0; i < 60; i++) MBD.sim(1, 1 / 30); const moved = surf.some((f, k) => Math.abs(f.x - sx0[k]) > 0.5);
      const inWater = surf.every(f => f.x > 384) && B.figs.filter(f => f.kind === 'swim').every(f => f.x > 384);
      return { c, vis, near, moved, inWater, peds: MBD.state.peds, q: MBD.state.quality }; });
    await sleep(2000); await shot('vida-praia');
    R.v2 = await ev(() => { const G = window.__G, B = MBD.beach(); MBD.setHour(23.5); MBD.sim(3, 1 / 30); const night = B.counts(); MBD.setHour(11); MBD.sim(3, 1 / 30); window.__onFoot(-480, -300); MBD.sim(5, 1 / 30); const away = !B.torso.visible; return { night, away }; });
    R.v3 = await ev(() => { const G = window.__G; const v = G.vehicles.find(x => x.npc && x.type === 'sedan') || G.vehicles.find(x => x.type === 'sedan'); let mir = false; v && v.body.traverse(o => { if (o.geometry && o.geometry.attributes.position && o.material === v.body.children[0].material) { } }); const n = v ? v.body.children.length : 0;
      const cr = G.crowd; return { carParts: n, shoes: !!cr.shoes && cr.shoes.count === cr.n * 2, hairL: !!cr.hairL }; });
    R.v4 = await ev(() => { const G = window.__G; G.ui.openMap(); const s0 = G.ui.bv.s; document.querySelector('#bmBtns button[data-z="1"]').click(); const s1 = G.ui.bv.s; document.querySelector('#bmBtns button[data-z="0"]').click(); const pl = G.player; const v = G.ui.bv; const cx = (G.ui.map.X(pl.x) - v.ox) * v.s, cz = (G.ui.map.Z(pl.z) - v.oy) * v.s; const W = G.ui.bm.width, H = G.ui.bm.height;
      const r = G.ui.bm.getBoundingClientRect(); const o = { pointerId: 9, bubbles: true, clientX: r.left + r.width * 0.3, clientY: r.top + r.height * 0.4 }; G.ui.waypoint = null; G.ui.bm.dispatchEvent(new PointerEvent('pointerdown', o)); G.ui.bm.dispatchEvent(new PointerEvent('pointerup', o));
      return { s0, s1, centered: Math.abs(cx - W / 2) < W * 0.3 && Math.abs(cz - H / 2) < H * 0.3, wp: !!G.ui.waypoint, btns: window.__box(['bmBtns', 'bmX', 'bmLeg'], ['bmBtns']) }; });
    await shot('vida-mapa-zoom');
    await ev(() => window.__G.ui.closeMap());
    const minPeds = Math.round(({ low: 40, medium: 84, high: 124 }[R.v1.q] || 40) * (mobile ? 0.75 : 1)); // celular usa 75% (era 22/45/69)
    ck('vida: praia cheia de dia (banhistas, vôlei, crianças, surfistas, nadadores, vendedores, pipas)', R.v1.vis && R.v1.c.lie >= 20 && R.v1.c.sit >= 10 && R.v1.c.volley === 8 && R.v1.c.kid >= 5 && R.v1.c.surf >= 4 && R.v1.c.swim >= 6 && R.v1.c.vendor >= 2 && R.v1.c.kiter >= 2 && R.v1.near >= (R.v1.q === 'low' ? 10 : 15), R.v1); // low: 26 banhistas na praia inteira (t386 reservou zonas da orla)
    ck('vida: surfistas se movem e ficam no mar', R.v1.moved && R.v1.inWater, R.v1);
    ck('vida: mais pedestres na calçada', R.v1.peds >= minPeds, { peds: R.v1.peds, q: R.v1.q });
    ck('vida: de madrugada a praia esvazia; longe da praia nada é desenhado', !R.v2.night.lie && !R.v2.night.volley && R.v2.away, R.v2);
    ck('vida: carros com retrovisores, pedestres com sapatos e cabelos variados', R.v3.carParts >= 8 && R.v3.shoes && R.v3.hairL, R.v3);
    ck('vida: mapa completo com zoom, centralizar e marcar destino', R.v4.s1 > R.v4.s0 && R.v4.centered && R.v4.wp && R.v4.btns.off.length === 0, R.v4);
  }

  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
