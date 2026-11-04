/**
 * Zip's availability and order-value limits for our merchant account, read
 * from the backend's public endpoint.
 *
 * Mirrors `afterpayConfig.ts`: public and unauthenticated, so a signed-out
 * visitor browsing the catalogue can be shown the right options, and cached
 * per page load because a catalogue of cards all want the same answer.
 *
 * One real difference from Afterpay worth knowing when reading this. Afterpay
 * publishes a per-merchant `/configuration` endpoint, so its limits are
 * authoritative for our account. Zip has no equivalent, so `min`/`max` here
 * are Zip's *published* product range — a wide one in AUD, because it spans
 * both Zip Pay (to $1,000) and Zip Money (to $50,000). An order inside the
 * range can still be declined: Zip decides from the shopper's own account and
 * credit limit, which we cannot see. So this hides orders Zip would certainly
 * refuse, and does not promise the rest will succeed.
 */

export type ZipConfig = {
  configured: boolean;
  /** Minor units (cents). Null means no bound is known for this currency. */
  min: number | null;
  max: number | null;
  /**
   * Whether the server is talking to Zip's sandbox. A Zip API key carries no
   * test/live marker, so this is the only signal — useful for keeping a "test
   * mode" notice out of a live storefront.
   */
  sandbox: boolean;
  /** The percentage built into Zip sale prices. */
  pricePercent: number;
  priceFixedMinor: number;
};

const UNAVAILABLE: ZipConfig = {
  configured: false,
  min: null,
  max: null,
  sandbox: false,
  pricePercent: 0,
  priceFixedMinor: 0,
};

function backendBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Shared across every caller on the page: a catalogue renders many cards and
 * they all want the same answer, so the request is made once per page load.
 */
let inFlight: Promise<ZipConfig> | null = null;

export function fetchZipConfig(): Promise<ZipConfig> {
  if (inFlight) return inFlight;

  const base = backendBaseUrl();
  if (!base) return Promise.resolve(UNAVAILABLE);

  inFlight = fetch(`${base}/payments/zip/config`)
    .then(async (res) => {
      if (!res.ok) return UNAVAILABLE;
      const json = (await res.json().catch(() => ({}))) as {
        data?: Partial<ZipConfig>;
      };
      const data = json.data;
      if (!data || typeof data.configured !== "boolean") return UNAVAILABLE;
      return {
        configured: data.configured,
        min: typeof data.min === "number" ? data.min : null,
        max: typeof data.max === "number" ? data.max : null,
        sandbox: data.sandbox === true,
        pricePercent: typeof data.pricePercent === "number" ? data.pricePercent : 0,
        priceFixedMinor: typeof data.priceFixedMinor === "number" ? data.priceFixedMinor : 0,
      };
    })
    // Zip being unreachable must never break the catalogue — it just means
    // the option is not offered this page load.
    .catch(() => UNAVAILABLE);

  return inFlight;
}

/** A price in minor units at the sale price for this payment method. */
export function methodPriceMinor(baseMinor: number, pricePercent: number): number {
  return pricePercent > 0 ? Math.round(baseMinor / (1 - pricePercent / 100)) : baseMinor;
}

/** Matches the backend: the fixed fee is carried once across the line's units. */
export function methodLineTotalMinor(
  unitMinor: number,
  quantity: number,
  option: { pricePercent: number; priceFixedMinor: number } | null,
): number {
  const percent = option?.pricePercent ?? 0;
  const extra = Math.ceil(methodPriceMinor(option?.priceFixedMinor ?? 0, percent) / quantity);
  return (methodPriceMinor(unitMinor, percent) + extra) * quantity;
}

/** True when `amountMinor` is inside Zip's range and Zip is usable. */
export function isZipPayable(
  config: ZipConfig | null,
  amountMinor: number,
): boolean {
  if (!config?.configured) return false;
  if (config.min !== null && amountMinor < config.min) return false;
  if (config.max !== null && amountMinor > config.max) return false;
  return true;
}
