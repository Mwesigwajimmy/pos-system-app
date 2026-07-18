"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from "date-fns";

import { postDirectIncomeAction } from '@/lib/actions/finance';

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Input } from "@/components/ui/input";
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { 
  Plus, Trash2, Loader2, Calculator, Calendar as CalendarIcon,
  UserCheck, Landmark, MapPin, CheckCircle2, X
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; 
import { cn } from "@/lib/utils";

interface LineItem {
  id: string;
  variantId: string;
  productId: number;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  taxMode: 'Standard' | 'Reduced' | 'Exempt';
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
}

export default function CreateDirectIncomeModal({ isOpen, onClose, businessId }: Props) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  const [agentId, setAgentId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('UGX');
  const [paymentSourceId, setPaymentSourceId] = useState<string>('');
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>('');
  const [incomeDate, setIncomeDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);

  // --- DATA FETCHING ---
  const { data: staff } = useQuery({
    queryKey: ['staff_profiles', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('business_id', businessId).eq('is_active', true);
      return data || [];
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['ops_locations', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

  const { data: accounts } = useQuery({
    queryKey: ['ledger_accounts', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_accounts').select('*').eq('business_id', businessId);
      return data || [];
    }
  });

  const { data: inventory } = useQuery({
    queryKey: ['scanner_master_view'],
    queryFn: async () => {
      const { data } = await supabase.from('view_bbu1_scanner_master').select('*');
      return data || [];
    }
  });

  const paymentSources = useMemo(() => accounts?.filter(a => ['bank', 'cash'].includes(a.subtype?.toLowerCase())) || [], [accounts]);
  const incomeCategories = useMemo(() => accounts?.filter(a => ['Revenue', 'Income'].includes(a.type)) || [], [accounts]);

  const addLineItem = () => {
    setItems([...items, { 
        id: Math.random().toString(36).substr(2, 9), 
        variantId: '', productId: 0, description: '', 
        quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, total: 0, 
        taxMode: 'Standard' 
    }]);
  };

  const removeLineItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (field === 'variantId') {
        const variant = inventory?.find(v => v.variant_id === value);
        if (variant) {
          updated.productId = variant.product_id;
          updated.description = `${variant.product_name} (${variant.variant_name})`;
          updated.unitPrice = variant.price || 0;
        }
      }

      const sub = updated.quantity * updated.unitPrice;
      updated.taxAmount = (sub * updated.taxRate) / 100;
      updated.total = sub + updated.taxAmount;
      return updated;
    }));
  };

  const totals = useMemo(() => {
    return items.reduce((acc, item) => ({
      subtotal: acc.subtotal + (item.quantity * item.unitPrice),
      tax: acc.tax + item.taxAmount,
      grandTotal: acc.grandTotal + item.total
    }), { subtotal: 0, tax: 0, grandTotal: 0 });
  }, [items]);

  const mutation = useMutation({
    mutationFn: (data: any) => postDirectIncomeAction(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Income recorded and ledger updated.");
        queryClient.invalidateQueries();
        onClose();
        setItems([]);
      } else {
        toast.error(result.message);
      }
    }
  });

  const handleCommit = () => {
    if (!agentId || !locationId || !paymentSourceId || !incomeCategoryId) {
        return toast.error("Please fill in all required fields.");
    }
    mutation.mutate({
      businessId,
      agentId,
      locationId,
      bankAccountId: paymentSourceId,
      revenueAccountId: incomeCategoryId,
      currency: currencyCode,
      date: format(incomeDate, 'yyyy-MM-dd'),
      items,
      totalAmount: totals.grandTotal,
      taxAmount: totals.tax
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[1200px] h-[92vh] flex flex-col p-0 overflow-hidden border-slate-200 rounded-xl">
        
        {/* CLEAN HEADER */}
        <div className="px-8 py-6 border-b bg-white flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">Record Direct Income</h2>
            <p className="text-sm text-slate-500 mt-1">Post immediate income directly to the general ledger.</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 bg-slate-50/30 p-8 flex flex-col gap-6 overflow-hidden">
          
          {/* INFO GRID */}
          <div className="grid grid-cols-4 gap-6 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
             <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Staff / Agent</Label>
                <Select onValueChange={setAgentId} value={agentId}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                    <SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Date of Income</Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left bg-slate-50 border-slate-200">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {format(incomeDate, "PPP")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={incomeDate} onSelect={(d) => d && setIncomeDate(d)} initialFocus /></PopoverContent>
                </Popover>
             </div>

             <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Branch / Node</Label>
                <Select onValueChange={setLocationId} value={locationId}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Location" /></SelectTrigger>
                    <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Currency</Label>
                <Select onValueChange={setCurrencyCode} value={currencyCode}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="UGX">UGX (Shilling)</SelectItem><SelectItem value="USD">USD (Dollar)</SelectItem></SelectContent>
                </Select>
             </div>

             <div className="space-y-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Deposit Bank Account</Label>
                <Select onValueChange={setPaymentSourceId} value={paymentSourceId}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Target Account" /></SelectTrigger>
                    <SelectContent>{paymentSources?.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-2 col-span-2">
                <Label className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Accounting Category</Label>
                <Select onValueChange={setIncomeCategoryId} value={incomeCategoryId}>
                    <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Revenue/Income Account" /></SelectTrigger>
                    <SelectContent>{incomeCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>
          </div>

          {/* TABLE AREA */}
          <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-20 border-b">
                  <TableRow>
                    <TableHead className="px-6 text-xs font-bold uppercase text-slate-500">Service / Product</TableHead>
                    <TableHead className="w-32 text-center text-xs font-bold uppercase text-slate-500">Qty</TableHead>
                    <TableHead className="w-44 text-center text-xs font-bold uppercase text-slate-500">Unit Price</TableHead>
                    <TableHead className="w-48 text-right px-6 text-xs font-bold uppercase text-slate-500">Subtotal</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-b last:border-0">
                      <TableCell className="px-6 py-4">
                        <Select value={item.variantId} onValueChange={val => updateItem(item.id, 'variantId', val)}>
                          <SelectTrigger className="border-slate-200 h-9 text-sm"><SelectValue placeholder="Select item from inventory" /></SelectTrigger>
                          <SelectContent>{inventory?.map(v => <SelectItem key={v.variant_id} value={v.variant_id}>{v.product_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="h-9 text-center" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="h-9 text-center" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} /></TableCell>
                      <TableCell className="text-right px-6 font-medium text-slate-900">{new Intl.NumberFormat().format(item.total)}</TableCell>
                      <TableCell className="pr-4 text-center"><Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="text-slate-400 hover:text-red-500 h-8 w-8"><Trash2 size={16}/></Button></TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={5} className="p-0">
                      <Button variant="ghost" className="w-full h-14 text-slate-500 hover:text-blue-600 font-medium" onClick={addLineItem}>
                        <Plus className="mr-2 h-4 w-4" /> Add Another Line
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* CLEAN SUMMARY */}
          <div className="grid grid-cols-3 gap-6 p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
             <div className="flex justify-between items-center border-r pr-6">
                <span className="text-sm font-medium text-slate-500">Subtotal</span>
                <span className="text-lg font-semibold">{new Intl.NumberFormat().format(totals.subtotal)}</span>
             </div>
             <div className="flex justify-between items-center border-r px-6">
                <span className="text-sm font-medium text-slate-500">Total Tax</span>
                <span className="text-lg font-semibold">{new Intl.NumberFormat().format(totals.tax)}</span>
             </div>
             <div className="flex justify-between items-center pl-6">
                <span className="text-sm font-bold text-slate-900 uppercase tracking-wider">Grand Total ({currencyCode})</span>
                <span className="text-2xl font-bold text-blue-600">{new Intl.NumberFormat().format(totals.grandTotal)}</span>
             </div>
          </div>
        </div>

        <div className="p-6 bg-white border-t flex justify-end gap-3">
           <Button variant="outline" onClick={onClose} className="px-8 h-11 text-slate-600 font-medium">Discard Draft</Button>
           <Button 
                onClick={handleCommit} 
                disabled={mutation.isPending || items.length === 0} 
                className="bg-blue-600 hover:bg-blue-700 px-10 h-11 text-white font-semibold shadow-sm"
           >
              {mutation.isPending ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              Post to General Ledger
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}