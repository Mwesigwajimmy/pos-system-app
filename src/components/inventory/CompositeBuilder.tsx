'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import { 
    Check, 
    ChevronsUpDown, 
    Trash2, 
    Loader2, 
    Calculator,
    Package,
    CheckCircle2,
    Info,
    TrendingUp,
    Utensils,
    Beaker,
    Search,
    AlertCircle,
    ShieldCheck
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";

// --- TYPES ---
interface ProductOption { 
    value: number; 
    label: string; 
    sku: string; 
    price: number; 
    cost_price: number;
    uom_name?: string;
    is_raw_material: boolean; // CRITICAL: Added for filtering
    is_composite: boolean;    // CRITICAL: Added for filtering
}

interface Ingredient { 
    variant_id: number; 
    name: string; 
    quantity_used: number; 
    unit_cost: number;
    uom_name?: string; 
}

type SaveRecipePayload = { compositeVariantId: number; ingredients: Omit<Ingredient, 'name' | 'unit_cost' | 'uom_name'>[] };

const supabase = createClient();

// --- DATA ACCESS ---

async function fetchAllVariants(): Promise<ProductOption[]> {
    // We fetch the flags so we can filter locally without multiple network requests
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, sku, price, cost_price, is_raw_material, is_composite, products(name), units_of_measure(name)')
        .order('name', { ascending: true });
        
    if (error) throw new Error(error.message);
    
    return data.map((v: any) => ({ 
        value: v.id, 
        label: `${v.products?.name || 'Unknown'} - ${v.name}`,
        sku: v.sku || 'N/A',
        price: v.price || 0,
        cost_price: v.cost_price || 0,
        uom_name: v.units_of_measure?.name,
        is_raw_material: v.is_raw_material || false,
        is_composite: v.is_composite || false
    }));
}

async function fetchRecipe(compositeVariantId: number): Promise<Ingredient[]> {
    const { data, error } = await supabase.rpc('get_composite_details_v5', { p_variant_id: compositeVariantId });
    if (error) throw new Error(error.message);
    return data as any;
}

async function saveRecipe({ compositeVariantId, ingredients }: SaveRecipePayload) {
    const { data: parentData, error: parentError } = await supabase
        .from('product_variants')
        .select('sku, products(name)')
        .eq('id', compositeVariantId)
        .single();

    if (parentError) throw new Error("Could not retrieve product data.");

    const parentName = (parentData.products as any)?.name || 'Product';
    const parentSku = parentData.sku || '';

    const componentsPayload = ingredients.map(ing => ({
        component_variant_id: ing.variant_id,
        quantity: ing.quantity_used
    }));

    const { error } = await supabase.rpc('upsert_composite_product_v5', {
        p_variant_id: compositeVariantId,
        p_name: parentName,
        p_sku: parentSku,
        p_components: componentsPayload
    });

    if (error) throw error;
}

// --- UI COMPONENTS ---

