import type { Metadata } from "next";
import { BookingFlow } from "@/components/booking/BookingFlow";

export const metadata: Metadata = {
  title: "Book a free site visit | EasyLink Solar",
  description: "Pick a time for a free solar and battery site visit or a call back from an EasyLink Solar specialist.",
  alternates: { canonical: "/book" },
};

type Props = { searchParams: Promise<{ i?: string | string[] }> };

/** easylinksolar.com.au/book (public), or /book?i=<token> (an installer's own link). */
export default async function BookPage({ searchParams }: Props) {
  const { i } = await searchParams;
  return <BookingFlow installerToken={typeof i === "string" ? i : null} />;
}
