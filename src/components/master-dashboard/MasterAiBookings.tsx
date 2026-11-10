"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Operations Portal: bookings the EasyLink AI makes on phone calls (site
 * visits, call backs, service calls), and who receives them. The chosen
 * installer or staff member sees each booking in their Schedule and gets a
 * notification. Times are Sydney time.
 */

type Kind = "SITE_VISIT" | "CALLBACK" | "SERVICE";

type Person = { id: string; name: string; role: "ADMIN" | "INSTALLER" | string; email: string };

type Settings = { assignees: Record<Kind, string | null>; useLeadOwner: boolean };

type Booking = {
  id: string;
  kind: Kind;
  title: string;
  notes: string | null;
  startAt: string;
  endAt: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  bookedAt: string;
  assignee: { id: string; name: string; role: string } | null;
  lead: { id: string; customerName: string; customerPhone: string | null; address: string | null; status: string } | null;
  /** Still with the AI's own account: someone needs to take it. */
  withAiAccount: boolean;
};

const KINDS: { key: Kind; label: string; hint: string }[] = [
  { key: "SITE_VISIT", label: "Site visits", hint: "One-hour visit to measure up and quote" },
  { key: "CALLBACK", label: "Call backs", hint: "Caller asked for a person, or called out of hours" },
  { key: "SERVICE", label: "Service calls", hint: "Faults and warranty; safety issues are flagged urgent" },
];

const KIND_LABEL: Record<Kind, string> = { SITE_VISIT: "Site visit", CALLBACK: "Call back", SERVICE: "Service" };
const KIND_STYLE: Record<Kind, { background: string; color: string }> = {
  SITE_VISIT: { background: "#E0F2FE", color: "#0B2540" },
  CALLBACK: { background: "#FEF3C7", color: "#92400E" },
  SERVICE: { background: "#FCE7F3", color: "#9D174D" },
};

const TZ = "Australia/Sydney";
const fmt = (iso: string) =>
  new Date(iso).toLocaleString("en-AU", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: TZ });

const roleLabel = (r: string) => (r === "INSTALLER" ? "Installer" : r === "ADMIN" ? "Staff" : r);

async function call<T>(url: string, init?: RequestInit): Promise<{ ok: boolean; data?: T; message?: string }> {
  try {
    const res = await fetch(url, { cache: "no-store", ...init });
    const json = (await res.json().catch(() => ({}))) as { data?: T; message?: string };
    return { ok: res.ok, data: json.data, message: json.message };
  } catch {
    return { ok: false, message: "Couldn't reach EasyLink. Try again." };
  }
}

function PersonSelect({
  id,
  value,
  people,
  onChange,
  emptyLabel,
  disabled,
}: {
  id: string;
  value: string | null;
  people: Person[];
  onChange: (v: string | null) => void;
  emptyLabel: string;
  disabled?: boolean;
}) {
  const installers = people.filter((p) => p.role === "INSTALLER");
  const staff = people.filter((p) => p.role !== "INSTALLER");
  return (
    <select
      id={id}
      value={value ?? ""}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value || null)}
      className="h-10 w-full rounded-[10px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A] disabled:opacity-60"
    >
      <option value="">{emptyLabel}</option>
      {installers.length ? (
        <optgroup label="Installers">
          {installers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ) : null}
      {staff.length ? (
        <optgroup label="EasyLink staff">
          {staff.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </optgroup>
      ) : null}
    </select>
  );
}

