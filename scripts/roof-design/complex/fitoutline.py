import json, math, numpy as np, subprocess
exec(open('outline77.py').read().split("names=[")[0].replace("steps=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}","steps={}"))
params=dict(s1=7,p0=45,p1=100,s2=235,south=371,jn=145,eN=-822,eM=-863,eM2=-863,eP=-898,eS=-923,wN=-539,wM=-612,top=-94)
edge_param=['top','eN','s1','eM','p0','eP','p1','eM2','s2','eS','south','wM','jn','wN']
def build(pr):
    uv=[(pr['wN'],pr['top']),(pr['eN'],pr['top']),(pr['eN'],pr['s1']),(pr['eM'],pr['s1']),(pr['eM'],pr['p0']),(pr['eP'],pr['p0']),(pr['eP'],pr['p1']),(pr['eM2'],pr['p1']),(pr['eM2'],pr['s2']),(pr['eS'],pr['s2']),(pr['eS'],pr['south']),(pr['wM'],pr['south']),(pr['wM'],pr['jn']),(pr['wN'],pr['jn'])]
    return [xy(*p) for p in uv]
def normal_shift(ring,i,ring2):
    a,b=np.array(ring[i]),np.array(ring[(i+1)%len(ring)]); d=(b-a)/np.linalg.norm(b-a); n=np.array([-d[1],d[0]])
    a2=np.array(ring2[i]); return float(np.dot(a2-a,n))
for it in range(4):
    ring=build(params); changed=False
    for i,pn in enumerate(edge_param):
        a,b=ring[i],ring[(i+1)%len(ring)]
        if np.hypot(b[0]-a[0],b[1]-a[1])<8: continue
        o,st=check(a,b)
        if o is None or st<4 or abs(o)*mpp<=0.08: continue
        p2=dict(params); p2[pn]+=1; s=normal_shift(ring,i,build(p2))   # px of normal shift per unit of param
        if abs(s)<1e-6: continue
        params[pn]+=o/s*0.9; changed=True
    if not changed: break
ring=build(params)
print({k:round(v,1) for k,v in params.items()})
names=['top','east N','step1','east M','proj N','proj E','proj S','east M2','step2','east S','south','west M','junction','west N']
for i in range(len(ring)):
    a,b=ring[i],ring[(i+1)%len(ring)]
    if np.hypot(b[0]-a[0],b[1]-a[1])<8: print(f'{names[i]:9s} short'); continue
    o,st=check(a,b); print(f"{names[i]:9s} offset {'none' if o is None else round(o*mpp*1000):>6} mm  x{st:4.1f}")
json.dump({'ring':ring,'params':params},open('outline_fit.json','w'))
