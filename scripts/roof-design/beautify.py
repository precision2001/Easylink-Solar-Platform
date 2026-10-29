#!/usr/bin/env python3
"""Beautify Design (optional module): neat, symmetric panel blocks.

After the normal packer has shown the most a roof holds, this lays each
section out for looks and access instead:
  - one shared grid per section, so columns line up from row to row
    (the packer starts each row at the edge, which staggers rows);
  - panels in strips of 2 rows (default), an access gap every 20 columns
    and a walkway between strips;
  - ragged edges trimmed: only full rectangles are kept inside each block;
  - the grid is centred, so margins come out even.
All the normal rules still hold: 100 mm from every roof line and
obstruction, one orientation, panels inside one section.

Usage: beautify.py sections.json out.json [--rows 4 --cols 10 --walk 0.8 --orient LANDSCAPE]
sections.json: {"mpp": m_per_px, "sections": [{"name", "ring": [[x,y]..] (px), "angle": row
direction (deg, image x-axis, counter-clockwise with y up), "obstructions": [[[x,y]..]..]}]}
"""
import json, math, argparse
from shapely.geometry import Polygon, box
from shapely import affinity
from shapely.ops import unary_union
from shapely.prepared import prep

ap = argparse.ArgumentParser()
ap.add_argument("inp"); ap.add_argument("out")
ap.add_argument("--rows", type=int, default=2); ap.add_argument("--cols", type=int, default=20)
ap.add_argument("--walk", type=float, default=0.8, help="walkway between blocks, m")
ap.add_argument("--orient", default="LANDSCAPE")
ap.add_argument("--setback", type=float, default=0.1)
ap.add_argument("--gap", type=float, default=0.02)
ap.add_argument("--min-block", type=int, default=4)
a = ap.parse_args()
J = json.load(open(a.inp)); mpp = J["mpp"]
L, S = 1.762, 1.134
pw, ph = (L, S) if a.orient == "LANDSCAPE" else (S, L)

def best_rect(cells, R, C):
    """Largest all-filled rectangle (r0,r1,c0,c1) in an R x C occupancy grid.
    Full-height rectangles (every row of the block) win ties, so strips keep
    both rows the same length."""
    best = None; bestS = (0, 0)
    for r0 in range(R):
        for r1 in range(r0, R):
            for c0 in range(C):
                for c1 in range(c0, C):
                    if not all(cells.get((r, c)) for r in range(r0, r1 + 1) for c in range(c0, c1 + 1)): break
                    A = (r1 - r0 + 1) * (c1 - c0 + 1)
                    sc = (A + (A if r1 - r0 + 1 == R else 0), A)
                    if sc > bestS: best, bestS = (r0, r1, c0, c1), sc
    return best, (bestS[1] if best else 0)

out = []
for sec in J["sections"]:
    # metres, y up
    poly = Polygon([(x * mpp, -y * mpp) for x, y in sec["ring"]]).buffer(0)
    obs = [Polygon([(x * mpp, -y * mpp) for x, y in o]).buffer(0) for o in sec.get("obstructions", [])]
    usable = poly.buffer(-a.setback, join_style=2)
    if obs: usable = usable.difference(unary_union(obs).buffer(a.setback, join_style=2))
    if usable.is_empty: out.append(dict(name=sec["name"], panels=[])); continue
    c = poly.centroid
    rot = affinity.rotate(usable, -sec["angle"], origin=c)
    U = prep(rot)
    x0, y0, x1, y1 = rot.bounds
    sx, sy = pw + a.gap, ph + a.gap
    bw = a.cols * sx - a.gap + a.walk  # block pitch incl. walkway
    bh = a.rows * sy - a.gap + a.walk
    nbx = int((x1 - x0) / bw) + 2; nby = int((y1 - y0) / bh) + 2
    best = None
    steps = 8
    for ix in range(steps):
        for iy in range(steps):
            ox = x0 - bw + bw * ix / steps; oy = y0 - bh + bh * iy / steps
            blocks = []
            n = 0
            for bj in range(nby + 1):
                for bi in range(nbx + 1):
                    bx = ox + bi * bw; by = oy + bj * bh
                    if bx > x1 or by > y1 or bx + bw < x0 or by + bh < y0: continue
                    cells = {}
                    for r in range(a.rows):
                        for cc in range(a.cols):
                            px, py = bx + cc * sx, by + r * sy
                            if U.contains(box(px, py, px + pw, py + ph)): cells[(r, cc)] = (px, py)
                    # every full rectangle in the block, largest first
                    while len(cells) >= a.min_block:
                        rect, A = best_rect(cells, a.rows, a.cols)
                        if not rect or A < a.min_block: break
                        r0, r1, c0, c1 = rect
                        keys = [(r, cc) for r in range(r0, r1 + 1) for cc in range(c0, c1 + 1)]
                        blocks.append([cells[k] for k in keys])
                        for k in keys: cells.pop(k)
                        n += A
            if not blocks: continue
            # tie-break: centred (balanced margins around the panel extent)
            xs = [p[0] for b in blocks for p in b]; ys = [p[1] for b in blocks for p in b]
            ex = ((min(xs) - x0) - (x1 - max(xs) - pw)); ey = ((min(ys) - y0) - (y1 - max(ys) - ph))
            score = (n, -abs(ex) - abs(ey))
            if best is None or score > best[0]: best = (score, blocks)
    panels = []
    if best:
        for b in best[1]:
            for (px, py) in b:
                pr = affinity.rotate(box(px, py, px + pw, py + ph), sec["angle"], origin=c)
                panels.append([[x / mpp, -y / mpp] for x, y in list(pr.exterior.coords)[:4]])
    out.append(dict(name=sec["name"], blocks=len(best[1]) if best else 0, panels=panels))
    print(f"{sec['name']:22} {len(panels):4} panels in {len(best[1]) if best else 0} blocks")
json.dump(dict(orientation=a.orient, sections=out), open(a.out, "w"))
print("total", sum(len(s["panels"]) for s in out))
