import { formatOptionPrice, type DesignOptions } from "@/lib/customers/design-options";
import { selectedDesignOption } from "@/lib/customers/dashboard-summary";
import type { ProjectJourney } from "@/lib/project-journey";
import { balanceCents, formatCents, formatQuoteDate, isDepositDue, isOpen, quoteVersionLabel, sortQuotes, type Quote } from "@/lib/quotes";

/**
 * What the customer should do next, and what's worth telling them, worked out
 * from their real design and project stage. Nothing here is invented: when the
 * data isn't there the message says what happens next instead of a number.
 */

export type NextStep = {
  title: string;
  points: string[];
  primary: { label: string; href: string };
  secondary?: { label: string; href: string };
};

export type Insight = { icon: "sun" | "dollar" | "battery" | "leaf" | "calendar"; text: string };

export function nextBestStep(input: {
  journey: ProjectJourney | null;
  options: DesignOptions | null;
  /** The customer's quotes, when loaded. A quote waiting on them comes first. */
  quotes?: Quote[] | null;
  now?: Date;
}): NextStep {
  const { journey, options } = input;
  const design = selectedDesignOption(options);
  const quoteStep = quoteNextStep(input.quotes ?? [], input.now ?? new Date());
  if (quoteStep) return quoteStep;

  if (options && !options.hasCompletedDesignWizard && !design) {
    return {
      title: "Design your system in about five minutes.",
      points: [
        "Find your roof, tell us your bill, and EasyLink AI sizes solar and battery for your home.",
        "You'll see your savings and price straight away. Nothing to pay.",
      ],
      primary: { label: "Start my design", href: "/designs" },
    };
  }

  if (!design) {
    return {
      title: "Choose the system that suits you.",
      points: [
        "Compare your designs side by side: size, savings and price.",
        "You can change your mind any time before it's approved.",
      ],
      primary: { label: "Compare my designs", href: "#designs" },
    };
  }

  const current = journey
    ? journey.milestones.find((m) => m.key === journey.currentMilestoneKey) ?? journey.milestones[journey.currentIndex]
    : null;
  const upcoming = journey?.milestones.filter((m) => m.state === "upcoming").slice(0, 2) ?? [];

  if (!journey || !current) {
    return {
      title: `${design.title} is your selected system. Next, an EasyLink advisor will call you.`,
      points: [
        "They'll confirm your roof, switchboard and any extras, then book a site visit.",
        options?.locked ? "Your design is approved and locked in." : "You can still fine-tune your design before it's approved.",
      ],
      primary: { label: options?.locked ? "View my design" : "Fine-tune my design", href: "/customers/design" },
      secondary: { label: "Message us", href: "/customers/messages" },
    };
  }

  const done = journey.percentComplete >= 100 || journey.milestones.every((m) => m.state === "completed");
  if (done) {
    return {
      title: "Your system is live. Enjoy the sunshine.",
      points: [
        "Keep panels clean and check your inverter app now and then to catch problems early.",
        "A maintenance plan keeps output up and warranties in good standing.",
      ],
      primary: { label: "See maintenance plans", href: "/customers/solar-maintenance" },
      secondary: { label: "Download my documents", href: "/customers/profile" },
    };
  }

  return {
    title: `You're at “${current.label}”.`,
    points: [
      current.hint?.trim() || "We'll let you know as soon as this step is done.",
      ...upcoming.map((m, i) => `${i === 0 ? "Then" : "After that"}: ${m.label}.`),
    ],
    primary: { label: "Track my project", href: "/customers/project" },
    secondary: { label: "Message us", href: "/customers/messages" },
  };
}

/** An accepted quote with the deposit unpaid, else a sent quote still open. */
function quoteNextStep(quotes: Quote[], now: Date): NextStep | null {
  const sorted = sortQuotes(quotes);
  const due = sorted.find((q) => isDepositDue(q));
  if (due) {
    return {
      title: "Pay your deposit to lock in your install.",
      points: [
        `You accepted ${quoteVersionLabel(due)}: ${due.title}. The deposit is ${formatCents(due.depositCents)}.`,
        `The balance of ${formatCents(balanceCents(due))} is due when your system is installed.`,
      ],
      primary: { label: "Pay my deposit", href: `/customers/design?quote=${encodeURIComponent(due.id)}#quotes` },
      secondary: { label: "Message us", href: "/customers/messages" },
    };
  }
  const open = sorted.filter((q) => isOpen(q, now));
  if (!open.length) return null;
  const latest = open[0];
  return {
    title: "Your quote is ready.",
    points: [
      `${quoteVersionLabel(latest)}: ${latest.title}, ${formatCents(latest.totalCents)} inc GST. Valid until ${formatQuoteDate(latest.validUntil)}.`,
      open.length > 1
        ? `You have ${open.length} quotes to compare side by side before you choose.`
        : `A ${formatCents(latest.depositCents)} deposit locks in your install once you accept.`,
    ],
    primary: { label: open.length > 1 ? "Compare my quotes" : "View my quote", href: "/customers/design#quotes" },
    secondary: { label: "Message us", href: "/customers/messages" },
  };
}

const positive = (v: number | null | undefined): v is number => typeof v === "number" && Number.isFinite(v) && v > 0;

export function insightsFor(options: DesignOptions | null): Insight[] {
  const design = selectedDesignOption(options);
  if (!design) return [];
  const out: Insight[] = [];
  const price = positive(design.priceAfterStc) ? design.priceAfterStc : positive(design.price) ? design.price : null;

  if (price && positive(design.estimatedSavings)) {
    const years = price / design.estimatedSavings;
    if (years > 0 && years < 30) {
      out.push({
        icon: "dollar",
        text: `At ${formatOptionPrice(design.estimatedSavings)} a year in savings, ${design.title} pays for itself in about ${years.toFixed(1)} years.`,
      });
    }
  }
  if (positive(design.annualOutputKwh) && positive(design.kw)) {
    const perKw = design.annualOutputKwh / design.kw;
    out.push({
      icon: "sun",
      text: `Your roof is modelled to produce ${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(design.annualOutputKwh)} kWh a year — about ${new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(perKw)} kWh for every kW of panels.`,
    });
  }
  if (positive(design.priceAfterStc) && positive(design.price) && design.price > design.priceAfterStc) {
    out.push({
      icon: "leaf",
      text: `Federal small-scale technology certificates take ${formatOptionPrice(design.price - design.priceAfterStc)} off your price; it's already applied.`,
    });
  }
  if (options && options.options.length > 1) {
    const better = options.options
      .filter((o) => o.key !== design.key && positive(o.estimatedSavings) && o.estimatedSavings > (design.estimatedSavings ?? 0))
      .sort((a, b) => b.estimatedSavings - a.estimatedSavings)[0];
    if (better && !options.locked) {
      out.push({
        icon: "battery",
        text: `${better.title} would save about ${formatOptionPrice(better.estimatedSavings - (design.estimatedSavings ?? 0))} more a year. Worth a look before you commit.`,
      });
    }
  }
  out.push({
    icon: "calendar",
    text: "We say “near-zero bill”, never “no bill”: your retailer's daily supply charge still applies.",
  });
  return out.slice(0, 4);
}
