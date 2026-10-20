import type { ActionName } from "../core/actions.js";
import { ACTIONS } from "../core/actions.js";
import type { AutonomyLevel, AutonomyRule, ControlState } from "../store/types.js";

/**
 * Autonomy (spec 8.3–8.5). The existing AI control centre shows three labels:
 *   Shadow     → L0 for acting (the agent only records what it would have done)
 *   Recommends → L1 (proposal waits in the inbox)
 *   Decides    → L2 (acts and notifies); L3 is reserved for silent, reversible work
 */
export const LEVEL_LABEL: Record<AutonomyLevel, "Shadow" | "Recommends" | "Decides"> = {
  L0: "Shadow",
  L1: "Recommends",
  L2: "Decides",
  L3: "Decides",
};

/** Starting levels when no rule exists: cautious by default. */
export function defaultLevel(action: ActionName): AutonomyLevel {
  const def = ACTIONS[action];
  if (def.kind === "read") return "L3";
  if (action === "write_fact" || action === "create_task" || action === "request_approval" || action === "find_contact") return "L2";
  return "L1";
}

export type AutonomyResult = {
  level: AutonomyLevel;
  /** "execute" runs now; "propose" goes to the inbox; "shadow" records only; "blocked" never runs. */
  outcome: "execute" | "propose" | "shadow" | "blocked";
  why: string;
};

export function resolveAutonomy(args: {
  agentId: string;
  action: ActionName;
  context: Record<string, string>;
  rules: AutonomyRule[];
  control: ControlState;
  requireHuman?: boolean;
}): AutonomyResult {
  const { agentId, action, context, rules, control } = args;
  const def = ACTIONS[action];

  if (control.pausedAgents[agentId]) return { level: "L0", outcome: "shadow", why: "Agent is paused in the AI control centre." };
  if (control.familiesOff[def.family] && def.kind !== "read") {
    return { level: "L0", outcome: "blocked", why: `The "${def.family}" kill switch is off.` };
  }

  // Most specific matching rule wins (most condition keys that match).
  const matching = rules
    .filter((r) => r.agentId === agentId && r.action === action)
    .filter((r) => Object.entries(r.condition).every(([k, v]) => context[k] === v))
    .sort((a, b) => Object.keys(b.condition).length - Object.keys(a.condition).length);
  let level: AutonomyLevel = matching[0]?.level ?? defaultLevel(action);
  let why = matching[0] ? `Rule set by ${matching[0].setBy}: ${matching[0].reason}` : "Default level for this action.";

  if (def.kind !== "read" && control.globalRecommendOnly && (level === "L2" || level === "L3")) {
    level = "L1";
    why = "All agents are set to recommend-only.";
  }
  if (args.requireHuman && def.kind !== "read" && (level === "L2" || level === "L3")) {
    level = "L1";
    why = "Policy requires a person for this change.";
  }

  if (level === "L0") return { level, outcome: def.kind === "read" ? "execute" : "shadow", why };
  if (level === "L1" && def.kind !== "read") return { level, outcome: "propose", why };
  return { level, outcome: "execute", why };
}

/**
 * Promotion suggestion (spec 8.4): L1→L2 at ≥97% approved unchanged over the last
 * max(100 proposals, 30 days) with no compliance rejection; L2→L3 at ≥99% over 300.
 */
export function suggestPromotion(stats: {
  level: AutonomyLevel;
  proposals: number;
  approvedUnchanged: number;
  complianceRejections: number;
  reversals: number;
}): AutonomyLevel | null {
  const rate = stats.proposals ? stats.approvedUnchanged / stats.proposals : 0;
  if (stats.complianceRejections > 0) return null;
  if (stats.level === "L1" && stats.proposals >= 100 && rate >= 0.97) return "L2";
  if (stats.level === "L2" && stats.proposals >= 300 && rate >= 0.99 && stats.reversals === 0) return "L3";
  return null;
}
