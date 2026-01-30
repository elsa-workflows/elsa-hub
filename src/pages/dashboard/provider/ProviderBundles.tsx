import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Building2, Package, DollarSign, Clock, Repeat, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import { useBundleManagement, type BundleFormData } from "@/hooks/useBundleManagement";
import { EditBundleDialog } from "@/components/provider/EditBundleDialog";

function formatCurrency(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

interface Bundle {
  id: string;
  name: string;
  description: string | null;
  hours: number;
  monthly_hours: number | null;
  price_cents: number;
  currency: string;
  billing_type: "one_time" | "recurring";
  recurring_interval: string | null;
  stripe_price_id: string | null;
  is_active: boolean;
}

export default function ProviderBundles() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, bundles, isLoading, notFound, isAdmin } = useProviderDashboard(slug);
  const { createBundle, updateBundle, toggleActive, isCreating, isUpdating, isToggling } = useBundleManagement(provider?.id);
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<Bundle | null>(null);

  if (notFound && !isLoading) {
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

  const handleCreateClick = () => {
    setEditingBundle(null);
    setDialogOpen(true);
  };

  const handleEditClick = (bundle: Bundle) => {
    setEditingBundle(bundle);
    setDialogOpen(true);
  };

  const handleSave = (data: BundleFormData) => {
    if (editingBundle) {
      updateBundle.mutate(
        { id: editingBundle.id, ...data },
        { onSuccess: () => setDialogOpen(false) }
      );
    } else if (provider) {
      createBundle.mutate(
        { ...data, service_provider_id: provider.id },
        { onSuccess: () => setDialogOpen(false) }
      );
    }
  };

  const handleToggle = (bundle: Bundle) => {
    toggleActive.mutate({ id: bundle.id, is_active: !bundle.is_active });
  };

  const oneTimeBundles = bundles.filter(b => b.billing_type === "one_time") as Bundle[];
  const recurringBundles = bundles.filter(b => b.billing_type === "recurring") as Bundle[];
  const activeBundles = bundles.filter(b => b.is_active).length;

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Credit Bundles</h1>
          <p className="text-muted-foreground mt-1">
            Manage credit packages for {provider?.name}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Create Bundle
          </Button>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Total Bundles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-12" />
            ) : (
              <p className="text-3xl font-bold">{bundles.length}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Active Bundles
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-12" />
            ) : (
              <p className="text-3xl font-bold text-primary">{activeBundles}</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-2">
              <Repeat className="h-4 w-4" />
              Subscriptions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 bg-muted/50 animate-pulse rounded w-12" />
            ) : (
              <p className="text-3xl font-bold">{recurringBundles.length}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* One-Time Bundles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            One-Time Bundles
          </CardTitle>
          <CardDescription>Credit packages purchased once</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : oneTimeBundles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No one-time bundles configured.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stripe Price ID</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {oneTimeBundles.map((bundle) => (
                  <TableRow key={bundle.id} className={!bundle.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{bundle.name}</p>
                          {bundle.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {bundle.description}
                            </p>
                          )}
                        </div>
                        {!bundle.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {bundle.hours}h
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(bundle.price_cents, bundle.currency)}
                    </TableCell>
                    <TableCell>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {bundle.stripe_price_id?.slice(0, 20) || "Not set"}...
                      </code>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={bundle.is_active}
                        onCheckedChange={() => handleToggle(bundle)}
                        disabled={!isAdmin || isToggling}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(bundle)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recurring Bundles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Repeat className="h-5 w-5" />
            Subscription Bundles
          </CardTitle>
          <CardDescription>Recurring credit allocations</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <div key={i} className="h-16 bg-muted/50 animate-pulse rounded" />
              ))}
            </div>
          ) : recurringBundles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Repeat className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No subscription bundles configured.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Monthly Hours</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Interval</TableHead>
                  <TableHead className="text-right">Active</TableHead>
                  {isAdmin && <TableHead className="w-[50px]"></TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringBundles.map((bundle) => (
                  <TableRow key={bundle.id} className={!bundle.is_active ? "opacity-60" : ""}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div>
                          <p className="font-medium">{bundle.name}</p>
                          {bundle.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {bundle.description}
                            </p>
                          )}
                        </div>
                        {!bundle.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {bundle.monthly_hours || bundle.hours}h/mo
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatCurrency(bundle.price_cents, bundle.currency)}/mo
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {bundle.recurring_interval || "monthly"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={bundle.is_active}
                        onCheckedChange={() => handleToggle(bundle)}
                        disabled={!isAdmin || isToggling}
                      />
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(bundle)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <EditBundleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        bundle={editingBundle}
        onSave={handleSave}
        isSaving={isCreating || isUpdating}
      />
    </div>
  );
}
