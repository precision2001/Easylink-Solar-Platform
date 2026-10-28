#!/usr/bin/env python3
"""Confirm image-read faces against Google's roof segments (process step 4b).

Faces come from reading the image (step 4). Google only confirms them:
  - each Google segment should land inside one image face (centre test),
  - facing within 15 deg of that face,
  - and the total roof area within 10%.
A face with no Google segment is fine when it is a narrow strip Google
merged into a neighbour; a Google segment with no face, or a facing or area
mismatch, means look at the image again. Never move a line to match Google.

Usage: confirm-google.py roofs/x.json
Needs in the json: faces[{name, ring(px), bearing, pitch}], scale_m_per_px,
google_segments[{pitch, azimuth, areaM2, px}] (centres in the same image px),
optional google_offset_px [dx, dy]: shift Google centres onto the image when the
photo is oblique (measure it by matching height-model face junctions to the
image, e.g. the ridge ends; 61 Harry Ave: [-18, -15], about 0.7 m),
optional google_excluded {index: reason}: segments that are not this roof
(a neighbour, a metal patio roof); listed with the reason, left out of the total.
"""
import json, math, sys

R = json.load(open(sys.argv[1]))
m = R["scale_m_per_px"]

def area(r):
    return abs(sum(r[i][0]*r[i-1][1] - r[i-1][0]*r[i][1] for i in range(len(r)))) / 2 * m * m

def inside(p, r):
    x, y, c = p[0], p[1], False
    for i in range(len(r)):
        (x0, y0), (x1, y1) = r[i-1], r[i]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0):
            c = not c
    return c

def adiff(a, b):
    return abs((a - b + 180) % 360 - 180)

faces = R["faces"]
odx, ody = R.get("google_offset_px", [0, 0])
hit = {f["name"]: [] for f in faces}
problems, gtot = [], 0.0
excl = {int(k): v for k, v in R.get("google_excluded", {}).items()}
for i, s in enumerate(R.get("google_segments", [])):
    if i in excl:
        print(f"Google segment {i} ({s['azimuth']} deg, {s['pitch']} pitch, {s['areaM2']} m2): left out - {excl[i]}")
        continue
    if s["pitch"] < 5:
        print(f"Google flat segment {s['areaM2']} m2 at {s['px']}: skipped (flat / other roof)")
        continue
    gtot += s["areaM2"]
    c = [s["px"][0] + odx, s["px"][1] + ody]
    owner = [f for f in faces if inside(c, f["ring"])]
    if not owner:
        problems.append(f"Google segment az {s['azimuth']} pitch {s['pitch']} ({s['areaM2']} m2) at {[round(v) for v in c]} is not inside any face")
        continue
    f = owner[0]
    hit[f["name"]].append(s)
    d = adiff(f["bearing"], s["azimuth"])
    if d > 15:
        problems.append(f"{f['name']}: facing {f['bearing']} vs Google {s['azimuth']} ({d:.0f} deg)")

mytot = 0.0
print(f"{'face':18} {'sloped m2':>9} {'Google m2':>9} {'facing':>7} {'Google':>7}  status")
for f in faces:
    sa = area(f["ring"]) / math.cos(math.radians(f["pitch"]))
    mytot += sa
    g = hit[f["name"]]
    if g:
        ga = sum(s["areaM2"] for s in g)
        az = "/".join(str(s["azimuth"]) for s in g)
        ok = all(adiff(f["bearing"], s["azimuth"]) <= 15 for s in g)
        print(f"{f['name']:18} {sa:9.1f} {ga:9.1f} {f['bearing']:7} {az:>7}  {'confirmed' if ok else 'CHECK facing'}")
    else:
        print(f"{f['name']:18} {sa:9.1f} {'-':>9} {f['bearing']:7} {'-':>7}  image only (strip Google merged?)")
pct = 100 * (mytot - gtot) / gtot if gtot else float('nan')
print(f"\nTotal: image faces {mytot:.1f} m2, Google {gtot:.1f} m2 ({pct:+.1f}%)"
      + ("" if abs(pct) <= 10 else "  CHECK outline"))
for p in problems:
    print("CHECK:", p)
