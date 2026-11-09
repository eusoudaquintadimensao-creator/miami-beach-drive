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

## Biblioteca 3D
- **three.js r170** — licença MIT (https://github.com/mrdoob/three.js). Inclui GLTFLoader, SkeletonUtils, BufferGeometryUtils,
  EffectComposer e passes de pós-processamento, Sky.

## Tudo o mais
- Cidade, carros, helicópteros, heliponto, ícones, músicas (geradas ao vivo com WebAudio), falas dos moradores e textos:
  criação original deste projeto. Nenhuma marca, logo, música ou personagem de terceiros.
