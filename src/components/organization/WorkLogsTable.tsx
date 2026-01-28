import { format } from "date-fns";
import { Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

function minutesToHours(minutes: number): string {
  const hours = minutes / 60;
  return hours.toFixed(1);
}

const categoryColors: Record<string, "default" | "secondary" | "outline"> = {
  development: "default",
  consulting: "secondary",
  training: "outline",
  support: "secondary",
  other: "outline",
};

export interface WorkLogEntry {
  id: string;
  performed_at: string;
  category: string;
  description: string;
  minutes_spent: number;
  performer_name: string | null;
  provider_name?: string;
}

interface WorkLogsTableProps {
  logs: WorkLogEntry[];
  loading?: boolean;
  showProvider?: boolean;
  emptyMessage?: string;
  emptySubMessage?: string;
}

export function WorkLogsTable({
  logs,
  loading = false,
  showProvider = false,
  emptyMessage = "No work logs yet",
  emptySubMessage = "Work performed by the service provider will appear here.",
}: WorkLogsTableProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Work History</CardTitle>
          <CardDescription>Work performed against your credits</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Work History</CardTitle>
        <CardDescription>
          {logs.length} work log{logs.length !== 1 ? "s" : ""} recorded
        </CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p className="text-lg font-medium">{emptyMessage}</p>
            <p className="text-sm mt-1">{emptySubMessage}</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                {showProvider && <TableHead>Provider</TableHead>}
                <TableHead>Description</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Performed By</TableHead>
                <TableHead className="text-right">Hours</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {format(new Date(log.performed_at), "MMM d, yyyy")}
                  </TableCell>
                  {showProvider && (
                    <TableCell className="font-medium">
                      {log.provider_name || "Unknown"}
                    </TableCell>
                  )}
                  <TableCell className="max-w-xs">
                    <p className="line-clamp-2 text-sm">{log.description}</p>
                  </TableCell>
                  <TableCell>
                    <Badge variant={categoryColors[log.category] || "outline"} className="capitalize">
                      {log.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {log.performer_name || "Unknown"}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {minutesToHours(log.minutes_spent)}h
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
