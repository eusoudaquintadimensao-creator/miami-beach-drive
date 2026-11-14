// Céu, sol, ciclo dia/noite, clima, oceano
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { clamp, lerp, smooth, rng } from './util.js';
import { WATER_Y, SHORE_X } from './world.js';

const KEYS = [ // hora: [fog, hemiSky, hemiGround, sun, sunI, hemiI, exposure, envI]
  [0, '#0d1236', '#26306a', '#2a1c38', '#9fb4ff', 0.2, 0.45, 0.88, 0.4],
  [5.2, '#1c1f4a', '#3a3a78', '#2a2038', '#9fb0ff', 0.2, 0.42, 0.86, 0.4],
  [6.6, '#f0a08a', '#f3b3a0', '#6a4a48', '#ffb07a', 2.0, 0.42, 0.62, 0.45],
  [8.5, '#b9d4ea', '#8fc3f0', '#8a8070', '#fff1dc', 3.0, 0.55, 0.42, 0.6],
  [12, '#a9cde9', '#86bff0', '#8f8574', '#ffffff', 3.2, 0.55, 0.42, 0.6],
  [16.5, '#c9cbcf', '#9ccaf0', '#8a7a66', '#ffe2b8', 3.0, 0.55, 0.42, 0.6],
  [18.0, '#f2a774', '#f6b08c', '#7a5040', '#ff9a52', 2.8, 0.6, 0.55, 0.55],
  [18.9, '#e07a6a', '#c56a9a', '#5a3048', '#ff6a3a', 1.4, 0.6, 0.65, 0.5],
  [19.6, '#5a3a7a', '#5a4a9a', '#2a2040', '#c08aff', 0.25, 0.45, 0.76, 0.4],
  [20.5, '#161a48', '#2e3070', '#24203a', '#9fb4ff', 0.2, 0.45, 0.88, 0.4],
  [24, '#0d1236', '#26306a', '#2a1c38', '#9fb4ff', 0.2, 0.45, 0.88, 0.4],
];
const _ca = new THREE.Color(), _cb = new THREE.Color();
function sampleKeys(h) {
  let i = 0; while (i < KEYS.length - 2 && KEYS[i + 1][0] <= h) i++;
  const a = KEYS[i], b = KEYS[i + 1]; const t = smooth(0, 1, (h - a[0]) / (b[0] - a[0]));
  const col = k => _ca.set(a[k]).lerp(_cb.set(b[k]), t).clone();
  return { fog: col(1), hs: col(2), hg: col(3), sun: col(4), sunI: lerp(a[5], b[5], t), hemiI: lerp(a[6], b[6], t), exp: lerp(a[7], b[7], t), envI: lerp(a[8], b[8], t) };
}

// ondas (mesma função usada no JS para barcos)
export const WAVES = [[0.035, 0.24, 1.0, 0.25, 0.55], [0.06, 0.13, 1.6, -0.6, 0.8], [0.11, 0.06, 2.3, 0.9, 0.3], [0.021, 0.16, 0.8, 0.1, 1.0]];
export function waveH(x, z, t) {
  let y = 0; const damp = x > 330 && x < SHORE_X + 60 ? clamp((x - SHORE_X + 10) / 70, 0.15, 1) : 1;
  for (const [k, a, s, dx, dz] of WAVES) { const l = Math.hypot(dx, dz); y += Math.sin((x * dx + z * dz) / l * k * 6.283 + t * s) * a; }
  return y * damp * 0.6;
}

