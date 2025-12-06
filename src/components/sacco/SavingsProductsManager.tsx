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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, Loader2, PiggyBank } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface SavingsProduct {
    id: number;
    product_name: string;
    interest_rate: number;
    currency: string;
    is_active: boolean;
}

async function getSavingsProducts(tenantId: string) {
    const supabase = createClient();
    const { data, error } = await supabase
        .from('savings_products')
        .select('*')
        .eq('tenant_id', tenantId); // Strict tenant scoping
    if (error) throw new Error(error.message);
    return data as SavingsProduct[];
}

async function createSavingsProduct(input: any) {
    const supabase = createClient();
    const { error } = await supabase.from('savings_products').insert([{
        product_name: input.name,
        interest_rate: input.interest_rate,
        currency: input.currency,
        tenant_id: input.tenantId,
        is_active: true
    }]);
    if (error) throw error;
}

export default function SavingsProductsManager({ tenantId }: { tenantId: string }) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [form, setForm] = useState({ name: '', interest: '', currency: 'UGX' });
    const queryClient = useQueryClient();

    const { data: products, isLoading } = useQuery({
        queryKey: ['saccoSavingsProducts', tenantId],
        queryFn: () => getSavingsProducts(tenantId),
    });

    const createMutation = useMutation({
        mutationFn: createSavingsProduct,
        onSuccess: () => {
            toast.success('Product created!');
            queryClient.invalidateQueries({ queryKey: ['saccoSavingsProducts', tenantId] });
            setIsDialogOpen(false);
            setForm({ name: '', interest: '', currency: 'UGX' });
        },
        onError: (e: any) => toast.error(e.message),
    });

    const handleSubmit = () => {
        if (!form.name || !form.interest) return toast.error('Fill all fields');
        createMutation.mutate({
            name: form.name,
            interest_rate: parseFloat(form.interest),
            currency: form.currency,
            tenantId
        });
    };

    return (
        <Card className="border-t-4 border-t-green-600 shadow-sm">
            <CardHeader className="flex flex-row justify-between items-start">
                <div>
                    <CardTitle className="flex items-center gap-2"><PiggyBank className="w-5 h-5 text-green-600"/> Savings Products</CardTitle>
                    <CardDescription>Configure saving accounts and interest rates.</CardDescription>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-green-600 hover:bg-green-700 text-white"><PlusCircle className="mr-2 h-4 w-4" /> New Product</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Savings Product</DialogTitle>
                            <DialogDescription>Define currency and interest for this product.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Product Name</Label>
                                <Input placeholder="e.g., Fixed Deposit" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Currency</Label>
                                    <Select value={form.currency} onValueChange={v => setForm({...form, currency: v})}>
                                        <SelectTrigger><SelectValue/></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="UGX">UGX (Uganda)</SelectItem>
                                            <SelectItem value="KES">KES (Kenya)</SelectItem>
                                            <SelectItem value="USD">USD (Dollar)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Interest Rate (% p.a)</Label>
                                    <Input type="number" step="0.1" placeholder="5.0" value={form.interest} onChange={e => setForm({...form, interest: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleSubmit} disabled={createMutation.isPending}>
                                {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow><TableHead>Product</TableHead><TableHead>Currency</TableHead><TableHead className="text-right">Interest Rate</TableHead><TableHead className="text-right">Status</TableHead></TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? <TableRow><TableCell colSpan={4} className="text-center h-24"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow> :
                        products?.map((p) => (
                            <TableRow key={p.id}>
                                <TableCell className="font-medium">{p.product_name}</TableCell>
                                <TableCell>{p.currency}</TableCell>
                                <TableCell className="text-right">{p.interest_rate}%</TableCell>
                                <TableCell className="text-right"><span className="text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs">Active</span></TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}