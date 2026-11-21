/**
 * The snippets an installer copies onto their own website.
 *
 * Two ways to put the designer on their site, because installers differ in
 * what their site builder allows:
 *
 * - a plain link, for a navigation item or a button — no script, works on
 *   every platform including ones that strip embeds;
 * - an iframe, for a section inside an existing page.
 *
 * The iframe points at /p/<key>/embed, which is served with a
 * `frame-ancestors` header naming the installer's own origins, so a third
 * party copying the snippet onto a different domain gets a blocked frame
 * rather than a working designer.
 */

/** Kept out of the markup entirely if the key is not URL-safe. */
function encodeKey(key: string): string {
  return encodeURIComponent(key.trim());
}

/**
 * Absolute base for the snippet. The installer pastes this into a different
 * site, so a relative path would resolve against *their* domain — it has to
 * be EasyLink's absolute origin.
 */
export function partnerEmbedOrigin(pageOrigin?: string | null): string {
  const raw = (pageOrigin ?? "").trim();
  if (raw) return raw.replace(/\/+$/, "");
  return "https://easylinksolar.com.au";
}

export function partnerPageUrl(key: string, pageOrigin?: string | null): string {
  return `${partnerEmbedOrigin(pageOrigin)}/p/${encodeKey(key)}`;
}

export function partnerEmbedUrl(key: string, pageOrigin?: string | null): string {
  return `${partnerPageUrl(key, pageOrigin)}/embed`;
}

/** A link or button an installer drops into their navigation. */
export function partnerLinkSnippet(
  key: string,
  label: string,
  pageOrigin?: string | null,
): string {
  // The label is the installer's own text going into HTML they will paste, so
  // the characters that would end the attribute or open a tag are escaped.
  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
  return `<a href="${partnerPageUrl(key, pageOrigin)}" target="_blank" rel="noopener">${safeLabel}</a>`;
}

/** The section form — an iframe that grows with its content. */
export function partnerIframeSnippet(
  key: string,
  pageOrigin?: string | null,
): string {
  return [
    `<iframe`,
    `  src="${partnerEmbedUrl(key, pageOrigin)}"`,
    `  title="Design your solar system"`,
    `  loading="lazy"`,
    `  style="width:100%;border:0;min-height:620px"`,
    `></iframe>`,
  ].join("\n");
}
