import Image from "next/image";
import Link from "next/link";
import { useId, type ComponentPropsWithRef, type ReactNode, type SVGProps } from "react";

/**
 * Building blocks for the signed-out customer screens (sign in, portal link,
 * the public /customers page). They sit outside CustomerPortalShell but use
 * the same palette, type and icon style so it reads as one product.
 */

/* ------------------------------------------------------------------ icons */

export type AuthIconName = "mail" | "eye" | "eyeOff" | "alert" | "key" | "refresh" | "check";

const PATHS: Record<AuthIconName, string[]> = {
  mail: ["M3 6h18v12H3z", "M3 7l9 6 9-6"],
  eye: ["M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z", "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"],
  eyeOff: ["M3 3l18 18", "M10.6 5.1A10 10 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4", "M6.6 6.6C3.9 8.4 2 12 2 12s3.6 7 10 7a9.6 9.6 0 0 0 5.4-1.6", "M9.9 9.9a3 3 0 0 0 4.2 4.2"],
  alert: ["M12 3l10 18H2z", "M12 10v4", "M12 17.5v.01"],
  key: ["M15 9a4 4 0 1 0-3.9 4.9L9 16v2H7v2H4v-3l6.1-6.1A4 4 0 0 0 15 9z", "M16 8v.01"],
  refresh: ["M20 11a8 8 0 0 0-14.6-4.5L4 8", "M4 4v4h4", "M4 13a8 8 0 0 0 14.6 4.5L20 16", "M20 20v-4h-4"],
  check: ["M5 12.5l4.5 4.5L19 7"],
};

export function AuthIcon({ name, size = 20, ...rest }: { name: AuthIconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

/* ------------------------------------------------------------------ brand */

// Rounded so server and client render identical attributes (no hydration drift).
const r2 = (n: number) => Math.round(n * 100) / 100;
const SUN_RAYS = Array.from({ length: 12 }, (_, i) => {
  const a = (i * Math.PI) / 6;
  return [r2(100 + Math.cos(a) * 50), r2(100 + Math.sin(a) * 50), r2(100 + Math.cos(a) * 82), r2(100 + Math.sin(a) * 82)];
});

/** The rising sun used on navy cards (same drawing as Home's "Next best step"). */
export function SunMotif({ className = "" }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" className={`pointer-events-none ${className}`} viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="34" fill="currentColor" />
      {SUN_RAYS.map(([x1, y1, x2, y2], i) => {
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
          />
        );
      })}
    </svg>
  );
}

/** Logo and name, linking home. `tone="dark"` sits on navy. */
export function BrandLink({ tone = "dark", compact = false }: { tone?: "dark" | "light"; compact?: boolean }) {
  const onNavy = tone === "dark";
  return (
    <Link
      href="/"
      aria-label="EasyLink Solar home"
      className={`inline-flex min-h-[44px] items-center gap-2.5 rounded-[12px] no-underline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        onNavy ? "focus-visible:outline-[#FFE866]" : "focus-visible:outline-[#2563EB]"
      }`}
    >
      <span className={`flex items-center justify-center rounded-[10px] ${compact ? "size-8" : "size-9"} ${onNavy ? "bg-white/10" : "bg-[#0B1A2E]"}`}>
        <Image src="/images/solarDesignLogo.png" alt="" width={compact ? 22 : 26} height={compact ? 22 : 26} />
      </span>
      <span className={`font-source-sans font-extrabold tracking-[-0.01em] ${compact ? "text-[18px]" : "text-[20px]"} ${onNavy ? "text-white" : "text-[#0F172A]"}`}>
        EasyLink<span className={onNavy ? "text-[#FFE866]" : "text-[#F68A0A]"}> Solar</span>
      </span>
    </Link>
  );
}

/* ------------------------------------------------------------------ forms */

export const PRIMARY_BUTTON =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#F68A0A] px-5 text-[15px] font-bold text-[#3B1D00] transition-colors hover:bg-[#FF9A1F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60";

export const DARK_BUTTON =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] bg-[#0B1A2E] px-5 text-[15px] font-bold text-white transition-colors hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60";

export const QUIET_BUTTON =
  "inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-[13px] border border-[#CBD5E1] bg-white px-5 text-[15px] font-bold text-[#0F172A] transition-colors hover:border-[#64748B] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60";

export const TEXT_LINK =
  "inline-flex min-h-[44px] items-center rounded-[6px] text-[14px] font-semibold text-[#1D4ED8] underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]";

type FieldProps = Omit<ComponentPropsWithRef<"input">, "className"> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  /** Control rendered inside the input on the right, e.g. show password. */
  right?: ReactNode;
};

/** Labelled text input with hint and inline error, wired for screen readers. */
export function Field({ label, hint, error, right, id, ...input }: FieldProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={inputId} className="text-[14px] font-semibold text-[#0F172A]">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[errorId, hintId].filter(Boolean).join(" ") || undefined}
          className={`h-12 w-full rounded-[12px] border bg-white px-3.5 text-[16px] text-[#0F172A] placeholder:text-[#8494A9] focus-visible:outline-none focus-visible:ring-4 ${
            right ? "pr-12" : ""
          } ${
            error
              ? "border-[#DC2626] focus-visible:border-[#B91C1C] focus-visible:ring-[#DC2626]/15"
              : "border-[#CBD5E1] hover:border-[#94A3B8] focus-visible:border-[#0B1A2E] focus-visible:ring-[#0B1A2E]/10"
          }`}
          {...input}
        />
        {right ? <div className="absolute inset-y-0 right-0.5 flex items-center">{right}</div> : null}
      </div>
      {error ? (
        <p id={errorId} className="m-0 flex items-start gap-1.5 text-[13.5px] font-medium text-[#991B1B]">
          <AuthIcon name="alert" size={15} className="mt-[2px] shrink-0" />
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="m-0 text-[13px] text-[#5B6B80]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Show / hide toggle for password fields. */
export function RevealButton({ shown, onToggle }: { shown: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={shown ? "Hide password" : "Show password"}
      aria-pressed={shown}
      onClick={onToggle}
      className="flex size-11 items-center justify-center rounded-[10px] text-[#5B6B80] hover:text-[#0F172A] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#2563EB]"
    >
      <AuthIcon name={shown ? "eyeOff" : "eye"} size={19} />
    </button>
  );
}

/** Form-level message. Errors are announced immediately. */
export function Notice({ tone, title, children }: { tone: "error" | "good" | "warn"; title?: string; children?: ReactNode }) {
  const styles = {
    error: "bg-[#FEE2E2] text-[#991B1B]",
    good: "bg-[#ECFDF3] text-[#15803D]",
    warn: "bg-[#FFF4D6] text-[#7A3E00]",
  }[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-[14px] px-4 py-3 text-[14px] leading-[1.5] ${styles}`}>
      <AuthIcon name={tone === "good" ? "check" : "alert"} size={18} className="mt-[2px] shrink-0" />
      <div className="flex min-w-0 flex-col gap-0.5">
        {title ? <p className="m-0 font-bold">{title}</p> : null}
        {children ? <div className="text-[#0F172A]/80">{children}</div> : null}
      </div>
    </div>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none ${className}`}
    />
  );
}
