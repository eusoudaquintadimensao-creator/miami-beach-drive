// Avatares do jogador (Ela / Ele): modelos glTF com esqueleto (CC0, Quaternius) e animações via AnimationMixer.
// Carregamento preguiçoso: o jogo abre com o boneco procedural e troca pelo modelo quando o arquivo chega.
import * as THREE from 'three';
import { Hero } from './people.js';
import { lerp } from './util.js';
import { HEROES, heroMaterials, nanoSuit } from './heroes.js';

export const AVATARS = {
  ela: {
    id: 'ela', label: 'Ela', name: 'Luna', file: 'assets/avatars/ela.glb', height: 1.68,
    colors: { Shirt: 0xff4f8b, Pants: 0x2f4f86, Shoes: 0xf2f2f2, Hair: 0x24150c, HairBase: 0x24150c, Skin: 0x8a5a3c },
    fallback: { skin: 0x8a5a3c, shirt: 0xff4f8b, pants: 0x2f4f86, hair: 0x24150c, stripe: 0xffd23f },
  },
  ele: {
    id: 'ele', label: 'Ele', name: 'Davi', file: 'assets/avatars/ele.glb', height: 1.78,
    colors: { Shirt: 0x19c3c9, Pants: 0xe8dcc0, Socks: 0xffffff, Hair: 0x1b120c, Eyes: 0x1a1a1a, Skin: 0xc58c5c },
    fallback: { skin: 0xc58c5c, shirt: 0x19c3c9, pants: 0xe8dcc0, hair: 0x1b120c, stripe: 0xffffff },
  },
};
// heróis originais: usam o esqueleto/arquivo de uma base (ela/ele) com materiais e acessórios próprios
for (const H of Object.values(HEROES)) AVATARS[H.id] = Object.assign({ hero: true, file: AVATARS[H.base].file }, H);
export const AVATAR_IDS = Object.keys(AVATARS);
export const BASE_IDS = ['ela', 'ele'];

// ---- carregamento (uma vez por arquivo) e preparo da malha: normais suaves para um visual menos "quadrado"
const cache = new Map(); let libs = null;
async function getLibs() {
  if (!libs) libs = Promise.all([import('three/addons/loaders/GLTFLoader.js'), import('three/addons/utils/SkeletonUtils.js'), import('three/addons/utils/BufferGeometryUtils.js')])
    .then(([a, b, c]) => ({ GLTFLoader: a.GLTFLoader, SkeletonUtils: b, mergeVertices: c.mergeVertices }));
  return libs;
}
function smoothGeo(geo, mergeVertices) {
  // atributos quantizados/intercalados viram arrays simples, depois soldamos os vértices e recalculamos as normais
  const g = new THREE.BufferGeometry();
  for (const k of Object.keys(geo.attributes)) {
    if (k === 'normal' || k === 'uv') continue;
    const a = geo.attributes[k]; const n = a.count * a.itemSize;
    const arr = k === 'skinIndex' ? new Uint16Array(n) : new Float32Array(n);
    for (let i = 0; i < a.count; i++) for (let c = 0; c < a.itemSize; c++) arr[i * a.itemSize + c] = a.getComponent(i, c);
    g.setAttribute(k, new THREE.BufferAttribute(arr, a.itemSize));
  }
  if (geo.index) g.setIndex(geo.index.clone());
  const m = mergeVertices(g, 1e-3); m.computeVertexNormals(); m.computeBoundingSphere(); return m;
}
export function loadAvatar(id) {
  const A = AVATARS[id] || AVATARS.ela;
  const key = A.file;
  if (!cache.has(key)) cache.set(key, (async () => {
    const L = await getLibs();
    const gltf = await new L.GLTFLoader().loadAsync(new URL('../' + A.file, import.meta.url).href);
    gltf.scene.traverse(o => {
      if (o.isSkinnedMesh) {
        try { o.geometry = smoothGeo(o.geometry, L.mergeVertices); } catch (e) { /* mantém a malha original */ }
        for (const mt of [].concat(o.material)) { mt.flatShading = false; mt.roughness = mt.name === 'Hair' ? 0.55 : 0.78; mt.metalness = 0; mt.needsUpdate = true; }
      }
    });
    const box = new THREE.Box3().setFromObject(gltf.scene); gltf.rawHeight = box.max.y - box.min.y;
    return { gltf, L };
  })());
  return cache.get(key);
}
export function preloadAvatars() { for (const id of BASE_IDS) loadAvatar(id).catch(() => { }); }

