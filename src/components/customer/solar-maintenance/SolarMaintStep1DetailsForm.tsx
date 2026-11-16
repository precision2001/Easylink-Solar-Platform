"use client";

import { useRouter } from "next/navigation";
import { SolarMaintDateField } from "@/components/customer/solar-maintenance/SolarMaintDateField";
import { SolarMaintFieldBlock } from "@/components/customer/solar-maintenance/SolarMaintFieldBlock";
import { SolarMaintFormField } from "@/components/customer/solar-maintenance/SolarMaintFormField";
import { SolarMaintenanceStepper } from "@/components/customer/solar-maintenance/SolarMaintenanceStepper";
import {
  mergeSolarMaintenanceContract,
  markSolarMaintenanceDraftSaved,
  selectSolarMaintenanceContract,
  setSolarMaintenanceStep,
} from "@/lib/store/solarMaintenanceContractSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { SOLAR_MAINTENANCE_CONTRACT } from "@/utils/constant";
import type { SolarMaintenanceEquipmentId } from "@/lib/store/solarMaintenanceContractSlice";

export function SolarMaintStep1DetailsForm() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { details } = useAppSelector(selectSolarMaintenanceContract);
  const copy = SOLAR_MAINTENANCE_CONTRACT;

  const patchEquipment = (
    id: SolarMaintenanceEquipmentId,
    patch: Partial<(typeof details.equipment)[typeof id]>,
  ) => {
    dispatch(
      mergeSolarMaintenanceContract({
        details: { equipment: { [id]: patch } },
      }),
    );
  };

  return (
    <>
      <SolarMaintenanceStepper currentStepId={1} />

      <div className="mt-6 flex flex-col gap-[7px]">
        <h1
          id="solar-maint-title"
          className="font-inter text-[30px] font-bold leading-9 tracking-[0.42px] text-sm-heading"
        >
          {copy.pageTitle}
        </h1>
        <p className="font-inter text-sm leading-5 tracking-[-0.154px] text-sm-muted">
          {copy.pageSubtitle}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-x-8 gap-y-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <SolarMaintFieldBlock label={copy.agreementDetailsLabel}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SolarMaintFormField
                placeholder={copy.placeholders.companyName}
                value={details.companyName}
                onChange={(e) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      details: { companyName: e.target.value },
                    }),
                  )
                }
                autoComplete="organization"
              />
              <SolarMaintDateField
                isoValue={details.agreementDateIso}
                onIsoChange={(iso) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      details: { agreementDateIso: iso },
                    }),
                  )
                }
                ariaLabel="Agreement date"
              />
            </div>
          </SolarMaintFieldBlock>

          <SolarMaintFieldBlock label={copy.labels.contractNumber}>
            <SolarMaintFormField
              placeholder={copy.placeholders.contractNumber}
              value={details.contractNumber}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    details: { contractNumber: e.target.value },
                  }),
                )
              }
            />
          </SolarMaintFieldBlock>

          <div className="flex flex-col gap-3">
            <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-heading">
              {copy.labels.equipmentCovered}
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {copy.equipmentColumnHeaders.map((h) => (
                <p
                  key={h}
                  className="font-inter text-xs font-medium leading-4 text-sm-muted"
                >
                  {h}
                </p>
              ))}
            </div>
            {copy.equipmentRows.map((row) => {
              const rowData = details.equipment[row.id];
              return (
                <div
                  key={row.id}
                  className="grid grid-cols-2 gap-3 sm:grid-cols-4"
                >
                  <SolarMaintFormField readOnly value={row.typeLabel} />
                  <SolarMaintFormField
                    placeholder={copy.placeholders.equipmentSize}
                    value={rowData.size}
                    onChange={(e) =>
                      patchEquipment(row.id, { size: e.target.value })
                    }
                  />
                  <SolarMaintFormField
                    placeholder={copy.placeholders.equipmentQty}
                    value={rowData.qty}
                    onChange={(e) =>
                      patchEquipment(row.id, { qty: e.target.value })
                    }
                    inputMode="numeric"
                  />
                  <SolarMaintDateField
                    isoValue={rowData.installedIso}
                    onIsoChange={(iso) =>
                      patchEquipment(row.id, { installedIso: iso })
                    }
                    ariaLabel={`${row.typeLabel} installed date`}
                  />
                </div>
              );
            })}
          </div>

          <SolarMaintFieldBlock label={copy.labels.installationLocation}>
            <SolarMaintFormField
              placeholder={copy.placeholders.installationAddress}
              value={details.installationAddress}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    details: { installationAddress: e.target.value },
                  }),
                )
              }
            />
          </SolarMaintFieldBlock>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <SolarMaintFieldBlock label={copy.labels.client}>
            <SolarMaintFormField
              placeholder={copy.placeholders.clientName}
              value={details.clientName}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    details: { clientName: e.target.value },
                  }),
                )
              }
              autoComplete="name"
            />
          </SolarMaintFieldBlock>

          <SolarMaintFieldBlock label={copy.labels.abn}>
            <SolarMaintFormField
              placeholder={copy.placeholders.abn}
              value={details.abn}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    details: { abn: e.target.value },
                  }),
                )
              }
            />
          </SolarMaintFieldBlock>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SolarMaintFieldBlock label={copy.labels.date}>
              <SolarMaintDateField
                isoValue={details.clientDateIso}
                onIsoChange={(iso) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      details: { clientDateIso: iso },
                    }),
                  )
                }
                ariaLabel="Client primary date"
              />
            </SolarMaintFieldBlock>
            <SolarMaintFieldBlock label={copy.labels.date}>
              <SolarMaintDateField
                isoValue={details.secondClientDateIso}
                onIsoChange={(iso) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      details: { secondClientDateIso: iso },
                    }),
                  )
                }
                ariaLabel="Client secondary date"
              />
            </SolarMaintFieldBlock>
          </div>

          <SolarMaintFieldBlock label={copy.labels.companyNameRight}>
            <SolarMaintFormField
              placeholder={copy.placeholders.clientCompanyName}
              value={details.clientCompany}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    details: { clientCompany: e.target.value },
                  }),
                )
              }
            />
          </SolarMaintFieldBlock>
        </div>
      </div>

      <footer className="mt-8 flex flex-col gap-3 border-t border-sm-panel-border pt-6 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={() => {
            dispatch(markSolarMaintenanceDraftSaved());
            router.push("/customers/dashboard");
          }}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-sm-panel-border px-5 font-inter text-sm font-medium leading-5 tracking-[-0.154px] text-sm-heading hover:bg-sm-input-bg"
        >
          {copy.buttons.saveDraft}
        </button>
        <button
          type="button"
          onClick={() => dispatch(setSolarMaintenanceStep(2))}
          className="inline-flex h-10 min-w-[117px] items-center justify-center rounded-full bg-sm-accent px-6 font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-button-label hover:brightness-110"
        >
          {copy.buttons.continue}
        </button>
      </footer>
    </>
  );
}
