import { QuoteStatusChip } from "@/components/quotes/QuoteParts";
import {
  MAX_QUOTE_REMINDERS,
  balanceCents,
  createdByName,
  depositLabel,
  expiresInText,
  formatCents,
  formatQuoteDate,
  isOpen,
  lineCategoryLabel,
  quoteAddress,
  quoteLines,
  quoteSystemSummary,
  quoteVersionLabel,
  type Quote,
  type QuoteLine,
} from "@/lib/quotes";

/**
 * A quote version in full: equipment, the price from subtotal to total, the
 * deposit and the balance. Staff also see internal notes and the history;
 * customers never do.
 */
export function QuoteDetail({
  quote,
  audience,
  now,
  showHeading = true,
}: {
  quote: Quote;
  audience: "staff" | "customer";
  now?: Date;
  /** False when shown right under its own summary card, which already names it. */
  showHeading?: boolean;
}) {
  const { equipment, extras } = quoteLines(quote);
  const address = quoteAddress(quote);
  const summary = quoteSystemSummary(quote);
  const showExpiry = quote.status === "DRAFT" || isOpen(quote, now);

  return (
    <article aria-label={quoteVersionLabel(quote)} className="flex flex-col gap-5">
      <header className="flex flex-col gap-1.5">
        {showHeading ? (
          <>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[13px] font-bold tabular-nums text-[#5B6B80]">{quoteVersionLabel(quote)}</span>
              <QuoteStatusChip quote={quote} now={now} />
            </div>
            <h3 className="m-0 font-source-sans text-[20px] font-bold leading-[1.25] text-[#0F172A]">{quote.title}</h3>
            {summary ? <p className="m-0 text-[14px] text-[#475569]">{summary}</p> : null}
          </>
        ) : null}
        {address ? <p className="m-0 text-[13.5px] text-[#5B6B80]">{address}</p> : null}
        <p className="m-0 text-[13.5px] text-[#334155]">
          <span className="font-semibold">Valid until {formatQuoteDate(quote.validUntil)}</span>
          {showExpiry ? <span className="text-[#5B6B80]"> · {expiresInText(quote.validUntil, now)}</span> : null}
        </p>
      </header>

      <section aria-label="What's included" className="flex flex-col gap-2">
        <h4 className="m-0 text-[14px] font-bold text-[#0F172A]">What&rsquo;s included</h4>
        {equipment.length || extras.length ? (
          <div className="overflow-hidden rounded-[12px] border border-[#E3E8EF]">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="bg-[#F8FAFC] text-left text-[12px] text-[#5B6B80]">
                  <th scope="col" className="px-3 py-2 font-semibold">Item</th>
                  <th scope="col" className="w-[56px] px-2 py-2 text-right font-semibold">Qty</th>
                  <th scope="col" className="w-[104px] px-3 py-2 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                {equipment.map((l, i) => (
                  <LineRow key={`e${i}`} line={l} />
                ))}
                {extras.length ? (
                  <tr>
                    <th colSpan={3} scope="colgroup" className="border-t border-[#E3E8EF] bg-[#F8FAFC] px-3 py-1.5 text-left text-[12px] font-semibold text-[#5B6B80]">
                      Installation and extras
                    </th>
                  </tr>
                ) : null}
                {extras.map((l, i) => (
                  <LineRow key={`x${i}`} line={l} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 rounded-[12px] bg-[#F4F6FA] px-3.5 py-3 text-[13.5px] text-[#475569]">
            The itemised list isn&rsquo;t available for this version. The price below is the full quoted price.
          </p>
        )}
      </section>

      <section aria-label="Price" className="flex flex-col gap-2">
        <h4 className="m-0 text-[14px] font-bold text-[#0F172A]">Price</h4>
        <dl className="m-0 flex flex-col rounded-[12px] border border-[#E3E8EF] text-[14px]">
          <Row label="Subtotal inc GST" value={formatCents(quote.subtotalCents)} />
          <Row
            label="STC discount"
            hint="Federal small-scale technology certificates, already applied"
            value={quote.stcDiscountCents > 0 ? `−${formatCents(quote.stcDiscountCents)}` : "None"}
            good={quote.stcDiscountCents > 0}
          />
          <Row
            label="Rebates"
            value={quote.rebateCents > 0 ? `−${formatCents(quote.rebateCents)}` : "None"}
            good={quote.rebateCents > 0}
          />
          <div className="flex items-baseline justify-between gap-3 border-t border-[#E3E8EF] bg-[#F8FAFC] px-3.5 py-3">
            <dt className="text-[15px] font-bold text-[#0F172A]">Total inc GST</dt>
            <dd className="m-0 font-source-sans text-[22px] font-bold tabular-nums text-[#0F172A]">{formatCents(quote.totalCents)}</dd>
          </div>
        </dl>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="flex flex-col gap-0.5 rounded-[12px] border border-[#F6C77F] bg-[#FFF8EB] px-3.5 py-3">
            <span className="text-[12.5px] font-semibold text-[#7A3E00]">{depositLabel(quote)}</span>
            <span className="text-[19px] font-bold tabular-nums text-[#0F172A]">{formatCents(quote.depositCents)}</span>
            <span className="text-[12px] text-[#7A3E00]">
              {quote.depositPaidAt
                ? `Paid ${formatQuoteDate(quote.depositPaidAt)}`
                : audience === "customer"
                  ? "Locks in your install when you accept"
                  : "Due when the customer accepts"}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 rounded-[12px] border border-[#E3E8EF] px-3.5 py-3">
            <span className="text-[12.5px] font-semibold text-[#5B6B80]">Balance on completion</span>
            <span className="text-[19px] font-bold tabular-nums text-[#0F172A]">{formatCents(balanceCents(quote))}</span>
            <span className="text-[12px] text-[#5B6B80]">{audience === "customer" ? "Due once your system is installed" : "Due once the system is installed"}</span>
          </div>
        </div>
      </section>

      {quote.notes?.trim() ? (
        <section aria-label="Notes" className="flex flex-col gap-1.5">
          <h4 className="m-0 text-[14px] font-bold text-[#0F172A]">{audience === "customer" ? "Notes from EasyLink" : "Notes to the customer"}</h4>
          <p className="m-0 whitespace-pre-wrap text-[14px] leading-[1.55] text-[#334155]">{quote.notes}</p>
        </section>
      ) : null}

      {audience === "staff" ? <StaffFacts quote={quote} /> : null}
    </article>
  );
}

function LineRow({ line }: { line: QuoteLine }) {
  const name = [line.brand && !line.name.toLowerCase().startsWith(line.brand.toLowerCase()) ? line.brand : null, line.name].filter(Boolean).join(" ");
  return (
    <tr className="border-t border-[#EEF2F6] align-top">
      <td className="px-3 py-2.5">
        <span className="block text-[11.5px] font-semibold text-[#5B6B80]">{lineCategoryLabel(line.category)}</span>
        <span className="block font-semibold text-[#0F172A]">{name}</span>
        {line.model && !name.includes(line.model) ? <span className="block text-[12px] text-[#5B6B80]">{line.model}</span> : null}
      </td>
      <td className="px-2 py-2.5 text-right tabular-nums text-[#334155]">{line.quantity}</td>
      <td className="px-3 py-2.5 text-right tabular-nums text-[#0F172A]">
        {formatCents(line.totalCents)}
        {line.quantity > 1 && line.unitPriceCents > 0 ? (
          <span className="block text-[11.5px] text-[#5B6B80]">{formatCents(line.unitPriceCents)} each</span>
        ) : null}
      </td>
    </tr>
  );
}

function Row({ label, value, hint, good }: { label: string; value: string; hint?: string; good?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-[#EEF2F6] px-3.5 py-2.5 first:border-t-0">
      <dt className="min-w-0 text-[#334155]">
        {label}
        {hint ? <span className="block text-[12px] text-[#5B6B80]">{hint}</span> : null}
      </dt>
      <dd className={`m-0 shrink-0 font-semibold tabular-nums ${good ? "text-[#15803D]" : "text-[#0F172A]"}`}>{value}</dd>
    </div>
  );
}

function StaffFacts({ quote }: { quote: Quote }) {
  const by = createdByName(quote);
  const history: [string, string | null][] = [
    ["Created", `${formatQuoteDate(quote.createdAt)}${by ? ` by ${by}` : ""}`],
    ["Sent", quote.sentAt ? formatQuoteDate(quote.sentAt) : null],
    ["Viewed", quote.viewedAt ? formatQuoteDate(quote.viewedAt) : null],
    ["Accepted", quote.acceptedAt ? `${formatQuoteDate(quote.acceptedAt)}${quote.acceptedName ? ` by ${quote.acceptedName}` : ""}` : null],
    ["Declined", quote.declinedAt ? `${formatQuoteDate(quote.declinedAt)}${quote.declineReason ? `: “${quote.declineReason}”` : ""}` : null],
    ["Deposit paid", quote.depositPaidAt ? formatQuoteDate(quote.depositPaidAt) : null],
    [
      "Reminders sent",
      quote.reminderCount
        ? `${quote.reminderCount} of ${MAX_QUOTE_REMINDERS}${quote.lastReminderAt ? `, last ${formatQuoteDate(quote.lastReminderAt)}` : ""}`
        : null,
    ],
  ];
  return (
    <>
      {quote.internalNotes?.trim() ? (
        <section aria-label="Internal notes" className="flex flex-col gap-1.5 rounded-[12px] border border-[#FDE68A] bg-[#FFFBEB] px-3.5 py-3">
          <h4 className="m-0 text-[13px] font-bold text-[#92400E]">Internal notes · not shown to the customer</h4>
          <p className="m-0 whitespace-pre-wrap text-[13.5px] leading-[1.5] text-[#451A03]">{quote.internalNotes}</p>
        </section>
      ) : null}
      <section aria-label="History">
        <h4 className="m-0 mb-1.5 text-[14px] font-bold text-[#0F172A]">History</h4>
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-[13px]">
          {history
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <div key={k} className="contents">
                <dt className="text-[#5B6B80]">{k}</dt>
                <dd className="m-0 text-[#0F172A]">{v}</dd>
              </div>
            ))}
        </dl>
      </section>
    </>
  );
}
