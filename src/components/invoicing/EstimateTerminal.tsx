"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  X, Plus, Trash2, Loader2, Save, AlertCircle, 
  FileText, User, Globe, Ship, CheckCircle2, Calculator 
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import toast from 'react-hot-toast';

// Financial Utilities (BBU1 Logic)
const Money = {
  round: (val: number) => Math.round((val + Number.EPSILON) * 100) / 100,
  multiply: (amount: number, qty: number) => Math.round((amount * qty + Number.EPSILON) * 100) / 100
};

const estimateSchema = z.object({
  customerId: z.string().min(1, "Customer entity required"),
  title: z.string().min(3, "Quote title required"),
  validUntil: z.string().min(1, "Expiry date required"),
  currency: z.string().min(3),
  items: z.array(z.object({
    description: z.string().min(1, "Required"),
    quantity: z.coerce.number().min(0.001),
    unitPrice: z.coerce.number().min(0),
  })).min(1, "Minimum 1 line item required")
});

type EstimateForm = z.infer<typeof estimateSchema>;

export default function EstimateTerminal({ tenantId, userId, customers }: { tenantId: string, userId: string, customers: any[] }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<EstimateForm>({
    resolver: zodResolver(estimateSchema),
    defaultValues: { title: 'Service Quotation', currency: 'USD', items: [{ description: '', quantity: 1, unitPrice: 0 }] }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "items" });
  const watchedItems = watch("items");

  const total = useMemo(() => {
    return Money.round(watchedItems.reduce((acc, curr) => acc + Money.multiply(curr.unitPrice, curr.quantity), 0));
  }, [watchedItems]);

  const onSubmit: SubmitHandler<EstimateForm> = async (values) => {
    setIsSubmitting(true);
    try {
      const estimate_uid = `QT-${Date.now().toString().slice(-6)}`;
      
      const { data: estData, error: estErr } = await supabase.from('estimates').insert({
        tenant_id: tenantId,
        customer_id: values.customerId,
        estimate_uid,
        title: values.title,
        status: 'DRAFT',
        total_amount: total,
        valid_until: values.validUntil,
        client_name: customers.find(c => String(c.id) === values.customerId)?.name
      }).select('id').single();

      if (estErr) throw estErr;

      const lineItems = values.items.map(item => ({
        estimate_id: estData.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: Money.multiply(item.unitPrice, item.quantity)
      }));

      await supabase.from('estimate_line_items').insert(lineItems);
      
      toast.success("Quotation Protocol Recorded");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-xl overflow-hidden rounded-2xl animate-in fade-in slide-in-from-bottom-2 duration-500">
      <CardHeader className="bg-slate-900 text-white p-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-600 rounded-xl">
            <FileText size={24} />
          </div>
          <div>
            <CardTitle className="text-2xl font-black uppercase tracking-tighter">Estimate Terminal</CardTitle>
            <p className="text-blue-400 text-[10px] font-bold uppercase tracking-widest mt-1">Pre-Fiscal Negotiation Module</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-8 space-y-10">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Client Entity</Label>
              <select {...register("customerId")} className="w-full h-12 px-4 border-2 border-slate-100 rounded-xl bg-slate-50 text-sm font-bold focus:border-blue-600 outline-none transition-all">
                <option value="">Select Customer...</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Document Title</Label>
              <Input {...register("title")} className="h-12 border-2 border-slate-100 rounded-xl font-bold" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">Validity Expiry</Label>
              <Input type="date" {...register("validUntil")} className="h-12 border-2 border-slate-100 rounded-xl font-bold" />
            </div>
          </div>

          <div className="border border-slate-100 rounded-2xl overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase pl-6 h-12">Item Description</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-center w-24">Qty</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right w-32">Unit Rate</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-right pr-6 w-32">Amount</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id} className="hover:bg-slate-50/50">
                    <TableCell className="pl-6"><Input {...register(`items.${index}.description` as const)} className="border-none shadow-none font-semibold h-10" placeholder="Service item..." /></TableCell>
                    <TableCell><Input type="number" {...register(`items.${index}.quantity` as const)} className="text-center font-mono font-bold" /></TableCell>
                    <TableCell><Input type="number" {...register(`items.${index}.unitPrice` as const)} className="text-right font-mono font-bold" /></TableCell>
                    <TableCell className="text-right pr-6 font-black text-slate-900">
                        {(Money.multiply(watchedItems[index]?.unitPrice || 0, watchedItems[index]?.quantity || 0)).toLocaleString()}
                    </TableCell>
                    <TableCell><Button variant="ghost" onClick={() => remove(index)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-between">
                <Button type="button" variant="outline" onClick={() => append({ description: '', quantity: 1, unitPrice: 0 })} className="h-9 font-bold text-[10px] uppercase gap-2 bg-white"><Plus size={14}/> Add Line Item</Button>
                <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 uppercase tracking-widest"><CheckCircle2 size={12} className="text-emerald-500"/> Sovereignty Verified</div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-end gap-10">
            <div className="flex-1 p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex gap-4">
                <Calculator className="text-blue-600 shrink-0" size={20}/>
                <p className="text-xs text-blue-900 font-medium leading-relaxed">
                    Estimates are generated as non-fiscal proforma documents. Upon acceptance, they can be protocolized into tax documents via the Compliance Bridge.
                </p>
            </div>
            <div className="w-full md:w-80 space-y-6">
                <div className="flex justify-between items-end border-b border-slate-100 pb-4">
                    <span className="text-xs font-black text-slate-400 uppercase">Estimated Total</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{total.toLocaleString()} <span className="text-lg text-slate-400">USD</span></span>
                </div>
                <Button disabled={isSubmitting} type="submit" className="w-full h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">
                    {isSubmitting ? <Loader2 className="animate-spin" /> : <><Save className="mr-2" size={18}/> Issue Quotation</>}
                </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}