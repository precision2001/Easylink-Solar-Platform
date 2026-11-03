"use client";

import { MasterInbox } from "@/components/master-dashboard/MasterInbox";

/**
 * Matches the Easylink Designer "Installer · Inbox" mock (InstInbox.dc.html).
 *
 * That artboard is the same Inbox the Operations console uses, with the
 * installer's own conversations and a channel filter instead of a party
 * filter — so the component is reused with role="installer" rather than
 * duplicated. The sidebar comes from the installer dashboard layout.
 */
export default function InstallerInboxPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F172A]">
      <MasterInbox role="installer" />
    </div>
  );
}
