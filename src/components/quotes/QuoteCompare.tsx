import { QuoteStatusChip } from "@/components/quotes/QuoteParts";
import { compareRows, quoteVersionLabel, type Quote } from "@/lib/quotes";

/** Two or three versions side by side, row by row. Scrolls sideways on a phone. */
export function QuoteCompare({ quotes, now, caption = "Quote versions compared" }: { quotes: Quote[]; now?: Date; caption?: string }) {
  const list = quotes.slice(0, 3);
  if (list.length < 2) return null;
  const rows = compareRows(list, now);
  return (
    <div className="overflow-x-auto rounded-[12px] border border-[#E3E8EF]" tabIndex={0} aria-label={caption}>
      <table className="w-full min-w-[440px] border-collapse text-[13.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-[#F8FAFC] align-top">
            <th scope="col" className="w-[112px] px-3 py-3 sm:w-[150px] text-left text-[12px] font-semibold text-[#5B6B80]">
              <span className="sr-only">Detail</span>
            </th>
            {list.map((q) => (
              <th key={q.id} scope="col" className="min-w-[150px] border-l border-[#E3E8EF] px-3 py-3 text-left font-normal">
                <span className="block text-[12px] font-bold tabular-nums text-[#5B6B80]">{quoteVersionLabel(q)}</span>
                <span className="mt-0.5 block text-[14px] font-bold leading-[1.3] text-[#0F172A]">{q.title}</span>
                <span className="mt-1.5 block">
                  <QuoteStatusChip quote={q} now={now} />
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows
            .filter((r) => r.label !== "Status")
            .map((r) => (
              <tr key={r.label} className={`border-t border-[#EEF2F6] ${r.emphasise ? "bg-[#FFF8EB]" : ""}`}>
                <th scope="row" className="px-3 py-2.5 text-left text-[13px] font-semibold text-[#334155]">
                  {r.label}
                </th>
                {r.values.map((v, i) => (
                  <td
                    key={list[i].id}
                    className={`border-l border-[#EEF2F6] px-3 py-2.5 tabular-nums ${r.emphasise ? "text-[16px] font-bold text-[#0F172A]" : "text-[#0F172A]"}`}
                  >
                    {v}
                  </td>
                ))}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}
