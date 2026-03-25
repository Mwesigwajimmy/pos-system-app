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
    PlusCircle, 
    Calculator,
    Package,
    CheckCircle2,
    Info,
    TrendingUp,
    Utensils,
    Beaker
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
        .select('id, name, sku, price, cost_price, products(name), units_of_measure(name)')
        .order('name', { ascending: true });
        
    if (error) throw new Error(error.message);
    
    return data.map((v: any) => ({ 
        value: v.id, 
        label: `${v.products?.name || 'Unknown'} - ${v.name}`,
        sku: v.sku || 'N/A',
        price: v.price || 0,
        cost_price: v.cost_price || 0,
        uom_name: v.units_of_measure?.name
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

const ProductCombobox = ({ options, value, onChange, placeholder, disabled }: any) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between h-10 border-slate-200 bg-white" disabled={disabled}>
                    {value ? <span className="font-semibold text-slate-900">{value.label}</span> : <span className="text-slate-400">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 shadow-xl border-slate-200" align="start">
                <Command>
                    <CommandInput placeholder="Search name or SKU..." className="h-10" />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <ScrollArea className="h-72">
                            <CommandGroup>
                                {options.map((option: ProductOption) => (
                                    <CommandItem 
                                        key={option.value} 
                                        value={option.label}
                                        onSelect={() => { onChange(option); setOpen(false); }}
                                        className="p-3 border-b border-slate-50 last:border-0"
                                    >
                                        <div className="flex flex-col flex-1">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-sm text-slate-800">{option.label}</span>
                                                <Badge variant="secondary" className="text-[10px] font-mono">{option.sku}</Badge>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] text-slate-500 font-medium">Cost: {option.cost_price.toLocaleString()} UGX</span>
                                                {option.uom_name && <Badge variant="outline" className="text-[9px] px-1 h-4 text-blue-600 border-blue-100">{option.uom_name}</Badge>}
                                            </div>
                                        </div>
                                        <Check className={cn("ml-2 h-4 w-4 text-blue-600", value?.value === option.value ? "opacity-100" : "opacity-0")} />
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
            toast.success("Recipe saved successfully");
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

    if (isLoadingVariants) return <div className="p-20 text-center text-slate-400">Loading product variants...</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 pb-12 animate-in fade-in duration-500">
            
            {/* WORKSPACE */}
            <div className="xl:col-span-8 space-y-6">
                <Card className="border-slate-200 shadow-sm overflow-hidden">
                    <CardHeader className="bg-slate-50 border-b p-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-bold text-slate-900 flex items-center gap-2">
                                    <Package className="text-blue-600" size={20} />
                                    Recipe Manager
                                </CardTitle>
                                <CardDescription className="text-sm mt-1">
                                    Manage ingredient lists and calculate production costs.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    
                    <CardContent className="p-6 md:p-8 space-y-8">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">1. Select Product to Configure</Label>
                            <ProductCombobox 
                                options={allVariants || []} 
                                value={selectedComposite} 
                                onChange={(val: any) => isDirty ? setPendingComposite(val) : setSelectedComposite(val)} 
                                placeholder="Search product name..." 
                            />
                        </div>

                        <div className={cn("space-y-6 transition-opacity", !selectedComposite && "opacity-40 pointer-events-none")}>
                            <div className="space-y-2">
                                <Label className="text-xs font-bold text-slate-500 uppercase tracking-tight">2. Add Ingredients</Label>
                                <div className="flex gap-2">
                                    <div className="flex-1">
                                        <ProductCombobox 
                                            options={allVariants?.filter(v => v.value !== selectedComposite?.value && !ingredients.some(i => i.variant_id === v.value)) || []} 
                                            value={selectedIngredient} 
                                            onChange={setSelectedIngredient} 
                                            placeholder="Search raw materials or components..." 
                                        />
                                    </div>
                                    <Button onClick={handleAddIngredient} disabled={!selectedIngredient} className="bg-blue-600 hover:bg-blue-700 h-10 px-6 font-semibold">
                                        <PlusCircle className="mr-2 h-4 w-4" /> Add
                                    </Button>
                                </div>
                            </div>

                            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                                <Table>
                                    <TableHeader className="bg-slate-50">
                                        <TableRow>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 px-4">Ingredient</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-right px-4">Unit Cost</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-center w-[140px] px-4">Qty Needed</TableHead>
                                            <TableHead className="text-xs font-bold text-slate-500 uppercase h-10 text-right px-6">Sub-total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredients.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-32 text-center text-slate-400 text-sm italic">
                                                    No ingredients added yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            ingredients.map((ing, idx) => (
                                                <TableRow key={ing.variant_id} className="border-b last:border-0 hover:bg-slate-50/50">
                                                    <TableCell className="px-4 py-4">
                                                        <div className="font-semibold text-slate-800 text-sm">{ing.name}</div>
                                                        {ing.uom_name && <span className="text-[10px] text-blue-500 font-semibold uppercase">{ing.uom_name}</span>}
                                                    </TableCell>
                                                    <TableCell className="text-right text-xs text-slate-500 px-4">
                                                        {ing.unit_cost.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 px-2 py-1">
                                                            <Input 
                                                                type="number" 
                                                                step="0.01" 
                                                                value={ing.quantity_used} 
                                                                onChange={e => handleUpdateQuantity(idx, Number(e.target.value))} 
                                                                className="h-7 border-none text-center font-bold text-xs p-0 focus-visible:ring-0" 
                                                            />
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{ing.uom_name || 'U'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right px-6">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <span className="font-bold text-slate-900 text-sm">{(ing.unit_cost * ing.quantity_used).toLocaleString()}</span>
                                                            <Button variant="ghost" size="icon" onClick={() => { setIngredients(ingredients.filter(i => i.variant_id !== ing.variant_id)); setIsDirty(true); }} className="h-7 w-7 text-slate-400 hover:text-red-500">
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
                        </div>
                    </CardContent>
                    
                    <CardFooter className="bg-slate-50 p-6 flex justify-between items-center border-t">
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
                            <CheckCircle2 className="text-emerald-500 w-4 h-4" />
                            Changes ready to save
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={!isDirty || mutation.isPending || !selectedComposite}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-bold h-10 px-10 shadow-sm"
                        >
                            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Recipe"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* SIDEBAR */}
            <div className="xl:col-span-4 space-y-6">
                
                {/* Cost Analysis */}
                <Card className="bg-slate-900 text-white border-none shadow-lg">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold uppercase text-blue-400 flex items-center gap-2">
                           <TrendingUp size={14}/> Cost Analysis
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-xs text-slate-400 font-medium uppercase">Total Cost of Production</p>
                            <div className="text-3xl font-bold text-white mt-1">
                                {totalProductionCost.toLocaleString()} <span className="text-xs font-semibold text-slate-500">UGX</span>
                            </div>
                        </div>
                        
                        {selectedComposite && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Retail Price</p>
                                    <p className="font-bold text-blue-300">{selectedComposite.price.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-500 font-bold uppercase">Profit Margin</p>
                                    <p className={cn("font-bold", (selectedComposite.price - totalProductionCost) > 0 ? "text-emerald-400" : "text-red-400")}>
                                        {(( (selectedComposite.price - totalProductionCost) / (selectedComposite.price || 1) ) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Info Box */}
                <Card className="border-slate-200 shadow-sm bg-blue-50/20">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-xs font-bold text-slate-700 uppercase flex items-center gap-2">
                           <Info size={14} className="text-blue-600"/> Information
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3 items-start">
                            <Utensils size={14} className="text-slate-400 mt-1" />
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Restaurant inventory will be automatically deducted when a sale is finalized in the POS system.
                            </p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <Beaker size={14} className="text-slate-400 mt-1" />
                            <p className="text-xs text-slate-600 leading-relaxed">
                                Supports high-precision quantities (up to 4 decimals) for chemical or pharmaceutical compounding.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <div className="text-[10px] text-slate-400 text-center uppercase tracking-widest px-4">
                    All recipe updates are logged for tracking.
                </div>
            </div>

            {/* UNSAVED CHANGES ALERT */}
            <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                <AlertDialogContent className="rounded-xl border-slate-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-lg font-bold">Discard Unsaved Changes?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-500">
                            The current recipe hasn't been saved. If you switch products now, your changes will be lost.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 mt-4">
                        <AlertDialogCancel className="font-semibold">Keep Editing</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-bold" onClick={() => { setSelectedComposite(pendingComposite); setPendingComposite(null); setIsDirty(false); }}>
                            Discard Changes
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}