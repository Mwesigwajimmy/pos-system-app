"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Printer, Building2, Landmark, PenTool, 
  Calendar, Send, User, FileDigit, Info, Wifi, Smartphone,
  TrendingUp, ShieldCheck, Clock, MapPin, Mail, Hash, Globe
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter, useParams } from 'next/navigation';
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

// --- FULL ENTERPRISE SCHEMA ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client selection required"),
  // New Client Fields
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
  const params = useParams(); 
  const locale = params.locale || 'en';

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EstimateForm>({
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
        bankDetails: branding?.payment_instructions || '',
        ceoName: branding?.ceo_name || '',
        ceoDesignation: branding?.ceo_role || 'Managing Director',
        inquiryContact: branding?.official_phone || businessInfo?.phone,
        taxRate: 0,
        discountAmount: 0,
        adjustment: 0,
        items: [{ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrencyCode = watch("currencyCode");
  const taxRate = watch("taxRate");
  const discount = watch("discountAmount");
  const adjustment = watch("adjustment");

  const activeCurrency = useMemo(() => {
    return currencies.find(c => c.code === currentCurrencyCode) || { code: 'UGX', symbol: 'Shs' };
  }, [currentCurrencyCode, currencies]);

  // SEQUENCE GENERATOR
  useEffect(() => {
    async function fetchNextSequence() {
        const { data } = await supabase
            .from('estimates')
            .select('estimate_uid')
            .order('created_at', { ascending: false })
            .limit(1);
        const sequence = data?.length ? (parseInt(data[0].estimate_uid.split('-')[1]) + 1) : 1;
        setValue('estimateUid', `QT-${sequence.toString().padStart(4, '0')}-${Date.now().toString().slice(-4)}`);
    }
    fetchNextSequence();
  }, [setValue, supabase]);

  // TOTALS LOGIC
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
   * --- 🛡️ SOVEREIGN PDF ENGINE (HEALED & PROFESSIONAL) ---
   */
  const generateSovereignPDF = async (values: EstimateForm) => {
    const doc = new jsPDF();
    const clientName = customers.find(c => String(c.id) === values.customerId)?.name || 'Valued Client';
    
    // Color Setup from Branding
    const primaryRGB = hexToRgb(branding?.primary_color || '#0F172A');
    const accentRGB = hexToRgb(branding?.accent_color || '#2563eb');
    const textRGB = hexToRgb(branding?.document_text_color || '#1E293B');

    // 1. WATERMARK (Dynamic Opacity)
    if (branding?.logo_url) {
        try {
            const opacity = branding.watermark_opacity || 0.05;
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: opacity }));
            doc.addImage(branding.logo_url, 'PNG', 45, 90, 120, 120, undefined, 'FAST');
            doc.restoreGraphicsState();
        } catch (e) { console.error("PDF Watermark load failed", e); }
    }

    // 2. CORPORATE HEADER (Clean White Professional)
    if (branding?.logo_url) {
        doc.addImage(branding.logo_url, 'PNG', 15, 15, 35, 35);
    }
    
    doc.setTextColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text((branding?.company_name_display || businessInfo?.business_name).toUpperCase(), 55, 25);
    
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text(`TIN: ${values.tinNumber || 'N/A'}`, 55, 32);
    doc.text(`EMAIL: ${values.officialEmail || 'N/A'}`, 55, 36);
    doc.text(`PHONE: ${values.inquiryContact || 'N/A'}`, 55, 40);
    doc.text(`ADDRESS: ${values.plotNumber}, ${values.pobox}`, 55, 44);

    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 55, 195, 55);

    // 3. DOCUMENT IDENTITY
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.text(values.title.toUpperCase(), 15, 75);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`REF NO: ${values.estimateUid}`, 15, 83);
    doc.text(`DATE: ${format(new Date(values.issueDate), 'dd MMMM yyyy')}`, 15, 88);
    doc.text(`VALID UNTIL: ${format(new Date(values.validUntil), 'dd MMMM yyyy')}`, 15, 93);

    // 4. CLIENT SECTION (New Fields Applied)
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 103, 180, 35, 'F');
    
    doc.setFont("helvetica", "bold");
    doc.text("BILL TO / CLIENT:", 20, 111);
    doc.setFont("helvetica", "normal");
    doc.text(clientName, 20, 117);
    doc.text(`${values.clientEmail || ''} | ${values.clientPhone || ''}`, 20, 122);
    doc.text(`Location: ${values.clientLocation || 'Not Specified'}`, 20, 127);

    doc.setFont("helvetica", "bold");
    doc.text("CURRENCY:", 130, 111);
    doc.setFont("helvetica", "normal");
    doc.text(`${activeCurrency.code} (${activeCurrency.symbol})`, 130, 117);

    // 5. TECHNICAL TABLE
    autoTable(doc, {
      startY: 145,
      head: [['#', 'Description & Technical Specifications', 'Qty', 'Unit Rate', 'Total']],
      body: values.items.map((item, index) => [
        index + 1,
        { content: `${item.description}\n${item.details || ''}`, styles: { fontSize: 8, cellPadding: 4 } },
        item.quantity,
        `${activeCurrency.symbol}${item.unitRate.toLocaleString()}`,
        `${activeCurrency.symbol}${(item.quantity * item.unitRate).toLocaleString()}`
      ]),
      headStyles: { fillColor: primaryRGB, textColor: [255, 255, 255], fontStyle: 'bold' },
      theme: 'grid',
      margin: { left: 15, right: 15 }
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 230) { doc.addPage(); finalY = 20; }

    // 6. TOTALS BLOCK
    doc.setFontSize(10);
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.text("Sub-total:", 140, finalY);
    doc.text(`${activeCurrency.symbol}${totals.subTotal.toLocaleString()}`, 195, finalY, { align: 'right' });
    
    doc.text(`Discount:`, 140, finalY + 7);
    doc.text(`-${activeCurrency.symbol}${discount.toLocaleString()}`, 195, finalY + 7, { align: 'right' });
    
    doc.text(`Tax (${values.taxRate}%):`, 140, finalY + 14);
    doc.text(`+${activeCurrency.symbol}${totals.taxAmount.toLocaleString()}`, 195, finalY + 14, { align: 'right' });

    doc.setFillColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.rect(130, finalY + 19, 70, 14, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12); doc.setFont("helvetica", "bold");
    doc.text(`TOTAL DUE:`, 135, finalY + 28);
    doc.text(`${activeCurrency.symbol}${totals.grandTotal.toLocaleString()}`, 195, finalY + 28, { align: 'right' });

    // 7. SETTLEMENT & FOOTER
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(10); doc.text("SETTLEMENT PROTOCOLS:", 15, finalY + 50);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const bankSplit = doc.splitTextToSize(`Instructions: ${values.bankDetails || 'N/A'}`, 100);
    doc.text(bankSplit, 15, finalY + 56);
    doc.text(`Mobile Payment: ${values.momoDetails || 'N/A'}`, 15, finalY + 68);
    doc.text(`Payable To: ${values.chequesPayableTo || 'N/A'}`, 15, finalY + 73);

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS:", 15, finalY + 85);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const termsSplit = doc.splitTextToSize(values.termsAndConditions || 'Standard commercial terms apply.', 180);
    doc.text(termsSplit, 15, finalY + 91);

    // 8. FINAL AUTHORIZATION & DYNAMIC FOOTER
    const footerY = 275;
    doc.setDrawColor(200, 200, 200); doc.line(15, footerY, 70, footerY);
    doc.setFontSize(9); doc.setFont("helvetica", "bold");
    doc.text(values.ceoName || 'Authorized Signatory', 15, footerY + 5);
    doc.setFont("helvetica", "normal");
    doc.text(values.ceoDesignation || 'Management', 15, footerY + 10);

    if (branding?.receipt_footer) {
        doc.setFontSize(7); doc.setTextColor(150, 150, 150);
        doc.text(branding.receipt_footer, 105, 290, { align: 'center' });
    }

    doc.save(`${values.title.replace(/\s+/g, '_')}_${values.estimateUid}.pdf`);
  };

  const onSubmit: SubmitHandler<EstimateForm> = async (values) => {
    setIsSubmitting(true);
    try {
      const { data: estData, error: estErr } = await supabase.from('estimates').insert({
        tenant_id: tenantId,
        business_id: tenantId,
        customer_id: values.customerId,
        estimate_uid: values.estimateUid,
        title: values.title,
        status: 'PENDING', 
        currency_code: values.currencyCode,
        total_amount: totals.grandTotal,
        valid_until: values.validUntil,
        client_name: customers.find(c => String(c.id) === values.customerId)?.name,
        metadata: { ...values, totals_snapshot: totals } 
      }).select('id').single();

      if (estErr) throw estErr;

      const { error: lineErr } = await supabase.from('estimate_line_items').insert(
        values.items.map(item => ({
          estimate_id: estData.id,
          tenant_id: tenantId,
          business_id: tenantId,
          description: item.description,
          quantity: item.quantity,
          unit_cost: item.unitCost,
          unit_price: item.unitRate, 
          total: Money.multiply(item.unitRate, item.quantity)
        }))
      );

      if (lineErr) throw lineErr;
      
      await generateSovereignPDF(values);
      toast.success("Identity Dispatched & Synchronized");
      router.push(`/${locale}/invoicing/estimates/history`); 

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500 pb-40">
        
        {/* --- SOVEREIGN TERMINAL HEADER --- */}
        <Card className="border border-slate-100 shadow-xl rounded-[2rem] overflow-hidden bg-slate-50/40">
          <CardContent className="p-8 md:p-12 flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="flex items-center gap-8">
              <div className="p-5 bg-slate-900 rounded-3xl text-white shadow-2xl">
                <PenTool size={32} />
              </div>
              <div className="space-y-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Drafting Terminal</h1>
                <div className="flex items-center gap-4">
                  <Badge className="bg-emerald-600 text-white font-black uppercase text-[10px] tracking-widest px-4 py-1 border-none shadow-lg">Protocol Active</Badge>
                  <span className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-2"><Globe size={14}/> {businessInfo?.name}</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-12 bg-white p-6 rounded-[2rem] shadow-inner border border-slate-100">
              <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">AGGREGATE MARGIN</p>
                <p className={`text-3xl font-black tracking-tighter ${totals.margin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {totals.margin.toFixed(1)}%
                </p>
              </div>
              <div className="h-12 w-px bg-slate-200" />
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">CURRENCY CONFIG</Label>
                <select {...register("currencyCode")} className="h-12 w-48 px-4 bg-slate-50 border border-slate-200 rounded-xl font-black text-xs outline-none focus:ring-2 focus:ring-blue-600 transition-all">
                  {currencies.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            
            {/* 1. REGISTRY & CORPORATE IDENTITY */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-l-4 border-red-600 pl-4">Registry Details</h2>
                  <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div className="space-y-2 col-span-full">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Quotation Subject / Header</Label>
                      <Input {...register("title")} className="h-14 border-slate-200 bg-slate-50/50 font-black text-slate-900 rounded-2xl px-6 text-sm" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Document Ref</Label>
                      <Input {...register("estimateUid")} className="h-12 border-slate-200 bg-white font-black text-blue-600 rounded-xl px-6" readOnly />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Valid Until</Label>
                      <Input type="date" {...register("validUntil")} className="h-12 border-slate-200 bg-white font-bold rounded-xl px-6" />
                    </div>
                  </Card>
                </div>

                <div className="space-y-6">
                  <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-l-4 border-blue-600 pl-4">Corporate Identity</h2>
                  <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Authorized Official</Label>
                      <Input {...register("ceoName")} className="h-12 border-slate-200 bg-white rounded-xl px-6 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Official Designation</Label>
                      <Input {...register("ceoDesignation")} className="h-12 border-slate-200 bg-white rounded-xl px-6 font-bold" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tax ID (TIN)</Label>
                      <Input {...register("tinNumber")} className="h-12 border-slate-200 bg-white rounded-xl px-6 font-mono" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Physical Plot No.</Label>
                      <Input {...register("plotNumber")} className="h-12 border-slate-200 bg-white rounded-xl px-6" />
                    </div>
                  </Card>
                </div>
            </div>

            {/* 2. CUSTOMER & SETTLEMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-l-4 border-emerald-600 pl-4">Stakeholder Context</h2>
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white space-y-6">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target Client Entity</Label>
                    <select {...register("customerId")} className="w-full h-14 border border-slate-200 bg-slate-50/50 font-black rounded-2xl px-6 text-sm outline-none focus:ring-2 focus:ring-blue-600">
                      <option value="">Syncing Client Registry...</option>
                      {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Email</Label><Input {...register("clientEmail")} placeholder="Email Address" className="h-12 rounded-xl" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Phone</Label><Input {...register("clientPhone")} placeholder="Contact Number" className="h-12 rounded-xl" /></div>
                      <div className="space-y-2 col-span-full"><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Client Physical Address / Location</Label><Input {...register("clientLocation")} placeholder="Plot/Street/District" className="h-12 rounded-xl" /></div>
                  </div>
                </Card>
              </div>

              <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-l-4 border-amber-600 pl-4">Settlement Protocols</h2>
                <Card className="rounded-[2.5rem] border-slate-100 shadow-sm p-10 bg-white space-y-6">
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Beneficiary Name</Label><Input {...register("chequesPayableTo")} className="h-12 border-slate-200 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Merchant / MOMO ID</Label><Input {...register("momoDetails")} className="h-12 border-slate-200 rounded-xl" /></div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase ml-1">Bank Settlement Details</Label>
                    <Textarea {...register("bankDetails")} className="min-h-[100px] border-slate-200 rounded-2xl p-6 text-xs font-bold leading-relaxed bg-slate-50/20" placeholder="Bank Name, Branch, Account Number" />
                  </div>
                </Card>
              </div>
            </div>

            {/* 3. TECHNICAL SPECIFICATIONS TABLE */}
            <div className="space-y-6">
                <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.4em] border-l-4 border-slate-900 pl-4">Technical Specifications Matrix</h2>
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
                                    <TableRow key={field.id} className="hover:bg-slate-50 transition-all border-b last:border-none align-top group">
                                        <TableCell className="text-center pt-10 text-xs font-black text-slate-300">{index + 1}</TableCell>
                                        <TableCell className="py-8 pl-10 space-y-4">
                                            <Input {...register(`items.${index}.description` as const)} className="h-12 border-slate-200 bg-white font-black text-slate-900 rounded-xl px-6 text-sm shadow-sm" placeholder="Item/Service Identity" />
                                            <Textarea {...register(`items.${index}.details` as const)} className="min-h-[100px] border-slate-100 bg-slate-50/50 text-slate-600 font-bold rounded-2xl px-6 py-4 text-[11px] resize-none" placeholder="Provide technical specifications and scope of work..." />
                                        </TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="h-12 border-slate-200 rounded-xl text-center font-black text-xs" /></TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-12 border-slate-200 rounded-xl text-right font-black text-xs text-amber-600" /></TableCell>
                                        <TableCell className="pt-8"><Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-12 border-slate-200 rounded-xl text-right font-black text-xs text-blue-600 shadow-sm" /></TableCell>
                                        <TableCell className="pt-11 text-right pr-12 font-black text-slate-900 text-base tabular-nums">
                                            {activeCurrency.symbol}{(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="pt-8">
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-10 w-10 text-slate-200 hover:text-red-600 hover:bg-red-50 rounded-full transition-all">
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
                        <Button type="button" onClick={() => append({ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-14 px-10 rounded-2xl bg-blue-600 text-white font-black text-[11px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-600/20 gap-3">
                            <Plus size={20} /> Add Tech Entry
                        </Button>
                        <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                            <ShieldCheck size={18} className="text-emerald-500" /> Operational Record Verified
                        </div>
                    </div>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start">
                <div className="grid gap-10">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 ml-2">
                            <Info size={18} className="text-blue-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Statutory Terms & Conditions</h3>
                        </div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[200px] rounded-[2.5rem] border-slate-200 bg-white p-8 text-xs font-bold text-slate-600 leading-relaxed shadow-inner" placeholder="Specify settlement terms, delivery window, validity, etc..." />
                    </div>
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 ml-2">
                            <FileDigit size={18} className="text-blue-600" />
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-500">Internal Audit Description</h3>
                        </div>
                        <Textarea {...register("internalDescription")} className="min-h-[160px] rounded-[2.5rem] border-slate-200 bg-slate-50/30 p-8 text-xs font-bold text-slate-600 shadow-inner" placeholder="Private internal project notes, cost centers, logic..." />
                    </div>
                </div>

                <div className="space-y-10">
                    <Card className="rounded-[3.5rem] border-none bg-slate-900 text-white shadow-2xl p-12 space-y-10 relative overflow-hidden border-b-[16px] border-blue-600">
                        <div className="space-y-6 relative z-10">
                            <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">
                                <span>Operational Sub Total</span>
                                <span className="text-white text-lg font-bold">{activeCurrency.symbol}{totals.subTotal.toLocaleString()}</span>
                            </div>
                            
                            <div className="flex justify-between items-center text-[11px] font-black text-rose-500 uppercase tracking-[0.2em] pt-4 border-t border-white/5">
                                <span>Aggregate Discounts</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-slate-600">{activeCurrency.code}</span>
                                  <Input type="number" step="0.01" {...register("discountAmount")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm focus:bg-white/10 transition-all" />
                                </div>
                            </div>

                            <div className="flex justify-between items-center text-[11px] font-black text-blue-500 uppercase tracking-[0.2em] pt-2">
                                <span>Statutory Tax Liability (%)</span>
                                <Input type="number" step="0.1" {...register("taxRate")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm" />
                            </div>

                            <div className="flex justify-between items-center text-[11px] font-black text-slate-500 uppercase tracking-[0.2em] pt-2">
                                <span>Manual Adjustment</span>
                                <div className="flex items-center gap-4">
                                  <span className="text-slate-600">{activeCurrency.code}</span>
                                  <Input type="number" step="0.01" {...register("adjustment")} className="w-36 h-12 border-none bg-white/5 rounded-xl text-right font-black text-white text-sm" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-10 border-t border-white/10 flex justify-between items-end relative z-10">
                            <div className="space-y-2">
                                <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em]">Total Net Sum Due</p>
                                <h4 className="text-6xl font-black text-white tracking-tighter tabular-nums">
                                    {activeCurrency.symbol}{totals.grandTotal.toLocaleString()}
                                </h4>
                            </div>
                            <Badge className="bg-blue-600 text-white font-black px-6 py-2 rounded-xl text-[10px] uppercase tracking-widest border-none mb-2">
                                {activeCurrency.code} NET SUM
                            </Badge>
                        </div>
                        
                        <Button 
                            disabled={isSubmitting} 
                            type="submit" 
                            className="w-full h-20 bg-white hover:bg-slate-100 text-slate-900 font-black uppercase tracking-[0.4em] text-xs rounded-2xl shadow-2xl transition-all active:scale-95 flex gap-5"
                        >
                            {isSubmitting ? (
                              <Loader2 className="animate-spin h-6 w-6 text-blue-600" />
                            ) : (
                              <>
                                <Send size={24} className="text-blue-600" /> 
                                Dispatch Operational Protocol
                              </>
                            )}
                        </Button>
                    </Card>

                    <div className="flex flex-col items-center gap-6">
                        <div className="bg-emerald-50 border border-emerald-100 px-8 py-4 rounded-full flex items-center gap-3 shadow-lg">
                            <Wifi size={16} className="text-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-800 uppercase tracking-[0.3em]">Network Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-20 pb-12 text-center opacity-30 border-t border-slate-100">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] flex items-center justify-center gap-5">
                <FileDigit size={16} /> Registry Node: {tenantId.substring(0,18).toUpperCase()} • Master-v2.8.5
            </p>
        </footer>
      </div>
    </div>
  );
}