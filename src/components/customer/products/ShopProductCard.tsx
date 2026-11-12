"use client";

import { askEasylinkAi } from "@/components/ai-chat/EasylinkAiChatbot";
import { ProductImageTile } from "@/components/customer/products/ProductImageTile";
import { ProductDocumentLinks } from "@/components/products/ProductDocumentLinks";
import { PortalIcon } from "@/components/customer/portal/PortalIcon";
import { formatOptionPrice } from "@/lib/customers/design-options";
import { SHOP_CATEGORY_LABEL, productQuestion, type DesignSystemSize, type ShopProduct } from "@/lib/customers/shop-products";
import { isAfterpayPayable, type AfterpayConfig } from "@/lib/public/afterpayConfig";

export function ShopProductCard({
  product,
  size,
  afterpay,
  zip,
  onAdd,
}: {
  product: ShopProduct;
  size: DesignSystemSize;
  afterpay: AfterpayConfig | null;
  zip: AfterpayConfig | null;
  onAdd: () => void;
}) {
  const minor = product.price ? Math.round(product.price * 100) : 0;
  const payLater = [
    minor && isAfterpayPayable(afterpay, minor) ? "Afterpay" : null,
    minor && isAfterpayPayable(zip, minor) ? "Zip" : null,
  ].filter(Boolean) as string[];
  const isBattery = product.category === "battery";

  return (
    <article className="grid grid-cols-[104px_minmax(0,1fr)] overflow-hidden sm:flex sm:flex-col rounded-[20px] border border-[#E2E8F0] bg-white transition-shadow hover:shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
      <div className="relative">
        <ProductImageTile
          imageUrl={product.imageUrl}
          category={product.category}
          alt={product.fullName}
          className="h-full min-h-[148px] border-r border-[#EEF2F6] sm:h-[168px] sm:min-h-0 sm:border-b sm:border-r-0"
        />
        {product.bestSeller ? (
          <span className="absolute left-2 top-2 rounded-full bg-[#0B1A2E] px-2 py-0.5 text-[11.5px] sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-[12px] font-bold text-[#FFE866]">Best seller</span>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3.5 sm:gap-2 sm:p-4">
        <p className="m-0 text-[13px] text-[#5B6B80]">
          {specLine(product)}
        </p>
        <h3 className="m-0 line-clamp-2 text-[15px] font-bold leading-[1.35] sm:text-[15.5px] text-[#0F172A] [overflow-wrap:anywhere]">{product.fullName}</h3>
        <ProductDocumentLinks specs={product.specs} label={product.fullName} className="text-[12.5px]" linkClassName="font-semibold text-[#1D4ED8]" />
        {product.rating ? (
          <p className="m-0 flex items-center gap-1 text-[13px] text-[#475569]">
            <svg viewBox="0 0 20 20" className="size-4 text-[#F68A0A]" aria-hidden="true">
              <path fill="currentColor" d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
            </svg>
            <span className="font-semibold text-[#0F172A]">{product.rating.value.toFixed(1)}</span>
            <span>
              ({product.rating.count} {product.rating.count === 1 ? "review" : "reviews"})
            </span>
          </p>
        ) : null}

        <div className="mt-auto flex flex-col gap-2 pt-1 sm:gap-3 sm:pt-2">
          <div className="flex items-end justify-between gap-2">
            <div className="flex min-w-0 flex-col">
              <span className="text-[18px] font-extrabold tabular-nums sm:text-[20px] text-[#0F172A]">{product.price ? formatOptionPrice(product.price) : "Price on request"}</span>
              <span className="text-[12.5px] text-[#5B6B80]">
                {product.price ? (payLater.length ? `incl. GST · ${payLater.join(" or ")} available` : "incl. GST") : "We'll confirm it before you pay"}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onAdd}
            aria-label={`Add ${product.fullName} to cart`}
            className="flex min-h-[46px] items-center justify-center gap-2 rounded-[13px] bg-[#0B1A2E] text-[14.5px] font-bold text-white transition-colors hover:bg-[#16304F] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            <CartIcon />
            Add to cart
          </button>
          <button
            type="button"
            onClick={() => askEasylinkAi(productQuestion(product, size))}
            className="-mx-1 flex min-h-[44px] items-center justify-start gap-1.5 rounded-[12px] px-1 text-[13.5px] sm:mx-0 sm:justify-center sm:px-0 font-semibold text-[#1D4ED8] hover:bg-[#EFF6FF] focus-visible:outline-2 focus-visible:outline-[#2563EB]"
          >
            <PortalIcon name="spark" size={15} className="text-[#F68A0A]" />
            {isBattery ? "Which battery suits me?" : "Will it suit my system?"}
          </button>
        </div>
      </div>
    </article>
  );
}

function specLine(product: ShopProduct): string {
  const kind = SHOP_CATEGORY_LABEL[product.category].one;
  return product.keySpec ? `${kind} · ${product.keySpec}` : kind;
}

function CartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 4h2.5l2.2 10.5h10.6L20.5 7H6.4" />
      <circle cx="9.5" cy="19" r="1.5" />
      <circle cx="17" cy="19" r="1.5" />
    </svg>
  );
}
