import {
  EQUIPMENT_CATEGORY_KEYS,
  type DesignProposalState,
  type EquipmentCategoryKey,
} from "@/lib/store/designProposalSlice";
import type { ProposalPdfLinks } from "@/lib/proposal/loadProposalDocument";

export type { ProposalPdfLinks } from "@/lib/proposal/loadProposalDocument";

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

/**
 * Builds the 10-page customer proposal PDF for a design: the same pages the
 * preview shows (components/proposal/ProposalPages), priced by the pricing
 * engine. Browser only — it draws the pages to rasterise them.
 */
export async function generateProposalPdfBlob(
  proposal: DesignProposalState,
  links: ProposalPdfLinks = {},
): Promise<Blob> {
  const [{ loadProposalDocument }, { renderProposalPdf }] = await Promise.all([
    import("@/lib/proposal/loadProposalDocument"),
    import("@/lib/proposal/renderProposalPdf"),
  ]);
  return renderProposalPdf(await loadProposalDocument(proposal, links));
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
