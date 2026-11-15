// t413/t416: nenhuma mensagem/fala/placar cobre o veículo nem a estrada à frente dele.
// A cada 100 ms (dentro de um veículo) projeta o carro + a área à frente (até ~40 m, faixa de ±3 m) na tela e, se algum texto
// visível cruza essa zona, desliza o texto (propriedade CSS `translate`) para cima, para o lado ou para baixo do carro — o menor
// deslocamento que caiba na tela. Sem lugar livre, o texto some até a zona liberar. G.msgGuard.zone() expõe a zona para os testes.
export const MSG_IDS = ['toast', 'big', 'note', 'say', 'prompt', 'radioSub', 'radio', 'drift', 'turnCue', 'bfPop', 'stTip', 'boatTip', 'marTip', 'adCard', 'orlaCard', 'giftHud', 'mis', 'raceHud', 'ponteHud', 'serpHud', 'stHud', 'boatHud', 'marHud', 'megaCard', 'lojaCard', 'driftW', 'nitroW', 'heliHud', 'bfZone', 'area', 'lojaReact', 'misTime', 'gymGame', 'dsHint'];
export function setupMsgGuard(G) {
  const els = () => MSG_IDS.map(id => document.getElementById(id)).filter(Boolean);
  const proj = (x, y, z) => { const p = G.tmpV.set(x, y, z).project(G.camera); return p.z < 1 ? [(p.x + 1) / 2 * innerWidth, (1 - p.y) / 2 * innerHeight] : null; };
  function zone() {
    const v = G.player.vehicle; if (!v) return null; const c = Math.cos(v.h), s = Math.sin(v.h);
    const L = (v.spec.len || 4.4) / 2 + 0.3, Wd = (v.spec.w || 2) / 2 + 0.3, H = v.spec.air ? 3 : v.spec.boat ? 2.2 : 1.6;
    const pts = []; const add = (dx, dy, dz) => { const q = proj(v.x + dx * c + dz * s, v.y + dy, v.z - dx * s + dz * c); if (q) pts.push(q); };
    for (const dx of [-Wd, Wd]) for (const dz of [-L, L]) for (const dy of [0, H]) add(dx, dy, dz);
    const car = pts.slice(); if (!car.length) return null;
    for (const d of [8, 16, 26, 40]) for (const dx of [-3, 3]) add(dx, 0.2, L + d); // estrada à frente
    const bx = (P) => ({ x0: Math.min(...P.map(p => p[0])), y0: Math.min(...P.map(p => p[1])), x1: Math.max(...P.map(p => p[0])), y1: Math.max(...P.map(p => p[1])) });
    const Z = bx(pts), C = bx(car); const cl = (b) => ({ x0: Math.max(0, b.x0), y0: Math.max(0, b.y0), x1: Math.min(innerWidth, b.x1), y1: Math.min(innerHeight, b.y1) });
    return { all: cl(Z), car: cl(C) };
  }
  const vis = (el) => { if (el.hidden) return null; const cs = getComputedStyle(el); if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return null; let r = el.getBoundingClientRect(); for (const k of el.children) { const q = k.getBoundingClientRect(); if (q.width < 2 || q.height < 2) continue; r = { left: Math.min(r.left, q.left), top: Math.min(r.top, q.top), right: Math.max(r.right, q.right), bottom: Math.max(r.bottom, q.bottom) }; } r.width = r.right - r.left; r.height = r.bottom - r.top; if (r.width < 4 || r.height < 4) return null; return r; };
  const hit = (r, Z, m = 3) => r.left < Z.x1 + m && r.right > Z.x0 - m && r.top < Z.y1 + m && r.bottom > Z.y0 - m;
  function reset(el) { if (el._g) { el.style.translate = ''; el.style.visibility = ''; el._g = null; } }
  function tick() {
    const on = !!G.player.vehicle && G.started && !G.paused && !G.phoneOpen;
    const Z = on ? zone() : null; G.msgZone = Z;
    for (const el of els()) {
      if (!Z) { reset(el); continue; }
      const r0 = vis(el) || (el._g && el._g.hid ? (el.style.visibility = '', vis(el)) : null); if (!r0) { continue; }
      const g = el._g || { dx: 0, dy: 0 }; const r = { left: r0.left - g.dx, right: r0.right - g.dx, top: r0.top - g.dy, bottom: r0.bottom - g.dy, width: r0.width, height: r0.height };
      const A = Z.all; if (!hit(r, A)) { if (el._g) reset(el); continue; }
      const top = 44, W = innerWidth, H = innerHeight; const cands = [];
      const up = A.y0 - 6 - r.bottom; if (r.top + up >= top) cands.push([0, up]);
      const dn = A.y1 + 6 - r.top; if (r.bottom + dn <= H - 6) cands.push([0, dn]);
      const lf = A.x0 - 6 - r.right; if (r.left + lf >= 4) cands.push([lf, 0]);
      const rt = A.x1 + 6 - r.left; if (r.right + rt <= W - 58) cands.push([rt, 0]); // não invade a coluna ⏸ ↩ da borda
      cands.sort((a, b) => Math.hypot(a[0], a[1]) - Math.hypot(b[0], b[1]));
      if (cands.length) { const [dx, dy] = cands[0]; el.style.translate = `${Math.round(dx)}px ${Math.round(dy)}px`; el.style.visibility = ''; el._g = { dx: Math.round(dx), dy: Math.round(dy) }; }
      else { el.style.visibility = 'hidden'; el._g = { dx: g.dx, dy: g.dy, hid: true }; }
    }
  }
  setInterval(tick, 100);
  G.msgGuard = { zone, tick, ids: MSG_IDS };
  return G.msgGuard;
}
