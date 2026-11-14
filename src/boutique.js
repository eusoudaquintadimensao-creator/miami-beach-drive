// Lojas da orla (t408/t410): Boutique Brisa (moda resort estilo Miami) e, no prédio vizinho, Arsenal Aurora (trajes de herói originais).
// Entra a pé pela porta grande de vidro, interior claro e decorado, compra com o dinheiro das corridas, veste na hora,
// espelho com poses e reações, tudo salvo por personagem (src/wardrobe.js). Endereço + rota no app 👗 do celular e no GPS.
import * as THREE from 'three';
import { addBox, HOOKS, roadAt, districtName, surfaceY } from './world.js';
import { canvasTex } from './util.js';
import { makeModel, AVATARS } from './avatar.js';
import { ITEMS, SLOTS, SUITS, ALLOYS, PERKS, FAB, itemsFor, suitsFor, isHero, sexOf, npcLook } from './wardrobe.js';
const $ = (id) => document.getElementById(id);

// ---- tema (o Neon Distrito troca só este bloco)
export const LOJAS = {
  x0: 265, x1: 289, H: 8.5, money: '$', title: 'Lojas da Orla',
  shops: [
    { id: 'roupas', name: 'Boutique Brisa', short: 'BOUTIQUE BRISA', sub: 'MODA RESORT · SEDA · LINHO', icon: '👗', handle: '@boutique.brisa', z0: 162, z1: 222, door: 192,
      wall: 0xfdf6ef, facade: 0xf9d9e4, trim: 0xff7fa8, neon: '#ff7fa8', neon2: '#ffd166', floor: ['#ead8bd', '#e2ccab'], light: 0xfff2e2 },
    { id: 'trajes', name: 'Arsenal Aurora', short: 'ARSENAL AURORA', sub: 'TRAJES DE HERÓI · LIGAS RARAS', icon: '🦾', handle: '@arsenal.aurora', z0: 228, z1: 288, door: 258,
      wall: 0xe9eef6, facade: 0xc9e6f2, trim: 0x29f0ff, neon: '#29f0ff', neon2: '#b36bff', floor: ['#30364a', '#283044'], light: 0xdff4ff },
  ],
};
const REACT = ['✨ Arrasou!', '😍 Que elegância!', '🌴 Look aprovado em Miami!', '🔥 Isso é estilo!', '💃 Passarela da orla!', '📸 Foto pro feed já!', '👏 Combinou demais!', '🌅 Pronto pro pôr do sol!'];
const REACT_SUIT = ['⚡ Poder máximo!', '🦾 Liga rara brilhando!', '🛡️ Pronto pra proteger a orla!', '🚀 Que traje incrível!', '✨ O brilho tá no ponto!'];
const POSES = [['wave', '👋', 'Acenar'], ['spin', '💃', 'Girar'], ['clap', '👏', 'Comemorar'], ['jump', '🤸', 'Pular'], ['photo', '📸', 'Foto']];

