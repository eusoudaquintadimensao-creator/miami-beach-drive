// Teste t418/t419/t420: cabine de pintura drive-through (entrar, escolher cor/acabamento, pagar, animação, salvo por veículo após recarregar, sair, GPS/celular); postes/semáforos/guarda-sóis/passarelas quebram e voltam; carro entra no mar raso, para no fundo sem afundar e volta; beira-mar sem travar; NITRO nunca sobre o carro. Uso: node test/t418.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}t418-${GAME}-${out}-${name}.png` }); };
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
  const NAME = process.env.PINTNAME || (KEY === 'nd' ? 'Cabine Cromo' : 'Pintura');
  // 1) GPS e celular
  r = await ev((N) => { const G = window.__G; let gps = ''; try { const d = document.createElement('div'); G.gps.mount(d); gps = d.innerHTML; } catch (e) { gps = 'ERR ' + e.message; } return { gps: gps.includes(N) || G.paint.gpsLinks().includes(N), inMount: gps.includes(N), phone: G.paint.phoneHtml().length > 50 }; }, NAME);
  ck('1 GPS do celular lista a cabine de pintura', r.gps && r.phone, r);
  // 2) entrar de carro pela entrada, parar dentro
  r = await ev(() => { const G = window.__G; const v = __car(); MBD.drive && (MBD.drive().cruise = 0); const P = G.paint; v.place(P.cx, P.z0 - 8, 0); v.vx = v.vz = 0; MBD.sim(3, 1 / 30); let st = 0;
    for (let i = 0; i < 300 && v.z < P.cz - 2; i++) { v.h = 0; v.vz = 8; v.vx = 0; const z0 = v.z; MBD.sim(1, 1 / 30); if (v.z - z0 < 0.02) st++; } v.vx = v.vz = v.vf = 0; MBD.sim(10, 1 / 30);
    return { z: +v.z.toFixed(1), cz: P.cz, st, card: !document.getElementById('pintCard').hidden }; });
  ck('2 carro entra pela ENTRADA da cabine sem travar e aparece o convite', r.st === 0 && r.card, r);
  await shot('pintura-dentro');
  // 3) dinheiro insuficiente bloqueia; com dinheiro escolhe cor + acabamento
  r = await ev(() => { const G = window.__G; G.addMoney(-G.save.money + 100); document.querySelector('#pintCard button').click(); MBD.sim(3, 1 / 30); const open = !document.getElementById('pintPanel').hidden; const go = document.querySelector('#pintPanel [data-k="go"]'); const blocked = go.disabled; return { open, blocked, nf: document.querySelectorAll('#pintPanel [data-f]').length, nc: document.querySelectorAll('#pintPanel [data-c]').length }; });
  ck('3 painel abre com 5 acabamentos e muitas cores; sem dinheiro não pinta', r.open && r.blocked && r.nf >= 5 && r.nc >= 30, r);
  r = await ev(() => { const G = window.__G; G.addMoney(5000 - G.save.money); G.paint.render && G.paint.render(); document.querySelector('#pintPanel [data-f="cromo"]').click(); document.querySelector('#pintPanel [data-c="' + 0x29d3c4 + '"]') ? document.querySelector('#pintPanel [data-c="' + 0x29d3c4 + '"]').click() : document.querySelectorAll('#pintPanel [data-c]')[20].click(); MBD.sim(5, 1 / 30); const v = G.player.vehicle; return { pk: v._pk, sel: G.paint.sel }; });
  ck('3 prévia ao vivo da cor/acabamento escolhidos', r.pk && r.pk.endsWith(':cromo'), r);
  await shot('pintura-menu');
  // 4) pagar e animação (robôs, névoa, cor varrendo) -> sai rodando
  r = await ev(() => { const G = window.__G; const m0 = G.save.money; const go = document.querySelector('#pintPanel [data-k="go"]'); go.disabled = false; go.click(); const states = new Set(); for (let i = 0; i < 100; i++) { MBD.sim(1, 1 / 30); states.add(G.paint.state); } return { paid: m0 - G.save.money, states: [...states], price: 1600 }; });
  ck('4 cobra o preço e começa a pintura (entrada/spray)', r.paid === 1600 && r.states.includes('spray'), r);
  await shot('pintura-spray', 200);
  r = await ev(() => { const G = window.__G; const states = new Set(); for (let i = 0; i < 500 && G.paint.state; i++) { MBD.sim(1, 1 / 30); states.add(G.paint.state); } MBD.sim(40, 1 / 30); const v = G.player.vehicle; return { states: [...states], end: G.paint.state, z: +v.z.toFixed(1), z1: G.paint.z1, saved: JSON.stringify(G.save.paint), pk: v._pk }; });
  ck('4 secagem e o carro sai pela SAÍDA do outro lado, pintura salva', !r.end && r.states.includes('out') && r.z > r.z1 && r.pk && r.pk.endsWith(':cromo') && r.saved.includes('cromo'), r);
  await ev(() => { const G = window.__G; const v = G.player.vehicle; v.vx = v.vz = 0; G.snapCam(); MBD.sim(5, 1 / 30); });
  await shot('pintura-saiu');
  // 5) depois de recarregar a pintura continua no mesmo carro
  await ev(() => window.__G.persist && window.__G.persist());
  await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 }); await page.click('#play'); await sleep(1500);
  await ev(() => { window.__car = () => { const G = window.__G; MBD.teleport(300, -150, 0); MBD.sim(3, 1 / 30); MBD.onActTap(1); for (let i = 0; i < 150 && G.carCall; i++) MBD.sim(1, 1 / 30); MBD.onActTap(1); MBD.sim(3, 1 / 30); return G.player.vehicle; }; });
  r = await ev(() => { const G = window.__G; const v = __car(); MBD.sim(30, 1 / 30); return { pk: v && v._pk, saved: JSON.stringify(G.save.paint) }; });
  ck('5 pintura salva por veículo continua após recarregar', r.pk && r.pk.endsWith(':cromo'), r);
  // 6) postes, semáforos, guarda-sóis e passarelas quebram, carro segue, e voltam
  r = await ev(() => { const G = window.__G, B = G.breaks, v = G.player.vehicle; MBD.drive && (MBD.drive().cruise = 0); const all = [...B.grid.values()].flat(); const out = {};
    const run = (x, z, h, tx) => { v.place(x, z, h); v.vx = v.vz = 0; MBD.sim(3, 1 / 30); let stuck = 0, last = -1e9, minSp = 99; for (let i = 0; i < 300; i++) { v.h = h; if (i < 12 || true) { v.vx = Math.sin(h) * 14; v.vz = Math.cos(h) * 14; } MBD.sim(1, 1 / 30); const d = Math.abs(h - Math.PI / 2) < 0.01 ? v.x : v.z; if (d - last < 0.05) stuck++; last = d; if (d > tx) break; } return stuck; };
    for (const [k, f] of [['poste', o => o.x > 100 && o.x < 300], ['sinal', o => o.x > 0], ['guarda-sol', o => o.x < 360]]) { const gk = (o) => k === 'guarda-sol' ? [o.x, o.z - 16, o.z] : [o.z, o.x - 16, o.x]; const cs = all.filter(q => q.kind === k && !q.down && f(q) && !all.some(p => p !== q && p.kind !== 'tabua' && (k === 'guarda-sol' ? Math.abs(p.x - q.x) < 3 && p.z > q.z - 17 && p.z < q.z : Math.abs(p.z - q.z) < 3 && p.x > q.x - 17 && p.x < q.x))).slice(0, 6); if (!cs.length) { out[k] = 'nenhum'; continue; } const c0 = B.count[k]; let st = 0, tent = 0; for (const o of cs) { if (o.down) continue; tent++; st = (k === 'guarda-sol' ? run(o.x, o.z - 15, 0, o.z + 8) : run(o.x - 15, o.z, Math.PI / 2, o.x + 8)); if (B.count[k] > c0) break; } out[k] = { quebrou: B.count[k] - c0, st, tent }; }
    const t0 = B.count.tabua; const st = run(300, -299, Math.PI / 2, 392); out.tabua = { quebrou: B.count.tabua - t0, st };
    out.down = B.secs.filter(s => s.down).length + B.fall.length; return out; });
  ck('6 poste, semáforo, guarda-sol e passarela quebram e o carro segue', ['poste', 'sinal', 'guarda-sol', 'tabua'].every(k => r[k] && r[k].quebrou >= 1 && r[k].st <= 3), r);
  await ev(() => { const v = window.__G.player.vehicle; v.vx = v.vz = 0; v.place(345, -299, -Math.PI / 2 + 0.6); MBD.sim(15, 1 / 30); window.__G.snapCam(); MBD.sim(3, 1 / 30); });
  await shot('passarela-lascas');
  r = await ev(() => { const G = window.__G, B = G.breaks; const v = G.player.vehicle; v.place(-200, 300, 0); v.vx = v.vz = 0; for (let i = 0; i < 60; i++) MBD.sim(10, 1 / 15); return { down: B.secs.filter(s => s.down).length, fall: B.fall.length }; });
  ck('6 peças quebradas voltam depois de um tempo', r.down === 0 && r.fall === 0, r);
  // 7) mar raso: entra, splash, para no fundo sem afundar, volta
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; v.place(340, 20, Math.PI / 2); MBD.sim(3, 1 / 30); let maxX = 0, minY = 9, msg = ''; const T0 = G.ui.toast; G.ui.toast = function (h, ...a) { msg += String(h).replace(/<[^>]+>/g, '').slice(0, 14) + '|'; return T0.call(this, h, ...a); };
    for (let i = 0; i < 500; i++) { v.h = Math.PI / 2; if (i < 300) v.vx = Math.max(v.vx, 10); MBD.sim(1, 1 / 30); maxX = Math.max(maxX, v.x); minY = Math.min(minY, v.y); }
    G.ui.toast = T0; return { maxX: +maxX.toFixed(1), minY: +minY.toFixed(2), msg: msg.slice(0, 200), vx: +v.vx.toFixed(2) }; });
  ck('7 carro entra no mar raso e para suave no fundo sem afundar', r.maxX > 380 && r.maxX < 460 && r.minY > -1.45 && Math.abs(r.vx) < 1.5 && /Fundo/.test(r.msg), r);
  await ev(() => { const G = window.__G; const v = G.player.vehicle; v.place(415, 20, Math.PI / 2 + 0.3); for (let i = 0; i < 30; i++) { v.vx = 9; v.vz = 2; MBD.sim(1, 1 / 30); } G.snapCam(); for (let i = 0; i < 8; i++) { v.vx = 9; MBD.sim(1, 1 / 30); } });
  await shot('mar-carro', 200);
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; v.place(430, 20, Math.PI / 2); MBD.sim(3, 1 / 30); let st = 0; for (let i = 0; i < 400 && v.x > 335; i++) { v.h = -Math.PI / 2; v.vx = Math.min(v.vx, -10); const x0 = v.x; MBD.sim(1, 1 / 30); if (Math.abs(v.x - x0) < 0.02) st++; } return { x: +v.x.toFixed(1), st }; });
  ck('7 carro sai do mar de volta para a areia', r.x <= 336 && r.st < 5, r);
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; G.lastRespawn = null; v.place(437, 20, Math.PI / 2); v.vx = v.vz = 0; MBD.sim(60, 1 / 30); const y = v.y, x = v.x; const D = MBD.drive(); D.brakeTaps = (D.brakeTaps || 0) + 1; MBD.sim(3, 1 / 30); return { ok: !!G.player.vehicle, y: +y.toFixed(2), x: +x.toFixed(1), resp: G.lastRespawn && G.lastRespawn.why }; });
  await page.waitForFunction(() => window.__G.player.vehicle.x < 357, { timeout: 20000, polling: 300 }).catch(() => {}); const r7 = await ev(() => { MBD.sim(20, 1 / 30); const v = window.__G.player.vehicle; return { x: +v.x.toFixed(1), z: +v.z.toFixed(1), y: +v.y.toFixed(2) }; });
  ck('7 no fundo não afunda nem anda além; Freio/respawn leva de volta à rua', r.ok && r.y > -1.45 && r.x < 445 && r7.x < 357, [r, r7]);
  // 8) beira-mar ao longo de z, sem travar
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; v.place(400, -280, 0); MBD.sim(3, 1 / 30); let st = 0, lz = v.z; for (let i = 0; i < 3000 && v.z < 420; i++) { v.h = 0; v.vz = Math.max(v.vz, 14); v.vx = 0; MBD.sim(1, 1 / 30); if (v.z - lz < 0.02) st++; lz = v.z; } return { z: +v.z.toFixed(0), st }; });
  ck('8 dirige na beira-mar (x 400) de z -280 a 420 sem travar', r.z >= 419 && r.st < 5, r);
  // 9) NITRO e textos nunca sobre o carro
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; v.place(250, -150, 0); MBD.sim(5, 1 / 30); for (let i = 0; i < 20; i++) { v.vz = 12; MBD.sim(1, 1 / 30); } G.ui.toast('Teste de mensagem t418'); G.msgGuard.tick(); MBD.sim(3, 1 / 30); G.msgGuard.tick(); const Z = G.msgZone; if (!Z) return { noZone: true };
    const bad = []; for (const id of ['nitroW', 'toast', 'note', 'prompt', 'big', 'driftW']) { const e = document.getElementById(id); if (!e || e.hidden) continue; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; const q = e.getBoundingClientRect(); if (q.width < 2) continue; const C = Z.car; if (q.left < C.x1 && q.right > C.x0 && q.top < C.y1 && q.bottom > C.y0) bad.push(id); }
    const n = document.getElementById('nitroW'); const nr = n ? n.getBoundingClientRect() : null; return { bad, car: Z.car, nitro: nr && [nr.left | 0, nr.top | 0, nr.right | 0, nr.bottom | 0] }; });
  ck('9 NITRO e mensagens não cobrem o carro', !r.noZone && r.bad.length === 0, r);
  await shot('nitro-carro', 200);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
