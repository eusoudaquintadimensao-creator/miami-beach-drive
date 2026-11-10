// Vozes dos moradores: falas pré-gravadas (Kokoro-82M, Apache-2.0) em assets/voz/<voz>/<hash>.mp3.
// Nada de TTS ao vivo: o índice (poucos KB) carrega na 1ª conversa e cada fala só é baixada quando alguém fala.
// A legenda continua na tela; sem o arquivo, a fala fica só em texto.
import { PERS } from './phrases.js';
const BASE = 'assets/voz/';
export function normLine(t) { return t.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim(); }
export function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); }
const VIBES = [...new Set(Object.values(PERS).flatMap(p => p.vibe))].sort((a, b) => b.length - a.length);
const FEM = new Set(['vovo', 'influencer', 'acai', 'salva', 'piloto', 'dj']);
const hashStr = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); };

export class Voices {
  constructor(G) { this.G = G; this.idx = null; this.loading = null; this.cache = new Map(); this.cur = null; this.on = true; this.played = 0; }
  load() { if (this.idx || this.loading) return this.loading; this.loading = fetch(BASE + 'index.json').then(r => r.ok ? r.json() : null).then(j => { this.idx = j && j.voices || {}; }).catch(() => { this.idx = {}; }); return this.loading; }
  // voz de cada pessoa: personagens fixos pelo modelo (ela/ele); pedestres por um sorteio estável
  voiceOf(who) {
    if (!who) return { v: 'f', rate: 1 };
    if (who._voice) return who._voice;
    const ped = who.ref || (who.i != null ? who : null); const key = ped ? 'ped' + ped.i : String(who.name || ''); const h = hashStr(key);
    let fem = who.model ? who.model === 'ela' : who.per && FEM.has(who.per) ? h % 4 !== 0 : h % 2 === 0;
    if (ped) fem = h % 2 === 0;
    const v = fem ? 'f' : (h >> 3) % 2 ? 'm' : 's';
    let rate = 0.95 + ((h >> 5) % 11) / 100; if (who.per === 'vovo') rate = 0.9; if (who.per === 'influencer' || who.per === 'dj') rate = 1.05;
    const o = { v, rate }; if (!ped) who._voice = o; return o;
  }
  // divide "Aloha! boa tarde…" em pedaços que existem gravados
  pieces(text, v) {
    const have = this.idx && this.idx[v]; if (!have) return null;
    const t = text.replace(/(\w)o\(a\)/g, '$1o'); const h = fnv(normLine(text)); if (have[h]) return [h];
    for (const vb of VIBES) if (text.startsWith(vb + ' ')) { const a = fnv(normLine(vb)), b = fnv(normLine(text.slice(vb.length + 1))); if (have[a] && have[b]) return [a, b]; if (have[b]) return [b]; }
    if (t !== text && have[fnv(normLine(t))]) return [fnv(normLine(t))];
    // fala montada na hora: fala em voz alta as primeiras frases que existem gravadas (o resto fica na legenda)
    const out = []; for (const sn of text.split(/(?<=[!?.…])\s+/)) { const k = fnv(normLine(sn)); if (!normLine(sn)) continue; if (have[k]) out.push(k); else break; }
    return out.length ? out : null;
  }
  async buf(v, h) {
    const k = v + '/' + h; if (this.cache.has(k)) return this.cache.get(k);
    const A = this.G.audio; const p = fetch(BASE + k + '.mp3').then(r => r.arrayBuffer()).then(ab => new Promise((res, rej) => A.ctx.decodeAudioData(ab, res, rej))).catch(() => null);
    this.cache.set(k, p); if (this.cache.size > 60) this.cache.delete(this.cache.keys().next().value); return p;
  }
  stop() { if (this.cur) { try { this.cur.src.stop(); } catch (e) { } this.cur = null; } }
  // fala em voz alta (a legenda já está na tela). who = personagem/pedestre; pos opcional para volume pela distância
  async say(text, who, opts = {}) {
    const A = this.G.audio; if (!this.on || !A || !A.ok || A.muted) return false;
    if (!this.idx) await this.load();
    const { v, rate } = this.voiceOf(who); const ps = this.pieces(text, v); if (!ps) return false;
    const token = {}; this.stop(); this.cur = { token };
    const bufs = await Promise.all(ps.map(h => this.buf(v, h))); if (!this.cur || this.cur.token !== token || bufs.some(b => !b)) return false;
    const c = A.ctx; const g = c.createGain(); g.gain.value = opts.vol ?? 1;
    if (opts.dist != null) g.gain.value *= Math.max(0.25, 1 - opts.dist / 26);
    g.connect(A.master); let t = c.currentTime + 0.03;
    for (const b of bufs) { const s = c.createBufferSource(); s.buffer = b; s.playbackRate.value = rate; s.connect(g); s.start(t); this.cur.src = s; t += b.duration / rate + 0.12; }
    this.cur.end = t; this.played++; this.lastText = text; this.lastVoice = v;
    if (A.duck) A.duck(t - c.currentTime);
    return true;
  }
  get speaking() { return !!(this.cur && this.G.audio.ctx && this.G.audio.ctx.currentTime < this.cur.end); }
}
