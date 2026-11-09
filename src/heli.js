// Helicópteros: um pilotável no heliponto da praia e outros fazendo rotas pela cidade
// (luzes de navegação piscando e holofote à noite). Sem armas: é só passeio e vista.
import * as THREE from 'three';
import { clamp, lerp, angDiff, canvasTex } from './util.js';
import { groundY, surfaceY, BOXES, PIERS, WATER_Y, BOUNDS } from './world.js';

// colisão do helicóptero só com prédios (caixas) abaixo da altitude; palmeiras e postes ficam de fora
function heliCollide(pos, r, y) {
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
export const HELI_SPEC = { name: 'Helicóptero Brisa H1', len: 9, w: 2.4, max: 46, cam: 13, heli: true, boat: false, susp: 0, wb: 4 };

let glowTex = null, spotTex = null;
function texes() {
  if (!glowTex) glowTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  if (!spotTex) spotTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(255,250,230,1)'); gr.addColorStop(0.55, 'rgba(255,245,220,.55)'); gr.addColorStop(1, 'rgba(255,240,210,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true });
  return { glowTex, spotTex };
}
// cone de luz do holofote (aditivo, some nas bordas e no fim)
function coneMat() {
  return new THREE.ShaderMaterial({
    uniforms: { uI: { value: 0 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, fog: false,
    vertexShader: 'varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform float uI; varying vec2 vUv; varying vec3 vN; varying vec3 vV; void main(){ float edge = pow(abs(dot(vN, vV)), 1.6); float a = uI * edge * (0.15 + 0.85 * vUv.y) * 0.22; gl_FragColor = vec4(vec3(1.0,0.96,0.86)*a, a); }',
  });
}

const M = {};
function mats() {
  if (M.ok) return M; M.ok = true;
  M.glass = new THREE.MeshStandardMaterial({ color: 0x0c1a28, metalness: 0.7, roughness: 0.08, envMapIntensity: 1.4 });
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
    const paint = new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.45, roughness: 0.32 }); this.paint = paint;
    const add = (geo, mat, x = 0, y = 0, z = 0, parent = this.body) => { const o = new THREE.Mesh(geo, mat); o.position.set(x, y, z); parent.add(o); return o; };
    add(new THREE.SphereGeometry(1, 22, 14).scale(1.2, 1.1, 2.15), paint, 0, 1.75, 0.2);
    add(new THREE.SphereGeometry(1, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1.08, 0.95, 1.5).rotateX(1.25), m.glass, 0, 1.95, 1.05);
    add(new THREE.BoxGeometry(2.0, 0.16, 2.6), m.dark, 0, 0.82, 0.1);
    const stripe = add(new THREE.BoxGeometry(2.46, 0.14, 3.2), new THREE.MeshStandardMaterial({ color: opts.stripe ?? 0xffffff, roughness: 0.4 }), 0, 1.45, -0.2);
    add(new THREE.CylinderGeometry(0.34, 0.14, 5.4, 12).rotateX(Math.PI / 2), paint, 0, 2.0, -3.7);
    add(new THREE.BoxGeometry(0.14, 1.5, 1.0).translate(0, 0.45, 0), paint, 0, 2.15, -6.25);
    add(new THREE.BoxGeometry(1.8, 0.07, 0.5), paint, 0, 2.0, -5.6);
    add(new THREE.CylinderGeometry(0.42, 0.55, 0.45, 12), m.dark, 0, 2.9, 0);
    for (const sx of [-1, 1]) {
      add(new THREE.CylinderGeometry(0.07, 0.07, 4.4, 8).rotateX(Math.PI / 2), m.metal, sx * 1.15, 0.1, 0.2);
      for (const sz of [-0.9, 1.2]) add(new THREE.CylinderGeometry(0.05, 0.05, 0.85, 6).rotateZ(sx * 0.35), m.metal, sx * 0.98, 0.48, sz);
    }
    // rotor principal e de cauda
    this.rotor = new THREE.Group(); this.rotor.position.set(0, 3.18, 0); this.body.add(this.rotor);
    for (let i = 0; i < 4; i++) { const b = add(new THREE.BoxGeometry(0.3, 0.04, 5.5).translate(0, 0, 2.75), m.dark, 0, 0, 0, this.rotor); b.rotation.y = i * Math.PI / 2; }
    this.disc = add(new THREE.CircleGeometry(5.7, 36).rotateX(-Math.PI / 2), m.disc.clone(), 0, 3.17, 0);
    this.tail = new THREE.Group(); this.tail.position.set(0.18, 2.55, -6.25); this.body.add(this.tail);
    for (let i = 0; i < 2; i++) { const b = add(new THREE.BoxGeometry(0.04, 1.4, 0.14), m.dark, 0, 0, 0, this.tail); b.rotation.x = i * Math.PI / 2; }
    // luzes de navegação: vermelha à esquerda, verde à direita, branca na cauda, farol vermelho no topo
    const dot = (mat, x, y, z, col, size) => { const d = add(new THREE.SphereGeometry(0.09, 8, 6), mat, x, y, z); const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); s.scale.setScalar(size); d.add(s); return { d, s }; };
    this.navL = dot(m.red, 1.25, 1.55, 0.4, 0xff3030, 2.2); this.navR = dot(m.green, -1.25, 1.55, 0.4, 0x30ff70, 2.2);
    this.strobe = dot(m.white, 0, 2.95, -6.6, 0xffffff, 3.2); this.beacon = dot(m.beacon, 0, 0.7, -1.0, 0xff2020, 2.6); this.beacon2 = dot(m.beacon, 0, 3.0, -0.45, 0xff2020, 2.4);
    // holofote: cone + mancha no chão (+ luz real só para o mais próximo, se a qualidade permitir)
    this.cone = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 1, 1, 24, 1, true).translate(0, -0.5, 0), coneMat()); this.cone.frustumCulled = false; this.cone.visible = false;
    scene.add(this.cone);
    this.spot = new THREE.Mesh(new THREE.CircleGeometry(1, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: spotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, opacity: 0, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.spot.visible = false; this.spot.renderOrder = 3; scene.add(this.spot);
    this.searchT = new THREE.Vector3(); this.lightOn = 0;
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
  // chão para pousar: terreno, píer/heliponto ou telhado logo abaixo
  floor(x, z) {
    let f = Math.max(surfaceY(x, z), WATER_Y + 0.6);
    for (const b of BOXES) { if (b.boatOnly || b.h > 400) continue; if (x > b.x0 + 1 && x < b.x1 - 1 && z > b.z0 + 1 && z < b.z1 - 1 && b.h > f && b.h <= this.y + 1.2) f = b.h; }
    return f;
  }
  // pilotagem: inp.x gira, inp.y frente/ré, inp.up sobe, inp.down desce
  drive(dt, inp) {
    const piloted = !!this.driver; this.spool = clamp(this.spool + (piloted ? 0.55 : -0.35) * dt, 0, 1);
    const lift = this.spool > 0.8; const fl = this.floor(this.x, this.z); const alt = this.y - fl;
    const fwdIn = lift ? clamp(inp.y, -0.5, 1) : 0, yawIn = this.spool > 0.4 ? inp.x : 0, upIn = (inp.up ? 1 : 0) - (inp.down ? 1 : 0);
    // inércia: velocidade horizontal persegue o alvo devagar (dá aquela "deriva" de helicóptero)
    const [fx, fz] = this.fwd(); const tv = fwdIn * this.spec.max * (alt > 1.5 ? 1 : 0.15);
    const k = 1 - Math.exp(-dt * (Math.abs(fwdIn) > 0.05 ? 0.75 : 0.45));
    const pvx = this.vx, pvz = this.vz;
    this.vx += (fx * tv - this.vx) * k; this.vz += (fz * tv - this.vz) * k;
    this.yawRate += (-yawIn * (1.25 - Math.min(0.5, this.speed / 90)) - this.yawRate) * (1 - Math.exp(-dt * 3));
    this.h += this.yawRate * dt;
    let tvy = lift ? upIn * (upIn > 0 ? 9 : 7) : (alt > 0.2 ? -5 : 0);
    if (lift && upIn === 0 && alt < 0.5 && Math.abs(fwdIn) > 0.05) tvy = 3; // decola sozinho ao acelerar parado no chão
    this.vy += (tvy - this.vy) * (1 - Math.exp(-dt * 2.2));
    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt, ny = this.y + this.vy * dt;
    if (ny > 260) { ny = 260; this.vy = Math.min(0, this.vy); }
    let impact = 0;
    // prédios: colide de lado se estiver abaixo do topo
    const pos = { x: nx, z: nz }; const hit = heliCollide(pos, 3.0, ny + 0.5);
    if (hit) { const vn = this.vx * hit.x + this.vz * hit.z; if (vn < 0) { impact = -vn; this.vx -= 1.4 * vn * hit.x; this.vz -= 1.4 * vn * hit.z; this.vx *= 0.5; this.vz *= 0.5; this.hitT = 0.3; } nx = pos.x; nz = pos.z; }
    nx = clamp(nx, BOUNDS.x0 - 200, BOUNDS.x1 + 450); nz = clamp(nz, BOUNDS.z0 - 250, BOUNDS.z1 + 250);
    this.x = nx; this.z = nz;
    const f2 = this.floor(nx, nz);
    if (ny <= f2) { if (this.vy < -4) impact = Math.max(impact, -this.vy); ny = f2; this.vy = Math.max(0, this.vy); this.vx *= Math.exp(-dt * 6); this.vz *= Math.exp(-dt * 6); }
    this.y = ny; this.air = this.y - f2 > 0.35;
    // atitude: bico abaixa ao acelerar, inclina nas curvas
    const lf = this.vx * fx + this.vz * fz; const af = ((this.vx - pvx) * fx + (this.vz - pvz) * fz) / Math.max(dt, 1e-3);
    this.vf = lf;
    this.pitch = lerp(this.pitch, this.air ? clamp(lf * 0.006 + af * 0.03, -0.3, 0.38) : 0, Math.min(1, dt * 3));
    this.roll = lerp(this.roll, this.air ? clamp(-this.yawRate * Math.max(6, this.speed) * 0.012, -0.45, 0.45) : 0, Math.min(1, dt * 3));
    this.rpm = this.spool; this.steer = yawIn; this.hitT = Math.max(0, this.hitT - dt);
    this.sync(dt);
    return impact;
  }
  sync(dt) {
    const t = performance.now() / 1000;
    const hover = this.air ? Math.sin(t * 1.3 + this.x) * 0.06 : 0;
    this.root.position.set(this.x, this.y + hover, this.z); this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(this.pitch, 0, this.roll);
    this.spin += dt * (4 + 36 * this.spool) * (this.spool > 0.02 ? 1 : 0);
    this.rotor.rotation.y = this.spin; this.tail.rotation.x = this.spin * 1.7;
    this.disc.material.opacity = this.spool > 0.6 ? 0.1 + 0.08 * this.spool : 0;
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
  dispose(scene) { scene.remove(this.root, this.cone, this.spot); }
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
