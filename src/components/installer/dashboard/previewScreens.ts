/**
 * Installer screens that are built from the designs but not yet connected to
 * the installer's own data. Everything they show — people, jobs, payouts,
 * counts — is example content, so the layout labels them (InstallerChrome).
 *
 * When a screen is wired to real data, delete its line here and the notice
 * disappears. Keep this list honest: a live screen marked "sample" erodes
 * trust as much as a sample screen passed off as live.
 */
const GENERIC =
  "This screen isn’t connected to your account yet. The people, jobs and figures on it are examples, not your data.";

export const PREVIEW_SCREENS: Record<string, string> = {
  "/installers/dashboard/ai-assistant": GENERIC,
  "/installers/dashboard/sales": GENERIC,
  "/installers/dashboard/overview":
    "This overview isn’t connected to your account yet. The jobs, figures and charts on it are examples, not your data.",
  "/installers/dashboard/solar-designer":
    "The installer solar designer isn’t connected to your customers yet. The customer, roof and quote shown are examples — don’t send them to customers.",
  "/installers/dashboard/job-offers": GENERIC,
  "/installers/dashboard/handover-packs": GENERIC,
  "/installers/dashboard/payouts":
    "Payouts and RCTIs aren’t connected yet. The amounts and statements here are examples — check real payments with EasyLink.",
  "/installers/dashboard/service-areas": GENERIC,
  "/installers/dashboard/crew": GENERIC,
  "/installers/dashboard/documents": GENERIC,
  "/installers/dashboard/reviews": GENERIC,
  "/installers/dashboard/plan":
    "Membership details aren’t connected yet. The plan, usage and prices shown are examples.",
  "/installers/dashboard/inbox": GENERIC,
  "/installers/dashboard/campaigns": GENERIC,
  "/installers/dashboard/ai-agents": GENERIC,
  "/installers/dashboard/pricing-engine":
    "Installer access to the EasyLink price book isn’t connected yet, so quotes here use sample prices. Don’t send them to customers.",
  "/installers/dashboard/my-rates":
    "Installer access to the EasyLink price book isn’t connected yet, so trade prices here are samples and your rates aren’t saved.",
};

/** The notice for this route, or undefined for a screen that shows real data. */
export function previewNoticeFor(pathname: string | null): string | undefined {
  if (!pathname) return undefined;
  const hit = Object.keys(PREVIEW_SCREENS)
    .filter((route) => pathname === route || pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  return hit ? PREVIEW_SCREENS[hit] : undefined;
}
