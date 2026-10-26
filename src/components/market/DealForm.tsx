"use client";

import { useEffect, useMemo, useState } from "react";
import { Btn, Field, inputCls, Pill } from "@/components/jobs/ui";
import { aud, CATALOGUE, DEAL_TYPES, market, systemLine, type AiPortalForDeals, type DealCheck, type DealItem, type ReadyDeal } from "@/lib/ai-platform/market";

export type DealInput = Partial<ReadyDeal>;

const CATS: { key: DealItem["category"]; label: string }[] = [
  { key: "panel", label: "Panel" },
  { key: "inverter", label: "Inverter" },
  { key: "battery", label: "Battery" },
  { key: "ev_charger", label: "EV charger" },
  { key: "heat_pump", label: "Heat pump" },
  { key: "portable", label: "Portable power" },
  { key: "other", label: "Other" },
];

const blank = (): DealInput => ({
  type: "solar_battery",
  title: "",
  description: "",
  items: CATALOGUE.filter((c) => ["PNL-AX440", "INV-FX5H", "BAT-100S"].includes(c.sku)).map(({ sku, ...i }) => (void sku, i)),
  buildingTypes: ["house", "townhouse"],
  price: 0,
  stockSource: "easylink",
  serviceAreas: "",
  quantity: 10,
});

/**
 * Build a Ready Deal: equipment from the catalogue (or typed in), with live
 * checks for the 133% rule, hybrid inverters and 10 kVA, and the STC value the
 * price already includes. Then price, was-price, badge, how many, end date and
 * the postcodes the installer covers. EasyLink approves before it goes live.
 */
