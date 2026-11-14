// Efeitos de corrida: fumaça dos pneus, marcas de derrapagem no asfalto, linhas de velocidade do nitro e pontuação de drift
import * as THREE from 'three';
import { surfaceY } from './world.js';
import { clamp } from './util.js';
const $ = (id) => document.getElementById(id);

export class DriftFX {
  constructor(scene, Q, renderer) {
    this.renderer = renderer; const low = Q.level === 'low';
    // fumaça (pontos com tamanho e transparência por partícula)
    const N = this.N = low ? 90 : 220;
    this.pos = new Float32Array(N * 3); this.vel = new Float32Array(N * 3); this.life = new Float32Array(N); this.max = new Float32Array(N).fill(1); this.size = new Float32Array(N); this.alpha = new Float32Array(N);
    for (let i = 0; i < N; i++) this.pos[i * 3 + 1] = -999;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 }, uCol: { value: new THREE.Color(0.85, 0.85, 0.88) } }, transparent: true, depthWrite: false,
      vertexShader: 'attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); gl_Position = projectionMatrix*mv; gl_PointSize = clamp(aSize*uScale/max(0.5,-mv.z), 0., 380.); vA = aAlpha; }',
      fragmentShader: 'uniform vec3 uCol; varying float vA; void main(){ vec2 d = gl_PointCoord-0.5; float r = length(d); if (r > 0.5) discard; float a = smoothstep(0.5, 0.05, r) * vA; gl_FragColor = vec4(uCol, a); }',
    });
    this.smoke = new THREE.Points(g, this.mat); this.smoke.frustumCulled = false; this.smoke.renderOrder = 3; scene.add(this.smoke);
    this.head = 0; this.emitAcc = [0, 0];
    // marcas de pneu
    const M = this.M = low ? 300 : 800;
    this.marks = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.28, 1).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0b0b0c, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }), M);
    this.marks.count = 0; this.marks.frustumCulled = false; this.marks.renderOrder = 1; scene.add(this.marks); this.mHead = 0; this.mN = 0; this.lastW = [null, null];
    this.m4 = new THREE.Matrix4(); this.q = new THREE.Quaternion(); this.p = new THREE.Vector3(); this.s = new THREE.Vector3(); this.up = new THREE.Vector3(0, 1, 0);
    // linhas de velocidade (camada 2D barata, funciona em qualquer qualidade gráfica)
    const c = document.createElement('canvas'); c.id = 'speedFx'; c.width = c.height = 512; const x = c.getContext('2d');
    for (let i = 0; i < 90; i++) { const a = Math.random() * Math.PI * 2, r0 = 150 + Math.random() * 110, r1 = r0 + 60 + Math.random() * 140; x.strokeStyle = `rgba(${200 + Math.random() * 55},${230 + Math.random() * 25},255,${0.25 + Math.random() * 0.5})`; x.lineWidth = 0.6 + Math.random() * 2.2; x.beginPath(); x.moveTo(256 + Math.cos(a) * r0, 256 + Math.sin(a) * r0); x.lineTo(256 + Math.cos(a) * r1, 256 + Math.sin(a) * r1); x.stroke(); }
    const hud = $('hud'); hud.insertBefore(c, hud.firstChild); this.lines = c; this.lineOp = 0;
  }
  // fumaça + marcas de pneu para carros da IA (tandem na ponte); cada carro guarda seu último ponto
  aiTrail(v, night, smokeK = 1) {
    const [fx, fz] = v.fwd(); const rx = -fz, rz = fx; const half = v.spec.w / 2 - 0.2, back = v.spec.wb / 2; const lw = v._lw || (v._lw = [null, null]);
    for (let w = 0; w < 2; w++) {
      const sd = w ? 1 : -1; const x = v.x - fx * back + rx * half * sd, z = v.z - fz * back + rz * half * sd;
      if (Math.random() < 0.55 * smokeK) this.emit(x, v.y, z, v.vx, v.vz, 0.9, night);
      const L = lw[w]; if (!L) { lw[w] = [x, z]; continue; }
      const dx = x - L[0], dz = z - L[1], d = Math.hypot(dx, dz); if (d < 0.9) continue; if (d > 6) { lw[w] = [x, z]; continue; }
      this._mark(x, z, L, dx, dz, d, v.y); lw[w] = [x, z];
    }
  }
  _mark(x, z, L, dx, dz, d, vy) {
    const y = Math.max(0, vy != null ? vy : surfaceY(x, z)) + 0.07; this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz)); this.p.set((x + L[0]) / 2, y, (z + L[1]) / 2); this.s.set(1, 1, d + 0.05);
    this.m4.compose(this.p, this.q, this.s); this.marks.setMatrixAt(this.mHead, this.m4); this.mHead = (this.mHead + 1) % this.M; this.mN = Math.min(this.M, this.mN + 1); this.marks.count = this.mN; this.marks.instanceMatrix.needsUpdate = true; this.aiMarks = (this.aiMarks || 0) + 1;
  }
  clearMarks() { this.marks.count = 0; this.mHead = 0; this.mN = 0; this.lastW = [null, null]; }
  emit(x, y, z, vx, vz, k, night, vy) {
    const i = this.head; this.head = (this.head + 1) % this.N; this.emitted = (this.emitted || 0) + 1; const j = i * 3;
    this.pos[j] = x + (Math.random() - 0.5) * 0.4; this.pos[j + 1] = y + 0.25; this.pos[j + 2] = z + (Math.random() - 0.5) * 0.4;
    this.vel[j] = vx * 0.25 + (Math.random() - 0.5) * 1.6; this.vel[j + 1] = vy != null ? vy + Math.random() * 0.8 : 0.9 + Math.random() * 1.2; this.vel[j + 2] = vz * 0.25 + (Math.random() - 0.5) * 1.6;
    this.life[i] = 0; this.max[i] = 1.4 + Math.random() * 1.2 * k; this.size[i] = 0.9; this.alpha[i] = 0;
  }
  update(dt, v, night, camera) {
    // escala dos pontos acompanha a tela e o campo de visão
    const h = this.renderer.domElement.height; this.mat.uniforms.uScale.value = h / (2 * Math.tan(camera.fov * Math.PI / 360));
    const lum = 0.32 + (1 - night) * 0.58; this.mat.uniforms.uCol.value.setRGB(lum, lum, lum * 1.04);
    if (v && !v.spec.boat && v.type !== 'heli' && v.rpm !== undefined) {
      const sp = v.speed, ang = v.driftAng || 0; const burn = v.spec.race && v.vf < 9 && v._thr > 0.9 && v.wheelspin;
      const k = clamp((ang - 0.18) * 3.2, 0, 1) * clamp((sp - 6) / 10, 0, 1) + (v.drifting ? 0.35 : 0) + (burn ? 0.6 : 0) + (v.brakeOn && v.spec.race && sp > 18 && !v.drifting ? 0.12 : 0);
      const [fx, fz] = v.fwd(); const rx = -fz, rz = fx; const half = v.spec.w / 2 - 0.2, back = v.spec.wb / 2;
      const marking = k > 0.25;
      for (let w = 0; w < 2; w++) {
        const sd = w ? 1 : -1; const x = v.x - fx * back + rx * half * sd, z = v.z - fz * back + rz * half * sd;
        if (k > 0.05) { this.emitAcc[w] += dt * (28 + 60 * k) * Math.min(1, k * 1.5); while (this.emitAcc[w] >= 1) { this.emitAcc[w] -= 1; this.emit(x, v.y, z, v.vx, v.vz, k, night); } }
        // marcas
        const L = this.lastW[w];
        if (marking) {
          if (!L) this.lastW[w] = [x, z];
          else { const dx = x - L[0], dz = z - L[1], d = Math.hypot(dx, dz); if (d > 0.7) { const y = Math.max(0, surfaceY(x, z)) + 0.068; this.q.setFromAxisAngle(this.up, Math.atan2(dx, dz)); this.p.set((x + L[0]) / 2, y, (z + L[1]) / 2); this.s.set(1, 1, d + 0.05); this.m4.compose(this.p, this.q, this.s); this.marks.setMatrixAt(this.mHead, this.m4); this.mHead = (this.mHead + 1) % this.M; this.mN = Math.min(this.M, this.mN + 1); this.marks.count = this.mN; this.marks.instanceMatrix.needsUpdate = true; this.lastW[w] = [x, z]; } }
        } else this.lastW[w] = null;
      }
    } else this.lastW = [null, null];
    // partículas
    let any = false;
    for (let i = 0; i < this.N; i++) {
      if (this.pos[i * 3 + 1] < -900) continue; any = true;
      const l = (this.life[i] += dt), t = l / this.max[i]; const j = i * 3;
      if (t >= 1) { this.pos[j + 1] = -999; this.alpha[i] = 0; continue; }
      this.vel[j] *= 1 - dt * 1.2; this.vel[j + 2] *= 1 - dt * 1.2; this.vel[j + 1] *= 1 - dt * 0.6;
      this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      this.size[i] = 0.9 + t * 4.2; this.alpha[i] = Math.min(1, l * 6) * (1 - t) * 0.5;
    }
    if (any) { const g = this.smoke.geometry; g.attributes.position.needsUpdate = g.attributes.aSize.needsUpdate = g.attributes.aAlpha.needsUpdate = true; }
    // linhas de velocidade
    const want = v && v.boosting ? 0.85 : v && v.spec && v.spec.race && v.speed > 52 ? 0.25 : 0;
    this.lineOp += (want - this.lineOp) * Math.min(1, dt * 6);
    const el = this.lines; if (this.lineOp > 0.02) { el.style.opacity = this.lineOp.toFixed(3); el.style.transform = `rotate(${(Math.random() * 360).toFixed(1)}deg) scale(${(1.02 + Math.random() * 0.06).toFixed(3)})`; el.hidden = false; } else if (!el.hidden) el.hidden = true;
  }
}

