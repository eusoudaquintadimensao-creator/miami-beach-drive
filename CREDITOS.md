# Créditos e licenças

## Avatares 3D (Ela / Ele) e moradores que conversam
- **Animated Women Pack** e **Animated Men Pack** — por **Quaternius** (https://quaternius.com).
  Licença: **CC0 1.0 (domínio público)** — uso livre, inclusive comercial, sem exigência de atribuição (creditamos por gentileza).
  Fonte usada: Poly Pizza (https://poly.pizza/bundle/Animated-Women-Pack-HHSKxnk1mY e https://poly.pizza/bundle/Animated-Men-Pack-DAC9SDgMQT),
  modelos "Woman in Tank Top" e "Man" (GLB com esqueleto e animações).
- Modificações nossas: removemos as animações de luta/queda (o jogo é sem violência), mantivemos Idle, Walk, Run, Jump, Sitting,
  Standing e Clapping; quantizamos a malha (KHR_mesh_quantization) com glTF-Transform; as cores das roupas e o sombreamento suave
  são aplicados no jogo. Arquivos: `assets/avatars/ela.glb`, `assets/avatars/ele.glb` (~220 KB cada).

## Heróis originais de Solara (Teia Neon, Armadura Solar, Colosso Verde, Sentinela, Lorde Férreo, Titã Violeta)
- Personagens, nomes, trajes, cores e poderes **criados para este jogo**. Usam os mesmos esqueletos/animações CC0 de Quaternius
  acima, com materiais próprios e acessórios procedurais (capacetes, escudo, capa, manopla, emblema solar) gerados em código
  (`src/heroes.js`). Nenhum emblema, logo, nome ou esquema de cores de personagens de terceiros. Poderes não violentos.
- Miniaturas `assets/avatars/*.webp` renderizadas por nós a partir desses modelos.

## Vozes dos moradores (falas gravadas em pt-BR)
- Geradas offline, uma única vez, com o modelo **Kokoro-82M** (hexgrad) — pesos sob **Apache-2.0**
  (https://huggingface.co/hexgrad/Kokoro-82M), rodando com **kokoro-onnx** (MIT, https://github.com/thewh1teagle/kokoro-onnx).
  Vozes usadas: `pf_dora` (feminina), `pm_alex` e `pm_santa` (masculinas); variação de tom no jogo via velocidade de reprodução.
- Arquivos: `assets/voz/<voz>/<hash>.mp3` (mono, 24 kHz, 32 kbps, ~10 KB por fala) + `assets/voz/index.json`.
  Os textos das falas são originais deste projeto (`src/phrases.js`). O jogo não chama nenhum serviço de voz nem usa chave de API:
  só toca os arquivos, baixados sob demanda na primeira vez que alguém fala.

## Carros de corrida, Autódromo Neon, Casa Solara, mochila a jato
- Modelos, pista, casa, efeitos (fumaça, marcas de pneu, chamas, linhas de velocidade) e nomes (Solara GT-R, Trovão V8, Kaze RS,
  Aurora X1, Autódromo Neon, Casa Solara) **criados em código para este jogo**. Nenhuma marca real de carro, de jogo ou de filme.

## Biblioteca 3D
- **three.js r170** — licença MIT (https://github.com/mrdoob/three.js). Inclui GLTFLoader, SkeletonUtils, BufferGeometryUtils,
  EffectComposer e passes de pós-processamento, Sky.

## Tudo o mais
- Cidade, carros, helicópteros, heliponto, ícones, músicas (geradas ao vivo com WebAudio), falas dos moradores e textos:
  criação original deste projeto. Nenhuma marca, logo, música ou personagem de terceiros.

## Veículos assinatura e traje nano-metal
Os veículos de cada personagem (esportivo, motos, caminhonete e carros de corrida), seus letreiros e o “traje nano-metal”
são geometria e texturas geradas por código neste projeto. Nomes, cores e desenhos são originais: nenhuma marca, logotipo,
nome ou visual de personagens de terceiros.

## Rotinas, bares, gaivotas, presentes e Liga da Madrugada
- Tudo modelado em código (three.js) neste projeto: lugares, gaivotas, caixas de presente, prancha, planador, portões neon.
  Nomes de lugares, rivais, rotas e da liga são originais. Sem marcas de terceiros.

## Circuito Serpentina e Bar da Curva
- Pista, rivais, bar, espectadores e nomes (Lila Curva, Leo Fumaça, Nina Lateral, Rafa Serpente, Bar da Curva, Circuito Serpentina)
  criados em código para este jogo. Nenhuma marca real de carro, de jogo ou de filme.