// Cria uma cópia animável do modelo (com cores próprias). Usado pelo jogador e pelos moradores que conversam.
export async function makeModel(id, colors, height, suit) {
  const A = AVATARS[id] || AVATARS.ela; const { gltf, L } = await loadAvatar(A.id);
  const model = L.SkeletonUtils.clone(gltf.scene);
  const cols = Object.assign({}, A.colors, colors || {}); const mats = new Map();
  model.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    o.material = [].concat(o.material).map(m => { if (!mats.has(m)) { const c = m.clone(); if (cols[m.name] != null) c.color.setHex(cols[m.name]); mats.set(m, c); } return mats.get(m); });
    if (o.material.length === 1) o.material = o.material[0];
  });
  model.scale.multiplyScalar((height || A.height) / gltf.rawHeight);
  if (A.bulk) { model.scale.x *= A.bulk; model.scale.z *= A.bulk; }
  if (A.hero) { heroMaterials(A, [...mats.values()]); try { A.gear(model, (height || A.height) / AVATARS[A.base].height); } catch (e) { console.info('acessório do herói falhou:', e && e.message); } }
  if (suit) nanoSuit(A, model, [...mats.values()], (height || A.height) / AVATARS[A.hero ? A.base : A.id].height);
  const mixer = new THREE.AnimationMixer(model); const acts = {};
  for (const c of gltf.animations) acts[c.name] = mixer.clipAction(c);
  for (const k of ['Jump', 'Standing']) if (acts[k]) { acts[k].setLoop(THREE.LoopOnce, 1); acts[k].clampWhenFinished = true; }
  return { model, mixer, acts, mats: [...mats.values()] };
}

const CLIP = { idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', drive: 'Sitting', sit: 'Sitting', wave: 'Clapping', clap: 'Clapping', talk: 'Idle' };
// Pose sentada (o clipe "Sitting" senta e fica parado): congelamos num quadro já sentado
const SIT_T = 4;

// Avatar animado com fallback procedural. Mantém a mesma interface do antigo Hero (g, ph, pose, walking, anim).
export class Avatar {
  constructor(scene, Q, id) {
    this.Q = Q; this.g = new THREE.Group(); scene.add(this.g); this.ph = 0; this.walking = false;
    this.cur = null; this.mode = 'idle'; this.loaded = false; this.failed = false; this.token = 0;
    this.setAvatar(id || 'ela');
  }
  get id() { return this._id; }
  setAvatar(id) {
    const A = AVATARS[id] || AVATARS.ela; this._id = A.id; const tok = ++this.token;
    // fallback procedural (aparece na hora; também fica se o arquivo não carregar)
    if (this.fb) this.g.remove(this.fb.g);
    const tmp = new THREE.Group(); this.fb = new Hero(tmp, this.Q, A.fallback); this.fb.inner.scale.setScalar(A.height / 1.8);
    this.def = A; this.heightK = A.height / 1.75;
    if (A.bulk) { this.fb.inner.scale.x *= A.bulk; this.fb.inner.scale.z *= A.bulk; }
    if (A.id === 'ela') { const hairM = this.fb.hair.material; const pony = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.28, 2, 6).translate(0, 1.5, -0.14), hairM); this.fb.inner.add(pony); }
    tmp.remove(this.fb.g); this.g.add(this.fb.g); this.fb.g.visible = !this.rig;
    const id0 = A.id; return makeModel(id0, null, null, true).then((r) => {
      if (tok !== this.token) return;
      if (this.rig) { this.g.remove(this.rig.model); this.rig.mixer.stopAllAction(); }
      this.rig = r; this.g.add(r.model); this.fb.g.visible = false; this.loaded = true; this.failed = false; this.cur = null; this.play(this.mode, 1, 0);
    }).catch((e) => { if (tok !== this.token) return; this.failed = true; this.rig = null; this.fb.g.visible = true; console.info('Avatar 3D indisponível, usando boneco simples:', e && e.message); });
  }
  play(mode, speed, fade) {
    const R = this.rig; if (!R) return; const name = CLIP[mode] || 'Idle'; const a = R.acts[name] || R.acts.Idle; if (!a) return;
    if (this.cur !== a) {
      a.reset(); a.enabled = true; a.setEffectiveWeight(1); a.play();
      if (name === 'Sitting') { a.time = SIT_T; a.timeScale = 0; }
      if (this.cur) this.cur.crossFadeTo(a, fade ?? 0.22, false); this.cur = a;
    }
    if (name !== 'Sitting' && name !== 'Jump') a.timeScale = speed;
  }
  // mode: idle|walk|jump|drive|sit|wave|clap ; amt: 0..1 (0.95 = correndo)
  pose(mode, amt, dt) {
    this.mode = mode;
    if (this.rig) {
      let m = mode, sp = 1;
      if (mode === 'walk') { if (amt > 0.8) { m = 'run'; sp = 0.9 + (amt - 0.8) * 1.2; } else sp = lerp(0.55, 1.15, Math.min(1, amt / 0.6)); }
      this.play(m, sp); this.rig.mixer.update(dt);
    } else { this.fb.ph = this.ph; this.fb.pose(mode, amt, dt); }
  }
  anim(dt) { this.ph += dt * 6.5; this.pose(this.walking ? 'walk' : 'idle', this.walking ? 0.55 : 0, dt); this.walking = false; }
}
