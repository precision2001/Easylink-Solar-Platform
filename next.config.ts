import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Build output folder. scripts/start.sh builds into a separate folder
   * (NEXT_DIST_DIR=.next-new) and only swaps it in once the build succeeds,
   * so a failed server build never takes the live site down.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
  /** Hide the bottom-right “Compiling / Rendering” dev badge; compile status stays in the terminal. */
  devIndicators: false,
  /**
   * The server (t3.small, 2 GB) ran out of memory in the build's type check
   * and the build was killed (deploy 28 Oct 2026). Types are checked before
   * every push (npx tsc --noEmit), so scripts/start.sh skips them on the
   * server with SKIP_TYPECHECK=1. Local and CI builds still check.
   */
  typescript: { ignoreBuildErrors: process.env.SKIP_TYPECHECK === "1" },
  /**
   * Off: React's dev-only double-mount/double-effect was doubling every
   * client-side effect (solar API calls, imperative Google Maps setup, etc.)
   * on every dev page load. Doesn't affect production — StrictMode's extra
   * checks never run in a production build regardless of this setting.
   */
  reactStrictMode: false,
  /** pdf-parse → pdfjs-dist must not be webpacked; it throws at load time in the RSC bundle. */
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
  turbopack: {},
  webpack(config, { dev }) {
    // Windows can intermittently hit EBUSY when webpack's filesystem cache packfiles
    // are being renamed/locked by other processes (AV scanners, parallel Next tasks, etc.).
    // Disabling persistent cache for production builds avoids flaky `next build` failures.
    if (!dev && process.platform === "win32") {
      config.cache = false;
    }

    config.module.rules.unshift({
      test: /\.svg$/i,
      resourceQuery: /component/,
      use: ["@svgr/webpack"],
    });
    config.module.rules.unshift({
      test: /\.svg$/i,
      resourceQuery: { not: [/component/] },
      type: "asset/resource",
    });

    return config;
  },
};

export default nextConfig;
