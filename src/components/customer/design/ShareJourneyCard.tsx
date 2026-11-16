"use client";

import { useState } from "react";
import { CustomerSectionHeader } from "@/components/customer/CustomerSectionHeader";
import Icon, { IconType } from "@/components/ui/Icons";
import { socialShareUrl } from "@/lib/customers/referrals";

const SOCIAL = [
  {
    label: "Facebook",
    bg: "bg-blue-tint",
    color: "text-facebook",
    icon: "BlogDetailShareFacebook" as IconType,
  },
  {
    label: "Twitter",
    bg: "bg-sky-wash",
    color: "text-twitter",
    icon: "BlogDetailShareX" as IconType,
  },
  {
    label: "LinkedIn",
    bg: "bg-blue-tint",
    color: "text-linkedin",
    icon: "BlogDetailShareLinkedin" as IconType,
  },
  {
    label: "Email",
    bg: "bg-blush",
    color: "text-google-red",
    icon: "Mail" as IconType,
  },
] as const;

type Props = {
  /** Null until the share link has been created. */
  shareUrl: string | null;
  loading?: boolean;
  /** Message used by the social intents. */
  shareMessage?: string;
};

const NETWORKS: Record<
  (typeof SOCIAL)[number]["label"],
  "facebook" | "twitter" | "linkedin" | "email"
> = {
  Facebook: "facebook",
  Twitter: "twitter",
  LinkedIn: "linkedin",
  Email: "email",
};

export function ShareJourneyCard({
  shareUrl,
  loading = false,
  shareMessage = "I just designed my solar system with EasyLink — take a look at my savings.",
}: Props) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const share = (label: (typeof SOCIAL)[number]["label"]) => {
    if (!shareUrl) return;
    const target = socialShareUrl(NETWORKS[label], shareUrl, shareMessage);
    // Email is a mailto: — hand it to the OS handler rather than opening a tab
    // that would be left blank.
    if (NETWORKS[label] === "email") {
      window.location.assign(target);
      return;
    }
    window.open(target, "_blank", "noopener,noreferrer,width=640,height=640");
  };

  return (
    <section className="customer-panel-bg customer-panel-border-dark flex flex-col overflow-hidden rounded-[10px] border">
      <CustomerSectionHeader
        variant="dark"
        title="Share Your Solar Journey"
        icon={
          <Icon
            name="BlogDetailShareLink"
            className="size-4 shrink-0 text-white"
            aria-hidden
          />
        }
      />
      <div className="flex flex-col gap-4 p-4">
        <p
          className="font-dm-sans text-xs font-normal leading-[18px] customer-text-subtle"
          style={{ fontVariationSettings: "'opsz' 9" }}
        >
          Tell friends and family about your solar upgrade and help them save
          too!
        </p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {SOCIAL.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => share(s.label)}
              disabled={!shareUrl}
              aria-label={`Share on ${s.label}`}
              className={`flex h-10 items-center justify-center gap-2 rounded-lg ${s.bg} ${s.color} disabled:cursor-not-allowed disabled:opacity-50`}
            >
              <Icon
                name={s.icon}
                className={`size-4 shrink-0 ${s.color}`}
                aria-hidden
              />
              <span
                className="font-dm-sans text-[10px] font-semibold leading-[15px]"
                style={{ fontVariationSettings: "'opsz' 14" }}
              >
                {s.label}
              </span>
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
          <div className="min-h-[34px] flex-1 overflow-hidden rounded-lg border customer-cream-card-border bg-cream-50 px-3 py-2">
            <p
              className="truncate font-dm-sans text-[11px] font-normal leading-[16.5px] text-warm-gray"
              style={{ fontVariationSettings: "'opsz' 9" }}
            >
              {loading
                ? "Preparing your link…"
                : (shareUrl ?? "Share link unavailable")}
            </p>
          </div>
          <button
            type="button"
            onClick={copy}
            disabled={!shareUrl}
            className="inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 rounded-lg bg-navy-800 px-4 font-dm-sans text-[11px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60 sm:min-w-[102px]"
            style={{ fontVariationSettings: "'opsz' 14" }}
          >
            <Icon
              name="Copy"
              className="size-4 shrink-0 text-white"
              aria-hidden
            />
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>
      </div>
    </section>
  );
}
