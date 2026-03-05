import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, MessageSquare, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import type { ConversationSummary } from "@/hooks/useConversations";

interface NewConversationDialogProps {
  contextType: "org" | "provider";
  entityId: string;
  existingConversations: ConversationSummary[];
  onConversationCreated: (conv: ConversationSummary) => void;
}

interface OtherParty {
  id: string;
  name: string;
  slug: string;
  hasConversation: boolean;
}

export function NewConversationDialog({
  contextType,
  entityId,
  existingConversations,
  onConversationCreated,
}: NewConversationDialogProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<string | null>(null);

  // Fetch available counterparties
  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["conversation-parties", contextType, entityId],
    queryFn: async (): Promise<OtherParty[]> => {
      if (contextType === "provider") {
        // Provider → show customer organizations
        const { data: customers, error } = await supabase
          .from("provider_customers")
          .select("organization_id")
          .eq("service_provider_id", entityId);

        if (error) throw error;
        if (!customers || customers.length === 0) return [];

        const orgIds = customers.map((c) => c.organization_id);
        const { data: orgs } = await supabase
          .from("organizations")
          .select("id, name, slug")
          .in("id", orgIds)
          .order("name");

        const existingOrgIds = new Set(
          existingConversations.map((c) => c.organization_id)
        );

        return (orgs || []).map((org) => ({
          id: org.id,
          name: org.name,
          slug: org.slug,
          hasConversation: existingOrgIds.has(org.id),
        }));
      } else {
        // Org → show providers they are a customer of
        const { data: customerOf, error } = await supabase
          .from("provider_customers")
          .select("service_provider_id")
          .eq("organization_id", entityId);

        if (error) throw error;
        if (!customerOf || customerOf.length === 0) return [];

        const providerIds = customerOf.map((c) => c.service_provider_id);
        const { data: providers } = await supabase
          .from("service_providers")
          .select("id, name, slug")
          .in("id", providerIds)
          .order("name");

        const existingProviderIds = new Set(
          existingConversations.map((c) => c.service_provider_id)
        );

        return (providers || []).map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          hasConversation: existingProviderIds.has(p.id),
        }));
      }
    },
    enabled: open && !!entityId,
  });

  const filteredParties = parties.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = async (party: OtherParty) => {
    setCreating(party.id);
    try {
      const orgId = contextType === "org" ? entityId : party.id;
      const providerId = contextType === "provider" ? entityId : party.id;

      const { data, error } = await supabase.rpc("get_or_create_conversation", {
        p_org_id: orgId,
        p_provider_id: providerId,
      });

      if (error) throw error;

      // Build a ConversationSummary so we can select it immediately
      const newConv: ConversationSummary = {
        id: data as string,
        organization_id: orgId,
        service_provider_id: providerId,
        other_party_name: party.name,
        other_party_slug: party.slug,
        created_at: new Date().toISOString(),
        last_message_body: null,
        last_message_at: null,
        last_message_sender_name: null,
        unread_count: 0,
      };

      onConversationCreated(newConv);
      setOpen(false);
      setSearch("");
    } catch (err) {
      console.error("Failed to create conversation:", err);
    } finally {
      setCreating(null);
    }
  };

  const label =
    contextType === "provider" ? "customer" : "service provider";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1.5">
          <Plus className="h-4 w-4" />
          New
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a conversation</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Select a {label} to message
        </p>

        {parties.length > 5 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${label}s...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        )}

        <div className="max-h-[300px] overflow-y-auto space-y-1">
          {isLoading ? (
            <div className="space-y-2 py-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-12 bg-muted/50 animate-pulse rounded-lg"
                />
              ))}
            </div>
          ) : filteredParties.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">
                {parties.length === 0
                  ? `No ${label}s found`
                  : "No matching results"}
              </p>
            </div>
          ) : (
            filteredParties.map((party) => (
              <button
                key={party.id}
                onClick={() => handleSelect(party)}
                disabled={creating === party.id}
                className="w-full text-left p-3 rounded-lg transition-colors hover:bg-muted/50 flex items-center justify-between gap-2 disabled:opacity-50"
              >
                <div>
                  <p className="font-medium text-sm">{party.name}</p>
                  {party.hasConversation && (
                    <p className="text-xs text-muted-foreground">
                      Existing conversation
                    </p>
                  )}
                </div>
                {creating === party.id && (
                  <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
