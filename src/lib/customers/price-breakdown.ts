import { effectiveStatus, quoteLines, type Quote, type QuoteLine } from "@/lib/quotes";

/**
 * "Price, rebates and finance" in the customer portal: one quote laid out
 * line by line. Every figure comes from the quote the backend sent; nothing
 * here estimates a price or a rebate.
 */

export type BreakdownRow = { label: string; detail?: string; cents: number; kind: "item" | "works" | "rebate" | "total" };

/** The quote to explain: the accepted one, else the newest still open, else the newest. */
export function pickQuote(quotes: Quote[], now = new Date()): Quote | null {
  if (!quotes.length) return null;
  const accepted = quotes.find((q) => q.status === "ACCEPTED");
  if (accepted) return accepted;
  const open = quotes.filter((q) => ["SENT", "VIEWED"].includes(effectiveStatus(q, now)));
  const newest = (xs: Quote[]) => [...xs].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))[0] ?? null;
  return newest(open) ?? newest(quotes);
}

function lineDetail(l: QuoteLine): string | undefined {
  const parts = [l.brand, l.model].filter((x): x is string => !!x && !l.name.includes(x));
  const qty = l.quantity > 1 ? `${l.quantity} ×` : "";
  const s = [qty, parts.join(" ")].filter(Boolean).join(" ");
  return s || undefined;
}

export function breakdown(q: Quote): { rows: BreakdownRow[]; savedCents: number } {
  const { equipment, extras } = quoteLines(q);
  const rows: BreakdownRow[] = [
    ...equipment.map((l) => ({ label: l.name, detail: lineDetail(l), cents: l.totalCents, kind: "item" as const })),
    ...extras.map((l) => ({ label: l.name, detail: lineDetail(l), cents: l.totalCents, kind: "works" as const })),
  ];
  if (q.stcDiscountCents > 0) rows.push({ label: "Solar STCs (federal)", detail: "Small-scale technology certificates", cents: -q.stcDiscountCents, kind: "rebate" });
  if (q.rebateCents > 0) rows.push({ label: "Other rebates", detail: "Including battery rebates you qualify for", cents: -q.rebateCents, kind: "rebate" });
  rows.push({ label: "You pay", detail: "Including GST", cents: q.totalCents, kind: "total" });
  return { rows, savedCents: Math.max(0, q.stcDiscountCents) + Math.max(0, q.rebateCents) };
}

/** Extras and works lines only (switchboard, phase upgrade and so on). */
export function worksLines(q: Quote | null): QuoteLine[] {
  return q ? quoteLines(q).extras : [];
}
