type Props = {
  label: string;
  value: string;
  valueEmphasis?: "gradient" | "default";
  variant?: "cream" | "dark";
};

export function DesignSpecRow({
  label,
  value,
  valueEmphasis = "default",
  variant = "cream",
}: Props) {
  const isDark = variant === "dark";

  return (
    <div
      className={`flex items-start justify-between gap-3 border-b py-1.5 last:border-0 ${
        isDark ? "customer-card-border" : "border-cream-300/80"
      }`}
    >
      <span
        className={`shrink-0 font-dm-sans text-xs font-normal leading-[18px] ${
          isDark ? "customer-text-muted" : "text-warm-gray"
        }`}
        style={{ fontVariationSettings: "'opsz' 9" }}
      >
        {label}
      </span>
      {valueEmphasis === "gradient" ? (
        <span
          className="max-w-[60%] bg-clip-text text-right font-dm-sans text-xs font-semibold leading-[18px] text-transparent"
          style={{
            fontVariationSettings: "'opsz' 14",
            backgroundImage:
              "linear-gradient(172deg, rgb(32, 148, 243) 8.57%, rgb(23, 207, 207) 91.43%)",
          }}
        >
          {value}
        </span>
      ) : (
        <span
          className={`max-w-[60%] text-right font-dm-sans text-xs font-medium leading-[18px] ${
            isDark ? "customer-text-on-dark" : "text-warm-ink"
          }`}
          style={{ fontVariationSettings: "'opsz' 14" }}
        >
          {value}
        </span>
      )}
    </div>
  );
}
