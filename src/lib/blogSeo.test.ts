import { describe, expect, it } from "vitest";
import { absoluteBlogImageUrl, blogPostSeo } from "./blogSeo";
import { SITE_OG_IMAGE } from "./site";

describe("blogPostSeo", () => {
  it("prefers seo.title / seo.description and the featured image", () => {
    const seo = blogPostSeo({
      slug: "elsa-4-transactional-outbox",
      title: "Inside Elsa 4's Transactional Outbox",
      description: "Long description",
      featuredImage: "https://elsa-workflows.github.io/elsa-blog/assets/x/featured.png",
      seo: { title: "Elsa 4 Transactional Outbox", description: "Short description" },
    });
    expect(seo.title).toBe("Elsa 4 Transactional Outbox");
    expect(seo.description).toBe("Short description");
    expect(seo.image).toBe("https://elsa-workflows.github.io/elsa-blog/assets/x/featured.png");
    expect(seo.usingDefaultImage).toBe(false);
    expect(seo.canonical).toBe("https://www.elsaworkflows.io/blog/elsa-4-transactional-outbox");
    expect(seo.pageTitle).toBe("Elsa 4 Transactional Outbox — Elsa Workflows");
  });

  it("accepts flat seoTitle / seoDescription", () => {
    const seo = blogPostSeo({ slug: "a", title: "T", description: "D", seoTitle: "ST", seoDescription: "SD" });
    expect(seo.title).toBe("ST");
    expect(seo.description).toBe("SD");
  });

  it("falls back to title, description and the default image", () => {
    const seo = blogPostSeo({ slug: "a", title: "T", description: "D", seo: { title: " ", description: "" } });
    expect(seo.title).toBe("T");
    expect(seo.description).toBe("D");
    expect(seo.image).toBe(SITE_OG_IMAGE);
    expect(seo.usingDefaultImage).toBe(true);
  });

  it("uses canonicalUrl when given", () => {
    expect(blogPostSeo({ slug: "a", title: "T", canonicalUrl: "https://example.com/a" }).canonical).toBe(
      "https://example.com/a",
    );
  });
});

describe("absoluteBlogImageUrl", () => {
  it("absolutizes relative upstream and site paths", () => {
    expect(absoluteBlogImageUrl("../assets/x.png")).toBe("https://elsa-workflows.github.io/elsa-blog/assets/x.png");
    expect(absoluteBlogImageUrl("assets/x.png")).toBe("https://elsa-workflows.github.io/elsa-blog/assets/x.png");
    expect(absoluteBlogImageUrl("/og.png")).toBe("https://www.elsaworkflows.io/og.png");
    expect(absoluteBlogImageUrl("https://cdn.example/x.png")).toBe("https://cdn.example/x.png");
  });
});
