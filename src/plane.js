// Avião pilotável (t361): "Baía Anfíbia A1" — hidroavião anfíbio leve genérico, asa alta, monomotor a hélice na frente,
// dois flutuadores (pousa e decola na água; com rodinhas nos flutuadores também pousa em terra plana). Sem marca, sem armas.
// Física "faixa B" (pesquisa de aviação): sustentação L = k·V²·CL(α) com estol suave (CL cai depois de ~15°),
// arrasto parasita + induzido (CD0 + k·CL²), empuxo da hélice que cai com a velocidade, peso, efeito solo (meia envergadura),
// modo Assistido (padrão): segura o ângulo de ataque antes do estol, nivela asas e voo reto sem comando, curva coordenada.
import * as THREE from 'three';
import { clamp, lerp, angDiff, canvasTex } from './util.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { surfaceY, baseGroundY, PIERS, WATER_Y, addBox } from './world.js';
import { heliCollide, airFloor, airCeil, airBounds, blurTex, RotorWash, AIRSPACE } from './heli.js';

export const SEAPLANE_BASE = { x: -16.5, z: 300, h: Math.PI, name: 'Hidroporto da Baía', pier: { x0: -9, x1: 31, z0: 297.6, z1: 302.4, y: 0.3 } };
export const PLANE_SPEC = { name: 'Baía Anfíbia A1', len: 8.6, w: 11.6, max: 66, cam: 15, plane: true, air: true, boat: false, susp: 0, wb: 4 };
// números do voo (m/s, rad)
const G0 = 9.8, VS = 23, CL0 = 0.22, CLA = 4.6, A_ST = 0.27, CLMAX = CL0 + CLA * A_ST, KL = G0 / (VS * VS * CLMAX), CD0 = 0.034, KI = 0.055, KD = 0.0235;
export const PLANE_NUM = { VS, A_ST, CLMAX };
export function CL(a) { if (a <= A_ST) return Math.max(-0.9, CL0 + CLA * a); return Math.max(0.55, CLMAX - (a - A_ST) * 2.6); } // estol suave

