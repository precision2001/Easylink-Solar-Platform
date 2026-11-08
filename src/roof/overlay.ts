import { deflateSync, inflateSync } from "node:zlib";

/**
 * A trace drawn over the roof photo, so Opus can check its own lines and
 * intersection points against the image (the "check against the image" step
 * of every roof trace). Plain PNG decode/encode with node's zlib: 8-bit RGB or
 * RGBA, not interlaced (what the Roof Designer sends). Anything else → null.
 */

export type Rgba = { width: number; height: number; data: Uint8Array };

const SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

export function decodePng(buf: Uint8Array): Rgba | null {
  const b = Buffer.from(buf);
  if (b.length < 8 || !b.subarray(0, 8).equals(SIG)) return null;
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = -1;
  const idat: Buffer[] = [];
  while (off + 8 <= b.length) {
    const len = b.readUInt32BE(off);
    const type = b.toString("latin1", off + 4, off + 8);
    const body = b.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const depth = body[8];
      colorType = body[9]!;
      if (depth !== 8 || (colorType !== 2 && colorType !== 6) || body[12] !== 0) return null;
    } else if (type === "IDAT") idat.push(body);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  if (!width || !height || colorType < 0) return null;
  const bpp = colorType === 6 ? 4 : 3;
  const raw = inflateSync(Buffer.concat(idat));
  const stride = width * bpp;
  if (raw.length < (stride + 1) * height) return null;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]!;
    const src = y * (stride + 1) + 1;
    const row = y * stride;
    for (let i = 0; i < stride; i++) {
      const x = raw[src + i]!;
      const a = i >= bpp ? px[row + i - bpp]! : 0;
      const up = y > 0 ? px[row - stride + i]! : 0;
      const c = y > 0 && i >= bpp ? px[row - stride + i - bpp]! : 0;
      let v: number;
      if (f === 0) v = x;
      else if (f === 1) v = x + a;
      else if (f === 2) v = x + up;
      else if (f === 3) v = x + ((a + up) >> 1);
      else {
        const p = a + up - c;
        const pa = Math.abs(p - a);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - c);
        v = x + (pa <= pb && pa <= pc ? a : pb <= pc ? up : c);
      }
      px[row + i] = v & 255;
    }
  }
  const data = new Uint8Array(width * height * 4);
  for (let i = 0, j = 0; i < width * height; i++, j += bpp) {
    data[i * 4] = px[j]!;
    data[i * 4 + 1] = px[j + 1]!;
    data[i * 4 + 2] = px[j + 2]!;
    data[i * 4 + 3] = 255;
  }
  return { width, height, data };
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(b: Buffer): number {
  let c = 0xffffffff;
  for (const x of b) c = CRC[(c ^ x) & 255]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, body: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(body.length);
  const tb = Buffer.concat([Buffer.from(type, "latin1"), body]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(tb));
  return Buffer.concat([len, tb, crc]);
}

export function encodePng(img: Rgba): Buffer {
  const { width, height, data } = img;
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      const s = (y * width + x) * 4;
      const d = y * (width * 3 + 1) + 1 + x * 3;
      raw[d] = data[s]!;
      raw[d + 1] = data[s + 1]!;
      raw[d + 2] = data[s + 2]!;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([SIG, chunk("IHDR", ihdr), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]);
}

type Rgb = [number, number, number];

function dot(img: Rgba, cx: number, cy: number, r: number, col: Rgb) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) continue;
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      const i = (y * img.width + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
    }
}

/** A line `w` px wide; dashed when `dash` (8 on, 8 off). */
export function drawLine(img: Rgba, a: [number, number], b: [number, number], w: number, col: Rgb, dash = false) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  const n = Math.max(1, Math.ceil(len));
  for (let i = 0; i <= n; i++) {
    if (dash && Math.floor(i / 8) % 2 === 1) continue;
    const t = i / n;
    dot(img, a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, w / 2, col);
  }
}

/** 3×5 digits, so each intersection point carries its number on the overlay. */
const DIGITS = ["111101101101111", "010110010010111", "111001111100111", "111001111001111", "101101111001001", "111100111001111", "111100111101111", "111001001001001", "111101111101111", "111101111001111"];
export function drawNumber(img: Rgba, n: number, x: number, y: number, scale = 2) {
  const s = String(n);
  const w = (s.length * 4 - 1) * scale;
  // black box behind the digits so they read on any roof colour
  for (let yy = y - 1; yy < y + 5 * scale + 1; yy++)
    for (let xx = x - 1; xx < x + w + 1; xx++) {
      if (xx < 0 || yy < 0 || xx >= img.width || yy >= img.height) continue;
      const i = (yy * img.width + xx) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 0;
    }
  [...s].forEach((ch, k) => {
    const g = DIGITS[Number(ch)]!;
    for (let r = 0; r < 5; r++)
      for (let c = 0; c < 3; c++)
        if (g[r * 3 + c] === "1")
          for (let dy = 0; dy < scale; dy++)
            for (let dx = 0; dx < scale; dx++) {
              const xx = x + (k * 4 + c) * scale + dx;
              const yy = y + r * scale + dy;
              if (xx < 0 || yy < 0 || xx >= img.width || yy >= img.height) continue;
              const i = (yy * img.width + xx) * 4;
              img.data[i] = img.data[i + 1] = 255;
              img.data[i + 2] = 0;
            }
  });
}

export type TraceToDraw = {
  outline: [number, number][];
  points: { id: string; x: number; y: number }[];
  lines: { from: string; to: string; seen: "clear" | "faint" }[];
};

/**
 * The photo with the trace on top: border magenta, clear lines yellow, faint
 * lines orange dashed, intersection points cyan with their number (1, 2, …
 * in the order given). Lines are 2 px so the roof line under them still shows
 * at their edges. Null when the photo can't be decoded.
 */
export function traceOverlay(png: Uint8Array, buildings: TraceToDraw[]): { png: Buffer; numbers: Map<string, number>[] } | null {
  const img = decodePng(png);
  if (!img) return null;
  const numbers: Map<string, number>[] = [];
  let k = 0;
  for (const b of buildings) {
    b.outline.forEach((p, i) => drawLine(img, p, b.outline[(i + 1) % b.outline.length]!, 2, [255, 0, 255]));
    const at = new Map(b.points.map((p) => [p.id, [p.x, p.y] as [number, number]]));
    for (const l of b.lines) {
      const a = at.get(l.from);
      const c = at.get(l.to);
      if (a && c) drawLine(img, a, c, 2, l.seen === "faint" ? [255, 140, 0] : [255, 230, 0], l.seen === "faint");
    }
    const nums = new Map<string, number>();
    for (const p of b.points) {
      k += 1;
      nums.set(p.id, k);
      dot(img, p.x, p.y, 3.5, [0, 0, 0]);
      dot(img, p.x, p.y, 2.5, [0, 230, 255]);
      drawNumber(img, k, Math.round(p.x + 5), Math.round(p.y - 13));
    }
    numbers.push(nums);
  }
  return { png: encodePng(img), numbers };
}
