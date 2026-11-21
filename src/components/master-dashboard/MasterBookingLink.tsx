"use client";

import { useEffect, useMemo, useState } from "react";
import { LeadLinkFinder, LinkShare } from "@/components/booking/LinkShare";
import { BOOKING_KINDS, KIND_TEXT, timeLabel, type BookingKind, type BookingLinkSettings, type DayHours } from "@/lib/booking/rules";

/**
 * Operations Portal > Booking link: the public link customers book with,
 * what they can book and when. Bookings land in the EasyLink container
 * (or with the installer whose link was used). Times are Sydney time.
 */

type Data = { settings: BookingLinkSettings; publicUrl: string; ready: { service: boolean; links: boolean; email: boolean } };

const TIMES = Array.from({ length: (21 - 6) * 2 + 1 }, (_, i) => 6 * 60 + i * 30);
const field = "h-11 rounded-[10px] border border-[#C8D3DF] bg-white px-2.5 text-[15px] text-[#111C27]";

function HoursPicker({ label, value, onChange }: { label: string; value: DayHours; onChange: (v: DayHours) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-[86px] text-[14px] font-semibold text-[#304050]">{label}</span>
      <label className="flex items-center gap-1.5 text-[14px] text-[#304050]">
        <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked ? { open: 9 * 60, close: 17 * 60 } : null)} className="size-5 accent-[#0369A1]" />
        Open
      </label>
      {value ? (
        <>
          <select aria-label={`${label} opens`} className={field} value={value.open} onChange={(e) => onChange({ ...value, open: +e.target.value })}>
            {TIMES.filter((t) => t < value.close).map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
          <span className="text-[14px] text-[#4B5B6E]">to</span>
          <select aria-label={`${label} closes`} className={field} value={value.close} onChange={(e) => onChange({ ...value, close: +e.target.value })}>
            {TIMES.filter((t) => t > value.open).map((t) => (
              <option key={t} value={t}>
                {timeLabel(t)}
              </option>
            ))}
          </select>
        </>
      ) : null}
    </div>
  );
}