// pontuação de drift com combo (funciona no mundo aberto e nas corridas)
export class DriftScore {
  constructor(G) { this.G = G; this.chain = 0; this.combo = 1; this.grace = 0; this.total = 0; this.best = 0; this.on = false; this.el = $('drift'); this.showT = 0; }
  reset() { this.chain = 0; this.combo = 1; this.grace = 0; this.total = 0; this.best = 0; this.on = false; this.render(true); }
  update(dt, v) {
    const ok = v && !v.spec.boat && v.type !== 'heli' && v.driftAng > 0.2 && v.speed > 9 && v.vf > 0;
    if (v && v.hitT > 0.25 && this.chain > 0) { this.chain = 0; this.combo = 1; this.grace = 0; this.on = false; this.flash('💥 Combo perdido', '#ff6b6b'); }
    if (ok) {
      if (!this.on) { if (this.grace > 0 && this.chain > 0) this.combo = Math.min(5, this.combo + 1); this.on = true; }
      const deg = v.driftAng * 57.3; this.chain += Math.max(0, deg - 8) * v.speed * dt * 0.9; this.grace = 1.3;
    } else if (this.on || this.grace > 0) {
      this.on = false; this.grace -= dt;
      if (this.grace <= 0 && this.chain > 0) { const pts = Math.round(this.chain * this.combo); this.total += pts; this.best = Math.max(this.best, pts); this.flash(`+${pts.toLocaleString('pt-BR')} drift`, '#8dff9e'); if (this.onBank) this.onBank(pts); this.chain = 0; this.combo = 1; }
    }
    this.showT -= dt; this.render();
  }
  bank() { if (this.chain > 0) { const pts = Math.round(this.chain * this.combo); this.total += pts; this.best = Math.max(this.best, pts); this.flash(`+${pts.toLocaleString('pt-BR')} drift`, '#8dff9e'); } this.chain = 0; this.combo = 1; this.grace = 0; this.on = false; }
  flash(txt, col) { this.msg = [txt, col]; this.showT = 1.6; }
  render(force) {
    const el = this.el; if (!el) return;
    let html = '';
    if (this.chain > 15) { const c = Math.round(this.chain); const deg = this.G.player.vehicle ? Math.round((this.G.player.vehicle.driftAng || 0) * 57.3) : 0; const lab = deg > 40 ? 'INSANO!' : deg > 25 ? 'ÓTIMO!' : 'DRIFT'; html = `<b>${lab}</b><span>${c.toLocaleString('pt-BR')}</span>${this.combo > 1 ? `<i>x${this.combo}</i>` : ''}`; }
    else if (this.showT > 0 && this.msg) html = `<em style="color:${this.msg[1]}">${this.msg[0]}</em>`;
    if (html !== this._h || force) { el.innerHTML = html; this._h = html; el.hidden = !html; }
  }
}
