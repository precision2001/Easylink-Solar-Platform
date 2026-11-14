"use client";

import { EmailWorkspace } from "@/components/email/EmailWorkspace";

/** Installer · Email (Communication, Elite). The sidebar comes from the installer dashboard layout. */
export default function InstallerEmailPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F172A]">
      <EmailWorkspace portal="installer" />
    </div>
  );
}
