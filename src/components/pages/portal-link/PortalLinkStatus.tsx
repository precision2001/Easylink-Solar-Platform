"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "react-toastify";
import { navigateWithSessionRefresh } from "@/lib/auth/app-router-navigation";
import { useAppDispatch } from "@/lib/store/hooks";
import { setCustomerSession } from "@/lib/store/customerAuthSlice";
import {
  PORTAL_LINK_SENT_FALLBACK,
  initialPortalLinkState,
  postPortalLink,
  type PortalLinkState,
} from "@/lib/customers/portal-link-client";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import {
  AuthIcon,
  Field,
  PRIMARY_BUTTON,
  QUIET_BUTTON,
  Spinner,
  SunMotif,
  TEXT_LINK,
} from "@/components/customer/auth/AuthBits";

const DESTINATION = "/customers/design";

function Card({ top, children }: { top: ReactNode; children: ReactNode }) {
  return (
    <section className="w-full max-w-[460px] overflow-hidden rounded-[22px] border border-[#E2E8F0] bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      {top}
      <div className="flex flex-col gap-5 p-6 sm:p-8">{children}</div>
    </section>
  );
}

/** Navy band with the sun coming up over the horizon: the "good news" header. */
function SunriseBand() {
  return (
    <div aria-hidden="true" className="relative h-[132px] overflow-hidden bg-[#0B1A2E]">
      <SunMotif className="absolute bottom-[-118px] left-1/2 size-[240px] -translate-x-1/2 text-[#F68A0A] opacity-90" />
      <span className="absolute inset-x-0 bottom-0 h-px bg-[#FFE866]/40" />
    </div>
  );
}

function IconTop({ tone, children }: { tone: "good" | "warn" | "navy"; children: ReactNode }) {
  const styles = {
    good: "bg-[#ECFDF3] text-[#15803D]",
    warn: "bg-[#FFF4D6] text-[#7A3E00]",
    navy: "bg-[#0B1A2E] text-[#FFE866]",
  }[tone];
  return (
    <div className="px-6 pt-8 sm:px-8">
      <span aria-hidden="true" className={`flex size-14 items-center justify-center rounded-[16px] ${styles}`}>
        {children}
      </span>
    </div>
  );
}

function Heading({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="m-0 font-source-sans text-[28px] font-extrabold leading-[1.15] tracking-[-0.01em] text-[#0F172A]">{title}</h1>
      {children ? <div className="text-[15px] leading-[1.55] text-[#475569]">{children}</div> : null}
    </div>
  );
}

/**
 * Landing page for the emailed portal link. Signing in waits for the button on
 * purpose: mail scanners open links to check them, and a page that redeemed on
 * load would burn the one-time token before the customer ever saw it.
 */
export function PortalLinkStatus() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const dispatch = useAppDispatch();
  const [state, setState] = useState<PortalLinkState>(() => initialPortalLinkState(token));
  const [email, setEmail] = useState("");

  async function openPortal() {
    setState({ kind: "opening" });
    try {
      const { ok, status, json } = await postPortalLink({ action: "redeem", token });
      if (!ok || !json.user || !json.accessToken) {
        // Only a 401 means the link itself is spent; anything else (busy,
        // server down) is worth trying again with the same link.
        if (status !== 401) {
          toast.error(json.message || "Couldn't open your portal. Please try again.");
          setState({ kind: "ready" });
          return;
        }
        setState({
          kind: "error",
          message: json.message || "This link has expired or was already used.",
        });
        return;
      }
      dispatch(setCustomerSession({ user: json.user, accessToken: json.accessToken }));
      navigateWithSessionRefresh(DESTINATION);
    } catch {
      toast.error("Could not reach the sign-in service. Please try again.");
      setState({ kind: "ready" });
    }
  }

  async function requestNewLink(event: FormEvent) {
    event.preventDefault();
    const message = state.kind === "error" ? state.message : "";
    setState({ kind: "error", message, sending: true });
    try {
      const { ok, json } = await postPortalLink({ action: "request", email });
      if (!ok) {
        setState({
          kind: "error",
          message: json.message || "Couldn't send a link just now. Please try again.",
        });
        return;
      }
      setState({ kind: "sent", message: json.message || PORTAL_LINK_SENT_FALLBACK });
    } catch {
      setState({ kind: "error", message: "Could not reach the sign-in service. Please try again." });
    }
  }

  if (state.kind === "ready" || state.kind === "opening") {
    const opening = state.kind === "opening";
    return (
      <Card top={<SunriseBand />}>
        <Heading title="Your design is waiting">
          Open your portal to view your design, change options and book a free site visit.
        </Heading>
        <button type="button" onClick={openPortal} disabled={opening} className={PRIMARY_BUTTON}>
          {opening ? <Spinner /> : null}
          {opening ? "Opening your portal…" : "Open my portal"}
          {opening ? null : <PortalIcon name="arrow" size={18} />}
        </button>
        <p role="status" className="m-0 flex items-start gap-2 text-[13.5px] leading-[1.5] text-[#5B6B80]">
          <PortalIcon name="lock" size={16} className="mt-[2px] shrink-0" />
          {opening
            ? "Signing you in. This takes a moment."
            : "This link works once and signs you in on this device."}
        </p>
      </Card>
    );
  }

  if (state.kind === "sent") {
    return (
      <Card
        top={
          <IconTop tone="good">
            <AuthIcon name="mail" size={26} />
          </IconTop>
        }
      >
        <Heading title="Check your email">
          <p role="status" className="m-0">
            {state.message}
          </p>
        </Heading>
        <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">
          The link opens your portal in one tap. Not there after a few minutes? Check your junk folder.
        </p>
        <button type="button" onClick={() => setState({ kind: "error", message: "" })} className={QUIET_BUTTON}>
          <AuthIcon name="refresh" size={18} />
          Use a different email or resend
        </button>
      </Card>
    );
  }

  const expired = Boolean(token);
  return (
    <Card
      top={
        <IconTop tone={expired ? "warn" : "navy"}>
          <AuthIcon name={expired ? "alert" : "mail"} size={26} />
        </IconTop>
      }
    >
      <Heading title={expired ? "This link has expired" : "Sign in by email"}>
        <p className="m-0">
          {state.message ? <span className={expired ? "font-semibold text-[#7A3E00]" : "font-semibold text-[#991B1B]"}>{state.message} </span> : null}
          Enter your email and we&apos;ll send you a{expired ? " fresh" : ""} sign-in link.
        </p>
      </Heading>
      <form onSubmit={requestNewLink} className="flex flex-col gap-4">
        <Field
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com.au"
        />
        <button type="submit" disabled={state.sending} className={PRIMARY_BUTTON}>
          {state.sending ? <Spinner /> : <AuthIcon name="mail" size={18} />}
          {state.sending ? "Sending…" : "Email me a new link"}
        </button>
      </form>
      <div className="flex justify-center border-t border-[#E2E8F0] pt-1">
        <Link href="/customers/auth" className={TEXT_LINK}>
          Sign in with a password instead
        </Link>
      </div>
    </Card>
  );
}