export function MasterAiBookings() {
  const [people, setPeople] = useState<Person[]>([]);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [saved, setSaved] = useState<Settings | null>(null);
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<"upcoming" | "unassigned" | "all">("upcoming");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const loadBookings = useCallback(async () => {
    const r = await call<Booking[]>("/api/admin/ai-bookings");
    setNow(Date.now());
    if (r.ok && Array.isArray(r.data)) setBookings(r.data);
    else {
      setBookings((b) => b ?? []);
      setError(r.message || "Couldn't load AI bookings.");
    }
  }, []);

  useEffect(() => {
    const t = window.setTimeout(async () => {
      const r = await call<{ settings: Settings; people: Person[] }>("/api/admin/ai-bookings/settings");
      if (r.ok && r.data) {
        setPeople(r.data.people);
        setSettings(r.data.settings);
        setSaved(r.data.settings);
      } else setError(r.message || "Couldn't load the settings.");
      await loadBookings();
    }, 0);
    const poll = window.setInterval(() => void loadBookings(), 60_000);
    return () => {
      window.clearTimeout(t);
      window.clearInterval(poll);
    };
  }, [loadBookings]);

  const dirty = useMemo(() => JSON.stringify(settings) !== JSON.stringify(saved), [settings, saved]);
  const nameOf = (id: string | null) => people.find((p) => p.id === id)?.name ?? null;

  const shown = useMemo(() => {
    const list = bookings ?? [];
    if (filter === "all") return list;
    if (filter === "unassigned") return list.filter((b) => b.status === "SCHEDULED" && b.withAiAccount);
    return list.filter((b) => b.status === "SCHEDULED" && new Date(b.endAt).getTime() >= now);
  }, [bookings, filter, now]);

  async function save() {
    if (!settings) return;
    setSaving(true);
    setNotice(null);
    const r = await call<Settings>("/api/admin/ai-bookings/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    if (r.ok && r.data) {
      setSaved(r.data);
      setSettings(r.data);
      setNotice("Saved. New AI bookings will go to the people you chose.");
    } else setError(r.message || "Couldn't save. Try again.");
  }

  async function reassign(b: Booking, userId: string | null) {
    if (!userId) return;
    setBusyId(b.id);
    setNotice(null);
    const r = await call(`/api/admin/ai-bookings/${b.id}/assignee`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    setBusyId(null);
    if (r.ok) {
      setNotice(`${KIND_LABEL[b.kind]} for ${b.lead?.customerName ?? "the customer"} given to ${nameOf(userId)}. They've been notified.`);
      await loadBookings();
    } else setError(r.message || "Couldn't reassign. Try again.");
  }

  const counts = useMemo(() => {
    const list = (bookings ?? []).filter((b) => b.status === "SCHEDULED" && new Date(b.endAt).getTime() >= now);
    return {
      SITE_VISIT: list.filter((b) => b.kind === "SITE_VISIT").length,
      CALLBACK: list.filter((b) => b.kind === "CALLBACK").length,
      SERVICE: list.filter((b) => b.kind === "SERVICE").length,
    };
  }, [bookings, now]);

  return (
    <div className="flex min-h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-white px-8 py-3.5">
        <nav aria-label="Breadcrumb" className="flex-grow text-[13px] text-[#5B6B80]">
          Operations <span aria-hidden>/</span> <span className="font-semibold text-[#0F172A]">AI bookings</span>
        </nav>
      </header>

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-[18px] px-4 py-6 pb-14 sm:px-8">
        <div>
          <h1 className="m-0 font-source-sans text-[28px] font-bold text-[#0F172A]">AI bookings</h1>
          <p className="mt-1 max-w-[75ch] text-[13px] leading-[20px] text-[#5B6B80]">
            Site visits, call backs and service calls the EasyLink AI books on the phone. Choose who receives each kind. They see the booking in
            their Schedule, get a notification, and get the customer&apos;s details if the lead isn&apos;t already with someone.
          </p>
        </div>

        {error ? (
          <p role="alert" className="m-0 rounded-[10px] border border-red-300 bg-red-50 px-3 py-2 text-[13px] text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p role="status" className="m-0 rounded-[10px] border border-green-300 bg-green-50 px-3 py-2 text-[13px] font-semibold text-green-700">
            {notice}
          </p>
        ) : null}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {KINDS.map((k) => (
            <div key={k.key} className="flex flex-col gap-0.5 rounded-[14px] border border-[#E3E8EF] bg-white px-4 py-3">
              <span className="text-[12px] text-[#5B6B80]">Upcoming {k.label.toLowerCase()}</span>
              <strong className="text-[24px] text-[#0F172A]">{bookings === null ? "–" : counts[k.key]}</strong>
            </div>
          ))}
        </div>

        <section aria-labelledby="who-gets" className="flex flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <div>
            <h2 id="who-gets" className="m-0 text-[16px] font-bold text-[#0F172A]">
              Who gets AI bookings
            </h2>
            <p className="m-0 mt-1 text-[12px] text-[#5B6B80]">Applies to new bookings. Change an existing one in the list below.</p>
          </div>

          {settings ? (
            <>
              <label className="flex items-start gap-2.5 text-[13px] text-[#0F172A]">
                <input
                  type="checkbox"
                  checked={settings.useLeadOwner}
                  onChange={(e) => setSettings({ ...settings, useLeadOwner: e.target.checked })}
                  className="mt-0.5 h-4 w-4 accent-[#F68A0A]"
                />
                <span>
                  <strong>Give it to the lead&apos;s installer when there is one</strong>
                  <span className="block text-[12px] text-[#5B6B80]">
                    If the caller&apos;s lead is already with an installer or staff member, they get the booking. Otherwise it goes to the person below.
                  </span>
                </span>
              </label>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                {KINDS.map((k) => (
                  <div key={k.key} className="flex flex-col gap-1.5">
                    <label htmlFor={`assignee-${k.key}`} className="text-[13px] font-semibold text-[#0F172A]">
                      {k.label}
                    </label>
                    <PersonSelect
                      id={`assignee-${k.key}`}
                      value={settings.assignees[k.key]}
                      people={people}
                      emptyLabel="Not chosen (stays with the AI account)"
                      onChange={(v) => setSettings({ ...settings, assignees: { ...settings.assignees, [k.key]: v } })}
                    />
                    <span className="text-[11px] text-[#5B6B80]">{k.hint}</span>
                  </div>
                ))}
              </div>

              {Object.values(settings.assignees).some((v) => !v) ? (
                <p className="m-0 rounded-[10px] border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 text-[12px] text-[#92400E]">
                  Bookings of a kind with no one chosen stay with the AI account, which no one checks. Choose someone for each kind.
                </p>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!dirty || saving}
                  onClick={() => void save()}
                  className="h-10 rounded-[10px] bg-[#F68A0A] px-4 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                {dirty ? (
                  <button
                    type="button"
                    onClick={() => setSettings(saved)}
                    className="h-10 rounded-[10px] border border-[#CBD5E1] bg-white px-4 text-[13px] font-semibold text-[#0F172A]"
                  >
                    Undo changes
                  </button>
                ) : null}
              </div>
            </>
          ) : (
            <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p>
          )}
        </section>

        <section aria-labelledby="bookings" className="flex flex-col gap-3 rounded-[14px] border border-[#E3E8EF] bg-white p-[18px]">
          <div className="flex flex-wrap items-center gap-3">
            <h2 id="bookings" className="m-0 mr-auto text-[16px] font-bold text-[#0F172A]">
              Bookings
            </h2>
            <div role="group" aria-label="Filter bookings" className="flex flex-wrap gap-1.5">
              {(
                [
                  { key: "upcoming", label: "Upcoming" },
                  { key: "unassigned", label: `Needs someone${bookings ? ` · ${bookings.filter((b) => b.status === "SCHEDULED" && b.withAiAccount).length}` : ""}` },
                  { key: "all", label: "All (last 7 days and next 60)" },
                ] as const
              ).map((f) => {
                const on = filter === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setFilter(f.key)}
                    className="h-[32px] rounded-full border px-3 text-[12px] font-semibold"
                    style={on ? { background: "#0B1A2E", borderColor: "#0B1A2E", color: "#FFFFFF" } : { background: "#FFFFFF", borderColor: "#CBD5E1", color: "#0F172A" }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          {bookings === null ? <p className="m-0 text-[13px] text-[#5B6B80]">Loading…</p> : null}
          {bookings !== null && !shown.length ? (
            <p className="m-0 text-[13px] text-[#5B6B80]">
              {filter === "unassigned" ? "Nothing waiting. Every booking has someone." : "No AI bookings yet. They appear here as the AI takes calls."}
            </p>
          ) : null}

          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {shown.map((b) => (
              <li key={b.id} className="grid grid-cols-1 items-start gap-3 rounded-[12px] border border-[#E3E8EF] p-3.5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(220px,0.9fr)]">
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={KIND_STYLE[b.kind]}>
                      {KIND_LABEL[b.kind]}
                    </span>
                    {b.title.startsWith("URGENT") ? (
                      <span className="rounded-full bg-[#FEE2E2] px-2.5 py-0.5 text-[11px] font-bold text-[#991B1B]">Safety</span>
                    ) : null}
                    {b.status !== "SCHEDULED" ? (
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-0.5 text-[11px] font-bold text-[#475569]">
                        {b.status === "COMPLETED" ? "Done" : "Cancelled"}
                      </span>
                    ) : null}
                  </div>
                  <strong className="text-[14px] text-[#0F172A]">{b.lead?.customerName ?? "Customer"}</strong>
                  <span className="text-[12px] text-[#5B6B80]">
                    {[b.lead?.customerPhone, b.lead?.address].filter(Boolean).join(" · ") || "No contact details yet"}
                  </span>
                </div>
                <div className="flex flex-col gap-1 text-[13px] text-[#0F172A]">
                  <strong>{fmt(b.startAt)}</strong>
                  <span className="text-[12px] text-[#5B6B80]">Booked {fmt(b.bookedAt)}</span>
                  {b.notes ? <span className="line-clamp-2 text-[12px] text-[#5B6B80]">{b.notes.replace(/^Booked by EasyLink AI on a call\.\s*/, "")}</span> : null}
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`re-${b.id}`} className="text-[12px] font-semibold text-[#5B6B80]">
                    {b.withAiAccount ? "Needs someone" : `With ${b.assignee?.name} (${roleLabel(b.assignee?.role ?? "")})`}
                  </label>
                  <PersonSelect
                    id={`re-${b.id}`}
                    value={null}
                    people={people.filter((p) => p.id !== b.assignee?.id)}
                    emptyLabel={b.withAiAccount ? "Give to…" : "Give to someone else…"}
                    disabled={busyId === b.id || b.status !== "SCHEDULED"}
                    onChange={(v) => void reassign(b, v)}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
