"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { InstallerAccountTabs } from "@/components/installer/dashboard/InstallerAccountTabs";

/**
 * The installer's side of dispatch. Offers come from the backend
 * (/installer-offers): EasyLink sends a job to up to three installers and the
 * first to accept gets it. Before accepting, an installer sees the area and
 * the system only; the customer's name, street and contact details arrive
 * with the job. Times are shown in Sydney time.
 */

type OfferStatus = "SENT" | "VIEWED" | "ACCEPTED" | "DECLINED" | "EXPIRED" | "TAKEN";

type Offer = {
  id: string;
  status: OfferStatus;
  area: string;
  systemKw: number | null;
  panelCount: number | null;
  batteryKwh: number | null;
  suggestedDate: string | null;
  payoutAmount: number | null;
  expiresAt: string;
  sentAt: string;
  respondedAt: string | null;
  job: { leadId: string; customerName: string; address: string | null; phone: string | null; email: string | null } | null;
};

const TZ = "Australia/Sydney";
const money = (n: number) => "$" + Math.round(n).toLocaleString("en-AU");
const day = (iso: string) =>
  new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: TZ });
const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short", timeZone: TZ });

const PILL = "rounded-full px-2.5 py-0.75 text-[11px] font-bold whitespace-nowrap";
const OPEN: OfferStatus[] = ["SENT", "VIEWED"];

function systemLine(o: Offer): string {
  const bits: string[] = [];
  if (o.systemKw) bits.push(`${o.systemKw.toLocaleString("en-AU", { maximumFractionDigits: 2 })} kW solar`);
  if (o.panelCount) bits.push(`${o.panelCount} panels`);
  if (o.batteryKwh) bits.push(`${o.batteryKwh.toLocaleString("en-AU", { maximumFractionDigits: 1 })} kWh battery`);
  return bits.length ? bits.join(" · ") : "System details with the job";
}

function timeLeft(iso: string, now: number): { text: string; tone: "red" | "amber" | "slate" } {
  const ms = new Date(iso).getTime() - now;
  if (ms <= 0) return { text: "Expired", tone: "slate" };
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const text = h >= 48 ? `Expires in ${Math.floor(h / 24)} days` : h >= 1 ? `Expires in ${h} h ${m} m` : `Expires in ${m} m`;
  return { text, tone: h < 4 ? "red" : h < 24 ? "amber" : "slate" };
}

const TONE = {
  red: { background: "#FEE2E2", color: "#991B1B" },
  amber: { background: "#FEF3C7", color: "#92400E" },
  slate: { background: "#F1F5F9", color: "#5B6B80" },
} as const;

const STATUS_LABEL: Record<OfferStatus, string> = {
  SENT: "New",
  VIEWED: "Open",
  ACCEPTED: "Yours",
  DECLINED: "Declined",
  EXPIRED: "Expired",
  TAKEN: "Taken by another installer",
};

async function api<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, data: json.data, message: json.message };
  } catch {
    return { ok: false, message: "Couldn't reach EasyLink. Check your connection and try again." };
  }
}

