"use client";

import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { CustomerMessagesView } from "@/components/customer/portal/CustomerMessagesView";
import { useAppSelector } from "@/lib/store/hooks";

export default function CustomerMessagesPage() {
  const user = useAppSelector((s) => s.customerAuth.user);

  return (
    <CustomerPortalShell active="messages">
      <PortalPageHeader
        eyebrow="Stay in touch"
        title="Messages"
        intro="Talk to your installer about your job. Send photos, files or start a call, and see replies the moment they arrive."
      />
      <CustomerMessagesView user={user} />
    </CustomerPortalShell>
  );
}
