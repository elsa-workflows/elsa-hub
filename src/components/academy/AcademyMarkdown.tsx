import type { ReactNode } from "react";
import type { Components, Options as MarkdownOptions } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import {
  ACADEMY_KIT_STEP_PROP,
  ACADEMY_KIT_STEP_TOP_PROP,
  rehypeAcademyKitStep,
} from "@/lib/academyKitStep";

const academySanitizeSchema = {
  ...defaultSchema,
  tagNames: [...new Set([...(defaultSchema.tagNames ?? []), "details", "summary"])],
  attributes: {
    ...defaultSchema.attributes,
    details: [...(defaultSchema.attributes?.details ?? []), ["open"]],
    summary: [...(defaultSchema.attributes?.summary ?? [])],
  },
};

type PluggableList = NonNullable<MarkdownOptions["rehypePlugins"]>;

const baseRehypePlugins: PluggableList = [rehypeRaw, [rehypeSanitize, academySanitizeSchema]];
const kitStepRehypePlugins: PluggableList = [...baseRehypePlugins, rehypeAcademyKitStep];

const markdownComponents: Components = {
  h1: ({ children }) => <h2>{children}</h2>,
};

function isKitStep(node: { properties?: Record<string, unknown> } | undefined, prop: string) {
  return node?.properties?.[prop] === "true";
}

function kitStepComponents(kitStep: ReactNode): Components {
  return {
    ...markdownComponents,
    p: ({ node, ...props }) =>
      isKitStep(node, ACADEMY_KIT_STEP_PROP) ? (
        <>
          <p {...props} />
          <div className="not-prose my-4">{kitStep}</div>
        </>
      ) : (
        <p {...props} />
      ),
    li: ({ node, children, ...props }) => (
      <li {...props}>
        {children}
        {isKitStep(node, ACADEMY_KIT_STEP_PROP) && <div className="not-prose my-3">{kitStep}</div>}
      </li>
    ),
    div: ({ node, ...props }) =>
      isKitStep(node, ACADEMY_KIT_STEP_TOP_PROP) ? (
        <div className="not-prose mb-4">{kitStep}</div>
      ) : (
        <div {...props} />
      ),
  };
}

/**
 * Renders a lesson body. Pass kitStep to render it right after the first paragraph or list
 * item that tells the reader to download the kit (or at the top of the body if no block can
 * host it). Without kitStep, or when no such sentence exists, nothing extra is rendered.
 */
export function AcademyMarkdown({ markdown, kitStep }: { markdown: string; kitStep?: ReactNode }) {
  const withKitStep = kitStep !== undefined && kitStep !== null;
  return (
    <article
      data-testid="academy-lesson-body"
      className="prose prose-sm md:prose-base max-w-none dark:prose-invert prose-headings:tracking-tight prose-a:text-primary prose-code:before:content-none prose-code:after:content-none"
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={withKitStep ? kitStepRehypePlugins : baseRehypePlugins}
        components={withKitStep ? kitStepComponents(kitStep) : markdownComponents}
      >
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
