import { useEffect, useState } from "react";
import { Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const VISITOR_KEY = "elsa.blog.visitor_id";

function getVisitorId(): string {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return "anonymous-" + Math.random().toString(36).slice(2);
  }
}

// Dedupe per tab so quick remounts (e.g. StrictMode) don't double-call.
const recorded = new Set<string>();

interface Props {
  slug: string;
}

export function BlogPostViews({ slug }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (recorded.has(slug)) {
          const { data } = await supabase.rpc("get_blog_view_counts", {
            p_slugs: [slug],
          });
          if (cancelled) return;
          const row = (data ?? []).find((r: { slug: string }) => r.slug === slug);
          setCount(row ? Number(row.total) : 0);
          return;
        }
        recorded.add(slug);
        const { data, error } = await supabase.rpc("record_blog_view", {
          p_slug: slug,
          p_visitor_id: getVisitorId(),
        });
        if (cancelled) return;
        if (!error && data !== null && data !== undefined) {
          setCount(Number(data));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (count === null) return null;

  return (
    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground tabular-nums">
      <Eye className="h-3.5 w-3.5" />
      {count.toLocaleString()} {count === 1 ? "view" : "views"}
    </span>
  );
}
