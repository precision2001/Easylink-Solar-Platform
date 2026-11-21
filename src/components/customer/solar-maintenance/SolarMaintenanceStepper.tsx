"use client";

import { Fragment } from "react";
import { SOLAR_MAINTENANCE_CONTRACT } from "@/utils/constant";

type Props = {
  currentStepId?: 1 | 2 | 3;
};

export function SolarMaintenanceStepper({ currentStepId = 1 }: Props) {
  const steps = SOLAR_MAINTENANCE_CONTRACT.steps;

  return (
    <div
      className="flex flex-wrap items-center gap-x-2 gap-y-2 font-inter text-sm leading-5 tracking-[-0.154px]"
      aria-label="Agreement steps"
    >
      {steps.map((step, index) => {
        const active = step.id === currentStepId;
        return (
          <Fragment key={step.id}>
            {index > 0 ? (
              <span className="text-sm-muted" aria-hidden>
                ›
              </span>
            ) : null}
            <div className="flex items-center gap-2">
              <span
                className={`flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-center text-xs leading-4 ${
                  active
                    ? "bg-sm-accent font-semibold text-sm-button-label"
                    : "bg-sm-step-idle-bg font-normal text-sm-muted"
                }`}
              >
                {step.id}
              </span>
              <span
                className={
                  active
                    ? "font-semibold text-sm-accent"
                    : "font-normal text-sm-muted"
                }
              >
                {step.label}
              </span>
            </div>
          </Fragment>
        );
      })}
    </div>
  );
}
