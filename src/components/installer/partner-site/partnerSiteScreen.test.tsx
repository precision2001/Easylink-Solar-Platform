import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PartnerSiteCard } from "@/components/installer/partner-site/PartnerSiteCard";
import type { InstallerPartnerSite } from "@/lib/installers/partner-sites";

/**
 * The card is what an installer actually came to this screen for — the page
 * address and the snippet to paste — so it is rendered here rather than only
 * typechecked. A screen that compiles but renders the wrong branch looks
 * identical to a passing build.
 */

const site: InstallerPartnerSite = {
  id: "11111111-1111-4111-8111-111111111111",
  key: "solarman",
  companyName: "Solarman Australia",
  websiteUrl: "https://solarmanaustralia.com.au",
  allowedOrigins: ["https://solarmanaustralia.com.au"],
  brandPrimary: "#1E88E5",
  brandOnPrimary: "#FFFFFF",
  brandAccent: null,
  logoUrl: null,
  whiteLabel: false,
  active: true,
  createdAt: "2026-11-19T00:00:00.000Z",
  updatedAt: "2026-11-19T00:00:00.000Z",
};

const render = (s: InstallerPartnerSite) =>
  renderToStaticMarkup(
    <PartnerSiteCard site={s} onEdit={() => {}} onToggleActive={() => {}} busy={false} />,
  );

describe("partner site card", () => {
  it("shows the page address the installer links to", () => {
    const html = render(site);
    expect(html).toContain("Solarman Australia");
    // Absolute, because it is pasted onto another domain.
    expect(html).toContain("https://easylinksolar.com.au/p/solarman");
  });

  it("shows the allowed address, which decides whether the embed loads", () => {
    expect(render(site)).toContain("solarmanaustralia.com.au");
  });

  it("reports Powered by EasyLink rather than offering it as a switch", () => {
    const html = render(site);
    expect(html).toContain("Powered by EasyLink");
    expect(html).not.toContain('type="checkbox"');
  });

  it("says white label when the plan is white labelled", () => {
    const html = render({ ...site, whiteLabel: true });
    expect(html).toContain("White label");
    expect(html).not.toContain("Powered by EasyLink");
  });

  it("warns that a switched-off site does not load", () => {
    const html = render({ ...site, active: false });
    expect(html).toContain("Switched off");
    expect(html).toContain("will not load");
  });

  it("offers the link snippet first, since it works everywhere", () => {
    // The snippet sits in a readonly textarea, so React escapes its quotes
    // and angle brackets — it is shown as code, not parsed as markup.
    const html = render(site);
    expect(html).toContain("Design your solar system");
    expect(html).toContain("rel=&quot;noopener&quot;");
    expect(html).toContain("&lt;a href=");
  });
});
