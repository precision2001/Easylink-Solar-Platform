"use client";

import Link from "next/link";
import Icon from "@/components/ui/Icons";

type Tone = { bg: string; fg: string };

const OK: Tone = { bg: "#DCFCE7", fg: "#166534" };
const WARN: Tone = { bg: "#FEF3C7", fg: "#92400E" };
const INFO: Tone = { bg: "#DBEAFE", fg: "#1E40AF" };
const IDLE: Tone = { bg: "#E2E8F0", fg: "#334155" };
const BAD: Tone = { bg: "#FEE2E2", fg: "#991B1B" };
const HUMAN: Tone = { bg: "#E0EAF7", fg: "#0B2540" };
const AI: Tone = { bg: "#FFE7C2", fg: "#3B1D00" };

/**
 * Sample data matching the Easylink Designer "Contact Centre" mock exactly
 * (figures, names, timings) — there's no queue/routing/AI-voice-agent
 * backend behind this yet, so unlike the dashboard (real installers/leads/
 * invoices) this page is illustrative by nature until that's built.
 */
const KPIS = [
  { label: "Calls waiting", value: "3", sub: "Longest 0:48 · Sales", subColor: "#92400E" },
  { label: "Agents available", value: "4 / 11", sub: "3 AI agents always on", subColor: "#166534" },
  { label: "Answered today", value: "186", sub: "+12% vs last Saturday", subColor: "#166534" },
  { label: "Outbound connects", value: "94", sub: "31% connect rate", subColor: "#475569" },
  { label: "Service level (80/20)", value: "87%", sub: "Target 80%", subColor: "#166534" },
  { label: "Abandon rate", value: "3.1%", sub: "Target under 5%", subColor: "#166534" },
  { label: "Avg handle time", value: "4:52", sub: "Talk 3:58 · Wrap 0:54", subColor: "#475569" },
  { label: "Site visits booked", value: "23", sub: "9 booked by AI agents", subColor: "#1E40AF" },
] as const;

const QUEUES = [
  { name: "Sales – new solar", waiting: 2, longest: "0:48", agents: "3 + AI", sla: "84%", overflow: "Voxa Sales Qualifier after 45 s", ...OK },
  { name: "Battery & rebates", waiting: 1, longest: "0:21", agents: "2", sla: "91%", overflow: "Voicemail after 90 s", ...OK },
  { name: "Service & warranty", waiting: 0, longest: "—", agents: "2", sla: "76%", overflow: "Callback request", ...WARN },
  { name: "Installer partner line", waiting: 0, longest: "—", agents: "1", sla: "95%", overflow: "Sales queue", ...OK },
  { name: "After hours", waiting: 0, longest: "—", agents: "AI only", sla: "100%", overflow: "Voxa Receptionist", ...INFO },
] as const;

const HOURS = (
  [
    [8, 6, 9], [9, 14, 22], [10, 22, 31], [11, 19, 28], [12, 12, 15], [13, 17, 26],
    [14, 21, 30], [15, 18, 24], [16, 15, 19], [17, 11, 12], [18, 6, 4], [19, 3, 0],
  ] as const
).map(([h, inb, out]) => ({
  label: `${h > 12 ? h - 12 : h}${h >= 12 ? "p" : "a"}`,
  inb,
  out,
}));
const MAX_HOUR_VOL = Math.max(...HOURS.map((h) => Math.max(h.inb, h.out)));

