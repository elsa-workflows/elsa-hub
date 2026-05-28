import { useEffect, useState } from "react";
import { Heart, Share2, Link2, Check, Twitter, Linkedin, Facebook, Mail } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
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

function likedSet(): Set<string> {
  try {
    const raw = localStorage.getItem("elsa.blog.liked");
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function persistLiked(set: Set<string>) {
  try {
    localStorage.setItem("elsa.blog.liked", JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

interface Props {
  slug: string;
  title: string;
  url: string;
  description?: string;
}

export function BlogPostActions({ slug, title, url, description }: Props) {
  const [count, setCount] = useState<number | null>(null);
  const [liked, setLiked] = useState<boolean>(() => likedSet().has(slug));
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc("get_blog_like_counts", {
        p_slugs: [slug],
      });
      if (cancelled || error) return;
      const row = (data ?? []).find((r: { slug: string }) => r.slug === slug);
      setCount(row ? Number(row.total) : 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const handleLike = async () => {
    if (pending) return;
    setPending(true);
    // optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setCount((c) => (c === null ? c : Math.max(0, c + (wasLiked ? -1 : 1))));
    try {
      const { data, error } = await supabase.rpc("toggle_blog_like", {
        p_slug: slug,
        p_visitor_id: getVisitorId(),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setLiked(Boolean(row.liked));
        setCount(Number(row.total));
        const ls = likedSet();
        if (row.liked) ls.add(slug);
        else ls.delete(slug);
        persistLiked(ls);
      }
    } catch (e) {
      // revert
      setLiked(wasLiked);
      setCount((c) => (c === null ? c : Math.max(0, c + (wasLiked ? 1 : -1))));
      toast.error(e instanceof Error ? e.message : "Couldn't update like.");
    } finally {
      setPending(false);
    }
  };

  const shareTargets = (() => {
    const u = encodeURIComponent(url);
    const t = encodeURIComponent(title);
    const d = encodeURIComponent(description ?? "");
    return {
      twitter: `https://twitter.com/intent/tweet?url=${u}&text=${t}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
      reddit: `https://www.reddit.com/submit?url=${u}&title=${t}`,
      email: `mailto:?subject=${t}&body=${d}%0A%0A${u}`,
    };
  })();

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await (navigator as Navigator & {
          share: (data: ShareData) => Promise<void>;
        }).share({ title, text: description, url });
      } catch {
        /* user cancelled */
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleLike}
        disabled={pending}
        aria-pressed={liked}
        aria-label={liked ? "Unlike this post" : "Like this post"}
        className={cn(liked && "border-primary/60 text-primary")}
      >
        <Heart
          className={cn("h-4 w-4 mr-2 transition-colors", liked && "fill-current")}
        />
        {liked ? "Liked" : "Like"}
        {count !== null && (
          <span className="ml-2 tabular-nums text-xs text-muted-foreground">
            {count}
          </span>
        )}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" aria-label="Share this post">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Share on</DropdownMenuLabel>
          <DropdownMenuItem asChild>
            <a href={shareTargets.twitter} target="_blank" rel="noreferrer noopener">
              <Twitter className="h-4 w-4 mr-2" />X / Twitter
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={shareTargets.linkedin} target="_blank" rel="noreferrer noopener">
              <Linkedin className="h-4 w-4 mr-2" />
              LinkedIn
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={shareTargets.facebook} target="_blank" rel="noreferrer noopener">
              <Facebook className="h-4 w-4 mr-2" />
              Facebook
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={shareTargets.reddit} target="_blank" rel="noreferrer noopener">
              <Share2 className="h-4 w-4 mr-2" />
              Reddit
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={shareTargets.email}>
              <Mail className="h-4 w-4 mr-2" />
              Email
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => { e.preventDefault(); copyLink(); }}>
            {copied ? <Check className="h-4 w-4 mr-2" /> : <Link2 className="h-4 w-4 mr-2" />}
            {copied ? "Copied" : "Copy link"}
          </DropdownMenuItem>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleNativeShare(); }}>
              <Share2 className="h-4 w-4 mr-2" />
              More…
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
