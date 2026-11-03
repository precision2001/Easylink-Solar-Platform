export type ShareLinks = {
  facebook: string;
  linkedin: string;
  x: string;
  email: string;
};

/** Social / email share URLs for a page. */
export function buildShareLinks(url: string, title: string): ShareLinks {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  return {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://x.com/intent/tweet?url=${u}&text=${t}`,
    email: `mailto:?subject=${t}&body=${u}`,
  };
}
