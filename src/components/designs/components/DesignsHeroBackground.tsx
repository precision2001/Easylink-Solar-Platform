import Image from "next/image";

const BG_SRC = "/images/home/design-background.png";

type DesignsHeroBackgroundProps = {
  className?: string;
  /** "slate": the proposal screen's plain blue-grey backdrop (owner's mock-up, 10 Nov 2026). */
  variant?: "circuit" | "slate";
};

/**
 * Full-bleed hero background with Figma overlays:
 * vertical fade to black + uniform 14% black tint.
 */
export function DesignsHeroBackground({
  className,
  variant = "circuit",
}: DesignsHeroBackgroundProps) {
  if (variant === "slate") {
    return (
      <div
        className={`pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,#3A4859_0%,#26313F_45%,#151C26_100%)] ${className ?? ""}`}
        aria-hidden
      />
    );
  }
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className ?? ""}`}
      aria-hidden
    >
      <Image
        src={BG_SRC}
        alt=""
        fill
        priority
        className="object-cover"
        sizes="100vw"
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.9) 100%), linear-gradient(90deg, rgba(0, 0, 0, 0.14) 0%, rgba(0, 0, 0, 0.14) 100%)",
        }}
      />
    </div>
  );
}
