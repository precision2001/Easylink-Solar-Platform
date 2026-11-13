import Icon from "@/components/ui/Icons";
import { AboutUsTimelineBadges } from "@/components/pages/about-us/AboutUsTimelineBadges";
import { ABOUT_US_PAGE } from "@/utils/constant";

type TimelineEvent = (typeof ABOUT_US_PAGE.timeline.events)[number];

type Props = {
  event: TimelineEvent;
};

export function AboutUsTimelineCard({ event }: Props) {
  return (
    <article className="about-us-timeline-card flex h-full w-full max-w-[572px] flex-col overflow-hidden rounded-[40px] px-10 py-7 sm:px-10">
      {"title" in event && event.title ? (
        <h3 className="mb-5 font-source-sans text-[26px] font-bold leading-normal tracking-[-0.1504px] text-about-timeline-text">
          {event.title}
        </h3>
      ) : null}

      {"sections" in event && event.sections
        ? event.sections.map((section, index) => (
            <div key={index} className={index > 0 ? "mt-4" : undefined}>
              {"subtitle" in section && section.subtitle ? (
                <p className="mb-3 font-source-sans text-[22px] font-medium leading-normal tracking-[-0.1504px] text-about-timeline-text">
                  {section.subtitle}
                </p>
              ) : null}
              <AboutUsTimelineBulletList bullets={section.bullets} />
            </div>
          ))
        : "bullets" in event ? (
          <AboutUsTimelineBulletList bullets={event.bullets} />
        ) : null}

      {"badges" in event && event.badges ? (
        <div className="mt-auto pt-8">
          <AboutUsTimelineBadges badges={event.badges} />
        </div>
      ) : null}
    </article>
  );
}

function AboutUsTimelineBulletList({
  bullets,
}: {
  bullets: ReadonlyArray<{ text: string; highlight?: boolean }>;
}) {
  return (
    <ul className="flex flex-col gap-[17px]">
      {bullets.map((bullet) => (
        <li key={bullet.text} className="flex items-start gap-[6px]">
          <Icon
            name="AboutUsStar"
            className="mt-0.5 size-6 shrink-0 text-gold"
            aria-hidden
          />
          <p
            className={`font-source-sans text-xl leading-normal tracking-[-0.1504px] text-about-timeline-text ${
              bullet.highlight ? "font-medium" : "font-medium"
            }`}
          >
            {bullet.text}
          </p>
        </li>
      ))}
    </ul>
  );
}
