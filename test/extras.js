// Teste: atalhos (corrida, mochila a jato, helicóptero, casa), casa com apresentação/garagem/painel, vozes dos moradores, layout
const puppeteer = require('puppeteer-core'); const fs = require('fs');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv;
const mobile = Math.min(+W, +H) < 600; const SH = '/workspace/miami-mundo-aberto/screenshots/'; const R = {};
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const page = await browser.newPage(); await page.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await page.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36');
  const errs = []; page.on('console', m => { if (m.type() === 'error') errs.push(m.text()); }); page.on('pageerror', e => errs.push('PAGE: ' + e.message));
  const reqs = []; page.on('requestfinished', r => { if (r.url().includes('/assets/voz/')) reqs.push(r.url().split('/assets/voz/')[1]); });
  await page.goto('http://localhost:8765/?q=' + q, { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  await page.evaluate(() => localStorage.removeItem('mbd-casa-v1'));
  await page.click('#play'); await sleep(1500);
  const layout = async (tag) => page.evaluate((tag) => { const sel = ['#quick button', '#icons button', '#btns button', '#mapw', '#topR', '#nitroW', '#raceHud', '#mis', '#prompt'];
    const els = sel.flatMap(s => [...document.querySelectorAll(s)]).filter(e => e.offsetWidth > 0 && !e.closest('[hidden]') && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden');
    const rs = els.map(e => [e.id || e.tagName, e.getBoundingClientRect()]); const o = [];
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i][1], b = rs[j][1]; const ix = Math.min(a.right, b.right) - Math.max(a.left, b.left), iy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top); if (ix > 1 && iy > 1) o.push(rs[i][0] + '×' + rs[j][0]); }
    const off = rs.filter(([, r]) => r.left < 0 || r.top < 0 || r.right > innerWidth + 1 || r.bottom > innerHeight + 1).map(([id]) => id);
    return { tag, n: rs.length, overlap: o, offscreen: off, quick: [...document.querySelectorAll('#quick button')].map(b => { const r = b.getBoundingClientRect(); return [b.id, Math.round(r.left), Math.round(r.top)]; }) }; }, tag);
  R.layoutFoot = await layout('a pé');
  await page.screenshot({ path: SH + `extra-${out}-atalhos.png` });
  // ---- mochila a jato
  await page.click('#qJet'); await sleep(300);
  R.jet = await page.evaluate(() => { const p = __G.player; MBD.input.hb = true; MBD.input.stick = [0, 0.8]; MBD.sim(75, 1 / 30); const r = { on: MBD.jet().on, alt: +(p.y).toFixed(1), air: !p.grounded, flames: MBD.jet().flames[0].visible, smoke: MBD.fx().emitted || 0, down: !document.getElementById('bDown').hidden }; return r; });
  await sleep(600); await page.screenshot({ path: SH + `extra-${out}-mochila-jato.png` });
  R.layoutJet = await layout('mochila');
  R.jetLand = await page.evaluate(() => { MBD.input.hb = false; MBD.input.stick = null; MBD.input.down = true; MBD.sim(150, 1 / 30); MBD.input.down = false; MBD.sim(5, 1 / 30); const p = __G.player; const r = { grounded: p.grounded, y: +p.y.toFixed(2) }; MBD.jet().set(false, true); return r; });
  // ---- helicóptero chamado (à noite, com luzes)
  await page.evaluate(() => { MBD.setHour(21); MBD.teleport(372, -120, Math.PI); }); await sleep(400);
  R.heliCall = await page.evaluate(() => MBD.callHeli());
  await page.evaluate(() => MBD.sim(95, 1 / 30)); await sleep(500);
  await page.screenshot({ path: SH + `extra-${out}-heli-chegando.png` });
  R.heli = await page.evaluate(() => { MBD.sim(120, 1 / 30); const H = MBD.heli(), p = __G.player; return { d: +Math.hypot(H.x - p.x, H.z - p.z).toFixed(1), air: H.air, call: !!__G.heliCall }; });
  R.heliDbg = await page.evaluate(() => { const H = MBD.heli(); MBD.teleport(H.x + Math.cos(H.h) * 3.5, H.z - Math.sin(H.h) * 3.5, H.h); const p = __G.player; const r = { d: +Math.hypot(H.x - p.x, H.z - p.z).toFixed(1), near: MBD.nearestVehicle(), drv: !!H.driver, inV: __G.vehicles.includes(H), talk: !!__G.talk.cur, home: MBD.home().near() }; MBD.action(); return r; }); await sleep(300);
  R.heliIn = await page.evaluate(() => MBD.state.vehicle);
  await page.evaluate(() => { MBD.input.hb = true; MBD.sim(140, 1 / 30); MBD.input.hb = false; }); await sleep(800);
  R.heliAlt = await page.evaluate(() => +MBD.state.heliAlt.toFixed(1));
  await page.screenshot({ path: SH + `extra-${out}-heli-voando-noite.png` });
  // ---- casa: viagem rápida + apresentação
  await page.evaluate(() => { MBD.setHour(17.6); }); await page.click('#qHome'); await sleep(2600);
  R.intro = await page.evaluate(() => [MBD.home().state, !document.getElementById('homeIntro').hidden, document.getElementById('hiTxt').textContent.slice(0, 40)]);
  await page.screenshot({ path: SH + `extra-${out}-casa-apresentacao.png` });
  await sleep(3600); await page.screenshot({ path: SH + `extra-${out}-casa-garagem.png` });
  await page.click('#hiSkip'); await sleep(500);
  R.afterIntro = await page.evaluate(() => [MBD.home().state, __G.paused, MBD.home().cars.filter(c => c && c.v).map(c => c.type), JSON.parse(localStorage.getItem('mbd-casa-v1'))]);
  R.layoutHome = await layout('casa');
  await page.screenshot({ path: SH + `extra-${out}-casa-porta.png` });
  R.prompt = await page.evaluate(() => document.getElementById('prompt').innerText);
  await page.evaluate(() => MBD.action()); await sleep(600);
  R.panel = await page.evaluate(() => [!document.getElementById('homeSel').hidden, document.querySelectorAll('#hsBody .avCard').length]);
  await page.screenshot({ path: SH + `extra-${out}-casa-painel.png` });
  await page.click('#hsSave'); await sleep(300); R.saved = await page.evaluate(() => document.getElementById('hsMsg').textContent);
  await page.click('#hsX'); await sleep(300);
  // dirigir o carro da garagem
  R.garageCar = await page.evaluate(() => { const c = MBD.home().cars[1].v; MBD.teleport(c.x + 3, c.z, 0); MBD.action(); return MBD.state.vehicle; });
  await page.evaluate(() => { const v = __G.player.vehicle; if (v) { __G.leaveCar(true); } });
  // ---- vozes: conversa com a Tia Rosa (personagem fixo) + pedestre
  await page.waitForFunction('__G.castReady > 0 || __G.talk.talkers.length > 0', { timeout: 30000 }).catch(() => {});
  R.talk = await page.evaluate(async () => { const T = __G.talk.talkers.find(t => t.per === 'acai') || __G.talk.talkers[0]; if (!T) return 'sem personagens'; MBD.teleport(T.x + 1.5, T.z, 0); MBD.sim(2, 1 / 30); window.__log = []; const oc = __G.talk.close.bind(__G.talk); __G.talk.close = (...a) => { __log.push('close ' + JSON.stringify(a) + ' ' + new Error().stack.split('\n').slice(2, 4).join('|')); return oc(...a); }; MBD.action();
    await new Promise(r => setTimeout(r, 2500)); const V = MBD.voice(); return { open: !!__G.talk.cur, name: T.name, played: V.played, last: V.lastText, voice: V.lastVoice, speaking: V.speaking, log: window.__log, st: MBD.state.vehicle, idx: V.idx ? Object.keys(V.idx).map(k => k + ':' + Object.keys(V.idx[k]).length) : null }; });
  await sleep(400); await page.screenshot({ path: SH + `extra-${out}-conversa-voz.png` });
  R.talk2 = await page.evaluate(async () => { const V = MBD.voice(); const n0 = V.played; for (let i = 0; i < 3; i++) { __G.talk.next(); await new Promise(r => setTimeout(r, 1500)); } return { more: V.played - n0, last: V.lastText }; });
  R.voiceReqs = reqs.length; R.voiceSample = reqs.slice(0, 4);
  R.fps = await page.evaluate(() => [Math.round(MBD.state.fps), MBD.state.draws, MBD.state.quality, MBD.state.device]);
  R.errs = errs;
  console.log(JSON.stringify(R, null, 1)); await browser.close();
})().catch(e => { console.log('FAIL', e.message, JSON.stringify(R)); process.exit(1); });
