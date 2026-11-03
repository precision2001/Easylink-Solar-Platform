import { describe, expect, it } from "vitest";

import { buildShareLinks } from "./share-links";

describe("buildShareLinks", () => {
  it("encodes the page URL and title into each share link", () => {
    const links = buildShareLinks("https://easylinksolar.com.au/blog/a b/details", "Solar & storage");
    const encodedUrl = encodeURIComponent("https://easylinksolar.com.au/blog/a b/details");
    expect(links.facebook).toBe(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`);
    expect(links.linkedin).toBe(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`);
    expect(links.x).toBe(`https://x.com/intent/tweet?url=${encodedUrl}&text=Solar%20%26%20storage`);
    expect(links.email).toBe(`mailto:?subject=Solar%20%26%20storage&body=${encodedUrl}`);
  });
});
