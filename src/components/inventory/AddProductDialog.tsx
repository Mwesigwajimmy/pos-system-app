'use client';

/**
 * --- BBU1 SOVEREIGN PRODUCT MANAGEMENT CONSOLE ---
 * VERSION: v15.8 OMEGA (CAMERA SCANNER & GLOBAL PRICING WELDED)
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue,
  SelectGroup,
  SelectLabel
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";

import { 
  Plus, 
  Trash, 
  Wand2, 
  Loader2, 
  Package, 
  Search,
  RotateCcw,
  X,
  PlusCircle,
  CheckCircle2,
  MapPin,
  Camera,
  ImagePlus,
  Video,
  Sprout,
  CalendarDays,
  Syringe,
  ClipboardList,
  Layers,
  Activity,
  Sparkles
} from 'lucide-react';

import { Category } from '@/types/dashboard';
import { cn } from "@/lib/utils";

const supabase = createClient();

interface Unit {
  id: string;
  name: string;
  abbreviation: string;
}

interface VariantDraft {
  name: string;
  sku: string;
  price: number;
  cost_price: number;
  stock_quantity: number;
  units_per_pack: number; 
  attributes: Record<string, string>;
  uom_id: string | null;
}

interface AttributeBuilder {
  name: string;
  inputValue: string; 
  values: string[];   
}

interface ProductManagementProps {
  categories: Category[];
  initialScanData?: { 
    barcode: string; 
    name: string; 
    price?: number; 
    costPrice?: number; 
    isGlobal: boolean 
  } | null;
  onClose?: () => void;
}

const DEFAULT_VARIANT: VariantDraft = {
  name: 'Standard',
  sku: '',
  price: 0,
  cost_price: 0,
  stock_quantity: 0,
  units_per_pack: 1, 
  attributes: {},
  uom_id: null
};

export default function ProductManagementConsole({ categories, initialScanData, onClose }: ProductManagementProps) {
  const [open, setOpen] = useState(false);
  const [uomSearchQuery, setUomSearchQuery] = useState("");
  const queryClient = useQueryClient();

  const [units, setUnits] = useState<Unit[]>([]);
  const [isUnitModalOpen, setIsUnitModalOpen] = useState(false);
  const [newUnitName, setNewUnitName] = useState('');
  const [newUnitAbbr, setNewUnitAbbr] = useState('');
  const [isSavingUnit, setIsSavingUnit] = useState(false);

  const [productName, setProductName] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null); 
  const [uomId, setUomId] = useState<string | null>(null);
  const [taxCategoryCode, setTaxCategoryCode] = useState('STANDARD'); 
  const [isMultiVariant, setIsMultiVariant] = useState(false);
  const [variants, setVariants] = useState<VariantDraft[]>([{ ...DEFAULT_VARIANT }]);
  const [activeTab, setActiveTab] = useState("configuration");
  const [attributes, setAttributes] = useState<AttributeBuilder[]>([
    { name: 'Color', inputValue: '', values: [] }
  ]);

  // AGRI-DNA STATE
  const [isBiological, setIsBiological] = useState(false);
  const [breedVariety, setBreedVariety] = useState('');
  const [plantingDate, setPlantingDate] = useState('');
  const [activitySchedule, setActivitySchedule] = useState('none');

  // Media Handling State
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // AUTO-FILL & MODAL OPEN WELD FOR CAMERA SCAN:
  useEffect(() => {
    if (initialScanData) {
      setProductName(initialScanData.name || '');
      setVariants([{
        ...DEFAULT_VARIANT,
        sku: initialScanData.barcode,
        price: Number(initialScanData.price) || 0,
        cost_price: Number(initialScanData.costPrice) || 0,
        stock_quantity: 1
      }]);
      setOpen(true); // Automatically opens the registry modal when scan completes
      
      toast.success(initialScanData.isGlobal ? "Global Product Resolved" : "New Barcode Detected", { 
        description: `Barcode ${initialScanData.barcode} auto-filled into registry.` 
      });
    }
  }, [initialScanData]);

  // Profile and Currency Queries
  const { data: profile } = useQuery({
    queryKey: ['active_profile_currency'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      const { data } = await supabase.from('profiles').select('currency, business_id').eq('id', user?.id).single();
      return data;
    }
  });

  const { data: locations } = useQuery({
    queryKey: ['business_locations', profile?.business_id],
    enabled: !!profile?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('locations')
        .select('id, name')
        .eq('business_id', profile?.business_id)
        .eq('status', 'active');
      if (error) throw error;
      return data;
    }
  });

  const businessCurrency = profile?.currency || 'USD';

  useEffect(() => {
    if (open) {
      const fetchUnits = async () => {
        const { data } = await supabase.from('units_of_measure').select('id, name, abbreviation').eq('status', 'active'); 
        if (data) setUnits(data);
      };
      fetchUnits();
    }
  }, [open]);

  const filteredUnits = useMemo(() => {
    return units.filter(u => 
      u.name.toLowerCase().includes(uomSearchQuery.toLowerCase()) || 
      u.abbreviation.toLowerCase().includes(uomSearchQuery.toLowerCase())
    );
  }, [units, uomSearchQuery]);

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !profile?.business_id) return;

    setIsUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const filePath = `${profile.business_id}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
            .from('inventory-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('inventory-assets')
            .getPublicUrl(filePath);

        setMediaUrl(publicUrl);
        toast.success("Asset media captured successfully.");
    } catch (error: any) {
        toast.error(`Upload failed: ${error.message}`);
    } finally {
        setIsUploading(false);
    }
  };

  const handleAddUnit = async () => {
    if (!newUnitName.trim() || !newUnitAbbr.trim()) return;
    setIsSavingUnit(true);
    try {
      const { data: newUnit, error } = await supabase.from('units_of_measure')
        .insert({ name: newUnitName, abbreviation: newUnitAbbr, business_id: profile?.business_id, status: 'active' })
        .select().single();
      if (error) throw error;
      setUnits(prev => [...prev, newUnit]);
      setUomId(String(newUnit.id));
      setIsUnitModalOpen(false);
      toast.success("Measurement unit added to system");
    } catch (err) { toast.error("Synchronization failed"); } finally { setIsSavingUnit(false); }
  };

  const generateVariants = () => {
    const validAttributes = attributes
      .map(attr => ({ name: attr.name.trim(), values: attr.inputValue.split(',').map(s => s.trim()).filter(Boolean) }))
      .filter(attr => attr.values.length > 0 && attr.name !== '');

    if (validAttributes.length === 0) return toast.error("Please add product options first");

    const cartesian = (arr: any[][]) => arr.reduce((a, b) => a.flatMap(d => b.map(e => [d, e].flat())));
    let combinations = validAttributes.length === 1 ? validAttributes[0].values.map(v => [v]) : cartesian(validAttributes.map(a => a.values));

    setVariants(combinations.map((combo) => {
      const attrMap: Record<string, string> = {};
      validAttributes.forEach((attr, idx) => { attrMap[attr.name] = Array.isArray(combo) ? combo[idx] : combo; });
      return { 
          name: Array.isArray(combo) ? combo.join(' / ') : combo, 
          sku: initialScanData?.barcode || '', 
          price: variants[0].price, 
          cost_price: variants[0].cost_price, 
          stock_quantity: 1, 
          units_per_pack: 1, 
          attributes: attrMap, 
          uom_id: null 
      };
    }));
    setActiveTab("preview"); 
  };

  const updateVariant = (index: number, field: keyof VariantDraft, value: any) => {
    const updated = [...variants];
    updated[index] = { ...updated[index], [field]: value };
    setVariants(updated);
  };

  // MUTATION LOGIC
  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      const safeBusinessId = profile?.business_id;
      if (!safeBusinessId) {
        toast.error("Business identity not verified. Please wait.");
        throw new Error("Missing business_id");
      }

      if (!productName.trim()) throw new Error("Please enter a product name");

      const agriMetadata = isBiological ? {
        is_biological: true,
        breed_variety: breedVariety,
        planting_birth_date: plantingDate,
        vitality_schedule: activitySchedule
      } : {};

      const { data: product, error: prodError } = await supabase.from('products').upsert({
          name: productName,
          category_id: categoryId ? parseInt(categoryId) : null,
          uom_id: uomId || null, 
          business_id: safeBusinessId,
          location_id: locationId, 
          is_active: true,
          status: 'active',
          tax_category_code: taxCategoryCode.toUpperCase(),
          metadata: agriMetadata
        }, { onConflict: 'name, business_id' }) 
        .select('id').single();

      if (prodError) throw prodError;

      const variantsToSave = isMultiVariant ? variants : [{...variants[0], name: 'Standard'}];

      const variantsPayload = variantsToSave.map(v => ({
        product_id: product.id,
        name: v.name || 'Standard',
        sku: v.sku || `SKU-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        barcode: v.sku || initialScanData?.barcode || null,
        price: Number(v.price),
        selling_price: Number(v.price), 
        cost_price: Number(v.cost_price),
        stock_quantity: Number(v.stock_quantity),
        status: 'active', 
        business_id: safeBusinessId, 
        location_id: locationId, 
        tax_category_code: taxCategoryCode.toUpperCase(),
        units_per_pack: Number(v.units_per_pack) || 1,
        attributes: v.attributes || {},
        primary_media_url: mediaUrl,
        is_biological: isBiological
      }));

      const { error: varError } = await supabase
        .from('product_variants')
        .upsert(variantsPayload, { onConflict: 'product_id, name' });

      if (varError) throw varError;

      // ALSO CONTRIBUTE TO SELF-LEARNING GLOBAL MASTER
      if (initialScanData?.barcode) {
        await supabase.rpc('fn_contribute_global_barcode', {
          p_barcode: initialScanData.barcode,
          p_product_name: productName,
          p_suggested_price: Number(variants[0].price),
          p_suggested_cost: Number(variants[0].cost_price)
        });
      }
    },
    onSuccess: () => {
      toast.success("Product successfully synchronized");
      queryClient.invalidateQueries({ queryKey: ['inventoryProducts'] });
      setOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.message);
    }
  });

  const resetForm = () => {
    setProductName(''); setCategoryId(null); setUomId(null); setTaxCategoryCode('STANDARD'); setLocationId(null); setUomSearchQuery("");
    setIsMultiVariant(false); setVariants([{ ...DEFAULT_VARIANT }]);
    setAttributes([{ name: 'Color', inputValue: '', values: [] }]); setActiveTab("configuration");
    setMediaUrl(null); 
    setIsBiological(false); setBreedVariety(''); setPlantingDate(''); setActivitySchedule('none');
    if (onClose) onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!val) resetForm(); setOpen(val); }}>
      <DialogTrigger asChild>
        <Button className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-all shadow-md">
            <Plus size={16} className="mr-2" /> Add New Product
        </Button>
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-5xl w-[95vw] sm:w-full flex flex-col p-0 border-none rounded-2xl shadow-3xl bg-white overflow-hidden max-h-[95vh] sm:max-h-[90vh]">
        
        {/* HEADER */}
        <div className="px-8 py-7 border-b shrink-0 bg-white">
          <div className="flex items-center gap-4">
             <div className="h-12 w-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                <Package size={28} />
             </div>
             <div className="space-y-0.5">
                <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Product Registry</h2>
                <p className="text-sm font-medium text-slate-400">Define stock parameters, multi-tenant location, and industrial DNA.</p>
             </div>
          </div>
        </div>

        <ScrollArea className="flex-1 w-full overflow-y-auto bg-slate-50/20">
          <div className="p-6 sm:p-10 space-y-10">
            
            {/* ROW 1: CORE IDENTITY + MEDIA */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                <div className="md:col-span-2 space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Product Designation</Label>
                    <Input value={productName} onChange={e => setProductName(e.target.value)} placeholder="e.g. Industrial Maize / Vaccine Batch" className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4 shadow-sm" />
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Classification</Label>
                    <Select value={categoryId || ''} onValueChange={setCategoryId}>
                        <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4 shadow-sm">
                          <SelectValue placeholder="Select Category" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] rounded-xl border-slate-100 shadow-2xl">
                            {categories.map(c => <SelectItem key={c.id} value={String(c.id)} className="font-bold py-2.5">{c.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assigned Node</Label>
                    <Select value={locationId || ''} onValueChange={setLocationId}>
                        <SelectTrigger className="h-12 border-slate-200 bg-white rounded-xl font-bold px-4 shadow-sm">
                          <SelectValue placeholder="Select Branch" />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] rounded-xl border-slate-100 shadow-2xl">
                            {locations?.map(loc => (
                              <SelectItem key={loc.id} value={loc.id} className="font-bold py-2.5">
                                  {loc.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Asset Proof</Label>
                    <div className="relative group">
                        <Input type="file" accept="image/*" onChange={handleMediaUpload} className="hidden" id="product-media-upload" />
                        <label htmlFor="product-media-upload" className={cn(
                                "flex items-center justify-center gap-2 h-12 px-3 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                                mediaUrl ? "border-emerald-500 bg-emerald-50 text-emerald-700 shadow-inner" : "border-slate-200 bg-white hover:border-blue-400 text-slate-400 hover:text-blue-600 shadow-sm"
                            )}>
                            {isUploading ? <Loader2 className="animate-spin h-5 w-5" /> : mediaUrl ? <CheckCircle2 size={18} /> : <Camera size={18} />}
                            <span className="text-[9px] font-black uppercase whitespace-nowrap">
                                {isUploading ? "Uploading..." : mediaUrl ? "Media Linked" : "Attach Photo"}
                            </span>
                        </label>
                    </div>
                </div>
            </div>

            {/* ROW 2: MEASUREMENT + SECTOR WELD */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                <div className="md:col-span-6 space-y-3">
                    <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Measurement Unit & Tax Protocol</Label>
                    <div className="flex gap-3">
                      <Select value={uomId || ''} onValueChange={setUomId}>
                          <SelectTrigger className="flex-1 h-12 border-slate-200 bg-slate-50 rounded-xl font-bold px-5">
                            <SelectValue placeholder="Pcs, Kg, Acre..." />
                          </SelectTrigger>
                          <SelectContent className="p-0 z-[10000] rounded-xl border-slate-100 shadow-2xl">
                              <div className="p-4 bg-slate-900 border-b flex items-center gap-3 sticky top-0 z-10">
                                <Search size={16} className="text-slate-400" />
                                <input type="text" placeholder="Search units..." value={uomSearchQuery} onChange={(e) => setUomSearchQuery(e.target.value)} className="w-full bg-transparent border-none outline-none font-bold text-xs text-white" onKeyDown={(e) => e.stopPropagation()} />
                              </div>
                              <ScrollArea className="h-64">
                                <SelectGroup className="p-2">
                                    <SelectItem value="pcs" className="font-bold py-2.5">Pieces (pcs)</SelectItem>
                                    <SelectItem value="kg" className="font-bold py-2.5">Kilograms (kg)</SelectItem>
                                    <SelectItem value="acre" className="font-bold py-2.5">Acres (ac)</SelectItem>
                                </SelectGroup>
                                {filteredUnits.length > 0 && (
                                    <SelectGroup className="p-2">
                                        <SelectLabel className="px-3 py-2 text-[8px] font-black text-slate-300 uppercase tracking-[0.2em] border-t border-slate-50">Industrial Ledger</SelectLabel>
                                        {filteredUnits.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)} className="font-bold py-2.5">{u.name} ({u.abbreviation})</SelectItem>
                                        ))}
                                    </SelectGroup>
                                )}
                              </ScrollArea>
                          </SelectContent>
                      </Select>
                      <Button variant="outline" type="button" onClick={() => setIsUnitModalOpen(true)} className="h-12 w-12 rounded-xl border-slate-200 bg-white text-blue-600 hover:bg-blue-600 hover:text-white transition-all shrink-0">
                        <Plus size={24} />
                      </Button>
                      <Select value={taxCategoryCode} onValueChange={setTaxCategoryCode}>
                        <SelectTrigger className="w-[160px] h-12 border-slate-200 bg-slate-50 rounded-xl font-bold px-5">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[10000] rounded-xl shadow-2xl border-slate-50">
                            <SelectItem value="STANDARD" className="font-bold text-xs py-2.5">Standard Tax</SelectItem>
                            <SelectItem value="EXEMPT" className="font-bold text-xs py-2.5">Tax Exempt</SelectItem>
                            <SelectItem value="REDUCED" className="font-bold text-xs py-2.5">Reduced (5%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                </div>

                <div className="md:col-span-3 flex items-center space-x-4 p-4 rounded-xl bg-emerald-50/50 border border-emerald-100 h-12 shadow-sm transition-all group">
                    <Sprout className={cn("h-5 w-5 transition-transform group-hover:scale-110", isBiological ? "text-emerald-600" : "text-slate-300")} />
                    <Label className="text-[11px] font-black text-slate-500 uppercase tracking-tight flex-1 cursor-pointer">Biological Asset</Label>
                    <Switch checked={isBiological} onCheckedChange={setIsBiological} className="data-[state=checked]:bg-emerald-600" />
                </div>

                <div className="md:col-span-3 flex items-center space-x-4 p-4 rounded-xl bg-slate-50 border border-slate-100 h-12 shadow-sm group">
                    <Layers className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
                    <Label className="text-[11px] font-black text-slate-500 uppercase tracking-tight flex-1 cursor-pointer">Multi-Variant</Label>
                    <Switch checked={isMultiVariant} onCheckedChange={(checked) => { setIsMultiVariant(checked); if (!checked) setVariants([{ ...DEFAULT_VARIANT }]); }} />
                </div>
            </div>

            {/* ROW 3: BIOLOGICAL DATA */}
            {isBiological && (
                <div className="bg-emerald-50/30 p-8 rounded-[2.5rem] border border-emerald-100 space-y-8 animate-in slide-in-from-top-4 duration-500 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 p-8 opacity-10">
                        <Sprout size={120} className="text-emerald-600" />
                    </div>
                    
                    <div className="flex items-center gap-3 border-b border-emerald-100 pb-5">
                        <div className="h-10 w-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                            <Activity size={22} />
                        </div>
                        <div className="space-y-0.5">
                           <h4 className="text-base font-black uppercase text-emerald-900 tracking-tight">Agricultural Biological DNA</h4>
                           <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Growth Cycle & Breed Tracking</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Breed / Variety Name</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
                                <Input value={breedVariety} onChange={e => setBreedVariety(e.target.value)} placeholder="e.g. Ankole Longhorn / Maize" className="h-12 pl-10 border-emerald-200 bg-white rounded-xl font-bold text-emerald-900 focus:ring-emerald-500 shadow-sm" />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Planting / Birth Date</Label>
                            <div className="relative">
                                <CalendarDays className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-400" size={16} />
                                <Input type="date" value={plantingDate} onChange={e => setPlantingDate(e.target.value)} className="h-12 pl-12 border-emerald-200 bg-white rounded-xl font-bold text-emerald-900 shadow-sm" />
                            </div>
                        </div>

                        <div className="space-y-2.5">
                            <Label className="text-[10px] font-black text-emerald-800 uppercase tracking-widest ml-1">Vitality Activity Schedule</Label>
                            <Select value={activitySchedule} onValueChange={setActivitySchedule}>
                                <SelectTrigger className="h-12 border-emerald-200 bg-white rounded-xl font-bold px-4 text-emerald-900 shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <ClipboardList size={18} className="text-emerald-500" />
                                        <SelectValue placeholder="Select Cycle" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-emerald-50 shadow-2xl">
                                    <SelectItem value="daily" className="font-bold py-3 border-b border-slate-50 last:border-0">Daily Routine (Feeding/Water)</SelectItem>
                                    <SelectItem value="weekly" className="font-bold py-3 border-b border-slate-50 last:border-0">Weekly Check (Spraying)</SelectItem>
                                    <SelectItem value="seasonal" className="font-bold py-3 border-b border-slate-50 last:border-0">Seasonal Cycle (Soil/Audit)</SelectItem>
                                    <SelectItem value="medical" className="font-bold py-3">Medical Guard (Vaccination)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            )}

            {/* ROW 4: PRICING LOGIC */}
            <div className="space-y-6">
                {!isMultiVariant ? (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-6 bg-slate-900 text-white p-8 rounded-[2rem] shadow-2xl shadow-slate-200 border border-slate-800">
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em]">Retail Price</Label>
                            <input type="number" step="0.01" className="h-12 border-none bg-slate-800 rounded-xl font-black text-xl px-4 w-full tabular-nums text-white focus:ring-1 focus:ring-blue-500" value={variants[0].price} onChange={(e) => updateVariant(0, 'price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Acquisition Cost</Label>
                            <input type="number" step="0.01" className="h-12 border-none bg-slate-800/50 rounded-xl font-bold text-lg px-4 w-full tabular-nums text-slate-300" value={variants[0].cost_price} onChange={(e) => updateVariant(0, 'cost_price', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em]">Opening Stock</Label>
                            <input type="number" className="h-12 border-none bg-slate-800 rounded-xl font-black text-xl px-4 w-full tabular-nums text-emerald-400" value={variants[0].stock_quantity} onChange={(e) => updateVariant(0, 'stock_quantity', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Quantity/Unit</Label>
                            <input type="number" className="h-12 border-none bg-slate-800/50 rounded-xl font-bold text-lg px-4 w-full" value={variants[0].units_per_pack} onChange={(e) => updateVariant(0, 'units_per_pack', Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Master SKU / Barcode</Label>
                            <input placeholder="AUTO-GEN" className="h-12 border-none bg-slate-800/50 rounded-xl font-bold uppercase text-xs px-4 w-full text-blue-300 placeholder:text-slate-600" value={variants[0].sku} onChange={(e) => updateVariant(0, 'sku', e.target.value)} />
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8 bg-white p-8 rounded-[2rem] border border-slate-100">
                        <TabsList className="bg-slate-100 p-1.5 rounded-2xl h-14 w-full max-w-md shadow-inner">
                            <TabsTrigger value="configuration" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all">1. Property Config</TabsTrigger>
                            <TabsTrigger value="preview" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:shadow-lg transition-all" disabled={variants.length <= 0}>2. Variant Matrix</TabsTrigger>
                        </TabsList>

                        <TabsContent value="configuration" className="space-y-6">
                            <div className="grid gap-4">
                              {attributes.map((attr, idx) => (
                                  <div key={idx} className="flex gap-4 items-end bg-slate-50 p-6 rounded-2xl border border-slate-100 hover:border-blue-200 transition-colors">
                                      <div className="w-1/3 space-y-2">
                                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Property (e.g. Size)</Label>
                                          <Input value={attr.name} onChange={e => { const updated = [...attributes]; updated[idx].name = e.target.value; setAttributes(updated); }} className="h-11 border-slate-200 bg-white rounded-xl font-bold" />
                                      </div>
                                      <div className="flex-1 space-y-2">
                                          <Label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Values (Comma Separated)</Label>
                                          <Input value={attr.inputValue} onChange={e => { const updated = [...attributes]; updated[idx].inputValue = e.target.value; setAttributes(updated); }} placeholder="Small, Medium, Large" className="h-11 border-slate-200 bg-white rounded-xl font-bold" />
                                      </div>
                                      <Button variant="ghost" size="icon" onClick={() => setAttributes(attributes.filter((_, i) => i !== idx))} className="text-slate-300 hover:text-red-500 h-11 w-11 rounded-xl bg-white shadow-sm hover:bg-red-50">
                                          <Trash size={18} />
                                      </Button>
                                  </div>
                              ))}
                            </div>
                            <div className="flex justify-between items-center py-4 border-t border-slate-50">
                                <Button variant="outline" onClick={() => setAttributes([...attributes, { name: '', inputValue: '', values: [] }])} className="h-11 px-6 text-blue-600 font-black text-[10px] uppercase tracking-widest gap-2 hover:bg-blue-50 border-blue-100 rounded-xl shadow-sm">
                                  <PlusCircle size={18} /> Add Physical Property
                                </Button>
                                <Button type="button" onClick={generateVariants} className="h-11 px-8 bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-xl hover:bg-black active:scale-95">
                                  <Wand2 size={18} className="mr-2" /> Compute Neural Matrix
                                </Button>
                            </div>
                        </TabsContent>

                        <TabsContent value="preview">
                            <div className="rounded-[1.5rem] border border-slate-100 overflow-hidden shadow-2xl bg-white">
                              <ScrollArea className="w-full max-h-[420px]">
                                <Table>
                                    <TableHeader className="bg-slate-50 border-b border-slate-100">
                                        <TableRow className="h-14">
                                            <TableHead className="px-8 font-black uppercase text-slate-400 text-[9px] tracking-widest">Variant Identity</TableHead>
                                            <TableHead className="text-center font-black uppercase text-slate-400 text-[9px] tracking-widest">Retail Price</TableHead>
                                            <TableHead className="text-center font-black uppercase text-slate-400 text-[9px] tracking-widest">Acquisition Price</TableHead>
                                            <TableHead className="text-center font-black uppercase text-slate-400 text-[9px] tracking-widest">Opening Stock</TableHead>
                                            <TableHead className="px-8 text-right font-black uppercase text-slate-400 text-[9px] tracking-widest">Registry SKU</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {variants.map((v, idx) => (
                                            <TableRow key={idx} className="h-16 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                                <TableCell className="px-8 text-xs font-black text-slate-900 uppercase tracking-tight">{v.name}</TableCell>
                                                <TableCell className="text-center"><input type="number" step="0.01" className="h-9 w-32 border border-slate-100 bg-white text-slate-900 font-black text-center mx-auto rounded-lg px-2 shadow-sm focus:ring-1 focus:ring-blue-500" value={v.price} onChange={e => updateVariant(idx, 'price', Number(e.target.value))} /></TableCell>
                                                <TableCell className="text-center"><input type="number" step="0.01" className="h-9 w-32 border border-slate-100 bg-white text-slate-500 font-bold text-center mx-auto rounded-lg px-2 shadow-sm focus:ring-1 focus:ring-blue-500" value={v.cost_price} onChange={e => updateVariant(idx, 'cost_price', Number(e.target.value))} /></TableCell>
                                                <TableCell className="text-center"><input type="number" className="h-9 w-32 border border-slate-100 bg-white text-blue-700 font-black text-center mx-auto rounded-lg px-2 shadow-sm focus:ring-1 focus:ring-blue-500" value={v.stock_quantity} onChange={e => updateVariant(idx, 'stock_quantity', Number(e.target.value))} /></TableCell>
                                                <TableCell className="px-8"><input className="h-9 w-40 border border-slate-100 rounded-lg uppercase text-[10px] font-black text-right ml-auto bg-slate-50/50 px-3 text-slate-400" value={v.sku} onChange={e => updateVariant(idx, 'sku', e.target.value)} placeholder="AUTO" /></TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <ScrollBar orientation="horizontal" />
                              </ScrollArea>
                            </div>
                        </TabsContent>
                    </Tabs>
                )}
            </div>
          </div>
        </ScrollArea>

        {/* FOOTER ACTIONS */}
        <div className="px-10 py-8 bg-slate-50 border-t flex items-center justify-between shrink-0">
          <Button variant="ghost" onClick={() => { setOpen(false); resetForm(); }} className="h-12 px-8 font-black text-slate-400 uppercase tracking-widest text-[10px] transition-all hover:text-red-500 rounded-2xl">Discard Entry</Button>
          <Button onClick={() => mutate()} disabled={isPending} className="h-14 px-16 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-2xl shadow-blue-200 transition-all active:scale-95 border-none flex gap-4">
            {isPending ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
            Commit Product to Ledger
          </Button>
        </div>
      </DialogContent>

      {/* ADD UNIT MODAL */}
      <Dialog open={isUnitModalOpen} onOpenChange={setIsUnitModalOpen}>
        <DialogContent className="max-w-md rounded-[2.5rem] p-0 overflow-hidden border-none shadow-3xl bg-white z-[12000]">
          <DialogHeader className="px-10 py-8 bg-slate-900 text-white">
            <DialogTitle className="text-xl font-black uppercase tracking-tight">Register Measurement Node</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs font-medium tracking-widest uppercase mt-2">New metric definition for industrial inventory.</DialogDescription>
          </DialogHeader>
          <div className="p-10 space-y-6 bg-white">
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Unit Name</Label>
              <Input placeholder="e.g. Metric Tonnes" value={newUnitName} onChange={(e) => setNewUnitName(e.target.value)} className="h-12 border-slate-100 font-bold rounded-xl px-4 bg-slate-50 shadow-inner" />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Abbreviation Seal</Label>
              <Input placeholder="e.g. MT" value={newUnitAbbr} onChange={(e) => setNewUnitAbbr(e.target.value)} className="h-12 border-slate-100 font-black rounded-xl px-4 uppercase bg-slate-50 shadow-inner text-blue-600" />
            </div>
          </div>
          <DialogFooter className="px-10 py-8 bg-slate-50 border-t flex gap-4">
            <Button variant="ghost" onClick={() => setIsUnitModalOpen(false)} className="h-12 px-6 font-black text-[10px] uppercase tracking-widest text-slate-400">Abort</Button>
            <Button onClick={handleAddUnit} disabled={isSavingUnit} className="h-12 px-10 bg-slate-900 hover:bg-black text-white font-black text-[10px] uppercase tracking-widest rounded-xl flex-1 shadow-xl">
               {isSavingUnit ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : "Verify & Seal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}