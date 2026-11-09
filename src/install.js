// Instalar como app (PWA): beforeinstallprompt, instruções para iPhone/iPad e service worker offline
const $ = (id) => document.getElementById(id);
const ua = navigator.userAgent;
const isIOS = /iP(hone|ad|od)/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const isIOSSafari = isIOS && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS|GSA\//.test(ua);
let deferred = null; let toast = (t) => { };
export const installState = { prompt: false, installed: false, sw: false };
export function isStandalone() { return matchMedia('(display-mode: standalone)').matches || matchMedia('(display-mode: fullscreen)').matches || navigator.standalone === true; }

export function initInstall(opts = {}) {
  if (opts.toast) toast = opts.toast;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; installState.prompt = true; refresh(); });
  addEventListener('appinstalled', () => { deferred = null; installState.installed = true; refresh(); toast('📲 Solara Bay instalado! Procure o ícone na tela inicial.'); });
  $('installBtn').onclick = () => promptInstall();
  $('isX').onclick = () => { $('installSheet').hidden = true; };
  $('installSheet').addEventListener('click', (e) => { if (e.target.id === 'installSheet') $('installSheet').hidden = true; });
  refresh();
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1')) {
    addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js', { scope: './' }).then((r) => { installState.sw = true; r.update && r.update().catch(() => { }); }).catch(() => { });
    });
  }
}
function refresh() { const b = $('installBtn'); if (!b) return; b.hidden = isStandalone() || installState.installed; }
export async function promptInstall() {
  if (isStandalone()) { toast('Você já está jogando pelo app instalado 👍'); return 'standalone'; }
  if (deferred) {
    deferred.prompt(); let r = null; try { r = await deferred.userChoice; } catch (e) { }
    deferred = null; installState.prompt = false;
    if (r && r.outcome === 'accepted') { toast('📲 Instalando… o ícone vai aparecer na tela inicial'); return 'accepted'; }
    return 'dismissed';
  }
  showSheet(); return 'sheet';
}
function showSheet() {
  let h = '<img src="icon-192.png" alt="">';
  if (isIOS) {
    h += `<h3>Adicionar à Tela de Início</h3>${isIOSSafari ? '' : '<p><b>Abra este link no Safari</b> (no iPhone só o Safari instala apps da web).</p>'}
      <ol><li>Toque em <span class="ic">Compartilhar ⬆️</span> na barra do Safari</li><li>Role e toque em <span class="ic">Adicionar à Tela de Início ➕</span></li><li>Toque em <b>Adicionar</b>. Pronto: o ícone do Solara Bay fica na sua tela!</li></ol>`;
  } else if (/Android/.test(ua)) {
    h += `<h3>Instalar no Android</h3><ol><li>Toque no menu <span class="ic">⋮</span> do navegador</li><li>Escolha <span class="ic">Instalar app</span> ou <span class="ic">Adicionar à tela inicial</span></li><li>Confirme. O ícone aparece junto com seus apps.</li></ol>`;
  } else {
    h += `<h3>Instalar no computador</h3><ol><li>No Chrome ou Edge, clique no ícone <span class="ic">⊕ Instalar</span> na barra de endereço</li><li>Ou abra o menu <span class="ic">⋮</span> › <span class="ic">Instalar Miami Beach Drive</span></li></ol><p>No celular, abra o mesmo link e use “Adicionar à tela inicial”.</p>`;
  }
  h += '<p style="font-size:13px;opacity:.7">Depois de instalado, o jogo abre em tela cheia e funciona até sem internet.</p>';
  $('isBody').innerHTML = h; $('installSheet').hidden = false;
}
export { isIOS, showSheet };
