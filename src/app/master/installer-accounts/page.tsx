"use client";

import { useEffect, useState } from "react";
import { MasterDistSidebar } from "@/components/master-dashboard/MasterDistSidebar";
import { PersonItems } from "@/components/ai/ProjectWorkspace";
import { ai, AiNotConnectedError } from "@/lib/ai-platform/client";

/** Staff: any installer's account — what they've been paid, invoiced, uploaded and asked to do. */
export default function MasterInstallerAccountsPage() {
  const [search, setSearch] = useState("");
  const [list, setList] = useState<{ id: string; name: string; area: string | null }[] | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "error">("loading");
  const [picked, setPicked] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      ai.installers(search)
        .then((r) => (setList(r), setState("ready")))
        .catch((e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : "error"));
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div className="flex min-h-screen flex-wrap bg-[#F4F6FA]">
      <div className="w-full basis-[248px] md:flex-[1_1_248px]">
        <MasterDistSidebar active="aInstallers" />
      </div>
      <main className="flex min-w-0 flex-[999_1_560px] flex-wrap gap-4 p-4 md:p-6">
        <section aria-label="Installers" className="flex flex-[1_1_260px] flex-col gap-2 self-start rounded-[14px] border border-[#E3E8EF] bg-white p-3">
          <h1 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">Installers</h1>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or area"
            aria-label="Search installers"
            className="rounded-[10px] border border-[#D5DCE5] px-3 py-2 text-[14px]"
          />
          {state === "offline" && <p className="m-0 text-[13px] text-[#475569]">Connect the EasyLink AI platform to see installers here.</p>}
          {state === "error" && <p className="m-0 text-[13px] text-[#991B1B]">Couldn&apos;t load installers.</p>}
          <ul className="m-0 flex list-none flex-col p-0">
            {(list ?? []).map((i) => (
              <li key={i.id}>
                <button
                  onClick={() => setPicked(i)}
                  aria-current={picked?.id === i.id}
                  className="flex w-full flex-col rounded-[10px] px-2.5 py-2 text-left"
                  style={{ background: picked?.id === i.id ? "#EEF7FE" : "transparent" }}
                >
                  <span className="text-[14px] font-semibold text-[#0F172A]">{i.name}</span>
                  {i.area && <span className="text-[12px] text-[#5B6B80]">{i.area}</span>}
                </button>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex min-w-0 flex-[3_1_480px] flex-col">
          {picked ? (
            <PersonItems key={picked.id} portal="admin" userId={picked.id} title={picked.name} intro="Payouts, invoices, their uploads, bookings, tasks and sale price / profit records." />
          ) : (
            <div className="rounded-[14px] border border-[#E3E8EF] bg-white p-6 text-[14px] text-[#475569]">Pick an installer to see their account.</div>
          )}
        </div>
      </main>
    </div>
  );
}
