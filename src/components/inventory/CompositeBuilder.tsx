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
    ShieldCheck,
    Plus,
    Save,
    ArrowRight,
    PieChart,
    Layers
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
    is_raw_material: boolean; 
    is_composite: boolean;    
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
                <Button variant="outline" role="combobox" className="w-full justify-between h-11 border-slate-200 bg-white shadow-sm hover:bg-slate-50 transition-all font-medium text-slate-700" disabled={disabled}>
                    {value ? <span className="font-bold text-slate-900">{value.label}</span> : <span className="text-slate-400">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 shadow-2xl border-slate-200 rounded-xl overflow-hidden" align="start">
                <Command>
                    <CommandInput placeholder="Search inventory..." className="h-11" />
                    <CommandList>
                        <CommandEmpty className="p-4 text-xs font-bold text-slate-400 uppercase tracking-widest text-center">{emptyLabel}</CommandEmpty>
                        <ScrollArea className="h-80">
                            <CommandGroup>
                                {options.map((option: ProductOption) => (
                                    <CommandItem 
                                        key={option.value} 
                                        value={option.label}
                                        onSelect={() => { onChange(option); setOpen(false); }}
                                        className="p-3 border-b border-slate-50 last:border-0 cursor-pointer"
                                    >
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm text-slate-900">{option.label}</span>
                                                <span className="text-[10px] font-mono font-bold text-slate-400">{option.sku}</span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1">
                                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Cost: {option.cost_price.toLocaleString()} UGX</span>
                                                {option.uom_name && <Badge variant="outline" className="text-[9px] h-4 px-1.5 font-bold uppercase bg-slate-50">{option.uom_name}</Badge>}
                                            </div>
                                        </div>
                                        <Check className={cn("ml-2 h-4 w-4 text-emerald-500", value?.value === option.value ? "opacity-100" : "opacity-0")} />
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
            toast.success("Formula saved successfully");
            queryClient.invalidateQueries({ queryKey: ['recipe', selectedComposite?.value] });
            setIsDirty(false);
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
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

    if (isLoadingVariants) return (
        <div className="min-h-[400px] flex flex-col items-center justify-center space-y-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-slate-400 font-bold text-xs uppercase tracking-widest animate-pulse">Initializing Sovereign Assets...</p>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50/50 p-6 md:p-10 animate-in fade-in duration-700">
            
            {/* PAGE HEADER */}
            <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-3.5 bg-slate-900 rounded-2xl shadow-xl text-white">
                        <Layers className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Bill of Materials (BOM)</h1>
                        <div className="flex items-center gap-2 mt-1">
                           <ShieldCheck size={14} className="text-emerald-500" /> 
                           <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manufacturing Logic Sync Verified</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <Button 
                        onClick={handleSave} 
                        disabled={!isDirty || mutation.isPending || !selectedComposite}
                        className="h-12 bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 shadow-lg shadow-blue-600/20 rounded-xl"
                    >
                        {mutation.isPending ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />} 
                        Commit Formula
                    </Button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8">
                
                {/* BUILDER AREA */}
                <div className="xl:col-span-8 space-y-8">
                    
                    {/* TARGET SELECTION */}
                    <Card className="border-slate-200 shadow-sm bg-white overflow-hidden rounded-3xl">
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8">
                            <div className="flex items-center gap-3">
                                <Package className="h-5 w-5 text-blue-600" />
                                <CardTitle className="text-lg font-bold">Select Manufacturing Target</CardTitle>
                            </div>
                            <CardDescription>Pick a composite item from your registry to configure its recipe.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-8">
                            <ProductCombobox 
                                options={compositeOptions} 
                                value={selectedComposite} 
                                onChange={(val: any) => isDirty ? setPendingComposite(val) : setSelectedComposite(val)} 
                                placeholder="Search manufactured products..." 
                            />
                        </CardContent>
                    </Card>

                    {/* RECIPE BUILDER */}
                    <Card className={cn("border-slate-200 shadow-sm bg-white overflow-hidden rounded-3xl transition-all duration-500", !selectedComposite ? "opacity-30 grayscale pointer-events-none" : "opacity-100")}>
                        <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <Beaker className="h-5 w-5 text-blue-600" />
                                    <CardTitle className="text-lg font-bold">Formula Construction</CardTitle>
                                </div>
                                <CardDescription>Search and add raw materials to the manufacturing formula.</CardDescription>
                            </div>
                            <div className="flex items-center gap-3 w-full md:w-auto">
                                <div className="flex-1 md:w-80">
                                    <ProductCombobox 
                                        options={rawMaterialOptions} 
                                        value={selectedIngredient} 
                                        onChange={setSelectedIngredient} 
                                        placeholder="Add raw materials..." 
                                    />
                                </div>
                                <Button onClick={handleAddIngredient} disabled={!selectedIngredient} className="bg-slate-900 hover:bg-blue-600 text-white h-11 px-6 font-bold shadow-md rounded-xl transition-all">
                                    <Plus className="h-4 w-4 mr-2" /> Add
                                </Button>
                            </div>
                        </CardHeader>
                        
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader className="bg-slate-50/50">
                                        <TableRow className="border-none">
                                            <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-14 pl-8">Material Identity</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-14 text-right">Landed Cost</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-14 text-center w-[160px]">Formula Qty</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase text-slate-500 h-14 text-right pr-8">Sub-total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-40 text-center text-slate-400 text-sm font-medium italic">
                                                    No ingredients added yet. Search above to begin.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ingredients.map((ing, idx) => (
                                                <TableRow key={ing.variant_id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50 transition-colors h-20">
                                                    <TableCell className="pl-8">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900">{ing.name}</span>
                                                            <span className="text-[10px] font-bold text-blue-600 uppercase mt-0.5">{ing.uom_name || 'Units'} Verified</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs font-semibold text-slate-500">
                                                        {ing.unit_cost.toLocaleString()} <span className="text-[9px] ml-1">UGX</span>
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 shadow-sm">
                                                            <Input 
                                                                type="number" 
                                                                step="0.0001" 
                                                                value={ing.quantity_used} 
                                                                onChange={e => handleUpdateQuantity(idx, Number(e.target.value))} 
                                                                className="h-8 border-none text-center font-bold text-sm focus-visible:ring-0" 
                                                            />
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase pr-2">{ing.uom_name || 'U'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-8">
                                                        <div className="flex items-center justify-end gap-5">
                                                            <span className="font-bold text-slate-900">{(ing.unit_cost * ing.quantity_used).toLocaleString()}</span>
                                                            <Button variant="ghost" size="sm" onClick={() => { setIngredients(ingredients.filter(i => i.variant_id !== ing.variant_id)); setIsDirty(true); }} className="h-8 w-8 text-slate-300 hover:text-red-600 hover:bg-red-50 p-0 rounded-lg">
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
                        </CardContent>
                    </Card>
                </div>

                {/* ANALYTICS SIDEBAR */}
                <div className="xl:col-span-4 space-y-8">
                    
                    {/* COST ANALYSIS PANEL */}
                    <Card className="bg-slate-900 text-white border-none shadow-xl rounded-3xl overflow-hidden">
                        <CardHeader className="pb-4 border-b border-white/10 p-8">
                            <CardTitle className="text-[11px] font-bold uppercase text-blue-400 flex items-center gap-3 tracking-widest">
                               <TrendingUp size={16}/> Financial Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-8 space-y-8">
                            <div>
                                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide">Total Material Cost</p>
                                <div className="text-4xl font-bold text-white mt-2 tracking-tight">
                                    {totalProductionCost.toLocaleString()} <span className="text-sm font-semibold text-slate-500 uppercase ml-1">UGX</span>
                                </div>
                            </div>
                            
                            {selectedComposite && (
                                <div className="space-y-6 pt-8 border-t border-white/10">
                                    <div className="flex justify-between items-end">
                                        <div className="space-y-1">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Market Retail Price</p>
                                            <p className="text-xl font-bold text-blue-300">{selectedComposite.price.toLocaleString()}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Gross Margin</p>
                                            <p className={cn("text-2xl font-bold", (selectedComposite.price - totalProductionCost) > 0 ? "text-emerald-400" : "text-red-400")}>
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

                    {/* SYSTEM INSIGHTS */}
                    <Card className="border-slate-200 shadow-sm bg-white rounded-3xl p-8 space-y-6">
                        <div className="flex items-center gap-4 border-b border-slate-50 pb-5">
                            <div className="h-10 w-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600">
                                 <Info size={18}/>
                            </div>
                            <h5 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Logic Node Info</h5>
                        </div>
                        
                        <div className="space-y-5">
                            <div className="flex gap-4 items-start">
                                <div className="h-8 w-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                                    <Utensils size={14} />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Materials are automatically deducted from stock upon production finalization.
                                </p>
                            </div>
                            <div className="flex gap-4 items-start">
                                 <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0 mt-0.5">
                                    <Calculator size={14} />
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                    Landed costs are calculated based on the latest procurement vendor receipts.
                                </p>
                            </div>
                        </div>
                    </Card>

                    <div className="text-[10px] text-slate-400 text-center font-bold uppercase tracking-widest px-6 leading-relaxed opacity-60">
                        Formula versions are archived in the forensic audit ledger.
                    </div>
                </div>
            </div>

            {/* DISCARD DIALOG */}
            <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                <AlertDialogContent className="rounded-3xl border-none shadow-2xl overflow-hidden p-0 max-w-md">
                    <div className="bg-red-50 p-8 flex flex-col items-center text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
                        <AlertDialogTitle className="text-xl font-bold text-red-900">Discard Changes?</AlertDialogTitle>
                        <AlertDialogDescription className="text-red-700 font-medium mt-2">
                            You have unsaved formula changes. Switching products now will permanently lose your progress.
                        </AlertDialogDescription>
                    </div>
                    <AlertDialogFooter className="p-6 bg-white flex items-center justify-center gap-3">
                        <AlertDialogCancel className="font-bold border-slate-200 h-11 px-6 rounded-xl">Keep Editing</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-red-600/20" onClick={() => { setSelectedComposite(pendingComposite); setPendingComposite(null); setIsDirty(false); }}>
                            Discard Anyway
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}