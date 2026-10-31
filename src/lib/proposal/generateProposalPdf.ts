import { jsPDF } from "jspdf";
import QRCode from "qrcode";

import {
  buildFinancialProjectionFromProposal,
  type FinancialProjectionYearRow,
} from "@/lib/proposal/financialProjection";
import {
  EQUIPMENT_CATEGORY_KEYS,
  type DesignProposalState,
  type EquipmentCategoryKey,
} from "@/lib/store/designProposalSlice";

const CATEGORY_ROW_LABEL: Record<EquipmentCategoryKey, string> = {
  solarPanel: "Solar panels",
  inverter: "Inverter",
  battery: "Battery",
  evCharger: "EV charger",
  heatPump: "Heat pump",
};

/** One row per category with at least one item — omitted entirely otherwise. */
export function equipmentRows(proposal: DesignProposalState): [string, string][] {
  return EQUIPMENT_CATEGORY_KEYS.flatMap((key) => {
    const items = proposal.equipment.items[key];
    if (!items || items.length === 0) return [];
    const text = items
      .map((item) => {
        const qty = item.quantity > 1 ? ` ×${item.quantity}` : "";
        return `${item.name}${qty} (${item.ratingLabel})`;
      })
      .join(", ");
    return [[CATEGORY_ROW_LABEL[key], text]] as [string, string][];
  });
}

const PREPARED_BY = {
  name: "Sujay Salvi",
  phone: "+61 481 857 508",
  email: "sujay@easylinksolar.com.au",
};

/** Logo under `public/` — resolved at runtime in the browser */
const LOGO_PATH = "/images/logo.webp";

/** Same horizontal inset as other PDF pages (`margin` in `generateProposalPdfBlob`). */
const PDF_MARGIN_MM = 15;
/** Portrait A4 body width — used as max width for the financial table on landscape pages. */
const PDF_BODY_WIDTH_MM = 210 - 2 * PDF_MARGIN_MM;

function firstName(fullName: string): string {
  const t = fullName.trim();
  if (!t) return "Customer";
  return t.split(/\s+/)[0] ?? "Customer";
}

