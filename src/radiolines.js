// Rádio da Ponte (t361): falas ANIMADAS e engraçadas dos 5 pilotos em pt-BR com gíria gaúcha/brasileira, reagindo a
// drift, tandem, ultrapassagem, batida, nitro, helicóptero/avião passando, meia volta, chegada, recorde e presente.
// Sem nome de cidade (as mesmas gravações servem aos dois jogos). Cada fala pertence a um piloto (voz própria).
// Gravadas offline (Kokoro-82M, Apache-2.0) em assets/voz/radio/<piloto>/<hash>.mp3 — baixadas só quando tocam.
// Vozes mais alegres: gravação mais rápida (speed) e tom acima do normal no jogo (rate > 1), diferente para cada piloto.
export const RADIO_VOICES = { // piloto → voz base do Kokoro, velocidade da gravação e tom no jogo (playbackRate)
  bia: { v: 'pf_dora', speed: 1.14, rate: 1.1 },
  tche: { v: 'pm_alex', speed: 1.1, rate: 1.06 },
  duda: { v: 'pf_dora', speed: 1.08, rate: 1.16 },
  valdo: { v: 'pm_santa', speed: 1.06, rate: 1.04 },
  lipe: { v: 'pm_alex', speed: 1.18, rate: 1.14 },
};
export const RADIO = {
  start: [
    ['tche', 'Bah, galera! Ponte liberada! Bora fazer fumaça até o mar ficar com ciúme!'],
    ['bia', 'Rádio ligado, pneu quente e sorriso no rosto! Partiu tandem!'],
    ['valdo', 'Opa! Cinto apertado, chimarrão no suporte. Hoje o véio tá impossível!'],
    ['duda', 'Atenção, turma! Largada liberada! Quem bater na mureta paga o pastel!'],
    ['lipe', 'Partiu ponte! Quem ficar pra trás lava os carros de todo mundo!'],
  ],
  playerDrift: [
    ['tche', 'Bah, que top teu drift!'],
    ['tche', 'Mas bah, tchê! Que ângulo foi esse? Me ensina!'],
    ['bia', 'Uau! Andou de lado mais que caranguejo na praia!'],
    ['bia', 'Que drift lindo! Até as gaivotas aplaudiram!'],
    ['duda', 'Que linha! Desenhou a curva com fumaça!'],
    ['valdo', 'Barbaridade, piá! Esse drift merece um churrasco!'],
    ['lipe', 'Que isso, mano! Tá dançando com o carro!'],
    ['lipe', 'Segura, segura! Esse drift não acaba nunca! Que delícia!'],
    ['valdo', 'Capaz! Saiu tanta fumaça que os peixes pensaram que era neblina!'],
    ['duda', 'Pêndulo perfeito! Trocou de lado igual passo de dança!'],
  ],
  tandemClose: [
    ['bia', 'Colou em mim! Tandem de novela, que coisa linda!'],
    ['tche', 'Bah, porta com porta! Parece até ensaiado, tchê!'],
    ['duda', 'Que proximidade! Dá pra passar o sal daqui!'],
    ['lipe', 'Gruda, gruda! Somos um trenzinho de fumaça!'],
    ['valdo', 'Tá no meu para-choque, guri! Assim que o véio gosta!'],
    ['bia', 'Isso! Mesma fumaça, mesmo ângulo, mesma alegria!'],
  ],
  wall: [
    ['valdo', 'Ó a mureta, tchê! Ela não quer beijinho!'],
    ['duda', 'Opa! Tá raspando a mureta! Ela é tímida, dá espaço!'],
    ['tche', 'Bah, guri, quase pintou a mureta com teu carro!'],
    ['lipe', 'Abre um pouquinho! A mureta tá com ciúme!'],
    ['bia', 'Cuidado aí! A mureta chegou primeiro!'],
  ],
  crash: [
    ['lipe', 'Ops! Bateu de leve! Respira, sacode a poeira e bora!'],
    ['valdo', 'Eita! Só um amassadinho, nada que um chimarrão não resolva!'],
    ['bia', 'Tudo bem aí? Tá inteiro? Então acelera que a festa continua!'],
    ['tche', 'Bah, que susto! Mas carro bom é carro com história!'],
    ['duda', 'Batidinha registrada! Nota dez pelo estilo, nota zero pela mira!'],
  ],
  nitro: [
    ['lipe', 'Nitro! Lá vai foguete! Segura o boné!'],
    ['tche', 'Bah, apertou o botão mágico! Voou, tchê!'],
    ['bia', 'Nitro ligado! Até o vento ficou pra trás!'],
    ['duda', 'Que arrancada! Isso foi nitro ou teletransporte?'],
    ['valdo', 'Mas que pressa, guri! Tá atrasado pro churrasco?'],
  ],
  playerPass: [
    ['tche', 'Passou por mim! Bah, que ousadia! Gostei!'],
    ['lipe', 'Ei! Me ultrapassou de lado? Respeito, mestre!'],
    ['duda', 'Ultrapassagem limpinha! Nem senti o vento!'],
    ['valdo', 'Vai lá, piá! Mostra o caminho pro véio!'],
    ['bia', 'Pode ir! Eu colo no teu vácuo e dou tchauzinho!'],
  ],
  aiPass: [
    ['bia', 'Com licença! Passando por fora com charme!'],
    ['tche', 'Abre espaço, que lá vou eu cantando!'],
    ['lipe', 'Fica na minha fumaça! Mas fica feliz, tá?'],
    ['valdo', 'Devagar e sempre! Passei, guri!'],
    ['duda', 'Passando pela esquerda! Beijo, tchau!'],
  ],
  heli: [
    ['lipe', 'Olha o helicóptero lá em cima! Acena pra foto, galera!'],
    ['bia', 'Tem helicóptero filmando a gente! Capricha no drift!'],
    ['tche', 'Bah, até o helicóptero veio ver! Somos famosos, tchê!'],
    ['valdo', 'Óia o passarinho de metal! Manda um tchau pro piloto!'],
    ['duda', 'Avião passando no céu! Que vista mais linda dessa ponte!'],
  ],
  banter: [
    ['bia', 'Tchê, tu tá freando cedo demais!'],
    ['tche', 'Bia, eu tô é fazendo charme pra câmera!'],
    ['lipe', 'Seu Valdo, essa caminhonete aguenta?'],
    ['valdo', 'Guri, essa caminhonete já fez mais drift que tu!'],
    ['duda', 'Alguém viu o pôr do sol no mar? Que vista!'],
    ['bia', 'Vista linda, mas olha a curva, Duda!'],
    ['tche', 'Mas bah, esse vento do mar ajuda no ângulo!'],
    ['lipe', 'Tô com fome! Depois tem churrasco?'],
    ['valdo', 'Churrasco e chimarrão por minha conta!'],
    ['duda', 'Foco, pessoal! Próximo grampo é fechado!'],
    ['lipe', 'Duda, teu carro tá cheirando a pneu ou a pipoca?'],
    ['duda', 'É perfume de vitória, Lipe! Aprende!'],
  ],
  half: [
    ['duda', 'Metade da volta! Segue o baile!'],
    ['valdo', 'Já foi metade, guri! O véio tá suando, mas tá feliz!'],
    ['bia', 'Meia volta feita! A outra metade é ainda mais bonita!'],
  ],
  lapsLeft2: [
    ['tche', 'Faltam duas voltas! Pneu quente, coração na boca!'],
    ['duda', 'Duas voltas pela frente! Bora brilhar!'],
  ],
  lastLap: [
    ['bia', 'Última volta! Tudo ou nada, com alegria!'],
    ['tche', 'Bah, última volta! Agora é com tudo, tchê!'],
    ['lipe', 'Última volta, galera! Fumaça até o fim!'],
  ],
  finish: [
    ['tche', 'Bandeirada! Bah, que sessão maravilhosa, tchê!'],
    ['bia', 'Acabou! Que tandem foi esse? Quero repetir!'],
    ['valdo', 'Fim de papo! Mandou muito bem, piá! O churrasco é teu!'],
    ['duda', 'Sessão encerrada! Voltas lindas, coração quentinho!'],
  ],
  record: [
    ['duda', 'Recorde da ponte! Volta mais rápida de todas!'],
    ['tche', 'Bah, recorde! Esse tempo vai pro quadro da fama!'],
  ],
  gift: [
    ['bia', 'Volta completa! Ganhou um carro novinho de presente! Que luxo!'],
    ['tche', 'Bah, tchê! Presente da ponte! Carro tunado com neon e tudo!'],
    ['lipe', 'Ganhou carro novo! Vou pedir uma carona, hein!'],
  ],
  respawn: [
    ['valdo', 'Voltou pra pista! Segue o baile!'],
    ['lipe', 'Tá tudo certo! De volta na ponte, sorriso no rosto!'],
    ['bia', 'Respira e acelera! A gente te espera!'],
  ],
};
// todas as falas (para o gerador de voz)
export function radioBank() { const out = []; for (const k in RADIO) for (const [d, t] of RADIO[k]) out.push([d, t]); return out; }
