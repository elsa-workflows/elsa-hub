import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Link } from "react-router-dom";
import { SITE_URL } from "@/lib/site";

type HastNode = { type?: string; tagName?: string; value?: string; children?: HastNode[] };

/** Header cells of a Markdown table, and whether they are all blank. */
function readHeader(node?: HastNode): { cells: number; blank: boolean } {
  const thead = node?.children?.find((c) => c.tagName === "thead");
  const row = thead?.children?.find((c) => c.tagName === "tr");
  const ths = row?.children?.filter((c) => c.tagName === "th") ?? [];
  const text = (n: HastNode): string => (n.value ?? "") + (n.children ?? []).map(text).join("");
  return { cells: ths.length, blank: ths.every((th) => text(th).trim() === "") };
}

/** Links to www.elsaworkflows.io stay in the SPA; other links open in a new tab. */
const components: Components = {
  a: ({ href = "", children }) => {
    if (href.startsWith(`${SITE_URL}/`)) {
      return <Link to={href.slice(SITE_URL.length)}>{children}</Link>;
    }
    if (href.startsWith("mailto:")) {
      return <a href={href}>{children}</a>;
    }
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    );
  },
  // Wide tables (Annex I, Annex III) keep a readable column width and scroll
  // inside their own box on small screens; two-column tables just wrap.
  // A table with a blank header row (the DPA parties table) hides that row.
  table: ({ node, children }) => {
    const header = readHeader(node);
    return (
      <div className="not-prose overflow-x-auto my-6">
        <table
          className={`w-full border-collapse text-sm [&_td]:border [&_td]:p-2 [&_td]:align-top [&_th]:border [&_th]:p-2 [&_th]:text-left [&_th]:align-top ${
            header.cells > 2 ? "min-w-[40rem]" : ""
          } ${header.blank ? "[&_thead]:hidden" : ""}`}
        >
          {children}
        </table>
      </div>
    );
  },
};

export function LegalMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-a:text-primary">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
