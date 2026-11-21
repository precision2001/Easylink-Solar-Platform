import { notFound } from "next/navigation";
import { PartnerDesignerSection } from "@/components/partner/PartnerDesignerSection";
import { fetchPartnerSite } from "@/lib/public/partnerSite";

/**
 * An installer's Platform Designer landing page, e.g. /p/solarman.
 *
 * The installer links to this from their own site, or embeds /p/<key>/embed
 * in an iframe. Either way the page is painted in their colours and the lead
 * is assigned to them.
 *
 * Rendered per request because the branding is read from the backend, which
 * answers per origin: one installer's page must never be cached and served
 * for another.
 */
export const dynamic = "force-dynamic";

export default async function PartnerLandingPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;

  // No origin is read here. A browser sends none when a link is followed or a
  // URL is typed, which is exactly how this page is reached, so there is
  // nothing to match against — the allowlist belongs on the embed, which does
  // send one. (The previous `referer` fallback passed a full page URL where an
  // origin was expected, so it never matched and the page always 404'd.)
  const site = await fetchPartnerSite(key, null, "page");
  if (!site) notFound();

  return (
    <main className="min-h-screen bg-white">
      <PartnerDesignerSection site={site} variant="page" />
    </main>
  );
}
