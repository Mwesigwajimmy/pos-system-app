"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, CheckCircle2, PenTool, 
  Send, User, FileDigit, Landmark, Globe, Mail, Phone, MapPin, 
  Receipt as ReceiptIcon, ShieldCheck, Info
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// --- UTILS: Money and Color ---
const Money = {
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

const hexToRgb = (hex: string = "#000000") => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return [r, g, b];
};

// --- VALIDATION SCHEMA ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client selection required"),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  clientAddress: z.string().optional(),
  estimateUid: z.string().min(1, "Reference ID required"),
  title: z.string().min(3, "Document title required"),
  issueDate: z.string().min(1),
  validUntil: z.string().min(1),
  currencyCode: z.string().min(3),
  chequesPayableTo: z.string().optional(),
  bankDetails: z.string().optional(),
  momoDetails: z.string().optional(),
  termsAndConditions: z.string().optional(),
  taxRate: z.coerce.number().default(0),
  discountAmount: z.coerce.number().default(0),
  adjustment: z.coerce.number().default(0),
  items: z.array(z.object({
    description: z.string().min(1, "Item name required"),
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
    businessInfo: any;
    branding: any; // Data from tenant_branding
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
        chequesPayableTo: businessInfo?.business_name,
        termsAndConditions: branding?.payment_instructions || '',
        items: [{ description: '', details: '', quantity: 1, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrency = watch("currencyCode");
  const taxRate = watch("taxRate");
  const discount = watch("discountAmount");
  const adjustment = watch("adjustment");

  const activeCurrencySymbol = currencies.find(c => c.code === currentCurrency)?.symbol || '';

  // Calculate Totals
  const totals = useMemo(() => {
    const subTotal = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const taxableBasis = subTotal - discount;
    const taxAmount = taxableBasis * (taxRate / 100);
    const grandTotal = taxableBasis + taxAmount + adjustment;
    return { subTotal, taxAmount, grandTotal };
  }, [watchedItems, taxRate, discount, adjustment]);

  // Generate sequence on mount
  useEffect(() => {
    async function getSeq() {
        const { data } = await supabase.from('estimates').select('estimate_uid').order('created_at', { ascending: false }).limit(1);
        const sequence = data?.length ? (parseInt(data[0].estimate_uid.split('-')[1]) + 1) : 1;
        setValue('estimateUid', `QT-${sequence.toString().padStart(4, '0')}-${Date.now().toString().slice(-3)}`);
    }
    getSeq();
  }, [setValue, supabase]);

  const generatePDF = async (values: EstimateForm) => {
    const doc = new jsPDF();
    const clientName = customers.find(c => String(c.id) === values.customerId)?.name || 'Client';
    const primaryRGB = hexToRgb(branding?.primary_color || '#2563eb');
    const textRGB = hexToRgb(branding?.document_text_color || '#1e293b');

    // 1. Watermark Logic
    if (branding?.logo_url) {
        try {
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: branding.watermark_opacity || 0.05 }));
            doc.addImage(branding.logo_url, 'PNG', 40, 80, 130, 130, undefined, 'FAST');
            doc.restoreGraphicsState();
        } catch (e) { console.error("Watermark Load Error"); }
    }

    // 2. White Clean Header
    if (branding?.logo_url) {
        doc.addImage(branding.logo_url, 'PNG', 15, 15, 30, 30);
    }
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setFontSize(22); doc.setFont("helvetica", "bold");
    doc.text((branding?.company_name_display || businessInfo?.business_name).toUpperCase(), 50, 25);
    
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`TIN: ${branding?.tin_number || 'N/A'}`, 50, 32);
    doc.text(`Email: ${branding?.official_email || 'N/A'}`, 50, 36);
    doc.text(`Contact: ${branding?.official_phone || 'N/A'}`, 50, 40);
    doc.text(`Address: ${branding?.plot_number || ''} ${branding?.po_box || ''}`, 50, 44);

    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(0.5); doc.line(15, 52, 195, 52);

    // 3. Document Info
    doc.setFontSize(20); doc.setFont("helvetica", "bold");
    doc.text(values.title.toUpperCase(), 15, 68);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Ref: ${values.estimateUid}`, 15, 76);
    doc.text(`Date: ${format(new Date(values.issueDate), 'dd MMMM yyyy')}`, 15, 81);
    doc.text(`Valid Until: ${format(new Date(values.validUntil), 'dd MMMM yyyy')}`, 15, 86);

    // 4. Client Details (Expansion)
    doc.setFillColor(248, 250, 252); doc.rect(15, 95, 180, 30, 'F');
    doc.setFont("helvetica", "bold"); doc.text("BILL TO:", 20, 102);
    doc.setFont("helvetica", "normal"); 
    doc.text(clientName, 20, 108);
    doc.text(`${values.clientEmail || ''} | ${values.clientPhone || ''}`, 20, 113);
    doc.text(`Address: ${values.clientAddress || 'N/A'}`, 20, 118);

    // 5. Line Items
    autoTable(doc, {
      startY: 132,
      head: [['#', 'Description & Specifications', 'Qty', 'Rate', 'Total']],
      body: values.items.map((it, i) => [
        i + 1,
        { content: `${it.description}\n${it.details || ''}`, styles: { cellPadding: 3, fontSize: 8 } },
        it.quantity,
        `${activeCurrencySymbol}${it.unitRate.toLocaleString()}`,
        `${activeCurrencySymbol}${(it.quantity * it.unitRate).toLocaleString()}`
      ]),
      headStyles: { fillColor: primaryRGB, textColor: [255, 255, 255], fontStyle: 'bold' },
      theme: 'grid', margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;

    // 6. Totals
    doc.setFontSize(10);
    doc.text("Sub-total:", 140, finalY);
    doc.text(`${activeCurrencySymbol}${totals.subTotal.toLocaleString()}`, 195, finalY, { align: 'right' });
    doc.text(`VAT/Tax (${values.taxRate}%):`, 140, finalY + 7);
    doc.text(`+${activeCurrencySymbol}${totals.taxAmount.toLocaleString()}`, 195, finalY + 7, { align: 'right' });

    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(130, finalY + 12, 70, 12, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold");
    doc.text("TOTAL DUE:", 135, finalY + 20);
    doc.text(`${activeCurrencySymbol}${totals.grandTotal.toLocaleString()}`, 195, finalY + 20, { align: 'right' });

    // 7. Settlement & Terms
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(9); doc.text("SETTLEMENT PROTOCOLS:", 15, finalY + 45);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Bank: ${values.bankDetails || 'N/A'}`, 15, finalY + 51);
    doc.text(`MOMO/Merchant: ${values.momoDetails || 'N/A'}`, 15, finalY + 56);
    doc.text(`Payable To: ${values.chequesPayableTo || 'N/A'}`, 15, finalY + 61);

    doc.setFont("helvetica", "bold"); doc.text("TERMS & CONDITIONS:", 15, finalY + 75);
    doc.setFont("helvetica", "normal"); 
    const terms = doc.splitTextToSize(values.termsAndConditions || 'Terms apply.', 175);
    doc.text(terms, 15, finalY + 80);

    // 8. Dynamic Footer
    if (branding?.receipt_footer) {
        doc.setFontSize(7); doc.setTextColor(150, 150, 150);
        doc.text(branding.receipt_footer, 105, 285, { align: 'center' });
    }

    doc.save(`${values.title.replace(/\s+/g, '_')}.pdf`);
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
      await generatePDF(values);
      toast.success("Quotation Saved and Downloaded.");
      router.push(`/${locale}/invoicing/estimates/history`);
    } catch (e: any) { toast.error(e.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-white pb-32">
      <div className="max-w-[1400px] mx-auto py-8 px-6 space-y-8 animate-in fade-in duration-700">
        
        {/* TERMINAL HEADER */}
        <Card className="border-none shadow-none bg-slate-50/50 p-8 rounded-3xl flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-xl"><PenTool size={28}/></div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">Quotation Drafting Terminal</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge className="bg-blue-600 text-white font-bold text-[9px] uppercase tracking-widest border-none">Enterprise Ready</Badge>
                        <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2"><Globe size={14}/> {businessInfo?.business_name}</span>
                    </div>
                </div>
            </div>
            <div className="text-right">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Currency Environment</Label>
                <select {...register("currencyCode")} className="h-11 w-48 px-4 bg-white border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 shadow-sm">
                    {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
            </div>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            {/* GRID 1: REGISTRY & CLIENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3"><FileDigit size={18} className="text-blue-600"/> Registry ID Parameters</h2>
                    <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-white grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5 col-span-full"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Quotation Subject / Header</Label><Input {...register("title")} className="h-11 border-slate-200 bg-slate-50/50 font-bold text-slate-900 rounded-xl px-4" /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Internal Reference</Label><Input {...register("estimateUid")} className="h-11 bg-white font-black text-blue-600 border-slate-200 rounded-xl" readOnly /></div>
                        <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valid Until</Label><Input type="date" {...register("validUntil")} className="h-11 border-slate-200 rounded-xl" /></div>
                    </Card>
                </div>

                <div className="space-y-5">
                    <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3"><User size={18} className="text-blue-600"/> Client Context (Bill To)</h2>
                    <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-white space-y-5">
                        <div className="space-y-1.5">
                            <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Select Registered Customer</Label>
                            <select {...register("customerId")} className="w-full h-11 border border-slate-200 bg-slate-50/50 font-bold rounded-xl px-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="">Select from database...</option>
                                {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Client Email</Label><Input {...register("clientEmail")} placeholder="Email" className="h-10 rounded-xl"/></div>
                            <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Client Phone</Label><Input {...register("clientPhone")} placeholder="Phone" className="h-10 rounded-xl"/></div>
                            <div className="space-y-1.5 col-span-full"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Physical Address / Location</Label><Input {...register("clientAddress")} placeholder="Street, City, Country" className="h-10 rounded-xl"/></div>
                        </div>
                    </Card>
                </div>
            </div>

            {/* SETTLEMENT CARD */}
            <div className="space-y-5">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3"><Landmark size={18} className="text-blue-600"/> Settlement & Payment Protocols</h2>
                <Card className="rounded-2xl border-slate-100 shadow-sm p-8 bg-white grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Bank Account</Label><Input {...register("bankDetails")} placeholder="Bank, Branch, Acc #" className="h-11 rounded-xl"/></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Mobile Money / Merchant ID</Label><Input {...register("momoDetails")} placeholder="Code / ID" className="h-11 rounded-xl"/></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Beneficiary Name</Label><Input {...register("chequesPayableTo")} className="h-11 rounded-xl"/></div>
                </Card>
            </div>

            {/* LINE ITEMS */}
            <div className="space-y-5">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-3"><ReceiptIcon size={18} className="text-blue-600"/> Operational Technical Line Items</h2>
                <Card className="rounded-2xl border border-slate-100 shadow-md overflow-hidden bg-white">
                    <Table>
                        <TableHeader className="bg-slate-900 hover:bg-slate-900">
                            <TableRow className="h-14 border-none">
                                <TableHead className="w-12 text-center text-[10px] font-black text-white/40 uppercase">#</TableHead>
                                <TableHead className="min-w-[400px] text-[10px] font-black text-white/40 uppercase pl-8">Item Identity & Tech Specifications</TableHead>
                                <TableHead className="w-24 text-center text-[10px] font-black text-white/40 uppercase">Qty</TableHead>
                                <TableHead className="w-32 text-right text-[10px] font-black text-white/40 uppercase">Unit Rate ({currentCurrency})</TableHead>
                                <TableHead className="w-40 text-right pr-10 text-[10px] font-black text-white/40 uppercase">Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="border-b last:border-none hover:bg-slate-50/50">
                                    <TableCell className="text-center font-bold text-slate-300 pt-8 align-top">{index + 1}</TableCell>
                                    <TableCell className="py-6 pl-8 space-y-3">
                                        <Input {...register(`items.${index}.description` as const)} placeholder="Item Name" className="h-10 border-slate-200 font-bold rounded-xl text-xs" />
                                        <Textarea {...register(`items.${index}.details` as const)} placeholder="Technical scope / description..." className="min-h-[70px] rounded-xl text-[11px] border-slate-100 bg-slate-50/30" />
                                    </TableCell>
                                    <TableCell className="pt-6 align-top"><Input type="number" {...register(`items.${index}.quantity` as const)} className="h-10 text-center font-bold rounded-xl" /></TableCell>
                                    <TableCell className="pt-6 align-top"><Input type="number" {...register(`items.${index}.unitRate` as const)} className="h-10 text-right font-bold text-blue-600 rounded-xl" /></TableCell>
                                    <TableCell className="pt-8 text-right pr-10 font-black text-slate-900 text-sm">
                                        {activeCurrencySymbol}{(watchedItems[index]?.unitRate * watchedItems[index]?.quantity || 0).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="pt-6 align-top"><Button variant="ghost" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-6 bg-slate-50/50 border-t"><Button type="button" onClick={() => append({ description: '', details: '', quantity: 1, unitRate: 0 })} className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 px-8 rounded-xl shadow-lg gap-3"><Plus size={18}/> Add New Entry</Button></div>
                </Card>
            </div>

            {/* TOTALS BAR */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <Card className="rounded-3xl p-8 border-slate-100 bg-slate-50/50 space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex items-center gap-2"><Info size={14}/> General Terms & Statutory Notes</Label><Textarea {...register("termsAndConditions")} className="min-h-[180px] rounded-2xl text-xs font-medium text-slate-600 border-slate-200" placeholder="Specify project delivery times, payment terms, or validity..." /></div>
                </Card>

                <Card className="rounded-[2.5rem] bg-slate-900 text-white p-10 shadow-2xl space-y-8 border-b-[12px] border-blue-600">
                    <div className="space-y-4">
                        <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest"><span>Operational Sub Total</span><span>{activeCurrencySymbol}{totals.subTotal.toLocaleString()}</span></div>
                        <div className="flex justify-between items-center text-xs font-bold text-rose-400 uppercase tracking-widest border-t border-white/5 pt-4"><span>Discount ({currentCurrency})</span><Input type="number" {...register("discountAmount")} className="w-32 h-10 bg-white/10 border-none text-right font-black text-white" /></div>
                        <div className="flex justify-between items-center text-xs font-bold text-blue-400 uppercase tracking-widest"><span>Statutory VAT / Tax (%)</span><Input type="number" {...register("taxRate")} className="w-32 h-10 bg-white/10 border-none text-right font-black text-white" /></div>
                    </div>
                    <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                        <div className="space-y-1"><p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Valuation Due</p><h4 className="text-5xl font-black tabular-nums tracking-tighter">{activeCurrencySymbol}{totals.grandTotal.toLocaleString()}</h4></div>
                        <Badge className="bg-blue-600 px-4 py-1 font-black text-[10px] uppercase tracking-widest">{currentCurrency}</Badge>
                    </div>
                    <Button disabled={isSubmitting} type="submit" className="w-full h-16 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-widest text-xs rounded-2xl gap-4 shadow-xl transition-all active:scale-95">
                        {isSubmitting ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={22} className="text-blue-600" /> Finalize & Dispatch Protocol</>}
                    </Button>
                </Card>
            </div>
        </form>
      </div>
    </div>
  );
}