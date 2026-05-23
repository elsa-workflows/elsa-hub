export interface BlogAuthor {
  name: string;
  url?: string;
  avatar?: string;
  title?: string;
}

export interface BlogSeo {
  title?: string;
  description?: string;
  openGraphImage?: string;
}

export interface BlogPostSummary {
  slug: string;
  title: string;
  description?: string;
  publishedAt: string;
  updatedAt?: string;
  category?: string;
  tags?: string[];
  authors?: BlogAuthor[];
  featuredImage?: string;
  canonicalUrl?: string;
  seo?: BlogSeo;
}

export interface BlogPost extends BlogPostSummary {
  html: string;
}

export interface BlogIndex {
  generatedAt?: string;
  posts: BlogPostSummary[];
}

const BASE = "https://elsa-workflows.github.io/elsa-blog";
export const BLOG_CANONICAL_BASE = "https://www.elsaworkflows.io/blog";

export async function fetchBlogIndex(signal?: AbortSignal): Promise<BlogIndex> {
  const res = await fetch(`${BASE}/index.json`, { signal });
  if (!res.ok) throw new Error(`Failed to load blog index (${res.status})`);
  return res.json();
}

export async function fetchBlogPost(slug: string, signal?: AbortSignal): Promise<BlogPost | null> {
  const res = await fetch(`${BASE}/posts/${encodeURIComponent(slug)}.json`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load post (${res.status})`);
  return res.json();
}

export function formatBlogDate(iso?: string): string {
  if (!iso) return "";
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}
