"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  Receipt, CheckCircle2, Globe, MapPin, 
  CreditCard, Info, FileText, Copy, ArrowRight, RefreshCcw
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

const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100,
  calculateTax: (amount: number, rate: number) => Math.round((amount * (rate / 100) + Number.EPSILON) * 100) / 100
};

const addressSchema = z.object({
  country: z.string().optional(),
  building: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip: z.string().optional(),
  latitude: z.string().optional(),
  longitude: z.string().optional(),
});

const invoiceSchema = z.object({
  customerId: z.string().min(1, "Customer identity required"),
  currency: z.string().min(1, "Currency selection required"),
  exchangeRate: z.coerce.number().min(0.000001, "Manual rate required"),
  issueDate: z.string().min(1, "Issue date required"),
  dueDate: z.string().min(1, "Maturity date required"),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  termsAndConditions: z.string().optional(),
  additionalDescription: z.string().optional(),
  adjustment: z.coerce.number().default(0),
  items: z.array(z.object({
    productName: z.string().min(1, "Item identification required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.001, "Quantity must be positive"), 
    unitPrice: z.coerce.number().min(0, "Price basis required"),
    discount: z.coerce.number().default(0),
    taxRate: z.coerce.number().default(0),
  })).min(1, "At least one line item is mandatory"),
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

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  onSuccess?: () => void; 
}

export default function CreateInvoiceModal({ isOpen, onClose, tenantId, userId, onSuccess }: CreateInvoiceModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const supabase = createClient();
  const router = useRouter();

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      currency: 'USD',
      exchangeRate: 1.0,
      issueDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      adjustment: 0,
      items: [{ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 }]
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");
  const selectedCurrency = watch("currency");
  const adjustment = watch("adjustment");
  const currencyMeta = CURRENCIES.find(c => c.code === selectedCurrency) || CURRENCIES[0];

  useEffect(() => {
    if (!isOpen) return;
    async function fetchData() {
      const { data } = await supabase.from('customers').select('id, name').eq('business_id', tenantId).eq('is_active', true);
      if (data) setCustomers(data);
      setIsLoading(false);
    }
    fetchData();
  }, [isOpen, tenantId, supabase]);

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    watchedItems.forEach(item => {
      const lineBase = Money.multiply(item.unitPrice, item.quantity);
      const discountAmount = (lineBase * (Number(item.discount || 0) / 100));
      const taxableAmount = lineBase - discountAmount;
      const lineTax = Money.calculateTax(taxableAmount, item.taxRate);
      
      subTotal += lineBase;
      totalDiscount += discountAmount;
      totalTax += lineTax;
    });

    return {
      subTotal,
      totalDiscount,
      totalTax,
      grandTotal: subTotal - totalDiscount + totalTax + Number(adjustment)
    };
  }, [watchedItems, adjustment]);

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat(currencyMeta.locale, { style: 'currency', currency: currencyMeta.code }).format(val);

  const copyAddress = () => {
    const billing = watch('billingAddress');
    setValue('shippingAddress', billing);
    toast.success("Shipping address synchronized");
  };

  const onSubmit: SubmitHandler<InvoiceFormValues> = async (data) => {
    setIsSubmitting(true);
    try {
      const { data: inv, error } = await supabase.from('invoices').insert({
        tenant_id: tenantId,
        business_id: tenantId,
        customer_id: data.customerId,
        total: totals.grandTotal,
        currency_code: data.currency,
        status: 'ISSUED',
        metadata: { ...data }
      }).select('id').single();

      if (error) throw error;
      toast.success("Ledger Entry Authorized");
      onSuccess?.();
      onClose();
    } catch (err: any) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="relative w-full max-w-[1200px] max-h-[95vh] flex flex-col bg-white rounded-xl shadow-2xl overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200">
        
        <header className="flex items-center justify-between px-6 py-5 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-md">
                <Receipt className="text-white w-6 h-6" />
            </div>
            <div className="space-y-0.5">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">Authorize Ledger Posting</h2>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Post-Trade Reconciliation Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-all p-2 rounded-lg hover:bg-slate-50">
            <X size={20} />
          </button>
        </header>

        <ScrollArea className="flex-1">
          <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="p-6 md:p-10 space-y-12">
            
            {/* 1. PRIMARY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Customer Entity</Label>
                <select {...register("customerId")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-slate-50 font-medium text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all">
                  <option value="">{isLoading ? "Syncing..." : "Select Counterparty"}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Currency</Label>
                <select {...register("currency")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-bold outline-none">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Issue Date</Label>
                <input type="date" {...register("issueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-medium" />
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider ml-1">Net Maturity</Label>
                <input type="date" {...register("dueDate")} className="w-full h-10 px-3 border border-slate-200 rounded-lg bg-white text-xs font-medium" />
              </div>
            </div>

            {/* 2. ADDRESS SUITE */}
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={14} className="text-blue-600" /> Site Configuration
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={copyAddress} className="h-8 px-3 text-[9px] font-bold text-blue-600 rounded-lg border border-slate-100 gap-1.5 uppercase tracking-wider">
                  <Copy size={12} /> Sync Addresses
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {[
                  { title: "Billing Point", prefix: "billingAddress" as const },
                  { title: "Shipping Destination", prefix: "shippingAddress" as const }
                ].map((sect) => (
                  <div key={sect.title} className="space-y-4 p-6 rounded-xl border border-slate-100 bg-slate-50/20">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">{sect.title}</span>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5"><Label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Country</Label><Input {...register(`${sect.prefix}.country`)} className="h-9 rounded-lg text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">City</Label><Input {...register(`${sect.prefix}.city`)} className="h-9 rounded-lg text-xs" /></div>
                      <div className="space-y-1.5 col-span-2"><Label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Street / Building</Label><Input {...register(`${sect.prefix}.building`)} className="h-9 rounded-lg text-xs" /></div>
                      <div className="space-y-1.5"><Label className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">Zip Code</Label><Input {...register(`${sect.prefix}.zip`)} className="h-9 rounded-lg text-xs" /></div>
                      <div className="space-y-1.5 flex gap-2 items-end">
                        <Input {...register(`${sect.prefix}.latitude`)} placeholder="Lat" className="h-9 rounded-lg text-[9px]" />
                        <Input {...register(`${sect.prefix}.longitude`)} placeholder="Long" className="h-9 rounded-lg text-[9px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. ITEM DATA GRID */}
            <div className="space-y-4">
              <h3 className="text-[10px] font-bold text-slate-800 uppercase tracking-widest border-l-2 border-blue-600 pl-3">Line Entry Verification</h3>

              <div className="rounded-xl border border-slate-200 shadow-sm overflow-hidden bg-white">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="h-11">
                        <TableHead className="w-12 text-center text-[9px] font-bold uppercase text-slate-500">S.N</TableHead>
                        <TableHead className="min-w-[320px] text-[9px] font-bold uppercase text-slate-500">Description & Technical Spec</TableHead>
                        <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Qty</TableHead>
                        <TableHead className="w-28 text-right text-[9px] font-bold uppercase text-slate-500">Rate</TableHead>
                        <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Disc %</TableHead>
                        <TableHead className="w-20 text-center text-[9px] font-bold uppercase text-slate-500">Tax %</TableHead>
                        <TableHead className="w-32 text-right pr-6 text-[9px] font-bold uppercase text-slate-500">Total</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id} className="hover:bg-slate-50/50 transition-all border-b last:border-none">
                          <TableCell className="text-center pt-5 text-xs font-bold text-slate-300">{index + 1}</TableCell>
                          <TableCell className="py-4 space-y-2">
                            <Input {...register(`items.${index}.productName`)} className="h-9 rounded-lg text-xs font-bold" placeholder="Item Identifier" />
                            <Textarea {...register(`items.${index}.description`)} className="min-h-[60px] text-[10px] p-2 resize-none bg-slate-50/30" placeholder="Specifications..." />
                          </TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.quantity`)} className="h-9 rounded-lg text-center font-bold text-xs" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.unitPrice`)} className="h-9 rounded-lg text-right font-bold text-xs" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.discount`)} className="h-9 rounded-lg text-center text-xs bg-amber-50/30" /></TableCell>
                          <TableCell className="align-top pt-4"><Input type="number" {...register(`items.${index}.taxRate`)} className="h-9 rounded-lg text-center text-xs bg-blue-50/30 text-blue-600" /></TableCell>
                          <TableCell className="align-top pt-6 text-right pr-6 font-bold text-slate-900 text-xs">
                             {formatCurrency(Money.multiply(watchedItems[index]?.unitPrice || 0, watchedItems[index]?.quantity || 0))}
                          </TableCell>
                          <TableCell className="align-top pt-4">
                            <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-300 hover:text-red-500 transition-colors p-1.5 hover:bg-red-50 rounded-lg">
                              <Trash2 size={16}/>
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="p-4 bg-slate-50/50 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })} className="h-9 px-4 border-blue-600 text-blue-600 font-bold text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-sm gap-2">
                    <Plus size={14}/> Append Line Entry
                  </Button>
                </div>
              </div>
            </div>

            {/* 4. FINAL SUMMARY & NOTES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start pb-10">
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Info size={14} className="text-blue-500" /> Contractual Terms
                  </Label>
                  <Textarea {...register("termsAndConditions")} className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50/30 p-4 text-xs font-medium text-slate-600" placeholder="Specify settlement and legal terms..." />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <FileText size={14} className="text-blue-500" /> Internal Remarks
                  </Label>
                  <Textarea {...register("additionalDescription")} className="min-h-[100px] rounded-xl border-slate-200 bg-slate-50/30 p-4 text-xs font-medium text-slate-600" placeholder="Private internal audit notes..." />
                </div>
              </div>

              <div className="space-y-6">
                <Card className="rounded-2xl border-none bg-slate-900 text-white shadow-xl p-8 space-y-6">
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Operational Sub Total</span>
                      <span className="text-white text-xs">{formatCurrency(totals.subTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-rose-400 uppercase tracking-widest">
                      <span>Aggregate Discount</span>
                      <span className="text-xs">-{formatCurrency(totals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] font-bold text-blue-400 uppercase tracking-widest">
                      <span>Fiscal Tax Obligation</span>
                      <span className="text-xs">+{formatCurrency(totals.totalTax)}</span>
                    </div>
                    <div className="pt-3 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Adjustment ({selectedCurrency})</span>
                      <Input type="number" {...register("adjustment")} className="w-24 h-8 border-none bg-white/10 rounded-md text-right font-bold text-white text-xs" />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-white/10 flex justify-between items-end">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Post-Trade Sum</p>
                      <h4 className="text-2xl font-bold text-white tracking-tight tabular-nums">
                        {formatCurrency(totals.grandTotal)}
                      </h4>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold px-3 py-1 rounded-md text-[8px] uppercase tracking-wider border-none">Net Balance</Badge>
                  </div>

                  <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 font-bold uppercase tracking-widest text-[11px] rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50 flex gap-3"
                  >
                      {isSubmitting ? (
                        <><Loader2 className="animate-spin h-4 w-4" /> Authorizing...</>
                      ) : (
                        <><CheckCircle2 size={16}/> Authorize Ledger Posting</>
                      )}
                  </Button>
                </Card>

                <div className="flex justify-center items-center gap-2 opacity-30">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span className="text-[8px] font-bold text-slate-500 uppercase tracking-[0.3em]">Audited Ledger Entry Verified</span>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>
      </div>
    </div>
  );
}