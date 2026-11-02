"use client";

import Image from "next/image";
import shopIcon from "@/components/ui/Icons/shop.svg";
import { cart, useCart } from "@/lib/cart/cart-store";

type Props = {
  className?: string;
  /** "light" for white headers (website), "dark" for the portals' dark bars. */
  tone?: "light" | "dark";
};

/** Header cart icon with item count; opens the shared cart drawer. */
export function CartButton({ className = "", tone = "light" }: Props) {
  const { count } = useCart();
  return (
    <button
      type="button"
      onClick={() => cart.open()}
      aria-label={count ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className={`relative inline-flex size-9 shrink-0 items-center justify-center rounded-full transition ${
        tone === "dark" ? "hover:bg-white/10" : "text-slate-900 hover:bg-slate-900/10"
      } ${className}`}
    >
      <Image
        src={shopIcon}
        alt=""
        width={24}
        height={22}
        className={tone === "dark" ? "brightness-0 invert" : undefined}
      />
      {count ? (
        <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-orange-amber px-1 font-dm-sans text-[10px] font-bold leading-none text-warm-black">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </button>
  );
}
