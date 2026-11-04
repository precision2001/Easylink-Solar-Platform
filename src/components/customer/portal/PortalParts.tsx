import Link from "next/link";
import type { ReactNode } from "react";
import { PortalIcon, type PortalIconName } from "@/components/customer/portal/PortalIcon";
import type { JourneyMilestone } from "@/lib/project-journey";

/** Building blocks shared by every customer portal screen. */

export function Panel({
  title,
  meta,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`flex flex-col gap-4 rounded-[20px] border border-[#E2E8F0] bg-white p-5 sm:p-6 ${className}`}>
      {title || meta ? (
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          {title ? <h2 className="m-0 text-[17px] font-bold text-[#0F172A]">{title}</h2> : null}
          {meta ? <span className="text-[13px] text-[#5B6B80]">{meta}</span> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "plain" }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "plain" | "good" }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 rounded-[14px] bg-[#F4F6FA] px-3.5 py-3">
      <span className="text-[12.5px] text-[#5B6B80]">{label}</span>
      <span className={`truncate text-[20px] font-bold tabular-nums ${tone === "good" ? "text-[#15803D]" : "text-[#0F172A]"}`}>{value}</span>
      {hint ? <span className="truncate text-[12px] text-[#5B6B80]">{hint}</span> : null}
    </div>
  );
}

export function ButtonLink({
  href,
  children,
  variant = "primary",
  icon,
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "dark" | "quiet" | "ghost-dark";
  icon?: PortalIconName;
}) {
  const styles = {
    primary: "bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F]",
    dark: "bg-[#0B1A2E] text-white hover:bg-[#16304F]",
    quiet: "border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]",
    "ghost-dark": "border border-[#3E5A80] text-white hover:bg-white/[0.06]",
  }[variant];
  return (
    <Link
      href={href}
      className={`inline-flex min-h-[46px] items-center gap-2 rounded-[13px] px-[18px] text-[14.5px] font-bold no-underline transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] ${styles}`}
    >
      {children}
      {icon ? <PortalIcon name={icon} size={18} /> : null}
    </Link>
  );
}

/** The journey as a row of steps; wraps on small screens. */
export function JourneySteps({ milestones }: { milestones: Pick<JourneyMilestone, "key" | "label" | "state" | "completedAt">[] }) {
  return (
    <ol className="m-0 grid list-none grid-cols-2 gap-2.5 p-0 sm:grid-cols-[repeat(auto-fit,minmax(128px,1fr))]">
      {milestones.map((m) => {
        const done = m.state === "completed";
        const now = m.state === "current";
        return (
          <li
            key={m.key}
            aria-current={now ? "step" : undefined}
            className={`flex flex-col gap-1.5 rounded-[14px] border p-3 ${
              now ? "border-[#F68A0A] bg-[#FFF4D6]" : done ? "border-[#BBF7D0] bg-[#ECFDF3]" : "border-[#E2E8F0] bg-[#F8FAFC]"
            }`}
          >
            <span className={`flex items-center gap-1 text-[12px] font-bold ${now ? "text-[#7A3E00]" : done ? "text-[#15803D]" : "text-[#5B6B80]"}`}>
              {done ? <PortalIcon name="check" size={14} /> : null}
              {done ? "Done" : now ? "You are here" : "Coming up"}
            </span>
            <span className="text-[14px] font-bold leading-[1.3] text-[#0F172A]">{m.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function EmptyNote({ icon, title, children }: { icon: PortalIconName; title: string; children?: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-[14px] bg-[#F4F6FA] p-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-[#0B1A2E]">
        <PortalIcon name={icon} size={20} />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="m-0 text-[14.5px] font-bold text-[#0F172A]">{title}</p>
        {children ? <div className="text-[13.5px] leading-[1.5] text-[#475569]">{children}</div> : null}
      </div>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-[14px] bg-[#E8EDF3] motion-reduce:animate-none ${className}`} />;
}
