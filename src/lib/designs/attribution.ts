/**
 * Marketing attribution for design leads: which ad, campaign, referral or
 * partner link brought the visitor. Captured when a design page loads and
 * sent with the saved design, so every lead in the funnel carries its source.
 *
 * Rule: a visit that arrives with tags replaces what is stored (last tagged
 * touch wins, so the ad that actually brought them back gets the credit); an
 * untagged visit keeps the stored tags for up to 90 days.
 */

export type DesignAttribution = {
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmTerm?: string;
  utmContent?: string;
  gclid?: string;
  fbclid?: string;
  ref?: string;
  partner?: string;
  landingPage?: string;
  referrer?: string;
  firstSeenAt?: string;
};

export const ATTRIBUTION_STORAGE_KEY = "easylink:attribution";
const MAX_AGE_MS = 90 * 24 * 60 * 60 * 1000;

const PARAMS: [string, keyof DesignAttribution, number][] = [
  ["utm_source", "utmSource", 200],
  ["utm_medium", "utmMedium", 200],
  ["utm_campaign", "utmCampaign", 200],
  ["utm_term", "utmTerm", 200],
  ["utm_content", "utmContent", 200],
  ["gclid", "gclid", 500],
  ["fbclid", "fbclid", 500],
  ["ref", "ref", 32],
  ["partner", "partner", 100],
];

/** The tags on one page load; `null` when the URL carries none. */
export function readTags(search: string): DesignAttribution | null {
  const params = new URLSearchParams(search);
  const tags: DesignAttribution = {};
  for (const [param, key, max] of PARAMS) {
    const value = params.get(param)?.trim();
    if (value) tags[key] = value.slice(0, max);
  }
  return Object.keys(tags).length ? tags : null;
}

/** Same-origin referrers are internal navigation, not a source. */
function externalReferrer(referrer: string, origin: string): string | undefined {
  if (!referrer) return undefined;
  try {
    return new URL(referrer).origin === origin ? undefined : referrer.slice(0, 2048);
  } catch {
    return undefined;
  }
}

/**
 * Decides what to store after this page load. Pure, so it can be tested
 * without a browser.
 */
export function nextAttribution(input: {
  stored: DesignAttribution | null;
  search: string;
  referrer: string;
  origin: string;
  path: string;
  now: Date;
}): DesignAttribution {
  const tags = readTags(input.search);
  const stored = input.stored;
  const fresh =
    stored?.firstSeenAt && input.now.getTime() - Date.parse(stored.firstSeenAt) < MAX_AGE_MS;

  if (!tags && stored && fresh) return stored;

  return {
    ...(tags ?? {}),
    landingPage: input.path.slice(0, 2048),
    ...(externalReferrer(input.referrer, input.origin)
      ? { referrer: externalReferrer(input.referrer, input.origin) }
      : {}),
    firstSeenAt: input.now.toISOString(),
  };
}

function readStored(): DesignAttribution | null {
  try {
    const raw = window.localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DesignAttribution) : null;
  } catch {
    return null;
  }
}

/** Call once when a design page loads. */
export function captureAttribution(): void {
  if (typeof window === "undefined") return;
  const next = nextAttribution({
    stored: readStored(),
    search: window.location.search,
    referrer: document.referrer,
    origin: window.location.origin,
    path: window.location.pathname + window.location.search,
    now: new Date(),
  });
  try {
    window.localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Private mode or storage full: the lead is still saved, just untagged.
  }
}

/** What to send with the saved design. */
export function getAttribution(): DesignAttribution | undefined {
  if (typeof window === "undefined") return undefined;
  return readStored() ?? undefined;
}
