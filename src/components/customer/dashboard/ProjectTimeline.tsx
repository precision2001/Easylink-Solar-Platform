"use client";

import type { ReactNode } from "react";
import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import {
  CustomerSectionMetaSkeleton,
  ProjectTimelineStepsSkeleton,
  TimelineInstallerCardSkeleton,
} from "./CustomerDashboardSkeletons";
import type { TimelineStep } from "./types";
import Icon from "../../ui/Icons";

type Props = {
  title?: string;
  /** Index of the current / in-progress step (0-based). Steps before are completed; after are upcoming. */
  activeStepIndex: number;
  steps: readonly Omit<TimelineStep, "state">[];
  /** Footer slot (e.g. installer card). */
  footer?: ReactNode;
  /** Right-aligned header text, e.g. "4 of 9 done". */
  meta?: string;
  loading?: boolean;
  /** Shown instead of the step list when there are no steps. */
  emptyMessage?: string;
};

export function ProjectTimeline({
  title = "Project Timeline",
  activeStepIndex,
  steps,
  footer,
  meta,
  loading = false,
  emptyMessage = "Your installer has not started your project yet.",
}: Props) {
  const resolved: TimelineStep[] = steps.map((s, i) => ({
    ...s,
    state:
      i < activeStepIndex
        ? "completed"
        : i === activeStepIndex
          ? "current"
          : "upcoming",
  }));

  return (
    <section
      aria-busy={loading}
      className="customer-panel-bg customer-panel-border flex h-full min-h-0 flex-col overflow-hidden rounded-[14px] border"
    >
      <CustomerSectionHeader
        variant="dark"
        title={title}
        meta={loading ? <CustomerSectionMetaSkeleton /> : meta}
      />

      <div className="relative flex min-h-0 flex-1 flex-col">
        <div
          className={`customer-panel-scroll flex min-h-0 flex-1 flex-col px-4 pb-4 pt-3 ${
            loading ? "overflow-hidden" : "overflow-y-auto overscroll-y-contain"
          }`}
        >
          {loading ? (
            <ProjectTimelineStepsSkeleton />
          ) : resolved.length === 0 ? (
            <p className="font-dm-sans text-xs customer-text-muted">
              {emptyMessage}
            </p>
          ) : (            <ol className="flex flex-col">
              {resolved.map((step, i) => {
                const isLast = i === resolved.length - 1;
                const segmentGreen = !isLast && i + 1 < activeStepIndex;

                return (
                  <li key={step.id} className="flex gap-3">
                    <div className="flex w-5 shrink-0 flex-col items-center">
                      <TimelineDot state={step.state} />
                      {!isLast ? (
                        <div
                          className={`mt-0.5 min-h-[32px] w-0.5 flex-1 rounded-full ${
                            segmentGreen
                              ? "bg-success"
                              : "bg-customer-border-strong"
                          }`}
                          aria-hidden
                        />
                      ) : null}
                    </div>
                    <div className={`min-w-0 pb-3 ${isLast ? "pb-0" : ""}`}>
                      <p
                        className={`font-dm-sans text-xs font-medium leading-[18px] ${
                          step.state === "completed"
                            ? "customer-text-on-dark"
                            : "customer-text-muted"
                        }`}
                        style={{ fontVariationSettings: "'opsz' 14" }}
                      >
                        {step.title}
                      </p>
                      <p
                        className="mt-1 font-dm-sans text-[10px] font-normal leading-[15px] customer-text-muted"
                        style={{ fontVariationSettings: "'opsz' 9" }}
                      >
                        {step.dateLabel ?? "—"}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        {!loading ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-gradient-to-t from-[var(--color-customer-panel-bg)] to-transparent"
            aria-hidden
          />
        ) : null}
      </div>

      {loading ? (
        <TimelineInstallerCardSkeleton />
      ) : footer ? (
        <div className="shrink-0">{footer}</div>
      ) : null}
    </section>
  );
}

function TimelineDot({ state }: { state: TimelineStep["state"] }) {  if (state === "completed") {
    return (
      <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-success text-white">
        <Icon name="Check" className="size-3 text-white" />
      </div>
    );
  }

  return (
    <div
      className={`size-5 shrink-0 rounded-full border customer-card-border bg-customer-card-bg ${
        state === "current" ? "ring-1 ring-customer-border-strong" : ""
      }`}
      aria-hidden
    />
  );
}
