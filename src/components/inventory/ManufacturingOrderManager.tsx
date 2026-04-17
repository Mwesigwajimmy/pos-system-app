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
import { 
  Search, X, Factory, Beaker, Truck, Utensils, 
  UserCheck, CheckCircle2, AlertCircle, Loader2, 
  TrendingUp, Wallet, PackagePlus 
} from "lucide-react";

// --- ERP TYPES ---
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

export default function ManufacturingOrderManager({ initialData }: { initialData: ManufacturingOrder[] }) {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<ManufacturingOrder | null>(null);
  
  // Production Workflow State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [ingredientLogs, setIngredientLogs] = useState<IngredientLog[]>([]);
  const [actualYield, setActualYield] = useState<number>(0);

  // 1. DATA FETCHING (Using the Safe View)
  const { data: orders, isLoading } = useQuery({
    queryKey: ['manufacturing_orders'],
    queryFn: async () => {
      const { data, error } = await supabase.from('mfg_production_orders_view').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data as ManufacturingOrder[];
    },
    initialData: initialData
  });

  const { data: vendors } = useQuery({
    queryKey: ['vendors'],
    queryFn: async () => {
      const { data } = await supabase.from('vendors').select('id, name');
      return data || [];
    }
  });

  // 2. PRODUCTION EXECUTION
  const openExecutionDialog = async (order: ManufacturingOrder) => {
    // Automatically fetch the formula/recipe for this batch
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
    setSelectedOrder(order);
  };

  const finalizeProduction = useMutation({
    mutationFn: async () => {
      if (!selectedOrder) return;

      // STEP 1: Record Actual Ingredient Usage (Audit Trail)
      const { error: ingError } = await supabase.from('mfg_production_ingredient_logs').insert(
        ingredientLogs.map(log => ({
          production_order_id: selectedOrder.id,
          ingredient_variant_id: log.variant_id,
          vendor_id: log.supplier_id || null,
          quantity_used: log.actual_qty,
          unit_cost_at_run: log.unit_cost,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (ingError) throw ingError;

      // STEP 2: Record "Landed Cost" Expenses (Transport, Lunch, etc.)
      const { error: expError } = await supabase.from('mfg_production_expenses').insert(
        expenses.map(e => ({
          production_order_id: selectedOrder.id,
          expense_category: e.category,
          description: e.description,
          amount: e.amount,
          tenant_id: selectedOrder.tenant_id
        }))
      );
      if (expError) throw expError;

      // STEP 3: Update Output Yield in DB
      await supabase.from('mfg_production_orders')
        .update({ actual_quantity_produced: actualYield })
        .eq('id', selectedOrder.id);

      // STEP 4: TRIGGER MASTER SYNC (Calls your mfg_complete_production_v2 RPC)
      // This function automatically: 
      // 1. Deducts Stock 2. Adds Finished Stock 3. Writes General Ledger 4. Updates POS Cost Price
      const { error: syncError } = await supabase.rpc('mfg_complete_production_v2', { 
        p_order_id: selectedOrder.id 
      });
      if (syncError) throw syncError;
    },
    onSuccess: () => {
      toast.success("Production Successfully Finalized & Synced to Ledger");
      setSelectedOrder(null);
      queryClient.invalidateQueries({ queryKey: ['manufacturing_orders'] });
    },
    onError: (err: any) => toast.error(`Process Error: ${err.message}`)
  });

  // 3. REAL-TIME FINANCIAL AUDIT
  const metrics = useMemo(() => {
    const matCost = ingredientLogs.reduce((sum, i) => sum + (i.actual_qty * i.unit_cost), 0);
    const expCost = expenses.reduce((sum, e) => sum + e.amount, 0);
    const total = matCost + expCost;
    return { matCost, expCost, total, unitCost: actualYield > 0 ? total / actualYield : 0 };
  }, [ingredientLogs, expenses, actualYield]);

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <Card className="w-full border-slate-200 shadow-xl overflow-hidden rounded-xl bg-white">
        <CardHeader className="bg-slate-50/80 border-b p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <CardTitle className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Factory className="h-7 w-7 text-blue-600" /> Manufacturing Command Center
              </CardTitle>
              <CardDescription className="text-slate-500 font-medium mt-1">
                Professional batch processing with full audit capability for Pharma, Chemicals, and Juice.
              </CardDescription>
            </div>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <Input placeholder="Filter batches..." value={filter} onChange={e => setFilter(e.target.value)} className="pl-10 h-10 border-slate-200" />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <Table>
              <TableHeader className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                <TableRow className="border-b border-slate-200">
                  <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-wider py-4 px-6">Batch ID</TableHead>
                  <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-wider py-4">Output Product</TableHead>
                  <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-wider py-4">Planned Qty</TableHead>
                  <TableHead className="font-black text-slate-700 uppercase text-[11px] tracking-wider py-4">Production Status</TableHead>
                  <TableHead className="text-right py-4 px-6">Audit Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders?.filter(o => o.batch_number?.toLowerCase().includes(filter.toLowerCase()) || o.product_name.toLowerCase().includes(filter.toLowerCase())).map(o => (
                  <TableRow key={o.id} className="hover:bg-blue-50/30 transition-colors group">
                    <TableCell className="font-mono text-blue-600 font-bold px-6">{o.batch_number}</TableCell>
                    <TableCell className="font-bold text-slate-800">{o.product_name} <br/><span className="text-[10px] text-slate-400 font-mono">{o.sku}</span></TableCell>
                    <TableCell className="font-black text-slate-700">{o.planned_quantity}</TableCell>
                    <TableCell>
                      <Badge variant={o.status === 'completed' ? 'default' : 'outline'} className={o.status === 'completed' ? 'bg-emerald-600' : 'border-blue-200 text-blue-600 bg-blue-50'}>
                        {o.status.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right px-6">
                      {o.status !== 'completed' && (
                        <Button onClick={() => openExecutionDialog(o)} className="bg-slate-900 hover:bg-blue-600 font-bold text-xs h-9 px-6 shadow-md transition-all">
                          Process Batch
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

      {/* FULL-SCREEN AUDIT DIALOG */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-[1200px] h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl">
          <DialogHeader className="bg-slate-900 text-white p-8">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <DialogTitle className="text-3xl font-black flex items-center gap-3">
                  <Beaker className="text-blue-400 h-8 w-8" /> Batch Audit: {selectedOrder?.batch_number}
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-bold text-sm">
                  {selectedOrder?.product_name} • Universal Production Engine Active
                </DialogDescription>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-[0.2em]">Calculated Landed Cost / Unit</p>
                <p className="text-3xl font-black text-emerald-400 leading-none mt-1">
                  {metrics.unitCost.toLocaleString()} <span className="text-xs font-medium">UGX</span>
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-white">
            <div className="flex-1 p-8 space-y-10 overflow-y-auto scrollbar-thin">
              
              {/* SECTION: RAW MATERIALS */}
              <section className="space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                    <PackagePlus className="text-blue-600 h-5 w-5" /> 1. Ingredient & Supplier Verification
                  </h3>
                  <Badge className="bg-blue-50 text-blue-700 border-blue-100">Formula Linked</Badge>
                </div>
                <div className="border border-slate-100 rounded-2xl overflow-hidden shadow-sm bg-slate-50/30">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="text-[10px] font-black uppercase py-4">Material</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-4">Selected Supplier</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-4">Actual Usage</TableHead>
                        <TableHead className="text-[10px] font-black uppercase py-4 text-right">Unit Buy Cost</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ingredientLogs.map((log, idx) => (
                        <TableRow key={log.variant_id} className="border-b border-slate-50">
                          <TableCell className="font-black text-slate-800 py-4">{log.name}</TableCell>
                          <TableCell>
                            <Select onValueChange={(val) => {
                              const newLogs = [...ingredientLogs];
                              newLogs[idx].supplier_id = val;
                              setIngredientLogs(newLogs);
                            }}>
                              <SelectTrigger className="h-9 font-bold border-slate-200"><SelectValue placeholder="Choose Supplier" /></SelectTrigger>
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
                            }} className="h-9 font-black bg-white border-slate-200 text-center" />
                          </TableCell>
                          <TableCell>
                            <Input type="number" placeholder="Cost" onChange={e => {
                               const newLogs = [...ingredientLogs];
                               newLogs[idx].unit_cost = Number(e.target.value);
                               setIngredientLogs(newLogs);
                            }} className="h-9 font-mono text-right font-black bg-white border-slate-200" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </section>

              {/* SECTION: EXPENSES (TRANSPORT/LUNCH) */}
              <section className="space-y-5">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-500 flex items-center gap-3">
                    <Wallet className="text-orange-500 h-5 w-5" /> 2. Transport & Overhead Expenditure
                  </h3>
                  <Button variant="outline" size="sm" onClick={() => setExpenses([...expenses, { category: 'Transport', description: '', amount: 0 }])} className="border-orange-200 text-orange-600 font-bold hover:bg-orange-50">
                    Add Expense Line
                  </Button>
                </div>
                <div className="space-y-4">
                  {expenses.map((exp, idx) => (
                    <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group animate-in slide-in-from-left duration-300">
                      <Select value={exp.category} onValueChange={(val: any) => {
                        const newExp = [...expenses];
                        newExp[idx].category = val;
                        setExpenses(newExp);
                      }}>
                        <SelectTrigger className="w-[180px] h-11 bg-white border-slate-200 font-bold shadow-sm"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Transport" className="font-bold"><div className="flex gap-2"><Truck size={14}/> Transport</div></SelectItem>
                          <SelectItem value="Meals" className="font-bold"><div className="flex gap-2"><Utensils size={14}/> Staff Lunch</div></SelectItem>
                          <SelectItem value="Labor" className="font-bold"><div className="flex gap-2"><UserCheck size={14}/> Daily Labor</div></SelectItem>
                          <SelectItem value="Packaging" className="font-bold"><div className="flex gap-2"><PackagePlus size={14}/> Packaging</div></SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Describe expenditure..." value={exp.description} onChange={e => {
                        const newExp = [...expenses];
                        newExp[idx].description = e.target.value;
                        setExpenses(newExp);
                      }} className="flex-1 h-11 bg-white border-slate-200 font-medium" />
                      <Input type="number" placeholder="UGX" value={exp.amount} onChange={e => {
                        const newExp = [...expenses];
                        newExp[idx].amount = Number(e.target.value);
                        setExpenses(newExp);
                      }} className="w-[150px] h-11 bg-white border-slate-200 font-black text-right shadow-sm" />
                      <Button variant="ghost" size="icon" onClick={() => setExpenses(expenses.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 rounded-full transition-colors">
                        <X size={20} />
                      </Button>
                    </div>
                  ))}
                  {expenses.length === 0 && <p className="text-xs text-slate-400 italic text-center py-4">No additional expenditures recorded for this batch.</p>}
                </div>
              </section>
            </div>

            {/* SIDEBAR SUMMARY */}
            <div className="w-full lg:w-[360px] bg-slate-50 border-l border-slate-200 p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">3. Warehouse Entrance Yield</label>
                <div className="relative">
                  <Input type="number" value={actualYield} onChange={e => setActualYield(Number(e.target.value))} className="h-16 text-3xl font-black bg-white border-2 border-blue-100 focus:border-blue-600 text-center rounded-2xl shadow-inner" />
                  <span className="absolute right-5 top-5 text-[10px] text-blue-600 font-black uppercase">Final Qty</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Enter the exact quantity produced (e.g., 98L bottled vs 100L planned).
                </p>
              </div>

              <div className="pt-8 border-t border-slate-200 space-y-5">
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Raw Materials Audit</span>
                  <span className="text-slate-900">{metrics.matCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-slate-500">
                  <span>Transport & Lunch Audit</span>
                  <span className="text-slate-900">{metrics.expCost.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-lg font-black text-slate-900 pt-4 border-t-2 border-slate-200">
                  <span>Total Batch Cost</span>
                  <span className="text-blue-600">{metrics.total.toLocaleString()} <span className="text-[10px]">UGX</span></span>
                </div>
              </div>

              <Card className="bg-gradient-to-br from-blue-700 to-blue-900 text-white border-none shadow-xl rounded-2xl overflow-hidden">
                <CardContent className="p-6 flex gap-5 items-center">
                  <div className="bg-white/10 p-4 rounded-2xl backdrop-blur-sm"><TrendingUp className="h-6 w-6" /></div>
                  <div>
                    <p className="text-[10px] font-black uppercase opacity-60 tracking-widest">Real Unit Cost</p>
                    <p className="text-3xl font-black tracking-tighter">{metrics.unitCost.toLocaleString()}</p>
                    <p className="text-[9px] font-bold opacity-80 mt-1 uppercase">Ready for POS valuation</p>
                  </div>
                </CardContent>
              </Card>
              
              <div className="text-[9px] text-slate-400 font-bold uppercase tracking-widest text-center">
                Financial audit active for session ID: {selectedOrder?.tenant_id.slice(0,8)}
              </div>
            </div>
          </div>

          <DialogFooter className="bg-white border-t p-8 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4 text-slate-600 text-xs font-black uppercase tracking-tight">
              <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center"><AlertCircle className="text-orange-600 h-5 w-5" /></div>
              Confirming will auto-sync Stock, General Ledger, and POS.
            </div>
            <div className="flex gap-4 w-full sm:w-auto">
              <Button variant="ghost" onClick={() => setSelectedOrder(null)} className="font-bold text-slate-500 h-14 px-8">Discard</Button>
              <Button onClick={() => finalizeProduction.mutate()} disabled={finalizeProduction.isPending} className="bg-emerald-600 hover:bg-emerald-700 text-white h-14 px-16 font-black text-sm shadow-2xl transition-all rounded-xl flex-1 sm:flex-none">
                {finalizeProduction.isPending ? <Loader2 className="animate-spin mr-3" /> : <CheckCircle2 className="mr-3" />}
                {finalizeProduction.isPending ? "PROCESSING AUDIT..." : "FINALIZE & SYNC SYSTEM"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}