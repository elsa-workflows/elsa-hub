import { useState } from "react";
import { Mail, Github, Check, Link2, Unlink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuthProviders, ProviderConfig } from "@/hooks/useAuthProviders";
import { useAuth } from "@/contexts/AuthContext";
import { SetPasswordDialog } from "./SetPasswordDialog";

const PROVIDER_ICONS: Record<string, React.ReactNode> = {
  email: <Mail className="h-5 w-5" />,
  github: <Github className="h-5 w-5" />,
  // Add more provider icons here as needed
};

export function ConnectedAccountsCard() {
  const { user } = useAuth();
  const {
    providers,
    isProviderConnected,
    getIdentityForProvider,
    canDisconnect,
    linkOAuthProvider,
    unlinkProvider,
    setupEmailPassword,
    isLinking,
    isUnlinking,
    isSettingPassword,
  } = useAuthProviders();

  const [setPasswordOpen, setSetPasswordOpen] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [providerToDisconnect, setProviderToDisconnect] =
    useState<ProviderConfig | null>(null);

  const handleConnect = (provider: ProviderConfig) => {
    if (provider.type === "oauth") {
      linkOAuthProvider(provider.id as "github" | "google" | "apple" | "azure");
    }
  };

  const handleDisconnectClick = (provider: ProviderConfig) => {
    setProviderToDisconnect(provider);
    setDisconnectDialogOpen(true);
  };

  const handleConfirmDisconnect = async () => {
    if (!providerToDisconnect) return;

    const identity = getIdentityForProvider(providerToDisconnect.id);
    if (identity) {
      await unlinkProvider(identity);
    }
    setDisconnectDialogOpen(false);
    setProviderToDisconnect(null);
  };

  const getProviderStatus = (provider: ProviderConfig) => {
    const connected = isProviderConnected(provider.id);
    const identity = getIdentityForProvider(provider.id);

    if (provider.id === "email") {
      // For email provider, show user's email if connected
      return {
        connected,
        detail: connected ? user?.email : "Not set up",
      };
    }

    // For OAuth providers, show provider username if available
    return {
      connected,
      detail: connected
        ? identity?.identity_data?.preferred_username ||
          identity?.identity_data?.email ||
          "Connected"
        : "Not connected",
    };
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Connected Accounts</CardTitle>
          <CardDescription>
            Manage your login methods. You can connect multiple accounts to sign
            in with any of them.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {providers.map((provider, index) => {
            const { connected, detail } = getProviderStatus(provider);
            const isEmailProvider = provider.type === "email";
            const showSetupPassword = isEmailProvider && !connected;

            return (
              <div key={provider.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {PROVIDER_ICONS[provider.id] || (
                        <Link2 className="h-5 w-5" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{provider.name}</p>
                      <p className="text-sm text-muted-foreground">{detail}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {connected ? (
                      <>
                        <Badge
                          variant="secondary"
                          className="gap-1 bg-primary/10 text-primary"
                        >
                          <Check className="h-3 w-3" />
                          Connected
                        </Badge>
                        {canDisconnect && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDisconnectClick(provider)}
                            disabled={isUnlinking}
                            title="Disconnect"
                          >
                            {isUnlinking ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        )}
                      </>
                    ) : showSetupPassword ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSetPasswordOpen(true)}
                        disabled={isSettingPassword}
                      >
                        {isSettingPassword && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Set Up Password
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleConnect(provider)}
                        disabled={isLinking}
                      >
                        {isLinking && (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <SetPasswordDialog
        open={setPasswordOpen}
        onOpenChange={setSetPasswordOpen}
        onSubmit={setupEmailPassword}
        isLoading={isSettingPassword}
      />

      <AlertDialog
        open={disconnectDialogOpen}
        onOpenChange={setDisconnectDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disconnect {providerToDisconnect?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              You will no longer be able to sign in using{" "}
              {providerToDisconnect?.name}. Make sure you have another login
              method set up before disconnecting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDisconnect}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Disconnect
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
