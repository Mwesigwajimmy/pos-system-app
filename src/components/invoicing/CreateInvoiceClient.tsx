"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, Calendar, User, 
  AlertCircle, ArrowLeft, Receipt, Landmark, 
  Globe, Ship, RefreshCcw, Repeat, FileText, CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import toast from 'react-hot-toast';

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
  exchangeRate: z.coerce.number().min(0.000001, "Manual rate required"), 
  originCountry: z.string().min(2, "Required for Compliance"),
  destinationCountry: z.string().min(2, "Required for Compliance"),
  incoterm: z.string().default('CIF'),
  isRecurring: z.boolean().default(false),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid issue date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    hsCode: z.string().optional(), 
    quantity: z.coerce.number().min(0.001, "Qty must be greater than 0"),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
    taxRate: z.coerce.number().min(0).max(100, "Tax cannot exceed 100%").default(0),
  })).min(1, "You must add at least one line item"),
}).refine((data) => {
  return new Date(data.dueDate) >= new Date(data.issueDate);
}, {
  message: "Due date cannot be earlier than the issue date",
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

interface CreateInvoiceClientProps {
  tenantId: string;
  userId: string;
  locale: string;
}

interface CustomerOption {
  id: string;
  name: string;
  email?: string;
  vat_number?: string;
}

export default function CreateInvoiceClient({ tenantId, userId, locale }: CreateInvoiceClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [businessDNA, setBusinessDNA] = useState({ currency: 'USD', taxRate: 0, country: 'UG' });
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    let isMounted = true;
    const fetchEnterpriseContext = async () => {
      try {
        const [tenantRes, taxRes, customerRes] = await Promise.all([
          supabase.from('tenants').select('currency_code, country_code').eq('id', tenantId).single(),
          supabase.from('tax_configurations').select('rate_percentage').eq('business_id', tenantId).eq('is_active', true).limit(1),
          supabase.from('customers').select('id, name, email, vat_number').or(`tenant_id.eq.${tenantId},business_id.eq.${tenantId}`).eq('is_active', true).order('name')
        ]);

        if (isMounted) {
          if (tenantRes.data) {
             setBusinessDNA({
                currency: tenantRes.data.currency_code || 'USD',
                taxRate: taxRes.data?.[0]?.rate_percentage || 0,
                country: tenantRes.data.country_code || 'UG'
             });
          }
          if (customerRes.data) {
            setCustomers(customerRes.data.map((c: any) => ({ ...c, id: String(c.id) })));
          }
        }
      } catch (err: any) {
        console.error("Critical Data Fault:", err);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    };

    if (tenantId) fetchEnterpriseContext();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  const { 
    register, control, handleSubmit, watch, setValue,
    formState: { errors } 
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      currency: businessDNA.currency,
      exchangeRate: 1.0,
      originCountry: businessDNA.country,
      destinationCountry: '',
      incoterm: 'CIF',
      isRecurring: false,
      issueDate: getLocalDateString(),
      dueDate: getFutureDateString(14),
      notes: '', 
      items: [{ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate }]
    },
    mode: 'onBlur'
  });

  useEffect(() => {
     if (businessDNA.currency) {
        setValue('currency', businessDNA.currency);
        setValue('originCountry', businessDNA.country);
        setValue('items.0.taxRate', businessDNA.taxRate);
     }
  }, [businessDNA, setValue]);

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
      const lineSubtotal = Money.multiply(price, qty);
      const lineTax = Money.calculateTax(lineSubtotal, taxRate);
      subtotal += lineSubtotal;
      taxTotal += lineTax;
    });

    return {
      subtotal: Money.round(subtotal),
      taxTotal: Money.round(taxTotal),
      grandTotal: Money.round(subtotal + taxTotal)
    };
  }, [items]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code, minimumFractionDigits: 0 }).format(val);

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
          const lineSub = Money.multiply(item.unitPrice, item.quantity);
          return {
            invoice_id: createdInvoiceId!,
            tenant_id: tenantId,
            business_id: tenantId,
            description: item.description,
            hs_code: item.hsCode,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            tax_amount: Money.calculateTax(lineSub, item.taxRate),
            total: Money.round(lineSub + Money.calculateTax(lineSub, item.taxRate))
          };
      });

      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

      if (itemsError) {
        await supabase.from('invoices').delete().eq('id', createdInvoiceId);
        throw new Error(`Data Synchronization Failure: ${itemsError.message}`);
      }

      toast.success("Fiscal Record Finalized");
      router.push(`/${locale}/invoicing/to-be-issued`);
      router.refresh();

    } catch (error: any) {
      setSubmitError(error.message || "Failed to finalize transaction.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-screen bg-slate-50/50">
      <div className="max-w-[1400px] mx-auto py-12 px-6 space-y-10 animate-in fade-in duration-700">
        
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-slate-200 pb-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-blue-600 font-bold text-xs uppercase tracking-[0.2em]">
              <Receipt size={16} /> Fiscal Documentation
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">New Tax Invoice</h1>
            <p className="text-sm font-semibold text-slate-500">Execute professional billing records with integrated trade compliance.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            disabled={isSubmitting} 
            className="h-12 px-8 border-slate-200 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white shadow-sm"
          >
            <ArrowLeft size={16} className="mr-2" /> Discard Draft
          </Button>
        </header>

        {submitError && (
          <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-900 shadow-sm animate-in slide-in-from-top-2">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-600" />
            <p className="text-sm font-bold uppercase tracking-tight">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Governance & Compliance</h2>
          </div>

          <Card className="border-slate-200 shadow-2xl shadow-slate-200/50 rounded-3xl overflow-hidden bg-white border-none">
            <CardContent className="p-8 md:p-12 space-y-12">
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Counterparty Name</Label>
                  <select 
                    {...register("customerId")} 
                    disabled={isLoadingCustomers || isSubmitting}
                    className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all outline-none border-none shadow-inner"
                  >
                    <option value="">{isLoadingCustomers ? "Syncing Directory..." : "Select Transaction Party"}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {errors.customerId && <p className="text-red-500 text-[10px] font-black uppercase mt-2 ml-1">{errors.customerId.message}</p>}
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Logistics Corridor (ISO)</Label>
                  <div className="flex gap-3">
                    <input {...register("originCountry")} placeholder="ORG" className="w-1/2 h-12 px-4 border-none rounded-xl bg-slate-50/50 text-sm font-black text-center shadow-inner" />
                    <input {...register("destinationCountry")} placeholder="DST" className="w-1/2 h-12 px-4 border-none rounded-xl bg-slate-50/50 text-sm font-black text-center shadow-inner" />
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Commercial Incoterm</Label>
                  <select {...register("incoterm")} className="w-full h-12 px-4 border-none rounded-xl bg-slate-50/50 text-sm font-black shadow-inner outline-none">
                    {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                  </select>
                </div>

                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] ml-1">Automated Schedule</Label>
                  <div className="flex items-center h-12 px-5 border-none rounded-xl bg-slate-50/50 justify-between shadow-inner">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Recurring?</span>
                    <input type="checkbox" {...register("isRecurring")} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-0" />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-blue-50/50 rounded-3xl border border-blue-100/50 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-3">
                  <Label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">Monetary Denomination</Label>
                  <select {...register("currency")} className="w-full h-12 px-4 border-none rounded-xl bg-white text-sm font-black shadow-sm outline-none">
                    {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                  </select>
                </div>

                {selectedCurrency !== businessDNA.currency && (
                  <div className="space-y-3 animate-in fade-in duration-300">
                    <Label className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-2">
                      <RefreshCcw size={12} /> Valuation Rate
                    </Label>
                    <div className="flex items-center gap-4">
                      <input type="number" step="0.0001" {...register("exchangeRate")} className="w-full h-12 px-4 border-none rounded-xl bg-white text-sm font-black shadow-sm" />
                      <span className="text-[10px] font-black text-slate-400 uppercase">{businessDNA.currency} Base</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-5">
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">Issuance Date</Label>
                    <input type="date" {...register("issueDate")} className="w-full h-12 px-4 border-none rounded-xl bg-white text-xs font-black shadow-sm" />
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[10px] font-black text-blue-900/40 uppercase tracking-widest">Maturity Date</Label>
                    <input type="date" {...register("dueDate")} className="w-full h-12 px-4 border-none rounded-xl bg-white text-xs font-black shadow-sm" />
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Line Item Detail</h2>
                </div>

                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-xl shadow-slate-200/20 bg-white">
                  <ScrollArea className="w-full">
                    <Table>
                      <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                        <TableRow className="h-14 border-none hover:bg-transparent">
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 pl-8 tracking-widest">Operational Detail</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center w-28 tracking-widest">Qty</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right w-40 tracking-widest">Rate (Unit)</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 text-center w-28 tracking-widest">Tax %</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-slate-400 text-right pr-8 w-44 tracking-widest">Line Total</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fields.map((field, index) => {
                          const qty = items?.[index]?.quantity || 0;
                          const price = items?.[index]?.unitPrice || 0;
                          const lineTotal = Money.multiply(Number(price), Number(qty));

                          return (
                            <TableRow key={field.id} className="border-b border-slate-50 hover:bg-slate-50/30 transition-all">
                              <TableCell className="p-6 pl-8 space-y-3 align-top">
                                <Input {...register(`items.${index}.description` as const)} placeholder="Enter full service/product description..." className="h-12 border-none bg-slate-50/50 rounded-xl font-bold text-sm shadow-inner" />
                                <div className="flex gap-2">
                                  <Badge variant="outline" className="bg-blue-50/50 border-blue-100 text-blue-600 font-black text-[9px] px-3 py-1 uppercase rounded-md tracking-tighter">Tariff Ref</Badge>
                                  <Input {...register(`items.${index}.hsCode` as const)} placeholder="HS-CODE" className="h-8 border-none bg-slate-50/30 rounded-lg text-[10px] font-black w-32 shadow-inner" />
                                </div>
                              </TableCell>
                              <TableCell className="p-6 align-top">
                                <Input type="number" step="0.01" {...register(`items.${index}.quantity` as const)} className="h-12 border-none bg-slate-50/50 rounded-xl text-center font-black shadow-inner" />
                              </TableCell>
                              <TableCell className="p-6 align-top">
                                <div className="relative">
                                  <span className="absolute left-4 top-4 text-[10px] font-black text-slate-300">{currencyMeta.symbol}</span>
                                  <Input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const)} className="h-12 border-none bg-slate-50/50 rounded-xl pl-8 text-right font-black shadow-inner" />
                                </div>
                              </TableCell>
                              <TableCell className="p-6 align-top">
                                <Input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="h-12 border-none bg-slate-100/50 rounded-xl text-center font-black shadow-inner" />
                              </TableCell>
                              <TableCell className="p-6 text-right align-top font-black text-slate-900 text-base tabular-nums pt-9">
                                {formatCurrency(lineTotal)}
                              </TableCell>
                              <TableCell className="p-6 text-center align-top pt-8">
                                <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-200 hover:text-red-500 h-10 w-10 hover:bg-red-50 rounded-xl">
                                  <Trash2 size={20} />
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                  <div className="p-8 bg-slate-50/50 border-t border-slate-100 flex justify-between items-center">
                    <Button type="button" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate })} className="bg-white border-blue-600 border-2 text-blue-600 font-black h-12 px-8 rounded-2xl hover:bg-blue-600 hover:text-white transition-all gap-3 shadow-lg shadow-blue-600/5">
                      <Plus size={18} /> Append Transaction Entry
                    </Button>
                    <div className="flex items-center gap-3 text-slate-400 font-black text-[10px] uppercase tracking-[0.2em]">
                      <CheckCircle2 size={16} className="text-emerald-500" /> Distributed Ledger Active
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 pt-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                    <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Financial Footnotes</h2>
                  </div>
                  <Textarea 
                    {...register("notes")} 
                    className="w-full p-6 border-none rounded-3xl text-sm min-h-[220px] bg-slate-50/50 shadow-inner font-bold text-slate-600 placeholder:text-slate-300" 
                    placeholder="Specify bank routing information, contractual terms, or regulatory declarations..."
                  />
                </div>

                <div className="space-y-8">
                  <Card className="bg-slate-900 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden p-10 space-y-10">
                    <div className="space-y-6">
                      <div className="flex justify-between items-center text-slate-500 uppercase tracking-widest text-[10px] font-black">
                        <span>Operational Subtotal</span> 
                        <span className="text-white text-sm">{formatCurrency(totals.subtotal)}</span>
                      </div>
                      <div className="flex justify-between items-center text-blue-400 uppercase tracking-widest text-[10px] font-black">
                        <span>Tax Obligation Total</span> 
                        <span className="text-base">+{formatCurrency(totals.taxTotal)}</span>
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-10 flex justify-between items-end">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Total Valuation</span>
                        <h4 className="text-5xl font-black text-white tracking-tighter tabular-nums">
                          {formatCurrency(totals.grandTotal)}
                        </h4>
                      </div>
                      <Badge className="bg-blue-600 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border-none mb-2">Net Balance</Badge>
                    </div>

                    <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full h-18 bg-white hover:bg-blue-50 text-slate-900 font-black uppercase tracking-[0.2em] text-sm rounded-3xl shadow-xl transition-all active:scale-[0.98] disabled:opacity-50 py-8 flex gap-4"
                    >
                      {isSubmitting ? (
                        <><Loader2 className="animate-spin h-6 w-6" /> Syncing Protocol</>
                      ) : (
                        <><Save size={20} /> Authorize & Post Invoice</>
                      )}
                    </Button>
                  </Card>

                  <div className="p-8 bg-amber-50/50 border border-amber-100 rounded-3xl flex items-start gap-5">
                    <div className="p-3 bg-amber-100 text-amber-700 rounded-2xl">
                      <AlertCircle size={20} />
                    </div>
                    <div className="space-y-1">
                      <h5 className="font-black text-amber-900 text-xs uppercase tracking-tight">Audit Confirmation</h5>
                      <p className="text-[11px] font-bold text-amber-800 leading-relaxed">
                        Authorized users are responsible for the accuracy of HS-Codes and Tax nexus. Financial entries are locked upon posting to the corporate ledger.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <footer className="text-center py-12 opacity-30">
            <div className="flex items-center justify-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.5em]">
              <FileText size={14} /> System Node ID: INV-CORP-A-01
            </div>
          </footer>
        </form>
      </div>
      <ScrollBar />
    </ScrollArea>
  );
}