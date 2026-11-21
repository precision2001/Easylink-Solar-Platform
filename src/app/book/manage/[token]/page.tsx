import type { Metadata } from "next";
import { ManageBooking } from "@/components/booking/ManageBooking";

export const metadata: Metadata = {
  title: "Your booking | EasyLink Solar",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/** The "Change or cancel" link from a booking confirmation. */
export default async function ManageBookingPage({ params }: Props) {
  const { token } = await params;
  return <ManageBooking token={token} />;
}
