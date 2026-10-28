#!/usr/bin/env python3
"""Draw live-pipeline.ts output: raw traced outline (cyan), final outline (yellow),
faces (red), obstructions (orange), panel centres (blue dots).
Usage: live-draw.py <outDir> [ORIENTATION] [x0 y0 x1 y1]"""
import json, sys
from PIL import Image, ImageDraw
d = sys.argv[1]; ori = sys.argv[2] if len(sys.argv) > 2 else "PORTRAIT"
J = json.load(open(f"{d}/pipeline.json")); im = Image.open(f"{d}/snap.png").convert("RGB")
box = list(map(int, sys.argv[3:7])) if len(sys.argv) > 6 else None
g = ImageDraw.Draw(im)
for r in J["rawOutlines"]: g.line([tuple(p) for p in r + r[:1]], fill=(0, 230, 255), width=2)
for r in J["faces"]: g.line([tuple(p) for p in r + r[:1]], fill=(255, 40, 40), width=2)
for r in J["outline"]: g.line([tuple(p) for p in r + r[:1]], fill=(255, 230, 0), width=3)
for r in J.get("obstructions", []): g.line([tuple(p) for p in r + r[:1]], fill=(255, 150, 0), width=2)
for p in J["panels"].get(ori, []): x, y = p["c"]; g.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(40, 80, 255))
if box: im = im.crop(box)
im.save(f"{d}/draw_{ori}.png"); print(J["counts"])
