"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Plus, Trash2, Loader2, Save, Calendar, User, 
  AlertCircle, ArrowLeft, Receipt, Landmark, 
  Globe, Ship, RefreshCcw, Repeat 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import toast from 'react-hot-toast';

// --- 1. Enterprise Financial Utilities (Aligned with Sovereign Kernel) ---
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
  return date.toISOString().split('T')[0];
};

// --- 3. Validation Schema (UPGRADED FOR INTERNATIONAL TRADE) ---
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  exchangeRate: z.coerce.number().min(0.000001, "Manual rate required"), // Forensic anchor
  originCountry: z.string().min(2, "Required for Compliance"),
  destinationCountry: z.string().min(2, "Required for Compliance"),
  incoterm: z.string().default('CIF'),
  isRecurring: z.boolean().default(false),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid issue date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    hsCode: z.string().optional(), // For forensic tax mapping
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

// --- 4. Configuration & Types ---
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

  // --- 5. Data Fetching ---
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
        console.error("Forensic Retrieval Error:", err);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    };

    if (tenantId) fetchEnterpriseContext();
    return () => { isMounted = false; };
  }, [tenantId, supabase]);

  // --- 6. Form Initialization ---
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

  // Sync default values
  useEffect(() => {
     if (businessDNA.currency) {
        setValue('currency', businessDNA.currency);
        setValue('originCountry', businessDNA.country);
        setValue('items.0.taxRate', businessDNA.taxRate);
     }
  }, [businessDNA, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  // --- 7. Real-time Calculations ---
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
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code }).format(val);

  // --- 8. Submission Handler (Enterprise Weld) ---
  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    let createdInvoiceId: string | null = null;

    try {
      // Step A: Header (Dynamic Columns for FX Audit & Trade)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          business_id: tenantId,
          customer_id: data.customerId,
          currency_code: data.currency,
          exchange_rate_at_issue: data.exchangeRate, // Critical for FX Forensic Audit
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

      // Step B: Itemized Tax Recognition with HS-Codes
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
        throw new Error(`Item Sync Error: ${itemsError.message}`);
      }

      toast.success("Document Sealed & Compliance Bridge Active.");
      router.push(`/${locale}/invoicing/to-be-issued`);
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setSubmitError(error.message || "Fiduciary Handshake Failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-10 px-4 sm:px-8 bg-slate-50/30 min-h-screen">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-10 gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white flex items-center gap-4 italic uppercase">
            <Receipt className="h-10 w-10 text-blue-600" />
            Sovereign <span className="text-blue-600">Invoicing</span>
          </h1>
          <p className="text-slate-400 mt-2 font-black uppercase tracking-[0.3em] text-[10px]">
            International Trade Compliance Mode • Node: {businessDNA.country}
          </p>
        </div>
        <button 
          onClick={() => router.back()} 
          type="button"
          disabled={isSubmitting}
          className="px-6 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 flex items-center gap-2 transition-all disabled:opacity-50 shadow-sm active:scale-95"
        >
          <ArrowLeft size={16} /> Abort Operation
        </button>
      </div>

      {submitError && (
        <div className="mb-8 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-4 text-red-800 shadow-lg">
          <AlertCircle className="w-6 h-6 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-black uppercase tracking-tight">Kernel Rejection</h3>
            <p className="text-xs mt-1 font-bold">{submitError}</p>
          </div>
        </div>
      )}

      <Card className="shadow-[0_20px_50px_rgba(0,0,0,0.05)] border-none rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="pb-6 border-b border-slate-100 bg-slate-950 text-white">
          <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-3">
              <Landmark className="w-5 h-5 text-blue-400" />
              Manifest Configuration & Compliance
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-10 px-8 pb-10">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-12">
            
            {/* COMPLIANCE & IDENTITY GRID */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <User size={14} className="text-blue-500" /> Client Entity
                </label>
                <select 
                  {...register("customerId")} 
                  disabled={isLoadingCustomers || isSubmitting}
                  className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 font-bold text-sm focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                >
                  <option value="">{isLoadingCustomers ? "Syncing..." : "Select Client..."}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.customerId && <p className="text-red-600 text-[10px] font-black uppercase mt-1 ml-1">{errors.customerId.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <Globe size={14} /> Origin / Destination
                </label>
                <div className="flex gap-2">
                    <input {...register("originCountry")} placeholder="Origin" className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono font-bold" />
                    <input {...register("destinationCountry")} placeholder="Dest" className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-sm font-mono font-bold" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <Ship size={14} /> Incoterm
                </label>
                <select {...register("incoterm")} className="w-full h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 text-sm font-bold">
                  {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <Repeat size={14} /> Revenue Automation
                </label>
                <div className="flex items-center h-12 px-5 border border-slate-200 rounded-xl bg-slate-50 justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Recurring?</span>
                    <input type="checkbox" {...register("isRecurring")} className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* FORENSIC FX SECTION */}
            <div className="p-8 bg-slate-950 rounded-[2rem] flex flex-wrap items-center gap-10 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 opacity-5 p-4"><RefreshCcw size={120} /></div>
                
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Transaction Currency</label>
                    <select {...register("currency")} className="bg-white/10 border-none rounded-lg h-12 px-4 text-sm font-black outline-none w-40">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code} className="text-black">{c.code} ({c.symbol})</option>)}
                    </select>
                </div>

                {selectedCurrency !== businessDNA.currency && (
                    <div className="space-y-2 animate-in slide-in-from-left duration-500">
                        <label className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.3em] flex items-center gap-2">
                            <RefreshCcw size={12} /> Forensic Exchange Rate (1 {selectedCurrency} =)
                        </label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                step="0.000001" 
                                {...register("exchangeRate")} 
                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl h-12 px-5 text-base font-mono font-black w-56 outline-none focus:ring-2 focus:ring-emerald-500" 
                            />
                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{businessDNA.currency} BASE</span>
                        </div>
                    </div>
                )}

                <div className="lg:ml-auto flex gap-6">
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Issue Date</label>
                        <input type="date" {...register("issueDate")} className="bg-white/10 border-none rounded-lg h-12 px-4 text-sm font-mono font-bold outline-none" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.3em]">Due Date</label>
                        <input type="date" {...register("dueDate")} className="bg-white/10 border-none rounded-lg h-12 px-4 text-sm font-mono font-bold outline-none" />
                    </div>
                </div>
            </div>

            {/* LINE MANIFEST TABLE */}
            <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-white">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-black uppercase tracking-widest text-[9px]">
                  <tr>
                    <th className="px-8 py-5 w-[40%]">Item Description / HS-Code</th>
                    <th className="px-2 py-5 w-28 text-center">Quantity</th>
                    <th className="px-2 py-5 w-40 text-right">Unit Price</th>
                    <th className="px-2 py-5 w-28 text-center">Tax %</th>
                    <th className="px-8 py-5 w-40 text-right">Total</th>
                    <th className="px-4 py-5 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {fields.map((field, index) => {
                    const qty = items?.[index]?.quantity || 0;
                    const price = items?.[index]?.unitPrice || 0;
                    const lineTotal = Money.multiply(Number(price), Number(qty));

                    return (
                      <tr key={field.id} className="group hover:bg-slate-50 transition-colors">
                        <td className="p-6 align-top space-y-2">
                          <input 
                            {...register(`items.${index}.description` as const)} 
                            placeholder="Managed Service or Product..." 
                            className="w-full h-11 px-4 border border-slate-200 rounded-xl focus:ring-1 focus:ring-blue-500 font-bold placeholder:text-slate-300" 
                          />
                          <input 
                            {...register(`items.${index}.hsCode` as const)} 
                            placeholder="HS-Code (For Customs Forensic Mapping)" 
                            className="w-full h-8 px-4 bg-blue-50/50 border-none rounded-lg text-[10px] font-mono font-black text-blue-600 outline-none" 
                          />
                        </td>
                        <td className="p-6 align-top">
                          <input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="w-full h-11 px-2 border border-slate-200 rounded-xl text-center font-mono font-black text-slate-900" />
                        </td>
                        <td className="p-6 align-top">
                          <div className="relative">
                            <span className="absolute left-4 top-3.5 text-slate-400 font-black text-xs">{currencyMeta.symbol}</span>
                            <input 
                              type="number" 
                              step="0.01" 
                              {...register(`items.${index}.unitPrice` as const)} 
                              className="w-full h-11 pl-10 pr-4 border border-slate-200 rounded-xl text-right font-mono font-black text-slate-900" 
                            />
                          </div>
                        </td>
                        <td className="p-6 align-top">
                          <input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="w-full h-11 border-none bg-blue-50 text-blue-600 rounded-xl text-center font-mono font-black text-sm" />
                        </td>
                        <td className="p-6 text-right align-top pt-9 font-black text-slate-900 text-lg font-mono tracking-tighter">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="p-6 text-center align-top pt-8">
                          <button 
                            type="button" 
                            onClick={() => remove(index)} 
                            disabled={fields.length === 1} 
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors active:scale-90"
                          >
                            <Trash2 size={20} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
                 <button 
                  type="button" 
                  onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate })} 
                  className="flex items-center gap-3 px-8 py-3 text-[11px] font-black uppercase tracking-widest text-blue-600 bg-white hover:bg-blue-600 hover:text-white rounded-xl border-2 border-blue-600 transition-all shadow-md active:scale-95"
                >
                  <Plus size={16} /> Add Line Manifest
                </button>
                <div className="flex items-center gap-3 text-slate-400">
                    <RefreshCcw size={14} className="animate-spin-slow" />
                    <span className="text-[10px] font-black uppercase tracking-tighter italic">Ledger Parity Guaranteed</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10 pt-6">
              <div className="flex-1 space-y-3">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1 flex items-center gap-2">
                    Internal Notes & Trade Terms
                </label>
                <textarea 
                  {...register("notes")} 
                  className="w-full p-6 border border-slate-200 rounded-[2rem] text-sm h-56 focus:ring-1 focus:ring-blue-500 transition-all resize-none bg-white font-medium" 
                  placeholder="Insert payment cycles, trade terms (Incoterms), or specific localized compliance clauses..."
                ></textarea>
              </div>

              <div className="w-full lg:w-[450px] space-y-6">
                <div className="bg-slate-900 rounded-[2.5rem] p-10 shadow-2xl text-white relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-8 opacity-10"><Landmark size={150} /></div>
                   <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mb-8 relative z-10">Fiduciary Summary</h3>
                   
                   <div className="space-y-6 relative z-10">
                       <div className="flex justify-between items-center text-sm font-mono opacity-60">
                          <span className="uppercase tracking-widest">Gross Subtotal</span> 
                          <span className="font-black">{formatCurrency(totals.subtotal)}</span>
                       </div>
                       <div className="flex justify-between items-center text-sm font-mono text-blue-400">
                          <span className="uppercase tracking-widest">Statutory VAT/GST</span> 
                          <span className="font-black">+{formatCurrency(totals.taxTotal)}</span>
                       </div>
                       
                       <div className="border-t border-white/10 pt-8 mt-8 space-y-2">
                         <span className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500">Balance Due (Sovereign Debt)</span>
                         <div className="flex justify-between items-end">
                            <span className="font-black text-5xl tracking-tighter text-white font-mono">{formatCurrency(totals.grandTotal)}</span>
                         </div>
                       </div>
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.2em] rounded-[2rem] shadow-2xl shadow-blue-600/30 flex justify-center items-center gap-5 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 group"
                >
                  {isSubmitting ? (
                    <Loader2 className="animate-spin h-8 w-8" />
                  ) : (
                    <Save className="h-7 w-7 text-emerald-400 group-hover:scale-110 transition-transform" />
                  )} 
                  <span className="text-lg">{isSubmitting ? 'Finalizing Genesis...' : 'Execute & Seal Manifest'}</span>
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}