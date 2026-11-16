import Icon from "@/components/ui/Icons";

type Props = {
  name: string;
  sizeLabel: string;
  url: string;
};

export function ProfileDocumentRow({ name, sizeLabel, url }: Props) {
  return (
    <div className="flex items-center gap-2">
      <Icon
        name="FileText"
        className="size-3.5 shrink-0 text-warm-gray"
        aria-hidden
      />
      <p
        className="min-w-0 flex-1 truncate font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-ink"
        style={{ fontVariationSettings: "'opsz' 9" }}
      >
        {name}
      </p>
      <span
        className="shrink-0 font-dm-sans text-[9px] font-normal leading-[13.5px] text-warm-gray"
        style={{ fontVariationSettings: "'opsz' 9" }}
      >
        {sizeLabel}
      </span>
      <a
        href={url}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Download ${name}`}
        className="flex size-5 shrink-0 items-center justify-center rounded hover:bg-black/5"
      >
        <Icon
          name="Download"
          className="size-3 shrink-0 text-warm-gray mb-1"
          aria-hidden
        />
      </a>
    </div>
  );
}
