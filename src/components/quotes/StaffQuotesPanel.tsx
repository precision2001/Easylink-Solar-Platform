"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ChannelChoice, channelUsable } from "@/components/quotes/ChannelChoice";
import { QuoteCompare } from "@/components/quotes/QuoteCompare";
import { QuoteDetail } from "@/components/quotes/QuoteDetail";
import { QuoteForm } from "@/components/quotes/QuoteForm";
import { QuoteFullScreen } from "@/components/quotes/QuoteFullScreen";
import { QuoteLinesEditor } from "@/components/quotes/QuoteLinesEditor";
import { QUOTE_BUTTON, QUOTE_FOCUS, QuoteNotice } from "@/components/quotes/QuoteParts";
import { QuoteSummaryCard } from "@/components/quotes/QuoteSummaryCard";
import {
  quoteAddress,
  createStaffQuote,
  isHandEdited,
  listStaffQuotes,
  quoteVersionLabel,
  sendPaymentLink,
  staffActionsFor,
  staffQuoteAction,
  updateStaffQuote,
  type PaymentLinkChannel,
  type Quote,
  type StaffPortal,
} from "@/lib/quotes";
import { useSmsStatus } from "@/hooks/useSmsStatus";

type View = { kind: "list" } | { kind: "create" } | { kind: "edit"; id: string } | { kind: "lines"; id: string } | { kind: "compare" };
type Notice = { tone: "error" | "success" | "info"; text: string } | null;

const HOW: Record<PaymentLinkChannel, string> = { email: "email", sms: "SMS", both: "email and SMS" };

/**
 * Every quote version for one lead (or customer), with what staff and the
 * assigned installer can do to each: create, edit a draft, reprice, send,
 * send a payment link and withdraw. Used by the operations drawer and the
 * installer's customer page, each against its own proxy.
 */
