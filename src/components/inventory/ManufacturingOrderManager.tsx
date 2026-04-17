'use client';

import React, { useState, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
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
  TrendingUp, Wallet, PackagePlus, FlaskConical, Scale, ListFilter
} from "lucide-react";

// --- ENTERPRISE TYPES ---
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
  variant_id: number;
  name: string;
  supplier_id: string;
  planned_qty: number;
  actual_qty: number;
  unit_cost: number;
}

interface Expense {
  category: 'Transport' | 'Meals' | 'Labor' | 'Packaging' | 'Other';
  description: string;
  amount: number;
}

const supabase = createClient();

export default function ManufacturingOrderManager() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  
  // Modal States
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);

  // Production Execution States
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<IngredientLog[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);

  // New Record Forms
  const [newOrder, setNewOrder] = useState({ variant_id: '', qty: 1, batch: '' });
  const [material, setMaterial] = useState({ name: '', sku: '', uom: '', cost: 0 });

  // --- 1. CORE DATA QUERIES ---
  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as ManufacturingOrder[];
    }
  });

  const { data: finishedGoods } = useQuery({
    queryKey: ['composite_products'],
    queryFn: async () => {
      const { data } = await supabase.from('product_variants').select('id, name, sku').eq('is_composite', true);
      return data || [];
    }
  });

  const { data: uoms } = useQuery({
    queryKey: ['units_of_measure'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation');
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

  // --- 2. REGISTRY & CREATION MUTATIONS ---
  const registerMaterialMutation = useMutation({
    mutationFn: async () => {
      const { data: prod, error: pErr } = await supabase.from('products').insert([{ name: material.name, is_active: true }]).select().single();
      if (pErr) throw pErr;
      const { error: vErr } = await supabase.from('product_variants').insert([{
        product_id: prod.id,
        name: 'Standard Material',
        sku: material.sku,
        uom_id: material.uom,
        cost_price: material.cost,
        price: 0,
        is_raw_material: true
      }]);
      if (vErr) throw vErr;
    },
    onSuccess: () => {
      toast.success("Material added to system registry.");
      setIsMaterialModalOpen(false);
      setMaterial({ name: '', sku: '', uom: '', cost: 0 });
    },
    onError: (e: any) => toast.error(e.message)
  });

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

  // --- 3. PRODUCTION EXECUTION & FINALIZATION ---
  const openAuditDialog = async (order: ManufacturingOrder) => {
    // Fetch formula/recipe for the batch
    const { data: recipe } = await supabase.rpc('get_composite_details_v5', { p_variant_id: order.output_variant_id });
    
    if (recipe?.components) {
      setIngredientLogs(recipe.components.map((c: any) => ({
        variant_id: c.component_variant_id,
        name: c.component_name,
        supplier_id: '',
        planned_qty: c.quantity,
        actual_qty: c.quantity * order.planned_quantity,
        unit_cost: 0
      })));
    }
    setActualYield(order.planned_quantity);
    setExpenses([]);
    setSelectedOrder(order);
  };

  const finalizeProductionMutation = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;

      // 1. Audit Ingredient & Supplier Usage
      const { error: ingErr } = await supabase.from('mfg_production_ingredient_logs').insert(
        ingredientLogs.map(l => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: l.variant_id,
          vendor_id: l.supplier_id || null,
          quantity_used: l.actual_qty,
          unit_cost_at_run: l.unit_cost,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (ingErr) throw ingErr;

      // 2. Audit Expenditures (Transport/Meals)
      const { error: expErr } = await supabase.from('mfg_production_expenses').insert(
        expenses.map(e => ({
          production_order_id: selectedOrder.id,
          expense_category: e.category,
          description: e.description,
          amount: e.amount,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (expErr) throw expErr;

      // 3. Update Yield
      await supabase.from('mfg_production_orders').update({ actual_quantity_produced: actualYield }).eq('id', selectedOrder.id);

      // 4. TRIGGER MASTER SYNC (Stock, GL, POS)
      const { error: syncErr } = await supabase.rpc('mfg_complete_production_v2', { p_order_id: selectedOrder.id });
      if (syncErr) throw syncErr;
    },
    onSuccess: () => {
      toast.success("Production Batch Audited & Synced Successfully");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (e: any) => toast.error(`Critical Sync Error: ${e.message}`)
  });

  // --- 4. CALCULATIONS ---
  const financialAudit = useMemo(() => {
    const matTotal = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expTotal = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matTotal + expTotal;
    return { matTotal, expTotal, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  if (isLoading) return <div className="p-20 text-center"><Loader2 className="animate-spin inline mr-2"/>Retrieving Enterprise Records...</div>;

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      
      {/* --- MASTER DASHBOARD CARD --- */}
      <Card className="border-slate-200 shadow-xl rounded-2xl bg-white overflow-hidden">
        <CardHeader className="bg-slate-50/80 border-b p-8">
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
            <div>
              <CardTitle className="text-3xl font-black text-slate-900 flex items-center gap-3">
                <Factory className="h-9 w-9 text-blue-600" /> Manufacturing Command Center
              </CardTitle>
              <CardDescription className="text-slate-500 font-bold text-sm mt-1">
                Deep audit production management for Chemicals, Pharma, and Agriculture.
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-4 w-full xl:w-auto">
              <Button variant="outline" onClick={() => setIsMaterialModalOpen(true)} className="h-12 px-6 font-black border-blue-200 text-blue-700 hover:bg-blue-50 transition-all rounded-xl">
                <FlaskConical className="mr-2 h-5 w-5" /> MATERIAL REGISTRY
              </Button>
              <Button onClick={() => setIsCreateModalOpen(true)} className="h-12 px-8 font-black bg-blue-600 hover:bg-blue-700 shadow-xl gap-2 transition-all rounded-xl">
                <PackagePlus className="h-5 w-5" /> NEW WORK ORDER
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="p-6 bg-white border-b flex justify-between items-center">
            <Badge variant="outline" className="font-bold text-slate-400 border-slate-200 py-1.5 px-4 rounded-full">
              System Sync Status: Active
            </Badge>
            <div className="relative w-full max-w-sm">
               <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
               <Input placeholder="Filter by batch number..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-10 h-10 border-slate-200 rounded-lg shadow-sm" />
            </div>
          </div>
          
          <ScrollArea className="h-[550px]">
            <Table>
              <TableHeader className="bg-slate-50/50 sticky top-0 z-10 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 px-8 py-5">Batch / MO ID</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Produced Product</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Planned Qty</TableHead>
                  <TableHead className="font-black text-[11px] uppercase tracking-[0.2em] text-slate-400 text-center">Lifecycle</TableHead>
                  <TableHead className="text-right px-8 font-black text-[11px] uppercase tracking-[0.2em] text-slate-400">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter(o => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map(o => (
                  <TableRow key={o.id} className="hover:bg-blue-50/30 transition-all group border-b border-slate-50">
                    <TableCell className="font-mono text-blue-600 font-black px-8 py-5">{o.batch_number || 'UNTRACKED'}</TableCell>
                    <TableCell className="font-black text-slate-800">{o.product_name} <br/><span className="text-[10px] text-slate-400 font-mono font-medium tracking-tighter">{o.sku}</span></TableCell>
                    <TableCell className="font-black text-slate-900 text-lg">{o.planned_quantity}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className={`font-black uppercase text-[10px] py-1 px-3 rounded-md ${o.status === 'completed' ? 'bg-emerald-600' : 'text-blue-600 border-blue-200 bg-blue-50'}`}>
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-8">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openAuditDialog(o)} className="bg-slate-900 hover:bg-blue-600 font-black text-[11px] uppercase h-9 px-6 rounded-lg shadow-lg">
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
        <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-blue-600 p-8 text-white">
            <DialogTitle className="text-2xl font-black">Initiate Batch</DialogTitle>
            <DialogDescription className="text-blue-100 font-medium opacity-80 mt-1">Select a production formula to begin.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Target Product</Label>
              <Select onValueChange={(val) => setNewOrder({...newOrder, variant_id: val})}>
                <SelectTrigger className="h-12 font-bold border-slate-200"><SelectValue placeholder="Choose Finished Good" /></SelectTrigger>
                <SelectContent>
                  {finishedGoods?.map((g: any) => <SelectItem key={g.id} value={g.id.toString()} className="font-bold">{g.name} ({g.sku})</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Batch ID</Label>
                  <Input placeholder="BATCH-00X" value={newOrder.batch} onChange={e => setNewOrder({...newOrder, batch: e.target.value})} className="h-12 font-black border-slate-200" />
               </div>
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Target Yield</Label>
                  <Input type="number" value={newOrder.qty} onChange={e => setNewOrder({...newOrder, qty: Number(e.target.value)})} className="h-12 font-black border-slate-200" />
               </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)} className="font-bold">Cancel</Button>
            <Button onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending} className="bg-blue-600 font-black px-10 h-12 shadow-lg rounded-xl">
              {createOrderMutation.isPending ? "CREATING..." : "START PRODUCTION"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: MATERIAL REGISTRY --- */}
      <Dialog open={isMaterialModalOpen} onOpenChange={setIsMaterialModalOpen}>
        <DialogContent className="max-w-md rounded-2xl border-none shadow-2xl p-0 overflow-hidden">
          <div className="bg-slate-900 p-8 text-white">
            <DialogTitle className="text-2xl font-black flex items-center gap-3">
              <FlaskConical className="text-blue-400" /> Material Registry
            </DialogTitle>
            <DialogDescription className="text-slate-400 font-medium mt-1">Define chemical elements or packaging materials.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Material Name</Label>
              <Input placeholder="e.g. Caustic Soda / Concentrates" value={material.name} onChange={e => setMaterial({...material, name: e.target.value})} className="h-12 font-black border-slate-200" />
            </div>
            <div className="grid grid-cols-2 gap-6">
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Material SKU</Label>
                  <Input placeholder="RM-001" value={material.sku} onChange={e => setMaterial({...material, sku: e.target.value})} className="h-12 font-black border-slate-200" />
               </div>
               <div className="space-y-2">
                  <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Measurement Unit</Label>
                  <Select onValueChange={(val) => setMaterial({...material, uom: val})}>
                    <SelectTrigger className="h-12 font-bold border-slate-200"><SelectValue placeholder="Select UOM" /></SelectTrigger>
                    <SelectContent>
                      {uoms?.map((u: any) => <SelectItem key={u.id} value={u.id} className="font-bold">{u.name} ({u.abbreviation})</SelectItem>)}
                    </SelectContent>
                  </Select>
               </div>
            </div>
            <div className="space-y-2">
              <Label className="font-black text-[10px] uppercase tracking-widest text-slate-400">Standard Cost (UGX)</Label>
              <div className="relative">
                <Wallet className="absolute left-4 top-4 h-4 w-4 text-slate-400" />
                <Input type="number" value={material.cost} onChange={e => setMaterial({...material, cost: Number(e.target.value)})} className="h-12 font-black pl-11 border-slate-200" />
              </div>
            </div>
          </div>
          <DialogFooter className="bg-slate-50 p-6 border-t border-slate-200">
            <Button variant="ghost" onClick={() => setIsMaterialModalOpen(false)} className="font-bold">Discard</Button>
            <Button onClick={() => registerMaterialMutation.mutate()} disabled={registerMaterialMutation.isPending} className="bg-slate-900 text-white font-black px-10 h-12 shadow-xl rounded-xl">
              {registerMaterialMutation.isPending ? "SAVING..." : "SAVE TO REGISTRY"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* --- MODAL: DEEP AUDIT DIALOG --- */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1280px] h-[92vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-3xl">
          <DialogHeader className="bg-slate-900 text-white p-10">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <DialogTitle className="text-4xl font-black flex items-center gap-4">
                  <Beaker className="text-blue-400 h-10 w-10" /> Batch Audit: {selectedOrder?.batch_number}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-black text-xs uppercase tracking-[0.3em]">
                  Manufacturing Intelligence Engine • High-Compliance Mode
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-slate-500 font-black uppercase tracking-[0.3em]">Real Landed Cost / Unit</p>
                <p className="text-5xl font-black text-emerald-400 leading-none mt-2 tabular-nums tracking-tighter">
                  {financialAudit.unitCost.toLocaleString()} <span className="text-sm font-bold opacity-60">UGX</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <div className="flex-1 p-10 space-y-12 overflow-y-auto scrollbar-hide">
              
              {/* SECTION: AUDIT MATERIALS */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-4">
                    <PackagePlus className="text-blue-600 h-6 w-6" /> 1. Input Verification & Supplier Chain
                  </h3>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-black px-4 py-1.5">Recipe Locked</Badge>
                </div>
                <div className="border border-slate-100 rounded-3xl overflow-hidden shadow-sm bg-slate-50/20">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase py-5 px-6">Input Material</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-5">Verified Supplier</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-5 text-center">Actual Consumption</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-5 text-right px-6">Landed Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientLogs.map((log, idx) => (
                        <TableRow key={log.variant_id} className="border-b border-slate-50 transition-colors">
                          <TableCell className="font-black text-slate-800 py-6 px-6 text-base">{log.name}</TableCell>
                          <TableCell>
                            <Select onValueChange={(val) => {
                              const newLogs = [...ingredientLogs];
                              newLogs[idx].supplier_id = val;
                              setIngredientLogs(newLogs);
                            }}>
                              <SelectTrigger className="h-11 font-black border-slate-200 bg-white"><SelectValue placeholder="Select Vendor" /></SelectTrigger>
                              <SelectContent>
                                {vendors?.map(v => <SelectItem key={v.id} value={v.id} className="font-bold">{v.name}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input type="number" value={log.actual_qty} onChange={e => {
                               const newLogs = [...ingredientLogs];
                               newLogs[idx].actual_qty = Number(e.target.value);
                               setIngredientLogs(newLogs);
                            }} className="h-11 font-black bg-white border-slate-200 text-center text-lg" />
                          </TableCell>
                          <TableCell className="px-6">
                            <Input type="number" placeholder="0" onChange={e => {
                               const newLogs = [...ingredientLogs];
                               newLogs[idx].unit_cost = Number(e.target.value);
                               setIngredientLogs(newLogs);
                            }} className="h-11 font-mono text-right font-black bg-white border-slate-200 text-lg" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* SECTION: AUDIT OVERHEAD */}
              <section className="space-y-6">
                <div className="flex justify-between items-center border-b border-slate-100 pb-5">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-500 flex items-center gap-4">
                    <Wallet className="text-orange-500 h-6 w-6" /> 2. Transport, Utilities & Overhead
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: 'Transport', description: '', amount: 0 }])} className="border-orange-200 text-orange-600 font-black h-10 px-6 hover:bg-orange-50 rounded-xl">
                    ADD EXPENDITURE LINE
                  </Button>
                </div>
                <div className="grid grid-cols-1 gap-5">
                  {expenses.map((exp, idx) => (
                    <div key={idx} className="flex gap-5 items-center bg-slate-50 p-5 rounded-3xl border border-slate-100 animate-in slide-in-from-left duration-500 shadow-sm">
                      <Select value={exp.category} onValueChange={(val: any) => {
                        const newExp = [...expenses];
                        newExp[idx].category = val;
                        setExpenses(newExp);
                      }}>
                        <SelectTrigger className="w-[200px] h-12 bg-white border-slate-200 font-black rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transport" className="font-bold"><div className="flex gap-2"><Truck size={14}/> Logistics</div></SelectItem>
                          <SelectItem value="Meals" className="font-bold"><div className="flex gap-2"><Utensils size={14}/> Daily Meals</div></SelectItem>
                          <SelectItem value="Labor" className="font-bold"><div className="flex gap-2"><UserCheck size={14}/> Contract Labor</div></SelectItem>
                          <SelectItem value="Packaging" className="font-bold"><div className="flex gap-2"><PackagePlus size={14}/> Containers</div></SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Description (e.g. Fuel / Rent / Water)" value={exp.description} onChange={e => {
                        const newExp = [...expenses];
                        newExp[idx].description = e.target.value;
                        setExpenses(newExp);
                      }} className="flex-1 h-12 bg-white border-slate-200 font-bold rounded-xl" />
                      <Input type="number" placeholder="Cost" value={exp.amount} onChange={e => {
                        const newExp = [...expenses];
                        newExp[idx].amount = Number(e.target.value);
                        setExpenses(newExp);
                      }} className="w-[180px] h-12 bg-white border-slate-200 font-black text-right text-lg rounded-xl" />
                      <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 transition-colors">
                        <X size={24} />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            {/* SIDEBAR SUMMARY */}
            <div className="w-full lg:w-[420px] bg-slate-50 border-l border-slate-200 p-10 space-y-10">
              <div className="space-y-4">
                <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">3. Warehouse Entrance Yield</label>
                <div className="relative">
                  <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-20 text-4xl font-black bg-white border-2 border-blue-100 focus:border-blue-600 text-center rounded-3xl shadow-xl transition-all" />
                  <span className="absolute right-6 top-7 text-[11px] text-blue-600 font-black uppercase tracking-widest">Final Units</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed italic font-medium">
                  Enter exactly what was produced. The system will auto-calculate shrinkage.
                </p>
              </div>

              <div className="pt-10 border-t border-slate-200 space-y-6">
                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Materials Audit</span>
                  <span className="text-slate-900">{financialAudit.matTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
                  <span>Overhead Audit</span>
                  <span className="text-slate-900">{financialAudit.expTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xl font-black text-slate-900 pt-6 border-t-2 border-slate-200">
                  <span>Total Batch Cost</span>
                  <span className="text-blue-600">{financialAudit.total.toLocaleString()} <span className="text-[11px]">UGX</span></span>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-950 text-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden">
                <CardContent className="p-10 flex gap-8 items-center relative">
                  <div className="bg-white/10 p-5 rounded-3xl backdrop-blur-xl border border-white/10"><TrendingUp className="h-8 w-8" /></div>
                  <div>
                    <p className="text-[11px] font-black uppercase opacity-60 tracking-[0.3em]">Unit Cost Audit</p>
                    <p className="text-5xl font-black tracking-tighter mt-1 tabular-nums">{financialAudit.unitCost.toLocaleString()}</p>
                    <p className="text-[10px] font-bold opacity-70 mt-3 uppercase tracking-widest">Pushing to Inventory valuation</p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em] text-center border p-4 rounded-2xl border-dashed">
                BATCH SESSION ID: {selectedOrder?.tenant_id.slice(0,12).toUpperCase()}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-10 flex flex-col sm:flex-row items-center justify-between gap-10">
            <div className="flex items-center gap-5 text-slate-600 text-xs font-black uppercase tracking-widest">
              <div className="h-12 w-12 rounded-2xl bg-orange-100 flex items-center justify-center border border-orange-200 shadow-sm"><AlertCircle className="text-orange-600 h-6 w-6" /></div>
              Finalizing will sync Ledger, Stock, and POS valuation.
            </div>
            <div className="flex gap-6 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-black text-slate-400 h-16 px-10 hover:text-red-500 transition-all text-sm uppercase tracking-widest">Discard</Button>
              <Button 
                onClick={() => finalizeProductionMutation.mutate()} 
                disabled={finalizeProductionMutation.isPending} 
                className="bg-emerald-600 hover:bg-emerald-700 text-white h-16 px-20 font-black text-base shadow-2xl transition-all rounded-2xl flex-1 sm:flex-none uppercase tracking-[0.2em]"
              >
                {finalizeProductionMutation.isPending ? <Loader2 className="animate-spin mr-4 h-6 w-6" /> : <CheckCircle2 className="mr-4 h-6 w-6" />}
                {finalizeProductionMutation.isPending ? "FINALIZING SYNC..." : "CONFIRM AUDIT & SYNC"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}