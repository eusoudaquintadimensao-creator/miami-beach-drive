// Heróis originais de Solara Bay (fantasias inventadas, sem marcas/emblemas de terceiros).
// Reaproveitam os esqueletos CC0 (Ela/Ele) com materiais próprios + acessórios procedurais presos aos ossos.
import * as THREE from 'three';

const M = (color, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.55, metalness: 0 }, o));
const GLOW = (color, i = 2.2) => new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: i, roughness: 0.4, toneMapped: false });
const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

// prende uma malha a um osso numa posição/rotação do espaço do modelo (metros, modelo olhando para +z)
function attach(model, bone, obj, off, k, rot) {
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

export const HEROES = {
  teia: {
    id: 'teia', label: 'Teia Neon', name: 'Ágil e escaladora', base: 'ela', height: 1.7, power: 'teia', emoji: '🕸️',
    powerTxt: 'escala paredes e se balança entre os prédios',
    colors: { Shirt: 0x0fbfb0, Pants: 0x10141c, Shoes: 0x0fbfb0, Hair: 0x10141c, HairBase: 0x10141c, Skin: 0x10141c },
    fallback: { skin: 0x10141c, shirt: 0x0fbfb0, pants: 0x10141c, hair: 0x10141c, stripe: 0x9cff3a },
    gear(model, k) {
      const lens = GLOW(0xd8fff8, 1.6), lime = GLOW(0x9cff3a, 1.4);
      // olhos grandes em gota (formato próprio), faixas em zigue-zague no peito e lançadores de fio nos pulsos
      const eye = (s) => mesh(box(0.07, 0.018, 0.012), lens, s * 0.045, 0, 0, 0, s * 0.3, s * -0.28);
      attach(model, 'Head', grp(eye(1), eye(-1)), [0, 0.12, 0.13], k);
      const zz = grp(mesh(box(0.17, 0.02, 0.01), lime, 0.06, 0, 0, 0, 0, -0.6), mesh(box(0.17, 0.02, 0.01), lime, -0.06, 0, 0, 0, 0, 0.6), mesh(box(0.13, 0.02, 0.01), lime, 0.05, -0.08, 0, 0, 0, -0.6), mesh(box(0.13, 0.02, 0.01), lime, -0.05, -0.08, 0, 0, 0, 0.6));
      attach(model, 'Torso', zz, [0, 0.12, 0.14], k);
      for (const s of ['L', 'R']) attach(model, 'Palm' + s, mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.08, 8), M(0x0b0e14, { metalness: 0.6 })), [0, 0.07, 0], k);
    },
  },
  solar: {
    id: 'solar', label: 'Armadura Solar', name: 'Voa e paira', base: 'ele', height: 1.86, power: 'voo', emoji: '☀️',
    powerTxt: 'voa e paira no céu de Solara',
    colors: { Shirt: 0xe9c25a, Pants: 0xf4f1ea, Socks: 0xe9c25a, Hair: 0xe9c25a, Eyes: 0xe9c25a, Skin: 0xf4f1ea },
    metal: { Shirt: 0.75, Pants: 0.35, Socks: 0.75, Hair: 0.75, Skin: 0.35, Eyes: 0.75 },
    fallback: { skin: 0xf4f1ea, shirt: 0xe9c25a, pants: 0xf4f1ea, hair: 0xe9c25a, stripe: 0xffffff },
    gear(model, k) {
      const gold = M(0xe9c25a, { metalness: 0.8, roughness: 0.3 }), white = M(0xf7f5ef, { metalness: 0.3, roughness: 0.3 }), sun = GLOW(0xfff1b8, 2.4);
      attach(model, 'Head', grp(mesh(new THREE.SphereGeometry(0.135, 14, 10), gold), mesh(box(0.17, 0.026, 0.03), GLOW(0x9fdcff, 2), 0, 0.01, 0.12)), [0, 0.1, 0.035], k);
      // emblema solar: hexágono com raios (desenho próprio)
      const em = grp(mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.02, 6), sun, 0, 0, 0, Math.PI / 2));
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + Math.PI / 6; em.add(mesh(box(0.012, 0.05, 0.012), sun, Math.cos(a) * 0.085, Math.sin(a) * 0.085, 0, 0, 0, a - Math.PI / 2)); }
      attach(model, 'Torso', em, [0, 0.2, 0.15], k);
      for (const s of [1, -1]) attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', mesh(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), white), [s * 0.02, 0.03, 0], k);
      const flame = new THREE.MeshBasicMaterial({ color: 0xffd27a, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const jets = [];
      for (const s of ['L', 'R']) { const j = mesh(new THREE.ConeGeometry(0.07, 0.45, 8), flame, 0, -0.25, 0, Math.PI); j.visible = false; jets.push(j); attach(model, 'Foot' + s, j, [0, -0.05, 0.03], k); }
      for (const s of ['L', 'R']) { const j = mesh(new THREE.ConeGeometry(0.04, 0.22, 8), flame, 0, -0.12, 0, Math.PI); j.visible = false; jets.push(j); attach(model, 'Palm' + s, j, [0, -0.05, 0], k); }
      model.userData.jets = jets;
    },
  },
  colosso: {
    id: 'colosso', label: 'Colosso Verde', name: 'Gigante gentil', base: 'ele', height: 2.3, bulk: 1.28, power: 'forca', emoji: '💪',
    powerTxt: 'super pulo e levanta carros (com carinho, sem estragar nada)',
    colors: { Shirt: 0x5aa83c, Pants: 0x34465c, Socks: 0x5aa83c, Hair: 0x14110e, Eyes: 0x1a1a1a, Skin: 0x5aa83c },
    fallback: { skin: 0x5aa83c, shirt: 0x5aa83c, pants: 0x34465c, hair: 0x14110e, stripe: 0x34465c },
    gear(model, k) {
      const bronze = M(0xb8793a, { metalness: 0.6, roughness: 0.35 });
      for (const s of ['L', 'R']) attach(model, 'LowerArm' + s, mesh(new THREE.CylinderGeometry(0.075, 0.08, 0.13, 10), bronze), [0, -0.17, 0], k);
      attach(model, 'Hips', mesh(new THREE.TorusGeometry(0.17, 0.025, 6, 18), M(0x2a2a2a), 0, 0, 0, Math.PI / 2), [0, 0.08, 0], k);
    },
  },
  sentinela: {
    id: 'sentinela', label: 'Sentinela', name: 'Escudo e impulso', base: 'ele', height: 1.82, power: 'escudo', emoji: '🛡️',
    powerTxt: 'arrancada com escudo que quica nas paredes',
    colors: { Shirt: 0x2e6f6b, Pants: 0x2a2e35, Socks: 0x2a2e35, Hair: 0x2a1c12, Eyes: 0x1a1a1a, Skin: 0xb07a52 },
    fallback: { skin: 0xb07a52, shirt: 0x2e6f6b, pants: 0x2a2e35, hair: 0x2a1c12, stripe: 0xf08a24 },
    gear(model, k) {
      const orange = M(0xf08a24, { metalness: 0.4, roughness: 0.4 }), steel = M(0x3b4048, { metalness: 0.7, roughness: 0.35 }), teal = GLOW(0x4ff7e0, 1.2), strap = M(0x5a3b22);
      // capacete aberto com crista
      attach(model, 'Head', grp(mesh(new THREE.SphereGeometry(0.16, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.5), orange), mesh(box(0.03, 0.06, 0.26), orange, 0, 0.15, -0.02)), [0, 0.13, -0.005], k);
      attach(model, 'Torso', grp(mesh(box(0.05, 0.5, 0.02), strap, 0, 0, 0, 0, 0, 0.55), mesh(box(0.05, 0.5, 0.02), strap, 0, 0, 0, 0, 0, -0.55)), [0, 0.12, 0.145], k);
      // escudo redondo: anéis laranja/aço e um hexágono turquesa no centro (desenho próprio)
      const sh = grp(mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.03, 28), orange), mesh(new THREE.CylinderGeometry(0.23, 0.23, 0.036, 28), steel), mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 28), orange), mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.045, 6), teal));
      sh.children.forEach(c => c.rotation.z = Math.PI / 2);
      model.userData.shield = attach(model, 'LowerArmL', sh, [0.09, -0.12, 0.02], k);
    },
  },
  ferreo: {
    id: 'ferreo', label: 'Lorde Férreo', name: 'Vilão que levita', base: 'ele', height: 1.88, power: 'levitar', emoji: '🧙',
    powerTxt: 'levita e flutua devagar (vilão de pose, mas gente boa)',
    colors: { Shirt: 0x5b6650, Pants: 0x3d4145, Socks: 0x3d4145, Hair: 0x5b6650, Eyes: 0x2c3030, Skin: 0x9ea6ad },
    metal: { Skin: 0.8 },
    fallback: { skin: 0x9ea6ad, shirt: 0x5b6650, pants: 0x3d4145, hair: 0x5b6650, stripe: 0x9ea6ad },
    gear(model, k) {
      const cloth = M(0x45503f, { roughness: 0.85, side: THREE.DoubleSide }), steel = M(0x9ea6ad, { metalness: 0.85, roughness: 0.3 });
      attach(model, 'Head', mesh(new THREE.SphereGeometry(0.175, 14, 10, Math.PI * 0.62, Math.PI * 1.76, 0, Math.PI * 0.68), cloth), [0, 0.11, -0.01], k);
      attach(model, 'Head', mesh(box(0.15, 0.02, 0.02), GLOW(0x7dff9a, 1.8), 0, 0, 0), [0, 0.12, 0.14], k);
      const capeGeo = new THREE.PlaneGeometry(0.52, 1.15, 4, 6); capeGeo.translate(0, -0.6, 0);
      const pos = capeGeo.attributes.position; for (let i = 0; i < pos.count; i++) { const x = pos.getX(i), y = pos.getY(i); pos.setZ(i, x * x * 2.2 + y * 0.1); pos.setX(i, x * (1 - y * 0.3)); } capeGeo.computeVertexNormals();
      const capeM = mesh(capeGeo, cloth); attach(model, 'Torso', grp(capeM), [0, 0.3, -0.15], k); model.userData.cape = capeM;
      for (const s of [1, -1]) attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', mesh(new THREE.SphereGeometry(0.1, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), steel), [s * 0.02, 0.03, 0], k);
      attach(model, 'Hips', mesh(new THREE.TorusGeometry(0.16, 0.02, 6, 18), steel, 0, 0, 0, Math.PI / 2), [0, 0.1, 0], k);
    },
  },
  tita: {
    id: 'tita', label: 'Titã Violeta', name: 'Pisão de onda', base: 'ele', height: 2.5, bulk: 1.2, power: 'impacto', emoji: '🟣',
    powerTxt: 'pisão no chão que solta uma onda de luz (só visual)',
    colors: { Shirt: 0x3b3644, Pants: 0x2a2633, Socks: 0x3b3644, Hair: 0x7b52b8, Eyes: 0x1a1a1a, Skin: 0x7b52b8 },
    fallback: { skin: 0x7b52b8, shirt: 0x3b3644, pants: 0x2a2633, hair: 0x7b52b8, stripe: 0xd9a441 },
    gear(model, k) {
      const gold = M(0xd9a441, { metalness: 0.85, roughness: 0.3 });
      for (const s of [1, -1]) attach(model, s > 0 ? 'UpperArmL' : 'UpperArmR', mesh(new THREE.SphereGeometry(0.11, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), gold), [s * 0.02, 0.03, 0], k);
      attach(model, 'Torso', mesh(box(0.34, 0.06, 0.22), gold), [0, 0.0, 0.02], k);
      // manopla dourada de desenho próprio: placas facetadas + três cristais em triângulo
      const g = grp(mesh(new THREE.CylinderGeometry(0.07, 0.06, 0.16, 6), gold), mesh(new THREE.DodecahedronGeometry(0.075, 0), gold, 0, -0.12, 0));
      [[0x4ff7e0, 0, -0.1], [0xff5fd2, -0.03, -0.15], [0xffc44d, 0.03, -0.15]].forEach(([c, x, y]) => g.add(mesh(new THREE.OctahedronGeometry(0.022, 0), GLOW(c, 2.5), x, y, 0.07)));
      model.userData.gauntlet = attach(model, 'PalmR', g, [0, 0.05, 0], k);
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