export function StaffQuotesPanel({
  portal,
  leadId,
  customerId,
  customerName,
  customerPhone,
  startWith = "list",
  layout = "stack",
  initialOpenId = null,
  onChanged,
}: {
  portal: StaffPortal;
  leadId?: string | null;
  customerId?: string | null;
  customerName: string;
  /** Decides whether SMS can be offered (needs an Australian mobile). */
  customerPhone?: string | null;
  startWith?: "list" | "create";
  /** "split" puts the list beside the open quote on wide screens. */
  layout?: "stack" | "split";
  /** Opens this quote in the list straight away (picked from the ⋯ menu or the quotes carousel). */
  initialOpenId?: string | null;
  onChanged?: () => void;
}) {
  const uid = useId();
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [view, setView] = useState<View>({ kind: startWith });
  const [openId, setOpenId] = useState<string | null>(initialOpenId);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [linkOpen, setLinkOpen] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState<string | null>(null);
  const [sendChannel, setSendChannel] = useState<PaymentLinkChannel>("both");
  const [channel, setChannel] = useState<PaymentLinkChannel>("both");
  const sms = useSmsStatus(portal);
  const [linkUrl, setLinkUrl] = useState<{ id: string; url: string } | null>(null);
  const [confirmWithdraw, setConfirmWithdraw] = useState<string | null>(null);
  const firstOpen = useRef(true);
  const mainRef = useRef<HTMLDivElement>(null);

  const filter = leadId ? { leadId } : { customerId };
  const filterKey = leadId ?? customerId ?? "";

  const reload = useCallback(async () => {
    if (!filterKey) return;
    try {
      const list = await listStaffQuotes(portal, leadId ? { leadId } : { customerId });
      setQuotes(list);
      setLoadError(null);
      if (firstOpen.current) {
        firstOpen.current = false;
        setOpenId((id) => id ?? list[0]?.id ?? null);
      }
    } catch (err) {
      setQuotes((q) => q ?? []);
      setLoadError(err instanceof Error ? err.message : "Could not load quotes.");
    }
  }, [portal, leadId, customerId, filterKey]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Forms and the comparison open above the list; bring them into view.
  useEffect(() => {
    if (view.kind !== "list") mainRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [view.kind]);

  // A choice that isn't possible right now (SMS off, no mobile) falls back to email.
  const sendBy: PaymentLinkChannel = channelUsable(sendChannel, sms, customerPhone) ? sendChannel : "email";
  const linkBy: PaymentLinkChannel = channelUsable(channel, sms, customerPhone) ? channel : "email";

  async function run(key: string, task: () => Promise<string | void>) {
    setBusy(key);
    setNotice(null);
    try {
      const text = await task();
      await reload();
      onChanged?.();
      if (text) setNotice({ tone: "success", text });
    } catch (err) {
      setNotice({ tone: "error", text: err instanceof Error ? err.message : "Something went wrong." });
    } finally {
      setBusy(null);
    }
  }

  const open = quotes?.find((q) => q.id === openId) ?? null;
  const arrivedOn = useRef(initialOpenId);
  useEffect(() => {
    // Brings the quote picked from the menu or carousel into view once the list is in.
    if (!quotes || !arrivedOn.current) return;
    const id = arrivedOn.current;
    arrivedOn.current = null;
    requestAnimationFrame(() => document.querySelector(`[data-quote-id="${CSS.escape(id)}"]`)?.scrollIntoView({ block: "start", behavior: "smooth" }));
  }, [quotes]);
  const editing = view.kind === "edit" || view.kind === "lines" ? quotes?.find((q) => q.id === view.id) ?? null : null;

  /** Edit (items): a draft is edited in place; anything else is copied into a new draft first. */
  function editLines(q: Quote) {
    if (q.status === "DRAFT") {
      setNotice(null);
      setView({ kind: "lines", id: q.id });
      return;
    }
    void run("revise", async () => {
      const draft = await staffQuoteAction(portal, q.id, "revise");
      setOpenId(draft.id);
      setView({ kind: "lines", id: draft.id });
      return `${quoteVersionLabel(q)} copied into draft ${quoteVersionLabel(draft)}. Tick the items to keep and change them, then send it. ${customerName} keeps seeing ${quoteVersionLabel(q)} until then.`;
    });
  }
  const comparing = (quotes ?? []).filter((q) => compareIds.includes(q.id));

  if (!filterKey) {
    return <QuoteNotice tone="info">Quotes need a lead or customer account. Save the customer first.</QuoteNotice>;
  }

  let main: ReactNode = null;
  if (view.kind === "create") {
    main = (
      <Card>
        <QuoteForm
          mode="create"
          onCancel={() => setView({ kind: "list" })}
          onSubmit={async (input) => {
            const created = await createStaffQuote(portal, { ...filter, ...input } as Parameters<typeof createStaffQuote>[1]);
            setView({ kind: "list" });
            setOpenId(created?.id ?? null);
            await reload();
            onChanged?.();
            setNotice({ tone: "success", text: `Draft ${created ? quoteVersionLabel(created) : "quote"} created. Check it over, then send it to ${customerName}.` });
          }}
        />
      </Card>
    );
  } else if (view.kind === "lines" && editing) {
    // Edit mode uses the whole screen, whatever opened the panel.
    main = (
      <QuoteFullScreen
        title={`${customerName} · ${quoteVersionLabel(editing)}`}
        subtitle={quoteAddress(editing) ?? undefined}
        onClose={() => setView({ kind: "list" })}
      >
        <QuoteLinesEditor
          key={editing.id}
          quote={editing}
          onCancel={() => setView({ kind: "list" })}
          onSubmit={async (patch) => {
            await updateStaffQuote(portal, editing.id, patch);
            setView({ kind: "list" });
            setOpenId(editing.id);
            await reload();
            onChanged?.();
            setNotice({ tone: "success", text: `Edited quote ${quoteVersionLabel(editing)} saved. Check it over, then send it to ${customerName}.` });
          }}
        />
      </QuoteFullScreen>
    );
  } else if (view.kind === "edit" && editing) {
    main = (
      <Card>
        <QuoteForm
          mode="edit"
          quote={editing}
          onCancel={() => setView({ kind: "list" })}
          onSubmit={async (patch) => {
            await updateStaffQuote(portal, editing.id, patch);
            setView({ kind: "list" });
            await reload();
            setNotice({ tone: "success", text: `${quoteVersionLabel(editing)} saved.` });
          }}
        />
      </Card>
    );
  } else if (view.kind === "compare" && comparing.length >= 2) {
    main = (
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 font-source-sans text-[18px] font-bold text-[#0F172A]">Compare versions</h3>
          <button type="button" onClick={() => setView({ kind: "list" })} className={QUOTE_BUTTON.quiet}>
            Done
          </button>
        </div>
        <QuoteCompare quotes={comparing} />
      </Card>
    );
  } else if (open) {
    const can = staffActionsFor(open);
    const any = true;
    const handEdited = isHandEdited(open);
    main = (
      <Card>
        <QuoteDetail quote={open} audience="staff" showHeading={layout === "split"} />
        {any ? (
          <div className="flex flex-col gap-3 border-t border-[#E3E8EF] pt-4">
            <div className="flex flex-wrap gap-2">
              {can.send ? (
                <button
                  type="button"
                  aria-expanded={sendOpen === open.id}
                  aria-controls={`${uid}-send`}
                  onClick={() => {
                    setSendOpen(sendOpen === open.id ? null : open.id);
                    setLinkOpen(null);
                  }}
                  className={QUOTE_BUTTON.accent}
                >
                  Send to customer
                </button>
              ) : null}
              {can.paymentLink ? (
                <button
                  type="button"
                  aria-expanded={linkOpen === open.id}
                  aria-controls={`${uid}-link`}
                  onClick={() => {
                    setLinkOpen(linkOpen === open.id ? null : open.id);
                    setSendOpen(null);
                  }}
                  className={QUOTE_BUTTON.quiet}
                >
                  Send payment link
                </button>
              ) : null}
              <button
                type="button"
                disabled={busy !== null}
                onClick={() => editLines(open)}
                title={
                  open.status === "DRAFT"
                    ? "Tick the items to keep, change quantities and prices, add lines"
                    : "Copies this version into a new draft: tick the items to keep and change them there"
                }
                className={QUOTE_BUTTON.quiet}
              >
                {busy === "revise" ? "Copying…" : "Edit"}
              </button>
              {can.edit ? (
                <button type="button" onClick={() => setView({ kind: "edit", id: open.id })} className={QUOTE_BUTTON.quiet}>
                  Details and deposit
                </button>
              ) : null}
              {can.reprice ? (
                <button
                  type="button"
                  disabled={busy !== null}
                  title={handEdited ? "Replaces your hand-edited lines and prices with the pricing engine's" : "Re-run the pricing engine on this version's equipment"}
                  onClick={() =>
                    void run("reprice", async () => {
                      await staffQuoteAction(portal, open.id, "reprice");
                      return `${quoteVersionLabel(open)} repriced with today's prices.`;
                    })
                  }
                  className={QUOTE_BUTTON.quiet}
                >
                  {busy === "reprice" ? "Repricing…" : handEdited ? "Reprice (undo edits)" : "Reprice"}
                </button>
              ) : null}
              {can.withdraw ? (
                <button type="button" onClick={() => setConfirmWithdraw(open.id)} className={QUOTE_BUTTON.danger}>
                  Withdraw
                </button>
              ) : null}
            </div>

            {sendOpen === open.id && can.send ? (
              <fieldset id={`${uid}-send`} className="m-0 flex flex-col gap-2.5 rounded-[12px] border border-[#F6C77F] bg-[#FFF8EB] p-3.5">
                <legend className="sr-only">Send the quote to the customer</legend>
                <p className="m-0 text-[13.5px] text-[#334155]">
                  {customerName} gets a link to {quoteVersionLabel(open)} in their portal, where they can compare, accept and pay the deposit. Reminders are scheduled automatically.
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <ChannelChoice value={sendBy} onChange={setSendChannel} sms={sms} phone={customerPhone} />
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void run("send", async () => {
                        await staffQuoteAction(portal, open.id, "send", { channel: sendBy });
                        setSendOpen(null);
                        return `${quoteVersionLabel(open)} sent to ${customerName} by ${HOW[sendBy]}.`;
                      })
                    }
                    className={QUOTE_BUTTON.accent}
                  >
                    {busy === "send" ? "Sending…" : "Send quote"}
                  </button>
                </div>
              </fieldset>
            ) : null}

            {linkOpen === open.id ? (
              <fieldset id={`${uid}-link`} className="m-0 flex flex-col gap-2.5 rounded-[12px] border border-[#E3E8EF] bg-[#F8FAFC] p-3.5">
                <legend className="sr-only">Send the deposit payment link</legend>
                <p className="m-0 text-[13.5px] text-[#334155]">
                  Sends {customerName} the same deposit checkout they get in their portal.
                </p>
                <div className="flex flex-wrap items-start gap-2">
                  <ChannelChoice value={linkBy} onChange={setChannel} sms={sms} phone={customerPhone} />
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void run("link", async () => {
                        const { url } = await sendPaymentLink(portal, open.id, linkBy);
                        if (url) setLinkUrl({ id: open.id, url });
                        return `Payment link sent to ${customerName} by ${HOW[linkBy]}.`;
                      })
                    }
                    className={QUOTE_BUTTON.primary}
                  >
                    {busy === "link" ? "Sending…" : "Send link"}
                  </button>
                </div>
                {linkUrl?.id === open.id ? <CopyLink url={linkUrl.url} /> : null}
              </fieldset>
            ) : null}

            {confirmWithdraw === open.id ? (
              <div role="alertdialog" aria-labelledby={`${uid}-wd`} className="flex flex-col gap-2.5 rounded-[12px] border border-[#FECACA] bg-[#FEF2F2] p-3.5">
                <p id={`${uid}-wd`} className="m-0 text-[13.5px] font-semibold text-[#7F1D1D]">
                  Withdraw {quoteVersionLabel(open)}? {open.status === "DRAFT" ? "It won't be sent." : `${customerName} can no longer accept it.`} Earlier versions aren&rsquo;t affected.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() =>
                      void run("withdraw", async () => {
                        await staffQuoteAction(portal, open.id, "withdraw");
                        setConfirmWithdraw(null);
                        return `${quoteVersionLabel(open)} withdrawn.`;
                      })
                    }
                    className={`${QUOTE_BUTTON.danger} border-[#B91C1C] bg-[#B91C1C] text-white hover:bg-[#991B1B]`}
                  >
                    {busy === "withdraw" ? "Withdrawing…" : "Withdraw quote"}
                  </button>
                  <button type="button" onClick={() => setConfirmWithdraw(null)} className={QUOTE_BUTTON.quiet}>
                    Keep it
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Card>
    );
  }

  const renderList = (inline: ReactNode) => (
    <div className="flex min-w-0 flex-col gap-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">
          Versions{quotes?.length ? <span className="ml-1.5 font-semibold text-[#5B6B80]">({quotes.length})</span> : null}
        </h3>
        <div className="flex flex-wrap gap-2">
          {compareIds.length >= 2 ? (
            <button type="button" onClick={() => setView({ kind: "compare" })} className={QUOTE_BUTTON.quiet}>
              Compare {compareIds.length}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setView({ kind: "create" });
            }}
            className={QUOTE_BUTTON.primary}
          >
            New quote
          </button>
        </div>
      </div>
      {quotes === null ? (
        <p className="m-0 py-4 text-[13.5px] text-[#5B6B80]">Loading quotes…</p>
      ) : quotes.length === 0 ? (
        <p className="m-0 rounded-[12px] bg-[#F4F6FA] px-3.5 py-3 text-[13.5px] leading-[1.5] text-[#475569]">
          No quotes yet for {customerName}. A new quote copies their latest design and prices it, so the design itself is never changed.
        </p>
      ) : (
        <>
          {quotes.length >= 2 ? (
            <p className="m-0 text-[12.5px] text-[#5B6B80]">Tick two or three versions to compare them.</p>
          ) : null}
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {quotes.map((q) => {
              const ticked = compareIds.includes(q.id);
              return (
                <li key={q.id} data-quote-id={q.id}>
                  <QuoteSummaryCard
                    quote={q}
                    selected={q.id === openId && view.kind === "list"}
                    onOpen={() => {
                      setView({ kind: "list" });
                      setOpenId(q.id === openId && layout === "stack" ? null : q.id);
                      setLinkOpen(null);
                      setConfirmWithdraw(null);
                    }}
                    aside={
                      quotes.length >= 2 ? (
                        <label
                          className={`flex size-11 cursor-pointer items-center justify-center rounded-[8px] hover:bg-[#F1F5F9] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#2563EB] ${
                            !ticked && compareIds.length >= 3 ? "cursor-not-allowed opacity-40" : ""
                          }`}
                          title={`Compare ${quoteVersionLabel(q)}`}
                        >
                          <input
                            type="checkbox"
                            checked={ticked}
                            disabled={!ticked && compareIds.length >= 3}
                            onChange={() => setCompareIds((ids) => (ticked ? ids.filter((i) => i !== q.id) : [...ids, q.id]))}
                            aria-label={`Compare ${quoteVersionLabel(q)}`}
                            className="size-[18px] accent-[#0B1A2E]"
                          />
                        </label>
                      ) : undefined
                    }
                  />
                  {q.id === openId && inline ? <div className="mt-2">{inline}</div> : null}
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      {loadError ? <QuoteNotice>{loadError}</QuoteNotice> : null}
      {notice ? <QuoteNotice tone={notice.tone}>{notice.text}</QuoteNotice> : null}
      {layout === "split" ? (
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)]">
          {renderList(null)}
          <div ref={mainRef} className="min-w-0 scroll-mt-4">{main ?? (
            <p className="m-0 hidden rounded-[12px] border border-dashed border-[#CBD5E1] px-4 py-8 text-center text-[13.5px] text-[#5B6B80] lg:block">
              {quotes?.length ? "Open a version to see it in full." : "Create the first quote to see it here."}
            </p>
          )}</div>
        </div>
      ) : (
        <>
          {view.kind !== "list" ? <div ref={mainRef} className="scroll-mt-2">{main}</div> : null}
          {renderList(view.kind === "list" ? main : null)}
        </>
      )}
    </div>
  );
}

function Card({ children }: { children: ReactNode }) {
  return <div className="flex min-w-0 flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-4 sm:p-5">{children}</div>;
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input readOnly value={url} aria-label="Payment link" onFocus={(e) => e.currentTarget.select()} className={`min-h-[40px] min-w-0 flex-1 rounded-[8px] border border-[#CBD5E1] bg-white px-2.5 text-[12.5px] text-[#334155] ${QUOTE_FOCUS}`} />
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false));
        }}
        className={QUOTE_BUTTON.quiet}
      >
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
