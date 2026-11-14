// Dirigibilidade no celular: três modos (Tocar, Inclinar, Volante virtual),
// swipe pra cima = nitro, pra baixo = drift; limitador, freio e ré em vidro.
// Tela CONTROLES com três cartões originais. Preferência numa chave nova de localStorage.
// Disciplinas: input-systems (zona morta radial, reescala, ações em vez de teclas,
// acessibilidade: modos alternativos, ré por toque, sem acordes), game-feel (fade,
// vibração curta, botão com feedback), game-ui-ux (área segura, alvos ≥ 44 px, centro livre).
import { clamp } from './util.js';

export const DRIVE_KEY = 'mbd-dirigir-v1';
const MODES = ['tocar', 'inclinar', 'volante'];
const DEAD = 0.14;

function $(id) { return document.getElementById(id); }
function load() {
  try { const o = JSON.parse(localStorage.getItem(DRIVE_KEY) || '{}'); return { mode: MODES.includes(o.mode) ? o.mode : 'tocar', cruise: clamp(+o.cruise || 0.72, 0.18, 1), cal: o.cal || null }; } catch { return { mode: 'tocar', cruise: 0.72, cal: null }; }
}
function save(s) { try { localStorage.setItem(DRIVE_KEY, JSON.stringify({ mode: s.mode, cruise: s.cruise, cal: s.cal })); } catch { } }

const SVG = {
  tocar: `<svg viewBox="0 0 88 72" aria-hidden="true"><rect x="32" y="10" width="24" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="35" y="14" width="18" height="32" rx="1.5" fill="currentColor" opacity=".18"/><circle cx="44" cy="49" r="1.6" fill="currentColor"/><path d="M22 34c-6 2-10 10-8 16 1.5 4 6 8 12 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M18 42l-6 2 3 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M66 34c6 2 10 10 8 16-1.5 4-6 8-12 8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/><path d="M70 42l6 2-3 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inclinar: `<svg viewBox="0 0 88 72" aria-hidden="true"><g transform="rotate(-26 44 36)"><rect x="30" y="8" width="28" height="52" rx="5" fill="none" stroke="currentColor" stroke-width="2.2"/><rect x="34" y="13" width="20" height="36" rx="1.5" fill="currentColor" opacity=".18"/><circle cx="44" cy="55" r="1.7" fill="currentColor"/></g><path d="M14 48c6-10 10-14 16-16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2 3"/><path d="M74 20c-6 10-10 14-16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-dasharray="2 3"/><path d="M18 38l-6 8 10 1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M70 30l6-8-10-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  volante: `<svg viewBox="0 0 88 72" aria-hidden="true"><circle cx="44" cy="38" r="24" fill="none" stroke="currentColor" stroke-width="5"/><circle cx="44" cy="38" r="6" fill="none" stroke="currentColor" stroke-width="2.4"/><path d="M22 38h16M50 38h16M44 14v12" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><path d="M28 54c4 6 10 9 16 9s12-3 16-9" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/><circle cx="68" cy="18" r="5" fill="currentColor" opacity=".85"/></svg>`
};

