"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { OrderSummaryCard } from "@/components/cart/OrderSummaryCard";
import { fetchMyOrders, type BuyerPortal, type Order } from "@/lib/cart/orders-api";

/** Order history for the signed-in customer or installer. */
export function MyOrders({ portal, title = "My orders" }: { portal: BuyerPortal; title?: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyOrders(portal, 20)
      .then((o) => !cancelled && setOrders(o))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load your orders"));
    return () => {
      cancelled = true;
    };
  }, [portal]);

  return (
    <section id="orders" className="flex scroll-mt-24 flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-inter text-[17px] font-bold text-warm-ink">{title}</h2>
        <Link href="/cart" className="font-dm-sans text-[13px] font-semibold text-brand-blue hover:underline">
          View cart
        </Link>
      </div>
      {error ? (
        <p className="rounded-xl border border-warm-border bg-white p-4 font-dm-sans text-[13px] text-danger">{error}</p>
      ) : orders === null ? (
        <p className="rounded-xl border border-warm-border bg-white p-4 font-dm-sans text-[13px] text-warm-gray">Loading orders…</p>
      ) : orders.length === 0 ? (
        <p className="rounded-xl border border-warm-border bg-white p-4 font-dm-sans text-[13px] text-warm-gray">
          No orders yet. Add products to your cart and choose pickup or delivery from our Sydney, Melbourne, Brisbane, Adelaide or Perth warehouse.
        </p>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {orders.map((o) => (
            <OrderSummaryCard key={o.id} order={o} compact />
          ))}
        </div>
      )}
    </section>
  );
}
