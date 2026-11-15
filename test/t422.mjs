// t422: auditoria de duplo sentido — nenhuma fala/texto do jogo usa as gírias ambíguas da lista, e toda fala com voz tem mp3.
// Uso: node test/t422.mjs [pasta-do-jogo]
import fs from 'fs'; import path from 'path'; import { fileURLToPath } from 'url';
const ROOT = process.argv[2] || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'); const SRC = ROOT + '/src';
const BAD = /(?<![\p{L}\p{N}])(gostos[ao]s?|del[ií]cia|trenzinho|viajando|peg(a|ar|ue|uei|ou|ando|ada)|com(e|er|endo|eu)|chup\w*|met(e|er|endo|eu)|pau|cacete|rola|bagulho|por tr[aá]s|entra(r)? por|por cima|mandar ver|manda ver|atraso|an[eé]is|anel|pila|traseira|safad\w*|tes[aã]o|gozar|goza|transa\w*|pelad[ao]s?|molhar|vem, vai|bota um|abre um pouquinho|com carinho)(?![\p{L}\p{N}])/iu;
const strs = []; for (const f of fs.readdirSync(SRC).filter(f => f.endsWith('.js'))) { const s = fs.readFileSync(path.join(SRC, f), 'utf8'); const re = /'((?:[^'\\\n]|\\.){4,})'|"((?:[^"\\\n]|\\.){4,})"|`((?:[^`\\]|\\.){4,})`/g; let m;
  while ((m = re.exec(s))) { const t = m[1] || m[2] || m[3]; if (!/[a-zà-ú]{2,} [a-zà-ú]{2,}/i.test(t)) continue; if (/[=;{}]\s|=>|\bpointerId\b|\bconst\b|\bfunction\b|getElementById|querySelector/.test(t) && !/[!?…]/.test(t)) continue; strs.push([f, t]); } }
const hits = strs.filter(([f, t]) => BAD.test(t.replace(/<[^>]+>/g, ' ')));
let fail = 0; const ck = (n, ok, info) => { console.log((ok ? 'ok   ' : 'FAIL ') + n + (info !== undefined ? ' ' + JSON.stringify(info).slice(0, 900) : '')); if (!ok) fail++; };
ck(`nenhum texto com duplo sentido (${strs.length} textos)`, hits.length === 0, hits.map(h => h[0] + ': ' + h[1].slice(0, 90)));
// vozes: todas as falas faladas têm mp3
const norm = (t) => t.toLowerCase().normalize('NFC').replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, '0'); };
const { radioBank } = await import(SRC + '/radiolines.js'); const ri = JSON.parse(fs.readFileSync(ROOT + '/assets/voz/radio/index.json', 'utf8'));
const missR = radioBank().filter(([d, t]) => !(ri.d[d] && ri.d[d][fnv(norm(t))] && fs.existsSync(`${ROOT}/assets/voz/radio/${d}/${fnv(norm(t))}.mp3`)));
ck(`rádio: ${radioBank().length} falas com mp3`, missR.length === 0, missR.slice(0, 5));
const g = fs.readFileSync(SRC + '/gauchos.js', 'utf8'); const ga = []; for (const k of ['CARRO', 'CIDADE', 'AVISO']) ga.push(...eval(g.match(new RegExp('const ' + k + ' = (\\[[\\s\\S]*?\\]);'))[1]));
const vi = JSON.parse(fs.readFileSync(ROOT + '/assets/voz/index.json', 'utf8')); const missG = ga.filter(t => !'fms'.split('').every(v => vi.voices[v][fnv(norm(t))]));
ck(`gaúchos: ${ga.length} falas com mp3 nas 3 vozes`, missG.length === 0, missG.slice(0, 5));
const { voiceBank } = await import(SRC + '/phrases.js'); const vb = voiceBank(); const missV = vb.filter(t => !'fms'.split('').some(v => vi.voices[v][fnv(norm(t))]));
ck(`moradores: ${vb.length} falas com mp3`, missV.length <= 2, missV.slice(0, 5));
console.log(fail ? 'FAIL t422' : 'PASS t422'); process.exit(fail ? 1 : 0);
