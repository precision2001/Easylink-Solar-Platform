"use client";

import { useId, useState, type FormEvent } from "react";
import { QUOTE_BUTTON, QUOTE_FIELD, QUOTE_FOCUS, QuoteNotice } from "@/components/quotes/QuoteParts";
import {
  centsToDollarsInput,
  depositLabel,
  editedTotals,
  formatCents,
  lineCategoryLabel,
  lineTotal,
  previewDepositCents,
  quoteLines,
  quoteVersionLabel,
  signedDollarsToCents,
  type Quote,
  type UpdateQuoteInput,
} from "@/lib/quotes";

/** The equipment kinds the Design Platform uses, so edited lines group the same way. */
const CATEGORIES = ["solarPanel", "inverter", "battery", "evCharger", "heatPump", "other"];

type Row = {
  key: string;
  kind: "equipment" | "works";
  category: string;
  productId?: string;
  name: string;
  brand?: string;
  model?: string;
  note?: string;
  qty: string;
  price: string;
};

let seq = 0;
const nextKey = () => `row-${++seq}`;

function rowsFrom(quote: Quote): Row[] {
  const { equipment, extras } = quoteLines(quote);
  return [
    ...equipment.map((l) => ({
      key: nextKey(),
      kind: "equipment" as const,
      category: l.category || "other",
      productId: l.productId ?? undefined,
      name: l.name,
      brand: l.brand ?? undefined,
      model: l.model ?? undefined,
      qty: String(l.quantity),
      price: centsToDollarsInput(l.unitPriceCents),
    })),
    ...extras.map((l) => ({ key: nextKey(), kind: "works" as const, category: "", name: l.name, qty: String(l.quantity), price: centsToDollarsInput(l.unitPriceCents) })),
  ];
}

