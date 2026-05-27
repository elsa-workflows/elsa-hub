import { useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { SummaryPayload } from "./FileList";

interface Props {
  fileId: string;
  fileName: string;
  onReady: (payload: SummaryPayload) => void;
}

export function TranscriptSummarizeButton({ fileId, fileName, onReady }: Props) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("summarize-transcript", {
        body: { fileId },
      });
      if (error) throw error;
      if (!data) throw new Error("Empty response from summarizer");
      onReady({
        fileId,
        fileName,
        summary: data.summary || "",
        keyPoints: data.key_points || [],
        actionItems: data.action_items || [],
        suggestedCategory: data.suggested_category,
        suggestedMinutes: data.suggested_minutes,
      });
      toast({ title: "Summary ready", description: "Review and confirm to log work." });
    } catch (err: any) {
      toast({
        title: "Summarization failed",
        description: err?.message || "Could not summarize this transcript.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleClick}
      disabled={loading}
      title="Summarize + extract actions"
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Sparkles className="h-4 w-4" />
      )}
    </Button>
  );
}
