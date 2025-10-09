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

// ----- DATA FETCHING AND MUTATION FUNCTIONS -----

// This function remains the same.
async function fetchLoanProducts() {
    const supabase = createClient();
    const { data, error } = await supabase.from('loan_products').select('*').order('name');
    if (error) throw error;
    return data;
}

// THIS IS THE CORRECTED FUNCTION.
// It now accepts the full product data object.
async function addLoanProduct(productData: { name: any; interest_rate: any; duration_months: any; business_id: any; }) {
    const supabase = createClient();
    // We insert the entire object, which now includes the business_id.
    const { error } = await supabase.from('loan_products').insert(productData);
    if (error) throw error;
}


export default function LoanProductsPage() {
    const [isOpen, setIsOpen] = useState(false);
    const queryClient = useQueryClient();
    const { data: products, isLoading } = useQuery({ queryKey: ['loanProducts'], queryFn: fetchLoanProducts });

    const mutation = useMutation({
        mutationFn: addLoanProduct,
        onSuccess: () => {
            toast.success("Loan product created!");
            queryClient.invalidateQueries({ queryKey: ['loanProducts'] });
            setIsOpen(false);
        },
        onError: (error: any) => {
            // This provides a more specific error message if something goes wrong.
            toast.error(`Failed to create product: ${error.message}`);
        },
    });

    // THIS IS THE MAIN FIX.
    // We've changed handleSubmit to be an async function to get the user's profile.
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const supabase = createClient();

        try {
            // 1. Get the current logged-in user.
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("You must be logged in.");

            // 2. Get the user's profile to find their business_id.
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('business_id')
                .eq('id', user.id)
                .single();
            
            if (profileError || !profile?.business_id) {
                throw new Error("Could not find a business for your account.");
            }

            // 3. Call the mutation with all required data, including the business_id.
            mutation.mutate({
                name: formData.get('name'),
                interest_rate: formData.get('interest_rate'),
                duration_months: formData.get('duration_months'),
                business_id: profile.business_id // This satisfies the security policy.
            });

        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <div className="container mx-auto py-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold">Loan Products</h1>
                <Dialog open={isOpen} onOpenChange={setIsOpen}>
                    <DialogTrigger asChild><Button>Add Product</Button></DialogTrigger>
                    <DialogContent>
                        <DialogHeader><DialogTitle>New Loan Product</DialogTitle><DialogDescription>Define a new type of loan your institution offers.</DialogDescription></DialogHeader>
                        <form id="addProductForm" onSubmit={handleSubmit} className="space-y-4">
                            <div><Label>Product Name</Label><Input name="name" required /></div>
                            <div><Label>Interest Rate (% per year)</Label><Input name="interest_rate" type="number" step="0.1" required /></div>
                            <div><Label>Duration (Months)</Label><Input name="duration_months" type="number" required /></div>
                        </form>
                        <DialogFooter><Button type="submit" form="addProductForm" disabled={mutation.isPending}>{mutation.isPending ? "Saving..." : "Save Product"}</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
            <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Interest Rate</TableHead><TableHead>Duration</TableHead></TableRow></TableHeader>
                <TableBody>
                    {isLoading && <TableRow><TableCell colSpan={3} className="text-center">Loading...</TableCell></TableRow>}
                    {products?.map(p => <TableRow key={p.id}><TableCell>{p.name}</TableCell><TableCell>{p.interest_rate}%</TableCell><TableCell>{p.duration_months} months</TableCell></TableRow>)}
                </TableBody>
            </Table>
        </div>
    );
}