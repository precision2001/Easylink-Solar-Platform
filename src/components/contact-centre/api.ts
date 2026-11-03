/** Client for the contact-centre routes, through the portal's own relay. */

export type Portal = "admin" | "installers";

export const OUTCOMES = [
  { key: "SITE_VISIT_BOOKED", label: "Site visit booked" },
  { key: "QUOTE_REQUESTED", label: "Quote requested" },
  { key: "CALL_BACK_LATER", label: "Call back later" },
  { key: "VOICEMAIL_LEFT", label: "Voicemail left" },
  { key: "NOT_INTERESTED", label: "Not interested" },
  { key: "DO_NOT_CALL", label: "Do not call" },
  { key: "WRONG_NUMBER", label: "Wrong number" },
] as const;
export type Outcome = (typeof OUTCOMES)[number]["key"];
export const outcomeLabel = (o: string | null | undefined) => OUTCOMES.find((x) => x.key === o)?.label ?? null;

export type CallRow = {
  id: string;
  direction: "INBOUND" | "OUTBOUND";
  status: string;
  handledBy: "PERSON" | "AI";
  counterpartyNumber: string;
  startedAt: string;
  durationSec: number | null;
  outcome: Outcome | null;
  suggestedOutcome: Outcome | null;
  notes: string | null;
  aiSummary: string | null;
  callerVerified: boolean | null;
  recordingStatus: string;
  transcriptStatus: string;
  leadId: string | null;
  customer: { name: string; address: string | null; status: string } | null;
  agent: { id: string; name: string } | null;
  openFollowUps: number;
};

export type FollowUp = {
  id: string;
  kind: "CALLBACK" | "SITE_VISIT" | "TASK";
  title: string;
  notes: string | null;
  leadId: string | null;
  callId: string | null;
  phone: string | null;
  dueAt: string;
  status: "OPEN" | "DONE" | "CANCELLED";
  overdue?: boolean;
  assignee?: string | null;
  customer?: { id: string; name: string; phone: string | null; address: string | null } | null;
};

export type CallDetail = Omit<CallRow, "customer" | "openFollowUps"> & {
  lead: { id: string; customerName: string; customerPhone: string | null; customerEmail: string | null; address: string | null; status: string; projectPhase: string } | null;
  transcriptSegments: { idx: number; startSec: number; endSec: number | null; speaker: "AGENT" | "CUSTOMER" | "UNKNOWN"; text: string }[];
  transcriptText: string | null;
  followUps: FollowUp[];
  hasRecording: boolean;
  endedAt: string | null;
  consentAnnouncedAt: string | null;
};

export type TimelineItem = {
  id: string;
  kind: "call" | "sms" | "email" | "note" | "appointment" | "milestone" | "payment" | "follow_up" | "event";
  at: string;
  title: string;
  detail: string | null;
  by: string | null;
  ref?: { callId?: string; hasRecording?: boolean; transcript?: boolean; noteId?: string; pinned?: boolean; taskId?: string; dueAt?: string };
};

export type CustomerRecord = {
  lead: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    status: string;
    projectPhase: string;
    currentMilestone: string | null;
    source: string | null;
    retailer: string | null;
    followUpDate: string | null;
    consent: { calls: boolean; sms: boolean; email: boolean };
    installer: { id: string; name: string | null } | null;
    notes: string | null;
    createdAt: string;
  };
  pinned: { id: string; body: string; by: string | null; at: string }[];
  openFollowUps: { id: string; kind: FollowUp["kind"]; title: string; dueAt: string; assignee: string | null }[];
  lastCall: { id: string; at: string; outcome: Outcome | null; summary: string | null; by: string | null } | null;
  counts: { calls: number; texts: number; emails: number };
  timeline: TimelineItem[];
};

