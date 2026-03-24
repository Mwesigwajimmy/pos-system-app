"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Loader2, Save, Calendar, User, AlertCircle, ArrowLeft, Receipt, Landmark } from 'lucide-react';
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

// --- 3. Validation Schema ---
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid issue date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid due date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
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
];

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
  const [businessDNA, setBusinessDNA] = useState({ currency: 'USD', taxRate: 0 });
  
  const supabase = createClient();
  const router = useRouter();

  // --- 5. Data Fetching (Autonomous Identity Retrieval) ---
 useEffect(() => {
  let isMounted = true;
  const fetchEnterpriseContext = async () => {
    try {
      // 1. Fetch Tenant Config, Active Tax Rule, and Customers in Parallel
      const [tenantRes, taxRes, customerRes] = await Promise.all([
        supabase.from('tenants').select('currency_code').eq('id', tenantId).single(),
        supabase.from('tax_configurations').select('rate_percentage').eq('business_id', tenantId).eq('is_active', true).limit(1),
        supabase.from('customers').select('id, name, email, vat_number, tenant_id, business_id').or(`tenant_id.eq.${tenantId},business_id.eq.${tenantId}`).eq('is_active', true).order('name')
      ]);

      if (isMounted) {
        if (tenantRes.data) {
           setBusinessDNA({
              currency: tenantRes.data.currency_code || 'USD',
              taxRate: taxRes.data?.[0]?.rate_percentage || 0
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
    register, 
    control, 
    handleSubmit, 
    watch, 
    setValue,
    formState: { errors } 
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      currency: businessDNA.currency,
      issueDate: getLocalDateString(),
      dueDate: getFutureDateString(14),
      notes: '', 
      items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate }]
    },
    mode: 'onBlur'
  });

  // Sync default industry values when DB fetch completes
  useEffect(() => {
     if (businessDNA.currency) {
        setValue('currency', businessDNA.currency);
        setValue('items.0.taxRate', businessDNA.taxRate);
     }
  }, [businessDNA, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  
  // --- 7. Real-time Calculations (Balanced with Database Precision) ---
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
      // Step A: Header (Linked to Multi-Tenant business_id)
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
          business_id: tenantId, // Fixed: Ensures dual-column linkage for audit
          customer_id: data.customerId,
          currency: data.currency,
          issue_date: data.issueDate,
          due_date: data.dueDate,
          notes: data.notes,
          subtotal: totals.subtotal,
          tax_total: totals.taxTotal,
          total: totals.grandTotal,
          status: 'DRAFT',
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (invoiceError) throw new Error(invoiceError.message);
      createdInvoiceId = invoiceData.id;

      // Step B: Itemized Tax Recognition
      const lineItems = data.items.map(item => {
          const lineSub = Money.multiply(item.unitPrice, item.quantity);
          return {
            invoice_id: createdInvoiceId!,
            tenant_id: tenantId,
            business_id: tenantId,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            tax_rate: item.taxRate,
            tax_amount: Money.calculateTax(lineSub, item.taxRate),
            total: Money.round(lineSub + Money.calculateTax(lineSub, item.taxRate))
          };
      });

      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

      if (itemsError) {
        // Atomic Rollback
        await supabase.from('invoices').delete().eq('id', createdInvoiceId);
        throw new Error(`Line Item Error: ${itemsError.message}`);
      }

      toast.success("Invoice successfully birthed and sealed.");
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
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-600" />
            Create Enterprise Invoice
          </h1>
          <p className="text-gray-500 mt-1 font-medium italic">Legal debt record for {businessDNA.currency} jurisdiction.</p>
        </div>
        <button 
          onClick={() => router.back()} 
          type="button"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-bold text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50 shadow-sm"
        >
          <ArrowLeft size={16} /> ABORT
        </button>
      </div>

      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-bold">Kernel Rejection</h3>
            <p className="text-sm mt-1">{submitError}</p>
          </div>
        </div>
      )}

      <Card className="border-t-4 border-t-blue-600 shadow-2xl border-none">
        <CardHeader className="pb-4 border-b border-gray-100 bg-slate-50/50">
          <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Landmark className="w-4 h-4 text-slate-400" />
              Sovereign Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-5 space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                  <User size={14} className="text-blue-500" /> Target Client <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    {...register("customerId")} 
                    disabled={isLoadingCustomers || isSubmitting}
                    className="w-full h-11 px-3 border border-gray-200 rounded-lg bg-white font-bold text-sm focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 transition-all appearance-none"
                  >
                    <option value="">{isLoadingCustomers ? "Syncing Directory..." : "Select from Global List..."}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                    <User size={16} />
                  </div>
                </div>
                {errors.customerId && <p className="text-red-600 text-xs font-bold mt-1 ml-1">{errors.customerId.message}</p>}
              </div>

              <div className="lg:col-span-3 space-y-2">
                 <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Reporting Currency</label>
                 <select {...register("currency")} className="w-full h-11 px-3 border border-gray-200 rounded-lg bg-slate-50 font-mono font-bold text-gray-900 text-sm">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                 </select>
              </div>

              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                    <Calendar size={14} /> Recognition
                  </label>
                  <input type="date" {...register("issueDate")} className="w-full h-11 px-3 border border-gray-200 rounded-lg font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase text-slate-400 tracking-widest flex items-center gap-2 ml-1">
                    <Calendar size={14} /> Deadline
                  </label>
                  <input type="date" {...register("dueDate")} className="w-full h-11 px-3 border border-gray-200 rounded-lg font-mono text-sm" />
                </div>
              </div>
            </div>
            {errors.dueDate && <p className="text-red-600 text-xs bg-red-50 p-3 rounded-lg font-bold border border-red-100">{errors.dueDate.message}</p>}

            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-inner bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-900 border-b border-gray-200 text-white font-bold uppercase tracking-widest text-[10px]">
                    <tr>
                      <th className="px-6 py-5 w-[40%]">Managed Service / Item Description</th>
                      <th className="px-4 py-5 w-24 text-center">Qty</th>
                      <th className="px-4 py-5 w-32 text-right">Unit Price</th>
                      <th className="px-4 py-5 w-24 text-center">Tax %</th>
                      <th className="px-6 py-5 w-36 text-right">Subtotal</th>
                      <th className="px-4 py-5 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field, index) => {
                      const qty = items?.[index]?.quantity || 0;
                      const price = items?.[index]?.unitPrice || 0;
                      const lineTotal = Money.multiply(Number(price), Number(qty));

                      return (
                        <tr key={field.id} className="group hover:bg-blue-50/30 transition-colors">
                          <td className="p-4 align-top">
                            <input 
                              {...register(`items.${index}.description` as const)} 
                              placeholder="Describe product or consulting scope..." 
                              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-1 focus:ring-blue-500 font-medium placeholder:text-slate-300" 
                            />
                            {errors.items?.[index]?.description && <span className="text-red-500 text-[10px] font-black uppercase ml-1">Required Field</span>}
                          </td>
                          <td className="p-4 align-top">
                            <input type="number" step="0.001" {...register(`items.${index}.quantity` as const)} className="w-full p-3 border border-gray-200 rounded-lg text-center font-mono font-bold" />
                          </td>
                          <td className="p-4 align-top">
                            <div className="relative">
                              <span className="absolute left-3 top-3 text-slate-400 font-bold">{currencyMeta.symbol}</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                {...register(`items.${index}.unitPrice` as const)} 
                                className="w-full p-3 pl-8 border border-gray-200 rounded-lg text-right font-mono font-bold" 
                              />
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="w-full p-3 border border-gray-200 rounded-lg text-center font-mono font-bold text-blue-600 bg-blue-50/50" />
                          </td>
                          <td className="p-4 text-right align-top pt-7 font-black text-slate-800 font-mono">
                            {formatCurrency(lineTotal)}
                          </td>
                          <td className="p-4 text-center align-top pt-5">
                            <button 
                              type="button" 
                              onClick={() => remove(index)} 
                              disabled={fields.length === 1} 
                              className="p-2 text-slate-300 hover:text-red-600 transition-colors disabled:opacity-10"
                            >
                              <Trash2 size={20} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-slate-50 border-t border-gray-100 flex justify-between items-center">
                 <button 
                  type="button" 
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: businessDNA.taxRate })} 
                  className="flex items-center gap-2 px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-blue-600 bg-white hover:bg-blue-600 hover:text-white rounded-lg border-2 border-blue-600 transition-all shadow-md"
                >
                  <Plus size={14} /> Add Line Item
                </button>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">Ledger Parity Guaranteed</span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 pt-4">
              <div className="flex-1 space-y-2">
                <label className="text-xs font-black uppercase text-slate-400 tracking-widest ml-1">Internal Notes & Compliance Memo</label>
                <textarea 
                  {...register("notes")} 
                  className="w-full p-5 border border-gray-200 rounded-2xl text-sm h-44 focus:ring-1 focus:ring-blue-500 transition-shadow resize-none bg-slate-50/30" 
                  placeholder="Insert payment terms, bank details, or specific industry clauses..."
                ></textarea>
              </div>

              <div className="w-full lg:w-96">
                <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl space-y-5 text-white">
                  <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-6">Financial Summary</h3>
                   <div className="flex justify-between text-xs font-mono opacity-60">
                      <span>GROSS SUBTOTAL</span> 
                      <span>{formatCurrency(totals.subtotal)}</span>
                   </div>
                   <div className="flex justify-between text-xs font-mono text-blue-400">
                      <span>VAT/GST TOTAL</span> 
                      <span>{formatCurrency(totals.taxTotal)}</span>
                   </div>
                   <div className="border-t border-white/10 my-4"></div>
                   <div className="flex justify-between items-center">
                     <span className="text-xs font-black uppercase tracking-widest text-slate-400">Total Net Debt</span>
                     <span className="font-black text-3xl text-emerald-400 font-mono tracking-tighter">{formatCurrency(totals.grandTotal)}</span>
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full mt-6 h-16 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-[0.1em] rounded-2xl shadow-xl shadow-blue-600/20 flex justify-center items-center gap-4 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-6 w-6" /> : <Save className="h-6 w-6 text-emerald-400" />} 
                  {isSubmitting ? 'SEALING RECORD...' : 'Execute & Seal Invoice'}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}