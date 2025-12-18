'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Check, ChevronsUpDown, Trash2, Loader2, AlertTriangle, PlusCircle, Save } from 'lucide-react';

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

// --- TYPES ---
interface ProductOption { value: number; label: string; }
interface Ingredient { variant_id: number; name: string; quantity_used: number; }
type SaveRecipePayload = { compositeVariantId: number; ingredients: Omit<Ingredient, 'name'>[] };

const supabase = createClient();

// --- ENTERPRISE DATA FETCHING ---

// 1. Fetch Potential Parents and Ingredients (Joined with Product Name)
async function fetchAllVariants(): Promise<ProductOption[]> {
    const { data, error } = await supabase
        .from('product_variants')
        .select('id, name, products(name)')
        .order('id', { ascending: true }); // Enterprise: deterministic ordering
        
    if (error) throw new Error(error.message);
    
    return data.map((v: any) => ({ 
        value: v.id, 
        label: `${v.products?.name || 'Unknown'} - ${v.name}` 
    }));
}

// 2. Fetch Existing Recipe using V2 RPC
async function fetchRecipe(compositeVariantId: number): Promise<Ingredient[]> {
    const { data, error } = await supabase.rpc('get_composite_details_v2', { p_variant_id: compositeVariantId });
    if (error) throw new Error(error.message);
    
    // Map the RPC response structure to our UI Ingredient type
    const details = data as any; // Type assertion based on known RPC return
    if (!details || !details.components) return [];

    return details.components.map((c: any) => ({
        variant_id: c.component_variant_id,
        name: c.component_name,
        quantity_used: c.quantity
    }));
}

// 3. Save Recipe using V2 RPC (Transactional)
async function saveRecipe({ compositeVariantId, ingredients }: SaveRecipePayload) {
    // A. First, fetch the current details of the parent (Name/SKU) 
    // because the upsert function requires them to maintain data integrity.
    const { data: parentData, error: parentError } = await supabase
        .from('product_variants')
        .select('sku, products(name)')
        .eq('id', compositeVariantId)
        .single();

    if (parentError) throw new Error("Could not verify parent product details.");

    const parentName = (parentData.products as any)?.name || 'Composite Product';
    const parentSku = parentData.sku || '';

    // B. Prepare components for JSONB
    const componentsPayload = ingredients.map(ing => ({
        component_variant_id: ing.variant_id,
        quantity: ing.quantity_used
    }));

    // C. Call the Enterprise V2 Upsert
    const { error } = await supabase.rpc('upsert_composite_product_v2', {
        p_variant_id: compositeVariantId,
        p_name: parentName, // Keep existing name
        p_sku: parentSku,   // Keep existing SKU
        p_components: componentsPayload
    });

    if (error) throw error;
}

// --- UI COMPONENTS ---

