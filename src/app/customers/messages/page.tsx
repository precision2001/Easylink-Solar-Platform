"use client";

import { CustomerTopNav } from "@/components/customer/portal/CustomerTopNav";
import { CustomerMessagesView } from "@/components/customer/portal/CustomerMessagesView";
import { useAppSelector } from "@/lib/store/hooks";

export default function CustomerMessagesPage() {
  const user = useAppSelector((s) => s.customerAuth.user);

  return (
    <div className="flex min-h-screen flex-col bg-[#F4F6FA] text-[#0F172A]">
      <CustomerTopNav active="messages" />
      <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-[18px] px-6 pt-6 pb-14">
      <CustomerMessagesView user={user} />
      </main>
    </div>
  );
}
