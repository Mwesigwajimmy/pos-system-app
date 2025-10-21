'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { PlusCircle, MoreHorizontal, Edit, Trash2, Loader2, Hammer } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Badge } from '@/components/ui/badge';

// --- ENHANCED TYPES ---
interface Component {
  component_variant_id: number;
  component_name: string;
  quantity: number;
  available_stock?: number;
}
interface CompositeProduct {
  id: number;
  name: string;
  sku: string;
  total_components: number;
  current_stock: number;
}
interface CompositeProductDetails extends Omit<CompositeProduct, 'total_components' | 'current_stock'> {
  components: Component[];
}
interface StandardVariantOption {
  value: number;
  label: string;
}
interface LocationOption {
    value: number;
    label: string;
}


// --- API FUNCTIONS ---
const supabase = createClient();

async function fetchComposites(): Promise<CompositeProduct[]> {
    const { data, error } = await supabase.rpc('get_composite_products_with_stock');
    if (error) throw new Error(error.message);
    return data || [];
}

async function fetchStandardVariants(): Promise<StandardVariantOption[]> {
    const { data, error } = await supabase.from('product_variants').select('id, name').eq('is_composite', false);
    if (error) throw new Error(error.message);
    return data.map(v => ({ value: v.id, label: v.name })) || [];
}

async function fetchCompositeDetails(id: number): Promise<CompositeProductDetails> {
    const { data, error } = await supabase.rpc('get_composite_details', { p_variant_id: id });
    if (error) throw new Error(error.message);
    return data;
}

async function fetchLocations(): Promise<LocationOption[]> {
    const { data, error } = await supabase.from('locations').select('id, name');
    if (error) throw new Error(error.message);
    return data.map(l => ({ value: l.id, label: l.name })) || [];
}

async function upsertComposite(compositeData: { id: number | null, name: string, sku: string, components: { component_variant_id: number, quantity: number }[] }) {
    const { error } = await supabase.rpc('upsert_composite_product', {
        p_variant_id: compositeData.id,
        p_name: compositeData.name,
        p_sku: compositeData.sku,
        p_components: compositeData.components
    });
    if (error) throw error;
}

async function deleteComposite(id: number) {
    const { error } = await supabase.rpc('delete_composite_product', { p_variant_id: id });
    if (error) throw error;
}

async function processAssembly(payload: { p_composite_variant_id: number, p_quantity_to_assemble: number, p_source_location_id: number }) {
    const { error } = await supabase.rpc('process_assembly', payload);
    if (error) throw error;
}

// --- FORM COMPONENT ---
function CompositeProductForm({ initialData, onSave, onCancel, isSaving }: { initialData: Partial<CompositeProductDetails> | null; onSave: (data: any) => void; onCancel: () => void; isSaving: boolean; }) {
    const [name, setName] = useState(initialData?.name || '');
    const [sku, setSku] = useState(initialData?.sku || '');
    const [components, setComponents] = useState<Component[]>(initialData?.components || []);
    const [selectedComponent, setSelectedComponent] = useState<StandardVariantOption | null>(null);

    const { data: standardVariants } = useQuery({ queryKey: ['standardVariants'], queryFn: fetchStandardVariants });
    
    const handleAddComponent = () => {
        if (!selectedComponent) return;
        if (components.some(c => c.component_variant_id === selectedComponent.value)) return toast.warning("Component already added.");
        setComponents(prev => [...prev, { component_variant_id: selectedComponent.value, component_name: selectedComponent.label, quantity: 1 }]);
        setSelectedComponent(null);
    };
    
    const handleUpdateQuantity = (variantId: number, qty: number) => setComponents(prev => prev.map(c => c.component_variant_id === variantId ? { ...c, quantity: Math.max(1, qty) } : c));
    const handleRemoveComponent = (variantId: number) => setComponents(prev => prev.filter(c => c.component_variant_id !== variantId));

    const handleSubmit = () => {
        if (!name) return toast.error("Composite product name is required.");
        if (components.length === 0) return toast.error("Please add at least one component.");
        
        const payload = {
            id: initialData?.id || null,
            name,
            sku,
            components: components.map(({ component_variant_id, quantity }) => ({ component_variant_id, quantity })),
        };
        onSave(payload);
    };
    
    const componentOptions = useMemo(() => standardVariants?.filter(v => !components.some(c => c.component_variant_id === v.value)) || [], [standardVariants, components]);

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label htmlFor="name">Product Name</Label><Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Gift Basket"/></div>
                <div className="space-y-2"><Label htmlFor="sku">SKU</Label><Input id="sku" value={sku} onChange={e => setSku(e.target.value)} placeholder="e.g., GB-001" /></div>
            </div>

            <div className="space-y-2 pt-4 border-t"><Label>Components</Label>
                <div className="flex gap-2">
                    <div className="flex-1"><Combobox options={componentOptions} value={selectedComponent} onChange={setSelectedComponent} placeholder="Search for a component to add..."/></div>
                    <Button onClick={handleAddComponent} disabled={!selectedComponent}><PlusCircle className="mr-2 h-4 w-4"/>Add</Button>
                </div>
            </div>

            <div className="max-h-64 overflow-y-auto border rounded-md"><Table>
                <TableHeader><TableRow><TableHead>Component</TableHead><TableHead className="w-[100px]">Quantity</TableHead><TableHead className="w-[50px]"></TableHead></TableRow></TableHeader>
                <TableBody>
                    {components.length === 0 ? <TableRow><TableCell colSpan={3} className="text-center h-24">No components added.</TableCell></TableRow> :
                    components.map(comp => (
                        <TableRow key={comp.component_variant_id}>
                            <TableCell>{comp.component_name}</TableCell>
                            <TableCell><Input type="number" value={comp.quantity} onChange={e => handleUpdateQuantity(comp.component_variant_id, parseInt(e.target.value))} className="max-w-[80px]"/> </TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => handleRemoveComponent(comp.component_variant_id)}><Trash2 className="h-4 w-4 text-destructive"/></Button></TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table></div>
            
            <DialogFooter>
                <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSaving}>{isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : 'Save Composite Product'}</Button>
            </DialogFooter>
        </div>
    );
}

