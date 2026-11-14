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
- [ ] H matriz final (t367+t361+t335 × d/i/il/al × 2 jogos) → SW v17/v9 → push → site Cloudflare
- Teste novo: test/t367.js (ONLY=ilhas,ponte,garagem,rua,neutro,lancha,radio,shots). Runner: /workspace/t367/m367.sh (T=, GAMES=, CFG=), logs /workspace/t367/log-*.txt
- Restante (próxima fase): E garagem gigante com 50 carros; F vida na cidade/realismo + mapa completo; G app GPS do celular com OpenStreetMap
