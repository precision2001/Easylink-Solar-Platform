import { aiRequest, AiNotConnectedError, type AiPortal } from "./client";

/** EasyLink Marketplace (Ready Sites and Ready Deals), as the AI platform returns it. */
export type MarketSystem = {
  panels?: { model: string; watts: number; count: number };
  inverter?: { model: string; kw: number; hybrid?: boolean };
  battery?: { model: string; usableKwh: number };
  extras: { name: string; qty: number }[];
};
export type Stcs = { solar: number; battery: number; total: number; value: number; price: number };

export type SiteStatus = "draft" | "review" | "live" | "sold" | "withdrawn";
export type ReadySite = {
  id: string;
  ref: string;
  rev: number;
  status: SiteStatus;
  createdBy: { kind: "easylink" | "installer"; id: string; name: string };
  customer: { name: string; phone?: string; email?: string; street?: string; customerId?: string; leadId?: string };
  suburb: string;
  state: string;
  postcode: string;
  roof?: string;
  storeys?: string;
  phases?: 1 | 3;
  system: MarketSystem;
  confirmed: { payment: boolean; depositPaid: number; installation: boolean; windowFrom?: string; windowTo?: string };
  contractValue: number;
  siteFee: number;
  documents: { name: string; fileId?: string }[];
  notes?: string;
  visibility: { area: "service_area" | "everyone"; eliteHeadStartHours: number; endsAt?: string };
  review?: { by: string; at: string; note?: string };
  publishedAt?: string;
  buyer?: { id: string; name: string; at: string; jobId: string };
  views: number;
  createdAt: string;
  updatedAt: string;
};
export type SiteEstimate = { contractExGst: number; stcValue: number; kit: number; labour: number; siteFeeExGst: number; margin: number; note: string };
export type PublicSite = {
  id: string;
  ref: string;
  status: SiteStatus;
  suburb: string;
  state: string;
  postcode: string;
  roof?: string;
  storeys?: string;
  phases?: 1 | 3;
  system: MarketSystem;
  kw: number;
  stcs: number;
  confirmed: ReadySite["confirmed"];
  contractValue: number;
  siteFee: number;
  documents: string[];
  source: "easylink" | "installer";
  publishedAt?: string;
  endsAt?: string;
  eliteHeadStartHours: number;
  views: number;
  sold: boolean;
  inArea?: boolean;
  estimate?: SiteEstimate;
};

export type DealItem = { category: "panel" | "inverter" | "battery" | "ev_charger" | "heat_pump" | "portable" | "other"; model: string; qty: number; watts?: number; kw?: number; hybrid?: boolean; usableKwh?: number };
export type DealType = "single" | "bundle" | "solar" | "battery" | "solar_battery" | "everything";
export type DealStatus = "draft" | "review" | "live" | "paused" | "ended" | "rejected";
export type ReadyDeal = {
  id: string;
  ref: string;
  status: DealStatus;
  installerId: string;
  installerName: string;
  type: DealType;
  title: string;
  description?: string;
  items: DealItem[];
  buildingTypes: ("house" | "townhouse" | "unit" | "business")[];
  price: number;
  wasPrice?: number;
  badge?: string;
  stockSource: "easylink" | "own";
  serviceAreas: string;
  quantity: number;
  sold: number;
  remaining: number;
  endsAt?: string;
  review?: { by: string; at: string; note?: string };
  publishedAt?: string;
  system: MarketSystem;
  kw: number;
  stcs: Stcs;
  warnings: string[];
  createdAt: string;
  updatedAt: string;
};
export type PublicDeal = {
  id: string;
  ref: string;
  type: DealType;
  title: string;
  description?: string;
  installerName: string;
  items: DealItem[];
  system: MarketSystem;
  kw: number;
  stcs: number;
  stcValue: number;
  price: number;
  wasPrice?: number;
  badge?: string;
  buildingTypes: string[];
  serviceAreas: string;
  remaining: number;
  endsAt?: string;
  deposit: number;
  refundPolicy: string[];
};
export type DealCheck = { system: MarketSystem; kw: number; stcs: Stcs; warnings: string[]; problems: string[] };
export type DealOrder = {
  id: string;
  ref: string;
  dealId: string;
  dealRef: string;
  installerId: string;
  jobId: string;
  customer: { name: string; phone: string; email: string; street: string; suburb: string; state: string; postcode: string; customerId: string };
  building: string;
  price: number;
  depositInvoiceId: string;
  status: "deposit_due" | "active" | "cancelled" | "refunded";
  cancel?: { at: string; by: string; reason: string; refund: number };
  createdAt: string;
  stage: string;
  milestones?: string[];
  installDates?: { day1: string; day2: string } | null;
  refundPolicy?: string[];
};
export type BuyResult = { orderRef: string; orderId: string; payToken: string; jobId: string; deposit: { invoiceId: string; number: string; amount: number }; balance: number; refundPolicy: string[] };

