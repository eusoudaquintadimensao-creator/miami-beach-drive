// Banco de falas locais (sem IA, sem internet): personalidades + contexto (hora, clima, seu carro, missões, dicas).
// Cada fala é texto ou função (c) => texto|null, onde c é o contexto montado na hora da conversa.
const pickA = (r, a) => a[Math.floor(r() * a.length)];
export const PERS = {
  surfista: { emoji: '🏄', tag: 'surfista', names: ['Kai', 'Duda', 'Tico', 'Nalu'], vibe: ['Aloha!', 'E aí,', 'Salve,', 'Fala,'] },
  vovo: { emoji: '👵', tag: 'moradora antiga', names: ['Dona Cida', 'Dona Lurdes', 'Vó Nena'], vibe: ['Ô, meu bem!', 'Oi,', 'Olha só,'] },
  influencer: { emoji: '🤳', tag: 'influencer', names: ['@bia.vibez', '@thai.solara', '@gui.trends'], vibe: ['Oiê!', 'Gente!', 'Amei,'] },
  turista: { emoji: '🧳', tag: 'turista', names: ['Hans', 'Yuki', 'Mateo', 'Chloé'], vibe: ['Olá!', 'Com licença,', 'Oi oi,'] },
  mecanico: { emoji: '🔧', tag: 'mecânico tuner', names: ['Rafa Torque', 'Nina Pistão', 'Beto Turbo'], vibe: ['Fala, piloto!', 'Opa!', 'E aí, fera,'] },
  pescador: { emoji: '🎣', tag: 'pescador', names: ['Seu Jorge', 'Seu Raimundo', 'Dona Mara'], vibe: ['Opa, opa…', 'Ô de casa!', 'Opa,'] },
  salva: { emoji: '🛟', tag: 'salva-vidas', names: ['Marina', 'Caio', 'Jéssica'], vibe: ['Oi!', 'Opa,', 'Ei,'] },
  dj: { emoji: '🎧', tag: 'DJ', names: ['DJ Lua', 'DJ Coral', 'MC Brisa'], vibe: ['Yeah!', 'Fala, meu povo!', 'Ei, ei,'] },
  corredor: { emoji: '🏃', tag: 'corredor', names: ['Léo', 'Carol', 'Pedro'], vibe: ['Ufa… oi!', 'Opa,', 'Bora,'] },
  acai: { emoji: '🍧', tag: 'vendedora de açaí', names: ['Tia Rosa', 'Tio Zé', 'Lia'], vibe: ['Olha o açaí!', 'Oi, freguês!', 'Chega mais,'] },
  piloto: { emoji: '🚁', tag: 'piloto', names: ['Comandante Íris', 'Capitão Bento'], vibe: ['Olá!', 'Bem-vindo(a) a bordo,', 'Oi,'] },
};
export const GENERIC_PERS = ['surfista', 'vovo', 'influencer', 'turista', 'mecanico', 'pescador', 'corredor', 'acai', 'dj', 'salva'];

