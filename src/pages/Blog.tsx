import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Calendar, AlertTriangle, Newspaper, X, Tag as TagIcon, Search, Star, ArrowRight } from "lucide-react";
import {
  BLOG_CANONICAL_BASE,
  BlogPostSummary,
  fetchBlogIndex,
  formatBlogDate,
} from "@/lib/blog";
import { InlineNewsletter } from "@/components/newsletter";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [searchParams] = useSearchParams();
  const activeTag = searchParams.get("tag")?.trim() || null;

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBlogIndex(ctrl.signal)
      .then((idx) => {
        const sorted = [...(idx.posts ?? [])].sort(
          (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
        );
        setPosts(sorted);
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError") setError((e as Error).message);
      });
    return () => ctrl.abort();
  }, []);

  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    (posts ?? []).forEach((p) => {
      (p.tags ?? []).forEach((t) => {
        map.set(t, (map.get(t) ?? 0) + 1);
      });
    });
    return [...map.entries()].sort((a, b) =>
      b[1] - a[1] || a[0].localeCompare(b[0])
    );
  }, [posts]);

  const filteredPosts = useMemo(() => {
    if (!posts) return posts;
    let list = posts;
    if (activeTag) {
      const needle = activeTag.toLowerCase();
      list = list.filter((p) =>
        (p.tags ?? []).some((t) => t.toLowerCase() === needle)
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((p) => {
        const hay = [
          p.title,
          p.description ?? "",
          p.category ?? "",
          ...(p.tags ?? []),
          ...((p.authors ?? []).map((a) => a.name)),
        ]
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [posts, activeTag, query]);

  const featuredPost = useMemo(() => {
    if (!posts || posts.length === 0 || activeTag || query.trim()) return null;
    return posts[0];
  }, [posts, activeTag, query]);

  const postsToList = useMemo(() => {
    if (!filteredPosts) return filteredPosts;
    if (featuredPost) return filteredPosts.filter((p) => p.slug !== featuredPost.slug);
    return filteredPosts;
  }, [filteredPosts, featuredPost]);

  const baseTitle = "Blog — Elsa Workflows";
  const title = activeTag ? `Posts tagged "${activeTag}" — Elsa Blog` : baseTitle;
  const baseDescription =
    "News, deep dives, and tutorials from the Elsa Workflows team and community.";
  const description = activeTag
    ? `Elsa Workflows blog posts tagged "${activeTag}".`
    : baseDescription;

  return (
    <Layout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={BLOG_CANONICAL_BASE} />
        {activeTag && <meta name="robots" content="noindex,follow" />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={BLOG_CANONICAL_BASE} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <section className="container py-16 md:py-24">
        <header className="max-w-3xl mb-10">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Newspaper className="h-4 w-4" />
            <span>Elsa Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Notes from the Elsa team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{baseDescription}</p>
        </header>

        {/* Search bar */}
        <div className="mb-8 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search posts by title, tag, author..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-9"
              aria-label="Search blog posts"
            />
          </div>
        </div>

        {/* Featured post */}
        {featuredPost && (
          <Link
            to={`/blog/${featuredPost.slug}`}
            className="group block mb-12 rounded-xl border border-border overflow-hidden hover:border-primary/40 transition-colors"
          >
            <div className="grid md:grid-cols-2 gap-0">
              {featuredPost.featuredImage && (
                <div className="aspect-[16/10] md:aspect-auto overflow-hidden bg-muted">
                  <img
                    src={featuredPost.featuredImage}
                    alt={featuredPost.title}
                    loading="eager"
                    className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                </div>
              )}
              <div className="p-6 md:p-10 flex flex-col justify-center">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="default" className="gap-1">
                    <Star className="h-3 w-3" />
                    Featured
                  </Badge>
                  {featuredPost.category && (
                    <Badge variant="secondary" className="font-normal">
                      {featuredPost.category}
                    </Badge>
                  )}
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {formatBlogDate(featuredPost.publishedAt)}
                  </span>
                </div>
                <h2 className="text-2xl md:text-3xl font-display font-semibold tracking-tight group-hover:text-primary transition-colors">
                  {featuredPost.title}
                </h2>
                {featuredPost.description && (
                  <p className="mt-3 text-muted-foreground line-clamp-3">
                    {featuredPost.description}
                  </p>
                )}
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-primary group-hover:gap-3 transition-all">
                  Read article
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </div>
          </Link>
        )}


        {tagCounts.length > 0 && (
          <div className="mb-10 space-y-3">
            {activeTag && (
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Filtered by tag:</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-primary">
                  <TagIcon className="h-3 w-3" />
                  <span className="font-medium">{activeTag}</span>
                  <Link
                    to="/blog"
                    aria-label="Clear tag filter"
                    className="inline-flex items-center justify-center rounded-full hover:bg-primary/20 transition-colors p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </Link>
                </span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <Link
                to="/blog"
                className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
                  !activeTag
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                }`}
              >
                All posts
                <span className="ml-1.5 opacity-60">{posts?.length ?? 0}</span>
              </Link>
              {tagCounts.map(([tag, count]) => {
                const isActive = activeTag?.toLowerCase() === tag.toLowerCase();
                return (
                  <Link
                    key={tag}
                    to={`/blog?tag=${encodeURIComponent(tag)}`}
                    onClick={() => track("tag_click", { tag, source: "blog_sidebar" })}
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    }`}
                  >
                    {tag}
                    <span className="ml-1.5 opacity-60">{count}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Couldn't load the blog</p>
              <p className="text-sm text-muted-foreground mt-1">{error}</p>
            </div>
          </div>
        )}

        {!error && posts === null && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-64 w-full" />
            ))}
          </div>
        )}

        {!error && posts && posts.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">No posts yet</h2>
            <p className="text-muted-foreground mt-2">
              Check back soon — the first articles are on the way.
            </p>
          </div>
        )}

        {!error && posts && posts.length > 0 && filteredPosts && filteredPosts.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 p-12 text-center">
            <Newspaper className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold">
              {query.trim()
                ? `No posts match "${query.trim()}"`
                : `No posts tagged "${activeTag}"`}
            </h2>
            <p className="text-muted-foreground mt-2">
              Try a different search or{" "}
              <Link to="/blog" className="text-primary hover:underline" onClick={() => setQuery("")}>
                view all posts
              </Link>
              .
            </p>
          </div>
        )}

        {!error && postsToList && postsToList.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {postsToList.map((post) => (
              <Card
                key={post.slug}
                className="h-full overflow-hidden transition-colors hover:border-primary/40 group flex flex-col"
              >
                <Link to={`/blog/${post.slug}`} className="block">
                  {post.featuredImage && (
                    <div className="aspect-[16/9] overflow-hidden bg-muted">
                      <img
                        src={post.featuredImage}
                        alt={post.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-1">
                      {post.category && (
                        <Badge variant="secondary" className="font-normal">
                          {post.category}
                        </Badge>
                      )}
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatBlogDate(post.publishedAt)}
                      </span>
                    </div>
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {post.title}
                    </CardTitle>
                    {post.description && (
                      <CardDescription className="line-clamp-3">
                        {post.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                </Link>
                <CardContent className="space-y-3 mt-auto">
                  {post.tags && post.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {post.tags.slice(0, 4).map((t) => {
                        const isActive = activeTag?.toLowerCase() === t.toLowerCase();
                        return (
                          <Link
                            key={t}
                            to={`/blog?tag=${encodeURIComponent(t)}`}
                            onClick={() => track("tag_click", { tag: t, source: "blog_card" })}
                            aria-label={`Filter by tag ${t}`}
                          >
                            <Badge
                              variant={isActive ? "default" : "outline"}
                              className="font-normal cursor-pointer hover:border-primary/60 hover:text-primary transition-colors"
                            >
                              {t}
                            </Badge>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                  {post.authors && post.authors.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      By {post.authors.map((a) => a.name).join(", ")}
                    </p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <div className="mt-16">
          <InlineNewsletter />
        </div>
      </section>
    </Layout>
  );
}
