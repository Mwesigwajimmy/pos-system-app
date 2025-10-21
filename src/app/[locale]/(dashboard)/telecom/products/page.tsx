// src/app/(dashboard)/telecom/products/page.tsx
'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

// --- UI & Icon Imports ---
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Edit, Trash2, Boxes } from 'lucide-react';

// --- Custom Component Imports ---
import { AddProductModal } from '@/components/modals/AddProductModal';
import { EditProductModal, Product } from '@/components/modals/EditProductModal';

export default function TelecomProductsPage() {
    const supabase = createClient();
    const queryClient = useQueryClient();

    // State to manage which modals are open
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | null>(null);

    // Fetch all products for the current business (handled by RLS)
    const { data: products, isLoading, isError, error } = useQuery({
        queryKey: ['telecomProducts'],
        queryFn: async (): Promise<Product[]> => {
            const { data, error } = await supabase.rpc('get_telecom_products');
            if (error) throw new Error(error.message);
            return data || [];
        }
    });

    // Mutation for deleting a product
    const { mutate: deleteProduct, isPending: isDeleting } = useMutation({
        mutationFn: async (productId: number) => {
            const { error } = await supabase.rpc('delete_telecom_product', { p_product_id: productId });
            if (error) throw error;
        },
        onSuccess: () => {
            toast.success("Product deleted successfully.");
            queryClient.invalidateQueries({ queryKey: ['telecomProducts'] });
        },
        onError: (err: Error) => toast.error(`Error: ${err.message}`),
    });

    if (isError) { toast.error(`Failed to load products: ${error.message}`); }

    return (
        <div className="p-4 md:p-6 space-y-6">
            <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Product & Service Management</h1>
                    <p className="text-muted-foreground">Add, edit, and manage all sellable telecom products and services.</p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)} className="mt-4 sm:mt-0">
                    <PlusCircle className="mr-2 h-4 w-4" /> Add New Product
                </Button>
            </header>
            
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center"><Boxes className="mr-2"/> All Products</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin" /></div> :
                    !products || products.length === 0 ? <p className="text-center text-muted-foreground py-8">No products have been added yet.</p> : (
                        <Table>
                            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Provider</TableHead><TableHead>Type</TableHead><TableHead>Commission</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                            <TableBody>
                                {products.map(product => (
                                    <TableRow key={product.id}>
                                        <TableCell className="font-medium">{product.name}</TableCell>
                                        <TableCell>{product.provider}</TableCell>
                                        <TableCell>{product.service_type}</TableCell>
                                        <TableCell>{product.commission_rate}%</TableCell>
                                        <TableCell className="text-right space-x-2">
                                            <Button variant="outline" size="sm" onClick={() => setProductToEdit(product)}>
                                                <Edit className="mr-2 h-4 w-4"/> Edit
                                            </Button>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="destructive" size="sm"><Trash2 className="mr-2 h-4 w-4"/> Delete</Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>
                                                        This action cannot be undone. This will permanently delete the product "{product.name}".
                                                    </AlertDialogDescription></AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                        <AlertDialogAction onClick={() => deleteProduct(product.id)} disabled={isDeleting}>
                                                            {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                                            Confirm Delete
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            {/* Render Modals */}
            <AddProductModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
            {productToEdit && <EditProductModal product={productToEdit} isOpen={!!productToEdit} onClose={() => setProductToEdit(null)} />}
        </div>
    );
}