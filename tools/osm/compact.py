# Compacta miami.json: coordenadas em unidades de Q m, polilinhas delta-codificadas.
import json,sys,gzip
Q=4
d=json.load(open(sys.argv[1]))
def enc(flat):
    out=[];px=py=0
    for i in range(0,len(flat),2):
        x=round(flat[i]/Q);y=round(flat[i+1]/Q)
        if out and x==px and y==py: continue
        out+= [x-px,y-py];px,py=x,y
    return out
roads=[[c,nm,enc(p)] for c,nm,p in d['roads']]
roads=[r for r in roads if len(r[2])>=4]
def encpoly(polys): return [[enc([v for xy in r for v in xy]) for r in p] for p in polys]
d['q']=Q; d['enc']='delta'
d['roads']=roads
for k in ('water','green','sand'): d[k]=encpoly(d[k])
s=json.dumps(d,ensure_ascii=False,separators=(',',':'))
open(sys.argv[2],'w').write(s)
print(len(s.encode()),'gz',len(gzip.compress(s.encode())))
# v2: nomes indexados, vias agrupadas por classe: R[c] = [[nomeIdx, dx,dy,...], ...]
names=[''];ix={'':0};R=[[],[],[],[],[]]
for c,nm,p in roads:
    if nm not in ix: ix[nm]=len(names);names.append(nm)
    R[c].append([ix[nm]]+p)
d['roads']=R;d['names']=names;d['enc']='delta2'
s=json.dumps(d,ensure_ascii=False,separators=(',',':'))
open(sys.argv[2],'w').write(s)
print('v2',len(s.encode()),'gz',len(gzip.compress(s.encode())))
