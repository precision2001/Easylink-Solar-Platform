"use client";

import { EmailAccounts } from "@/components/email/EmailAccounts";

/** Installer · Email accounts: connect the installer's own Outlook or Gmail. */
export default function InstallerEmailAccountsPage() {
  return (
    <div className="min-h-screen bg-[#F4F6FA] text-[#0F172A]">
      <EmailAccounts portal="installer" />
    </div>
  );
}
