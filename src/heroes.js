// Heróis originais de Solara Bay (fantasias inventadas, sem marcas/emblemas de terceiros).
// Reaproveitam os esqueletos CC0 (Ela/Ele) com materiais próprios + acessórios procedurais presos aos ossos.
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o));
const GLOW = (color, i = 2.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4, toneMapped: false });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// prende uma malha a um osso numa posição/rotação do espaço do modelo (metros, modelo olhando para +z)
export function attach(model, bone, obj, off, k, rot) {
  model.updateMatrixWorld(true);
  const b = model.getObjectByName(bone) || model;
  const ms = model.getWorldScale(new THREE.Vector3()); const bx = ms.x / ms.y, bz = ms.z / ms.y; // "bulk" (largura extra)
  const target = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld).add(new THREE.Vector3(off[0] * k * bx, off[1] * k, off[2] * k * bz));
  const bq = b.getWorldQuaternion(new THREE.Quaternion()), mq = model.getWorldQuaternion(new THREE.Quaternion());
  const bs = b.getWorldScale(new THREE.Vector3());
  const q0 = obj.quaternion.clone(); b.add(obj); obj.position.copy(b.worldToLocal(target));
  obj.quaternion.copy(bq.invert().multiply(mq).multiply(q0)); if (rot) obj.quaternion.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])));
  obj.scale.set(k * bx / bs.x, k / bs.y, k * bz / bs.z);
  obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  return obj;
}
const grp = (...m) => { const g = new THREE.Group(); for (const x of m) g.add(x); return g; };
const mesh = (geo, mat, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); return o; };

