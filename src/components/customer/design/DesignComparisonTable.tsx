import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { Panel } from "@/components/customer/portal/PortalParts";
import type { ComparisonRow, DesignColumn } from "./designConstants";

/** Every saved design side by side; the selected one is highlighted. Scrolls inside its box on phones. */
export function DesignComparisonTable({ designs, rows }: { designs: DesignColumn[]; rows: ComparisonRow[] }) {
  return (
    <Panel title="Compare your designs" meta={`${designs.length} saved`}>
      <div className="-mx-1 overflow-x-auto px-1" tabIndex={0} role="region" aria-label="Design comparison">
        <table className="w-full min-w-[560px] border-collapse text-left text-[14px]">
          <thead>
            <tr>
              <th scope="col" className="sticky left-0 z-10 bg-white py-2.5 pr-4 text-[13px] font-semibold text-[#5B6B80]">
                <span className="sr-only">Feature</span>
              </th>
              {designs.map((d) => (
                <th
                  key={d.id}
                  scope="col"
                  className={`px-3 py-2.5 text-[14px] font-bold ${d.selected ? "rounded-t-[12px] bg-[#FFF4D6] text-[#7A3E00]" : "text-[#0F172A]"}`}
                >
                  <span className="flex items-center gap-1.5">
                    {d.selected ? <PortalIcon name="check" size={15} /> : null}
                    {d.label}
                  </span>
                  {d.selected ? <span className="block text-[12px] font-semibold">Selected</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.feature} className="border-t border-[#EEF2F6]">
                <th scope="row" className="sticky left-0 z-10 bg-white py-2.5 pr-4 text-[13.5px] font-medium text-[#5B6B80]">
                  {row.feature}
                </th>
                {row.values.map((cell, j) => (
                  <td key={`${row.feature}-${j}`} className={`px-3 py-2.5 tabular-nums ${designs[j]?.selected ? "bg-[#FFF4D6] font-bold text-[#0F172A]" : "text-[#334155]"}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
