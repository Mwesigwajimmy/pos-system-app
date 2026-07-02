'use client';

/**
 * --- ENTERPRISE INSTALLMENT PLAN TERMINAL ---
 * Use: Processing 'Buy Now Pay Later' sales with automated stock deduction and debt registry.
 * Logic: Linked to product catalog. Triggers master sale record and generates repayment schedule.
 */

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { 
    Calculator, CalendarClock, UserPlus, 
    ArrowRight, Loader2, Receipt, Search, Plus, Trash2,
    CheckCircle2, DollarSign, ListChecks, Package, Database
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { addMonths, format } from 'date-fns';

const supabase = createClient();

export default function InstallmentPlanManager() {
    const queryClient = useQueryClient();
    
    // FORM STATE
    const [customerId, setCustomerId] = useState("");
    const [deposit, setDeposit] = useState(0);
    const [months, setMonths] = useState(3);
    const [selectedItems, setSelectedItems] = useState<any[]>([]);

    // 1. DATA: Fetch Registered Customers & Product Catalog
    const { data: customers } = useQuery({
        queryKey: ['customers_for_installments'],
        queryFn: async () => {
            const { data, error } = await supabase.from('customers').select('id, name').eq('is_active', true);
            if (error) throw error;
            return data;
        }
    });

    const { data: products } = useQuery({
        queryKey: ['mfg_products_for_installments'],
        queryFn: async () => {
            const { data } = await supabase.from('view_bbu1_scanner_master').select('*');
            return data || [];
        }
    });

    // 2. LOGIC: Item Management
    const handleAddItem = (id: string) => {
        const product = products?.find(p => p.variant_id.toString() === id);
        if (!product) return;
        if (selectedItems.find(i => i.variant_id === product.variant_id)) return;
        
        setSelectedItems([...selectedItems, {
            variant_id: product.variant_id,
            name: product.product_name,
            sku: product.sku,
            price: Number(product.cost_price) || 0, // Defaulting to cost for plan logic
            quantity: 1
        }]);
    };

    const updateItemQty = (id: number, qty: number) => {
        setSelectedItems(selectedItems.map(i => i.variant_id === id ? { ...i, quantity: Math.max(1, qty) } : i));
    };

    const totalSaleValue = useMemo(() => {
        return selectedItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    }, [selectedItems]);

    // 3. MATH: Live Schedule Preview
    const schedulePreview = useMemo(() => {
        const balance = totalSaleValue - deposit;
        if (balance <= 0 || months <= 0) return [];
        
        const perMonth = balance / months;
        return Array.from({ length: months }).map((_, i) => ({
            date: format(addMonths(new Date(), i + 1), 'yyyy-MM-dd'),
            amount: perMonth
        }));
    }, [totalSaleValue, deposit, months]);

    // 4. MUTATION: Deep Weld Execution
    const planMutation = useMutation({
        mutationFn: async () => {
            const { error } = await supabase.rpc('proc_create_installment_sale', {
                p_customer_id: customerId,
                p_total_sale: totalSaleValue,
                p_deposit: deposit,
                p_months: months,
                p_schedule: schedulePreview,
                p_items: selectedItems.map(i => ({
                    variant_id: i.variant_id,
                    qty: i.quantity,
                    rate: i.price
                }))
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Transaction Secured: Installment Plan Active.");
            setSelectedItems([]); setDeposit(0); setCustomerId("");
            queryClient.invalidateQueries();
        },
        onError: (err: any) => toast.error("Handshake Error: " + err.message)
    });

    return (
        <div className="max-w-[1600px] mx-auto space-y-10 animate-in fade-in duration-700 pb-20">
            <header className="border-b border-slate-100 pb-8 space-y-1">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
                    <CalendarClock className="text-blue-600" size={32} /> Installment Plan Manager
                </h1>
                <p className="text-sm font-medium text-slate-500 uppercase tracking-widest">Revenue Schedule & Inventory Debt Control</p>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* 1. GOODS IDENTIFICATION (THE WHY) */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-slate-200 shadow-sm rounded-[2rem] bg-white overflow-hidden">
                        <CardHeader className="bg-slate-50/50 py-5 border-b border-slate-100 px-8">
                            <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 flex items-center gap-2">
                                <Package size={14} /> 1. Identify Goods for Sale
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-6">
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <Select onValueChange={handleAddItem}>
                                        <SelectTrigger className="h-12 border-slate-200 rounded-xl shadow-inner focus:ring-blue-600">
                                            <SelectValue placeholder="Search product or material catalog..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            {products?.map(p => (
                                                <SelectItem key={p.variant_id} value={p.variant_id.toString()} className="font-bold py-3 border-b last:border-none">
                                                    {p.product_name} <span className="text-[10px] text-slate-400 ml-2 uppercase">[{p.sku}]</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-none h-12">
                                            <TableHead className="text-[10px] font-bold uppercase pl-8">Material/Product Specification</TableHead>
                                            <TableHead className="w-32 text-center text-[10px] font-bold uppercase">Quantity</TableHead>
                                            <TableHead className="w-40 text-right text-[10px] font-bold uppercase pr-10">Line Value</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedItems.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-slate-300 font-medium italic">Identify inventory items to begin plan generation.</TableCell>
                                            </TableRow>
                                        ) : (
                                            selectedItems.map((item, idx) => (
                                                <TableRow key={idx} className="hover:bg-slate-50/50 border-b last:border-none transition-colors">
                                                    <TableCell className="pl-8 py-5">
                                                        <p className="font-bold text-slate-900 text-sm">{item.name}</p>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">SKU: {item.sku}</p>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Input 
                                                            type="number" 
                                                            value={item.quantity} 
                                                            onChange={(e) => updateItemQty(item.variant_id, Number(e.target.value))} 
                                                            className="h-10 w-24 mx-auto text-center font-black border-slate-200 rounded-xl bg-slate-50/30" 
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right pr-10 font-mono text-base font-bold text-slate-900">
                                                        {(item.price * item.quantity).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="pr-4 text-right">
                                                        <Button variant="ghost" size="icon" onClick={() => setSelectedItems(selectedItems.filter(i => i.variant_id !== item.variant_id))} className="h-10 w-10 text-slate-200 hover:text-red-500 rounded-full transition-all">
                                                            <Trash2 size={18} />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>

                    {/* REPAYMENT PROJECTION */}
                    <Card className="border-slate-100 shadow-sm rounded-[2rem] bg-slate-50/50 overflow-hidden">
                        <CardHeader className="p-8 bg-white border-b border-slate-100 flex justify-between items-center">
                            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-500">Repayment Projection</CardTitle>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Deferred Balance</p>
                                <p className="text-2xl font-black text-blue-600 tracking-tighter">{(totalSaleValue - deposit).toLocaleString()}</p>
                            </div>
                        </CardHeader>
                        <CardContent className="p-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {schedulePreview.map((item, idx) => (
                                    <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/60 shadow-sm flex justify-between items-center animate-in slide-in-from-bottom-2">
                                        <div className="flex items-center gap-4">
                                            <Badge className="bg-slate-900 text-white font-black h-8 w-8 flex items-center justify-center rounded-lg border-none text-[10px]">{idx + 1}</Badge>
                                            <div>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Due Date</p>
                                                <p className="text-xs font-bold text-slate-900 mt-1">{item.date}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none">Amount Due</p>
                                            <p className="text-md font-black text-slate-900 tabular-nums mt-1">{item.amount.toLocaleString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* 2. FINANCIAL CONTROLS (THE HOW) */}
                <div className="lg:col-span-4 space-y-6">
                    <Card className="border-none shadow-2xl rounded-[3rem] bg-slate-900 text-white p-10 space-y-8 border-b-[16px] border-blue-600">
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <Label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Assign Client Debtor</Label>
                                <Select value={customerId} onValueChange={setCustomerId}>
                                    <SelectTrigger className="h-12 bg-white/5 border-white/10 rounded-xl font-bold text-white shadow-inner">
                                        <SelectValue placeholder="Identify Partner" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {customers?.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-bold">{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="pt-6 border-t border-white/5 space-y-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Total Transaction Value</span>
                                    <span className="text-white font-black text-lg">{totalSaleValue.toLocaleString()}</span>
                                </div>
                                
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest ml-1">Initial Deposit Collected</Label>
                                    <div className="relative">
                                        <Input 
                                            type="number" 
                                            value={deposit} 
                                            onChange={(e) => setDeposit(Number(e.target.value))} 
                                            className="h-14 bg-white/5 border-white/10 rounded-2xl font-black text-emerald-400 text-3xl tabular-nums pl-12 shadow-inner focus-visible:ring-emerald-500/30" 
                                        />
                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400/30" size={24} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Plan Duration (Months)</Label>
                                    <Input 
                                        type="number" 
                                        value={months} 
                                        onChange={(e) => setMonths(Number(e.target.value))} 
                                        className="h-12 bg-white/5 border-white/10 rounded-xl font-black text-white text-xl tabular-nums" 
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-white/10 flex justify-between items-end">
                            <div className="space-y-2">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calculated Balance Due</p>
                                <h4 className="text-5xl font-black text-blue-400 tabular-nums tracking-tighter">
                                    {(totalSaleValue - deposit).toLocaleString()}
                                </h4>
                            </div>
                        </div>

                        <Button 
                            disabled={planMutation.isPending || !customerId || selectedItems.length === 0}
                            onClick={() => planMutation.mutate()}
                            className="w-full h-20 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-3xl shadow-xl uppercase tracking-[0.3em] text-xs transition-all active:scale-95 border-none"
                        >
                            {planMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Protocol & Break Seal"}
                        </Button>
                    </Card>

                    <div className="p-8 bg-white rounded-3xl border border-slate-100 shadow-sm space-y-4">
                        <div className="flex items-center gap-3 text-blue-600">
                            <Database size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest">Network Ledger Link</span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium leading-relaxed uppercase tracking-wider">
                            Authorizing this plan will trigger an immediate stock deduction from the warehouse and register the deferred revenue in the global accounts receivable ledger.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}