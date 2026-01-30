import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BundleFormData } from "@/hooks/useBundleManagement";

const bundleSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500, "Description too long").optional().nullable(),
  hours: z.coerce.number().min(1, "At least 1 hour").max(10000, "Max 10,000 hours"),
  monthly_hours: z.coerce.number().min(1).max(1000).optional().nullable(),
  price_cents: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(1),
  billing_type: z.enum(["one_time", "recurring"]),
  recurring_interval: z.string().optional().nullable(),
  stripe_price_id: z.string().optional().nullable(),
  is_active: z.boolean(),
});

type BundleFormValues = z.infer<typeof bundleSchema>;

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

interface EditBundleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bundle?: Bundle | null;
  onSave: (data: BundleFormData) => void;
  isSaving?: boolean;
}

export function EditBundleDialog({
  open,
  onOpenChange,
  bundle,
  onSave,
  isSaving,
}: EditBundleDialogProps) {
  const isEditing = !!bundle;

  const form = useForm<BundleFormValues>({
    resolver: zodResolver(bundleSchema),
    defaultValues: {
      name: "",
      description: "",
      hours: 10,
      monthly_hours: null,
      price_cents: 0,
      currency: "eur",
      billing_type: "one_time",
      recurring_interval: null,
      stripe_price_id: "",
      is_active: true,
    },
  });

  const billingType = form.watch("billing_type");

  useEffect(() => {
    if (open && bundle) {
      form.reset({
        name: bundle.name,
        description: bundle.description || "",
        hours: bundle.hours,
        monthly_hours: bundle.monthly_hours,
        price_cents: bundle.price_cents,
        currency: bundle.currency,
        billing_type: bundle.billing_type,
        recurring_interval: bundle.recurring_interval,
        stripe_price_id: bundle.stripe_price_id || "",
        is_active: bundle.is_active,
      });
    } else if (open && !bundle) {
      form.reset({
        name: "",
        description: "",
        hours: 10,
        monthly_hours: null,
        price_cents: 0,
        currency: "eur",
        billing_type: "one_time",
        recurring_interval: null,
        stripe_price_id: "",
        is_active: true,
      });
    }
  }, [open, bundle, form]);

  const handleSubmit = (values: BundleFormValues) => {
    onSave({
      name: values.name,
      description: values.description || null,
      hours: values.hours,
      monthly_hours: values.billing_type === "recurring" ? values.monthly_hours : null,
      price_cents: values.price_cents,
      currency: values.currency,
      billing_type: values.billing_type,
      recurring_interval: values.billing_type === "recurring" ? values.recurring_interval : null,
      stripe_price_id: values.stripe_price_id || null,
      is_active: values.is_active,
    });
  };

  // Format price in display currency
  const formatPriceDisplay = (cents: number, currency: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(cents / 100);
  };

  const watchedPrice = form.watch("price_cents");
  const watchedCurrency = form.watch("currency");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Bundle" : "Create Bundle"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the credit bundle details below."
              : "Create a new credit bundle for your customers."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Starter Pack" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Optional description for this bundle..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="billing_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="one_time">One-Time</SelectItem>
                        <SelectItem value="recurring">Recurring</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="eur">EUR</SelectItem>
                        <SelectItem value="usd">USD</SelectItem>
                        <SelectItem value="gbp">GBP</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      {billingType === "recurring" ? "Total Hours" : "Hours"}
                    </FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {billingType === "recurring" && (
                <FormField
                  control={form.control}
                  name="monthly_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Hours</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          {...field}
                          value={field.value || ""}
                          onChange={(e) =>
                            field.onChange(e.target.value ? Number(e.target.value) : null)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {billingType === "recurring" && (
              <FormField
                control={form.control}
                name="recurring_interval"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billing Interval</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value || "monthly"}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select interval" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="price_cents"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Price (in cents)</FormLabel>
                  <FormControl>
                    <Input type="number" min={0} step={1} {...field} />
                  </FormControl>
                  <FormDescription>
                    Display: {formatPriceDisplay(watchedPrice || 0, watchedCurrency || "eur")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="stripe_price_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stripe Price ID</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="price_..."
                      {...field}
                      value={field.value || ""}
                    />
                  </FormControl>
                  <FormDescription>
                    Optional. Link to a Stripe Price for payment processing.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="is_active"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Active</FormLabel>
                    <FormDescription>
                      When active, this bundle is visible to customers.
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : isEditing ? "Save Changes" : "Create Bundle"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
