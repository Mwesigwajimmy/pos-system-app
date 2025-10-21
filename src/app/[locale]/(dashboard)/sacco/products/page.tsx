// src/app/(dashboard)/sacco/products/page.tsx
'use client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { createClient } from '@/lib/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import toast from 'react-hot-toast';
import { useState } from 'react';
import { PlusCircle } from 'lucide-react';

async function fetchLoanProducts() {
    const supabase = createClient();
    const { data, error } = await supabase.from('sacco_loan_products').select('*');
    if (error) throw error;
    return data;
}

async function addLoanProduct(data: any) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('business_id').eq('id', user!.id).single();
    data.business_id = profile!.business_id;
    const { error } = await supabase.from('sacco_loan_products').insert(data);
    if (error) throw error;
}

export default function LoanProductsPage() {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    const { data: products, isLoading } = useQuery({ queryKey: ['saccoLoanProducts'], queryFn: fetchLoanProducts });
    const mutation = useMutation({
        mutationFn: addLoanProduct,
        onSuccess: () => {
            toast.success("Loan product created!");
            queryClient.invalidateQueries({ queryKey: ['saccoLoanProducts'] });
            setIsOpen(false);
        },
        onError: (error: any) => toast.error(error.message),
    });

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutation.mutate({
            name: formData.get('name'),
            interest_rate: formData.get('interest_rate'),
            max_duration_months: formData.get('max_duration_months'),
            share_multiplier: formData.get('share_multiplier'),
            processing_fee_percent: formData.get('processing_fee_percent'),
        });
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Loan Products</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild><Button><PlusCircle className="mr-2 h-4 w-4"/>Add Loan Product</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Loan Product</DialogTitle><DialogDescription>Define a new type of loan your institution offers.</DialogDescription></DialogHeader>
                        <form id="addProductForm" onSubmit={handleSubmit} className="space-y-4 py-4 grid grid-cols-2 gap-4">
                            <div className="col-span-2"><Label>Product Name</Label><Input name="name" required /></div>
                            <div><Label>Interest Rate (% p.a.)</Label><Input name="interest_rate" type="number" step="0.1" required /></div>
                            <div><Label>Max Duration (Months)</Label><Input name="max_duration_months" type="number" required /></div>
                            <div><Label>Share Multiplier</Label><Input name="share_multiplier" type="number" step="0.1" placeholder="e.g., 3 for 3x shares" /></div>
                            <div><Label>Processing Fee (%)</Label><Input name="processing_fee_percent" type="number" step="0.1" /></div>
                        </form>
                        <DialogFooter><Button type="submit" form="addProductForm" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Product"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Interest Rate</TableHead><TableHead>Max Duration</TableHead><TableHead>Share Multiplier</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={4} className="text-center">Loading...</TableCell></TableRow>}
                    {products?.map(p => <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.interest_rate}% p.a.</TableCell><TableCell>{p.max_duration_months} months</TableCell><TableCell>{p.share_multiplier}x</TableCell></TableRow>)}
                </TableBody>
            </Table>
        </div>
    );
}