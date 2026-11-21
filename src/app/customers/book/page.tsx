"use client";

import { useEffect, useState } from "react";
import { BookingFlow } from "@/components/booking/BookingFlow";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { useAppSelector } from "@/lib/store/hooks";

/** Customer portal > Book a time: a site visit or call back, tied to the customer's own record. */
export default function CustomerBookPage() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [token, setToken] = useState<string | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const r = await fetch("/api/customers/booking-link", { cache: "no-store" });
        const j = (await r.json().catch(() => ({}))) as { data?: { token: string | null }; message?: string };
        if (r.ok) setToken(j.data?.token ?? null);
        else {
          setError(j.message || "Couldn't open booking.");
          setToken(null);
        }
      } catch {
        setError("Couldn't reach EasyLink. Try again.");
        setToken(null);
      }
    })();
  }, []);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader firstName={user?.firstName} lastName={user?.lastName} activeNav="book" />
      <main className="mx-auto flex w-full max-w-[1180px] flex-1 flex-col gap-4 px-4 py-5 md:px-5">
        <div className="rounded-2xl bg-[#F2F9FC] p-4 sm:p-6">
          {error ? (
            <p role="alert" className="mb-4 rounded-[10px] border border-red-300 bg-red-50 px-3 py-2.5 text-[15px] text-red-800">
              {error}
            </p>
          ) : null}
          {token === undefined ? <p className="m-0 text-[15px] text-[#4B5B6E]">Loading…</p> : <BookingFlow leadToken={token} embedded />}
        </div>
      </main>
    </div>
  );
}
