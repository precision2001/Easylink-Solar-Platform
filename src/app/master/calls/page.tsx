"use client";

import Link from "next/link";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { CallsBoard } from "@/components/contact-centre/CallsBoard";

export default function MasterCallsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="calls" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
          <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
            Communication <span aria-hidden="true">/</span> <span className="font-semibold text-[#0F172A]">Calls</span>
          </nav>
        </header>
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-8 py-6 pb-14">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">Calls</h1>
              <p className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-[#5B6B80]">
                Every call in and out, including calls EasyLink AI answered, with recordings, transcripts and AI summaries. Calls go on the customer&apos;s record by phone number.
              </p>
            </div>
            <Link href="/master/dialer" className="flex h-10 items-center rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] no-underline">
              Open the dialler
            </Link>
          </div>
          <CallsBoard />
        </div>
      </main>
    </div>
  );
}
