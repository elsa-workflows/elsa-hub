import { useMemo, useState } from "react";
import { GraduationCap, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  useTrainingLeads,
  type TrainingLeadRow,
} from "@/hooks/useTrainingLeads";
import {
  intentLabels,
  offeringOptions,
  seatInterestLabels,
  type SeatInterest,
  type TrainingInterestIntent,
  type TrainingLeadStatus,
} from "@/lib/trainingInterest";

const statusVariant = (status: string): "default" | "secondary" | "outline" => {
  if (status === "new") return "default";
  if (status === "contacted") return "secondary";
  return "outline";
};

const intentVariant = (intent: string): "default" | "secondary" | "outline" => {
  if (intent === "quote") return "default";
  if (intent === "provider") return "secondary";
  return "outline";
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function offeringLabel(value: string) {
  return offeringOptions.find((option) => option.value === value)?.label ?? value;
}

function Detail({ label, value }: { label: string; value?: string | number | string[] | null }) {
  if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return null;
  const display = Array.isArray(value) ? value.map(offeringLabel).join(", ") : String(value);
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="text-sm whitespace-pre-wrap">{display}</dd>
    </div>
  );
}

function LeadCard({
  lead,
  onUpdate,
  isUpdating,
}: {
  lead: TrainingLeadRow;
  onUpdate: (input: { id: string; status?: TrainingLeadStatus; internal_notes?: string | null }) => void;
  isUpdating: boolean;
}) {
  const [notes, setNotes] = useState(lead.internal_notes ?? "");
  const notesDirty = (lead.internal_notes ?? "") !== notes;
  const title = lead.organization_name || lead.company || lead.contact_name || lead.email;

  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription className="flex flex-wrap items-center gap-2">
              {lead.contact_name ? <span>{lead.contact_name}</span> : null}
              <a
                href={`mailto:${lead.email}`}
                className="inline-flex items-center gap-1 underline underline-offset-4"
              >
                <Mail className="h-3.5 w-3.5" />
                {lead.email}
              </a>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={intentVariant(lead.intent)}>
              {intentLabels[lead.intent] ?? lead.intent}
            </Badge>
            <Badge variant={statusVariant(lead.status)}>{lead.status}</Badge>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Received {formatDateTime(lead.created_at)}
          {lead.source_page ? ` · ${lead.source_page}` : ""}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <dl className="grid gap-3 sm:grid-cols-2">
          <Detail label="Role" value={lead.role} />
          <Detail label="Company size" value={lead.company_size} />
          <Detail
            label="Interest"
            value={
              lead.interest
                ? seatInterestLabels[lead.interest as SeatInterest] ?? lead.interest
                : lead.interest
            }
          />
          <Detail label="Preferred length" value={lead.preferred_length} />
          <Detail label="Start month" value={lead.start_month} />
          <Detail label="Headcount" value={lead.headcount} />
          <Detail label="Delivery" value={lead.delivery} />
          <Detail label="Timezone / region" value={lead.timezone_region} />
          <Detail label="Website" value={lead.website} />
          <Detail label="Outline" value={lead.outline_url} />
          <Detail label="Regions" value={lead.regions} />
          <Detail label="Languages" value={lead.languages} />
          <Detail label="Offerings" value={lead.offerings} />
        </dl>
        {lead.experience ? (
          <div className="rounded-lg border bg-surface-subtle p-4 text-sm whitespace-pre-wrap">
            {lead.experience}
          </div>
        ) : null}
        {lead.notes ? (
          <div className="rounded-lg border bg-surface-subtle p-4 text-sm whitespace-pre-wrap">
            {lead.notes}
          </div>
        ) : null}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="space-y-2 sm:w-48">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Status</p>
            <Select
              value={lead.status}
              onValueChange={(value) => onUpdate({ id: lead.id, status: value as TrainingLeadStatus })}
              disabled={isUpdating}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">new</SelectItem>
                <SelectItem value="contacted">contacted</SelectItem>
                <SelectItem value="closed">closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 space-y-2">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Internal notes</p>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={5000}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!notesDirty || isUpdating}
            onClick={() => onUpdate({ id: lead.id, internal_notes: notes || null })}
          >
            Save notes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminTrainingLeads() {
  const { leads, isLoading, updateLead, isUpdating } = useTrainingLeads();
  const [intentFilter, setIntentFilter] = useState<"all" | TrainingInterestIntent>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TrainingLeadStatus>("all");

  const visible = useMemo(() => {
    return leads.filter((lead) => {
      if (intentFilter !== "all" && lead.intent !== intentFilter) return false;
      if (statusFilter !== "all" && lead.status !== statusFilter) return false;
      return true;
    });
  }, [leads, intentFilter, statusFilter]);

  const counts = useMemo(() => {
    const next = { notify: 0, quote: 0, provider: 0, new: 0 };
    leads.forEach((lead) => {
      next[lead.intent] += 1;
      if (lead.status === "new") next.new += 1;
    });
    return next;
  }, [leads]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Training leads</h1>
        <p className="text-muted-foreground">
          Triage Elsa+ Training interest. Work private quotes first, then provider listings,
          then self-paced Core demand. Self-paced Core and public-seat quotes are also on
          MailerLite.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={intentFilter}
          onValueChange={(value) => setIntentFilter(value as typeof intentFilter)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by intent" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All intents</SelectItem>
            <SelectItem value="quote">Private quote ({counts.quote})</SelectItem>
            <SelectItem value="provider">Provider ({counts.provider})</SelectItem>
            <SelectItem value="notify">Notify me ({counts.notify})</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value as typeof statusFilter)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="new">New ({counts.new})</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center text-muted-foreground">
            <GraduationCap className="h-8 w-8" />
            <p>No training leads match these filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((lead) => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onUpdate={updateLead}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      )}
    </div>
  );
}
