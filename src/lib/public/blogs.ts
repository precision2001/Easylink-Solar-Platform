import { buildBackendUrl } from "@/lib/customers/backend";
import {
  BLOG_DETAIL_LABELS,
  type BlogDetailContact,
  type BlogDetailContent,
  type BlogDetailFeaturedQuote,
  type BlogDetailLeaderQuote,
  type BlogPost,
} from "@/utils/constant";

type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
};

type BackendBlogPost = {
  slug: string;
  title: string;
  excerpt?: string | null;
  category?: string | null;
  authorName?: string | null;
  authorAvatarSrc?: string | null;
  authorAvatarAlt?: string | null;
  heroImageSrc?: string | null;
  heroImageAlt?: string | null;
  thumbnailImageSrc?: string | null;
  thumbnailImageAlt?: string | null;
  publishedAt?: string | null;
  readTimeLabel?: string | null;
  content?: {
    breadcrumbTitle?: string;
    body?: string[];
    attributionRole?: string | null;
    featuredQuote?: unknown;
    industryLeadersHeading?: string | null;
    leaderQuotes?: unknown;
    contact?: unknown;
  } | null;
};

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/** Featured quote from the post's own data, or undefined. Requires quote + name. */
export function parseFeaturedQuote(value: unknown): BlogDetailFeaturedQuote | undefined {
  const raw = asRecord(value);
  if (!raw) return undefined;
  const quote = nonEmptyString(raw.quote);
  const name = nonEmptyString(raw.name);
  if (!quote || !name) return undefined;
  return {
    quote,
    name,
    role: nonEmptyString(raw.role) ?? "",
    avatarSrc: nonEmptyString(raw.avatarSrc) ?? "/images/logo.webp",
    avatarAlt: nonEmptyString(raw.avatarAlt) ?? name,
  };
}

/** Leader quotes from the post's own data; malformed entries are dropped. */
export function parseLeaderQuotes(value: unknown): BlogDetailLeaderQuote[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const raw = asRecord(item);
    if (!raw) return [];
    const attribution = nonEmptyString(raw.attribution);
    const paragraphs = Array.isArray(raw.paragraphs)
      ? raw.paragraphs.map(nonEmptyString).filter((p): p is string => p !== null)
      : [];
    if (!attribution || paragraphs.length === 0) return [];
    return [{ attribution, paragraphs }];
  });
}

/** Media contact from the post's own data, or undefined. Requires a name and a phone or email. */
export function parseContact(value: unknown): BlogDetailContact | undefined {
  const raw = asRecord(value);
  if (!raw) return undefined;
  const name = nonEmptyString(raw.name);
  const phone = nonEmptyString(raw.phone) ?? "";
  const emailHref = nonEmptyString(raw.emailHref) ?? "";
  if (!name || (!phone && !emailHref)) return undefined;
  return {
    heading: nonEmptyString(raw.heading) ?? "For more information:",
    name,
    role: nonEmptyString(raw.role) ?? "",
    phone,
    emailLabel: nonEmptyString(raw.emailLabel) ?? "Email",
    emailHref,
  };
}

function publicUrl(frontendPath: string, backendPath: string) {
  if (typeof window !== "undefined") return frontendPath;
  const backendBaseUrl = process.env.BACKEND_API_BASE_URL;
  if (!backendBaseUrl) return frontendPath;
  return buildBackendUrl(backendBaseUrl, backendPath);
}

function formatDate(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function toBlogPost(post: BackendBlogPost): BlogPost {
  return {
    id: post.slug,
    slug: post.slug,
    title: post.title,
    excerpt: post.excerpt ?? "",
    category: post.category ?? "News",
    dateLabel: formatDate(post.publishedAt),
    authorName: post.authorName ?? "Easylink Solar",
    authorAvatarSrc: post.authorAvatarSrc ?? "/images/logo.webp",
    authorAvatarAlt: post.authorAvatarAlt ?? "Easylink Solar",
    heroImageSrc: post.heroImageSrc ?? "/images/home/blog-card-bg.png",
    heroImageAlt: post.heroImageAlt ?? "Solar grid graphic background",
    thumbnailImageSrc: post.thumbnailImageSrc ?? "/images/home/solar-panel-design.png",
    thumbnailImageAlt: post.thumbnailImageAlt ?? "Solar panels",
    href: "#",
  };
}

export function toBlogDetailContent(post: BackendBlogPost): BlogDetailContent {
  const card = toBlogPost(post);
  const body = Array.isArray(post.content?.body) && post.content.body.length > 0
    ? post.content.body
    : [card.excerpt];

  return {
    ...BLOG_DETAIL_LABELS,
    breadcrumbTitle: post.content?.breadcrumbTitle ?? card.title,
    categoryLabel: card.category,
    dateLabel: card.dateLabel,
    readTimeLabel: post.readTimeLabel ?? BLOG_DETAIL_LABELS.readTimeLabel,
    title: card.title,
    attributionName: card.authorName,
    attributionRole: nonEmptyString(post.content?.attributionRole) ?? "",
    featuredQuote: parseFeaturedQuote(post.content?.featuredQuote),
    industryLeadersHeading:
      nonEmptyString(post.content?.industryLeadersHeading) ??
      BLOG_DETAIL_LABELS.industryLeadersHeading,
    leaderQuotes: parseLeaderQuotes(post.content?.leaderQuotes),
    contact: parseContact(post.content?.contact),
    leadParagraph: body[0] ?? card.excerpt,
    featuredImageSrc: card.thumbnailImageSrc,
    featuredImageAlt: card.thumbnailImageAlt,
    bodyParagraphs: body.slice(1),
  };
}

export async function fetchPublicBlogs(): Promise<BlogPost[]> {
  const res = await fetch(publicUrl("/api/blogs?limit=100", "/blogs?limit=100"), {
    cache: "no-store",
  });
  const json = (await res.json()) as ApiEnvelope<BackendBlogPost[]>;
  if (!res.ok) throw new Error(json.message || "Failed to load blog posts");
  return Array.isArray(json.data) ? json.data.map(toBlogPost) : [];
}

export async function fetchPublicBlog(slug: string): Promise<{
  post: BlogPost;
  content: BlogDetailContent;
}> {
  const res = await fetch(publicUrl(`/api/blogs/${slug}`, `/blogs/${slug}`), {
    cache: "no-store",
  });
  const json = (await res.json()) as ApiEnvelope<BackendBlogPost>;
  if (!res.ok || !json.data) throw new Error(json.message || "Failed to load blog post");
  return {
    post: toBlogPost(json.data),
    content: toBlogDetailContent(json.data),
  };
}
