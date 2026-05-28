import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, MapPin } from "lucide-react";
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

export default function AdminRadarLocations() {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useRadarLocationsAdmin();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<RadarLocationRow | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteRow, setDeleteRow] = useState<RadarLocationRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.city, r.country, r.region, r.company_name, r.industry]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

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
          .insert(payload);
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Radar locations</h1>
          <p className="text-muted-foreground">
            Markers shown on the public Global Radar map. {rows?.length ?? 0} total.
          </p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-1.5 h-4 w-4" />
          Add location
        </Button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search city, country, company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Region</TableHead>
              <TableHead>Company</TableHead>
              <TableHead>Industry</TableHead>
              <TableHead className="text-right">Coordinates</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
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
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.region}</TableCell>
                  <TableCell className="font-medium">
                    {r.company_name ?? <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.industry ?? "—"}
                  </TableCell>
                  <TableCell className="text-right font-mono text-xs text-muted-foreground">
                    {Number(r.latitude).toFixed(2)}, {Number(r.longitude).toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
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
