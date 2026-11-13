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
  /** Ticked: goes into the edited quote. Unticked lines stay on screen (greyed) so they can be ticked again. */
  include: boolean;
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
      include: true,
    })),
    ...extras.map((l) => ({
      key: nextKey(),
      kind: "works" as const,
      category: "",
      name: l.name,
      qty: String(l.quantity),
      price: centsToDollarsInput(l.unitPriceCents),
      include: true,
    })),
  ];
}

const isPanelRow = (r: Row) => r.kind === "equipment" && /panel/i.test(r.category);
const isBatteryRow = (r: Row) => r.kind === "equipment" && /batter/i.test(r.category);

/** Battery STCs inside the quote's rebates when it was priced (the engine puts them there). */
function pricedBatteryStcCents(quote: Quote): number {
  const lines = (quote.snapshot as { stcLines?: { kind?: string; valueCents?: number }[] } | null)?.stcLines;
  return Array.isArray(lines) ? lines.filter((l) => l.kind === "BATTERY").reduce((t, l) => t + (Number(l.valueCents) || 0), 0) : 0;
}

const qtyOf = (r: Row) => {
  const n = Number(r.qty);
  return r.qty.trim() !== "" && Number.isFinite(n) && n >= 0 ? n : null;
};

/**
 * Staff edit a quote's items (the Edit button): tick the items that go into
 * the edited quote, change names, quantities and prices (GST inclusive), add
 * lines, and set the STC discount and other rebates. Unticked items are left
 * out but stay on screen to tick again. Totals and the deposit update as you
 * type, using the same rounding as the backend.
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
  const chosen = rows.filter((r) => r.include);
  const leftOut = rows.length - chosen.length;
  const leftOutEquipment = rows.filter((r) => r.kind === "equipment" && !r.include).length;
  const hasPanels = chosen.some(isPanelRow);
  const hasBattery = chosen.some(isBatteryRow);
  const priced = chosen.map((r) => ({ quantity: qtyOf(r) ?? 0, unitPriceCents: signedDollarsToCents(r.price) ?? 0 }));
  const { subtotalCents, totalCents } = editedTotals(priced, Math.max(0, stcCents ?? 0), Math.max(0, rebateCents ?? 0));
  const fixedDeposit = quote.depositMode === "FIXED" ? quote.depositCents : null;
  const depositCents = previewDepositCents(Math.max(0, totalCents), quote.depositMode, quote.depositPercent, fixedDeposit);

  /**
   * STCs follow the ticked items (owner rule): no solar STCs without solar
   * panels, no battery STCs without a battery. Ticking them back restores the
   * priced amounts. The backend checks again when the quote is saved.
   */
  const batteryStcCents = pricedBatteryStcCents(quote);
  const applyStcRules = (prev: Row[], next: Row[]) => {
    const had = { panels: prev.some((r) => r.include && isPanelRow(r)), battery: prev.some((r) => r.include && isBatteryRow(r)) };
    const has = { panels: next.some((r) => r.include && isPanelRow(r)), battery: next.some((r) => r.include && isBatteryRow(r)) };
    if (had.panels && !has.panels) setStc("0");
    if (!had.panels && has.panels && (signedDollarsToCents(stc) ?? 0) === 0) setStc(centsToDollarsInput(quote.stcDiscountCents));
    if (batteryStcCents > 0 && had.battery !== has.battery) {
      const now = signedDollarsToCents(rebate) ?? 0;
      setRebate(centsToDollarsInput(Math.max(0, has.battery ? now + batteryStcCents : now - batteryStcCents)));
    }
  };
  const update = (key: string, patch: Partial<Row>) => {
    const next = rows.map((r) => (r.key === key ? { ...r, ...patch } : r));
    if ("include" in patch || "category" in patch) applyStcRules(rows, next);
    setRows(next);
  };
  const remove = (key: string) => {
    const next = rows.filter((r) => r.key !== key);
    applyStcRules(rows, next);
    setRows(next);
  };
  const add = (kind: Row["kind"]) =>
    setRows((rs) => [...rs, { key: nextKey(), kind, category: kind === "equipment" ? "other" : "", name: "", qty: "1", price: "", include: true }]);
  const tickAll = (kind: Row["kind"], include: boolean) => {
    const next = rows.map((r) => (r.kind === kind ? { ...r, include } : r));
    applyStcRules(rows, next);
    setRows(next);
  };

  function problem(): string | null {
    if (chosen.length === 0) return "Tick at least one item for the edited quote.";
    for (const r of chosen) {
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
          equipment: chosen
            .filter((r) => r.kind === "equipment")
            .map((r) => ({
              ...line(r),
              category: r.category || "other",
              ...(r.productId ? { productId: r.productId } : {}),
              ...(r.brand ? { brand: r.brand } : {}),
              ...(r.model ? { model: r.model } : {}),
            })),
          works: chosen.filter((r) => r.kind === "works").map((r) => ({ ...line(r), ...(r.note ? { note: r.note } : {}) })),
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
    const ticked = list.filter((r) => r.include).length;
    return (
      <fieldset className="m-0 flex min-w-0 flex-col gap-2 border-0 p-0">
        <legend className="mb-1 flex w-full items-center justify-between gap-3 p-0">
          <span className="text-[14px] font-bold text-[#0F172A]">{heading}</span>
          {list.length ? (
            <label className="flex min-h-[44px] cursor-pointer items-center gap-2 text-[13px] font-semibold text-[#334155]">
              <input
                type="checkbox"
                checked={ticked === list.length}
                ref={(el) => {
                  if (el) el.indeterminate = ticked > 0 && ticked < list.length;
                }}
                onChange={(e) => tickAll(kind, e.target.checked)}
                className="size-[18px] accent-[#1560B8]"
              />
              {ticked === list.length ? "All in" : `${ticked} of ${list.length} in`}
            </label>
          ) : null}
        </legend>
        <div aria-hidden="true" className="hidden grid-cols-[32px_minmax(0,1fr)_60px_108px_88px_44px] gap-2 px-1 text-[12px] font-semibold text-[#5B6B80] @[500px]:grid">
          <span />
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
          const bad = touched && r.include && (!r.name.trim() || q === null || unit === null);
          const label = r.name.trim() || (kind === "equipment" ? "equipment line" : "extra");
          return (
            <div
              key={r.key}
              className={`grid grid-cols-[32px_1fr_1fr_44px] gap-2 rounded-[12px] border p-2.5 @[500px]:grid-cols-[32px_minmax(0,1fr)_60px_108px_88px_44px] @[500px]:items-start @[500px]:rounded-none @[500px]:border-0 @[500px]:border-b @[500px]:border-[#EEF2F6] @[500px]:px-1 @[500px]:py-2 ${
                bad ? "border-[#FCA5A5] @[500px]:bg-[#FEF2F2]" : "border-[#E3E8EF]"
              } ${r.include ? "" : "opacity-55"}`}
            >
              <label className="row-span-2 flex size-11 cursor-pointer items-center justify-center self-start @[500px]:row-span-1 @[500px]:size-auto @[500px]:min-h-[44px] @[500px]:w-8">
                <input
                  type="checkbox"
                  checked={r.include}
                  onChange={(e) => update(r.key, { include: e.target.checked })}
                  aria-label={`Include ${label} in the edited quote`}
                  className="size-[18px] accent-[#1560B8]"
                />
              </label>
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
              <label className="col-start-2 flex flex-col gap-1 text-[12px] font-semibold text-[#5B6B80] @[500px]:col-start-auto @[500px]:block">
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
                className={`row-start-2 col-start-4 flex size-11 items-center justify-center self-end rounded-[10px] text-[20px] leading-none text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#B91C1C] @[500px]:col-start-6 @[500px]:row-start-1 @[500px]:self-start ${QUOTE_FOCUS}`}
              >
                ×
              </button>
              <p className="col-span-3 col-start-2 m-0 flex items-center justify-between text-[13.5px] @[500px]:col-span-1 @[500px]:col-start-5 @[500px]:row-start-1 @[500px]:min-h-[44px] @[500px]:justify-end">
                <span className="text-[#5B6B80] @[500px]:sr-only">Line total</span>
                <span className={`font-bold tabular-nums ${r.include ? "text-[#0F172A]" : "text-[#94A3B8] line-through"}`}>
                  {q !== null && unit !== null ? formatCents(lineTotal(q, unit)) : "—"}
                </span>
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
        <h3 className="m-0 font-source-sans text-[18px] font-bold text-[#0F172A]">Edit quote · {quoteVersionLabel(quote)}</h3>
        <p className="m-0 text-[13.5px] leading-[1.5] text-[#5B6B80]">
          Tick the items that go into the edited quote, and change names, quantities and prices as needed. Prices include GST. Use a negative unit price for a discount line. Reprice puts the pricing engine&rsquo;s prices back.
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
        {!hasPanels ? (
          <p className="m-0 bg-[#FFF8EB] px-3.5 py-2 text-[12.5px] leading-snug text-[#7A4A00]">
            No solar panels in this quote, so no solar STCs.{(stcCents ?? 0) > 0 ? " They come off when you save." : ""}
          </p>
        ) : leftOutEquipment > 0 ? (
          <p className="m-0 bg-[#FFF8EB] px-3.5 py-2 text-[12.5px] leading-snug text-[#7A4A00]">
            Some equipment is left out. Solar STCs are checked against the panels in the quote when you save.
          </p>
        ) : null}
        {money(`${uid}-rebate`, "Rebates", "e.g. Cheaper Home Batteries", rebate, setRebate)}
        {!hasBattery && batteryStcCents > 0 ? (
          <p className="m-0 bg-[#FFF8EB] px-3.5 py-2 text-[12.5px] leading-snug text-[#7A4A00]">
            No battery in this quote, so its battery STCs ({formatCents(batteryStcCents)}) are taken out of the rebates.
          </p>
        ) : null}
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
          {busy ? "Saving…" : leftOut ? `Save edited quote (${chosen.length} of ${rows.length} items)` : "Save edited quote"}
        </button>
        <button type="button" onClick={onCancel} disabled={busy} className={QUOTE_BUTTON.quiet}>
          Cancel
        </button>
      </div>
    </form>
  );
}
