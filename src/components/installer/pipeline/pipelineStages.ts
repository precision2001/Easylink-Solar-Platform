import {
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  isLeadStage,
  type LeadStage,
} from "@/lib/admin/leads-pipeline";
import type { InstallerLeadSummary } from "@/lib/installers/leads";

export { LEAD_STAGES as PIPELINE_STAGES, LEAD_STAGE_LABEL as PIPELINE_STAGE_LABEL };

/**
 * The lead's sales stage. The column is non-null with a NEW_LEAD default on
 * the backend, so a missing or unknown value is read as that default.
 */
export function installerLeadStage(lead: Pick<InstallerLeadSummary, "stage">): LeadStage {
  return isLeadStage(lead.stage) ? lead.stage : "NEW_LEAD";
}

export function stageTotals(
  leads: Pick<InstallerLeadSummary, "stage">[],
): { stage: LeadStage; label: string; count: number }[] {
  const counts = new Map<LeadStage, number>();
  for (const lead of leads) {
    const stage = installerLeadStage(lead);
    counts.set(stage, (counts.get(stage) ?? 0) + 1);
  }
  return LEAD_STAGES.map((stage) => ({
    stage,
    label: LEAD_STAGE_LABEL[stage],
    count: counts.get(stage) ?? 0,
  }));
}
