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

// UI Components
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from "@/components/ui/badge";
import toast from 'react-hot-toast';

// --- 1. Financial Utilities (Logic Preserved) ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, quantity: number) => {
    return Math.round((amount * quantity + Number.EPSILON) * 100) / 100;
  },
  calculateTax: (amount: number, rate: number) => {
    return Math.round((amount * (rate / 100) + Number.EPSILON) * 100) / 100;
  }
};

// --- 2. Date Utilities ---
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

// --- 3. Validation Schema ---
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

// --- 4. Configuration ---
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
        console.error("Data Fetch Error:", err);
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
        throw new Error(`Data Sync Error: ${itemsError.message}`);
      }

      toast.success("Invoice created successfully");
      router.push(`/${locale}/invoicing/to-be-issued`);
      router.refresh();

    } catch (error: any) {
      setSubmitError(error.message || "Failed to save invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-10 px-4 md:px-6 animate-in fade-in duration-500 bg-slate-50/30">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-6 border-b border-slate-200 pb-8">
        <div className="space-y-1">
            <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 rounded-lg shadow-sm">
                    <Receipt className="text-white w-7 h-7" />
                </div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                    Create Invoice
                </h1>
            </div>
            <p className="text-sm text-slate-500 font-medium ml-1">
                Generate professional billing documents with trade compliance.
            </p>
        </div>
        <Button variant="outline" onClick={() => router.back()} disabled={isSubmitting} className="font-semibold border-slate-200 h-10 px-6 bg-white">
          <ArrowLeft size={16} className="mr-2" /> Cancel
        </Button>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-800 shadow-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <p className="text-sm font-semibold">{submitError}</p>
        </div>
      )}

      {/* FORM START */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-20">
        <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-xl">
            <CardHeader className="bg-slate-50/50 border-b border-slate-200 p-6">
                <CardTitle className="text-base font-bold text-slate-700 flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    Configuration & Compliance
                </CardTitle>
            </CardHeader>
            <CardContent className="p-6 md:p-8 space-y-10">
                
                {/* 1. IDENTITY GRID */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">Client Name</Label>
                        <select 
                            {...register("customerId")} 
                            disabled={isLoadingCustomers || isSubmitting}
                            className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-semibold focus:ring-2 focus:ring-blue-600 transition-all outline-none"
                        >
                            <option value="">{isLoadingCustomers ? "Loading..." : "Select Client"}</option>
                            {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        {errors.customerId && <p className="text-red-500 text-[11px] font-bold mt-1 ml-1">{errors.customerId.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">Trade Origin/Destination</Label>
                        <div className="flex gap-2">
                            <input {...register("originCountry")} placeholder="From" className="w-1/2 h-10 px-3 border border-slate-200 rounded-lg text-sm font-mono font-bold" />
                            <input {...register("destinationCountry")} placeholder="To" className="w-1/2 h-10 px-3 border border-slate-200 rounded-lg text-sm font-mono font-bold" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">Incoterm</Label>
                        <select {...register("incoterm")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-bold">
                            {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight ml-1">Automation</Label>
                        <div className="flex items-center h-10 px-4 border border-slate-200 rounded-lg bg-white justify-between">
                            <span className="text-[11px] font-bold text-slate-500 uppercase">Recurring?</span>
                            <input type="checkbox" {...register("isRecurring")} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* 2. CURRENCY & DATES */}
                <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-8">
                    <div className="space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Invoice Currency</Label>
                        <select {...register("currency")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-bold outline-none">
                            {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                        </select>
                    </div>

                    {selectedCurrency !== businessDNA.currency && (
                        <div className="space-y-2 animate-in slide-in-from-top-1 duration-300">
                            <Label className="text-xs font-bold text-emerald-600 uppercase tracking-tight flex items-center gap-1.5">
                                <RefreshCcw size={12} /> Exchange Rate
                            </Label>
                            <div className="flex items-center gap-3">
                                <input type="number" step="0.0001" {...register("exchangeRate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-mono font-bold" />
                                <span className="text-[10px] font-bold text-slate-400 uppercase">{businessDNA.currency} Base</span>
                            </div>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Issue Date</Label>
                            <input type="date" {...register("issueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-mono font-semibold" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Due Date</Label>
                            <input type="date" {...register("dueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-mono font-semibold" />
                        </div>
                    </div>
                </div>

                {/* 3. ITEMIZED TABLE */}
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="text-[11px] font-bold uppercase text-slate-500 pl-6 h-12">Item Details</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase text-slate-500 text-center h-12 w-24">Qty</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase text-slate-500 text-right h-12 w-32">Rate</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase text-slate-500 text-center h-12 w-24">Tax %</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase text-slate-500 text-right h-12 pr-6 w-32">Total</TableHead>
                                <TableHead className="w-12"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const qty = items?.[index]?.quantity || 0;
                                const price = items?.[index]?.unitPrice || 0;
                                const lineTotal = Money.multiply(Number(price), Number(qty));

                                return (
                                    <TableRow key={field.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="p-4 pl-6 align-top space-y-2">
                                            <Input {...register(`items.${index}.description` as const)} placeholder="Service description..." className="h-9 font-semibold" />
                                            <Input {...register(`items.${index}.hsCode` as const)} placeholder="HS-Code (Optional)" className="h-7 text-[10px] font-mono bg-blue-50 border-none rounded-md" />
                                        </TableCell>
                                        <TableCell className="p-4 align-top">
                                            <Input type="number" step="0.01" {...register(`items.${index}.quantity` as const)} className="h-9 text-center font-mono font-bold" />
                                        </TableCell>
                                        <TableCell className="p-4 align-top">
                                            <div className="relative">
                                                <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-bold">{currencyMeta.symbol}</span>
                                                <Input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const)} className="h-9 pl-7 text-right font-mono font-bold" />
                                            </div>
                                        </TableCell>
                                        <TableCell className="p-4 align-top">
                                            <Input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="h-9 text-center font-mono font-bold bg-slate-50" />
                                        </TableCell>
                                        <TableCell className="p-4 text-right align-top pt-5 font-bold text-slate-900">
                                            {formatCurrency(lineTotal)}
                                        </TableCell>
                                        <TableCell className="p-4 text-center align-top pt-4">
                                            <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-300 hover:text-red-500 h-8 w-8">
                                                <Trash2 size={18} />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                        <Button type="button" variant="outline" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate })} className="bg-white border-blue-200 text-blue-600 font-bold h-9 px-6 rounded-lg hover:bg-blue-50">
                            <Plus size={16} className="mr-2" /> Add Item
                        </Button>
                        <div className="flex items-center gap-2 text-slate-400">
                            <CheckCircle2 size={14} className="text-emerald-500" />
                            <span className="text-[10px] font-bold uppercase tracking-tight">Ledger Logic Active</span>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col lg:flex-row gap-10 pt-4">
                    {/* NOTES */}
                    <div className="flex-1 space-y-2">
                        <Label className="text-xs font-bold text-slate-500 uppercase ml-1">Additional Notes</Label>
                        <textarea 
                            {...register("notes")} 
                            className="w-full p-4 border border-slate-200 rounded-xl text-sm min-h-[180px] focus:ring-1 focus:ring-blue-600 transition-all outline-none bg-white font-medium text-slate-700" 
                            placeholder="Add payment terms or bank details..."
                        />
                    </div>

                    {/* TOTALS & SUBMIT */}
                    <div className="w-full lg:w-[400px] space-y-6">
                        <Card className="bg-slate-900 text-white border-none shadow-lg rounded-xl overflow-hidden">
                            <CardHeader className="pb-4 border-b border-white/5">
                                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Invoice Summary</span>
                            </CardHeader>
                            <CardContent className="p-6 space-y-4">
                                <div className="flex justify-between items-center text-sm font-medium text-slate-400">
                                    <span>Subtotal</span> 
                                    <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                                </div>
                                <div className="flex justify-between items-center text-sm font-medium text-blue-400">
                                    <span>Total Tax</span> 
                                    <span className="font-mono">+{formatCurrency(totals.taxTotal)}</span>
                                </div>
                                <div className="border-t border-white/10 pt-6 flex justify-between items-end">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Total Amount</span>
                                    <span className="text-3xl font-bold text-white font-mono tracking-tighter">{formatCurrency(totals.grandTotal)}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Button 
                            type="submit" 
                            disabled={isSubmitting} 
                            className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-base rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="animate-spin mr-3 h-6 w-6" /> Saving...</>
                            ) : (
                                <><Save className="mr-3 h-5 w-5" /> Save & Issue Invoice</>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* FOOTNOTE */}
        <div className="text-center pt-8 opacity-40">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                <FileText size={12} /> System Reference: BBU1 INV-ENG-10
            </p>
        </div>
      </form>
    </div>
  );
}