import Icon from "../../ui/Icons";
import { DesignsHeroProgressBar } from "./DesignsHeroProgressBar";

type DesignsHeroFooterProps = {
  className?: string;
  onBack?: () => void;
  onNext?: () => void;
  /** Screen 13 (3:4064) omits the Next button. */
  showBack?: boolean;
  showNext?: boolean;
  fillPercent?: number;
  /** Label for the last step's button (default "Finish"). */
  finishLabel?: string;
  /** True while Finish (the last step's `onNext`) is persisting the design. */
  finishing?: boolean;
  /** The proposal screen's slate look: a thin rule for the bar, gold Back, blue Save. */
  slate?: boolean;
};

/**
 * Progress bar (1278px max) aligned with 81px inset; optional Next CTA.
 */
export function DesignsHeroFooter({
  className,
  onBack,
  onNext,
  fillPercent = 10,
  finishLabel = "Finish",
  showBack = false,
  showNext = false,
  finishing = false,
  slate = false,
}: DesignsHeroFooterProps) {
  return (
    <div
      className={`relative z-10 mt-auto w-full pb-8 sm:pb-2 ${className ?? ""}`}
    >
      <div className="mx-auto w-full max-w-[1446px] px-4 sm:px-8 lg:px-[81px]">
        {slate ? <div className="h-px w-full bg-white/20" /> : <DesignsHeroProgressBar fillPercent={fillPercent} />}
        {(showBack || showNext) && (
          <div className="mt-2 flex items-center justify-between gap-4">
            <div>
              {showBack && (
                <button
                  type="button"
                  onClick={onBack}
                  className={`inline-flex min-h-12 min-w-[157px] items-center justify-center gap-[14px] rounded-xl font-source-sans text-[18px] font-semibold uppercase leading-6 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:brightness-95 ${
                    slate ? "bg-[linear-gradient(135deg,#E0B356_0%,#B8862E_100%)] text-white" : "bg-design-next text-black"
                  }`}
                >
                  <Icon
                    name="ArrowRight"
                    className="size-6 rotate-180 transform"
                  />
                  Back
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={onNext}
              disabled={fillPercent === 100 && finishing}
              className={`inline-flex min-h-12 min-w-[157px] items-center justify-center gap-[14px] rounded-xl font-source-sans text-[18px] font-semibold uppercase leading-6 shadow-[0px_0px_40px_0px_rgba(140,140,140,0.3)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70 ${fillPercent === 100 ? (slate ? "text-white bg-[linear-gradient(135deg,#1E9BEF_0%,#0B6FC4_100%)]" : "text-white bg-design-accent-cyan") : "text-black bg-design-next"} ${
                showNext ? "" : "invisible pointer-events-none"
              }`}
            >
              {fillPercent === 100 ? (finishing ? "Saving…" : finishLabel) : "Next"}
              <Icon
                name="ArrowRight"
                className={`size-6 ${fillPercent === 100 ? "text-white" : "text-black"}`}
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
