"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * The Admin portal body from the Easylink Designer mocks (AdminBody.dc.html).
 *
 * Six artboards (AdminHome / AdminInstallers / AdminPartners / AdminCustomers /
 * AdminApprovals / AdminPlans) are thin wrappers that all import this one body
 * with a different `screen` prop, so this is one component rather than six
 * ports. The mock's body also covers `staff`, `audit` and `settings`; those
 * code paths are ported too, but no artboard for them shipped in this batch so
 * no route points at them yet.
 *
 * The mock's logic is ported as real state rather than frozen to one frame:
 * the KPIs and plan counts are computed from the account list, the search and
 * status chips filter it, suspend/reject are gated on a reason, and every
 * action prepends to the account history and the audit log the way the mock
 * does.
 *
 * All accounts, customers, staff and log entries here are the mock's sample
 * data — there is no Admin backend behind this yet, so the page says so and
 * destructive-looking buttons change this page's state only.
 */

const NAVY = "#0B1A2E";
const INK = "#0F172A";
const MUTED = "#5B6B80";
const BODY = "#334155";
const BORDER_2 = "#CBD5E1";
const SOFT = "#F8FAFC";
const MIST = "#F1F5F9";
const WHITE = "#FFFFFF";
const RED_2 = "#B91C1C";

/** The four status colour pairs the mock reuses everywhere. */
const C = {
  ok: ["#DCFCE7", "#166534"],
  warn: ["#FEF3C7", "#92400E"],
  bad: ["#FEE2E2", "#991B1B"],
  mute: [MIST, BODY],
} as const;

type Pair = readonly [string, string];

/** Account status → the label and colour pair the mock shows for it. */
const ST: Record<string, readonly [string, Pair]> = {
  active: ["Active", C.ok],
  pending: ["Waiting for approval", C.warn],
  suspended: ["Suspended", C.bad],
  rejected: ["Rejected", C.bad],
};

const TIER: Record<string, string> = {
  starter: "Starter",
  professional: "Professional",
  elite: "Elite",
};

/** The coloured top edge each membership tier gets on its plan card. */
const EDGE: Record<string, string> = {
  starter: "#E2E8F0",
  professional: "#7EC8F7",
  elite: "#FFB547",
};

export type AdminScreen =
  | "home"
  | "installers"
  | "partners"
  | "customers"
  | "approvals"
  | "plans"
  | "staff"
  | "audit"
  | "settings";

const HEAD: Record<AdminScreen, readonly [string, string]> = {
  home: [
    "Admin",
    "Manage every account across the installer, customer and EasyLink Operations portals.",
  ],
  installers: [
    "Installers",
    "Every installer company: status, membership, accreditation and activity. Approve, suspend, change plans or view their portal as them.",
  ],
  partners: [
    "Partners & suppliers",
    "EasyLink Operations, suppliers and partner companies that work through EasyLink.",
  ],
  customers: [
    "Customers",
    "Every customer across all installers, with their Customer Portal login.",
  ],
  approvals: [
    "Approvals",
    "New applications, documents that need renewing, and listings that need a look.",
  ],
  plans: [
    "Memberships & plans",
    "What each installer membership costs and unlocks. Changes apply to everyone on that plan straight away.",
  ],
  staff: [
    "Staff & roles",
    "Who can sign in to EasyLink Operations and what they can do in Admin.",
  ],
  audit: [
    "Audit log",
    "Every admin change and every “view as” session, with who did it and why.",
  ],
  settings: [
    "Platform settings",
    "Switches that apply to the website and every portal, and what’s connected.",
  ],
};

/** Admin roles, lowest to highest. `""` is "no admin access" in the mock. */
const ROLES: readonly Pair[] = [
  ["", "No admin access"],
  ["viewer", "Viewer"],
  ["support", "Support"],
  ["admin", "Admin"],
  ["owner", "Owner"],
];
const RL: Record<string, string> = Object.fromEntries(ROLES);

/** Permission → the lowest role level (1 = Viewer … 4 = Owner) that gets it. */
const MATRIX: readonly (readonly [string, number])[] = [
  ["See Admin, accounts and approvals", 1],
  ["Password links, customer logins on/off", 2],
  ["View as an account (read-only)", 2],
  ["Approve, suspend, change membership", 3],
  ["Edit membership plans", 3],
  ["Platform settings", 3],
  ["Read the audit log", 3],
  ["Download customer data", 3],
  ["Invite staff, change roles", 4],
];

const AUDIT_GROUPS: readonly Pair[] = [
  ["", "Everything"],
  ["org", "Accounts"],
  ["cust", "Customers"],
  ["staff", "Staff"],
  ["plan", "Plans"],
  ["view", "View as"],
  ["set", "Settings"],
];

const STATUS_CHIPS: readonly Pair[] = [
  ["all", "All"],
  ["active", "Active"],
  ["pending", "Waiting"],
  ["suspended", "Suspended"],
];

type OrgUser = readonly [string, string, string];
type OrgDoc = readonly [string, string, string];

type Org = {
  name: string;
  kind: "installer" | "partner";
  status: string;
  tier: string;
  abn: string;
  saa: boolean;
  cust: number;
  jobs: number;
  rating: string;
  joined: string;
  users: readonly OrgUser[];
  docs: readonly OrgDoc[];
  history: readonly string[];
  note?: string;
};

type Cust = {
  name: string;
  sub: string;
  inst: string;
  stage: string;
  source: string;
  login: boolean;
  email: string;
  phone: string;
  sms: string;
  rec: readonly (readonly [string, number])[];
};

type Staff = {
  name: string;
  title: string;
  email: string;
  role: string;
  limit: string;
  mfa: string;
  last: string;
  active: boolean;
  me?: boolean;
};

type Plan = {
  key: string;
  name: string;
  price: string;
  limits: readonly Pair[];
  feats: readonly string[];
};

type LogEntry = {
  when: string;
  who: string;
  what: string;
  target: string;
  detail: string;
  g: string;
};

type Viewing = { name: string; role: string; reason: string; href: string | null };

