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
