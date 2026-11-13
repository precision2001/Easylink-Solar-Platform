"""
About Us mission film: re-cuts public/videos/aboutMission.mp4 into a 2.39:1
cinemascope story, graded frame by frame.

  1. Day      - house in full sun, panels generating, car on the charger
  2. Night    - same scene at night: windows lit, charger glowing, stars
                ("the battery keeps the lights on")
  3. Sunset   - car charges, then drives off into a golden sunset

Usage (from repo root):
  python3 scripts/video/about-mission-cinema.py SRC.mp4 OUT.mp4 FONT_REG.ttf FONT_SEMI.ttf

Needs numpy, opencv-python, Pillow and ffmpeg on PATH.
"""

import subprocess
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

SRC, OUT, FONT_REG, FONT_SEMI = sys.argv[1:5]
FPS = 24
W, H = 1280, 720
CH = 536  # 1280 / 2.39 -> cinemascope
OUT_W, OUT_H = 1920, 804

# ---------------------------------------------------------------- frames
cap = cv2.VideoCapture(SRC)
src = []
while True:
    ok, f = cap.read()
    if not ok:
        break
    src.append(cv2.cvtColor(f, cv2.COLOR_BGR2RGB))
cap.release()
N = len(src)
CHARGE_END = int(3.0 * FPS)  # car sits on the charger until ~3 s


def crop(img, y0, zoom=1.0, cx=0.5):
    """Cinemascope crop at vertical offset y0 with a centred zoom."""
    h, w = img.shape[:2]
    cw, chh = w / zoom, CH / zoom
    x = (w - cw) * cx
    y = y0 + (CH - chh) / 2
    m = np.float32([[zoom, 0, -x * zoom], [0, zoom, -y * zoom]])
    return cv2.warpAffine(img, m, (W, CH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REFLECT)


def f32(a):
    return a.astype(np.float32) / 255.0


def u8(a):
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)


def bloom(a, sigma=18, amt=0.6):
    return np.clip(a + cv2.GaussianBlur(a, (0, 0), sigma) * amt, 0, 1)


yy, xx = np.mgrid[0:CH, 0:W].astype(np.float32)
VIGNETTE = 1 - 0.45 * (((xx - W / 2) / (W / 2)) ** 2 + ((yy - CH / 2) / (CH / 1.3)) ** 2)
VIGNETTE = np.clip(VIGNETTE, 0.35, 1)[..., None]

rng = np.random.default_rng(7)
STARS = np.zeros((CH, W), np.float32)
for _ in range(260):
    sx, sy = rng.integers(0, W), rng.integers(0, int(CH * 0.42))
    STARS[sy, sx] = rng.uniform(0.4, 1.0)
STARS = cv2.GaussianBlur(STARS, (0, 0), 0.8) * 3
STAR_PHASE = rng.uniform(0, 2 * np.pi, (CH, W)).astype(np.float32)


def sky_mask(a):
    """Bright, bluish, low-saturation-ish pixels in the upper frame = sky."""
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = ((b > r + 0.04) & (b > 0.55) & (yy < CH * 0.62)).astype(np.float32)
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    return cv2.GaussianBlur(m, (0, 0), 6)[..., None]


def day(a, t):
    a = f32(a)
    # sun glow top-left, gently breathing
    sun = np.exp(-(((xx - W * 0.1) / 260) ** 2 + ((yy + 40) / 220) ** 2))[..., None]
    a = a + sun * np.array([1.0, 0.92, 0.7]) * (0.35 + 0.08 * np.sin(t * 2))
    # panels shimmer: a soft light sweep across the roof
    sweep = np.exp(-((xx - (W * (-0.2 + 1.4 * ((t * 0.35) % 1))) + (yy * 0.8)) / 60) ** 2)[..., None]
    roof = ((yy < CH * 0.45) & (xx > W * 0.3) & (xx < W * 0.85)).astype(np.float32)[..., None]
    a = a + sweep * roof * 0.18
    return u8(a * (0.85 + 0.15 * VIGNETTE))


