import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book a time | EasyLink Solar",
  robots: { index: false, follow: false },
};

type Props = { params: Promise<{ token: string }> };

/** A customer's personal booking link: easylinksolar.com.au/b/<token>. */
export default async function PersonalBookingPage({ params }: Props) {
  const { token } = await params;
  return <BookingFlow leadToken={token} />;
}
