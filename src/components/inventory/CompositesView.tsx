'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
    PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Hammer, Check, 
    ChevronsUpDown, Zap, ShieldCheck, TrendingUp, Calculator, Package, 
    Box, Globe, Activity, Info, UtensilsCrossed, FlaskConical, Fingerprint,
    Search, AlertTriangle, ArrowRight, Save
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

// Added missing delete API call
async function deleteComposite(id: number) {
    const { error } = await supabase.rpc('delete_composite_product_v2', { p_variant_id: id });
    if (error) throw error;
}

async function processAssembly(payload: { p_composite_variant_id: number, p_quantity_to_assemble: number, p_source_location_id: string }) {
    const { error } = await supabase.rpc('process_assembly_v5', payload);
    if (error) throw error;
}

// --- SUB-COMPONENT: RECIPE FORM (Economic Intelligence Edition) ---

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
            toast.warning("Component already in recipe.");
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
        if (components.length === 0) return toast.error("At least one ingredient is required.");
        onSave({
            id: initialData?.id || null,
            name,
            sku,
            components: components.map(({ component_variant_id, quantity }) => ({ component_variant_id, quantity })),
        });
    };
    
    return (
        <div className="space-y-6 p-6">
            <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-inner">
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">1. Composite Asset Name</Label>
                    <Input className="bg-white h-11 font-bold" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Hospital Grade Sanitizer"/>
                </div>
                <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest ml-1">SKU / DNA Hash</Label>
                    <Input className="bg-white font-mono uppercase h-11" value={sku} onChange={e => setSku(e.target.value)} placeholder="AUTO-GENERATE" />
                </div>
            </div>

            <div className="space-y-3">
                <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">2. Ingest Recipe Ingredients</Label>
                <div className="flex gap-2">
                    <div className="flex-1">
                        <Popover open={open} onOpenChange={setOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="w-full justify-between h-11 shadow-sm border-slate-200">
                                    {selectedVariantId ? standardVariants?.find((v) => v.value === selectedVariantId)?.label : "Search for Raw Materials..."}
                                    <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[500px] p-0 shadow-2xl border-none" align="start">
                                <Command>
                                    <CommandInput placeholder="Search SKU or Product Name..." className="h-12" />
                                    <CommandList>
                                        <CommandEmpty>No physical variants found.</CommandEmpty>
                                        <CommandGroup>
                                            {standardVariants?.filter(v => !components.some(c => c.component_variant_id === v.value)).map((variant) => (
                                                <CommandItem key={variant.value} value={variant.label} onSelect={() => { setSelectedVariantId(variant.value); setOpen(false); }}>
                                                    <div className="flex flex-col flex-1">
                                                        <span className="font-bold text-sm">{variant.label}</span>
                                                        <span className="text-[9px] text-muted-foreground uppercase font-mono tracking-tighter italic">Basis: {variant.cost_price.toLocaleString()} UGX // {variant.uom_name || 'Units'}</span>
                                                    </div>
                                                    <Check className={cn("ml-auto h-4 w-4 text-emerald-500", selectedVariantId === variant.value ? "opacity-100" : "opacity-0")} />
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    </CommandList>
                                </Command>
                            </PopoverContent>
                        </Popover>
                    </div>
                    <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="h-11 px-8 font-black bg-slate-900 text-white shadow-lg">INGEST</Button>
                </div>
            </div>

            <div className="border rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50">
                <Table>
                    <TableHeader className="bg-slate-50 border-b">
                        <TableRow>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest pl-6 h-12">Ingredient Asset</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-right h-12">Unit Cost</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-center w-[150px] h-12">Required Qty</TableHead>
                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-right pr-6 h-12">Financial Impact</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {components.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-300 font-black uppercase tracking-[0.3em] text-xs italic">Awaiting Component Handshake...</TableCell></TableRow>
                        ) : (
                            components.map(comp => (
                                <TableRow key={comp.component_variant_id} className="hover:bg-slate-50 transition-colors border-b last:border-0 group">
                                    <TableCell className="font-bold text-slate-900 pl-6 py-5">{comp.component_name}</TableCell>
                                    <TableCell className="text-right font-mono text-xs text-slate-400">{(comp.unit_cost || 0).toLocaleString()}</TableCell>
                                    <TableCell className="px-4">
                                        <div className="flex items-center gap-2 bg-white rounded-xl border p-1.5 shadow-sm group-hover:border-primary/30 transition-all">
                                            <Input 
                                                type="number" 
                                                step="0.0001" 
                                                value={comp.quantity} 
                                                onChange={e => setComponents(prev => prev.map(c => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                className="h-8 border-none text-center font-black text-xs focus-visible:ring-0" 
                                            />
                                            <span className="text-[9px] font-black text-slate-400 pr-2 uppercase">{comp.uom_name || 'U'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex items-center justify-end gap-4">
                                            <span className="font-black text-slate-900 font-mono text-sm">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                            <Button variant="ghost" size="icon" onClick={() => setComponents(components.filter(i => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full">
                                                <Trash2 size={14} />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <div className="p-8 bg-slate-950 text-white rounded-[2rem] flex justify-between items-center shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 p-8 opacity-5"><TrendingUp size={80}/></div>
                 <div className="space-y-1 relative z-10">
                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none">Aggregated Production Cost</p>
                    <div className="text-5xl font-black tracking-tighter uppercase">
                        {currentProductionCost.toLocaleString()} <span className="text-xs font-bold text-slate-600 tracking-normal">UGX / Unit</span>
                    </div>
                 </div>
                 <Button onClick={handleSubmit} disabled={isSaving} className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 h-14 px-12 font-black uppercase tracking-widest shadow-xl shadow-emerald-500/20 rounded-2xl relative z-10">
                    {isSaving ? <Loader2 className="animate-spin mr-2 h-5 w-5"/> : <ShieldCheck className="mr-2 h-5 w-5"/>} SEAL RECIPE
                 </Button>
            </div>
        </div>
    );
}

// --- SUB-COMPONENT: ASSEMBLY DIALOG (Multi-Branch Support) ---

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
            toast.success(`Production Confirmed: ${quantity}x "${product.name}"`, { icon: <ShieldCheck className="text-emerald-500" /> });
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Orchestrator Failure: ${err.message}`)
    });
    
    const canAssemble = recipe && recipe.components.every(c => (c.available_stock || 0) >= (c.quantity * quantity));

    const handleSubmit = () => {
        if (!sourceLocationId) return toast.error("Processing branch required.");
        assemblyMutation.mutate({
            p_composite_variant_id: product.id,
            p_quantity_to_assemble: quantity,
            p_source_location_id: sourceLocationId
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-3xl border-none shadow-2xl rounded-[2.5rem] overflow-hidden p-0">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center border-b border-white/5">
                    <div className="space-y-1">
                        <DialogTitle className="text-3xl font-black tracking-tighter flex items-center gap-3 uppercase italic">
                            <Hammer className="text-orange-500" size={28} /> ASSEMBLY COMMAND
                        </DialogTitle>
                        <DialogDescription className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Converting Raw Stock into Fiduciary Assets: {product.name}</DialogDescription>
                    </div>
                    <div className="p-3 bg-white/5 rounded-2xl border border-white/10"><Fingerprint className="text-emerald-500" size={24}/></div>
                </div>

                <div className="p-8 space-y-8">
                    <div className="grid grid-cols-2 gap-8 bg-slate-50 p-6 rounded-3xl border shadow-inner">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Target Yield Quantity</Label>
                            <Input type="number" step="0.0001" className="h-14 bg-white font-black text-2xl border-none shadow-sm" value={quantity} onChange={e => setQuantity(Number(e.target.value))} />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black uppercase text-slate-400 ml-1">Processing Branch / Lab</Label>
                            <Select onValueChange={setSourceLocationId}>
                                <SelectTrigger className="h-14 bg-white font-black border-none shadow-sm text-slate-700">
                                    <div className="flex items-center gap-2"><Globe size={16} className="text-primary"/><SelectValue placeholder="Select Location..." /></div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl shadow-2xl">
                                    {locations?.map(l => <SelectItem key={l.value} value={l.value} className="font-bold">{l.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {recipe && (
                        <div className="border rounded-2xl overflow-hidden shadow-sm">
                            <Table>
                                <TableHeader className="bg-slate-50/50">
                                    <TableRow className="hover:bg-transparent">
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest pl-6">Required Component</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-center">Needed</TableHead>
                                        <TableHead className="text-[9px] font-black uppercase tracking-widest text-right pr-6">Stock Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recipe.components.map(c => {
                                        const required = c.quantity * quantity;
                                        const available = c.available_stock || 0;
                                        const hasEnough = available >= required;
                                        return (
                                            <TableRow key={c.component_variant_id} className={cn("border-b last:border-0", !hasEnough && 'bg-red-50/50')}>
                                                <TableCell className="pl-6 font-bold text-slate-800">{c.component_name}</TableCell>
                                                <TableCell className="text-center font-mono font-black text-slate-900">{required.toFixed(3)}</TableCell>
                                                <TableCell className="text-right pr-6">
                                                    {hasEnough 
                                                        ? <Badge variant="outline" className="text-emerald-600 bg-emerald-50 border-emerald-200 font-black text-[9px]">AVAILABLE ({available.toFixed(2)})</Badge> 
                                                        : <Badge className="bg-red-600 border-none font-black text-[9px] animate-pulse">INSUFFICIENT ({available.toFixed(2)})</Badge>
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

                <div className="bg-slate-50 p-8 flex justify-between items-center border-t">
                    <Button variant="ghost" onClick={onClose} className="font-black uppercase tracking-widest text-[10px] text-slate-400 hover:text-red-600 transition-colors">ABORT_BUILD</Button>
                    <Button 
                        onClick={handleSubmit} 
                        disabled={!canAssemble || assemblyMutation.isPending || !sourceLocationId} 
                        className="bg-slate-950 text-white px-12 h-14 font-black shadow-2xl rounded-2xl hover:scale-105 transition-all"
                    >
                        {assemblyMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : "FINALIZE PRODUCTION"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN PAGE COMPONENT ---

export default function CompositesManager() {
    const queryClient = useQueryClient();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isAssemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<CompositeProduct | null>(null);

    const { data: composites, isLoading, isError, error } = useQuery({ queryKey: ['composites'], queryFn: fetchComposites });
    
    const { data: editingDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['compositeDetails', selectedProduct?.id],
        queryFn: () => fetchCompositeDetails(selectedProduct!.id),
        enabled: !!selectedProduct && isFormOpen,
    });

    const upsertMutation = useMutation({
        mutationFn: upsertComposite,
        onSuccess: () => {
            toast.success("Infrastructure Identity Sealed");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: Error) => toast.error(`Handshake Failure: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComposite,
        onSuccess: () => {
            toast.success("Recipe Purged from Ledger");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setDeleteConfirmOpen(false);
        }
    });

    // --- BUTTON HANDLERS ---
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
        <div className="flex-1 space-y-10 p-4 md:p-8 pt-6 animate-in fade-in duration-1000 pb-32">
            
            {/* MASTER HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 border-b pb-10">
                <div className="space-y-2">
                    <h1 className="text-5xl font-black tracking-tighter text-slate-900 uppercase italic flex items-center gap-4">
                        <Fingerprint className="text-primary w-12 h-12" />
                        Sourcing & Manufacturing
                    </h1>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest ml-1 opacity-70">
                        Autonomous Recipe Assembly & Bill of Materials Orchestrator Protocol v10.2.5
                    </p>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-16 px-10 bg-slate-950 font-black shadow-2xl hover:scale-105 transition-all text-white rounded-2xl">
                    <PlusCircle className="mr-3 h-6 w-6" /> NEW RECIPE
                </Button>
            </div>

            {/* INDUSTRY CONTEXT BANNERS */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="bg-blue-600 text-white border-none shadow-xl relative overflow-hidden rounded-[2rem] p-4">
                    <UtensilsCrossed size={80} className="absolute -right-4 -top-4 opacity-10 rotate-12" />
                    <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80">Restaurant / Cafe</CardTitle></CardHeader>
                    <CardContent><p className="text-sm font-bold leading-tight">Ingredients are autonomously deducted from warehouse levels the moment the POS Final Seal is triggered.</p></CardContent>
                </Card>
                <Card className="bg-emerald-600 text-white border-none shadow-xl relative overflow-hidden rounded-[2rem] p-4">
                    <FlaskConical size={80} className="absolute -right-4 -top-4 opacity-10 rotate-12" />
                    <CardHeader className="pb-2"><CardTitle className="text-[10px] font-black uppercase tracking-widest opacity-80">Medical Hub</CardTitle></CardHeader>
                    <CardContent><p className="text-sm font-bold leading-tight">High-precision chemical compounding with 4-decimal precision support for pharmaceutical dosage control.</p></CardContent>
                </Card>
                <Card className="bg-slate-900 text-white border-none shadow-xl relative overflow-hidden rounded-[2rem] p-4 border-l-4 border-l-primary">
                    <ShieldCheck size={80} className="absolute -right-4 -top-4 opacity-10 rotate-12" />
                    <CardHeader className="pb-2">
                        <CardTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Forensic Guard</CardTitle>
                    </CardHeader>
                    <CardContent><p className="text-sm font-bold leading-tight text-slate-300">Every assembly action is locked into the Sovereign Audit Log to prevent inventory leakage and staff theft.</p></CardContent>
                </Card>
            </div>

            {/* MAIN RECIPE REGISTRY */}
            <Card className="border-none shadow-2xl overflow-hidden rounded-3xl ring-1 ring-slate-100 bg-white/50 backdrop-blur-md">
                <CardHeader className="bg-slate-50/50 border-b p-8">
                    <div className="flex justify-between items-center">
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tight uppercase italic">Composite Asset Ledger</CardTitle>
                            <CardDescription className="text-xs font-bold uppercase text-slate-400">Total Registered Recipes: {composites?.length || 0}</CardDescription>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-600">Kernel Active</span>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-100/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] pl-10 h-14">Asset Identification</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14">Components</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right">Fiduciary Cost</TableHead>
                                <TableHead className="font-black text-[10px] uppercase tracking-[0.2em] h-14 text-right">Current Stock</TableHead>
                                <TableHead className="text-right pr-10 font-black text-[10px] uppercase tracking-[0.2em] h-14">Operational Logic</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 animate-pulse font-bold uppercase tracking-widest">Synchronizing Manufacturing Ledger...</TableCell></TableRow>
                            ) : (
                                composites?.map(product => (
                                    <TableRow key={product.id} className="hover:bg-blue-50/30 transition-all border-b group h-20">
                                        <TableCell className="pl-10">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-base tracking-tighter uppercase">{product.name}</span>
                                                <span className="text-[9px] font-mono text-slate-400 uppercase tracking-tighter">DNA: {product.sku || 'UNMAPPED'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-white transition-colors">
                                                    <Box size={14} className="text-slate-400 group-hover:text-primary" />
                                                </div>
                                                <span className="font-bold text-xs text-slate-600">{product.total_components} Materials</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-blue-700 font-mono text-sm">{(product.total_production_cost || 0).toLocaleString()}</span>
                                                <span className="text-[8px] font-bold text-slate-400 uppercase">Unit Basis (UGX)</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="font-mono font-black text-slate-900 border-slate-200 bg-white">
                                                {product.current_stock}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="hover:bg-white rounded-full shadow-sm">
                                                        <MoreHorizontal size={20} />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-64 shadow-2xl border-slate-200 rounded-2xl p-2 animate-in slide-in-from-top-2">
                                                    <DropdownMenuItem className="p-4 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 cursor-pointer" onClick={() => handleAssemble(product)}>
                                                        <Hammer className="mr-3 h-5 w-5 text-orange-500"/> Assemble Units
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="p-4 font-black text-xs uppercase tracking-widest rounded-xl hover:bg-slate-50 cursor-pointer" onClick={() => handleEdit(product)}>
                                                        <Edit className="mr-3 h-5 w-5 text-blue-500"/> Edit Recipe
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="my-2" />
                                                    <DropdownMenuItem className="p-4 font-black text-xs uppercase tracking-widest text-red-600 rounded-xl hover:bg-red-50 cursor-pointer" onClick={() => handleDelete(product)}>
                                                        <Trash2 className="mr-3 h-5 w-5"/> Purge Recipe
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

            {/* --- MASTER ORCHESTRATION DIALOGS --- */}

            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-5xl border-none shadow-2xl rounded-[3rem] overflow-hidden p-0 bg-white">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center border-b border-white/5">
                        <div className="space-y-1">
                            <h2 className="text-3xl font-black tracking-tighter uppercase italic flex items-center gap-3">
                                <Zap className="text-primary fill-primary animate-pulse" size={28} /> RECIPE WIZARD
                            </h2>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest leading-none">Kernel Protocol v10.2.5 // Sourcing Strategy</p>
                        </div>
                        <Badge className="bg-primary text-slate-950 font-black rounded-lg">BOM BUILDER</Badge>
                    </div>
                    {isLoadingDetails ? (
                        <div className="py-24 text-center space-y-4">
                            <Loader2 className="h-12 w-12 animate-spin mx-auto text-slate-200" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Deciphering Neural Recipe...</p>
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

            <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl">
                    <AlertDialogHeader className="p-4 text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-100">
                           <AlertTriangle size={32} className="text-red-500" />
                        </div>
                        <AlertDialogTitle className="text-3xl font-black tracking-tighter uppercase italic">Purge Fiduciary Data?</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-500 text-sm leading-relaxed px-4">
                            This action will permanently destroy the recipe link for <span className="font-black text-slate-900 italic underline">"{selectedProduct?.name}"</span>. Finished good stock will remain, but the autonomous ingredient deduction protocol will be severed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="bg-slate-50 p-8 -mx-6 -mb-6 rounded-b-[2.5rem] mt-4 flex sm:justify-center gap-4">
                        <AlertDialogCancel className="font-black uppercase text-xs tracking-widest border-none bg-transparent hover:bg-slate-100 px-8">ABORT</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-black px-10 h-12 shadow-xl shadow-red-200 uppercase tracking-widest text-xs" onClick={() => deleteMutation.mutate(selectedProduct!.id)}>
                            {deleteMutation.isPending ? <Loader2 className="animate-spin"/> : "CONFIRM PURGE"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* FIDUCIARY AUDIT FOOTER */}
            <div className="flex flex-col items-center gap-4 pt-10 border-t border-slate-100 opacity-40">
                <div className="flex items-center gap-4 text-[9px] font-black uppercase tracking-[0.5em] text-slate-500">
                    <ShieldCheck size={12}/> Transaction Integrity Sealed by Sovereign Kernel v10.2
                    <Fingerprint size={12}/>
                </div>
            </div>
        </div>
    );
}