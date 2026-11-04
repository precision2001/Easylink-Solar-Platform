"use client";

import { useState } from "react";
import type { ShopCategory } from "@/lib/customers/shop-products";

/**
 * A product's real photo, or (when it has none, or the link is dead) a tidy
 * drawing of the product type on a tinted tile. Never a broken image.
 */
export function ProductImageTile({
  imageUrl,
  category,
  alt,
  className = "",
  compact = false,
}: {
  imageUrl?: string;
  category: ShopCategory;
  alt: string;
  className?: string;
  compact?: boolean;
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const showPhoto = Boolean(imageUrl) && failedUrl !== imageUrl;

  return (
    <div className={`relative flex items-center justify-center overflow-hidden ${showPhoto ? "bg-white" : "bg-[#EEF2F7]"} ${className}`}>
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element -- library thumbnails come from S3 and other hosts
        <img
          src={imageUrl}
          alt={alt}
          loading="lazy"
          decoding="async"
          onError={() => setFailedUrl(imageUrl ?? null)}
          className={`h-full w-full object-contain ${compact ? "p-1.5" : "p-4"}`}
        />
      ) : (
        <CategoryIllustration category={category} className={compact ? "h-[70%] w-[70%]" : "h-[64%] w-auto max-w-[60%]"} />
      )}
    </div>
  );
}

const NAVY = "#3E5A80";
const ORANGE = "#F68A0A";

/** Simple line drawings, one per product type (64 px grid). Decorative. */
export function CategoryIllustration({ category, className = "" }: { category: ShopCategory; className?: string }) {
  const common = { fill: "none", stroke: NAVY, strokeWidth: 2.4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true" focusable="false">
      {category === "panel" ? (
        <g {...common}>
          <path d="M14 14h40l-6 30H8z" fill="#FFFFFF" />
          <path d="M12.5 24h40M10.5 34h40M27 14l-5 30M41 14l-5 30" />
          <path d="M28 44v8M20 52h16" />
          <circle cx="51" cy="9" r="4" stroke={ORANGE} />
        </g>
      ) : category === "inverter" ? (
        <g {...common}>
          <rect x="16" y="8" width="32" height="44" rx="4" fill="#FFFFFF" />
          <rect x="22" y="15" width="20" height="10" rx="2" />
          <path d="M22 33h20M22 39h20M22 45h12" />
          <path d="M33 17l-3 4h4l-3 4" stroke={ORANGE} />
          <path d="M24 52v4M40 52v4" />
        </g>
      ) : category === "battery" ? (
        <g {...common}>
          <rect x="18" y="8" width="28" height="48" rx="5" fill="#FFFFFF" />
          <path d="M27 8V5h10v3" />
          <path d="M34 20l-7 12h7l-3 12 8-14h-7l3-10z" stroke={ORANGE} />
        </g>
      ) : category === "ev-charger" ? (
        <g {...common}>
          <rect x="14" y="8" width="24" height="40" rx="5" fill="#FFFFFF" />
          <rect x="19" y="14" width="14" height="8" rx="2" />
          <path d="M27 27l-3 5h5l-3 5" stroke={ORANGE} />
          <path d="M10 56h32M26 48v8" />
          <path d="M38 34c8 0 12 2 12 8v4" />
          <rect x="45" y="46" width="10" height="8" rx="2" />
        </g>
      ) : category === "heat-pump" ? (
        <g {...common}>
          <rect x="10" y="8" width="20" height="48" rx="8" fill="#FFFFFF" />
          <path d="M16 20h8M16 26h8" />
          <rect x="34" y="28" width="22" height="22" rx="3" fill="#FFFFFF" />
          <circle cx="45" cy="39" r="6" />
          <path d="M45 33v12M39 39h12" stroke={ORANGE} />
          <path d="M30 40h4" />
        </g>
      ) : (
        <g {...common}>
          <rect x="10" y="20" width="44" height="32" rx="5" fill="#FFFFFF" />
          <path d="M22 20v-6h20v6" />
          <circle cx="22" cy="38" r="3" />
          <circle cx="34" cy="38" r="3" />
          <path d="M44 32l-3 5h5l-3 5" stroke={ORANGE} />
        </g>
      )}
    </svg>
  );
}
