"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Btn, Card, Field, inputCls, Pill } from "@/components/jobs/ui";
import type { Circuit, CircuitStatus, TechnicalData, TechnicalPatch } from "./types";
import { DiagramKey, WiringDiagram } from "./WiringDiagram";

/**
 * Technical section of a job: wiring diagram, device installation, circuit
 * protection, CT routing and app preview, worked out from the lead's quote or
 * design under AU/NZ rules. Staff (Operations Portal) and the lead's installer
 * see the same pack and can fill in ratings, ticks, notes and sign-off.
 */

type Portal = "admin" | "installers";
type Tab = "overview" | "wiring" | "device" | "protection" | "ct" | "app";
const TABS: [Tab, string][] = [
  ["overview", "Overview"],
  ["wiring", "Wiring diagram"],
  ["device", "Device installation"],
  ["protection", "Circuit protection"],
  ["ct", "CT routing"],
  ["app", "App preview"],
];

const STATUS: Record<CircuitStatus, [string, "good" | "warn" | "info" | "neutral"]> = {
  READY: ["Ready", "good"],
  CONFIRMED: ["Confirmed", "good"],
  CHECK: ["Calculated: check", "info"],
  TBC: ["TBC", "warn"],
};

function Table({ head, children, min = 640 }: { head: string[]; children: ReactNode; min?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]" style={{ minWidth: min }}>
        <thead>
          <tr>
            {head.map((h) => (
              <th key={h} className="border-b border-[#E3E8EF] px-2 py-2 text-left text-[11.5px] font-semibold uppercase tracking-[0.04em] text-[#475569]">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
const td = "border-b border-[#F1F5F9] px-2 py-2.5 align-top text-[#0F172A]";

function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className="flex min-w-0 flex-col rounded-[12px] bg-[#F8FAFC] p-3">
      <span className="text-[12px] font-semibold text-[#475569]">{label}</span>
      <span className="font-source-sans text-[26px] font-bold leading-[32px]" style={{ color: tone ?? "#0F172A" }}>
        {value}
      </span>
      {sub && <span className="text-[12px] text-[#475569]">{sub}</span>}
    </div>
  );
}

function CircuitRow({ c, onSave, saving }: { c: Circuit; onSave: (id: string, v: { breaker: string; cable: string }) => void; saving: boolean }) {
  const [breaker, setBreaker] = useState(c.status === "CONFIRMED" ? c.breaker ?? "" : "");
  const [cable, setCable] = useState(c.status === "CONFIRMED" ? c.cable ?? "" : "");
  const dirty = breaker !== (c.status === "CONFIRMED" ? c.breaker ?? "" : "") || cable !== (c.status === "CONFIRMED" ? c.cable ?? "" : "");
  const [label, tone] = STATUS[c.status];
  const editable = c.phases !== "PE";
  return (
    <tr>
      <td className={td}>
        <span className="font-semibold">{c.circuit}</span>
        {c.note && <span className="block pt-0.5 text-[12px] text-[#475569]">{c.note}</span>}
      </td>
      <td className={td}>{c.phases}</td>
      <td className={td}>
        <span className="block">{c.calculatedBreaker ?? <span className="text-[#92400E]">From manual</span>}</span>
        {editable && (
          <label className="mt-1 block">
            <span className="sr-only">Installed breaker for {c.circuit}</span>
            <input className={`${inputCls} max-w-[150px]`} placeholder="Installed (e.g. 50 A)" value={breaker} onChange={(e) => setBreaker(e.target.value)} maxLength={60} />
          </label>
        )}
      </td>
      <td className={td}>{c.rcd}</td>
      <td className={td}>
        <span className="block">{c.calculatedCable ?? <span className="text-[#92400E]">From manual</span>}</span>
        {editable && (
          <label className="mt-1 block">
            <span className="sr-only">Installed cable for {c.circuit}</span>
            <input className={`${inputCls} max-w-[150px]`} placeholder="Installed (e.g. 10 mm²)" value={cable} onChange={(e) => setCable(e.target.value)} maxLength={60} />
          </label>
        )}
      </td>
      <td className={td}>{c.standard}</td>
      <td className={td}>
        <div className="flex flex-col items-start gap-1.5">
          <Pill tone={tone}>{label}</Pill>
          {editable && dirty && (
            <Btn small disabled={saving} onClick={() => onSave(c.id, { breaker, cable })}>
              Save
            </Btn>
          )}
        </div>
      </td>
    </tr>
  );
}

export function TechnicalSection({ portal, leadId, compact }: { portal: Portal; leadId: string; compact?: boolean }) {
  const base = portal === "admin" ? "/api/admin" : "/api/installers";
  const [data, setData] = useState<TechnicalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("overview");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [electrician, setElectrician] = useState("");
  const [licence, setLicence] = useState("");
  const [open, setOpen] = useState(!compact);

  const load = useCallback(() => {
    fetch(`${base}/technical/lead/${encodeURIComponent(leadId)}`, { cache: "no-store" })
      .then(async (r) => {
        const j = (await r.json().catch(() => ({}))) as { data?: TechnicalData; message?: string };
        if (r.ok && j.data) {
          setData(j.data);
          setNotes(j.data.inputs.notes);
          setError(null);
        } else setError(j.message || "Couldn't load the technical section.");
      })
      .catch(() => setError("Couldn't load the technical section."));
  }, [base, leadId]);
  useEffect(load, [load]);
  // Opened from a lead card's Technical chip (#technical): scroll to it once it has loaded.
  useEffect(() => {
    if (data && !compact && typeof window !== "undefined" && window.location.hash === "#technical") document.getElementById("technical")?.scrollIntoView({ block: "start" });
  }, [data, compact]);

  const save = async (patch: TechnicalPatch, ok = "Saved") => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const r = await fetch(`${base}/technical/lead/${encodeURIComponent(leadId)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(patch) });
      const j = (await r.json().catch(() => ({}))) as { data?: TechnicalData; message?: string };
      if (r.ok && j.data) {
        setData(j.data);
        setSaveMsg(ok);
      } else setSaveMsg(j.message || "Couldn't save. Try again.");
    } catch {
      setSaveMsg("Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (error) return <p className="m-0 rounded-[10px] bg-[#FEF2F2] p-3 text-[13.5px] text-[#991B1B]">{error}</p>;
  if (!data) return <p className="m-0 text-[14px] text-[#475569]">Loading the technical section…</p>;
  const p = data.pack;
  const s = p.summary;
  const st = p.status;

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 className="m-0 font-source-sans text-[20px] font-bold text-[#0F172A]">Technical</h2>
        <span className="text-[13px] text-[#475569]">
          {p.jobTypeLabel} · {p.phaseLabel}
          {p.phaseAssumed ? " (assumed)" : ""} · from {p.source.label ?? "no design yet"} · AU/NZ rules
        </span>
        <span className="flex flex-wrap gap-1.5 pt-1">
          <Pill tone={st.readyPct === 100 ? "good" : "info"}>{st.readyPct}% ready</Pill>
          {st.tbc > 0 && <Pill tone="warn">{st.tbc} rating{st.tbc > 1 ? "s" : ""} TBC</Pill>}
          {st.toCheck > 0 && <Pill tone="info">{st.toCheck} calculated to check</Pill>}
          <Pill tone={st.checksDone === st.checksTotal ? "good" : "neutral"}>
            Checks {st.checksDone}/{st.checksTotal}
          </Pill>
          {st.signedOff ? <Pill tone="good">Signed off</Pill> : <Pill>Not signed off</Pill>}
          {data.reviewedAt && <Pill tone="good">Reviewed {new Date(data.reviewedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: "Australia/Sydney" })}</Pill>}
        </span>
      </div>
      <div className="flex flex-wrap gap-2 print:hidden">
        {compact && (
          <Btn kind="secondary" onClick={() => setOpen((o) => !o)}>
            {open ? "Hide" : "Open technical"}
          </Btn>
        )}
        {open && (
          <Btn kind="secondary" onClick={() => window.print()}>
            Print / PDF
          </Btn>
        )}
        {open && (
          <Btn disabled={saving} onClick={() => void save({ reviewed: !data.reviewedAt }, data.reviewedAt ? "Review cleared" : "Marked as reviewed")}>
            {data.reviewedAt ? "Clear reviewed" : "Mark as reviewed"}
          </Btn>
        )}
      </div>
    </div>
  );

  return (
    <section id="technical" className="flex scroll-mt-4 flex-col gap-4 rounded-[14px] border border-[#E3E8EF] bg-white p-5" aria-label="Technical section">
      {header}
      {saveMsg && (
        <p role="status" className="m-0 text-[13px] font-semibold text-[#166534]">
          {saveMsg}
        </p>
      )}
      {open && (
        <>
          <div role="tablist" aria-label="Technical sections" className="flex flex-wrap gap-1 rounded-[12px] border border-[#E3E8EF] bg-[#F8FAFC] p-1 print:hidden">
            {TABS.map(([k, l]) => (
              <button
                key={k}
                role="tab"
                aria-selected={tab === k}
                onClick={() => setTab(k)}
                className={`min-h-[40px] rounded-[10px] px-3 text-[13.5px] font-semibold ${tab === k ? "bg-[#0B1A2E] text-white" : "text-[#334155] hover:bg-white"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {tab === "overview" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
                <Stat label="System" value={s.systemKw ? `${s.systemKw} kW` : "—"} sub={s.panelCount ? `${s.panelCount} panels` : undefined} />
                <Stat label="Inverter" value={s.inverterKw ? `${s.inverterKw} kW` : "—"} sub={s.inverterModel ?? "Not chosen"} />
                <Stat label="Battery" value={s.batteryKwh ? `${s.batteryKwh} kWh` : "—"} sub={s.batteryModel ?? "None"} />
                <Stat label="DC/AC ratio" value={s.dcAcRatioPct ? `${s.dcAcRatioPct}%` : "—"} sub="200% max with a hybrid" tone={s.dcAcRatioPct && s.dcAcRatioPct > 200 ? "#B91C1C" : undefined} />
                <Stat label="Export limit" value={`${s.exportLimitKw} kW`} sub="10 kW per phase" />
                <Stat label="CT clamps" value={p.ctTotals.ctClamps} sub={p.ctTotals.harvi ? `${p.ctTotals.harvi} harvi` : "No harvi"} />
              </div>

              {p.warnings.length > 0 && (
                <Card title="Check before install" tone={st.warnings ? "warn" : undefined}>
                  <ul className="m-0 flex list-none flex-col gap-2 p-0">
                    {p.warnings.map((w) => (
                      <li key={w.text} className="flex items-start gap-2 text-[13.5px] text-[#0F172A]">
                        <Pill tone={w.level === "warn" ? "warn" : "info"}>{w.level === "warn" ? "Check" : "Note"}</Pill>
                        <span>{w.text}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
                {st.sections.map((sec) => (
                  <button
                    key={sec.key}
                    type="button"
                    onClick={() => setTab(sec.key as Tab)}
                    className="flex min-h-[64px] items-center justify-between gap-2 rounded-[12px] border border-[#E3E8EF] bg-white p-3 text-left hover:border-[#1976D2]"
                  >
                    <span className="text-[14px] font-semibold text-[#0F172A]">{sec.label}</span>
                    <Pill tone={sec.ready ? "good" : "warn"}>{sec.ready ? "Ready" : "Needs input"}</Pill>
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_360px]">
                <Card title="Bill of materials">
                  <Table head={["Item", "Role", "Qty"]} min={420}>
                    {p.bom.map((b, i) => (
                      <tr key={`${b.item}-${i}`}>
                        <td className={`${td} font-semibold`}>{b.item}</td>
                        <td className={td}>{b.role}</td>
                        <td className={td}>{b.qty}</td>
                      </tr>
                    ))}
                  </Table>
                </Card>
                <Card title="Sign-off">
                  {data.inputs.signOff ? (
                    <div className="flex flex-col gap-2 text-[13.5px] text-[#0F172A]">
                      <span>
                        <b>{data.inputs.signOff.electrician}</b>
                        {data.inputs.signOff.licence ? ` · licence ${data.inputs.signOff.licence}` : ""}
                      </span>
                      <span className="text-[12.5px] text-[#475569]">{new Date(data.inputs.signOff.at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" })}</span>
                      <div>
                        <Btn kind="secondary" small disabled={saving} onClick={() => void save({ signOff: null }, "Sign-off removed")}>
                          Remove sign-off
                        </Btn>
                      </div>
                    </div>
                  ) : (
                    <form
                      className="flex flex-col gap-2"
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (electrician.trim().length >= 2) void save({ signOff: { electrician, licence } }, "Signed off");
                      }}
                    >
                      <Field label="Licensed electrician">
                        <input className={inputCls} value={electrician} onChange={(e) => setElectrician(e.target.value)} maxLength={120} required />
                      </Field>
                      <Field label="Licence number">
                        <input className={inputCls} value={licence} onChange={(e) => setLicence(e.target.value)} maxLength={60} />
                      </Field>
                      <div>
                        <Btn type="submit" disabled={saving || electrician.trim().length < 2}>
                          Sign off
                        </Btn>
                      </div>
                    </form>
                  )}
                </Card>
              </div>

              <Card title="Notes">
                <label className="flex flex-col gap-2">
                  <span className="sr-only">Technical notes</span>
                  <textarea className={`${inputCls} min-h-[90px]`} value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={4000} placeholder="Variations from the diagram, cable runs, isolator locations…" />
                </label>
                <div>
                  <Btn kind="secondary" disabled={saving || notes === data.inputs.notes} onClick={() => void save({ notes }, "Notes saved")}>
                    Save notes
                  </Btn>
                </div>
              </Card>
            </div>
          )}

          {(tab === "wiring" || tab === "device") && (
            <div className="flex flex-col gap-4">
              <Card
                title={tab === "wiring" ? "Wiring diagram" : "Device installation diagram"}
                aside={<span className="text-[12.5px] text-[#475569]">Schematic only. Final design must follow AS/NZS 3000 and the manuals.</span>}
              >
                <div className="overflow-x-auto rounded-[12px] border border-[#E3E8EF] bg-[#FBFCFE]">
                  <WiringDiagram pack={p} detailed={tab === "device"} />
                </div>
                <DiagramKey phase={p.phase} detailed={tab === "device"} />
              </Card>
              {tab === "device" && (
                <>
                  <Card title="Ports and connections">
                    <Table head={["Device", "Port", "Connects to", "Protection", "Cable"]} min={720}>
                      {p.ports.map((pt) => (
                        <tr key={`${pt.deviceId}-${pt.port}`}>
                          <td className={td}>{p.devices.find((d) => d.id === pt.deviceId)?.label ?? pt.deviceId}</td>
                          <td className={`${td} font-semibold`}>{pt.port}</td>
                          <td className={td}>{pt.connectsTo}</td>
                          <td className={td}>{pt.protection}</td>
                          <td className={td}>{pt.cable}</td>
                        </tr>
                      ))}
                    </Table>
                  </Card>
                  <Card title="Australia / New Zealand wiring">
                    <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13.5px] leading-[20px] text-[#334155]">
                      <li>MEN system: neutral and earth are linked at the main switchboard (AS/NZS 3000).</li>
                      <li>Colours: {p.phase === 3 ? "red / white / blue actives" : "red active"}, black neutral, green/yellow earth.</li>
                      <li>Backup (EPS) neutral returns to the main neutral bar; follow the inverter manual where N and PE are linked.</li>
                      <li>DRM port connects a DRED where the network asks (AS/NZS 4777.2). Grid code AUS A / B / C; export {s.exportLimitKw} kW.</li>
                      <li>Battery location, clearances and signage to AS/NZS 5139; PV DC wiring and isolation to AS/NZS 5033.</li>
                    </ul>
                  </Card>
                </>
              )}
            </div>
          )}

          {tab === "protection" && (
            <div className="flex flex-col gap-4">
              <Card title="Minimum circuit protection" aside={<span className="text-[12.5px] text-[#475569]">Enter what is installed; it overrides the calculated value.</span>}>
                <Table head={["Circuit", "Phase", "Breaker", "RCD", "Cable", "Standard", "Status"]} min={1000}>
                  {p.circuits.map((c) => (
                    <CircuitRow key={`${c.id}-${c.status}-${c.breaker}-${c.cable}`} c={c} saving={saving} onSave={(id, v) => void save({ circuits: { [id]: v } }, "Circuit saved")} />
                  ))}
                </Table>
              </Card>
              <Card title="AU/NZ compliance checks">
                <ul className="m-0 flex list-none flex-col p-0">
                  {p.checks.map((c) => (
                    <li key={c.id}>
                      <label className="flex min-h-[44px] items-center gap-3 text-[13.5px] text-[#0F172A]">
                        <input type="checkbox" className="size-5" checked={!!data.inputs.checks[c.id]} disabled={saving} onChange={(e) => void save({ checks: { [c.id]: e.target.checked } }, "Check saved")} />
                        <span>
                          {c.label} <span className="text-[12px] text-[#475569]">· {c.standard}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          )}

          {tab === "ct" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="CT clamps" value={p.ctTotals.ctClamps} />
                <Stat label="harvi" value={p.ctTotals.harvi} tone={p.ctTotals.harvi ? "#BE185D" : undefined} sub={p.ctTotals.harvi ? "Pair wirelessly" : "Not needed"} />
                <Stat label="Supply" value={p.phase === 3 ? "3 ph" : "1 ph"} />
                <Stat label="Export limit" value={`${s.exportLimitKw} kW`} />
              </div>
              <Card title="CT routing">
                <Table head={["Component", "CTs", "Type", "Input", "Routing"]} min={760}>
                  {p.cts.map((c) => (
                    <tr key={c.id}>
                      <td className={`${td} font-semibold`}>{c.component}</td>
                      <td className={td}>{c.count}</td>
                      <td className={td}>{c.type}</td>
                      <td className={td}>{c.input}</td>
                      <td className={td}>{c.routing}</td>
                    </tr>
                  ))}
                </Table>
                {p.cts.length === 0 && <p className="m-0 text-[13.5px] text-[#475569]">No CTs until an inverter or battery is chosen.</p>}
              </Card>
              <Card title="Fitting the CTs">
                <ol className="m-0 flex flex-col gap-1.5 pl-5 text-[13.5px] leading-[20px] text-[#334155]">
                  <li>Clip each CT around one active conductor only, between the meter and the main switch.</li>
                  <li>Arrow towards the house (away from the grid), unless the manual says otherwise.</li>
                  <li>{p.phase === 3 ? "One CT per phase: L1 red, L2 white, L3 blue, matched to the meter inputs." : "One CT on the incoming active."}</li>
                  <li>Twisted pair for CT and RS485 runs; keep clear of power cables.</li>
                  <li>With load on, check import/export readings in the app match the meter.</li>
                </ol>
              </Card>
            </div>
          )}

          {tab === "app" && (
            <div className="flex flex-wrap items-start gap-6">
              <div className="w-[320px] shrink-0 rounded-[40px] bg-[#0B1426] p-3.5" role="img" aria-label={`${p.app.name} preview: ${p.app.flows.join(", ")}; modes ${p.app.modes.join(", ")}`}>
                <div className="flex min-h-[560px] flex-col gap-4 rounded-[28px] bg-[#0F1E35] p-4 text-white">
                  <span className="text-[12px] text-[#94A3B8]">{p.app.name}</span>
                  <span className="font-source-sans text-[22px] font-bold">{data.lead.name.split(" ")[0]}&apos;s home</span>
                  <div className="grid grid-cols-2 gap-2.5">
                    {p.app.flows.map((f) => (
                      <div key={f} className="rounded-[14px] bg-[#13294A] p-3">
                        <span className="block text-[12px] text-[#94A3B8]">{f}</span>
                        <span className="font-source-sans text-[22px] font-bold">— kW</span>
                      </div>
                    ))}
                  </div>
                  <span className="text-[12px] text-[#94A3B8]">Live numbers appear after commissioning.</span>
                  <span className="font-source-sans text-[17px] font-bold">Modes</span>
                  <div className="flex flex-wrap gap-1.5">
                    {p.app.modes.map((m, i) => (
                      <span key={m} className={`rounded-[10px] px-2.5 py-1.5 text-[12px] font-bold ${i === 0 ? "bg-[#22C55E] text-[#052E16]" : "bg-[#1E3A5F] text-[#E2E8F0]"}`}>
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex min-w-[280px] flex-1 flex-col gap-4">
                <Card title="Commissioning handover">
                  <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[13.5px] leading-[20px] text-[#334155]">
                    {p.app.notes.map((n) => (
                      <li key={n}>{n}</li>
                    ))}
                    <li>Show the customer how to read solar, home, grid{p.app.flows.includes("Battery") ? " and battery" : ""} in the app.</li>
                  </ul>
                </Card>
                <Card title="What the customer sees">
                  <p className="m-0 text-[13.5px] leading-[20px] text-[#334155]">
                    Energy flows ({p.app.flows.join(", ").toLowerCase()}) and {p.app.modes.length > 1 ? "battery modes" : "solar output"} in the {p.app.name}.
                  </p>
                </Card>
              </div>
            </div>
          )}

          <p className="m-0 text-[12px] text-[#475569]">
            Standards: {p.standards.join(" · ")}. Calculated values are a starting point: confirm against the equipment manuals before install.
          </p>
        </>
      )}
    </section>
  );
}
