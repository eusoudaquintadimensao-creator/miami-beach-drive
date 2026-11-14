// Nada bloqueando a linha de corrida: amostra o centro e ±(halfW-1.5) de cada pista contra os colisores do mundo
const puppeteer = require('puppeteer-core');
const PORT = process.argv[2] || 8765;
(async () => {
  const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
  const page = await b.newPage(); await page.setViewport({ width: 800, height: 450 });
  await page.goto('http://localhost:' + PORT + '/?q=low', { waitUntil: 'load' });
  await page.waitForFunction('window.MBD_READY === true', { timeout: 120000 });
  const r = await page.evaluate(async () => {
    const W = await import('/src/world.js');
    const out = {};
    for (const [name, T, hw] of [['autodromo', MBD.track(), 7.5], ['circuito', MBD.serp(), 8.2]]) {
      let hits = [], n = 0;
      for (let s = 0; s < T.L; s += 3) for (const lat of [0, -(hw - 1.5), hw - 1.5]) {
        const p = T.at(s, lat); const pos = { x: p.x, z: p.z }; n++;
        const h = W.collide(pos, 1.0, false, 0.3);
        if (h) hits.push([Math.round(s), lat, Math.round(p.x), Math.round(p.z)]);
      }
      // malhas da arquibancada/estruturas: nada dentro da faixa
      out[name] = { samples: n, hits: hits.length, first: hits.slice(0, 6), L: Math.round(T.L) };
    }
    return out;
  });
  console.log(PORT, JSON.stringify(r));
  await b.close();
})();
