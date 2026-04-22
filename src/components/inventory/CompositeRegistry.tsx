'use client';

import React, { useState, useEffect } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, ShieldCheck, Layers, Plus, Database, 
  Settings2, Loader2, Package, Beaker, Zap, Ruler,
  ArrowRight, CheckCircle2, AlertCircle, Scale, X, Tags, FolderPlus
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter, 
  DialogDescription 
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const supabase = createClient();

export default function CompositeRegistry() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  
  // Modal States
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  
  // High-Integrity Industrial Form State
  const [form, setForm] = useState({
    name: '',
    sku: '',
    category_id: '',
    uom_id: '',
    base_price: '', 
    cost_estimate: '' 
  });

  // Industrial Definition States
  const [newUnit, setNewUnit] = useState({ name: '', abbreviation: '' });
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });

  // --- 1. SYSTEM CONTEXT QUERIES ---
  const { data: profile } = useQuery({
    queryKey: ['mfg_identity_registry'],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('business_id, currency').limit(1).single();
      return data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['mfg_registry_categories', profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) return [];
      // Fetching categories. Note: Production categories are filtered by the business node
      const { data } = await supabase.from('categories').select('id, name').eq('business_id', profile?.business_id);
      return data || [];
    },
    enabled: !!profile?.business_id
  });

  const { data: uoms } = useQuery({
    queryKey: ['mfg_registry_uoms'],
    queryFn: async () => {
      const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').order('name');
      return data || [];
    }
  });

  // --- 2. AUTONOMOUS LOGIC ---

  // UTILITY: Forensic SKU Generator
  // Standard: [PREFIX]-[INITIALS]-[TIMESTAMP_SHORT]
  const generateForensicSKU = (name: string) => {
    if (!name || name.length < 2) return '';
    const prefix = "MFG-";
    const initials = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${prefix}${initials}-${timestamp}`;
  };

  // Sync Name with SKU automatically to assist the user
  useEffect(() => {
    if (form.name && !form.sku) {
        setForm(prev => ({ ...prev, sku: generateForensicSKU(form.name) }));
    }
  }, [form.name]);

  // --- 3. REGISTRY HANDLERS ---

  // Procedure: Birth New Industrial Metric
  const handleCreateUnit = async () => {
    if (!newUnit.name || !newUnit.abbreviation) return toast.error("Unit details required.");
    try {
        const { data, error } = await supabase
            .from('units_of_measure')
            .insert([{ 
                name: newUnit.name, 
                abbreviation: newUnit.abbreviation.toUpperCase(),
                tenant_id: profile?.business_id 
            }])
            .select()
            .single();

        if (error) throw error;
        toast.success(`Unit '${data.name}' authorized.`);
        setForm(prev => ({ ...prev, uom_id: data.id }));
        setNewUnit({ name: '', abbreviation: '' });
        setIsUnitModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['mfg_registry_uoms'] });
    } catch (e: any) {
        toast.error(`Industrial Metric Error: ${e.message}`);
    }
  };

  // Procedure: Birth New Production Category
  const handleCreateCategory = async () => {
    if (!newCategory.name) return toast.error("Category name required.");
    try {
        const { data, error } = await supabase
            .from('categories')
            .insert([{ 
                name: newCategory.name, 
                description: newCategory.description,
                business_id: profile?.business_id,
                status: 'active'
            }])
            .select()
            .single();

        if (error) throw error;
        toast.success(`Category '${data.name}' birthed.`);
        setForm(prev => ({ ...prev, category_id: data.id.toString() }));
        setNewCategory({ name: '', description: '' });
        setIsCategoryModalOpen(false);
        queryClient.invalidateQueries({ queryKey: ['mfg_registry_categories'] });
    } catch (e: any) {
        toast.error(`Category Creation Error: ${e.message}`);
    }
  };

  const handleRegisterDesign = async () => {
    if (!form.name || !form.uom_id || !form.category_id) {
        return toast.error("Asset Identity, Metric, and Classification are mandatory.");
    }
    
    setLoading(true);

    try {
      // THE INDUSTRIAL BIRTH: 
      // 1. Create the Master Product Record (The Identity)
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

      // 2. Create the Variant (The Market Instance)
      // We set price = selling price for NIM PAINTS distributive needs
      const { error: vErr } = await supabase
        .from('product_variants')
        .insert([{
          product_id: product.id,
          business_id: profile?.business_id,
          name: 'Standard Batch',
          sku: form.sku || generateForensicSKU(form.name),
          price: parseFloat(form.base_price as string) || 0,
          cost_price: parseFloat(form.cost_estimate as string) || 0,
          is_composite: true, // Crucial for Manufacturing dropdown
          is_raw_material: false,
          uom_id: form.uom_id,
          status: 'active'
        }]);

      if (vErr) throw vErr;

      toast.success(`${form.name} authorized in Production Catalog.`);
      setForm({ name: '', sku: '', category_id: '', uom_id: '', base_price: '', cost_estimate: '' });
      
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
               <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 cursor-pointer">
                    <Factory size={28} />
               </div>
               <div>
                   <CardTitle className="text-2xl font-black uppercase tracking-tight text-slate-900 leading-none">Finished Good Designer</CardTitle>
                   <CardDescription className="text-[10px] font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">
                        Establish master identities for manufactured goods.
                   </CardDescription>
               </div>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                <ShieldCheck className="text-emerald-500" size={16} />
                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest leading-none">Security Node: Active</span>
            </div>
        </div>
      </CardHeader>

      <CardContent className="p-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          
          {/* PRODUCT IDENTITY */}
          <div className="space-y-3 relative z-10">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Asset Identity</Label>
            <Input 
                placeholder="e.g. NIM Gloss White Paint 5L" 
                value={form.name} 
                onChange={e => setForm({...form, name: e.target.value})} 
                className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl shadow-sm bg-white transition-all" 
            />
          </div>

          <div className="space-y-3 relative z-10">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global SKU / Lot Serial</Label>
            <Input 
                placeholder="Auto-generated" 
                value={form.sku} 
                onChange={e => setForm({...form, sku: e.target.value})} 
                className="h-12 border-slate-200 font-mono text-sm rounded-2xl shadow-sm bg-white" 
            />
          </div>

          {/* DYNAMIC UNIT SELECTOR */}
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Metric</Label>
                <button 
                  type="button"
                  onClick={() => setIsUnitModalOpen(true)}
                  className="text-[9px] font-black text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 uppercase"
                >
                    <Plus size={10} /> Define New
                </button>
            </div>
            <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
              <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm bg-white">
                <SelectValue placeholder="Metric (Liters/KG/Drums)" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                {uoms?.map(u => (
                  <SelectItem key={u.id} value={u.id} className="font-medium focus:bg-blue-50">
                    {u.name} ({u.abbreviation})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* DYNAMIC CATEGORY SELECTOR */}
          <div className="space-y-3 relative z-10">
            <div className="flex justify-between items-center px-1">
                <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Classification</Label>
                <button 
                  type="button"
                  onClick={() => setIsCategoryModalOpen(true)}
                  className="text-[9px] font-black text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1 uppercase"
                >
                    <Plus size={10} /> Add Category
                </button>
            </div>
            <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
              <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm bg-white">
                <SelectValue placeholder="Select Production Type" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-slate-100 shadow-2xl">
                {categories?.map(c => (
                  <SelectItem key={c.id} value={c.id.toString()} className="font-medium focus:bg-blue-50">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* VALUATION */}
          <div className="space-y-3 relative z-10">
            <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Retail Price ({profile?.currency})</Label>
            <Input 
                type="number" 
                value={form.base_price} 
                onChange={e => setForm({...form, base_price: e.target.value})} 
                className="h-12 border-slate-200 font-black text-lg text-blue-600 rounded-2xl shadow-sm bg-white" 
            />
          </div>

          <div className="flex items-end relative z-10">
            <Button 
                onClick={handleRegisterDesign} 
                disabled={loading} 
                className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black h-12 shadow-[0_20px_40px_-12px_rgba(15,23,42,0.3)] rounded-2xl transition-all uppercase tracking-widest text-xs group"
            >
              {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform"/>} 
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
                    By authorizing this design, the system births a <span className="font-bold text-blue-600 underline">Composite Asset</span>. You must then navigate to the <span className="font-bold text-slate-900 underline">Composite Builder</span> to define the exact molecular recipe or material ratio. Once the formula is committed, the asset becomes available for <span className="font-bold text-slate-900">Atomic Industrial Runs</span>.
                </p>
            </div>
        </div>
      </CardContent>

      {/* MODAL: NEW UNIT */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.4)] p-0 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                      <Scale className="text-blue-400" /> Metric Registry
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                      Establish a new measurement standard for Pharmaceutical or Chemical tracking.
                  </DialogDescription>
              </div>
              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Standard Name</Label>
                      <Input 
                        placeholder="e.g. 5L Jerrycan" 
                        value={newUnit.name} 
                        onChange={e => setNewUnit({...newUnit, name: e.target.value})} 
                        className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl" 
                      />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Abbreviation</Label>
                      <Input 
                        placeholder="e.g. 5L-JC" 
                        value={newUnit.abbreviation} 
                        onChange={e => setNewUnit({...newUnit, abbreviation: e.target.value})} 
                        className="h-12 border-slate-200 font-black text-xl rounded-2xl" 
                      />
                  </div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
                  <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl shadow-blue-600/20 uppercase tracking-widest text-[10px]">Save Metric</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* MODAL: NEW CATEGORY */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                      <FolderPlus className="text-blue-400" /> Sector Classification
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                      Define a new production category to logically separate manufactured assets.
                  </DialogDescription>
              </div>
              <div className="p-8 space-y-6 bg-white">
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Category Name</Label>
                      <Input 
                        placeholder="e.g. High-Gloss Coatings" 
                        value={newCategory.name} 
                        onChange={e => setNewCategory({...newCategory, name: e.target.value})} 
                        className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl" 
                      />
                  </div>
                  <div className="space-y-2">
                      <Label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Logistics Note (Optional)</Label>
                      <Input 
                        placeholder="e.g. Industrial grade paints" 
                        value={newCategory.description} 
                        onChange={e => setNewCategory({...newCategory, description: e.target.value})} 
                        className="h-12 border-slate-200 font-medium rounded-2xl" 
                      />
                  </div>
              </div>
              <DialogFooter className="bg-slate-50 p-6 border-t border-slate-100 flex gap-3">
                  <Button variant="ghost" onClick={() => setIsCategoryModalOpen(false)} className="font-bold text-slate-400 uppercase text-[10px] tracking-widest">Discard</Button>
                  <Button onClick={handleCreateCategory} className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-8 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Save Category</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>
      
      <CardFooter className="bg-slate-50/30 p-8 border-t border-slate-100 flex justify-between items-center">
          <div className="flex items-center gap-3">
              <Package size={14} className="text-slate-300" />
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sovereign OS Manufacturing Node v10.6.0</span>
          </div>
          <Badge variant="outline" className="bg-white text-[9px] font-black tracking-tighter border-slate-200 shadow-sm">ISO-9001 COMPLIANT_REGISTRY</Badge>
      </CardFooter>
    </Card>
  );
}