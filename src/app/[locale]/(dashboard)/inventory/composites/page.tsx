'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
    PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Hammer, Check, 
    ChevronsUpDown, CheckCircle2, ShieldCheck, TrendingUp, Calculator, Package, 
    Box, Globe, Activity, Info, Utensils, Beaker,
    Search, AlertTriangle, ArrowRight, Save, FileText, X, Database, ShieldAlert
} from 'lucide-react';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from '@/components/ui/scroll-area';

// --- ENTERPRISE INTERFACES ---

interface Component {
  component_variant_id: number;
  component_name: string;
  quantity: number;
  unit_cost?: number; 
  available_stock?: number;
  uom_name?: string;
}

interface CompositeProduct {
  id: number;
  name: string;
  sku: string;
  total_components: number;
  current_stock: number;
  total_production_cost?: number;
}

interface CompositeProductDetails extends Omit<CompositeProduct, 'total_components' | 'current_stock'> {
  components: Component[];
}

interface RawMaterialOption {
  value: number;
  label: string;
  sku: string;
  cost_price: number;
  uom_name?: string;
}

interface LocationOption {
    value: string;
    label: string;
}

// --- API DATA ACCESS LAYER ---

const supabase = createClient();

async function fetchComposites(): Promise<CompositeProduct[]> {
    const { data, error } = await supabase.rpc('get_composite_recipes_v5');
    if (error) throw new Error(error.message);
    return data?.map((item: any) => ({ ...item, id: item.recipe_id })) || [];
}

async function fetchRawMaterials(): Promise<RawMaterialOption[]> {
    // CRITICAL SECURITY: Fetching only verified Raw Materials (is_raw_material = true)
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, cost_price, products(name), units_of_measure(name)')
        .eq('is_raw_material', true)
        .eq('is_active', true);
        
    if (error) throw new Error(error.message);
    return data.map((v: any) => ({ 
        value: Number(v.id), 
        label: `${v.products?.name} - ${v.name}`,
        sku: v.sku || 'N/A',
        cost_price: v.cost_price || 0,
        uom_name: v.units_of_measure?.name
    })) || [];
}

async function fetchCompositeDetails(id: number): Promise<CompositeProductDetails> {
    const { data, error } = await supabase.rpc('get_composite_details_v5', { p_variant_id: id });
    if (error) throw new Error(error.message);
    return data;
}

async function fetchLocations(): Promise<LocationOption[]> {
    const { data, error } = await supabase.from('locations').select('id, name').eq('status', 'active');
    if (error) throw new Error(error.message);
    return data.map(l => ({ value: l.id, label: l.name })) || [];
}

async function upsertComposite(compositeData: { id: number | null, name: string, sku: string, components: { component_variant_id: number, quantity: number }[] }) {
    const { error } = await supabase.rpc('upsert_composite_product_v5', {
        p_variant_id: compositeData.id,
        p_name: compositeData.name,
        p_sku: compositeData.sku,
        p_components: compositeData.components
    });
    if (error) throw error;
}

async function deleteComposite(id: number) {
    const { error } = await supabase.rpc('delete_composite_product_v2', { p_variant_id: id });
    if (error) throw error;
}

async function processAssembly(payload: { p_composite_variant_id: number, p_quantity_to_assemble: number, p_source_location_id: string }) {
    const { error } = await supabase.rpc('process_assembly_v5', payload);
    if (error) throw error;
}

// --- SUB-COMPONENT: RECIPE FORM (Zero Hardcoding) ---

