"use client";

/**
 * "What you'll pay and when" from the Easylink Designer "Payments" mock
 * (CustPayments.dc.html) — the four stages of paying for a solar job, and the
 * rebate note under them.
 *
 * The stages and who they are paid to are how EasyLink jobs actually work, so
 * the copy is real. The amounts are not: a deposit and balance only exist once
 * a proposal is accepted, and this app has no proposal or invoice model to
 * read them from. They stay as the mock's "$[deposit]" placeholders rather
 * than being invented, because a wrong number on a page about money owed is
 * worse than an obvious blank.
 *
 * The live payment history below this panel is real, and already loads from
 * the payments API.
 */

const INK = "#0F172A";
const MUTED = "#5B6B80";
const SLATE = "#475569";
const BORDER = "#E3E8EF";
const RULE = "#EEF2F6";
const GREEN = "#166534";

type Stage = {
  title: string;
  when: string;
  payee: string;
  amount: string;
};

const STAGES: Stage[] = [
  {
    title: "Deposit",
    when: "When you accept the proposal",
    payee: "To your installer",
    amount: "$[deposit]",
  },
  {
    title: "Balance",
    when: "When your system is switched on",
    payee: "To your installer",
    amount: "$[balance]",
  },
  {
    title: "Maintenance plan",
    when: "Yearly, from switch-on · optional",
    payee: "To your installer",
    amount: "$[X] / yr",
  },
  {
    title: "Shop orders",
    when: "When you check out",
    payee: "To EasyLink",
    amount: "As ordered",
  },
];

export function PaymentSchedulePanel() {
  return (
    <section
      aria-label="What you'll pay and when"
      className="flex flex-col gap-2 rounded-[14px] bg-white p-[18px]"
      style={{ border: `1px solid ${BORDER}` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="m-0 grow text-[16px] font-bold">What you&rsquo;ll pay and when</h2>
        <span
          title="The stages are real; the amounts come from a proposal, which this app does not store yet"
          className="cursor-help rounded-full px-2.5 py-0.75 text-[12px] font-bold"
          style={{ background: "#DBEAFE", color: "#1E40AF" }}
        >
          Amounts at proposal
        </span>
      </div>

      {STAGES.map((s, i) => (
        <div
          key={s.title}
          className="flex flex-wrap items-center gap-3 py-3"
          style={{ borderBottom: `1px solid ${RULE}` }}
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-[13px] font-bold"
            style={{ background: "#F1F5F9", color: SLATE }}
          >
            {i + 1}
          </span>
          <span className="min-w-50 grow">
            <span className="block text-[14px] font-semibold" style={{ color: INK }}>
              {s.title}
            </span>
            <span className="block text-[12px]" style={{ color: MUTED }}>
              {s.when}
            </span>
          </span>
          <span className="text-[13px]" style={{ color: SLATE }}>
            {s.payee}
          </span>
          <strong className="w-28 text-right text-[14px]">{s.amount}</strong>
        </div>
      ))}

      <p
        className="m-0 mt-1 rounded-[10px] px-3 py-2.5 text-[13px]"
        style={{ background: "#F0FDF4", color: GREEN }}
      >
        Rebates come off the price up front: solar, battery and hot water STCs
        are applied by your installer, so you never pay the full amount and
        claim it back.
      </p>
    </section>
  );
}
