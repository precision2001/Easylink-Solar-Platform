"use client";

import { useRouter } from "next/navigation";
import { SolarMaintCheckboxTile } from "@/components/customer/solar-maintenance/SolarMaintCheckboxTile";
import { SolarMaintNativeSelect } from "@/components/customer/solar-maintenance/SolarMaintNativeSelect";
import {
  mergeSolarMaintenanceContract,
  markSolarMaintenanceDraftSaved,
  selectSolarMaintenanceContract,
  setSolarMaintenanceStep,
} from "@/lib/store/solarMaintenanceContractSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  SOLAR_MAINTENANCE_CONTRACT,
  SOLAR_MAINTENANCE_STEP2,
} from "@/utils/constant";

export function SolarMaintStep2Services() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { services } = useAppSelector(selectSolarMaintenanceContract);
  const s2 = SOLAR_MAINTENANCE_STEP2;
  const copy = SOLAR_MAINTENANCE_CONTRACT;

  const termOptions = s2.initialTermOptions.map((o) => ({
    value: o.value,
    label: o.label,
  }));
  const cleaningOptions = s2.cleaningOptions.map((o) => ({
    value: o.value,
    label: o.label,
  }));

  return (
    <>
      <div className="flex flex-col gap-[7px]">
        <h1 className="font-inter text-[30px] font-bold leading-9 tracking-[0.42px] text-white">
          {copy.pageTitle}
        </h1>
        <p className="font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-400">
          {s2.subtitle}
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-6">
        <div>
          <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
            {s2.contractTermLabel}
          </p>
          <p className="mt-2 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-400">
            {s2.initialTermSubLabel}
          </p>
          <div className="mt-2 max-w-[160px]">
            <SolarMaintNativeSelect
              ariaLabel={s2.initialTermSubLabel}
              value={services.initialTerm}
              onChange={(v) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    services: { initialTerm: v },
                  }),
                )
              }
              options={termOptions}
            />
          </div>
        </div>

        <div>
          <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
            {s2.scheduledVisitsLabel}
          </p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {s2.visitOptions.map((v) => (
              <SolarMaintCheckboxTile
                key={v.id}
                id={`visit-${v.id}`}
                label={v.label}
                checked={Boolean(services.visits[v.id])}
                onChange={(checked) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      services: { visits: { [v.id]: checked } },
                    }),
                  )
                }
              />
            ))}
          </div>
        </div>

        <div>
          <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
            {s2.cleaningLabel}
          </p>
          <div className="mt-3">
            <SolarMaintNativeSelect
              ariaLabel={s2.cleaningLabel}
              value={services.cleaning}
              onChange={(v) =>
                dispatch(
                  mergeSolarMaintenanceContract({ services: { cleaning: v } }),
                )
              }
              options={cleaningOptions}
            />
          </div>
        </div>

        <div>
          <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
            {s2.serviceNotesLabel}
          </p>
          <textarea
            rows={4}
            placeholder={s2.serviceNotesPlaceholder}
            value={services.serviceNotes}
            onChange={(e) =>
              dispatch(
                mergeSolarMaintenanceContract({
                  services: { serviceNotes: e.target.value },
                }),
              )
            }
            className="solar-maint-wizard-combobox-shadow mt-3 min-h-[98px] w-full resize-y rounded-lg border border-sm-wizard-surface-10 bg-sm-wizard-surface-5 px-3 py-2 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-200 outline-none placeholder:text-sm-wizard-slate-500 focus-visible:ring-2 focus-visible:ring-sm-wizard-nav-blue/35"
          />
        </div>
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-sm-wizard-header-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            dispatch(markSolarMaintenanceDraftSaved());
            router.push("/customers/dashboard");
          }}
          className="solar-maint-wizard-combobox-shadow inline-flex h-9 min-w-[119px] items-center justify-center rounded-full border border-sm-wizard-btn-ghost px-5 font-inter text-sm font-medium leading-5 tracking-[-0.154px] text-sm-wizard-slate-200 hover:bg-sm-wizard-surface-5"
        >
          {copy.buttons.saveDraft}
        </button>
        <button
          type="button"
          onClick={() => dispatch(setSolarMaintenanceStep(3))}
          className="solar-maint-wizard-combobox-shadow inline-flex h-9 min-w-[108px] items-center justify-center rounded-full bg-sm-wizard-nav-blue px-6 font-inter text-sm font-medium leading-5 tracking-[-0.154px] text-sm-button-label hover:brightness-110"
        >
          {copy.buttons.continue}
        </button>
      </footer>
    </>
  );
}
