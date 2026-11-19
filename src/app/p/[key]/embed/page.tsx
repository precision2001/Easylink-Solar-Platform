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
  const origin = h.get("origin") ?? h.get("referer") ?? null;

  const site = await fetchPartnerSite(key, origin);
  if (!site) notFound();

  return <PartnerDesignerSection site={site} variant="section" />;
}
