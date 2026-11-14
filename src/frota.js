// Frota de luxo (t391): 3 lanchas de luxo (tamanhos e motores diferentes), 1 iate e 3 jet skis — todos pilotáveis,
// navegam no mar, na baía e nos canais com a física de barco (flutuam nas ondas, deslizam na borda, nunca voam).
import * as THREE from 'three';
import { Vehicle } from './vehicles.js';
import { boatable, collide, WATER_Y, HOOKS } from './world.js';

// ---- THEME (Neon Distrito troca este bloco)
const THEME = {
  marina: 'Marina Brisa Dourada', neon: false,
  boats: [
    { id: 'brisa', kind: 'lux', name: 'Lancha Brisa 28', len: 8.4, w: 2.7, max: 40, acc: 9, steer: 0.95, grip: 1.4, cam: 12, col: 0xffffff, acc2: 0x1e90ff, at: [452, -338, Math.PI / 2] },
    { id: 'corsaria', kind: 'lux', name: 'Lancha Corsária 36', len: 11, w: 3.1, max: 46, acc: 10, steer: 0.82, grip: 1.4, cam: 14, col: 0x14202c, acc2: 0xffd23f, at: [478, -345, Math.PI / 2] },
    { id: 'aurora', kind: 'lux', name: 'Lancha Aurora 44', len: 13.4, w: 3.7, max: 38, acc: 7.5, steer: 0.66, grip: 1.3, cam: 16, col: 0xf4efe6, acc2: 0xff4f6d, at: [508, -352, Math.PI / 2] },
    { id: 'horizonte', kind: 'yacht', name: 'Iate Horizonte 80', len: 24, w: 6, max: 22, acc: 3.2, steer: 0.42, grip: 1.2, cam: 28, col: 0xfbfbf7, acc2: 0x1d3557, at: [560, -395, Math.PI / 2] },
    { id: 'faisca', kind: 'jet', name: 'Jet Ski Faísca', len: 3.2, w: 1.2, max: 33, acc: 12, steer: 1.5, grip: 1.7, cam: 7, col: 0xff4f6d, acc2: 0xffffff, at: [445, -262, Math.PI / 2] },
    { id: 'coral', kind: 'jet', name: 'Jet Ski Coral', len: 3.2, w: 1.2, max: 31, acc: 11, steer: 1.6, grip: 1.7, cam: 7, col: 0xff8a3c, acc2: 0x2ab3b8, at: [458, -262, Math.PI / 2] },
    { id: 'turquesa', kind: 'jet', name: 'Jet Ski Turquesa', len: 3.2, w: 1.2, max: 35, acc: 12.5, steer: 1.45, grip: 1.7, cam: 7, col: 0x2ab3b8, acc2: 0xffd23f, at: [471, -262, Math.PI / 2] },
  ],
};
// ---- fim THEME

const geoCache = new Map(); const cg = (k, f) => { let g = geoCache.get(k); if (!g) { g = f(); geoCache.set(k, g); } return g; };
function hullGeo(len, w, h) { // casco em V com proa afinada (extrusão do contorno visto de cima)
  const s = new THREE.Shape(), L = len / 2, W = w / 2;
  s.moveTo(-L, -W * 0.92); s.lineTo(L * 0.35, -W); s.quadraticCurveTo(L * 0.92, -W * 0.7, L, 0); s.quadraticCurveTo(L * 0.92, W * 0.7, L * 0.35, W); s.lineTo(-L, W * 0.92); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelSize: Math.min(0.18, w * 0.05), bevelThickness: 0.1, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); g.translate(0, -h * 0.45, 0); return g;
}
function deckGeo(len, w, y) { const s = new THREE.Shape(), L = len / 2 - 0.15, W = w / 2 - 0.12; s.moveTo(-L, -W); s.lineTo(L * 0.3, -W); s.quadraticCurveTo(L * 0.88, -W * 0.6, L * 0.95, 0); s.quadraticCurveTo(L * 0.88, W * 0.6, L * 0.3, W); s.lineTo(-L, W); s.closePath();
  const g = new THREE.ShapeGeometry(s, 8); g.rotateX(-Math.PI / 2); g.rotateY(-Math.PI / 2); g.translate(0, y, 0); return g; }

