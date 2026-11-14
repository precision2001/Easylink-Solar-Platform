import { ABOUT_US_PAGE } from "@/utils/constant";

/**
 * Mission film in a 2.39:1 cinemascope frame (day -> night on battery ->
 * charge and drive into the sunset; rendered by
 * scripts/video/about-mission-cinema.py). The two cards are compact yellow
 * glass panels tucked under the frame's bottom corners so the film stays the
 * focus; on phones they stack below it.
 */
export function AboutUsMissionSection() {
  return (
    <section className="relative w-full overflow-hidden bg-[#05070f] py-10 sm:py-14 lg:py-20">
      {/* soft glow behind the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto h-1/2 max-w-[1400px] rounded-full bg-[radial-gradient(ellipse_at_center,rgba(255,170,60,0.22),transparent_70%)] blur-3xl"
      />

      <div className="relative mx-auto w-full max-w-[1600px] px-4 sm:px-6 lg:px-10">
        <div className="relative aspect-[2.39/1] w-full overflow-hidden rounded-[18px] shadow-[0_40px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10 sm:rounded-[28px]">
          <video
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            autoPlay
            loop
            muted
            playsInline
            preload="metadata"
            poster={ABOUT_US_PAGE.mission.posterSrc}
            aria-label={ABOUT_US_PAGE.mission.videoAriaLabel}
          >
            <source src={ABOUT_US_PAGE.mission.vidoSrc} type="video/mp4" />
          </video>
        </div>

        <div className="relative z-1 mt-6 grid gap-5 md:grid-cols-2 lg:-mt-16 lg:flex lg:justify-between lg:px-10">
          {ABOUT_US_PAGE.mission.cards.map((card) => (
            <article
              key={card.title}
              className="w-full rounded-[28px] border border-white/40 bg-[linear-gradient(135deg,rgba(255,240,90,0.92),rgba(255,206,20,0.88))] px-7 py-6 shadow-[0_24px_50px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.6)] backdrop-blur-md lg:max-w-[440px]"
            >
              <h2 className="mb-3 font-source-sans text-[26px] font-semibold leading-tight tracking-[-0.4px] text-about-mission-card-title sm:text-[30px]">
                {card.title}
              </h2>
              <div className="flex flex-col gap-1.5 font-source-sans text-base font-normal leading-snug tracking-[-0.2px] text-about-mission-card-body sm:text-[17px]">
                {card.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
