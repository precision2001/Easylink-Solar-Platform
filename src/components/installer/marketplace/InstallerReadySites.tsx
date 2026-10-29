"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * Matches the Easylink Designer "Ready Sites" mock (InstReadySites.dc.html):
 * the buyer side of the marketplace whose seller side is MasterReadySites.
 *
 * There is no marketplace model in this app yet — no Ready Site listings,
 * site fees, installer purchases or deposit custody — so the listings here
 * are the mock's sample data, the same convention (and the same records) as
 * the admin page. The behaviour is the mock's own logic ported rather than
 * faked: the filters, the selection, and the profit estimate all recompute
 * from the selected site.
 *
 * Buying is deliberately a preview. Nothing is charged, no customer or job
 * is created, and the "bought" state lives in this component for the session
 * only — the completed panel says so rather than claiming a purchase that
 * did not happen.
 */

const money = (n: number) => "$" + Math.round(Number(n) || 0).toLocaleString("en-AU");

/** Inverter and battery catalogues, matching the admin Ready Sites page. */
const INV: Record<string, string> = {
  s5: "5 kW inverter (INV-S5)",
  fx99: "9.9 kW hybrid (INV-FX99)",
  g10: "10 kW three-phase hybrid (INV-G10T)",
};

const BAT: Record<string, number> = { none: 0, b100: 10, b200: 20, fx: 16.1 };

const kwOf = (panels: number) => Math.round(panels * 44) / 100;

type Site = {
  id: string;
  suburb: string;
  state: string;
  pc: string;
  dist: number;
  panels: number;
  inv: keyof typeof INV;
  bat: keyof typeof BAT;
  roof: string;
  payConf: boolean;
  paid: number;
  instConf: boolean;
  win: string;
  contract: number;
  fee: number;
  exp: string;
  area: boolean;
  reserved?: boolean;
  name: string;
  mob: string;
  email: string;
  street: string;
};

const SITES: Site[] = [
  { id: "RS-2041", suburb: "Kellyville", state: "NSW", pc: "2155", dist: 9, panels: 23, inv: "fx99", bat: "b100", roof: "Tile · single storey", payConf: true, paid: 2000, instConf: true, win: "18–22 Nov", contract: 15890, fee: 890, exp: "Listing ends in 2 days", area: true, name: "Sarah Lim", mob: "0412 448 913", email: "sarah.lim@example.com", street: "14 Hezlett Rd, Kellyville Ridge" },
  { id: "RS-2043", suburb: "Castle Hill", state: "NSW", pc: "2154", dist: 11, panels: 30, inv: "g10", bat: "b200", roof: "Tile · double storey", payConf: false, paid: 0, instConf: true, win: "26–28 Nov", contract: 24650, fee: 1250, exp: "Elite head start ends in 4 h", area: true, name: "Daniel Okafor", mob: "0423 771 905", email: "daniel.okafor@example.com", street: "3 Gilham St, Castle Hill" },
  { id: "RS-2042", suburb: "Marsden Park", state: "NSW", pc: "2765", dist: 14, panels: 15, inv: "s5", bat: "none", roof: "Colorbond · single storey", payConf: true, paid: 1000, instConf: false, win: "Install date open", contract: 6490, fee: 450, exp: "Listing ends in 5 days", area: true, name: "Ahmed Haddad", mob: "0431 220 784", email: "ahmed.haddad@example.com", street: "7 Carnarvon St, Marsden Park" },
  { id: "RS-2044", suburb: "Penrith", state: "NSW", pc: "2750", dist: 28, panels: 0, inv: "fx99", bat: "fx", roof: "Colorbond · single storey", payConf: true, paid: 9800, instConf: true, win: "4–6 Nov", contract: 9800, fee: 600, exp: "Hold ends in 19 h", area: true, reserved: true, name: "", mob: "", email: "", street: "" },
  { id: "RS-2046", suburb: "Wollongong", state: "NSW", pc: "2500", dist: 86, panels: 23, inv: "fx99", bat: "none", roof: "Tile · single storey", payConf: true, paid: 1500, instConf: true, win: "11–14 Nov", contract: 10990, fee: 690, exp: "Listing ends in 6 days", area: false, name: "Ruth Collins", mob: "0402 993 118", email: "ruth.collins@example.com", street: "41 Bourke St, Wollongong" },
];

