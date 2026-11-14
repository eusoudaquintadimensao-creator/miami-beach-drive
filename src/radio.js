// Rádio entre pilotos: legenda na tela + fala gravada com filtro de rádio (passa-banda, saturação leve e chiado).
// Índice e falas carregam só quando a sessão da ponte começa (lazy); sem áudio, a legenda continua funcionando.
import { RADIO, RADIO_VOICES } from './radiolines.js';
import { normLine, fnv } from './voice.js';
const BASE = 'assets/voz/radio/';
const $ = (id) => document.getElementById(id);

export class Radio {
  constructor(G, names) {
    this.G = G; this.names = names; this.idx = null; this.loading = null; this.cache = new Map();
    this.q = []; this.busyT = 0; this.gap = 0; this.cool = {}; this.lastLine = {}; this.played = 0; this.shown = 0; this.log = []; this.subT = 0;
  }
  load() { if (this.idx || this.loading) return this.loading; this.loading = fetch(BASE + 'index.json').then(r => r.ok ? r.json() : null).then(j => { this.idx = (j && j.d) || {}; }).catch(() => { this.idx = {}; }); return this.loading; }
  reset() { this.q.length = 0; this.cool = {}; this.gap = 0; this.busyT = 0; this.hide(); }
  // pede uma fala de um evento; who = piloto preferido (opcional); cd = recarga do evento (s)
  say(evt, who, cd = 0, prio = false) {
    const now = this.G.t || 0; if (cd && this.cool[evt] > now) return false;
    const pool = (RADIO[evt] || []).filter(([d]) => !who || d === who); if (!pool.length) return false;
    let k = Math.floor(Math.random() * pool.length); if (pool.length > 1 && this.lastLine[evt] === k) k = (k + 1) % pool.length; this.lastLine[evt] = k;
    if (cd) this.cool[evt] = now + cd;
    const [d, text] = pool[k]; const item = { d, text, evt };
    if (prio) this.q.unshift(item); else if (this.q.length < 3) this.q.push(item); else return false;
    return true;
  }
  // conversa entre dois pilotos (pares consecutivos do banco)
  banter() { const B = RADIO.banter; const i = Math.floor(Math.random() * (B.length / 2)) * 2; if (this.q.length) return false; this.q.push({ d: B[i][0], text: B[i][1], evt: 'banter' }, { d: B[i + 1][0], text: B[i + 1][1], evt: 'banter' }); return true; }
  update(dt) {
    if (this.busyT > 0) { this.busyT -= dt; if (this.busyT <= 0) this.gap = 0.6; }
    if (this.subT > 0) { this.subT -= dt; if (this.subT <= 0) this.hide(); }
    if (this.gap > 0) { this.gap -= dt; return; }
    if (this.busyT <= 0 && this.q.length) this.play(this.q.shift());
  }
  // legenda logo abaixo do placar da ponte (a altura do placar muda com a quebra de linha no celular)
  place() {
    const el = $('radioSub'), hud = $('ponteHud'); if (!el) return;
    if (hud && !hud.hidden) { const r = hud.getBoundingClientRect(); if (r.height > 0) { let b = r.bottom; const qb = $('ponteQuit'); if (qb && !qb.hidden) { const q = qb.getBoundingClientRect(); if (q.top >= r.bottom - 2) b = Math.max(b, q.bottom); } el.style.top = Math.round(b + 6) + 'px'; return; } }
    el.style.top = '';
  }
  hide() { const el = $('radioSub'); if (el && !el.hidden) el.hidden = true; }
  show(it) {
    const el = $('radioSub'); if (!el) return; const nm = this.names[it.d] || it.d;
    el.innerHTML = `<b>📻 ${nm}</b><span>${it.text}</span>`; el.hidden = false; this.shown++;
    this.place();
    this.log.push({ d: it.d, text: it.text, evt: it.evt, t: +(this.G.t || 0).toFixed(1) }); if (this.log.length > 30) this.log.shift();
  }
  async play(it) {
    const dur0 = 1.4 + it.text.length * 0.055; this.busyT = dur0; this.subT = dur0 + 0.4; this.show(it);
    const A = this.G.audio; if (!A || !A.ok || A.muted || !A.ctx) return;
    if (!this.idx) await this.load();
    const have = this.idx[it.d]; const h = fnv(normLine(it.text)); if (!have || !have[h]) return;
    const buf = await this.buf(it.d, h); if (!buf) return;
    const c = A.ctx, V = RADIO_VOICES[it.d] || { rate: 1 }, t0 = c.currentTime + 0.05;
    // cadeia de rádio: passa-alta + passa-baixa + saturação leve + compressão
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 420;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; lp.Q.value = 0.9;
    const pk = c.createBiquadFilter(); pk.type = 'peaking'; pk.frequency.value = 1700; pk.gain.value = 5;
    const ws = c.createWaveShaper(); ws.curve = this._curve(); const g = c.createGain(); g.gain.value = 0.95;
    const s = c.createBufferSource(); s.buffer = buf; s.playbackRate.value = V.rate || 1;
    s.connect(hp); hp.connect(pk); pk.connect(lp); lp.connect(ws); ws.connect(g); g.connect(A.master);
    const dur = buf.duration / (V.rate || 1);
    this._static(t0 - 0.02, 0.12); s.start(t0 + 0.08); this._static(t0 + 0.1 + dur, 0.16);
    this.busyT = dur + 0.45; this.subT = dur + 0.9; this.played++; this.lastPlayed = { d: it.d, h, dur: +dur.toFixed(2) };
    if (A.duck) A.duck(dur + 0.3);
  }
  async buf(d, h) {
    const k = d + '/' + h; if (this.cache.has(k)) return this.cache.get(k);
    const A = this.G.audio; const p = fetch(BASE + k + '.mp3').then(r => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); }).then(ab => new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej))).catch(() => null);
    this.cache.set(k, p); if (this.cache.size > 40) this.cache.delete(this.cache.keys().next().value); return p;
  }
  _curve() { if (this._c) return this._c; const n = 512, cv = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; cv[i] = Math.tanh(x * 2.2) / Math.tanh(2.2); } return (this._c = cv); }
  _static(t, len) {
    const A = this.G.audio, c = A.ctx; if (!this._nb) { const b = c.createBuffer(1, Math.floor(c.sampleRate * 0.3), c.sampleRate); const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (0.6 + 0.4 * Math.sin(i * 0.05)); this._nb = b; }
    const s = c.createBufferSource(); s.buffer = this._nb; const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 2400; f.Q.value = 0.7;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.02); g.gain.linearRampToValueAtTime(0.0001, t + len);
    s.connect(f); f.connect(g); g.connect(A.master); s.start(t); s.stop(t + len + 0.05);
  }
}
