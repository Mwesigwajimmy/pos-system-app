'use client';

import React, { useState, useEffect, useMemo } from "react";
import { createClient } from '@/lib/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Factory, ShieldCheck, Layers, Plus, Database, 
  Settings2, Loader2, Package, Beaker, Zap, Ruler,
  ArrowRight, CheckCircle2, AlertCircle, Scale, X, Tags, FolderPlus,
  Search, ClipboardList, Info, Trash2, Edit3, MoreHorizontal
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
  DialogDescription,
  DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

const supabase = createClient();

export default function CompositeRegistry() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
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

  // Fetch Existing Designs (Composite Assets)
  const { data: designs, isLoading: isDesignsLoading } = useQuery({
    queryKey: ['composite_design_ledger', profile?.business_id],
    queryFn: async () => {
        if (!profile?.business_id) return [];
        const { data, error } = await supabase
            .from('product_variants')
            .select(`
                id,
                sku,
                price,
                cost_price,
                product_id,
                uom_id,
                units_of_measure ( name, abbreviation ),
                products (
                    name,
                    category_id,
                    categories ( name )
                )
            `)
            .eq('business_id', profile?.business_id)
            .eq('is_composite', true)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    enabled: !!profile?.business_id
  });

  const { data: categories } = useQuery({
    queryKey: ['mfg_registry_categories', profile?.business_id],
    queryFn: async () => {
      if (!profile?.business_id) return [];
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

  const filteredDesigns = useMemo(() => {
    if (!designs) return [];
    return designs.filter(d => 
        d.products?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.sku?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [designs, searchTerm]);

  const generateForensicSKU = (name: string) => {
    if (!name || name.length < 2) return '';
    const prefix = "MFG-";
    const initials = name.replace(/\s+/g, '').substring(0, 3).toUpperCase();
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    return `${prefix}${initials}-${timestamp}`;
  };

  useEffect(() => {
    if (form.name && !form.sku) {
        setForm(prev => ({ ...prev, sku: generateForensicSKU(form.name) }));
    }
  }, [form.name]);

  // --- 3. REGISTRY HANDLERS ---

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

      const { error: vErr } = await supabase
        .from('product_variants')
        .insert([{
          product_id: product.id,
          business_id: profile?.business_id,
          name: 'Standard Batch',
          sku: form.sku || generateForensicSKU(form.name),
          price: parseFloat(form.base_price as string) || 0,
          cost_price: parseFloat(form.cost_estimate as string) || 0,
          is_composite: true, 
          is_raw_material: false,
          uom_id: form.uom_id,
          status: 'active'
        }]);

      if (vErr) throw vErr;

      toast.success(`${form.name} authorized in Production Catalog.`);
      setForm({ name: '', sku: '', category_id: '', uom_id: '', base_price: '', cost_estimate: '' });
      
      queryClient.invalidateQueries({ queryKey: ['composite_design_ledger'] });
      queryClient.invalidateQueries({ queryKey: ['allVariants'] });
    } catch (e: any) {
      toast.error(`Registry Sync Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10 max-w-7xl mx-auto pb-20">
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-3xl animate-in fade-in duration-700">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50 p-10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-slate-900 rounded-2xl text-white shadow-2xl">
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
            
            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Finished Asset Identity</Label>
              <Input 
                  placeholder="e.g. NIM Gloss White Paint 5L" 
                  value={form.name} 
                  onChange={e => setForm({...form, name: e.target.value})} 
                  className="h-12 border-slate-200 focus:ring-blue-500 font-bold rounded-2xl shadow-sm bg-white" 
              />
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Global SKU / Lot Serial</Label>
              <Input 
                  placeholder="Auto-generated" 
                  value={form.sku} 
                  onChange={e => setForm({...form, sku: e.target.value})} 
                  className="h-12 border-slate-200 font-mono text-sm rounded-2xl shadow-sm bg-white" 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Output Metric</Label>
                  <button 
                    type="button"
                    onClick={() => setIsUnitModalOpen(true)}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase"
                  >
                      <Plus size={10} /> Define New
                  </button>
              </div>
              <Select value={form.uom_id} onValueChange={v => setForm({...form, uom_id: v})}>
                <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm bg-white">
                  <SelectValue placeholder="Metric (Liters/KG/Drums)" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  {uoms?.map(u => (
                    <SelectItem key={u.id} value={u.id} className="font-medium">
                      {u.name} ({u.abbreviation})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center px-1">
                  <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Asset Classification</Label>
                  <button 
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase"
                  >
                      <Plus size={10} /> Add Category
                  </button>
              </div>
              <Select value={form.category_id} onValueChange={v => setForm({...form, category_id: v})}>
                <SelectTrigger className="h-12 border-slate-200 font-bold rounded-2xl shadow-sm text-sm bg-white">
                  <SelectValue placeholder="Select Production Type" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl border-slate-100">
                  {categories?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()} className="font-medium">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Retail Price ({profile?.currency})</Label>
              <Input 
                  type="number" 
                  value={form.base_price} 
                  onChange={e => setForm({...form, base_price: e.target.value})} 
                  className="h-12 border-slate-200 font-black text-lg text-blue-600 rounded-2xl shadow-sm bg-white" 
              />
            </div>

            <div className="flex items-end">
              <Button 
                  onClick={handleRegisterDesign} 
                  disabled={loading} 
                  className="w-full bg-slate-900 hover:bg-blue-700 text-white font-black h-12 shadow-lg rounded-2xl transition-all uppercase tracking-widest text-xs"
              >
                {loading ? <Loader2 className="animate-spin h-5 w-5" /> : <Plus className="mr-2 h-5 w-5"/>} 
                Authorize Design
              </Button>
            </div>
          </div>
        </CardContent>
        <CardFooter className="bg-slate-50/30 p-8 border-t border-slate-100 flex justify-between items-center">
            <div className="flex items-center gap-3">
                <Package size={14} className="text-slate-300" />
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sovereign OS Manufacturing Node v10.6.0</span>
            </div>
            <Badge variant="outline" className="bg-white text-[9px] font-black tracking-tighter border-slate-200 shadow-sm">ISO-9001 COMPLIANT_REGISTRY</Badge>
        </CardFooter>
      </Card>

      {/* --- DESIGNED ASSET LEDGER (THE LIST) --- */}
      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white rounded-[2.5rem] animate-in slide-in-from-bottom duration-700">
        <CardHeader className="p-10 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                    <ClipboardList size={22} />
                </div>
                <div>
                    <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Designed Asset Ledger</CardTitle>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Authorized manufacturing master identities</p>
                </div>
            </div>
            <div className="relative w-full md:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <Input 
                    placeholder="Search by Identity or SKU..." 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-11 h-11 border-slate-100 bg-slate-50/50 rounded-2xl text-xs font-bold"
                />
            </div>
        </CardHeader>
        <CardContent className="p-0">
            <ScrollArea className="w-full">
                <Table>
                    <TableHeader className="bg-slate-50/50">
                        <TableRow className="hover:bg-transparent border-none">
                            <TableHead className="pl-10 h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest">Design Identity</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Output Metric</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Classification</TableHead>
                            <TableHead className="h-14 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Retail Valuation</TableHead>
                            <TableHead className="pr-10 h-14 w-20"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isDesignsLoading ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center">
                                    <Loader2 className="animate-spin h-6 w-6 text-slate-200 mx-auto" />
                                </TableCell>
                            </TableRow>
                        ) : filteredDesigns.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-2 text-slate-300">
                                        <Layers size={32} strokeWidth={1} />
                                        <p className="text-xs font-bold uppercase tracking-widest">No Authorized Designs Found</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredDesigns.map((design) => (
                                <TableRow key={design.id} className="group hover:bg-slate-50/50 border-b border-slate-50 transition-colors">
                                    <TableCell className="pl-10 py-6">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 uppercase tracking-tight">{design.products?.name}</span>
                                            <span className="text-[10px] font-mono text-slate-400 mt-1 uppercase">{design.sku}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className="bg-white border-slate-200 text-slate-600 font-bold px-3 py-1 rounded-lg">
                                            {design.units_of_measure?.abbreviation}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                            {design.products?.categories?.name || 'Unclassified'}
                                        </span>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-black text-slate-900 tabular-nums">
                                                {design.price.toLocaleString()}
                                            </span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase">{profile?.currency}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="pr-10 text-right">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-slate-300 hover:text-slate-900 hover:bg-white border border-transparent hover:border-slate-100">
                                            <MoreHorizontal size={16} />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
                <ScrollBar orientation="horizontal" />
            </ScrollArea>
        </CardContent>
      </Card>

      {/* MODAL: NEW UNIT */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-center gap-3">
                      <Scale className="text-blue-400" /> Metric Registry
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                      Establish a new measurement standard for Industrial tracking.
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
                  <Button onClick={handleCreateUnit} className="bg-blue-600 hover:bg-blue-700 text-white font-black px-8 rounded-2xl shadow-xl uppercase tracking-widest text-[10px]">Save Metric</Button>
              </DialogFooter>
          </DialogContent>
      </Dialog>

      {/* MODAL: NEW CATEGORY */}
      <Dialog open={isCategoryModalOpen} onOpenChange={setIsCategoryModalOpen}>
          <DialogContent className="sm:max-w-[400px] rounded-[2.5rem] border-none shadow-2xl p-0 overflow-hidden">
              <div className="bg-slate-900 p-8 text-white text-center">
                  <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center justify-center gap-3">
                      <FolderPlus className="text-blue-400" /> Sector Classification
                  </DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs mt-2 leading-relaxed font-medium">
                      Define a new production category.
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
    </div>
  );
}