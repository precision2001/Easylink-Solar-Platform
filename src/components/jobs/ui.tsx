"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AiNotConnectedError, type AiPortal } from "@/lib/ai-platform/client";
import { jobs, type JobView } from "@/lib/ai-platform/jobs";

/** Small shared pieces for the job screens: same look as the project workspace. */
export const ink = "#0F172A";
export const quiet = "#475569";
export const accent = "#0B4A7A";

export function Card({ title, aside, children, tone }: { title?: ReactNode; aside?: ReactNode; children: ReactNode; tone?: "warn" | "good" }) {
  const border = tone === "warn" ? "#F5C77E" : tone === "good" ? "#A7E3BD" : "#E3E8EF";
  return (
    <section className="flex min-w-0 flex-col gap-3 rounded-[14px] border bg-white p-4" style={{ borderColor: border }}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {title ? <h3 className="m-0 font-source-sans text-[17px] font-bold text-[#0F172A]">{title}</h3> : <span />}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({ children, onClick, kind = "primary", disabled, type = "button", small }: { children: ReactNode; onClick?: () => void; kind?: "primary" | "secondary" | "danger" | "ghost"; disabled?: boolean; type?: "button" | "submit"; small?: boolean }) {
  const styles = {
    primary: "bg-[#0B4A7A] text-white hover:bg-[#093d65]",
    secondary: "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#94A3B8]",
    danger: "border border-[#FCA5A5] bg-white text-[#991B1B] hover:bg-[#FEF2F2]",
    ghost: "text-[#0B4A7A] underline-offset-2 hover:underline",
  }[kind];
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`whitespace-nowrap rounded-[10px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${small ? "px-2.5 py-1 text-[12.5px]" : "px-3.5 py-2 text-[13.5px]"} ${styles}`}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[12.5px] font-semibold text-[#334155]">
      {label}
      {children}
      {hint && <span className="text-[11.5px] font-normal text-[#5B6B80]">{hint}</span>}
    </label>
  );
}

export const inputCls = "w-full min-w-0 rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 py-1.5 text-[14px] font-normal text-[#0F172A] focus:border-[#0B4A7A] focus:outline-none";

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "good" | "warn" | "bad" | "info" }) {
  const c = { neutral: ["#F1F5F9", "#334155"], good: ["#DCFCE7", "#166534"], warn: ["#FEF3C7", "#92400E"], bad: ["#FEE2E2", "#991B1B"], info: ["#E0F2FE", "#075985"] }[tone];
  return <span className="inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11.5px] font-semibold" style={{ background: c[0], color: c[1] }}>{children}</span>;
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(15,23,42,0.55)] p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[16px] bg-white shadow-xl outline-none sm:rounded-[16px] ${wide ? "sm:max-w-[860px]" : "sm:max-w-[560px]"}`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[#E3E8EF] px-4 py-3">
          <h2 className="m-0 font-source-sans text-[17px] font-bold text-[#0F172A]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-full px-2 py-1 text-[18px] leading-none text-[#475569] hover:bg-[#F1F5F9]">×</button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}

/** A generated document (invoice, agreement, STC form) shown exactly as stored, with print to PDF. */
export function DocFrame({ html, title }: { html: string; title: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  return (
    <div className="flex flex-col gap-2">
      <iframe ref={ref} title={title} srcDoc={html} sandbox="allow-modals allow-same-origin" className="h-[60vh] w-full rounded-[10px] border border-[#E3E8EF] bg-white" />
      <div className="flex justify-end">
        <Btn kind="secondary" small onClick={() => ref.current?.contentWindow?.print()}>
          Print or save as PDF
        </Btn>
      </div>
    </div>
  );
}

/** Load a job and run its steps; errors come back as a plain sentence. */
export function useJob(portal: AiPortal, id: string) {
  const [view, setView] = useState<JobView | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "offline" | "denied" | "error">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(
    () =>
      jobs
        .get(portal, id)
        .then((v) => {
          setView(v);
          setState("ready");
        })
        .catch((e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : e instanceof Error && /Not your|403/.test(e.message) ? "denied" : "error")),
    [portal, id],
  );
  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const act = useCallback(
    async <T = Record<string, unknown>,>(action: string, input: Record<string, unknown> = {}, done?: string): Promise<T | null> => {
      setBusy(action);
      setError(null);
      try {
        const r = await jobs.step<T>(portal, id, action, input);
        if (done) setNote(done);
        await load();
        return r;
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work");
        return null;
      } finally {
        setBusy(null);
      }
    },
    [portal, id, load],
  );
  return { view, state, busy, error, note, setNote, setError, act, load };
}
export type JobCtl = ReturnType<typeof useJob>;
