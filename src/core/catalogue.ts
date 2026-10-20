/**
 * Registered event types (spec 3.2). Unknown types are never dropped: they go
 * to quarantine (spec 3.8) and the catalogue agent proposes additions.
 */
export const EVENT_CATALOGUE: Record<string, readonly string[]> = {
  page: ["viewed"],
  form: ["submitted", "abandoned"],
  field: ["hesitated"],
  cta: ["clicked"],
  price: ["viewed"],
  help: ["sought"],
  ui: ["interacted", "error_seen"],
  widget: ["opened", "message_sent"],
  search: ["performed"],
  design: ["requested", "generated", "saved", "shared", "abandoned", "option_viewed", "updated"],
  cart: ["updated", "abandoned"],
  order: ["placed", "paid", "refunded"],
  payment: ["failed", "succeeded"],
  customer: ["created", "updated", "imported", "deleted"],
  lead: ["created", "updated", "qualified", "lost", "assigned", "converted", "deleted"],
  consent: ["changed"],
  quote: ["drafted", "sent", "viewed", "accepted", "expired"],
  cooling_off: ["started", "ended"],
  job: ["created", "scheduled", "rescheduled", "started", "completed", "issue_raised", "progressed"],
  stc: ["submitted"],
  installer: ["assigned", "unassigned", "change_requested", "accepted", "declined", "document_expiring"],
  file: ["uploaded", "classified", "text_extracted", "shared", "deleted", "downloaded"],
  call: ["started", "ended", "transcribed", "summarised", "escalated"],
  voicemail: ["received"],
  email: ["received", "sent"],
  sms: ["received", "sent"],
  message: ["sent", "delivered", "opened", "bounced", "failed", "opted_out"],
  appointment: ["booked", "moved", "cancelled", "missed"],
  task: ["created", "updated", "completed"],
  note: ["created", "updated"],
  system: ["output_dropped", "fault_reported"],
  clean: ["due", "completed"],
  drone: ["flight_logged"],
  invoice: ["created", "overdue", "paid"],
  commission: ["earned"],
  ai: ["triaged", "proposed", "acted", "escalated", "corrected", "autonomy_changed", "paused", "resumed"],
  screen: ["requested", "generated", "rejected_binding", "pinned", "shared", "promoted"],
  fact: ["written", "deleted"],
  timer: ["fired"],
  record: ["purged"],
  partner: ["created", "updated"],
  document: ["delivered", "issue_found"],
  assist: ["requested", "answered", "confirmed", "cancelled"],
  integration: ["error"],
};

export function isRegisteredType(type: string): boolean {
  const [entity, verb] = type.split(".");
  if (!entity || !verb) return false;
  return EVENT_CATALOGUE[entity]?.includes(verb) ?? false;
}

export function allRegisteredTypes(): string[] {
  return Object.entries(EVENT_CATALOGUE).flatMap(([e, verbs]) => verbs.map((v) => `${e}.${v}`));
}
