import Link from "next/link";

import type { ArticleBlock } from "@/lib/public/blog-article";
import { formatAud } from "@/lib/public/rebate-schedule";

function StepsChart({ block }: { block: Extract<ArticleBlock, { type: "steps" }> }) {
  const max = Math.max(...block.items.map((i) => i.value)) || 1;
  const description = block.items.map((i) => `${i.label}: ${i.value}`).join(", ");
  return (
    <figure className="my-8 rounded-3xl bg-customer-page-bg px-7 pb-5 pt-7">
      {block.title ? (
        <figcaption className="font-source-sans text-xl font-extrabold text-white">{block.title}</figcaption>
      ) : null}
      <div role="img" aria-label={`${block.title}. ${description}.`} className="mt-5 flex h-[220px] items-end gap-2">
        {block.items.map((item, i) => {
          const on = i === block.highlight;
          return (
            <div key={item.label} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
              <span className={`font-source-sans text-base font-extrabold ${on ? "text-yellow-lemon" : "text-white/80"}`}>
                {item.value}
              </span>
              <div
                className={`w-full rounded-t-lg rounded-b-sm ${on ? "bg-linear-to-b from-yellow-lemon to-orange-amber" : "bg-design-accent-cyan/70"}`}
                style={{ height: `${Math.max(4, Math.round((item.value / max) * 170))}px`, opacity: on ? 1 : Math.max(0.35, 1 - i * 0.07) }}
              />
            </div>
          );
        })}
      </div>
      <div aria-hidden="true" className="mt-2 flex gap-2">
        {block.items.map((item) => (
          <span key={item.label} className="min-w-0 flex-1 text-center font-inter text-[11px] leading-tight text-white/65">
            {item.label}
          </span>
        ))}
      </div>
      {block.highlight >= 0 && block.highlightLabel ? (
        <p className="mt-3.5 font-inter text-[13px] text-white/65">
          <span aria-hidden="true" className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-linear-to-r from-yellow-lemon to-orange-amber" />
          {block.highlightLabel}
        </p>
      ) : null}
    </figure>
  );
}

function CompareChart({ block }: { block: Extract<ArticleBlock, { type: "compare" }> }) {
  const max = Math.max(...block.rows.map((r) => Math.max(r.a, r.b ?? 0))) || 1;
  const width = (v: number) => `${Math.max(2, Math.round((v / max) * 78))}%`;
  return (
    <figure className="my-8 rounded-3xl border border-warm-border bg-white px-7 py-6">
      {block.title ? <figcaption className="font-source-sans text-xl font-extrabold text-customer-page-bg">{block.title}</figcaption> : null}
      {!block.single ? (
        <div className="mt-3.5 flex flex-wrap gap-4.5 font-inter text-[13px] text-brown-muted">
          <span>
            <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-[3px] bg-success align-[-1px]" />
            {block.aLabel}
          </span>
          <span>
            <span aria-hidden="true" className="mr-1.5 inline-block size-3 rounded-[3px] bg-stone-warm align-[-1px]" />
            {block.bLabel}
          </span>
        </div>
      ) : null}
      <table className="sr-only">
        <thead>
          <tr>
            <th scope="col">Item</th>
            <th scope="col">{block.aLabel || "Value"}</th>
            {!block.single ? <th scope="col">{block.bLabel}</th> : null}
          </tr>
        </thead>
        <tbody>
          {block.rows.map((r) => (
            <tr key={r.label}>
              <th scope="row">{r.label}</th>
              <td>{formatAud(r.a)}</td>
              {!block.single && r.b !== null ? <td>{formatAud(r.b)}</td> : null}
            </tr>
          ))}
        </tbody>
      </table>
      <div aria-hidden="true" className="mt-4.5 flex flex-col gap-4.5">
        {block.rows.map((r) => (
          <div key={r.label}>
            <div className="flex justify-between gap-3 font-inter text-[15px]">
              <span className="font-bold text-customer-page-bg">{r.label}</span>
              {!block.single && r.b !== null ? (
                <span className="font-extrabold text-blog-loss">−{formatAud(r.a - r.b)}</span>
              ) : null}
            </div>
            <div className="mt-2 flex flex-col gap-1.5">
              <div className="flex items-center gap-2.5">
                <div className="h-3.5 rounded bg-success" style={{ width: width(r.a) }} />
                <span className="font-inter text-[13px] font-semibold text-warm-black">{formatAud(r.a)}</span>
              </div>
              {!block.single && r.b !== null ? (
                <div className="flex items-center gap-2.5">
                  <div className="h-3.5 rounded bg-stone-warm" style={{ width: width(r.b) }} />
                  <span className="font-inter text-[13px] text-brown-muted">{formatAud(r.b)}</span>
                </div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {block.note ? <p className="mt-4.5 font-inter text-[13px] leading-normal text-warm-gray">{block.note}</p> : null}
    </figure>
  );
}

export function ArticleBlocks({ blocks }: { blocks: ArticleBlock[] }) {
  return (
    <>
      {blocks.map((block, i) => {
        const key = `${block.type}-${i}`;
        switch (block.type) {
          case "lead":
            return (
              <p key={key} className="mb-5.5 text-[21px] leading-relaxed text-warm-black">
                {block.text}
              </p>
            );
          case "p":
            return (
              <p key={key} className="mb-5.5">
                {block.text}
              </p>
            );
          case "h2":
            return (
              <h2 key={key} className="mb-3.5 mt-11 font-source-sans text-[34px] font-black leading-[1.1] text-customer-page-bg">
                {block.text}
              </h2>
            );
          case "quote":
            return (
              <blockquote
                key={key}
                className="my-9 rounded-[22px] bg-cream-100 px-7.5 py-6.5 font-source-sans text-[26px] font-extrabold leading-snug text-customer-page-bg"
              >
                {block.text}
              </blockquote>
            );
          case "steps":
            return <StepsChart key={key} block={block} />;
          case "compare":
            return <CompareChart key={key} block={block} />;
          case "checklist":
            return (
              <ol key={key} className="my-8 flex flex-col gap-4">
                {block.items.map((item, n) => (
                  <li key={item.title} className="flex gap-3.5 rounded-[22px] border border-warm-border bg-white p-4 sm:gap-4 sm:p-5.5">
                    <span
                      aria-hidden="true"
                      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-customer-page-bg font-source-sans text-lg font-black text-yellow-lemon"
                    >
                      {n + 1}
                    </span>
                    <div>
                      <h3 className="font-source-sans text-[21px] font-extrabold leading-tight text-customer-page-bg">{item.title}</h3>
                      <p className="mt-1.5 text-[17px] leading-relaxed">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            );
          case "cta":
            return (
              <div
                key={key}
                className="mt-10 flex flex-wrap items-center justify-between gap-5 rounded-[26px] bg-customer-page-bg p-8"
              >
                <div className="min-w-0 flex-[1_1_320px]">
                  <p className="font-source-sans text-[28px] font-black leading-tight text-white">{block.title}</p>
                  {block.text ? <p className="mt-2 text-base leading-normal text-white/75">{block.text}</p> : null}
                </div>
                <Link
                  href={block.href}
                  className="blog-sun-gradient rounded-full px-6.5 py-4 font-inter text-base font-bold text-customer-page-bg no-underline transition hover:-translate-y-px"
                >
                  {block.label}
                </Link>
              </div>
            );
          default:
            return null;
        }
      })}
    </>
  );
}
