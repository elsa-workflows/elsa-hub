import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Blog from "./Blog";
import BlogPost from "./BlogPost";
import { SITE_OG_IMAGE, SITE_OG_IMAGE_HEIGHT, SITE_OG_IMAGE_WIDTH, SITE_TWITTER_CARD } from "@/lib/site";
import { fetchBlogIndex, fetchBlogPost } from "@/lib/blog";

vi.mock("@/lib/blog", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");
  return {
    ...actual,
    fetchBlogIndex: vi.fn(),
    fetchBlogPost: vi.fn(),
  };
});

vi.mock("@/components/layout/Layout", () => ({
  Layout: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/components/newsletter", () => ({
  InlineNewsletter: () => null,
}));

vi.mock("@/components/blog/RelatedPosts", () => ({
  RelatedPosts: () => null,
}));

vi.mock("@/components/blog/ShareExportMenu", () => ({
  ShareExportMenu: () => null,
}));

vi.mock("@/components/blog/BlogPostActions", () => ({
  BlogPostActions: () => null,
}));

vi.mock("@/components/blog/BlogPostViews", () => ({
  BlogPostViews: () => null,
}));

vi.mock("@/hooks/useIsAdmin", () => ({
  useIsAdmin: () => ({ data: false }),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({ insert: async () => ({ error: null }) }),
    functions: { invoke: async () => ({ data: { success: true }, error: null }) },
    rpc: async () => ({ data: null, error: null }),
  },
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: null }),
}));

const fetchIndex = vi.mocked(fetchBlogIndex);
const fetchPost = vi.mocked(fetchBlogPost);

const INDEX_FALLBACK_TAGS = [
  `<meta data-rh="true" property="og:image" content="${SITE_OG_IMAGE}" />`,
  `<meta data-rh="true" name="twitter:card" content="${SITE_TWITTER_CARD}" />`,
  `<meta data-rh="true" name="twitter:image" content="${SITE_OG_IMAGE}" />`,
].join("\n");

function injectIndexFallbacks() {
  document.head.insertAdjacentHTML("beforeend", INDEX_FALLBACK_TAGS);
}

function socialCounts() {
  return {
    "og:image": document.querySelectorAll("meta[property='og:image']").length,
    "twitter:card": document.querySelectorAll("meta[name='twitter:card']").length,
  };
}

describe("blog social fallbacks after hydration", () => {
  beforeEach(() => {
    fetchIndex.mockResolvedValue({ posts: [] });
    fetchPost.mockResolvedValue({
      slug: "no-image-post",
      title: "Post without a featured image",
      description: "A post used to check social fallbacks.",
      publishedAt: "2026-09-01T00:00:00.000Z",
      html: "<p>Body</p>",
    });
  });

  afterEach(() => {
    document
      .querySelectorAll(
        "meta[property='og:image'], meta[property='og:image:width'], meta[property='og:image:height'], meta[property='og:title'], meta[property='og:description'], meta[property='og:url'], meta[property='og:type'], meta[name='twitter:card'], meta[name='twitter:image'], meta[name='twitter:title'], meta[name='twitter:description'], meta[name='description'], meta[name='robots'], link[rel='canonical']",
      )
      .forEach((node) => node.remove());
  });

  it("gives /blog exactly one og:image and one twitter:card", async () => {
    injectIndexFallbacks();

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/blog"]}>
          <Blog />
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
        SITE_OG_IMAGE,
      );
    });
    expect(socialCounts()).toEqual({ "og:image": 1, "twitter:card": 1 });
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      SITE_TWITTER_CARD,
    );
  });

  it("gives a post without a featured image exactly one og:image and one twitter:card", async () => {
    injectIndexFallbacks();

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/blog/no-image-post"]}>
          <Routes>
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
        SITE_OG_IMAGE,
      );
    });
    expect(socialCounts()).toEqual({ "og:image": 1, "twitter:card": 1 });
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      SITE_TWITTER_CARD,
    );
    expect(document.querySelector("meta[name='twitter:image']")?.getAttribute("content")).toBe(
      SITE_OG_IMAGE,
    );
  });

  it("sets generic preview tags and noindex on Post not found", async () => {
    document.head.insertAdjacentHTML(
      "beforeend",
      [
        `<title>A real post title — Elsa Workflows</title>`,
        `<link data-rh="true" rel="canonical" href="https://www.elsaworkflows.io/blog/real-post" />`,
        `<meta data-rh="true" name="description" content="A real post description." />`,
        `<meta data-rh="true" property="og:title" content="A real post title" />`,
        `<meta data-rh="true" property="og:description" content="A real post description." />`,
        `<meta data-rh="true" property="og:url" content="https://www.elsaworkflows.io/blog/real-post" />`,
        `<meta data-rh="true" property="og:image" content="https://example.com/custom.png" />`,
      ].join("\n"),
    );
    fetchPost.mockResolvedValue(null);

    render(
      <HelmetProvider>
        <MemoryRouter initialEntries={["/blog/missing-slug"]}>
          <Routes>
            <Route path="/blog/:slug" element={<BlogPost />} />
          </Routes>
        </MemoryRouter>
      </HelmetProvider>,
    );

    await waitFor(() => {
      expect(document.title).toBe("Post not found — Elsa Workflows");
    });
    expect(document.querySelector("meta[name='robots']")?.getAttribute("content")).toBe("noindex");
    expect(document.querySelector("meta[name='description']")?.getAttribute("content")).toBe(
      "This blog post could not be found.",
    );
    expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
      "https://www.elsaworkflows.io/blog/missing-slug",
    );
    expect(document.querySelector("meta[property='og:title']")?.getAttribute("content")).toBe(
      "Post not found",
    );
    expect(document.querySelector("meta[property='og:url']")?.getAttribute("content")).toBe(
      "https://www.elsaworkflows.io/blog/missing-slug",
    );
    expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
      SITE_OG_IMAGE,
    );
    expect(document.querySelector("meta[property='og:image:width']")?.getAttribute("content")).toBe(
      String(SITE_OG_IMAGE_WIDTH),
    );
    expect(document.querySelector("meta[property='og:image:height']")?.getAttribute("content")).toBe(
      String(SITE_OG_IMAGE_HEIGHT),
    );
    expect(document.querySelector("meta[name='twitter:image']")?.getAttribute("content")).toBe(
      SITE_OG_IMAGE,
    );
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      SITE_TWITTER_CARD,
    );
  });
});
