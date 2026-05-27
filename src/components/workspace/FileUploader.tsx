import { useRef, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { useWorkspaceFiles } from "@/hooks/useEngagementWorkspace";

interface FileUploaderProps {
  workspaceId: string;
  sessionId?: string | null;
}

const MAX_SIZE_BYTES = 50 * 1024 * 1024;

export function FileUploader({ workspaceId, sessionId }: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const { upload, isUploading } = useWorkspaceFiles(workspaceId, { sessionId });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    for (const file of Array.from(files)) {
      if (file.size > MAX_SIZE_BYTES) {
        toast({
          title: "File too large",
          description: `${file.name} exceeds the 50 MB limit.`,
          variant: "destructive",
        });
        continue;
      }
      try {
        await upload({ file });
        toast({ title: "Uploaded", description: file.name });
      } catch (err: any) {
        toast({
          title: `Upload failed: ${file.name}`,
          description: err?.message || "Unexpected error",
          variant: "destructive",
        });
      }
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
        dragOver ? "border-primary bg-primary/5" : "border-border"
      }`}
    >
      <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
      <p className="text-sm font-medium mb-1">
        Drag files here, or click to browse
      </p>
      <p className="text-xs text-muted-foreground mb-4">
        Transcripts, PDFs, recordings, images. Max 50 MB per file.
      </p>
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
        Choose files
      </Button>
    </div>
  );
}
