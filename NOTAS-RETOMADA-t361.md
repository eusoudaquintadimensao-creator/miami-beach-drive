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
