// t439: 👁² e 👁³ embaixo do 👁 (tela limpa) no canto do minimapa. Cada olho abre um menu de vidro com recursos
// que não estão no 👁: chamar avião/helicóptero/carro, buzina, 🔄 desvirar/destravar, corridas, clima, dia/noite…
// Celular em pé: menu em 2 colunas embaixo do mapa (terço esquerdo, longe do carro e da estrada).
// Deitado/computador: fileira no alto ao lado do mapa (a fita de atalhos some enquanto o menu está aberto).
const $ = (id) => document.getElementById(id);
export function setupEyes(G) {
  const hud = $('hud') || document.body; const bc = $('bClean'); if (!bc) return null;
  const col = document.createElement('div'); col.id = 'eyes';
  const menu = document.createElement('div'); menu.id = 'eyeMenu'; menu.hidden = true; menu.setAttribute('role', 'menu');
  hud.append(col, menu);
  const toast = (t, ms = 1600) => G.ui && G.ui.toast(t, ms);
  const nextWx = { limpo: 'nublado', nublado: 'chuva', chuva: 'limpo' }, wxName = { limpo: '☀️ Céu limpo', nublado: '⛅ Nublado', chuva: '🌧️ Chuva' };
  const MENUS = {
    2: { title: 'Olho 2 · Recursos', items: [
      ['ePlane', '✈️', 'Avião', () => G.callPlane()],
      ['eHeli', '🚁', 'Heli', () => G.callHeli()],
      ['eJet', '🎒', 'Jato', () => G.jet.toggle()],
      ['eHorn', '📣', 'Buzina', () => { if (G.player.vehicle) G.horn(); else toast('📣 Entre num carro para buzinar'); }, true],
      ['eFix', '🔄', 'Desvirar', () => G.unstuck()],
      ['eVol', '🔊', 'Volume', () => { const L = [1, 0.66, 0.33, 0]; const v = G.audio.vol; const i = L.findIndex(x => Math.abs(x - (G.audio.muted ? 0 : v)) < 0.05); G.setVolume(L[(i + 1) % L.length]); volUi(); }, true],
    ] },
    3: { title: 'Olho 3 · Mais funções', items: [
      ['eRace', '🏁', 'Corridas', () => (G.race.active ? G.race.askQuit() : G.race.openMenu())],
      ['eSerp', '🏎️', 'Circuito', () => G.serp.go()],
      ['ePonte', '🌉', 'Ponte', () => G.ponte.go()],
      ['eHome', '🏠', 'Casa', () => G.home.go()],
      ['eWx', '🌦️', 'Clima', () => { const w = nextWx[G.env.weather] || 'limpo'; G.env.setWeather(w); G.save.weather = w; G.persist && G.persist(); toast(wxName[w], 1200); }, true],
      ['eTime', '🌗', 'Dia/Noite', () => { const n = G.env.night > 0.5; G.env.setTime(n ? 7.5 : 20.2); G.persist && G.persist(); toast(n ? 'Bom dia! ☀️' : 'Boa noite 🌙', 1200); }, true],
      ['eFlash', '💡', 'Desafio', () => G.street.flash()],
      ['eRadio', '🎵', 'Rádio', () => { G.radioSet(G.audio.station + 1); }, true],
      ['eCam', '🎥', 'Câmera', () => G.cycleCam(), true],
      ['eZoom', '🔍', 'Zoom', () => { const Z = [1, 1.7, 0.6]; const i = Z.indexOf(G.miniZoom || 1); G.miniZoom = Z[(i + 1) % Z.length]; try { localStorage.setItem('miniZoom-v1', String(G.miniZoom)); } catch (_) { } toast(G.miniZoom > 1 ? '🔍 Mapa perto' : G.miniZoom < 1 ? '🔍 Mapa longe' : '🔍 Mapa normal', 1100); }, true],
    ] },
  };
  // t440: volume — ícone mostra o nível (🔊 🔉 🔈 🔇); sem som = indicador 🔇 pequeno embaixo do relógio (não toca, não cobre nada)
  const ind = document.createElement('div'); ind.id = 'muteInd'; ind.textContent = '🔇 sem som'; ind.hidden = true; const topR = $('topR'); if (topR) topR.appendChild(ind);
  try { const z = parseFloat(localStorage.getItem('miniZoom-v1')); if (z > 0) G.miniZoom = z; } catch (_) { }
  function volUi() { const a = G.audio; if (!a) return; const v = a.muted ? 0 : a.vol; const ic = v <= 0.01 ? '🔇' : v < 0.4 ? '🔈' : v < 0.75 ? '🔉' : '🔊';
    ind.hidden = v > 0.01; const b = $('eVol'); if (b) { const t = `${ic}<small>${v <= 0.01 ? 'Mudo' : Math.round(v * 100) + '%'}</small>`; if (b.innerHTML !== t) b.innerHTML = t; b.title = `Volume ${Math.round(v * 100)}%`; } }
  const eyes = {};
  for (const n of [2, 3]) {
    const b = document.createElement('button'); b.id = 'bEye' + n; b.type = 'button'; b.innerHTML = `<b>${n}</b>👁`;
    b.title = MENUS[n].title; b.setAttribute('aria-label', MENUS[n].title); b.setAttribute('aria-expanded', 'false');
    b.addEventListener('pointerdown', (e) => e.stopPropagation());
    b.onclick = (e) => { e.stopPropagation(); G.audio && G.audio.init && G.audio.init(); open === n ? close() : show(n); };
    col.appendChild(b); eyes[n] = b;
  }
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) menu.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  let open = 0, idle = 0;
  function show(n) {
    open = n; idle = 0; menu.innerHTML = ''; menu.setAttribute('aria-label', MENUS[n].title);
    for (const [id, ic, label, fn, keep] of MENUS[n].items) {
      const b = document.createElement('button'); b.id = id; b.type = 'button'; b.setAttribute('role', 'menuitem'); b.innerHTML = `${ic}<small>${label}</small>`; b.title = label;
      b.onclick = (e) => { e.stopPropagation(); idle = 0; if (!G.started || G.paused) return; G.audio && G.audio.init && G.audio.init(); try { fn(); } catch (err) { console.warn('olho', id, err); } if (!keep) close(); };
      menu.appendChild(b);
    }
    for (const k in eyes) { eyes[k].classList.toggle('on', +k === n); eyes[k].setAttribute('aria-expanded', String(+k === n)); }
    menu.hidden = false; document.body.classList.add('eyeOpen'); volUi(); last = ''; place();
  }
  function close() { document.body.classList.remove('eyeRow'); open = 0; menu.hidden = true; document.body.classList.remove('eyeOpen'); for (const k in eyes) { eyes[k].classList.remove('on'); eyes[k].setAttribute('aria-expanded', 'false'); } }
  // toque fora do menu (no jogo) fecha
  addEventListener('pointerdown', (e) => { if (open && !menu.contains(e.target) && !col.contains(e.target)) close(); }, { capture: true, passive: true });
  let last = '';
  function placeEyes() {
    const L = parseFloat(bc.style.left) || 8, T = parseFloat(bc.style.top) || 8, s = bc.offsetHeight || 32;
    eyes[2].style.left = eyes[3].style.left = L + 'px'; eyes[2].style.top = (T + s + 4) + 'px'; eyes[3].style.top = (T + 2 * (s + 4)) + 'px';
  }
  function place() {
    if (menu.hidden) return;
    const W = innerWidth, H = innerHeight, cs = getComputedStyle(document.documentElement); const sat = parseFloat(cs.getPropertyValue('--sat')) || 0, sal = parseFloat(cs.getPropertyValue('--sal')) || 0;
    const er = eyes[3].getBoundingClientRect(), mr = $('mapw').getBoundingClientRect(), mTop = mr.top < 70 && mr.height > 10;
    const n = menu.children.length, bw = menu.firstChild ? menu.firstChild.offsetWidth || 54 : 54, bh = menu.firstChild ? menu.firstChild.offsetHeight || 50 : 50, gap = 6;
    let left, top, cols;
    if (H > W) { left = sal + 10; top = Math.max(mTop ? mr.bottom : 0, er.bottom) + 8; cols = 2; }
    else {
      left = Math.max(mTop ? mr.right : 0, er.right) + 8; top = sat + 8; let right = W - 8;
      for (const id of ['topR', 'edgeCol']) { const el = $(id); if (!el) continue; const r = el.getBoundingClientRect(); if (r.width > 2 && r.top < top + 2 * (bh + gap) && r.bottom > top) right = Math.min(right, r.left - 8); }
      cols = Math.max(2, Math.min(n, Math.floor((right - left + gap) / (bw + gap))));
    }
    const row = !(H > W); document.body.classList.toggle('eyeRow', row); // fileira no alto: o recado da Solara desce para baixo do menu
    if (row) document.documentElement.style.setProperty('--eyeB', Math.round(top + Math.ceil(n / cols) * (bh + gap) + 2) + 'px');
    const key = [left, top, cols].map(Math.round).join(','); if (key === last) return; last = key;
    menu.style.left = left + 'px'; menu.style.top = top + 'px'; menu.style.gridTemplateColumns = `repeat(${cols}, ${bw}px)`;
  }
  setInterval(() => { placeEyes(); volUi(); if (open) { place(); idle += 0.25; if (idle > 12 || G.paused) close(); } }, 250); placeEyes();
  addEventListener('resize', () => { last = ''; placeEyes(); place(); });
  G.eyes = { show, close, place, volUi, get open() { return open; }, menus: MENUS };
  return G.eyes;
}
