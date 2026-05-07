import { AlertTriangle } from "lucide-react";
import { CodeBlock } from "@/components/get-started";

const adminFeatureJson = `{
  "CShells": {
    "Shells": {
      "Default": {
        "Features": {
          "DefaultAdminUser": {
            "AdminUsername": "admin",
            "AdminPassword": "YourSecurePassword123!",
            "AdminRoleName": "admin",
            "AdminRolePermissions": ["*"]
          },
          "Identity": {
            "SigningKey": "your-secure-256-bit-signing-key-here"
          }
        }
      }
    }
  }
}`;

export function PerShellAdminExplainer() {
  return (
    <div className="space-y-4">
      <h2 className="text-3xl font-bold">Per-shell admin & identity (CShells)</h2>
      <p className="text-muted-foreground">
        Admin users and identity are configured per shell. The default shell uses the{" "}
        <code className="font-mono">DefaultAdminUser</code> feature:
      </p>
      <CodeBlock code={adminFeatureJson} language="json" title="config.json — default shell admin" />
      <div className="rounded-lg border border-warning/30 bg-warning/5 p-4 flex gap-3">
        <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
        <p className="text-sm">
          <strong>Set a real signing key in production.</strong> Generate a secure 256-bit value for{" "}
          <code className="font-mono">Identity.SigningKey</code>. Never ship the placeholder.
        </p>
      </div>
    </div>
  );
}
