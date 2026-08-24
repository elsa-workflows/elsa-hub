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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;

// The upstream blog repo carries a static avatar image per author. For authors
// who have a platform profile, serve their live profile picture instead via
// the public author-avatar edge function, so bylines stay current when they
// update their avatar in dashboard settings.
const AUTHOR_AVATAR_OVERRIDES: Record<string, string> = {
  "sipke schoorstra": `${SUPABASE_URL}/functions/v1/author-avatar?author=sipke`,
};

function normalizeAuthors(authors?: BlogAuthor[]): BlogAuthor[] | undefined {
  if (!authors) return authors;
  return authors.map((a) => {
    let avatar = AUTHOR_AVATAR_OVERRIDES[a.name.toLowerCase()] ?? a.avatar;
    // Absolutize relative upstream avatar paths (same rule as post HTML assets).
    if (avatar && !/^https?:\/\//i.test(avatar)) {
      avatar = `${BASE}/${avatar.replace(/^(?:\.\.\/|\.\/)/, "")}`;
    }
    return { ...a, avatar };
  });
}

// Rewrite relative `../assets/...` (and bare `assets/...`) image/anchor URLs
// in post HTML to the upstream GitHub Pages location so they resolve when the
// post is rendered on our domain.
function absolutizeAssetUrls(html: string): string {
  if (!html) return html;
  return html.replace(
    /(\b(?:src|href)=")(?:\.\.\/|\.\/)?(assets\/[^"]+)(")/gi,
    (_m, pre, path, post) => `${pre}${BASE}/${path}${post}`,
  );
}

export async function fetchBlogIndex(signal?: AbortSignal): Promise<BlogIndex> {
  const res = await fetch(`${BASE}/index.json`, { signal });
  if (!res.ok) throw new Error(`Failed to load blog index (${res.status})`);
  const index = (await res.json()) as BlogIndex;
  if (index?.posts) {
    index.posts = index.posts.map((p) => ({ ...p, authors: normalizeAuthors(p.authors) }));
  }
  return index;
}

export async function fetchBlogPost(slug: string, signal?: AbortSignal): Promise<BlogPost | null> {
  const res = await fetch(`${BASE}/posts/${encodeURIComponent(slug)}.json`, { signal });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load post (${res.status})`);
  const post = (await res.json()) as BlogPost;
  if (post?.html) post.html = absolutizeAssetUrls(post.html);
  if (post) post.authors = normalizeAuthors(post.authors);
  return post;
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