let glowTex = null;
function glow() { if (!glowTex) glowTex = canvasTex(64, 64, (g, w, h) => { const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { clamp: true }); return glowTex; }

export class Plane {
  constructor(scene, Q, opts = {}) {
    this.Q = Q; this.scene = scene; this.type = 'plane'; this.spec = PLANE_SPEC; this.color = opts.color ?? 0xf4f6f8;
    this.root = new THREE.Group(); this.body = new THREE.Group(); this.root.add(this.body); scene.add(this.root);
    const lo = Q.level === 'low'; const seg = lo ? 14 : 24;
    const paint = lo ? new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.45, roughness: 0.32 })
      : new THREE.MeshPhysicalMaterial({ color: this.color, metalness: 0.55, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.05 });
    const stripe = new THREE.MeshStandardMaterial({ color: opts.stripe ?? 0x0a6ccf, metalness: 0.4, roughness: 0.3 });
    const accent = new THREE.MeshStandardMaterial({ color: opts.accent ?? 0xffc21a, metalness: 0.3, roughness: 0.35 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1b1d22, metalness: 0.5, roughness: 0.45 });
    const metal = new THREE.MeshStandardMaterial({ color: 0xb8bcc4, metalness: 0.85, roughness: 0.3 });
    const glass = lo ? new THREE.MeshStandardMaterial({ color: 0x24506c, metalness: 0.3, roughness: 0.06, envMapIntensity: 1.6 })
      : new THREE.MeshPhysicalMaterial({ color: 0x1e3a4e, metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.8, clearcoat: 1, envMapIntensity: 2.2 });
    this.paintM = paint;
    const B = { paint: [], stripe: [], accent: [], dark: [], metal: [], glass: [] };
    const clean = (g) => { g = g.index ? g.toNonIndexed() : g; for (const a of Object.keys(g.attributes)) if (a !== 'position' && a !== 'normal') g.deleteAttribute(a); return g; };
    const put = (k, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) => { if (rx) g.rotateX(rx); if (ry) g.rotateY(ry); if (rz) g.rotateZ(rz); g.translate(x, y, z); B[k].push(clean(g)); };
    const lathe = (prof, sx, sy, phiS = 0, phiL = Math.PI * 2, n = seg) => { const g = new THREE.LatheGeometry(prof.map(([z, r]) => new THREE.Vector2(Math.max(0.001, r), z)), n, phiS, phiL); g.rotateX(Math.PI / 2); g.scale(sx, sy, 1); return g; };
    const Y = 2.15; // linha central da fuselagem (acima dos flutuadores)
    const FUS = [[-4.9, 0.08], [-4.4, 0.2], [-3.2, 0.36], [-1.8, 0.55], [-0.6, 0.7], [0.6, 0.74], [1.6, 0.72], [2.5, 0.64], [3.2, 0.56], [3.6, 0.5], [3.75, 0.36]];
    put('paint', lathe(FUS, 1.0, 1.08), 0, Y, 0);
    put('glass', lathe(FUS.filter(([z]) => z > 0.3 && z < 2.5).map(([z, r]) => [z, r * 1.02]), 1.0, 1.08, Math.PI - 1.15, 2.3), 0, Y + 0.02, 0); // para-brisa e janelas
    put('glass', lathe(FUS.filter(([z]) => z > -1.4 && z < 0.7).map(([z, r]) => [z, r * 1.015]), 1.0, 1.08, Math.PI - 1.35, 2.7), 0, Y, 0);  // janelas da cabine
    put('dark', new THREE.CylinderGeometry(0.5, 0.52, 0.16, seg).rotateX(Math.PI / 2), 0, Y, 3.74);                            // entrada de ar do motor
    for (const sx of [-1, 1]) { put('stripe', new THREE.BoxGeometry(0.03, 0.14, 7.2), sx * 0.66, Y - 0.28, -0.6, 0, sx * -0.05, 0); // faixa azul
      put('accent', new THREE.BoxGeometry(0.03, 0.05, 6.2), sx * 0.64, Y - 0.12, -0.8, 0, sx * -0.05, 0);
      put('dark', new THREE.CylinderGeometry(0.05, 0.06, 0.3, 8).rotateX(Math.PI / 2 - 0.4), sx * 0.42, Y - 0.42, 2.9); }   // escapamentos
    // asa alta (afina para as pontas) com pontas curvadas, flapes escuros e montantes
    const wing = new THREE.Shape(); wing.moveTo(-5.8, -0.55); wing.lineTo(5.8, -0.55); wing.lineTo(5.8, 0.75); wing.lineTo(-5.8, 0.75);
    const wg = new THREE.ExtrudeGeometry(wing, { depth: 0.16, bevelEnabled: !lo, bevelThickness: 0.04, bevelSize: 0.05, bevelSegments: 2 }).rotateX(Math.PI / 2);
    put('paint', wg, 0, Y + 0.86, 0.35);
    for (const sx of [-1, 1]) { put('accent', new THREE.BoxGeometry(0.25, 0.2, 1.36), sx * 5.92, Y + 0.84, 0.45);
      put('metal', new THREE.CylinderGeometry(0.045, 0.045, 2.9, 6), sx * 1.75, Y + 0.12, 0.5, 0, 0, sx * -1.0);               // montantes da asa
      put('metal', new THREE.CylinderGeometry(0.04, 0.04, 2.9, 6), sx * 1.75, Y + 0.12, -0.3, 0, 0, sx * -1.0);
      put('stripe', new THREE.BoxGeometry(2.2, 0.03, 0.08), sx * 3.6, Y + 0.95, 1.05); }
    // cauda: deriva enflechada, estabilizador
    const fin = new THREE.Shape(); fin.moveTo(-1.2, 0); fin.lineTo(0.6, 0); fin.lineTo(-0.35, 1.55); fin.lineTo(-1.15, 1.6);
    put('paint', new THREE.ExtrudeGeometry(fin, { depth: 0.1, bevelEnabled: false }).translate(0, 0, -0.05).rotateY(-Math.PI / 2), 0, Y + 0.15, -4.1);
    put('stripe', new THREE.BoxGeometry(0.12, 0.3, 0.8), 0, Y + 1.5, -5.05);
    put('paint', new THREE.BoxGeometry(3.7, 0.08, 0.85), 0, Y + 0.22, -4.45);
    // flutuadores com quilha e degrau, e as escoras
    const FL = [[-3.1, 0.06], [-2.6, 0.2], [-1.2, 0.36], [0.6, 0.4], [2.0, 0.36], [2.9, 0.22], [3.3, 0.06]];
    for (const sx of [-1, 1]) {
      put('paint', lathe(FL, 0.95, 0.9), sx * 1.45, 0.4, 0.3);
      put('stripe', new THREE.BoxGeometry(0.06, 0.08, 5.6), sx * 1.45 + sx * 0.36, 0.42, 0.3);
      put('dark', new THREE.BoxGeometry(0.08, 0.1, 5.4), sx * 1.45, 0.03, 0.3);                                                // quilha
      for (const [z, ang] of [[1.6, 0.0], [-0.6, 0.0]]) put('metal', new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), sx * 1.05, 1.2, z, ang, 0, sx * 0.55);
      put('metal', new THREE.CylinderGeometry(0.04, 0.04, 2.3, 6).rotateX(0.95), sx * 1.2, 1.15, 0.5);
      put('dark', new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10).rotateZ(Math.PI / 2), sx * 1.45 + sx * 0.4, 0.2, 1.4);       // rodinha do anfíbio
    }
    for (const z of [1.6, -0.6]) put('metal', new THREE.CylinderGeometry(0.04, 0.04, 2.9, 6).rotateZ(Math.PI / 2), 0, 0.85, z);
    const mat = { paint, stripe, accent, dark, metal, glass };
    for (const k in B) if (B[k].length) { const m = new THREE.Mesh(mergeGeometries(B[k]), mat[k]); m.castShadow = Q.level !== 'low'; this.body.add(m); }
    // superfícies móveis (profundor e leme) para ver os comandos
    this.elev = new THREE.Group(); this.elev.position.set(0, Y + 0.22, -4.88); this.body.add(this.elev);
    this.elev.add(new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.05, 0.4).translate(0, 0, -0.2), stripe));
    this.rud = new THREE.Group(); this.rud.position.set(0, Y + 0.2, -5.1); this.body.add(this.rud);
    this.rud.add(new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.38).translate(0, 0.65, -0.19), paint));
    // hélice de 3 pás + spinner + disco de desfoque
    this.prop = new THREE.Group(); this.prop.position.set(0, Y, 3.92); this.body.add(this.prop);
    { const bl = []; for (let i = 0; i < 3; i++) bl.push(clean(new THREE.BoxGeometry(0.16, 0.95, 0.04).translate(0, 0.52, 0).rotateY(0.25).rotateZ(i * Math.PI * 2 / 3)));
      this.propM = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.4, roughness: 0.5, transparent: true });
      this.prop.add(new THREE.Mesh(mergeGeometries(bl), this.propM)); }
    { const sp = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 14).rotateX(Math.PI / 2), accent); sp.position.set(0, Y, 4.08); this.body.add(sp); }
    this.pdisc = new THREE.Mesh(new THREE.CircleGeometry(1.0, 32), new THREE.MeshBasicMaterial({ map: blurTex(), color: 0x30343a, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    this.pdisc.position.set(0, Y, 3.95); this.body.add(this.pdisc);
    // luzes: vermelha na ponta esquerda (+x), verde na direita, branca na cauda, farol anticolisão na deriva
    const dot = (col, x, y, z, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow(), color: col, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false })); s.scale.setScalar(size); s.position.set(x, y, z); this.body.add(s); return s; };
    this.navL = dot(0xff3030, 6.05, Y + 0.84, 0.45, 2.2); this.navR = dot(0x30ff70, -6.05, Y + 0.84, 0.45, 2.2); this.tailL = dot(0xffffff, 0, Y + 0.4, -5.3, 1.8); this.bcn = dot(0xff2020, 0, Y + 1.72, -5.15, 2.4);
    this.spray = new RotorWash(scene, lo ? 40 : 80);
    // estado
    this.x = 0; this.y = 0; this.z = 0; this.h = 0; this.vx = 0; this.vy = 0; this.vz = 0; this.vf = 0; this.pitch = 0; this.roll = 0; this.thr = 0; this.spin = 0; this.yawRate = 0;
    this.driver = null; this.parked = true; this.r = 2.4; this.rpm = 0; this.steer = 0; this.hitT = 0; this.drift = 0; this.boosting = false; this.tune = null; this.brakeOn = false; this.air = false;
    this.stall = false; this.aoa = 0; this.ge = 0; this.assist = true; this.maxAlt = 0;
  }
  place(x, z, h) { this.x = x; this.z = z; this.h = h; this.vx = this.vy = this.vz = this.vf = 0; this.pitch = this.roll = 0; this.thr = 0; this.y = airFloor(x, z, 50, 0.32); this.air = false; this.sync(0); }
  get speed() { return Math.hypot(this.vx, this.vz); }
  get airspeed() { return Math.hypot(this.vx, this.vy, this.vz); }
  fwd() { return [Math.sin(this.h), Math.cos(this.h)]; }
  circles() { if (this.air) return []; const [fx, fz] = this.fwd(); return [[this.x + fx * 2.2, this.z + fz * 2.2], [this.x - fx * 1.6, this.z - fz * 1.6]]; }
  floorAt(x, z, y) { let f = airFloor(x, z, y, 0.32); return f; }
  // inp: x rolagem/leme (no chão: direção), y arfagem (+ = sobe o nariz), up = mais manete, down = menos manete
  drive(dt, inp = {}) {
    if (!(dt > 0)) return 0; let impact = 0; const n = Math.max(1, Math.min(4, Math.ceil(dt / (1 / 60)))); const h = dt / n;
    for (let i = 0; i < n; i++) impact = Math.max(impact, this._step(h, inp));
    this.sync(dt); return impact;
  }
  _step(dt, inp) {
    const piloted = !!this.driver; const sx = piloted ? clamp(inp.x || 0, -1, 1) : 0, sy = piloted ? clamp(inp.y || 0, -1, 1) : 0;
    if (piloted) { if (inp.up) this.thr = Math.min(1, this.thr + dt * 0.55); if (inp.down) this.thr = Math.max(0, this.thr - dt * 0.7); } else this.thr = Math.max(0, this.thr - dt * 0.5);
    const floor = this.floorAt(this.x, this.z, this.y); const alt = this.y - floor; const onS = alt < 0.05;
    const hs = Math.hypot(this.vx, this.vz), V = Math.hypot(hs, this.vy);
    const gamma = Math.atan2(this.vy, Math.max(1, hs)); // trajetória
    // --- comandos (Assistido): arfagem por taxa, limitada pelo AoA de estol; sem comando mantém voo nivelado
    let aTrim = V > 5 ? clamp((G0 / (KL * V * V) - CL0) / CLA, -0.12, A_ST - 0.03) : 0.1;
    if (onS) { const pT = sy > 0.1 ? clamp(sy * 0.2, 0, 0.2) : 0.02; this.pitch += clamp(pT - this.pitch, -dt * 0.8, dt * 0.8); }
    else {
      let pT; if (Math.abs(sy) > 0.06) pT = this.pitch + sy * 0.75 * dt * 2.2; else pT = gamma * 0.6 + aTrim; // solto = volta a nivelar a trajetória aos poucos
      if (this.assist) pT = Math.min(pT, gamma + A_ST - 0.02); // anti-estol
      pT = clamp(pT, -0.55, 0.5); this.pitch += clamp(pT - this.pitch, -dt * 0.9, dt * 0.9);
      // estol (sem assistência ou devagar demais): nariz cai suave, sem parafuso
      if (V < VS * 0.92) this.pitch -= dt * 0.25 * (1 - V / (VS * 0.92));
    }
    const rollT = onS ? 0 : sx * 0.78; this.roll += clamp(rollT - this.roll, -dt * 1.6, dt * 1.6);
    // --- guinada: curva coordenada no ar (g·tanφ/V), direção na água/chão (leme d'água / bequilha)
    if (onS) { const k = hs < 10 ? 0.75 : 0.75 - Math.min(0.5, (hs - 10) * 0.012); this.yawRate = lerp(this.yawRate, -sx * k * Math.min(1, hs / 3 + 0.25), Math.min(1, dt * 4)); }
    else this.yawRate = lerp(this.yawRate, -G0 * Math.tan(this.roll) / Math.max(14, V), Math.min(1, dt * 3));
    this.h += this.yawRate * dt;
    // --- forças (por massa)
    const cp = Math.cos(this.pitch), f = [Math.sin(this.h) * cp, Math.sin(this.pitch), Math.cos(this.h) * cp];
    const a = this.pitch - gamma; this.aoa = a; this.ge = alt < 5.8 ? 1 - alt / 5.8 : 0;
    const cl = CL(a) * (1 + 0.28 * this.ge) * (onS && a < 0.04 ? 0.6 : 1);
    const L = KL * V * V * cl, D = KD * V * V * (CD0 + KI * (1 - 0.5 * this.ge) * cl * cl) + (a > A_ST ? KD * V * V * (a - A_ST) * 0.8 : 0);
    const T = this.thr * Math.max(0.6, 7.2 - 0.065 * V);
    this.stall = !onS && (a > A_ST + 0.01 || (V < VS * 0.95 && V > 3));
    // direção da sustentação: perpendicular à velocidade, no "teto" das asas (rolagem inclina)
    let vx = this.vx, vy = this.vy, vz = this.vz; const vn = V > 0.5 ? [vx / V, vy / V, vz / V] : [f[0], f[1], f[2]];
    const r = [Math.cos(this.h), 0, -Math.sin(this.h)]; // eixo +x local (asa esquerda) no mundo
    // vetor "para cima" do avião: up0 = r × f, girado pela rolagem em torno de f
    const u0 = [f[1] * r[2] - f[2] * r[1], f[2] * r[0] - f[0] * r[2], f[0] * r[1] - f[1] * r[0]]; const cr = Math.cos(this.roll), sr = Math.sin(this.roll);
    const up = [u0[0] * cr - r[0] * sr, u0[1] * cr - r[1] * sr, u0[2] * cr - r[2] * sr]; // rolagem + = asa direita (−x) para baixo
    const d = up[0] * vn[0] + up[1] * vn[1] + up[2] * vn[2]; let ld = [up[0] - d * vn[0], up[1] - d * vn[1], up[2] - d * vn[2]]; const ll = Math.hypot(...ld) || 1; ld = ld.map(c => c / ll);
    let ax = T * f[0] + L * ld[0] - D * vn[0], ay = T * f[1] + L * ld[1] - D * vn[1] - G0, az = T * f[2] + L * ld[2] - D * vn[2];
    if (onS) { const water = baseGroundY(this.x, this.z) < WATER_Y + 0.2 && floor < 0.2; const rr = water ? 0.5 + 0.0045 * hs * hs * (1 - Math.min(1, L / G0)) : 0.25; // arrasto da água/rodas
      if (hs > 0.05) { ax -= rr * this.vx / hs; az -= rr * this.vz / hs; } if (!piloted && hs < 0.6) { this.vx *= 0.9; this.vz *= 0.9; } }
    vx += ax * dt; vy += ay * dt; vz += az * dt;
    // deriva lateral morre (estabilidade direcional): velocidade horizontal se alinha ao bico
    { const fh = [Math.sin(this.h), Math.cos(this.h)]; const along = vx * fh[0] + vz * fh[1], side = vx * fh[1] - vz * fh[0]; const ns = side * Math.exp(-dt * (onS ? 4 : 2.2)); vx = fh[0] * along + fh[1] * ns; vz = fh[1] * along - fh[0] * ns; }
    if (vy < -28) vy = -28; // nunca "cai como pedra"
    this.vx = vx; this.vy = vy; this.vz = vz;
    let nx = this.x + vx * dt, nz = this.z + vz * dt, ny = this.y + vy * dt; let impact = 0;
    if (ny > AIRSPACE.ceil) { this.vy = Math.min(this.vy, (AIRSPACE.ceil - ny) * 0.6); }
    // prédios: toque e desvia (sem quebrar nada)
    const pos = { x: nx, z: nz }; const hit = heliCollide(pos, 4.2, ny + 0.6);
    if (hit) { const vnn = this.vx * hit.x + this.vz * hit.z; if (vnn < 0) { impact = -vnn; this.vx -= 1.5 * vnn * hit.x; this.vz -= 1.5 * vnn * hit.z; this.vx *= 0.45; this.vz *= 0.45; this.hitT = 0.4; } nx = pos.x; nz = pos.z; }
    const ceil = airCeil(nx, nz, ny, 3.3);
    if (ceil != null) { const fu = this.floorAt(nx, nz, ny); if (ceil < fu + 0.3) { nx = this.x; nz = this.z; this.vx *= -0.25; this.vz *= -0.25; impact = Math.max(impact, 1.5); this.hitT = 0.3; } else if (ny > ceil) { ny = ceil; this.vy = Math.min(0, this.vy); } }
    this.x = nx; this.z = nz; this.outside = airBounds(this, dt);
    const f2 = this.floorAt(this.x, this.z, ny);
    if (ny <= f2) {
      if (this.vy < -3.2) { impact = Math.max(impact, -this.vy); this.hardT = 1.5; }
      ny = f2; this.vy = this.vy < -4.5 ? -this.vy * 0.25 : Math.max(0, this.vy); // pouso duro quica de leve
      if (Math.abs(this.roll) > 0.05) this.roll *= 0.8;
    }
    this.y = ny; this.air = this.y - f2 > 0.4; this.maxAlt = Math.max(this.maxAlt, this.y - f2);
    this.vf = this.vx * Math.sin(this.h) + this.vz * Math.cos(this.h);
    this.hitT = Math.max(0, this.hitT - dt); this.hardT = Math.max(0, (this.hardT || 0) - dt); this.rpm = 0.15 + this.thr * 0.85 * (piloted || this.thr > 0 ? 1 : 0); this.steer = sx; this._sy = sy;
    this.onWater = !this.air && baseGroundY(this.x, this.z) < WATER_Y + 0.2 && f2 < 0.2;
    return impact;
  }
  sync(dt) {
    this.root.position.set(this.x, this.y, this.z); this.root.rotation.set(0, this.h, 0);
    this.body.rotation.set(-this.pitch, 0, this.roll, 'YXZ');
    const rpm = this.driver || this.thr > 0 ? 0.25 + this.thr * 0.75 : Math.max(0, (this._pr || 0) - dt * 0.4); this._pr = rpm;
    this.spin += dt * rpm * 55; this.prop.rotation.z = this.spin;
    const blur = clamp((rpm - 0.2) / 0.4, 0, 1); this.propM.opacity = 1 - blur * 0.8; this.pdisc.material.opacity = blur * 0.35;
    this.elev.rotation.x = -(this._sy || 0) * 0.35; this.rud.rotation.y = (this.steer || 0) * 0.35;
    // spray dos flutuadores quando corre na água
    if (this.spray) { const on = this.onWater && this.speed > 4; this.spray.update(dt, { x: this.x - Math.sin(this.h) * 1, z: this.z - Math.cos(this.h) * 1, y: on ? WATER_Y + 1 + Math.max(0, 14 - this.speed) * 0.4 : 99, vx: -this.vx * 0.5, vz: -this.vz * 0.5, spool: on ? 1 : 0, air: true, washY: WATER_Y, washWater: true }); }
  }
  lights(night, t) {
    const k = 0.35 + night * 1.2; this.navL.material.opacity = this.navR.material.opacity = k * 0.9; this.tailL.material.opacity = k * 0.7;
    const st = (t * 1.1) % 1; this.bcn.material.opacity = (st < 0.06 || (st > 0.14 && st < 0.2)) ? 1.3 * k : 0;
  }
  dispose(scene) { scene.remove(this.root); if (this.spray) this.spray.dispose(); }
}

