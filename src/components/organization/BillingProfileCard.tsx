import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Receipt, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBillingProfile, BillingProfileFormData } from "@/hooks/useBillingProfile";

const billingSchema = z.object({
  company_legal_name: z.string().optional(),
  registration_number: z.string().optional(),
  vat_number: z.string().optional(),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().optional(),
  state_province: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
});

type BillingFormValues = z.infer<typeof billingSchema>;

// Common countries for the dropdown
const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "GB", name: "United Kingdom" },
  { code: "NL", name: "Netherlands" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "BE", name: "Belgium" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "AT", name: "Austria" },
  { code: "CH", name: "Switzerland" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "FI", name: "Finland" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "AU", name: "Australia" },
  { code: "CA", name: "Canada" },
  { code: "NZ", name: "New Zealand" },
].sort((a, b) => a.name.localeCompare(b.name));

interface BillingProfileCardProps {
  organizationId: string | undefined;
}

export function BillingProfileCard({ organizationId }: BillingProfileCardProps) {
  const { billingProfile, isLoading, updateBillingProfile, isUpdating } =
    useBillingProfile(organizationId);

  const form = useForm<BillingFormValues>({
    resolver: zodResolver(billingSchema),
    defaultValues: {
      company_legal_name: "",
      registration_number: "",
      vat_number: "",
      address_line1: "",
      address_line2: "",
      city: "",
      state_province: "",
      postal_code: "",
      country: "",
    },
  });

  // Populate form when billing profile loads
  useEffect(() => {
    if (billingProfile) {
      form.reset({
        company_legal_name: billingProfile.company_legal_name || "",
        registration_number: billingProfile.registration_number || "",
        vat_number: billingProfile.vat_number || "",
        address_line1: billingProfile.address_line1 || "",
        address_line2: billingProfile.address_line2 || "",
        city: billingProfile.city || "",
        state_province: billingProfile.state_province || "",
        postal_code: billingProfile.postal_code || "",
        country: billingProfile.country || "",
      });
    }
  }, [billingProfile, form]);

  const onSubmit = (values: BillingFormValues) => {
    updateBillingProfile(values as BillingProfileFormData);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Billing Information
          </CardTitle>
          <CardDescription>Loading...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 bg-muted/50 animate-pulse rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Receipt className="h-5 w-5" />
          Billing Information
        </CardTitle>
        <CardDescription>
          This information will appear on your invoices and receipts
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Company Identification */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Company Details
              </h4>

              <FormField
                control={form.control}
                name="company_legal_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Legal Company Name</FormLabel>
                    <FormControl>
                      <Input placeholder="ACME Corporation B.V." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="registration_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Registration (CoC)</FormLabel>
                      <FormControl>
                        <Input placeholder="12345678" {...field} />
                      </FormControl>
                      <FormDescription>
                        Chamber of Commerce number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="vat_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>VAT Number</FormLabel>
                      <FormControl>
                        <Input placeholder="NL123456789B01" {...field} />
                      </FormControl>
                      <FormDescription>
                        For EU reverse-charge invoices
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Billing Address */}
            <div className="space-y-4">
              <h4 className="text-sm font-medium">Billing Address</h4>

              <FormField
                control={form.control}
                name="address_line1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input placeholder="123 Main Street" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address_line2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Address Line 2</FormLabel>
                    <FormControl>
                      <Input placeholder="Suite 100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input placeholder="Amsterdam" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state_province"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State / Province</FormLabel>
                      <FormControl>
                        <Input placeholder="North Holland" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="postal_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code</FormLabel>
                      <FormControl>
                        <Input placeholder="1012 AB" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {COUNTRIES.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Button type="submit" disabled={isUpdating}>
              {isUpdating ? "Saving..." : "Save Billing Information"}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