const AGENTS = [
  { initials: "SP", name: "Sam Patel", role: "Sales · Team lead", status: "On call", activity: "Outbound · Sydney Spring Battery campaign · 06:12", calls: 28, aht: "5:10", booked: 4, ...INFO, av: HUMAN },
  { initials: "MO", name: "Mia O'Connor", role: "Sales", status: "Available", activity: "Idle 0:42 · next in power dialer", calls: 31, aht: "4:31", booked: 5, ...OK, av: HUMAN },
  { initials: "JT", name: "Jack Thompson", role: "Battery & rebates", status: "On call", activity: "Inbound · Battery & rebates · 02:37", calls: 19, aht: "6:02", booked: 2, ...INFO, av: HUMAN },
  { initials: "PN", name: "Priya Nair", role: "Service & warranty", status: "Wrap-up", activity: "Wrap-up 0:35 · warranty claim notes", calls: 14, aht: "7:15", booked: 0, ...WARN, av: HUMAN },
  { initials: "LC", name: "Liam Chen", role: "Sales", status: "Break", activity: "Lunch · back 1:30 pm", calls: 22, aht: "4:48", booked: 3, ...IDLE, av: HUMAN },
  { initials: "AI", name: "Voxa · Sales Qualifier", role: "AI voice agent · outbound", status: "On call", activity: "4 parallel calls · qualifying homeowners", calls: 63, aht: "2:44", booked: 6, ...INFO, av: AI },
  { initials: "AI", name: "Voxa · Receptionist", role: "AI voice agent · inbound overflow", status: "Available", activity: "Answers overflow and after-hours calls", calls: 17, aht: "1:58", booked: 3, ...OK, av: AI },
  { initials: "AI", name: "Voxa · Reminder", role: "AI voice agent · reminders", status: "On call", activity: "Install-day reminders · 12 of 40 done", calls: 12, aht: "0:56", booked: 0, ...INFO, av: AI },
] as const;

const CALLS = [
  { contact: "Karen Whitfield", number: "0412 *** 318", dir: "Outbound", queue: "Sydney Spring Battery", agent: "Sam Patel", dur: "06:12", sent: "Positive", ...OK },
  { contact: "David Nguyen", number: "02 9*** 4471", dir: "Inbound", queue: "Battery & rebates", agent: "Jack Thompson", dur: "02:37", sent: "Neutral", ...IDLE },
  { contact: "Unknown caller", number: "0438 *** 902", dir: "Inbound", queue: "Sales – new solar", agent: "Voxa · Receptionist", dur: "00:52", sent: "Neutral", ...IDLE },
  { contact: "Raj Malhotra", number: "0401 *** 660", dir: "Outbound", queue: "AI qualification – Western Sydney", agent: "Voxa · Sales Qualifier", dur: "03:05", sent: "Positive", ...OK },
  { contact: "Helen Brooks", number: "07 3*** 1180", dir: "Inbound", queue: "Service & warranty", agent: "Priya Nair (transfer)", dur: "08:44", sent: "Frustrated", ...BAD },
] as const;

function Badge({ children, tone }: { children: React.ReactNode; tone: Tone }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-bold"
      style={{ background: tone.bg, color: tone.fg }}
    >
      {children}
    </span>
  );
}

