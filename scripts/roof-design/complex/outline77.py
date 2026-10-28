import json, math, sys, numpy as np
from PIL import Image
from scipy import ndimage as nd
A=math.radians(28)
# corner in (k2 offset, k0 offset): k0 = -sin28 x + cos28 y ; k2 = -sin118 x + cos118 y
def xy(k2,k0):
    M=np.array([[-math.sin(A),math.cos(A)],[-math.sin(A+math.pi/2),math.cos(A+math.pi/2)]])
    return np.linalg.solve(M,[k0,k2]).tolist()
steps=json.loads(sys.argv[1]) if len(sys.argv)>1 else {}
s1=steps.get('s1',7); p0=steps.get('p0',45); p1=steps.get('p1',100); s2=steps.get('s2',235); south=steps.get('south',371); jn=steps.get('jn',145)
E_N=steps.get('eN',-822); E_M=steps.get('eM',-863); E_P=steps.get('eP',-898); E_S=steps.get('eS',-923); W_N=steps.get('wN',-539); W_M=steps.get('wM',-612); TOP=steps.get('top',-94)
uv=[(W_N,TOP),(E_N,TOP),(E_N,s1),(E_M,s1),(E_M,p0),(E_P,p0),(E_P,p1),(E_M,p1),(E_M,s2),(E_S,s2),(E_S,south),(W_M,south),(W_M,jn),(W_N,jn)]
ring=[xy(*p) for p in uv]
json.dump({'ring':ring,'uv':uv},open('outline_manual.json','w'))
img=np.asarray(Image.open('crop32.png').convert('RGB')).astype(float)
L=nd.gaussian_filter(img@[0.299,0.587,0.114],1.5); mpp=0.031
def sm(p): return nd.map_coordinates(L,[[p[1]],[p[0]]],order=1)[0]
def check(a,b,rng=20,half=3):
    a,b=np.array(a),np.array(b); d=(b-a)/np.linalg.norm(b-a); n=np.array([-d[1],d[0]])
    prof=np.abs(np.array([np.mean([sm(a+t*(b-a)+k*n+half*n)-sm(a+t*(b-a)+k*n-half*n) for t in np.linspace(0.2,0.8,15)]) for k in range(-rng,rng+1)]))
    bg=max(np.median(prof),1e-6)
    pk=[i for i in range(1,len(prof)-1) if prof[i]>=prof[i-1] and prof[i]>=prof[i+1] and prof[i]>3*bg]
    if not pk: return None, prof.max()/bg
    i=min(pk,key=lambda k:abs(k-rng)); return (i-rng), prof[i]/bg
names=['top','east N','step1','east M','proj N','proj E','proj S','east M2','step2','east S','south','west M','junction','west N']
for i in range(len(ring)):
    a,b=ring[i],ring[(i+1)%len(ring)]
    if np.hypot(b[0]-a[0],b[1]-a[1])<8: print(f'{names[i]:9s} short'); continue
    o,st=check(a,b)
    print(f"{names[i]:9s} len {np.hypot(b[0]-a[0],b[1]-a[1])*mpp:4.1f} m  offset {"none" if o is None else str(round(o*mpp*1000)):>6} mm  x{st:4.1f}")
