'use client';

import React, { useState, useMemo, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent
} from "@/components/ui/card";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { 
  Search, X, Factory, Beaker, Truck, Utensils, 
  UserCheck, CheckCircle2, AlertCircle, Loader2, 
  TrendingUp, Wallet, PackagePlus, FlaskConical, Scale, 
  Trash2, Plus, Calendar, ShieldAlert, ShieldCheck, ClipboardList, Settings2
} from "lucide-react";
import { cn } from "@/lib/utils";

// --- TYPES ---
export interface ManufacturingOrder {
  id: string;
  batch_number: string;
  output_variant_id: number;
  product_name: string;
  sku: string;
  planned_quantity: number;
  actual_quantity_produced: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  tenant_id: string;
  business_id: string;
  created_at: string;
}

interface IngredientLog {
  variant_id: string;
  name: string;
  planned_qty: number;
  actual_qty: number;
  waste_qty: number; 
  unit_cost: number;
}

interface Expense {
  category: string; 
  amount: number;
}

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  
  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Form States (Industrial Detail)
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<IngredientLog[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [qcSupervisor, setQcSupervisor] = useState("");

  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  // --- 1. DEEP CORE DATA QUERIES ---
  const { data: profile } = useQuery({
    queryKey: ['business_profile_mfg'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('*, business_name, currency').eq('id', user?.id).limit(1).single();
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'UGX';

  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      // Fetching from the repaired sector-aware view
      const { data, error } = await supabase
        .from('mfg_production_orders_view')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as ManufacturingOrder[];
    }
  });

  const { data: compositeProducts } = useQuery({
    queryKey: ['composite_products'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('id, name, product:products(name)')
        .eq('is_composite', true)
        .eq('is_active', true);
      return data || [];
    }
  });

  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials_registry_mfg'],
    queryFn: async () => {
      // Pulling from high-integrity material ledger
      const { data } = await supabase.from('raw_material_registry').select('*');
      return data || [];
    }
  });

  // --- 2. LOGIC HANDLERS ---
  const addIngredientFromInventory = (variantId: string) => {
    if (ingredientLogs.find(i => i.variant_id === variantId)) {
        return toast.error("Ingredient already mapped to batch.");
    }
    const material: any = rawMaterials?.find((m: any) => m.variant_id.toString() === variantId);
    if (!material) return;

    setIngredientLogs([...ingredientLogs, {
      variant_id: material.variant_id.toString(),
      name: material.product_name,
      planned_qty: 0,
      actual_qty: 1,
      waste_qty: 0,
      unit_cost: material.buying_price || 0
    }]);
  };

  const removeIngredient = (variantId: string) => {
    setIngredientLogs(ingredientLogs.filter(i => i.variant_id !== variantId));
  };

  const openAuditDialog = async (order: ManufacturingOrder) => {
    // RESOLVE FORMULA: Fetch recipe from BOM table
    const { data: recipe } = await supabase.rpc('get_composite_details_v5', { 
        p_variant_id: order.output_variant_id 
    });
    
    if (recipe?.components) {
      setIngredientLogs(recipe.components.map((c: any) => ({
        variant_id: c.component_variant_id.toString(),
        name: c.component_name,
        planned_qty: c.quantity,
        actual_qty: Number((c.quantity * order.planned_quantity).toFixed(4)),
        waste_qty: 0,
        unit_cost: c.unit_cost || 0
      })));
    } else {
        setIngredientLogs([]);
    }

    setActualYield(order.planned_quantity);
    setExpenses([
        { category: 'Machine Power & Utility', amount: 0 },
        { category: 'Direct Labor Hours', amount: 0 }
    ]);
    setSelectedOrder(order);
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!newOrder.variant_id || !newOrder.batch) throw new Error("Product and Batch ID required.");
      
      const { data: prof } = await supabase.from('profiles').select('business_id').limit(1).single();

      const { error } = await supabase.from('mfg_production_orders').insert([{
        output_variant_id: parseInt(newOrder.variant_id),
        planned_quantity: newOrder.qty,
        batch_number: newOrder.batch.toUpperCase(),
        status: 'draft',
        business_id: prof?.business_id,
        tenant_id: prof?.business_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Industrial batch initiated");
      setIsCreateModalOpen(false);
      setNewOrder({ variant_id: '', qty: 1, batch: '' });
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(e.message)
  });

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;
      if (actualYield <= 0) throw new Error("Yield cannot be zero.");
      if (!expiryDate) throw new Error("Pharma/Food regulation requires expiry date.");

      // 1. ATOMIC LOGS: Capture Inputs and Overheads
      await supabase.from('mfg_production_ingredient_logs').insert(
        ingredientLogs.map(l => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: l.variant_id,
          quantity_used: l.actual_qty,
          unit_cost_at_run: l.unit_cost,
          business_id: selectedOrder.business_id
        }))
      );

      await supabase.from('mfg_production_expenses').insert(
        expenses.map(e => ({
          production_order_id: selectedOrder.id,
          expense_category: e.category,
          amount: e.amount,
          tenant_id: selectedOrder.business_id
        }))
      );

      // 2. SEAL BATCH: Update status and dates
      await supabase.from('mfg_production_orders').update({ 
          actual_quantity_produced: actualYield,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          qc_inspector: qcSupervisor,
          status: 'confirmed'
      }).eq('id', selectedOrder.id);

      // 3. EXECUTE WELD: Move assets to Warehouse and General Ledger
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { 
          p_order_id: selectedOrder.id 
      });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Industrial transformation complete and Ledger Sealed.");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Process Error: ${e.message}`)
  });

  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? (total / actualYield) : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return (
    <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      <p className="text-slate-400 font-black text-xs uppercase tracking-widest animate-pulse">Syncing Industrial Data...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 font-sans animate-in fade-in duration-700">
      
      {/* PAGE HEADER */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
            <Factory className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 tracking-tighter">Production Hub</h1>
            <div className="flex items-center gap-2 mt-1">
               <ShieldCheck size={14} className="text-emerald-500" /> 
               <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest leading-none">Enterprise Registry Sync: Active</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl shadow-blue-600/20 uppercase tracking-widest text-xs">
          <PackagePlus className="mr-2 h-5 w-5" /> Initiate production run
        </Button>
      </div>

      {/* BATCH MONITOR TABLE */}
      <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm rounded-[2.5rem] overflow-hidden bg-white">
        <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <CardTitle className="text-lg font-black text-slate-900 uppercase tracking-tight">Active Sector Runs</CardTitle>
            <CardDescription className="text-xs font-medium text-slate-400 mt-1">Monitor ongoing asset transformation across the manufacturing sector.</CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <Input 
              placeholder="Search by Lot ID or Product..." 
              value={filter} 
              onChange={e => setFilter(e.target.value)} 
              className="pl-10 h-11 border-slate-200 bg-slate-50/50 focus:bg-white transition-all font-bold rounded-xl" 
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow className="border-none">
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 px-8 tracking-widest">Batch identity</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Target good</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest">Yield Plan</TableHead>
                  <TableHead className="text-[10px] font-black uppercase text-slate-400 py-5 tracking-widest text-center">Batch Status</TableHead>
                  <TableHead className="text-right pr-8 text-[10px] font-black uppercase text-slate-400 tracking-widest">Control</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter(o => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map(o => (
                  <TableRow key={o.id} className="hover:bg-slate-50/50 transition-all border-b border-slate-50 last:border-none group h-20">
                    <TableCell className="px-8 font-mono font-black text-blue-600 text-sm">{o.batch_number || 'LOT-N/A'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-black text-slate-900 text-sm tracking-tight">{o.product_name}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{o.sku} Certified</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-black text-slate-700 text-sm">{o.planned_quantity.toLocaleString()} Units</TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn(
                        "font-black uppercase text-[9px] px-3 py-1 rounded-lg border",
                        o.status === 'completed' ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-blue-50 text-blue-700 border-blue-100 animate-pulse"
                      )}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right pr-8">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openAuditDialog(o)} size="sm" className="bg-slate-900 hover:bg-blue-700 font-black px-6 rounded-xl text-[10px] uppercase tracking-widest transition-all">
                          Finalize Batch
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* CREATE MODAL */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-lg rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Initiate industrial run</DialogTitle>
            <DialogDescription className="text-slate-400 font-medium text-xs mt-2 uppercase tracking-[0.3em]">Authorize batch molecular transformation.</DialogDescription>
          </div>
          <div className="p-8 space-y-8">
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Good to Produce</Label>
              <Select value={newOrder.variant_id} onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm"><SelectValue placeholder="Select Product Target" /></SelectTrigger>
                <SelectContent className="rounded-2xl shadow-2xl">
                  {compositeProducts?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()}>{g.product?.name} ({g.name})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-8">
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Batch Lot ID #</Label>
                  <Input placeholder="LOT-2024-01" value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 border-slate-200 font-black uppercase rounded-2xl shadow-sm" />
               </div>
               <div className="space-y-3">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Planned Quantity</Label>
                  <Input type="number" min="1" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 border-slate-200 font-black text-blue-600 rounded-2xl shadow-sm" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-8 border-t border-slate-100 flex gap-4">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-bold text-slate-400 uppercase tracking-widest text-[10px]">Cancel</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-12 rounded-[1.5rem] shadow-2xl shadow-blue-600/30 uppercase tracking-[0.2em] text-xs">
              {createOrderMutation.isPending ? <Loader2 className="animate-spin" /> : "Authorize Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FINALIZATION DIALOG (Industrial Audit) */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-6xl h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-[0_48px_96px_-24px_rgba(0,0,0,0.3)] rounded-[3rem]">
          <DialogHeader className="bg-slate-900 text-white p-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-10">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 bg-blue-600 rounded-[1.5rem] flex items-center justify-center shadow-2xl shadow-blue-500/30">
                   <ClipboardList className="text-white h-8 w-8" />
                </div>
                <div>
                    <DialogTitle className="text-3xl font-black uppercase tracking-tight">Forensic Production Audit</DialogTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1 italic">Lot Identification: {selectedOrder?.batch_number}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Landed unit cost</p>
                <p className="text-5xl font-black text-emerald-400 tracking-tighter mt-2">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold opacity-30 uppercase">{businessCurrency}</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <ScrollArea className="flex-1 p-10">
              <div className="space-y-12">
                
                {/* BATCH DATA & DATES */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                    <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Manufacturing Date</Label>
                        <Input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="h-12 border-slate-200 font-black rounded-2xl bg-white" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase text-red-400 tracking-widest ml-1">Lot Expiry Date</Label>
                        <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-12 border-red-100 text-red-600 font-black rounded-2xl bg-white" />
                    </div>
                    <div className="space-y-3">
                        <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest ml-1">Audit / QC Supervisor</Label>
                        <Input placeholder="Authorized Name" value={qcSupervisor} onChange={e => setQcSupervisor(e.target.value)} className="h-12 border-slate-200 font-black rounded-2xl bg-white" />
                    </div>
                </div>

                {/* 1. INPUT ABSORPTION */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4">
                      <Beaker className="text-blue-600 h-6 w-6" /> 1. Physical Inputs Absorption
                    </h3>
                    <Select onValueChange={addIngredientFromInventory}>
                      <SelectTrigger className="w-72 h-10 font-black text-[10px] bg-slate-50 border-slate-200 uppercase tracking-widest rounded-xl">
                          <SelectValue placeholder="+ MAP EXTRA RAW MATERIAL" />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl shadow-2xl">
                          {rawMaterials?.map((rm: any) => <SelectItem key={rm.variant_id} value={rm.variant_id.toString()} className="font-bold">{rm.product_name} ({rm.sku})</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-lg p-2 bg-white">
                    <Table>
                      <TableHeader className="bg-slate-50/50">
                        <TableRow className="border-none">
                          <TableHead className="text-[9px] font-black uppercase py-4 pl-10 tracking-[0.3em] text-slate-400">Chemical Identity</TableHead>
                          <TableHead className="text-[9px] font-black uppercase py-4 text-center tracking-[0.3em] text-slate-400">Volume Burn</TableHead>
                          <TableHead className="text-[9px] font-black uppercase py-4 text-right pr-10 tracking-[0.3em] text-slate-400">At-Run Cost</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {ingredientLogs.map((log, idx) => (
                          <TableRow key={idx} className="h-24 hover:bg-slate-50/50 border-b border-slate-50 last:border-none group rounded-3xl">
                            <TableCell className="pl-10 font-black text-slate-900 text-base tracking-tight">{log.name}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-3">
                                <Input type="number" step="0.0001" value={log.actual_qty} onChange={e => { const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n); }} className="h-11 w-32 font-black text-center border-slate-200 bg-slate-50 rounded-2xl text-blue-600 text-lg shadow-inner" />
                                <Button variant="ghost" size="sm" onClick={() => removeIngredient(log.variant_id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16}/></Button>
                              </div>
                            </TableCell>
                            <TableCell className="text-right pr-10 font-mono font-black text-slate-500">{log.unit_cost.toLocaleString()}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* 2. OVERHEAD ABSORPTION */}
                <div className="space-y-8 pb-16">
                   <div className="flex justify-between items-center px-2">
                    <h3 className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 flex items-center gap-4">
                      <Wallet className="text-orange-500 h-6 w-6" /> 2. Overhead Ledgers
                    </h3>
                    <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', amount: 0 }])} className="h-11 px-6 font-black border-orange-200 text-orange-700 bg-orange-50/50 hover:bg-orange-100 rounded-[1.25rem] transition-all uppercase tracking-widest text-[9px] shadow-sm">
                      <Plus className="mr-2 h-4 w-4" /> Add overhead row
                    </Button>
                  </div>
                  <div className="space-y-5">
                    {expenses.map((exp, idx) => (
                      <div key={idx} className="flex gap-8 items-center bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-lg transition-all hover:shadow-2xl">
                        <div className="flex-1">
                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] ml-2">Description</Label>
                          <Input placeholder="e.g. Mixing Power Consumption" value={exp.category} onChange={e => { const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n); }} className="h-12 mt-2 font-black border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-sm shadow-inner" />
                        </div>
                        <div className="w-56">
                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] text-right block mr-2">Absorbed Valuation</Label>
                          <Input type="number" value={exp.amount} onChange={e => { const n = [...expenses]; n[idx].amount = Number(e.target.value); setExpenses(n); }} className="h-12 mt-2 font-black text-right border-slate-200 bg-slate-50 focus:bg-white rounded-2xl text-lg text-orange-600 shadow-inner" />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="mt-7 text-slate-200 hover:text-red-500 h-12 transition-colors"><Trash2 size={24} /></Button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </ScrollArea>

            {/* FINANCIAL SIDEBAR */}
            <div className="w-full lg:w-[480px] bg-slate-50 border-l border-slate-100 p-12 flex flex-col justify-between">
              <div className="space-y-14">
                <div className="space-y-8 text-center px-4">
                    <Label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">Final Industrial Yield</Label>
                    <Input type="number" step="0.001" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-28 text-7xl font-black bg-white border-slate-100 text-center rounded-[3rem] shadow-2xl text-slate-900 tracking-tighter" />
                    <p className="text-[10px] text-slate-400 font-black leading-relaxed italic uppercase tracking-widest opacity-60">Input final molecular volume for Ledger Seal.</p>
                </div>

                <div className="pt-12 border-t border-slate-200 space-y-8">
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Input Absorption</span>
                    <span className="text-slate-900 font-mono text-sm">{financialAudit.matTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <span>Overhead Absorption</span>
                    <span className="text-slate-900 font-mono text-sm">{financialAudit.expTotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-3xl font-black text-slate-900 pt-10 border-t-4 border-slate-900 tracking-tighter">
                    <span className="uppercase tracking-tight text-sm text-slate-400">Total valuation</span>
                    <span className="text-blue-600">{financialAudit.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-10 pt-16">
                <Card className="bg-slate-900 text-white border-none shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] rounded-[2.5rem] overflow-hidden relative group">
                  <div className="absolute top-0 right-0 p-8 opacity-5 transition-transform duration-700 group-hover:rotate-[360deg]">
                      <Settings2 size={120} />
                  </div>
                  <CardContent className="p-10 relative z-10 space-y-6">
                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.5em]">Forensic Analytics</p>
                    <div>
                      <p className="text-xs text-slate-400 font-medium tracking-tight italic opacity-60">Landed cost per unit:</p>
                      <p className="text-6xl font-black tracking-tighter text-white mt-4">{financialAudit.unitCost.toLocaleString()}</p>
                    </div>
                    <div className="flex items-center gap-4 text-[9px] font-black uppercase text-emerald-400 pt-6 tracking-[0.3em]">
                        <TrendingUp size={18} className="animate-bounce" /> <span>Precision Cost Lock Active</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t border-slate-50 p-12 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center border-2 border-emerald-100"><CheckCircle2 className="text-emerald-600 h-10 w-10" /></div>
              <div>
                <p className="text-base font-black uppercase tracking-tight text-slate-900">Execute asset transformation</p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1 italic">Atomic Ledger Sync Authorized</p>
              </div>
            </div>
            <div className="flex gap-6 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-black text-slate-300 hover:text-red-500 h-16 px-10 uppercase tracking-[0.4em] text-[10px] transition-all">Abort run</Button>
              <Button onClick={() => finalizeProductionMutation.mutate()} disabled={finalizeProductionMutation.isPending} className="bg-blue-600 hover:bg-blue-700 text-white h-16 px-16 font-black shadow-2xl shadow-blue-600/30 rounded-3xl flex-1 sm:flex-none uppercase tracking-[0.3em] text-xs transition-all hover:scale-105 active:scale-95">
                {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Ledger Weld"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SYSTEM STATUS FOOTER */}
      <footer className="max-w-7xl mx-auto mt-16 flex items-center justify-between border-t border-slate-100 pt-10 pb-12">
          <div className="space-y-1 px-4">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Sector Protocol Health</p>
             <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-[9px] font-black bg-white border-slate-200">ISO-9001 SYNC</Badge>
                <Badge variant="outline" className="text-[9px] font-black bg-white border-slate-200 uppercase tracking-tighter">BigInt / UUID: OPERATIONAL</Badge>
             </div>
          </div>
          <div className="flex items-center gap-4 px-8 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm transition-all hover:shadow-xl group">
             <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse group-hover:scale-150 transition-transform" />
             <span className="text-[11px] font-black text-slate-600 uppercase tracking-[0.4em]">
                Molecular sync engine: active
             </span>
          </div>
      </footer>
    </div>
  );
}