// t426: armadura tática de cinema (placas, ombreiras em camadas, braçadeiras, caneleiras, cinto com bolsos) — desenho próprio
export function limbTube(model, k, bone, next, r0, r1, m, extra = 0, up = 0) {
  model.updateMatrixWorld(true); const a = model.getObjectByName(bone), b = model.getObjectByName(next); if (!a || !b) return null;
  const pa = new THREE.Vector3().setFromMatrixPosition(a.matrixWorld), pb = new THREE.Vector3().setFromMatrixPosition(b.matrixWorld);
  const L = pa.distanceTo(pb) / (k || 1) * (1 + extra) + up; const dir = pb.clone().sub(pa).normalize().applyQuaternion(model.getWorldQuaternion(new THREE.Quaternion()).invert());
  const g = new THREE.CylinderGeometry(r0, r1, L, 12, 1, true); g.translate(0, -L / 2 + up, 0);
  const o = new THREE.Mesh(g, m); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir); return attach(model, bone, o, [0, 0, 0], k);
}
export function tacArmor(model, k, o) {
  // mangas do macacão (cobrem o braço inteiro)
  const suit = M(o.suit ?? 0x22262c, { metalness: 0.35, roughness: 0.55, side: THREE.DoubleSide });
  for (const s of ['L', 'R']) { limbTube(model, k, 'UpperArm' + s, 'LowerArm' + s, 0.075, 0.064, suit, 0.1, 0.03); limbTube(model, k, 'LowerArm' + s, 'Palm' + s, 0.064, 0.05, suit, 0.0, 0.03);
    limbTube(model, k, 'UpperLeg' + s, 'LowerLeg' + s, 0.092, 0.07, suit, 0.1, 0.02); limbTube(model, k, 'LowerLeg' + s, 'Foot' + s, 0.072, 0.062, suit, 0.0, 0.05); }
  const plate = M(o.plate, { metalness: o.pm ?? 0.75, roughness: o.pr ?? 0.32 }), trim = M(o.trim, { metalness: 0.85, roughness: 0.28 }), dark = M(0x16191e, { metalness: 0.4, roughness: 0.6 }), gl = GLOW(o.glow, 1.8);
  // peitoral em duas metades com vinco central e núcleo de luz
  for (const s of [-1, 1]) attach(model, 'Torso', grp(mesh(box(0.15, 0.17, 0.035), plate, 0, 0, 0, -0.12, s * 0.22, 0), mesh(box(0.15, 0.012, 0.04), trim, 0, -0.085, 0.004, -0.12, s * 0.22, 0)), [s * 0.072, 0.17, 0.125], k);
  if (o.core !== false) attach(model, 'Torso', mesh(new THREE.CylinderGeometry(0.026, 0.026, 0.02, 6), gl, 0, 0, 0, Math.PI / 2), [0, 0.17, 0.155], k);
  // abdômen segmentado
  for (let i = 0; i < 3; i++) attach(model, 'Torso', mesh(box(0.16 - i * 0.012, 0.042, 0.03), i % 2 ? dark : plate), [0, 0.04 - i * 0.05, 0.13], k);
  // gola alta
  attach(model, 'Torso', mesh(new THREE.CylinderGeometry(0.075, 0.095, 0.06, 12, 1, true), dark), [0, 0.33, 0], k);
  // ombreiras em camadas
  for (const s of [1, -1]) { const sh = grp(mesh(new THREE.SphereGeometry(0.105, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.45), plate), mesh(new THREE.SphereGeometry(0.09, 12, 6, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.1), trim, 0, -0.015, 0), mesh(box(0.012, 0.012, 0.12), gl, s * 0.05, 0.05, 0));
    attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', sh, [s * 0.02, 0.035, 0], k); }
  // braçadeiras e joelheiras/caneleiras
  for (const s of ['L', 'R']) {
    attach(model, 'LowerArm' + s, grp(mesh(new THREE.CylinderGeometry(0.055, 0.05, 0.16, 8), plate), mesh(box(0.02, 0.12, 0.012), gl, 0, 0, 0.052)), [0, -0.13, 0], k);
    attach(model, 'UpperLeg' + s, mesh(box(0.11, 0.17, 0.03), plate, 0, 0, 0, 0.05), [0, -0.2, 0.075], k);
    attach(model, 'LowerLeg' + s, grp(mesh(box(0.1, 0.24, 0.03), plate), mesh(new THREE.SphereGeometry(0.05, 8, 6), trim, 0, 0.15, 0.0), mesh(box(0.012, 0.16, 0.012), gl, 0, -0.01, 0.018)), [0, -0.15, 0.07], k);
  }
  // cinto tático com bolsos
  attach(model, 'Hips', mesh(new THREE.TorusGeometry(0.168, 0.02, 6, 22), dark, 0, 0, 0, Math.PI / 2), [0, 0.09, 0], k);
  for (const a of [-0.9, -0.35, 0.35, 0.9]) attach(model, 'Hips', mesh(box(0.06, 0.06, 0.035), dark, 0, 0, 0, 0, a), [Math.sin(a) * 0.17, 0.08, Math.cos(a) * 0.16], k);
  attach(model, 'Hips', mesh(box(0.07, 0.045, 0.02), trim), [0, 0.09, 0.172], k);
}
// capacete tático com viseira (formato próprio)
function helmet(model, k, shell, visor, open) {
  const g = grp(mesh(new THREE.SphereGeometry(0.155, 16, 12, 0, Math.PI * 2, 0, open ? Math.PI * 0.5 : Math.PI * 0.62), shell), mesh(box(0.2, open ? 0.02 : 0.035, 0.04), visor, 0, open ? 0.06 : 0.0, open ? 0.13 : 0.125));
  if (!open) g.add(mesh(box(0.11, 0.06, 0.05), shell, 0, -0.07, 0.12));
  return attach(model, 'Head', g, [0, 0.11, 0.005], k);
}

// t431: traje de titã (gigantes): armadura marinho/grafite com placas prata, emblema de sol dourado e energia dourada nos punhos — desenho próprio
export function titanSuit(model, k, o = {}) {
  tacArmor(model, k, { plate: o.plate ?? 0xb9c0c8, trim: o.trim ?? 0x1c2a44, glow: 0xffc44d, pm: 0.92, pr: 0.22, suit: o.suit ?? 0x1c2a44, core: false });
  const silver = M(0xc9ced6, { metalness: 0.95, roughness: 0.2 }), sun = GLOW(0xffc44d, 2.6), navy = M(o.suit ?? 0x1c2a44, { metalness: 0.5, roughness: 0.4 });
  // emblema de sol: disco + 12 raios finos alternados (desenho próprio)
  const em = grp(mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.02, 16), sun, 0, 0, 0, Math.PI / 2));
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, L = i % 2 ? 0.05 : 0.08; em.add(mesh(box(0.012, L, 0.012), sun, Math.cos(a) * (0.05 + L / 2), Math.sin(a) * (0.05 + L / 2), 0, 0, 0, a - Math.PI / 2)); }
  attach(model, 'Torso', em, [0, 0.17, 0.162], k);
  // ombreiras prata grandes por cima, cinto prata com placa central
  for (const s of [1, -1]) { const sh = grp(mesh(new THREE.SphereGeometry(0.115, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), silver), mesh(box(0.012, 0.012, 0.16), sun, s * 0.06, 0.045, 0)); sh.scale.set(1, 0.7, 1); attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', sh, [s * -0.01, -0.06, 0], k); }
  attach(model, 'Hips', grp(mesh(new THREE.TorusGeometry(0.175, 0.026, 6, 24), silver, 0, 0, 0, Math.PI / 2), mesh(box(0.12, 0.07, 0.03), silver, 0, 0, 0.18)), [0, 0.1, 0], k);
  // manoplas prata e energia dourada em volta dos punhos
  const fx = new THREE.MeshBasicMaterial({ color: 0xffc44d, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  for (const s of ['L', 'R']) { attach(model, 'LowerArm' + s, mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.2, 10), silver), [0, -0.15, 0], k); attach(model, 'Palm' + s, grp(mesh(new THREE.SphereGeometry(0.07, 10, 8), navy), mesh(new THREE.IcosahedronGeometry(0.11, 1), fx)), [0, 0.04, 0], k); }
}

