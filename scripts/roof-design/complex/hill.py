import numpy as np, math, tifffile
from PIL import Image
from scipy import ndimage as nd
z=tifffile.imread('dsm.tif').astype(float); ox,oy,rx,ry=319625.5,6252377.5,0.5,0.5
A=6378137; F=1/298.257223563; K0=0.9996; E2=F*(2-F); EP2=E2/(1-E2)
def utm(lat,lng):
    phi=math.radians(lat); lam=math.radians(lng)-math.radians(153)
    N=A/math.sqrt(1-E2*math.sin(phi)**2); T=math.tan(phi)**2; C=EP2*math.cos(phi)**2; Aa=math.cos(phi)*lam
    e4=E2*E2; e6=e4*E2
    Mm=A*((1-E2/4-3*e4/64-5*e6/256)*phi-(3*E2/8+3*e4/32+45*e6/1024)*math.sin(2*phi)+(15*e4/256+45*e6/1024)*math.sin(4*phi)-(35*e6/3072)*math.sin(6*phi))
    e=K0*N*(Aa+(1-T+C)*Aa**3/6+(5-18*T+T*T+72*C-58*EP2)*Aa**5/120)+500000
    n=K0*(Mm+N*math.tan(phi)*(Aa*Aa/2+(5-T+9*C+4*C*C)*Aa**4/24+(61-58*T+T*T+600*C-330*EP2)*Aa**6/720))+10000000
    return e,n
lat0,lng0=-33.8537285,151.0505456; mpp=0.030995156885054814
e0,n0=utm(lat0,lng0)
W,H=819,854; X0,Y0=156,190
ys,xs=np.mgrid[0:H,0:W]
de=(xs+X0-640)*mpp; dn=-(ys+Y0-640)*mpp
cols=(e0+de-ox)/rx-0.5; rows=(oy-(n0+dn))/ry-0.5
zz=nd.map_coordinates(z,[rows,cols],order=1)
ground=np.percentile(z,10)
zs=nd.gaussian_filter(zz,5)
gy,gx=np.gradient(zs)
gxm=gx/mpp; gym=-gy/mpp  # east, north gradients
slope=np.degrees(np.arctan(np.hypot(gxm,gym)))
aspect=(np.degrees(np.arctan2(-gxm,-gym))+360)%360  # downslope compass
# colour by facing direction for pitched roof pixels
rel=zz-ground
hue=aspect/360.0
import colorsys
rgb=np.zeros((H,W,3))
m=(rel>2)&(slope>12)&(slope<55)
hsv=np.stack([hue,np.full_like(hue,0.85),np.full_like(hue,0.95)],-1)
from matplotlib.colors import hsv_to_rgb
rgb=hsv_to_rgb(hsv)
img=np.asarray(Image.open('crop32.png').convert('RGB')).astype(float)/255
out=img.copy(); out[m]=0.5*img[m]+0.5*rgb[m]
fl=(rel>2)&(slope<=12); out[fl]=0.6*img[fl]+0.4*np.array([1,1,1])
Image.fromarray((out*255).astype(np.uint8)).crop((340,140,800,800)).resize((690,990)).save('hill.png')
np.save('zz.npy',zz); np.save('asp.npy',aspect); np.save('slope.npy',slope)
print('ground',ground)
