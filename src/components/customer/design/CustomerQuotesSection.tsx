"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { EmptyNote, Panel, Skeleton } from "@/components/customer/portal/PortalParts";
import { QuoteCompare } from "@/components/quotes/QuoteCompare";
import { QuoteDetail } from "@/components/quotes/QuoteDetail";
import { QUOTE_FIELD, QUOTE_FOCUS, QUOTE_LABEL, QuoteNotice } from "@/components/quotes/QuoteParts";
import { QuoteSummaryCard } from "@/components/quotes/QuoteSummaryCard";
import {
  QUOTE_TERMS_HREF,
  acceptQuote,
  balanceCents,
  customerQuoteAction,
  depositCheckout,
  effectiveStatus,
  fetchMyQuotes,
  formatCents,
  formatQuoteDate,
  isDepositDue,
  isOpen,
  quoteQuestion,
  quoteVersionLabel,
  type Quote,
} from "@/lib/quotes";
import { useAppSelector } from "@/lib/store/hooks";

const BTN =
  "inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[13px] px-[18px] text-[14.5px] font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB] disabled:cursor-not-allowed disabled:opacity-60";
const PRIMARY = `${BTN} bg-[#F68A0A] text-[#3B1D00] hover:bg-[#FF9A1F]`;
const QUIET = `${BTN} border border-[#CBD5E1] bg-white text-[#0F172A] hover:border-[#64748B]`;
const LINK = `inline-flex min-h-[44px] items-center gap-1.5 rounded-[8px] text-[14px] font-semibold text-[#1D4ED8] hover:underline ${QUOTE_FOCUS}`;

function useWide(query = "(min-width: 1024px)") {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const update = () => setWide(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, [query]);
  return wide;
}

/**
 * "Your quotes" on My design: every quote EasyLink or the installer has sent,
 * side by side when there's more than one, and the way to accept and pay the
 * deposit. Opening a quote tells EasyLink it's been viewed. A link of the form
 * /customers/design?quote=<id>#quotes opens that quote straight away.
 */
