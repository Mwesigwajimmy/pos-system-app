"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { format } from "date-fns";

// Server Action Import (The Handshake)
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
  Plus, Trash2, Loader2, DollarSign, Globe, MapPin, 
  User, Package, Calculator, FileText, Calendar as CalendarIcon,
  UserCheck, Landmark, Layers, Percent, ShieldCheck, Box
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar"; // Professional UI Calendar
import { Badge } from '@/components/ui/badge';
import { cn } from "@/lib/utils";

// --- Enterprise Types ---

interface LineItem {
  id: string;
  variantId: string;   // UUID from view_bbu1_scanner_master
  productId: number;   // BigInt from view_bbu1_scanner_master
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;     // Custom override allowed
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

  // --- SOVEREIGN FORM STATE ---
  const [customerId, setCustomerId] = useState<string>('');
  const [agentId, setAgentId] = useState<string>('');        // Sales Agent (Profiles)
  const [locationId, setLocationId] = useState<string>('');  // Inventory Node (Locations)
  const [currencyCode, setCurrencyCode] = useState<string>('UGX');
  const [paymentSourceId, setPaymentSourceId] = useState<string>(''); // Asset Account (Bank/Cash)
  const [incomeCategoryId, setIncomeCategoryId] = useState<string>(''); // Revenue Account (4000 series)
  const [incomeDate, setIncomeDate] = useState<Date>(new Date());
  const [items, setItems] = useState<LineItem[]>([]);

  // --- DEEP INTERCONNECTION DATA FETCHING ---
  