const FILTERS: { key: string; label: string; test: (s: Site) => boolean }[] = [
  { key: "area", label: "In my areas", test: (s) => s.area },
  { key: "all", label: "All NSW", test: () => true },
  { key: "paid", label: "Payment confirmed", test: (s) => s.payConf },
  { key: "inst", label: "Install booked", test: (s) => s.instConf },
  { key: "bat", label: "With battery", test: (s) => BAT[s.bat] > 0 },
];

const sysOf = (s: Site) =>
  (s.panels ? `${kwOf(s.panels)} kW solar` : "Battery retrofit") +
  (BAT[s.bat] ? ` + ${BAT[s.bat]} kWh battery` : "");

function confOf(s: Site) {
  const out: { t: string; bg: string; fg: string }[] = [];
  if (s.payConf) {
    out.push({
      t: s.paid >= s.contract ? "Paid in full" : `${money(s.paid)} paid`,
      bg: "#DCFCE7",
      fg: "#166534",
    });
  }
  if (s.instConf) out.push({ t: "Install booked", bg: "#E0F2FE", fg: "#0B2540" });
  return out;
}

/** The mock's own profit estimate, kept intact so the figures reconcile. */
function estimate(s: Site) {
  const kw = kwOf(s.panels);
  const bk = BAT[s.bat] || 0;
  const equipment = Math.round(
    kw * 330 + bk * 520 + (s.inv === "g10" ? 2600 : s.inv === "fx99" ? 2100 : 900),
  );
  const stc =
    ((s.panels ? Math.floor(kw * 1.382 * 5) : 0) + Math.floor(Math.min(bk, 50) * 6.8)) * 38;
  const labour = Math.round(kw * 180 + (bk ? 650 : 0) + 450);
  const exGst = Math.round(s.contract / 1.1);
  const profit = exGst + stc - equipment - labour - s.fee;
  return { kw, bk, equipment, stc, labour, exGst, profit };
}

const PILL = "rounded-full px-2.5 py-[3px] text-[11px] font-bold whitespace-nowrap";

