import type { MetadataRoute } from "next";

import { fetchPublicBlogs } from "@/lib/public/blogs";
import { SITE_URL } from "@/lib/site";

/** Public marketing pages only — no portals, auth flows, cart or API routes. */
const PUBLIC_ROUTES = [
  "/",
  "/products",
  "/designs",
  "/bluetti",
  "/about-us",
  "/contact-us",
  "/blog",
  "/faqs",
  "/warranty",
  "/how-it-works",
  "/services",
  "/ready-deals",
  "/ready-sites",
  "/user-manual",
  "/firmware",
  "/customers",
  "/installers/landing",
] as const;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = PUBLIC_ROUTES.map((path) => ({
    url: `${SITE_URL}${path === "/" ? "" : path}`,
  }));

  // Blog posts come from the backend; the sitemap still works without them.
  const posts = await fetchPublicBlogs().catch(() => []);
  for (const post of posts) {
    pages.push({ url: `${SITE_URL}/blog/${encodeURIComponent(post.slug)}/details` });
  }

  return pages;
}
