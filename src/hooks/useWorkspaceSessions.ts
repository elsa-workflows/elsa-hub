import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type SessionType = Database["public"]["Enums"]["session_type"];

export interface ActionItem {
  title: string;
  owner_hint?: string;
  due_hint?: string;
}

export interface WorkspaceSession {
  id: string;
  workspace_id: string;
  title: string;
  session_type: SessionType;
  occurred_at: string;
  duration_minutes: number | null;
  participants: string[];
  notes_markdown: string;
  ai_summary: string | null;
  ai_key_points: string[] | null;
  ai_action_items: ActionItem[] | null;
  ai_generated_at: string | null;
  related_work_log_id: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

function normalize(row: any): WorkspaceSession {
  return {
    ...row,
    participants: Array.isArray(row.participants) ? row.participants : [],
    ai_key_points: Array.isArray(row.ai_key_points) ? row.ai_key_points : null,
    ai_action_items: Array.isArray(row.ai_action_items) ? row.ai_action_items : null,
  };
}

export function useWorkspaceSessions(workspaceId: string | undefined) {
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["workspace-sessions", workspaceId],
    queryFn: async (): Promise<WorkspaceSession[]> => {
      if (!workspaceId) return [];
      const { data, error } = await supabase
        .from("workspace_sessions")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("occurred_at", { ascending: false });
      if (error) throw error;
      return (data || []).map(normalize);
    },
    enabled: !!workspaceId,
  });

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      session_type: SessionType;
      occurred_at: string;
      duration_minutes?: number | null;
      participants?: string[];
      notes_markdown?: string;
    }) => {
      if (!workspaceId) throw new Error("No workspace");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("workspace_sessions")
        .insert({
          workspace_id: workspaceId,
          created_by: user.id,
          title: input.title,
          session_type: input.session_type,
          occurred_at: input.occurred_at,
          duration_minutes: input.duration_minutes ?? null,
          participants: input.participants ?? [],
          notes_markdown: input.notes_markdown ?? "",
        })
        .select()
        .single();
      if (error) throw error;
      return normalize(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-sessions", workspaceId] });
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<WorkspaceSession> }) => {
      const { data, error } = await supabase
        .from("workspace_sessions")
        .update(patch as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return normalize(data);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["workspace-sessions", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workspace-session", row.id] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workspace_sessions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["workspace-sessions", workspaceId] });
    },
  });

  const summarize = useMutation({
    mutationFn: async (sessionId: string) => {
      const { data, error } = await supabase.functions.invoke("summarize-session", {
        body: { sessionId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_d, sessionId) => {
      qc.invalidateQueries({ queryKey: ["workspace-sessions", workspaceId] });
      qc.invalidateQueries({ queryKey: ["workspace-session", sessionId] });
    },
  });

  return { list, create, update, remove, summarize };
}

export function useWorkspaceSession(sessionId: string | undefined) {
  return useQuery({
    queryKey: ["workspace-session", sessionId],
    queryFn: async (): Promise<WorkspaceSession | null> => {
      if (!sessionId) return null;
      const { data, error } = await supabase
        .from("workspace_sessions")
        .select("*")
        .eq("id", sessionId)
        .maybeSingle();
      if (error) throw error;
      return data ? normalize(data) : null;
    },
    enabled: !!sessionId,
  });
}
