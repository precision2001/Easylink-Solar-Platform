"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Side-menu preferences shared by the Operations and Installer portals:
 * - collapse to icons (remembered in this browser), and
 * - each person's sections in order of their own use, most used at the top.
 *   Every visit to a section is counted; the backend works out the order
 *   again every week for every person (see the nav-usage module).
 */

export type MenuPortal = "admin" | "installer";

const API: Record<MenuPortal, string> = {
  admin: "/api/admin/nav-usage",
  installer: "/api/installers/nav-usage",
};

const orderCache: Partial<Record<MenuPortal, string[]>> = {};
const orderLoads: Partial<Record<MenuPortal, Promise<string[]>>> = {};

function loadOrder(portal: MenuPortal): Promise<string[]> {
  const cached = orderCache[portal];
  if (cached) return Promise.resolve(cached);
  orderLoads[portal] ??= fetch(`${API[portal]}/order?portal=${portal}`, { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((j: { data?: { sections?: unknown } } | null) => {
      const s = j?.data?.sections;
      const order = Array.isArray(s) ? s.filter((x): x is string => typeof x === "string") : [];
      orderCache[portal] = order;
      return order;
    })
    .catch(() => {
      delete orderLoads[portal];
      return [];
    });
  return orderLoads[portal];
}

/** This person's section order (titles, most used first); empty until known. */
export function useMenuOrder(portal: MenuPortal): string[] {
  const [order, setOrder] = useState<string[]>(() => orderCache[portal] ?? []);
  useEffect(() => {
    let live = true;
    void loadOrder(portal).then((o) => {
      if (live) setOrder(o);
    });
    return () => {
      live = false;
    };
  }, [portal]);
  return order;
}

/**
 * Sections in this person's order. The first, untitled group (Overview and
 * the like) stays at the top; sections not used yet keep their usual order
 * after the used ones.
 */
export function orderGroups<T extends { title: string }>(groups: T[], order: string[]): T[] {
  if (!order.length) return groups;
  const rank = new Map(order.map((t, i) => [t, i]));
  const pinned = groups.filter((g) => !g.title);
  const rest = groups
    .filter((g) => g.title)
    .map((g, i) => ({ g, i, r: rank.get(g.title) ?? Number.POSITIVE_INFINITY }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .map((x) => x.g);
  return [...pinned, ...rest];
}

/** Counts one visit to `section` each time the page changes. */
export function useMenuTracking(portal: MenuPortal, section: string | undefined, pageKey: string | null | undefined) {
  useEffect(() => {
    if (!section) return;
    const t = setTimeout(() => {
      void fetch(`${API[portal]}/use`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portal, section }),
        keepalive: true,
      }).catch(() => undefined);
    }, 1500);
    return () => clearTimeout(t);
  }, [portal, section, pageKey]);
}

const COLLAPSE_KEY = (p: MenuPortal) => `easylink.menu.collapsed.${p}`;

/** Collapsed-to-icons state for the large-screen menu, remembered in this browser. */
export function useMenuCollapsed(portal: MenuPortal): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    let saved = false;
    try {
      saved = window.localStorage.getItem(COLLAPSE_KEY(portal)) === "1";
    } catch {
      /* storage unavailable */
    }
    if (!saved) return;
    const t = setTimeout(() => setCollapsed(true), 0);
    return () => clearTimeout(t);
  }, [portal]);
  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(COLLAPSE_KEY(portal), next ? "1" : "0");
      } catch {
        /* storage unavailable */
      }
      return next;
    });
  }, [portal]);
  return [collapsed, toggle];
}