const ProductCombobox = ({ options, value, onChange, placeholder, disabled, emptyLabel = "No items found." }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between h-12 border-slate-200 bg-white rounded-xl shadow-sm hover:bg-slate-50 transition-all" disabled={disabled}>
                    {value ? <span className="font-bold text-slate-900">{value.label}</span> : <span className="text-slate-400 font-medium">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[500px] p-0 shadow-2xl border-slate-100 rounded-2xl overflow-hidden" align="start">
                <Command>
                    <CommandInput placeholder="Search system registry..." className="h-12" />
                    <CommandList>
                        <CommandEmpty className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{emptyLabel}</CommandEmpty>
                        <ScrollArea className="h-[400px]">
                            <CommandGroup>
                                {options.map((option: ProductOption) => (
                                    <CommandItem 
                                        key={option.value} 
                                        value={option.label}
                                        onSelect={() => { onChange(option); setOpen(false); }}
                                        className="p-4 border-b border-slate-50 last:border-0 cursor-pointer"
                                    >
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-black text-sm text-slate-900 tracking-tight">{option.label}</span>
                                                <Badge variant="outline" className="text-[9px] font-mono font-black text-blue-600 bg-blue-50 border-blue-100 uppercase">{option.sku}</Badge>
                                            </div>
                                            <div className="flex items-center gap-3 mt-2">
                                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Base Cost: {option.cost_price.toLocaleString()} UGX</span>
                                                {option.uom_name && <Badge className="text-[9px] font-black px-2 h-4 bg-slate-900 text-white rounded">{option.uom_name}</Badge>}
                                            </div>
                                        </div>
                                        <Check className={cn("ml-4 h-5 w-5 text-emerald-500", value?.value === option.value ? "opacity-100" : "opacity-0")} />
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

// --- MAIN COMPONENT ---

export default function CompositeBuilder() {
    const queryClient = useQueryClient();
    const [selectedComposite, setSelectedComposite] = useState<ProductOption | null>(null);
    const [selectedIngredient, setSelectedIngredient] = useState<ProductOption | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingComposite, setPendingComposite] = useState<ProductOption | null>(null);

    const { data: allVariants, isLoading: isLoadingVariants } = useQuery({ queryKey: ['allVariants'], queryFn: fetchAllVariants });
    
    // 1. DATA FILTERING (The "Smooth" Logic)
    const compositeOptions = useMemo(() => allVariants?.filter(v => v.is_composite) || [], [allVariants]);
    const rawMaterialOptions = useMemo(() => {
        if (!allVariants) return [];
        return allVariants.filter(v => 
            v.is_raw_material && 
            v.value !== selectedComposite?.value && 
            !ingredients.some(i => i.variant_id === v.value)
        );
    }, [allVariants, selectedComposite, ingredients]);

    const { data: originalRecipe, isLoading: isLoadingRecipe } = useQuery({ 
        queryKey: ['recipe', selectedComposite?.value], 
        queryFn: () => fetchRecipe(selectedComposite!.value), 
        enabled: !!selectedComposite
    });

    useEffect(() => {
        if (selectedComposite && originalRecipe && (originalRecipe as any).components) {
            setIngredients((originalRecipe as any).components); 
            setIsDirty(false);
        } else if (selectedComposite && !isLoadingRecipe) {
            setIngredients([]);
            setIsDirty(false);
        }
    }, [originalRecipe, selectedComposite, isLoadingRecipe]);

    const mutation = useMutation({
        mutationFn: saveRecipe,
        onSuccess: () => {
            toast.success("Formula secured in database");
            queryClient.invalidateQueries({ queryKey: ['recipe', selectedComposite?.value] });
            setIsDirty(false);
        },
        onError: (error) => toast.error(`Sync Failure: ${error.message}`),
    });

    const totalProductionCost = useMemo(() => {
        return ingredients.reduce((sum, ing) => sum + (ing.unit_cost * ing.quantity_used), 0);
    }, [ingredients]);

    const handleAddIngredient = () => {
        if (!selectedIngredient) return;
        setIngredients([...ingredients, { 
            variant_id: selectedIngredient.value, 
            name: selectedIngredient.label, 
            quantity_used: 1,
            unit_cost: selectedIngredient.cost_price,
            uom_name: selectedIngredient.uom_name
        }]);
        setSelectedIngredient(null);
        setIsDirty(true);
    };

    const handleUpdateQuantity = (index: number, qty: number) => {
        const newIngredients = [...ingredients];
        newIngredients[index].quantity_used = qty;
        setIngredients(newIngredients);
        setIsDirty(true);
    };

    const handleSave = () => {
        if (!selectedComposite) return;
        mutation.mutate({
            compositeVariantId: selectedComposite.value,
            ingredients: ingredients.map(ing => ({
                variant_id: ing.variant_id,
                quantity_used: ing.quantity_used
            }))
        });
    };

    if (isLoadingVariants) return <div className="p-20 text-center font-black text-slate-400 animate-pulse"><Loader2 className="animate-spin inline mr-3" />COLLECTING SOVEREIGN ASSETS...</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10 pb-12 animate-in fade-in duration-700">
            
            {/* BUILDER AREA */}
            <div className="xl:col-span-8 space-y-8">
                <Card className="border-none shadow-2xl rounded-[2rem] bg-white overflow-hidden">
                    <CardHeader className="bg-slate-900 border-b p-10 text-white">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-5">
                                <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <Beaker className="text-white h-8 w-8" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl font-black tracking-tighter">Formula Engineering</CardTitle>
                                    <CardDescription className="text-blue-400 font-black text-[10px] uppercase tracking-[0.3em] mt-1">
                                        BOM Construction & Real-Time Cost Analysis
                                    </CardDescription>
                                </div>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-10 md:p-12 space-y-12">
                        {/* TARGET PRODUCT SELECTION */}
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">1. Select Manufacturing Target</Label>
                            <ProductCombobox 
                                options={compositeOptions} 
                                value={selectedComposite} 
                                onChange={(val: any) => isDirty ? setPendingComposite(val) : setSelectedComposite(val)} 
                                placeholder="Pick a composite/manufactured item..." 
                                emptyLabel="No manufactured items found in registry."
                            />
                        </div>

                        {/* INGREDIENT BUILDER */}
                        <div className={cn("space-y-10 transition-all duration-500", !selectedComposite ? "opacity-20 grayscale pointer-events-none" : "opacity-100")}>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">2. Sourced Raw Materials & Chemicals</Label>
                                <div className="flex gap-4">
                                    <div className="flex-1">
                                        <ProductCombobox 
                                            options={rawMaterialOptions} 
                                            value={selectedIngredient} 
                                            onChange={setSelectedIngredient} 
                                            placeholder="Search verified raw materials..." 
                                            emptyLabel="No raw materials flagged in system."
                                        />
                                    </div>
                                    <Button onClick={handleAddIngredient} disabled={!selectedIngredient} className="bg-slate-900 hover:bg-blue-600 text-white h-12 px-10 font-black uppercase text-[10px] tracking-widest shadow-xl rounded-xl transition-all">
                                        Append Input
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-slate-100 rounded-[2rem] overflow-hidden shadow-sm bg-slate-50/30">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow className="border-none">
                                            <TableHead className="text-[9px] font-black uppercase text-slate-400 h-14 px-8 tracking-widest">Component Identity</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-slate-400 h-14 text-right px-8 tracking-widest">Base Cost</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-slate-400 h-14 text-center w-[180px] px-8 tracking-widest">Recipe Qty</TableHead>
                                            <TableHead className="text-[9px] font-black uppercase text-slate-400 h-14 text-right px-10 tracking-widest">Sub-total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-40 text-center text-slate-300 text-xs font-black uppercase tracking-widest">
                                                    Empty Formula Ledger.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ingredients.map((ing, idx) => (
                                                <TableRow key={ing.variant_id} className="border-b border-slate-50 last:border-0 hover:bg-white transition-all group">
                                                    <TableCell className="px-8 py-6">
                                                        <div className="font-black text-slate-900 text-sm tracking-tight">{ing.name}</div>
                                                        <div className="flex gap-2 mt-1">
                                                           <Badge variant="outline" className="text-[9px] font-black uppercase bg-white border-slate-200">Sourced</Badge>
                                                           {ing.uom_name && <span className="text-[9px] text-blue-600 font-black uppercase tracking-tighter self-center">{ing.uom_name}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-bold text-slate-400 px-8">
                                                        {ing.unit_cost.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="px-8">
                                                        <div className="flex items-center gap-3 bg-white rounded-xl border border-slate-100 px-3 py-1.5 shadow-inner">
                                                            <Input 
                                                                type="number" 
                                                                step="0.0001" 
                                                                value={ing.quantity_used} 
                                                                onChange={e => handleUpdateQuantity(idx, Number(e.target.value))} 
                                                                className="h-8 border-none text-center font-black text-sm p-0 focus-visible:ring-0 tabular-nums" 
                                                            />
                                                            <span className="text-[10px] text-slate-300 font-black uppercase">{ing.uom_name || 'U'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right px-10">
                                                        <div className="flex items-center justify-end gap-6">
                                                            <span className="font-black text-slate-900 text-base tabular-nums">{(ing.unit_cost * ing.quantity_used).toLocaleString()}</span>
                                                            <Button variant="ghost" size="icon" onClick={() => { setIngredients(ingredients.filter(i => i.variant_id !== ing.variant_id)); setIsDirty(true); }} className="h-8 w-8 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all">
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
                    </CardContent>
                    
                    <CardFooter className="bg-slate-50 p-10 flex flex-col sm:flex-row justify-between items-center gap-6 border-t border-slate-100">
                        <div className="flex items-center gap-4 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            <ShieldCheck className="text-emerald-500 w-5 h-5" />
                            Data Integrity Verified
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={!isDirty || mutation.isPending || !selectedComposite}
                            className="bg-blue-600 hover:bg-slate-900 text-white font-black h-14 px-20 shadow-2xl rounded-2xl transition-all uppercase text-xs tracking-widest w-full sm:w-auto"
                        >
                            {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : "Commit Formula"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* ANALYTICS SIDEBAR */}
            <div className="xl:col-span-4 space-y-8">
                
                {/* FINANCIAL ENGINE PANEL */}
                <Card className="bg-slate-900 text-white border-none shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] rounded-[2.5rem] overflow-hidden group">
                    <CardHeader className="pb-4 border-b border-white/5 p-10">
                        <CardTitle className="text-[10px] font-black uppercase text-blue-400 flex items-center gap-3 tracking-[0.3em]">
                           <TrendingUp size={16}/> Forensic Costing
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-10 space-y-10">
                        <div>
                            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em]">Aggregated Material Cost</p>
                            <div className="text-5xl font-black text-white mt-3 tabular-nums tracking-tighter">
                                {totalProductionCost.toLocaleString()} <span className="text-sm font-bold opacity-30">UGX</span>
                            </div>
                        </div>
                        
                        {selectedComposite && (
                            <div className="space-y-6 pt-10 border-t border-white/10">
                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Retail Target</p>
                                        <p className="text-xl font-black text-blue-300 tabular-nums">{selectedComposite.price.toLocaleString()}</p>
                                    </div>
                                    <div className="text-right space-y-1">
                                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">Gross Margin</p>
                                        <p className={cn("text-2xl font-black tabular-nums", (selectedComposite.price - totalProductionCost) > 0 ? "text-emerald-400" : "text-red-400")}>
                                            {(( (selectedComposite.price - totalProductionCost) / (selectedComposite.price || 1) ) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-blue-500 transition-all duration-1000" 
                                        style={{ width: `${Math.min(100, Math.max(0, (totalProductionCost / (selectedComposite.price || 1)) * 100))}%` }} 
                                     />
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* LOGIC REPOSITORY INFO */}
                <Card className="border-none shadow-xl bg-white rounded-[2rem] p-8 space-y-8">
                    <div className="flex items-center gap-4 border-b border-slate-50 pb-6">
                        <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                             <Info size={18}/>
                        </div>
                        <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Architecture Node</h5>
                    </div>
                    
                    <div className="space-y-6">
                        <div className="flex gap-5 items-start">
                            <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-1">
                                <Utensils size={14} />
                            </div>
                            <p className="text-xs text-slate-600 leading-loose font-bold italic">
                                Perpetual Inventory Control: Materials are live-deducted upon manufacturing finalization.
                            </p>
                        </div>
                        <div className="flex gap-5 items-start">
                             <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-1">
                                <Beaker size={14} />
                            </div>
                            <p className="text-xs text-slate-600 leading-loose font-bold italic">
                                High-Precision Engine: Formula logic supports 4-decimal points for chemical dosing accuracy.
                            </p>
                        </div>
                    </div>
                </Card>

                <div className="text-[9px] text-slate-400 text-center uppercase tracking-[0.4em] font-black px-10 leading-relaxed">
                    All formula changes are timestamped and isolated in the forensic audit log.
                </div>
            </div>

            {/* DISCARD ALERT */}
            <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
                    <div className="bg-red-600 p-10 text-white">
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter">Discard Formula Progress?</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-100 font-bold opacity-80 mt-2">
                            Unsaved configuration detected. Moving to a new target will permanently delete this session's progress.
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="bg-slate-50 p-8 border-t">
                        <AlertDialogCancel className="font-black text-[10px] uppercase tracking-widest border-none">Resume Audit</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-slate-900 text-white font-black px-10 h-12 rounded-xl text-[10px] uppercase tracking-widest transition-all" onClick={() => { setSelectedComposite(pendingComposite); setPendingComposite(null); setIsDirty(false); }}>
                            Discard Changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}