"use client";

import { useCallback, useEffect, useState } from "react";
import { extractMessage, unwrapApiData } from "@/lib/customers/backend";

/**
 * Phone logins: the Amazon Connect logins sales staff use in the Agent Dialer.
 * One login can only be signed in in one browser, so each rep who calls at the
 * same time as others needs their own. The rep's portal login email links the
 * two: the rep signs in to the portal and the Agent Dialer signs them in to
 * the phone, with no Connect password.
 */

type Login = {
  id: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  removable: boolean;
};

type Created = Login & { password: string | null };

const API = "/api/admin/cc/phone-logins";
const INPUT =
  "h-9 w-full rounded-[8px] border border-[#CBD5E1] bg-white px-3 text-[13px] text-[#0F172A] outline-none focus:border-[#0B5CAD] focus:ring-2 focus:ring-[#0B5CAD]/15";

function suggestUsername(first: string, last: string) {
  return `${first}.${last}`
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, "")
    .replace(/^\.+|\.+$/g, "");
}

export function PhoneLogins() {
  const [logins, setLogins] = useState<Login[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [username, setUsername] = useState("");
  const [usernameTouched, setUsernameTouched] = useState(false);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch(API, { cache: "no-store" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(extractMessage(body, "Could not load phone logins"));
      setLogins(unwrapApiData<Login[]>(body) ?? []);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not load phone logins");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const effectiveUsername = usernameTouched ? username : suggestUsername(first, last);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setCreated(null);
    setCopied(false);
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName: first.trim(), lastName: last.trim(), username: effectiveUsername, email: email.trim() }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(extractMessage(body, "Could not create the phone login"));
      const c = unwrapApiData<Created>(body);
      if (c) setCreated(c);
      setFirst("");
      setLast("");
      setUsername("");
      setUsernameTouched(false);
      setEmail("");
      void load();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not create the phone login");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    setRemoving(id);
    try {
      const res = await fetch(`${API}/${encodeURIComponent(id)}`, { method: "DELETE" });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(extractMessage(body, "Could not remove the phone login"));
      setConfirming(null);
      void load();
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not remove the phone login");
    } finally {
      setRemoving(null);
    }
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const canCreate = first.trim() && last.trim() && /^[a-z0-9][a-z0-9._-]{2,63}$/.test(effectiveUsername) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) && !busy;

  return (
    <section id="phone-logins" className="scroll-mt-6 overflow-hidden rounded-[14px] border border-[#E3E8EF] bg-white" aria-labelledby="phone-logins-title">
      <header className="flex flex-wrap items-center gap-3 border-b border-[#E3E8EF] bg-[linear-gradient(90deg,#0B1A2E,#12325A)] px-5 py-4 text-white">
        <span className="grid size-9 place-items-center rounded-[10px] bg-white/10" aria-hidden="true">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z" />
          </svg>
        </span>
        <div className="grow">
          <h2 id="phone-logins-title" className="m-0 text-[16px] font-bold">
            Phone logins
          </h2>
          <p className="m-0 text-[12.5px] text-white/75">
            Amazon Connect logins for the Agent Dialer. Each rep who calls at the same time as others needs their own.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-semibold">
          {logins ? `${logins.length} login${logins.length === 1 ? "" : "s"}` : "…"}
        </span>
      </header>

      <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <div className="min-w-0">
          {loadError && (
            <p role="alert" className="m-0 mb-3 rounded-[8px] bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#B91C1C]">
              {loadError}
            </p>
          )}
          {!logins && !loadError && <p className="m-0 text-[13px] text-[#5B6B80]">Loading phone logins…</p>}
          {logins && (
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {logins.map((l) => {
                const name = [l.firstName, l.lastName].filter(Boolean).join(" ") || l.username;
                return (
                  <li key={l.id} className="flex flex-wrap items-center gap-3 rounded-[10px] border border-[#E3E8EF] px-3 py-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#EEF4FB] text-[12px] font-bold text-[#0B5CAD]" aria-hidden="true">
                      {name.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0 grow">
                      <div className="truncate text-[13.5px] font-semibold text-[#0F172A]">{name}</div>
                      <div className="truncate text-[12px] text-[#5B6B80]">
                        Username <b className="font-mono font-semibold text-[#334155]">{l.username}</b>
                        {l.email ? ` · ${l.email}` : ""}
                      </div>
                    </div>
                    {!l.removable ? (
                      <span className="rounded-full bg-[#F1F5F9] px-2.5 py-1 text-[11.5px] font-semibold text-[#475569]">
                        {l.username.toLowerCase() === "sales" ? "Shared login" : "Console admin"}
                      </span>
                    ) : confirming === l.id ? (
                      <span className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => remove(l.id)}
                          disabled={removing === l.id}
                          className="h-8 rounded-[8px] bg-[#DC2626] px-3 text-[12.5px] font-semibold text-white disabled:opacity-60"
                        >
                          {removing === l.id ? "Removing…" : "Remove"}
                        </button>
                        <button type="button" onClick={() => setConfirming(null)} className="h-8 rounded-[8px] border border-[#CBD5E1] px-3 text-[12.5px] font-semibold text-[#334155]">
                          Keep
                        </button>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirming(l.id)}
                        className="h-8 rounded-[8px] border border-[#CBD5E1] px-3 text-[12.5px] font-semibold text-[#334155] hover:border-[#DC2626] hover:text-[#DC2626]"
                      >
                        Remove
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-3">
          {created && (
            <div role="status" className="rounded-[12px] border border-[#86EFAC] bg-[#F0FDF4] p-4">
              <p className="m-0 text-[13.5px] font-bold text-[#166534]">
                Phone login ready for {[created.firstName, created.lastName].filter(Boolean).join(" ")}
              </p>
              <p className="m-0 mt-1 text-[12.5px] text-[#166534]">
                {created.password
                  ? "Give these to the rep. The password is shown only now."
                  : `${created.email ?? "The rep"} can now call from Agent Dialer: they sign in to the portal as usual and the phone signs in by itself.`}
              </p>
              <dl className="m-0 mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                <dt className="text-[#3F6212]">Username</dt>
                <dd className="m-0 font-mono font-semibold text-[#0F172A]">{created.username}</dd>
                {created.password && (
                  <>
                    <dt className="text-[#3F6212]">Password</dt>
                    <dd className="m-0 font-mono font-semibold text-[#0F172A]">{created.password}</dd>
                  </>
                )}
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                {created.password && (
                  <button
                    type="button"
                    onClick={() => copy(`Username: ${created.username}\nPassword: ${created.password}`)}
                    className="h-8 rounded-[8px] bg-[#166534] px-3 text-[12.5px] font-semibold text-white"
                  >
                    {copied ? "Copied" : "Copy both"}
                  </button>
                )}
                <button type="button" onClick={() => setCreated(null)} className="h-8 rounded-[8px] border border-[#86EFAC] px-3 text-[12.5px] font-semibold text-[#166534]">
                  Done
                </button>
              </div>
              {created.password && (
                <p className="m-0 mt-3 text-[12px] text-[#3F6212]">
                  The rep opens Agent Dialer, presses <b>Sign in</b> in the Phone card, and signs in with these.
                </p>
              )}
            </div>
          )}

          <form onSubmit={create} className="flex flex-col gap-3 rounded-[12px] border border-[#E3E8EF] bg-[#F8FAFC] p-4" aria-label="Add a phone login">
            <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">Add a rep</h3>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                First name
                <input className={INPUT} value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="off" required maxLength={100} />
              </label>
              <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
                Last name
                <input className={INPUT} value={last} onChange={(e) => setLast(e.target.value)} autoComplete="off" required maxLength={100} />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
              Username
              <input
                className={`${INPUT} font-mono`}
                value={effectiveUsername}
                onChange={(e) => {
                  setUsernameTouched(true);
                  setUsername(e.target.value.toLowerCase());
                }}
                autoComplete="off"
                spellCheck={false}
                placeholder="first.last"
                maxLength={64}
              />
            </label>
            <label className="flex flex-col gap-1 text-[12px] font-semibold text-[#334155]">
              Portal login email
              <input className={INPUT} type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="off" required maxLength={254} />
              <span className="font-normal text-[#64748B]">The email the rep signs in to the portal with. It signs them in to the phone.</span>
            </label>
            {formError && (
              <p role="alert" className="m-0 rounded-[8px] bg-[#FEF2F2] px-3 py-2 text-[12.5px] text-[#B91C1C]">
                {formError}
              </p>
            )}
            <button
              type="submit"
              disabled={!canCreate}
              className="h-10 rounded-[10px] bg-[#F68A0A] px-4 text-[13.5px] font-bold text-[#3B1D00] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy ? "Creating…" : "Create phone login"}
            </button>
            <p className="m-0 text-[11.5px] text-[#64748B]">
              Calls go out as 02 9163 8128, are recorded with a notice to the customer, and appear in Calls and on the customer record.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
