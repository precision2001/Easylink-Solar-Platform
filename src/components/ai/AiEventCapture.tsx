"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

/**
 * Browser event capture for the website and portals (spec 3.6). The UI does not
 * decide which events exist: this listens at the document level, so every page,
 * old or new, reports page views, clicks on buttons and links, form submits and
 * front-end errors without any per-screen code. Never sends what people type.
 *
 * Optional markup hints make events richer, e.g.
 *   <button data-ai-cta="book_consult">   → cta.clicked { cta: "book_consult" }
 *   <section data-ai-subject="lead:ld_1"> → subject of events inside it
 */
type Evt = { type: string; subject?: { type: string; id: string }; data: Record<string, unknown> };

const ENDPOINT = "/api/ai/events";
const FLUSH_MS = 4000;

function subjectFrom(el: Element | null): Evt["subject"] {
  const host = el?.closest("[data-ai-subject]");
  const raw = host?.getAttribute("data-ai-subject");
  if (!raw || !raw.includes(":")) return undefined;
  const [type, id] = raw.split(":");
  return type && id ? { type, id } : undefined;
}

function label(el: Element): string {
  const a = el.getAttribute("aria-label") ?? el.getAttribute("data-ai-cta") ?? (el.textContent ?? "");
  return a.replace(/\s+/g, " ").trim().slice(0, 80);
}

export function AiEventCapture() {
  const pathname = usePathname();
  const queue = useRef<Evt[]>([]);
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (typeof navigator !== "undefined" && (navigator.doNotTrack === "1" || (navigator as { globalPrivacyControl?: boolean }).globalPrivacyControl)) return;

    const flush = (useBeacon = false) => {
      if (!queue.current.length) return;
      const batch = queue.current.splice(0, 50);
      const body = JSON.stringify({ events: batch });
      if (useBeacon && navigator.sendBeacon) navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      else void fetch(ENDPOINT, { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => undefined);
    };
    const push = (e: Evt) => {
      queue.current.push(e);
      if (queue.current.length >= 20) flush();
    };

    const onClick = (ev: MouseEvent) => {
      const el = (ev.target as Element | null)?.closest("button, a, [role=button], [data-ai-cta]");
      if (!el) return;
      const cta = el.getAttribute("data-ai-cta");
      push({
        type: cta ? "cta.clicked" : "ui.interacted",
        subject: subjectFrom(el),
        data: { path: location.pathname, element: el.tagName.toLowerCase(), label: label(el), ...(cta ? { cta } : {}), href: el instanceof HTMLAnchorElement ? el.getAttribute("href") : undefined },
      });
    };
    const onSubmit = (ev: SubmitEvent) => {
      const form = ev.target as HTMLFormElement;
      // Field names only, never values.
      const fields = Array.from(form.elements)
        .map((x) => (x as HTMLInputElement).name)
        .filter(Boolean)
        .slice(0, 30);
      push({ type: "form.submitted", subject: subjectFrom(form), data: { path: location.pathname, form: form.getAttribute("name") ?? form.id ?? form.getAttribute("aria-label") ?? "form", fields } });
    };
    const onError = (ev: ErrorEvent) => {
      push({ type: "ui.error_seen", data: { path: location.pathname, message: String(ev.message).slice(0, 200) } });
    };
    const onHide = () => {
      if (document.visibilityState === "hidden") flush(true);
    };

    document.addEventListener("click", onClick, { capture: true, passive: true });
    document.addEventListener("submit", onSubmit, { capture: true });
    window.addEventListener("error", onError);
    document.addEventListener("visibilitychange", onHide);
    const t = setInterval(() => flush(), FLUSH_MS);
    return () => {
      document.removeEventListener("click", onClick, { capture: true });
      document.removeEventListener("submit", onSubmit, { capture: true });
      window.removeEventListener("error", onError);
      document.removeEventListener("visibilitychange", onHide);
      clearInterval(t);
      flush(true);
    };
  }, []);

  useEffect(() => {
    if (!pathname || pathname === lastPath.current) return;
    lastPath.current = pathname;
    queue.current.push({
      type: pathname.includes("pricing") || pathname.includes("/products") ? "price.viewed" : "page.viewed",
      data: { path: pathname, referrer: typeof document !== "undefined" ? document.referrer.slice(0, 200) : "" },
    });
  }, [pathname]);

  return null;
}
