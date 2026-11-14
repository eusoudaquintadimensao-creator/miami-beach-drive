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
  const SKIP = new Set(['topBar', 'hud', 'touch', 'stickZone', 'pauseMenu', 'phone', 'mapFull', 'fade', 'say', 'big', 'toast', 'area']);
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
  apply(pref()); addEventListener('resize', () => { last = ''; place(); }); setInterval(place, 250);
  G.topBar = { bar, place, set: apply, isMin: () => bar.classList.contains('min') };
  return G.topBar;
}
