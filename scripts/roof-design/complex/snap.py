import numpy as np, json, math
from skimage import measure
from scipy import ndimage as nd
P=json.load(open('polys.json')); hough=json.load(open('hough.json'))
AX=math.radians(28); MPP=0.031
dirs=[AX+k*math.pi/4 for k in range(4)]
def cls_of(ang):
    best=None
    for k,d in enumerate(dirs):
        diff=abs(math.atan2(math.sin(2*(ang-d)),math.cos(2*(ang-d))))/2
        if best is None or diff<best[1]: best=(k,diff)
    return best
def off(k,p):  # signed offset of point p from line direction k through origin
    d=dirs[k]; return -math.sin(d)*p[0]+math.cos(d)*p[1]
def along(k,p):
    d=dirs[k]; return math.cos(d)*p[0]+math.sin(d)*p[1]
H=[]
for k,a,b,c,dd in hough:
    p,q=(a,b),(c,dd); H.append((k,(off(k,p)+off(k,q))/2,min(along(k,p),along(k,q)),max(along(k,p),along(k,q))))
def runs_of(ring, minrun=0.8):
    rs=[]
    n=len(ring)
    for i in range(n):
        p,q=ring[i],ring[(i+1)%n]; L=math.hypot(q[0]-p[0],q[1]-p[1])
        if L<1e-6: continue
        k,diff=cls_of(math.atan2(q[1]-p[1],q[0]-p[0]))
        m=((p[0]+q[0])/2,(p[1]+q[1])/2)
        rs.append(dict(k=k,c=off(k,m),L=L,t0=min(along(k,p),along(k,q)),t1=max(along(k,p),along(k,q))))
    # merge consecutive same class
    def merge(rs):
        out=[]
        for r in rs:
            if out and out[-1]['k']==r['k']:
                o=out[-1]; L=o['L']+r['L']; o['c']=(o['c']*o['L']+r['c']*r['L'])/L; o['L']=L; o['t0']=min(o['t0'],r['t0']); o['t1']=max(o['t1'],r['t1'])
            else: out.append(dict(r))
        if len(out)>1 and out[0]['k']==out[-1]['k']:
            o=out.pop(); f=out[0]; L=o['L']+f['L']; f['c']=(o['c']*o['L']+f['c']*f['L'])/L; f['L']=L; f['t0']=min(o['t0'],f['t0']); f['t1']=max(o['t1'],f['t1'])
        return out
    rs=merge(rs)
    # drop short runs (trace noise) shortest first
    while len(rs)>3:
        i=min(range(len(rs)),key=lambda j:rs[j]['L'])
        if rs[i]['L']>=minrun/MPP: break
        rs.pop(i); rs=merge(rs)
    return rs
def snap(rs):
    out=[]
    for r in rs:
        cand=[(abs(h[1]-r['c']),h) for h in H if h[0]==r['k'] and abs(h[1]-r['c'])<=15 and min(h[3],r['t1'])-max(h[2],r['t0'])>=0.3*min(h[3]-h[2],r['t1']-r['t0'])]
        if cand:
            ws=[(h[3]-h[2]) for _,h in cand]; c=sum(h[1]*w for (_,h),w in zip(cand,ws))/sum(ws)
            r=dict(r,c=c,snapped=True)
        else: r=dict(r,snapped=False)
        out.append(r)
    return out
def corners(rs):
    pts=[]
    for i in range(len(rs)):
        a,b=rs[i-1],rs[i]
        da,db=dirs[a['k']],dirs[b['k']]
        # solve -sin(d)x+cos(d)y=c for both
        A=np.array([[-math.sin(da),math.cos(da)],[-math.sin(db),math.cos(db)]])
        if abs(np.linalg.det(A))<1e-6: return None
        pts.append(np.linalg.solve(A,[a['c'],b['c']]).tolist())
    return pts
res={'outline':None,'faces':[],'lines':[]}
o=snap(runs_of(P['outline'],0.35)); res['outline']=corners(o); res['lines']+= [dict(k=r['k'],c=r['c'],snapped=r['snapped'],eave=True) for r in o]
for f in P['faces']:
    rs=snap(runs_of(f['ring'])); c=corners(rs)
    if c is None or len(c)<3: continue
    res['faces'].append(dict(bearing=f['bearing'],pitch=f['pitch'],ring=c,snapped=[r['snapped'] for r in rs]))
# share corners: merge points within 0.35 m
allp=[('o',i) for i in range(len(res['outline']))]+[(fi,i) for fi,f in enumerate(res['faces']) for i in range(len(f['ring']))]
get=lambda t: res['outline'][t[1]] if t[0]=='o' else res['faces'][t[0]]['ring'][t[1]]
groups=[]
for t in allp:
    p=get(t)
    for g in groups:
        q=g['p']
        if math.hypot(p[0]-q[0],p[1]-q[1])<=0.35/MPP: g['m'].append(t); break
    else: groups.append({'p':p,'m':[t]})
for g in groups:
    # outline corners win
    oc=[get(t) for t in g['m'] if t[0]=='o']
    p=oc[0] if oc else [sum(get(t)[0] for t in g['m'])/len(g['m']),sum(get(t)[1] for t in g['m'])/len(g['m'])]
    for t in g['m']:
        if t[0]=='o': res['outline'][t[1]]=p
        else: res['faces'][t[0]]['ring'][t[1]]=p
res['obstructions']=P.get('obstructions',[])
json.dump(res,open('snapped.json','w'))
print('outline corners',len(res['outline']),'faces',len(res['faces']),'snapped share',sum(sum(f['snapped']) for f in res['faces']),'/',sum(len(f['snapped']) for f in res['faces']))