export function InstallerReadySites() {
  const [tab, setTab] = useState<"avail" | "mine">("avail");
  const [filter, setFilter] = useState("area");
  const [currentId, setCurrentId] = useState("RS-2041");
  const [step, setStep] = useState<"view" | "confirm">("view");
  const [agreed, setAgreed] = useState(false);
  const [bought, setBought] = useState<string[]>([]);
  const [watching, setWatching] = useState<string[]>([]);

  const available = useMemo(
    () => SITES.filter((s) => !bought.includes(s.id)),
    [bought],
  );

  const shown = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
    return available.filter(test);
  }, [available, filter]);

  const selected =
    SITES.find((s) => s.id === currentId) ?? shown[0] ?? SITES[0];
  const isBought = bought.includes(selected.id);
  const est = estimate(selected);
  const isWatching = watching.includes(selected.id);

  const pick = (id: string) => {
    setCurrentId(id);
    setStep("view");
    setAgreed(false);
  };

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <section
        aria-label="Ready Sites"
        className="relative flex flex-wrap items-center gap-[18px] overflow-hidden rounded-[18px] bg-[#0B1A2E] px-6 py-[22px] text-white"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[60px] -top-20 size-[260px] rounded-full opacity-35"
          style={{
            background: "radial-gradient(circle, #FFE866, #F68A0A)",
          }}
        />
        <div className="relative flex flex-[1_1_420px] flex-col gap-1.5">
          <span
            className={`${PILL} self-start bg-[#F68A0A] text-[#3B1D00]`}
          >
            {available.filter((s) => s.area && !s.reserved).length} NEW IN YOUR SERVICE AREAS
          </span>
          <h1 className="m-0 font-source-sans text-[30px] font-bold">Ready Sites</h1>
          <p className="m-0 max-w-[720px] text-[14px] leading-[1.5] text-[#E6EDF7]">
            Customers who have already paid, booked their install, or both. Buying a
            site moves the customer, documents and deposit to you.
          </p>
        </div>
        <div className="relative flex flex-wrap gap-3">
          {[
            {
              l: "Contract value open",
              v: money(
                available.filter((s) => !s.reserved).reduce((a, s) => a + s.contract, 0),
              ),
            },
            {
              l: "Deposits already paid",
              v: money(
                available
                  .filter((s) => !s.reserved && s.payConf)
                  .reduce((a, s) => a + s.paid, 0),
              ),
            },
            { l: "You've bought", v: String(bought.length) },
          ].map((h) => (
            <div
              key={h.l}
              className="flex min-w-[120px] flex-col rounded-xl bg-[#13263F] px-4 py-3"
            >
              <span className="text-[11px] text-[#9FB0C8]">{h.l}</span>
              <strong className="text-[22px]">{h.v}</strong>
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Ready Sites"
          className="mr-auto flex gap-1 rounded-xl bg-[#E2E8F0] p-1"
        >
          {(
            [
              ["avail", `Available · ${available.length}`],
              ["mine", `My purchased sites · ${bought.length}`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className="h-9 rounded-[9px] px-3.5 text-[13px] font-bold text-[#0F172A]"
              style={{ background: tab === key ? "#FFFFFF" : "transparent" }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === "avail" ? (
          <div role="group" aria-label="Filter" className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFilter(f.key)}
                  className="h-[34px] rounded-full border px-3 text-[13px] font-semibold"
                  style={
                    on
                      ? { background: "#0B1A2E", borderColor: "#0B1A2E", color: "#FFFFFF" }
                      : { background: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }
                  }
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      {tab === "mine" ? (
        <section
          aria-label="My purchased sites"
          className="rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]"
        >
          {!bought.length ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">
              You haven&apos;t bought a site in this preview yet.
            </p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {bought.map((id) => {
                const s = SITES.find((x) => x.id === id);
                if (!s) return null;
                return (
                  <li key={id} className="flex flex-wrap items-center gap-2.5 border-b border-[#EEF2F6] py-2 last:border-0">
                    <strong className="flex-grow text-[14px] text-[#0F172A]">
                      {s.id} · {s.suburb} {s.pc}
                    </strong>
                    <span className="text-[13px] text-[#475569]">{sysOf(s)}</span>
                    <span className={`${PILL} bg-[#E0F2FE] text-[#0B2540]`}>
                      Preview only
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : (
        <div className="grid items-start gap-4 [grid-template-columns:repeat(auto-fit,minmax(400px,1fr))]">
          <section aria-label="Available sites" className="flex min-w-0 flex-col gap-2.5">
            {!shown.length ? (
              <p className="m-0 rounded-[14px] border border-dashed border-[#CBD5E1] bg-white p-6 text-[14px] text-[#475569]">
                No Ready Sites match this filter.
              </p>
            ) : (
              shown.map((s) => {
                const on = s.id === selected.id;
                const ring = on
                  ? "#0B1A2E"
                  : s.area && !s.reserved
                    ? "#F68A0A"
                    : "#E3E8EF";
                return (
                  <div key={s.id} className="rounded-2xl p-0.5" style={{ background: ring }}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => pick(s.id)}
                      className="flex w-full flex-col gap-2 rounded-[14px] bg-white p-4 text-left"
                    >
                      <span className="flex flex-wrap items-center gap-1.5">
                        <strong className="flex-grow text-[15px] text-[#0F172A]">
                          {s.id} · {s.suburb} {s.pc}
                        </strong>
                        {s.area && !s.reserved ? (
                          <span className={`${PILL} bg-[#F68A0A] text-[#3B1D00]`}>
                            In your area
                          </span>
                        ) : null}
                        {s.reserved ? (
                          <span className={`${PILL} bg-[#FEF3C7] text-[#92400E]`}>
                            Reserved by another installer
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[14px] font-semibold text-[#0F172A]">
                        {sysOf(s)}
                      </span>
                      <span className="flex flex-wrap gap-1">
                        {confOf(s).map((c) => (
                          <span
                            key={c.t}
                            className={PILL}
                            style={{ background: c.bg, color: c.fg }}
                          >
                            ✓ {c.t}
                          </span>
                        ))}
                      </span>
                      <span className="flex flex-wrap gap-3.5 text-[12px] text-[#475569]">
                        <span>{s.dist} km away</span>
                        <span>{s.win}</span>
                        <span>
                          Contract{" "}
                          <strong className="text-[#0F172A]">{money(s.contract)}</strong>
                        </span>
                        <span>
                          Fee <strong className="text-[#0F172A]">{money(s.fee)}</strong>
                        </span>
                      </span>
                      <span
                        className="text-[12px] font-bold"
                        style={{ color: /h$/.test(s.exp) ? "#92400E" : "#475569" }}
                      >
                        {s.exp}
                      </span>
                    </button>
                  </div>
                );
              })
            )}
          </section>

          <section
            aria-label="Site detail"
            className="flex flex-col gap-3.5 rounded-[14px] border border-[#E3E8EF] bg-white p-5"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="m-0 flex-grow text-[20px] font-bold text-[#0F172A]">
                {selected.id} · {selected.suburb} {selected.state} {selected.pc}
              </h2>
              <span className="flex gap-1">
                {confOf(selected).map((c) => (
                  <span key={c.t} className={PILL} style={{ background: c.bg, color: c.fg }}>
                    ✓ {c.t}
                  </span>
                ))}
              </span>
            </div>

            <span className="text-[14px] text-[#334155]">
              {[
                selected.panels ? `${selected.panels} × AXITEC 440 W (${est.kw} kW)` : "",
                INV[selected.inv],
                est.bk ? `${est.bk} kWh battery` : "",
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {[
                {
                  l: "Customer contract",
                  v: money(selected.contract),
                  n: "incl GST · paid to you",
                },
                {
                  l: "Deposit held",
                  v: selected.payConf ? money(selected.paid) : "$0",
                  n: selected.payConf ? "paid to you on purchase" : "customer pays on install",
                },
                { l: "Install window", v: selected.win, n: selected.roof },
              ].map((t) => (
                <div key={t.l} className="flex flex-col gap-0.5 rounded-[10px] bg-[#F8FAFC] p-3">
                  <span className="text-[12px] text-[#5B6B80]">{t.l}</span>
                  <strong className="text-[18px] text-[#0F172A]">{t.v}</strong>
                  <span className="text-[12px] text-[#5B6B80]">{t.n}</span>
                </div>
              ))}
            </div>

            {isBought ? (
              <>
                <div
                  role="status"
                  className="flex flex-col gap-1 rounded-xl bg-[#E0F2FE] p-3.5 text-[#0B2540]"
                >
                  <strong className="text-[15px]">
                    Preview only — no purchase was made.
                  </strong>
                  <span className="text-[13px]">
                    This app has no marketplace backend yet, so nothing was charged and
                    no customer or job was created. The details below come from this
                    page&apos;s sample record and reset when you reload.
                  </span>
                </div>
                <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">
                  What a real purchase would unlock
                </h3>
                <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-2.5 gap-y-1.5 text-[13px]">
                  {[
                    ["Name", selected.name],
                    ["Mobile", selected.mob],
                    ["Email", selected.email],
                    ["Address", `${selected.street} ${selected.state} ${selected.pc}`],
                  ].map(([k, v]) => (
                    <div key={k} className="contents">
                      <dt className="text-[#5B6B80]">{k}</dt>
                      <dd className="m-0 font-semibold text-[#0F172A]">{v}</dd>
                    </div>
                  ))}
                </dl>
                <button
                  type="button"
                  onClick={() => setBought((b) => b.filter((x) => x !== selected.id))}
                  className="h-10 w-fit rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A]"
                >
                  Reset this preview
                </button>
              </>
            ) : step === "view" ? (
              <>
                <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">
                  Your numbers (estimate)
                </h3>
                <div>
                  {[
                    { l: "Contract ex GST", v: money(est.exGst), b: false },
                    { l: "STC rebates you claim", v: `+ ${money(est.stc)}`, b: false },
                    { l: "Equipment at your trade price", v: `− ${money(est.equipment)}`, b: false },
                    { l: "Labour (your crew rates)", v: `− ${money(est.labour)}`, b: false },
                    { l: "Site fee", v: `− ${money(selected.fee)}`, b: false },
                    {
                      l: "Estimated gross profit",
                      v: `${money(est.profit)} · ${Math.round((est.profit / (est.exGst + est.stc)) * 100)}% of revenue`,
                      b: true,
                    },
                  ].map((r) => (
                    <div
                      key={r.l}
                      className="flex justify-between gap-3 border-b border-[#E3E8EF] py-1.5 text-[13px] last:border-0"
                      style={{ fontWeight: r.b ? 700 : 400 }}
                    >
                      <span>{r.l}</span>
                      <span>{r.v}</span>
                    </div>
                  ))}
                </div>

                {selected.reserved ? (
                  <p className="m-0 text-[13px] font-semibold text-[#92400E]">
                    Another installer has a 24-hour hold on this site.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("confirm");
                        setAgreed(false);
                      }}
                      className="h-[46px] flex-[1_1_220px] rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00]"
                    >
                      Buy this site · {money(selected.fee)} + GST
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setWatching((w) =>
                          isWatching ? w.filter((x) => x !== selected.id) : [...w, selected.id],
                        )
                      }
                      className="h-[46px] rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
                    >
                      {isWatching ? "★ Watching" : "☆ Watch"}
                    </button>
                  </div>
                )}

                {!selected.area ? (
                  <p className="m-0 text-[13px] text-[#475569]">
                    Outside your service areas. Add {selected.pc} in Service areas to get
                    alerts here.
                  </p>
                ) : null}
              </>
            ) : (
              <>
                <h3 className="m-0 text-[16px] font-bold text-[#0F172A]">
                  Confirm purchase
                </h3>
                <div>
                  {[
                    { l: "Site fee", v: money(selected.fee), b: false },
                    { l: "GST", v: money(selected.fee * 0.1), b: false },
                    { l: "Total today", v: money(selected.fee * 1.1), b: true },
                  ].map((r) => (
                    <div
                      key={r.l}
                      className="flex justify-between gap-3 border-b border-[#E3E8EF] py-1.5 text-[13px] last:border-0"
                      style={{ fontWeight: r.b ? 700 : 400 }}
                    >
                      <span>{r.l}</span>
                      <span>{r.v}</span>
                    </div>
                  ))}
                </div>

                <p className="m-0 rounded-[10px] bg-[#FFF7E6] p-3 text-[13px] text-[#3B1D00]">
                  This is a preview: there is no marketplace backend yet, so continuing
                  will not charge you or create anything.
                </p>

                <label className="flex items-start gap-2.5 text-[13px] leading-[1.4] text-[#334155]">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 size-[18px] shrink-0 accent-[#F68A0A]"
                  />
                  <span>
                    I&apos;ll contact the customer within 1 business day, keep the confirmed
                    install window, and complete the job to EasyLink and CEC/SAA standards.
                  </span>
                </label>

                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    onClick={() => setStep("view")}
                    className="h-[46px] rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#0F172A]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    disabled={!agreed}
                    onClick={() => setBought((b) => [...b, selected.id])}
                    className="h-[46px] flex-[1_1_220px] rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] disabled:opacity-50"
                  >
                    Preview taking ownership
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
      )}

      <p className="m-0 text-[12px] text-[#475569]">
        Sample listings. The marketplace has no backend in this app yet, so nothing on
        this page is charged or saved — see{" "}
        <Link href="/installers/dashboard/customers" className="font-semibold text-[#1565C0]">
          Customers
        </Link>{" "}
        for your real jobs.
      </p>
    </div>
  );
}
