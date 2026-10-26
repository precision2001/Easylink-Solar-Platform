"use client";

import Link from "next/link";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { MasterAdminBody } from "@/components/master-dashboard/MasterAdminBody";

export default function MasterAdminHomePage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] bg-[#0B1A2E] md:flex-[1_1_248px]">
        <MasterDistSidebar active="admin" />
      </div>
      <main className="flex min-w-0 flex-[999_1_560px] flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-[14px]">
          <nav aria-label="Breadcrumb" className="grow text-[13px] text-[#5B6B80]">
            <Link href="/master/admin" className="text-[#5B6B80]">
              Admin
            </Link>{" "}
            <span aria-hidden="true">/</span>{" "}
            <span className="font-semibold text-[#0F172A]">Home</span>
          </nav>
          <span className="rounded-full bg-[#0B1A2E] px-[10px] py-[3px] text-[12px] font-bold text-white">
            EasyLink Operations · Admin
          </span>
        </header>
        <MasterAdminBody screen="home" />
      </main>
    </div>
  );
}
