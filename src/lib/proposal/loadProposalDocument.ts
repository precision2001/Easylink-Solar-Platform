"use client";

import QRCode from "qrcode";

import type { ProposalImages } from "@/components/proposal/ProposalPages";
import { designBatteryKwh, buildProposalDocument, type ProposalDocument, type ProposalLinks } from "@/lib/proposal/proposalDocument";
import { fetchProposalPricing, type ProposalPricingResponse } from "@/lib/proposal/proposalPricing";
import { BATTERY_CAPACITY_OPTIONS, DEFAULT_PANEL_TIER_ID, PANEL_TIER_OPTIONS } from "@/lib/designs/proposalOptions";
import type { DesignProposalState } from "@/lib/store/designProposalSlice";
import { snapshotMetresPerPixel } from "@/lib/designer/roofSnapshot";
import { buildRoofDrawing, placeDriveway, toXY, type RoofDrawing, type XY } from "@/lib/proposal/roofGeometry";

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

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/**
 * The roof from above: Google's zoomed satellite image of this roof with
 * every panel of the design drawn where the designer placed it. Cropped to
 * the roof page's frame; Google's imagery credit kept on the image.
 */
type Satellite = { img: HTMLImageElement; mpp: number };

/** Google's zoomed satellite image centred on the roof, with its metres per pixel. */
export async function loadSatellite(roof: RoofDrawing): Promise<Satellite | null> {
  const span = Math.max(roof.maxX - roof.minX, roof.maxY - roof.minY);
  // Zoom 21 covers about 40 m across at Sydney; bigger roofs drop to zoom 20.
  const zoom = span > 30 ? 20 : 21;
  const g = { centerLat: roof.center.lat, centerLng: roof.center.lng, zoom, scale: 2, widthPx: 1280, heightPx: 1280 };
  const sat = await toDataUrl(`/api/solar/roof-snapshot?lat=${roof.center.lat}&lng=${roof.center.lng}&zoom=${zoom}`);
  if (!sat) return null;
  const img = await loadImage(sat);
  if (!img) return null;
  return { img, mpp: snapshotMetresPerPixel(g) * (img.naturalWidth / 1280) };
}

/**
 * How much of a footprint looks paved (concrete, pavers, bitumen) on the
 * satellite image: greyish, not too dark — not grass, garden or shadow.
 */
export function pavedScorer(sat: Satellite): (corners: XY[]) => number {
  const { img, mpp } = sat;
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true });
  if (!ctx) return () => 0.5;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data;
  const px = (p: XY) => ({ x: c.width / 2 + p.x / mpp, y: c.height / 2 - p.y / mpp });
  return (corners) => {
    const q = corners.map(px);
    let n = 0;
    let ok = 0;
    for (let i = 1; i < 8; i++) {
      for (let j = 1; j < 14; j++) {
        // Bilinear point inside the footprint.
        const u = i / 8;
        const v = j / 14;
        const top = { x: q[0].x + (q[1].x - q[0].x) * v, y: q[0].y + (q[1].y - q[0].y) * v };
        const bot = { x: q[3].x + (q[2].x - q[3].x) * v, y: q[3].y + (q[2].y - q[3].y) * v };
        const x = Math.round(top.x + (bot.x - top.x) * u);
        const y = Math.round(top.y + (bot.y - top.y) * u);
        if (x < 0 || y < 0 || x >= c.width || y >= c.height) continue;
        const k = (y * c.width + x) * 4;
        const r = data[k];
        const g = data[k + 1];
        const b = data[k + 2];
        const bright = (r + g + b) / 3;
        const sat = Math.max(r, g, b) - Math.min(r, g, b);
        const green = g > r + 6 && g > b;
        n++;
        if (!green && sat < 45 && bright > 85 && bright < 235) ok++;
      }
    }
    return n ? ok / n : 0;
  };
}

/** The street in front of the house: where Google's nearest Street View camera stands. */
async function streetPoint(lat: number, lng: number): Promise<{ lat: number; lng: number } | null> {
  try {
    const res = await fetch(`/api/solar/street-point?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const j = (await res.json()) as { data?: { lat: number; lng: number } };
    return j.data ?? null;
  } catch {
    return null;
  }
}

async function roofPhotoWithPanels(roof: RoofDrawing, sat: Satellite | null): Promise<string | null> {
  if (!sat) return null;
  const { img } = sat;

  const W = 1280;
  const H = 882; // the roof page frame, 682 × 470
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  const top = (img.naturalHeight - H) / 2;
  ctx.drawImage(img, 0, top, W, H, 0, 0, W, H);

  const mpp = sat.mpp;
  const px = (p: XY) => ({ x: W / 2 + p.x / mpp, y: img.naturalHeight / 2 - p.y / mpp - top });

  for (const corners of roof.panels) {
    const q = corners.map(px);
    ctx.beginPath();
    q.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.closePath();
    const grad = ctx.createLinearGradient(q[0].x, q[0].y, q[2].x, q[2].y);
    grad.addColorStop(0, "#22385F");
    grad.addColorStop(0.5, "#101E3A");
    grad.addColorStop(1, "#0A1530");
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = 1.6;
    ctx.strokeStyle = "#C9D4E5";
    ctx.stroke();
    // Cell line across the middle of the long side.
    ctx.beginPath();
    ctx.moveTo((q[0].x + q[3].x) / 2, (q[0].y + q[3].y) / 2);
    ctx.lineTo((q[1].x + q[2].x) / 2, (q[1].y + q[2].y) / 2);
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(127,162,218,0.7)";
    ctx.stroke();
  }

  // Google's imagery credit stays on the image.
  ctx.font = "600 20px Arial, sans-serif";
  const credit = `Imagery ©${new Date().getFullYear()} Google`;
  const tw = ctx.measureText(credit).width;
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.fillRect(W - tw - 24, H - 34, tw + 16, 26);
  ctx.fillStyle = "#1F2937";
  ctx.fillText(credit, W - tw - 16, H - 14);

  return canvas.toDataURL("image/jpeg", 0.9);
}

/** Roof photo for the roof page: with panels when the design has them, else the plain satellite view. */
async function roofImage(proposal: DesignProposalState, roof: RoofDrawing | null, sat: Satellite | null): Promise<string | null> {
  if (roof && roof.panels.length > 0) {
    const shot = await roofPhotoWithPanels(roof, sat).catch(() => null);
    if (shot) return shot;
  }
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
  const drawing = buildRoofDrawing(proposal.solarDesign);
  const [sat, street] = drawing
    ? await Promise.all([loadSatellite(drawing).catch(() => null), streetPoint(drawing.center.lat, drawing.center.lng)])
    : [null, null];
  const [pricing, logo, roof, portalQr, referralQr] = await Promise.all([
    pricingFor(proposal),
    toDataUrl(LOGO_PATH),
    roofImage(proposal, drawing, sat),
    qr(resolved.portalUrl),
    qr(resolved.referralUrl),
  ]);
  const doc = buildProposalDocument({ proposal, pricing, links: resolved });
  if (doc.roof) {
    // The car in the driveway and the battery beside it, for the cover drawing.
    doc.roof = placeDriveway(doc.roof, street ? toXY(street, doc.roof.center) : null, sat ? pavedScorer(sat) : undefined);
  }
  return {
    doc,
    images: { logo, roof, portalQr, referralQr },
  };
}
