import type { Principal, RecordRef } from "../core/envelope.js";
import type { ActionName } from "../core/actions.js";
import { RECORD_TYPES, readPath } from "../core/records.js";
import { stateFromAddress, withinSmsHours, withinTelemarketingHours } from "../compliance/au.js";

/**
 * Permission check (spec 8.2). The existing backend still enforces its own RBAC
 * on every call; these rules add the AI-specific limits on top. The same rules
 * are written in Cedar in /policies for Amazon Verified Permissions; this local
 * evaluator mirrors them and is what the tests exercise.
 */
export type PolicyRequest = {
  principal: Principal;
  action: ActionName;
  /** The target record, loaded from the backend, when the action has one. */
  resource?: { ref: RecordRef; data: Record<string, unknown> | null };
  /** Fields the caller wants to change (update_record), and their new values. */
  changedFields?: string[];
  fields?: Record<string, unknown>;
  /** For send_message / place_call. */
  recipient?: {
    resolvedFromRecord: boolean;
    type: string;
    consent?: { sms?: boolean; email?: boolean; calls?: boolean; marketing?: boolean };
    optedOut?: boolean;
    dncrRegistered?: boolean;
    address?: string | null;
    /** false = a contact the AI found that staff haven't confirmed yet. */
    verified?: boolean;
    /** Where the AI found it. */
    source?: string | null;
  };
  purpose?: "transactional" | "marketing" | "operational";
  channels?: string[];
  /** Number of records affected (bulk actions). */
  count?: number;
  now?: Date;
};

export type PolicyDecision = {
  decision: "allow" | "deny";
  policies: string[];
  reasons: string[];
  /** Policy-forced minimum autonomy: L1 means a person must approve. */
  requireHuman?: boolean;
};

const STAFF_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "MASTER", "STAFF", "DISTRIBUTOR"]);

export function isStaff(p: Principal): boolean {
  return p.kind === "staff" || p.roles.some((r) => STAFF_ROLES.has(r.toUpperCase()));
}

export function evaluatePolicy(req: PolicyRequest): PolicyDecision {
  const policies: string[] = [];
  const reasons: string[] = [];
  let requireHuman = false;
  const deny = (id: string, why: string): PolicyDecision => ({ decision: "deny", policies: [...policies, id], reasons: [...reasons, why] });
  const now = req.now ?? new Date();
  const p = req.principal;

  // 1. Visitors may only read public knowledge through the chat; no actions.
  if (p.kind === "visitor" && !["search_memory"].includes(req.action)) {
    return deny("visitor_read_only", "Website visitors cannot run actions until they are a lead or customer.");
  }

  // 2. Record ownership for installers and customers.
  const res = req.resource;
  if (res?.data && (p.kind === "installer" || p.kind === "customer") && !isStaff(p)) {
    const def = RECORD_TYPES[res.ref.type];
    if (def) {
      if (p.kind === "installer" && def.ownerInstallerPath) {
        const owner = readPath(res.data, def.ownerInstallerPath);
        if (owner != null && String(owner) !== p.id) {
          return deny("installer_own_records", `Installer ${p.id} is not assigned to ${res.ref.type} ${res.ref.id}.`);
        }
        policies.push("installer_own_records");
      }
      if (p.kind === "customer") {
        const owner = readPath(res.data, def.ownerCustomerPath ?? "customerId") ?? readPath(res.data, "userId");
        if (owner == null || String(owner) !== p.id) {
          return deny("customer_own_records", `Customers can only see their own records.`);
        }
        policies.push("customer_own_records");
      }
    }
  }

  // 3. Agents may only write AI-writable fields and never delete.
  if (p.kind === "agent" && req.action === "update_record" && res) {
    const def = RECORD_TYPES[res.ref.type];
    const writable = new Set(def?.aiWritable ?? []);
    const blocked = (req.changedFields ?? []).filter((f) => !writable.has(f));
    if (blocked.length) {
      requireHuman = true;
      policies.push("agent_ai_writable_fields");
      reasons.push(`Fields ${blocked.join(", ")} are not AI-writable; a person must approve.`);
    } else {
      policies.push("agent_ai_writable_fields");
    }
  }

  // 4. Messages only to contact details already on a record.
  if (req.action === "send_message" || req.action === "place_call") {
    const r = req.recipient;
    if (!r?.resolvedFromRecord && !isStaff(p)) {
      return deny("send_to_contact_on_file", "Messages and calls may only go to contact details already on a record.");
    }
    policies.push("send_to_contact_on_file");
    // An opt-out (STOP) stops marketing and SMS. Transactional email and portal messages about
    // their own job (documents, bookings) still reach them.
    if (r?.optedOut && (req.purpose === "marketing" || req.channels?.includes("sms") || req.action === "place_call")) {
      return deny("respect_opt_out", "The recipient has opted out of marketing, SMS and calls.");
    }
    // Business rule: the first send to a contact the AI found (not yet confirmed by staff) needs a staff OK.
    if (r?.verified === false && !isStaff(p)) {
      requireHuman = true;
      policies.push("new_contact_needs_approval");
      reasons.push(`First send to a contact the AI found${r.source ? ` on ${r.source}` : ""}: EasyLink staff confirm it once, then it's trusted.`);
    }
    // Only EasyLink (staff and its agents) sends marketing. Portal users send to each other about work.
    if (req.purpose === "marketing" && !isStaff(p) && p.kind !== "agent" && p.kind !== "system") {
      return deny("marketing_from_easylink_only", "Only EasyLink can send marketing messages.");
    }

    const state = stateFromAddress(r?.address);
    if (req.action === "send_message") {
      if (req.purpose === "marketing") {
        if (!r?.consent?.marketing) return deny("spam_act_consent", "No marketing consent recorded (Spam Act 2003).");
        policies.push("spam_act_consent");
      }
      // Quiet hours protect customers and leads; installers and staff (type "user") asking for job files get an answer.
      if (p.kind === "agent" && r?.type !== "user" && req.channels?.includes("sms") && !withinSmsHours(now, state)) {
        return deny("sms_quiet_hours", "Agent SMS is not sent between 8pm and 8am in the recipient's time zone.");
      }
    }
    if (req.action === "place_call" && req.purpose === "marketing") {
      const hours = withinTelemarketingHours(now, state);
      if (!hours.ok) return deny("acma_calling_hours", `Marketing calls not allowed now: ${hours.reason}.`);
      if (r?.dncrRegistered && !r.consent?.calls) {
        return deny("dncr", "Number is on the Do Not Call Register and no consent is recorded.");
      }
      policies.push("acma_calling_hours", "dncr");
    }
  }

  // 5. Bulk actions over 20 records always need a person (spec 9.7.6).
  if ((req.count ?? 1) > 20) {
    requireHuman = true;
    policies.push("bulk_requires_approval");
    reasons.push(`Affects ${req.count} records.`);
  }

  // 6. Always-human list (spec 8.5): sale outcomes and lead loss stay with people.
  if (p.kind === "agent" && req.action === "update_record" && res?.ref.type === "lead") {
    const status = String(req.fields?.status ?? "");
    if (["WON", "LOST"].includes(status)) {
      requireHuman = true;
      policies.push("always_human_sale_outcome");
    }
  }

  return { decision: "allow", policies, reasons, requireHuman };
}
