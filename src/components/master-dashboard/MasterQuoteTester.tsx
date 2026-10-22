"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  QUOTE_DEFAULTS,
  SAMPLE_PRICE_BOOK,
  SYSTEM_TYPES,
  ZONE_RATINGS,
  type QuoteInputs,
  type QuoteResult,
  type SystemType,
  batteryFactorFor,
  countLabel,
  deemingYearsFor,
  inverterKinds,
  money,
  priceQuote,
  rate,
  showsPanels,
  systemLabel,
  usesBattery,
  usesPanels,
} from "@/lib/pricing/quote-engine";

/**
 * Matches the Easylink Designer "Pricing engine · quote tester" mock
 * (DistPricingEngine.dc.html + PricingBody.dc.html, role "operations",
 * screen "quote").
 *
 * Every figure on this screen is computed live by the engine in
 * @/lib/pricing/quote-engine — change a control and the line items, the
 * certificates, the comparison matrix and the all-types grid all re-price.
 * Nothing here is hardcoded output.
 *
 * Sample data: the rules are real, the price book is the mock's, because this
 * app has no price book of its own yet.
 */

const SUNRISE = "linear-gradient(90deg, #FFE866, #F68A0A)";
const ACCENT = "#2196F3";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const BORDER = "#E3E8EF";
const SOFT = "#F8FAFC";
const SUN_SOFT = "#FFF4DC";
const SUN_INK = "#3B1D00";
/** Shown where a column has no value for this row. */
const DASH = "—";

const TH =
  "border-b border-[#E3E8EF] bg-[#F8FAFC] px-2.5 py-2 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80] whitespace-nowrap";
const TD = "border-b border-[#EEF2F6] px-2.5 py-[9px] align-middle text-[13px] whitespace-nowrap";
const NUM = "text-right tabular-nums";
const EYE = "text-[11px] font-bold uppercase tracking-[0.07em] text-[#5B6B80]";
const SUB = "text-[12px] leading-[1.45] text-[#5B6B80]";
const CONTROL =
  "h-10 w-full min-w-0 box-border rounded-[10px] border border-[#CBD5E1] bg-white px-2.5 text-[14px] text-[#0F172A]";
const BTN =
  "inline-flex h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-[10px] border border-[#CBD5E1] bg-white px-3.5 text-[13px] font-semibold text-[#0F172A]";

/** The people a finished price can be attached to. */
const ATTACH_TO = [
  "Raj Malhotra · EasyLink lead · Seven Hills",
  "Penrith web lead · deposit-ready",
  "New Ready Site (draft)",
  "New Ready Deal template",
];

function Card({
  label,
  children,
  bare,
}: {
  label: string;
  children: React.ReactNode;
  /** Drop the padding so a table can run edge to edge. */
  bare?: boolean;
}) {
  return (
    <section
      aria-label={label}
      className={`flex min-w-0 flex-col gap-3 overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white ${
        bare ? "gap-0 p-0" : "p-[18px]"
      }`}
    >
      {children}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]">
      <span>{label}</span>
      {children}
    </label>
  );
}

