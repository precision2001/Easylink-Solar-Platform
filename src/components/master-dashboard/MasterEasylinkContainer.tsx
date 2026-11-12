"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * The EasyLink container. Every lead, booking and sale that EasyLink AI,
 * EasyLink staff or the website generate is held by EasyLink until EasyLink
 * staff nominate an installer here. Nominating gives the installer the lead
 * and its open bookings, and tells them. An installer's own customers never
 * come here: they stay with that installer. Times are Sydney time.
 */

type Tab = "leads" | "bookings" | "sales";
type State = "easylink" | "nominated";
type Source = "AI" | "WEBSITE" | "STAFF";
type Person = { id: string; name: string; role: string } | null;

type LeadRow = {
  leadId: string;
  customerName: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  stage: string;
  source: Source;
  sourceLabel: string | null;
  value: number | null;
  createdAt: string;
  heldBy: Person;
  nextBooking: { startAt: string; title: string } | null;
  quote: { status: string; totalCents: number } | null;
};
type BookingRow = {
  bookingId: string;
  leadId: string | null;
  customerName: string;
  phone: string | null;
  address: string | null;
  title: string;
  notes: string | null;
  kind: "SITE_VISIT" | "CALLBACK" | "SERVICE" | "BOOKING";
  bookedByAi: boolean;
  urgent: boolean;
  startAt: string;
  bookedAt: string;
  source: Source;
  heldBy: Person;
};
type SaleRow = {
  quoteId: string;
  quoteNumber: number;
  leadId: string | null;
  customerName: string;
  phone: string | null;
  address: string | null;
  totalCents: number;
  depositCents: number;
  depositPaid: boolean;
  acceptedAt: string | null;
  system: { kw: number | null; batteryKwh: number | null };
  source: Source;
  heldBy: Person;
};
type Row = LeadRow | BookingRow | SaleRow;
type Installer = { id: string; name: string; email: string; areas: string[] };
type Counts = { leads: number; bookings: number; sales: number; nominatedLast30Days: number };
type Holder = { id: string; name: string; role: string };
type HoldSettings = { assignees: Record<"SITE_VISIT" | "CALLBACK" | "SERVICE", string | null>; useLeadOwner: boolean; aiAccountId?: string | null };

const TZ = "Australia/Sydney";
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });
const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: TZ });
const money = (cents: number) => "$" + Math.round(cents / 100).toLocaleString("en-AU");

const SOURCE: Record<Source, { label: string; bg: string; fg: string }> = {
  AI: { label: "EasyLink AI", bg: "#FFF4E5", fg: "#9A4B00" },
  WEBSITE: { label: "Website", bg: "#E0F2FE", fg: "#0B2540" },
  STAFF: { label: "EasyLink staff", bg: "#EDE4FF", fg: "#3B1F75" },
};
const KIND: Record<BookingRow["kind"], string> = { SITE_VISIT: "Site visit", CALLBACK: "Call back", SERVICE: "Service call", BOOKING: "Booking" };
const STAGE = (s: string) => s.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

const PILL = "rounded-full px-2.5 py-0.5 text-[11px] font-bold whitespace-nowrap";

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, data: json.data, message: json.message };
  } catch {
    return { ok: false, message: "Couldn't reach EasyLink. Try again." };
  }
}

const rowKey = (r: Row) => ("bookingId" in r ? r.bookingId : "quoteId" in r ? r.quoteId : r.leadId);

