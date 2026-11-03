import numpy as np, json, math
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage import measure
from shapely.geometry import Polygon
from shapely.ops import unary_union
exec(open('snap.py').read().split("res={'outline':None")[0])
exec(open('lines77.py').read())
P=json.load(open('part2.json')); OL=json.load(open('outline_hybrid.json'))['ring']
W,Hh=819,854; MPP=0.031
def raster(poly):
    im=Image.new('L',(W,Hh),0); ImageDraw.Draw(im).polygon([tuple(p) for p in poly],fill=1); return np.array(im).astype(bool)
inside=raster(OL); OLP=Polygon(OL).buffer(0)
lab=np.full((Hh,W),-1)
for i in sorted(range(len(P['faces'])),key=lambda i:-P['faces'][i]['areaM2']): lab[raster(P['faces'][i]['ring'])&inside]=i
idx=nd.distance_transform_edt(lab<0,return_distances=False,return_indices=True)
lab=np.where(inside,lab[idx[0],idx[1]],-1)
faces=[]
for i,f in enumerate(P['faces']):
    m=nd.binary_opening(lab==i,iterations=2); l2,n2=nd.label(m)
    if n2==0: continue
    m=l2==(np.argmax(nd.sum(m,l2,range(1,n2+1)))+1)
    if m.sum()*MPP*MPP<1.0: continue
    cs=measure.find_contours(np.pad(m,1).astype(float),0.5); cc=max(cs,key=len)-1
    ring=[[float(p[1]),float(p[0])] for p in measure.approximate_polygon(cc,2.5)[:-1]]
    rs=snap(runs_of(ring)); cn=corners(rs)
    if not cn or len(cn)<3: continue
    g=Polygon(cn).buffer(0).intersection(OLP)
    if g.is_empty: continue
    if g.geom_type!='Polygon': g=max(g.geoms,key=lambda x:x.area)
    faces.append(dict(bearing=f['bearing'],pitch=f['pitch'],ring=[list(p) for p in list(g.exterior.coords)[:-1]]))
# north wing west face from its lines
NW=X(L['TOP'],L['NWW']); HP=X(L['HIP_NW'],L['HIP_SWn']); SWw=X(L['NWW'],L['HIP_SWn'])
tri=Polygon([NW,HP,SWw]).intersection(OLP)
faces=[f for f in faces if not (f['bearing']==298 and Polygon(f['ring']).centroid.y<360)]
faces.append(dict(bearing=298,pitch=28.9,ring=[list(p) for p in list(tri.exterior.coords)[:-1]]))
# remove overlaps: later/smaller faces win; then merge touching same-bearing
polys=[Polygon(f['ring']).buffer(0) for f in faces]
order=sorted(range(len(faces)),key=lambda i:polys[i].area)
taken=Polygon()
clean=[None]*len(faces)
for i in order:
    g=polys[i].difference(taken)
    if g.is_empty: continue
    if g.geom_type!='Polygon': g=max(g.geoms,key=lambda x:x.area)
    clean[i]=g; taken=taken.union(polys[i])
faces=[dict(f,ring=[list(p) for p in list(g.simplify(1.0).exterior.coords)[:-1]]) for f,g in zip(faces,clean) if g is not None and g.area*MPP*MPP>=0.8]
merged=True
while merged:
    merged=False
    for i in range(len(faces)):
        for j in range(i+1,len(faces)):
            if faces[i]['bearing']!=faces[j]['bearing']: continue
            A,B=Polygon(faces[i]['ring']).buffer(0),Polygon(faces[j]['ring']).buffer(0)
            if A.buffer(2).intersection(B.buffer(2)).area>60:
                u=unary_union([A.buffer(1.5),B.buffer(1.5)]).buffer(-1.5).simplify(1.5)
                if u.geom_type=='Polygon': faces[i]['ring']=[list(p) for p in list(u.exterior.coords)[:-1]]; del faces[j]; merged=True; break
        if merged: break
for f in faces: f['areaM2']=round(Polygon(f['ring']).area*MPP*MPP,1)
json.dump({'outline':OL,'faces':faces,'obstructions':P.get('obstructions',[])},open('final.json','w'))
print(len(faces),sorted([(f['bearing'],f['areaM2']) for f in faces],key=lambda x:-x[1]),'total',round(sum(f['areaM2'] for f in faces),1),'outline',round(OLP.area*MPP*MPP,1))
img=Image.open('crop32.png').convert('RGB'); d=ImageDraw.Draw(img,'RGBA')
colr={28:(255,150,0,80),118:(0,220,80,80),208:(0,180,255,80),298:(255,0,220,80)}
for f in faces: d.polygon([tuple(p) for p in f['ring']],fill=colr[f['bearing']],outline=(0,255,140,255))
d.line([tuple(p) for p in OL+[OL[0]]],fill=(255,220,0,255),width=3)
img.crop((340,140,800,800)).save('fhyb.png')
