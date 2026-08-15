import { Highlight, themes } from "prism-react-renderer";
import { useIsDark } from "@/hooks/use-is-dark";

interface HomeCodeSampleProps {
  code: string;
  language: string;
  ariaLabel: string;
  className?: string;
}

/**
 * Syntax-highlighted code sample for the homepage, rendered with
 * prism-react-renderer so C# and shell snippets are coloured consistently
 * with the rest of the site's code blocks.
 */
export function HomeCodeSample({ code, language, ariaLabel, className }: HomeCodeSampleProps) {
  const isDark = useIsDark();

  return (
    <Highlight theme={isDark ? themes.vsDark : themes.github} code={code.trim()} language={language}>
      {({ style, tokens, getLineProps, getTokenProps }) => (
        <pre
          tabIndex={0}
          aria-label={ariaLabel}
          className={
            "flex-1 min-w-0 max-w-full text-xs md:text-[13px] leading-relaxed rounded-lg bg-muted/60 border border-border p-4 overflow-x-auto font-mono focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring " +
            (className ?? "")
          }
          style={{ ...style, backgroundColor: "transparent", margin: 0 }}
        >
          <code>
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })}>
                {line.map((token, key) => (
                  <span key={key} {...getTokenProps({ token })} />
                ))}
              </div>
            ))}
          </code>
        </pre>
      )}
    </Highlight>
  );
}
