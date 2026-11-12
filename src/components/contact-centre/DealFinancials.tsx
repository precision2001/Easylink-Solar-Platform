"use client";

import { useCallback, useEffect, useState } from "react";
import { GLASS, GOLD_TEXT, GREEN_TEXT, LABEL, Sheen, TINT, TITLE } from "./CustomerProposal";

/**
 * Customer record → Deal financials (Operations Portal staff only).
 * For each quote: what each item costs EasyLink, what the customer pays,
 * the profit, installer payout and the money summary — and a live editor
 * for the profit margin, line prices, quantities and a discount. Saving
 * makes a new draft version, so a sent quote never changes under the
 * customer. Trade costs and suppliers come only from the admin API; this
 * file holds no prices.
 */

type Sheet = { url: string; source: "SAVED" | "PRODUCT" | "MAKER" } | null;
type Eq = {
  index: number;
  category: string;
  name: string;
  brand: string | null;
  model: string | null;
  productId: string | null;
  supplier: string | null;
  quantity: number;
  unitCostCents: number | null;
  costCents: number | null;
  unitSellCents: number;
  sellCents: number;
  sellExGstCents: number;
  profitCents: number | null;
  markupPct: number | null;
  marginPct: number | null;
  datasheet: Sheet;
};
type Wk = {
  index: number;
  name: string;
  kind: "INSTALL" | "FEE" | "DELIVERY" | "DISCOUNT";
  quantity: number;
  sellCents: number;
  sellExGstCents: number;
  supplyCostCents: number;
  installerCostCents: number;
  profitCents: number;
};
type Totals = {
  priceBeforeStcsCents: number;
  revenueExGstCents: number;
  gstCents: number;
  stcDiscountCents: number;
  rebateCents: number;
  customerPaysCents: number;
  depositCents: number;
  balanceCents: number;
  equipmentCostCents: number;
  equipmentSellExGstCents: number;
  equipmentProfitCents: number;
  equipmentMarkupPct: number | null;
  markupAfterDiscountPct: number | null;
  installSellCents: number;
  deliverySellCents: number;
  discountCents: number;
  installerCostCents: number;
  installerCostSource: "JOB_OFFER" | "ESTIMATE";
  installerEstimateCents: number;
  otherCostCents: number;
  grossProfitCents: number;
  grossMarginPct: number | null;
  cashFromStcsCents: number;
};
type DealQuote = {
  quote: { id: string; number: number; version: number; status: string; title: string; pricingSource: string | null; sentAt: string | null; acceptedAt: string | null; depositPaidAt: string | null; createdAt: string; updatedAt: string };
  costsBasis: "FROZEN" | "TODAY" | "NONE";
  priceBookUpdatedAt: string | null;
  marginPct: number | null;
  gstPct: number;
  equipment: Eq[];
  works: Wk[];
  stcLines: { label: string; count: number; valueCents: number; kind: "SOLAR" | "BATTERY" }[];
  totals: Totals;
  belowFloor: boolean;
  floorPct: number;
  complete: boolean;
};
type Deal = {
  lead: { id: string; customerName: string };
  quotes: DealQuote[];
  settings: { marginFloorPct: number; restricted: boolean };
  canEdit: boolean;
  priceBook: { marginPct: number; gstPct: number; updatedAt: string | null } | null;
  payout: { cents: number; source: "JOB_OFFER" } | null;
};
type Staff = { id: string; name: string; email: string };

const TZ = "Australia/Sydney";
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric", timeZone: TZ });
const $ = (cents: number, exact = false) => {
  const neg = cents < 0;
  const v = Math.abs(cents) / 100;
  const s = v.toLocaleString("en-AU", { minimumFractionDigits: exact ? 2 : 0, maximumFractionDigits: exact ? 2 : 0 });
  return `${neg ? "−" : ""}$${s}`;
};
const pct = (n: number | null) => (n === null || !Number.isFinite(n) ? "–" : `${Math.round(n * 10) / 10}%`);
const ratio = (num: number, den: number) => (den > 0 ? (num / den) * 100 : null);
const ref = (n: number) => `Q-${String(n).padStart(6, "0")}`;

const STATUS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Opened",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  SUPERSEDED: "Replaced",
};
const CAT: Record<string, string> = { "Solar Panels": "Panels", Inverters: "Inverter", Batteries: "Battery", "EV Chargers": "EV charger" };
const PRESETS = [10, 15, 20, 25, 30];

type Edits = { margin: number | null; lines: Record<number, { quantity?: number; unitPriceCents?: number }>; discountCents: number };
const BLANK: Edits = { margin: null, lines: {}, discountCents: 0 };

