"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  Receipt, CheckCircle2, Globe, MapPin, 
  CreditCard, Info, FileText, Copy, ArrowRight
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
  customerId: z.string().min(1, "Customer required"),
  currency: z.string().min(1),
  exchangeRate: z.coerce.number().min(0.000001),
  issueDate: z.string().min(1),
  dueDate: z.string().min(1),
  billingAddress: addressSchema,
  shippingAddress: addressSchema,
  termsAndConditions: z.string().optional(),
  additionalDescription: z.string().optional(),
  adjustment: z.coerce.number().default(0),
  items: z.array(z.object({
    productName: z.string().min(1, "Required"),
    description: z.string().optional(),
    quantity: z.coerce.number().min(0.001), 
    unitPrice: z.coerce.number().min(0),
    discount: z.coerce.number().default(0),
    taxRate: z.coerce.number().default(0),
  })).min(1),
});

type InvoiceFormValues = z.infer<typeof invoiceSchema>;

const CURRENCIES = [
  { code: 'USD', symbol: '$' },
  { code: 'EUR', symbol: '€' },
  { code: 'GBP', symbol: '£' },
  { code: 'UGX', symbol: 'Sh' }
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
  const adjustment = watch("adjustment");

  useEffect(() => {
    if (!isOpen) return;
    async function fetchData() {
      const { data } = await supabase.from('customers').select('id, name').eq('is_active', true);
      if (data) setCustomers(data);
      setIsLoading(false);
    }
    fetchData();
  }, [isOpen]);

  const totals = useMemo(() => {
    let subTotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    watchedItems.forEach(item => {
      const lineAmount = Money.multiply(item.unitPrice, item.quantity);
      const lineTax = Money.calculateTax(lineAmount - item.discount, item.taxRate);
      subTotal += lineAmount;
      totalDiscount += Number(item.discount);
      totalTax += lineTax;
    });

    return {
      subTotal,
      totalDiscount,
      totalTax,
      grandTotal: subTotal - totalDiscount + totalTax + Number(adjustment)
    };
  }, [watchedItems, adjustment]);

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
        customer_id: data.customerId,
        total: totals.grandTotal,
        status: 'ISSUED',
        metadata: { ...data }
      }).select('id').single();

      if (error) throw error;
      toast.success("Invoice successfully generated");
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-sm">
      <div className="relative w-full max-w-[1300px] max-h-[95vh] flex flex-col bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-200">
        
        <header className="flex items-center justify-between px-10 py-6 border-b border-slate-100">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-slate-900">New Fiscal Invoice</h2>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Transaction Record ID: INV-2026-F1</p>
          </div>
          <Button variant="ghost" onClick={onClose} className="rounded-xl h-10 w-10 p-0 text-slate-400 hover:text-red-500 hover:bg-red-50">
            <X size={20} />
          </Button>
        </header>

        <ScrollArea className="flex-1">
          <form id="invoice-form" onSubmit={handleSubmit(onSubmit)} className="p-10 space-y-12 pb-24">
            
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Address Information</h3>
                <Button type="button" variant="outline" onClick={copyAddress} className="h-9 px-4 text-xs font-bold border-slate-200 rounded-lg shadow-sm gap-2">
                  <Copy size={14} /> Copy Billing to Shipping
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                {[
                  { title: "Billing Address", prefix: "billingAddress" as const },
                  { title: "Shipping Address", prefix: "shippingAddress" as const }
                ].map((sect) => (
                  <div key={sect.title} className="space-y-5 p-6 rounded-2xl border border-slate-100 bg-slate-50/30">
                    <div className="flex items-center gap-2 text-blue-600 mb-2">
                      <MapPin size={16} />
                      <span className="text-xs font-bold uppercase tracking-widest">{sect.title}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-4 items-center">
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">Country / Region</Label>
                      <Input {...register(`${sect.prefix}.country`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1 leading-tight">Flat / House / Building</Label>
                      <Input {...register(`${sect.prefix}.building`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">Street Address</Label>
                      <Input {...register(`${sect.prefix}.street`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">City</Label>
                      <Input {...register(`${sect.prefix}.city`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">State / Province</Label>
                      <Input {...register(`${sect.prefix}.state`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">Zip / Postal Code</Label>
                      <Input {...register(`${sect.prefix}.zip`)} className="col-span-2 h-9 rounded-lg border-slate-200" />
                      
                      <Label className="text-xs font-semibold text-slate-500 col-span-1">Coordinates</Label>
                      <div className="col-span-2 flex gap-2">
                        <Input {...register(`${sect.prefix}.latitude`)} placeholder="Latitude" className="h-9 rounded-lg border-slate-200 text-[10px]" />
                        <Input {...register(`${sect.prefix}.longitude`)} placeholder="Longitude" className="h-9 rounded-lg border-slate-200 text-[10px]" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4 py-1">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Invoiced Items</h3>
              </div>

              <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="h-12 border-none">
                      <TableHead className="w-16 text-center font-bold text-slate-400 text-[10px] uppercase">S.NO</TableHead>
                      <TableHead className="min-w-[350px] border-l-2 border-red-500/20 font-bold text-slate-400 text-[10px] uppercase">Product Name & Detail</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Quantity</TableHead>
                      <TableHead className="w-32 text-right font-bold text-slate-400 text-[10px] uppercase">List Price($)</TableHead>
                      <TableHead className="w-32 text-right font-bold text-slate-400 text-[10px] uppercase">Amount($)</TableHead>
                      <TableHead className="w-32 text-right font-bold text-slate-400 text-[10px] uppercase">Discount($)</TableHead>
                      <TableHead className="w-24 text-center font-bold text-slate-400 text-[10px] uppercase">Tax(%)</TableHead>
                      <TableHead className="w-40 text-right pr-8 font-bold text-slate-400 text-[10px] uppercase">Line Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {fields.map((field, index) => (
                      <TableRow key={field.id} className="hover:bg-slate-50/50 transition-colors border-b-slate-100 align-top">
                        <TableCell className="text-center pt-8 font-bold text-slate-400 text-sm">{index + 1}</TableCell>
                        <TableCell className="py-6 space-y-3">
                          <Input {...register(`items.${index}.productName`)} className="h-10 rounded-lg border-slate-200 font-semibold" placeholder="Product name" />
                          <Textarea {...register(`items.${index}.description`)} className="min-h-[80px] rounded-lg border-slate-100 bg-slate-50/30 text-xs p-3 resize-none" placeholder="Description information..." />
                        </TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.quantity`)} className="h-10 text-center font-bold" /></TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.unitPrice`)} className="h-10 text-right font-bold" /></TableCell>
                        <TableCell className="pt-6 text-right font-semibold text-slate-400 text-sm">
                           ${(watchedItems[index]?.unitPrice * watchedItems[index]?.quantity).toLocaleString()}
                        </TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.discount`)} className="h-10 text-right font-bold bg-amber-50/30" /></TableCell>
                        <TableCell className="pt-6"><Input type="number" {...register(`items.${index}.taxRate`)} className="h-10 text-center font-bold bg-blue-50/30" /></TableCell>
                        <TableCell className="pt-6 text-right pr-8 font-bold text-slate-900">
                          ${((watchedItems[index]?.unitPrice * watchedItems[index]?.quantity) - Number(watchedItems[index]?.discount || 0)).toLocaleString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="p-5 bg-slate-50/50 border-t border-slate-100">
                  <Button type="button" variant="outline" onClick={() => append({ productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, taxRate: 0 })} className="h-10 px-6 rounded-lg border-blue-600 border-2 text-blue-600 font-bold text-xs uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm gap-2">
                    <Plus size={16}/> Add New Row
                  </Button>
                </div>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
              <div className="space-y-10">
                <div className="space-y-4">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Info size={14} className="text-blue-500" /> Terms and Conditions
                  </Label>
                  <Textarea {...register("termsAndConditions")} className="min-h-[140px] rounded-xl border-slate-200 bg-white p-5 shadow-inner text-xs font-medium text-slate-600" placeholder="Specify settlement terms, delivery timelines..." />
                </div>
                <div className="space-y-4">
                  <Label className="text-xs font-bold text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <FileText size={14} className="text-blue-500" /> Description Information
                  </Label>
                  <Textarea {...register("additionalDescription")} className="min-h-[140px] rounded-xl border-slate-200 bg-white p-5 shadow-inner text-xs font-medium text-slate-600" placeholder="Add relevant notes or internal project descriptors..." />
                </div>
              </div>

              <div className="space-y-8">
                <Card className="rounded-3xl border border-slate-100 bg-white shadow-xl p-10 space-y-6">
                  {[
                    { label: "Sub Total ($)", value: totals.subTotal },
                    { label: "Discount ($)", value: totals.totalDiscount, color: "text-red-500" },
                    { label: "Tax ($)", value: totals.totalTax, color: "text-blue-600" }
                  ].map((row) => (
                    <div key={row.label} className="flex justify-between items-center pb-2 border-b border-slate-50">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{row.label}</span>
                      <span className={`text-sm font-bold ${row.color || "text-slate-900"}`}>{row.value.toLocaleString()}</span>
                    </div>
                  ))}

                  <div className="flex justify-between items-center pt-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Adjustment ($)</span>
                    <Input type="number" {...register("adjustment")} className="w-28 h-9 text-right font-bold border-slate-100 rounded-lg bg-slate-50/50" />
                  </div>

                  <div className="pt-8 border-t-2 border-slate-900 flex justify-between items-end">
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Payable Amount</p>
                      <h4 className="text-4xl font-bold text-slate-900 tracking-tighter tabular-nums leading-none">
                        ${totals.grandTotal.toLocaleString()}
                      </h4>
                    </div>
                    <Badge className="bg-slate-900 text-white px-4 py-2 rounded-xl text-[10px] font-bold uppercase">USD Fiscal Base</Badge>
                  </div>
                </Card>

                <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-widest text-sm rounded-2xl shadow-xl shadow-blue-200 transition-all active:scale-95 gap-3"
                >
                    {isSubmitting ? <Loader2 className="animate-spin h-5 w-5" /> : <><CheckCircle2 size={20}/> Finalize & Authorize Invoice</>}
                </Button>
              </div>
            </div>
          </form>
          <ScrollBar />
        </ScrollArea>

        <footer className="px-10 py-6 border-t border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                <CheckCircle2 size={14} className="text-emerald-500" /> Digital Ledger Synchronized
            </div>
            <div className="flex items-center gap-2 text-slate-500 font-semibold text-xs">
                System Status: <span className="text-emerald-600">Online</span>
            </div>
        </footer>
      </div>
    </div>
  );
}