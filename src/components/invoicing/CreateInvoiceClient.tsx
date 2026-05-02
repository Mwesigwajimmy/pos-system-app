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
  originCountry: z.string().min(2, "Required"),
  destinationCountry: z.string().min(2, "Required"),
  incoterm: z.string().default('CIF'),
  isRecurring: z.boolean().default(false),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description required"),
    hsCode: z.string().optional(), 
    quantity: z.coerce.number().min(0.001, "Min 0.001"),
    unitPrice: z.coerce.number().min(0, "Min 0"),
    taxRate: z.coerce.number().min(0).max(100).default(0),
  })).min(1, "Add at least one item"),
}).refine((data) => {
  return new Date(data.dueDate) >= new Date(data.issueDate);
}, {
  message: "Due date error",
  path: ["dueDate"],
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const CURRENCIES = [
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'UGX', symbol: 'Shs', locale: 'en-UG' },
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
        console.error("Fetch Error:", err);
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

      const lineItems = data.items.map(item => {
          const lineSub = Money.multiply(item.unitPrice, item.quantity);
          return {
            invoice_id: invoiceData.id,
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
      if (itemsError) throw new Error(itemsError.message);

      toast.success("Invoice created");
      router.push(`/${locale}/invoicing/history`);
      router.refresh();

    } catch (error: any) {
      setSubmitError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-10 px-8 space-y-10 animate-in fade-in duration-700">
        
        <header className="flex justify-between items-end border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create Invoice</h1>
            <p className="text-sm text-slate-500 font-medium">Draft and authorize professional billing documents.</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => router.back()} 
            className="h-10 px-6 border-slate-200 rounded-xl font-bold text-xs uppercase tracking-wider shadow-sm"
          >
            <ArrowLeft size={16} className="mr-2" /> Back
          </Button>
        </header>

        {submitError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-900 shadow-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <p className="text-xs font-bold uppercase">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            
            <div className="lg:col-span-2 space-y-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">General Information</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Customer Selection</Label>
                            <select 
                                {...register("customerId")} 
                                disabled={isLoadingCustomers}
                                className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-slate-50/50 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/10"
                            >
                                <option value="">Select Customer...</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Trade Origin/Destination</Label>
                            <div className="flex gap-2">
                                <input {...register("originCountry")} placeholder="ORG" className="w-1/2 h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50" />
                                <input {...register("destinationCountry")} placeholder="DST" className="w-1/2 h-11 px-4 border border-slate-200 rounded-xl text-sm font-bold bg-slate-50/50" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Billing Currency</Label>
                            <select {...register("currency")} className="w-full h-11 px-4 border border-slate-200 rounded-xl bg-white text-sm font-bold outline-none">
                                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                            </select>
                        </div>

                        {selectedCurrency !== businessDNA.currency && (
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest ml-1">Exchange Rate</Label>
                                <Input type="number" step="0.0001" {...register("exchangeRate")} className="h-11 rounded-xl bg-emerald-50/30 border-emerald-100 font-bold" />
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Item Details</h2>
                    </div>

                    <Card className="rounded-2xl border-slate-200 shadow-sm overflow-hidden border-none">
                        <Table>
                            <TableHeader className="bg-slate-50/80">
                                <TableRow className="h-12 border-none">
                                    <TableHead className="pl-6 font-bold text-[10px] uppercase text-slate-400">Description</TableHead>
                                    <TableHead className="w-24 text-center font-bold text-[10px] uppercase text-slate-400">Qty</TableHead>
                                    <TableHead className="w-32 text-right font-bold text-[10px] uppercase text-slate-400">Rate</TableHead>
                                    <TableHead className="w-40 text-right pr-6 font-bold text-[10px] uppercase text-slate-400">Total</TableHead>
                                    <TableHead className="w-12"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => {
                                    const qty = items?.[index]?.quantity || 0;
                                    const price = items?.[index]?.unitPrice || 0;
                                    const lineTotal = Money.multiply(Number(price), Number(qty));

                                    return (
                                        <TableRow key={field.id} className="hover:bg-slate-50/50 transition-colors border-b-slate-100">
                                            <TableCell className="p-4 pl-6 align-top space-y-2">
                                                <Input {...register(`items.${index}.description` as const)} placeholder="Item description..." className="h-10 border-slate-200 font-semibold" />
                                                <Input {...register(`items.${index}.hsCode` as const)} placeholder="HS-Code" className="h-7 border-none bg-blue-50/50 text-[10px] font-bold uppercase rounded-md tracking-tighter" />
                                            </TableCell>
                                            <TableCell className="p-4 align-top">
                                                <Input type="number" step="0.01" {...register(`items.${index}.quantity` as const)} className="h-10 text-center font-bold" />
                                            </TableCell>
                                            <TableCell className="p-4 align-top">
                                                <Input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const)} className="h-10 text-right font-bold" />
                                            </TableCell>
                                            <TableCell className="p-4 text-right align-top pt-6 font-bold text-slate-900">
                                                {formatCurrency(lineTotal)}
                                            </TableCell>
                                            <TableCell className="p-4 text-center align-top pt-5">
                                                <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-300 hover:text-red-500 h-8 w-8">
                                                    <Trash2 size={16} />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                            <Button type="button" variant="outline" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate })} className="h-10 px-6 border-blue-600 border-2 text-blue-600 font-bold text-[11px] uppercase rounded-xl hover:bg-blue-600 hover:text-white transition-all">
                                <Plus size={16} className="mr-2" /> Add Line Item
                            </Button>
                        </div>
                    </Card>
                </div>
            </div>

            <div className="space-y-8">
                <Card className="rounded-[2rem] border-none bg-slate-900 text-white shadow-2xl p-8 space-y-8">
                    <div className="space-y-6">
                        <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                            <span>Sub Total</span>
                            <span className="text-white text-sm">{formatCurrency(totals.subtotal)}</span>
                        </div>
                        <div className="flex justify-between items-center text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                            <span>Tax Amount</span>
                            <span className="text-sm">+{formatCurrency(totals.taxTotal)}</span>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-white/10 space-y-1">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Total Payable Amount</p>
                        <div className="flex justify-between items-end">
                            <h4 className="text-4xl font-bold tracking-tighter tabular-nums">{formatCurrency(totals.grandTotal)}</h4>
                            <Badge className="bg-blue-600 text-white px-3 py-1 rounded-lg text-[9px] font-bold uppercase border-none">Net Balance</Badge>
                        </div>
                    </div>

                    <Button 
                        type="submit" 
                        disabled={isSubmitting} 
                        className="w-full h-16 bg-white hover:bg-blue-50 text-slate-900 font-bold uppercase tracking-widest text-xs rounded-2xl shadow-xl transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isSubmitting ? <><Loader2 className="animate-spin mr-3 h-5 w-5" /> Processing</> : "Authorize & Post Invoice"}
                    </Button>
                </Card>

                <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl space-y-4 shadow-sm">
                    <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Internal Notes</Label>
                    <Textarea 
                        {...register("notes")} 
                        className="min-h-[150px] border-none bg-white rounded-xl text-sm font-medium p-4 shadow-inner resize-none outline-none" 
                        placeholder="Specify bank details or special terms..."
                    />
                </div>

                <div className="flex justify-center items-center gap-3 opacity-30 pt-4">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">System Record Valid</span>
                </div>
            </div>

          </div>
        </form>
      </div>
    </ScrollArea>
  );
}