// cumprimento por período do dia
const GREET = {
  manha: [(c) => `Bom dia, ${c.am}! O sol já tá brilhando em Solara ☀️`, 'Bom dia! Nada como o cheirinho de maresia de manhã.', 'Bom dia! Cedinho a cidade é só nossa.', (c) => `Bom dia, ${c.am}! Já tomou café?`],
  tarde: ['Boa tarde! Que calorzinho gostoso, né?', (c) => `Boa tarde, ${c.am}! Dia perfeito pra rolê.`, 'Boa tarde! A praia tá lotada hoje.', 'Boa tarde! Tô derretendo aqui 😅'],
  por: ['Olha esse pôr do sol… Solara fica cor-de-rosa 🌅', 'Chegou a hora mais bonita do dia!', (c) => `Boa tardinha, ${c.am}! Corre pro píer ver o sol se pôr.`, 'Esse céu laranja parece pintura, né?'],
  noite: ['Boa noite! O neon da Ocean Drive já acendeu 💜', (c) => `Boa noite, ${c.am}! A cidade ganha outra vida agora.`, 'Boa noite! Ouviu o helicóptero passando? Os holofotes são lindos.', 'Boa noite! Hoje a lua tá caprichada 🌙'],
  madrugada: ['Ainda acordado(a)? A madrugada aqui é tranquila…', (c) => `Uau, ${c.am}, você também é da madrugada? 🌙`, 'Madrugada em Solara: só o barulho do mar e o neon piscando.', 'Psiu… a cidade tá dormindo 😴'],
};
const WEATHER = {
  chuva: ['Que chuvarada! Cuidado que o asfalto fica liso 🌧️', 'Chuva de verão: daqui a pouco passa e fica tudo brilhando.', 'Com essa chuva, o reflexo do neon nas ruas fica um espetáculo.', 'Esqueci meu guarda-chuva… de novo 😩'],
  nublado: ['Tempo meio fechado hoje, mas sem chuva por enquanto.', 'Nublado é bom: dá pra andar sem torrar no sol.', 'Essas nuvens… acho que vem chuva mais tarde.'],
  limpo: ['Céu limpinho! Dá pra ver a Torre Aurora de longe.', 'Sem uma nuvem no céu. Passa protetor, hein!', 'Tempo perfeito pra dar uma volta de lancha.'],
};
// sobre o seu carro / veículo (chegou dirigindo ou está nele)
const CAR = [
  (c) => c.car && c.car.tuned ? `Esse ${c.car.name} tunado tá um absurdo! Esse neon embaixo é demais 😍` : null,
  (c) => c.car && c.car.tuned && c.car.text ? `Adorei o adesivo "${c.car.text}" na lateral. Ficou muito estiloso!` : null,
  (c) => c.car && c.car.nitro ? 'Eu vi esse nitro! Saiu fogo do escapamento 🔥 Só cuidado com o pessoal na calçada!' : null,
  (c) => c.car && !c.car.tuned && c.car.tunable ? `Belo ${c.car.name}! Já pensou levar na Oficina Neon pra tunar?` : null,
  (c) => c.car && c.car.type === 'classic' ? 'Um Besouro Clássico! Meu avô tinha um igualzinho 🚙' : null,
  (c) => c.car && c.car.type === 'moto' ? 'De moto pela orla? Só alegria! Capacete sempre, hein.' : null,
  (c) => c.car && c.car.type === 'taxi' ? 'Tá de táxi? Aperta Iniciar que tem passageiro esperando!' : null,
  (c) => c.car && c.car.type === 'boat' ? 'Lancha é vida! Já fez a Regata da Baía?' : null,
  (c) => c.car && c.car.type === 'heli' ? 'Você chegou de helicóptero?! Que entrada triunfal 🚁' : null,
];
const MISSION = [
  (c) => c.mission === 'entrega' ? 'Tá fazendo entrega? Corre que o cliente tá esperando! 📦' : null,
  (c) => c.mission === 'taxi' ? 'Taxista! Dirige com carinho que a gorjeta vem 💸' : null,
  (c) => c.mission === 'corrida' ? 'Tá no meio de uma corrida? Foco nos checkpoints! 🏁' : null,
  (c) => c.mission === 'foto' ? 'Indo tirar foto? Vai na hora do pôr do sol que bomba de curtida 📸' : null,
  (c) => c.mission === 'favor' ? 'Tá ajudando alguém? Solara precisa de mais gente assim 💛' : null,
  (c) => !c.mission && c.done === 0 ? 'Você é novo(a) por aqui? Abre o celular (P) e olha o app Missões!' : null,
  (c) => !c.mission && c.done >= 5 ? `Já ouvi falar de você! ${c.done} missões feitas, hein? 👏` : null,
  (c) => c.followers > 1500 ? `Peraí… você é famoso(a) na Vibez? ${c.followers.toLocaleString('pt-BR')} seguidores! 🤩` : null,
  (c) => c.money > 3000 ? 'Tá com a carteira cheia, hein? Investe numa tunagem!' : null,
];
const TIPS = [
  'Dica: na Oficina Neon (ícone 🔧) você escolhe pintura, neon, aerofólio e até o adesivo do carro.',
  'Dica: carro tunado tem nitro! Segura Shift (ou o botão 🔥) numa reta.',
  'Dica: os rachas 🔥 são contra carros tunados. Quem chegar primeiro leva a grana — sem bater em ninguém!',
  'Dica: tem conchas neon 🐚 espalhadas pela cidade. Cada uma vale $100.',
  'Dica: no heliponto da praia tem um helicóptero. Lá de cima a cidade é outra! 🚁',
  'Dica: fotos no pôr do sol ou à noite rendem muito mais curtidas.',
  'Dica: aperta V (ou 🔴) pra gravar um vídeo do seu rolê e mandar pros amigos.',
  'Dica: dá pra instalar o jogo na tela inicial do celular pelo botão 📲 Instalar.',
  'Dica: toque no mapa grande (M) pra marcar um destino no GPS.',
  'Dica: no Espaço você puxa o freio de mão e sai de lado. Drift é arte! 🌀',
  'Dica: a lancha fica na marina. A Regata da Baía é linda no fim da tarde.',
  'Dica: entra num táxi e aperta Iniciar pra ganhar dinheiro com corridas 🚕',
  'Dica: no celular, app Clima e hora muda o tempo e o horário.',
  'Dica: o Mirante dos Glades é ótimo pra ver garças. Vai devagar que é pântano!',
];
// autódromo, drift e nitro (quando você chega num carro de corrida ou perto da pista)
const RACE = [
  'Bora apostar um racha no Autódromo Neon? Lá é na pista, sem perigo pra ninguém!',
  'Freia na entrada da curva e vira: a traseira sai de lado. Isso é drift!',
  'Guarda o nitro pra reta principal. Na curva ele só te joga pra fora.',
  'Dizem que a Luna Turbo tá invicta no autódromo. Será que você ganha dela?',
  'Esse carro de corrida é lindo demais! Parece de videogame.',
  'Que ronco desse motor! Dá pra ouvir lá da praia.',
  'Quanto mais tempo de lado no drift, mais o nitro enche. Aproveita as curvas!',
  'Fiquei sabendo que a curva do grampo no autódromo é traiçoeira. Entra devagar!',
];
// direções pela cidade (o morador ensina o caminho)
const DIRS = [
  'O Autódromo Neon fica no norte dos Glades. Segue a Estrada do Pântano que você chega!',
  'Quer voar? O helicóptero fica no heliponto da praia. Ou chama ele pelo botão do helicóptero!',
  'A Oficina Neon é onde a galera tuna os carros. Procura a chave inglesa no mapa.',
  'Cansou? Vai pra sua casa descansar, trocar de carro e salvar o progresso.',
  'A roda-gigante da baía fica linda à noite. Vale a pena passar lá!',
  'Se perder, abre o mapa e marca o destino. O GPS te leva!',
];
// mochila a jato (você passou voando)
const JET = [
  'Você tava voando de mochila a jato?! Eu vi tudo!',
  'Mochila a jato em Solara? Agora eu já vi de tudo!',
  'Me empresta essa mochila voadora? Só uma voltinha!',
  'Cuidado com os fios e as palmeiras lá em cima, hein!',
];
// sobre a sua casa
const HOME = [
  'Ouvi dizer que você tem uma casa linda, com garagem cheia de carro!',
  'Sua casa tem piscina? Que chique!',
];
export const BYE = ['Tchau! 👋', 'Até mais!', 'Boa, aproveita Solara! 🌴', 'Falou! 🤙', 'Volte sempre!'];
export const THANKS = ['Valeu demais! 💛', 'Você é demais! Obrigado(a)!', 'Combinado! Te espero!', 'Isso! Boa sorte! 🍀'];
// falas próprias de cada personalidade
const OWN = {
  surfista: ['O mar tá com umas ondinhas perfeitas hoje, brother 🌊', 'Já surfei no Píer da Praia ao amanhecer. Recomendo demais!', 'Prancha, protetor e paz. É disso que eu preciso.', 'Se vir uma prancha azul perdida, é minha 😅', 'Vida de surfista: acordar cedo e dormir com o barulho do mar.'],
  vovo: (c) => [`Moro em Solara há 50 anos, ${c.qa}. Antes nem tinha esses prédios todos!`, 'Quando eu era moça, a Ocean Drive era de terra batida, acredita?', `Come direito, ${c.qa}! Tá muito magrinho(a).`, 'Meu neto vive no celular… mas me ensinou a postar na Vibez 😄', 'O segredo da vida longa? Caminhar na orla e falar com todo mundo.'],
  influencer: ['Peraí que eu tô gravando um story… pronto! Oi!', 'Esse ângulo aqui com a roda-gigante ao fundo é TUDO ✨', 'Se postar com a hashtag #SolaraBay o alcance vai lá em cima!', 'Já fez uma selfie no Farol de Solara? É o meu lugar favorito.', 'Engajamento hoje tá ótimo! Deve ser o pôr do sol 🌅'],
  turista: ['Vim de muito longe só pra ver essa praia. Valeu cada hora de voo!', 'Que cidade colorida! Esses prédios art déco parecem doces 🍬', 'Desculpa, meu português ainda é básico… mas eu amei tudo aqui!', 'Onde fica a Roda-gigante da Baía? Quero ir à noite!', 'Já tirei 300 fotos hoje e ainda não chegou no hotel.'],
  mecanico: ['Escuta esse motor… música pros meus ouvidos 🎶', 'Aerofólio não é só enfeite: segura o carro nas curvas!', 'Neon embaixo do carro? Vai de rosa ou ciano, nunca erra.', 'Racha de rua aqui é limpo: ninguém bate, ninguém se machuca. Só talento.', 'Rodas aro grande e kit largo deixam qualquer carro bravo.'],
  pescador: ['Hoje a pescaria rendeu: três robalos e uma bota velha 🥾', 'Quando as gaivotas voam baixo, é chuva na certa.', 'A marina é meu escritório. Melhor vista da cidade!', 'Pescar ensina paciência, sabia?', 'Vi um golfinho perto da marina hoje cedo 🐬'],
  salva: ['Nade sempre perto do posto de salva-vidas, combinado?', 'Bandeira verde hoje: mar tranquilo 🟢', 'Passa protetor de novo a cada duas horas, viu?', 'Meu trabalho é garantir que todo mundo volte pra casa feliz.', 'Daqui da torre eu vejo a praia inteira. Inclusive você 👀'],
  dj: ['Hoje à noite tem som na Ocean Drive! Synthwave até o sol nascer 🎶', 'Já ouviu a rádio Neon 88? Fui eu que mixei a vinheta (mentira 😂).', 'Batida boa é igual onda: vem, vai e te leva junto.', 'Liga o rádio do carro e aperta R pra trocar de estação!', 'Neon, batida e brisa do mar. Solara é uma pista de dança!'],
  corredor: ['Tô no quilômetro 8… ou 9? Perdi a conta 😅', 'Correr na orla de manhã é o melhor remédio.', 'Se eu correr mais rápido que você de carro, me paga um açaí? 😂', 'Hidrata, hein! Esse sol não perdoa.', 'Meu recorde é ida e volta no Píer da Praia em 12 minutos.'],
  acai: ['Açaí com banana e granola, o mais pedido de Solara! 🍧', 'Fofoca do dia: dizem que tem uma concha neon escondida no farol…', 'Freguês bom é freguês que volta! Volta, hein?', 'Já experimentou açaí com leite condensado? Pecado gostoso.', 'Minha barraquinha tá aqui faz 20 anos. Vi essa cidade crescer!'],
  piloto: ['O helicóptero fica no heliponto ali na frente. Entra com E (ou 🚗) quando estiver pertinho.', 'No ar: W/S frente e ré, A/D gira, Espaço sobe e Shift desce. No celular, use ⤒ Subir e ⤓ Descer.', 'Para descer do helicóptero, pouse com calma em qualquer lugar plano ou no telhado de um prédio.', 'Lá de cima, à noite, a Ocean Drive parece um rio de neon 🌃', 'Voo panorâmico é de graça! Só não esqueça de pousar devagar.'],
};
// reações quando você passa de carro tunado ou solta o nitro
export const REACT = {
  nitro: ['Uooou, que nitro! 🔥', 'Foi um foguete?!', 'Que barulho é esse?! 😱', 'Fogo no escapamento! Que lindo!', 'Devagar aí, Fast! 😂', 'VRUUUM! 🔥🔥'],
  tuned: ['Que carro tunado lindo! 😍', 'Olha esse neon embaixo do carro!', 'Que máquina! 🤩', 'Posso tirar uma foto do seu carro?', 'Esse aerofólio ficou demais!', 'Carro de cinema, hein!'],
  heli: ['Olha o helicóptero! 🚁', 'Que vento! Segura o chapéu!', 'Me leva junto! 😄', 'Tchau, piloto! 👋'],
  jet: ['Olha! Uma pessoa voando! 😱', 'É um pássaro? É um avião? É mochila a jato!', 'Que demais, voa mais alto!', 'Uau, mochila a jato! 🚀'],
  race: ['Que carro de corrida! 🏁', 'Olha o ronco desse motor!', 'Parece carro de videogame! 🤩'],
};