export function DealForm({ portal, initial, busy, error, onSave }: { portal: AiPortalForDeals; initial?: ReadyDeal; busy: boolean; error: string | null; onSave: (input: DealInput, submit: boolean) => void }) {
  const [d, setD] = useState<DealInput>(() => (initial ? structuredClone(initial) : blank()));
  const [check, setCheck] = useState<DealCheck | null>(null);
  const up = (patch: Partial<DealInput>) => setD((x) => ({ ...x, ...patch }));
  const items = d.items ?? [];
  const setItem = (i: number, patch: Partial<DealItem>) => up({ items: items.map((x, j) => (j === i ? { ...x, ...patch } : x)) });

  const key = JSON.stringify([d.items, d.price, d.title, d.serviceAreas, d.wasPrice, d.quantity]);
  useEffect(() => {
    const t = setTimeout(() => {
      market.checkDeal(portal, d).then(setCheck).catch(() => undefined);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, portal]);

  const listPrice = useMemo(() => (check ? d.price! + check.stcs.value : 0), [check, d.price]);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="Deal type">
          <select className={inputCls} value={d.type} onChange={(e) => up({ type: e.target.value as ReadyDeal["type"] })}>
            {DEAL_TYPES.map((t) => (
              <option key={t.key} value={t.key}>
                {t.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Title customers see">
            <input className={inputCls} maxLength={90} placeholder="6.6 kW solar + 10 kWh battery, installed" value={d.title ?? ""} onChange={(e) => up({ title: e.target.value })} />
          </Field>
        </div>
      </div>
      <Field label="Description">
        <textarea className={`${inputCls} min-h-[60px]`} maxLength={1200} value={d.description ?? ""} onChange={(e) => up({ description: e.target.value })} />
      </Field>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[14px] font-bold text-[#0F172A]">Equipment</span>
          <select
            className={`${inputCls} w-auto`}
            value=""
            onChange={(e) => {
              const c = CATALOGUE.find((x) => x.sku === e.target.value);
              if (c) {
                const { sku, ...i } = c;
                void sku;
                up({ items: [...items, i] });
              }
            }}
          >
            <option value="">Add from the catalogue…</option>
            {CATALOGUE.map((c) => (
              <option key={c.sku} value={c.sku}>
                {c.model}
              </option>
            ))}
          </select>
        </div>
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-2 items-end gap-2 rounded-[10px] border border-[#E3E8EF] p-2 sm:grid-cols-[120px_1fr_70px_90px_auto]">
            <Field label="Type">
              <select className={inputCls} value={it.category} onChange={(e) => setItem(i, { category: e.target.value as DealItem["category"] })}>
                {CATS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Model">
              <input className={inputCls} value={it.model} onChange={(e) => setItem(i, { model: e.target.value })} />
            </Field>
            <Field label="Qty">
              <input className={inputCls} type="number" min={1} value={it.qty} onChange={(e) => setItem(i, { qty: Math.max(1, num(e.target.value)) })} />
            </Field>
            {it.category === "panel" && (
              <Field label="Watts">
                <input className={inputCls} type="number" value={it.watts ?? 0} onChange={(e) => setItem(i, { watts: num(e.target.value) })} />
              </Field>
            )}
            {it.category === "inverter" && (
              <Field label="kW">
                <input className={inputCls} type="number" step={0.1} value={it.kw ?? 0} onChange={(e) => setItem(i, { kw: num(e.target.value) })} />
              </Field>
            )}
            {it.category === "battery" && (
              <Field label="Usable kWh">
                <input className={inputCls} type="number" step={0.1} value={it.usableKwh ?? 0} onChange={(e) => setItem(i, { usableKwh: num(e.target.value) })} />
              </Field>
            )}
            {!["panel", "inverter", "battery"].includes(it.category) && <span />}
            <div className="flex items-center gap-2 pb-1.5">
              {it.category === "inverter" && (
                <label className="flex items-center gap-1 text-[12.5px]">
                  <input type="checkbox" checked={!!it.hybrid} onChange={(e) => setItem(i, { hybrid: e.target.checked })} /> Hybrid
                </label>
              )}
              <Btn small kind="ghost" onClick={() => up({ items: items.filter((_, j) => j !== i) })}>
                Remove
              </Btn>
            </div>
          </div>
        ))}
        {check && (
          <div className="flex flex-col gap-1.5 rounded-[10px] bg-[#F8FAFC] p-3 text-[13px] text-[#334155]">
            <span>
              <b>{systemLine(check.system, check.kw)}</b>
            </span>
            {check.stcs.total > 0 && (
              <span>
                {check.stcs.total} STCs ({check.stcs.solar} solar, {check.stcs.battery} battery) at {aud(check.stcs.price)} = <b>{aud(check.stcs.value)}</b>, already taken off your price.
              </span>
            )}
            {check.warnings.map((w) => (
              <span key={w} className="text-[#92400E]">
                ⚠ {w}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Price after STCs (incl. GST)" hint={listPrice ? `= ${aud(listPrice)} before STCs` : undefined}>
          <input className={inputCls} type="number" min={0} value={d.price ?? 0} onChange={(e) => up({ price: num(e.target.value) })} />
        </Field>
        <Field label="Was-price (optional)">
          <input className={inputCls} type="number" min={0} value={d.wasPrice ?? ""} onChange={(e) => up({ wasPrice: e.target.value ? num(e.target.value) : undefined })} />
        </Field>
        <Field label="Badge (optional)">
          <input className={inputCls} maxLength={24} placeholder="Spring deal" value={d.badge ?? ""} onChange={(e) => up({ badge: e.target.value })} />
        </Field>
        <Field label="How many to sell">
          <input className={inputCls} type="number" min={1} value={d.quantity ?? 10} onChange={(e) => up({ quantity: Math.max(1, num(e.target.value)) })} />
        </Field>
        <div className="col-span-2">
          <Field label="Postcodes you install in" hint='Ranges and single postcodes, e.g. "2145-2155, 2112"'>
            <input className={inputCls} value={d.serviceAreas ?? ""} onChange={(e) => up({ serviceAreas: e.target.value })} />
          </Field>
        </div>
        <Field label="Ends (optional)">
          <input className={inputCls} type="date" value={d.endsAt ?? ""} onChange={(e) => up({ endsAt: e.target.value })} />
        </Field>
        <Field label="Stock from">
          <select className={inputCls} value={d.stockSource} onChange={(e) => up({ stockSource: e.target.value as "easylink" | "own" })}>
            <option value="easylink">EasyLink warehouse</option>
            <option value="own">My own supplier</option>
          </select>
        </Field>
      </div>
      <fieldset className="m-0 flex flex-wrap gap-3 border-0 p-0 text-[13.5px]">
        <legend className="mb-1 text-[12.5px] font-semibold text-[#334155]">Suits</legend>
        {(["house", "townhouse", "unit", "business"] as const).map((b) => (
          <label key={b} className="flex items-center gap-1.5">
            <input type="checkbox" checked={(d.buildingTypes ?? []).includes(b)} onChange={(e) => up({ buildingTypes: e.target.checked ? [...(d.buildingTypes ?? []), b] : (d.buildingTypes ?? []).filter((x) => x !== b) })} />
            {b[0]!.toUpperCase() + b.slice(1)}
          </label>
        ))}
      </fieldset>

      <div className="rounded-[10px] border border-[#E3E8EF] p-3 text-[13px] text-[#334155]">
        Customers pay <b>50% ({aud((d.price ?? 0) / 2)})</b> when they buy and <b>50% before installation</b>. Refunds follow EasyLink&apos;s standard policy. EasyLink approves every deal before it goes live.
      </div>
      {check && check.problems.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {check.problems.map((p) => (
            <Pill key={p} tone="warn">
              {p}
            </Pill>
          ))}
        </div>
      )}
      {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Btn kind="secondary" disabled={busy} onClick={() => onSave(d, false)}>
          Save draft
        </Btn>
        <Btn disabled={busy || !!check?.problems.length} onClick={() => onSave(d, true)}>
          Send to EasyLink for approval
        </Btn>
      </div>
    </form>
  );
}
