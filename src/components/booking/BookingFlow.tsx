"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * The calendar booking page: pick a kind, a day and a time, add details,
 * confirm. Used by /book (public or an installer's link), /b/<token> (a
 * customer's personal link), the customer portal, and /book/manage/<token>
 * to move a booking. All times are Sydney time.
 */

type Kind = "SITE_VISIT" | "CALLBACK" | "SERVICE";
type Config = {
  live: boolean;
  kinds: { kind: Kind; label: string; sub: string; minutes: number }[];
  horizonDays: number;
  phone: { display: string; tel: string };
  personal: { firstName: string; emailHint: string | null; phoneEnding: string | null; needs: { email: boolean; phone: boolean; address: boolean } } | null;
  installer: { name: string | null } | null;
};
type FreeDay = { date: string; times: { start: string; end: string; label: string }[] };
type Booked = { id: string; kind: Kind; startAt: string; when: string; manageUrl: string; emailed: boolean };

type Props = {
  /** A customer's personal link token. */
  leadToken?: string | null;
  /** An installer's link token. */
  installerToken?: string | null;
  /** Moving an existing booking: its manage token, kind and current time. */
  move?: { token: string; kind: Kind; when: string } | null;
  /** Inside a portal: no page header. */
  embedded?: boolean;
};

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const keyOf = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
const sydneyToday = () => {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Australia/Sydney", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  return p; // YYYY-MM-DD
};
const longDay = (key: string) => {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
};

async function getJson<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const j = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, data: j.data, message: j.message };
  } catch {
    return { ok: false, message: "We couldn't reach EasyLink. Check your connection and try again." };
  }
}

const field =
  "h-[46px] w-full rounded-[10px] border border-[#C8D3DF] bg-white px-3 text-[16px] text-[#111C27] outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/25";
const labelCls = "flex flex-col gap-1.5 text-[14px] font-semibold text-[#304050]";