def night(a, t):
    a0 = f32(a)
    r, g, b = a0[..., 0], a0[..., 1], a0[..., 2]
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    base = np.stack([lum * 0.22, lum * 0.3, lum * 0.55], -1)  # moonlit blue
    base = base + a0 * 0.08
    # warm interiors: wood/orange-lit window areas below the roofline
    warm = ((r - b > 0.18) & (r > 0.35) & (yy > CH * 0.3) & (yy < CH * 0.72)).astype(np.float32)
    warm = cv2.GaussianBlur(cv2.dilate(warm, np.ones((3, 3), np.uint8)), (0, 0), 3)[..., None]
    lit = np.clip(a0 * np.array([1.35, 1.1, 0.75]) + 0.08, 0, 1)
    out = base * (1 - warm) + lit * warm
    # charger and road light strips: cyan glow
    cyan = ((b - r > 0.25) & (g - r > 0.15) & (yy > CH * 0.35)).astype(np.float32)
    cyan = cv2.GaussianBlur(cyan, (0, 0), 1.5)[..., None]
    out = out * (1 - cyan) + np.clip(a0 * 1.3, 0, 1) * cyan
    glow = cv2.GaussianBlur(np.clip(out - 0.45, 0, 1), (0, 0), 22) * 1.6
    out = out + glow
    # stars + moon in the sky
    sm = sky_mask(a)
    tw = 0.6 + 0.4 * np.sin(STAR_PHASE + t * 3)
    out = out + (STARS * tw)[..., None] * sm * np.array([0.9, 0.95, 1.0])
    moon = np.exp(-(((xx - W * 0.86) / 26) ** 2 + ((yy - CH * 0.12) / 26) ** 2))
    halo = np.exp(-(((xx - W * 0.86) / 120) ** 2 + ((yy - CH * 0.12) / 120) ** 2))
    out = out + (moon[..., None] * 0.9 + halo[..., None] * 0.18) * np.array([0.95, 0.97, 1.0]) * sm
    return u8(out * VIGNETTE)


SUN_X, SUN_Y = W * 0.78, CH * 0.36


def sunset(a, t, k):
    """k: 0..1 progress through the sunset act (sun sinks, light warms)."""
    a0 = f32(a)
    graded = np.stack(
        [
            np.clip(a0[..., 0] * 1.18 + 0.06, 0, 1),
            np.clip(a0[..., 1] * 0.88 + 0.02, 0, 1),
            np.clip(a0[..., 2] * 0.62, 0, 1),
        ],
        -1,
    )
    graded = graded * (0.82 - 0.22 * k)
    # sunset sky gradient replaces the blue sky
    v = np.clip(yy / (CH * 0.6), 0, 1)[..., None]
    top = np.array([0.35, 0.12, 0.38])
    mid = np.array([0.98, 0.42, 0.22])
    hor = np.array([1.0, 0.78, 0.4])
    sky = np.where(v < 0.55, top + (mid - top) * (v / 0.55), mid + (hor - mid) * ((v - 0.55) / 0.45))
    sky = sky * (1 - 0.2 * k)
    sm = sky_mask(a)
    # keep cloud/tree texture inside the sky
    tex = (0.3 * a0[..., 0] + 0.59 * a0[..., 1] + 0.11 * a0[..., 2])[..., None]
    sky = sky * (0.75 + 0.35 * tex)
    out = graded * (1 - sm) + sky * sm
    # low sun with bloom
    sy = SUN_Y + k * CH * 0.08
    d2 = ((xx - SUN_X) / 1) ** 2 + ((yy - sy) / 1) ** 2
    disc = np.clip(1 - np.sqrt(d2) / 34, 0, 1) ** 0.5
    glow = np.exp(-d2 / (2 * 140**2))
    wide = np.exp(-d2 / (2 * 420**2))
    out = out + disc[..., None] * np.array([1.0, 0.95, 0.75]) * 0.9
    out = out + glow[..., None] * np.array([1.0, 0.6, 0.25]) * 0.32
    out = out + wide[..., None] * np.array([1.0, 0.5, 0.2]) * 0.07
    # warm rim light from the sun side
    rim = np.clip((xx - W * 0.35) / (W * 0.65), 0, 1)[..., None] * 0.04
    out = out + rim * np.array([1.0, 0.55, 0.2])
    return u8(bloom(out, 14, 0.1) * VIGNETTE)


# ---------------------------------------------------------------- captions
F_SEMI = ImageFont.truetype(FONT_SEMI, 46)
F_REG = ImageFont.truetype(FONT_REG, 30)


