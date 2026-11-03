"use client";

import { useCallback, useEffect, useState } from "react";

import { SAMPLE_PRICE_BOOK, type PriceBook } from "@/lib/pricing/quote-engine";

/**
 * Master portal (admin sign-in): the live price book from the backend pricing
 * engine v2 — GET/PUT /api/admin/pricing/price-book.
 *
 * `source`:
 *  - "database": a book saved from the Master portal;
 *  - "default": the backend's built-in book (the Oct 2026 supplier prices),
 *    because none has been saved yet;
 *  - "sample": the backend couldn't be reached (or you're not signed in as an
 *    admin), so the placeholder book is shown and saving is disabled.
 */
export type PriceBookSource = "database" | "default" | "sample";

type Envelope = { data?: { book: PriceBook; updatedAt: string | null; source: "database" | "default" }; message?: string };

export function useAdminPriceBook() {
  const [book, setBook] = useState<PriceBook>(SAMPLE_PRICE_BOOK);
  const [source, setSource] = useState<PriceBookSource>("sample");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/pricing/price-book", { cache: "no-store" });
      const body = (await res.json().catch(() => null)) as Envelope | null;
      if (!res.ok || !body?.data?.book) throw new Error(body?.message || `Couldn't load the price book (${res.status}).`);
      setBook(body.data.book);
      setSource(body.data.source);
      setUpdatedAt(body.data.updatedAt);
      setError("");
      return body.data.book;
    } catch (e) {
      setBook(SAMPLE_PRICE_BOOK);
      setSource("sample");
      setUpdatedAt(null);
      setError(e instanceof Error ? e.message : "Couldn't load the price book.");
      return SAMPLE_PRICE_BOOK;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  /** Saves the whole book; the website's customer prices use it straight away. */
  const save = useCallback(async (next: PriceBook) => {
    const res = await fetch("/api/admin/pricing/price-book", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(next),
    });
    const body = (await res.json().catch(() => null)) as (Envelope & { errors?: unknown }) | null;
    if (!res.ok || !body?.data?.book) {
      throw new Error(body?.message || `Couldn't save the price book (${res.status}).`);
    }
    setBook(body.data.book);
    setSource(body.data.source);
    setUpdatedAt(body.data.updatedAt);
    return body.data;
  }, []);

  return { book, source, updatedAt, loading, error, reload: load, save };
}

/** "Live price book · saved 29/10/2026, 1:05 pm" style label. */
export function priceBookLabel(source: PriceBookSource, updatedAt: string | null, loading: boolean): string {
  if (loading) return "Loading price book…";
  if (source === "database" && updatedAt) {
    return `Live price book · saved ${new Date(updatedAt).toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" })}`;
  }
  if (source === "default") return "Live price book · Oct 2026 supplier prices";
  return "Sample prices (not live)";
}
