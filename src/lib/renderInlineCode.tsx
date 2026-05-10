import { Fragment, ReactNode } from "react";

/**
 * Render a string with `backtick` segments converted to <code> elements
 * and **double-asterisk** segments converted to <strong>. Safe for short copy.
 */
export function renderInlineCode(text: string): ReactNode {
  const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*)/g);
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
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold text-foreground">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={i}>{part}</Fragment>;
  });
}
