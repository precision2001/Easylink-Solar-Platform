"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Shows a plain-text email body with its links clickable.
 *
 * Handles the ways links come through in plain-text email:
 * - "Register for Training<https://…>" (Outlook): the words before become the link
 * - "Register for Training [https://…]" (HTML converted to text): the same
 * - "<https://…>", bare "https://…" and "www.…" addresses
 * - email addresses and "<mailto:…>" become mail links
 *
 * Only http(s) and mailto links are made; everything opens in a new tab.
 */

const BLUE = "#1976D2";
const MAX_LABEL = 70;

// Order matters: wrapped forms first, then bare addresses, then emails.
const TOKEN =
  /<((?:https?:\/\/|mailto:)[^\s<>]+)>|\[((?:https?:\/\/|mailto:)[^\s\]]+)\]|((?:https?:\/\/|www\.)[^\s<>"'\]]+)|([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

function hrefOf(raw: string): string | null {
  const u = raw.startsWith("www.") ? `https://${raw}` : raw;
  try {
    const p = new URL(u);
    if (p.protocol === "http:" || p.protocol === "https:" || p.protocol === "mailto:") return p.href;
  } catch {
    /* not a link */
  }
  return null;
}

function shortName(href: string): string {
  try {
    const u = new URL(href);
    if (u.protocol === "mailto:") return decodeURIComponent(u.pathname);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

/** Trailing punctuation usually ends the sentence, not the link. */
function trimTail(url: string): [string, string] {
  let end = url.length;
  while (end > 0 && /[.,;:!?)'"]/.test(url[end - 1])) {
    if (url[end - 1] === ")" && url.slice(0, end - 1).includes("(")) break;
    end--;
  }
  return [url.slice(0, end), url.slice(end)];
}

function A({ href, children, chip }: { href: string; children: ReactNode; chip?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer nofollow"
      title={href}
      className={chip ? "mx-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-px align-baseline text-[12px] font-semibold no-underline hover:underline" : "font-medium underline decoration-1 underline-offset-2 hover:opacity-80"}
      style={chip ? { color: BLUE, background: "#E3F0FC", wordBreak: "break-all" } : { color: BLUE, wordBreak: "break-word" }}
    >
      {children}
      {chip ? <span aria-hidden>↗</span> : null}
    </a>
  );
}

function linkLine(line: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let cursor = 0;
  let n = 0;
  for (const m of line.matchAll(TOKEN)) {
    const at = m.index ?? 0;
    let before = line.slice(cursor, at);
    const wrapped = m[1] ?? m[2];
    if (wrapped) {
      const href = hrefOf(wrapped);
      if (!href) continue;
      // Words just before "<url>" or " [url]" are the link's own text.
      const label = before.trimEnd();
      const lead = label.match(/^\s*/)?.[0] ?? "";
      const words = label.slice(lead.length);
      if (words && words.length <= MAX_LABEL && !/[.!?:]\s/.test(words)) {
        out.push(<Fragment key={`${key}-${n++}`}>{lead}</Fragment>);
        out.push(<A key={`${key}-${n++}`} href={href}>{words}</A>);
      } else {
        out.push(<Fragment key={`${key}-${n++}`}>{before}</Fragment>);
        out.push(<A key={`${key}-${n++}`} href={href} chip>{shortName(href)}</A>);
      }
      before = "";
      cursor = at + m[0].length;
      continue;
    }
    if (m[3]) {
      const [url, tail] = trimTail(m[3]);
      const href = hrefOf(url);
      if (!href) continue;
      out.push(<Fragment key={`${key}-${n++}`}>{before}</Fragment>);
      out.push(<A key={`${key}-${n++}`} href={href}>{url.length > 60 ? `${url.slice(0, 57)}…` : url}</A>);
      if (tail) out.push(<Fragment key={`${key}-${n++}`}>{tail}</Fragment>);
      cursor = at + m[0].length;
      continue;
    }
    if (m[4]) {
      out.push(<Fragment key={`${key}-${n++}`}>{before}</Fragment>);
      out.push(<A key={`${key}-${n++}`} href={`mailto:${m[4]}`}>{m[4]}</A>);
      cursor = at + m[0].length;
    }
  }
  out.push(<Fragment key={`${key}-end`}>{line.slice(cursor)}</Fragment>);
  return out;
}

export function LinkedText({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {linkLine(line, String(i))}
          {i < lines.length - 1 ? "\n" : null}
        </Fragment>
      ))}
    </>
  );
}