def caption(img, title, sub, alpha):
    if alpha <= 0:
        return img
    # soft dark scrim behind the caption (top-left) so it reads on bright skies
    scrim = np.clip(1 - np.sqrt(((xx - 0) / 820) ** 2 + ((yy - 0) / 230) ** 2), 0, 1)[..., None] * 0.55 * alpha
    img = u8(f32(img) * (1 - scrim))
    im = Image.fromarray(img).convert("RGBA")
    layer = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    x, y = 64, 44
    a = int(255 * alpha)
    for dx, dy in ((0, 2), (0, 3)):
        d.text((x + dx, y + dy), title, font=F_SEMI, fill=(0, 0, 0, int(a * 0.55)))
    d.text((x, y), title, font=F_SEMI, fill=(255, 255, 255, a))
    for dx, dy in ((0, 2),):
        d.text((x + 2 + dx, y + 60 + dy), sub, font=F_REG, fill=(0, 0, 0, int(a * 0.55)))
    d.text((x + 2, y + 60), sub, font=F_REG, fill=(255, 236, 160, a))
    return np.array(Image.alpha_composite(im, layer.filter(__import__("PIL.ImageFilter").ImageFilter.SMOOTH)).convert("RGB"))


def env(i, n, fade=14):
    return min(1.0, i / fade, (n - 1 - i) / fade) if n > 1 else 1.0


# ---------------------------------------------------------------- acts
SLOW = 2  # charge scene at half speed
day_idx = [i // SLOW for i in range(CHARGE_END * SLOW)]
night_idx = list(reversed(day_idx))
sun_idx = list(range(CHARGE_END - 12, N))

XF = int(1.5 * FPS)  # crossfade length
acts = []

# Act 1: day (slow push in)
A = []
for j, i in enumerate(day_idx):
    t = j / FPS
    z = 1.0 + 0.06 * j / len(day_idx)
    A.append(day(crop(src[i], 96, z), t))
# Act 2: night (continue push)
B = []
for j, i in enumerate(night_idx):
    t = j / FPS
    z = 1.06 + 0.06 * j / len(night_idx)
    B.append(night(crop(src[i], 96, z), t))
# Act 3: sunset - charge then drive off (camera already tracks)
C = []
for j, i in enumerate(sun_idx):
    t = j / FPS
    k = j / max(1, len(sun_idx) - 1)
    C.append(sunset(crop(src[i], 110, 1.04), t, k))

frames = []


def append_xfade(seq):
    global frames
    if not frames:
        frames = list(seq)
        return
    tail = frames[-XF:]
    frames = frames[:-XF]
    for j in range(XF):
        w = j / (XF - 1)
        w = w * w * (3 - 2 * w)
        frames.append(u8(f32(tail[j]) * (1 - w) + f32(seq[j]) * w))
    frames.extend(seq[XF:])


starts = []
for seq in (A, B, C):
    starts.append(max(0, len(frames) - (XF if frames else 0)))
    append_xfade(seq)

CAPS = [
    ("By day, the sun powers your home", "Rooftop solar generating clean energy"),
    ("By night, your battery takes over", "Stored sunshine keeps the lights on"),
    ("Charge up, then drive into the sunset", "Your EV runs on your own solar"),
]
total = len(frames)
ends = starts[1:] + [total]
for (title, sub), s, e in zip(CAPS, starts, ends):
    s2, e2 = s + int(0.8 * FPS), e - int(0.6 * FPS)
    for i in range(s2, e2):
        frames[i] = caption(frames[i], title, sub, env(i - s2, e2 - s2, 12))

# fade in/out to black for a clean loop
FADE = int(0.8 * FPS)
for i in range(FADE):
    frames[i] = u8(f32(frames[i]) * (i / FADE))
    frames[-1 - i] = u8(f32(frames[-1 - i]) * (i / FADE))

# ---------------------------------------------------------------- encode
p = subprocess.Popen(
    [
        "ffmpeg", "-v", "error", "-y",
        "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{CH}", "-r", str(FPS), "-i", "-",
        "-vf", f"scale={OUT_W}:{OUT_H}:flags=lanczos,unsharp=5:5:0.5",
        "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-pix_fmt", "yuv420p",
        "-movflags", "+faststart", "-an", OUT,
    ],
    stdin=subprocess.PIPE,
)
for f in frames:
    p.stdin.write(f.tobytes())
p.stdin.close()
p.wait()
print(f"wrote {OUT}: {total} frames, {total / FPS:.1f}s")
