// Teste t439: olhos 2/3 (menus de vidro), desvirar/destravar, paraquedas (direção), mesas/cadeiras que quebram, sol→foto. Uso: node test/t439.js W H q tag
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
  const shot = async (name, ms0 = 600) => { await sleep(ms0); await page.screenshot({ path: `${SH}t439-${GAME}-${out}-${name}.png` }); };
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
  const SH2 = '/workspace/t439/'; fs.mkdirSync(SH2, { recursive: true });
  const shot2 = async (name, ms0 = 500) => { await sleep(ms0); await page.screenshot({ path: `${SH2}${out}-${name}.png` }); };
  // menu aberto: nenhum botão sobre outro, nenhum no meio da tela, todos dentro, rótulos sem duplicar, fita escondida
  const menuChk = async (st) => ev((st) => { const o = __chk(st); const m = document.getElementById('eyeMenu'); const r = m.getBoundingClientRect(); o.menu = [r.left, r.top, r.right, r.bottom].map(Math.round); o.items = m.children.length; o.barHidden = getComputedStyle(document.getElementById('topBar')).display === 'none'; o.taps = [...m.children].map(b => b.id).filter(id => !__tap(id)); o.noteOv = [...document.querySelectorAll('.solNote:not(.out)')].some(e => { const q = e.getBoundingClientRect(); return Math.min(q.right, r.right) - Math.max(q.left, r.left) > 2 && Math.min(q.bottom, r.bottom) - Math.max(q.top, r.top) > 2; }); return o; }, st);
  const okM = (o) => ok(o) && o.items >= 6 && o.barHidden && !o.taps.length && !o.noteOv;
  // 1) a pé: 👁² e 👁³ embaixo do 👁, sem cobrir nada
  await ev(() => { localStorage.removeItem('clean-v1'); __onFoot(300, -150); MBD.setHour(13); window.__G.topBar.clean(false); MBD.sim(10, 1 / 30); }); await sleep(700);
  r = await ev(() => { const q = (id) => { const k = document.getElementById(id).getBoundingClientRect(); return [k.left, k.top, k.right, k.bottom].map(Math.round); }; const o = __chk('pe'); o.e1 = q('bClean'); o.e2 = q('bEye2'); o.e3 = q('bEye3'); o.order = o.e2[1] >= o.e1[3] && o.e3[1] >= o.e2[3] && Math.abs(o.e2[0] - o.e1[0]) < 2; o.t2 = __tap('bEye2'); o.t3 = __tap('bEye3'); return o; });
  ck('1 👁² e 👁³ embaixo do 👁, tocáveis, sem sobreposição', ok(r) && r.order && r.t2 && r.t3, r);
  for (const n of [2, 3]) {
    await ev((n) => document.getElementById('bEye' + n).click(), n); await sleep(400);
    r = await menuChk('menu' + n); ck(`1 a pé: menu do olho ${n} abre sem cobrir nada (${r.items} botões)`, okM(r), r); await shot2(`olho${n}-pe`, 200);
    r = await ev((n) => { document.getElementById('bEye' + n).click(); return { closed: document.getElementById('eyeMenu').hidden, bar: getComputedStyle(document.getElementById('topBar')).display }; }, n);
    ck(`1 olho ${n} de novo fecha e a fita volta`, r.closed && r.bar !== 'none', r);
  }
  // 2) cada botão do menu faz sua ação
  const act = async (n, id, prep) => { await ev((n, prep) => { if (prep) eval(prep); if (document.getElementById('eyeMenu').hidden || window.__G.eyes.open !== n) document.getElementById('bEye' + n).click(); }, n, prep || ''); await sleep(150); return ev((id) => { const b = document.getElementById(id); if (!b) return { missing: id }; b.click(); MBD.sim(40, 1 / 30); return null; }, id); };
  r = await act(2, 'eHeli', '__onFoot(300,-150)'); r = await ev(() => ({ call: !!window.__G.heliCall || Math.hypot(window.__G.heli.x - window.__G.player.x, window.__G.heli.z - window.__G.player.z) < 60 })); ck('2 🚁 chama o helicóptero', r.call, r);
  r = await act(2, 'ePlane', '__onFoot(300,-150)'); for (let i = 0; i < 25; i++) { await sleep(300); r = await ev(() => { MBD.sim(3, 1 / 30); const G = window.__G, A = G.plane; return { d: Math.round(Math.hypot(A.x - G.player.x, A.z - G.player.z)) }; }); if (r.d < 40) break; } ck('2 ✈️ leva ao avião anfíbio', r.d < 40, r);
  r = await act(2, 'eJet', '__onFoot(300,-150)'); r = await ev(() => { const on = !!window.__G.jet.on; if (on) window.__G.jet.set(false, true); return { on }; }); ck('2 🎒 liga a mochila a jato', r.on, r);
  // 3) desvirar: carro capotado fora da rua volta de pé, numa faixa da rua, parado
  await ev(() => { window.__G.eyes.close(); let v = __car(); if (!v) { MBD.sim(150, 1 / 30); v = __car(); } v.place(300, -400, 0); MBD.sim(5, 1 / 30); v.roll = Math.PI * 0.9; v.x += 9; MBD.sim(2, 1 / 30); }); await sleep(300);
  r = await act(2, 'eHorn'); r = await ev(() => ({ horn: true }));
  await ev(() => { if (window.__G.eyes.open !== 2) document.getElementById('bEye2').click(); }); await sleep(200);
  r = await ev(() => { const G = window.__G, v = G.player.vehicle; const x0 = v.x, z0 = v.z; document.getElementById('eFix').click(); return { x0, z0 }; }); await sleep(1500);
  r = Object.assign(r, await ev(() => { const G = window.__G, v = G.player.vehicle; MBD.sim(10, 1 / 30); return { roll: +Math.abs(v.roll).toFixed(2), pitch: +Math.abs(v.pitch || 0).toFixed(2), spd: +v.speed.toFixed(2), x: Math.round(v.x), z: Math.round(v.z), n: G.unstuckN, road: G.lastRespawn && G.lastRespawn.why }; }));
  ck("3 🔄 desvira o carro e volta para a rua", r.roll < 0.2 && r.n >= 1 && r.road === "road", r);
  // racha de rua: volta no último portão
  r = await ev(() => { const G = window.__G; const ok = !!(G.street && G.street.race); return { street: ok }; });
  // 4) paraquedas: joystick para a direita vira para a DIREITA da tela (antes estava invertido)
  r = await ev(() => { const G = window.__G; const v = G.player.vehicle; if (v) { v.vx = v.vz = v.vf = 0; G.leaveCar(true); } MBD.teleport(300, -150, 0); MBD.sim(2, 1 / 30); const p = G.player; p.y = 120; p.h = 0; G.camYaw = 0; G.bail.mode = 'chute'; G.bail.t = 0; G.bail.open = 1; G.bail.vx = 0; G.bail.vz = 6; G.bail.vy = -3;
    const cam = G.camera || window.__cam; MBD.input.stick = [1, 0]; const x0 = p.x, z0 = p.z, h0 = p.h; const rx = -Math.cos(G.camYaw), rz = Math.sin(G.camYaw); MBD.sim(45, 1 / 30); MBD.input.stick = null;
    const dx = p.x - x0, dz = p.z - z0; const side = dx * rx + dz * rz; const o = { side: +side.toFixed(2), dh: +(p.h - h0).toFixed(2), mode: G.bail.mode };
    // e para a esquerda
    const x1 = p.x, z1 = p.z, ry = G.camYaw; const rx2 = -Math.cos(ry), rz2 = Math.sin(ry); const fx = Math.sin(ry), fz = Math.cos(ry); const hL = p.h; MBD.input.stick = [-1, 0]; MBD.sim(45, 1 / 30); MBD.input.stick = null; o.dh2 = +(p.h - hL).toFixed(2); o.side2 = +((p.x - x1) * rx2 + (p.z - z1) * rz2).toFixed(2); G.bail.cancel(); __onFoot(300, -150); return o; });
  ck('4 🪂 paraquedas: direita vai para a direita, esquerda para a esquerda', r.side > 1 && r.dh < -0.5 && r.dh2 > 0.5, r);
  // 5) mesas e cadeiras dos cafés quebram com som quando o carro passa
  r = await ev(() => { const G = window.__G, B = G.breaks; if (!B) return { none: true }; const S = B.cafe || []; if (!S.length) return { n: 0 }; const o = S[0]; let v = __car(); if (!v) { MBD.sim(150, 1 / 30); v = __car(); } if (!v) return { car: null }; const h = 0; v.place(o.x, o.z - 14, h); MBD.sim(2, 1 / 30); let hits = 0; const c0 = (B.count.mesa || 0) + (B.count.cadeira || 0); window.__snd = 0; const a = G.audio; const orig = a.clatter; a.clatter = function (...k) { window.__snd++; return orig && orig.apply(a, k); };
    for (let i = 0; i < 60; i++) { v.vx = 0; v.vz = 14; v.vf = 14; v.h = 0; MBD.sim(1, 1 / 30); } const c1 = (B.count.mesa || 0) + (B.count.cadeira || 0); a.clatter = orig; return { n: S.length, broke: c1 - c0, snd: window.__snd }; });
  ck('5 mesas/cadeiras quebram com som ao passar de carro', r.n > 10 && r.broke >= 1 && r.snd >= 1, r);
  // 6) carro: menus abertos sem cobrir nada (botões do carro na tela)
  await ev(() => { let v = __car(); if (!v) { MBD.sim(150, 1 / 30); v = __car(); } v.place(300, -400, 0); v.roll = v.pitch = 0; MBD.sim(8, 1 / 30); window.__G.snapCam(); }); await sleep(600);
  for (const n of [2, 3]) {
    await ev((n) => { if (window.__G.eyes.open !== n) document.getElementById('bEye' + n).click(); }, n); await sleep(400);
    r = await menuChk('carro-menu' + n); ck(`6 no carro: menu do olho ${n} sem cobrir nada`, okM(r), r); await shot2(`olho${n}-carro`, 200);
  }
  await ev(() => window.__G.eyes.close());
  // 8) t440 volume: toques baixam até zero (🔇 + indicador no alto sem toque), salvo; outro toque volta a 100%
  r = await ev(() => { const G = window.__G; if (G.eyes.open !== 2) document.getElementById('bEye2').click(); const b = () => document.getElementById('eVol'); const seq = []; for (let i = 0; i < 4; i++) { b().click(); seq.push([b().textContent.slice(0, 2), Math.round((G.audio.muted ? 0 : G.audio.vol) * 100)]); if (seq[i][1] === 0) break; }
    const ind = document.getElementById('muteInd'); const vis = !ind.hidden && getComputedStyle(ind).display !== 'none'; const pe = getComputedStyle(ind).pointerEvents; const ir = ind.getBoundingClientRect(); const o = { seq, vis, pe, top: Math.round(ir.top), saved: localStorage.getItem('vol-v1'), icon0: b().textContent.includes('🔇') };
    b().click(); o.back = Math.round(G.audio.vol * 100); o.unmuted = !G.audio.muted; o.indGone = document.getElementById('muteInd').hidden; return o; });
  ck('8 🔊 volume desce até 🔇, mostra indicador no alto (sem toque), salva e volta', r.seq.length >= 2 && r.seq[r.seq.length - 1][1] === 0 && r.icon0 && r.vis && r.pe === 'none' && r.top < 200 && r.saved === '0' && r.back === 100 && r.unmuted && r.indGone, r);
  await ev(() => { const G = window.__G; if (G.eyes.open !== 2) document.getElementById('bEye2').click(); for (let i = 0; i < 3; i++) document.getElementById('eVol').click(); }); await sleep(300); await shot2('mudo', 100);
  r = await ev(() => { const G = window.__G; while (G.audio.muted) document.getElementById('eVol').click(); return { v: G.audio.vol }; });
  // 9) t440 câmera e zoom do mapa (olho 3)
  r = await ev(() => { const G = window.__G; if (G.eyes.open !== 3) document.getElementById('bEye3').click(); const c0 = G.camMode; document.getElementById('eCam').click(); const c1 = G.camMode; const z0 = G.miniZoom || 1; document.getElementById('eZoom').click(); const z1 = G.miniZoom; MBD.sim(3, 1 / 30); const o = { c0, c1, z0, z1, saved: localStorage.getItem('miniZoom-v1') }; document.getElementById('eZoom').click(); document.getElementById('eZoom').click(); while (G.camMode !== c0) document.getElementById('eCam').click(); G.eyes.close(); return o; });
  ck('9 🎥 câmera troca e 🔍 zoom do mapa muda (salvo)', r.c1 !== r.c0 && r.z1 !== r.z0 && r.saved === String(r.z1), r);
  // 10) t440 nitro nível 2: 1º aperto = nitro normal; apertar de novo = 2º estágio, mais forte, chama vermelha maior
  r = await ev(() => { const G = window.__G; const v = __car(); const inp = MBD.input; if (!v) return { car: null }; if (!v.tune) return { tune: false }; const X = 300, Z = -400; v.place(X, Z, 0); MBD.sim(3, 1 / 30); v.nitro = 1; inp.stick = [0, 1];
    const step = (n, nit) => { let top = 0, n2 = false, red = false; for (let i = 0; i < n; i++) { inp.nitro = nit; MBD.sim(1, 1 / 30); v.x = X; v.z = Z; v.nitro = Math.max(v.nitro, 0.6); top = Math.max(top, v.speed); n2 = n2 || !!v.n2; red = red || !!v._redF; } return { top: +top.toFixed(1), n2, red }; };
    step(30, false); const s0 = v.speed; const a = step(30, true); const lbl1 = document.getElementById('nitroL').textContent; step(10, false); v.vx = Math.sin(v.h) * s0; v.vz = Math.cos(v.h) * s0; v.vf = s0; const b = step(30, true); MBD.sim(1, 1 / 30); const lbl2 = document.getElementById('nitroL').textContent;
    const col = v.flames && v.flames[0] && v.flames[0].children[0].material.color.getHexString(); const sc = v.flames && v.flames[0] ? +v.flames[0].scale.z.toFixed(2) : 0; inp.nitro = false; MBD.sim(20, 1 / 30); inp.stick = null; return { tune: true, a, b, lbl1, lbl2, col, sc, after: !!v.n2 }; });
  ck('10 🔥 nitro nível 2: 2º aperto mais forte, chama vermelha, volta ao normal', r.tune && !r.a.n2 && r.b.n2 && r.b.red && r.b.top >= r.a.top && /NITRO 2/.test(r.lbl2) && !r.after, r);
  // 7) Solara: nenhum ☀️ no recado nem na tela de carregar
  await ev(() => window.__G.solaraNote('Teste de recado da Solara')); for (let i = 0; i < 140; i++) { const f = await ev(() => [...document.querySelectorAll('.solNote')].some(e => e.textContent.includes('Teste de recado'))); if (f) break; await sleep(250); } await sleep(400);
  r = await ev(() => { const G = window.__G; const el = [...document.querySelectorAll('.solNote')].find(e => e.textContent.includes('Teste de recado')); const ld = document.getElementById('ldSol'); const img = el && el.querySelector('.shAv img'); return { log: (G.solLog || []).slice(-6).map(l => [l.t.slice(0, 18), Math.round(l.on), Math.round(l.off), l.vis]), now: Math.round(performance.now()), sunNote: el ? el.textContent.includes('☀') : null, sunLoad: ld ? ld.querySelector('.lsAv').textContent.includes('☀') : null, img: !!img && img.complete && img.naturalWidth > 0 }; });
  ck('7 recado e carregamento com a foto da Solara, sem ☀️', r.sunNote === false && r.sunLoad === false && r.img, r);
  ck('sem erros no console', errs.length === 0, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.join(' | ') : 'PASS ' + out); await browser.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
