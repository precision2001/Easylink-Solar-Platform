import { describe, expect, it } from "vitest";
import {
  partnerEmbedUrl,
  partnerIframeSnippet,
  partnerLinkSnippet,
  partnerPageUrl,
} from "@/lib/installers/partner-embed";

/**
 * These snippets are pasted into an installer's own website, so the two
 * things worth testing directly are that the URL is absolute (a relative one
 * would resolve against their domain and 404) and that installer-supplied
 * text cannot break out of the markup.
 */

describe("partner URLs", () => {
  it("is absolute, because it is pasted onto another domain", () => {
    expect(partnerPageUrl("solarman", "https://easylinksolar.com.au")).toBe(
      "https://easylinksolar.com.au/p/solarman",
    );
    expect(partnerEmbedUrl("solarman", "https://easylinksolar.com.au")).toBe(
      "https://easylinksolar.com.au/p/solarman/embed",
    );
  });

  it("uses whatever domain the dashboard is served from", () => {
    // This is what makes the snippet correct after deployment without any
    // config change: the caller passes window.location.origin, so localhost
    // during development and the real domain in production.
    expect(partnerPageUrl("solarman", "http://localhost:3000")).toBe(
      "http://localhost:3000/p/solarman",
    );
    expect(partnerPageUrl("solarman", "https://easylinksolar.com.au")).toBe(
      "https://easylinksolar.com.au/p/solarman",
    );
    expect(partnerEmbedUrl("solarman", "https://easylinksolar.com.au")).toBe(
      "https://easylinksolar.com.au/p/solarman/embed",
    );
  });

  it("falls back to the production origin when none is known", () => {
    expect(partnerPageUrl("solarman")).toBe(
      "https://easylinksolar.com.au/p/solarman",
    );
    expect(partnerPageUrl("solarman", "")).toBe(
      "https://easylinksolar.com.au/p/solarman",
    );
  });

  it("does not double the slash on an origin with a trailing one", () => {
    expect(partnerPageUrl("solarman", "https://example.com/")).toBe(
      "https://example.com/p/solarman",
    );
  });

  it("encodes a key that would otherwise change the path", () => {
    expect(partnerPageUrl("a/b", "https://x.test")).toBe(
      "https://x.test/p/a%2Fb",
    );
  });
});

describe("snippets", () => {
  it("builds a link an installer can paste as-is", () => {
    expect(partnerLinkSnippet("solarman", "Design your system", "https://x.test")).toBe(
      '<a href="https://x.test/p/solarman" target="_blank" rel="noopener">Design your system</a>',
    );
  });

  it("escapes a label that would break out of the markup", () => {
    const snippet = partnerLinkSnippet(
      "solarman",
      '"><script>alert(1)</script>',
      "https://x.test",
    );
    expect(snippet).not.toContain("<script>");
    expect(snippet).toContain("&quot;&gt;&lt;script&gt;");
  });

  it("escapes an ampersand so the label renders as typed", () => {
    expect(partnerLinkSnippet("k", "Solar & battery", "https://x.test")).toContain(
      "Solar &amp; battery",
    );
  });

  it("points the iframe at the embed route, which carries frame-ancestors", () => {
    const snippet = partnerIframeSnippet("solarman", "https://x.test");
    expect(snippet).toContain('src="https://x.test/p/solarman/embed"');
    expect(snippet).toContain("width:100%");
  });
});
