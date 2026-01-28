import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ProviderMembership {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: string;
}

export function useProviderMemberships() {
  const { user } = useAuth();
  const [providers, setProviders] = useState<ProviderMembership[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchProviders = async () => {
    if (!user) {
      setProviders([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("provider_members")
        .select(`
          role,
          service_provider:service_providers (
            id,
            name,
            slug,
            logo_url
          )
        `)
        .eq("user_id", user.id);

      if (error) throw error;

      const memberships = data?.map((item) => ({
        id: item.service_provider.id,
        name: item.service_provider.name,
        slug: item.service_provider.slug,
        logo_url: item.service_provider.logo_url,
        role: item.role,
      })) || [];

      setProviders(memberships);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProviders();
  }, [user]);

  return {
    providers,
    loading,
    error,
    refetch: fetchProviders,
  };
}
