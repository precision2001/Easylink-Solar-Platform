import { redirect } from "next/navigation";

/** /checkout and /cart are one page. */
export default function CheckoutPage() {
  redirect("/cart");
}
