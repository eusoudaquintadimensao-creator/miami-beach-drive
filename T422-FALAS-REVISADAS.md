# t422 — Falas revisadas (duplo sentido)

Auditoria de todas as falas e textos dos dois jogos (Solara Bay e Neon Distrito) e do site MIAMI DRIVE: rádio da ponte e dos rachas, chat das lanchas, gaúchos da orla, moradores, NPCs, dicas, feed, missões, outdoors e lojas.
Foram 1354 textos no Solara e 1344 no Neon. As falas com voz foram regeneradas com o Kokoro, usando a mesma voz de cada personagem: f/m/s para os moradores e gaúchos, e o piloto certo no rádio.
Teste automático: `node test/t422.mjs`. Ele bloqueia a lista de gírias ambíguas e confere se toda fala tem mp3.

| # | Antes | Depois | Motivo | Voz |
|---|---|---|---|---|
| 1 | Segura, segura! Esse drift não acaba nunca! Que delícia! | Segura, segura! Esse drift não acaba nunca! Que show! | “Que delícia” + “não acaba nunca” soa malicioso | rádio (piloto) |
| 2 | Gruda, gruda! Somos um trenzinho de fumaça! | Lado a lado! Parece esquadrilha de fumaça! | “trenzinho” tem gíria sexual | rádio (piloto) |
| 3 | Tá no meu para-choque, guri! Assim que o véio gosta! | Tá colado na minha linha, guri! Que tandem bonito! | “atrás de mim… assim que o véio gosta” = duplo sentido | rádio (piloto) |
| 4 | Pode ir! Eu colo no teu vácuo e dou tchauzinho! | Pode ir! Eu fico no teu vácuo e aceno tchauzinho! | “colo no teu…” / “dou” ambíguos | rádio (piloto) |
| 5 | Abre um pouquinho! A mureta tá com ciúme! | Afasta um pouquinho! A mureta tá com ciúme! | “Abre um pouquinho” ambíguo | rádio (piloto) |
| 6 | Mano, olha essa ilha! Cada minuto aparece uma diferente. A gente tá viajando! | Mano, olha essa ilha! Cada minuto aparece uma diferente. Que passeio! | “tá viajando” = gíria de droga | rádio (piloto) |
| 7 | Mais uma posição! Que pilotagem gostosa de ver! | Mais uma posição! Que pilotagem bonita de ver! | “gostosa” | rádio (piloto) |
| 8 | Vem me pegar, tchê! Tô logo ali na frente! | Vem me alcançar, tchê! Tô logo ali na frente! | “vem me pegar” | rádio (piloto) |
| 9 | Tá ficando pra trás! Bota um nitro nisso! | Tá ficando pra trás! Liga o nitro! | “bota … nisso” ambíguo | rádio (piloto) |
| 10 | Corrida de lanchas! Segura o chapéu que vai molhar! | Corrida de lanchas! Segura o chapéu que vai respingar! | “vai molhar” ambíguo | rádio (piloto) |
| 11 | Barbaridade, tchê! Isso aí custou uma baita pila! | Barbaridade, tchê! Isso aí custou um dinheirão! | “pila” (dinheiro no RS) = pênis em outras regiões/Portugal | 3 vozes f/m/s |
| 12 | Bah, com um carro desses até o chimarrão fica mais gostoso! | Bah, com um carro desses até o chimarrão fica mais saboroso! | “gostoso” | 3 vozes f/m/s |
| 13 | Boa tarde! Que calorzinho gostoso, né? | Boa tarde! Que calorzinho bom, né? | “gostoso” | 3 vozes f/m/s |
| 14 | Taxista! Dirige com carinho que a gorjeta vem 💸 | Taxista! Dirige com cuidado que a gorjeta é garantida 💸 | “com carinho… vem” ambíguo | 3 vozes f/m/s |
| 15 | Freia na entrada da curva e vira: a traseira sai de lado. Isso é drift! | Freia na entrada da curva e vira: o carro escorrega de lado. Isso é drift! | “traseira” | 3 vozes f/m/s |
| 16 | Fiquei sabendo que a curva do grampo no autódromo é traiçoeira. Entra devagar! | Fiquei sabendo que a curva do grampo no autódromo é traiçoeira. Reduz antes dela! | “Entra devagar” | 3 vozes f/m/s |
| 17 | Dia perfeito pra pegar onda! | Dia perfeito pra surfar! | “pegar” | 3 vozes f/m/s |
| 18 | Come direito, ${c.qa}! Tá muito magrinho(a). | Se alimenta direito, ${c.qa}! Tá muito magrinho(a). | “Come” | 3 vozes f/m/s |
| 19 | Daqui da torre eu vejo a praia inteira. Inclusive você 👀 | Daqui da torre eu vejo a praia inteira. Tudo tranquilo hoje 👀 | “Inclusive você 👀” soa de assédio | 3 vozes f/m/s |
| 20 | Batida boa é igual onda: vem, vai e te leva junto. | Música boa é igual onda: chega e leva todo mundo pra dançar. | “vem, vai e te leva” ambíguo | 3 vozes f/m/s |
| 21 | Já experimentou açaí com leite condensado? Pecado gostoso. | Já experimentou açaí com leite condensado? Docinho demais! | “Pecado gostoso” | 3 vozes f/m/s |
| 22 | Olha o anel dourado! | Olha o arco dourado! | “anel” (gíria anatômica) | só texto |
| 23 | Olha o anel neon! | Olha o arco neon! | “anel” (gíria anatômica) | só texto |
| 24 | Peguei moeda! O açaí | Ganhei moeda! O açaí | “Peguei” | só texto |
| 25 | passe pelos anéis dourados e pegue as moedas! | passe pelos arcos dourados e colete as moedas! | “anéis” / “pegue” | só texto |
| 26 | passe pelos anéis neon e pegue as moedas! | passe pelos arcos neon e colete as moedas! | “anéis” / “pegue” | só texto |
| 27 | siga o anel rosa | siga o arco rosa | “anel” | só texto |
| 28 | Fui nos Setor e vi garças lindas | Fui no Setor Industrial e vi garças lindas | (gramática, Neon) | só texto |
| 29 | super pulo e levanta carros (com carinho, sem estragar nada) | super pulo e levanta carros (com cuidado, sem estragar nada) | “com carinho” (lista t422) | só texto |
| 30 | aperte <b>Iniciar</b> para pegar passageiros | aperte <b>Iniciar</b> para buscar passageiros | “pegar” | só texto |
| 31 | 🚗 Pegue um carro e pisque o farol | 🚗 Entre num carro e pisque o farol | “Pegue” | só texto |
| 32 | site: “feito com carinho no Brasil” | “feito com dedicação no Brasil” | lista t422 | só texto |

Os mp3 regenerados são 13 falas de moradores/gaúchos (39 arquivos nas 3 vozes, incluindo as 4 variações de “querido/querida”) e 10 falas de rádio. Os arquivos antigos foram apagados e os índices atualizados nos dois jogos.

Revisadas e mantidas (sem duplo sentido no contexto): “bagual” (cavalo/ótimo), “piá”, “guri/guria”, “prenda”, “tchê”, “bah”, “capaz”, “tri”, “índio véio”, “pechada”, “carreira de cancha reta”, “Ó a mureta… não quer beijinho”, “porta com porta”, “Que vença o mais liso”, “açaí com banana”.
