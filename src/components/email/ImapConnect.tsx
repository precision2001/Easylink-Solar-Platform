"use client";

import { useEffect, useState } from "react";
import { call, emailBase, type Account, type EmailPortal } from "./api";

/**
 * Connect a mailbox with IMAP (read) and SMTP (send): Hostinger and any other
 * host. The servers are filled in from the address's domain; the password is
 * checked against both servers, then stored encrypted on the server.
 */

type Preset = { provider: string; imapHost: string; imapPort: number; smtpHost: string; smtpPort: number };

export type ImapSettings = {
  label: string | null;
  shared: boolean;
  visibility: "OWNER" | "STAFF";
  historyDays: number;
  autoLink: boolean;
  createLeads: boolean;
  aiEnabled: boolean;
};

const field = "h-11 rounded-xl bg-white px-3 text-[14px]";
const fieldStyle = { border: "1px solid #2196F3" };

export function ImapConnect({
  portal,
  settings,
  initialAddress,
  onConnected,
  onError,
}: {
  portal: EmailPortal;
  settings: ImapSettings;
  /** Prefilled when reconnecting a mailbox whose password changed. */
  initialAddress?: string;
  onConnected: (a: Account) => void;
  onError: (message: string) => void;
}) {
  const base = emailBase(portal);
  const [address, setAddress] = useState(initialAddress ?? "");
  const [password, setPassword] = useState("");
  const [preset, setPreset] = useState<Preset | null>(null);
  const [advanced, setAdvanced] = useState(false);
  const [loginUser, setLoginUser] = useState("");
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [busy, setBusy] = useState(false);

  // Look up the servers once the address looks complete.
  useEffect(() => {
    const a = address.trim();
    const t = window.setTimeout(async () => {
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(a)) {
        setPreset(null);
        return;
      }
      const r = await call<Preset>(`${base}/imap/suggest?address=${encodeURIComponent(a)}`);
      if (r.data) setPreset(r.data);
    }, 400);
    return () => window.clearTimeout(t);
  }, [address, base]);

  const connect = async () => {
    setBusy(true);
    const r = await call<Account>(`${base}/imap/connect`, {
      method: "POST",
      body: JSON.stringify({
        address: address.trim(),
        password,
        ...(advanced
          ? {
              loginUser: loginUser.trim() || null,
              ...(imapHost.trim() ? { imapHost: imapHost.trim() } : {}),
              ...(Number(imapPort) ? { imapPort: Number(imapPort) } : {}),
              ...(smtpHost.trim() ? { smtpHost: smtpHost.trim() } : {}),
              ...(Number(smtpPort) ? { smtpPort: Number(smtpPort) } : {}),
            }
          : {}),
        ...settings,
        visibility: portal === "admin" ? settings.visibility : "OWNER",
        createLeads: portal === "admin" ? settings.createLeads : false,
      }),
    });
    setBusy(false);
    setPassword("");
    if (r.data) onConnected(r.data);
    else onError(r.message ?? "Couldn't connect that mailbox.");
  };

  return (
    <div className="flex flex-col gap-4 rounded-[20px] bg-white p-6" style={{ border: "1px solid #E2E8F0" }}>
      <div className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 items-center justify-center rounded-[14px]" style={{ background: "#CCFBF1" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0F766E" strokeWidth="2" aria-hidden="true">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="m3 7 9 6 9-6" />
          </svg>
        </div>
        <div>
          <h2 className="text-[22px] font-bold" style={{ fontFamily: "'Source Sans 3', sans-serif" }}>
            {initialAddress ? "Reconnect mailbox" : "Hostinger and other email"}
          </h2>
          <p className="text-[13px]" style={{ color: "#5B6B80" }}>
            Any mailbox with IMAP and SMTP, such as @easylinksolar.com.au on Hostinger
          </p>
        </div>
      </div>

      <form
        className="grid gap-4"
        style={{ gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))" }}
        onSubmit={(e) => {
          e.preventDefault();
          void connect();
        }}
      >
        <div className="flex flex-col gap-2">
          <label htmlFor="imap-address" className="text-[14px] font-semibold">
            Email address
          </label>
          <input
            id="imap-address"
            type="email"
            autoComplete="off"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="sales@easylinksolar.com.au"
            className={field}
            style={fieldStyle}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="imap-password" className="text-[14px] font-semibold">
            Mailbox password
          </label>
          <input
            id="imap-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={field}
            style={fieldStyle}
            required
          />
        </div>

        <p className="text-[13px] leading-relaxed" style={{ color: "#475569", gridColumn: "1 / -1" }}>
          {preset ? (
            <>
              Servers: <strong>{preset.imapHost}</strong> (port {preset.imapPort}) to read, <strong>{preset.smtpHost}</strong> (port {preset.smtpPort}) to send.{" "}
            </>
          ) : null}
          <button type="button" onClick={() => setAdvanced((v) => !v)} className="font-semibold" style={{ color: "#1976D2" }}>
            {advanced ? "Use these servers" : "Change servers"}
          </button>
        </p>

        {advanced ? (
          <>
            <div className="flex flex-col gap-2">
              <label htmlFor="imap-host" className="text-[13px] font-semibold">
                IMAP server
              </label>
              <input id="imap-host" value={imapHost} onChange={(e) => setImapHost(e.target.value)} placeholder={preset?.imapHost ?? "imap.hostinger.com"} className={field} style={fieldStyle} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="imap-port" className="text-[13px] font-semibold">
                IMAP port
              </label>
              <input id="imap-port" inputMode="numeric" value={imapPort} onChange={(e) => setImapPort(e.target.value.replace(/\D/g, ""))} placeholder={String(preset?.imapPort ?? 993)} className={field} style={fieldStyle} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="smtp-host" className="text-[13px] font-semibold">
                SMTP server
              </label>
              <input id="smtp-host" value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} placeholder={preset?.smtpHost ?? "smtp.hostinger.com"} className={field} style={fieldStyle} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="smtp-port" className="text-[13px] font-semibold">
                SMTP port
              </label>
              <input id="smtp-port" inputMode="numeric" value={smtpPort} onChange={(e) => setSmtpPort(e.target.value.replace(/\D/g, ""))} placeholder={String(preset?.smtpPort ?? 465)} className={field} style={fieldStyle} />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="imap-user" className="text-[13px] font-semibold">
                Login name (if not the address)
              </label>
              <input id="imap-user" value={loginUser} onChange={(e) => setLoginUser(e.target.value)} className={field} style={fieldStyle} />
            </div>
          </>
        ) : null}

        <div className="flex flex-wrap items-center gap-3" style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            disabled={busy || !address.trim() || !password}
            className="h-12 cursor-pointer rounded-xl px-6 text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "#0F766E", color: "#FFFFFF" }}
          >
            {busy ? "Checking the password…" : initialAddress ? "Reconnect" : "Connect mailbox"}
          </button>
          <span className="text-[12px]" style={{ color: "#5B6B80" }}>
            We check the password with the mail server, then store it encrypted. It is never shown again.
          </span>
        </div>
      </form>
    </div>
  );
}