export function createEnv(scene, renderer, Q) {
  const E = { hour: 17.2, speed: 0.025, weather: 'limpo', wet: 0, rain: 0, cloud: 0.25, night: 0, flash: 0 };
  scene.fog = new THREE.FogExp2(0xbcd6ea, 0.0011);
  // céu
  const sky = new Sky(); sky.scale.setScalar(4500); scene.add(sky);
  const su = sky.material.uniforms; su.turbidity.value = 5; su.rayleigh.value = 1.6; su.mieCoefficient.value = 0.004; su.mieDirectionalG.value = 0.82;
  // céu para reflexos (PMREM)
  const envScene = new THREE.Scene(); const sky2 = new Sky(); sky2.scale.setScalar(50); sky2.material = sky.material; envScene.add(sky2);
  const glowBand = new THREE.Mesh(new THREE.CylinderGeometry(40, 40, 6, 32, 1, true), new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true, transparent: true }));
  { const g = glowBand.geometry; const n = g.attributes.position.count; const cols = []; const pal = [new THREE.Color(0xff3fa8), new THREE.Color(0x29f0ff), new THREE.Color(0xb45cff), new THREE.Color(0xff9a3c)];
    for (let i = 0; i < n; i++) { const x = g.attributes.position.getX(i), z = g.attributes.position.getZ(i); const a = Math.atan2(z, x); const c = pal[Math.floor(((a + Math.PI) / (Math.PI * 2)) * 12) % 4]; cols.push(c.r, c.g, c.b); }
    g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); }
  glowBand.position.y = 1; envScene.add(glowBand);
  const pmrem = new THREE.PMREMGenerator(renderer); let envRT = null;
  E.updateEnv = () => {
    glowBand.material.opacity = E.night * 0.9; glowBand.material.color.setScalar(1 + E.night * 2);
    const rt = pmrem.fromScene(envScene, 0, 0.1, 200);
    if (envRT) envRT.dispose(); envRT = rt; scene.environment = rt.texture;
  };
  // luzes
  const hemi = new THREE.HemisphereLight(0xa0d0ff, 0x806050, 0.6); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 3); scene.add(sun); scene.add(sun.target);
  if (Q.shadows) {
    sun.castShadow = true; sun.shadow.mapSize.set(Q.shadowSize, Q.shadowSize);
    const c = sun.shadow.camera; c.left = -90; c.right = 90; c.top = 90; c.bottom = -90; c.near = 1; c.far = 700;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
  }
  E.sun = sun; E.hemi = hemi;
  // estrelas e lua
  {
    const r = rng(5); const p = [];
    for (let i = 0; i < 1600; i++) { const u = r() * 2 - 1, a = r() * Math.PI * 2, y = Math.abs(u) * 0.95 + 0.05, rr = Math.sqrt(1 - y * y); p.push(Math.cos(a) * rr * 3000, y * 3000, Math.sin(a) * rr * 3000); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    E.stars = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, color: 0xffffff, transparent: true, opacity: 0, fog: false, depthWrite: false }));
    E.stars.frustumCulled = false; scene.add(E.stars);
    E.moon = new THREE.Mesh(new THREE.CircleGeometry(60, 32), new THREE.MeshBasicMaterial({ color: 0xf4f0e0, fog: false, transparent: true }));
    scene.add(E.moon);
  }
  // nuvens
  if (Q.clouds) {
    const m = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, fog: false,
      uniforms: { uT: { value: 0 }, uCover: { value: 0.3 }, uSun: { value: new THREE.Vector3() }, uSunCol: { value: new THREE.Color() }, uShade: { value: new THREE.Color() }, uNight: { value: 0 } },
      vertexShader: `varying vec2 vW; varying float vD; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW = w.xz; vD = length(w.xz-cameraPosition.xz); gl_Position = projectionMatrix*viewMatrix*w; }`,
      fragmentShader: `uniform float uT,uCover,uNight; uniform vec3 uSun,uSunCol,uShade; varying vec2 vW; varying float vD;
        float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);} 
        float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);} 
        float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.03;a*=.5;}return v;}
        void main(){ vec2 p=vW*0.0016+vec2(uT*0.004,uT*0.0015); float d=fbm(p); float c=smoothstep(1.-uCover-0.1,1.-uCover+0.25,d);
          float edge = 1.-smoothstep(1500.,3800.,vD); float light = clamp(fbm(p+uSun.xz*0.02)*1.2,0.,1.);
          vec3 col = mix(uShade, uSunCol, light*0.6+0.25); gl_FragColor = vec4(col, c*edge*0.92); }`
    });
    E.clouds = new THREE.Mesh(new THREE.PlaneGeometry(8000, 8000), m); E.clouds.rotation.x = Math.PI / 2; E.clouds.position.y = 520; scene.add(E.clouds);
    m.side = THREE.DoubleSide;
  }
  // chuva
  {
    const N = Q.level === 'low' ? 700 : 1800; const r = rng(9); const p = [], s = [];
    for (let i = 0; i < N; i++) { const x = (r() - 0.5) * 80, y = r() * 40, z = (r() - 0.5) * 80; p.push(x, y, z, x, y, z); s.push(0, 1); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aEnd', new THREE.Float32BufferAttribute(s, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uT: { value: 0 }, uCam: { value: new THREE.Vector3() }, uA: { value: 0 } },
      vertexShader: `attribute float aEnd; uniform float uT; uniform vec3 uCam; varying float vA; void main(){ vec3 p=position; p.y = mod(p.y - uT*28., 40.); p.x = mod(p.x - uCam.x + 40., 80.) - 40. + uCam.x; p.z = mod(p.z - uCam.z + 40., 80.) - 40. + uCam.z; p.y += uCam.y - 14.; p.y += aEnd*0.9; p.x += aEnd*0.12; vA = aEnd; gl_Position = projectionMatrix*viewMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform float uA; varying float vA; void main(){ gl_FragColor = vec4(0.75,0.8,0.9, uA*0.45*(0.4+vA)); }` });
    E.rainMesh = new THREE.LineSegments(g, m); E.rainMesh.frustumCulled = false; E.rainMesh.visible = false; scene.add(E.rainMesh);
  }
  // oceano / baía
  const seg = Q.level === 'low' ? 90 : Q.level === 'medium' ? 150 : 200;
  const og = new THREE.PlaneGeometry(3200, 3200, seg, seg); og.rotateX(-Math.PI / 2);
  const wv = WAVES.map(w => new THREE.Vector4(...w.slice(0, 3), 0));
  const wd = WAVES.map(w => { const l = Math.hypot(w[3], w[4]); return new THREE.Vector2(w[3] / l, w[4] / l); });
  const om = new THREE.ShaderMaterial({
    fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uT: { value: 0 }, uSun: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uZen: { value: new THREE.Color() },
      uNight: { value: 0 }, uRain: { value: 0 }, uPh: { value: new THREE.Vector4() }, uTa: { value: 0 }, uTb: { value: 0 }, uTf: { value: 0 }, uTn: { value: 0 }, uWv: { value: wv }, uWd: { value: wd }, uShore: { value: SHORE_X }, uY: { value: WATER_Y }, uDetail: { value: Q.level === 'low' ? 0 : 1 },
    }]),
    vertexShader: `uniform float uT, uShore; uniform vec4 uPh; uniform vec4 uWv[4]; uniform vec2 uWd[4]; varying vec3 vW; varying float vDamp;
      #include <fog_pars_vertex>
      void main(){ vec4 w = modelMatrix*vec4(position,1.); float damp = (w.x>330. && w.x<uShore+60.) ? clamp((w.x-uShore+10.)/70.,0.15,1.) : 1.; float y=0.;
        for(int i=0;i<4;i++){ y += sin(mod(dot(w.xz,uWd[i])*uWv[i].x, 1.)*6.2831853 + uPh[i])*uWv[i].y; }
        w.y += clamp(y,-0.6,0.6)*damp*0.6; /* nunca sobe acima do chão */ vW = w.xyz; vDamp = damp; vec4 mvPosition = viewMatrix*w; gl_Position = projectionMatrix*mvPosition;
        #include <fog_vertex>
      }`,
    fragmentShader: `uniform float uT, uNight, uRain, uShore, uY, uDetail, uTa, uTb, uTf, uTn; uniform vec4 uPh; uniform vec3 uSun, uSunCol, uHor, uZen; uniform vec4 uWv[4]; uniform vec2 uWd[4]; varying vec3 vW; varying float vDamp;
      #include <fog_pars_fragment>
      float hsh(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);} 
      float nz(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x),mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x),f.y);} 
      void main(){
        vec2 g = vec2(0.);
        for(int i=0;i<4;i++){ float k=uWv[i].x*6.2831853; g += uWd[i]*cos(mod(dot(vW.xz,uWd[i])*uWv[i].x, 1.)*6.2831853 + uPh[i])*uWv[i].y*k; }
        g *= vDamp*0.6;
        vec2 p = mod(vW.xz, 1000.)*0.35;
        g += vec2(sin(mod(vW.x*0.9, 6.2831853)+uTa+sin(mod(vW.z*0.3, 6.2831853))), cos(mod(vW.z*1.1, 6.2831853)-uTb+sin(mod(vW.x*0.25, 6.2831853))))*0.06;
        if (uDetail > 0.5) { float e=0.15; float a=nz(p+uTn*0.4), b=nz(p+vec2(e,0.)+uTn*0.4), c=nz(p+vec2(0.,e)+uTn*0.4);
          float a2=nz(p*2.7-uTn*0.6), b2=nz(p*2.7+vec2(e,0.)-uTn*0.6), c2=nz(p*2.7+vec2(0.,e)-uTn*0.6);
          g += (vec2(b-a,c-a)/e*0.16 + vec2(b2-a2,c2-a2)/e*0.09)*(1.+uRain*2.); }
        vec3 n = normalize(vec3(-g.x, 1., -g.y));
        vec3 v = normalize(cameraPosition - vW);
        float fres = (0.02 + 0.98*pow(1.-max(dot(n,v),0.),5.))*0.8;
        vec3 r = reflect(-v, n); float up = clamp(r.y,0.,1.);
        vec3 sky = mix(uHor*0.85, uZen, pow(up,0.4));
        float neon = uNight*(1.-smoothstep(0.,0.18,up))*0.55; float pk = pow(0.5+0.5*sin(vW.x*0.02+vW.z*0.01),2.); sky += neon*vec3(0.95,0.22,0.7)*pk + neon*vec3(0.08,0.65,0.9)*pow(0.5+0.5*cos(vW.z*0.017),2.)*(1.-pk);
        float depth = 1.; if (vW.x > 330.) depth = clamp((vW.x-uShore)/160.,0.,1.); else if (vW.x>25. || vW.x<-255.) depth = 0.4; else depth = 0.55;
        vec3 deep = mix(vec3(0.0,0.16,0.26), vec3(0.01,0.05,0.12), uNight);
        vec3 shallow = mix(vec3(0.08,0.62,0.6), vec3(0.02,0.12,0.18), uNight);
        vec3 water = mix(shallow, deep, depth) * (0.35 + 0.65*max(uSun.y+0.15,0.15));
        vec3 col = mix(water, sky, fres);
        float sp = pow(max(dot(r, normalize(uSun)),0.), 380.) * 8.0 + pow(max(dot(r, normalize(uSun)),0.), 40.)*0.25;
        col += uSunCol*sp*(1.-uRain*0.8);
        // espuma na arrebentação
        if (vW.x > 330.) { float d = vW.x - uShore; float f = smoothstep(14.,0.,d)*smoothstep(-6.,2.,d); float lines = smoothstep(0.55,1.,sin(d*0.55 - uTf + nz(mod(vW.xz, 1000.)*0.1)*3.)*0.5+0.5);
          float fo = clamp(f*(0.55+lines*0.8)*nz(mod(vW.xz, 1000.)*0.8+uTn*0.3)*1.6,0.,1.); col = mix(col, vec3(0.95)*(0.4+0.6*max(uSun.y+0.2,0.25)), fo); }
        col = clamp(col, 0., 6.); if (!(col.r >= 0.) || !(col.g >= 0.) || !(col.b >= 0.)) col = water; // nunca cores saturadas por estouro numérico
        gl_FragColor = vec4(col, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`
  });
  om.polygonOffset = true; om.polygonOffsetFactor = 2; om.polygonOffsetUnits = 4; // em celulares com depth de 16 bits a água (0,6 m abaixo) não "atravessa" o chão
  const ocean = new THREE.Mesh(og, om); ocean.position.y = WATER_Y; ocean.renderOrder = -1; scene.add(ocean); E.ocean = ocean;
  // poças do pântano: mesma água, menor
  E.setTime = (h) => { E.hour = ((h % 24) + 24) % 24; E._envT = -999; };
  E.setWeather = (w) => { E.weather = w; };
  let envTimer = 0; E._envT = -999;
  const sunDir = new THREE.Vector3();
  E.update = (dt, t, camPos) => {
    E.hour = (E.hour + dt * E.speed) % 24; // speed: horas de jogo por segundo real
    const h = E.hour; const K = sampleKeys(h);
    const th = (h - 6.4) / 12.6 * Math.PI;
    sunDir.set(Math.cos(th), Math.sin(th), 0.35).normalize();
    const dayAmt = smooth(-0.12, 0.2, sunDir.y);
    E.night = 1 - smooth(-0.15, 0.12, sunDir.y);
    // clima
    const targetRain = E.weather === 'chuva' ? 1 : 0, targetCloud = E.weather === 'chuva' ? 0.85 : E.weather === 'nublado' ? 0.6 : 0.25;
    E.rain += (targetRain - E.rain) * Math.min(1, dt * 0.25); E.cloud += (targetCloud - E.cloud) * Math.min(1, dt * 0.2);
    E.wet = clamp(E.wet + (E.rain > 0.3 ? dt * 0.05 : -dt * 0.012), 0, 1);
    const gray = E.rain * 0.7 + Math.max(0, E.cloud - 0.3) * 0.5;
    su.sunPosition.value.copy(sunDir).multiplyScalar(1000);
    const golden = smooth(0.45, 0.05, sunDir.y) * (1 - E.night); su.turbidity.value = 3 + golden * 5 + gray * 12; su.rayleigh.value = 2.0 + golden * 1.6 + E.night * 1.0 - gray * 1.0; su.mieCoefficient.value = 0.003 + golden * 0.006; su.mieDirectionalG.value = 0.8 + golden * 0.08;
    const fogC = K.fog.clone().lerp(new THREE.Color(0x8a96a4).multiplyScalar(0.3 + dayAmt * 0.7), gray * 0.7);
    scene.fog.color.copy(fogC); scene.fog.density = Q.fog * (1 + E.rain * 2.2 + E.cloud * 0.3);
    renderer.toneMappingExposure = K.exp * (1 - gray * 0.15) * Q.expo;
    // sol/lua
    const moon = E.night > 0.5; const ld = moon ? sunDir.clone().negate().setY(Math.abs(sunDir.y) * 0.8 + 0.3).normalize() : sunDir.clone().setY(Math.max(sunDir.y, 0.06)).normalize();
    sun.color.copy(K.sun); sun.intensity = (moon ? 0.16 : K.sunI * dayAmt) * (1 - gray * 0.75);
    sun.position.copy(camPos).addScaledVector(ld, 300); sun.target.position.copy(camPos);
    if (Q.shadows) { // estabiliza a sombra por texel
      const s = 180 / Q.shadowSize; sun.target.position.x = Math.round(sun.target.position.x / s) * s; sun.target.position.z = Math.round(sun.target.position.z / s) * s;
      sun.position.copy(sun.target.position).addScaledVector(ld, 300);
    }
    hemi.color.copy(K.hs); hemi.groundColor.copy(K.hg); hemi.intensity = K.hemiI * (1 + gray * 0.3) + E.flash * 3;
    scene.environmentIntensity = K.envI * (1 - gray * 0.3) + E.wet * 0.3;
    E.stars.material.opacity = smooth(0.3, 0.95, E.night) * (1 - E.cloud * 0.8); E.stars.position.copy(camPos);
    E.moon.position.copy(camPos).addScaledVector(sunDir.clone().negate().setY(Math.abs(sunDir.y) * 0.6 + 0.25).normalize(), 2900); E.moon.lookAt(camPos);
    E.moon.material.opacity = smooth(0.4, 0.9, E.night) * (1 - E.cloud * 0.6);
    sky.position.copy(camPos);
    if (E.clouds) { const u = E.clouds.material.uniforms; u.uT.value = t % 20000; u.uCover.value = E.cloud; u.uSun.value.copy(sunDir); u.uSunCol.value.copy(K.sun).lerp(new THREE.Color(1, 1, 1), dayAmt * 0.5).multiplyScalar(0.4 + dayAmt * 0.8); u.uShade.value.copy(K.hs).multiplyScalar(0.55 - gray * 0.25); E.clouds.position.x = camPos.x; E.clouds.position.z = camPos.z; }
    // oceano
    const ou = om.uniforms; ou.uT.value = t % 600; { const TAU = Math.PI * 2; ou.uPh.value.set((t * WAVES[0][2]) % TAU, (t * WAVES[1][2]) % TAU, (t * WAVES[2][2]) % TAU, (t * WAVES[3][2]) % TAU); ou.uTa.value = (t * 1.7) % TAU; ou.uTb.value = (t * 1.3) % TAU; ou.uTf.value = (t * 1.6) % TAU; ou.uTn.value = t % 2000; } // fases pequenas: GPUs de celular perdem precisão com sin() de números grandes ou.uSun.value.copy(moon ? ld : sunDir); ou.uSunCol.value.copy(K.sun).multiplyScalar(moon ? 0.3 : dayAmt * 1.2);
    ou.uHor.value.copy(fogC).multiplyScalar(1.05); ou.uZen.value.copy(K.hs).multiplyScalar(0.8 - E.night * 0.5); ou.uNight.value = E.night; ou.uRain.value = E.rain;
    ocean.position.x = Math.round(camPos.x / 20) * 20; ocean.position.z = Math.round(camPos.z / 20) * 20;
    // chuva
    const ru = E.rainMesh.material.uniforms; ru.uT.value = t % (4000 / 28); ru.uCam.value.copy(camPos); ru.uA.value = E.rain; E.rainMesh.visible = E.rain > 0.02;
    if (E.rain > 0.7 && Math.random() < dt * 0.04) E.flash = 1;
    E.flash = Math.max(0, E.flash - dt * 3);
    // reflexos: atualiza conforme o tempo passa
    envTimer -= dt;
    if (Q.env && (envTimer <= 0 && Math.abs(h - E._envT) > 0.25 || Math.abs(h - E._envT) > 1.5)) { envTimer = 4; E._envT = h; E.updateEnv(); }
    return K;
  };
  return E;
}
