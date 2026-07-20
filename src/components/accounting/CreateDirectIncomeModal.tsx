"use client";

/**
 * --- RECORD DIRECT INCOME ---
 * Documents an immediate cash sale and posts it directly to the ledger:
 * customer/agent/location context, line items against inventory, tax,
 * and a bank account to deposit into.
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from "date-fns";

import { postDirectIncomeAction } from '@/lib/actions/finance';

import {
  Dialog, DialogContent, DialogTitle,
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
  UserCheck, Landmark, MapPin, CheckCircle2, X, Calculator, User,
  Maximize2, Minimize2, ChevronUp, ChevronDown,
} from 'lucide-react';
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

  const [isMaximized, setIsMaximized] = useState(false);

  // --- FORM STATE ---
  const [customerId, setCustomerId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('UGX');
  const [paymentSourceId, setPaymentSourceId] = useState<string>('');
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>('');
  const [incomeDate, setIncomeDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);

  const addLineItem = useCallback(() => {
    setItems(prev => [...prev, {
        id: Math.random().toString(36).substr(2, 9),
        variantId: '', productId: 0, description: '',
        quantity: 1, unitPrice: 0, taxRate: 18, taxAmount: 0, total: 0,
        taxMode: 'Standard'
    }]);
  }, []);

  // Initialize with one empty row
  useEffect(() => {
    if (isOpen && items.length === 0) {
      addLineItem();
    }
  }, [isOpen, items.length, addLineItem]);

  // Scroll-position tracking for the "more content" hint arrows — a
  // state-backed callback ref (not useRef) because Base UI's Dialog
  // portals its content, so a plain ref stays null past the first render.
  const [bodyEl, setBodyEl] = useState<HTMLDivElement | null>(null);
  const [bodyAtStart, setBodyAtStart] = useState(true);
  const [bodyAtEnd, setBodyAtEnd] = useState(true);
  const updateBodyScroll = useCallback(() => {
      if (!bodyEl) return;
      setBodyAtStart(bodyEl.scrollTop <= 1);
      setBodyAtEnd(bodyEl.scrollTop >= bodyEl.scrollHeight - bodyEl.clientHeight - 1);
  }, [bodyEl]);
  useEffect(() => {
      if (!bodyEl) return;
      updateBodyScroll();
      const ro = new ResizeObserver(updateBodyScroll);
      ro.observe(bodyEl);
      return () => ro.disconnect();
  }, [bodyEl, updateBodyScroll]);

  // --- DATA FETCHING ---

  const { data: customers } = useQuery({
    queryKey: ['crm_customers', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

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

  const paymentSources = useMemo(() => accounts?.filter((a: any) => ['bank', 'cash'].includes(a.subtype?.toLowerCase())) || [], [accounts]);
  const incomeCategories = useMemo(() => accounts?.filter((a: any) => ['Revenue', 'Income'].includes(a.type)) || [], [accounts]);

  const removeLineItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: string, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      const updated = { ...item, [field]: value };

      if (field === 'variantId') {
        const variant = inventory?.find((v: any) => v.variant_id === value);
        if (variant) {
          updated.productId = variant.product_id;
          updated.description = `${variant.product_name} (${variant.variant_name})`;
          updated.unitPrice = variant.price || 0;
        }
      }

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
        toast.success("Income documented successfully.");
        queryClient.invalidateQueries();
        onClose();
        setItems([]);
        setCustomerId('');
      } else {
        toast.error(result.message);
      }
    }
  });

  const handleCommit = () => {
    if (!agentId || !locationId || !paymentSourceId || !incomeCategoryId) {
        return toast.error("Complete all required fields in the header section.");
    }
    mutation.mutate({
      businessId,
      customerId: customerId || undefined,
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

  const handleClose = () => { onClose(); setIsMaximized(false); };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent showCloseButton={false} className={cn(
          "border-slate-200 shadow-2xl overflow-hidden flex flex-col p-0 gap-0 bg-white transition-all duration-300 ease-out",
          isMaximized
              ? "fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 m-0 w-screen h-screen max-w-none sm:max-w-none max-h-none rounded-none z-[9999]"
              : "w-full h-full sm:h-auto sm:max-h-[90vh] sm:w-[95vw] sm:max-w-5xl rounded-none sm:rounded-3xl"
      )}>

        {/* Page-style header */}
        <div className="p-4 sm:p-6 bg-white border-b relative shrink-0">
          <div className="flex items-start gap-3 sm:gap-4 pr-20 sm:pr-24">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100 shadow-sm">
              <Landmark className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-base sm:text-xl font-bold text-slate-900 truncate">Record Direct Income</DialogTitle>
              <p className="text-[11px] sm:text-xs text-slate-400 mt-1">Document an immediate cash sale and post it straight to the ledger.</p>
            </div>
          </div>

          {/* Window Controls */}
          <div className="absolute top-3 right-3 sm:top-5 sm:right-5 flex items-center gap-1 sm:gap-2">
            <button
                type="button"
                onClick={() => setIsMaximized(!isMaximized)}
                className="hidden sm:inline-flex p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
                aria-label={isMaximized ? "Restore" : "Maximize"}
            >
                {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button
                type="button"
                onClick={handleClose}
                aria-label="Close"
                className="p-2 hover:bg-red-50 hover:text-red-500 rounded-lg text-slate-400 transition-colors"
            >
                <X size={18} />
            </button>
          </div>
        </div>

        {/* Main Form Body */}
        <div
            ref={setBodyEl}
            onScroll={updateBodyScroll}
            className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 custom-scrollbar bg-slate-50/20"
        >
            {!bodyAtStart && (
                <div className="sticky top-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
                    <div className="h-7 w-7 translate-y-1 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center">
                        <ChevronUp className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                </div>
            )}

            {/* A. Header Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-blue-500" /> Customer
                    </Label>
                    <Select onValueChange={(val) => setCustomerId(val || '')} value={customerId}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm"><SelectValue placeholder="Optional" /></SelectTrigger>
                        <SelectContent>{customers?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-blue-500" /> Sales Agent
                    </Label>
                    <Select onValueChange={(val) => setAgentId(val || '')} value={agentId}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm"><SelectValue placeholder="Select staff" /></SelectTrigger>
                        <SelectContent>{staff?.map((s: any) => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-blue-500" /> Date
                    </Label>
                    <Popover>
                        <PopoverTrigger
                            render={
                                <Button variant="outline" className="w-full h-10 justify-start text-left bg-white border-slate-200 rounded-lg font-medium text-sm px-3">
                                    <CalendarIcon className="mr-2 h-3.5 w-3.5 opacity-50 shrink-0" />
                                    <span className="truncate">{format(incomeDate, "PPP")}</span>
                                </Button>
                            }
                        />
                        <PopoverContent className="w-auto p-0" align="start" sideOffset={4}>
                            <Calendar mode="single" selected={incomeDate} onSelect={(d) => d && setIncomeDate(d)} autoFocus />
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-500" /> Location
                    </Label>
                    <Select onValueChange={(val) => setLocationId(val || '')} value={locationId}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm"><SelectValue placeholder="Select branch" /></SelectTrigger>
                        <SelectContent>{locations?.map((l: any) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Landmark className="w-3.5 h-3.5 text-blue-500" /> Deposit Account
                    </Label>
                    <Select onValueChange={(val) => setPaymentSourceId(val || '')} value={paymentSourceId}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm"><SelectValue placeholder="Select account" /></SelectTrigger>
                        <SelectContent>{paymentSources?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency})</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" /> Income Category
                    </Label>
                    <Select onValueChange={(val) => setIncomeCategoryId(val || '')} value={incomeCategoryId}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                        <SelectContent>{incomeCategories?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
                    </Select>
                </div>

                <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-1.5">
                        <Calculator className="w-3.5 h-3.5 text-blue-500" /> Currency
                    </Label>
                    <Select onValueChange={(val) => setCurrencyCode(val || 'UGX')} value={currencyCode}>
                        <SelectTrigger className="h-10 border-slate-200 bg-white rounded-lg text-sm font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent><SelectItem value="UGX">UGX (Shilling)</SelectItem><SelectItem value="USD">USD (Dollar)</SelectItem></SelectContent>
                    </Select>
                </div>
            </div>

            {/* B. Line Items */}
            <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between border-l-4 border-blue-600 pl-4">
                    <div>
                        <h3 className="text-sm font-black uppercase tracking-tight text-slate-900">Sale Items</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Products or services sold in this transaction</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={addLineItem} className="h-9 text-blue-600 font-bold text-[10px] uppercase tracking-widest border-blue-100 hover:bg-blue-50 px-4 rounded-lg">
                        <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Item
                    </Button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                    {/* Desktop/tablet: full table */}
                    <div className="hidden md:block">
                        <Table>
                            <TableHeader className="bg-slate-50/50 border-b border-slate-100">
                                <TableRow className="h-11">
                                    <TableHead className="text-[10px] font-black pl-5 uppercase tracking-widest text-slate-400">Product / Service</TableHead>
                                    <TableHead className="w-24 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Qty</TableHead>
                                    <TableHead className="w-28 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Unit Price</TableHead>
                                    <TableHead className="w-56 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">Tax</TableHead>
                                    <TableHead className="w-32 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Line Total</TableHead>
                                    <TableHead className="w-10 pr-3"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item) => (
                                    <TableRow key={item.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition-colors">
                                        <TableCell className="pl-5 py-2.5">
                                            <Select value={item.variantId} onValueChange={val => updateItem(item.id, 'variantId', val)}>
                                                <SelectTrigger className="border-slate-200 h-10 bg-slate-50/30 rounded-lg text-sm"><SelectValue placeholder="Search inventory..." /></SelectTrigger>
                                                <SelectContent className="max-h-[300px]">{inventory?.map((v: any) => <SelectItem key={v.variant_id} value={v.variant_id}>{v.product_name} • {v.variant_name}</SelectItem>)}</SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" className="h-10 text-center bg-slate-50/30 border-slate-200 rounded-lg text-sm" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                                        </TableCell>
                                        <TableCell>
                                            <Input type="number" className="h-10 text-center font-mono bg-slate-50/30 border-slate-200 rounded-lg text-sm" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-1.5">
                                                <Select value={item.taxMode} onValueChange={val => updateItem(item.id, 'taxMode', val)}>
                                                    <SelectTrigger className="h-10 bg-slate-50/30 border-slate-200 rounded-lg text-sm font-medium"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="Standard">Standard (18%)</SelectItem>
                                                        <SelectItem value="Reduced">Reduced (5%)</SelectItem>
                                                        <SelectItem value="Exempt">Exempt</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input type="number" className="w-16 h-10 text-center font-bold bg-slate-50 border-slate-200 rounded-lg text-sm shrink-0" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-bold text-slate-900 text-sm">
                                            {new Intl.NumberFormat().format(item.total)}
                                        </TableCell>
                                        <TableCell className="pr-3 text-center">
                                            <button type="button" onClick={() => removeLineItem(item.id)} aria-label="Remove item" className="text-slate-300 hover:text-rose-500 transition-colors">
                                                <Trash2 size={16} />
                                            </button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile: stacked item cards */}
                    <div className="md:hidden divide-y divide-slate-100">
                        {items.map((item) => (
                            <div key={item.id} className="p-4 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                    <Select value={item.variantId} onValueChange={val => updateItem(item.id, 'variantId', val)}>
                                        <SelectTrigger className="border-slate-200 h-10 bg-slate-50/30 rounded-lg text-sm flex-1"><SelectValue placeholder="Search inventory..." /></SelectTrigger>
                                        <SelectContent className="max-h-[300px]">{inventory?.map((v: any) => <SelectItem key={v.variant_id} value={v.variant_id}>{v.product_name} • {v.variant_name}</SelectItem>)}</SelectContent>
                                    </Select>
                                    <button type="button" onClick={() => removeLineItem(item.id)} aria-label="Remove item" className="shrink-0 text-slate-300 hover:text-rose-500 transition-colors p-1">
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Qty</Label>
                                        <Input type="number" className="h-10 text-center bg-slate-50/30 border-slate-200 rounded-lg text-sm" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Unit Price</Label>
                                        <Input type="number" className="h-10 text-center font-mono bg-slate-50/30 border-slate-200 rounded-lg text-sm" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} />
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <Select value={item.taxMode} onValueChange={val => updateItem(item.id, 'taxMode', val)}>
                                        <SelectTrigger className="h-10 bg-slate-50/30 border-slate-200 rounded-lg text-sm font-medium flex-1"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Standard">Standard (18%)</SelectItem>
                                            <SelectItem value="Reduced">Reduced (5%)</SelectItem>
                                            <SelectItem value="Exempt">Exempt</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" className="w-16 h-10 text-center font-bold bg-slate-50 border-slate-200 rounded-lg text-sm shrink-0" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} />
                                </div>
                                <div className="flex justify-between items-center pt-1">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Line Total</span>
                                    <span className="font-mono font-bold text-slate-900 text-sm">{new Intl.NumberFormat().format(item.total)}</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-3 bg-slate-50/30 border-t border-slate-100">
                        <Button variant="ghost" className="w-full h-10 text-slate-400 hover:text-blue-600 hover:bg-blue-50 font-bold uppercase tracking-[0.15em] text-[10px] rounded-lg" onClick={addLineItem}>
                            <Plus className="mr-2 w-3.5 h-3.5" /> Add Another Item
                        </Button>
                    </div>
                </div>
            </div>

            {/* C. Financial Summary — balance-bar style */}
            <div className="flex flex-col sm:flex-row items-stretch gap-3 sm:gap-4 p-4 sm:p-6 bg-slate-900 rounded-2xl shadow-xl border border-slate-800">
                <div className="flex-1 flex flex-col justify-center">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Gross Subtotal</span>
                    <span className="text-lg text-white font-black tabular-nums">{new Intl.NumberFormat().format(totals.subtotal)}</span>
                </div>
                <div className="flex-1 flex flex-col justify-center border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Tax Provision</span>
                    <span className="text-lg text-amber-400 font-black tabular-nums">+{new Intl.NumberFormat().format(totals.tax)}</span>
                </div>
                <div className="flex-1 flex flex-col justify-center sm:items-end border-t sm:border-t-0 sm:border-l border-slate-800 pt-3 sm:pt-0 sm:pl-4">
                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Net Ledger Impact</span>
                    <span className="text-2xl text-white font-black tabular-nums">{new Intl.NumberFormat().format(totals.grandTotal)} <span className="text-xs text-slate-500">{currencyCode}</span></span>
                </div>
            </div>

            {!bodyAtEnd && (
                <div className="sticky bottom-0 z-10 h-0 flex justify-center overflow-visible pointer-events-none">
                    <div className="h-7 w-7 -translate-y-1 rounded-full bg-white/90 shadow-md border border-slate-200 flex items-center justify-center animate-bounce">
                        <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
                    </div>
                </div>
            )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-5 bg-slate-50/50 border-t flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-0 shrink-0">
            <Button type="button" variant="ghost" onClick={handleClose} disabled={mutation.isPending} className="w-full sm:w-auto h-10 px-5 font-black uppercase text-xs tracking-widest text-slate-400 hover:text-rose-600">
                Discard Entry
            </Button>
            <Button
                onClick={handleCommit}
                disabled={mutation.isPending || items.length === 0}
                className="w-full sm:w-auto h-10 sm:h-11 px-6 sm:px-8 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-lg transition-all active:scale-[0.98] flex items-center justify-center"
            >
                {mutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" /> <span className="font-black uppercase text-xs tracking-widest">Posting...</span></>
                ) : (
                    <><CheckCircle2 className="mr-2 h-4 w-4 shrink-0" /> <span className="font-black uppercase text-xs tracking-widest">Commit to Ledger</span></>
                )}
            </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
