import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Building2, KeyRound, CheckCircle2, ShieldOff, CalendarClock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import {
  useRegistryGrants,
  type ReconciliationRow,
  type RegistryGrantRow,
} from "@/hooks/useRegistryGrants";
import {
  MarkRevokedDialog,
  RecordIssuedDialog,
  UpdateExpiryDialog,
} from "@/components/provider/registry/RegistryGrantDialogs";

function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "active":
      return "default";
    case "revoked":
      return "destructive";
    case "expired":
      return "secondary";
    default:
      return "outline";
  }
}

export default function ProviderRegistryAccess() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, isLoading: providerLoading, notFound, isAdmin } = useProviderDashboard(slug);
  const { reconciliation, grants, isLoading, recordIssued, markRevoked, updateExpiry } =
    useRegistryGrants(provider?.id);

  const [issueTarget, setIssueTarget] = useState<ReconciliationRow | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{
    id: string;
    organizationName: string;
    tokenName: string | null;
  } | null>(null);
  const [expiryTarget, setExpiryTarget] = useState<{
    id: string;
    current: string | null;
    suggested: string | null;
  } | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const groups = useMemo(
    () => ({
      needs_issue: reconciliation.filter((r) => r.reason === "needs_issue"),
      needs_revoke: reconciliation.filter((r) => r.reason === "needs_revoke"),
      expiry_drift: reconciliation.filter((r) => r.reason === "expiry_drift"),
    }),
    [reconciliation]
  );

  const filteredGrants = useMemo(
    () => (statusFilter === "all" ? grants : grants.filter((g) => g.status === statusFilter)),
    [grants, statusFilter]
  );

  if (notFound && !providerLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4">
        <Building2 className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Provider Not Found</h1>
        <p className="text-muted-foreground mb-6">
          This service provider doesn't exist or you don't have access to it.
        </p>
        <Button asChild>
          <Link to="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!providerLoading && !isAdmin) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-4 text-center">
        <ShieldOff className="h-16 w-16 text-muted-foreground/50 mb-4" />
        <h1 className="text-2xl font-bold mb-2">Admins only</h1>
        <p className="text-muted-foreground">
          Registry access records are visible to provider admins.
        </p>
      </div>
    );
  }

  const nothingToReconcile =
    !isLoading &&
    groups.needs_issue.length === 0 &&
    groups.needs_revoke.length === 0 &&
    groups.expiry_drift.length === 0;

  const tierLabel = (row: ReconciliationRow) => row.tier ?? "—";

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <KeyRound className="h-6 w-6" />
          Registry access
        </h1>
        <p className="text-muted-foreground mt-1 max-w-3xl">
          Tokens are issued and revoked in the container registry itself. This page records what was
          done there and reconciles it against active subscriptions — it does not grant or remove
          access, and it never stores token passwords.
        </p>
      </div>

      {/* Needs attention */}
      <Card>
        <CardHeader>
          <CardTitle>Needs attention</CardTitle>
          <CardDescription>Work list, derived from subscriptions and grant records</CardDescription>
        </CardHeader>
        <CardContent className="space-y-8">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : nothingToReconcile ? (
            <div className="flex flex-col items-center text-center py-10">
              <CheckCircle2 className="h-10 w-10 text-primary mb-3" />
              <p className="font-medium">Nothing to reconcile</p>
              <p className="text-sm text-muted-foreground mt-1">
                Every entitled subscriber has a matching token, and no token outlives its
                subscription.
              </p>
            </div>
          ) : (
            <>
              {groups.needs_issue.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Entitled, no active token</h2>
                    <p className="text-sm text-muted-foreground">
                      Paying subscribers who cannot pull yet.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Period end</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.needs_issue.map((row) => (
                        <TableRow key={row.subscription_id}>
                          <TableCell className="font-medium">{row.organization_name}</TableCell>
                          <TableCell>{tierLabel(row)}</TableCell>
                          <TableCell>{row.product_name ?? "—"}</TableCell>
                          <TableCell>{formatDate(row.current_period_end)}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" onClick={() => setIssueTarget(row)}>
                              Record issued token
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              {groups.needs_revoke.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold">Access to remove</h2>
                    <p className="text-sm text-muted-foreground">
                      Subscription canceled, or lapsed more than 30 days ago.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Tier</TableHead>
                        <TableHead>Token name</TableHead>
                        <TableHead>Period end</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.needs_revoke.map((row) => (
                        <TableRow key={row.registry_grant_id ?? row.subscription_id}>
                          <TableCell className="font-medium">{row.organization_name}</TableCell>
                          <TableCell>{tierLabel(row)}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.registry_token_name ?? "—"}
                          </TableCell>
                          <TableCell>{formatDate(row.current_period_end)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={!row.registry_grant_id}
                              onClick={() =>
                                setRevokeTarget({
                                  id: row.registry_grant_id!,
                                  organizationName: row.organization_name ?? "this organisation",
                                  tokenName: row.registry_token_name,
                                })
                              }
                            >
                              Mark revoked
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}

              {groups.expiry_drift.length > 0 && (
                <section className="space-y-3">
                  <div>
                    <h2 className="font-semibold flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                      Token outlives subscription
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      Token expiry is later than the subscription period end.
                    </p>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Organisation</TableHead>
                        <TableHead>Token name</TableHead>
                        <TableHead>Period end</TableHead>
                        <TableHead>Token expiry</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groups.expiry_drift.map((row) => (
                        <TableRow key={row.registry_grant_id ?? row.subscription_id}>
                          <TableCell className="font-medium">{row.organization_name}</TableCell>
                          <TableCell className="font-mono text-xs">
                            {row.registry_token_name ?? "—"}
                          </TableCell>
                          <TableCell>{formatDate(row.current_period_end)}</TableCell>
                          <TableCell className="text-destructive">
                            {formatDate(row.token_expires_at)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={!row.registry_grant_id}
                              onClick={() =>
                                setExpiryTarget({
                                  id: row.registry_grant_id!,
                                  current: row.token_expires_at,
                                  suggested: row.current_period_end,
                                })
                              }
                            >
                              <CalendarClock className="h-4 w-4 mr-2" />
                              Update expiry
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </section>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* All grants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle>All grants</CardTitle>
            <CardDescription>Every registry grant recorded for {provider?.name}</CardDescription>
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="revoked">Revoked</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : filteredGrants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <KeyRound className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No grants recorded{statusFilter !== "all" ? " with this status" : ""}.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organisation</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Token name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Issued</TableHead>
                  <TableHead>Token expiry</TableHead>
                  <TableHead>Revoked</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredGrants.map((grant: RegistryGrantRow) => (
                  <TableRow key={grant.id}>
                    <TableCell className="font-medium">
                      {grant.organizations?.name ?? "—"}
                    </TableCell>
                    <TableCell>{grant.subscriptions?.products?.tier ?? "—"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {grant.registry_token_name}
                      <div className="text-muted-foreground">{grant.scope_map_name}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(grant.status)}>{grant.status}</Badge>
                    </TableCell>
                    <TableCell>{formatDate(grant.issued_at)}</TableCell>
                    <TableCell>{formatDate(grant.token_expires_at)}</TableCell>
                    <TableCell>
                      {grant.revoked_at ? (
                        <div>
                          <p>{formatDate(grant.revoked_at)}</p>
                          {grant.revoked_reason && (
                            <p className="text-xs text-muted-foreground">{grant.revoked_reason}</p>
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          setExpiryTarget({
                            id: grant.id,
                            current: grant.token_expires_at,
                            suggested: null,
                          })
                        }
                      >
                        Update expiry
                      </Button>
                      {grant.status !== "revoked" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setRevokeTarget({
                              id: grant.id,
                              organizationName: grant.organizations?.name ?? "this organisation",
                              tokenName: grant.registry_token_name,
                            })
                          }
                        >
                          Mark revoked
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <RecordIssuedDialog
        open={!!issueTarget}
        onOpenChange={(open) => !open && setIssueTarget(null)}
        organizationName={issueTarget?.organization_name ?? ""}
        periodEnd={issueTarget?.current_period_end ?? null}
        isSaving={recordIssued.isPending}
        onSave={(values) => {
          if (!issueTarget?.organization_id || !issueTarget.subscription_id) return;
          recordIssued.mutate(
            {
              organization_id: issueTarget.organization_id,
              subscription_id: issueTarget.subscription_id,
              ...values,
            },
            { onSuccess: () => setIssueTarget(null) }
          );
        }}
      />

      <MarkRevokedDialog
        open={!!revokeTarget}
        onOpenChange={(open) => !open && setRevokeTarget(null)}
        organizationName={revokeTarget?.organizationName ?? ""}
        tokenName={revokeTarget?.tokenName ?? null}
        isSaving={markRevoked.isPending}
        onSave={(reason) => {
          if (!revokeTarget) return;
          markRevoked.mutate(
            { id: revokeTarget.id, reason },
            { onSuccess: () => setRevokeTarget(null) }
          );
        }}
      />

      <UpdateExpiryDialog
        open={!!expiryTarget}
        onOpenChange={(open) => !open && setExpiryTarget(null)}
        currentExpiry={expiryTarget?.current ?? null}
        suggestedExpiry={expiryTarget?.suggested ?? null}
        isSaving={updateExpiry.isPending}
        onSave={(iso) => {
          if (!expiryTarget) return;
          updateExpiry.mutate(
            { id: expiryTarget.id, token_expires_at: iso },
            { onSuccess: () => setExpiryTarget(null) }
          );
        }}
      />
    </div>
  );
}
