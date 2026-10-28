#!/usr/bin/env python3
"""Check every roof line of a manual design against the screenshot
(docs/ROOF_DESIGN_PROCESS.md, step 5).

For each eave and hip, finds the strongest brightness edge within +/-40 px
across it. Offset = how far (px, positive = left of a->b) the line should
move; "x background" = edge strength over typical strength (>~4 is a clear
edge; ~2 or less means no edge: mark the line "check on site").

  python3 scripts/roof-design/check-lines.py scripts/roof-design/roofs/85-bombay-st.json
"""
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as nd

cfg = json.load(open(sys.argv[1]))
img = np.asarray(Image.open(os.path.join(os.path.dirname(sys.argv[1]), cfg["image"])).convert("RGB")).astype(float)
L = nd.gaussian_filter(img @ [0.299, 0.587, 0.114], 2.0)
P = {k: np.array(v, float) for k, v in cfg["points"].items()}
mpp = cfg["metresPerPixel"]

def sample(p):
    return nd.map_coordinates(L, [[p[1]], [p[0]]], order=1)[0]

def check(a, b, rng=40, half=4):
    d = (b - a) / np.linalg.norm(b - a)
    n = np.array([-d[1], d[0]])
    prof = []
    for s in range(-rng, rng + 1):
        prof.append(np.mean([sample(a + t * (b - a) + s * n + half * n) - sample(a + t * (b - a) + s * n - half * n)
                             for t in np.linspace(0.15, 0.85, 25)]))
    prof = np.abs(np.array(prof))
    bg = max(np.median(prof), 1e-6)
    # The NEAREST clear edge, not the strongest: within 1 m of an eave the
    # strongest edge is often a neighbouring roof or a shadow line
    # (85 Bombay St: the white roof next door, 1 m south of the eave).
    peaks = [i for i in range(1, len(prof) - 1) if prof[i] >= prof[i - 1] and prof[i] >= prof[i + 1] and prof[i] > 4 * bg]
    if not peaks:
        i = int(np.argmax(prof))
        return i - rng, prof[i] / bg
    i = min(peaks, key=lambda k: abs(k - rng))
    return i - rng, prof[i] / bg

for kind in ("eaves", "hips"):
    for a, b in cfg["lines"][kind]:
        if np.linalg.norm(P[a] - P[b]) < 10:
            continue
        off, strength = check(P[a], P[b])
        verdict = "confirmed" if abs(off) * mpp <= 0.1 and strength > 4 else ("move" if strength > 4 else "check on site")
        print(f"{kind[:-1]:4s} {a}-{b:3s} offset {off:+4d} px ({off * mpp * 1000:+5.0f} mm)  x background {strength:5.1f}  {verdict}")

# --refine R1,R2: move the named free points (e.g. ridge ends) so the lines
# through them sit on the image edges; other points stay fixed (corners set
# by confirmed eaves). Writes the refined points back into the JSON.
if len(sys.argv) > 2 and sys.argv[2] == "--refine":
    free = sys.argv[3].split(",")
    lines = [l for kind in ("eaves", "hips") for l in cfg["lines"][kind]]
    for it in range(6):
        moves = {k: [] for k in free}
        for a, b in lines:
            if (a in free) == (b in free):
                continue
            fixed, mov = (a, b) if b in free else (b, a)
            off, strength = check(P[a], P[b])
            if strength <= 4:
                continue
            d = (P[b] - P[a]) / np.linalg.norm(P[b] - P[a])
            n = np.array([-d[1], d[0]])
            # The profile samples the middle of the line: moving the free end
            # by 2x moves the middle by 1x.
            moves[mov].append(2 * off * n)
        for k, m in moves.items():
            if m:
                P[k] = P[k] + 0.5 * np.mean(m, axis=0)
    cfg["points"].update({k: [round(float(v[0]), 1), round(float(v[1]), 1)] for k, v in P.items() if k in free})
    json.dump(cfg, open(sys.argv[1], "w"), indent=1)
    print("refined", {k: cfg["points"][k] for k in free})
    for kind in ("eaves", "hips"):
        for a, b in cfg["lines"][kind]:
            if np.linalg.norm(P[a] - P[b]) < 10:
                continue
            off, strength = check(P[a], P[b])
            print(f"  {kind[:-1]:4s} {a}-{b:3s} offset {off:+4d} px ({off * mpp * 1000:+5.0f} mm)  x background {strength:5.1f}")
