// Helicópteros: um pilotável no heliponto da praia e outros fazendo rotas pela cidade
// (luzes de navegação piscando e holofote à noite). Sem armas: é só passeio e vista.
import * as THREE from 'three';
import { clamp, lerp, angDiff, canvasTex } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundY, baseGroundY, surfaceY, BOXES, PIERS, WATER_Y, BOUNDS } from './world.js';

// colisão do helicóptero só com prédios (caixas) abaixo da altitude; palmeiras e postes ficam de fora
export function heliCollide(pos, r, y) {
  let hit = null;
  for (const b of BOXES) {
    if (b.boatOnly || y > b.h) continue;
    if (pos.x < b.x0 - r || pos.x > b.x1 + r || pos.z < b.z0 - r || pos.z > b.z1 + r) continue;
    const cx = clamp(pos.x, b.x0, b.x1), cz = clamp(pos.z, b.z0, b.z1); let dx = pos.x - cx, dz = pos.z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 < 1e-6) { const px = Math.min(pos.x - b.x0, b.x1 - pos.x), pz = Math.min(pos.z - b.z0, b.z1 - pos.z);
      if (px < pz) { dx = pos.x - b.x0 < b.x1 - pos.x ? -1 : 1; dz = 0; pos.x = dx < 0 ? b.x0 - r : b.x1 + r; } else { dz = pos.z - b.z0 < b.z1 - pos.z ? -1 : 1; dx = 0; pos.z = dz < 0 ? b.z0 - r : b.z1 + r; } }
    else { const d = Math.sqrt(d2); dx /= d; dz /= d; pos.x = cx + dx * r; pos.z = cz + dz * r; }
    hit = { x: dx, z: dz };
  }
  return hit;
}

export const HELIPAD = { x: 416, z: -200, y: 0.3, name: 'Heliponto da Praia' };
export const HELI_SPEC = { name: 'Helicóptero Brisa H1', len: 11, w: 2.6, max: 70, cam: 14, heli: true, air: true, boat: false, susp: 0, wb: 4 };
// espaço aéreo (t361): tudo livre — cidade, prédios (por cima), mar e ponte (por cima E por baixo). Limites macios bem além do mapa.
export const AIRSPACE = { x0: BOUNDS.x0 - 420, x1: BOUNDS.x1 + 700, z0: BOUNDS.z0 - 500, z1: BOUNDS.z1 + 500, ceil: 420, hard: 160 };
export function deckInfo(x, z) { // tabuleiro da ponte/rampa nesta coluna (null se não houver)
  if (x <= 280) return null; const g = groundY(x, z), b = baseGroundY(x, z); return g > b + 0.8 && g > 1 ? { top: g, under: Math.max(b, WATER_Y) } : null;
}
// chão sob uma aeronave na altura y: por cima do tabuleiro é o tabuleiro; por baixo é o mar (passa por baixo da ponte)
export function airFloor(x, z, y, waterOff = 0.6) {
  const d = deckInfo(x, z); let g;
  if (d && y < d.top - 1.2) g = d.under; else g = surfaceY(x, z);
  return g < WATER_Y + 0.2 ? WATER_Y + waterOff : Math.max(g, WATER_Y + waterOff);
}
// teto sob o tabuleiro para uma aeronave de altura hgt (null = céu livre)
export function airCeil(x, z, y, hgt) { const d = deckInfo(x, z); if (!d || y >= d.top - 1.2) return null; return d.top - 1.1 - hgt; }
// empurra de volta, devagar, quem sai do espaço aéreo (sem parede invisível); devolve true se estiver fora
export function airBounds(o, dt) {
  const A = AIRSPACE; let out = false; const k = 10 * dt;
  if (o.x < A.x0) { o.vx += k * Math.min(3, (A.x0 - o.x) / 40 + 1); out = true; } else if (o.x > A.x1) { o.vx -= k * Math.min(3, (o.x - A.x1) / 40 + 1); out = true; }
  if (o.z < A.z0) { o.vz += k * Math.min(3, (A.z0 - o.z) / 40 + 1); out = true; } else if (o.z > A.z1) { o.vz -= k * Math.min(3, (o.z - A.z1) / 40 + 1); out = true; }
  o.x = clamp(o.x, A.x0 - A.hard, A.x1 + A.hard); o.z = clamp(o.z, A.z0 - A.hard, A.z1 + A.hard);
  return out;
}

