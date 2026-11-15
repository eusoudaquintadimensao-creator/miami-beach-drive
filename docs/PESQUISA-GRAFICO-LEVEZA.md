# Pesquisa t435: gráfico ultra-realista + leveza no Solara Bay
*Fontes: app **Radar Águia Solar** (aba IA NVIDIA: `data/nvidia.json`, 218 modelos HF, 247 repositórios GitHub, 45 releases) + pesquisa de tecnologias web gratuitas. Data: 15/11/2026.*
*Regras seguidas: só grátis e com licença limpa (CC0/MIT/Apache/BSD/Zlib), sem chave paga e sem marcas registradas no jogo.*

## 1. Resumo em 30 segundos
- O jogo já tinha uma boa base: tom ACES, céu físico com reflexo PMREM, bloom, correção de cor, sombras suaves, MSAA e resolução dinâmica.
- **Aplicado agora no Solara Bay**, só nos aparelhos fortes (o modo leve não muda nada):
  1. **GTAO**: oclusão de ambiente, aquele "sombreado de contato" embaixo de mesas, carros e cantos. Só no PC em qualidade alta. É o primeiro efeito a desligar sozinho se o FPS cair.
  2. **SMAA**: antisserrilhado barato para celular médio/alto, que não usa MSAA.
  3. **Água nova** (médio/alto): luz atravessando a crista das ondas (subsurface) e **cáusticas** (reflexos de luz no fundo do raso).
  4. Os três efeitos são **carregados sob demanda** (import dinâmico): **0 KB a mais** no download inicial e no modo leve.
- Celular fraco continua leve: orçamento t432 aprovado (1º quadro 4,7 s, pronto 15,7 s local; ao vivo ver relatório final).
- **As IAs do Radar (NVIDIA)** são ferramentas de **produção** (gerar texturas, modelos 3D e normal maps no PC com GPU). Não rodam dentro do jogo no celular. Ficam como próximo passo para criar assets, sempre conferindo a licença de cada modelo.

## 2. Achados no Radar Águia Solar (IA NVIDIA)
| Item | Licença | Para que serve aqui | Usar? |
|---|---|---|---|
| NVlabs/Sana (texto→imagem rápido) | código Apache-2.0; pesos com licença própria | gerar texturas/painéis originais em alta resolução | Depois, em PC com GPU; conferir licença dos pesos |
| NVIDIA-AI-Blueprints/3d-object-generation e 3d-guided-genai-rtx | Apache-2.0 | pipeline texto→imagem→modelo 3D (props, quiosques, barcos) | Depois (precisa de GPU RTX), gera GLB para otimizar com gltf-transform |
| nvidia/Lyra-2.0, nvidia/dvlt (imagem→3D) | licença NVIDIA (ler antes) | transformar um desenho em objeto 3D | Avaliar caso a caso |
| nvidia/PiD (imagem→imagem) | ver cartão do modelo | variações e limpeza de texturas | Avaliar |
| Cosmos3-Super-Text2Image | NVIDIA Open Model License ("other") | imagens de referência | Só com a licença lida; não é CC0 |
| NVlabs/flip (métrica de qualidade de imagem) | BSD-3 | comparar antes/depois de compressão de textura, medindo a perda | **Sim** em testes futuros (KTX2) |
| NVIDIA-Omniverse/usd-optimize | Apache-2.0 | otimizar cenas USD | Pouco útil (o jogo usa glTF) |
| tiny-cuda-nn, PhysX | BSD-3 | redes neurais/física em C++/CUDA | Não roda no navegador |
| Wan2.2 T2V (vídeo) | Apache-2.0 | trailer/teasers | Fora do jogo (marketing) |
| segformer | licença NVIDIA de pesquisa | segmentação | Não |

**Conclusão do Radar:** nada dele roda no celular dentro do jogo, mas há boas ferramentas gratuitas de **criação de conteúdo** (Sana, Blueprints 3D) e de **medição** (FLIP).

