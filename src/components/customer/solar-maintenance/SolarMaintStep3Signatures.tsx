"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import Icon from "@/components/ui/Icons";
import { SolarMaintDateField } from "@/components/customer/solar-maintenance/SolarMaintDateField";
import type { SolarMaintenanceExhibitsState } from "@/lib/store/solarMaintenanceContractSlice";
import {
  mergeSolarMaintenanceContract,
  markSolarMaintenanceDraftSaved,
  resetSolarMaintenanceContract,
  selectSolarMaintenanceContract,
} from "@/lib/store/solarMaintenanceContractSlice";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import {
  SOLAR_MAINTENANCE_CONTRACT,
  SOLAR_MAINTENANCE_STEP3,
} from "@/utils/constant";

const inputClass =
  "solar-maint-wizard-combobox-shadow h-9 w-full rounded-lg border border-sm-wizard-surface-10 bg-sm-wizard-surface-5 px-3 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-100 outline-none placeholder:text-sm-wizard-slate-500 focus-visible:ring-2 focus-visible:ring-sm-wizard-nav-blue/35";

export function SolarMaintStep3Signatures() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { signatures: sig } = useAppSelector(selectSolarMaintenanceContract);
  const s3 = SOLAR_MAINTENANCE_STEP3;
  const copy = SOLAR_MAINTENANCE_CONTRACT;

  const provFileRef = useRef<HTMLInputElement>(null);
  const clientFileRef = useRef<HTMLInputElement>(null);
  const exhibitFileRef = useRef<HTMLInputElement>(null);

  const patchExhibit = (
    id: keyof SolarMaintenanceExhibitsState,
    checked: boolean,
  ) => {
    dispatch(
      mergeSolarMaintenanceContract({
        signatures: { exhibits: { [id]: checked } },
      }),
    );
  };

  return (
    <>
      <div className="flex flex-col gap-[7px]">
        <h1 className="font-inter text-[30px] font-bold leading-9 tracking-[0.42px] text-white">
          {copy.pageTitle}
        </h1>
        <p className="font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-400">
          {s3.subtitle}
        </p>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <div>
            <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
              {s3.providerNameLabel}
            </p>
            <input
              type="text"
              placeholder={s3.providerNamePlaceholder}
              value={sig.providerName}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    signatures: { providerName: e.target.value },
                  }),
                )
              }
              className={`${inputClass} mt-3`}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
                {s3.providerSignatureLabel}
              </p>
              <input
                type="text"
                placeholder={s3.providerSignaturePlaceholder}
                value={sig.providerSignature}
                onChange={(e) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      signatures: { providerSignature: e.target.value },
                    }),
                  )
                }
                className={`${inputClass} mt-3 font-serif italic`}
              />
              <input
                ref={provFileRef}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  dispatch(
                    mergeSolarMaintenanceContract({
                      signatures: {
                        providerSignatureFileName: f?.name ?? null,
                      },
                    }),
                  );
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => provFileRef.current?.click()}
                className="mt-3 flex h-[30px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-sm-wizard-surface-10 bg-transparent text-xs leading-4 text-sm-wizard-slate-300 hover:bg-sm-wizard-surface-5"
              >
                <Icon name="Attach" className="size-3.5 text-sm-wizard-slate-300" />
                {sig.providerSignatureFileName ?? s3.uploadSignatureHint}
              </button>
            </div>
            <div>
              <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
                {s3.providerDateLabel}
              </p>
              <div className="mt-3">
                <SolarMaintDateField
                  isoValue={sig.providerDateIso}
                  onIsoChange={(iso) =>
                    dispatch(
                      mergeSolarMaintenanceContract({
                        signatures: { providerDateIso: iso },
                      }),
                    )
                  }
                  ariaLabel={s3.providerDateLabel}
                  className="h-9 border-sm-wizard-surface-10 bg-sm-wizard-surface-5 text-sm-wizard-slate-100 placeholder:text-sm-wizard-slate-500"
                />
              </div>
            </div>
          </div>

          <div>
            <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
              {s3.clientSignatureLabel}
            </p>
            <input
              type="text"
              placeholder={s3.providerSignaturePlaceholder}
              value={sig.clientSignature}
              onChange={(e) =>
                dispatch(
                  mergeSolarMaintenanceContract({
                    signatures: { clientSignature: e.target.value },
                  }),
                )
              }
              className={`${inputClass} mt-3 font-serif italic`}
            />
            <input
              ref={clientFileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                dispatch(
                  mergeSolarMaintenanceContract({
                    signatures: {
                      clientSignatureFileName: f?.name ?? null,
                    },
                  }),
                );
                e.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => clientFileRef.current?.click()}
              className="mt-3 flex h-[30px] w-full items-center justify-center gap-2 rounded-lg border border-dashed border-sm-wizard-surface-10 bg-transparent text-xs leading-4 text-sm-wizard-slate-300 hover:bg-sm-wizard-surface-5"
            >
              <Icon name="Attach" className="size-3.5 text-sm-wizard-slate-300" />
              {sig.clientSignatureFileName ?? s3.uploadSignatureHint}
            </button>
          </div>

          <div className="max-w-md">
            <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
              {s3.clientDateLabel}
            </p>
            <div className="mt-3">
              <SolarMaintDateField
                isoValue={sig.clientDateIso}
                onIsoChange={(iso) =>
                  dispatch(
                    mergeSolarMaintenanceContract({
                      signatures: { clientDateIso: iso },
                    }),
                  )
                }
                ariaLabel={s3.clientDateLabel}
                className="h-9 border-sm-wizard-surface-10 bg-sm-wizard-surface-5 text-sm-wizard-slate-100 placeholder:text-sm-wizard-slate-500"
              />
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <p className="font-inter text-sm font-semibold leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
            {s3.exhibitsLabel}
          </p>
          <div className="rounded-[14px] border-2 border-dashed border-sm-wizard-dropzone-border bg-sm-wizard-dropzone-bg p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex cursor-pointer items-center gap-2 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-200">
                <input
                  type="checkbox"
                  checked={sig.exhibits.uploadFiles}
                  onChange={(e) =>
                    patchExhibit("uploadFiles", e.target.checked)
                  }
                  className="size-4 rounded border border-sm-wizard-checkbox-blue accent-(--color-sm-wizard-nav-blue)"
                />
                {s3.exhibitUploadRowLabel}
              </label>
              <input
                ref={exhibitFileRef}
                type="file"
                multiple
                className="sr-only"
                onChange={(e) => {
                  const files = e.target.files;
                  if (!files?.length) return;
                  const next = [
                    ...sig.exhibitUploadFileNames,
                    ...Array.from(files).map((f) => f.name),
                  ];
                  dispatch(
                    mergeSolarMaintenanceContract({
                      signatures: { exhibitUploadFileNames: next },
                    }),
                  );
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                onClick={() => exhibitFileRef.current?.click()}
                className="solar-maint-wizard-combobox-shadow inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full bg-sm-wizard-nav-blue px-4 font-inter text-xs font-medium leading-4 text-sm-button-label"
              >
                <Icon name="Attach" className="size-4 text-white" />
                {s3.exhibitUploadButton}
              </button>
            </div>
            {sig.exhibitUploadFileNames.length > 0 ? (
              <ul className="mt-2 space-y-1 font-inter text-xs text-sm-wizard-slate-300">
                {sig.exhibitUploadFileNames.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 flex flex-col gap-3 border-t border-sm-wizard-dropzone-border pt-4">
              {s3.exhibitChecklist.map((row) => (
                <label
                  key={row.id}
                  className="flex cursor-pointer items-center gap-2 font-inter text-sm leading-5 tracking-[-0.154px] text-sm-wizard-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={Boolean(sig.exhibits[row.id])}
                    onChange={(e) => patchExhibit(row.id, e.target.checked)}
                    className="size-4 rounded border border-sm-wizard-checkbox-blue accent-(--color-sm-wizard-nav-blue)"
                  />
                  {row.label}
                </label>
              ))}
            </div>
          </div>
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
          {s3.buttons.saveDraft}
        </button>
        <button
          type="button"
          onClick={() => {
            dispatch(markSolarMaintenanceDraftSaved());
            dispatch(resetSolarMaintenanceContract());
            router.push("/customers/dashboard");
          }}
          className="solar-maint-wizard-combobox-shadow inline-flex h-9 min-w-[170px] items-center justify-center rounded-full bg-sm-wizard-nav-blue px-6 font-inter text-sm font-medium leading-5 tracking-[-0.154px] text-sm-button-label hover:brightness-110"
        >
          {s3.buttons.generateContract}
        </button>
      </footer>
    </>
  );
}