const j = (b: unknown) => ({ body: JSON.stringify(b ?? {}) });

/** Signed-in portals (installer, distributor/admin). */
export const market = {
  sites: <T = ReadySite[] | { forSale: PublicSite[]; mine: ReadySite[] }>(portal: AiPortal) => aiRequest<T>(portal, "/market/sites"),
  createSite: (portal: AiPortal, input: Partial<ReadySite>) => aiRequest<ReadySite>(portal, "/market/sites", { method: "POST", ...j(input) }),
  updateSite: (portal: AiPortal, id: string, input: Partial<ReadySite>) => aiRequest<ReadySite>(portal, `/market/sites/${encodeURIComponent(id)}`, { method: "PATCH", ...j(input) }),
  siteAction: <T = ReadySite>(portal: AiPortal, id: string, action: string, input: Record<string, unknown> = {}) => aiRequest<T>(portal, `/market/sites/${encodeURIComponent(id)}/${action}`, { method: "POST", ...j(input) }),
  deals: (portal: AiPortal) => aiRequest<ReadyDeal[]>(portal, "/market/deals"),
  checkDeal: (portal: AiPortal, input: Partial<ReadyDeal>) => aiRequest<DealCheck>(portal, "/market/deals/check", { method: "POST", ...j(input) }),
  createDeal: (portal: AiPortal, input: Partial<ReadyDeal>) => aiRequest<ReadyDeal>(portal, "/market/deals", { method: "POST", ...j(input) }),
  updateDeal: (portal: AiPortal, id: string, input: Partial<ReadyDeal>) => aiRequest<ReadyDeal>(portal, `/market/deals/${encodeURIComponent(id)}`, { method: "PATCH", ...j(input) }),
  dealAction: (portal: AiPortal, id: string, action: string, input: Record<string, unknown> = {}) => aiRequest<ReadyDeal>(portal, `/market/deals/${encodeURIComponent(id)}/${action}`, { method: "POST", ...j(input) }),
  orders: (portal: AiPortal) => aiRequest<DealOrder[]>(portal, "/market/orders"),
  cancelOrder: (portal: AiPortal, id: string, input: { reason: string; refund?: number }) => aiRequest<DealOrder>(portal, `/market/orders/${encodeURIComponent(id)}/cancel`, { method: "POST", ...j(input) }),
  orderForJob: (portal: AiPortal, jobId: string) => aiRequest<DealOrder | null>(portal, `/jobs/${encodeURIComponent(jobId)}/order`),
};

