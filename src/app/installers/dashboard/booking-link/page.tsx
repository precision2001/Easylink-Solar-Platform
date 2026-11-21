"use client";

import { useEffect, useState } from "react";
import { LeadLinkFinder, LinkShare } from "@/components/booking/LinkShare";

type Data = { link: string; live: boolean; kinds: string[] };

/** Installer Portal > Booking link: the installer's own link for their website, socials and quotes. */
export default function InstallerBookingLinkPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/installers/booking-link", { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { data?: Data; message?: string };
        if (r.ok && j.data) setData(j.data);
        else setError(j.message || "Couldn't load your booking link.");
      } catch {
        setError("Couldn't reach EasyLink. Try again.");
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-[#F4F6FA] px-4 py-6 pb-14 sm:px-6">
      <div className="mx-auto flex max-w-[1000px] flex-col gap-5 text-[#111C27]">
        <div>
          <h1 className="m-0 text-[26px] font-bold">Booking link</h1>
          <p className="mt-1 mb-0 max-w-[70ch] text-[14px] leading-[21px] text-[#4B5B6E]">
            Customers pick a free site visit or call back themselves. New customers who book through your link come to you with their booking, and
            it shows in your Schedule. Opening hours and rules are set by EasyLink.
          </p>
        </div>
        {error ? (
          <p role="alert" className="m-0 rounded-[10px] border border-red-300 bg-red-50 px-3 py-2 text-[14px] text-red-700">
            {error}
          </p>
        ) : null}

        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-[18px] font-bold">Your booking link</h2>
            {data ? (
              <span
                className={`rounded-full px-3 py-1 text-[13px] font-bold ${data.live ? "border border-green-300 bg-green-50 text-green-800" : "border border-slate-300 bg-slate-100 text-slate-700"}`}
              >
                {data.live ? "Taking bookings" : "Paused by EasyLink"}
              </span>
            ) : null}
          </div>
          <p className="m-0 text-[14px] text-[#4B5B6E]">Put it on your website, Google Business profile, socials, email signature and quotes.</p>
          {data ? <LinkShare link={data.link} qrName="my-booking-link-qr.png" /> : !error ? <p className="m-0 text-[14px] text-[#4B5B6E]">Loading…</p> : null}
        </section>

        <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-5">
          <h2 className="m-0 text-[18px] font-bold">Send a customer their own link</h2>
          <LeadLinkFinder endpoint="/api/installers/booking-link/leads" />
        </section>
      </div>
    </div>
  );
}
