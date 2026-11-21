import Link from "next/link";
import classNames from "classnames";

const RAINBOW_GRADIENT =
  "conic-gradient(from 0deg, #FFEF62, #6BD6FF, #6BFF78, #BF61FF, #E7D95D, #FFEF62)";
// Same stops, but reads its start angle from the animated custom property
// registered in globals.css (`@property --rainbow-angle`) — used by the
// "outline" ring variant so the gradient itself sweeps in place instead of
// a background plane physically rotating behind a mask.
const RAINBOW_GRADIENT_ANIMATED =
  "conic-gradient(from var(--rainbow-angle), #FFEF62, #6BD6FF, #6BFF78, #BF61FF, #E7D95D, #FFEF62)";

const SHAPE_CLASS: Record<"pill" | "rounded", string> = {
  pill: "rounded-full",
  rounded: "rounded-xl",
};

type RainbowButtonProps = {
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit";
  shape?: "pill" | "rounded";
  /**
   * "solid" (default): the ring shows through a 1.5px gap around an opaque
   * inner surface — simplest, but a translucent/backdrop-blur surface would
   * let the ring's own gradient layer show through instead of whatever is
   * behind the button.
   * "outline": the gradient is masked down to just the border-width ring
   * itself, painted on top of the surface's own background rather than
   * behind it — safe to combine with a translucent or backdrop-blur surface.
   */
  variant?: "solid" | "outline";
  /** Ring thickness in px for `variant="outline"`. Ignored for "solid". */
  ringWidth?: number;
  /** Controls the inner surface: background, text color, padding, font size, etc. */
  className?: string;
  children: React.ReactNode;
};

/**
 * A spinning conic-gradient ring around a button, reading as an animated
 * gradient border. See `variant` for the two ways the ring is produced.
 */
export function RainbowButton({
  href,
  onClick,
  type = "button",
  shape = "pill",
  variant = "outline",
  ringWidth = 2,
  className,
  children,
}: RainbowButtonProps) {
  const shapeClass = SHAPE_CLASS[shape];

  if (variant === "outline") {
    const surfaceClass = classNames(
      "group relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors",
      shapeClass,
      className,
    );
    // The mask that cuts this down to a ring (rather than a filled rectangle)
    // is set via inline style, not a Tailwind arbitrary-value class: the
    // value has a top-level comma (two mask layers), which Tailwind's
    // bracket-notation parser can cut off mid-value, silently dropping the
    // whole utility and leaving the gradient unmasked.
    //
    // The gradient animates via `--rainbow-angle` (registered in
    // globals.css) rather than rotating a background plane behind the mask.
    // A rotating plane has to be oversized enough to cover every point of
    // the ring at every rotation angle, including rounded corners — subtly
    // easy to get wrong, and the failure mode is a visible unpainted gap.
    // Animating the angle paints fresh within the exact ring box every
    // frame, so there's no coverage math to get wrong.
    const maskLayers = "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)";
    const ring = (
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 motion-reduce:animate-none [animation:rainbow-angle-spin_5s_linear_infinite]"
        style={{
          padding: ringWidth,
          borderRadius: "inherit",
          backgroundImage: RAINBOW_GRADIENT_ANIMATED,
          WebkitMask: maskLayers,
          mask: maskLayers,
          WebkitMaskComposite: "xor",
          maskComposite: "exclude",
        }}
      />
    );

    if (href) {
      return (
        <Link href={href} className={surfaceClass}>
          {ring}
          {children}
        </Link>
      );
    }

    return (
      <button type={type} onClick={onClick} className={surfaceClass}>
        {ring}
        {children}
      </button>
    );
  }

  const wrapperClass = classNames(
    "group relative inline-flex overflow-hidden p-[1.5px] shadow-sm",
    shapeClass,
  );

  const inner = (
    <>
      <span
        aria-hidden
        className="absolute inset-[-80%] motion-reduce:animate-none [animation:rainbow-trace-spin_5s_linear_infinite]"
        style={{ backgroundImage: RAINBOW_GRADIENT }}
      />
      <span
        className={classNames(
          "relative inline-flex items-center justify-center gap-2 whitespace-nowrap transition-colors",
          shapeClass,
          className,
        )}
      >
        {children}
      </span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={wrapperClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={wrapperClass}>
      {inner}
    </button>
  );
}
