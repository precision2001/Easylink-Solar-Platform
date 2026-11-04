import type { JourneyMilestone, ProjectJourney } from "@/lib/project-journey";

/**
 * View helpers for the My project timeline. Dates come only from the
 * milestone's `completedAt`; nothing here estimates a future date.
 */

export function currentMilestone(journey: ProjectJourney | null | undefined): JourneyMilestone | null {
  if (!journey?.milestones.length) return null;
  return (
    journey.milestones.find((m) => m.key === journey.currentMilestoneKey) ??
    journey.milestones.find((m) => m.state === "current") ??
    journey.milestones[journey.currentIndex] ??
    null
  );
}

/** Whole-number percent, clamped to 0–100. */
export function journeyPercent(journey: ProjectJourney | null | undefined): number | null {
  if (!journey) return null;
  const raw = Number.isFinite(journey.percentComplete)
    ? journey.percentComplete
    : journey.totalCount > 0
      ? (journey.completedCount / journey.totalCount) * 100
      : 0;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

/** The step after the current one, if any. */
export function nextMilestone(journey: ProjectJourney | null | undefined): JourneyMilestone | null {
  const now = currentMilestone(journey);
  if (!journey || !now) return null;
  const i = journey.milestones.findIndex((m) => m.key === now.key);
  return journey.milestones.slice(i + 1).find((m) => m.state !== "completed") ?? null;
}

/** A specific question for EasyLink AI about one step of the customer's project. */
export function stepQuestion(step: Pick<JourneyMilestone, "label" | "state" | "hint">, next?: Pick<JourneyMilestone, "label"> | null): string {
  if (step.state === "completed") {
    return `My "${step.label}" step is done. What did it involve, and is there anything I should keep from it?`;
  }
  if (step.state === "upcoming") {
    return `What happens at the "${step.label}" step of my solar project, and do I need to do anything to prepare?`;
  }
  const after = next ? ` What comes after it (${next.label})?` : "";
  return `I'm at the "${step.label}" step of my solar project. What happens now, what do I need to do, and how long does it usually take?${after}`;
}
