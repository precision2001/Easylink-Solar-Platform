"use client";

function SkeletonBar({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      className={`customer-skeleton rounded ${className}`}
      aria-hidden
    />
  );
}

export function DesignOptionCardSkeleton() {
  return (
    <div
      className="flex h-full w-full flex-col overflow-hidden rounded-[14px] border-[3px] customer-card-border"
      aria-hidden
    >
      <SkeletonBar className="aspect-[436/80] w-full shrink-0 rounded-none" />
      <div className="customer-gradient-accent-h flex flex-1 flex-col px-4 pb-3 pt-3 opacity-60">
        <div className="flex items-start justify-between gap-2">
          <SkeletonBar className="h-3.5 w-24" />
          <SkeletonBar className="h-3.5 w-12 rounded-full" />
        </div>
        <SkeletonBar className="mt-2.5 h-2.5 w-[85%]" />
        <SkeletonBar className="mt-2 h-2.5 w-[70%]" />
      </div>
    </div>
  );
}

export function DesignOptionsGridSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div
      className="grid grid-cols-1 items-stretch gap-4 p-4 sm:grid-cols-2"
      aria-label="Loading design options"
      role="status"
    >
      {Array.from({ length: count }, (_, i) => (
        <DesignOptionCardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading your design options…</span>
    </div>
  );
}

export function ProjectTimelineStepsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ol className="flex flex-col" aria-label="Loading project timeline" role="status">
      {Array.from({ length: count }, (_, i) => {
        const isLast = i === count - 1;
        return (
          <li key={i} className="flex gap-3" aria-hidden>
            <div className="flex w-5 shrink-0 flex-col items-center">
              <SkeletonBar className="size-5 shrink-0 rounded-full" />
              {!isLast ? (
                <SkeletonBar className="mt-0.5 min-h-[32px] w-0.5 flex-1 rounded-full" />
              ) : null}
            </div>
            <div className={`min-w-0 flex-1 ${isLast ? "" : "pb-3"}`}>
              <SkeletonBar className="h-3 w-[72%] max-w-[180px]" />
              <SkeletonBar className="mt-2 h-2.5 w-12" />
            </div>
          </li>
        );
      })}
      <span className="sr-only">Loading your project timeline…</span>
    </ol>
  );
}

export function TimelineInstallerCardSkeleton() {
  return (
    <div className="customer-card-border border-t p-4" aria-hidden>
      <SkeletonBar className="h-2 w-20" />
      <div className="mt-2 flex items-center justify-between gap-3">
        <SkeletonBar className="size-8 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-2">
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="h-2.5 w-36" />
        </div>
        <SkeletonBar className="h-7 w-[72px] shrink-0 rounded-md" />
      </div>
    </div>
  );
}

export function CustomerSectionMetaSkeleton() {
  return <SkeletonBar className="inline-block h-3 w-28" />;
}
