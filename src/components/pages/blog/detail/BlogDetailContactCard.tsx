import Icon from "@/components/ui/Icons";
import type { BlogDetailContact } from "@/utils/constant";

type Props = {
  contact: BlogDetailContact;
};

export function BlogDetailContactCard({ contact }: Props) {
  return (
    <div className="blog-detail-gradient-card flex flex-col gap-[15.986px] rounded-[14px] px-[25.043px] pb-[25.043px] pt-[25.043px]">
      <h2 className="font-source-sans text-[16px] font-bold leading-normal tracking-[-0.3125px] text-blog-detail-grad-text">
        {contact.heading}
      </h2>
      <div className="flex flex-col gap-[8px]">
        <p className="font-source-sans text-[14px] font-bold leading-normal tracking-[-0.1504px] text-blog-detail-grad-text">
          {contact.name}
        </p>
        {contact.role ? (
          <p className="font-source-sans text-[14px] font-normal leading-normal tracking-[-0.1504px] text-blog-detail-grad-text">
            {contact.role}
          </p>
        ) : null}
        {contact.phone ? (
          <a
            href={`tel:${contact.phone.replace(/\s/g, "")}`}
            className="font-source-sans text-[14px] font-semibold leading-normal tracking-[-0.1504px] text-blog-detail-accent"
          >
            {contact.phone}
          </a>
        ) : null}
        {contact.emailHref ? (
          <a
            href={contact.emailHref}
            className="inline-flex items-center gap-[8px] font-source-sans text-[14px] font-semibold leading-normal tracking-[-0.1504px] text-blog-detail-accent"
          >
            <Icon name="Mail" className="size-[15.986px] shrink-0" />
            {contact.emailLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
