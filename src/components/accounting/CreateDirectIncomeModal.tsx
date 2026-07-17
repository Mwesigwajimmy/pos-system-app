"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

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
  User, Package, Calculator, FileText, Calendar
} from 'lucide-react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

// --- Enterprise Types ---

interface LineItem {
  id: string;
  productId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRateId: string;
  taxAmount: number;
  total: number;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
}

export default function CreateDirectIncomeModal({ isOpen, onClose, businessId }: Props) {
  const queryClient = useQueryClient();
  const supabase = createClient();

  // --- Form State ---
  const [customerId, setCustomerId] = useState<string>('');
  const [locationId, setLocationId] = useState<string>('');
  const [currencyCode, setCurrencyCode] = useState<string>('UGX');
  const [bankAccountId, setBankAccountId] = useState<string>('');
  const [incomeDate, setIncomeDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [items, setItems] = useState<LineItem[]>([]);

  // --- Fetch Infrastructure Data (Deep Interconnection) ---
  
  // 1. Pull Real Customers from CRM
  const { data: customers } = useQuery({
    queryKey: ['customers', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('crm_customers').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

  // 2. Pull Real Multi-Tenant Locations
  const { data: locations } = useQuery({
    queryKey: ['locations', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('locations').select('id, name').eq('business_id', businessId);
      return data || [];
    }
  });

  // 3. Pull Real Liquid Accounts (Bank/Cash)
  const { data: accounts } = useQuery({
    queryKey: ['bank_accounts', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('accounting_accounts')
        .select('id, name, code, currency')
        .eq('business_id', businessId)
        .in('subtype', ['bank', 'cash'])
        .eq('is_active', true);
      return data || [];
    }
  });

  // 4. Pull Multi-Tax Configurations
  const { data: taxRules } = useQuery({
    queryKey: ['tax_rules', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('tax_configurations').select('id, name, rate_percentage').eq('business_id', businessId);
      return data || [];
    }
  });

  // 5. Pull Inventory/Service Registry
  const { data: products } = useQuery({
    queryKey: ['products', businessId],
    queryFn: async () => {
      const { data } = await supabase.from('inventory_items').select('id, name, sale_price, tax_category_id').eq('business_id', businessId);
      return data || [];
    }
  });

  // --- Line Item Engineering ---
  
  const addLineItem = () => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substr(2, 9),
      productId: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRateId: '',
      taxAmount: 0,
      total: 0,
    };
    setItems([...items, newItem]);
  };

  const removeLineItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof LineItem, value: any) => {
    setItems(items.map(item => {
      if (item.id !== id) return item;
      
      const updatedItem = { ...item, [field]: value };

      // Auto-populate price if product changes
      if (field === 'productId') {
        const product = products?.find(p => p.id === value);
        if (product) {
          updatedItem.unitPrice = product.sale_price;
          updatedItem.description = product.name;
        }
      }

      // Calculate Real-time Financials
      const subtotal = updatedItem.quantity * updatedItem.unitPrice;
      const taxRate = taxRules?.find(t => t.id === updatedItem.taxRateId)?.rate_percentage || 0;
      updatedItem.taxAmount = (subtotal * taxRate) / 100;
      updatedItem.total = subtotal + updatedItem.taxAmount;

      return updatedItem;
    }));
  };

  // --- Financial Grand Totals ---
  const totals = useMemo(() => {
    return items.reduce((acc, item) => ({
      subtotal: acc.subtotal + (item.quantity * item.unitPrice),
      tax: acc.tax + item.taxAmount,
      grandTotal: acc.grandTotal + item.total
    }), { subtotal: 0, tax: 0, grandTotal: 0 });
  }, [items]);

  // --- The Handshake Mutation (Fully Connected) ---
  const mutation = useMutation({
    mutationFn: (data: any) => postDirectIncomeAction(data),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Enterprise Transaction Secured & Ledger Posted");
        queryClient.invalidateQueries({ queryKey: ['invoices', businessId] });
        onClose();
        // Flush State
        setItems([]); setCustomerId(''); setLocationId(''); setBankAccountId('');
      } else {
        toast.error(`Sovereign Failure: ${result.message}`);
      }
    },
    onError: (err: any) => toast.error(`System Error: ${err.message}`)
  });

  const handleAuthorize = () => {
    // Enterprise Validation
    if (!locationId) return toast.error("Please select a business location");
    if (!bankAccountId) return toast.error("Please select a target deposit account");
    if (items.length === 0) return toast.error("At least one line item is required");
    if (items.some(i => !i.productId || i.quantity <= 0)) return toast.error("Please complete all line item details");

    mutation.mutate({
      businessId,
      customerId: customerId || undefined,
      locationId,
      bankAccountId,
      currency: currencyCode,
      date: incomeDate,
      items, // JSON array for the database line-item processor
      totalAmount: totals.grandTotal,
      taxAmount: totals.tax
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden shadow-2xl border-none">
        <DialogHeader className="p-8 bg-white border-b">
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle className="text-3xl font-black flex items-center gap-3 tracking-tight">
                <div className="bg-blue-600 p-2 rounded-lg">
                  <Calculator className="w-6 h-6 text-white" />
                </div>
                Record Direct Enterprise Income
              </DialogTitle>
              <DialogDescription className="mt-2 text-slate-500 font-medium">
                Post instant revenue, generate paid invoices, and synchronize the General Ledger in one atomic handshake.
              </DialogDescription>
            </div>
            <div className="flex flex-col items-end">
                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1 text-xs font-bold uppercase tracking-widest">
                  Live Sovereign Sync Active
                </Badge>
                <span className="text-[10px] text-muted-foreground mt-1 font-mono uppercase">Unit ID: {businessId.slice(0,8)}</span>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6 p-8 bg-slate-50/30">
          {/* Header Metadata Section */}
          <div className="grid grid-cols-5 gap-5 p-5 bg-white rounded-xl shadow-sm border border-slate-200">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-blue-500"/> Customer Entity
              </Label>
              <Select onValueChange={setCustomerId} value={customerId}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Walk-in Customer" /></SelectTrigger>
                <SelectContent>
                  {customers?.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-red-500"/> Operational Node
              </Label>
              <Select onValueChange={setLocationId} value={locationId}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Select Location" /></SelectTrigger>
                <SelectContent>
                  {locations?.map(l => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-emerald-500"/> Reporting FX
              </Label>
              <Select onValueChange={setCurrencyCode} value={currencyCode}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="UGX">UGX - Shilling</SelectItem>
                  <SelectItem value="USD">USD - Dollar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-amber-500"/> Deposit Target
              </Label>
              <Select onValueChange={setBankAccountId} value={bankAccountId}>
                <SelectTrigger className="bg-slate-50 border-slate-200"><SelectValue placeholder="Bank or Cash" /></SelectTrigger>
                <SelectContent>
                  {accounts?.map(a => <SelectItem key={a.id} value={a.id}>{a.name} ({a.code})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-500"/> Value Date
              </Label>
              <Input type="date" value={incomeDate} onChange={(e) => setIncomeDate(e.target.value)} className="bg-slate-50 border-slate-200" />
            </div>
          </div>

          {/* Line Items Terminal */}
          <div className="flex-1 border border-slate-200 rounded-xl bg-white shadow-sm overflow-hidden flex flex-col">
            <div className="bg-slate-100/50 px-6 py-3 border-b flex justify-between items-center">
               <span className="text-sm font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                  <Package className="w-4 h-4" /> Itemized Breakdown
               </span>
               <span className="text-[10px] font-mono text-slate-400">{items.length} Elements in Transaction</span>
            </div>
            <ScrollArea className="flex-1">
              <Table>
                <TableHeader className="sticky top-0 bg-white z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent border-b">
                    <TableHead className="w-[30%] px-6">Product / Service</TableHead>
                    <TableHead className="w-[10%]">Qty</TableHead>
                    <TableHead className="w-[15%]">Unit Price</TableHead>
                    <TableHead className="w-[20%]">Tax Configuration</TableHead>
                    <TableHead className="text-right px-6">Line Total ({currencyCode})</TableHead>
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id} className="border-b transition-colors hover:bg-slate-50/50">
                      <TableCell className="px-6">
                        <Select value={item.productId} onValueChange={(val) => updateItem(item.id, 'productId', val)}>
                          <SelectTrigger className="h-9 border-slate-200 shadow-none focus:ring-0"><SelectValue placeholder="Select item..." /></SelectTrigger>
                          <SelectContent>
                            {products?.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-9 border-slate-200" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Input type="number" className="h-9 border-slate-200 font-mono" value={item.unitPrice} onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value))} />
                      </TableCell>
                      <TableCell>
                        <Select value={item.taxRateId} onValueChange={(val) => updateItem(item.id, 'taxRateId', val)}>
                          <SelectTrigger className="h-9 border-slate-200 shadow-none"><SelectValue placeholder="Exempt" /></SelectTrigger>
                          <SelectContent>
                            {taxRules?.map(t => <SelectItem key={t.id} value={t.id}>{t.name} ({t.rate_percentage}%)</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right px-6 font-mono font-black text-slate-700">
                        {new Intl.NumberFormat().format(item.total)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="icon" onClick={() => removeLineItem(item.id)} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={6} className="p-0">
                      <Button variant="ghost" className="w-full h-16 rounded-none border-t border-dashed text-slate-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all font-bold" onClick={addLineItem}>
                        <Plus className="w-4 h-4 mr-2" /> Append New Transaction Line
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </ScrollArea>
          </div>

          {/* Financial Summary Pane */}
          <div className="flex justify-end gap-12 px-10 py-8 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="text-right space-y-1">
              <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">Aggregate Subtotal</p>
              <p className="text-xl font-mono text-slate-600">{new Intl.NumberFormat().format(totals.subtotal)}</p>
            </div>
            <div className="text-right space-y-1">
              <p className="text-[10px] text-amber-600 uppercase font-black tracking-widest">VAT / Excise Impact</p>
              <p className="text-xl font-mono text-amber-600">+{new Intl.NumberFormat().format(totals.tax)}</p>
            </div>
            <div className="text-right space-y-1 border-l pl-12 border-slate-100">
              <p className="text-[10px] text-primary uppercase font-black tracking-widest">Final Ledger Value</p>
              <div className="flex items-baseline justify-end gap-2 text-primary">
                 <span className="text-sm font-bold opacity-50 uppercase">{currencyCode}</span>
                 <p className="text-5xl font-black tracking-tighter">
                   {new Intl.NumberFormat().format(totals.grandTotal)}
                 </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="p-8 bg-white border-t flex items-center justify-between">
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} disabled={mutation.isPending} className="border-slate-200 text-slate-500 font-bold px-6 h-12">
              Discard Draft
            </Button>
          </div>
          <Button 
            className="bg-blue-700 hover:bg-blue-800 font-black text-sm px-10 h-12 shadow-lg shadow-blue-200 transition-all uppercase tracking-widest" 
            onClick={handleAuthorize}
            disabled={mutation.isPending || items.length === 0}
          >
            {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-3" /> : <FileText className="w-4 h-4 mr-3" />}
            Authorize Transaction & Post Ledger
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}