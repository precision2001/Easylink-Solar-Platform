import json, numpy as np, math
from PIL import Image, ImageDraw
from skimage import measure, exposure
from shapely.geometry import Polygon, Point, LineString
roof=np.load('roofmask.npy')
cs=measure.find_contours(np.pad(roof,1).astype(float),0.5); c=max(cs,key=len)-1
mb=[(float(p[1]),float(p[0])) for p in measure.approximate_polygon(c,2.5)[:-1]]
F=json.load(open('outline_fit.json')); ring=F['ring']
names=['top','east N','step1','east M','proj N','proj E','proj S','east M2','step2','east S','south','west M','junction','west N']
# corner indices: ring[i] is start of edge names[i]
start=ring[2]      # bottom of 'east N' (start of step1)
end=ring[10]       # bottom of 'east S' = SE corner (start of 'south')
def nearest_idx(p): return int(np.argmin([math.hypot(q[0]-p[0],q[1]-p[1]) for q in mb]))
i0,i1=nearest_idx(start),nearest_idx(end)
# walk the mask boundary from i0 to i1 the short way that stays east
n=len(mb)
pathA=[mb[(i0+k)%n] for k in range((i1-i0)%n+1)]
pathB=[mb[(i0-k)%n] for k in range((i0-i1)%n+1)]
east=lambda path: np.mean([p[0] for p in path])
path=pathA if east(pathA)>east(pathB) else pathB
hyb=ring[:2]+[list(start)]+[list(p) for p in path[1:-1]]+[list(end)]+ring[11:]
P=Polygon(hyb).buffer(0)
print('hybrid corners',len(hyb),'valid',Polygon(hyb).is_valid,'area m2',round(P.area*0.031**2,1))
json.dump({'ring':hyb},open('outline_hybrid.json','w'))
im=np.asarray(Image.open('crop32.png').convert('RGB')).astype(float)/255
eq=exposure.equalize_adapthist(im,clip_limit=0.012,kernel_size=48)
x0,y0,x1,y1=340,140,800,800; f=1.5
cimg=Image.fromarray((eq[y0:y1,x0:x1]*255).astype(np.uint8)).resize((int((x1-x0)*f),int((y1-y0)*f)),Image.LANCZOS); d=ImageDraw.Draw(cimg)
o=lambda p:((p[0]-x0)*f,(p[1]-y0)*f)
d.line([o(p) for p in hyb+[hyb[0]]],fill=(255,230,0),width=2)
cimg.save('hyb.png')
