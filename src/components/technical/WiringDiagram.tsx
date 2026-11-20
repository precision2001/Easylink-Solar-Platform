"use client";

import type { Device, Pack } from "./types";

/**
 * Schematic wiring diagram drawn from the job's devices (AU/NZ colours:
 * red / white / blue actives, black neutral, green/yellow earth). The same
 * picture serves the Wiring diagram and, with earth and neutral, the Device
 * installation view.
 */

const C = { l1: "#DC2626", l2: "#9CA3AF", l3: "#2563EB", n: "#1F2937", dc: "#EA8A0C", ct: "#7C3AED", pe: "#16A34A", ink: "#0F172A", quiet: "#475569", box: "#334155" };
const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function Box({ x, y, w, h, title, sub, fill = "#fff", stroke = C.box, titleFill = C.ink }: { x: number; y: number; w: number; h: number; title: string; sub?: string; fill?: string; stroke?: string; titleFill?: string }) {
  const chars = Math.floor(w / 7);
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={8} fill={fill} stroke={stroke} strokeWidth={2} />
      <text x={x + w / 2} y={y + (sub ? h / 2 - 3 : h / 2 + 4)} textAnchor="middle" fontSize={12} fontWeight={700} fill={titleFill}>
        {cut(title, chars)}
      </text>
      {sub && (
        <text x={x + w / 2} y={y + h / 2 + 13} textAnchor="middle" fontSize={11} fill={C.quiet}>
          {cut(sub, chars + 2)}
        </text>
      )}
    </g>
  );
}

/** Parallel active (and neutral) lines for a supply, horizontal from x1 to x2 at y. */
function Supply({ x1, x2, y, phase, neutral }: { x1: number; x2: number; y: number; phase: 1 | 3; neutral?: boolean }) {
  const cols = phase === 3 ? [C.l1, C.l2, C.l3] : [C.l1];
  return (
    <g fill="none" strokeWidth={3} strokeLinecap="round">
      {cols.map((c, i) => (
        <path key={c} d={`M${x1} ${y + i * 8} H${x2}`} stroke={c} />
      ))}
      {neutral && <path d={`M${x1} ${y + cols.length * 8} H${x2}`} stroke={C.n} />}
    </g>
  );
}

