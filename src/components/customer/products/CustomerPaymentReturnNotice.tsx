"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { refreshCustomerPayment } from "@/lib/customers/payments";

function formatAmount(payment: { amount: number; currency: string }): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: payment.currency,
    }).format(payment.amount);
  } catch {
    return `${payment.amount.toFixed(2)} ${payment.currency}`;
  }
}

/**
 * Stripe or Afterpay sends the customer back to /products with `?payment=...`.
 * We surface the outcome, then strip the params so a refresh does not re-toast.
 */
export function CustomerPaymentReturnNotice() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const handled = useRef<string | null>(null);

  const outcome = params.get("payment");
  const paymentId = params.get("paymentId");

  useEffect(() => {
    if (!outcome) return;

    const key = `${outcome}:${paymentId ?? ""}`;
    if (handled.current === key) return;
    handled.current = key;

    const clearParams = () => {
      const next = new URLSearchParams(params.toString());
      next.delete("payment");
      next.delete("paymentId");
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    };

    if (outcome === "cancelled") {
      toast.info("Checkout was cancelled — nothing was charged.");
      clearParams();
      return;
    }

    if (outcome !== "success") {
      clearParams();
      return;
    }

    if (!paymentId) {
      toast.success("Order completed.");
      clearParams();
      return;
    }

    // The webhook is authoritative but may not have landed yet, so pull the
    // state straight from Stripe before telling the customer anything.
    void refreshCustomerPayment(paymentId)
      .then((payment) => {
        if (payment.status === "PAID") {
          toast.success(`Order confirmed — ${formatAmount(payment)} paid.`);
        } else if (payment.status === "PENDING") {
          toast.info("Checkout finished — this payment is still being confirmed.");
        } else {
          toast.error(
            payment.failureMessage ?? `Payment ${payment.status.toLowerCase()}.`,
          );
        }
      })
      .catch(() => {
        toast.info("Checkout finished — could not confirm the payment status.");
      })
      .finally(clearParams);
  }, [outcome, params, pathname, paymentId, router]);

  return null;
}
