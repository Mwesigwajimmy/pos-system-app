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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[1400px] max-h-[95vh] flex flex-col bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in duration-300">
        
        <header className="flex items-center justify-between px-10 py-8 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-5">
            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-100">
                <Receipt className="text-white w-7 h-7" />
            </div>
            <div className="space-y-0.5">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Post New Invoice</h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Accounting Authorization Mode</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-red-500 transition-all p-3 rounded-2xl hover:bg-red-50">
            <X size={24} />
          </button>
        </header>

        <ScrollArea className="flex-1">
          <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-16 pb-32">
            
            {/* 1. PRIMARY METRICS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Customer Entity</Label>
                <select {...register("customerId")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-slate-50/50 text-sm font-bold focus:ring-4 focus:ring-blue-500/5 outline-none transition-all border-none shadow-inner">
                  <option value="">{isLoading ? "Syncing Directory..." : "Select Counterparty"}</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Billing Currency</Label>
                <select {...register("currency")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold shadow-sm outline-none focus:ring-2 focus:ring-blue-500/10">
                  {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} ({c.symbol})</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Issue Date</Label>
                <input type="date" {...register("issueDate")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold shadow-sm" />
              </div>

              <div className="space-y-3">
                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Net Maturity Date</Label>
                <input type="date" {...register("dueDate")} className="w-full h-12 px-4 border border-slate-200 rounded-2xl bg-white text-sm font-bold shadow-sm" />
              </div>
            </div>

            {/* 2. ADDRESS SUITE */}
            <div className="space-y-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight flex items-center gap-2">
                  <MapPin size={16} className="text-blue-600" /> Address Configuration
                </h3>
                <Button type="button" variant="outline" onClick={copyAddress} className="h-9 px-4 text-[10px] font-bold border-slate-200 rounded-xl shadow-sm gap-2 uppercase tracking-widest">
                  <Copy size={14} /> Synchronize Addresses
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {[
                  { title: "Billing Source", prefix: "billingAddress" as const },
                  { title: "Shipping Destination", prefix: "shippingAddress" as const }
                ].map((sect) => (
                  <div key={sect.title} className="space-y-6 p-8 rounded-3xl border border-slate-100 bg-slate-50/20">
                    <div className="flex items-center gap-3 text-slate-400">
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{sect.title}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Country</Label><Input {...register(`${sect.prefix}.country`)} className="h-10 rounded-xl border-none shadow-inner bg-white" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">City</Label><Input {...register(`${sect.prefix}.city`)} className="h-10 rounded-xl border-none shadow-inner bg-white" /></div>
                      <div className="space-y-2 col-span-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Building / Apartment</Label><Input {...register(`${sect.prefix}.building`)} className="h-10 rounded-xl border-none shadow-inner bg-white" /></div>
                      <div className="space-y-2 col-span-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Street Address</Label><Input {...register(`${sect.prefix}.street`)} className="h-10 rounded-xl border-none shadow-inner bg-white" /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Zip Code</Label><Input {...register(`${sect.prefix}.zip`)} className="h-10 rounded-xl border-none shadow-inner bg-white" /></div>
                      <div className="space-y-2 flex gap-3 items-end">
                        <Input {...register(`${sect.prefix}.latitude`)} placeholder="Lat" className="h-10 rounded-xl border-none shadow-inner bg-white text-[10px]" />
                        <Input {...register(`${sect.prefix}.longitude`)} placeholder="Long" className="h-10 rounded-xl border-none shadow-inner bg-white text-[10px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 3. ITEM DATA GRID */}
            <div className="space-y-6">
              <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Line Item Verification</h3>
              </div>

              <div className="rounded-3xl border border-slate-100 shadow-2xl shadow-slate-200/40 overflow-hidden">
                <ScrollArea className="w-full">
                  <Table>
                    <TableHeader className="bg-slate-50/80">
                      <TableRow className="h-14 border-none hover:bg-transparent">
                        <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase">S.No</TableHead>
                        <TableHead className="min-w-[400px] border-l-2 border-red-500/20 font-bold text-slate-400 text-[10px] uppercase">Product Description & Specifications</TableHead>
                        <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Qty</TableHead>
                        <TableHead className="w-32 text-right font-bold text-slate-400 text-[10px] uppercase">Rate ({selectedCurrency})</TableHead>
                        <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Disc (%)</TableHead>
                        <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Tax (%)</TableHead>
                        <TableHead className="w-40 text-right pr-10 font-bold text-slate-400 text-[10px] uppercase">Line Total</TableHead>
                        <TableHead className="w-12"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fields.map((field, index) => (
                        <TableRow key={field.id} className="hover:bg-slate-50/30 transition-all border-b-slate-50 align-top">
                          <TableCell className="text-center pt-8 font-bold text-slate-300 text-sm">{index + 1}</TableCell>
                          <TableCell className="py-6 space-y-3">
                            <Input {...register(`items.${index}.productName`)} className="h-11 rounded-xl border-slate-200 font-bold text-sm bg-white" placeholder="Product or service identifier" />
                            <Textarea {...register(`items.${index}.description`)} className="min-h-[100px] rounded-xl border-slate-100 bg-slate-50/50 text-xs p-4 resize-none shadow-inner" placeholder="Provide detailed technical specifications..." />
                          </TableCell>
                          <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.quantity`)} className="h-11 rounded-xl text-center font-bold bg-white" /></TableCell>
                          <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.unitPrice`)} className="h-11 rounded-xl text-right font-bold bg-white" /></TableCell>
                          <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.discount`)} className="h-11 rounded-xl text-center font-bold bg-amber-50/30 border-amber-100" /></TableCell>
                          <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.taxRate`)} className="h-11 rounded-xl text-center font-bold bg-blue-50/30 border-blue-100 text-blue-600" /></TableCell>
                          <TableCell className="pt-6 text-right pr-10 font-bold text-slate-900 text-sm pt-9">
                             {formatCurrency(Money.multiply(watchedItems[index]?.unitPrice || 0, watchedItems[index]?.quantity || 0))}
                          </TableCell>
                          <TableCell className="pt-8">
                            <button type="button" onClick={() => remove(index)} disabled={fields.length === 1} className="text-slate-200 hover:text-red-500 transition-colors p-2 hover:bg-red-50 rounded-xl">
                              <Trash2 size={20}/>
                            </button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <ScrollBar orientation="horizontal" />
                </ScrollArea>
                <div className="p-8 bg-slate-50/50 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => append({ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })} className="h-12 px-8 rounded-2xl border-blue-600 border-2 text-blue-600 font-bold text-xs uppercase hover:bg-blue-600 hover:text-white transition-all shadow-lg shadow-blue-100 gap-3">
                    <Plus size={18}/> Append Transaction Line
                  </Button>
                </div>
              </div>
            </div>

            {/* 4. FINAL SUMMARY & NOTES */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-10">
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <Info size={14} className="text-blue-500" /> Contractual Terms & Conditions
                  </Label>
                  <Textarea {...register("termsAndConditions")} className="min-h-[160px] rounded-[2rem] border-none bg-slate-50/50 p-6 shadow-inner text-sm font-medium text-slate-600 outline-none focus:ring-4 focus:ring-blue-500/5" placeholder="Specify settlement terms, delivery window, and legal obligations..." />
                </div>
                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                    <FileText size={14} className="text-blue-500" /> Internal Administrative Remarks
                  </Label>
                  <Textarea {...register("additionalDescription")} className="min-h-[160px] rounded-[2rem] border-none bg-slate-50/50 p-6 shadow-inner text-sm font-medium text-slate-600 outline-none" placeholder="Private internal notes regarding project scope or ledger allocation..." />
                </div>
              </div>

              <div className="space-y-8">
                <Card className="rounded-[3rem] border-none bg-slate-900 text-white shadow-2xl p-12 space-y-10">
                  <div className="space-y-6">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <span>Operational Sub Total</span>
                      <span className="text-white text-sm">{formatCurrency(totals.subTotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                      <span>Aggregate Discount Applied</span>
                      <span className="text-sm">-{formatCurrency(totals.totalDiscount)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                      <span>Fiscal Tax Obligation</span>
                      <span className="text-sm">+{formatCurrency(totals.totalTax)}</span>
                    </div>
                    <div className="pt-6 border-t border-white/5 flex justify-between items-center">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Adjustment ({selectedCurrency})</span>
                      <Input type="number" {...register("adjustment")} className="w-32 h-11 border-none bg-white/5 rounded-xl text-right font-bold text-white shadow-inner focus:ring-4 focus:ring-blue-500/10" />
                    </div>
                  </div>

                  <div className="pt-10 border-t-2 border-white/10 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Total Valuation</p>
                      <h4 className="text-5xl font-bold text-white tracking-tighter tabular-nums leading-none">
                        {formatCurrency(totals.grandTotal)}
                      </h4>
                    </div>
                    <Badge className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest border-none mb-2">Net Sum</Badge>
                  </div>

                  <Button 
                      type="submit" 
                      disabled={isSubmitting} 
                      className="w-full h-20 bg-white hover:bg-blue-50 text-slate-900 font-bold uppercase tracking-[0.2em] text-sm rounded-[2rem] shadow-2xl transition-all active:scale-95 disabled:opacity-50 py-8 flex gap-4"
                  >
                      {isSubmitting ? (
                        <><Loader2 className="animate-spin h-6 w-6" /> Authorizing Protocol</>
                      ) : (
                        <><Save size={24}/> Authorize & Post Invoice</>
                      )}
                  </Button>
                </Card>

                <div className="flex justify-center items-center gap-3 opacity-30 pt-4">
                    <CheckCircle2 size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">Audited Ledger Entry v1.0</span>
                </div>
              </div>
            </div>
          </form>
        </ScrollArea>
      </div>
    </div>
  );
}