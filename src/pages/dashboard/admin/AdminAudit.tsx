import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAdminAuditEvents } from "@/hooks/useAdminData";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Eye } from "lucide-react";

export default function AdminAudit() {
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const { data: events, isLoading } = useAdminAuditEvents(
    50,
    0,
    entityFilter === "all" ? undefined : entityFilter
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Audit Log</h1>
        <p className="text-muted-foreground">Platform activity and changes</p>
      </div>

      <div className="flex items-center gap-4">
        <Select value={entityFilter} onValueChange={setEntityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by entity" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All entities</SelectItem>
            <SelectItem value="work_log">Work Logs</SelectItem>
            <SelectItem value="credit_adjustment">Credit Adjustments</SelectItem>
            <SelectItem value="credit_lot">Credit Lots</SelectItem>
            <SelectItem value="order">Orders</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Actor</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Organization</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              [...Array(5)].map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : events?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  No audit events found
                </TableCell>
              </TableRow>
            ) : (
              events?.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="text-muted-foreground whitespace-nowrap">
                    {format(new Date(event.created_at), "MMM d, yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    {event.actor_type === "system" ? (
                      <Badge variant="outline">System</Badge>
                    ) : (
                      <span className="text-sm">{event.actor_email || "Unknown"}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono text-xs">
                      {event.entity_type}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{event.action}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event.organization_name || "—"}
                  </TableCell>
                  <TableCell>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
                        <DialogHeader>
                          <DialogTitle>Audit Event Details</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-2">Before</h4>
                            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                              {event.before_json
                                ? JSON.stringify(event.before_json, null, 2)
                                : "null"}
                            </pre>
                          </div>
                          <div>
                            <h4 className="font-medium mb-2">After</h4>
                            <pre className="bg-muted p-3 rounded-md text-xs overflow-auto">
                              {event.after_json
                                ? JSON.stringify(event.after_json, null, 2)
                                : "null"}
                            </pre>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
