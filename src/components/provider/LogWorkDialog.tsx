import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type WorkCategory = Database["public"]["Enums"]["work_category"];

const workCategories: { value: WorkCategory; label: string }[] = [
  { value: "development", label: "Development" },
  { value: "consulting", label: "Consulting" },
  { value: "training", label: "Training" },
  { value: "support", label: "Support" },
  { value: "other", label: "Other" },
];

const formSchema = z.object({
  customerId: z.string().min(1, "Please select a customer"),
  performedAt: z.date({ required_error: "Please select a date" }),
  hours: z.coerce
    .number()
    .min(0, "Hours must be 0 or more")
    .max(24, "Hours cannot exceed 24"),
  minutes: z.coerce
    .number()
    .min(0, "Minutes must be 0 or more")
    .max(59, "Minutes must be less than 60"),
  category: z.enum(["development", "consulting", "training", "support", "other"] as const, {
    required_error: "Please select a category",
  }),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(500, "Description must be less than 500 characters"),
}).refine((data) => data.hours > 0 || data.minutes > 0, {
  message: "Please enter at least 1 minute of work",
  path: ["hours"],
});

type FormValues = z.infer<typeof formSchema>;

interface Customer {
  organization_id: string;
  organization_name: string;
}

interface LogWorkDialogProps {
  providerId: string;
  customers: Customer[];
  onSuccess: () => void;
  trigger?: React.ReactNode;
}

export function LogWorkDialog({
  providerId,
  customers,
  onSuccess,
  trigger,
}: LogWorkDialogProps) {
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      customerId: "",
      performedAt: new Date(),
      hours: 0,
      minutes: 0,
      category: undefined,
      description: "",
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const totalMinutes = values.hours * 60 + values.minutes;

      const { error } = await supabase.rpc("create_work_log_and_allocate", {
        p_provider_id: providerId,
        p_org_id: values.customerId,
        p_performed_at: values.performedAt.toISOString(),
        p_category: values.category,
        p_description: values.description.trim(),
        p_minutes: totalMinutes,
      });

      if (error) throw error;

      // Send notification to org members (fire and forget)
      const customer = customers.find(c => c.organization_id === values.customerId);
      supabase.functions.invoke("create-notification", {
        body: {
          type: "work_logged",
          recipientUserIds: [], // Will be auto-populated by backend based on org members
          title: "Work Logged",
          message: `${values.hours}h ${values.minutes}m of ${workCategories.find(c => c.value === values.category)?.label || values.category} work was logged`,
          payload: {
            provider_name: "Skywalker Digital", // TODO: Get from context
            category: workCategories.find(c => c.value === values.category)?.label || values.category,
            description: values.description.trim(),
            minutes: totalMinutes,
          },
          actionUrl: customer ? `/dashboard/org/${customer.organization_id}/credits` : undefined,
        },
      }).catch((err) => {
        console.error("Failed to send work notification:", err);
        // Don't fail the operation if notification fails
      });

      toast({
        title: "Work logged successfully",
        description: `${values.hours}h ${values.minutes}m logged for ${workCategories.find(c => c.value === values.category)?.label}`,
      });

      form.reset();
      setOpen(false);
      onSuccess();
    } catch (error: any) {
      console.error("Error logging work:", error);
      toast({
        title: "Failed to log work",
        description: error.message || "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Clock className="h-4 w-4 mr-2" />
            Log Hours
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Work Hours</DialogTitle>
          <DialogDescription>
            Record billable work performed for a customer. Credits will be
            automatically deducted from their balance.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="customerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Customer</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a customer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {customers.length === 0 ? (
                        <div className="p-2 text-sm text-muted-foreground">
                          No customers available
                        </div>
                      ) : (
                        customers.map((customer) => (
                          <SelectItem
                            key={customer.organization_id}
                            value={customer.organization_id}
                          >
                            {customer.organization_name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="performedAt"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date Performed</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2020-01-01")
                        }
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={24}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Minutes</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        max={59}
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {workCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                      placeholder="Describe the work performed..."
                      className="resize-none"
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    A brief summary of the work completed (5-500 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || customers.length === 0}>
                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Log Work
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
