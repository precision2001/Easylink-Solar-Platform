"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { InstallerHeader } from "@/components/installer/dashboard/InstallerHeader";
import { InstallerMessageCustomerPanel } from "@/components/installer/messages/InstallerMessageCustomerPanel";
import { PortalRealtimeMessagesPanel } from "@/components/messages/PortalRealtimeMessagesPanel";
import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";
import { useAppSelector } from "@/lib/store/hooks";

export default function InstallerMessagesPage() {
  const user = useAppSelector((s) => s.installerAuth.user);
  const [activeContact, setActiveContact] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const initials = useMemo(() => {
    const f = user?.firstName?.trim().charAt(0) ?? "";
    const l = user?.lastName?.trim().charAt(0) ?? "";
    return (f + l || "IN").toUpperCase().slice(0, 2);
  }, [user?.firstName, user?.lastName]);

  // Stable so the panel's reporting effect doesn't re-fire every render.
  const handleActiveContactChange = useCallback(
    (contact: { id: string; name: string } | null) => setActiveContact(contact),
    [],
  );

  return (
    <div className="flex min-h-screen flex-col bg-surface-50">
      <InstallerHeader activeNav="messages" userInitials={initials} />

      <div className="mx-auto flex min-h-0 w-full max-w-360 flex-1 flex-col gap-4 overflow-hidden px-4 py-5 md:gap-5 md:px-5 lg:py-8">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="grow">
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Messages
            </h1>
            <p className="mt-1 text-[13px] text-[#5B6B80]">
              Portal messages with your customers · customers reply from their portal
            </p>
          </div>
          <span className="rounded-full bg-[#DCFCE7] px-2.5 py-0.75 text-[12px] font-bold text-[#166534]">
            Included on every plan
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-[#FFE7C2] bg-[#FFF7E6] px-3.5 py-3 text-[13px] text-[#0F172A]">
          <span className="flex-[1_1_320px]">
            <strong>Want SMS, WhatsApp, web chat and email in one place, with AI replies?</strong>{" "}
            That&apos;s Inbox · all channels on the Elite plan.
          </span>
          <Link href="/installers/dashboard/plan" className="font-bold text-[#1565C0]">
            Compare plans
          </Link>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:items-start">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PortalRealtimeMessagesPanel
              portal="installer"
              sessionFetch={fetchWithInstallerSession}
              user={user}
              onActiveContactChange={handleActiveContactChange}
            />
          </div>
          {activeContact ? (
            <InstallerMessageCustomerPanel
              customerId={activeContact.id}
              customerName={activeContact.name}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}
