import { redirect } from "next/navigation";

/** AI bookings now live in the EasyLink container screen (Bookings tab). */
export default function MasterAiBookingsPage() {
  redirect("/master/easylink-container?tab=bookings");
}
