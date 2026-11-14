// Oficina Neon: personalize o carro (pintura, neon, aerofólio, kit largo, rodas, adesivo com letras)
import * as THREE from 'three';
import { TUNE_OPTS, TUNE_NAMES, TUNABLE, cleanText, randomTune, MOTOR } from './vehicles.js';
const $ = (id) => document.getElementById(id);
const css = (h) => '#' + h.toString(16).padStart(6, '0');
export const GARAGE = { x: 291, z: 60, name: 'Oficina Neon (tunagem)' };

export class Garage {
  constructor(G) { this.G = G; this.open_ = false; this.ang = 0.6; }
  get isOpen() { return this.open_; }
  open() {
    const G = this.G; const v = G.player.vehicle;
    if (!v || !TUNABLE.includes(v.type)) { G.ui.toast('Chegue de carro (esportivo, sedã, clássico, SUV ou táxi) para tunar 🔧'); return false; }
    if (v.speed > 3) { G.ui.toast('Pare na oficina para tunar'); return false; }
    this.orig = v.tune ? { ...v.tune } : null; this.origColor = v.color; this.origMotor = MOTOR.lvl;
    this.draft = v.tune ? { ...v.tune } : { paint: v.color, glow: 0xff2bd6, spoiler: 2, kit: true, rim: 0x1a1a1a, text: 'SOLARA RUSH', style: 0, accent: 0xffffff };
    this.open_ = true; G.garageOpen = true; G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
    $('garage').hidden = false; $('hud').classList.add('ghide'); $('gCar').textContent = '';
    this.apply(); this.panel(); G.audio.chime('start');
    return true;
  }
  apply() { // reconstrói o carro do jogador com o rascunho
    const G = this.G; this.draft.text = cleanText(this.draft.text);
    G.replaceVehicle(G.player.vehicle, this.draft);
    $('gCar').textContent = G.player.vehicle.spec.name;
  }
  panel() {
    const d = this.draft; const O = TUNE_OPTS;
    const sw = (key, list, off) => `<div class="sw">${list.map((c) => c == null ? `<button class="off ${d[key] == null ? 'sel' : ''}" data-k="${key}" data-v="null" title="Sem neon"></button>` : `<button style="background:${css(c)}" class="${d[key] === c ? 'sel' : ''}" data-k="${key}" data-v="${c}"></button>`).join('')}</div>`;
    const seg = (key, labels) => `<div class="seg">${labels.map((l, i) => `<button class="${(+d[key] === i) ? 'sel' : ''}" data-k="${key}" data-v="${i}">${l}</button>`).join('')}</div>`;
    $('gPanel').innerHTML = `
      <h4>Pintura</h4>${sw('paint', O.paints)}
      <h4>Neon embaixo do carro</h4>${sw('glow', O.glows)}
      <h4>Aerofólio</h4>${seg('spoiler', O.spoilers)}
      <h4>Kit de carroceria</h4>${seg('kit', ['Original', 'Largo (wide)'])}
      <h4>Rodas</h4>${sw('rim', O.rims)}
      <h4>Motor (velocidade máxima)</h4><div class="seg">${['Original', '+1', '+2', '+3 máx'].map((l, i) => `<button class="${MOTOR.lvl === i ? 'sel' : ''}" data-motor="${i}">${l}</button>`).join('')}</div>
      <p style="font-size:12px;opacity:.8;margin:2px 0 6px">Final: <b>${Math.round(this.G.player.vehicle.spec.max * (1 + MOTOR.lvl * 0.09) * 3.6)} km/h</b> · aceleração +${MOTOR.lvl * 8}%</p>
      <h4>Adesivo</h4>${seg('style', O.styles)}
      <h4>Cor do adesivo</h4>${sw('accent', [0xffffff, 0x111111, 0x29f0ff, 0xff4fb8, 0xffd23f, 0x39ff6a])}
      <h4>Texto na lateral</h4><div style="display:flex;gap:6px"><input id="gText" maxlength="14" value="${d.text || ''}" placeholder="SEU NOME" autocomplete="off" spellcheck="false"><button id="gRand" class="x" title="Sortear" style="flex:none;width:44px;height:44px">🎲</button></div>
      <div class="gAct"><button id="gExit">Sair sem salvar</button><button id="gApply">✅ Aplicar tunagem</button></div>
      <p style="font-size:12px;opacity:.7;margin:8px 0 0">Carro tunado ganha <b>nitro</b> (Shift ou botão 🔥). Tunagem grátis na Oficina Neon.</p>`;
    $('gPanel').querySelectorAll('button[data-k]').forEach((b) => b.onclick = () => {
      const k = b.dataset.k; let v = b.dataset.v; v = v === 'null' ? null : +v; if (k === 'kit') v = !!v;
      this.draft[k] = v; this.apply(); this.panel(); this.G.audio.chime('coin');
    });
    $('gPanel').querySelectorAll('button[data-motor]').forEach((b) => b.onclick = () => { MOTOR.lvl = +b.dataset.motor; this.panel(); this.G.audio.chime('coin'); });
    const inp = $('gText'); let tt = 0;
    inp.oninput = () => { const pos = inp.selectionStart; inp.value = inp.value.toUpperCase(); try { inp.setSelectionRange(pos, pos); } catch (e) { } clearTimeout(tt); tt = setTimeout(() => { this.draft.text = cleanText(inp.value); this.apply(); }, 350); };
    inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') inp.blur(); };
    $('gRand').onclick = () => { const r = randomTune(); this.draft = { ...r, text: TUNE_NAMES[Math.floor(Math.random() * TUNE_NAMES.length)] }; this.apply(); this.panel(); };
    $('gExit').onclick = () => this.close(false);
    $('gApply').onclick = () => this.close(true);
  }
  close(keep) {
    const G = this.G; const v = G.player.vehicle;
    if (keep) {
      G.save.tune = { type: v.type, ...this.draft }; G.save.motor = MOTOR.lvl; G.persist(); G.audio.chime('win');
      G.ui.big('TUNADO!'); G.ui.toast(`Seu <b>${v.spec.name}</b> ficou insano! 🔥 Aperte <b>${G.touch ? '🔥' : 'Shift'}</b> para o nitro`, 4000);
      G.feed.unshift(['@oficina.neon', `Mais um carro saindo daqui brilhando: "${this.draft.text || 'sem nome'}" ✨🔧`, 'agora']);
    } else {
      MOTOR.lvl = this.origMotor || 0;
      if (this.orig) G.replaceVehicle(v, this.orig); else G.replaceVehicle(v, null, this.origColor);
    }
    this.open_ = false; G.garageOpen = false; G.paused = false; $('garage').hidden = true; $('hud').classList.remove('ghide'); G.snapCam();
  }
  frame(dt, camera) { // câmera girando em volta do carro
    const v = this.G.player.vehicle; if (!v) return; this.ang += dt * 0.35;
    const r = 6.8, y = v.y + 1.7; camera.position.set(v.x + Math.sin(v.h + this.ang) * r, y, v.z + Math.cos(v.h + this.ang) * r);
    camera.lookAt(v.x, v.y + 0.6, v.z);
    const portrait = innerHeight > innerWidth; const f = portrait ? 78 : 50; if (Math.abs(camera.fov - f) > 0.1) { camera.fov = f; camera.updateProjectionMatrix(); }
    if (portrait) { camera.position.y += 1.2; camera.lookAt(v.x, v.y - 0.9, v.z); }
  }
}
