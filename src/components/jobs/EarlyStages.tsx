"use client";

import { useEffect, useState } from "react";
import type { AiPortal } from "@/lib/ai-platform/client";
import { aud, day, jobs, when, type JobView, type RankRow } from "@/lib/ai-platform/jobs";
import { Btn, Card, Field, inputCls, Pill, type JobCtl } from "./ui";

/** Stage 2 — staff: who the matching agent would offer the job to, and why. */
export function MatchingPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const [rows, setRows] = useState<RankRow[] | null>(null);
  useEffect(() => {
    jobs.ranking(view.job.id).then(setRows, () => setRows([]));
  }, [view.job.id, view.offers.length]);
  const open = view.offers.find((o) => o.status === "open");
  return (
    <Card title="Installer matching" aside={!view.job.installerId && !open && <Btn small onClick={() => ctl.act("match", {}, "Offer sent to the best eligible installer.")}>Offer to best installer</Btn>}>
      <p className="m-0 text-[13px] text-[#475569]">Score = distance 40% + rating 35% + reliability 25%. Only installers with current SAA accreditation (and a battery endorsement for battery jobs), inside their service area, are offered the job.</p>
      {view.offers.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px]">
          {view.offers.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-2">
              <strong>{o.installerName}</strong>
              <Pill tone={o.status === "accepted" ? "good" : o.status === "open" ? "info" : "neutral"}>{o.status}</Pill>
              <span className="text-[#5B6B80]">
                score {o.score} · {o.parts.distanceKm} km · offered {when(o.at)}
                {o.status === "open" ? ` · answer by ${when(o.expiresAt)}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-[13.5px]">
          <thead>
            <tr className="text-left text-[11.5px] uppercase tracking-[0.04em] text-[#5B6B80]">
              <th className="py-1.5 pr-2">Installer</th>
              <th className="py-1.5 pr-2 text-right">Score</th>
              <th className="py-1.5 pr-2 text-right">Distance</th>
              <th className="py-1.5 pr-2 text-right">Rating</th>
              <th className="py-1.5 pr-2 text-right">Reliability</th>
              <th className="py-1.5">Eligible</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => (
              <tr key={r.installerId} className="border-t border-[#EEF1F5]">
                <td className="py-2 pr-2 font-semibold text-[#0F172A]">{r.name}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{r.score}</td>
                <td className="py-2 pr-2 text-right tabular-nums">{r.distanceKm} km</td>
                <td className="py-2 pr-2 text-right tabular-nums">
                  {r.rating.toFixed(1)} <span className="text-[#5B6B80]">({r.reviews})</span>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums">{Math.round(r.reliability * 100)}%</td>
                <td className="py-2">{r.eligible ? <Pill tone="good">Yes</Pill> : <span className="text-[12.5px] text-[#92400E]">{r.reasons.join("; ")}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows === null && <p className="text-[13px] text-[#475569]">Ranking…</p>}
      </div>
    </Card>
  );
}

/** Stage 2 — installer: a job offer to accept or decline. */
export function OfferPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const o = view.offers.find((x) => x.status === "open");
  const [reason, setReason] = useState("");
  if (!o) return null;
  const s = view.job.selection;
  return (
    <Card title="New job offer" tone="warn" aside={<Pill tone="warn">Answer by {when(o.expiresAt)}</Pill>}>
      <dl className="m-0 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3 text-[13.5px]">
        <Info k="Suburb" v={view.job.site.address.split(",").slice(-1)[0]?.trim() ?? ""} />
        <Info k="System" v={`${s.kw.toFixed(1)} kW${s.battery ? ` + ${s.battery.usableKwh} kWh battery` : ""}`} />
        <Info k="Equipment" v={`${s.panels.model} · ${s.inverter.model}`} />
        <Info k="Value" v={aud(s.price)} />
        <Info k="Distance" v={`${o.parts.distanceKm} km`} />
      </dl>
      <p className="m-0 text-[12.5px] text-[#5B6B80]">The customer&apos;s contact details appear once you accept.</p>
      <div className="flex flex-wrap items-end gap-2">
        <Btn disabled={ctl.busy != null} onClick={() => ctl.act("accept_offer", {}, "Job accepted. The customer has been told.")}>
          Accept the job
        </Btn>
        <input className={`${inputCls} max-w-[260px]`} placeholder="Reason, if declining" value={reason} onChange={(e) => setReason(e.target.value)} aria-label="Reason for declining" />
        <Btn kind="danger" disabled={ctl.busy != null} onClick={() => ctl.act("decline_offer", { reason }, "Declined. The job goes to the next installer.")}>
          Decline
        </Btn>
      </div>
    </Card>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#5B6B80]">{k}</dt>
      <dd className="m-0 font-semibold text-[#0F172A]">{v}</dd>
    </div>
  );
}

/** Stage 3 — the confirmation card, site photos and job acceptance. */
export function ConfirmPanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const s = j.selection;
  const done = (k: string) => view.milestones.find((m) => m.key === k)?.done;
  const items = [
    [`${s.panels.count} × ${s.panels.model} (${s.panels.watts} W)`, `${s.kw.toFixed(2)} kW`],
    [s.inverter.model, `${s.inverter.kw} kW`],
    ...(s.battery ? [[s.battery.model, `${s.battery.usableKwh} kWh usable`]] : []),
    ...s.accessories.map((a) => [a.name, aud(a.price)]),
  ];
  const [uploading, setUploading] = useState<string | null>(null);
  return (
    <Card title="Your selection and site photos" tone={done("job_accepted") ? "good" : undefined}>
      <div className="flex flex-wrap gap-4">
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
          <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#5B6B80]">Selection</h4>
          <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
            {items.map(([a, b]) => (
              <li key={a} className="flex justify-between gap-3 border-b border-[#EEF1F5] pb-1">
                <span>{a}</span>
                <span className="text-[#475569]">{b}</span>
              </li>
            ))}
            <li className="flex justify-between gap-3 pt-1 font-bold">
              <span>Price (GST incl., before STCs)</span>
              <span>{aud(s.price)}</span>
            </li>
          </ul>
          {j.confirmation ? (
            <p className="m-0 rounded-[10px] bg-[#F0FDF4] p-2 text-[13px] text-[#166534]">
              Confirmed {when(j.confirmation.at)}: “{j.confirmation.transcript}”
            </p>
          ) : view.viewer === "customer" ? (
            <div className="flex flex-col gap-2 rounded-[10px] bg-[#F8FAFC] p-3">
              <p className="m-0 text-[13px] text-[#334155]">Say it to EasyLink AI (hold the AI button and speak), or confirm here. Your tap is the confirmation.</p>
              <Btn disabled={!done("installer_assigned") || ctl.busy != null} onClick={() => ctl.act("confirm_selection", { transcript: "Confirmed in the portal" }, "Confirmed. Your installer has been told.")}>
                Confirm my selection
              </Btn>
            </div>
          ) : (
            <p className="m-0 text-[13px] text-[#92400E]">Waiting for the customer to confirm.</p>
          )}
        </div>
        <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#5B6B80]">Site photos</h4>
            {view.viewer !== "customer" && !done("site_photos_ok") && (
              <Btn kind="secondary" small onClick={() => ctl.act("request_photos", {}, "Photo request sent to the customer.")}>
                {j.photos.requestedAt ? "Ask again" : "Request photos"}
              </Btn>
            )}
          </div>
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0 text-[14px]">
            {j.photos.items.map((p) => (
              <li key={p.label} className="flex flex-wrap items-center justify-between gap-2">
                <span>{p.label}</span>
                {p.ok ? (
                  <Pill tone="good">Received</Pill>
                ) : view.viewer === "customer" ? (
                  <label className="cursor-pointer rounded-[8px] border border-[#CBD5E1] px-2.5 py-1 text-[12.5px] font-semibold text-[#0B4A7A] hover:border-[#0B4A7A]">
                    {uploading === p.label ? "Uploading…" : "Take or upload photo"}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="sr-only"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        setUploading(p.label);
                        try {
                          const up = await jobs.upload(portal, j.id, f, "photo", p.label);
                          await ctl.act("upload_photo", { label: p.label, documentId: up.fileId }, `${p.label} photo received.`);
                        } catch (err) {
                          ctl.setError(err instanceof Error ? err.message : "Upload failed");
                        } finally {
                          setUploading(null);
                        }
                      }}
                    />
                  </label>
                ) : (
                  <Pill tone="warn">Waiting</Pill>
                )}
              </li>
            ))}
          </ul>
          <p className="m-0 text-[12px] text-[#5B6B80]">EasyLink AI reads each photo (meter number, switchboard condition) and flags anything that needs a look.</p>
        </div>
      </div>
      {view.viewer !== "customer" && !done("job_accepted") && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F5] pt-3">
          <Btn disabled={!done("selection_confirmed") || !done("site_photos_ok") || ctl.busy != null} onClick={() => ctl.act("accept_job", {}, "Job accepted. The agreement is with the customer to sign.")}>
            Accept job
          </Btn>
          <span className="text-[12.5px] text-[#475569]">Accepting creates the quote and installation agreement for the customer to sign.</span>
        </div>
      )}
    </Card>
  );
}

/** Stage 4 — installation dates. */
export function DatesPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const [d1, setD1] = useState("");
  const [d2, setD2] = useState("");
  if (j.installDates)
    return (
      <Card title="Installation dates" tone="good">
        <p className="m-0 text-[15px] font-semibold text-[#0F172A]">
          {day(j.installDates.day1)} and {day(j.installDates.day2)}
        </p>
        <p className="m-0 text-[12.5px] text-[#5B6B80]">Reminders go out 48 and 24 hours before, between 8 am and 8 pm. To change the dates, ask EasyLink AI; the other side confirms.</p>
      </Card>
    );
  return (
    <Card title="Installation dates">
      {j.windows.length === 0 ? (
        <p className="m-0 text-[14px] text-[#475569]">Dates are offered once the deposit is paid.</p>
      ) : view.viewer === "customer" ? (
        <div className="flex flex-wrap gap-2">
          {j.windows.map((w) => (
            <Btn key={w.id} kind="secondary" disabled={ctl.busy != null} onClick={() => ctl.act("pick_window", { windowId: w.id }, "Booked. Your installer has been told.")}>
              {day(w.day1)} + {day(w.day2)}
            </Btn>
          ))}
        </div>
      ) : (
        <p className="m-0 text-[14px] text-[#475569]">Offered to the customer: {j.windows.map((w) => `${day(w.day1)}–${day(w.day2)}`).join(", ")}.</p>
      )}
      {view.viewer !== "customer" && (
        <form
          className="flex flex-wrap items-end gap-2 border-t border-[#EEF1F5] pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ctl.act("propose_windows", d1 && d2 ? { windows: [{ day1: d1, day2: d2 }] } : {}, "Dates offered to the customer.");
          }}
        >
          <Field label="Day 1">
            <input className={inputCls} type="date" value={d1} onChange={(e) => setD1(e.target.value)} />
          </Field>
          <Field label="Day 2">
            <input className={inputCls} type="date" value={d2} onChange={(e) => setD2(e.target.value)} />
          </Field>
          <Btn type="submit" kind="secondary">
            {d1 && d2 ? "Offer these dates" : "Offer three windows from my calendar"}
          </Btn>
        </form>
      )}
    </Card>
  );
}

/** Stage 5 — the DNSP application pack (copy into the DNSP portal), reference and approval. */
export function ConnectionPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const c = j.connection;
  const [ref, setRef] = useState("");
  const [num, setNum] = useState("");
  const [limit, setLimit] = useState(String(j.selection.inverter.kw));
  const fields: [string, string][] = [
    ["Customer", j.customerName],
    ["Site address", j.site.address],
    ["NMI", j.site.nmi ?? "From the energy bill"],
    ["Phases", "Single phase"],
    ["Inverter", `${j.selection.inverter.model}, ${j.selection.inverter.kw} kW (CEC listed, AS/NZS 4777.1)`],
    ...(j.selection.battery ? ([["Battery", `${j.selection.battery.model}, ${j.selection.battery.usableKwh} kWh usable`]] as [string, string][]) : []),
    ["Array", `${j.selection.kw.toFixed(2)} kW (${j.selection.panels.count} × ${j.selection.panels.watts} W)`],
    ["Export requested", `${j.selection.inverter.kw} kW`],
  ];
  const tone = c.status === "approved" ? "good" : c.status === "refused" ? "warn" : undefined;
  return (
    <Card title={`Connection — ${c.dnsp}`} tone={tone} aside={<Pill tone={c.status === "approved" ? "good" : c.status === "submitted" ? "info" : "neutral"}>{c.status === "draft" ? "Not submitted" : c.status}</Pill>}>
      {c.approval ? (
        <p className="m-0 text-[14px] text-[#0F172A]">
          Approved {day(c.approval.at)} · approval <strong>{c.approval.number}</strong> · export limit <strong>{c.approval.exportLimitKw} kW</strong>
          {c.approval.conditions ? ` · ${c.approval.conditions}` : ""}
        </p>
      ) : view.viewer === "customer" ? (
        <p className="m-0 text-[14px] text-[#475569]">{c.status === "submitted" ? `Your installer applied to ${c.dnsp} (reference ${c.reference}). Approval usually takes 5–10 business days.` : "Your installer applies to your network distributor before installation."}</p>
      ) : (
        <>
          {c.status === "draft" && (
            <>
              <p className="m-0 text-[13px] text-[#475569]">Copy these into the {c.dnsp} portal, attach the single-line diagram, then enter the reference you get back.</p>
              <dl className="m-0 grid grid-cols-[minmax(120px,auto)_1fr_auto] items-center gap-x-3 gap-y-1.5 text-[13.5px]">
                {fields.map(([k, v]) => (
                  <div key={k} className="contents">
                    <dt className="text-[#5B6B80]">{k}</dt>
                    <dd className="m-0 font-semibold text-[#0F172A]">{v}</dd>
                    <dd className="m-0">
                      <button type="button" className="text-[12px] font-semibold text-[#0B4A7A] hover:underline" onClick={() => void navigator.clipboard?.writeText(v)}>
                        Copy
                      </button>
                    </dd>
                  </div>
                ))}
              </dl>
              <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => (e.preventDefault(), void ctl.act("submit_connection", { reference: ref }, "Recorded. EasyLink AI will watch for the approval email."))}>
                <Field label="DNSP reference">
                  <input className={inputCls} value={ref} onChange={(e) => setRef(e.target.value)} required />
                </Field>
                <Btn type="submit">Mark as submitted</Btn>
              </form>
            </>
          )}
          {c.status === "submitted" && (
            <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => (e.preventDefault(), void ctl.act("record_approval", { number: num, exportLimitKw: Number(limit) }, "Approval recorded."))}>
              <p className="m-0 w-full text-[13px] text-[#475569]">Submitted {day(c.submittedAt)}, reference {c.reference}. Forward the approval email to the job&apos;s address and it is read for you, or enter it here.</p>
              <Field label="Approval number">
                <input className={inputCls} value={num} onChange={(e) => setNum(e.target.value)} required />
              </Field>
              <Field label="Approved export limit (kW)">
                <input className={`${inputCls} w-[110px]`} type="number" step="0.1" value={limit} onChange={(e) => setLimit(e.target.value)} required />
              </Field>
              <Btn type="submit">Record approval</Btn>
            </form>
          )}
        </>
      )}
    </Card>
  );
}

/** Stage 6 — energy bills, savings re-check and the final quote. */
export function BillsPanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const [retailer, setRetailer] = useState("");
  const [daily, setDaily] = useState("");
  const [tariff, setTariff] = useState("Time of use");
  const [file, setFile] = useState<File | null>(null);
  const [changes, setChanges] = useState("");
  const [price, setPrice] = useState(String(j.selection.price));
  const done = (k: string) => view.milestones.find((m) => m.key === k)?.done;
  const pendingRevision = j.revisions.find((r) => r.status === "sent");
  return (
    <Card title="Energy bills and final quote" tone={done("quote_final") ? "good" : undefined}>
      {j.bills.items.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[14px]">
          {j.bills.items.map((b, i) => (
            <li key={i}>
              <strong>{b.retailer}</strong> · {b.tariff} · {b.dailyKwh} kWh a day{b.period ? ` · ${b.period}` : ""}
              {b.nmi ? ` · NMI ${b.nmi}` : ""}
            </li>
          ))}
        </ul>
      )}
      {j.bills.savingsAfter != null && (
        <p className="m-0 text-[14px]">
          Savings estimate on your real usage: <strong>{aud(j.bills.savingsAfter)}</strong> a year (design estimate {aud(j.bills.savingsBefore ?? j.selection.savingsPerYear)}).
        </p>
      )}
      {!done("bills_received") && (view.viewer === "customer" || view.viewer === "staff") && (
        <form
          className="flex flex-wrap items-end gap-2 rounded-[10px] bg-[#F8FAFC] p-3"
          onSubmit={async (e) => {
            e.preventDefault();
            try {
              if (file) await jobs.upload(portal, j.id, file, "bill", retailer || "Energy bill");
              await ctl.act("upload_bill", { retailer, dailyKwh: Number(daily), tariff }, "Bill received. Your installer will confirm the final quote.");
            } catch (err) {
              ctl.setError(err instanceof Error ? err.message : "Upload failed");
            }
          }}
        >
          <Field label="Your latest bill (PDF or photo)">
            <input type="file" accept="application/pdf,image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="text-[13px]" />
          </Field>
          <Field label="Retailer" hint="We read these from the bill; check them">
            <input className={inputCls} value={retailer} onChange={(e) => setRetailer(e.target.value)} required />
          </Field>
          <Field label="Average daily use (kWh)">
            <input className={`${inputCls} w-[110px]`} type="number" step="0.1" value={daily} onChange={(e) => setDaily(e.target.value)} required />
          </Field>
          <Field label="Tariff">
            <select className={inputCls} value={tariff} onChange={(e) => setTariff(e.target.value)}>
              <option>Time of use</option>
              <option>Flat</option>
              <option>Demand</option>
            </select>
          </Field>
          <Btn type="submit">Send bill</Btn>
        </form>
      )}
      {!done("bills_received") && view.viewer === "installer" && (
        <Btn kind="secondary" onClick={() => ctl.act("request_bills", {}, "Bill request sent.")}>
          {j.bills.requestedAt ? "Ask for bills again" : "Ask the customer for bills"}
        </Btn>
      )}
      {done("bills_received") && !done("quote_final") && view.viewer !== "customer" && !pendingRevision && (
        <form
          className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            const list = changes.split("\n").map((x) => x.trim()).filter(Boolean);
            void ctl.act("confirm_quote", { changes: list, newPrice: Number(price) }, list.length || Number(price) !== j.selection.price ? "Revision sent to the customer to accept." : "Quote confirmed.");
          }}
        >
          <Field label="Changes after the bills (one per line, leave empty if none)">
            <textarea className={inputCls} rows={2} value={changes} onChange={(e) => setChanges(e.target.value)} placeholder="e.g. Battery up from 9.6 to 12.8 kWh for evening use" />
          </Field>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Price (GST incl., before STCs)">
              <input className={`${inputCls} w-[140px]`} type="number" value={price} onChange={(e) => setPrice(e.target.value)} />
            </Field>
            <Btn type="submit">{changes.trim() || Number(price) !== j.selection.price ? "Send revision to customer" : "Confirm quote, no changes"}</Btn>
          </div>
        </form>
      )}
      {pendingRevision && <p className="m-0 text-[13.5px] text-[#92400E]">Quote revision {pendingRevision.version} ({aud(pendingRevision.price)}) is with the customer to accept.</p>}
    </Card>
  );
}
