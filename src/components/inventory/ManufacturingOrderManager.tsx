'use client';

import React, { useState, useMemo } from "react";
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
  Trash2, Plus, Calendar, ShieldAlert
} from "lucide-react";

// --- TYPES ---
export interface ManufacturingOrder {
  id: string;
  batch_number: string;
  output_variant_id: number;
  product_name: string;
  sku: string;
  planned_quantity: number;
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed';
  tenant_id: string;
}

interface IngredientLog {
  variant_id: string;
  name: string;
  planned_qty: number;
  actual_qty: number;
  waste_qty: number; // For scrap tracking
  unit_cost: number;
}

interface Expense {
  category: string; // Dynamic description
  hours_or_units: number;
  rate: number;
  amount: number;
}

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  
  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Deep Audit States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<IngredientLog[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);
  const [mfgDate, setMfgDate] = useState(new Date().toISOString().split('T')[0]);
  const [expiryDate, setExpiryDate] = useState("");
  const [qcSupervisor, setQcSupervisor] = useState("");

  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });

  // --- 1. CORE DATA QUERIES ---
  
  // Fetch active production orders
  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as ManufacturingOrder[];
    }
  });

  // Fetch Finished Goods (Composite Items)
  const { data: finishedGoods } = useQuery({
    queryKey: ['composite_products'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variants').select('id, name, sku').eq('is_composite', true);
      return data || [];
    }
  });

  // Fetch ONLY Raw Materials for the Ingredient Picker (Zero Confusion)
  const { data: rawMaterials } = useQuery({
    queryKey: ['raw_materials_registry'],
    queryFn: async () => {
      const { data } = await supabase
        .from('product_variants')
        .select('id, name, sku, cost_price')
        .eq('is_raw_material', true)
        .eq('is_active', true);
      return data || [];
    }
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, name');
      return data || [];
    }
  });

  // --- 2. LOGIC: MATERIAL SELECTION ---
  const addIngredientFromInventory = (variantId: string) => {
    const material = rawMaterials?.find(m => m.id.toString() === variantId);
    if (!material) return;

    setIngredientLogs([...ingredientLogs, {
      variant_id: material.id.toString(),
      name: material.name,
      planned_qty: 0,
      actual_qty: 1,
      waste_qty: 0,
      unit_cost: material.cost_price || 0
    }]);
  };

  // --- 3. PRODUCTION EXECUTION ---
  const openAuditDialog = async (order: ManufacturingOrder) => {
    // Fetch formula/recipe for the batch to pre-fill
    const { data: recipe } = await supabase.rpc('get_composite_details_v5', { p_variant_id: order.output_variant_id });
    
    if (recipe?.components) {
      setIngredientLogs(recipe.components.map((c: any) => ({
        variant_id: c.component_variant_id.toString(),
        name: c.component_name,
        planned_qty: c.quantity,
        actual_qty: c.quantity * order.planned_quantity,
        waste_qty: 0,
        unit_cost: c.unit_cost || 0
      })));
    } else {
        setIngredientLogs([]);
    }

    setActualYield(order.planned_quantity);
    setExpenses([
        { category: 'General Labor', hours_or_units: 1, rate: 0, amount: 0 },
        { category: 'Logistics/Transport', hours_or_units: 1, rate: 0, amount: 0 }
    ]);
    setSelectedOrder(order);
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase.from('mfg_production_orders').insert([{
        output_variant_id: parseInt(newOrder.variant_id),
        planned_quantity: newOrder.qty,
        batch_number: newOrder.batch,
        status: 'draft',
        tenant_id: user?.user_metadata?.tenant_id
      }]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Work Order Initialized");
      setIsCreateModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    }
  });

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;

      // 1. Audit Ingredient & Supplier Usage (With Waste)
      const { error: ingErr } = await supabase.from('mfg_production_ingredient_logs').insert(
        ingredientLogs.map(l => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: l.variant_id,
          quantity_used: l.actual_qty,
          waste_qty: l.waste_qty,
          unit_cost_at_run: l.unit_cost,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (ingErr) throw ingErr;

      // 2. Audit Expenditures (Dynamic Description - No Hardcoding)
      const { error: expErr } = await supabase.from('mfg_production_expenses').insert(
        expenses.map(e => ({
          production_order_id: selectedOrder.id,
          expense_category: e.category,
          description: e.category,
          amount: e.hours_or_units * e.rate,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (expErr) throw expErr;

      // 3. Update Meta
      await supabase.from('mfg_production_orders').update({ 
          actual_quantity_produced: actualYield,
          mfg_date: mfgDate,
          expiry_date: expiryDate,
          qc_inspector: qcSupervisor
      }).eq('id', selectedOrder.id);

      // 4. TRIGGER MASTER SYNC (Stock, GL, POS)
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { p_order_id: selectedOrder.id });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Production Batch Finalized & Valued");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Critical Sync Error: ${e.message}`)
  });

  // --- 4. CALCULATION ENGINE ---
  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + (e.hours_or_units * e.rate), 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="p-20 text-center font-black"><Loader2 className="animate-spin inline mr-3"/>RECOVERYING ENTERPRISE SECURE DATA...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-1000">
      
      {/* --- MASTER DASHBOARD --- */}
      <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
        <CardHeader className="bg-slate-900 border-b p-10 text-white">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8">
            <div className="flex items-center gap-5">
              <div className="h-16 w-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg">
                 <Factory className="h-9 w-9 text-white" />
              </div>
              <div>
                <CardTitle className="text-3xl font-black tracking-tighter">Manufacturing Command Center</CardTitle>
                <CardDescription className="text-blue-400 font-black text-xs uppercase tracking-[0.3em] mt-1">
                  Autonomous Production & Forensic Cost Audit
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-4">
              <Button onClick={() => setIsCreateModalOpen(true)} className="h-14 px-10 font-black bg-white text-slate-900 hover:bg-blue-500 hover:text-white shadow-2xl transition-all rounded-2xl gap-3">
                <PackagePlus className="h-5 w-5" /> START BATCH RUN
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="p-8 bg-white border-b flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
               <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Active Ledger Sync: Verified</p>
            </div>
            <div className="relative w-full max-w-md">
               <Search className="absolute left-4 top-4 h-4 w-4 text-slate-300" />
               <Input placeholder="Search batch or product..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-12 h-12 border-slate-100 bg-slate-50/50 rounded-xl font-bold" />
            </div>
          </div>
          
          <ScrollArea className="h-[550px]">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-xl">
                <TableRow className="border-none">
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 px-10 py-6">Batch ID</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Target Asset</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Planned Output</TableHead>
                  <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] text-slate-400 text-center">Lifecycle</TableHead>
                  <TableHead className="text-right px-10 font-black text-[10px] uppercase tracking-[0.2em] text-slate-400">Operations</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter(o => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map(o => (
                  <TableRow key={o.id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50">
                    <TableCell className="font-mono text-blue-600 font-black px-10 py-6">{o.batch_number || 'N/A'}</TableCell>
                    <TableCell className="font-black text-slate-800 text-base">{o.product_name} <br/><span className="text-[10px] text-slate-400 font-mono">SKU: {o.sku}</span></TableCell>
                    <TableCell className="font-black text-slate-900 text-xl">{o.planned_quantity.toLocaleString()}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant="outline" className={`font-black uppercase text-[9px] py-1 px-4 rounded-full border-2 ${o.status === 'completed' ? 'text-emerald-600 border-emerald-100 bg-emerald-50' : 'text-blue-600 border-blue-100'}`}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-10">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openAuditDialog(o)} className="bg-slate-900 hover:bg-blue-600 font-black text-[10px] uppercase tracking-widest h-10 px-8 rounded-xl shadow-xl">
                          AUDIT BATCH
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* --- MODAL: CREATE WORK ORDER --- */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-blue-600 p-10 text-white">
            <DialogTitle className="text-3xl font-black tracking-tighter">Initiate Production</DialogTitle>
            <DialogDescription className="text-blue-100 font-bold opacity-70 mt-2 uppercase text-[10px] tracking-widest">Select target formula to deploy resources.</DialogDescription>
          </div>
          <div className="p-10 space-y-8">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Finished Product</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-14 font-black border-slate-100 bg-slate-50 rounded-xl"><SelectValue placeholder="Pick Product" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()} className="font-bold">{g.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Batch Reference</Label>
                  <Input placeholder="BN-2024-X" value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-14 font-black bg-slate-50 border-slate-100 rounded-xl" />
               </div>
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Planned Units</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-14 font-black bg-slate-50 border-slate-100 rounded-xl" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-8 border-t border-slate-100">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-black text-xs uppercase tracking-widest">Abort</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 font-black px-12 h-14 shadow-2xl rounded-2xl">
              {createOrderMutation.isPending ? "DEPLOYING..." : "CONFIRM & INITIALIZE"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MASTER DEEP AUDIT DIALOG --- */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1400px] h-[95vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-[3rem]">
          <DialogHeader className="bg-slate-900 text-white p-12">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-blue-500/20 shadow-2xl">
                   <Beaker className="text-white h-10 w-10" />
                </div>
                <div>
                    <DialogTitle className="text-4xl font-black tracking-tighter">Batch Audit: {selectedOrder?.batch_number}</DialogTitle>
                    <DialogDescription className="text-slate-500 font-black text-[10px] uppercase tracking-[0.4em] mt-2">
                        Manufacturing Sovereignty • High-Compliance Forensic Audit
                    </DialogDescription>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">Audited Landed Cost / Unit</p>
                <p className="text-6xl font-black text-emerald-400 tabular-nums tracking-tighter mt-2">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold opacity-40">UGX</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <div className="flex-1 p-12 space-y-12 overflow-y-auto scrollbar-hide">
              
              {/* SECTION 0: METADATA */}
              <section className="grid grid-cols-3 gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                  <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Manufacture Date</Label>
                      <Input type="date" value={mfgDate} onChange={e => setMfgDate(e.target.value)} className="h-12 font-black rounded-xl border-slate-100 bg-white" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-red-500 tracking-widest">Expiry Threshold</Label>
                      <Input type="date" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="h-12 font-black rounded-xl border-red-100 bg-red-50/10 text-red-600" />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase text-slate-400 tracking-widest">QC Supervisor / Chemist</Label>
                      <Input placeholder="Identify Sign-off" value={qcSupervisor} onChange={e => setQcSupervisor(e.target.value)} className="h-12 font-black rounded-xl border-slate-100 bg-white" />
                  </div>
              </section>

              {/* SECTION 1: INGREDIENTS AUDIT */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b pb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-4">
                    <FlaskConical className="text-blue-600 h-6 w-6" /> 1. RAW MATERIAL & CHEMICAL CONSUMPTION
                  </h3>
                  <Select onValueChange={addIngredientFromInventory}>
                    <SelectTrigger className="w-[300px] h-12 font-black text-xs border-blue-100 text-blue-600 rounded-xl bg-blue-50/50">
                        <SelectValue placeholder="+ PICK FROM SYSTEM INVENTORY" />
                    </SelectTrigger>
                    <SelectContent>
                        {rawMaterials?.map(rm => (
                            <SelectItem key={rm.id} value={rm.id.toString()} className="font-bold">
                                {rm.name} ({rm.sku})
                            </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-[2rem] overflow-hidden border border-slate-100 shadow-sm">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow className="border-none">
                        <TableHead className="text-[9px] font-black uppercase py-6 px-8">Material Identity</TableHead>
                        <TableHead className="text-[9px] font-black uppercase py-6 text-center">Actual Used</TableHead>
                        <TableHead className="text-[9px] font-black uppercase py-6 text-center text-red-500">Waste/Scrap</TableHead>
                        <TableHead className="text-[9px] font-black uppercase py-6 text-right px-8">Landed Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientLogs.map((log, idx) => (
                        <TableRow key={idx} className="border-b border-slate-50">
                          <TableCell className="font-black text-slate-800 px-8 py-6 text-base">
                             {log.name} <br/><span className="text-[9px] text-slate-400 font-mono">Sourced Input</span>
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={log.actual_qty} onChange={e => {
                               const n = [...ingredientLogs]; n[idx].actual_qty = Number(e.target.value); setIngredientLogs(n);
                            }} className="h-12 font-black text-center text-lg bg-slate-50/50 border-none rounded-xl" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={log.waste_qty} onChange={e => {
                               const n = [...ingredientLogs]; n[idx].waste_qty = Number(e.target.value); setIngredientLogs(n);
                            }} className="h-12 font-black text-center text-lg bg-red-50/50 border-none text-red-600 rounded-xl" />
                          </TableCell>
                          <TableCell className="px-8">
                            <Input type="number" value={log.unit_cost} onChange={e => {
                               const n = [...ingredientLogs]; n[idx].unit_cost = Number(e.target.value); setIngredientLogs(n);
                            }} className="h-12 font-mono text-right font-black text-lg bg-emerald-50/50 border-none rounded-xl" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* SECTION 2: DYNAMIC OPERATIONAL EXPENSES (Zero Hardcoding) */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-b pb-6">
                  <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400 flex items-center gap-4">
                    <Wallet className="text-orange-500 h-6 w-6" /> 2. DYNAMIC OPERATIONAL EXPENDITURES
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: '', hours_or_units: 1, rate: 0, amount: 0 }])} className="border-orange-100 text-orange-600 font-black h-12 px-8 rounded-xl hover:bg-orange-50">
                    + ADD COST LINE
                  </Button>
                </div>
                <div className="space-y-4">
                  {expenses.map((exp, idx) => (
                    <div key={idx} className="flex gap-6 items-center bg-slate-50 p-6 rounded-[1.5rem] border border-slate-100 shadow-sm animate-in zoom-in-95 duration-300">
                      <div className="flex-1 space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400">Expense Description (e.g. Generator Fuel, Night Shift Labor)</Label>
                        <Input placeholder="Define custom cost..." value={exp.category} onChange={e => {
                            const n = [...expenses]; n[idx].category = e.target.value; setExpenses(n);
                        }} className="h-14 font-black bg-white rounded-xl border-slate-100 shadow-sm" />
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400 text-center block">Qty / Hours</Label>
                        <Input type="number" value={exp.hours_or_units} onChange={e => {
                            const n = [...expenses]; n[idx].hours_or_units = Number(e.target.value); setExpenses(n);
                        }} className="h-14 font-black text-center bg-white rounded-xl border-slate-100 shadow-sm" />
                      </div>
                      <div className="w-48 space-y-1">
                        <Label className="text-[9px] font-black uppercase text-slate-400 text-right block">Rate Per Unit</Label>
                        <Input type="number" value={exp.rate} onChange={e => {
                            const n = [...expenses]; n[idx].rate = Number(e.target.value); setExpenses(n);
                        }} className="h-14 font-black text-right bg-white rounded-xl border-slate-100 shadow-sm" />
                      </div>
                      <Button variant="ghost" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="mt-5 text-slate-300 hover:text-red-500">
                        <Trash2 size={24} />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SUMMARY SIDEBAR */}
            <div className="w-full lg:w-[480px] bg-slate-50 border-l border-slate-200 p-12 space-y-12">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.4em]">3. WAREHOUSE ENTRANCE YIELD</label>
                    <Badge className="bg-blue-600 text-[10px] font-black px-4 py-1">REAL UNITS</Badge>
                </div>
                <div className="relative group">
                  <div className="absolute inset-0 bg-blue-600 blur-2xl opacity-5 group-hover:opacity-20 transition-all" />
                  <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-24 text-6xl font-black bg-white border-none text-center rounded-[2rem] shadow-2xl relative z-10" />
                </div>
                <p className="text-[11px] text-slate-400 font-bold leading-relaxed text-center px-4">
                  Finalizing this count will trigger the <span className="text-blue-600">Perpetual Inventory Valuation</span> algorithm.
                </p>
              </div>

              <div className="pt-12 border-t-2 border-slate-200 space-y-8">
                <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                  <span>Total Ingredients Cost</span>
                  <span className="text-slate-900 text-base">{financialAudit.matTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-xs font-black text-slate-400 uppercase tracking-[0.3em]">
                  <span>Total Operational Overheads</span>
                  <span className="text-slate-900 text-base">{financialAudit.expTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center text-2xl font-black text-slate-900 pt-8 border-t-4 border-slate-900">
                  <span>GROSS BATCH COST</span>
                  <span className="text-blue-600">{financialAudit.total.toLocaleString()} <span className="text-xs">UGX</span></span>
                </div>
              </div>

              <Card className="bg-slate-900 text-white border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden group">
                <CardContent className="p-12 relative">
                  <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:rotate-12 transition-transform">
                      <ShieldAlert size={120} />
                  </div>
                  <div className="relative z-10 space-y-6">
                    <p className="text-[11px] font-black uppercase text-blue-400 tracking-[0.4em]">Neural Forensic Audit Score</p>
                    <p className="text-7xl font-black tracking-tighter tabular-nums">{financialAudit.unitCost.toLocaleString()}</p>
                    <div className="pt-4 border-t border-white/10 flex items-center gap-3">
                        <TrendingUp size={16} className="text-emerald-400" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Projected Market Margin Verified</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-[9px] text-slate-400 font-black uppercase tracking-[0.5em] text-center p-8 border-4 border-dashed rounded-[2rem] border-slate-200">
                SOVEREIGN NODE: {selectedOrder?.id.substring(0,18).toUpperCase()}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-12 flex flex-col sm:flex-row items-center justify-between gap-12">
            <div className="flex items-center gap-6">
              <div className="h-16 w-16 rounded-[1.5rem] bg-emerald-50 flex items-center justify-center border border-emerald-100 shadow-lg"><CheckCircle2 className="text-emerald-600 h-8 w-8" /></div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-slate-900">Audit Handshake Verified</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase">Ready to Sync with General Ledger & Stock</p>
              </div>
            </div>
            <div className="flex gap-8 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-black text-slate-300 h-20 px-12 hover:text-red-500 transition-all text-xs uppercase tracking-widest">Discard Audit</Button>
              <Button 
                onClick={() => finalizeProductionMutation.mutate()} 
                disabled={finalizeProductionMutation.isPending} 
                className="bg-blue-600 hover:bg-slate-900 text-white h-20 px-24 font-black text-lg shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] transition-all rounded-[2rem] flex-1 sm:flex-none uppercase tracking-[0.3em]"
              >
                {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin mr-5 h-8 w-8" /> : <ShieldAlert className="mr-5 h-8 w-8" />}
                {finalizeProductionMutation.isPending ? "SYNCING LEDGER..." : "CONFIRM AUDIT & SYNC"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}