  // 1. Pull Real Customers
  const { data: customers } = useQuery({
    queryKey: ['crm_customers', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('customers').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

  // 2. Pull Sales Agents (Profiles)
  const { data: staff } = useQuery({
    queryKey: ['staff_profiles', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('id, full_name').eq('business_id', businessId).eq('is_active', true);
      return data || [];
    }
  });

  // 3. Pull Multi-Tenant Locations
  const { data: locations } = useQuery({
    queryKey: ['ops_locations', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

  // 4. Pull Accounts (Payment Sources vs Accounting Categories)
  const { data: accounts } = useQuery({
    queryKey: ['ledger_accounts', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_accounts')
        .select('id, name, code, type, subtype, current_balance, currency')
        .eq('business_id', businessId);
      return data || [];
    }
  });

  const paymentSources = useMemo(() => accounts?.filter(a => ['bank', 'cash'].includes(a.subtype?.toLowerCase())) || [], [accounts]);
  const incomeCategories = useMemo(() => accounts?.filter(a => ['Revenue', 'Income'].includes(a.type)) || [], [accounts]);

  // 5. Pull Inventory Master (Verified View)
  const { data: inventory } = useQuery({
    queryKey: ['scanner_master_view'],
    queryFn: async () => {
      const { data } = await supabase.from('view_bbu1_scanner_master').select('*');
      return data || [];
    }
  });

  // --- Dynamic Business Logic ---
  
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

      // Auto-populate from stock registry
      if (field === 'variantId') {
        const variant = inventory?.find(v => v.variant_id === value);
        if (variant) {
          updated.productId = variant.product_id;
          updated.description = `${variant.product_name} (${variant.variant_name})`;
          updated.unitPrice = variant.price || 0;
        }
      }

      // Automated Tax Presets (Still allows manual typing in taxRate field)
      if (field === 'taxMode') {
        if (value === 'Standard') updated.taxRate = 18;
        else if (value === 'Reduced') updated.taxRate = 5;
        else updated.taxRate = 0;
      }

      // Recalculate Totals
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

  // --- THE MASTER COMMIT ENGINE ---
  const mutation = useMutation({
    mutationFn: (data: any) => postDirectIncomeAction(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Enterprise Ledger Synchronized: Cash Inflow & Inventory Adjusted");
        queryClient.invalidateQueries();
        onClose();
        setItems([]); setCustomerId(''); setAgentId(''); setLocationId('');
      } else {
        toast.error(`Sovereign Failure: ${result.message}`);
      }
    },
    onError: (err: any) => toast.error(`Critical Handshake Error: ${err.message}`)
  });

  const handleCommit = () => {
    if (!agentId || !locationId || !paymentSourceId || !incomeCategoryId) {
        return toast.error("Compliant recording requires Agent, Location, Payment Source, and Category.");
    }
    if (items.length === 0) return toast.error("Transaction must contain at least one item.");

    mutation.mutate({
      businessId,
      customerId: customerId || undefined,
      agentId,
      locationId,
      paymentSourceId,
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
      <DialogContent className="max-w-[1500px] h-[96vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none rounded-[2.5rem]">
        
        {/* SOVEREIGN HEADER */}
        <DialogHeader className="p-12 bg-slate-950 text-white flex flex-row justify-between items-center shrink-0 border-b border-white/5">
          <div className="space-y-2">
            <DialogTitle className="text-5xl font-black tracking-tighter flex items-center gap-6 uppercase italic">
              <div className="bg-blue-600 p-4 rounded-3xl shadow-[0_0_50px_rgba(37,99,235,0.4)]">
                <Calculator size={45} />
              </div>
              Direct Income Terminal
            </DialogTitle>
            <p className="text-slate-500 text-xs font-black tracking-[0.5em] uppercase pl-2">
                BBU1 Financial Protocol v5.2 • Multi-Tenant Logic
            </p>
          </div>
          <div className="flex gap-6 items-center">
             <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-8 py-3 rounded-full font-black text-xs">
                STOCKS: SYNC_READY
             </Badge>
             <div className="h-12 w-px bg-white/10" />
             <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Node Instance</p>
                <p className="font-mono text-sm text-blue-400 font-bold tracking-widest">{businessId.slice(0,18)}</p>
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 bg-slate-50/50 p-12 flex flex-col gap-10 overflow-hidden">
          
          {/* CONTROL INFRASTRUCTURE GRID */}
          <div className="grid grid-cols-6 gap-8 p-10 bg-white rounded-[3.5rem] shadow-xl shadow-slate-200/40 border border-slate-100">
             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <UserCheck size={16} className="text-blue-500"/> Sales Agent
                </Label>
                <Select onValueChange={setAgentId} value={agentId}>
                    <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"><SelectValue placeholder="Select Staff" /></SelectTrigger>
                    <SelectContent>{staff?.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <CalendarIcon size={16} className="text-purple-500"/> Value Date
                </Label>
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full h-12 justify-start text-left font-black rounded-2xl border-slate-100 bg-slate-50/50">
                            <CalendarIcon className="mr-3 h-4 w-4" />
                            {format(incomeDate, "PPP")}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0 rounded-3xl border-none shadow-2xl" align="start">
                        <Calendar mode="single" selected={incomeDate} onSelect={(d) => d && setIncomeDate(d)} initialFocus />
                    </PopoverContent>
                </Popover>
             </div>

             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <MapPin size={16} className="text-red-500"/> Inventory Node
                </Label>
                <Select onValueChange={setLocationId} value={locationId}>
                    <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"><SelectValue placeholder="Branch" /></SelectTrigger>
                    <SelectContent>{locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <Landmark size={16} className="text-amber-500"/> Payment Source
                </Label>
                <Select onValueChange={setPaymentSourceId} value={paymentSourceId}>
                    <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"><SelectValue placeholder="Select Bank" /></SelectTrigger>
                    <SelectContent>
                        {paymentSources?.map(a => (
                            <SelectItem key={a.id} value={a.id}>
                                <div className="flex justify-between w-[280px]">
                                    <span className="font-black">{a.name}</span>
                                    <span className="font-mono text-blue-600 font-black">{a.currency} {new Intl.NumberFormat().format(a.current_balance)}</span>
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <Layers size={16} className="text-indigo-500"/> Accounting Category
                </Label>
                <Select onValueChange={setIncomeCategoryId} value={incomeCategoryId}>
                    <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-bold"><SelectValue placeholder="Inflow Type" /></SelectTrigger>
                    <SelectContent>{incomeCategories?.map(c => <SelectItem key={c.id} value={c.id}>{c.code} - {c.name}</SelectItem>)}</SelectContent>
                </Select>
             </div>

             <div className="space-y-3">
                <Label className="text-[11px] font-black uppercase text-slate-400 flex items-center gap-2">
                    <Globe size={16} className="text-emerald-500"/> Reporting Currency
                </Label>
                <Select onValueChange={setCurrencyCode} value={currencyCode}>
                    <SelectTrigger className="rounded-2xl h-12 border-slate-100 bg-slate-50/50 font-black"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="UGX">UGX - Shilling</SelectItem>
                        <SelectItem value="USD">USD - Dollar</SelectItem>
                    </SelectContent>
                </Select>
             </div>
          </div>

          {/* ITEMIZATION TERMINAL */}
          <div className="flex-1 border border-slate-200 rounded-[4rem] bg-white shadow-2xl shadow-slate-300/40 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="bg-slate-50/50 sticky top-0 z-20 border-b">
                  <TableRow>
                    <TableHead className="px-12 h-24 text-[12px] font-black uppercase tracking-widest text-slate-500">Product / Service Configuration</TableHead>
                    <TableHead className="w-40 text-center text-[12px] font-black uppercase tracking-widest text-slate-500">Quantity</TableHead>
                    <TableHead className="w-56 text-center text-[12px] font-black uppercase tracking-widest text-slate-500">Unit Price</TableHead>
                    <TableHead className="w-72 text-center text-[12px] font-black uppercase tracking-widest text-slate-500">Fiscal Profile</TableHead>
                    <TableHead className="w-64 text-right px-12 text-[12px] font-black uppercase tracking-widest text-slate-500">Line Total</TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-b border-slate-50 group hover:bg-blue-50/10 transition-all">
                      <TableCell className="px-12 py-8">
                        <Select value={item.variantId} onValueChange={val => updateItem(item.id, 'variantId', val)}>
                          <SelectTrigger className="border-none shadow-none text-base font-black p-0 h-auto focus:ring-0 uppercase tracking-tighter"><SelectValue placeholder="Search SKU Registry..." /></SelectTrigger>
                          <SelectContent className="max-h-[400px] rounded-3xl">{inventory?.map(v => <SelectItem key={v.variant_id} value={v.variant_id}>{v.product_name} • {v.variant_name}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="number" className="h-14 text-center font-black rounded-2xl border-slate-100 text-lg shadow-none" value={item.quantity} onChange={e => updateItem(item.id, 'quantity', parseFloat(e.target.value))} /></TableCell>
                      <TableCell><Input type="number" className="h-14 text-center font-mono font-bold rounded-2xl border-slate-100 text-lg shadow-none" value={item.unitPrice} onChange={e => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} /></TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                           <Select value={item.taxMode} onValueChange={val => updateItem(item.id, 'taxMode', val)}>
                              <SelectTrigger className="rounded-2xl h-14 border-slate-100 bg-slate-50/50 font-bold"><SelectValue /></SelectTrigger>
                              <SelectContent className="rounded-2xl">
                                 <SelectItem value="Standard">Standard Tax</SelectItem>
                                 <SelectItem value="Reduced">Reduced Rate</SelectItem>
                                 <SelectItem value="Exempt">Tax Exempt</SelectItem>
                              </SelectContent>
                           </Select>
                           <Input type="number" className="w-24 h-14 text-center font-black rounded-2xl border-slate-100" value={item.taxRate} onChange={e => updateItem(item.id, 'taxRate', parseFloat(e.target.value))} placeholder="%" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right px-12 font-mono font-black text-blue-600 text-2xl tracking-tighter">
                        {new Intl.NumberFormat().format(item.total)}
                      </TableCell>
                      <TableCell className="pr-12 text-center opacity-0 group-hover:opacity-100 transition-all">
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-2xl w-12 h-12"><Trash2 size={24}/></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow>
                    <TableCell colSpan={6} className="p-0">
                      <Button variant="ghost" className="w-full h-28 rounded-none border-t border-dashed border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-blue-600 font-black tracking-[0.4em] text-xs uppercase transition-all" onClick={addLineItem}>
                        <Plus className="mr-4" size={20} /> Append New Transaction Element (F5)
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* FINANCIAL CONSOLIDATION SUMMARY */}
          <div className="grid grid-cols-3 gap-12 bg-slate-950 p-14 rounded-[4.5rem] text-white shadow-[0_40px_100px_rgba(0,0,0,0.3)] relative overflow-hidden">
             <div className="absolute top-0 right-0 p-12 opacity-5"><Box size={300}/></div>
             <div className="space-y-2 opacity-50">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-500">Aggregate Gross</p>
                <p className="text-5xl font-mono tracking-tighter">{new Intl.NumberFormat().format(totals.subtotal)}</p>
             </div>
             <div className="space-y-2 text-amber-400">
                <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-50">Consolidated Tax Impact</p>
                <div className="flex items-center gap-4">
                    <Percent size={30} className="opacity-40"/>
                    <p className="text-5xl font-mono tracking-tighter">+{new Intl.NumberFormat().format(totals.tax)}</p>
                </div>
             </div>
             <div className="text-right border-l border-white/10 pl-14">
                <p className="text-[11px] font-black uppercase tracking-[0.5em] text-blue-500">Net Ledger Settlement</p>
                <div className="flex items-baseline justify-end gap-6 mt-4">
                    <span className="text-3xl font-bold opacity-20 tracking-[0.3em]">{currencyCode}</span>
                    <p className="text-9xl font-black tracking-tighter leading-none">{new Intl.NumberFormat().format(totals.grandTotal)}</p>
                </div>
             </div>
          </div>
        </div>

        <DialogFooter className="p-12 bg-white border-t border-slate-100 flex items-center justify-between shrink-0">
           <Button variant="ghost" onClick={onClose} className="font-black text-slate-300 uppercase tracking-widest hover:text-red-600 h-20 px-14 text-sm">Abort Operation</Button>
           <Button 
                onClick={handleCommit} 
                disabled={mutation.isPending || items.length === 0} 
                className="bg-blue-600 hover:bg-blue-700 h-24 px-32 rounded-[2.5rem] font-black text-2xl uppercase tracking-[0.3em] shadow-[0_20px_60px_rgba(37,99,235,0.3)] transition-all active:scale-95"
           >
              {mutation.isPending ? <Loader2 className="animate-spin mr-6" size={32} /> : <ShieldCheck className="mr-6" size={32} />}
              Commit to General Ledger
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}