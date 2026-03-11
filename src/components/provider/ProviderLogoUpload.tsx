import { useState, useRef } from "react";
import { Upload, Loader2, X, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface ProviderLogoUploadProps {
  providerId: string;
  currentLogoUrl: string | null;
  slug: string | undefined;
}

export function ProviderLogoUpload({ providerId, currentLogoUrl, slug }: ProviderLogoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type and size
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml"];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, WebP, or SVG image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size must be under 2MB");
      return;
    }

    setIsUploading(true);
    try {
      const ext = file.name.split(".").pop() || "png";
      const filePath = `${providerId}/logo.${ext}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("provider-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("provider-logos")
        .getPublicUrl(filePath);

      // Update provider record
      const { error: updateError } = await supabase
        .from("service_providers")
        .update({ logo_url: urlData.publicUrl })
        .eq("id", providerId);

      if (updateError) throw updateError;

      toast.success("Logo updated");
      queryClient.invalidateQueries({ queryKey: ["provider", slug] });
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
    } catch (err) {
      console.error("Failed to upload logo:", err);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = async () => {
    setIsRemoving(true);
    try {
      // Clear the logo_url on the provider
      const { error } = await supabase
        .from("service_providers")
        .update({ logo_url: null })
        .eq("id", providerId);

      if (error) throw error;

      toast.success("Logo removed");
      queryClient.invalidateQueries({ queryKey: ["provider", slug] });
      queryClient.invalidateQueries({ queryKey: ["service-providers"] });
    } catch (err) {
      console.error("Failed to remove logo:", err);
      toast.error("Failed to remove logo");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div className="space-y-2 pt-2">
      <Label>Logo</Label>
      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="h-16 w-16 rounded-lg border bg-muted/30 flex items-center justify-center overflow-hidden shrink-0">
          {currentLogoUrl ? (
            <img
              src={currentLogoUrl}
              alt="Provider logo"
              className="h-full w-full object-contain"
            />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/50" />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="gap-1.5"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {currentLogoUrl ? "Replace" : "Upload"}
            </Button>
            {currentLogoUrl && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRemove}
                disabled={isRemoving}
                className="gap-1.5 text-muted-foreground"
              >
                {isRemoving ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <X className="h-3.5 w-3.5" />
                )}
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            JPG, PNG, WebP, or SVG. Max 2MB.
          </p>
        </div>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/svg+xml"
        className="hidden"
        onChange={handleUpload}
      />
    </div>
  );
}