/** The same sums as the backend, run live while someone edits. */
function recompute(q: DealQuote, e: Edits, payoutCents: number | null) {
  const f = 1 + q.gstPct / 100;
  const equipment = q.equipment.map((l) => {
    const le = e.lines[l.index] ?? {};
    const quantity = le.quantity ?? l.quantity;
    const unitCost = l.unitCostCents;
    let unitSell = l.unitSellCents;
    if (e.margin !== null && unitCost !== null) unitSell = Math.round(unitCost * (1 + e.margin / 100) * f);
    if (le.unitPriceCents !== undefined) unitSell = le.unitPriceCents;
    // Untouched lines keep their exact totals (no rounding drift).
    const untouched = quantity === l.quantity && unitSell === l.unitSellCents;
    const sell = untouched ? l.sellCents : Math.round(unitSell * quantity);
    const cost = unitCost === null ? null : untouched ? l.costCents : Math.round(unitCost * quantity);
    const sellEx = sell / f;
    const profit = cost === null ? null : sellEx - cost;
    return { ...l, quantity, unitSellCents: unitSell, sellCents: sell, sellExGstCents: Math.round(sellEx), costCents: cost, profitCents: profit === null ? null : Math.round(profit), markupPct: profit === null || !cost ? null : ratio(profit, cost) };
  });
  const works = q.works.filter((w) => w.kind !== "DISCOUNT");
  const worksSell = works.reduce((t, w) => t + w.sellCents, 0);
  const eqSell = equipment.reduce((t, l) => t + l.sellCents, 0);
  const discount = Math.max(0, Math.round(e.discountCents));
  const subtotal = eqSell + worksSell - discount;
  const revenueEx = subtotal / f;
  const eqCost = equipment.reduce((t, l) => t + (l.costCents ?? 0), 0);
  const eqSellEx = eqSell / f;
  const installEstimate = works.reduce((t, w) => t + w.installerCostCents, 0);
  const installer = payoutCents ?? installEstimate;
  const other = works.reduce((t, w) => t + w.supplyCostCents, 0);
  const gross = revenueEx - eqCost - installer - other;
  const customer = subtotal - q.totals.stcDiscountCents - q.totals.rebateCents;
  const depositRatio = q.totals.customerPaysCents > 0 ? q.totals.depositCents / q.totals.customerPaysCents : 0;
  const deposit = Math.round(customer * depositRatio);
  return {
    equipment,
    works,
    discount,
    subtotal,
    revenueEx: Math.round(revenueEx),
    gst: Math.round(subtotal - revenueEx),
    eqCost,
    eqSellEx: Math.round(eqSellEx),
    eqProfit: Math.round(eqSellEx - eqCost),
    markup: q.complete ? ratio(eqSellEx - eqCost, eqCost) : null,
    markupAfterDiscount: q.complete ? ratio(eqSellEx - eqCost - discount / f, eqCost) : null,
    installer: Math.round(installer),
    other,
    gross: Math.round(gross),
    grossPct: ratio(gross, revenueEx),
    customer,
    deposit,
    balance: customer - deposit,
  };
}

/* ------------------------------------------------------------- pieces */

