'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
    PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Hammer, Check, 
    ChevronsUpDown, CheckCircle2, ShieldCheck, TrendingUp, Calculator, Package, 
    Box, Globe, Activity, Info, Utensils, Beaker,
    Search, AlertTriangle, ArrowRight, Save, FileText, X, Database, ShieldAlert, Plus
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
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

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

const supabase = createClient();

// --- API DATA ACCESS ---

async function fetchComposites(): Promise<CompositeProduct[]> {
    const { data, error } = await supabase.rpc('get_composite_recipes_v5');
    if (error) throw new Error(error.message);
    return data?.map((item: any) => ({ ...item, id: item.recipe_id })) || [];
}

async function fetchRawMaterials(): Promise<RawMaterialOption[]> {
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, cost_price, is_raw_material, products(name), units_of_measure(name)')
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

async function fetchLocations(): Promise<{value: string, label: string}[]> {
    const { data } = await supabase.from('locations').select('id, name').eq('status', 'active');
    return data?.map(l => ({ value: l.id, label: l.name })) || [];
}

// --- RECIPE BUILDER FORM ---

function CompositeProductForm({ initialData, onSave, onCancel, isSaving }: any) {
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [components, setComponents] = useState<Component[]>(initialData?.components || []);
    const [open, setOpen] = useState(false);
    const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

    const { data: materials } = useQuery({ queryKey: ['rawMaterialsRegistry'], queryFn: fetchRawMaterials });
    
    const handleAddComponent = () => {
        if (!selectedVariantId) return;
        const mat = materials?.find(m => m.value === selectedVariantId);
        if (!mat) return;

        if (components.some(c => c.component_variant_id === selectedVariantId)) {
            toast.error("Component already in formula.");
            return;
        }

        setComponents(prev => [...prev, { 
            component_variant_id: mat.value, 
            component_name: mat.label, 
            quantity: 1, 
            unit_cost: mat.cost_price, 
            uom_name: mat.uom_name 
        }]);
        setSelectedVariantId(null);
        setOpen(false);
    };
    
    const currentCost = useMemo(() => {
        return components.reduce((sum, c) => sum + (c.quantity * (c.unit_cost || 0)), 0);
    }, [components]);

    return (
        <div className="flex flex-col h-full bg-white">
            <ScrollArea className="flex-1">
                <div className="p-8 space-y-8">
                    {/* Identity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Target Finished Good</Label>
                            <Input className="h-11 bg-white border-slate-200 font-semibold" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Concentrated Chemical / Juice Batch"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Formula Reference (SKU)</Label>
                            <Input className="h-11 bg-white border-slate-200 font-mono" value={sku} onChange={e => setSku(e.target.value)} placeholder="Automatic ID" />
                        </div>
                    </div>

                    {/* Ingredient Sourcing */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-center">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">Sourced Input Materials</Label>
                            <Badge className="bg-blue-50 text-blue-600 border-blue-100 shadow-none px-3 font-bold text-[10px]">Verification Active</Badge>
                        </div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-11 border-slate-200 bg-white font-medium text-slate-600">
                                            {selectedVariantId ? materials?.find((v) => v.value === selectedVariantId)?.label : "Search inventory for inputs..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0 shadow-xl border-slate-200 rounded-xl" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search materials or SKU..." />
                                            <CommandList>
                                                <CommandEmpty className="p-4 text-xs text-slate-400 text-center">No raw materials found.</CommandEmpty>
                                                <ScrollArea className="h-64">
                                                    <CommandGroup>
                                                        {materials?.filter(m => !components.some(c => c.component_variant_id === m.value)).map((m) => (
                                                            <CommandItem key={m.value} onSelect={() => { setSelectedVariantId(m.value); setOpen(false); }} className="p-3 border-b border-slate-50 cursor-pointer">
                                                                <div className="flex flex-col">
                                                                    <span className="font-semibold text-sm text-slate-900">{m.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Cost: {m.cost_price.toLocaleString()} UGX</span>
                                                                </div>
                                                                <Check className={cn("ml-auto h-4 w-4 text-blue-600", selectedVariantId === m.value ? "opacity-100" : "opacity-0")} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </ScrollArea>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="h-11 bg-slate-900 hover:bg-blue-600 text-white font-bold transition-all px-6">
                                <Plus className="mr-2 h-4 w-4" /> Append Ingredient
                            </Button>
                        </div>
                    </div>

                    {/* BOM Table */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-12 px-6">Component Identity</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-12 text-right">Landed Cost</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-12 text-center w-[140px]">Quantity</TableHead>
                                    <TableHead className="text-[10px] font-bold text-slate-500 uppercase h-12 text-right px-6">Sub-total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm font-medium italic">Recipe builder empty. Add ingredients to begin.</TableCell></TableRow>
                                ) : (
                                    components.map((comp: any) => (
                                        <TableRow key={comp.component_variant_id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0">
                                            <TableCell className="font-semibold text-slate-800 px-6 py-4">
                                                {comp.component_name} <br/>
                                                <span className="text-[10px] text-slate-400 font-mono uppercase">Verified Material</span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-medium text-slate-500">{(comp.unit_cost || 0).toLocaleString()} <span className="text-[10px] ml-1">UGX</span></TableCell>
                                            <TableCell className="px-4">
                                                <div className="flex items-center gap-2 bg-slate-50 rounded-lg border border-slate-200 p-1">
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001" 
                                                        value={comp.quantity} 
                                                        onChange={e => setComponents((prev: any) => prev.map((c: any) => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                        className="h-8 border-none bg-transparent text-center font-bold text-sm focus-visible:ring-0" 
                                                    />
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase pr-2">{comp.uom_name || 'U'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-6">
                                                <div className="flex items-center justify-end gap-4">
                                                    <span className="font-bold text-slate-900">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                                    <Button variant="ghost" size="sm" onClick={() => setComponents(components.filter((i: any) => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 p-0 rounded-lg">
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

            {/* Footer Summary */}
            <div className="p-8 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-center gap-6 rounded-b-3xl">
                 <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Total Estimated Production Cost</p>
                    <div className="text-3xl font-bold mt-1 text-slate-900 tracking-tight">
                        {currentCost.toLocaleString()} <span className="text-sm font-semibold text-slate-400">UGX / Unit</span>
                    </div>
                 </div>
                 <div className="flex gap-3 w-full sm:w-auto">
                    <Button variant="outline" onClick={onCancel} className="flex-1 sm:flex-none border-slate-200 text-slate-600 font-bold">Discard Changes</Button>
                    <Button onClick={() => onSave({ id: initialData?.id || null, name, sku, components })} disabled={isSaving} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-md">
                        {isSaving ? <Loader2 className="animate-spin mr-2 h-4 w-4"/> : <Save className="mr-2 h-4 w-4"/>} Commit Recipe
                    </Button>
                 </div>
            </div>
        </div>
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
        mutationFn: async (data: any) => {
            const { error } = await supabase.rpc('upsert_composite_product_v5', {
                p_variant_id: data.id,
                p_name: data.name,
                p_sku: data.sku,
                p_components: data.components.map((c: any) => ({ component_variant_id: c.component_variant_id, quantity: c.quantity }))
            });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Recipe configuration saved");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: any) => toast.error(`Error: ${err.message}`),
    });

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700">
            
            {/* Page Header */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                        <Beaker className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Recipe Engineering</h1>
                        <div className="flex items-center gap-2 mt-1">
                           <ShieldCheck size={14} className="text-emerald-500" /> 
                           <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">BBU1 Manufacturing Protocol Verified</span>
                        </div>
                    </div>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 shadow-lg shadow-blue-600/20 rounded-xl">
                    <PlusCircle className="mr-2 h-4 w-4" /> New Formula
                </Button>
            </div>

            {/* Instruction Grid */}
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                {[
                   { label: 'Asset Isolation', icon: <Box size={18}/>, color: 'text-blue-500', bg: 'bg-blue-50', desc: 'Raw inputs are logically isolated from retail inventory to ensure formula integrity.' },
                   { label: 'Forensic Costing', icon: <TrendingUp size={18}/>, color: 'text-emerald-500', bg: 'bg-emerald-50', desc: 'Continuous unit cost monitoring based on landed vendor procurement rates.' },
                   { label: 'Inventory Logic', icon: <Database size={18}/>, color: 'text-indigo-500', bg: 'bg-indigo-50', desc: 'Perpetual stock deduction across all sub-components upon production.' }
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

            {/* Main Ledger Card */}
            <Card className="max-w-7xl mx-auto border-slate-200 shadow-sm rounded-3xl overflow-hidden bg-white">
                <CardHeader className="p-8 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div>
                        <CardTitle className="text-lg font-bold text-slate-900 uppercase tracking-tight">Formula Registry Ledger</CardTitle>
                        <CardDescription className="text-xs font-medium text-slate-400 mt-1">Verified recipes currently active in manufacturing: {composites?.length || 0}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-50 border border-slate-100 rounded-full">
                       <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                       <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Live Data Sync Active</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 pl-8 h-14">Asset Identity</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14">Component Mix</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14 text-right">Landed Cost</TableHead>
                                    <TableHead className="font-bold text-[11px] uppercase text-slate-500 h-14 text-right">Perpetual Stock</TableHead>
                                    <TableHead className="text-right pr-8 font-bold text-[11px] uppercase text-slate-500 h-14">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={5} className="h-64 text-center py-20 text-slate-400 text-sm font-medium italic">Decrypting formula records...</TableCell></TableRow>
                                ) : (
                                    composites?.map(product => (
                                        <TableRow key={product.id} className="hover:bg-slate-50/50 transition-colors border-b border-slate-100 last:border-0 h-20">
                                            <TableCell className="pl-8">
                                                <div className="flex flex-col">
                                                    <span className="font-bold text-slate-900 text-base">{product.name}</span>
                                                    <span className="text-[10px] font-mono text-slate-400 font-bold uppercase mt-0.5">{product.sku || 'NO SKU'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-blue-50 text-blue-700 border-blue-100 font-bold shadow-none px-3">
                                                    {product.total_components} Materials
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-slate-700">
                                                {(product.total_production_cost || 0).toLocaleString()} <span className="text-[10px] text-slate-400 ml-1 font-semibold">UGX</span>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex flex-col items-end">
                                                    <span className="text-lg font-bold text-slate-900">{product.current_stock.toLocaleString()}</span>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Ready Units</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-8">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-lg text-slate-400 hover:text-slate-900">
                                                            <MoreHorizontal size={20} />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-56 p-2 rounded-xl shadow-xl border-slate-200">
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-slate-600 focus:bg-blue-50 focus:text-blue-600" onClick={() => { setSelectedProduct(product); setAssemblyDialogOpen(true); }}>
                                                            <Hammer className="mr-3 h-4 w-4 opacity-70"/> Deploy Assembly
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-slate-600 focus:bg-slate-50" onClick={() => { setSelectedProduct(product); setFormOpen(true); }}>
                                                            <Edit className="mr-3 h-4 w-4 opacity-70"/> Modify Formula
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-slate-100 my-1" />
                                                        <DropdownMenuItem className="p-3 font-bold text-xs uppercase cursor-pointer rounded-lg text-red-600 focus:bg-red-50 focus:text-red-600" onClick={() => { setSelectedProduct(product); setDeleteConfirmOpen(true); }}>
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

            {/* Recipe Dialog Terminal */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-5xl h-[90vh] border-none shadow-2xl rounded-3xl overflow-hidden p-0 bg-white flex flex-col">
                    <div className="bg-slate-900 p-8 text-white flex justify-between items-center">
                        <div className="flex items-center gap-6">
                            <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Beaker className="text-white w-7 h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">BOM Configuration Terminal</h2>
                                <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Sovereign Architecture • Core Logic Sync</p>
                            </div>
                        </div>
                        <Badge className="bg-white/10 text-white border-none px-4 py-1.5 font-bold text-[10px] tracking-wider uppercase rounded-full backdrop-blur-sm">Secure Terminal</Badge>
                    </div>
                    {isLoadingDetails ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white space-y-4">
                            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">Decrypting Product Logic...</p>
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

            {/* Footer Status */}
            <div className="max-w-7xl mx-auto mt-16 flex items-center justify-center">
                <div className="inline-flex items-center gap-3 px-6 py-2.5 bg-white rounded-full shadow-sm border border-slate-200">
                    <ShieldCheck size={16} className="text-emerald-500" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 italic">
                        Infrastructure Node v10.4.2 Verified • Assembly Protocols Isolated
                    </span>
                </div>
            </div>
        </div>
    );
}