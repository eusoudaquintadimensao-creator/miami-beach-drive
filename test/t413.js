// Teste t413-t417: 👁 tela limpa (salva), extras somem dirigindo, ⏸ ↩ na coluna da borda, Freio no alto com Alto + Ré embaixo, N sempre no carro, cada botão faz sua ação e nenhum cobre outro, nenhum texto sobre o carro/estrada à frente (carro, a pé, barco, heli). Uso: node test/t413.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}botoes413-${GAME}-${out}-${name}.png` }); };
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
  let r;
  const msgs = async (st) => ev((st) => { const G = window.__G; G.ui.toast('🏁 Mensagem de corrida comprida para testar a guarda de textos na tela', 6000); G.ui.toast('🧉 Bah, tchê!', 6000); G.ui.big && G.ui.big('DRIFT!'); G.ui.bubbleText && G.ui.bubbleText('Gaúcho', 'Que carro tri, tchê!'); G.ui.phoneNote && G.ui.phoneNote('@teste', 'Dica de teste'); return st; }, st);
  const guard = () => ev(() => { const G = window.__G; G.msgGuard.tick(); const Z = G.msgGuard.zone(); if (!Z) return { none: true, hits: [] }; const A = Z.all; const hits = [];
    for (const id of G.msgGuard.ids) { const el = document.getElementById(id); if (!el || el.hidden || el.closest('[hidden]')) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue; for (const k of [el, ...el.children]) { const rc = k.getBoundingClientRect(); if (rc.width < 4 || rc.height < 4 || !(k.textContent || '').trim()) continue; if (rc.left < A.x1 && rc.right > A.x0 && rc.top < A.y1 && rc.bottom > A.y0) { hits.push(id + ':' + [rc.left, rc.top, rc.right, rc.bottom].map(Math.round)); break; } } }
    const rs = []; for (const id of G.msgGuard.ids) { const el = document.getElementById(id); if (!el || el.hidden || el.closest('[hidden]')) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05 || !(el.textContent || '').trim()) continue; const q = el.getBoundingClientRect(); if (q.width > 4 && q.height > 4) rs.push([id, q]); }
    const ovl = []; for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 2 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 2) ovl.push(rs[i][0] + '×' + rs[j][0]); }
    return { zone: [A.x0, A.y0, A.x1, A.y1].map(Math.round), hits, ovl }; });
  const ok = (o) => !o.hits.length && !o.mid.length && !o.off.length && !o.bov.length && !o.dup.length;
  // 1) 👁 tela limpa a pé: esconde a fita e extras, volta com um toque, fica salvo
  await ev(() => { localStorage.removeItem('clean-v1'); localStorage.removeItem('topMin-v1'); __onFoot(300, -150); MBD.setHour(13); window.__G.topBar.set(true); window.__G.topBar.clean(false); MBD.sim(10, 1 / 30); });
  await sleep(500);
  r = await ev(() => { const b = document.getElementById('bClean'); const tap = __tap('bClean'); b.click(); const on = document.body.classList.contains('clean'); const barHidden = getComputedStyle(document.getElementById('topBar')).display === 'none'; const saved = localStorage.getItem('clean-v1'); const ess = ['bJump', 'bAct'].filter(id => { const e = document.getElementById(id); return e && !e.hidden && getComputedStyle(e).display !== 'none'; }); const col = getComputedStyle(document.getElementById('edgeCol')).display !== 'none'; return { tap, on, barHidden, saved, ess, col }; });
  ck('1 👁 tela limpa esconde a fita, mantém pular/ação e ⏸ ↩, salva', r.tap && r.on && r.barHidden && r.saved === '1' && r.ess.length === 2 && r.col, r);
  await shot('limpa-pe', 400);
  r = await ev(() => { document.getElementById('bClean').click(); return { on: document.body.classList.contains('clean'), saved: localStorage.getItem('clean-v1') }; });
  ck('1 👁 de novo traz tudo de volta', !r.on && r.saved === '0', r);
  // 2) a pé: botões tocáveis e sem sobreposição; ⏸ abre a pausa; ↩ (com voltar) e 👁 tocáveis
  await sleep(300); r = await ev(() => { const o = __chk('pe'); o.tapP = __tap('bPause'); document.getElementById('bPause').click(); o.pause = !!window.__G.paused; window.__G.closePause(); o.col = !!document.getElementById('bPause').closest('#edgeCol') && !!document.getElementById('bBack').closest('#edgeCol'); return o; });
  ck('2 a pé: sem sobreposição; ⏸ na coluna da borda abre a pausa', ok(r) && r.tapP && r.pause && r.col, r);
  // 3) carro: Freio acima de Alto + Ré, N presente e alterna, Ré alterna, ↩ visível e sai do carro, textos fora do carro/estrada
  await ev(() => { MBD.setHour(22); const v = __car(); v.place(300, -400, 0); MBD.drive && (MBD.drive().cruise = 0); MBD.sim(10, 1 / 30); window.__G.snapCam(); MBD.sim(4, 1 / 30); });
  await sleep(600);
  r = await ev(() => { const o = __chk('carro'); const q = (id) => { const e = document.getElementById(id); if (!e || e.hidden) return null; const k = e.getBoundingClientRect(); return k.width > 2 ? [k.left, k.top, k.right, k.bottom].map(Math.round) : null; };
    o.br = q('drvBrake'); o.rv = q('drvRev'); o.bm = q('drvBeam'); o.n = q('bNeutral'); o.bk = q('bBack'); o.ps = q('bPause'); o.cl = q('bClean');
    o.order = !!(o.br && o.rv && o.bm && o.rv[1] >= o.br[3] - 2 && o.bm[1] >= o.br[3] - 2); o.bottom = !!(o.rv && innerHeight - o.rv[3] >= (window.__G.touch ? 20 : 0));
    o.touch = !!window.__G.touch; o.taps = (o.touch ? ['drvBrake', 'drvRev', 'drvBeam', 'bNeutral', 'bBack', 'bPause', 'bClean', 'bAct'] : ['bNeutral', 'bBack', 'bPause', 'bClean']).filter(id => !__tap(id)); if (!o.touch) { o.order = true; o.bottom = true; } return o; });
  const TOUCH = r.touch; ck('3 carro: Freio no alto, Alto e Ré embaixo (longe da barra de gestos), N ↩ ⏸ 👁 visíveis e tocáveis, sem sobreposição', ok(r) && r.order && r.bottom && r.n && r.bk && r.ps && r.cl && !r.taps.length, r);
  await shot('carro', 300);
  r = await ev(() => { const G = window.__G; const b = document.getElementById('bNeutral'); const n0 = !!MBD.input.neutral; b.click(); const n1 = !!MBD.input.neutral; const on1 = b.classList.contains('on'); b.click(); const n2 = !!MBD.input.neutral; const d = MBD.drive(); const r0 = d.reverse; document.getElementById('drvRev').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); const r1 = d.reverse; document.getElementById('drvRev').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); const bm0 = d.highBeam; document.getElementById('drvBeam').dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); const bm1 = d.highBeam; return { n0, n1, on1, n2, r0, r1, rBack: d.reverse, bm0, bm1 }; });
  ck('3 N alterna ponto morto, Ré alterna, Alto alterna', r.n0 === false && r.n1 === true && r.on1 && r.n2 === false && (!TOUCH || (r.r1 !== r.r0 && r.rBack === r.r0 && r.bm1 !== r.bm0)), r);
  r = await ev(() => { document.getElementById('bClean').click(); MBD.sim(2, 1 / 30); const vis = (id) => { const e = document.getElementById(id); return !!e && !e.hidden && getComputedStyle(e).display !== 'none' && +getComputedStyle(e).opacity > 0.5; }; const o = { n: vis('bNeutral'), brake: vis('drvBrake'), rev: vis('drvRev'), bar: vis('topBar'), back: vis('bBack') }; document.getElementById('bClean').click(); return o; });
  ck('3 tela limpa no carro: N, Freio, Ré e ↩ continuam; fita some', r.n && (!TOUCH || (r.brake && r.rev)) && r.back && !r.bar, r);
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; window.__keep = setInterval(() => { v.vx = Math.sin(v.h) * 15; v.vz = Math.cos(v.h) * 15; }, 50); return null; }); await sleep(3900);
  r = await ev(() => { const o = { fade: document.body.classList.contains('autofade'), nOp: +getComputedStyle(document.getElementById('bNeutral')).opacity, brOp: +getComputedStyle(document.getElementById('drvBrake')).opacity }; window.dispatchEvent(new PointerEvent('pointerdown')); o.back = !document.body.classList.contains('autofade'); clearInterval(window.__keep); const v2 = window.__G.player.vehicle; v2.vx = v2.vz = 0; return o; });
  ck('3 dirigindo sem tocar os extras somem (N e Freio ficam), voltam no toque', r.fade && r.nOp > 0.9 && r.brOp > 0.9 && r.back, r);
  await msgs('carro'); await sleep(500); r = await guard(); ck('3 textos nunca sobre o carro nem a estrada à frente, nem um sobre o outro', !r.hits.length && !r.none && !r.ovl.length, r); await shot('carro-textos', 200);
  r = await ev(() => { document.getElementById('bBack').click(); MBD.sim(3, 1 / 30); return { out: !window.__G.player.vehicle }; });
  ck('3 ↩ no carro sai do veículo', r.out, r);
  // 4) barco e heli: botões sem sobreposição e tocáveis; textos fora do veículo
  r = await ev(() => { const G = window.__G; const b = G.vehicles.find(q => q.spec.boat && !q.driver); MBD.teleport(b.x, b.z, 0); MBD.sim(2, 1 / 30); G.enterCar(b); MBD.sim(10, 1 / 30); G.snapCam(); return { in: G.player.vehicle === b }; });
  await sleep(1000); r = Object.assign(await ev(() => { const o = __chk('barco'); o.taps = ['bBack', 'bPause', 'bClean'].filter(id => !__tap(id)); return o; }), r);
  ck('4 barco: sem sobreposição, ↩ ⏸ 👁 tocáveis', ok(r) && r.in && !r.taps.length, r);
  await msgs('barco'); await sleep(500); r = await guard(); ck('4 barco: textos fora do barco/água à frente', !r.hits.length, r); await shot('barco', 200);
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } const h = G.heli; h.place(300, -160, 0); MBD.teleport(296, -160, 0); MBD.sim(3, 1 / 30); G.enterCar(h); MBD.sim(10, 1 / 30); G.snapCam(); return { in: G.player.vehicle === h }; });
  await sleep(500); r = Object.assign(await ev(() => { const o = __chk('heli'); o.taps = ['bBack', 'bPause', 'bClean'].filter(id => !__tap(id)); return o; }), r);
  ck('4 heli: sem sobreposição, ↩ ⏸ 👁 tocáveis', ok(r) && r.in && !r.taps.length, r);
  await msgs('heli'); await sleep(500); r = await guard(); ck('4 heli: textos fora da aeronave', !r.hits.length, r); await shot('heli', 200);
  // 5) o 👁 salvo volta ligado depois de recarregar
  await ev(() => { localStorage.setItem('clean-v1', '1'); }); await page.reload({ waitUntil: 'load' }); await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  r = await ev(() => ({ on: document.body.classList.contains('clean'), b: !!document.getElementById('bClean') })); ck('5 tela limpa lembrada após recarregar', r.on && r.b, r);
  await ev(() => localStorage.removeItem('clean-v1'));
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
