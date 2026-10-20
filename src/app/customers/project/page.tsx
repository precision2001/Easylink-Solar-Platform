"use client";

import { useEffect, useState } from "react";
import { CustomerDashboardHeader } from "@/components/customer/dashboard/CustomerDashboardHeader";
import { ProjectWorkspace } from "@/components/ai/ProjectWorkspace";
import { ai, AiNotConnectedError, type RecordRef } from "@/lib/ai-platform/client";
import { useAppSelector } from "@/lib/store/hooks";

/** "My Project": every file, message and step on the customer's install, from EasyLink and every installer assigned. */
export default function CustomerProjectPage() {
  const user = useAppSelector((s) => s.customerAuth.user);
  const [project, setProject] = useState<RecordRef | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "offline">("loading");

  useEffect(() => {
    ai.projects("customer")
      .then((rows) => {
        const first = rows.find((r) => r.ref.type === "customer") ?? rows[0];
        setProject(first?.ref ?? null);
        setState(first ? "ready" : "none");
      })
      .catch((e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : "none"));
  }, []);

  return (
    <div className="customer-page-bg flex min-h-screen flex-col">
      <CustomerDashboardHeader firstName={user?.firstName} lastName={user?.lastName} activeNav="project" />
      <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-4 px-4 py-5 md:px-5">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-source-sans text-[26px] font-bold text-white">My Project</h1>
          <p className="m-0 text-[14px] text-white/75">Every document, photo and message about your solar installation, from EasyLink and your installer.</p>
        </div>
        {state === "loading" && <p className="text-[14px] text-white/75">Loading…</p>}
        {state === "none" && <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">Your project will appear here once EasyLink has set it up.</div>}
        {state === "offline" && <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#334155]">Your project files will appear here soon.</div>}
        {state === "ready" && project && <ProjectWorkspace portal="customer" project={project} />}
      </main>
    </div>
  );
}
