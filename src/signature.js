// Veículo assinatura de cada personagem jogável + "Chamar veículo" (chega pela rua, perto de você)
import { Vehicle, SPECS } from './vehicles.js';
import { SEGS, drivable, isWaterDeep, collide, inTrackZone, surfaceY, roadAt } from './world.js';
import { clamp, lerp } from './util.js';
import * as THREE from 'three';

// cores e letreiros originais (nada de marcas reais)
export const SIGNATURE = {
  ela: { type: 'sport', name: 'Flecha Rosa', tune: { paint: 0xff4f8b, accent: 0xffffff, glow: 0xff2bd6, rim: 0xffffff, text: 'LUNA', style: 0, spoiler: 1, kit: true } },
  ele: { type: 'moto', name: 'Raio Ciano', tune: { paint: 0x19c3e6, accent: 0x111111, glow: 0x29f0ff, rim: 0x111111, text: 'DAVI', style: 1 } },
  teia: { type: 'moto', name: 'Moto Teia Neon', tune: { paint: 0x0f5f5a, accent: 0x9cff3a, glow: 0x9cff3a, rim: 0x111111, text: 'TEIA NEON', style: 2 } },
  solar: { type: 'rc_hyper', name: 'Hiper Solar', tune: { paint: 0xffc61a, accent: 0xffffff, glow: 0xff9a3c, rim: 0xffffff, text: 'SOLAR', style: 1, kit: true, spoiler: 0, num: 1 } },
  colosso: { type: 'pickup', name: 'Caminhonete Colosso', tune: { paint: 0x2f9e44, accent: 0x1c1c1e, glow: 0x7dff6a, rim: 0x1a1a1a, text: 'COLOSSO', style: 0, spoiler: 0, kit: true } },
  sentinela: { type: 'rc_muscle', name: 'Muscle Sentinela', tune: { paint: 0x1b2a4a, accent: 0xc8ccd0, glow: 0x4fb3ff, rim: 0xc8ccd0, text: 'SENTINELA', style: 0, kit: true, spoiler: 0, num: 5 } },
  ferreo: { type: 'rc_gt', name: 'GT Férreo', tune: { paint: 0x3a3d44, accent: 0xff6a2a, glow: 0xff6a2a, rim: 0x1a1a1a, text: 'FÉRREO', style: 2, kit: true, spoiler: 0, num: 8 } },
  tita: { type: 'rc_jdm', name: 'JDM Titã', tune: { paint: 0x5b2a9e, accent: 0xff4fb8, glow: 0xb36bff, rim: 0xff4fb8, text: 'TITÃ', style: 1, kit: true, spoiler: 0, num: 9 } },
};
export const sigOf = (id) => SIGNATURE[id] || SIGNATURE.ela;
export function makeSignature(G, id) { const S = sigOf(id); const v = new Vehicle(S.type, G.scene, G.Q, undefined, { ...S.tune, type: S.type }); v.sig = id; v.sigName = S.name; return v; }

const tmp = new THREE.Vector3();
// procura um ponto na faixa de uma rua a 12–30 m, livre de prédios, água e carros
export function roadSpot(G, x, z) {
  const others = G.vehicles.concat(G.traffic ? G.traffic.cars : []); let best = null, bs = 1e9;
  const free = (px, pz) => { if (!drivable(px, pz) || isWaterDeep(px, pz) || inTrackZone(px, pz, 10)) return false; tmp.set(px, 0, pz); if (collide(tmp, 2.4, false, 1)) return false; for (const o of others) if (o !== G.sigCar && Math.hypot(o.x - px, o.z - pz) < 7) return false; return true; };
  for (const s of SEGS) {
    const zA = s.axis === 'z'; const lo = zA ? Math.min(s.a.z, s.b.z) : Math.min(s.a.x, s.b.x), hi = zA ? Math.max(s.a.z, s.b.z) : Math.max(s.a.x, s.b.x);
    const c = zA ? s.a.x : s.a.z, along = zA ? z : x, perp = zA ? x - c : z - c; if (Math.abs(perp) > 85) continue;
    for (const dA of [0, 8, -8, 16, -16, 24, -24]) {
      const t = clamp(along + dA, lo + 6, hi - 6); if (hi - lo < 14) continue; const side = perp >= 0 ? 1 : -1; const off = side * ((s.w || 7) > 6 ? 5.2 : 3.4);
      const px = zA ? c + off : t, pz = zA ? t : c + off; const d = Math.hypot(px - x, pz - z); if (d < 9 || d > 90) continue;
      if (!free(px, pz)) continue; const sc = Math.abs(d - 16); if (sc < bs) { bs = sc; const dir = (dA >= 0 ? 1 : -1); const h = zA ? (dir > 0 ? 0 : Math.PI) : (dir > 0 ? Math.PI / 2 : -Math.PI / 2);
        const back = 30; let sx = zA ? px : clamp(t - dir * back, lo, hi), sz = zA ? clamp(t - dir * back, lo, hi) : pz; best = { x: px, z: pz, h, sx, sz }; }
    }
  }
  if (best) return best;
  // fora das ruas (praia, glades): um lugar aberto em terra firme
  for (const r of [10, 16, 24]) for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; const px = x + Math.sin(a) * r, pz = z + Math.cos(a) * r; if (free(px, pz)) { const h = Math.atan2(x - px, z - pz); return { x: px, z: pz, h, sx: px - Math.sin(h) * 18, sz: pz - Math.cos(h) * 18 }; } }
  return null;
}

