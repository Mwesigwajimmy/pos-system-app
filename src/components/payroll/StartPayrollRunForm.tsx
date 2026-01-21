"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { format, isBefore } from "date-fns";
import { 
    CalendarIcon, 
    Calculator, 
    ShieldCheck, 
    Loader2, 
    Info, 
    Landmark,
    Globe
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage,
    FormDescription 
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { runPayrollCalculation } from "@/lib/payroll/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * ENTERPRISE VALIDATION SCHEMA
 * Optimized to prevent crashes when dates are undefined during selection.
 */
const formSchema = z.object({
  dateRange: z.object({
    // Using 'message' property as suggested by your TypeScript error
    from: z.date({ message: "Start date is required." }),
    to: z.date({ message: "End date is required." }),
  }).refine((data) => {
    // Safety check: only run isBefore if both dates exist
    if (!data.from || !data.to) return true;
    return !isBefore(data.to, data.from);
  }, {
    message: "End date cannot be before start date.",
    path: ["to"],
  }),
});

export function StartPayrollRunForm({ tenantId, tenantName = "Entity" }: { tenantId: string, tenantName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        dateRange: {
            from: undefined as any, // Cast to any to prevent TS complaining about undefined vs Date
            to: undefined as any
        }
    }
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const loadingToastId = "payroll-calculation-toast";
    toast.loading("Executing Global Payroll Engine...", { id: loadingToastId });

    startTransition(async () => {
      try {
        const result = await runPayrollCalculation(
          tenantId,
          format(values.dateRange.from, 'yyyy-MM-dd'),
          format(values.dateRange.to, 'yyyy-MM-dd')
        );

        if (result.error) {
          toast.error("Payroll Execution Failed", { 
            description: result.error,
            id: loadingToastId 
          });
        } else {
          toast.success("Payroll Run Calculated", {
            description: "Ledger-ready draft generated. Redirecting to audit review...",
            id: loadingToastId
          });
          router.push(`/payroll/${result.runId}/review`);
        }
      } catch (err: any) {
        toast.error("System Error", { 
            description: err.message || "An unexpected error occurred during calculation.", 
            id: loadingToastId 
        });
      }
    });
  }

  return (
    <Card className="shadow-xl border-none overflow-hidden">
      <CardHeader className="bg-muted/30 border-b pb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
                <div className="flex items-center gap-2">
                    <Calculator className="h-6 w-6 text-primary" />
                    <CardTitle className="text-2xl font-black tracking-tight uppercase">Payroll Calculation Engine</CardTitle>
                </div>
                <CardDescription>
                    Initiate an autonomous payroll run for <span className="font-bold text-slate-900">{tenantName}</span>.
                </CardDescription>
            </div>
            <div className="flex flex-col items-end gap-2">
                <Badge variant="outline" className="bg-white text-[10px] font-bold py-1">
                    <Globe className="h-3 w-3 mr-1 text-blue-500" /> MULTI-TAX COMPLIANT
                </Badge>
                <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-tighter">Tenant Ref: {tenantId.substring(0,8)}</span>
            </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="dateRange"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel className="text-xs font-bold uppercase text-slate-500">Service Period / Pay Cycle</FormLabel>
                            <Popover>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "w-full md:w-[400px] h-12 justify-start text-left font-mono text-base shadow-sm border-primary/20 hover:bg-white transition-all",
                                    !field.value?.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-5 w-5 text-primary opacity-50" />
                                    {field.value?.from ? (
                                    field.value.to ? (
                                        <>
                                        {format(field.value.from, "dd MMM yyyy")} — {format(field.value.to, "dd MMM yyyy")}
                                        </>
                                    ) : (
                                        format(field.value.from, "dd MMM yyyy")
                                    )
                                    ) : (
                                    <span>Select Pay Period Date Range</span>
                                    )}
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 border-none shadow-2xl" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={field.value?.from}
                                    selected={field.value}
                                    onSelect={field.onChange}
                                    numberOfMonths={2}
                                    className="rounded-md border shadow"
                                />
                            </PopoverContent>
                            </Popover>
                            <FormDescription className="text-[10px] uppercase font-medium">
                                Elements calculated: Basic, Allowances, Deductions & Statutory PAYE.
                            </FormDescription>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="pt-4 flex items-center gap-4">
                        <Button 
                            type="submit" 
                            disabled={isPending}
                            className="h-12 px-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg transition-all"
                        >
                            {isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Executing Math Engine...
                                </>
                            ) : (
                                <>
                                    <ShieldCheck className="mr-2 h-5 w-5" />
                                    Generate Payroll Draft
                                </>
                            )}
                        </Button>
                        {isPending && (
                            <span className="text-xs text-muted-foreground animate-pulse font-medium">
                                Validating Ledger accounts 6100 and 2100...
                            </span>
                        )}
                    </div>
                </form>
            </Form>

            <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4">
                    <div className="flex items-center gap-2 text-primary">
                        <Landmark className="h-4 w-4" />
                        <h4 className="text-xs font-bold uppercase">Accounting Context</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-xs text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>Automatically calculates net liabilities for local tax authorities (UG/URA).</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>Synchronizes payroll costs with the General Ledger upon approval.</span>
                        </li>
                        <li className="flex items-start gap-2 text-xs text-slate-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>Multi-currency support enabled via ISO 4217 standard.</span>
                        </li>
                    </ul>
                </div>

                <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-tight">
                        <strong>Draft Notice:</strong> Generating a draft will not impact your bank balance or ledger until explicit approval is granted in the next step.
                    </p>
                </div>
            </div>
        </div>
      </CardContent>

      <div className="p-4 bg-slate-50 border-t flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <span>GADS Interconnect: Active</span>
        <span>Secure Session Verified: {format(new Date(), 'yyyy')}</span>
      </div>
    </Card>
  );
}