// "Versões do jogo" na tela inicial: escolha entre Solara Bay, Neon Distrito e SOLARA SKY 2088 (marca a atual).
// Nas cópias do site MIAMI DRIVE SOLARA 2088 (/solara-bay/ e /neon-distrito/) os links apontam para a cópia irmã no mesmo site.
export const VERSIONS = [
  { id: 'solara', name: 'Solara Bay', emoji: '🌴', desc: 'Cidade de praia ensolarada · dia e pôr do sol', url: 'https://eusoudaquintadimensao-creator.github.io/miami-beach-drive/', copy: 'solara-bay/', col: '#ff8a3c' },
  { id: 'neon', name: 'Neon Distrito', emoji: '🌃', desc: 'Metrópole cyberpunk · noite neon', url: 'https://eusoudaquintadimensao-creator.github.io/neon-distrito/', copy: 'neon-distrito/', col: '#b45cff' },
  { id: 'sky', name: 'SOLARA SKY 2088', emoji: '🛸', desc: 'Miami do futuro · voe pelos céus de 2088', url: 'https://oasis-berry-horizon-kite.grok.me', site: 'https://solara-sky-2088.conhecimento-solar.workers.dev', col: '#29f0ff' },
];
export function versionLink(v, loc = location) {
  if (!v.copy) return v.url;
  const m = loc.pathname.match(/^(.*\/)(solara-bay|neon-distrito)\/(?:index\.html)?$/); // estamos numa cópia do site
  return m ? loc.origin + m[1] + v.copy : v.url;
}
export function setupVersions(current) {
  const btn = document.getElementById('verBtn'), pan = document.getElementById('verPanel'); if (!btn || !pan) return;
  pan.innerHTML = `<div class="verBox" role="dialog" aria-label="Versões do jogo"><div class="verHead"><b>🎮 Versões do jogo</b><button class="verX" id="verX" aria-label="Fechar">✕</button></div>
    <div class="verList">${VERSIONS.map(v => `<a class="verCard${v.id === current ? ' cur' : ''}" data-v="${v.id}" href="${v.id === current ? '#' : versionLink(v)}" style="--c:${v.col}"${v.id === current ? ' aria-current="page"' : ''}><i>${v.emoji}</i><span><b>${v.name}</b><small>${v.desc}</small></span><em>${v.id === current ? '✔ você está aqui' : 'Jogar ›'}</em></a>${v.site ? `<a class="verSite" href="${v.site}">🌐 Site do ${v.name}</a>` : ''}`).join('')}</div></div>`;
  const open = (on) => { pan.hidden = !on; btn.setAttribute('aria-expanded', on ? 'true' : 'false'); };
  btn.onclick = () => open(pan.hidden); document.getElementById('verX').onclick = () => open(false);
  pan.addEventListener('click', (e) => { if (e.target === pan) open(false); const a = e.target.closest('a.verCard.cur'); if (a) { e.preventDefault(); open(false); } });
}
