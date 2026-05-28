import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, MapPin, Check, X, Mail, Clock, Locate, Loader2 } from "lucide-react";


import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { supabase } from "@/integrations/supabase/client";
import {
  RADAR_LOCATIONS_KEY,
  useRadarLocationsAdmin,
  type RadarLocationRow,
} from "@/hooks/useRadarLocations";

const REGIONS = [
  "Europe", "North America", "South America", "Asia", "Africa", "Oceania",
] as const;

const formSchema = z.object({
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  country: z.string().trim().min(1, "Country is required").max(120),
  region: z.enum(REGIONS),
  anonymous: z.boolean(),
  weight: z.coerce.number().min(0).max(1).default(0.5),
  sort_order: z.coerce.number().int().default(0),
  company_name: z.string().trim().max(160).optional().or(z.literal("")),
  company_logo_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  website_url: z.string().trim().url().max(500).optional().or(z.literal("")),
  industry: z.string().trim().max(120).optional().or(z.literal("")),
  description: z.string().trim().max(600).optional().or(z.literal("")),
  using_since: z
    .union([z.coerce.number().int().min(1990).max(2100), z.literal("")])
    .optional(),
});

type FormState = {
  latitude: string; longitude: string;
  city: string; country: string;
  region: (typeof REGIONS)[number];
  anonymous: boolean;
  weight: string;
  sort_order: string;
  company_name: string; company_logo_url: string; website_url: string;
  industry: string; description: string; using_since: string;
};

const EMPTY: FormState = {
  latitude: "", longitude: "",
  city: "", country: "", region: "Europe",
  anonymous: true,
  weight: "0.5",
  sort_order: "0",
  company_name: "", company_logo_url: "", website_url: "",
  industry: "", description: "", using_since: "",
};

