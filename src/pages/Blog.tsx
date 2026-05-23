import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, AlertTriangle, Newspaper } from "lucide-react";
import {
  BLOG_CANONICAL_BASE,
  BlogPostSummary,
  fetchBlogIndex,
  formatBlogDate,
} from "@/lib/blog";

export default function Blog() {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const title = "Blog — Elsa Workflows";
  const description =
    "News, deep dives, and tutorials from the Elsa Workflows team and community.";

  return (
    <Layout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={BLOG_CANONICAL_BASE} />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={BLOG_CANONICAL_BASE} />
        <meta property="og:type" content="website" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <section className="container py-16 md:py-24">
        <header className="max-w-3xl mb-12">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <Newspaper className="h-4 w-4" />
            <span>Elsa Blog</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            Notes from the Elsa team
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">{description}</p>
        </header>

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

        {!error && posts && posts.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <Link
                key={post.slug}
                to={`/blog/${post.slug}`}
                className="group block"
              >
                <Card className="h-full overflow-hidden transition-colors group-hover:border-primary/40">
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
                  <CardContent className="space-y-3">
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {post.tags.slice(0, 4).map((t) => (
                          <Badge key={t} variant="outline" className="font-normal">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {post.authors && post.authors.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        By {post.authors.map((a) => a.name).join(", ")}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
}
