// Gaúchos da orla (t396/t397): quando você passa de carro pela avenida da praia, quem está por perto comenta — elogio ao
// carro e à cidade se você vem devagar, aviso engraçado para cuidar dos pedestres se vem rápido. Expressões gaúchas
// à moda antiga, falas gravadas (Kokoro) com vozes diferentes; intervalo para não virar falação.
const CARRO = [
  'Mas bah, tchê! Que máquina linda!', 'Barbaridade, que carrão, vivente!', 'Mas que tal! Esse possante é tri!', 'Ô loco de especial, que baita carro!',
  'Bah, guri, esse aí é bagual de bom!', 'Capaz! Um carro desses aqui na orla?', 'Índio véio já viu de tudo, mas um carro assim, nunca!', 'Mas bah, esse motor ronca que nem trovão de inverno!',
  'Barbaridade, tchê! Isso aí custou uma baita pila!', 'Que lindeza de carro, vivente! Tri bonito!', 'Bah, que carro faceiro, tchê!', 'Mas que tal esse brilho? Parece prenda em baile!',
  'Ô guria, olha só que máquina passando!', 'Bah, com um carro desses até o chimarrão fica mais gostoso!', 'Capaz que esse carro é teu, tchê? Tri massa!',
];
const CIDADE = [
  'Mas bah, que cidade bonita, tchê! Parece um quadro!', 'Barbaridade, que praia linda, vivente!', 'Bah, esse mar é mais azul que bombacha nova!', 'Mas que tal esse pôr do sol? É de chorar, tchê!',
  'Índio véio aqui nunca viu orla tão faceira!', 'Bah, guri, essa cidade é tri legal pra passear!', 'Capaz que tem lugar mais lindo que esta praia!', 'Mas bah, aqui o vento é bom que nem o minuano, só que quentinho!',
  'Barbaridade, quanta gente feliz nesta orla, tchê!', 'Ô loco de especial, que calçadão bonito!', 'Bah, dá vontade de largar a lida e morar aqui, vivente!', 'Mas que tal esta cidade? Tri bem cuidada!',
  'Bah, tchê, até as palmeiras aqui são bagual!',
];
const AVISO = [
  'Devagar, tchê, que aqui tem gente!', 'Cuidado com os pedestre, vivente!', 'Mas bah, calma aí, guri! Não é carreira de cancha reta!', 'Barbaridade! Vai com calma que a orla não é pista!',
  'Ô vivente, freia esse bagual que tem criança na calçada!', 'Que pechada quase, tchê! Mais devagar!', 'Capaz que tu vai atropelar alguém? Nem pensar, devagarinho!', 'Bah, índio véio aqui quase perdeu o chapéu com esse vento!',
  'Mas que pressa, tchê! O chimarrão nem esfriou!', 'Ô guri, segura as rédea desse possante!', 'Barbaridade, passou que nem pampeiro! Cuidado aí!', 'Devagar com o andor, vivente, que o santo é de barro!',
  'Bah, tchê, aqui se anda a passo, que nem cavalo manso!', 'Mas bah, pisa no freio, que pedestre não tem para-choque!', 'Ô loco, que corrida! Respeita a faixa, guri!', 'Capaz que a gente pula fora a tempo! Vai devagar, tchê!',
];
export const GAUCHO = { carro: CARRO, cidade: CIDADE, aviso: AVISO };
export const GAUCHO_ALL = [...CARRO, ...CIDADE, ...AVISO];

export class Gauchos {
  constructor(G) { this.G = G; this.cool = 4; this.last = ''; this.said = 0; this.byKind = { carro: 0, cidade: 0, aviso: 0 }; this.r = Math.random; }
  zone(x, z) { return x > 270 && x < 350 && z > -620 && z < 640; } // avenida da praia + calçadão
  pick(arr) { let t = arr[Math.floor(this.r() * arr.length)]; if (t === this.last) t = arr[(arr.indexOf(t) + 1) % arr.length]; this.last = t; return t; }
  update(dt) {
    const G = this.G, p = G.player, v = p.vehicle; this.cool -= dt;
    if (this.cool > 0 || !v || v.spec.air || v.spec.boat || G.talk.cur || !this.zone(v.x, v.z)) return;
    const sp = v.speed; if (sp < 3) return;
    const kind = sp > 17 ? 'aviso' : sp < 12 ? (this.r() < 0.55 ? 'carro' : 'cidade') : null; if (!kind) return;
    let who = null, bd = kind === 'aviso' ? 22 : 16; const now = G.t;
    for (const c of G.crowd.peds) { if (c.hidden || c.mode === 'lie' || c.mode === 'sit' && kind === 'aviso') continue; if ((c._gT || -99) > now - 40) continue; const d = Math.hypot(c.x - v.x, c.z - v.z); if (d < bd && d > 2.5) { bd = d; who = c; } }
    if (!who) { this.cool = 0.8; return; }
    who._gT = now; const line = this.pick(GAUCHO[kind]); G.ui.pedBubble(who, line); this.said++; this.byKind[kind]++; this.lastWho = who; this.lastKind = kind;
    if (who.mode !== 'dodge') { who.mode = 'wave'; who.t = 1.8; who.h = Math.atan2(v.x - who.x, v.z - who.z); }
    this.cool = kind === 'aviso' ? 7 + this.r() * 3 : 9 + this.r() * 5;
  }
}
