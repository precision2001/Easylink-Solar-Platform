import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import type { ComparisonRow, DesignColumn } from "./designConstants";

type Props = {
  designs: DesignColumn[];
  rows: ComparisonRow[];
};

export function DesignComparisonTable({ designs, rows }: Props) {
  const selectedIndex = designs.findIndex((d) => d.selected);
  const colIdx = selectedIndex >= 0 ? selectedIndex : 0;

  return (
    <section className="customer-cream-card-bg customer-cream-card-border overflow-hidden rounded-[10px] border">
      <CustomerSectionHeader variant="cream" title="Compare All Designs" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <thead>
            <tr className="border-b customer-cream-card-border">
              <th className="sticky left-0 z-10 bg-cream-50 px-4 py-2.5 font-dm-sans text-[9px] font-bold uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray">
                Feature
              </th>
              {designs.map((d) => (
                <th
                  key={d.id}
                  className={`px-3 py-2.5 text-center font-dm-sans text-[9px] font-bold uppercase leading-[13.5px] tracking-[0.3px] ${
                    d.selected ? "text-orange-amber" : "text-warm-gray"
                  }`}
                >
                  {d.label}
                  {d.selected ? " ✓" : ""}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const rowBg = i % 2 === 1 ? "bg-cream-225" : "bg-cream-50";
              return (
                <tr
                  key={row.feature}
                  className={`border-b border-cream-300 ${rowBg}`}
                >
                  <td
                    className={`sticky left-0 z-10 px-4 py-2.5 font-dm-sans text-[11px] font-normal capitalize leading-[16.5px] text-warm-gray ${rowBg}`}
                  >
                    {row.feature}
                  </td>
                  {row.values.map((cell, j) => (
                    <td
                      key={`${row.feature}-${j}`}
                      className={`px-3 py-2.5 text-center font-dm-sans text-[11px] leading-[16.5px] text-warm-gray ${
                        j === colIdx
                          ? "font-semibold text-warm-ink"
                          : "font-medium"
                      }`}
                      style={{ fontVariationSettings: "'opsz' 14" }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
