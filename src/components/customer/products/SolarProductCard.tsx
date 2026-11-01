"use client";

import Image from "next/image";
import { productsAssets } from "./productsAssets";
import type { SolarProduct } from "./types";
import Icon from "@/components/ui/Icons";

type Props = {
  product: SolarProduct;
  favorited: boolean;
  onToggleFavorite: () => void;
  onAdd: () => void;
};

export function SolarProductCard({
  product,
  favorited,
  onToggleFavorite,
  onAdd,
}: Props) {
  const catLabel = product.category.toUpperCase();

  return (
    <article className="customer-cream-card-bg customer-cream-card-border flex flex-col overflow-hidden rounded-[10px] border">
      <div className="relative h-20 w-full shrink-0 overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <Image
            src={productsAssets.productBg}
            alt=""
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 25vw"
            unoptimized
          />
          <Image
            src={productsAssets.productBg2}
            alt=""
            fill
            className="object-cover opacity-90"
            sizes="(max-width: 640px) 100vw, 25vw"
            unoptimized
          />
        </div>
        <div className="relative flex h-full items-center justify-center">
          <Image
            src={product.imageUrl ?? productsAssets.productImg}
            alt={product.imageUrl ? product.name : ""}
            width={120}
            height={80}
            className="h-[95%] w-auto max-w-[34%] object-contain"
            unoptimized
          />
        </div>
        {product.bestSeller ? (
          <span className="absolute left-2 top-2 rounded-full bg-success px-2 py-0.5 font-dm-sans text-[7px] font-bold uppercase leading-[10.5px] tracking-[0.3px] text-white">
            Best Seller
          </span>
        ) : null}
        <button
          type="button"
          aria-label={favorited ? "Remove from favorites" : "Add to favorites"}
          onClick={onToggleFavorite}
          className="absolute right-2 top-2 flex size-6 items-center justify-center rounded-full bg-white/80 hover:bg-white"
        >
          <Icon
            name="ProductHeart"
            className={`size-4 shrink-0 text-black ${favorited ? "opacity-100" : "opacity-70"}`}
            aria-hidden
          />
        </button>
      </div>

      <div className="flex flex-1 flex-col px-3 pb-3 pt-4">
        <p
          className="font-dm-sans text-[9px] font-normal uppercase leading-[13.5px] tracking-[0.3px] text-warm-gray"
          style={{ fontVariationSettings: "'opsz' 9" }}
        >
          {catLabel}
        </p>
        <h3
          className="mt-2 line-clamp-2 min-h-[2.5rem] font-dm-sans text-[13px] font-semibold leading-[19.5px] text-warm-ink"
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {product.name}
        </h3>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            <Icon
              name="AboutUsStar"
              className="size-4 shrink-0 text-orange-amber mb-0.5"
              aria-hidden
            />
            <span
              className="font-dm-sans text-[10px] font-semibold leading-[15px] text-warm-ink"
              style={{ fontVariationSettings: "'opsz' 14" }}
            >
              {product.rating}
            </span>
          </div>
          <span
            className="font-dm-sans text-[9px] font-normal leading-[13.5px] text-warm-gray"
            style={{ fontVariationSettings: "'opsz' 9" }}
          >
            ({product.reviewCount})
          </span>
        </div>
        <div className="mt-auto flex items-center justify-between gap-2 pt-4">
          <p className="font-inter text-base font-bold leading-6 text-warm-ink">
            {product.price}
          </p>
          <button
            type="button"
            onClick={onAdd}
            className="flex h-[26px] min-w-[58px] items-center justify-center gap-1 rounded-md px-2 font-dm-sans text-[9px] font-semibold leading-[13.5px] text-white"
            style={{
              fontVariationSettings: "'opsz' 14",
              backgroundImage:
                "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)",
            }}
          >
            <Icon
              name="ProductCart"
              className="size-4 shrink-0 text-white"
              aria-hidden
            />
            <span className="mt-0.5">Add</span>
          </button>
        </div>
      </div>
    </article>
  );
}