function rowToForm(r: RadarLocationRow): FormState {
  return {
    latitude: String(r.latitude),
    longitude: String(r.longitude),
    city: r.city ?? "",
    country: r.country,
    region: r.region,
    anonymous: r.anonymous,
    weight: String(r.weight ?? "0.5"),
    sort_order: String(r.sort_order ?? 0),
    company_name: r.company_name ?? "",
    company_logo_url: r.company_logo_url ?? "",
    website_url: r.website_url ?? "",
    industry: r.industry ?? "",
    description: r.description ?? "",
    using_since: r.using_since != null ? String(r.using_since) : "",
  };
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function AdminRadarLocations() {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useRadarLocationsAdmin();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [editing, setEditing] = useState<RadarLocationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<RadarLocationRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [geocoding, setGeocoding] = useState(false);

  const geocodeFromAddress = async () => {
    const city = form.city.trim();
    const country = form.country.trim();
    if (!country) {
      toast.error("Enter a country first.");
      return;
    }
    setGeocoding(true);
    try {
      const q = [city, country].filter(Boolean).join(", ");
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`Geocoder responded ${res.status}`);
      const data = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!data.length) {
        toast.error("No coordinates found for that location.");
        return;
      }
      const { lat, lon } = data[0];
      setForm((f) => ({
        ...f,
        latitude: Number(lat).toFixed(6),
        longitude: Number(lon).toFixed(6),
      }));
      toast.success(`Coordinates filled for ${q}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Geocoding failed.");
    } finally {
      setGeocoding(false);
    }
  };


  const counts = useMemo(() => {
    const c = { all: 0, pending: 0, approved: 0, rejected: 0 };
    rows?.forEach((r) => {
      c.all++;
      c[r.status] = (c[r.status] ?? 0) + 1;
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (!q) return true;
      return [r.city, r.country, r.region, r.company_name, r.industry, r.submitted_contact_email]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [rows, search, statusFilter]);


  const openNew = () => {
    setEditing(null);
    setForm(EMPTY);
    setErrors({});
    setDialogOpen(true);
  };

  const openEdit = (r: RadarLocationRow) => {
    setEditing(r);
    setForm(rowToForm(r));
    setErrors({});
    setDialogOpen(true);
  };

  const upsert = useMutation({
    mutationFn: async (input: FormState) => {
      const parsed = formSchema.safeParse(input);
      if (!parsed.success) {
        const fieldErrors: Record<string, string> = {};
        parsed.error.issues.forEach((i) => {
          fieldErrors[i.path.join(".")] = i.message;
        });
        setErrors(fieldErrors);
        throw new Error("Please fix the highlighted fields.");
      }
      setErrors({});
      const v = parsed.data;
      const payload = {
        latitude: v.latitude,
        longitude: v.longitude,
        city: v.city || null,
        country: v.country,
        region: v.region,
        anonymous: v.anonymous,
        weight: v.weight,
        sort_order: v.sort_order ?? 0,
        company_name: v.anonymous ? null : v.company_name || null,
        company_logo_url: v.anonymous ? null : v.company_logo_url || null,
        website_url: v.anonymous ? null : v.website_url || null,
        industry: v.anonymous ? null : v.industry || null,
        description: v.anonymous ? null : v.description || null,
        using_since: v.anonymous ? null : (v.using_since === "" || v.using_since == null ? null : v.using_since),
      };

      if (editing) {
        const { error } = await supabase
          .from("radar_locations")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("radar_locations")
          .insert({ ...payload, status: "approved" });
        if (error) throw error;
      }

    },
    onSuccess: () => {
      toast.success(editing ? "Location updated" : "Location added");
      qc.invalidateQueries({ queryKey: RADAR_LOCATIONS_KEY });
      setDialogOpen(false);
    },
    onError: (e: Error) => {
      if (e.message !== "Please fix the highlighted fields.") toast.error(e.message);
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("radar_locations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Location deleted");
      qc.invalidateQueries({ queryKey: RADAR_LOCATIONS_KEY });
      setDeleteRow(null);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "approved" | "rejected" }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("radar_locations")
        .update({
          status,
          reviewed_at: new Date().toISOString(),
          reviewed_by: userData.user?.id ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.status === "approved" ? "Submission approved" : "Submission rejected");
      qc.invalidateQueries({ queryKey: RADAR_LOCATIONS_KEY });
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Radar locations</h1>
          <p className="text-muted-foreground">
            Curate community submissions and manage markers shown on the public Global Radar.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add location
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition-colors ${
              statusFilter === s
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {s} <span className="ml-1 opacity-70">({counts[s] ?? 0})</span>
          </button>
        ))}
        <div className="relative ml-auto max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search city, country, company, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead>Submitter</TableHead>
              <TableHead className="w-48 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(6)].map((_, i) => (
                <TableRow key={i}>
                  {[...Array(7)].map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No locations found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    {r.status === "pending" ? (
                      <Badge variant="outline" className="border-amber-500/40 text-amber-600 dark:text-amber-400">
                        <Clock className="mr-1 h-3 w-3" /> Pending
                      </Badge>
                    ) : r.status === "approved" ? (
                      <Badge variant="outline" className="border-emerald-500/40 text-emerald-600 dark:text-emerald-400">
                        <Check className="mr-1 h-3 w-3" /> Approved
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-destructive/40 text-destructive">
                        <X className="mr-1 h-3 w-3" /> Rejected
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {r.anonymous ? (
                      <Badge variant="secondary">Anonymous</Badge>
                    ) : (
                      <Badge>Showcase</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-medium">
                        {r.city ? `${r.city}, ` : ""}{r.country}
                      </span>
                      <span className="text-xs text-muted-foreground">· {r.region}</span>
                    </div>
                    {r.description && r.status === "pending" && (
                      <p className="mt-1 line-clamp-2 max-w-md text-xs text-muted-foreground">
                        {r.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.company_name ?? <span className="text-muted-foreground">—</span>}
                    {r.website_url && (
                      <a
                        href={r.website_url}
                        target="_blank"
                        rel="noreferrer"
                        className="block truncate text-xs text-muted-foreground hover:underline"
                      >
                        {r.website_url.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.industry ?? "—"}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {r.submitted_contact_email ? (
                      <span className="inline-flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        <a href={`mailto:${r.submitted_contact_email}`} className="hover:underline">
                          {r.submitted_contact_email}
                        </a>
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {r.status === "pending" && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatus.mutate({ id: r.id, status: "approved" })}
                            disabled={setStatus.isPending}
                            aria-label="Approve"
                            title="Approve"
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setStatus.mutate({ id: r.id, status: "rejected" })}
                            disabled={setStatus.isPending}
                            aria-label="Reject"
                            title="Reject"
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)} aria-label="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteRow(r)} aria-label="Delete">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit dialog */}

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit location" : "Add location"}</DialogTitle>
            <DialogDescription>
              Anonymous locations show only an approximate region on the globe.
              Showcase deployments display company details.
            </DialogDescription>
          </DialogHeader>

          <form
            id="radar-location-form"
            onSubmit={(e) => {
              e.preventDefault();
              upsert.mutate(form);
            }}
            className="grid gap-4 py-2"
          >
            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label className="text-sm">Showcase deployment</Label>
                <p className="text-xs text-muted-foreground">
                  Toggle off to display this as an anonymous marker.
                </p>
              </div>
              <Switch
                checked={!form.anonymous}
                onCheckedChange={(v) => setForm((f) => ({ ...f, anonymous: !v }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="City" error={errors.city}>
                <Input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder="Amsterdam"
                />
              </Field>
              <Field label="Country *" error={errors.country}>
                <Input
                  value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
                  placeholder="Netherlands"
                  required
                />
              </Field>

              <Field label="Region *" error={errors.region}>
                <Select
                  value={form.region}
                  onValueChange={(v) => setForm((f) => ({ ...f, region: v as FormState["region"] }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGIONS.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sort order" error={errors.sort_order} hint="Lower numbers appear first">
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((f) => ({ ...f, sort_order: e.target.value }))}
                />
              </Field>

              <Field label="Latitude *" error={errors.latitude}>
                <Input
                  type="number" step="0.000001"
                  value={form.latitude}
                  onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                  placeholder="52.3676"
                  required
                />
              </Field>
              <Field label="Longitude *" error={errors.longitude}>
                <Input
                  type="number" step="0.000001"
                  value={form.longitude}
                  onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                  placeholder="4.9041"
                  required
                />
              </Field>

              <Field label="Weight" error={errors.weight} hint="0.0–1.0, drives heatmap intensity">
                <Input
                  type="number" step="0.05" min={0} max={1}
                  value={form.weight}
                  onChange={(e) => setForm((f) => ({ ...f, weight: e.target.value }))}
                />
              </Field>
            </div>

            {!form.anonymous && (
              <div className="space-y-3 border-t pt-4">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Showcase details
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company name" error={errors.company_name}>
                    <Input
                      value={form.company_name}
                      onChange={(e) => setForm((f) => ({ ...f, company_name: e.target.value }))}
                    />
                  </Field>
                  <Field label="Industry" error={errors.industry}>
                    <Input
                      value={form.industry}
                      onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                      placeholder="FinTech, Healthcare..."
                    />
                  </Field>
                  <Field label="Website URL" error={errors.website_url}>
                    <Input
                      type="url"
                      value={form.website_url}
                      onChange={(e) => setForm((f) => ({ ...f, website_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Logo URL" error={errors.company_logo_url}>
                    <Input
                      type="url"
                      value={form.company_logo_url}
                      onChange={(e) => setForm((f) => ({ ...f, company_logo_url: e.target.value }))}
                      placeholder="https://..."
                    />
                  </Field>
                  <Field label="Using since (year)" error={errors.using_since}>
                    <Input
                      type="number" min={1990} max={2100}
                      value={form.using_since}
                      onChange={(e) => setForm((f) => ({ ...f, using_since: e.target.value }))}
                      placeholder="2023"
                    />
                  </Field>
                </div>
                <Field label="Description" error={errors.description}>
                  <Textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Short summary of what they're building."
                  />
                </Field>
              </div>
            )}
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button form="radar-location-form" type="submit" disabled={upsert.isPending}>
              {upsert.isPending ? "Saving..." : editing ? "Save changes" : "Add location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteRow} onOpenChange={(o) => !o && setDeleteRow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this location?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteRow && (
                <>
                  Remove <strong>{deleteRow.city ? `${deleteRow.city}, ` : ""}{deleteRow.country}</strong>
                  {deleteRow.company_name ? ` (${deleteRow.company_name})` : ""} from the radar.
                  This cannot be undone.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteRow && remove.mutate(deleteRow.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {remove.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({
  label, error, hint, children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint && !error && <p className="text-[11px] text-muted-foreground">{hint}</p>}
      {error && <p className="text-[11px] text-destructive">{error}</p>}
    </div>
  );
}