function Array_({ x, y, w, h, label }: { x: number; y: number; w: number; h: number; label: string }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx={4} fill="#1E3A5F" />
      <path d={`M${x + w / 4} ${y} V${y + h} M${x + w / 2} ${y} V${y + h} M${x + (3 * w) / 4} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke="#7DD3FC" strokeWidth={1} />
      <text x={x + w / 2} y={y + h + 16} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>
        {label}
      </text>
    </g>
  );
}

export function WiringDiagram({ pack, detailed }: { pack: Pack; detailed?: boolean }) {
  const phase = pack.phase;
  const hub = pack.devices.find((d) => d.kind === "inverter") ?? pack.devices.find((d) => d.kind === "inverterBattery");
  const pv = pack.devices.find((d) => d.kind === "pv");
  const dcBatteries = pack.devices.filter((d) => d.kind === "battery" && d.coupling === "DC");
  const hasBackup = pack.devices.some((d) => d.kind === "battery" || d.kind === "inverterBattery" || d.kind === "libbi");
  const bottom: Device[] = pack.devices.filter((d) => ["evCharger", "zappi", "heatPump", "eddi", "libbi"].includes(d.kind) || (d.kind === "battery" && d.coupling === "AC"));
  const H = 560;
  const lineH = phase === 3 ? 24 : 8;
  const ctCount = pack.cts.find((c) => c.type.startsWith("Grid"))?.count ?? 0;

  const label = `Wiring diagram: grid, meter${ctCount ? `, ${ctCount} grid CT${ctCount > 1 ? "s" : ""}` : ""}, main switchboard${hub ? `, ${hub.label}` : ""}${pv ? `, PV array ${pv.detail}` : ""}${dcBatteries.length ? `, ${dcBatteries.map((b) => b.label).join(", ")}` : ""}${hasBackup ? ", backup sub-board" : ""}${bottom.length ? `, ${bottom.map((b) => b.label).join(", ")}` : ""}. ${pack.phaseLabel}.`;

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 1040 ${H}`} className="block h-auto w-full min-w-[820px]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Grid and meter */}
      <path d="M30 250 L50 80 L70 250 M20 105 H80 M24 125 H76" stroke={C.box} strokeWidth={3} fill="none" />
      <text x={50} y={272} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>GRID</text>
      <Supply x1={80} x2={110} y={140} phase={phase} neutral={detailed} />
      <Box x={110} y={122} w={80} h={48 + (phase === 3 ? 10 : 0)} title="METER" />
      <Supply x1={190} x2={280} y={140} phase={phase} neutral={detailed} />

      {/* Grid CTs */}
      {ctCount > 0 && (
        <g>
          <rect x={226} y={132} width={12} height={lineH + 16} rx={3} fill={C.ct} />
          <text x={232} y={122} textAnchor="middle" fontSize={11} fontWeight={700} fill="#5B21B6">Grid CT{ctCount > 1 ? ` ×${ctCount}` : ""}</text>
          {hub && (
            <>
              <path d={`M232 ${148 + lineH} V420 H580 V205 H600`} stroke={C.ct} strokeWidth={2} strokeDasharray="6 5" fill="none" />
              <text x={400} y={414} fontSize={11} fill="#5B21B6">CT → smart meter → inverter (RS485)</text>
            </>
          )}
        </g>
      )}

      {/* Main switchboard */}
      <Box x={280} y={90} w={220} h={300} title="" />
      <text x={390} y={112} textAnchor="middle" fontSize={12} fontWeight={700} fill={C.ink}>MAIN SWITCHBOARD</text>
      <rect x={296} y={128} width={46} height={30} rx={4} fill="#E2E8F0" stroke="#64748B" />
      <text x={319} y={148} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>MAIN</text>
      {pack.circuits
        .filter((c) => c.phases !== "DC" && c.phases !== "PE" && c.id !== "backup")
        .slice(0, 5)
        .map((c, i) => (
          <g key={c.id}>
            <rect x={296} y={176 + i * 38} width={44} height={26} rx={4} fill={c.status === "TBC" ? "#FEF3C7" : "#DBEAFE"} stroke={c.status === "TBC" ? "#B45309" : "#1E40AF"} />
            <text x={318} y={193 + i * 38} textAnchor="middle" fontSize={10} fontWeight={700} fill={c.status === "TBC" ? "#92400E" : "#1E40AF"}>
              {c.breaker ? cut(c.breaker.replace(" 3-pole", ""), 6) : "TBC"}
            </text>
            <text x={348} y={193 + i * 38} fontSize={10.5} fill={C.ink}>{cut(c.circuit.replace(/:.*$/, ""), 22)}</text>
          </g>
        ))}
      {detailed && (
        <g>
          <rect x={300} y={360} width={90} height={9} rx={2} fill={C.n} />
          <rect x={400} y={360} width={90} height={9} rx={2} fill={C.pe} />
          <text x={390} y={384} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.ink}>N · E · MEN LINK</text>
        </g>
      )}

      {/* Inverter (or battery with built-in inverter) */}
      {hub && (
        <g>
          <Supply x1={500} x2={600} y={177} phase={phase} neutral={detailed} />
          <Box x={600} y={140} w={170} h={90} title={hub.kind === "inverterBattery" ? "Battery + inverter" : "Inverter"} sub={hub.label} />
          <text x={685} y={222} textAnchor="middle" fontSize={10.5} fill={C.quiet}>{cut(hub.detail, 30)}</text>
          {detailed && (
            <>
              <path d="M685 140 V64 H390 V90" stroke={C.pe} strokeWidth={3} fill="none" />
              <path d="M685 140 V64 H390 V90" stroke="#EAB308" strokeWidth={3} strokeDasharray="4 6" fill="none" />
              <text x={540} y={58} fontSize={11} fontWeight={700} fill="#166534">PE to main earth bar</text>
            </>
          )}
        </g>
      )}

      {/* PV */}
      {pv && hub && (
        <g>
          <path d="M770 171 H795 M890 171 H915" stroke={C.dc} strokeWidth={3} fill="none" />
          <Box x={795} y={155} w={95} h={32} title="DC ISOLATOR" fill="#FFF7ED" stroke={C.dc} titleFill="#9A3412" />
          <Array_ x={915} y={140} w={110} h={60} label={pv.kw ? `PV · ${pv.kw} kW` : "PV array"} />
        </g>
      )}

      {/* DC batteries */}
      {hub &&
        dcBatteries.slice(0, 2).map((b, i) => (
          <g key={b.id}>
            <path d={i === 0 ? "M685 230 V270" : "M685 326 V340"} stroke={C.dc} strokeWidth={3} fill="none" />
            <Box x={600} y={270 + i * 70} w={170} h={56} title="BATTERY" sub={b.kwh ? `${b.kwh} kWh · DC` : cut(b.label, 24)} fill="#F8FAFC" />
          </g>
        ))}

      {/* Backup */}
      {hasBackup && hub && (
        <g>
          <path d="M770 215 H920 V300" stroke={C.l1} strokeWidth={3} fill="none" />
          <Box x={820} y={300} w={200} h={80} title="BACKUP SUB-BOARD" sub="RCBOs 30 mA · essential circuits" fill="#FFF1F2" stroke="#BE185D" titleFill="#9D174D" />
        </g>
      )}

      {/* Other loads from the switchboard */}
      {bottom.slice(0, 4).map((d, i) => {
        const x = 290 + i * 150;
        const p = (d.phase ?? 1) as 1 | 3;
        return (
          <g key={d.id}>
            {(p === 3 ? [C.l1, C.l2, C.l3] : [C.l1]).map((c, k) => (
              <path key={c} d={`M${310 + i * 40 + k * 8} 390 V430 H${x + 50 + k * 8} V460`} stroke={c} strokeWidth={3} fill="none" />
            ))}
            <Box x={x} y={460} w={130} h={56} title={d.kind === "heatPump" ? "HEAT PUMP" : d.kind === "eddi" ? "eddi" : d.kind === "libbi" ? "libbi" : d.kind === "battery" ? "AC BATTERY" : "EV CHARGER"} sub={d.detail} />
          </g>
        );
      })}

      {!hub && !pv && (
        <text x={700} y={250} textAnchor="middle" fontSize={13} fill={C.quiet}>
          No equipment chosen yet: add a design or quote.
        </text>
      )}
    </svg>
  );
}

export function DiagramKey({ phase, detailed }: { phase: 1 | 3; detailed?: boolean }) {
  const items: [string, string, string?][] = [
    [C.l1, phase === 3 ? "L1 · Red" : "Active · Red"],
    ...(phase === 3 ? ([[C.l2, "L2 · White (drawn grey)"], [C.l3, "L3 · Blue"]] as [string, string][]) : []),
    ...(detailed ? ([[C.n, "Neutral · Black"], [C.pe, "Earth · Green/Yellow"]] as [string, string][]) : []),
    [C.dc, "DC (PV / battery)"],
    [C.ct, "CT / RS485", "dashed"],
  ];
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[12.5px] text-[#334155]">
      {items.map(([c, l, d]) => (
        <span key={l} className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" style={d ? { width: 22, borderTop: `2px dashed ${c}` } : { width: 22, height: 4, background: c, borderRadius: 2 }} />
          {l}
        </span>
      ))}
    </div>
  );
}