// --- NEW: AssemblyDialog Component ---
function AssemblyDialog({ product, onClose }: { product: CompositeProduct; onClose: () => void; }) {
    const queryClient = useQueryClient();
    const [quantity, setQuantity] = useState(1);
    const [sourceLocationId, setSourceLocationId] = useState<string | null>(null);
    
    const { data: recipe, isLoading: isLoadingRecipe } = useQuery({
        queryKey: ['compositeDetailsWithStock', product.id, sourceLocationId],
        queryFn: async () => {
            const { data, error } = await supabase.rpc('get_composite_details_with_stock', {
                p_variant_id: product.id,
                p_location_id: sourceLocationId ? parseInt(sourceLocationId) : null
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
            toast.success(`${quantity}x "${product.name}" assembled successfully!`);
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            onClose();
        },
        onError: (err: Error) => toast.error(`Assembly failed: ${err.message}`)
    });
    
    const canAssemble = recipe && recipe.components.every(c => (c.available_stock || 0) >= c.quantity * quantity);

    const handleSubmit = () => {
        if (!sourceLocationId) return toast.error("Please select a source location.");
        if (quantity <= 0) return toast.error("Quantity must be greater than zero.");
        assemblyMutation.mutate({
            p_composite_variant_id: product.id,
            p_quantity_to_assemble: quantity,
            p_source_location_id: parseInt(sourceLocationId)
        });
    };

    return (
        <Dialog open={true} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>Assemble: {product.name}</DialogTitle>
                    <DialogDescription>Create new units of this composite product by consuming its components.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Quantity to Assemble</Label>
                            <Input type="number" value={quantity} onChange={e => setQuantity(Math.max(1, parseInt(e.target.value)))} />
                        </div>
                        <div>
                            <Label>Source Location (for components)</Label>
                            <Select onValueChange={setSourceLocationId}>
                                <SelectTrigger><SelectValue placeholder="Select warehouse..." /></SelectTrigger>
                                <SelectContent>
                                    {locations?.map(l => <SelectItem key={l.value} value={l.value.toString()}>{l.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    {isLoadingRecipe && sourceLocationId && <div className="text-center p-4"><Loader2 className="h-6 w-6 animate-spin mx-auto"/></div>}
                    {recipe && (
                        <Card>
                            <CardHeader><CardTitle className="text-base">Required Components</CardTitle></CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Component</TableHead>
                                            <TableHead>Required</TableHead>
                                            <TableHead>Available</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {recipe.components.map(c => {
                                            const required = c.quantity * quantity;
                                            const available = c.available_stock || 0;
                                            const hasEnough = available >= required;
                                            return (
                                                <TableRow key={c.component_variant_id} className={!hasEnough ? 'bg-destructive/10' : ''}>
                                                    <TableCell>{c.component_name}</TableCell>
                                                    <TableCell>{required}</TableCell>
                                                    <TableCell className={!hasEnough ? 'font-bold text-destructive' : ''}>{available}</TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )}
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={!canAssemble || assemblyMutation.isPending || !sourceLocationId}>
                        {assemblyMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                        Confirm Assembly
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// --- MAIN PAGE COMPONENT ---
export default function CompositesView() {
    const queryClient = useQueryClient();
    const [isFormOpen, setFormOpen] = useState(false);
    const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [isAssemblyDialogOpen, setAssemblyDialogOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<CompositeProduct | null>(null);

    const { data: composites, isLoading, isError, error } = useQuery({ queryKey: ['composites'], queryFn: fetchComposites });
    
    const { data: editingProductDetails, isLoading: isLoadingDetails } = useQuery({
        queryKey: ['compositeDetails', selectedProduct?.id],
        queryFn: () => fetchCompositeDetails(selectedProduct!.id),
        enabled: !!selectedProduct && isFormOpen,
    });

    const upsertMutation = useMutation({
        mutationFn: upsertComposite,
        onSuccess: () => {
            toast.success("Composite product saved successfully!");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setFormOpen(false);
        },
        onError: (err: Error) => toast.error(`Failed to save: ${err.message}`),
    });

    const deleteMutation = useMutation({
        mutationFn: deleteComposite,
        onSuccess: () => {
            toast.success("Composite product deleted.");
            queryClient.invalidateQueries({ queryKey: ['composites'] });
            setDeleteConfirmOpen(false);
        },
        onError: (err: Error) => toast.error(`Failed to delete: ${err.message}`),
    });
    
    const handleAddNew = () => { setSelectedProduct(null); setFormOpen(true); };
    const handleEdit = (product: CompositeProduct) => { setSelectedProduct(product); setFormOpen(true); };
    const handleDelete = (product: CompositeProduct) => { setSelectedProduct(product); setDeleteConfirmOpen(true); };
    const handleAssemble = (product: CompositeProduct) => { setSelectedProduct(product); setAssemblyDialogOpen(true); };

    return (
        <>
            <div className="p-4 sm:p-6 lg:p-8 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight">Manufacturing & Assembly</h1>
                        <p className="text-muted-foreground">Define recipes and assemble finished goods from components.</p>
                    </div>
                    <Button onClick={handleAddNew}><PlusCircle className="mr-2 h-4 w-4" /> New Recipe</Button>
                </div>

                <Card>
                    <CardHeader><CardTitle>Composite Product Recipes</CardTitle></CardHeader>
                    <CardContent>
                        {isLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        ) : isError ? (
                            <div className="text-destructive text-center p-4">Error loading products: {error.message}</div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Product Name</TableHead>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Components</TableHead>
                                        <TableHead>Stock on Hand</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {composites?.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="h-24 text-center">
                                                No composite products found. Create a recipe to get started.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        composites?.map(product => (
                                            <TableRow key={product.id}>
                                                <TableCell className="font-medium">{product.name}</TableCell>
                                                <TableCell>{product.sku}</TableCell>
                                                <TableCell><Badge variant="secondary">{product.total_components}</Badge></TableCell>
                                                <TableCell className="font-bold">{product.current_stock}</TableCell>
                                                <TableCell>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={() => handleAssemble(product)}><Hammer className="mr-2 h-4 w-4"/>Assemble Product</DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleEdit(product)}><Edit className="mr-2 h-4 w-4"/>Edit Recipe</DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(product)}><Trash2 className="mr-2 h-4 w-4"/>Delete Recipe</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
            
            <Dialog open={isFormOpen} onOpenChange={setFormOpen}>
                <DialogContent className="sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{selectedProduct ? 'Edit Composite Product Recipe' : 'Create New Composite Recipe'}</DialogTitle>
                        <DialogDescription>A recipe defines the components required to create one unit of this product.</DialogDescription>
                    </DialogHeader>
                    {isLoadingDetails ? (
                        <div className="py-10 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>
                    ) : (
                        <CompositeProductForm 
                            initialData={selectedProduct ? (editingProductDetails || null) : null}
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently delete the recipe for "{selectedProduct?.name}". This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive hover:bg-destructive/90" onClick={() => deleteMutation.mutate(selectedProduct!.id)}>
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}