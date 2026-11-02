import { beforeEach, describe, expect, it, vi } from "vitest";

/** Minimal window + localStorage so the store can persist under the node test env. */
function installWindow() {
  const data = new Map<string, string>();
  const listeners: ((e: { key: string }) => void)[] = [];
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    },
    addEventListener: (_t: string, fn: (e: { key: string }) => void) => listeners.push(fn),
  });
  return data;
}

let store: typeof import("./cart-store");
let data: Map<string, string>;

beforeEach(async () => {
  vi.resetModules();
  data = installWindow();
  store = await import("./cart-store");
});

const line = (id: string, quantity = 1) => ({ productId: id, quantity, name: `Product ${id}`, price: 100 });
const lines = () => JSON.parse(data.get("easylink.cart.v1") ?? '{"lines":[]}').lines as { productId: string; quantity: number }[];

describe("cart store", () => {
  it("adds products, tops up an existing line and persists", () => {
    store.cart.add(line("a", 2));
    store.cart.add(line("b"));
    store.cart.add(line("a", 3));
    expect(lines()).toEqual([
      expect.objectContaining({ productId: "a", quantity: 5 }),
      expect.objectContaining({ productId: "b", quantity: 1 }),
    ]);
  });

  it("sets and clamps quantities, and removes at zero", () => {
    store.cart.add(line("a"));
    store.cart.setQuantity("a", 5000);
    expect(lines()[0].quantity).toBe(999);
    store.cart.setQuantity("a", 0);
    expect(lines()).toEqual([]);
  });

  it("refuses a 51st distinct product", () => {
    for (let i = 0; i < store.MAX_CART_LINES; i++) expect(store.cart.add(line(`p${i}`))).toBe(true);
    expect(store.cart.add(line("one-too-many"))).toBe(false);
    expect(lines()).toHaveLength(store.MAX_CART_LINES);
  });

  it("applies server prices and ignores corrupt storage", async () => {
    store.cart.add(line("a"));
    store.cart.refresh([{ productId: "a", price: 42.5, name: "Server name" }]);
    expect(lines()[0]).toMatchObject({ price: 42.5, name: "Server name" });

    vi.resetModules();
    data = installWindow();
    data.set("easylink.cart.v1", "{not json");
    store = await import("./cart-store");
    store.cart.add(line("b"));
    expect(lines()).toEqual([expect.objectContaining({ productId: "b" })]);
  });
});
