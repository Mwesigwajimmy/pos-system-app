'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
    ShieldCheck, 
    Banknote, 
    TrendingUp, 
    Save, 
    Trash2, 
    History, 
    Loader2, 
    Info,
    UserCheck,
    Briefcase,
    CalendarDays
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { 
    Form, 
    FormControl, 
    FormField, 
    FormItem, 
    FormLabel, 
    FormMessage,
    FormDescription 
} from "@/components/ui/form";
import { toast } from "sonner";
import { createClient } from '@/lib/supabase/client';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

/**
 * SCHEMAS: SOVEREIGN LABOR CONTRACTS & FLUX
 */
const contractSchema = z.object({
  employee_id: z.string().uuid("Please select a person from the registry"),
  contract_type: z.enum(['PERMANENT', 'RETAINER', 'EXTERNAL_PROVIDER']),
  pay_frequency: z.enum(['MONTHLY', 'BI-WEEKLY', 'WEEKLY']),
  base_amount: z.coerce.number().min(1, "Base amount must be greater than zero"),
  currency_code: z.string().default('UGX'),
});

const variablePaySchema = z.object({
  employee_id: z.string().uuid("Please select a person from the registry"),
  input_type: z.enum(['COMMISSION', 'BONUS', 'OVERTIME', 'DEDUCTION']),
  amount: z.coerce.number().min(1, "Amount must be greater than zero"),
  effective_date: z.string().min(1, "Date is required"),
  description: z.string().min(3, "Please provide a reason for this payment"),
});

interface SalaryManagerProps {
    businessId: string;
    employees: { id: string; full_name: string }[];
}

