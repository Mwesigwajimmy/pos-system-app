'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox'; // Added for selection
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Pencil, PlusCircle, Trash2, AlertTriangle, Loader2 } from 'lucide-react';

// Interface defining the shape of a Category object
interface Category {
    id: number;
    name: string;
    description: string | null;
    is_kitchen_category: boolean;
}

// Function to fetch all categories from Supabase
async function fetchCategories(): Promise<Category[]> {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_all_categories');
    if (error) throw new Error(error.message);
    return data || [];
}

// Function to create or update a category
async function upsertCategory(categoryData: Partial<Category>) {
    const supabase = createClient();
    const { error } = await supabase.from('categories').upsert(categoryData);
    if (error) throw new Error(error.message);
}

// Logic: Function to delete multiple categories
async function deleteCategories(ids: number[]) {
    const supabase = createClient();
    const { error } = await supabase
        .from('categories')
        .delete()
        .in('id', ids);
    
    if (error) {
        // Handle specific Foreign Key constraint errors (23503)
        if (error.code === '23503') {
            throw new Error("Cannot delete categories that are currently linked to products or procurement strategies.");
        }
        throw new Error(error.message);
    }
}

export default function CategoriesView() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
    const [selectedIds, setSelectedIds] = useState<number[]>([]); // Logic: Track selection
    const queryClient = useQueryClient();

    // Query to fetch categories data
    const { data: categories, isLoading, error: queryError } = useQuery({ 
        queryKey: ['categories'], 
        queryFn: fetchCategories 
    });

    // Mutation for creating/updating categories
    const { mutate, isPending } = useMutation({
        mutationFn: upsertCategory,
        onSuccess: () => {
            toast.success(`Category ${editingCategory ? 'updated' : 'created'} successfully!`);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
            setIsDialogOpen(false);
            setEditingCategory(null);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    // Logic: Mutation for deleting categories
    const deleteMutation = useMutation({
        mutationFn: deleteCategories,
        onSuccess: () => {
            toast.success("Selected categories removed successfully.");
            setSelectedIds([]);
            queryClient.invalidateQueries({ queryKey: ['categories'] });
        },
        onError: (error: any) => {
            toast.error(error.message);
        }
    });

    // Handler to open the dialog for editing an existing category or creating a new one
    const handleOpenDialog = (category: Category | null) => {
        setEditingCategory(category);
        setIsDialogOpen(true);
    };

    // Handler for form submission
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const dataToUpsert: Partial<Category> = {
            name: formData.get('name') as string,
            description: formData.get('description') as string,
            is_kitchen_category: formData.get('is_kitchen_category') === 'on',
        };

        if (editingCategory) {
            dataToUpsert.id = editingCategory.id;
        }

        mutate(dataToUpsert);
    };

    // Selection Logic: Toggle individual row
    const toggleRow = (id: number) => {
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    // Selection Logic: Toggle all rows
    const toggleAll = (checked: boolean) => {
        if (checked && categories) {
            setSelectedIds(categories.map(c => c.id));
        } else {
            setSelectedIds([]);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <div className="flex justify-between items-center">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold tracking-tight">Product Categories</h1>
                        <p className="text-sm text-muted-foreground">Manage and organize your industrial and manufacturing classifications.</p>
                    </div>
                    
                    <div className="flex items-center gap-3">
                        {/* Logic: Only show delete button when categories are selected */}
                        {selectedIds.length > 0 && (
                            <Button 
                                variant="destructive" 
                                className="bg-rose-600 hover:bg-rose-700 animate-in fade-in slide-in-from-right-4"
                                onClick={() => {
                                    if(confirm(`Are you sure you want to delete ${selectedIds.length} categories? This action cannot be undone if they are empty.`)) {
                                        deleteMutation.mutate(selectedIds);
                                    }
                                }}
                                disabled={deleteMutation.isPending}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                {deleteMutation.isPending ? 'Deleting...' : `Delete Selected (${selectedIds.length})`}
                            </Button>
                        )}

                        <DialogTrigger asChild>
                            <Button onClick={() => handleOpenDialog(null)} className="shadow-lg">
                               <PlusCircle className="mr-2 h-4 w-4" />
                               Create New Category
                            </Button>
                        </DialogTrigger>
                    </div>
                </div>

                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>{editingCategory ? 'Edit Category' : 'Create a New Category'}</DialogTitle>
                        <DialogDescription>
                            {editingCategory ? `You are editing "${editingCategory.name}".` : 'Fill in the details for the new category.'}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 py-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="name" className="text-right">Name</Label>
                            <Input id="name" name="name" defaultValue={editingCategory?.name || ''} className="col-span-3" required />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="description" className="text-right">Description</Label>
                            <Input id="description" name="description" defaultValue={editingCategory?.description || ''} className="col-span-3" />
                        </div>
                        <div className="flex items-center space-x-2 justify-end pr-4">
                             <Switch id="is_kitchen_category" name="is_kitchen_category" defaultChecked={editingCategory?.is_kitchen_category || false} />
                             <Label htmlFor="is_kitchen_category">Is Kitchen Category?</Label>
                        </div>
                        <DialogFooter>
                            <DialogClose asChild>
                                <Button type="button" variant="ghost">Cancel</Button>
                            </DialogClose>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? 'Saving...' : 'Save Category'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            
                <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-slate-50/50">
                            <TableRow>
                                {/* Logic: Checkbox Header */}
                                <TableHead className="w-12 text-center">
                                    <Checkbox 
                                        checked={selectedIds.length === categories?.length && categories.length > 0}
                                        onCheckedChange={(checked) => toggleAll(!!checked)}
                                    />
                                </TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Name</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Description</TableHead>
                                <TableHead className="font-bold uppercase text-[10px] tracking-widest text-slate-500">Kitchen Category</TableHead>
                                <TableHead className="text-right font-bold uppercase text-[10px] tracking-widest text-slate-500">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow><TableCell colSpan={5} className="text-center h-40"><Loader2 className="animate-spin h-6 w-6 mx-auto text-blue-600" /></TableCell></TableRow>
                            )}
                            {queryError && (
                                <TableRow><TableCell colSpan={5} className="text-center h-40 text-rose-500 font-medium">Failed to synchronize categories.</TableCell></TableRow>
                            )}
                            {!isLoading && categories?.length === 0 && (
                                <TableRow><TableCell colSpan={5} className="text-center h-40 text-slate-400">No categories found in this business unit.</TableCell></TableRow>
                            )}
                            {categories?.map((cat) => (
                                <TableRow key={cat.id} className="hover:bg-slate-50/50 transition-colors">
                                    {/* Logic: Checkbox Cell */}
                                    <TableCell className="text-center">
                                        <Checkbox 
                                            checked={selectedIds.includes(cat.id)} 
                                            onCheckedChange={() => toggleRow(cat.id)}
                                        />
                                    </TableCell>
                                    <TableCell className="font-bold text-slate-900">{cat.name}</TableCell>
                                    <TableCell className="text-slate-500">{cat.description || '---'}</TableCell>
                                    <TableCell>
                                        {cat.is_kitchen_category ? (
                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-none px-2 py-0">Kitchen</Badge>
                                        ) : (
                                            <span className="text-slate-300 text-xs">Standard</span>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DialogTrigger asChild>
                                            <Button variant="ghost" size="sm" onClick={() => handleOpenDialog(cat)} className="hover:text-blue-600">
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                        </DialogTrigger>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </Dialog>
        </div>
    );
}