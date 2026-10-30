"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent } from "react";
import Icon from "@/components/ui/Icons";
import { AuthCard } from "@/components/ui/auth/AuthCard";
import { navigateWithSessionRefresh } from "@/lib/auth/app-router-navigation";
import { useAppDispatch } from "@/lib/store/hooks";
import { setCustomerSession, type CustomerUser } from "@/lib/store/customerAuthSlice";

const DESTINATION = "/customers/design";

type State =
  | { kind: "ready" }
  | { kind: "opening" }
  | { kind: "error"; message: string; sending?: boolean }
  | { kind: "sent"; message: string };

const PRIMARY_BUTTON =
  "mt-2 inline-flex h-11 w-full items-center justify-center rounded-xl bg-linear-to-r from-yellow-lemon to-orange-amber px-6 font-inter text-sm font-bold text-warm-black disabled:opacity-60";

/**
 * Landing page for the emailed portal link. Signing in waits for the button on
 * purpose: mail scanners open links to check them, and a page that redeemed on
 * load would burn the one-time token before the customer ever saw it.
 */
export function PortalLinkStatus() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const dispatch = useAppDispatch();
  const [state, setState] = useState<State>(
    /^[a-f0-9]{64}$/.test(token)
      ? { kind: "ready" }
      : token
        ? { kind: "error", message: "This link is incomplete." }
        : { kind: "error", message: "" },
  );
  const [email, setEmail] = useState("");

  async function post(body: Record<string, string>) {
    const res = await fetch("/api/customers/portal-link", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      message?: string;
      user?: CustomerUser;
      accessToken?: string;
    };
    return { ok: res.ok, json };
  }

  async function openPortal() {
    setState({ kind: "opening" });
    try {
      const { ok, json } = await post({ action: "redeem", token });
      if (!ok || !json.user || !json.accessToken) {
        setState({
          kind: "error",
          message: json.message || "This link has expired or was already used.",
        });
        return;
      }
      dispatch(setCustomerSession({ user: json.user, accessToken: json.accessToken }));
      navigateWithSessionRefresh(DESTINATION);
    } catch {
      setState({ kind: "error", message: "Could not reach the sign-in service. Please try again." });
    }
  }

  async function requestNewLink(event: FormEvent) {
    event.preventDefault();
    const message = state.kind === "error" ? state.message : "";
    setState({ kind: "error", message, sending: true });
    try {
      const { json } = await post({ action: "request", email });
      setState({
        kind: "sent",
        message: json.message || "If that email has an Easylink account, a sign-in link is on its way.",
      });
    } catch {
      setState({ kind: "error", message: "Could not reach the sign-in service. Please try again." });
    }
  }

  return (
    <AuthCard className="w-full max-w-[440px] p-[3px]">
      <div className="flex flex-col items-center gap-4 rounded-[21px] bg-white px-8 py-10 text-center">
        {state.kind === "ready" || state.kind === "opening" ? (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-mint-soft">
              <Icon name="CheckCircle" className="size-7 text-success" />
            </span>
            <h1 className="font-inter text-xl font-bold text-warm-ink">Your design is waiting</h1>
            <p className="font-dm-sans text-sm text-warm-gray">
              Open your portal to view your design, change options and book a free site visit.
            </p>
            <button
              type="button"
              onClick={openPortal}
              disabled={state.kind === "opening"}
              className={PRIMARY_BUTTON}
            >
              {state.kind === "opening" ? "Opening…" : "Open my portal"}
            </button>
          </>
        ) : state.kind === "sent" ? (
          <>
            <span className="flex size-14 items-center justify-center rounded-full bg-mint-soft">
              <Icon name="CheckCircle" className="size-7 text-success" />
            </span>
            <h1 className="font-inter text-xl font-bold text-warm-ink">Check your email</h1>
            <p className="font-dm-sans text-sm text-warm-gray">{state.message}</p>
          </>
        ) : (
          <>
            {token ? (
              <span className="flex size-14 items-center justify-center rounded-full bg-danger/10">
                <Icon name="AlertTriangle" className="size-7 text-danger" />
              </span>
            ) : null}
            <h1 className="font-inter text-xl font-bold text-warm-ink">
              {token ? "This link has expired" : "Sign in by email"}
            </h1>
            <p className="font-dm-sans text-sm text-warm-gray">
              {state.message} Enter your email and we&apos;ll send you a{token ? " fresh" : ""} sign-in link.
            </p>
            <form onSubmit={requestNewLink} className="flex w-full flex-col gap-2">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                aria-label="Email"
                className="h-11 w-full rounded-xl border-2 border-warm-ink/20 px-4 font-inter text-sm text-warm-ink outline-none focus:border-orange-amber"
              />
              <button type="submit" disabled={state.sending} className={PRIMARY_BUTTON}>
                {state.sending ? "Sending…" : "Email me a new link"}
              </button>
            </form>
            <Link
              href="/customers/auth"
              className="font-dm-sans text-sm text-warm-gray underline underline-offset-2"
            >
              Sign in with a password instead
            </Link>
          </>
        )}
      </div>
    </AuthCard>
  );
}
