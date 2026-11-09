// Interface: HUD, minimapa, mapa grande, celular, foto, avisos
import { drawMap, BOUNDS, MAPSCALE, LANDMARKS, SPAWNS, districtName, roadAt } from './world.js';
import { STATIONS } from './audio.js';
import { RACES } from './missions.js';

const $ = (id) => document.getElementById(id);
const FEED = [
  ['@sol.da.manha', 'O pôr do sol do Píer da Praia hoje 🌅🔥', '2 min'], ['@neon.lover', 'Ocean Drive de noite é outro planeta 💜💙', '8 min'],
  ['@praia_e_paz', 'Alguém viu o golfinho perto da marina?? 🐬', '15 min'], ['@lucas.surf', 'Mar com ondinhas boas pra iniciante hoje 🏄', '21 min'],
  ['@ana.viaja', 'Roda-gigante da Baía: vale cada minuto 🎡', '34 min'], ['@mari.fotos', 'Dica: a Torre Aurora fica linda refletida na baía 📸', '1 h'],
  ['@rafa_rolê', 'Fui nos Glades e vi garças lindas 🪶', '2 h'], ['@vibe_tropical', 'Chuva de verão em Solara: 15 min e passa ☔', '3 h'],
];
export class UI {
  constructor(G) {
    this.G = G; this.map = drawMap(); this.toasts = []; this.areaT = 0; this.lastArea = '';
    this.mini = $('mini'); this.mctx = this.mini.getContext('2d');
    this.bm = $('bm'); this.bctx = this.bm.getContext('2d');
    this.waypoint = null;
    $('bmX').onclick = () => this.closeMap();
    this.bm.addEventListener('pointerdown', (e) => { const r = this.bm.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * this.bm.width / MAPSCALE + BOUNDS.x0, z = (e.clientY - r.top) / r.height * this.bm.height / MAPSCALE + BOUNDS.z0; this.waypoint = [x, z]; if (!G.missions.active) G.setRoute([x, z]); this.drawBig(); this.toast('📍 Destino marcado no GPS'); });
    $('phClose').onclick = () => this.closePhone(); $('phBack').onclick = () => this.phoneHome();
    $('phOk').onclick = () => { $('photo').hidden = true; G.paused = false; };
  }
  resize() { const s = this.mini.getBoundingClientRect(); const d = Math.min(2, devicePixelRatio || 1); this.mini.width = Math.round(s.width * d); this.mini.height = Math.round(s.height * d); }
  toast(html, ms = 3800) {
    const box = $('toast'); const d = document.createElement('div'); d.innerHTML = html; box.appendChild(d);
    while (box.children.length > 3) box.removeChild(box.firstChild);
    setTimeout(() => d.remove(), ms);
  }
  big(text) { const b = $('big'); b.textContent = text; b.classList.add('on'); clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.remove('on'), 1300); }
  setMission(title, text, left, elapsed) {
    const m = $('mis'); if (!title) { if (!m.hidden) m.hidden = true; return; }
    m.hidden = false; if (this._mt !== title) { $('misT').textContent = title; this._mt = title; }
    if (this._md !== text) { $('misD').innerHTML = text; this._md = text; }
    const t = $('misTime');
    if (left != null) { const s = Math.max(0, Math.ceil(left)); t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; t.classList.toggle('low', s <= 10); }
    else if (elapsed != null) { t.textContent = elapsed.toFixed(1) + 's'; t.classList.remove('low'); }
    else t.textContent = '';
  }
  prompt(html) { const p = $('prompt'); if (!html) { p.hidden = true; this._ph = ''; return; } if (this._ph !== html) { p.innerHTML = html; this._ph = html; } p.hidden = false; }
  radio(st) { const r = $('radio'); r.innerHTML = `${st.name}<small>${st.tag || ''}</small>`; r.classList.add('on'); clearTimeout(this._rt); this._rt = setTimeout(() => r.classList.remove('on'), 2600); }
  phoneNote(user, text) { const n = $('note'); $('noteU').textContent = user + ' · Vibez'; $('noteT').textContent = text; n.hidden = false; clearTimeout(this._nt); this._nt = setTimeout(() => n.hidden = true, 5200); this.G.audio.chime('coin'); this.G.feed.unshift([user, text, 'agora']); }
  bubbleText(who, text) { const s = $('say'); s.className = 'top'; s.textContent = `${who}: ${text}`; s.hidden = false; this._sayP = null; clearTimeout(this._st); this._st = setTimeout(() => s.hidden = true, 4200); }
  pedBubble(p, text) { const s = $('say'); s.className = ''; s.textContent = text; s.hidden = false; this._sayP = p; clearTimeout(this._st); this._st = setTimeout(() => { s.hidden = true; this._sayP = null; }, 2600); }
  stats(money, fol) { $('money').textContent = '$' + money.toLocaleString('pt-BR'); $('fol').textContent = '♥ ' + fol.toLocaleString('pt-BR') + ' seguidores'; }
  frame(dt, cam) {
    const G = this.G; const pl = G.player; const E = G.env;
    const hh = Math.floor(E.hour), mm = Math.floor((E.hour % 1) * 60);
    const wx = E.weather === 'chuva' ? '🌧️' : E.weather === 'nublado' ? '⛅' : E.night > 0.5 ? '🌙' : '☀️';
    const ck = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')} <span>${wx}</span>`; if (ck !== this._ck) { $('clock').innerHTML = ck; this._ck = ck; }
    const v = pl.vehicle; const sp = $('spd');
    const st = v ? `${Math.round(v.speed * 3.6)}<small>km/h</small>` : ''; if (st !== this._sp) { sp.innerHTML = st; this._sp = st; }
    // nome da área / rua (estilo jogo de mundo aberto)
    this.areaT -= dt; this._ar = (this._ar || 0) - dt;
    if (this._ar <= 0) { this._ar = 0.5; const dn = districtName(pl.x, pl.z); const rd = roadAt(pl.x, pl.z); const street = rd.d < rd.seg.w + 6 ? rd.seg.line.name : ''; const key = dn + '|' + street;
      if (key !== this.lastArea) { this.lastArea = key; $('area').innerHTML = `${dn}<small>${street}</small>`; $('area').classList.add('on'); this.areaT = 3.5; } }
    if (this.areaT <= 0) $('area').classList.remove('on');
    // balão do pedestre
    if (this._sayP) { const p = this._sayP; const vpos = G.tmpV.set(p.x, 2.2, p.z).project(cam); const s = $('say'); if (vpos.z > 1) s.style.display = 'none'; else { s.style.display = ''; s.style.left = ((vpos.x + 1) / 2 * innerWidth) + 'px'; s.style.top = ((1 - vpos.y) / 2 * innerHeight) + 'px'; } }
    this.drawMini(cam);
  }
  blips(ctx, X, Z, scale, mini) {
    const G = this.G; const ms = G.missions;
    const dot = (x, z, col, r = 5, emoji) => { const px = X(x), pz = Z(z); if (emoji) { ctx.font = `${r * 2.4}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000a'; ctx.beginPath(); ctx.arc(px, pz, r * 1.5, 0, 7); ctx.fill(); ctx.fillText(emoji, px, pz + 1); return; } ctx.fillStyle = col; ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(px, pz, r, 0, 7); ctx.fill(); ctx.stroke(); };
    if (!ms.active) for (const s of ms.starts) dot(s.x, s.z, s.col, mini ? 6 : 7, s.icon);
    for (const s of ms.shells) if (s.got) dot(s.x, s.z, '#5ff6ff', mini ? 2 : 3);
    if (ms.active && ms.active.type === 'foto') dot(ms.active.lm.x, ms.active.lm.z, '#ff4fb8', 7, '📷');
    else if (!mini) for (const l of LANDMARKS) dot(l.x, l.z, G.save.photos.includes(l.id) ? '#888' : '#ff4fb8', 4);
    if (ms.active && ms.active.tx != null) { dot(ms.active.tx, ms.active.tz, '#ffd23f', 7); if (ms.active.race) { const n = ms.active.race.pts[ms.active.k + 1]; if (n) dot(n[0], n[1], '#ffd23f88', 4); } }
    else if (this.waypoint) dot(this.waypoint[0], this.waypoint[1], '#c86bff', 6);
  }
  route(ctx, X, Z, w) { const r = this.G.route; if (!r || r.length < 2) return; ctx.strokeStyle = '#c86bff'; ctx.lineWidth = w; ctx.lineJoin = ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(X(r[0][0]), Z(r[0][1])); for (const p of r) ctx.lineTo(X(p[0]), Z(p[1])); ctx.stroke(); }
  drawMini(cam) {
    const G = this.G; const c = this.mctx, W = this.mini.width, H = this.mini.height; const pl = G.player;
    const sp = pl.vehicle ? pl.vehicle.speed : 0; const zoom = (W / 220) * (1.25 - Math.min(0.55, sp / 80)); // px por px do mapa
    c.save(); c.fillStyle = '#1b4f78'; c.fillRect(0, 0, W, H);
    c.translate(W / 2, H * 0.62); c.rotate(G.camYaw + Math.PI); c.scale(zoom, zoom);
    const mx = (pl.x - BOUNDS.x0) * MAPSCALE, mz = (pl.z - BOUNDS.z0) * MAPSCALE;
    c.translate(-mx, -mz); c.drawImage(this.map.canvas, 0, 0);
    const X = (x) => (x - BOUNDS.x0) * MAPSCALE, Z = (z) => (z - BOUNDS.z0) * MAPSCALE;
    this.route(c, X, Z, 3.5);
    c.restore();
    // blips na tela (não giram)
    const cs = Math.cos(G.camYaw + Math.PI), sn = Math.sin(G.camYaw + Math.PI);
    const toS = (x, z) => { const dx = (x - pl.x) * MAPSCALE * zoom, dz = (z - pl.z) * MAPSCALE * zoom; let sx = dx * cs - dz * sn, sz = dx * sn + dz * cs; const lim = W / 2 - 10, limz = H * 0.62 - 10; const k = Math.max(Math.abs(sx) / lim, sz < 0 ? -sz / limz : sz / (H * 0.38 - 10), 1); return [W / 2 + sx / k, H * 0.62 + sz / k]; };
    const S = W / 220;
    const ms = G.missions; const dot = (x, z, col, r, emoji) => { const [px, pz] = toS(x, z); c.beginPath(); c.arc(px, pz, r * S * (emoji ? 1.5 : 1), 0, 7); c.fillStyle = emoji ? '#000b' : col; c.fill(); c.lineWidth = 1.5 * S; c.strokeStyle = emoji ? col : '#000'; c.stroke(); if (emoji) { c.font = `${r * 2.2 * S}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(emoji, px, pz + S); } };
    if (!ms.active) for (const s of ms.starts) dot(s.x, s.z, s.col, 6, s.icon);
    if (ms.active && ms.active.type === 'foto') dot(ms.active.lm.x, ms.active.lm.z, '#ff4fb8', 6, '📷');
    if (ms.active && ms.active.tx != null) dot(ms.active.tx, ms.active.tz, '#ffd23f', 6);
    else if (this.waypoint) dot(this.waypoint[0], this.waypoint[1], '#c86bff', 6);
    // jogador
    c.save(); c.translate(W / 2, H * 0.62); c.rotate(-(pl.vehicle ? pl.vehicle.h : pl.h) + G.camYaw);
    c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2 * S; c.beginPath(); c.moveTo(0, -9 * S); c.lineTo(6 * S, 7 * S); c.lineTo(0, 3 * S); c.lineTo(-6 * S, 7 * S); c.closePath(); c.fill(); c.stroke(); c.restore();
    // norte
    const [nx, nz] = toS(pl.x, pl.z - 5000); c.fillStyle = '#fff'; c.font = `bold ${12 * S}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('N', nx, nz);
  }
  openMap() { if (this.G.phoneOpen) this.closePhone(); $('bigmap').hidden = false; this.G.paused = true; this.drawBig(); }
  closeMap() { $('bigmap').hidden = true; this.G.paused = false; }
  drawBig() {
    const G = this.G; const mc = this.map.canvas; this.bm.width = mc.width; this.bm.height = mc.height; const c = this.bctx;
    c.drawImage(mc, 0, 0); const X = this.map.X, Z = this.map.Z;
    c.font = 'bold 15px sans-serif'; c.fillStyle = '#fff'; c.textAlign = 'center'; c.shadowColor = '#000'; c.shadowBlur = 4;
    for (const [t, x, z] of [['SOLARA BEACH', 180, -40], ['CENTRO', -480, -520], ['GLADES', -880, -560], ['BAÍA', -120, 40], ['OCEANO', 650, 0], ['PRAIA', 360, -660]]) c.fillText(t, X(x), Z(z));
    c.shadowBlur = 0;
    this.route(c, X, Z, 5); this.blips(c, X, Z, 1, false);
    const pl = G.player; c.save(); c.translate(X(pl.x), Z(pl.z)); c.rotate(-(pl.vehicle ? pl.vehicle.h : pl.h) + Math.PI); c.fillStyle = '#fff'; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, -11); c.lineTo(8, 9); c.lineTo(0, 4); c.lineTo(-8, 9); c.closePath(); c.fill(); c.stroke(); c.restore();
  }
  // ----- celular
  openPhone(page) { const G = this.G; G.phoneOpen = true; G.paused = true; $('phone').hidden = false; if (document.pointerLockElement) document.exitPointerLock(); page ? this.phonePage(page) : this.phoneHome(); }
  closePhone() { this.G.phoneOpen = false; this.G.paused = false; $('phone').hidden = true; this.G.persist(); }
  phoneHome() {
    const G = this.G; const h = Math.floor(G.env.hour), m = Math.floor((G.env.hour % 1) * 60); $('phClock').textContent = `${h}:${String(m).padStart(2, '0')}`;
    $('phBack').hidden = true;
    const apps = [['gravar', '🔴', G.recording ? 'Parar gravação' : 'Gravar vídeo', '#ff2d45'], ['oficina', '🔧', 'Oficina Neon', '#b45cff'], ['missoes', '🎯', 'Missões', '#ff4fb8'], ['mapa', '🗺️', 'Mapa', '#2ab3b8'], ['radio', '📻', 'Rádio', '#7d6cf0'], ['clima', '🌤️', 'Clima e hora', '#ff8a3c'], ['vibez', '💬', 'Vibez', '#e0245e'], ['ajustes', '⚙️', 'Ajustes', '#555'], ['ajuda', '❓', 'Controles', '#3a8fd8'], ['stats', '🏆', 'Progresso', '#46c08c']];
    const saved = G.savedAt ? `✅ Salvo às ${G.savedAt}` : '💾 Salvar progresso';
    $('phBody').innerHTML = `<div class="saveRow"><button class="saveBtn${G.savedAt ? ' ok' : ''}" id="phSaveG">${saved}</button><button class="saveBtn inst" id="phInst">📲 Instalar</button></div><div class="apps">${apps.map(a => `<button class="app" data-p="${a[0]}"><i style="background:${a[3]}">${a[1]}</i>${a[2]}</button>`).join('')}</div>`;
    $('phBody').querySelectorAll('.app').forEach(b => b.onclick = () => {
      const p = b.dataset.p;
      if (p === 'mapa') { this.closePhone(); this.openMap(); }
      else if (p === 'gravar') { this.closePhone(); G.audio.init(); G.rec.toggle(); }
      else if (p === 'oficina') { const s = G.missions.starts.find(x => x.type === 'garagem'); this.waypoint = [s.x, s.z]; if (!G.missions.active) G.setRoute([s.x, s.z]); this.closePhone(); this.toast('🔧 GPS para a <b>Oficina Neon</b> — chegue de carro e aperte ' + (G.touch ? '▶' : 'Enter')); }
      else this.phonePage(p);
    });
    $('phSaveG').onclick = () => { const ok = G.saveNow(); const b = $('phSaveG'); b.classList.add('ok'); b.textContent = ok ? `✅ Progresso salvo às ${G.savedAt}` : '⚠️ Não deu para salvar (modo privado?)'; G.audio.chime(ok ? 'coin' : 'fail'); this.toast(ok ? '💾 Progresso salvo neste aparelho!' : 'O navegador bloqueou o salvamento', 2200); };
    $('phInst').onclick = () => { G.promptInstall(); };
  }
  phonePage(p) {
    const G = this.G; const B = $('phBody'); $('phBack').hidden = false; let h = '';
    if (p === 'missoes') {
      h = `<h3>🎯 Missões</h3><div class="list">`;
      if (G.missions.active) h += `<button data-a="cancel">Cancelar missão atual<span>✕</span></button>`;
      h += `<button data-a="foto">📸 Pedido de foto (pela Vibez)<span>agora</span></button>`;
      for (const s of G.missions.starts) if (!s.passive) h += `<button data-a="go" data-x="${s.x}" data-z="${s.z}">${s.icon} ${s.name}<span>GPS ›</span></button>`;
      h += `<button data-a="go" data-x="${SPAWNS.taxiStands[0].x}" data-z="${SPAWNS.taxiStands[0].z}">🚕 Ponto de táxi (entre no táxi e aperte Iniciar)<span>GPS ›</span></button></div>`;
    } else if (p === 'radio') {
      h = `<h3>📻 Rádio</h3><div class="list">${STATIONS.map((s, i) => `<button data-a="st" data-i="${i}" class="${i === G.audio.station ? 'sel' : ''}">${s.name}<span>${s.tag}</span></button>`).join('')}</div><p class="small">Músicas originais geradas ao vivo pelo seu navegador. Tocam dentro dos veículos.</p>`;
    } else if (p === 'clima') {
      h = `<h3>🌤️ Clima e hora</h3><div class="list">${[['Amanhecer', 6.4], ['Manhã', 9], ['Meio-dia', 12], ['Pôr do sol', 18.3], ['Noite neon', 21.5], ['Madrugada', 2]].map(([n, v]) => `<button data-a="hr" data-v="${v}">${n}<span>${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? String(Math.round(v % 1 * 60)).padStart(2, '0') : '00'}</span></button>`).join('')}
        ${[['limpo', '☀️ Céu limpo'], ['nublado', '⛅ Nublado'], ['chuva', '🌧️ Chuva']].map(([k, n]) => `<button data-a="wx" data-v="${k}" class="${G.env.weather === k ? 'sel' : ''}">${n}<span></span></button>`).join('')}
        <button data-a="spd">Velocidade do tempo<span>${G.env.speed === 0 ? 'parado' : G.env.speed > 0.03 ? 'rápido' : 'normal'}</span></button></div>`;
    } else if (p === 'vibez') {
      h = `<h3>💬 Vibez</h3>` + G.feed.slice(0, 14).map(f => `<div class="post"><b>${f[0]}</b> ${f[1]}<small>${f[2]}</small></div>`).join('');
    } else if (p === 'ajustes') {
      const q = G.save.quality || 'auto';
      h = `<h3>⚙️ Ajustes</h3><div class="list">${[['auto', 'Gráficos: automático'], ['low', 'Gráficos: leve (celular)'], ['medium', 'Gráficos: médio'], ['high', 'Gráficos: alto']].map(([k, n]) => `<button data-a="q" data-v="${k}" class="${q === k ? 'sel' : ''}">${n}<span>${k === G.Q.level && q === 'auto' ? 'em uso: ' + G.Q.level : ''}</span></button>`).join('')}
        <button data-a="mute">Som<span>${G.audio.muted ? 'desligado' : 'ligado'}</span></button>
        <button data-a="sens">Sensibilidade da câmera<span>${G.save.sens.toFixed(1)}x</span></button>
        <button data-a="fps">Mostrar FPS<span>${G.showFps ? 'sim' : 'não'}</span></button>
        <button data-a="reset">Recomeçar do zero<span>⟲</span></button></div>`;
    } else if (p === 'ajuda') {
      h = `<h3>❓ Controles</h3><div class="post"><b>Computador</b><br>WASD/setas: andar e dirigir<br>Mouse: câmera (clique para travar, Esc solta)<br>Shift: correr · Espaço: pular / freio de mão<br>E: entrar/sair do veículo · Enter: iniciar missão<br>F: foto · H: buzina · R: trocar rádio<br>M: mapa · P: celular · C: câmera</div>
        <div class="post"><b>Celular</b><br>Joystick à esquerda (no carro: cima acelera, baixo freia)<br>Arraste no lado direito para olhar<br>Botões: 🚗 entrar/sair · ⤒ pular/freio · 📷 foto · ▶ iniciar</div>
        <div class="post"><b>Sem violência</b><br>Aqui ninguém se machuca: pedestres desviam, batidas só dão um susto. Ganhe dinheiro e seguidores com entregas, táxi, corridas, fotos e conchas neon.</div>`;
    } else if (p === 'stats') {
      const S = G.save; h = `<h3>🏆 Progresso</h3><div class="list"><div class="row">Dinheiro<b>$${S.money.toLocaleString('pt-BR')}</b></div><div class="row">Seguidores<b>${S.followers.toLocaleString('pt-BR')}</b></div><div class="row">Missões concluídas<b>${S.done}</b></div><div class="row">Conchas neon<b>${S.shells.length}/${G.missions.shells.length}</b></div><div class="row">Pontos fotografados<b>${S.photos.length}/${LANDMARKS.length}</b></div>${RACES.map(r => `<div class="row">${r.name}<b>${S.best[r.id] ? S.best[r.id] + 's' : '—'}</b></div>`).join('')}</div>`;
    }
    B.innerHTML = h;
    B.querySelectorAll('button[data-a]').forEach(b => b.onclick = () => this.phoneAction(b.dataset, p));
  }
  phoneAction(d, page) {
    const G = this.G;
    if (d.a === 'cancel') { G.missions.cancel(); this.phonePage(page); }
    else if (d.a === 'foto') { if (G.missions.active) G.missions.cancel(); G.missions.startPhoto(); this.closePhone(); }
    else if (d.a === 'go') { const x = +d.x, z = +d.z; this.waypoint = [x, z]; if (!G.missions.active) G.setRoute([x, z]); this.closePhone(); this.toast('📍 GPS marcado — siga a linha roxa no mapa'); }
    else if (d.a === 'st') { G.audio.init(); G.radioSet(+d.i); this.phonePage(page); }
    else if (d.a === 'hr') { G.env.setTime(+d.v); G.persist(); this.toast('Hora ajustada'); this.phonePage(page); }
    else if (d.a === 'wx') { G.env.setWeather(d.v); G.save.weather = d.v; G.persist(); this.phonePage(page); }
    else if (d.a === 'spd') { G.env.speed = G.env.speed === 0.025 ? 0.08 : G.env.speed === 0.08 ? 0 : 0.025; this.phonePage(page); }
    else if (d.a === 'q') { G.save.quality = d.v; G.persist(); this.toast('Aplicando gráficos…'); setTimeout(() => location.reload(), 300); }
    else if (d.a === 'mute') { G.audio.setMuted(!G.audio.muted); G.save.muted = G.audio.muted; G.persist(); this.phonePage(page); }
    else if (d.a === 'sens') { G.save.sens = G.save.sens >= 2 ? 0.6 : Math.round((G.save.sens + 0.2) * 10) / 10; G.persist(); this.phonePage(page); }
    else if (d.a === 'fps') { G.showFps = !G.showFps; this.phonePage(page); }
    else if (d.a === 'reset') { if (confirm('Apagar todo o progresso e recomeçar?')) { localStorage.removeItem(G.SAVE_KEY); location.reload(); } }
  }
  showPhoto(url, res) {
    $('phImg').src = url; $('phSave').href = url; $('phCap').textContent = res.caption; $('photo').hidden = false; this.G.paused = true;
    let n = 0; const tgt = res.likes; const el = $('phLikes'); clearInterval(this._li);
    this._li = setInterval(() => { n = Math.min(tgt, n + Math.ceil(tgt / 25)); el.textContent = '♥ ' + n.toLocaleString('pt-BR'); if (n >= tgt) clearInterval(this._li); }, 60);
  }
}
