"use client";

import { useSyncExternalStore } from "react";

/**
 * The shopping cart, shared by the public website and both portals (they are
 * one origin, so one localStorage key). It holds only what is needed to show
 * the cart before the server prices it: the server re-prices every line from
 * the database at /api/orders/quote and again at checkout, so a stale or
 * edited price here can never change what anyone pays.
 */
export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  brand?: string | null;
  category?: string | null;
  /** Display-only snapshot; the quote endpoint is authoritative. */
  price?: number | null;
  imageUrl?: string | null;
};

export type CartState = { lines: CartLine[]; drawerOpen: boolean };

const STORAGE_KEY = "easylink.cart.v1";
const MAX_QTY = 999;
/** Mirrors the backend's MAX_CART_LINES. */
export const MAX_CART_LINES = 50;

let state: CartState = { lines: [], drawerOpen: false };
let loaded = false;
const listeners = new Set<() => void>();

function readStorage(): CartLine[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { lines?: unknown };
    if (!Array.isArray(parsed.lines)) return [];
    return parsed.lines
      .filter(
        (l): l is CartLine =>
          !!l &&
          typeof (l as CartLine).productId === "string" &&
          typeof (l as CartLine).name === "string" &&
          Number.isInteger((l as CartLine).quantity) &&
          (l as CartLine).quantity > 0,
      )
      .slice(0, MAX_CART_LINES);
  } catch {
    return [];
  }
}

function writeStorage(lines: CartLine[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ lines }));
  } catch {
    // Private mode or storage full: the cart still works for this page view.
  }
}

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  state = { ...state, lines: readStorage() };
  // Keep tabs in step: adding in the portal updates the website header too.
  window.addEventListener("storage", (e) => {
    if (e.key !== STORAGE_KEY) return;
    state = { ...state, lines: readStorage() };
    emit();
  });
}

function emit() {
  for (const l of listeners) l();
}

function setLines(lines: CartLine[], extra?: Partial<CartState>) {
  state = { ...state, ...extra, lines };
  writeStorage(lines);
  emit();
}

function subscribe(listener: () => void) {
  ensureLoaded();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: CartState = { lines: [], drawerOpen: false };

function getSnapshot(): CartState {
  ensureLoaded();
  return state;
}

export function useCart() {
  const cart = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY);
  const count = cart.lines.reduce((n, l) => n + l.quantity, 0);
  const subtotal = cart.lines.reduce((s, l) => s + (l.price ?? 0) * l.quantity, 0);
  return { ...cart, count, subtotal };
}

export const cart = {
  /** Adds (or tops up) a product. Returns false when the cart is full. */
  add(line: CartLine, opts: { openDrawer?: boolean } = {}): boolean {
    ensureLoaded();
    const qty = Math.max(1, Math.min(MAX_QTY, Math.floor(line.quantity || 1)));
    const existing = state.lines.find((l) => l.productId === line.productId);
    let lines: CartLine[];
    if (existing) {
      lines = state.lines.map((l) =>
        l.productId === line.productId
          ? { ...l, ...line, quantity: Math.min(MAX_QTY, l.quantity + qty) }
          : l,
      );
    } else {
      if (state.lines.length >= MAX_CART_LINES) return false;
      lines = [...state.lines, { ...line, quantity: qty }];
    }
    setLines(lines, opts.openDrawer === false ? undefined : { drawerOpen: true });
    return true;
  },
  setQuantity(productId: string, quantity: number) {
    ensureLoaded();
    const q = Math.floor(quantity);
    if (!(q > 0)) return cart.remove(productId);
    setLines(state.lines.map((l) => (l.productId === productId ? { ...l, quantity: Math.min(MAX_QTY, q) } : l)));
  },
  remove(productId: string) {
    ensureLoaded();
    setLines(state.lines.filter((l) => l.productId !== productId));
  },
  /** Applies server prices/names so the drawer shows what checkout will charge. */
  refresh(updates: { productId: string; price: number; name?: string; imageUrl?: string | null }[]) {
    ensureLoaded();
    const byId = new Map(updates.map((u) => [u.productId, u]));
    const lines = state.lines.map((l) => {
      const u = byId.get(l.productId);
      return u ? { ...l, price: u.price, name: u.name ?? l.name, imageUrl: u.imageUrl ?? l.imageUrl } : l;
    });
    setLines(lines);
  },
  clear() {
    ensureLoaded();
    setLines([]);
  },
  open() {
    ensureLoaded();
    state = { ...state, drawerOpen: true };
    emit();
  },
  close() {
    state = { ...state, drawerOpen: false };
    emit();
  },
};
