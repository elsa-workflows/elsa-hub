import { useState } from "react";
import { useParams } from "react-router-dom";
import { Inbox, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useProviderDashboard } from "@/hooks/useProviderDashboard";
import {
  useRuntimeEnquiries,
  type EnquiryStatus,
  type RuntimeEnquiryRow,
} from "@/hooks/useRuntimeEnquiries";

const tierLabels: Record<string, string> = {
  runtime: "Runtime",
  runtime_priority: "Runtime Priority",
  maintainer_access: "Maintainer Access",
  unsure: "Not sure yet",
};

function statusVariant(status: string): "default" | "secondary" | "outline" {
  if (status === "new") return "default";
  if (status === "contacted") return "secondary";
  return "outline";
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function EnquiryCard({
  enquiry,
  isAdmin,
  onUpdate,
  isUpdating,
}: {
  enquiry: RuntimeEnquiryRow;
  isAdmin: boolean;
  onUpdate: (input: { id: string; status?: EnquiryStatus; internal_notes?: string | null }) => void;
  isUpdating: boolean;
}) {
  const [notes, setNotes] = useState(enquiry.internal_notes ?? "");
  const notesDirty = (enquiry.internal_notes ?? "") !== notes;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{enquiry.organization_name}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              <span>{enquiry.contact_name}</span>
              <a
                href={`mailto:${enquiry.contact_email}`}
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                <Mail className="h-3.5 w-3.5" />
                {enquiry.contact_email}
              </a>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{tierLabels[enquiry.tier] ?? enquiry.tier}</Badge>
            <Badge variant={statusVariant(enquiry.status)}>{enquiry.status}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Received {formatDateTime(enquiry.created_at)}
          {enquiry.source_page ? ` · ${enquiry.source_page}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border bg-surface-subtle p-4 text-sm whitespace-pre-wrap leading-relaxed">
          {enquiry.message}
        </div>

        {isAdmin && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status</span>
              <Select
                value={enquiry.status}
                onValueChange={(value) =>
                  onUpdate({ id: enquiry.id, status: value as EnquiryStatus })
                }
                disabled={isUpdating}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">New</SelectItem>
                  <SelectItem value="contacted">Contacted</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes — not visible to the enquirer."
                rows={3}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!notesDirty || isUpdating}
                onClick={() => onUpdate({ id: enquiry.id, internal_notes: notes || null })}
              >
                Save note
              </Button>
            </div>
          </div>
        )}

        {!isAdmin && enquiry.internal_notes && (
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {enquiry.internal_notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProviderEnquiries() {
  const { slug } = useParams<{ slug: string }>();
  const { provider, isLoading: providerLoading, notFound, isAdmin } = useProviderDashboard(slug);
  const { enquiries, isLoading, updateEnquiry, isUpdating } = useRuntimeEnquiries(provider?.id);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  if (providerLoading) {
    return <p className="text-muted-foreground">Loading…</p>;
  }
  if (notFound) {
    return <p className="text-muted-foreground">Provider not found.</p>;
  }

  const visible =
    statusFilter === "all" ? enquiries : enquiries.filter((e) => e.status === statusFilter);
  const newCount = enquiries.filter((e) => e.status === "new").length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Enquiries</h1>
          <p className="text-muted-foreground">
            Valence Runtime subscription enquiries, newest first
            {newCount > 0 ? ` · ${newCount} new` : ""}.
          </p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading enquiries…</p>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center">
            <Inbox className="h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground">No enquiries here yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((enquiry) => (
            <EnquiryCard
              key={enquiry.id}
              enquiry={enquiry}
              isAdmin={isAdmin}
              onUpdate={updateEnquiry}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
