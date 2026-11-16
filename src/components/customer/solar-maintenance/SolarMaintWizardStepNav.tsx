"use client";

import Icon from "@/components/ui/Icons";
import { SOLAR_MAINTENANCE_CONTRACT, SOLAR_MAINTENANCE_STEP3 } from "@/utils/constant";

type Props = {
  currentStep: 2 | 3;
  onBack: () => void;
  onClose: () => void;
};

export function SolarMaintWizardStepNav({
  currentStep,
  onBack,
  onClose,
}: Props) {
  const steps = SOLAR_MAINTENANCE_CONTRACT.steps;
  const nav = SOLAR_MAINTENANCE_STEP3.wizardNav;

  return (
    <header className="flex h-[65px] shrink-0 items-center gap-4 border-b border-sm-wizard-header-border px-8">
      <button
        type="button"
        onClick={onBack}
        className="flex size-5 shrink-0 items-center justify-center rounded text-sm-wizard-slate-200 hover:text-white"
        aria-label={nav.backAria}
      >
        <Icon name="ChevronLeft" className="size-5" />
      </button>

      <nav
        className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-1 font-inter text-sm leading-5 tracking-[-0.154px]"
        aria-label="Wizard steps"
      >
        {steps.map((s, idx) => {
          const n = s.id;
          const done = n < currentStep;
          const active = n === currentStep;
          return (
            <div key={s.id} className="flex items-center gap-2">
              {idx > 0 ? (
                <span
                  className="px-0.5 font-normal text-sm-wizard-slate-600"
                  aria-hidden
                >
                  ›
                </span>
              ) : null}
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-full ${
                    done || active
                      ? "bg-sm-wizard-nav-blue"
                      : "bg-sm-wizard-step-idle-pill"
                  }`}
                >
                  {done ? (
                    <Icon name="Check" className="size-3.5 text-white" />
                  ) : (
                    <span
                      className={`text-center text-xs font-semibold leading-4 ${
                        active ? "text-white" : "text-sm-wizard-step-idle-num"
                      }`}
                    >
                      {n}
                    </span>
                  )}
                </span>
                <span
                  className={
                    active
                      ? "font-semibold text-sm-wizard-nav-blue-soft"
                      : done
                        ? "font-normal text-sm-wizard-slate-200"
                        : "font-normal text-sm-wizard-slate-500"
                  }
                >
                  {s.label}
                </span>
              </div>
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onClose}
        className="flex size-5 shrink-0 items-center justify-center rounded text-sm-wizard-slate-200 hover:text-white"
        aria-label={nav.closeAria}
      >
        <Icon name="X" className="size-5" />
      </button>
    </header>
  );
}