function CompositeProductForm({ initialData, onSave, onCancel, isSaving }: any) {
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [components, setComponents] = useState<Component[]>(initialData?.components || []);
    const [open, setOpen] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

    const { data: rawMaterials } = useQuery({ queryKey: ['rawMaterials'], queryFn: fetchRawMaterials });
    
    const handleAddComponent = () => {
        if (!selectedVariantId) return;
        const material = rawMaterials?.find(m => m.value === selectedVariantId);
        if (!material) return;

        if (components.some(c => c.component_variant_id === selectedVariantId)) {
            toast.error("Item already in formula.");
            return;
        }

        setComponents(prev => [
            ...prev, 
            { component_variant_id: material.value, component_name: material.label, quantity: 1, unit_cost: material.cost_price, uom_name: material.uom_name }
        ]);
        setSelectedVariantId(null);
        setOpen(false);
    };
    
    const currentProductionCost = useMemo(() => {
        return components.reduce((sum, c) => sum + (c.quantity * (c.unit_cost || 0)), 0);
    }, [components]);

    const handleSubmit = () => {
        if (!name.trim()) return toast.error("Batch name required.");
        if (components.length === 0) return toast.error("Attach at least one input material.");
        onSave({
            id: initialData?.id || null,
            name,
            sku,
            components: components.map(({ component_variant_id, quantity }) => ({ component_variant_id, quantity })),
        });
    };
    
    return (
        <div className="flex flex-col h-full bg-white">
            <ScrollArea className="flex-1 max-h-[65vh] px-10 py-8">
                <div className="space-y-10">
                    {/* Identification Node */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Manufacturing Asset Name</Label>
                            <Input className="bg-white h-12 border-slate-100 font-black rounded-xl shadow-inner" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Industrial Soap Batch"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sovereign SKU Mapping</Label>
                            <Input className="bg-white font-mono uppercase h-12 border-slate-100 rounded-xl" value={sku} onChange={e => setSku(e.target.value)} placeholder="AUTO-GENERATE" />
                        </div>
                    </div>

                    {/* Ingredient Sourcing Search */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Add Verified Input Materials</Label>
                            <Badge variant="outline" className="text-[9px] font-black text-blue-600 bg-blue-50 border-blue-100 uppercase">Input Registry Active</Badge>
                        </div>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <div className="flex-1">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-14 border-slate-200 bg-white rounded-2xl font-bold shadow-sm">
                                            {selectedVariantId ? rawMaterials?.find((v) => v.value === selectedVariantId)?.label : "Search for raw chemicals / flour..."}
                                            <ChevronsUpDown className="ml-2 h-5 w-5 opacity-40" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[500px] p-0 shadow-2xl border-slate-100 rounded-[1.5rem] overflow-hidden" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search materials or SKU..." className="h-12" />
                                            <CommandList>
                                                <CommandEmpty className="p-6 text-xs font-black text-slate-300 uppercase tracking-widest text-center">No raw assets found.</CommandEmpty>
                                                <ScrollArea className="h-72">
                                                    <CommandGroup>
                                                        {rawMaterials?.filter(v => !components.some(c => c.component_variant_id === v.value)).map((variant) => (
                                                            <CommandItem key={variant.value} value={variant.label} onSelect={() => { setSelectedVariantId(variant.value); setOpen(false); }} className="p-4 border-b border-slate-50 last:border-0 cursor-pointer">
                                                                <div className="flex flex-col flex-1">
                                                                    <span className="font-black text-sm text-slate-900 tracking-tight">{variant.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-black uppercase mt-1">Registry Cost: {variant.cost_price.toLocaleString()} UGX</span>
                                                                </div>
                                                                <Check className={cn("ml-auto h-5 w-5 text-blue-600", selectedVariantId === variant.value ? "opacity-100" : "opacity-0")} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </ScrollArea>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="h-14 px-10 font-black bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-blue-600 transition-all uppercase text-[10px] tracking-widest">
                                Append Ingredient
                            </Button>
                        </div>
                    </div>

                    {/* BOM Forensic Ledger */}
                    <div className="border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-sm bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 px-8 tracking-widest">Component identity</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-right tracking-widest">Landed unit cost</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-center w-[160px] tracking-widest">Batch Qty</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-right px-8 tracking-widest">Sub-total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-300 text-xs font-black uppercase tracking-[0.2em] italic">Formula Builder Idle. Add Input components.</TableCell></TableRow>
                                ) : (
                                    components.map(comp => (
                                        <TableRow key={comp.component_variant_id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0 group">
                                            <TableCell className="font-black text-slate-800 px-8 py-6 text-sm">{comp.component_name}</TableCell>
                                            <TableCell className="text-right text-xs font-bold text-slate-500">{(comp.unit_cost || 0).toLocaleString()}</TableCell>
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-2 shadow-inner">
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001" 
                                                        value={comp.quantity} 
                                                        onChange={e => setComponents(prev => prev.map(c => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                        className="h-8 border-none text-center font-black text-sm p-0 focus-visible:ring-0 tabular-nums" 
                                                    />
                                                    <span className="text-[10px] text-slate-300 font-black uppercase pr-1">{comp.uom_name || 'U'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-8">
                                                <div className="flex items-center justify-end gap-6">
                                                    <span className="font-black text-slate-900 text-base tabular-nums">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                                    <Button variant="ghost" size="icon" onClick={() => setComponents(components.filter(i => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full">
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            </ScrollArea>

            {/* Forensic Footer Audit Summary */}
            <div className="p-10 border-t bg-slate-900 rounded-b-[3rem] flex flex-col sm:flex-row justify-between items-center gap-8 text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
                    <TrendingUp size={200} />
                 </div>
                 <div className="text-center sm:text-left relative z-10">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Audited Production Baseline</p>
                    <div className="text-4xl font-black tabular-nums tracking-tighter mt-1">
                        {currentProductionCost.toLocaleString()} <span className="text-sm font-bold opacity-30 uppercase">UGX / UNIT</span>
                    </div>
                 </div>
                 <div className="flex gap-4 w-full sm:w-auto relative z-10">
                    <Button variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest">Discard Audit</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white h-14 px-12 font-black rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all">
                        {isSaving ? <Loader2 className="animate-spin mr-3 h-5 w-5"/> : <Save className="mr-3 h-5 w-5"/>} Commit Formula
                    </Button>
                 </div>
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: ASSEMBLY DIALOG ---

function AssemblyDialog({ product, onClose }: { product: CompositeProduct; onClose: () => void; }) {
    const queryClient = useQueryClient();
    const [quantity, setQuantity] = useState(1);
    const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);
    
    const { data: recipe, isLoading: isLoadingRecipe } = useQuery({
        queryKey: ['compositeDetailsWithStock', product.id, sourceLocationId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_composite_details_with_stock_v2', {
                p_variant_id: product.id,
                p_location_id: sourceLocationId
            });
            if (error) throw error;
            return data as CompositeProductDetails;
        },
        enabled: !!sourceLocationId
    });
    
    const { data: locations } = useQuery({ queryKey: ['locations'], queryFn: fetchLocations });
    
    const assemblyMutation = useMutation({
        mutationFn: processAssembly,
        onSuccess: () => {
            toast.success(`Production Run Complete: ${quantity}x "${product.name}"`);
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Production Failure: ${err.message}`)
    });
    
    const canAssemble = recipe && recipe.components.every(c => (c.available_stock || 0) >= (c.quantity * quantity));

    const handleSubmit = () => {
        if (!sourceLocationId) return toast.error("Select production site.");
        assemblyMutation.mutate({
            p_composite_variant_id: product.id,
            p_quantity_to_assemble: quantity,
            p_source_location_id: sourceLocationId
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl border-none shadow-2xl rounded-[2.5rem] overflow-hidden p-0 bg-white">
                <div className="bg-slate-900 p-10 text-white">
                    <div className="flex items-center gap-6">
                        <div className="h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Hammer className="text-white" size={32} />
                        </div>
                        <div className="space-y-1">
                            <DialogTitle className="text-2xl font-black tracking-tighter">Execute Assembly</DialogTitle>
                            <DialogDescription className="text-slate-400 text-xs font-bold uppercase tracking-widest">Synthesizing raw materials into: {product.name}</DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-10 space-y-10 bg-white max-h-[70vh] overflow-y-auto scrollbar-hide">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Yield Quantity</Label>
                            <Input type="number" step="0.01" className="h-12 bg-white font-black text-lg border-slate-100 rounded-xl" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Production Node</Label>
                            <Select onValueChange={setSourceLocationId}>
                                <SelectTrigger className="h-12 bg-white font-black border-slate-100 rounded-xl">
                                    <div className="flex items-center gap-3"><Globe size={16} className="text-blue-500"/><SelectValue placeholder="Identify Branch..." /></div>
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl shadow-2xl">
                                    {locations?.map(l => <SelectItem key={l.value} value={l.value} className="font-bold">{l.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {recipe && (
                        <div className="border border-slate-100 rounded-[2rem] overflow-hidden bg-white shadow-inner">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 pl-8 h-14 tracking-widest">Input Material</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-center h-14 tracking-widest">Net Required</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase text-slate-400 text-right pr-8 h-14 tracking-widest">Site Inventory</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.components.map(c => {
                                        const required = c.quantity * quantity;
                                        const available = c.available_stock || 0;
                                        const hasEnough = available >= required;
                                        return (
                                            <TableRow key={c.component_variant_id} className={cn("border-b border-slate-50 last:border-0", !hasEnough && 'bg-red-50/50')}>
                                                <TableCell className="pl-8 font-black text-sm text-slate-900">{c.component_name}</TableCell>
                                                <TableCell className="text-center font-black text-slate-700 text-sm tabular-nums">{required.toFixed(3)}</TableCell>
                                                <TableCell className="text-right pr-8">
                                                    {hasEnough 
                                                        ? <Badge variant="secondary" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-black px-4 py-1 rounded-full text-[9px] uppercase tracking-widest">Verified ({available.toFixed(1)})</Badge> 
                                                        : <Badge className="bg-red-50 text-red-600 border-red-100 font-black px-4 py-1 rounded-full text-[9px] uppercase tracking-widest">Shortage ({available.toFixed(1)})</Badge>
                                                    }
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                <div className="bg-slate-50 p-10 flex justify-end items-center border-t border-slate-100 gap-6">
                    <Button variant="ghost" onClick={onClose} className="font-black text-slate-400 uppercase text-[10px] tracking-widest">Abort Run</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!canAssemble || assemblyMutation.isPending || !sourceLocationId} 
                        className="bg-blue-600 hover:bg-slate-900 text-white h-16 px-16 font-black rounded-2xl shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] transition-all uppercase text-xs tracking-widest"
                    >
                        {assemblyMutation.isPending ? <Loader2 className="animate-spin h-6 w-6" /> : "Authorize Production"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN VIEW COMPONENT ---

export default function CompositesView() {
    const queryClient = useQueryClient();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isAssemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<CompositeProduct | null>(null);

    const { data: composites, isLoading } = useQuery({ queryKey: ['composites'], queryFn: fetchComposites });
    
    const { data: editingDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['compositeDetails', selectedProduct?.id],
        queryFn: () => fetchCompositeDetails(selectedProduct!.id),
        enabled: !!selectedProduct && isFormOpen,
    });

    const upsertMutation = useMutation({
        mutationFn: upsertComposite,
        onSuccess: () => {
            toast.success("Formula secured in ledger");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: Error) => toast.error(`Registry Error: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComposite,
        onSuccess: () => {
            toast.success("BOM record expunged");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setDeleteConfirmOpen(false);
        }
    });

    return (
        <div className="flex-1 space-y-12 p-8 md:p-12 animate-in fade-in duration-1000 pb-32">
            
            {/* Enterprise Control Header */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10 border-b border-slate-200 pb-12">
                <div className="flex items-center gap-8">
                    <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl text-white">
                        <Beaker className="w-10 h-10" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">Recipe Management</h1>
                        <p className="text-sm text-slate-400 font-black uppercase tracking-[0.3em] mt-2 flex items-center gap-3">
                           <ShieldCheck size={18} className="text-emerald-500" /> Forensic Manufacturing Protocol v10.2
                        </p>
                    </div>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-16 px-12 bg-blue-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)] rounded-3xl transition-all gap-4">
                    <PlusCircle size={20} /> New Production Formula
                </Button>
            </div>

            {/* Context Insights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                   { label: 'Input Filtering', icon: <Database size={20}/>, color: 'text-blue-500', desc: 'Raw materials are strictly isolated from general retail stock for zero contamination.' },
                   { label: 'Precision Costing', icon: <TrendingUp size={20}/>, color: 'text-emerald-500', desc: 'High-precision decimal calculations for pharmacological or chemical compounding.' },
                   { label: 'Audit Trail', icon: <ShieldCheck size={20}/>, color: 'text-indigo-500', desc: 'Perpetual ledger deduction and forensic logs active on every assembly action.' }
                ].map((node, i) => (
                    <Card key={i} className="border-none shadow-xl bg-white p-8 rounded-[2.5rem] group hover:-translate-y-2 transition-all duration-700">
                        <div className={cn("h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center mb-8 shadow-inner", node.color)}>
                            {node.icon}
                        </div>
                        <h4 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-900 mb-3">{node.label}</h4>
                        <p className="text-xs text-slate-500 leading-loose font-bold opacity-70 italic">{node.desc}</p>
                    </Card>
                ))}
            </div>

            {/* Recipe Registry Ledger */}
            <Card className="border-none shadow-[0_50px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3.5rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-12 flex flex-col sm:flex-row justify-between items-center gap-8">
                    <div>
                        <CardTitle className="text-2xl font-black text-slate-900 tracking-tighter uppercase">Product Formula Ledger</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2">Authenticated Batch Nodes: {composites?.length || 0}</CardDescription>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 font-black border-emerald-100 border-2 py-2 px-8 rounded-full text-[10px] uppercase tracking-widest animate-in zoom-in">
                       Live Node Synchronization
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 pl-12 h-16 tracking-widest">Asset Profile</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest text-center">BOM Analysis</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right tracking-widest">Production cost</TableHead>
                                    <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right tracking-widest">Ready stock</TableHead>
                                    <TableHead className="text-right pr-12 font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest">Control</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black text-xs uppercase animate-pulse tracking-[0.5em]">Scanning Formula Vault...</TableCell></TableRow>
                                ) : (
                                    composites?.map(product => (
                                        <TableRow key={product.id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0 group h-24">
                                            <TableCell className="pl-12 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-900 text-base uppercase tracking-tight">{product.name}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 uppercase font-black mt-1">ID: {product.sku || '-'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <div className="inline-flex items-center gap-3 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100 shadow-inner">
                                                    <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                    <span className="font-black text-[10px] text-slate-600 uppercase tracking-widest">{product.total_components} Inputs</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-black text-slate-900 text-base tabular-nums">{(product.total_production_cost || 0).toLocaleString()}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">UGX Base</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-mono font-black text-sm text-slate-700 border-slate-200 bg-white px-4 py-2 rounded-xl shadow-sm">
                                                    {product.current_stock.toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-12">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 hover:bg-white shadow-sm transition-all border border-slate-50">
                                                            <MoreHorizontal size={24} className="text-slate-400" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-64 shadow-2xl border-none p-4 rounded-[1.5rem] bg-white">
                                                        <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest cursor-pointer rounded-xl mb-2 flex items-center gap-4 hover:bg-orange-50 hover:text-orange-600 transition-colors" onClick={() => { setSelectedProduct(product); setAssemblyDialogOpen(true); }}>
                                                            <Hammer className="h-5 w-5"/> Deploy assembly run
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest cursor-pointer rounded-xl mb-2 flex items-center gap-4 hover:bg-blue-50 hover:text-blue-600 transition-colors" onClick={() => { setSelectedProduct(product); setFormOpen(true); }}>
                                                            <Edit className="h-5 w-5"/> Modify formula dna
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-50 my-2" />
                                                        <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest text-red-600 cursor-pointer rounded-xl flex items-center gap-4 hover:bg-red-50 transition-colors" onClick={() => { setSelectedProduct(product); setDeleteConfirmOpen(true); }}>
                                                            <Trash2 className="h-5 w-5"/> Expunge ledger record
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Recipe Builder Modal Terminal */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-[1250px] h-[95vh] border-none shadow-2xl rounded-[3.5rem] overflow-hidden p-0 bg-white flex flex-col">
                    <div className="bg-slate-900 p-12 text-white flex justify-between items-center shrink-0">
                        <div className="flex items-center gap-8">
                            <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-[0_20px_50px_rgba(37,_99,_235,_0.3)]">
                                <Beaker className="text-white w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter">Formula Engineering Node</h2>
                                <p className="text-slate-500 text-[11px] font-black uppercase tracking-[0.5em] mt-2 flex items-center gap-3">
                                   <ShieldAlert size={14} className="text-blue-400" /> Sovereign Architecture • Data Encrypted
                                </p>
                            </div>
                        </div>
                        <Badge className="bg-blue-600 text-white font-black border-none px-8 py-3 text-[10px] tracking-[0.2em] uppercase rounded-full shadow-lg">Secure Interface Node</Badge>
                    </div>
                    {isLoadingDetails ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white gap-8">
                            <Loader2 className="h-16 w-16 animate-spin text-blue-600" />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.6em] animate-pulse">Decrypting Batch Configurations...</p>
                        </div>
                    ) : (
                        <CompositeProductForm 
                            initialData={selectedProduct ? (editingDetails || null) : null}
                            onSave={(data: any) => upsertMutation.mutate(data)} 
                            onCancel={() => setFormOpen(false)}
                            isSaving={upsertMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {isAssemblyDialogOpen && selectedProduct && (
                <AssemblyDialog product={selectedProduct} onClose={() => setAssemblyDialogOpen(false)} />
            )}

            {/* DELETE ALERT TERMINAL */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl bg-white p-0 overflow-hidden">
                    <div className="bg-red-600 p-12 text-white text-center">
                        <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-8 backdrop-blur-xl border border-white/20">
                           <AlertTriangle size={32} className="text-white" />
                        </div>
                        <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase">Expunge Recipe Ledger?</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-100 text-sm font-bold leading-loose mt-4 px-10 opacity-80 uppercase tracking-widest">
                            Warning: Removal of formula for <span className="underline italic">"{selectedProduct?.name}"</span> is irreversible. 
                            Active manufacturing cycles will be terminated.
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="bg-slate-50 p-10 flex justify-center gap-6 border-t border-slate-100">
                        <AlertDialogCancel className="font-black text-[10px] uppercase tracking-[0.3em] border-none bg-transparent text-slate-400 hover:text-slate-900 transition-all">Cancel Request</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-slate-900 text-white font-black px-12 h-14 rounded-2xl shadow-xl text-[10px] uppercase tracking-[0.3em] transition-all" onClick={() => deleteMutation.mutate(selectedProduct!.id)}>
                            {deleteMutation.isPending ? <Loader2 className="animate-spin h-4 w-4"/> : "Confirm Expunge"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Final System Verification Node */}
            <div className="text-center pb-20 opacity-40">
                <div className="inline-flex items-center gap-5 px-10 py-4 bg-white rounded-full shadow-sm border border-slate-100">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 italic">Global Architecture Infrastructure Node • Version 10.4.2 Verified</span>
                </div>
            </div>
        </div>
    );
}