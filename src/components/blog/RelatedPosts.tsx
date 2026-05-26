import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { BlogPostSummary, fetchBlogIndex, formatBlogDate } from "@/lib/blog";

interface RelatedPostsProps {
  currentSlug: string;
  tags?: string[];
  limit?: number;
}

/**
 * "What's next" footer for blog posts.
 * Picks up to `limit` posts that share the most tags with the current post,
 * falling back to the most recent posts when there's no overlap.
 */
export function RelatedPosts({ currentSlug, tags = [], limit = 3 }: RelatedPostsProps) {
  const [posts, setPosts] = useState<BlogPostSummary[] | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetchBlogIndex(ctrl.signal)
      .then((idx) => setPosts(idx.posts ?? []))
      .catch(() => {
        /* silent — section just won't render */
      });
    return () => ctrl.abort();
  }, []);

  if (!posts) return null;

  const lowerTags = tags.map((t) => t.toLowerCase());
  const others = posts.filter((p) => p.slug !== currentSlug);

  const scored = others
    .map((p) => {
      const overlap = (p.tags ?? []).reduce(
        (n, t) => (lowerTags.includes(t.toLowerCase()) ? n + 1 : n),
        0
      );
      return { post: p, overlap, ts: new Date(p.publishedAt).getTime() || 0 };
    })
    .sort((a, b) => b.overlap - a.overlap || b.ts - a.ts)
    .slice(0, limit)
    .map((x) => x.post);

  if (scored.length === 0) return null;

  return (
    <section className="mt-16 pt-10 border-t border-border" aria-labelledby="related-posts">
      <div className="flex items-baseline justify-between mb-6">
        <h2 id="related-posts" className="text-xl md:text-2xl font-semibold tracking-tight">
          Keep reading
        </h2>
        <Link
          to="/blog"
          className="text-sm font-medium text-primary inline-flex items-center gap-1.5 hover:gap-2 transition-all"
        >
          All posts
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {scored.map((p) => (
          <Link
            key={p.slug}
            to={`/blog/${p.slug}`}
            className="group block"
            aria-label={`Read: ${p.title}`}
          >
            <Card className="h-full transition-colors group-hover:border-primary/40">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground inline-flex items-center gap-1.5 mb-2">
                  <Calendar className="h-3 w-3" />
                  {formatBlogDate(p.publishedAt)}
                </p>
                <h3 className="text-base font-semibold leading-snug group-hover:text-primary transition-colors">
                  {p.title}
                </h3>
                {p.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {p.description}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
