"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useFieldArray } from "react-hook-form";
import * as z from "zod";
import { format, isBefore } from "date-fns";
import { 
    CalendarIcon, 
    Calculator, 
    ShieldCheck, 
    Loader2, 
    Info, 
    Landmark,
    Globe,
    Plus,
    Trash2,
    Percent,
    Banknote
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
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { runPayrollCalculation } from "@/lib/payroll/actions";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

/**
 * ENTERPRISE VALIDATION SCHEMA - V10.8
 * UPGRADE: Now supports dynamic tax and earning elements for any jurisdiction.
 */
const formSchema = z.object({
  dateRange: z.object({
    from: z.date({ message: "Start date is required." }),
    to: z.date({ message: "End date is required." }),
  }).refine((data) => {
    if (!data.from || !data.to) return true;
    return !isBefore(data.to, data.from);
  }, {
    message: "End date cannot be before start date.",
    path: ["to"],
  }),
  // --- NEW: DYNAMIC FINANCIAL ELEMENTS ---
  customElements: z.array(z.object({
    name: z.string().min(1, "Label is required"),
    type: z.enum(['EARNING', 'DEDUCTION']),
    method: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    value: z.coerce.number().min(0, "Value must be positive")
  }))
});

export function StartPayrollRunForm({ tenantId, tenantName = "Entity" }: { tenantId: string, tenantName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
        dateRange: {
            from: undefined as any,
            to: undefined as any
        },
        // DEFAULT INSTITUTIONAL TEMPLATE: Can be edited by the user
        customElements: [
            { name: 'PAYE Tax', type: 'DEDUCTION', method: 'PERCENTAGE', value: 30 },
            { name: 'NSSF Employee', type: 'DEDUCTION', method: 'PERCENTAGE', value: 5 }
        ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "customElements"
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const loadingToastId = "payroll-calculation-toast";
    toast.loading("Executing Global Payroll Engine...", { id: loadingToastId });

    startTransition(async () => {
      try {
        const result = await runPayrollCalculation(
          tenantId,
          format(values.dateRange.from, 'yyyy-MM-dd'),
          format(values.dateRange.to, 'yyyy-MM-dd'),
          values.customElements // Passing dynamic tax/earning data to server actions
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                    {/* 1. DATE SELECTION */}
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
                                    "w-full h-12 justify-start text-left font-mono text-base shadow-sm border-primary/20 hover:bg-white transition-all",
                                    !field.value?.from && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-3 h-5 w-5 text-primary opacity-50" />
                                    {field.value?.from ? (
                                    field.value.to ? (
                                        <>{format(field.value.from, "dd MMM yyyy")} — {format(field.value.to, "dd MMM yyyy")}</>
                                    ) : (format(field.value.from, "dd MMM yyyy"))
                                    ) : (<span>Select Pay Period Date Range</span>)}
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
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    {/* 2. DYNAMIC STATUTORY ELEMENTS */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <FormLabel className="text-xs font-bold uppercase text-slate-500">Cycle-Specific Tax & Earnings</FormLabel>
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                className="h-7 text-[10px] font-bold uppercase border-dashed"
                                onClick={() => append({ name: '', type: 'DEDUCTION', method: 'PERCENTAGE', value: 0 })}
                            >
                                <Plus className="h-3 w-3 mr-1" /> Add Adjustment
                            </Button>
                        </div>
                        
                        <div className="space-y-3">
                            {fields.map((field, index) => (
                                <div key={field.id} className="flex flex-wrap md:flex-nowrap items-end gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100 animate-in fade-in slide-in-from-left-1">
                                    <div className="flex-1 min-w-[120px]">
                                        <FormField
                                            control={form.control}
                                            name={`customElements.${index}.name`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormControl><Input placeholder="Label (e.g. PAYE)" className="h-10 text-xs font-bold uppercase bg-white" {...field} /></FormControl>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="w-[110px]">
                                        <FormField
                                            control={form.control}
                                            name={`customElements.${index}.type`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                        <FormControl>
                                                            <SelectTrigger className="h-10 text-[10px] font-bold bg-white"><SelectValue /></SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="EARNING" className="text-xs font-bold text-green-600">EARNING</SelectItem>
                                                            <SelectItem value="DEDUCTION" className="text-xs font-bold text-red-600">DEDUCTION</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <div className="w-[80px]">
                                        <FormField
                                            control={form.control}
                                            name={`customElements.${index}.value`}
                                            render={({ field }) => (
                                                <FormItem>
                                                    <div className="relative">
                                                        <FormControl><Input type="number" className="h-10 pl-2 pr-6 text-xs font-mono font-bold bg-white" {...field} /></FormControl>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            {form.watch(`customElements.${index}.method`) === 'PERCENTAGE' ? <Percent className="h-3 w-3 text-slate-400"/> : <Banknote className="h-3 w-3 text-slate-400"/>}
                                                        </div>
                                                    </div>
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <Button 
                                        type="button" 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-10 w-10 text-slate-300 hover:text-red-500"
                                        onClick={() => remove(index)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="pt-4 flex items-center gap-4">
                        <Button 
                            type="submit" 
                            disabled={isPending}
                            className="h-12 px-10 bg-primary hover:bg-primary/90 text-white font-bold shadow-lg transition-all"
                        >
                            {isPending ? (
                                <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Executing Math Engine...</>
                            ) : (
                                <><ShieldCheck className="mr-2 h-5 w-5" />Generate Payroll Draft</>
                            )}
                        </Button>
                    </div>
                </form>
            </Form>

            <div className="space-y-4">
                <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 shadow-inner">
                    <div className="flex items-center gap-2 text-primary">
                        <Landmark className="h-4 w-4" />
                        <h4 className="text-xs font-bold uppercase">Institutional Context</h4>
                    </div>
                    <ul className="space-y-3">
                        <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                            <span>This engine adaptively calculates net liabilities for your specific jurisdiction.</span>
                        </li>
                        <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                            <div className="h-1.5 w-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                            <span>Manual overrides enabled: define custom tax labels and percentages in the active buffer.</span>
                        </li>
                        <li className="flex items-start gap-2 text-[11px] text-slate-600 leading-tight">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
                            <span>System auto-reconciles against Account 6100 (Wages) and 2100 (Statutory Liability).</span>
                        </li>
                    </ul>
                </div>

                <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-lg flex items-start gap-3">
                    <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                    <p className="text-[10px] text-amber-800 leading-tight">
                        <strong>Architect Notice:</strong> You are currently operating on the BBU1 Global Sovereign Kernel. All calculations are logged for forensic audit.
                    </p>
                </div>
            </div>
        </div>
      </CardContent>

      <div className="p-4 bg-slate-50 border-t flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
        <span>Sovereign Identity Sealed: {tenantName}</span>
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3 text-green-500"/> GADS Interconnect Active</span>
            <span>{format(new Date(), 'yyyy')}</span>
        </div>
      </div>
    </Card>
  );
}