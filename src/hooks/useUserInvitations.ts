import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

export interface UserInvitation {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string;
  role: string;
  expires_at: string;
  created_at: string;
}

export function useUserInvitations() {
  const { user, session } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: invitations = [], isLoading } = useQuery({
    queryKey: ["user-invitations", user?.email, session?.access_token],
    queryFn: async () => {
      if (!user?.email || !session?.access_token) return [];

      // Verify the Supabase client has the current session
      const { data: currentSession } = await supabase.auth.getSession();
      if (!currentSession.session) {
        return [];
      }

      // Verify the session matches the expected user
      const sessionEmail = currentSession.session.user?.email;
      if (sessionEmail?.toLowerCase() !== user.email.toLowerCase()) {
        return [];
      }

      // Only fetch invitations sent TO the current user (not ones they created as admin)
      // IMPORTANT: Use regular join (not !inner) because the invitee may not have RLS access 
      // to the organizations table yet (they're not a member until they accept)
      const { data, error } = await supabase
        .from("invitations")
        .select(`
          id,
          organization_id,
          role,
          expires_at,
          created_at,
          organizations(name, slug)
        `)
        .eq("status", "pending")
        .ilike("email", user.email) // Filter to only show invitations for this user's email
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching invitations:", error);
        return [];
      }

      return (data || []).map((inv: any) => ({
        id: inv.id,
        organization_id: inv.organization_id,
        organization_name: inv.organizations.name,
        organization_slug: inv.organizations.slug,
        role: inv.role,
        expires_at: inv.expires_at,
        created_at: inv.created_at,
      })) as UserInvitation[];
    },
    enabled: !!user?.email && !!session?.access_token,
    staleTime: 0, // Always fetch fresh data on mount/account switch
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const acceptMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      // We need to get the token for this invitation to use accept_invitation
      // Since we can't access the token directly, we'll use a workaround
      // The accept_invitation RPC requires a token, but we have the invitation ID
      // We need to create a new RPC or use a different approach
      
      // For now, let's use direct table update approach via a new RPC
      // Actually, let's check if we can get the token from the invitation
      const { data: invitation } = await supabase
        .from("invitations")
        .select("token")
        .eq("id", invitationId)
        .single();

      if (!invitation?.token) {
        throw new Error("Could not retrieve invitation token");
      }

      const { data, error } = await supabase.rpc("accept_invitation", {
        p_token: invitation.token,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (orgId, invitationId) => {
      queryClient.invalidateQueries({ queryKey: ["user-invitations"] });
      queryClient.invalidateQueries({ queryKey: ["organizations"] });
      
      // Find the invitation to get org details
      const invitation = invitations.find((inv) => inv.id === invitationId);
      
      toast({
        title: "Welcome!",
        description: `You've joined ${invitation?.organization_name || "the organization"}.`,
      });

      if (invitation?.organization_slug) {
        navigate(`/org/${invitation.organization_slug}`);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to accept invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const ignoreMutation = useMutation({
    mutationFn: async (invitationId: string) => {
      const { error } = await supabase.rpc("ignore_invitation", {
        p_invitation_id: invitationId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-invitations"] });
      toast({
        title: "Invitation ignored",
        description: "The invitation has been dismissed.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to ignore invitation",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    invitations,
    isLoading,
    acceptInvitation: acceptMutation.mutate,
    ignoreInvitation: ignoreMutation.mutate,
    isAccepting: acceptMutation.isPending,
    isIgnoring: ignoreMutation.isPending,
  };
}
