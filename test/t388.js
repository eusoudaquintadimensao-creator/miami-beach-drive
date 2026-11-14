// Teste t388: nada de malha gigante colorida cobrindo a rua/câmera (água da baía com estouro numérico, instâncias esticadas). Uso: node test/t388.js W H q tag
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
  const shot = async (name) => { await sleep(700); await page.screenshot({ path: `${SH}t388-${GAME}-${out}-${name}.png` }); };
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

  await page.addScriptTag({ content: fs.readFileSync(__dirname + '/scanbig.js', 'utf8') });
  const look = async (name, x, z, yaw, T) => {
    await ev((x, z, yaw, T) => { const G = window.__G; MBD.setHour(10.95); window.__onFoot(x, z); G.camYaw = yaw; G.camPitch = 0.06; G.t = T; for (let i = 0; i < 40; i++) MBD.sim(1, 1 / 30); }, x, z, yaw, T);
    await sleep(900); await shot(name);
    return ev(() => { const G = window.__G, R = G.renderer, gl = R.getContext(); R.render(G.scene, G.camera); const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const px = new Uint8Array(W * H * 4); gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sat = 0, n = 0; for (let y = 0; y < H * 0.45; y += 3) for (let x = Math.floor(W * 0.5); x < W; x += 3) { const i = (y * W + x) * 4; const r = px[i], g = px[i + 1], b = px[i + 2]; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); n++; if (mx > 200 && mn < 40 && (mx - mn) > 170) sat++; }
      const ou = G.scene.children.map(o => o.material && o.material.uniforms && o.material.uniforms.uPh ? o.material.uniforms : null).find(Boolean);
      return { satPct: +(sat / n * 100).toFixed(2), big: window.__scanBig(30), uT: ou ? +ou.uT.value.toFixed(1) : null, ph: ou ? ou.uPh.value.toArray().map(v => +v.toFixed(2)) : null }; });
  };
  R.a = await look('baia-curta', -296, 60, Math.PI, 30);
  R.b = await look('baia-2h', -296, 60, Math.PI, 7200.37);
  R.c = await look('baia-30h', -296, 0, Math.PI, 108000.91);
  R.d = await look('orla-30h', 300, -120, Math.PI, 108000.91);
  ck('baía: sem faixas de cores saturadas sobre a rua (sessão curta)', R.a.satPct < 4 && R.a.big.length === 0, R.a);
  ck('baía: sem estouro após 2 h de jogo (fases da água limitadas)', R.b.satPct < 4 && R.b.big.length === 0 && R.b.uT < 600 && R.b.ph.every(v => v >= 0 && v < 6.3), R.b);
  ck('baía: sem estouro após 30 h de jogo', R.c.satPct < 4 && R.c.big.length === 0 && R.c.uT < 600, R.c);
  ck('orla: sem malhas gigantes coloridas', R.d.satPct < 4 && R.d.big.length === 0, R.d);
  console.log('errors:', errs.slice(0, 5));
  if (errs.length) fail.push('console errors ' + errs.length);
  console.log(fail.length ? 'FAIL ' + out + ': ' + fail.join(' | ') : 'PASS ' + out);
  await browser.close(); process.exit(fail.length ? 1 : 0);
})();