export type Presence = "AVAILABLE" | "BUSY" | "AWAY";
export type PendingTransfer = { id: string; callerNumber: string; callerName: string | null; leadId: string | null; summary: string; reason: string | null; secondsLeft: number };
export type AcceptedTransfer = { transferId: string; roomName: string; callerNumber: string; callerName: string | null; leadId: string | null; summary: string; token: string; url: string };
export type Assist = { suggestedReply: string | null; sentiment: "positive" | "neutral" | "negative" | null; topics: string[]; watchOut: string | null };
export type CoachingComment = { id: string; atSec: number | null; body: string; createdAt: string; authorId: string; author: string };
export type CampaignStatus = "DRAFT" | "ACTIVE" | "PAUSED" | "DONE";
export type Campaign = {
  id: string;
  name: string;
  listKey: string;
  goal: string | null;
  script: string | null;
  status: CampaignStatus;
  restDays: number;
  wrapSeconds: number;
  createdAt: string;
  updatedAt: string;
  list: { name: string; callable: number; total: number };
  stats: { calls: number; connected: number; connectRate: number | null; outcomes: Partial<Record<Outcome, number>>; siteVisits: number; quotes: number };
};
export type CampaignInput = { name: string; listKey: string; goal?: string | null; script?: string | null; restDays?: number; wrapSeconds?: number };
export type NextPerson = { name: string; phone: string | null; leadId: string | null; contactId?: string; address: string | null } | null;
export type LeadSummary = { summary: string; itemCount: number; updatedAt: string };

export type CcOverview = {
  day: string;
  kpis: {
    callsToday: number;
    inbound: number;
    outbound: number;
    answeredByAi: number;
    handedOver: number;
    callbacksBooked: number;
    missed: number;
    outboundConnected: number;
    siteVisitsBooked: number;
    avgHandleSec: number | null;
  };
  waiting: { id: string; callerNumber: string; callerName: string | null; reason: string | null; secondsLeft: number }[];
  liveCalls: { id: string; direction: "INBOUND" | "OUTBOUND"; status: string; handledBy: "PERSON" | "AI"; number: string; startedAt: string; roomName: string | null; customer: { id: string; name: string } | null; by: string }[];
  followUps: {
    dueToday: number;
    items: { id: string; kind: FollowUp["kind"]; title: string; notes: string | null; dueAt: string; overdue: boolean; phone: string | null; fromAi: boolean; customer: { id: string; name: string; address: string | null } | null }[];
  };
  lines: { number: string; name: string; route: string; waiting: number }[];
  team: { userId: string; name: string; status: Presence; lastSeenAt: string }[];
};