export function MasterBookingLink() {
  const [data, setData] = useState<Data | null>(null);
  const [s, setS] = useState<BookingLinkSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/admin/booking-link", { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { data?: Data; message?: string };
        if (r.ok && j.data) {
          setData(j.data);
          setS(j.data.settings);
        } else setError(j.message || "Couldn't load the booking link settings.");
      } catch {
        setError("Couldn't reach EasyLink.");
      }
    })();
  }, []);

  const dirty = useMemo(() => !!s && !!data && JSON.stringify(s) !== JSON.stringify(data.settings), [s, data]);

  async function save(next = s) {
    if (!next) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const r = await fetch("/api/admin/booking-link", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
      const j = (await r.json().catch(() => ({}))) as { data?: { settings: BookingLinkSettings }; message?: string };
      if (r.ok && j.data && data) {
        setData({ ...data, settings: j.data.settings });
        setS(j.data.settings);
        setNotice("Saved. The booking page uses the new settings now.");
      } else setError(j.message || "Couldn't save.");
    } catch {
      setError("Couldn't reach EasyLink.");
    }
    setSaving(false);
  }

  const setKind = (k: BookingKind, patch: Partial<BookingLinkSettings["kinds"][BookingKind]>) =>
    s && setS({ ...s, kinds: { ...s.kinds, [k]: { ...s.kinds[k], ...patch } } });

  const setWeekdays = (k: BookingKind, v: DayHours) => {
    if (!s) return;
    const hours = s.kinds[k].hours.slice();
    for (let i = 1; i <= 5; i++) hours[i] = v;
    setKind(k, { hours });
  };
  const setDay = (k: BookingKind, i: number, v: DayHours) => {
    if (!s) return;
    const hours = s.kinds[k].hours.slice();
    hours[i] = v;
    setKind(k, { hours });
  };

  const notReady = data && (!data.ready.service || !data.ready.links);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Operations <span aria-hidden>/</span> <span className="font-semibold text-[#0F172A]">Booking link</span>
        </nav>
        <button
          type="button"
          disabled={!dirty || saving}
          onClick={() => void save()}
          className="min-h-11 rounded-[10px] border-0 bg-[#0369A1] px-5 text-[15px] font-bold text-white enabled:cursor-pointer enabled:hover:bg-[#075985] disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </header>

      <div className="mx-auto flex w-full max-w-[1100px] flex-col gap-[18px] px-4 py-6 pb-28 text-[#0F172A] sm:px-8">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold">Booking link</h1>
          <p className="mt-1 max-w-[80ch] text-[13px] leading-[20px] text-[#5B6B80]">
            Customers book a free site visit or call back themselves at easylinksolar.com.au/book. Bookings follow the same rules as the AI&apos;s: they
            wait in the EasyLink container until you nominate an installer. Bookings through an installer&apos;s own link go straight to that
            installer. The customer gets an email confirmation with a calendar invite and a change-or-cancel link.
          </p>
        </div>

        {notReady ? (
          <p role="alert" className="m-0 rounded-[10px] border border-amber-300 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            The booking page isn&apos;t connected on this server yet ({[!data!.ready.service && "booking service login", !data!.ready.links && "link signing key"].filter(Boolean).join(", ")}). Customers
            see &quot;call us&quot; until it is.
          </p>
        ) : null}
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

        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="m-0 text-[18px] font-bold">Public booking link</h2>
              <p className="m-0 mt-0.5 text-[13px] text-[#5B6B80]">For the website, Google Business profile, socials and ads.</p>
            </div>
            {s ? (
              <button
                type="button"
                aria-pressed={s.live}
                onClick={() => {
                  const next = { ...s, live: !s.live };
                  setS(next);
                  void save(next);
                }}
                className={`flex min-h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 text-[14px] font-bold ${s.live ? "border border-green-300 bg-green-50 text-green-800" : "border border-slate-300 bg-slate-100 text-slate-700"}`}
              >
                <span className={`size-2 rounded-full ${s.live ? "bg-green-700" : "bg-slate-500"}`} aria-hidden />
                {s.live ? "Link is live" : "Link is off"}
              </button>
            ) : null}
          </div>
          {data ? <LinkShare link={data.publicUrl} /> : <p className="m-0 text-[14px] text-[#5B6B80]">Loading…</p>}
        </section>

        {s ? (
          <section className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 text-[18px] font-bold">What customers can book</h2>
            {BOOKING_KINDS.map((k) => {
              const r = s.kinds[k];
              const wk = r.hours[1];
              return (
                <div key={k} className="flex flex-col gap-3 rounded-xl border border-[#E3E8EF] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="m-0 text-[16px] font-bold">{KIND_TEXT[k].label}</h3>
                      <p className="m-0 text-[13px] text-[#5B6B80]">{KIND_TEXT[k].sub}</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={r.enabled}
                      aria-label={`${KIND_TEXT[k].label} on the booking link`}
                      onClick={() => setKind(k, { enabled: !r.enabled })}
                      className={`flex h-7 w-12 cursor-pointer rounded-full border-0 p-[3px] ${r.enabled ? "justify-end bg-[#0369A1]" : "justify-start bg-slate-400"}`}
                    >
                      <span className="block size-[22px] rounded-full bg-white" />
                    </button>
                  </div>
                  {r.enabled ? (
                    <div className="flex flex-col gap-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="w-[86px] text-[14px] font-semibold text-[#304050]">Length</span>
                        <select aria-label="Length" className={field} value={r.minutes} onChange={(e) => setKind(k, { minutes: +e.target.value, step: +e.target.value >= 60 ? 60 : 30 })}>
                          {[15, 30, 45, 60, 90, 120].map((m) => (
                            <option key={m} value={m}>
                              {m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`}
                            </option>
                          ))}
                        </select>
                      </div>
                      <HoursPicker label="Mon–Fri" value={wk} onChange={(v) => setWeekdays(k, v)} />
                      <HoursPicker label="Saturday" value={r.hours[6]} onChange={(v) => setDay(k, 6, v)} />
                      <HoursPicker label="Sunday" value={r.hours[0]} onChange={(v) => setDay(k, 0, v)} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </section>
        ) : null}

        {s ? (
          <section className="grid grid-cols-1 gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px] sm:grid-cols-2">
            <h2 className="m-0 text-[18px] font-bold sm:col-span-2">Rules</h2>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]">
              Earliest booking
              <select className={field} value={s.earliest} onChange={(e) => setS({ ...s, earliest: e.target.value as BookingLinkSettings["earliest"] })}>
                <option value="NEXT_BUSINESS_DAY">Next business day</option>
                <option value="SAME_DAY_3H">Same day, 3 hours ahead</option>
                <option value="TWO_BUSINESS_DAYS">2 business days ahead</option>
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]">
              Book up to
              <select className={field} value={s.horizonDays} onChange={(e) => setS({ ...s, horizonDays: +e.target.value })}>
                {[14, 21, 28, 42, 56].map((d) => (
                  <option key={d} value={d}>
                    {d / 7} weeks ahead
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]">
              Travel gap between visits
              <select className={field} value={s.gapMinutes} onChange={(e) => setS({ ...s, gapMinutes: +e.target.value })}>
                {[0, 15, 30, 45, 60].map((m) => (
                  <option key={m} value={m}>
                    {m ? `${m} minutes` : "None"}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]">
              Most visits a day (per person)
              <input type="number" min={1} max={12} className={field} value={s.maxVisitsPerDay} onChange={(e) => setS({ ...s, maxVisitsPerDay: Math.max(1, Math.min(12, +e.target.value || 1)) })} />
            </label>
            <label className="flex items-center gap-2.5 text-[15px] text-[#304050] sm:col-span-2">
              <input type="checkbox" checked={s.closedOnPublicHolidays} onChange={(e) => setS({ ...s, closedOnPublicHolidays: e.target.checked })} className="size-5 accent-[#0369A1]" />
              Closed on NSW public holidays
            </label>
          </section>
        ) : null}

        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <h2 className="m-0 text-[18px] font-bold">Send a customer their own link</h2>
          <LeadLinkFinder endpoint="/api/admin/booking-link/leads" />
        </section>
      </div>
    </div>
  );
}
