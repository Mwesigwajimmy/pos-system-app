"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  Receipt, CheckCircle2, Globe, MapPin, 
  CreditCard, Info, FileText, Copy, ArrowLeft, RefreshCcw
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

// --- 1. Financial Utilities ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100,
  calculateTax: (amount: number, rate: number) => Math.round((amount * (rate / 100) + Number.EPSILON) * 100) / 100
};

// --- 2. Validation Schema ---
const addressSchema = z.object({
  country: z.string().optional(),
  building: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  exchangeRate: z.coerce.number().min(0.000001, "Valid exchange rate required"),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().min(1, "Due date required"),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  termsAndConditions: z.string().optional(),
  additionalNotes: z.string().optional(),
  adjustment: z.coerce.number().default(0),
  items: z.array(z.object({
    productName: z.string().min(1, "Product name is required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.001, "Quantity must be > 0"),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
    discount: z.coerce.number().default(0),
    taxRate: z.coerce.number().min(0).max(100).default(0),
  })).min(1, "Minimum one line item required"),
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

interface CreateInvoiceClientProps {
  tenantId: string;
  userId: string;
  locale: string;
}

export default function CreateInvoiceClient({ tenantId, userId, locale }: CreateInvoiceClientProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [businessDNA, setBusinessDNA] = useState({ currency: 'USD', taxRate: 0, country: 'UG' });
  
  const supabase = createClient();
  const router = useRouter();

  // --- 3. Data Fetching ---
  useEffect(() => {
    const fetchContext = async () => {
      try {
        const [tenantRes, custRes] = await Promise.all([
          supabase.from('tenants').select('currency_code, country_code').eq('id', tenantId).single(),
          supabase.from('customers').select('id, name').eq('business_id', tenantId).eq('is_active', true).order('name')
        ]);
        if (tenantRes.data) setBusinessDNA({ currency: tenantRes.data.currency_code || 'USD', taxRate: 0, country: tenantRes.data.country_code || 'UG' });
        if (custRes.data) setCustomers(custRes.data);
      } catch (err) { console.error(err); } finally { setIsLoadingCustomers(false); }
    };
    fetchContext();
  }, [tenantId, supabase]);

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: businessDNA.currency,
      exchangeRate: 1.0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      adjustment: 0,
      items: [{ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  const watchedItems = watch("items");
  const selectedCurrencyCode = watch("currency");
  const adjustment = watch("adjustment");
  const currencyMeta = CURRENCIES.find(c => c.code === selectedCurrencyCode) || CURRENCIES[0];

  // --- 4. Calculations ---
  const totals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    watchedItems.forEach(item => {
      const lineBase = Money.multiply(item.unitPrice, item.quantity);
      const discountVal = Number(item.discount) || 0;
      const taxableAmount = lineBase - discountVal;
      const lineTax = Money.calculateTax(taxableAmount, item.taxRate);

      subTotal += lineBase;
      totalDiscount += discountVal;
      totalTax += lineTax;
    });

    return {
      subTotal: Money.round(subTotal),
      totalDiscount: Money.round(totalDiscount),
      totalTax: Money.round(totalTax),
      grandTotal: Money.round(subTotal - totalDiscount + totalTax + Number(adjustment))
    };
  }, [watchedItems, adjustment]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code }).format(val);

  const copyBillingToShipping = () => {
    const billing = watch('billingAddress');
    setValue('shippingAddress', billing);
    toast.success("Shipping address synchronized");
  };

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const { data: inv, error } = await supabase.from('invoices').insert({
        tenant_id: tenantId,
        customer_id: data.customerId,
        currency_code: data.currency,
        total: totals.grandTotal,
        status: 'ISSUED',
        metadata: { ...data }
      }).select('id').single();

      if (error) throw error;
      toast.success("Invoice successfully posted to ledger");
      router.push(`/${locale}/invoicing/history`);
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ScrollArea className="h-screen bg-white">
      <div className="max-w-[1400px] mx-auto py-12 px-8 space-y-12 animate-in fade-in duration-700">
        
        {/* HEADER */}
        <header className="flex justify-between items-end border-b border-slate-100 pb-10">
          <div className="space-y-1">
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Generate Tax Invoice</h1>
            <p className="text-sm text-slate-500 font-medium">Draft and authorize official commercial billing documents.</p>
          </div>
          <Button variant="outline" onClick={() => router.back()} className="h-11 px-8 border-slate-200 rounded-xl font-bold text-xs uppercase tracking-widest shadow-sm">
            <ArrowLeft size={16} className="mr-2" /> Discard Draft
          </Button>
        </header>

        {submitError && (
          <div className="p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-900">
            <AlertCircle className="w-6 h-6 shrink-0 text-red-600" />
            <p className="text-xs font-bold uppercase">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-16 pb-32">
          
          {/* 1. TRANSACTION CONTEXT & CURRENCY */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Client Selection</Label>
              <select {...register("customerId")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all">
                <option value="">{isLoadingCustomers ? "Syncing..." : "Select Transaction Party"}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Billing Currency</Label>
              <select {...register("currency")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold outline-none shadow-sm">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Valuation Date</Label>
              <input type="date" {...register("issueDate")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none" />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Maturity Date</Label>
              <input type="date" {...register("dueDate")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none" />
            </div>
          </div>

          {/* 2. ADDRESS INFORMATION SUITE */}
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-4">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={16} className="text-blue-600" /> Address Information
              </h2>
              <Button type="button" variant="ghost" onClick={copyBillingToShipping} className="text-[10px] font-bold text-blue-600 uppercase tracking-widest gap-2">
                <Copy size={14} /> Duplicate Billing to Shipping
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              {['billingAddress', 'shippingAddress'].map((type) => (
                <div key={type} className="p-8 rounded-3xl border border-slate-100 bg-slate-50/30 space-y-6">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{type === 'billingAddress' ? 'Billing Source' : 'Shipping Destination'}</span>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">Country / Region</Label><Input {...register(`${type}.country` as any)} className="h-10 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">City</Label><Input {...register(`${type}.city` as any)} className="h-10 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">Building / Flat No.</Label><Input {...register(`${type}.building` as any)} className="h-10 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">Street Address</Label><Input {...register(`${type}.street` as any)} className="h-10 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">State / Province</Label><Input {...register(`${type}.state` as any)} className="h-10 rounded-xl" /></div>
                    <div className="space-y-2"><Label className="text-xs font-semibold text-slate-500">Zip / Postal Code</Label><Input {...register(`${type}.zip` as any)} className="h-10 rounded-xl" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. ITEM DETAILS TABLE */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-widest">Invoiced Item Details</h2>
            </div>

            <div className="rounded-3xl border border-slate-100 overflow-hidden shadow-2xl shadow-slate-200/40">
              <Table>
                <TableHeader className="bg-slate-50/80">
                  <TableRow className="h-14 border-none hover:bg-transparent">
                    <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase">S.No</TableHead>
                    <TableHead className="min-w-[350px] border-l-2 border-red-500/20 font-bold text-slate-400 text-[10px] uppercase">Product Description & Spec</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Qty</TableHead>
                    <TableHead className="w-32 text-right font-bold text-slate-400 text-[10px] uppercase">Rate ({selectedCurrencyCode})</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Disc (%)</TableHead>
                    <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Tax (%)</TableHead>
                    <TableHead className="w-40 text-right pr-10 font-bold text-slate-400 text-[10px] uppercase">Line Total</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fields.map((field, index) => {
                    const lineBase = Money.multiply(watchedItems[index]?.unitPrice || 0, watchedItems[index]?.quantity || 0);
                    const disc = Number(watchedItems[index]?.discount) || 0;
                    const tax = Money.calculateTax(lineBase - disc, watchedItems[index]?.taxRate || 0);
                    
                    return (
                      <TableRow key={field.id} className="hover:bg-slate-50/30 transition-all border-b-slate-50 align-top">
                        <TableCell className="text-center pt-8 font-bold text-slate-300 text-xs">{index + 1}</TableCell>
                        <TableCell className="py-6 space-y-3">
                          <Input {...register(`items.${index}.productName` as const)} placeholder="Item/Service Name" className="h-11 rounded-xl border-slate-200 font-bold text-sm bg-white" />
                          <Textarea {...register(`items.${index}.description` as const)} placeholder="Detailed specifications..." className="min-h-[90px] rounded-xl border-slate-100 bg-slate-50/30 text-xs p-4 resize-none" />
                        </TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.quantity` as const)} className="h-11 rounded-xl text-center font-bold bg-white" /></TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.unitPrice` as const)} className="h-11 rounded-xl text-right font-bold bg-white" /></TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.discount` as const)} className="h-11 rounded-xl text-center font-bold bg-amber-50/30" /></TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.taxRate` as const)} className="h-11 rounded-xl text-center font-bold bg-blue-50/30" /></TableCell>
                        <TableCell className="pt-6 text-right pr-10 font-bold text-slate-900 text-sm pt-9">
                          {formatCurrency(lineBase - disc + tax)}
                        </TableCell>
                        <TableCell className="pt-8">
                          <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="h-10 w-10 text-slate-200 hover:text-red-500 transition-all">
                            <Trash2 size={18} />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                <Button type="button" variant="outline" onClick={() => append({ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })} className="h-12 px-8 rounded-2xl border-blue-600 border-2 text-blue-600 font-bold text-xs uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-100 gap-2">
                  <Plus size={18} /> Add New Entry
                </Button>
              </div>
            </div>
          </div>

          {/* 4. FINANCIAL SUMMARY & NOTES */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Info size={16} className="text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Terms and Conditions</h3>
                </div>
                <Textarea {...register("termsAndConditions")} className="min-h-[160px] rounded-[2rem] border-slate-100 bg-slate-50/30 p-6 shadow-inner text-sm font-medium text-slate-600" placeholder="Specify settlement terms, delivery timelines, etc..." />
              </div>
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-blue-500" />
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">Internal Remarks</h3>
                </div>
                <Textarea {...register("additionalNotes")} className="min-h-[160px] rounded-[2rem] border-slate-100 bg-slate-50/30 p-6 shadow-inner text-sm font-medium text-slate-600" placeholder="Internal audit notes or project descriptors..." />
              </div>
            </div>

            <div className="space-y-8">
              <Card className="rounded-[3rem] border-none bg-slate-900 text-white shadow-2xl p-12 space-y-8">
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-slate-500 text-[10px] font-bold uppercase tracking-widest">
                    <span>Operational Subtotal</span>
                    <span className="text-white text-sm">{formatCurrency(totals.subTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-rose-400 text-[10px] font-bold uppercase tracking-widest">
                    <span>Aggregate Discount</span>
                    <span className="text-sm">-{formatCurrency(totals.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-blue-400 text-[10px] font-bold uppercase tracking-widest">
                    <span>Fiscal Tax Obligation</span>
                    <span className="text-sm">+{formatCurrency(totals.totalTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Manual Adjustment ({selectedCurrencyCode})</span>
                    <Input type="number" {...register("adjustment")} className="w-28 h-10 border-none bg-white/10 rounded-xl text-right font-bold text-white shadow-inner" />
                  </div>
                </div>

                <div className="pt-10 border-t-2 border-white/10 space-y-2">
                  <div className="flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Total Payable Amount</p>
                      <h4 className="text-5xl font-bold tracking-tighter tabular-nums leading-none">
                        {formatCurrency(totals.grandTotal)}
                      </h4>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest mb-2 border-none">Net Balance</Badge>
                  </div>
                </div>

                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-20 bg-white hover:bg-blue-50 text-slate-900 font-bold uppercase tracking-[0.2em] text-sm rounded-[2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-50 py-8 flex gap-4"
                >
                    {isSubmitting ? <><Loader2 className="animate-spin h-6 w-6" /> Syncing Protocol</> : <><CheckCircle2 size={24} /> Authorize & Post Invoice</>}
                </Button>
              </Card>

              <div className="flex justify-center items-center gap-4 opacity-30 pt-8">
                <CheckCircle2 size={16} className="text-emerald-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.4em]">Ledger Record Integrity Verified</span>
              </div>
            </div>
          </div>

        </form>
      </div>
      <ScrollBar />
    </ScrollArea>
  );
}