// mini missões oferecidas em conversa
export const FAVORS = {
  vovo: [{ kind: 'entrega', item: 'um bolo de fubá quentinho', to: 'minha neta', money: 220, fol: 25 }, { kind: 'entrega', item: 'esses óculos que ela esqueceu aqui', to: 'minha amiga', money: 180, fol: 20 }],
  acai: [{ kind: 'entrega', item: 'dois açaís de 500ml', to: 'um cliente', money: 200, fol: 20 }],
  pescador: [{ kind: 'entrega', item: 'esse isopor de peixe fresco', to: 'o restaurante', money: 240, fol: 15 }],
  turista: [{ kind: 'foto', money: 260, fol: 80 }, { kind: 'entrega', item: 'minha mala que ficou comigo por engano', to: 'meu hotel', money: 210, fol: 20 }],
  influencer: [{ kind: 'foto', money: 300, fol: 160 }],
  mecanico: [{ kind: 'entrega', item: 'essa peça de turbo', to: 'um cliente', money: 260, fol: 25 }, { kind: 'racha' }],
  surfista: [{ kind: 'entrega', item: 'essa prancha consertada', to: 'meu amigo', money: 190, fol: 20 }, { kind: 'concha' }],
  salva: [{ kind: 'concha' }, { kind: 'entrega', item: 'esse kit de primeiros socorros', to: 'o outro posto', money: 200, fol: 30 }],
  dj: [{ kind: 'entrega', item: 'esse case de discos', to: 'a festa', money: 230, fol: 60 }],
  corredor: [{ kind: 'entrega', item: 'essa garrafa de água', to: 'minha amiga que tá correndo', money: 150, fol: 15 }],
  piloto: [{ kind: 'heli' }],
};
export const OFFER_TXT = {
  entrega: (f, d) => `Me faz um favor? Leva ${f.item} pra ${f.to} em ${d}? Te pago $${f.money}!`,
  foto: (f, d) => `Você tira uma foto lá em ${d} pra mim? Meu celular morreu 😭 Pago $${f.money}!`,
  racha: () => 'Quer testar esse carro de verdade? Tem racha rolando ali. Te mostro no GPS!',
  concha: () => 'Psiu… vi uma concha neon brilhando por aí. Quer que eu marque no seu GPS?',
  heli: () => 'Quer fazer um voo? Marco o heliponto no seu GPS.',
};

