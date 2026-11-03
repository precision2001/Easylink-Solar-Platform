import json, numpy as np
from PIL import Image
from scipy import ndimage as nd
r=json.load(open('final.json')); mpp=0.031
img=np.asarray(Image.open('crop32.png').convert('RGB')).astype(float)
L=nd.gaussian_filter(img@[0.299,0.587,0.114],1.5)
def s(p): return nd.map_coordinates(L,[[p[1]],[p[0]]],order=1)[0]
def check(a,b,rng=20,half=3):
    a,b=np.array(a),np.array(b); d=(b-a)/np.linalg.norm(b-a); n=np.array([-d[1],d[0]])
    prof=np.abs(np.array([np.mean([s(a+t*(b-a)+k*n+half*n)-s(a+t*(b-a)+k*n-half*n) for t in np.linspace(0.2,0.8,15)]) for k in range(-rng,rng+1)]))
    bg=max(np.median(prof),1e-6)
    peaks=[i for i in range(1,len(prof)-1) if prof[i]>=prof[i-1] and prof[i]>=prof[i+1] and prof[i]>3*bg]
    if not peaks: return None, float(prof.max()/bg)
    i=min(peaks,key=lambda k:abs(k-rng)); return (i-rng)*mpp, float(prof[i]/bg)
edges={}
def key(p,q): return tuple(sorted([tuple(round(v) for v in p),tuple(round(v) for v in q)]))
for ring,kind in [(r['outline'],'eave')]+[(f['ring'],'face') for f in r['faces']]:
    for i in range(len(ring)):
        p,q=ring[i],ring[(i+1)%len(ring)]
        if np.hypot(q[0]-p[0],q[1]-p[1])*mpp<0.6: continue
        k=key(p,q)
        if k in edges: continue
        edges[k]=(p,q,kind)
# an edge lying on the outline counts as an eave
out=[]
for k,(p,q,kind) in edges.items():
    o,st=check(p,q)
    ok = o is not None and abs(o)<=0.1
    out.append(dict(a=p,b=q,kind=kind,off=o,strength=round(st,1),ok=ok))
n=len(out); c=sum(e['ok'] for e in out)
print(f"lines {n}: confirmed within ±100 mm {c}; ", 'eaves ok', sum(e['ok'] for e in out if e['kind']=='eave'),'/',sum(1 for e in out if e['kind']=='eave'))
for e in out:
    if not e['ok']: print('  not confirmed', e['kind'], [round(v) for v in e['a']], [round(v) for v in e['b']], 'off', None if e['off'] is None else round(e['off'],2), 'x', e['strength'])
json.dump(out,open('checks.json','w'))
