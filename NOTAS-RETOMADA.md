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
