"use client";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Icon from "../../ui/Icons";

type Lang = "en-uk" | "en-au";

const LANGUAGES: { value: Lang; label: string; flag: string }[] = [
  { value: "en-uk", label: "English", flag: "/images/home/uk-flag.png" },
  { value: "en-au", label: "Australia", flag: "/images/home/au-flag.png" },
];

export type DesignTopBarCenter = {
  title: string;
  subtitle: string;
};

type DesignTopBarProps = {
  /** Step counter + title/subtitle shown between the logo and controls — kept
   * outside the scrollable step content so it never needs scrolling to see. */
  center?: DesignTopBarCenter;
};

export function DesignTopBar({ center }: DesignTopBarProps = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const [language, setLanguage] = useState<Lang>("en-uk");
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const selected = LANGUAGES.find((l) => l.value === language) ?? LANGUAGES[0];
  const isDesignPage = pathname === "/customers/design";

  return (
    <div
      className={`flex w-[calc(100%-32px)] sm:w-[min(1284px,calc(100%-148px))] mx-auto ${
        center ? "items-center justify-between gap-4" : "items-start justify-between"
      }`}
    >
      <div className={center ? "flex shrink-0 items-center gap-3" : "contents"}>
        <Image
          src={isDesignPage ? "/images/home/solar-design-logo.png" : "/images/home/solar-maintenance-logo.png"}
          alt="EasyLink Solar"
          width={isDesignPage ? 66 : 80}
          height={isDesignPage ? 66 : 80}
          className="size-14 cursor-pointer opacity-90 sm:size-auto"
          onClick={() => router.push("/")}
        />
      </div>

      {center ? (
        <p className="relative min-w-0 flex-1 text-center font-source-sans text-[14px] leading-[20px] text-white sm:text-[16px] sm:leading-[22px]">
          <span className="font-bold text-white">{center.title}</span>
          <span className="hidden text-white/60 sm:inline"> — {center.subtitle}</span>
        </p>
      ) : null}

      <div className="flex h-full shrink-0 items-center gap-[16px] z-20">
        <button
          type="button"
          aria-label="Help"
          className="grid size-[20px] place-items-center text-gold-2"
        >
          <Icon name="CircleQuestion" />
        </button>

        <div ref={dropdownRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-haspopup="listbox"
            aria-expanded={open}
            className="flex h-[40px] items-center gap-[4px] rounded-full bg-white pl-[12px] pr-[10px]"
          >
            <Image src={selected.flag} alt="UK" width={18} height={18} />
            <span className="font-source-sans text-[14px] leading-[20px] tracking-[-0.1504px] text-muted-label whitespace-nowrap">
              {selected.label}
            </span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`text-muted-label transition-transform ${open ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {open && (
            <div
              role="listbox"
              aria-label="Language"
              className="absolute right-0 top-[calc(100%+4px)] z-30 min-w-full overflow-hidden rounded-[12px] bg-white py-[4px] shadow-[0_4px_16px_rgba(0,0,0,0.12)]"
            >
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.value}
                  type="button"
                  role="option"
                  aria-selected={lang.value === language}
                  onClick={() => {
                    setLanguage(lang.value);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-[8px] px-[12px] py-[8px] text-left transition-colors hover:bg-gray-3 ${
                    lang.value === language ? "bg-gray-4" : ""
                  }`}
                >
                  <Image src={lang.flag} alt="UK" width={18} height={18} />
                  <span className="font-source-sans text-[14px] leading-[20px] tracking-[-0.1504px] text-muted-label whitespace-nowrap">
                    {lang.label}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
