"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  Calendar, Receipt, Landmark, Globe, Ship, RefreshCcw, Repeat, FileText, CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from "@/components/ui/dialog";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, quantity: number) => {
    return Math.round((amount * quantity + Number.EPSILON) * 100) / 100;
  },
  calculateTax: (amount: number, rate: number) => {
    return Math.round((amount * (rate / 100) + Number.EPSILON) * 100) / 100;
  }
};

const getLocalDateString = () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getFutureDateString = (daysToAdd: number) => {
  const date = new Date();
  date.setDate(date.getDate() + daysToAdd);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  exchangeRate: z.coerce.number().min(0.000001, "Valid rate required"), 
  originCountry: z.string().min(2, "Required for Compliance"),
  destinationCountry: z.string().min(2, "Required for Compliance"),
  incoterm: z.string().default('CIF'),
  isRecurring: z.boolean().default(false),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    hsCode: z.string().optional(), 
    quantity: z.coerce.number().min(0.001, "Min qty > 0"), 
    unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
    taxRate: z.coerce.number().min(0).max(100).default(0),
  })).min(1, "Add at least one item"),
}).refine((data) => {
  return new Date(data.dueDate) >= new Date(data.issueDate);
}, {
  message: "Due date cannot be before issue date",
  path: ["dueDate"],
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const CURRENCIES = [
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'UGX', symbol: 'USh', locale: 'en-UG' },
  { code: 'KES', symbol: 'KSh', locale: 'en-KE' },
  { code: 'AED', symbol: 'Dh', locale: 'ar-AE' },
];

const INCOTERMS = ['EXW', 'FOB', 'CIF', 'DDP', 'DAP'];

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  onSuccess?: () => void; 
}

interface CustomerOption {
  id: string;
  name: string;
  email?: string;
}

