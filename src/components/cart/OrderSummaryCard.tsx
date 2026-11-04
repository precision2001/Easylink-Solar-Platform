"use client";

import { ORDER_STATUS_LABEL, money, type Order, type OrderStatus } from "@/lib/cart/orders-api";

const STATUS_TONE: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "bg-cream-150 text-warm-ink",
  PAID: "bg-sky-wash text-navy-800",
  PROCESSING: "bg-sky-wash text-navy-800",
  READY_FOR_PICKUP: "bg-mint-soft text-success",
  DISPATCHED: "bg-mint-soft text-success",
  COMPLETED: "bg-mint-soft text-success",
  CANCELLED: "bg-danger/10 text-danger",
};

export function OrderStatusPill({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 font-dm-sans text-[11px] font-bold ${STATUS_TONE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

export function fulfilmentLine(order: Order): string {
  if (order.fulfilment === "PICKUP") {
    return `Pickup · ${order.warehouse.city}${order.warehouse.address ? ` (${order.warehouse.address})` : ""}`;
  }
  const a = order.address;
  return `Delivery from ${order.warehouse.city} to ${[a.line1, a.line2, a.suburb, a.state, a.postcode].filter(Boolean).join(", ")}`;
}

/** One order: header, lines and totals. Used on the confirmation page and in order history. */
export function OrderSummaryCard({ order, compact = false }: { order: Order; compact?: boolean }) {
  return (
    <article className="rounded-2xl border border-warm-border bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-inter text-[16px] font-bold text-warm-ink">Order {order.reference}</p>
          <p className="font-dm-sans text-[12px] text-warm-gray">
            {new Date(order.createdAt).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" })} ·{" "}
            {fulfilmentLine(order)}
          </p>
        </div>
        <OrderStatusPill status={order.status} />
      </div>
      <ul className={`mt-3 divide-y divide-warm-border ${compact ? "text-[12px]" : "text-[13px]"} font-dm-sans`}>
        {order.items.map((i) => (
          <li key={i.id} className="flex items-center gap-3 py-2">
            {!compact ? (
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-md bg-cream-50">
                {i.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                  <img src={i.imageUrl} alt="" className="h-full w-full object-contain p-1" />
                ) : null}
              </div>
            ) : null}
            <span className="min-w-0 flex-1 text-warm-ink">
              {i.brand ? <span className="text-warm-gray">{i.brand} </span> : null}
              {i.name}
            </span>
            <span className="text-warm-gray">×{i.quantity}</span>
            <span className="w-24 text-right font-semibold text-warm-ink">{money(i.lineTotal, order.currency)}</span>
          </li>
        ))}
      </ul>
      <dl className="mt-2 space-y-1 border-t border-warm-border pt-2 font-dm-sans text-[13px]">
        <div className="flex justify-between">
          <dt className="text-warm-gray">Subtotal</dt>
          <dd className="text-warm-ink">{money(order.subtotal, order.currency)}</dd>
        </div>
        <div className="flex justify-between">
          <dt className="text-warm-gray">{order.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</dt>
          <dd className="text-warm-ink">
            {order.deliveryFee > 0 ? money(order.deliveryFee, order.currency) : order.fulfilment === "PICKUP" ? "Free" : "Included"}
          </dd>
        </div>
        {order.paymentFee ? (
          <div className="flex justify-between">
            <dt className="text-warm-gray">Payment fee</dt>
            <dd className="text-warm-ink">{money(order.paymentFee, order.currency)}</dd>
          </div>
        ) : null}
        <div className="flex justify-between">
          <dt className="font-semibold text-warm-ink">Total (incl. GST)</dt>
          <dd className="font-inter text-[15px] font-bold text-warm-ink">{money(order.total, order.currency)}</dd>
        </div>
      </dl>
      {order.payment?.receiptUrl ? (
        <a
          href={order.payment.receiptUrl}
          target="_blank"
          rel="noreferrer"
          className="mt-3 inline-block font-dm-sans text-[12px] font-semibold text-brand-blue hover:underline"
        >
          View payment receipt
        </a>
      ) : null}
    </article>
  );
}
