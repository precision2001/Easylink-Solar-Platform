"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import classNames from "classnames";
import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import { downloadDatasheet } from "@/components/pages/products/downloadDatasheet";
import { createProductCheckout } from "@/lib/customers/payments";
import {
  fetchAfterpayConfig,
  isAfterpayPayable,
  type AfterpayConfig,
} from "@/lib/public/afterpayConfig";
import type {
  Product,
  ProductBadge,
  ProductCategoryKey,
} from "@/components/pages/products/types";

const BADGE_CLASS: Record<ProductBadge, string> = {
  "Best Seller": "bg-design-accent-cyan text-white",
  Popular: "bg-design-accent-cyan text-white",
  "Best Value": "bg-success text-white",
  New: "bg-orange-amber text-white",
};

const CATEGORY_PHOTO_LABEL: Record<ProductCategoryKey, string> = {
  batteries: "battery photo",
  "solar-panels": "solar panel photo",
  inverters: "inverter photo",
  "ev-chargers": "EV charger photo",
  "heat-pumps": "heat pump photo",
  "portable-power": "portable power photo",
};

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

type Props = {
  product: Product;
  inCompare: boolean;
  compareDisabled?: boolean;
  onToggleCompare: () => void;
};

export function ProductCard({
  product,
  inCompare,
  compareDisabled,
  onToggleCompare,
}: Props) {
  const [quantity, setQuantity] = useState(1);
  const [buying, setBuying] = useState(false);
  const inStock = product.inStock ?? true;

  // Afterpay is offered only when this product's total is inside Afterpay's
  // real order-value range. Most panels and batteries sit well above the cap,
  // so showing the button unconditionally would mostly promise a checkout
  // Afterpay refuses after the redirect.
  const [afterpay, setAfterpay] = useState<AfterpayConfig | null>(null);
  useEffect(() => {
    let active = true;
    void fetchAfterpayConfig().then((c) => {
      if (active) setAfterpay(c);
    });
    return () => {
      active = false;
    };
  }, []);

  const totalMinor = Math.round(product.price * 100) * quantity;
  const afterpayAvailable = inStock && isAfterpayPayable(afterpay, totalMinor);

  async function handleBuyNow(paymentMethod: "card" | "afterpay" = "card") {
    setBuying(true);
    try {
      const session = await createProductCheckout({
        productId: product.id,
        quantity,
        paymentMethod,
      });
      toast.info(
        paymentMethod === "afterpay"
          ? "Redirecting to Afterpay…"
          : "Redirecting to Stripe secure checkout…",
      );
      window.location.assign(session.checkoutUrl);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Could not start checkout";
      toast.error(message);
      setBuying(false);
    }
  }

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-warm-border bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className="relative flex h-72 w-full items-center justify-center overflow-hidden"
        style={
          product.photo
            ? undefined
            : product.imageUrl
              ? { backgroundImage: "radial-gradient(ellipse at 50% 40%, #ffffff 0%, #f4efe4 70%, #ebe2cf 100%)" }
              : { backgroundImage: "linear-gradient(160deg, #f3ead6 0%, #e9dcc0 100%)" }
        }
      >
        {product.photo ? (
          <>
            <Image
              src={product.photo.background}
              alt=""
              fill
              className="object-cover"
              sizes="(max-width: 640px) 100vw, 33vw"
            />
          </>
        ) : product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={`${product.brand} ${product.name}`}
            fill
            unoptimized
            className="object-contain p-8 drop-shadow-[0_10px_18px_rgba(60,40,10,0.18)]"
            sizes="(max-width: 640px) 100vw, 33vw"
          />
        ) : (
          <span className="font-dm-sans text-[12px] font-medium text-warm-gray">
            {CATEGORY_PHOTO_LABEL[product.categoryKey]}
          </span>
        )}
        {product.badge ? (
          <span
            className={classNames(
              "absolute right-3 top-3 rounded-full px-3 py-1 font-dm-sans text-[11px] font-bold shadow-sm",
              BADGE_CLASS[product.badge],
            )}
          >
            {product.badge}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="font-inter text-[13px] font-bold leading-[16px] text-warm-ink">
          <span>{product.brand.split(" ")[0]}</span>
          {product.brand.split(" ").length > 1 ? (
            <span className="text-brand-blue">
              {" "}
              {product.brand.split(" ").slice(1).join(" ")}
            </span>
          ) : null}
        </p>

        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-inter text-[17px] font-bold leading-[22px] text-warm-ink [overflow-wrap:anywhere]">
              {product.name}
            </h3>
            <p className="mt-0.5 truncate font-dm-sans text-[11px] text-warm-gray">
              {product.model}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {product.rating > 0 ? (
              <span className="flex items-center gap-1">
                <Icon name="AboutUsStar" className="size-3.5 shrink-0 text-orange-amber" />
                <span className="font-dm-sans text-[12px] font-bold text-warm-ink">
                  {product.rating.toFixed(1)}
                </span>
              </span>
            ) : null}
            {product.hasDatasheet ? (
              <button
                type="button"
                onClick={() => downloadDatasheet(product)}
                className="flex items-center gap-1 font-dm-sans text-[10px] font-medium text-warm-gray hover:text-warm-ink"
              >
                Datasheet
                <Icon name="Download" className="size-3 shrink-0 text-success" />
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {product.features.map((feature) => (
            <span
              key={feature}
              className="flex items-center gap-1.5 font-dm-sans text-[12px] text-warm-ink/80"
            >
              <Icon name="CheckCircle" className="size-3.5 shrink-0 text-success" />
              {feature}
            </span>
          ))}
        </div>

        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <p className="font-inter text-[20px] font-bold leading-[24px] text-warm-ink">
            {currencyFormatter.format(product.price)}
          </p>
          <span
            className={classNames(
              "rounded-full px-2.5 py-1 font-dm-sans text-[10px] font-bold",
              inStock ? "bg-mint-soft text-success" : "bg-cream-150 text-warm-gray",
            )}
          >
            {inStock ? "In Stock" : "Out of Stock"}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center overflow-hidden rounded-lg border border-warm-border">
            <span className="w-9 px-1 text-center font-dm-sans text-[13px] font-semibold text-warm-ink">
              {quantity}
            </span>
            <div className="flex flex-col border-l border-warm-border">
              <button
                type="button"
                aria-label="Increase quantity"
                onClick={() => setQuantity((q) => q + 1)}
                className="flex h-3.5 w-6 items-center justify-center text-warm-gray hover:bg-cream-50 hover:text-warm-ink"
              >
                <Icon name="ChevronDown" className="size-2.5 rotate-180" />
              </button>
              <button
                type="button"
                aria-label="Decrease quantity"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="flex h-3.5 w-6 items-center justify-center border-t border-warm-border text-warm-gray hover:bg-cream-50 hover:text-warm-ink"
              >
                <Icon name="ChevronDown" className="size-2.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleCompare}
              aria-pressed={inCompare}
              disabled={compareDisabled}
              title={compareDisabled ? "You can compare up to 3 products" : undefined}
              className={classNames(
                "rounded-lg border px-2.5 py-2 font-dm-sans text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                inCompare
                  ? "border-warm-ink bg-warm-ink text-white"
                  : "border-warm-border bg-white text-warm-ink hover:bg-cream-50",
              )}
            >
              {inCompare ? "Remove" : "+ Compare"}
            </button>
            <button
              type="button"
              disabled={!inStock || buying}
              aria-label="Buy now"
              title="Buy now"
              onClick={() => void handleBuyNow("card")}
              className="flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)",
              }}
            >
              {buying ? (
                <span className="size-4 shrink-0 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <Icon name="ProductCart" className="size-4" />
              )}
            </button>
            {afterpayAvailable ? (
              <button
                type="button"
                disabled={buying}
                aria-label="Pay with Afterpay in 4 instalments"
                title="Pay in 4 with Afterpay"
                onClick={() => void handleBuyNow("afterpay")}
                className="flex h-9 shrink-0 items-center justify-center rounded-full bg-[#b2fce4] px-3 text-[12px] font-semibold text-warm-ink shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Pay in 4
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
