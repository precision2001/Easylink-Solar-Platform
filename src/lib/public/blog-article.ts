/**
 * Rich article content for the blog journal redesign. Posts keep it in `content` (JSON);
 * everything here is parsed defensively so a hand-edited post can never break the page:
 * unknown or malformed blocks are dropped, and posts with no blocks fall back to `body`.
 */

export type ArticleKeyStat = { label: string; value: string; note: string; tone: "navy" | "card" };

export type ArticleBlock =
  | { type: "lead" | "p" | "h2" | "quote"; text: string }
  | { type: "steps"; title: string; highlight: number; highlightLabel: string; items: { label: string; value: number }[] }
  | { type: "compare"; title: string; aLabel: string; bLabel: string; note: string; single: boolean; rows: { label: string; a: number; b: number | null }[] }
  | { type: "checklist"; items: { title: string; text: string }[] }
  | { type: "cta"; title: string; text: string; label: string; href: string };

export type ArticleTiers = { title: string; rows: { label: string; pct: number }[] };
export type ArticleSource = { title: string; url: string };

export type BlogArticle = {
  keyStats: ArticleKeyStat[];
  blocks: ArticleBlock[];
  tiers: ArticleTiers | null;
  sources: ArticleSource[];
};

function rec(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function arr(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Only same-site paths and https links; anything else becomes the design page. */
export function safeHref(value: unknown, fallback = "/designs"): string {
  const href = str(value);
  if (!href) return fallback;
  if (href.startsWith("/") && !href.startsWith("//")) return href;
  if (href.startsWith("https://")) return href;
  return fallback;
}

function parseBlock(value: unknown): ArticleBlock | null {
  const raw = rec(value);
  if (!raw) return null;
  const type = raw.type;
  if (type === "lead" || type === "p" || type === "h2" || type === "quote") {
    const text = str(raw.text);
    return text ? { type, text } : null;
  }
  if (type === "steps") {
    const items = arr(raw.items).flatMap((i) => {
      const r = rec(i);
      const label = str(r?.label);
      const v = num(r?.value);
      return label && v !== null && v >= 0 ? [{ label, value: v }] : [];
    });
    if (items.length < 2) return null;
    const highlight = num(raw.highlight);
    return {
      type,
      title: str(raw.title) ?? "",
      highlight: highlight !== null && highlight >= 0 && highlight < items.length ? highlight : -1,
      highlightLabel: str(raw.highlightLabel) ?? "",
      items,
    };
  }
  if (type === "compare") {
    const single = raw.single === true;
    const rows = arr(raw.rows).flatMap((i) => {
      const r = rec(i);
      const label = str(r?.label);
      const a = num(r?.a);
      const b = single ? null : num(r?.b);
      if (!label || a === null || a < 0) return [];
      if (!single && (b === null || b < 0)) return [];
      return [{ label, a, b }];
    });
    if (rows.length === 0) return null;
    return {
      type,
      title: str(raw.title) ?? "",
      aLabel: str(raw.aLabel) ?? "",
      bLabel: str(raw.bLabel) ?? "",
      note: str(raw.note) ?? "",
      single,
      rows,
    };
  }
  if (type === "checklist") {
    const items = arr(raw.items).flatMap((i) => {
      const r = rec(i);
      const title = str(r?.title);
      const text = str(r?.text);
      return title && text ? [{ title, text }] : [];
    });
    return items.length ? { type, items } : null;
  }
  if (type === "cta") {
    const title = str(raw.title);
    const label = str(raw.label);
    if (!title || !label) return null;
    return { type, title, text: str(raw.text) ?? "", label, href: safeHref(raw.href) };
  }
  return null;
}

export function parseBlogArticle(content: unknown, fallbackBody: string[]): BlogArticle {
  const c = rec(content) ?? {};
  let blocks = arr(c.blocks).map(parseBlock).filter((b): b is ArticleBlock => b !== null);
  if (blocks.length === 0) {
    blocks = fallbackBody.map((text, i) => ({ type: i === 0 ? "lead" : "p", text }) as ArticleBlock);
  }

  const keyStats = arr(c.keyStats).flatMap((i) => {
    const r = rec(i);
    const label = str(r?.label);
    const value = str(r?.value);
    if (!label || !value) return [];
    return [{ label, value, note: str(r?.note) ?? "", tone: r?.tone === "navy" ? "navy" : "card" } as ArticleKeyStat];
  }).slice(0, 3);

  const tiersRaw = rec(c.tiers);
  const tierRows = arr(tiersRaw?.rows).flatMap((i) => {
    const r = rec(i);
    const label = str(r?.label);
    const pct = num(r?.pct);
    return label && pct !== null ? [{ label, pct: Math.max(0, Math.min(100, pct)) }] : [];
  });
  const tiers = tierRows.length ? { title: str(tiersRaw?.title) ?? "", rows: tierRows } : null;

  const sources = arr(c.sources).flatMap((i) => {
    const r = rec(i);
    const title = str(r?.title);
    const url = str(r?.url);
    return title && url && url.startsWith("https://") ? [{ title, url }] : [];
  });

  return { keyStats, blocks, tiers, sources };
}

export type BlogCardExtras = { cardStat: string; cardStatLabel: string; featured: boolean };

export function parseCardExtras(content: unknown): BlogCardExtras {
  const c = rec(content) ?? {};
  const card = rec(c.card);
  return {
    cardStat: str(card?.stat) ?? "",
    cardStatLabel: str(card?.statLabel) ?? "",
    featured: c.featured === true,
  };
}
