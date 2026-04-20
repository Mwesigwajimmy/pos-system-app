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

// --- INTERFACES ---

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

// --- SUB-COMPONENT: RECIPE FORM ---

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
            toast.error("Material already added to recipe.");
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
        if (!name.trim()) return toast.error("Product name is required.");
        if (components.length === 0) return toast.error("Add at least one material to the recipe.");
        onSave({
            id: initialData?.id || null,
            name,
            sku,
            components: components.map(({ component_variant_id, quantity }) => ({ component_variant_id, quantity })),
        });
    };
    
    return (
        <div className="flex flex-col h-full bg-white">
            <ScrollArea className="flex-1 px-8 py-8">
                <div className="space-y-8">
                    {/* Basic Details Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Product Name</Label>
                            <Input className="h-11 border-slate-200 font-semibold" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Standard Batch Juice"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Product SKU / Code</Label>
                            <Input className="h-11 border-slate-200 font-mono" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g. BATCH-001" />
                        </div>
                    </div>

                    {/* Material Selection Section */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Add Recipe Materials</Label>
                            <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-600 border-blue-100 font-bold px-3">Inventory Sync Active</Badge>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-11 border-slate-200 bg-white font-medium text-slate-600">
                                            {selectedVariantId ? rawMaterials?.find((v) => v.value === selectedVariantId)?.label : "Search materials..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 shadow-xl border-slate-200 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search materials or SKU..." />
                                            <CommandList>
                                                <CommandEmpty className="p-4 text-xs text-slate-400 text-center">No materials found.</CommandEmpty>
                                                <ScrollArea className="h-64">
                                                    <CommandGroup>
                                                        {rawMaterials?.filter(v => !components.some(c => c.component_variant_id === v.value)).map((variant) => (
                                                            <CommandItem key={variant.value} value={variant.label} onSelect={() => { setSelectedVariantId(variant.value); setOpen(false); }} className="p-3 border-b border-slate-50 cursor-pointer">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-sm text-slate-900">{variant.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Landed Cost: {variant.cost_price.toLocaleString()} UGX</span>
                                                                </div>
                                                                <Check className={cn("ml-auto h-4 w-4 text-blue-600", selectedVariantId === variant.value ? "opacity-100" : "opacity-0")} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </ScrollArea>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="bg-slate-900 hover:bg-blue-700 text-white font-bold h-11 px-6 shadow-md rounded-xl transition-all">
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Material
                            </Button>
                        </div>
                    </div>

                    {/* BOM Table */}
                    <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm bg-white">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase h-12 px-6">Material Identity</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase h-12 text-right">Landed Cost</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase h-12 text-center w-[140px]">Quantity</TableHead>
                                    <TableHead className="text-[11px] font-bold text-slate-500 uppercase h-12 text-right px-6">Sub-total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-400 text-sm font-medium italic">Your recipe is currently empty.</TableCell></TableRow>
                                ) : (
                                    components.map(comp => (
                                        <TableRow key={comp.component_variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 h-20">
                                            <TableCell className="font-bold text-slate-900 px-6 py-4">
                                                {comp.component_name} <br/>
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-tight">Verified Raw Input</span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-semibold text-slate-600">{(comp.unit_cost || 0).toLocaleString()} <span className="text-[10px] ml-1">UGX</span></TableCell>
                                            <TableCell className="px-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 p-1">
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001" 
                                                        value={comp.quantity} 
                                                        onChange={e => setComponents(prev => prev.map(c => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                        className="h-8 border-none bg-transparent text-center font-bold text-sm focus-visible:ring-0" 
                                                    />
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase pr-2">{comp.uom_name || 'U'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex items-center justify-end gap-4">
                                                    <span className="font-bold text-slate-900">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setComponents(components.filter(i => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 p-0 rounded-lg">
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

            {/* Sticky Form Footer */}
            <div className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 rounded-b-3xl">
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Estimated Production Cost</p>
                    <div className="text-3xl font-bold mt-1 text-slate-900 tracking-tight">
                        {currentProductionCost.toLocaleString()} <span className="text-sm font-semibold text-slate-400 uppercase">UGX / Unit</span>
                    </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none border-slate-200 text-slate-600 font-bold">Discard Changes</Button>
                    <Button onClick={handleSubmit} disabled={isSaving} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 px-8 shadow-md rounded-xl">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} Commit Recipe
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
            toast.success(`Successfully manufactured ${quantity} units of ${product.name}`);
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Production Failed: ${err.message}`)
    });
    
    const canAssemble = recipe && recipe.components.every(c => (c.available_stock || 0) >= (c.quantity * quantity));

    const handleSubmit = () => {
        if (!sourceLocationId) return toast.error("Please select a manufacturing location.");
        assemblyMutation.mutate({
            p_composite_variant_id: product.id,
            p_quantity_to_assemble: quantity,
            p_source_location_id: sourceLocationId
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl border-none shadow-2xl rounded-3xl overflow-hidden p-0 bg-white">
                <div className="bg-slate-900 p-8 text-white">
                    <div className="flex items-center gap-5">
                        <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                            <Hammer className="text-white h-7 w-7" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold tracking-tight">Execute Manufacturing Run</DialogTitle>
                            <DialogDescription className="text-slate-400 font-medium text-xs mt-1 uppercase tracking-wider">Processing formula for: {product.name}</DialogDescription>
                        </div>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-white max-h-[60vh] overflow-y-auto">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Yield Quantity</Label>
                            <Input type="number" step="0.01" className="h-11 bg-white border-slate-200 font-bold text-lg focus:ring-blue-500" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Production Site</Label>
                            <Select onValueChange={setSourceLocationId}>
                                <SelectTrigger className="h-11 bg-white border-slate-200 font-semibold">
                                    <SelectValue placeholder="Select Branch..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {locations?.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {recipe && (
                        <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="border-none">
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 pl-6 h-12">Required Input</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-center h-12">Needed Qty</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right pr-6 h-12">Available Stock</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.components.map(c => {
                                        const required = c.quantity * quantity;
                                        const available = c.available_stock || 0;
                                        const hasEnough = available >= required;
                                        return (
                                            <TableRow key={c.component_variant_id} className={cn("border-b border-slate-100 last:border-0 h-16", !hasEnough && 'bg-red-50/50')}>
                                                <TableCell className="pl-6 font-bold text-slate-900 text-sm">{c.component_name}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-700">{required.toFixed(3)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {hasEnough 
                                                        ? <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 shadow-none px-3 font-bold text-[10px] uppercase">Sufficient ({available.toFixed(1)})</Badge> 
                                                        : <Badge className="bg-red-50 text-red-700 border-red-100 shadow-none px-3 font-bold text-[10px] uppercase">Shortage ({available.toFixed(1)})</Badge>
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

                <div className="bg-slate-50 p-8 flex justify-end items-center border-t border-slate-100 gap-4">
                    <Button variant="outline" onClick={onClose} className="font-bold border-slate-200 text-slate-500">Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!canAssemble || assemblyMutation.isPending || !sourceLocationId} 
                        className="bg-blue-600 hover:bg-blue-700 text-white h-12 px-10 font-bold rounded-xl shadow-lg shadow-blue-600/20 transition-all uppercase tracking-wide"
                    >
                        {assemblyMutation.isPending ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />} 
                        Confirm Production
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
            toast.success("Recipe configuration saved");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: Error) => toast.error(`Database Error: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComposite,
        onSuccess: () => {
            toast.success("Recipe successfully removed");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setDeleteConfirmOpen(false);
        }
    });

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700">
            
            {/* Header Section */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                        <Beaker className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recipe & Formula Registry</h1>
                        <div className="flex items-center gap-2 mt-1">
                           <ShieldCheck size={14} className="text-emerald-500" /> 
                           <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">BBU1 Manufacturing Standard Verified</span>
                        </div>
                    </div>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-600/20 rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Formula
                </Button>
            </div>

            {/* Insight Overview Nodes */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                   { label: 'Raw Material Isolation', icon: <Database size={18}/>, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Raw chemicals and inputs are logically separated from general inventory for precise tracking.' },
                   { label: 'Dynamic Costing', icon: <TrendingUp size={18}/>, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Landed production costs are calculated in real-time based on latest procurement vendor data.' },
                   { label: 'Perpetual Sync', icon: <ShieldCheck size={18}/>, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Inventory levels are automatically deducted across all sub-components upon production finalization.' }
                ].map((node, i) => (
                    <Card key={i} className="border-slate-200 shadow-sm bg-white p-6 rounded-2xl">
                        <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center mb-4", node.bg, node.color)}>
                            {node.icon}
                        </div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-900 mb-2">{node.label}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">{node.desc}</p>
                    </Card>
                ))}
            </div>

            {/* Main Registry Ledger */}
            <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Formula Registry Ledger</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-400 mt-1">Verified recipes currently active in the production cycle: {composites?.length || 0}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                       <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Live Database Sync Active</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 pl-8 h-14">Product Profile</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14 text-center">BOM Analysis</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14 text-right">Production Cost</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14 text-right">Available Stock</TableHead>
                                    <TableHead className="text-right pr-8 font-bold text-[11px] uppercase text-slate-500 h-14">Operations</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center py-20 text-slate-400 text-sm font-medium italic">Syncing formula records...</TableCell></TableRow>
                                ) : (
                                    composites?.map(product => (
                                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 h-20">
                                            <TableCell className="pl-8">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-base">{product.name}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase mt-0.5">{product.sku || 'NO SKU'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-center">
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold shadow-none px-3 py-1">
                                                    {product.total_components} Materials
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="font-bold text-slate-900 tabular-nums">{(product.total_production_cost || 0).toLocaleString()}</span>
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">UGX Base</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant="outline" className="font-mono font-bold text-sm text-slate-700 border-slate-200 bg-white px-4 py-1.5 rounded-xl">
                                                    {product.current_stock.toLocaleString()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-slate-400 hover:text-slate-900">
                                                            <MoreHorizontal size={20} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-slate-200 bg-white">
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-slate-600 focus:bg-orange-50 focus:text-orange-700 transition-colors" onClick={() => { setSelectedProduct(product); setAssemblyDialogOpen(true); }}>
                                                            <Hammer className="mr-3 h-4 w-4 opacity-70"/> Run Production
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-slate-600 focus:bg-slate-50 transition-colors" onClick={() => { setSelectedProduct(product); setFormOpen(true); }}>
                                                            <Edit className="mr-3 h-4 w-4 opacity-70"/> Modify Recipe
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-700 transition-colors" onClick={() => { setSelectedProduct(product); setDeleteConfirmOpen(true); }}>
                                                            <Trash2 className="mr-3 h-4 w-4 opacity-70"/> Expunge Recipe
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

            {/* Recipe Configuration Dialog */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-5xl h-[90vh] border-none shadow-2xl rounded-3xl overflow-hidden p-0 bg-white flex flex-col">
                    <div className="bg-slate-900 p-8 text-white">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Beaker className="text-white w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">Recipe Configuration Terminal</h2>
                                <p className="text-slate-400 text-[11px] font-bold uppercase tracking-widest mt-1">Sovereign Architecture • Manufacturing Node v10.4</p>
                            </div>
                        </div>
                    </div>
                    {isLoadingDetails ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Syncing recipe logic...</p>
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

            {/* DELETE ALERT DIALOG */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl p-0 overflow-hidden max-w-md">
                    <div className="bg-red-50 p-8 flex flex-col items-center text-center">
                        <div className="h-12 w-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-red-900">Expunge Recipe Record?</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-700 font-medium mt-2">
                            Warning: Deleting the recipe for <span className="font-bold underline">"{selectedProduct?.name}"</span> is irreversible. 
                            This formula will be removed from the manufacturing registry.
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="p-6 bg-white flex justify-center gap-3">
                        <AlertDialogCancel className="font-bold border-slate-200 h-11 px-6 rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-red-600/20 transition-all" onClick={() => deleteMutation.mutate(selectedProduct!.id)}>
                           {deleteMutation.isPending ? <Loader2 className="animate-spin h-4 w-4"/> : "Confirm Expunge"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Page Footer Status */}
            <div className="max-w-7xl mx-auto mt-12 flex items-center justify-center">
                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white border border-slate-200 rounded-full shadow-sm">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                        Infrastructure Node v10.4.2 Verified • Production Protocols Active
                    </span>
                </div>
            </div>
        </div>
    );
}