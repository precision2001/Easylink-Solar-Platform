#!/usr/bin/env python3
"""Check every eave (outline edge) against where the tiles or sheets end (step 5).

For each face edge that is not shared with another face (an eave), sample
profiles across it every 4 px and find the nearest roof-to-not-roof
transition within +-search px: roof = tile colour (r-g > rg; cream walls and gutters pass r-b, not r-g) or, with
--metal, bright sheet (grey > bright). Reports the median offset per edge in
px and mm (+ = the roof ends outside the line, - = inside: panels would sit
over the gutter or shadow). |offset| <= 100 mm is confirmed.
Usage: check-eaves.py roofs/x.json crop.png [--metal] [--search 25]
"""
import json, sys, math, argparse
import numpy as np
from PIL import Image
from scipy import ndimage as nd
ap = argparse.ArgumentParser(); ap.add_argument("roof"); ap.add_argument("crop")
ap.add_argument("--metal", action="store_true"); ap.add_argument("--search", type=int, default=25)
ap.add_argument("--rg", type=float, default=35); ap.add_argument("--bright", type=float, default=170)
a = ap.parse_args()
R = json.load(open(a.roof)); m = R["scale_m_per_px"]
im = nd.uniform_filter(np.asarray(Image.open(a.crop).convert("RGB")).astype(float), (3, 3, 1))
roof = (im.mean(2) > a.bright) if a.metal else ((im[..., 0] - im[..., 1]) > a.rg)
H, W = roof.shape
edges = {}
for fi, f in enumerate(R["faces"]):
    r = f["ring"]
    for i in range(len(r)):
        p, q = tuple(r[i]), tuple(r[(i + 1) % len(r)])
        k = (min(p, q), max(p, q)); edges.setdefault(k, []).append((fi, p, q))
def centroid(r): return np.mean(np.array(r, float), 0)
for k, uses in edges.items():
    if len(uses) > 1: continue                        # shared: hip, valley, ridge, step
    fi, p, q = uses[0]; p, q = np.array(p, float), np.array(q, float)
    L = np.linalg.norm(q - p)
    if L < 12: continue
    t = (q - p) / L; n = np.array([-t[1], t[0]])
    if np.dot(centroid(R["faces"][fi]["ring"]) - p, n) > 0: n = -n   # n points outward
    offs = []
    for s in np.arange(4, L - 4, 4):
        c = p + t * s; prof = []
        for d in range(-a.search, a.search + 1):
            x, y = (c + n * d).round().astype(int)
            prof.append(roof[y, x] if 0 <= x < W and 0 <= y < H else False)
        prof = np.array(prof)
        # transitions roof -> not roof going outward
        tr = [d for d in range(-a.search, a.search) if prof[d + a.search] and not prof[d + a.search + 1]]
        if tr: offs.append(min(tr, key=abs) + 0.5)
    if not offs: E=f"{tuple(int(v) for v in p)}->{tuple(int(v) for v in q)}"; print(f"{R["faces"][fi]["name"]:20} edge {E}: no clear edge - check on site"); continue
    med = float(np.median(offs)); mm = med * m * 1000
    ok = "confirmed" if abs(mm) <= 100 else ("MOVE IN (roof ends inside the line)" if med < 0 else "MOVE OUT (roof continues outside)")
    E=f"{tuple(int(v) for v in p)}->{tuple(int(v) for v in q)}"; print(f"{R["faces"][fi]["name"]:20} edge {E}: {med:+.1f} px = {mm:+.0f} mm, {len(offs)} samples  {ok}")
