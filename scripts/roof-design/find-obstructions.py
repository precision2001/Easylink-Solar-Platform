#!/usr/bin/env python3
"""Find candidate obstructions and level differences inside the faces (step 6).

Vents, whirlybirds (circulating fans), antennas and flues show as small dark
spots; level differences (steps) show as thin dark lines, often ending part
way across a face. Both were missed on 66 Frances St when read by eye, so
every roof gets this check. Candidates are only for review: confirm each on
the close-up, then add it to the roof json as an obstruction (spot) or a step
(line), never delete panels afterwards.

Usage: find-obstructions.py roofs/x.json crop.png out.png [--thr 18]
Prints each candidate (kind, centre px, size) and draws them: spots in
magenta circles, lines in cyan. Ones already covered by an obstruction are
drawn grey.
"""
import json, sys, math, argparse
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd

ap = argparse.ArgumentParser()
ap.add_argument("roof"); ap.add_argument("crop"); ap.add_argument("out")
ap.add_argument("--thr", type=float, default=18, help="darkness below the local mean (grey levels)")
ap.add_argument("--edge", type=float, default=5, help="ignore within this many px of a face edge")
a = ap.parse_args()
R = json.load(open(a.roof))
img = Image.open(a.crop).convert("RGB")
g = np.asarray(img.convert("L")).astype(float)
hp = g - nd.gaussian_filter(g, 6)
H, W = g.shape
yy, xx = np.mgrid[0:H, 0:W]

def poly_mask(ring):
    from matplotlib.path import Path
    p = Path(ring); return p.contains_points(np.c_[xx.ravel(), yy.ravel()]).reshape(H, W)

inside = np.zeros((H, W), bool)
for f in R["faces"]:
    inside |= nd.binary_erosion(poly_mask(f["ring"]), iterations=int(a.edge))
covered = np.zeros((H, W), bool)
for o in R.get("obstructions", []):
    covered |= poly_mask(o)

dark = (hp < -a.thr) & inside
dark = nd.binary_opening(dark, iterations=1) | (dark & (hp < -2 * a.thr))
lab, n = nd.label(dark)
out = img.copy().resize((W * 2, H * 2)); d = ImageDraw.Draw(out)
cands = []
for i, sl in enumerate(nd.find_objects(lab), 1):
    if sl is None: continue
    m = lab[sl] == i; area = m.sum()
    if area < 6: continue
    ys, xs = np.nonzero(m); ys = ys + sl[0].start; xs = xs + sl[1].start
    cov = np.c_[xs - xs.mean(), ys - ys.mean()]
    ev = np.linalg.eigvalsh(np.cov(cov.T)) if area > 2 else np.array([1, 1])
    length = 4 * math.sqrt(max(ev[-1], 1e-6)); width = 4 * math.sqrt(max(ev[0], 1e-6))
    kind = "line" if (length > 18 and length / max(width, 1) > 3.5) else "spot"
    if kind == "spot" and area > 900: continue          # a whole shaded region, not an object
    is_cov = covered[ys, xs].mean() > 0.5
    cx, cy = xs.mean(), ys.mean()
    cands.append(dict(kind=kind, centre=[round(cx), round(cy)], size_px=int(area), length_px=round(length),
                      covered=bool(is_cov), bbox=[int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]))
    col = (150, 150, 150) if is_cov else ((255, 0, 255) if kind == "spot" else (0, 220, 255))
    if kind == "spot":
        r = max(6, math.sqrt(area)) * 2
        d.ellipse((cx * 2 - r, cy * 2 - r, cx * 2 + r, cy * 2 + r), outline=col, width=3)
    else:
        d.rectangle((xs.min() * 2 - 3, ys.min() * 2 - 3, xs.max() * 2 + 3, ys.max() * 2 + 3), outline=col, width=3)
for f in R["faces"]:
    d.polygon([(x * 2, y * 2) for x, y in f["ring"]], outline=(255, 0, 0), width=2)
out.save(a.out)
for c in sorted(cands, key=lambda c: (c["covered"], c["kind"], -c["size_px"])):
    print(("covered " if c["covered"] else "NEW     ") + f"{c['kind']:5} at {c['centre']} size {c['size_px']} px, length {c['length_px']} px, bbox {c['bbox']}")
