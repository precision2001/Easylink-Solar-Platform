"use client";

import { useEffect, useMemo, useState } from "react";
import { ai, type AiPortal } from "@/lib/ai-platform/client";
import { AiRecordPanel } from "./AiRecordPanel";

/**
 * Renders a screen spec written by the AI (spec 13). Only these approved
 * components exist; there is no code path for the model to inject markup or
 * script. Every data binding is a read action run as the viewer, and every
 * form submits through the Action API, so a generated screen can never show
 * or do more than the viewer could on an existing screen.
 */
type Binding = { action: string; input: Record<string, unknown> };
type Base = { id: string; title?: string; span?: number };
export type ScreenComponent =
  | (Base & { kind: "kpi"; binding: Binding; measure?: "count" | "sum" | "avg"; field?: string })
  | (Base & { kind: "table"; binding: Binding; columns: { field: string; label: string }[]; rowLink?: string })
  | (Base & { kind: "chart"; binding: Binding; chart: "bar" | "line"; x: string; y?: string; measure?: "count" | "sum" })
  | (Base & { kind: "record_panel"; record: { type: string; id: string } })
  | (Base & { kind: "files"; binding: Binding })
  | (Base & { kind: "text"; markdown: string })
  | (Base & {
      kind: "action_form";
      action: string;
      fields: { name: string; label: string; type: "text" | "textarea" | "date" | "select" | "number"; options?: string[] }[];
      fixed?: Record<string, unknown>;
      submitLabel?: string;
    });
export type ScreenSpecView = { title: string; description?: string; components: ScreenComponent[] };

type Row = Record<string, unknown>;

function useBinding(portal: AiPortal, binding: Binding | undefined) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const key = JSON.stringify(binding ?? null);
  useEffect(() => {
    if (!binding) return;
    let alive = true;
    ai.action(portal, binding.action, { limit: 50, ...binding.input })
      .then((r) => {
        if (!alive) return;
        if (r.status !== "executed") return setError(r.message ?? r.policy?.reasons?.join("; ") ?? r.status);
        const res = r.result as unknown;
        setRows(Array.isArray(res) ? (res as Row[]) : res && typeof res === "object" ? [((res as { record?: Row }).record ?? res) as Row] : []);
      })
      .catch((e) => alive && setError(e instanceof Error ? e.message : "Could not load"));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [portal, key]);
  return { rows, error };
}

const get = (r: Row, path: string): unknown => path.split(".").reduce<unknown>((a, k) => (a && typeof a === "object" ? (a as Row)[k] : undefined), r);
const fmt = (v: unknown) => (v == null ? "—" : typeof v === "number" ? v.toLocaleString("en-AU") : typeof v === "object" ? JSON.stringify(v) : String(v));

function Card({ c, children }: { c: Base; children: React.ReactNode }) {
  return (
    <section
      aria-label={c.title ?? c.id}
      className="flex min-w-0 flex-col gap-2 rounded-[14px] border border-[#E3E8EF] bg-white p-4"
      style={{ gridColumn: `span ${Math.min(Math.max(c.span ?? 12, 1), 12)} / span ${Math.min(Math.max(c.span ?? 12, 1), 12)}` }}
    >
      {c.title && <h3 className="m-0 text-[14px] font-bold text-[#0F172A]">{c.title}</h3>}
      {children}
    </section>
  );
}

function State({ rows, error }: { rows: Row[] | null; error: string | null }) {
  if (error) return <span className="text-[13px] text-[#991B1B]">{error}</span>;
  if (!rows) return <span className="text-[13px] text-[#5B6B80]">Loading…</span>;
  return null;
}

function Kpi({ c, portal }: { c: Extract<ScreenComponent, { kind: "kpi" }>; portal: AiPortal }) {
  const { rows, error } = useBinding(portal, c.binding);
  const value = useMemo(() => {
    if (!rows) return null;
    if (!c.measure || c.measure === "count" || !c.field) return rows.length;
    const nums = rows.map((r) => Number(get(r, c.field!))).filter((n) => Number.isFinite(n));
    const sum = nums.reduce((a, b) => a + b, 0);
    return c.measure === "sum" ? sum : nums.length ? sum / nums.length : 0;
  }, [rows, c.measure, c.field]);
  return (
    <Card c={c}>
      <State rows={rows} error={error} />
      {value != null && <span className="font-source-sans text-[30px] font-bold tabular-nums text-[#0F172A]">{fmt(Math.round(value * 100) / 100)}</span>}
    </Card>
  );
}

