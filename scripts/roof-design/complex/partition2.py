import numpy as np, json, math
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage import measure
exec(open('snap.py').read().split("res={'outline':None")[0])
r=json.load(open('snapped.json')); cls=np.load('cls.npy')
W,Hh=819,854; MPP=0.031
def raster(poly):
    im=Image.new('L',(W,Hh),0); ImageDraw.Draw(im).polygon([tuple(p) for p in poly],fill=1); return np.array(im).astype(bool)
inside=raster(r['outline'])
cl=[]
for k,c,t0,t1 in sorted(H):
    for g in cl:
        if g['k']==k and abs(g['c']-c)<=6:
            L=t1-t0; g['c']=(g['c']*g['L']+c*L)/(g['L']+L); g['L']+=L; g['t0']=min(g['t0'],t0); g['t1']=max(g['t1'],t1); break
    else: cl.append(dict(k=k,c=c,L=t1-t0,t0=t0,t1=t1))
def pt(k,c,t):
    d=dirs[k]; return (math.cos(d)*t-math.sin(d)*c, math.sin(d)*t+math.cos(d)*c)
bar=Image.new('L',(W,Hh),0); d=ImageDraw.Draw(bar)
ext=0.4/MPP
for g in cl:
    if g['L']<40: continue
    d.line([pt(g['k'],g['c'],g['t0']-ext),pt(g['k'],g['c'],g['t1']+ext)],fill=1,width=3)
bar=np.array(bar).astype(bool)&inside
lab,n=nd.label(inside&~bar)
regions=np.full((Hh,W),-1)
rid=0
for i in range(1,n+1):
    m=lab==i
    if m.sum()*MPP*MPP<0.4: continue
    v=cls[m]; v=v[v>=0]
    if v.size==0: continue
    hist=np.bincount(v,minlength=4)
    # split a cell only where the height model clearly shows two faces
    ks=[k for k in range(4) if hist[k]*MPP*MPP>=2.0]
    if len(ks)<=1:
        regions[m]=rid; rid+=1
    else:
        for k in ks:
            sub=m&(cls==k)
            l2,n2=nd.label(sub)
            for j in range(1,n2+1):
                if (l2==j).sum()*MPP*MPP>=1.0: regions[l2==j]=rid; rid+=1
# assign leftover inside pixels to nearest region
idx=nd.distance_transform_edt(regions<0,return_distances=False,return_indices=True)
regions=np.where(inside,regions[idx[0],idx[1]],-1)
bear=[28,118,208,298]; pitch={28:32.1,118:30.3,208:32.3,298:28.9}
faces=[]
for k in range(rid):
    m=regions==k
    if m.sum()*MPP*MPP<1.0: continue
    v=cls[m]; v=v[v>=0]; c=int(np.bincount(v,minlength=4).argmax()) if v.size else 0
    cs=measure.find_contours(np.pad(m,1).astype(float),0.5); cc=max(cs,key=len)-1
    ap=measure.approximate_polygon(cc,2.5); ring=[[float(p[1]),float(p[0])] for p in ap[:-1]]
    rs=snap(runs_of(ring)); cn=corners(rs)
    if cn and len(cn)>=3: faces.append(dict(bearing=bear[c],pitch=pitch[bear[c]],areaM2=round(m.sum()*MPP*MPP,1),ring=cn,snapped=[x['snapped'] for x in rs]))
# merge adjacent same-bearing faces whose shared boundary is not an image line
json.dump({'outline':r['outline'],'faces':faces,'obstructions':r.get('obstructions',[])},open('part2.json','w'))
print(len(faces),[(f['bearing'],f['areaM2']) for f in faces])
im=Image.open('crop32.png').convert('RGB'); dd=ImageDraw.Draw(im,'RGBA')
colr={28:(255,150,0,90),118:(0,220,80,90),208:(0,180,255,90),298:(255,0,220,90)}
for f in faces: dd.polygon([tuple(p) for p in f['ring']],fill=colr[f['bearing']],outline=(0,255,140,255))
dd.line([tuple(p) for p in r['outline']+[r['outline'][0]]],fill=(255,220,0,255),width=3)
im.crop((340,140,800,800)).save('part2.png')
