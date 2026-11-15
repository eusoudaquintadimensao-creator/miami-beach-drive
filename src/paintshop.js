// t418: cabine de pintura drive-through (no antigo bloco branco da marina). O carro entra por um lado, escolhe cor + acabamento
// (brilho, metálico, perolado, fosco, cromado), assiste aos robôs pintando (névoa, cor varrendo a lataria) e sai pelo outro lado
// com a cor nova. Custa dinheiro do jogo, fica salvo por veículo, aparece no celular/GPS e no mapa.
import * as THREE from 'three';
import { addBox, HOOKS, groundY } from './world.js';
import { canvasTex } from './util.js';
import { bodyPaintMat } from './vehicles.js';
const $ = (id) => document.getElementById(id);

// ---- tema (o Neon Distrito troca só este bloco)
export const PINT = {
  name: 'Pintura Expressa Coral', short: 'PINTURA EXPRESSA', sign: 'CORAL', icon: '🎨', handle: '@pintura.coral', money: '$',
  x0: -290, x1: -272, z0: -144, z1: -112, H: 7, wall: 0xf4f1ea, trim: 0xff6f8f, neon: '#ff6f8f', neon2: '#29d3c4', floor: '#9aa3ad',
};
export const FINISHES = [
  { id: 'brilho', n: 'Brilho', p: 250, r: 0.3, m: 0.5, cc: 1, d: 'verniz brilhante clássico' },
  { id: 'metal', n: 'Metálico', p: 550, r: 0.26, m: 0.85, cc: 1, d: 'flocos de metal que brilham no sol' },
  { id: 'perola', n: 'Perolado', p: 900, r: 0.2, m: 0.35, cc: 1, iri: 1, d: 'muda de tom conforme o ângulo' },
  { id: 'fosco', n: 'Fosco', p: 400, r: 0.88, m: 0.08, cc: 0, d: 'acetinado, sem reflexo' },
  { id: 'cromo', n: 'Cromado', p: 1600, r: 0.05, m: 1, cc: 1, lift: 0.3, d: 'espelhado, puro brilho' },
];
export const COLORS = [0xf5f5f7, 0xc8ccd0, 0x8e8e93, 0x3a3a3c, 0x111114, 0xff2d55, 0xd70015, 0x8b0a1a, 0xff6f8f, 0xff4fb8, 0xb3127a, 0x7d4dff, 0x4b2a9a, 0x2a1a6e,
  0x0a84ff, 0x1d3f8f, 0x0b2447, 0x5ac8fa, 0x29d3c4, 0x00a39a, 0x0e6b5c, 0x30d158, 0x1f7a3a, 0x9bd65a, 0xd4e157, 0xffd60a, 0xffb300, 0xff8a00, 0xff5a1f, 0xc2410c,
  0x8a5a2b, 0x5b3a1e, 0xe9dcc0, 0xd8c3a5, 0xb8a07e, 0xf7a8c4, 0xffd1dc, 0xbfe9ff, 0xc9f2e4, 0xe6d3ff];
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
const MATS = new Map();
export function finishMat(hex, fid) {
  const k = hex + ':' + fid; let m = MATS.get(k); if (m) return m; const F = FINISHES.find(f => f.id === fid) || FINISHES[0];
  const c = new THREE.Color(hex); if (F.lift) c.lerp(new THREE.Color(0xffffff), F.lift);
  m = new THREE.MeshPhysicalMaterial({ color: c, roughness: F.r, metalness: F.m, clearcoat: F.cc, clearcoatRoughness: 0.05, iridescence: F.iri ? 1 : 0, iridescenceIOR: 1.35, iridescenceThicknessRange: [180, 620] });
  m.userData.paint = { hex, fid }; MATS.set(k, m); return m;
}
export class PaintShop {
  constructor(G) {
    this.G = G; const P = PINT; this.cx = (P.x0 + P.x1) / 2; this.cz = (P.z0 + P.z1) / 2; this.x0 = P.x0; this.x1 = P.x1; this.z0 = P.z0; this.z1 = P.z1; this.state = null; this.sel = { c: 0xff2d55, f: 'metal' };
    G.save.paint = G.save.paint || {};
    this.build(G.scene);
    HOOKS.map.push((g, X, Z) => { const k = X(1) - X(0); g.fillStyle = '#ffd1dc'; g.fillRect(X(P.x0), Z(P.z0), (P.x1 - P.x0) * k, (P.z1 - P.z0) * k); g.strokeStyle = P.neon; g.lineWidth = 2; g.strokeRect(X(P.x0), Z(P.z0), (P.x1 - P.x0) * k, (P.z1 - P.z0) * k); g.font = `${Math.max(10, 18 * k)}px sans-serif`; g.textAlign = 'center'; g.fillText('🎨', X(this.cx), Z(this.cz) + 6); });
    const card = document.createElement('div'); card.id = 'pintCard'; card.hidden = true; ($('hud') || document.body).appendChild(card); this.card = card;
    card.innerHTML = `<b>${P.icon} ${P.name}</b><div class="stAsk"><button data-k="open" class="hot">🎨 Escolher cor</button></div>`;
    card.addEventListener('pointerdown', e => e.stopPropagation()); card.addEventListener('click', e => { if (e.target.closest('button')) { e.stopPropagation(); this.open(); } });
    const pn = document.createElement('div'); pn.id = 'pintPanel'; pn.hidden = true; document.body.appendChild(pn); this.panel = pn;
    for (const ev of ['pointerdown', 'touchstart', 'wheel', 'keydown']) pn.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    pn.addEventListener('click', e => this.click(e));
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); this._t = 0;
  }
  // ---------------------------------------------------------------- prédio
  build(scene) {
    const P = PINT, g = new THREE.Group(); scene.add(g); this.g = g; const W = P.x1 - P.x0, L = P.z1 - P.z0, H = P.H, y0 = groundY(this.cx, this.cz);
    const std = (o) => new THREE.MeshStandardMaterial(o);
    const box = (w, h, d, m, x, y, z, par = g) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y0 + y, z); o.castShadow = o.receiveShadow = true; par.add(o); return o; };
    const wallM = std({ color: P.wall, roughness: 0.6 }), trimM = std({ color: P.trim, roughness: 0.4, emissive: new THREE.Color(P.trim), emissiveIntensity: 0.25 }), dark = std({ color: 0x2a2f36, roughness: 0.5, metalness: 0.4 });
    const floorT = canvasTex(256, 512, (c, w, h) => { c.fillStyle = P.floor; c.fillRect(0, 0, w, h); for (let i = 0; i < 900; i++) { c.fillStyle = `rgba(255,255,255,${Math.random() * 0.05})`; c.fillRect(Math.random() * w, Math.random() * h, 2, 2); } c.fillStyle = '#ffd23f'; c.fillRect(w * 0.12, 0, 6, h); c.fillRect(w * 0.88 - 6, 0, 6, h); c.fillStyle = '#2b2f35'; for (let y = h * 0.42; y < h * 0.58; y += 10) c.fillRect(w * 0.3, y, w * 0.4, 5); });
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W, L + 8).rotateX(-Math.PI / 2), std({ map: floorT, roughness: 0.35, metalness: 0.1 })); fl.position.set(this.cx, y0 + 0.03, this.cz); fl.receiveShadow = true; g.add(fl);
    // paredes laterais com faixa de vidro (dá para ver os robôs de fora)
    const glass = new THREE.MeshPhysicalMaterial({ color: 0xbfe9ff, roughness: 0.05, metalness: 0, transmission: 0.6, transparent: true, opacity: 0.35 });
    for (const x of [P.x0, P.x1]) { box(0.4, 2.2, L, wallM, x, 1.1, this.cz); box(0.25, 2.4, L - 1, glass, x, 3.4, this.cz); box(0.4, H - 4.6, L, wallM, x, 4.6 + (H - 4.6) / 2, this.cz); box(0.5, 0.25, L + 0.2, trimM, x, 2.25, this.cz); addBox(x - 0.3, P.z0, x + 0.3, P.z1, H + 0.5); }
    // listras de cor escorrendo na fachada externa
    const drip = canvasTex(512, 128, (c, w, h) => { const cols = ['#ff2d55', '#ff8a00', '#ffd60a', '#30d158', '#29d3c4', '#0a84ff', '#7d4dff', '#ff4fb8']; const bw = w / cols.length; cols.forEach((cc, i) => { c.fillStyle = cc; c.fillRect(i * bw, 0, bw, h * 0.45); for (let k = 0; k < 3; k++) { const x = i * bw + bw * (0.2 + k * 0.3), dl = h * (0.5 + Math.random() * 0.4); c.fillRect(x - 3, 0, 6, dl); c.beginPath(); c.arc(x, dl, 5, 0, 7); c.fill(); } }); }, { clamp: true });
    for (const sd of [-1, 1]) { const m = new THREE.Mesh(new THREE.PlaneGeometry(L - 2, 2), std({ map: drip, transparent: true, roughness: 0.5 })); m.position.set(sd < 0 ? P.x0 - 0.22 : P.x1 + 0.22, y0 + 5.6, this.cz); m.rotation.y = sd < 0 ? -Math.PI / 2 : Math.PI / 2; g.add(m); }
    // fachadas: entrada (sul) e saída (norte) com vão de 10 m e porta de enrolar
    const OW = 10, OH = 4.6; this.doors = [];
    for (const [z, label] of [[P.z0, 'ENTRADA'], [P.z1, 'SAÍDA']]) {
      const side = (W - OW) / 2; for (const sd of [-1, 1]) { const x = this.cx + sd * (OW / 2 + side / 2); box(side, H, 0.5, wallM, x, H / 2, z); addBox(x - side / 2, z - 0.3, x + side / 2, z + 0.3, H + 0.5); }
      box(OW, H - OH, 0.5, wallM, this.cx, OH + (H - OH) / 2, z); box(OW + 0.4, 0.3, 0.7, trimM, this.cx, OH, z);
      const doorT = canvasTex(256, 128, (c, w, h) => { c.fillStyle = '#d9dde2'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(0,0,0,.18)'; for (let y = 0; y < h; y += 8) c.fillRect(0, y, w, 2); c.fillStyle = P.neon; c.font = 'bold 22px sans-serif'; c.textAlign = 'center'; c.fillText(label, w / 2, h * 0.55); }, { clamp: true });
      const d = new THREE.Mesh(new THREE.PlaneGeometry(OW - 0.2, OH), std({ map: doorT, side: THREE.DoubleSide, roughness: 0.5, metalness: 0.3 })); d.position.set(this.cx, y0 + OH / 2 + OH, z + (z === P.z0 ? -0.05 : 0.05)); g.add(d); d.userData.up = 1; this.doors.push(d);
      const arrow = canvasTex(256, 64, (c, w, h) => { c.fillStyle = 'rgba(0,0,0,0)'; c.clearRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = 'bold 34px sans-serif'; c.textAlign = 'center'; c.fillText(label === 'ENTRADA' ? '▲ ENTRADA ▲' : '▲ SAÍDA ▲', w / 2, 44); }, { clamp: true });
      const am = new THREE.Mesh(new THREE.PlaneGeometry(6, 1.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: arrow, transparent: true })); am.position.set(this.cx, y0 + 0.05, z + (label === 'ENTRADA' ? -3 : 3)); g.add(am);
    }
    // telhado + letreiro
    box(W + 1, 0.4, L + 1, dark, this.cx, H + 0.2, this.cz);
    const signT = canvasTex(1024, 256, (c, w, h) => { c.fillStyle = '#14161c'; c.fillRect(0, 0, w, h); const gr = c.createLinearGradient(0, 0, w, 0); ['#ff2d55', '#ff8a00', '#ffd60a', '#30d158', '#29d3c4', '#0a84ff', '#7d4dff', '#ff4fb8'].forEach((cc, i, a) => gr.addColorStop(i / (a.length - 1), cc)); c.fillStyle = gr; c.fillRect(0, h - 26, w, 26); c.shadowBlur = 24; c.shadowColor = P.neon; c.fillStyle = '#fff'; c.font = 'bold 92px sans-serif'; c.textAlign = 'center'; c.fillText(P.icon + ' ' + P.short, w / 2, h * 0.5); c.shadowColor = P.neon2; c.fillStyle = P.neon2; c.font = 'italic bold 56px serif'; c.fillText(P.sign, w / 2, h * 0.84); }, { clamp: true });
    this.signM = new THREE.MeshStandardMaterial({ map: signT, emissive: 0xffffff, emissiveMap: signT, emissiveIntensity: 0.6 });
    for (const z of [P.z0 - 0.3, P.z1 + 0.3]) { const s = new THREE.Mesh(new THREE.PlaneGeometry(W - 1, (W - 1) / 4), this.signM); s.position.set(this.cx, y0 + H + 2.4, z); s.rotation.y = z < this.cz ? Math.PI : 0; g.add(s); }
    // interior: painéis de luz no teto, trilhos e dois robôs pintores
    const lightM = new THREE.MeshBasicMaterial({ color: 0xf4fbff, toneMapped: false }); for (let z = P.z0 + 3; z < P.z1 - 2; z += 4) for (const sd of [-1, 1]) box(2.4, 0.08, 1.2, lightM, this.cx + sd * 4, H - 0.1, z);
    for (const sd of [-1, 1]) box(0.3, 0.3, L - 2, dark, this.cx + sd * (W / 2 - 1.2), 3.6, this.cz);
    this.robots = []; const orange = std({ color: 0xff8a00, roughness: 0.4, metalness: 0.3 }), steel = std({ color: 0xc8ccd0, roughness: 0.3, metalness: 0.8 });
    for (const sd of [-1, 1]) { const r = new THREE.Group(); r.position.set(this.cx + sd * (W / 2 - 1.2), y0 + 3.6, this.cz); g.add(r);
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 1.0), orange); r.add(car); const a1 = new THREE.Group(); a1.position.set(-sd * 0.3, -0.3, 0); r.add(a1);
      const s1 = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.6, 0.22), orange); s1.position.y = -0.8; a1.add(s1); const a2 = new THREE.Group(); a2.position.y = -1.6; a1.add(a2);
      const s2 = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.3, 0.18), steel); s2.position.y = -0.65; a2.add(s2); const noz = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 0.3, 8), dark); noz.position.y = -1.35; a2.add(noz);
      r.userData = { sd, a1, a2, noz }; this.robots.push(r); }
    // névoa de tinta
    const N = 260; const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3).fill(-999), 3));
    const mt = canvasTex(64, 64, (c, w, h) => { const gr = c.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { clamp: true });
    this.mistM = new THREE.PointsMaterial({ size: 0.9, map: mt, transparent: true, depthWrite: false, opacity: 0.7, color: 0xff2d55 }); this.mist = new THREE.Points(pg, this.mistM); this.mist.frustumCulled = false; g.add(this.mist); this.mp = Array.from({ length: N }, () => ({ t: 9, x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0 })); this.mk = 0;
    this.lamp = new THREE.PointLight(0xffffff, 0, 26, 1.6); this.lamp.position.set(this.cx, y0 + H - 1, this.cz); g.add(this.lamp); this.y0 = y0;
  }
  // ---------------------------------------------------------------- pintura salva por veículo
  keyOf(v) { return v.megaId != null ? 'mega' + v.megaId : v.mine ? 'mine' : 'tipo:' + v.type; }
  paintMeshes(v) { const base = v._paintBase || (v._paintBase = bodyPaintMat(v)); const out = []; if (!base) return out; v.root.traverse(o => { if (o.isMesh && (o.material === base || (o.material && o.material.userData && o.material.userData.paint && o.userData.bodyPaint))) out.push(o); }); return out; }
  applyTo(v, rec) { const ms = this.paintMeshes(v); const mat = rec ? finishMat(rec.c, rec.f) : v._paintBase; for (const o of ms) { o.material = mat; o.userData.bodyPaint = true; } v._pk = rec ? rec.c + ':' + rec.f : null; return ms.length; }
  syncSaved() { const G = this.G, sv = G.save.paint; const pv = G.player.vehicle; for (const v of G.vehicles.concat(pv && !G.vehicles.includes(pv) ? [pv] : [])) { if (v.spec.boat || v.spec.air) continue; if (!(v === pv || v.mine || v.megaId != null) || v === this.v) continue; const rec = sv[this.keyOf(v)]; const k = rec ? rec.c + ':' + rec.f : null; if (rec && v._pk !== k) this.applyTo(v, rec); } }
  // ---------------------------------------------------------------- UI
  inBay(x, z, m = 0) { const P = PINT; return x > P.x0 + 1 - m && x < P.x1 - 1 + m && z > P.z0 + 1 - m && z < P.z1 - 1 + m; }
  get isOpen() { return !this.panel.hidden; }
  open() { const G = this.G, v = G.player.vehicle; if (!v || v.spec.boat || v.spec.air || this.state) return false; this.v = v; this.state = 'menu'; this.hold = { x: this.cx, z: PINT.z0 + 6, h: 0 };
    const cur = G.save.paint[this.keyOf(v)]; this.sel = cur ? { ...cur } : { c: (v.tune ? v.tune.paint : v.color) || 0xff2d55, f: 'brilho' }; this.orig = cur || null;
    document.body.classList.add('pintOpen'); this.panel.hidden = false; this.card.hidden = true; this.render(); this.preview(); G.audio && G.audio.chime && G.audio.chime('coin'); return true; }
  close(keep) { const G = this.G; this.panel.hidden = true; document.body.classList.remove('pintOpen'); if (!keep && this.v) { this.applyTo(this.v, this.orig); } if (this.state === 'menu') this.state = null; }
  price() { const F = FINISHES.find(f => f.id === this.sel.f); return F.p; }
  render() {
    const G = this.G, P = PINT, pr = this.price(), can = G.save.money >= pr;
    this.panel.innerHTML = `<div class="pnHead"><b>${P.icon} ${P.name}</b><button class="pnX" data-k="x" title="Fechar">✕</button></div>
      <p class="small">${G.player.vehicle ? (G.player.vehicle.spec.name || 'Seu carro') : ''} · <b class="pnMoney">${P.money}${G.save.money.toLocaleString('pt-BR')}</b> (dinheiro das corridas)</p>
      <div class="pnFin">${FINISHES.map(f => `<button data-f="${f.id}" class="${this.sel.f === f.id ? 'on' : ''}" title="${f.d}">${f.n}<small>${P.money}${f.p}</small></button>`).join('')}</div>
      <div class="pnSw">${COLORS.map(c => `<button data-c="${c}" class="${this.sel.c === c ? 'on' : ''}" style="--c:${hexCss(c)}" aria-label="cor ${hexCss(c)}"></button>`).join('')}</div>
      <p class="small pnDesc">${FINISHES.find(f => f.id === this.sel.f).d}</p>
      <div class="pnAct"><button data-k="x">Cancelar</button><button data-k="go" class="hot${can ? '' : ' off'}" ${can ? '' : 'disabled'}>🎨 Pintar · ${P.money}${pr}</button></div>${can ? '' : '<p class="small">Faltou dinheiro: ganhe mais em corridas e entregas.</p>'}`;
  }
  click(e) { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const d = b.dataset;
    if (d.k === 'x') return this.close(false); if (d.f) { this.sel.f = d.f; this.render(); this.preview(); return; } if (d.c) { this.sel.c = +d.c; this.render(); this.preview(); return; } if (d.k === 'go') this.start(); }
  preview() { if (this.v) this.applyTo(this.v, this.sel); }
  start() { const G = this.G, pr = this.price(); if (G.save.money < pr || !this.v) return; G.addMoney ? G.addMoney(-pr) : (G.save.money -= pr); this.close(true); this.applyTo(this.v, this.orig);
    this.state = 'in'; this.st = 0; this.newMat = finishMat(this.sel.c, this.sel.f); this.mistM.color.set(this.sel.c); this.from = { x: this.v.x, z: this.v.z, h: this.v.h };
    document.body.classList.add('pintBusy'); G.ui.toast(`${PINT.icon} Entrando na cabine — ${FINISHES.find(f => f.id === this.sel.f).n} ${hexCss(this.sel.c)}`, 2500); }
  sweepStart() { const v = this.v, R = this.G.renderer; if (R) R.localClippingEnabled = true; this.clones = []; const nm = this.newMat.clone(); nm.clippingPlanes = [this.clipPlane]; nm.polygonOffset = true; nm.polygonOffsetFactor = -2; nm.polygonOffsetUnits = -4; this.sweepMat = nm;
    for (const o of this.paintMeshes(v)) { const c = new THREE.Mesh(o.geometry, nm); c.position.copy(o.position); c.quaternion.copy(o.quaternion); c.scale.copy(o.scale); o.parent.add(c); this.clones.push(c); } }
  sweepEnd() { for (const c of this.clones || []) c.parent && c.parent.remove(c); this.clones = []; if (this.sweepMat) this.sweepMat.dispose(); this.sweepMat = null;
    const G = this.G, v = this.v, rec = { c: this.sel.c, f: this.sel.f }; G.save.paint[this.keyOf(v)] = rec; this.applyTo(v, rec); G.persist && G.persist(); G.save && G.save.stats && (G.save.stats.paints = (G.save.stats.paints || 0) + 1); }
  spray(x, y, z, dx, dz) { for (let k = 0; k < 6; k++) { const p = this.mp[this.mk = (this.mk + 1) % this.mp.length]; p.t = 0; p.x = x; p.y = y; p.z = z; p.vx = dx * (1.5 + Math.random() * 2) + (Math.random() - 0.5); p.vy = -0.6 - Math.random(); p.vz = (Math.random() - 0.5) * 1.5; } }
  // ---------------------------------------------------------------- quadro a quadro
  update(dt, t, camera, night = 0) {
    const G = this.G, P = PINT, pv = G.player.vehicle; const dc = Math.hypot(camera.position.x - this.cx, camera.position.z - this.cz); this.g.visible = dc < 700;
    this.signM.emissiveIntensity = 0.6 + night * 1.6; this._t -= dt; if (this._t <= 0) { this._t = 0.5; this.syncSaved(); }
    const busy = this.state && this.state !== 'menu';
    // portas: abertas, exceto durante a pintura
    const closed = this.state === 'spray' || this.state === 'dry' ? [true, true] : this.state === 'in' && this.st > 1 ? [true, false] : this.state === 'out' ? [true, false] : [false, false];
    this.doors.forEach((d, i) => { const want = closed[i] ? 0 : 1; d.userData.up += (want - d.userData.up) * Math.min(1, dt * 3); d.position.y = this.y0 + 2.3 + d.userData.up * 4.6; d.scale.y = 1 - d.userData.up * 0.85; });
    this.lamp.intensity = dc < 90 ? (busy ? 26 : 10) : 0;
    // card: carro parado dentro da cabine
    const canCard = !this.state && pv && !pv.spec.boat && !pv.spec.air && this.inBay(pv.x, pv.z, 1) && Math.hypot(pv.vx, pv.vz) < 4;
    if (this.card.hidden === !!canCard) this.card.hidden = !canCard;
    if (pv && !this.state && this.inBay(pv.x, pv.z, 1) && !this._welcomed) { this._welcomed = true; G.ui.toast(`${P.icon} ${P.name}: pare aqui dentro e toque em 🎨 Escolher cor`, 3200); } if (!pv || !this.inBay(pv.x, pv.z, 6)) this._welcomed = false;
    // máquina de estados
    const v = this.v; if (this.state && (!pv || pv !== v)) { if (this.state === 'menu') this.close(false); else if (this.state === 'in' || this.state === 'spray' || this.state === 'dry') { if (!this.clones || !this.clones.length) this.sweepStart(); this.sweepEnd(); } this.finish(); }
    if (this.state && v) {
      this.st += dt; const fx = 0, fz = 1; // a cabine corre no eixo z: entra pelo sul, sai pelo norte
      if (this.state === 'menu') { const h = this.hold; v.place(this.cx, Math.min(Math.max(v.z, P.z0 + 4), P.z1 - 6), 0); }
      else if (this.state === 'in') { const k = Math.min(1, this.st / 1.4), e = k * k * (3 - 2 * k); v.place(this.from.x + (this.cx - this.from.x) * e, this.from.z + (this.cz - this.from.z) * e, this.from.h + (0 - this.from.h) * e); if (this.st > 1.8) { this.state = 'spray'; this.st = 0; this.sweepStart(); G.audio && G.audio.spray && G.audio.spray(5); } }
      else if (this.state === 'spray') { v.place(this.cx, this.cz, 0); const T = 5, k = Math.min(1, this.st / T); const Lh = (v.spec.len || 4.4) / 2 + 0.3; const front = this.cz + Lh, zc = front - k * 2 * Lh;
        this.clipPlane.normal.set(fx, 0, fz); this.clipPlane.constant = -zc; // mostra a cor nova onde z >= zc (da frente para trás)
        for (const r of this.robots) { const u = r.userData; r.position.z = zc; u.a1.rotation.z = u.sd * (0.55 + Math.sin(this.st * 5 + u.sd) * 0.25); u.a2.rotation.z = u.sd * (0.5 + Math.sin(this.st * 7) * 0.35); u.noz.getWorldPosition(G.tmpV); this.spray(G.tmpV.x, G.tmpV.y, G.tmpV.z, -u.sd, 0); }
        if (k >= 1) { this.sweepEnd(); this.state = 'dry'; this.st = 0; G.audio && G.audio.chime && G.audio.chime('win'); } }
      else if (this.state === 'dry') { v.place(this.cx, this.cz, 0); this.lamp.intensity = 26 + Math.sin(this.st * 20) * 18; if (this.st > 1.2) { this.state = 'out'; this.st = 0; G.ui.toast(`✨ Pintura nova! ${FINISHES.find(f => f.id === this.sel.f).n} — salva para este carro.`, 3200); } }
      else if (this.state === 'out') { const k = Math.min(1, this.st / 2.4), e = k * k; v.place(this.cx, this.cz + e * (P.z1 + 9 - this.cz), 0); if (k >= 1) { v.vz = 6; v.vx = 0; v.vf = 6; this.finish(); } }
    }
    // névoa
    const pa = this.mist.geometry.attributes.position; let any = false; for (let i = 0; i < this.mp.length; i++) { const p = this.mp[i]; if (p.t < 1.6) { p.t += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vx *= 1 - dt * 1.5; p.vy *= 1 - dt; any = true; pa.setXYZ(i, p.x, p.t < 1.6 ? p.y : -999, p.z); } else if (pa.getY(i) !== -999) { pa.setY(i, -999); any = true; } } if (any) pa.needsUpdate = true;
    this.mistM.opacity = 0.55;
  }
  finish() { this.state = null; this.v = null; document.body.classList.remove('pintBusy'); for (const r of this.robots) r.position.z = this.cz; }
  cam(camera, dt) { if (!this.state || !this.v) return false; const v = this.v, a = this.state === 'menu' ? 0.9 : 0.6 + (this.st || 0) * 0.25; const land = innerWidth > innerHeight; const R = this.state === 'menu' ? (land ? 7 : 9) : 6.5;
    const tx = v.x + (this.state === 'menu' && land ? 1.6 : 0); camera.position.set(v.x + Math.sin(a) * R, this.y0 + (this.state === 'menu' ? 2.6 : 3.4), v.z + Math.cos(a) * R); camera.lookAt(tx, this.y0 + 0.7, v.z); return true; }
  doorOut() { return { x: this.cx, z: PINT.z0 - 8 }; }
  phoneHtml() { const G = this.G, P = PINT, n = Object.keys(G.save.paint || {}).length; return `<h3>${P.icon} ${P.name}</h3><p class="small">Cabine drive-through na marina: entre de carro pela ENTRADA, pare dentro, escolha a cor e o acabamento (brilho, metálico, perolado, fosco ou cromado) e saia pela outra porta com o carro pintado. A pintura fica salva para cada carro.</p><div class="list"><button data-a="go" data-x="${this.doorOut().x}" data-z="${this.doorOut().z}">${P.icon} Ir para a ${P.name}<span>GPS ›</span></button><div class="row">Carros pintados<b>${n}</b></div><div class="row">Seu dinheiro<b>${P.money}${G.save.money.toLocaleString('pt-BR')}</b></div></div>`; }
  gpsLinks() { return `<button data-a="go" data-x="${this.doorOut().x}" data-z="${this.doorOut().z}">${PINT.icon} ${PINT.name} (pintura drive-through)<span>GPS ›</span></button>`; }
}
