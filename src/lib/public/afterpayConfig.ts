/**
 * Afterpay's live availability and order-value limits for our merchant
 * account, read from the backend's public endpoint.
 *
 * Public and unauthenticated, so a signed-out visitor browsing the catalogue
 * can be shown the right options. The limits come from Afterpay itself rather
 * than a hardcoded range — they differ per merchant and Afterpay changes them
 * without notice — which is what stops us offering Afterpay on a A$22,000
 * battery it would refuse.
 */

export type AfterpayConfig = {
  configured: boolean;
  /** Minor units (cents). Null means Afterpay did not state a bound. */
  min: number | null;
  max: number | null;
  /** The percentage built into Afterpay sale prices. */
  pricePercent: number;
  priceFixedMinor: number;
};

const UNAVAILABLE: AfterpayConfig = { configured: false, min: null, max: null, pricePercent: 0, priceFixedMinor: 0 };

function backendBaseUrl(): string | null {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_BASE_URL;
  return url ? url.replace(/\/$/, "") : null;
}

/**
 * Shared across every caller on the page: a catalogue renders many cards and
 * they all want the same answer, so the request is made once per page load.
 */
let inFlight: Promise<AfterpayConfig> | null = null;

export function fetchAfterpayConfig(): Promise<AfterpayConfig> {
  if (inFlight) return inFlight;

  const base = backendBaseUrl();
  if (!base) return Promise.resolve(UNAVAILABLE);

  inFlight = fetch(`${base}/payments/afterpay/config`)
    .then(async (res) => {
      if (!res.ok) return UNAVAILABLE;
      const json = (await res.json().catch(() => ({}))) as {
        data?: Partial<AfterpayConfig>;
      };
      const data = json.data;
      if (!data || typeof data.configured !== "boolean") return UNAVAILABLE;
      return {
        configured: data.configured,
        min: typeof data.min === "number" ? data.min : null,
        max: typeof data.max === "number" ? data.max : null,
        pricePercent: typeof data.pricePercent === "number" ? data.pricePercent : 0,
        priceFixedMinor: typeof data.priceFixedMinor === "number" ? data.priceFixedMinor : 0,
      };
    })
    // Afterpay being unreachable must never break the catalogue — it just
    // means the option is not offered this page load.
    .catch(() => UNAVAILABLE);

  return inFlight;
}

let zipInFlight: Promise<AfterpayConfig> | null = null;

/** Zip's availability and the order range it is offered for. Same shape as Afterpay's. */
export function fetchZipConfig(): Promise<AfterpayConfig> {
  if (zipInFlight) return zipInFlight;

  const base = backendBaseUrl();
  if (!base) return Promise.resolve(UNAVAILABLE);

  zipInFlight = fetch(`${base}/payments/zip/config`)
    .then(async (res) => {
      if (!res.ok) return UNAVAILABLE;
      const json = (await res.json().catch(() => ({}))) as { data?: Partial<AfterpayConfig> };
      const data = json.data;
      if (!data || typeof data.configured !== "boolean") return UNAVAILABLE;
      return {
        configured: data.configured,
        min: typeof data.min === "number" ? data.min : null,
        max: typeof data.max === "number" ? data.max : null,
        pricePercent: typeof data.pricePercent === "number" ? data.pricePercent : 0,
        priceFixedMinor: typeof data.priceFixedMinor === "number" ? data.priceFixedMinor : 0,
      };
    })
    .catch(() => UNAVAILABLE);

  return zipInFlight;
}

/** True when `amountMinor` is inside the provider's range and it is usable. */
export function isAfterpayPayable(
  config: AfterpayConfig | null,
  amountMinor: number,
): boolean {
  if (!config?.configured) return false;
  if (config.min !== null && amountMinor < config.min) return false;
  if (config.max !== null && amountMinor > config.max) return false;
  return true;
}
