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
  Plus, Trash2, Loader2, Calendar as CalendarIcon,
  UserCheck, Landmark, MapPin, CheckCircle2, Calculator, X, Info
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

  // --- FORM STATE ---
  const [agentId, setAgentId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('UGX');
  const [paymentSourceId, setPaymentSourceId] = useState<string>('');
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>('');
  const [incomeDate, setIncomeDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);

  // --- INITIALIZATION: Ensure at least one row exists ---
  useEffect(() => {
    if (isOpen && items.length === 0) {
      addLineItem();
    }
  }, [isOpen]);

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
    setItems(prev => [...prev, { 
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

      // Logic for Tax Presets
      if (field === 'taxMode') {
        if (value === 'Standard') updated.taxRate = 18;
        else if (value === 'Reduced') updated.taxRate = 5;
        else updated.taxRate = 0;
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
        toast.success("Transaction recorded successfully.");
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
        return toast.error("Please complete the required fields in the header.");
    }
    if (items.some(i => !i.variantId)) return toast.error("Please select a product for all rows.");

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
      <DialogContent className="sm:max-w-[1300px] w-[95vw] h-[94vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
        
        {/* PROFESSIONAL HEADER */}
        <div className="px-10 py-8 border-b bg-white flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Generate Direct Income</h2>
            <p className="text-sm text-slate-500 font-medium flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-500" />
              This will record immediate payment and adjust your general ledger balances.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full h-12 w-12 hover:bg-slate-100">
            <X className="w-6 h-6 text-slate-400" />
          </Button>
        </div>

        <div className="flex-1 bg-[#F8FAFC] p-10 flex flex-col gap-8 overflow-hidden">
          
          {/* HEADER INFORMATION SECTION */}
          <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-3 gap-x-10 gap-y-8">
             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-blue-600" /> Staff / Sales Agent
                </Label>
                <Select onValueChange={setAgentId} value={agentId}>
                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl focus:ring-blue-500"><SelectValue placeholder="Select Staff Member" /></SelectTrigger>
                    <SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-purple-600" /> Date of Receipt
                </Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start text-left bg-slate-50/50 border-slate-200 rounded-xl font-medium">
                            <CalendarIcon className="mr-3 h-4 w-4 opacity-50" />
                            {format(incomeDate, "PPP")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={incomeDate} onSelect={(d) => d && setIncomeDate(d)} initialFocus /></PopoverContent>
                </Popover>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" /> Branch / Inventory Node
                </Label>
                <Select onValueChange={setLocationId} value={locationId}>
                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl focus:ring-blue-500"><SelectValue placeholder="Select Location" /></SelectTrigger>
                    <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-amber-600" /> Deposit Bank Account
                </Label>
                <Select onValueChange={setPaymentSourceId} value={paymentSourceId}>
                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl focus:ring-blue-500"><SelectValue placeholder="Select Receiving Bank" /></SelectTrigger>
                    <SelectContent>{paymentSources?.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Accounting Category
                </Label>
                <Select onValueChange={setIncomeCategoryId} value={incomeCategoryId}>
                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl focus:ring-blue-500"><SelectValue placeholder="Inflow/Revenue Type" /></SelectTrigger>
                    <SelectContent>{incomeCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-xs font-bold uppercase text-slate-400 tracking-[0.1em] flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-slate-600" /> Reporting Currency
                </Label>
                <Select onValueChange={setCurrencyCode} value={currencyCode}>
                    <SelectTrigger className="h-12 border-slate-200 bg-slate-50/50 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="UGX">UGX (Shilling)</SelectItem><SelectItem value="USD">USD (Dollar)</SelectItem></SelectContent>
                </Select>
             </div>
          </div>

          {/* ITEMIZATION TERMINAL (TABLE) */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0 z-20 border-b backdrop-blur-md">
                  <TableRow className="h-16">
                    <TableHead className="px-8 text-xs font-bold uppercase text-slate-500 tracking-wider">Product / SKU Configuration</TableHead>
                    <TableHead className="w-32 text-center text-xs font-bold uppercase text-slate-500 tracking-wider">Quantity</TableHead>
                    <TableHead className="w-44 text-center text-xs font-bold uppercase text-slate-500 tracking-wider">Unit Price</TableHead>
                    <TableHead className="w-60 text-center text-xs font-bold uppercase text-slate-500 tracking-wider">Tax Setting</TableHead>
                    <TableHead className="w-52 text-right px-8 text-xs font-bold uppercase text-slate-500 tracking-wider">Line Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-b h-24 hover:bg-slate-50/50 transition-colors">
                      <TableCell className="px-8">
                        <Select value={item.variantId} onValueChange={val => updateItem(item.id, 'variantId', val)}>
                          <SelectTrigger className="border-slate-200 h-11 bg-white rounded-xl focus:ring-blue-500"><SelectValue placeholder="Search SKU Registry..." /></SelectTrigger>
                          <SelectContent className="max-h-[300px]">{inventory?.map(v => <SelectItem key={v.variant_id} value={v.variant_id}>{v.product_name} • {v.variant_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="h-11 text-center bg-white border-slate-200 rounded-xl" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="h-11 text-center font-mono bg-white border-slate-200 rounded-xl" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} /></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                           <Select value={item.taxMode} onValueChange={val => updateItem(item.id, 'taxMode', val)}>
                              <SelectTrigger className="h-11 bg-white border-slate-200 rounded-xl font-medium"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                 <SelectItem value="Standard">Standard (18%)</SelectItem>
                                 <SelectItem value="Reduced">Reduced (5%)</SelectItem>
                                 <SelectItem value="Exempt">Zero Rated</SelectItem>
                              </SelectContent>
                           </Select>
                           <Input type="number" className="w-20 h-11 text-center font-bold bg-slate-50 border-slate-200 rounded-xl" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-8 font-mono font-bold text-slate-900 text-lg">
                        {new Intl.NumberFormat().format(item.total)}
                      </TableCell>
                      <TableCell className="pr-6">
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
                            <Trash2 size={18}/>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <Button variant="ghost" className="w-full h-20 text-slate-400 hover:text-blue-600 hover:bg-blue-50 font-semibold uppercase tracking-widest text-[10px] rounded-none border-t border-dashed" onClick={addLineItem}>
                        <Plus className="mr-3 w-4 h-4" /> Add New Transaction Element
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* FINANCIAL SUMMARY BOX */}
          <div className="bg-slate-900 px-10 py-8 rounded-2xl text-white shadow-xl flex justify-between items-center">
             <div className="flex gap-12">
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Aggregate Gross</p>
                    <p className="text-3xl font-mono">{new Intl.NumberFormat().format(totals.subtotal)}</p>
                </div>
                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em]">Tax Impact</p>
                    <p className="text-3xl font-mono text-amber-400">+{new Intl.NumberFormat().format(totals.tax)}</p>
                </div>
             </div>
             <div className="text-right space-y-1">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Net Settlement</p>
                <div className="flex items-baseline gap-4 justify-end">
                    <span className="text-xl font-bold opacity-30 tracking-widest">{currencyCode}</span>
                    <p className="text-6xl font-black tracking-tight">{new Intl.NumberFormat().format(totals.grandTotal)}</p>
                </div>
             </div>
          </div>
        </div>

        {/* CLEAN FOOTER */}
        <div className="p-10 bg-white border-t flex justify-end gap-6 items-center">
           <Button variant="ghost" onClick={onClose} className="px-10 h-14 font-bold text-slate-400 uppercase tracking-widest hover:text-red-500">Cancel Draft</Button>
           <Button 
                onClick={handleCommit} 
                disabled={mutation.isPending || items.length === 0} 
                className="bg-blue-600 hover:bg-blue-700 px-16 h-14 rounded-xl text-white font-bold text-lg uppercase tracking-wider shadow-lg active:scale-95 transition-all"
           >
              {mutation.isPending ? <Loader2 className="animate-spin mr-3 h-5 w-5" /> : <CheckCircle2 className="mr-3 h-5 w-5" />}
              Commit to Ledger
           </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}