const ProductCombobox = ({ options, value, onChange, placeholder, disabled }: { options: ProductOption[], value: ProductOption | null, onChange: (opt: ProductOption | null) => void, placeholder: string, disabled?: boolean }) => {
    const [open, setOpen] = useState(false);
    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between text-muted-foreground" disabled={disabled}>
                    {value ? <span className="text-foreground">{value.label}</span> : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                    <CommandInput placeholder="Search..." />
                    <CommandList>
                        <CommandEmpty>No product found.</CommandEmpty>
                        <CommandGroup className="max-h-[200px] overflow-y-auto">
                            {options.map((option) => (
                                <CommandItem 
                                    key={option.value} 
                                    value={option.label} // Search by label
                                    onSelect={() => { onChange(option); setOpen(false); }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value?.value === option.value ? "opacity-100" : "opacity-0")} />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const RecipeTable = ({ ingredients, onUpdate, onRemove }: { ingredients: Ingredient[], onUpdate: (index: number, qty: number) => void, onRemove: (variantId: number) => void }) => {
    if (ingredients.length === 0) return (
        <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-md bg-muted/10 text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mb-2 opacity-50" />
            <p>No ingredients added yet.</p>
            <p className="text-xs">Use the search above to add components.</p>
        </div>
    );
    
    return (
        <div className="border rounded-md overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-muted/50">
                        <TableHead>Ingredient</TableHead>
                        <TableHead className="w-[150px]">Quantity Required</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {ingredients.map((ing, index) => (
                        <TableRow key={ing.variant_id}>
                            <TableCell className="font-medium">{ing.name}</TableCell>
                            <TableCell>
                                <Input 
                                    type="number" 
                                    min="0.01" 
                                    step="0.01"
                                    value={ing.quantity_used} 
                                    onChange={e => onUpdate(index, Math.max(0, Number(e.target.value)))} 
                                    className="max-w-[120px]" 
                                />
                            </TableCell>
                            <TableCell>
                                <Button variant="ghost" size="icon" onClick={() => onRemove(ing.variant_id)} className="hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

const BuilderSkeleton = () => (
    <Card>
        <CardHeader>
            <CardTitle>Recipe Builder</CardTitle>
            <CardDescription>Loading inventory data...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-40 w-full" />
        </CardContent>
    </Card>
);

// --- MAIN COMPONENT ---

export default function CompositeBuilder() {
    const queryClient = useQueryClient();
    const [selectedComposite, setSelectedComposite] = useState<ProductOption | null>(null);
    const [selectedIngredient, setSelectedIngredient] = useState<ProductOption | null>(null);
    const [ingredients, setIngredients] = useState<Ingredient[]>([]);
    const [isDirty, setIsDirty] = useState(false);
    const [pendingComposite, setPendingComposite] = useState<ProductOption | null>(null);

    // 1. Load All Variants
    const { data: allVariants, isLoading: isLoadingVariants } = useQuery({ 
        queryKey: ['allVariants'], 
        queryFn: fetchAllVariants 
    });
    
    // 2. Fetch Recipe when Composite Selected
    const { data: originalRecipe, isLoading: isLoadingRecipe } = useQuery({ 
        queryKey: ['recipe', selectedComposite?.value], 
        queryFn: () => fetchRecipe(selectedComposite!.value), 
        enabled: !!selectedComposite
    });

    // 3. Sync State with Fetched Recipe
    useEffect(() => {
        if (selectedComposite && originalRecipe) {
            setIngredients(originalRecipe);
            setIsDirty(false);
        } else if (selectedComposite && !originalRecipe && !isLoadingRecipe) {
            // New recipe case
            setIngredients([]);
            setIsDirty(false);
        }
    }, [originalRecipe, selectedComposite, isLoadingRecipe]);

    // 4. Save Mutation
    const mutation = useMutation({
        mutationFn: saveRecipe,
        onSuccess: () => {
            toast.success("Recipe configuration saved.");
            queryClient.invalidateQueries({ queryKey: ['recipe', selectedComposite?.value] });
            // Also refresh main list
            queryClient.invalidateQueries({ queryKey: ['composites'] }); 
            setIsDirty(false);
        },
        onError: (error) => toast.error(`Error: ${error.message}`),
    });

    // Logic to prevent circular dependency (Item cannot be an ingredient of itself)
    const ingredientOptions = useMemo(() => {
        return allVariants?.filter(v => v.value !== selectedComposite?.value && !ingredients.some(i => i.variant_id === v.value)) || [];
    }, [allVariants, selectedComposite, ingredients]);

    const handleCompositeChange = (newComposite: ProductOption | null) => {
        if (isDirty) { 
            setPendingComposite(newComposite); 
        } else { 
            setSelectedComposite(newComposite); 
            setIngredients([]); // Clear previous
        }
    };
    
    const handleAddIngredient = () => {
        if (!selectedIngredient) return;
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
        if (ingredients.length === 0) {
            toast.error("A recipe must have at least one ingredient.");
            return;
        }
        mutation.mutate({ 
            compositeVariantId: selectedComposite.value, 
            ingredients: ingredients.map(({ name, ...rest }) => rest) 
        });
    };

    if (isLoadingVariants) return <BuilderSkeleton />;

    return (
        <Card className="h-full border-0 shadow-none sm:border sm:shadow-sm">
            <CardHeader>
                <CardTitle>Recipe Configuration</CardTitle>
                <CardDescription>
                    Select a product to define its Bill of Materials (BOM).
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                
                {/* STEP 1: SELECT PARENT */}
                <div className="space-y-2 max-w-xl">
                    <Label className="text-base font-semibold">1. Select Finished Product</Label>
                    <ProductCombobox 
                        options={allVariants || []} 
                        value={selectedComposite} 
                        onChange={handleCompositeChange} 
                        placeholder="Search for product to configure..." 
                    />
                </div>
                
                <div className={cn("space-y-4 border-t pt-6 transition-opacity duration-300", !selectedComposite && "opacity-50 pointer-events-none")}>
                    
                    {/* STEP 2: ADD INGREDIENTS */}
                    <div className="space-y-3">
                        <Label className="text-base font-semibold">2. Add Ingredients & Quantities</Label>
                        <div className="flex flex-col sm:flex-row gap-3">
                            <div className="flex-1">
                                <ProductCombobox 
                                    options={ingredientOptions} 
                                    value={selectedIngredient} 
                                    onChange={setSelectedIngredient} 
                                    placeholder="Search for an ingredient..." 
                                />
                            </div>
                            <Button onClick={handleAddIngredient} disabled={!selectedIngredient}>
                                <PlusCircle className="mr-2 h-4 w-4" /> Add Ingredient
                            </Button>
                        </div>
                    </div>

                    {/* TABLE */}
                    <RecipeTable 
                        ingredients={ingredients} 
                        onUpdate={handleUpdateQuantity} 
                        onRemove={handleRemoveIngredient} 
                    />

                    {/* FOOTER ACTIONS */}
                    <div className="flex justify-between items-center pt-4 border-t mt-4">
                        <div className="text-sm text-muted-foreground">
                            {ingredients.length} items in recipe
                        </div>
                        <Button 
                            onClick={handleSave} 
                            disabled={!isDirty || mutation.isPending || !selectedComposite}
                            size="lg"
                        >
                            {mutation.isPending ? (
                                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</>
                            ) : (
                                <><Save className="mr-2 h-4 w-4" /> Save Configuration</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* UNSAVED CHANGES ALERT */}
                <AlertDialog open={!!pendingComposite} onOpenChange={() => setPendingComposite(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
                            <AlertDialogDescription>
                                You have unsaved changes in the current recipe. Do you want to discard them and switch products?
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep Editing</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { 
                                setSelectedComposite(pendingComposite); 
                                setIsDirty(false); 
                                setPendingComposite(null); 
                            }}>
                                Discard & Switch
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardContent>
        </Card>
    );
}