const ORGS: readonly Org[] = [
  {
    name: "Solarman Pty Ltd",
    kind: "installer",
    status: "active",
    tier: "elite",
    abn: "[ABN]",
    saa: true,
    cust: 13,
    jobs: 9,
    rating: "4.7 ★",
    joined: "Sep 2025",
    users: [
      ["Emmanuel", "Owner", "today"],
      ["Tomas", "Electrician", "2 days ago"],
    ],
    docs: [
      ["Electrical contractor licence (NSW)", "Checked with NSW Fair Trading", "Current"],
      ["Public liability insurance", "$20m · to Mar 2027", "Current"],
      ["Battery SWMS induction", "Due before Thu 16 Oct", "Due soon"],
    ],
    history: ["Daniel Shaw changed membership: Professional → Elite · 6 h ago"],
  },
  {
    name: "Sunrise Electrical Pty Ltd",
    kind: "installer",
    status: "pending",
    tier: "starter",
    abn: "[ABN]",
    saa: true,
    cust: 0,
    jobs: 0,
    rating: "—",
    joined: "applied 2 days ago",
    users: [["Mia", "Director", "never"]],
    docs: [
      ["Electrical contractor licence (NSW)", "Uploaded · not yet checked", "To check"],
      ["Public liability insurance", "Uploaded", "To check"],
    ],
    history: ["Application received 15 Oct"],
  },
  {
    name: "Brightway Electrical",
    kind: "installer",
    status: "active",
    tier: "professional",
    abn: "[ABN]",
    saa: true,
    cust: 4,
    jobs: 3,
    rating: "4.5 ★",
    joined: "Jan 2026",
    users: [["Owen", "Owner", "yesterday"]],
    docs: [["Public liability insurance", "to Jun 2027", "Current"]],
    history: [],
  },
  {
    name: "Harbour Solar Co",
    kind: "installer",
    status: "suspended",
    tier: "starter",
    abn: "[ABN]",
    saa: true,
    cust: 2,
    jobs: 1,
    rating: "4.2 ★",
    joined: "Mar 2026",
    users: [["Lena", "Owner", "3 weeks ago"]],
    docs: [["Public liability insurance", "Expired 30 Sep 2026", "Expired"]],
    history: ["Kerry suspended: insurance expired · 2 weeks ago"],
    note: "Suspended: public liability insurance expired 30 Sep.",
  },
  {
    name: "Easylink Plus Pty Ltd",
    kind: "partner",
    status: "active",
    tier: "",
    abn: "[ABN]",
    saa: false,
    cust: 6,
    jobs: 12,
    rating: "—",
    joined: "Feb 2026",
    users: [
      ["Daniel Shaw", "Owner", "today"],
      ["Kerry", "Customer support", "today"],
    ],
    docs: [["Distributor agreement", "renews Feb 2027", "Current"]],
    history: [],
  },
  {
    name: "[Supplier] Wholesale Pty Ltd",
    kind: "partner",
    status: "active",
    tier: "",
    abn: "[ABN]",
    saa: false,
    cust: 0,
    jobs: 0,
    rating: "—",
    joined: "Feb 2026",
    users: [["Accounts", "Supplier", "5 days ago"]],
    docs: [["Supply agreement", "renews Feb 2027", "Current"]],
    history: [],
  },
  {
    name: "[Partner] Energy Retail",
    kind: "partner",
    status: "pending",
    tier: "",
    abn: "[ABN]",
    saa: false,
    cust: 0,
    jobs: 0,
    rating: "—",
    joined: "applied today",
    users: [["Partnerships", "Manager", "never"]],
    docs: [["Partner agreement", "Draft sent", "To check"]],
    history: [],
  },
];

const CUSTS: readonly Cust[] = [
  {
    name: "Daniel Moretti",
    sub: "Yagoona 2199",
    inst: "Solarman",
    stage: "Proposal sent",
    source: "Installer’s own lead",
    login: true,
    email: "daniel@example.com",
    phone: "04XX XXX XXX",
    sms: "Yes",
    rec: [["Designs", 4], ["Jobs", 0], ["Messages", 2]],
  },
  {
    name: "Priya Raman",
    sub: "Kellyville 2155",
    inst: "Solarman",
    stage: "Deposit paid",
    source: "Ready Deal",
    login: true,
    email: "priya.raman@example.com",
    phone: "04XX XXX XXX",
    sms: "Yes",
    rec: [["Ready Deal orders", 1], ["Jobs", 0], ["Messages", 1]],
  },
  {
    name: "Sarah Lim",
    sub: "Kellyville 2155",
    inst: "— (Ready Site live)",
    stage: "Deposit paid",
    source: "EasyLink lead",
    login: false,
    email: "sarah.lim@example.com",
    phone: "04XX XXX XXX",
    sms: "No",
    rec: [["Ready Sites", 1], ["Designs", 1]],
  },
  {
    name: "Kim Nguyen",
    sub: "Blacktown 2148",
    inst: "Solarman",
    stage: "Deposit paid",
    source: "Ready Site",
    login: false,
    email: "kim.nguyen@example.com",
    phone: "04XX XXX XXX",
    sms: "No",
    rec: [["Jobs", 1], ["Ready Sites", 1]],
  },
  {
    name: "Raj Malhotra",
    sub: "Seven Hills 2147",
    inst: "Brightway",
    stage: "Proposal sent",
    source: "EasyLink lead",
    login: false,
    email: "raj@example.com",
    phone: "04XX XXX XXX",
    sms: "Yes",
    rec: [["Designs", 2], ["Messages", 1]],
  },
  {
    name: "Mei Chen",
    sub: "Ryde 2112",
    inst: "Solarman",
    stage: "Installing",
    source: "Ready Deal",
    login: true,
    email: "mei.chen@example.com",
    phone: "04XX XXX XXX",
    sms: "Yes",
    rec: [["Ready Deal orders", 1], ["Jobs", 1]],
  },
];

const STAFF: readonly Staff[] = [
  {
    name: "Daniel Shaw",
    title: "Owner",
    email: "dshaw@[company]",
    role: "owner",
    limit: "Unlimited",
    mfa: "On",
    last: "Today",
    active: true,
    me: true,
  },
  {
    name: "Kerry",
    title: "Customer support",
    email: "kerry@[company]",
    role: "support",
    limit: "Cannot order",
    mfa: "On",
    last: "Today",
    active: true,
  },
  {
    name: "Mark Kelly",
    title: "Operations manager",
    email: "mark@[company]",
    role: "admin",
    limit: "$25,000 / order",
    mfa: "On",
    last: "Yesterday",
    active: true,
  },
  {
    name: "Ana Lopez",
    title: "Finance",
    email: "ana@[company]",
    role: "viewer",
    limit: "Payments only",
    mfa: "Not set up",
    last: "Never",
    active: true,
  },
];

const PLANS: readonly Plan[] = [
  {
    key: "starter",
    name: "Starter",
    price: "",
    limits: [["Job offers", "3rd"], ["Users", "2"], ["Live Ready Deals", "2"], ["Communication", "No"]],
    feats: [
      "Job offers in your service areas",
      "Ready Sites after the Elite head start",
      "Solar designer and Solar Design",
    ],
  },
  {
    key: "professional",
    name: "Professional",
    price: "",
    limits: [["Job offers", "2nd"], ["Users", "5"], ["Live Ready Deals", "6"], ["Communication", "No"]],
    feats: ["Everything in Starter", "Job offers before Starter", "Sales dashboard and reports"],
  },
  {
    key: "elite",
    name: "Elite",
    price: "",
    limits: [["Job offers", "1st"], ["Users", "20"], ["Live Ready Deals", "20"], ["Communication", "Yes"]],
    feats: [
      "Everything in Professional",
      "Ready Sites head start",
      "Contact centre, contact lists, campaigns, AI agents",
    ],
  },
];

