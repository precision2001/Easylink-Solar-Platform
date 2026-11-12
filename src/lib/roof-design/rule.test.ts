import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { describe, expect, it } from "vitest";

/**
 * Platform rule (5 Nov 2026): installers, customers, operations, the website
 * and outside websites get their designs from the Roof Designer
 * (src/lib/roof-design, or POST /api/roof-design). No other code finds roofs,
 * faces or panel layouts itself.
 */
const ROOT = join(__dirname, "..", "..");
const ENGINE_PARTS =
  /from "@\/(lib\/designer\/(panelLayout|beautify|roofFaces|roofFaceDetect|roofLineCorrect|squareRoof|panelClearance|roofObstructions|roofLines|roofLineCheck|roofSnapshot)|utils\/roofMaskContour)"/;
/** Loading the inputs (the zoomed image), not designing. */
const ALLOWED = new Set(["hooks/useRoofSnapshot.ts"]);

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? files(p) : /\.(ts|tsx)$/.test(n) && !/\.test\./.test(n) ? [p] : [];
  });
}

describe("Roof Designer rule", () => {
  it("only the Roof Designer uses the roof-design steps", () => {
    const offenders = files(ROOT)
      .map((p) => relative(ROOT, p))
      .filter((r) => !r.startsWith("lib/roof-design/") && !r.startsWith("lib/designer/") && !r.startsWith("utils/") && !ALLOWED.has(r))
      .filter((r) => ENGINE_PARTS.test(readFileSync(join(ROOT, r), "utf8")));
    expect(offenders, "Design through @/lib/roof-design (or POST /api/roof-design), never with the steps directly").toEqual([]);
  });
});
