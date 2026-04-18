"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Coins, Layers, BadgeAlert, Clock, ShieldCheck,
  TrendingUp, Info, Printer, Building2, Phone, Mail, MapPin, 
  Landmark, Smartphone, PenTool, Hash, Calendar, Download, Send, 
  User, UserCheck, AlertTriangle, FileDigit
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

// --- ENTERPRISE FINANCIAL UTILITIES ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

// --- ENTERPRISE SCHEMA VALIDATION ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client Selection Required"),
  estimateUid: z.string().min(1, "Reference Number Required"),
  title: z.string().min(3, "Document Subject Required"),
  issueDate: z.string().min(1, "Issue Date Required"),
  validUntil: z.string().min(1, "Expiry Date Required"),
  currencyCode: z.string().min(3),
  
  // Corporate Identity & Stationery
  plotNumber: z.string().optional(),
  pobox: z.string().optional(),
  tinNumber: z.string().optional(),
  officialEmail: z.string().optional(),
  ceoName: z.string().optional(),
  ceoDesignation: z.string().optional(),
  
  // Payment Protocol
  chequesPayableTo: z.string().min(3, "Beneficiary Required"),
  bankDetails: z.string().min(5, "Bank Details Required"),
  momoDetails: z.string().optional(),
  inquiryContact: z.string().min(5, "Contact Required"),
  
  // Technical Specifications
  items: z.array(z.object({
    description: z.string().min(1, "Item name required"),
    applicationArea: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unitCost: z.coerce.number().min(0), 
    unitRate: z.coerce.number().min(0), 
  })).min(1, "Minimum 1 Item Required")
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

  // --- INITIALIZE FORM ---
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { 
        title: 'Commercial Quotation and Service Estimate', 
        currencyCode: 'UGX',
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
        items: [{ description: '', applicationArea: '', quantity: 1, unitCost: 0, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrency = watch("currencyCode");
  const formValues = watch();

  // --- 1. SEQUENCE GENERATOR ---
  useEffect(() => {
    async function fetchNextSequence() {
        const { count, error } = await supabase
            .from('estimates')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        
        if (!error) {
            const nextSeq = (count || 0) + 1;
            setValue('estimateUid', `QT-${nextSeq.toString().padStart(4, '0')}`);
        }
    }
    fetchNextSequence();
  }, [tenantId, setValue, supabase]);

  // --- 2. MARGIN CALCULATION ---
  const totals = useMemo(() => {
    const grossPrice = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const totalCost = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitCost || 0, curr.quantity || 0), 0);
    const margin = grossPrice > 0 ? ((grossPrice - totalCost) / grossPrice) * 100 : 0;
    return { grossPrice, totalCost, margin };
  }, [watchedItems]);

  // --- 3. PDF GENERATION ---
  const generateProfessionalPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    if (branding?.logo_url) {
        try { doc.addImage(branding.logo_url, 'PNG', 14, 12, 35, 18); } catch (e) { console.error("Logo error"); }
    }

    doc.setFontSize(18); doc.setTextColor(30, 41, 59); doc.setFont("helvetica", "bold");
    doc.text(businessInfo.name, pageWidth - 14, 20, { align: 'right' });

    doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text([
        `Address: ${formValues.plotNumber || businessInfo.address}`,
        `P.O. Box: ${formValues.pobox || 'N/A'} | Email: ${formValues.officialEmail}`,
        `TIN: ${formValues.tinNumber} | Contact: ${formValues.inquiryContact}`
    ], pageWidth - 14, 26, { align: 'right' });

    doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.5); doc.line(14, 45, pageWidth - 14, 45);

    doc.setFontSize(14); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text("COMMERCIAL QUOTATION", 14, 55);

    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Estimate No: ${formValues.estimateUid}`, pageWidth - 14, 55, { align: 'right' });
    doc.text(`Date: ${format(new Date(formValues.issueDate), 'dd MMM yyyy')}`, pageWidth - 14, 60, { align: 'right' });
    doc.text(`Expiry: ${format(new Date(formValues.validUntil), 'dd MMM yyyy')}`, pageWidth - 14, 65, { align: 'right' });

    const client = customers.find(c => String(c.id) === formValues.customerId);
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("BILL TO:", 14, 80);
    doc.setFont("helvetica", "normal");
    doc.text([
        client?.name || 'Customer Name',
        `Phone: ${client?.phone || 'N/A'}`,
        `Address: ${client?.address || 'N/A'}`
    ], 14, 85);

    autoTable(doc, {
        startY: 105,
        head: [['Item Description', 'Category', 'Qty', 'Unit Price', 'Total']],
        body: watchedItems.map(i => [
            i.description,
            i.applicationArea || 'Standard',
            i.quantity,
            `${i.unitRate.toLocaleString()} ${currentCurrency}`,
            `${(i.quantity * i.unitRate).toLocaleString()} ${currentCurrency}`
        ]),
        headStyles: { fillColor: [37, 87, 214], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 4 },
        foot: [[
            { content: 'TOTAL AMOUNT', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `${totals.grossPrice.toLocaleString()} ${currentCurrency}`, styles: { fontStyle: 'bold', fillColor: [248, 250, 252] } }
        ]]
    });

    let finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("Payment Instructions:", 14, finalY);
    
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text([
        `Bank Details: ${formValues.bankDetails}`,
        `Payment Payable to: ${formValues.chequesPayableTo}`,
        `Mobile Payment: ${formValues.momoDetails || 'N/A'}`
    ], 14, finalY + 6);

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text("Authorized Signature:", 14, 270);
    doc.setFont("helvetica", "bold");
    doc.text(`${formValues.ceoName || 'Authorized Officer'}`, 14, 280);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(formValues.ceoDesignation || '', 14, 285);

    doc.save(`${formValues.estimateUid}_Quotation.pdf`);
    toast.success("PDF Generated");
  };

  // --- 4. SUBMIT ---
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
        total_amount: totals.grossPrice,
        valid_until: values.validUntil,
        client_name: customers.find(c => String(c.id) === values.customerId)?.name,
        metadata: { ...values } 
      }).select('id').single();

      if (estErr) throw estErr;

      const { error: lineErr } = await supabase.from('estimate_line_items').insert(
        values.items.map(item => ({
          estimate_id: estData.id,
          description: item.description,
          application_area: item.applicationArea,
          quantity: item.quantity,
          unit_cost: item.unitCost, 
          unit_price: item.unitRate, 
          total: Money.multiply(item.unitRate, item.quantity)
        }))
      );

      if (lineErr) throw lineErr;
      
      toast.success("Estimate saved successfully");
      router.push('/invoicing/estimates/history'); 
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto py-10 px-6 space-y-8 animate-in fade-in duration-500">
      
      {/* HEADER SECTION */}
      <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
        <CardContent className="p-8 flex flex-col lg:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-5">
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-100 text-blue-600">
                    <PenTool size={28} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Create New Quotation</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold text-[10px] uppercase">
                            Drafting Engine Active
                        </Badge>
                        <span className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider flex items-center gap-2">
                           <Clock size={14}/> System Online
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6 pr-4">
                <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Project Margin</p>
                    <p className={`text-3xl font-bold ${totals.margin >= 25 ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {totals.margin.toFixed(1)}%
                    </p>
                </div>
                <div className="h-10 w-px bg-slate-200" />
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Currency</p>
                    <Select value={currentCurrency} onValueChange={(v) => setValue('currencyCode', v)}>
                        <SelectTrigger className="w-32 h-9 bg-white border-slate-200 text-sm font-bold">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {currencies.map(c => <SelectItem key={c.code} value={c.code}>{c.code}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: SETTINGS */}
        <div className="lg:col-span-4 space-y-6">
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-6">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Building2 size={16} className="text-blue-500"/> Business Details
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Estimate Reference</Label>
                        <Input {...register("estimateUid")} className="h-10 font-bold border-slate-200 bg-slate-50 text-blue-600 text-sm" readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">Issue Date</Label>
                            <Input type="date" {...register("issueDate")} className="h-10 text-sm font-medium border-slate-200" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">Valid Until</Label>
                            <Input type="date" {...register("validUntil")} className="h-10 text-sm font-medium border-slate-200" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Physical Address</Label>
                        <Input {...register("plotNumber")} className="h-10 border-slate-200 text-sm" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">P.O. Box</Label>
                            <Input {...register("pobox")} className="h-10 border-slate-200 text-sm" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600">Tax ID (TIN)</Label>
                            <Input {...register("tinNumber")} className="h-10 border-slate-200 text-sm" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border border-slate-200 shadow-sm rounded-xl bg-white">
                <CardHeader className="bg-slate-50 border-b p-6">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                        <Landmark size={16} className="text-blue-500"/> Bank & Payments
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Payable To</Label>
                        <Input {...register("chequesPayableTo")} className="h-10 border-slate-200 text-sm" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Bank Account Details</Label>
                        <Textarea {...register("bankDetails")} className="min-h-[80px] text-xs border-slate-200" />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-600">Support Contact</Label>
                        <Input {...register("inquiryContact")} className="h-10 border-slate-200 text-sm" />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: ITEMS */}
        <div className="lg:col-span-8 space-y-6">
            <Card className="border border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="p-8 border-b bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                <User size={14} className="text-slate-400"/> Customer Selection
                            </Label>
                            <select {...register("customerId")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-medium focus:outline-none focus:ring-1 focus:ring-blue-500">
                                <option value="">Select a Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-600 flex items-center gap-2">
                                <FileDigit size={14} className="text-slate-400"/> Subject Title
                            </Label>
                            <Input {...register("title")} className="h-10 border-slate-200 font-semibold text-sm px-4" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900 border-none h-12">
                            <TableRow className="hover:bg-slate-900 border-none">
                                <TableHead className="text-[10px] font-bold uppercase text-slate-400 pl-8">Item & Description</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase text-slate-400 w-24 text-center">Qty</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right w-32">Rate ({currentCurrency})</TableHead>
                                <TableHead className="text-[10px] font-bold uppercase text-slate-400 text-right w-40 pr-8">Sub-Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="hover:bg-slate-50 border-b border-slate-100 group transition-colors">
                                    <TableCell className="pl-8 py-6">
                                        <Input {...register(`items.${index}.description` as const)} className="border-none shadow-none font-bold text-slate-800 text-sm p-0 bg-transparent focus-visible:ring-0" placeholder="Product or service name..." />
                                        <Input {...register(`items.${index}.applicationArea` as const)} className="h-7 border-none shadow-none font-medium text-[9px] uppercase text-slate-400 p-0 bg-transparent focus-visible:ring-0 mt-1" placeholder="Add category / area..." />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" {...register(`items.${index}.quantity` as const)} className="h-9 text-center font-bold border-slate-200 rounded-lg w-full text-sm" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-9 text-right font-bold border-slate-200 rounded-lg text-blue-600 bg-blue-50/20 w-full text-sm" />
                                    </TableCell>
                                    <TableCell className="text-right pr-8 font-bold text-slate-900 text-base tabular-nums">
                                        {(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell className="pr-4">
                                        <Button variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8 text-slate-300 hover:text-red-500 transition-colors">
                                            <Trash2 size={16}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-8 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-4">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', applicationArea: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-10 px-6 font-bold text-xs uppercase gap-2 bg-white border-slate-200 shadow-sm hover:bg-slate-50">
                            <Plus size={16}/> Add Line Item
                        </Button>
                        <Button type="button" onClick={generateProfessionalPDF} className="h-10 px-6 font-bold bg-slate-900 text-white rounded-lg shadow-sm gap-2 hover:bg-slate-800">
                            <Printer size={16}/> Print Preview
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div className="p-6 bg-blue-50 border border-blue-100 rounded-xl flex gap-4 items-start">
                    <ShieldCheck size={24} className="text-blue-600 shrink-0 mt-1"/>
                    <div className="space-y-1">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900">Standard Estimate Policy</h4>
                        <p className="text-[11px] font-medium text-blue-700 leading-relaxed">
                            This document serves as a formal commercial offer. Once accepted, it remains valid until the specified expiry date.
                        </p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex justify-between items-end border-b-2 border-slate-100 pb-6">
                        <div className="space-y-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Grand Total</span>
                        </div>
                        <div className="text-right">
                            <p className="text-5xl font-bold text-slate-900 tracking-tight tabular-nums leading-none">
                                {totals.grossPrice.toLocaleString()}
                            </p>
                            <span className="text-sm font-bold text-blue-600 uppercase tracking-wider mt-2 block">{currentCurrency}</span>
                        </div>
                    </div>
                    
                    <Button 
                        disabled={isSubmitting} 
                        type="submit" 
                        className="w-full h-14 bg-[#2557D6] hover:bg-[#1e44a8] text-white font-bold uppercase tracking-widest text-lg rounded-xl shadow-sm transition-all"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin h-6 w-6" />
                        ) : (
                            <div className="flex items-center gap-3">
                                <Send size={20}/> 
                                Save & Record Estimate
                            </div>
                        )}
                    </Button>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
}