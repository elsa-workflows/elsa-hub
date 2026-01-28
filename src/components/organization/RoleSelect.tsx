import { useState } from "react";
import { Crown, ShieldCheck, User, Loader2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface RoleSelectProps {
  memberId: string;
  currentRole: string;
  disabled?: boolean;
  onRoleChanged?: () => void;
}

const roles = [
  { value: "owner", label: "Owner", icon: Crown },
  { value: "admin", label: "Admin", icon: ShieldCheck },
  { value: "member", label: "Member", icon: User },
];

export function RoleSelect({
  memberId,
  currentRole,
  disabled,
  onRoleChanged,
}: RoleSelectProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  const handleRoleChange = async (newRole: string) => {
    if (newRole === currentRole) return;
    
    setIsUpdating(true);

    try {
      const { error } = await supabase
        .from("organization_members")
        .update({ role: newRole as "owner" | "admin" | "member" })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Role updated",
        description: `Member role changed to ${newRole}`,
      });

      onRoleChanged?.();
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update role",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  // Don't allow changing owner role through this UI
  if (currentRole === "owner" || disabled) {
    const RoleIcon = roles.find(r => r.value === currentRole)?.icon || User;
    return (
      <div className="flex items-center gap-1 text-sm text-muted-foreground">
        <RoleIcon className="h-3 w-3" />
        <span>{roles.find(r => r.value === currentRole)?.label || currentRole}</span>
      </div>
    );
  }

  return (
    <Select
      value={currentRole}
      onValueChange={handleRoleChange}
      disabled={isUpdating}
    >
      <SelectTrigger className="w-28 h-8">
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SelectValue />
        )}
      </SelectTrigger>
      <SelectContent>
        {roles.filter(r => r.value !== "owner").map((role) => (
          <SelectItem key={role.value} value={role.value}>
            <div className="flex items-center gap-2">
              <role.icon className="h-3 w-3" />
              {role.label}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
