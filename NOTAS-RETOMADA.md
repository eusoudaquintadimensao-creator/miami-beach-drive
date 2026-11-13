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
- Testes verdes (desk, iPhone, Android paisagem, 0 erros). SW solara-v9-2026-11-13-serpentina.

## Próximo (fila, só DEPOIS desta publicação verificada ao vivo)
- Jogo separado cyberpunk em /workspace/jogo-cyberpunk (cópia com A+B), nome original, chaves/SW próprios, repo+Pages novos, um push após testes.
