import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const academySanitizeSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), "details", "summary"])],
  attributes: {
    ...defaultSchema.attributes,
    details: [...(defaultSchema.attributes?.details ?? []), ["open"]],
    summary: [...(defaultSchema.attributes?.summary ?? [])],
  },
};

const markdownComponents: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
};

export function AcademyMarkdown({ markdown }: { markdown: string }) {
  return (
    <article
      data-testid="academy-lesson-body"
      className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, [rehypeSanitize, academySanitizeSchema]]}
        components={markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
