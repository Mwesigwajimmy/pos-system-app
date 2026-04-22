'use client';

import React, { useState } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, ShieldCheck, Layers, Plus, Database, 
  Settings2, Loader2, Package, Beaker, Zap, Ruler,
  ArrowRight, CheckCircle2, AlertCircle
} from "lucide-react";
import toast from 'react-hot-toast';

// --- UI COMPONENTS ---
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardFooter 
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const supabase = createClient();

export default function CompositeRegistry() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  // High-Integrity Industrial Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    uom_id: '',
    base_price: 0, // Target Selling Price
    cost_estimate: 0 // Initial Estimated Landed Cost
  });

  // --- 1. SYSTEM CONTEXT QUERIES ---
  const { data: profile } = useQuery({
    queryKey: ['mfg_identity_registry'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('business_id, currency').limit(1).single();
      return data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['mfg_registry_categories'],
    queryFn: async () => {
      const { data } = await supabase.from('categories').select('id, name').eq('business_id', profile?.business_id);
      return data || [];
    }
  });

  const { data: uoms } = useQuery({
    queryKey: ['mfg_registry_uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation');
      return data || [];
    }
  });

  // --- 2. THE INDUSTRIAL WELD LOGIC ---
  const handleRegisterDesign = async () => {
    if (!form.name || !form.uom_id || !form.category_id) {
        return toast.error("Asset Name, Metric, and Category are mandatory for industrial definition.");
    }
    
    setLoading(true);

    try {
      // THE ATOMIC BIRTH: 
      // 1. Create the Master Product Record
      const { data: product, error: pErr } = await supabase
        .from('products')
        .insert([{
          name: form.name,
          business_id: profile?.business_id,
          category_id: parseInt(form.category_id),
          is_active: true
        }])
        .select()
        .single();

      if (pErr) throw pErr;

      // 2. Create the Variant with 'is_composite = true'
      // This is the "Industrial Fingerprint" that makes it show in Manufacturing dropdowns
      const { error: vErr } = await supabase
        .from('product_variants')
        .insert([{
          product_id: product.id,
          business_id: profile?.business_id,
          name: 'Manufactured Unit',
          sku: form.sku || `MFG-${Date.now()}`,
          price: form.base_price,
          cost_price: form.cost_estimate,
          is_composite: true, // TELLS SYSTEM: "I am made in a factory"
          is_raw_material: false, // TELLS SYSTEM: "I am not an input"
          uom_id: form.uom_id,
          status: 'active'
        }]);

      if (vErr) throw vErr;

      toast.success(`${form.name} registered in Production Catalog.`);
      
      // Reset form
      setForm({ name: '', sku: '', category_id: '', uom_id: '', base_price: 0, cost_estimate: 0 });
      
      // Invalidate all manufacturing queries so the new item shows up everywhere
      queryClient.invalidateQueries({ queryKey: ['mfg_products_targets'] });
      queryClient.invalidateQueries({ queryKey: ['allVariants'] });
      
    } catch (e: any) {
      toast.error(`Registry Sync Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl animate-in fade-in duration-700">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
               <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl">
                    <Factory size={28} />
               </div>
               <div>
                   <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900">Finished Good Designer</CardTitle>
                   <CardDescription className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-[0.2em]">
                        Birth new products into the industrial manufacturing cycle.
                   </CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-2">
                <ShieldCheck className="text-emerald-500" size={16} />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Security Node: Active</span>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          
          {/* PRODUCT IDENTITY */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Asset Name</Label>
            <Input 
                placeholder="e.g. NIM Gloss White Paint 5L" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl shadow-sm" 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global SKU / Lot Number</Label>
            <Input 
                placeholder="PAINT-GW-05" 
                value={form.sku} 
                onChange={e => setForm({...form, sku: e.target.value})} 
                className="h-12 border-slate-200 font-mono text-sm rounded-2xl shadow-sm" 
            />
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Production Metric</Label>
            <Select onValueChange={v => setForm({...form, uom_id: v})}>
              <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm"><SelectValue placeholder="Liters / Kilograms / Units" /></SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                {uoms?.map(u => <SelectItem key={u.id} value={u.id} className="font-medium">{u.name} ({u.abbreviation})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* CLASSIFICATION */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Classification</Label>
            <Select onValueChange={v => setForm({...form, category_id: v})}>
              <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm"><SelectValue placeholder="Select Category" /></SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100">
                {categories?.map(c => <SelectItem key={c.id} value={c.id.toString()} className="font-medium">{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* VALUATION */}
          <div className="space-y-3">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Retail Selling Price ({profile?.currency})</Label>
            <Input 
                type="number" 
                value={form.base_price} 
                onChange={e => setForm({...form, base_price: Number(e.target.value)})} 
                className="h-12 border-slate-200 font-black text-lg text-blue-600 rounded-2xl shadow-sm" 
            />
          </div>

          <div className="flex items-end">
            <Button 
                onClick={handleRegisterDesign} 
                disabled={loading} 
                className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black h-12 shadow-[0_20px_40px_-12px_rgba(0,0,0,0.2)] rounded-2xl transition-all uppercase tracking-widest text-xs group"
            >
              {loading ? <Loader2 className="animate-spin" /> : <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform"/>} 
              Authorize Design
            </Button>
          </div>

        </div>

        {/* LOGIC INFO BOX */}
        <div className="mt-14 p-10 bg-slate-50 rounded-[3rem] border border-slate-100 flex flex-col md:flex-row items-center gap-8 shadow-inner">
            <div className="h-16 w-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 shrink-0">
                <Zap size={32} />
            </div>
            <div className="space-y-2">
                <h4 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Forensic Interlink Protocol Active</h4>
                <p className="text-xs font-medium text-slate-500 leading-relaxed max-w-3xl">
                    By authorizing this design, the system births a <span className="font-bold text-blue-600">Manufacturable Asset</span>. You must then navigate to the <span className="font-bold text-slate-900 underline">Composite Builder (BOM)</span> to define the exact chemical ratio or material recipe. Once the formula is committed, the asset becomes available for <span className="font-bold text-slate-900">Atomic Industrial Runs</span>.
                </p>
            </div>
        </div>
      </CardContent>
      
      <CardFooter className="bg-slate-50/30 p-8 border-t border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <Package size={14} className="text-slate-300" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Industrial Registry v10.4.5</span>
          </div>
          <Badge variant="outline" className="bg-white text-[9px] font-black tracking-tighter border-slate-200">ISO-9001 COMPLIANT_REGISTRY</Badge>
      </CardFooter>
    </Card>
  );
}