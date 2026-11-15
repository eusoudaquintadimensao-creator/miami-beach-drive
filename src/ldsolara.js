// t436: Solara apresenta o jogo na tela de carregamento. O áudio (Kokoro, local e gratuito) só é baixado quando o jogador toca.
(function () {
  var el = document.getElementById('ldSol'); if (!el) return;
  var TX = {
    pt: ['Oi! Eu sou a Solara', 'Bem-vindo(a) a Solara Bay! Ande pela cidade, entre nos carros, barcos e jet skis, e siga o mapa para entregas, fotos e corridas. Sem violência.', '🔊 Toque para ouvir como jogar'],
    en: ["Hi! I'm Solara", 'Welcome to Solara Bay! Walk around the city, hop into cars, boats and jet skis, and follow the map for deliveries, photos and races. No violence.', '🔊 Tap to hear how to play'],
    es: ['¡Hola! Soy Solara', '¡Bienvenido(a) a Solara Bay! Recorre la ciudad, sube a autos, lanchas y motos de agua, y sigue el mapa para entregas, fotos y carreras. Sin violencia.', '🔊 Toca para escuchar cómo jugar']
  };
  var nav = (navigator.language || 'pt').slice(0, 2).toLowerCase(), lg = 'pt', au = null;
  try { lg = localStorage.getItem('mbd-intro-lang') || (TX[nav] ? nav : 'pt'); } catch (e) { lg = TX[nav] ? nav : 'pt'; }
  if (!TX[lg]) lg = 'pt';
  var hi = document.getElementById('lsHi'), msg = document.getElementById('lsMsg'), tap = document.getElementById('lsTap'), btns = el.querySelectorAll('.lsLang button');
  function paint() { hi.textContent = TX[lg][0]; msg.textContent = TX[lg][1]; tap.textContent = TX[lg][2]; for (var i = 0; i < btns.length; i++) btns[i].className = btns[i].getAttribute('data-l') === lg ? 'on' : ''; }
  function stop() { if (au) { au.pause(); au = null; } el.classList.remove('play'); }
  function play() {
    stop(); au = new Audio('assets/solara/intro-' + lg + '.mp3'); au.preload = 'auto'; el.classList.add('play'); window.__solaraIntro = { lang: lg, playing: true };
    au.onended = au.onerror = function () { el.classList.remove('play'); if (window.__solaraIntro) window.__solaraIntro.playing = false; };
    var p = au.play(); if (p && p.catch) p.catch(function () { el.classList.remove('play'); });
  }
  for (var i = 0; i < btns.length; i++) btns[i].addEventListener('click', function (e) { e.stopPropagation(); lg = this.getAttribute('data-l'); try { localStorage.setItem('mbd-intro-lang', lg); } catch (x) { } paint(); play(); });
  el.addEventListener('click', function () { if (au && el.classList.contains('play')) stop(); else play(); });
  el.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.click(); } });
  document.getElementById('play') && document.getElementById('play').addEventListener('click', function () { el.classList.add('gone'); setTimeout(function () { el.hidden = true; }, 700); if (au) { var a = au, v = 1, t = setInterval(function () { v -= 0.1; if (v <= 0) { clearInterval(t); a.pause(); } else a.volume = v; }, 60); } });
  var st = document.getElementById('start'); // retomada automática (t433) chama o JOGAR sem clique: some também quando a tela inicial esconde
  if (st && window.MutationObserver) new MutationObserver(function () { if (st.hidden && !el.hidden) { el.classList.add('gone'); setTimeout(function () { el.hidden = true; }, 700); } }).observe(st, { attributes: true, attributeFilter: ['hidden'] });
  window.__solaraIntroLang = function () { return lg; };
  paint();
})();
