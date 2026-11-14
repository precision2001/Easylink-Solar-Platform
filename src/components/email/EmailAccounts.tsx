"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PROVIDER_DOT, PROVIDER_LABEL, call, emailBase, emailPage, shortTime, type Account, type EmailPortal, type EmailStatus, type Provider } from "./api";

/**
 * Email › Accounts: connect Outlook or Gmail with Microsoft or Google sign-in
 * (the portal never sees the password), choose sync settings, and manage the
 * connected mailboxes. Matches the "Email — Connect Outlook & Gmail" design.
 */

const MUTED = "#5B6B80";
const BORDER = "#E2E8F0";
const BLUE = "#1976D2";

const PROVIDERS: { key: Provider; slug: "microsoft" | "google"; title: string; sub: string; points: string[]; signIn: string; tint: string }[] = [
  {
    key: "MICROSOFT",
    slug: "microsoft",
    title: "Microsoft Outlook",
    sub: "Microsoft 365, Exchange Online, Outlook.com",
    points: ["Read and send mail as this mailbox", "Personal or shared mailboxes (e.g. sales@, info@)"],
    signIn: "Sign in with Microsoft",
    tint: "#E3F2FD",
  },
  {
    key: "GOOGLE",
    slug: "google",
    title: "Gmail",
    sub: "Gmail and Google Workspace",
    points: ["Read and send mail as this account", "Workspace aliases and delegated inboxes"],
    signIn: "Sign in with Google",
    tint: "#FFEDD5",
  },
];

