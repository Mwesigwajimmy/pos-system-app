"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Printer, Building2, Landmark, PenTool, 
  Calendar, Send, User, FileDigit, Info, Wifi, Smartphone,
  TrendingUp, ShieldCheck, Clock, MapPin, Mail, Hash
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  customerId: z.string().min(1, "Client selection required"),
  estimateUid: z.string().min(1, "Reference ID required"),
  title: z.string().min(3, "Document subject required"),
  issueDate: z.string().min(1),
  validUntil: z.string().min(1),
  currencyCode: z.string().min(3),
  
  // Corporate Identity
  plotNumber: z.string().optional(),
  pobox: z.string().optional(),
  tinNumber: z.string().optional(),
  officialEmail: z.string().optional(),
  ceoName: z.string().optional(),
  ceoDesignation: z.string().optional(),
  
  // Payment Protocol
  chequesPayableTo: z.string().optional(),
  bankDetails: z.string().optional(),
  momoDetails: z.string().optional(),
  inquiryContact: z.string().optional(),
  
  // Terms & Notes
  termsAndConditions: z.string().optional(),
  internalDescription: z.string().optional(),
  
  // Financial Modifiers
  taxRate: z.coerce.number().default(0),
  discountAmount: z.coerce.number().default(0),
  adjustment: z.coerce.number().default(0),

  items: z.array(z.object({
    description: z.string().min(1, "Item name required"),
    details: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unitCost: z.coerce.number().min(0), 
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
        title: 'Commercial Quotation and Service Estimate', 
        currencyCode: 'USD',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        officialEmail: businessInfo.email,
        tinNumber: businessInfo.tin,
        plotNumber: businessInfo.plot || '',
        pobox: businessInfo.pobox || '',
        chequesPayableTo: businessInfo.name,
        bankDetails: 'Bank Name, Branch, Account Number',
        ceoName: '',
        ceoDesignation: 'Management',
        inquiryContact: businessInfo.phone,
        taxRate: 0,
        discountAmount: 0,
        adjustment: 0,
        items: [{ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 }] 
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
    const totalCost = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitCost || 0, curr.quantity || 0), 0);
    const margin = subTotal > 0 ? ((subTotal - totalCost) / subTotal) * 100 : 0;
    
    const taxableBasis = subTotal - discount;
    const taxAmount = taxableBasis * (taxRate / 100);
    const grandTotal = taxableBasis + taxAmount + adjustment;

    return { subTotal, totalCost, margin, taxAmount, grandTotal };
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
          unit_cost: item.unitCost,
          unit_price: item.unitRate, 
          total: Money.multiply(item.unitRate, item.quantity)
        }))
      );

      if (lineErr) throw lineErr;
      toast.success("Operational protocol saved to registry");
      router.push('/invoicing/estimates/history'); 
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* TOP METRICS & IDENTITY */}
        <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-slate-50/30">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-slate-900 rounded-lg text-white shadow-md">
                <PenTool size={24} />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Estimate Drafting Terminal</h1>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-600 text-white font-bold uppercase text-[8px] tracking-wider px-2 py-0.5 border-none">
                    Protocol Active
                  </Badge>
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5">
                    <Clock size={12}/> Handshake Verified
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Margin</p>
                <p className={`text-2xl font-bold tracking-tight ${totals.margin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totals.margin.toFixed(1)}%
                </p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Currency</Label>
                <select {...register("currencyCode")} className="h-9 w-32 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* 1. REGISTRY & CORPORATE IDENTITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Registry Details</h2>
                  <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Document Ref</Label>
                      <Input {...register("estimateUid")} className="h-10 border-slate-200 bg-white font-bold text-blue-600 rounded-lg px-4" readOnly />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Subject</Label>
                      <Input {...register("title")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Issue Date</Label>
                      <Input type="date" {...register("issueDate")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Valid Until</Label>
                      <Input type="date" {...register("validUntil")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" />
                    </div>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Corporate Identity</h2>
                  <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Official (CEO)</Label>
                      <Input {...register("ceoName")} placeholder="Name" className="h-10 border-slate-200 bg-white rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">TIN Number</Label>
                      <Input {...register("tinNumber")} className="h-10 border-slate-200 bg-white rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">PO BOX</Label>
                      <Input {...register("pobox")} className="h-10 border-slate-200 bg-white rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Plot Number</Label>
                      <Input {...register("plotNumber")} className="h-10 border-slate-200 bg-white rounded-lg px-4" />
                    </div>
                  </Card>
                </div>
            </div>

            {/* 2. CUSTOMER & PAYMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Stakeholder Context</h2>
                <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Target Client</Label>
                    <select {...register("customerId")} className="w-full h-10 border-slate-200 bg-white font-medium rounded-lg px-4 text-sm outline-none">
                      <option value="">Syncing registry...</option>
                      {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Inquiry Contact</Label>
                    <Input {...register("inquiryContact")} className="h-10 border-slate-200 bg-white rounded-lg px-4" />
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Payment Protocols</h2>
                <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Payable To</Label>
                      <Input {...register("chequesPayableTo")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Digital Pay</Label>
                      <Input {...register("momoDetails")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Banking Details</Label>
                    <Textarea {...register("bankDetails")} className="min-h-[60px] border-slate-200 bg-white font-medium rounded-lg px-4 py-2 text-xs" />
                  </div>
                </Card>
              </div>
            </div>

            {/* 3. ITEM TABLE */}
            <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Technical Specifications</h2>
                <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="h-12 border-none">
                                    <TableHead className="w-12 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">#</TableHead>
                                    <TableHead className="min-w-[400px] font-bold text-slate-500 text-[10px] uppercase tracking-wider pl-6">Product Identity & Detail</TableHead>
                                    <TableHead className="w-24 text-center font-bold text-slate-500 text-[10px] uppercase tracking-wider">Qty</TableHead>
                                    <TableHead className="w-32 text-right font-bold text-slate-500 text-[10px] uppercase tracking-wider">Cost ({currentCurrency})</TableHead>
                                    <TableHead className="w-32 text-right font-bold text-slate-500 text-[10px] uppercase tracking-wider">Rate ({currentCurrency})</TableHead>
                                    <TableHead className="w-36 text-right pr-8 font-bold text-slate-500 text-[10px] uppercase tracking-wider">Total</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="hover:bg-slate-50 transition-all border-b last:border-none align-top">
                                        <TableCell className="text-center pt-5 text-xs font-bold text-slate-300">{index + 1}</TableCell>
                                        <TableCell className="py-4 pl-6 space-y-2">
                                            <Input {...register(`items.${index}.description` as const)} className="h-9 border-slate-200 bg-white font-bold text-slate-900 rounded-lg px-4 text-xs" placeholder="Item name..." />
                                            <Textarea {...register(`items.${index}.details` as const)} className="min-h-[80px] border-slate-200 bg-slate-50/50 text-slate-600 font-medium rounded-lg px-4 py-2 text-[11px] resize-none" placeholder="Technical specifications..." />
                                        </TableCell>
                                        <TableCell className="pt-4 align-top">
                                            <Input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="h-9 border-slate-200 rounded-lg text-center font-bold text-xs" />
                                        </TableCell>
                                        <TableCell className="pt-4 align-top">
                                            <Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-9 border-slate-200 rounded-lg text-right font-bold text-xs text-amber-600" />
                                        </TableCell>
                                        <TableCell className="pt-4 align-top">
                                            <Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-9 border-slate-200 rounded-lg text-right font-bold text-xs text-blue-600" />
                                        </TableCell>
                                        <TableCell className="pt-6 text-right pr-8 font-bold text-slate-900 text-sm tabular-nums">
                                            {(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="pt-4 align-top">
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-slate-300 hover:text-red-500 rounded-lg">
                                                <Trash2 size={16}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <div className="p-4 bg-slate-50/30 border-t border-slate-100 flex justify-between items-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-10 px-6 rounded-lg border-blue-600 text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm gap-2">
                            <Plus size={16} /> Add Transaction Entry
                        </Button>
                        <div className="flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest">
                            <ShieldCheck size={14} className="text-emerald-500" /> Accounting Integrity Verified
                        </div>
                    </div>
                </Card>
            </div>

            {/* 4. SUMMARY & LEGAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Info size={14} className="text-blue-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Statutory Terms</h3>
                        </div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[140px] rounded-xl border-slate-200 bg-slate-50/20 p-4 text-xs font-medium text-slate-600" placeholder="Settlement terms..." />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <FileDigit size={14} className="text-blue-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Internal Audit Description</h3>
                        </div>
                        <Textarea {...register("internalDescription")} className="min-h-[140px] rounded-xl border-slate-200 bg-slate-50/20 p-4 text-xs font-medium text-slate-600" placeholder="Internal remarks..." />
                    </div>
                </div>

                <div className="space-y-8">
                    <Card className="rounded-2xl border-none bg-slate-900 text-white shadow-xl p-8 md:p-10 space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                                <span>Sub Total</span>
                                <span className="text-white text-xs">${totals.subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-rose-400 uppercase tracking-wider pt-1">
                                <span>Discounts</span>
                                <Input type="number" step="0.01" {...register("discountAmount")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-blue-400 uppercase tracking-wider pt-1">
                                <span>Tax Liability (%)</span>
                                <Input type="number" step="0.1" {...register("taxRate")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" />
                            </div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider pt-1">
                                <span>Adjustment</span>
                                <Input type="number" step="0.01" {...register("adjustment")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                            <div className="space-y-0.5">
                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Valuation</p>
                                <h4 className="text-3xl font-bold text-white tracking-tight tabular-nums">
                                    ${totals.grandTotal.toLocaleString()}
                                </h4>
                            </div>
                            <Badge className="bg-blue-600 text-white font-bold px-3 py-1 rounded-md text-[8px] uppercase tracking-wider border-none mb-1">
                                {currentCurrency} Net Sum
                            </Badge>
                        </div>
                        
                        <Button 
                            disabled={isSubmitting} 
                            type="submit" 
                            className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all active:scale-95 flex gap-3"
                        >
                            {isSubmitting ? (
                              <Loader2 className="animate-spin h-4 w-4" />
                            ) : (
                              <>
                                <CheckCircle2 size={18} className="text-blue-600" /> 
                                Finalize Protocol
                              </>
                            )}
                        </Button>
                    </Card>

                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm">
                            <Wifi size={12} className="text-emerald-500" />
                            <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">
                                Synchronized: {format(new Date(), 'dd MMM, HH:mm')}
                            </span>
                        </div>
                        
                        <Button type="button" onClick={() => toast.error("Please save draft before printing")} variant="ghost" className="text-slate-400 font-bold text-[9px] uppercase tracking-widest gap-2 hover:text-slate-900">
                          <Printer size={14} /> Print Specification
                        </Button>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-12 pb-8 text-center opacity-40 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center justify-center gap-3">
                <FileDigit size={14} /> Registry ID: {tenantId.substring(0,18).toUpperCase()} • v2.6.2
            </p>
        </footer>
      </div>
    </div>
  );
}