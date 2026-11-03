"use client";

import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { ProjectBrowser } from "@/components/ai/ProjectWorkspace";

/** Every customer's files, messages and history; change the installer. */
export default function MasterProjectsPage() {
  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aCustomers" />
      </div>
      <main className="min-w-0 flex-[999_1_560px]">
        <ProjectBrowser portal="admin" title="Customers" />
      </main>
    </div>
  );
}
