"use client";

import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { StatusChip } from "@/components/customer/payments/StatusChip";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import {
  PAYMENT_STATUS_LABEL,
  PAYMENT_STATUS_TONE,
  explainPaymentQuestion,
  formatPaymentDate,
  paymentDate,
  paymentKindLabel,
  paymentMethodLabel,
  paymentTitle,
} from "@/lib/customers/payment-view";
import { formatPaymentAmount, type CustomerPayment } from "@/lib/customers/payments";

const COLS = "@3xl:grid-cols-[minmax(0,1.8fr)_minmax(0,0.8fr)_minmax(0,0.9fr)_minmax(0,0.8fr)_minmax(0,1fr)_auto]";

/**
 * Payment history: a scannable table when there is room, stacked cards when
 * there is not (container query, so it follows the panel, not the window).
 */
export function PaymentsList({ payments }: { payments: CustomerPayment[] }) {
  return (
    <div className="@container">
      <div
        aria-hidden="true"
        className={`hidden gap-4 border-b border-[#E2E8F0] px-4 pb-2.5 text-[12.5px] font-semibold text-[#5B6B80] @3xl:grid ${COLS}`}
      >
        <span>What for</span>
        <span>Date</span>
        <span>Method</span>
        <span className="text-right">Amount</span>
        <span>Status</span>
        <span className="w-[176px]" />
      </div>
      <ul className="m-0 flex list-none flex-col gap-3 p-0 @3xl:gap-0">
        {payments.map((p) => (
          <PaymentRow key={p.id} payment={p} />
        ))}
      </ul>
    </div>
  );
}

function PaymentRow({ payment: p }: { payment: CustomerPayment }) {
  const title = paymentTitle(p);
  const kind = paymentKindLabel(p.kind);
  const date = formatPaymentDate(paymentDate(p));
  const refunded = p.amountRefunded > 0 && p.amountRefunded < p.amount;

  return (
    <li
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 rounded-[16px] border border-[#E2E8F0] p-4 @3xl:items-center @3xl:rounded-none @3xl:border-0 @3xl:border-b @3xl:border-[#EEF2F6] @3xl:px-4 @3xl:py-3.5 @3xl:last:border-b-0 ${COLS}`}
    >
      {/* What for */}
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[15px] font-bold leading-[1.35] text-[#0F172A] [overflow-wrap:anywhere]">{title}</span>
        <span className="text-[13px] text-[#5B6B80]">
          {/* Skip the kind when it is already the title (blank description). */}
          {kind !== title ? kind : null}
          <span className="@3xl:hidden">
            {kind !== title ? " · " : null}
            {paymentMethodLabel(p.provider)} · {date}
          </span>
        </span>
        {p.status === "FAILED" && p.failureMessage ? <span className="text-[13px] text-[#991B1B]">{p.failureMessage}</span> : null}
      </div>

      {/* Amount sits top-right on a card, in its own column in the table. */}
      <span className="col-start-2 row-start-1 text-right text-[16px] font-extrabold tabular-nums text-[#0F172A] @3xl:hidden">
        {formatPaymentAmount(p)}
      </span>

      <span className="hidden text-[14px] text-[#334155] @3xl:block">{date}</span>
      <span className="hidden text-[14px] text-[#334155] @3xl:block">{paymentMethodLabel(p.provider)}</span>
      <span className="hidden text-right @3xl:flex @3xl:flex-col">
        <span className="text-[15px] font-bold tabular-nums text-[#0F172A]">{formatPaymentAmount(p)}</span>
        {refunded ? (
          <span className="text-[12px] text-[#5B6B80]">{formatPaymentAmount({ amount: p.amountRefunded, currency: p.currency })} refunded</span>
        ) : null}
      </span>

      <div className="col-span-2 flex flex-wrap items-center justify-between gap-2 @3xl:col-span-1 @3xl:contents">
        <span className="flex flex-wrap items-center gap-2">
          <StatusChip tone={PAYMENT_STATUS_TONE[p.status]}>{PAYMENT_STATUS_LABEL[p.status] ?? p.status}</StatusChip>
          {refunded ? (
            <span className="text-[12.5px] text-[#5B6B80] @3xl:hidden">
              {formatPaymentAmount({ amount: p.amountRefunded, currency: p.currency })} refunded
            </span>
          ) : null}
        </span>
        <div className="flex items-center gap-1 @3xl:w-[176px] @3xl:justify-end">
          {p.receiptUrl ? (
            <a
              href={p.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Receipt for ${title}`}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-2.5 text-[14px] font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
            >
              <PortalIcon name="download" size={16} />
              Receipt
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => askEasylinkAi(explainPaymentQuestion(p))}
            aria-label={`Ask EasyLink AI to explain ${title}`}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-[10px] px-2.5 text-[14px] font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            <PortalIcon name="spark" size={16} className="text-[#F68A0A]" />
            Explain
          </button>
        </div>
      </div>
    </li>
  );
}
