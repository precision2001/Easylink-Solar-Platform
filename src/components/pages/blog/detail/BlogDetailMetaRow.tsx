import Icon from "@/components/ui/Icons";

type Props = {
  categoryLabel: string;
  dateLabel: string;
  readTimeLabel: string;
};

export function BlogDetailMetaRow({
  categoryLabel,
  dateLabel,
  readTimeLabel,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-[15.986px]">
      <span className="inline-flex h-[26.091px] items-center rounded-full border border-blog-detail-category-border bg-blog-detail-category-bg px-[11.99px] font-source-sans text-[12px] font-bold uppercase leading-normal tracking-[0.6px] text-blog-detail-category-text">
        {categoryLabel}
      </span>
      <span className="inline-flex items-center gap-[5.99px] font-source-sans text-[12px] font-medium leading-normal text-blog-detail-meta">
        <Icon name="Calendar" className="size-[13.988px] shrink-0" />
        {dateLabel}
      </span>
      {readTimeLabel ? (
        <span className="inline-flex items-center gap-[5.99px] font-source-sans text-[12px] font-medium leading-normal text-blog-detail-meta">
          <Icon name="Clock" className="size-[13.988px] shrink-0" />
          {readTimeLabel}
        </span>
      ) : null}
    </div>
  );
}
