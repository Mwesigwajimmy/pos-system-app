"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, FileText, CheckCircle2, 
  Calculator, Coins, Layers, BadgeAlert, Clock, ShieldCheck,
  TrendingUp, Info, Printer, Building2, Phone, Mail, MapPin, 
  Landmark, Smartphone, PenTool, Hash, Calendar, Download, Send
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

const estimateSchema = z.object({
  customerId: z.string().min(1, "Client Selection Required"),
  estimateUid: z.string().min(1, "Reference Number Required"),
  title: z.string().min(3, "Document Title Required"),
  issueDate: z.string().min(1, "Issue Date Required"),
  validUntil: z.string().min(1, "Expiry Date Required"),
  currencyCode: z.string().min(3),
  // Stationery Details
  plotNumber: z.string().optional(),
  pobox: z.string().optional(),
  companyEmail: z.string().email("Invalid email"),
  companyPhone: z.string().min(5, "Contact required"),
  companyLocation: z.string().min(3, "Location required"),
  tinNumber: z.string().min(3, "TIN required"),
  // Payment Protocol
  chequesPayableTo: z.string().min(3, "Required"),
  bankDetails: z.string().min(5, "Bank info required"),
  momoDetails: z.string().optional(),
  inquiryContact: z.string().min(5, "Inquiry contact required"),
  // Specification Items
  items: z.array(z.object({
    description: z.string().min(1, "Item name required"),
    applicationArea: z.string().optional(),
    quantity: z.coerce.number().min(0.001),
    unitCost: z.coerce.number().min(0), // Internal Internal Cost
    unitRate: z.coerce.number().min(0), // Selling Price
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
}

export default function EstimateTerminal({ 
    tenantId, 
    customers, 
    currencies,
    businessInfo 
}: EstimateTerminalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { 
        title: 'Commercial Specification & Quotation Protocol', 
        currencyCode: 'UGX',
        issueDate: format(new Date(), 'yyyy-MM-dd'),
        validUntil: format(new Date(Date.now() + 30 * 86400000), 'yyyy-MM-dd'),
        companyEmail: businessInfo.email,
        companyPhone: businessInfo.phone,
        companyLocation: businessInfo.address,
        tinNumber: businessInfo.tin,
        plotNumber: businessInfo.plot || '',
        pobox: businessInfo.pobox || '',
        chequesPayableTo: businessInfo.name,
        bankDetails: 'Bank: ... Branch: ... A/C: ...',
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
    async function fetchNextQuoteNumber() {
        const { count, error } = await supabase
            .from('estimates')
            .select('*', { count: 'exact', head: true })
            .eq('tenant_id', tenantId);
        
        if (!error) {
            const nextSeq = (count || 0) + 1;
            const paddedSeq = nextSeq.toString().padStart(4, '0');
            setValue('estimateUid', `BBU1-QT-${paddedSeq}`);
        }
    }
    fetchNextQuoteNumber();
  }, [tenantId, setValue, supabase]);

  const totals = useMemo(() => {
    const grossPrice = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitRate || 0, curr.quantity || 0), 0);
    const totalCost = watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitCost || 0, curr.quantity || 0), 0);
    const margin = grossPrice > 0 ? ((grossPrice - totalCost) / grossPrice) * 100 : 0;
    return { grossPrice, totalCost, margin };
  }, [watchedItems]);

  // --- 2. PROFESSIONAL PDF ENGINE (HEADED PAPER READY) ---
  const generateProfessionalPDF = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();

    // BRANDED HEADER
    doc.setFontSize(24); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text(businessInfo.name.toUpperCase(), 14, 25);

    doc.setFontSize(9); doc.setTextColor(100); doc.setFont("helvetica", "normal");
    doc.text([
        `Plot No: ${formValues.plotNumber} | Location: ${formValues.companyLocation}`,
        `P.O. Box: ${formValues.pobox} | Email: ${formValues.companyEmail}`,
        `TIN: ${formValues.tinNumber} | Contact: ${formValues.companyPhone}`
    ], 14, 32);

    doc.setDrawColor(59, 130, 246); doc.setLineWidth(1); doc.line(14, 48, pageWidth - 14, 48);

    // DOCUMENT METADATA
    doc.setFontSize(16); doc.setTextColor(15, 23, 42); doc.setFont("helvetica", "bold");
    doc.text("COMMERCIAL QUOTATION", 14, 60);

    doc.setFontSize(10); doc.setFont("helvetica", "normal");
    doc.text(`Reference No: ${formValues.estimateUid}`, pageWidth - 70, 60);
    doc.text(`Date of Issue: ${format(new Date(formValues.issueDate), 'PPP')}`, pageWidth - 70, 66);
    doc.text(`Valid Until: ${format(new Date(formValues.validUntil), 'PPP')}`, pageWidth - 70, 72);

    // BILLING
    const client = customers.find(c => String(c.id) === formValues.customerId);
    doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.text("PREPARED FOR:", 14, 85);
    doc.setFont("helvetica", "normal"); doc.text([client?.name || 'Valued Client', `Phone: ${client?.phone || 'N/A'}`, `Address: ${client?.address || 'N/A'}`], 14, 91);

    // TABLE
    autoTable(doc, {
        startY: 110,
        head: [['Spec Description', 'Application Area', 'Qty', 'Unit Rate', 'Total Amount']],
        body: watchedItems.map(i => [i.description, i.applicationArea || 'N/A', i.quantity, `${i.unitRate.toLocaleString()} ${currentCurrency}`, `${(i.quantity * i.unitRate).toLocaleString()} ${currentCurrency}`]),
        headStyles: { fillColor: [15, 23, 42], textColor: 255 },
        styles: { fontSize: 9, cellPadding: 5 },
        foot: [[{ content: 'GRAND TOTAL VALUE', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold' } }, { content: `${totals.grossPrice.toLocaleString()} ${currentCurrency}`, styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } }]]
    });

    // PAYMENT
    let finalY = (doc as any).lastAutoTable.finalY + 15;
    doc.setFontSize(10); doc.setFont("helvetica", "bold"); doc.text("PAYMENT INSTRUCTIONS:", 14, finalY);
    doc.setFillColor(248, 250, 252); doc.rect(14, finalY + 4, pageWidth - 28, 25, 'F');
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text([`• Payable to: ${formValues.chequesPayableTo}`, `• Bank Info: ${formValues.bankDetails}`, `• Mobile Money: ${formValues.momoDetails || 'N/A'}`], 20, finalY + 12);

    // FOOTER
    doc.setFontSize(9); doc.setFont("helvetica", "italic"); doc.text(`Inquiries: ${formValues.inquiryContact}`, 14, 255);
    doc.setFontSize(11); doc.setFont("helvetica", "normal"); doc.text("Yours Sincerely,", 14, 270);
    doc.setFont("helvetica", "bold"); doc.text(businessInfo.name, 14, 280);
    doc.setFontSize(8); doc.text("Authorized Signature & Stamp", 14, 285);

    doc.save(`${formValues.estimateUid}_Quotation.pdf`);
  };

  const onSubmit: SubmitHandler<EstimateForm> = async (values) => {
    setIsSubmitting(true);
    try {
      const { data: estData, error: estErr } = await supabase.from('estimates').insert({
        tenant_id: tenantId, customer_id: values.customerId, estimate_uid: values.estimateUid,
        title: values.title, status: 'PENDING', currency_code: values.currencyCode,
        total_amount: totals.grossPrice, valid_until: values.validUntil,
        client_name: customers.find(c => String(c.id) === values.customerId)?.name,
        metadata: { plot: values.plotNumber, bank: values.bankDetails, momo: values.momoDetails, inquiries: values.inquiryContact, issue_date: values.issueDate }
      }).select('id').single();

      if (estErr) throw estErr;

      await supabase.from('estimate_line_items').insert(values.items.map(item => ({
        estimate_id: estData.id, description: item.description, application_area: item.applicationArea,
        quantity: item.quantity, unit_cost: item.unitCost, unit_price: item.unitRate, total: Money.multiply(item.unitRate, item.quantity)
      })));
      
      toast.success("Protocol Dispatched Successfully");
      router.refresh();
    } catch (err: any) { toast.error(err.message); } finally { setIsSubmitting(false); }
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-1000 max-w-[1600px] mx-auto pb-24">
      
      {/* MASTER HEADER */}
      <Card className="border-none shadow-2xl rounded-[3.5rem] overflow-hidden bg-slate-900 text-white relative">
        <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12"><ShieldCheck size={260} /></div>
        <CardContent className="p-12 flex flex-col lg:flex-row justify-between items-center gap-12 relative z-10">
            <div className="flex items-center gap-10">
                <div className="p-8 bg-blue-600 rounded-[2.5rem] shadow-xl transform hover:rotate-3 transition-transform">
                    <PenTool size={56} className="text-white" />
                </div>
                <div>
                    <h1 className="text-5xl font-black tracking-tighter uppercase leading-none italic">Estimate Terminal</h1>
                    <div className="flex items-center gap-4 mt-4">
                        <Badge className="bg-blue-500/20 text-blue-400 border-none font-black text-[11px] tracking-[0.4em] px-5 py-2 uppercase rounded-full">BBU1_SOVEREIGN_NODE</Badge>
                        <span className="text-slate-500 text-[11px] font-black uppercase tracking-widest flex items-center gap-2"><Clock size={14}/> AUTOMATED SEQUENCING ACTIVE</span>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center gap-6 bg-white/5 backdrop-blur-3xl p-8 rounded-[3rem] border border-white/10 shadow-inner">
                <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Live Yield Margin</p>
                    <p className={`text-5xl font-black tabular-nums ${totals.margin >= 25 ? 'text-emerald-400' : 'text-orange-400'}`}>{totals.margin.toFixed(1)}%</p>
                </div>
                <div className="w-[2px] h-16 bg-white/10 mx-6 rounded-full" />
                <div className="space-y-2">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Reporting Currency</p>
                    <Select value={currentCurrency} onValueChange={(v) => setValue('currencyCode', v)}>
                        <SelectTrigger className="w-44 h-16 bg-blue-600 border-none text-2xl font-black rounded-2xl shadow-xl"><SelectValue /></SelectTrigger>
                        <SelectContent className="font-black">
                            {currencies.map(c => <SelectItem key={c.code} value={c.code} className="text-lg">{c.code} - {c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 xl:grid-cols-12 gap-10">
        
        {/* LEFT: STATIONERY */}
        <div className="xl:col-span-4 space-y-8">
            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3"><Building2 size={16} className="text-blue-600"/> 1. Stationery Context</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Reference Number (Auto)</Label>
                        <Input {...register("estimateUid")} className="h-12 font-black border-slate-200 rounded-xl bg-slate-50" readOnly />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Issue Date</Label>
                            <Input type="date" {...register("issueDate")} className="h-12 font-black border-slate-200 rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expiry Date</Label>
                            <Input type="date" {...register("validUntil")} className="h-12 font-black border-slate-200 rounded-xl text-orange-600" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Plot No / Address</Label>
                        <Input {...register("plotNumber")} className="h-12 font-black border-slate-200 rounded-xl" placeholder="e.g. Plot 19, Stanbic Mall" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">P.O Box</Label><Input {...register("pobox")} className="h-12 font-black border-slate-200 rounded-xl" /></div>
                        <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">TIN</Label><Input {...register("tinNumber")} className="h-12 font-black border-slate-200 rounded-xl" /></div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-xl rounded-[2.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50 border-b p-8">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.3em] text-slate-500 flex items-center gap-3"><Landmark size={16} className="text-blue-600"/> 2. Payment Protocol</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cheques Payable To</Label><Input {...register("chequesPayableTo")} className="h-12 font-black border-slate-200 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Bank Details</Label><Textarea {...register("bankDetails")} className="h-24 font-bold border-slate-200 rounded-xl text-xs" /></div>
                    <div className="space-y-2"><Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Mobile Money Merchant</Label><div className="relative"><Smartphone className="absolute left-3 top-3.5 h-5 w-5 text-slate-300"/><Input {...register("momoDetails")} className="h-12 font-black border-slate-200 rounded-xl pl-11" placeholder="Airtel/MTN Code" /></div></div>
                </CardContent>
            </Card>
        </div>

        {/* RIGHT: ITEMS GRID */}
        <div className="xl:col-span-8 space-y-8">
            <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="p-10 border-b bg-slate-50/50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Target Client Entity</Label>
                            <select {...register("customerId")} className="w-full h-16 px-6 border-2 border-slate-200 rounded-[1.25rem] bg-white text-base font-black focus:ring-4 transition-all outline-none">
                                <option value="">Select Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id.toString()}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-3">
                            <Label className="text-[11px] font-black uppercase text-slate-400 tracking-[0.2em] ml-2">Commercial Protocol Title</Label>
                            <Input {...register("title")} className="h-16 border-2 border-slate-200 rounded-[1.25rem] font-black text-xl" />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-900 h-20 border-none">
                            <TableRow className="hover:bg-slate-900">
                                <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-10">Specification</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400">Area</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center">Qty</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Internal Cost</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right">Client Rate</TableHead>
                                <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right pr-10">SubTotal</TableHead>
                                <TableHead className="w-16"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => (
                                <TableRow key={field.id} className="hover:bg-blue-50/40 border-b border-slate-100 transition-all group">
                                    <TableCell className="pl-10 py-8"><Input {...register(`items.${index}.description` as const)} className="border-none font-black text-slate-900 text-xl p-0 bg-transparent focus-visible:ring-0" placeholder="Product..." /></TableCell>
                                    <TableCell><Input {...register(`items.${index}.applicationArea` as const)} className="h-11 border-2 border-slate-100 rounded-xl font-bold text-[10px] uppercase bg-white focus:border-blue-400" placeholder="e.g. PRIMER" /></TableCell>
                                    <TableCell><Input type="number" {...register(`items.${index}.quantity` as const)} className="h-11 text-center font-black border-2 border-slate-100 rounded-xl w-20" /></TableCell>
                                    <TableCell><Input type="number" step="0.01" {...register(`items.${index}.unitCost` as const)} className="h-11 text-right font-black border-2 border-slate-100 rounded-xl text-slate-300 w-28" /></TableCell>
                                    <TableCell><Input type="number" step="0.01" {...register(`items.${index}.unitRate` as const)} className="h-11 text-right font-black border-2 border-blue-200 rounded-xl text-blue-600 bg-blue-50/20 w-32" /></TableCell>
                                    <TableCell className="text-right pr-10 font-black text-slate-900 text-2xl tabular-nums">{(Money.multiply(watchedItems[index]?.unitRate || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}</TableCell>
                                    <TableCell><Button variant="ghost" onClick={() => remove(index)} className="text-slate-200 hover:text-red-500 rounded-full opacity-0 group-hover:opacity-100"><Trash2 size={24}/></Button></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <div className="p-10 bg-slate-50/50 border-t flex justify-between items-center">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', applicationArea: '', quantity: 1, unitCost: 0, unitRate: 0 })} className="h-16 px-12 font-black text-sm uppercase gap-4 bg-white border-2 border-slate-200 rounded-2xl hover:bg-slate-900 hover:text-white shadow-xl transition-all"><Plus size={24}/> Add Specification</Button>
                        <Button type="button" onClick={generateProfessionalPDF} className="h-16 px-10 font-black bg-slate-900 text-white rounded-2xl shadow-xl gap-3 hover:bg-blue-600 transition-all"><Printer size={20}/> PREVIEW & PRINT</Button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-end">
                <Card className="bg-gradient-to-br from-blue-700 to-indigo-950 text-white rounded-[3rem] p-10 shadow-2xl flex gap-8 items-start relative overflow-hidden">
                    <TrendingUp size={120} className="absolute -right-5 -bottom-5 opacity-10 rotate-12" />
                    <div className="p-5 bg-white/10 rounded-3xl backdrop-blur-md border border-white/10"><TrendingUp size={32}/></div>
                    <div className="space-y-3 relative z-10">
                        <h4 className="font-black uppercase tracking-[0.2em] text-blue-300">Financial Seal</h4>
                        <p className="text-xs font-bold text-blue-100 leading-relaxed">The gross protocol value has been verified for liquidity compliance. This document is a binding commercial offer.</p>
                    </div>
                </Card>

                <div className="space-y-6">
                    <div className="flex justify-between items-end border-b-8 border-slate-200 pb-6 mb-4">
                        <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Gross Quote Value</span>
                        <div className="text-right">
                            <p className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums leading-none">{totals.grossPrice.toLocaleString()}</p>
                            <span className="text-xl font-black text-blue-600 uppercase tracking-[0.3em] mt-2 block">{currentCurrency}</span>
                        </div>
                    </div>
                    <Button disabled={isSubmitting} type="submit" className="w-full h-24 bg-blue-600 hover:bg-slate-900 text-white font-black uppercase tracking-[0.3em] text-2xl rounded-[2rem] shadow-2xl transition-all group">
                        {isSubmitting ? <Loader2 className="animate-spin h-10 w-10" /> : <div className="flex items-center gap-6"><Send size={32}/> COMMIT SPECIFICATION</div>}
                    </Button>
                </div>
            </div>
        </div>
      </form>
    </div>
  );
}