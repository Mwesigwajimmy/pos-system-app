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
    CalendarDays,
    ArrowRight,
    CheckCircle2,
    FileText
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
 * BBU1 SOVEREIGN LABOR COMPENSATION MANAGER
 * VERSION: 11.2 | ENTERPRISE REGISTRY WELD
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
  
  // REGISTRY DATA STATES
  const [recentInputs, setRecentInputs] = useState<any[]>([]);
  const [activeContracts, setActiveContracts] = useState<any[]>([]);

  /**
   * AUTHORITATIVE DATA REFRESH
   * Pulls both base contracts and variable flux from the BBU1 node.
   */
  const refreshRegistryData = async () => {
    // 1. Fetch Variable Flux (Commissions/Bonuses)
    const { data: inputs } = await supabase
      .from('hr_payroll_inputs')
      .select('*, employees(full_name)')
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(8);
    
    // 2. Fetch Base Personnel Contracts (Sealed Salaries)
    const { data: contracts } = await supabase
      .from('hr_employee_salaries')
      .select('*, employees(full_name)')
      .eq('business_id', businessId)
      .order('effective_date', { ascending: false });
    
    if (inputs) setRecentInputs(inputs);
    if (contracts) setActiveContracts(contracts);
  };

  useEffect(() => {
    refreshRegistryData();
  }, [businessId]);

  // 1. Form: Base Contracts
  const contractForm = useForm<z.infer<typeof contractSchema>>({
    resolver: zodResolver(contractSchema),
    defaultValues: {
      contract_type: 'PERMANENT',
      pay_frequency: 'MONTHLY',
      currency_code: 'UGX'
    }
  });

  // 2. Form: Variable Pay
  const variableForm = useForm<z.infer<typeof variablePaySchema>>({
    resolver: zodResolver(variablePaySchema),
    defaultValues: {
      input_type: 'COMMISSION',
      effective_date: format(new Date(), 'yyyy-MM-dd')
    }
  });

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
    if (error) return toast.error("Handshake Refused", { description: error.message });
    
    toast.success("Identity Sealed", { description: "Personnel compensation registry updated." });
    contractForm.reset({ ...contractForm.getValues(), base_amount: 0 });
    refreshRegistryData();
  };

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
    
    toast.success("Entry Recorded", { description: "Flux entry successfully committed to ledger." });
    variableForm.reset({ ...variableForm.getValues(), amount: 0, description: '' });
    refreshRegistryData();
  };

  const deleteInput = async (id: string) => {
    const { error } = await supabase.from('hr_payroll_inputs').delete().eq('id', id);
    if (!error) refreshRegistryData();
  };

  return (
    <div className="flex flex-col gap-16 p-8 max-w-[1400px] mx-auto bg-white min-h-screen">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-4 border-b-2 border-slate-100">
        <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Labor Compensation Registry</h1>
            <p className="text-slate-500 text-sm font-medium">Registry administration for contractual base and operational flux.</p>
        </div>
        <div className="text-right flex flex-col items-end">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Authoritative Node</p>
            <div className="px-3 py-1 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-[11px] font-mono font-bold text-slate-600 tracking-tighter">{businessId}</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* SECTION 1: BASE COMPENSATION (CONTRACTS) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-red-600 rounded-full" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Registry Details (Base)</h2>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-8">
              <Form {...contractForm}>
                <form onSubmit={contractForm.handleSubmit(onContractSubmit)} className="space-y-8">
                  <FormField
                    control={contractForm.control}
                    name="employee_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Authorized Official</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                              <SelectTrigger className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium">
                                  <SelectValue placeholder="Select personnel..." />
                              </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {employees.map(e => (
                              <SelectItem key={e.id} value={e.id} className="text-xs">{e.full_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={contractForm.control}
                      name="contract_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Designation Class</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="PERMANENT" className="text-xs">Permanent Staff</SelectItem>
                              <SelectItem value="RETAINER" className="text-xs">Retainer/Consultant</SelectItem>
                              <SelectItem value="EXTERNAL_PROVIDER" className="text-xs">External Service</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={contractForm.control}
                      name="pay_frequency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Disbursement Cycle</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="MONTHLY" className="text-xs">Monthly</SelectItem>
                              <SelectItem value="BI-WEEKLY" className="text-xs">Twice per Month</SelectItem>
                              <SelectItem value="WEEKLY" className="text-xs">Weekly</SelectItem>
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Contractual Base (UGX)</FormLabel>
                        <FormControl>
                            <Input 
                              type="number" 
                              className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-bold font-mono" 
                              placeholder="0.00" 
                              {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button 
                      type="submit" 
                      disabled={isSavingContract} 
                      className="w-full h-12 bg-slate-900 hover:bg-black text-white text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
                  >
                    {isSavingContract ? <Loader2 className="animate-spin h-4 w-4" /> : "Commit Contract"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 2: VARIABLE FLUX (COMMISSIONS/BONUSES) */}
        <div className="space-y-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-amber-500 rounded-full" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Operational Flux (Variable)</h2>
          </div>

          <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
            <CardContent className="p-8">
              <Form {...variableForm}>
                <form onSubmit={variableForm.handleSubmit(onVariableSubmit)} className="space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={variableForm.control}
                      name="employee_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Beneficiary</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium">
                                  <SelectValue placeholder="Select worker..." />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {employees.map(e => (
                                  <SelectItem key={e.id} value={e.id} className="text-xs">{e.full_name}</SelectItem>
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
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Flux Type</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl><SelectTrigger className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium"><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent>
                              <SelectItem value="COMMISSION" className="text-xs">Commission</SelectItem>
                              <SelectItem value="BONUS" className="text-xs">Bonus</SelectItem>
                              <SelectItem value="OVERTIME" className="text-xs">Overtime</SelectItem>
                              <SelectItem value="DEDUCTION" className="text-xs">Penalty</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <FormField
                      control={variableForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Value (UGX)</FormLabel>
                          <FormControl>
                              <Input type="number" className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-bold font-mono" {...field} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={variableForm.control}
                      name="effective_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Applicable Date</FormLabel>
                          <FormControl>
                              <Input type="date" className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium" {...field} />
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
                        <FormLabel className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Registry Narrative</FormLabel>
                        <FormControl>
                          <Input 
                              placeholder="Reason for disbursement..." 
                              className="h-11 bg-slate-50 border-slate-200 shadow-none text-sm font-medium" 
                              {...field} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button 
                      type="submit" 
                      disabled={isSavingVariable} 
                      className="w-full h-12 bg-white border-2 border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white text-xs font-bold uppercase tracking-widest transition-all rounded-lg"
                  >
                    {isSavingVariable ? <Loader2 className="animate-spin h-4 w-4" /> : "Commit Flux Entry"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* SECTION 3: PERSONNEL CONTRACT REGISTRY (FIXED) */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-600 rounded-full" />
                <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Personnel Contract Registry (Authoritative)</h2>
            </div>
            <div className="px-3 py-1 bg-blue-50 border border-blue-100 rounded-full">
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">{activeContracts.length} SEALED CONTRACTS</span>
            </div>
        </div>

        <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Official Name</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Contract Class</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">Cycle</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-right">Base Value (UGX)</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">Effective Date</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">Seal</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {activeContracts.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-300 text-xs italic font-medium">Awaiting contractual labor inputs for this node...</td>
                        </tr>
                    )}
                    {activeContracts.map(contract => (
                        <tr key={contract.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="p-4 text-xs font-bold text-slate-800 uppercase tracking-tight">{contract.employees?.full_name}</td>
                            <td className="p-4 text-[11px] font-medium text-slate-500">{contract.contract_type}</td>
                            <td className="p-4 text-center">
                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[9px] font-black uppercase border border-blue-100">
                                    {contract.pay_frequency}
                                </span>
                            </td>
                            <td className="p-4 text-xs font-mono font-black text-slate-900 text-right">{Number(contract.base_amount).toLocaleString()}</td>
                            <td className="p-4 text-center text-[11px] text-slate-400 font-semibold">{format(new Date(contract.effective_date), 'dd MMM yyyy')}</td>
                            <td className="p-4 text-center">
                                <CheckCircle2 className="h-4 w-4 text-green-500 mx-auto" />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* SECTION 4: RECENT LABOR LOGS (VARIABLE FLUX) */}
      <div className="space-y-6">
        <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-slate-900 rounded-full" />
            <h2 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Operational Flux Audit Trail (Last 8 Entries)</h2>
        </div>

        <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Beneficiary</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Flux Type</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">Date</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">Registry Narrative</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-right">Amount (UGX)</th>
                        <th className="p-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider text-center">Action</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {recentInputs.length === 0 && (
                        <tr>
                            <td colSpan={6} className="p-12 text-center text-slate-400 text-xs italic">Awaiting operational flux records...</td>
                        </tr>
                    )}
                    {recentInputs.map(input => (
                        <tr key={input.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="p-4 text-xs font-bold text-slate-700 uppercase tracking-tight">{input.employees?.full_name}</td>
                            <td className="p-4">
                                <span className={cn(
                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase border",
                                    input.input_type === 'COMMISSION' ? 'bg-green-50 text-green-700 border-green-100' :
                                    input.input_type === 'BONUS' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                    'bg-slate-50 text-slate-700 border-slate-100'
                                )}>
                                    {input.input_type}
                                </span>
                            </td>
                            <td className="p-4 text-center text-xs text-slate-400 font-medium">{format(new Date(input.effective_date), 'dd MMM yyyy')}</td>
                            <td className="p-4 text-xs text-slate-500 italic max-w-xs truncate font-medium">{input.description}</td>
                            <td className="p-4 text-xs font-mono font-black text-slate-900 text-right">{Number(input.amount).toLocaleString()}</td>
                            <td className="p-4 text-center">
                                <button onClick={() => deleteInput(input.id)} className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-all">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </div>

      {/* SYSTEM SEAL: PROFESSIONAL FOOTER */}
      <div className="mt-8 pt-10 border-t border-slate-100 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-4">
            <div className="p-2 bg-slate-50 rounded-lg">
                <ShieldCheck className="h-5 w-5 text-slate-400" />
            </div>
            <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">BBU1 Global Sovereign Kernel v11.2</p>
                <p className="text-[9px] font-medium text-slate-500 uppercase tracking-tighter mt-0.5 leading-none">Authoritative Handshake and Secure Ledger Tunnel Active.</p>
            </div>
        </div>
        <div className="flex items-center gap-2 px-5 py-2 bg-slate-50 rounded-2xl border border-slate-100">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Identity Reconciled and Sealed</span>
        </div>
      </div>
    </div>
  );
}