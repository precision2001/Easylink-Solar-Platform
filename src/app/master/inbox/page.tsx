import type { Metadata } from "next";
import { MasterInbox } from "@/components/master-dashboard/MasterInbox";

export const metadata: Metadata = {
  title: "Inbox | Easylink",
  description: "Customers, installers and partners — every channel in one place.",
};

export default function MasterInboxPage() {
  return <MasterInbox />;
}
