// Per-post SEO values shared by the client <Helmet> in BlogPost.tsx and the
// build-time prerender (scripts/prerender-blog.ts), so crawlers that do not
// run JS (LinkedIn, X, Slack) and the hydrated SPA see the same tags.
//
// Keep this file free of import.meta.env and browser APIs: it runs under tsx
// during the build.

import { SITE_OG_IMAGE, SITE_URL } from "./site";

export const BLOG_UPSTREAM_URL = "https://elsa-workflows.github.io/elsa-blog";
export const BLOG_POST_BASE_URL = `${SITE_URL}/blog`;

export interface BlogSeoInput {
  slug: string;
  title: string;
  description?: string | null;
  featuredImage?: string | null;
  canonicalUrl?: string | null;
  seo?: { title?: string | null; description?: string | null; openGraphImage?: string | null } | null;
  /** Flat aliases some feeds use; `seo.*` wins when both are present. */
  seoTitle?: string | null;
  seoDescription?: string | null;
}

export interface BlogPostSeo {
  canonical: string;
  title: string;
  description: string;
  pageTitle: string;
  image: string;
  usingDefaultImage: boolean;
}

/**
 * Make a post image URL absolute. Upstream posts use either full URLs or
 * paths relative to the elsa-blog site (`../assets/...`, `assets/...`); a
 * leading `/` is a path on this site.
 */
export function absoluteBlogImageUrl(image: string): string {
  const trimmed = image.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `${SITE_URL}${trimmed}`;
  return `${BLOG_UPSTREAM_URL}/${trimmed.replace(/^(?:\.\.\/|\.\/)+/, "")}`;
}

function firstNonEmpty(...values: Array<string | null | undefined>): string {
  for (const v of values) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

export function blogPostSeo(post: BlogSeoInput): BlogPostSeo {
  const title = firstNonEmpty(post.seo?.title, post.seoTitle, post.title);
  const description = firstNonEmpty(post.seo?.description, post.seoDescription, post.description);
  const rawImage = firstNonEmpty(post.seo?.openGraphImage, post.featuredImage);
  const canonical = firstNonEmpty(post.canonicalUrl) || `${BLOG_POST_BASE_URL}/${post.slug}`;
  return {
    canonical,
    title,
    description,
    pageTitle: `${title} — Elsa Workflows`,
    image: rawImage ? absoluteBlogImageUrl(rawImage) : SITE_OG_IMAGE,
    usingDefaultImage: !rawImage,
  };
}
