'use client';

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { runPayrollCalculation } from "@/lib/payroll/actions";
import { toast } from "sonner"; // Using shadcn's default toast

// CORRECTION: Replaced the incorrect 'required_error'/'invalid_type_error' parameter 
// with the Zod-idiomatic method using .min() and a custom message object
const formSchema = z.object({
  dateRange: z.object({
    // Using .min() to enforce the date is a valid Date object (i.e., not null/undefined)
    from: z.date().min(new Date('1900-01-01'), { message: "A start date is required." }),
    to: z.date().min(new Date('1900-01-01'), { message: "An end date is required." }),
  }),
});

export function StartPayrollRunForm({ tenantId }: { tenantId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    startTransition(async () => {
      const result = await runPayrollCalculation(
        tenantId,
        format(values.dateRange.from, 'yyyy-MM-dd'),
        format(values.dateRange.to, 'yyyy-MM-dd')
      );

      if (result.error) {
        toast.error("Payroll Failed", { description: result.error });
      } else {
        toast.success("Payroll Run Initiated!", {
          description: "Calculation is complete. Please review the results.",
        });
        router.push(`/payroll/${result.runId}/review`);
      }
    });
  }

  return (
    <div className="p-6 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold mb-4">Start New Payroll Run</h3>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="dateRange"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Pay Period</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-[300px] justify-start text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {field.value?.from ? (
                          field.value.to ? (
                            <>
                              {format(field.value.from, "LLL dd, y")} -{" "}
                              {format(field.value.to, "LLL dd, y")}
                            </>
                          ) : (
                            format(field.value.from, "LLL dd, y")
                          )
                        ) : (
                          <span>Pick a date range</span>
                        )}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={field.value?.from}
                      selected={field.value}
                      onSelect={field.onChange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isPending}>
            {isPending ? "Calculating..." : "Start Payroll Run"}
          </Button>
        </form>
      </Form>
    </div>
  );
}