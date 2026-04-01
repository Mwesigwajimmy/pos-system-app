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
import { Badge } from "@/components/ui/badge";

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
        console.error("Data retrieval failed:", err.message);
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
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code, minimumFractionDigits: 0 }).format(val);

  // --- 8. Submission Handler ---
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
        throw new Error(`Item Sync Error: ${itemsError.message}`);
      }

      toast.success("Invoice created successfully");
      if (onSuccess) onSuccess();
      onClose();
      router.refresh();

    } catch (error: any) {
      setSubmitError(error.message || "Failed to finalize invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
                <Receipt className="text-white w-6 h-6" />
            </div>
            <div>
                <h2 className="text-xl font-bold text-slate-900 tracking-tight uppercase">
                Create New Invoice
                </h2>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mt-0.5">Billing & Compliance Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-colors bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-8 md:p-10 space-y-10 bg-white">
          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-bold uppercase">{submitError}</p>
            </div>
          )}

          <form id="invoice-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-10">
            
            {/* COMPLIANCE & IDENTITY SECTION */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <User size={14} className="text-blue-500"/> Customer Entity
                </label>
                <select {...register("customerId")} className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 text-sm font-semibold focus:ring-1 focus:ring-blue-600 outline-none transition-all">
                  <option value="">{isLoadingCustomers ? "Syncing..." : "Select Customer"}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Globe size={14}/> Region (From/To)
                </label>
                <div className="flex gap-2">
                    <input {...register("originCountry")} placeholder="Origin" className="w-1/2 h-11 px-4 border border-slate-200 rounded-lg bg-white text-sm font-bold uppercase" />
                    <input {...register("destinationCountry")} placeholder="Dest" className="w-1/2 h-11 px-4 border border-slate-200 rounded-lg bg-white text-sm font-bold uppercase" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Ship size={14}/> Trade Terms
                </label>
                <select {...register("incoterm")} className="w-full h-11 px-4 border border-slate-200 rounded-lg bg-white text-sm font-bold">
                  {INCOTERMS.map(term => <option key={term} value={term}>{term}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                    <Repeat size={14}/> Automation
                </label>
                <div className="flex items-center h-11 px-4 border border-slate-200 rounded-lg bg-slate-50 justify-between">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Recurring?</span>
                    <input type="checkbox" {...register("isRecurring")} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                </div>
              </div>
            </div>

            {/* CURRENCY & FX SECTION */}
            <div className="p-8 bg-slate-900 rounded-2xl flex flex-wrap items-center gap-8 text-white shadow-lg">
                <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Billing Currency</label>
                    <select {...register("currency")} className="bg-white/10 border-none rounded-lg h-10 px-4 text-sm font-bold outline-none w-40">
                        {CURRENCIES.map(c => <option key={c.code} value={c.code} className="text-black font-semibold">{c.code} ({c.symbol})</option>)}
                    </select>
                </div>

                {selectedCurrency !== businessConfig.currency && (
                    <div className="space-y-2 animate-in slide-in-from-left-2 duration-500">
                        <label className="text-[10px] font-bold uppercase text-blue-400 tracking-widest flex items-center gap-2">
                            <RefreshCcw size={14} /> Currency Exchange Rate
                        </label>
                        <div className="flex items-center gap-4">
                            <input 
                                type="number" 
                                step="0.000001" 
                                {...register("exchangeRate")} 
                                className="bg-white/5 border border-white/10 text-white rounded-lg h-10 px-4 text-base font-mono font-bold w-48 outline-none focus:border-blue-500" 
                            />
                            <span className="text-[10px] font-bold text-slate-500 uppercase">Per {businessConfig.currency}</span>
                        </div>
                    </div>
                )}

                <div className="ml-auto flex gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Issue Date</label>
                        <input type="date" {...register("issueDate")} className="bg-white/10 border-none rounded-lg h-10 px-4 text-sm font-bold outline-none font-mono" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Due Date</label>
                        <input type="date" {...register("dueDate")} className="bg-white/10 border-none rounded-lg h-10 px-4 text-sm font-bold outline-none font-mono" />
                    </div>
                </div>
            </div>

            {/* ITEM TABLE */}
            <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="px-6 py-4 text-left">Description</th>
                    <th className="px-2 py-4 text-center w-24">Qty</th>
                    <th className="px-2 py-4 text-right w-36">Unit Price</th>
                    <th className="px-2 py-4 text-center w-24">Tax %</th>
                    <th className="px-6 py-4 text-right w-44">Total</th>
                    <th className="px-4 py-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => {
                    const qty = items?.[index]?.quantity || 0;
                    const price = items?.[index]?.unitPrice || 0;
                    const lineTotal = Money.multiply(Number(price), Number(qty));

                    return (
                      <tr key={field.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="p-4 pl-6 space-y-2">
                          <input {...register(`items.${index}.description`)} placeholder="Item or service description" className="w-full h-9 bg-white border border-slate-100 rounded-lg px-3 text-sm font-semibold outline-none focus:border-blue-400" />
                          <input {...register(`items.${index}.hsCode`)} placeholder="HS-Code (Optional)" className="w-full h-7 bg-blue-50/40 border-none rounded px-3 text-[10px] font-mono text-blue-600 font-semibold" />
                        </td>
                        <td className="p-4"><input type="number" step="0.001" {...register(`items.${index}.quantity`)} className="w-full h-9 border border-slate-100 rounded-lg text-center font-bold text-sm bg-white" /></td>
                        <td className="p-4"><input type="number" step="0.01" {...register(`items.${index}.unitPrice`)} className="w-full h-9 border border-slate-100 rounded-lg text-right font-bold text-sm bg-white" /></td>
                        <td className="p-4"><input type="number" step="0.1" {...register(`items.${index}.taxRate`)} className="w-full h-9 border-none bg-slate-50 rounded-lg text-center font-bold text-xs text-blue-600" /></td>
                        <td className="px-6 py-4 text-right font-bold text-slate-900 text-sm">
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
              <div className="p-4 bg-slate-50 border-t border-slate-100">
                <button type="button" onClick={() => append({ description: '', hsCode: '', quantity: 1, unitPrice: 0, taxRate: businessConfig.taxRate })} className="text-[11px] font-bold uppercase text-blue-600 hover:text-blue-700 tracking-wider flex items-center gap-2">
                  <Plus size={16} /> Add New Row
                </button>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-10">
              <div className="flex-1">
                <label className="text-[11px] font-bold uppercase text-slate-500 tracking-wider mb-2 block ml-1">Additional Terms & Notes</label>
                <textarea {...register("notes")} className="w-full p-5 border border-slate-200 rounded-xl text-sm h-32 focus:ring-1 focus:ring-blue-600 outline-none transition-all font-medium text-slate-600" placeholder="Bank details, trade terms, or payment instructions..."></textarea>
              </div>

              {/* Financial Summary */}
              <div className="w-full lg:w-[380px] space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 space-y-4">
                   <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-tight">
                     <span>Subtotal</span> 
                     <span className="text-slate-900">{formatCurrency(totals.subtotal)}</span>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold text-blue-600 uppercase tracking-tight">
                     <span>Taxes</span> 
                     <span>+{formatCurrency(totals.taxTotal)}</span>
                   </div>
                   <div className="pt-4 border-t border-slate-200 flex justify-between items-end">
                     <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Grand Total</span>
                     <div className="text-3xl font-bold tracking-tight text-slate-900">
                        {formatCurrency(totals.grandTotal)}
                     </div>
                   </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-6 border-t border-slate-100 bg-slate-50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <CheckCircle2 size={14} className="text-emerald-500" /> Accounting Integrity Verified
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
              <button onClick={onClose} type="button" className="flex-1 sm:flex-none px-8 h-11 text-xs font-bold uppercase text-slate-500 hover:text-slate-900 transition-colors">
                Cancel
              </button>
              <button 
                type="submit" 
                form="invoice-modal-form" 
                disabled={isSubmitting} 
                className="flex-1 sm:flex-none px-12 h-11 text-xs font-bold uppercase tracking-widest text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmitting ? <><Loader2 className="animate-spin h-4 w-4" /> Processing</> : <><Save className="w-4 h-4" /> Finalize Invoice</>}
              </button>
          </div>
        </div>
      </div>
    </div>
  );
}