# NOTAS-RETOMADA — Miami Beach Drive: mundo aberto (Solara Bay)

Tarefa (pt286u): transformar o Miami Beach Drive em mundo aberto estilo GTA VI (visual moderno Vice City/Leonida:
luz rica, reflexos, muita vida, vibe de rede social), SEM violência, sem marcas/assets/músicas com direitos.
NÃO DAR PUSH — o usuário precisa aprovar. Commit fica preparado localmente.

- Pasta de build: /workspace/miami-mundo-aberto (clone de /workspace/miami-beach-drive, origin = GitHub, base ee17115)
- Three.js r170 vendorizado em vendor/three (MIT, LICENSE junto). Código em src/*.js (ES modules), index.html carrega via importmap.
- Testes: /workspace/miami-mundo-aberto/test/ (puppeteer-core de /workspace/miami-test/node_modules + /usr/bin/google-chrome swiftshader)
  rodar: cd test && nice -n 19 node run.js  → screenshots em screenshots/
- Servir local: python3 -m http.server 8765 dentro da pasta (nice 19)
- Para publicar (após aprovação): cd /workspace/miami-mundo-aberto && git push origin main

## Progresso
- [15:55] v1 jogável: src/{util,world,env,vehicles,people,traffic,audio,missions,ui,main}.js + style.css. Testes test/play.js (desk/mob) passam:
  entrar/sair, dirigir, missão de entrega concluída, sem erros no console. Swiftshader headless = 3–14 fps (CPU), não representa GPU real.
- Próximo: polir visual (água, pôr do sol), checar trânsito/pedestres, telas finais, README, commit (sem push).
- [16:05] Polimento: janelas variadas, grama com lâminas, lagoas nos Glades, +carros estacionados (34), +pedestres (40/64),
  foto "selfie" enquadra o ponto turístico (main.js render), feixes de início/alvo esmaecem de perto. test/missions.js
  testa foto+corrida+táxi+lancha: tudo OK, sem erros. Próximo: shots finais, play.js desk/mob, README, commit local (sem push).
- [16:30] Selfie nas fotos (personagem de frente, óculos visíveis), lanternas/placa nos carros, carro inicial vermelho,
  água noturna com reflexo neon rosa/ciano, rádio no celular não cobre mais a missão, prompt sem "Enter" no toque,
  marina ajustada para o cais. Testes finais OK (play desk medium + mob, missions, smoke): 0 erros no console.
  Screenshots finais: screenshots/final-*.png. README reescrito. Commit local refeito (sem screenshots/PNGs de teste).
  NÃO FOI DADO PUSH. Para publicar após aprovação: cd /workspace/miami-mundo-aberto && git push origin main

## Tarefa 2 (t291u, 16:38) — 8bf5b4b já publicado (aprovado). NOVO: NÃO DAR PUSH sem aprovação.
1. Gravação (REC na tela + celular): canvas.captureStream + áudio WebAudio + MediaRecorder (MP4 > WebM), timer, parar,
   painel: preview, Salvar vídeo, Compartilhar (share files / fallback), Mandar link (+WhatsApp), Descartar. Limite p/ celular, iOS.
2. Instalar: manifest 192/512/maskable, beforeinstallprompt, instrução iOS, service worker offline, botão "Salvar progresso".
3. Carros tunados (neon underglow, aerofólio, wide body, adesivos com letras originais, rodas, nitro com chama/blur),
   garagem/oficina (pintura, neon, aerofólio, texto), NPCs tunados, rachas contra tunados.
Testes: 390x844 + 1440x900, 0 erros, gravar 5s -> blob>0, download -> ffprobe, fallback share, installability, screenshots.
- [17:20] Código novo: src/recorder.js, src/install.js, src/garage.js, src/rivals.js, sw.js, ícones maskable/apple,
  manifest novo; vehicles.js (tunagem+nitro), main.js/ui.js/missions.js/traffic.js/audio.js integrados. Próximo: testar.
- [17:00] test/features.js (instalar, oficina, nitro, NPC tunado, racha, gravação+download+ffprobe, share fallback/files,
  mandar link, descartar, salvar progresso) PASSOU em 1440x900 e 390x844 (UA iPhone): 0 erros. MP4 H.264 (+Opus no Chrome Linux).
  Rodando bateria final (features desk medium, play desk/mob, missions). Depois: commit local (sem push, sem screenshots).
- [17:05] Bateria final OK: features desk(medium)+mob(UA iPhone), play desk/mob, missions: 0 erros. Commit local feito (ver git log). NÃO DAR PUSH.
  Publicar após aprovação: cd /workspace/miami-mundo-aberto && git push origin main

## Tarefa 3 (t292u, 17:04) — base 6133a37 (NÃO publicado). NÃO DAR PUSH.
1. Avatares realistas F/M (glTF CC0 com animações idle/walk/run/drive; CREDITOS; fallback procedural), escolha na tela inicial + celular, salvo.
   Física a pé: aceleração/inércia, giro suave, pulo, degraus, sem atravessar paredes.
2. Helicóptero: luzes piscando + holofote à noite; rotas ambientes (vários à noite) + pilotável no heliponto (teclado/toque).
3. NPCs conversam (E / "Conversar"): falas pt-BR por contexto, personalidades, mini missões, reação a nitro/tunado.
4. Leveza: detectar celular/PC, Android/iPhone; perfis; lazy load; SW offline; medir tamanho e tempo de carga.
5. "fila verdadeiro" = provável "física verdadeira": suspensão, transferência de peso, drift.
Testes 390x844 (Android+iPhone UA) e 1440x900; screenshots avatares, heli noite, conversa, seletor.

### Progresso Tarefa 3 (17:50)
- Feito: src/avatar.js (Luna/Davi GLB CC0 ~220 KB cada), device.js, heli.js (heliponto 416,-200; frota ambiente), talk.js+phrases.js,
  física carro (peso/suspensão/drift), LOD, SW v4. Testes: test/avatars.js, test/heroes.js (args: W H q saída; IOS=1 p/ iPhone).
- Bug corrigido: dt negativo no 1º quadro quebrava HeliFleet.at (agora dt>=0 e índice com módulo positivo).
- t293u: usuário APROVOU publicar quando tudo pronto e testado → 1 push em origin main + conferir site ao vivo (SW versão nova).
- t297u: heróis originais (src/heroes.js + src/powers.js, tecla X / botão ⚡): Teia Neon (escala/fio), Armadura Solar (voo),
  Colosso Verde (super pulo, levanta/solta carro sem dano), Sentinela (arrancada + escudo quica), Lorde Férreo (levita),
  Titã Violeta (pisão com onda de luz). Reusam esqueletos CC0 + acessórios procedurais; miniaturas webp ~3-4 KB.
- Pendente: rodar suíte completa (/tmp/runall.sh), medir tamanho/tempo, apagar .preview/, commit, push, conferir site.
### 18:25 retomada após restore
- Feito depois de 17:50: física do carro corrigida (velocidade não gira junto com o carro → drift real com freio de mão: lateral 12 m/s vs 0,8 normal),
  MBD.teleport zera velocidade, dicas de poder adaptadas ao toque, .preview/ apagado. Suíte 2 passou toda (0 erros) antes destas correções.
- Agora: rodar /tmp/runall.sh de novo → commit → push único (aprovado t293u) → conferir site ao vivo.
- 18:40 suíte final OK (avatars/heroes x3 perfis, features/play/missions desk+mobile, 0 erros). Commit + push aprovado (t293u).
- 18:45 PUBLICADO: commit 19c6e90 em origin/main (push único). GitHub Pages OK; site ao vivo serve SW solara-v4-2026-11-09-herois,
  8 cartões de avatar, herói 3D carrega, 0 erros. https://eusoudaquintadimensao-creator.github.io/miami-beach-drive/

## Tarefa 4 (pt317u, 20:15) — Modo corrida estilo NFS. Base 19c6e90 (publicado). NÃO DAR PUSH (sem aprovação).
Pedido: pista de corrida com nitro, drift no freio nas curvas, carros de corrida tunados mais realistas.
Plano: src/track.js (Autódromo Neon nos Glades norte, zona x -1085..-700 z -712..-445, entrada pela Estrada do Pântano z=-420),
src/race.js (seleção de carro, largada com luzes, voltas/checkpoints, rivais IA, tela final, recorde em localStorage 'mbd-corrida-v1'),
src/fx.js (fumaça de pneu, marcas de derrapagem, linhas de velocidade), vehicles.js (4 carros de corrida: perfil com caixas de roda,
tumblehome, splitter, difusor, número; física drift arcade p/ spec.race), SW v5. Teste: test/race.js (desk + mobile).
### Tarefa 4 — progresso (20:35–21:10)
- Feito: track.js, race.js, fx.js, 4 carros de corrida, drift arcade, nitro (recarrega no drift), SW v6. test/race.js passa (desk):
  largada, 6 checkpoints, volta ~45 s (piloto automático), recorde em mbd-corrida-v1, tela final, drift (ângulo, fumaça, marcas),
  nitro (FOV 82, linhas), gravação MP4 + ffprobe, 0 erros. Rivais deixados mais lentos (skill .95/.91/.87, aLat 12) p/ jogador casual.
- Drift: mais perda de velocidade de lado (beta), giro maior em alta.
### ESCOPO ESTENDIDO (pai, 20:34) — mesma atualização, NÃO DAR PUSH
1. QA completo Android/iPhone/desktop (retrato/paisagem, toque, FPS/draw calls, qualidade auto) + corrigir bugs.
2. Atalhos pequenos (#quick): 🏁 Corrida, 🎒 Mochila a jato (src/jetpack.js, J), 🚁 chamar Helicóptero (G.callHeli, G), 🏠 Casa.
3. NPCs com VOZ: Kokoro-82M (Apache-2.0) offline -> assets/voz/{f,m,s}/<fnv>.mp3 (205 falas x 3 vozes, 7,8 MB, lazy) + index.json.
   Gerador: /workspace/miami-voz/{bank.mjs,gen.py} (venv /workspace/kokoro-venv). Runtime: src/voice.js (hash FNV da fala normalizada,
   divide vibe+cumprimento, toca no WebAudio -> entra na gravação; abaixa o rádio). Hook em ui.talkBubble/pedBubble.
   Novas falas: RACE/DIRS/JET/HOME em phrases.js; personagens passeiam (Walk), olham, acenam e cumprimentam; pedestres olham/acenam, alguns no celular.
4. Casa Solara (src/home.js): (-470,650) sul do Centro, garagem com 3 carros (tunado/corrida/moto), porta -> painel (visual, salvar,
   dormir, autódromo), apresentação 1ª vez (localStorage 'mbd-casa-v1'). Testes: test/extras.js (W H q saída; IOS=1).
### ESCOPO 3 (pai, 21:00) — mesma atualização, NÃO DAR PUSH
- Gravação: limite 2:00 p/ todos (recorder.maxSec=120), contagem "acaba em Xs" + classe .ending nos últimos 10 s, 2/3,5 Mbps vídeo, 96 kbps áudio.
  Teste: test/rec.js (W H q saída maxSec) -> grava no carro com rádio+nitro, parada automática, ffprobe (h264+opus), volumedetect, salvar, share com arquivo, fallback, copiar link.
- Veículo assinatura por personagem: src/signature.js (SIGNATURE, roadSpot, callCar, updateCarCall). Novo tipo 'pickup' (Caminhonete Atol) e moto tunável (tuneMoto).
  Chamar veículo: botão 🚘 #qCar + tecla B; acha faixa livre numa rua (SEGS) até 90 m, sem água/prédio/carro; chega deslizando 2,6 s.
- Nitro de cinco camadas: vehicles.js nStage 1..5 (0,6 s cada), boost 0,6+0,1·estágio; HUD #nitroW com 5 segmentos .nSegs + "NITRO ×N".
- Traje nano-metal: heroes.js nanoSuit (só no jogador: makeModel(...,suit=true) em Avatar.setAvatar): roupa metálica escura + linhas/nós de luz (SUIT_GLOW).
- Corrigido: talk.whoOf usava ped.per (que é perímetro do quarteirão) -> erro 'emoji'; agora o.pers.
- Teste: test/sig.js (W H q saída [ids]) -> screenshots sig-*-<id>.png, sig-*-nitro5.png, sig-*-chamar.png.

### Publicado (21:50) — aa9fca3 em origin/main (aprovado pelo usuário t320u). Site ao vivo verificado: SW solara-v7-2026-11-09-veiculos-assinatura, 0 erros desk/celular.

## Tarefa 5 (pt321u, 21:54) — base aa9fca3 (publicado). NÃO DAR PUSH (sem aprovação).
Pedido: NPCs com rotina diária (relógio do jogo), corridas de rua noturnas (estilo próprio, sem marcas), mais pedestres/bares/
restaurantes/movimento, gaivotas na praia, presentes com poderes (mochila turbo, prancha flutuante, planador, superpulo, superforça,
supercorrida) com HUD/tempo/respawn/contador em 'mbd-presentes-v1', miniaturas do avatar com traje nano-metal, SW novo, testes.
Plano: src/life.js (bares/restaurantes/balada/academia + agenda por persona), people.js (rotina, cachorros, sacolas, poses sentar/dançar/
exercício/conversa), src/birds.js (gaivotas instanciadas), src/gifts.js (presentes + poderes), src/street.js (Liga da Madrugada:
rivais à noite, pisca-farol L, rota com setas/portais, reputação 'mbd-ruas-v1', pinturas e nitro), vozes novas (ROUTINE/STREET em phrases.js).
- 21:58 vozes novas gerando (bank.json 248 falas) -> /tmp/voz2.log
- 22:40 vozes prontas (40 falas novas × 3 vozes, assets/voz). Módulos integrados no main.js:
  * life.js: 14 lugares (7 quiosques no calçadão com mesas/guarda-sóis/varal de luz, 4 cafés/bistrô/bar nas praças do Centro, quiosque do parque,
    balada Pulso Beach Club (pista de dança colorida), Academia da Praia). Horários por tipo (KINDS). G.life.nearest() -> música abafada a pé (audio venueSt) + burburinho.
  * people.js: persona -> activity(h) -> spawn em assento/pista/aparelho/vitrine/dupla/cachorro; "casa" some (16% ainda na rua); LOD (>150 m atualiza 1/3);
    quem muda de atividade perto da câmera vai embora andando (14–24 s). Q.peds low 30 / medium 60 / high 92 (celular ×0,75).
  * birds.js: 6 bandos × 8 gaivotas (3 InstancedMesh), voa -> pousa -> espalha (<14 m), some >320 m. audio.gull().
  * gifts.js: 34 presentes (6 tipos), respawn 150 s, HUD #giftHud, 'mbd-presentes-v1' {total,tipos,turbo}; 3 mochilas = turbo permanente.
    Hooks no main: speedK() no maxS, jumpV() no pulo, foot() antes do jetpack, push() no laço de colisão a pé (superforça), airPose 'board'/'glide'.
  * street.js: Liga da Madrugada (19h–5h), 4 rotas reais (ROUTES), 8 rivais (LEAGUE, nomes originais), L/💡 (#qFlash) pisca o farol (SpotLight +150),
    portões neon + seta #stArrow + GPS, IA cinemática com elástico, resultado #stRes com ranking, pinturas (applyLivery) e NITRO.lvl (vehicles.js), 'mbd-ruas-v1'.
  * Miniaturas: test/thumbs.js renderiza makeModel(id,null,null,true) -> assets/avatars/*.webp 192×256 (antigas em /tmp/thumbs-old).
  * SW: solara-v8-2026-11-09-rotinas-ruas-presentes (+life/birds/gifts/street no CORE).
  * Teste novo: test/vida.js (W H q saída; IOS=1) -> censo 8/13/18/22/3h, lugares, gaivotas+espalhar, 6 poderes, racha completo+pintura, draw calls low, 0 erros.

### Tarefa 5 / Atualização A — PUBLICADA (13/11): dc001e1 em origin/main, SW solara-v8-2026-11-09-rotinas-ruas-presentes, verificado ao vivo (desk+iPhone, 0 erros).
- Skills gamedev: clone em /workspace/gamedev-skills (Apache-2.0), RESUMO-PT.md escrito. `npx skills add` instalou em /tmp/.agents (não no repo do jogo).
  Aplicado no Solara Bay (sem copiar código Godot/Unity):
  * física do carro em passo fixo 1/60, máx. 3 subtpassos (teste 30 vs 60 Hz: diferença 0 m em 2 s)
  * zona morta radial no joystick; coyote + buffer de pulo 120 ms
  * tremor de câmera com trauma² + ajuste “Tremor da câmera” (desligado/suave/normal)
  * variação de pitch nos SFX; histerese de 21 min nas rotinas dos NPCs
  * MBD.frameStats() (média/p95/p99 em ms); p95 CPU ~2–4 ms no teste headless
- test/vida.js passou (0 erros, 0 falhas) em desktop 1280×720, iPhone 390×844 e Android paisagem 844×390.
  Censo 3h < 13h, 14 lugares, 6 poderes, Liga completa, draw calls 210–267 (low). race.js desk também 0 erros.
- SW: solara-v8-2026-11-09-rotinas-ruas-presentes. Chaves novas: mbd-presentes-v1, mbd-ruas-v1 (mbd-solara-v1 intocado).

## Atualização B — Circuito Serpentina (13/11, noite)
Pedido (t322u, publicar depois dos testes): pista estilo drift ao lado da Casa Solara, rivais com IA que derrapa, pontuação, bar/restaurante e espectadores com rotina própria. Nomes originais, leve no celular, SW novo, 0 erros, um push.

### Feito
- `src/serpentina.js`: Circuito Serpentina (~1549 m, Catmull-Rom, muros neon instanciados, arcos, pórtico "CIRCUITO SERPENTINA", faixa e zebras).
  Rivais: Lila Curva, Leo Fumaça, Nina Lateral, Rafa Serpente (cinemáticos, ângulo de drift grande nas curvas, fumaça, evitam o jogador).
  Sessão ao entrar de carro, HUD `#serpHud`, fecha após 6 s fora; recorde em `mbd-serpentina-v1` (mbd-solara-v1 intocado).
  Bar da Curva (16h–2h) entra em VENUES/SPOTS do life.js (8 mesas); espectadores instanciados (10/16/22) com turno 11–23 e histerese.
  Atalho 🐍 / tecla K / botão no painel da casa. Entrada em (-660, 600) na Av. do Centro. Pista não entra no quintal (HOME_ZONE).
- `src/world.js`: SERP_ZONE + aterro visual (chão + mureta ao sul de MAIN.z1=720), `HOOKS.surfs[]` (track.js também passou a empilhar), distrito "Circuito Serpentina", árvores/capim fora da pista.
- Skills aplicadas também aqui: geometria fundida + InstancedMesh (performance), histerese dos fãs, ocultar grupo >520 m, menos fãs no low, far=sessão ainda fecha.
- SW: `solara-v9-2026-11-13-serpentina` (+ src/serpentina.js no CORE).
- Teste `test/serp.js`: pista >800 m, 4 rivais andam e derrapam, bar, rotina dos fãs (15h/20h > 3h), recorde salvo, layout sem sobreposição, 0 erros.
  Passou desk 1280×720, iPhone 390×844 e Android paisagem 844×390 (low). Draw calls ~66–68, p95 CPU ~3–4 ms (headless).
  Fotos: screenshots/serp-{d,i,al}-{entrada,curva-ia,bar,hud}.png. Melhores: serp-d-entrada.png, serp-d-curva-ia.png, serp-d-bar.png, serp-d-hud.png.

### Publicado
- Commit a882ee1 em origin/main (19:23 -03). SW solara-v9-2026-11-13-serpentina.
- Ao vivo verificado (19:24–19:25 -03) em https://eusoudaquintadimensao-creator.github.io/miami-beach-drive/ :
  desk 1280×720 e iPhone 390×844, SW v9, 4 rivais, Bar da Curva, 15 lugares, botão 🐍, 0 erros de console, 0 HTTP 4xx.
  Fotos: screenshots/live9-{d,m}-{entrada,curva,bar}.png.

## Próximo (fila, só DEPOIS desta publicação verificada ao vivo)
- Jogo separado cyberpunk em /workspace/jogo-cyberpunk (cópia com A+B), nome original, chaves/SW próprios, repo+Pages novos, um push após testes.

## Tarefa t328u (13/11, 21:00 -03) — direção no celular, rachas guiados, pista livre. COMMIT LOCAL, NÃO DAR PUSH (publicação não aprovada).
Feito (skills: input, game feel, UI/HUD, veículo):
- `src/driveui.js` (novo): tela CONTROLES com 3 cards originais (Tocar · Inclinar · Volante virtual), escolha salva em `mbd-dirigir-v1`.
  Inclinar pede permissão no iOS (DeviceOrientationEvent.requestPermission) e calibra; zona morta radial 0.14 com reescala.
  Só vale DENTRO do veículo: deslizar ↑ = nitro, ↓ = drift. Limitador VEL (slider), Freio forte (segurar), Ré (toque liga/desliga),
  Farol alto — onde o polegar apoia. Botões de vidro semitransparentes; centro livre; HUD de direção mínimo (extras escondidos no carro).
  Abrir: 🎛️ no menu inicial, app Controles no celular, engrenagem no HUD.
- Botão entrar/chamar: 1 toque chama seu veículo (de qualquer lugar), 2 toques entra no mais próximo, aceita racha até ~50 m.
- Rachas de rua: setas (chevrons) no chão a cada 22 m e 3 por curva apontando a saída; bloqueios não violentos (cones, barreira,
  carro com giroflex) nas ruas erradas, com colisão; tudo removido no fim (`world.removeBox`).
- Batidas: só amassados cosméticos (dent + arranhão), o carro segue (deslize na parede mantém ≥82% da velocidade).
  Preso/fora da rota ~1 s → reaparece no trajeto com fade curto (racha, autódromo e circuito).
- Ao descer do carro, o joystick a pé volta.
- Pistas: arquibancada do autódromo agora ao lado da reta (|lat| ≥ 15,2 m > muro 11,5). Circuito: o bar estava EM CIMA do traçado
  (s≈1040) → movido para (-530, 810), terraço olhando a curva; postes/muro de um trecho que caíam sobre outro trecho são pulados
  (`_nearOther`); fãs (ao redor do bar) agora fora da pista. `test/linecheck.js`: 0 obstáculos na linha nas duas pistas.
- Luz: exposição noturna 0.88 (antes 1.0), bloom mais contido (strength 0.26+night·0.2, threshold 2.32−night·0.62).
- Farol alto do jogador = SpotLight real; IA usa feixes falsos baratos (cone aditivo), orçamento 8/16 carros a 95 m.
- Notificação do Sinal desviada do slider VEL ao dirigir.
- SW: `solara-v10-2026-11-13-dirigir`.
Testes (nice 19): `test/drive.js` PASS desk 1280×720, iPhone 390×844, iPhone paisagem 844×390, Android paisagem 915×412 — 0 erros de console.
  `test/serp.js` PASS (0 falhas, 0 erros). `test/linecheck.js` 0 hits (autódromo e circuito).
Fotos: screenshots/drv-d-{controles,hud,arrows,dent,beams,track,circuito}.png e drv-{i,il,al}-*.png (melhores: drv-d-controles, drv-il-hud,
  drv-d-arrows, drv-d-dent, drv-d-beams, drv-d-track, drv-d-circuito).
Para publicar SÓ após aprovação: git push origin main.

### Publicado t328 (13/11 21:09 -03) e correções t329 (21:12–21:30 -03)
- t328 publicado após aprovação (pt329u) e verificado ao vivo: SW solara-v10-2026-11-13-dirigir, 0 erros desk+iPhone, tela CONTROLES ok.
- t329 (regra: toda publicação leva as correções achadas), iPhone em pé:
  1. CONTROLES: overlay rolável e centrado com segurança (align flex-start + margin:auto), cards compactos no celular (sem min-height 200),
     cabe sem rolar em 390×844, 844×390 e 375×667; título e Pronto sempre visíveis.
  2. Dica de direção ("Segure a esquerda…") vai para a faixa de cima (entre minimapa e relógio) e some sozinha após 4,5 s; não cobre o Freio.
  3. Avisos (#toast) e notificações (#note) ao dirigir ficam na faixa de cima (retrato abaixo dos ícones; paisagem no topo), centro livre.
- SW solara-v11-2026-11-13-retrato. test/drive.js ganhou checagens t329 (título/Pronto, dica aparece/some/não cobre botões, avisos fora do centro e sem cobrir HUD).
  PASS desk 1280×720, iPhone 390×844, iPhone paisagem 844×390, Android paisagem 915×412 — 0 erros.

## t331 (22:30, 13/11) — drift longo/pêndulo, nitro 8 níveis + motor, faróis/lanternas, LED nas palmeiras, lojas, botão chamar→entrar (PUBLICADO, aprovado)
- Drift por deslize p/ baixo (input.kick): janela DRIFT_WIN 2,6 s (máx 3,4) que se estende segurando acelerador + direção para dentro;
  contra-esterço >0,14 s encadeia para o outro lado (pêndulo, dChain); grip traseiro volta em 1,25 s (recSlow). HUD #driftW (tempo + ×pêndulo).
- Nitro NITRO_STAGES=8 (HUD 8 segmentos, agora visível dirigindo no celular — removido o hide em main.js), MOTOR.lvl 0–3 na garagem (+9%/nível vel. máx.).
- Faróis do jogador: baixo 150/115 m, alto 520/240 m; lanternas com brilho vermelho aditivo (setupTailGlow) em jogador e IA; orçamento de luzes agora do mais perto p/ o mais longe.
- Cidade: anéis/fitas de LED nas palmeiras (InstancedMesh), térreos com vitrines/portas/toldos/letreiros originais (acendem à noite).
- Botão: 1º toque chama o carro, que para ~5 m À FRENTE (frontSpot, caminho seguro); próximo toque entra; toque de novo sai.
- CSS: corrigido seletor órfão (body.driving.touch #bDown,) que mostrava bPhoto sobre o freio.
- Testes: test/mech.js (novo) + drive/serp/linecheck em d/i/il/al: tudo PASS, 0 erros. SW solara-v12-2026-11-13-drift.


## t332 (13/11, noite) — Ponte do Mar: ponte de drift sobre o mar + 5 IAs em tandem + rádio pt-BR
- src/seabridge.js: laço fechado Catmull-Rom (centripetal) de ≈11,3 km a leste da ilha (x 468–1445, z −1024–1124), tabuleiro de 18 m
  (HALF_W 9) a ~9,5 m ±3 m de altura (loopH), 4 passagens N–S em S (senoide 95 m/440 m), 3 grampos e retorno com S suaves; raio mín. ≈21 m.
  Traçado gerado por tools/ponte_design.py (comprimento, raio, folga entre trechos e estimativa). Estimativa no ritmo de drift
  (DRIFT_PACE cruzeiro 20 m/s, lateral 6 m/s²): ≈9,6 min/volta (576 s). Piloto automático em grip (teste) anda ~90 km/h → ≈7,5 min.
- Rampa (340 m) continua a Ocean Drive (x 300) no extremo sul (GATE 300,632) com pórtico neon, faixa quadriculada na largada (s=0, ≈520,700).
  Palmeiras do parque sul fora do corredor da rampa (world.js, mesma sequência do R()). Píer da praia excluído do tabuleiro (onPier).
- Física: world.js HOOKS.grounds/surfs/map (groundY consulta o tabuleiro em x>280); fora do tabuleiro = mar (age como guarda-corpo).
- Malha: trechos de 60 amostras (~180 m) construídos sob demanda (≤1 por quadro), recorte por distância (baixa 340 m / média 560 / alta 820),
  LOD distante único (buildFar), guarda-corpos com neon, postes a cada 36 m com poça de luz aditiva, pilares a cada 48 m.
- Fluxo: botão 🌉 (qPonte) / tecla O → leva à rampa (no carro) ou chama o carro no pórtico (a pé). A até 50 m do pórtico o botão de ação vira
  "🌉 Aceitar" (celular) / tecla E (desktop, aviso no placar) → sessão de 2 voltas. Entrar no laço dirigindo também inicia.
- IA: 5 pilotos (Bia Kaze (rc_jdm), Tchê Trovão (rc_muscle), Duda Faísca (rc_gt), Seu Valdo (picape verde), Lipe Besouro (classic amarelo)), fantasmas (não bloqueiam, noEnter), elástico perto do jogador
  (slots −30…44 m, troca a cada 34–48 s), desvio lateral, tandem com balanço de drift, fumaça + marcas (fx.aiTrail, G.fx.aiMarks).
- Rádio (src/radio.js + src/radiolines.js, 63 falas, 5 vozes Kokoro pf_dora/pm_alex/pm_santa com velocidade/tom diferentes, gíria gaúcha/BR,
  sem nome de lugar → iguais nos dois jogos): mp3 em assets/voz/radio/<piloto>/<fnv>.mp3 + index.json (carregados só na 1ª sessão), filtro de
  rádio (passa-alta 420, pico 1,7 kHz, passa-baixa 3,2 kHz, saturação, chiado), legenda #radioSub abaixo do placar #ponteHud.
  Eventos: largada, drift do jogador, tandem colado, muro, ultrapassagens, meia volta, faltam 2 / última volta, chegada, recorde, respawn, papo.
  Gerar de novo: /workspace/kokoro-venv/bin/python tools/gen_radio.py tools/radio_bank.json assets/voz/radio (banco exportado de radioBank()).
- Sessão: pontos (G.drift), tempo de volta, recorde de volta e de pontos em localStorage 'mbd-ponte-v1' {bestLap,bestScore,runs,laps};
  respawn automático na pista (contramão parado, batida parada, centro do carro fora do tabuleiro ou parado na borda >3 s; depois de >1,1 s).
  (Bug achado no teste iPhone paisagem: carro com o centro logo além da borda ficava travado sem respawn — corrigido + teste 'edge respawn'.)
- Também: mapa redesenhado após todos os sistemas (G.ui.refreshMap) — antes as marcações de corrida/circuito/ponte não apareciam no minimapa.
- G.camOverride (só testes/fotos): câmera aérea.
- Testes: test/ponte.js (traçado 8–12 km e estimativa, chamar→entrar→aceitar ≤50 m/não aos 75 m, rampa dirigível até o laço, 5 IAs ativas
  e em drift com fumaça/marcas, elástico, rádio (todas as 63 falas com mp3, fetch 200, legenda + áudio tocado), layout sem sobreposição,
  draw calls em baixa, respawn, 2 voltas + recorde salvo, 0 erros) em desk/iPhone/iPhone paisagem/Android paisagem + desk alta.
  Fotos: screenshots/ponte-<d|i|il|al>-{overview,tandem,radio,hud}.png. SW solara-v13-2026-11-13-ponte.
- Resultado: test/ponte.js PASS em desk, iPhone 390×844, iPhone paisagem 844×390, Android paisagem 915×412 (baixa) e desk alta; 0 erros.
  Regressão mech/drive (d/i/il/al), serp e linecheck: PASS nos dois jogos. Draw calls na ponte (baixa) ~100–210, ~0,22–0,27 M triângulos.
- Publicado 13/11 23:33 -03 (commit f386c50) e verificado ao vivo 23:37–23:40 -03: cache solara-v13-2026-11-13-ponte ativo, live-drive + live-ponte PASS desk e iPhone, 0 erros.
  Fotos ao vivo: screenshots/live-ponte-{d,i}-{overview,tandem,radio,hud}.png. (Este registro é commit local; vai junto no próximo push.)

## t335 (14/11 00:20 -03) — EM ANDAMENTO, NÃO PUBLICAR (sem aprovação ainda; só commit local)
Pedido: 1) carro gruda na borda da ponte → deslizar/empurrar para fora; 2) batida "quebra" o carro → só amassados sutis;
3) botão "Iniciar corrida" da Liga da Madrugada sumiu → voltar (raio 50 m, mesmo passando dirigindo);
4) corridas de rua estilo clube da madrugada: 5 corredores (jogador + 4 IA, elástico), contagem, posições, checkpoints, GPS no minimapa
   e no chão, setas grandes "CURVA À ESQUERDA/DIREITA", ruas laterais fechadas (cones/carros/polícia) só durante a corrida;
5) ponte: moedas/dinheiro/prêmios, missões (zona de drift, radar de velocidade, tandem, quase-batida) ligadas à economia;
   cenário: cruzeiros, lanchas com esteira, balões gigantes, aviões (instanciado, barato);
6) helicóptero: modelo leve realista genérico com rotores girando, pilotagem com inércia, auto-nivelar, coletivo, guinada, toque.
Testes: d/i/il/al, 0 erros, regressão drive/mech/serp/ponte/linecheck + teste novo por item. SW pronto mas sem push.

### t335 progresso (14/11 -03)
- FEITO itens 1–4 + HUD: `_edgeSlide` (desliza/empurra na borda), pitch/roll protegidos (amostras >1,2 m ignoradas, auto-endireitar >0,6 rad por 1 s), amassados sutis (máx 12, rodas intocadas, sem encolher), rivais de rua 24 h + botão "🏁 Iniciar corrida" (toque/E até 50 m, passando), corrida com 5 (4 IA elástico + atravessa trânsito longe da vista), GPS (minimapa + faixa roxa no chão), `#turnCue` CURVA À ESQUERDA/DIREITA (top 134 px desktop / 236 touch / 130 touch-land), bloqueios só durante a corrida, 2º/3º lugar pagam. Watchdog do HUD a cada 0,5 s (`G.hudFixes`).
- Gravação: o gravador captura só o canvas → o vídeo NUNCA mostra o HUD DOM (explicar ao usuário).
- Teste: `node test/t335.js 1280 720 low d` (ONLY=edge,crash,btn,race,raceshot). PASS desktop nos dois jogos.
- FALTA: item 5 (ponte: moedas/prêmios, missões, cenário), item 6 (helicóptero), matriz i/il/al, regressões, bump SW (sem push).

### t335 itens 5–6 (14/11 -03)
- Item 5 `src/bridgefun.js` (BridgeFun, `G.ponte.fun`, atualizado no fim de `SeaBridge.update`): moedas $5 (InstancedMesh), maços $50, 6 caixas-prêmio ($150–400 ou nitro cheio), reaparecem (120/240/420 s); zonas de drift (4×300 m, meta 1200 pts, paga pts/15), radares (4, ≥120 km/h paga (km/h−100)×1,5, recorde), corrente de tandem (+$20×elo a cada 2,5 s, máx $100), quase-batida (+$15). Pop `#bfPop`, barra `#bfZone`, rádio reaproveita eventos (playerDrift/record/tandemClose). Cenário instanciado: navios (1/2/3), lanchas com esteira (3/5/8), balões gigantes (3/5/7), aviões (1/2/2). 14 meshes no total. Dados em `<PONTE.key>-fun`.
- Item 6 `src/heli.js`: modelo genérico mesclado por material (≤24 meshes incl. luzes), rotor de 3 pás + cauda de 2 (discos de borrão), cíclico por atitude com inércia/arrasto, auto-nivelar + flare até pairar, curva coordenada, coletivo com trava de altitude + efeito solo, limites pitch/roll. `body.heli` deixa joystick/⤒/⤓ transparentes; `#heliHud` (horizonte, ALT, km/h, V/S).
- SW: solara-v14-2026-11-14-t335 / neon-dist-v6-2026-11-14-t335 (NÃO publicado). Ao publicar: atualizar `/workspace/miami-test/live-drive.js` (sw v14/v6).
- Teste: `node test/t335.js W H low tag` (ONLY=edge,crash,btn,race,raceshot,fun,heli). Matriz d/i/il/al PASS nos dois jogos.
