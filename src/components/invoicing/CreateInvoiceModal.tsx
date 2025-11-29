"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { X, Plus, Trash2, Loader2, Save, AlertCircle, Calendar, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

// --- 1. Enterprise Financial Utilities ---
const Money = {
  multiply: (amount: number, quantity: number) => {
    return (Math.round(amount * 100) * quantity) / 100;
  },
  calculateTax: (amount: number, rate: number) => {
    return Math.round((amount * (rate / 100)) * 100) / 100;
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

// --- 3. Validation Schema ---
const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer selection is required"),
  currency: z.string().min(1, "Currency is required"),
  issueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), "Invalid date"),
  notes: z.string().default(''), 
  items: z.array(z.object({
    description: z.string().min(1, "Description is required"),
    quantity: z.coerce.number().min(1, "Min qty 1"),
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
];

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  onSuccess?: () => void; // Callback to refresh parent list
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
  
  const supabase = createClient();
  const router = useRouter();

  // --- 5. Data Fetching ---
  useEffect(() => {
    if (!isOpen) return; // Only fetch when opened

    let isMounted = true;
    const fetchCustomers = async () => {
      try {
        const { data, error } = await supabase
          .from('customers')
          .select('id, name, email')
          .eq('tenant_id', tenantId)
          .order('name');
        
        if (error) throw error;
        if (isMounted && data) setCustomers(data);
      } catch (err) {
        console.error("Failed to load customers", err);
      } finally {
        if (isMounted) setIsLoadingCustomers(false);
      }
    };
    fetchCustomers();

    // Lock body scroll
    document.body.style.overflow = 'hidden';
    return () => { 
      isMounted = false; 
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, tenantId, supabase]);

  // --- 6. Form Setup ---
  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    reset,
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      currency: 'USD',
      issueDate: getLocalDateString(),
      dueDate: getFutureDateString(14),
      notes: '',
      items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    },
    mode: 'onBlur'
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      reset({
        customerId: '',
        currency: 'USD',
        issueDate: getLocalDateString(),
        dueDate: getFutureDateString(14),
        notes: '',
        items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
      });
      setSubmitError(null);
    }
  }, [isOpen, reset]);

  // --- 7. Calculations ---
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
      subtotal: Math.round(subtotal * 100) / 100,
      taxTotal: Math.round(taxTotal * 100) / 100,
      grandTotal: Math.round((subtotal + taxTotal) * 100) / 100
    };
  }, [items]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code }).format(val);

  // --- 8. Submission Handler ---
  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    setSubmitError(null);
    let createdInvoiceId: string | null = null;

    try {
      // Step A: Header
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          tenant_id: tenantId,
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

      // Step B: Items
      const lineItems = data.items.map(item => ({
        invoice_id: createdInvoiceId!,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        total: Money.multiply(item.unitPrice, item.quantity)
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

      // Step C: Rollback if items fail
      if (itemsError) {
        await supabase.from('invoices').delete().eq('id', createdInvoiceId);
        throw new Error(`Items Error: ${itemsError.message}`);
      }

      // Step D: Success
      router.refresh();
      if (onSuccess) onSuccess();
      onClose();

    } catch (error: any) {
      console.error(error);
      setSubmitError(error.message || "Failed to save invoice.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Content */}
      <div className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white dark:bg-gray-900 rounded-xl shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 dark:border-gray-800">
          <div>
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-5 h-5 text-blue-600" /> New Invoice
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">Create a draft invoice for your customer.</p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {submitError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
              <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold">Submission Error</h3>
                <p className="text-sm mt-1">{submitError}</p>
              </div>
            </div>
          )}

          <form id="invoice-modal-form" onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Top Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Customer <span className="text-red-500">*</span></label>
                <select 
                  {...register("customerId")} 
                  className="w-full h-10 px-3 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="">{isLoadingCustomers ? "Loading..." : "Select Customer..."}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.customerId && <p className="text-red-600 text-xs mt-1">{errors.customerId.message as string}</p>}
              </div>

              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Calendar size={14} className="text-gray-400" /> Issue Date
                </label>
                <input type="date" {...register("issueDate")} className="w-full h-10 px-3 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm" />
              </div>

              <div className="lg:col-span-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                   <Calendar size={14} className="text-gray-400" /> Due Date
                </label>
                <input type="date" {...register("dueDate")} className="w-full h-10 px-3 border border-gray-300 rounded-lg dark:bg-gray-800 dark:border-gray-700 text-sm" />
                {errors.dueDate && <p className="text-red-600 text-xs mt-1">{errors.dueDate.message as string}</p>}
              </div>
            </div>

            {/* Currency Selector */}
            <div className="w-48 space-y-2">
               <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Currency</label>
               <select {...register("currency")} className="w-full h-9 px-2 border border-gray-300 rounded-lg bg-gray-50 text-sm dark:bg-gray-800 dark:border-gray-700">
                {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
               </select>
            </div>

            {/* Line Items */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3 font-medium w-[40%]">Description</th>
                    <th className="px-2 py-3 font-medium text-center w-20">Qty</th>
                    <th className="px-2 py-3 font-medium text-right w-28">Price</th>
                    <th className="px-2 py-3 font-medium text-center w-20">Tax %</th>
                    <th className="px-4 py-3 font-medium text-right w-28">Total</th>
                    <th className="px-2 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 bg-white dark:bg-gray-900">
                  {fields.map((field, index) => {
                    const qty = items?.[index]?.quantity || 0;
                    const price = items?.[index]?.unitPrice || 0;
                    const total = Money.multiply(Number(price), Number(qty));

                    return (
                      <tr key={field.id} className="group hover:bg-gray-50 dark:hover:bg-gray-800/50">
                        <td className="p-3 align-top">
                          <input 
                            {...register(`items.${index}.description` as const)} 
                            placeholder="Item name" 
                            className="w-full p-2 border border-gray-300 rounded-md dark:bg-gray-800 dark:border-gray-700 text-sm focus:ring-1 focus:ring-blue-500" 
                          />
                          {errors.items?.[index]?.description && <span className="text-red-500 text-[10px] block mt-1">Required</span>}
                        </td>
                        <td className="p-3 align-top">
                          <input type="number" {...register(`items.${index}.quantity` as const)} className="w-full p-2 border border-gray-300 rounded-md text-center dark:bg-gray-800 dark:border-gray-700 text-sm" />
                        </td>
                        <td className="p-3 align-top">
                          <input type="number" step="0.01" {...register(`items.${index}.unitPrice` as const)} className="w-full p-2 border border-gray-300 rounded-md text-right dark:bg-gray-800 dark:border-gray-700 text-sm" />
                        </td>
                        <td className="p-3 align-top">
                          <input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="w-full p-2 border border-gray-300 rounded-md text-center dark:bg-gray-800 dark:border-gray-700 text-sm" />
                        </td>
                        <td className="p-3 text-right align-middle font-medium text-gray-700 dark:text-gray-300">
                          {formatCurrency(total)}
                        </td>
                        <td className="p-3 text-center align-middle">
                          <button 
                            type="button" 
                            onClick={() => remove(index)} 
                            disabled={fields.length === 1}
                            className="text-gray-400 hover:text-red-600 disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <button 
                  type="button" 
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0 })} 
                  className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <Plus size={16} /> Add Line Item
                </button>
              </div>
            </div>

            {/* Bottom Summary */}
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 block mb-2">Notes</label>
                <textarea 
                  {...register("notes")} 
                  className="w-full p-3 border border-gray-300 rounded-lg text-sm h-32 dark:bg-gray-800 dark:border-gray-700 focus:ring-1 focus:ring-blue-500 resize-none" 
                  placeholder="Terms & Conditions, Payment details..."
                ></textarea>
              </div>
              <div className="w-full md:w-80 bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700 h-fit">
                <div className="space-y-3 text-sm text-gray-600 dark:text-gray-400">
                   <div className="flex justify-between">
                     <span>Subtotal</span> 
                     <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                   </div>
                   <div className="flex justify-between">
                     <span>Tax</span> 
                     <span className="font-mono">{formatCurrency(totals.taxTotal)}</span>
                   </div>
                   <div className="border-t border-gray-200 dark:border-gray-700 my-2 pt-2 flex justify-between font-bold text-gray-900 dark:text-white text-lg">
                     <span>Total</span> 
                     <span className="font-mono text-blue-600 dark:text-blue-400">{formatCurrency(totals.grandTotal)}</span>
                   </div>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900 rounded-b-xl flex justify-end gap-3">
          <button 
            onClick={onClose} 
            type="button"
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            form="invoice-modal-form" 
            disabled={isSubmitting} 
            className="px-5 py-2.5 text-sm font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 flex items-center gap-2 transition-all shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
            Save Invoice
          </button>
        </div>
      </div>
    </div>
  );
}