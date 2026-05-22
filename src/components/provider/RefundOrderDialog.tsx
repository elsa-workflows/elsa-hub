import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ProviderOrder } from "@/hooks/useProviderOrders";

interface Props {
  order: ProviderOrder | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function formatCurrency(cents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

export function RefundOrderDialog({ order, open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"full" | "partial">("full");
  const [amount, setAmount] = useState<string>("");
  const [reason, setReason] = useState<"requested_by_customer" | "duplicate" | "fraudulent">(
    "requested_by_customer"
  );
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!order) return null;

  const alreadyRefunded = order.refunded_amount_cents ?? 0;
  const remainingRefundable = order.amount_cents - alreadyRefunded;
  const currency = order.currency;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      let amountCents: number | undefined;
      if (mode === "partial") {
        const parsed = Math.round(parseFloat(amount) * 100);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          toast.error("Enter a valid refund amount");
          setSubmitting(false);
          return;
        }
        if (parsed > remainingRefundable) {
          toast.error(
            `Amount exceeds refundable balance (${formatCurrency(remainingRefundable, currency)})`
          );
          setSubmitting(false);
          return;
        }
        amountCents = parsed;
      }

      const { data, error } = await supabase.functions.invoke("refund-order", {
        body: {
          order_id: order.id,
          amount_cents: amountCents,
          reason,
          notes: notes || undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Refund issued. Credits will sync shortly.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["provider-orders"] }),
        qc.invalidateQueries({ queryKey: ["credit-balance"] }),
        qc.invalidateQueries({ queryKey: ["org-orders"] }),
      ]);
      onOpenChange(false);
      // reset
      setMode("full");
      setAmount("");
      setNotes("");
      setReason("requested_by_customer");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Refund failed";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Refund order</DialogTitle>
          <DialogDescription>
            {order.organization_name} — {order.bundle_name} ({order.bundle_hours}h)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Order total</span>
              <span className="font-medium">{formatCurrency(order.amount_cents, currency)}</span>
            </div>
            {alreadyRefunded > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Already refunded</span>
                <span>{formatCurrency(alreadyRefunded, currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Refundable</span>
              <span className="font-medium">
                {formatCurrency(remainingRefundable, currency)}
              </span>
            </div>
            {order.lot_minutes_purchased !== null && (
              <div className="flex justify-between pt-1 border-t">
                <span className="text-muted-foreground">Credits remaining in lot</span>
                <span>
                  {order.lot_minutes_remaining}/{order.lot_minutes_purchased} min
                </span>
              </div>
            )}
          </div>

          <RadioGroup value={mode} onValueChange={(v) => setMode(v as "full" | "partial")}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="full" id="full" />
              <Label htmlFor="full" className="font-normal cursor-pointer">
                Full refund — {formatCurrency(remainingRefundable, currency)}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="partial" id="partial" />
              <Label htmlFor="partial" className="font-normal cursor-pointer">
                Partial refund
              </Label>
            </div>
          </RadioGroup>

          {mode === "partial" && (
            <div className="space-y-1.5">
              <Label htmlFor="amount">Amount ({currency.toUpperCase()})</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={remainingRefundable / 100}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
              <SelectTrigger id="reason">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="requested_by_customer">Requested by customer</SelectItem>
                <SelectItem value="duplicate">Duplicate</SelectItem>
                <SelectItem value="fraudulent">Fraudulent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes">Internal notes (optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
            />
          </div>

          <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-xs text-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive mt-0.5" />
            <p>
              The customer will be refunded in Stripe and the corresponding service credits
              will be reversed. Already-consumed minutes cannot be reclaimed.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Issue refund
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
