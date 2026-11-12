"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePortalNotificationSocket } from "@/hooks/usePortalNotificationSocket";
import {
  fetchDashboardNotifications,
  markAllDashboardNotificationsRead,
  markDashboardNotificationRead,
} from "@/lib/notifications/client";
import type { DashboardNotificationItem } from "@/lib/notifications/types";
import { fetchWithCustomerSession } from "@/lib/customers/customer-fetch-client";
import { fetchWithInstallerSession } from "@/lib/installers/installer-fetch-client";

/** HTTP poll interval only when WebSocket is unavailable. */
const FALLBACK_POLL_MS = 60_000;
/** Refetch when opening the bell if the list is older than this. */
const STALE_MS = 5 * 60_000;

/** "admin": EasyLink staff in the Master portal (admin session). */
export type DashboardNotificationMode = "installer" | "customer" | "admin";

/** Master portal requests carry the admin session cookie. */
const fetchWithAdminSession = (input: RequestInfo | URL, init?: RequestInit) =>
  fetch(input, { ...init, credentials: init?.credentials ?? "include" });

function countUnread(rows: DashboardNotificationItem[]) {
  return rows.filter((n) => n.readAt == null).length;
}

function modeConfig(mode: DashboardNotificationMode) {
  if (mode === "customer") {
    return {
      apiBase: "/api/customers/notifications",
      fetchSession: fetchWithCustomerSession,
    } as const;
  }
  if (mode === "admin") {
    return {
      apiBase: "/api/admin/notifications",
      fetchSession: fetchWithAdminSession,
    } as const;
  }
  return {
    apiBase: "/api/installers/notifications",
    fetchSession: fetchWithInstallerSession,
  } as const;
}

export function useDashboardNotifications(
  mode: DashboardNotificationMode,
  options?: { limit?: number; polling?: boolean; enabled?: boolean },
) {
  const limit = options?.limit ?? 50;
  const polling = options?.polling ?? true;
  const enabled = options?.enabled ?? true;
  const { apiBase, fetchSession } = modeConfig(mode);

  const [items, setItems] = useState<DashboardNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const lastFetchedAtRef = useRef<number | null>(null);
  const prevWsStateRef = useRef<string | null>(null);
  const hadWsOpenRef = useRef(false);
  const loadInFlightRef = useRef(false);

  const mergePushRef = useRef<(item: DashboardNotificationItem) => void>(
    () => {},
  );

  mergePushRef.current = (item: DashboardNotificationItem) => {
    setItems((prev) => {
      if (prev.some((n) => n.id === item.id)) return prev;
      const next = [item, ...prev];
      return next.slice(0, limit);
    });
    setUnreadCount((c) => (item.readAt == null ? c + 1 : c));
  };

  // No socket for the admin session (HTTP polling instead).
  const { wsState } = usePortalNotificationSocket({
    portal: mode === "admin" ? "installer" : mode,
    enabled: enabled && mode !== "admin",
    onNotification: (item) => mergePushRef.current(item),
  });

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!enabled) return;
      if (!opts?.silent) setIsLoading(true);
      setError(null);
      loadInFlightRef.current = true;
      try {
        const r = await fetchDashboardNotifications(
          apiBase,
          fetchSession,
          { limit, unreadOnly: false },
        );
        setItems(r.items);
        setUnreadCount(r.unreadCount);
        lastFetchedAtRef.current = Date.now();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
        if (!opts?.silent) {
          setItems([]);
          setUnreadCount(0);
        }
      } finally {
        loadInFlightRef.current = false;
        if (!opts?.silent) setIsLoading(false);
      }
    },
    [apiBase, enabled, fetchSession, limit],
  );

  const refetchIfStale = useCallback(
    async (maxAgeMs = STALE_MS) => {
      if (wsState === "open") return;
      const last = lastFetchedAtRef.current;
      if (last == null || Date.now() - last > maxAgeMs) {
        await load({ silent: true });
      }
    },
    [load, wsState],
  );

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setItems([]);
      setUnreadCount(0);
      setError(null);
      lastFetchedAtRef.current = null;
      return;
    }
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled || !polling) return;
    if (wsState === "open" || wsState === "connecting") return;

    const id = window.setInterval(
      () => void load({ silent: true }),
      FALLBACK_POLL_MS,
    );
    return () => window.clearInterval(id);
  }, [enabled, load, polling, wsState]);

  useEffect(() => {
    if (!enabled) return;
    const prev = prevWsStateRef.current;
    if (prev !== "open" && wsState === "open") {
      if (hadWsOpenRef.current && !loadInFlightRef.current) {
        const last = lastFetchedAtRef.current;
        if (last == null || Date.now() - last > 5_000) {
          void load({ silent: true });
        }
      } else {
        hadWsOpenRef.current = true;
      }
    }
    prevWsStateRef.current = wsState;
  }, [enabled, load, wsState]);

  const markRead = useCallback(
    async (id: string) => {
      if (!enabled) {
        throw new Error("Notifications are disabled");
      }
      const updated = await markDashboardNotificationRead(
        apiBase,
        fetchSession,
        id,
      );
      setItems((prev) => {
        const next = prev.map((n) => (n.id === id ? updated : n));
        setUnreadCount(countUnread(next));
        return next;
      });
      return updated;
    },
    [apiBase, enabled, fetchSession],
  );

  const markAllRead = useCallback(async () => {
    if (!enabled) {
      throw new Error("Notifications are disabled");
    }
    await markAllDashboardNotificationsRead(apiBase, fetchSession);
    setItems((prev) => {
      const now = new Date().toISOString();
      const next = prev.map((n) => (n.readAt ? n : { ...n, readAt: now }));
      setUnreadCount(0);
      return next;
    });
  }, [apiBase, enabled, fetchSession]);

  return {
    items,
    unreadCount,
    isLoading,
    error,
    refetch: load,
    refetchIfStale,
    wsState,
    markRead,
    markAllRead,
  };
}
