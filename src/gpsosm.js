// App GPS do celular: mapa real de Miami a partir de dados do OpenStreetMap (© colaboradores do OpenStreetMap, ODbL).
// Arquivo compacto em assets/osm/miami.json (gerado offline a partir do extrato Geofabrik), guardado pelo service worker: funciona sem internet.
import { districtName } from './world.js';
const KIND = { city: 'Cidade', town: 'Cidade', village: 'Vila', neighbourhood: 'Bairro', suburb: 'Bairro', quarter: 'Bairro', island: 'Ilha' };
const SKIP = /Trailer|Mobile Home|Pioneer Village|Italian Village|Sister Banks|Bird Key/;
// descrições curtas escritas para o jogo
const DESC = {
  'Miami': 'Principal cidade do condado de Miami-Dade: centro financeiro, porto de cruzeiros e porta de entrada da América Latina, com forte mistura de culturas.',
  'Miami Beach': 'Cidade numa ilha-barreira entre a Baía de Biscayne e o Atlântico, conhecida pelas praias largas, salva-vidas coloridos e prédios art déco.',
  'South Beach': 'Ponta sul de Miami Beach: calçadão à beira-mar, Ocean Drive com fachadas art déco em tons pastel, cafés e vida noturna.',
  'Española Way': 'Rua curta de pedestres em estilo mediterrâneo no meio de South Beach, com restaurantes ao ar livre.',
  'Downtown Miami': 'Centro da cidade: arranha-céus, parque à beira da baía, arena, museus e o porto logo ao lado.',
  'Brickell': 'Distrito financeiro com torres de vidro, bancos e apartamentos, ao sul do rio Miami. Muito movimentado à noite.',
  'Brickell Key': 'Pequena ilha de prédios residenciais e hotéis, ligada a Brickell por uma ponte curta, com caminho de corrida em volta.',
  'Burlingame Island': 'Ilhota ao lado de Brickell Key, na foz do rio Miami.',
  'Little Havana': 'Bairro da comunidade cubana: a Calle Ocho, partidas de dominó no parque, cafezinho forte, charutos e música ao vivo.',
  'Little Haiti': 'Coração da cultura haitiana em Miami, com mercado caribenho, murais, galerias e música.',
  'Design District': 'Bairro de lojas de design, arquitetura ousada e arte pública espalhada pelas calçadas.',
  'Midtown': 'Área de apartamentos novos, comércio e restaurantes entre Wynwood e o Design District.',
  'Edgewater': 'Faixa de torres residenciais à beira da baía, logo ao norte do centro, com vista para as ilhas.',
  'Buena Vista': 'Bairro residencial histórico de casas baixas, vizinho ao Design District.',
  'Liberty City': 'Bairro histórico da comunidade afro-americana, berço de artistas, músicos e atletas.',
  'Coconut Grove': 'Um dos bairros mais antigos da cidade: ruas arborizadas, marinas, veleiros e cafés de frente para a baía.',
  'Dinner Key': 'Marina em Coconut Grove onde fica a prefeitura de Miami; já foi terminal de hidroaviões.',
  'Coral Gables': 'Cidade planejada nos anos 1920, com ruas arborizadas, arquitetura mediterrânea, uma piscina pública numa antiga pedreira e uma universidade.',
  'Hialeah': 'Segunda maior cidade do condado, com grande comunidade cubana, comércio, fábricas e um antigo hipódromo.',
  'Miami Springs': 'Cidade residencial tranquila ao lado do aeroporto internacional, com campo de golfe.',
  'Virginia Gardens': 'Vila pequena colada ao aeroporto internacional.',
  'West Miami': 'Pequena cidade residencial entre Miami e Coral Gables.',
  'South Miami': 'Cidade residencial com centrinho comercial e estação de metrô elevado.',
  'Surfside': 'Cidadezinha à beira-mar ao norte de Miami Beach, de prédios baixos e praia calma.',
  'North Bay Village': 'Três ilhas no meio da Baía de Biscayne cortadas por uma ponte-avenida (causeway) entre Miami e Miami Beach.',
  'Miami Shores': 'Vila residencial arborizada ao norte da cidade, com casas antigas e ruas largas.',
  'El Portal': 'Vila pequena e verde ao norte, às margens de um canal.',
  'Biscayne Park': 'Vila residencial pequena, com muitas árvores e ruas tranquilas.',
  'Venetian Islands': 'Corrente de ilhas artificiais ligadas pela Venetian Causeway, uma ponte baixa entre o centro de Miami e Miami Beach.',
  'Fisher Island': 'Ilha residencial ao sul de Miami Beach, acessível apenas por barco ou balsa.',
  'Virginia Key': 'Ilha com praias, trilhas, parque, estádio de remo e centros de pesquisa do mar.',
  'Normandy Isle': 'Ilha residencial em North Beach, com praça e comércio de bairro.',
  'Belle Meade Island': 'Ilhota residencial na baía, junto ao bairro de Belle Meade.',
  'Harbor Island': 'Ilha de North Bay Village, com prédios residenciais à beira da água.',
  'Treasure Island': 'Ilha de North Bay Village, com marina e casas à beira da baía.',
  'North Bay Island': 'Ilha de North Bay Village, com casas de frente para a água.',
  'Park View Island': 'Ilha residencial em North Beach, junto a um parque à beira do canal.'
};
export class OsmGps {
  constructor(G, opt = {}) {
    this.G = G; this.url = opt.url || 'assets/osm/miami.json'; this.insp = opt.inspired || {}; this.theme = opt.theme || 'day';
    this.data = null; this.loading = null; this.view = null; this.sel = null; this.cv = null;
  }
  load() {
    if (this.data) return Promise.resolve(this.data);
    if (!this.loading) this.loading = fetch(this.url).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); }).then(j => (this.data = this.decode(j))).catch(e => { this.loading = null; throw e; });
    return this.loading;
  }
  decode(j) {
    const Q = j.q || 1;
    const line = (a, from) => { const n = (a.length - from) >> 1; const f = new Float32Array(n * 2); let x = 0, y = 0, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < n; i++) { x += a[from + 2 * i]; y += a[from + 2 * i + 1]; const X = x * Q, Y = y * Q; f[2 * i] = X; f[2 * i + 1] = Y; if (X < x0) x0 = X; if (X > x1) x1 = X; if (Y < y0) y0 = Y; if (Y > y1) y1 = Y; } return { p: f, b: [x0, y0, x1, y1] }; };
    const polys = arr => arr.map(p => p.map(r => line(r, 0)));
    const roads = j.roads.map((cls, c) => cls.map(r => { const l = line(r, 1); l.c = c; l.n = j.names[r[0]] || ''; return l; }));
    const places = j.places.filter(p => !SKIP.test(p.n)).map(p => ({ ...p, desc: DESC[p.n] || '' }));
    return { attr: j.attr, src: j.src, size: j.size, min: j.min, water: polys(j.water), green: polys(j.green), sand: polys(j.sand), roads, places, names: j.names };
  }
  // onde o jogador está no jogo e em que bairro real a área foi inspirada
  here() { const G = this.G, pl = G.player; const dn = districtName(pl.x, pl.z); const real = this.insp[dn] || 'Downtown Miami'; return { dn, real }; }
  phoneHtml() {
    const h = this.here();
    return `<h3>🧭 GPS Miami <small class="gpsSub">mapa real · offline</small></h3>
      <div class="gpsWrap" id="gpsWrap"><canvas id="gpsCv"></canvas><div class="gpsBtns"><button data-z="1" aria-label="Aproximar">＋</button><button data-z="-1" aria-label="Afastar">－</button><button data-z="0" aria-label="Centralizar" class="gpsMe">📍</button></div><div class="gpsLoad" id="gpsLoad">Carregando mapa…</div><div class="gpsAttr" id="gpsAttr">© colaboradores do <b>OpenStreetMap</b> · ODbL</div></div>
      <div class="gpsInfo" id="gpsInfo"></div>
      <div class="gpsHere">📍 No jogo você está em <b>${h.dn || 'Solara'}</b> — área inspirada em <b>${h.real}</b>.</div>
      <div class="list gpsTabs"><button data-a="gpsmap">🗺️ Abrir o mapa completo da cidade do jogo<span>›</span></button></div>
      <h4 class="gpsH4">Bairros e ilhas</h4><div class="list" id="gpsList"></div>
      <p class="small">Mapa desenhado a partir de dados do OpenStreetMap (© colaboradores do OpenStreetMap, licença ODbL — openstreetmap.org/copyright). As descrições são do jogo. A cidade do jogo é fictícia e só se inspira nesses lugares.</p>`;
  }
  mount(B) {
    const cv = B.querySelector('#gpsCv'); if (!cv) return; this.cv = cv; this.B = B;
    const fit = () => { const r = cv.getBoundingClientRect(); const d = Math.min(2, window.devicePixelRatio || 1); cv.width = Math.max(50, Math.round(r.width * d)); cv.height = Math.max(50, Math.round(r.height * d)); this.dpr = d; };
    // altura do mapa: cabe na parte visível do celular (paisagem tem pouca altura)
    const wrap = B.querySelector('#gpsWrap'); if (wrap) { const br = B.getBoundingClientRect(), wr = wrap.getBoundingClientRect(); const avail = Math.floor(Math.min(br.bottom, innerHeight) - wr.top - 4); const want = Math.min(wr.width, 330); wrap.style.aspectRatio = 'auto'; wrap.style.height = Math.max(110, Math.min(want, avail)) + 'px'; }
    fit();
    B.querySelectorAll('.gpsBtns button').forEach(b => b.onclick = (e) => { e.stopPropagation(); const z = +b.dataset.z; if (!this.view) return; if (z === 0) this.focusPlace(this.here().real, true); else this.zoomAt(z > 0 ? 1.6 : 1 / 1.6); });
    // gestos: arrastar, pinça, roda do mouse, toque para informação
    const pts = new Map(); let moved = 0, pinch = 0;
    cv.style.touchAction = 'none';
    cv.addEventListener('pointerdown', e => { try { cv.setPointerCapture(e.pointerId); } catch (_) { } pts.set(e.pointerId, [e.clientX, e.clientY]); moved = 0; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
    cv.addEventListener('pointermove', e => {
      if (!pts.has(e.pointerId) || !this.view) return; const old = pts.get(e.pointerId); const dx = e.clientX - old[0], dy = e.clientY - old[1]; pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { moved += Math.abs(dx) + Math.abs(dy); const v = this.view; v.cx -= dx * this.dpr / v.s; v.cy -= dy * this.dpr / v.s; this.req(); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()]; const d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch > 0) this.zoomAt(d / pinch); pinch = d; moved = 99; }
    });
    const up = e => { if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId); if (pts.size < 2) pinch = 0; if (moved < 8 && this.view) { const r = cv.getBoundingClientRect(); this.tap((e.clientX - r.left) * this.dpr, (e.clientY - r.top) * this.dpr); } };
    cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', e => { pts.delete(e.pointerId); pinch = 0; });
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.deltaY < 0 ? 1.25 : 0.8); }, { passive: false });
    this.load().then(D => {
      if (this.cv !== cv) return; const L = B.querySelector('#gpsLoad'); if (L) L.hidden = true;
      if (!this.view) { const s = Math.min(cv.width / D.size[0], cv.height / D.size[1]); this.view = { cx: D.min[0] + D.size[0] / 2, cy: D.min[1] + D.size[1] / 2, s, s0: s }; }
      const list = B.querySelector('#gpsList');
      const order = { city: 0, town: 1, village: 2, neighbourhood: 1.5, suburb: 1.5, quarter: 1.5, island: 3 };
      list.innerHTML = [...D.places].sort((a, b) => (order[a.k] - order[b.k]) || a.n.localeCompare(b.n)).map(p => `<button data-place="${p.n}">${p.n}<span>${KIND[p.k] || ''} ›</span></button>`).join('');
      list.querySelectorAll('button').forEach(b => b.onclick = () => { this.focusPlace(b.dataset.place, true); const w = B.querySelector('#gpsWrap'); w && w.scrollIntoView && w.scrollIntoView({ block: 'nearest' }); });
      if (!this.sel) this.focusPlace(this.here().real, false); else this.showInfo(this.sel);
      this.draw();
    }).catch(() => { const L = B.querySelector('#gpsLoad'); if (L) L.textContent = 'Não deu para carregar o mapa. Abra o jogo uma vez com internet para guardar o mapa offline.'; });
  }
  zoomAt(f) { const v = this.view; if (!v) return; v.s = Math.max(v.s0 * 0.8, Math.min(v.s0 * 60, v.s * f)); this.req(); }
  req() { if (this._raf) return; this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); }); }
  focusPlace(name, zoom) { const D = this.data; if (!D) return; const p = D.places.find(q => q.n === name); if (!p) return; this.sel = p; const v = this.view; if (v) { v.cx = p.x; v.cy = p.y; if (zoom) v.s = Math.max(v.s, v.s0 * 4); } this.showInfo(p); this.req(); }
  showInfo(p) {
    const el = this.B && this.B.querySelector('#gpsInfo'); if (!el) return;
    const pop = p.pop ? ` · ${(+p.pop).toLocaleString('pt-BR')} habitantes` : '';
    const h = this.here(); const tag = p.n === h.real ? `<em>Inspirou a área do jogo onde você está (${h.dn}).</em>` : '';
    el.innerHTML = `<b>${p.n}</b> <small>${KIND[p.k] || ''}${pop}</small><br>${p.desc || (p.k === 'island' ? 'Ilha da Baía de Biscayne.' : 'Área residencial da região de Miami.')} ${tag}`;
    el.dataset.place = p.n;
  }
  tap(px, py) {
    const D = this.data, v = this.view, cv = this.cv; if (!D) return;
    const wx = v.cx + (px - cv.width / 2) / v.s, wy = v.cy + (py - cv.height / 2) / v.s;
    let best = null, bd = 34 * this.dpr;
    for (const p of D.places) { const d = Math.hypot((p.x - wx) * v.s, (p.y - wy) * v.s); if (d < bd) { bd = d; best = p; } }
    if (best) { this.sel = best; this.showInfo(best); this.req(); return; }
    // rua com nome mais próxima
    let rn = '', rd = 30 * this.dpr / v.s;
    for (let c = 0; c <= 2; c++) for (const r of D.roads[c]) {
      if (!r.n || wx < r.b[0] - rd || wx > r.b[2] + rd || wy < r.b[1] - rd || wy > r.b[3] + rd) continue; const p = r.p;
      for (let i = 0; i + 3 < p.length; i += 2) { const ax = p[i], ay = p[i + 1], dx = p[i + 2] - ax, dy = p[i + 3] - ay; const L = dx * dx + dy * dy || 1; const t = Math.max(0, Math.min(1, ((wx - ax) * dx + (wy - ay) * dy) / L)); const d = Math.hypot(wx - ax - t * dx, wy - ay - t * dy); if (d < rd) { rd = d; rn = r.n; } }
    }
    const el = this.B.querySelector('#gpsInfo'); if (el && rn) { el.innerHTML = `🛣️ <b>${rn}</b><br><small>Via da região de Miami (dados OpenStreetMap)</small>`; el.dataset.place = ''; }
  }
  draw() {
    const D = this.data, v = this.view, cv = this.cv; if (!D || !v || !cv || !cv.isConnected) return;
    const c = cv.getContext('2d'), W = cv.width, H = cv.height, s = v.s, dpr = this.dpr;
    const night = this.theme === 'night';
    const C = night ? { land: '#151827', water: '#0b2a4a', green: '#163a2c', sand: '#3d3550', r: ['#ff3fd0', '#ffb43a', '#d7d9f0', '#9aa0c0', '#5a5f80'], txt: '#e8f6ff', halo: '#000', sel: '#39f0ff' }
      : { land: '#f1ece1', water: '#8fd0ee', green: '#bfe3a6', sand: '#f7e2a6', r: ['#ff8a3c', '#ffc65c', '#ffffff', '#ffffff', '#ffffff'], txt: '#1b2a3a', halo: '#fff', sel: '#ff2d8a' };
    const X = x => (x - v.cx) * s + W / 2, Y = y => (y - v.cy) * s + H / 2;
    const vx0 = v.cx - W / 2 / s, vx1 = v.cx + W / 2 / s, vy0 = v.cy - H / 2 / s, vy1 = v.cy + H / 2 / s;
    const vis = b => !(b[2] < vx0 || b[0] > vx1 || b[3] < vy0 || b[1] > vy1);
    c.fillStyle = C.land; c.fillRect(0, 0, W, H);
    const fillPolys = (arr, col) => { c.fillStyle = col; for (const poly of arr) { if (!vis(poly[0].b)) continue; c.beginPath(); for (const r of poly) { const p = r.p; c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); c.closePath(); } c.fill('evenodd'); } };
    fillPolys(D.green, C.green); fillPolys(D.sand, C.sand); fillPolys(D.water, C.water);
    const z = s / v.s0; // 1 = mapa inteiro
    const maxC = z < 1.8 ? 1 : z < 3 ? 2 : z < 5 ? 3 : 4;
    c.lineCap = 'round'; c.lineJoin = 'round';
    for (let k = maxC; k >= 0; k--) {
      const wpx = Math.max(0.6 * dpr, [26, 18, 13, 10, 7][k] * s);
      if (!night && k >= 2) { c.strokeStyle = '#d4cbb8'; c.lineWidth = wpx + 1.2 * dpr; c.beginPath(); for (const r of D.roads[k]) { if (!vis(r.b)) continue; const p = r.p; c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); } c.stroke(); }
      c.strokeStyle = C.r[k]; c.lineWidth = wpx; c.beginPath();
      for (const r of D.roads[k]) { if (!vis(r.b)) continue; const p = r.p; c.moveTo(X(p[0]), Y(p[1])); for (let i = 2; i < p.length; i += 2) c.lineTo(X(p[i]), Y(p[i + 1])); }
      c.stroke();
    }
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    // nomes de vias (perto)
    if (z >= 5) {
      const used = []; c.font = `600 ${10 * dpr}px sans-serif`; c.fillStyle = night ? '#ffd9f6' : '#5a4a3a'; c.strokeStyle = C.halo; c.lineWidth = 3 * dpr;
      for (let k = 0; k <= Math.min(2, maxC); k++) for (const r of D.roads[k]) {
        if (!r.n || !vis(r.b)) continue; const p = r.p; if (p.length < 4) continue; const m = (p.length >> 2) << 1; const ax = X(p[m - 2] ?? p[0]), ay = Y(p[m - 1] ?? p[1]), bx = X(p[m]), by = Y(p[m + 1]);
        const mx = (ax + bx) / 2, my = (ay + by) / 2; if (mx < 0 || my < 0 || mx > W || my > H) continue; const tw = c.measureText(r.n).width; if (Math.hypot(bx - ax, by - ay) < tw * 0.6) continue;
        if (used.some(u => Math.abs(u[0] - mx) < tw * 0.7 && Math.abs(u[1] - my) < 14 * dpr)) continue; used.push([mx, my]);
        let a = Math.atan2(by - ay, bx - ax); if (a > Math.PI / 2) a -= Math.PI; if (a < -Math.PI / 2) a += Math.PI;
        c.save(); c.translate(mx, my); c.rotate(a); c.strokeText(r.n, 0, 0); c.fillText(r.n, 0, 0); c.restore();
        if (used.length > 40) break;
      }
    }
    // lugares
    const h = this.here(); const placed = [];
    const order = p => p === this.sel ? -1 : ({ city: 0, town: 1, village: 2, neighbourhood: 2, suburb: 2, quarter: 2, island: 3 }[p.k] ?? 4);
    for (const p of [...D.places].sort((a, b) => order(a) - order(b))) {
      let x = X(p.x); const y = Y(p.y); if (x < -40 || y < -20 || x > W + 40 || y > H + 20) continue;
      const big = p.k === 'city' || p.k === 'town'; if (z < 1.6 && !big && p !== this.sel && p.n !== h.real) continue; if (p.k === 'island' && z < 3 && p !== this.sel) continue;
      const fs = (big ? 13 : p.k === 'island' ? 10 : 11) * dpr; c.font = `${big ? 800 : p.k === 'island' ? 'italic 600' : 700} ${fs}px sans-serif`;
      const tw = c.measureText(p.n).width; x = Math.max(tw / 2 + 4 * dpr, Math.min(W - tw / 2 - 44 * dpr, x)); if (p !== this.sel && placed.some(q => Math.abs(q[0] - x) < (tw + q[2]) / 2 + 2 && Math.abs(q[1] - y) < fs * 1.1)) continue; placed.push([x, y, tw]);
      const isSel = p === this.sel;
      if (p.n === h.real) { c.fillStyle = C.sel; c.beginPath(); c.arc(x, y - fs * 1.15, 5 * dpr, 0, Math.PI * 2); c.fill(); }
      c.strokeStyle = C.halo; c.lineWidth = 3.5 * dpr; c.fillStyle = isSel ? C.sel : p.k === 'island' ? (night ? '#8fd8ff' : '#1d5f8a') : C.txt;
      c.strokeText(p.n, x, y); c.fillText(p.n, x, y);
      if (isSel) { c.strokeStyle = C.sel; c.lineWidth = 2 * dpr; c.strokeRect(x - tw / 2 - 4 * dpr, y - fs * 0.75, tw + 8 * dpr, fs * 1.5); }
    }
    // escala
    const m = [100, 200, 500, 1000, 2000, 5000].find(m => m * s > 60 * dpr) || 5000; c.fillStyle = night ? '#fff' : '#222'; c.fillRect(8 * dpr, H - 12 * dpr, m * s, 3 * dpr); c.font = `600 ${10 * dpr}px sans-serif`; c.textAlign = 'left'; c.fillText(m >= 1000 ? m / 1000 + ' km' : m + ' m', 8 * dpr, H - 22 * dpr);
    c.fillText('N ↑', 8 * dpr, 14 * dpr);
  }
}
