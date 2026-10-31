"use client";

import { toCanvas } from "html-to-image";
import { jsPDF } from "jspdf";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { PAGE_H, PAGE_W, ProposalPages } from "@/components/proposal/ProposalPages";
import type { LoadedProposal } from "@/lib/proposal/loadProposalDocument";
import {
  compressToLimit,
  EMAIL_PDF_MAX_BYTES,
  type CompressionResult,
  type CompressionStep,
} from "@/lib/proposal/pdfCompression";

/** Pixels per CSS px when rasterising, and the download copy's JPEG quality. */
const SCALE = 1.75;
const JPEG_QUALITY = 0.82;
const MM_PER_PX = 210 / PAGE_W;

async function imagesReady(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map((img) =>
      img.complete && img.naturalWidth > 0
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
          }),
    ),
  );
}

type CapturedPage = {
  canvas: HTMLCanvasElement;
  links: { x: number; y: number; w: number; h: number; url: string }[];
};

/** Draws the ten pages off screen and captures each one once. */
async function capturePages({ doc, images }: LoadedProposal): Promise<CapturedPage[]> {
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "-10000px",
    top: "0",
    width: `${PAGE_W}px`,
    pointerEvents: "none",
    zIndex: "-1",
  });
  document.body.appendChild(host);
  const root = createRoot(host);

  try {
    flushSync(() => root.render(<ProposalPages doc={doc} images={images} gap={0} />));
    await imagesReady(host);
    if (document.fonts?.ready) await document.fonts.ready;

    const out: CapturedPage[] = [];
    for (const el of Array.from(host.querySelectorAll<HTMLElement>("[data-proposal-page]"))) {
      // The browser draws the page itself (SVG foreignObject), so text sits
      // exactly where the preview shows it on every computer. html2canvas
      // re-laid text out on its own and dropped big numbers onto the line
      // below on Windows.
      const canvas = await toCanvas(el, {
        pixelRatio: SCALE,
        width: PAGE_W,
        height: PAGE_H,
        backgroundColor: "#FFFFFF",
        cacheBust: false,
      });
      const pageBox = el.getBoundingClientRect();
      const links = Array.from(el.querySelectorAll<HTMLElement>("[data-pdf-link]")).flatMap((a) => {
        const url = a.dataset.pdfLink;
        if (!url) return [];
        const r = a.getBoundingClientRect();
        return [{ x: (r.left - pageBox.left) * MM_PER_PX, y: (r.top - pageBox.top) * MM_PER_PX, w: r.width * MM_PER_PX, h: r.height * MM_PER_PX, url }];
      });
      out.push({ canvas, links });
    }
    return out;
  } finally {
    root.unmount();
    host.remove();
  }
}

function downscale(canvas: HTMLCanvasElement, resolution: number): HTMLCanvasElement {
  if (resolution >= 1) return canvas;
  const c = document.createElement("canvas");
  c.width = Math.round(canvas.width * resolution);
  c.height = Math.round(canvas.height * resolution);
  const ctx = c.getContext("2d");
  if (!ctx) return canvas;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, c.width, c.height);
  return c;
}

/** Assembles the captured pages into a PDF at one compression step. Links stay clickable. */
function assemblePdf(pages: CapturedPage[], title: string, step: CompressionStep): Blob {
  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  pages.forEach((p, i) => {
    if (i > 0) pdf.addPage("a4", "portrait");
    const img = downscale(p.canvas, step.resolution).toDataURL("image/jpeg", step.quality);
    pdf.addImage(img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    for (const l of p.links) pdf.link(l.x, l.y, l.w, l.h, { url: l.url });
  });
  pdf.setProperties({ title, author: "EasyLink Solar" });
  return pdf.output("blob");
}

const FULL_QUALITY: CompressionStep = { quality: JPEG_QUALITY, resolution: 1 };

function titleOf({ doc }: LoadedProposal): string {
  return `Solar proposal for ${doc.fullName || doc.firstName}`;
}

/** The full-quality proposal PDF, for download. */
export async function renderProposalPdf(loaded: LoadedProposal): Promise<Blob> {
  return assemblePdf(await capturePages(loaded), titleOf(loaded), FULL_QUALITY);
}

/**
 * The download copy and a compressed copy for email, from one capture:
 * the email copy is squeezed under `emailMaxBytes` (see pdfCompression).
 */
export async function renderProposalPdfs(
  loaded: LoadedProposal,
  emailMaxBytes: number = EMAIL_PDF_MAX_BYTES,
): Promise<{ download: Blob; email: CompressionResult }> {
  const pages = await capturePages(loaded);
  const title = titleOf(loaded);
  const download = assemblePdf(pages, title, FULL_QUALITY);
  const email =
    download.size <= emailMaxBytes
      ? { blob: download, step: FULL_QUALITY, fits: true }
      : await compressToLimit(async (step) => assemblePdf(pages, title, step), emailMaxBytes);
  return { download, email };
}
