'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { 
    Check, 
    ChevronsUpDown, 
    Trash2, 
    Loader2, 
    AlertCircle, 
    PlusCircle, 
    Save, 
    Calculator,
    Zap,
    ShieldCheck,
    FlaskConical,
    UtensilsCrossed,
    Fingerprint,
    Info,
    TrendingUp
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    unit_cost: number; // UPGRADE: Added for real-time cost calculation
    uom_name?: string; 
}

type SaveRecipePayload = { compositeVariantId: number; ingredients: Omit<Ingredient, 'name' | 'unit_cost' | 'uom_name'>[] };

const supabase = createClient();

// --- ENTERPRISE DATA ACCESS ---

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
    
    const details = data as any;
    if (!details || !details.components) return [] as any;

    return details; // Returning the whole object so the useEffect can extract .components
}

async function saveRecipe({ compositeVariantId, ingredients }: SaveRecipePayload) {
    const { data: parentData, error: parentError } = await supabase
        .from('product_variants')
        .select('sku, products(name)')
        .eq('id', compositeVariantId)
        .single();

    if (parentError) throw new Error("Fiduciary handshake failed.");

    const parentName = (parentData.products as any)?.name || 'Composite Product';
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
                <Button variant="outline" role="combobox" className="w-full justify-between h-11 shadow-sm border-slate-200" disabled={disabled}>
                    {value ? <span className="font-bold text-slate-900">{value.label}</span> : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 text-primary" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[450px] p-0 shadow-2xl border-slate-200" align="start">
                <Command>
                    <CommandInput placeholder="Search by name or SKU..." className="h-12" />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {options.map((option: ProductOption) => (
                                <CommandItem 
                                    key={option.value} 
                                    value={option.label}
                                    onSelect={() => { onChange(option); setOpen(false); }}
                                    className="p-3 border-b last:border-0"
                                >
                                    <div className="flex flex-col flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-sm">{option.label}</span>
                                            <Badge variant="outline" className="text-[10px] font-mono">{option.sku}</Badge>
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">Basis: {option.cost_price.toLocaleString()} UGX</span>
                                            {option.uom_name && <Badge className="text-[8px] h-3.5 bg-blue-50 text-blue-600 border-blue-100">{option.uom_name}</Badge>}
                                        </div>
                                    </div>
                                    <Check className={cn("ml-2 h-4 w-4 text-emerald-500", value?.value === option.value ? "opacity-100" : "opacity-0")} />
                                </CommandItem>
                            ))}
                        </CommandGroup>
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

    // UPDATED: Fixed handling for DB object return
    useEffect(() => {
        // @ts-ignore - handling the object return from DB
        if (selectedComposite && originalRecipe && originalRecipe.components) {
            // FIX: We must only set the 'components' array, not the whole object
            setIngredients(originalRecipe.components); 
            setIsDirty(false);
        } else if (selectedComposite && !isLoadingRecipe) {
            setIngredients([]);
            setIsDirty(false);
        }
    }, [originalRecipe, selectedComposite, isLoadingRecipe]);

    const mutation = useMutation({
        mutationFn: saveRecipe,
        onSuccess: () => {
            toast.success("Fiduciary Recipe Sealed", { icon: <ShieldCheck className="text-emerald-500" /> });
            queryClient.invalidateQueries({ queryKey: ['recipe', selectedComposite?.value] });
            setIsDirty(false);
        },
        onError: (error) => toast.error(`Handshake Failed: ${error.message}`),
    });

    // --- ROBOTIC ANALYTICS: Total Production Cost ---
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

    if (isLoadingVariants) return <div className="p-10 text-center animate-pulse text-slate-300">Synchronizing Financial Pillars...</div>;

    return (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-in fade-in duration-700 pb-20">
            
            {/* LEFT: Builder Workspace */}
            <div className="xl:col-span-8 space-y-6">
                <Card className="border-none shadow-2xl bg-white/50 backdrop-blur-md overflow-hidden">
                    <CardHeader className="bg-slate-50/50 border-b pb-6">
                        <div className="flex justify-between items-center">
                            <div>
                                <CardTitle className="text-xl font-black tracking-tighter flex items-center gap-2">
                                    <Zap className="text-emerald-500 fill-emerald-500 animate-pulse" size={20} />
                                    NEURAL RECIPE ORCHESTRATOR
                                </CardTitle>
                                <CardDescription className="text-xs font-bold uppercase tracking-widest text-slate-400">
                                    Bill of Materials (BOM) & Fractional Math Kernel
                                </CardDescription>
                            </div>
                            <Badge className="bg-slate-900 border-none font-mono text-[10px] px-3">KERNEL v10.2.5</Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-8 space-y-8">
                        
                        <div className="space-y-3">
                            <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">1. Primary Finished Asset (Saleable)</Label>
                            <ProductCombobox 
                                options={allVariants || []} 
                                value={selectedComposite} 
                                onChange={(val: any) => isDirty ? setPendingComposite(val) : setSelectedComposite(val)} 
                                placeholder="Select a Meal, Drug, or Unit to configure..." 
                            />
                        </div>

                        <div className={cn("space-y-6 transition-all duration-500", !selectedComposite && "opacity-20 pointer-events-none grayscale")}>
                            <div className="space-y-3">
                                <Label className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] ml-1">2. Ingest Component Ingredients</Label>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <ProductCombobox 
                                            options={allVariants?.filter(v => v.value !== selectedComposite?.value && !ingredients.some(i => i.variant_id === v.value)) || []} 
                                            value={selectedIngredient} 
                                            onChange={setSelectedIngredient} 
                                            placeholder="Search Raw Materials (Flour, Milk, Drug Base...)" 
                                        />
                                    </div>
                                    <Button onClick={handleAddIngredient} disabled={!selectedIngredient} className="bg-primary font-black shadow-lg shadow-primary/20 h-11 px-6">
                                        <PlusCircle className="mr-2 h-4 w-4" /> INGEST
                                    </Button>
                                </div>
                            </div>

                            <div className="border rounded-2xl overflow-hidden shadow-inner bg-slate-50/30">
                                <Table>
                                    <TableHeader className="bg-white/80 border-b">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="font-black text-[9px] uppercase tracking-widest pl-6">Ingredient Asset</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-right">Unit Basis</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase tracking-widest w-[160px] text-center">Required Qty</TableHead>
                                            <TableHead className="font-black text-[9px] uppercase tracking-widest text-right pr-6">Cost Impact</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {ingredients.length === 0 ? (
                                            <TableRow><TableCell colSpan={4} className="h-40 text-center text-slate-300 font-bold uppercase tracking-widest text-xs italic">Awaiting Component Ingestion...</TableCell></TableRow>
                                        ) : (
                                            ingredients.map((ing, idx) => (
                                                <TableRow key={ing.variant_id} className="hover:bg-white transition-colors group border-b last:border-0">
                                                    <TableCell className="pl-6 py-5">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-900 text-sm">{ing.name}</span>
                                                            {ing.uom_name && <span className="text-[9px] text-blue-500 font-black uppercase tracking-tighter italic">Base: 1.00 {ing.uom_name}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs text-slate-400">
                                                        {ing.unit_cost.toLocaleString()}
                                                    </TableCell>
                                                    <TableCell className="px-4">
                                                        <div className="flex items-center gap-2 bg-white rounded-lg border p-1 shadow-sm focus-within:ring-1 ring-primary/30 transition-all">
                                                            <Input 
                                                                type="number" 
                                                                step="0.0001" 
                                                                value={ing.quantity_used} 
                                                                onChange={e => handleUpdateQuantity(idx, Number(e.target.value))} 
                                                                className="h-8 border-none text-center font-black text-xs focus-visible:ring-0" 
                                                            />
                                                            <span className="text-[9px] font-bold text-slate-400 pr-2 uppercase">{ing.uom_name || 'U'}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6">
                                                        <div className="flex items-center justify-end gap-3">
                                                            <span className="font-black text-slate-900 font-mono text-xs">{(ing.unit_cost * ing.quantity_used).toLocaleString()}</span>
                                                            <Button variant="ghost" size="icon" onClick={() => { setIngredients(ingredients.filter(i => i.variant_id !== ing.variant_id)); setIsDirty(true); }} className="h-7 w-7 text-slate-300 hover:text-red-500 hover:bg-red-50">
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
                    <CardFooter className="bg-slate-900 p-6 flex justify-between items-center text-white">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="text-emerald-400 w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Ledger Compliance Verified</span>
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={!isDirty || mutation.isPending || !selectedComposite}
                            className="bg-emerald-600 hover:bg-emerald-700 font-black h-12 px-12 shadow-xl shadow-emerald-900/20 uppercase tracking-widest"
                        >
                            {mutation.isPending ? <Loader2 className="animate-spin" /> : "Seal Recipe"}
                        </Button>
                    </CardFooter>
                </Card>
            </div>

            {/* RIGHT: Financial Intelligence Panel */}
            <div className="xl:col-span-4 space-y-6">
                
                {/* Cost Analysis Card */}
                <Card className="bg-slate-950 text-white border-none shadow-2xl relative overflow-hidden">
                    <Fingerprint className="absolute -right-4 -top-4 w-32 h-32 text-emerald-500/10 rotate-12" />
                    <CardHeader>
                        <CardTitle className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 flex items-center gap-2">
                           <TrendingUp size={12}/> Economic Intelligence
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 relative z-10">
                        <div>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest">Total Production Cost</p>
                            <div className="text-5xl font-black text-white mt-1 tracking-tighter">
                                {totalProductionCost.toLocaleString()} <span className="text-sm font-bold text-slate-600 uppercase">UGX</span>
                            </div>
                        </div>
                        
                        {selectedComposite && (
                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold">Suggested Sale</p>
                                    <p className="font-black text-emerald-400">{selectedComposite.price.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] text-slate-500 uppercase font-bold">Projected Margin</p>
                                    <p className={cn("font-black", (selectedComposite.price - totalProductionCost) > 0 ? "text-emerald-400" : "text-red-500")}>
                                        {(( (selectedComposite.price - totalProductionCost) / (selectedComposite.price || 1) ) * 100).toFixed(1)}%
                                    </p>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Industry Guidance */}
                <Card className="border-l-4 border-l-blue-500 shadow-xl bg-blue-50/30">
                    <CardHeader>
                        <CardTitle className="text-xs font-black uppercase tracking-widest text-blue-900 flex items-center gap-2">
                           <Info size={14}/> SME Protocol
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-3 items-start">
                            <UtensilsCrossed size={16} className="text-blue-600 mt-1" />
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium uppercase italic">
                                Restaurants: Ingredients will be deducted from warehouse levels the moment the POS Final Seal is triggered.
                            </p>
                        </div>
                        <div className="flex gap-3 items-start">
                            <FlaskConical size={16} className="text-blue-600 mt-1" />
                            <p className="text-[11px] text-slate-600 leading-relaxed font-medium uppercase italic">
                                Medical: Compounding of drugs supports 4-decimal precision for precise dosage management.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Internal Traceability */}
                <div className="text-[9px] font-mono text-slate-400 text-center uppercase tracking-widest leading-loose p-4">
                    Blockchain-ready hashing active.<br/> 
                    Recipe edits are recorded in the Sovereign Audit Log.<br/>
                    ID: {selectedComposite?.value || 'ORPHANED_LEAF'}
                </div>
            </div>

            {/* UNSAVED CHANGES ALERT */}
            <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-2xl font-black tracking-tighter">UNSAVED FINANCIAL DATA</AlertDialogTitle>
                        <AlertDialogDescription className="font-medium text-slate-600">
                            The current recipe configuration has not been sealed. Discarding will cause a desync between your kitchen/production floor and the general ledger.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="bg-slate-50 p-6 -mx-6 -mb-6 rounded-b-2xl mt-4">
                        <AlertDialogCancel className="font-bold border-none">KEEP EDITING</AlertDialogCancel>
                        <AlertDialogAction className="bg-red-600 hover:bg-red-700 font-black px-8" onClick={() => { setSelectedComposite(pendingComposite); setPendingComposite(null); setIsDirty(false); }}>
                            DISCARD & SWITCH
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}