export const HEROES = {
  teia: {
    id: 'teia', label: 'Vértice', name: 'Ágil e escaladora', base: 'ela', height: 1.72, power: 'teia', emoji: '🪝',
    powerTxt: 'escala paredes e se balança entre os prédios com um gancho de cabo',
    colors: { Shirt: 0x1d3f45, Pants: 0x15181d, Shoes: 0x22272e, Hair: 0x15181d, HairBase: 0x15181d, Skin: 0x15181d },
    fallback: { skin: 0x15181d, shirt: 0x1d3f45, pants: 0x15181d, hair: 0x15181d, stripe: 0x4ff7e0 },
    gear(model, k) {
      helmet(model, k, M(0x1c2127, { metalness: 0.7, roughness: 0.3 }), GLOW(0x4ff7e0, 1.8));
      tacArmor(model, k, { plate: 0x2a3038, trim: 0x4b5560, glow: 0x4ff7e0 });
      // lançadores de cabo nos pulsos
      for (const s of ['L', 'R']) attach(model, 'Palm' + s, mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), M(0x0b0e14, { metalness: 0.6 })), [0, 0.07, 0], k);
    },
  },
  solar: {
    id: 'solar', label: 'Armadura Solar', name: 'Voa e paira', base: 'ele', height: 1.86, power: 'voo', emoji: '☀️',
    powerTxt: 'voa e paira no céu de Solara',
    colors: { Shirt: 0x2b2e33, Pants: 0x24272c, Socks: 0x2b2e33, Hair: 0x2b2e33, Eyes: 0x2b2e33, Skin: 0x24272c },
    metal: { Shirt: 0.7, Pants: 0.55, Socks: 0.7, Hair: 0.7, Skin: 0.55, Eyes: 0.7 },
    fallback: { skin: 0x24272c, shirt: 0x2b2e33, pants: 0x24272c, hair: 0x2b2e33, stripe: 0xd9b45a },
    gear(model, k) {
      const sun = GLOW(0xfff1b8, 2.4);
      helmet(model, k, M(0xc9a24e, { metalness: 0.85, roughness: 0.28 }), GLOW(0x9fdcff, 2));
      tacArmor(model, k, { plate: 0xc9a24e, trim: 0x2b2e33, glow: 0xffd27a, pm: 0.88, pr: 0.26, core: false });
      // emblema solar: hexágono com raios (desenho próprio)
      const em = grp(mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.02, 6), sun, 0, 0, 0, Math.PI / 2));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; em.add(mesh(box(0.01, 0.035, 0.01), sun, Math.cos(a) * 0.065, Math.sin(a) * 0.065, 0, 0, 0, a - Math.PI / 2)); }
      attach(model, 'Torso', em, [0, 0.17, 0.16], k);
      const flame = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const jets = [];
      for (const s of ['L', 'R']) { const j = mesh(new THREE.ConeGeometry(0.07, 0.45, 8), flame, 0, -0.25, 0, Math.PI); j.visible = false; jets.push(j); attach(model, 'Foot' + s, j, [0, -0.05, 0.03], k); }
      for (const s of ['L', 'R']) { const j = mesh(new THREE.ConeGeometry(0.04, 0.22, 8), flame, 0, -0.12, 0, Math.PI); j.visible = false; jets.push(j); attach(model, 'Palm' + s, j, [0, -0.05, 0], k); }
      model.userData.jets = jets;
    },
  },
  colosso: {
    id: 'colosso', label: 'Colosso', name: 'Gigante gentil', base: 'ele', height: 2.35, bulk: 1.36, power: 'forca', emoji: '💪',
    powerTxt: 'super pulo e levanta carros (com cuidado, sem estragar nada)',
    colors: { Shirt: 0x1c2a44, Pants: 0x18233a, Socks: 0x1c2a44, Hair: 0x14110e, Eyes: 0x1a1a1a, Skin: 0x8d5a3b },
    fallback: { skin: 0x8d5a3b, shirt: 0x1c2a44, pants: 0x18233a, hair: 0x14110e, stripe: 0xc9ced6 },
    gear(model, k) { titanSuit(model, k); },
  },
  sentinela: {
    id: 'sentinela', label: 'Sentinela', name: 'Escudo e impulso', base: 'ele', height: 1.82, power: 'escudo', emoji: '🛡️',
    powerTxt: 'arrancada com escudo que quica nas paredes',
    colors: { Shirt: 0x1e3a44, Pants: 0x22262c, Socks: 0x22262c, Hair: 0x2a1c12, Eyes: 0x1a1a1a, Skin: 0xb07a52 },
    fallback: { skin: 0xb07a52, shirt: 0x1e3a44, pants: 0x22262c, hair: 0x2a1c12, stripe: 0xd9b45a },
    gear(model, k) {
      const steel = M(0x2f353d, { metalness: 0.75, roughness: 0.32 }), gold = M(0xc9a24e, { metalness: 0.85, roughness: 0.3 }), teal = GLOW(0x4ff7e0, 1.4);
      helmet(model, k, steel, teal, true);
      tacArmor(model, k, { plate: 0x2f353d, trim: 0xc9a24e, glow: 0x4ff7e0, suit: 0x1e3a44 });
      // escudo hexagonal de aço com aro dourado e anel turquesa (desenho próprio)
      const sh = grp(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 6), gold), mesh(new THREE.CylinderGeometry(0.27, 0.27, 0.036, 6), steel), mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 6), teal, 0, 0.02, 0, Math.PI / 2), mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.045, 6), teal));
      sh.children.forEach(c => { if (c.geometry.type === 'TorusGeometry') { c.rotation.set(0, Math.PI / 2, 0); c.position.set(0.02, 0, 0); } else c.rotation.z = Math.PI / 2; });
      model.userData.shield = attach(model, 'LowerArmL', sh, [0.09, -0.12, 0.02], k);
    },
  },
  ferreo: {
    id: 'ferreo', label: 'Férreo', name: 'Levita com estilo', base: 'ele', height: 1.88, power: 'levitar', emoji: '🌀',
    powerTxt: 'levita e flutua devagar (pose séria, mas gente boa)',
    colors: { Shirt: 0x30343a, Pants: 0x26292e, Socks: 0x26292e, Hair: 0x2c2c2c, Eyes: 0x1a1a1a, Skin: 0xb98a66 },
    fallback: { skin: 0xb98a66, shirt: 0x30343a, pants: 0x26292e, hair: 0x2c2c2c, stripe: 0x9ea6ad },
    gear(model, k) {
      const cloth = M(0x24272b, { roughness: 0.85, side: THREE.DoubleSide });
      helmet(model, k, M(0x8f979f, { metalness: 0.85, roughness: 0.3 }), GLOW(0xffc46b, 1.8));
      tacArmor(model, k, { plate: 0x8f979f, trim: 0x30343a, glow: 0xffc46b, pm: 0.85 });
      const capeGeo = new THREE.PlaneGeometry(0.52, 1.15, 4, 6); capeGeo.translate(0, -0.6, 0);
      const pos = capeGeo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, x * x * 2.2 + y * 0.1); pos.setX(i, x * (1 - y * 0.3)); } capeGeo.computeVertexNormals();
      const capeM = mesh(capeGeo, cloth); attach(model, 'Torso', grp(capeM), [0, 0.3, -0.17], k); model.userData.cape = capeM;
    },
  },
  tita: {
    id: 'tita', label: 'Titã', name: 'Pisão de onda', base: 'ele', height: 2.5, bulk: 1.2, power: 'impacto', emoji: '🌊',
    powerTxt: 'pisão no chão que solta uma onda de luz (só visual)',
    colors: { Shirt: 0x2a2d33, Pants: 0x202328, Socks: 0x2a2d33, Hair: 0x1a1410, Eyes: 0x1a1a1a, Skin: 0x6b4a35 },
    fallback: { skin: 0x6b4a35, shirt: 0x2a2d33, pants: 0x202328, hair: 0x1a1410, stripe: 0xd9a441 },
    gear(model, k) {
      const gold = M(0xb48a3c, { metalness: 0.85, roughness: 0.3 });
      tacArmor(model, k, { plate: 0x3a3f47, trim: 0xb48a3c, glow: 0x4ff7e0, suit: 0x2a2d33 });
      // braçadeira de impacto (desenho próprio): placas facetadas e um núcleo turquesa
      const g = grp(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 6), gold), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.02, 6), GLOW(0x4ff7e0, 2.2), 0, -0.02, 0.065, Math.PI / 2));
      model.userData.gauntlet = attach(model, 'LowerArmR', g, [0, -0.1, 0], k);
    },
  },
  atlas: {
    id: 'atlas', label: 'Atlas Índigo', name: 'Onda de choque dourada', base: 'ele', height: 2.4, bulk: 1.34, power: 'onda', emoji: '🌅',
    powerTxt: 'pisão que solta uma onda de choque dourada e derruba postes, guarda-sóis e palmeiras (ninguém se machuca)',
    colors: { Shirt: 0x1a2440, Pants: 0x161f36, Socks: 0x1a2440, Hair: 0x141826, Eyes: 0xdfe5ee, Skin: 0x3f5fa8 },
    fallback: { skin: 0x3f5fa8, shirt: 0x1a2440, pants: 0x161f36, hair: 0x141826, stripe: 0xffc44d },
    gear(model, k) {
      const skin = M(0x3f5fa8, { roughness: 0.55 });
      titanSuit(model, k, { suit: 0x1a2440 });
      // rosto próprio: queixo quadrado, olhos prata e cicatriz na sobrancelha esquerda
      attach(model, 'Head', mesh(box(0.15, 0.06, 0.08), skin), [0, -0.005, 0.085], k);
      const eye = GLOW(0xe6ecf5, 1.2); for (const s of [-1, 1]) attach(model, 'Head', mesh(box(0.03, 0.012, 0.01), eye), [s * 0.045, 0.1, 0.132], k);
      attach(model, 'Head', mesh(box(0.008, 0.045, 0.01), M(0x8fa6d8, { roughness: 0.4 }), 0, 0, 0, 0, 0, 0.35), [0.05, 0.125, 0.132], k);
    },
  },
};
// ajustes de material: brilho metálico e partes que brilham
export function heroMaterials(H, mats) {
  for (const m of mats) {
    if (H.metal && H.metal[m.name] != null) { m.metalness = H.metal[m.name]; m.roughness = 0.32; }
    if (H.glow && H.glow[m.name] != null) { m.emissive = new THREE.Color(H.glow[m.name]); m.emissiveIntensity = 1.6; }
  }
}

