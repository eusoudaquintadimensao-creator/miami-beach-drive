// Teste dos heróis originais: seletor, cada poder (não violento), herói dirigindo, capturas de tela
const puppeteer = require('puppeteer-core');
const [,, W = 1440, H = 900, q = 'low', out = 'd'] = process.argv; const mobile = +W < 600;
const SH = '/workspace/miami-mundo-aberto/screenshots/';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const R = {};
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  if (mobile) await p.setUserAgent(process.env.IOS ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' : 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Mobile Safari/537.36');
  const errs = []; p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ': ' + m.text()); }); p.on('pageerror', e => errs.push('PAGE: ' + e.message));
  await p.goto('http://localhost:8765/' + (q ? '?q=' + q : ''), { waitUntil: 'load' });
  await p.waitForFunction('window.MBD_READY === true', { timeout: 150000 });
  const st = () => p.evaluate(() => MBD.state);
  const until = async (fn, ms = 30000) => { try { await p.waitForFunction(fn, { timeout: ms, polling: 200 }); return true; } catch (e) { return false; } };
  R.cards = await p.evaluate(() => [...document.querySelectorAll('#avPick .avCard')].map(c => c.dataset.av));
  await p.evaluate(() => document.querySelector('#avPick .avCard[data-av="solar"]').scrollIntoView({ inline: 'center', block: 'nearest' }));
  await p.click('#avPick .avCard[data-av="solar"]'); await sleep(300);
  R.pickSaved = await p.evaluate(() => JSON.parse(localStorage.getItem('mbd-solara-v1')).avatar);
  await p.screenshot({ path: SH + `hero-${out}-seletor.png` });
  await p.click('#play'); await sleep(1500); await until('MBD.state.avatar3d === true && MBD.state.fps > 0', 40000);
  const use = async (id) => { await p.evaluate((id) => MBD.avatar(id), id); return until(`MBD.state.avatar === "${id}" && MBD.state.avatar3d`, 20000); };
  const pow = () => mobile ? p.tap('#bPow') : p.keyboard.press('KeyX');
  const shot = (n) => p.screenshot({ path: SH + `hero-${out}-${n}.png` });
  const stick = (v) => p.evaluate((v) => { MBD.input.stick = v; }, v);
  const gyOf = () => p.evaluate(() => { const pl = __G.player; return pl.y; });
  await p.evaluate(() => MBD.setHour(10.5));
  // ☀️ Armadura Solar: voa
  R.powBtn = await p.evaluate(() => !document.getElementById('bPow').hidden);
  await p.evaluate(() => MBD.teleport(312, -120, Math.PI)); await sleep(500);
  await pow(); await sleep(300); R.solarFly = await p.evaluate(() => MBD.powers().fly);
  await p.evaluate(() => { MBD.input.jump = false; }); if (mobile) await p.evaluate(() => { __G.keysHack = 1; });
  await p.keyboard.down('Space'); const up = await until('MBD.state.y > 8', 40000); await p.keyboard.up('Space'); R.solarUp = up;
  await stick([0, 1]); await sleep(2500); R.solarSpeed = +(await st()).speed.toFixed(1); await stick(null);
  R.jets = await p.evaluate(() => (__G.hero.rig.model.userData.jets || []).some(j => j.visible));
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.6; __G.camPitch = 0.05; }); await sleep(900); await shot('solar-voando');
  await pow(); R.solarLanded = await until('MBD.state.grounded === true', 40000);
  // 🕸️ Teia Neon: escala a parede e lança fio
  await use('teia');
  R.wallAt = await p.evaluate(async () => { const m = await import('/src/world.js'); let best = null, bd = 1e9;
    for (const b of m.BOXES) { if (b.boatOnly || b.h < 10 || b.h > 60) continue; const z = (b.z0 + b.z1) / 2, x = b.x1 + 1.2; if (b.z1 - b.z0 < 8 || !m.walkable(x, z)) continue; const d = Math.hypot(x - 290, z + 150); if (d < bd) { bd = d; best = [x, z, b.h]; } }
    MBD.teleport(best[0], best[1], -Math.PI / 2); __G.camYaw = -Math.PI / 2; return best; }); await sleep(400);
  await stick([0, 1]); R.teiaClimb = await until('MBD.state.y > 4', 40000); await sleep(1500); R.teiaY = +(await st()).y.toFixed(1);
  await p.evaluate(() => { __G.camYaw = -Math.PI / 2 + 0.5; __G.camPitch = 0.45; }); await sleep(600); await shot('teia-escalando');
  R.teiaRoof = await until('MBD.state.y > 20 && MBD.state.grounded', 60000); R.teiaRoofY = +(await st()).y.toFixed(1); await stick(null);
  await sleep(1500); await p.evaluate(() => { MBD.teleport(300, -120, Math.PI); __G.camYaw = Math.PI; }); await sleep(600);
  await pow(); await sleep(400); const sw = await p.evaluate(() => ({ web: MBD.powers().web.visible, sp: Math.hypot(__G.player.vx, __G.player.vz) })); R.teiaWeb = sw.web; R.teiaSwingSpeed = +sw.sp.toFixed(1);
  await p.evaluate(() => { __G.camYaw = Math.PI + 0.7; __G.camPitch = 0.05; __G.camMode = 1; }); await sleep(250); await shot('teia-fio'); await p.evaluate(() => { __G.camMode = 0; });
  await until('MBD.state.grounded === true', 30000);
  // 💪 Colosso Verde: levanta e solta carro com cuidado + super pulo
  await use('colosso');
  const car = await p.evaluate(() => { const v = __G.vehicles.filter(v => !v.driver && v.type !== 'heli' && !v.spec.boat).sort((a, b) => Math.hypot(a.x - 296, a.z + 172) - Math.hypot(b.x - 296, b.z + 172))[0]; const [fx, fz] = v.fwd(); MBD.teleport(v.x + fz * 2.4, v.z - fx * 2.4, v.h); return __G.vehicles.indexOf(v); });
  await sleep(400); await pow(); if (!(await until(`!!__G.vehicles[${car}].lifted`, 4000))) { R.liftRetry = await p.evaluate((i) => { const v = __G.vehicles[i], pl = __G.player, P = MBD.powers(); const r = document.getElementById('bPow').getBoundingClientRect(); return JSON.stringify({ d: Math.hypot(v.x - pl.x, v.z - pl.z).toFixed(2), cool: P.cool, talk: !!__G.talk.cur, veh: !!pl.vehicle, kind: P.kind, at: document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2).id, toast: (document.getElementById('toast') || {}).textContent, paused: __G.paused }); }, car); await pow(); } await sleep(600); R.carLifted = await p.evaluate((i) => !!__G.vehicles[i].lifted && __G.vehicles[i].y > 2, car);
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.5; __G.camPitch = 0.2; }); await sleep(700); await shot('colosso-carro');
  await pow(); R.carLanded = await until(`!__G.vehicles[${car}].lifted`, 30000); R.carY = +(await p.evaluate((i) => __G.vehicles[i].y, car)).toFixed(2);
  await p.evaluate(() => MBD.teleport(312, -120, Math.PI)); await sleep(400);
  await p.evaluate(() => { MBD.input.jump = true; }); let my = 0; for (let i = 0; i < 20; i++) { await sleep(150); my = Math.max(my, (await st()).y); } R.superJumpY = +my.toFixed(1);
  await until('MBD.state.grounded === true', 20000);
  // 🛡️ Sentinela: arrancada com escudo
  await use('sentinela'); await p.evaluate(() => MBD.teleport(312, -120, Math.PI)); await sleep(400);
  await pow(); await sleep(150); R.dashSpeed = +(await st()).speed.toFixed(1);
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.3; __G.camPitch = 0.15; }); await shot('sentinela-arrancada'); await sleep(1500);
  // 🧙 Lorde Férreo: levita
  await use('ferreo'); await p.evaluate(() => MBD.teleport(312, -120, Math.PI)); await sleep(400);
  await pow(); R.ferreoLev = await until('MBD.state.y > 1.6', 30000);
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.6; __G.camPitch = 0.1; }); await sleep(600); await shot('ferreo-levitando');
  await pow(); await until('MBD.state.grounded === true', 20000);
  // 🟣 Titã Violeta: pisão de onda (só visual)
  await use('tita'); await p.evaluate(() => { MBD.teleport(312, -120, Math.PI); MBD.setHour(20.5); }); await sleep(500);
  await pow(); R.titaRing = await until('MBD.powers().rings.length > 0', 30000);
  await p.evaluate(() => { __G.camYaw = __G.player.h + 2.5; __G.camPitch = 0.35; __G.camMode = 1; }); await sleep(300); await shot('tita-pisao'); await p.evaluate(() => { __G.camMode = 0; MBD.setHour(10.5); });
  await sleep(1500);
  // herói dirigindo (escala ajustada ao banco)
  await p.evaluate((i) => { const v = __G.vehicles[i]; v.place(300, -140, Math.PI); v.sync(0); const [fx, fz] = v.fwd(); MBD.teleport(v.x + fz * 1.6, v.z - fx * 1.6, v.h); }, car); await sleep(400);
  await p.evaluate(() => MBD.action()); await sleep(600); R.titaDriving = (await st()).vehicle; R.titaSeat = await p.evaluate(() => [__G.hero.g.scale.x.toFixed(2), __G.hero.cur && __G.hero.cur.getClip().name]);
  await p.evaluate(() => { __G.camYaw = __G.player.vehicle.h + 1.9; __G.camPitch = 0.35; __G.camMode = 0; }); await sleep(900); await shot('tita-dirigindo');
  await p.evaluate(() => { __G.camMode = 0; MBD.action(); }); await sleep(300);
  // conversa reage ao herói
  await p.evaluate(() => { const T = MBD.talk().talkers[0]; if (T) MBD.teleport(T.x - 1.8, T.z + 0.4, Math.PI / 2); }); await sleep(600);
  await p.evaluate(() => { const t = MBD.talk(); t.cool = 0; const n = t.nearest(4); if (n) t.open(n); }); await sleep(300);
  R.heroTalk = await p.evaluate(() => MBD.talk().cur && MBD.talk().cur.lines.join(' | ')); await p.evaluate(() => MBD.talk().close && MBD.talk().close(true));
  // celular: app de avatar com todos
  await p.evaluate(() => { __G.ui.openPhone(); }); await sleep(300);
  R.phoneAvatars = await p.evaluate(() => { const b = [...document.querySelectorAll('#phBody button')].find(x => /avatar/i.test(x.textContent)); if (b) b.click(); return document.querySelectorAll('#phBody .avCard').length; });
  await sleep(300); await shot('celular-avatares'); await p.evaluate(() => __G.ui.closePhone());
  const fin = await st(); R.fps = +fin.fps.toFixed(1); R.errors = errs;
  console.log(JSON.stringify(R, null, 1)); await b.close();
})().catch(e => { console.log('FALHOU', e.message, JSON.stringify(R)); process.exit(1); });
