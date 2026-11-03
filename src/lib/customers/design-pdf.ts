import {
  DESIGN_PROPOSAL_DEFAULTS,
  type DesignProposalState,
} from "@/lib/store/designProposalSlice";
import {
  generateProposalPdfBlob,
  downloadPdfBlob,
  type ProposalPdfLinks,
} from "@/lib/proposal/generateProposalPdf";
import { buildShareUrl, createShareLink } from "@/lib/customers/referrals";
import { designToProposalPayload } from "@/lib/customers/custom-design";
import type { CustomerDesign } from "@/lib/customers/designs";

/**
 * Bridges a saved design to the proposal PDF generator.
 *
 * The generator takes the builder's Redux state, so the same document the
 * builder produces can be rebuilt from a stored design — no second PDF
 * implementation. Sections are merged over the defaults because the mapping
 * returns only what the design can actually source.
 */
export function designToProposalState(
  design: CustomerDesign,
): DesignProposalState {
  const payload = designToProposalPayload(design) ?? {};

  return {
    summary: { ...DESIGN_PROPOSAL_DEFAULTS.summary, ...payload.summary },
    customer: { ...DESIGN_PROPOSAL_DEFAULTS.customer, ...payload.customer },
    equipment: {
      ...DESIGN_PROPOSAL_DEFAULTS.equipment,
      ...payload.equipment,
      items: {
        ...DESIGN_PROPOSAL_DEFAULTS.equipment.items,
        ...payload.equipment?.items,
      },
    },
    pricing: { ...DESIGN_PROPOSAL_DEFAULTS.pricing, ...payload.pricing },
    solarDesign:
      payload.solarDesign ?? DESIGN_PROPOSAL_DEFAULTS.solarDesign ?? null,
  };
}

/**
 * A signed-in customer has a referral code and a shareable link for this
 * design, so the PDF's referral QR points a friend straight at it. Best
 * effort: if the share link can't be made, the PDF still builds without it.
 */
async function referralLinksFor(
  design: CustomerDesign,
): Promise<ProposalPdfLinks> {
  try {
    const link = await createShareLink(design.id);
    return {
      referralCode: link.referralCode || undefined,
      referralUrl: buildShareUrl(link),
    };
  } catch {
    return {};
  }
}

export async function buildDesignProposalPdf(
  design: CustomerDesign,
): Promise<Blob> {
  return generateProposalPdfBlob(
    designToProposalState(design),
    await referralLinksFor(design),
  );
}

export function proposalFileName(design: CustomerDesign): string {
  const name =
    designToProposalState(design).customer.name.replace(/[^\w\d\-]+/g, "-") ||
    "Customer";
  return `Solar-Energy-Proposal-${name.slice(0, 48)}.pdf`;
}

export async function downloadDesignProposalPdf(
  design: CustomerDesign,
): Promise<void> {
  const blob = await buildDesignProposalPdf(design);
  downloadPdfBlob(blob, designToProposalState(design).customer.name);
}

/**
 * Opens the PDF in a viewer tab.
 *
 * The tab is opened *before* the PDF is built — a `window.open` after an await
 * loses the click gesture and gets blocked. `openedWindow` lets the caller do
 * that and hand it in. Falls back to a download when the popup was blocked.
 */
export async function viewDesignProposalPdf(
  design: CustomerDesign,
  openedWindow: Window | null,
): Promise<void> {
  const blob = await buildDesignProposalPdf(design);
  const url = URL.createObjectURL(blob);

  if (openedWindow && !openedWindow.closed) {
    openedWindow.location.href = url;
  } else {
    downloadPdfBlob(blob, designToProposalState(design).customer.name);
    URL.revokeObjectURL(url);
    return;
  }

  // Revoked on a delay: the viewer needs the URL alive long enough to load it.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
