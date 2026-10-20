"use client";

import { useEffect, useState } from "react";
import type { AiPortal } from "@/lib/ai-platform/client";
import { aud, day, jobs, totals, type Invoice, type InvoiceLine, type JobView } from "@/lib/ai-platform/jobs";
import { Btn, Card, DocFrame, Field, inputCls, Modal, Pill, type JobCtl } from "./ui";

/**
 * Invoices on a job. Every invoice is a numbered tax-invoice document, however
 * it started (the New invoice form, an AI request, or an automatic draft).
 * Installers and staff create, edit drafts, send and adjust; customers see
 * sent invoices and pay them.
 */
const STATUS: Record<Invoice["status"], ["neutral" | "info" | "good" | "bad", string]> = {
  draft: ["neutral", "Draft"],
  sent: ["info", "Sent"],
  paid: ["good", "Paid"],
  void: ["bad", "Void"],
};
const VIA: Record<Invoice["createdVia"], string> = { form: "made with the form", ai: "made by EasyLink AI", auto: "drafted automatically" };

export function InvoicesPanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const [open, setOpen] = useState<Invoice | null>(null);
  const [editing, setEditing] = useState<Invoice | "new" | null>(null);
  const staffSide = view.viewer !== "customer";
  return (
    <Card
      title="Invoices"
      aside={
        staffSide && (
          <div className="flex flex-wrap gap-2">
            {!view.invoices.some((i) => i.kind === "final") && view.milestones.find((m) => m.key === "installed")?.done && (
              <Btn kind="secondary" small onClick={() => ctl.act("draft_invoice", { kind: "final" }, "Final invoice drafted.")}>
                Draft final invoice
              </Btn>
            )}
            <Btn small onClick={() => setEditing("new")}>
              New invoice
            </Btn>
          </div>
        )
      }
    >
      {view.invoices.length === 0 ? (
        <p className="m-0 text-[14px] text-[#475569]">{staffSide ? "No invoices yet. The deposit invoice is drafted when the agreement is signed." : "No invoices yet."}</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {view.invoices.map((inv) => {
            const paid = inv.payments.reduce((s, p) => s + p.amount, 0);
            return (
              <li key={inv.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-[#EEF1F5] py-3 last:border-0">
                <div className="flex min-w-0 flex-[1_1_220px] flex-col">
                  <button onClick={() => setOpen(inv)} className="text-left text-[14.5px] font-semibold text-[#0B4A7A] underline-offset-2 hover:underline">
                    {inv.kind === "credit" ? "Adjustment note" : "Tax invoice"} {inv.number}
                  </button>
                  <span className="text-[12.5px] text-[#5B6B80]">
                    {inv.kind} · issued {day(inv.issueDate)} · due {day(inv.dueDate)}
                    {staffSide ? ` · ${VIA[inv.createdVia]}` : ""}
                  </span>
                </div>
                <span className="text-[15px] font-bold tabular-nums text-[#0F172A]">{aud(inv.totals.total)}</span>
                <Pill tone={STATUS[inv.status][0]}>{STATUS[inv.status][1]}</Pill>
                <div className="flex gap-2">
                  {staffSide && inv.status === "draft" && (
                    <>
                      <Btn kind="secondary" small onClick={() => setEditing(inv)}>
                        Edit
                      </Btn>
                      <Btn small disabled={ctl.busy != null} onClick={() => ctl.act("send_invoice", { invoiceId: inv.id }, `${inv.number} sent to ${view.job.customerName}.`)}>
                        Send
                      </Btn>
                    </>
                  )}
                  {staffSide && inv.status !== "draft" && inv.kind !== "credit" && (
                    <Btn kind="ghost" small onClick={() => ctl.act("credit_invoice", { invoiceId: inv.id, reason: "Correction" }, `Adjustment note drafted for ${inv.number}.`)}>
                      Adjust
                    </Btn>
                  )}
                  {view.viewer === "staff" && inv.status === "sent" && (
                    <Btn kind="secondary" small onClick={() => ctl.act("record_payment", { invoiceId: inv.id, method: "EFT" }, "Payment recorded.")}>
                      Record EFT
                    </Btn>
                  )}
                  {view.viewer === "customer" && inv.status === "sent" && (
                    <Btn small disabled={ctl.busy != null} onClick={() => ctl.act("pay_invoice", { invoiceId: inv.id }, "Thanks — payment received.")}>
                      Pay {aud(inv.totals.total - paid)}
                    </Btn>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {staffSide && <p className="m-0 text-[12px] text-[#5B6B80]">You can also ask EasyLink AI, for example “invoice Daniel for the switchboard upgrade”. It drafts the same invoice here for you to check and send.</p>}
      {open && <InvoiceDoc portal={portal} inv={open} onClose={() => setOpen(null)} />}
      {editing && <InvoiceForm ctl={ctl} view={view} inv={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  );
}

function InvoiceDoc({ portal, inv, onClose }: { portal: AiPortal; inv: Invoice; onClose: () => void }) {
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    jobs.invoiceDoc(portal, inv.id).then((d) => setHtml(d.html), () => setHtml("<p>Couldn't load the invoice.</p>"));
  }, [portal, inv.id]);
  return (
    <Modal title={`${inv.kind === "credit" ? "Adjustment note" : "Tax invoice"} ${inv.number}`} onClose={onClose} wide>
      {html ? <DocFrame html={html} title={inv.number} /> : <p className="text-[14px] text-[#475569]">Loading…</p>}
    </Modal>
  );
}

/** The New invoice form (also edits drafts). Lines are entered ex GST with a GST tick, as on the printed invoice. */
export function InvoiceForm({ ctl, view, inv, onClose }: { ctl: JobCtl; view: JobView; inv: Invoice | null; onClose: () => void }) {
  const j = view.job;
  const [kind, setKind] = useState<Invoice["kind"]>(inv?.kind ?? "variation");
  const [lines, setLines] = useState<InvoiceLine[]>(inv?.lines ?? [{ description: "", qty: 1, unitExGst: 0, gst: true }]);
  const [dueDays, setDueDays] = useState(7);
  const [notes, setNotes] = useState(inv?.notes ?? "");
  const t = totals(lines);
  const set = (i: number, patch: Partial<InvoiceLine>) => setLines((ls) => ls.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  const valid = lines.length > 0 && lines.every((l) => l.description.trim() && l.qty > 0);

  return (
    <Modal title={inv ? `Edit draft ${inv.number}` : "New invoice"} onClose={onClose} wide>
      <form
        className="flex flex-col gap-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const clean = lines.map((l) => ({ ...l, description: l.description.trim() }));
          const r = inv
            ? await ctl.act("update_invoice", { invoiceId: inv.id, lines: clean, notes, dueDays }, `${inv.number} updated.`)
            : await ctl.act("create_invoice", { kind, lines: clean, notes, dueDays, via: "form" }, "Invoice saved as a draft. Check it, then Send.");
          if (r) onClose();
        }}
      >
        <div className="flex flex-wrap gap-3 text-[13px] text-[#334155]">
          <span>
            <strong>To:</strong> {j.customerName}, {j.site.address}
          </span>
          <span>
            <strong>From:</strong> {j.seller.name}
            {j.seller.abn ? `, ABN ${j.seller.abn}` : ""}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {!inv && (
            <Field label="Type">
              <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as Invoice["kind"])}>
                <option value="deposit">Deposit</option>
                <option value="variation">Variation (extra work)</option>
                <option value="final">Final</option>
                <option value="other">Other</option>
              </select>
            </Field>
          )}
          <Field label="Due in (days)">
            <input className={`${inputCls} w-[90px]`} type="number" min={0} max={90} value={dueDays} onChange={(e) => setDueDays(Number(e.target.value))} />
          </Field>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-[13.5px]">
            <thead>
              <tr className="text-left text-[11.5px] uppercase tracking-[0.04em] text-[#5B6B80]">
                <th className="py-1.5 pr-2 font-semibold">Description</th>
                <th className="w-[70px] py-1.5 pr-2 font-semibold">Qty</th>
                <th className="w-[130px] py-1.5 pr-2 font-semibold">Unit ex GST ($)</th>
                <th className="w-[56px] py-1.5 pr-2 font-semibold">GST</th>
                <th className="w-[110px] py-1.5 pr-2 text-right font-semibold">Amount</th>
                <th className="w-[36px]" />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i} className="border-t border-[#EEF1F5]">
                  <td className="py-1.5 pr-2">
                    <input className={inputCls} value={l.description} onChange={(e) => set(i, { description: e.target.value })} placeholder="e.g. Switchboard upgrade to RCBOs" aria-label={`Line ${i + 1} description`} required />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputCls} type="number" min={0} step="any" value={l.qty} onChange={(e) => set(i, { qty: Number(e.target.value) })} aria-label={`Line ${i + 1} quantity`} />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input className={inputCls} type="number" step="0.01" value={l.unitExGst} onChange={(e) => set(i, { unitExGst: Number(e.target.value) })} aria-label={`Line ${i + 1} unit price ex GST`} />
                  </td>
                  <td className="py-1.5 pr-2 text-center">
                    <input type="checkbox" checked={l.gst} onChange={(e) => set(i, { gst: e.target.checked })} aria-label={`Line ${i + 1} GST applies`} />
                  </td>
                  <td className="py-1.5 pr-2 text-right tabular-nums">{aud(l.qty * l.unitExGst * (l.gst ? 1.1 : 1))}</td>
                  <td className="py-1.5">
                    <button type="button" onClick={() => setLines((ls) => ls.filter((_, k) => k !== i))} disabled={lines.length === 1} aria-label={`Remove line ${i + 1}`} className="rounded px-1.5 text-[16px] text-[#94A3B8] hover:text-[#991B1B] disabled:opacity-30">
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Btn kind="secondary" small onClick={() => setLines((ls) => [...ls, { description: "", qty: 1, unitExGst: 0, gst: true }])}>
            Add line
          </Btn>
          <dl className="m-0 grid grid-cols-[auto_auto] gap-x-6 gap-y-1 text-[13.5px]">
            <dt className="text-[#475569]">Total ex GST</dt>
            <dd className="m-0 text-right tabular-nums">{aud(t.exGst)}</dd>
            <dt className="text-[#475569]">GST</dt>
            <dd className="m-0 text-right tabular-nums">{aud(t.gst)}</dd>
            <dt className="font-bold">Total</dt>
            <dd className="m-0 text-right font-bold tabular-nums">{aud(t.total)}</dd>
          </dl>
        </div>
        <Field label="Note on the invoice (optional)">
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        {ctl.error && <p role="alert" className="m-0 text-[13px] text-[#991B1B]">{ctl.error}</p>}
        <div className="flex justify-end gap-2">
          <Btn kind="secondary" onClick={onClose}>
            Cancel
          </Btn>
          <Btn type="submit" disabled={!valid || ctl.busy != null}>
            {inv ? "Save draft" : "Save as draft"}
          </Btn>
        </div>
        <p className="m-0 text-[12px] text-[#5B6B80]">Saved invoices are numbered tax invoices kept on the job. A sent invoice is never edited; corrections are adjustment notes.</p>
      </form>
    </Modal>
  );
}
