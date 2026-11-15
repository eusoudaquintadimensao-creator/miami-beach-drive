// Gravação da partida: canvas + áudio do jogo (WebAudio) com MediaRecorder. MP4 (H.264) quando der, senão WebM.
const $ = (id) => document.getElementById(id);
const TYPES = ['video/mp4;codecs="avc1.42E01E,mp4a.40.2"', 'video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
export const GAME_URL = 'https://eusoudaquintadimensao-creator.github.io/miami-beach-drive/';
const isIOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export function pickType() {
  if (!window.MediaRecorder || !MediaRecorder.isTypeSupported) return '';
  for (const t of TYPES) { try { if (MediaRecorder.isTypeSupported(t)) return t; } catch (e) { } }
  return '';
}
export function canRecord(canvas) { return !!(window.MediaRecorder && canvas.captureStream); }

export class Recorder {
  constructor(G, canvas, opts) {
    this.G = G; this.canvas = canvas; this.opts = opts; this.rec = null; this.chunks = []; this.blob = null; this.url = ''; this.t0 = 0; this.timer = 0;
    this.maxSec = 600; // t434: até 10 minutos por vídeo (para sozinho em 10:00)
    $('recStop').onclick = () => this.stop();
    $('rpSave').onclick = () => this.save();
    $('rpShare').onclick = () => this.share();
    $('rpLink').onclick = () => this.sendLink();
    $('rpWa').onclick = () => this.whatsapp();
    $('rpDiscard').onclick = () => this.discard();
  }
  get recording() { return !!(this.rec && this.rec.state === 'recording'); }
  toggle() { this.recording ? this.stop() : this.start(); }
  start() {
    const G = this.G;
    if (this.recording) return;
    if (!canRecord(this.canvas)) {
      G.ui.toast(isIOS ? 'Este iPhone/iPad não permite gravar o jogo pelo navegador. Use <b>Gravar Tela</b> na Central de Controle do iOS 📱' : 'Seu navegador não permite gravar o jogo. Tente o Chrome atualizado.', 6000);
      return false;
    }
    if (this.url) this.discard(true);
    G.audio.init();
    const type = pickType();
    this.opts.onState && this.opts.onState(true); // limita a resolução antes de capturar
    let stream;
    try { stream = this.canvas.captureStream(30); } catch (e) { this.opts.onState && this.opts.onState(false); G.ui.toast('Não deu para capturar a tela do jogo neste navegador.'); return false; }
    // áudio do jogo (rádio, motor, ambiente)
    const at = G.audio.recordStream && G.audio.recordStream();
    if (at) for (const tr of at.getAudioTracks()) stream.addTrack(tr);
    const vbr = this.opts.touch ? 2_000_000 : 2_500_000; // t434: 720p, ~150 MB (celular) / ~190 MB (computador) em 10 min, pedaços de 1 s gravados em disco (OPFS) quando der
    try { this.rec = new MediaRecorder(stream, type ? { mimeType: type, videoBitsPerSecond: vbr, audioBitsPerSecond: 96000 } : { videoBitsPerSecond: vbr }); }
    catch (e) { try { this.rec = new MediaRecorder(stream); } catch (e2) { this.opts.onState && this.opts.onState(false); G.ui.toast('A gravação não é suportada aqui.'); return false; } }
    this.type = this.rec.mimeType || type || 'video/webm'; this.chunks = []; this.stream = stream; this.bytes = 0;
    this.disk = null; this.diskQ = Promise.resolve(); this.openDisk(); // t434: grava os pedaços direto num arquivo do navegador (não enche a memória)
    this.rec.ondataavailable = (e) => { if (!e.data || !e.data.size) return; this.bytes += e.data.size; if (this.disk) { const d = e.data; this.diskQ = this.diskQ.then(() => this.disk.w.write(d)).catch(() => { this.chunks.push(d); }); } else this.chunks.push(e.data); };
    this.rec.onstop = () => { this.diskQ.then(() => this.finish()); };
    this.rec.onerror = () => { G.ui.toast('A gravação parou por um erro do navegador.'); };
    this.rec.start(1000);
    this.t0 = performance.now();
    $('recBar').hidden = false; document.body.classList.add('recording');
    clearInterval(this.timer); this.timer = setInterval(() => this.tick(), 250); this.tick();
    G.ui.toast(`🔴 Gravando! Até ${Math.floor(this.maxSec / 60)}:${String(this.maxSec % 60).padStart(2, '0')} · toque em ■ Parar quando quiser`, 2500);
    return true;
  }
  async openDisk() {
    try {
      if (!navigator.storage || !navigator.storage.getDirectory) return;
      const root = await navigator.storage.getDirectory(); const fh = await root.getFileHandle('gravacao-atual.bin', { create: true });
      if (!fh.createWritable) return; const w = await fh.createWritable({ keepExistingData: false });
      // o que já chegou na memória antes do arquivo abrir vai primeiro
      const early = this.chunks.splice(0); for (const c of early) await w.write(c); this.disk = { fh, w };
    } catch (e) { this.disk = null; }
  }
  tick() {
    const s = (performance.now() - this.t0) / 1000; const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    const left = Math.max(0, Math.ceil(this.maxSec - s)); const end = left <= 10;
    const tot = `${Math.floor(this.maxSec / 60)}:${String(this.maxSec % 60).padStart(2, '0')}`, cur = `${m}:${String(ss).padStart(2, '0')}`;
    $('recTime').textContent = this.G.touch ? `${cur}/${tot}` + (end ? ` · ${left}s` : '') : `${cur} / ${tot}` + (end ? ` · acaba em ${left}s` : '');
    $('recBar').classList.toggle('ending', end);
    if (s >= this.maxSec) { this.G.ui.toast('Tempo máximo de gravação atingido'); this.stop(); }
  }
  stop() {
    if (!this.rec || this.rec.state === 'inactive') return;
    clearInterval(this.timer); try { this.rec.requestData(); } catch (e) { } this.rec.stop();
    $('recBar').hidden = true; document.body.classList.remove('recording');
  }
  async finish() {
    const G = this.G; this.opts.onState && this.opts.onState(false);
    let diskFile = null; if (this.disk) { try { await this.disk.w.close(); diskFile = await this.disk.fh.getFile(); } catch (e) { diskFile = null; } this.disk = null; }
    if (this.stream) for (const tr of this.stream.getVideoTracks()) tr.stop();
    G.audio.stopRecordStream && G.audio.stopRecordStream();
    const base = (this.type.split(';')[0] || 'video/webm');
    this.blob = new Blob(diskFile ? [diskFile, ...this.chunks] : this.chunks, { type: base }); this.chunks = []; this.onDisk = !!diskFile;
    this.ext = base.includes('mp4') ? 'mp4' : 'webm';
    const d = new Date(); const p2 = (n) => String(n).padStart(2, '0');
    this.name = `solara-bay-${d.getFullYear()}${p2(d.getMonth() + 1)}${p2(d.getDate())}-${p2(d.getHours())}${p2(d.getMinutes())}${p2(d.getSeconds())}.${this.ext}`;
    this.secs = Math.round((performance.now() - this.t0) / 100) / 10;
    if (!this.blob.size) { G.ui.toast('A gravação ficou vazia. Tente de novo.'); return; }
    this.url = URL.createObjectURL(this.blob);
    const v = $('rpVideo'); v.src = this.url; v.muted = false;
    $('rpInfo').textContent = `${this.secs.toFixed(1)}s · ${(this.blob.size / 1048576).toFixed(1)} MB · ${this.ext.toUpperCase()}${isIOS && this.ext === 'webm' ? ' (pode não abrir no iPhone)' : ''}`;
    $('rpMsg').textContent = '';
    $('recPanel').hidden = false; G.paused = true; if (document.pointerLockElement) document.exitPointerLock();
  }
  msg(t) { $('rpMsg').innerHTML = t; }
  file() { return new File([this.blob], this.name, { type: this.blob.type }); }
  async save() {
    if (!this.blob) return;
    if (this.opts.touch && navigator.canShare && navigator.share) { // t434: galeria do celular
      const f = this.file();
      try { if (navigator.canShare({ files: [f] })) { await navigator.share({ files: [f] }); this.msg(isIOS ? '✅ Escolha <b>Salvar vídeo</b> para ir para Fotos.' : '✅ Escolha <b>Salvar</b> / Galeria / Fotos.'); this.G.audio.chime('coin'); return 'share-files'; } }
      catch (e) { if (e && e.name === 'AbortError') { this.msg('Cancelado. Toque de novo em 💾 Salvar vídeo quando quiser.'); return 'abort'; } }
    }
    this.download(); return 'download';
  }
  download() {
    const a = document.createElement('a'); a.href = this.url; a.download = this.name; a.rel = 'noopener'; document.body.appendChild(a); a.click(); a.remove();
    this.msg(isIOS ? '⬇️ Se abrir uma prévia, toque em <b>Compartilhar › Salvar vídeo</b> para ir para a galeria.' : `✅ Vídeo salvo: <b>${this.name}</b> (pasta Downloads)`);
    this.G.audio.chime('coin');
  }
  async share() {
    if (!this.blob) return;
    const file = this.file();
    const text = 'Olha minha gameplay em Solara Bay! 🌴🚗 Joga aqui:';
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Miami Beach Drive — Solara Bay', text: `${text} ${GAME_URL}` });
        this.msg('✅ Compartilhado!'); return 'files';
      }
      if (navigator.share) {
        await navigator.share({ title: 'Miami Beach Drive — Solara Bay', text, url: GAME_URL });
        this.download(); this.msg('Seu navegador não envia o vídeo direto, então mandei o link e salvei o vídeo para você anexar. 📎'); return 'link';
      }
    } catch (e) { if (e && e.name === 'AbortError') { this.msg('Compartilhamento cancelado.'); return 'abort'; } }
    this.download(); // primeiro salva (ainda dentro do toque do usuário), depois copia o link
    const ok = await copy(`${text} ${GAME_URL}`);
    this.msg(`${ok ? '🔗 Link copiado! ' : ''}Este navegador não tem compartilhamento: o vídeo foi salvo para você enviar pelo app que quiser.`);
    return 'fallback';
  }
  async sendLink() {
    const text = 'Bora jogar Miami Beach Drive — Solara Bay! 🌴 Mundo aberto no navegador, sem violência:';
    try { if (navigator.share) { await navigator.share({ title: 'Miami Beach Drive — Solara Bay', text, url: GAME_URL }); this.msg('✅ Link enviado!'); return 'share'; } }
    catch (e) { if (e && e.name === 'AbortError') return 'abort'; }
    const ok = await copy(`${text} ${GAME_URL}`);
    this.msg(ok ? '🔗 Link copiado! Cole numa conversa.' : `Copie o link: <b>${GAME_URL}</b>`); return ok ? 'copied' : 'shown';
  }
  whatsapp() {
    const text = encodeURIComponent(`Bora jogar Miami Beach Drive — Solara Bay! 🌴🚗 ${GAME_URL}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener');
  }
  discard(silent) {
    const v = $('rpVideo'); try { v.pause(); } catch (e) { } v.removeAttribute('src'); try { v.load(); } catch (e) { }
    if (this.url) URL.revokeObjectURL(this.url); this.url = ''; this.blob = null;
    if (this.onDisk) { this.onDisk = false; try { navigator.storage.getDirectory().then(r => r.removeEntry('gravacao-atual.bin')).catch(() => { }); } catch (e) { } } // t434: libera o arquivo temporário
    $('recPanel').hidden = true; if (!silent) { this.G.paused = false; }
  }
}
async function copy(t) {
  try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(t); return true; } } catch (e) { }
  try { const ta = document.createElement('textarea'); ta.value = t; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); const ok = document.execCommand('copy'); ta.remove(); return ok; } catch (e) { return false; }
}
export { isIOS };