// Hidroporto: píer de madeira saindo da orla oeste da ilha para a baía, boias marcando a pista d'água (norte–sul) e luzes
export function buildSeaplaneBase(scene, Q) {
  const S = SEAPLANE_BASE, P = S.pier; const g = new THREE.Group(); scene.add(g);
  PIERS.push({ ...P });
  const wood = new THREE.MeshStandardMaterial({ color: 0x9a7652, roughness: 0.8 }), post = new THREE.MeshStandardMaterial({ color: 0x6b513a, roughness: 0.9 });
  const box = (w, h, d, m, x, y, z) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.receiveShadow = true; g.add(o); return o; };
  box(P.x1 - P.x0, 0.3, P.z1 - P.z0, wood, (P.x0 + P.x1) / 2, P.y - 0.15, (P.z0 + P.z1) / 2);
  for (let x = P.x0 + 2; x < P.x1; x += 6) for (const z of [P.z0, P.z1]) box(0.3, 2.6, 0.3, post, x, -1.1, z);
  // placa do hidroporto
  const sign = canvasTex(256, 64, (c, w, h) => { c.fillStyle = '#0a3b66'; c.fillRect(0, 0, w, h); c.fillStyle = '#ffd23f'; c.font = 'bold 26px sans-serif'; c.textAlign = 'center'; c.fillText('✈ HIDROPORTO DA BAÍA', w / 2, 42); });
  const sm = new THREE.Mesh(new THREE.PlaneGeometry(4, 1), new THREE.MeshBasicMaterial({ map: sign, side: THREE.DoubleSide })); sm.position.set(P.x1 - 4, 2.2, P.z0 - 0.2); g.add(sm); box(0.12, 2, 0.12, post, P.x1 - 5.8, 1.1, P.z0 - 0.2); box(0.12, 2, 0.12, post, P.x1 - 2.2, 1.1, P.z0 - 0.2);
  // boias da pista d'água (norte–sul, x ≈ −90…−40)
  const buoyM = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.5, emissive: 0x401800 });
  const pts = []; for (let z = 260; z > -380; z -= 40) for (const x of [-95, -35]) pts.push([x, z]);
  const bg = new THREE.InstancedMesh(new THREE.SphereGeometry(0.45, 10, 8), buoyM, pts.length); const M4 = new THREE.Matrix4();
  pts.forEach(([x, z], i) => { M4.makeTranslation(x, WATER_Y + 0.2, z); bg.setMatrixAt(i, M4); }); g.add(bg);
  const lp = []; for (const [x, z] of pts) lp.push(x, WATER_Y + 0.9, z);
  const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(lp, 3));
  const lm = new THREE.PointsMaterial({ size: 1.5, map: glow(), color: 0xffb040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  g.add(new THREE.Points(lg, lm));
  return { group: g, update(night, t) { lm.opacity = (0.2 + night * 0.9) * (0.6 + 0.4 * Math.sin(t * 2.5)); } };
}
