'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { Pencil, PlusCircle } from 'lucide-react';

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
    // Using a Supabase function is a good practice for encapsulating DB logic
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

export default function CategoriesPage() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);
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
            // Correctly handle the switch value which can be 'on' or null
            is_kitchen_category: formData.get('is_kitchen_category') === 'on',
        };

        // If we are editing, add the ID to the payload for the upsert operation
        if (editingCategory) {
            dataToUpsert.id = editingCategory.id;
        }

        mutate(dataToUpsert);
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <div className="flex justify-between items-center">
                    <h1 className="text-3xl font-bold">Product Categories</h1>
                    <DialogTrigger asChild>
                        <Button onClick={() => handleOpenDialog(null)}>
                           <PlusCircle className="mr-2 h-4 w-4" />
                           Create New Category
                        </Button>
                    </DialogTrigger>
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
            
                <div className="rounded-md border bg-card">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Description</TableHead>
                                <TableHead>Kitchen Category</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading && (
                                <TableRow><TableCell colSpan={4} className="text-center h-24">Loading...</TableCell></TableRow>
                            )}
                            {queryError && (
                                <TableRow><TableCell colSpan={4} className="text-center h-24 text-red-500">Failed to load categories.</TableCell></TableRow>
                            )}
                            {categories?.map((cat) => (
                                <TableRow key={cat.id}>
                                    <TableCell className="font-medium">{cat.name}</TableCell>
                                    <TableCell>{cat.description || 'N/A'}</TableCell>
                                    <TableCell>{cat.is_kitchen_category ? 'Yes' : 'No'}</TableCell>
                                    <TableCell className="text-right">
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={() => handleOpenDialog(cat)}>
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