export function BookingFlow({ leadToken, installerToken, move, embedded = false }: Props) {
  const [config, setConfig] = useState<Config | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind | null>(move?.kind ?? null);
  const today = useMemo(() => sydneyToday(), []);
  const [month, setMonth] = useState(() => ({ y: +today.slice(0, 4), m: +today.slice(5, 7) }));
  const [days, setDays] = useState<FreeDay[] | null>(null);
  const [timesError, setTimesError] = useState<string | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [slot, setSlot] = useState<FreeDay["times"][number] | null>(null);
  const [step, setStep] = useState<"pick" | "details" | "done">("pick");
  const [details, setDetails] = useState({ name: "", phone: "", email: "", address: "", notes: "", smsOk: true, website: "" });
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [booked, setBooked] = useState<Booked | null>(null);

  const q = useMemo(() => {
    const p = new URLSearchParams();
    if (leadToken) p.set("t", leadToken);
    if (installerToken) p.set("i", installerToken);
    return p;
  }, [leadToken, installerToken]);

  useEffect(() => {
    void (async () => {
      const r = await getJson<Config>(`/api/public/booking/config?${q}`);
      if (r.ok && r.data) {
        setConfig(r.data);
        setKind((k) => k ?? r.data!.kinds[0]?.kind ?? null);
      } else setLoadError(r.message || "Booking is unavailable right now.");
    })();
  }, [q]);

  // Load the visible month's free times.
  const loadTimes = useCallback(async () => {
    if (!kind || !config?.live) return;
    setDays(null);
    setTimesError(null);
    const first = keyOf(month.y, month.m, 1);
    const last = keyOf(month.y, month.m, new Date(Date.UTC(month.y, month.m, 0)).getUTCDate());
    const p = new URLSearchParams(q);
    p.set("kind", kind);
    p.set("from", first < today ? today : first);
    p.set("to", last);
    const r = await getJson<{ days: FreeDay[] }>(`/api/public/booking/times?${p}`);
    if (r.ok && r.data) {
      setDays(r.data.days);
    } else {
      setDays([]);
      setTimesError(r.message || "We couldn't load free times.");
    }
  }, [kind, config?.live, month, q, today]);

  useEffect(() => {
    const t = window.setTimeout(() => void loadTimes(), 0);
    return () => window.clearTimeout(t);
  }, [loadTimes]);

  // Pick the first free day when a month loads (and keep a still-free choice).
  useEffect(() => {
    if (!days) return;
    const t = window.setTimeout(() => {
      setDay((cur) => (cur && days.some((d) => d.date === cur) ? cur : (days[0]?.date ?? null)));
      setSlot(null);
    }, 0);
    return () => window.clearTimeout(t);
  }, [days]);

  const freeByDate = useMemo(() => new Map((days ?? []).map((d) => [d.date, d])), [days]);
  const lastBookable = useMemo(() => {
    if (!config) return today;
    const [y, m, d] = today.split("-").map(Number);
    const t = new Date(Date.UTC(y, m - 1, d + config.horizonDays));
    return keyOf(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate());
  }, [config, today]);

  const cells = useMemo(() => {
    const firstWd = (new Date(Date.UTC(month.y, month.m - 1, 1)).getUTCDay() + 6) % 7;
    const n = new Date(Date.UTC(month.y, month.m, 0)).getUTCDate();
    const out: ({ key: string; d: number } | null)[] = Array.from({ length: firstWd }, () => null);
    for (let d = 1; d <= n; d++) out.push({ key: keyOf(month.y, month.m, d), d });
    return out;
  }, [month]);

  const canPrev = keyOf(month.y, month.m, 1) > today;
  const canNext = (month.m === 12 ? keyOf(month.y + 1, 1, 1) : keyOf(month.y, month.m + 1, 1)) <= lastBookable;
  const shift = (n: number) =>
    setMonth(({ y, m }) => {
      const t = m + n;
      return t < 1 ? { y: y - 1, m: 12 } : t > 12 ? { y: y + 1, m: 1 } : { y, m: t };
    });

  const kindInfo = config?.kinds.find((k) => k.kind === kind) ?? null;
  const personal = config?.personal ?? null;

  async function submit() {
    if (!kind || !slot) return;
    setSending(true);
    setSendError(null);
    const r = move
      ? await getJson<Booked>("/api/public/booking/manage", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "move", m: move.token, start: slot.start }),
        })
      : await getJson<Booked>("/api/public/booking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kind,
            start: slot.start,
            t: leadToken ?? undefined,
            i: installerToken ?? undefined,
            name: details.name.trim() || undefined,
            phone: details.phone.trim() || undefined,
            email: details.email.trim() || undefined,
            address: details.address.trim() || undefined,
            notes: details.notes.trim() || undefined,
            smsOk: details.smsOk,
            website: details.website || undefined,
          }),
        });
    setSending(false);
    if (r.ok && r.data) {
      setBooked(r.data);
      setStep("done");
    } else {
      setSendError(r.message || "That didn't go through. Please try again.");
      if (r.message && /taken|isn't free/i.test(r.message)) {
        setStep("pick");
        void loadTimes();
      }
    }
  }

  const needName = !personal;
  const needPhone = !personal || personal.needs.phone;
  const needEmail = !personal || personal.needs.email;
  const needAddress = kind !== "CALLBACK" && (!personal || personal.needs.address);
  const detailsOk =
    (!needName || details.name.trim().length >= 2) &&
    (!needPhone || /^0[2-478]\d{8}$/.test(details.phone.replace(/\D/g, "").replace(/^61/, "0"))) &&
    (!needEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email.trim())) &&
    (!needAddress || details.address.trim().length >= 5);

  const heading = move ? "Change your booking" : personal?.firstName ? `Hi ${personal.firstName}, book a time` : "Book a time with EasyLink Solar";

  return (
    <div className={embedded ? "" : "min-h-screen bg-[#F2F9FC]"} style={{ color: "#111C27" }}>
      {!embedded ? (
        <header className="border-b border-[#E1E7EF] bg-white">
          <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-6 py-3.5">
            <Link href="/" className="flex items-center gap-2.5 text-[20px] font-bold text-[#111C27] no-underline">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/logo.webp" alt="" width={32} height={32} />
              EasyLink Solar
            </Link>
            <p className="m-0 text-[15px] text-[#304050]">
              Prefer to talk?{" "}
              <a href={`tel:${config?.phone.tel ?? "+61291638128"}`} className="font-semibold text-[#0369A1]">
                {config?.phone.display ?? "02 9163 8128"}
              </a>
            </p>
          </div>
        </header>
      ) : null}

      <main className={`mx-auto flex max-w-[1120px] flex-wrap items-start gap-6 ${embedded ? "py-2" : "px-4 py-8 sm:px-6"}`}>
        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-4 md:max-w-[360px]">
          <div className="flex flex-col gap-4 rounded-2xl border border-[#E1E7EF] bg-white p-6">
            {config?.installer?.name ? <p className="m-0 text-[15px] font-semibold text-[#0369A1]">With {config.installer.name}</p> : null}
            <h1 className="m-0 text-[28px] font-bold leading-[34px]">{heading}</h1>
            <p className="m-0 text-[16px] leading-6 text-[#304050]">
              {move ? (
                <>
                  Now: <strong>{move.when}</strong>. Pick a new time below; we&apos;ll cancel the old one.
                </>
              ) : (
                "Pick what suits you. We'll email your confirmation with a calendar invite."
              )}
            </p>

            {!move && config && config.kinds.length > 1 ? (
              <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
                <legend className="mb-2 text-[14px] font-semibold text-[#304050]">What would you like?</legend>
                {config.kinds.map((k) => {
                  const on = k.kind === kind;
                  return (
                    <button
                      key={k.kind}
                      type="button"
                      aria-pressed={on}
                      onClick={() => {
                        setKind(k.kind);
                        setSlot(null);
                        setStep("pick");
                      }}
                      className={`flex min-h-16 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ${
                        on ? "border-2 border-[#0369A1] bg-[#E6F7FB]" : "border border-[#C8D3DF] bg-white hover:border-[#7DB9DA]"
                      }`}
                    >
                      <span className="flex flex-col gap-0.5">
                        <span className="text-[17px] font-bold text-[#111C27]">{k.label}</span>
                        <span className="text-[14px] text-[#304050]">{k.sub}</span>
                      </span>
                      <span className="whitespace-nowrap text-[14px] font-semibold text-[#304050]">
                        {k.minutes >= 60 ? `${k.minutes / 60} hour${k.minutes > 60 ? "s" : ""}` : `${k.minutes} min`}
                      </span>
                    </button>
                  );
                })}
              </fieldset>
            ) : null}
          </div>
          <p className="m-0 flex items-start gap-2.5 px-1 text-[14px] leading-5 text-[#304050]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" className="mt-px flex-none">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Free, no obligation. On a site visit we check your roof, switchboard and shading so your quote is exact.
          </p>
        </aside>

        <section className="min-w-0 flex-[999_1_560px] rounded-2xl border border-[#E1E7EF] bg-white p-6">
          {loadError ? (
            <Notice tone="error">{loadError}</Notice>
          ) : !config ? (
            <p className="m-0 text-[15px] text-[#4B5B6E]">Loading free times…</p>
          ) : !config.live ? (
            <div className="flex flex-col gap-3">
              <h2 className="m-0 text-[22px] font-bold">Online booking is closed right now</h2>
              <p className="m-0 text-[16px] text-[#304050]">
                Call us on{" "}
                <a href={`tel:${config.phone.tel}`} className="font-semibold text-[#0369A1]">
                  {config.phone.display}
                </a>{" "}
                and we&apos;ll find a time.
              </p>
            </div>
          ) : step === "pick" ? (
            <div className="flex flex-col gap-5">
              {sendError ? <Notice tone="error">{sendError}</Notice> : null}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="m-0 text-[22px] font-bold">Choose a day</h2>
                <div className="flex items-center gap-2">
                  <NavButton label="Previous month" disabled={!canPrev} onClick={() => shift(-1)} dir="prev" />
                  <span className="min-w-[150px] text-center text-[17px] font-semibold" aria-live="polite">
                    {MONTHS[month.m - 1]} {month.y}
                  </span>
                  <NavButton label="Next month" disabled={!canNext} onClick={() => shift(1)} dir="next" />
                </div>
              </div>

              <div className="flex flex-wrap gap-6">
                <div className="min-w-0 flex-[1_1_320px]">
                  <div className="mb-1.5 grid grid-cols-7 gap-1.5">
                    {WEEKDAYS.map((w) => (
                      <span key={w} className="text-center text-[13px] font-semibold text-[#4B5B6E]">
                        {w}
                      </span>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1.5">
                    {cells.map((c, i) => {
                      if (!c) return <span key={`b${i}`} className="h-11" />;
                      const free = freeByDate.has(c.key);
                      const on = day === c.key;
                      if (!free)
                        return (
                          <span key={c.key} className="flex h-11 items-center justify-center text-[15px] text-[#8494A7]" aria-label={`${longDay(c.key)}, no free times`}>
                            {c.d}
                          </span>
                        );
                      return (
                        <button
                          key={c.key}
                          type="button"
                          aria-pressed={on}
                          aria-label={longDay(c.key)}
                          onClick={() => {
                            setDay(c.key);
                            setSlot(null);
                          }}
                          className={`h-11 cursor-pointer rounded-[10px] border-0 text-[15px] font-semibold ${on ? "bg-[#0369A1] text-white" : "bg-[#E6F7FB] text-[#0B4A6F] hover:bg-[#CDEEF7]"}`}
                        >
                          {c.d}
                        </button>
                      );
                    })}
                  </div>
                  <p className="mt-3.5 mb-0 text-[13px] text-[#4B5B6E]">Times are Sydney time. Closed Sundays and NSW public holidays.</p>
                </div>

                <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2.5">
                  <h3 className="m-0 text-[16px] font-bold">{day ? longDay(day) : "Free times"}</h3>
                  {days === null ? (
                    <p className="m-0 text-[15px] text-[#4B5B6E]">Loading…</p>
                  ) : timesError ? (
                    <Notice tone="error">{timesError}</Notice>
                  ) : !day ? (
                    <p className="m-0 text-[15px] text-[#4B5B6E]">No free times this month. Try the next month, or call us.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {(freeByDate.get(day)?.times ?? []).map((t) => {
                        const on = slot?.start === t.start;
                        return (
                          <button
                            key={t.start}
                            type="button"
                            aria-pressed={on}
                            onClick={() => setSlot(t)}
                            className={`min-h-11 cursor-pointer rounded-[10px] text-[15px] font-semibold ${
                              on ? "border-2 border-[#0369A1] bg-[#0369A1] text-white" : "border border-[#7DB9DA] bg-white text-[#0B4A6F] hover:bg-[#E6F7FB]"
                            }`}
                          >
                            {t.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!slot}
                    onClick={() => {
                      setSendError(null);
                      if (move) void submit();
                      else setStep("details");
                    }}
                    className={`mt-1.5 min-h-12 rounded-xl border-0 text-[16px] font-bold ${slot ? "cursor-pointer bg-[#0369A1] text-white hover:bg-[#075985]" : "cursor-not-allowed bg-[#E1E7EF] text-[#4B5B6E]"}`}
                  >
                    {move ? (sending ? "Moving…" : "Move my booking") : "Continue"}
                  </button>
                </div>
              </div>
            </div>
          ) : step === "details" && slot && kindInfo && day ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (detailsOk && !sending) void submit();
              }}
            >
              <button
                type="button"
                onClick={() => setStep("pick")}
                className="flex min-h-11 cursor-pointer items-center gap-1.5 self-start border-0 bg-transparent px-1 text-[15px] font-semibold text-[#0369A1]"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                Change time
              </button>
              <div className="rounded-xl bg-[#E6F7FB] px-4 py-3.5 text-[16px]">
                <strong>{kindInfo.label}</strong> · {longDay(day)}, {slot.label} (Sydney time)
              </div>
              <h2 className="m-0 text-[22px] font-bold">{personal ? "Almost done" : "Your details"}</h2>
              {personal && (personal.emailHint || personal.phoneEnding) ? (
                <p className="m-0 text-[15px] text-[#304050]">
                  We&apos;ll use the details we have for you
                  {personal.emailHint ? <> and email the confirmation to {personal.emailHint}</> : null}.
                </p>
              ) : null}
              {sendError ? <Notice tone="error">{sendError}</Notice> : null}
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                {needName ? (
                  <label className={labelCls}>
                    Full name
                    <input className={field} value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} autoComplete="name" required />
                  </label>
                ) : null}
                {needPhone ? (
                  <label className={labelCls}>
                    Mobile
                    <input className={field} type="tel" inputMode="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" placeholder="04xx xxx xxx" required />
                  </label>
                ) : null}
                {needEmail ? (
                  <label className={labelCls}>
                    Email
                    <input className={field} type="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} autoComplete="email" required />
                  </label>
                ) : null}
                {needAddress ? (
                  <label className={labelCls}>
                    Property address
                    <input className={field} value={details.address} onChange={(e) => setDetails({ ...details, address: e.target.value })} autoComplete="street-address" required />
                  </label>
                ) : null}
              </div>
              <label className={labelCls}>
                Anything we should know? (optional)
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={details.notes}
                  onChange={(e) => setDetails({ ...details, notes: e.target.value })}
                  placeholder={kind === "CALLBACK" ? "Best time to reach you, what you'd like to talk about…" : "Gate code, dog, roof access, what you're interested in…"}
                  className="resize-y rounded-[10px] border border-[#C8D3DF] px-3 py-2.5 text-[16px] text-[#111C27] outline-none focus:border-[#0369A1] focus:ring-2 focus:ring-[#0369A1]/25"
                />
              </label>
              {!personal ? (
                <label className="flex items-start gap-2.5 text-[15px] leading-[22px] text-[#304050]">
                  <input type="checkbox" checked={details.smsOk} onChange={(e) => setDetails({ ...details, smsOk: e.target.checked })} className="mt-0.5 size-5 accent-[#0369A1]" />
                  You can text me about this booking.
                </label>
              ) : null}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                aria-hidden="true"
                value={details.website}
                onChange={(e) => setDetails({ ...details, website: e.target.value })}
                className="absolute -left-[9999px] h-0 w-0 opacity-0"
                name="website"
              />
              <p className="m-0 text-[13px] leading-[19px] text-[#4B5B6E]">
                By booking you agree to our{" "}
                <a href="/terms" className="text-[#0369A1]">
                  Terms
                </a>{" "}
                and{" "}
                <a href="/privacy-policy" className="text-[#0369A1]">
                  Privacy Policy
                </a>
                . {kind === "CALLBACK" ? "" : "Someone 18 or over needs to be home for the visit. "}You can change or cancel any time from your confirmation.
              </p>
              <button
                type="submit"
                disabled={!detailsOk || sending}
                className={`min-h-[52px] rounded-xl border-0 text-[17px] font-bold ${detailsOk && !sending ? "cursor-pointer bg-[#0369A1] text-white hover:bg-[#075985]" : "cursor-not-allowed bg-[#E1E7EF] text-[#4B5B6E]"}`}
              >
                {sending ? "Booking…" : "Confirm booking"}
              </button>
            </form>
          ) : step === "done" && booked ? (
            <div className="flex flex-col items-start gap-4 py-3" role="status">
              <span className="flex size-14 items-center justify-center rounded-full bg-[#DCFCE7]">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#15803D" strokeWidth="2.5" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </span>
              <h2 className="m-0 text-[26px] font-bold">{move ? "Your booking is moved" : "You're booked in"}</h2>
              <p className="m-0 text-[18px] leading-[26px]">
                <strong>{config.kinds.find((k) => k.kind === booked.kind)?.label ?? kindInfo?.label}</strong>
                <br />
                {booked.when} (Sydney time)
              </p>
              <p className="m-0 max-w-[520px] text-[16px] leading-6 text-[#304050]">
                {booked.emailed ? "We've emailed your confirmation with a calendar invite. " : "Save this page's link to change or cancel later. "}
                {booked.kind === "CALLBACK" ? `A specialist will call you from ${config.phone.display}.` : "We'll be in touch before the visit."}
              </p>
              <div className="flex flex-wrap gap-2.5">
                <a href={booked.manageUrl} className="flex min-h-11 items-center rounded-[10px] bg-[#0369A1] px-4 text-[15px] font-semibold text-white no-underline hover:bg-[#075985]">
                  Change or cancel
                </a>
                {!embedded ? (
                  <Link href="/" className="flex min-h-11 items-center rounded-[10px] border border-[#C8D3DF] px-4 text-[15px] font-semibold text-[#111C27] no-underline">
                    Back to EasyLink Solar
                  </Link>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}

function Notice({ tone, children }: { tone: "error" | "info"; children: React.ReactNode }) {
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={`m-0 rounded-[10px] border px-3 py-2.5 text-[15px] ${tone === "error" ? "border-red-300 bg-red-50 text-red-800" : "border-sky-300 bg-sky-50 text-sky-900"}`}
    >
      {children}
    </p>
  );
}

function NavButton({ label, disabled, onClick, dir }: { label: string; disabled: boolean; onClick: () => void; dir: "prev" | "next" }) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-[10px] border border-[#C8D3DF] bg-white ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:bg-[#F2F9FC]"}`}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111C27" strokeWidth="2" aria-hidden="true">
        <path d={dir === "prev" ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
      </svg>
    </button>
  );
}