export function periodOf(h) { return h < 5 ? 'madrugada' : h < 12 ? 'manha' : h < 17.4 ? 'tarde' : h < 19.3 ? 'por' : 'noite'; }
// monta o roteiro da conversa (3 a 4 falas), evitando repetir falas recentes
// quando o jogador está fantasiado de herói original de Solara
const HERO_TALK = [
  (c) => `Peraí… você é ${c.hero.label}?! Meu sobrinho é seu fã!`,
  (c) => `Ouvi dizer que ${c.hero.label} ${c.hero.power}. Mostra aí! ✨`,
  (c) => `Herói em Solara e ninguém se machuca? Assim que eu gosto!`,
  (c) => `Essa fantasia de ${c.hero.label} tá melhor que de filme!`,
  (c) => `Posso tirar uma selfie com ${c.hero.label}? 📸`,
];
export function buildScript(per, c, r, recent) {
  const P = PERS[per] || PERS.turista; const used = new Set(recent);
  const ev = (x) => typeof x === 'function' ? x(c) : x;
  const choose = (arr) => { const opts = arr.map(ev).filter(Boolean); const fresh = opts.filter(o => !used.has(o)); const pool = fresh.length ? fresh : opts; if (!pool.length) return null; const o = pickA(r, pool); used.add(o); return o; };
  const lines = [];
  const g = choose(GREET[c.period]) || 'Oi!'; const v = pickA(r, P.vibe); lines.push(`${v} ${/,$/.test(v) ? g.charAt(0).toLowerCase() + g.slice(1) : g}`);
  const own = OWN[per] ? (typeof OWN[per] === 'function' ? OWN[per](c) : OWN[per]) : [];
  const ctx = [c.jet ? choose(JET) : null, c.car && c.car.race || c.nearTrack ? choose(RACE) : null, choose(CAR), choose(MISSION), r() < 0.3 ? choose(HOME) : null, choose(WEATHER[c.weather] || WEATHER.limpo)].filter(Boolean);
  // prioridade: carro (se tem) > missão > clima
  if (c.hero && r() < 0.8) lines.push(choose(HERO_TALK)); else if (ctx.length) lines.push(ctx[0]);
  lines.push(choose(own) || choose(TIPS));
  if (r() < 0.75) lines.push(r() < 0.5 && ctx[1] ? ctx[1] : r() < 0.5 ? choose(DIRS) : choose(TIPS));
  return lines.filter(Boolean).map(l => l.replace(/(\w)o\(a\)/g, (m, ch) => ch + (c.g === 'a' ? 'a' : 'o')));
}

