"use client";

import { useEffect, useRef, useState } from "react";
import type { AiPortal } from "@/lib/ai-platform/client";
import { aud, day, jobs, when, type JobView, type SignatureView } from "@/lib/ai-platform/jobs";
import { SignFlow } from "./SignFlow";
import { Btn, Card, Field, inputCls, Pill, type JobCtl } from "./ui";

/** Stage 6 — the equipment order (installer and staff) and the delivery (everyone). */
export function OrderPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const o = j.order;
  const d = j.delivery;
  const [window, setWindow] = useState("");
  const [note, setNote] = useState("");
  const done = (k: string) => view.milestones.find((m) => m.key === k)?.done;
  return (
    <Card title={view.viewer === "customer" ? "Equipment delivery" : "Equipment order and delivery"} tone={d.status === "delivered" ? "good" : undefined}>
      {view.viewer !== "customer" && (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 text-[13.5px]">
            <strong>Order {o.ref ?? "(not placed)"}</strong>
            <Pill tone={o.status === "paid" ? "good" : o.status === "placed" ? "info" : "neutral"}>{o.status === "draft" ? "From the final quote" : o.status}</Pill>
            {o.paidAt && <span className="text-[#5B6B80]">paid {day(o.paidAt)}</span>}
          </div>
          <ul className="m-0 flex list-none flex-col p-0 text-[13.5px]">
            {o.lines.map((l) => (
              <li key={l.sku} className="flex justify-between gap-3 border-b border-[#EEF1F5] py-1">
                <span>{l.name}</span>
                <span className="tabular-nums text-[#475569]">× {l.qty}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            {o.status === "draft" && (
              <Btn disabled={!done("quote_final") || ctl.busy != null} onClick={() => ctl.act("place_order", {}, "Order placed with the EasyLink warehouse.")}>
                Place order
              </Btn>
            )}
            {o.status === "placed" && (
              <Btn disabled={ctl.busy != null} onClick={() => ctl.act("pay_order", {}, "Paid on your trade account. Stock is being picked.")}>
                Pay on trade account
              </Btn>
            )}
            {o.serials.length > 0 && <span className="text-[12.5px] text-[#5B6B80]">{o.serials.length} serials recorded at picking; they&apos;re checked on site.</span>}
          </div>
        </div>
      )}
      <div className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-3">
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <strong>Delivery</strong>
          <Pill tone={d.status === "delivered" ? "good" : d.status === "booked" ? "info" : "neutral"}>{d.status === "none" ? "Not booked" : d.status}</Pill>
          {d.window && <span>{d.window}</span>}
          {d.carrier && <span className="text-[#5B6B80]">· {d.carrier}</span>}
        </div>
        {d.pod && <p className="m-0 text-[13px] text-[#166534]">Delivered {when(d.pod.at)} — {d.pod.note}</p>}
        {view.viewer !== "customer" && d.status === "none" && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => (e.preventDefault(), void ctl.act("book_delivery", window ? { window } : {}, "Delivery booked. The customer has the window by SMS."))}>
            <Field label="Window" hint="Leave empty for the working day before day 1, 7–11 am">
              <input className={inputCls} value={window} onChange={(e) => setWindow(e.target.value)} placeholder="e.g. Wed 14 Oct, 7 am – 11 am" />
            </Field>
            <Btn type="submit" disabled={!done("equipment_paid") || !done("install_date_set")}>
              Book truck
            </Btn>
          </form>
        )}
        {view.viewer !== "customer" && d.status === "booked" && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => (e.preventDefault(), void ctl.act("mark_delivered", { note }, "Delivery recorded."))}>
            <Field label="Proof of delivery note">
              <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Where it was left, who signed" />
            </Field>
            <Btn type="submit">Mark delivered</Btn>
          </form>
        )}
      </div>
    </Card>
  );
}

