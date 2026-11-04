import type { MetadataRoute } from "next";

import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Portals, admin and API routes. "/customers/" (trailing slash) keeps the
      // public /customers marketing page crawlable.
      disallow: ["/master", "/admin", "/installers/dashboard", "/customers/", "/api"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