export function EmailAccounts({ portal }: { portal: EmailPortal }) {
  const base = emailBase(portal);
  const staff = portal === "admin";
  const [status, setStatus] = useState<EmailStatus | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [shared, setShared] = useState(false);
  const [visibility, setVisibility] = useState<"OWNER" | "STAFF">("OWNER");
  const [historyDays, setHistoryDays] = useState(90);
  const [autoLink, setAutoLink] = useState(true);
  const [createLeads, setCreateLeads] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [label, setLabel] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [banner, setBanner] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [s, a] = await Promise.all([call<EmailStatus>(`${base}/status`), call<Account[]>(`${base}/accounts`)]);
    setStatus(s.data ?? null);
    setAccounts(a.data ?? []);
  }, [base]);

  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
      const q = new URLSearchParams(window.location.search);
      if (q.get("connected")) setBanner({ ok: true, text: `Connected ${q.get("connected")}. Your mail is syncing now.` });
      else if (q.get("error")) setBanner({ ok: false, text: q.get("error")! });
    }, 0);
    return () => window.clearTimeout(t);
  }, [load]);

  const connect = async (slug: "microsoft" | "google", loginHint?: string) => {
    setBusy(slug);
    const r = await call<{ url: string }>(`${base}/oauth/${slug}/start`, {
      method: "POST",
      body: JSON.stringify({
        label: label.trim() || null,
        shared,
        visibility: staff ? visibility : "OWNER",
        historyDays,
        autoLink,
        createLeads: staff ? createLeads : false,
        aiEnabled,
        ...(loginHint ? { loginHint } : {}),
      }),
    });
    if (r.data?.url) {
      window.location.assign(r.data.url);
      return;
    }
    setBusy(null);
    setBanner({ ok: false, text: r.message ?? "Couldn't start sign-in." });
  };

  const patch = async (a: Account, data: Partial<Account>) => {
    setAccounts((xs) => xs.map((x) => (x.id === a.id ? { ...x, ...data } : x)));
    const r = await call(`${base}/accounts/${a.id}`, { method: "PATCH", body: JSON.stringify(data) });
    if (!r.ok) {
      setBanner({ ok: false, text: r.message ?? "Couldn't save that change." });
      void load();
    }
  };

  const disconnect = async (a: Account) => {
    if (!window.confirm(`Disconnect ${a.address}? Its emails will be removed from the portal and syncing stops.`)) return;
    setBusy(a.id);
    const r = await call(`${base}/accounts/${a.id}`, { method: "DELETE" });
    setBusy(null);
    setBanner(r.ok ? { ok: true, text: `Disconnected ${a.address}.` } : { ok: false, text: r.message ?? "Couldn't disconnect." });
    void load();
  };

  const sync = async (a: Account) => {
    setBusy(a.id);
    const r = await call<{ added: number }>(`${base}/accounts/${a.id}/sync`, { method: "POST" });
    setBusy(null);
    setBanner(r.ok ? { ok: true, text: `${a.address}: ${r.data?.added ?? 0} new emails.` } : { ok: false, text: r.message ?? "Sync failed." });
    void load();
  };

  const check = "h-[18px] w-[18px] accent-[#1976D2]";

  return (
    <div className="box-border px-9 pb-12 pt-7" style={{ color: "#0F172A", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div className="flex max-w-[1080px] flex-col gap-7">
        <div>
          <p className="mb-1.5 text-[13px]" style={{ color: MUTED }}>
            <Link href={emailPage(portal)}>Email</Link> › Accounts
          </p>
          <h1 className="mb-1.5 text-[32px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Connect email accounts
          </h1>
          <p className="max-w-[680px] text-[15px] leading-relaxed" style={{ color: "#475569" }}>
            Bring your Outlook and Gmail mailboxes into the portal. Mail is matched to customers and leads automatically, and replies go out from your own address.
          </p>
        </div>

        {banner ? (
          <p
            role="status"
            className="rounded-xl px-4 py-3 text-[14px] font-semibold"
            style={banner.ok ? { background: "#DCFCE7", color: "#14532D" } : { background: "#FEE2E2", color: "#991B1B" }}
          >
            {banner.text}
          </p>
        ) : null}

        <section aria-label="Choose a provider" className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
          {PROVIDERS.map((p) => {
            const ready = status ? (p.key === "MICROSOFT" ? status.microsoft : status.google) : false;
            return (
              <div key={p.key} className="flex flex-col gap-4 rounded-[20px] bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: p.tint }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={PROVIDER_DOT[p.key]} strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="5" width="18" height="14" rx="2" />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-[22px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
                      {p.title}
                    </h2>
                    <p className="text-[13px]" style={{ color: MUTED }}>
                      {p.sub}
                    </p>
                  </div>
                </div>
                <ul className="list-disc pl-5 text-[14px] leading-7" style={{ color: "#334155" }}>
                  {p.points.map((x) => (
                    <li key={x}>{x}</li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={!ready || busy === p.slug}
                  onClick={() => void connect(p.slug)}
                  className="h-12 cursor-pointer rounded-xl text-[15px] font-semibold disabled:cursor-not-allowed"
                  style={ready ? { background: BLUE, color: "#FFFFFF" } : { background: "#E2E8F0", color: "#475569" }}
                >
                  {ready ? (busy === p.slug ? "Opening sign-in…" : p.signIn) : `${PROVIDER_LABEL[p.key]} sign-in not set up yet`}
                </button>
                {!ready && status && staff ? (
                  <p className="text-[12px]" style={{ color: MUTED }}>
                    Needs the {p.key === "MICROSOFT" ? "Microsoft Entra app" : "Google OAuth client"} keys on the server. Redirect URI:{" "}
                    <code className="break-all">{p.key === "MICROSOFT" ? status.redirectUris.microsoft : status.redirectUris.google}</code>
                  </p>
                ) : null}
              </div>
            );
          })}
        </section>

        <section aria-labelledby="sync-h" className="flex flex-col gap-5 rounded-[20px] bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
          <h2 id="sync-h" className="text-[22px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Settings for the next mailbox you connect
          </h2>
          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}>
            <div className="flex flex-col gap-2">
              <label htmlFor="acc-label" className="text-[14px] font-semibold">
                Name in the inbox
              </label>
              <input id="acc-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Sales" maxLength={60} className="h-11 rounded-xl px-3 text-[14px]" style={{ border: "1px solid #2196F3" }} />
              <label htmlFor="history" className="mt-2 text-[14px] font-semibold">
                Import history
              </label>
              <select id="history" value={historyDays} onChange={(e) => setHistoryDays(Number(e.target.value))} className="h-11 rounded-xl bg-white px-3 text-[14px]" style={{ border: "1px solid #2196F3" }}>
                <option value={90}>Last 90 days</option>
                <option value={30}>Last 30 days</option>
                <option value={365}>Last 12 months</option>
                <option value={0}>New mail only</option>
              </select>
            </div>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2.5 text-[14px] font-semibold">Mailbox type</legend>
              <label className="flex items-start gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                <input type="radio" name="mtype" checked={!shared} onChange={() => { setShared(false); setVisibility("OWNER"); }} className={check} />
                <span>
                  <strong style={{ color: "#0F172A" }}>Personal</strong>
                  <br />
                  Only you see this inbox
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                <input type="radio" name="mtype" checked={shared} onChange={() => { setShared(true); if (staff) setVisibility("STAFF"); }} className={check} />
                <span>
                  <strong style={{ color: "#0F172A" }}>Team inbox</strong>
                  <br />
                  {staff ? "Every EasyLink staff member sees it" : "Replies sign off as the business"}
                </span>
              </label>
            </fieldset>
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-2.5 text-[14px] font-semibold">Automation</legend>
              <label className="flex items-center gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                <input type="checkbox" checked={autoLink} onChange={(e) => setAutoLink(e.target.checked)} className={check} /> Link mail to customers and leads
              </label>
              {staff ? (
                <label className="flex items-center gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                  <input type="checkbox" checked={createLeads} onChange={(e) => setCreateLeads(e.target.checked)} className={check} /> Create leads from new enquiries
                </label>
              ) : null}
              <label className="flex items-center gap-2.5 text-[14px]" style={{ color: "#334155" }}>
                <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className={check} /> EasyLink AI summaries and reply drafts
              </label>
            </fieldset>
          </div>
        </section>

        <section aria-labelledby="conn-h" className="flex flex-col gap-4 rounded-[20px] bg-white p-6" style={{ border: `1px solid ${BORDER}` }}>
          <h2 id="conn-h" className="text-[22px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            Connected accounts
          </h2>
          {accounts.length === 0 ? (
            <p className="text-[14px]" style={{ color: MUTED }}>
              No mailboxes connected yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] border-collapse text-[14px]">
                <thead>
                  <tr className="text-left text-[12px] uppercase tracking-wider" style={{ color: MUTED }}>
                    {["Account", "Provider", "Type", staff ? "Visible to" : "Owner", "Options", "Status", ""].map((h, i) => (
                      <th key={i} className="px-3 py-2.5 font-semibold" style={{ borderBottom: `1px solid ${BORDER}` }}>
                        {h || <span className="sr-only">Actions</span>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accounts.map((a) => {
                    const can = a.mine || staff;
                    return (
                      <tr key={a.id} style={{ borderBottom: "1px solid #EEF2F6" }}>
                        <td className="px-3 py-3.5">
                          <span className="block font-semibold">{a.address}</span>
                          {a.label ? <span className="text-[12px]" style={{ color: MUTED }}>{a.label}</span> : null}
                        </td>
                        <td className="px-3 py-3.5">
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: PROVIDER_DOT[a.provider] }} />
                            {PROVIDER_LABEL[a.provider]}
                          </span>
                        </td>
                        <td className="px-3 py-3.5">{a.shared ? "Team inbox" : "Personal"}</td>
                        <td className="px-3 py-3.5">
                          {staff && can ? (
                            <select
                              aria-label={`Who sees ${a.address}`}
                              value={a.visibility}
                              onChange={(e) => void patch(a, { visibility: e.target.value as "OWNER" | "STAFF" })}
                              className="h-9 rounded-lg bg-white px-2 text-[13px]"
                              style={{ border: "1px solid #CBD5E1" }}
                            >
                              <option value="OWNER">Only {a.mine ? "me" : a.owner ?? "owner"}</option>
                              <option value="STAFF">All staff</option>
                            </select>
                          ) : (
                            a.owner ?? "—"
                          )}
                        </td>
                        <td className="px-3 py-3.5 text-[13px]">
                          <label className="flex items-center gap-2">
                            <input type="checkbox" disabled={!can} checked={a.autoLink} onChange={(e) => void patch(a, { autoLink: e.target.checked })} className={check} /> Auto-link
                          </label>
                          <label className="mt-1 flex items-center gap-2">
                            <input type="checkbox" disabled={!can} checked={a.aiEnabled} onChange={(e) => void patch(a, { aiEnabled: e.target.checked })} className={check} /> EasyLink AI
                          </label>
                        </td>
                        <td className="px-3 py-3.5">
                          {a.status === "REAUTH" ? (
                            <span className="rounded-md px-2 py-1 text-[12px] font-semibold" style={{ background: "#FFEDD5", color: "#7C2D12" }}>
                              Sign-in expired
                            </span>
                          ) : a.lastError ? (
                            <span title={a.lastError} className="rounded-md px-2 py-1 text-[12px] font-semibold" style={{ background: "#FEF3C7", color: "#78350F" }}>
                              Sync problem
                            </span>
                          ) : (
                            <span className="rounded-md px-2 py-1 text-[12px] font-semibold" style={{ background: "#DCFCE7", color: "#14532D" }}>
                              {a.lastSyncAt ? `Synced · ${shortTime(a.lastSyncAt)}` : "Syncing…"}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3.5 text-right">
                          {a.status === "REAUTH" && a.mine ? (
                            <button type="button" onClick={() => void connect(a.provider === "MICROSOFT" ? "microsoft" : "google", a.address)} className="mr-4 font-semibold" style={{ color: BLUE }}>
                              Reconnect
                            </button>
                          ) : (
                            <button type="button" disabled={busy === a.id} onClick={() => void sync(a)} className="mr-4 font-semibold" style={{ color: BLUE }}>
                              {busy === a.id ? "Syncing…" : "Sync now"}
                            </button>
                          )}
                          {can ? (
                            <button type="button" disabled={busy === a.id} onClick={() => void disconnect(a)} className="font-semibold" style={{ color: "#B91C1C" }}>
                              Disconnect
                            </button>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <div className="flex items-start gap-3 rounded-2xl px-4 py-4 text-[14px] leading-relaxed" style={{ background: "#0B1A2E", color: "#E2E8F0" }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#FFE866" strokeWidth="2" aria-hidden="true" className="mt-0.5 flex-none">
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
          <span>
            You sign in with Microsoft or Google directly; the portal never sees or stores your password. Disconnect removes access and stops syncing at any time.
          </span>
        </div>
      </div>
    </div>
  );
}