export function MasterEasylinkContainer() {
  const [tab, setTab] = useState<Tab>("leads");
  // ?tab=bookings (old AI bookings links) opens that tab; read after mount so server and browser agree.
  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (t === "bookings" || t === "sales") {
      const id = window.setTimeout(() => setTab(t), 0);
      return () => window.clearTimeout(id);
    }
  }, []);
  const [state, setState] = useState<State>("easylink");
  const [source, setSource] = useState<Source | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [counts, setCounts] = useState<Counts | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [nominating, setNominating] = useState(false);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ tab, state });
    if (source !== "ALL") q.set("source", source);
    if (search.trim()) q.set("search", search.trim());
    const [r, c] = await Promise.all([call<Row[]>(`/api/admin/easylink-pool?${q}`), call<Counts>("/api/admin/easylink-pool/counts")]);
    if (r.ok && Array.isArray(r.data)) {
      setRows(r.data);
      setError(null);
    } else {
      setRows([]);
      setError(r.message || "Couldn't load the EasyLink container.");
    }
    if (c.ok && c.data) setCounts(c.data);
  }, [tab, state, source, search]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      setRows(null);
      setSelected(new Set());
      void load();
    }, search ? 300 : 0);
    return () => window.clearTimeout(t);
  }, [load, search]);

  /** Nominating acts on leads: a booking or sale nominates its lead. */
  const selectedLeadIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of rows ?? []) if (selected.has(rowKey(r)) && r.leadId) ids.add(r.leadId);
    return [...ids];
  }, [rows, selected]);

  const singleArea = useMemo(() => {
    const picked = (rows ?? []).filter((r) => selected.has(rowKey(r)));
    return picked.length === 1 ? picked[0].address : null;
  }, [rows, selected]);

  function toggle(key: string) {
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  }

  const allKeys = (rows ?? []).filter((r) => r.leadId).map(rowKey);
  const allOn = allKeys.length > 0 && allKeys.every((k) => selected.has(k));

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Operations <span aria-hidden>/</span> <span className="font-semibold text-[#0F172A]">EasyLink container</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-4 py-6 pb-28 sm:px-8">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">EasyLink container</h1>
          <p className="mt-1 max-w-[80ch] text-[13px] leading-[20px] text-[#5B6B80]">
            Leads, bookings and sales from EasyLink AI, EasyLink staff and the website. They stay with EasyLink until you nominate an installer, who then
            gets the customer and their open bookings and is notified. Installers&apos; own customers don&apos;t come here; they stay with the installer.
          </p>
        </div>

        {error ? (
          <p role="alert" className="m-0 rounded-[10px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="m-0 rounded-[10px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">
            {notice}
          </p>
        ) : null}

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { l: "Leads with EasyLink", v: counts?.leads },
            { l: "Upcoming bookings with EasyLink", v: counts?.bookings },
            { l: "Sales awaiting an installer", v: counts?.sales },
            { l: "Nominated (last 30 days)", v: counts?.nominatedLast30Days },
          ].map((k) => (
            <div key={k.l} className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white px-4 py-3">
              <span className="text-[12px] text-[#5B6B80]">{k.l}</span>
              <strong className="text-[24px] text-[#0F172A]">{k.v ?? "–"}</strong>
            </div>
          ))}
        </div>

        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <div role="tablist" aria-label="What to show" className="flex flex-wrap gap-1 border-b border-[#E3E8EF]">
            {(
              [
                { k: "leads", l: "Leads" },
                { k: "bookings", l: "Bookings" },
                { k: "sales", l: "Sales" },
              ] as const
            ).map((t) => (
              <button
                key={t.k}
                role="tab"
                type="button"
                aria-selected={tab === t.k}
                onClick={() => setTab(t.k)}
                className="-mb-px border-b-2 px-4 py-2 text-[14px] font-semibold"
                style={tab === t.k ? { borderColor: "#F68A0A", color: "#0F172A" } : { borderColor: "transparent", color: "#5B6B80" }}
              >
                {t.l}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div role="group" aria-label="Who has it" className="flex gap-1.5">
              {(
                [
                  { k: "easylink", l: "With EasyLink" },
                  { k: "nominated", l: "Nominated to installers" },
                ] as const
              ).map((s) => (
                <button
                  key={s.k}
                  type="button"
                  aria-pressed={state === s.k}
                  onClick={() => setState(s.k)}
                  className="h-[32px] rounded-full border px-3 text-[12px] font-semibold"
                  style={state === s.k ? { background: "#0B1A2E", borderColor: "#0B1A2E", color: "#fff" } : { background: "#fff", borderColor: "#CBD5E1", color: "#0F172A" }}
                >
                  {s.l}
                </button>
              ))}
            </div>
            <label className="sr-only" htmlFor="ec-source">
              Source
            </label>
            <select
              id="ec-source"
              value={source}
              onChange={(e) => setSource(e.target.value as Source | "ALL")}
              className="h-[32px] rounded-full border border-[#CBD5E1] bg-white px-3 text-[12px] font-semibold text-[#0F172A]"
            >
              <option value="ALL">All sources</option>
              <option value="AI">EasyLink AI</option>
              <option value="WEBSITE">Website</option>
              <option value="STAFF">EasyLink staff</option>
            </select>
            <label className="sr-only" htmlFor="ec-search">
              Search
            </label>
            <input
              id="ec-search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, email, suburb"
              className="h-[32px] min-w-[220px] flex-1 rounded-full border border-[#CBD5E1] px-3 text-[12px]"
            />
          </div>

          {rows === null ? <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p> : null}
          {rows !== null && rows.length === 0 ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">
              {state === "easylink" ? "Nothing waiting. Everything here has been nominated." : "Nothing nominated yet."}
            </p>
          ) : null}

          {rows && rows.length ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[#E3E8EF] text-[11px] uppercase tracking-wide text-[#5B6B80]">
                    <th className="w-8 py-2 pr-2">
                      <input
                        type="checkbox"
                        aria-label="Select all"
                        checked={allOn}
                        onChange={() => setSelected(allOn ? new Set() : new Set(allKeys))}
                        className="h-4 w-4 accent-[#F68A0A]"
                      />
                    </th>
                    <th className="py-2 pr-3">Customer</th>
                    <th className="py-2 pr-3">{tab === "bookings" ? "Booking" : tab === "sales" ? "Sale" : "Stage"}</th>
                    <th className="py-2 pr-3">Source</th>
                    <th className="py-2 pr-3">{state === "easylink" ? "Held by" : "Installer"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const key = rowKey(r);
                    return (
                      <tr key={key} className="border-b border-[#F1F5F9] align-top">
                        <td className="py-2.5 pr-2">
                          <input
                            type="checkbox"
                            aria-label={`Select ${r.customerName}`}
                            disabled={!r.leadId}
                            checked={selected.has(key)}
                            onChange={() => toggle(key)}
                            className="h-4 w-4 accent-[#F68A0A]"
                          />
                        </td>
                        <td className="py-2.5 pr-3">
                          {r.leadId ? (
                            <a href={`/master/customers/${r.leadId}`} className="block font-bold text-[#0F172A] underline-offset-2 hover:underline">
                              {r.customerName}
                            </a>
                          ) : (
                            <strong className="block text-[#0F172A]">{r.customerName}</strong>
                          )}
                          <span className="block text-[12px] text-[#5B6B80]">{[r.phone, r.address].filter(Boolean).join(" · ") || "No contact details yet"}</span>
                        </td>
                        <td className="py-2.5 pr-3">
                          {"bookingId" in r ? (
                            <>
                              <span className="flex flex-wrap items-center gap-1.5">
                                <strong>{KIND[r.kind]}</strong>
                                {r.urgent ? <span className={`${PILL} bg-[#FEE2E2] text-[#991B1B]`}>Safety</span> : null}
                              </span>
                              <span className="block text-[12px] text-[#5B6B80]">{when(r.startAt)}</span>
                            </>
                          ) : "quoteId" in r ? (
                            <>
                              <strong>
                                Q{r.quoteNumber} · {money(r.totalCents)}
                              </strong>
                              <span className="block text-[12px] text-[#5B6B80]">
                                {[r.system.kw ? `${r.system.kw} kW` : null, r.system.batteryKwh ? `${r.system.batteryKwh} kWh battery` : null].filter(Boolean).join(" + ") || "System"} ·{" "}
                                {r.depositPaid ? "deposit paid" : "deposit not paid"}
                                {r.acceptedAt ? ` · accepted ${day(r.acceptedAt)}` : ""}
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>{STAGE(r.stage)}</strong>
                              <span className="block text-[12px] text-[#5B6B80]">
                                {r.nextBooking ? `Next: ${when(r.nextBooking.startAt)}` : `Added ${day(r.createdAt)}`}
                                {r.quote ? ` · quote ${r.quote.status.toLowerCase()}` : ""}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span className={PILL} style={{ background: SOURCE[r.source].bg, color: SOURCE[r.source].fg }}>
                            {SOURCE[r.source].label}
                          </span>
                        </td>
                        <td className="py-2.5 pr-3 text-[12px] text-[#0F172A]">{r.heldBy?.name ?? "EasyLink (unassigned)"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>

        <AiBookingHolders />
      </div>

      {selectedLeadIds.length ? (
        <div className="sticky bottom-0 z-10 border-t border-[#E3E8EF] bg-white px-4 py-3 shadow-[0_-4px_12px_rgba(15,23,42,0.06)] sm:px-8">
          <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3">
            <strong className="text-[13px] text-[#0F172A]">
              {selectedLeadIds.length} customer{selectedLeadIds.length === 1 ? "" : "s"} selected
            </strong>
            <button type="button" onClick={() => setSelected(new Set())} className="text-[12px] font-semibold text-[#5B6B80] underline">
              Clear
            </button>
            <button
              type="button"
              onClick={() => setNominating(true)}
              className="ml-auto h-10 rounded-[10px] bg-[#F68A0A] px-4 text-[13px] font-bold text-white"
            >
              {state === "easylink" ? "Nominate installer" : "Nominate a different installer"}
            </button>
          </div>
        </div>
      ) : null}

      {nominating ? (
        <NominateDialog
          count={selectedLeadIds.length}
          area={singleArea}
          onClose={() => setNominating(false)}
          onDone={async (msg) => {
            setNominating(false);
            setNotice(msg);
            setSelected(new Set());
            await load();
          }}
          leadIds={selectedLeadIds}
        />
      ) : null}
    </div>
  );
}

/** Pick the installer. Installers whose service areas match the customer's address are listed first. */
function NominateDialog({
  leadIds,
  count,
  area,
  onClose,
  onDone,
}: {
  leadIds: string[];
  count: number;
  area: string | null;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [list, setList] = useState<Installer[] | null>(null);
  const [q, setQ] = useState("");
  const [pick, setPick] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    void call<Installer[]>("/api/admin/easylink-pool/installers").then((r) => setList(r.ok && Array.isArray(r.data) ? r.data : []));
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shown = useMemo(() => {
    const a = (area ?? "").toLowerCase();
    const matches = (i: Installer) => Boolean(a) && i.areas.some((x) => a.includes(x.toLowerCase()));
    return (list ?? [])
      .filter((i) => !q.trim() || `${i.name} ${i.email} ${i.areas.join(" ")}`.toLowerCase().includes(q.trim().toLowerCase()))
      .map((i) => ({ ...i, match: matches(i) }))
      .sort((x, y) => Number(y.match) - Number(x.match) || x.name.localeCompare(y.name));
  }, [list, q, area]);

  async function submit() {
    if (!pick) return;
    setBusy(true);
    setErr(null);
    const r = await call<{ leads: number; bookingsMoved: number; installer: string }>("/api/admin/easylink-pool/nominate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds, installerId: pick, ...(note.trim() ? { note: note.trim() } : {}) }),
    });
    setBusy(false);
    if (r.ok && r.data) {
      const d = r.data;
      onDone(
        `Nominated ${d.installer} for ${d.leads} customer${d.leads === 1 ? "" : "s"}` +
          (d.bookingsMoved ? ` and ${d.bookingsMoved} booking${d.bookingsMoved === 1 ? "" : "s"}` : "") +
          `. They've been notified and can see them in their portal.`,
      );
    } else setErr(r.message || "Couldn't nominate. Try again.");
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="nominate-title" className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.45)] p-4">
      <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col gap-3 overflow-hidden rounded-[16px] bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <h2 id="nominate-title" className="m-0 text-[18px] font-bold text-[#0F172A]">
              Nominate an installer
            </h2>
            <p className="m-0 mt-1 text-[12px] text-[#5B6B80]">
              {count} customer{count === 1 ? "" : "s"}. The installer gets the customer, their open bookings and a notification.
              {area ? ` Installers covering ${area.split(",").slice(1).join(",").trim() || area} are listed first.` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-[20px] leading-none text-[#5B6B80]">
            ×
          </button>
        </div>

        <label htmlFor="inst-search" className="sr-only">
          Search installers
        </label>
        <input
          id="inst-search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search installer, email or area"
          className="h-10 rounded-[10px] border border-[#CBD5E1] px-3 text-[13px]"
        />

        <ul role="listbox" aria-label="Installers" className="m-0 flex max-h-[44vh] list-none flex-col gap-1.5 overflow-y-auto p-0">
          {list === null ? <li className="text-[13px] text-[#5B6B80]">Loading installers…</li> : null}
          {list !== null && !shown.length ? <li className="text-[13px] text-[#5B6B80]">No installers match.</li> : null}
          {shown.map((i) => (
            <li key={i.id}>
              <button
                type="button"
                role="option"
                aria-selected={pick === i.id}
                onClick={() => setPick(i.id)}
                className="flex w-full flex-col gap-0.5 rounded-[10px] border px-3 py-2 text-left"
                style={pick === i.id ? { borderColor: "#F68A0A", background: "#FFF7ED" } : { borderColor: "#E3E8EF" }}
              >
                <span className="flex flex-wrap items-center gap-2">
                  <strong className="text-[13px] text-[#0F172A]">{i.name}</strong>
                  {i.match ? <span className={`${PILL} bg-[#DCFCE7] text-[#166534]`}>Covers this area</span> : null}
                </span>
                <span className="text-[11px] text-[#5B6B80]">{i.areas.length ? `Areas: ${i.areas.join(", ")}` : "No service areas set"}</span>
              </button>
            </li>
          ))}
        </ul>

        <label htmlFor="nominate-note" className="text-[12px] font-semibold text-[#0F172A]">
          Note for the installer (optional)
        </label>
        <textarea
          id="nominate-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder="e.g. Customer prefers mornings; battery quote requested"
          className="rounded-[10px] border border-[#CBD5E1] p-2.5 text-[13px]"
        />

        {err ? (
          <p role="alert" className="m-0 text-[12px] text-red-700">
            {err}
          </p>
        ) : null}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A]">
            Cancel
          </button>
          <button
            type="button"
            disabled={!pick || busy}
            onClick={() => void submit()}
            className="h-10 rounded-[10px] bg-[#F68A0A] px-4 text-[13px] font-bold text-white disabled:opacity-50"
          >
            {busy ? "Nominating…" : "Nominate"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Which EasyLink staff member holds each kind of AI booking until it's nominated. */
function AiBookingHolders() {
  const [open, setOpen] = useState(false);
  const [staff, setStaff] = useState<Holder[]>([]);
  const [settings, setSettings] = useState<HoldSettings | null>(null);
  const [saved, setSaved] = useState<HoldSettings | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || settings) return;
    void call<{ settings: HoldSettings; people: Holder[] }>("/api/admin/ai-bookings/settings").then((r) => {
      if (r.ok && r.data) {
        setStaff(r.data.people.filter((p) => p.role === "ADMIN"));
        setSettings(r.data.settings);
        setSaved(r.data.settings);
      } else setMsg(r.message || "Couldn't load.");
    });
  }, [open, settings]);

  async function save() {
    if (!settings) return;
    const r = await call<HoldSettings>("/api/admin/ai-bookings/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assignees: settings.assignees, useLeadOwner: false }),
    });
    if (r.ok && r.data) {
      setSaved(r.data);
      setSettings(r.data);
      setMsg("Saved.");
    } else setMsg(r.message || "Couldn't save.");
  }

  const dirty = JSON.stringify(settings) !== JSON.stringify(saved);

  return (
    <section className="rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
      <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left">
        <h2 className="m-0 flex-1 text-[15px] font-bold text-[#0F172A]">Who at EasyLink holds AI bookings</h2>
        <span className="text-[12px] font-semibold text-[#5B6B80]">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="mt-3 flex flex-col gap-3">
          <p className="m-0 text-[12px] text-[#5B6B80]">
            Bookings the AI makes for EasyLink customers sit in this person&apos;s calendar until you nominate an installer. Bookings for an
            installer&apos;s own customer go straight to that installer.
          </p>
          {settings ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {(
                [
                  { k: "SITE_VISIT", l: "Site visits" },
                  { k: "CALLBACK", l: "Call backs" },
                  { k: "SERVICE", l: "Service calls" },
                ] as const
              ).map((x) => (
                <div key={x.k} className="flex flex-col gap-1">
                  <label htmlFor={`hold-${x.k}`} className="text-[12px] font-semibold text-[#0F172A]">
                    {x.l}
                  </label>
                  <select
                    id={`hold-${x.k}`}
                    value={settings.assignees[x.k] ?? ""}
                    onChange={(e) => setSettings({ ...settings, assignees: { ...settings.assignees, [x.k]: e.target.value || null } })}
                    className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px]"
                  >
                    <option value="">The AI&apos;s own account</option>
                    {staff.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          ) : (
            <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={!dirty}
              onClick={() => void save()}
              className="h-9 rounded-[10px] bg-[#0B1A2E] px-4 text-[12px] font-bold text-white disabled:opacity-40"
            >
              Save
            </button>
            {msg ? <span className="text-[12px] text-[#5B6B80]">{msg}</span> : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