export default function CreateInvoiceModal({ isOpen, onClose, tenantId, userId, onSuccess }: CreateInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [businessConfig, setBusinessConfig] = useState<{currency: string, taxRate: number, country: string}>({ 
    currency: 'UGX', taxRate: 0, country: 'UG' 
  });
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchOnboardingDNA = async () => {
      try {
        const [tenantRes, taxRes, customerRes] = await Promise.all([
          supabase.from('tenants').select('currency_code, country_code').eq('id', tenantId).single(),
          supabase.from('tax_configurations').select('rate_percentage').eq('business_id', tenantId).eq('is_active', true).limit(1),
          supabase.from('customers').select('id, name, email').or(`tenant_id.eq.${tenantId},business_id.eq.${tenantId}`).eq('is_active', true).order('name')
        ]);

        if (isMounted) {
          if (tenantRes.data) {
            setBusinessConfig({
              currency: tenantRes.data.currency_code || 'UGX',
              taxRate: taxRes.data?.[0]?.rate_percentage || 0,
              country: tenantRes.data.country_code || 'UG'
            });
          }
          if (customerRes.data) {
            setCustomers(customerRes.data.map((c: any) => ({ ...c, id: String(c.id) })));
          }
        }
      } catch (err: any) {
        console.error("Critical System Fault:", err.message);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    };

    fetchOnboardingDNA();
    document.body.style.overflow = 'hidden';
    return () => { 
      isMounted = false; 
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, tenantId, supabase]);

  const { 
    register, control, handleSubmit, watch, reset, setValue,
    formState: { errors } 
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      currency: businessConfig.currency,
      exchangeRate: 1.0,
      originCountry: businessConfig.country,
      destinationCountry: '',
      incoterm: 'CIF',
      isRecurring: false,
      issueDate: getLocalDateString(),
      dueDate: getFutureDateString(14),
      notes: '',
      items: [{ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessConfig.taxRate }]
    },
    mode: 'onBlur'
  });

  useEffect(() => {
    if (businessConfig.currency) {
      setValue('currency', businessConfig.currency);
      setValue('originCountry', businessConfig.country);
      setValue('items.0.taxRate', businessConfig.taxRate);
    }
  }, [businessConfig, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  const items = watch("items");
  const selectedCurrency = watch("currency");
  const currencyMeta = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  const totals = useMemo(() => {
    const currentItems = items || [];
    let subtotal = 0;
    let taxTotal = 0;

    currentItems.forEach(item => {
      const qty = Number(item.quantity) || 0;
      const price = Number(item.unitPrice) || 0;
      const taxRate = Number(item.taxRate) || 0;

      const lineTotal = Money.multiply(price, qty);
      const lineTax = Money.calculateTax(lineTotal, taxRate);

      subtotal += lineTotal;
      taxTotal += lineTax;
    });

    return {
      subtotal: Money.round(subtotal),
      taxTotal: Money.round(taxTotal),
      grandTotal: Money.round(subtotal + taxTotal)
    };
  }, [items]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code }).format(val);

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    let createdInvoiceId: string | null = null;

    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          business_id: tenantId,
          customer_id: data.customerId,
          currency_code: data.currency,
          exchange_rate_at_issue: data.exchangeRate, 
          origin_country_code: data.originCountry,
          destination_country_code: data.destinationCountry,
          incoterm: data.incoterm,
          is_recurring: data.isRecurring,
          issue_date: data.issueDate,
          due_date: data.dueDate,
          notes: data.notes,
          subtotal: totals.subtotal,
          tax_amount: totals.taxTotal,
          total: totals.grandTotal,
          balance_due: totals.grandTotal,
          status: 'ISSUED',
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (invoiceError) throw new Error(invoiceError.message);
      createdInvoiceId = invoiceData.id;

      const lineItems = data.items.map(item => {
        const lineSubtotal = Money.multiply(item.unitPrice, item.quantity);
        return {
            invoice_id: createdInvoiceId!,
            tenant_id: tenantId,
            business_id: tenantId,
            description: item.description,
            hs_code: item.hsCode,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            tax_amount: Money.calculateTax(lineSubtotal, item.taxRate),
            total: lineSubtotal + Money.calculateTax(lineSubtotal, item.taxRate)
        };
      });

      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

      if (itemsError) {
        await supabase.from('invoices').delete().eq('id', createdInvoiceId);
        throw new Error(`Fiscal Ledger Synchronisation Failure: ${itemsError.message}`);
      }

      toast.success("Fiscal Document Finalized");
      if (onSuccess) onSuccess();
      onClose();
      router.refresh();

    } catch (error: any) {
      setSubmitError(error.message || "Financial handshake failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-12 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[90vh] flex flex-col bg-white rounded-[2rem] shadow-[0_32px_64px_-15px_rgba(0,0,0,0.3)] overflow-hidden border border-white/20">
        
        <header className="flex items-center justify-between px-10 py-8 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                <Receipt className="text-white w-7 h-7" />
            </div>
            <div className="space-y-0.5">
                <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                  Fiscal Issuance Engine
                </h2>
                <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <CheckCircle2 size={12} className="text-emerald-500" /> Accounting Integrity Mode
                </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-all bg-slate-50 p-3 rounded-2xl border border-slate-100 hover:shadow-lg">
            <X size={20} />
          </button>
        </header>

        <ScrollArea className="flex-1 bg-white">
          <div className="p-10 space-y-12">
            {submitError && (
              <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-900 animate-in slide-in-from-top-2">
                <AlertCircle className="w-6 h-6 shrink-0 text-red-600" />
                <p className="text-xs font-black uppercase tracking-tight">{submitError}</p>
              </div>
            )}

            <form id="invoice-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-12">
              
              <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Counterparty & Compliance</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Client Entity</Label>
                  <select {...register("customerId")} className="w-full h-12 px-5 border-none rounded-2xl bg-slate-50 text-sm font-bold shadow-inner focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                    <option value="">{isLoadingCustomers ? "Syncing..." : "Select Transaction Party"}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Trade Corridor (Origin/Dest)</Label>
                  <div className="flex gap-3">
                      <input {...register("originCountry")} placeholder="ORG" className="w-1/2 h-12 px-4 border-none rounded-2xl bg-slate-50 text-sm font-black text-center shadow-inner uppercase" />
                      <input {...register("destinationCountry")} placeholder="DST" className="w-1/2 h-12 px-4 border-none rounded-2xl bg-slate-50 text-sm font-black text-center shadow-inner uppercase" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Commercial Incoterm</Label>
                  <select {...register("incoterm")} className="w-full h-12 px-5 border-none rounded-2xl bg-slate-50 text-sm font-black shadow-inner outline-none">
                    {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Operational Logic</Label>
                  <div className="flex items-center h-12 px-5 border-none rounded-2xl bg-slate-50 justify-between shadow-inner">
                      <span className="text-[10px] font-black text-slate-500 uppercase">Recurring?</span>
                      <input type="checkbox" {...register("isRecurring")} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-0" />
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-900 rounded-[2.5rem] flex flex-wrap items-center gap-10 text-white shadow-2xl shadow-slate-900/20">
                  <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Billing Denomination</Label>
                      <select {...register("currency")} className="bg-white/10 border-none rounded-xl h-11 px-5 text-sm font-black outline-none shadow-sm">
                          {CURRENCIES.map(c => <option key={c.code} value={c.code} className="text-black font-bold">{c.code} ({c.symbol})</option>)}
                      </select>
                  </div>

                  {selectedCurrency !== businessConfig.currency && (
                      <div className="space-y-3 animate-in fade-in duration-500">
                          <Label className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em] flex items-center gap-2">
                              <RefreshCcw size={14} /> Valuation Rate
                          </Label>
                          <div className="flex items-center gap-4">
                              <input 
                                  type="number" 
                                  step="0.000001" 
                                  {...register("exchangeRate")} 
                                  className="bg-white/5 border border-white/10 text-white rounded-xl h-11 px-5 text-base font-black w-48 outline-none focus:border-blue-500 shadow-inner" 
                              />
                              <span className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">Per {businessConfig.currency}</span>
                          </div>
                      </div>
                  )}

                  <div className="ml-auto flex gap-8">
                      <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Fiscal Issue Date</Label>
                          <input type="date" {...register("issueDate")} className="bg-white/10 border-none rounded-xl h-11 px-5 text-xs font-black outline-none shadow-sm" />
                      </div>
                      <div className="space-y-3">
                          <Label className="text-[10px] font-black uppercase text-slate-500 tracking-[0.2em]">Maturity Date</Label>
                          <input type="date" {...register("dueDate")} className="bg-white/10 border-none rounded-xl h-11 px-5 text-xs font-black outline-none shadow-sm" />
                      </div>
                  </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                  <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Line Item Detail</h3>
                </div>

                <div className="rounded-[2rem] border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/20">
                  <Table>
                    <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                      <TableRow className="h-14 border-none hover:bg-transparent">
                        <TableHead className="px-8 font-black uppercase text-slate-400 text-[10px] tracking-widest">Description & Specification</TableHead>
                        <TableHead className="text-center w-28 font-black uppercase text-slate-400 text-[10px] tracking-widest">Qty</TableHead>
                        <TableHead className="text-right w-44 font-black uppercase text-slate-400 text-[10px] tracking-widest">Rate (Unit)</TableHead>
                        <TableHead className="text-center w-28 font-black uppercase text-slate-400 text-[10px] tracking-widest">Tax %</TableHead>
                        <TableHead className="px-8 text-right w-48 font-black uppercase text-slate-400 text-[10px] tracking-widest">Line Total</TableHead>
                        <TableHead className="w-16"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => {
                        const qty = items?.[index]?.quantity || 0;
                        const price = items?.[index]?.unitPrice || 0;
                        const lineTotal = Money.multiply(Number(price), Number(qty));

                        return (
                          <TableRow key={field.id} className="hover:bg-slate-50/30 transition-all border-b border-slate-50">
                            <TableCell className="p-6 pl-8 space-y-3 align-top">
                              <Input {...register(`items.${index}.description`)} placeholder="Operational detail..." className="h-12 border-none bg-slate-50/50 rounded-xl px-5 text-sm font-bold shadow-inner" />
                              <div className="flex gap-2 items-center">
                                <Badge variant="outline" className="bg-blue-50 border-blue-100 text-blue-600 font-black text-[9px] px-3 py-1 uppercase rounded-md tracking-tighter">HS-TARIFF</Badge>
                                <Input {...register(`items.${index}.hsCode`)} placeholder="CODE-REFERENCE" className="h-8 border-none bg-slate-50/30 rounded-lg px-3 text-[10px] font-black w-36 shadow-inner" />
                              </div>
                            </TableCell>
                            <TableCell className="p-6 align-top">
                              <Input type="number" step="0.001" {...register(`items.${index}.quantity`)} className="h-12 border-none bg-slate-50/50 rounded-xl text-center font-black shadow-inner" />
                            </TableCell>
                            <TableCell className="p-6 align-top">
                              <div className="relative">
                                <span className="absolute left-4 top-4 text-[10px] font-black text-slate-300">{currencyMeta.symbol}</span>
                                <Input type="number" step="0.01" {...register(`items.${index}.unitPrice`)} className="h-12 border-none bg-slate-50/50 rounded-xl pr-5 text-right font-black shadow-inner" />
                              </div>
                            </TableCell>
                            <TableCell className="p-6 align-top">
                              <Input type="number" step="0.1" {...register(`items.${index}.taxRate`)} className="h-12 border-none bg-slate-100 rounded-xl text-center font-black shadow-inner text-blue-600" />
                            </TableCell>
                            <TableCell className="px-8 py-9 text-right font-black text-slate-900 text-base tabular-nums">
                              {formatCurrency(lineTotal)}
                            </TableCell>
                            <TableCell className="p-6 text-center align-top pt-8">
                              <button type="button" onClick={() => remove(index)} className="text-slate-200 hover:text-red-500 transition-all p-2 hover:bg-red-50 rounded-lg">
                                <Trash2 size={20}/>
                              </button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                    <Button type="button" variant="outline" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessConfig.taxRate })} className="bg-white border-blue-600 border-2 text-blue-600 font-black h-12 px-8 rounded-2xl hover:bg-blue-600 hover:text-white transition-all gap-3 shadow-lg shadow-blue-600/5">
                      <Plus size={18} /> Append Transaction Entry
                    </Button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Financial Footnotes</h3>
                  </div>
                  <Textarea {...register("notes")} className="w-full p-6 border-none rounded-3xl text-sm h-44 bg-slate-50/50 shadow-inner font-bold text-slate-600 placeholder:text-slate-300 outline-none" placeholder="Specify settlement terms, bank routing, or contractual declarations..."></Textarea>
                </div>

                <div className="w-full space-y-6">
                  <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] p-10 space-y-10">
                     <div className="space-y-6">
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          <span>Operational Subtotal</span> 
                          <span className="text-white text-sm">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-black text-blue-400 uppercase tracking-widest">
                          <span>Fiscal Tax Liability</span> 
                          <span className="text-base">+{formatCurrency(totals.taxTotal)}</span>
                        </div>
                     </div>
                     <div className="pt-10 border-t border-white/10 flex justify-between items-end">
                       <div className="space-y-1">
                          <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Receivable</span>
                          <div className="text-5xl font-black tracking-tighter text-white tabular-nums">
                              {formatCurrency(totals.grandTotal)}
                          </div>
                       </div>
                       <Badge className="bg-blue-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border-none mb-2">Net Sum</Badge>
                     </div>
                  </Card>
                </div>
              </div>
            </form>
          </div>
          <ScrollBar />
        </ScrollArea>

        <footer className="px-10 py-8 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
            <FileText size={16} /> Audit Reference: SYS-TX-INV-01
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={onClose} type="button" className="flex-1 sm:flex-none px-10 h-14 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all">
                Discard
              </button>
              <button 
                type="submit" 
                form="invoice-modal-form" 
                disabled={isSubmitting} 
                className="flex-1 sm:flex-none px-14 h-14 text-xs font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-2xl hover:bg-blue-700 shadow-2xl shadow-blue-600/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3"
              >
                {isSubmitting ? <><Loader2 className="animate-spin h-5 w-5" /> Processing</> : <><Save className="w-5 h-5" /> Finalize Record</>}
              </button>
          </div>
        </footer>
      </div>
    </div>
  );
}