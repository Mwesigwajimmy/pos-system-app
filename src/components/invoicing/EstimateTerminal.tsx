"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Printer, Building2, Landmark, PenTool, 
  Calendar, Send, User, FileDigit, Info, Wifi
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer required"),
  estimateUid: z.string().min(1, "ID required"),
  title: z.string().min(3, "Subject required"),
  issueDate: z.string().min(1),
  validUntil: z.string().min(1),
  currencyCode: z.string().min(3),
  plotNumber: z.string().optional(),
  pobox: z.string().optional(),
  tinNumber: z.string().optional(),
  officialEmail: z.string().optional(),
  ceoName: z.string().optional(),
  ceoDesignation: z.string().optional(),
  chequesPayableTo: z.string().optional(),
  bankDetails: z.string().optional(),
  inquiryContact: z.string().optional(),
  termsAndConditions: z.string().optional(),
  internalDescription: z.string().optional(),
  taxRate: z.coerce.number().default(0),
  discountAmount: z.coerce.number().default(0),
  adjustment: z.coerce.number().default(0),
  items: z.array(z.object({
    description: z.string().min(1, "Required"),
    details: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unitRate: z.coerce.number().min(0), 
  })).min(1)
});

type EstimateForm = z.infer<typeof estimateSchema>;

interface EstimateTerminalProps {
    tenantId: string;
    customers: any[];
    currencies: { code: string; name: string; symbol: string }[];
    businessInfo: { 
        name: string; 
        email: string; 
        phone: string; 
        tin: string; 
        address: string;
        plot?: string;
        pobox?: string;
    };
    branding?: { logo_url: string | null };
}

