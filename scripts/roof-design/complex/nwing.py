import json, numpy as np
from shapely.geometry import Polygon
from shapely.ops import unary_union
exec(open('lines77.py').read())
R=json.load(open('final.json')); OLP=Polygon(R['outline']).buffer(0); MPP=0.031
NW=X(L['TOP'],L['NWW']); NE=X(L['TOP'],L['C4']); H1=X(L['HIP_NW'],L['HIP_SWn']); SWw=X(L['NWW'],L['HIP_SWn'])
Re=X(L['HIP_NE'],(0,off(0,H1)))
fixed=[dict(bearing=298,pitch=28.9,poly=Polygon([NW,H1,SWw]).intersection(OLP)),
       dict(bearing=28,pitch=32.1,poly=Polygon([NW,NE,Re,H1]).intersection(OLP))]
U=unary_union([f['poly'] for f in fixed])
faces=[]
for f in R['faces']:
    g=Polygon(f['ring']).buffer(0).difference(U)
    if g.is_empty: continue
    parts=[g] if g.geom_type=='Polygon' else list(g.geoms)
    for p in parts:
        if p.area*MPP*MPP>=0.8: faces.append(dict(bearing=f['bearing'],pitch=f['pitch'],poly=p))
faces=fixed+faces
left=OLP.difference(unary_union([f['poly'] for f in faces]))
for p in ([left] if left.geom_type=='Polygon' else list(getattr(left,'geoms',[]))):
    if p.area*MPP*MPP>=1.0:
        # the narrow strip under the north wing faces SSW (height model); anything else joins its biggest neighbour
        faces.append(dict(bearing=208,pitch=32.3,poly=p))
out=[]
for f in faces:
    p=f['poly'].simplify(1.0)
    if p.geom_type!='Polygon': p=max(p.geoms,key=lambda x:x.area)
    out.append(dict(bearing=f['bearing'],pitch=f['pitch'],areaM2=round(p.area*MPP*MPP,1),ring=[list(c) for c in list(p.exterior.coords)[:-1]]))
R['faces']=out
json.dump(R,open('final.json','w'))
print(sorted([(f['bearing'],f['areaM2']) for f in out],key=lambda x:-x[1]))
from PIL import Image, ImageDraw
img=Image.open('crop32.png').convert('RGB'); d=ImageDraw.Draw(img,'RGBA')
colr={28:(255,150,0,80),118:(0,220,80,80),208:(0,180,255,80),298:(255,0,220,80)}
for f in out: d.polygon([tuple(p) for p in f['ring']],fill=colr[f['bearing']],outline=(0,255,140,255))
d.line([tuple(p) for p in R['outline']+[R['outline'][0]]],fill=(255,220,0,255),width=3)
img.crop((340,140,800,800)).save('fhyb2.png')