let glowTex = null, spotTex = null;
function texes() {
  if (!glowTex) glowTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  if (!spotTex) spotTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.55, 'rgba(255,245,220,.55)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  return { glowTex, spotTex };
}
// disco de desfoque do rotor: anéis concêntricos suaves e um "rastro" mais escuro perto das pontas
let blurT = null;
export function blurTex() {
  if (!blurT) blurT = canvasTex(256, 256, (g, w, h) => { const c = w / 2; g.clearRect(0, 0, w, h);
    for (let r = 14; r < c; r += 2) { const k = r / c; const a = (0.1 + 0.55 * k * k) * (0.75 + 0.25 * Math.sin(r * 0.9)); g.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`; g.lineWidth = 2; g.beginPath(); g.arc(c, c, r, 0, Math.PI * 2); g.stroke(); }
    g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 5; g.beginPath(); g.arc(c, c, c - 8, 0, Math.PI * 2); g.stroke(); }, { clamp: true });
  return blurT;
}
// cone de luz do holofote (aditivo, some nas bordas e no fim)
function coneMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = uI * edge * (0.15 + 0.85 * vUv.y) * 0.22; gl_FragColor = vec4(vec3(1.0,0.96,0.86)*a, a); }',
  });
}

// lavagem do rotor (t361): spray branco na água / poeira no chão, anel de ondas; partículas com alfa próprio (1 draw call + anel)
export class RotorWash {
  constructor(scene, n = 96) {
    this.n = n; this.scene = scene; this.p = new Float32Array(n * 3); this.v = new Float32Array(n * 3); this.a = new Float32Array(n); this.s = new Float32Array(n); this.life = new Float32Array(n); this.age = new Float32Array(n).fill(9); this.k = 0; this.acc = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.p, 3)); g.setAttribute('aA', new THREE.BufferAttribute(this.a, 1)); g.setAttribute('aS', new THREE.BufferAttribute(this.s, 1));
    this.mat = new THREE.ShaderMaterial({ uniforms: { uC: { value: new THREE.Color(0xeaf6ff) }, map: { value: texes().glowTex }, uScale: { value: 300 } }, transparent: true, depthWrite: false, fog: false,
      vertexShader: 'attribute float aA; attribute float aS; uniform float uScale; varying float vA; void main(){ vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = clamp(aS * uScale / max(1.0, -mv.z), 1.0, 160.0); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uC; uniform sampler2D map; varying float vA; void main(){ float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.01) discard; gl_FragColor = vec4(uC, a); }' });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 4; scene.add(this.pts);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(0.62, 1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xdff2ff, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.ring.visible = false; scene.add(this.ring); this.on = 0; this.alive = 0;
  }
  update(dt, h) {
    if (!(dt > 0)) return;
    const gy = h.washY != null ? h.washY : WATER_Y; const alt = h.y - gy; const water = h.washWater !== false;
    const want = h.spool > 0.7 && alt < 30 && (h.air || h.spool > 0.85) ? clamp(1 - alt / 30, 0, 1) * clamp((h.spool - 0.7) / 0.25, 0, 1) : 0;
    this.on = lerp(this.on, want, Math.min(1, dt * 3));
    if (this.on > 0.02) {
      this.mat.uniforms.uC.value.setHex(water ? 0xeaf6ff : 0xcdb894);
      this.acc += dt * (water ? 70 : 55) * this.on;
      while (this.acc >= 1) { this.acc -= 1; const i = this.k = (this.k + 1) % this.n; const an = Math.random() * Math.PI * 2, r0 = 1.5 + Math.random() * 2, sp = 7 + Math.random() * 8;
        this.p[i * 3] = h.x + Math.cos(an) * r0; this.p[i * 3 + 1] = gy + 0.2; this.p[i * 3 + 2] = h.z + Math.sin(an) * r0;
        this.v[i * 3] = Math.cos(an) * sp + (h.vx || 0) * 0.3; this.v[i * 3 + 1] = 0.6 + Math.random() * (water ? 2.6 : 1.6); this.v[i * 3 + 2] = Math.sin(an) * sp + (h.vz || 0) * 0.3;
        this.age[i] = 0; this.life[i] = 0.8 + Math.random() * 0.7; }
    }
    let alive = 0;
    for (let i = 0; i < this.n; i++) {
      if (this.age[i] >= this.life[i]) { if (this.a[i]) { this.a[i] = 0; } continue; }
      alive++; this.age[i] += dt; const f = this.age[i] / this.life[i];
      this.p[i * 3] += this.v[i * 3] * dt; this.p[i * 3 + 1] += this.v[i * 3 + 1] * dt; this.p[i * 3 + 2] += this.v[i * 3 + 2] * dt;
      this.v[i * 3] *= 1 - dt * 1.4; this.v[i * 3 + 2] *= 1 - dt * 1.4; this.v[i * 3 + 1] -= dt * 2.2;
      this.a[i] = (f < 0.15 ? f / 0.15 : 1 - (f - 0.15) / 0.85) * 0.55 * Math.max(0.35, this.on); this.s[i] = 1.6 + f * 5;
    }
    this.alive = alive; const G = this.pts.geometry; G.attributes.position.needsUpdate = G.attributes.aA.needsUpdate = G.attributes.aS.needsUpdate = true; this.pts.visible = alive > 0;
    // anel de ondas na água sob o rotor
    const rv = water && this.on > 0.05; this.ring.visible = rv;
    if (rv) { const ph = (performance.now() / 1000 * 0.9) % 1; this.ring.position.set(h.x, gy + 0.08, h.z); this.ring.scale.setScalar(4 + ph * 9); this.ring.material.opacity = this.on * 0.35 * (1 - ph); }
  }
  dispose() { this.scene.remove(this.pts, this.ring); }
}

const M = {};
function mats() {
  if (M.ok) return M; M.ok = true;
  M.glass = new THREE.MeshStandardMaterial({ color: 0x2a5876, metalness: 0.35, roughness: 0.06, envMapIntensity: 1.6 });
  M.dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.5, roughness: 0.45 });
  M.metal = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.85, roughness: 0.3 });
  M.disc = new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.0, depthWrite: false, side: THREE.DoubleSide });
  M.red = new THREE.MeshBasicMaterial({ color: 0xff2a2a, toneMapped: false }); M.green = new THREE.MeshBasicMaterial({ color: 0x2aff6a, toneMapped: false });
  M.white = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }); M.beacon = new THREE.MeshBasicMaterial({ color: 0xff3030, toneMapped: false });
  return M;
}

export class Heli {
  constructor(scene, Q, opts = {}) {
    const m = mats(); const { glowTex, spotTex } = texes(); this.Q = Q;
    this.type = 'heli'; this.spec = HELI_SPEC; this.ambient = !!opts.ambient; this.color = opts.color ?? 0x0a84ff;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    // Modelo t361: helicóptero utilitário leve BIMOTOR genérico (estilo dos bimotores civis de resgate/executivo, sem marca):
    // fuselagem torneada (lathe) com para-brisa envolvente em vidro, carenagem dupla de turbinas com 2 escapamentos,
    // rotor principal de 4 pás com desfoque de movimento, rotor de cauda carenado (fenestron genérico) na deriva,
    // estabilizador com placas, esquis tubulares com degraus, farol de pouso, antenas, luzes de navegação.
    // Pintura PBR metálica com verniz (médio/alto). Peças estáticas mescladas por material (poucos draw calls).
    const lo = Q.level === 'low';
    const paint = lo ? new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.5, roughness: 0.3 })
      : new THREE.MeshPhysicalMaterial({ color: this.color, metalness: 0.62, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 });
    this.paint = paint;
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = this.body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); parent.add(o); return o; };
    const B = { paint: [], dark: [], metal: [], glass: [], stripe: [] };
    const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a); return g; };
    const put = (k, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z); B[k].push(clean(g)); };
    const seg = lo ? 16 : 28;
    // perfil (raio ao longo do eixo; z cresce para o nariz) → torneado e girado para o eixo Z
    const lathe = (prof, sx, sy, phiS = 0, phiL = Math.PI * 2, n = seg) => { const g = new THREE.LatheGeometry(prof.map(([z, r]) => new THREE.Vector2(Math.max(0.001, r), z)), n, phiS, phiL); g.rotateX(Math.PI / 2); g.scale(sx, sy, 1); return g; };
    const POD = [[-3.05, 0.4], [-2.6, 0.62], [-2.0, 0.86], [-1.3, 1.02], [-0.5, 1.1], [0.4, 1.12], [1.2, 1.08], [1.9, 0.96], [2.45, 0.76], [2.85, 0.5], [3.1, 0.22], [3.2, 0.001]];
    put('paint', lathe(POD, 1.02, 1.0), 0, 1.62, 0);                                                    // cabine (gota alongada)
    // para-brisa + janelas envolventes: faixa de cima/frente do torneado, um pouco maior
    put('glass', lathe(POD.filter(([z]) => z > 0.2 && z < 3.15).map(([z, r]) => [z, r * 1.018]), 1.02, 1.0, Math.PI - 1.42, 2.84), 0, 1.62, 0);
    put('glass', lathe(POD.filter(([z]) => z > -1.4 && z < 0.4).map(([z, r]) => [z, r * 1.012]), 1.02, 1.0, Math.PI - 1.2, 2.4), 0, 1.66, 0); // janelas da cabine traseira
    put('dark', new THREE.BoxGeometry(0.06, 0.05, 2.9), 0, 2.74, 1.15, 0.2);                            // moldura central do para-brisa
    for (const sx of [-1, 1]) { put('dark', new THREE.BoxGeometry(0.04, 1.05, 0.05), sx * 1.1, 1.85, 0.32, -0.12, 0, sx * 0.08); // colunas
      put('dark', new THREE.BoxGeometry(0.03, 0.92, 0.03), sx * 1.13, 1.42, -1.35, 0, 0, sx * 0.1);                          // trilho da porta corrediça
      put('metal', new THREE.BoxGeometry(0.05, 0.04, 0.22), sx * 1.15, 1.48, -0.25);                                         // maçaneta
      put('paint', new THREE.BoxGeometry(0.42, 0.1, 1.1), sx * 0.9, 0.62, 0.4);                                              // carenagem dos esquis
    }
    put('paint', lathe([[-1.3, 0.08], [-1.1, 0.36], [-0.4, 0.52], [0.6, 0.5], [1.2, 0.36], [1.5, 0.08]], 1.35, 0.62), 0, 2.78, -1.0); // carenagem das 2 turbinas
    for (const sx of [-1, 1]) {
      put('dark', new THREE.CylinderGeometry(0.17, 0.2, 0.4, 12), sx * 0.48, 2.9, -2.42, Math.PI / 2 + 0.5, 0, sx * -0.35); // 2 escapamentos (bimotor)
      put('dark', new THREE.BoxGeometry(0.06, 0.26, 0.55), sx * 0.66, 2.85, 0.05);                                        // tomadas de ar
      put('stripe', new THREE.BoxGeometry(0.03, 0.12, 4.2), sx * 1.08, 1.12, 0.1, 0, 0, sx * 0.05);                        // faixa lateral
    }
    put('paint', new THREE.CylinderGeometry(0.19, 0.42, 5.0, lo ? 10 : 16).rotateX(Math.PI / 2 + 0.035), 0, 2.0, -5.3);  // cone de cauda
    // deriva com rotor carenado: anel + carenagem + barbatana enflechada
    const finShape = new THREE.Shape(); finShape.moveTo(-0.85, -0.1); finShape.lineTo(0.6, -0.1); finShape.lineTo(0.15, 1.35); finShape.lineTo(-0.7, 1.45); finShape.lineTo(-1.05, 0.5);
    put('paint', new THREE.ExtrudeGeometry(finShape, { depth: 0.16, bevelEnabled: false }).translate(0, 0, -0.08).rotateY(-Math.PI / 2), 0, 2.55, -8.0);
    put('paint', new THREE.CylinderGeometry(0.75, 0.75, 0.34, lo ? 16 : 26, 1, true).rotateZ(Math.PI / 2), 0, 2.2, -7.9);   // anel do fenestron
    put('paint', new THREE.BoxGeometry(0.34, 0.5, 1.7), 0, 1.6, -7.9);                                                       // base da deriva
    put('stripe', new THREE.BoxGeometry(0.18, 0.4, 0.5), 0, 3.6, -8.55, -0.5);
    put('paint', new THREE.BoxGeometry(2.7, 0.07, 0.58), 0, 2.22, -6.45);                                                    // estabilizador
    for (const sx of [-1, 1]) put('paint', new THREE.BoxGeometry(0.05, 0.5, 0.5), sx * 1.36, 2.3, -6.45);                  // placas de ponta
    put('dark', new THREE.BoxGeometry(1.7, 0.12, 2.6), 0, 0.68, 0.2);                                                        // barriga
    put('dark', new THREE.CylinderGeometry(0.12, 0.16, 0.5, 12), 0, 3.15, -0.05);                                            // mastro
    put('dark', new THREE.BoxGeometry(0.02, 0.45, 0.02), 0, 0.42, -1.4); put('dark', new THREE.BoxGeometry(0.02, 0.02, 0.6), 0.35, 2.3, 3.0); // antena e pitô
    put('metal', new THREE.CylinderGeometry(0.11, 0.13, 0.12, 12).rotateX(-0.6), 0, 0.82, 2.55);                            // farol de pouso (aro)
    for (const sx of [-1, 1]) {
      put('metal', new THREE.CylinderGeometry(0.06, 0.06, 3.9, 8).rotateX(Math.PI / 2), sx * 1.28, 0.07, 0.15);              // esqui
      put('metal', new THREE.CylinderGeometry(0.06, 0.06, 0.62, 8).rotateX(Math.PI / 2 - 0.6), sx * 1.28, 0.24, 2.33);         // ponta virada
      put('metal', new THREE.BoxGeometry(0.34, 0.03, 0.3), sx * 1.2, 0.38, 0.6);                                              // degrau
      for (const sz of [-0.95, 1.25]) put('metal', new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6), sx * 1.15, 0.45, sz, 0, 0, sx * 0.3);
    }
    for (const sz of [-0.95, 1.25]) put('metal', new THREE.CylinderGeometry(0.048, 0.048, 2.1, 6).rotateZ(Math.PI / 2), 0, 0.82, sz); // travessas
    const stripeM = new THREE.MeshStandardMaterial({ color: opts.stripe ?? 0xffffff, roughness: 0.35, metalness: 0.2 });
    const glassM = lo ? m.glass : new THREE.MeshPhysicalMaterial({ color: 0x1e3a4e, metalness: 0.1, roughness: 0.04, transmission: 0, transparent: true, opacity: 0.78, clearcoat: 1, envMapIntensity: 2.2 });
    const matOf = { paint, dark: m.dark, metal: m.metal, glass: glassM, stripe: stripeM };
    for (const k in B) { if (!B[k].length) continue; add(mergeGeometries(B[k]), matOf[k]); }
    this.landLight = add(new THREE.CircleGeometry(0.1, 10).rotateX(Math.PI / 2 + 0.6), m.white, 0, 0.78, 2.6);
    // rotor principal: 4 pás afinando + cubo; material próprio (fica translúcido girando rápido) + disco de desfoque
    this.rotor = new THREE.Group(); this.rotor.position.set(0, 3.42, -0.05); this.body.add(this.rotor);
    { const bl = []; for (let i = 0; i < 4; i++) { const sh = new THREE.Shape(); sh.moveTo(0.35, -0.17); sh.lineTo(5.15, -0.13); sh.lineTo(5.2, 0.1); sh.lineTo(0.35, 0.17);
        const g = new THREE.ExtrudeGeometry(sh, { depth: 0.045, bevelEnabled: false }).rotateX(Math.PI / 2).rotateY(-Math.PI / 2); g.rotateY(i * Math.PI / 2); bl.push(clean(g)); }
      bl.push(clean(new THREE.CylinderGeometry(0.34, 0.3, 0.2, 12)), clean(new THREE.SphereGeometry(0.22, 10, 6).translate(0, 0.14, 0)));
      this.bladeM = new THREE.MeshStandardMaterial({ color: 0x23262c, metalness: 0.5, roughness: 0.45, transparent: true, opacity: 1 });
      this.blades = add(mergeGeometries(bl), this.bladeM, 0, 0, 0, this.rotor);
      const tips = []; for (let i = 0; i < 4; i++) tips.push(clean(new THREE.BoxGeometry(0.3, 0.05, 0.35).translate(0, 0.01, 4.95).rotateY(i * Math.PI / 2)));
      this.tips = add(mergeGeometries(tips), stripeM, 0, 0, 0, this.rotor); }
    this.disc = add(new THREE.CircleGeometry(5.2, 48).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blurTex(), color: 0x2a2d33, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }), 0, 3.43, -0.05);
    // rotor de cauda carenado: 8 pás no anel (gira no eixo X)
    this.tail = new THREE.Group(); this.tail.position.set(0, 2.2, -7.9); this.body.add(this.tail);
    { const tg = []; for (let i = 0; i < 8; i++) tg.push(clean(new THREE.BoxGeometry(0.03, 0.66, 0.11).translate(0, 0.36, 0).rotateX(i * Math.PI / 4)));
      tg.push(clean(new THREE.CylinderGeometry(0.14, 0.14, 0.2, 10).rotateZ(Math.PI / 2))); add(mergeGeometries(tg), m.dark, 0, 0, 0, this.tail); }
    this.tailDisc = add(new THREE.CircleGeometry(0.7, 20).rotateY(Math.PI / 2), m.disc.clone(), 0, 2.2, -7.9);
    // luzes de navegação: vermelha à esquerda (+x), verde à direita, branca na cauda, faróis anticolisão em cima e embaixo
    const dot = (mat, x, y, z, col, size) => { const d = add(new THREE.SphereGeometry(0.09, 8, 6), mat, x, y, z); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); s.scale.setScalar(size); d.add(s); return { d, s }; };
    this.navL = dot(m.red, 1.4, 2.3, -6.45, 0xff3030, 2.2); this.navR = dot(m.green, -1.4, 2.3, -6.45, 0x30ff70, 2.2);
    this.strobe = dot(m.white, 0, 3.98, -8.75, 0xffffff, 3.2); this.beacon = dot(m.beacon, 0, 0.58, -0.8, 0xff2020, 2.6); this.beacon2 = dot(m.beacon, 0, 3.12, -2.1, 0xff2020, 2.4);
    // holofote: cone + mancha no chão (+ luz real só para o mais próximo, se a qualidade permitir)
    this.cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1, 1, 24, 1, true).translate(0, -0.5, 0), coneMat()); this.cone.frustumCulled = false; this.cone.visible = false;
    scene.add(this.cone);
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.spot.visible = false; this.spot.renderOrder = 3; scene.add(this.spot);
    this.searchT = new THREE.Vector3(); this.lightOn = 0;
    if (!this.ambient) this.wash = new RotorWash(scene, Q.level === 'low' ? 56 : 110);
    this.root.traverse(o => { if (o.isMesh && o.material.isMeshStandardMaterial) o.castShadow = Q.level !== 'low'; });
    // estado
    this.x = 0; this.y = 0; this.z = 0; this.h = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.vf = 0; this.yawRate = 0; this.spool = this.ambient ? 1 : 0; this.spin = 0;
    this.pitch = 0; this.roll = 0; this.driver = null; this.parked = true; this.npc = false; this.r = 1.7; this.rpm = 0; this.drift = 0; this.boosting = false; this.tune = null; this.hitT = 0; this.brakeOn = false; this.steer = 0;
    this.air = false;
  }
  place(x, z, h) { this.x = x; this.z = z; this.h = h; this.vx = this.vz = this.vy = this.vf = 0; this.y = this.floor(x, z); this.air = false; this.sync(0); }
  get speed() { return Math.hypot(this.vx, this.vz); }
  fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }
  circles() { if (this.air) return []; const [fx, fz] = this.fwd(); return [[this.x + fx * 0.8, this.z + fz * 0.8], [this.x - fx * 2.2, this.z - fz * 2.2]]; }
  // chão para pousar: terreno, píer/heliponto, tabuleiro da ponte (só por cima) ou telhado logo abaixo
  floor(x, z, y = this.y) {
    let f = airFloor(x, z, y);
    for (const b of BOXES) { if (b.boatOnly || b.h > 400) continue; if (x > b.x0 + 1 && x < b.x1 - 1 && z > b.z0 + 1 && z < b.z1 - 1 && b.h > f && b.h <= y + 1.2) f = b.h; }
    return f;
  }
  // pilotagem: inp.x gira, inp.y frente/ré, inp.up sobe, inp.down desce
  drive(dt, inp) {
    if (!this.driver && this.auto > 0) { this.auto -= dt; inp = { x: 0, y: 0, up: false, down: this.auto < 85, downK: 0.45 }; } // t390: largado no ar — paira e desce devagar
    const piloted = !!this.driver || this.auto > 0; this.spool = clamp(this.spool + (piloted ? 0.55 : -0.35) * dt, 0, 1);
    const lift = this.spool > 0.8; const fl = this.floor(this.x, this.z); const alt = this.y - fl; const airborne = alt > 0.6;
    const fwdIn = lift ? clamp(inp.y, -0.6, 1) : 0, yawIn = this.spool > 0.4 ? clamp(inp.x, -1, 1) : 0, upIn = (inp.up ? 1 : 0) - (inp.down ? (inp.downK || 1) : 0);
    const [fx, fz] = this.fwd(); const rx = -fz, rz = fx; // frente e "direita" (+x local) no mundo
    let lf = this.vx * fx + this.vz * fz, ls = this.vx * rx + this.vz * rz;
    // cíclico: o manche define a ATITUDE (bico abaixa = acelera); sem comando, nivela sozinho e faz um flare suave até pairar
    const assist = Math.abs(fwdIn) < 0.06;
    const pitchT = !airborne ? 0 : assist ? clamp(lf * 0.012, -0.12, 0.2) : clamp(fwdIn > 0 ? -fwdIn * 0.36 : -fwdIn * 0.22, -0.36, 0.22);
    this.cyc = this.cyc ?? 0; this.cyc += clamp(pitchT - this.cyc, -1.4 * dt, 1.4 * dt); // taxa de rolagem do disco (inércia)
    const thrustF = airborne ? -this.cyc * 9.8 * 1.15 : (lift && fwdIn > 0.05 ? 0.6 : 0);
    const drag = (v) => v * (0.03 + 0.0012 * Math.abs(v));
    lf += (thrustF - drag(lf)) * dt;
    // lateral: o helicóptero "carrega" a velocidade na curva (curva coordenada) e o deslize lateral morre devagar
    const coord = Math.min(1, Math.abs(lf) / 12);
    ls -= ls * Math.min(1, dt * (0.45 + 1.2 * coord));
    if (!airborne) { const dmp = upIn > 0 || Math.abs(fwdIn) > 0.05 ? 1 : 5; lf *= Math.exp(-dt * dmp); ls *= Math.exp(-dt * dmp); } // no chão: freia parado, desliza se estiver decolando
    // guinada com inércia (pedais): mais lenta em alta velocidade
    this.yawRate += (-yawIn * (1.2 - Math.min(0.5, this.speed / 90)) - this.yawRate) * (1 - Math.exp(-dt * 2.6));
    if (!lift && !airborne) this.yawRate *= Math.exp(-dt * 6);
    const dh = this.yawRate * dt; this.h += dh;
    // reprojeta a velocidade: parte acompanha o bico (curva coordenada), parte continua em linha reta (inércia)
    const [nfx, nfz] = this.fwd(); const nrx = -nfz, nrz = nfx; const keep = 1 - coord * 0.85;
    const wx = fx * lf + rx * ls, wz = fz * lf + rz * ls; const flf = nfx * lf + nrx * ls, fls = nfz * lf + nrz * ls; // velocidade girada com o bico
    const pvx = this.vx, pvz = this.vz;
    this.vx = wx * keep + flf * (1 - keep); this.vz = wz * keep + fls * (1 - keep);
    // coletivo: sobe/desce com inércia; sem comando segura a altitude; efeito solo perto do chão
    // coletivo + sustentação translacional (o rotor rende mais com vento relativo à frente, 8–25 m/s)
    const etl = clamp((Math.abs(lf) - 6) / 14, 0, 1) * (1 - clamp((Math.abs(lf) - 40) / 30, 0, 1));
    let tvy = lift ? upIn * (upIn > 0 ? 8.5 + etl * 2.5 : 6.5) : (alt > 0.2 ? -5 : 0);
    if (lift && upIn === 0 && alt < 0.5 && fwdIn > 0.05) tvy = 3; // decola sozinho ao acelerar parado no chão
    if (lift && airborne && alt < 5) tvy += 0.9 * (1 - alt / 5) * (upIn < 0 ? 0.5 : 1); // efeito solo: colchão de ar perto do chão/água
    this.vy += (tvy - this.vy) * (1 - Math.exp(-dt * 1.8));
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt, ny = this.y + this.vy * dt;
    if (ny > AIRSPACE.ceil) { this.vy = Math.min(this.vy, (AIRSPACE.ceil - ny) * 0.8); ny = Math.min(ny, AIRSPACE.ceil + 25); } // teto macio
    let impact = 0;
    const pos = { x: nx, z: nz }; const hit = heliCollide(pos, 3.2, ny + 0.5);
    if (hit) { const vn = this.vx * hit.x + this.vz * hit.z; if (vn < 0) { impact = -vn; this.vx -= 1.4 * vn * hit.x; this.vz -= 1.4 * vn * hit.z; this.vx *= 0.5; this.vz *= 0.5; this.hitT = 0.3; } nx = pos.x; nz = pos.z; }
    // por baixo da ponte: teto do tabuleiro; se não couber (rampa baixa), a lateral do tabuleiro segura (desliza junto)
    const ceil = airCeil(nx, nz, ny, 3.7);
    if (ceil != null) {
      const fUnder = airFloor(nx, nz, ny);
      if (ceil < fUnder + 0.3) { const cx = airCeil(nx, this.z, ny, 3.7), cz = airCeil(this.x, nz, ny, 3.7);
        if (cx == null || cx >= fUnder + 0.3) { nz = this.z; this.vz *= -0.2; } else if (cz == null || cz >= fUnder + 0.3) { nx = this.x; this.vx *= -0.2; } else { nx = this.x; nz = this.z; this.vx *= -0.2; this.vz *= -0.2; }
        impact = Math.max(impact, 1); this.hitT = 0.2; }
      else if (ny > ceil) { if (this.vy > 3) impact = Math.max(impact, this.vy * 0.5); ny = ceil; this.vy = Math.min(0, this.vy); }
    }
    this.x = nx; this.z = nz;
    this.outside = airBounds(this, dt); nx = this.x; nz = this.z;
    const f2 = this.floor(nx, nz, ny);
    if (ny <= f2) { if (this.vy < -4) impact = Math.max(impact, -this.vy); ny = f2; this.vy = Math.max(0, this.vy); const dmp = upIn > 0 || Math.abs(fwdIn) > 0.05 ? 1.2 : 6; this.vx *= Math.exp(-dt * dmp); this.vz *= Math.exp(-dt * dmp); }
    { const d = deckInfo(nx, nz); const under = d && ny < d.top - 1.2; const b = under ? d.under : surfaceY(nx, nz); this.washWater = b < WATER_Y + 0.2; this.washY = this.washWater ? WATER_Y : Math.max(b, f2 - 0.05); if (f2 > b + 1) this.washY = f2; }
    this.y = ny; this.air = this.y - f2 > 0.35; if (this.auto > 0 && !this.driver && !this.air && this.auto < 85) this.auto = 0;
    // atitude visível: arfagem = disco do cíclico; rolagem = curva coordenada + deslize; tudo limitado e auto-nivelado
    const [gx, gz] = this.fwd(); this.vf = this.vx * gx + this.vz * gz; const side = this.vx * -gz + this.vz * gx;
    const rollT = this.air ? clamp(-this.yawRate * Math.max(4, Math.abs(this.vf)) * 0.03 + side * 0.01, -0.5, 0.5) : 0;
    this.pitch = lerp(this.pitch, this.air ? clamp(this.cyc, -0.38, 0.25) : 0, Math.min(1, dt * 4));
    this.roll = lerp(this.roll, rollT, Math.min(1, dt * 2.5));
    if (!this.air) this.cyc *= Math.exp(-dt * 4);
    this.rpm = this.spool; this.steer = yawIn; this.hitT = Math.max(0, this.hitT - dt); this.fwdIn = fwdIn;
    this.sync(dt);
    return impact;
  }
  sync(dt) {
    const t = performance.now() / 1000;
    const hover = this.air ? Math.sin(t * 1.3 + this.x) * 0.06 : 0;
    this.root.position.set(this.x, this.y + hover, this.z); this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.spin += dt * (4 + 36 * this.spool) * (this.spool > 0.02 ? 1 : 0);
    this.rotor.rotation.set(-(this.fwdIn || 0) * 0.06, this.spin, (this.steer || 0) * 0.03); this.tail.rotation.x = this.spin * 2.6;
    this.blades.position.y = this.tips.position.y = -0.12 * (1 - this.spool); // pás "caem" um pouco paradas
    // desfoque de movimento: pás ficam translúcidas e o disco aparece conforme a rotação
    const blur = clamp((this.spool - 0.45) / 0.45, 0, 1);
    this.bladeM.opacity = 1 - blur * 0.72; this.bladeM.depthWrite = blur < 0.3; this.tips.visible = blur < 0.85;
    this.disc.material.opacity = blur * 0.3; this.disc.rotation.y = -this.spin * 0.13; this.tailDisc.material.opacity = blur * 0.22;
    if (this.wash) this.wash.update(dt, this);
  }
  // luzes: navegação sempre (mais fortes à noite), holofote só à noite
  lights(night, t, wantSpot) {
    const k = 0.35 + night * 1.2;
    for (const L of [this.navL, this.navR]) L.s.material.opacity = k * 0.9;
    const st = (t * 1.2) % 1; this.strobe.s.material.opacity = (st < 0.05 || (st > 0.12 && st < 0.17)) ? 1.4 * k : 0; this.strobe.d.visible = this.strobe.s.material.opacity > 0;
    const bc = (Math.sin(t * 6.3) > 0.55 ? 1 : 0) * k; this.beacon.s.material.opacity = bc; this.beacon2.s.material.opacity = bc; this.beacon.d.visible = this.beacon2.d.visible = bc > 0;
    const on = night > 0.35 && wantSpot !== false && (this.air || this.ambient); this.lightOn = lerp(this.lightOn, on ? 1 : 0, 0.08);
    const vis = this.lightOn > 0.02; this.cone.visible = this.spot.visible = vis;
    if (!vis) return;
    // cone sai do nariz até o ponto mirado
    const sx = this.x + Math.sin(this.h) * 2.0, sy = this.y + 0.75, sz = this.z + Math.cos(this.h) * 2.0;
    const T = this.searchT; const gy = Math.max(groundY(T.x, T.z), WATER_Y) + 0.05; T.y = gy;
    const dx = T.x - sx, dy = T.y - sy, dz = T.z - sz; const len = Math.hypot(dx, dy, dz);
    this.cone.position.set(sx, sy, sz); this.cone.scale.set(len * 0.11, len, len * 0.11);
    this.cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), new THREE.Vector3(dx / len, dy / len, dz / len));
    this.cone.material.uniforms.uI.value = this.lightOn * clamp(1.4 - len / 220, 0.25, 1);
    this.spot.position.set(T.x, gy + 0.02, T.z); this.spot.scale.setScalar(len * 0.11 + 1.5); this.spot.material.opacity = this.lightOn * clamp(1.3 - len / 200, 0.2, 0.9);
  }
  dispose(scene) { scene.remove(this.root, this.cone, this.spot); if (this.wash) this.wash.dispose(); }
}

// heliponto na praia: plataforma sobre o mar com passarela, "H", círculo e luzes de borda
export function buildHelipad(scene, Q) {
  const P = HELIPAD; const g = new THREE.Group(); scene.add(g);
  const deck = new THREE.MeshStandardMaterial({ color: 0x3b4048, roughness: 0.75, metalness: 0.1 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a7652, roughness: 0.8 });
  const paint = new THREE.MeshBasicMaterial({ color: 0xf2f2f2 }); const yellow = new THREE.MeshBasicMaterial({ color: 0xffd23f });
  PIERS.push({ x0: 368, x1: 404, z0: -202.2, z1: -197.8, y: P.y }, { x0: P.x - 13, x1: P.x + 13, z0: P.z - 13, z1: P.z + 13, y: P.y });
  const box = (w, h, d, mat, x, y, z) => { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  box(36, 0.3, 4.4, wood, 386, P.y - 0.15, -200);
  box(26, 0.4, 26, deck, P.x, P.y - 0.2, P.z);
  for (const [x, z] of [[P.x - 12, P.z - 12], [P.x + 12, P.z - 12], [P.x - 12, P.z + 12], [P.x + 12, P.z + 12], [P.x, P.z - 12], [P.x, P.z + 12], [P.x - 12, P.z], [P.x + 12, P.z]]) box(0.6, 3, 0.6, deck, x, -1.3, z);
  for (let x = 372; x < 404; x += 6) for (const z of [-202, -198]) box(0.3, 2.4, 0.3, wood, x, -1, z);
  const ring = new THREE.Mesh(new THREE.RingGeometry(8.6, 9.4, 48).rotateX(-Math.PI / 2), yellow); ring.position.set(P.x, P.y + 0.02, P.z); g.add(ring);
  // "H" (de lado para quem chega pela passarela)
  box(1.1, 0.02, 7, paint, P.x - 2.4, P.y + 0.025, P.z); box(1.1, 0.02, 7, paint, P.x + 2.4, P.y + 0.025, P.z); box(3.8, 0.02, 1.1, paint, P.x, P.y + 0.025, P.z);
  // luzes de borda (piscam à noite)
  const pts = []; for (let i = 0; i < 24; i++) { const a = i / 24 * Math.PI * 2; pts.push(P.x + Math.cos(a) * 11.6, P.y + 0.12, P.z + Math.sin(a) * 11.6); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
  const lm = new THREE.PointsMaterial({ size: 1.6, map: texes().glowTex, color: 0x40ff90, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0.5 });
  g.add(new THREE.Points(geo, lm));
  return { group: g, update(night, t) { lm.opacity = (0.25 + night * 0.9) * (0.65 + 0.35 * Math.sin(t * 3)); } };
}

// Rotas no céu (laços sobre praia, centro, baía e Glades)
const ROUTES = [
  { pts: [[300, -500], [380, -100], [330, 300], [200, 560], [60, 300], [120, -200]], alt: 85, col: 0x111111, stripe: 0x29f0ff },
  { pts: [[-300, -500], [-560, -560], [-640, -100], [-480, 300], [-260, 420], [-150, 0]], alt: 120, col: 0xf2f2f2, stripe: 0xff2d55 },
  { pts: [[-120, 440], [180, 600], [420, 300], [420, -300], [150, -620], [-120, -440]], alt: 70, col: 0x1c3d6e, stripe: 0xffd23f },
  { pts: [[-700, 0], [-900, -350], [-1050, 0], [-900, 380]], alt: 60, col: 0x2d6e3c, stripe: 0xffffff },
];
export class HeliFleet {
  constructor(G, max) {
    this.G = G; this.list = [];
    for (let i = 0; i < Math.min(max, ROUTES.length); i++) {
      const R = ROUTES[i]; const h = new Heli(G.scene, G.Q, { ambient: true, color: R.col, stripe: R.stripe });
      h.route = R; h.s = i * 0.37; h.speed0 = 26 + i * 3; h.place(R.pts[0][0], R.pts[0][1], 0); h.y = R.alt; h.air = true; h.k = 0; h.sweep = Math.random() * 6;
      this.list.push(h);
    }
  }
  at(R, s) { const n = R.pts.length; if (!isFinite(s)) s = 0; const i = ((Math.floor(s) % n) + n) % n; const f = s - Math.floor(s); const a = R.pts[(i + n - 1) % n], b = R.pts[i], c = R.pts[(i + 1) % n], d = R.pts[(i + 2) % n]; // Catmull-Rom
    const cr = (p0, p1, p2, p3) => 0.5 * ((2 * p1) + (-p0 + p2) * f + (2 * p0 - 5 * p1 + 4 * p2 - p3) * f * f + (-p0 + 3 * p1 - 3 * p2 + p3) * f * f * f);
    return [cr(a[0], b[0], c[0], d[0]), cr(a[1], b[1], c[1], d[1])]; }
  update(dt, t, night, cam) {
    const want = night > 0.35 ? this.list.length : 1; // de dia só um no ar; à noite todos
    this.list.forEach((h, i) => {
      if (i >= want) { h.cone.visible = h.spot.visible = false; h.root.visible = false; return; }
      const R = h.route; const seg = Math.hypot(R.pts[1][0] - R.pts[0][0], R.pts[1][1] - R.pts[0][1]);
      if (!(dt > 0)) dt = 0; h.s += dt * h.speed0 / Math.max(120, seg); const [x, z] = this.at(R, h.s); const [x2, z2] = this.at(R, h.s + 0.05);
      const nh = Math.atan2(x2 - x, z2 - z); const yr = angDiff(h.h, nh);
      h.yawRate = yr / Math.max(dt, 1e-3) * 0.1; h.h += yr * Math.min(1, dt * 1.5);
      h.vx = (x - h.x) / Math.max(dt, 1e-3); h.vz = (z - h.z) / Math.max(dt, 1e-3); h.x = x; h.z = z; h.y = R.alt + Math.sin(t * 0.3 + i) * 6;
      h.pitch = 0.12; h.roll = clamp(-yr * 4, -0.35, 0.35); h.air = true;
      // holofote varre a rua à frente
      h.sweep += dt * 0.5; const fx = Math.sin(h.h), fz = Math.cos(h.h);
      h.searchT.set(x + fx * 40 + Math.cos(h.sweep) * 30 * fz, 0, z + fz * 40 - Math.cos(h.sweep) * 30 * fx);
      const far = Math.hypot(x - cam.position.x, z - cam.position.z) > 900; h.root.visible = !far || night > 0.35;
      h.sync(dt); h.lights(night, t + i * 0.37, true);
    });
  }
  nearest(x, z) { let b = null, bd = 1e9; for (const h of this.list) { if (!h.root.visible) continue; const d = Math.hypot(h.x - x, h.z - z); if (d < bd) { bd = d; b = h; } } return { h: b, d: bd }; }
}
