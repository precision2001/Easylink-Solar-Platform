import json, math, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage import measure
r=json.load(open('snapped.json'))   # outline with steps kept (0.35 m runs), snapped to image lines
A=math.radians(28); ua=np.array([math.cos(A),math.sin(A)]); va=np.array([-math.sin(A),math.cos(A)])  # u along 28°, v along 118°
toUV=lambda p:(float(np.dot(p,ua)),float(np.dot(p,va)))
toXY=lambda u,v:(ua*u+va*v).tolist()
ol=[toUV(np.array(p)) for p in r['outline']]
# make the outline orthogonal in (u,v): each edge becomes along-u or along-v (staircase for any diagonal)
orth=[]
n=len(ol)
for i in range(n):
    p,q=ol[i],ol[(i+1)%n]
    du,dv=q[0]-p[0],q[1]-p[1]
    orth.append(p)
    if abs(du)>3 and abs(dv)>3:   # diagonal piece: insert a corner (keep the longer leg first)
        orth.append((q[0],p[1]) if abs(du)>=abs(dv) else (p[0],q[1]))
# snap: consecutive edges alternate; merge collinear
pts=orth
def clean(pts):
    out=[]
    for p in pts:
        if out and abs(out[-1][0]-p[0])<1e-6 and abs(out[-1][1]-p[1])<1e-6: continue
        out.append(p)
    # force exact orthogonality: each edge either same u or same v as its predecessor
    for i in range(1,len(out)):
        p,q=out[i-1],out[i]
        if abs(q[0]-p[0])<abs(q[1]-p[1]): out[i]=(p[0],q[1])
        else: out[i]=(q[0],p[1])
    # close
    p,q=out[-1],out[0]
    if abs(q[0]-p[0])>1e-6 and abs(q[1]-p[1])>1e-6: out.append((q[0],p[1]))
    # drop collinear
    res=[]
    m=len(out)
    for i in range(m):
        a,b,c=out[i-1],out[i],out[(i+1)%m]
        if (abs(a[0]-b[0])<1e-6 and abs(b[0]-c[0])<1e-6) or (abs(a[1]-b[1])<1e-6 and abs(b[1]-c[1])<1e-6): continue
        res.append(b)
    return res
poly=clean(pts)
# orientation
area=sum(poly[i-1][0]*poly[i][1]-poly[i][0]*poly[i-1][1] for i in range(len(poly)))/2
ccw=area>0
edges=[]
for i in range(len(poly)):
    p,q=poly[i],poly[(i+1)%len(poly)]
    if math.hypot(q[0]-p[0],q[1]-p[1])<1: continue
    edges.append((p,q))
print('orthogonal outline corners',len(poly),'edges',len(edges))
# raster in image space
W,H=819,854
ys,xs=np.mgrid[0:H,0:W]
U=xs*ua[0]+ys*ua[1]; V=xs*va[0]+ys*va[1]
im=Image.new('L',(W,H),0); ImageDraw.Draw(im).polygon([tuple(toXY(*p)) for p in poly],fill=1); inside=np.array(im).astype(bool)
best=np.full((H,W),np.inf); lab=np.full((H,W),-1)
for ei,(p,q) in enumerate(edges):
    if abs(q[1]-p[1])<1e-6:   # along u, at v=p[1]
        v0=p[1]; lo,hi=sorted([p[0],q[0]])
        perp=V-v0; ext=np.maximum(0,np.maximum(lo-U,U-hi))
        # interior side: for ccw ring interior is left of p->q
        dirn=np.sign(q[0]-p[0]); side=(perp*dirn)>0 if ccw else (perp*dirn)<0
        d=np.maximum(np.abs(perp),ext)
    else:                      # along v, at u=p[0]
        u0=p[0]; lo,hi=sorted([p[1],q[1]])
        perp=U-u0; ext=np.maximum(0,np.maximum(lo-V,V-hi))
        dirn=np.sign(q[1]-p[1]); side=(perp*dirn)<0 if ccw else (perp*dirn)>0
        d=np.maximum(np.abs(perp),ext)
    m=inside&side&(d<best)
    best[m]=d[m]; lab[m]=ei
# bearing per edge = outward normal direction (compass). u axis = image 28° = bearing 118; v axis = image 118° = bearing 208
def bearing(ei):
    p,q=edges[ei]
    if abs(q[1]-p[1])<1e-6:   # edge along u: normal along ±v
        # interior side sign
        dirn=np.sign(q[0]-p[0]); interior_v=(1 if dirn>0 else -1) if ccw else (-1 if dirn>0 else 1)
        return 208 if interior_v<0 else 28    # outward = -interior
    else:
        dirn=np.sign(q[1]-p[1]); interior_u=(-1 if dirn>0 else 1) if ccw else (1 if dirn>0 else -1)
        return 118 if interior_u<0 else 298
np.save('skel_lab.npy',lab)
pitch={28:32.1,118:30.3,208:32.3,298:28.9}
faces=[]
for ei in range(len(edges)):
    m=lab==ei
    a=m.sum()*0.031**2
    if a<0.5: continue
    cs=measure.find_contours(np.pad(m,1).astype(float),0.5); c=max(cs,key=len)-1
    ap=measure.approximate_polygon(c,1.5); ring=[[float(p[1]),float(p[0])] for p in ap[:-1]]
    b=bearing(ei); faces.append(dict(bearing=b,pitch=pitch[b],areaM2=round(a,1),ring=ring,edge=ei))
out={'outline':[toXY(*p) for p in poly],'faces':faces,'obstructions':r.get('obstructions',[])}
json.dump(out,open('skel.json','w'))
print('faces',len(faces),sorted([(f['bearing'],f['areaM2']) for f in faces],key=lambda x:-x[1]))
img=Image.open('crop32.png').convert('RGB'); d=ImageDraw.Draw(img,'RGBA')
colr={28:(255,150,0,80),118:(0,220,80,80),208:(0,180,255,80),298:(255,0,220,80)}
for f in faces: d.polygon([tuple(p) for p in f['ring']],fill=colr[f['bearing']],outline=(0,255,140,255))
d.line([tuple(p) for p in out['outline']+[out['outline'][0]]],fill=(255,220,0,255),width=3)
img.crop((340,140,800,800)).save('skel.png')
