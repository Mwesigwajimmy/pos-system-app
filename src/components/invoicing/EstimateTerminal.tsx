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

// --- UTILITIES ---
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

// --- 🛡️ FULL ENTERPRISE IDENTITY SCHEMA ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client selection required"),
  // VITAL ADDITIONS FOR BILL TO
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
  clientLocation: z.string().optional(),

  estimateUid: z.string().min(1, "Reference ID required"),
  title: z.string().min(3, "Document subject required"),
  issueDate: z.string().min(1),
  validUntil: z.string().min(1),
  currencyCode: z.string().min(3),
  
  // CORPORATE IDENTITY
  plotNumber: z.string().optional(),
  pobox: z.string().optional(),
  tinNumber: z.string().optional(),
  officialEmail: z.string().optional(),
  ceoName: z.string().optional(),
  ceoDesignation: z.string().optional(),
  
  // SETTLEMENT
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
        title: branding?.document_header || 'Commercial Quotation and Service Estimate', 
        currencyCode: businessInfo?.currency || 'UGX',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        officialEmail: branding?.official_email || businessInfo?.email,
        tinNumber: branding?.tin_number || businessInfo?.tin_number,
        plotNumber: branding?.plot_number || 'N/A',
        pobox: branding?.po_box || 'N/A',
        chequesPayableTo: branding?.company_name_display || businessInfo?.business_name,
        bankDetails: branding?.payment_instructions || 'Bank: \nBranch: \nAcc: ',
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
   * --- 🛡️ PROFESSIONAL CLEAN PDF ENGINE ---
   */
  const generateSovereignPDF = async (values: EstimateForm) => {
    const doc = new jsPDF();
    const clientName = customers.find(c => String(c.id) === values.customerId)?.name || 'Valued Client';
    
    // Branding Logic
    const primaryRGB = hexToRgb(branding?.primary_color || '#0F172A');
    const textRGB = hexToRgb(branding?.document_text_color || '#1E293B');

    // 1. WATERMARK ENGINE
    if (branding?.logo_url) {
        try {
            const opacity = branding.watermark_opacity || 0.05;
            doc.saveGraphicsState();
            doc.setGState(new (doc as any).GState({ opacity: opacity }));
            doc.addImage(branding.logo_url, 'PNG', 45, 90, 120, 120, undefined, 'FAST');
            doc.restoreGraphicsState();
        } catch (e) { console.error("Watermark failed to load"); }
    }

    // 2. CORPORATE HEADER (Clean White)
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
    doc.text(`ADDRESS: ${values.plotNumber || 'N/A'}, ${values.pobox || 'N/A'}`, 55, 44);

    doc.setDrawColor(primaryRGB[0], primaryRGB[1], primaryRGB[2]);
    doc.setLineWidth(0.5);
    doc.line(15, 55, 195, 55);

    // 3. DOCUMENT SUBJECT
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text(values.title.toUpperCase(), 15, 75);
    
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`REF NO: ${values.estimateUid}`, 15, 83);
    doc.text(`DATE: ${format(new Date(values.issueDate), 'dd MMMM yyyy')}`, 15, 88);
    doc.text(`VALID UNTIL: ${format(new Date(values.validUntil), 'dd MMMM yyyy')}`, 15, 93);

    // 4. CLIENT / STAKEHOLDER SECTION
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

    // 5. TECHNICAL SPECIFICATIONS TABLE
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

    // 6. TOTALS SECTION
    let finalY = (doc as any).lastAutoTable.finalY + 10;
    if (finalY > 230) { doc.addPage(); finalY = 20; }

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

    // 7. SETTLEMENT PROTOCOLS
    doc.setTextColor(textRGB[0], textRGB[1], textRGB[2]);
    doc.setFontSize(10); doc.text("SETTLEMENT PROTOCOLS:", 15, finalY + 50);
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    const bankSplit = doc.splitTextToSize(`Instructions: ${values.bankDetails || 'N/A'}`, 100);
    doc.text(bankSplit, 15, finalY + 56);
    doc.text(`Merchant/Digital: ${values.momoDetails || 'N/A'}`, 15, finalY + 68);
    doc.text(`Beneficiary: ${values.chequesPayableTo || 'N/A'}`, 15, finalY + 73);

    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("TERMS & CONDITIONS:", 15, finalY + 85);
    doc.setFont("helvetica", "normal"); doc.setFontSize(8);
    const termsSplit = doc.splitTextToSize(values.termsAndConditions || 'Standard commercial terms apply.', 180);
    doc.text(termsSplit, 15, finalY + 91);

    // 8. AUTHORIZATION & FOOTER
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
      
      await generateSovereignPDF(values); // PDF DOWNLOAD
      toast.success("Operational Protocol Synchronized");
      router.push(`/${locale}/invoicing/estimates/history`); // REDIRECT

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500 pb-40">
        
        {/* --- DYNAMIC SOVEREIGN HEADER --- */}
        <Card className="border border-slate-100 shadow-sm rounded-xl overflow-hidden bg-slate-50/30">
          <CardContent className="p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
              <div className="p-3 bg-slate-900 rounded-lg text-white shadow-md">
                <PenTool size={24} />
              </div>
              <div className="space-y-0.5">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">Estimate Drafting Terminal</h1>
                <div className="flex items-center gap-3">
                  <Badge className="bg-emerald-600 text-white font-bold uppercase text-[8px] tracking-wider px-2 py-0.5 border-none">Protocol Active</Badge>
                  <span className="text-slate-400 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1.5"><Clock size={12}/> Handshake Verified</span>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Margin</p>
                <p className={`text-2xl font-bold tracking-tight ${totals.margin >= 20 ? 'text-emerald-600' : 'text-amber-600'}`}>{totals.margin.toFixed(1)}%</p>
              </div>
              <div className="h-10 w-px bg-slate-200" />
              <div className="space-y-1">
                <Label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Currency Configuration</Label>
                <select {...register("currencyCode")} className="h-10 w-44 px-3 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:ring-1 focus:ring-blue-500">
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
                  <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5 col-span-full"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Document Subject</Label><Input {...register("title")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Document Ref</Label><Input {...register("estimateUid")} className="h-10 border-slate-200 bg-white font-bold text-blue-600 rounded-lg px-4" readOnly /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Valid Until</Label><Input type="date" {...register("validUntil")} className="h-10 border-slate-200 bg-white font-medium rounded-lg px-4" /></div>
                  </Card>
                </div>

                <div className="space-y-4">
                  <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-red-500 pl-3">Corporate Identity</h2>
                  <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Authorized Official</Label><Input {...register("ceoName")} placeholder="CEO Name" className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Designation</Label><Input {...register("ceoDesignation")} className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tax ID (TIN)</Label><Input {...register("tinNumber")} placeholder="TIN" className="h-10 border-slate-200 bg-white rounded-lg px-4 font-mono" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Physical Plot No.</Label><Input {...register("plotNumber")} placeholder="Plot/Street" className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                    <div className="space-y-1.5 col-span-full"><Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Official Email</Label><Input {...register("officialEmail")} className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                  </Card>
                </div>
            </div>

            {/* 2. CUSTOMER & SETTLEMENT */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-emerald-500 pl-3">Stakeholder Context (Bill To)</h2>
                <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 space-y-5">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Target Client Entity</Label>
                    <select {...register("customerId")} className="w-full h-10 border border-slate-200 bg-white font-medium rounded-lg px-4 text-sm outline-none focus:ring-1 focus:ring-blue-500">
                      <option value="">Syncing Registry...</option>
                      {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Client Email</Label><Input {...register("clientEmail")} placeholder="email@client.com" className="h-10 rounded-lg" /></div>
                      <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Client Phone</Label><Input {...register("clientPhone")} placeholder="+256..." className="h-10 rounded-lg" /></div>
                      <div className="space-y-1.5 col-span-full"><Label className="text-[10px] font-bold text-slate-500 uppercase">Client Physical Location</Label><Input {...register("clientLocation")} placeholder="Plot/Street/District" className="h-10 rounded-lg" /></div>
                  </div>
                </Card>
              </div>

              <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-amber-500 pl-3">Settlement Protocols</h2>
                <Card className="rounded-xl border-slate-100 shadow-sm p-6 bg-slate-50/20 space-y-5">
                  <div className="grid grid-cols-2 gap-5">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Beneficiary Name</Label><Input {...register("chequesPayableTo")} className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-slate-500 uppercase">Digital MOMO ID</Label><Input {...register("momoDetails")} className="h-10 border-slate-200 bg-white rounded-lg px-4" /></div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Bank Settlement Details</Label>
                    <Textarea {...register("bankDetails")} className="min-h-[60px] border-slate-200 bg-white font-medium rounded-lg px-4 py-2 text-xs" />
                  </div>
                </Card>
              </div>
            </div>

            {/* 3. TECHNICAL SPECIFICATIONS TABLE */}
            <div className="space-y-4">
                <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-slate-900 pl-3">Technical Specifications</h2>
                <Card className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                    <ScrollArea className="w-full">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="h-12 border-none">
                                    <TableHead className="w-12 text-center text-[10px] font-bold text-slate-500 uppercase">#</TableHead>
                                    <TableHead className="min-w-[350px] font-bold text-slate-500 text-[10px] uppercase pl-6">Item Identity & Tech Specs</TableHead>
                                    <TableHead className="w-24 text-center font-bold text-slate-500 text-[10px] uppercase">Qty</TableHead>
                                    <TableHead className="w-32 text-right font-bold text-slate-500 text-[10px] uppercase">Cost ({activeCurrency.code})</TableHead>
                                    <TableHead className="w-32 text-right font-bold text-slate-500 text-[10px] uppercase">Rate ({activeCurrency.code})</TableHead>
                                    <TableHead className="w-40 text-right pr-8 font-bold text-slate-500 text-[10px] uppercase">Total</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="hover:bg-slate-50/50 border-b last:border-none align-top">
                                        <TableCell className="text-center pt-5 text-xs font-bold text-slate-300">{index + 1}</TableCell>
                                        <TableCell className="py-4 pl-6 space-y-2">
                                            <Input {...register(`items.${index}.description` as const)} className="h-9 border-slate-200 bg-white font-bold text-slate-900 rounded-lg px-4 text-xs" placeholder="Item Name" />
                                            <Textarea {...register(`items.${index}.details` as const)} className="min-h-[80px] border-slate-200 bg-slate-50/50 text-slate-600 font-medium rounded-lg px-4 py-2 text-[11px] resize-none" placeholder="Technical specifications..." />
                                        </TableCell>
                                        <TableCell className="pt-4 align-top"><Input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="h-9 border-slate-200 rounded-lg text-center font-bold text-xs" /></TableCell>
                                        <TableCell className="pt-4 align-top"><Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-9 border-slate-200 rounded-lg text-right font-bold text-xs text-amber-600" /></TableCell>
                                        <TableCell className="pt-4 align-top"><Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-9 border-slate-200 rounded-lg text-right font-bold text-xs text-blue-600" /></TableCell>
                                        <TableCell className="pt-6 text-right pr-8 font-bold text-slate-900 text-sm tabular-nums">
                                            {activeCurrency.symbol}{(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="pt-4 align-top"><Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <ScrollBar orientation="horizontal" />
                    </ScrollArea>
                    <div className="p-4 bg-slate-50/30 border-t flex justify-between items-center">
                        <Button type="button" variant="outline" size="sm" onClick={() => append({ description: '', details: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-10 px-6 rounded-lg border-blue-600 text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm gap-2"><Plus size={16} /> Add Tech Entry</Button>
                        <div className="hidden sm:flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest"><ShieldCheck size={14} className="text-emerald-500" /> Operational Record Verified</div>
                    </div>
                </Card>
            </div>

            {/* TOTALS & TERMS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="grid gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 ml-1 text-slate-400"><Info size={14} /><h3 className="text-[10px] font-bold uppercase tracking-widest">Statutory Terms & Conditions</h3></div>
                        <Textarea {...register("termsAndConditions")} className="min-h-[140px] rounded-xl border-slate-200 bg-slate-50/20 p-4 text-xs font-medium text-slate-600" />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 ml-1 text-slate-400"><FileDigit size={14} /><h3 className="text-[10px] font-bold uppercase tracking-widest">Internal Audit Description</h3></div>
                        <Textarea {...register("internalDescription")} className="min-h-[140px] rounded-xl border-slate-200 bg-slate-50/20 p-4 text-xs font-medium text-slate-600" />
                    </div>
                </div>

                <div className="space-y-8">
                    <Card className="rounded-2xl border-none bg-slate-900 text-white shadow-xl p-8 md:p-10 space-y-8">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest"><span>Operational Sub Total</span><span className="text-white text-xs">{activeCurrency.symbol}{totals.subTotal.toLocaleString()}</span></div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-rose-400 uppercase tracking-wider pt-1 border-t border-white/5"><span>Aggregate Discounts</span><Input type="number" step="0.01" {...register("discountAmount")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" /></div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-blue-400 uppercase tracking-wider pt-1"><span>Tax Liability (%)</span><Input type="number" step="0.1" {...register("taxRate")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" /></div>
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider pt-1"><span>Manual Adjustment</span><Input type="number" step="0.01" {...register("adjustment")} className="w-28 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" /></div>
                        </div>

                        <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                            <div className="space-y-0.5"><p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Receivable Valuation</p><h4 className="text-4xl font-bold text-white tracking-tighter tabular-nums">{activeCurrency.symbol}{totals.grandTotal.toLocaleString()}</h4></div>
                            <Badge className="bg-blue-600 text-white font-bold px-3 py-1 rounded-md text-[8px] uppercase tracking-wider border-none mb-1">{activeCurrency.code} NET SUM</Badge>
                        </div>
                        
                        <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-white hover:bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all active:scale-95 flex gap-3">
                            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <><CheckCircle2 size={18} className="text-blue-600" /> Finalize & Dispatch Protocol</>}
                        </Button>
                    </Card>

                    <div className="flex flex-col items-center gap-4">
                        <div className="bg-emerald-50 border border-emerald-100 px-4 py-2 rounded-full flex items-center gap-2 shadow-sm"><Wifi size={12} className="text-emerald-500" /><span className="text-[9px] font-bold text-emerald-800 uppercase tracking-widest">Network Registry Synchronized</span></div>
                    </div>
                </div>
            </div>
        </form>

        <footer className="pt-12 pb-8 text-center opacity-40 border-t border-slate-100">
            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em] flex items-center justify-center gap-3"><FileDigit size={14} /> Registry ID: {tenantId.substring(0,18).toUpperCase()} • Master-v2.9.2</p>
        </footer>
      </div>
    </div>
  );
}