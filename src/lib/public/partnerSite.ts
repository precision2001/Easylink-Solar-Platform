/**
 * An installer's embedded Platform Designer: the landing page or section that
 * sits on their own website, in their colours.
 *
 * The partner key travels in the URL and is not a secret. What decides whether
 * a site may host an installer's designer is the origin allowlist the backend
 * checks, so this read returns null for an unknown key, a switched-off site
 * and an origin the installer never registered alike.
 */

export type PartnerSiteConfig = {
  key: string;
  companyName: string;
  websiteUrl: string | null;
  brandPrimary: string;
  brandOnPrimary: string;
  brandAccent: string | null;
  logoUrl: string | null;
  /** Elite installers: no EasyLink branding anywhere on the page. */
  whiteLabel: boolean;
};

function backendBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Hex colours only, and only from the backend's own response.
 *
 * These values are written into a `style` attribute. Anything that is not a
 * plain hex colour is dropped rather than passed through, so a malformed or
 * tampered record cannot inject CSS into an installer's page.
 */
const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

export function safeColour(value: unknown, fallback: string): string {
  return typeof value === "string" && HEX.test(value.trim()) ? value.trim() : fallback;
}

/** Only images served over https, for the same reason. */
function safeLogo(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    return new URL(value).protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

function safeUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

/**
 * Reads one partner site's branding.
 *
 * Runs on the server so the installer's visitors never wait on a second
 * round trip, and so a missing key renders as "not found" rather than
 * flashing an unbranded page first.
 */
export async function fetchPartnerSite(
  key: string,
  origin: string | null,
): Promise<PartnerSiteConfig | null> {
  const base = backendBaseUrl();
  if (!base) return null;

  try {
    const res = await fetch(
      `${base}/design-capture/partner/${encodeURIComponent(key)}`,
      {
        // The backend answers per origin, so the caller's origin is forwarded.
        headers: origin ? { Origin: origin } : {},
        cache: "no-store",
      },
    );
    if (!res.ok) return null;

    const json = (await res.json().catch(() => ({}))) as {
      data?: Partial<PartnerSiteConfig>;
    };
    const d = json.data;
    if (!d || typeof d.companyName !== "string" || !d.companyName.trim()) return null;

    return {
      key,
      companyName: d.companyName.trim().slice(0, 120),
      websiteUrl: safeUrl(d.websiteUrl),
      brandPrimary: safeColour(d.brandPrimary, "#F68A0A"),
      brandOnPrimary: safeColour(d.brandOnPrimary, "#3B1D00"),
      brandAccent: typeof d.brandAccent === "string" && HEX.test(d.brandAccent.trim())
        ? d.brandAccent.trim()
        : null,
      logoUrl: safeLogo(d.logoUrl),
      whiteLabel: d.whiteLabel === true,
    };
  } catch {
    // The installer's page must not break because our API is unreachable.
    return null;
  }
}

/**
 * Where the "Start designing" button goes.
 *
 * `?partner=<key>` is read by the existing attribution capture on the design
 * pages and travels with the saved design, which is what assigns the lead to
 * this installer. Nothing new is needed on the designer itself.
 */
export function designerHref(key: string): string {
  return `/designs?partner=${encodeURIComponent(key)}`;
}
