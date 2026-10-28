#!/usr/bin/env python3
"""Draw a manual roof design: lines (yellow = on image edges, orange dashed =
check on site), obstructions (red), panels, per-face counts.

  python3 scripts/roof-design/draw.py roofs/85-bombay-st.json layout.json PORTRAIT out.png
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

cfg = json.load(open(sys.argv[1])); lay = json.load(open(sys.argv[2])); orient = sys.argv[3]; out = sys.argv[4]
im = Image.open(os.path.join(os.path.dirname(sys.argv[1]), cfg["image"])).convert("RGB")
W, H = im.size
canvas = Image.new("RGB", (W, H + 56), (20, 20, 20)); canvas.paste(im, (0, 28))
dr = ImageDraw.Draw(canvas, "RGBA")
try:
    F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
    f2 = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 13)
except OSError:
    F = f2 = ImageFont.load_default()
o = lambda p: (p[0], p[1] + 28)
P = {k: np.array(v) for k, v in cfg["points"].items()}
per = lay[orient]; total = sum(f["n"] for f in per)
for f in per:
    for cs in f["panels"]:
        dr.polygon([o(c) for c in cs], fill=(25, 30, 70, 235), outline=(200, 210, 255, 255))
check = {tuple(sorted(l)) for l in cfg.get("checkOnSite", [])}
for kind in ("eaves", "hips"):
    for a, b in cfg["lines"][kind]:
        if tuple(sorted((a, b))) in check:
            for k in range(0, 20, 2):
                dr.line([o(P[a] + (P[b] - P[a]) * k / 20), o(P[a] + (P[b] - P[a]) * (k + 1) / 20)], fill=(255, 140, 40), width=3)
        else:
            dr.line([o(P[a]), o(P[b])], fill=(255, 205, 0), width=3)
for poly in cfg.get("obstructions", []):
    dr.polygon([o(q) for q in poly], outline=(255, 80, 80), width=2)
for f, face in zip(per, cfg["faces"]):
    c = np.mean([P[k] for k in face["ring"]], axis=0)
    t = f"{f['face']}: {f['n']}"
    bb = dr.textbbox(o(c), t, font=F)
    dr.rectangle([bb[0] - 4, bb[1] - 3, bb[2] + 4, bb[3] + 3], fill=(255, 255, 255, 235))
    dr.text(o(c), t, fill=(0, 0, 0), font=F)
name = cfg["address"].split(",")[0]
kw = total * cfg["panel"]["watts"] / 1000
dr.text((6, 5), f"{name} · verified roof lines · all {orient.lower()}: {total} panels = {kw:.1f} kW ({cfg['panel']['watts']} W)", fill=(255, 255, 255), font=F)
dr.text((6, H + 34), "Yellow: on image edges (±100 mm) · orange dashed: check on site · red: obstruction (100 mm clear)", fill=(230, 230, 230), font=f2)
canvas.save(out)