// ---- "traje nano-metal": roupa tecnológica metálica escura com linhas de luz (estilo próprio de Solara) para todos os personagens jogáveis
const SUIT_CLOTH = ['Shirt', 'Pants', 'Socks', 'Shoes']; const SUIT_SKIN = new Set(['teia', 'solar']);
export const SUIT_GLOW = { ela: 0xff4f8b, ele: 0x19e3ff, teia: 0x9cff3a, solar: 0xffd23f, colosso: 0xffc44d, sentinela: 0x4fb3ff, ferreo: 0xff6a2a, tita: 0xb36bff, atlas: 0xffc44d };
export function nanoSuit(A, model, mats, k) {
  const glow = SUIT_GLOW[A.id] ?? 0x29f0ff; const hsl = {};
  for (const m of mats) {
    const cloth = SUIT_CLOTH.includes(m.name) || (m.name === 'Skin' && SUIT_SKIN.has(A.id)); // nesses heróis a "pele" já é o macacão/armadura
    if (!cloth) continue;
    m.color.getHSL(hsl, THREE.SRGBColorSpace); m.color.setHSL(hsl.h, Math.min(hsl.s, 0.5), A.hero ? 0.17 : 0.13, THREE.SRGBColorSpace); m.metalness = 0.85; m.roughness = 0.24; m.envMapIntensity = 1.4; m.emissive = new THREE.Color(glow).multiplyScalar(0.05); m.emissiveIntensity = 1;
  }
  const gm = GLOW(glow, 2.0); const line = (w, h, d) => mesh(box(w, h, d), gm);
  try {
    // peito em V, linha central e cinto de luz
    attach(model, 'Torso', grp(line(0.24, 0.026, 0.02).rotateZ(0.55).translateX(0.08), line(0.24, 0.026, 0.02).rotateZ(-0.55).translateX(-0.08)), [0, 0.06, 0.135], k);
    attach(model, 'Torso', line(0.024, 0.22, 0.02), [0, -0.06, 0.14], k);
    attach(model, 'Torso', line(0.024, 0.3, 0.02), [0, 0.0, -0.13], k);
    attach(model, 'Hips', line(0.34, 0.03, 0.26), [0, 0.06, 0], k);
    // nós de luz nos ombros, cotovelos, joelhos e punhos
    const dot = (r) => mesh(new THREE.SphereGeometry(r, 10, 8), gm);
    for (const s of ['L', 'R']) { attach(model, 'UpperArm' + s, dot(0.04), [0, 0, 0], k); attach(model, 'LowerArm' + s, dot(0.035), [0, 0, 0], k); attach(model, 'LowerLeg' + s, dot(0.04), [0, 0, 0.05], k); attach(model, 'Palm' + s, dot(0.03), [0, 0, 0], k); }
  } catch (e) { console.info('traje nano-metal parcial:', e && e.message); }
}