export const DriveUI = {
  mode: 'tocar',
  cruise: 0.72,
  cal: null,
  steer: 0,
  thr: 0,
  hb: false,
  nitro: false,
  hardBrake: false,
  reverse: false,
  highBeam: false,
  driving: false,
  G: null,
  _nitroT: 0,
  _hbT: 0,
  _beta: null,
  _gamma: null,
  _orientOn: false,
  _holds: new Map(), // pointerId -> {x,y,t,kind}
  _wheelA: 0,
  _wheelDrag: null,
  _fadeEl: null,
  _fading: false,

  setup(G) {
    this.G = G;
    const s = load(); this.mode = s.mode; this.cruise = s.cruise; this.cal = s.cal;
    this._inject();
    this._bind();
    this._renderCards();
    this.setCruise(this.cruise, true);
    this._applyModeClass();
    return this;
  },
  persist() { save({ mode: this.mode, cruise: this.cruise, cal: this.cal }); },

  _inject() {
    if ($('driveSet')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
<div id="driveSet" hidden role="dialog" aria-labelledby="dsTitle">
  <div class="dsBox">
    <h2 id="dsTitle">CONTROLES</h2>
    <p class="dsSub">Como dirigir no celular · a escolha fica salva neste aparelho</p>
    <div class="dsCards" id="dsCards"></div>
    <button type="button" id="dsCal" hidden>Calibrar inclinação</button>
    <p class="dsHint" id="dsHint"></p>
    <button type="button" id="dsClose">Pronto</button>
  </div>
</div>
<div id="respawnFx" aria-hidden="true"></div>
<div id="drivePad"></div>
<div id="driveHud" hidden>
  <div id="drvCruise" class="glassDrv" aria-label="Velocidade desejada">
    <span class="drvLab">VEL</span>
    <div class="drvTrack"><i id="drvThumb"></i></div>
    <span id="drvPct">72</span>
  </div>
  <div class="drvRight">
    <button type="button" id="drvBeam" class="glassDrv drvBtn" hidden>🔆<small>Alto</small></button>
    <button type="button" id="drvRev" class="glassDrv drvBtn">R<small>Ré</small></button>
    <button type="button" id="drvBrake" class="glassDrv drvBtn drvBig">🛑<small>Freio</small></button>
  </div>
  <div id="drvWheel" class="glassDrv" hidden>
    <div id="drvWheelFace"><b></b><b></b><b></b><i></i></div>
  </div>
  <div id="drvModeHint"></div>
  <button type="button" id="drvGear" class="glassDrv" title="Controles de direção">🎛️</button>
</div>`;
    const hud = $('hud') || document.body;
    // tela de opções e fade ficam no body (acima de tudo); pad e HUD de direção entram no #hud
    // para não roubar toques dos botões (o pad cobre a tela toda)
    document.body.appendChild(wrap);
    const move = (id, into) => { const el = wrap.querySelector('#'+id) || $(id); if (el) into.appendChild(el); };
    move('driveSet', document.body);
    move('respawnFx', document.body);
    move('drivePad', hud);
    move('driveHud', hud);
    wrap.remove();
    this._fadeEl = $('respawnFx');
  },

  _bind() {
    const self = this;
    $('dsClose').onclick = () => this.closeSettings();
    $('dsCal').onclick = (e) => { e.stopPropagation(); this.calibrate(); };
    $('drvGear').onclick = (e) => { e.stopPropagation(); this.openSettings(); };
    // cruise slider (pointer vertical)
    const cr = $('drvCruise');
    const setFromY = (ev) => {
      const r = cr.getBoundingClientRect();
      const t = clamp(1 - (ev.clientY - r.top) / r.height, 0.18, 1);
      this.setCruise(t);
    };
    cr.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); cr.setPointerCapture(e.pointerId); setFromY(e); });
    cr.addEventListener('pointermove', (e) => { if (e.buttons || (e.pointerType === 'touch' && cr.hasPointerCapture(e.pointerId))) setFromY(e); });
    // brake hold
    const br = $('drvBrake');
    const brOn = (e) => { e.preventDefault(); e.stopPropagation(); this.hardBrake = true; this.reverse = false; this._revHold = false; br.classList.add('on'); this._buzz(8); };
    const brOff = () => { this.hardBrake = false; br.classList.remove('on'); };
    br.addEventListener('pointerdown', brOn); br.addEventListener('pointerup', brOff); br.addEventListener('pointercancel', brOff); br.addEventListener('pointerleave', brOff);
    // ré: toque alterna (acessível, sem precisar segurar)
    $('drvRev').addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.reverse = !this.reverse; if (this.reverse) this.hardBrake = false;
      $('drvRev').classList.toggle('on', this.reverse);
      this._buzz(10);
    });
    $('drvBeam').addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      this.highBeam = !this.highBeam;
      $('drvBeam').classList.toggle('on', this.highBeam);
      this._buzz(8);
    });
    // volante
    const wh = $('drvWheel');
    wh.addEventListener('pointerdown', (e) => {
      e.preventDefault(); e.stopPropagation();
      const r = wh.getBoundingClientRect();
      this._wheelDrag = { id: e.pointerId, cx: r.left + r.width / 2, cy: r.top + r.height / 2, a0: this._wheelA, s0: Math.atan2(e.clientX - (r.left + r.width / 2), (r.top + r.height / 2) - e.clientY) };
      wh.setPointerCapture(e.pointerId);
    });
    wh.addEventListener('pointermove', (e) => {
      const d = this._wheelDrag; if (!d || e.pointerId !== d.id) return;
      const a = Math.atan2(e.clientX - d.cx, d.cy - e.clientY);
      let da = a - d.s0; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
      this._wheelA = clamp(d.a0 + da, -1.25, 1.25);
      this._syncWheel();
    });
    const wheelUp = (e) => {
      if (this._wheelDrag && e.pointerId === this._wheelDrag.id) { this._wheelDrag = null; }
    };
    wh.addEventListener('pointerup', wheelUp); wh.addEventListener('pointercancel', wheelUp);

    // pad: tocar, swipe, olhar
    const pad = $('drivePad');
    pad.addEventListener('pointerdown', (e) => this._padDown(e));
    pad.addEventListener('pointermove', (e) => this._padMove(e));
    pad.addEventListener('pointerup', (e) => this._padUp(e));
    pad.addEventListener('pointercancel', (e) => this._padUp(e));

    addEventListener('keydown', (e) => {
      if (!this.G || !this.G.started || this.G.paused) return;
      if (e.code === 'KeyU') { this.highBeam = !this.highBeam; const b = $('drvBeam'); if (b) b.classList.toggle('on', this.highBeam); }
    });

    // menu
    const start = $('start');
    if (start && !$('dsOpenMenu')) {
      const b = document.createElement('button');
      b.id = 'dsOpenMenu'; b.type = 'button'; b.className = 'install';
      b.textContent = '🎛️ Controles de direção';
      b.onclick = () => this.openSettings();
      const inst = $('installBtn');
      if (inst && inst.parentNode) inst.parentNode.insertBefore(b, inst);
      else start.querySelector('.menu')?.appendChild(b);
    }
  },

  _renderCards() {
    const box = $('dsCards'); if (!box) return;
    const caps = {
      tocar: { t: 'Tocar', p: 'TOQUE e SEGURE na esquerda ou direita para DIRIGIR' },
      inclinar: { t: 'Inclinar', p: 'Incline o telefone para os lados para esterçar. Calibre na posição em que você joga.' },
      volante: { t: 'Volante virtual', p: 'Arraste o volante na tela com o dedo para virar. Solte para endireitar.' }
    };
    box.innerHTML = MODES.map(m => `<button type="button" class="dsCard${this.mode === m ? ' sel' : ''}" data-mode="${m}" aria-pressed="${this.mode === m}">
      <div class="dsIcon">${SVG[m]}</div><h3>${caps[m].t}</h3><p>${caps[m].p}</p></button>`).join('');
    box.querySelectorAll('.dsCard').forEach(b => b.onclick = () => this.setMode(b.dataset.mode, true));
    $('dsCal').hidden = this.mode !== 'inclinar';
    $('dsHint').textContent = this.mode === 'inclinar'
      ? (this._orientOn ? 'Inclinação ativa · toque em Calibrar com o telefone na posição de jogo.' : 'Ao escolher Inclinar, o jogo pede permissão para usar o giroscópio (necessário no iPhone).')
      : 'No carro: deslize para cima para o nitro, para baixo para o drift. O freio e a ré ficam onde o polegar direito apoia.';
  },

  async setMode(m, fromUser) {
    if (!MODES.includes(m)) return;
    if (m === 'inclinar' && fromUser) {
      const ok = await this.requestTilt();
      if (!ok) {
        if (this.G && this.G.ui) this.G.ui.toast('Permissão de movimento negada. Escolha Tocar ou Volante.', 2600);
        this._renderCards();
        return;
      }
      if (!this.cal) this.calibrate(true);
    }
    this.mode = m;
    this.persist();
    this._applyModeClass();
    this._renderCards();
    if (this.G && this.G.ui && fromUser) this.G.ui.toast('Direção: <b>' + (m === 'tocar' ? 'Tocar' : m === 'inclinar' ? 'Inclinar' : 'Volante virtual') + '</b>', 1600);
  },

  _applyModeClass() {
    document.body.classList.toggle('drv-tocar', this.mode === 'tocar');
    document.body.classList.toggle('drv-inclinar', this.mode === 'inclinar');
    document.body.classList.toggle('drv-volante', this.mode === 'volante');
    const w = $('drvWheel'); if (w) w.hidden = !(this.driving && this.mode === 'volante');
    const h = $('drvModeHint');
    if (h) {
      const t = !this.driving ? '' : this.mode === 'tocar' ? 'Segure a esquerda ou a direita para dirigir' : this.mode === 'inclinar' ? 'Incline o telefone para virar' : '';
      // dica curta na faixa de cima: aparece ao entrar no carro / trocar o modo e some sozinha
      if (t !== this._hintTxt) {
        this._hintTxt = t; h.textContent = t; clearTimeout(this._hintTo);
        h.classList.toggle('on', !!t);
        if (t) this._hintTo = setTimeout(() => h.classList.remove('on'), 4500);
      }
    }
  },

  async requestTilt() {
    try {
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const r = await DeviceOrientationEvent.requestPermission();
        if (r !== 'granted') return false;
      }
      this._listenOrient();
      return true;
    } catch { return false; }
  },
  _listenOrient() {
    if (this._orientOn) return;
    this._orientOn = true;
    addEventListener('deviceorientation', (ev) => {
      this._beta = ev.beta; this._gamma = ev.gamma; this._alpha = ev.alpha;
    }, true);
  },
  calibrate(silent) {
    this.cal = { b: this._beta ?? 90, g: this._gamma ?? 0 };
    this.persist();
    if (!silent && this.G && this.G.ui) this.G.ui.toast('Inclinação calibrada', 1400);
    this._renderCards();
  },
  _tiltSteer() {
    if (this._gamma == null && this._beta == null) return 0;
    const land = innerWidth > innerHeight;
    const calB = this.cal ? this.cal.b : (land ? 90 : 45);
    const calG = this.cal ? this.cal.g : 0;
    let raw;
    if (!land) raw = (this._gamma ?? 0) - calG;
    else {
      const type = (screen.orientation && screen.orientation.type) || '';
      const db = (this._beta ?? 90) - calB;
      raw = type.includes('secondary') ? db : -db;
      // no landscape o gamma também ajuda se o beta quase não muda
      if (Math.abs(raw) < 3 && this._gamma != null) raw = (this._gamma - calG);
    }
    const a = Math.abs(raw), D = 4, R = 32;
    if (a < D) return 0;
    return Math.sign(raw) * Math.min(1, (a - D) / (R - D));
  },

  _parkAct(on) {
    const act = $('bAct'), right = document.querySelector('.drvRight'), btns = $('btns');
    if (!act) return;
    if (on && right && act.parentNode !== right) {
      this._actParent = act.parentNode;
      this._actNext = act.nextSibling;
      right.appendChild(act);
    } else if (!on && this._actParent && act.parentNode !== this._actParent) {
      if (this._actNext && this._actNext.parentNode === this._actParent) this._actParent.insertBefore(act, this._actNext);
      else this._actParent.appendChild(act);
      this._actParent = this._actNext = null;
    }
  },
  setCruise(v, silent) {
    this.cruise = clamp(v, 0.18, 1);
    const th = $('drvThumb'), pct = $('drvPct');
    if (th) th.style.bottom = ((this.cruise - 0.18) / 0.82 * 100) + '%';
    if (pct) pct.textContent = Math.round(this.cruise * 100);
    if (!silent) this.persist();
  },

  openSettings() {
    const el = $('driveSet'); if (!el) return;
    el.hidden = false;
    this._wasPaused = this.G && this.G.paused;
    if (this.G && this.G.started) this.G.paused = true;
    if (this.G && this.G.phoneOpen && this.G.ui) this.G.ui.closePhone();
    this._renderCards();
    if (this.mode === 'inclinar') this.requestTilt();
  },
  closeSettings() {
    const el = $('driveSet'); if (el) el.hidden = true;
    if (this.G && this.G.started) this.G.paused = !!this._wasPaused;
  },

  setDriving(on, veh) {
    const ground = !!(on && veh && !veh.spec.air);
    if (this.driving === ground && (!ground || this._veh === veh)) {
      if (!ground) { this.hardBrake = false; }
      return;
    }
    this.driving = ground; this._veh = veh;
    document.body.classList.toggle('driving', ground);
    const hud = $('driveHud'); if (hud) hud.hidden = !ground;
    this._parkAct(ground);
    if (!ground) {
      this.hardBrake = false; this.reverse = false; this._nitroT = 0; this._hbT = 0;
      this._holds.clear(); this._wheelDrag = null; this._wheelA = 0; this.steer = 0;
      const rv = $('drvRev'); if (rv) rv.classList.remove('on');
      const br = $('drvBrake'); if (br) br.classList.remove('on');
      // stick volta a funcionar: zona já visível via CSS
    } else {
      if (this.mode === 'inclinar') this.requestTilt();
      const night = this.G && this.G.env && this.G.env.night > 0.35;
      const bm = $('drvBeam'); if (bm) bm.hidden = !night;
    }
    this._applyModeClass();
  },

  _uiTarget(el) {
    return !!(el && el.closest && el.closest('#btns, #driveHud, #icons, #quick, #driveSet, #phone, #start, button, a, input, select, #serpHud, #stHud, #stRes, #raceSel, #raceEnd, #garage, #homeSel'));
  },
  _padDown(e) {
    if (!this.driving || (this.G && this.G.paused)) return;
    if (this._uiTarget(e.target)) return;
    e.preventDefault();
    try { $('drivePad').setPointerCapture(e.pointerId); } catch { }
    const rec = { x: e.clientX, y: e.clientY, t: performance.now(), kind: 'tap', look: false };
    const yf = e.clientY / innerHeight, xf = e.clientX / innerWidth;
    if (this.mode === 'tocar' && yf > 0.18) {
      rec.kind = 'steer';
      this._holds.set(e.pointerId, rec);
      this._recomputeTocar();
    } else {
      rec.kind = 'look'; rec.look = true; rec.lx = e.clientX; rec.ly = e.clientY;
      this._holds.set(e.pointerId, rec);
    }
  },
  _padMove(e) {
    const r = this._holds.get(e.pointerId); if (!r) return;
    const dx = e.clientX - r.x, dy = e.clientY - r.y;
    if (r.kind === 'look' || (r.kind === 'steer' && this._holds.size > 1 && r.look)) {
      const G = this.G; if (G && !G.paused) {
        const sens = (G.save && G.save.sens) || 1;
        G.camYaw -= (e.clientX - (r.lx ?? r.x)) * 0.006 * sens;
        G.camPitch = clamp((G.camPitch || 0) + (e.clientY - (r.ly ?? r.y)) * 0.004 * sens, -0.35, 1.1);
        r.lx = e.clientX; r.ly = e.clientY;
      }
    }
    if (Math.hypot(dx, dy) > 12) r.moved = true;
  },
  _padUp(e) {
    const r = this._holds.get(e.pointerId);
    if (r) {
      const dt = performance.now() - r.t;
      const dx = e.clientX - r.x, dy = e.clientY - r.y;
      const L = Math.hypot(dx, dy);
      if (dt < 420 && L > 56 && Math.abs(dy) > Math.abs(dx) * 1.25) {
        if (dy < 0) this.fireNitro(); else this.fireDrift();
      }
      this._holds.delete(e.pointerId);
      if (r.kind === 'steer') this._recomputeTocar();
    }
  },
  _recomputeTocar() {
    if (this.mode !== 'tocar') return;
    let s = 0, n = 0;
    for (const r of this._holds.values()) {
      if (r.kind !== 'steer') continue;
      const nx = (r.x / innerWidth) * 2 - 1;
      const a = Math.abs(nx);
      if (a < 0.08) continue;
      const t = Math.min(1, (a - 0.08) / 0.7);
      s += Math.sign(nx) * (t * t * (3 - 2 * t)); // smoothstep
      n++;
    }
    this._tocarSteer = n ? clamp(s / n, -1, 1) : 0;
  },
  fireNitro() {
    this._nitroT = 1.15; this._buzz(14);
    if (this.G && this.G.ui) this.G.ui.toast('🔥 Nitro', 700);
  },
  fireDrift() {
    this._kick = true; this._hbT = 0.2; this._buzz(12);
    if (this.G && this.G.ui) this.G.ui.toast('🌀 Drift', 700);
  },
  _buzz(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch { } },
  _syncWheel() {
    const face = $('drvWheelFace');
    if (face) face.style.transform = `rotate(${this._wheelA * 55}deg)`;
    if (!this._wheelDrag) this._wheelA *= 0.86;
  },
  _wheelSteer() {
    const a = this._wheelA;
    const x = a / 1.05;
    const ax = Math.abs(x);
    if (ax < DEAD) return 0;
    return Math.sign(x) * Math.min(1, (ax - DEAD) / (1 - DEAD));
  },

  tick(dt) {
    if (this._nitroT > 0) this._nitroT = Math.max(0, this._nitroT - dt);
    if (this._hbT > 0) this._hbT = Math.max(0, this._hbT - dt);
    this.nitro = this._nitroT > 0;
    this.hb = this._hbT > 0;
    if (this.driving && this.mode === 'volante' && !this._wheelDrag) this._syncWheel();
    if (this.driving && this.mode === 'inclinar') this._tiltS = this._tiltSteer();
    if (this.driving && this.mode === 'tocar') this._recomputeTocar();
    // farol alto só à noite
    const bm = $('drvBeam');
    if (bm && this.driving && this.G && this.G.env) bm.hidden = this.G.env.night < 0.35;
    let st = 0;
    if (this.mode === 'tocar') st = this._tocarSteer || 0;
    else if (this.mode === 'inclinar') st = this._tiltS || 0;
    else st = this._wheelSteer();
    this.steer = st;
    // acelerador / ré / freio
    if (this.hardBrake) this.thr = -1;
    else if (this.reverse) this.thr = -0.85;
    else this.thr = this.cruise;
  },

  input() {
    return {
      x: this.steer,
      y: this.thr,
      hb: this.hb,
      nitro: this.nitro,
      hardBrake: this.hardBrake,
      limit: this.reverse || this.hardBrake ? 1 : this.cruise,
      reverse: this.reverse,
      highBeam: this.highBeam,
      kick: (() => { const k = !!this._kick; this._kick = false; return k; })()
    };
  },

  // fade curto no reposicionamento automático da corrida
  fade(fn) {
    const el = this._fadeEl || $('respawnFx');
    if (!el) { fn && fn(); return; }
    if (this._fading) { fn && fn(); return; }
    this._fading = true;
    el.classList.add('on');
    setTimeout(() => {
      try { fn && fn(); } catch (e) { console.warn(e); }
      setTimeout(() => { el.classList.remove('on'); this._fading = false; }, 200);
    }, 150);
  },

  // testes
  inspect() {
    return {
      mode: this.mode, cruise: this.cruise, driving: this.driving, steer: this.steer, thr: this.thr,
      hb: this.hb, nitro: this.nitro, hardBrake: this.hardBrake, reverse: this.reverse, highBeam: this.highBeam,
      key: DRIVE_KEY, cal: this.cal, wheel: this._wheelA
    };
  }
};

export function respawnFade(fn) { return DriveUI.fade(fn); }
