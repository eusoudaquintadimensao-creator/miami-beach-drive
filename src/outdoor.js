// Outdoors e telões (t394): anúncios dos apps do dono — outdoors nas avenidas principais, acesso à ponte, Mega Garagem
// e orla, mais telões de TV no calçadão com comerciais animados (slides com transição). Tudo num atlas de textura só
// (1 desenho por tipo), versão leve no celular. Chegue perto para ver o link do app (abre em outra aba).
import * as THREE from 'three';
import { walkable, collide, roadAt, groundY } from './world.js';

// ---- THEME (Neon Distrito troca este bloco)
const THEME = { frame: 0xf2efe8, post: 0x9aa3ad, glow: 0x29f0ff, neon: false, first: 'solara' };
// ---- fim THEME

export const ADS = [
  { id: 'solara', name: 'Solara Bay', tag: 'Mundo aberto à beira-mar · grátis no navegador', url: 'https://miami-drive-solara-2088.conhecimento-solar.workers.dev/solara-bay/', col: '#ff8a3c' },
  { id: 'neon', name: 'Neon Distrito', tag: 'Megacidade neon de 2088 · sem violência', url: 'https://miami-drive-solara-2088.conhecimento-solar.workers.dev/neon-distrito/', col: '#b45cff' },
  { id: 'sky', name: 'SOLARA SKY 2088', tag: 'Voe sobre a Miami Beach de 2088', url: 'https://solara-sky-2088.conhecimento-solar.workers.dev/', col: '#29f0ff' },
  { id: 'hc', name: 'Homem Cinza', tag: 'Comportamento, preparação e expansão de consciência', url: 'https://homem-cinza.conhecimento-solar.workers.dev/', col: '#c9d1d9' },
  { id: 'cs', name: 'Conhecimento Solar', tag: 'O portal do conhecimento: lições, Águia e a Jornada', url: 'https://eusoudaquintadimensao-creator.github.io/mestre-solar/', col: '#ffd23f' },
  { id: 'gps', name: 'Solara GPS: Miami Beach', tag: 'Mapa GPS de Miami em português · dólar e real', url: 'https://solara-gps-miami-beach.conhecimento-solar.workers.dev/', col: '#2ab3b8' },
  { id: 'md', name: 'MIAMI DRIVE SOLARA 2088', tag: 'Dois jogos de direção em mundo aberto, grátis', url: 'https://miami-drive-solara-2088.conhecimento-solar.workers.dev/', col: '#ff4fb8' },
  { id: 'vl', name: 'Vibra Língua', tag: 'Aprenda inglês ouvindo, sem gramática na frente', url: 'https://fern-fern-pearl-gem.grok.me/', col: '#46c08c' },
  { id: 'orbe', name: 'ORBE', tag: 'Geometria sagrada e tom de escuta', url: 'https://arrow-blade-slate-tiger.grok.me/', col: '#7d6cf0' },
];
const COLS = 3, ROWS = 4;
const cell = (k) => [(k % COLS) / COLS, 1 - (Math.floor(k / COLS) + 1) / ROWS]; // canto inferior esquerdo da célula no atlas (uv)
// outdoors: perto da avenida da praia, Bulevar da Baía, acesso à Ponte do Mar, Mega Garagem, hidroporto e centro
const BOARDS = [[312, -40, 0], [312, 180, 1], [288, 590, 5], [-30, 330, 2], [-312, -150, 3], [-312, 150, 4], [-540, 392, 6], [8, -410, 7], [-160, 520, 8]];
const SCREENS = [[334, -500], [334, -350], [334, -100], [334, 40], [334, 190], [334, 330], [334, 392], [334, 520]];

