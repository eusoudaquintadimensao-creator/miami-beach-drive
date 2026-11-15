// Barra do topo (t405): todos os atalhos (⏸ ↩ 📱 🗺️ 📻 🎥 🔴 + 🏁 🎒 🚁 …) numa fita horizontal de vidro branco espelhado,
// colada no topo entre o minimapa e o relógio. Recolhida mostra só ▦ ⏸ (↩); aberta rola para o lado se não couber.
// Nunca cobre outro HUD do topo: mede o que está na linha e encolhe (ou desce para a 2ª linha no celular em pé).
const $ = (id) => document.getElementById(id);
export function setupTopBar(G) {
  const icons = $('icons'), quick = $('quick'), more = $('qMore'); if (!icons || !quick || !more) return null;
  const bar = document.createElement('div'); bar.id = 'topBar'; const strip = document.createElement('div'); strip.id = 'tbStrip';
  icons.parentElement.insertBefore(bar, icons); strip.append(icons, quick); bar.append(more, strip);
  document.body.classList.add('hasTopBar');
  const KEY = 'topMin-v1';
  const pref = () => { const v = localStorage.getItem(KEY); return v === null ? !!G.touch : v === '1'; };
  const apply = (m) => { bar.classList.toggle('min', m); quick.classList.toggle('min', m); more.textContent = m ? '▦' : '✕'; more.title = m ? 'Mostrar atalhos' : 'Ocultar atalhos'; more.setAttribute('aria-expanded', String(!m)); place(); };
  more.onclick = (e) => { e.stopPropagation(); G.audio && G.audio.init && G.audio.init(); const m = !bar.classList.contains('min'); localStorage.setItem(KEY, m ? '1' : '0'); apply(m); };
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) bar.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  bar.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { strip.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });
  const SKIP = new Set(['edgeCol', 'bClean', 'topBar', 'hud', 'touch', 'stickZone', 'pauseMenu', 'phone', 'mapFull', 'fade', 'say', 'big', 'toast', 'area']);
  const rowHit = (top, bot, x0, x1) => { let L = x0; const hud = $('hud'); if (!hud) return L;
    for (const el of hud.children) { if (!el.id || SKIP.has(el.id) || el === bar || el.id === 'topR' || el.id === 'mapw' || el.hidden) continue; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) continue;
      const r = el.getBoundingClientRect(); if (r.width < 4 || r.height < 4 || r.width > innerWidth * 0.6 || r.height > innerHeight * 0.5) continue;
      if (r.bottom <= top || r.top >= bot || r.right <= x0 || r.left >= x1) continue; L = Math.max(L, r.right + 8); }
    return L; };
  let last = '';
  function place() {
    if ($('hud') && $('hud').hidden) return;
    const W = innerWidth, cs = getComputedStyle(document.documentElement); const sat = parseFloat(cs.getPropertyValue('--sat')) || 0, sal = parseFloat(cs.getPropertyValue('--sal')) || 0, sar = parseFloat(cs.getPropertyValue('--sar')) || 0;
    const tr = $('topR').getBoundingClientRect(), mr = $('mapw').getBoundingClientRect(); const bh = bar.offsetHeight || 40; const mTop = mr.top < 70 && mr.height > 10;
    let top = sat + 8, right = W - tr.left + 8, left0 = mTop ? mr.right + 8 : sal + 10; let L = rowHit(top, top + bh, left0, W - right);
    const minW = (more.offsetWidth || 34) * 3 + 14;
    if (W - right - L < minW) { top = Math.max(tr.bottom, sat + 8) + 6; right = sar + 8; L = rowHit(top, top + bh, mTop ? mr.right + 8 : sal + 10, W - right); }
    const key = [top, right, L].map(Math.round).join(','); if (key === last) return; last = key;
    bar.style.top = top + 'px'; bar.style.right = right + 'px'; bar.style.maxWidth = Math.max(minW, W - right - L) + 'px';
  }
  // t414: ⏸ Pausa e ↩ Voltar empilhados na borda direita (abaixo do relógio), visíveis também no carro
  const col = document.createElement('div'); col.id = 'edgeCol'; ($('hud') || document.body).appendChild(col);
  for (const id of ['bPause', 'bBack']) { const b = $(id); if (b) col.appendChild(b); }
  for (const ev of ['pointerdown', 'touchstart', 'mousedown']) col.addEventListener(ev, (e) => e.stopPropagation(), { passive: true });
  // t413: 👁 tela limpa — um toque esconde o que não é essencial, outro toque traz tudo de volta (fica salvo)
  const CK = 'clean-v1'; const bc = document.createElement('button'); bc.id = 'bClean'; ($('hud') || document.body).appendChild(bc);
  const setClean = (on) => { document.body.classList.toggle('clean', on); bc.textContent = on ? '🙈' : '👁'; bc.title = on ? 'Mostrar tudo de novo' : 'Tela limpa (esconder botões extras)'; bc.setAttribute('aria-label', bc.title); bc.setAttribute('aria-pressed', String(on)); last = ''; };
  bc.addEventListener('pointerdown', (e) => e.stopPropagation()); bc.onclick = (e) => { e.stopPropagation(); G.audio && G.audio.init && G.audio.init(); const on = !document.body.classList.contains('clean'); try { localStorage.setItem(CK, on ? '1' : '0'); } catch (_) { } setClean(on); };
  setClean(localStorage.getItem(CK) === '1');
  // t413: dirigindo rápido, os extras somem sozinhos (voltam ao tocar na tela ou ao parar)
  let lastTouch = performance.now(); addEventListener('pointerdown', () => { lastTouch = performance.now(); if (document.body.classList.contains('autofade')) document.body.classList.remove('autofade'); }, { capture: true, passive: true });
  setInterval(() => { const v = G.player && G.player.vehicle; const fast = v && Math.abs(v.speed || 0) > 6 && !G.paused; const want = !!fast && performance.now() - lastTouch > 3000; if (document.body.classList.contains('autofade') !== want) document.body.classList.toggle('autofade', want); }, 300);
  // t417: no computador (sem toque) o N Neutro também aparece no carro, embaixo à esquerda, ao lado do mapa
  function placeN() { const n = $('bNeutral'), btns = $('btns'); if (!n || !btns) return; const touch = document.body.classList.contains('touch');
    if (!touch && n.parentElement === btns) { ($('hud') || document.body).appendChild(n); n.classList.add('deskN'); }
    else if (touch && n.parentElement !== btns) { btns.insertBefore(n, $('bDown')); n.classList.remove('deskN'); } }
  function placeCol() { placeN(); const cs = getComputedStyle(document.documentElement); const sat = parseFloat(cs.getPropertyValue('--sat')) || 0, sar = parseFloat(cs.getPropertyValue('--sar')) || 0, sal = parseFloat(cs.getPropertyValue('--sal')) || 0;
    const tr = $('topR').getBoundingClientRect(); const barR = bar.getBoundingClientRect(); let top = Math.max(tr.bottom, sat + 8) + 6; if (barR.height && barR.right > innerWidth - 60 && barR.top < top + 80 && barR.bottom > top) top = barR.bottom + 6;
    col.style.top = top + 'px'; col.style.right = (sar + 8) + 'px';
    const mr = $('mapw').getBoundingClientRect(); const mTop = mr.top < 70 && mr.height > 10; bc.style.left = (mTop ? mr.right - 30 : sal + 8) + 'px'; bc.style.top = (mTop ? mr.top - 4 : sat + 8) + 'px'; }
  apply(pref()); addEventListener('resize', () => { last = ''; place(); placeCol(); }); setInterval(() => { place(); placeCol(); }, 250); placeCol();
  G.topBar = { bar, place, set: apply, isMin: () => bar.classList.contains('min'), col, clean: setClean };
  return G.topBar;
}
