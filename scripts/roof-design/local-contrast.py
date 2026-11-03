#!/usr/bin/env python3
# Local-contrast view of a roof crop (image minus its 6 px blur, x5) with a labelled grid.
# Shows section edges and steps on white or grey metal roofs (66 Frances St).
# Usage (in the folder with crop.png): local-contrast.py x0 y0 x1 y1 scale out.png
import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
x0,y0,x1,y1=map(int,sys.argv[1:5]); s=float(sys.argv[5]); out=sys.argv[6]
a=np.asarray(Image.open('crop.png').convert('L')).astype(float)
hp=a-nd.gaussian_filter(a,6); v=np.clip(128+hp*5,0,255)
im=Image.fromarray(v.astype(np.uint8)).convert('RGB').crop((x0,y0,x1,y1)).resize((int((x1-x0)*s),int((y1-y0)*s)),Image.LANCZOS)
d=ImageDraw.Draw(im)
for x in range((x0//10+1)*10,x1,10):
  X=(x-x0)*s; d.line([(X,0),(X,im.height)],fill=(0,90,90) if x%50 else (0,200,200))
  if x%50==0: d.text((X+2,2),str(x),fill=(255,0,0))
for y in range((y0//10+1)*10,y1,10):
  Y=(y-y0)*s; d.line([(0,Y),(im.width,Y)],fill=(0,90,90) if y%50 else (0,200,200))
  if y%50==0: d.text((2,Y+2),str(y),fill=(255,0,0))
im.save(out)
