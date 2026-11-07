// Bundles the Roof Designer's worker thread (src/lib/roof-design/worker.ts)
// into <distDir>/roof-worker.cjs, next to the web build, so it is swapped in
// with it (scripts/start.sh). Runs after `next build`, which empties distDir.
import { build } from "esbuild";
import { join } from "node:path";

const distDir = process.env.NEXT_DIST_DIR || ".next";
await build({
  entryPoints: ["src/lib/roof-design/worker.ts"],
  outfile: join(distDir, "roof-worker.cjs"),
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node20",
  tsconfig: "tsconfig.json",
  // Native or heavy packages are loaded from node_modules at run time.
  external: ["sharp"],
  logLevel: "warning",
  legalComments: "none",
});
console.log(`Roof design worker built: ${join(distDir, "roof-worker.cjs")}`);
