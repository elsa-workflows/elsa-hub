import { useState } from "react";
import { format } from "date-fns";
import {
  Download,
  Trash2,
  FileText,
  FileAudio,
  FileVideo,
  FileImage,
  File as FileIcon,
  Sparkles,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import {
  type WorkspaceFile,
  useWorkspaceFiles,
} from "@/hooks/useEngagementWorkspace";
import { TranscriptSummarizeButton } from "./TranscriptSummarizeButton";

interface FileListProps {
  workspaceId: string;
  onSummaryReady?: (payload: SummaryPayload) => void;
}

export interface SummaryPayload {
  fileId: string;
  fileName: string;
  summary: string;
  keyPoints: string[];
  actionItems: { title: string; owner_hint?: string; due_hint?: string }[];
  suggestedCategory?: string;
  suggestedMinutes?: number;
}

function iconFor(mime: string) {
  if (mime.startsWith("image/")) return FileImage;
  if (mime.startsWith("audio/")) return FileAudio;
  if (mime.startsWith("video/")) return FileVideo;
  if (mime.startsWith("text/") || mime === "application/pdf") return FileText;
  return FileIcon;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const TRANSCRIPT_EXT = /\.(vtt|srt|txt|md)$/i;
function isTranscript(file: WorkspaceFile) {
  return TRANSCRIPT_EXT.test(file.file_name) || file.mime_type.startsWith("text/");
}

export function FileList({ workspaceId, onSummaryReady }: FileListProps) {
  const { files, isLoading, remove, getSignedUrl } = useWorkspaceFiles(workspaceId);
  const [pendingDelete, setPendingDelete] = useState<WorkspaceFile | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (file: WorkspaceFile) => {
    setDownloadingId(file.id);
    try {
      const url = await getSignedUrl(file.storage_path, true);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err: any) {
      toast({
        title: "Download failed",
        description: err?.message || "Unable to generate download link",
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) return;
    try {
      await remove(pendingDelete);
      toast({ title: "File deleted" });
    } catch (err: any) {
      toast({
        title: "Delete failed",
        description: err?.message,
        variant: "destructive",
      });
    } finally {
      setPendingDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-muted/50 animate-pulse rounded" />
        ))}
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        <FileIcon className="h-10 w-10 mx-auto mb-3 opacity-50" />
        <p className="text-sm font-medium">No files yet</p>
        <p className="text-xs mt-1">
          Upload transcripts, briefs, recordings — anything that helps you collaborate.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>File</TableHead>
              <TableHead>Uploaded by</TableHead>
              <TableHead>Added</TableHead>
              <TableHead className="text-right">Size</TableHead>
              <TableHead className="w-[200px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const Icon = iconFor(file.mime_type);
              return (
                <TableRow key={file.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.file_name}</p>
                        {file.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {file.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {file.uploader_name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(file.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell className="text-right text-sm text-muted-foreground">
                    {formatBytes(file.size_bytes)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {isTranscript(file) && onSummaryReady && (
                        <TranscriptSummarizeButton
                          fileId={file.id}
                          fileName={file.file_name}
                          onReady={onSummaryReady}
                        />
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDownload(file)}
                        disabled={downloadingId === file.id}
                        title="Download"
                      >
                        {downloadingId === file.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setPendingDelete(file)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this file?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.file_name} will be permanently removed from the
              workspace. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
