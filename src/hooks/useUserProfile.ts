import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface UserProfile {
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

interface UpdateProfileData {
  display_name?: string | null;
}

const AVATAR_BUCKET = "avatars";
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

function getAvatarPath(userId: string, file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "png";
  return `${userId}/avatar.${ext}`;
}

export function useUserProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const {
    data: profile,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async (): Promise<UserProfile | null> => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name, email, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (error) {
        console.error("Error fetching user profile:", error);
        throw error;
      }

      return data;
    },
    enabled: !!user?.id,
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfileData) => {
      if (!user?.id) throw new Error("Not authenticated");

      // Trim whitespace and convert empty string to null
      const displayName = data.display_name?.trim() || null;

      const { error } = await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (error) {
        console.error("Error updating profile:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Profile updated",
        description: "Your display name has been saved.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
      console.error("Profile update error:", error);
    },
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error("Not authenticated");

      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error("Please upload a JPEG, PNG, GIF, or WebP image.");
      }

      if (file.size > MAX_SIZE_BYTES) {
        throw new Error("Image must be smaller than 2 MB.");
      }

      const path = getAvatarPath(user.id, file);

      // Remove any existing avatar first so the folder stays clean and the
      // public URL cache is invalidated consistently.
      if (profile?.avatar_url) {
        const existingPath = profile.avatar_url.split("/").slice(-2).join("/");
        if (existingPath) {
          await supabase.storage.from(AVATAR_BUCKET).remove([existingPath]);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        console.error("Avatar upload error:", uploadError);
        throw new Error(uploadError.message);
      }

      const { data: urlData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      const cacheBustedUrl = `${publicUrl}?t=${Date.now()}`;

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: cacheBustedUrl,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Avatar profile update error:", updateError);
        throw updateError;
      }

      return cacheBustedUrl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Avatar updated",
        description: "Your profile picture has been saved.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to upload avatar. Please try again.",
        variant: "destructive",
      });
      console.error("Avatar upload error:", error);
    },
  });

  const removeAvatarMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Not authenticated");

      if (profile?.avatar_url) {
        const existingPath = profile.avatar_url.split("/").slice(-2).join("/");
        if (existingPath) {
          const { error: removeError } = await supabase.storage
            .from(AVATAR_BUCKET)
            .remove([existingPath]);

          if (removeError) {
            console.error("Avatar remove error:", removeError);
            // Continue to clear the profile field even if storage removal fails
          }
        }
      }

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      if (updateError) {
        console.error("Avatar profile clear error:", updateError);
        throw updateError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-profile", user?.id] });
      toast({
        title: "Avatar removed",
        description: "Your profile picture has been removed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove avatar. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    profile,
    isLoading,
    error,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    uploadAvatar: uploadAvatarMutation.mutate,
    isUploadingAvatar: uploadAvatarMutation.isPending,
    removeAvatar: removeAvatarMutation.mutate,
    isRemovingAvatar: removeAvatarMutation.isPending,
  };
}