const LOG: readonly LogEntry[] = [
  {
    when: "Today 7:54 am",
    who: "Daniel Shaw",
    what: "Changed membership",
    target: "Solarman Pty Ltd",
    detail: "Professional → Elite",
    g: "org",
  },
  {
    when: "16 Oct 1:12 pm",
    who: "Kerry",
    what: "Started viewing as",
    target: "Daniel Moretti",
    detail: "Customer called: can’t see the EV option",
    g: "view",
  },
  {
    when: "16 Oct 1:20 pm",
    who: "Kerry",
    what: "Stopped viewing as",
    target: "Daniel Moretti",
    detail: "",
    g: "view",
  },
  {
    when: "15 Oct 4:02 pm",
    who: "Kerry",
    what: "Sent password reset",
    target: "Daniel Moretti",
    detail: "",
    g: "cust",
  },
  {
    when: "15 Oct 9:15 am",
    who: "Daniel Shaw",
    what: "Invited staff",
    target: "Kerry",
    detail: "Support",
    g: "staff",
  },
  {
    when: "3 Oct 10:40 am",
    who: "Kerry",
    what: "Suspended",
    target: "Harbour Solar Co",
    detail: "Public liability insurance expired 30 Sep",
    g: "org",
  },
  {
    when: "1 Oct 8:05 am",
    who: "Mark Kelly",
    what: "Changed platform settings",
    target: "Platform settings",
    detail: "Ready Deals on the website: on",
    g: "set",
  },
];

/** Where each portal the mock links to actually lives in this app, if anywhere. */
const ROUTE: Record<string, string | null> = {
  installers: "/master/admin/installers",
  partners: "/master/admin/partners",
  customers: "/master/admin/customers",
  approvals: "/master/admin/approvals",
  plans: "/master/admin/plans",
  audit: "/master/admin/audit",
  // The gradient builder has no artboard in this batch.
  theme: null,
};

/** The installer-facing portal a "view as" session would open. */
const INSTALLER_PORTAL = "/master/installers";

const CARD =
  "flex min-w-0 flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]";
const BTN =
  "inline-flex h-[38px] items-center justify-center gap-[6px] whitespace-nowrap rounded-[10px] border border-[#CBD5E1] bg-white px-[14px] text-[13px] font-semibold text-[#0F172A]";
const BTN_SUN = "border-0 bg-[#F68A0A] font-bold text-[#3B1D00]";
const BTN_DARK = "border-0 bg-[#0B1A2E] text-white";
const PILL =
  "inline-block whitespace-nowrap rounded-full px-[9px] py-[3px] text-[11px] font-bold";
const TH =
  "border-b border-[#E3E8EF] px-[10px] py-2 text-left text-[11px] font-bold uppercase tracking-[0.06em] text-[#5B6B80]";
const TD = "border-b border-[#E3E8EF] px-[10px] py-[11px] align-top text-[13px]";
const LBL = "flex min-w-0 flex-col gap-1 text-[12px] font-semibold text-[#334155]";
const INP =
  "h-10 w-full min-w-0 rounded-[10px] border border-[#CBD5E1] bg-white px-[10px] text-[14px] text-[#0F172A]";
const ROW =
  "flex flex-wrap items-center gap-[10px] border-b border-[#E3E8EF] py-[10px]";
const TILE = "flex min-w-0 flex-col gap-[2px] rounded-[10px] bg-[#F8FAFC] p-3";
const SUB = "text-[12px] text-[#5B6B80]";
const H2 = "m-0 text-[16px] font-bold";

/** A filter chip, navy when on, per the mock. */
function Chip({
  on,
  label,
  onClick,
}: {
  on: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className="h-9 cursor-pointer rounded-full border px-3 text-[13px] font-semibold"
      style={{
        borderColor: on ? NAVY : BORDER_2,
        background: on ? NAVY : WHITE,
        color: on ? WHITE : INK,
      }}
    >
      {label}
    </button>
  );
}

function Pill({ bg, fg, children }: { bg: string; fg: string; children: React.ReactNode }) {
  return (
    <span className={PILL} style={{ background: bg, color: fg }}>
      {children}
    </span>
  );
}

/**
 * A button that goes somewhere real, or says plainly that it does not —
 * the mock links every card to an artboard, but only some have routes here.
 */
function Go({
  to,
  children,
  className = BTN,
}: {
  to: string | null;
  children: React.ReactNode;
  className?: string;
}) {
  return to ? (
    <Link href={to} className={className}>
      {children}
    </Link>
  ) : (
    <span className={`${className} cursor-help`} title="Not built yet">
      {children}
    </span>
  );
}

/** A label/value line, used by the home activity lists and customer records. */
function Line({ l, v }: { l: string; v: string }) {
  return (
    <div className="flex justify-between border-b border-[#E3E8EF] py-[6px] text-[13px]">
      <span>{l}</span>
      <strong>{v}</strong>
    </div>
  );
}

