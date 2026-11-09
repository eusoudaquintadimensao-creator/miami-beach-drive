# Miami Beach Drive — Solara Bay (mundo aberto)

Jogo 3D de mundo aberto no navegador, inspirado no clima de uma Vice City moderna: neon, praia, pôr do sol,
cidade cheia de vida e vibe de rede social. **Sem violência**: ninguém se machuca, os pedestres desviam e
batidas não causam dano. Cidade, nomes, músicas e modelos são originais (Solara Bay).

## Como jogar

Abra o link do GitHub Pages no navegador (celular ou computador) e toque em **Jogar**.

**Computador**
- WASD / setas: andar ou dirigir · Shift: correr · Espaço: pular / freio de mão
- E: entrar/sair de veículo · Enter: iniciar missão perto de um ícone · F: foto · H: buzina
- R: trocar rádio · M: mapa · P: celular · mouse: girar a câmera (clique para travar)

**Celular**
- Joystick à esquerda; botões à direita (Entrar/Sair, Pular/Freio, Foto, Buzina, Iniciar)
- Ícones no topo: celular, mapa, rádio e câmera. Toque no mapa grande para marcar um destino com GPS.

## O que tem

- **Cidade:** Ocean Drive com prédios art déco e neon, praia com ondas, píer, postos salva-vidas e farol;
  centro com arranha-céus de vidro; pontes sobre a baía; marina com iates; roda-gigante; Glades com pântano.
- **Clima e luz:** ciclo dia/noite, pôr do sol, neon e reflexos à noite, chuva com raios, sombras, neblina e brilho (bloom).
- **Veículos:** esportivo, clássico, SUV, sedã, táxi, moto e lancha, cada um com dirigibilidade própria.
- **Vida na cidade:** pedestres andando, conversando e tomando sol; trânsito que segue as ruas e para nos semáforos.
- **Missões:** entregas com tempo, táxi, corridas (com medalhas e recorde), regata de lancha, pedidos de foto
  pelo app Vibez e 24 conchas neon escondidas. Dinheiro e seguidores como recompensa.
- **Celular do jogo:** missões, mapa, rádio, clima/horário, feed Vibez, progresso, ajustes e ajuda.
- **Rádio original** feito com WebAudio: Neon 88 FM (synthwave), Onda Tropical 101 e Brisa Lo-Fi 93.
- Minimapa giratório, mapa completo com GPS, qualidade gráfica baixa/média/alta com detecção automática,
  progresso salvo no aparelho e instalação como app (PWA).

## Tecnologias

HTML + JavaScript (módulos ES) + [Three.js](https://threejs.org/) r170 incluído em `vendor/three` (licença MIT).
Tudo é gerado por código (geometria, texturas e música); nenhum asset externo.

Para rodar localmente: `python3 -m http.server 8765` nesta pasta e abra http://localhost:8765/
(`?q=low|medium|high` força a qualidade).

## Link

https://eusoudaquintadimensao-creator.github.io/miami-beach-drive/
