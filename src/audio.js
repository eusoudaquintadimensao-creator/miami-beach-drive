// Áudio 100% gerado no navegador (WebAudio): rádio com músicas originais, motor, buzina, ambiente
import { rng } from './util.js';

export const STATIONS = [
  { id: 'neon', name: 'Neon 88 FM', tag: 'synthwave', bpm: 100 },
  { id: 'tropical', name: 'Onda Tropical 101', tag: 'tropical house', bpm: 114 },
  { id: 'lofi', name: 'Brisa Lo-Fi 93', tag: 'chill', bpm: 78 },
  { id: 'off', name: 'Rádio desligado', tag: '', bpm: 0 },
];
const NOTE = (n) => 440 * Math.pow(2, (n - 69) / 12);

export class AudioSys {
  constructor() { this.ok = false; this.station = 0; this.radioOn = false; this.vol = 0.8; this.muted = false; }
  init() {
    if (this.ok) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = this.ctx = new AC(); this.ok = true;
    this.master = c.createGain(); this.master.gain.value = this.muted ? 0 : this.vol; this.master.connect(c.destination);
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3; comp.connect(this.master);
    this.bus = comp;
    this.music = c.createGain(); this.music.gain.value = 0; this.music.connect(comp);
    this.musicLP = c.createBiquadFilter(); this.musicLP.type = 'lowpass'; this.musicLP.frequency.value = 18000; this.musicLP.connect(this.music);
    // reverb
    const len = c.sampleRate * 2.2, ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    this.rev = c.createConvolver(); this.rev.buffer = ir; const rg = c.createGain(); rg.gain.value = 0.35; this.rev.connect(rg); rg.connect(this.musicLP);
    this.dry = c.createGain(); this.dry.connect(this.musicLP);
    // ruído
    const nb = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
    // motor
    this.eng = c.createOscillator(); this.eng.type = 'sawtooth'; this.eng2 = c.createOscillator(); this.eng2.type = 'square';
    this.engF = c.createBiquadFilter(); this.engF.type = 'lowpass'; this.engF.frequency.value = 600; this.engG = c.createGain(); this.engG.gain.value = 0;
    this.eng.connect(this.engF); this.eng2.connect(this.engF); this.engF.connect(this.engG); this.engG.connect(comp); this.eng.start(); this.eng2.start();
    // ambiente: mar, vento/cidade, chuva
    const mk = (type, f, q) => { const s = c.createBufferSource(); s.buffer = nb; s.loop = true; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(fl); fl.connect(g); g.connect(comp); s.start(); return { g, fl }; };
    this.sea = mk('lowpass', 500, 0.5); this.city = mk('bandpass', 900, 0.4); this.rainA = mk('highpass', 2500, 0.3); this.skid = mk('bandpass', 1800, 6); this.boostN = mk('bandpass', 700, 0.9);
    this.nextT = 0; this.step = 0; this.bar = 0; this.seed = 1;
    this.setStation(this.station, true);
  }
  // fluxo de áudio para a gravação (mesmo som que sai no alto-falante)
  recordStream() {
    if (!this.ok || !this.ctx.createMediaStreamDestination) return null;
    if (!this.recDest) this.recDest = this.ctx.createMediaStreamDestination();
    try { this.master.connect(this.recDest); } catch (e) { }
    return this.recDest.stream;
  }
  stopRecordStream() { if (this.recDest) { try { this.master.disconnect(this.recDest); } catch (e) { } } }
  setMuted(m) { this.muted = m; if (this.ok) this.master.gain.setTargetAtTime(m ? 0 : this.vol, this.ctx.currentTime, 0.05); }
  setStation(i, silent) {
    this.station = (i + STATIONS.length) % STATIONS.length; this.step = 0; this.bar = 0; this.seed = Math.floor(Math.random() * 1e6);
    if (this.ok) this.nextT = this.ctx.currentTime + 0.1;
    this.makeSong();
    return STATIONS[this.station];
  }
  makeSong() {
    const r = rng(this.seed); const st = STATIONS[this.station];
    const roots = { neon: [57, 53, 48, 55], tropical: [60, 57, 53, 55], lofi: [62, 59, 55, 57] }[st.id] || [57, 53, 48, 55];
    const prog = []; const pool = st.id === 'neon' ? [[0, 1, 2, 3], [0, 3, 1, 2], [0, 2, 3, 1]] : st.id === 'tropical' ? [[0, 1, 2, 3], [1, 0, 3, 2]] : [[0, 1, 2, 3], [0, 3, 2, 1]];
    const order = pool[Math.floor(r() * pool.length)]; for (const k of order) prog.push(roots[k] + (r() < 0.2 ? 2 : 0) * 0);
    const scale = [0, 3, 5, 7, 10, 12, 15];
    const mel = []; for (let i = 0; i < 32; i++) mel.push(r() < (st.id === 'lofi' ? 0.35 : 0.5) ? scale[Math.floor(r() * scale.length)] : null);
    this.song = { prog, mel, minor: true };
  }
  tone(t, f, d, type, g, dest, a = 0.005, rel = 0.1, det = 0) {
    const c = this.ctx; const o = c.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det;
    const v = c.createGain(); v.gain.setValueAtTime(0, t); v.gain.linearRampToValueAtTime(g, t + a); v.gain.setTargetAtTime(0, t + d, rel);
    o.connect(v); v.connect(dest || this.dry); o.start(t); o.stop(t + d + rel * 6); return v;
  }
  noise(t, d, g, type, f, dest) {
    const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.noiseBuf; const fl = c.createBiquadFilter(); fl.type = type; fl.frequency.value = f;
    const v = c.createGain(); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + d); s.connect(fl); fl.connect(v); v.connect(dest || this.dry); s.start(t, Math.random()); s.stop(t + d + 0.05);
  }
  kick(t, g = 0.9) { const c = this.ctx; const o = c.createOscillator(); const v = c.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); v.gain.setValueAtTime(g, t); v.gain.exponentialRampToValueAtTime(0.001, t + 0.35); o.connect(v); v.connect(this.dry); o.start(t); o.stop(t + 0.4); }
  schedule() {
    const c = this.ctx; const st = STATIONS[this.station]; if (!st.bpm) return;
    const s16 = 60 / st.bpm / 4;
    while (this.nextT < c.currentTime + 0.2) {
      const t = this.nextT, i = this.step % 16, bar = Math.floor(this.step / 16), S = this.song;
      const root = S.prog[bar % 4]; const chord = [root, root + 3, root + 7, root + 10];
      if (st.id === 'neon') {
        if (i % 4 === 0) this.kick(t);
        if (i === 4 || i === 12) { this.noise(t, 0.25, 0.5, 'bandpass', 1800, this.rev); this.noise(t, 0.12, 0.35, 'highpass', 1200); }
        if (i % 2 === 0) this.noise(t, 0.04, 0.12, 'highpass', 8000);
        this.tone(t, NOTE(root - 24 + (i % 2 ? 12 : 0)), s16 * 0.8, 'sawtooth', 0.12, this.dry, 0.003, 0.03);
        if (i === 0) for (const n of chord) { this.tone(t, NOTE(n), s16 * 15, 'sawtooth', 0.025, this.rev, 0.4, 0.3, -8); this.tone(t, NOTE(n), s16 * 15, 'sawtooth', 0.025, this.dry, 0.4, 0.3, 8); }
        if (i % 2 === 0) this.tone(t, NOTE(chord[(i / 2) % 4] + 12), s16 * 0.9, 'square', 0.03, this.rev, 0.002, 0.05);
        const m = S.mel[(bar % 2) * 16 + i]; if (bar % 4 >= 2 && m !== null && i % 2 === 0) this.tone(t, NOTE(root + 12 + m), s16 * 1.8, 'triangle', 0.08, this.rev, 0.01, 0.12);
      } else if (st.id === 'tropical') {
        if (i % 4 === 0) this.kick(t, 0.8);
        if (i % 4 === 2) this.noise(t, 0.06, 0.25, 'highpass', 6000);
        if (i === 4 || i === 12) this.noise(t, 0.12, 0.3, 'bandpass', 2500, this.rev);
        if ([3, 6, 11, 14].includes(i)) this.tone(t, NOTE(root + 7 + 12), 0.08, 'sine', 0.12, this.dry, 0.001, 0.06);
        if ([0, 3, 6, 10, 12].includes(i)) this.tone(t, NOTE(root - 12), s16 * 1.5, 'sine', 0.25, this.dry, 0.004, 0.06);
        if (i % 4 === 2) for (const n of chord.slice(0, 3)) this.tone(t, NOTE(n + 12), 0.12, 'triangle', 0.05, this.rev, 0.002, 0.08);
        const m = S.mel[(bar % 2) * 16 + i]; if (m !== null && bar % 4 !== 3) this.tone(t, NOTE(root + 24 + m), 0.14, 'sine', 0.07, this.rev, 0.001, 0.1);
      } else {
        if (i === 0 || i === 7 || i === 10) this.kick(t, 0.6);
        if (i === 4 || i === 12) this.noise(t, 0.18, 0.22, 'bandpass', 1500, this.rev);
        if (i % 2 === 0) this.noise(t, 0.03, 0.06 + (i % 4 ? 0 : 0.03), 'highpass', 7000);
        if (i === 0 || i === 8) for (const n of chord) { this.tone(t + Math.random() * 0.02, NOTE(n), s16 * 7, 'sine', 0.05, this.rev, 0.02, 0.4); this.tone(t, NOTE(n + 12), s16 * 7, 'triangle', 0.012, this.dry, 0.02, 0.4); }
        if (i === 0) this.tone(t, NOTE(root - 24), s16 * 8, 'sine', 0.22, this.dry, 0.01, 0.2);
        const m = S.mel[(bar % 2) * 16 + i]; if (m !== null && i % 2 === 0) this.tone(t, NOTE(root + 12 + m), s16 * 2, 'sine', 0.05, this.rev, 0.01, 0.25);
        if (i === 0) this.noise(t, s16 * 16, 0.015, 'bandpass', 3000);
      }
      this.nextT += s16; this.step++;
      if (this.step % (16 * 16) === 0) { this.seed++; this.makeSong(); }
    }
  }
  update(dt, st) {
    if (!this.ok) return; const c = this.ctx, t = c.currentTime;
    const want = st.inVehicle && STATIONS[this.station].bpm > 0;
    this.music.gain.setTargetAtTime(want ? 0.55 : 0, t, 0.3); this.musicLP.frequency.setTargetAtTime(st.inVehicle ? 16000 : 900, t, 0.2);
    if (want) this.schedule(); else this.nextT = t + 0.1;
    // motor
    const e = st.engine; const base = { sport: 52, classic: 38, suv: 40, sedan: 44, taxi: 44, moto: 60, boat: 34 }[e?.type] || 44;
    if (e) { const gear = (e.rpm * 5) % 1; const f = base + e.rpm * 90 + gear * 40; this.eng.frequency.setTargetAtTime(f, t, 0.05); this.eng2.frequency.setTargetAtTime(f * 0.5, t, 0.05); this.engF.frequency.setTargetAtTime(300 + e.rpm * 1400 + e.thr * 400, t, 0.05); this.engG.gain.setTargetAtTime(0.035 + e.rpm * 0.05 + e.thr * 0.03, t, 0.08); }
    else this.engG.gain.setTargetAtTime(0, t, 0.15);
    this.skid.g.gain.setTargetAtTime(st.skid ? Math.min(0.12, st.skid * 0.012) : 0, t, 0.05);
    this.boostN.g.gain.setTargetAtTime(st.boost ? 0.16 : 0, t, st.boost ? 0.04 : 0.25); if (st.boost) this.boostN.fl.frequency.setTargetAtTime(500 + Math.random() * 500, t, 0.05);
    this.sea.g.gain.setTargetAtTime(st.sea * (0.12 + 0.06 * Math.sin(t * 0.4)), t, 0.5);
    this.city.g.gain.setTargetAtTime(st.city * 0.025, t, 0.5); this.rainA.g.gain.setTargetAtTime(st.rain * 0.09, t, 0.5);
  }
  nitro() { if (!this.ok) return; const t = this.ctx.currentTime; this.noise(t, 0.5, 0.35, 'bandpass', 1400, this.bus); this.tone(t, 90, 0.4, 'sawtooth', 0.05, this.bus, 0.01, 0.2); }
  horn() { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(t, 370, 0.35, 'square', 0.06, this.bus, 0.01, 0.05); this.tone(t, 466, 0.35, 'square', 0.05, this.bus, 0.01, 0.05); }
  far_horn(vol = 0.3) { if (!this.ok) return; const t = this.ctx.currentTime; this.tone(t, 330, 0.25, 'square', 0.03 * vol, this.bus, 0.01, 0.05); this.tone(t + 0.3, 330, 0.25, 'square', 0.03 * vol, this.bus, 0.01, 0.05); }
  thud(v) { if (!this.ok) return; const t = this.ctx.currentTime; this.noise(t, 0.25, Math.min(0.6, v * 0.04), 'lowpass', 400, this.bus); }
  chime(kind = 'coin') {
    if (!this.ok) return; const t = this.ctx.currentTime;
    const seq = kind === 'win' ? [72, 76, 79, 84, 88] : kind === 'start' ? [67, 72, 76] : kind === 'photo' ? [96] : kind === 'fail' ? [64, 60, 55] : [84, 91];
    seq.forEach((n, i) => this.tone(t + i * 0.09, NOTE(n), 0.12, kind === 'photo' ? 'square' : 'triangle', 0.12, this.bus, 0.002, 0.1));
    if (kind === 'photo') this.noise(t, 0.08, 0.3, 'highpass', 3000, this.bus);
  }
  thunder() { if (!this.ok) return; const t = this.ctx.currentTime + 0.6 + Math.random(); this.noise(t, 2.5, 0.5, 'lowpass', 160, this.bus); }
}
