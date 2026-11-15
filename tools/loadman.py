#!/usr/bin/env python3
# t428: lista os módulos que o jogo baixa antes de abrir (grafo estático de imports a partir de src/flyover.js) com o tamanho
# de cada um, para a barra de progresso real. Rode depois de mudar imports/arquivos: python3 tools/loadman.py
import os, re, json, sys
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
imap = {'three': 'vendor/three/three.module.min.js'}
pat = re.compile(r"""(?:^|[;\s])import\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|import\(\s*['"](\./main\.js)['"]\s*\)""", re.M)
seen, order = set(), []
def res(spec, base):
    if spec in imap: return imap[spec]
    if spec.startswith('three/addons/'): return 'vendor/three/addons/' + spec[len('three/addons/'):]
    return os.path.normpath(os.path.join(os.path.dirname(base), spec))
def walk(f):
    if f in seen: return
    seen.add(f); order.append(f)
    if not f.endswith('.js') or f.startswith('vendor/three/three'): return
    src = open(os.path.join(root, f), encoding='utf-8').read()
    for m in pat.finditer(src):
        spec = m.group(1) or m.group(2)
        if spec: walk(res(spec, f))
walk('src/flyover.js')
files = [[f, os.path.getsize(os.path.join(root, f))] for f in order]
total = sum(b for _, b in files)
out = '// gerado por tools/loadman.py (t428) — não editar à mão\nexport const LOADMAN = ' + json.dumps({'total': total, 'files': files}, separators=(',', ':')) + ';\n'
open(os.path.join(root, 'src/loadman.js'), 'w').write(out)
print(len(files), 'arquivos', total, 'bytes')
