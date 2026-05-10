import { Fragment, ReactNode } from "react";

/**
 * Render a string with `backtick` segments converted to <code> elements.
 * Keeps everything else as plain text. Safe for short marketing copy.
 */
export function renderInlineCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
      return (
        <code
          key={i}
          className="font-mono text-[0.9em] px-1.5 py-0.5 rounded bg-muted text-foreground/90 break-all"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