## 3. Tecnologias gratuitas para gráfico realista
| Tecnologia | Licença | O que faz | Ganho visual | Custo em celular fraco | Status |
|---|---|---|---|---|---|
| **GTAO** (three.js r170 `GTAOPass`) | MIT | oclusão de ambiente por tela, mais moderna que SSAO | alto (cenas "assentadas", menos aspecto de brinquedo) | alto (renderiza normais + 12 amostras) | **APLICADO** só PC alto, sob demanda, desliga sozinho |
| N8AO (biblioteca) | MIT | AO de alta qualidade e mais rápida | alto | médio/alto | Alternativa futura ao GTAO |
| SSAO (three.js) | MIT | AO antiga | médio | alto | Não (GTAO é melhor) |
| **SMAA** (`SMAAPass`) | MIT | antisserrilhado por pós-processo | médio (bordas limpas no celular) | baixo/médio | **APLICADO** celular médio/alto |
| MSAA (render target) | nativo WebGL2 | antisserrilhado por hardware | médio | médio | Já existia (PC) |
| TAA / TRAA | MIT | antisserrilhado temporal | alto | médio + fantasmas no movimento rápido | Não (carros rápidos = borrão) |
| **ACES Filmic** (já em uso) / **AgX** (r170 `AgXToneMapping`) | MIT | curva de tom tipo cinema | AgX tem cores mais naturais no sol forte | zero | Avaliado; mantido ACES (todo o grade foi ajustado em cima dele). AgX fica como opção futura |
| PMREM + céu físico (`Sky`) | MIT | reflexos de ambiente coerentes com a hora | alto | baixo | Já existia |
| HDRI Poly Haven | CC0 | iluminação de foto real | alto | download 1–4 MB | Não: o céu dinâmico (dia/noite) já gera o ambiente; um HDRI fixo quebraria o ciclo |
| **Água**: Fresnel, ondas Gerstner, espuma, **subsurface, cáusticas** | autoral | mar vivo | alto | baixo (shader) | **APLICADO** (subsurface + cáusticas no médio/alto; o resto já existia) |
| Water/Water2 do three (reflexo planar) | MIT | reflexo real do mundo | muito alto | muito alto (cena desenhada 2x) | Não (pesado demais para celular) |
| UnrealBloom + grade + vinheta | MIT | brilho e cor de cinema | médio | médio | Já existia |
| Biblioteca `postprocessing` (pmndrs) | Zlib | junta efeitos em 1 passada (mais rápido) | — | menor que vários passes | Futuro: trocar o EffectComposer se precisar de mais FPS |
| PBR CC0 (ambientCG, Poly Haven) | CC0 | texturas foto-reais (asfalto, areia, madeira) | alto | download + memória | Futuro, em KTX2; hoje as texturas são procedurais (0 KB) |
| IA para normal maps (Material Maker, modelos abertos) | MIT/Apache | gerar relevo a partir de foto | médio | 0 no jogo (feito antes) | Futuro (produção) |
| Upscaling por IA (Real-ESRGAN) | BSD-3 | aumentar texturas pequenas | médio | 0 no jogo (feito antes) | Futuro (produção) |
| WebGPU (`WebGPURenderer` + fallback WebGL) | MIT | API gráfica nova, mais rápida | igual/melhor | ainda instável em celular Android antigo e iOS < 26 | Não agora: risco alto; reavaliar em 2027 |

## 4. Tecnologias para leveza (celular fraco)
| Tecnologia | Licença | O que faz | Ganho | Status |
|---|---|---|---|---|
| **Import dinâmico por nível** | — | só baixa o efeito se o aparelho vai usar | 0 KB extra no modo leve | **APLICADO** (GTAO/SMAA) |
| Resolução dinâmica + desligar AO primeiro | — | mantém o FPS | evita travadas | **APLICADO** (AO sai antes de baixar a resolução) |
| Modo leve automático ao vivo (t433) | — | sem recarregar a página | — | Já existia |
| KTX2 / Basis Universal (KTX-Software) | Apache-2.0 | textura comprimida na GPU (até 4–8x menos memória) | alto para texturas grandes | Avaliado: hoje quase tudo é textura procedural em canvas (0 KB de download). O único JPG grande é o atlas de outdoors (86 KB no celular), e o transcoder Basis (~200 KB de WASM) custaria mais que o ganho. Vale quando entrarem texturas PBR CC0 |
| meshopt / Draco + gltf-transform | MIT / Apache-2.0 | comprimir modelos GLB | 50–80% menos nos GLB | Avaliado: os 2 avatares GLB (~220 KB cada) já são pequenos; o decoder Draco pesa ~300 KB. Fica para quando houver mais GLB (Blueprints 3D) |
| Instancing (já em uso) | MIT | prédios/palmeiras em poucas chamadas | alto | Já existia |
| LOD / impostores | MIT | objeto longe = versão simples/foto | médio | Já existia em parte (`viewHide`/`detail`); impostores ficam para o futuro |
| Streaming por distrito | — | carregar bairros conforme chega perto | alto no download | Não agora: o download já está em ~0,8 MB comprimido (orçamento 2,6 MB) e o mapa é gerado por código. O risco de bugs (objetos sumindo, colisão) é maior que o ganho |
| Web Workers / OffscreenCanvas | nativo | física/geração fora da thread principal | médio | Futuro: geração do mundo em worker, para 1º quadro mais rápido |
| Áudio sob demanda (t436) | — | narração da Solara só baixa no toque | 0 KB no carregamento | **APLICADO** |

## 5. O que foi aplicado (código)
- `src/main.js`: presets `ao` (só alto/PC) e `smaa` (médio/alto sem MSAA); `loadFx()` com `import()` de `GTAOPass`/`SMAAPass`; AO desliga primeiro quando o FPS < 40; `lightenLive()` desliga tudo; `MBD.perf()` mostra `ao`/`smaa`/`fxErr`.
- `src/env.js`: água no médio/alto com subsurface nas cristas e cáusticas no raso (modo leve igual ao de antes).
- `vendor/three/addons/`: arquivos oficiais do three.js r170 (MIT): `GTAOPass`, `SMAAPass`, `GTAOShader`, `PoissonDenoiseShader`, `SMAAShader`, `math/SimplexNoise`.
- Junto (t436/t437): Solara na abertura (foto + boas-vindas + como jogar + áudio PT/EN/ES com voz Kokoro local, Apache-2.0) e recados dela no estilo notificação de celular.

## 6. Próximos passos sugeridos (em ordem)
1. AgX como opção "cores naturais" nas configurações (custo zero).
2. Texturas PBR CC0 (ambientCG) só no alto, em KTX2, medidas com NVIDIA FLIP.
3. Props 3D novos com os Blueprints NVIDIA (Apache-2.0) + gltf-transform/meshopt.
4. Geração do mundo em Web Worker (1º quadro mais rápido no celular fraco).
5. Levar tudo para Neon Distrito e para o site MIAMI DRIVE (próximos links).
