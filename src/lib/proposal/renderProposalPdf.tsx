"use client";

import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import { PAGE_H, PAGE_W, ProposalPages } from "@/components/proposal/ProposalPages";
import type { LoadedProposal } from "@/lib/proposal/loadProposalDocument";

/** Pixels per CSS px when rasterising; 2 keeps text sharp, JPEG keeps the file small enough to email. */
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

/**
 * Draws the ten proposal pages off screen and turns each into a PDF page.
 * Links (QR boxes, "Book your site check") stay clickable in the PDF.
 */
export async function renderProposalPdf({ doc, images }: LoadedProposal): Promise<Blob> {
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

    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
    const pages = Array.from(host.querySelectorAll<HTMLElement>("[data-proposal-page]"));

    for (let i = 0; i < pages.length; i++) {
      const el = pages[i];
      const canvas = await html2canvas(el, {
        scale: SCALE,
        width: PAGE_W,
        height: PAGE_H,
        backgroundColor: "#FFFFFF",
        useCORS: true,
        logging: false,
        // The page sits off screen; render it as if it were at the origin.
        scrollX: 0,
        scrollY: 0,
        windowWidth: PAGE_W,
      });
      if (i > 0) pdf.addPage("a4", "portrait");
      pdf.addImage(canvas.toDataURL("image/jpeg", JPEG_QUALITY), "JPEG", 0, 0, 210, 297, undefined, "FAST");

      const pageBox = el.getBoundingClientRect();
      el.querySelectorAll<HTMLElement>("[data-pdf-link]").forEach((a) => {
        const url = a.dataset.pdfLink;
        if (!url) return;
        const r = a.getBoundingClientRect();
        pdf.link(
          (r.left - pageBox.left) * MM_PER_PX,
          (r.top - pageBox.top) * MM_PER_PX,
          r.width * MM_PER_PX,
          r.height * MM_PER_PX,
          { url },
        );
      });
    }

    pdf.setProperties({ title: `Solar proposal for ${doc.fullName || doc.firstName}`, author: "EasyLink Solar" });
    return pdf.output("blob");
  } finally {
    root.unmount();
    host.remove();
  }
}
