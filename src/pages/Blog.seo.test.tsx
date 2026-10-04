import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import Blog from "./Blog";
import BlogPost from "./BlogPost";
import { SITE_OG_IMAGE, SITE_TWITTER_CARD } from "@/lib/site";
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
      .querySelectorAll("meta[property='og:image'], meta[name='twitter:card'], meta[name='twitter:image']")
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
});
