import type { ModelClient } from "../ai/model.js";
import type { Backend, BackendAuth } from "../backend/client.js";
import type { RecordRef } from "../core/envelope.js";
import type { Store } from "../store/types.js";

/**
 * Finding a contact that isn't on file (spec 11.7). An installer asks to send
 * documents to "Origin" and there is no Origin on record: the AI searches the
 * web, but only ever picks an address that is published on the organisation's
 * own website, matches the business rule for that purpose, and is saved as an
 * UNVERIFIED partner. The first send to it waits for a staff OK; after that it
 * is trusted. The model never types an address: it can only choose from the
 * addresses found on the pages.
 */
export type SearchHit = { title: string; url: string; snippet: string };

export interface WebSearch {
  search(query: string, count: number): Promise<SearchHit[]>;
  /** Visible text of a page (scripts and styles removed), or null. */
  page(url: string): Promise<string | null>;
}

/** Brave Search API (set SEARCH_API_KEY). Any provider with the same two calls fits. */
export class BraveWebSearch implements WebSearch {
  constructor(private key = process.env.SEARCH_API_KEY ?? "", private fetchImpl: typeof fetch = fetch) {}
  async search(query: string, count: number) {
    if (!this.key) throw new Error("SEARCH_API_KEY is not set");
    const r = await this.fetchImpl(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${count}&country=au`, {
      headers: { Accept: "application/json", "X-Subscription-Token": this.key },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { web?: { results?: { title: string; url: string; description: string }[] } };
    return (j.web?.results ?? []).map((x) => ({ title: x.title, url: x.url, snippet: x.description }));
  }
  async page(url: string) {
    try {
      const r = await this.fetchImpl(url, { headers: { "User-Agent": "EasyLinkSolarBot/1.0 (+https://easylinksolar.com.au)" }, redirect: "follow" });
      if (!r.ok || !(r.headers.get("content-type") ?? "").includes("html")) return null;
      return htmlToText(await r.text());
    } catch {
      return null;
    }
  }
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<a [^>]*href=["']mailto:([^"'?]+)[^>]*>/gi, " $1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#64;|&commat;/g, "@")
    .replace(/\s+/g, " ")
    .slice(0, 80_000);
}

/** The business rule for one kind of organisation and purpose. Staff can override via the "config/contact_rules" record. */
export type ContactRule = {
  /** Search queries; {org} is replaced with the organisation's name. */
  queries: string[];
  /** Mailbox names that fit this purpose, best first. */
  prefer: string[];
  /** Mailbox names never used for this purpose. */
  avoid: string[];
  /** Below this the AI asks staff instead of saving the contact. */
  minConfidence: number;
  /** What the mailbox must be for, in words (given to the model). */
  purpose: string;
};

const AVOID_ALWAYS = ["noreply", "no-reply", "donotreply", "privacy", "media", "press", "careers", "jobs", "recruitment", "investor", "webmaster", "abuse", "unsubscribe"];

export const DEFAULT_CONTACT_RULES: Record<string, ContactRule> = {
  retailer: {
    queries: ["{org} solar installation documents email", "{org} solar meter reconfiguration email", "{org} embedded generation solar contact email"],
    prefer: ["solar", "solarconnections", "meter", "metering", "generation", "embeddedgeneration", "connections", "newconnections", "feedin", "service", "customerservice", "enquiries"],
    avoid: [...AVOID_ALWAYS, "complaints", "hardship", "accounts", "billing"],
    minConfidence: 0.8,
    purpose: "receiving solar installation documents from an installer (proof of completion, electrical safety certificate) so the retailer can arrange the meter change and solar feed-in",
  },
  dnsp: {
    queries: ["{org} solar connection application email", "{org} embedded generation connection contact", "{org} electrical safety certificate submission email"],
    prefer: ["connections", "generation", "embeddedgeneration", "solar", "metering", "networkconnections", "customerservice"],
    avoid: [...AVOID_ALWAYS, "faults", "emergency"],
    minConfidence: 0.8,
    purpose: "receiving solar connection and electrical safety documents from an installer",
  },
  supplier: {
    queries: ["{org} warranty claims email Australia", "{org} sales contact email Australia"],
    prefer: ["warranty", "service", "support", "sales", "orders", "info"],
    avoid: AVOID_ALWAYS,
    minConfidence: 0.75,
    purpose: "warranty claims and orders from a solar installer",
  },
  other: {
    queries: ["{org} contact email"],
    prefer: ["info", "enquiries", "contact", "admin", "service"],
    avoid: AVOID_ALWAYS,
    minConfidence: 0.85,
    purpose: "business correspondence from a solar installer",
  },
};

const FREE_MAIL = /@(gmail|googlemail|outlook|hotmail|live|yahoo|icloud|me|bigpond|optusnet|aol|proton|protonmail)\./i;

export type FoundContact = {
  partner: RecordRef;
  name: string;
  email: string;
  domain: string;
  verified: boolean;
  source: { url: string; query: string; why: string; foundAt: string } | null;
  confidence: number;
};
export type FindResult = { found: FoundContact } | { found: null; reason: string; candidates: { email: string; url: string }[] };

export class ContactFinder {
  constructor(private deps: { web: WebSearch; model: ModelClient; backend: Backend; store: Store; serviceToken: string; now?: () => Date }) {}

  private get svc(): BackendAuth {
    return { token: this.deps.serviceToken };
  }

  async find(org: string, kind: string, purposeHint = ""): Promise<FindResult> {
    const name = org.trim();
    // 1. Already on file (by name or alias): use it.
    const partners = ((await this.deps.backend.list("partner", { kind }, this.svc)).data ?? []) as Record<string, unknown>[];
    const known = partners.find((p) => matchesName(name, p));
    if (known?.id && (known.submissionEmail || known.email)) {
      return {
        found: {
          partner: { type: "partner", id: String(known.id) },
          name: String(known.name),
          email: String(known.submissionEmail ?? known.email),
          domain: String(known.domain ?? ""),
          verified: known.verified !== false,
          source: (known.source as FoundContact["source"]) ?? null,
          confidence: 1,
        },
      };
    }

    // 2. The business rule for this kind of organisation.
    const custom = (await this.deps.store.getRecord("config", "contact_rules"))?.rules as Record<string, ContactRule> | undefined;
    const rule = custom?.[kind] ?? DEFAULT_CONTACT_RULES[kind] ?? DEFAULT_CONTACT_RULES.other!;

    // 3. Search, and work out the organisation's own website.
    const hits: (SearchHit & { query: string })[] = [];
    for (const q of rule.queries.slice(0, 3)) {
      const query = q.replace("{org}", name);
      for (const h of await this.deps.web.search(query, 8).catch(() => [])) hits.push({ ...h, query });
    }
    const domain = officialDomain(name, hits);
    if (!domain) return { found: null, reason: `Couldn't identify ${name}'s official website.`, candidates: [] };

    // 4. Read pages on that website only and collect the addresses published there.
    const urls = Array.from(new Set([...hits.filter((h) => hostOf(h.url).endsWith(domain)).map((h) => h.url), `https://www.${domain}/contact`, `https://www.${domain}/contact-us`])).slice(0, 6);
    const candidates: { email: string; url: string; context: string; query: string }[] = [];
    for (const url of urls) {
      const text = await this.deps.web.page(url);
      if (!text) continue;
      for (const m of text.matchAll(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g)) {
        const email = m[0].toLowerCase().replace(/\.$/, "");
        const at = m.index ?? 0;
        if (!email.split("@")[1]!.endsWith(domain) || FREE_MAIL.test(email)) continue; // own domain only
        const local = email.split("@")[0]!;
        if (rule.avoid.some((a) => local.includes(a))) continue;
        if (candidates.some((c) => c.email === email)) continue;
        candidates.push({ email, url, context: text.slice(Math.max(0, at - 220), at + 120), query: hits.find((h) => h.url === url)?.query ?? "" });
      }
    }
    if (!candidates.length) return { found: null, reason: `No email address for this purpose is published on ${domain}.`, candidates: [] };

    // 5. The model picks ONE of the found addresses for the purpose (it cannot invent one).
    const turn = await this.deps.model.converse({
      tier: "fast",
      maxTokens: 300,
      system: `You choose which published email address of an Australian organisation should receive a message. Purpose: ${rule.purpose}.${purposeHint ? ` Context: ${purposeHint}.` : ""}
Prefer mailboxes like: ${rule.prefer.join(", ")}. Never choose personal staff addresses when a role mailbox fits.
Answer ONLY JSON {"index": <number from the list, or -1 if none fits>, "confidence": 0..1, "why": "<one sentence>"}.`,
      messages: [
        {
          role: "user",
          text: `Organisation: ${name} (${domain})\nCandidates:\n${candidates.map((c, i) => `${i}. ${c.email}\n   page: ${c.url}\n   text around it: "${c.context.replace(/\s+/g, " ").trim()}"`).join("\n")}`,
        },
      ],
    });
    const pick = parsePick(turn.text, candidates.length);
    const chosen = pick && pick.index >= 0 ? candidates.at(pick.index) : undefined;
    if (!chosen || !pick || pick.confidence < rule.minConfidence) {
      return { found: null, reason: `Not sure which ${name} address is right for this (best guess below the ${rule.minConfidence} rule).`, candidates: candidates.map((c) => ({ email: c.email, url: c.url })) };
    }

    // 6. Save as an unverified partner, with where it came from.
    const now = (this.deps.now?.() ?? new Date()).toISOString();
    const source = { url: chosen.url, query: chosen.query, why: pick.why, foundAt: now };
    const row = { name, kind, domain, submissionEmail: chosen.email, attach: kind === "retailer" || kind === "dnsp", verified: false, source, aliases: [] };
    const created = await this.deps.backend.create("partner", row, this.svc);
    if (!created.ok || !created.data) return { found: null, reason: "Couldn't save the contact.", candidates: [] };
    return { found: { partner: { type: "partner", id: String(created.data.id) }, name, email: chosen.email, domain, verified: false, source, confidence: pick.confidence } };
  }
}

export function matchesName(name: string, p: Record<string, unknown>): boolean {
  const n = norm(name);
  const pn = norm(String(p.name ?? ""));
  if (!pn) return false;
  return n === pn || n.includes(pn) || pn.includes(n) || ((p.aliases as string[] | undefined) ?? []).some((a) => norm(a) === n);
}
const norm = (s: string) => s.toLowerCase().replace(/\b(pty|ltd|limited|energy|australia|the)\b/g, "").replace(/[^a-z0-9]/g, "");

export function hostOf(u: string): string {
  try {
    return new URL(u).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

/**
 * The organisation's own website: the host most search results point to among
 * hosts whose name contains the organisation's name (e.g. Origin → originenergy.com.au).
 */
export function officialDomain(org: string, hits: SearchHit[]): string | null {
  const key = norm(org).slice(0, 8);
  const counts = new Map<string, number>();
  for (const h of hits) {
    const host = hostOf(h.url);
    if (!host || !key || !host.replace(/[^a-z0-9]/g, "").includes(key)) continue;
    const base = registrable(host);
    counts.set(base, (counts.get(base) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

/** example.com.au from www.shop.example.com.au; example.com from a.example.com. */
export function registrable(host: string): string {
  const parts = host.split(".");
  const two = ["com.au", "net.au", "org.au", "gov.au", "asn.au", "co.nz", "co.uk"];
  const last2 = parts.slice(-2).join(".");
  return two.includes(last2) ? parts.slice(-3).join(".") : last2;
}

function parsePick(text: string, n: number): { index: number; confidence: number; why: string } | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    const j = JSON.parse(m[0]) as { index?: number; confidence?: number; why?: string };
    const index = Number.isInteger(j.index) && (j.index as number) < n ? (j.index as number) : -1;
    return { index, confidence: Math.max(0, Math.min(1, Number(j.confidence ?? 0))), why: String(j.why ?? "").slice(0, 300) };
  } catch {
    return null;
  }
}

/** Scripted web for tests and local development. */
export class FakeWebSearch implements WebSearch {
  constructor(public results: Record<string, SearchHit[]> = {}, public pages: Record<string, string> = {}) {}
  searches: string[] = [];
  async search(query: string) {
    this.searches.push(query);
    return Object.entries(this.results).find(([k]) => query.toLowerCase().includes(k.toLowerCase()))?.[1] ?? [];
  }
  async page(url: string) {
    return this.pages[url] ?? null;
  }
}