function Ring({ value, floor, size = 92 }: { value: number | null; floor: number; size?: number }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const max = 40;
  const v = Math.max(0, Math.min(max, value ?? 0));
  const low = value !== null && value < floor;
  const floorAngle = (floor / max) * 360 - 90;
  const fx = size / 2 + r * Math.cos((floorAngle * Math.PI) / 180);
  const fy = size / 2 + r * Math.sin((floorAngle * Math.PI) / 180);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="dfRingGood" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#34D399" />
          <stop offset="100%" stopColor="#2DD4BF" />
        </linearGradient>
        <linearGradient id="dfRingLow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FCA5A5" />
          <stop offset="100%" stopColor="#F97316" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth={9} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={low ? "url(#dfRingLow)" : "url(#dfRingGood)"}
        strokeWidth={9}
        strokeLinecap="round"
        strokeDasharray={`${(v / max) * c} ${c}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dasharray 300ms ease" }}
      />
      <circle cx={fx} cy={fy} r={3.5} fill="#FFEF62" stroke="#0B1E3F" strokeWidth={1.5} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" className="font-source-sans" fill="#fff" fontSize={size > 80 ? 18 : 14} fontWeight={700}>
        {value === null ? "–" : `${Math.round(value)}%`}
      </text>
    </svg>
  );
}

function Hero({ label, value, sub, tint, valueClass }: { label: string; value: string; sub?: React.ReactNode; tint: keyof typeof TINT; valueClass?: string }) {
  return (
    <div className={`${GLASS} ${TINT[tint]} flex min-w-0 flex-col justify-center gap-1 px-4 py-3`}>
      <Sheen />
      <p className={`relative m-0 ${LABEL}`}>{label}</p>
      <p className={`relative m-0 font-source-sans text-[26px] font-extrabold leading-tight tabular-nums ${valueClass ?? "text-white"}`}>{value}</p>
      {sub ? <div className="relative text-[12px] text-white/80">{sub}</div> : null}
    </div>
  );
}

function Waterfall({ revenue, eqCost, installer, other, gross }: { revenue: number; eqCost: number; installer: number; other: number; gross: number }) {
  const total = Math.max(revenue, eqCost + installer + other, 1);
  const parts = [
    { k: "Equipment cost", v: eqCost, c: "bg-[linear-gradient(90deg,#4682B4,#1E4069)]" },
    { k: "Installer", v: installer, c: "bg-[linear-gradient(90deg,#94A3B8,#475569)]" },
    { k: "Other costs", v: other, c: "bg-[linear-gradient(90deg,#A78BFA,#6D28D9)]" },
    { k: gross >= 0 ? "EasyLink profit" : "Loss", v: Math.abs(gross), c: gross >= 0 ? "bg-[linear-gradient(90deg,#34D399,#2DD4BF)]" : "bg-[repeating-linear-gradient(135deg,#F87171_0,#F87171_6px,#B91C1C_6px,#B91C1C_12px)]" },
  ].filter((p) => p.v > 0);
  return (
    <div className={`${GLASS} ${TINT.charcoal} p-4`}>
      <Sheen />
      <div className="relative flex flex-wrap items-baseline justify-between gap-2">
        <p className={`m-0 ${TITLE}`}>Where the money goes</p>
        <p className="m-0 text-[12px] text-white/75">Revenue ex GST {$(revenue)}</p>
      </div>
      <div className="relative mt-3 flex h-7 w-full overflow-hidden rounded-full bg-white/10 ring-1 ring-white/15">
        {parts.map((p) => (
          <div
            key={p.k}
            title={`${p.k}: ${$(p.v)}`}
            className={`${p.c} h-full transition-[width] duration-300 first:rounded-l-full last:rounded-r-full`}
            style={{ width: `${(p.v / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="relative mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-4">
        {parts.map((p) => (
          <div key={p.k} className="flex min-w-0 items-center gap-2">
            <span className={`${p.c} h-2.5 w-2.5 shrink-0 rounded-full`} />
            <span className="truncate text-[12px] text-white/80">{p.k}</span>
            <span className="ml-auto text-[12px] font-semibold tabular-nums text-white">{$(p.v)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniBar({ value, floor }: { value: number | null; floor: number }) {
  const v = Math.max(0, Math.min(40, value ?? 0));
  const low = value !== null && value < floor;
  return (
    <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={`h-full rounded-full transition-[width] duration-300 ${low ? "bg-[#F97316]" : "bg-[linear-gradient(90deg,#34D399,#2DD4BF)]"}`} style={{ width: `${(v / 40) * 100}%` }} />
      <span className="absolute top-[-2px] h-[10px] w-[2px] bg-[#FFEF62]" style={{ left: `${(floor / 40) * 100}%` }} />
    </div>
  );
}

function MoneyInput({ cents, onChange, disabled, label }: { cents: number; onChange: (c: number) => void; disabled?: boolean; label: string }) {
  // Remounted (keyed by the value) when the price changes elsewhere.
  const [text, setText] = useState((cents / 100).toFixed(2));
  return (
    <label className="flex items-center gap-1 rounded-[8px] bg-black/25 px-2 py-1 ring-1 ring-white/15 focus-within:ring-[#FFEF62]/70">
      <span className="text-[12px] text-white/60">$</span>
      <input
        aria-label={label}
        inputMode="decimal"
        disabled={disabled}
        value={text}
        onChange={(ev) => setText(ev.target.value)}
        onBlur={() => {
          const n = Number(text.replace(/[^0-9.]/g, ""));
          if (Number.isFinite(n)) onChange(Math.round(n * 100));
          else setText((cents / 100).toFixed(2));
        }}
        className="w-[84px] bg-transparent text-right font-source-sans text-[13px] font-semibold tabular-nums text-white outline-none disabled:opacity-60"
      />
    </label>
  );
}

function DatasheetCell({ line, canEdit, onSave }: { line: Eq; canEdit: boolean; onSave: (model: string, url: string | null) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState(line.datasheet?.url ?? "");
  const model = line.model ?? line.name;
  const search = `https://www.google.com/search?q=${encodeURIComponent(`${model} datasheet pdf`)}`;
  if (line.datasheet && !open) {
    return (
      <span className="inline-flex items-center gap-2">
        <a href={line.datasheet.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-full bg-[#FFEF62]/15 px-2 py-0.5 text-[11px] font-semibold text-[#FFEF62] no-underline ring-1 ring-[#FFEF62]/40 hover:bg-[#FFEF62]/25">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          Datasheet
        </a>
        {canEdit ? (
          <button type="button" onClick={() => setOpen(true)} className="text-[11px] text-white/50 underline-offset-2 hover:text-white hover:underline">
            change
          </button>
        ) : null}
      </span>
    );
  }
  if (!open) {
    return (
      <span className="inline-flex items-center gap-2 text-[11px]">
        <a href={search} target="_blank" rel="noreferrer" className="text-white/60 underline-offset-2 hover:text-white hover:underline">
          Find datasheet ↗
        </a>
        {canEdit ? (
          <button type="button" onClick={() => setOpen(true)} className="rounded-full px-2 py-0.5 font-semibold text-[#7DD3FC] ring-1 ring-[#7DD3FC]/40 hover:bg-[#7DD3FC]/10">
            + Add link
          </button>
        ) : null}
      </span>
    );
  }
  return (
    <form
      className="flex items-center gap-1.5"
      onSubmit={async (ev) => {
        ev.preventDefault();
        await onSave(model, url.trim() || null);
        setOpen(false);
      }}
    >
      <input
        autoFocus
        type="url"
        placeholder="https://…datasheet.pdf"
        value={url}
        onChange={(ev) => setUrl(ev.target.value)}
        className="w-[180px] rounded-[6px] bg-black/30 px-2 py-1 text-[11px] text-white outline-none ring-1 ring-white/20 focus:ring-[#FFEF62]/70"
      />
      <button type="submit" className="rounded-[6px] bg-[#FFEF62] px-2 py-1 text-[11px] font-bold text-[#0B2A4A]">
        Save
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-[11px] text-white/60">
        Cancel
      </button>
    </form>
  );
}

function SettingsPanel({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [data, setData] = useState<{ settings: { marginFloorPct: number; editorIds: string[] }; staff: Staff[]; canEdit: boolean } | null>(null);
  const [floor, setFloor] = useState("10");
  const [mode, setMode] = useState<"all" | "named">("all");
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    fetch("/api/admin/deal-financials/settings", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (!j?.data) return setMsg(j?.message || "Couldn't load the settings.");
        setData(j.data);
        setFloor(String(j.data.settings.marginFloorPct));
        setMode(j.data.settings.editorIds.length ? "named" : "all");
        setIds(j.data.settings.editorIds);
      })
      .catch(() => setMsg("Couldn't reach EasyLink."));
  }, []);
  const save = async () => {
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/admin/deal-financials/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ marginFloorPct: Number(floor) || 0, editorIds: mode === "all" ? [] : ids }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j?.message || "Couldn't save.");
    onSaved();
    onClose();
  };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal aria-labelledby="df-settings-title" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-[480px] overflow-hidden rounded-t-[20px] bg-[radial-gradient(120%_80%_at_20%_0%,#3A4A63_0%,#1E2738_55%,#141A26_100%)] p-5 shadow-2xl ring-1 ring-white/15 sm:rounded-[20px]">
        <h3 id="df-settings-title" className="m-0 font-source-sans text-[17px] font-bold text-white">
          Price settings
        </h3>
        {!data ? <p className="mt-3 text-[13px] text-white/70">{msg ?? "Loading…"}</p> : null}
        {data ? (
          <div className="mt-4 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className={LABEL}>Margin floor</span>
              <span className="flex items-center gap-2">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  value={floor}
                  disabled={!data.canEdit}
                  onChange={(e) => setFloor(e.target.value)}
                  className="w-24 rounded-[8px] bg-black/30 px-3 py-2 text-[15px] font-bold text-white outline-none ring-1 ring-white/20 focus:ring-[#FFEF62]/70"
                />
                <span className="text-[13px] text-white/75">% equipment margin. Below this, saving needs a confirm.</span>
              </span>
            </label>
            <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
              <legend className={`mb-1.5 ${LABEL}`}>Who can change prices</legend>
              {(["all", "named"] as const).map((m) => (
                <label key={m} className="flex cursor-pointer items-center gap-2 text-[13px] text-white">
                  <input type="radio" name="df-mode" checked={mode === m} disabled={!data.canEdit} onChange={() => setMode(m)} className="accent-[#FFEF62]" />
                  {m === "all" ? "Everyone in the Operations Portal" : "Only the people I choose"}
                </label>
              ))}
              {mode === "named" ? (
                <div className="ml-6 flex max-h-[200px] flex-col gap-1 overflow-auto rounded-[10px] bg-black/20 p-2 ring-1 ring-white/10">
                  {data.staff.map((s) => (
                    <label key={s.id} className="flex cursor-pointer items-center gap-2 rounded-[6px] px-2 py-1 text-[13px] text-white hover:bg-white/5">
                      <input
                        type="checkbox"
                        className="accent-[#FFEF62]"
                        disabled={!data.canEdit}
                        checked={ids.includes(s.id)}
                        onChange={(e) => setIds((cur) => (e.target.checked ? [...cur, s.id] : cur.filter((x) => x !== s.id)))}
                      />
                      <span className="font-semibold">{s.name}</span>
                      <span className="truncate text-white/50">{s.email}</span>
                    </label>
                  ))}
                  <p className="m-0 px-2 pt-1 text-[11px] text-white/55">You stay on the list so you can&apos;t lock yourself out.</p>
                </div>
              ) : null}
            </fieldset>
            {!data.canEdit ? <p className="m-0 text-[12px] text-[#FCD34D]">Only the named price editors can change these settings.</p> : null}
            {msg ? <p className="m-0 text-[12px] text-[#FCA5A5]">{msg}</p> : null}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-10 rounded-[10px] px-4 text-[13px] font-semibold text-white/80 hover:text-white">
                Cancel
              </button>
              <button
                type="button"
                disabled={!data.canEdit || busy}
                onClick={save}
                className="h-10 rounded-[10px] bg-[linear-gradient(133deg,#FFEF62_0%,#FFC828_45%,#F78D00_100%)] px-5 text-[13px] font-bold text-[#0B2A4A] shadow-md disabled:opacity-50"
              >
                {busy ? "Saving…" : "Save settings"}
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------- main */

export function DealFinancials({ leadId }: { leadId: string }) {
  const [deal, setDeal] = useState<Deal | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sel, setSel] = useState(0);
  // Edits belong to one quote; picking another quote starts clean.
  const [draft, setDraft] = useState<{ quoteId: string | null; edits: Edits; confirmLow: boolean }>({ quoteId: null, edits: BLANK, confirmLow: false });
  const [reload, setReload] = useState<{ n: number; select?: string }>({ n: 0 });
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const load = useCallback((select?: string) => setReload((r) => ({ n: r.n + 1, select })), []);
  useEffect(() => {
    let off = false;
    fetch(`/api/admin/deal-financials/lead/${encodeURIComponent(leadId)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { data?: Deal; message?: string };
        if (off) return;
        if (!r.ok || !j.data) return setError(j.message || "Couldn't load the deal.");
        setDeal(j.data);
        setError(null);
        const i = reload.select ? j.data.quotes.findIndex((q) => q.quote.id === reload.select) : j.data.quotes.findIndex((q) => q.quote.status !== "SUPERSEDED");
        setSel(Math.max(0, i));
      })
      .catch(() => !off && setError("Couldn't reach EasyLink."));
    return () => {
      off = true;
    };
  }, [leadId, reload]);

  const q = deal?.quotes[sel] ?? null;
  const existingDiscount = q ? -q.works.filter((w) => w.kind === "DISCOUNT").reduce((t, w) => t + w.sellCents, 0) : 0;
  const mine = !!q && draft.quoteId === q.quote.id;
  const edits: Edits = mine ? draft.edits : { ...BLANK, discountCents: existingDiscount };
  const confirmLow = mine && draft.confirmLow;
  const setEdits = (fn: (e: Edits) => Edits) => q && setDraft({ quoteId: q.quote.id, edits: fn(edits), confirmLow: false });
  const setConfirmLow = (v: boolean) => q && setDraft({ quoteId: q.quote.id, edits, confirmLow: v });
  const resetEdits = () => setDraft({ quoteId: null, edits: BLANK, confirmLow: false });

  const payoutCents = deal?.payout?.cents ?? null;
  const live = q ? recompute(q, edits, payoutCents) : null;
  const floor = deal?.settings.marginFloorPct ?? 10;
  const dirty = !!q && (edits.margin !== null || Object.keys(edits.lines).length > 0 || edits.discountCents !== existingDiscount);
  const belowFloor = live?.markupAfterDiscount !== null && live?.markupAfterDiscount !== undefined && live.markupAfterDiscount < floor;
  const shownMargin = edits.margin ?? (live?.markup !== null && live?.markup !== undefined ? Math.round(live.markup * 10) / 10 : (q?.marginPct ?? 15));
  const before = q?.totals;
  const profitDelta = live && before ? live.gross - before.grossProfitCents : 0;
  const canEdit = !!deal?.canEdit && !!q && q.quote.status !== "SUPERSEDED";

  /** A new margin replaces typed prices but keeps quantity changes. */
  const setMargin = (m: number) =>
    setEdits((e) => ({
      ...e,
      margin: m,
      lines: Object.fromEntries(Object.entries(e.lines).filter(([, l]) => l.quantity !== undefined).map(([i, l]) => [i, { quantity: l.quantity }])),
    }));
  const setLine = (index: number, patch: { quantity?: number; unitPriceCents?: number }) =>
    setEdits((e) => ({ ...e, lines: { ...e.lines, [index]: { ...e.lines[index], ...patch } } }));

  const save = async () => {
    if (!q || !live) return;
    setSaving(true);
    setNotice(null);
    const body: Record<string, unknown> = {};
    if (edits.margin !== null) body.marginPct = edits.margin;
    const lines = Object.entries(edits.lines).map(([i, l]) => ({ index: Number(i), ...l }));
    if (lines.length) body.lines = lines;
    if (edits.discountCents !== existingDiscount) body.discountCents = edits.discountCents;
    if (belowFloor) body.acceptLowMargin = confirmLow;
    const r = await fetch(`/api/admin/deal-financials/quotes/${q.quote.id}/apply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await r.json().catch(() => ({}))) as { data?: { revised: boolean; quote: DealQuote }; message?: string };
    setSaving(false);
    if (!r.ok || !j.data) return setNotice({ tone: "bad", text: j.message || "Couldn't save the prices." });
    const v = j.data.quote.quote;
    setNotice({
      tone: "good",
      text: j.data.revised
        ? `Saved as ${ref(v.number)} version ${v.version} (draft). The sent quote is unchanged — send the new version from Quotes when ready.`
        : `Saved to ${ref(v.number)} version ${v.version} (draft).`,
    });
    resetEdits();
    load(v.id);
  };

  const saveSheet = async (model: string, url: string | null) => {
    await fetch("/api/admin/deal-financials/datasheet", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model, url }) });
    load(q?.quote.id);
  };

  return (
    <section aria-labelledby="deal-title" className="relative overflow-hidden rounded-[20px] bg-[radial-gradient(120%_80%_at_80%_0%,#3F3A22_0%,#1E2738_45%,#141A26_100%)] p-4 ring-1 ring-[#FFEF62]/20 sm:p-5">
      <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[radial-gradient(circle,rgba(255,239,98,0.22)_0%,rgba(255,239,98,0)_70%)]" />

      {/* Header */}
      <div className="relative flex flex-wrap items-center gap-3 pb-3">
        <div className="min-w-0 flex-1">
          <h2 id="deal-title" className="m-0 flex flex-wrap items-center gap-2 font-source-sans text-[18px] font-bold text-white">
            <span className={GOLD_TEXT}>Deal financials</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/35 px-2.5 py-0.5 text-[11px] font-semibold text-white/85 ring-1 ring-white/15">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              Staff only · never shown to customers or installers
            </span>
          </h2>
          <p className="m-0 mt-1 text-[12px] text-white/65">
            Equipment is chosen in the customer&apos;s design. Default margin {deal?.priceBook ? `${deal.priceBook.marginPct}%` : "–"} ·{" "}
            <a href="/master/price-book" className="text-[#7DD3FC] no-underline hover:underline">
              Price book
            </a>
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-white/10 px-3 text-[13px] font-semibold text-white ring-1 ring-white/20 hover:bg-white/15"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
          Price settings
        </button>
      </div>

      {error ? <p className="relative m-0 rounded-[10px] bg-[#7F1D1D]/60 p-3 text-[13px] text-white">{error}</p> : null}
      {!deal && !error ? <p className="relative m-0 text-[13px] text-white/70">Loading the numbers…</p> : null}
      {deal && !deal.quotes.length ? (
        <div className={`${GLASS} ${TINT.slate} p-5 text-center`}>
          <Sheen />
          <p className="relative m-0 text-[14px] text-white">No quote yet, so there are no numbers to show.</p>
          <p className="relative m-0 mt-1 text-[12px] text-white/70">Create a quote from the design in Quotes; its buy and sell prices appear here.</p>
        </div>
      ) : null}

      {deal && q && live && before ? (
        <div className="relative flex flex-col gap-3">
          {/* Quote picker */}
          {deal.quotes.length > 1 ? (
            <div role="tablist" aria-label="Quote version" className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
              {deal.quotes.map((x, i) => (
                <button
                  key={x.quote.id}
                  role="tab"
                  aria-selected={i === sel}
                  onClick={() => {
                    setSel(i);
                    setNotice(null);
                  }}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold ring-1 transition ${i === sel ? "bg-[#FFEF62] text-[#0B2A4A] ring-[#FFEF62]" : "bg-white/5 text-white/80 ring-white/15 hover:bg-white/10"}`}
                >
                  {ref(x.quote.number)} v{x.quote.version} · {STATUS[x.quote.status] ?? x.quote.status}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-[12px]">
            {deal.quotes.length === 1 ? (
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-semibold text-white ring-1 ring-white/15">
                {ref(q.quote.number)} v{q.quote.version} · {STATUS[q.quote.status] ?? q.quote.status}
              </span>
            ) : null}
            {q.costsBasis === "FROZEN" ? (
              <span className="rounded-full bg-[#34D399]/15 px-2.5 py-0.5 text-[#6EE7B7] ring-1 ring-[#34D399]/35">Costs locked when quoted{q.priceBookUpdatedAt ? ` · price book ${day(q.priceBookUpdatedAt)}` : ""}</span>
            ) : q.costsBasis === "TODAY" ? (
              <span className="rounded-full bg-[#FFEF62]/15 px-2.5 py-0.5 text-[#FDE68A] ring-1 ring-[#FFEF62]/35">Costs from today&apos;s price book (quote made before costs were kept)</span>
            ) : (
              <span className="rounded-full bg-[#F87171]/15 px-2.5 py-0.5 text-[#FCA5A5] ring-1 ring-[#F87171]/35">No trade costs for this quote</span>
            )}
            {q.quote.acceptedAt ? <span className="text-white/60">Accepted {day(q.quote.acceptedAt)}</span> : q.quote.sentAt ? <span className="text-white/60">Sent {day(q.quote.sentAt)}</span> : null}
          </div>

          {/* Hero tiles */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Hero
              label="Customer pays"
              tint="navy"
              value={$(live.customer)}
              valueClass={GOLD_TEXT}
              sub={
                <>
                  after {$(before.stcDiscountCents + before.rebateCents)} STCs &amp; rebate
                  {live.customer !== before.customerPaysCents ? <span className="ml-1 text-white/55 line-through">{$(before.customerPaysCents)}</span> : null}
                </>
              }
            />
            <Hero
              label="EasyLink profit"
              tint={live.gross >= 0 ? "steel" : "charcoal"}
              value={$(live.gross)}
              valueClass={live.gross >= 0 ? GREEN_TEXT : "text-[#FCA5A5]"}
              sub={
                <>
                  {pct(live.grossPct)} of revenue ex GST
                  {dirty && profitDelta !== 0 ? (
                    <span className={`ml-1.5 rounded-full px-1.5 py-px text-[11px] font-bold ${profitDelta > 0 ? "bg-[#34D399]/20 text-[#6EE7B7]" : "bg-[#F87171]/20 text-[#FCA5A5]"}`}>
                      {profitDelta > 0 ? "+" : ""}
                      {$(profitDelta)}
                    </span>
                  ) : null}
                </>
              }
            />
            <div className={`${GLASS} ${TINT.slate} flex items-center gap-3 px-4 py-3`}>
              <Sheen />
              <Ring value={live.markupAfterDiscount} floor={floor} size={76} />
              <div className="relative min-w-0">
                <p className={`m-0 ${LABEL}`}>Equipment margin{live.discount > 0 ? " after discount" : ""}</p>
                <p className="m-0 font-source-sans text-[20px] font-extrabold text-white tabular-nums">{$(live.eqProfit - Math.round(live.discount / (1 + q.gstPct / 100)))}</p>
                <p className="m-0 text-[12px] text-white/75">on {$(live.eqCost)} trade cost · floor {floor}%</p>
              </div>
            </div>
            <Hero
              label="Installer payout"
              tint="slate"
              value={$(live.installer)}
              sub={deal.payout ? "as offered to the installer (job offer)" : <>estimate: installation ex GST</>}
            />
          </div>

          <Waterfall revenue={live.revenueEx} eqCost={live.eqCost} installer={live.installer} other={live.other} gross={live.gross} />

          {/* Margin control */}
          {canEdit ? (
            <div className={`${GLASS} ${TINT.brandGold} p-4`}>
              <Sheen />
              <div className="relative flex flex-col gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="m-0 font-source-sans text-[12px] font-bold uppercase tracking-[1px] text-[#0B2A4A]">Profit margin on equipment</p>
                  <div className="ml-auto flex flex-wrap gap-1.5">
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setMargin(p)}
                        className={`rounded-full px-2.5 py-1 text-[12px] font-bold transition ${edits.margin === p ? "bg-[#0B2A4A] text-[#FFEF62]" : "bg-white/40 text-[#0B2A4A] hover:bg-white/60"} ${p < floor ? "ring-1 ring-[#B91C1C]/50" : ""}`}
                      >
                        {p}%
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="relative flex-1">
                    <input
                      type="range"
                      min={0}
                      max={50}
                      step={0.5}
                      value={shownMargin}
                      disabled={!q.complete}
                      aria-label="Profit margin on equipment (%)"
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#0B2A4A]/25 accent-[#0B2A4A] disabled:cursor-not-allowed"
                    />
                    <span aria-hidden className="pointer-events-none absolute -top-1 h-4 w-[3px] rounded bg-[#B91C1C]" style={{ left: `calc(${(floor / 50) * 100}% - 1px)` }} title={`Floor ${floor}%`} />
                    <div className="relative mt-1 h-3 text-[10px] font-semibold text-[#0B2A4A]/70">
                      <span className="absolute left-0">0%</span>
                      <span className="absolute -translate-x-1/2 whitespace-nowrap text-[#B91C1C]" style={{ left: `${(floor / 50) * 100}%` }}>
                        floor {floor}%
                      </span>
                      <span className="absolute right-0">50%</span>
                    </div>
                  </div>
                  <label className="flex items-center gap-1 self-start rounded-[10px] bg-[#0B2A4A] px-3 py-2 sm:self-auto">
                    <input
                      type="number"
                      min={0}
                      max={300}
                      step={0.5}
                      value={shownMargin}
                      disabled={!q.complete}
                      aria-label="Margin percent"
                      onChange={(e) => setMargin(Number(e.target.value))}
                      className="w-14 bg-transparent text-right font-source-sans text-[20px] font-extrabold text-[#FFEF62] outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                    />
                    <span className="text-[16px] font-bold text-[#FFEF62]">%</span>
                  </label>
                </div>
                <div className="flex flex-wrap items-center gap-3 border-t border-[#0B2A4A]/15 pt-3">
                  <span className="text-[13px] font-semibold text-[#0B2A4A]">Discount (inc GST)</span>
                  <label className="flex items-center gap-1 rounded-[8px] bg-white/55 px-2 py-1 ring-1 ring-[#0B2A4A]/20">
                    <span className="text-[13px] text-[#0B2A4A]/70">$</span>
                    <input
                      inputMode="decimal"
                      aria-label="Discount in dollars"
                      value={edits.discountCents ? String(edits.discountCents / 100) : ""}
                      placeholder="0"
                      onChange={(e) => setEdits((x) => ({ ...x, discountCents: Math.max(0, Math.round((Number(e.target.value.replace(/[^0-9.]/g, "")) || 0) * 100)) }))}
                      className="w-24 bg-transparent font-source-sans text-[14px] font-bold text-[#0B2A4A] outline-none"
                    />
                  </label>
                  <span className="text-[12px] text-[#0B2A4A]/75">Shown to the customer as a “Discount” line.</span>
                  {!q.complete ? <span className="text-[12px] font-semibold text-[#7F1D1D]">No trade costs: change line prices below instead of the margin.</span> : null}
                </div>
              </div>
            </div>
          ) : null}

          {/* Equipment */}
          <div className={`${GLASS} ${TINT.charcoal} p-0`}>
            <Sheen />
            <div className="relative flex items-center justify-between px-4 pb-2 pt-3">
              <p className={`m-0 ${TITLE}`}>Equipment</p>
              <p className="m-0 hidden text-[11px] text-white/55 sm:block">Buy = trade cost ex GST · Sell = customer price inc GST</p>
            </div>
            <div className="relative divide-y divide-white/10">
              {live.equipment.map((l) => {
                const orig = q.equipment[l.index]!;
                const changed = l.sellCents !== orig.sellCents || l.quantity !== orig.quantity;
                return (
                  <div key={l.index} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(0,2.2fr)_minmax(0,0.8fr)_minmax(0,1.1fr)_minmax(0,1.3fr)_minmax(0,1.2fr)] md:items-center">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="rounded-[6px] bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.6px] text-white/75">{CAT[l.category] ?? l.category}</span>
                        {l.supplier ? <span className="rounded-[6px] bg-[#4682B4]/30 px-1.5 py-0.5 text-[10px] font-semibold text-[#BFDBFE]">{l.supplier}</span> : null}
                      </div>
                      <p className="m-0 mt-1 truncate font-source-sans text-[14px] font-semibold text-white" title={l.name}>
                        {l.name}
                      </p>
                      <div className="mt-1">
                        <DatasheetCell line={orig} canEdit={!!deal.canEdit} onSave={saveSheet} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:block">
                      <span className="text-[11px] text-white/55 md:hidden">Qty</span>
                      {canEdit ? (
                        <input
                          type="number"
                          min={0}
                          step={1}
                          aria-label={`Quantity of ${l.name}`}
                          value={l.quantity}
                          onChange={(e) => setLine(l.index, { quantity: Math.max(0, Number(e.target.value) || 0) })}
                          className="w-[70px] rounded-[8px] bg-black/25 px-2 py-1 text-right font-source-sans text-[13px] font-semibold tabular-nums text-white outline-none ring-1 ring-white/15 focus:ring-[#FFEF62]/70"
                        />
                      ) : (
                        <span className="font-source-sans text-[14px] font-semibold tabular-nums text-white">{l.quantity}</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 md:block md:text-right">
                      <span className="text-[11px] text-white/55 md:hidden">Buy</span>
                      <div>
                        <p className="m-0 font-source-sans text-[14px] font-semibold tabular-nums text-white">{l.costCents === null ? "–" : $(l.costCents)}</p>
                        <p className="m-0 text-[11px] tabular-nums text-white/55">{l.unitCostCents === null ? "no cost" : `${$(l.unitCostCents, true)} each`}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 md:block md:text-right">
                      <span className="text-[11px] text-white/55 md:hidden">Sell</span>
                      <div className="flex flex-col items-end gap-1">
                        <p className={`m-0 font-source-sans text-[14px] font-bold tabular-nums ${changed ? "text-[#FFEF62]" : "text-white"}`}>{$(l.sellCents)}</p>
                        {canEdit ? (
                          <MoneyInput key={l.unitSellCents} label={`Unit price of ${l.name}`} cents={l.unitSellCents} onChange={(c) => setLine(l.index, { unitPriceCents: c })} />
                        ) : (
                          <p className="m-0 text-[11px] tabular-nums text-white/55">{$(l.unitSellCents, true)} each</p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 md:text-right">
                      <div className="flex items-baseline justify-between gap-2 md:justify-end">
                        <span className="text-[11px] text-white/55 md:hidden">Profit</span>
                        <span className={`font-source-sans text-[14px] font-bold tabular-nums ${l.profitCents !== null && l.profitCents < 0 ? "text-[#FCA5A5]" : "text-[#6EE7B7]"}`}>
                          {l.profitCents === null ? "–" : $(l.profitCents)}
                        </span>
                        <span className="text-[12px] tabular-nums text-white/70">{pct(l.markupPct)}</span>
                      </div>
                      <MiniBar value={l.markupPct} floor={floor} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {/* Job costs */}
            <div className={`${GLASS} ${TINT.slate} p-4`}>
              <Sheen />
              <p className={`relative m-0 ${TITLE}`}>Installation &amp; job costs</p>
              <div className="relative mt-2 flex flex-col divide-y divide-white/10">
                {live.works.length === 0 && live.discount === 0 ? <p className="m-0 py-2 text-[13px] text-white/70">No installation or extra works on this quote.</p> : null}
                {live.works.map((w) => (
                  <div key={w.index} className="flex items-start gap-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="m-0 truncate text-[13px] font-semibold text-white" title={w.name}>
                        {w.name}
                      </p>
                      <p className="m-0 text-[11px] text-white/60">
                        {w.kind === "INSTALL"
                          ? `to the installer ${$(w.installerCostCents)} ex GST`
                          : w.kind === "DELIVERY"
                            ? "delivery fee"
                            : `supply ${$(w.supplyCostCents)} · install ${$(w.installerCostCents)} ex GST`}
                      </p>
                    </div>
                    <span className="font-source-sans text-[13px] font-bold tabular-nums text-white">{$(w.sellCents)}</span>
                  </div>
                ))}
                {live.discount > 0 ? (
                  <div className="flex items-center gap-3 py-2">
                    <p className="m-0 flex-1 text-[13px] font-semibold text-[#FDE68A]">Discount</p>
                    <span className="font-source-sans text-[13px] font-bold tabular-nums text-[#FDE68A]">{$(-live.discount)}</span>
                  </div>
                ) : null}
              </div>
              <div className="relative mt-2 rounded-[10px] bg-black/20 p-3 text-[12px] text-white/75 ring-1 ring-white/10">
                Installer payout {$(live.installer)}
                {deal.payout ? ` (job offer) vs ${$(before.installerEstimateCents)} charged ex GST` : " (estimate, from the installation charged)"}.
                {deal.payout && deal.payout.cents > before.installerEstimateCents ? (
                  <span className="ml-1 font-semibold text-[#FCA5A5]">The payout is more than the installation charged.</span>
                ) : null}
              </div>
            </div>

            {/* Money summary */}
            <div className={`${GLASS} ${TINT.navy} p-4`}>
              <Sheen />
              <p className={`relative m-0 ${TITLE}`}>Money summary</p>
              <dl className="relative m-0 mt-2 grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 text-[13px]">
                {(
                  [
                    ["Price before STCs", $(live.subtotal), ""],
                    ["  includes GST", $(live.gst), "text-white/60"],
                    ...q.stcLines.map((s) => [s.kind === "BATTERY" ? "Battery rebate (STCs)" : "Solar STCs", $(-s.valueCents), "text-[#6EE7B7]"] as const),
                    ["Customer pays", $(live.customer), "font-bold text-[#FFEF62]"],
                    ["Deposit", $(live.deposit), ""],
                    ["Balance on installation", $(live.balance), ""],
                  ] as const
                ).map(([k, v, cls], i) => (
                  <div key={`${k}-${i}`} className="contents">
                    <dt className={`${cls} ${k.startsWith("  ") ? "pl-3" : ""} text-white/85`}>{k.trim()}</dt>
                    <dd className={`m-0 text-right tabular-nums text-white ${cls}`}>{v}</dd>
                  </div>
                ))}
                <div className="col-span-2 my-1 h-px bg-white/15" />
                {(
                  [
                    ["Revenue ex GST", $(live.revenueEx)],
                    ["Equipment cost", $(-live.eqCost)],
                    ["Installer", $(-live.installer)],
                    ...(live.other ? ([["Other supply costs", $(-live.other)]] as const) : []),
                  ] as const
                ).map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-white/75">{k}</dt>
                    <dd className="m-0 text-right tabular-nums text-white/90">{v}</dd>
                  </div>
                ))}
                <dt className="font-bold text-white">EasyLink profit</dt>
                <dd className={`m-0 text-right text-[15px] font-extrabold tabular-nums ${live.gross >= 0 ? "text-[#6EE7B7]" : "text-[#FCA5A5]"}`}>
                  {$(live.gross)} · {pct(live.grossPct)}
                </dd>
              </dl>
              <p className="relative m-0 mt-2 text-[11px] text-white/55">
                Cash in: {$(live.customer)} from the customer and {$(before.cashFromStcsCents)} from the STC buyer.
              </p>
            </div>
          </div>

          {/* Save bar */}
          {canEdit ? (
            <div className={`sticky bottom-2 z-10 ${GLASS} ${TINT.charcoal} flex flex-col gap-2 p-3 sm:flex-row sm:items-center`}>
              <Sheen />
              <div className="relative min-w-0 flex-1 text-[12px] text-white/80">
                {belowFloor ? (
                  <label className="flex cursor-pointer items-start gap-2 text-[#FDBA74]">
                    <input type="checkbox" checked={confirmLow} onChange={(e) => setConfirmLow(e.target.checked)} className="mt-0.5 accent-[#F97316]" />
                    <span>
                      <b>Below the {floor}% floor</b> — equipment margin after discount is {pct(live.markupAfterDiscount)}. Tick to save it anyway.
                    </span>
                  </label>
                ) : dirty ? (
                  q.quote.status === "DRAFT" ? (
                    "Changes go into this draft."
                  ) : (
                    `${STATUS[q.quote.status]} quotes are never changed: saving makes a new draft version to send.`
                  )
                ) : (
                  "Change the margin, a price, a quantity or the discount to see the numbers move."
                )}
                {notice ? <p className={`m-0 mt-1 font-semibold ${notice.tone === "good" ? "text-[#6EE7B7]" : "text-[#FCA5A5]"}`}>{notice.text}</p> : null}
              </div>
              <div className="relative flex gap-2">
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={resetEdits}
                  className="h-10 rounded-[10px] px-4 text-[13px] font-semibold text-white/80 ring-1 ring-white/20 hover:bg-white/10 disabled:opacity-40"
                >
                  Reset
                </button>
                <button
                  type="button"
                  disabled={!dirty || saving || (belowFloor && !confirmLow)}
                  onClick={save}
                  className="h-10 rounded-[10px] bg-[linear-gradient(133deg,#FFEF62_0%,#FFC828_45%,#F78D00_100%)] px-5 text-[13px] font-extrabold text-[#0B2A4A] shadow-[0_6px_20px_rgba(247,141,0,0.35)] transition hover:brightness-105 disabled:opacity-40 disabled:shadow-none"
                >
                  {saving ? "Saving…" : q.quote.status === "DRAFT" ? "Save prices" : "Save as new version"}
                </button>
              </div>
            </div>
          ) : deal.quotes.length && !deal.canEdit ? (
            <p className="m-0 rounded-[10px] bg-black/25 p-3 text-[12px] text-white/75 ring-1 ring-white/10">You can see the numbers; only the named price editors can change prices.</p>
          ) : null}
        </div>
      ) : null}

      {settingsOpen ? <SettingsPanel onClose={() => setSettingsOpen(false)} onSaved={() => load(q?.quote.id)} /> : null}
    </section>
  );
}
