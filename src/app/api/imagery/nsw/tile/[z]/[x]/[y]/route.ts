import { NextResponse } from "next/server";
import sharp from "sharp";
import { NSW_TILE_URL } from "@/lib/server/nswImagery";
import { cachedBytes } from "@/lib/server/roofDataCache";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ z: string; x: string; y: string }> };

/** NSW Spatial Services stops at level 21; closer levels are cut from it and enlarged. */
const MAX = 21;

/**
 * One NSW aerial tile for the Designs map's "NSW" imagery (owner, 9 Nov 2026):
 * Google Maps z/x/y, levels 22-23 cut from level 21. Cached.
 */
export async function GET(_req: Request, ctx: Ctx) {
  const { z: zs, x: xs, y: ys } = await ctx.params;
  const z = Number(zs);
  const x = Number(xs);
  const y = Number(ys.replace(/\.\w+$/, ""));
  if (![z, x, y].every(Number.isInteger) || z < 0 || z > 23 || x < 0 || y < 0 || x >= 2 ** z || y >= 2 ** z) {
    return NextResponse.json({ message: "Bad tile." }, { status: 400 });
  }
  const up = Math.max(0, z - MAX);
  const pz = z - up;
  const px = x >> up;
  const py = y >> up;
  const img = await cachedBytes(`nswtile|${z}|${x}|${y}`, async () => {
    const res = await fetch(NSW_TILE_URL(pz, px, py), { cache: "no-store", signal: AbortSignal.timeout(15_000) }).catch(() => null);
    if (!res?.ok) return null;
    const parent = Buffer.from(await res.arrayBuffer());
    if (!up) return parent;
    const part = 256 >> up;
    const left = (x - (px << up)) * part;
    const top = (y - (py << up)) * part;
    return sharp(parent).extract({ left, top, width: part, height: part }).resize(256, 256, { kernel: "lanczos3" }).jpeg({ quality: 88 }).toBuffer();
  }).catch(() => null);
  if (!img) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(img), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=604800, immutable" },
  });
}
