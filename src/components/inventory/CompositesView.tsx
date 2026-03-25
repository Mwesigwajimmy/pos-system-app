'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
    PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Hammer, Check, 
    ChevronsUpDown, CheckCircle2, ShieldCheck, TrendingUp, Calculator, Package, 
    Box, Globe, Activity, Info, Utensils, Beaker,
    Search, AlertTriangle, ArrowRight, Save, FileText
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

interface StandardVariantOption {
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

async function fetchStandardVariants(): Promise<StandardVariantOption[]> {
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, cost_price, products(name), units_of_measure(name)')
        .eq('is_composite', false);
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

function CompositeProductForm({ initialData, onSave, onCancel, isSaving }: { initialData: Partial<CompositeProductDetails> | null; onSave: (data: any) => void; onCancel: () => void; isSaving: boolean; }) {
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [components, setComponents] = useState<Component[]>(initialData?.components || []);
    const [open, setOpen] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

    const { data: standardVariants } = useQuery({ queryKey: ['standardVariants'], queryFn: fetchStandardVariants });
    
    const handleAddComponent = () => {
        if (!selectedVariantId) return;
        const variant = standardVariants?.find(v => v.value === selectedVariantId);
        if (!variant) return;

        if (components.some(c => c.component_variant_id === selectedVariantId)) {
            toast.error("Item already in recipe.");
            return;
        }

        setComponents(prev => [
            ...prev, 
            { component_variant_id: variant.value, component_name: variant.label, quantity: 1, unit_cost: variant.cost_price, uom_name: variant.uom_name }
        ]);
        setSelectedVariantId(null);
        setOpen(false);
    };
    
    const currentProductionCost = useMemo(() => {
        return components.reduce((sum, c) => sum + (c.quantity * (c.unit_cost || 0)), 0);
    }, [components]);

    const handleSubmit = () => {
        if (!name.trim()) return toast.error("Product name is required.");
        if (components.length === 0) return toast.error("Please add at least one ingredient.");
        onSave({
            id: initialData?.id || null,
            name,
            sku,
            components: components.map(({ component_variant_id, quantity }) => ({ component_variant_id, quantity })),
        });
    };
    
    return (
        <div className="space-y-6 p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase">Product Name</Label>
                    <Input className="bg-white h-10 border-slate-200" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Mixed Fruit Juice"/>
                </div>
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-slate-700 uppercase">SKU / ID</Label>
                    <Input className="bg-white font-mono uppercase h-10 border-slate-200" value={sku} onChange={e => setSku(e.target.value)} placeholder="Automatic if empty" />
                </div>
            </div>

            <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-700 uppercase">Add Ingredients</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-10 border-slate-200 bg-white">
                                    {selectedVariantId ? standardVariants?.find((v) => v.value === selectedVariantId)?.label : "Select raw material..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[450px] p-0 shadow-xl border-slate-200" align="start">
                                <Command>
                                    <CommandInput placeholder="Search name or SKU..." className="h-10" />
                                    <CommandList>
                                        <CommandEmpty>No products found.</CommandEmpty>
                                        <ScrollArea className="h-64">
                                            <CommandGroup>
                                                {standardVariants?.filter(v => !components.some(c => c.component_variant_id === v.value)).map((variant) => (
                                                    <CommandItem key={variant.value} value={variant.label} onSelect={() => { setSelectedVariantId(variant.value); setOpen(false); }} className="p-3 border-b border-slate-50 last:border-0">
                                                        <div className="flex flex-col flex-1">
                                                            <span className="font-semibold text-sm text-slate-800">{variant.label}</span>
                                                            <span className="text-[10px] text-slate-400 font-medium">Cost: {variant.cost_price.toLocaleString()} UGX</span>
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
                    <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="h-10 px-6 font-bold bg-slate-900 text-white shadow-sm">
                        Add Item
                    </Button>
                </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm bg-white">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 px-4">Ingredient</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-right">Unit Cost</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-center w-[130px]">Qty</TableHead>
                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-right px-4">Sub-total</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {components.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm italic">Add ingredients to start building the recipe.</TableCell></TableRow>
                        ) : (
                            components.map(comp => (
                                <TableRow key={comp.component_variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                                    <TableCell className="font-semibold text-slate-800 px-4 py-4">{comp.component_name}</TableCell>
                                    <TableCell className="text-right text-xs text-slate-500">{(comp.unit_cost || 0).toLocaleString()}</TableCell>
                                    <TableCell className="px-4">
                                        <div className="flex items-center gap-1 bg-white rounded-lg border border-slate-200 p-1">
                                            <Input 
                                                type="number" 
                                                step="0.01" 
                                                value={comp.quantity} 
                                                onChange={e => setComponents(prev => prev.map(c => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                className="h-7 border-none text-center font-bold text-xs p-0 focus-visible:ring-0" 
                                            />
                                            <span className="text-[10px] text-slate-400 font-bold uppercase pr-1">{comp.uom_name || 'U'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right px-4">
                                        <div className="flex items-center justify-end gap-3">
                                            <span className="font-bold text-slate-900 text-sm">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                            <Button variant="ghost" size="icon" onClick={() => setComponents(components.filter(i => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-500">
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

            <div className="p-6 bg-blue-600 text-white rounded-xl flex justify-between items-center shadow-lg">
                 <div className="space-y-1">
                    <p className="text-xs font-bold text-blue-100 uppercase tracking-widest">Total Production Cost</p>
                    <div className="text-3xl font-bold">
                        {currentProductionCost.toLocaleString()} <span className="text-xs font-medium text-blue-100">UGX / Unit</span>
                    </div>
                 </div>
                 <Button onClick={handleSubmit} disabled={isSaving} className="bg-white hover:bg-blue-50 text-blue-700 h-11 px-10 font-bold shadow-md rounded-lg">
                    {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>} Save Recipe
                 </Button>
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
            toast.success(`Production Finalized: ${quantity}x "${product.name}"`);
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Production Error: ${err.message}`)
    });
    
    const canAssemble = recipe && recipe.components.every(c => (c.available_stock || 0) >= (c.quantity * quantity));

    const handleSubmit = () => {
        if (!sourceLocationId) return toast.error("Please select a location.");
        assemblyMutation.mutate({
            p_composite_variant_id: product.id,
            p_quantity_to_assemble: quantity,
            p_source_location_id: sourceLocationId
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-2xl border-none shadow-2xl rounded-xl overflow-hidden p-0">
                <div className="bg-slate-900 p-8 text-white">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-bold flex items-center gap-3">
                            <Hammer className="text-blue-400" size={24} /> Assemble Product
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 text-sm">Converting raw materials into finished units of: {product.name}</DialogDescription>
                    </div>
                </div>

                <div className="p-8 space-y-8 bg-white">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Target Quantity</Label>
                            <Input type="number" step="0.01" className="h-10 bg-white font-bold border-slate-200" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase">Production Location</Label>
                            <Select onValueChange={setSourceLocationId}>
                                <SelectTrigger className="h-10 bg-white font-semibold border-slate-200">
                                    <div className="flex items-center gap-2"><Globe size={14} className="text-blue-500"/><SelectValue placeholder="Select Branch..." /></div>
                                </SelectTrigger>
                                <SelectContent>
                                    {locations?.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {recipe && (
                        <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50">
                                    <TableRow>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 pl-4 h-10">Component</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-center h-10">Needed</TableHead>
                                        <TableHead className="text-[10px] font-bold uppercase text-slate-500 text-right pr-4 h-10">Stock Check</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.components.map(c => {
                                        const required = c.quantity * quantity;
                                        const available = c.available_stock || 0;
                                        const hasEnough = available >= required;
                                        return (
                                            <TableRow key={c.component_variant_id} className={cn("border-b border-slate-100 last:border-0", !hasEnough && 'bg-red-50/50')}>
                                                <TableCell className="pl-4 font-semibold text-sm text-slate-800">{c.component_name}</TableCell>
                                                <TableCell className="text-center font-bold text-slate-700 text-xs">{required.toFixed(2)}</TableCell>
                                                <TableCell className="text-right pr-4">
                                                    {hasEnough 
                                                        ? <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-bold">OK ({available.toFixed(1)})</Badge> 
                                                        : <Badge variant="destructive" className="text-[10px] font-bold px-2">Low ({available.toFixed(1)})</Badge>
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

                <div className="bg-slate-50 p-6 flex justify-end items-center border-t border-slate-200 gap-3">
                    <Button variant="ghost" onClick={onClose} className="font-bold text-slate-500">Cancel</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!canAssemble || assemblyMutation.isPending || !sourceLocationId} 
                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 font-bold rounded-lg shadow-sm"
                    >
                        {assemblyMutation.isPending ? <Loader2 className="animate-spin h-4 w-4" /> : "Complete Assembly"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN COMPONENT ---

export default function CompositesManager() {
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
            toast.success("Recipe saved successfully");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComposite,
        onSuccess: () => {
            toast.success("Recipe deleted");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setDeleteConfirmOpen(false);
        }
    });

    const handleAssemble = (product: CompositeProduct) => {
        setSelectedProduct(product);
        setAssemblyDialogOpen(true);
    };

    const handleEdit = (product: CompositeProduct) => {
        setSelectedProduct(product);
        setFormOpen(true);
    };

    const handleDelete = (product: CompositeProduct) => {
        setSelectedProduct(product);
        setDeleteConfirmOpen(true);
    };

    return (
        <div className="flex-1 space-y-10 p-6 md:p-10 animate-in fade-in duration-500 pb-20">
            
            {/* HEADER */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-200 pb-8">
                <div className="space-y-1">
                    <div className="flex items-center gap-4">
                        <div className="p-2.5 bg-blue-600 rounded-lg shadow-sm">
                            <Beaker className="text-white w-7 h-7" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                            Recipe Management
                        </h1>
                    </div>
                    <p className="text-sm text-slate-500 font-medium ml-1">
                        Configure production recipes and track bill of materials.
                    </p>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-10 px-6 bg-blue-600 hover:bg-blue-700 font-bold shadow-sm text-white rounded-lg">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Recipe
                </Button>
            </div>

            {/* INFO CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-slate-200 shadow-sm bg-white p-5 rounded-xl border-t-4 border-t-blue-500">
                    <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Restaurant / Cafe</span>
                        <Utensils size={16} className="text-blue-500" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">Ingredients are automatically deducted from stock when the finished item is sold at the point of sale.</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white p-5 rounded-xl border-t-4 border-t-emerald-500">
                    <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Compounding</span>
                        <Beaker size={16} className="text-emerald-500" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">Supports high-precision decimal quantities for accurate dosage control in medical or chemical production.</p>
                    </CardContent>
                </Card>
                <Card className="border-slate-200 shadow-sm bg-white p-5 rounded-xl border-t-4 border-t-indigo-500">
                    <CardHeader className="p-0 pb-2 flex flex-row items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Traceability</span>
                        <CheckCircle2 size={16} className="text-indigo-500" />
                    </CardHeader>
                    <CardContent className="p-0">
                        <p className="text-xs text-slate-600 font-medium leading-relaxed">Every assembly action is logged for audit purposes to prevent inventory loss and ensure operational consistency.</p>
                    </CardContent>
                </Card>
            </div>

            {/* REGISTRY */}
            <Card className="border-slate-200 shadow-sm rounded-xl overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Product Recipes</CardTitle>
                            <CardDescription className="text-xs text-slate-500 mt-0.5">Total Registered Items: {composites?.length || 0}</CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-white text-emerald-600 border-emerald-100 font-bold">
                            Live Update
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 pl-8 h-12">Product Name</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-12">Details</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-12 text-right">Production Cost</TableHead>
                                <TableHead className="font-bold text-[10px] uppercase text-slate-500 h-12 text-right">Current Stock</TableHead>
                                <TableHead className="text-right pr-8 font-bold text-[10px] uppercase text-slate-500 h-12">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-48 text-center text-slate-400 font-medium italic">Loading recipe ledger...</TableCell></TableRow>
                            ) : (
                                composites?.map(product => (
                                    <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 group">
                                        <TableCell className="pl-8 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-900 text-sm">{product.name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">SKU: {product.sku || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Box size={14} className="text-slate-400" />
                                                <span className="font-semibold text-xs text-slate-600">{product.total_components} components</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-bold text-slate-800 text-sm">{(product.total_production_cost || 0).toLocaleString()}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase">UGX / Unit</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="font-mono font-bold text-slate-600 border-slate-200">
                                                {product.current_stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8">
                                                        <MoreHorizontal size={18} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48 shadow-xl border-slate-200 p-2">
                                                    <DropdownMenuItem className="p-2 font-semibold text-xs uppercase cursor-pointer" onClick={() => handleAssemble(product)}>
                                                        <Hammer className="mr-2 h-4 w-4 text-orange-500"/> Assemble
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="p-2 font-semibold text-xs uppercase cursor-pointer" onClick={() => handleEdit(product)}>
                                                        <Edit className="mr-2 h-4 w-4 text-blue-600"/> Edit Recipe
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="p-2 font-semibold text-xs uppercase text-red-600 cursor-pointer" onClick={() => handleDelete(product)}>
                                                        <Trash2 className="mr-2 h-4 w-4"/> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* RECIPE DIALOG */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-4xl border-none shadow-2xl rounded-xl overflow-hidden p-0 bg-white">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                        <div className="space-y-1">
                            <h2 className="text-xl font-bold flex items-center gap-3">
                                <Beaker className="text-blue-400" size={24} /> Recipe Manager
                            </h2>
                            <p className="text-slate-400 text-xs font-medium">Define production components and costs.</p>
                        </div>
                        <Badge className="bg-blue-600 text-white font-bold border-none px-3">BOM Builder</Badge>
                    </div>
                    {isLoadingDetails ? (
                        <div className="py-24 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-600" />
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-4">Loading details...</p>
                        </div>
                    ) : (
                        <CompositeProductForm 
                            initialData={selectedProduct ? (editingDetails || null) : null}
                            onSave={(data) => upsertMutation.mutate(data)} 
                            onCancel={() => setFormOpen(false)}
                            isSaving={upsertMutation.isPending}
                        />
                    )}
                </DialogContent>
            </Dialog>

            {isAssemblyDialogOpen && selectedProduct && (
                <AssemblyDialog product={selectedProduct} onClose={() => setAssemblyDialogOpen(false)} />
            )}

            {/* DELETE ALERT */}
            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-xl border-none shadow-2xl">
                    <AlertDialogHeader className="p-4 text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                           <AlertTriangle size={28} className="text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-xl font-bold text-slate-900">Delete Recipe?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500 text-sm leading-relaxed px-4">
                            You are about to remove the recipe for <span className="font-bold text-slate-900">"{selectedProduct?.name}"</span>. Stock for finished items will remain, but the automated ingredient deduction will stop.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 mt-4 flex justify-center gap-3">
                        <AlertDialogCancel className="font-bold border-none bg-transparent hover:bg-slate-100">Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-bold px-8 shadow-sm" onClick={() => deleteMutation.mutate(selectedProduct!.id)}>
                            {deleteMutation.isPending ? <Loader2 className="animate-spin"/> : "Confirm Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* FOOTER */}
            <div className="pt-10 border-t border-slate-100 text-center">
                <div className="flex items-center justify-center gap-3 text-[10px] font-bold uppercase tracking-widest text-slate-300">
                    <CheckCircle2 size={12} className="text-emerald-500"/> System Verified v10.2
                </div>
            </div>
        </div>
    );
}