// ponto ~5 m À FRENTE do personagem, livre (chão firme, sem prédio/água/carro); o carro chega de lado, cruzando à frente
export function frontSpot(G, p) {
  const others = G.vehicles.concat(G.traffic ? G.traffic.cars.filter(c => c.active) : []);
  const free = (px, pz) => { if (!drivable(px, pz) || isWaterDeep(px, pz) || inTrackZone(px, pz, 4)) return false; tmp.set(px, 0, pz); if (collide(tmp, 1.5, false, 0.5)) return false; for (const o of others) if (o !== G.sigCar && Math.hypot(o.x - px, o.z - pz) < 4.6) return false; return true; };
  for (const d of [5, 5.5, 4.6, 6, 6.8]) for (const da of [0, 0.25, -0.25, 0.5, -0.5, 0.8, -0.8]) {
    const a = p.h + da; const px = p.x + Math.sin(a) * d, pz = p.z + Math.cos(a) * d;
    if (!free(px, pz)) continue;
    let h = a + Math.PI / 2; const rd = roadAt(px, pz);
    if (rd && rd.seg && rd.d < (rd.seg.w || 7) + 1) { const zA = rd.seg.axis === 'z'; h = zA ? (Math.cos(h) >= 0 ? 0 : Math.PI) : (Math.sin(h) >= 0 ? Math.PI / 2 : -Math.PI / 2); }
    // escolhe o sentido de chegada cujo caminho não passa pelo personagem (vem cruzando ou vem de frente e para)
    for (const hh of [h, h + Math.PI]) {
      const hx = Math.sin(hh), hz = Math.cos(hh);
      if (!free(px + hx * 1.5, pz + hz * 1.5) || !free(px - hx * 1.5, pz - hz * 1.5)) continue;
      if (Math.hypot(px + hx * 1.5 - p.x, pz + hz * 1.5 - p.z) < 3.4 || Math.hypot(px - hx * 1.5 - p.x, pz - hz * 1.5 - p.z) < 3.4) continue;
      let back = 22; while (back > 6 && !drivable(px - hx * back, pz - hz * back)) back -= 4;
      const sx = px - hx * back, sz = pz - hz * back;
      // distância do personagem ao trajeto (segmento início→parada)
      const ux = px - sx, uz = pz - sz, L2 = ux * ux + uz * uz || 1, tt = clamp(((p.x - sx) * ux + (p.z - sz) * uz) / L2, 0, 1);
      if (Math.hypot(sx + ux * tt - p.x, sz + uz * tt - p.z) < 3) continue;
      return { x: px, z: pz, h: hh, sx, sz, front: d };
    }
  }
  return null;
}
export function finishCarCall(G) { const C = G.carCall; if (!C) return; C.t = C.dur; C.quiet = true; updateCarCall(G, 1 / 60); }
export function callCar(G, id) {
  const p = G.player; if (G.race && G.race.active) { G.ui.toast('🏁 Termine a corrida antes de chamar o veículo', 2200); return false; }
  const S = sigOf(id);
  if (p.vehicle && p.vehicle === G.sigCar) { G.ui.toast(`🚘 Você já está no ${S.name}`, 1600); return false; }
  if (p.vehicle && p.vehicle.spec.boat) { G.ui.toast('🚘 Volte para a terra firme para chamar o veículo', 2200); return false; }
  if (p.vehicle) G.leaveCar(); if (G.jet && G.jet.on && p.y - surfaceY(p.x, p.z) > 2) { G.ui.toast('🚘 Pouse antes de chamar o veículo', 1800); return false; }
  const spot = frontSpot(G, p) || roadSpot(G, p.x, p.z); if (!spot) { G.ui.toast('🚘 Nenhuma rua livre por perto. Vá para uma rua ou estacionamento', 2800); return false; }
  let v = G.sigCar; if (v && (v.sig !== id || G.vehicles.indexOf(v) < 0 || v.driver)) { const i = G.vehicles.indexOf(v); if (i >= 0 && !v.driver) { G.vehicles.splice(i, 1); v.dispose(G.scene); } v = null; }
  if (!v) { v = makeSignature(G, id); G.vehicles.push(v); G.sigCar = v; }
  v.nitro = 1; v.parked = true; v.place(spot.sx, spot.sz, spot.h); G.carCall = { ...spot, t: 0, dur: spot.front ? 2.2 : 2.6, v };
  G.ui.toast(`🚘 ${S.name} a caminho!`, 2200); G.audio.chime && G.audio.chime('start'); return true;
}
export function updateCarCall(G, dt) {
  const C = G.carCall; if (!C) return; const v = C.v; if (v.driver || G.vehicles.indexOf(v) < 0) { G.carCall = null; return; }
  C.t += dt; const k = clamp(C.t / C.dur, 0, 1), e = 1 - (1 - k) ** 2; const px = v.x, pz = v.z;
  v.x = lerp(C.sx, C.x, e); v.z = lerp(C.sz, C.z, e); v.h = C.h; v.y = surfaceY(v.x, v.z); const sp = Math.hypot(v.x - px, v.z - pz) / Math.max(dt, 1e-3);
  v.spin = (v.spin || 0) + sp * dt / v.spec.wr; v.brakeOn = k > 0.6; v.sync(dt);
  if (k >= 1) { G.carCall = null; v.brakeOn = false; v.sync(0); if (!C.quiet) G.ui.toast(`🚘 ${v.sigName} chegou! ${G.touch ? 'Toque em 🚗 Entrar' : 'Aperte E para entrar'}`, 2600); }
}