async function fetchPublicImageAsDataUrl(path: string): Promise<string | null> {
  if (typeof window === "undefined") return null;
  try {
    const url =
      path.startsWith("http") ? path : `${window.location.origin}${path}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    return new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

function imageFormatFromDataUrl(dataUrl: string): "PNG" | "JPEG" {
  if (dataUrl.includes("image/jpeg")) return "JPEG";
  return "PNG";
}

function addImageFitWidth(
  doc: jsPDF,
  dataUrl: string,
  x: number,
  y: number,
  maxWidthMm: number,
): number {
  const fmt = imageFormatFromDataUrl(dataUrl);
  const props = doc.getImageProperties(dataUrl);
  const wPx = props.width || 1;
  const hPx = props.height || 1;
  const wMm = maxWidthMm;
  const hMm = maxWidthMm * (hPx / wPx);
  doc.addImage(dataUrl, fmt, x, y, wMm, hMm);
  return hMm;
}

function formatAuDate(d: Date): string {
  return d.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatValidUntil(from: Date = new Date()): string {
  const d = new Date(from);
  d.setDate(d.getDate() + 30);
  return formatAuDate(d);
}

/**
 * Links printed on the "Your next step" page. All optional: the builder
 * (signed-out) path has no design id or referral code yet, so it falls back
 * to the portal sign-in and the public designer.
 */
export type ProposalPdfLinks = {
  /** Where the customer books the site check and sees their saved design. */
  portalUrl?: string;
  /** The customer's own referral code, when they have one. */
  referralCode?: string;
  /** Link a friend opens — a shared journey carrying the referral code. */
  referralUrl?: string;
};

function siteOrigin(): string {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://easylinksolar.com.au";
}

export type NextStepsContent = {
  portalUrl: string;
  portalLabel: string;
  validUntil: string;
  rebatesAsAt: string;
  referralCode: string | null;
  referralUrl: string;
};

/** Pure: resolves what the next-step page prints. Exported for tests. */
export function nextStepsContent(
  links: ProposalPdfLinks = {},
  today: Date = new Date(),
  origin: string = siteOrigin(),
): NextStepsContent {
  const portalUrl = links.portalUrl ?? `${origin}/customers/design`;
  const code = links.referralCode?.trim() || null;
  return {
    portalUrl,
    portalLabel: portalUrl.replace(/^https?:\/\/(www\.)?/, ""),
    validUntil: formatValidUntil(today),
    rebatesAsAt: formatAuDate(today),
    referralCode: code,
    referralUrl:
      links.referralUrl ??
      (code
        ? `${origin}/customers/auth?ref=${encodeURIComponent(code)}`
        : `${origin}/designs`),
  };
}

async function qrDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 1,
      width: 320,
    });
  } catch {
    return null;
  }
}

const NAVY: [number, number, number] = [11, 20, 38];
const SUN: [number, number, number] = [255, 214, 10];
const SLATE: [number, number, number] = [71, 85, 105];

/** Final page: one call to action, price validity, and the referral ask. */
async function drawNextStepsPage(
  doc: jsPDF,
  proposal: DesignProposalState,
  logoDataUrl: string | null,
  content: NextStepsContent,
): Promise<void> {
  doc.addPage("a4", "portrait");
  const margin = PDF_MARGIN_MM;
  const contentW = PDF_BODY_WIDTH_MM;
  const pageH = doc.internal.pageSize.getHeight();
  let y = drawHeader(doc, proposal, logoDataUrl, 12);

  const [portalQr, referralQr] = await Promise.all([
    qrDataUrl(content.portalUrl),
    qrDataUrl(content.referralUrl),
  ]);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(...NAVY);
  doc.text("Your next step", margin, y + 4);
  y += 14;

  /* Call to action — the only one in the document. */
  const ctaH = 58;
  const qrSize = 44;
  doc.setFillColor(...NAVY);
  doc.roundedRect(margin, y, contentW, ctaH, 4, 4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(17);
  doc.text("Book your free site check", margin + 8, y + 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(201, 212, 229);
  const ctaBody = doc.splitTextToSize(
    "Scan the code or open the link to pick a time. Your design, price and documents are waiting in your portal.",
    contentW - qrSize - 28,
  );
  doc.text(ctaBody, margin + 8, y + 24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...SUN);
  doc.text(content.portalLabel, margin + 8, y + ctaH - 9);
  const qrX = margin + contentW - qrSize - 7;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(qrX - 1, y + 7 - 1, qrSize + 2, qrSize + 2, 2, 2, "F");
  if (portalQr) doc.addImage(portalQr, "PNG", qrX, y + 7, qrSize, qrSize);
  doc.link(margin, y, contentW, ctaH, { url: content.portalUrl });
  y += ctaH + 8;

  /* Price validity + paper option, side by side. */
  const boxW = (contentW - 6) / 2;
  const boxH = 34;
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(margin, y, boxW, boxH, 3, 3, "F");
  doc.roundedRect(margin + boxW + 6, y, boxW, boxH, 3, 3, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...SLATE);
  doc.text("PRICE HELD UNTIL", margin + 6, y + 8);
  doc.text("PREFER PAPER?", margin + boxW + 12, y + 8);

  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text(content.validUntil, margin + 6, y + 16);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...SLATE);
  doc.text(
    doc.splitTextToSize(
      `Rebates as at ${content.rebatesAsAt}. We recheck them before install.`,
      boxW - 12,
    ),
    margin + 6,
    y + 23,
  );
  doc.text(
    doc.splitTextToSize(
      "Sign the acceptance form with your installer at the site check.",
      boxW - 12,
    ),
    margin + boxW + 12,
    y + 16,
  );
  y += boxH + 12;

  /* What happens next. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...NAVY);
  doc.text("What happens next", margin, y);
  y += 8;
  const steps: [string, string][] = [
    ["Site check", "We check your roof and switchboard. About 30 minutes."],
    ["Approval", "We apply to your electricity network for you."],
    ["Install day", "One or two days with an accredited, insured crew."],
    ["Switch on", "We set up your monitoring app and show you around."],
  ];
  steps.forEach(([title, body], i) => {
    doc.setFillColor(...SUN);
    doc.circle(margin + 4, y + 2.5, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(String(i + 1), margin + 4, y + 4, { align: "center" });
    doc.text(title, margin + 12, y + 1.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text(body, margin + 12, y + 6.5);
    y += 13;
  });
  y += 6;

  /* Referral ask. */
  const refH = 52;
  const refQr = 38;
  doc.setFillColor(...SUN);
  doc.roundedRect(margin, y, contentW, refH, 4, 4, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("KNOW SOMEONE WITH A SUNNY ROOF?", margin + 8, y + 10);
  doc.setFontSize(14);
  doc.text(
    doc.splitTextToSize(
      "Share your design. Your friend gets their own in two minutes.",
      contentW - refQr - 30,
    ),
    margin + 8,
    y + 18,
  );
  doc.setFontSize(10);
  if (content.referralCode) {
    doc.setFont("helvetica", "normal");
    doc.text("Your referral code:", margin + 8, y + refH - 9);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(content.referralCode, margin + 42, y + refH - 9);
  } else {
    doc.setFont("helvetica", "normal");
    doc.text(
      "Your personal referral link is in your portal.",
      margin + 8,
      y + refH - 9,
    );
  }
  const rqX = margin + contentW - refQr - 7;
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(rqX - 1, y + 7 - 1, refQr + 2, refQr + 2, 2, 2, "F");
  if (referralQr) doc.addImage(referralQr, "PNG", rqX, y + 7, refQr, refQr);
  doc.link(rqX, y + 7, refQr, refQr, { url: content.referralUrl });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "EasyLink Solar · This proposal is indicative and not a binding quote until confirmed in writing.",
    margin,
    pageH - 10,
  );
  doc.setTextColor(0, 0, 0);
}

function quoteNumber(): string {
  return String(Math.floor(1000000 + Math.random() * 9000000));
}

function formatAudPdf(n: number): string {
  const neg = n < 0;
  const abs = Math.abs(Math.round(n));
  const s = abs.toLocaleString("en-AU");
  if (neg) return `($${s})`;
  return `$${s}`;
}

function formatKwhPdf(n: number): string {
  return Math.round(n).toLocaleString("en-AU");
}

function drawFinancialProjectionPage(
  doc: jsPDF,
  proposal: DesignProposalState,
  logoDataUrl: string | null,
): void {
  doc.addPage("a4", "portrait");
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const tableW = PDF_BODY_WIDTH_MM;
  const tableX = (pageW - tableW) / 2;

  let y = drawHeader(doc, proposal, logoDataUrl, 12);

  const { rows, assumptions } = buildFinancialProjectionFromProposal(proposal);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("Financial impact projection", tableX, y);
  y += 9;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
  const assumptionBlock = [
    `${assumptions.projectionYears} years from ${assumptions.startYear}.`,
    `Utility bills escalate ${pct(assumptions.utilityEscalationAnnual)}/yr.`,
    `Solar output degrades ${pct(assumptions.solarDegradationAnnual)}/yr.`,
    `Consumption = (monthly current bill × 12) ÷ ${assumptions.gridEffectivePricePerKwh.toFixed(3)} $/kWh.`,
    `Year-1 solar kWh = system kW × ${assumptions.solarYieldKwhPerKwYear1} kWh/kW.`,
  ].join(" ");
  const assumptionLines = doc.splitTextToSize(assumptionBlock, tableW);
  doc.text(assumptionLines, tableX, y);
  y += assumptionLines.length * 3.6 + 5;

  const colCount = 10;
  const colW = tableW / colCount;
  const headerLines = [
    ["Year"],
    ["Electricity", "consumption", "(kWh)"],
    ["Solar", "generation", "(kWh)"],
    ["Utility bill", "(before — $)"],
    ["Utility bill", "(after — $)"],
    ["Annual", "savings ($)"],
    ["System costs", "(net — $)"],
    ["Customer", "incentives ($)"],
    ["Net", "savings ($)"],
    ["Cumulative", "impacts ($)"],
  ];

  const headerTop = y;
  const lineH = 3.2;
  const headerBlockH = headerLines.reduce(
    (m, lines) => Math.max(m, lines.length * lineH),
    0,
  );

  doc.setFillColor(255, 243, 190);
  doc.rect(tableX, headerTop - 2, tableW, headerBlockH + 5, "F");
  doc.setDrawColor(180, 180, 180);
  doc.rect(tableX, headerTop - 2, tableW, headerBlockH + 5, "S");

  doc.setFontSize(6);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  for (let c = 0; c < colCount; c++) {
    const lines = headerLines[c];
    let hy = headerTop + lineH;
    for (const line of lines) {
      doc.text(line, tableX + c * colW + colW / 2, hy, {
        align: "center",
      });
      hy += lineH;
    }
  }

  y = headerTop + headerBlockH + 7;
  const rowH = 5;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);

  const rowValues = (r: FinancialProjectionYearRow): string[] => [
    String(r.calendarYear),
    formatKwhPdf(r.electricityConsumptionKwh),
    formatKwhPdf(r.solarGenerationKwh),
    formatAudPdf(r.utilityBillBefore),
    formatAudPdf(r.utilityBillAfter),
    formatAudPdf(r.annualSavings),
    formatAudPdf(r.systemCostsNet),
    formatAudPdf(r.customerIncentives),
    formatAudPdf(r.netSavings),
    formatAudPdf(r.cumulativeImpacts),
  ];

  rows.forEach((row, idx) => {
    if (y > pageH - PDF_MARGIN_MM - 18) {
      doc.addPage("a4", "landscape");
      y = drawHeader(doc, proposal, logoDataUrl, 12);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text(
        "Financial impact projection (continued)",
        (doc.internal.pageSize.getWidth() - tableW) / 2,
        y,
      );
      y += 12;
      doc.setFontSize(6.5);
      doc.setFont("helvetica", "normal");
    }

    if (idx % 2 === 1) {
      doc.setFillColor(248, 248, 248);
      doc.rect(tableX, y - rowH + 1.5, tableW, rowH, "F");
    }

    const vals = rowValues(row);
    for (let c = 0; c < colCount; c++) {
      const align =
        c === 0 ? ("left" as const) : ("right" as const);
      const px =
        align === "left"
          ? tableX + c * colW + 1
          : tableX + (c + 1) * colW - 1;
      doc.text(vals[c], px, y, { align });
    }

    doc.setDrawColor(230, 230, 230);
    doc.line(tableX, y + 1.5, tableX + tableW, y + 1.5);
    y += rowH;
  });

  doc.setFontSize(7);
  doc.setTextColor(90, 90, 90);
  const footLines = doc.splitTextToSize(
    "Derived from proposal inputs (Redux): monthly current/new bills, total system price, system size — plus standard escalation/degradation assumptions above.",
    tableW,
  );
  doc.text(
    footLines,
    tableX,
    pageH - 14 - (footLines.length - 1) * 3.2,
  );
}

function drawHeader(
  doc: jsPDF,
  proposal: DesignProposalState,
  logoDataUrl: string | null,
  yStart: number,
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN_MM;
  let y = yStart;

  if (logoDataUrl) {
    try {
      addImageFitWidth(doc, logoDataUrl, margin, y, 14);
    } catch {
      /* ignore bad logo */
    }
  }

  doc.setFontSize(9);
  doc.setTextColor(80, 80, 80);
  doc.text(
    `Proposal for ${proposal.customer.name}`,
    pageW - margin,
    y + 6,
    { align: "right" },
  );

  y += 18;
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, y, pageW - margin, y);
  doc.setTextColor(0, 0, 0);
  return y + 6;
}

/**
 * Builds a multi-page proposal PDF from Redux design-proposal state.
 * Uses `solarDesign.mapScreenshotDataUrl` for the roof/panels preview when present.
 */
export async function generateProposalPdfBlob(
  proposal: DesignProposalState,
  links: ProposalPdfLinks = {},
): Promise<Blob> {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const margin = PDF_MARGIN_MM;
  const contentW = pageW - 2 * margin;
  const fn = firstName(proposal.customer.name);
  const quote = quoteNumber();
  const nextSteps = nextStepsContent(links);
  const validUntil = nextSteps.validUntil;

  const mapShot = proposal.solarDesign?.mapScreenshotDataUrl ?? null;
  const fallbackHero = await fetchPublicImageAsDataUrl(
    "/images/home/hero-slide-3.png",
  );
  // const lastImage = await fetchPublicImageAsDataUrl(
  //   "/images/home/hero-slide-2.png",
  // );
  const logoDataUrl = await fetchPublicImageAsDataUrl(LOGO_PATH);
  const heroDataUrl = mapShot || fallbackHero;

  /* ── Page 1: cover letter ── */
  let y = drawHeader(doc, proposal, logoDataUrl, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const colGap = 6;
  const colW = (contentW - 2 * colGap) / 3;
  const leftX = margin;
  const midX = margin + colW + colGap;
  const rightX = margin + 2 * (colW + colGap);

  doc.setFont("helvetica", "bold");
  doc.text("Prepared by:", leftX, y);
  doc.setFont("helvetica", "normal");
  doc.text(PREPARED_BY.name, leftX, y + 5);
  doc.text(PREPARED_BY.phone, leftX, y + 10);
  doc.text(PREPARED_BY.email, leftX, y + 15);

  doc.setFont("helvetica", "bold");
  doc.text("For:", midX, y);
  doc.setFont("helvetica", "normal");
  doc.text(fn, midX, y + 5);
  const addrLines = doc.splitTextToSize(
    proposal.customer.address || "—",
    colW,
  );
  doc.text(addrLines, midX, y + 10);

  doc.setFont("helvetica", "bold");
  doc.text("Quote #:", rightX, y);
  doc.setFont("helvetica", "normal");
  doc.text(quote, rightX, y + 5);
  doc.setFont("helvetica", "bold");
  doc.text("Valid until:", rightX, y + 12);
  doc.setFont("helvetica", "normal");
  doc.text(validUntil, rightX, y + 17);

  y += 28 + Math.max(0, (addrLines.length - 2) * 5);

  if (fallbackHero) {
    try {
      const h = addImageFitWidth(doc, fallbackHero, margin, y, contentW);
      y += h + 8;
    } catch {
      y += 4;
    }
  }

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Solar Energy System Proposal", pageW / 2, y, { align: "center" });
  y += 12;

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(`Dear ${fn},`, margin, y);
  y += 8;
  const intro = doc.splitTextToSize(
    "Thank you for the opportunity to present your Solar Energy System Proposal.",
    contentW,
  );
  doc.text(intro, margin, y);
  y += intro.length * 5 + 6;

  doc.text("Best Regards,", margin, y);
  y += 6;
  doc.text(PREPARED_BY.name, margin, y);
  y += 8;
  doc.setFont("helvetica", "bold");
  doc.text("Easylink Solar", margin, y);

  /* ── Page 2: system summary ── */
  doc.addPage();
  y = drawHeader(doc, proposal, logoDataUrl, 12);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Recommended System Option", margin, y);
  y += 10;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const barH = 14;
  const gap = 4;
  const cellW = (contentW - 3 * gap) / 4;
  const metrics: [string, string][] = [
    ["System Size", proposal.summary.systemSize],
    ["Est. yearly savings", proposal.summary.yearlySavings],
    ["Total system (incl. GST)", proposal.pricing.totalSystemPrice],
    ["Net system (incl. GST)", proposal.pricing.totalSystemPrice],
  ];
  metrics.forEach(([label, val], i) => {
    const x = margin + i * (cellW + gap);
    doc.setFillColor(240, 248, 255);
    doc.roundedRect(x, y, cellW, barH, 2, 2, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(90, 90, 90);
    doc.text(label.toUpperCase(), x + 2, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(val, x + 2, y + 11);
  });
  y += barH + 10;

  if (heroDataUrl) {
    try {
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("Design preview", margin, y);
      y += 6;
      const h = addImageFitWidth(doc, heroDataUrl, margin, y, contentW);
      y += h + 10;
    } catch {
      y += 4;
    }
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Your solution", margin, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const rows: [string, string][] = [
    ...equipmentRows(proposal),
    ["Panel count", proposal.summary.totalPanels],
    ["CO2 offset", proposal.equipment.co2Offset],
    ["Payback", proposal.summary.payback],
    ["Monthly savings", proposal.pricing.monthlySavings],
    ["Current bill / New bill", `${proposal.pricing.currentBill} → ${proposal.pricing.newBill}`],
  ];
  rows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${label}:`, margin, y);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(val, contentW - 45);
    doc.text(lines, margin + 42, y);
    y += Math.max(6, lines.length * 5);
  });

  /* ── Landscape: multi-year financial table (computed from Redux proposal state) ── */
  drawFinancialProjectionPage(doc, proposal, logoDataUrl);

  /* ── Performance & environment (values from Redux) ── */
  doc.addPage("a4", "portrait");
  const pageHP = doc.internal.pageSize.getHeight();
  y = drawHeader(doc, proposal, logoDataUrl, 12);

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("System performance (summary)", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const perf = doc.splitTextToSize(
    [
      `Your proposed system size is ${proposal.summary.systemSize} with approximately ${proposal.summary.totalPanels} panels.`,
      `Estimated yearly savings: ${proposal.summary.yearlySavings}. Estimated payback: ${proposal.summary.payback}.`,
      `Figures are indicative and based on the information provided; final performance depends on installation quality, shading, and usage patterns.`,
    ].join(" "),
    contentW,
  );
  doc.text(perf, margin, y);
  y += perf.length * 5 + 12;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text("Environmental benefits", margin, y);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const env = doc.splitTextToSize(
    [
      "Solar generates clean electricity at the point of use and reduces reliance on grid energy.",
      `Estimated annual CO2 reduction (indicative): ${proposal.equipment.co2Offset}.`,
    ].join(" "),
    contentW,
  );
  doc.text(env, margin, y);
  y += env.length * 5 + 12;

  // if (lastImage) {
  //   try {
  //     const remain = pageHP - y - margin;
  //     if (remain > 40) {
  //       const h = Math.min(remain - 5, 85);
  //       const w = contentW;
  //       const props = doc.getImageProperties(lastImage);
  //       const ratio = (props.height || 1) / (props.width || 1);
  //       const drawH = Math.min(h, w * ratio);
  //       doc.addImage(
  //         lastImage,
  //         imageFormatFromDataUrl(lastImage),
  //         margin,
  //         y,
  //         w,
  //         drawH,
  //       );
  //     }
  //   } catch {
  //     /* skip */
  //   }
  // }

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "EasyLink Solar · This proposal is indicative and not a binding quote until confirmed in writing.",
    margin,
    pageHP - 10,
  );

  await drawNextStepsPage(doc, proposal, logoDataUrl, nextSteps);

  return doc.output("blob");
}

/** Triggers a browser download for an already-built proposal PDF blob. */
export function downloadPdfBlob(blob: Blob, customerNameForFile: string): void {
  const name =
    customerNameForFile.replace(/[^\w\d\-]+/g, "-").slice(0, 48) || "Customer";
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Solar-Energy-Proposal-${name}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadProposalPdf(proposal: DesignProposalState): Promise<void> {
  const blob = await generateProposalPdfBlob(proposal);
  downloadPdfBlob(blob, proposal.customer.name);
}
