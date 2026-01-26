import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
  created_at: string;
}

export function useOrganizations() {
  const { user } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchOrganizations = async () => {
    if (!user) {
      setOrganizations([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("organization_members")
        .select(`
          role,
          organization:organizations (
            id,
            name,
            slug,
            logo_url,
            created_at
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const orgs = data?.map((item) => ({
        id: item.organization.id,
        name: item.organization.name,
        slug: item.organization.slug,
        logo_url: item.organization.logo_url,
        role: item.role,
        created_at: item.organization.created_at,
      })) || [];

      setOrganizations(orgs);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, [user]);

  const createOrganization = async (name: string, slug: string) => {
    if (!user) throw new Error("Not authenticated");

    const { data, error } = await supabase
      .from("organizations")
      .insert({ name, slug })
      .select()
      .single();

    if (error) throw error;

    await fetchOrganizations();
    return data;
  };

  return {
    organizations,
    loading,
    error,
    refetch: fetchOrganizations,
    createOrganization,
  };
}
