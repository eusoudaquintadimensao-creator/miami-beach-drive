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
- [ ] matriz (t390,t388,t387,t386,t383,t380,t367,t361,t335 × d/i/il/al × 2) → push → site → live
