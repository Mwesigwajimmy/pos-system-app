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
import { PlusCircle, Loader2, PiggyBank } from 'lucide-react';
import { toast } from 'sonner';

interface SavingsProduct {
    id: number;
    product_name: string;
    interest_rate: number;
    min_balance: number;
}

// REAL RPC FUNCTION CALLS
async function getSavingsProducts(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('savings_products')
        .select('*')
        .eq('tenant_id', tenantId);
        
    if (error) throw new Error(error.message);
    return data as SavingsProduct[];
}

async function createSavingsProduct(newProduct: { name: string, interest_rate: number, tenant_id: string }) {
    const supabase = createClient();
    const { error } = await supabase.from('savings_products').insert([{
        product_name: newProduct.name,
        interest_rate: newProduct.interest_rate,
        tenant_id: newProduct.tenant_id,
        is_active: true
    }]);
    if (error) throw error;
}

export default function SavingsProductsManager({ tenantId }: { tenantId: string }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [name, setName] = useState('');
    const [interestRate, setInterestRate] = useState<string>('');
    const queryClient = useQueryClient();

    const { data: products, isLoading } = useQuery({
        queryKey: ['saccoSavingsProducts', tenantId],
        queryFn: () => getSavingsProducts(tenantId),
    });

    const createMutation = useMutation({
        mutationFn: createSavingsProduct,
        onSuccess: () => {
            toast.success('Savings Product created successfully!');
            queryClient.invalidateQueries({ queryKey: ['saccoSavingsProducts', tenantId] });
            setIsDialogOpen(false);
            setName('');
            setInterestRate('');
        },
        onError: (error: any) => {
            toast.error(`Failed to create product: ${error.message}`);
        },
    });

    const handleSubmit = () => {
        if (!name || !interestRate) {
            return toast.error('Please fill all fields.');
        }
        createMutation.mutate({
            name,
            interest_rate: parseFloat(interestRate),
            tenant_id: tenantId
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-t-4 border-t-green-600 shadow-sm">
                <CardHeader className="flex flex-row justify-between items-start">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <PiggyBank className="w-5 h-5 text-green-600"/> Savings Products
                        </CardTitle>
                        <CardDescription>Manage interest rates and types of savings accounts.</CardDescription>
                    </div>
                    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-green-600 hover:bg-green-700 text-white">
                                <PlusCircle className="mr-2 h-4 w-4" /> New Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create Savings Product</DialogTitle>
                                <DialogDescription>Define a new type of savings account.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Product Name</Label>
                                    <Input id="name" placeholder="e.g., Holiday Savings" value={name} onChange={(e) => setName(e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="interestRate">Annual Interest Rate (%)</Label>
                                    <Input 
                                        id="interestRate" 
                                        type="number" 
                                        step="0.1" 
                                        placeholder="5.0" 
                                        value={interestRate} 
                                        onChange={(e) => setInterestRate(e.target.value)} 
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                                <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                                    {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Product
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead>Product Name</TableHead>
                                    <TableHead className="text-right">Annual Interest Rate</TableHead>
                                    <TableHead className="text-right">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
                                ) : products && products.length > 0 ? (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                            <TableCell className="font-medium">{product.product_name}</TableCell>
                                            <TableCell className="text-right">{product.interest_rate}%</TableCell>
                                            <TableCell className="text-right"><span className="text-green-600 text-xs bg-green-50 px-2 py-1 rounded-full">Active</span></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow><TableCell colSpan={3} className="text-center h-24 text-muted-foreground">No savings products configured.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}