"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Landmark, PenTool, Send, User, FileDigit, Info, Wifi, 
  ShieldCheck, Clock, MapPin, Mail, Hash, Globe, Type, Smartphone
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// --- UTILS ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

const hexToRgb = (hex: string = "#0F172A") => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

// --- SCHEMA ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client selection required"),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  clientLocation: z.string().optional(),
  estimateUid: z.string().min(1, "Reference ID required"),
  title: z.string().min(3, "Document subject required"),
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
  momoDetails: z.string().optional(),
  inquiryContact: z.string().optional(),
  termsAndConditions: z.string().optional(),
  internalDescription: z.string().optional(),
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
    businessInfo: any;
    branding?: any; 
}

export default function EstimateTerminal({ tenantId, customers, currencies, businessInfo, branding }: EstimateTerminalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();
  const { locale = 'en' } = useParams();

  const { register, control, handleSubmit, watch, setValue } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { 
        title: branding?.document_header || 'Commercial Quotation', 
        currencyCode: businessInfo?.currency || 'UGX',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        officialEmail: branding?.official_email || businessInfo?.email,
        tinNumber: branding?.tin_number || businessInfo?.tin_number,
        plotNumber: branding?.plot_number || 'N/A',
        pobox: branding?.po_box || 'N/A',
        chequesPayableTo: branding?.company_name_display || businessInfo?.business_name,
        ceoName: branding?.ceo_name || '',
        ceoDesignation: branding?.ceo_role || 'Director',
        inquiryContact: branding?.official_phone || businessInfo?.phone,
        termsAndConditions: branding?.payment_instructions || '',
        items: [{ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrency = watch("currencyCode");
  const taxRate = watch("taxRate");
  const discount = watch("discountAmount");
  const adjustment = watch("adjustment");

  const activeCurrency = useMemo(() => {
    return currencies.find(c => c.code === currentCurrency) || { code: 'UGX', symbol: 'Shs' };
  }, [currentCurrency, currencies]);

  // SEQUENCE GENERATOR
  useEffect(() => {
    async function getSeq() {
        const { data } = await supabase.from('estimates').select('estimate_uid').order('created_at', { ascending: false }).limit(1);
        const sequence = data?.length ? (parseInt(data[0].estimate_uid.split('-')[1]) + 1) : 1;
        setValue('estimateUid', `QT-${sequence.toString().padStart(4, '0')}-${Date.now().toString().slice(-3)}`);
    }
    getSeq();
  }, [setValue, supabase]);

  // TOTALS & MARGIN LOGIC
  const totals = useMemo(() => {
    const subTotal = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const totalCost = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitCost || 0, curr.quantity || 0), 0);
    const margin = subTotal > 0 ? ((subTotal - totalCost) / subTotal) * 100 : 0;
    const taxableBasis = subTotal - discount;
    const taxAmount = taxableBasis * (taxRate / 100);
    const grandTotal = taxableBasis + taxAmount + adjustment;
    return { subTotal, totalCost, margin, taxAmount, grandTotal };
  }, [watchedItems, taxRate, discount, adjustment]);

  /**
   * --- 🛡️ PROFESSIONAL CLEAN PDF ENGINE ---
   */
  const generatePDF = async (values: EstimateForm) => {
    const doc = new jsPDF();
    const clientName = customers.find(c => String(c.id) === values.customerId)?.name || 'Valued Client';
    const primaryRGB = hexToRgb(branding?.primary_color || '#1E293B');
    const textRGB = hexToRgb(branding?.document_text_color || '#334155');

    // 1. Watermark
    if (branding?.logo_url) {
        try {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: branding.watermark_opacity || 0.05 }));
            doc.addImage(branding.logo_url, 'PNG', 45, 90, 120, 120, undefined, 'FAST');
            doc.restoreGraphicsState();
        } catch (e) {}
    }

    // 2. Clean Header
    if (branding?.logo_url) doc.addImage(branding.logo_url, 'PNG', 15, 15, 30, 30);
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text((branding?.company_name_display || businessInfo?.business_name).toUpperCase(), 50, 25);
    
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`TIN: ${values.tinNumber}`, 50, 32);
    doc.text(`Email: ${values.officialEmail}`, 50, 36);
    doc.text(`Contact: ${values.inquiryContact}`, 50, 40);
    doc.text(`Address: ${values.plotNumber}, ${values.pobox}`, 50, 44);

    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(0.5); doc.line(15, 52, 195, 52);

    // 3. Subject
    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text(values.title.toUpperCase(), 15, 68);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Ref: ${values.estimateUid}`, 15, 76);
    doc.text(`Date: ${format(new Date(values.issueDate), 'dd MMMM yyyy')}`, 15, 81);
    doc.text(`Valid Until: ${format(new Date(values.validUntil), 'dd MMMM yyyy')}`, 15, 86);

    // 4. Client Context
    doc.setFillColor(248, 250, 252); doc.rect(15, 95, 180, 35, 'F');
    doc.setFont("helvetica", "bold"); doc.text("BILL TO / CLIENT:", 20, 102);
    doc.setFont("helvetica", "normal"); 
    doc.text(clientName, 20, 108);
    doc.text(`${values.clientEmail || ''} | ${values.clientPhone || ''}`, 20, 114);
    doc.text(`Location: ${values.clientLocation || 'N/A'}`, 20, 120);

    // 5. Table
    autoTable(doc, {
      startY: 135,
      head: [['#', 'Description & Specifications', 'Qty', 'Rate', 'Total']],
      body: values.items.map((it, i) => [i + 1, { content: `${it.description}\n${it.details || ''}`, styles: { fontSize: 8 } }, it.quantity, `${activeCurrency.symbol}${it.unitRate.toLocaleString()}`, `${activeCurrency.symbol}${(it.quantity * it.unitRate).toLocaleString()}`]),
      headStyles: { fillColor: primaryRGB, textColor: [255, 255, 255] },
      theme: 'grid', margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 240) { doc.addPage(); finalY = 20; }

    // 6. Totals
    doc.setFontSize(10);
    doc.text("Sub-total:", 140, finalY);
    doc.text(`${activeCurrency.symbol}${totals.subTotal.toLocaleString()}`, 195, finalY, { align: 'right' });
    doc.text(`Tax (${values.taxRate}%):`, 140, finalY + 7);
    doc.text(`+${activeCurrency.symbol}${totals.taxAmount.toLocaleString()}`, 195, finalY + 7, { align: 'right' });

    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(130, finalY + 12, 70, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text("TOTAL DUE:", 135, finalY + 20);
    doc.text(`${activeCurrency.symbol}${totals.grandTotal.toLocaleString()}`, 195, finalY + 20, { align: 'right' });

    // 7. Settlement & Footer
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(9); doc.text("SETTLEMENT PROTOCOLS:", 15, finalY + 45);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${values.bankDetails}`, 15, finalY + 51);
    doc.text(`MOMO: ${values.momoDetails}`, 15, finalY + 56);
    doc.text(`Payable To: ${values.chequesPayableTo}`, 15, finalY + 61);

    doc.setFont("helvetica", "bold"); doc.text("TERMS & CONDITIONS:", 15, finalY + 75);
    doc.setFont("helvetica", "normal"); 
    const terms = doc.splitTextToSize(values.termsAndConditions || 'Standard terms apply.', 175);
    doc.text(terms, 15, finalY + 81);

    if (branding?.receipt_footer) {
        doc.setFontSize(7); doc.setTextColor(150, 150, 150);
        doc.text(branding.receipt_footer, 105, 285, { align: 'center' });
    }

    doc.save(`Quotation_${values.estimateUid}.pdf`);
  };

  const onSubmit: SubmitHandler<EstimateForm> = async (values) => {
    setIsSubmitting(true);
    try {
      const { data: est, error } = await supabase.from('estimates').insert({
        tenant_id: tenantId, business_id: tenantId, customer_id: values.customerId,
        estimate_uid: values.estimateUid, title: values.title, total_amount: totals.grandTotal,
        valid_until: values.validUntil, status: 'PENDING', currency_code: values.currencyCode,
        metadata: { ...values, totals }
      }).select('id').single();

      if (error) throw error;
      
      await generatePDF(values); // Download
      toast.success("Identity Dispatched Successfully.");
      router.push(`/${locale}/invoicing/estimates/history`); // Redirect
    } catch (e: any) { toast.error(e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-6 space-y-10 animate-in fade-in duration-700 pb-40">
        
        {/* HEADER SECTION */}
        <Card className="border-none shadow-none bg-slate-50/50 rounded-[2rem] p-10 flex justify-between items-center">
            <div className="flex items-center gap-8">
                <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-2xl"><PenTool size={32}/></div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight">Drafting Terminal</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <Badge className="bg-emerald-600 text-white font-bold text-[9px] uppercase tracking-widest px-3 py-1 border-none shadow-sm">Protocol Active</Badge>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.2em] flex items-center gap-2"><Globe size={14}/> {businessInfo?.business_name}</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-12 bg-white p-6 rounded-[2rem] shadow-inner border border-slate-100">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aggregate Margin</p>
                    <p className={`text-3xl font-black tracking-tighter ${totals.margin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{totals.margin.toFixed(1)}%</p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="space-y-1">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Currency Mode</Label>
                    <select {...register("currencyCode")} className="h-10 w-44 px-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500">
                        {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                    </select>
                </div>
            </div>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            
            {/* GRID 1: REGISTRY & IDENTITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] border-l-4 border-red-500 pl-4">Registry Details</h2>
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white grid grid-cols-1 sm:grid-cols-2 gap-8">
                        <div className="space-y-2 col-span-full"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Quotation Subject / Header</Label><Input {...register("title")} className="h-14 border-slate-200 bg-slate-50/50 font-black text-slate-900 rounded-2xl px-6 text-sm" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Reference</Label><Input {...register("estimateUid")} className="h-12 bg-white font-black text-blue-600 border-slate-200 rounded-xl px-6" readOnly /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valid Until</Label><Input type="date" {...register("validUntil")} className="h-12 border-slate-200 rounded-xl px-6" /></div>
                    </Card>
                </div>

                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] border-l-4 border-red-500 pl-4">Corporate Identity</h2>
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white grid grid-cols-2 gap-6">
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Authorized Official</Label><Input {...register("ceoName")} className="h-12 rounded-xl font-bold" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Designation</Label><Input {...register("ceoDesignation")} className="h-12 rounded-xl font-bold" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Tax ID (TIN)</Label><Input {...register("tinNumber")} className="h-12 rounded-xl font-mono" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Plot Number</Label><Input {...register("plotNumber")} className="h-12 rounded-xl" /></div>
                    </Card>
                </div>
            </div>

            {/* GRID 2: CLIENT & SETTLEMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] border-l-4 border-emerald-500 pl-4">Stakeholder Context (Bill To)</h2>
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Target Client Entity</Label>
                            <select {...register("customerId")} className="w-full h-14 border border-slate-200 bg-slate-50/50 font-black rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all">
                                <option value="">Select from registry...</option>
                                {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase">Client Email</Label><Input {...register("clientEmail")} placeholder="Email" className="h-12 rounded-xl"/></div>
                            <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase">Client Phone</Label><Input {...register("clientPhone")} placeholder="Phone" className="h-12 rounded-xl"/></div>
                            <div className="space-y-2 col-span-full"><Label className="text-[10px] font-bold text-slate-400 uppercase">Physical Address</Label><Input {...register("clientLocation")} placeholder="Plot/Street/District" className="h-12 rounded-xl"/></div>
                        </div>
                    </Card>
                </div>

                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] border-l-4 border-amber-500 pl-4">Settlement Protocols</h2>
                    <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white space-y-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase">Beneficiary Name</Label><Input {...register("chequesPayableTo")} className="h-12 border-slate-200 rounded-xl" /></div>
                            <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-400 uppercase">Merchant / MOMO ID</Label><Input {...register("momoDetails")} className="h-12 border-slate-200 rounded-xl" /></div>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase ml-1">Bank Settlement Details</Label>
                            <Textarea {...register("bankDetails")} className="min-h-[100px] border-slate-200 rounded-2xl p-6 text-xs font-bold leading-relaxed bg-slate-50/20" placeholder="Bank, Branch, Account Number" />
                        </div>
                    </Card>
                </div>
            </div>

            {/* TABLE: TECHNICAL SPECIFICATIONS */}
            <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] border-l-4 border-slate-900 pl-4">Technical Specifications Matrix</h2>
                <Card className="rounded-[3rem] border border-slate-100 shadow-2xl overflow-hidden bg-white">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader className="bg-slate-900 h-20">
                                <TableRow className="border-none hover:bg-slate-900">
                                    <TableHead className="w-16 text-center font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">#</TableHead>
                                    <TableHead className="min-w-[450px] font-black text-white/40 text-[10px] uppercase tracking-[0.2em] pl-10">Item Identity & Technical Scope</TableHead>
                                    <TableHead className="w-28 text-center font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">Qty</TableHead>
                                    <TableHead className="w-36 text-right font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">Cost ({activeCurrency.code})</TableHead>
                                    <TableHead className="w-36 text-right font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">Rate ({activeCurrency.code})</TableHead>
                                    <TableHead className="w-44 text-right pr-12 font-black text-white/40 text-[10px] uppercase tracking-[0.2em]">Total</TableHead>
                                    <TableHead className="w-16"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="hover:bg-slate-50/50 transition-all border-b last:border-none align-top">
                                        <TableCell className="text-center pt-10 text-xs font-black text-slate-300">{index + 1}</TableCell>
                                        <TableCell className="py-8 pl-10 space-y-4">
                                            <Input {...register(`items.${index}.description` as const)} className="h-12 border-slate-200 bg-white font-black text-slate-900 rounded-xl px-6 text-sm shadow-sm" placeholder="Material/Service name" />
                                            <Textarea {...register(`items.${index}.details` as const)} className="min-h-[100px] border-slate-100 bg-slate-50/50 text-slate-600 font-bold rounded-2xl px-6 py-4 text-[11px] resize-none" placeholder="Technical specifications..." />
                                        </TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="h-12 border-slate-200 rounded-xl text-center font-black text-xs" /></TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-12 border-slate-200 rounded-xl text-right font-black text-xs text-amber-600" /></TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-12 border-slate-200 rounded-xl text-right font-black text-xs text-blue-600 shadow-sm" /></TableCell>
                                        <TableCell className="pt-11 text-right pr-12 font-black text-slate-900 text-base tabular-nums">
                                            {activeCurrency.symbol}{(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="pt-8">
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-10 w-10 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"><Trash2 size={20}/></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <div className="p-8 bg-slate-50/50 border-t flex justify-between items-center">
                        <Button type="button" onClick={() => append({ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-14 px-10 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 gap-3"><Plus size={20} /> Add Tech Entry</Button>
                        <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]"><ShieldCheck size={18} className="text-emerald-500" /> Operational Record Verified</div>
                    </div>
                </Card>
            </div>

            {/* TOTALS & TERMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="grid gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 ml-2 text-slate-500"><Info size={18} /><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Statutory Terms & Conditions</h3></div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[220px] rounded-[2.5rem] border-slate-200 bg-white p-8 text-xs font-bold text-slate-600 leading-relaxed shadow-inner" placeholder="Validity, delivery, settlement terms..." />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 ml-2 text-slate-500"><FileDigit size={18} /><h3 className="text-[11px] font-black uppercase tracking-[0.3em]">Internal Audit Description</h3></div>
                        <Textarea {...register("internalDescription")} className="min-h-[160px] rounded-[2.5rem] border-slate-200 bg-slate-50/30 p-8 text-xs font-bold text-slate-600 shadow-inner" placeholder="Private internal project notes..." />
                    </div>
                </div>

                <div className="space-y-10">
                    <Card className="rounded-[3.5rem] border-none bg-slate-900 text-white shadow-2xl p-12 space-y-10 relative overflow-hidden border-b-[16px] border-blue-600">
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]"><span>Operational Sub Total</span><span className="text-white text-lg font-bold">{activeCurrency.symbol}{totals.subTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] pt-4 border-t border-white/5"><span>Aggregate Discounts ({activeCurrency.code})</span><Input type="number" step="0.01" {...register("discountAmount")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm" /></div>
                            <div className="flex justify-between items-center text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] pt-2"><span>Statutory Tax Liability (%)</span><Input type="number" step="0.1" {...register("taxRate")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm" /></div>
                            <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pt-2"><span>Manual Adjustment</span><Input type="number" step="0.01" {...register("adjustment")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm" /></div>
                        </div>

                        <div className="pt-10 border-t border-white/10 flex justify-between items-end relative z-10">
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Net Sum Due</p>
                                <h4 className="text-6xl font-black text-white tracking-tighter tabular-nums">{activeCurrency.symbol}{totals.grandTotal.toLocaleString()}</h4>
                            </div>
                            <Badge className="bg-blue-600 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest border-none mb-2">{activeCurrency.code} NET SUM</Badge>
                        </div>
                        
                        <Button disabled={isSubmitting} type="submit" className="w-full h-20 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-[0.4em] text-xs rounded-2xl shadow-2xl transition-all active:scale-95 flex gap-5">
                            {isSubmitting ? <Loader2 className="animate-spin h-6 w-6 text-blue-600" /> : <><Send size={24} className="text-blue-600" /> Dispatch Operational Protocol</>}
                        </Button>
                    </Card>

                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-emerald-50 border border-emerald-100 px-8 py-4 rounded-full flex items-center gap-3 shadow-lg"><Wifi size={16} className="text-emerald-500" /><span className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.3em]">Network Synchronized</span></div>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-20 pb-12 text-center opacity-30 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center justify-center gap-5"><FileDigit size={16} /> Registry Node: {tenantId.substring(0,18).toUpperCase()} • Master-v2.9.0</p>
        </footer>
      </div>
    </div>
  );
}