export class Outdoor {
  constructor(G, scene, Q) {
    this.G = G; this.Q = Q; const lo = Q.level === 'low' || !!G.touch;
    const tex = new THREE.TextureLoader().load(lo ? 'assets/ads/ads-lo.jpg' : 'assets/ads/ads.jpg'); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = Math.min(4, Q.aniso || 2); tex.generateMipmaps = true; this.tex = tex;
    const root = new THREE.Group(); root.name = 'outdoor'; scene.add(root); this.root = root;
    this.items = [];
    // ---- outdoors (painel frontal num só desenho; moldura/costas e postes também)
    const fP = [], fU = [], bP = [], posts = [];
    const quad = (P, U, cx, cy, cz, h, w, hh, k, back) => { const c = Math.cos(h), s = Math.sin(h); const pts = [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]]; const v = pts.map(([a, b]) => [cx + a * c * (back ? -1 : 1), cy + b, cz - a * s * (back ? -1 : 1)]);
      for (const i of [0, 1, 2, 0, 2, 3]) P.push(...v[i]); if (U) { const [u0, v0] = cell(k), du = 1 / COLS, dv = 1 / ROWS; const uv = [[u0, v0], [u0 + du, v0], [u0 + du, v0 + dv], [u0, v0 + dv]]; for (const i of [0, 1, 2, 0, 2, 3]) U.push(...uv[i]); } };
    const own = (k) => THEME.first === 'neon' ? (k === 0 ? 1 : k === 1 ? 0 : k) : k; // o 1º outdoor anuncia o próprio jogo
    for (const [x0, z0, k0] of BOARDS) { const k = own(k0); const sp = this.spot(x0, z0, 3.2); if (!sp) continue; const [x, z, h] = sp; const y = groundY(x, z); const off = 0.12;
      // painel 12×6 a 5 m do chão, virado para a rua (normal = (sin h, cos h))
      const fx = Math.sin(h), fz = Math.cos(h);
      quad(fP, fU, x + fx * off, y + 8, z + fz * off, h, 12, 6, k, false);
      quad(bP, null, x - fx * off, y + 8, z - fz * off, h, 12.6, 6.6, k, true);
      posts.push([x - Math.cos(h) * 4, y, z + Math.sin(h) * 4], [x + Math.cos(h) * 4, y, z - Math.sin(h) * 4]);
      this.items.push({ kind: 'board', ad: k, x, z, y: y + 8, h }); }
    const mk = (P, U) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); if (U) g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.computeVertexNormals(); g.computeBoundingSphere(); return g; };
    const front = new THREE.Mesh(mk(fP, fU), new THREE.MeshBasicMaterial({ map: tex })); front.name = 'outdoorPaineis'; root.add(front);
    const back = new THREE.Mesh(mk(bP), new THREE.MeshStandardMaterial({ color: THEME.frame, roughness: 0.6, side: THREE.DoubleSide, emissive: THEME.neon ? THEME.glow : 0, emissiveIntensity: THEME.neon ? 0.25 : 0 })); back.name = 'outdoorMolduras'; root.add(back);
    const pm = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.22, 0.28, 5.2, 8).translate(0, 2.6, 0), new THREE.MeshStandardMaterial({ color: THEME.post, metalness: 0.6, roughness: 0.4 }), Math.max(1, posts.length + SCREENS.length));
    const d = new THREE.Object3D(); let n = 0; for (const [x, y, z] of posts) { d.position.set(x, y, z); d.updateMatrix(); pm.setMatrixAt(n++, d.matrix); }
    // ---- telões de TV no calçadão (slides animados com transição)
    const sP = [], sU = [], sI = [], fr = [];
    this.screens = [];
    SCREENS.forEach(([x0, z0], i) => { const sp = this.spot(x0, z0, 2.4, true); if (!sp) return; const [x, z] = sp; const h = -Math.PI / 2; const y = groundY(x, z) + 5.6;
      const c = Math.cos(h), s = Math.sin(h); const w = 7.2, hh = 4.05; const fx = Math.sin(h) * 0.16, fz = Math.cos(h) * 0.16;
      const v = [[-w / 2, -hh / 2], [w / 2, -hh / 2], [w / 2, hh / 2], [-w / 2, hh / 2]].map(([a, b]) => [x + fx + a * c, y + b, z + fz - a * s]); const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
      for (const j of [0, 1, 2, 0, 2, 3]) { sP.push(...v[j]); sU.push(...uv[j]); sI.push(this.screens.length); }
      fr.push([x, y, z, h]); d.position.set(x, groundY(x, z), z); d.scale.set(1.3, 0.62, 1.3); d.updateMatrix(); pm.setMatrixAt(n++, d.matrix); d.scale.set(1, 1, 1);
      this.screens.push({ x, z, y, k: (i * 2 + 1) % ADS.length, nxt: (i * 2 + 2) % ADS.length, t: i * 1.3, mix: 0, fx: i % 3 }); this.items.push({ kind: 'screen', si: this.screens.length - 1, x, z, y, h }); });
    pm.count = n; pm.name = 'outdoorPostes'; root.add(pm);
    const sg = mk(sP, sU); sg.setAttribute('aI', new THREE.Float32BufferAttribute(sI, 1));
    const NS = Math.max(1, this.screens.length);
    this.uni = { map: { value: tex }, uA: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) }, uB: { value: Array.from({ length: 8 }, () => new THREE.Vector2()) }, uK: { value: new Array(8).fill(0) }, uT: { value: 0 }, uFx: { value: new Array(8).fill(0) } };
    const sm = new THREE.ShaderMaterial({ uniforms: this.uni, vertexShader: `attribute float aI; uniform vec2 uA[8]; uniform vec2 uB[8]; uniform float uK[8]; uniform float uFx[8]; varying vec2 vUv; varying vec2 vA; varying vec2 vB; varying float vK; varying float vFx; varying float vI;
      void main(){ int i = int(aI + 0.5); vA = uA[i]; vB = uB[i]; vK = uK[i]; vFx = uFx[i]; vI = aI; vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
      fragmentShader: `uniform sampler2D map; uniform float uT; varying vec2 vUv; varying vec2 vA; varying vec2 vB; varying float vK; varying float vFx; varying float vI;
      vec3 cellCol(vec2 o, vec2 uv, float z){ vec2 c = clamp((uv - 0.5) * z + 0.5, 0.004, 0.996); return texture2D(map, o + vec2(c.x / 3.0, c.y / 4.0)).rgb; }
      void main(){ float zA = 0.96 - 0.04 * vK, zB = 1.0 - 0.04 * vK; vec3 a = cellCol(vA, vUv, zA), b;
        float m; if (vFx < 0.5) { m = smoothstep(vUv.x - 0.08, vUv.x + 0.08, vK * 1.16 - 0.08); b = cellCol(vB, vUv, zB); } // limpador lateral
        else if (vFx < 1.5) { m = vK; b = cellCol(vB, vUv, zB); } // fusão
        else { float o = 1.0 - vK; if (vUv.x > o) { b = cellCol(vB, vec2(vUv.x - o, vUv.y), zB); m = 1.0; } else { b = a; a = cellCol(vA, vec2(vUv.x + vK, vUv.y), zA); m = 0.0; } } // empurra
        vec3 col = mix(a, b, m);
        col *= 0.92 + 0.08 * sin(vUv.y * 420.0 + uT * 8.0); // linhas de TV
        float e = max(abs(vUv.x - 0.5), abs(vUv.y - 0.5)); col *= 1.0 - smoothstep(0.44, 0.5, e) * 0.35;
        gl_FragColor = vec4(col * 1.08, 1.0); }`, });
    sm.toneMapped = false;
    const scr = new THREE.Mesh(sg, sm); scr.name = 'outdoorTeloes'; scr.frustumCulled = false; root.add(scr); this.scr = scr;
    // molduras dos telões (instanciadas)
    const fm = new THREE.InstancedMesh(new THREE.BoxGeometry(7.8, 4.6, 0.25), new THREE.MeshStandardMaterial({ color: 0x15181f, metalness: 0.5, roughness: 0.35, emissive: THEME.glow, emissiveIntensity: THEME.neon ? 0.35 : 0.06 }), Math.max(1, fr.length));
    fr.forEach(([x, y, z, h], i) => { d.position.set(x, y, z); d.rotation.set(0, h, 0); d.updateMatrix(); fm.setMatrixAt(i, d.matrix); }); fm.count = fr.length; fm.name = 'outdoorMoldurasTV'; root.add(fm);
    this.screens.forEach((s, i) => this._set(i));
    // cartão do link
    let el = document.getElementById('adCard'); if (!el) { el = document.createElement('div'); el.id = 'adCard'; el.hidden = true; (document.getElementById('hud') || document.body).appendChild(el); }
    this.card = el; this.cur = null; el.addEventListener('pointerdown', e => e.stopPropagation());
    if (!document.getElementById('adCss')) { const st = document.createElement('style'); st.id = 'adCss'; st.textContent = `#adCard{position:absolute;left:50%;transform:translateX(-50%);bottom:calc(var(--sab,0px) + 120px);background:rgba(8,14,26,.82);border:1px solid #fff4;border-radius:12px;padding:6px 12px;color:#fff;font-size:13px;max-width:min(360px,70vw);text-align:center;z-index:6;backdrop-filter:blur(6px);-webkit-backdrop-filter:blur(6px)}#adCard[hidden]{display:none}#adCard b{display:block;font-size:14px}#adCard a{display:inline-block;margin-top:4px;padding:5px 12px;border-radius:9px;color:#08101c;font-weight:800;text-decoration:none}body.touch.land #adCard{bottom:auto;top:calc(var(--sat,0px) + 64px);max-width:40vw}body.touch:not(.land) #adCard{bottom:auto;top:calc(var(--sat,0px) + 250px)}`; document.head.appendChild(st); }
  }
  // lugar livre perto (calçada, fora da pista e de prédios); h = virado para a via mais próxima
  spot(x, z, r, fixedH) {
    const ok = (px, pz) => { if (!walkable(px, pz)) return false; if (collide({ x: px, z: pz }, r, false, 1)) return false; const ra = roadAt(px, pz); return !ra.seg || ra.d > ra.seg.w + 2.5; };
    let best = null; if (ok(x, z)) best = [x, z]; else for (let rr = 2; rr < 40 && !best; rr += 2) for (let a = 0; a < 16; a++) { const px = x + Math.cos(a / 16 * Math.PI * 2) * rr, pz = z + Math.sin(a / 16 * Math.PI * 2) * rr; if (ok(px, pz)) { best = [px, pz]; break; } }
    if (!best) return null; if (fixedH) return [best[0], best[1], -Math.PI / 2];
    const ra = roadAt(best[0], best[1]); let h = 0; if (ra.seg) { const s = ra.seg; if (s.axis === 'z') h = s.a.x > best[0] ? Math.PI / 2 : -Math.PI / 2; else h = s.a.z > best[1] ? 0 : Math.PI; }
    return [best[0], best[1], h];
  }
  _set(i) { const s = this.screens[i]; const [ax, ay] = cell(s.k), [bx, by] = cell(s.nxt); this.uni.uA.value[i].set(ax, ay); this.uni.uB.value[i].set(bx, by); this.uni.uK.value[i] = s.mix; this.uni.uFx.value[i] = s.fx || 0; }
  update(dt, t, camera) {
    this.uni.uT.value = t % 1000;
    const cx = camera ? camera.position.x : 0, cz = camera ? camera.position.z : 0; const nearSea = Math.abs(cx - 334) < 320;
    this.scr.visible = nearSea;
    if (nearSea) this.screens.forEach((s, i) => { s.t += dt; const hold = 5.5, tr = 0.9; if (s.t > hold) { s.mix = Math.min(1, (s.t - hold) / tr); if (s.t > hold + tr) { s.k = s.nxt; s.nxt = (s.nxt + 1 + (i % 2)) % ADS.length; if (s.nxt === s.k) s.nxt = (s.k + 1) % ADS.length; s.t = 0; s.mix = 0; s.fx = (s.fx + 1) % 3; } } this._set(i); });
    // cartão do link quando perto (a pé até 16 m; de carro devagar até 26 m)
    const G = this.G, p = G.player, v = p.vehicle; let best = null, bd = 1e9; const lim = v ? (v.speed < 8 ? 26 : 0) : 16;
    if (lim) for (const it of this.items) { const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < lim && d < bd) { bd = d; best = it; } }
    const ad = best ? ADS[best.kind === 'board' ? best.ad : this.screens[best.si].k] : null;
    if (ad !== this.cur) { this.cur = ad; const el = this.card; if (!ad) el.hidden = true; else { el.innerHTML = `<b>📺 ${ad.name}</b>${ad.tag}<br><a href="${ad.url}" target="_blank" rel="noopener noreferrer" style="background:${ad.col}">Abrir o app ↗</a>`; el.hidden = false; } }
  }
}