// todas as falas fixas (para gerar as vozes gravadas). Funções são avaliadas com contextos de exemplo.
export function voiceBank() {
  const out = new Set(); const ctxs = ['o', 'a'].map(g => ({ g, am: g === 'a' ? 'amiga' : 'amigo', qa: g === 'a' ? 'querida' : 'querido', period: 'tarde', weather: 'limpo', car: null, mission: null, done: 1, followers: 0, money: 0 }));
  const add = (x) => { for (const c of ctxs) { const t = typeof x === 'function' ? (() => { try { return x(c); } catch (e) { return null; } })() : x; if (t) out.add(t.replace(/(\w)o\(a\)/g, (m, ch) => ch + (c.g === 'a' ? 'a' : 'o'))); } };
  const all = (a) => { if (typeof a === 'function') { for (const c of ctxs) for (const x of a(c)) add(x); } else for (const x of a) add(x); };
  for (const k in GREET) all(GREET[k]); for (const k in WEATHER) all(WEATHER[k]); all(TIPS); for (const k in OWN) all(OWN[k]); for (const k in REACT) all(REACT[k]);
  all(RACE); all(DIRS); all(JET); all(HOME); all(BYE); all(THANKS); all(MISSION.slice(0, 5));
  for (const k in PERS) for (const v of PERS[k].vibe) add(v);
  return [...out];
}