export function MasterContactCentre() {
  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Communication <span aria-hidden="true">/</span>{" "}
          <span className="font-semibold text-[#0F172A]">Contact Centre</span>
        </nav>
        <Badge tone={INFO}>Sample data</Badge>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-8 py-6 pb-14">
        <div className="flex flex-wrap items-start justify-between gap-3.5">
          <div>
            <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">
              Contact Centre
            </h1>
            <p className="mt-1 max-w-[70ch] text-[13px] leading-[20px] text-[#5B6B80]">
              Live queues, agents and calls across voice and AI agents. This
              page shows the same sample figures as the Easylink Designer
              mock — call routing, AI voice agents and real-time queue data
              aren&apos;t connected to this app yet.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <span
              title="Uploading contact lists isn't built yet"
              className="flex h-10 cursor-not-allowed items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
            >
              Upload contacts
            </span>
            <span
              title="Outbound campaigns aren't built yet"
              className="flex h-10 cursor-not-allowed items-center rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[14px] font-semibold text-[#94A3B8]"
            >
              New campaign
            </span>
            <Link
              href="/master/dialer"
              className="flex h-10 items-center gap-2 rounded-[10px] bg-[#F68A0A] px-4 text-[14px] font-bold text-[#3B1D00] no-underline"
            >
              <Icon name="Phone" className="size-4" />
              Start dialling
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {KPIS.map((k) => (
            <div
              key={k.label}
              className="flex flex-col gap-1 rounded-[14px] border border-[#E3E8EF] bg-white p-4"
            >
              <span className="text-[12px] font-semibold text-[#5B6B80]">
                {k.label}
              </span>
              <span className="font-source-sans text-[24px] font-bold text-[#0F172A]">
                {k.value}
              </span>
              <span className="text-[12px] font-semibold" style={{ color: k.subColor }}>
                {k.sub}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.3fr_1fr]">
          <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Queues</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[#475569]">
                    <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Queue</th>
                    <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">Waiting</th>
                    <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Agents</th>
                    <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">SLA</th>
                    <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Overflow</th>
                  </tr>
                </thead>
                <tbody>
                  {QUEUES.map((q) => (
                    <tr key={q.name}>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 font-semibold">
                        {q.name}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                        {q.waiting > 0 ? (
                          <Badge tone={{ bg: q.bg, fg: q.fg }}>
                            {q.waiting} · {q.longest}
                          </Badge>
                        ) : (
                          <span className="text-[#5B6B80]">0</span>
                        )}
                      </td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5">{q.agents}</td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 tabular-nums">{q.sla}</td>
                      <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#475569]">
                        {q.overflow}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
            <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
              Inbound vs outbound by hour
            </h2>
            <div className="flex h-[140px] items-end gap-1.5">
              {HOURS.map((h) => (
                <div
                  key={h.label}
                  className="flex flex-1 flex-col items-center justify-end gap-1"
                  title={`${h.label}: ${h.inb} inbound · ${h.out} outbound`}
                >
                  <div className="flex h-full w-full items-end gap-[2px]">
                    <div
                      className="flex-1 rounded-t-sm bg-[#1976D2]"
                      style={{ height: `${(h.inb / MAX_HOUR_VOL) * 100}%` }}
                    />
                    <div
                      className="flex-1 rounded-t-sm bg-[#F68A0A]"
                      style={{ height: `${(h.out / MAX_HOUR_VOL) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#5B6B80]">{h.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 text-[12px] text-[#475569]">
                <span className="size-2.5 rounded-sm bg-[#1976D2]" /> Inbound
              </span>
              <span className="flex items-center gap-1.5 text-[12px] text-[#475569]">
                <span className="size-2.5 rounded-sm bg-[#F68A0A]" /> Outbound
              </span>
            </div>
          </section>
        </div>

        <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">
            Agents &amp; AI agents
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Agent</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Status</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Activity</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">Calls</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">AHT</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">Booked</th>
                </tr>
              </thead>
              <tbody>
                {AGENTS.map((a) => (
                  <tr key={a.name}>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      <span className="flex items-center gap-2.5">
                        <span
                          className="flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                          style={{ background: a.av.bg, color: a.av.fg }}
                        >
                          {a.initials}
                        </span>
                        <span className="flex flex-col">
                          <span className="font-semibold text-[#0F172A]">{a.name}</span>
                          <span className="text-[11px] text-[#5B6B80]">{a.role}</span>
                        </span>
                      </span>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      <Badge tone={{ bg: a.bg, fg: a.fg }}>{a.status}</Badge>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#475569]">
                      {a.activity}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                      {a.calls}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                      {a.aht}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                      {a.booked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="flex flex-col gap-2.5 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <h2 className="m-0 text-[16px] font-bold text-[#0F172A]">Live calls</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[#475569]">
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Contact</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Direction</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Queue</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Agent</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 text-right font-semibold">Duration</th>
                  <th className="border-b border-[#E3E8EF] px-2 py-2 font-semibold">Sentiment</th>
                </tr>
              </thead>
              <tbody>
                {CALLS.map((c) => (
                  <tr key={`${c.contact}-${c.number}`}>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      <span className="flex flex-col">
                        <span className="font-semibold text-[#0F172A]">{c.contact}</span>
                        <span className="text-[11px] text-[#5B6B80]">{c.number}</span>
                      </span>
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">{c.dir}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-[#475569]">
                      {c.queue}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">{c.agent}</td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5 text-right tabular-nums">
                      {c.dur}
                    </td>
                    <td className="border-b border-[#EEF2F6] px-2 py-2.5">
                      <Badge tone={{ bg: c.bg, fg: c.fg }}>{c.sent}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
