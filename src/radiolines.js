// Rádio da Ponte: falas dos 5 pilotos (e para o jogador) em pt-BR com um pouco de gíria gaúcha/brasileira.
// Sem nome de cidade (as mesmas gravações servem aos dois jogos). Cada fala pertence a um piloto (voz própria).
// Gravadas offline (Kokoro-82M, Apache-2.0) em assets/voz/radio/<piloto>/<hash>.mp3 — baixadas só quando tocam.
export const RADIO_VOICES = { // piloto → voz base do Kokoro, velocidade da gravação e tom no jogo (playbackRate)
  bia: { v: 'pf_dora', speed: 1.08, rate: 1.05 },
  tche: { v: 'pm_alex', speed: 0.95, rate: 0.93 },
  duda: { v: 'pf_dora', speed: 0.96, rate: 0.9 },
  valdo: { v: 'pm_santa', speed: 0.92, rate: 0.95 },
  lipe: { v: 'pm_alex', speed: 1.12, rate: 1.1 },
};
export const RADIO = {
  start: [
    ['tche', 'Bah, galera, ponte liberada! Bora fazer fumaça!'],
    ['bia', 'Rádio na escuta! Encosta em mim que hoje é tandem do começo ao fim.'],
    ['valdo', 'Opa, opa! Cinto apertado, pneu quente e mar do lado. Partiu!'],
    ['duda', 'Atenção, pessoal: largada liberada. Sem muro, só fumaça!'],
    ['lipe', 'Partiu ponte! Quem ficar pra trás paga o açaí!'],
  ],
  playerDrift: [
    ['tche', 'Bah, que top teu drift!'],
    ['tche', 'Mas bah, tchê! Que ângulo foi esse?'],
    ['bia', 'Mandou bem demais nessa curva!'],
    ['bia', 'Olha esse ângulo! Tá de parabéns!'],
    ['duda', 'Que linha limpa! Assim que se faz.'],
    ['valdo', 'Barbaridade, piá! Andou de lado bonito!'],
    ['lipe', 'Que isso! Tá voando de lado!'],
    ['lipe', 'Caramba, que drift longo! Segura, segura!'],
    ['valdo', 'Capaz! Saiu fumaça até no mar!'],
    ['duda', 'Lindo pêndulo! Trocou de lado sem perder nada.'],
  ],
  tandemClose: [
    ['bia', 'Tá colado, hein! Tandem perfeito!'],
    ['tche', 'Bah, porta com porta! Que tandem bonito!'],
    ['duda', 'Que proximidade! Segura essa linha comigo.'],
    ['lipe', 'Gruda, gruda! Que tandem de respeito!'],
    ['valdo', 'Tá no meu para-choque, guri! Assim que eu gosto.'],
    ['bia', 'Isso! Mesma fumaça, mesmo ângulo!'],
  ],
  wall: [
    ['valdo', 'Ó o muro! Cuidado, tchê!'],
    ['duda', 'Atenção, tá raspando a mureta!'],
    ['tche', 'Bah, guri, quase beijou a mureta!'],
    ['lipe', 'Opa, opa! Abre um pouco, que o muro tá perto!'],
    ['bia', 'Cuidado aí! Muro do teu lado!'],
  ],
  playerPass: [
    ['tche', 'Passou por mim! Bah, que ousadia!'],
    ['lipe', 'Ei! Me ultrapassou de lado? Respeito!'],
    ['duda', 'Boa ultrapassagem. Limpa e sem encostar.'],
    ['valdo', 'Vai lá, piá! Mostra o caminho!'],
    ['bia', 'Pode ir, que eu colo no teu vácuo!'],
  ],
  aiPass: [
    ['bia', 'Com licença, tô passando por fora!'],
    ['tche', 'Abre espaço, que lá vou eu!'],
    ['lipe', 'Fica na minha fumaça!'],
    ['valdo', 'Devagar e sempre, passei!'],
    ['duda', 'Passando pela esquerda. Segura a tua linha.'],
  ],
  banter: [
    ['bia', 'Tchê, tu tá freando cedo demais!'],
    ['tche', 'Bia, eu tô é fazendo charme pra câmera!'],
    ['lipe', 'Seu Valdo, essa caminhonete aguenta?'],
    ['valdo', 'Guri, essa caminhonete já fez mais drift que tu!'],
    ['duda', 'Alguém viu o pôr do sol no mar? Que vista!'],
    ['bia', 'Vista linda, mas olha a curva, Duda!'],
    ['tche', 'Mas bah, esse vento do mar ajuda no ângulo!'],
    ['lipe', 'Tô com fome. Depois tem churrasco?'],
    ['valdo', 'Churrasco e chimarrão por minha conta!'],
    ['duda', 'Foco, pessoal. Próximo grampo é fechado.'],
  ],
  half: [
    ['duda', 'Metade da volta! Segue o baile.'],
    ['valdo', 'Já foi metade, guri. Mantém o ritmo!'],
    ['bia', 'Meia volta feita! Bora pro resto!'],
  ],
  lapsLeft2: [
    ['tche', 'Faltam duas voltas! Pneu quente, coração na boca!'],
    ['duda', 'Duas voltas pela frente. Aproveita a ponte!'],
  ],
  lastLap: [
    ['bia', 'Última volta! Tudo ou nada!'],
    ['tche', 'Bah, última volta! Agora é com tudo!'],
    ['lipe', 'Última volta, galera! Fumaça até o fim!'],
  ],
  finish: [
    ['tche', 'Bandeirada! Bah, que sessão, tchê!'],
    ['bia', 'Acabou! Que tandem foi esse, hein?'],
    ['valdo', 'Fim de papo! Mandou muito bem, piá.'],
    ['duda', 'Sessão encerrada. Que voltas bonitas!'],
  ],
  record: [
    ['duda', 'Recorde da ponte! Volta mais rápida de todas!'],
    ['tche', 'Bah, recorde! Esse tempo vai ficar na história!'],
  ],
  respawn: [
    ['valdo', 'Voltou pra pista! Segue o baile.'],
    ['lipe', 'Tá tudo certo, de volta na ponte!'],
    ['bia', 'Respira e acelera, a gente te espera!'],
  ],
};
// todas as falas (para o gerador de voz)
export function radioBank() { const out = []; for (const k in RADIO) for (const [d, t] of RADIO[k]) out.push([d, t]); return out; }
