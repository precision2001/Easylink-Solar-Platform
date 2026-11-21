"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";

type Kind = "SITE_VISIT" | "CALLBACK" | "SERVICE";
type Managed = { kind: Kind; label: string; startAt: string; when: string; status: string; firstName: string; rebookToken: string | null; past: boolean };

/** Change or cancel a booking from the link in its confirmation. */
export function ManageBooking({ token }: { token: string }) {
  const [b, setB] = useState<Managed | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"view" | "move" | "confirmCancel">("view");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch(`/api/public/booking/manage?m=${encodeURIComponent(token)}`, { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { data?: Managed; message?: string };
        if (r.ok && j.data) setB(j.data);
        else setError(j.message || "We couldn't find that booking.");
      } catch {
        setError("We couldn't reach EasyLink. Try again.");
      }
    })();
  }, [token]);

  async function cancel() {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch("/api/public/booking/manage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel", m: token }),
      });
      const j = (await r.json().catch(() => ({}))) as { data?: Managed; message?: string };
      if (r.ok && j.data) {
        setB(j.data);
        setDone("Your booking is cancelled. We've emailed you a note.");
        setMode("view");
      } else setError(j.message || "That didn't go through. Please call us.");
    } catch {
      setError("We couldn't reach EasyLink. Try again.");
    }
    setBusy(false);
  }

  if (mode === "move" && b) {
    return <BookingFlow leadToken={b.rebookToken} move={{ token, kind: b.kind, when: b.when }} />;
  }

  const cancelled = b?.status === "CANCELLED";
  const past = !!b?.past;

  return (
    <div className="min-h-screen bg-[#F2F9FC] text-[#111C27]">
      <header className="border-b border-[#E1E7EF] bg-white">
        <div className="mx-auto flex max-w-[720px] items-center gap-2.5 px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 text-[20px] font-bold text-[#111C27] no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo.webp" alt="" width={32} height={32} />
            EasyLink Solar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[720px] px-4 py-8 sm:px-6">
        <section className="flex flex-col gap-4 rounded-2xl border border-[#E1E7EF] bg-white p-6">
          <h1 className="m-0 text-[26px] font-bold">{b?.firstName ? `Hi ${b.firstName}, your booking` : "Your booking"}</h1>
          {error ? (
            <p role="alert" className="m-0 rounded-[10px] border border-red-300 bg-red-50 px-3 py-2.5 text-[15px] text-red-800">
              {error}
            </p>
          ) : null}
          {done ? (
            <p role="status" className="m-0 rounded-[10px] border border-green-300 bg-green-50 px-3 py-2.5 text-[15px] text-green-800">
              {done}
            </p>
          ) : null}
          {!b && !error ? <p className="m-0 text-[15px] text-[#4B5B6E]">Loading…</p> : null}
          {b ? (
            <>
              <div className={`rounded-xl px-4 py-3.5 text-[17px] leading-[26px] ${cancelled ? "bg-[#F1F5F9] text-[#4B5B6E]" : "bg-[#E6F7FB]"}`}>
                <strong>{b.label}</strong>
                {cancelled ? " (cancelled)" : ""}
                <br />
                {b.when} (Sydney time)
              </div>
              {cancelled || past ? (
                b.rebookToken ? (
                  <a href={`/b/${b.rebookToken}`} className="flex min-h-11 items-center self-start rounded-[10px] bg-[#0369A1] px-4 text-[15px] font-semibold text-white no-underline">
                    Book another time
                  </a>
                ) : null
              ) : mode === "confirmCancel" ? (
                <div className="flex flex-col gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="m-0 text-[16px] font-semibold text-red-900">Cancel this {b.label.toLowerCase()}?</p>
                  <div className="flex flex-wrap gap-2.5">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void cancel()}
                      className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-[#B42318] px-4 text-[15px] font-semibold text-white disabled:opacity-60"
                    >
                      {busy ? "Cancelling…" : "Yes, cancel it"}
                    </button>
                    <button type="button" onClick={() => setMode("view")} className="min-h-11 cursor-pointer rounded-[10px] border border-[#C8D3DF] bg-white px-4 text-[15px] font-semibold">
                      Keep it
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  <button
                    type="button"
                    disabled={!b.rebookToken}
                    onClick={() => setMode("move")}
                    className="min-h-11 cursor-pointer rounded-[10px] border-0 bg-[#0369A1] px-4 text-[15px] font-semibold text-white disabled:opacity-60"
                  >
                    Change time
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("confirmCancel")}
                    className="min-h-11 cursor-pointer rounded-[10px] border border-[#C8D3DF] bg-white px-4 text-[15px] font-semibold text-[#B42318]"
                  >
                    Cancel booking
                  </button>
                </div>
              )}
              <p className="m-0 text-[14px] text-[#4B5B6E]">
                Questions? Call{" "}
                <a href="tel:+61291638128" className="font-semibold text-[#0369A1]">
                  02 9163 8128
                </a>
                .
              </p>
            </>
          ) : null}
        </section>
      </main>
    </div>
  );
}
