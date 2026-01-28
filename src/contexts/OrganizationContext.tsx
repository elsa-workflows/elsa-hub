import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useOrganizations } from "@/hooks/useOrganizations";

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface OrganizationContextType {
  selectedOrganization: Organization | null;
  organizations: Organization[];
  loading: boolean;
  selectOrganization: (org: Organization | null) => void;
  isAdmin: boolean;
}

const OrganizationContext = createContext<OrganizationContextType | null>(null);

const STORAGE_KEY = "selected_organization";

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { organizations, loading } = useOrganizations();
  const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        setSelectedOrganization(JSON.parse(stored));
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }, []);

  // Auto-select if user has only one organization
  useEffect(() => {
    if (!loading && organizations.length === 1 && !selectedOrganization) {
      const org = organizations[0];
      const selected = { id: org.id, name: org.name, slug: org.slug };
      setSelectedOrganization(selected);
      setIsAdmin(org.role === "admin" || org.role === "owner");
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selected));
    }
  }, [organizations, loading, selectedOrganization]);

  // Validate selected org still exists in user's orgs
  useEffect(() => {
    if (!loading && selectedOrganization && organizations.length > 0) {
      const found = organizations.find((o) => o.id === selectedOrganization.id);
      if (!found) {
        setSelectedOrganization(null);
        setIsAdmin(false);
        localStorage.removeItem(STORAGE_KEY);
      } else {
        setIsAdmin(found.role === "admin" || found.role === "owner");
      }
    }
  }, [organizations, loading, selectedOrganization]);

  const selectOrganization = (org: Organization | null) => {
    setSelectedOrganization(org);
    if (org) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(org));
      const found = organizations.find((o) => o.id === org.id);
      setIsAdmin(found?.role === "admin" || found?.role === "owner");
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setIsAdmin(false);
    }
  };

  return (
    <OrganizationContext.Provider
      value={{
        selectedOrganization,
        organizations: organizations.map((o) => ({ id: o.id, name: o.name, slug: o.slug })),
        loading,
        selectOrganization,
        isAdmin,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  );
}

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error("useOrganization must be used within an OrganizationProvider");
  }
  return context;
}
