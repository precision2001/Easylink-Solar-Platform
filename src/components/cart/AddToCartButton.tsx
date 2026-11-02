"use client";

import { toast } from "react-toastify";
import Icon from "@/components/ui/Icons";
import { cart, type CartLine } from "@/lib/cart/cart-store";

const GRADIENT = "linear-gradient(121.47deg, rgb(32, 148, 243) 0%, rgb(23, 207, 207) 100%)";

type Props = {
  line: CartLine;
  disabled?: boolean;
  /** "icon" = round cart button; "pill" = icon + label. */
  variant?: "icon" | "pill";
  label?: string;
  className?: string;
};

export function addLineToCart(line: CartLine) {
  if (!cart.add(line)) {
    toast.error("Your cart is full (50 different products). Check out or remove something first.");
  }
}

/** Adds a product to the shared cart and opens the cart drawer. */
export function AddToCartButton({ line, disabled, variant = "pill", label = "Add to cart", className = "" }: Props) {
  if (variant === "icon") {
    return (
      <button
        type="button"
        disabled={disabled}
        aria-label={`Add ${line.name} to cart`}
        title="Add to cart"
        onClick={() => addLineToCart(line)}
        className={`flex size-9 shrink-0 items-center justify-center rounded-full text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
        style={{ backgroundImage: GRADIENT }}
      >
        <Icon name="ProductCart" className="size-4" />
      </button>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => addLineToCart(line)}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 font-dm-sans text-[12px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
      style={{ backgroundImage: GRADIENT }}
    >
      <Icon name="ProductCart" className="size-4 shrink-0" aria-hidden />
      {label}
    </button>
  );
}