export class Boutique {
  constructor(G) {
    this.G = G; const L = LOJAS; this.shops = L.shops.map(s => Object.assign({ cx: (L.x0 + L.x1) / 2, cz: (s.z0 + s.z1) / 2, inside: false, visits: 0 }, s));
    this.cur = null; this.panel = null; this.mirror = null; this.poseT = 0; this.tab = 'top';
    for (const s of this.shops) this.build(s);
    this.colliders(); this.ui();
    HOOKS.map.push((g, X, Z) => { const k = X(1) - X(0); for (const s of this.shops) { g.fillStyle = s.id === 'roupas' ? '#f7b6cc' : '#4a5c7a'; g.fillRect(X(L.x0), Z(s.z0), (L.x1 - L.x0) * k, (s.z1 - s.z0) * k); g.strokeStyle = s.neon; g.lineWidth = 2; g.strokeRect(X(L.x0), Z(s.z0), (L.x1 - L.x0) * k, (s.z1 - s.z0) * k);
      g.font = '14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#fff'; g.fillText(s.icon, X(s.cx), Z(s.cz)); } });
  }
  doorOut(s) { return { x: LOJAS.x1 + 3, z: s.door }; }
  address(s) { const r = roadAt(LOJAS.x1 + 10, s.door); const st = r && r.seg && r.seg.line && r.seg.line.name || 'Ocean Drive'; return `${st}, nº ${Math.round(Math.abs(s.door) * 4)} · ${districtName(s.cx, s.cz) || 'Orla'}`; }
  inShop(s, x, z, m = 0) { return x > LOJAS.x0 - m && x < LOJAS.x1 + m && z > s.z0 - m && z < s.z1 + m; }
  // ---------------------------------------------------------------- prédios
  build(s) {
    const G = this.G, L = LOJAS, g = new THREE.Group(); s.g = g; G.scene.add(g); const y0 = surfaceY(s.cx, s.cz) - 0.02; s.y0 = y0;
    const W = L.x1 - L.x0, D = s.z1 - s.z0, H = L.H, t = 0.5, dw = 8, dh = 5.2, dz0 = s.door - dw / 2, dz1 = s.door + dw / 2, hero = s.id === 'trajes';
    const wallM = new THREE.MeshStandardMaterial({ color: s.wall, roughness: 0.75 }), facM = new THREE.MeshStandardMaterial({ color: s.facade, roughness: 0.7 });
    const glowM = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: new THREE.Color(s.trim), emissiveIntensity: 1.3, toneMapped: false }); s.glowM = glowM;
    const box = (x0, z0, x1, z1, ya, yb, m, par = g) => { const b = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, yb - ya, z1 - z0), m); b.position.set((x0 + x1) / 2, y0 + (ya + yb) / 2, (z0 + z1) / 2); par.add(b); return b; };
    // piso: tábuas claras (boutique) ou placas metálicas com linhas de luz (arsenal)
    const fl = canvasTex(512, 1024, (c, w, h) => { c.fillStyle = s.floor[0]; c.fillRect(0, 0, w, h);
      if (!hero) { for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? s.floor[1] : s.floor[0]; const off = (i * 37) % 90; for (let y = -off; y < h; y += 90) { c.fillRect(i * w / 24, y, w / 24 - 1, 88); } } c.fillStyle = 'rgba(255,127,168,.18)'; c.beginPath(); c.ellipse(w / 2, h / 2, w * 0.3, h * 0.16, 0, 0, 7); c.fill(); }
      else { c.strokeStyle = s.floor[1]; c.lineWidth = 3; for (let x = 0; x < w; x += 64) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke(); } for (let y = 0; y < h; y += 64) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); } c.strokeStyle = 'rgba(41,240,255,.55)'; c.lineWidth = 5; c.strokeRect(w * 0.18, h * 0.08, w * 0.64, h * 0.84); }
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 2 * t, D - 2 * t).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ map: fl, roughness: hero ? 0.35 : 0.55, metalness: hero ? 0.5 : 0.05 })); floor.position.set(s.cx, y0 + 0.2, s.cz); floor.receiveShadow = true; g.add(floor);
    // paredes (porta grande de vidro na frente leste, de frente para a praia)
    box(L.x0, s.z0, L.x1, s.z0 + t, 0, H, wallM); box(L.x0, s.z1 - t, L.x1, s.z1, 0, H, wallM); box(L.x0, s.z0, L.x0 + t, s.z1, 0, H, wallM);
    box(L.x1 - t, s.z0, L.x1, dz0, 0, H, facM); box(L.x1 - t, dz1, L.x1, s.z1, 0, H, facM); box(L.x1 - t, dz0, L.x1, dz1, dh, H, facM);
    // vitrines dos lados da porta + faixas art déco
    const glass = new THREE.MeshStandardMaterial({ color: 0xbfe9ff, roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.32, depthWrite: false });
    for (const [a, b] of [[s.z0 + 4, dz0 - 2], [dz1 + 2, s.z1 - 4]]) { box(L.x1 + 0.01, a, L.x1 + 0.06, b, 0.6, 4.2, glass); box(L.x1, a - 0.15, L.x1 + 0.12, b + 0.15, 4.2, 4.4, glowM); }
    for (const y of [5.9, 6.6]) box(L.x1, s.z0, L.x1 + 0.25, s.z1, y, y + 0.18, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6 }));
    box(L.x1 - 0.2, s.z0 - 0.2, L.x1 + 0.4, s.z1 + 0.2, H, H + 0.9, new THREE.MeshStandardMaterial({ color: s.trim, roughness: 0.5 }));
    // moldura de luz e folhas de vidro deslizantes da porta
    box(L.x1, dz0 - 0.35, L.x1 + 0.15, dz0, 0, dh + 0.35, glowM); box(L.x1, dz1, L.x1 + 0.15, dz1 + 0.35, 0, dh + 0.35, glowM); box(L.x1, dz0 - 0.35, L.x1 + 0.15, dz1 + 0.35, dh, dh + 0.35, glowM);
    s.leaves = [-1, 1].map(sd => { const lf = box(L.x1 - 0.3, s.door + (sd < 0 ? -dw / 2 : 0), L.x1 - 0.22, s.door + (sd < 0 ? 0 : dw / 2), 0.2, dh, glass); lf.userData.z0 = lf.position.z; lf.userData.sd = sd; return lf; });
    // toldo e letreiro
    const awn = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.18, dw + 4), new THREE.MeshStandardMaterial({ color: hero ? 0x1d2433 : 0xffffff, roughness: 0.6 })); awn.position.set(L.x1 + 1.3, y0 + dh + 0.6, s.door); awn.rotation.z = -0.12; g.add(awn);
    const sign = canvasTex(1024, 220, (c, w, h) => { c.fillStyle = hero ? '#0d1220' : '#fff8f2'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 22; c.shadowColor = s.neon; c.fillStyle = hero ? '#fff' : '#d23c74'; c.font = 'bold 96px sans-serif'; c.fillText(`${s.icon} ${s.short}`, w / 2, h * 0.42, w - 40); c.shadowColor = s.neon2; c.fillStyle = hero ? s.neon2 : '#1f8f8a'; c.font = 'bold 36px sans-serif'; c.fillText(s.sub, w / 2, h * 0.82, w - 40); }, { clamp: true });
    const sg = new THREE.Mesh(new THREE.PlaneGeometry(14, 3), new THREE.MeshBasicMaterial({ map: sign, toneMapped: false })); sg.position.set(L.x1 + 0.3, y0 + H - 1.2, s.door); sg.rotation.y = Math.PI / 2; g.add(sg);
    // teto (some quando você está dentro) e luminárias
    const roof = new THREE.Group(); g.add(roof); s.roof = roof; box(L.x0 - 0.2, s.z0 - 0.2, L.x1 + 0.2, s.z1 + 0.2, H, H + 0.3, new THREE.MeshStandardMaterial({ color: 0xd9d4cc, roughness: 0.85 }), roof);
    const lampM = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: s.light, emissiveIntensity: 1.6, toneMapped: false }); const lampG = new THREE.CylinderGeometry(0.55, 0.55, 0.12, 20);
    const inner = new THREE.Group(); g.add(inner); s.inner = inner;
    for (let k = 0; k < 5; k++) for (const x of [271, 283]) { const m = new THREE.Mesh(lampG, lampM); m.position.set(x, y0 + H - 1.4, s.z0 + 8 + k * (D - 16) / 4); inner.add(m); const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.3, 4), new THREE.MeshBasicMaterial({ color: 0x333333 })); cord.position.set(x, y0 + H - 0.7, m.position.z); inner.add(cord); }
    s.lights = [new THREE.PointLight(s.light, 40, 34, 1.6), new THREE.PointLight(s.light, 40, 34, 1.6)]; s.lights[0].position.set(s.cx, y0 + H - 2, s.z0 + D * 0.28); s.lights[1].position.set(s.cx, y0 + H - 2, s.z0 + D * 0.72);
    for (const l of s.lights) { l.visible = false; g.add(l); }
    s.boxes = [];
    if (hero) this.buildArsenal(s, box, y0); else this.buildBoutique(s, box, y0);
    // espelho grande na parede oeste (moldura dourada / holográfica)
    const mz = s.cz; s.mirrorAt = { x: L.x0 + 5.2, z: mz };
    const frame = new THREE.MeshStandardMaterial({ color: hero ? 0x29f0ff : 0xd9b45a, metalness: 0.8, roughness: 0.25, emissive: hero ? 0x29f0ff : 0x000000, emissiveIntensity: hero ? 0.8 : 0 });
    box(L.x0 + t, mz - 1.5, L.x0 + t + 0.12, mz + 1.5, 0.3, 3.9, frame);
    const mirM = new THREE.MeshStandardMaterial({ color: 0xdfe8ee, metalness: 1, roughness: 0.04, envMapIntensity: 2 }); box(L.x0 + t + 0.12, mz - 1.3, L.x0 + t + 0.16, mz + 1.3, 0.5, 3.7, mirM);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.75, 0.9, 32).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: hero ? 0x29f0ff : 0xff7fa8, transparent: true, opacity: 0.75, toneMapped: false })); ring.position.set(s.mirrorAt.x, y0 + 0.23, mz); g.add(ring); s.ring = ring;
  }
  buildBoutique(s, box, y0) {
    const L = LOJAS, g = s.inner; const chrome = new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 0.9, roughness: 0.2 }), wood = new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.6 }), white = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.5 });
    // araras com roupas penduradas (cores do catálogo), instanciadas
    const its = Object.values(ITEMS).filter(i => i.slot === 'top' || i.slot === 'bottom'); const racks = [[273.5, s.z0 + 9], [280.5, s.z0 + 9], [273.5, s.z0 + 21], [273.5, s.z1 - 9], [280.5, s.z1 - 9], [273.5, s.z1 - 21]];
    const gar = new THREE.InstancedMesh(new THREE.BoxGeometry(0.5, 0.9, 0.06), new THREE.MeshStandardMaterial({ roughness: 0.7 }), racks.length * 12); let n = 0; const m4 = new THREE.Matrix4(), col = new THREE.Color(), q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2);
    for (const [x, z] of racks) {
      box(x - 0.03, z - 2.6, x + 0.03, z + 2.6, 1.55, 1.6, chrome); for (const e of [-2.6, 2.6]) box(x - 0.03, z + e - 0.03, x + 0.03, z + e + 0.03, 0.2, 1.6, chrome); box(x - 0.35, z - 2.7, x + 0.35, z + 2.7, 0.2, 0.26, chrome);
      for (let k = 0; k < 12; k++) { const it = its[(n * 7) % its.length]; const it2 = it.kind === 'vestido' ? 1.25 : 0.9; m4.compose(new THREE.Vector3(x, y0 + 1.5 - it2 / 2, z - 2.3 + k * 0.42), q, new THREE.Vector3(1, it2 / 0.9, 1)); gar.setMatrixAt(n, m4); gar.setColorAt(n, col.setHex(it.c)); n++; }
      s.boxes.push([x - 0.4, z - 2.75, x + 0.4, z + 2.75]);
    }
    gar.count = n; g.add(gar);
    // mesas com peças dobradas, prateleira de sapatos, cabideiro de chapéus, balcão de óculos e caixa
    for (const [x, z] of [[281, s.cz - 4], [281, s.cz + 4]]) { box(x - 1, z - 1.6, x + 1, z + 1.6, 0.2, 1.0, wood); for (let k = 0; k < 6; k++) { const it = its[(k * 5 + (z | 0)) % its.length]; box(x - 0.7 + (k % 2) * 0.8, z - 1.2 + (k >> 1) * 0.9, x - 0.1 + (k % 2) * 0.8, z - 0.6 + (k >> 1) * 0.9, 1.0, 1.12, new THREE.MeshStandardMaterial({ color: it.c, roughness: 0.8 })); } s.boxes.push([x - 1.05, z - 1.65, x + 1.05, z + 1.65]); }
    const shoes = Object.values(ITEMS).filter(i => i.slot === 'shoes');
    box(L.x0 + 0.5, s.z0 + 0.5, L.x0 + 9, s.z0 + 1.1, 0.2, 3.2, white); s.boxes.push([L.x0 + 0.5, s.z0 + 0.5, L.x0 + 9, s.z0 + 1.3]); for (let r = 0; r < 4; r++) for (let k = 0; k < 8; k++) { const it = shoes[(r * 8 + k) % shoes.length]; box(L.x0 + 1 + k, s.z0 + 0.7, L.x0 + 1.5 + k, s.z0 + 1.0, 0.5 + r * 0.7, 0.62 + r * 0.7, new THREE.MeshStandardMaterial({ color: it.c, roughness: FAB[it.f].r, metalness: FAB[it.f].m })); }
    const hats = Object.values(ITEMS).filter(i => i.slot === 'hat');
    for (let k = 0; k < 4; k++) { const x = L.x0 + 11 + k * 2.2, z = s.z0 + 1.5; box(x - 0.04, z - 0.04, x + 0.04, z + 0.04, 0.2, 1.7, chrome); const h = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.03, 18), new THREE.MeshStandardMaterial({ color: hats[k].c, roughness: 0.9 })); h.position.set(x, y0 + 1.72, z); g.add(h); const c = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.14, 14), h.material); c.position.set(x, y0 + 1.8, z); g.add(c); }
    box(L.x0 + 0.5, s.z1 - 4, L.x0 + 6, s.z1 - 2.6, 0.2, 1.1, white); box(L.x0 + 0.5, s.z1 - 4, L.x0 + 6, s.z1 - 2.6, 1.1, 1.16, new THREE.MeshStandardMaterial({ color: 0xff7fa8, roughness: 0.4 })); s.boxes.push([L.x0 + 0.5, s.z1 - 4.05, L.x0 + 6.05, s.z1 - 2.55]);
    const gl = Object.values(ITEMS).filter(i => i.slot === 'glasses'); for (let k = 0; k < 8; k++) box(L.x0 + 0.9 + k * 0.6, s.z1 - 3.5, L.x0 + 1.3 + k * 0.6, s.z1 - 3.4, 1.18, 1.24, new THREE.MeshStandardMaterial({ color: gl[k % gl.length].c, metalness: 0.5, roughness: 0.3 }));
    // tapete redondo, plantas, sofá de espera e letreiro neon interno
    const rug = new THREE.Mesh(new THREE.CircleGeometry(2.4, 32).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf7c6d9, roughness: 0.95 })); rug.position.set(s.mirrorAt ? s.mirrorAt.x : L.x0 + 3.2, y0 + 0.215, s.cz); rug.position.x = L.x0 + 5.2; g.add(rug);
    for (const [x, z] of [[L.x0 + 1.3, s.z0 + 3], [L.x1 - 1.6, s.z0 + 1.6], [L.x1 - 1.6, s.z1 - 1.6], [L.x0 + 1.3, s.cz - 3.2], [L.x0 + 1.3, s.cz + 3.2]]) this.plant(g, x, y0, z);
    box(L.x0 + 0.6, s.cz + 6, L.x0 + 1.6, s.cz + 9, 0.2, 0.75, new THREE.MeshStandardMaterial({ color: 0x2ab3b8, roughness: 0.8 })); s.boxes.push([L.x0 + 0.5, s.cz + 5.9, L.x0 + 1.7, s.cz + 9.1]);
    const ns = canvasTex(512, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 18; c.shadowColor = '#ff7fa8'; c.fillStyle = '#ffe1ec'; c.font = 'italic bold 78px serif'; c.fillText('brisa', w / 2, h / 2); }, { clamp: true });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: ns, transparent: true, toneMapped: false, depthWrite: false })); nm.position.set(L.x0 + 0.62, y0 + 5.4, s.cz); nm.rotation.y = Math.PI / 2; g.add(nm);
    // manequins (feitos na hora em que você chega perto)
    s.manq = [[L.x1 - 2.2, s.door - 6, 'ela', 1], [L.x1 - 2.2, s.door - 8.2, 'ele', 2], [L.x1 - 2.2, s.door + 6, 'ela', 3], [L.x1 - 2.2, s.door + 8.2, 'ele', 4]];
  }
  buildArsenal(s, box, y0) {
    const L = LOJAS, g = s.inner; const steel = new THREE.MeshStandardMaterial({ color: 0x9aa4b4, metalness: 0.9, roughness: 0.25 }), dark = new THREE.MeshStandardMaterial({ color: 0x1b2130, metalness: 0.6, roughness: 0.35 });
    const glass = new THREE.MeshStandardMaterial({ color: 0xbff6ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide });
    const heroes = Object.keys(AVATARS).filter(isHero); s.manq = []; s.pods = [];
    heroes.forEach((h, i) => { const x = i < 3 ? 273 : 281, z = s.z0 + 12 + (i % 3) * 18;
      const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.25, 0.35, 28), dark); base.position.set(x, y0 + 0.37, z); g.add(base);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.04, 8, 40).rotateX(Math.PI / 2), s.glowM); rim.position.set(x, y0 + 0.56, z); g.add(rim);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 3.4, 28, 1, true), glass); tube.position.set(x, y0 + 2.25, z); g.add(tube);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.15, 0.25, 28), steel); cap.position.set(x, y0 + 4.05, z); g.add(cap);
      s.boxes.push([x - 1.25, z - 1.25, x + 1.25, z + 1.25]); const suit = suitsFor(h)[1]; s.manq.push([x, z, h, i, suit ? suit.id : 'classico']); s.pods.push(rim);
    });
    // bancada de forja com hologramas das ligas, faixas de luz e scanner
    box(L.x0 + 0.5, s.z1 - 4.2, L.x0 + 7, s.z1 - 2.6, 0.2, 1.1, dark); s.boxes.push([L.x0 + 0.45, s.z1 - 4.25, L.x0 + 7.05, s.z1 - 2.55]);
    Object.values(ALLOYS).forEach((A, k) => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), new THREE.MeshStandardMaterial({ color: A.c, metalness: A.m, roughness: A.r, emissive: A.c, emissiveIntensity: 0.25 })); m.position.set(L.x0 + 1 + k * 0.85, y0 + 1.45, s.z1 - 3.4); g.add(m); (s.gems = s.gems || []).push(m); });
    for (const x of [L.x0 + 0.6, L.x1 - 0.6]) box(x - 0.05, s.z0 + 1, x + 0.05, s.z1 - 1, 2.6, 2.75, s.glowM);
    box(L.x0 + 0.5, s.z0 + 1, L.x1 - 0.5, s.z0 + 1.1, 2.6, 2.75, s.glowM);
    const ns = canvasTex(512, 128, (c, w, h) => { c.clearRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowBlur = 18; c.shadowColor = '#29f0ff'; c.fillStyle = '#dfffff'; c.font = 'bold 64px sans-serif'; c.fillText('AURORA', w / 2, h / 2); }, { clamp: true });
    const nm = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: ns, transparent: true, toneMapped: false, depthWrite: false })); nm.position.set(L.x0 + 0.62, y0 + 5.4, s.cz); nm.rotation.y = Math.PI / 2; g.add(nm);
    for (const [x, z] of [[L.x1 - 1.6, s.z0 + 1.6], [L.x1 - 1.6, s.z1 - 1.6]]) this.plant(g, x, y0, z);
  }
  plant(g, x, y0, z) { const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.28, 0.6, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.4 })); pot.position.set(x, y0 + 0.5, z); g.add(pot);
    const lf = new THREE.MeshStandardMaterial({ color: 0x3f9a4a, roughness: 0.8, side: THREE.DoubleSide }); for (let k = 0; k < 7; k++) { const l = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 1.1), lf); l.position.set(x, y0 + 1.25, z); l.rotation.set(0.5, k * 0.9, 0); l.translateY(0.3); g.add(l); } }
  colliders() { const L = LOJAS, t = 0.5, H = L.H + 0.4;
    for (const s of this.shops) { const dz0 = s.door - 4, dz1 = s.door + 4;
      addBox(L.x0, s.z0, L.x1, s.z0 + t, H); addBox(L.x0, s.z1 - t, L.x1, s.z1, H); addBox(L.x0, s.z0, L.x0 + t, s.z1, H); addBox(L.x1 - t, s.z0, L.x1, dz0, H); addBox(L.x1 - t, dz1, L.x1, s.z1, H);
      for (const b of s.boxes) addBox(b[0], b[1], b[2], b[3], 2.2); }
  }
  // manequins/vitrines com modelos de verdade (só quando você está perto)
  async spawnManq(s) {
    if (s.manqDone) return; s.manqDone = true; const G = this.G;
    for (const m of s.manq) {
      try {
        const look = s.id === 'trajes' ? { mode: 'suit', suit: m[4] } : npcLook(m[2], m[3] * 13 + 5);
        const R = await makeModel(m[2], s.id === 'trajes' ? null : { Skin: 0xf3f0ea, Hair: 0xf3f0ea, HairBase: 0xf3f0ea, Eyes: 0xf3f0ea }, null, false, look);
        R.model.position.set(m[0], s.y0 + (s.id === 'trajes' ? 0.55 : 0.2), m[1]); R.model.rotation.y = s.id === 'trajes' ? (m[0] < 277 ? Math.PI / 2 : -Math.PI / 2) : Math.PI / 2;
        if (R.acts.Idle) { R.acts.Idle.play(); R.mixer.update(0.4); } s.inner.add(R.model); (s.rigs = s.rigs || []).push(R);
      } catch (e) { /* sem modelo: fica a vitrine */ }
    }
  }
  // ---------------------------------------------------------------- interface
  ui() {
    const card = document.createElement('div'); card.id = 'lojaCard'; card.hidden = true; ($('hud') || document.body).appendChild(card); this.card = card;
    card.addEventListener('pointerdown', e => e.stopPropagation());
    card.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); if (b.dataset.k === 'open') this.open(); else if (b.dataset.k === 'mirror') this.open(true); });
    const P = document.createElement('div'); P.id = 'lojaPanel'; P.hidden = true; document.body.appendChild(P); this.panel = P;
    for (const ev of ['pointerdown', 'touchstart', 'wheel', 'keydown']) P.addEventListener(ev, e => e.stopPropagation(), { passive: true });
    P.addEventListener('click', e => this.click(e));
    const R = document.createElement('div'); R.id = 'lojaReact'; R.hidden = true; document.body.appendChild(R); this.react = R;
  }
  shopAt(x, z, m = 0) { return this.shops.find(s => this.inShop(s, x, z, m)) || null; }
  act() { const p = this.G.player; if (p.vehicle || this.isOpen) return false; const s = this.shopAt(p.x, p.z, -0.6); if (!s) return false; this.open(); return true; }
  get isOpen() { return !this.panel.hidden; }
  open(mirror) {
    const G = this.G, p = G.player; const s = this.shopAt(p.x, p.z, 0.5) || this.cur; if (!s) return; this.cur = s; this.tab = s.id === 'trajes' ? 'suit' : (this.tab === 'suit' ? 'top' : this.tab);
    // vai até o espelho e vira de frente para ele
    p.x = s.mirrorAt.x; p.z = s.mirrorAt.z; p.vx = p.vz = 0; p.h = -Math.PI / 2; G.mirrorLock = true;
    this.mirror = { s, h: p.h, t: 0 }; this.panel.hidden = false; document.body.classList.add('lojaOpen'); this.render(); G.audio.chime && G.audio.chime('coin');
    if (mirror) this.reactNow();
  }
  close() { const G = this.G; this.panel.hidden = true; this.react.hidden = true; document.body.classList.remove('lojaOpen'); this.mirror = null; G.mirrorLock = false; G.posing = null; G.snapCam && G.snapCam(); }
  charId() { return this.G.hero ? this.G.hero.id : 'ela'; }
  render() {
    const G = this.G, s = this.cur, id = this.charId(), A = AVATARS[id], W = G.wardrobe; const money = G.save.money.toLocaleString('pt-BR'); const hero = s.id === 'trajes';
    let tabs = '', list = '';
    if (!hero) {
      tabs = SLOTS.map(([k, e, n]) => `<button class="lojaTab${this.tab === k ? ' on' : ''}" data-tab="${k}" title="${n}">${e}<small>${n.split(' ')[0]}</small></button>`).join('');
      const its = itemsFor(id).filter(i => i.slot === this.tab);
      list = its.map(it => this.itemHtml(id, it, `<i class="sw" style="background:#${it.c.toString(16).padStart(6, '0')}"></i>`, `${FAB[it.f].n}${it.kind === 'vestido' ? ' · vestido' : it.kind === 'saia' ? ' · saia' : ''}`)).join('');
    } else {
      const S = suitsFor(id); const L = W.look(id);
      tabs = `<button class="lojaTab${L.mode === 'civil' ? ' on' : ''}" data-mode="civil">👔<small>Roupa civil</small></button><button class="lojaTab${L.mode === 'suit' ? ' on' : ''}" data-mode="suit">🦸<small>Traje</small></button>`;
      list = S.map(st => { const A2 = ALLOYS[st.alloy]; const pk = st.perk ? PERKS[st.perk] : null; const c = A2 ? A2.c : (A.colors && A.colors.Shirt) || 0x888888;
        return this.itemHtml(id, st, `<i class="sw suit" style="background:linear-gradient(135deg,#${c.toString(16).padStart(6, '0')},#${(st.glow || 0xffffff).toString(16).padStart(6, '0')})"></i>`, st.id === 'classico' ? 'o traje original do herói' : `${A2.n}${pk ? ` · ${pk.e} ${pk.n}: ${pk.d}` : ''}`); }).join('');
      if (!S.length) list = '<p class="small">Nenhum traje para este personagem.</p>';
    }
    const who = A.hero ? `${A.emoji} ${A.label}` : `${sexOf(id) === 'f' ? '👩🏾' : '🧑🏽'} ${A.name || A.label}`;
    this.panel.innerHTML = `<div class="lojaHead"><b>${s.icon} ${s.name}</b><button class="lojaX" data-k="close" aria-label="Fechar">✕</button></div>
      <div class="lojaSub">${who} · <span class="lojaMoney">${LOJAS.money}${money}</span> <small>(dinheiro das corridas)</small></div>
      <div class="lojaTabs">${tabs}</div><div class="lojaList">${list}</div>
      <div class="lojaPoses">${POSES.map(([k, e, n]) => `<button data-pose="${k}" title="${n}">${e}<small>${n}</small></button>`).join('')}</div>
      <p class="small lojaNote">Fica salvo para <b>${A.name || A.label}</b> neste aparelho. Toque numa peça que você já tem para vestir${hero ? '' : ' (chapéu, óculos e bolsa: toque de novo para tirar)'}.</p>`;
  }
  itemHtml(id, it, sw, desc) {
    const W = this.G.wardrobe, own = W.owns(id, it.id), on = W.equipped(id, it), can = this.G.save.money >= it.p;
    const btn = on ? `<button class="lojaBtn on" data-eq="${it.id}">✔ Vestido</button>` : own ? `<button class="lojaBtn" data-eq="${it.id}">Vestir</button>` : `<button class="lojaBtn buy${can ? '' : ' off'}" data-buy="${it.id}">💳 ${LOJAS.money}${it.p.toLocaleString('pt-BR')}</button>`;
    return `<div class="lojaItem${on ? ' on' : ''}">${sw}<div class="lojaTxt"><b>${it.n}</b><small>${desc}</small></div>${btn}</div>`;
  }
  click(e) {
    const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); const G = this.G, id = this.charId(), W = G.wardrobe; const d = b.dataset;
    if (d.k === 'close') return this.close();
    if (d.tab) { this.tab = d.tab; return this.render(); }
    if (d.mode) { if (d.mode === 'suit' && !W.rec(id).suit && !isHero(id)) { G.ui.toast('🦸 Compre um traje primeiro', 1800); return; } W.setMode(id, d.mode); this.render(); return this.reactNow(); }
    if (d.buy) { if (W.buy(id, d.buy)) { this.render(); this.reactNow(true); G.feed && G.feed.unshift([this.cur.handle, `Look novo saindo da loja: ${(ITEMS[d.buy] || SUITS[d.buy]).n} ✨`, 'agora']); } else this.render(); return; }
    if (d.eq) { W.equip(id, d.eq); this.render(); return this.reactNow(); }
    if (d.pose) return this.pose(d.pose);
  }
  pose(k) {
    const G = this.G, p = G.player; this.poseT = k === 'spin' ? 1.3 : 2.4; this.poseK = k;
    if (k === 'jump') { if (p.grounded) { p.vy = 5.5; p.grounded = false; } G.posing = null; }
    else if (k === 'photo') { G.posing = 'wave'; if (G.ui.flash) G.ui.flash(); G.audio.chime && G.audio.chime('coin'); G.feed && G.feed.unshift(['@' + (AVATARS[this.charId()].name || 'eu').toLowerCase(), `Selfie no espelho da ${this.cur.name} 🪞✨`, 'agora']); }
    else G.posing = k === 'spin' ? null : k;
    this.reactNow();
  }
  reactNow(big) {
    const suit = this.G.wardrobe.look(this.charId()).mode === 'suit'; const L = suit ? REACT_SUIT : REACT; const txt = L[Math.floor(Math.random() * L.length)];
    const R = this.react; R.innerHTML = `<span>${txt}</span><i>${big ? '💖✨💖' : suit ? '⚡✨' : '💖✨'}</i>`; R.hidden = false; R.classList.remove('pop'); void R.offsetWidth; R.classList.add('pop'); this.reactT = 2.6;
  }
  // câmera do espelho: de frente para o personagem (como o reflexo), um pouco de lado para o painel não cobrir
  cam(camera, dt) {
    const M = this.mirror; if (!M) return false; const G = this.G, p = G.player; const fx = Math.sin(M.h), fz = Math.cos(M.h);
    const land = innerWidth > innerHeight, side = land ? 0.75 : 0; const rx = -fz, rz = fx; // direita do personagem
    const H = (G.hero.def && G.hero.def.height) || 1.7; const dist = land ? 3.3 : 3.9;
    const cx = p.x + fx * dist - rx * side, cz = p.z + fz * dist - rz * side;
    camera.position.set(cx, p.y + H * 0.62, cz); camera.lookAt(p.x - rx * side, p.y + H * (land ? 0.55 : 0.42), p.z - rz * side); return true;
  }
  phoneHtml() {
    const G = this.G, id = this.charId(), W = G.wardrobe, r = W.rec(id);
    return `<h3>👗 ${LOJAS.title}</h3><p class="small">Duas lojas lado a lado na orla, de frente para a praia. Entre a pé pela porta grande, compre com o dinheiro das corridas e vista na hora. Tudo fica salvo por personagem.</p>
      <div class="list">${this.shops.map(s => `<button data-a="go" data-x="${this.doorOut(s).x}" data-z="${s.door}">${s.icon} ${s.name}<span>GPS ›</span></button><div class="row"><small>${this.address(s)}</small></div>`).join('')}
      <div class="row">Peças compradas (${AVATARS[id].name || AVATARS[id].label})<b>${r.own.length}</b></div><div class="row">Seu dinheiro<b>${LOJAS.money}${G.save.money.toLocaleString('pt-BR')}</b></div></div>`;
  }
  gpsLinks() { return this.shops.map(s => `<button data-a="go" data-x="${this.doorOut(s).x}" data-z="${s.door}">${s.icon} ${s.name} (loja na orla)<span>GPS ›</span></button>`).join(''); }
  // ---------------------------------------------------------------- quadro a quadro
  update(dt, t, camera, night = 0) {
    const G = this.G, p = G.player, pv = p.vehicle, px = pv ? pv.x : p.x, pz = pv ? pv.z : p.z;
    let here = null;
    for (const s of this.shops) {
      const dc = Math.hypot(camera.position.x - s.cx, camera.position.z - s.cz); s.g.visible = dc < 700; if (!s.g.visible) continue;
      const inside = !pv && (this.inShop(s, px, pz, 0.2) || this.inShop(s, camera.position.x, camera.position.z, 0.1));
      s.roof.visible = !inside; s.inner.visible = dc < 140; for (const l of s.lights) l.visible = inside;
      s.glowM.emissiveIntensity = 0.9 + night * 1.4;
      if (dc < 90) this.spawnManq(s);
      // porta automática
      const near = Math.hypot(px - LOJAS.x1, pz - s.door) < 6.5 && !pv; s.open = THREE.MathUtils.lerp(s.open || 0, near ? 1 : 0, Math.min(1, dt * 5));
      for (const lf of s.leaves) lf.position.z = lf.userData.z0 + lf.userData.sd * s.open * 3.8;
      if (s.ring) s.ring.material.opacity = 0.45 + Math.sin(t * 3) * 0.3;
      if (s.gems) s.gems.forEach((m, k) => { m.rotation.y = t + k; m.position.y = s.y0 + 1.45 + Math.sin(t * 2 + k) * 0.06; });
      if (s.pods) s.pods.forEach((m, k) => { m.scale.setScalar(1 + Math.sin(t * 2.5 + k) * 0.02); });
      if (inside && !s.inside) { s.visits++; if (!s.welcT || t - s.welcT > 90) { s.welcT = t; G.ui.toast(`${s.icon} <b>${s.name}</b> · ${s.id === 'trajes' ? 'trajes de herói com poderes' : 'moda resort: seda, linho, chapéus, óculos e bolsas'} · aperte ${G.touch ? '🛍️' : 'E'} para abrir o catálogo e o espelho`, 3000); } }
      s.inside = inside; if (inside) here = s;
    }
    this.here = here;
    // cartão "abrir catálogo" dentro da loja
    const show = here && !this.isOpen && !G.paused; if (this.card.hidden === !!show) { this.card.hidden = !show; }
    if (show && this.card._s !== here.id) { this.card._s = here.id; this.card.innerHTML = `<b>${here.icon} ${here.name}</b><div class="stAsk"><button data-k="open" class="hot">🛍️ Catálogo</button><button data-k="mirror">🪞 Espelho</button></div>`; }
    if (this.isOpen) {
      if (pv || !this.cur || !this.inShop(this.cur, p.x, p.z, 1)) this.close();
      else { p.vx = p.vz = 0; if (this.poseT > 0) { this.poseT -= dt; if (this.poseK === 'spin') p.h += dt * (Math.PI * 2 / 1.3); if (this.poseT <= 0) { G.posing = null; if (this.poseK === 'spin') p.h = this.mirror.h; } } }
    }
    if (this.reactT > 0) { this.reactT -= dt; if (this.reactT <= 0) this.react.hidden = true; }
  }
}