export default function EstimateTerminal({ 
    tenantId, 
    customers, 
    currencies,
    businessInfo,
    branding
}: EstimateTerminalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { 
        title: 'Service Quotation', 
        currencyCode: 'USD',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        officialEmail: businessInfo.email,
        tinNumber: businessInfo.tin,
        chequesPayableTo: businessInfo.name,
        bankDetails: '',
        termsAndConditions: '',
        internalDescription: '',
        taxRate: 0,
        discountAmount: 0,
        adjustment: 0,
        items: [{ description: '', details: '', quantity: 1, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrency = watch("currencyCode");
  const taxRate = watch("taxRate");
  const discount = watch("discountAmount");
  const adjustment = watch("adjustment");

  useEffect(() => {
    async function fetchNextSequence() {
        const { count, error } = await supabase
            .from('estimates')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        if (!error) {
            setValue('estimateUid', `QT-${((count || 0) + 1).toString().padStart(4, '0')}`);
        }
    }
    fetchNextSequence();
  }, [tenantId, setValue, supabase]);

  const totals = useMemo(() => {
    const subTotal = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const taxAmount = (subTotal - discount) * (taxRate / 100);
    const grandTotal = subTotal - discount + taxAmount + adjustment;
    return { subTotal, taxAmount, grandTotal };
  }, [watchedItems, taxRate, discount, adjustment]);

  const onSubmit: SubmitHandler<EstimateForm> = async (values) => {
    setIsSubmitting(true);
    try {
      const { data: estData, error: estErr } = await supabase.from('estimates').insert({
        tenant_id: tenantId,
        customer_id: values.customerId,
        estimate_uid: values.estimateUid,
        title: values.title,
        status: 'PENDING', 
        currency_code: values.currencyCode,
        total_amount: totals.grandTotal,
        valid_until: values.validUntil,
        client_name: customers.find(c => String(c.id) === values.customerId)?.name,
        metadata: { ...values } 
      }).select('id').single();

      if (estErr) throw estErr;

      const { error: lineErr } = await supabase.from('estimate_line_items').insert(
        values.items.map(item => ({
          estimate_id: estData.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitRate, 
          total: Money.multiply(item.unitRate, item.quantity)
        }))
      );

      if (lineErr) throw lineErr;
      toast.success("Quotation Saved");
      router.push('/invoicing/estimates/history'); 
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-screen bg-[#F8FAFC]">
      <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
        
        <header className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Generate Quotation</h1>
            <p className="text-sm text-slate-500 font-medium max-w-2xl">
                Create detailed service estimates based on customer requirements. These documents serve as the preliminary agreement before a sales order is confirmed.
            </p>
        </header>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Client Selection</Label>
                    <select {...register("customerId")} className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10">
                        <option value="">Select Customer...</option>
                        {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Quotation Subject</Label>
                    <Input {...register("title")} className="h-11 rounded-xl border-slate-200 font-bold" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Reference No.</Label>
                        <Input {...register("estimateUid")} className="h-11 rounded-xl bg-slate-50 border-slate-100 font-black text-blue-600" readOnly />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Currency</Label>
                        <select {...register("currencyCode")} className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-white text-sm font-bold">
                            {currencies.map(c => <option key={c.code} value={c.code}>{c.code}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Quoted Items</h2>
                </div>

                <Card className="rounded-2xl border-slate-200 shadow-xl shadow-slate-200/40 overflow-hidden border-none">
                    <Table>
                        <TableHeader className="bg-slate-50/80">
                            <TableRow className="h-14 border-none">
                                <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase">S.NO</TableHead>
                                <TableHead className="min-w-[400px] border-l-2 border-red-500/20 font-bold text-slate-400 text-[10px] uppercase">Product Name & Description</TableHead>
                                <TableHead className="w-28 text-center font-bold text-slate-400 text-[10px] uppercase">Quantity</TableHead>
                                <TableHead className="w-40 text-right font-bold text-slate-400 text-[10px] uppercase">List Price ({currentCurrency})</TableHead>
                                <TableHead className="w-44 text-right pr-10 font-bold text-slate-400 text-[10px] uppercase text-right">Line Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="hover:bg-slate-50 transition-all border-b-slate-100 align-top">
                                    <TableCell className="text-center pt-8 font-bold text-slate-400 text-sm">{index + 1}</TableCell>
                                    <TableCell className="py-6 space-y-3">
                                        <Input {...register(`items.${index}.description` as const)} className="h-11 rounded-xl border-slate-200 font-bold text-sm" placeholder="Enter service or product name..." />
                                        <Textarea {...register(`items.${index}.details` as const)} className="min-h-[100px] rounded-xl border-slate-100 bg-slate-50/50 text-sm placeholder:text-slate-300 resize-none p-4" placeholder="Description details..." />
                                    </TableCell>
                                    <TableCell className="pt-6">
                                        <Input type="number" {...register(`items.${index}.quantity` as const)} className="h-11 rounded-xl text-center font-bold border-slate-200" />
                                    </TableCell>
                                    <TableCell className="pt-6">
                                        <Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-11 rounded-xl text-right font-bold border-slate-200" />
                                    </TableCell>
                                    <TableCell className="pt-6 text-right pr-10 font-black text-slate-900 text-sm">
                                        <div className="h-11 flex items-center justify-end">
                                            ${(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </div>
                                    </TableCell>
                                    <TableCell className="pt-6">
                                        <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-11 w-11 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                                            <Trash2 size={18}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-6 bg-slate-50/50 border-t border-slate-100">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', details: '', quantity: 1, unitRate: 0 })} className="h-12 px-8 rounded-xl border-blue-600 border-2 text-blue-600 font-bold text-xs uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-100">
                            <Plus size={16} className="mr-2"/> Add Line Item
                        </Button>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800">
                            <Info size={16} className="text-blue-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">Terms and Conditions</h3>
                        </div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[160px] rounded-2xl border-slate-200 bg-white p-6 shadow-inner text-sm font-medium text-slate-600" placeholder="Outline payment terms, validity periods, and delivery timelines..." />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-slate-800">
                            <FileDigit size={16} className="text-blue-500" />
                            <h3 className="text-sm font-bold uppercase tracking-widest">Internal Description</h3>
                        </div>
                        <Textarea {...register("internalDescription")} className="min-h-[160px] rounded-2xl border-slate-200 bg-white p-6 shadow-inner text-sm font-medium text-slate-600" placeholder="Add notes for internal audit or project management..." />
                    </div>
                </div>

                <div className="space-y-8">
                    <Card className="rounded-[2.5rem] border-none bg-white shadow-2xl shadow-slate-200/60 p-10 space-y-8">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-slate-500">
                                <span className="text-xs font-bold uppercase tracking-widest">Sub Total</span>
                                <span className="text-sm font-black text-slate-900">${totals.subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500 pt-2">
                                <span className="text-xs font-bold uppercase tracking-widest">Total Discount</span>
                                <Input type="number" {...register("discountAmount")} className="w-24 h-9 text-right font-bold border-slate-100 rounded-lg" />
                            </div>
                            <div className="flex justify-between items-center text-slate-500 pt-2">
                                <span className="text-xs font-bold uppercase tracking-widest">Tax Liability (%)</span>
                                <Input type="number" {...register("taxRate")} className="w-24 h-9 text-right font-bold border-slate-100 rounded-lg" />
                            </div>
                            <div className="flex justify-between items-center text-slate-500 pt-2">
                                <span className="text-xs font-bold uppercase tracking-widest">Adjustment</span>
                                <Input type="number" {...register("adjustment")} className="w-24 h-9 text-right font-bold border-slate-100 rounded-lg" />
                            </div>
                        </div>

                        <div className="pt-10 border-t-2 border-slate-900 space-y-1">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Payable Amount</p>
                                    <h4 className="text-5xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                        ${totals.grandTotal.toLocaleString()}
                                    </h4>
                                </div>
                                <Badge className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest">{currentCurrency} Currency</Badge>
                            </div>
                        </div>
                        
                        <Button 
                            disabled={isSubmitting} 
                            type="submit" 
                            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] text-sm rounded-3xl shadow-2xl shadow-blue-200 transition-all active:scale-95 flex gap-4"
                        >
                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <><CheckCircle2 size={24} /> Finalize & Dispatch Quote</>}
                        </Button>
                    </Card>

                    <div className="flex justify-center">
                        <div className="bg-emerald-50 border border-emerald-100 px-5 py-2.5 rounded-2xl flex items-center gap-3 shadow-sm">
                            <Wifi size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">
                                Online | Sync: {format(new Date(), 'dd MMM, HH:mm')}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-12 text-center opacity-30">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] flex items-center justify-center gap-4">
                <FileDigit size={14} /> Estimate Protocol Engine v2.6
            </p>
        </footer>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}