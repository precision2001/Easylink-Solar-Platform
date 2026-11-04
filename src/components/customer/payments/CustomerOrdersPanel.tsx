"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fulfilmentLine } from "@/components/cart/OrderSummaryCard";
import { StatusChip } from "@/components/customer/payments/StatusChip";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { ORDER_STATUS_LABEL, fetchMyOrders, money, type Order, type OrderStatus } from "@/lib/cart/orders-api";
import { formatPaymentDate, paymentMethodLabel, type StatusTone } from "@/lib/customers/payment-view";

const ORDER_TONE: Record<OrderStatus, StatusTone> = {
  PENDING_PAYMENT: "warn",
  PAID: "info",
  PROCESSING: "info",
  READY_FOR_PICKUP: "good",
  DISPATCHED: "good",
  COMPLETED: "good",
  CANCELLED: "muted",
};

/**
 * The customer's cart orders (pickup or delivery from an EasyLink warehouse),
 * in the portal's style. `limit` shows only the newest few with a link to the rest.
 */
export function CustomerOrdersPanel({ limit, title = "My orders" }: { limit?: number; title?: string }) {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchMyOrders("customer", 20)
      .then((o) => !cancelled && setOrders(o))
      .catch((e: unknown) => !cancelled && setError(e instanceof Error ? e.message : "Could not load your orders"));
    return () => {
      cancelled = true;
    };
  }, []);

  const shown = orders && limit ? orders.slice(0, limit) : orders;
  const more = orders && limit && orders.length > limit;

  return (
    <Panel
      id="orders"
      className="scroll-mt-24"
      title={title}
      meta={
        <span className="flex flex-wrap gap-x-4">
          {more ? (
            <Link href="/customers/payments#orders" className="font-semibold text-[#1D4ED8] hover:underline">
              See all {orders.length} orders
            </Link>
          ) : null}
          <Link href="/cart" className="font-semibold text-[#1D4ED8] hover:underline">
            View cart
          </Link>
        </span>
      }
    >
      {error ? (
        <p role="alert" className="m-0 rounded-[14px] bg-[#FEE2E2] p-4 text-[14px] text-[#991B1B]">
          {error}
        </p>
      ) : shown === null ? (
        <Skeleton className="h-28" />
      ) : shown.length === 0 ? (
        <EmptyNote icon="products" title="No orders yet">
          Add products to your cart, then choose pickup or delivery from our Sydney, Melbourne, Brisbane, Adelaide or Perth warehouse.
        </EmptyNote>
      ) : (
        <ul className="m-0 grid list-none gap-3 p-0 lg:grid-cols-2">
          {shown.map((o) => (
            <li key={o.id} className="flex flex-col gap-3 rounded-[16px] border border-[#E2E8F0] p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex min-w-0 flex-col gap-0.5">
                  <p className="m-0 text-[15px] font-bold text-[#0F172A]">Order {o.reference}</p>
                  <p className="m-0 text-[13px] text-[#5B6B80]">
                    {formatPaymentDate(o.createdAt)} · {fulfilmentLine(o)}
                  </p>
                </div>
                <StatusChip tone={ORDER_TONE[o.status]}>{ORDER_STATUS_LABEL[o.status]}</StatusChip>
              </div>
              <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
                {o.items.slice(0, 3).map((i) => (
                  <li key={i.id} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 text-[#334155]">
                      {i.brand && !i.name.toLowerCase().startsWith(i.brand.toLowerCase()) ? `${i.brand} ` : ""}
                      {i.name} <span className="text-[#5B6B80]">× {i.quantity}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-[#0F172A]">{money(i.lineTotal, o.currency)}</span>
                  </li>
                ))}
                {o.items.length > 3 ? <li className="text-[13px] text-[#5B6B80]">and {o.items.length - 3} more</li> : null}
              </ul>
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#EEF2F6] pt-3">
                <span className="text-[13px] text-[#5B6B80]">
                  {o.payment ? `Paid with ${paymentMethodLabel(o.payment.provider)}` : "Total incl. GST"}
                </span>
                <span className="text-[17px] font-extrabold tabular-nums text-[#0F172A]">{money(o.total, o.currency)}</span>
              </div>
              {o.payment?.receiptUrl ? (
                <a
                  href={o.payment.receiptUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-[44px] items-center gap-1.5 self-start text-[14px] font-semibold text-[#1D4ED8] hover:underline"
                >
                  <PortalIcon name="download" size={16} />
                  View receipt
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
