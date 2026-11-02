"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  ORDER_STATUS_LABEL,
  fetchAllOrders,
  fetchAllWarehouses,
  money,
  updateOrderStatus,
  updateWarehouse,
  type Order,
  type OrderStatus,
  type Warehouse,
} from "@/lib/cart/orders-api";

const INK = "#0F172A";
const TH = "border-b border-[#E3E8EF] p-2 text-left text-[12px] font-semibold uppercase tracking-wide text-[#64748B]";
const TD = "border-b border-[#EEF2F6] px-2 py-2.5 text-[13px] align-top";

const STATUS_STYLE: Record<OrderStatus, [string, string]> = {
  PENDING_PAYMENT: ["#F1F5F9", "#475569"],
  PAID: ["#FFE7C2", "#3B1D00"],
  PROCESSING: ["#E2E8F0", "#334155"],
  READY_FOR_PICKUP: ["#DBEAFE", "#1E40AF"],
  DISPATCHED: ["#DBEAFE", "#1E40AF"],
  COMPLETED: ["#DCFCE7", "#166534"],
  CANCELLED: ["#FEE2E2", "#991B1B"],
};

function Pill({ status }: { status: OrderStatus }) {
  const [bg, fg] = STATUS_STYLE[status];
  return (
    <span className="inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: bg, color: fg }}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}

const STATUS_FILTERS: (OrderStatus | "ALL" | "OPEN")[] = ["OPEN", "ALL", "PAID", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED", "COMPLETED", "PENDING_PAYMENT", "CANCELLED"];
const OPEN: OrderStatus[] = ["PAID", "PROCESSING", "READY_FOR_PICKUP", "DISPATCHED"];

/**
 * Operations portal → Orders. Real cart orders from the website and portals,
 * by warehouse, with fulfilment status and the warehouse settings buyers see.
 */
export function MasterShopOrders() {
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [warehouseId, setWarehouseId] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("OPEN");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"orders" | "warehouses">("orders");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [o, w] = await Promise.all([fetchAllOrders({ limit: 200 }), fetchAllWarehouses()]);
      setOrders(o);
      setWarehouses(w);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load orders");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(() => {
    return (orders ?? []).filter(
      (o) =>
        (warehouseId === "ALL" || o.warehouse.id === warehouseId) &&
        (statusFilter === "ALL" || (statusFilter === "OPEN" ? OPEN.includes(o.status) : o.status === statusFilter)),
    );
  }, [orders, warehouseId, statusFilter]);

  const openCount = (id: string) => (orders ?? []).filter((o) => o.warehouse.id === id && OPEN.includes(o.status)).length;
  const openTotal = visible.filter((o) => OPEN.includes(o.status)).reduce((s, o) => s + o.total, 0);

  async function move(order: Order, status: OrderStatus) {
    setBusy(order.id);
    try {
      const updated = await updateOrderStatus(order.id, status);
      setOrders((prev) => (prev ?? []).map((o) => (o.id === updated.id ? updated : o)));
      toast.success(`${updated.reference} → ${ORDER_STATUS_LABEL[status]}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update the order");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="p-4 md:p-6" style={{ color: INK }}>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-bold">Orders</h1>
          <p className="text-[13px] text-[#64748B]">
            Cart orders from the website, customer portal and installer portal — paid by card through Stripe.
          </p>
        </div>
        <div className="flex gap-1 rounded-lg bg-white p-1 shadow-sm">
          {(["orders", "warehouses"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-md px-3 py-1.5 text-[13px] font-semibold ${tab === t ? "bg-[#0F172A] text-white" : "text-[#475569] hover:bg-[#F1F5F9]"}`}
            >
              {t === "orders" ? "Orders" : "Warehouses"}
            </button>
          ))}
        </div>
      </div>

      {error ? <p className="mb-3 rounded-lg bg-[#FEE2E2] p-3 text-[13px] text-[#991B1B]">{error}</p> : null}

      {tab === "warehouses" ? (
        <WarehouseSettings warehouses={warehouses} onSaved={(w) => setWarehouses((prev) => prev.map((x) => (x.id === w.id ? w : x)))} />
      ) : (
        <>
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {[{ id: "ALL", city: "All warehouses", state: "" } as Pick<Warehouse, "id" | "city" | "state">, ...warehouses].map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWarehouseId(w.id)}
                className={`rounded-xl border bg-white p-3 text-left shadow-sm ${warehouseId === w.id ? "border-[#F68A0A] ring-2 ring-[#F68A0A]/30" : "border-[#E3E8EF]"}`}
              >
                <span className="block text-[13px] font-bold">{w.city}</span>
                <span className="block text-[11px] text-[#64748B]">
                  {w.id === "ALL"
                    ? `${(orders ?? []).filter((o) => OPEN.includes(o.status)).length} open`
                    : `${w.state} · ${openCount(w.id)} open`}
                </span>
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`rounded-full border px-3 py-1 text-[12px] font-semibold ${
                  statusFilter === s ? "border-[#0F172A] bg-[#0F172A] text-white" : "border-[#E3E8EF] bg-white text-[#475569]"
                }`}
              >
                {s === "ALL" ? "All" : s === "OPEN" ? "Open" : ORDER_STATUS_LABEL[s]}
              </button>
            ))}
            <span className="ml-auto text-[12px] text-[#64748B]">
              {visible.length} order{visible.length === 1 ? "" : "s"} · open value {money(openTotal)}
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E3E8EF] bg-white shadow-sm">
            <table className="w-full min-w-[860px] border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Order</th>
                  <th className={TH}>Placed</th>
                  <th className={TH}>Buyer</th>
                  <th className={TH}>Fulfilment</th>
                  <th className={`${TH} text-right`}>Items</th>
                  <th className={`${TH} text-right`}>Total</th>
                  <th className={TH}>Status</th>
                  <th className={TH}>Move to</th>
                </tr>
              </thead>
              <tbody>
                {orders === null ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-[13px] text-[#64748B]">Loading orders…</td>
                  </tr>
                ) : visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-[13px] text-[#64748B]">No orders match these filters.</td>
                  </tr>
                ) : (
                  visible.map((o) => (
                    <Fragment key={o.id}>
                      <tr className={o.status === "PAID" ? "bg-[#FFF7E6]" : undefined}>
                        <td className={TD}>
                          <button type="button" className="font-bold text-[#1E40AF] hover:underline" onClick={() => setExpanded(expanded === o.id ? null : o.id)}>
                            {o.reference}
                          </button>
                        </td>
                        <td className={`${TD} whitespace-nowrap text-[#475569]`}>
                          {new Date(o.createdAt).toLocaleString("en-AU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className={TD}>
                          <span className="block font-semibold">{o.contactName}</span>
                          <span className="block text-[11px] text-[#64748B]">
                            {o.buyerRole === "INSTALLER" ? "Installer" : "Customer"} · {o.contactEmail}
                          </span>
                        </td>
                        <td className={TD}>
                          <span className="block font-semibold">{o.fulfilment === "PICKUP" ? "Pickup" : "Delivery"} · {o.warehouse.city}</span>
                          {o.fulfilment === "DELIVERY" ? (
                            <span className="block text-[11px] text-[#64748B]">
                              {[o.address.suburb, o.address.state, o.address.postcode].filter(Boolean).join(" ")}
                            </span>
                          ) : null}
                        </td>
                        <td className={`${TD} text-right tabular-nums`}>{o.items.reduce((n, i) => n + i.quantity, 0)}</td>
                        <td className={`${TD} text-right font-semibold tabular-nums`}>{money(o.total, o.currency)}</td>
                        <td className={TD}>
                          <Pill status={o.status} />
                        </td>
                        <td className={TD}>
                          {o.nextStatuses.length ? (
                            <select
                              aria-label={`Move ${o.reference}`}
                              disabled={busy === o.id}
                              value=""
                              onChange={(e) => e.target.value && void move(o, e.target.value as OrderStatus)}
                              className="rounded-md border border-[#E3E8EF] bg-white px-2 py-1 text-[12px]"
                            >
                              <option value="">Choose…</option>
                              {o.nextStatuses
                                .filter((s) => o.fulfilment === "DELIVERY" || s !== "DISPATCHED")
                                .filter((s) => o.fulfilment === "PICKUP" || s !== "READY_FOR_PICKUP")
                                .map((s) => (
                                  <option key={s} value={s}>
                                    {ORDER_STATUS_LABEL[s]}
                                  </option>
                                ))}
                            </select>
                          ) : (
                            <span className="text-[12px] text-[#94A3B8]">—</span>
                          )}
                        </td>
                      </tr>
                      {expanded === o.id ? (
                        <tr>
                          <td colSpan={8} className="border-b border-[#EEF2F6] bg-[#F8FAFC] px-4 py-3">
                            <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
                              <table className="w-full text-[12px]">
                                <tbody>
                                  {o.items.map((i) => (
                                    <tr key={i.id}>
                                      <td className="py-1">
                                        {i.brand ? <span className="text-[#64748B]">{i.brand} </span> : null}
                                        {i.name}
                                        {i.sku ? <span className="text-[#94A3B8]"> · {i.sku}</span> : null}
                                      </td>
                                      <td className="py-1 text-right tabular-nums">×{i.quantity}</td>
                                      <td className="py-1 text-right tabular-nums">{money(i.unitPrice, o.currency)}</td>
                                      <td className="py-1 text-right font-semibold tabular-nums">{money(i.lineTotal, o.currency)}</td>
                                    </tr>
                                  ))}
                                  <tr>
                                    <td colSpan={3} className="pt-2 text-right text-[#64748B]">{o.fulfilment === "PICKUP" ? "Pickup" : "Delivery"}</td>
                                    <td className="pt-2 text-right tabular-nums">{money(o.deliveryFee, o.currency)}</td>
                                  </tr>
                                </tbody>
                              </table>
                              <div className="space-y-1 text-[12px]">
                                {o.contactPhone ? <p><span className="text-[#64748B]">Phone </span>{o.contactPhone}</p> : null}
                                {o.fulfilment === "DELIVERY" ? (
                                  <p>
                                    <span className="text-[#64748B]">Deliver to </span>
                                    {[o.address.line1, o.address.line2, o.address.suburb, o.address.state, o.address.postcode].filter(Boolean).join(", ")}
                                  </p>
                                ) : null}
                                {o.notes ? <p><span className="text-[#64748B]">Notes </span>{o.notes}</p> : null}
                                {o.paidAt ? <p><span className="text-[#64748B]">Paid </span>{new Date(o.paidAt).toLocaleString("en-AU")}</p> : null}
                                {o.payment?.receiptUrl ? (
                                  <a href={o.payment.receiptUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#1E40AF] hover:underline">
                                    Stripe receipt
                                  </a>
                                ) : null}
                              </div>
                            </div>
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function WarehouseSettings({ warehouses, onSaved }: { warehouses: Warehouse[]; onSaved: (w: Warehouse) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {warehouses.map((w) => (
        <WarehouseCard key={w.id} warehouse={w} onSaved={onSaved} />
      ))}
    </div>
  );
}

function WarehouseCard({ warehouse, onSaved }: { warehouse: Warehouse; onSaved: (w: Warehouse) => void }) {
  const [address, setAddress] = useState(warehouse.address ?? "");
  const [pickupHours, setPickupHours] = useState(warehouse.pickupHours ?? "");
  const [deliveryFee, setDeliveryFee] = useState(String(warehouse.deliveryFee));
  const [pickupEnabled, setPickupEnabled] = useState(warehouse.pickupEnabled);
  const [deliveryEnabled, setDeliveryEnabled] = useState(warehouse.deliveryEnabled);
  const [active, setActive] = useState(warehouse.active);
  const [saving, setSaving] = useState(false);
  const input = "w-full rounded-md border border-[#E3E8EF] px-2 py-1.5 text-[13px]";

  async function save() {
    const fee = Number(deliveryFee);
    if (!Number.isFinite(fee) || fee < 0) {
      toast.error("Delivery fee must be 0 or more.");
      return;
    }
    setSaving(true);
    try {
      const w = await updateWarehouse(warehouse.id, {
        address: address.trim() || null,
        pickupHours: pickupHours.trim() || null,
        deliveryFee: fee,
        pickupEnabled,
        deliveryEnabled,
        active,
      });
      onSaved(w);
      toast.success(`${w.city} saved`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-xl border border-[#E3E8EF] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[15px] font-bold">
          {warehouse.city} <span className="text-[12px] font-medium text-[#64748B]">{warehouse.state} · {warehouse.code}</span>
        </p>
        <label className="flex items-center gap-1.5 text-[12px]">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
      </div>
      <div className="space-y-2">
        <label className="block text-[12px] font-semibold text-[#475569]">
          Pickup address
          <input className={input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street, suburb" />
        </label>
        <label className="block text-[12px] font-semibold text-[#475569]">
          Pickup hours
          <input className={input} value={pickupHours} onChange={(e) => setPickupHours(e.target.value)} placeholder="Mon–Fri 8am–4pm" />
        </label>
        <label className="block text-[12px] font-semibold text-[#475569]">
          Delivery fee per order (AUD incl. GST, 0 = included)
          <input className={input} inputMode="decimal" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
        </label>
        <div className="flex gap-4 text-[12px]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={pickupEnabled} onChange={(e) => setPickupEnabled(e.target.checked)} /> Pickup
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={deliveryEnabled} onChange={(e) => setDeliveryEnabled(e.target.checked)} /> Delivery
          </label>
        </div>
        <p className="text-[11px] text-[#64748B]">Suggested for deliveries to {warehouse.servesStates.join(", ") || "—"}.</p>
      </div>
      <button
        type="button"
        onClick={() => void save()}
        disabled={saving}
        className="mt-3 w-full rounded-md bg-[#0F172A] py-2 text-[13px] font-semibold text-white disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
