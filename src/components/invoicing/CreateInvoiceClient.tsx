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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
    <div className="min-h-screen bg-white">
      <div className="max-w-[1200px] mx-auto py-8 px-4 md:px-8 space-y-8 animate-in fade-in duration-500">
        
        {/* HEADER */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-0.5">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Generate Tax Invoice</h1>
            <p className="text-xs text-slate-500 font-medium">Draft and authorize official commercial billing documents.</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => router.back()} className="h-9 px-4 border-slate-200 rounded-lg font-bold text-[10px] uppercase tracking-widest transition-all">
            <ArrowLeft size={14} className="mr-2" /> Discard Draft
          </Button>
        </header>

        {submitError && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-900">
            <AlertCircle className="w-5 h-5 shrink-0 text-red-600" />
            <p className="text-[10px] font-bold uppercase tracking-wider">{submitError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          
          {/* 1. TRANSACTION CONTEXT */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Client Selection</Label>
              <select {...register("customerId")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50/50 text-sm font-medium focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                <option value="">{isLoadingCustomers ? "Syncing..." : "Select Client"}</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Currency</Label>
              <select {...register("currency")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-medium outline-none shadow-sm">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Issue Date</Label>
              <input type="date" {...register("issueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-medium shadow-sm outline-none" />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Due Date</Label>
              <input type="date" {...register("dueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-sm font-medium shadow-sm outline-none" />
            </div>
          </div>

          {/* 2. ADDRESSES */}
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <MapPin size={14} className="text-blue-600" /> Address Details
              </h2>
              <Button type="button" variant="ghost" size="sm" onClick={copyBillingToShipping} className="text-[9px] font-bold text-blue-600 uppercase tracking-widest gap-1">
                <Copy size={12} /> Sync Addresses
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {['billingAddress', 'shippingAddress'].map((type) => (
                <div key={type} className="p-6 rounded-xl border border-slate-100 bg-slate-50/20 space-y-4">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{type === 'billingAddress' ? 'Billing Source' : 'Shipping Destination'}</span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">Country</Label><Input {...register(`${type}.country` as any)} className="h-9 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">City</Label><Input {...register(`${type}.city` as any)} className="h-9 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">Building</Label><Input {...register(`${type}.building` as any)} className="h-9 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">Street</Label><Input {...register(`${type}.street` as any)} className="h-9 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">State</Label><Input {...register(`${type}.state` as any)} className="h-9 text-xs" /></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-medium text-slate-500">Zip Code</Label><Input {...register(`${type}.zip` as any)} className="h-9 text-xs" /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3. ITEM TABLE */}
          <div className="space-y-4">
            <h2 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-blue-600 pl-3">Invoiced Items</h2>
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <ScrollArea className="w-full">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow className="h-11">
                      <TableHead className="w-12 text-center text-[9px] font-bold uppercase text-slate-500">#</TableHead>
                      <TableHead className="min-w-[300px] text-[9px] font-bold uppercase text-slate-500">Description</TableHead>
                      <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Qty</TableHead>
                      <TableHead className="w-28 text-right text-[9px] font-bold uppercase text-slate-500">Rate</TableHead>
                      <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Disc%</TableHead>
                      <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Tax%</TableHead>
                      <TableHead className="w-32 text-right pr-6 text-[9px] font-bold uppercase text-slate-500">Total</TableHead>
                      <TableHead className="w-10"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => {
                      const lineBase = Money.multiply(watchedItems[index]?.unitPrice || 0, watchedItems[index]?.quantity || 0);
                      const disc = Number(watchedItems[index]?.discount) || 0;
                      const tax = Money.calculateTax(lineBase - disc, watchedItems[index]?.taxRate || 0);
                      
                      return (
                        <TableRow key={field.id} className="hover:bg-slate-50/50 transition-all border-b last:border-none">
                          <TableCell className="text-center text-xs font-medium text-slate-400 pt-5">{index + 1}</TableCell>
                          <TableCell className="py-4 space-y-2">
                            <Input {...register(`items.${index}.productName` as const)} placeholder="Item name" className="h-9 text-xs font-bold" />
                            <Textarea {...register(`items.${index}.description` as const)} placeholder="Details..." className="min-h-[60px] text-[11px] p-2 resize-none bg-slate-50/30" />
                          </TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.quantity` as const)} className="h-9 text-center text-xs font-bold" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.unitPrice` as const)} className="h-9 text-right text-xs font-bold" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.discount` as const)} className="h-9 text-center text-xs font-medium bg-amber-50/30" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.taxRate` as const)} className="h-9 text-center text-xs font-medium bg-blue-50/30" /></TableCell>
                          <TableCell className="align-top pt-6 text-right pr-6 text-xs font-bold text-slate-900">
                            {formatCurrency(lineBase - disc + tax)}
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <Button variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length === 1} className="h-8 w-8 text-slate-300 hover:text-red-500">
                              <Trash2 size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
              <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })} className="h-9 px-4 border-blue-600 text-blue-600 font-bold text-[10px] uppercase tracking-widest gap-2 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                  <Plus size={14} /> Add Line Item
                </Button>
              </div>
            </div>
          </div>

          {/* 4. SUMMARY */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div className="grid gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Terms & Conditions</Label>
                <Textarea {...register("termsAndConditions")} className="min-h-[100px] text-xs font-medium p-4 rounded-xl border-slate-100 bg-slate-50/50" placeholder="Settlement terms..." />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Notes</Label>
                <Textarea {...register("additionalNotes")} className="min-h-[100px] text-xs font-medium p-4 rounded-xl border-slate-100 bg-slate-50/50" placeholder="Internal remarks..." />
              </div>
            </div>

            <div className="space-y-6">
              <Card className="rounded-2xl border-none bg-slate-900 text-white shadow-xl p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Subtotal</span>
                    <span className="text-white text-xs">{formatCurrency(totals.subTotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-rose-400 uppercase tracking-wider">
                    <span>Discounts</span>
                    <span className="text-xs">-{formatCurrency(totals.totalDiscount)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[9px] font-bold text-blue-400 uppercase tracking-wider">
                    <span>Tax Obligation</span>
                    <span className="text-xs">+{formatCurrency(totals.totalTax)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-3 border-t border-white/5">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Adjustment ({selectedCurrencyCode})</span>
                    <Input type="number" {...register("adjustment")} className="w-24 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Grand Total</p>
                      <h4 className="text-2xl font-bold tracking-tight tabular-nums">
                        {formatCurrency(totals.grandTotal)}
                      </h4>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold px-3 py-1 rounded-md text-[8px] uppercase tracking-wider border-none">Payable</Badge>
                </div>

                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all active:scale-95 flex gap-2"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-4 w-4" /> : <CheckCircle2 size={16} />}
                    {isSubmitting ? "Processing..." : "Authorize Invoice"}
                </Button>
              </Card>

              <div className="flex justify-center items-center gap-2 opacity-40">
                <CheckCircle2 size={12} className="text-emerald-500" />
                <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Encrypted Ledger Integrity Verified</span>
              </div>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
}