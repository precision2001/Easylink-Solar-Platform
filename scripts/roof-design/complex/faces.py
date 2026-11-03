import numpy as np, json, math
from PIL import Image, ImageDraw
from scipy import ndimage as nd
from skimage import measure, morphology
W,H=819,854; X0,Y0=156,190
d=json.load(open('outline.json'))
full=(np.frombuffer(d['mask'].encode(),dtype=np.uint8)-48).reshape(d['h'],d['w']).astype(bool)
colour=full[Y0:Y0+H,X0:X0+W]
zz=np.load('zz.npy'); asp=np.load('asp.npy'); slope=np.load('slope.npy')
ground=np.percentile(zz,25)
pitched=(zz-ground>2.2)&(slope>12)&(slope<55)
pitched=morphology.binary_opening(pitched,morphology.disk(6))
# keep the pitched component(s) overlapping Google's main segments (pin ~ (484,450) crop)
lab,n=nd.label(pitched); keep=lab==lab[492,481]
roof=colour&morphology.binary_dilation(keep,morphology.disk(20))
roof=morphology.binary_opening(roof,morphology.disk(5)); roof=nd.binary_fill_holes(roof)
lab,n=nd.label(roof); roof=lab==lab[492,481]
mpp=0.030995
print('roof m2',round(roof.sum()*mpp*mpp,1))
# face classes by downslope azimuth (walls: image 28° -> bearings 28,118,208,298)
bear=np.array([28,118,208,298])
diff=np.abs(((asp[...,None]-bear+180)%360)-180)
cls=np.argmin(diff,-1).astype(int)
cls[~roof]=-1
# majority smoothing
for _ in range(3):
    votes=np.stack([nd.uniform_filter((cls==k).astype(float),15) for k in range(4)],-1)
    c2=np.argmax(votes,-1); c2[~roof]=-1; cls=c2
faces=[]
for k in range(4):
    lab,n=nd.label(cls==k)
    for i in range(1,n+1):
        m=lab==i; a=m.sum()*mpp*mpp
        if a<1.5: continue
        faces.append((k,a,m))
print([(int(bear[k]),round(a,1)) for k,a,_ in faces])
np.save('roofmask.npy',roof); np.save('cls.npy',cls)
img=np.asarray(Image.open('crop32.png').convert('RGB')).astype(float)
cols=np.array([[255,150,0],[0,220,80],[0,180,255],[255,0,220]],float)
out=img.copy()
for k,a,m in faces: out[m]=0.55*img[m]+0.45*cols[k]
b=roof^morphology.binary_erosion(roof,morphology.disk(2)); out[b]=[255,255,0]
Image.fromarray(out.astype(np.uint8)).crop((340,140,800,800)).save('faces.png')