export function buildBoatModel(v, d) {
  const body = v.body; const keep = v.tailMesh; while (body.children.length) body.remove(body.children[0]);
  const paint = new THREE.MeshStandardMaterial({ color: d.col, metalness: 0.35, roughness: 0.28 });
  const accent = new THREE.MeshStandardMaterial({ color: d.acc2, metalness: 0.3, roughness: 0.35, emissive: THEME.neon ? d.acc2 : 0x000000, emissiveIntensity: THEME.neon ? 0.6 : 0 });
  const teak = new THREE.MeshStandardMaterial({ color: 0xb98a5a, roughness: 0.75 });
  const glass = new THREE.MeshStandardMaterial({ color: 0x1a2a3a, metalness: 0.6, roughness: 0.1, transparent: true, opacity: 0.75 });
  const white = new THREE.MeshStandardMaterial({ color: 0xf6f6f2, roughness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: 0xd8dde3, metalness: 0.9, roughness: 0.2 });
  const add = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); body.add(o); return o; };
  const L = d.len, W = d.w;
  if (d.kind === 'jet') {
    add(cg('jh', () => hullGeo(L, W, 0.55)), paint);
    add(cg('jst', () => new THREE.BoxGeometry(W * 1.02, 0.12, L * 0.8)), accent, 0, 0.12, -0.1);
    add(cg('jseat', () => new THREE.CapsuleGeometry(0.22, 1.1, 4, 8).rotateX(Math.PI / 2)), new THREE.MeshStandardMaterial({ color: 0x1b1b22, roughness: 0.6 }), 0, 0.5, -0.45);
    add(cg('jcowl', () => new THREE.SphereGeometry(0.42, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1.1, 0.7, 1.6)), paint, 0, 0.32, 0.75);
    add(cg('jbar', () => new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6).rotateZ(Math.PI / 2)), chrome, 0, 0.82, 0.35);
    add(cg('jcol', () => new THREE.CylinderGeometry(0.04, 0.05, 0.4, 6).rotateX(-0.5)), chrome, 0, 0.62, 0.45);
  } else if (d.kind === 'lux') {
    const h = 0.9 + L * 0.04;
    add(cg('lh' + L, () => hullGeo(L, W, h)), paint);
    add(cg('ls' + L, () => new THREE.BoxGeometry(W * 1.01, 0.16, L * 0.72).translate(0, h * 0.25, -L * 0.08)), accent);
    add(cg('ld' + L, () => deckGeo(L, W, h * 0.56)), teak);
    add(cg('lws' + L, () => new THREE.BoxGeometry(W * 0.86, 0.7, 0.06).rotateX(-0.75).translate(0, h * 0.56 + 0.32, L * 0.08)), glass);
    add(cg('lcab' + L, () => new THREE.BoxGeometry(W * 0.84, 0.35, L * 0.22).translate(0, h * 0.56 + 0.17, L * 0.22)), white);
    add(cg('lseat' + L, () => new THREE.BoxGeometry(W * 0.8, 0.45, 0.7).translate(0, h * 0.56 + 0.22, -L * 0.3)), white);
    add(cg('lsun' + L, () => new THREE.BoxGeometry(W * 0.7, 0.18, L * 0.18).translate(0, h * 0.56 + 0.1, -L * 0.12)), accent);
    if (L > 10) { add(cg('lht' + L, () => new THREE.BoxGeometry(W * 0.9, 0.08, L * 0.24).translate(0, h * 0.56 + 1.75, -L * 0.02)), white); for (const sx of [-1, 1]) add(cg('lhp' + L, () => new THREE.CylinderGeometry(0.04, 0.04, 1.5, 6)), chrome, sx * W * 0.42, h * 0.56 + 1.0, -L * 0.1); }
    const nm = L > 12 ? 3 : L > 10 ? 2 : 1; for (let k = 0; k < nm; k++) add(cg('lmot', () => new THREE.BoxGeometry(0.5, 0.95, 0.55)), new THREE.MeshStandardMaterial({ color: 0x23262b, roughness: 0.4 }), (k - (nm - 1) / 2) * 0.62, h * 0.3, -L / 2 - 0.2);
    for (const sx of [-1, 1]) add(cg('lrail' + L, () => new THREE.CylinderGeometry(0.03, 0.03, L * 0.36, 6).rotateX(Math.PI / 2)), chrome, sx * (W / 2 - 0.15), h * 0.56 + 0.45, L * 0.26);
  } else { // iate: casco longo, 2 conveses, janelas em faixa, radar e mastro
    const h = 2.2;
    add(cg('yh', () => hullGeo(L, W, h)), paint);
    add(cg('yband', () => new THREE.BoxGeometry(W * 1.01, 0.5, L * 0.62).translate(0, h * 0.05, -L * 0.04)), new THREE.MeshStandardMaterial({ color: 0x0e1a26, metalness: 0.6, roughness: 0.15 }));
    add(cg('ydeck', () => deckGeo(L, W, h * 0.56)), teak);
    add(cg('ys1', () => new THREE.BoxGeometry(W * 0.82, 1.8, L * 0.48).translate(0, h * 0.56 + 0.9, -L * 0.06)), white);
    add(cg('yw1', () => new THREE.BoxGeometry(W * 0.84, 0.55, L * 0.44).translate(0, h * 0.56 + 1.05, -L * 0.06)), glass);
    add(cg('ys2', () => new THREE.BoxGeometry(W * 0.66, 1.3, L * 0.3).translate(0, h * 0.56 + 2.45, -L * 0.02)), white);
    add(cg('yw2', () => new THREE.BoxGeometry(W * 0.68, 0.45, L * 0.26).translate(0, h * 0.56 + 2.55, -L * 0.02)), glass);
    add(cg('yfly', () => new THREE.BoxGeometry(W * 0.7, 0.1, L * 0.22).translate(0, h * 0.56 + 3.75, -L * 0.04)), accent);
    add(cg('ymast', () => new THREE.CylinderGeometry(0.08, 0.1, 3, 6).translate(0, h * 0.56 + 5.2, -L * 0.04)), chrome);
    add(cg('yradar', () => new THREE.BoxGeometry(1.4, 0.12, 0.2).translate(0, h * 0.56 + 5.9, -L * 0.04)), white);
    add(cg('yswim', () => new THREE.BoxGeometry(W * 0.8, 0.12, 1.4).translate(0, 0.1, -L / 2 - 0.5)), teak);
    for (const sx of [-1, 1]) add(cg('yrail', () => new THREE.CylinderGeometry(0.035, 0.035, L * 0.3, 6).rotateX(Math.PI / 2)), chrome, sx * (W / 2 - 0.2), h * 0.56 + 0.6, L * 0.3);
  }
  if (keep) { keep.position.set(0, d.kind === 'yacht' ? 3.5 : d.kind === 'jet' ? 0.6 : 1.2, -L / 2 + 0.1); keep.geometry = cg('tl', () => new THREE.BoxGeometry(0.12, 0.12, 0.12)); body.add(keep); }
  body.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = false; } });
}