export function InstallerJobOffers() {
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    const r = await api<Offer[]>("/api/installers/offers");
    if (r.ok && Array.isArray(r.data)) {
      setOffers(r.data);
      setError(null);
    } else {
      setError(r.message || "Couldn't load your offers.");
      setOffers((o) => o ?? []);
    }
  }, []);

  useEffect(() => {
    const first = window.setTimeout(() => void load(), 0);
    const poll = window.setInterval(() => void load(), 60_000);
    const tick = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(poll);
      window.clearInterval(tick);
    };
  }, [load]);

  const shown = useMemo(
    () => (offers ?? []).filter((o) => filter === "all" || OPEN.includes(o.status)),
    [offers, filter],
  );
  const openCount = (offers ?? []).filter((o) => OPEN.includes(o.status)).length;
  const selected = shown.find((o) => o.id === currentId) ?? shown[0] ?? null;

  // Opening a new offer tells EasyLink it has been seen.
  useEffect(() => {
    if (selected?.status !== "SENT") return;
    void api(`/api/installers/offers/${selected.id}/viewed`, { method: "POST" }).then(() =>
      setOffers((list) => list?.map((o) => (o.id === selected.id ? { ...o, status: "VIEWED" } : o)) ?? list),
    );
  }, [selected?.id, selected?.status]);

  async function respond(action: "accept" | "decline") {
    if (!selected) return;
    setBusy(true);
    setNotice(null);
    const r = await api(`/api/installers/offers/${selected.id}/${action}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(action === "decline" && reason.trim() ? { reason: reason.trim() } : {}),
    });
    setBusy(false);
    setDeclining(false);
    setReason("");
    setNotice(r.message || (r.ok ? "Done." : "That didn't go through. Try again."));
    await load();
  }

  return (
    <div className="flex w-full max-w-[1400px] flex-col gap-[18px]">
      <header className="flex flex-wrap items-center gap-3">
        <nav aria-label="Breadcrumb" className="mr-auto">
          <ol className="m-0 flex list-none items-center gap-1.5 p-0 text-[13px] text-[#5B6B80]">
            <li>
              <Link href="/installers/dashboard/overview" prefetch={false} className="text-[#5B6B80] no-underline hover:text-[#0F172A]">
                Installer Account
              </Link>
            </li>
            <li aria-hidden>/</li>
            <li className="font-semibold text-[#0F172A]">Job offers</li>
          </ol>
        </nav>
        <span className={`${PILL} bg-[#FEF3C7] text-[#92400E]`}>First installer to accept gets the job</span>
      </header>

      <div className="flex flex-col gap-1">
        <h1 className="m-0 font-source-sans text-[26px] font-bold text-[#0F172A]">Job offers</h1>
        <p className="m-0 max-w-[760px] text-[14px] leading-[1.5] text-[#5B6B80]">
          Jobs EasyLink has offered you. You see the area and system now; the customer&apos;s details come with the job once you accept.
        </p>
      </div>

      <InstallerAccountTabs active="offers" />

      <div role="group" aria-label="Filter offers" className="flex flex-wrap gap-1.5">
        {([
          { key: "open", label: `Open · ${openCount}` },
          { key: "all", label: "Last 30 days" },
        ] as const).map((f) => {
          const on = filter === f.key;
          return (
            <button
              key={f.key}
              type="button"
              aria-pressed={on}
              onClick={() => setFilter(f.key)}
              className="h-[34px] rounded-full border px-3 text-[13px] font-semibold"
              style={on ? { background: "#0B1A2E", borderColor: "#0B1A2E", color: "#FFFFFF" } : { background: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="m-0 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-[13px] text-[#991B1B]">{error}</p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-[18px] xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <div className="flex flex-col gap-3">
          {offers === null ? (
            <p className="m-0 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px] text-[13px] text-[#5B6B80]">Loading your offers…</p>
          ) : !shown.length ? (
            <p className="m-0 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px] text-[13px] text-[#5B6B80]">
              {filter === "open" ? "No open offers right now. New offers also show in your notifications." : "No offers in the last 30 days."}
            </p>
          ) : null}

          {shown.map((o) => {
            const isOn = o.id === selected?.id;
            const left = timeLeft(o.expiresAt, now);
            const open = OPEN.includes(o.status);
            return (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setCurrentId(o.id);
                  setNotice(null);
                  setDeclining(false);
                }}
                aria-current={isOn ? "true" : undefined}
                className="flex flex-col gap-2 rounded-[14px] border bg-white p-4 text-left"
                style={isOn ? { borderColor: "#F68A0A", boxShadow: "0 0 0 3px rgba(246,138,10,.18)" } : { borderColor: "#E3E8EF" }}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-[14px] text-[#0F172A]">{o.area}</strong>
                  <span className={`${PILL} bg-[#E0F2FE] text-[#0B2540]`}>{STATUS_LABEL[o.status]}</span>
                </div>
                <span className="text-[12px] leading-[1.5] text-[#5B6B80]">{systemLine(o)}</span>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <strong className="text-[16px] text-[#0F172A]">{o.payoutAmount ? money(o.payoutAmount) : "Payout to confirm"}</strong>
                  {open ? (
                    <span className="text-[12px] font-bold" style={{ color: TONE[left.tone].color }}>{left.text}</span>
                  ) : (
                    <span className="text-[12px] text-[#5B6B80]">Sent {day(o.sentAt)}</span>
                  )}
                </div>
              </button>
            );
          })}

          <ServiceAreas />
        </div>

        {selected ? (
          <section aria-label={`Offer in ${selected.area}`} className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <div className="flex flex-wrap items-start gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h2 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">{selected.area}</h2>
                <p className="m-0 text-[13px] text-[#5B6B80]">{systemLine(selected)}</p>
              </div>
              {OPEN.includes(selected.status) ? (
                <span className={PILL} style={TONE[timeLeft(selected.expiresAt, now).tone]}>{timeLeft(selected.expiresAt, now).text}</span>
              ) : (
                <span className={`${PILL} bg-[#E0F2FE] text-[#0B2540]`}>{STATUS_LABEL[selected.status]}</span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {[
                { l: "Your payout", v: selected.payoutAmount ? money(selected.payoutAmount) : "To confirm", s: selected.payoutAmount ? "ex GST" : "EasyLink will confirm the payout" },
                { l: "Suggested date", v: selected.suggestedDate ? day(selected.suggestedDate) : "Flexible", s: selected.suggestedDate ? "Agree the final date with the customer" : "Book a date with the customer" },
                { l: "Answer by", v: day(selected.expiresAt), s: when(selected.expiresAt) },
              ].map((t) => (
                <div key={t.l} className="flex flex-col gap-0.5 rounded-xl border border-[#E3E8EF] bg-[#F8FAFC] px-4 py-3">
                  <span className="text-[11px] text-[#5B6B80]">{t.l}</span>
                  <strong className="text-[18px] text-[#0F172A]">{t.v}</strong>
                  <span className="text-[11px] text-[#5B6B80]">{t.s}</span>
                </div>
              ))}
            </div>

            {selected.job ? (
              <div className="rounded-xl border p-3.5" style={{ background: "#ECFDF5", borderColor: "#A7F3D0" }}>
                <strong className="mb-1.5 block text-[13px] text-[#065F46]">This job is yours</strong>
                <dl className="m-0 grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-[13px] text-[#064E3B]">
                  <dt className="font-semibold">Customer</dt>
                  <dd className="m-0">{selected.job.customerName}</dd>
                  <dt className="font-semibold">Address</dt>
                  <dd className="m-0">{selected.job.address || "Not given"}</dd>
                  <dt className="font-semibold">Phone</dt>
                  <dd className="m-0">{selected.job.phone ? <a href={`tel:${selected.job.phone}`} className="text-[#065F46] underline">{selected.job.phone}</a> : "Not given"}</dd>
                  <dt className="font-semibold">Email</dt>
                  <dd className="m-0">{selected.job.email ? <a href={`mailto:${selected.job.email}`} className="text-[#065F46] underline">{selected.job.email}</a> : "Not given"}</dd>
                </dl>
                <Link href="/installers/dashboard/jobs" prefetch={false} className="mt-2 inline-block text-[12px] font-semibold text-[#065F46] underline">
                  Go to My jobs
                </Link>
              </div>
            ) : null}

            {notice ? (
              <p role="status" className="m-0 rounded-xl border border-[#BFDBFE] bg-[#EFF6FF] p-3 text-[13px] text-[#1E3A8A]">{notice}</p>
            ) : null}

            {OPEN.includes(selected.status) ? (
              declining ? (
                <div className="flex flex-col gap-2">
                  <label htmlFor="decline-reason" className="text-[13px] font-semibold text-[#0F172A]">Reason (optional)</label>
                  <textarea
                    id="decline-reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    maxLength={500}
                    rows={3}
                    placeholder="e.g. No crew free that week"
                    className="rounded-xl border border-[#CBD5E1] p-3 text-[13px]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button type="button" disabled={busy} onClick={() => void respond("decline")} className="h-10 rounded-xl bg-[#0B1A2E] px-4 text-[13px] font-bold text-white disabled:opacity-60">
                      {busy ? "Sending…" : "Decline offer"}
                    </button>
                    <button type="button" disabled={busy} onClick={() => setDeclining(false)} className="h-10 rounded-xl border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" disabled={busy} onClick={() => void respond("accept")} className="h-11 rounded-xl bg-[#F68A0A] px-5 text-[14px] font-bold text-white disabled:opacity-60">
                    {busy ? "Accepting…" : "Accept job"}
                  </button>
                  <button type="button" disabled={busy} onClick={() => setDeclining(true)} className="h-11 rounded-xl border border-[#CBD5E1] bg-white px-5 text-[14px] font-semibold text-[#0F172A]">
                    Decline
                  </button>
                </div>
              )
            ) : null}

            <section aria-label="How offers work" className="rounded-[14px] border border-[#E3E8EF] bg-[#F8FAFC] p-4">
              <h3 className="m-0 mb-2 font-source-sans text-[14px] font-bold text-[#0F172A]">How offers work</h3>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[12px] leading-[1.5] text-[#5B6B80]">
                <li>EasyLink offers each job to up to three installers. The first to accept gets it.</li>
                <li>Accept and the customer&apos;s name, address and contact details appear here and in My jobs.</li>
                <li>Declining costs you nothing. Tell us why if you can, so we send better matches.</li>
              </ul>
            </section>
          </section>
        ) : null}
      </div>
    </div>
  );
}

/** The suburbs, postcodes or regions this installer covers; used to match jobs. */
function ServiceAreas() {
  const [areas, setAreas] = useState<string[] | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    void api<string[]>("/api/installers/service-areas").then((r) => setAreas(r.ok && Array.isArray(r.data) ? r.data : []));
  }, []);

  async function save(next: string[]) {
    setSaving(true);
    const r = await api<string[]>("/api/installers/service-areas", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ regions: next }),
    });
    setSaving(false);
    if (r.ok && Array.isArray(r.data)) {
      setAreas(r.data);
      setMsg("Saved.");
    } else {
      setMsg(r.message || "Couldn't save. Try again.");
    }
  }

  function add() {
    const items = draft.split(/[,\n]/).map((s) => s.trim()).filter((s) => s.length >= 2);
    if (!items.length) return;
    setDraft("");
    void save([...(areas ?? []), ...items]);
  }

  return (
    <section aria-label="Your service areas" className="rounded-[14px] border border-[#E3E8EF] bg-white p-4">
      <h2 className="m-0 mb-1 font-source-sans text-[14px] font-bold text-[#0F172A]">Your service areas</h2>
      <p className="m-0 mb-2 text-[12px] leading-[1.5] text-[#5B6B80]">
        Suburbs or postcodes you cover. Jobs in these areas are offered to you first.
      </p>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {areas === null ? <span className="text-[12px] text-[#5B6B80]">Loading…</span> : null}
        {areas?.length === 0 ? <span className="text-[12px] text-[#5B6B80]">None yet.</span> : null}
        {areas?.map((a) => (
          <span key={a} className="inline-flex items-center gap-1 rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[12px] font-semibold text-[#475569]">
            {a}
            <button type="button" aria-label={`Remove ${a}`} disabled={saving} onClick={() => void save((areas ?? []).filter((x) => x !== a))} className="text-[#94A3B8] hover:text-[#0F172A]">
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <label htmlFor="new-area" className="sr-only">Add a suburb or postcode</label>
        <input
          id="new-area"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="e.g. Parramatta, 2150"
          className="h-9 min-w-0 flex-1 rounded-lg border border-[#CBD5E1] px-2.5 text-[13px]"
        />
        <button type="button" disabled={saving || !draft.trim()} onClick={add} className="h-9 rounded-lg bg-[#0B1A2E] px-3 text-[12px] font-bold text-white disabled:opacity-50">
          Add
        </button>
      </div>
      {msg ? <p role="status" className="m-0 mt-1.5 text-[12px] text-[#5B6B80]">{msg}</p> : null}
    </section>
  );
}
