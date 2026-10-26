"use client";

import { useMemo, useState } from "react";
import { Btn, Field, inputCls } from "@/components/jobs/ui";
import { aud, type ReadySite } from "@/lib/ai-platform/market";

export type SiteInput = Partial<ReadySite>;

const blank = (): SiteInput => ({
  customer: { name: "" },
  suburb: "",
  state: "NSW",
  postcode: "",
  roof: "Tin",
  storeys: "Single",
  phases: 1,
  system: { panels: { model: "AXITEC 440 W", watts: 440, count: 15 }, inverter: { model: "FOXESS 5 kW hybrid", kw: 5, hybrid: true }, battery: undefined, extras: [] },
  confirmed: { payment: false, depositPaid: 0, installation: false },
  contractValue: 0,
  siteFee: 0,
  documents: [],
  visibility: { area: "service_area", eliteHeadStartHours: 0 },
});

/**
 * Create or edit a Ready Site. EasyLink staff also set who sees it (service
 * area, Elite head start, end date); installers passing on a lead send it to
 * EasyLink to check.
 */
export function SiteForm({ initial, staff, busy, error, onSave }: { initial?: ReadySite; staff: boolean; busy: boolean; error: string | null; onSave: (input: SiteInput, then: "save" | "publish" | "submit", extra?: { customerAgreed?: boolean }) => void }) {
  const [s, setS] = useState<SiteInput>(() => (initial ? structuredClone(initial) : blank()));
  const [agreed, setAgreed] = useState(false);
  const [docs, setDocs] = useState((initial?.documents ?? []).map((d) => d.name).join(", "));
  const sys = s.system!;
  const kw = sys.panels ? Math.round((sys.panels.watts * sys.panels.count) / 10) / 100 : 0;
  const ratio = kw && sys.inverter?.kw ? kw / sys.inverter.kw : 0;
  const up = (patch: Partial<SiteInput>) => setS((x) => ({ ...x, ...patch }));
  const upSys = (patch: Partial<NonNullable<SiteInput["system"]>>) => setS((x) => ({ ...x, system: { ...x.system!, ...patch } }));
  const upConf = (patch: Partial<NonNullable<SiteInput["confirmed"]>>) => setS((x) => ({ ...x, confirmed: { ...x.confirmed!, ...patch } }));
  const upVis = (patch: Partial<NonNullable<SiteInput["visibility"]>>) => setS((x) => ({ ...x, visibility: { ...x.visibility!, ...patch } }));
  const out = useMemo(() => ({ ...s, documents: docs.split(",").map((d) => d.trim()).filter(Boolean).map((name) => ({ name })) }), [s, docs]);
  const num = (v: string) => (v === "" ? 0 : Number(v));

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => e.preventDefault()}>
      <fieldset className="m-0 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-3">
        <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">Customer (private until sold)</legend>
        <Field label="Name">
          <input className={inputCls} value={s.customer?.name ?? ""} onChange={(e) => up({ customer: { ...s.customer!, name: e.target.value } })} />
        </Field>
        <Field label="Mobile">
          <input className={inputCls} value={s.customer?.phone ?? ""} onChange={(e) => up({ customer: { ...s.customer!, phone: e.target.value } })} />
        </Field>
        <Field label="Email">
          <input className={inputCls} type="email" value={s.customer?.email ?? ""} onChange={(e) => up({ customer: { ...s.customer!, email: e.target.value } })} />
        </Field>
        <Field label="Street address">
          <input className={inputCls} value={s.customer?.street ?? ""} onChange={(e) => up({ customer: { ...s.customer!, street: e.target.value } })} />
        </Field>
        <Field label="Lead or customer ID" hint="Links the existing lead, if there is one.">
          <input className={inputCls} value={s.customer?.leadId ?? ""} onChange={(e) => up({ customer: { ...s.customer!, leadId: e.target.value } })} />
        </Field>
      </fieldset>

      <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-6">
        <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">Site (shown publicly: suburb only)</legend>
        <div className="col-span-2">
          <Field label="Suburb">
            <input className={inputCls} value={s.suburb ?? ""} onChange={(e) => up({ suburb: e.target.value })} />
          </Field>
        </div>
        <Field label="State">
          <select className={inputCls} value={s.state} onChange={(e) => up({ state: e.target.value })}>
            {["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Postcode">
          <input className={inputCls} inputMode="numeric" value={s.postcode ?? ""} onChange={(e) => up({ postcode: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </Field>
        <Field label="Roof">
          <select className={inputCls} value={s.roof} onChange={(e) => up({ roof: e.target.value })}>
            {["Tin", "Tile", "Klip-lok", "Flat", "Other"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
        <Field label="Storeys">
          <select className={inputCls} value={s.storeys} onChange={(e) => up({ storeys: e.target.value })}>
            {["Single", "Double", "Three or more"].map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
        </Field>
      </fieldset>

      <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-6">
        <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">System (agreed with the customer)</legend>
        <div className="col-span-2">
          <Field label="Panel model">
            <input className={inputCls} value={sys.panels?.model ?? ""} onChange={(e) => upSys({ panels: { ...(sys.panels ?? { watts: 440, count: 0 }), model: e.target.value } })} />
          </Field>
        </div>
        <Field label="Panels">
          <input className={inputCls} type="number" min={0} value={sys.panels?.count ?? 0} onChange={(e) => upSys({ panels: { ...(sys.panels ?? { model: "Panel", watts: 440 }), count: num(e.target.value) } })} />
        </Field>
        <Field label="Watts each">
          <input className={inputCls} type="number" min={0} value={sys.panels?.watts ?? 0} onChange={(e) => upSys({ panels: { ...(sys.panels ?? { model: "Panel", count: 0 }), watts: num(e.target.value) } })} />
        </Field>
        <div className="col-span-2 flex items-end pb-1.5 text-[13px] text-[#334155]">
          = <b className="mx-1">{kw} kW</b>
          {ratio > 1.33 && <span className="text-[#991B1B]">· over 133% of the inverter</span>}
        </div>
        <div className="col-span-2">
          <Field label="Inverter model">
            <input className={inputCls} value={sys.inverter?.model ?? ""} onChange={(e) => upSys({ inverter: { ...(sys.inverter ?? { kw: 5 }), model: e.target.value } })} />
          </Field>
        </div>
        <Field label="Inverter kW">
          <input className={inputCls} type="number" min={0} step={0.1} value={sys.inverter?.kw ?? 0} onChange={(e) => upSys({ inverter: { ...(sys.inverter ?? { model: "Inverter" }), kw: num(e.target.value) } })} />
        </Field>
        <label className="flex items-end gap-2 pb-2 text-[13px] text-[#334155]">
          <input type="checkbox" checked={!!sys.inverter?.hybrid} onChange={(e) => upSys({ inverter: { ...(sys.inverter ?? { model: "Inverter", kw: 5 }), hybrid: e.target.checked } })} /> Hybrid
        </label>
        <div className="col-span-2 grid grid-cols-2 gap-3">
          <Field label="Battery model">
            <input className={inputCls} placeholder="None" value={sys.battery?.model ?? ""} onChange={(e) => upSys({ battery: e.target.value ? { usableKwh: sys.battery?.usableKwh ?? 10, model: e.target.value } : undefined })} />
          </Field>
          <Field label="Usable kWh">
            <input className={inputCls} type="number" min={0} step={0.1} disabled={!sys.battery} value={sys.battery?.usableKwh ?? 0} onChange={(e) => upSys({ battery: { model: sys.battery?.model ?? "Battery", usableKwh: num(e.target.value) } })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="m-0 grid grid-cols-2 gap-3 border-0 p-0 sm:grid-cols-4">
        <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">What&apos;s confirmed (at least one)</legend>
        <label className="flex items-center gap-2 text-[13.5px] text-[#0F172A]">
          <input type="checkbox" checked={!!s.confirmed?.payment} onChange={(e) => upConf({ payment: e.target.checked })} /> Payment confirmed
        </label>
        <Field label="Deposit already paid">
          <input className={inputCls} type="number" min={0} disabled={!s.confirmed?.payment} value={s.confirmed?.depositPaid ?? 0} onChange={(e) => upConf({ depositPaid: num(e.target.value) })} />
        </Field>
        <label className="flex items-center gap-2 text-[13.5px] text-[#0F172A]">
          <input type="checkbox" checked={!!s.confirmed?.installation} onChange={(e) => upConf({ installation: e.target.checked })} /> Installation confirmed
        </label>
        <div className="grid grid-cols-2 gap-2">
          <Field label="From">
            <input className={inputCls} type="date" value={s.confirmed?.windowFrom ?? ""} onChange={(e) => upConf({ windowFrom: e.target.value })} />
          </Field>
          <Field label="To">
            <input className={inputCls} type="date" value={s.confirmed?.windowTo ?? ""} onChange={(e) => upConf({ windowTo: e.target.value })} />
          </Field>
        </div>
      </fieldset>

      <fieldset className="m-0 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-3">
        <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">Money</legend>
        <Field label="Customer contract (incl. GST, before STCs)">
          <input className={inputCls} type="number" min={0} value={s.contractValue ?? 0} onChange={(e) => up({ contractValue: num(e.target.value) })} />
        </Field>
        <Field label="Site fee the buyer pays (incl. GST)">
          <input className={inputCls} type="number" min={0} value={s.siteFee ?? 0} onChange={(e) => up({ siteFee: num(e.target.value) })} />
        </Field>
        <Field label="Documents included" hint="Comma separated, e.g. Signed quote, Meter photo">
          <input className={inputCls} value={docs} onChange={(e) => setDocs(e.target.value)} />
        </Field>
      </fieldset>

      {staff && (
        <fieldset className="m-0 grid grid-cols-1 gap-3 border-0 p-0 sm:grid-cols-3">
          <legend className="mb-1 text-[14px] font-bold text-[#0F172A]">Who sees it</legend>
          <Field label="Installers">
            <select className={inputCls} value={s.visibility?.area} onChange={(e) => upVis({ area: e.target.value as "service_area" | "everyone" })}>
              <option value="service_area">Who service this postcode</option>
              <option value="everyone">All installers</option>
            </select>
          </Field>
          <Field label="Elite head start (hours)">
            <input className={inputCls} type="number" min={0} max={72} value={s.visibility?.eliteHeadStartHours ?? 0} onChange={(e) => upVis({ eliteHeadStartHours: num(e.target.value) })} />
          </Field>
          <Field label="Offer ends">
            <input className={inputCls} type="date" value={(s.visibility?.endsAt ?? "").slice(0, 10)} onChange={(e) => upVis({ endsAt: e.target.value })} />
          </Field>
        </fieldset>
      )}
      <Field label="Notes for the buyer">
        <textarea className={`${inputCls} min-h-[64px]`} value={s.notes ?? ""} onChange={(e) => up({ notes: e.target.value })} />
      </Field>

      {!staff && (
        <label className="flex items-start gap-2 rounded-[10px] bg-[#F8FAFC] p-3 text-[13.5px] text-[#0F172A]">
          <input type="checkbox" className="mt-0.5" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          The customer has agreed to another accredited installer doing the work at this price.
        </label>
      )}
      {error && <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-[#475569]">
          Buyer pays {aud(s.siteFee ?? 0)} · customer contract {aud(s.contractValue ?? 0)}
        </span>
        <div className="flex flex-wrap gap-2">
          <Btn kind="secondary" disabled={busy} onClick={() => onSave(out, "save")}>
            Save draft
          </Btn>
          {staff ? (
            <Btn disabled={busy} onClick={() => onSave(out, "publish")}>
              Publish to installers
            </Btn>
          ) : (
            <Btn disabled={busy || !agreed} onClick={() => onSave(out, "submit", { customerAgreed: true })}>
              Send to EasyLink
            </Btn>
          )}
        </div>
      </div>
    </form>
  );
}
