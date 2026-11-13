"use client";

import Icon from "@/components/ui/Icons";
import { MAX_COMPARE_PRODUCTS } from "@/components/pages/products/productsData";
import type { Product } from "@/components/pages/products/types";

type Props = {
  products: Product[];
  onRemove: (id: string) => void;
  onClear: () => void;
  onOpenCompare: () => void;
};

export function ProductsCompareBar({
  products,
  onRemove,
  onClear,
  onOpenCompare,
}: Props) {
  if (products.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-warm-border bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:px-6">
      <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <span className="font-dm-sans text-[12px] font-semibold text-warm-gray">
            Compare ({products.length}/{MAX_COMPARE_PRODUCTS})
          </span>
          {products.map((product) => (
            <span
              key={product.id}
              className="flex items-center gap-1.5 rounded-full border border-warm-border bg-cream-50 py-1 pl-3 pr-1.5 font-dm-sans text-[12px] font-medium text-warm-ink"
            >
              {product.title
                ? [product.title.name, product.title.size].filter(Boolean).join(" · ")
                : product.name}
              <button
                type="button"
                aria-label={`Remove ${product.name} from compare`}
                onClick={() => onRemove(product.id)}
                className="flex size-4 items-center justify-center rounded-full text-warm-gray hover:bg-warm-border/50 hover:text-warm-ink"
              >
                <Icon name="X" className="size-2.5" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="font-dm-sans text-[12px] font-medium text-warm-gray underline hover:text-warm-ink"
          >
            Clear
          </button>
        </div>

        <button
          type="button"
          onClick={onOpenCompare}
          disabled={products.length < 2}
          className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 font-dm-sans text-[13px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            backgroundImage:
              "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)",
          }}
        >
          Compare Now
        </button>
      </div>
    </div>
  );
}