export class Fleet {
  constructor(G, SPECS) {
    this.G = G; this.boats = []; const base = SPECS.boat;
    for (const d of THEME.boats) {
      const v = new Vehicle('boat', G.scene, G.Q, d.col);
      v.spec = Object.assign({}, base, { name: d.name, len: d.len, w: d.w, max: d.max, acc: d.acc, steer: d.steer, grip: d.grip, cam: d.cam, brake: d.kind === 'yacht' ? 3 : base.brake, lux: d.kind,
        seat: d.kind === 'jet' ? [0, 0.42, -0.45] : d.kind === 'yacht' ? [0, 2.2 * 0.56 + 1.9, d.len * 0.08] : [0.45, (0.9 + d.len * 0.04) * 0.56 + 0.05, -d.len * 0.05], sit: d.kind === 'jet' });
      v.r = d.w * 0.5 + 0.05; buildBoatModel(v, d); v.fleetId = d.id;
      const [x, z] = this.spot(d.at[0], d.at[1], v, d.at[2]); v.place(x, z, d.at[2]); v.parked = true; v.home = [x, z, d.at[2]]; G.vehicles.push(v); this.boats.push(v);
    }
    HOOKS.map.push((g, X, Z) => { const b = this.boats[0]; if (!b) return; g.font = '14px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000b'; g.beginPath(); g.arc(X(b.home[0] + 30), Z(b.home[1] - 20), 10, 0, 7); g.fill(); g.fillText('⚓', X(b.home[0] + 30), Z(b.home[1] - 20) + 1); });
  }
  // vaga livre na água perto do ponto pedido (casco inteiro na água, sem encostar em nada)
  spot(x, z, v, h) {
    const fits = (px, pz) => { const fx = Math.sin(h), fz = Math.cos(h), o = v.spec.len * 0.27; for (const [cx, cz] of [[px, pz], [px + fx * o, pz + fz * o], [px - fx * o, pz - fz * o]]) { if (!boatable(cx, cz) || collide({ x: cx, z: cz }, v.r, true, 0.3)) return false; } return !this.boats.some(b => Math.hypot(b.x - px, b.z - pz) < (b.spec.len + v.spec.len) * 0.45); };
    if (fits(x, z)) return [x, z];
    for (let r = 4; r < 220; r += 4) for (let a = 0; a < 20; a++) { const px = x + Math.cos(a / 20 * Math.PI * 2) * r, pz = z + Math.sin(a / 20 * Math.PI * 2) * r; if (fits(px, pz)) return [px, pz]; }
    return [x, z];
  }
  update(dt) { for (const v of this.boats) if (!v.driver && v.parked) v.sync(dt); }
}
