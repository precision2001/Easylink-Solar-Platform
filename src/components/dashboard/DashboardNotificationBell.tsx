"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import { dashboardNotificationHref } from "@/lib/notifications/hrefs";
import type { DashboardNotificationItem } from "@/lib/notifications/types";
import {
  useDashboardNotifications,
  type DashboardNotificationMode,
} from "@/lib/notifications/useDashboardNotifications";
import {
  useDashboardNotificationsContextOptional,
} from "@/components/dashboard/DashboardNotificationsProvider";

function formatNotifTime(iso: string) {
  const d = new Date(iso);
  const diffMs = Date.now() - d.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function NotificationRow({
  item,
  portal,
  onMarkRead,
  onNavigate,
  busy,
}: {
  item: DashboardNotificationItem;
  portal: DashboardNotificationMode;
  onMarkRead: (id: string) => Promise<void>;
  onNavigate: () => void;
  busy: boolean;
}) {
  const unread = item.readAt == null;
  const href = dashboardNotificationHref(portal, item.entityType, item.entityId, item.type);

  return (
    <li
      className={
        unread
          ? "border-l-2 border-navy-800 bg-cream-50/80"
          : "border-l-2 border-transparent"
      }
    >
      <div className="flex gap-2 px-3 py-2.5">
        <div className="min-w-0 flex-1">
          {href ? (
            <Link
              href={href}
              onClick={() => {
                onNavigate();
                if (unread) void onMarkRead(item.id);
              }}
              className="font-inter text-[13px] font-semibold text-warm-ink underline-offset-2 hover:underline"
            >
              {item.title}
            </Link>
          ) : (
            <p className="font-inter text-[13px] font-semibold text-warm-ink">
              {item.title}
            </p>
          )}
          <p className="mt-0.5 line-clamp-2 font-inter text-[12px] leading-snug text-warm-gray">
            {item.body}
          </p>
          <p className="mt-1 font-inter text-[11px] text-warm-gray/90">
            {formatNotifTime(item.createdAt)}
          </p>
        </div>
        {unread ? (
          <button
            type="button"
            disabled={busy}
            aria-label="Mark notification as read"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-warm-gray hover:bg-black/5 hover:text-warm-ink disabled:opacity-50"
            onClick={() => void onMarkRead(item.id)}
          >
            <Icon name="Check" className="size-4" />
          </button>
        ) : null}
      </div>
    </li>
  );
}

export type DashboardNotificationBellProps = {
  /** `preview` = no API (e.g. master dashboard without auth). */
  mode: DashboardNotificationMode | "preview";
  /** Styling for the bell control (e.g. master header dark theme). */
  bellButtonClassName?: string;
  /** Icon sizing / color (defaults for light headers). */
  bellIconClassName?: string;
  /** Optional message when `mode` is `preview`. */
  previewMessage?: string;
};

const DEFAULT_PREVIEW =
  "Account notifications are not connected on this dashboard. Use the installer or customer portal while signed in to see alerts.";

export function DashboardNotificationBell({
  mode,
  bellButtonClassName,
  bellIconClassName = "size-[18px] customer-nav-muted",
  previewMessage = DEFAULT_PREVIEW,
}: DashboardNotificationBellProps) {
  const reactId = useId();
  const panelDomId = `notifications-panel-${reactId}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markAllBusy, setMarkAllBusy] = useState(false);

  const live = mode !== "preview";
  const apiMode: DashboardNotificationMode =
    mode === "customer" ? "customer" : mode === "admin" ? "admin" : "installer";
  const portal: DashboardNotificationMode = apiMode;

  const shared = useDashboardNotificationsContextOptional();
  const local = useDashboardNotifications(apiMode, {
    enabled: live && shared == null,
    polling: live && shared == null,
  });
  const {
    items,
    unreadCount,
    isLoading,
    error,
    refetchIfStale,
    markRead,
    markAllRead,
  } = shared ?? local;

  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [panelOpen]);

  const handleMarkRead = useCallback(
    async (id: string) => {
      if (!live) return;
      setPendingId(id);
      try {
        await markRead(id);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not mark as read");
      } finally {
        setPendingId(null);
      }
    },
    [live, markRead],
  );

  const handleMarkAllRead = useCallback(async () => {
    if (!live || unreadCount === 0) return;
    setMarkAllBusy(true);
    try {
      await markAllRead();
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Could not mark all as read",
      );
    } finally {
      setMarkAllBusy(false);
    }
  }, [live, markAllRead, unreadCount]);

  const togglePanel = useCallback(() => {
    setPanelOpen((open) => {
      const next = !open;
      if (next && live) void refetchIfStale();
      return next;
    });
  }, [live, refetchIfStale]);

  const defaultBell =
    "relative flex size-8 items-center justify-center rounded-full hover:bg-white/5 customer-text-on-dark";

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={panelOpen}
        aria-controls={panelDomId}
        className={bellButtonClassName ?? defaultBell}
        onClick={togglePanel}
      >
        <Icon name="Bell" className={bellIconClassName} />
        {live && unreadCount > 0 ? (
          <span className="absolute right-0 top-0 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-danger px-0.5 font-inter text-[8px] font-bold leading-3 text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>
      {panelOpen ? (
        <div
          id={panelDomId}
          role="region"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+4px)] z-50 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-lg border border-warm-border bg-white shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-warm-border px-3 py-2">
            <p className="font-inter text-[13px] font-semibold text-warm-ink">
              Notifications
            </p>
            {live ? (
              <button
                type="button"
                disabled={unreadCount === 0 || markAllBusy}
                onClick={() => void handleMarkAllRead()}
                className="font-inter text-[11px] font-medium text-navy-800 hover:underline disabled:pointer-events-none disabled:opacity-40"
              >
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="max-h-[min(24rem,70vh)] overflow-y-auto">
            {!live ? (
              <p className="px-3 py-6 text-center font-inter text-[13px] leading-snug text-warm-gray">
                {previewMessage}
              </p>
            ) : isLoading ? (
              <p className="px-3 py-6 text-center font-inter text-[13px] text-warm-gray">
                Loading…
              </p>
            ) : error ? (
              <p className="px-3 py-6 text-center font-inter text-[13px] text-danger">
                {error}
              </p>
            ) : items.length === 0 ? (
              <p className="px-3 py-6 text-center font-inter text-[13px] text-warm-gray">
                No notifications yet.
              </p>
            ) : (
              <ul className="divide-y divide-warm-border/60">
                {items.map((item) => (
                  <NotificationRow
                    key={item.id}
                    item={item}
                    portal={portal}
                    onMarkRead={handleMarkRead}
                    onNavigate={() => setPanelOpen(false)}
                    busy={pendingId === item.id}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