export function CustomerQuotesSection({ hasDesign }: { hasDesign: boolean }) {
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [comparing, setComparing] = useState(false);
  const [showReplaced, setShowReplaced] = useState(false);
  const viewed = useRef(new Set<string>());
  const deepLinked = useRef(false);
  const wide = useWide();

  const load = useCallback(async () => {
    try {
      const list = await fetchMyQuotes();
      setQuotes(list);
      setError(null);
      return list;
    } catch (err) {
      setQuotes((q) => q ?? []);
      setError(err instanceof Error ? err.message : "Could not load your quotes.");
      return null;
    }
  }, []);

  const open = useCallback((q: Quote) => {
    setOpenId(q.id);
    if (q.status !== "SENT" || viewed.current.has(q.id)) return;
    viewed.current.add(q.id);
    // Fire and forget: a failed "viewed" mustn't stop them reading the quote.
    customerQuoteAction(q.id, "viewed")
      .then(() =>
        setQuotes((list) =>
          list?.map((x) => (x.id === q.id && x.status === "SENT" ? { ...x, status: "VIEWED", viewedAt: new Date().toISOString() } : x)) ?? list,
        ),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    let live = true;
    fetchMyQuotes()
      .then((list) => {
        if (!live) return;
        setQuotes(list);
        setError(null);
        if (deepLinked.current) return;
        deepLinked.current = true;
        const params = new URLSearchParams(window.location.search);
        const wanted = params.get("quote");
        const target = (wanted && list.find((q) => q.id === wanted)) || null;
        const visible = list.filter((q) => q.status !== "SUPERSEDED");
        const pick = target ?? (visible.length === 1 ? visible[0] : null);
        if (pick) {
          if (pick.status === "SUPERSEDED") setShowReplaced(true);
          open(pick);
        }
        if (target || window.location.hash === "#quotes") {
          // The section renders after the fetch, so the browser's own jump to
          // #quotes has already happened (and missed). Do it now.
          requestAnimationFrame(() => {
            const el = document.getElementById(target ? `quote-${target.id}` : "quotes") ?? document.getElementById("quotes");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          });
        }
      })
      .catch((err: unknown) => {
        if (!live) return;
        setQuotes([]);
        setError(err instanceof Error ? err.message : "Could not load your quotes.");
      });
    return () => {
      live = false;
    };
  }, [open]);

  if (quotes === null) {
    return hasDesign ? (
      <Panel id="quotes" title="Your quotes">
        <Skeleton className="h-[120px]" />
      </Panel>
    ) : null;
  }

  const replaced = quotes.filter((q) => q.status === "SUPERSEDED");
  const visible = quotes.filter((q) => showReplaced || q.status !== "SUPERSEDED");
  const comparable = quotes.filter((q) => q.status !== "SUPERSEDED" && q.status !== "DECLINED").slice(0, 3);
  const current = quotes.find((q) => q.id === openId) ?? null;

  if (!quotes.length && !hasDesign && !error) return null;

  // Under its card on a phone, the card already names the quote.
  const detail = current ? <QuoteActions key={current.id} quote={current} onChanged={() => void load()} showHeading={wide} /> : null;

  return (
    <Panel
      id="quotes"
      title="Your quotes"
      meta={quotes.length ? "Prices include GST. STCs already taken off." : undefined}
      className="scroll-mt-24"
    >
      {error ? <QuoteNotice>{error} Refresh the page to try again.</QuoteNotice> : null}

      {!quotes.length && !error ? (
        <EmptyNote icon="payments" title="No quote yet">
          Once your EasyLink advisor or installer has checked your design, your quote appears here with the full price, the deposit and what&rsquo;s included. We&rsquo;ll email you when it&rsquo;s ready.
        </EmptyNote>
      ) : null}

      {comparable.length >= 2 ? (
        <div className="flex flex-col gap-3">
          <button type="button" aria-expanded={comparing} onClick={() => setComparing((c) => !c)} className={`${QUIET} self-start`}>
            {comparing ? "Hide comparison" : `Compare ${comparable.length === 2 ? "both" : "all three"} side by side`}
          </button>
          {comparing ? <QuoteCompare quotes={comparable} caption="Your quotes compared" /> : null}
        </div>
      ) : null}

      {visible.length ? (
        <div className={wide && current ? "grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]" : ""}>
          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {visible.map((q) => (
              <li key={q.id} id={`quote-${q.id}`} className="scroll-mt-24">
                <QuoteSummaryCard quote={q} selected={q.id === openId} onOpen={() => (q.id === openId && !wide ? setOpenId(null) : open(q))} />
                {!wide && q.id === openId ? <div className="mt-2.5 px-0.5">{detail}</div> : null}
              </li>
            ))}
          </ul>
          {wide && current ? <div className="rounded-[18px] border border-[#E2E8F0] p-5">{detail}</div> : null}
        </div>
      ) : null}

      {replaced.length && !showReplaced ? (
        <button type="button" onClick={() => setShowReplaced(true)} className={`${LINK} self-start`}>
          Show {replaced.length} replaced quote{replaced.length === 1 ? "" : "s"}
        </button>
      ) : null}
    </Panel>
  );
}

type Mode = "idle" | "accept" | "decline";

/** The open quote in full, with what the customer can do about it. */
function QuoteActions({ quote, onChanged, showHeading = true }: { quote: Quote; onChanged: () => void; showHeading?: boolean }) {
  const [mode, setMode] = useState<Mode>("idle");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const status = effectiveStatus(quote);

  async function payDeposit() {
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await depositCheckout(quote.id);
      if (!checkoutUrl) throw new Error("We couldn't start the payment. Please try again, or message us.");
      window.location.assign(checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the deposit payment.");
      setBusy(false);
    }
  }

  let actions: ReactNode = null;
  if (isOpen(quote) && mode === "idle") {
    actions = (
      <div className="flex flex-wrap gap-2.5">
        <button type="button" onClick={() => setMode("accept")} className={PRIMARY}>
          <PortalIcon name="check" size={18} />
          {quote.depositCents > 0 ? "Accept and pay deposit" : "Accept quote"}
        </button>
        <button type="button" onClick={() => setMode("decline")} className={QUIET}>
          Decline
        </button>
      </div>
    );
  } else if (isDepositDue(quote)) {
    actions = (
      <div className="flex flex-col gap-2">
        <p className="m-0 text-[14px] leading-[1.5] text-[#334155]">
          You accepted this quote on {formatQuoteDate(quote.acceptedAt)}. Pay the deposit to lock in your install.
        </p>
        <button type="button" disabled={busy} onClick={() => void payDeposit()} className={`${PRIMARY} self-start`}>
          <PortalIcon name="payments" size={18} />
          {busy ? "Opening checkout…" : `Pay deposit ${formatCents(quote.depositCents)}`}
        </button>
      </div>
    );
  } else if (quote.status === "ACCEPTED" && quote.depositPaidAt) {
    actions = (
      <QuoteNotice tone="success">
        Deposit paid on {formatQuoteDate(quote.depositPaidAt)}. Thank you — we&rsquo;ll be in touch to book your install. Your receipt is in{" "}
        <Link href="/customers/payments" className="underline">
          Payments
        </Link>
        .
      </QuoteNotice>
    );
  } else if (status === "EXPIRED") {
    actions = (
      <QuoteNotice tone="info">
        This quote expired on {formatQuoteDate(quote.validUntil)}. Prices can change, so{" "}
        <Link href="/customers/messages" className="font-bold text-[#1D4ED8] underline">
          message us
        </Link>{" "}
        and we&rsquo;ll send you an updated one.
      </QuoteNotice>
    );
  } else if (status === "DECLINED") {
    actions = (
      <QuoteNotice tone="info">
        You declined this quote{quote.declinedAt ? ` on ${formatQuoteDate(quote.declinedAt)}` : ""}
        {quote.declineReason ? `: “${quote.declineReason}”` : ""}. Changed your mind?{" "}
        <Link href="/customers/messages" className="font-bold text-[#1D4ED8] underline">
          Message us
        </Link>
        .
      </QuoteNotice>
    );
  } else if (status === "SUPERSEDED") {
    actions = <QuoteNotice tone="info">This quote has been replaced by a newer one, so it can no longer be accepted.</QuoteNotice>;
  }

  return (
    <div className="flex flex-col gap-5">
      <QuoteDetail quote={quote} audience="customer" showHeading={showHeading} />
      <div className="flex flex-col gap-3 border-t border-[#E2E8F0] pt-4">
        {done ? <QuoteNotice tone="success">{done}</QuoteNotice> : null}
        {error ? <QuoteNotice>{error}</QuoteNotice> : null}
        {mode === "accept" ? <AcceptForm
            quote={quote}
            onCancel={() => setMode("idle")}
            onChanged={() => {
              setMode("idle");
              onChanged();
            }}
          /> : null}
        {mode === "decline" ? (
          <DeclineForm
            quote={quote}
            onCancel={() => setMode("idle")}
            onDone={() => {
              setMode("idle");
              setDone("Thanks for letting us know. If you'd like a different system or price, message us any time.");
              onChanged();
            }}
          />
        ) : null}
        {actions}
        <button type="button" onClick={() => askEasylinkAi(quoteQuestion(quote))} className={`${LINK} self-start`}>
          <PortalIcon name="spark" size={16} />
          Ask EasyLink AI about this quote
        </button>
      </div>
    </div>
  );
}

function AcceptForm({ quote, onCancel, onChanged }: { quote: Quote; onCancel: () => void; onChanged: () => void }) {
  const user = useAppSelector((s) => s.customerAuth.user);
  const uid = useId();
  const [name, setName] = useState([user?.firstName, user?.lastName].filter(Boolean).join(" "));
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2) return setError("Type your full name to accept.");
    if (!agree) return setError("Tick the box to agree to the EasyLink quote terms.");
    setBusy(true);
    setError(null);
    try {
      const { checkoutUrl } = await acceptQuote(quote.id, name.trim());
      if (checkoutUrl) {
        window.location.assign(checkoutUrl);
        return;
      }
      onChanged();
      setBusy(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not accept the quote.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate aria-labelledby={`${uid}-t`} className="flex flex-col gap-3.5 rounded-[16px] border border-[#F6C77F] bg-[#FFF8EB] p-3.5 sm:p-4">
      <div className="flex flex-col gap-1">
        <h4 id={`${uid}-t`} className="m-0 text-[16px] font-bold text-[#0F172A]">
          Accept {quoteVersionLabel(quote)}
        </h4>
        <p className="m-0 text-[14px] leading-[1.5] text-[#475569]">
          Total {formatCents(quote.totalCents)} inc GST.{" "}
          {quote.depositCents > 0
            ? `You'll pay the ${formatCents(quote.depositCents)} deposit now by card. The balance of ${formatCents(balanceCents(quote))} is due once your system is installed.`
            : "There's no deposit on this quote."}
        </p>
      </div>
      <label className={QUOTE_LABEL}>
        Your full name
        <input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} className={QUOTE_FIELD} />
      </label>
      <label className="flex min-h-[44px] cursor-pointer items-start gap-3 text-[14px] leading-[1.5] text-[#334155]">
        <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className={`mt-0.5 size-5 shrink-0 accent-[#0B1A2E] ${QUOTE_FOCUS}`} />
        <span>
          I&rsquo;ve read and agree to the{" "}
          <Link href={QUOTE_TERMS_HREF} target="_blank" className="font-semibold text-[#1D4ED8] underline">
            EasyLink quote terms
          </Link>
          .
        </span>
      </label>
      {error ? <QuoteNotice>{error}</QuoteNotice> : null}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={busy} className={PRIMARY}>
          {busy ? "Accepting…" : quote.depositCents > 0 ? `Accept and pay ${formatCents(quote.depositCents)}` : "Accept quote"}
        </button>
        <button type="button" onClick={onCancel} className={QUIET}>
          Not yet
        </button>
      </div>
    </form>
  );
}

function DeclineForm({ quote, onCancel, onDone }: { quote: Quote; onCancel: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await customerQuoteAction(quote.id, "decline", reason.trim() ? { reason: reason.trim() } : {});
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not decline the quote.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-[16px] border border-[#E2E8F0] bg-[#F8FAFC] p-3.5 sm:p-4">
      <h4 className="m-0 text-[16px] font-bold text-[#0F172A]">Decline {quoteVersionLabel(quote)}?</h4>
      <label className={QUOTE_LABEL}>
        <span>
          Anything we should know? <span className="font-normal text-[#5B6B80]">(optional)</span>
        </span>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="For example: over budget, going with a smaller system, or the timing isn't right."
          className={`${QUOTE_FIELD} min-h-[88px] py-2.5`}
        />
      </label>
      {error ? <QuoteNotice>{error}</QuoteNotice> : null}
      <div className="flex flex-wrap gap-2.5">
        <button type="submit" disabled={busy} className={`${BTN} bg-[#0B1A2E] text-white hover:bg-[#16304F]`}>
          {busy ? "Sending…" : "Decline quote"}
        </button>
        <button type="button" onClick={onCancel} className={QUIET}>
          Keep it
        </button>
      </div>
    </form>
  );
}