export function cc(portal: Portal) {
  const base = `/api/${portal}/cc`;
  async function call<T>(path: string, init?: RequestInit & { json?: unknown }): Promise<{ data: T; meta?: Record<string, unknown> }> {
    const { json, ...rest } = init ?? {};
    const res = await fetch(`${base}${path}`, json !== undefined ? { ...rest, body: JSON.stringify(json), headers: { "Content-Type": "application/json" } } : rest);
    const body = await res.json().catch(() => ({}));
    if (!res.ok || body.success === false) {
      const detail = Array.isArray(body.errors) && body.errors.length ? `: ${body.errors.map((e: { message: string }) => e.message).join("; ")}` : "";
      throw new Error(`${body.message ?? `Request failed (${res.status})`}${detail}`);
    }
    return { data: body.data as T, meta: body.meta };
  }
  return {
    calls: (params: Record<string, string | number | boolean | undefined>) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== false).map(([k, v]) => [k, String(v)]));
      return call<{ total: number; page: number; pageSize: number; calls: CallRow[] }>(`/call-records?${qs}`);
    },
    call: (id: string) => call<CallDetail>(`/call-records/${id}`).then((r) => r.data),
    recording: (id: string) => call<{ url: string }>(`/call-records/${id}/recording`).then((r) => r.data),
    summarise: (id: string) => call<{ aiSummary: string | null; suggestedOutcome: Outcome | null }>(`/call-records/${id}/summary`, { method: "POST", json: {} }).then((r) => r.data),
    newLead: (id: string, body: { name: string; email?: string; address?: string; notes?: string }) =>
      call<{ id: string; customerName: string }>(`/call-records/${id}/new-lead`, { method: "POST", json: body }).then((r) => r.data),
    linkLead: (id: string, leadId: string) => call(`/calls/${id}/lead`, { method: "PATCH", json: { leadId } }),
    disposition: (id: string, body: { outcome?: Outcome; notes?: string }) => call(`/calls/${id}/disposition`, { method: "PATCH", json: body }),
    record: (leadId: string) => call<CustomerRecord>(`/customer-records/${leadId}`).then((r) => r.data),
    pop: (leadId: string) => call<Omit<CustomerRecord, "timeline">>(`/customer-records/${leadId}/pop`).then((r) => r.data),
    addNote: (leadId: string, body: string, pinned: boolean) => call(`/customer-records/${leadId}/notes`, { method: "POST", json: { body, pinned } }),
    pinNote: (noteId: string, pinned: boolean) => call(`/customer-records/notes/${noteId}`, { method: "PATCH", json: { pinned } }),
    deleteNote: (noteId: string) => call(`/customer-records/notes/${noteId}`, { method: "DELETE" }),
    followUps: (params: Record<string, string | number | boolean | undefined>) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== false).map(([k, v]) => [k, String(v)]));
      return call<{ total: number; tasks: FollowUp[] }>(`/follow-ups?${qs}`).then((r) => r.data);
    },
    addFollowUp: (body: { kind: FollowUp["kind"]; title: string; notes?: string; leadId?: string; callId?: string; phone?: string; dueAt: string }) =>
      call<FollowUp>(`/follow-ups`, { method: "POST", json: body }).then((r) => r.data),
    leadSummary: (leadId: string) => call<LeadSummary | null>(`/customer-records/${leadId}/summary`),
    writeLeadSummary: (leadId: string) => call<LeadSummary>(`/customer-records/${leadId}/summary`, { method: "POST", json: {} }).then((r) => r.data),
    assist: (lines: { who: "you" | "caller"; text: string }[], leadId?: string) =>
      call<Assist>(`/live-calls/assist`, { method: "POST", json: { lines, leadId } }).then((r) => r.data),
    comments: (callId: string) => call<CoachingComment[]>(`/call-records/${callId}/comments`).then((r) => r.data),
    addComment: (callId: string, body: string, atSec?: number | null) =>
      call<{ id: string }>(`/call-records/${callId}/comments`, { method: "POST", json: { body, atSec: atSec ?? null } }),
    deleteComment: (id: string) => call(`/call-records/comments/${id}`, { method: "DELETE" }),
    listen: (callId: string) => call<{ callId: string; roomName: string; token: string; url: string }>(`/live-calls/listen`, { method: "POST", json: { callId } }).then((r) => r.data),
    campaigns: () => call<Campaign[]>(`/campaigns`).then((r) => r.data),
    campaign: (id: string) => call<Campaign>(`/campaigns/${id}`).then((r) => r.data),
    createCampaign: (body: CampaignInput) => call<Campaign>(`/campaigns`, { method: "POST", json: body }).then((r) => r.data),
    updateCampaign: (id: string, body: Partial<CampaignInput> & { status?: CampaignStatus }) =>
      call<Campaign>(`/campaigns/${id}`, { method: "PATCH", json: body }).then((r) => r.data),
    deleteCampaign: (id: string) => call(`/campaigns/${id}`, { method: "DELETE" }),
    campaignNext: (id: string) => call<NextPerson>(`/campaigns/${id}/next`).then((r) => r.data),
    overview: () => call<CcOverview>(`/live-calls/overview`).then((r) => r.data),
    presence: () => call<{ me: { status: Presence }; team: { userId: string; name: string; status: Presence; lastSeenAt: string }[] }>(`/live-calls/presence`).then((r) => r.data),
    setPresence: (status: Presence) => call(`/live-calls/presence`, { method: "PUT", json: { status } }),
    pendingTransfers: () => call<PendingTransfer[]>(`/live-calls/transfers/pending`).then((r) => r.data),
    acceptTransfer: (id: string) => call<AcceptedTransfer>(`/live-calls/transfers/${id}/accept`, { method: "POST", json: {} }).then((r) => r.data),
    declineTransfer: (id: string) => call(`/live-calls/transfers/${id}/decline`, { method: "POST", json: {} }),
    hangUpTransfer: (id: string) => call(`/live-calls/transfers/${id}/hang-up`, { method: "POST", json: {} }),
    liveTranscriptToken: () => call<{ token: string; expiresIn: number; language: string }>(`/live-calls/live-transcript/token`, { method: "POST", json: {} }).then((r) => r.data),
    setFollowUp: (id: string, body: Partial<Pick<FollowUp, "status" | "dueAt" | "title">>) => call(`/follow-ups/${id}`, { method: "PATCH", json: body }),
  };
}

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" });
export const day = (iso: string) => new Date(iso).toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short", timeZone: "Australia/Sydney" });
export const dur = (s: number | null) => (s == null ? "–" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
export const phoneFmt = (n: string | null | undefined) => {
  const d = (n ?? "").replace(/\D/g, "");
  const local = d.startsWith("61") ? `0${d.slice(2)}` : d;
  if (local.length !== 10) return n ?? "";
  return local.startsWith("04") ? `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}` : `${local.slice(0, 2)} ${local.slice(2, 6)} ${local.slice(6)}`;
};