/** The public website (no sign-in). */
async function pub<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api/public/market${path}`, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) }, cache: "no-store" });
  let json: { data?: T; message?: string; code?: string } = {};
  try {
    json = await res.json();
  } catch {
    /* empty */
  }
  if (res.status === 503 && json.code === "AI_NOT_CONFIGURED") throw new AiNotConnectedError(json.message ?? "Unavailable");
  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data as T;
}
export const publicMarket = {
  deals: (q: Record<string, string | number | undefined> = {}) => {
    const s = new URLSearchParams(Object.entries(q).filter(([, v]) => v !== undefined && v !== "" && v !== "all").map(([k, v]) => [k, String(v)]));
    return pub<PublicDeal[]>(`/deals${s.toString() ? `?${s}` : ""}`);
  },
  deal: (id: string) => pub<PublicDeal>(`/deals/${encodeURIComponent(id)}`),
  sites: () => pub<PublicSite[]>("/sites"),
  buy: (id: string, input: Record<string, unknown>) => pub<BuyResult>(`/deals/${encodeURIComponent(id)}/buy`, { method: "POST", body: JSON.stringify(input) }),
  pay: (orderId: string, token: string) => pub<{ payUrl: string | null; paid: boolean }>(`/orders/${encodeURIComponent(orderId)}/pay`, { method: "POST", body: JSON.stringify({ token }) }),
};

export type AiPortalForDeals = AiPortal;
export const aud = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");
export const DEAL_TYPES: { key: DealType; label: string }[] = [
  { key: "solar", label: "Solar" },
  { key: "battery", label: "Battery" },
  { key: "solar_battery", label: "Solar + battery" },
  { key: "everything", label: "Everything" },
  { key: "bundle", label: "Bundle" },
  { key: "single", label: "Single item" },
];
export const dealTypeLabel = (t: DealType) => DEAL_TYPES.find((x) => x.key === t)?.label ?? t;

/** One line describing a system, e.g. "6.6 kW solar · 5 kW hybrid inverter · 10 kWh battery". */
export function systemLine(s: MarketSystem, kw?: number) {
  const parts: string[] = [];
  const k = kw ?? (s.panels ? Math.round((s.panels.watts * s.panels.count) / 10) / 100 : 0);
  if (k) parts.push(`${k} kW solar (${s.panels?.count} × ${s.panels?.watts} W)`);
  if (s.inverter) parts.push(`${s.inverter.kw} kW ${s.inverter.hybrid ? "hybrid " : ""}inverter`);
  if (s.battery) parts.push(`${s.battery.usableKwh} kWh battery`);
  for (const e of s.extras ?? []) parts.push(e.qty > 1 ? `${e.name} × ${e.qty}` : e.name);
  return parts.join(" · ") || "No equipment yet";
}

/** Equipment installers pick from when building a deal (they can type their own too). */
export const CATALOGUE: (DealItem & { sku: string })[] = [
  { sku: "PNL-AX440", category: "panel", model: "AXITEC 440 W panel", qty: 15, watts: 440 },
  { sku: "PNL-TR440", category: "panel", model: "TRINA Vertex S+ 440 W panel", qty: 15, watts: 440 },
  { sku: "INV-S5", category: "inverter", model: "Sungrow 5 kW inverter", qty: 1, kw: 5 },
  { sku: "INV-FX5H", category: "inverter", model: "FOXESS 5 kW hybrid inverter", qty: 1, kw: 5, hybrid: true },
  { sku: "INV-FX99", category: "inverter", model: "FOXESS 9.9 kW hybrid inverter", qty: 1, kw: 9.9, hybrid: true },
  { sku: "BAT-100S", category: "battery", model: "10 kWh stackable battery", qty: 1, usableKwh: 10 },
  { sku: "BAT-EQ4880", category: "battery", model: "FOXESS EQ4880 9.2 kWh battery", qty: 1, usableKwh: 9.2 },
  { sku: "BAT-FX4660", category: "battery", model: "FOXESS 32.6 kWh battery", qty: 1, usableKwh: 32.6 },
  { sku: "EVC-ZAP7", category: "ev_charger", model: "myenergi zappi 7 kW EV charger", qty: 1 },
  { sku: "HWP-RC270", category: "heat_pump", model: "Reclaim 270 L heat pump", qty: 1 },
  { sku: "BLU-AC180", category: "portable", model: "BLUETTI AC180 portable power station", qty: 1 },
];
