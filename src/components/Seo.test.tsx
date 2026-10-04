import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { SITE_OG_IMAGE, SITE_TWITTER_CARD, SITE_URL } from "@/lib/site";
import { Seo } from "./Seo";

function renderSeo(ui: ReactNode) {
  return render(<HelmetProvider>{ui}</HelmetProvider>);
}

describe("Seo", () => {
  it("uses the www.elsaworkflows.io canonical host and social tags", async () => {
    expect(SITE_URL).toBe("https://www.elsaworkflows.io");

    renderSeo(
      <Seo
        path="/elsa-plus/training"
        title="Example title"
        description="Example description"
        image="https://www.elsaworkflows.io/og-training.png"
      />,
    );

    await waitFor(() => {
      expect(document.querySelector("link[rel='canonical']")?.getAttribute("href")).toBe(
        "https://www.elsaworkflows.io/elsa-plus/training",
      );
    });
    expect(document.querySelector("meta[property='og:url']")?.getAttribute("content")).toBe(
      "https://www.elsaworkflows.io/elsa-plus/training",
    );
    expect(document.querySelector("meta[property='og:site_name']")?.getAttribute("content")).toBe(
      "Elsa Workflows",
    );
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      "summary_large_image",
    );
    expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
      "https://www.elsaworkflows.io/og-training.png",
    );
    expect(document.querySelector("meta[name='twitter:image']")?.getAttribute("content")).toBe(
      "https://www.elsaworkflows.io/og-training.png",
    );
    expect(document.querySelector("meta[property='og:image:width']")).toBeNull();
    expect(document.querySelector("meta[property='og:image:height']")).toBeNull();
  });

  it("falls back to the shared site og image and twitter card", async () => {
    renderSeo(
      <Seo path="/blog" title="Blog title" description="Blog description" />,
    );

    await waitFor(() => {
      expect(SITE_OG_IMAGE).toBe("https://www.elsaworkflows.io/og-default.png");
    expect(document.querySelector("meta[property='og:image']")?.getAttribute("content")).toBe(
        SITE_OG_IMAGE,
      );
    expect(document.querySelector("meta[property='og:image:width']")?.getAttribute("content")).toBe(
      "1200",
    );
    expect(document.querySelector("meta[property='og:image:height']")?.getAttribute("content")).toBe(
      "630",
    );
    });
    expect(document.querySelectorAll("meta[property='og:image']")).toHaveLength(1);
    expect(document.querySelectorAll("meta[name='twitter:card']")).toHaveLength(1);
    expect(document.querySelector("meta[name='twitter:card']")?.getAttribute("content")).toBe(
      SITE_TWITTER_CARD,
    );
    expect(document.querySelector("meta[name='twitter:image']")?.getAttribute("content")).toBe(
      SITE_OG_IMAGE,
    );
  });
});
