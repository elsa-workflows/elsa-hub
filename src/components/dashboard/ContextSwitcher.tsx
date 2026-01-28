import { useState } from "react";
import { Check, ChevronsUpDown, Building2, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { useOrganizations } from "@/hooks/useOrganizations";
import { useProviderMemberships } from "@/hooks/useProviderMemberships";
import { useDashboardContext } from "@/contexts/DashboardContext";
import { CreateOrganizationDialog } from "@/components/account/CreateOrganizationDialog";

export function ContextSwitcher() {
  const [open, setOpen] = useState(false);
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  
  const { contextType, slug, navigateToContext } = useDashboardContext();
  const { organizations, createOrganization } = useOrganizations();
  const { providers } = useProviderMemberships();

  // Find current selection
  const currentOrg = organizations.find((org) => org.slug === slug);
  const currentProvider = providers.find((p) => p.slug === slug);
  const current = contextType === "org" ? currentOrg : currentProvider;

  const handleSelect = (type: "org" | "provider", itemSlug: string) => {
    navigateToContext(type, itemSlug);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "justify-between bg-sidebar-accent/50 border-sidebar-border hover:bg-sidebar-accent",
            collapsed ? "w-8 p-0" : "w-full"
          )}
        >
          {collapsed ? (
            current ? (
              <div className="flex h-8 w-8 items-center justify-center">
                {contextType === "org" ? (
                  <Building2 className="h-4 w-4" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
              </div>
            ) : (
              <Building2 className="h-4 w-4" />
            )
          ) : (
            <>
              <div className="flex items-center gap-2 truncate">
                {current ? (
                  <>
                    {contextType === "org" ? (
                      <Building2 className="h-4 w-4 shrink-0" />
                    ) : (
                      <Briefcase className="h-4 w-4 shrink-0" />
                    )}
                    <span className="truncate">{current.name}</span>
                  </>
                ) : (
                  <>
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="text-muted-foreground">Select context...</span>
                  </>
                )}
              </div>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[240px] p-0 bg-popover" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            
            {organizations.length > 0 && (
              <CommandGroup heading="Organizations">
                {organizations.map((org) => (
                  <CommandItem
                    key={org.id}
                    value={`org-${org.slug}`}
                    onSelect={() => handleSelect("org", org.slug)}
                    className="flex items-center gap-2"
                  >
                    <Building2 className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{org.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {org.role}
                    </Badge>
                    {contextType === "org" && slug === org.slug && (
                      <Check className="h-4 w-4 shrink-0" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {providers.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup heading="Service Provider">
                  {providers.map((provider) => (
                    <CommandItem
                      key={provider.id}
                      value={`provider-${provider.slug}`}
                      onSelect={() => handleSelect("provider", provider.slug)}
                      className="flex items-center gap-2"
                    >
                      <Briefcase className="h-4 w-4 shrink-0" />
                      <span className="truncate flex-1">{provider.name}</span>
                      <Badge variant="secondary" className="text-xs">
                        {provider.role}
                      </Badge>
                      {contextType === "provider" && slug === provider.slug && (
                        <Check className="h-4 w-4 shrink-0" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            <CommandSeparator />
            <CommandGroup>
              <CreateOrganizationDialog 
                onCreateOrganization={createOrganization}
                trigger={
                  <button
                    type="button"
                    className="relative flex cursor-pointer select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground w-full"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Organization</span>
                  </button>
                }
              />
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
