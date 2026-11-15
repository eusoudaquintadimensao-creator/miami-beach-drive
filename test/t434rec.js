// t434: gravação de até 10 min (720p, pedaços em disco), Salvar vídeo (galeria pelo menu do sistema no celular / download) e Compartilhar.
const puppeteer = require('puppeteer-core');
const [,, W = 1280, H = 720, q = 'low', out = 'd'] = process.argv; const mobile = Math.min(+W, +H) < 600;
const PORT = process.env.PORT || 8765, GAME = process.env.GAME || 'solara';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader', '--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage(); await p.setViewport({ width: +W, height: +H, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1 });
  if (mobile) await p.setUserAgent('Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36');
  // simula o menu de compartilhar do sistema (headless não tem) e registra downloads
  await p.evaluateOnNewDocument(() => { window.__sh = []; window.__dl = [];
    navigator.canShare = (d) => !!d; navigator.share = async (d) => { window.__sh.push({ files: (d.files || []).map(f => ({ name: f.name, type: f.type, size: f.size })), text: d.text || '', url: d.url || '' }); };
    const ac = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = function () { if (this.download) { window.__dl.push(this.download); return; } return ac.call(this); }; });
  const errs = []; p.on('pageerror', e => errs.push('PAGE: ' + e.message)); p.on('console', m => { if (m.type() === 'error' && !/favicon|Failed to load resource/.test(m.text())) errs.push(m.text()); });
  const fail = []; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info) : '')); if (!ok) fail.push(n); };
  const tapId = (id) => p.evaluate((id) => document.getElementById(id).click(), id);
  const until = async (fn, ms = 60000) => { try { await p.waitForFunction(fn, { timeout: ms, polling: 250 }); return true; } catch (e) { return false; } };
  await p.goto(`http://localhost:${PORT}/?q=${q}`, { waitUntil: 'load' }); await until('window.MBD_READY === true', 180000);
  await (mobile ? p.tap('#play') : p.click('#play')); await until('MBD.flags.started === true');
  await p.evaluate(() => { const h = document.getElementById('solaraHi') || document.querySelector('.solaraHi'); if (h) h.remove(); });
  ck('limite de 10 minutos', await p.evaluate(() => MBD.rec().maxSec === 600));
  await tapId('bRec'); await until('MBD.rec().recording', 10000); await sleep(4500);
  const tm = await p.evaluate(() => document.getElementById('recTime').textContent);
  ck('cronômetro da gravação mostra o total 10:00', /10:00/.test(tm), tm);
  ck('gravação em andamento com arquivo em disco (OPFS) ou memória', await p.evaluate(() => !!MBD.rec().disk || MBD.rec().bytes > 0), await p.evaluate(() => ({ bytes: MBD.rec().bytes, disk: !!MBD.rec().disk })));
  await p.screenshot({ path: `/workspace/t361-prints/t434-${GAME}-${out}-gravando.png` });
  await tapId('recStop'); ck('para e abre o painel com o vídeo (pedaços contados)', await until('!document.getElementById("recPanel").hidden && MBD.rec().blob && MBD.rec().blob.size > 1000 && MBD.rec().bytes > 1000', 30000), await p.evaluate(() => ({ size: MBD.rec().blob && MBD.rec().blob.size, type: MBD.rec().type, onDisk: MBD.rec().onDisk })));
  await p.screenshot({ path: `/workspace/t361-prints/t434-${GAME}-${out}-painel.png` });
  await tapId('rpSave'); await sleep(800);
  const s1 = await p.evaluate(() => ({ sh: window.__sh.slice(), dl: window.__dl.slice(), msg: document.getElementById('rpMsg').textContent }));
  if (mobile) ck('Salvar vídeo no celular abre o menu do sistema só com o arquivo (Salvar vídeo/Galeria)', s1.sh.length === 1 && s1.sh[0].files.length === 1 && s1.sh[0].files[0].size > 1000 && !s1.sh[0].text && /\.(mp4|webm)$/.test(s1.sh[0].files[0].name), s1);
  else ck('Salvar vídeo no computador baixa o arquivo', s1.dl.length === 1 && /\.(mp4|webm)$/.test(s1.dl[0]), s1);
  await tapId('rpShare'); await sleep(800);
  const s2 = await p.evaluate(() => window.__sh.slice(-1)[0]);
  ck('Compartilhar envia o vídeo com texto e link do jogo', s2 && s2.files.length === 1 && /http/.test(s2.text), s2);
  // sem suporte a arquivos: Compartilhar manda o link e baixa o vídeo
  await p.evaluate(() => { navigator.canShare = () => false; window.__dl = []; }); await tapId('rpShare'); await sleep(800);
  ck('sem compartilhar arquivos: baixa o vídeo + link', await p.evaluate(() => window.__dl.length === 1));
  await tapId('rpDiscard'); await sleep(500);
  // para sozinho no limite
  await p.evaluate(() => { MBD.rec().maxSec = 3; }); await tapId('bRec'); await until('MBD.rec().recording', 10000);
  ck('para sozinho no tempo máximo', await until('!document.getElementById("recPanel").hidden', 20000));
  await tapId('rpDiscard').catch(() => { });
  ck('sem erros', !errs.length, errs.slice(0, 5));
  console.log(fail.length ? 'FAIL ' + fail.length + ' ' + fail.join(' | ') : 'PASS t434rec ' + out); await b.close(); process.exit(fail.length ? 1 : 0);
})().catch(e => { console.log('FATAL', e); process.exit(2); });