/** A checkbox in the mock's soft-panel style. */
function Switch({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label
      className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[#E3E8EF] bg-[#F8FAFC] px-3 py-2.5 text-[14px] font-semibold"
      style={{ color: INK }}
    >
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="m-0 size-[18px] accent-[#F68A0A]"
      />
      {label}
    </label>
  );
}

function Check({
  label,
  per,
  on,
  onChange,
}: {
  label: string;
  per?: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
      <input
        type="checkbox"
        checked={on}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-px size-[18px] shrink-0 accent-[#F68A0A]"
      />
      <span>
        {label}
        {per ? <span className={SUB}> · per {per}</span> : null}
      </span>
    </label>
  );
}

/** [background, foreground, border] */
const CHIP_TONES = {
  block: ["#FEE2E2", "#991B1B", "#FCA5A5"],
  warn: ["#FEF3C7", "#92400E", "#FCD34D"],
  note: ["#EFF6FF", "#1E3A8A", "#DBEAFE"],
} as const;

function Chip({ tone, children }: { tone: keyof typeof CHIP_TONES; children: React.ReactNode }) {
  const [bg, fg, bd] = CHIP_TONES[tone];
  return (
    <div
      role="status"
      className="rounded-[10px] px-3 py-2.5 text-[13px]"
      style={{ background: bg, color: fg, border: `1px solid ${bd}` }}
    >
      {tone === "block" ? <strong>Can&rsquo;t quote: </strong> : null}
      {children}
    </div>
  );
}

export function MasterQuoteTester() {
  const pb = SAMPLE_PRICE_BOOK;
  const s = pb.settings;

  const [q, setQ] = useState<QuoteInputs>(QUOTE_DEFAULTS);
  const [who, setWho] = useState(0);
  const [msg, setMsg] = useState("");

  const patch = (next: Partial<QuoteInputs>) => {
    setQ((prev) => ({ ...prev, ...next }));
    setMsg("");
  };
  /** Switching system type re-opens auto-sizing, since kinds differ per type. */
  const pickType = (type: SystemType) => patch({ type, inverterId: "auto" });

  const r = useMemo(() => priceQuote(pb, q), [pb, q]);

  const kinds = inverterKinds(q.type);
  const panel = pb.panels.find((p) => p.id === q.panelId) ?? pb.panels[0];
  const years = deemingYearsFor(q.date);
  const factor = batteryFactorFor(q.date);

  const MODES = [
    [true, true],
    [true, false],
    [false, true],
    [false, false],
  ] as const;

  /** The same inputs priced under all four installation × STC modes. */
  const matrix = useMemo(
    () => MODES.map(([install, stc]) => priceQuote(pb, q, q.type, install, stc)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pb, q],
  );

  /** Every system type on the same inputs, for the comparison grid. */
  const grid = useMemo(
    () =>
      SYSTEM_TYPES.map((t) => {
        const cells = MODES.map(([install, stc]) => priceQuote(pb, q, t.id, install, stc));
        return { ...t, cells, stcCount: cells[0].stcCount, blocked: cells[0].blocks.length > 0 };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [pb, q],
  );

  /** A matrix cell. Supply-only with STCs asked for is an ineligibility, not a price. */
  const cell = (c: QuoteResult) => {
    const current = c.install === q.install && c.stc === q.stc;
    const ineligible =
      c.stc && !c.install && !s.supplyOnlyStc && (usesPanels(q.type) || usesBattery(q.type));
    return {
      current,
      big: ineligible ? "Not eligible" : money(c.net),
      small: ineligible
        ? `Supply only gets no STCs: ${money(c.net)}`
        : `${money(c.priceBeforeStcs)} − STCs ${money(c.stcValue)}`,
    };
  };

  const stcTotal = r.stcValue;
  const kpis = [
    {
      label: "Price before STCs",
      value: money(r.priceBeforeStcs),
      sub: "inc GST",
      card: true,
    },
    {
      label: "STC discount",
      value: stcTotal ? `−${money(stcTotal)}` : money(0),
      sub: `${r.stcCount} STCs × ${rate(s.stcPrice)}`,
      card: true,
      bg: SUN_SOFT,
      fg: SUN_INK,
    },
    {
      label: "Net to customer",
      value: money(r.net),
      sub: r.install ? "installed · inc GST" : "supply only · inc GST",
      bg: SUNRISE,
      fg: SUN_INK,
      big: true,
    },
    {
      label: "EasyLink margin",
      value: money(r.marginDollars),
      sub: `${s.margin}% on cost ${money(r.cost)}`,
      card: true,
    },
  ];

  return (
    <div className="flex min-h-full flex-col text-[#0F172A]">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          <Link href="/master/price-book" className="text-[#5B6B80] hover:underline">
            Pricing engine
          </Link>{" "}
          <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Quote tester</span>
        </nav>
        <span className="rounded-full bg-[#DBEAFE] px-2.5 py-[3px] text-[12px] font-bold text-[#1E40AF]">
          Sample price book
        </span>
        <span
          className="rounded-full px-2.5 py-[3px] text-[12px] font-bold"
          style={{ background: SUNRISE, color: SUN_INK }}
        >
          Pricing engine
        </span>
      </header>

      <div className="flex w-full max-w-[1440px] flex-col gap-[18px] px-8 pb-14 pt-6">
        <div className="flex flex-wrap items-end gap-3.5">
          <div className="min-w-0 flex-[1_1_420px]">
            <h1 className="m-0 font-source-sans text-[28px] font-bold">
              Pricing engine · quote tester
            </h1>
            <p className="mb-0 mt-1 text-[13px] text-[#5B6B80]">
              Test any system on the live rules: EasyLink cost, margin, GST and STCs, installed or
              supply only
            </p>
          </div>
          <span className="rounded-full bg-[#0B1A2E] px-2.5 py-[3px] text-[11px] font-bold text-white">
            EasyLink cost view
          </span>
          <Link href="/master/price-book" className={BTN}>
            Price book &amp; rules
          </Link>
        </div>

        {msg ? (
          <div
            role="status"
            className="rounded-[12px] bg-[#DCFCE7] px-3.5 py-[11px] text-[14px] font-semibold text-[#166534]"
          >
            {msg}
          </div>
        ) : null}

        <div className="flex flex-wrap items-start gap-[18px]">
          {/* ------------------------------------------------- inputs */}
          <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-3.5 lg:max-w-[380px]">
            <Card label="System type">
              <span className={EYE}>System type</span>
              <div className="grid grid-cols-2 gap-2">
                {SYSTEM_TYPES.map((t) => {
                  const on = q.type === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      aria-pressed={on}
                      onClick={() => pickType(t.id)}
                      className="flex cursor-pointer flex-col gap-0.5 rounded-[12px] px-3 py-2.5 text-left"
                      style={{
                        border: on ? `2px solid ${ACCENT}` : `1px solid ${BORDER}`,
                        background: on ? "#EFF6FF" : SOFT,
                        color: INK,
                      }}
                    >
                      <strong className="text-[14px]">{t.label}</strong>
                      <span className={SUB}>{t.desc}</span>
                    </button>
                  );
                })}
              </div>
            </Card>

            <Card label="Pricing mode">
              <span className={EYE}>Pricing mode</span>
              <div className="grid grid-cols-2 gap-2">
                <Switch
                  label="Installation"
                  on={q.install}
                  onChange={(v) => patch({ install: v })}
                />
                <Switch label="STC discount" on={q.stc} onChange={(v) => patch({ stc: v })} />
              </div>
              <span className={SUB}>
                Supply only means no STCs: they are created only when an accredited installer
                installs the system.
              </span>
            </Card>

            {q.type !== "ev" ? (
              <Card label="Equipment">
                <span className={EYE}>Equipment</span>

                {showsPanels(q.type) ? (
                  <>
                    <div className="grid grid-cols-[1.6fr_1fr] gap-2.5">
                      <Field label="Panel">
                        <select
                          className={CONTROL}
                          value={q.panelId}
                          onChange={(e) => patch({ panelId: e.target.value })}
                        >
                          {pb.panels.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.model} · {p.w} W
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={countLabel(q.type)}>
                        <input
                          type="number"
                          min={0}
                          step={1}
                          className={`${CONTROL} tabular-nums`}
                          value={q.count}
                          onChange={(e) =>
                            patch({ count: Math.max(0, Math.floor(Number(e.target.value) || 0)) })
                          }
                        />
                      </Field>
                    </div>
                    <span className={SUB}>
                      {q.count} × {panel.w} W = {r.arrayKw.toFixed(2)} kW array
                    </span>
                  </>
                ) : null}

                {kinds ? (
                  <Field label="Inverter">
                    <select
                      className={CONTROL}
                      value={q.inverterId}
                      onChange={(e) => patch({ inverterId: e.target.value })}
                    >
                      <option value="auto">Auto-size</option>
                      {pb.inverters
                        .filter((i) => kinds.includes(i.kind))
                        .map((i) => (
                          <option key={i.id} value={i.id}>
                            {i.model}
                          </option>
                        ))}
                    </select>
                  </Field>
                ) : null}

                {usesBattery(q.type) ? (
                  <Field label="Battery">
                    <select
                      className={CONTROL}
                      value={q.batteryId}
                      onChange={(e) => patch({ batteryId: e.target.value })}
                    >
                      {pb.batteries.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.model} ({b.kwh} kWh usable)
                        </option>
                      ))}
                    </select>
                  </Field>
                ) : null}

                {q.type === "battery" ? (
                  <Check
                    label="Site already has solar panels (needed for battery STCs)"
                    on={q.existing}
                    onChange={(v) => patch({ existing: v })}
                  />
                ) : null}
              </Card>
            ) : null}

            <Card label="Site">
              <span className={EYE}>Site</span>
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="STC zone">
                  <select
                    className={CONTROL}
                    value={q.zone}
                    onChange={(e) => patch({ zone: Number(e.target.value) })}
                  >
                    {[1, 2, 3, 4].map((z) => (
                      <option key={z} value={z}>
                        Zone {z} ({ZONE_RATINGS[z]})
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Supply">
                  <select
                    className={CONTROL}
                    value={q.phase}
                    onChange={(e) => patch({ phase: Number(e.target.value) === 3 ? 3 : 1 })}
                  >
                    <option value={1}>Single phase</option>
                    <option value={3}>Three phase</option>
                  </select>
                </Field>
              </div>
              <Field label="Expected install date">
                <input
                  type="date"
                  className={CONTROL}
                  value={q.date}
                  onChange={(e) => {
                    if (e.target.value) patch({ date: e.target.value });
                  }}
                />
              </Field>
              <span className={SUB}>
                Solar: {years} deeming year{years === 1 ? "" : "s"} × {ZONE_RATINGS[q.zone]} per kW.
                Battery: factor {factor || "none"} per usable kWh, tiered 100 / 60 / 15%.
              </span>
            </Card>

            <Card label="Extras">
              <span className={EYE}>Extras</span>
              {pb.extras
                .filter(
                  (x) =>
                    (x.id !== "ev" || q.type !== "ev") &&
                    (x.per !== "panel" || usesPanels(q.type)),
                )
                .map((x) => (
                  <Check
                    key={x.id}
                    label={x.label}
                    per={x.per}
                    on={!!q.extras[x.id]}
                    onChange={(v) => patch({ extras: { ...q.extras, [x.id]: v } })}
                  />
                ))}
            </Card>
          </div>

          {/* ------------------------------------------------ outputs */}
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))" }}
            >
              {kpis.map((k) => (
                <div
                  key={k.label}
                  className="flex flex-col gap-0.5 rounded-[14px] p-[18px]"
                  style={{
                    background: k.bg ?? "#FFFFFF",
                    color: k.fg ?? INK,
                    border: k.card ? `1px solid ${BORDER}` : undefined,
                  }}
                >
                  <span
                    className="text-[11px] font-bold uppercase tracking-[0.07em]"
                    style={{ color: k.fg ?? MUTED }}
                  >
                    {k.label}
                  </span>
                  <strong
                    className={`font-source-sans font-bold tabular-nums ${
                      k.big ? "text-[32px]" : "text-[28px]"
                    }`}
                  >
                    {k.value}
                  </strong>
                  <span
                    className="text-[12px] leading-[1.45]"
                    style={{ color: k.fg ?? MUTED, fontWeight: k.fg ? 600 : 400 }}
                  >
                    {k.sub}
                  </span>
                </div>
              ))}
            </div>

            {r.blocks.map((t) => (
              <Chip key={t} tone="block">
                {t}
              </Chip>
            ))}
            {r.warns.map((t) => (
              <Chip key={t} tone="warn">
                {t}
              </Chip>
            ))}
            {r.notes.map((t) => (
              <Chip key={t} tone="note">
                {t}
              </Chip>
            ))}

            <Card bare label="Line items">
              <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
                <h2 className="m-0 flex-grow text-[16px] font-bold">
                  {systemLabel(q.type)} · {r.install ? "installed" : "supply only"} ·{" "}
                  {r.stc ? "with STCs" : "no STCs"}
                </h2>
                <span className={SUB}>EasyLink cost prices ex GST</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Item</th>
                      <th className={`${TH} text-right`}>Qty</th>
                      <th className={`${TH} text-right`}>Supply cost</th>
                      <th className={`${TH} text-right`}>Install</th>
                      <th className={`${TH} text-right`}>Sell ex GST</th>
                      <th className={`${TH} text-right`}>Sell inc GST</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.lines.map((l) => (
                      <tr key={l.item}>
                        <td className={`${TD} whitespace-normal`}>{l.item}</td>
                        <td className={`${TD} ${NUM}`}>{l.qty}</td>
                        <td className={`${TD} ${NUM}`}>{money(l.supply)}</td>
                        <td className={`${TD} ${NUM}`}>{r.install ? money(l.install) : DASH}</td>
                        <td className={`${TD} ${NUM}`}>{money(l.sellEx)}</td>
                        <td className={`${TD} ${NUM}`}>{money(l.sellInc)}</td>
                      </tr>
                    ))}

                    <tr className="bg-[#F8FAFC] font-bold">
                      <td className={TD}>Total</td>
                      <td className={TD} />
                      <td className={`${TD} ${NUM}`}>{money(r.supplyTotal)}</td>
                      <td className={`${TD} ${NUM}`}>
                        {r.install ? money(r.installTotal) : DASH}
                      </td>
                      <td className={`${TD} ${NUM}`}>{money(r.sellEx)}</td>
                      <td className={`${TD} ${NUM}`}>{money(r.priceBeforeStcs)}</td>
                    </tr>

                    {r.stcLines.map((l) => (
                      <tr key={l.label} style={{ background: SUN_SOFT, color: SUN_INK }}>
                        <td className={`${TD} whitespace-normal`} colSpan={5}>
                          {l.label}
                        </td>
                        <td className={`${TD} ${NUM}`}>&minus;{money(l.value)}</td>
                      </tr>
                    ))}

                    <tr>
                      <td
                        className={`${TD} text-[15px] font-bold`}
                        colSpan={5}
                        style={{ borderTop: `2px solid ${INK}` }}
                      >
                        Net price to customer
                      </td>
                      <td
                        className={`${TD} ${NUM} text-[15px] font-bold`}
                        style={{ borderTop: `2px solid ${INK}` }}
                      >
                        {money(r.net)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>

            <Card label="Installation and STC matrix">
              <div className="flex flex-wrap items-baseline gap-2.5">
                <h2 className="m-0 flex-grow text-[16px] font-bold">Installation × STC</h2>
                <span className={SUB}>
                  Same equipment priced four ways · outlined = current mode
                </span>
              </div>
              <div className="grid grid-cols-[120px_1fr_1fr] gap-2">
                <span />
                <span className={EYE}>With STCs</span>
                <span className={EYE}>Without STCs</span>

                {(["Installed", "Supply only"] as const).map((rowLabel, row) => (
                  <Fragmented key={rowLabel}>
                    <span className={`${EYE} self-center`}>{rowLabel}</span>
                    {[0, 1].map((col) => {
                      const c = cell(matrix[row * 2 + col]);
                      return (
                        <div
                          key={col}
                          className="flex flex-col gap-0.5 rounded-[12px] bg-[#F8FAFC] p-3"
                          style={{
                            border: `2px solid ${c.current ? ACCENT : "transparent"}`,
                          }}
                        >
                          <strong className="text-[20px] tabular-nums">{c.big}</strong>
                          <span className={`${SUB} tabular-nums`}>{c.small}</span>
                        </div>
                      );
                    })}
                  </Fragmented>
                ))}
              </div>
            </Card>

            <Card bare label="Every system type">
              <div className="flex flex-wrap items-baseline gap-2.5 px-[18px] py-3.5">
                <h2 className="m-0 flex-grow text-[16px] font-bold">
                  Every system type, same inputs
                </h2>
                <span className={SUB}>Net to customer inc GST · pick a row to open it</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>System type</th>
                      <th className={`${TH} text-right`}>Installed + STC</th>
                      <th className={`${TH} text-right`}>Installed, no STC</th>
                      <th className={`${TH} text-right`}>Supply + STC</th>
                      <th className={`${TH} text-right`}>Supply, no STC</th>
                      <th className={`${TH} text-right`}>STCs</th>
                      <th className={TH}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {grid.map((t) => (
                      <tr
                        key={t.id}
                        style={{ background: t.id === q.type ? "#EFF6FF" : "transparent" }}
                      >
                        <td className={TD}>
                          <button
                            type="button"
                            onClick={() => pickType(t.id)}
                            className="cursor-pointer border-0 bg-transparent p-0 text-[13px] font-bold text-[#1565C0]"
                          >
                            {t.label}
                          </button>{" "}
                          <span className={SUB}>{t.desc}</span>
                        </td>
                        {t.cells.map((c, i) => (
                          <td key={i} className={`${TD} ${NUM}`}>
                            {money(c.net)}
                          </td>
                        ))}
                        <td className={`${TD} ${NUM}`}>{t.stcCount}</td>
                        <td className={TD}>
                          <span
                            className="inline-block rounded-full px-[9px] py-[3px] text-[11px] font-bold"
                            style={{
                              background: t.blocked ? "#FEE2E2" : "#DCFCE7",
                              color: t.blocked ? "#991B1B" : "#166534",
                            }}
                          >
                            {t.blocked ? "Blocked" : "OK"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card label="Save">
              <h2 className="m-0 text-[16px] font-bold">Use this price</h2>
              <div className="flex flex-wrap items-end gap-2.5">
                <div className="min-w-0 flex-[1_1_260px]">
                  <Field label="Attach to">
                    <select
                      className={CONTROL}
                      value={who}
                      onChange={(e) => {
                        setWho(Number(e.target.value));
                        setMsg("");
                      }}
                    >
                      {ATTACH_TO.map((p, i) => (
                        <option key={p} value={i}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>
                <button
                  type="button"
                  className={BTN}
                  onClick={() =>
                    setMsg(`Saved as a draft for ${ATTACH_TO[who]} · ${money(r.net)} net.`)
                  }
                >
                  Save as draft
                </button>
                <button
                  type="button"
                  className={`${BTN} border-0 font-bold`}
                  style={{ background: SUNRISE, color: SUN_INK }}
                  onClick={() =>
                    setMsg(
                      r.blocks.length
                        ? "Fix the blocked items before sending."
                        : `Price attached to ${ATTACH_TO[who]} · ${money(r.net)} net inc GST.`,
                    )
                  }
                >
                  Attach price
                </button>
              </div>
              <span className={SUB}>
                Attaching saves the inputs, the price book version and every line, so the price can
                be checked later. Saving is not wired up yet — this screen tests prices.
              </span>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Groups grid children without introducing a wrapper box. */
function Fragmented({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
