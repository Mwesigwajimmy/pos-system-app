// src/components/sacco/SavingsProductsManager.tsx

'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

// REAL RPC FUNCTION CALLS
async function getSavingsProducts() {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('get_sacco_savings_products');
    if (error) throw new Error(error.message);
    return data;
}

async function createSavingsProduct(newProduct: { name: string, interest_rate: number }) {
    const supabase = createClient();
    const { error } = await supabase.rpc('create_sacco_savings_product', {
        p_product_name: newProduct.name,
        p_interest_rate: newProduct.interest_rate
    });
    if (error) throw error;
}

export default function SavingsProductsManager() {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [interestRate, setInterestRate] = useState<number | ''>('');
    const queryClient = useQueryClient();

    const { data: products, isLoading } = useQuery({
        queryKey: ['saccoSavingsProducts'],
        queryFn: getSavingsProducts,
    });

    const createMutation = useMutation({
        mutationFn: createSavingsProduct,
        onSuccess: () => {
            toast.success('Savings Product created successfully!');
            queryClient.invalidateQueries({ queryKey: ['saccoSavingsProducts'] });
            queryClient.invalidateQueries({ queryKey: ['saccoMemberAccounts'] }); // To update member views
            setIsDialogOpen(false);
            setName('');
            setInterestRate('');
        },
        onError: (error: any) => {
            toast.error(`Failed to create product: ${error.message}`);
        },
    });

    const handleSubmit = () => {
        if (!name || interestRate === '') {
            return toast.error('Please fill all fields: Name and Interest Rate.');
        }
        createMutation.mutate({
            name,
            interest_rate: Number(interestRate),
        });
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle>Manage Savings Products</CardTitle>
                        <CardDescription>Create and manage the different types of savings accounts your SACCO offers members.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> New Savings Product</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create a New Savings Product</DialogTitle>
                                <DialogDescription>Define a new type of savings account, like "Fixed Deposit" or "Education Savings".</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div>
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input id="name" placeholder="e.g., General Savings" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="interestRate">Annual Interest Rate (%)</Label>
                                    <Input id="interestRate" type="number" placeholder="5.0" value={interestRate} onChange={(e) => setInterestRate(Number(e.target.value))} />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Product
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product Name</TableHead>
                                <TableHead className="text-right">Annual Interest Rate</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? <TableRow><TableCell colSpan={2} className="text-center h-24">Loading products...</TableCell></TableRow> :
                             products && products.length > 0 ? products.map((product: any) => (
                                <TableRow key={product.id}>
                                    <TableCell className="font-medium">{product.product_name}</TableCell>
                                    <TableCell className="text-right">{product.interest_rate}%</TableCell>
                                </TableRow>
                             )) :
                             <TableRow><TableCell colSpan={2} className="text-center h-24">No savings products created yet.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}