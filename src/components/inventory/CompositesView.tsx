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
    // CRITICAL: Fetching only verified Raw Materials to prevent data confusion
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
            <ScrollArea className="flex-1 max-h-[70vh]">
                <div className="p-10 space-y-10">
                    {/* Identity Section */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Finished Good</Label>
                            <Input className="h-12 font-black border-slate-100 bg-white rounded-xl shadow-sm" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Concentrated Chemical / Juice Batch"/>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formula Reference (SKU)</Label>
                            <Input className="h-12 font-mono uppercase border-slate-100 bg-white rounded-xl shadow-sm" value={sku} onChange={e => setSku(e.target.value)} placeholder="Automatic ID" />
                        </div>
                    </div>

                    {/* Ingredient Sourcing */}
                    <div className="space-y-4">
                        <div className="flex justify-between items-end">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sourced Input Materials</Label>
                            <Badge variant="outline" className="font-black text-[9px] text-blue-600 bg-blue-50 border-blue-100 px-3">Raw Materials Filter Active</Badge>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex-1">
                                <Popover open={open} onOpenChange={setOpen}>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className="w-full justify-between h-14 border-slate-200 bg-white rounded-2xl shadow-sm font-bold">
                                            {selectedVariantId ? materials?.find((v) => v.value === selectedVariantId)?.label : "Search inventory for inputs..."}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[500px] p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden" align="start">
                                        <Command>
                                            <CommandInput placeholder="Search materials or SKU..." className="h-12" />
                                            <CommandList>
                                                <CommandEmpty className="p-4 text-[10px] font-black text-slate-400 uppercase text-center">No raw materials found.</CommandEmpty>
                                                <ScrollArea className="h-72">
                                                    <CommandGroup>
                                                        {materials?.filter(m => !components.some(c => c.component_variant_id === m.value)).map((m) => (
                                                            <CommandItem key={m.value} onSelect={() => { setSelectedVariantId(m.value); setOpen(false); }} className="p-4 border-b border-slate-50 cursor-pointer">
                                                                <div className="flex flex-col flex-1">
                                                                    <span className="font-black text-sm text-slate-900 tracking-tight">{m.label}</span>
                                                                    <span className="text-[10px] text-slate-400 font-black uppercase mt-1">Landed Cost: {m.cost_price.toLocaleString()} UGX</span>
                                                                </div>
                                                                <Check className={cn("ml-auto h-5 w-5 text-blue-600", selectedVariantId === m.value ? "opacity-100" : "opacity-0")} />
                                                            </CommandItem>
                                                        ))}
                                                    </CommandGroup>
                                                </ScrollArea>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleAddComponent} disabled={!selectedVariantId} className="h-14 px-10 font-black bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-blue-600 transition-all uppercase text-xs tracking-widest">
                                Append Ingredient
                            </Button>
                        </div>
                    </div>

                    {/* BOM Table */}
                    <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-slate-50/20">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow className="border-none">
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 px-8 tracking-widest">Component DNA</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-right">Landed Unit Cost</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-center w-[160px]">Formula Qty</TableHead>
                                    <TableHead className="text-[9px] font-black text-slate-400 uppercase h-14 text-right px-8 tracking-widest">Sub-total</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {components.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} className="h-48 text-center text-slate-300 text-xs font-black uppercase tracking-widest italic">Recipe Builder Empty. Sourcing Required.</TableCell></TableRow>
                                ) : (
                                    components.map((comp: any, idx: number) => (
                                        <TableRow key={comp.component_variant_id} className="hover:bg-white transition-all border-b border-slate-50 last:border-0 group">
                                            <TableCell className="font-black text-slate-800 px-8 py-6 text-sm">
                                                {comp.component_name} <br/>
                                                <span className="text-[9px] text-slate-400 font-mono font-medium">Input Verified</span>
                                            </TableCell>
                                            <TableCell className="text-right text-xs font-bold text-slate-500">{(comp.unit_cost || 0).toLocaleString()}</TableCell>
                                            <TableCell className="px-6">
                                                <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-100 p-2 shadow-inner">
                                                    <Input 
                                                        type="number" 
                                                        step="0.0001" 
                                                        value={comp.quantity} 
                                                        onChange={e => setComponents((prev: any) => prev.map((c: any) => c.component_variant_id === comp.component_variant_id ? { ...c, quantity: Number(e.target.value) } : c))} 
                                                        className="h-8 border-none text-center font-black text-sm p-0 focus-visible:ring-0 tabular-nums" 
                                                    />
                                                    <span className="text-[10px] text-slate-300 font-black uppercase pr-1">{comp.uom_name || 'U'}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right px-8">
                                                <div className="flex items-center justify-end gap-5">
                                                    <span className="font-black text-slate-900 text-base tabular-nums">{((comp.unit_cost || 0) * comp.quantity).toLocaleString()}</span>
                                                    <Button variant="ghost" size="icon" onClick={() => setComponents(components.filter((i: any) => i.component_variant_id !== comp.component_variant_id))} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
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

            {/* Footer Cost Control */}
            <div className="p-10 bg-slate-900 rounded-b-[2rem] flex flex-col sm:flex-row justify-between items-center gap-6 text-white shadow-2xl relative overflow-hidden">
                 <div className="absolute top-0 right-0 opacity-5 pointer-events-none">
                    <TrendingUp size={200} />
                 </div>
                 <div className="text-center sm:text-left relative z-10">
                    <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.3em]">Estimated Production Cost</p>
                    <div className="text-4xl font-black mt-1 tabular-nums tracking-tighter">
                        {currentCost.toLocaleString()} <span className="text-sm font-bold opacity-30 uppercase">UGX / unit</span>
                    </div>
                 </div>
                 <div className="flex gap-4 w-full sm:w-auto relative z-10">
                    <Button variant="ghost" onClick={onCancel} className="flex-1 sm:flex-none text-slate-400 hover:text-white font-black uppercase text-[10px] tracking-widest">Discard</Button>
                    <Button onClick={() => onSave({ id: initialData?.id || null, name, sku, components })} disabled={isSaving} className="flex-1 sm:flex-none bg-blue-600 hover:bg-blue-500 text-white font-black h-14 px-12 rounded-2xl shadow-xl uppercase text-xs tracking-widest transition-all">
                        {isSaving ? <Loader2 className="animate-spin mr-3 h-5 w-5"/> : <Save className="mr-3 h-5 w-5"/>} Commit Recipe
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
            toast.success("BOM Registry Synced");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: any) => toast.error(`Sync Error: ${err.message}`),
    });

    return (
        <div className="flex-1 space-y-12 p-8 md:p-12 animate-in fade-in duration-1000 pb-32">
            
            {/* Header: Enterprise Control */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-slate-200 pb-10">
                <div className="flex items-center gap-6">
                    <div className="p-4 bg-slate-900 rounded-[1.5rem] shadow-2xl text-white">
                        <Beaker className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black tracking-tighter text-slate-900">Recipe Engineering</h1>
                        <p className="text-[11px] text-slate-400 font-black uppercase tracking-[0.4em] mt-1.5 flex items-center gap-2">
                           <ShieldCheck size={14} className="text-emerald-500" /> BBU1 Manufacturing Protocol
                        </p>
                    </div>
                </div>
                <Button onClick={() => { setSelectedProduct(null); setFormOpen(true); }} className="h-14 px-10 bg-blue-600 hover:bg-slate-900 text-white font-black text-xs uppercase tracking-[0.2em] shadow-2xl rounded-2xl transition-all gap-3">
                    <PlusCircle size={18} /> New Formula
                </Button>
            </div>

            {/* Logical Instruction Nodes */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {[
                   { label: 'Chemical Isolation', icon: <Beaker size={20}/>, color: 'text-blue-500', desc: 'Raw inputs are isolated from retail assets to prevent recipe contamination.' },
                   { label: 'Precision Audit', icon: <TrendingUp size={20}/>, color: 'text-emerald-500', desc: 'Real-time landed cost analysis against target market retail prices.' },
                   { label: 'Neural Sync', icon: <Database size={20}/>, color: 'text-indigo-500', desc: 'Perpetual inventory deduction active upon manufacturing run finalization.' }
                ].map((node, i) => (
                    <Card key={i} className="border-none shadow-xl bg-white p-8 rounded-[2rem] group hover:-translate-y-1 transition-all duration-500">
                        <div className={cn("h-12 w-12 rounded-2xl bg-slate-50 flex items-center justify-center mb-6", node.color)}>
                            {node.icon}
                        </div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-2">{node.label}</h4>
                        <p className="text-xs text-slate-500 leading-loose font-medium opacity-80">{node.desc}</p>
                    </Card>
                ))}
            </div>

            {/* Formula Registry Ledger */}
            <Card className="border-none shadow-[0_40px_100px_-20px_rgba(0,0,0,0.1)] rounded-[3rem] overflow-hidden bg-white">
                <CardHeader className="bg-slate-50/50 border-b p-10 flex flex-col sm:flex-row justify-between items-center gap-6">
                    <div>
                        <CardTitle className="text-xl font-black text-slate-900 tracking-tighter uppercase">Product Ledger</CardTitle>
                        <CardDescription className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1.5">Verified BOM Count: {composites?.length || 0}</CardDescription>
                    </div>
                    <Badge className="bg-emerald-50 text-emerald-600 font-black border-emerald-100 border-2 py-1.5 px-6 rounded-full text-[10px] uppercase tracking-widest">
                       Live Node Syncing
                    </Badge>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow className="border-none">
                                <TableHead className="font-black text-[10px] uppercase text-slate-400 pl-10 h-16 tracking-widest">Asset Identity</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest">Logic Detail</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right tracking-widest">Landed Cost</TableHead>
                                <TableHead className="font-black text-[10px] uppercase text-slate-400 h-16 text-right tracking-widest">Current Stock</TableHead>
                                <TableHead className="text-right pr-10 font-black text-[10px] uppercase text-slate-400 h-16 tracking-widest">Control</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={5} className="h-64 text-center text-slate-300 font-black text-xs uppercase animate-pulse">Scanning Formula Records...</TableCell></TableRow>
                            ) : (
                                composites?.map(product => (
                                    <TableRow key={product.id} className="hover:bg-blue-50/20 transition-all border-b border-slate-50 last:border-0 group h-24">
                                        <TableCell className="pl-10 py-6">
                                            <div className="flex flex-col">
                                                <span className="font-black text-slate-900 text-base tracking-tight">{product.name}</span>
                                                <span className="text-[10px] font-mono text-slate-400 uppercase font-black mt-1">ID: {product.sku || '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                                                <span className="font-black text-xs text-slate-600 uppercase tracking-widest">{product.total_components} Components</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-col items-end">
                                                <span className="font-black text-slate-900 text-base tabular-nums">{(product.total_production_cost || 0).toLocaleString()}</span>
                                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">UGX Base</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Badge variant="outline" className="font-mono font-black text-sm text-slate-700 border-slate-200 bg-white px-4 py-1.5 rounded-xl">
                                                {product.current_stock.toLocaleString()}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right pr-10">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="rounded-2xl h-12 w-12 hover:bg-white shadow-sm transition-all">
                                                        <MoreHorizontal size={24} className="text-slate-400" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-64 shadow-2xl border-none p-3 rounded-2xl bg-white">
                                                    <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest cursor-pointer rounded-xl mb-1 flex items-center gap-3" onClick={() => { setSelectedProduct(product); setAssemblyDialogOpen(true); }}>
                                                        <Hammer className="h-4 w-4 text-orange-500"/> Deploy Assembly
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest cursor-pointer rounded-xl mb-1 flex items-center gap-3" onClick={() => { setSelectedProduct(product); setFormOpen(true); }}>
                                                        <Edit className="h-4 w-4 text-blue-600"/> Modify Formula
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator className="bg-slate-50 my-2" />
                                                    <DropdownMenuItem className="p-4 font-black text-[10px] uppercase tracking-widest text-red-600 cursor-pointer rounded-xl flex items-center gap-3" onClick={() => { setSelectedProduct(product); setDeleteConfirmOpen(true); }}>
                                                        <Trash2 className="h-4 w-4"/> Expunge Record
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

            {/* Recipe Dialog Terminal */}
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="max-w-[1200px] h-[95vh] border-none shadow-2xl rounded-[3rem] overflow-hidden p-0 bg-white flex flex-col">
                    <div className="bg-slate-900 p-12 text-white flex justify-between items-center">
                        <div className="flex items-center gap-8">
                            <div className="h-20 w-20 bg-blue-600 rounded-[2rem] flex items-center justify-center shadow-blue-500/30 shadow-2xl">
                                <Beaker className="text-white w-10 h-10" />
                            </div>
                            <div>
                                <h2 className="text-4xl font-black tracking-tighter">BOM Configuration Terminal</h2>
                                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.4em] mt-2">Sovereign Architecture • Logic Encrypted</p>
                            </div>
                        </div>
                        <Badge className="bg-blue-600 text-white font-black border-none px-6 py-2 text-[10px] tracking-widest uppercase rounded-full">Secure Node</Badge>
                    </div>
                    {isLoadingDetails ? (
                        <div className="flex-1 flex flex-col items-center justify-center bg-white">
                            <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] mt-8 animate-pulse">Decrypting Product Logic...</p>
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

            {/* Final Verification: Secure System Footer */}
            <div className="text-center pb-20">
                <div className="inline-flex items-center gap-4 px-8 py-3 bg-white rounded-full shadow-sm border border-slate-100">
                    <ShieldCheck size={14} className="text-emerald-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-300">Architecture Nodes Isolated • Version 10.4.2 Verified</span>
                </div>
            </div>
        </div>
    );
}