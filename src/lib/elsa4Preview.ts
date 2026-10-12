import {
  SITE_OG_IMAGE_HEIGHT,
  SITE_OG_IMAGE_WIDTH,
  SITE_TWITTER_CARD,
  SITE_URL,
  resolveSocialImage,
} from "./site";

export const ELSA4_PREVIEW_PATH = "/elsa-4";
export const ELSA4_PREVIEW_TITLE = "Elsa 4 Preview | Elsa Workflows";
export const ELSA4_PREVIEW_DESCRIPTION =
  "Explore Elsa 4, the next generation of Elsa Workflows for .NET. Read the preview docs, try a local workflow, and contribute to the source.";
export const ELSA4_PREVIEW_H1 = "Explore the Elsa 4 preview";
export const ELSA4_PREVIEW_INTRO =
  "Discover the next generation of Elsa Workflows for .NET. The workflow engine, optional extensions, and Studio visual designer now share one source repository. Read the preview docs, try the documented local setup, or help shape what comes next.";

export const ELSA4_PREVIEW_DOCS_URL = "https://v4.elsaworkflows.io/";
export const ELSA4_FOUNDATION_SOURCE_URL = "https://github.com/elsa-workflows/elsa-foundation";
export const ELSA4_STUDIO_SOURCE_URL =
  "https://github.com/elsa-workflows/elsa-foundation/blob/main/Studio/README.md";

export const ELSA4_PREVIEW_SECTIONS = [
  {
    title: "Essentials",
    description:
      "Run and understand the reference server and Workbench, with a local quickstart and a first-workflow walkthrough.",
    href: "https://v4.elsaworkflows.io/essentials/essentials",
  },
  {
    title: "Extensions",
    description:
      "Explore optional modules and extension points. Each host chooses the capabilities in its own composition.",
    href: "https://v4.elsaworkflows.io/extensions/extensions",
  },
  {
    title: "Studio",
    description:
      "Learn about the visual client and the documented Workbench pairing, then browse the current Studio source in Foundation.",
    href: "https://v4.elsaworkflows.io/studio/studio",
    sourceHref: ELSA4_STUDIO_SOURCE_URL,
  },
] as const;

export const ELSA4_PREVIEW_GUIDES = [
  {
    title: "Try Elsa locally",
    description:
      "Build and run the documented Workbench and Studio image pair, with the versions and setup steps in the guide.",
    href: "https://v4.elsaworkflows.io/essentials/essentials/quickstart",
  },
  {
    title: "Your first workflow",
    description:
      "Create, publish, run, and inspect a small workflow using the documented local setup.",
    href: "https://v4.elsaworkflows.io/essentials/essentials/first-workflow",
  },
  {
    title: "Contribute documentation",
    description:
      "The public docs live in the Foundation repository and accept proposed changes through GitHub pull requests.",
    href: "https://v4.elsaworkflows.io/contributing/contributing",
  },
] as const;

export const ELSA4_PREVIEW_NOTES = [
  "Elsa 4 is preview software under active development. APIs and examples may change. Elsa 3 documentation remains available for existing applications.",
  "The quickstart identifies the tested revisions and Linux/amd64 environment. Follow its version notes and check the server and Studio versions together.",
] as const;

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}


export function buildElsa4PreviewHead(): string {
  const canonicalUrl = `${SITE_URL}${ELSA4_PREVIEW_PATH}`;
  const imageUrl = resolveSocialImage();

  return [
    `<title data-rh="true">${escapeHtml(ELSA4_PREVIEW_TITLE)}</title>`,
    `<meta data-rh="true" name="description" content="${escapeHtml(ELSA4_PREVIEW_DESCRIPTION)}" />`,
    `<link data-rh="true" rel="canonical" href="${escapeHtml(canonicalUrl)}" />`,
    `<meta data-rh="true" property="og:type" content="website" />`,
    `<meta data-rh="true" property="og:site_name" content="Elsa Workflows" />`,
    `<meta data-rh="true" property="og:title" content="${escapeHtml(ELSA4_PREVIEW_TITLE)}" />`,
    `<meta data-rh="true" property="og:description" content="${escapeHtml(ELSA4_PREVIEW_DESCRIPTION)}" />`,
    `<meta data-rh="true" property="og:url" content="${escapeHtml(canonicalUrl)}" />`,
    `<meta data-rh="true" property="og:image" content="${escapeHtml(imageUrl)}" />`,
    `<meta data-rh="true" property="og:image:width" content="${SITE_OG_IMAGE_WIDTH}" />`,
    `<meta data-rh="true" property="og:image:height" content="${SITE_OG_IMAGE_HEIGHT}" />`,
    `<meta data-rh="true" name="twitter:card" content="${SITE_TWITTER_CARD}" />`,
    `<meta data-rh="true" name="twitter:title" content="${escapeHtml(ELSA4_PREVIEW_TITLE)}" />`,
    `<meta data-rh="true" name="twitter:description" content="${escapeHtml(ELSA4_PREVIEW_DESCRIPTION)}" />`,
    `<meta data-rh="true" name="twitter:image" content="${escapeHtml(imageUrl)}" />`,
  ].join("\n    ");
}

export function buildElsa4PreviewBody(): string {
  const sections = ELSA4_PREVIEW_SECTIONS.map(
    (section) => {
      const { title, description, href } = section;
      const sourceHref = "sourceHref" in section ? section.sourceHref : undefined;
      return `
      <li>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">Read ${escapeHtml(title)} docs</a>
        ${sourceHref ? `<a href="${escapeHtml(sourceHref)}" target="_blank" rel="noopener noreferrer">Browse Studio source</a>` : ""}
      </li>`;
    },
  ).join("");
  const guides = ELSA4_PREVIEW_GUIDES.map(
    ({ title, description, href }) => `
      <li>
        <h3>${escapeHtml(title)}</h3>
        <p>${escapeHtml(description)}</p>
        <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(title)}</a>
      </li>`,
  ).join("");
  const notes = ELSA4_PREVIEW_NOTES.map((note) => `<li>${escapeHtml(note)}</li>`).join("");

  return `<main data-prerendered="true">
  <p>Source development preview</p>
  <h1>${escapeHtml(ELSA4_PREVIEW_H1)}</h1>
  <p>${escapeHtml(ELSA4_PREVIEW_INTRO)}</p>
  <p><a href="${escapeHtml(ELSA4_PREVIEW_DOCS_URL)}" target="_blank" rel="noopener noreferrer">Read the Elsa 4 preview docs</a>
  <a href="${escapeHtml(ELSA4_FOUNDATION_SOURCE_URL)}" target="_blank" rel="noopener noreferrer">View Foundation source</a></p>
  <section>
    <h2>What the preview covers</h2>
    <ul>${sections}
    </ul>
  </section>
  <section>
    <h2>Start with the published guides</h2>
    <ul>${guides}
    </ul>
  </section>
  <section>
    <h2>Read the preview in context</h2>
    <ul>${notes}</ul>
  </section>
</main>`;
}