export function SalaryManager({ businessId, employees }: SalaryManagerProps) {
  const supabase = createClient();
  const [isSavingContract, setIsSavingContract] = useState(false);
  const [isSavingVariable, setIsSavingVariable] = useState(false);
  const [recentInputs, setRecentInputs] = useState<any[]>([]);

  // 1. Fixed Salary / Contract Form
  const contractForm = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: 'PERMANENT',
      pay_frequency: 'MONTHLY',
      currency_code: 'UGX'
    }
  });

  // 2. Commissions / Bonuses Form
  const variableForm = useForm<z.infer<typeof variablePaySchema>>({
    resolver: zodResolver(variablePaySchema),
    defaultValues: {
      input_type: 'COMMISSION',
      effective_date: format(new Date(), 'yyyy-MM-dd')
    }
  });

  // Fetch recent variable entries to show an audit trail
  const fetchRecentInputs = async () => {
    const { data, error } = await supabase
      .from('hr_payroll_inputs')
      .select('*, employees(full_name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(8);
    
    if (!error && data) setRecentInputs(data);
  };

  useEffect(() => {
    fetchRecentInputs();
  }, [businessId]);

  // Handler: Seal a Permanent Contract
  const onContractSubmit = async (values: z.infer<typeof contractSchema>) => {
    setIsSavingContract(true);
    const { error } = await supabase.from('hr_employee_salaries').upsert({
      employee_id: values.employee_id,
      business_id: businessId,
      base_amount: values.base_amount,
      contract_type: values.contract_type,
      pay_frequency: values.pay_frequency,
      currency_code: values.currency_code,
      is_active: true,
      effective_date: format(new Date(), 'yyyy-MM-dd')
    }, { onConflict: 'employee_id' });

    setIsSavingContract(false);
    if (error) return toast.error("Database Refusal", { description: error.message });
    
    toast.success("Contract Sealed", { 
        description: "The worker's base compensation has been officially updated." 
    });
    contractForm.reset({ ...contractForm.getValues(), base_amount: 0 });
  };

  // Handler: Record a Commission or Bonus
  const onVariableSubmit = async (values: z.infer<typeof variablePaySchema>) => {
    setIsSavingVariable(true);
    const { error } = await supabase.from('hr_payroll_inputs').insert({
      business_id: businessId,
      employee_id: values.employee_id,
      input_type: values.input_type,
      amount: values.amount,
      effective_date: values.effective_date,
      description: values.description
    });

    setIsSavingVariable(false);
    if (error) return toast.error("Registry Error", { description: error.message });
    
    toast.success("Entry Recorded", { 
        description: `${values.input_type} added to the labor flux registry.` 
    });
    variableForm.reset({ ...variableForm.getValues(), amount: 0, description: '' });
    fetchRecentInputs();
  };

  return (
    <div className="flex flex-col gap-8 p-6 max-w-[1400px] mx-auto animate-in fade-in slide-in-from-bottom-2 duration-700">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase">Labor Compensation Control</h1>
            <p className="text-slate-500 font-medium">Authoritative registry for fixed salaries and variable commissions.</p>
        </div>
        <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl border border-blue-100">
            <ShieldCheck className="h-5 w-5 text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">Enterprise Node: {businessId.substring(0, 8)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD 1: BASE COMPENSATION (FIXED CONTRACTS) */}
        <Card className="border-none shadow-2xl bg-white ring-1 ring-slate-200 overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-50 border-b py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-xl shadow-blue-200">
                <Briefcase className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter text-slate-900">Base Contract Registry</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-500 uppercase">Set fixed pay for Staff, Consultants & Cleaners.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 flex-1">
            <Form {...contractForm}>
              <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-6">
                <FormField
                  control={contractForm.control}
                  name="employee_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Personnel Identity</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                            <SelectTrigger className="h-14 bg-slate-50 border-slate-200 text-base font-bold">
                                <SelectValue placeholder="Search labor registry..." />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {employees.map(e => (
                            <SelectItem key={e.id} value={e.id} className="font-bold uppercase text-xs">{e.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={contractForm.control}
                    name="contract_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Labor Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 bg-slate-50 font-bold text-xs"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="PERMANENT">PERMANENT STAFF</SelectItem>
                            <SelectItem value="RETAINER">RETAINER (CONSULTANT)</SelectItem>
                            <SelectItem value="EXTERNAL_PROVIDER">SERVICE (CLEANER/EXT)</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription className="text-[9px] uppercase font-bold text-slate-400 pt-1">Determines Tax mapping.</FormDescription>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={contractForm.control}
                    name="pay_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Payment Cycle</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-12 bg-slate-50 font-bold text-xs"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="MONTHLY">MONTHLY</SelectItem>
                            <SelectItem value="BI-WEEKLY">TWICE A MONTH</SelectItem>
                            <SelectItem value="WEEKLY">WEEKLY CYCLE</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={contractForm.control}
                  name="base_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Contractual Base (UGX)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Banknote className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300" />
                          <Input 
                            type="number" 
                            className="h-16 pl-14 text-2xl font-black font-mono border-slate-200 focus:ring-blue-500 focus:border-blue-500" 
                            placeholder="0.00" 
                            {...field} 
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                    type="submit" 
                    disabled={isSavingContract} 
                    className="w-full h-16 bg-slate-900 hover:bg-black text-white font-black text-xl shadow-2xl transition-all uppercase tracking-tighter"
                >
                  {isSavingContract ? <Loader2 className="animate-spin h-6 w-6" /> : <><Save className="mr-2 h-6 w-6" /> Authorize & Seal Contract</>}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* CARD 2: VARIABLE FLUX (COMMISSIONS, BONUSES, DEDUCTIONS) */}
        <Card className="border-none shadow-2xl bg-slate-900 text-white overflow-hidden flex flex-col">
          <CardHeader className="bg-slate-800 border-b border-white/5 py-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center text-slate-900 shadow-xl shadow-amber-500/20">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <CardTitle className="text-xl font-black uppercase tracking-tighter">Operational Flux Registry</CardTitle>
                <CardDescription className="text-xs font-bold text-slate-400 uppercase">Record Weekly Commissions, Bonuses & Penalties.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-8 flex-1">
            <Form {...variableForm}>
              <form onSubmit={variableForm.handleSubmit(onVariableSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={variableForm.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Personnel</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger className="h-11 bg-slate-800 border-white/10 text-white font-bold text-xs uppercase">
                                <SelectValue placeholder="Worker name..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map(e => (
                                <SelectItem key={e.id} value={e.id} className="uppercase text-[10px] font-bold">{e.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={variableForm.control}
                    name="input_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Flux Type</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-11 bg-slate-800 border-white/10 text-white font-bold text-xs"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="COMMISSION" className="text-green-500 font-bold uppercase text-xs">COMMISSION</SelectItem>
                            <SelectItem value="BONUS" className="text-blue-500 font-bold uppercase text-xs">PERFORMANCE BONUS</SelectItem>
                            <SelectItem value="OVERTIME" className="text-amber-500 font-bold uppercase text-xs">OVERTIME PAY</SelectItem>
                            <SelectItem value="DEDUCTION" className="text-red-500 font-bold uppercase text-xs">PENALTY / DEDUCTION</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={variableForm.control}
                    name="amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Value (UGX)</FormLabel>
                        <FormControl>
                            <Input type="number" className="h-11 bg-slate-800 border-white/10 text-white font-mono font-bold text-base" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={variableForm.control}
                    name="effective_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase text-slate-500">Applicable Date</FormLabel>
                        <FormControl>
                            <Input type="date" className="h-11 bg-slate-800 border-white/10 text-white font-bold text-xs" {...field} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={variableForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-[10px] font-black uppercase text-slate-500">Audit Narrative (Reason)</FormLabel>
                      <FormControl>
                        <Input 
                            placeholder="e.g. Weekly Sales Commission - Region North" 
                            className="h-12 bg-slate-800 border-white/10 text-white text-xs font-medium placeholder:text-slate-600" 
                            {...field} 
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <Button 
                    type="submit" 
                    disabled={isSavingVariable} 
                    className="w-full h-14 bg-amber-500 hover:bg-amber-600 text-slate-900 font-black uppercase tracking-tighter shadow-lg shadow-amber-500/10"
                >
                  {isSavingVariable ? <Loader2 className="animate-spin h-6 w-6" /> : "Commit to Operational Registry"}
                </Button>
              </form>
            </Form>

            {/* AUDIT LIST: THE RECENT FLUX ENTRIES */}
            <div className="mt-8 pt-6 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                    <History className="h-3.5 w-3.5 text-amber-500" /> Recent Labor Activity
                </div>
                <span className="text-[9px] font-bold text-slate-600 uppercase italic">Last 8 Global Entries</span>
              </div>
              
              <div className="space-y-2 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
                {recentInputs.length === 0 && (
                    <div className="p-10 border border-dashed border-white/5 rounded-2xl flex flex-col items-center gap-2 text-slate-600">
                        <Info className="h-6 w-6 opacity-20" />
                        <p className="text-[10px] font-bold uppercase tracking-widest italic">Awaiting cycle data...</p>
                    </div>
                )}
                {recentInputs.map(input => (
                  <div key={input.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group hover:bg-white/10 transition-all cursor-default">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-black uppercase tracking-tight leading-none">{input.employees?.full_name}</span>
                      <div className="flex items-center gap-2 pt-1">
                        <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase",
                            input.input_type === 'COMMISSION' ? 'bg-green-500/20 text-green-400' :
                            input.input_type === 'BONUS' ? 'bg-blue-500/20 text-blue-400' :
                            input.input_type === 'DEDUCTION' ? 'bg-red-500/20 text-red-400' : 'bg-slate-500/20 text-slate-400'
                        )}>
                            {input.input_type}
                        </span>
                        <span className="text-[9px] text-slate-500 font-bold">{format(new Date(input.effective_date), 'dd MMM yyyy')}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-sm font-mono font-black text-amber-400">{Number(input.amount).toLocaleString()} <span className="text-[8px] opacity-50 uppercase">UGX</span></span>
                      <p className="text-[9px] text-slate-600 italic font-medium truncate max-w-[120px]">{input.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* FOOTER: SOVEREIGN PROTOCOL SEALS */}
      <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-8">
        <div className="flex items-center gap-5">
          <div className="h-14 w-14 bg-white rounded-2xl border border-slate-200 flex items-center justify-center text-slate-400 shadow-sm">
            <UserCheck className="h-7 w-7" />
          </div>
          <div>
            <p className="text-sm font-black uppercase text-slate-800 leading-none">BBU1 Sovereign Labor Kernel</p>
            <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 opacity-60">System Version 10.9 | Authoritative Data Sync Active</p>
          </div>
        </div>
        
        <div className="flex items-center gap-10">
          <div className="flex flex-col items-end gap-1">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Compliance Tier</p>
             <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <ShieldCheck className="h-3 w-3 text-blue-600" />
                <span className="text-[10px] font-black text-slate-700">URA-UG-STANDARD-V4</span>
             </div>
          </div>
          <div className="flex flex-col items-end gap-1">
             <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Ledger State</p>
             <div className="flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                <span className="text-[10px] font-black text-green-700 uppercase tracking-tighter">Handshake Ready</span>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}