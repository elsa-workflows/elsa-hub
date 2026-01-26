import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Highlight, themes } from "prism-react-renderer";

interface CodeBlockProps {
  code: string;
  language: string;
  title?: string;
}

// Map our language props to Prism language identifiers
const languageMap: Record<string, string> = {
  bash: "bash",
  csharp: "csharp",
  json: "json",
  html: "markup",
  razor: "markup",
};

export function CodeBlock({ code, language, title }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const prismLanguage = languageMap[language] || language;

  return (
    <div className="rounded-lg overflow-hidden border bg-card">
      {title && (
        <div className="px-4 py-2 bg-muted/50 border-b flex items-center justify-between">
          <span className="text-sm font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{language}</span>
        </div>
      )}
      <div className="relative">
        <Highlight
          theme={themes.oneDark}
          code={code.trim()}
          language={prismLanguage}
        >
          {({ style, tokens, getLineProps, getTokenProps }) => (
            <pre
              className="p-4 overflow-x-auto text-sm"
              style={{ ...style, margin: 0, borderRadius: 0 }}
            >
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </pre>
          )}
        </Highlight>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8 bg-muted/80 hover:bg-muted"
          onClick={handleCopy}
        >
          {copied ? (
            <Check className="h-4 w-4 text-primary" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