const qtyOf = (r: Row) => {
  const n = Number(r.qty);
  return r.qty.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Staff change a draft's line items and amounts by hand: add, remove or
 * change equipment and extras (quantity × unit price, GST inclusive), the
 * STC discount and other rebates. Totals and the deposit update as you type,
 * using the same rounding as the backend.
 */
export function QuoteLinesEditor({ quote, onSubmit, onCancel }: { quote: Quote; onSubmit: (patch: UpdateQuoteInput) => Promise<void>; onCancel: () => void }) {
  const uid = useId();
  const [rows, setRows] = useState<Row[]>(() => rowsFrom(quote));
  const [stc, setStc] = useState(centsToDollarsInput(quote.stcDiscountCents));
  const [rebate, setRebate] = useState(centsToDollarsInput(quote.rebateCents));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);

  const stcCents = signedDollarsToCents(stc);
  const rebateCents = signedDollarsToCents(rebate);
  const priced = rows.map((r) => ({ quantity: qtyOf(r) ?? 0, unitPriceCents: signedDollarsToCents(r.price) ?? 0 }));
  const { subtotalCents, totalCents } = editedTotals(priced, Math.max(0, stcCents ?? 0), Math.max(0, rebateCents ?? 0));
  const fixedDeposit = quote.depositMode === "FIXED" ? quote.depositCents : null;
  const depositCents = previewDepositCents(Math.max(0, totalCents), quote.depositMode, quote.depositPercent, fixedDeposit);

  const update = (key: string, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const remove = (key: string) => setRows((rs) => rs.filter((r) => r.key !== key));
  const add = (kind: Row["kind"]) =>
    setRows((rs) => [...rs, { key: nextKey(), kind, category: kind === "equipment" ? "other" : "", name: "", qty: "1", price: "" }]);

  function problem(): string | null {
    if (rows.length === 0) return "Add at least one line.";
    for (const r of rows) {
      if (!r.name.trim()) return "Every line needs a name.";
      if (qtyOf(r) === null) return `Check the quantity for “${r.name.trim()}”.`;
      if (signedDollarsToCents(r.price) === null) return `Check the unit price for “${r.name.trim()}”. Use dollars, for example 1250 or -500 for a discount.`;
    }
    if (stcCents === null || stcCents < 0) return "Enter the STC discount in dollars (0 if none).";
    if (rebateCents === null || rebateCents < 0) return "Enter the rebates in dollars (0 if none).";
    if (totalCents < 0) return "The STC discount and rebates are more than the lines add up to.";
    if (fixedDeposit !== null && fixedDeposit > totalCents) return `The fixed deposit of ${formatCents(fixedDeposit)} is more than the new total. Lower it in Edit first.`;
    return null;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    const p = problem();
    if (p) return setError(p);
    setBusy(true);
    setError(null);
    const line = (r: Row) => ({ name: r.name.trim(), quantity: qtyOf(r) ?? 0, unitPriceCents: signedDollarsToCents(r.price) ?? 0 });
    try {
      await onSubmit({
        lines: {
          equipment: rows
            .filter((r) => r.kind === "equipment")
            .map((r) => ({
              ...line(r),
              category: r.category || "other",
              ...(r.productId ? { productId: r.productId } : {}),
              ...(r.brand ? { brand: r.brand } : {}),
              ...(r.model ? { model: r.model } : {}),
            })),
          works: rows.filter((r) => r.kind === "works").map((r) => ({ ...line(r), ...(r.note ? { note: r.note } : {}) })),
        },
        stcDiscountCents: stcCents ?? 0,
        rebateCents: rebateCents ?? 0,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the lines.");
      setBusy(false);
    }
  }

  const section = (kind: Row["kind"], heading: string, addLabel: string) => {
    const list = rows.filter((r) => r.kind === kind);
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1 p-0 text-[14px] font-bold text-[#0F172A]">{heading}</legend>
        <div aria-hidden="true" className="hidden grid-cols-[minmax(0,1fr)_60px_108px_88px_44px] gap-2 px-1 text-[12px] font-semibold text-[#5B6B80] @[500px]:grid">
          <span>Item</span>
          <span>Qty</span>
          <span>Unit price</span>
          <span className="text-right">Line total</span>
          <span />
        </div>
        {list.length === 0 ? <p className="m-0 rounded-[10px] bg-[#F8FAFC] px-3 py-2.5 text-[13px] text-[#5B6B80]">No lines.</p> : null}
        {list.map((r) => {
          const q = qtyOf(r);
          const unit = signedDollarsToCents(r.price);
          const bad = touched && (!r.name.trim() || q === null || unit === null);
          const label = r.name.trim() || (kind === "equipment" ? "equipment line" : "extra");
          return (
            <div
              key={r.key}
              className={`grid grid-cols-[1fr_1fr_44px] gap-2 rounded-[12px] border p-2.5 @[500px]:grid-cols-[minmax(0,1fr)_60px_108px_88px_44px] @[500px]:items-start @[500px]:rounded-none @[500px]:border-0 @[500px]:border-b @[500px]:border-[#EEF2F6] @[500px]:px-1 @[500px]:py-2 ${
                bad ? "border-[#FCA5A5] @[500px]:bg-[#FEF2F2]" : "border-[#E3E8EF]"
              }`}
            >
              <div className="col-span-3 flex min-w-0 flex-col gap-1.5 @[500px]:col-span-1">
                <input
                  value={r.name}
                  onChange={(e) => update(r.key, { name: e.target.value })}
                  placeholder={kind === "equipment" ? "e.g. Jinko Tiger Neo 440 W" : "e.g. Switchboard upgrade"}
                  aria-label={`Name of ${label}`}
                  className={QUOTE_FIELD}
                />
                {kind === "equipment" ? (
                  <select
                    value={r.category}
                    onChange={(e) => update(r.key, { category: e.target.value })}
                    aria-label={`Kind of ${label}`}
                    className={`${QUOTE_FIELD.replace("w-full", "w-auto")} min-h-[36px] self-start py-1 text-[13px]`}
                  >
                    {(CATEGORIES.includes(r.category) ? CATEGORIES : [r.category, ...CATEGORIES]).map((c) => (
                      <option key={c} value={c}>
                        {lineCategoryLabel(c)}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5B6B80] @[500px]:block">
                <span className="@[500px]:sr-only">Qty</span>
                <input inputMode="decimal" value={r.qty} onChange={(e) => update(r.key, { qty: e.target.value })} aria-label={`Quantity of ${label}`} className={`${QUOTE_FIELD} px-2.5`} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#5B6B80] @[500px]:block">
                <span className="@[500px]:sr-only">Unit price ($)</span>
                <span className="relative block">
                  <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-[#5B6B80]">$</span>
                  <input inputMode="decimal" value={r.price} onChange={(e) => update(r.key, { price: e.target.value })} aria-label={`Unit price of ${label} in dollars`} className={`${QUOTE_FIELD} pl-6`} />
                </span>
              </label>
              <button
                type="button"
                onClick={() => remove(r.key)}
                aria-label={`Remove ${label}`}
                title="Remove line"
                className={`row-start-2 col-start-3 flex size-11 items-center justify-center self-end rounded-[10px] text-[20px] leading-none text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#B91C1C] @[500px]:col-start-5 @[500px]:row-start-1 @[500px]:self-start ${QUOTE_FOCUS}`}
              >
                ×
              </button>
              <p className="col-span-3 m-0 flex items-center justify-between text-[13.5px] @[500px]:col-span-1 @[500px]:col-start-4 @[500px]:row-start-1 @[500px]:min-h-[44px] @[500px]:justify-end">
                <span className="text-[#5B6B80] @[500px]:sr-only">Line total</span>
                <span className="font-bold tabular-nums text-[#0F172A]">{q !== null && unit !== null ? formatCents(lineTotal(q, unit)) : "—"}</span>
              </p>
            </div>
          );
        })}
        <button type="button" onClick={() => add(kind)} className={`${QUOTE_BUTTON.link} self-start`}>
          + {addLabel}
        </button>
      </fieldset>
    );
  };

  const money = (id: string, label: string, hint: string, value: string, set: (v: string) => void) => (
    <div className="flex items-center justify-between gap-3 px-3.5 py-2.5">
      <label htmlFor={id} className="flex flex-col text-[13.5px] font-semibold text-[#334155]">
        {label}
        <span className="text-[12px] font-normal text-[#5B6B80]">{hint}</span>
      </label>
      <span className="relative block w-[132px] shrink-0">
        <span aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[14px] text-[#5B6B80]">−$</span>
        <input id={id} inputMode="decimal" value={value} onChange={(e) => set(e.target.value)} className={`${QUOTE_FIELD} pl-8 text-right tabular-nums`} />
      </span>
    </div>
  );

  return (
    <form onSubmit={submit} className="@container flex flex-col gap-5" noValidate>
      <div className="flex flex-col gap-1">
        <h3 className="m-0 font-source-sans text-[18px] font-bold text-[#0F172A]">Lines and prices · {quoteVersionLabel(quote)}</h3>
        <p className="m-0 text-[13.5px] leading-[1.5] text-[#5B6B80]">
          Prices include GST. Use a negative unit price for a discount line. Reprice puts the pricing engine&rsquo;s prices back.
        </p>
      </div>

      {section("equipment", "Equipment", "Add equipment line")}
      {section("works", "Installation and extras", "Add extra")}

      <div className="flex flex-col divide-y divide-[#EEF2F6] rounded-[12px] border border-[#E3E8EF]">
        <div className="flex items-center justify-between px-3.5 py-2.5 text-[13.5px]">
          <span className="font-semibold text-[#334155]">Subtotal inc GST</span>
          <span className="font-bold tabular-nums text-[#0F172A]">{formatCents(subtotalCents)}</span>
        </div>
        {money(`${uid}-stc`, "STC discount", "Small-scale technology certificates", stc, setStc)}
        {money(`${uid}-rebate`, "Rebates", "e.g. Cheaper Home Batteries", rebate, setRebate)}
        <div className="flex items-center justify-between bg-[#F8FAFC] px-3.5 py-3">
          <span className="text-[14px] font-bold text-[#0F172A]">Total inc GST</span>
          <span className={`font-source-sans text-[22px] font-bold tabular-nums ${totalCents < 0 ? "text-[#B91C1C]" : "text-[#0F172A]"}`} aria-live="polite">
            {formatCents(totalCents)}
          </span>
        </div>
        <div className="flex items-center justify-between px-3.5 py-2.5 text-[13.5px]">
          <span className="text-[#5B6B80]">
            {depositLabel(quote)} · balance {formatCents(Math.max(0, totalCents - depositCents))}
          </span>
          <span className="font-bold tabular-nums text-[#7A4A00]">{formatCents(depositCents)}</span>
        </div>
      </div>

      {error ? <QuoteNotice>{error}</QuoteNotice> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={busy} className={QUOTE_BUTTON.primary}>
          {busy ? "Saving…" : "Save lines and prices"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={QUOTE_BUTTON.quiet}>
          Cancel
        </button>
      </div>
    </form>
  );
}