/** Stage 7 — the installer's on-site app: check in, checklist with photos, serial scanning, tests, sign-off. */
export function OnSitePanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const s = j.onsite;
  const [serial, setSerial] = useState("");
  const [scanning, setScanning] = useState(false);
  const [signing, setSigning] = useState<SignatureView | null>(null);
  const [t, setT] = useState({ insulationMOhm: "", voc: "", isc: "", earthOk: true, exportLimitKw: String(j.connection.approval?.exportLimitKw ?? ""), csipTest: "passed" });
  const videoRef = useRef<HTMLVideoElement>(null);
  const done = (k: string) => view.milestones.find((m) => m.key === k)?.done;
  const installed = done("installed");
  const scannedOk = s.scanned.filter((x) => x.matched).length;
  const sig = view.signatures.find((x) => x.id === s.customerSignatureId);

  const checkIn = (dayN: 1 | 2) => {
    const go = (lat?: number, lng?: number) => void ctl.act("check_in", { day: dayN, ...(lat != null ? { lat, lng } : {}) }, dayN === 1 ? "Checked in. The customer knows you've arrived." : "Day 2 started.");
    if (typeof navigator !== "undefined" && navigator.geolocation) navigator.geolocation.getCurrentPosition((p) => go(p.coords.latitude, p.coords.longitude), () => go(), { timeout: 8000 });
    else go();
  };

  // Camera barcode scanning where the browser supports it; typing or a Bluetooth scanner works everywhere.
  useEffect(() => {
    if (!scanning) return;
    type Detector = { detect: (v: HTMLVideoElement) => Promise<{ rawValue: string }[]> };
    const W = window as unknown as { BarcodeDetector?: new (o: { formats: string[] }) => Detector };
    if (!W.BarcodeDetector) return;
    const det = new W.BarcodeDetector({ formats: ["code_128", "qr_code", "code_39", "data_matrix"] });
    let stream: MediaStream | null = null;
    let live = true;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: "environment" } }).then(async (st) => {
      stream = st;
      if (!videoRef.current) return;
      videoRef.current.srcObject = st;
      await videoRef.current.play();
      while (live && videoRef.current) {
        const hits = await det.detect(videoRef.current).catch(() => []);
        if (hits[0]?.rawValue) {
          live = false;
          setScanning(false);
          void ctl.act("scan_serial", { serial: hits[0].rawValue });
          break;
        }
        await new Promise((r) => setTimeout(r, 300));
      }
    });
    return () => {
      live = false;
      stream?.getTracks().forEach((x) => x.stop());
    };
  }, [scanning, ctl]);

  if (!done("install_started") && !(done("delivered") && done("connection_approved"))) {
    return (
      <Card title="On site">
        <p className="m-0 text-[14px] text-[#475569]">Opens when the equipment is delivered and the connection is approved.</p>
      </Card>
    );
  }
  return (
    <Card title="On site" tone={installed ? "good" : undefined} aside={installed ? <Pill tone="good">Installed {day(s.completeAt)}</Pill> : null}>
      <div className="flex flex-wrap items-center gap-2">
        {[1, 2].map((n) => {
          const c = s.checkins.find((x) => x.day === n);
          return c ? (
            <Pill key={n} tone="good">
              Day {n} checked in {when(c.at)}
            </Pill>
          ) : (
            <Btn key={n} kind={n === 1 ? "primary" : "secondary"} small disabled={installed || ctl.busy != null || (n === 2 && !s.checkins.some((x) => x.day === 1))} onClick={() => checkIn(n as 1 | 2)}>
              Check in day {n}
            </Btn>
          );
        })}
        <span className="text-[12px] text-[#5B6B80]">Check-in records time and location; the regulator wants installer attendance photos.</span>
      </div>

      {[1, 2].map((n) => (
        <div key={n} className="flex flex-col gap-1">
          <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#5B6B80]">Day {n} checklist</h4>
          <ul className="m-0 flex list-none flex-col p-0">
            {s.checklist
              .filter((c) => c.day === n)
              .map((c) => (
                <li key={c.key} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF1F5] py-1.5 text-[14px]">
                  <label className="flex items-center gap-2">
                    <input type="checkbox" checked={c.done} disabled={installed || !s.checkins.length} onChange={(e) => void ctl.act("tick", { key: c.key, done: e.target.checked })} />
                    {c.label}
                  </label>
                  {c.photo && !installed && (
                    <label className="cursor-pointer text-[12.5px] font-semibold text-[#0B4A7A] hover:underline">
                      {c.done ? "Photo added · add another" : "Take photo"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          try {
                            await jobs.upload(portal, j.id, f, "site", c.label);
                            await ctl.act("tick", { key: c.key, done: true });
                          } catch (err) {
                            ctl.setError(err instanceof Error ? err.message : "Upload failed");
                          }
                        }}
                      />
                    </label>
                  )}
                </li>
              ))}
          </ul>
        </div>
      ))}

      <div className="flex flex-col gap-2">
        <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#5B6B80]">
          Serial numbers · {scannedOk} of {j.order.serials.length}
        </h4>
        {!installed && (
          <form className="flex flex-wrap items-end gap-2" onSubmit={(e) => (e.preventDefault(), void ctl.act("scan_serial", { serial }).then(() => setSerial("")))}>
            <Field label="Scan the barcode on the product" hint="A Bluetooth scanner types into this box">
              <input className={`${inputCls} w-[220px] font-mono`} value={serial} onChange={(e) => setSerial(e.target.value)} autoCapitalize="characters" />
            </Field>
            <Btn type="submit" disabled={!serial.trim()}>
              Add
            </Btn>
            <Btn kind="secondary" onClick={() => setScanning((x) => !x)}>
              {scanning ? "Stop camera" : "Scan with camera"}
            </Btn>
          </form>
        )}
        {scanning && <video ref={videoRef} muted playsInline className="max-h-[220px] w-full max-w-[360px] rounded-[10px] bg-black" />}
        <div className="flex flex-wrap gap-1">
          {j.order.serials.map((x) => {
            const ok = s.scanned.some((y) => y.serial === x.serial && y.matched);
            return (
              <span key={x.serial} className={`rounded-[6px] px-1.5 py-0.5 font-mono text-[11.5px] ${ok ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#F1F5F9] text-[#64748B]"}`}>
                {x.serial}
              </span>
            );
          })}
        </div>
      </div>

      {!installed && (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const nums = (v: string) => v.split(/[,\s]+/).filter(Boolean).map(Number);
            void ctl.act("record_tests", { insulationMOhm: Number(t.insulationMOhm), vocPerString: nums(t.voc), iscPerString: nums(t.isc), earthOk: t.earthOk, exportLimitKw: Number(t.exportLimitKw), csipTest: t.csipTest }, "Test results saved.");
          }}
        >
          <h4 className="m-0 text-[13px] font-bold uppercase tracking-[0.04em] text-[#5B6B80]">Tests and commissioning {s.tests ? "· saved" : ""}</h4>
          <div className="flex flex-wrap items-end gap-2">
            <Field label="Insulation (MΩ)">
              <input className={`${inputCls} w-[100px]`} type="number" value={t.insulationMOhm} onChange={(e) => setT({ ...t, insulationMOhm: e.target.value })} required />
            </Field>
            <Field label="Voc per string (V)">
              <input className={`${inputCls} w-[130px]`} value={t.voc} onChange={(e) => setT({ ...t, voc: e.target.value })} placeholder="412, 409" />
            </Field>
            <Field label="Isc per string (A)">
              <input className={`${inputCls} w-[130px]`} value={t.isc} onChange={(e) => setT({ ...t, isc: e.target.value })} placeholder="13.6, 13.5" />
            </Field>
            <Field label="Export limit set (kW)">
              <input className={`${inputCls} w-[100px]`} type="number" step="0.1" value={t.exportLimitKw} onChange={(e) => setT({ ...t, exportLimitKw: e.target.value })} required />
            </Field>
            <Field label="CSIP-AUS test">
              <select className={inputCls} value={t.csipTest} onChange={(e) => setT({ ...t, csipTest: e.target.value })}>
                <option value="passed">Passed</option>
                <option value="failed">Failed</option>
                <option value="not_required">Not required</option>
              </select>
            </Field>
            <label className="flex items-center gap-2 pb-2 text-[13.5px]">
              <input type="checkbox" checked={t.earthOk} onChange={(e) => setT({ ...t, earthOk: e.target.checked })} /> Earth continuity OK
            </label>
            <Btn type="submit" kind="secondary">
              Save tests
            </Btn>
          </div>
        </form>
      )}

      {!installed && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F5] pt-3">
          {sig ? (
            <Btn onClick={() => setSigning(sig)}>Customer signs “Installation complete”</Btn>
          ) : (
            <Btn
              disabled={ctl.busy != null}
              onClick={async () => {
                const r = await ctl.act<{ signatureId: string }>("complete_install");
                if (r) {
                  const fresh = await jobs.get(portal, j.id);
                  const sv = fresh.signatures.find((x) => x.id === r.signatureId);
                  if (sv) setSigning(sv);
                }
              }}
            >
              Finish installation
            </Btn>
          )}
          <span className="text-[12.5px] text-[#475569]">Hand the phone to the customer: they get a code by SMS and sign on your screen.</span>
        </div>
      )}
      {installed && !done("site_docs_sent") && (
        <div className="flex flex-wrap items-center gap-2 border-t border-[#EEF1F5] pt-3">
          <Btn disabled={ctl.busy != null} onClick={() => ctl.act("send_site_docs", {}, "Documents sent to the customer and retailer.")}>
            Send today&apos;s documents
          </Btn>
          <span className="text-[12.5px] text-[#475569]">Each file goes to the right people by type: certificate of compliance to the customer and retailer, photos to your account, and so on.</span>
        </div>
      )}
      {signing && <SignFlow portal={portal} ctl={ctl} sig={signing} onClose={() => setSigning(null)} />}
    </Card>
  );
}

