"use client";

import { useEffect, useState } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { ProjectWorkspace } from "@/components/ai/ProjectWorkspace";
import { useCustomerProjectJourney } from "@/components/customer/dashboard/useCustomerProjectJourney";
import { CustomerPortalShell, PortalPageHeader } from "@/components/customer/portal/CustomerPortalShell";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { ButtonLink, EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { MyJob } from "@/components/jobs/JobWorkspace";
import { ai, AiNotConnectedError, type RecordRef } from "@/lib/ai-platform/client";
import { currentMilestone, journeyPercent, nextMilestone, stepQuestion } from "@/lib/customers/project-timeline";
import { formatMilestoneDate, type JourneyMilestone } from "@/lib/project-journey";

function TimelineStep({ m, last, next }: { m: JourneyMilestone; last: boolean; next: JourneyMilestone | null }) {
  const done = m.state === "completed";
  const now = m.state === "current";
  const date = done ? formatMilestoneDate(m.completedAt) : null;

  return (
    <li aria-current={now ? "step" : undefined} className="relative flex gap-4 pb-6 last:pb-0">
      {!last ? (
        <span aria-hidden="true" className={`absolute left-[17px] top-10 bottom-0 w-[2px] ${done ? "bg-[#86EFAC]" : "bg-[#E2E8F0]"}`} />
      ) : null}
      <span
        className={`relative z-[1] flex size-9 shrink-0 items-center justify-center rounded-full ${
          done
            ? "bg-[#15803D] text-white"
            : now
              ? "bg-[#F68A0A] text-[#3B1D00] shadow-[0_0_0_5px_#FFF4D6]"
              : "border-2 border-[#CBD5E1] bg-white text-[#94A3B8]"
        }`}
      >
        {done ? <PortalIcon name="check" size={18} /> : now ? <span className="size-2.5 rounded-full bg-[#3B1D00]" /> : null}
      </span>

      <div className={`flex min-w-0 flex-1 flex-col gap-1 ${now ? "rounded-[16px] border border-[#F68A0A] bg-[#FFF8EB] p-4" : "pt-1.5"}`}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
          <span className={`text-[15.5px] font-bold ${m.state === "upcoming" ? "text-[#475569]" : "text-[#0F172A]"}`}>{m.label}</span>
          <span className={`text-[13px] font-semibold ${done ? "text-[#15803D]" : now ? "text-[#7A3E00]" : "text-[#64748B]"}`}>
            {done ? (date ? `Done ${date}` : "Done") : now ? "You are here" : "Coming up"}
          </span>
        </div>
        {now ? (
          <>
            <p className="m-0 text-[14.5px] leading-[1.55] text-[#334155]">
              {m.hint ?? "We're working on this step now. We'll message you as soon as anything needs your attention."}
            </p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => askEasylinkAi(stepQuestion(m, next))}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[12px] bg-[#0B1A2E] px-4 text-[14px] font-bold text-white hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                <PortalIcon name="spark" size={16} className="text-[#FFE866]" />
                Ask AI about this step
              </button>
            </div>
          </>
        ) : m.state === "upcoming" ? (
          <button
            type="button"
            onClick={() => askEasylinkAi(stepQuestion(m))}
            className="flex min-h-[32px] w-fit items-center gap-1 text-[13.5px] font-semibold text-[#1D4ED8] hover:underline"
          >
            <PortalIcon name="spark" size={14} />
            What happens here?
          </button>
        ) : null}
      </div>
    </li>
  );
}

/** "My project": the install journey step by step, then every file, photo and message on the job. */
export default function CustomerProjectPage() {
  const { journey, loading: journeyLoading, error: journeyError } = useCustomerProjectJourney();
  const [project, setProject] = useState<RecordRef | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none" | "offline">("loading");

  useEffect(() => {
    ai.projects("customer")
      .then((rows) => {
        const first = rows.find((r) => r.ref.type === "customer") ?? rows[0];
        setProject(first?.ref ?? null);
        setState(first ? "ready" : "none");
      })
      .catch((e: unknown) => setState(e instanceof AiNotConnectedError ? "offline" : "none"));
  }, []);

  const pct = journeyPercent(journey);
  const now = currentMilestone(journey);
  const next = nextMilestone(journey);
  const milestones = journey?.milestones ?? [];
  const lastDone = [...milestones].reverse().find((m) => m.state === "completed" && m.completedAt);

  return (
    <CustomerPortalShell active="project">
      <PortalPageHeader
        eyebrow={pct !== null ? `Your project is ${pct}% complete` : "Your installation"}
        title="My project"
        intro="Your installation step by step, and every document, photo and certificate from EasyLink and your installer."
      />

      {journeyLoading ? (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Skeleton className="h-[420px]" />
          <Skeleton className="h-[260px]" />
        </div>
      ) : journeyError ? (
        <Panel title="Your project timeline">
          <EmptyNote icon="project" title="We couldn't load your timeline">
            {journeyError}. Refresh the page to try again, or message us if it keeps happening.
          </EmptyNote>
        </Panel>
      ) : !journey || milestones.length === 0 ? (
        <Panel title="Your project timeline">
          <EmptyNote icon="project" title="Your timeline starts when your project is set up">
            Once you choose a system and an EasyLink advisor confirms it with you, every step from site visit to switch-on shows here with dates.
          </EmptyNote>
          <div className="flex flex-wrap gap-2">
            <ButtonLink href="/customers/design" icon="arrow">
              See my design
            </ButtonLink>
            <ButtonLink href="/customers/messages" variant="quiet">
              Message us
            </ButtonLink>
          </div>
        </Panel>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[1.35fr_1fr]">
          <Panel title="Your project timeline" meta={`${journey.completedCount} of ${journey.totalCount} steps done`}>
            <ol className="m-0 list-none p-0">
              {milestones.map((m, i) => (
                <TimelineStep key={m.key} m={m} last={i === milestones.length - 1} next={m.key === now?.key ? next : null} />
              ))}
            </ol>
          </Panel>

          {/* The one bold thing on the page: where the job is right now. */}
          <section aria-labelledby="progress-title" className="flex flex-col gap-5 rounded-[22px] bg-[#0B1A2E] p-6 text-white sm:p-7 lg:sticky lg:top-24">
            <p className="m-0 flex items-center gap-2 text-[13px] font-bold text-[#FFE866]">
              <PortalIcon name="project" size={16} />
              Progress
            </p>
            <div className="flex items-end gap-3">
              <span id="progress-title" className="font-source-sans text-[56px] font-extrabold leading-none tabular-nums">
                {pct}%
              </span>
              <span className="pb-1.5 text-[14px] text-[#C9D6EA]">complete</span>
            </div>
            <div
              role="progressbar"
              aria-valuenow={pct ?? 0}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Project progress"
              className="h-3 overflow-hidden rounded-full bg-white/10"
            >
              <div className="h-full rounded-full bg-gradient-to-r from-[#FFE866] to-[#F68A0A]" style={{ width: `${pct}%` }} />
            </div>
            <dl className="m-0 flex flex-col gap-3 text-[14.5px]">
              {now ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-[#A9BBD3]">Right now</dt>
                  <dd className="m-0 font-bold">{now.label}</dd>
                </div>
              ) : null}
              {next ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-[#A9BBD3]">Then</dt>
                  <dd className="m-0 font-bold">{next.label}</dd>
                </div>
              ) : null}
              {lastDone ? (
                <div className="flex flex-col gap-0.5">
                  <dt className="text-[13px] text-[#A9BBD3]">Last step done</dt>
                  <dd className="m-0 font-bold">
                    {lastDone.label}, {formatMilestoneDate(lastDone.completedAt)}
                  </dd>
                </div>
              ) : null}
            </dl>
            <div className="flex flex-wrap gap-2.5">
              <ButtonLink href="/customers/messages" icon="messages">
                Message us
              </ButtonLink>
              <ButtonLink href="/customers/design" variant="ghost-dark">
                See my design
              </ButtonLink>
            </div>
          </section>
        </div>
      )}

      <section aria-labelledby="files-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="files-title" className="m-0 font-source-sans text-[24px] font-extrabold text-[#0F172A]">
            Documents, photos and certificates
          </h2>
          <p className="m-0 max-w-[680px] text-[14.5px] leading-[1.5] text-[#475569]">Everything from EasyLink and your installer, kept together for the life of your system.</p>
        </div>
        <MyJob />
        {state === "loading" ? (
          <Skeleton className="h-[120px]" />
        ) : state === "ready" && project ? (
          <ProjectWorkspace portal="customer" project={project} />
        ) : (
          <Panel>
            <EmptyNote icon="project" title="Nothing here yet">
              Your documents, photos and certificates appear here as your job moves. Check back here, or ask EasyLink AI what to expect next.
            </EmptyNote>
          </Panel>
        )}
      </section>
    </CustomerPortalShell>
  );
}
