"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Trash2, Loader2, Save, Calendar, User, AlertCircle, ArrowLeft, Receipt } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// --- 1. Enterprise Financial Utilities ---
// Handles floating point math safely by converting to integers (cents) before calculating.
const Money = {
  toCents: (amount: number) => Math.round(amount * 100),
  fromCents: (cents: number) => cents / 100,
  multiply: (amount: number, quantity: number) => {
    return (Math.round(amount * 100) * quantity) / 100;
  },
  calculateTax: (amount: number, rate: number) => {
    // Rounding strategy: Standard Rounding (Commercial)
    return Math.round((amount * (rate / 100)) * 100) / 100;
  }
};

// --- 2. Date Utilities ---
// Prevents timezone bugs where "today" shows as "yesterday" due to UTC conversion
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
    quantity: z.coerce.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.coerce.number().min(0, "Price cannot be negative"),
    taxRate: z.coerce.number().min(0).max(100, "Tax cannot exceed 100%").default(0),
  })).min(1, "You must add at least one line item"),
}).refine((data) => {
  return new Date(data.dueDate) >= new Date(data.issueDate);
}, {
  message: "Due date cannot be earlier than the issue date",
  path: ["dueDate"],
});

// Infer strict type from Zod schema
type InvoiceFormValues = z.infer<typeof invoiceSchema>;

