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
    <ScrollArea className="h-screen bg-white">
      <div className="max-w-[1500px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700 pb-32">
        
        {/* TOP METRICS & IDENTITY */}
        <Card className="border border-slate-100 shadow-sm rounded-3xl overflow-hidden bg-[#FCFCFC]">
          <CardContent className="p-10 flex flex-col lg:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl">
                <PenTool size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quotation Drafting terminal</h1>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 font-bold uppercase text-[9px] tracking-widest px-3 py-1">
                    System Protocol Active
                  </Badge>
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                    <Clock size={14}/> Operational Handshake Verified
                  </span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-10">
              <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Gross Margin</p>
                <p className={`text-4xl font-bold tracking-tighter ${totals.margin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totals.margin.toFixed(1)}%
                </p>
              </div>
              <div className="h-16 w-px bg-slate-200" />
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Base Currency</Label>
                <select {...register("currencyCode")} className="h-10 w-36 px-4 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none shadow-sm">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            
            {/* 1. REGISTRY & CORPORATE IDENTITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Registry Details</h2>
                  </div>
                  <Card className="rounded-[2rem] border-slate-100 shadow-sm p-8 bg-slate-50/30 grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Document Reference</Label>
                      <Input {...register("estimateUid")} className="h-12 border-none bg-white font-bold text-blue-600 shadow-inner rounded-xl px-5" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quotation Subject</Label>
                      <Input {...register("title")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Issuance Date</Label>
                      <Input type="date" {...register("issueDate")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Maturity Expiry</Label>
                      <Input type="date" {...register("validUntil")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Corporate Identity</h2>
                  </div>
                  <Card className="rounded-[2rem] border-slate-100 shadow-sm p-8 bg-slate-50/30 grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Authorized Official (CEO)</Label>
                      <Input {...register("ceoName")} placeholder="CEO / Manager Name" className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Tax ID (TIN)</Label>
                      <Input {...register("tinNumber")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">PO BOX / Postal</Label>
                      <Input {...register("pobox")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Physical/Plot Number</Label>
                      <Input {...register("plotNumber")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                  </Card>
                </div>
            </div>

            {/* 2. CUSTOMER & PAYMENT PROTOCOL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Stakeholder Context</h2>
                </div>
                <Card className="rounded-[2rem] border-slate-100 shadow-sm p-8 bg-slate-50/30 space-y-6">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Target Client/Entity</Label>
                    <select {...register("customerId")} className="w-full h-14 border-none bg-white font-bold rounded-2xl px-6 shadow-inner text-sm outline-none">
                      <option value="">Syncing counterparty registry...</option>
                      {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Operational Support Contact</Label>
                    <Input {...register("inquiryContact")} className="h-14 border-none bg-white font-bold rounded-2xl px-6 shadow-inner" />
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                  <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Payment Protocols</h2>
                </div>
                <Card className="rounded-[2rem] border-slate-100 shadow-sm p-8 bg-slate-50/30 space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Payable To (Beneficiary)</Label>
                      <Input {...register("chequesPayableTo")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">MOMO/Digital Pay</Label>
                      <Input {...register("momoDetails")} className="h-12 border-none bg-white font-bold rounded-xl px-5 shadow-inner" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Banking Routing Details</Label>
                    <Textarea {...register("bankDetails")} className="min-h-[80px] border-none bg-white font-bold rounded-2xl px-6 py-4 shadow-inner text-xs" />
                  </div>
                </Card>
              </div>
            </div>

            {/* 3. ITEM REGISTRY TABLE */}
            <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h2 className="text-lg font-bold text-slate-800 uppercase tracking-tight">Technical Specifications</h2>
                </div>

                <Card className="rounded-[2.5rem] border-slate-100 shadow-2xl shadow-slate-200/30 overflow-hidden border-none">
                    <ScrollArea className="w-full whitespace-nowrap">
                        <Table className="min-w-[1200px]">
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="h-16 border-none hover:bg-transparent">
                                    <TableHead className="w-20 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest">S.NO</TableHead>
                                    <TableHead className="min-w-[450px] border-l-2 border-red-500/20 font-bold text-slate-400 text-[10px] uppercase tracking-widest pl-10">Product Identity & Specification Detail</TableHead>
                                    <TableHead className="w-28 text-center font-bold text-slate-400 text-[10px] uppercase tracking-widest">Quantity</TableHead>
                                    <TableHead className="w-40 text-right font-bold text-slate-400 text-[10px] uppercase tracking-widest">Unit Cost ({currentCurrency})</TableHead>
                                    <TableHead className="w-40 text-right font-bold text-slate-400 text-[10px] uppercase tracking-widest">Unit Rate ({currentCurrency})</TableHead>
                                    <TableHead className="w-48 text-right pr-12 font-bold text-slate-400 text-[10px] uppercase tracking-widest">Landed Value</TableHead>
                                    <TableHead className="w-20"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-100 align-top group">
                                        <TableCell className="text-center pt-10 font-bold text-slate-300 text-sm">{index + 1}</TableCell>
                                        <TableCell className="py-8 pl-10 space-y-4">
                                            <Input {...register(`items.${index}.description` as const)} className="h-12 border-none bg-slate-50 font-bold text-slate-900 rounded-2xl shadow-inner px-5 text-sm" placeholder="Enter service/product identifier..." />
                                            <Textarea {...register(`items.${index}.details` as const)} className="min-h-[110px] border-none bg-slate-50 text-slate-600 font-medium rounded-2xl px-5 py-4 shadow-inner text-xs resize-none" placeholder="Provide detailed technical scope or product parameters..." />
                                        </TableCell>
                                        <TableCell className="pt-8">
                                            <Input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="h-12 border-none bg-slate-50 rounded-2xl text-center font-bold shadow-inner" />
                                        </TableCell>
                                        <TableCell className="pt-8">
                                            <Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-12 border-none bg-slate-50 rounded-2xl text-right font-bold shadow-inner text-amber-600" />
                                        </TableCell>
                                        <TableCell className="pt-8">
                                            <Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-12 border-none bg-slate-50 rounded-2xl text-right font-bold shadow-inner text-blue-600" />
                                        </TableCell>
                                        <TableCell className="pt-11 text-right pr-12 font-black text-slate-900 text-base tabular-nums">
                                            ${(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="pt-9">
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-11 w-11 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                                                <Trash2 size={20}/>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-14 px-10 rounded-2xl border-blue-600 border-2 text-blue-600 font-bold text-[10px] uppercase tracking-[0.2em] hover:bg-blue-600 hover:text-white transition-all shadow-xl shadow-blue-100 gap-3">
                            <Plus size={18} /> Append Transaction Entry
                        </Button>
                        <div className="flex items-center gap-3 text-slate-400 font-bold text-[10px] uppercase tracking-widest">
                            <ShieldCheck size={16} className="text-emerald-500" /> Accounting Integrity Mode
                        </div>
                    </div>
                </Card>
            </div>

            {/* 4. FINANCIAL SUMMARY & LEGAL */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-12">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-800">
                            <Info size={16} className="text-blue-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Statutory Terms and Conditions</h3>
                        </div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[220px] rounded-[2.5rem] border-none bg-slate-50/50 p-8 shadow-inner text-sm font-medium text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" placeholder="Outline maturity dates, payment terms, and delivery window..." />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-slate-800">
                            <FileDigit size={16} className="text-blue-500" />
                            <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-400">Internal Audit Description</h3>
                        </div>
                        <Textarea {...register("internalDescription")} className="min-h-[220px] rounded-[2.5rem] border-none bg-slate-50/50 p-8 shadow-inner text-sm font-medium text-slate-600 outline-none" placeholder="Private internal project notes regarding logistics or resource allocation..." />
                    </div>
                </div>

                <div className="space-y-10">
                    <Card className="rounded-[3rem] border-none bg-slate-900 text-white shadow-2xl p-12 space-y-10">
                        <div className="space-y-6">
                            <div className="flex justify-between items-center text-slate-500 uppercase tracking-widest text-[10px] font-bold">
                                <span>Operational Sub Total</span>
                                <span className="text-white text-sm font-bold">${totals.subTotal.toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Aggregate Discount Applied</span>
                                <Input type="number" step="0.01" {...register("discountAmount")} className="w-36 h-11 border-none bg-white/5 rounded-xl text-right font-bold text-white shadow-inner focus:ring-4 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Fiscal Tax Liability (%)</span>
                                <Input type="number" step="0.1" {...register("taxRate")} className="w-36 h-11 border-none bg-white/5 rounded-xl text-right font-bold text-white shadow-inner focus:ring-4 focus:ring-blue-500/10" />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manual Fiscal Adjustment</span>
                                <Input type="number" step="0.01" {...register("adjustment")} className="w-36 h-11 border-none bg-white/5 rounded-xl text-right font-bold text-white shadow-inner focus:ring-4 focus:ring-blue-500/10" />
                            </div>
                        </div>

                        <div className="pt-10 border-t-2 border-white/10 space-y-2">
                            <div className="flex justify-between items-end">
                                <div className="space-y-1">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Total Receivable Valuation</p>
                                    <h4 className="text-6xl font-bold text-white tracking-tighter tabular-nums leading-none">
                                        ${totals.grandTotal.toLocaleString()}
                                    </h4>
                                </div>
                                <Badge className="bg-blue-600 text-white font-bold px-5 py-2.5 rounded-2xl text-[10px] uppercase tracking-[0.2em] border-none mb-2 shadow-2xl">
                                  {currentCurrency} Net Sum
                                </Badge>
                            </div>
                        </div>
                        
                        <Button 
                            disabled={isSubmitting} 
                            type="submit" 
                            className="w-full h-24 bg-white hover:bg-blue-50 text-slate-900 font-bold uppercase tracking-[0.3em] text-sm rounded-[2.5rem] shadow-2xl transition-all active:scale-95 flex gap-6"
                        >
                            {isSubmitting ? (
                              <Loader2 className="animate-spin h-8 w-8" />
                            ) : (
                              <>
                                <CheckCircle2 size={28} className="text-blue-600" /> 
                                Finalize & Dispatch Protocol
                              </>
                            )}
                        </Button>
                    </Card>

                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-emerald-50 border border-emerald-100 px-8 py-4 rounded-[2rem] flex items-center gap-4 shadow-sm">
                            <Wifi size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-[0.2em]">
                                Synchronized | Registry: {format(new Date(), 'dd MMM, HH:mm')}
                            </span>
                        </div>
                        
                        <Button type="button" onClick={() => toast.error("Please save draft before printing")} variant="ghost" className="text-slate-400 font-bold text-[10px] uppercase tracking-widest gap-2 hover:text-slate-900">
                          <Printer size={16} /> Technical Print Sequence
                        </Button>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-20 pb-12 text-center opacity-30 border-t border-slate-100">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.5em] flex items-center justify-center gap-4">
                <FileDigit size={16} /> Registry ID: {tenantId.substring(0,18).toUpperCase()} • Engine v2.6.2
            </p>
        </footer>
      </div>
      <ScrollBar orientation="vertical" />
    </ScrollArea>
  );
}