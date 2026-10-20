import { money, type Invoice, type Job, type Signature } from "./model.js";

/**
 * Document templates (Document factory, first cut). Each document is HTML
 * filled only from the job record: no free text from the model. The HTML is
 * what the signer sees and what is hashed; a PDF of the same HTML is rendered
 * by headless Chromium when that Lambda is deployed (browsers print it today).
 */
const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric", timeZone: "Australia/Sydney" }) : "—");

const SHELL = (title: string, body: string) => `<!doctype html><html lang="en-AU"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(title)}</title>
<style>body{font:14px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;margin:0;background:#fff}main{max-width:760px;margin:0 auto;padding:32px 24px}h1{font-size:22px;margin:0 0 4px}h2{font-size:15px;margin:24px 0 8px}table{width:100%;border-collapse:collapse;margin:8px 0}th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #e2e8f0;vertical-align:top}th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#475569}.r{text-align:right}.muted{color:#475569}.grid{display:flex;flex-wrap:wrap;gap:24px}.grid>div{flex:1 1 240px}.tot td{font-weight:700}.box{border:1px solid #cbd5e1;border-radius:8px;padding:12px 14px;margin:12px 0}@media print{main{padding:0}}</style></head><body><main>${body}</main></body></html>`;

const parties = (j: Job) => `<div class="grid"><div><h2>Seller</h2>${esc(j.seller.name)}<br>ABN ${esc(j.seller.abn ?? "—")}<br>${esc(j.seller.address ?? "")}<br>${esc(j.seller.email ?? "")}</div><div><h2>Customer</h2>${esc(j.customerName)}<br>${esc(j.site.address)}<br>${esc(j.customerEmail ?? "")}</div></div>`;

const equipment = (j: Job) => {
  const s = j.selection;
  const rows = [
    [`${s.panels.count} × ${s.panels.model} (${s.panels.watts} W)`, `${s.kw.toFixed(2)} kW array`],
    [s.inverter.model, `${s.inverter.kw} kW inverter`],
    ...(s.battery ? [[s.battery.model, `${s.battery.usableKwh} kWh usable`]] : []),
    ...s.accessories.map((a) => [a.name, money(a.price)]),
  ];
  return `<table><thead><tr><th>Item</th><th>Detail</th></tr></thead><tbody>${rows.map(([a, b]) => `<tr><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("")}</tbody></table>`;
};

const stcLine = (j: Job) => {
  const n = j.stc.solar + j.stc.battery;
  return { n, value: n * STC_PRICE };
};
/** Value passed to the customer per STC (set per installer/agent; shown on every document). */
export const STC_PRICE = 38;

export function agreementHtml(j: Job): string {
  const { n, value } = stcLine(j);
  const deposit = Math.round(j.selection.price * j.depositPercent) / 100;
  return SHELL(
    "Quote and installation agreement",
    `<h1>Quote and installation agreement</h1><p class="muted">Version ${j.quoteVersion} · ${esc(j.site.address)}</p>${parties(j)}
<h2>System</h2>${equipment(j)}
<h2>Price</h2><table><tbody><tr><td>System price (GST incl.)</td><td class="r">${money(j.selection.price)}</td></tr><tr><td>STC point-of-sale discount (${n} STCs at ${money(STC_PRICE)})</td><td class="r">−${money(value)}</td></tr><tr class="tot"><td>You pay</td><td class="r">${money(j.selection.price - value)}</td></tr><tr><td>Deposit on signing (${j.depositPercent}%)</td><td class="r">${money(deposit)}</td></tr><tr><td>Balance on completion</td><td class="r">${money(j.selection.price - value - deposit)}</td></tr></tbody></table>
<h2>Terms</h2><ul><li>Installation by an SAA-accredited installer to AS/NZS 5033, 4777 and 5139 where a battery is installed.</li><li>You assign the right to create the STCs for this system to the seller's registered agent; the discount above depends on it.</li><li>Grid connection is subject to your distributor's approval; the export limit it sets applies.</li><li>Warranties: manufacturers' product warranties, and the installer's workmanship warranty, are listed in your handover pack.</li><li>Cooling-off: if this agreement was made in an unsolicited sale, you may cancel within 10 business days.</li></ul>
<p class="muted">Estimated yearly output ${j.selection.annualOutputKwh.toLocaleString("en-AU")} kWh; estimated savings ${money(j.selection.savingsPerYear)} a year. Estimates, not guarantees.</p>`,
  );
}

export function revisionHtml(j: Job, changes: string[], newPrice: number): string {
  return SHELL(
    `Quote revision ${j.quoteVersion + 1}`,
    `<h1>Quote revision ${j.quoteVersion + 1}</h1><p class="muted">${esc(j.site.address)}</p>${parties(j)}<h2>What changed</h2><ul>${changes.map((c) => `<li>${esc(c)}</li>`).join("")}</ul><div class="box">Price was ${money(j.selection.price)}; now <strong>${money(newPrice)}</strong> (GST incl., before the STC discount).</div><p>Everything else in your signed agreement stays the same.</p>`,
  );
}

export function installCompleteHtml(j: Job): string {
  const t = j.onsite.tests;
  return SHELL(
    "Installation complete",
    `<h1>Installation complete</h1><p class="muted">${esc(j.site.address)} · ${day(j.installDates?.day2)}</p>${parties(j)}<h2>Installed</h2>${equipment(j)}
