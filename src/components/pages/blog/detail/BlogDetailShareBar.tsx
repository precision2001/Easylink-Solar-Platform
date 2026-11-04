"use client";

import { useState, useSyncExternalStore } from "react";

import Icon from "@/components/ui/Icons";
import type { IconType } from "@/components/ui/Icons";
import { buildShareLinks } from "@/lib/public/share-links";

const subscribeNoop = () => () => {};
const currentHref = () => window.location.href;
const serverHref = () => "";

type Props = {
  label: string;
  title: string;
};

const ICON_CLASS =
  "inline-flex size-[33.97px] items-center justify-center rounded-full bg-blog-detail-share-bg text-blog-detail-share-icon transition-opacity hover:opacity-80";

export function BlogDetailShareBar({ label, title }: Props) {
  // The page URL is only known in the browser; links render once it is.
  const url = useSyncExternalStore(subscribeNoop, currentHref, serverHref);
  const [copied, setCopied] = useState(false);

  const links = url ? buildShareLinks(url, title) : null;
  const shareItems: { label: string; href: string; icon: IconType }[] = links
    ? [
        { label: "Share on LinkedIn", href: links.linkedin, icon: "BlogDetailShareLinkedin" },
        { label: "Share on X", href: links.x, icon: "BlogDetailShareX" },
        { label: "Share on Facebook", href: links.facebook, icon: "BlogDetailShareFacebook" },
        { label: "Share by email", href: links.email, icon: "Mail" },
      ]
    : [];

  async function copyLink() {
    const href = url || window.location.href;
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", href);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-[19.98px]">
      <p className="font-source-sans text-[14px] font-normal leading-normal tracking-[-0.1504px] text-blog-detail-body">
        {label}
      </p>
      <ul className="flex flex-wrap items-center gap-[12px]">
        <li>
          <button
            type="button"
            onClick={copyLink}
            aria-label={copied ? "Link copied" : "Copy link"}
            title={copied ? "Link copied" : "Copy link"}
            className={ICON_CLASS}
          >
            <Icon name="BlogDetailShareLink" className="size-[17.984px]" />
          </button>
        </li>
        {shareItems.map((item) => (
          <li key={item.label}>
            <a
              href={item.href}
              aria-label={item.label}
              title={item.label}
              target={item.href.startsWith("mailto:") ? undefined : "_blank"}
              rel={item.href.startsWith("mailto:") ? undefined : "noopener noreferrer"}
              className={ICON_CLASS}
            >
              <Icon name={item.icon} className="size-[17.984px]" />
            </a>
          </li>
        ))}
      </ul>
      <span aria-live="polite" className="sr-only">
        {copied ? "Link copied to clipboard" : ""}
      </span>
    </div>
  );
}
