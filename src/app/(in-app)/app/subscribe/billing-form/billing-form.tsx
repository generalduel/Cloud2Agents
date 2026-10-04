"use client";

import { useState } from "react";
import { countries } from "countries-list";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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

const countriesList = Object.entries(countries).map(([code, country]) => ({
  code,
  name: country.name,
}));
countriesList.sort((a, b) => a.name.localeCompare(b.name));

const formSchema = z
  .object({
    country: z.string({
      message: "Please select a country",
    }),
    state: z.string().min(1, "State is required"),
    city: z.string().min(1, "City is required"),
    street: z.string().min(1, "Street address is required"),
    zipcode: z.string().min(1, "Postal code is required"),
    isBusinessCustomer: z.boolean(),
    taxId: z.string().optional(),
  })
  .refine(
    (data) => {
      if (data.isBusinessCustomer && (!data.taxId || data.taxId.length === 0)) {
        return false;
      }
      return true;
    },
    {
      message: "Tax ID is required for business customers",
      path: ["taxId"],
    }
  );

type BillingFormInput = z.input<typeof formSchema>;
type BillingFormValues = z.infer<typeof formSchema>;

export type BillingFormProps = {
  callbackUrl: string;
};

export function BillingForm({ callbackUrl }: BillingFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<BillingFormInput>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      country: "",
      state: "",
      city: "",
      street: "",
      zipcode: "",
      isBusinessCustomer: false,
      taxId: "",
    },
  });

  const watchIsBusinessCustomer = form.watch("isBusinessCustomer");

  function onSubmit(values: BillingFormInput) {
    setIsSubmitting(true);
    const parsed = formSchema.parse(values);

    const url = new URL(callbackUrl, window.location.origin);

    url.searchParams.set("billing_country", parsed.country);
    url.searchParams.set("billing_state", parsed.state);
    url.searchParams.set("billing_city", parsed.city);
    url.searchParams.set("billing_street", parsed.street);
    url.searchParams.set("billing_zipcode", parsed.zipcode);

    if (parsed.isBusinessCustomer && parsed.taxId) {
      url.searchParams.set("tax_id", parsed.taxId);
    }

    router.push(url.toString());
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-foreground/10 rounded-lg">
      <div className="w-full max-w-md space-y-8">
        <Card className="shadow-lg">
          <CardHeader className="pb-3">
            <CardTitle>Billing Details</CardTitle>
            <CardDescription>
              Fill in your billing information to proceed with payment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="max-h-[200px]">
                          {countriesList.map((country) => (
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="city"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter your city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="state"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>State / Province</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your state or province"
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
                  name="street"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Street Address</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your street address"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="zipcode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Postal Code / ZIP</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Enter your postal code"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isBusinessCustomer"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel>Buying for a business</FormLabel>
                        <FormDescription>
                          Check this if you&apos;re purchasing on behalf of a
                          business
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />

                {watchIsBusinessCustomer && (
                  <FormField
                    control={form.control}
                    name="taxId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax ID / VAT Number</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter your company's tax ID"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Required for business purchases
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                <CardFooter className="px-0 pt-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Continue to Payment"
                    )}
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
