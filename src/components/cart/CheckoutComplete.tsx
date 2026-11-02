"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { OrderSummaryCard } from "@/components/cart/OrderSummaryCard";
import { cart } from "@/lib/cart/cart-store";
import { fetchBuyerSession, refreshMyOrder, type Order } from "@/lib/cart/orders-api";

const GRADIENT = "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)";

/**
 * Stripe's success page. The webhook usually marks the order paid within a
 * second or two; until then this asks the backend to read the session from
 * Stripe directly, a few times, before settling on what it sees.
 */
export function CheckoutComplete() {
  const orderId = useSearchParams().get("order");
  const [order, setOrder] = useState<Order | null>(null);
  const [portal, setPortal] = useState<"customer" | "installer" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    let cancelled = false;
    (async () => {
      const session = await fetchBuyerSession().catch(() => null);
      if (!session) {
        if (!cancelled) setError("Sign in to see this order.");
        return;
      }
      if (!cancelled) setPortal(session.portal);
      for (let attempt = 0; attempt < 6 && !cancelled; attempt++) {
        try {
          const o = await refreshMyOrder(session.portal, orderId);
          if (cancelled) return;
          setOrder(o);
          if (o.status !== "PENDING_PAYMENT") {
            if (o.status !== "CANCELLED") cart.clear();
            return;
          }
        } catch (e) {
          if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your order.");
          return;
        }
        await new Promise((r) => setTimeout(r, 1500));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const paid = order && order.status !== "PENDING_PAYMENT" && order.status !== "CANCELLED";
  const ordersHref = portal === "installer" ? "/installers/dashboard/equipment#orders" : "/customers/payments#orders";

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-5 px-4 pb-16 pt-8">
      <div className="text-center">
        <h1 className="font-inter text-[26px] font-extrabold text-warm-ink">
          {paid ? "Thanks — your order is confirmed" : order?.status === "CANCELLED" ? "This order was cancelled" : "Confirming your payment…"}
        </h1>
        <p className="mt-1 font-dm-sans text-[14px] text-warm-gray">
          {paid
            ? order!.fulfilment === "PICKUP"
              ? `We'll email ${order!.contactEmail} when it's ready to collect from ${order!.warehouse.city}.`
              : `We'll email ${order!.contactEmail} when it's dispatched from ${order!.warehouse.city}.`
            : order?.status === "CANCELLED"
              ? "The payment wasn't completed. Your cart is still saved."
              : "This usually takes a few seconds."}
        </p>
      </div>
      {error || !orderId ? (
        <p className="text-center font-dm-sans text-[14px] text-danger">{error ?? "No order to show."}</p>
      ) : null}
      {order ? <OrderSummaryCard order={order} /> : null}
      {order?.status === "PENDING_PAYMENT" ? (
        <p className="text-center font-dm-sans text-[12px] text-warm-gray">
          Still showing as awaiting payment? Stripe can take a minute — it will update in your order history, and you&apos;ll get an email.
        </p>
      ) : null}
      <div className="flex flex-wrap justify-center gap-3">
        {portal ? (
          <Link href={ordersHref} className="rounded-xl border border-warm-border bg-white px-5 py-2.5 font-inter text-[14px] font-semibold text-warm-ink hover:bg-cream-50">
            My orders
          </Link>
        ) : null}
        <Link href={order?.status === "CANCELLED" ? "/cart" : "/products"} className="rounded-xl px-5 py-2.5 font-inter text-[14px] font-semibold text-white" style={{ backgroundImage: GRADIENT }}>
          {order?.status === "CANCELLED" ? "Back to cart" : "Continue shopping"}
        </Link>
      </div>
    </div>
  );
}
