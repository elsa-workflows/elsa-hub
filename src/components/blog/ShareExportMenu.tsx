import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Share2, ExternalLink, Copy, Check, FileCode, FileText, Braces } from "lucide-react";
import { toast } from "sonner";

const SUPABASE_URL = "https://tehhrjepyfnhmsgtwzkf.supabase.co";
const CANONICAL_BASE = "https://www.elsa-workflows.io/blog";

type Format = "html" | "md" | "json";

function exportUrl(slug: string, format: Format) {
  return `${SUPABASE_URL}/functions/v1/blog-export/${encodeURIComponent(slug)}?format=${format}`;
}

function canonicalUrl(slug: string) {
  return `${CANONICAL_BASE}/${encodeURIComponent(slug)}.html`;
}

interface Props {
  slug: string;
}

export function ShareExportMenu({ slug }: Props) {
  const [copied, setCopied] = useState<Format | "medium" | null>(null);

  const copy = async (value: string, key: Format | "medium") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied((k) => (k === key ? null : k)), 1500);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const mediumUrl = canonicalUrl(slug);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share / Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>Medium import</DropdownMenuLabel>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); copy(mediumUrl, "medium"); }}>
          {copied === "medium" ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          Copy Medium import URL
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href="https://medium.com/p/import" target="_blank" rel="noreferrer noopener">
            <ExternalLink className="h-4 w-4 mr-2" />
            Open Medium importer
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>View as</DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <a href={exportUrl(slug, "html")} target="_blank" rel="noreferrer noopener">
            <FileCode className="h-4 w-4 mr-2" />
            HTML
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={exportUrl(slug, "md")} target="_blank" rel="noreferrer noopener">
            <FileText className="h-4 w-4 mr-2" />
            Markdown
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={exportUrl(slug, "json")} target="_blank" rel="noreferrer noopener">
            <Braces className="h-4 w-4 mr-2" />
            JSON
          </a>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuLabel>Copy URL</DropdownMenuLabel>
        {(["html", "md", "json"] as Format[]).map((f) => (
          <DropdownMenuItem
            key={f}
            onSelect={(e) => { e.preventDefault(); copy(exportUrl(slug, f), f); }}
          >
            {copied === f ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
            Copy {f.toUpperCase()} URL
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