function Table({ c, portal }: { c: Extract<ScreenComponent, { kind: "table" }>; portal: AiPortal }) {
  const { rows, error } = useBinding(portal, c.binding);
  return (
    <Card c={c}>
      <State rows={rows} error={error} />
      {rows && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr className="text-left text-[#475569]">
                {c.columns.map((col) => (
                  <th key={col.field} className="border-b border-[#E3E8EF] p-2 font-semibold">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={String(r.id ?? i)}>
                  {c.columns.map((col) => (
                    <td key={col.field} className="border-b border-[#EEF2F6] px-2 py-2 text-[#0F172A]">
                      {fmt(get(r, col.field))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 && <p className="p-3 text-center text-[13px] text-[#5B6B80]">Nothing to show.</p>}
        </div>
      )}
    </Card>
  );
}

function Chart({ c, portal }: { c: Extract<ScreenComponent, { kind: "chart" }>; portal: AiPortal }) {
  const { rows, error } = useBinding(portal, c.binding);
  const data = useMemo(() => {
    if (!rows) return [];
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = fmt(get(r, c.x));
      const v = c.measure === "sum" && c.y ? Number(get(r, c.y)) || 0 : 1;
      m.set(k, (m.get(k) ?? 0) + v);
    }
    return [...m.entries()].slice(0, 24);
  }, [rows, c.x, c.y, c.measure]);
  const max = Math.max(1, ...data.map((d) => d[1]));
  const W = 560;
  const H = 180;
  const bw = data.length ? W / data.length : W;
  return (
    <Card c={c}>
      <State rows={rows} error={error} />
      {rows && data.length > 0 && (
        <svg viewBox={`0 -20 ${W} ${H + 56}`} role="img" aria-label={c.title ?? "Chart"} className="h-auto w-full">
          {c.chart === "bar"
            ? data.map(([k, v], i) => (
                <g key={k}>
                  <rect x={i * bw + bw * 0.15} y={H - (v / max) * H} width={bw * 0.7} height={(v / max) * H} rx={3} fill="#0B4A7A">
                    <title>{`${k}: ${v}`}</title>
                  </rect>
                  <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="#475569">
                    {k.length > 12 ? `${k.slice(0, 11)}…` : k}
                  </text>
                  <text x={i * bw + bw / 2} y={H - (v / max) * H - 4} textAnchor="middle" fontSize="11" fill="#0F172A">
                    {v}
                  </text>
                </g>
              ))
            : (
              <>
                <polyline
                  fill="none"
                  stroke="#0B4A7A"
                  strokeWidth={2}
                  points={data.map(([, v], i) => `${i * bw + bw / 2},${H - (v / max) * H}`).join(" ")}
                />
                {data.map(([k, v], i) => (
                  <g key={k}>
                    <circle cx={i * bw + bw / 2} cy={H - (v / max) * H} r={3.5} fill="#0B4A7A">
                      <title>{`${k}: ${v}`}</title>
                    </circle>
                    <text x={i * bw + bw / 2} y={H + 14} textAnchor="middle" fontSize="11" fill="#475569">
                      {k.length > 12 ? `${k.slice(0, 11)}…` : k}
                    </text>
                  </g>
                ))}
              </>
            )}
        </svg>
      )}
    </Card>
  );
}

function Files({ c, portal }: { c: Extract<ScreenComponent, { kind: "files" }>; portal: AiPortal }) {
  const { rows, error } = useBinding(portal, c.binding);
  return (
    <Card c={c}>
      <State rows={rows} error={error} />
      {rows?.map((f) => (
        <div key={String(f.id)} className="flex gap-2 border-b border-[#EEF2F6] py-1.5 text-[13px] last:border-0">
          <span className="flex-grow text-[#0F172A]">{fmt(f.name)}</span>
          <span className="text-[#475569]">{fmt((f.labels as { label: string }[] | undefined)?.[0]?.label)}</span>
        </div>
      ))}
    </Card>
  );
}

/** Plain text with **bold** and line breaks only: no HTML from the model ever reaches the DOM. */
function SafeText({ text }: { text: string }) {
  return (
    <>
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="m-0 text-[13px] text-[#334155]">
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) => (part.startsWith("**") && part.endsWith("**") ? <strong key={j}>{part.slice(2, -2)}</strong> : <span key={j}>{part}</span>))}
        </p>
      ))}
    </>
  );
}