<h2>Commissioning</h2><table><tbody><tr><td>Insulation resistance</td><td>${t ? `${t.insulationMOhm} MΩ` : "—"}</td></tr><tr><td>Earth continuity</td><td>${t ? (t.earthOk ? "Pass" : "Fail") : "—"}</td></tr><tr><td>Export limit set</td><td>${t ? `${t.exportLimitKw} kW` : "—"}</td></tr><tr><td>CSIP-AUS capability test</td><td>${t ? t.csipTest.replace("_", " ") : "—"}</td></tr></tbody></table>
<p>I confirm the system above was installed, I was shown how to shut it down safely, and the site was left clean.</p>`,
  );
}

export function stcAssignmentHtml(j: Job): string {
  const { n, value } = stcLine(j);
  const serials = j.onsite.scanned.filter((s) => s.matched);
  return SHELL(
    "STC assignment form",
    `<h1>Small-scale technology certificate assignment</h1><p class="muted">Prepared for the seller's registered agent · ${esc(j.site.address)}</p>${parties(j)}
<h2>System</h2><table><tbody><tr><td>Installation date</td><td>${day(j.onsite.completeAt ?? j.installDates?.day2)}</td></tr><tr><td>Solar</td><td>${j.selection.kw.toFixed(2)} kW · ${esc(j.selection.panels.model)} × ${j.selection.panels.count}</td></tr><tr><td>Inverter</td><td>${esc(j.selection.inverter.model)}</td></tr>${j.selection.battery ? `<tr><td>Battery</td><td>${esc(j.selection.battery.model)} · ${j.selection.battery.usableKwh} kWh usable</td></tr>` : ""}<tr><td>Deeming period</td><td>${j.stc.deemingYears} years</td></tr><tr><td>Zone rating</td><td>${j.site.zoneRating}</td></tr><tr><td>STCs</td><td>${j.stc.solar} solar + ${j.stc.battery} battery = <strong>${n}</strong></td></tr><tr><td>Benefit passed to you</td><td>${money(value)} point-of-sale discount</td></tr></tbody></table>
<h2>Serial numbers</h2><table><thead><tr><th>Type</th><th>Serial</th></tr></thead><tbody>${serials.map((s) => `<tr><td>${esc(s.kind)}</td><td>${esc(s.serial)}</td></tr>`).join("") || `<tr><td colspan="2">—</td></tr>`}</tbody></table>
<h2>Owner's declaration</h2><p>I am the owner of the system above. I assign the right to create the STCs for it to the seller's registered agent, in exchange for the benefit shown. No STCs have been created for this system before.</p>`,
  );
}

export function invoiceHtml(inv: Invoice): string {
  const kindLabel = inv.kind === "credit" ? "Adjustment note" : "Tax invoice";
  return SHELL(
    `${kindLabel} ${inv.number}`,
    `<h1>${kindLabel}</h1><p class="muted">${esc(inv.number)} · issued ${day(inv.issueDate)} · due ${day(inv.dueDate)}${inv.creditFor ? ` · adjusts ${esc(inv.creditFor)}` : ""}</p>
<div class="grid"><div><h2>From</h2>${esc(inv.seller.name)}<br>ABN ${esc(inv.seller.abn ?? "—")}<br>${esc(inv.seller.address ?? "")}<br>${esc(inv.seller.email ?? "")}</div><div><h2>To</h2>${esc(inv.buyer.name)}<br>${esc(inv.buyer.address ?? "")}<br>${esc(inv.buyer.email ?? "")}</div></div>
<table><thead><tr><th>Description</th><th class="r">Qty</th><th class="r">Unit ex GST</th><th class="r">GST</th><th class="r">Amount</th></tr></thead><tbody>${inv.lines
      .map((l) => {
        const ex = l.qty * l.unitExGst;
        const g = l.gst ? ex * 0.1 : 0;
        return `<tr><td>${esc(l.description)}</td><td class="r">${l.qty}</td><td class="r">${money(l.unitExGst)}</td><td class="r">${l.gst ? money(g) : "GST-free"}</td><td class="r">${money(ex + g)}</td></tr>`;
      })
      .join("")}</tbody></table>
<table><tbody><tr><td>Total ex GST</td><td class="r">${money(inv.totals.exGst)}</td></tr><tr><td>GST</td><td class="r">${money(inv.totals.gst)}</td></tr><tr class="tot"><td>Total (GST incl.)</td><td class="r">${money(inv.totals.total)}</td></tr>${inv.payments.map((p) => `<tr><td>Paid ${day(p.at)} · ${esc(p.method)} ${esc(p.ref)}</td><td class="r">−${money(p.amount)}</td></tr>`).join("")}<tr class="tot"><td>Balance due</td><td class="r">${money(Math.max(0, inv.totals.total - inv.payments.reduce((s, p) => s + p.amount, 0)))}</td></tr></tbody></table>
${inv.notes ? `<p>${esc(inv.notes)}</p>` : ""}<p class="muted">Pay online with the link in your email or portal, or by EFT quoting ${esc(inv.number)}.</p>`,
  );
}

export function signedCopy(s: Signature): string {
  if (!s.audit) return s.html;
  const a = s.audit;
  const page = `<section style="page-break-before:always;border-top:2px solid #0f172a;margin-top:32px;padding-top:16px"><h2>Signature record</h2><table><tbody><tr><td>Signed by</td><td>${esc(a.name)}</td></tr><tr><td>Confirmed with a one-time code sent to</td><td>${esc(a.phone)}</td></tr><tr><td>Signed at</td><td>${esc(new Date(a.at).toLocaleString("en-AU", { timeZone: "Australia/Sydney" }))} (Sydney time)</td></tr><tr><td>IP address</td><td>${esc(a.ip)}</td></tr><tr><td>Document fingerprint (SHA-256)</td><td style="word-break:break-all">${esc(a.hash)}</td></tr></tbody></table></section>`;
  return s.html.replace("</main>", `${page}</main>`);
}
