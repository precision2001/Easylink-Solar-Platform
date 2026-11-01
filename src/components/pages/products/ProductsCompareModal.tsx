"use client";

import { useEffect } from "react";
import classNames from "classnames";
import Icon from "@/components/ui/Icons";
import { downloadDatasheet } from "@/components/pages/products/downloadDatasheet";
import {
  SPEC_LABEL_BY_CATEGORY,
  SPEC_UNIT_BY_CATEGORY,
} from "@/components/pages/products/productsData";
import type { Product } from "@/components/pages/products/types";

const currencyFormatter = new Intl.NumberFormat("en-AU", {
  style: "currency",
  currency: "AUD",
  minimumFractionDigits: 2,
});

const GRID_COLS_CLASS: Record<number, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
};

type Props = {
  products: Product[];
  onClose: () => void;
  onRemove: (id: string) => void;
};

export function ProductsCompareModal({ products, onClose, onRemove }: Props) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (products.length === 0) return null;

  const allFeatures = Array.from(
    new Set(products.flatMap((product) => product.features)),
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Compare products"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-[1000px] flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-warm-border px-5 py-4">
          <h2 className="font-inter text-[17px] font-bold text-warm-ink">
            Compare Products
          </h2>
          <button
            type="button"
            aria-label="Close comparison"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-full text-warm-gray hover:bg-cream-50 hover:text-warm-ink"
          >
            <Icon name="X" className="size-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5">
          <div
            className={classNames(
              "grid grid-cols-1 gap-4",
              GRID_COLS_CLASS[products.length] ?? "sm:grid-cols-3",
            )}
          >
            {products.map((product) => {
              const specLabel = SPEC_LABEL_BY_CATEGORY[product.categoryKey];
              const specUnit = SPEC_UNIT_BY_CATEGORY[product.categoryKey];
              const inStock = product.inStock ?? true;

              return (
                <div
                  key={product.id}
                  className="flex flex-col rounded-xl border border-warm-border"
                >
                  <div
                    className="relative flex h-28 items-center justify-center"
                    style={{
                      backgroundImage:
                        "linear-gradient(160deg, #f3ead6 0%, #e9dcc0 100%)",
                    }}
                  >
                    {product.imageThumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- compressed library thumbnail
                      <img
                        src={product.imageThumbUrl}
                        alt={`${product.brand} ${product.name}`}
                        loading="lazy"
                        className="h-full max-h-24 w-auto max-w-[70%] object-contain p-2"
                      />
                    ) : null}
                    <button
                      type="button"
                      aria-label={`Remove ${product.name} from compare`}
                      onClick={() => onRemove(product.id)}
                      className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/80 text-warm-gray hover:bg-white hover:text-warm-ink"
                    >
                      <Icon name="X" className="size-3" />
                    </button>
                  </div>

                  <div className="flex flex-1 flex-col gap-3 p-4">
                    <div>
                      <p className="font-dm-sans text-[11px] font-semibold uppercase tracking-[0.05em] text-warm-gray">
                        {product.brand}
                      </p>
                      <h3 className="font-inter text-[15px] font-bold leading-[19px] text-warm-ink">
                        {product.name}
                      </h3>
                      <p className="mt-0.5 truncate font-dm-sans text-[10px] text-warm-gray">
                        {product.model}
                      </p>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-cream-50 px-2.5 py-1.5">
                      <span className="font-dm-sans text-[11px] text-warm-gray">
                        {specLabel}
                      </span>
                      <span className="font-inter text-[12px] font-semibold text-warm-ink">
                        {product.specValue} {specUnit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between rounded-lg bg-cream-50 px-2.5 py-1.5">
                      <span className="font-dm-sans text-[11px] text-warm-gray">
                        Rating
                      </span>
                      <span className="flex items-center gap-1 font-inter text-[12px] font-semibold text-warm-ink">
                        {product.rating > 0 ? (
                          <>
                            <Icon
                              name="AboutUsStar"
                              className="size-3 shrink-0 text-orange-amber"
                            />
                            {product.rating.toFixed(1)}
                          </>
                        ) : (
                          <span className="text-warm-gray">—</span>
                        )}
                      </span>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      {allFeatures.map((feature) => {
                        const has = product.features.includes(feature);
                        return (
                          <span
                            key={feature}
                            className={classNames(
                              "flex items-center gap-1.5 font-dm-sans text-[11px]",
                              has ? "text-warm-ink/80" : "text-warm-gray/50",
                            )}
                          >
                            <Icon
                              name={has ? "CheckCircle" : "X"}
                              className={classNames(
                                "size-3 shrink-0",
                                has ? "text-success" : "text-warm-gray/40",
                              )}
                            />
                            {feature}
                          </span>
                        );
                      })}
                    </div>

                    <div className="mt-auto flex flex-col gap-2 pt-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-inter text-[17px] font-bold text-warm-ink">
                          {currencyFormatter.format(product.price)}
                        </p>
                        <span
                          className={classNames(
                            "rounded-full px-2 py-0.5 font-dm-sans text-[9px] font-bold",
                            inStock
                              ? "bg-mint-soft text-success"
                              : "bg-cream-150 text-warm-gray",
                          )}
                        >
                          {inStock ? "In Stock" : "Out of Stock"}
                        </span>
                      </div>
                      {product.hasDatasheet ? (
                        <button
                          type="button"
                          onClick={() => downloadDatasheet(product)}
                          className="flex items-center justify-center gap-1.5 rounded-lg border border-warm-border py-2 font-dm-sans text-[11px] font-semibold text-warm-ink hover:bg-cream-50"
                        >
                          <Icon name="Download" className="size-3.5 shrink-0" />
                          Download Datasheet
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
