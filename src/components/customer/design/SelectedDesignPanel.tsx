import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import type { SpecLine } from "./designConstants";
import { DesignMapPreviewImage } from "./DesignMapPreviewImage";
import { DesignSpecRow } from "./DesignSpecRow";
import Icon from "@/components/ui/Icons";

type Props = {
  title: string;
  lastUpdated: string;
  savingsLabel: string;
  statusLabel: string;
  statusApproved?: boolean;
  designSpecs: SpecLine[];
  performanceEstimates: SpecLine[];
  /** Saved map screenshot from the design builder; falls back to placeholder. */
  mapImageSrc?: string | null;
  /** Opens the proposal PDF in a viewer tab. */
  onViewPdf?: () => void;
  onDownloadPdf?: () => void;
  /** True while a PDF is being generated; disables both actions. */
  pdfBusy?: boolean;
};

export function SelectedDesignPanel({
  title,
  lastUpdated,
  savingsLabel,
  statusLabel,
  statusApproved = false,
  designSpecs,
  performanceEstimates,
  mapImageSrc,
  onViewPdf,
  onDownloadPdf,
  pdfBusy = false,
}: Props) {
  return (
    <section className="customer-card-bg customer-cream-card-border overflow-hidden rounded-[10px] border">
      <CustomerSectionHeader
        variant="dark"
        title={title}
        icon={
          <Icon
            name="MyDesignSun"
            className="size-4 shrink-0 text-white"
            aria-hidden
          />
        }
        action={
          <span
            className={`rounded-full px-2.5 py-0.5 font-dm-sans text-[9px] font-bold uppercase leading-[13.5px] tracking-[0.3px] ${
              statusApproved
                ? "bg-mint-soft text-success"
                : "bg-cream-225 text-warm-gray"
            }`}
          >
            {statusLabel}
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-3 lg:gap-6">
        <div className="flex min-w-0 flex-col gap-2">
          <div className="relative overflow-hidden rounded-[10px] border border-amber-soft">
            <div className="relative aspect-[377/198] w-full overflow-hidden">
              <DesignMapPreviewImage src={mapImageSrc} />
            </div>
            <div className="absolute bottom-3 right-3 flex flex-wrap justify-end gap-1.5">
              <button
                type="button"
                onClick={onViewPdf}
                disabled={pdfBusy || !onViewPdf}
                className="inline-flex h-7 items-center gap-1.5 rounded-md border customer-cream-card-border bg-cream-50/90 px-2.5 font-dm-sans text-[10px] font-semibold text-warm-ink shadow-sm backdrop-blur-sm disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                <Icon
                  name="Eye"
                  className="size-4 shrink-0"
                  aria-hidden
                />
                View PDF
              </button>
              <button
                type="button"
                onClick={onDownloadPdf}
                disabled={pdfBusy || !onDownloadPdf}
                className="inline-flex h-7 items-center gap-1.5 rounded-md bg-navy-800 px-2.5 font-dm-sans text-[10px] font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                <Icon
                  name="Download"
                  className="size-4 shrink-0 text-white"
                  aria-hidden
                />
                {pdfBusy ? "Preparing…" : "Download PDF"}
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 pl-1">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]">
              <span className="inline-flex items-center gap-1.5 font-dm-sans font-medium leading-[15px] customer-text-subtle">
                <span
                  className="size-2 shrink-0 rounded-full bg-leaf"
                  aria-hidden
                />
                {statusLabel}
              </span>
              <span
                className="font-dm-sans font-normal leading-[15px] customer-text-muted"
                style={{ fontVariationSettings: "'opsz' 9" }}
              >
                Last updated: {lastUpdated}
              </span>
            </div>
            <p
              className="bg-clip-text font-dm-sans text-[10px] font-semibold leading-[15px] text-transparent"
              style={{
                fontVariationSettings: "'opsz' 14",
                backgroundImage:
                  "linear-gradient(172deg, rgb(32, 148, 243) 8.57%, rgb(23, 207, 207) 91.43%)",
              }}
            >
              {savingsLabel}
            </p>
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="font-inter text-[11px] font-semibold leading-[16.5px] customer-text-on-dark">
            Design Specifications
          </h3>
          <div className="mt-2 flex flex-col">
            {designSpecs.map((row) => (
              <DesignSpecRow
                key={row.label}
                label={row.label}
                value={row.value}
                variant="dark"
              />
            ))}
          </div>
        </div>

        <div className="min-w-0">
          <h3 className="font-inter text-[11px] font-semibold leading-[16.5px] customer-text-on-dark">
            Performance Estimates
          </h3>
          <div className="mt-2 flex flex-col">
            {performanceEstimates.map((row) => (
              <DesignSpecRow
                key={row.label}
                label={row.label}
                value={row.value}
                variant="dark"
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
