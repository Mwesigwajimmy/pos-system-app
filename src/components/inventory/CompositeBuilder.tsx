'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Trash2, Loader2, AlertTriangle, PlusCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface ProductOption { value: number; label: string; }
interface Ingredient { variant_id: number; name: string; quantity_used: number; }
type SaveRecipePayload = { compositeVariantId: number; ingredients: Omit<Ingredient, 'name'>[] };

const supabase = createClient();

async function fetchAllVariants(): Promise<ProductOption[]> {
    const { data, error } = await supabase.from('product_variants').select('id, name, products(name)');
    if (error) throw new Error(error.message);
    return data.map(v => ({ value: v.id, label: `${v.products?.[0]?.name || 'Product'} - ${v.name}` }));
}

async function fetchRecipe(compositeVariantId: number): Promise<Ingredient[]> {
    const { data, error } = await supabase.from('composite_item_components').select('quantity_used, ingredient:ingredient_variant_id(id, name, products(name))').eq('composite_variant_id', compositeVariantId);
    if (error) throw new Error(error.message);
    return data.map(c => {
        const ingredientData = c.ingredient![0];
        return {
            variant_id: ingredientData.id,
            name: `${ingredientData.products?.[0]?.name || 'Product'} - ${ingredientData.name}`,
            quantity_used: c.quantity_used
        };
    });
}

async function saveRecipe({ compositeVariantId, ingredients }: SaveRecipePayload) {
    const { error: deleteError } = await supabase.from('composite_item_components').delete().eq('composite_variant_id', compositeVariantId);
    if (deleteError) throw deleteError;
    if (ingredients.length > 0) {
        const itemsToInsert = ingredients.map(ing => ({ composite_variant_id: compositeVariantId, ingredient_variant_id: ing.variant_id, quantity_used: ing.quantity_used }));
        const { error: insertError } = await supabase.from('composite_item_components').insert(itemsToInsert);
        if (insertError) throw insertError;
    }
}

const ProductCombobox = ({ options, value, onChange, placeholder, disabled }: { options: ProductOption[], value: ProductOption | null, onChange: (opt: ProductOption | null) => void, placeholder: string, disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between" disabled={disabled}>
                    {value ? value.label : placeholder}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command><CommandInput placeholder="Search product..." /><CommandList><CommandEmpty>No product found.</CommandEmpty><CommandGroup>
                    {options.map((option) => (
                        <CommandItem key={option.value} onSelect={() => { onChange(option); setOpen(false); }}>
                            <Check className={cn("mr-2 h-4 w-4", value?.value === option.value ? "opacity-100" : "opacity-0")} />{option.label}
                        </CommandItem>
                    ))}
                </CommandGroup></CommandList></Command>
            </PopoverContent>
        </Popover>
    );
};