// --- 4. Configuration & Types ---
const CURRENCIES = [
  { code: 'USD', symbol: '$', locale: 'en-US' },
  { code: 'EUR', symbol: '€', locale: 'de-DE' },
  { code: 'GBP', symbol: '£', locale: 'en-GB' },
  { code: 'UGX', symbol: 'USh', locale: 'en-UG' },
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
  
  const supabase = createClient();
  const router = useRouter();

  // --- 5. Data Fetching ---
 useEffect(() => {
  let isMounted = true;
  const fetchCustomers = async () => {
    try {
      // 1. ORIGINAL QUERY: Logic remains exactly as you had it
      // Added .or to check business_id too, ensuring Jimmy (ID 12) is found
      const { data, error } = await supabase
        .from('customers')
        .select('id, name, email, vat_number, tenant_id, business_id')
        .or(`tenant_id.eq.${tenantId},business_id.eq.${tenantId}`)
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;

      if (isMounted && data) {
        // 2. THE ENTERPRISE BRIDGE: 
        // We map the data to ensure 'id' is a string so your Zod schema 
        // customerId: z.string() doesn't reject Mwesigwa Jimmy (ID 12).
        const formattedCustomers = data.map((customer) => ({
          ...customer,
          id: String(customer.id) // This is the fix for the empty dropdown
        }));

        setCustomers(formattedCustomers);
      }
    } catch (err: any) {
      console.error("Error fetching customers:", err);
    } finally {
      if (isMounted) setIsLoadingCustomers(false);
    }
  };

  if (tenantId) {
    fetchCustomers();
  }
  
  return () => { isMounted = false; };
}, [tenantId, supabase]);
  // --- 6. Form Initialization ---
  // Note: We do NOT pass <InvoiceFormValues> to useForm. We let Zod infer it.
  const { 
    register, 
    control, 
    handleSubmit, 
    watch, 
    formState: { errors } 
  } = useForm({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customerId: '',
      currency: 'USD',
      issueDate: getLocalDateString(),
      dueDate: getFutureDateString(14), // Default Net 14
      notes: '', 
      items: [{ description: '', quantity: 1, unitPrice: 0, taxRate: 0 }]
    },
    mode: 'onBlur'
  });

  const { fields, append, remove } = useFieldArray({ 
    control, 
    name: "items"
  });
  
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
      // Step A: Insert Invoice Header
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
          status: 'DRAFT', // Best practice: start as Draft
          created_by: userId,
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (invoiceError) throw new Error(`Invoice Header Error: ${invoiceError.message}`);
      createdInvoiceId = invoiceData.id;

      // Step B: Prepare Line Items
      const lineItems = data.items.map(item => ({
        invoice_id: createdInvoiceId!,
        tenant_id: tenantId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate,
        total: Money.multiply(item.unitPrice, item.quantity) // Store pre-calculated line total
      }));

      // Step C: Insert Items
      const { error: itemsError } = await supabase.from('invoice_items').insert(lineItems);

      // Step D: Rollback Strategy
      // If items fail to save, we must delete the header so we don't have empty invoices.
      if (itemsError) {
        console.error("Item insertion failed, rolling back invoice header...");
        await supabase.from('invoices').delete().eq('id', createdInvoiceId);
        throw new Error(`Line Item Error: ${itemsError.message}`);
      }

      // Step E: Success
      router.push(`/${locale}/invoicing/to-be-issued`);
      router.refresh();

    } catch (error: any) {
      console.error(error);
      setSubmitError(error.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
            <Receipt className="h-8 w-8 text-blue-600" />
            Create Invoice
          </h1>
          <p className="text-gray-500 mt-1">Draft a new invoice for your customers.</p>
        </div>
        <button 
          onClick={() => router.back()} 
          type="button"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2 transition-colors disabled:opacity-50"
        >
          <ArrowLeft size={16} /> Cancel
        </button>
      </div>

      {/* Error Alert */}
      {submitError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-sm font-semibold">Submission Failed</h3>
            <p className="text-sm mt-1 opacity-90">{submitError}</p>
          </div>
        </div>
      )}

      <Card className="border-t-4 border-t-blue-600 shadow-lg">
        <CardHeader className="pb-4 border-b border-gray-100">
          <CardTitle className="text-lg font-semibold text-gray-900">Invoice Configuration</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            
            {/* Top Grid: Customer & Metadata */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
              
              {/* Customer Select - Spans 5 columns */}
              <div className="lg:col-span-5 space-y-2">
                <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <User size={16} className="text-blue-600" /> Customer <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select 
                    {...register("customerId")} 
                    disabled={isLoadingCustomers || isSubmitting}
                    className="w-full h-11 px-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 transition-shadow appearance-none"
                  >
                    <option value="">{isLoadingCustomers ? "Loading customers..." : "Select a customer..."}</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {/* Custom Arrow */}
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"/></svg>
                  </div>
                </div>
                {errors.customerId && <p className="text-red-600 text-xs font-medium mt-1">{errors.customerId.message as string}</p>}
              </div>

              {/* Currency - Spans 2 columns */}
              <div className="lg:col-span-3 space-y-2">
                 <label className="text-sm font-semibold text-gray-700">Currency</label>
                 <select {...register("currency")} className="w-full h-11 px-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm focus:ring-blue-500">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                 </select>
              </div>

              {/* Dates - Spans 4 columns */}
              <div className="lg:col-span-4 grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" /> Issue Date
                  </label>
                  <input type="date" {...register("issueDate")} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500" />
                  {errors.issueDate && <p className="text-red-600 text-xs mt-1">Required</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                    <Calendar size={16} className="text-gray-400" /> Due Date
                  </label>
                  <input type="date" {...register("dueDate")} className="w-full h-11 px-3 border border-gray-300 rounded-lg focus:ring-blue-500" />
                </div>
              </div>
            </div>
            {errors.dueDate && <p className="text-red-600 text-sm bg-red-50 p-2 rounded">{errors.dueDate.message as string}</p>}

            {/* Line Items Table */}
            <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-200 text-gray-600 font-semibold uppercase tracking-wider text-xs">
                    <tr>
                      <th className="px-6 py-4 w-[40%]">Description</th>
                      <th className="px-4 py-4 w-24 text-center">Qty</th>
                      <th className="px-4 py-4 w-32 text-right">Unit Price</th>
                      <th className="px-4 py-4 w-24 text-center">Tax %</th>
                      <th className="px-6 py-4 w-36 text-right">Total</th>
                      <th className="px-4 py-4 w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {fields.map((field, index) => {
                      const qty = items?.[index]?.quantity || 0;
                      const price = items?.[index]?.unitPrice || 0;
                      const total = Money.multiply(Number(price), Number(qty));

                      return (
                        <tr key={field.id} className="group hover:bg-gray-50/50 transition-colors">
                          <td className="p-4 align-top">
                            <input 
                              {...register(`items.${index}.description` as const)} 
                              placeholder="e.g. Consulting Services" 
                              className="w-full p-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder:text-gray-300" 
                            />
                            {errors.items?.[index]?.description && <span className="text-red-500 text-xs font-medium ml-1">Required</span>}
                          </td>
                          <td className="p-4 align-top">
                            <input type="number" {...register(`items.${index}.quantity` as const)} className="w-full p-2.5 border border-gray-300 rounded-lg text-center focus:ring-blue-500" />
                          </td>
                          <td className="p-4 align-top">
                            <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-400">{currencyMeta.symbol}</span>
                              <input 
                                type="number" 
                                step="0.01" 
                                {...register(`items.${index}.unitPrice` as const)} 
                                className="w-full p-2.5 pl-7 border border-gray-300 rounded-lg text-right focus:ring-blue-500" 
                              />
                            </div>
                          </td>
                          <td className="p-4 align-top">
                            <input type="number" step="0.1" {...register(`items.${index}.taxRate` as const)} className="w-full p-2.5 border border-gray-300 rounded-lg text-center focus:ring-blue-500" />
                          </td>
                          <td className="p-4 text-right align-top pt-5 font-semibold text-gray-700 font-mono">
                            {formatCurrency(total)}
                          </td>
                          <td className="p-4 text-center align-top pt-3">
                            <button 
                              type="button" 
                              onClick={() => remove(index)} 
                              disabled={fields.length === 1} 
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-20 disabled:hover:bg-transparent"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
                 <button 
                  type="button" 
                  onClick={() => append({ description: '', quantity: 1, unitPrice: 0, taxRate: 0 })} 
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                >
                  <Plus size={16} /> Add Line Item
                </button>
                <span className="text-xs text-gray-400 italic">Values automatically calculated</span>
              </div>
            </div>

            {/* Bottom Section: Notes & Totals */}
            <div className="flex flex-col lg:flex-row gap-8 pt-4">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-semibold text-gray-700">Payment Terms / Notes</label>
                <textarea 
                  {...register("notes")} 
                  className="w-full p-4 border border-gray-300 rounded-xl text-sm h-40 focus:ring-2 focus:ring-blue-500 transition-shadow resize-none" 
                  placeholder="Thank you for your business. Please pay within 14 days..."
                ></textarea>
              </div>

              <div className="w-full lg:w-96">
                <div className="bg-gray-50 rounded-xl p-6 border border-gray-200 space-y-4">
                  <h3 className="text-gray-900 font-semibold mb-4">Invoice Summary</h3>
                   <div className="flex justify-between text-sm text-gray-600">
                      <span>Subtotal</span> 
                      <span className="font-mono">{formatCurrency(totals.subtotal)}</span>
                   </div>
                   <div className="flex justify-between text-sm text-gray-600">
                      <span>Tax (VAT/GST)</span> 
                      <span className="font-mono">{formatCurrency(totals.taxTotal)}</span>
                   </div>
                   <div className="border-t border-gray-300 my-4"></div>
                   <div className="flex justify-between items-center">
                     <span className="font-bold text-gray-900">Total Due</span>
                     <span className="font-bold text-2xl text-blue-600 font-mono">{formatCurrency(totals.grandTotal)}</span>
                   </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="w-full mt-6 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg shadow-blue-600/20 flex justify-center items-center gap-3 transition-all transform active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <Save className="h-5 w-5" />} 
                  {isSubmitting ? 'Saving Invoice...' : 'Create & Save Invoice'}
                </button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}