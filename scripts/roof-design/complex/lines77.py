import math, numpy as np
dirs=[math.radians(28+45*k) for k in range(4)]
def off(k,p): d=dirs[k]; return -math.sin(d)*p[0]+math.cos(d)*p[1]
def X(l1,l2):
    (k1,c1),(k2,c2)=l1,l2
    A=np.array([[-math.sin(dirs[k1]),math.cos(dirs[k1])],[-math.sin(dirs[k2]),math.cos(dirs[k2])]])
    return [round(v,1) for v in np.linalg.solve(A,[c1,c2])]
L=dict(TOP=(0,-94),NWW=(2,-539),MW=(2,-612),SOUTH=(0,402),HIP_NW=(1,-451),HIP_NE=(3,-515),HIP_SWn=(3,-485),VALLEY=(3,-530),SWHIP=(3,-695),C4=(2,-822),C5=(2,-863),C6=(2,-923),B3=(1,-348),B2=(1,-388))
