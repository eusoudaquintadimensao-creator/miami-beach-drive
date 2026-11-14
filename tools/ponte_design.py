import math, json, sys, bisect
A=float(sys.argv[1]) if len(sys.argv)>1 else 70; LAM=float(sys.argv[2]) if len(sys.argv)>2 else 400
def wig(x0,z0,z1,amp,lam,step=50,taper=160,keep=None,ph=0):
    out=[]; n=int(abs(z1-z0)/step); sg=1 if z1>z0 else -1
    for k in range(n+1):
        z=z0+sg*k*abs(z1-z0)/n; u=abs(z-z0); w=abs(z1-z0)
        env=min(1,u/taper,(w-u)/taper)
        if keep and keep[0]<z<keep[1]: env=0
        if keep:
            dk=min(abs(z-keep[0]),abs(z-keep[1]))
            if not (keep[0]<z<keep[1]) and dk<taper: env=min(env,dk/taper)
        out.append((round(x0+amp*env*math.sin(2*math.pi*z/lam+ph),1),round(z,1)))
    return out
P=[]
P+= wig(515,700,-900,A*0.5,LAM,keep=(560,900))           # A norte (oeste)
P+= [(530,-960),(548,-1012),(590,-1022),(615,-985),(640,-900)]
P+= wig(790,-820,900,A,LAM)                            # B sul
P+= [(812,940),(838,975),(878,985),(902,945),(925,880)]
P+= wig(1060,820,-880,A,LAM)                           # C norte
P+= [(1092,-935),(1118,-1005),(1158,-1012),(1185,-975),(1210,-900)]
P+= wig(1350,-820,960,A,LAM)                           # D sul
P+= [(1340,1010),(1300,1070)]
# retorno oeste com S suaves em z
for x in range(1220,620,-50): P.append((x, round(1095+28*math.sin(2*math.pi*x/300),1)))
P+= [(570,1060),(535,975),(518,880)]
# dedupe near points
Q=[]
for p in P:
    if not Q or math.hypot(p[0]-Q[-1][0],p[1]-Q[-1][1])>20: Q.append(p)
P=Q
def cr(p0,p1,p2,p3,n,alpha=0.5):
    def tj(ti,a,b): return ti+max(1e-6,math.hypot(b[0]-a[0],b[1]-a[1]))**alpha
    t0=0;t1=tj(t0,p0,p1);t2=tj(t1,p1,p2);t3=tj(t2,p2,p3);out=[]
    for k in range(n):
        t=t1+(t2-t1)*k/n
        def L(a,b,ta,tb): return tuple(((tb-t)*a[i]+(t-ta)*b[i])/(tb-ta) for i in range(2))
        A1=L(p0,p1,t0,t1);A2=L(p1,p2,t1,t2);A3=L(p2,p3,t2,t3);B1=L(A1,A2,t0,t2);B2=L(A2,A3,t1,t3);out.append(L(B1,B2,t1,t2))
    return out
N=len(P);pts=[]
for i in range(N): pts+=cr(P[i-1],P[i],P[(i+1)%N],P[(i+2)%N],30)
cum=[0]
for i in range(1,len(pts)+1): cum.append(cum[-1]+math.hypot(pts[i%len(pts)][0]-pts[i-1][0],pts[i%len(pts)][1]-pts[i-1][1]))
L=cum[-1];DS=3;M=int(L/DS);R=[]
for k in range(M):
    s=k*L/M;i=bisect.bisect_right(cum,s)-1;a=pts[i];b=pts[(i+1)%len(pts)];f=(s-cum[i])/max(1e-9,cum[i+1]-cum[i]);R.append((a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f))
ds=L/M; H=[math.atan2(R[(i+1)%M][0]-R[i-1][0],R[(i+1)%M][1]-R[i-1][1]) for i in range(M)]
def ad(a,b):
    d=(b-a)%(2*math.pi)
    return d-2*math.pi if d>math.pi else d
raw=[abs(ad(H[i-2],H[(i+2)%M]))/(4*ds) for i in range(M)]
kap=[sum(raw[(i+k)%M] for k in range(-5,6))/11 for i in range(M)]
minr=min(1/max(k,1e-9) for k in kap)
def est(cruise,lat):
    t=0
    for i in range(M):
        vm=cruise
        for d in range(0,61,6):
            k=kap[(i+d//DS)%M]
            if k>1e-4: vm=min(vm,math.sqrt(lat/k+2*7*d))
        t+=ds/max(9,vm)
    return t
win=int(150/ds);minc=1e9
for i in range(0,M,3):
    for j in range(i+win,M,3):
        if M-(j-i)<=win: continue
        dd=math.hypot(R[i][0]-R[j][0],R[i][1]-R[j][1])
        if dd<minc:minc=dd;cw=(R[i],R[j])
print("pts",len(P),"L=%.0f minR=%.1f clear=%.1f at %s"%(L,minr,minc,cw), "x",round(min(p[0] for p in R)),round(max(p[0] for p in R)),"z",round(min(p[1] for p in R)),round(max(p[1] for p in R)))
for c,l in [(24,8.5),(22,7),(21,6.5),(20,6)]: print(" est cruise",c,"lat",l,"-> %.0f s (%.1f min)"%(est(c,l),est(c,l)/60))
json.dump(P,open('/workspace/ponte/pts2.json','w'))
