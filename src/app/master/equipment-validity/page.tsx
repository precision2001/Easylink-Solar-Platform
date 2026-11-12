"use client";

import { EquipmentValidityBoard } from "@/components/equipment/EquipmentValidityBoard";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";

export default function MasterEquipmentValidityPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA] text-[#0F172A]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="validity" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <EquipmentValidityBoard portal="admin" />
      </main>
    </div>
  );
}
