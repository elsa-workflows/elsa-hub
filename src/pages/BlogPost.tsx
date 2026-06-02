import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Layout } from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { ArrowLeft, Calendar, AlertTriangle } from "lucide-react";
import {
  BLOG_CANONICAL_BASE,
  BlogPost as BlogPostT,
  fetchBlogPost,
  formatBlogDate,
} from "@/lib/blog";
import { RelatedPosts } from "@/components/blog/RelatedPosts";
import { ShareExportMenu } from "@/components/blog/ShareExportMenu";
import { BlogPostActions } from "@/components/blog/BlogPostActions";
import { BlogPostViews } from "@/components/blog/BlogPostViews";

import { InlineNewsletter } from "@/components/newsletter";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type LoadState =
  | { kind: "loading" }
  | { kind: "ok"; post: BlogPostT }
  | { kind: "not_found" }
  | { kind: "error"; message: string };

export default function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const [state, setState] = useState<LoadState>({ kind: "loading" });
  const [lightbox, setLightbox] = useState<{ src: string; alt: string } | null>(null);
  const { data: isAdmin } = useIsAdmin();

  // Open lightbox when a content image inside the rendered post HTML is clicked.
  const handleArticleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const img = target.closest("img") as HTMLImageElement | null;
    if (!img) return;
    // Skip tiny inline images (emoji-like, badges, avatars).
    if (img.naturalWidth > 0 && img.naturalWidth < 80) return;
    e.preventDefault();
    setLightbox({ src: img.currentSrc || img.src, alt: img.alt || "" });
  };

  useEffect(() => {
    if (!slug) return;
    setState({ kind: "loading" });
    const ctrl = new AbortController();
    fetchBlogPost(slug, ctrl.signal)
      .then((post) => {
        if (!post) setState({ kind: "not_found" });
        else setState({ kind: "ok", post });
      })
      .catch((e) => {
        if ((e as Error).name !== "AbortError")
          setState({ kind: "error", message: (e as Error).message });
      });
    return () => ctrl.abort();
  }, [slug]);

  if (state.kind === "loading") {
    return (
      <Layout>
        <article className="container max-w-3xl py-16">
          <Skeleton className="h-6 w-32 mb-6" />
          <Skeleton className="h-12 w-full mb-3" />
          <Skeleton className="h-12 w-3/4 mb-6" />
          <Skeleton className="aspect-[16/9] w-full mb-8" />
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>
        </article>
      </Layout>
    );
  }

  if (state.kind === "not_found") {
    return (
      <Layout>
        <Helmet>
          <meta name="robots" content="noindex" />
          <title>Post not found — Elsa Workflows</title>
        </Helmet>
        <div className="container max-w-2xl py-24 text-center">
          <h1 className="text-3xl font-semibold">Post not found</h1>
          <p className="text-muted-foreground mt-3">
            We couldn't find a blog post at this URL.
          </p>
          <Button asChild className="mt-6">
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to blog
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  if (state.kind === "error") {
    return (
      <Layout>
        <div className="container max-w-2xl py-24">
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 flex gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
            <div>
              <p className="font-medium">Couldn't load this post</p>
              <p className="text-sm text-muted-foreground mt-1">{state.message}</p>
            </div>
          </div>
          <Button asChild variant="ghost" className="mt-6">
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to blog
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  const post = state.post;
  const canonical = post.canonicalUrl || `${BLOG_CANONICAL_BASE}/${post.slug}`;
  const seoTitle = post.seo?.title || post.title;
  const seoDescription = post.seo?.description || post.description || "";
  const ogImage = post.seo?.openGraphImage || post.featuredImage;
  const pageTitle = `${seoTitle} — Elsa Workflows`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: seoDescription,
    image: ogImage,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: (post.authors || []).map((a) => ({
      "@type": "Person",
      name: a.name,
      url: a.url,
    })),
    mainEntityOfPage: canonical,
  };

  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: "https://www.elsa-workflows.io/" },
      { "@type": "ListItem", position: 2, name: "Blog", item: BLOG_CANONICAL_BASE },
      { "@type": "ListItem", position: 3, name: post.title, item: canonical },
    ],
  };

  return (
    <Layout>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={seoDescription} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:url" content={canonical} />
        {ogImage && <meta property="og:image" content={ogImage} />}
        {post.publishedAt && (
          <meta property="article:published_time" content={post.publishedAt} />
        )}
        {post.updatedAt && (
          <meta property="article:modified_time" content={post.updatedAt} />
        )}
        {(post.authors || []).map((a) => (
          <meta key={a.name} property="article:author" content={a.name} />
        ))}
        {post.category && (
          <meta property="article:section" content={post.category} />
        )}
        {(post.tags || []).map((t) => (
          <meta key={t} property="article:tag" content={t} />
        ))}
        {ogImage ? (
          <meta name="twitter:card" content="summary_large_image" />
        ) : (
          <meta name="twitter:card" content="summary" />
        )}
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDescription} />
        {ogImage && <meta name="twitter:image" content={ogImage} />}
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        <script type="application/ld+json">{JSON.stringify(breadcrumbLd)}</script>
      </Helmet>

      <article className="container max-w-3xl py-12 md:py-16">
        <div className="mb-6 flex items-center justify-between -ml-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/blog">
              <ArrowLeft className="h-4 w-4 mr-2" />
              All posts
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <BlogPostActions
              slug={post.slug}
              title={post.title}
              url={canonical}
              description={seoDescription}
            />
            {isAdmin && <ShareExportMenu slug={post.slug} />}
          </div>
        </div>



        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mb-4">
            {post.category && (
              <Badge variant="secondary" className="font-normal">
                {post.category}
              </Badge>
            )}
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formatBlogDate(post.publishedAt)}
            </span>
            {post.updatedAt && post.updatedAt !== post.publishedAt && (
              <span className="text-xs">
                · Updated {formatBlogDate(post.updatedAt)}
              </span>
            )}
            <span aria-hidden="true">·</span>
            <BlogPostViews slug={post.slug} />
          </div>
          <h1 className="text-4xl md:text-5xl font-display font-semibold tracking-tight">
            {post.title}
          </h1>
          {post.description && (
            <p className="mt-4 text-lg text-muted-foreground">{post.description}</p>
          )}
          {post.authors && post.authors.length > 0 && (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {post.authors.map((a) => (
                <div key={a.name} className="flex items-center gap-2">
                  {a.avatar && (
                    <img
                      src={a.avatar}
                      alt={a.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  )}
                  <div className="text-sm">
                    <div className="font-medium leading-tight">{a.name}</div>
                    {a.title && (
                      <div className="text-xs text-muted-foreground leading-tight">
                        {a.title}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </header>

        {post.featuredImage && (
          <img
            src={post.featuredImage}
            alt={post.title}
            className="w-full rounded-lg border border-border mb-10 cursor-zoom-in"
            onClick={() => setLightbox({ src: post.featuredImage!, alt: post.title })}
          />
        )}

        <div
          className="prose prose-neutral dark:prose-invert max-w-none [&_img]:cursor-zoom-in"
          onClick={handleArticleClick}
          dangerouslySetInnerHTML={{ __html: post.html }}
        />

        {post.tags && post.tags.length > 0 && (
          <div className="mt-12 pt-6 border-t border-border flex flex-wrap gap-2">
            {post.tags.map((t) => (
              <Link
                key={t}
                to={`/blog?tag=${encodeURIComponent(t)}`}
                aria-label={`View posts tagged ${t}`}
              >
                <Badge
                  variant="outline"
                  className="font-normal cursor-pointer hover:border-primary/60 hover:text-primary transition-colors"
                >
                  {t}
                </Badge>
              </Link>
            ))}
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Found this useful? Give it a like or share it with your network.
          </p>
          <BlogPostActions
            slug={post.slug}
            title={post.title}
            url={canonical}
            description={seoDescription}
          />
        </div>


        <div className="mt-12">
          <InlineNewsletter
            heading="Liked this post?"
            description="Get new Elsa articles, release notes, and samples delivered monthly."
          />
        </div>

        <RelatedPosts currentSlug={post.slug} tags={post.tags} />
      </article>
    </Layout>
  );
}
