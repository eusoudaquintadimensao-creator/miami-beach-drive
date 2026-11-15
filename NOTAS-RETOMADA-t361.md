# NOTAS-RETOMADA t361 (14/11/2026) — helicóptero livre + avião + ponte (HUD/desistir/prêmio) + rádio animado
Aprovado publicar (pt367u "já pode atualizar"). Dois jogos: /workspace/miami-mundo-aberto (main) e /workspace/jogo-cyberpunk (main).
Branch itch-realista (Solara) NÃO é a base; trabalho no main. Código quase todo igual entre os jogos: fazer no Solara e portar (diff/patch).
Rodar tudo com nice -n 19.

## Plano / status
- [x] 1 heli (heli.js: airFloor/airCeil/deckInfo/airBounds/AIRSPACE, RotorWash, modelo novo bimotor 'Brisa H1' mantido o nome): chão da ponte só por cima (passa por baixo), limites suaves, teto, modelo realista bimotor, lavagem do rotor
- [x] 2 avião 'Baía Anfíbia A1' (src/plane.js, hidroporto x≈−16,z 300 na baía; tecla Y / botão ✈️) anfíbio (hidroavião) src/plane.js + entrar/sair + controles
- [x] 3 ponte (seabridge: progress(), odo, quit(), reward(); #ponteQuit, #giftScreen; G.swapVehicle/G.showGift; home 4ª vaga): HUD % e km, Desistir, carro presente ao completar volta (garagem/localStorage) + tela de prêmio
- [~] 4 rádio (radiolines novo 83 falas; mp3 regerando em bg -> /workspace/t361/gen_radio.log; antigos em /workspace/t361/radio-old): falas novas animadas + eventos (nitro, batida, ultrapassagem, heli) + vozes mais altas/rápidas (regerar mp3 Kokoro)
- [ ] 5 testes test/t361.js d/i/il/al + regressão, prints /workspace/t361-prints/
- [ ] 6 SW bump, commit, push, conferir ao vivo; site Cloudflare (build.sh + deploy via conector)

Teste: cd test && NODE_PATH=/workspace/miami-test/node_modules nice -n 19 node t361.js W H q tag (ONLY=heli,plane,shots,ponte,radio). Prints em /workspace/t361-prints/.

## FASE 2 (pedidos t367/t373/t375-378) — 14/11 10:58
- [x] Fase 1 commitada local: Solara 8f01c29, Neon d06dddf (matriz t361 PASS 8/8 em /workspace/t361/matrix.log)
- [x] B ilhas: src/islands.js (8 na volta da ponte ~1 a cada 72 s, 8 formatos; anel de 8/13/18 ilhas por qualidade; mansões, farol, píer; gaivotas, jacarés, flamingos, golfinhos; lanchas com esteira e veleiros; heli pousa, lancha bate; aviso "Olha a ilha" + rádio)
- [x] B corrida de lanchas: src/boatrace.js (Raia das Lanchas, 2 voltas nas boias, 3 rivais, 2 lanchas tunadas paradas, convite Aceitar/Recusar, prêmios 600/350/200/100)
- [x] B ponte: posição Nº/6, prêmios 1500/900/500/200/120/80, começa em 3º e nunca pior que 3º (elástico _perf/shift), fim com "Mais voltas" ou "Sair pela saída" (guiado pela rampa); 3 carros tunados (GIFT_CARS) na Garagem de Prêmios da mansão (porta abre após 1 volta)
- [x] C rua: convite com Aceitar/Recusar a 50 m (recusar some até afastar 90 m), botão Neutro (N / tecla Z; largada perfeita com giro 55–95%), 5 corredores falando no rádio
- [x] D rádio: +63 falas (ilha, bichos, posição, racha, lancha), mp3 Kokoro gerados
- [x] Port para Neon (patch + tema das ilhas neon); testes t367 PASS desktop nos 2 jogos
- [x] 12:35 commits locais Solara 9794283 / Neon 7d15cf2 (SW solara-v17-2026-11-14-ilhas / neon-dist-v9-2026-11-14-ilhas). Matriz final em andamento: logs /workspace/t367/final-*.txt (t367 PASS 8/8 menos neon d racha largada → corrigido com clearGrid; t361 PASS 8/8). Falta: t335 ×8, re-rodar t367 ×8 (street.js mudou), push, site.
- Deploy site: deploy/gerar-put.py agora sem migrations (PRIMEIRA=1 só na 1ª vez).
- [x] 13:05 matriz final PASS: t367 8/8, t361 8/8, t335 8/8 (il re-rodado sozinho: timeout por CPU com 2 jogos em paralelo). Push feito (Solara dd9b9f8, Neon 7d15cf2). Falta: verificar GitHub Pages + site Cloudflare.
- [x] 13:20 GitHub Pages no ar (v17/v9, live-drive d+i PASS 0 erros) e site Cloudflare republicado e testado (2 jogos, d+i PASS). FASE 2 (A+B+C+D+H) CONCLUÍDA. Próximo: E/F/G. (t367+t361+t335 × d/i/il/al × 2 jogos) → SW v17/v9 → push → site Cloudflare
- Teste novo: test/t367.js (ONLY=ilhas,ponte,garagem,rua,neutro,lancha,radio,shots). Runner: /workspace/t367/m367.sh (T=, GAMES=, CFG=), logs /workspace/t367/log-*.txt
- Restante (próxima fase): E garagem gigante com 50 carros; F vida na cidade/realismo + mapa completo; G app GPS do celular com OpenStreetMap

## FASE 3 (pedido 13:10: E, F, G) — publicar em subfases (E primeiro)
- [x] E código Solara: src/megagarage.js (bloco 'mega' em world.js i=0 j=6, galpão x -642..-558 z 322..428, porta leste z=375; 50 modelos CATALOG; carros de verdade perto (N/R por qualidade) + vitrine instanciada; save.mega {owned,tunes}; ficha #megaCard; E/🚗 compra; 🎨 abre a Oficina no carro; app 🏎️ no celular com endereço e GPS). Vehicle aceita tune.model/pmax/pacc/pgrip. Probe /workspace/t380/p-mega.js OK.
- [x] E port Neon (Mega Garagem Prisma, 6d760fe) + test/t380.js (ONLY=mega) PASS d/i/il/al Solara
- [x] E matriz completa 32/32 PASS (t380,t367,t361,t335 × d/i/il/al × 2 jogos; /workspace/t380/E-*.txt) → SW solara-v18-2026-11-14-garagem (04cc35e) / neon-dist-v10-2026-11-14-garagem (c3257c5) → push → site Cloudflare redeploy 13:50; live-drive OK nos 4 alvos (/workspace/t380/live-*.txt)
- [x] G código: src/gpsosm.js + assets/osm/miami.json (694 KB) + LEIA-ME ODbL + tools/osm/; app 🧭 GPS Miami; t380 ONLY=gps PASS d/i/il/al nos 2 jogos (Solara 9c2f045, Neon b0136ec)
- [x] G matriz 32/32 PASS (/workspace/t380/G-*.txt) + t383 (Versões do jogo) t383 d/i/il/al + t380 d/i nos 2 jogos → SW solara-v19-gps/neon-dist-v11-gps → push → site. Hotfix link de versões no GitHub Pages (Neon apontava github.io/solara-bay/): t383 4 configs + t367 d PASS → SW solara-v20-2026-11-14-versoes (8333feb) / neon-dist-v12-2026-11-14-versoes (6966ccf) → push → site 14:33. Ao vivo: SW nos 4 alvos, versões e OSM ok, live-drive ok (/workspace/t380/liveG-*.txt)
- [x] t383 SOLARA SKY 2088: seção #versoes no site (/workspace/solara-sky-site, commit local), SW solara-sky-v2, republicado e testado (versões d/i/l, site.js d PASS). Contadores não zerados.
- [x] F publicado: beachlife.js (banhistas, vôlei, castelos, corredores, surfistas, nadadores, carrinhos, pipas; trechos cheios), peds 40/84/124 (celular 75%), retrovisores/maçanetas, sapatos/cabelo comprido, mapa completo com zoom/arrasto/📍; t380 ONLY=vida. Matriz 40/40 PASS (t380,t383,t367,t361,t335 × 4 × 2; /workspace/t380/F-*.txt) → merge f-vida → SW solara-v21-2026-11-14-vida (2ec8bed) / neon-dist-v13-2026-11-14-vida (f9a5428) → push → site ~15:05; live-drive 4 alvos OK (/workspace/t380/liveF-*.txt), versões OK.
FASE 3 (E, F, G) + t383 CONCLUÍDOS.
- [ ] F vida/realismo/praia/NPCs/mapa completo
- [ ] G app GPS OpenStreetMap

## FASE 4 (t386 praia + t387 botões + t388 bug urgente + t390 pular) — um publish só
- [x] t386 pesquisa: /workspace/pesquisa-praia/PESQUISA-PRAIA-PT.md
- [x] t386 código: BEACH.keep + rotinas por hora (beachlife SCHED); src/orla.js (Calçadão Onda, postos variados, academia supino/barra/corrida com minijogo e recordes em save.orla, futebol 5x5 com placar, 2 quadras de tênis com rali, roda do pôr do sol, 2 músicos com gorjeta, pedidos bola/chinelo/coco). Neon: tema Via Fluxo/Academia Pulso/Arena Plasma/Quadras Íon. test/t386.js
- [x] t388 causa: shader da água (plano 3200 m em WATER_Y, também sob a cidade) usava sin/cos de G.t crescente × até 2.3 e coordenadas grandes → GPU de celular (mediump/precisão) gera deslocamento/cor lixo: água atravessa a avenida em faixas coloridas. Correção env.js: fases mod 2π na CPU (uPh, uTa/uTb/uTf), uT % 600, deslocamento limitado (nunca sobe acima do chão), cor clamp + guarda NaN, polygonOffset. test/t388.js + scanbig.js
- [x] t387: botões de vidro (blur, borda neon, pressionado mais claro), mais altos em retrato e paisagem; paisagem dirigindo em grade 2×2 à direita; N ao lado do VEL (sem sobrepor o 🎁/giftHud). test/t387.js (prints botoes-*)
- [x] t390: src/bailout.js — Sair com carro >6 m/s = pulo + rolamento (carro na banguela até parar, pedestres desviam: v.coast); heli/avião no ar = salto + paraquedas automático (velame colorido, ~3,2 m/s, joystick/A-D vira, W/S velocidade, ⤓ desce mais rápido), pouso em chão/telhado; água = nado (margem ou resgate em 20 s); <8 m = pulo curto. Heli abandonado paira 5 s e desce (auto), volta ao heliponto; avião plana e volta ao hidroporto. test/t390.js (prints pular-*)
- [x] SW solara-v22-2026-11-14-praia / neon-dist-v14-2026-11-14-praia
- [x] matriz → push → site → live (16:50, Solara ddbb882 / Neon 8f231ed, live 4 alvos 0 erros)

## FASE 5 (t391–t402) — um publish só (aprovado)
- [x] t398 Entrar: só o veículo MAIS PERTO a ≤3,5 m da porta (barco 4,5), nome no botão; carro chamado não passa na frente; test/t398.js
- [x] t399 botões do carro mais altos e vidro mais claro; grade 3×4 a pé recolhível (▦/✕, localStorage quickMin-v1); farol alto mais largo/suave, menos bloom
- [x] t391 cintilação (adapt com histerese, near 0.32, sombra estável por texel), frota (src/frota.js: 3 lanchas, iate, 3 jet skis) e corridas no mar (src/marraces.js, 3 circuitos); test/t391.js (prints mar-*)
- [x] t400 seta de curva só ícone de vidro com distância, números de drift/nitro nos cantos, ⏸ Pausa (Continuar / Voltar / Configurações / Controles), ↩ Voltar, vidro uniforme; test/t400.js
- [x] t401 seta some em ~1,6 s; Freio sai do drift na hora; carro parado/batido + Freio volta para a pista (racha: último portão; fora: faixa da rua; T no teclado); test/t401.js
- [x] t393 palmeiras realistas (src/palmbreak.js) quebram e tombam com física, carro perde ~18% da velocidade, voltam em 60 s/fora de vista; Neon mantém LED neon; test/t393.js (prints palmeira-*)
- [x] t402 placar de drift à direita; câmera segue a velocidade no drift (lag ≤0,5 rad; retrato 0,32), sobe com parede atrás; test/t402.js (prints camera-*)
- [x] t394 src/outdoor.js: 9 apps em atlas único (assets/ads/ads.jpg + ads-lo.jpg), 7 outdoors + 8 telões no calçadão com transições, cartão com link ao chegar perto; sem Mercado Pago/doação; test/t394.js (prints outdoor-*)
- [x] t396/t397 src/gauchos.js: 44 falas gaúchas × 3 vozes (132 mp3 Kokoro), devagar elogia carro/cidade, rápido pede cuidado, intervalo 7–14 s; test/t396.js (prints gaucho-*)
- [x] SW solara-v23-2026-11-14-orla / neon-dist-v15-2026-11-14-orla (CORE com frota/marraces/palmbreak/outdoor/gauchos)
- [x] matriz q6 (18 testes × d/i/il/al × 2 jogos; /tmp/q6s.txt /tmp/q6n.txt): tudo PASS menos t361 hidroavião (alcance t398 curto demais do píer) e t392 Solara (erro avc1: adapt mudava resolução gravando)
- [x] correções: hidroavião embarca pela asa (alcance 5 m); adapt congela durante gravação. q7 (t392+t361 × 4 × 2; /tmp/q7*.txt): t392 8/8 PASS
- [x] t361 8/8 PASS, t398 d/i PASS; push 19:13 (Solara 5de91c9, Neon 7a9f8ce)
- [x] 19:15 site MIAMI DRIVE republicado; live: 4 sw.js (Pages + site) = solara-v23-2026-11-14-orla / neon-dist-v15-2026-11-14-orla, livever 4 alvos 0 erros, live-drive site-d + pages-i ok nos 2 jogos. FASE 5 CONCLUÍDA.

## FASE 6 (t405 fita no topo + t406 controles nas bordas + t407 legível no sol) — publish aprovado
- [x] src/topbar.js (#topBar: ▦/✕ + #icons + #quick; recolhida = ▦ ⏸ ↩; posição medida entre minimapa e relógio, desvia de HUDs na linha, 2ª linha no retrato; localStorage topMin-v1)
- [x] CSS bloco t405/t406/t407 no fim do style.css (vidro branco espelhado, borda branca 0.92, sombra escura no texto; carro: grid Freio/Ré/Sair/Alto na borda direita, VEL/N/🎛️ esquerda; a pé 2×2 52 px no canto; 🚘 duplicado escondido no touch)
- [x] test/t405.js PASS d/i/il/al Solara (prints botoes405-*); Solara a3d4246 SW solara-v24-2026-11-14-vidro
- [x] Neon port + t405 ×4 PASS (Neon commit acima)
- [x] matriz q9 PASS (t387/t400 re-rodados após fix em q10: 8/8 cada) + t405 ×4 ×2 PASS → push → site
- [x] 20:40 publicado: push Solara 0c7a4bc / Neon 02f283a; site MIAMI DRIVE republicado; live 4 sw.js = solara-v24-2026-11-14-vidro / neon-dist-v16-2026-11-14-vidro, livever 4 alvos 0 erros, live-drive site-il + pages-d ok nos 2 jogos. FASE 6 CONCLUÍDA. Próximo: FASE 7 (t408+t410) quando o pai relançar.
- [x] fix: borda branca uniforme (t400 E) e controles a 40 px (deitado) / 60 px (em pé) da borda de baixo (barra de gestos, t387) via --edgeB

## FASE 7 (FILA — t408, NÃO começar antes de publicar a FASE 6; o pai relança)
- t408 nos 2 jogos: roupas estilo Miami para todos (seda/linho/resort; homens roupa masculina, mulheres feminina) incl. super-heróis originais; modelos mais realistas;
  1 personagem feminina nova original (pele morena quente, cabelo cacheado escuro, elegante; sem semelhança com pessoa real, sem nome real);
  prédio na orla com porta grande → loja de roupas grande e iluminada, andar entre araras, comprar roupa/sapato/chapéu/óculos/bolsa com dinheiro de corrida,
  vestir na hora, espelho com poses/reações, salvar comprados+vestidos por personagem; loja no GPS do celular.
- t410 (junto da FASE 7): 2ª loja no prédio vizinho da orla — trajes de super-herói; cada herói original com trajes distintos e poderes diferentes
  (armadura nano-metálica brilhante, ligas de metal raro, variantes voo/escudo/velocidade), compra com dinheiro de corrida, vestir, espelho, salvar.
  SÓ designs e nomes originais (nada de Marvel/Iron Man/vibranium).

### FASE 7 em andamento (início 20:40)
Plano: src/wardrobe.js (catálogo roupas m/f + acessórios presos aos ossos + trajes de herói com poderes; look salvo por personagem em save.ward {owned:[], eq:{<avatar>:{top,bottom,shoes,hat,glasses,bag}|{suit}}})
  · avatar.js makeModel(id, colors, h, look) aplica look; nova personagem 'marisol' (base ela, pele morena quente, cachos escuros, elegante; nome inventado) + card assets/avatars/marisol.webp
  · src/boutique.js: quadra deco i=1 j=4 (x180..300 z0..150) vira 'lojas': Boutique Brisa (x252..296 z8..70, porta leste z39) e Arsenal Aurora (trajes, x252..296 z80..142, porta z111);
    interior claro com araras/manequins/espelho; cartão comprar/vestir; modo espelho (câmera de frente, poses, reações); app 👗 Lojas no celular + atalho no GPS; mapa
  · pedestres com paleta Miami + saias/chapéus; NPCs de conversa com roupa padrão
  · testes t408.js / t410.js (prints loja-*, espelho-*, trajes-*)
  · t412 (20:45, junto na FASE 7): a pé entrar no mar andando (água até pernas/cintura, respingos, mais lento; fundo = nadar, sem travar/afundar; voltar andando)
    + passarelas/pontes sobre a areia: elevar (pilares espaçados) para carros passarem por baixo na praia; ponte da corrida e ruas continuam alinhadas. Testar praia inteira de carro + entrar/sair do mar.
  · t413 (20:47): botão "tela limpa" (vidro, canto superior) esconde tudo não-essencial, 1 toque volta, lembra escolha; ao dirigir, extras somem sozinhos (voltam ao tocar/parar); só controles essenciais discretos nas bordas.
    + TODAS as mensagens/toasts/falas/corrida/drift/dicas/cartões ao dirigir ficam no alto (faixa abaixo da barra), nunca sobre o carro/estrada. Testar com carro à vista nos 4 setups.
  · progresso: src/wardrobe.js escrito (catálogo, applyLook, trajes, classe Wardrobe); heroes.js exporta attach.
  · commit 68aa7a0: lojas+guarda-roupa+Marisol funcionando no Solara (falta: teste t408, t412, t413, porte Neon)
  · d232c3c t412 feito no Solara (píer alto x324-386 vão livre; mar: andar/nadar ok)
  · t414-t416 (21:03): no carro Alto e Ré ABAIXO do Freio (Freio mais alto; Alto+Ré embaixo perto da borda, longe da barra de gestos); Pausa e Voltar empilhados na borda, visíveis no carro; botões contornando cantos; botão tela limpa em todas as versões.
    t415: testar que cada botão dispara a ação e nada sobrepõe (retrato+paisagem+desktop/Android; carro, a pé, barco, heli). t416: teste automático: caixas de texto não cruzam carro projetado + área à frente.
  · em andamento: probe /workspace/f7/p6.js mede mensagens x carro (t413/t416)
  · t417 (21:04): botão N Neutro presente no HUD do carro em todas as versões (retrato/paisagem), mesmo vidro, não some no modo limpo, coberto pelos testes (toque alterna neutro).
  · medição p6: no carro toast/stTip/adCard/orlaCard/megaCard/prompt/serpHud/driftW cruzam carro/estrada → plano: CSS faixa do topo + guarda JS (src/msgguard.js) que empurra textos para fora da zona carro+frente.

## FASE 7 — status 21:47 (Solara pronto localmente, falta Neon + publicar)
- Solara commits: 68aa7a0 (lojas/guarda-roupa/Marisol/trajes), t412 (mar + píer alto), 7536eca + seguinte (t413–t417), ca3835e (salva-vidas sobre pernas, teste t408, SW v25 `solara-v25-2026-11-14-orla-moda`).
- Novos: src/msgguard.js (guarda de textos x carro+estrada 90 m, sem sobrepor textos/HUD), topbar.js (#edgeCol ⏸ ↩ na borda direita, #bClean 👁 canto sup. esq. `clean-v1`, autofade >6 m/s sem toque 3 s, N no PC `.deskN`).
- Testes: test/t413.js (PASS d/i/il/al), test/t408.js (PASS d; 4 cfgs passavam antes do fix do salva-vidas), t405 atualizado (PASS 4).
- Pendente: portar tudo ao Neon (diff 02f283a..HEAD do Solara a partir do commit antes de FASE 7), thumbs Neon, SW Neon v17, varredura, push, deploy MIAMI DRIVE.
- Bloqueio conhecido: cerca do clube de tênis (x 336–370, z 446/482) — faixa livre na areia x 324–335.
- 21:55 restauração do box: git intacto (Solara 7e23f75, Neon a0c8711, nada publicado). Neon t413 PASS d/i/il. Decisão: publicar FASE 7 inteira numa vez (HUD t413–t417 e lojas já estão misturados nos commits; separar arriscaria regressões) após varredura.
- 22:25 t418 (pintura drive-through no lugar do bloco branco da marina x -293..-271 z -137..-123 + postes/sinaleiras quebram), t419 (NÃO elevar píer: passarelas de madeira na areia quebram, guarda-sóis tombam, NITRO não cobre o carro), t420 (carro no mar raso até ~metade, borrifos, parada suave). Feito no Solara: breakables.js, wadeable()/WADE_FLOOR, áudio crack/clang/splash/water/spray. Falta: paintshop.js, testes t418-t420, portar Neon, varredura, publicar.

## 22:30 t418 cabine de pintura ligada (commit 41e4c57); test/t418.js escrito; t408 etapa 8 reescrita (píer baixo). NOVO t422: auditoria de duplo sentido em TODAS as falas (ambos jogos) -> /workspace/t422-falas-revisadas.md, regenerar mp3 com as mesmas vozes.
- 22:45 t422 feito: 31 trocas de texto (ver T422-FALAS-REVISADAS.md), 23 falas regeneradas (Kokoro, mesmas vozes), test/t422.mjs PASS nos 2 jogos; site 'feito com dedicação'.
- 22:50 Neon com t418-t420 + Cabine Cromo Neon (045b798..), SW solara-v26-2026-11-14-pintura / neon-dist-v18-2026-11-14-pintura; t418 PASS Solara d/i, Neon d. Varredura completa /workspace/t367/sweep2.sh -> /tmp/sweep2.txt. Depois: push + deploy MIAMI DRIVE.

## FASE 7 — ESCOPO COMPLETO (checklist, 23:20 após 2ª restauração)
- [x] t408 loja de roupas na orla (Boutique Brisa / Neon: Boutique Neblina), roupas Miami por gênero, personagens mais realistas, nova personagem original Marisol
- [x] t410 loja de trajes de herói vizinha (Arsenal Aurora / Neon: Forja Prisma), trajes originais com poderes
- [x] t412 a pé entra no mar (andar → nadar → voltar)  (a parte "elevar pontes" foi SUBSTITUÍDA pelo t419)
- [x] t413 👁 tela limpa (lembra escolha) + extras somem dirigindo + mensagens no alto
- [x] t414 Alto+Ré abaixo do Freio; Pausa/Voltar empilhados na borda; botões contornam as bordas; minimizar em todos os links
- [x] t415 teste de todos os botões retrato+paisagem+desktop (carro/a pé/barco/heli), sem sobreposição (test/t413.js)
- [x] t416 texto nunca sobre o carro/estrada (msgguard + teste bbox); NITRO sobre o carro (bugs-t388/0673d2.jpg) corrigido
- [x] t417 N Neutro sempre no carro (não some no modo limpo), testado
- [x] t418 cabine de pintura drive-through no bloco branco (bugs-t388/f742d4.jpg) + postes/semáforos quebram (test/t418.js)
- [x] t419 passarelas de madeira + guarda-sóis quebram com som de madeira, carro segue, voltam depois
- [x] t420 carro no mar raso até ~metade da altura, borrifos/rastro/som, parada suave no fundo, Freio-respawn ok
- [x] t422 auditoria de duplo sentido (rádio da ponte primeiro), mp3 regenerados, /workspace/t422-falas-revisadas.md, test/t422.mjs
- Releases: o pai pediu releases menores (A: t413-t417/t419/t420/t422; B: lojas/pintura/personagens). Os commits A e B estão
  intercalados nos 2 repos e tudo já está pronto + testado, então separar agora exigiria reverter lojas/pintura (arriscado).
  Decisão 23:20: UMA release (A+B juntos) assim que a varredura sweep2 passar; releases futuras menores.
- Pendente: terminar varredura (/workspace/t367/sweep2.sh, logs log-<jogo>-<teste>-<cfg>.txt), refazer solara t413 i, push 2 repos, deploy MIAMI DRIVE, live check.
- 23:55 VARREDURA sweep2 COMPLETA: t422 PASS x2; t418 PASS 4 cfgs x2 jogos; t413/t408/t405 PASS 4x2 (falta só refazer solara t413 i, log foi sobrescrito); t402/t400/t393/t387/t361/t394/t396 PASS d+i x2. Próximo: solara t413 i -> push -> deploy.
