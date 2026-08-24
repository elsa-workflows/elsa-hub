import { useRef, useState } from "react";
import { Camera, Trash2, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

interface AvatarUploadCardProps {
  avatarUrl: string | null | undefined;
  onUpload: (file: File) => void;
  onRemove: () => void;
  isUploading?: boolean;
  isRemoving?: boolean;
}

export function AvatarUploadCard({
  avatarUrl,
  onUpload,
  onRemove,
  isUploading = false,
  isRemoving = false,
}: AvatarUploadCardProps) {
  const { user } = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const userInitials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "U";

  const hasAvatar = Boolean(avatarUrl);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
    }
    // Reset so the same file can be selected again if needed
    event.target.value = "";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragOver(false);
  };

  const isBusy = isUploading || isRemoving;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Picture</CardTitle>
        <CardDescription>
          Upload a photo to personalize your account. JPEG, PNG, GIF, or WebP up to 2 MB.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div
            className="relative group"
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <Avatar
              className={`h-24 w-24 transition-all ${
                dragOver ? "ring-4 ring-primary/30" : ""
              }`}
            >
              <AvatarImage
                src={avatarUrl ?? undefined}
                alt="Profile picture"
                className="object-cover"
              />
              <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                {userInitials}
              </AvatarFallback>
            </Avatar>

            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/80">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={isBusy}
              className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-0 cursor-pointer"
              aria-label="Change profile picture"
            >
              <Camera className="h-6 w-6" />
            </button>
          </div>

          <div className="flex flex-col gap-3 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
                className="gap-2"
              >
                {isUploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
                {hasAvatar ? "Change picture" : "Upload picture"}
              </Button>

              {hasAvatar && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={onRemove}
                  disabled={isBusy}
                  className="gap-2 text-destructive hover:text-destructive"
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Remove
                </Button>
              )}
            </div>

            <p className="text-sm text-muted-foreground">
              Drag and drop an image here, or click to browse.
            </p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileChange}
          className="hidden"
          aria-label="Upload profile picture"
        />
      </CardContent>
    </Card>
  );
}
