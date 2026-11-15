// Teste t405/t406/t407: fita de atalhos no topo, vidro branco espelhado legível, controles colados nas bordas (a pé, carro, heli, barco). Uso: node test/t405.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}botoes405-${GAME}-${out}-${name}.png` }); };
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



  await ev(() => { window.__chk = (state) => { const W = innerWidth, H = innerHeight; const vis = (el) => { if (!el || el.closest('[hidden]')) return false; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false; const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      const bar = document.getElementById('topBar'), br = bar.getBoundingClientRect(); const R = (el) => { const r = el.getBoundingClientRect(); return [r.left, r.top, r.right, r.bottom].map(Math.round); };
      const ov = (a, b) => Math.min(a[2], b[2]) - Math.max(a[0], b[0]) > 2 && Math.min(a[3], b[3]) - Math.max(a[1], b[1]) > 2;
      const B = R(bar); const hits = []; for (const id of ['topR', 'mapw', 'note', 'mis', 'stHud', 'raceHud', 'marHud', 'boatHud', 'ponteHud', 'giftHud', 'drift', 'turnCue', 'btns', 'stick']) { const el = document.getElementById(id); if (vis(el) && ov(B, R(el))) hits.push(id); }
      // botões fora da fita: nenhum no meio da tela; todos dentro da tela; sem sobreposição entre si
      const btns = [...document.querySelectorAll('#hud button, #touch button, .drvRight button, #drvCruise, #drvGear')].filter(b => !bar.contains(b) && vis(b) && !b.closest('#pauseMenu,#talk,#phone,#marTip,#stTip,#adCard,#orlaCard'));
      const mid = [], off = [], bov = []; const rs = btns.map(b => [b, R(b)]);
      for (const [b, r] of rs) { const cx = (r[0] + r[2]) / 2, cy = (r[1] + r[3]) / 2; if (cx > W * 0.3 && cx < W * 0.7 && cy > H * 0.25 && cy < H * 0.75) mid.push(b.id); if (r[0] < -1 || r[1] < -1 || r[2] > W + 1 || r[3] > H + 1) off.push(b.id); }
      for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) if (ov(rs[i][1], rs[j][1]) && !rs[i][0].contains(rs[j][0]) && !rs[j][0].contains(rs[i][0])) bov.push(rs[i][0].id + '×' + rs[j][0].id);
      const labels = btns.concat([...bar.querySelectorAll('button')].filter(vis)).map(b => (b.textContent || '').replace(/\s+/g, '').slice(0, 2)).filter(Boolean); const dup = labels.filter((l, i) => labels.indexOf(l) !== i);
      // legibilidade: borda branca quase opaca e sombra escura no texto
      const lg = [...bar.querySelectorAll('button')].concat(btns.filter(b => b.tagName === 'BUTTON')).filter(vis).filter(b => { const cs = getComputedStyle(b); const a = (cs.borderTopColor.match(/[\d.]+/g) || []).map(Number); const alpha = a.length > 3 ? a[3] : 1; return !(alpha >= 0.85 && a[0] > 200 && /rgb\(0, 0, 0\)|rgba\(0, 0, 0/.test(cs.textShadow)); }).map(b => b.id);
      return { state, bar: B, topZone: B[3] <= H * 0.3, hits, mid, off, bov: bov.slice(0, 6), dup, lg, n: btns.length, ids: btns.map(b => b.id) }; };
    window.__tap = (id) => { const b = document.getElementById(id); b.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'instant' }); const r = b.getBoundingClientRect(); const e = document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2); return !!e && (e === b || b.contains(e)); }; });
  const good = (o) => o.topZone && !o.hits.length && !o.mid.length && !o.off.length && !o.bov.length && !o.dup.length && !o.lg.length;
  // A) a pé, de dia na orla: fita recolhida (▦ ⏸) e aberta (todos os atalhos tocáveis)
  await ev(() => { localStorage.removeItem('topMin-v1'); const G = window.__G; __onFoot(300, -150); MBD.setHour(13); window.__G.topBar.set(true); MBD.sim(10, 1 / 30); });
  await sleep(700);
  let r = await ev(() => { const o = __chk('pe-fechado'); const bar = document.getElementById('topBar'); o.shown = [...bar.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 2).map(b => b.id); return o; });
  ck('A recolhida: só ▦ na fita, ⏸ ↩ na coluna da borda, sem cobrir nada', good(r) && r.shown.includes('qMore') && r.shown.length <= 2, r);
  await shot('pe-fechado', 500);
  r = await ev(() => { document.getElementById('qMore').click(); MBD.sim(3, 1 / 30); return null; });
  await sleep(700);
  r = await ev(() => { const o = __chk('pe-aberto'); const bar = document.getElementById('topBar'); const all = [...bar.querySelectorAll('button')].filter(b => b.getBoundingClientRect().width > 2); o.total = all.length + 1; o.untap = all.filter(b => !__tap(b.id)).map(b => b.id); document.getElementById('tbStrip').scrollLeft = 0; o.min = bar.classList.contains('min'); return o; });
  ck('A aberta: todos os atalhos numa fita no topo, todos tocáveis (rolando)', good(r) && !r.min && r.total >= (mobile ? 13 : 14) && !r.untap.length, r);
  await shot('pe-aberto', 500);
  r = await ev(() => { document.getElementById('bPause').click(); const open = !document.getElementById('pauseMenu').hidden; window.__G.closePause(); return { open }; });
  ck('A ⏸ da borda abre a pausa', r.open, r);
  // B) noite, a pé (legível no escuro também)
  await ev(() => { MBD.setHour(22); MBD.sim(10, 1 / 30); }); await sleep(500);
  r = await ev(() => __chk('pe-noite')); ck('B noite a pé: legível e sem sobreposição', good(r), r); await shot('pe-noite', 400);
  // C) no carro (dia e noite): Freio/Ré/Sair/Alto colados na borda direita, VEL/N/🎛️ na esquerda
  await ev(() => { const G = window.__G; MBD.setHour(13); const v = __car(); v.place(300, -150, 0); MBD.drive && (MBD.drive().cruise = 0); MBD.sim(10, 1 / 30); });
  await sleep(700);
  r = await ev(() => { const o = __chk('carro'); const W = innerWidth; const e = (id) => { const el = document.getElementById(id); if (!el) return null; const q = el.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.right), Math.round(q.width)]; }; o.brake = e('drvBrake'); o.rev = e('drvRev'); o.act = e('bAct'); o.drv = !!window.__G.player.vehicle; o.edge = !window.__G.touch || (o.brake && o.brake[1] > W - 30 && o.brake[2] >= 56 && o.rev && o.rev[2] >= 48); o.backHidden = !document.getElementById('bBack').hidden && !!document.getElementById('bBack').closest('#edgeCol'); /* t414: ↩ visível no carro, na coluna da borda */ return o; });
  ck('C carro de dia: controles nas bordas, Freio no canto direito e Ré grande, sem duplicado', good(r) && r.drv && r.edge && r.backHidden, r);
  await shot('carro-dia', 400);
  await ev(() => { MBD.setHour(22); MBD.sim(10, 1 / 30); }); await sleep(700);
  r = await ev(() => __chk('carro-noite')); ck('C carro à noite (com Alto): sem sobreposição', good(r), r); await shot('carro-noite', 400);
  // D) helicóptero e barco
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.setHour(13); const h = G.heli; h.place(300, -160, 0); MBD.teleport(296, -160, 0); MBD.sim(3, 1 / 30); G.enterCar(h); MBD.sim(10, 1 / 30); return { in: G.player.vehicle === h }; });
  await sleep(700);
  r = Object.assign(await ev(() => __chk('heli')), r); ck('D helicóptero: controles nas bordas', good(r) && r.in, r); await shot('heli', 400);
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } const b = G.vehicles.find(q => q.spec.boat && !q.driver); MBD.teleport(b.x, b.z, 0); MBD.sim(2, 1 / 30); G.enterCar(b); MBD.sim(10, 1 / 30); return { in: G.player.vehicle === b, name: b.spec.name }; });
  await sleep(700);
  r = Object.assign(await ev(() => __chk('barco')), r); ck('D barco: controles nas bordas', good(r) && r.in, r); await shot('barco', 400);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