export function MasterAdminBody({ screen = "home" }: { screen?: AdminScreen }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [sel, setSel] = useState(0);
  const [reason, setReason] = useState("");
  const [needReason, setNeedReason] = useState(false);
  const [msg, setMsg] = useState("");
  const [viewing, setViewing] = useState<Viewing | null>(null);
  const [tier, setTier] = useState("");
  const [custSel, setCustSel] = useState(0);
  const [auditF, setAuditF] = useState("");
  const [banner, setBanner] = useState("");
  const [flags, setFlags] = useState({ market: true, signups: true, moderation: false });
  const [inv, setInv] = useState({ first: "", email: "", title: "", role: "viewer" });
  const [orgs, setOrgs] = useState<readonly Org[]>(ORGS);
  const [custs, setCusts] = useState<readonly Cust[]>(CUSTS);
  const [staff, setStaff] = useState<readonly Staff[]>(STAFF);
  const [plans, setPlans] = useState<readonly Plan[]>(PLANS);
  const [log, setLog] = useState<readonly LogEntry[]>(LOG);

  const [title, lede] = HEAD[screen];

  /** Prepend an audit entry, exactly as the mock's `log()` helper does. */
  const addLog = (what: string, target: string, detail: string, g: string) =>
    setLog((prev) => [
      { when: "Just now", who: "Daniel Shaw", what, target, detail, g },
      ...prev,
    ]);

  /** "View as" always needs a reason; it is kept in the audit log. */
  const startView = (name: string, role: string, href: string | null) => {
    if (!reason.trim()) {
      setNeedReason(true);
      return;
    }
    setViewing({ name, role, reason, href });
    setNeedReason(false);
    addLog("Started viewing as", name, reason, "view");
    setReason("");
  };

  const stopView = () => {
    addLog("Stopped viewing as", viewing ? viewing.name : "", "", "view");
    setViewing(null);
  };

  const sOrgs = screen === "installers" || screen === "partners";
  const kind = screen === "partners" ? "partner" : "installer";

  // ---- home -------------------------------------------------------------
  const installers = useMemo(() => orgs.filter((o) => o.kind === "installer"), [orgs]);
  const pendingOrgs = useMemo(
    () => orgs.map((o, i) => ({ ...o, i })).filter((o) => o.status === "pending"),
    [orgs],
  );

  const kpis = [
    {
      l: "Installers",
      v: String(installers.filter((o) => o.status === "active").length),
      s: "1 Elite · 1 Professional · 0 Starter active",
      to: ROUTE.installers,
    },
    { l: "Customers", v: "19", s: "3 with portal login", to: ROUTE.customers },
    {
      l: "Waiting for you",
      v: String(pendingOrgs.length + 2),
      s: `${pendingOrgs.length} applications · 2 documents`,
      to: ROUTE.approvals,
    },
    {
      l: "Suspended",
      v: String(orgs.filter((o) => o.status === "suspended").length),
      s: "installers and partners",
      to: ROUTE.installers,
    },
  ];

  const waiting = [
    ...pendingOrgs.map((o) => ({
      t: o.name,
      d: `${o.kind === "installer" ? "Installer" : "Partner"} application · ${o.joined}`,
      tag: "Application",
      bg: C.warn[0],
      fg: C.warn[1],
      cta: "Review",
      to: o.kind === "installer" ? ROUTE.installers : ROUTE.partners,
    })),
    {
      t: "Battery SWMS induction",
      d: "Solarman Pty Ltd · due before Thu 16 Oct",
      tag: "Due soon",
      bg: C.warn[0],
      fg: C.warn[1],
      cta: "Open",
      to: ROUTE.installers,
    },
    {
      t: "Public liability insurance",
      d: "Harbour Solar Co · expired 30 Sep",
      tag: "Expired",
      bg: C.bad[0],
      fg: C.bad[1],
      cta: "Open",
      to: ROUTE.installers,
    },
  ];

  const activity: readonly Pair[] = [
    ["Jobs scheduled this week", "3"],
    ["Ready Sites live", "4"],
    ["Ready Deals live", "5"],
    ["Deal orders waiting for a call", "1"],
    ["AI approvals waiting", "7"],
  ];
  const people: readonly Pair[] = [
    ["Installer users", "4"],
    ["Operations users", String(staff.filter((s) => s.active).length)],
    ["Customer logins", "3"],
    ["EasyLink staff", "1"],
  ];

  // ---- organisations ----------------------------------------------------
  const orgList = orgs
    .map((o, i) => ({ ...o, i }))
    .filter(
      (o) =>
        o.kind === kind &&
        (status === "all" || o.status === status) &&
        (!q || o.name.toLowerCase().includes(q.toLowerCase())),
    );

  // Selection falls back to the first account of this kind, so switching
  // between Installers and Partners never leaves the detail pane empty.
  const selO = orgs[sel] && orgs[sel]!.kind === kind ? orgs[sel]! : orgs.find((o) => o.kind === kind);
  const selI = selO ? orgs.indexOf(selO) : -1;

  const orgTypeOf = (name: string) =>
    /Supplier/.test(name) ? "Supplier" : /Partner/.test(name) ? "Partner" : "Operations";

  /** Approve / Reject / Suspend / Reactivate. `needs` gates on a reason. */
  const act = (nextStatus: string, label: string, cls: string, needs: boolean) => ({
    label,
    cls,
    go: () => {
      if (!selO) return;
      if (needs && !reason.trim()) {
        setNeedReason(true);
        return;
      }
      const past = {
        Approve: "Approved",
        Reject: "Rejected",
        Suspend: "Suspended",
        Reactivate: "Reactivated",
      }[label]!;
      setOrgs((prev) =>
        prev.map((o, i) =>
          i === selI
            ? {
                ...o,
                status: nextStatus,
                note:
                  nextStatus === "suspended" || nextStatus === "rejected"
                    ? `${past}: ${reason}`
                    : "",
                history: [
                  `${past} by Daniel Shaw${reason ? `: ${reason}` : ""} · just now`,
                  ...o.history,
                ],
              }
            : o,
        ),
      );
      setMsg(
        `${selO.name}: ${past.toLowerCase()}.${
          nextStatus === "suspended"
            ? " Everyone there has been signed out."
            : nextStatus === "active"
              ? " Their users can sign in."
              : ""
        }`,
      );
      addLog(past, selO.name, reason, "org");
      setReason("");
      setNeedReason(false);
    },
  });

  const orgActions = selO
    ? selO.status === "pending"
      ? [act("active", "Approve", BTN_SUN, false), act("rejected", "Reject", "", true)]
      : selO.status === "active"
        ? [act("suspended", "Suspend", "", true)]
        : [act("active", "Reactivate", BTN_SUN, false)]
    : [];

  /** A membership change is a no-op unless the select actually moved. */
  const saveTier = () => {
    if (!tier || !selO || tier === selO.tier) return;
    const from = TIER[selO.tier]!;
    setOrgs((prev) =>
      prev.map((o, i) =>
        i === selI
          ? {
              ...o,
              tier,
              history: [`Membership ${from} → ${TIER[tier]} · just now`, ...o.history],
            }
          : o,
      ),
    );
    setMsg(`${selO.name} moved to ${TIER[tier]}.`);
    addLog("Changed membership", selO.name, `${from} → ${TIER[tier]}`, "org");
    setTier("");
  };

  // ---- customers --------------------------------------------------------
  const custList = custs
    .map((c, i) => ({ ...c, i }))
    .filter((c) => !q || (c.name + c.sub + c.email).toLowerCase().includes(q.toLowerCase()));
  const cs = custs[custSel] ?? custs[0]!;

  const custReset = () => {
    setMsg(`Password link sent to ${cs.email}.`);
    addLog("Sent password reset", cs.name, "", "cust");
  };
  const custToggle = () => {
    setCusts((prev) => prev.map((c, i) => (i === custSel ? { ...c, login: !c.login } : c)));
    setMsg(`Portal login turned ${cs.login ? "off" : "on"} for ${cs.name}.`);
    addLog(
      cs.login ? "Turned portal login off" : "Turned portal login on",
      cs.name,
      "",
      "cust",
    );
  };
  const custExport = () => {
    setMsg(`Downloaded ${cs.name}’s data (designs, jobs, messages, payments, orders).`);
    addLog("Downloaded customer data", cs.name, "Access request", "cust");
  };

  // ---- approvals --------------------------------------------------------
  const approve = (i: number, ok: boolean) => () => {
    const target = orgs[i]!;
    setOrgs((prev) =>
      prev.map((o, j) => (j === i ? { ...o, status: ok ? "active" : "rejected" } : o)),
    );
    setMsg(
      target.name + (ok ? " approved. Their users can sign in now." : " rejected."),
    );
    addLog(ok ? "Approved" : "Rejected", target.name, "", "org");
  };

  const queues = [
    {
      title: "Applications",
      n: pendingOrgs.length,
      items: pendingOrgs.map((o) => ({
        t: o.name,
        d: `${o.kind === "installer" ? "Installer" : "Partner"} · ${
          o.saa ? "SAA accredited" : "SAA not needed"
        } · ${o.joined}`,
        btns: [
          { l: "Approve", cls: BTN_SUN, go: approve(o.i, true) },
          { l: "Reject", cls: "", go: approve(o.i, false) },
        ],
      })),
      emptyTxt: "No applications waiting.",
    },
    {
      title: "Documents to renew",
      n: 2,
      items: [
        {
          t: "Battery SWMS induction",
          d: "Solarman Pty Ltd · due before Thu 16 Oct",
          btns: [
            {
              l: "Send reminder",
              cls: "",
              go: () => setMsg("Reminder sent to Solarman Pty Ltd."),
            },
          ],
        },
        {
          t: "Public liability insurance",
          d: "Harbour Solar Co · expired 30 Sep · account suspended",
          btns: [
            {
              l: "Send reminder",
              cls: "",
              go: () => setMsg("Reminder sent to Harbour Solar Co."),
            },
          ],
        },
      ],
      emptyTxt: "",
    },
    {
      title: "Ready Sites ending in 3 days",
      n: 1,
      items: [
        {
          t: "RS-2042 · Marsden Park",
          d: "6.6 kW solar · ends 18 Oct",
          btns: [
            {
              l: "Extend 14 days",
              cls: "",
              go: () => setMsg("RS-2042 extended to 1 Nov."),
            },
          ],
        },
      ],
      emptyTxt: "",
    },
    {
      // Driven by the "check deals before they go live" switch in Settings.
      title: "Ready Deals to check",
      n: flags.moderation ? 1 : 0,
      items: flags.moderation
        ? [
            {
              t: "Electrify Everything · Solarman",
              d: "$31,990 · draft",
              btns: [
                {
                  l: "Approve",
                  cls: BTN_SUN,
                  go: () => setMsg("Deal approved and live."),
                },
              ],
            },
          ]
        : [],
      emptyTxt: "Deal checks are off. Turn them on in Platform settings.",
    },
  ];

  // ---- staff ------------------------------------------------------------
  const invite = () => {
    if (!inv.first.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(inv.email)) {
      setMsg("Add a first name and a valid email to invite someone.");
      return;
    }
    setStaff((prev) => [
      ...prev,
      {
        name: inv.first,
        title: inv.title || "—",
        email: inv.email,
        role: inv.role,
        limit: "Cannot order",
        mfa: "Not set up",
        last: "Invite sent",
        active: true,
      },
    ]);
    addLog("Invited staff", inv.first, RL[inv.role] ?? "", "staff");
    setMsg(`Invited ${inv.email}. They’ll get an email to set their password.`);
    setInv({ first: "", email: "", title: "", role: "viewer" });
  };

  const matrix = MATRIX.map(([l, lvl]) => ({
    l,
    c: [1, 2, 3, 4].map((r) => ({
      v: r >= lvl ? "✓" : "—",
      col: r >= lvl ? C.ok[1] : MUTED,
    })),
  }));

  // ---- audit / settings -------------------------------------------------
  const auditRows = log.filter((e) => !auditF || e.g === auditF);

  const switches = [
    {
      t: "Ready Deals and Ready Sites on the website",
      d: "Off shows a “back soon” message instead.",
      on: flags.market,
      k: "market" as const,
    },
    {
      t: "Accept new installer applications",
      d: "Off hides the application form on the website.",
      on: flags.signups,
      k: "signups" as const,
    },
    {
      t: "Check Ready Deals before they go live",
      d: "Installers’ draft deals appear in Approvals.",
      on: flags.moderation,
      k: "moderation" as const,
    },
  ];

  const conn = (n: string, how: string, on: boolean) => ({
    n,
    how,
    s: on ? "Connected" : "Not set up",
    bg: (on ? C.ok : C.warn)[0],
    fg: (on ? C.ok : C.warn)[1],
  });
  const conns = [
    conn("Microsoft Clarity · recordings", "CLARITY_WEBSITE_ID, CLARITY_PORTALS_ID", true),
    conn("Microsoft Clarity · stats", "CLARITY_WEBSITE_TOKEN, CLARITY_PORTALS_TOKEN", false),
    conn("Email", "SMTP settings", true),
    conn("Deposit payments", "Payment provider checkout link", false),
    conn("Voxa voice & chat AI", "API key", true),
    conn("HTTPS & secure cookies", "Production mode", true),
  ];

  return (
    <div
      className="flex w-full max-w-[1400px] flex-col gap-[18px] px-8 pb-14 pt-6 text-[#0F172A]"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {viewing ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-[10px] rounded-xl bg-[#DBEAFE] px-4 py-3 text-[14px] font-semibold text-[#1E40AF]"
        >
          <span className="grow">
            Viewing as {viewing.name} · {viewing.role} · read-only, logged in the
            audit log (“{viewing.reason}”)
          </span>
          <Go to={viewing.href}>Open their portal</Go>
          <button type="button" className={BTN} onClick={stopView}>
            Stop viewing
          </button>
        </div>
      ) : null}

      {msg ? (
        <div
          role="status"
          className="rounded-xl bg-[#DCFCE7] px-[14px] py-[11px] text-[14px] font-semibold text-[#166534]"
        >
          {msg}
        </div>
      ) : null}

      <div className="flex flex-wrap items-end gap-[14px]">
        <div className="flex-[1_1_420px]">
          <h1
            className="m-0 text-[28px] font-bold"
            style={{ fontFamily: "'Source Sans 3', Inter, sans-serif" }}
          >
            {title}
          </h1>
          <p className="mt-1 mb-0 max-w-[780px] text-[13px] leading-[1.5] text-[#5B6B80]">
            {lede}
          </p>
          <span className={SUB}>
            Signed in as <strong>Daniel Shaw</strong> · Owner
          </span>
        </div>
        <span className={PILL} style={{ background: C.warn[0], color: C.warn[1] }}>
          Sample data
        </span>
      </div>

      {/* ===== HOME ===== */}
      {screen === "home" ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-[14px]">
            {kpis.map((k) => (
              <Go
                key={k.l}
                to={k.to}
                className={`${CARD} gap-1 p-4 no-underline`}
              >
                <span className={`${SUB} font-semibold`}>{k.l}</span>
                <span
                  className="text-[28px] font-bold"
                  style={{ fontFamily: "'Source Sans 3', Inter, sans-serif" }}
                >
                  {k.v}
                </span>
                <span className="text-[12px] text-[#475569]">{k.s}</span>
              </Go>
            ))}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(400px,1fr))] items-start gap-4">
            <section className={CARD}>
              <div className="flex items-center">
                <h2 className={`${H2} grow`}>Waiting for you</h2>
                <Go to={ROUTE.approvals} className="text-[13px] text-[#1565C0]">
                  All approvals
                </Go>
              </div>
              {waiting.map((w) => (
                <div key={w.t} className={ROW}>
                  <span className="flex flex-[1_1_240px] flex-col">
                    <strong className="text-[14px]">{w.t}</strong>
                    <span className={SUB}>{w.d}</span>
                  </span>
                  <Pill bg={w.bg} fg={w.fg}>
                    {w.tag}
                  </Pill>
                  <Go to={w.to}>{w.cta}</Go>
                </div>
              ))}
            </section>

            <section className={CARD}>
              <h2 className={H2}>Across the portals</h2>
              {activity.map(([l, v]) => (
                <Line key={l} l={l} v={v} />
              ))}
              <h2 className={`${H2} mt-[6px]`}>People with logins</h2>
              {people.map(([l, v]) => (
                <Line key={l} l={l} v={v} />
              ))}
            </section>
          </div>

          <section className={CARD}>
            <div className="flex items-center">
              <h2 className={`${H2} grow`}>Recent admin activity</h2>
              <Go to={ROUTE.audit} className="text-[13px] text-[#1565C0]">
                Audit log
              </Go>
            </div>
            {log.slice(0, 5).map((e, i) => (
              <div key={`${e.when}-${i}`} className={ROW}>
                <span className="flex-[1_1_300px] text-[13px]">
                  <strong>{e.who}</strong> {e.what} <strong>{e.target}</strong>{" "}
                  <span className={SUB}>{e.detail}</span>
                </span>
                <span className={SUB}>{e.when}</span>
              </div>
            ))}
          </section>
        </>
      ) : null}

      {/* ===== ORGANISATIONS (installers / partners) ===== */}
      {sOrgs ? (
        <>
          <div className="flex flex-wrap items-end gap-[10px]">
            <label className={`${LBL} flex-[2_1_260px]`}>
              Search
              <input
                className={INP}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Name, ABN or email"
              />
            </label>
            <div role="group" aria-label="Status" className="flex flex-wrap gap-[6px]">
              {STATUS_CHIPS.map(([k, l]) => (
                <Chip key={k} on={status === k} label={l} onClick={() => setStatus(k)} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(440px,1fr))] items-start gap-4">
            <section
              className={`${CARD} gap-0 overflow-hidden p-0`}
              aria-label="Accounts"
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Company</th>
                      <th className={TH}>Status</th>
                      <th className={TH}>
                        {kind === "installer" ? "Membership" : "Type"}
                      </th>
                      <th className={`${TH} text-right`}>Customers</th>
                      <th className={TH}>
                        <span className="absolute -left-[9999px]">Open</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {orgList.map((o) => {
                      const s = ST[o.status]!;
                      return (
                        <tr
                          key={o.name}
                          style={{ background: o.i === selI ? SOFT : "transparent" }}
                        >
                          <td className={TD}>
                            <strong>{o.name}</strong>
                            <br />
                            <span className={SUB}>
                              ABN {o.abn} · {o.joined}
                            </span>
                          </td>
                          <td className={TD}>
                            <Pill bg={s[1][0]} fg={s[1][1]}>
                              {s[0]}
                            </Pill>
                          </td>
                          <td className={TD}>
                            {kind === "installer" ? TIER[o.tier] : orgTypeOf(o.name)}
                          </td>
                          <td className={`${TD} text-right`}>{o.cust}</td>
                          <td className={TD}>
                            <button
                              type="button"
                              className={`${BTN} h-8`}
                              onClick={() => {
                                setSel(o.i);
                                setReason("");
                                setNeedReason(false);
                                setTier("");
                              }}
                            >
                              {o.status === "pending" ? "Review" : "Open"}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {selO ? (
              <section className={CARD} aria-label="Account detail">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="m-0 grow text-[20px]">{selO.name}</h2>
                  <span
                    className={`${PILL} text-[12px]`}
                    style={{
                      background: ST[selO.status]![1][0],
                      color: ST[selO.status]![1][1],
                    }}
                  >
                    {ST[selO.status]![0]}
                  </span>
                </div>
                <span className="text-[13px] text-[#5B6B80]">
                  {selO.kind === "installer"
                    ? `Installer · ${TIER[selO.tier]}${
                        selO.saa ? " · SAA accredited" : ""
                      }`
                    : "Partner"}{" "}
                  · ABN {selO.abn} · {selO.joined}
                </span>

                {selO.note ? (
                  <span className="rounded-[10px] bg-[#FEF3C7] px-3 py-[10px] text-[13px] font-semibold text-[#92400E]">
                    {selO.note}
                  </span>
                ) : null}

                <div className="grid grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-2">
                  {(
                    [
                      ["Customers", String(selO.cust)],
                      ["Jobs", String(selO.jobs)],
                      ["Rating", selO.rating],
                      ["Users", String(selO.users.length)],
                    ] as const
                  ).map(([l, v]) => (
                    <div key={l} className={TILE}>
                      <span className={SUB}>{l}</span>
                      <strong className="text-[18px]">{v}</strong>
                    </div>
                  ))}
                </div>

                <h3 className="mt-1 mb-0 text-[14px]">Status &amp; membership</h3>
                <label className={LBL}>
                  Reason or note (needed to suspend or reject; shown to the account)
                  <input
                    className={INP}
                    value={reason}
                    onChange={(e) => {
                      setReason(e.target.value);
                      setNeedReason(false);
                    }}
                  />
                </label>
                {needReason ? (
                  <span role="alert" className="text-[12px] font-semibold text-[#991B1B]">
                    Add a reason first. It’s kept in the audit log.
                  </span>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  {orgActions.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      className={`${BTN} ${a.cls}`}
                      onClick={a.go}
                    >
                      {a.label}
                    </button>
                  ))}
                </div>

                {selO.kind === "installer" ? (
                  <div className="flex flex-wrap items-end gap-2">
                    <label className={`${LBL} flex-[1_1_200px]`}>
                      Membership
                      <select
                        className={INP}
                        value={tier || selO.tier}
                        onChange={(e) => setTier(e.target.value)}
                      >
                        {Object.keys(TIER).map((k) => (
                          <option key={k} value={k}>
                            {TIER[k]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button type="button" className={BTN} onClick={saveTier}>
                      Change plan
                    </button>
                  </div>
                ) : null}

                <span className={SUB}>
                  Suspending signs every user out straight away. Everything is kept and
                  comes back on reactivation.
                </span>

                <h3 className="mt-1 mb-0 text-[14px]">Users</h3>
                {selO.users.map(([name, role, last]) => (
                  <div key={name} className={ROW}>
                    <span className="flex flex-[1_1_200px] flex-col">
                      <strong className="text-[14px]">{name}</strong>
                      <span className={SUB}>
                        {role} · last sign-in {last}
                      </span>
                    </span>
                    <button
                      type="button"
                      className={`${BTN} h-8`}
                      onClick={() =>
                        startView(
                          name,
                          selO.kind === "installer"
                            ? `Installer · ${selO.name}`
                            : "Operations",
                          selO.kind === "installer" ? INSTALLER_PORTAL : null,
                        )
                      }
                    >
                      View as
                    </button>
                  </div>
                ))}

                <h3 className="mt-1 mb-0 text-[14px]">Documents</h3>
                {selO.docs.map(([n, m, st]) => {
                  const c = st === "Current" ? C.ok : st === "Expired" ? C.bad : C.warn;
                  return (
                    <div key={n} className={ROW}>
                      <span className="flex-[1_1_200px] text-[13px]">
                        <strong>{n}</strong>
                        <br />
                        <span className={SUB}>{m}</span>
                      </span>
                      <Pill bg={c[0]} fg={c[1]}>
                        {st}
                      </Pill>
                    </div>
                  );
                })}

                <h3 className="mt-1 mb-0 text-[14px]">History</h3>
                {(selO.history.length ? selO.history : ["No admin changes yet."]).map(
                  (h, i) => (
                    <div key={`${h}-${i}`} className="py-1 text-[13px]">
                      {h}
                    </div>
                  ),
                )}
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      {/* ===== CUSTOMERS ===== */}
      {screen === "customers" ? (
        <>
          <label className={`${LBL} max-w-[520px]`}>
            Search
            <input
              className={INP}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Name, email, phone, suburb or postcode"
            />
          </label>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(440px,1fr))] items-start gap-4">
            <section className={`${CARD} gap-0 overflow-hidden p-0`} aria-label="Customers">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Customer</th>
                      <th className={TH}>Installer</th>
                      <th className={TH}>Stage</th>
                      <th className={TH}>Login</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {custList.map((c) => (
                      <tr
                        key={c.email}
                        style={{ background: c.i === custSel ? SOFT : "transparent" }}
                      >
                        <td className={TD}>
                          <strong>{c.name}</strong>
                          <br />
                          <span className={SUB}>{c.sub}</span>
                        </td>
                        <td className={TD}>{c.inst}</td>
                        <td className={TD}>
                          <Pill bg={MIST} fg={BODY}>
                            {c.stage}
                          </Pill>
                        </td>
                        <td className={TD}>{c.login ? "On" : "Off"}</td>
                        <td className={TD}>
                          <button
                            type="button"
                            className={`${BTN} h-8`}
                            onClick={() => {
                              setCustSel(c.i);
                              setReason("");
                              setNeedReason(false);
                            }}
                          >
                            Open
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={CARD} aria-label="Customer detail">
              <h2 className="m-0 text-[20px]">{cs.name}</h2>
              <span className="text-[13px] text-[#5B6B80]">
                {cs.sub} · {cs.stage} · {cs.source} · installer {cs.inst}
              </span>

              <div className="grid grid-cols-[auto_1fr] gap-x-[14px] gap-y-[6px] text-[13px]">
                <span className="text-[13px] text-[#5B6B80]">Email</span>
                <strong>{cs.email}</strong>
                <span className="text-[13px] text-[#5B6B80]">Phone</span>
                <strong>{cs.phone}</strong>
                <span className="text-[13px] text-[#5B6B80]">Portal login</span>
                <strong>{cs.login ? "On" : "Off"}</strong>
                <span className="text-[13px] text-[#5B6B80]">SMS consent</span>
                <strong>{cs.sms}</strong>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="button" className={BTN} onClick={custReset}>
                  Send password link
                </button>
                <button type="button" className={BTN} onClick={custToggle}>
                  {cs.login ? "Turn login off" : "Turn login on"}
                </button>
                <button type="button" className={BTN} onClick={custExport}>
                  Download their data
                </button>
              </div>

              <label className={LBL}>
                Reason for viewing as {cs.name.split(" ")[0]}
                <input
                  className={INP}
                  value={reason}
                  onChange={(e) => {
                    setReason(e.target.value);
                    setNeedReason(false);
                  }}
                  placeholder="e.g. Customer called: can’t see their designs"
                />
              </label>
              {needReason ? (
                <span role="alert" className="text-[12px] font-semibold text-[#991B1B]">
                  Add a reason first.
                </span>
              ) : null}
              <button
                type="button"
                className={`${BTN} ${BTN_DARK} self-start`}
                onClick={() => startView(cs.name, "Customer", null)}
              >
                View as customer
              </button>

              <h3 className="mt-1 mb-0 text-[14px]">Records</h3>
              {cs.rec.map(([l, v]) => (
                <Line key={l} l={l} v={String(v)} />
              ))}
              <span className={SUB}>
                “Download their data” is for Privacy Act access requests (APP
                12): every record we hold about this customer, as one file.
              </span>
            </section>
          </div>
        </>
      ) : null}

      {/* ===== APPROVALS ===== */}
      {screen === "approvals" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-start gap-4">
          {queues.map((qq) => (
            <section key={qq.title} className={CARD}>
              <div className="flex items-center gap-2">
                <h2 className={`${H2} grow`}>{qq.title}</h2>
                <Pill bg={C.warn[0]} fg={C.warn[1]}>
                  {String(qq.n)}
                </Pill>
              </div>
              {qq.items.map((i) => (
                <div key={i.t} className={ROW}>
                  <span className="flex flex-[1_1_220px] flex-col">
                    <strong className="text-[14px]">{i.t}</strong>
                    <span className={SUB}>{i.d}</span>
                  </span>
                  {i.btns.map((b) => (
                    <button
                      key={b.l}
                      type="button"
                      className={`${BTN} ${b.cls} h-8`}
                      onClick={b.go}
                    >
                      {b.l}
                    </button>
                  ))}
                </div>
              ))}
              {qq.items.length === 0 && qq.emptyTxt ? (
                <p className="m-0 text-[13px] text-[#5B6B80]">{qq.emptyTxt}</p>
              ) : null}
            </section>
          ))}
        </div>
      ) : null}

      {/* ===== PLANS ===== */}
      {screen === "plans" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] items-start gap-4">
          {plans.map((p, i) => (
            <section
              key={p.key}
              className={CARD}
              style={{ borderTop: `4px solid ${EDGE[p.key]}` }}
            >
              <div className="flex items-center gap-2">
                <h2 className="m-0 grow text-[20px]">{p.name}</h2>
                <Pill bg={MIST} fg={BODY}>
                  {
                    orgs.filter(
                      (o) =>
                        o.kind === "installer" &&
                        o.tier === p.key &&
                        o.status === "active",
                    ).length
                  }{" "}
                  installers
                </Pill>
              </div>
              <label className={LBL}>
                Monthly price ($ ex GST)
                <input
                  className={INP}
                  value={p.price}
                  onChange={(e) =>
                    setPlans((prev) =>
                      prev.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)),
                    )
                  }
                  placeholder="[YOUR PRICE]"
                />
              </label>
              <div className="grid grid-cols-2 gap-2">
                {p.limits.map(([l, v]) => (
                  <div key={l} className={TILE}>
                    <span className={SUB}>{l}</span>
                    <strong>{v}</strong>
                  </div>
                ))}
              </div>
              <ul className="m-0 flex flex-col gap-1 pl-[18px] text-[13px]">
                {p.feats.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              <button
                type="button"
                className={`${BTN} ${BTN_SUN}`}
                onClick={() => {
                  setMsg(
                    `${p.name} plan saved${
                      p.price ? ` at $${p.price}/month ex GST.` : "."
                    }`,
                  );
                  addLog("Edited plan", p.name, p.price ? `Price $${p.price}` : "", "plan");
                }}
              >
                Save {p.name}
              </button>
            </section>
          ))}
        </div>
      ) : null}

      {/* ===== STAFF ===== */}
      {screen === "staff" ? (
        <>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-start gap-4">
            <section className={`${CARD} gap-0 overflow-hidden p-0`} aria-label="Staff">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] border-collapse">
                  <thead>
                    <tr>
                      <th className={TH}>Person</th>
                      <th className={TH}>Admin role</th>
                      <th className={TH}>Order limit</th>
                      <th className={TH}>Two-factor</th>
                      <th className={TH}>Last sign-in</th>
                      <th className={TH} />
                    </tr>
                  </thead>
                  <tbody>
                    {staff.map((s, i) => (
                      <tr key={s.email}>
                        <td className={TD}>
                          <strong>{s.name}</strong>
                          <br />
                          <span className={SUB}>
                            {s.title} · {s.email}
                          </span>
                        </td>
                        <td className={TD}>
                          {s.me ? (
                            <span>
                              {RL[s.role]} <span className={SUB}>(you)</span>
                            </span>
                          ) : (
                            <select
                              className={`${INP} h-[34px] w-auto`}
                              value={s.role}
                              onChange={(e) => {
                                const next = e.target.value;
                                setStaff((prev) =>
                                  prev.map((x, j) => (j === i ? { ...x, role: next } : x)),
                                );
                                setMsg(`${s.name} is now ${RL[next]}.`);
                                addLog(
                                  "Changed admin role",
                                  s.name,
                                  `${RL[s.role]} → ${RL[next]}`,
                                  "staff",
                                );
                              }}
                            >
                              {ROLES.map(([k, l]) => (
                                <option key={k} value={k}>
                                  {l}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className={TD}>{s.limit || "—"}</td>
                        <td
                          className={`${TD} font-semibold`}
                          style={{ color: s.mfa === "On" ? C.ok[1] : RED_2 }}
                        >
                          {s.mfa || "Not set up"}
                        </td>
                        <td className={TD}>{s.active ? s.last : "Deactivated"}</td>
                        <td className={TD}>
                          {!s.me ? (
                            <button
                              type="button"
                              className={`${BTN} h-8`}
                              onClick={() => {
                                setStaff((prev) =>
                                  prev.map((x, j) =>
                                    j === i ? { ...x, active: !x.active } : x,
                                  ),
                                );
                                addLog(
                                  s.active ? "Deactivated staff" : "Reactivated staff",
                                  s.name,
                                  "",
                                  "staff",
                                );
                              }}
                            >
                              {s.active ? "Deactivate" : "Reactivate"}
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section className={CARD}>
              <h2 className={H2}>Invite staff</h2>
              <div className="grid grid-cols-2 gap-[10px]">
                <label className={LBL}>
                  First name
                  <input
                    className={INP}
                    value={inv.first}
                    onChange={(e) => setInv({ ...inv, first: e.target.value })}
                  />
                </label>
                <label className={LBL}>
                  Email
                  <input
                    className={INP}
                    type="email"
                    value={inv.email}
                    onChange={(e) => setInv({ ...inv, email: e.target.value })}
                  />
                </label>
                <label className={LBL}>
                  Job title
                  <input
                    className={INP}
                    value={inv.title}
                    onChange={(e) => setInv({ ...inv, title: e.target.value })}
                  />
                </label>
                <label className={LBL}>
                  Admin role
                  <select
                    className={INP}
                    value={inv.role}
                    onChange={(e) => setInv({ ...inv, role: e.target.value })}
                  >
                    {ROLES.map(([k, l]) => (
                      <option key={k} value={k}>
                        {l}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <button
                type="button"
                className={`${BTN} ${BTN_SUN} self-start`}
                onClick={invite}
              >
                Send invite
              </button>
              <span className={SUB}>
                They get an email to set their own password. Nobody sees or sends
                passwords.
              </span>
            </section>
          </div>

          <section className={CARD}>
            <h2 className={H2}>What each role can do</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>Permission</th>
                    {["Viewer", "Support", "Admin", "Owner"].map((r) => (
                      <th key={r} className={`${TH} text-center`}>
                        {r}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {matrix.map((m) => (
                    <tr key={m.l}>
                      <td className={TD}>{m.l}</td>
                      {m.c.map((c, i) => (
                        <td
                          key={i}
                          className={`${TD} text-center font-bold`}
                          style={{ color: c.col }}
                        >
                          {c.v}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}

      {/* ===== AUDIT ===== */}
      {screen === "audit" ? (
        <>
          <div role="group" aria-label="Show" className="flex flex-wrap gap-[6px]">
            {AUDIT_GROUPS.map(([k, l]) => (
              <Chip key={k} on={auditF === k} label={l} onClick={() => setAuditF(k)} />
            ))}
          </div>
          <section className={`${CARD} gap-0 overflow-hidden p-0`} aria-label="Audit log">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] border-collapse">
                <thead>
                  <tr>
                    <th className={TH}>When</th>
                    <th className={TH}>Who</th>
                    <th className={TH}>What</th>
                    <th className={TH}>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditRows.map((e, i) => (
                    <tr key={`${e.when}-${i}`}>
                      <td className={`${TD} whitespace-nowrap`}>{e.when}</td>
                      <td className={TD}>{e.who}</td>
                      <td className={TD}>
                        {e.what} <strong>{e.target}</strong>
                      </td>
                      <td className={`${TD} text-[#475569]`}>{e.detail}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          <span className={SUB}>
            Entries can’t be edited or deleted, including by Owners.
          </span>
        </>
      ) : null}

      {/* ===== SETTINGS ===== */}
      {screen === "settings" ? (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(420px,1fr))] items-start gap-4">
          <section className={CARD}>
            <h2 className={H2}>Switches</h2>
            <label className={LBL}>
              Banner on every page
              <input
                className={INP}
                value={banner}
                onChange={(e) => setBanner(e.target.value)}
                placeholder="e.g. Portals are down for maintenance Sunday 9–10 pm AEDT"
              />
            </label>
            {switches.map((w) => (
              <label
                key={w.k}
                className="flex items-start gap-[10px] text-[13px] leading-[1.4] text-[#334155]"
              >
                <input
                  type="checkbox"
                  checked={w.on}
                  onChange={() => setFlags((f) => ({ ...f, [w.k]: !f[w.k] }))}
                  className="mt-px h-[18px] w-[18px] shrink-0 accent-[#F68A0A]"
                />
                <span>
                  <strong>{w.t}</strong>
                  <br />
                  {w.d}
                </span>
              </label>
            ))}
            <button
              type="button"
              className={`${BTN} ${BTN_SUN} self-start`}
              onClick={() => {
                setMsg("Settings saved.");
                addLog(
                  "Changed platform settings",
                  "Platform settings",
                  `${banner ? "banner set; " : ""}deal checks ${
                    flags.moderation ? "on" : "off"
                  }`,
                  "set",
                );
              }}
            >
              Save settings
            </button>
            {banner.trim() ? (
              <div className="rounded-lg bg-[#FEF3C7] px-3 py-2 text-center text-[13px] font-semibold text-[#92400E]">
                {banner}
              </div>
            ) : null}
          </section>

          <section className={CARD}>
            <h2 className={H2}>Connections</h2>
            {conns.map((c) => (
              <div key={c.n} className={ROW}>
                <span className="flex flex-[1_1_220px] flex-col">
                  <strong className="text-[14px]">{c.n}</strong>
                  <span className={SUB}>{c.how}</span>
                </span>
                <Pill bg={c.bg} fg={c.fg}>
                  {c.s}
                </Pill>
              </div>
            ))}
            <span className={SUB}>
              Keys are set on the server, never typed into the portal.
            </span>
            <div className="flex flex-wrap gap-2">
              <Go to={ROUTE.theme}>Colour theme</Go>
              <Go to={null}>Insights · Clarity</Go>
              <Link href="/master/ai-control" className={BTN}>
                AI agent controls
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