/** Stage 8 — the STC pack and the handover pack. */
export function CloseOutPanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const j = view.job;
  const st = j.stc;
  const done = (k: string) => view.milestones.find((m) => m.key === k)?.done;
  const [signing, setSigning] = useState<SignatureView | null>(null);
  const sig = view.signatures.find((x) => x.id === st.signatureId);
  const n = st.solar + st.battery;
  return (
    <Card title="STCs and handover" tone={done("stc_lodged") && done("handover_sent") ? "good" : undefined}>
      <div className="flex flex-wrap gap-6">
        <div className="flex flex-col">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#5B6B80]">STCs</span>
          <span className="text-[24px] font-bold text-[#0F172A]">{n}</span>
          <span className="text-[12.5px] text-[#475569]">
            {st.solar} solar + {st.battery} battery · {aud(n * view.stcPrice)} discount
          </span>
        </div>
        <div className="flex flex-col">
          <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#5B6B80]">Status</span>
          <span className="pt-1">
            <Pill tone={st.status === "lodged" ? "good" : st.status === "signed" ? "info" : st.status === "failed" ? "bad" : "neutral"}>{st.status.replace(/_/g, " ")}</Pill>
          </span>
          {st.agentRef && <span className="pt-1 text-[12.5px] text-[#475569]">Agent ref {st.agentRef}</span>}
        </div>
        {st.deadline && (
          <div className="flex flex-col">
            <span className="text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#5B6B80]">Create by</span>
            <span className="pt-1 text-[14px] font-semibold">{day(st.deadline)}</span>
          </div>
        )}
      </div>
      {view.viewer !== "customer" && st.checks.length > 0 && (
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-1 p-0 text-[13.5px]">
          {st.checks.map((c) => (
            <li key={c.label} className="flex items-start gap-2">
              <span aria-hidden className={c.ok ? "text-[#166534]" : "text-[#B45309]"}>
                {c.ok ? "✓" : "!"}
              </span>
              <span>
                {c.label}
                {c.detail ? <span className="text-[#5B6B80]"> · {c.detail}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        {view.viewer !== "customer" && done("installed") && (st.status === "not_started" || st.status === "ready") && (
          <Btn disabled={ctl.busy != null} onClick={() => ctl.act("send_stc_pack", {}, "STC pack sent to the customer to sign.")}>
            Send STC pack for signature
          </Btn>
        )}
        {sig && sig.status === "pending" && view.viewer === "customer" && <Btn onClick={() => setSigning(sig)}>Review and sign the STC assignment</Btn>}
        {sig && sig.status === "pending" && view.viewer !== "customer" && <span className="text-[13.5px] text-[#92400E]">With {j.customerName} to sign.</span>}
        {view.viewer !== "customer" && st.status === "signed" && (
          <Btn disabled={ctl.busy != null} onClick={() => ctl.act("lodge_stc", {}, "Lodged with the STC agent.")}>
            Lodge with STC agent
          </Btn>
        )}
      </div>
      <div className="flex flex-col gap-2 border-t border-[#EEF1F5] pt-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <strong className="text-[14px]">Handover pack</strong>
          {j.handover.sentAt ? <Pill tone="good">Sent {day(j.handover.sentAt)}</Pill> : null}
        </div>
        {j.handover.sentAt ? (
          <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-1 p-0 text-[13.5px]">
            {j.handover.documents.map((d) => (
              <li key={d}>· {d}</li>
            ))}
          </ul>
        ) : view.viewer === "customer" ? (
          <p className="m-0 text-[13.5px] text-[#475569]">Your agreement, invoices, warranties, certificates and manuals arrive together once the final invoice is paid and the STC form is signed.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <Btn disabled={!done("final_paid") || !done("stc_pack_signed") || ctl.busy != null} onClick={() => ctl.act("send_handover", {}, "Handover pack sent.")}>
              Send handover pack
            </Btn>
            <span className="text-[12.5px] text-[#475569]">Unlocks when the final invoice is paid and the STC form is signed.</span>
          </div>
        )}
      </div>
      {signing && <SignFlow portal={portal} ctl={ctl} sig={signing} onClose={() => setSigning(null)} />}
    </Card>
  );
}

/** Stage 9 — the first three days: output against expected, faults, issues. */
export function MonitoringPanel({ ctl, view }: { ctl: JobCtl; view: JobView }) {
  const m = view.job.monitoring;
  const max = Math.max(1, ...m.days.flatMap((d) => [d.kwh, d.expectedKwh]));
  const clear = view.milestones.find((x) => x.key === "monitoring_clear")?.done;
  if (!m.days.length && !m.linkedAt)
    return (
      <Card title="First three days">
        <p className="m-0 text-[14px] text-[#475569]">Starts when the system is commissioned and linked to {m.provider}.</p>
      </Card>
    );
  return (
    <Card title="First three days" tone={clear ? "good" : m.issues.some((i) => i.status === "open") ? "warn" : undefined} aside={<span className="text-[12.5px] text-[#5B6B80]">{m.provider}</span>}>
      <div className="flex items-end gap-4" role="img" aria-label={`Generation for ${m.days.length} days against expected`}>
        {[0, 1, 2].map((i) => {
          const d = m.days.at(i);
          return (
            <div key={i} className="flex w-[92px] flex-col items-center gap-1">
              <div className="flex h-[120px] w-full items-end justify-center gap-1">
                <div className="w-[26px] rounded-t-[4px] bg-[#CBD5E1]" style={{ height: `${d ? (d.expectedKwh / max) * 100 : 0}%` }} title="Expected" />
                <div className={`w-[26px] rounded-t-[4px] ${d && d.kwh < 0.8 * d.expectedKwh ? "bg-[#F59E0B]" : "bg-[#0B4A7A]"}`} style={{ height: `${d ? (d.kwh / max) * 100 : 0}%` }} title="Actual" />
              </div>
              <span className="text-[12px] font-semibold text-[#0F172A]">{d ? `${d.kwh} kWh` : "—"}</span>
              <span className="text-[11.5px] text-[#5B6B80]">{d ? day(d.date) : `Day ${i + 1}`}</span>
            </div>
          );
        })}
        <div className="flex flex-col gap-1 pb-8 text-[12px] text-[#475569]">
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#0B4A7A]" /> Actual
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-sm bg-[#CBD5E1]" /> Expected for the weather
          </span>
        </div>
      </div>
      {m.issues.length > 0 && (
        <ul className="m-0 flex list-none flex-col gap-1 p-0 text-[13.5px]">
          {m.issues.map((i, k) => (
            <li key={k} className="flex flex-wrap items-center gap-2">
              <Pill tone={i.status === "open" ? "warn" : "good"}>{i.status === "open" ? "Open" : "Fixed"}</Pill>
              <span>{i.text}</span>
              {i.status === "open" && view.viewer !== "customer" && (
                <Btn kind="ghost" small onClick={() => ctl.act("resolve_issue", { index: k }, "Marked fixed.")}>
                  Mark fixed
                </Btn>
              )}
            </li>
          ))}
        </ul>
      )}
      {clear && <p className="m-0 text-[13.5px] text-[#166534]">Three clear days. The system has moved to ongoing fleet monitoring.</p>}
    </Card>
  );
}

/** Every document to sign or signed on the job. */
export function SignaturesPanel({ portal, ctl, view }: { portal: AiPortal; ctl: JobCtl; view: JobView }) {
  const [open, setOpen] = useState<SignatureView | null>(null);
  if (!view.signatures.length) return null;
  return (
    <Card title="Documents to sign">
      <ul className="m-0 flex list-none flex-col p-0">
        {view.signatures.map((s) => (
          <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[#EEF1F5] py-2 last:border-0">
            <button onClick={() => setOpen(s)} className="text-left text-[14px] font-semibold text-[#0B4A7A] hover:underline">
              {s.title}
            </button>
            <span className="flex items-center gap-2 text-[12.5px] text-[#5B6B80]">
              {s.status === "signed" ? `signed ${when(s.signedAt)}` : `for ${s.signer.name}`}
              <Pill tone={s.status === "signed" ? "good" : "warn"}>{s.status === "signed" ? "Signed" : "To sign"}</Pill>
            </span>
          </li>
        ))}
      </ul>
      {open && <SignFlow portal={portal} ctl={ctl} sig={open} onClose={() => setOpen(null)} />}
    </Card>
  );
}
