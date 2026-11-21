"use client";

import { useRouter } from "next/navigation";
import { SolarMaintStep1DetailsForm } from "@/components/customer/solar-maintenance/SolarMaintStep1DetailsForm";
import { SolarMaintStep2Services } from "@/components/customer/solar-maintenance/SolarMaintStep2Services";
import { SolarMaintStep3Signatures } from "@/components/customer/solar-maintenance/SolarMaintStep3Signatures";
import { SolarMaintWizardStepNav } from "@/components/customer/solar-maintenance/SolarMaintWizardStepNav";
import {
  selectSolarMaintenanceContract,
  setSolarMaintenanceStep,
} from "@/lib/store/solarMaintenanceContractSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";

export function SolarMaintenanceWizard() {
  const { step } = useAppSelector(selectSolarMaintenanceContract);
  const dispatch = useAppDispatch();
  const router = useRouter();

  const shellClass =
    step >= 2
      ? "solar-maint-wizard-card-v2 solar-maint-card-shadow w-full max-w-[1024px] overflow-hidden p-0"
      : "solar-maint-card-shadow w-full max-w-[1024px] rounded-[18px] border border-sm-panel-border bg-sm-card-surface p-8 backdrop-blur-xs";

  return (
    <section
      className={shellClass}
      aria-labelledby={step === 1 ? "solar-maint-title" : undefined}
    >
      {step >= 2 ? (
        <SolarMaintWizardStepNav
          currentStep={step as 2 | 3}
          onBack={() =>
            dispatch(setSolarMaintenanceStep(step === 3 ? 2 : 1))
          }
          onClose={() => router.push("/customers/dashboard")}
        />
      ) : null}

      <div className={step >= 2 ? "px-8 pb-8 pt-[42px]" : ""}>
        {step === 1 ? <SolarMaintStep1DetailsForm /> : null}
        {step === 2 ? <SolarMaintStep2Services /> : null}
        {step === 3 ? <SolarMaintStep3Signatures /> : null}
      </div>
    </section>
  );
}
