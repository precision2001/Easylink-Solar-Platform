"use client";

type Props = {
  value: number;
  onChange: (next: number) => void;
  label: string;
  min?: number;
  max?: number;
  size?: "sm" | "md";
};

/** − [n] + control used by the cart drawer, cart page and add-to-cart. */
export function QuantityStepper({ value, onChange, label, min = 1, max = 999, size = "md" }: Props) {
  const h = size === "sm" ? "h-7" : "h-9";
  const w = size === "sm" ? "w-7" : "w-9";
  return (
    <div className={`inline-flex ${h} items-center overflow-hidden rounded-lg border border-warm-border bg-white`}>
      <button
        type="button"
        aria-label={`Decrease quantity of ${label}`}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
        className={`${w} h-full font-inter text-[15px] text-warm-ink hover:bg-cream-50 disabled:opacity-30`}
      >
        −
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={`Quantity of ${label}`}
        value={value}
        min={min}
        max={max}
        onChange={(e) => {
          const n = Math.floor(Number(e.target.value));
          if (Number.isFinite(n) && n >= min) onChange(Math.min(max, n));
        }}
        className="h-full w-10 border-x border-warm-border text-center font-dm-sans text-[13px] font-semibold text-warm-ink [appearance:textfield] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Increase quantity of ${label}`}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
        className={`${w} h-full font-inter text-[15px] text-warm-ink hover:bg-cream-50 disabled:opacity-30`}
      >
        +
      </button>
    </div>
  );
}