const RecipeTable = ({ ingredients, onUpdate, onRemove }: { ingredients: Ingredient[], onUpdate: (index: number, qty: number) => void, onRemove: (variantId: number) => void }) => {
    if (ingredients.length === 0) return <div className="text-center text-sm text-muted-foreground p-8 border-2 border-dashed rounded-md">No ingredients added yet.</div>;
    return (
        <Table>
            <TableHeader><TableRow><TableHead>Ingredient</TableHead><TableHead className="w-[150px]">Quantity Used</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
            <TableBody>
                {ingredients.map((ing, index) => (
                    <TableRow key={ing.variant_id}>
                        <TableCell className="font-medium">{ing.name}</TableCell>
                        <TableCell><Input type="number" min="0" value={ing.quantity_used} onChange={e => onUpdate(index, Math.max(0, Number(e.target.value)))} className="max-w-[120px]" /></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => onRemove(ing.variant_id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );
};

const BuilderSkeleton = () => (
    <Card>
        <CardHeader><CardTitle>Recipe Builder</CardTitle><CardDescription>Define products that are made from other inventory items.</CardDescription></CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2"><Label>1. Select the finished product</Label><Skeleton className="h-10 w-full" /></div>
        </CardContent>
    </Card>
);

export default function CompositeBuilder() {
    const queryClient = useQueryClient();
    const [selectedComposite, setSelectedComposite] = useState<ProductOption | null>(null);
    const [selectedIngredient, setSelectedIngredient] = useState<ProductOption | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingComposite, setPendingComposite] = useState<ProductOption | null>(null);

    const { data: allVariants, isLoading: isLoadingVariants } = useQuery({ queryKey: ['allVariants'], queryFn: fetchAllVariants });
    
    // CORRECTED: The `onSuccess` callback is removed from the query options.
    const { data: originalRecipe } = useQuery({ 
        queryKey: ['recipe', selectedComposite?.value], 
        queryFn: () => fetchRecipe(selectedComposite!.value), 
        enabled: !!selectedComposite
    });

    // CORRECTED: A useEffect hook is now used to handle the side effect of setting state after data fetching.
    useEffect(() => {
        // This effect will run whenever `originalRecipe` changes.
        // The check handles the initial `undefined` state and subsequent fetches.
        if (originalRecipe) {
            setIngredients(originalRecipe || []);
            setIsDirty(false);
        }
    }, [originalRecipe]);


    const mutation = useMutation({
        mutationFn: saveRecipe,
        onSuccess: () => {
            toast.success("Recipe saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['recipe', selectedComposite?.value] });
            setIsDirty(false);
        },
        onError: (error) => toast.error(`Failed to save: ${error.message}`),
    });

    const ingredientOptions = useMemo(() => allVariants?.filter(v => v.value !== selectedComposite?.value) || [], [allVariants, selectedComposite]);

    const handleCompositeChange = (newComposite: ProductOption | null) => {
        if (isDirty) { setPendingComposite(newComposite); }
        else { setSelectedComposite(newComposite); }
    };
    
    const handleAddIngredient = () => {
        if (!selectedIngredient) return;
        if (ingredients.find(i => i.variant_id === selectedIngredient.value)) return toast.error("Ingredient already in recipe.");
        setIngredients([...ingredients, { variant_id: selectedIngredient.value, name: selectedIngredient.label, quantity_used: 1 }]);
        setSelectedIngredient(null);
        setIsDirty(true);
    };

    const handleUpdateQuantity = (index: number, qty: number) => {
        const newIngredients = [...ingredients];
        newIngredients[index].quantity_used = qty;
        setIngredients(newIngredients);
        setIsDirty(true);
    };

    const handleRemoveIngredient = (variantId: number) => {
        setIngredients(ingredients.filter(i => i.variant_id !== variantId));
        setIsDirty(true);
    };
    
    const handleSave = () => {
        if (!selectedComposite) return;
        mutation.mutate({ compositeVariantId: selectedComposite.value, ingredients: ingredients.map(({ name, ...rest }) => rest) });
    };

    if (isLoadingVariants) return <BuilderSkeleton />;

    return (
        <Card>
            <CardHeader><CardTitle>Recipe Builder</CardTitle><CardDescription>Define products made from other inventory items.</CardDescription></CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2 max-w-lg"><Label>1. Select the finished product (the "Composite Item")</Label><ProductCombobox options={allVariants || []} value={selectedComposite} onChange={handleCompositeChange} placeholder="Search for a finished product..." /></div>
                
                <div className={cn("space-y-4 border-t pt-6", !selectedComposite && "opacity-50 pointer-events-none")}>
                    <div className="space-y-2"><Label>2. Add ingredients to the recipe</Label><div className="flex flex-col sm:flex-row gap-2"><div className="flex-1"><ProductCombobox options={ingredientOptions} value={selectedIngredient} onChange={setSelectedIngredient} placeholder="Search for an ingredient..." /></div><Button onClick={handleAddIngredient} disabled={!selectedIngredient}><PlusCircle className="mr-2 h-4 w-4" />Add Ingredient</Button></div></div>
                    <RecipeTable ingredients={ingredients} onUpdate={handleUpdateQuantity} onRemove={handleRemoveIngredient} />
                    <div className="flex justify-end pt-4"><Button onClick={handleSave} disabled={!isDirty || mutation.isPending}>{mutation.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</> : "Save Recipe"}</Button></div>
                </div>

                <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Unsaved Changes</AlertDialogTitle><AlertDialogDescription>You have unsaved changes in the current recipe. Do you want to discard them and switch products?</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setSelectedComposite(pendingComposite); setIsDirty(false); setPendingComposite(null); }}>Discard & Switch</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}