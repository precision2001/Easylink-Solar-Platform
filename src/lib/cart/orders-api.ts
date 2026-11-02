"use client";

import type { CartLine } from "@/lib/cart/cart-store";

type Envelope<T> = { success?: boolean; message?: string; data?: T; errors?: { field: string; message: string }[] };

export type BuyerPortal = "customer" | "installer";
export type Fulfilment = "PICKUP" | "DELIVERY";
export type OrderStatus =
  | "PENDING_PAYMENT"
  | "PAID"
  | "PROCESSING"
  | "READY_FOR_PICKUP"
  | "DISPATCHED"
  | "COMPLETED"
  | "CANCELLED";

export const AU_STATES = ["NSW", "VIC", "QLD", "SA", "WA", "TAS", "ACT", "NT"] as const;
export type AuState = (typeof AU_STATES)[number];

export type Warehouse = {
  id: string;
  code: string;
  city: string;
  state: string;
  address: string | null;
  pickupHours: string | null;
  servesStates: string[];
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFee: number;
  active: boolean;
  sortOrder: number;
};

export type CartQuote = {
  currency: string;
  lines: {
    productId: string;
    name: string;
    brand: string | null;
    category: string;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    priceEstimate: boolean;
  }[];
  unavailable: string[];
  warehouse: Warehouse | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
};

export type Order = {
  id: string;
  number: number;
  reference: string;
  status: OrderStatus;
  buyerRole: "CUSTOMER" | "INSTALLER";
  fulfilment: Fulfilment;
  warehouse: Warehouse;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  address: { line1: string | null; line2: string | null; suburb: string | null; state: string | null; postcode: string | null };
  notes: string | null;
  currency: string;
  subtotal: number;
  deliveryFee: number;
  total: number;
  items: {
    id: string;
    productId: string | null;
    name: string;
    brand: string | null;
    category: string;
    sku: string | null;
    imageUrl: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
  }[];
  payment: { id: string; status: string; receiptUrl: string | null } | null;
  nextStatuses: OrderStatus[];
  paidAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BuyerSession = {
  portal: BuyerPortal;
  user: { firstName?: string; lastName?: string; email?: string; phone?: string | null };
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for pickup",
  DISPATCHED: "Dispatched",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

async function read<T>(res: Response, fallback: string): Promise<T> {
  const json = (await res.json().catch(() => ({}))) as Envelope<T>;
  if (!res.ok || json.data === undefined) {
    const detail = json.errors?.length ? `: ${json.errors.map((e) => `${e.field} ${e.message}`).join(", ")}` : "";
    const err = new Error((json.message || fallback) + detail) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return json.data;
}

export async function fetchWarehouses(): Promise<Warehouse[]> {
  return read<Warehouse[]>(await fetch("/api/orders/warehouses", { cache: "no-store" }), "Could not load warehouses");
}

export async function quoteCart(
  lines: Pick<CartLine, "productId" | "quantity">[],
  opts: { warehouseId?: string; fulfilment?: Fulfilment } = {},
): Promise<CartQuote> {
  const res = await fetch("/api/orders/quote", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })),
      ...opts,
    }),
  });
  return read<CartQuote>(res, "Could not price your cart");
}

const REFRESH_PATH: Record<BuyerPortal, string> = {
  customer: "/api/customers/refresh",
  installer: "/api/installers/refresh",
};

/** Calls a buyer route; on 401 refreshes that portal's session once and retries. */
async function buyerFetch(portal: BuyerPortal, path: string, init?: RequestInit): Promise<Response> {
  const url = `${path}${path.includes("?") ? "&" : "?"}portal=${portal}`;
  const merged: RequestInit = { ...init, credentials: "include" };
  const first = await fetch(url, merged);
  if (first.status !== 401) return first;
  const refreshed = await fetch(REFRESH_PATH[portal], { method: "POST", credentials: "include" }).catch(() => null);
  if (!refreshed?.ok) return first;
  return fetch(url, merged);
}

/**
 * Finds the signed-in buyer: a customer session first, then an installer one.
 * Null when signed in to neither (the cart then offers both sign-ins).
 */
export async function fetchBuyerSession(prefer?: BuyerPortal | null): Promise<BuyerSession | null> {
  const order: BuyerPortal[] = prefer === "installer" ? ["installer", "customer"] : ["customer", "installer"];
  for (const portal of order) {
    const res = await buyerFetch(portal, "/api/orders/session");
    if (res.ok) {
      const user = await read<BuyerSession["user"]>(res, "Could not load your account");
      return { portal, user };
    }
  }
  return null;
}

export type CheckoutForm = {
  warehouseId: string;
  fulfilment: Fulfilment;
  contactName: string;
  contactEmail: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  suburb?: string;
  state?: AuState;
  postcode?: string;
  notes?: string;
};

export async function startCheckout(
  portal: BuyerPortal,
  lines: Pick<CartLine, "productId" | "quantity">[],
  form: CheckoutForm,
): Promise<{ checkoutUrl: string; order: Order }> {
  const res = await buyerFetch(portal, "/api/orders/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ items: lines.map((l) => ({ productId: l.productId, quantity: l.quantity })), ...form }),
  });
  return read(res, "Could not start checkout");
}

export async function fetchMyOrders(portal: BuyerPortal, limit = 20): Promise<Order[]> {
  return read<Order[]>(await buyerFetch(portal, `/api/orders/mine?limit=${limit}`), "Could not load your orders");
}

export async function refreshMyOrder(portal: BuyerPortal, id: string): Promise<Order> {
  return read<Order>(
    await buyerFetch(portal, `/api/orders/mine/${encodeURIComponent(id)}/refresh`, { method: "POST" }),
    "Could not load your order",
  );
}

// ---- Master (operations portal) -------------------------------------------

export async function fetchAllOrders(filters: { status?: OrderStatus; warehouseId?: string; limit?: number } = {}): Promise<Order[]> {
  const sp = new URLSearchParams();
  if (filters.status) sp.set("status", filters.status);
  if (filters.warehouseId) sp.set("warehouseId", filters.warehouseId);
  sp.set("limit", String(filters.limit ?? 100));
  return read<Order[]>(await fetch(`/api/admin/orders?${sp}`, { credentials: "include" }), "Could not load orders");
}

export async function updateOrderStatus(id: string, status: OrderStatus): Promise<Order> {
  return read<Order>(
    await fetch(`/api/admin/orders/${encodeURIComponent(id)}/status`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
    "Could not update the order",
  );
}

export async function fetchAllWarehouses(): Promise<Warehouse[]> {
  return read<Warehouse[]>(await fetch("/api/admin/orders/warehouses", { credentials: "include" }), "Could not load warehouses");
}

export async function updateWarehouse(
  id: string,
  patch: Partial<Pick<Warehouse, "address" | "pickupHours" | "pickupEnabled" | "deliveryEnabled" | "deliveryFee" | "active" | "servesStates">>,
): Promise<Warehouse> {
  return read<Warehouse>(
    await fetch(`/api/admin/orders/warehouses/${encodeURIComponent(id)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }),
    "Could not save the warehouse",
  );
}

/** The warehouse that serves a state by default (NSW → Sydney, WA → Perth…). */
export function nearestWarehouse(warehouses: Warehouse[], state?: string | null): Warehouse | undefined {
  if (!state) return undefined;
  return warehouses.find((w) => w.servesStates.includes(state)) ?? warehouses.find((w) => w.state === state);
}

export const money = (n: number, currency = "AUD") =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency }).format(n);
