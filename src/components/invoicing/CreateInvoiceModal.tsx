"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  Calendar, Receipt, Landmark, Globe, Ship, RefreshCcw, Repeat 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// --- 1. Enterprise Financial Utilities (Aligned with Database Kernel) ---
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, quantity: number) => {
    return Math.round((amount * quantity + Number.EPSILON) * 100) / 100;
  },
  calculateTax: (amount: number, rate: number) => {
    return Math.round((amount * (rate / 100) + Number.EPSILON) * 100) / 100;
  }
};

// --- 2. Date Utilities (Local Timezone Safe) ---
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

// --- 3. Validation Schema (UPGRADED FOR SOVEREIGN TRADE) ---
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  exchangeRate: z.coerce.number().min(0.000001, "Valid rate required"), // Manual override
  originCountry: z.string().min(2, "Required for Compliance"),
  destinationCountry: z.string().min(2, "Required for Compliance"),
  incoterm: z.string().default('CIF'),
  isRecurring: z.boolean().default(false),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    hsCode: z.string().optional(), // For forensic tax mapping
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

  // --- 5. Data Fetching ---
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
        console.error("Forensic Retrieval Error:", err.message);
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

  // --- 6. Form Setup ---
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

  // Sync form defaults
  useEffect(() => {
    if (businessConfig.currency) {
      setValue('currency', businessConfig.currency);
      setValue('originCountry', businessConfig.country);
      setValue('items.0.taxRate', businessConfig.taxRate);
    }
  }, [businessConfig, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // --- 7. Dynamic Calculations ---
  const items = watch("items");
  const selectedCurrency = watch("currency");
  const currentExchangeRate = watch("exchangeRate");
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

  // --- 8. Submission Handler (UPGRADED FOR FX & COMPLIANCE) ---
  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    let createdInvoiceId: string | null = null;

    try {
      // Step A: Header (Dynamic Tax & Trade columns)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          business_id: tenantId,
          customer_id: data.customerId,
          currency_code: data.currency,
          exchange_rate_at_issue: data.exchangeRate, // Forensic audit anchor
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

      // Step B: Items with HS-Codes
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
        throw new Error(`Item Sync Error: ${itemsError.message}`);
      }

      toast.success("Sovereign Document Sealed & Validated.");
      if (onSuccess) onSuccess();
      onClose();
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setSubmitError(error.message || "Fiduciary Handshake Failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-6xl max-h-[95vh] flex flex-col bg-white dark:bg-slate-950 rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3 italic uppercase tracking-tighter">
              <Receipt className="w-6 h-6 text-blue-600" /> Sovereign <span className="text-blue-600">Invoicing</span>
            </h2>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">International Compliance Mode Active</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors bg-slate-100 dark:bg-slate-900 p-2 rounded-xl">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-10">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <p className="text-xs font-bold uppercase tracking-tight">{submitError}</p>
            </div>
          )}

          <form id="invoice-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
            {/* COMPLIANCE & IDENTITY SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Landmark size={12}/> Client Entity</label>
                <select {...register("customerId")} className="w-full h-12 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-bold">
                  <option value="">{isLoadingCustomers ? "Syncing..." : "Select Client..."}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Globe size={12}/> Origin / Dest</label>
                <div className="flex gap-2">
                    <input {...register("originCountry")} placeholder="Origin" className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-mono" />
                    <input {...register("destinationCountry")} placeholder="Dest" className="w-1/2 h-12 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-mono" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Ship size={12}/> Incoterm</label>
                <select {...register("incoterm")} className="w-full h-12 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-bold">
                  {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><Repeat size={12}/> Revenue Stream</label>
                <div className="flex items-center h-12 px-4 border border-slate-200 rounded-xl bg-slate-50 dark:bg-slate-900 justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Recurring Billing?</span>
                    <input type="checkbox" {...register("isRecurring")} className="w-5 h-5 rounded-md border-slate-300 text-blue-600 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            {/* CURRENCY & FX SECTION (NO HARDCODING) */}
            <div className="p-6 bg-slate-950 rounded-3xl flex flex-wrap items-center gap-8 text-white">
                <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Transaction Currency</label>
                    <select {...register("currency")} className="bg-white/10 border-none rounded-lg h-10 px-4 text-sm font-black outline-none">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code} className="text-black">{c.code} ({c.symbol})</option>)}
                    </select>
                </div>

                {selectedCurrency !== businessConfig.currency && (
                    <div className="space-y-2 animate-in slide-in-from-left duration-300">
                        <label className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.2em] flex items-center gap-2">
                            <RefreshCcw size={10} /> Forensic Exchange Rate (1 {selectedCurrency} =)
                        </label>
                        <div className="flex items-center gap-3">
                            <input 
                                type="number" 
                                step="0.000001" 
                                {...register("exchangeRate")} 
                                className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-lg h-10 px-4 text-sm font-black w-40 outline-none" 
                            />
                            <span className="text-xs font-bold text-slate-500 uppercase">{businessConfig.currency}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* LINE ITEMS */}
            <div className="rounded-[1.5rem] border border-slate-100 dark:border-slate-800 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px]">Item Description / HS-Code</th>
                    <th className="px-2 py-4 font-black uppercase tracking-widest text-[9px] text-center w-24">Qty</th>
                    <th className="px-2 py-4 font-black uppercase tracking-widest text-[9px] text-right w-36">Unit Price</th>
                    <th className="px-2 py-4 font-black uppercase tracking-widest text-[9px] text-center w-24">Tax %</th>
                    <th className="px-6 py-4 font-black uppercase tracking-widest text-[9px] text-right w-40">Line Total</th>
                    <th className="px-4 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-900 bg-white dark:bg-slate-950">
                  {fields.map((field, index) => {
                    const qty = items?.[index]?.quantity || 0;
                    const price = items?.[index]?.unitPrice || 0;
                    const lineTotal = Money.multiply(Number(price), Number(qty));

                    return (
                      <tr key={field.id} className="group">
                        <td className="p-4 space-y-2">
                          <input {...register(`items.${index}.description`)} placeholder="Description" className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm font-bold border-none" />
                          <input {...register(`items.${index}.hsCode`)} placeholder="HS-Code (Forensic)" className="w-full h-8 px-3 bg-blue-50/30 dark:bg-blue-900/10 rounded-lg text-[10px] font-mono text-blue-600 border-none" />
                        </td>
                        <td className="p-4 align-top"><input type="number" step="0.001" {...register(`items.${index}.quantity`)} className="w-full h-10 px-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-center font-black text-sm" /></td>
                        <td className="p-4 align-top"><input type="number" step="0.01" {...register(`items.${index}.unitPrice`)} className="w-full h-10 px-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-right font-black text-sm" /></td>
                        <td className="p-4 align-top"><input type="number" step="0.1" {...register(`items.${index}.taxRate`)} className="w-full h-10 px-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-center font-black text-xs text-blue-500" /></td>
                        <td className="px-6 py-4 align-middle text-right font-black text-slate-900 dark:text-white text-base font-mono">
                          {formatCurrency(lineTotal)}
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-4 bg-slate-50 dark:bg-slate-900/30">
                <button type="button" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessConfig.taxRate })} className="text-[10px] font-black uppercase text-blue-600 hover:text-blue-700 tracking-widest flex items-center gap-2">
                  <Plus size={14} /> Add Line Manifest
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Issue Date</label>
                        <input type="date" {...register("issueDate")} className="w-full h-11 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-bold" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Due Date</label>
                        <input type="date" {...register("dueDate")} className="w-full h-11 px-4 border border-slate-200 rounded-xl dark:bg-slate-900 text-sm font-bold" />
                    </div>
                </div>
                <textarea {...register("notes")} className="w-full p-4 border border-slate-200 rounded-2xl text-sm h-32 dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500" placeholder="Trade terms, delivery notes, or localized legal disclosures..."></textarea>
              </div>

              <div className="w-full lg:w-96 bg-slate-950 text-white rounded-[2rem] p-8 shadow-2xl space-y-6 relative overflow-hidden">
                <Landmark className="absolute -bottom-10 -right-10 w-40 h-40 text-white/5 rotate-12" />
                <div className="space-y-5 text-xs font-mono relative z-10">
                   <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <span className="opacity-50 uppercase tracking-widest">Subtotal</span> 
                     <span className="font-black text-sm">{formatCurrency(totals.subtotal)}</span>
                   </div>
                   <div className="flex justify-between items-center border-b border-white/5 pb-4">
                     <span className="text-blue-400 uppercase tracking-widest">Statutory Tax</span> 
                     <span className="font-black text-sm text-blue-400">+{formatCurrency(totals.taxTotal)}</span>
                   </div>
                   <div className="pt-4 space-y-2">
                     <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Balance Due</span>
                     <div className="text-4xl font-black tracking-tighter text-white">
                        {formatCurrency(totals.grandTotal)}
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="px-8 py-6 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">
            <RefreshCcw size={14} className="text-emerald-500" /> All totals certified by Aura-CFO
          </div>
          <div className="flex gap-4 w-full sm:w-auto">
              <button onClick={onClose} type="button" className="flex-1 sm:flex-none px-8 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 bg-slate-100 dark:bg-slate-900 rounded-xl hover:bg-slate-200 transition-all">
                Cancel
              </button>
              <button 
                type="submit" 
                form="invoice-modal-form" 
                disabled={isSubmitting} 
                className="flex-1 sm:flex-none px-12 py-4 text-[11px] font-black uppercase tracking-[0.2em] text-white bg-blue-600 rounded-xl hover:bg-blue-700 shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                {isSubmitting ? <><Loader2 className="animate-spin w-5 h-5" /> Processing...</> : <><Save className="w-5 h-5" /> Seal & Finalize</>}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}