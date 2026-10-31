"use client";

import QRCode from "qrcode";

import type { ProposalImages } from "@/components/proposal/ProposalPages";
import { designBatteryKwh, buildProposalDocument, type ProposalDocument, type ProposalLinks } from "@/lib/proposal/proposalDocument";
import { fetchProposalPricing, type ProposalPricingResponse } from "@/lib/proposal/proposalPricing";
import { BATTERY_CAPACITY_OPTIONS, DEFAULT_PANEL_TIER_ID, PANEL_TIER_OPTIONS } from "@/lib/designs/proposalOptions";
import type { DesignProposalState } from "@/lib/store/designProposalSlice";

const LOGO_PATH = "/images/solarDesignLogo.png";

/** Optional links; the builder (signed-out) path has none and falls back. */
export type ProposalPdfLinks = {
  portalUrl?: string;
  referralCode?: string;
  referralUrl?: string;
};

export type LoadedProposal = { doc: ProposalDocument; images: ProposalImages };

function origin(): string {
  if (typeof window !== "undefined" && window.location?.origin) return window.location.origin;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://easylinksolar.com.au";
}

export function resolveLinks(links: ProposalPdfLinks = {}, base: string = origin()): ProposalLinks {
  const portalUrl = links.portalUrl ?? `${base}/customers/design`;
  const code = links.referralCode?.trim() || null;
  return {
    portalUrl,
    portalLabel: portalUrl.replace(/^https?:\/\/(www\.)?/, ""),
    referralCode: code,
    referralUrl:
      links.referralUrl ??
      (code ? `${base}/customers/auth?ref=${encodeURIComponent(code)}` : `${base}/designs`),
  };
}

async function toDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const blob = await res.blob();
    if (!blob.type.startsWith("image/")) return null;
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(typeof r.result === "string" ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function qr(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { errorCorrectionLevel: "M", margin: 1, width: 360 });
  } catch {
    return null;
  }
}

/** The design's roof: its saved screenshot with panels, else a satellite image of the pin. */
async function roofImage(proposal: DesignProposalState): Promise<string | null> {
  const shot = proposal.solarDesign?.mapScreenshotDataUrl;
  if (shot) return shot;
  const lat = proposal.solarDesign?.pinLat ?? proposal.customer.mapLat;
  const lng = proposal.solarDesign?.pinLng ?? proposal.customer.mapLng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;
  return toDataUrl(`/api/solar/roof-snapshot?lat=${lat}&lng=${lng}&zoom=20`);
}

async function pricingFor(proposal: DesignProposalState): Promise<ProposalPricingResponse | null> {
  const panelCount =
    Number.parseInt((proposal.equipment.numberOfPanels || proposal.summary.totalPanels || "0").replace(/\D/g, ""), 10) || 0;
  if (panelCount <= 0) return null;
  try {
    return await fetchProposalPricing({
      panelCount,
      panelTierId: proposal.equipment.panelTierId ?? DEFAULT_PANEL_TIER_ID,
      batteryKwh: designBatteryKwh(proposal),
      tiers: PANEL_TIER_OPTIONS.map((t) => t.id),
      batteryOptionsKwh: BATTERY_CAPACITY_OPTIONS.map((b) => Number.parseFloat(b.id) || 0),
    });
  } catch {
    return null;
  }
}

/**
 * Gathers everything the proposal needs: the price from the pricing engine
 * (falls back to the design's stored price), QR codes, logo and roof image.
 * Each piece is best effort, so a slow or missing one never blocks the PDF.
 */
export async function loadProposalDocument(
  proposal: DesignProposalState,
  links: ProposalPdfLinks = {},
): Promise<LoadedProposal> {
  const resolved = resolveLinks(links);
  const [pricing, logo, roof, portalQr, referralQr] = await Promise.all([
    pricingFor(proposal),
    toDataUrl(LOGO_PATH),
    roofImage(proposal),
    qr(resolved.portalUrl),
    qr(resolved.referralUrl),
  ]);
  return {
    doc: buildProposalDocument({ proposal, pricing, links: resolved }),
    images: { logo, roof, portalQr, referralQr },
  };
}