function ActionForm({ c, portal }: { c: Extract<ScreenComponent, { kind: "action_form" }>; portal: AiPortal }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    setMsg(null);
    const fixed = { ...(c.fixed ?? {}) };
    const intoFields = "fields" in fixed || ["update_record", "create_record", "schedule"].includes(c.action);
    const typed = Object.fromEntries(c.fields.map((f) => [f.name, f.type === "number" ? Number(values[f.name] ?? 0) : values[f.name] ?? ""]));
    const input = intoFields ? { ...fixed, fields: { ...((fixed.fields as object) ?? {}), ...typed } } : { ...fixed, ...typed };
    try {
      const r = await ai.action(portal, c.action, input);
      setMsg(r.status === "executed" ? "Done." : r.status === "proposed" ? "Sent for approval." : `Not done: ${r.message ?? r.policy?.reasons?.join("; ") ?? r.status}`);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card c={c}>
      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {c.fields.map((f) => {
          const id = `${c.id}-${f.name}`;
          const common = { id, value: values[f.name] ?? "", onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((v) => ({ ...v, [f.name]: e.target.value })), className: "rounded-[8px] border border-[#CBD5E1] px-2 py-1.5 text-[13px]" };
          return (
            <label key={f.name} htmlFor={id} className="flex flex-col gap-1 text-[12px] font-semibold text-[#475569]">
              {f.label}
              {f.type === "textarea" ? (
                <textarea rows={3} {...common} />
              ) : f.type === "select" ? (
                <select {...common}>
                  <option value="">Choose…</option>
                  {(f.options ?? []).map((o) => (
                    <option key={o}>{o}</option>
                  ))}
                </select>
              ) : (
                <input type={f.type} {...common} />
              )}
            </label>
          );
        })}
        <div className="flex items-center gap-2">
          <button type="submit" disabled={busy} className="h-9 rounded-[10px] bg-[#0B4A7A] px-4 text-[13px] font-bold text-white disabled:opacity-50">
            {c.submitLabel ?? "Submit"}
          </button>
          {msg && <span role="status" className="text-[12px] text-[#1E3A8A]">{msg}</span>}
        </div>
      </form>
    </Card>
  );
}

export function GeneratedScreen({ spec, portal }: { spec: ScreenSpecView; portal: AiPortal }) {
  return (
    <div className="flex flex-col gap-3">
      <div>
        <h2 className="m-0 font-source-sans text-[22px] font-bold text-[#0F172A]">{spec.title}</h2>
        {spec.description && <p className="m-0 text-[13px] text-[#475569]">{spec.description}</p>}
      </div>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(12, minmax(0, 1fr))" }}>
        {spec.components.map((c) => {
          switch (c.kind) {
            case "kpi":
              return <Kpi key={c.id} c={c} portal={portal} />;
            case "table":
              return <Table key={c.id} c={c} portal={portal} />;
            case "chart":
              return <Chart key={c.id} c={c} portal={portal} />;
            case "files":
              return <Files key={c.id} c={c} portal={portal} />;
            case "text":
              return (
                <Card key={c.id} c={c}>
                  <SafeText text={c.markdown} />
                </Card>
              );
            case "record_panel":
              return (
                <Card key={c.id} c={c}>
                  <AiRecordPanel record={c.record} portal={portal} compact />
                </Card>
              );
            case "action_form":
              return <ActionForm key={c.id} c={c} portal={portal} />;
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
