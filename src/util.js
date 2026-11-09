import * as THREE from 'three';

export function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return (s % 1000000) / 1000000; };
}
export const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
export const angDiff = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
export const pick = (r, arr) => arr[Math.floor(r() * arr.length) % arr.length];

export function canvasTex(w, h, draw, opts = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = opts.clamp ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = opts.aniso || 4;
  if (opts.nearest) { t.magFilter = THREE.NearestFilter; }
  return t;
}

// Construtor de geometria não indexada (position, normal, uv, color)
const _v = new THREE.Vector3(), _n = new THREE.Vector3();
export class MeshBuilder {
  constructor() { this.p = []; this.n = []; this.uv = []; this.c = []; }
  get count() { return this.p.length / 3; }
  tri(a, b, c, na, nb, nc, ua, ub, uc, col) {
    this.p.push(...a, ...b, ...c); this.n.push(...na, ...nb, ...nc); this.uv.push(...ua, ...ub, ...uc);
    for (let i = 0; i < 3; i++) this.c.push(col.r, col.g, col.b);
  }
  quad(a, b, c, d, n, uvs, col) { // a b c d anti-horário vistos pela frente; col pode ser [c0,c1,c2,c3]
    if (Array.isArray(col)) {
      const P = [a, b, c, a, c, d], U = [uvs[0], uvs[1], uvs[2], uvs[0], uvs[2], uvs[3]], K = [col[0], col[1], col[2], col[0], col[2], col[3]];
      for (let i = 0; i < 6; i++) { this.p.push(...P[i]); this.n.push(...n); this.uv.push(...U[i]); this.c.push(K[i].r, K[i].g, K[i].b); }
      return;
    }
    this.tri(a, b, c, n, n, n, uvs[0], uvs[1], uvs[2], col);
    this.tri(a, c, d, n, n, n, uvs[0], uvs[2], uvs[3], col);
  }
  // caixa alinhada (com rotação Y opcional). uvScale: metros por repetição [u,v]; roof: uv fixo para topo
  box(cx, cy, cz, sx, sy, sz, col, o = {}) {
    const hx = sx / 2, hz = sz / 2, y0 = cy - sy / 2, y1 = cy + sy / 2;
    const ru = o.ry || 0, cs = Math.cos(ru), sn = Math.sin(ru);
    const T = (x, y, z) => [cx + x * cs + z * sn, y, cz - x * sn + z * cs];
    const N = (x, y, z) => [x * cs + z * sn, y, -x * sn + z * cs];
    const su = o.u || 0, sv = o.v || 0, vo = o.v0 || 0;
    const fu = (w) => su ? w / su : 1, fv = (h) => sv ? h / sv : 1;
    const colB = o.ao ? col.clone().multiplyScalar(o.ao) : col;
    const side = (p0, p1, w, n) => { // p0,p1 base corners (local)
      const uw = fu(w), vh = fv(sy);
      const a = T(p0[0], y0, p0[1]), b = T(p1[0], y0, p1[1]), c = T(p1[0], y1, p1[1]), d = T(p0[0], y1, p0[1]);
      const cc = o.ao ? [colB, colB, col, col] : col;
      this.quad(a, b, c, d, n, o.flat ? [o.flat, o.flat, o.flat, o.flat] : [[0, vo], [uw, vo], [uw, vo + vh], [0, vo + vh]], cc);
    };
    if (!o.noSides) {
      side([-hx, hz], [hx, hz], sx, N(0, 0, 1));
      side([hx, hz], [hx, -hz], sz, N(1, 0, 0));
      side([hx, -hz], [-hx, -hz], sx, N(0, 0, -1));
      side([-hx, -hz], [-hx, hz], sz, N(-1, 0, 0));
    }
    const r = typeof o.roof === 'number' && o.roof > 0 ? [o.roof, o.roof] : Array.isArray(o.roof) ? o.roof : [0.002, 0.002];
    if (!o.noTop) this.quad(T(-hx, y1, hz), T(hx, y1, hz), T(hx, y1, -hz), T(-hx, y1, -hz), [0, 1, 0], o.topUV || [r, r, r, r], o.topCol || col);
    if (o.bottom) this.quad(T(-hx, y0, -hz), T(hx, y0, -hz), T(hx, y0, hz), T(-hx, y0, hz), [0, -1, 0], [r, r, r, r], col);
  }
  // plano horizontal retangular em y
  hrect(x0, z0, x1, z1, y, col, uvScale = 0, uvRot = false) {
    const U = (x, z) => uvScale ? (uvRot ? [z / uvScale, x / uvScale] : [x / uvScale, z / uvScale]) : [0, 0];
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [0, 1, 0], [U(x0, z1), U(x1, z1), U(x1, z0), U(x0, z0)], col);
  }
  addGeo(geo, matrix, col) {
    const g = geo.index ? geo.toNonIndexed() : geo;
    const P = g.attributes.position, Nn = g.attributes.normal, UV = g.attributes.uv;
    const nm = new THREE.Matrix3().getNormalMatrix(matrix);
    for (let i = 0; i < P.count; i++) {
      _v.fromBufferAttribute(P, i).applyMatrix4(matrix); this.p.push(_v.x, _v.y, _v.z);
      if (Nn) { _n.fromBufferAttribute(Nn, i).applyMatrix3(nm).normalize(); this.n.push(_n.x, _n.y, _n.z); } else this.n.push(0, 1, 0);
      if (UV) this.uv.push(UV.getX(i), UV.getY(i)); else this.uv.push(0, 0);
      this.c.push(col.r, col.g, col.b);
    }
    if (g !== geo) g.dispose();
  }
  geometry() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.c, 3));
    g.computeBoundingSphere(); g.computeBoundingBox();
    return g;
  }
}
export const C = (hex) => new THREE.Color(hex);
