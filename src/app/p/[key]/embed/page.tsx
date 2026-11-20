import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PartnerDesignerSection } from "@/components/partner/PartnerDesignerSection";
import { fetchPartnerSite } from "@/lib/public/partnerSite";

/**
 * The embeddable form of an installer's designer promo, for an iframe on
 * their own site: no EasyLink chrome, no header or footer, just the section.
 *
 * Framing is controlled in middleware rather than here, because a
 * `frame-ancestors` directive has to arrive as a real response header and a
 * page cannot set one on itself. See the matching block in proxy.ts.
 *
 * The backend answers this page's branding read only for an origin the
 * installer registered, so an unregistered site gets a 404 rather than a
 * framed page it was never entitled to show.
 */
export const dynamic = "force-dynamic";

export default async function PartnerEmbedPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const h = await headers();

  // `Referer` is a full page URL, and the allowlist holds bare origins, so
  // the raw header never matched and only ever produced a 404. Reduced to its
  // origin here, which is what a browser sends in `Origin` and what the
  // backend compares against.
  const origin = h.get("origin") ?? refererOrigin(h.get("referer"));

  const site = await fetchPartnerSite(key, origin, "embed");
  if (!site) notFound();

  return <PartnerDesignerSection site={site} variant="section" />;
}

/** The bare origin of a Referer URL, or null when it is absent or unparseable. */
function refererOrigin(referer: string | null): string | null {
  if (!referer) return null;
  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}
