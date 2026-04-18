"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Coins, Layers, BadgeAlert, Clock, ShieldCheck,
  TrendingUp, Info, Printer, Building2, Phone, Mail, MapPin, 
  Landmark, Smartphone, PenTool, FileDigit, Hash, Calendar, Download, Send, Signature, User
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

// --- BBU1 SOVEREIGN FINANCIAL UTILITIES ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

// --- ENTERPRISE SCHEMA VALIDATION ---
const estimateSchema = z.object({
  customerId: z.string().min(1, "Client Selection Required"),
  estimateUid: z.string().min(1, "Protocol Number Required"),
  title: z.string().min(3, "Document Subject Required"),
  issueDate: z.string().min(1, "Generation Date Required"),
  validUntil: z.string().min(1, "Expiry Protocol Required"),
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
  bankDetails: z.string().min(5, "Settlement Bank Required"),
  momoDetails: z.string().optional(),
  inquiryContact: z.string().min(5, "Support Contact Required"),
  
  // Technical Specifications
  items: z.array(z.object({
    description: z.string().min(1, "Item name required"),
    applicationArea: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unitCost: z.coerce.number().min(0), // Internal Production Cost
    unitRate: z.coerce.number().min(0), // Commercial Selling Rate
  })).min(1, "Minimum 1 Specification Required")
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

  // --- INITIALIZE FORM WITH ENTERPRISE DEFAULTS ---
  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { 
        title: 'Commercial Specification & Industrial Quotation', 
        currencyCode: 'UGX',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        officialEmail: businessInfo.email,
        tinNumber: businessInfo.tin,
        plotNumber: businessInfo.plot || '',
        pobox: businessInfo.pobox || '',
        chequesPayableTo: businessInfo.name,
        bankDetails: 'Bank: ... Branch: ... A/C: ...',
        ceoName: '',
        ceoDesignation: 'Chief Executive Officer',
        inquiryContact: businessInfo.phone,
        items: [{ description: '', applicationArea: '', quantity: 1, unitCost: 0, unitRate: 0 }] 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const currentCurrency = watch("currencyCode");
  const formValues = watch();

  // --- 1. AUTONOMOUS SEQUENTIAL NUMBERING ENGINE ---
  useEffect(() => {
    async function fetchNextSequence() {
        const { count, error } = await supabase
            .from('estimates')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        
        if (!error) {
            const nextSeq = (count || 0) + 1;
            setValue('estimateUid', `BBU1-QT-${nextSeq.toString().padStart(4, '0')}`);
        }
    }
    fetchNextSequence();
  }, [tenantId, setValue, supabase]);

  // --- 2. REAL-TIME MARGIN & YIELD AUDIT ---
  const totals = useMemo(() => {
    const grossPrice = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const totalCost = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitCost || 0, curr.quantity || 0), 0);
    const margin = grossPrice > 0 ? ((grossPrice - totalCost) / grossPrice) * 100 : 0;
    return { grossPrice, totalCost, margin };
  }, [watchedItems]);

  // --- 3. PROFESSIONAL PDF GENERATION ENGINE (CORPORATE STANDARD) ---
  const generateProfessionalPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // BRANDED LOGO & HEADER
    if (branding?.logo_url) {
        try { doc.addImage(branding.logo_url, 'PNG', 14, 12, 35, 18); } catch (e) { console.error("Logo injection error"); }
    }

    doc.setFontSize(22); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text(businessInfo.name.toUpperCase(), pageWidth - 14, 22, { align: 'right' });

    doc.setFontSize(8); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text([
        `Plot No: ${formValues.plotNumber || 'N/A'} | Location: ${businessInfo.address}`,
        `P.O. Box: ${formValues.pobox || 'N/A'} | Email: ${formValues.officialEmail}`,
        `TIN: ${formValues.tinNumber} | Contact: ${formValues.inquiryContact}`
    ], pageWidth - 14, 28, { align: 'right' });

    doc.setDrawColor(59, 130, 246); doc.setLineWidth(0.8); doc.line(14, 48, pageWidth - 14, 48);

    // DOCUMENT METADATA BLOCK
    doc.setFontSize(16); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text("COMMERCIAL QUOTATION", 14, 60);

    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(`Protocol ID: ${formValues.estimateUid}`, pageWidth - 14, 60, { align: 'right' });
    doc.text(`Issue Date: ${format(new Date(formValues.issueDate), 'PPPP')}`, pageWidth - 14, 66, { align: 'right' });
    doc.text(`Expiry Date: ${format(new Date(formValues.validUntil), 'PPPP')}`, pageWidth - 14, 72, { align: 'right' });

    // CLIENT ENTITY BLOCK
    const client = customers.find(c => String(c.id) === formValues.customerId);
    doc.setFontSize(11); doc.setFont("helvetica", "bold");
    doc.text("PREPARED FOR:", 14, 85);
    doc.setFont("helvetica", "normal");
    doc.text([
        client?.name || 'Valued Business Entity',
        `Phone: ${client?.phone || 'N/A'}`,
        `Address: ${client?.address || 'N/A'}`
    ], 14, 91);

    // SPECIFICATION TABLE (EXCLUDES INTERNAL COSTS)
    autoTable(doc, {
        startY: 110,
        head: [['Specification & Description', 'Application Area', 'Qty', 'Unit Rate', 'Total Amount']],
        body: watchedItems.map(i => [
            i.description,
            i.applicationArea || 'Standard',
            i.quantity,
            `${i.unitRate.toLocaleString()} ${currentCurrency}`,
            `${(i.quantity * i.unitRate).toLocaleString()} ${currentCurrency}`
        ]),
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 9, cellPadding: 5 },
        foot: [[
            { content: 'GRAND TOTAL QUOTATION VALUE', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } },
            { content: `${totals.grossPrice.toLocaleString()} ${currentCurrency}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }
        ]]
    });

    // PAYMENT & PROTOCOL SECTION
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.setFont("helvetica", "bold");
    doc.text("PAYMENT & BANKING PROTOCOL:", 14, finalY);
    
    doc.setFillColor(248, 250, 252); doc.rect(14, finalY + 4, pageWidth - 28, 28, 'F');
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text([
        `• All cheques payable to: ${formValues.chequesPayableTo}`,
        `• Bank Details: ${formValues.bankDetails}`,
        `• Mobile Money: ${formValues.momoDetails || 'N/A'}`
    ], 20, finalY + 12);

    // FORMAL SIGN-OFF
    doc.setFontSize(9); doc.setFont("helvetica", "italic");
    doc.text(`For any technical or commercial inquiries, kindly contact: ${formValues.inquiryContact}`, 14, 255);
    
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    doc.text("Yours Sincerely,", 14, 270);
    doc.setFont("helvetica", "bold");
    doc.text(`${formValues.ceoName || 'Authorized Personnel'}`, 14, 280);
    doc.setFontSize(9); doc.setFont("helvetica", "normal");
    doc.text(formValues.ceoDesignation || 'Management', 14, 285);

    doc.save(`${formValues.estimateUid}_Commercial_Spec.pdf`);
    toast.success("Professional Document Generated");
  };

  // --- 4. MASTER SUBMIT PROTOCOL ---
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
        metadata: { ...values } // Secure metadata storage for re-printing
      }).select('id').single();

      if (estErr) throw estErr;

      // Atomic Batch insert of specifications
      const { error: lineErr } = await supabase.from('estimate_line_items').insert(
        values.items.map(item => ({
          estimate_id: estData.id,
          description: item.description,
          application_area: item.applicationArea,
          quantity: item.quantity,
          unit_cost: item.unitCost, // Saved for internal margin audit
          unit_price: item.unitRate, // Fiscal price
          total: Money.multiply(item.unitRate, item.quantity)
        }))
      );

      if (lineErr) throw lineErr;
      
      toast.success("Commercial Protocol Recorded & Locked");
      router.push('/invoicing/estimates/history'); // Direct to Audit Ledger
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-1000 max-w-[1700px] mx-auto pb-32">
      
      {/* --- MASTER COMMAND HEADER --- */}
      <Card className="border-none shadow-[0_30px_60px_-15px_rgba(0,0,0,0.3)] rounded-[4rem] overflow-hidden bg-slate-900 text-white relative">
        <div className="absolute top-0 right-0 p-16 opacity-10 rotate-12">
            <ShieldCheck size={300} />
        </div>
        <CardContent className="p-14 flex flex-col lg:flex-row justify-between items-center gap-14 relative z-10">
            <div className="flex items-center gap-10">
                <div className="p-10 bg-blue-600 rounded-[3rem] shadow-[0_20px_50px_rgba(37,99,235,0.4)] transform hover:scale-105 transition-all">
                    <PenTool size={64} className="text-white" />
                </div>
                <div>
                    <h1 className="text-6xl font-black tracking-tighter uppercase leading-none italic">Estimate Terminal</h1>
                    <div className="flex items-center gap-5 mt-5">
                        <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30 font-black text-[12px] tracking-[0.4em] px-6 py-2.5 uppercase rounded-full">
                            BBU1_SOVEREIGN_NODE
                        </Badge>
                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                           <Clock size={16}/> v5.2 REAL-TIME SEQUENCING
                        </span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-8 bg-white/5 backdrop-blur-3xl p-10 rounded-[3.5rem] border border-white/10 shadow-inner">
                <div className="text-right">
                    <p className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Internal Project Margin</p>
                    <p className={`text-6xl font-black tabular-nums ${totals.margin >= 25 ? 'text-emerald-400' : 'text-orange-400'}`}>
                        {totals.margin.toFixed(1)}%
                    </p>
                </div>
                <div className="w-[2px] h-20 bg-white/10 mx-6 rounded-full" />
                <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Protocol Currency</p>
                    <Select value={currentCurrency} onValueChange={(v) => setValue('currencyCode', v)}>
                        <SelectTrigger className="w-52 h-16 bg-blue-600 border-none text-2xl font-black rounded-2xl shadow-xl hover:bg-blue-700 transition-colors">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="font-black">
                            {currencies.map(c => <SelectItem key={c.code} value={c.code} className="text-xl">{c.code} - {c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-12 gap-12">
        
        {/* LEFT COLUMN: CORPORATE STATIONERY */}
        <div className="xl:col-span-4 space-y-10">
            <Card className="border-slate-200 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-10">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                        <Building2 size={20} className="text-blue-600"/> 1. Business Identity Node
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                           <Hash size={12}/> Protocol ID (Auto-Generated)
                        </Label>
                        <Input {...register("estimateUid")} className="h-14 font-black border-slate-200 rounded-2xl bg-slate-50 text-blue-600 text-lg" readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Issue Date</Label>
                            <Input type="date" {...register("issueDate")} className="h-14 font-black border-slate-200 rounded-2xl" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Expiry Protocol</Label>
                            <Input type="date" {...register("validUntil")} className="h-14 font-black border-slate-200 rounded-2xl text-orange-600" />
                        </div>
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Plot Number / Physical Address</Label>
                        <Input {...register("plotNumber")} className="h-14 font-black border-slate-200 rounded-2xl" placeholder="e.g. Plot 19, Yusuf Lule Road" />
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">P.O. Box</Label>
                            <Input {...register("pobox")} className="h-14 font-black border-slate-200 rounded-2xl" placeholder="e.g. 7062 Kampala" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">TIN Identifier</Label>
                            <Input {...register("tinNumber")} className="h-14 font-black border-slate-200 rounded-2xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-10">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                        <Landmark size={20} className="text-blue-600"/> 2. Disbursement Instructions
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Cheques Payable To</Label>
                        <Input {...register("chequesPayableTo")} className="h-14 font-black border-slate-200 rounded-2xl" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Bank Account Specification</Label>
                        <Textarea {...register("bankDetails")} className="min-h-[100px] font-bold border-slate-200 rounded-2xl text-xs" placeholder="e.g. Stanbic Bank, Kampala Branch, A/C: 903..." />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Mobile Money / Airtel Merchant</Label>
                        <div className="relative">
                            <Smartphone className="absolute left-4 top-4.5 h-5 w-5 text-slate-300" />
                            <Input {...register("momoDetails")} className="h-14 font-black border-slate-200 rounded-2xl pl-12" placeholder="Merchant Name & Code" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-2xl rounded-[3rem] overflow-hidden bg-white border-dashed">
                <CardHeader className="bg-slate-50 border-b p-10">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.4em] text-slate-500 flex items-center gap-4">
                        <Signature size={20} className="text-blue-600"/> 3. Formal Signatory Block
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-10 space-y-8">
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Signatory Full Name</Label>
                        <Input {...register("ceoName")} className="h-14 font-black border-slate-200 rounded-2xl" placeholder="Person signing the document" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Official Designation</Label>
                        <Input {...register("ceoDesignation")} className="h-14 font-black border-slate-200 rounded-2xl" placeholder="e.g. Managing Director" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[11px] font-black uppercase tracking-widest text-slate-400">Support / Inquiry Telephone</Label>
                        <Input {...register("inquiryContact")} className="h-14 font-black border-slate-200 rounded-2xl" />
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT COLUMN: CLIENT SELECTION & ITEMS */}
        <div className="xl:col-span-8 space-y-10">
            <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] rounded-[4rem] overflow-hidden bg-white">
                <CardHeader className="p-12 border-b bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="space-y-4">
                            <Label className="text-[12px] font-black uppercase text-slate-400 tracking-[0.3em] ml-3 flex items-center gap-2">
                                <User size={14}/> Client Entity
                            </Label>
                            <select {...register("customerId")} className="w-full h-20 px-8 border-2 border-slate-200 rounded-[1.5rem] bg-white text-lg font-black focus:ring-8 focus:ring-blue-50 transition-all outline-none">
                                <option value="">Select Target Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-4">
                            <Label className="text-[12px] font-black uppercase text-slate-400 tracking-[0.3em] ml-3 flex items-center gap-2">
                                <FileDigit size={14}/> Document Subject
                            </Label>
                            <Input {...register("title")} className="h-20 border-2 border-slate-200 rounded-[1.5rem] font-black text-2xl px-8" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900 h-24 border-none">
                            <TableRow className="hover:bg-slate-900 border-none">
                                <TableHead className="text-[11px] font-black uppercase text-slate-400 pl-12">Specification & Dimension</TableHead>
                                <TableHead className="text-[11px] font-black uppercase text-slate-400">Application Area</TableHead>
                                <TableHead className="text-[11px] font-black uppercase text-slate-400 text-center">Qty</TableHead>
                                <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Internal Cost</TableHead>
                                <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right">Selling Rate</TableHead>
                                <TableHead className="text-[11px] font-black uppercase text-slate-400 text-right pr-12">Sub-Total</TableHead>
                                <TableHead className="w-20"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="hover:bg-blue-50/40 border-b border-slate-100 group transition-all">
                                    <TableCell className="pl-12 py-10">
                                        <Input {...register(`items.${index}.description` as const)} className="border-none shadow-none font-black text-slate-900 text-2xl p-0 bg-transparent focus-visible:ring-0" placeholder="Product..." />
                                    </TableCell>
                                    <TableCell>
                                        <Input {...register(`items.${index}.applicationArea` as const)} className="h-12 border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase bg-white focus:border-blue-400 shadow-sm" placeholder="e.g. ROOFING" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" {...register(`items.${index}.quantity` as const)} className="h-12 text-center font-black border-2 border-slate-100 rounded-xl w-24" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-12 text-right font-black border-2 border-slate-100 rounded-xl text-slate-300 w-32" />
                                    </TableCell>
                                    <TableCell>
                                        <Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-12 text-right font-black border-2 border-blue-200 rounded-xl text-blue-600 bg-blue-50/20 w-36 shadow-inner" />
                                    </TableCell>
                                    <TableCell className="text-right pr-12 font-black text-slate-900 text-3xl tabular-nums tracking-tighter">
                                        {(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                        <Button variant="ghost" onClick={() => remove(index)} className="text-slate-200 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100 transition-all transform hover:scale-125">
                                            <Trash2 size={28}/>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-12 bg-slate-50/50 border-t flex flex-col md:flex-row justify-between items-center gap-6">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', applicationArea: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-20 px-14 font-black text-sm uppercase gap-5 bg-white border-2 border-slate-200 rounded-3xl hover:bg-slate-900 hover:text-white transition-all shadow-2xl hover:scale-105">
                            <Plus size={28}/> Add Technical Specification
                        </Button>
                        <div className="flex gap-4">
                            <Button type="button" onClick={generateProfessionalPDF} className="h-20 px-12 font-black bg-slate-900 text-white rounded-3xl shadow-2xl gap-4 hover:bg-blue-600 transition-all hover:scale-105">
                                <Printer size={24}/> PREVIEW & PRINT DOCUMENT
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-end">
                <Card className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white rounded-[4rem] border-none p-12 shadow-[0_40px_80px_-20px_rgba(37,99,235,0.4)] flex gap-10 items-start relative overflow-hidden">
                    <TrendingUp size={240} className="absolute -right-20 -bottom-20 opacity-5 rotate-12" />
                    <div className="p-6 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10 shadow-inner"><ShieldCheck size={40}/></div>
                    <div className="space-y-4 relative z-10">
                        <h4 className="font-black uppercase tracking-[0.4em] text-blue-300 text-xs">Sovereign Financial Seal</h4>
                        <p className="text-sm font-bold text-blue-100 leading-relaxed max-w-sm">
                            Protocol value verified. This specification is generated as a binding commercial offer and complies with international auditing standards.
                        </p>
                    </div>
                </Card>

                <div className="space-y-8">
                    <div className="flex justify-between items-end border-b-8 border-slate-200 pb-10 mb-5">
                        <div className="space-y-2">
                            <span className="text-[12px] font-black text-slate-400 uppercase tracking-[0.4em]">Gross Protocol Value</span>
                            <Badge className="bg-orange-100 text-orange-700 border-none font-black px-4 py-1 text-[10px] tracking-widest block">AWAITING APPROVAL</Badge>
                        </div>
                        <div className="text-right">
                            <p className="text-8xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">
                                {totals.grossPrice.toLocaleString()}
                            </p>
                            <span className="text-2xl font-black text-blue-600 uppercase tracking-[0.4em] mt-4 block">{currentCurrency}</span>
                        </div>
                    </div>
                    
                    <Button 
                        disabled={isSubmitting} 
                        type="submit" 
                        className="w-full h-32 bg-blue-600 hover:bg-slate-900 text-white font-black uppercase tracking-[0.4em] text-3xl rounded-[2.5rem] shadow-2xl transition-all group active:scale-95"
                    >
                        {isSubmitting ? (
                            <Loader2 className="animate-spin h-14 w-14" />
                        ) : (
                            <div className="flex items-center gap-8">
                                <Send size={44} className="group-hover:translate-x-3 transition-transform"/> 
                                COMMIT PROTOCOL
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